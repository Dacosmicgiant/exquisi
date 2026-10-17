"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Palette, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/restaurants", label: "Restaurants", icon: Store },
  { href: "/admin/theme", label: "Theme", icon: Palette },
];

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 border-l-2 px-4 py-2.5 text-sm transition-colors",
              active
                ? "border-ornament bg-accent/60 text-foreground"
                : "border-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4", active ? "text-ornament" : "")} />
            <span className="label-caps !text-[0.7rem]">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
