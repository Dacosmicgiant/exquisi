"use server";

import { revalidatePath } from "next/cache";
import { run } from "@/lib/actions";
import { requireStaff } from "@/lib/auth/session";
import { restaurants } from "@/lib/db/platform";
import { forTenant } from "@/lib/db/tenant";
import { NotFoundError, ValidationError } from "@/lib/db/types";
import { revalidateMenu } from "@/lib/revalidate";
import { queueTranslationIfAuto } from "@/lib/translate/queue";
import { staffEdits, withClears } from "@/lib/translate/staff";
import { parseMenuText, type ImportRow } from "@/lib/import/parse";
import { parseYouTubeUrl } from "@/lib/media/youtube";
import { toMinor } from "@/lib/money";
import type { Tenant } from "@/lib/db/tenant";
import type { TxEntity } from "@/lib/db/types";
import { dishSchema, dishStorySchema, langMapSchema, type DishFormValues, type DishStoryValues } from "@/lib/validation";
import type { LangMap } from "@/lib/i18n";

/** Every mutation: staff check → tenant resolve → tenant-scoped write → rebuild menu + admin view. */
async function ctx(restaurantId: string) {
  await requireStaff();
  const restaurant = await restaurants.get(restaurantId);
  if (!restaurant) throw new NotFoundError("Restaurant not found");
  return { restaurant, db: forTenant(restaurant.id) };
}

/** Text a person typed in a non-default language is staff-owned: machine runs never overwrite it. */
async function recordStaffEdits(
  db: Tenant,
  entity: TxEntity,
  id: string,
  defaultLang: string,
  before: Record<string, LangMap | undefined>,
  after: Record<string, LangMap | undefined>,
) {
  const glossary = await db.i18n.glossary.get();
  for (const e of staffEdits({ defaultLang, before, after, glossary })) {
    await db.i18n.setStaff(entity, id, e.field, e.lang, e.text, e.h);
  }
}

async function done(_slug: string, restaurantId: string, translate = true) {
  await revalidateMenu(restaurantId);
  // new or changed source text → translate the restaurant's enabled languages in the background
  if (translate) await queueTranslationIfAuto(restaurantId);
  revalidatePath(`/admin/restaurants/${restaurantId}/menu`);
}

/**
 * Create, update or remove the written story attached to a dish, returning the dish's new story ids.
 * `input` undefined = the caller did not touch stories. No text and no video = no story (unlinked; deleted if no other dish uses it).
 * A pasted YouTube link is reduced to its video id; anything that is not a YouTube video link is refused.
 * Only the dish's first story is edited here; a story shared by several dishes changes for all of them.
 */
async function saveDishStory(
  db: Tenant,
  defaultLang: string,
  dishId: string,
  existingIds: string[],
  input: DishStoryValues | undefined,
): Promise<string[]> {
  if (!input) return existingIds;
  const { title, text, video_url } = dishStorySchema.parse(input);
  const youtubeId = video_url?.trim() ? parseYouTubeUrl(video_url) : null;
  if (video_url?.trim() && !youtubeId) throw new ValidationError("That is not a YouTube video link. Paste the video's address, e.g. https://youtu.be/…");
  const hasText = !!text[defaultLang]?.trim();
  const hasContent = hasText || !!youtubeId;
  if (title[defaultLang] && !hasContent) throw new ValidationError("A story needs its text or a video: write the story, or clear the title");
  const firstId = existingIds[0];

  if (!hasContent) {
    if (!firstId) return existingIds;
    const sharedWithOthers = (await db.dishes.list()).some((d) => d.id !== dishId && d.story_ids.includes(firstId));
    if (!sharedWithOthers) await db.stories.remove(firstId);
    return existingIds.slice(1);
  }

  const before = firstId ? await db.stories.get(firstId) : null;
  if (firstId && before) {
    await db.stories.update(firstId, { title: withClears(before.title, title), text_fallback: withClears(before.text_fallback, text), youtube_id: youtubeId });
    await recordStaffEdits(db, "story", firstId, defaultLang, { title: before.title, text_fallback: before.text_fallback }, { title, text_fallback: text });
    return existingIds;
  }
  const created = await db.stories.create({ title, text_fallback: text, video: null, youtube_id: youtubeId, poster: null, audio_tracks: [], subtitles: [], status: "live" });
  await recordStaffEdits(db, "story", created.id, defaultLang, {}, { title, text_fallback: text });
  return [created.id, ...existingIds];
}

function requireDefaultLang(map: LangMap, lang: string, what: string) {
  if (!map[lang]?.trim()) throw new ValidationError(`${what} is required in the default language`);
}

// ── categories ────────────────────────────────────────────────────────────
export async function addCategory(restaurantId: string, name: LangMap) {
  return run(async () => {
    const { restaurant, db } = await ctx(restaurantId);
    const parsed = langMapSchema.parse(name);
    requireDefaultLang(parsed, restaurant.default_language, "Category name");
    const cat = await db.categories.add(parsed);
    await done(restaurant.slug, restaurantId);
    return cat;
  });
}

export async function renameCategory(restaurantId: string, key: string, name: LangMap) {
  return run(async () => {
    const { restaurant, db } = await ctx(restaurantId);
    const parsed = langMapSchema.parse(name);
    requireDefaultLang(parsed, restaurant.default_language, "Category name");
    const before = (await db.categories.list()).find((c) => c.key === key);
    await db.categories.rename(key, withClears(before?.name, parsed));
    await recordStaffEdits(db, "category", key, restaurant.default_language, { name: before?.name }, { name: parsed });
    await done(restaurant.slug, restaurantId);
  });
}

export async function reorderCategories(restaurantId: string, keys: string[]) {
  return run(async () => {
    const { restaurant, db } = await ctx(restaurantId);
    await db.categories.reorder(keys);
    await done(restaurant.slug, restaurantId, false);
  });
}

export async function removeCategory(restaurantId: string, key: string) {
  return run(async () => {
    const { restaurant, db } = await ctx(restaurantId);
    await db.categories.remove(key);
    await done(restaurant.slug, restaurantId, false);
  });
}

// ── dishes ────────────────────────────────────────────────────────────────
export async function createDish(restaurantId: string, values: DishFormValues, story?: DishStoryValues) {
  return run(async () => {
    const { restaurant, db } = await ctx(restaurantId);
    const data = dishSchema.parse(values);
    requireDefaultLang(data.name, restaurant.default_language, "Dish name");
    const cats = await db.categories.list();
    if (!cats.some((c) => c.key === data.category)) throw new ValidationError("Unknown category");
    const dish = await db.dishes.create(data);
    await recordStaffEdits(db, "dish", dish.id, restaurant.default_language, {}, { name: data.name, description: data.description, context: data.context });
    const storyIds = await saveDishStory(db, restaurant.default_language, dish.id, [], story);
    if (storyIds.length) await db.dishes.update(dish.id, { story_ids: storyIds });
    await done(restaurant.slug, restaurantId);
    return { id: dish.id };
  });
}

export async function updateDish(restaurantId: string, dishId: string, values: DishFormValues, story?: DishStoryValues) {
  return run(async () => {
    const { restaurant, db } = await ctx(restaurantId);
    const data = dishSchema.parse(values);
    requireDefaultLang(data.name, restaurant.default_language, "Dish name");
    const cats = await db.categories.list();
    if (!cats.some((c) => c.key === data.category)) throw new ValidationError("Unknown category");
    const before = await db.dishes.get(dishId);
    // story links come from the database, never from the browser: a dialog opened before a story was added would
    // otherwise write its stale (empty) list back over the new link
    const storyIds = await saveDishStory(db, restaurant.default_language, dishId, before?.story_ids ?? [], story);
    await db.dishes.update(dishId, {
      ...data,
      story_ids: storyIds,
      name: withClears(before?.name, data.name),
      description: withClears(before?.description, data.description),
      context: withClears(before?.context, data.context),
    });
    await recordStaffEdits(
      db,
      "dish",
      dishId,
      restaurant.default_language,
      { name: before?.name, description: before?.description, context: before?.context },
      { name: data.name, description: data.description, context: data.context },
    );
    await done(restaurant.slug, restaurantId);
  });
}

export async function deleteDish(restaurantId: string, dishId: string) {
  return run(async () => {
    const { restaurant, db } = await ctx(restaurantId);
    await db.dishes.remove(dishId);
    await done(restaurant.slug, restaurantId, false);
  });
}

export async function setDishAvailability(restaurantId: string, dishId: string, available: boolean) {
  return run(async () => {
    const { restaurant, db } = await ctx(restaurantId);
    await db.dishes.setAvailability(dishId, available);
    await done(restaurant.slug, restaurantId, false);
  });
}

export async function reorderDishes(restaurantId: string, orderedIds: string[]) {
  return run(async () => {
    const { restaurant, db } = await ctx(restaurantId);
    await db.dishes.reorder(orderedIds);
    await done(restaurant.slug, restaurantId, false);
  });
}

/** Bulk-create categories and dishes from pasted rows (the setup-fee workflow). Source language only; translation follows. */
export async function importDishes(restaurantId: string, text: string) {
  return run(async () => {
    const { restaurant, db } = await ctx(restaurantId);
    const { rows, errors } = parseMenuText(text);
    if (!rows.length) throw new ValidationError(errors[0] ?? "Nothing to import");
    const lang = restaurant.default_language;
    const cats = await db.categories.list();
    const byName = new Map(cats.map((c) => [(c.name[lang] ?? "").trim().toLowerCase(), c.key]));
    let created = 0;
    let newCategories = 0;
    for (const row of rows as ImportRow[]) {
      const k = row.category.trim().toLowerCase();
      let key = byName.get(k);
      if (!key) {
        key = (await db.categories.add({ [lang]: row.category.trim() })).key;
        byName.set(k, key);
        newCategories++;
      }
      await db.dishes.create({
        category: key,
        name: { [lang]: row.name },
        description: row.description ? { [lang]: row.description } : {},
        context: {},
        spice_level: 0,
        dietary: [],
        price: toMinor(row.price, restaurant.currency),
        allergens: [],
        image: null,
        available: true,
        story_ids: [],
      });
      created++;
    }
    await done(restaurant.slug, restaurantId);
    return { created, newCategories, skipped: errors };
  });
}
