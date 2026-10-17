/**
 * Palette builder: turns a handful of seed colours into a full, readable ColorSet for one mode.
 * Pure (no framework imports) so presets, tests and the admin all share it.
 *
 * Every derived pair is nudged until it passes the same contrast checks the theme editor shows
 * (main/quiet text 4.5:1, prices 4.5:1, gold rules 3:1, button text 4.5:1).
 */
import { contrastRatio } from "./overrides";
import type { ColorSet } from "./schema";

type RGB = [number, number, number];

function toRgb(hex: string): RGB {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = Number.parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = ([r, g, b]: RGB) =>
  `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();

/** Linear blend: t = 0 → a, t = 1 → b. */
export function mix(a: string, b: string, t: number): string {
  const [x, y] = [toRgb(a), toRgb(b)];
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

const ratio = (a: string, b: string) => contrastRatio(a, b) ?? 1;
const isDark = (bg: string) => ratio(bg, "#000000") < ratio(bg, "#FFFFFF");

/** Move `color` away from `bg` (toward black on light backgrounds, white on dark) until it reaches `min`:1. */
export function ensureContrast(color: string, bg: string, min: number): string {
  if (ratio(color, bg) >= min) return color.toUpperCase();
  const target = isDark(bg) ? "#FFFFFF" : "#000000";
  for (let t = 0.04; t <= 1.0001; t += 0.04) {
    const c = mix(color, target, t);
    if (ratio(c, bg) >= min) return c;
  }
  return target;
}

/** The most readable of a few candidates on `on`. */
function readable(on: string, candidates: string[]): string {
  return candidates.reduce((best, c) => (ratio(c, on) > ratio(best, on) ? c : best));
}

export type PaletteSeed = {
  /** page colour */
  bg: string;
  /** main text */
  fg: string;
  /** buttons and brand colour */
  primary: string;
  /** hairline rules and ornaments (gold, brass, …) */
  ornament: string;
  /** prices and emphasis */
  highlight: string;
  /** optional: override the derived card / panel colour */
  card?: string;
};

export function buildColors(s: PaletteSeed): ColorSet {
  const dark = isDark(s.bg);
  const bg = s.bg.toUpperCase();
  const fg = s.fg.toUpperCase();
  const card = (s.card ?? (dark ? mix(bg, "#FFFFFF", 0.045) : mix(bg, "#FFFFFF", 0.5))).toUpperCase();
  const secondary = mix(bg, fg, 0.08);
  const muted = mix(bg, fg, 0.05);
  const accent = mix(bg, s.primary, dark ? 0.2 : 0.14);
  const border = mix(bg, fg, 0.17);
  const ornament = ensureContrast(s.ornament, bg, 3);
  const highlight = ensureContrast(s.highlight, bg, 4.5);
  // quiet text must hold 4.5:1 on the page and on the secondary surface
  const quiet = ensureContrast(ensureContrast(mix(fg, bg, 0.36), bg, 4.5), secondary, 4.5);
  const primary = s.primary.toUpperCase();
  const destructive = ensureContrast(dark ? "#E5736A" : "#B3261E", bg, 4.5);

  return {
    background: bg,
    foreground: fg,
    card,
    cardForeground: fg,
    popover: card,
    popoverForeground: fg,
    primary,
    primaryForeground: readable(primary, [bg, fg, "#FFFFFF", "#111111"]),
    secondary,
    secondaryForeground: fg,
    muted,
    mutedForeground: quiet,
    accent,
    accentForeground: ensureContrast(dark ? mix(primary, "#FFFFFF", 0.25) : primary, accent, 4.5),
    destructive,
    border,
    input: border,
    ring: ornament,
    ornament,
    highlight,
    chart1: ensureContrast(primary, bg, 3),
    chart2: ornament,
    chart3: highlight,
    chart4: ensureContrast(mix(primary, highlight, 0.5), bg, 3),
    chart5: ensureContrast(mix(ornament, fg, 0.5), bg, 3),
  };
}
