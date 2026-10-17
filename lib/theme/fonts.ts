/**
 * Curated, self-hosted font catalog (woff2 files live in /public/fonts,
 * copied from @fontsource-variable by scripts/copy-fonts.ts).
 * A restaurant page only ever emits @font-face for its two chosen fonts.
 */
export type FontDef = {
  key: string;
  label: string;
  family: string;
  fallback: string;
  file: string;
  weights: string; // CSS font-weight range of the variable file
  kind: "serif" | "sans";
};

const SERIF_FALLBACK = '"Iowan Old Style", "Palatino Linotype", Georgia, serif';
const SANS_FALLBACK = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const FONT_CATALOG: FontDef[] = [
  { key: "cormorant-garamond", label: "Cormorant Garamond", family: "Cormorant Garamond", fallback: SERIF_FALLBACK, file: "/fonts/cormorant-garamond.woff2", weights: "300 700", kind: "serif" },
  { key: "playfair-display", label: "Playfair Display", family: "Playfair Display", fallback: SERIF_FALLBACK, file: "/fonts/playfair-display.woff2", weights: "400 900", kind: "serif" },
  { key: "eb-garamond", label: "EB Garamond", family: "EB Garamond", fallback: SERIF_FALLBACK, file: "/fonts/eb-garamond.woff2", weights: "400 800", kind: "serif" },
  { key: "fraunces", label: "Fraunces", family: "Fraunces", fallback: SERIF_FALLBACK, file: "/fonts/fraunces.woff2", weights: "100 900", kind: "serif" },
  { key: "jost", label: "Jost", family: "Jost", fallback: SANS_FALLBACK, file: "/fonts/jost.woff2", weights: "100 900", kind: "sans" },
  { key: "inter", label: "Inter", family: "Inter", fallback: SANS_FALLBACK, file: "/fonts/inter.woff2", weights: "100 900", kind: "sans" },
  { key: "libre-franklin", label: "Libre Franklin", family: "Libre Franklin", fallback: SANS_FALLBACK, file: "/fonts/libre-franklin.woff2", weights: "100 900", kind: "sans" },
  { key: "manrope", label: "Manrope", family: "Manrope", fallback: SANS_FALLBACK, file: "/fonts/manrope.woff2", weights: "200 800", kind: "sans" },
];

export const FONT_KEYS = FONT_CATALOG.map((f) => f.key) as [string, ...string[]];

export function getFont(key: string): FontDef {
  return FONT_CATALOG.find((f) => f.key === key) ?? FONT_CATALOG[0];
}
