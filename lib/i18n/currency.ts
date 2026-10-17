/**
 * The currency of the country most associated with each catalog language, used to show a diner an
 * approximate price "at home". A language is not a country, so the big ambiguous ones use the main market
 * and `null` means "don't guess" (Esperanto). Edit freely; tests only check the codes are real currencies.
 */
const MAP: Record<string, string | null> = {
  en: "USD", it: "EUR", fr: "EUR", de: "EUR", es: "EUR", pt: "BRL", nl: "EUR", sv: "SEK", da: "DKK", nb: "NOK",
  ca: "EUR", fi: "EUR", pl: "PLN", cs: "CZK", sk: "EUR", hu: "HUF", ro: "RON", hr: "EUR", bg: "EUR", el: "EUR",
  tr: "TRY", ru: "RUB", uk: "UAH", ar: "SAR", he: "ILS", hi: "INR", bn: "BDT", mr: "INR", ta: "INR", te: "INR",
  ur: "PKR", id: "IDR", ms: "MYR", th: "THB", vi: "VND", zh: "CNY", "zh-Hant": "TWD", ja: "JPY", ko: "KRW",
  fil: "PHP", af: "ZAR", sq: "ALL", am: "ETB", hy: "AMD", as: "INR", az: "AZN", eu: "EUR", be: "BYN", bs: "BAM",
  my: "MMK", ceb: "PHP", cy: "GBP", eo: null, et: "EUR", fa: "IRR", fy: "EUR", ga: "EUR", gd: "GBP", gl: "EUR",
  gu: "INR", ha: "NGN", ht: "HTG", ig: "NGN", is: "ISK", jv: "IDR", ka: "GEL", kk: "KZT", km: "KHR", kn: "INR",
  ku: "IQD", ky: "KGS", lb: "EUR", lo: "LAK", lt: "EUR", lv: "EUR", mg: "MGA", mi: "NZD", mk: "MKD", ml: "INR",
  mn: "MNT", mt: "EUR", ne: "NPR", or: "INR", pa: "INR", ps: "AFN", sd: "PKR", si: "LKR", sl: "EUR", sm: "WST",
  sn: "ZWG", so: "SOS", sr: "RSD", st: "LSL", su: "IDR", sw: "TZS", tg: "TJS", uz: "UZS", xh: "ZAR", yi: "ILS",
  yo: "NGN", zu: "ZAR", "pt-PT": "EUR", "es-419": "MXN", "fr-CA": "CAD", an: "EUR", ay: "BOB", ba: "RUB", br: "EUR", gn: "PYG",
  la: "EUR", ln: "CDF", oc: "EUR", om: "ETB", qu: "PEN", sa: "INR", tk: "TMT", tn: "BWP", ts: "ZAR", tt: "RUB",
  wo: "XOF",
};

export const LANGUAGE_CURRENCIES = MAP;

/** ISO currency for a diner reading in `lang`, or null when there is no sensible single answer. */
export function languageCurrency(lang: string): string | null {
  return MAP[lang] ?? MAP[lang.split("-")[0]] ?? null;
}
