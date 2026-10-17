import { NextResponse, type NextRequest } from "next/server";
import { getStaff } from "@/lib/auth/session";
import { restaurants } from "@/lib/db/platform";
import { forTenant } from "@/lib/db/tenant";
import { qrPdf, qrPng, qrTargetUrl } from "@/lib/qr/generate";

// Staff-only QR downloads: /api/admin/qr/{qrId}/png|pdf?r={restaurantId}
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; format: string }> }) {
  if (!(await getStaff())) return new NextResponse("Unauthorized", { status: 401 });
  const { id, format } = await params;
  const rid = req.nextUrl.searchParams.get("r") ?? "";
  const restaurant = await restaurants.get(rid);
  if (!restaurant || (format !== "png" && format !== "pdf")) return new NextResponse("Not found", { status: 404 });
  const qr = await forTenant(restaurant.id).qrCodes.get(id).catch(() => null);
  if (!qr) return new NextResponse("Not found", { status: 404 });

  const url = qrTargetUrl(qr.code, req.nextUrl.origin);
  const safe = `${restaurant.slug}-${qr.label || qr.code}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const download = req.nextUrl.searchParams.get("download") === "1";
  const disposition = `${download ? "attachment" : "inline"}; filename="${safe}.${format}"`;

  if (format === "png") {
    return new NextResponse(new Uint8Array(await qrPng(url)), { headers: { "content-type": "image/png", "content-disposition": disposition, "cache-control": "private, max-age=3600" } });
  }
  const pdf = await qrPdf({ url, restaurantName: restaurant.name[restaurant.default_language] ?? restaurant.slug, label: qr.label });
  return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": disposition } });
}
