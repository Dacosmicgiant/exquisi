export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b pb-8">
      <div className="min-w-0">
        {eyebrow && <p className="label-caps text-ornament">{eyebrow}</p>}
        <h1 className="mt-2 text-4xl leading-tight sm:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
