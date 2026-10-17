import Link from "next/link";
import { BlurFade } from "@/components/ui/blur-fade";
import { NumberTicker } from "@/components/ui/number-ticker";
import type { AnalyticsSummary, DailyPoint, LanguageStat } from "@/lib/db/types";
import { getLanguage } from "@/lib/i18n/languages";

export type DishRow = { id: string; name: string; opens: number };

function Tile({ label, value, hint, delay }: { label: string; value: number; hint?: string; delay: number }) {
  return (
    <BlurFade delay={delay} className="bg-card p-6">
      <p className="label-caps text-[0.62rem] text-muted-foreground">{label}</p>
      <p className="font-numeric mt-3 text-5xl" data-value={value}>
        <NumberTicker value={value} />
      </p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </BlurFade>
  );
}

/** Daily bars as plain SVG: no chart library, themed via CSS variables. */
function DailyChart({ points }: { points: DailyPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.views));
  const W = 640;
  const H = 150;
  const bw = W / points.length;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H + 22}`} role="img" aria-label="Menu views per day" className="w-full">
        {[0.5, 1].map((f) => (
          <line key={f} x1={0} x2={W} y1={H - H * f} y2={H - H * f} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 4" />
        ))}
        {points.map((p, i) => {
          const h = (p.views / max) * H;
          return (
            <g key={p.date}>
              <title>{`${p.date}: ${p.views} views, ${p.plays} stories opened`}</title>
              <rect x={i * bw + bw * 0.18} y={H - h} width={bw * 0.64} height={Math.max(h, p.views ? 2 : 0)} fill="var(--chart-1)" rx={1} />
              {p.plays > 0 && <rect x={i * bw + bw * 0.18} y={H - (p.plays / max) * H} width={bw * 0.64} height={Math.max(2, (p.plays / max) * H)} fill="var(--chart-2)" rx={1} opacity={0.9} />}
            </g>
          );
        })}
        <line x1={0} x2={W} y1={H} y2={H} stroke="var(--border)" />
        <text x={0} y={H + 15} fontSize={10} fill="var(--muted-foreground)">{points[0]?.date.slice(5)}</text>
        <text x={W} y={H + 15} fontSize={10} fill="var(--muted-foreground)" textAnchor="end">{points[points.length - 1]?.date.slice(5)}</text>
      </svg>
      <figcaption className="mt-2 flex gap-5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5" style={{ background: "var(--chart-1)" }} /> Menu views</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5" style={{ background: "var(--chart-2)" }} /> Stories opened</span>
        <span className="ms-auto">peak {max}/day</span>
      </figcaption>
    </figure>
  );
}

export function AnalyticsView({
  restaurantId,
  days,
  summary,
  languages,
  dishes,
  daily,
}: {
  restaurantId: string;
  days: number;
  summary: AnalyticsSummary;
  languages: LanguageStat[];
  dishes: DishRow[];
  daily: DailyPoint[];
}) {
  const langTotal = languages.reduce((a, l) => a + l.views, 0) || 1;
  const empty = summary.menuViews === 0 && summary.languageSelects === 0;
  const readRate = summary.menuViews ? Math.round((summary.storyOpens / summary.menuViews) * 100) : 0;

  return (
    <div className="space-y-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-lg text-muted-foreground">Anonymous, aggregate numbers: no cookies, no personal data. A “view” is one menu opened in a language.</p>
        <div className="flex border" role="tablist" aria-label="Period">
          {[7, 30, 90].map((d) => (
            <Link key={d} href={`/admin/restaurants/${restaurantId}/analytics?days=${d}`} role="tab" aria-selected={d === days} className={`label-caps px-3.5 py-1.5 text-[0.62rem] ${d === days ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {d} days
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-px overflow-hidden border bg-border sm:grid-cols-2 lg:grid-cols-4" data-testid="tiles">
        <Tile label="Menu views" value={summary.menuViews} delay={0} />
        <Tile label="Visitors" value={summary.uniqueVisitors} hint="distinct sessions" delay={0.05} />
        <Tile label="Language picks" value={summary.languageSelects} hint="taps on the language screen" delay={0.1} />
        <Tile label="Stories opened" value={summary.storyOpens} hint={summary.menuViews ? `${readRate}% of views` : undefined} delay={0.15} />
      </div>

      {empty && (
        <p className="border border-dashed p-10 text-center text-muted-foreground">
          Nothing yet for the last {days} days. Scan a table QR code (or open the menu address) and the first numbers appear here within a moment.
        </p>
      )}

      <section>
        <h2 className="border-b pb-3 text-2xl">Menu views per day</h2>
        <div className="mt-5"><DailyChart points={daily} /></div>
      </section>

      <div className="grid gap-12 lg:grid-cols-2">
        <section data-testid="languages">
          <h2 className="border-b pb-3 text-2xl">Languages</h2>
          <ul className="mt-4 space-y-3">
            {languages.length === 0 && <li className="text-sm text-muted-foreground">No data yet.</li>}
            {languages.slice(0, 12).map((l) => {
              const L = getLanguage(l.language);
              const pct = Math.round((l.views / langTotal) * 100);
              return (
                <li key={l.language}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-lg" lang={l.language}>{L.native}</span>
                    <span className="font-numeric text-sm text-muted-foreground">{l.views} {l.views === 1 ? "view" : "views"} · {pct}%{L.tier === "experimental" ? " · experimental" : ""}</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-muted"><div className="h-full" style={{ width: `${Math.max(2, pct)}%`, background: "var(--chart-1)" }} /></div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">A language that diners pick but this restaurant hasn’t enabled is a good candidate to translate ahead of time.</p>
        </section>

        <section data-testid="stories">
          <h2 className="border-b pb-3 text-2xl">Most-opened stories</h2>
          <ol className="mt-4 divide-y">
            {dishes.length === 0 && <li className="py-3 text-sm text-muted-foreground">No stories opened yet.</li>}
            {dishes.slice(0, 10).map((d, i) => (
              <li key={d.id} className="flex items-baseline gap-4 py-3">
                <span className="font-numeric w-5 text-sm text-muted-foreground">{i + 1}</span>
                <span className="flex-1 font-display text-lg leading-tight">{d.name}</span>
                <span className="font-numeric text-sm">{d.opens}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
