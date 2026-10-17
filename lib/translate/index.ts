import { DeepLProvider } from "./deepl";
import { MistralProvider } from "./mistral";
import type { TranslationProvider } from "./provider";

export type { TranslationProvider, TranslateRequest, TranslateResponse } from "./provider";
export { ProviderError } from "./provider";

let cached: { name: string; provider: TranslationProvider } | null = null;

/**
 * Selected by TRANSLATION_PROVIDER: "deepl" (default; a dedicated translation engine, deterministic,
 * cannot invent text) or "mistral" (LLM, kept as an optional fallback). More engines can be added by
 * implementing TranslationProvider and registering them here.
 */
export function getProvider(): TranslationProvider {
  const name = (process.env.TRANSLATION_PROVIDER || "deepl").toLowerCase();
  if (cached?.name === name) return cached.provider;
  let provider: TranslationProvider;
  switch (name) {
    case "deepl":
      provider = new DeepLProvider();
      break;
    case "mistral":
      provider = new MistralProvider();
      break;
    default:
      throw new Error(`Unknown TRANSLATION_PROVIDER "${name}" (use deepl or mistral)`);
  }
  cached = { name, provider };
  return provider;
}
