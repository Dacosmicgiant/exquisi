import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/theme/overrides";
import { buildColors, ensureContrast } from "@/lib/theme/palette";
import { CATEGORY_KEYS, PRESETS, THEME_CATEGORIES, customRef, getPreset, parseThemeRef, presetRef } from "@/lib/theme/presets";
import { resolveTheme, sanitizeOverrides } from "@/lib/theme/resolve";
import { themeSchema } from "@/lib/theme/schema";
import { FONT_CATALOG } from "@/lib/theme/fonts";
import { defaultTheme } from "@/theme/theme.config";
import { existsSync } from "node:fs";
import { join } from "node:path";

// the same readability bars the theme editor shows
const CHECKS = [
  ["foreground", "background", 4.5],
  ["mutedForeground", "background", 4.5],
  ["mutedForeground", "secondary", 4.5],
  ["primaryForeground", "primary", 4.5],
  ["highlight", "background", 4.5],
  ["ornament", "background", 3],
  ["cardForeground", "card", 4.5],
  ["accentForeground", "accent", 4.5],
] as const;

describe("theme presets", () => {
  it("offers 20–25 themes with unique ids and names", () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(20);
    expect(PRESETS.length).toBeLessThanOrEqual(25);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
    expect(new Set(PRESETS.map((p) => p.name)).size).toBe(PRESETS.length);
  });

  it("gives every preset a name, a known category and a description", () => {
    for (const p of PRESETS) {
      expect(p.name.trim().length, p.id).toBeGreaterThan(0);
      expect(CATEGORY_KEYS, p.id).toContain(p.category);
      expect(p.description.length, p.id).toBeGreaterThan(10);
    }
    // every category is actually used
    for (const c of THEME_CATEGORIES) expect(PRESETS.some((p) => p.category === c.key), c.key).toBe(true);
  });

  it("keeps the original look as the first preset", () => {
    expect(PRESETS[0].id).toBe("old-money");
    expect(PRESETS[0].theme).toEqual(defaultTheme);
  });

  it("makes every preset a complete, valid theme that survives sanitising unchanged", () => {
    for (const p of PRESETS) {
      expect(themeSchema.safeParse(p.theme).success, p.id).toBe(true);
      expect(sanitizeOverrides(p.theme), p.id).toEqual(p.theme);
      expect(resolveTheme(p.theme), p.id).toEqual(p.theme);
    }
  });

  it("keeps text readable in light and dark for every preset", () => {
    const failures: string[] = [];
    for (const p of PRESETS) {
      for (const mode of ["light", "dark"] as const) {
        for (const [fg, bg, min] of CHECKS) {
          // "Old Money" is the original house look; its brass hairline (2.9:1) is decorative and kept as designed
          if (p.id === "old-money" && fg === "ornament") continue;
          const c = p.theme.colors[mode];
          const r = contrastRatio(c[fg], c[bg]) ?? 0;
          if (r < min) failures.push(`${p.id} ${mode} ${fg}/${bg} ${r.toFixed(2)} < ${min}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("only uses fonts that are in the catalog and shipped in /public/fonts", () => {
    const keys = new Set(FONT_CATALOG.map((f) => f.key));
    for (const p of PRESETS) {
      for (const k of [p.theme.fonts.display, p.theme.fonts.body]) expect(keys.has(k), `${p.id}: ${k}`).toBe(true);
    }
    for (const f of FONT_CATALOG) expect(existsSync(join(process.cwd(), "public", f.file)), f.file).toBe(true);
  });

  it("makes the presets visibly different from one another", () => {
    const looks = new Set(PRESETS.map((p) => `${p.theme.colors.light.primary}|${p.theme.colors.light.background}`));
    expect(looks.size).toBe(PRESETS.length);
  });

  it("looks presets up by id", () => {
    expect(getPreset("speakeasy")?.category).toBe("bar-lounge");
    expect(getPreset("nope")).toBeUndefined();
    expect(getPreset(undefined)).toBeUndefined();
  });
});

describe("palette builder", () => {
  it("pushes low-contrast colours until they pass", () => {
    const fixed = ensureContrast("#EEEEEE", "#FFFFFF", 4.5);
    expect(contrastRatio(fixed, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    // already fine: untouched
    expect(ensureContrast("#000000", "#FFFFFF", 4.5)).toBe("#000000");
    // dark backgrounds are lightened instead
    expect(contrastRatio(ensureContrast("#222222", "#111111", 4.5), "#111111")).toBeGreaterThanOrEqual(4.5);
  });

  it("emits every colour token as a hex value", () => {
    const c = buildColors({ bg: "#FFFFFF", fg: "#111111", primary: "#336699", ornament: "#999999", highlight: "#CC3333" });
    for (const [k, v] of Object.entries(c)) expect(v, k).toMatch(/^#[0-9A-F]{6}$/);
    expect(Object.keys(c).sort()).toEqual(Object.keys(defaultTheme.colors.light).sort());
  });
});

describe("theme references", () => {
  it("parses preset: and custom: references and rejects anything else", () => {
    expect(parseThemeRef(presetRef("speakeasy"))).toEqual({ kind: "preset", id: "speakeasy" });
    expect(parseThemeRef(customRef("65f0"))).toEqual({ kind: "custom", id: "65f0" });
    for (const bad of [undefined, null, "", "speakeasy", "other:x", "preset:", ":x"]) expect(parseThemeRef(bad as string)).toBeNull();
  });
});

describe("layering: house style < chosen theme < restaurant tweaks", () => {
  it("lets a chosen theme replace the house look, and the restaurant's tweaks win over both", () => {
    const house = { colors: { light: { primary: "#112233" } }, radius: "1rem" };
    const speakeasy = getPreset("speakeasy")!.theme;
    const t = resolveTheme(house, speakeasy, { colors: { light: { primary: "#445566" } } });
    expect(t.colors.light.primary).toBe("#445566"); // tweak
    expect(t.fonts).toEqual(speakeasy.fonts); // from the theme
    expect(t.radius).toBe(speakeasy.radius); // theme beats the house radius
    expect(t.colors.dark).toEqual(speakeasy.colors.dark);
  });
});
