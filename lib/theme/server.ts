import "server-only";
import { unstable_cache } from "next/cache";
import { customThemes, settings } from "@/lib/db/platform";
import type { Brand } from "@/lib/db/types";
import { PRESETS, categoryLabel, customRef, getPreset, parseThemeRef, presetRef } from "./presets";
import { resolveTheme } from "./resolve";
import type { Theme, ThemeOverrides } from "./schema";

export const PLATFORM_THEME_TAG = "platform-theme";

/** Platform-level overrides, cached; invalidated by the admin Theme editor. */
export const getPlatformOverrides = unstable_cache(
  async () => (await settings.getThemeOverrides()) ?? {},
  ["platform-theme-overrides"],
  { tags: [PLATFORM_THEME_TAG], revalidate: 3600 },
);

/** Fold a restaurant's brand ({colors, fonts, theme}) into one override layer. */
export function brandToOverrides(brand: Brand | undefined | null) {
  if (!brand) return {};
  return { ...(brand.theme ?? {}), colors: brand.colors, fonts: brand.fonts };
}

export async function getPlatformTheme(): Promise<Theme> {
  try {
    return resolveTheme(await getPlatformOverrides());
  } catch {
    // never let a DB hiccup take pages down: fall back to theme.config.ts
    return resolveTheme();
  }
}

/** The saved theme a restaurant starts from (a preset or a custom theme), as an override layer. Missing/unknown = none. */
export async function getThemeLayer(themeId: string | undefined | null): Promise<ThemeOverrides> {
  const ref = parseThemeRef(themeId);
  if (!ref) return {};
  if (ref.kind === "preset") return getPreset(ref.id)?.theme ?? {};
  try {
    return ((await customThemes.get(ref.id))?.theme as ThemeOverrides | undefined) ?? {};
  } catch {
    return {};
  }
}

/** house style (default + platform) < the restaurant's chosen theme < the restaurant's own tweaks */
export async function getRestaurantTheme(brand: Brand | undefined | null): Promise<Theme> {
  const layer = await getThemeLayer(brand?.theme_id);
  try {
    return resolveTheme(await getPlatformOverrides(), layer, brandToOverrides(brand));
  } catch {
    return resolveTheme(layer, brandToOverrides(brand));
  }
}

/** The resolved look of the chosen theme alone (what "reset to the theme" means in the editor). */
export async function getRestaurantBase(brand: Brand | undefined | null): Promise<Theme> {
  const layer = await getThemeLayer(brand?.theme_id);
  try {
    return resolveTheme(await getPlatformOverrides(), layer);
  } catch {
    return resolveTheme(layer);
  }
}

/** A theme as the gallery shows it: presets and custom themes in one shape. */
export type ThemeOption = {
  ref: string;
  name: string;
  category: string;
  categoryLabel: string;
  description: string;
  custom: boolean;
  theme: Theme;
};

export async function listThemeOptions(): Promise<{ presets: ThemeOption[]; custom: ThemeOption[] }> {
  const presets = PRESETS.map<ThemeOption>((p) => ({
    ref: presetRef(p.id),
    name: p.name,
    category: p.category,
    categoryLabel: categoryLabel(p.category),
    description: p.description,
    custom: false,
    theme: p.theme,
  }));
  let custom: ThemeOption[] = [];
  try {
    custom = (await customThemes.list()).map((c) => ({
      ref: customRef(c.id),
      name: c.name,
      category: c.category,
      categoryLabel: categoryLabel(c.category),
      description: "Custom theme",
      custom: true,
      // fill any gaps from theme.config.ts so a half-valid saved theme still renders
      theme: resolveTheme(c.theme),
    }));
  } catch {
    // the library is a convenience: never block the page
  }
  return { presets, custom };
}
