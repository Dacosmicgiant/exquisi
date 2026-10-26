"use client";

import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { DialogActions, DialogBody, DialogTop, FormSection, Chip, scrollDialog } from "@/components/admin/DialogLayout";
import { TranslationsPanel } from "@/components/admin/TranslationsPanel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ALLERGENS } from "@/lib/allergens";
import type { Category, Dish, Restaurant } from "@/lib/db/types";
import { resolveText, setLangRaw } from "@/lib/i18n";
import { MediaImage } from "@/lib/media/MediaImage";
import { UploadButton } from "@/lib/media/UploadButton";
import { currencySymbol, toMajor, toMinor } from "@/lib/money";
import type { DishFormValues } from "@/lib/validation";

const DIETARY_OPTIONS: [DishFormValues["dietary"][number], string, "default" | "warn"][] = [
  ["vegetarian", "Vegetarian", "default"],
  ["vegan", "Vegan", "default"],
  ["contains_pork", "Contains pork", "warn"],
  ["contains_beef", "Contains beef", "warn"],
  ["contains_alcohol", "Contains alcohol", "warn"],
];

const SPICE = ["Not spicy", "Mild", "Medium", "Hot"];

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
  /** bump to start a fresh blank form without closing the dialog ("Save & add another") */
  resetKey?: number;
  onSubmit: (values: DishFormValues, opts: { another: boolean }) => void;
};

export function DishDialog({ open, onOpenChange, dish, resetKey = 0, ...form }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={scrollDialog}>
        {/* mounted only while open, so state starts fresh from `dish` each time */}
        <DishForm key={`${dish?.id ?? "new"}-${resetKey}`} dish={dish} onOpenChange={onOpenChange} {...form} />
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
  onOpenChange,
}: Omit<Props, "open" | "resetKey">) {
  const cur = restaurant.currency;
  const lang = restaurant.default_language;
  const [v, setV] = useState<DishFormValues>(() => initialValues(dish, defaultCategory));
  const [priceText, setPriceText] = useState(() => (dish ? String(toMajor(dish.price, cur)) : ""));

  const set = <K extends keyof DishFormValues>(k: K, val: DishFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const toggle = <K extends "allergens" | "dietary">(k: K, item: DishFormValues[K][number]) =>
    setV((p) => {
      const list = p[k] as string[];
      return { ...p, [k]: list.includes(item) ? list.filter((x) => x !== item) : [...list, item] };
    });

  const hasName = !!v.name[lang]?.trim();
  const send = (another: boolean) => {
    const n = Number.parseFloat(priceText.replace(",", "."));
    onSubmit({ ...v, price: Number.isFinite(n) ? toMinor(n, cur) : 0 }, { another });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send(false);
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <DialogTop>
        <DialogTitle className="text-2xl">{dish ? "Edit dish" : "New dish"}</DialogTitle>
        <DialogDescription className="mt-1">
          {dish ? "Changes publish to the live menu within moments." : "Fill in the basics; everything else is optional and can be added later."}
        </DialogDescription>
      </DialogTop>

      <DialogBody>
        <FormSection title="The dish">
          <div className="grid gap-5 sm:grid-cols-[1fr_10rem]">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="dish-name" className="label-caps">Name <span className="text-highlight">*</span></Label>
                <Input
                  id="dish-name"
                  lang={lang}
                  autoFocus
                  value={v.name[lang] ?? ""}
                  onChange={(e) => set("name", setLangRaw(v.name, lang, e.target.value))}
                  placeholder="e.g. Risotto al Nero di Seppia"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dish-desc" className="label-caps">Description</Label>
                <Textarea
                  id="dish-desc"
                  lang={lang}
                  rows={3}
                  value={v.description[lang] ?? ""}
                  onChange={(e) => set("description", setLangRaw(v.description, lang, e.target.value))}
                  placeholder="A line or two. Ingredients, provenance."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="label-caps">Photo</Label>
              <div className="grid aspect-[4/3] w-full max-w-[10rem] place-items-center overflow-hidden border bg-muted/40">
                {v.image ? (
                  <MediaImage image={v.image} alt="" width={320} height={240} sizes="160px" className="size-full object-cover" />
                ) : (
                  <ImagePlus className="size-7 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <UploadButton restaurantId={restaurant.id} onUploaded={(ref) => set("image", ref)} onError={(m) => toast.error(m)}>
                  {(open, loading) => (
                    <Button type="button" variant="outline" size="sm" onClick={open} disabled={loading}>
                      {loading ? "Loading…" : v.image ? "Replace" : "Upload"}
                    </Button>
                  )}
                </UploadButton>
                {v.image && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => set("image", null)}>
                    <X className="size-3.5" /> Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Shown 4:3 on the menu. Landscape works best, at least 1200 × 900 px.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dish-context" className="label-caps">What to expect</Label>
            <Textarea
              id="dish-context"
              lang={lang}
              rows={2}
              value={v.context[lang] ?? ""}
              onChange={(e) => set("context", setLangRaw(v.context, lang, e.target.value))}
              placeholder="Plain words for a first-time diner: e.g. cured pork cheek, like a silkier bacon."
            />
          </div>
        </FormSection>

        <FormSection title="Price & placement">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dish-price" className="label-caps">Price</Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-sm text-muted-foreground" aria-hidden="true">
                  {currencySymbol(cur)}
                </span>
                <Input
                  id="dish-price"
                  inputMode="decimal"
                  value={priceText}
                  onChange={(e) => setPriceText(e.target.value)}
                  placeholder="0"
                  className="ps-8"
                  aria-label={`Price in ${cur}`}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dish-cat" className="label-caps">Category</Label>
              <NativeSelect id="dish-cat" value={v.category} onChange={(e) => set("category", e.target.value)}>
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {resolveText(c.name, lang, lang)}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="dish-avail" className="flex flex-col items-start gap-0.5 text-start">
              <span className="label-caps">Available tonight</span>
              <span className="text-xs font-normal text-muted-foreground">Unavailable dishes are hidden from the public menu.</span>
            </Label>
            <Switch id="dish-avail" checked={v.available} onCheckedChange={(c) => set("available", c)} />
          </div>
        </FormSection>

        <FormSection title="Spice, diet & allergens" hint="Shown to diners in their own language from a fixed, hand-written vocabulary, never machine translated.">
          <div className="space-y-2">
            <p className="label-caps text-[0.65rem]">Spice level</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Spice level">
              {SPICE.map((label, i) => (
                <Chip key={label} pressed={v.spice_level === i} onClick={() => set("spice_level", i)}>
                  {label}
                </Chip>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="label-caps text-[0.65rem]">Dietary</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Dietary">
              {DIETARY_OPTIONS.map(([key, label, tone]) => (
                <Chip key={key} pressed={v.dietary.includes(key)} onClick={() => toggle("dietary", key)} tone={tone}>
                  {label}
                </Chip>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="label-caps text-[0.65rem]">
              Allergens <span className="normal-case tracking-normal text-muted-foreground">· {v.allergens.length} selected</span>
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Allergens">
              {ALLERGENS.map((a) => (
                <Chip key={a.key} pressed={v.allergens.includes(a.key)} onClick={() => toggle("allergens", a.key)} tone="warn">
                  {a.en}
                </Chip>
              ))}
            </div>
          </div>
        </FormSection>

        <FormSection title="Translations">
          <TranslationsPanel
            languages={restaurant.enabled_languages}
            defaultLang={lang}
            fields={[
              { key: "name", label: "Name", value: v.name, onChange: (m) => set("name", m) },
              { key: "description", label: "Description", value: v.description, onChange: (m) => set("description", m), multiline: true },
              { key: "context", label: "What to expect", value: v.context, onChange: (m) => set("context", m), multiline: true },
            ]}
          />
        </FormSection>
      </DialogBody>

      <DialogActions note={hasName ? undefined : "Give the dish a name to save it."}>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
          Cancel
        </Button>
        {!dish && (
          <Button type="button" variant="outline" disabled={pending || !hasName} onClick={() => send(true)}>
            Save &amp; add another
          </Button>
        )}
        <Button type="submit" disabled={pending || !hasName}>
          {pending ? "Saving…" : dish ? "Save dish" : "Add dish"}
        </Button>
      </DialogActions>
    </form>
  );
}
