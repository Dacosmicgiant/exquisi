import { notFound } from "next/navigation";
import { AnalyticsView } from "@/components/admin/AnalyticsView";
import { restaurants } from "@/lib/db/platform";
import { lastDays } from "@/lib/analytics/range";
import { forTenant } from "@/lib/db/tenant";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const r = await restaurants.get(id);
  if (!r) notFound();
  const days = [7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const range = lastDays(days);
  const db = forTenant(r.id);
  const [summary, languages, interest, daily, dishes] = await Promise.all([
    db.analytics.summary(range),
    db.analytics.languages(range),
    db.analytics.dishInterest(range),
    db.analytics.daily(range),
    db.dishes.list(),
  ]);
  const names = new Map(dishes.map((d) => [d.id, d.name[r.default_language] ?? Object.values(d.name)[0] ?? "Dish"]));
  return (
    <AnalyticsView
      restaurantId={r.id}
      days={days}
      summary={summary}
      languages={languages}
      daily={daily}
      dishes={interest.filter((i) => names.has(i.dish_id)).map((i) => ({ id: i.dish_id, name: names.get(i.dish_id)!, opens: i.opens }))}
    />
  );
}
