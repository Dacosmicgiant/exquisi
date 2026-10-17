import { createHash } from "node:crypto";
import type { GlossaryTerm, TxMap } from "@/lib/db/types";
import { glossarySignature } from "./glossary";

export const txKey = (field: string, lang: string) => `${field}:${lang}`;

/** Hash of the source text + the glossary entries that touch it. A mismatch ⇒ the translation is stale. */
export function sourceHash(text: string, glossary: GlossaryTerm[], lang: string): string {
  return createHash("sha1")
    .update(text.trim())
    .update("\u0000")
    .update(glossarySignature(text, glossary, lang))
    .digest("hex")
    .slice(0, 12);
}

export type UnitState =
  | "missing" // nothing in this language yet
  | "fresh" // machine translation matches the current source
  | "stale" // machine translation, source (or glossary) changed since
  | "staff" // hand-edited and still matches its source
  | "staff_stale"; // hand-edited, but the source changed since — flag for review, never overwrite

export function unitState(args: {
  sourceText: string;
  targetText: string | undefined;
  tx: TxMap | undefined;
  field: string;
  lang: string;
  glossary: GlossaryTerm[];
}): UnitState {
  const { sourceText, targetText, tx, field, lang, glossary } = args;
  if (!targetText?.trim()) return "missing";
  const entry = tx?.[txKey(field, lang)];
  const h = sourceHash(sourceText, glossary, lang);
  // text with no provenance was typed by a person: treat it as staff-owned, never overwrite
  if (!entry || entry.by === "staff") return entry && entry.h !== h ? "staff_stale" : "staff";
  return entry.h === h ? "fresh" : "stale";
}
