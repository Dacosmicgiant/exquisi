/**
 * Database-backed translation service. Framework-agnostic (no next/*): callers such as
 * Server Actions pass `onChanged` to revalidate the static menu; scripts just run it.
 */
import { forTenant } from "@/lib/db/tenant";
import type { Restaurant } from "@/lib/db/types";
import { getLanguage } from "@/lib/i18n/languages";
import { getProvider } from "./index";
import type { TranslationProvider } from "./provider";
import { translateUnits } from "./run";
import type { GlossaryTerm } from "@/lib/db/types";
import { collectUnits, coverage, unitsToTranslate, type Snapshot, type Unit } from "./units";

export type TranslateSummary = {
  lang: string;
  status: "done" | "nothing" | "busy" | "failed";
  translated: number;
  failed: number;
  tokens: number;
  /** characters billed by a machine-translation API */
  chars: number;
  error?: string;
};

export type ServiceOptions = {
  provider?: TranslationProvider;
  /** also regenerate machine translations that are still fresh */
  force?: boolean;
  /** called after at least one unit was written (e.g. revalidate the static menu) */
  onChanged?: (restaurant: Restaurant) => void | Promise<void>;
};

/** Everything but the default language: those are the targets for a restaurant's enabled list. */
export const targetLanguages = (r: Restaurant) => r.enabled_languages.filter((l) => l !== r.default_language);

export async function translateLanguage(
  restaurantId: string,
  lang: string,
  opts: ServiceOptions = {},
): Promise<TranslateSummary> {
  const db = forTenant(restaurantId);
  const snap = await db.i18n.snapshot();
  const { restaurant } = snap;
  const base = { lang, translated: 0, failed: 0, tokens: 0, chars: 0 };

  if (lang === restaurant.default_language) return { ...base, status: "nothing" };
  if (getLanguage(lang).tier === "experimental" && restaurant.allow_experimental === false) {
    return { ...base, status: "failed", error: "Experimental languages are switched off for this restaurant" };
  }

  const glossary = restaurant.glossary ?? [];
  const todo = unitsToTranslate(collectUnits(snap), lang, glossary, { force: opts.force });
  if (!todo.length) return { ...base, status: "nothing" };

  const job = await db.i18n.jobs.acquire(lang, todo.length);
  if (!job) return { ...base, status: "busy" };

  try {
    let reported = 0;
    const provider = opts.provider ?? getProvider();
    const run = await translateUnits({
      units: todo,
      from: restaurant.default_language,
      to: lang,
      glossary,
      provider,
      onProgress: (done) => {
        const inc = done - reported;
        reported = done;
        if (inc > 0) void db.i18n.jobs.update(job.id, { done: inc });
      },
    });

    const ok = run.results.flatMap((r) => (r.ok ? [r] : []));
    const bad = run.results.flatMap((r) => (r.ok ? [] : [r]));
    const written = await db.i18n.applyMachine(
      lang,
      ok.map((r) => ({
        entity: r.unit.entity,
        entityId: r.unit.entityId,
        field: r.unit.field,
        text: r.text,
        h: r.h,
        model: r.model,
      })),
    );

    const tokens = run.usage.inputTokens + run.usage.outputTokens;
    const chars = run.usage.characters ?? 0;
    const transport = bad.find((b) => /^(rate_limit|config|timeout|http):/.test(b.reason));
    const status = ok.length === 0 && bad.length ? "failed" : "done";
    const error = bad.length ? `${bad.length} unit(s) left in ${restaurant.default_language}: ${bad[0].reason}` : undefined;
    await db.i18n.jobs.update(job.id, { failed_units: bad.length, tokens, chars });
    await db.i18n.jobs.finish(job.id, status === "failed" ? "failed" : "done", { error, model: run.models.join(",") });

    if (written > 0) await opts.onChanged?.(restaurant);
    return {
      lang,
      status: transport && ok.length === 0 ? "failed" : status,
      translated: written,
      failed: bad.length,
      tokens,
      chars,
      error,
    };
  } catch (e) {
    const message = (e as Error).message;
    await db.i18n.jobs.finish(job.id, "failed", { error: message });
    return { ...base, status: "failed", error: message };
  }
}

/** Translate a restaurant's enabled languages (or the given ones), one language at a time. */
export async function translateRestaurant(
  restaurantId: string,
  langs?: string[],
  opts: ServiceOptions = {},
): Promise<TranslateSummary[]> {
  const snap = await forTenant(restaurantId).i18n.snapshot();
  const targets = langs ?? targetLanguages(snap.restaurant);
  const provider = opts.provider ?? getProvider();
  const width = Math.max(1, provider.maxParallelLanguages ?? 1);
  const out: TranslateSummary[] = new Array(targets.length);
  let next = 0;
  // a few languages at a time for machine-translation APIs; one at a time for rate-limited LLMs
  await Promise.all(
    Array.from({ length: Math.min(width, targets.length) }, async () => {
      while (next < targets.length) {
        const i = next++;
        out[i] = await translateLanguage(restaurantId, targets[i], { ...opts, provider });
      }
    }),
  );
  return out;
}

export async function languageCoverage(snap: Snapshot, lang: string) {
  return coverage(collectUnits(snap), lang, snap.restaurant.glossary ?? []);
}

/** Why a restaurant has not been fully translated yet, in numbers the admin can show before spending anything. */
export function pendingWork(units: Unit[], langs: string[], glossary: GlossaryTerm[]) {
  let texts = 0;
  let characters = 0;
  let languagesToDo = 0;
  for (const lang of langs) {
    const todo = unitsToTranslate(units, lang, glossary);
    if (todo.length) languagesToDo++;
    texts += todo.length;
    characters += todo.reduce((n, u) => n + u.source.length, 0);
  }
  return { texts, characters, languagesToDo };
}
