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
  { key: "lora", label: "Lora", family: "Lora", fallback: SERIF_FALLBACK, file: "/fonts/lora.woff2", weights: "400 700", kind: "serif" },
  { key: "bodoni-moda", label: "Bodoni Moda", family: "Bodoni Moda", fallback: SERIF_FALLBACK, file: "/fonts/bodoni-moda.woff2", weights: "400 900", kind: "serif" },
  { key: "cinzel", label: "Cinzel", family: "Cinzel", fallback: SERIF_FALLBACK, file: "/fonts/cinzel.woff2", weights: "400 900", kind: "serif" },
  { key: "crimson-pro", label: "Crimson Pro", family: "Crimson Pro", fallback: SERIF_FALLBACK, file: "/fonts/crimson-pro.woff2", weights: "200 900", kind: "serif" },
  { key: "dm-sans", label: "DM Sans", family: "DM Sans", fallback: SANS_FALLBACK, file: "/fonts/dm-sans.woff2", weights: "100 1000", kind: "sans" },
  { key: "outfit", label: "Outfit", family: "Outfit", fallback: SANS_FALLBACK, file: "/fonts/outfit.woff2", weights: "100 900", kind: "sans" },
  { key: "space-grotesk", label: "Space Grotesk", family: "Space Grotesk", fallback: SANS_FALLBACK, file: "/fonts/space-grotesk.woff2", weights: "300 700", kind: "sans" },
  { key: "montserrat", label: "Montserrat", family: "Montserrat", fallback: SANS_FALLBACK, file: "/fonts/montserrat.woff2", weights: "100 900", kind: "sans" },
  { key: "oswald", label: "Oswald", family: "Oswald", fallback: SANS_FALLBACK, file: "/fonts/oswald.woff2", weights: "200 700", kind: "sans" },
  { key: "nunito", label: "Nunito", family: "Nunito", fallback: SANS_FALLBACK, file: "/fonts/nunito.woff2", weights: "200 1000", kind: "sans" },
  { key: "josefin-sans", label: "Josefin Sans", family: "Josefin Sans", fallback: SANS_FALLBACK, file: "/fonts/josefin-sans.woff2", weights: "100 700", kind: "sans" },
];

export const FONT_KEYS = FONT_CATALOG.map((f) => f.key) as [string, ...string[]];

export function getFont(key: string): FontDef {
  return FONT_CATALOG.find((f) => f.key === key) ?? FONT_CATALOG[0];
}
