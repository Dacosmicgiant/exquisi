"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BookmarkPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { THEME_CATEGORIES } from "@/lib/theme/presets";
import type { Theme } from "@/lib/theme/schema";
import { createCustomTheme } from "@/app/(admin)/admin/(app)/themes/actions";

/** Name + category fields shared by this dialog and the custom theme builder. */
export function ThemeMetaFields({
  name,
  category,
  onName,
  onCategory,
}: {
  name: string;
  category: string;
  onName: (v: string) => void;
  onCategory: (v: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="theme-name" className="label-caps">Theme name</Label>
        <Input id="theme-name" value={name} onChange={(e) => onName(e.target.value)} maxLength={60} placeholder="e.g. Terrace Sunset" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="theme-category" className="label-caps">Category</Label>
        <NativeSelect id="theme-category" value={category} onChange={(e) => onCategory(e.target.value)}>
          {THEME_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}

/** "Save what I'm looking at as a named theme", reusable on any restaurant. */
export function SaveAsThemeButton({ theme, defaultCategory = "fine-dining" }: { theme: Theme; defaultCategory?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const res = await createCustomTheme({ name, category, theme });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Saved “${name.trim()}” to your themes. Pick it from the gallery to use it.`);
      setOpen(false);
      setName("");
      router.refresh();
    });

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)} disabled={pending}>
        <BookmarkPlus className="size-4" /> Save as custom theme
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">Save as custom theme</DialogTitle>
            <DialogDescription>Saves the look you are editing now, so any restaurant can start from it later.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-6"
          >
            <ThemeMetaFields name={name} category={category} onName={setName} onCategory={setCategory} />
            <DialogFooter>
              <Button type="submit" disabled={pending || !name.trim()}>
                {pending ? "Saving…" : "Save theme"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
