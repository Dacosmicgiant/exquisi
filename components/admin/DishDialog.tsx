"use client";

import { useState } from "react";
import { LangFields } from "@/components/admin/LangFields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { MediaImage } from "@/lib/media/MediaImage";
import { UploadButton } from "@/lib/media/UploadButton";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { ALLERGENS } from "@/lib/allergens";
import type { Category, Dish, Restaurant } from "@/lib/db/types";
import { currencySymbol, toMajor, toMinor } from "@/lib/money";
import { resolveText } from "@/lib/i18n";
import type { DishFormValues } from "@/lib/validation";

const DIETARY_OPTIONS: [DishFormValues["dietary"][number], string][] = [
  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
  ["contains_pork", "Contains pork"],
  ["contains_beef", "Contains beef"],
  ["contains_alcohol", "Contains alcohol"],
];

const blank = (category: string): DishFormValues => ({
  category,
  name: {},
  description: {},
  context: {},
  spice_level: 0,
  dietary: [],
  price: 0,
  allergens: [],
  image: null,
  available: true,
  story_ids: [],
});

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  restaurant: Restaurant;
  categories: Category[];
  dish?: Dish | null;
  defaultCategory: string;
  pending: boolean;
  onSubmit: (values: DishFormValues) => void;
};

export function DishDialog({ open, onOpenChange, dish, ...form }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{dish ? "Edit dish" : "New dish"}</DialogTitle>
        </DialogHeader>
        {/* mounted only while open, so state starts fresh from `dish` each time */}
        <DishForm dish={dish} {...form} />
      </DialogContent>
    </Dialog>
  );
}

function initialValues(dish: Dish | null | undefined, defaultCategory: string): DishFormValues {
  if (!dish) return blank(defaultCategory);
  const { id: _id, restaurant_id: _r, order: _o, ...rest } = dish;
  void _id; void _r; void _o;
  return rest as DishFormValues;
}

function DishForm({
  restaurant,
  categories,
  dish,
  defaultCategory,
  pending,
  onSubmit,
}: Omit<Props, "open" | "onOpenChange">) {
  const cur = restaurant.currency;
  const [v, setV] = useState<DishFormValues>(() => initialValues(dish, defaultCategory));
  const [priceText, setPriceText] = useState(() => (dish ? String(toMajor(dish.price, cur)) : ""));

  const set = <K extends keyof DishFormValues>(k: K, val: DishFormValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number.parseFloat(priceText.replace(",", "."));
    onSubmit({ ...v, price: Number.isFinite(n) ? toMinor(n, cur) : 0 });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
        <LangFields
          id="dish-name"
          label="Name"
          languages={restaurant.enabled_languages}
          defaultLang={restaurant.default_language}
          value={v.name}
          onChange={(m) => set("name", m)}
          placeholder="e.g. Risotto al Nero di Seppia"
        />
        <div className="space-y-2">
          <Label className="label-caps">Photo</Label>
          <div className="flex items-center gap-4">
            <div className="grid size-24 shrink-0 place-items-center overflow-hidden border bg-muted/40">
              {v.image ? (
                <MediaImage image={v.image} alt="" width={192} height={192} sizes="96px" className="size-24 object-cover" />
              ) : (
                <ImagePlus className="size-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <UploadButton
                restaurantId={restaurant.id}
                onUploaded={(ref) => set("image", ref)}
                onError={(m) => toast.error(m)}
              >
                {(open, loading) => (
                  <Button type="button" variant="outline" size="sm" onClick={open} disabled={loading}>
                    {loading ? "Loading…" : v.image ? "Replace photo" : "Upload photo"}
                  </Button>
                )}
              </UploadButton>
              {v.image && (
                <Button type="button" variant="ghost" size="sm" onClick={() => set("image", null)}>
                  <X className="size-3.5" /> Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        <LangFields
          id="dish-desc"
          label="Description"
          languages={restaurant.enabled_languages}
          defaultLang={restaurant.default_language}
          value={v.description}
          onChange={(m) => set("description", m)}
          multiline
          placeholder="A line or two. Ingredients, provenance."
        />

        <LangFields
          id="dish-context"
          label="What to expect"
          languages={restaurant.enabled_languages}
          defaultLang={restaurant.default_language}
          value={v.context}
          onChange={(m) => set("context", m)}
          multiline
          placeholder="Plain words for a first-time diner: e.g. cured pork cheek, like a silkier bacon."
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dish-price" className="label-caps">Price ({currencySymbol(cur)})</Label>
            <Input
              id="dish-price"
              inputMode="decimal"
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dish-cat" className="label-caps">Category</Label>
            <NativeSelect id="dish-cat" value={v.category} onChange={(e) => set("category", e.target.value)}>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {resolveText(c.name, restaurant.default_language, restaurant.default_language)}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className="label-caps mb-2">Allergens</legend>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
            {ALLERGENS.map((a) => (
              <label key={a.key} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={v.allergens.includes(a.key)}
                  onCheckedChange={(c) =>
                    set(
                      "allergens",
                      c === true ? [...v.allergens, a.key] : v.allergens.filter((x) => x !== a.key),
                    )
                  }
                />
                {a.en}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dish-spice" className="label-caps">Spice level</Label>
            <NativeSelect id="dish-spice" value={v.spice_level} onChange={(e) => set("spice_level", Number(e.target.value))}>
              <option value={0}>Not spicy</option>
              <option value={1}>Mild</option>
              <option value={2}>Medium</option>
              <option value={3}>Hot</option>
            </NativeSelect>
          </div>
          <fieldset className="space-y-2">
            <legend className="label-caps mb-2">Dietary</legend>
            <div className="grid grid-cols-1 gap-y-2">
              {DIETARY_OPTIONS.map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={v.dietary.includes(key)}
                    onCheckedChange={(c) =>
                      set("dietary", c === true ? [...v.dietary, key] : v.dietary.filter((x) => x !== key))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Shown to diners in their language from a fixed vocabulary, never machine translated.</p>
          </fieldset>
        </div>

        <div className="flex items-center justify-between border-t pt-5">
          <Label htmlFor="dish-avail" className="flex flex-col items-start gap-0.5 text-left">
            <span className="label-caps">Available tonight</span>
            <span className="text-xs font-normal text-muted-foreground">Unavailable dishes are hidden from the public menu.</span>
          </Label>
          <Switch id="dish-avail" checked={v.available} onCheckedChange={(c) => set("available", c)} />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={pending || !v.name[restaurant.default_language]?.trim()}>
            {pending ? "Saving…" : dish ? "Save dish" : "Add dish"}
          </Button>
        </DialogFooter>
    </form>
  );
}
