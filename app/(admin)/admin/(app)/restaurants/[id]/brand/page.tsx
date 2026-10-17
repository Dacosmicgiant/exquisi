import { notFound } from "next/navigation";
import { LogoField } from "@/components/admin/LogoField";
import { ThemeEditor } from "@/components/admin/ThemeEditor";
import { restaurants } from "@/lib/db/platform";
import { getPlatformTheme, getRestaurantTheme } from "@/lib/theme/server";
import { saveBrandTheme } from "./actions";

export const metadata = { title: "Brand" };

export default async function BrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await restaurants.get(id);
  if (!r) notFound();
  const [base, initial] = await Promise.all([getPlatformTheme(), getRestaurantTheme(r.brand)]);
  return (
    <>
      <p className="mb-8 max-w-xl text-muted-foreground">
        This restaurant’s own look. Only what you change here differs from the house style; everything else follows the platform theme.
      </p>
      <ThemeEditor
        base={base}
        initial={initial}
        baseLabel="the house style"
        onSave={saveBrandTheme.bind(null, r.id)}
      >
        <LogoField restaurantId={r.id} logo={r.brand.logo ?? null} />
      </ThemeEditor>
    </>
  );
}
