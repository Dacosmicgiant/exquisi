"use client";

import { useCallback, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The one pattern for long admin lists: a heading you can fold, with a count/summary, optional actions that
 * stay clickable while folded, and (for lists) an expand/collapse-all control. Used by the menu, translations,
 * themes, restaurants and QR screens so they all behave alike.
 */

/** Which of a set of keyed sections are folded. */
export function useCollapsed(initial: Iterable<string> = []) {
  const [set, setSet] = useState<Set<string>>(() => new Set(initial));
  const isCollapsed = useCallback((key: string) => set.has(key), [set]);
  const toggle = useCallback(
    (key: string) =>
      setSet((s) => {
        const n = new Set(s);
        if (!n.delete(key)) n.add(key);
        return n;
      }),
    [],
  );
  const open = useCallback(
    (key: string) =>
      setSet((s) => {
        if (!s.has(key)) return s;
        const n = new Set(s);
        n.delete(key);
        return n;
      }),
    [],
  );
  const setAll = useCallback((keys: string[], collapsed: boolean) => setSet(collapsed ? new Set(keys) : new Set()), []);
  return { isCollapsed, toggle, open, setAll, count: set.size };
}

/** "Collapse all" / "Expand all" for a keyed set of sections. */
export function CollapseAll({ keys, collapsed, onChange }: { keys: string[]; collapsed: number; onChange: (collapse: boolean) => void }) {
  if (keys.length < 2) return null;
  const all = collapsed >= keys.length;
  return (
    <Button variant="ghost" size="sm" onClick={() => onChange(!all)}>
      {all ? "Expand all" : "Collapse all"}
    </Button>
  );
}

/**
 * A foldable section. Controlled (`open` + `onOpenChange`) when you track many sections with `useCollapsed`,
 * otherwise it keeps its own state starting from `defaultOpen`. `forceOpen` overrides folding (e.g. while searching).
 * The body is not rendered while folded, so a folded 100-row list costs nothing.
 */
export function Collapsible({
  title,
  meta,
  actions,
  children,
  open: openProp,
  onOpenChange,
  defaultOpen = true,
  forceOpen = false,
  level = "h3",
  id,
  className,
  headerClassName,
  titleClassName,
}: {
  title: React.ReactNode;
  /** small text after the title: counts, status */
  meta?: React.ReactNode;
  /** buttons on the right of the header; they work while folded */
  actions?: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  level?: "h2" | "h3" | "h4";
  id?: string;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
}) {
  const [inner, setInner] = useState(defaultOpen);
  const controlled = openProp !== undefined;
  const isOpen = forceOpen || (controlled ? openProp : inner);
  const Heading = level;
  const bodyId = id ? `${id}-body` : undefined;
  return (
    <section id={id} className={className}>
      <div className={cn("flex items-center justify-between gap-3", headerClassName)}>
        <button
          type="button"
          onClick={() => (controlled ? onOpenChange?.(!isOpen) : setInner(!isOpen))}
          aria-expanded={isOpen}
          aria-controls={bodyId}
          disabled={forceOpen}
          className="group flex min-w-0 flex-1 items-baseline gap-3 text-start disabled:cursor-default"
        >
          <ChevronDown className={cn("size-4 shrink-0 self-center text-muted-foreground transition-transform", !isOpen && "-rotate-90 rtl:rotate-90", forceOpen && "opacity-30")} aria-hidden="true" />
          <Heading className={cn("truncate", titleClassName)}>{title}</Heading>
          {meta && <span className="label-caps shrink-0 truncate text-[0.6rem] text-muted-foreground">{meta}</span>}
        </button>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {isOpen && <div id={bodyId}>{children}</div>}
    </section>
  );
}

/** "Show 20 more of 104": reveal a long list in steps instead of rendering it all. */
export function useShowMore(total: number, first = 12, step = first) {
  const [shown, setShown] = useState(first);
  return {
    limit: Math.min(shown, total),
    hasMore: shown < total,
    more: () => setShown((s) => s + step),
    all: () => setShown(total),
    reset: () => setShown(first),
    expanded: shown >= total && total > first,
  };
}

export function ShowMoreButton({ total, limit, onMore, onAll, noun = "items" }: { total: number; limit: number; onMore: () => void; onAll: () => void; noun?: string }) {
  if (limit >= total) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span>
        Showing {limit} of {total} {noun}
      </span>
      <Button variant="outline" size="sm" onClick={onMore}>
        Show more
      </Button>
      <Button variant="ghost" size="sm" onClick={onAll}>
        Show all {total}
      </Button>
    </div>
  );
}
