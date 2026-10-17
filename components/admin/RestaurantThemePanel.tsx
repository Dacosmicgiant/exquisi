"use client";

import Link from "next/link";
import { useState } from "react";
import { HouseStyleCard, ThemeGallery, type GalleryTheme } from "@/components/admin/ThemeGallery";
import { SaveAsThemeButton } from "@/components/admin/SaveAsThemeButton";
import { ThemeEditor } from "@/components/admin/ThemeEditor";
import type { Theme, ThemeOverrides } from "@/lib/theme/schema";

type Save = (themeRef: string | null, overrides: ThemeOverrides) => Promise<{ ok: boolean; error?: string }>;

/**
 * A restaurant's look: pick a theme from the gallery, then fine-tune it. Saving stores the chosen theme
 * plus only the tweaks that differ from it, so a custom theme edited later flows through to its restaurants.
 */
export function RestaurantThemePanel({
  themes,
  houseTheme,
  savedRef,
  savedTheme,
  onSave,
  children,
}: {
  themes: GalleryTheme[];
  /** the platform default look ("House style") */
  houseTheme: Theme;
  /** the theme the restaurant starts from today (null = house style) */
  savedRef: string | null;
  /** the restaurant's effective look today (theme + its tweaks) */
  savedTheme: Theme;
  onSave: Save;
  children?: React.ReactNode;
}) {
  const [ref, setRef] = useState<string | null>(savedRef);
  const current = ref ? themes.find((t) => t.ref === ref) : undefined;
  // a saved reference whose theme was deleted falls back to the house style
  const base = current?.theme ?? houseTheme;
  const initial = ref === savedRef ? savedTheme : base;

  return (
    <div className="space-y-12">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-3">
          <h2 className="text-2xl">Theme</h2>
          <p className="text-sm text-muted-foreground">
            Using <span className="text-foreground">{current?.name ?? "House style"}</span> ·{" "}
            <Link href="/admin/themes" className="underline underline-offset-4">Manage themes</Link>
          </p>
        </div>
        <div className="mt-6">
          <ThemeGallery
            themes={themes}
            selectedRef={ref}
            onSelect={(t) => setRef(t.ref)}
            leading={<HouseStyleCard theme={houseTheme} selected={ref === null || !current} onSelect={() => setRef(null)} />}
          />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Choosing a theme replaces the colours, fonts and shape below. Press <b>Save theme</b> to apply it to this restaurant’s menu.
        </p>
      </section>

      <section>
        <h2 className="border-b pb-3 text-2xl">Fine-tune</h2>
        <div className="mt-6">
          <ThemeEditor
            key={ref ?? "house"}
            base={base}
            initial={initial}
            baseLabel={current?.name ?? "the house style"}
            dirtyExtra={ref !== savedRef}
            onSave={(overrides) => onSave(ref, overrides)}
            extraActions={(working) => <SaveAsThemeButton theme={working} defaultCategory={current?.category && current.category !== "house" ? current.category : undefined} />}
          >
            {children}
          </ThemeEditor>
        </div>
      </section>
    </div>
  );
}
