import { notFound } from "next/navigation";
import { QrManager } from "@/components/admin/QrManager";
import { ShareLinks } from "@/components/admin/ShareLinks";
import { getLanguage } from "@/lib/i18n/languages";
import { restaurants } from "@/lib/db/platform";
import { forTenant } from "@/lib/db/tenant";
import { menuAddress, qrTargetUrl } from "@/lib/qr/generate";

export const metadata = { title: "QR codes" };

export default async function QrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await restaurants.get(id);
  if (!r) notFound();
  const codes = await forTenant(r.id).qrCodes.list();
  const langs = r.enabled_languages.filter((l) => l !== r.default_language);
  const addresses: Record<string, string> = { "": menuAddress(r.slug) };
  for (const l of [r.default_language, ...langs]) addresses[l] = menuAddress(r.slug, l);
  return (
    <div className="space-y-14">
      <ShareLinks
        restaurantName={r.name[r.default_language] ?? r.slug}
        addresses={addresses}
        languages={[r.default_language, ...langs].map((c) => ({ code: c, native: getLanguage(c).native }))}
      />
      <QrManager restaurantId={r.id} codes={codes} urls={Object.fromEntries(codes.map((c) => [c.id, qrTargetUrl(c.code)]))} />
    </div>
  );
}
