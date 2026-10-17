import { describe, expect, it } from "vitest";
import { resolveText, setLang } from "@/lib/i18n";
import { formatPlain, toMinor } from "@/lib/money";
import { toRoman } from "@/lib/roman";

describe("language maps", () => {
  it("falls back requested → default → any", () => {
    expect(resolveText({ en: "Soup", it: "Zuppa" }, "it", "en")).toBe("Zuppa");
    expect(resolveText({ en: "Soup" }, "hi", "en")).toBe("Soup");
    expect(resolveText({ fr: "Soupe" }, "hi", "en")).toBe("Soupe");
    expect(resolveText(null, "en", "en")).toBe("");
  });
  it("sets and clears a single language without touching others", () => {
    expect(setLang({ en: "a", it: "b" }, "it", "c")).toEqual({ en: "a", it: "c" });
    expect(setLang({ en: "a", it: "b" }, "it", " ")).toEqual({ en: "a" });
  });
});

describe("money & numerals", () => {
  it("round-trips minor units", () => {
    expect(toMinor(18.5, "EUR")).toBe(1850);
    expect(toMinor(1000, "JPY")).toBe(1000);
    expect(formatPlain(2400, "EUR")).toBe("24");
    expect(formatPlain(1850, "EUR")).toBe("18.50");
  });
  it("renders roman numerals", () => {
    expect([1, 4, 9, 14, 40].map(toRoman)).toEqual(["I", "IV", "IX", "XIV", "XL"]);
  });
});
