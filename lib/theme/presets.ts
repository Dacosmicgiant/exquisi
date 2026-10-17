/**
 * Ready-made themes, grouped by the kind of venue they suit (like the theme pickers in code editors).
 * Each preset is a complete `Theme`; a restaurant picks one on its Brand tab and may still tweak it.
 * Staff can also save their own (see lib/theme/library.ts); presets themselves are code, not data.
 *
 * Colours come from `buildColors`, which derives surfaces/borders from a few seed colours and keeps
 * text readable (tests/theme.presets.test.ts checks every preset).
 */
import { defaultTheme } from "@/theme/theme.config";
import { buildColors, type PaletteSeed } from "./palette";
import type { Theme } from "./schema";

export const THEME_CATEGORIES = [
  { key: "fine-dining", label: "Fine dining", blurb: "Quiet luxury, candlelight, tasting menus" },
  { key: "trattoria-bistro", label: "Trattoria & bistro", blurb: "Warm, rustic, family-run" },
  { key: "cafe", label: "Café", blurb: "Coffee, brunch and slow mornings" },
  { key: "bakery-dessert", label: "Bakery & dessert", blurb: "Pastry cases and sweet things" },
  { key: "bar-lounge", label: "Bar & lounge", blurb: "Cocktails, late nights, low light" },
  { key: "seafood-coastal", label: "Seafood & coastal", blurb: "Harbour fresh, sea air" },
  { key: "casual-street", label: "Casual & street food", blurb: "Loud, fast, friendly" },
  { key: "modern-minimal", label: "Modern & minimal", blurb: "Clean, neutral, contemporary" },
] as const;

export type ThemeCategory = (typeof THEME_CATEGORIES)[number]["key"];
export const CATEGORY_KEYS = THEME_CATEGORIES.map((c) => c.key) as [ThemeCategory, ...ThemeCategory[]];
export const categoryLabel = (key: string) => THEME_CATEGORIES.find((c) => c.key === key)?.label ?? "Other";

export type ThemePreset = {
  id: string;
  name: string;
  category: ThemeCategory;
  description: string;
  theme: Theme;
};

type Spec = {
  id: string;
  name: string;
  category: ThemeCategory;
  description: string;
  light: PaletteSeed;
  dark: PaletteSeed;
  /** [headings, body] keys from lib/theme/fonts.ts */
  fonts: [string, string];
  mode?: Theme["mode"];
  radius?: string;
  density?: Theme["density"];
  type?: Partial<Theme["type"]>;
  ornaments?: Partial<Theme["ornaments"]>;
  motion?: Partial<Theme["motion"]>;
};

const PLAIN = { doubleRule: false, paperGrain: false, romanNumerals: false, dottedLeaders: false };

function preset(s: Spec): ThemePreset {
  const theme: Theme = {
    ...defaultTheme,
    mode: s.mode ?? "system",
    colors: { light: buildColors(s.light), dark: buildColors(s.dark) },
    fonts: { display: s.fonts[0], body: s.fonts[1] },
    type: { ...defaultTheme.type, ...s.type },
    radius: s.radius ?? defaultTheme.radius,
    density: s.density ?? defaultTheme.density,
    shadow: defaultTheme.shadow,
    motion: { ...defaultTheme.motion, ...s.motion },
    ornaments: { ...PLAIN, ...s.ornaments },
  };
  return { id: s.id, name: s.name, category: s.category, description: s.description, theme };
}

export const PRESETS: ThemePreset[] = [
  // ── Fine dining ────────────────────────────────────────────────────────────
  {
    id: "old-money",
    name: "Old Money",
    category: "fine-dining",
    description: "Parchment and bottle green by day, espresso and aged gold by night. The house style.",
    theme: defaultTheme,
  },
  preset({
    id: "bordeaux-brass",
    name: "Bordeaux & Brass",
    category: "fine-dining",
    description: "Deep wine and antique brass on warm ivory. Dinner at a grand hotel.",
    light: { bg: "#F6EFE6", fg: "#2A1A1C", primary: "#5B1626", ornament: "#9C7A3C", highlight: "#7A1F34" },
    dark: { bg: "#1A0F11", fg: "#EFE3D6", primary: "#C9A55B", ornament: "#B8924A", highlight: "#D98A98" },
    fonts: ["playfair-display", "libre-franklin"],
    ornaments: { doubleRule: true, romanNumerals: true, dottedLeaders: true, paperGrain: true },
  }),
  preset({
    id: "noir-etoile",
    name: "Noir Étoilé",
    category: "fine-dining",
    description: "Black lacquer, fine gold, wide-set capitals. Tasting-menu theatre.",
    light: { bg: "#F5F2EA", fg: "#111111", primary: "#111111", ornament: "#9A7B35", highlight: "#7A5C1A" },
    dark: { bg: "#0B0B0C", fg: "#EDE8DD", primary: "#D4B15F", ornament: "#C6A25A", highlight: "#D4B15F" },
    fonts: ["bodoni-moda", "jost"],
    mode: "dark",
    radius: "0rem",
    density: "spacious",
    type: { labelTracking: "0.32em", displayWeight: 500 },
    ornaments: { doubleRule: true, romanNumerals: true, dottedLeaders: true },
  }),
  preset({
    id: "ivory-atelier",
    name: "Ivory Atelier",
    category: "fine-dining",
    description: "Gallery-white, ink-black type and acres of air. Understated and expensive.",
    light: { bg: "#FBFAF7", fg: "#1A1A1A", primary: "#1A1A1A", ornament: "#8A8A8A", highlight: "#8A6D3B" },
    dark: { bg: "#121212", fg: "#F2F0EA", primary: "#F2F0EA", ornament: "#9A9A9A", highlight: "#C9AD7C" },
    fonts: ["cormorant-garamond", "manrope"],
    radius: "0rem",
    density: "spacious",
    type: { labelTracking: "0.28em", displayWeight: 400 },
    ornaments: { dottedLeaders: true },
  }),

  // ── Trattoria & bistro ─────────────────────────────────────────────────────
  preset({
    id: "trattoria-rossa",
    name: "Trattoria Rossa",
    category: "trattoria-bistro",
    description: "Terracotta, tomato and checked-tablecloth cream. Sunday lunch in Naples.",
    light: { bg: "#F7EBDD", fg: "#2B1D17", primary: "#B23A26", ornament: "#C98A2B", highlight: "#A12B1B" },
    dark: { bg: "#1F1410", fg: "#F3E3D0", primary: "#E0673F", ornament: "#D9A04A", highlight: "#F08A6A" },
    fonts: ["fraunces", "nunito"],
    radius: "0.375rem",
    type: { displayWeight: 600, labelTracking: "0.16em" },
    ornaments: { paperGrain: true, dottedLeaders: true },
  }),
  preset({
    id: "paris-bistro",
    name: "Parisian Bistro",
    category: "trattoria-bistro",
    description: "Navy, cream and a flash of café-awning red. Zinc bar, chalkboard specials.",
    light: { bg: "#F3EFE6", fg: "#1D2430", primary: "#1F3A5F", ornament: "#B08D57", highlight: "#A3262A" },
    dark: { bg: "#101621", fg: "#ECE6D8", primary: "#D7B979", ornament: "#C2A268", highlight: "#E27D7F" },
    fonts: ["playfair-display", "dm-sans"],
    ornaments: { doubleRule: true, dottedLeaders: true },
  }),
  preset({
    id: "olive-grove",
    name: "Olive Grove",
    category: "trattoria-bistro",
    description: "Silvery olive, linen and a little honey. Mediterranean and unhurried.",
    light: { bg: "#F1EFE0", fg: "#2A2A1C", primary: "#5F6B2E", ornament: "#A68B3A", highlight: "#8A4B2A" },
    dark: { bg: "#16180F", fg: "#E9E7D0", primary: "#A9B964", ornament: "#BFA34F", highlight: "#D79A6B" },
    fonts: ["lora", "nunito"],
    radius: "0.25rem",
    ornaments: { paperGrain: true, dottedLeaders: true },
  }),
  preset({
    id: "rustic-osteria",
    name: "Rustic Osteria",
    category: "trattoria-bistro",
    description: "Kraft paper, walnut brown and iron-gall ink. A farmhouse table.",
    light: { bg: "#EFE4D2", fg: "#3A2A1E", primary: "#7A4A2A", ornament: "#A67C3B", highlight: "#9A3B22" },
    dark: { bg: "#1C1510", fg: "#EBDDC6", primary: "#D9A46B", ornament: "#C49A5A", highlight: "#E08A66" },
    fonts: ["crimson-pro", "jost"],
    radius: "0.125rem",
    ornaments: { paperGrain: true, doubleRule: true, dottedLeaders: true },
  }),

  // ── Café ───────────────────────────────────────────────────────────────────
  preset({
    id: "flat-white",
    name: "Flat White",
    category: "cafe",
    description: "Milk-foam cream and espresso brown. Calm, soft-cornered, easy to read.",
    light: { bg: "#F7F3EC", fg: "#2E241D", primary: "#4A3426", ornament: "#A98C6A", highlight: "#8A4B2E" },
    dark: { bg: "#17120F", fg: "#EFE6DA", primary: "#D8B58E", ornament: "#B79A78", highlight: "#E3A07A" },
    fonts: ["fraunces", "dm-sans"],
    radius: "0.5rem",
  }),
  preset({
    id: "matcha-studio",
    name: "Matcha Studio",
    category: "cafe",
    description: "Whisked-tea green on rice-paper white. Fresh, light, a little Japanese.",
    light: { bg: "#F4F6EC", fg: "#1F2A1C", primary: "#4D6B3A", ornament: "#8FA66B", highlight: "#3F5B2E" },
    dark: { bg: "#121711", fg: "#E6ECD9", primary: "#A5C27F", ornament: "#86A065", highlight: "#BBD698" },
    fonts: ["outfit", "dm-sans"],
    mode: "light",
    radius: "0.75rem",
    type: { displayWeight: 500, labelTracking: "0.1em" },
  }),
  preset({
    id: "roastery",
    name: "Roastery",
    category: "cafe",
    description: "Burlap, dark roast and burnt orange. Third-wave coffee, condensed type.",
    light: { bg: "#EDE5DA", fg: "#231A14", primary: "#2E211A", ornament: "#C76A2B", highlight: "#B4531A" },
    dark: { bg: "#14100D", fg: "#EADFD1", primary: "#E08A3F", ornament: "#D17B33", highlight: "#F0A05E" },
    fonts: ["oswald", "dm-sans"],
    radius: "0.125rem",
    density: "compact",
    type: { displayWeight: 500, labelTracking: "0.16em" },
  }),
  preset({
    id: "rose-latte",
    name: "Rose Latte",
    category: "cafe",
    description: "Blush, dusty rose and soft serif. Brunch worth photographing.",
    light: { bg: "#FBF1EE", fg: "#3A2528", primary: "#A94B5C", ornament: "#C99A8E", highlight: "#A8465A" },
    dark: { bg: "#1E1416", fg: "#F5E4E1", primary: "#E0909F", ornament: "#C99A8E", highlight: "#EFA3B2" },
    fonts: ["cormorant-garamond", "nunito"],
    mode: "light",
    radius: "1rem",
    type: { displayWeight: 600 },
  }),

  // ── Bakery & dessert ───────────────────────────────────────────────────────
  preset({
    id: "croissant",
    name: "Croissant",
    category: "bakery-dessert",
    description: "Butter yellow, golden crust and cocoa. Warm from the oven.",
    light: { bg: "#FBF3E1", fg: "#3B2A1A", primary: "#C2762B", ornament: "#D8A24A", highlight: "#9C4A1C" },
    dark: { bg: "#1E160C", fg: "#F6E7C8", primary: "#E6A24D", ornament: "#D9A857", highlight: "#F0B070" },
    fonts: ["fraunces", "nunito"],
    mode: "light",
    radius: "0.625rem",
    type: { displayWeight: 600 },
    ornaments: { dottedLeaders: true },
  }),
  preset({
    id: "pistachio-patisserie",
    name: "Pistachio Pâtisserie",
    category: "bakery-dessert",
    description: "Pistachio cream with a raspberry-pink accent. A glass pastry counter.",
    light: { bg: "#F1F5E8", fg: "#2A3326", primary: "#5E7D3F", ornament: "#D49AA6", highlight: "#B24C68" },
    dark: { bg: "#141A12", fg: "#E9F0DC", primary: "#A8C686", ornament: "#E0A3B0", highlight: "#F0A8BC" },
    fonts: ["playfair-display", "dm-sans"],
    mode: "light",
    radius: "0.5rem",
    ornaments: { doubleRule: true },
  }),
  preset({
    id: "berry-tart",
    name: "Berry Tart",
    category: "bakery-dessert",
    description: "Raspberry, blackcurrant and powdered sugar. Playful but polished.",
    light: { bg: "#FAF0F2", fg: "#3A1F2E", primary: "#8E2A58", ornament: "#C98BA6", highlight: "#8E2A58" },
    dark: { bg: "#1D1019", fg: "#F6E3EC", primary: "#DB7FA8", ornament: "#C98BA6", highlight: "#F0A3C4" },
    fonts: ["bodoni-moda", "josefin-sans"],
    mode: "light",
    radius: "0.25rem",
    ornaments: { doubleRule: true, dottedLeaders: true },
  }),

  // ── Bar & lounge ───────────────────────────────────────────────────────────
  preset({
    id: "speakeasy",
    name: "Speakeasy",
    category: "bar-lounge",
    description: "Amber lamplight on dark oak, Roman capitals. Prohibition-era cocktails.",
    light: { bg: "#EFE3CB", fg: "#2A1D10", primary: "#6B4416", ornament: "#8F6A2A", highlight: "#8A3B16" },
    dark: { bg: "#100D0A", fg: "#EAD9B8", primary: "#C8923A", ornament: "#B07F2F", highlight: "#E0A850" },
    fonts: ["cinzel", "josefin-sans"],
    mode: "dark",
    radius: "0rem",
    type: { displayWeight: 600, labelTracking: "0.24em" },
    ornaments: { doubleRule: true, romanNumerals: true, paperGrain: true, dottedLeaders: true },
  }),
  preset({
    id: "neon-nights",
    name: "Neon Nights",
    category: "bar-lounge",
    description: "Ink-black with hot magenta and cyan. A late-night cocktail club.",
    light: { bg: "#F5F3FF", fg: "#1A1530", primary: "#A0149A", ornament: "#0B7F8C", highlight: "#0B7F8C" },
    dark: { bg: "#0B0A14", fg: "#ECEAFB", primary: "#FF4FD8", ornament: "#35E0F0", highlight: "#35E0F0" },
    fonts: ["space-grotesk", "dm-sans"],
    mode: "dark",
    radius: "0.25rem",
    type: { displayWeight: 600, labelTracking: "0.2em" },
  }),
  preset({
    id: "mezcal-smoke",
    name: "Mezcal Smoke",
    category: "bar-lounge",
    description: "Charred agave, clay and ember orange. Smoky, earthy, dim.",
    light: { bg: "#EFE4D8", fg: "#2B1E18", primary: "#A2441F", ornament: "#7E5A3C", highlight: "#A2441F" },
    dark: { bg: "#151110", fg: "#E8DCCB", primary: "#D0643A", ornament: "#A8704A", highlight: "#E6894F" },
    fonts: ["fraunces", "outfit"],
    mode: "dark",
    radius: "0.125rem",
    type: { displayWeight: 600 },
    ornaments: { paperGrain: true, dottedLeaders: true },
  }),

  // ── Seafood & coastal ──────────────────────────────────────────────────────
  preset({
    id: "amalfi-blue",
    name: "Amalfi Blue",
    category: "seafood-coastal",
    description: "Glazed-tile blue with a lemon-yellow accent. Terrace over the Tyrrhenian.",
    light: { bg: "#F4F8FB", fg: "#14283A", primary: "#1F5E96", ornament: "#D9A441", highlight: "#B4472A" },
    dark: { bg: "#0C1824", fg: "#E4EEF6", primary: "#6FB0E6", ornament: "#E0B35A", highlight: "#F0A06A" },
    fonts: ["playfair-display", "jost"],
    ornaments: { doubleRule: true, dottedLeaders: true },
  }),
  preset({
    id: "harbour-coral",
    name: "Harbour Coral",
    category: "seafood-coastal",
    description: "Deep teal, sand and coral. The fish market at first light.",
    light: { bg: "#FFF7F1", fg: "#12303F", primary: "#0F5C6E", ornament: "#E57A5C", highlight: "#B84A32" },
    dark: { bg: "#0A1E26", fg: "#E6F2F2", primary: "#5CC1CD", ornament: "#F08D70", highlight: "#F59B80" },
    fonts: ["lora", "montserrat"],
    radius: "0.375rem",
    type: { labelTracking: "0.16em" },
    ornaments: { dottedLeaders: true },
  }),

  // ── Casual & street food ───────────────────────────────────────────────────
  preset({
    id: "street-market",
    name: "Street Market",
    category: "casual-street",
    description: "Mustard, black and big condensed type. Stalls, steam and neon signs.",
    light: { bg: "#FFF3C9", fg: "#17140F", primary: "#1A1A1A", ornament: "#B87800", highlight: "#C42A1B" },
    dark: { bg: "#14120C", fg: "#FFF1C2", primary: "#FFC928", ornament: "#FFC928", highlight: "#FF6B57" },
    fonts: ["oswald", "montserrat"],
    radius: "0rem",
    density: "compact",
    type: { displayWeight: 700, labelTracking: "0.1em" },
    motion: { enabled: false },
  }),
  preset({
    id: "burger-joint",
    name: "Burger Joint",
    category: "casual-street",
    description: "Ketchup red, mustard and diner cream. Counter service, checkered floors.",
    light: { bg: "#FBF1DE", fg: "#261A10", primary: "#C62F1F", ornament: "#E3A21A", highlight: "#C62F1F" },
    dark: { bg: "#1B130C", fg: "#FBEBD0", primary: "#F05A3E", ornament: "#F2B33D", highlight: "#F5855C" },
    fonts: ["oswald", "dm-sans"],
    radius: "0.25rem",
    density: "compact",
    type: { displayWeight: 600, labelTracking: "0.12em" },
  }),
  preset({
    id: "masala-house",
    name: "Masala House",
    category: "casual-street",
    description: "Turmeric, saffron and maroon. Rich, warm and generous: tandoor and thali.",
    light: { bg: "#FBF0DC", fg: "#2B1810", primary: "#8C2B1B", ornament: "#D98E04", highlight: "#B3461F" },
    dark: { bg: "#1A0F0A", fg: "#F7E6C8", primary: "#F2A81D", ornament: "#E39A1E", highlight: "#F0825A" },
    fonts: ["playfair-display", "nunito"],
    radius: "0.25rem",
    type: { displayWeight: 600 },
    ornaments: { doubleRule: true, dottedLeaders: true },
  }),

  // ── Modern & minimal ───────────────────────────────────────────────────────
  preset({
    id: "paper-white",
    name: "Paper White",
    category: "modern-minimal",
    description: "Pure white, pure black, one typeface. Nothing between the diner and the food.",
    light: { bg: "#FFFFFF", fg: "#111111", primary: "#111111", ornament: "#767676", highlight: "#B3261E" },
    dark: { bg: "#0E0E0E", fg: "#F5F5F5", primary: "#F5F5F5", ornament: "#8C8C8C", highlight: "#FF8A80" },
    fonts: ["inter", "inter"],
    radius: "0.5rem",
    type: { displayWeight: 600, displayTracking: "-0.01em", labelTracking: "0.1em" },
    motion: { enabled: false },
  }),
  preset({
    id: "nordic-slate",
    name: "Nordic Slate",
    category: "modern-minimal",
    description: "Cool grey-blue and pale birch. Scandinavian calm.",
    light: { bg: "#F1F3F5", fg: "#1D2530", primary: "#3B5B7A", ornament: "#8FA3B5", highlight: "#3B5B7A" },
    dark: { bg: "#11161C", fg: "#E3E8EE", primary: "#8FB3D6", ornament: "#6F8AA5", highlight: "#8FB3D6" },
    fonts: ["libre-franklin", "inter"],
    radius: "0.375rem",
    density: "spacious",
    type: { displayWeight: 500, labelTracking: "0.16em" },
  }),
];

export const getPreset = (id: string | undefined | null) => PRESETS.find((p) => p.id === id);

/** Theme references stored on a restaurant: "preset:<id>" or "custom:<id>". */
export type ThemeRef = { kind: "preset" | "custom"; id: string };

export function parseThemeRef(ref: string | undefined | null): ThemeRef | null {
  if (!ref) return null;
  const i = ref.indexOf(":");
  if (i < 1) return null;
  const kind = ref.slice(0, i);
  const id = ref.slice(i + 1);
  return (kind === "preset" || kind === "custom") && id ? { kind, id } : null;
}

export const presetRef = (id: string) => `preset:${id}`;
export const customRef = (id: string) => `custom:${id}`;
