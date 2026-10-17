import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { RestaurantTabs } from "@/components/admin/RestaurantTabs";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { restaurants } from "@/lib/db/platform";
import { resolveText } from "@/lib/i18n";

const TABS = [
  { slug: "", label: "Settings" },
  { slug: "menu", label: "Menu" },
  { slug: "translations", label: "Translations" },
  { slug: "brand", label: "Brand" },
  { slug: "qr", label: "QR codes" },
  { slug: "analytics", label: "Analytics" },
  { slug: "preview", label: "Preview" },
];

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await restaurants.get(id);
  if (!r) notFound();
  const name = resolveText(r.name, r.default_language, r.default_language) || r.slug;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/restaurants" className="label-caps text-[0.65rem] text-muted-foreground hover:text-foreground">
            Restaurants
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-display text-xl">{name}</span>
          <StatusBadge status={r.status} />
        </div>
        {r.status === "live" && (
          <Link
            href={`/m/${r.slug}`}
            target="_blank"
            className="label-caps inline-flex items-center gap-1.5 text-[0.65rem] text-muted-foreground hover:text-foreground"
          >
            View live menu <ExternalLink className="size-3" />
          </Link>
        )}
      </div>
      <RestaurantTabs id={r.id} tabs={TABS} />
      {children}
    </>
  );
}
