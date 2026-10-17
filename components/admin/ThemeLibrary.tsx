"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Pencil, Trash2, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ThemeGallery, type GalleryTheme } from "@/components/admin/ThemeGallery";
import { Button } from "@/components/ui/button";
import { deleteCustomTheme, duplicateCustomTheme } from "@/app/(admin)/admin/(app)/themes/actions";

/** Every theme in one place: presets can be used as a starting point, custom themes can be edited, copied or deleted. */
export function ThemeLibrary({ themes }: { themes: GalleryTheme[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [toDelete, setToDelete] = useState<GalleryTheme | null>(null);
  const idOf = (t: GalleryTheme) => t.ref.slice(t.ref.indexOf(":") + 1);

  const duplicate = (t: GalleryTheme) =>
    start(async () => {
      const res = await duplicateCustomTheme(idOf(t));
      if (!res.ok) return void toast.error(res.error);
      toast.success("Copied");
      router.push(`/admin/themes/${res.data.id}`);
    });

  const remove = (t: GalleryTheme) =>
    start(async () => {
      const res = await deleteCustomTheme(idOf(t));
      if (!res.ok) return void toast.error(res.error);
      toast.success(`Deleted “${t.name}”`);
      router.refresh();
    });

  return (
    <>
      <ThemeGallery
        themes={themes}
        actions={(t) =>
          t.custom ? (
            <>
              <Button size="sm" variant="ghost" nativeButton={false} render={<Link href={`/admin/themes/${idOf(t)}`} />}>
                <Pencil className="size-3.5" /> Edit
              </Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => duplicate(t)}>
                <Copy className="size-3.5" /> Copy
              </Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => setToDelete(t)} className="ms-auto text-destructive">
                <Trash2 className="size-3.5" /> <span className="sr-only">Delete {t.name}</span>
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" nativeButton={false} render={<Link href={`/admin/themes/new?from=${encodeURIComponent(t.ref)}`} />}>
              <WandSparkles className="size-3.5" /> Customise a copy
            </Button>
          )
        }
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete “${toDelete?.name ?? ""}”?`}
        description="Restaurants using it must be switched to another theme first; if any still use it, nothing is deleted."
        confirmLabel="Delete theme"
        onConfirm={() => toDelete && remove(toDelete)}
      />
    </>
  );
}
