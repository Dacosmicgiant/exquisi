"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { parseMenuText } from "@/lib/import/parse";
import { importDishes } from "@/app/(admin)/admin/(app)/restaurants/[id]/menu/actions";

export function MenuImportDialog({ restaurantId, open, onOpenChange, currency }: { restaurantId: string; open: boolean; onOpenChange: (o: boolean) => void; currency: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Import a menu</DialogTitle>
        </DialogHeader>
        <ImportForm restaurantId={restaurantId} currency={currency} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ImportForm({ restaurantId, currency, onDone }: { restaurantId: string; currency: string; onDone: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseMenuText(text), [text]);
  const cats = new Set(parsed.rows.map((r) => r.category));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Paste rows from a spreadsheet or document: <b>category, name, description, price</b> (tab or comma separated; a header row is optional).
        New categories are created. Written in the restaurant’s default language, then translated automatically.
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={9}
        className="font-mono text-xs"
        placeholder={"Antipasti\tBurrata di Andria\tDatterini tomatoes, basil oil\t18\nPrimi\tCacio e Pepe\tTonnarelli, pecorino romano, black pepper\t16"}
        aria-label="Menu rows"
      />
      {text.trim() && (
        <div className="border bg-card/50 p-3 text-sm">
          <p>
            <b>{parsed.rows.length}</b> dishes in <b>{cats.size}</b> {cats.size === 1 ? "category" : "categories"} ready ({currency}).
          </p>
          {parsed.errors.length > 0 && (
            <ul className="mt-2 list-disc ps-5 text-xs text-destructive">
              {parsed.errors.slice(0, 6).map((e) => (
                <li key={e}>{e}</li>
              ))}
              {parsed.errors.length > 6 && <li>…and {parsed.errors.length - 6} more</li>}
            </ul>
          )}
        </div>
      )}
      <DialogFooter>
        <Button
          disabled={pending || parsed.rows.length === 0}
          onClick={() =>
            start(async () => {
              const res = await importDishes(restaurantId, text);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success(`Imported ${res.data.created} dishes${res.data.newCategories ? ` and ${res.data.newCategories} categories` : ""}. Translating in the background…`);
              router.refresh();
              onDone();
            })
          }
        >
          {pending ? "Importing…" : `Import ${parsed.rows.length || ""} dishes`}
        </Button>
      </DialogFooter>
    </div>
  );
}
