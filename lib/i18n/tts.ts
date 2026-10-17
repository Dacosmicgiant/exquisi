/**
 * Text-to-speech uses the diner's own device voices (Web Speech API): free, no server call, and the
 * speaker button only appears for languages the phone can actually speak. These are the BCP-47 tags to
 * look for per catalog language, best first. A tag without a region matches any region ("it" → it-IT, it-CH).
 */
const TAGS: Record<string, string[]> = {
  zh: ["zh-CN", "zh"],
  "zh-Hant": ["zh-TW", "zh-HK", "zh-Hant"],
  nb: ["nb-NO", "no-NO", "nb", "no"],
  fil: ["fil-PH", "tl-PH", "fil", "tl"],
  he: ["he-IL", "iw-IL", "he", "iw"],
  id: ["id-ID", "in-ID", "id"],
  pt: ["pt-BR", "pt"],
  "pt-PT": ["pt-PT", "pt"],
  "es-419": ["es-MX", "es-US", "es-419", "es"],
  "fr-CA": ["fr-CA", "fr"],
  jv: ["jv-ID", "jw-ID", "jv", "jw"],
};

export function speechTags(code: string): string[] {
  return TAGS[code] ?? [code];
}

/** Does any voice on the device speak this language? Pure, so it can be tested without a browser. */
export function pickVoiceLang(voiceLangs: readonly string[], tags: readonly string[]): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/_/g, "-");
  const voices = voiceLangs.map(norm);
  for (const t of tags) {
    const tag = norm(t);
    const hit = voices.findIndex((v) => v === tag || (!tag.includes("-") && v.startsWith(`${tag}-`)));
    if (hit >= 0) return voiceLangs[hit];
  }
  return null;
}
