"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ThemeEditor } from "@/components/admin/ThemeEditor";
import { ThemeMetaFields } from "@/components/admin/SaveAsThemeButton";
import { mergeTheme } from "@/lib/theme/resolve";
import type { Theme } from "@/lib/theme/schema";
import { createCustomTheme, updateCustomTheme } from "@/app/(admin)/admin/(app)/themes/actions";

/**
 * Build or edit a named custom theme from scratch or from any starting point.
 * `base` is the theme the editor starts from (and "reset" returns to). A new theme can be saved straight away.
 */
export function CustomThemeBuilder({
  existing,
  base,
  startLabel,
  defaultCategory = "fine-dining",
}: {
  existing?: { id: string; name: string; category: string };
  base: Theme;
  startLabel: string;
  defaultCategory?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(existing?.name ?? "");
  const [category, setCategory] = useState(existing?.category ?? defaultCategory);
  const metaChanged = existing ? name !== existing.name || category !== existing.category : true;

  return (
    <ThemeEditor
      base={base}
      initial={base}
      baseLabel={startLabel}
      dirtyExtra={metaChanged}
      saveDisabled={!name.trim()}
      saveLabel={existing ? "Save changes" : "Create theme"}
      savedMessage={existing ? "Saved. Restaurants using this theme are rebuilding." : "Theme created."}
      onSave={async (overrides) => {
        // the editor hands back only what changed from `base`; a saved theme is always complete
        const theme = mergeTheme(base, overrides);
        const res = existing
          ? await updateCustomTheme(existing.id, { name, category, theme })
          : await createCustomTheme({ name, category, theme });
        if (res.ok && !existing) router.push(`/admin/themes/${res.data.id}`);
        return res.ok ? { ok: true } : { ok: false, error: res.error };
      }}
    >
      <section className="space-y-4">
        <h2 className="border-b pb-3 text-2xl">{existing ? "Theme details" : "New theme"}</h2>
        <ThemeMetaFields name={name} category={category} onName={setName} onCategory={setCategory} />
      </section>
    </ThemeEditor>
  );
}
