import { getLanguage } from "@/lib/i18n/languages";
import type { Engine } from "@/lib/i18n/languages";
import { createLimiter, decodeEntities, escapeXml, mtFetchJson, wrapTokens } from "./mt";
import { ProviderError, type TranslateItem, type TranslateRequest, type TranslateResponse, type TranslationProvider } from "./provider";

/**
 * DeepL: a dedicated translation engine, not a language model: it cannot "answer" or invent text.
 *  - protected terms ([[T1]]) are wrapped in <x> and sent with ignore_tags, so they stay byte-for-byte
 *  - `context` (not billed) tells it what the text is, which matters for 2-word dish names
 *  - deterministic: the same text always gives the same translation, so results can be stored and edited
 * Free keys (ending ":fx") use api-free.deepl.com, Pro keys api.deepl.com.
 */

/** Our catalog code → candidate DeepL target codes, most specific first. */
const TARGET_CANDIDATES: Record<string, string[]> = {
  en: ["EN-US", "EN-GB", "EN"],
  pt: ["PT-BR", "PT-PT", "PT"],
  zh: ["ZH-HANS", "ZH"],
  "zh-Hant": ["ZH-HANT"],
  nb: ["NB"],
  fil: ["TL", "FIL"],
  he: ["HE"],
};
export const deeplTargets = (code: string): string[] => TARGET_CANDIDATES[code] ?? [code.toUpperCase()];
/** Source codes have no regional variants. */
export const deeplSource = (code: string): string => {
  if (code === "zh-Hant" || code === "zh") return "ZH";
  if (code === "fil") return "TL";
  return code.toUpperCase();
};

const CONTEXT: Record<string, (c?: string) => string | undefined> = {
  dish_name: () => "Names of dishes on a fine-dining restaurant menu.",
  category: () => "Section headings of a fine-dining restaurant menu.",
  restaurant_name: () => undefined,
  dish_description: (c) => `Description of the dish "${c ?? ""}" on a fine-dining restaurant menu.`,
  dish_context: (c) => `A short plain-language note explaining the dish "${c ?? ""}" to a first-time diner.`,
  story_title: (c) => `Title of a short story about the dish "${c ?? ""}" on a restaurant menu.`,
  story_body: (c) => `A short, warm story about the origin and craft of a restaurant dish${c ? `, "${c}"` : ""}.`,
};

type Row = { translations: { text: string; billed_characters?: number }[] };
type Lang = { language: string };

export class DeepLProvider implements TranslationProvider {
  readonly name = "deepl";
  readonly deterministic = true;
  readonly maxParallelLanguages = 3;
  // The free plan answers 429 above roughly 5-8 simultaneous requests, so stay modest (separate from the LLM setting)
  private limit = createLimiter(Math.max(1, Number(process.env.DEEPL_CONCURRENCY ?? 5)));
  private supported: Promise<Set<string> | null> | null = null;

  constructor(private readonly key = process.env.DEEPL_API_KEY ?? "") {}

  private get base() {
    return this.key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  }
  private headers(json = true) {
    if (!this.key) throw new ProviderError("DEEPL_API_KEY is not set", "config");
    // DeepL rejects a GET that declares a JSON body, so only POSTs get Content-Type
    return { Authorization: `DeepL-Auth-Key ${this.key}`, ...(json ? { "Content-Type": "application/json" } : {}) };
  }

  modelFor(_engine: Engine) {
    void _engine;
    return "deepl";
  }

  /** Target languages DeepL offers, fetched once per process. null = could not be determined. */
  private languages(): Promise<Set<string> | null> {
    this.supported ??= mtFetchJson<Lang[]>(`${this.base}/v2/languages?type=target`, { headers: this.headers(false) }, { name: "DeepL", maxAttempts: 2 })
      .then(({ data }) => new Set(data.map((l) => l.language.toUpperCase())))
      .catch((e) => {
        // fall back to "try it and let the API say no", but never silently
        console.warn(`[deepl] could not load the language list (${(e as Error).message}); assuming every language is supported`);
        return null;
      });
    return this.supported;
  }

  private async target(lang: string): Promise<string | null> {
    const list = await this.languages();
    const candidates = deeplTargets(lang);
    if (!list) return candidates[0]; // couldn't ask: try it and let the API say no
    return candidates.find((c) => list.has(c)) ?? null;
  }

  async supports(lang: string) {
    return (await this.target(lang)) !== null;
  }

  async translate(req: TranslateRequest): Promise<TranslateResponse> {
    const target = await this.target(req.to);
    if (!target) throw new ProviderError(`DeepL does not translate into ${getLanguage(req.to).name}`, "unsupported");
    const source = deeplSource(req.from);

    // One request per context group (a dish's description + explanation share one), so each text gets the
    // right context while a whole menu still needs only ~15 requests per language. Contexts are not billed.
    const groups = new Map<string, TranslateItem[]>();
    for (const i of req.items) {
      const dishText = i.kind === "dish_description" || i.kind === "dish_context";
      const k = dishText ? `dish\u0000${i.context ?? ""}` : `${i.kind}\u0000${i.context ?? ""}`;
      groups.set(k, [...(groups.get(k) ?? []), i]);
    }

    const out = new Map<string, string>();
    let characters = 0;
    await Promise.all(
      [...groups.values()].map((items) =>
        this.limit(async () => {
          const first = items[0];
          const context =
            first.kind === "dish_description" || first.kind === "dish_context"
              ? `A description and a plain-language note about the dish "${first.context ?? ""}" on a fine-dining restaurant menu.`
              : CONTEXT[first.kind]?.(first.context);
          const { data } = await mtFetchJson<Row>(
            `${this.base}/v2/translate`,
            {
              method: "POST",
              headers: this.headers(),
              body: JSON.stringify({
                text: items.map((i) => wrapTokens(escapeXml(i.text), "<x>", "</x>")),
                source_lang: source,
                target_lang: target,
                tag_handling: "xml",
                ignore_tags: ["x"],
                ...(context ? { context } : {}),
              }),
            },
            { name: "DeepL", maxAttempts: 8 },
          );
          if (!Array.isArray(data.translations) || data.translations.length !== items.length) {
            throw new ProviderError("DeepL returned an unexpected number of translations", "bad_output");
          }
          items.forEach((it, idx) => {
            const t = data.translations[idx];
            out.set(it.id, decodeEntities(t.text.replace(/<\/?x>/g, "")));
            characters += t.billed_characters ?? it.text.length;
          });
        }),
      ),
    );

    return {
      items: req.items.map((i) => ({ id: i.id, text: out.get(i.id) ?? "" })),
      usage: { inputTokens: 0, outputTokens: 0, characters },
      model: "deepl",
    };
  }
}
