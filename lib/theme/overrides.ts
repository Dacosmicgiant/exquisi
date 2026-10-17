import type { Brand } from "@/lib/db/types";
import type { ColorSet, Theme, ThemeOverrides } from "./schema";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function diffObj<T extends object>(base: T, next: T): Partial<T> | undefined {
  const out: Partial<T> = {};
  for (const k of Object.keys(next) as (keyof T)[]) if (!same(base[k], next[k])) out[k] = next[k];
  return Object.keys(out).length ? out : undefined;
}

/** The smallest override that turns `base` into `working`. Empty object ⇒ identical. */
export function diffTheme(base: Theme, working: Theme): ThemeOverrides {
  const o: ThemeOverrides = {};
  if (base.mode !== working.mode) o.mode = working.mode;
  if (base.radius !== working.radius) o.radius = working.radius;
  if (base.density !== working.density) o.density = working.density;
  const fonts = diffObj(base.fonts, working.fonts);
  if (fonts) o.fonts = fonts;
  const type = diffObj(base.type, working.type);
  if (type) o.type = type;
  const shadow = diffObj(base.shadow, working.shadow);
  if (shadow) o.shadow = shadow;
  const motion = diffObj(base.motion, working.motion);
  if (motion) o.motion = motion;
  const ornaments = diffObj(base.ornaments, working.ornaments);
  if (ornaments) o.ornaments = ornaments;
  const light = diffObj<ColorSet>(base.colors.light, working.colors.light);
  const dark = diffObj<ColorSet>(base.colors.dark, working.colors.dark);
  if (light || dark) o.colors = { ...(light ? { light } : {}), ...(dark ? { dark } : {}) };
  return o;
}

export const hasOverrides = (o: ThemeOverrides) => Object.keys(o).length > 0;

/** Restaurant brand storage shape: colours/fonts as specified, everything else under `theme`. */
export function overridesToBrand(o: ThemeOverrides): Pick<Brand, "colors" | "fonts" | "theme"> {
  const { colors, fonts, ...rest } = o;
  return { colors, fonts, theme: rest };
}

// ── WCAG contrast ───────────────────────────────────────────────────────────
function parse(hex: string): [number, number, number] | null {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
  if (h.length !== 6 && h.length !== 8) return null;
  const n = Number.parseInt(h.slice(0, 6), 16);
  return Number.isNaN(n) ? null : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const lin = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: [number, number, number]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

/** WCAG contrast ratio between two hex colours (1–21), or null if either is invalid. */
export function contrastRatio(a: string, b: string): number | null {
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return null;
  const [hi, lo] = [luminance(pa), luminance(pb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
