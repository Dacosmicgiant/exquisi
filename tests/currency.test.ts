import { describe, expect, it } from "vitest";
import { CURRENCIES, isSupportedCurrency } from "@/lib/currencies";
import { parseRate } from "@/lib/currency/rates";
import { CATALOG } from "@/lib/i18n/languages";
import { LANGUAGE_CURRENCIES, languageCurrency } from "@/lib/i18n/currency";
import { setLangRaw } from "@/lib/i18n";
import { convertMajor, formatApprox } from "@/lib/money";
import { langMapSchema } from "@/lib/validation";

describe("language → home currency", () => {
  it("maps every catalog language (null is allowed, missing is not)", () => {
    const missing = CATALOG.filter((l) => !(l.code in LANGUAGE_CURRENCIES)).map((l) => l.code);
    expect(missing).toEqual([]);
  });

  it("only points at real, formattable currencies the menu can use", () => {
    const real = new Set(Intl.supportedValuesOf("currency"));
    for (const [lang, cur] of Object.entries(LANGUAGE_CURRENCIES)) {
      if (cur === null) continue;
      expect(real.has(cur), `${lang} → ${cur}`).toBe(true);
      expect(isSupportedCurrency(cur), `${lang} → ${cur} not in CURRENCIES`).toBe(true);
    }
  });

  it("answers for the languages people expect", () => {
    expect(languageCurrency("hi")).toBe("INR");
    expect(languageCurrency("ja")).toBe("JPY");
    expect(languageCurrency("fr-CA")).toBe("CAD");
    expect(languageCurrency("pt-PT")).toBe("EUR");
    expect(languageCurrency("pt")).toBe("BRL");
    expect(languageCurrency("eo")).toBeNull(); // no single country
    expect(languageCurrency("xx")).toBeNull();
    expect(languageCurrency("en-GB")).toBe("USD"); // falls back to the base language
  });

  it("offers a long, sorted-by-code currency list with names", () => {
    expect(CURRENCIES.length).toBeGreaterThan(140);
    for (const code of ["EUR", "USD", "INR", "AED", "JPY", "GBP", "CHF"]) expect(isSupportedCurrency(code)).toBe(true);
    expect(isSupportedCurrency("inr")).toBe(true);
    expect(isSupportedCurrency("ZZZ")).toBe(false);
    for (const [code, name] of CURRENCIES) {
      expect(code).toMatch(/^[A-Z]{3}$/);
      expect(name.length).toBeGreaterThan(2);
    }
  });
});

describe("exchange rates", () => {
  const payload = { result: "success", base_code: "EUR", time_last_update_unix: 1792195352, rates: { EUR: 1, INR: 106.75, USD: 1.12 } };

  it("reads a rate and the day it was published", () => {
    expect(parseRate(payload, "EUR", "INR")).toEqual({ from: "EUR", to: "INR", rate: 106.75, date: "2026-10-17" });
  });

  it("rejects anything that isn't a clean success", () => {
    expect(parseRate({ ...payload, result: "error" }, "EUR", "INR")).toBeNull();
    expect(parseRate(payload, "USD", "INR")).toBeNull(); // wrong base
    expect(parseRate(payload, "EUR", "XYZ")).toBeNull(); // unknown target
    expect(parseRate({ ...payload, rates: { INR: 0 } }, "EUR", "INR")).toBeNull();
    expect(parseRate({ ...payload, rates: { INR: "106" } }, "EUR", "INR")).toBeNull();
    expect(parseRate(null, "EUR", "INR")).toBeNull();
    expect(parseRate("nope", "EUR", "INR")).toBeNull();
  });
});

describe("approximate prices", () => {
  it("converts minor units of the menu currency into major units of the other", () => {
    expect(convertMajor(1800, "EUR", 106.75)).toBeCloseTo(1921.5, 5);
    expect(convertMajor(1800, "JPY", 0.6)).toBeCloseTo(1080, 5); // JPY has no minor unit
  });

  it("drops decimals on big amounts and keeps them on small ones", () => {
    expect(formatApprox(1921.5, "INR", "hi")).toContain("1,922");
    expect(formatApprox(20.24, "USD", "en")).toBe("$20.24");
    expect(formatApprox(3196.4, "JPY", "ja")).toMatch(/3,196/);
    expect(formatApprox(655.4, "TWD", "zh-Hant")).toMatch(/655/);
  });
});

describe("text typed into the menu forms", () => {
  it("keeps spaces while typing and only an empty box clears a language", () => {
    expect(setLangRaw({}, "en", "Risotto ")).toEqual({ en: "Risotto " });
    expect(setLangRaw({ en: "a", it: "b" }, "it", "")).toEqual({ en: "a" });
    expect(setLangRaw(null, "en", "x")).toEqual({ en: "x" });
  });

  it("trims and drops blanks when the server parses a language map", () => {
    expect(langMapSchema.parse({ en: "  Risotto al Nero  ", it: "   ", hi: "" })).toEqual({ en: "Risotto al Nero" });
  });
});
