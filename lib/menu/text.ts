import type { TxMap } from "@/lib/db/types";
import type { LangMap } from "@/lib/i18n";

export type Shown = {
  text: string;
  /** language the text is actually in (falls back to the source language when untranslated) */
  lang: string;
  machine: boolean;
};

/**
 * Text for display in `lang`. Falls back to the source language when a unit has no translation
 * yet or failed validation, so the page is never blank and never shows garbage.
 */
export function shown(map: LangMap | undefined, tx: TxMap | undefined, field: string, lang: string, defaultLang: string): Shown {
  const t = map?.[lang]?.trim();
  if (lang !== defaultLang && t) return { text: t, lang, machine: tx?.[`${field}:${lang}`]?.by === "machine" };
  const src = map?.[defaultLang]?.trim() || Object.values(map ?? {}).find((v) => v?.trim()) || "";
  return { text: src, lang: defaultLang, machine: false };
}
