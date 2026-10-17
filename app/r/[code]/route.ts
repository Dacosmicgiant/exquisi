import { NextResponse, type NextRequest } from "next/server";
import { resolveQrCode } from "@/lib/db/platform";
import { findLanguage } from "@/lib/i18n/languages";

/**
 * The permanent short URL printed on tables: /r/{code}. The code is never edited or reused, and the
 * destination is looked up at scan time, so a restaurant can rename its slug without breaking
 * printed QR codes. A returning diner who already chose a language (cookie `ms-lang`) goes
 * straight to their menu; everyone else lands on the language screen.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[a-z0-9]{4,12}$/i.test(code)) return NextResponse.redirect(new URL("/", req.url));

  const hit = await resolveQrCode(code);
  if (!hit) return NextResponse.redirect(new URL("/", req.url)); // a printed code never errors

  if (hit.status !== "live") {
    return new NextResponse(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Menu unavailable</title><body style="font-family:Georgia,serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f4eee1;color:#1e1a16;text-align:center"><p style="max-width:20rem;line-height:1.6">This menu isn’t available right now.<br>Please ask your server for help.</p>`,
      { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
    );
  }

  // only jump straight to a remembered language this restaurant actually offers
  const saved = findLanguage(req.cookies.get("ms-lang")?.value);
  const offered = saved && (saved.code === hit.default_language || hit.enabled_languages.includes(saved.code));
  const target = saved && offered ? `/m/${hit.slug}/${saved.code}` : `/m/${hit.slug}`;
  // 307 (not 301): the destination can change, the printed code can't
  const res = NextResponse.redirect(new URL(target, req.url), 307);
  res.headers.set("cache-control", "no-store");
  return res;
}
