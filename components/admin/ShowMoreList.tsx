"use client";

import { Children } from "react";
import { ShowMoreButton, useShowMore } from "@/components/admin/Collapsible";

/**
 * A list (ul/ol) that shows its first few rows and reveals the rest on request. The rows are rendered by the
 * server and passed in as children, so this works from server components such as the analytics page.
 */
export function ShowMoreList({
  as: Tag = "ul",
  className,
  first,
  noun,
  children,
}: {
  as?: "ul" | "ol";
  className?: string;
  first: number;
  noun: string;
  children: React.ReactNode;
}) {
  const rows = Children.toArray(children);
  const more = useShowMore(rows.length, first, first);
  return (
    <>
      <Tag className={className}>{rows.slice(0, more.limit)}</Tag>
      <ShowMoreButton total={rows.length} limit={more.limit} onMore={more.more} onAll={more.all} noun={noun} />
    </>
  );
}
