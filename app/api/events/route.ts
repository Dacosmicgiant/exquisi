import type { NextRequest } from "next/server";
import { restaurants } from "@/lib/db/platform";
import { forTenant } from "@/lib/db/tenant";
import { isKnownLanguage } from "@/lib/i18n/languages";
import { eventSchema } from "@/lib/validation";

/**
 * Anonymous diner analytics. Public, fire-and-forget (sendBeacon): always answers fast with an empty
 * body, never reveals whether an event was kept, and validates that the dish belongs to the
 * restaurant named by the slug (forTenant().events.record).
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 90;
const hits = new Map<string, { n: number; reset: number }>();

function limited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { n: 1, reset: now + WINDOW_MS });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return false;
  }
  return ++h.n > MAX_PER_WINDOW;
}

// slug → restaurant id, remembered briefly so beacons don't each hit the database twice
const slugCache = new Map<string, { id: string | null; until: number }>();
async function restaurantId(slug: string): Promise<string | null> {
  const hit = slugCache.get(slug);
  if (hit && hit.until > Date.now()) return hit.id;
  const r = await restaurants.bySlug(slug);
  const id = r && r.status === "live" ? r.id : null;
  slugCache.set(slug, { id, until: Date.now() + 60_000 });
  return id;
}

const empty = (status: number) => new Response(null, { status, headers: { "cache-control": "no-store" } });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) return empty(429);
  const raw = await req.text().catch(() => "");
  if (raw.length > 2000) return empty(413);
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return empty(400);
  }
  const parsed = eventSchema.safeParse(json);
  if (!parsed.success || !isKnownLanguage(parsed.data.language)) return empty(400);
  const e = parsed.data;
  try {
    const id = await restaurantId(e.slug);
    if (id) {
      await forTenant(id).events.record({
        type: e.type,
        session_id: e.session_id,
        language: e.language,
        dish_id: e.dish_id || null,
        story_id: e.story_id || null,
      });
    }
  } catch (err) {
    console.error("[events]", err);
  }
  return empty(204);
}
