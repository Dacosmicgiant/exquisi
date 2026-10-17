"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ClipboardPaste, ImageIcon, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { CollapseAll, useCollapsed } from "@/components/admin/Collapsible";
import { CategoryDialog } from "@/components/admin/CategoryDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DishDialog } from "@/components/admin/DishDialog";
import { MenuImportDialog } from "@/components/admin/MenuImportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { Category, Dish, Restaurant } from "@/lib/db/types";
import { resolveText, type LangMap } from "@/lib/i18n";
import { MediaImage } from "@/lib/media/MediaImage";
import { formatPrice } from "@/lib/money";
import { toRoman } from "@/lib/roman";
import type { DishFormValues } from "@/lib/validation";
import type { Result } from "@/lib/actions";
import {
  addCategory,
  createDish,
  deleteDish,
  removeCategory,
  renameCategory,
  reorderCategories,
  reorderDishes,
  setDishAvailability,
  updateDish,
} from "@/app/(admin)/admin/(app)/restaurants/[id]/menu/actions";

const move = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

/** One-click starters for an empty menu, in the menu's own language when we have the words. */
const STARTERS: Record<string, string[]> = {
  en: ["Starters", "Mains", "Sides", "Desserts", "Drinks"],
  it: ["Antipasti", "Primi", "Secondi", "Contorni", "Dolci", "Bevande"],
};

const matches = (d: Dish, q: string, lang: string) =>
  `${resolveText(d.name, lang, lang)} ${d.description[lang] ?? ""}`.toLowerCase().includes(q);

export function MenuManager({
  restaurant,
  categories,
  dishes,
}: {
  restaurant: Restaurant;
  categories: Category[];
  dishes: Dish[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const lang = restaurant.default_language;
  const rid = restaurant.id;

  const [catDialog, setCatDialog] = useState<{ open: boolean; edit?: Category }>({ open: false });
  const [dishDialog, setDishDialog] = useState<{ open: boolean; dish?: Dish; category: string }>({
    open: false,
    category: categories[0]?.key ?? "",
  });
  const [dishKey, setDishKey] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; description: string; run: () => void } | null>(null);
  const [query, setQuery] = useState("");
  const folded = useCollapsed();
  const [active, setActive] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const byCategory = useMemo(() => {
    const m = new Map<string, Dish[]>();
    for (const c of categories) m.set(c.key, []);
    for (const d of dishes) (m.get(d.category) ?? m.set(d.category, []).get(d.category)!).push(d);
    return m;
  }, [categories, dishes]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      categories.map((cat) => {
        const all = byCategory.get(cat.key) ?? [];
        return { cat, all, shown: q ? all.filter((d) => matches(d, q, lang)) : all };
      }),
    [categories, byCategory, q, lang],
  );
  const shownCategories = q ? visible.filter((s) => s.shown.length > 0) : visible;
  const shownDishes = visible.reduce((n, s) => n + s.shown.length, 0);

  // keep the category bar in step with what is on screen
  useEffect(() => {
    const els = categories.map((c) => document.getElementById(`cat-${c.key}`)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id.slice(4));
      },
      { rootMargin: "-150px 0px -65% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [categories, q, folded.count]);

  useEffect(() => {
    if (!active) return;
    const chip = navRef.current?.querySelector<HTMLElement>(`[data-cat="${active}"]`);
    const bar = navRef.current;
    if (chip && bar) bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  }, [active]);

  function act(fn: () => Promise<Result<unknown>>, ok?: string, after?: () => void) {
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (ok) toast.success(ok);
      after?.();
      router.refresh();
    });
  }

  const catName = (c: Category) => resolveText(c.name, lang, lang);
  const jump = (key: string) => {
    folded.open(key);
    document.getElementById(`cat-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const catKeys = categories.map((c) => c.key);
  const openNewDish = (category?: string) => {
    setDishKey((k) => k + 1);
    setDishDialog({ open: true, category: category ?? active ?? categories[0]?.key ?? "" });
  };
  const starters = STARTERS[lang] ?? [];

  return (
    <div className="space-y-8">
      <p className="max-w-lg text-muted-foreground">
        Courses and dishes, in the order diners will read them. Changes publish to the live menu within moments.
      </p>

      {/* sticky toolbar: always-reachable actions + jump bar */}
      <div className="sticky top-14 z-20 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 start-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dishes" aria-label="Search dishes" className="ps-8 pe-8" />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute top-1/2 end-2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <CollapseAll keys={catKeys} collapsed={folded.count} onChange={(c) => folded.setAll(catKeys, c)} />
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <ClipboardPaste className="size-4" /> <span className="hidden sm:inline">Import</span>
            </Button>
            <Button variant="outline" onClick={() => setCatDialog({ open: true })}>
              <Plus className="size-4" /> Category
            </Button>
            {categories.length > 0 && (
              <Button onClick={() => openNewDish()}>
                <Plus className="size-4" /> Dish
              </Button>
            )}
          </div>
        </div>

        {categories.length > 0 && (
          <div ref={navRef} role="navigation" aria-label="Jump to category" className="-mb-1 mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c, i) => {
              const n = (byCategory.get(c.key) ?? []).length;
              return (
                <button
                  key={c.key}
                  type="button"
                  data-cat={c.key}
                  onClick={() => jump(c.key)}
                  aria-current={active === c.key ? "true" : undefined}
                  className={`label-caps flex shrink-0 items-center gap-2 border px-3 py-1.5 text-[0.62rem] transition-colors ${
                    active === c.key ? "border-ornament bg-accent/60 text-foreground" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  }`}
                >
                  <span className="font-display text-sm normal-case tracking-normal text-ornament" aria-hidden="true">{toRoman(i + 1)}</span>
                  {catName(c)}
                  <span className="font-numeric opacity-60">{n}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {categories.length === 0 && (
        <div className="border border-dashed px-6 py-14 text-center">
          <p className="font-display text-3xl">Start your menu</p>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Add a category, then the dishes in it. Diners read them in the order you set here.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button size="lg" onClick={() => setCatDialog({ open: true })}>
              <Plus className="size-4" /> Add your first category
            </Button>
            <Button size="lg" variant="outline" onClick={() => setImportOpen(true)}>
              <ClipboardPaste className="size-4" /> Paste a whole menu
            </Button>
          </div>
          {starters.length > 0 && (
            <div className="mt-8">
              <p className="label-caps text-[0.62rem] text-muted-foreground">Or add one in a click</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {starters.map((s) => (
                  <Button key={s} variant="outline" size="sm" disabled={pending} onClick={() => act(() => addCategory(rid, { [lang]: s }), `Added ${s}`)}>
                    <Plus className="size-3.5" /> {s}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {q && (
        <p className="text-sm text-muted-foreground" role="status">
          {shownDishes === 0 ? `No dishes match “${query.trim()}”.` : `${shownDishes} dish${shownDishes === 1 ? "" : "es"} match “${query.trim()}”.`}
        </p>
      )}

      {shownCategories.map(({ cat, all, shown }) => {
        const ci = categories.findIndex((c) => c.key === cat.key);
        const isCollapsed = folded.isCollapsed(cat.key) && !q;
        return (
          <section key={cat.key} id={`cat-${cat.key}`} aria-labelledby={`cat-h-${cat.key}`} className="scroll-mt-44">
            <header className="flex items-end justify-between gap-4 border-b border-ornament/60 pb-3">
              <button
                type="button"
                onClick={() => folded.toggle(cat.key)}
                aria-expanded={!isCollapsed}
                aria-controls={`cat-list-${cat.key}`}
                className="group flex min-w-0 items-baseline gap-4 text-start"
              >
                <span className="font-display text-xl text-ornament tabular">{toRoman(ci + 1)}.</span>
                <h2 id={`cat-h-${cat.key}`} className="truncate text-3xl">{catName(cat)}</h2>
                <span className="label-caps shrink-0 text-[0.6rem] text-muted-foreground">
                  {all.length} {all.length === 1 ? "dish" : "dishes"}
                </span>
                <ChevronDown className={`size-4 shrink-0 self-center text-muted-foreground transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
              </button>
              <div className="flex shrink-0 items-center">
                <Button variant="ghost" size="icon-sm" aria-label="Move category up" disabled={pending || ci === 0}
                  onClick={() => act(() => reorderCategories(rid, move(categories, ci, -1).map((c) => c.key)))}>
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Move category down" disabled={pending || ci === categories.length - 1}
                  onClick={() => act(() => reorderCategories(rid, move(categories, ci, 1).map((c) => c.key)))}>
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Rename category" onClick={() => setCatDialog({ open: true, edit: cat })}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Delete category"
                  onClick={() =>
                    setConfirm({
                      title: `Delete “${catName(cat)}”?`,
                      description: all.length
                        ? "Move or delete its dishes first; a category with dishes can't be removed."
                        : "This category is empty and will be removed from the menu.",
                      run: () => act(() => removeCategory(rid, cat.key), "Category removed"),
                    })
                  }>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </header>

            {!isCollapsed && (
              <div id={`cat-list-${cat.key}`}>
                <ul className="divide-y">
                  {shown.map((d, di) => (
                    <li key={d.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 py-4 sm:grid-cols-[auto_1fr_auto_auto]">
                      <div className="grid size-14 place-items-center overflow-hidden border bg-muted/40">
                        {d.image ? (
                          <MediaImage image={d.image} alt="" width={112} height={112} sizes="56px" className="size-14 object-cover" />
                        ) : (
                          <ImageIcon className="size-5 text-muted-foreground/50" aria-hidden="true" />
                        )}
                      </div>

                      <button type="button" onClick={() => setDishDialog({ open: true, dish: d, category: cat.key })} className="min-w-0 text-start" aria-label={`Edit ${resolveText(d.name, lang, lang) || "dish"}`}>
                        <span className={`block truncate font-display text-xl ${d.available ? "" : "text-muted-foreground line-through decoration-ornament/50"}`}>
                          {resolveText(d.name, lang, lang) || "Untitled"}
                        </span>
                        {d.description[lang] && <span className="block truncate text-sm text-muted-foreground">{d.description[lang]}</span>}
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          {d.dietary.includes("vegan") ? <Tag>Vegan</Tag> : d.dietary.includes("vegetarian") ? <Tag>Vegetarian</Tag> : null}
                          {d.spice_level > 0 && <Tag>{["", "Mild", "Medium", "Hot"][Math.min(3, d.spice_level)]}</Tag>}
                          {d.allergens.length > 0 && <Tag>{d.allergens.length} allergen{d.allergens.length === 1 ? "" : "s"}</Tag>}
                          {!d.available && <Tag warn>Hidden</Tag>}
                        </span>
                      </button>

                      <span className="tabular min-w-16 text-end text-sm">{formatPrice(d.price, restaurant.currency, lang)}</span>

                      <div className="col-span-3 flex items-center justify-end gap-1 sm:col-span-1">
                        <label className="me-2 flex items-center gap-2 text-xs text-muted-foreground">
                          Available
                          <Switch
                            checked={d.available}
                            aria-label={`${resolveText(d.name, lang, lang)} available`}
                            onCheckedChange={(c) => act(() => setDishAvailability(rid, d.id, c))}
                            disabled={pending}
                          />
                        </label>
                        <Button variant="ghost" size="icon-sm" aria-label="Move dish up" disabled={pending || !!q || di === 0}
                          onClick={() => act(() => reorderDishes(rid, move(all, di, -1).map((x) => x.id)))}>
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label="Move dish down" disabled={pending || !!q || di === shown.length - 1}
                          onClick={() => act(() => reorderDishes(rid, move(all, di, 1).map((x) => x.id)))}>
                          <ArrowDown className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label="Edit dish" onClick={() => setDishDialog({ open: true, dish: d, category: cat.key })}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label="Delete dish"
                          onClick={() =>
                            setConfirm({
                              title: `Delete “${resolveText(d.name, lang, lang)}”?`,
                              description: "This removes the dish from the menu. Its films are kept.",
                              run: () => act(() => deleteDish(rid, d.id), "Dish deleted"),
                            })
                          }>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                  {shown.length === 0 && <li className="py-6 text-sm text-muted-foreground">No dishes in this category yet.</li>}
                </ul>

                <Button variant="outline" size="sm" className="mt-3" onClick={() => openNewDish(cat.key)}>
                  <Plus className="size-3.5" /> Add dish to {catName(cat)}
                </Button>
              </div>
            )}
          </section>
        );
      })}

      <CategoryDialog
        open={catDialog.open}
        onOpenChange={(o) => setCatDialog((p) => ({ ...p, open: o }))}
        languages={restaurant.enabled_languages}
        defaultLang={lang}
        initial={catDialog.edit?.name}
        title={catDialog.edit ? "Rename category" : "New category"}
        pending={pending}
        onSubmit={(name: LangMap) =>
          act(
            () => (catDialog.edit ? renameCategory(rid, catDialog.edit.key, name) : addCategory(rid, name)),
            catDialog.edit ? "Category renamed" : "Category added",
            () => setCatDialog({ open: false }),
          )
        }
      />

      {categories.length > 0 && (
        <DishDialog
          open={dishDialog.open}
          onOpenChange={(o) => setDishDialog((p) => ({ ...p, open: o }))}
          restaurant={restaurant}
          categories={categories}
          dish={dishDialog.dish}
          defaultCategory={dishDialog.category}
          resetKey={dishKey}
          pending={pending}
          onSubmit={(values: DishFormValues, { another }) =>
            act(
              () => (dishDialog.dish ? updateDish(rid, dishDialog.dish.id, values) : createDish(rid, values)),
              dishDialog.dish ? "Dish saved" : "Dish added",
              () => {
                if (another && !dishDialog.dish) {
                  // keep the dialog open on a blank form, in the same category, ready for the next dish
                  setDishKey((k) => k + 1);
                  setDishDialog({ open: true, category: values.category });
                } else setDishDialog((p) => ({ ...p, open: false }));
              },
            )
          }
        />
      )}

      <MenuImportDialog restaurantId={rid} open={importOpen} onOpenChange={setImportOpen} currency={restaurant.currency} />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        onConfirm={() => confirm?.run()}
      />
    </div>
  );
}

function Tag({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <span className={`border px-1.5 py-px text-[0.65rem] leading-4 ${warn ? "border-highlight/50 text-highlight" : "text-muted-foreground"}`}>{children}</span>
  );
}
