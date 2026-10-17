import { cn } from "@/lib/utils";

/** Pass as DialogContent's className: a fixed header and footer around a body that scrolls on its own. */
export const scrollDialog = "flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl";

export function DialogTop({ children }: { children: React.ReactNode }) {
  return <div className="border-b px-6 pt-5 pb-4 pe-12">{children}</div>;
}

export function DialogBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("min-h-0 flex-1 space-y-9 overflow-y-auto overscroll-contain px-6 py-6", className)}>{children}</div>;
}

export function DialogActions({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t bg-muted/40 px-6 py-3 sm:py-4">
      {note && <p className="basis-full text-xs text-muted-foreground sm:basis-auto">{note}</p>}
      <div className="ms-auto flex flex-wrap items-center justify-end gap-2">{children}</div>
    </div>
  );
}

/** A titled group inside a dialog body. */
export function FormSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="border-b border-ornament/40 pb-2">
        <h3 className="label-caps text-[0.7rem]">{title}</h3>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** A pill that toggles on and off (allergens, dietary tags, spice levels). */
export function Chip({ pressed, onClick, children, tone = "default" }: { pressed: boolean; onClick: () => void; children: React.ReactNode; tone?: "default" | "warn" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        pressed
          ? tone === "warn"
            ? "border-highlight bg-highlight/10 text-highlight"
            : "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
