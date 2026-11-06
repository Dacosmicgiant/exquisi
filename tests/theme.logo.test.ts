import { describe, expect, it } from "vitest";
import { hexToHsl, hsl, hueDistance } from "@/lib/theme/color";
import { extractPalette, type LogoPalette } from "@/lib/theme/logo";
import { contrastRatio } from "@/lib/theme/overrides";
import { themeSchema } from "@/lib/theme/schema";
import { suggestThemes } from "@/lib/theme/suggest";
import { hexToRgb } from "@/lib/theme/color";

type Px = [number, number, number, number];
/** build an RGBA buffer, w×h, from a per-pixel function */
const image = (w: number, h: number, f: (x: number, y: number) => Px) => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set(f(x, y), (y * w + x) * 4);
  return d;
};
const px = (hex: string, a = 255): Px => [...hexToRgb(hex), a];
const CLEAR: Px = [0, 0, 0, 0];
const WHITE: Px = [255, 255, 255, 255];

describe("reading a logo's colours", () => {
  it("finds a single colour on a transparent background", () => {
    const p = extractPalette(image(60, 60, (x, y) => ((x - 30) ** 2 + (y - 30) ** 2 < 600 ? px("#D62828") : CLEAR)));
    expect(p.colors).toHaveLength(1);
    expect(hueDistance(hexToHsl(p.colors[0].hex)[0], 0)).toBeLessThan(8);
    expect(p.colors[0].share).toBeGreaterThan(0.95);
    expect(p.neutral).toBeNull();
  });

  it("finds both colours of a two-colour logo, biggest first, ignoring a white background", () => {
    const p = extractPalette(image(80, 40, (x, y) => (y < 8 || y > 32 ? WHITE : x < 50 ? px("#0F52A8") : px("#F7941D"))));
    expect(p.colors.map((c) => Math.round(hexToHsl(c.hex)[0] / 10) * 10)).toEqual([210, 30]);
    expect(p.colors[0].share).toBeGreaterThan(p.colors[1].share);
    expect(p.colors.every((c) => c.hex !== "#FFFFFF")).toBe(true);
  });

  it("does not turn anti-aliased edges into extra colours", () => {
    // red shape whose edge fades to white over a few pixels
    const p = extractPalette(
      image(100, 20, (x) => {
        if (x < 70) return px("#E63946");
        const t = (x - 70) / 30; // 0 → 1
        const c = hexToRgb("#E63946").map((v) => v + (255 - v) * t) as [number, number, number];
        return [...c, 255] as Px;
      }),
    );
    expect(p.colors).toHaveLength(1);
  });

  it("drops stray colours that are only a speck of the logo", () => {
    const p = extractPalette(image(100, 100, (x, y) => (x === 0 && y < 3 ? px("#00AA00") : px("#7B2D8B"))));
    expect(p.colors).toHaveLength(1);
    expect(hueDistance(hexToHsl(p.colors[0].hex)[0], 290)).toBeLessThan(15);
  });

  it("calls a black-and-white logo neutral and reports its ink", () => {
    const p = extractPalette(image(40, 40, (x) => (x < 20 ? px("#111111") : WHITE)));
    expect(p.colors).toEqual([]);
    expect(p.neutral).not.toBeNull();
    expect(hexToHsl(p.neutral as string)[2]).toBeLessThan(0.2);
  });

  it("calls a grey logo neutral", () => {
    const p = extractPalette(image(40, 40, () => px("#777777")));
    expect(p.colors).toEqual([]);
    expect(p.neutral).toBe("#777777");
  });

  it("handles a fully transparent or fully white image", () => {
    expect(extractPalette(image(10, 10, () => CLEAR))).toEqual({ colors: [], neutral: null, empty: true });
    expect(extractPalette(image(10, 10, () => WHITE)).empty).toBe(true);
    expect(extractPalette(new Uint8ClampedArray(0)).empty).toBe(true);
  });

  it("returns at most the requested number of distinct colours", () => {
    const cols = ["#E63946", "#2A9D8F", "#264DD6", "#F4A300", "#8E44AD", "#16A34A"];
    const p = extractPalette(image(120, 20, (x) => px(cols[Math.floor(x / 20)])), 3);
    expect(p.colors).toHaveLength(3);
  });
});

// the same readability bars the editor shows and the presets are tested against
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

const pal = (...hex: string[]): LogoPalette => ({ colors: hex.map((h, i) => ({ hex: h, share: 1 / (i + 1) })), neutral: null, empty: false });

function assertReadable(label: string, s: ReturnType<typeof suggestThemes>[number]) {
  expect(themeSchema.safeParse(s.theme).success, `${label} ${s.id} valid`).toBe(true);
  for (const mode of ["light", "dark"] as const) {
    for (const [fg, bg, min] of CHECKS) {
      const c = s.theme.colors[mode];
      expect(contrastRatio(c[fg], c[bg]) ?? 0, `${label} ${s.id} ${mode} ${fg}/${bg}`).toBeGreaterThanOrEqual(min);
    }
  }
}

describe("themes suggested from a logo", () => {
  it("always returns three different, valid, readable themes, for any logo colour", () => {
    for (let h = 0; h < 360; h += 15) {
      for (const s of [0.25, 0.6, 1]) {
        for (const l of [0.25, 0.5, 0.78]) {
          const hex = hsl(h, s, l);
          const out = suggestThemes(pal(hex));
          const label = `logo ${hex}`;
          expect(out.map((o) => o.id)).toEqual(["tonal", "contrast", "evening"]);
          out.forEach((o) => assertReadable(label, o));
          // visibly different from one another: not just a renamed copy
          const sig = out.map((o) => `${o.theme.fonts.display}|${o.theme.colors.light.background}|${o.theme.mode}`);
          expect(new Set(sig).size, label).toBe(3);
        }
      }
    }
  });

  it("builds the first two around the logo's own colour (kept exactly when it is readable as a button)", () => {
    const blue = "#1F5E96";
    const [tonal, contrast, evening] = suggestThemes(pal(blue));
    expect(tonal.theme.colors.light.primary).toBe(blue);
    expect(contrast.theme.colors.light.primary).toBe(blue);
    expect(hueDistance(hexToHsl(evening.theme.colors.dark.primary)[0], hexToHsl(blue)[0])).toBeLessThan(12);
    expect(tonal.brand).toBe(blue);
  });

  it("uses a second logo colour as the accent when there is one", () => {
    const [, contrast] = suggestThemes(pal("#0F52A8", "#F7941D"));
    expect(hueDistance(hexToHsl(contrast.theme.colors.light.ornament)[0], hexToHsl("#F7941D")[0])).toBeLessThan(15);
    expect(hueDistance(hexToHsl(contrast.theme.colors.light.primary)[0], hexToHsl("#0F52A8")[0])).toBeLessThan(5);
  });

  it("complements a single-colour logo with the opposite side of the colour wheel", () => {
    const [, contrast] = suggestThemes(pal("#1F5E96"));
    const d = hueDistance(hexToHsl(contrast.theme.colors.light.ornament)[0], hexToHsl("#1F5E96")[0]);
    expect(d).toBeGreaterThan(150);
  });

  it("copes with a black-and-white logo by pairing its ink with a different accent in each theme", () => {
    const out = suggestThemes({ colors: [], neutral: "#222222", empty: false });
    out.forEach((o) => assertReadable("neutral logo", o));
    expect(new Set(out.map((o) => o.theme.colors.light.primary)).size).toBe(3);
  });

  it("copes with an empty logo", () => {
    const out = suggestThemes({ colors: [], neutral: null, empty: true });
    expect(out).toHaveLength(3);
    out.forEach((o) => assertReadable("empty logo", o));
  });

  it("names the themes after the restaurant when given, and puts the dark one in dark mode", () => {
    const out = suggestThemes(pal("#B23A26"), { brandName: "Casa Rossa" });
    expect(out.map((o) => o.name)).toEqual(["Casa Rossa · Tonal", "Casa Rossa · Contrast", "Casa Rossa · Evening"]);
    expect(out[2].theme.mode).toBe("dark");
    expect(out[0].theme.mode).toBe("system");
  });

  it("only uses fonts from the catalog and categories the library accepts", async () => {
    const { FONT_CATALOG } = await import("@/lib/theme/fonts");
    const { CATEGORY_KEYS } = await import("@/lib/theme/presets");
    const keys = new Set(FONT_CATALOG.map((f) => f.key));
    for (const o of suggestThemes(pal("#B23A26"))) {
      expect(keys.has(o.theme.fonts.display) && keys.has(o.theme.fonts.body)).toBe(true);
      expect(CATEGORY_KEYS).toContain(o.category);
    }
  });
});
