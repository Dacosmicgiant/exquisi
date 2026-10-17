import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MenuView } from "@/components/diner/MenuView";
import { findLanguage } from "@/lib/i18n/languages";
import { getLiveMenu } from "@/lib/menu/data";
import { getRestaurantTheme } from "@/lib/theme/server";

// Statically generated and cached (ISR). Pages are created on first request and re-built when the
// admin edits content (revalidateMenu) or a translation finishes. Not pre-rendered at build time
// so a build never needs the database.
export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string; lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getLiveMenu(slug);
  const name = data?.restaurant.name[data.restaurant.default_language];
  return { title: name ? `${name} — Menu` : "Menu", robots: { index: false } };
}

export default async function MenuPage({ params }: Props) {
  const { slug, lang: raw } = await params;
  const L = findLanguage(decodeURIComponent(raw));
  if (!L) notFound();
  if (raw !== L.code) redirect(`/m/${slug}/${L.code}`);

  const data = await getLiveMenu(slug);
  if (!data) notFound();
  const { restaurant } = data;

  // Diners only ever READ translations that were generated and saved in the admin. A language the
  // restaurant does not offer has no page, and no translation call is ever made here.
  if (L.code !== restaurant.default_language) {
    if (!restaurant.enabled_languages.includes(L.code)) notFound();
    if (L.tier === "experimental" && restaurant.allow_experimental === false) notFound();
  }

  const theme = await getRestaurantTheme(restaurant.brand);
  return <MenuView data={data} lang={L.code} changeLanguageHref={`/m/${slug}`} numerals={theme.ornaments.romanNumerals} analytics />;
}
