import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { MenuView } from "@/components/diner/MenuView";
import { findLanguage, getLanguage } from "@/lib/i18n/languages";
import { loadMenuForPreview } from "@/lib/menu/data";
import { fontFaceCss, themeToScopedCss } from "@/lib/theme/css";
import { getRestaurantTheme } from "@/lib/theme/server";
import "@/components/diner/diner.css";

export const metadata = { title: "Preview" };

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; mode?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const data = await loadMenuForPreview(id);
  if (!data) notFound();
  const { restaurant } = data;
  const lang = findLanguage(sp.lang)?.code ?? restaurant.default_language;
  const mode = sp.mode === "dark" ? "dark" : "light";
  const theme = await getRestaurantTheme(restaurant.brand);
  const link = (l: string, m: string) => `/admin/restaurants/${id}/preview?lang=${l}&mode=${m}`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-sm text-muted-foreground">
          Exactly what a diner will see, including draft films and unavailable dishes, using the translations as currently stored.
          {restaurant.status !== "live" && " This restaurant is not live yet, so the public address shows “Menu unavailable”."}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {restaurant.enabled_languages.map((l) => (
            <Link
              key={l}
              href={link(l, mode)}
              className={`label-caps border px-2.5 py-1 text-[0.62rem] ${l === lang ? "border-ornament text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
              lang={l}
            >
              {getLanguage(l).native}
            </Link>
          ))}
          <Link href={link(lang, mode === "dark" ? "light" : "dark")} className="label-caps border border-border px-2.5 py-1 text-[0.62rem] text-muted-foreground hover:text-foreground">
            {mode === "dark" ? "Light" : "Dark"}
          </Link>
          {restaurant.status === "live" && (
            <Link href={`/m/${restaurant.slug}/${lang}`} target="_blank" className="label-caps inline-flex items-center gap-1 px-2 py-1 text-[0.62rem] text-muted-foreground hover:text-foreground">
              Public page <ExternalLink className="size-3" />
            </Link>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: fontFaceCss(theme) + themeToScopedCss(theme, ".pv") }} />
      <div className="pv mx-auto max-w-3xl border shadow-soft" data-mode={mode} style={{ contain: "layout paint", position: "relative" }}>
        <MenuView data={data} lang={lang} changeLanguageHref="#" numerals={theme.ornaments.romanNumerals} />
      </div>
    </div>
  );
}
