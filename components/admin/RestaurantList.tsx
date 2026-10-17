"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Collapsible, CollapseAll, useCollapsed } from "@/components/admin/Collapsible";
import { RestaurantCard } from "@/components/admin/RestaurantCard";
import { Input } from "@/components/ui/input";
import type { Restaurant, RestaurantStatus } from "@/lib/db/types";
import { resolveText } from "@/lib/i18n";

const SECTIONS: { status: RestaurantStatus; label: string }[] = [
  { status: "live", label: "Live" },
  { status: "draft", label: "Draft" },
  { status: "archived", label: "Archived" },
];

const GRID = "grid gap-5 sm:grid-cols-2 lg:grid-cols-3";

/**
 * Every restaurant, folded by status. With only a few clients it is a plain grid; past that it gains search
 * and Live / Draft / Archived sections (archived starts folded).
 */
export function RestaurantList({ restaurants }: { restaurants: Restaurant[] }) {
  const [q, setQ] = useState("");
  const folded = useCollapsed(["archived"]);
  const needle = q.trim().toLowerCase();

  const matching = useMemo(
    () =>
      restaurants.filter(
        (r) => !needle || `${resolveText(r.name, r.default_language, r.default_language)} ${r.slug}`.toLowerCase().includes(needle),
      ),
    [restaurants, needle],
  );

  if (restaurants.length <= 6) {
    return (
      <div className={GRID}>
        {restaurants.map((r) => (
          <RestaurantCard key={r.id} r={r} />
        ))}
      </div>
    );
  }

  const sections = SECTIONS.map((s) => ({ ...s, items: matching.filter((r) => r.status === s.status) })).filter((s) => s.items.length > 0);
  const keys = sections.map((s) => s.status as string);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 start-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search restaurants" aria-label="Search restaurants" className="ps-8" />
        </div>
        <p className="text-sm text-muted-foreground" role="status">
          {needle ? `${matching.length} of ${restaurants.length}` : `${restaurants.length} restaurants`}
        </p>
        <div className="ms-auto">
          <CollapseAll keys={keys} collapsed={keys.filter((k) => folded.isCollapsed(k)).length} onChange={(c) => folded.setAll(keys, c)} />
        </div>
      </div>

      {matching.length === 0 && <p className="mt-8 text-sm text-muted-foreground">No restaurant matches “{q}”.</p>}

      <div className="mt-6 divide-y border-y">
        {sections.map((s) => (
          <Collapsible
            key={s.status}
            level="h2"
            title={s.label}
            meta={`${s.items.length} ${s.items.length === 1 ? "restaurant" : "restaurants"}`}
            open={!folded.isCollapsed(s.status) || !!needle}
            onOpenChange={() => folded.toggle(s.status)}
            forceOpen={!!needle}
            headerClassName="py-4"
            titleClassName="text-2xl"
          >
            <div className={`${GRID} pb-6`}>
              {s.items.map((r) => (
                <RestaurantCard key={r.id} r={r} />
              ))}
            </div>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}
