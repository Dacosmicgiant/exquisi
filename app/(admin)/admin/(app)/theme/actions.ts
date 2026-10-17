"use server";

import { revalidatePath } from "next/cache";
import { run } from "@/lib/actions";
import { requireStaff } from "@/lib/auth/session";
import { settings } from "@/lib/db/platform";
import { revalidatePlatformTheme } from "@/lib/revalidate";
import { sanitizeOverrides } from "@/lib/theme/resolve";
import type { ThemeOverrides } from "@/lib/theme/schema";

/** Platform theme: applies to the admin and, unless a restaurant overrides it, to every menu. */
export async function savePlatformTheme(overrides: ThemeOverrides) {
  await requireStaff();
  return run(async () => {
    await settings.setThemeOverrides(sanitizeOverrides(overrides));
    await revalidatePlatformTheme();
    revalidatePath("/admin", "layout");
  });
}
