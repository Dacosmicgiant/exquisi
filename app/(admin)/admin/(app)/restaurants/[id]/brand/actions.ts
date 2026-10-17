"use server";

import { revalidatePath } from "next/cache";
import { run } from "@/lib/actions";
import { requireStaff } from "@/lib/auth/session";
import { restaurants } from "@/lib/db/platform";
import { NotFoundError, type ImageRef } from "@/lib/db/types";
import { revalidateMenu } from "@/lib/revalidate";
import { overridesToBrand } from "@/lib/theme/overrides";
import { sanitizeOverrides } from "@/lib/theme/resolve";
import type { ThemeOverrides } from "@/lib/theme/schema";
import { imageRefSchema } from "@/lib/validation";

async function load(id: string) {
  await requireStaff();
  const r = await restaurants.get(id);
  if (!r) throw new NotFoundError("Restaurant not found");
  return r;
}

/** Restaurant-specific look, layered over the platform theme. Keeps the logo. */
export async function saveBrandTheme(restaurantId: string, overrides: ThemeOverrides) {
  return run(async () => {
    const r = await load(restaurantId);
    const brand = { logo: r.brand.logo ?? null, ...overridesToBrand(sanitizeOverrides(overrides)) };
    await restaurants.update(r.id, { brand });
    await revalidateMenu(r.id);
    revalidatePath(`/admin/restaurants/${restaurantId}/brand`);
  });
}

export async function saveLogo(restaurantId: string, logo: ImageRef | null) {
  return run(async () => {
    const r = await load(restaurantId);
    const clean = logo ? imageRefSchema.parse(logo) : null;
    await restaurants.update(r.id, { brand: { ...r.brand, logo: clean } });
    await revalidateMenu(r.id);
    revalidatePath(`/admin/restaurants/${restaurantId}/brand`);
  });
}
