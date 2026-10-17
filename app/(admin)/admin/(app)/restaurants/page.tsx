import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { RestaurantCard } from "@/components/admin/RestaurantCard";
import { Button } from "@/components/ui/button";
import { restaurants } from "@/lib/db/platform";

export const metadata = { title: "Restaurants" };

export default async function RestaurantsPage() {
  const all = await restaurants.list({ includeArchived: true });
  return (
    <>
      <PageHeader
        eyebrow="Clients"
        title="Restaurants"
        actions={
          <Button nativeButton={false} render={<Link href="/admin/restaurants/new" />}>
            <Plus className="size-4" /> New restaurant
          </Button>
        }
      />
      {all.length === 0 ? (
        <p className="border border-dashed p-10 text-center text-muted-foreground">No restaurants yet.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {all.map((r) => (
            <RestaurantCard key={r.id} r={r} />
          ))}
        </div>
      )}
    </>
  );
}
