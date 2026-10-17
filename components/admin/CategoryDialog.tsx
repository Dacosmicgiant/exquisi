"use client";

import { useState } from "react";
import { LangFields } from "@/components/admin/LangFields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LangMap } from "@/lib/i18n";

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
        </DialogHeader>
        {/* mounted only while open, so state starts fresh from `initial` each time */}
        <CategoryForm {...form} />
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({ languages, defaultLang, initial, pending, onSubmit }: Omit<Props, "open" | "onOpenChange" | "title">) {
  const [name, setName] = useState<LangMap>(initial ?? {});
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(name);
      }}
      className="space-y-6"
    >
      <LangFields
        id="cat-name"
        label="Category name"
        languages={languages}
        defaultLang={defaultLang}
        value={name}
        onChange={setName}
        placeholder="e.g. Antipasti"
      />
      <DialogFooter>
        <Button type="submit" disabled={pending || !name[defaultLang]?.trim()}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}
