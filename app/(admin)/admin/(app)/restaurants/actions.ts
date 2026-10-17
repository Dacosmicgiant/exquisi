"use server";

import { revalidatePath } from "next/cache";
import { run } from "@/lib/actions";
import { requireStaff } from "@/lib/auth/session";
import { restaurants } from "@/lib/db/platform";
import { forTenant } from "@/lib/db/tenant";
import { revalidateMenu } from "@/lib/revalidate";
import { queueTranslationIfAuto } from "@/lib/translate/queue";
import { staffEdits } from "@/lib/translate/staff";
import { restaurantSchema, type RestaurantFormValues } from "@/lib/validation";

export async function createRestaurant(values: RestaurantFormValues) {
  await requireStaff();
  return run(async () => {
    const data = restaurantSchema.parse(values);
    const created = await restaurants.create({ ...data, brand: {} });
    revalidatePath("/admin", "layout");
    return { id: created.id };
  });
}

export async function updateRestaurant(id: string, values: RestaurantFormValues) {
  await requireStaff();
  return run(async () => {
    const data = restaurantSchema.parse(values);
    const before = await restaurants.get(id);
    const updated = await restaurants.update(id, data);
    if (before) {
      const db = forTenant(id);
      for (const e of staffEdits({
        defaultLang: updated.default_language,
        before: { name: before.name },
        after: { name: data.name },
        glossary: await db.i18n.glossary.get(),
      })) {
        await db.i18n.setStaff("restaurant", id, e.field, e.lang, e.text, e.h);
      }
    }
    // rebuild the static menu under both the old and new slug
    await revalidateMenu(updated.id, before && before.slug !== updated.slug ? [before.slug] : []);
    revalidatePath("/admin", "layout");
    // a newly enabled language (or a renamed restaurant) needs translating
    await queueTranslationIfAuto(updated.id);
    return { id: updated.id };
  });
}
