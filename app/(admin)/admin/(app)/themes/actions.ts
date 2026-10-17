"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { run } from "@/lib/actions";
import { requireStaff } from "@/lib/auth/session";
import { customThemes, restaurants } from "@/lib/db/platform";
import { ConflictError, NotFoundError } from "@/lib/db/types";
import { revalidateThemeUsers } from "@/lib/revalidate";
import { CATEGORY_KEYS, customRef } from "@/lib/theme/presets";
import { resolveTheme } from "@/lib/theme/resolve";

const input = z.object({
  name: z.string().trim().min(1, "Give the theme a name").max(60, "Keep the name under 60 characters"),
  category: z.string().refine((v) => (CATEGORY_KEYS as string[]).includes(v), "Choose a category"),
  theme: z.unknown(),
});
export type CustomThemeValues = z.input<typeof input>;

/** Whatever the editor sends, store a complete, validated Theme (invalid sections fall back to theme.config.ts). */
const clean = (v: CustomThemeValues) => {
  const p = input.parse(v);
  return { name: p.name, category: p.category, theme: resolveTheme(p.theme) };
};

const refresh = () => {
  revalidatePath("/admin/themes");
};

export async function createCustomTheme(values: CustomThemeValues) {
  await requireStaff();
  return run(async () => {
    const t = await customThemes.create(clean(values));
    refresh();
    return { id: t.id };
  });
}

export async function updateCustomTheme(id: string, values: CustomThemeValues) {
  await requireStaff();
  return run(async () => {
    const t = await customThemes.update(id, clean(values));
    await revalidateThemeUsers(customRef(t.id));
    refresh();
    revalidatePath(`/admin/themes/${id}`);
    return { id: t.id };
  });
}

export async function deleteCustomTheme(id: string) {
  await requireStaff();
  return run(async () => {
    const using = await restaurants.usingTheme(customRef(id));
    if (using.length) {
      const names = using.slice(0, 3).map((r) => r.slug).join(", ");
      throw new ConflictError(`In use by ${using.length} restaurant${using.length > 1 ? "s" : ""} (${names}${using.length > 3 ? ", …" : ""}). Switch them to another theme first.`);
    }
    await customThemes.remove(id);
    refresh();
  });
}

export async function duplicateCustomTheme(id: string) {
  await requireStaff();
  return run(async () => {
    const src = await customThemes.get(id);
    if (!src) throw new NotFoundError("Theme not found");
    const t = await customThemes.create({ name: `${src.name} copy`.slice(0, 60), category: src.category, theme: src.theme });
    refresh();
    return { id: t.id };
  });
}
