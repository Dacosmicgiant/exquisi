/**
 * Demo data: one restaurant (Casa Valdarno) with 4 categories, 10 dishes, 2 written stories
 * (one reused by two dishes), a glossary and 2 QR codes. The same sample menu feeds
 * `npm run quality`. Safe to re-run: replaces dishes/stories, keeps QR codes (printed
 * codes never change) and any staff-edited translations on the restaurant itself.
 *
 * Media uses Cloudinary's public `demo` cloud via `demo/…` public ids.  Run: npm run seed
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import type { DishInput, ImageRef, StoryInput } from "../lib/db/types";
import { SAMPLE_CATEGORIES, SAMPLE_DISHES, SAMPLE_GLOSSARY, SAMPLE_STORIES } from "../lib/translate/sample-menu";

const img = (id: string): ImageRef => ({ provider: "cloudinary", public_id: `demo/${id}` });

async function main() {
  const { restaurants, users } = await import("../lib/db/platform");
  const { forTenant } = await import("../lib/db/tenant");

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const u = await users.upsert(process.env.ADMIN_EMAIL, await bcrypt.hash(process.env.ADMIN_PASSWORD, 12));
    console.log(`staff: ${u.email}`);
  }

  const base = {
    slug: "casa-valdarno",
    name: { en: "Casa Valdarno" },
    default_language: "en",
    // the restaurant's chosen languages; the pipeline translates these at publish time
    enabled_languages: ["en", "it", "fr", "de", "es", "hi", "ar", "ja"],
    currency: "EUR",
    status: "live" as const,
    brand: {},
    allow_experimental: true,
  };
  const existing = await restaurants.bySlug(base.slug);
  const r = existing ? await restaurants.update(existing.id, base) : await restaurants.create(base);
  const db = forTenant(r.id);

  // reset content (tenant-scoped)
  for (const d of await db.dishes.list()) await db.dishes.remove(d.id);
  for (const s of await db.stories.list()) await db.stories.remove(s.id);
  for (const c of await db.categories.list()) await db.categories.remove(c.key).catch(() => undefined);
  await db.i18n.glossary.set(SAMPLE_GLOSSARY);

  const cats = new Map<string, string>();
  for (const name of SAMPLE_CATEGORIES) cats.set(name, (await db.categories.add({ en: name })).key);

  const stories = new Map<string, string>();
  for (const [key, s] of Object.entries(SAMPLE_STORIES)) {
    const input: StoryInput = {
      title: { en: s.title },
      text_fallback: { en: s.body },
      video: { provider: "cloudinary", public_id: s.video.public_id, duration: s.video.duration },
      poster: s.poster ? img(s.poster) : null,
      audio_tracks: [],
      subtitles: [],
      status: "live",
    };
    stories.set(key, (await db.stories.create(input)).id);
  }

  for (const d of SAMPLE_DISHES) {
    const input: DishInput = {
      category: cats.get(d.category)!,
      name: { en: d.name },
      description: { en: d.description },
      context: { en: d.context },
      spice_level: d.spice_level,
      dietary: d.dietary,
      price: d.price,
      allergens: d.allergens,
      image: d.image ? img(d.image) : null,
      order: 0,
      available: true,
      story_ids: d.story ? [stories.get(d.story)!] : [],
    };
    await db.dishes.create(input);
  }

  const have = (await db.qrCodes.list()).map((q) => q.label);
  for (const label of ["Table 1", "Table 2"]) if (!have.includes(label)) await db.qrCodes.create(label);
  const qr = await db.qrCodes.list();

  const app = process.env.APP_URL ?? "http://localhost:3000";
  console.log(`\nrestaurant: ${r.name.en}  (${r.id})`);
  console.log(`menu:       ${app}/m/${r.slug}`);
  for (const q of qr) console.log(`qr:         ${app}/r/${q.code}   (${q.label})`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
