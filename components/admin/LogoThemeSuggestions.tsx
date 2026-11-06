"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ImagePlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ThemeCard, ThemeFontFaces, type GalleryTheme } from "@/components/admin/ThemeGallery";
import { Button } from "@/components/ui/button";
import type { ImageRef } from "@/lib/db/types";
import { buildImageUrl } from "@/lib/media/urls";
import { extractPalette, type LogoPalette } from "@/lib/theme/logo";
import { categoryLabel, customRef } from "@/lib/theme/presets";
import type { Theme } from "@/lib/theme/schema";
import { suggestThemes } from "@/lib/theme/suggest";
import { createCustomTheme } from "@/app/(admin)/admin/(app)/themes/actions";

type Result = { id: string; palette?: LogoPalette; error?: boolean };

/** Reads the logo's pixels in the browser (small copy, canvas). Cloudinary sends CORS headers, so the canvas stays readable. */
async function readPixels(url: string): Promise<Uint8ClampedArray> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();
  const longest = Math.max(img.naturalWidth, img.naturalHeight) || 128;
  const scale = Math.min(1, 128 / longest);
  const w = Math.max(1, Math.round((img.naturalWidth || 128) * scale));
  const h = Math.max(1, Math.round((img.naturalHeight || 128) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}

/**
 * "Suggested from your logo": reads the logo's colours and offers three themes built around them. Choosing one saves it
 * to the shared theme library and selects it for this restaurant (staff still press Save theme to apply it).
 */
export function LogoThemeSuggestions({
  logo,
  brandName,
  houseTheme,
  onUse,
}: {
  logo: ImageRef | null;
  brandName: string;
  houseTheme: Theme;
  onUse: (option: GalleryTheme) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const id = logo?.public_id ?? "";
  const [res, setRes] = useState<Result | null>(null);

  useEffect(() => {
    if (!id) return;
    let live = true;
    (async () => {
      try {
        const data = await readPixels(buildImageUrl(id, { width: 160 }));
        if (live) setRes({ id, palette: extractPalette(data) });
      } catch {
        if (live) setRes({ id, error: true });
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);

  const loading = !!id && res?.id !== id;
  const palette = res?.id === id ? res.palette : undefined;
  const suggestions = useMemo(() => (palette ? suggestThemes(palette, { base: houseTheme, brandName }) : []), [palette, houseTheme, brandName]);

  const use = (s: (typeof suggestions)[number]) =>
    start(async () => {
      const created = await createCustomTheme({ name: s.name, category: s.category, theme: s.theme });
      if (!created.ok) {
        toast.error(created.error);
        return;
      }
      onUse({ ref: customRef(created.data.id), name: s.name, category: s.category, categoryLabel: categoryLabel(s.category), description: s.description, custom: true, theme: s.theme });
      toast.success(`Saved “${s.name}” to your themes and selected it. Press Save theme to apply it.`);
      router.refresh();
    });

  return (
    <section aria-labelledby="logo-themes" className="mb-10 border bg-card/50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="logo-themes" className="flex items-center gap-2 text-xl">
          <Sparkles className="size-4 text-ornament" aria-hidden="true" /> Suggested from your logo
        </h3>
        {palette && palette.colors.length > 0 && (
          <ul className="flex items-center gap-2" aria-label="Colours found in the logo">
            {palette.colors.map((c) => (
              <li key={c.hex} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-4 rounded-full border" style={{ background: c.hex }} aria-hidden="true" />
                <span className="font-mono">{c.hex}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!logo && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <ImagePlus className="size-4 shrink-0" aria-hidden="true" />
          Upload a logo (Fine-tune → Logo, further down) and we will suggest three themes in its colours.
        </p>
      )}
      {logo && loading && <p className="mt-3 text-sm text-muted-foreground" role="status">Reading your logo’s colours…</p>}
      {logo && res?.id === id && res.error && (
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          We could not read the logo’s colours (the image may be blocked by the browser). Upload it again, or pick a theme below.
        </p>
      )}
      {palette && (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            {palette.colors.length > 0
              ? "Three looks that follow the colours in your logo. Each is a full light and dark theme; use one as is, then fine-tune it below."
              : "Your logo has no strong colour of its own (it is black and white or grey), so each theme pairs it with a different accent."}
          </p>
          <ThemeFontFaces />
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {suggestions.map((s, i) => (
              <ThemeCard
                key={s.id}
                option={{ ref: `suggest:${s.id}`, name: s.name, category: s.category, categoryLabel: categoryLabel(s.category), description: s.description, custom: false, theme: s.theme }}
                index={800 + i}
                selected={false}
                actions={
                  <>
                    <p className="basis-full px-1 pb-1 text-xs text-muted-foreground">{s.description}</p>
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => use(s)}>
                      Use this theme
                    </Button>
                  </>
                }
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
