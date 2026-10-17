import { notFound } from "next/navigation";
import { MenuManager } from "@/components/admin/MenuManager";
import { restaurants } from "@/lib/db/platform";
import { forTenant } from "@/lib/db/tenant";

export const metadata = { title: "Menu" };

export default async function MenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const restaurant = await restaurants.get(id);
  if (!restaurant) notFound();
  const db = forTenant(restaurant.id);
  const [categories, dishes] = await Promise.all([db.categories.list(), db.dishes.list()]);
  return <MenuManager restaurant={restaurant} categories={categories} dishes={dishes} />;
}
