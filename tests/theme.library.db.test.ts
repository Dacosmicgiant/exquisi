import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { customThemes, restaurants } from "@/lib/db/platform";
import { customRef, getPreset, presetRef } from "@/lib/theme/presets";
import { getThemeLayer } from "@/lib/theme/server";
import { resolveTheme } from "@/lib/theme/resolve";
import { defaultTheme } from "@/theme/theme.config";

beforeAll(async () => {
  const conn = await connectDb();
  expect(conn.connection.name).toBe("menu_stories_test");
  await conn.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const base = { name: { en: "Casa" }, default_language: "en", enabled_languages: ["en"], currency: "EUR", status: "live" as const };

describe("custom theme library", () => {
  it("creates, lists, updates and deletes themes", async () => {
    const theme = resolveTheme({ radius: "1rem", colors: { light: { primary: "#AA3355" } } });
    const t = await customThemes.create({ name: "Terrace Sunset", category: "cafe", theme });
    expect((await customThemes.list()).map((x) => x.name)).toContain("Terrace Sunset");
    expect((await customThemes.get(t.id))?.category).toBe("cafe");

    const u = await customThemes.update(t.id, { name: "Terrace Dusk" });
    expect(u.name).toBe("Terrace Dusk");
    expect(u.category).toBe("cafe");
    expect((u.theme as typeof theme).radius).toBe("1rem");

    await customThemes.remove(t.id);
    expect(await customThemes.get(t.id)).toBeNull();
  });

  it("allows as many custom themes as you like, with the same name too", async () => {
    const before = (await customThemes.list()).length;
    for (let i = 0; i < 30; i++) await customThemes.create({ name: "Same name", category: "cafe", theme: defaultTheme });
    expect((await customThemes.list()).length).toBe(before + 30);
  });

  it("returns null/throws cleanly for bad ids", async () => {
    expect(await customThemes.get("not-an-id")).toBeNull();
    await expect(customThemes.update("not-an-id", { name: "x" })).rejects.toThrow(/not found/i);
    await customThemes.remove("not-an-id"); // no-op
  });
});

describe("a restaurant's chosen theme", () => {
  it("is stored per restaurant and found by the theme it uses", async () => {
    const t = await customThemes.create({ name: "Mine", category: "bar-lounge", theme: defaultTheme });
    const a = await restaurants.create({ ...base, slug: "th-a", brand: { theme_id: customRef(t.id) } });
    const b = await restaurants.create({ ...base, slug: "th-b", brand: { theme_id: presetRef("speakeasy") } });
    await restaurants.create({ ...base, slug: "th-c", brand: {} });

    expect((await restaurants.usingTheme(customRef(t.id))).map((r) => r.id)).toEqual([a.id]);
    expect((await restaurants.usingTheme(presetRef("speakeasy"))).map((r) => r.id)).toEqual([b.id]);
    expect(await restaurants.usingTheme(customRef("000000000000000000000000"))).toEqual([]);
  });

  it("resolves a preset, a custom theme, and falls back to nothing for unknown ones", async () => {
    expect(await getThemeLayer(presetRef("speakeasy"))).toEqual(getPreset("speakeasy")!.theme);
    const t = await customThemes.create({ name: "Layer", category: "cafe", theme: { radius: "0.75rem" } });
    expect(await getThemeLayer(customRef(t.id))).toEqual({ radius: "0.75rem" });
    expect(await getThemeLayer(customRef("000000000000000000000000"))).toEqual({});
    expect(await getThemeLayer("preset:does-not-exist")).toEqual({});
    expect(await getThemeLayer(undefined)).toEqual({});
    expect(await getThemeLayer("garbage")).toEqual({});
  });
});
