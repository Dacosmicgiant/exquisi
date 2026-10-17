import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { resolveQrCode, restaurants } from "@/lib/db/platform";
import { forTenant } from "@/lib/db/tenant";
import { TenantError, type Dish } from "@/lib/db/types";

const dishInput = (name: string) => ({
  category: "antipasti",
  name: { en: name },
  description: {},
  context: {},
  spice_level: 0,
  dietary: [],
  price: 1200,
  allergens: [],
  image: null,
  available: true,
  story_ids: [],
});

let A: string;
let B: string;

beforeAll(async () => {
  const conn = await connectDb();
  expect(conn.connection.name).toBe("menu_stories_test");
  await conn.connection.dropDatabase();
  const base = { name: { en: "x" }, default_language: "en", enabled_languages: ["en"], currency: "EUR", status: "live" as const, brand: {} };
  A = (await restaurants.create({ ...base, slug: "tenant-a" })).id;
  B = (await restaurants.create({ ...base, slug: "tenant-b" })).id;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("forTenant", () => {
  it("requires a valid restaurant id", () => {
    expect(() => forTenant("")).toThrow(TenantError);
    expect(() => forTenant("not-an-id")).toThrow(TenantError);
  });

  it("never lets one tenant see or touch another's dishes", async () => {
    const a = forTenant(A);
    const b = forTenant(B);
    const dish = await a.dishes.create(dishInput("Burrata"));
    await b.dishes.create(dishInput("Tartare"));

    expect((await a.dishes.list()).map((d) => d.name.en)).toEqual(["Burrata"]);
    expect((await b.dishes.list()).map((d) => d.name.en)).toEqual(["Tartare"]);

    expect(await b.dishes.get(dish.id)).toBeNull();
    await expect(b.dishes.update(dish.id, { price: 1 })).rejects.toThrow();
    await b.dishes.remove(dish.id);
    await b.dishes.setAvailability(dish.id, false);
    const still = (await a.dishes.get(dish.id)) as Dish;
    expect(still.price).toBe(1200);
    expect(still.available).toBe(true);
  });

  it("ignores a restaurant_id smuggled into input", async () => {
    const a = forTenant(A);
    const forged = { ...dishInput("Forged"), restaurant_id: B } as never;
    const d = await a.dishes.create(forged);
    expect(d.restaurant_id).toBe(A);
    expect((await forTenant(B).dishes.list()).some((x) => x.id === d.id)).toBe(false);
    const patched = await a.dishes.update(d.id, { restaurant_id: B, price: 5 } as never);
    expect(patched.restaurant_id).toBe(A);
  });

  it("rejects story ids that belong to another tenant", async () => {
    const story = await forTenant(B).stories.create({
      title: { en: "Film" }, video: null, poster: null, text_fallback: {},
      audio_tracks: [], subtitles: [], status: "draft",
    });
    await expect(
      forTenant(A).dishes.create({ ...dishInput("Bad"), story_ids: [story.id] }),
    ).rejects.toThrow(TenantError);
    // …but reuse inside one tenant is fine
    const own = await forTenant(A).stories.create({
      title: { en: "Own" }, video: null, poster: null, text_fallback: {},
      audio_tracks: [], subtitles: [], status: "live",
    });
    const d1 = await forTenant(A).dishes.create({ ...dishInput("One"), story_ids: [own.id] });
    const d2 = await forTenant(A).dishes.create({ ...dishInput("Two"), story_ids: [own.id] });
    expect(d1.story_ids).toEqual(d2.story_ids);
  });

  it("only records events for the tenant's own dishes", async () => {
    const dish = await forTenant(A).dishes.create(dishInput("Evented"));
    const base = { type: "story_play" as const, session_id: "sess-1234abcd", language: "en" };
    expect(await forTenant(A).events.record({ ...base, dish_id: dish.id })).toBe(true);
    expect(await forTenant(B).events.record({ ...base, dish_id: dish.id })).toBe(false);
    const range = { from: new Date(Date.now() - 3600_000), to: new Date(Date.now() + 3600_000) };
    expect((await forTenant(A).analytics.summary(range)).storyPlays).toBe(1);
    expect((await forTenant(B).analytics.summary(range)).storyPlays).toBe(0);
  });

  it("creates permanent unique QR codes that resolve to the right restaurant", async () => {
    const q1 = await forTenant(A).qrCodes.create("Table 1");
    const q2 = await forTenant(A).qrCodes.create("Table 2");
    expect(q1.code).not.toBe(q2.code);
    expect(q1.code).toMatch(/^[a-z2-9]{6}$/);
    const hit = await resolveQrCode(q1.code);
    expect(hit?.slug).toBe("tenant-a");
    expect(hit?.label).toBe("Table 1");
    expect(await resolveQrCode("zzzzzz")).toBeNull();
    expect(await forTenant(B).qrCodes.get(q1.id)).toBeNull();
  });

  it("keeps categories per tenant and refuses to orphan dishes", async () => {
    const a = forTenant(A);
    const cat = await a.categories.add({ en: "Primi Piatti" });
    expect(cat.key).toBe("primi-piatti");
    expect(await forTenant(B).categories.list()).toEqual([]);
    await a.dishes.create({ ...dishInput("Cacio"), category: cat.key });
    await expect(a.categories.remove(cat.key)).rejects.toThrow();
  });
});

describe("analytics events", () => {
  it("counts menu views, language picks and story opens per tenant, by language and dish", async () => {
    const a = forTenant(A);
    const dish = await a.dishes.create(dishInput("Opened"));
    const base = { session_id: "sess-aaaa1111", language: "hi" };
    await a.events.record({ ...base, type: "menu_view" });
    await a.events.record({ ...base, type: "menu_view", session_id: "sess-bbbb2222", language: "it" });
    await a.events.record({ ...base, type: "language_select" });
    await a.events.record({ ...base, type: "story_open", dish_id: dish.id });
    await a.events.record({ ...base, type: "story_open", dish_id: dish.id, session_id: "sess-cccc3333" });
    const range = { from: new Date(Date.now() - 3_600_000), to: new Date(Date.now() + 3_600_000) };
    const s = await a.analytics.summary(range);
    expect(s).toMatchObject({ menuViews: 2, languageSelects: 1, storyOpens: 2, uniqueVisitors: 2 });
    expect((await a.analytics.languages(range)).map((l) => [l.language, l.views, l.selects])).toEqual(expect.arrayContaining([["hi", 1, 1], ["it", 1, 0]]));
    expect(await a.analytics.dishInterest(range)).toEqual([{ dish_id: dish.id, opens: 2 }]);
    const other = await forTenant(B).analytics.summary(range);
    expect(other.menuViews).toBe(0);
    expect(other.storyOpens).toBe(0);
    const day = await a.analytics.daily(range);
    expect(day.reduce((n, d) => n + d.views, 0)).toBe(2);
    expect(day.reduce((n, d) => n + d.plays, 0)).toBe(3); // 2 story opens + the earlier film play in this file
  });
});
