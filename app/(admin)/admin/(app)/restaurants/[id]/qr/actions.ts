"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { run } from "@/lib/actions";
import { requireStaff } from "@/lib/auth/session";
import { restaurants } from "@/lib/db/platform";
import { forTenant } from "@/lib/db/tenant";
import { NotFoundError } from "@/lib/db/types";

const label = z.string().trim().max(60);

async function tenant(restaurantId: string) {
  await requireStaff();
  const r = await restaurants.get(restaurantId);
  if (!r) throw new NotFoundError("Restaurant not found");
  return forTenant(r.id);
}

// Codes are never deleted or re-pointed: a printed QR must never break.
export async function createQr(restaurantId: string, rawLabel: string) {
  return run(async () => {
    const db = await tenant(restaurantId);
    const qr = await db.qrCodes.create(label.parse(rawLabel));
    revalidatePath(`/admin/restaurants/${restaurantId}/qr`);
    return { id: qr.id, code: qr.code };
  });
}

export async function renameQr(restaurantId: string, id: string, rawLabel: string) {
  return run(async () => {
    const db = await tenant(restaurantId);
    await db.qrCodes.rename(id, label.parse(rawLabel));
    revalidatePath(`/admin/restaurants/${restaurantId}/qr`);
  });
}
