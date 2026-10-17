import { getLanguage } from "@/lib/i18n/languages";
import type { Engine } from "@/lib/i18n/languages";
import {
  ProviderError,
  type TranslateRequest,
  type TranslateResponse,
  type TranslationProvider,
  type Usage,
} from "./provider";

const ENDPOINT = "https://api.mistral.ai/v1/chat/completions";

const KIND_HINT: Record<string, string> = {
  restaurant_name: "restaurant name (keep proper nouns)",
  category: "menu section heading",
  dish_name: "dish name (give a clear, natural name; keep place names and proper nouns)",
  dish_description: "dish description from a fine-dining menu",
  dish_context: "short plain-language note helping a diner understand an unfamiliar dish",
  story_title: "title of a short story about a dish",
  story_body: "short written story about a dish's origin and craft; keep an elegant, warm tone",
};

// ── tiny global concurrency limiter ─────────────────────────────────────────
let active = 0;
const waiters: Array<() => void> = [];
const limit = () => Math.max(1, Number(process.env.TRANSLATION_CONCURRENCY ?? 2));
async function acquire() {
  if (active < limit()) {
    active++;
    return;
  }
  await new Promise<void>((r) => waiters.push(r));
  active++;
}
function release() {
  active--;
  waiters.shift()?.();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── per-model pacing, learned from the API's own rate-limit headers ───────────
// (on the dev key: 3B 750 req/min, 8B 188, 14B only 30, so spread calls instead of bursting)
const pacing = new Map<string, { interval: number; nextAt: number }>();
async function pace(model: string) {
  const st = pacing.get(model);
  if (!st) return;
  const at = Math.max(Date.now(), st.nextAt);
  st.nextAt = at + st.interval;
  const wait = at - Date.now();
  if (wait > 0) await sleep(wait);
}
function learnRate(model: string, res: Response) {
  const limit = Number(res.headers.get("x-ratelimit-limit-req-minute"));
  if (!Number.isFinite(limit) || limit <= 0) return;
  const interval = Math.ceil((60_000 / limit) * 1.15);
  const cur = pacing.get(model);
  pacing.set(model, { interval, nextAt: cur?.nextAt ?? 0 });
}

export type ChatOptions = {
  model: string;
  system: string;
  user: string;
  /** JSON schema for strict structured output */
  schema: { name: string; schema: Record<string, unknown> };
  temperature?: number;
  timeoutMs?: number;
  maxAttempts?: number;
};

/**
 * One Mistral chat completion with structured JSON output. Retries 429 / 5xx / network
 * errors with exponential backoff (honouring Retry-After). Shared by the translation
 * provider and the quality script's judge.
 */
export async function mistralChat(o: ChatOptions): Promise<{ json: unknown; usage: Usage; model: string }> {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new ProviderError("MISTRAL_API_KEY is not set", "config");
  const maxAttempts = o.maxAttempts ?? 6;
  let lastError: ProviderError | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await acquire();
    await pace(o.model);
    let wait = 0;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), o.timeoutMs ?? 60_000);
      let res: Response;
      try {
        res = await fetch(ENDPOINT, {
          method: "POST",
          signal: ctrl.signal,
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: o.model,
            temperature: o.temperature ?? 0,
            response_format: {
              type: "json_schema",
              json_schema: { name: o.schema.name, strict: true, schema: o.schema.schema },
            },
            messages: [
              { role: "system", content: o.system },
              { role: "user", content: o.user },
            ],
          }),
        });
      } finally {
        clearTimeout(timer);
      }

      learnRate(o.model, res);
      if (res.status === 429 && res.headers.get("x-ratelimit-limit-req-minute") === "0") {
        // a limit of 0 means this key may not use the model at all; retrying cannot help
        throw new ProviderError(`Model "${o.model}" is not available to this API key (rate limit 0/min)`, "config", 429);
      }
      if (res.status === 429 || res.status >= 500) {
        const ra = Number(res.headers.get("retry-after"));
        wait = Number.isFinite(ra) && ra > 0 ? ra * 1000 : Math.min(30_000, 1500 * 2 ** attempt);
        lastError = new ProviderError(`Mistral ${res.status}`, res.status === 429 ? "rate_limit" : "http", res.status);
      } else if (!res.ok) {
        const body = (await res.text()).slice(0, 300);
        throw new ProviderError(`Mistral ${res.status}: ${body}`, "http", res.status);
      } else {
        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number };
          model?: string;
        };
        const content = data.choices?.[0]?.message?.content ?? "";
        let json: unknown;
        try {
          json = JSON.parse(content);
        } catch {
          // truncated / degenerate output: caller may split the batch and retry
          throw new ProviderError("Model returned invalid JSON", "bad_output");
        }
        return {
          json,
          model: data.model ?? o.model,
          usage: { inputTokens: data.usage?.prompt_tokens ?? 0, outputTokens: data.usage?.completion_tokens ?? 0 },
        };
      }
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      const aborted = e instanceof Error && e.name === "AbortError";
      lastError = new ProviderError(aborted ? "Mistral request timed out" : `Network error: ${(e as Error).message}`, aborted ? "timeout" : "http");
      wait = Math.min(15_000, 1000 * 2 ** attempt);
    } finally {
      release();
    }
    if (attempt < maxAttempts - 1) await sleep(wait + Math.random() * 400);
  }
  throw lastError ?? new ProviderError("Mistral request failed", "http");
}

const ITEMS_SCHEMA = {
  name: "translations",
  schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: { id: { type: "string" }, text: { type: "string" } },
          required: ["id", "text"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
};

export function buildSystemPrompt(from: string, to: string): string {
  const f = getLanguage(from);
  const t = getLanguage(to);
  return [
    `You are a professional translator for fine-dining restaurant menus. Translate from ${f.name} into ${t.name} (${t.native}).`,
    `Return JSON {"items":[{"id":"…","text":"…"}]} containing every input id exactly once, in the same order.`,
    `Each input item has a "kind" describing what the text is, and sometimes a "context" (e.g. the dish it belongs to). Use them to translate accurately; never translate the context itself.`,
    `Rules:`,
    `1. Write ONLY in ${t.name}. Do not leave English words in the output unless they are inside <keep> tags or are proper nouns.`,
    `2. Placeholders such as [[T1]], [[T2]] stand for names or terms that must not be translated. Copy every placeholder exactly once, unchanged, in the grammatically natural position. Never translate, transliterate, drop or invent a placeholder.`,
    `3. FOOD SAFETY: never substitute one ingredient, meat, cut or cooking method for another. A diner may avoid pork, beef or alcohol for religious or health reasons. If you do not know the standard ${t.name} word for an ingredient, keep the original word in parentheses after a plain description.`,
    `4. Preserve every number, quantity and unit. Do not add, remove or embellish facts. Keep the register elegant but plain.`,
    `5. Output the translation only: no notes, no explanations, no quotation marks around items.`,
  ].join("\n");
}

export class MistralProvider implements TranslationProvider {
  readonly name = "mistral";

  modelFor(engine: Engine): string {
    return engine === "strong"
      ? process.env.MISTRAL_MODEL_STRONG || "ministral-14b-2512"
      : process.env.MISTRAL_MODEL || "ministral-3b-2512";
  }

  async translate(req: TranslateRequest): Promise<TranslateResponse> {
    const model = this.modelFor(req.engine);
    const r = await mistralChat({
      model,
      system: buildSystemPrompt(req.from, req.to),
      user: JSON.stringify({
        items: req.items.map((i) => ({
          id: i.id,
          kind: KIND_HINT[i.kind] ?? i.kind,
          text: i.text,
          ...(i.context ? { context: i.context } : {}),
        })),
      }),
      schema: ITEMS_SCHEMA,
    });
    const items = (r.json as { items?: { id?: unknown; text?: unknown }[] })?.items;
    if (!Array.isArray(items)) throw new ProviderError("Response missing items", "bad_output");
    return {
      items: items
        .filter((x) => typeof x?.id === "string" && typeof x?.text === "string")
        .map((x) => ({ id: x.id as string, text: x.text as string })),
      usage: r.usage,
      model: r.model,
    };
  }
}
