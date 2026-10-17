import "server-only";
import { after } from "next/server";
import { restaurants } from "@/lib/db/platform";
import { revalidateMenu } from "@/lib/revalidate";
import { translateLanguage, translateRestaurant } from "./service";

/**
 * Run translation after the response is sent (Next `after`), so the click returns instantly.
 * Only missing/stale units are translated; staff-edited text is never touched. Progress and
 * failures are recorded in `translation_jobs` and shown in the admin.
 *
 * This is the EXPLICIT path (the admin pressed a button). Edits go through queueTranslationIfAuto.
 */
export function queueTranslation(restaurantId: string, opts: { langs?: string[]; force?: boolean } = {}) {
  after(async () => {
    try {
      const onChanged = (r: { id: string }) => revalidateMenu(r.id);
      if (opts.langs?.length === 1) await translateLanguage(restaurantId, opts.langs[0], { force: opts.force, onChanged });
      else await translateRestaurant(restaurantId, opts.langs, { force: opts.force, onChanged });
    } catch (e) {
      console.error("[translate] background run failed", e);
    }
  });
}

/**
 * After a menu edit: translate in the background ONLY if the restaurant opted in (auto_translate).
 * The default is off, so editing never spends API calls; staff press "Generate translations" once.
 */
export async function queueTranslationIfAuto(restaurantId: string) {
  const r = await restaurants.get(restaurantId);
  if (r?.auto_translate) queueTranslation(restaurantId);
}
