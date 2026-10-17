import { notFound } from "next/navigation";
import { LogoField } from "@/components/admin/LogoField";
import { RestaurantThemePanel } from "@/components/admin/RestaurantThemePanel";
import { restaurants } from "@/lib/db/platform";
import { getPlatformTheme, getRestaurantTheme, listThemeOptions } from "@/lib/theme/server";
import { saveBrandTheme } from "./actions";

export const metadata = { title: "Brand" };

export default async function BrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await restaurants.get(id);
  if (!r) notFound();
  const [house, effective, { presets, custom }] = await Promise.all([
    getPlatformTheme(),
    getRestaurantTheme(r.brand),
    listThemeOptions(),
  ]);
  const themes = [...custom, ...presets];
  // a reference to a theme that no longer exists behaves like "no theme"
  const savedRef = themes.some((t) => t.ref === r.brand.theme_id) ? (r.brand.theme_id ?? null) : null;
  return (
    <>
      <p className="mb-8 max-w-xl text-muted-foreground">
        This restaurant’s own look. Start from any of the ready-made themes (or one of your own), then adjust colours, fonts and shape.
        Only what you change differs from the theme; everything else follows it.
      </p>
      <RestaurantThemePanel
        themes={themes}
        houseTheme={house}
        savedRef={savedRef}
        savedTheme={effective}
        onSave={saveBrandTheme.bind(null, r.id)}
      >
        <LogoField restaurantId={r.id} logo={r.brand.logo ?? null} />
      </RestaurantThemePanel>
    </>
  );
}
