import { notFound } from "next/navigation";
import { QrManager } from "@/components/admin/QrManager";
import { restaurants } from "@/lib/db/platform";
import { forTenant } from "@/lib/db/tenant";
import { qrTargetUrl } from "@/lib/qr/generate";

export const metadata = { title: "QR codes" };

export default async function QrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await restaurants.get(id);
  if (!r) notFound();
  const codes = await forTenant(r.id).qrCodes.list();
  return <QrManager restaurantId={r.id} codes={codes} urls={Object.fromEntries(codes.map((c) => [c.id, qrTargetUrl(c.code)]))} />;
}
