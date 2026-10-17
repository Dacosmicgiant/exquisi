import type { Dish, Restaurant, Story } from "@/lib/db/types";
import { getLanguage } from "@/lib/i18n/languages";
import type { Fx } from "@/lib/currency/rates";
import { convertMajor, currencySymbol, formatApprox, formatPlain } from "@/lib/money";
import { MediaImage } from "@/lib/media/MediaImage";
import { getVocab } from "@/lib/i18n/vocab";
import { shown, type Shown } from "@/lib/menu/text";
import { SpeakButton } from "@/components/diner/Speak";

/** A span that declares its own language when it had to fall back to the source text. */
function T({ s, pageLang }: { s: Shown; pageLang: string }) {
  return s.lang === pageLang ? <>{s.text}</> : <span lang={s.lang} dir={getLanguage(s.lang).dir}>{s.text}</span>;
}

export function DishItem({
  dish,
  restaurant,
  story,
  lang,
  priority,
  fx = null,
}: {
  dish: Dish;
  restaurant: Restaurant;
  story?: Story;
  lang: string;
  priority?: boolean;
  /** approximate price in the diner's home currency, when the restaurant shows one */
  fx?: Fx | null;
}) {
  const def = restaurant.default_language;
  const v = getVocab(lang);
  const name = shown(dish.name, dish.tx, "name", lang, def);
  const original = (dish.name[def] ?? name.text).trim();
  const translatedName = lang !== def && name.lang === lang && name.text !== original ? name : null;
  const desc = shown(dish.description, dish.tx, "description", lang, def);
  const ctx = shown(dish.context, dish.tx, "context", lang, def);
  const sTitle = story ? shown(story.title, story.tx, "title", lang, def) : null;
  const sBody = story ? shown(story.text_fallback, story.tx, "text_fallback", lang, def) : null;
  // dish names are pronounced in the language they are written in (an English menu of Italian dishes → Italian voice)
  const nameLang = restaurant.dish_name_language || def;
  const listen = v.ui.listen;
  const hot = dish.spice_level > 0 ? v.spice[Math.min(3, dish.spice_level) - 1] : null;
  const dietary = dish.dietary.filter((k) => k in v.dietary) as (keyof typeof v.dietary)[];

  return (
    <li className="py-7">
      <div className="flex items-start gap-5">
        <div className="min-w-0 flex-1">
          {/* original name is ALWAYS shown, in the source language */}
          <div className="leader">
            <h3 className="text-[1.45rem] leading-tight" lang={def} dir={getLanguage(def).dir}>
              {original}
              <SpeakButton text={original} lang={nameLang} label={listen} />
            </h3>
            <span className="fill" aria-hidden="true" />
            <span className="font-numeric text-[1.05rem] whitespace-nowrap text-highlight" dir="ltr">
              {currencySymbol(restaurant.currency)}
              {formatPlain(dish.price, restaurant.currency)}
            </span>
          </div>

          {fx && dish.price > 0 && (
            <p className="-mt-0.5 text-end text-[0.8rem] text-muted-foreground" title={`${fx.from} → ${fx.to}`}>
              <span dir="ltr">≈ {formatApprox(convertMajor(dish.price, fx.from, fx.rate), fx.to, lang)}</span>
            </p>
          )}

          {translatedName && (
            <p className="mt-0.5 text-[0.95rem] text-muted-foreground italic">
              <T s={translatedName} pageLang={lang} />
            </p>
          )}

          {desc.text && (
            <p className="mt-2 text-[0.97rem] leading-relaxed">
              <T s={desc} pageLang={lang} />
              <SpeakButton text={[desc.text, ctx.lang === desc.lang ? ctx.text : ""].filter(Boolean).join(". ")} lang={desc.lang} label={listen} />
            </p>
          )}
          {ctx.text && (
            <p className="mt-1.5 text-[0.9rem] leading-relaxed text-muted-foreground">
              <T s={ctx} pageLang={lang} />
            </p>
          )}

          {(hot || dietary.length > 0 || dish.allergens.length > 0) && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={v.ui.allergens}>
              {hot && (
                <li className="chip chip-warn" title={hot}>
                  <span aria-hidden="true" className="tracking-[0.1em]">
                    {"●".repeat(dish.spice_level)}
                    <span className="opacity-25">{"●".repeat(3 - dish.spice_level)}</span>
                  </span>
                  {hot}
                </li>
              )}
              {dietary.map((k) => (
                <li key={k} className={`chip ${k.startsWith("contains") ? "chip-warn" : ""}`}>
                  {v.dietary[k]}
                </li>
              ))}
              {dish.allergens.map((a) => (
                <li key={a} className="chip" lang={v.fallback ? "en" : undefined}>
                  {v.allergens[a as keyof typeof v.allergens] ?? a}
                </li>
              ))}
            </ul>
          )}

          {story && sBody?.text && (
            <details className="story mt-4" data-dish={dish.id}>
              <summary className="label-caps">{v.ui.story}</summary>
              <div className="body">
                {sTitle?.text && (
                  <p className="font-display text-lg leading-snug">
                    <T s={sTitle} pageLang={lang} />
                  </p>
                )}
                <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">
                  <T s={sBody} pageLang={lang} />
                  <SpeakButton text={[sTitle?.text, sBody.text].filter(Boolean).join(". ")} lang={sBody.lang} label={listen} />
                </p>
              </div>
            </details>
          )}
        </div>

        {dish.image && (
          <div className="shrink-0 overflow-hidden border border-border/80 shadow-soft">
            <MediaImage image={dish.image} alt="" width={176} height={176} sizes="88px" priority={priority} className="size-[88px] object-cover sm:size-[104px]" />
          </div>
        )}
      </div>
    </li>
  );
}
