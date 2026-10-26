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
import { CategoryScript } from "@/components/diner/CategoryScript";
import type { Fx } from "@/lib/currency/rates";
import { FX_ATTRIBUTION } from "@/lib/currency/attribution";

/**
 * The diner menu body (server component, zero client JS). Used by the static public route and
 * by the admin preview. Original dish names are always shown; translations are secondary.
 */
export function MenuView({ data, lang, changeLanguageHref, numerals = true, analytics = false, fx = null }: { data: MenuData; lang: string; changeLanguageHref: string; numerals?: boolean; analytics?: boolean; fx?: Fx | null }) {
  const { restaurant, categories, dishes, stories } = data;
  const def = restaurant.default_language;
  const L = getLanguage(lang);
  const v = getVocab(lang);
  const translated = lang !== def;
  const experimental = translated && L.tier === "experimental";
  const rName = shown(restaurant.name, restaurant.tx, "name", lang, def);

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
        {sections.length > 0 && (
          <>
            <p className="prompt mb-8">{v.ui.prompt}</p>
            {/* categories start folded so the first screen is a short list of headings; opening one closes the others */}
            <div className="cats">
              {sections.map(({ c, items }, i) => {
                const cName = shown(c.name, c.tx, "name", lang, def);
                const original = c.name[def] ?? cName.text;
                return (
                  <details key={c.key} id={`cat-${c.key}`} name="menu-category" className="cat rise" open={sections.length === 1} style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}>
                    <summary>
                      {numerals && <span className="font-display min-w-[2.9rem] text-xl text-ornament" dir="ltr">{toRoman(i + 1)}.</span>}
                      <span className="min-w-0">
                        <h2 id={`c-${c.key}`} className="text-[1.7rem] leading-tight" lang={def} dir={getLanguage(def).dir}>
                          {original}
                        </h2>
                        {translated && cName.lang === lang && cName.text !== original && (
                          <span className="block text-sm text-muted-foreground italic">{cName.text}</span>
                        )}
                      </span>
                      <span className="cat-count font-numeric" dir="ltr" aria-label={String(items.length)}>{items.length}</span>
                    </summary>
                    <ul className="cards" aria-labelledby={`c-${c.key}`}>
                      {items.map((d) => {
                        const story = d.story_ids.map((id) => stories[id]).find(Boolean);
                        return <DishItem key={d.id} dish={d} restaurant={restaurant} story={story} lang={lang} fx={fx} />;
                      })}
                    </ul>
                  </details>
                );
              })}
            </div>
          </>
        )}
      </main>

      <footer className="mx-auto max-w-2xl px-6 pb-16 text-center">
        <div className="rule-hair mx-auto mb-6 max-w-[8rem]" />
        <p className="text-[0.85rem] leading-relaxed text-muted-foreground">{v.ui.askStaff}</p>
        {fx && (
          // the provider asks for attribution; a proper name and a date carry no words to translate
          <p className="mt-4 text-[0.7rem] text-muted-foreground/80" dir="ltr">
            {fx.from} → {fx.to} · {new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(fx.date))} ·{" "}
            <a href={FX_ATTRIBUTION.href} rel="noopener" className="underline underline-offset-2">{FX_ATTRIBUTION.name}</a>
          </p>
        )}
      </footer>
      <SpeakScript />
      <CategoryScript />
      {analytics && <AnalyticsBeacon slug={restaurant.slug} lang={lang} />}
    </div>
  );
}
