import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { Restaurant } from "@/lib/db/types";
import { resolveText } from "@/lib/i18n";

export function RestaurantCard({ r }: { r: Restaurant }) {
  return (
    <Link
      href={`/admin/restaurants/${r.id}`}
      className="group relative block border bg-card p-6 transition-shadow hover:shadow-lifted"
    >
      <div className="flex items-start justify-between gap-4">
        <StatusBadge status={r.status} />
        <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ornament" />
      </div>
      <h3 className="mt-8 text-3xl leading-tight">{resolveText(r.name, r.default_language, r.default_language) || r.slug}</h3>
      <div className="mt-4 h-px w-10 bg-ornament transition-all group-hover:w-20" />
      <p className="mt-4 text-sm text-muted-foreground">
        /m/{r.slug} · {r.enabled_languages.join(" · ")}
      </p>
    </Link>
  );
}
