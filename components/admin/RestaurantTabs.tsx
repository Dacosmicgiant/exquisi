"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function RestaurantTabs({ id, tabs }: { id: string; tabs: { slug: string; label: string }[] }) {
  const pathname = usePathname();
  const base = `/admin/restaurants/${id}`;
  return (
    <nav className="-mx-4 mb-10 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0" aria-label="Restaurant sections">
      {tabs.map((t) => {
        const href = t.slug ? `${base}/${t.slug}` : base;
        const active = t.slug ? pathname.startsWith(href) : pathname === base;
        return (
          <Link
            key={t.slug || "settings"}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "label-caps -mb-px shrink-0 border-b-2 px-4 py-3 text-[0.7rem] transition-colors",
              active
                ? "border-ornament text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
