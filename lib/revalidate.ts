import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { restaurants } from "@/lib/db/platform";
import { menuLanguages } from "@/lib/menu/data";
import { PLATFORM_THEME_TAG } from "@/lib/theme/server";

/**
 * Rebuild a restaurant's statically generated menu pages.
 *
 * NOTE: in this Next version only LITERAL page paths invalidate a cached page; layout-type and
 * route-pattern revalidation silently does nothing for these routes (verified against a production
 * build via the x-nextjs-cache header). So we invalidate the language screen and one page per
 * language the restaurant has. Pass `slug` explicitly to also clear an old address after a rename.
 */
export async function revalidateMenu(restaurantId: string, extraSlugs: string[] = []) {
  const m = await menuLanguages(restaurantId);
  if (!m) return;
  for (const slug of new Set([m.slug, ...extraSlugs])) {
    revalidatePath(`/m/${slug}`);
    for (const lang of m.langs) revalidatePath(`/m/${slug}/${lang}`);
  }
}

/** Platform theme changed: refresh the cached overrides and every restaurant's menu. */
export async function revalidatePlatformTheme() {
  revalidateTag(PLATFORM_THEME_TAG, { expire: 0 });
  revalidatePath("/");
  for (const r of await restaurants.list({ includeArchived: true })) await revalidateMenu(r.id);
}

/** A shared theme (custom) changed: rebuild the menus of every restaurant that starts from it. */
export async function revalidateThemeUsers(themeRef: string) {
  for (const r of await restaurants.usingTheme(themeRef)) await revalidateMenu(r.id);
}
