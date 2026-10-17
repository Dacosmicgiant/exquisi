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
import { toMinor } from "@/lib/money";
import type { Tenant } from "@/lib/db/tenant";
import type { TxEntity } from "@/lib/db/types";
import { dishSchema, langMapSchema, type DishFormValues } from "@/lib/validation";
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
export async function createDish(restaurantId: string, values: DishFormValues) {
  return run(async () => {
    const { restaurant, db } = await ctx(restaurantId);
    const data = dishSchema.parse(values);
    requireDefaultLang(data.name, restaurant.default_language, "Dish name");
    const cats = await db.categories.list();
    if (!cats.some((c) => c.key === data.category)) throw new ValidationError("Unknown category");
    const dish = await db.dishes.create(data);
    await recordStaffEdits(db, "dish", dish.id, restaurant.default_language, {}, { name: data.name, description: data.description, context: data.context });
    await done(restaurant.slug, restaurantId);
    return { id: dish.id };
  });
}

export async function updateDish(restaurantId: string, dishId: string, values: DishFormValues) {
  return run(async () => {
    const { restaurant, db } = await ctx(restaurantId);
    const data = dishSchema.parse(values);
    requireDefaultLang(data.name, restaurant.default_language, "Dish name");
    const cats = await db.categories.list();
    if (!cats.some((c) => c.key === data.category)) throw new ValidationError("Unknown category");
    const before = await db.dishes.get(dishId);
    await db.dishes.update(dishId, {
      ...data,
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
