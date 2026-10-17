import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { RestaurantCard } from "@/components/admin/RestaurantCard";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { NumberTicker } from "@/components/ui/number-ticker";
import { restaurants } from "@/lib/db/platform";

export const metadata = { title: "Overview" };

export default async function Dashboard() {
  const all = await restaurants.list();
  const live = all.filter((r) => r.status === "live").length;
  const draft = all.filter((r) => r.status === "draft").length;

  const stats = [
    { label: "Restaurants", value: all.length },
    { label: "Live menus", value: live },
    { label: "In preparation", value: draft },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Good day."
        description="Every restaurant we produce for, in one place."
        actions={
          <Button nativeButton={false} render={<Link href="/admin/restaurants/new" />}>
            <Plus className="size-4" /> New restaurant
          </Button>
        }
      />

      <div className="grid gap-px overflow-hidden border bg-border sm:grid-cols-3">
        {stats.map((s, i) => (
          <BlurFade key={s.label} delay={0.05 * i} className="bg-card p-8">
            <p className="label-caps text-muted-foreground">{s.label}</p>
            <p className="font-numeric mt-4 text-6xl">
              <NumberTicker value={s.value} />
            </p>
          </BlurFade>
        ))}
      </div>

      <h2 className="mt-16 mb-6 text-2xl">Restaurants</h2>
      {all.length === 0 ? (
        <p className="border border-dashed p-10 text-center text-muted-foreground">
          No restaurants yet. Create the first one to begin.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {all.slice(0, 6).map((r, i) => (
            <BlurFade key={r.id} delay={0.05 * i}>
              <RestaurantCard r={r} />
            </BlurFade>
          ))}
        </div>
      )}
      {all.length > 6 && (
        <p className="mt-6">
          <Link href="/admin/restaurants" className="label-caps text-[0.7rem] text-muted-foreground underline underline-offset-4 hover:text-foreground">
            All {all.length} restaurants →
          </Link>
        </p>
      )}
    </>
  );
}
