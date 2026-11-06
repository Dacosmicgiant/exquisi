"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { ShowMoreButton, useShowMore } from "@/components/admin/Collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { QrCode } from "@/lib/db/types";
import { createQr, renameQr } from "@/app/(admin)/admin/(app)/restaurants/[id]/qr/actions";

export function QrManager({
  restaurantId,
  codes,
  urls,
  address,
  unconfigured = false,
}: {
  restaurantId: string;
  codes: QrCode[];
  urls: Record<string, string>;
  /** the public address the codes point to, without https:// */
  address: string;
  /** production without a public address configured: these codes must not be printed */
  unconfigured?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [label, setLabel] = useState("");
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const matching = codes.filter((c) => !needle || c.label.toLowerCase().includes(needle));
  // each card loads a QR image, so a long list is revealed in steps (a search shows every match)
  const more = useShowMore(matching.length, 6, 6);
  const list = needle ? matching : matching.slice(0, more.limit);

  function add(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await createQr(restaurantId, label);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("QR code created");
      setLabel("");
      router.refresh();
    });
  }

  const img = (id: string) => `/api/admin/qr/${id}/png?r=${restaurantId}`;
  const dl = (id: string, fmt: "png" | "pdf") => `/api/admin/qr/${id}/${fmt}?r=${restaurantId}&download=1`;

  return (
    <div className="space-y-10">
      <p className="max-w-xl text-muted-foreground">
        One code per table or location. A code’s address never changes, so printed cards keep working even if the menu is renamed.
        New codes point to <b className="text-foreground">{address}</b>; cards printed earlier on a previous address keep working too.
      </p>
      {unconfigured && (
        <p className="max-w-xl border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          The app’s public address is not set, so these codes point to a local address. Do not print or send them until it is configured.
        </p>
      )}
      <form onSubmit={add} className="flex max-w-md gap-2">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Table 4, Terrace, Bar…" aria-label="Table or location" />
        <Button type="submit" disabled={pending}>
          <Plus className="size-4" /> New code
        </Button>
      </form>

      {codes.length === 0 && <p className="border border-dashed p-10 text-center text-muted-foreground">No QR codes yet.</p>}
      {codes.length > 6 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[12rem] max-w-xs flex-1">
            <Search className="pointer-events-none absolute top-1/2 start-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search codes" aria-label="Search QR codes" className="ps-8" />
          </div>
          <p className="text-sm text-muted-foreground" role="status">{needle ? `${matching.length} of ${codes.length}` : `${codes.length} codes`}</p>
        </div>
      )}
      {codes.length > 0 && needle && matching.length === 0 && <p className="text-sm text-muted-foreground">No code matches “{q}”.</p>}
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <li key={c.id} className="border bg-card p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(c.id)} alt={`QR code ${c.label}`} className="mx-auto aspect-square w-44 border bg-white p-1" />
            <Input
              defaultValue={c.label}
              aria-label="Label"
              className="mt-4 text-center"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== c.label) start(async () => { const r = await renameQr(restaurantId, c.id, v); if (!r.ok) toast.error(r.error); else router.refresh(); });
              }}
            />
            <p className="mt-2 truncate text-center text-xs text-muted-foreground" title={urls[c.id]}>{urls[c.id]}</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" size="sm" nativeButton={false} render={<a href={dl(c.id, "png")} />}>
                <Download className="size-3.5" /> PNG
              </Button>
              <Button variant="outline" size="sm" nativeButton={false} render={<a href={dl(c.id, "pdf")} />}>
                <Download className="size-3.5" /> PDF card
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {!needle && <ShowMoreButton total={matching.length} limit={more.limit} onMore={more.more} onAll={more.all} noun="codes" />}
    </div>
  );
}
