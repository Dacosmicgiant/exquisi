/**
 * Plain, serialisable record shapes. This is the ONLY lib/db module that UI
 * and route code may import types from; Mongoose models never leave lib/db.
 */
import type { LangMap } from "@/lib/i18n";
import type { ColorSet, ThemeOverrides } from "@/lib/theme/schema";

export type Provider = "cloudinary";
/** Images always store a reference, never a URL. */
export type ImageRef = { provider: Provider; public_id: string };
export type VideoRef = { provider: Provider; public_id: string; duration?: number };

/**
 * Translation provenance, keyed "field:lang" (e.g. "name:hi").
 * by "machine": generated, safe to regenerate. by "staff": hand-edited, NEVER overwritten.
 * h: hash of the source text (+ glossary) the entry was made from; a mismatch means stale.
 */
export type TxEntry = { by: "machine" | "staff"; h: string; m?: string; at: string };
export type TxMap = Record<string, TxEntry>;

/** "keep": never translated. "fixed": always rendered as fixed[lang] (falls back to keep). */
export type GlossaryTerm = { term: string; kind: "keep" | "fixed"; fixed?: LangMap; note?: string };

export type Category = { key: string; name: LangMap; order: number; tx?: TxMap };

export const DIETARY_KEYS = ["vegetarian", "vegan", "contains_pork", "contains_beef", "contains_alcohol"] as const;
export type DietaryKey = (typeof DIETARY_KEYS)[number];

export type Brand = {
  logo?: ImageRef | null;
  /** Partial colour overrides per mode, layered over the platform theme. */
  colors?: { light?: Partial<ColorSet>; dark?: Partial<ColorSet> };
  /** At most two fonts (keys from lib/theme/fonts.ts). */
  fonts?: { display?: string; body?: string };
  /** Everything else (radius, ornaments, mode, density, …). */
  theme?: Omit<ThemeOverrides, "colors" | "fonts">;
};

export type RestaurantStatus = "draft" | "live" | "archived";

export type Restaurant = {
  id: string;
  slug: string;
  name: LangMap;
  brand: Brand;
  default_language: string;
  enabled_languages: string[];
  currency: string;
  status: RestaurantStatus;
  plan: "standard";
  categories: Category[];
  glossary: GlossaryTerm[];
  /** Offer experimental-tier languages to diners (default true). */
  allow_experimental: boolean;
  /** Translate in the background whenever menu text changes (default false: translate on demand with one button). */
  auto_translate: boolean;
  tx?: TxMap;
  created_at: string;
  updated_at: string;
};

export type Dish = {
  id: string;
  restaurant_id: string;
  /** Category key (see Restaurant.categories). */
  category: string;
  name: LangMap;
  description: LangMap;
  /** "What to expect": short plain-language context for unfamiliar dishes. */
  context: LangMap;
  /** 0 = not spicy … 3 = very spicy. Fixed vocabulary, never machine-translated. */
  spice_level: number;
  dietary: string[];
  tx?: TxMap;
  /** Integer minor units (cents/paise) in the restaurant's currency. */
  price: number;
  allergens: string[];
  image: ImageRef | null;
  order: number;
  available: boolean;
  story_ids: string[];
};

export type AudioTrack = { lang: string; label: string; ref: ImageRef };
export type Subtitle = { lang: string; label: string; ref: ImageRef };
export type StoryStatus = "draft" | "live";

export type Story = {
  id: string;
  restaurant_id: string;
  source: "produced_by_us";
  title: LangMap;
  video: VideoRef | null;
  poster: ImageRef | null;
  /** The written dish story (shown on the menu). Name kept from the original schema. */
  text_fallback: LangMap;
  tx?: TxMap;
  audio_tracks: AudioTrack[];
  subtitles: Subtitle[];
  status: StoryStatus;
  created_at: string;
};

export type QrCode = {
  id: string;
  restaurant_id: string;
  code: string;
  label: string;
  created_at: string;
};

/** menu_view / language_select / story_open are live; story_play / story_complete are for the dormant films add-on. */
export type EventType = "menu_view" | "language_select" | "story_open" | "story_play" | "story_complete";

export type StaffUser = {
  id: string;
  email: string;
  role: string;
  restaurant_ids: string[];
};

export type DishInput = Omit<Dish, "id" | "restaurant_id" | "tx">;
export type StoryInput = Omit<Story, "id" | "restaurant_id" | "created_at" | "source" | "tx">;
export type RestaurantInput = Omit<
  Restaurant,
  "id" | "plan" | "categories" | "created_at" | "updated_at" | "tx" | "glossary" | "allow_experimental" | "auto_translate"
> & { glossary?: GlossaryTerm[]; allow_experimental?: boolean; auto_translate?: boolean };

export type JobStatus = "running" | "done" | "failed";
export type TranslationJob = {
  id: string;
  restaurant_id: string;
  lang: string;
  status: JobStatus;
  total: number;
  done: number;
  failed_units: number;
  tokens: number;
  /** characters billed by a machine-translation API (DeepL) */
  chars?: number;
  error?: string;
  model?: string;
  started_at: string;
  updated_at: string;
};

/** Entities whose text can be machine translated. */
export type TxEntity = "restaurant" | "category" | "dish" | "story";

export type AnalyticsSummary = {
  menuViews: number;
  uniqueVisitors: number;
  languageSelects: number;
  /** diners who opened a written dish story */
  storyOpens: number;
  storyPlays: number;
  storyCompletes: number;
  /** completes / plays, 0..1 */
  completionRate: number;
};

export type DishAnalytics = {
  dish_id: string;
  plays: number;
  completes: number;
  completionRate: number;
};

export type LanguageStat = { language: string; views: number; selects: number };
export type DishInterest = { dish_id: string; opens: number };

export type DailyPoint = { date: string; views: number; plays: number };

export class TenantError extends Error {}
export class ConflictError extends Error {}
export class NotFoundError extends Error {}
export class ValidationError extends Error {}
