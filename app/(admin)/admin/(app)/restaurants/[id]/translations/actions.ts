"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { run } from "@/lib/actions";
import { requireStaff } from "@/lib/auth/session";
import { restaurants } from "@/lib/db/platform";
import { forTenant } from "@/lib/db/tenant";
import { NotFoundError, ValidationError, type GlossaryTerm, type TxEntity } from "@/lib/db/types";
import { getLanguage, isKnownLanguage } from "@/lib/i18n/languages";
import { getProvider } from "@/lib/translate";
import { revalidateMenu } from "@/lib/revalidate";
import { sourceHash } from "@/lib/translate/provenance";
import { queueTranslation } from "@/lib/translate/queue";
import { collectUnits, unitId } from "@/lib/translate/units";

async function ctx(restaurantId: string) {
  await requireStaff();
  const restaurant = await restaurants.get(restaurantId);
  if (!restaurant) throw new NotFoundError("Restaurant not found");
  return { restaurant, db: forTenant(restaurant.id) };
}
const refresh = (id: string) => revalidatePath(`/admin/restaurants/${id}/translations`);

/** Start translating in the background. lang = one language, or omitted for all enabled ones. */
export async function translateNow(restaurantId: string, lang?: string, force = false) {
  return run(async () => {
    const { restaurant } = await ctx(restaurantId);
    if (lang && (!isKnownLanguage(lang) || lang === restaurant.default_language)) throw new ValidationError("Unknown language");
    queueTranslation(restaurant.id, { langs: lang ? [lang] : undefined, force });
    refresh(restaurantId);
  });
}

/** A person wrote (or cleared) a translation: it becomes staff-owned and is never overwritten. */
export async function saveTranslation(
  restaurantId: string,
  entity: TxEntity,
  entityId: string,
  field: string,
  lang: string,
  text: string,
) {
  return run(async () => {
    const { restaurant, db } = await ctx(restaurantId);
    if (!isKnownLanguage(lang) || lang === restaurant.default_language) throw new ValidationError("Unknown language");
    z.string().max(4000).parse(text);
    const snap = await db.i18n.snapshot();
    const unit = collectUnits(snap).find((u) => u.id === unitId(entity, entityId, field));
    if (!unit) throw new NotFoundError("That text no longer exists");
    await db.i18n.setStaff(entity, entityId, field, lang, text, sourceHash(unit.source, snap.restaurant.glossary ?? [], lang));
    await revalidateMenu(restaurant.id);
    // clearing hands the unit back to the machine
    if (!text.trim()) queueTranslation(restaurant.id, { langs: [lang] });
    refresh(restaurantId);
  });
}

const glossarySchema = z
  .array(
    z.object({
      term: z.string().trim().min(1).max(80),
      kind: z.enum(["keep", "fixed"]),
      fixed: z.record(z.string(), z.string().max(120)).optional(),
      note: z.string().max(200).optional(),
    }),
  )
  .max(200);

export async function saveGlossary(restaurantId: string, terms: GlossaryTerm[]) {
  return run(async () => {
    const { db } = await ctx(restaurantId);
    await db.i18n.glossary.set(glossarySchema.parse(terms));
    refresh(restaurantId);
  });
}

export async function setAllowExperimental(restaurantId: string, allow: boolean) {
  return run(async () => {
    const { restaurant } = await ctx(restaurantId);
    await restaurants.update(restaurant.id, { allow_experimental: allow });
    await revalidateMenu(restaurant.id);
    refresh(restaurantId);
  });
}

/**
 * THE one button. The admin ticks the languages the restaurant should offer and presses Generate: the
 * English (source) menu is translated into each, saved permanently (and stays editable), and exactly
 * those languages become the list diners see. Unticked languages disappear from the QR language screen;
 * their saved text is kept in case they are ticked again. Diners never trigger a translation call.
 */
export async function generateLanguages(restaurantId: string, selected: string[]) {
  return run(async () => {
    const { restaurant } = await ctx(restaurantId);
    const want = [...new Set(z.array(z.string().max(12)).max(300).parse(selected))].filter((c) => isKnownLanguage(c) && c !== restaurant.default_language);
    const provider = getProvider();
    const langs: string[] = [];
    const skipped: string[] = [];
    for (const l of want) ((await provider.supports?.(l)) === false ? skipped : langs).push(l);

    await restaurants.update(restaurant.id, { enabled_languages: [restaurant.default_language, ...langs] });
    // the language screen changes right away; the translations arrive in the background
    await revalidateMenu(restaurant.id);
    if (langs.length) queueTranslation(restaurant.id, { langs });
    refresh(restaurantId);
    return { languages: langs.length, skipped: skipped.map((c) => getLanguage(c).name) };
  });
}

/** Opt in (or out) of translating automatically whenever menu text changes. Off by default: no surprise API calls. */
export async function setAutoTranslate(restaurantId: string, on: boolean) {
  return run(async () => {
    const { restaurant } = await ctx(restaurantId);
    await restaurants.update(restaurant.id, { auto_translate: on });
    refresh(restaurantId);
  });
}
