"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ClipboardPaste, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CategoryDialog } from "@/components/admin/CategoryDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DishDialog } from "@/components/admin/DishDialog";
import { MenuImportDialog } from "@/components/admin/MenuImportDialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Category, Dish, Restaurant } from "@/lib/db/types";
import { resolveText, type LangMap } from "@/lib/i18n";
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
  const [importOpen, setImportOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; description: string; run: () => void } | null>(null);

  const byCategory = useMemo(() => {
    const m = new Map<string, Dish[]>();
    for (const c of categories) m.set(c.key, []);
    for (const d of dishes) (m.get(d.category) ?? m.set(d.category, []).get(d.category)!).push(d);
    return m;
  }, [categories, dishes]);

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

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <p className="max-w-lg text-muted-foreground">
          Courses and dishes, in the order diners will read them. Changes publish to the live menu within moments.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <ClipboardPaste className="size-4" /> Import
          </Button>
          <Button onClick={() => setCatDialog({ open: true })}>
            <Plus className="size-4" /> Category
          </Button>
        </div>
      </div>

      {categories.length === 0 && (
        <p className="border border-dashed p-12 text-center text-muted-foreground">
          Begin with a category — Antipasti, Primi, Dolci…
        </p>
      )}

      {categories.map((cat, ci) => {
        const list = byCategory.get(cat.key) ?? [];
        return (
          <section key={cat.key} aria-labelledby={`cat-${cat.key}`}>
            <header className="flex items-end justify-between gap-4 border-b border-ornament/60 pb-3">
              <div className="flex items-baseline gap-4">
                <span className="font-display text-xl text-ornament tabular">{toRoman(ci + 1)}.</span>
                <h2 id={`cat-${cat.key}`} className="text-3xl">{catName(cat)}</h2>
              </div>
              <div className="flex items-center">
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
                      description: list.length
                        ? "Move or delete its dishes first; a category with dishes can't be removed."
                        : "This category is empty and will be removed from the menu.",
                      run: () => act(() => removeCategory(rid, cat.key), "Category removed"),
                    })
                  }>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </header>

            <ul className="divide-y">
              {list.map((d, di) => (
                <li key={d.id} className="flex items-center gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-display text-xl ${d.available ? "" : "text-muted-foreground line-through decoration-ornament/50"}`}>
                      {resolveText(d.name, lang, lang) || "Untitled"}
                    </p>
                    {d.description[lang] && (
                      <p className="truncate text-sm text-muted-foreground">{d.description[lang]}</p>
                    )}
                  </div>
                  <span className="tabular w-20 shrink-0 text-right text-sm">{formatPrice(d.price, restaurant.currency, lang)}</span>
                  <Switch
                    checked={d.available}
                    aria-label={`${resolveText(d.name, lang, lang)} available`}
                    onCheckedChange={(c) => act(() => setDishAvailability(rid, d.id, c))}
                    disabled={pending}
                  />
                  <div className="flex items-center">
                    <Button variant="ghost" size="icon-sm" aria-label="Move dish up" disabled={pending || di === 0}
                      onClick={() => act(() => reorderDishes(rid, move(list, di, -1).map((x) => x.id)))}>
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Move dish down" disabled={pending || di === list.length - 1}
                      onClick={() => act(() => reorderDishes(rid, move(list, di, 1).map((x) => x.id)))}>
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
              {list.length === 0 && <li className="py-6 text-sm text-muted-foreground">No dishes in this category yet.</li>}
            </ul>

            <Button variant="outline" size="sm" className="mt-3" onClick={() => setDishDialog({ open: true, category: cat.key })}>
              <Plus className="size-3.5" /> Add dish to {catName(cat)}
            </Button>
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
          pending={pending}
          onSubmit={(values: DishFormValues) =>
            act(
              () => (dishDialog.dish ? updateDish(rid, dishDialog.dish.id, values) : createDish(rid, values)),
              dishDialog.dish ? "Dish saved" : "Dish added",
              () => setDishDialog((p) => ({ ...p, open: false })),
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
