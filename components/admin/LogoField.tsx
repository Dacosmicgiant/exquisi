"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ImageRef } from "@/lib/db/types";
import { MediaImage } from "@/lib/media/MediaImage";
import { UploadButton } from "@/lib/media/UploadButton";
import { saveLogo } from "@/app/(admin)/admin/(app)/restaurants/[id]/brand/actions";

export function LogoField({ restaurantId, logo }: { restaurantId: string; logo: ImageRef | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const apply = (next: ImageRef | null) =>
    start(async () => {
      const res = await saveLogo(restaurantId, next);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(next ? "Logo saved" : "Logo removed");
      router.refresh();
    });

  return (
    <section>
      <h2 className="border-b pb-3 text-2xl">Logo</h2>
      <p className="mt-3 text-sm text-muted-foreground">Shown at the top of the menu in place of the name. A wide, transparent PNG works best.</p>
      <div className="mt-4 flex items-center gap-4">
        <div className="grid h-20 w-40 place-items-center overflow-hidden border bg-card">
          {logo ? <MediaImage image={logo} alt="Logo" width={320} height={160} crop={false} className="h-16 w-auto object-contain" /> : <ImagePlus className="size-6 text-muted-foreground" />}
        </div>
        <div className="flex flex-wrap gap-2">
          <UploadButton restaurantId={restaurantId} onUploaded={(ref) => apply(ref)} onError={(m) => toast.error(m)}>
            {(open, loading) => (
              <Button variant="outline" size="sm" onClick={open} disabled={loading || pending}>
                {logo ? "Replace logo" : "Upload logo"}
              </Button>
            )}
          </UploadButton>
          {logo && (
            <Button variant="ghost" size="sm" onClick={() => apply(null)} disabled={pending}>
              <X className="size-3.5" /> Remove
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
