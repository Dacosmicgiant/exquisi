import { NextResponse, type NextRequest } from "next/server";
import { getStaff } from "@/lib/auth/session";
import { restaurants } from "@/lib/db/platform";
import { SignError, signWidgetParams } from "@/lib/media";

/**
 * Signing endpoint for the Cloudinary upload widget (staff only). The browser uploads straight to
 * Cloudinary; this server only signs the request and never touches the file.
 * POST /api/media/sign?r={restaurantId}&kind=image   body: { paramsToSign }
 */
export async function POST(req: NextRequest) {
  if (!(await getStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rid = req.nextUrl.searchParams.get("r") ?? "";
  const kind = req.nextUrl.searchParams.get("kind") === "video" ? "video" : "image";
  const restaurant = await restaurants.get(rid);
  if (!restaurant) return NextResponse.json({ error: "Unknown restaurant" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { paramsToSign?: Record<string, unknown> } | null;
  if (!body?.paramsToSign || typeof body.paramsToSign !== "object") {
    return NextResponse.json({ error: "paramsToSign is required" }, { status: 400 });
  }
  try {
    const signature = await signWidgetParams({ restaurantId: restaurant.id, kind, params: body.paramsToSign });
    return NextResponse.json({ signature });
  } catch (e) {
    if (e instanceof SignError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}
