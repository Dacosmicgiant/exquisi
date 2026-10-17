import "server-only";
import { cache } from "react";
import { restaurants } from "@/lib/db/platform";
import { forTenant } from "@/lib/db/tenant";
import { collectUnits } from "@/lib/translate/units";
import type { Category, Dish, Restaurant, Story } from "@/lib/db/types";

export type MenuData = {
  restaurant: Restaurant;
  categories: Category[];
  dishes: Dish[];
  /** by story id */
  stories: Record<string, Story>;
};

async function build(restaurant: Restaurant, opts: { preview?: boolean }): Promise<MenuData> {
  const db = forTenant(restaurant.id);
  const [categories, dishes, stories] = await Promise.all([
    db.categories.list(),
    db.dishes.list({ onlyAvailable: !opts.preview }),
    db.stories.list({ onlyLive: !opts.preview }),
  ]);
  return { restaurant, categories, dishes, stories: Object.fromEntries(stories.map((s) => [s.id, s])) };
}

/** Public menu: only live restaurants, available dishes, live stories. Not cached across requests (ISR does that). */
export async function loadMenu(slug: string): Promise<MenuData | null> {
  const restaurant = await restaurants.bySlug(slug);
  if (!restaurant || restaurant.status !== "live") return null;
  return build(restaurant, {});
}

/** De-duplicated within one render pass (layout + page both need it). */
export const getLiveMenu = cache(loadMenu);

/** Staff preview: any status, including unavailable dishes and draft stories. */
export async function loadMenuForPreview(restaurantId: string): Promise<MenuData | null> {
  const restaurant = await restaurants.get(restaurantId);
  return restaurant ? build(restaurant, { preview: true }) : null;
}

/**
 * Every language that may have a cached static page for this restaurant: the enabled ones plus any
 * language that has stored translations (on-demand languages persist theirs). Used to invalidate
 * the right pages, because only literal page paths invalidate reliably.
 */
export async function menuLanguages(restaurantId: string): Promise<{ slug: string; langs: string[] } | null> {
  const r = await restaurants.get(restaurantId);
  if (!r) return null;
  const snap = await forTenant(r.id).i18n.snapshot();
  const langs = new Set<string>([r.default_language, ...r.enabled_languages]);
  for (const u of collectUnits(snap)) for (const l of Object.keys(u.map)) langs.add(l);
  return { slug: r.slug, langs: [...langs] };
}
