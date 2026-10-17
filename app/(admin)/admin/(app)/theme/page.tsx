import { PageHeader } from "@/components/admin/PageHeader";
import { ThemeEditor } from "@/components/admin/ThemeEditor";
import { getPlatformTheme } from "@/lib/theme/server";
import { defaultTheme } from "@/theme/theme.config";
import { savePlatformTheme } from "./actions";

export const metadata = { title: "Theme" };

export default async function ThemePage() {
  const initial = await getPlatformTheme();
  return (
    <>
      <PageHeader
        eyebrow="Appearance"
        title="Theme"
        description="The house style behind the admin and every menu. Defaults live in theme/theme.config.ts; whatever you save here layers on top. A restaurant’s Brand tab can override it again."
      />
      <ThemeEditor base={defaultTheme} initial={initial} baseLabel="theme.config.ts" onSave={savePlatformTheme} />
    </>
  );
}
