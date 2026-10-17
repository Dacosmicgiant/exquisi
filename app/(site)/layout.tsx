import type { Metadata } from "next";
import { ThemeHead } from "@/components/theme/ThemeHead";
import { htmlMode } from "@/lib/theme/css";
import { getPlatformTheme } from "@/lib/theme/server";
import "../globals.css";

export const metadata: Metadata = { title: "menu-stories" };

// Root layout for the (static) brand splash.
export default async function SiteRootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getPlatformTheme();
  return (
    <html lang="en" data-mode={htmlMode(theme)}>
      <head>
        <ThemeHead theme={theme} />
      </head>
      <body>{children}</body>
    </html>
  );
}
