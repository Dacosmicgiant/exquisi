"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { CollapseAll, Collapsible, useCollapsed } from "@/components/admin/Collapsible";
import { Input } from "@/components/ui/input";
import { fontFaceCss, themeToScopedCss } from "@/lib/theme/css";
import { FONT_CATALOG } from "@/lib/theme/fonts";
import { THEME_CATEGORIES } from "@/lib/theme/presets";
import type { Theme } from "@/lib/theme/schema";
import { cn } from "@/lib/utils";

/** What the gallery needs to draw a theme (a serialisable subset of lib/theme/server.ts ThemeOption). */
export type GalleryTheme = {
  ref: string;
  name: string;
  category: string;
  categoryLabel: string;
  description: string;
  custom: boolean;
  theme: Theme;
};

const ALL = "all";
const MINE = "mine";

/** One @font-face per catalog font; the browser only downloads the ones a visible card actually uses. */
const ALL_FONT_FACES = FONT_CATALOG.map((f) => fontFaceCss({ fonts: { display: f.key, body: f.key } } as Theme)).join("");

function Half({ cls, mode, theme }: { cls: string; mode: "light" | "dark"; theme: Theme }) {
  return (
    <div
      className={cn(cls, "flex-1 px-3.5 py-3")}
      data-mode={mode}
      style={{ background: "var(--background)", color: "var(--foreground)", fontFamily: "var(--font-body)" }}
    >
      <p className="truncate text-[1.05rem] leading-tight" style={{ fontFamily: "var(--font-display)", fontWeight: theme.type.displayWeight }}>
        Tagliolini
      </p>
      <div className="mt-1.5 h-px" style={{ background: "var(--ornament)" }} />
      <div className="mt-2 flex items-baseline justify-between gap-2 text-[0.7rem]">
        <span className="truncate opacity-90">Truffle butter</span>
        <span style={{ color: "var(--highlight)" }}>€34</span>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <span className="rounded-[var(--radius)] px-1.5 py-0.5 text-[0.55rem] tracking-wider uppercase" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
          Order
        </span>
        <span className="rounded-[var(--radius)] border px-1.5 py-0.5 text-[0.55rem]" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
          Gluten
        </span>
      </div>
    </div>
  );
}

function ThemeCard({
  option,
  index,
  selected,
  onSelect,
  actions,
}: {
  option: GalleryTheme;
  index: number;
  selected: boolean;
  onSelect?: () => void;
  actions?: React.ReactNode;
}) {
  const cls = `tg-${index}`;
  const body = (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeToScopedCss(option.theme, `.${cls}`) }} />
      <div className="flex overflow-hidden border-b" style={{ contain: "paint" }}>
        <Half cls={cls} mode="light" theme={option.theme} />
        <Half cls={cls} mode="dark" theme={option.theme} />
      </div>
      <div className="flex items-start justify-between gap-2 p-3 text-left">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{option.name}</p>
          <p className="label-caps mt-0.5 truncate text-[0.58rem] text-muted-foreground">
            {option.custom ? "Custom · " : ""}
            {option.categoryLabel}
          </p>
        </div>
        {selected && (
          <span className="label-caps flex shrink-0 items-center gap-1 text-[0.58rem] text-primary">
            <Check className="size-3" /> Applied
          </span>
        )}
      </div>
    </>
  );
  return (
    <li className={cn("flex flex-col overflow-hidden border bg-card transition-shadow", selected ? "ring-2 ring-primary" : "hover:shadow-md")}>
      {onSelect ? (
        <button type="button" onClick={onSelect} aria-pressed={selected} aria-label={`${option.name}, ${option.categoryLabel}${selected ? ", applied" : ""}`} title={option.description} className="block w-full text-left">
          {body}
        </button>
      ) : (
        <div title={option.description}>{body}</div>
      )}
      {actions && <div className="mt-auto flex flex-wrap items-center gap-1 border-t px-2 py-1.5">{actions}</div>}
    </li>
  );
}

/**
 * Browse themes by category, like a code editor's theme picker.
 * Pass `onSelect` to make cards pickable (a restaurant's Brand tab) and/or `actions` for per-card buttons (the library).
 */
export function ThemeGallery({
  themes,
  selectedRef,
  onSelect,
  actions,
  leading,
}: {
  themes: GalleryTheme[];
  selectedRef?: string | null;
  onSelect?: (option: GalleryTheme) => void;
  actions?: (option: GalleryTheme) => React.ReactNode;
  /** an extra first card (e.g. "House style") */
  leading?: React.ReactNode;
}) {
  const [cat, setCat] = useState<string>(ALL);
  const [q, setQ] = useState("");
  const folded = useCollapsed();

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of themes) m.set(t.category, (m.get(t.category) ?? 0) + 1);
    return m;
  }, [themes]);
  const customCount = themes.filter((t) => t.custom).length;
  // a stable CSS class per theme, whatever section it is shown in
  const indexOf = useMemo(() => new Map(themes.map((t, i) => [t.ref, i])), [themes]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return themes.filter(
      (t) =>
        (cat === ALL || (cat === MINE ? t.custom : t.category === cat)) &&
        (!needle || `${t.name} ${t.categoryLabel} ${t.description}`.toLowerCase().includes(needle)),
    );
  }, [themes, cat, q]);

  // "All" without a search is shown as one foldable section per category; anything narrower is a plain grid
  const grouped = cat === ALL && !q.trim();
  const sections = useMemo(() => {
    if (!grouped) return [];
    const out: { key: string; label: string; items: GalleryTheme[] }[] = [];
    const mine = shown.filter((t) => t.custom);
    if (mine.length) out.push({ key: MINE, label: "My themes", items: mine });
    for (const c of THEME_CATEGORIES) {
      const items = shown.filter((t) => !t.custom && t.category === c.key);
      if (items.length) out.push({ key: c.key, label: c.label, items });
    }
    return out;
  }, [grouped, shown]);
  const sectionKeys = sections.map((s) => s.key);

  const card = (t: GalleryTheme) => (
    <ThemeCard
      key={t.ref}
      option={t}
      index={indexOf.get(t.ref) ?? 0}
      selected={selectedRef === t.ref}
      onSelect={onSelect ? () => onSelect(t) : undefined}
      actions={actions?.(t)}
    />
  );
  const gridCls = "mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

  const chip = (key: string, label: string, n: number) => (
    <button
      key={key}
      type="button"
      onClick={() => setCat(key)}
      aria-pressed={cat === key}
      className={cn(
        "label-caps border px-3 py-1.5 text-[0.62rem] transition-colors",
        cat === key ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent/50",
      )}
    >
      {label} <span className="font-numeric opacity-70">{n}</span>
    </button>
  );

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: ALL_FONT_FACES }} />
      <div className="flex flex-wrap items-center gap-2">
        {chip(ALL, "All", themes.length)}
        {customCount > 0 && chip(MINE, "My themes", customCount)}
        {THEME_CATEGORIES.filter((c) => counts.get(c.key)).map((c) => chip(c.key, c.label, counts.get(c.key) ?? 0))}
      </div>
      <div className="relative mt-4 max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search themes" className="pl-8" aria-label="Search themes" />
      </div>
      {grouped ? (
        <div className="mt-6">
          {leading && <ul className={gridCls.replace("mt-4", "mb-2")}>{leading}</ul>}
          <div className="flex justify-end">
            <CollapseAll keys={sectionKeys} collapsed={folded.count} onChange={(c) => folded.setAll(sectionKeys, c)} />
          </div>
          <div className="divide-y border-y">
            {sections.map((sec) => (
              <Collapsible
                key={sec.key}
                level="h3"
                title={sec.label}
                meta={`${sec.items.length} ${sec.items.length === 1 ? "theme" : "themes"}`}
                open={!folded.isCollapsed(sec.key)}
                onOpenChange={() => folded.toggle(sec.key)}
                headerClassName="py-3"
                titleClassName="font-display text-xl"
              >
                <ul className={`${gridCls} pb-5`}>{sec.items.map(card)}</ul>
              </Collapsible>
            ))}
          </div>
        </div>
      ) : (
        <ul className={`${gridCls} mt-6`}>{shown.map(card)}</ul>
      )}
      {shown.length === 0 && <p className="mt-8 text-sm text-muted-foreground">No themes match.</p>}
    </div>
  );
}

/** The "no theme chosen" card: the house style itself. */
export function HouseStyleCard({ theme, selected, onSelect }: { theme: Theme; selected: boolean; onSelect: () => void }) {
  return (
    <ThemeCard
      option={{ ref: "house", name: "House style", category: "house", categoryLabel: "The platform default", description: "Follows the platform theme (Theme page)", custom: false, theme }}
      index={999}
      selected={selected}
      onSelect={onSelect}
    />
  );
}
