import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  live: "border-primary/40 bg-primary/10 text-primary dark:text-primary",
  draft: "border-ornament/50 bg-ornament/10 text-ornament",
  archived: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "label-caps inline-flex items-center border px-2 py-0.5 text-[0.62rem]",
        STYLES[status] ?? STYLES.archived,
        className,
      )}
    >
      {status}
    </span>
  );
}
