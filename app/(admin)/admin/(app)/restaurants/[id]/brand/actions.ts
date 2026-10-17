"use server";

import { revalidatePath } from "next/cache";
import { run } from "@/lib/actions";
import { requireStaff } from "@/lib/auth/session";
import { customThemes, restaurants } from "@/lib/db/platform";
import { NotFoundError, type ImageRef } from "@/lib/db/types";
import { revalidateMenu } from "@/lib/revalidate";
import { parseThemeRef, getPreset } from "@/lib/theme/presets";
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

/**
 * Restaurant look = a chosen theme (preset or custom; `null` = the house style) plus this restaurant's own tweaks.
 * Keeps the logo. `overrides` is the diff against the chosen theme.
 */
export async function saveBrandTheme(restaurantId: string, themeId: string | null, overrides: ThemeOverrides) {
  return run(async () => {
    const r = await load(restaurantId);
    const ref = parseThemeRef(themeId);
    if (themeId && !ref) throw new NotFoundError("Unknown theme");
    if (ref?.kind === "preset" && !getPreset(ref.id)) throw new NotFoundError("That theme no longer exists");
    if (ref?.kind === "custom" && !(await customThemes.get(ref.id))) throw new NotFoundError("That theme no longer exists");
    const brand = {
      logo: r.brand.logo ?? null,
      ...(ref ? { theme_id: `${ref.kind}:${ref.id}` } : {}),
      ...overridesToBrand(sanitizeOverrides(overrides)),
    };
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
