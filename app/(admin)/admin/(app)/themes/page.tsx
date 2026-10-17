import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { ThemeLibrary } from "@/components/admin/ThemeLibrary";
import { Button } from "@/components/ui/button";
import { listThemeOptions } from "@/lib/theme/server";

export const metadata = { title: "Themes" };

export default async function ThemesPage() {
  const { presets, custom } = await listThemeOptions();
  return (
    <>
      <PageHeader
        eyebrow="Appearance"
        title="Themes"
        description={`${presets.length} ready-made themes for every kind of venue, plus any you build yourself. Each restaurant picks one on its Brand tab and can still fine-tune it.`}
        actions={
          <Button nativeButton={false} render={<Link href="/admin/themes/new" />} className="label-caps">
            <Plus className="size-4" /> New custom theme
          </Button>
        }
      />
      <ThemeLibrary themes={[...custom, ...presets]} />
    </>
  );
}
