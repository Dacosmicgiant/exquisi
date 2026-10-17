"use client";

import { useState } from "react";
import { DialogActions, DialogBody, DialogTop, FormSection, scrollDialog } from "@/components/admin/DialogLayout";
import { TranslationsPanel } from "@/components/admin/TranslationsPanel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setLangRaw, type LangMap } from "@/lib/i18n";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  languages: string[];
  defaultLang: string;
  initial?: LangMap;
  title: string;
  pending: boolean;
  onSubmit: (name: LangMap) => void;
};

export function CategoryDialog({ open, onOpenChange, title, ...form }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${scrollDialog} sm:max-w-lg`}>
        {/* mounted only while open, so state starts fresh from `initial` each time */}
        <CategoryForm title={title} onOpenChange={onOpenChange} {...form} />
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({
  title,
  languages,
  defaultLang,
  initial,
  pending,
  onSubmit,
  onOpenChange,
}: Omit<Props, "open">) {
  const [name, setName] = useState<LangMap>(initial ?? {});
  const ok = !!name[defaultLang]?.trim();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(name);
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <DialogTop>
        <DialogTitle className="text-2xl">{title}</DialogTitle>
        <DialogDescription className="mt-1">A course or section of the menu: Antipasti, Mains, Desserts, Drinks…</DialogDescription>
      </DialogTop>
      <DialogBody>
        <FormSection title="Name">
          <div className="space-y-2">
            <Label htmlFor="cat-name" className="label-caps">Category name <span className="text-highlight">*</span></Label>
            <Input
              id="cat-name"
              lang={defaultLang}
              autoFocus
              value={name[defaultLang] ?? ""}
              onChange={(e) => setName(setLangRaw(name, defaultLang, e.target.value))}
              placeholder="e.g. Antipasti"
            />
          </div>
        </FormSection>
        <FormSection title="Translations">
          <TranslationsPanel languages={languages} defaultLang={defaultLang} fields={[{ key: "cat", label: "Category name", value: name, onChange: setName }]} />
        </FormSection>
      </DialogBody>
      <DialogActions note={ok ? undefined : "Give the category a name to save it."}>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !ok}>
          {pending ? "Saving…" : "Save category"}
        </Button>
      </DialogActions>
    </form>
  );
}
