/**
 * Reads the colours a logo is made of, from its pixels (RGBA, e.g. a canvas's ImageData). Pure and framework-free:
 * the browser hands over the pixels, so no image library or service is needed, and the same code is unit-tested.
 *
 * Transparent pixels and near-white ones (a white background or knock-out) are ignored; anti-aliased edge pixels
 * are merged into the colour they belong to. A logo with no real colour (black and white, greys) is reported as `neutral`.
 */
import { hexToHsl, hueDistance, rgbToHex } from "./color";

export type Swatch = { hex: string; /** fraction (0–1) of the logo's visible, non-white pixels */ share: number };
export type LogoPalette = {
  /** distinct brand colours, most used first (at most `max`) */
  colors: Swatch[];
  /** for a logo with no colour: its dominant dark/grey, otherwise null */
  neutral: string | null;
  /** true when there were no visible, non-white pixels at all */
  empty: boolean;
};

type Bucket = { n: number; r: number; g: number; b: number };

export function extractPalette(data: ArrayLike<number>, max = 4): LogoPalette {
  const buckets = new Map<number, Bucket>();
  let counted = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // transparent
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 238 && g > 238 && b > 238) continue; // white-ish background
    counted++;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const cur = buckets.get(key);
    if (cur) {
      cur.n++;
      cur.r += r;
      cur.g += g;
      cur.b += b;
    } else buckets.set(key, { n: 1, r, g, b });
  }
  if (counted === 0) return { colors: [], neutral: null, empty: true };

  const all = [...buckets.values()]
    .map((b) => {
      const hex = rgbToHex([b.r / b.n, b.g / b.n, b.b / b.n]);
      const [h, s, l] = hexToHsl(hex);
      return { hex, n: b.n, h, s, l };
    })
    .sort((a, b) => b.n - a.n);

  // colour = saturated enough and neither black nor white; everything else is neutral ink
  const chromatic = all.filter((c) => c.s >= 0.2 && c.l > 0.1 && c.l < 0.92);
  const neutrals = all.filter((c) => !(c.s >= 0.2 && c.l > 0.1 && c.l < 0.92));

  // merge shades of one hue (anti-aliasing, gradients): the most used bucket of a cluster represents it
  const clusters: { hex: string; h: number; l: number; n: number }[] = [];
  for (const c of chromatic) {
    const home = clusters.find((k) => hueDistance(k.h, c.h) < 22 && Math.abs(k.l - c.l) < 0.32);
    if (home) home.n += c.n;
    else clusters.push({ hex: c.hex, h: c.h, l: c.l, n: c.n });
  }
  const colors = clusters
    .map((k) => ({ hex: k.hex, share: k.n / counted }))
    .filter((k) => k.share >= 0.04)
    .sort((a, b) => b.share - a.share)
    .slice(0, max);

  if (colors.length) return { colors, neutral: null, empty: false };
  const ink = neutrals[0];
  return { colors: [], neutral: ink ? ink.hex : null, empty: false };
}

/** Hue (0–360) of a swatch. */
export const swatchHue = (s: Swatch) => hexToHsl(s.hex)[0];
