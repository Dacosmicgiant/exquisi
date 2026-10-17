import Link from "next/link";
import { DishItem } from "@/components/diner/DishItem";
import { MediaImage } from "@/lib/media/MediaImage";
import { getLanguage } from "@/lib/i18n/languages";
import { getVocab } from "@/lib/i18n/vocab";
import { shown } from "@/lib/menu/text";
import type { MenuData } from "@/lib/menu/data";
import { toRoman } from "@/lib/roman";
import { Flag } from "@/components/diner/Flag";
import { AnalyticsBeacon } from "@/components/diner/AnalyticsBeacon";
import { SpeakScript } from "@/components/diner/Speak";

/**
 * The diner menu body (server component, zero client JS). Used by the static public route and
 * by the admin preview. Original dish names are always shown; translations are secondary.
 */
export function MenuView({ data, lang, changeLanguageHref, numerals = true, analytics = false }: { data: MenuData; lang: string; changeLanguageHref: string; numerals?: boolean; analytics?: boolean }) {
  const { restaurant, categories, dishes, stories } = data;
  const def = restaurant.default_language;
  const L = getLanguage(lang);
  const v = getVocab(lang);
  const translated = lang !== def;
  const experimental = translated && L.tier === "experimental";
  const rName = shown(restaurant.name, restaurant.tx, "name", lang, def);

  let imageCount = 0;
  const sections = categories
    .map((c) => ({ c, items: dishes.filter((d) => d.category === c.key) }))
    .filter((s) => s.items.length > 0);

  return (
    <div dir={L.dir} lang={L.code} className="diner">
      <header className="mx-auto max-w-2xl px-6 pt-14 pb-8 text-center sm:pt-20">
        {restaurant.brand.logo ? (
          <MediaImage image={restaurant.brand.logo} alt={restaurant.name[def] ?? ""} width={320} height={160} crop={false} priority className="mx-auto h-20 w-auto object-contain" />
        ) : (
          <h1 className="text-[2.6rem] leading-[1.1] sm:text-5xl" lang={def} dir={getLanguage(def).dir}>
            {restaurant.name[def] ?? rName.text}
          </h1>
        )}
        {translated && rName.lang === lang && rName.text !== restaurant.name[def] && (
          <p className="mt-2 text-muted-foreground italic">{rName.text}</p>
        )}
        <div className="mx-auto mt-8 max-w-[14rem] rule-double" />
        <div className="mt-5 flex items-center justify-center gap-3">
          <Link href={changeLanguageHref} className="label-caps inline-flex items-center gap-2 text-[0.68rem] text-muted-foreground hover:text-foreground">
            <Flag code={L.flag} />
            {L.native} · {v.ui.changeLanguage}
          </Link>
        </div>
      </header>

      {translated && (
        <aside
          className={`mx-auto mb-8 max-w-2xl border px-4 py-3 text-center text-[0.8rem] leading-snug ${
            experimental ? "border-highlight/50 text-highlight" : "border-border text-muted-foreground"
          }`}
          role="note"
        >
          {experimental ? v.ui.experimental : v.ui.machine}
        </aside>
      )}

      <main className="mx-auto max-w-2xl px-6 pb-16">
        {sections.length === 0 && <p className="py-16 text-center text-muted-foreground">—</p>}
        {sections.map(({ c, items }, i) => {
          const cName = shown(c.name, c.tx, "name", lang, def);
          const original = c.name[def] ?? cName.text;
          return (
            <section key={c.key} className="rise mt-12 first:mt-0" style={{ animationDelay: `${Math.min(i, 5) * 70}ms` }} aria-labelledby={`c-${c.key}`}>
              <div className="flex items-baseline gap-4">
                {numerals && <span className="font-display text-xl text-ornament" dir="ltr">{toRoman(i + 1)}.</span>}
                <div className="min-w-0">
                  <h2 id={`c-${c.key}`} className="text-[1.9rem] leading-tight" lang={def} dir={getLanguage(def).dir}>
                    {original}
                  </h2>
                  {translated && cName.lang === lang && cName.text !== original && (
                    <p className="text-sm text-muted-foreground italic">{cName.text}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 rule-double" />
              <ul className="divide-y divide-border/70">
                {items.map((d) => {
                  const priority = !!d.image && imageCount++ < 2;
                  const story = d.story_ids.map((id) => stories[id]).find(Boolean);
                  return <DishItem key={d.id} dish={d} restaurant={restaurant} story={story} lang={lang} priority={priority} />;
                })}
              </ul>
            </section>
          );
        })}
      </main>

      <footer className="mx-auto max-w-2xl px-6 pb-16 text-center">
        <div className="rule-hair mx-auto mb-6 max-w-[8rem]" />
        <p className="text-[0.85rem] leading-relaxed text-muted-foreground">{v.ui.askStaff}</p>
      </footer>
      <SpeakScript />
      {analytics && <AnalyticsBeacon slug={restaurant.slug} lang={lang} />}
    </div>
  );
}
