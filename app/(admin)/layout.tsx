import type { Metadata } from "next";
import { ThemeHead } from "@/components/theme/ThemeHead";
import { modeScript } from "@/lib/theme/mode";
import { Toaster } from "@/components/ui/sonner";
import { getPlatformTheme } from "@/lib/theme/server";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "menu-stories · Atelier", template: "%s · menu-stories" },
  robots: { index: false, follow: false },
};

// Root layout for /admin. Reads the platform theme (cached, tag-invalidated).
export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getPlatformTheme();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeHead theme={theme} />
        <script dangerouslySetInnerHTML={{ __html: modeScript(theme.mode) }} />
      </head>
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
