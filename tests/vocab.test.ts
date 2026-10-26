import { describe, expect, it } from "vitest";
import { ALLERGEN_KEYS } from "@/lib/allergens";
import { DIETARY_KEYS } from "@/lib/db/types";
import { SUPPORTED } from "@/lib/i18n/languages";
import { UI_KEYS, getVocab, vocabLanguages } from "@/lib/i18n/vocab";

describe("fixed vocabulary", () => {
  it("covers every supported language with every allergen, dietary tag, spice level and UI string", () => {
    for (const l of SUPPORTED) {
      const v = getVocab(l.code);
      expect(v.fallback, `missing vocabulary for ${l.code}`).toBe(false);
      for (const k of ALLERGEN_KEYS) expect(v.allergens[k]?.trim(), `${l.code}.${k}`).toBeTruthy();
      for (const k of DIETARY_KEYS) expect(v.dietary[k]?.trim(), `${l.code}.${k}`).toBeTruthy();
      expect(v.spice.every((s) => s.trim())).toBe(true);
      for (const k of UI_KEYS) expect(v.ui[k]?.trim(), `${l.code}.${k}`).toBeTruthy();
    }
  });
  it("falls back to English labels, never machine translation, for languages without an entry", () => {
    const sw = getVocab("sw");
    expect(sw.fallback).toBe(true);
    expect(sw.allergens.milk).toBe("Milk");
    expect(getVocab("it").fallback).toBe(false);
  });
  it("is honest about review status", () => {
    expect(getVocab("en").reviewed).toBe(true);
    expect(getVocab("hi").reviewed).toBe(false);
    expect(vocabLanguages().length).toBeGreaterThanOrEqual(40);
    // experimental languages that have a hand-written label set still use it
  });
  it("distinguishes pork from beef from alcohol in every language", () => {
    for (const code of vocabLanguages()) {
      const d = getVocab(code).dietary;
      expect(new Set([d.contains_pork, d.contains_beef, d.contains_alcohol]).size, code).toBe(3);
    }
  });
});

describe("regional variants", () => {
  it("use their base language's hand-written labels, not English", () => {
    for (const v of ["pt-PT", "es-419", "fr-CA"]) {
      const r = getVocab(v);
      expect(r.fallback, v).toBe(false);
      expect(r.allergens.milk).toBe(getVocab(v.split("-")[0]).allergens.milk);
    }
    expect(getVocab("tt").fallback).toBe(true); // no labels written yet: English, never machine translated
  });
});

describe("menu prompt", () => {
  it("has a hand-written prompt in every vocabulary language, English exactly as asked", () => {
    expect(getVocab("en").ui.prompt).toBe("What's on your mind?");
    for (const code of vocabLanguages()) {
      const p = getVocab(code).ui.prompt;
      expect(p.trim().length, code).toBeGreaterThan(3);
      // other languages are not the English sentence copied across
      if (code !== "en") expect(p, code).not.toBe(getVocab("en").ui.prompt);
    }
  });
});
