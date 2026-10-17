import { ThemeHead } from "@/components/theme/ThemeHead";
import { findLanguage, getLanguage } from "@/lib/i18n/languages";
import { getLiveMenu } from "@/lib/menu/data";
import { htmlMode } from "@/lib/theme/css";
import { getRestaurantTheme } from "@/lib/theme/server";
import "@/components/diner/diner.css";
import "../../../../globals.css";

/**
 * Root layout of the translated menu. It is its own root so <html lang dir> is correct for the
 * diner's language (RTL for Arabic/Hebrew/Urdu) without any client JavaScript.
 */
export default async function MenuRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string; lang: string }>;
}) {
  const { slug, lang } = await params;
  const L = findLanguage(decodeURIComponent(lang)) ?? getLanguage("en");
  const data = await getLiveMenu(slug);
  const theme = await getRestaurantTheme(data?.restaurant.brand);
  return (
    <html lang={L.code} dir={L.dir} data-mode={htmlMode(theme)}>
      <head>
        <ThemeHead theme={theme} />
      </head>
      <body>{children}</body>
    </html>
  );
}
