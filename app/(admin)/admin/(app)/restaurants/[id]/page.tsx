import { notFound } from "next/navigation";
import { RestaurantForm } from "@/components/admin/RestaurantForm";
import { restaurants } from "@/lib/db/platform";

export const metadata = { title: "Restaurant settings" };

export default async function RestaurantSettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await restaurants.get(id);
  if (!r) notFound();
  return (
    <RestaurantForm
      restaurantId={r.id}
      initial={{
        slug: r.slug,
        name: r.name,
        default_language: r.default_language,
        dish_name_language: r.dish_name_language ?? "",
        enabled_languages: r.enabled_languages,
        currency: r.currency,
        show_converted_prices: r.show_converted_prices ?? true,
        status: r.status,
      }}
    />
  );
}
