/**
 * Every user-facing text field in the data model is a language map
 * ({ en: "...", it: "..." }). v1 only fills the default language, but the
 * schema and UI already carry the others.
 */
export type LangMap = Record<string, string>;

import { CATALOG, getLanguage, isKnownLanguage } from "./languages";

export * from "./languages";

/** Full catalog (supported + experimental). The source of truth is ./languages.ts */
export const LANGUAGES = CATALOG;
export type LangCode = string;
export const isLangCode = isKnownLanguage;

export function languageName(code: string): string {
  return getLanguage(code).native;
}

/**
 * Resolve a language map for display: requested language, then the
 * restaurant's default language, then any filled value. Never throws.
 */
export function resolveText(
  map: LangMap | null | undefined,
  lang: string,
  defaultLang: string,
): string {
  if (!map) return "";
  const hit = map[lang] || map[defaultLang];
  if (hit) return hit;
  for (const v of Object.values(map)) if (v) return v;
  return "";
}

/** Build a map holding a single language (the v1 write path). */
export const langMap = (lang: string, value: string): LangMap =>
  value.trim() ? { [lang]: value.trim() } : {};

/**
 * Like setLang but for text boxes: keeps exactly what was typed (a trailing space must survive while
 * someone is mid-sentence). Only an empty box removes the language; the server trims on save.
 */
export function setLangRaw(existing: LangMap | null | undefined, lang: string, value: string): LangMap {
  const next = { ...(existing ?? {}) };
  if (value) next[lang] = value;
  else delete next[lang];
  return next;
}

/** Merge one language's value into an existing map, keeping other languages. */
export function setLang(
  existing: LangMap | null | undefined,
  lang: string,
  value: string,
): LangMap {
  const next = { ...(existing ?? {}) };
  const v = value.trim();
  if (v) next[lang] = v;
  else delete next[lang];
  return next;
}
