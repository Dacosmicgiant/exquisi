import { z } from "zod";
import { FONT_KEYS } from "./fonts";

const hex = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "Use a hex colour, e.g. #1F3B2D");

/** shadcn semantic tokens + the few editorial extras this product adds. */
export const colorSetShape = {
  background: hex,
  foreground: hex,
  card: hex,
  cardForeground: hex,
  popover: hex,
  popoverForeground: hex,
  primary: hex,
  primaryForeground: hex,
  secondary: hex,
  secondaryForeground: hex,
  muted: hex,
  mutedForeground: hex,
  accent: hex,
  accentForeground: hex,
  destructive: hex,
  border: hex,
  input: hex,
  ring: hex,
  /** brass / gold: hairline rules, ornaments, focus accents */
  ornament: hex,
  /** emphasis colour (prices, stamps): Bordeaux in the default theme */
  highlight: hex,
  chart1: hex,
  chart2: hex,
  chart3: hex,
  chart4: hex,
  chart5: hex,
};
export const colorSetSchema = z.object(colorSetShape);
export type ColorSet = z.infer<typeof colorSetSchema>;
export type ColorToken = keyof ColorSet;

const fontKey = z.enum(FONT_KEYS);

const section = {
  mode: z.enum(["light", "dark", "system"]),
  fonts: z.object({ display: fontKey, body: fontKey }),
  type: z.object({
    baseSize: z.string().regex(/^\d+(\.\d+)?(rem|px)$/),
    lineHeight: z.number().min(1).max(2.2),
    displayWeight: z.number().min(100).max(900),
    displayTracking: z.string().regex(/^-?\d+(\.\d+)?em$/),
    labelTracking: z.string().regex(/^\d+(\.\d+)?em$/),
  }),
  radius: z.string().regex(/^\d+(\.\d+)?(rem|px)$/),
  density: z.enum(["compact", "comfortable", "spacious"]),
  shadow: z.object({ soft: z.string().max(200), lifted: z.string().max(200) }),
  motion: z.object({
    enabled: z.boolean(),
    duration: z.string().regex(/^\d+ms$/),
    ease: z.string().max(80),
  }),
  ornaments: z.object({
    doubleRule: z.boolean(),
    paperGrain: z.boolean(),
    romanNumerals: z.boolean(),
    dottedLeaders: z.boolean(),
  }),
};

export const themeSchema = z.object({
  ...section,
  colors: z.object({ light: colorSetSchema, dark: colorSetSchema }),
});
export type Theme = z.infer<typeof themeSchema>;

/** Overrides are validated section by section (see sanitizeOverrides) so one bad value never breaks a page. */
export const overrideSectionSchemas = {
  mode: section.mode,
  fonts: section.fonts.partial(),
  type: section.type.partial(),
  radius: section.radius,
  density: section.density,
  shadow: section.shadow.partial(),
  motion: section.motion.partial(),
  ornaments: section.ornaments.partial(),
  "colors.light": colorSetSchema.partial(),
  "colors.dark": colorSetSchema.partial(),
} as const;

export type ThemeOverrides = {
  mode?: Theme["mode"];
  fonts?: Partial<Theme["fonts"]>;
  type?: Partial<Theme["type"]>;
  radius?: string;
  density?: Theme["density"];
  shadow?: Partial<Theme["shadow"]>;
  motion?: Partial<Theme["motion"]>;
  ornaments?: Partial<Theme["ornaments"]>;
  colors?: { light?: Partial<ColorSet>; dark?: Partial<ColorSet> };
};
