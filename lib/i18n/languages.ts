/**
 * ★ THE LANGUAGE CATALOG — edit tiers and engines here. ★
 *
 * tier:
 *   "supported"    shown normally in the picker
 *   "experimental" shown with a visible "Machine translated, may be inaccurate"
 *                  note; restaurants can switch these off (allow_experimental)
 * engine: only used by the optional Mistral (LLM) provider; DeepL ignores it.
 *   "fast"    MISTRAL_MODEL         (small/cheap model)
 *   "strong"  MISTRAL_MODEL_STRONG  (larger model)
 *
 * MEASURED (npm run quality: 10-dish sample menu, back-translation, ingredient-swap check, LLM judge):
 *                     DeepL (default)          Mistral 14B (fallback)
 *   Italian           85% good, 0 flagged      85%
 *   German            91%, 0 flagged           79-91%
 *   Arabic            82%, 0 flagged           71%   → "supported"
 *   Japanese          82%, 0 flagged           74%   → "supported"
 *   Marathi           76%, 1 flagged           65%   → experimental
 *   Swahili           74%, 3 flagged           35%   → experimental
 *   Hindi             71%, 0 flagged           56%   → experimental
 *   The bar for "supported": >= 80% good units, 0 flagged ingredient swaps, judge >= 4.3.
 *   Every other "supported" language is PROVISIONAL (not yet measured): run
 *   `npm run quality -- --langs fr,es,...` before promising it to a customer.
 *   (The small 3B Mistral model was worse everywhere, e.g. "veal shank" -> "cow's bone"; not used.)
 *
 * flag: ISO country code, ONLY where one country clearly owns the language.
 * A flag is a country, not a language, so none for en/es/pt/ar/zh/hi/…
 */
export type Tier = "supported" | "experimental";
export type Engine = "fast" | "strong";
export type Script =
  | "Latn" | "Cyrl" | "Grek" | "Arab" | "Hebr" | "Deva" | "Beng" | "Taml" | "Telu"
  | "Knda" | "Mlym" | "Gujr" | "Guru" | "Orya" | "Sinh" | "Thai" | "Laoo" | "Khmr"
  | "Mymr" | "Ethi" | "Armn" | "Geor" | "Hans" | "Hant" | "Jpan" | "Kore";

export type Language = {
  code: string;
  name: string;
  native: string;
  script: Script;
  dir: "ltr" | "rtl";
  tier: Tier;
  engine: Engine;
  flag?: string;
};

type Row = [code: string, name: string, native: string, script: Script, tier: Tier, engine: Engine, flag?: string];

const ROWS: Row[] = [
  // ── supported (provisional) ───────────────────────────────────────────────
  ["en", "English", "English", "Latn", "supported", "strong"],
  ["it", "Italian", "Italiano", "Latn", "supported", "strong", "it"],
  ["fr", "French", "Français", "Latn", "supported", "strong", "fr"],
  ["de", "German", "Deutsch", "Latn", "supported", "strong", "de"],
  ["es", "Spanish (Spain)", "Español (España)", "Latn", "supported", "strong"],
  ["pt", "Portuguese (Brazil)", "Português (Brasil)", "Latn", "supported", "strong"],
  ["nl", "Dutch", "Nederlands", "Latn", "supported", "strong", "nl"],
  ["sv", "Swedish", "Svenska", "Latn", "supported", "strong", "se"],
  ["da", "Danish", "Dansk", "Latn", "supported", "strong", "dk"],
  ["nb", "Norwegian", "Norsk", "Latn", "supported", "strong", "no"],
  ["ca", "Catalan", "Català", "Latn", "supported", "strong"],
  ["fi", "Finnish", "Suomi", "Latn", "supported", "strong", "fi"],
  ["pl", "Polish", "Polski", "Latn", "supported", "strong", "pl"],
  ["cs", "Czech", "Čeština", "Latn", "supported", "strong", "cz"],
  ["sk", "Slovak", "Slovenčina", "Latn", "supported", "strong", "sk"],
  ["hu", "Hungarian", "Magyar", "Latn", "supported", "strong", "hu"],
  ["ro", "Romanian", "Română", "Latn", "supported", "strong", "ro"],
  ["hr", "Croatian", "Hrvatski", "Latn", "supported", "strong", "hr"],
  ["bg", "Bulgarian", "Български", "Cyrl", "supported", "strong", "bg"],
  ["el", "Greek", "Ελληνικά", "Grek", "supported", "strong", "gr"],
  ["tr", "Turkish", "Türkçe", "Latn", "supported", "strong", "tr"],
  ["ru", "Russian", "Русский", "Cyrl", "supported", "strong"],
  ["uk", "Ukrainian", "Українська", "Cyrl", "supported", "strong", "ua"],
  ["ar", "Arabic", "العربية", "Arab", "supported", "strong"],
  ["he", "Hebrew", "עברית", "Hebr", "supported", "strong", "il"],
  ["hi", "Hindi", "हिन्दी", "Deva", "experimental", "strong"],
  ["bn", "Bengali", "বাংলা", "Beng", "supported", "strong"],
  ["mr", "Marathi", "मराठी", "Deva", "experimental", "strong"],
  ["ta", "Tamil", "தமிழ்", "Taml", "supported", "strong"],
  ["te", "Telugu", "తెలుగు", "Telu", "supported", "strong"],
  ["ur", "Urdu", "اردو", "Arab", "supported", "strong"],
  ["id", "Indonesian", "Bahasa Indonesia", "Latn", "supported", "strong", "id"],
  ["ms", "Malay", "Bahasa Melayu", "Latn", "supported", "strong"],
  ["th", "Thai", "ไทย", "Thai", "supported", "strong", "th"],
  ["vi", "Vietnamese", "Tiếng Việt", "Latn", "supported", "strong", "vn"],
  ["zh", "Chinese (Simplified)", "简体中文", "Hans", "supported", "strong"],
  ["zh-Hant", "Chinese (Traditional)", "繁體中文", "Hant", "supported", "strong"],
  ["ja", "Japanese", "日本語", "Jpan", "supported", "strong", "jp"],
  ["ko", "Korean", "한국어", "Kore", "supported", "strong", "kr"],
  ["fil", "Filipino", "Filipino", "Latn", "supported", "strong", "ph"],

  // ── experimental ──────────────────────────────────────────────────────────
  ["af", "Afrikaans", "Afrikaans", "Latn", "experimental", "strong"],
  ["sq", "Albanian", "Shqip", "Latn", "experimental", "strong", "al"],
  ["am", "Amharic", "አማርኛ", "Ethi", "experimental", "strong", "et"],
  ["hy", "Armenian", "Հայերեն", "Armn", "experimental", "strong", "am"],
  ["as", "Assamese", "অসমীয়া", "Beng", "experimental", "strong"],
  ["az", "Azerbaijani", "Azərbaycanca", "Latn", "experimental", "strong", "az"],
  ["eu", "Basque", "Euskara", "Latn", "experimental", "strong"],
  ["be", "Belarusian", "Беларуская", "Cyrl", "experimental", "strong", "by"],
  ["bs", "Bosnian", "Bosanski", "Latn", "experimental", "strong", "ba"],
  ["my", "Burmese", "မြန်မာ", "Mymr", "experimental", "strong", "mm"],
  ["ceb", "Cebuano", "Cebuano", "Latn", "experimental", "strong"],
  ["cy", "Welsh", "Cymraeg", "Latn", "experimental", "strong"],
  ["eo", "Esperanto", "Esperanto", "Latn", "experimental", "strong"],
  ["et", "Estonian", "Eesti", "Latn", "experimental", "strong", "ee"],
  ["fa", "Persian", "فارسی", "Arab", "experimental", "strong", "ir"],
  ["fy", "Western Frisian", "Frysk", "Latn", "experimental", "strong"],
  ["ga", "Irish", "Gaeilge", "Latn", "experimental", "strong", "ie"],
  ["gd", "Scottish Gaelic", "Gàidhlig", "Latn", "experimental", "strong"],
  ["gl", "Galician", "Galego", "Latn", "experimental", "strong"],
  ["gu", "Gujarati", "ગુજરાતી", "Gujr", "experimental", "strong"],
  ["ha", "Hausa", "Hausa", "Latn", "experimental", "strong"],
  ["ht", "Haitian Creole", "Kreyòl ayisyen", "Latn", "experimental", "strong", "ht"],
  ["ig", "Igbo", "Igbo", "Latn", "experimental", "strong"],
  ["is", "Icelandic", "Íslenska", "Latn", "experimental", "strong", "is"],
  ["jv", "Javanese", "Basa Jawa", "Latn", "experimental", "strong"],
  ["ka", "Georgian", "ქართული", "Geor", "experimental", "strong", "ge"],
  ["kk", "Kazakh", "Қазақша", "Cyrl", "experimental", "strong", "kz"],
  ["km", "Khmer", "ខ្មែរ", "Khmr", "experimental", "strong", "kh"],
  ["kn", "Kannada", "ಕನ್ನಡ", "Knda", "experimental", "strong"],
  ["ku", "Kurdish", "Kurdî", "Latn", "experimental", "strong"],
  ["ky", "Kyrgyz", "Кыргызча", "Cyrl", "experimental", "strong", "kg"],
  ["lb", "Luxembourgish", "Lëtzebuergesch", "Latn", "experimental", "strong", "lu"],
  ["lo", "Lao", "ລາວ", "Laoo", "experimental", "strong", "la"],
  ["lt", "Lithuanian", "Lietuvių", "Latn", "experimental", "strong", "lt"],
  ["lv", "Latvian", "Latviešu", "Latn", "experimental", "strong", "lv"],
  ["mg", "Malagasy", "Malagasy", "Latn", "experimental", "strong", "mg"],
  ["mi", "Māori", "Māori", "Latn", "experimental", "strong"],
  ["mk", "Macedonian", "Македонски", "Cyrl", "experimental", "strong", "mk"],
  ["ml", "Malayalam", "മലയാളം", "Mlym", "experimental", "strong"],
  ["mn", "Mongolian", "Монгол", "Cyrl", "experimental", "strong", "mn"],
  ["mt", "Maltese", "Malti", "Latn", "experimental", "strong", "mt"],
  ["ne", "Nepali", "नेपाली", "Deva", "experimental", "strong", "np"],
  ["or", "Odia", "ଓଡ଼ିଆ", "Orya", "experimental", "strong"],
  ["pa", "Punjabi", "ਪੰਜਾਬੀ", "Guru", "experimental", "strong"],
  ["ps", "Pashto", "پښتو", "Arab", "experimental", "strong"],
  ["sd", "Sindhi", "سنڌي", "Arab", "experimental", "strong"],
  ["si", "Sinhala", "සිංහල", "Sinh", "experimental", "strong", "lk"],
  ["sl", "Slovenian", "Slovenščina", "Latn", "experimental", "strong", "si"],
  ["sm", "Samoan", "Gagana Samoa", "Latn", "experimental", "strong", "ws"],
  ["sn", "Shona", "chiShona", "Latn", "experimental", "strong"],
  ["so", "Somali", "Soomaali", "Latn", "experimental", "strong", "so"],
  ["sr", "Serbian", "Српски", "Cyrl", "experimental", "strong", "rs"],
  ["st", "Sesotho", "Sesotho", "Latn", "experimental", "strong", "ls"],
  ["su", "Sundanese", "Basa Sunda", "Latn", "experimental", "strong"],
  ["sw", "Swahili", "Kiswahili", "Latn", "experimental", "strong"],
  ["tg", "Tajik", "Тоҷикӣ", "Cyrl", "experimental", "strong", "tj"],
  ["uz", "Uzbek", "Oʻzbekcha", "Latn", "experimental", "strong", "uz"],
  ["xh", "Xhosa", "isiXhosa", "Latn", "experimental", "strong"],
  ["yi", "Yiddish", "ייִדיש", "Hebr", "experimental", "strong"],
  ["yo", "Yoruba", "Yorùbá", "Latn", "experimental", "strong"],
  ["zu", "Zulu", "isiZulu", "Latn", "experimental", "strong"],

  // ── regional variants and the rest of DeepL's list (unmeasured: experimental) ─────────────────
  ["es-419", "Spanish (Latin America)", "Español (Latinoamérica)", "Latn", "supported", "strong"],
  ["pt-PT", "Portuguese (Portugal)", "Português (Portugal)", "Latn", "supported", "strong", "pt"],
  ["fr-CA", "French (Canada)", "Français (Canada)", "Latn", "supported", "strong", "ca"],
  ["an", "Aragonese", "Aragonés", "Latn", "experimental", "strong"],
  ["ay", "Aymara", "Aymar aru", "Latn", "experimental", "strong"],
  ["ba", "Bashkir", "Башҡортса", "Cyrl", "experimental", "strong"],
  ["br", "Breton", "Brezhoneg", "Latn", "experimental", "strong"],
  ["gn", "Guarani", "Avañe'ẽ", "Latn", "experimental", "strong"],
  ["la", "Latin", "Latina", "Latn", "experimental", "strong"],
  ["ln", "Lingala", "Lingála", "Latn", "experimental", "strong"],
  ["oc", "Occitan", "Occitan", "Latn", "experimental", "strong"],
  ["om", "Oromo", "Afaan Oromoo", "Latn", "experimental", "strong"],
  ["qu", "Quechua", "Runasimi", "Latn", "experimental", "strong"],
  ["sa", "Sanskrit", "संस्कृतम्", "Deva", "experimental", "strong"],
  ["tk", "Turkmen", "Türkmençe", "Latn", "experimental", "strong"],
  ["tn", "Tswana", "Setswana", "Latn", "experimental", "strong"],
  ["ts", "Tsonga", "Xitsonga", "Latn", "experimental", "strong"],
  ["tt", "Tatar", "Татарча", "Cyrl", "experimental", "strong"],
  ["wo", "Wolof", "Wolof", "Latn", "experimental", "strong"],
];

const RTL_SCRIPTS = new Set<Script>(["Arab", "Hebr"]);

export const CATALOG: Language[] = ROWS.map(([code, name, native, script, tier, engine, flag]) => ({
  code,
  name,
  native,
  script,
  dir: RTL_SCRIPTS.has(script) ? "rtl" : "ltr",
  tier,
  engine,
  flag,
}));

const BY_CODE = new Map(CATALOG.map((l) => [l.code.toLowerCase(), l]));

/** Canonicalise a language tag from the URL / browser ("ZH-hant", "pt-BR", "zh-TW") to a catalog entry. */
export function findLanguage(tag: string | null | undefined): Language | null {
  if (!tag) return null;
  const t = tag.trim().toLowerCase().replace(/_/g, "-");
  if (!t) return null;
  const direct = BY_CODE.get(t);
  if (direct) return direct;
  if (t.startsWith("zh")) {
    const traditional = /-(hant|tw|hk|mo)\b/.test(t);
    return BY_CODE.get(traditional ? "zh-hant" : "zh") ?? null;
  }
  if (t === "no" || t.startsWith("nn") || t.startsWith("nb")) return BY_CODE.get("nb") ?? null;
  if (t === "tl") return BY_CODE.get("fil") ?? null;
  if (t === "iw") return BY_CODE.get("he") ?? null;
  return BY_CODE.get(t.split("-")[0]) ?? null;
}

/**
 * Catalog languages a browser tag could mean, best first: "es-MX" → Latin-American Spanish, then Spanish;
 * "pt-PT" → Portugal, then Portuguese; "zh-TW" → Traditional Chinese. The picker takes the first the restaurant offers.
 */
export function languageCandidates(tag: string | null | undefined): Language[] {
  const t = (tag ?? "").trim().toLowerCase().replace(/_/g, "-");
  if (!t) return [];
  const out: Language[] = [];
  const add = (l: Language | null | undefined) => l && !out.some((o) => o.code === l.code) && out.push(l);
  add(BY_CODE.get(t));
  if (/^es-(419|mx|ar|co|cl|pe|ve|ec|gt|cu|bo|do|hn|py|sv|ni|cr|pa|uy|pr|us)$/.test(t)) add(BY_CODE.get("es-419"));
  add(findLanguage(t));
  const base = t.split("-")[0];
  if (base !== t && base !== "zh") add(BY_CODE.get(base)); // "pt-PT" falls back to Portuguese if Portugal isn't offered
  return out;
}

export const isKnownLanguage = (code: string) => BY_CODE.has(code.toLowerCase());
export const getLanguage = (code: string): Language =>
  BY_CODE.get(code.toLowerCase()) ?? { code, name: code, native: code, script: "Latn", dir: "ltr", tier: "experimental", engine: "strong" };

export const SUPPORTED = CATALOG.filter((l) => l.tier === "supported");
export const EXPERIMENTAL = CATALOG.filter((l) => l.tier === "experimental");

/** Best catalog match for each of the browser's preferred languages, in order, de-duplicated. */
export function matchBrowserLanguages(prefs: readonly string[]): Language[] {
  const seen = new Set<string>();
  const out: Language[] = [];
  for (const p of prefs) {
    for (const l of languageCandidates(p)) {
      if (!seen.has(l.code)) {
        seen.add(l.code);
        out.push(l);
      }
    }
  }
  return out;
}
