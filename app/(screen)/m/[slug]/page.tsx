import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LanguagePicker, type LangLite } from "@/components/diner/LanguagePicker";
import { MediaImage } from "@/lib/media/MediaImage";
import { CATALOG, getLanguage } from "@/lib/i18n/languages";
import { getVocab } from "@/lib/i18n/vocab";
import { getLiveMenu } from "@/lib/menu/data";

// Static language screen: the first thing a diner sees after scanning the QR code.
export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getLiveMenu(slug);
  return { title: data ? data.restaurant.name[data.restaurant.default_language] : "Menu", robots: { index: false } };
}

const lite = (code: string): LangLite => {
  const l = getLanguage(code);
  return { code: l.code, name: l.name, native: l.native, dir: l.dir, tier: l.tier, flag: l.flag };
};

export default async function LanguageScreen({ params }: Props) {
  const { slug } = await params;
  const data = await getLiveMenu(slug);
  if (!data) notFound();
  const { restaurant } = data;
  const def = restaurant.default_language;

  const allowExperimental = restaurant.allow_experimental !== false;
  // Every language the restaurant offers, nothing hidden: the source language first, then the
  // well-supported ones, then the rest (catalog order). The picker adds search on top.
  const order = new Map(CATALOG.map((l, i) => [l.code, i]));
  const offered = [def, ...restaurant.enabled_languages.filter((l) => l !== def)]
    .filter((c, i, all) => all.indexOf(c) === i)
    .filter((c) => c === def || allowExperimental || getLanguage(c).tier !== "experimental")
    .sort((a, b) => (a === def ? -1 : b === def ? 1 : (order.get(a) ?? 999) - (order.get(b) ?? 999)))
    .map(lite);

  const heading = getVocab(def).ui.chooseLanguage;
  const english = getVocab("en").ui.chooseLanguage;

  return (
    <div className="diner">
      <main className="mx-auto max-w-xl px-6 pt-14 pb-20 sm:pt-20">
        <header className="text-center">
          {restaurant.brand.logo ? (
            <MediaImage image={restaurant.brand.logo} alt={restaurant.name[def] ?? ""} width={320} height={160} crop={false} priority className="mx-auto h-16 w-auto object-contain" />
          ) : (
            <h1 className="text-4xl leading-tight sm:text-5xl" lang={def}>
              {restaurant.name[def]}
            </h1>
          )}
          <div className="mx-auto mt-7 max-w-[12rem] rule-double" />
          <p className="label-caps mt-6 text-ornament">{english}</p>
          {heading !== english && (
            <p className="mt-1 text-lg text-muted-foreground" lang={def}>
              {heading}
            </p>
          )}
        </header>
        <LanguagePicker slug={slug} languages={offered} />
      </main>
    </div>
  );
}
