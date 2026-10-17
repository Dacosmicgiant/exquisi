import { CustomThemeBuilder } from "@/components/admin/CustomThemeBuilder";
import { PageHeader } from "@/components/admin/PageHeader";
import { getPlatformTheme, listThemeOptions } from "@/lib/theme/server";

export const metadata = { title: "New theme" };

export default async function NewThemePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const { presets, custom } = await listThemeOptions();
  const start = [...custom, ...presets].find((t) => t.ref === from);
  const base = start?.theme ?? (await getPlatformTheme());
  return (
    <>
      <PageHeader
        eyebrow="Themes"
        title="New custom theme"
        description={start ? `Starting from “${start.name}”. Change anything, name it and save.` : "Starting from the house style. Change anything, name it and save."}
      />
      <CustomThemeBuilder base={base} startLabel={start?.name ?? "the house style"} defaultCategory={start?.category} />
    </>
  );
}
