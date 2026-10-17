import { notFound } from "next/navigation";
import { CustomThemeBuilder } from "@/components/admin/CustomThemeBuilder";
import { PageHeader } from "@/components/admin/PageHeader";
import { customThemes } from "@/lib/db/platform";
import { resolveTheme } from "@/lib/theme/resolve";

export const metadata = { title: "Edit theme" };

export default async function EditThemePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await customThemes.get(id);
  if (!t) notFound();
  return (
    <>
      <PageHeader
        eyebrow="Custom theme"
        title={t.name}
        description="Changes apply to every restaurant that uses this theme, and their menus rebuild when you save."
      />
      <CustomThemeBuilder existing={{ id: t.id, name: t.name, category: t.category }} base={resolveTheme(t.theme)} startLabel="the saved theme" />
    </>
  );
}
