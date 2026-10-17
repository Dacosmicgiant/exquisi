import "server-only";
import { unstable_cache } from "next/cache";
import { settings } from "@/lib/db/platform";
import type { Brand } from "@/lib/db/types";
import { resolveTheme } from "./resolve";
import type { Theme } from "./schema";

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

export async function getRestaurantTheme(brand: Brand | undefined | null): Promise<Theme> {
  try {
    return resolveTheme(await getPlatformOverrides(), brandToOverrides(brand));
  } catch {
    return resolveTheme(brandToOverrides(brand));
  }
}
