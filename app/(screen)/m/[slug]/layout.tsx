import { ThemeHead } from "@/components/theme/ThemeHead";
import { getLiveMenu } from "@/lib/menu/data";
import { htmlMode } from "@/lib/theme/css";
import { getRestaurantTheme } from "@/lib/theme/server";
import "@/components/diner/diner.css";
import "../../../globals.css";

// Root layout of the language screen (its own root: it is shown before any language is chosen).
export default async function ScreenRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getLiveMenu(slug);
  const theme = await getRestaurantTheme(data?.restaurant.brand);
  return (
    <html lang={data?.restaurant.default_language ?? "en"} data-mode={htmlMode(theme)}>
      <head>
        <ThemeHead theme={theme} />
      </head>
      <body>{children}</body>
    </html>
  );
}
