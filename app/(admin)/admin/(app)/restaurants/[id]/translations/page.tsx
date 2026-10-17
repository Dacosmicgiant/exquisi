import { notFound } from "next/navigation";
import { TranslationsManager, type ReviewUnit, type LangRow, type LangChoice } from "@/components/admin/TranslationsManager";
import { restaurants } from "@/lib/db/platform";
import { forTenant } from "@/lib/db/tenant";
import { getLanguage } from "@/lib/i18n/languages";
import { collectUnits, coverage, stateOf, type Unit } from "@/lib/translate/units";
import { getProvider } from "@/lib/translate";
import { pendingWork } from "@/lib/translate/service";
import { CATALOG } from "@/lib/i18n/languages";

export const metadata = { title: "Translations" };

// "Generate" runs in the background (Next `after`) under this page's time limit. Hobby allows up to 300s;
// raise it (Pro: up to 800) for very large jobs. A run that is cut off is safe to repeat: only missing text is translated.
export const maxDuration = 300;

const label = (u: Unit, snap: Awaited<ReturnType<ReturnType<typeof forTenant>["i18n"]["snapshot"]>>) => {
  const def = snap.restaurant.default_language;
  const who =
    u.entity === "dish"
      ? snap.dishes.find((d) => d.id === u.entityId)?.name[def]
      : u.entity === "story"
        ? snap.stories.find((s) => s.id === u.entityId)?.title[def]
        : u.entity === "category"
          ? snap.restaurant.categories.find((c) => c.key === u.entityId)?.name[def]
          : snap.restaurant.name[def];
  return { group: u.entity, who: who ?? "", field: u.field };
};

export default async function TranslationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await restaurants.get(id);
  if (!r) notFound();
  const db = forTenant(r.id);
  const [snap, jobs] = await Promise.all([db.i18n.snapshot(), db.i18n.jobs.latest()]);
  const units = collectUnits(snap);
  const glossary = snap.restaurant.glossary ?? [];
  const targets = r.enabled_languages.filter((l) => l !== r.default_language);

  const rows: LangRow[] = targets.map((code) => {
    const L = getLanguage(code);
    const cov = coverage(units, code, glossary);
    const job = jobs.find((j) => j.lang === code);
    return {
      code,
      native: L.native,
      name: L.name,
      dir: L.dir,
      tier: L.tier,
      engine: L.engine,
      percent: cov.percent,
      counts: cov.counts,
      job: job ? { status: job.status, done: job.done, total: job.total, tokens: job.tokens, chars: job.chars ?? 0, failed: job.failed_units, error: job.error, updated_at: job.updated_at, model: job.model } : null,
    };
  });

  const review: ReviewUnit[] = units.map((u) => {
    const l = label(u, snap);
    return {
      id: u.id,
      entity: u.entity,
      entityId: u.entityId,
      field: u.field,
      group: l.group,
      who: l.who,
      kind: u.kind,
      source: u.source,
      byLang: Object.fromEntries(
        targets.map((code) => [code, { text: u.map[code] ?? "", state: stateOf(u, code, glossary), by: u.tx?.[`${u.field}:${code}`]?.by ?? null }]),
      ),
    };
  });

  const sourceChars = units.reduce((n, u) => n + u.source.length, 0);
  let provider: ReturnType<typeof getProvider> | null = null;
  try {
    provider = getProvider();
  } catch {}
  const providerName = provider?.name ?? "unconfigured";
  // The checklist lists EVERY language the engine can translate into (all of DeepL's), with the work each needs.
  const choices: LangChoice[] = [];
  for (const l of CATALOG) {
    if (l.code === r.default_language) continue;
    if ((await provider?.supports?.(l.code)) === false) continue;
    const w = pendingWork(units, [l.code], glossary);
    choices.push({ code: l.code, name: l.name, native: l.native, dir: l.dir, tier: l.tier, offered: r.enabled_languages.includes(l.code), texts: w.texts, characters: w.characters });
  }
  const unsupported = CATALOG.filter((l) => l.code !== r.default_language).length - choices.length;
  const waiting = pendingWork(units, targets, glossary);

  return (
    <TranslationsManager
      providerName={providerName}
      sourceChars={sourceChars}
      autoTranslate={r.auto_translate === true}
      choices={choices}
      unsupported={unsupported}
      waiting={waiting}
      restaurantId={r.id}
      defaultLang={r.default_language}
      defaultNative={getLanguage(r.default_language).native}
      allowExperimental={r.allow_experimental !== false}
      rows={rows}
      review={review}
      glossary={glossary}
    />
  );
}
