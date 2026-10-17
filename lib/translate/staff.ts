import type { GlossaryTerm } from "@/lib/db/types";
import type { LangMap } from "@/lib/i18n";
import { sourceHash } from "./provenance";

export type StaffEdit = { field: string; lang: string; text: string; h: string };

/**
 * Compare a form submission with what was stored. Any non-default-language text a person
 * changed (or cleared) becomes a staff edit, which machine runs will never overwrite.
 * Changes to the default (source) language are not staff edits; they just make machine
 * translations stale via the source hash.
 */
export function staffEdits(args: {
  defaultLang: string;
  before: Record<string, LangMap | undefined>;
  after: Record<string, LangMap | undefined>;
  glossary: GlossaryTerm[];
}): StaffEdit[] {
  const { defaultLang, before, after, glossary } = args;
  const edits: StaffEdit[] = [];
  for (const field of Object.keys(after)) {
    const b = before[field] ?? {};
    const a = after[field] ?? {};
    const source = a[defaultLang] ?? "";
    for (const lang of new Set([...Object.keys(b), ...Object.keys(a)])) {
      if (lang === defaultLang) continue;
      const was = (b[lang] ?? "").trim();
      const now = (a[lang] ?? "").trim();
      if (was !== now) edits.push({ field, lang, text: now, h: sourceHash(source, glossary, lang) });
    }
  }
  return edits;
}

/**
 * Updates merge per language, so a language the form removed must be sent as "" to be cleared.
 * Returns `after` plus an empty string for every language present in `before` but missing now.
 */
export function withClears(before: LangMap | undefined, after: LangMap): LangMap {
  const out: LangMap = { ...after };
  for (const lang of Object.keys(before ?? {})) if (!(lang in out)) out[lang] = "";
  return out;
}
