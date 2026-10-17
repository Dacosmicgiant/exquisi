import type { Engine } from "@/lib/i18n/languages";
import type { UnitKind } from "./units";

export type TranslateItem = { id: string; text: string; kind: UnitKind; context?: string };

export type TranslateRequest = {
  from: string;
  to: string;
  items: TranslateItem[];
  engine: Engine;
};

/** LLM providers report tokens; machine-translation APIs bill by characters. */
export type Usage = { inputTokens: number; outputTokens: number; characters?: number };

export type TranslateResponse = {
  items: { id: string; text: string }[];
  usage: Usage;
  model: string;
};

export class ProviderError extends Error {
  constructor(
    message: string,
    public kind: "rate_limit" | "bad_output" | "http" | "timeout" | "config" | "quota" | "unsupported",
    public status?: number,
  ) {
    super(message);
  }
}

/**
 * Anything that can translate menu copy. DeepL is the default and Mistral an optional fallback; another
 * engine can be added later by implementing this interface and registering it in ./index.ts,
 * without touching the pipeline, the admin or the diner pages.
 *
 * Contract: placeholders like [[T1]] must come back verbatim; ids must be preserved.
 */
export interface TranslationProvider {
  readonly name: string;
  /** Same input → same output (machine-translation APIs). A retry cannot help, so the pipeline skips it. */
  readonly deterministic?: boolean;
  /** How many languages the service may translate at the same time (default 1). */
  readonly maxParallelLanguages?: number;
  /** Does this provider translate into `lang`? Undefined means "assume yes". */
  supports?(lang: string): Promise<boolean>;
  /** Model used for an engine tier (for provenance / reporting). */
  modelFor(engine: Engine): string;
  translate(req: TranslateRequest): Promise<TranslateResponse>;
}
