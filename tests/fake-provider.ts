import { getLanguage } from "@/lib/i18n/languages";
import type { TranslateRequest, TranslateResponse, TranslationProvider } from "@/lib/translate/provider";

type Behaviour = {
  /** ids that come back as an untranslated English echo on the "fast" engine */
  echoOnFast?: Set<string>;
  /** ids that are never translated properly */
  alwaysBad?: Set<string>;
  /** drop the <keep> terms for these ids */
  dropKeeps?: Set<string>;
};

/** Deterministic stand-in for Mistral: keeps <keep> tags + digits, writes in the target script. */
export class FakeProvider implements TranslationProvider {
  readonly name = "fake";
  calls: TranslateRequest[] = [];
  constructor(private b: Behaviour = {}) {}
  modelFor(engine: "fast" | "strong") {
    return `fake-${engine}`;
  }
  async translate(req: TranslateRequest): Promise<TranslateResponse> {
    this.calls.push(req);
    const script = getLanguage(req.to).script;
    return {
      model: this.modelFor(req.engine),
      usage: { inputTokens: 10 * req.items.length, outputTokens: 12 * req.items.length },
      items: req.items.map((i) => {
        if (this.b.alwaysBad?.has(i.id) || (req.engine === "fast" && this.b.echoOnFast?.has(i.id))) {
          return { id: i.id, text: i.text.replace(/\[\[T\d+\]\]/g, "") };
        }
        const keeps = (i.text.match(/\[\[T\d+\]\]/g) ?? []).join(" ");
        const digits = i.text.match(/\d+(?:[.,]\d+)?/g)?.join(" ") ?? "";
        const bare = i.text.replace(/\[\[T\d+\]\]/g, "").trim();
        const body =
          script === "Latn"
            ? `(${req.to}) ${bare}`
            : "नमस्ते दुनिया ".repeat(Math.max(1, Math.ceil(bare.length / 14)));
        const kept = this.b.dropKeeps?.has(i.id) ? "" : keeps;
        return { id: i.id, text: `${body} ${kept} ${digits}`.replace(/\s+/g, " ").trim() };
      }),
    };
  }
}
