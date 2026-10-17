"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { LangFields } from "@/components/admin/LangFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { EXPERIMENTAL, SUPPORTED, type LangMap } from "@/lib/i18n";
import type { RestaurantFormValues } from "@/lib/validation";
import {
  createRestaurant,
  updateRestaurant,
} from "@/app/(admin)/admin/(app)/restaurants/actions";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "INR", "AED", "JPY"];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function RestaurantForm({
  restaurantId,
  initial,
}: {
  restaurantId?: string;
  initial: RestaurantFormValues;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState<RestaurantFormValues>(initial);
  const [slugTouched, setSlugTouched] = useState(!!restaurantId);

  const set = <K extends keyof RestaurantFormValues>(k: K, val: RestaurantFormValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  function setName(name: LangMap) {
    setV((p) => ({
      ...p,
      name,
      slug: slugTouched ? p.slug : slugify(name[p.default_language] ?? ""),
    }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      if (restaurantId) {
        const res = await updateRestaurant(restaurantId, v);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Saved. The public menu is refreshing.");
        router.refresh();
      } else {
        const res = await createRestaurant(v);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Restaurant created.");
        router.push(`/admin/restaurants/${res.data.id}`);
      }
    });
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-10">
      <LangFields
        id="r-name"
        label="Restaurant name"
        languages={v.enabled_languages}
        defaultLang={v.default_language}
        value={v.name}
        onChange={setName}
        placeholder="e.g. Trattoria Alba"
      />

      <div className="space-y-2">
        <Label htmlFor="slug" className="label-caps">Menu address</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">/m/</span>
          <Input
            id="slug"
            value={v.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", slugify(e.target.value));
            }}
            required
          />
        </div>
        {restaurantId && (
          <p className="text-xs text-muted-foreground">
            Printed QR codes keep working if you change this, but anyone who bookmarked the old address will lose it.
          </p>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="default-lang" className="label-caps">Default language</Label>
          <NativeSelect
            id="default-lang"
            value={v.default_language}
            onChange={(e) => {
              const code = e.target.value;
              setV((p) => ({
                ...p,
                default_language: code,
                enabled_languages: [...new Set([...p.enabled_languages, code])],
              }));
            }}
          >
            <optgroup label="Well supported">
              {SUPPORTED.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} · {l.native}
                </option>
              ))}
            </optgroup>
            <optgroup label="Experimental">
              {EXPERIMENTAL.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} · {l.native}
                </option>
              ))}
            </optgroup>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency" className="label-caps">Currency</Label>
          <NativeSelect id="currency" value={v.currency} onChange={(e) => set("currency", e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="border-s-2 border-ornament ps-4 text-sm text-muted-foreground">
        <p className="label-caps text-foreground">Languages offered to diners</p>
        <p className="mt-1">
          {restaurantId
            ? "Choose them on the Translations tab: tick the languages and press Generate."
            : "After creating the restaurant, choose its languages on the Translations tab."}{" "}
          {v.enabled_languages.length > 1 ? `Currently offering ${v.enabled_languages.length} (including ${v.default_language}).` : ""}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status" className="label-caps">Status</Label>
        <NativeSelect
          id="status"
          value={v.status}
          onChange={(e) => set("status", e.target.value as RestaurantFormValues["status"])}
          className="max-w-xs"
        >
          <option value="draft">Draft — menu not public</option>
          <option value="live">Live — menu is public</option>
          <option value="archived">Archived</option>
        </NativeSelect>
      </div>

      <div className="flex items-center gap-3 border-t pt-8">
        <Button type="submit" size="lg" disabled={pending} className="label-caps">
          {pending ? "Saving…" : restaurantId ? "Save changes" : "Create restaurant"}
        </Button>
      </div>
    </form>
  );
}
