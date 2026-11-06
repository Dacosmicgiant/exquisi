/**
 * Three ready-to-use themes built from a logo's colours (see logo.ts). Each is a COMPLETE Theme (light and dark) made with
 * `buildColors`, so text stays readable whatever the logo looks like; staff can use one as is, fine-tune it, or save it.
 *
 *   Tonal     shades of the logo's own colour: calm, clearly on-brand
 *   Contrast  the logo colour with a complementary accent on a clean neutral page
 *   Evening   a dark, atmospheric version built around the colour
 *
 * A black-and-white logo has no colour to follow, so each suggestion pairs its ink with a different accent instead.
 */
import { defaultTheme } from "@/theme/theme.config";
import { hexToHsl, hsl } from "./color";
import type { LogoPalette } from "./logo";
import { contrastRatio } from "./overrides";
import { buildColors, ensureContrast, type PaletteSeed } from "./palette";
import type { ThemeCategory } from "./presets";
import type { Theme } from "./schema";

export type ThemeSuggestion = {
  id: "tonal" | "contrast" | "evening";
  name: string;
  category: ThemeCategory;
  description: string;
  theme: Theme;
  /** the logo colour this theme is built around */
  brand: string;
};

/** accents used when the logo has no colour of its own: brass, deep teal, wine */
const NEUTRAL_ACCENTS = ["#A68A4B", "#2F6F73", "#8A2F45"];

/** Nudge a button colour (keeping its hue) until white or near-black text on it reads at 4.5:1. */
function readableButton(hex: string): string {
  const best = (c: string) => Math.max(contrastRatio(c, "#FFFFFF") ?? 1, contrastRatio(c, "#111111") ?? 1);
  if (best(hex) >= 4.5) return hex;
  const [h, s, l] = hexToHsl(hex);
  const lighten = (contrastRatio(hex, "#111111") ?? 1) > (contrastRatio(hex, "#FFFFFF") ?? 1);
  for (let step = 1; step <= 40; step++) {
    const c = hsl(h, s, l + (lighten ? 1 : -1) * step * 0.015);
    if (best(c) >= 4.5) return c;
  }
  return hex;
}

/** Keep the hue and saturation of `hex` but make it light enough to read on a dark page. */
const forDark = (hex: string, minL = 0.62) => {
  const [h, s, l] = hexToHsl(hex);
  return hsl(h, s, Math.max(l, minL));
};

export function suggestThemes(
  pal: LogoPalette,
  opts: { base?: Theme; brandName?: string } = {},
): ThemeSuggestion[] {
  const base = opts.base ?? defaultTheme;
  const chromatic = pal.colors.length > 0;
  const first = pal.colors[0]?.hex;
  const brandFor = (i: number) => (chromatic ? (first as string) : NEUTRAL_ACCENTS[i]);
  const second = pal.colors[1]?.hex;
  const tag = (n: string) => (opts.brandName ? `${opts.brandName} · ${n}` : n);
  // a neutral logo's ink gives the pages a faint matching tint; a coloured logo tints pages with its own hue
  const inkHue = pal.neutral ? hexToHsl(pal.neutral)[0] : 40;

  const make = (
    id: ThemeSuggestion["id"],
    name: string,
    category: ThemeCategory,
    description: string,
    brand: string,
    light: PaletteSeed,
    dark: PaletteSeed,
    extra: Partial<Theme>,
  ): ThemeSuggestion => ({
    id,
    name: tag(name),
    category,
    description,
    brand,
    theme: {
      ...base,
      ...extra,
      colors: { light: buildColors(light), dark: buildColors(dark) },
    },
  });

  // ── 1 · Tonal ───────────────────────────────────────────────────────────────
  const b1 = brandFor(0);
  const [h1, s1] = hexToHsl(b1);
  const hue1 = chromatic ? h1 : inkHue;
  const sat1 = chromatic ? s1 : 0.25;
  const accent1 = second ?? hsl(h1, s1 * 0.6, 0.45);
  const tonal = make(
    "tonal",
    "Tonal",
    "modern-minimal",
    chromatic ? "Shades of your logo's colour: calm, clearly on-brand." : "Your logo's ink with a brass accent: classic and calm.",
    b1,
    { bg: hsl(hue1, Math.min(sat1 * 0.4, 0.3), 0.965), fg: hsl(hue1, Math.min(sat1 * 0.3, 0.25), 0.11), primary: readableButton(b1), ornament: accent1, highlight: hsl(h1, s1, 0.33) },
    { bg: hsl(hue1, Math.min(sat1 * 0.45, 0.35), 0.09), fg: hsl(hue1, 0.2, 0.92), primary: readableButton(forDark(b1)), ornament: forDark(accent1, 0.6), highlight: forDark(b1, 0.72) },
    { mode: "system" },
  );

  // ── 2 · Contrast ────────────────────────────────────────────────────────────
  const b2 = brandFor(1);
  const [h2, s2] = hexToHsl(b2);
  const accent2 = second ?? hsl(h2 + 180, Math.min(Math.max(s2, 0.45), 0.85), 0.5);
  const contrast = make(
    "contrast",
    "Contrast",
    "casual-street",
    chromatic ? "Your logo colour with a complementary accent on a clean, light page." : "Ink on a clean page with a deep teal accent.",
    b2,
    { bg: hsl(chromatic ? h2 : inkHue, 0.08, 0.975), fg: hsl(chromatic ? h2 : inkHue, 0.15, 0.1), primary: readableButton(b2), ornament: accent2, highlight: accent2 },
    { bg: hsl(chromatic ? h2 : inkHue, 0.12, 0.08), fg: hsl(chromatic ? h2 : inkHue, 0.1, 0.93), primary: readableButton(forDark(b2)), ornament: forDark(accent2, 0.6), highlight: forDark(accent2, 0.72) },
    {
      mode: "system",
      fonts: { display: "outfit", body: "dm-sans" },
      radius: "0.625rem",
      density: "comfortable",
      ornaments: { doubleRule: false, paperGrain: false, romanNumerals: false, dottedLeaders: false },
    },
  );

  // ── 3 · Evening ─────────────────────────────────────────────────────────────
  const b3 = brandFor(2);
  const [h3, s3] = hexToHsl(b3);
  const warm = second ?? hsl(h3 + 28, Math.max(s3, 0.45), 0.62);
  const evening = make(
    "evening",
    "Evening",
    "bar-lounge",
    chromatic ? "A dark, atmospheric theme built around your logo colour." : "Dark and atmospheric with a wine accent.",
    b3,
    { bg: hsl(chromatic ? h3 : inkHue, 0.25, 0.94), fg: hsl(chromatic ? h3 : inkHue, 0.3, 0.12), primary: readableButton(hsl(h3, s3, Math.min(hexToHsl(b3)[2], 0.34))), ornament: hsl(h3 + 28, s3 * 0.7, 0.4), highlight: hsl(h3, s3, 0.3) },
    { bg: hsl(chromatic ? h3 : inkHue, Math.min(Math.max(s3 * 0.55, 0.15), 0.45), 0.1), fg: hsl(chromatic ? h3 : inkHue, 0.2, 0.9), primary: readableButton(forDark(b3, 0.65)), ornament: forDark(warm, 0.62), highlight: forDark(warm, 0.74) },
    {
      mode: "dark",
      fonts: { display: "cormorant-garamond", body: "jost" },
      radius: "0.125rem",
      density: "spacious",
      type: { ...base.type, labelTracking: "0.28em" },
      ornaments: { doubleRule: true, paperGrain: false, romanNumerals: true, dottedLeaders: true },
    },
  );

  // a suggestion's page text can never be left unreadable by a hue the maths pushes to an extreme
  for (const s of [tonal, contrast, evening]) {
    for (const mode of ["light", "dark"] as const) {
      const c = s.theme.colors[mode];
      c.ornament = ensureContrast(c.ornament, c.background, 3);
    }
  }
  return [tonal, contrast, evening];
}
