import { afterEach, describe, expect, it, vi } from "vitest";
import { DeepLProvider, deeplSource, deeplTargets } from "@/lib/translate/deepl";
import { getProvider } from "@/lib/translate";
import { decodeEntities, escapeXml, mtFetchJson, wrapTokens } from "@/lib/translate/mt";
import { translateUnits } from "@/lib/translate/run";
import { pendingWork } from "@/lib/translate/service";
import { sampleUnits, SAMPLE_GLOSSARY } from "@/lib/translate/sample-menu";
import { validateUnit } from "@/lib/translate/validate";
import { FakeProvider } from "./fake-provider";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("machine-translation helpers", () => {
  it("escapes and decodes entities and wraps protected terms", () => {
    expect(escapeXml("Fish & Chips <fresh>")).toBe("Fish &amp; Chips &lt;fresh&gt;");
    expect(decodeEntities("L&#39;uovo &amp; &quot;burro&quot; &#x41;")).toBe(`L'uovo & "burro" A`);
    expect(decodeEntities("&unknown;")).toBe("&unknown;");
    expect(wrapTokens("a [[T1]] b [[T2]]", "<x>", "</x>")).toBe("a <x>[[T1]]</x> b <x>[[T2]]</x>");
  });
  it("retries 429 with Retry-After, fails fast on quota and bad keys", async () => {
    const f = vi.fn().mockImplementationOnce(async () => json({}, 429, { "retry-after": "0" })).mockImplementationOnce(async () => json({ ok: 1 }));
    vi.stubGlobal("fetch", f);
    const r = await mtFetchJson<{ ok: number }>("https://x", {}, { name: "T", sleepMs: () => 1 });
    expect(r.data.ok).toBe(1);
    expect(f).toHaveBeenCalledTimes(2);
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => json({ message: "Quota exceeded" }, 456)));
    await expect(mtFetchJson("https://x", {}, { name: "T" })).rejects.toMatchObject({ kind: "quota" });
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => json({}, 403)));
    await expect(mtFetchJson("https://x", {}, { name: "T" })).rejects.toMatchObject({ kind: "config" });
  });
});

describe("DeepL provider", () => {
  const req = (items: { id: string; text: string; kind: never; context?: string }[], to = "it") => ({ from: "en", to, engine: "strong" as const, items });

  it("maps our language codes to DeepL's variants", () => {
    expect(deeplTargets("pt")[0]).toBe("PT-BR");
    expect(deeplTargets("zh")[0]).toBe("ZH-HANS");
    expect(deeplTargets("zh-Hant")).toEqual(["ZH-HANT"]);
    expect(deeplTargets("it")).toEqual(["IT"]);
    expect(deeplSource("zh-Hant")).toBe("ZH");
  });

  it("sends protected terms as ignored tags, adds context, and returns clean text with billed characters", async () => {
    const calls: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] = [];
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      if (url.includes("/v2/languages")) {
        // DeepL answers 400 to a GET with a JSON Content-Type and no body (found against the live API)
        expect(Object.keys((init.headers ?? {}) as object).map((h) => h.toLowerCase())).not.toContain("content-type");
        return json([{ language: "IT" }, { language: "EN-US" }]);
      }
      const body = JSON.parse(init.body as string);
      calls.push({ url, headers: init.headers as Record<string, string>, body });
      return json({ translations: (body.text as string[]).map((t) => ({ text: t.replace("Fish", "Pesce").replace(/&amp;/g, "&amp;"), billed_characters: t.length })) });
    }));
    const p = new DeepLProvider("secret-key:fx");
    const res = await p.translate(req([
      { id: "a", text: "Fish & [[T1]]", kind: "dish_description" as never, context: "Spaghetti" },
      { id: "b", text: "Soup", kind: "dish_name" as never },
    ]));
    expect(calls.length).toBe(2); // one request per (kind, dish) context group
    expect(calls[0].url).toBe("https://api-free.deepl.com/v2/translate");
    expect(calls[0].headers.Authorization).toBe("DeepL-Auth-Key secret-key:fx");
    const a = calls.find((c) => (c.body.text as string[])[0].includes("Fish"))!;
    expect(a.body).toMatchObject({ source_lang: "EN", target_lang: "IT", tag_handling: "xml", ignore_tags: ["x"] });
    expect(a.body.text).toEqual(["Fish &amp; <x>[[T1]]</x>"]);
    expect(String(a.body.context)).toContain("Spaghetti");
    expect(res.items.find((i) => i.id === "a")!.text).toBe("Pesce & [[T1]]"); // tags stripped, entities decoded
    expect(res.usage.characters).toBeGreaterThan(0);
    expect(res.model).toBe("deepl");
  });

  it("batches a dish's description and explanation into one request", async () => {
    const posts: { text: string[]; context?: string }[] = [];
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      if (url.includes("/v2/languages")) return json([{ language: "IT" }]);
      const body = JSON.parse(init.body as string);
      posts.push(body);
      return json({ translations: (body.text as string[]).map((t) => ({ text: t })) });
    }));
    await new DeepLProvider("k:fx").translate(req([
      { id: "d", text: "Slow-braised veal.", kind: "dish_description" as never, context: "Ossobuco" },
      { id: "c", text: "Tender enough for a spoon.", kind: "dish_context" as never, context: "Ossobuco" },
      { id: "o", text: "Roast chicken.", kind: "dish_description" as never, context: "Pollo" },
    ]));
    expect(posts.length).toBe(2);
    const ossobuco = posts.find((p) => p.text.length === 2)!;
    expect(ossobuco.context).toContain("Ossobuco");
  });

  it("uses the Pro endpoint for non-free keys, and reports unsupported languages", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => {
      urls.push(url);
      return url.includes("/languages") ? json([{ language: "IT" }]) : json({ translations: [{ text: "x" }] });
    }));
    const p = new DeepLProvider("pro-key");
    expect(await p.supports("it")).toBe(true);
    expect(await p.supports("am")).toBe(false);
    await expect(p.translate(req([{ id: "a", text: "x", kind: "dish_name" as never }], "am"))).rejects.toMatchObject({ kind: "unsupported" });
    expect(urls.every((u) => u.startsWith("https://api.deepl.com"))).toBe(true);
  });

  it("explains a missing key", async () => {
    await expect(new DeepLProvider("").translate(req([{ id: "a", text: "x", kind: "dish_name" as never }]))).rejects.toMatchObject({ kind: "config" });
  });
});

describe("provider selection", () => {
  it("defaults to DeepL and accepts mistral; anything else is an error", () => {
    vi.stubEnv("TRANSLATION_PROVIDER", "");
    expect(getProvider().name).toBe("deepl");
    vi.stubEnv("TRANSLATION_PROVIDER", "mistral");
    expect(getProvider().name).toBe("mistral");
    vi.stubEnv("TRANSLATION_PROVIDER", "google");
    expect(() => getProvider()).toThrow(/Unknown TRANSLATION_PROVIDER/);
  });
});

describe("pipeline with a deterministic provider", () => {
  it("does not retry failures a deterministic API would simply repeat", async () => {
    const units = sampleUnits().slice(1, 3);
    const p = new FakeProvider({ alwaysBad: new Set([units[0].id]) });
    Object.assign(p, { deterministic: true });
    const out = await translateUnits({ units, from: "en", to: "it", glossary: [], provider: p });
    expect(out.results[0].ok).toBe(false);
    expect(p.calls.length).toBe(1); // no escalation pass
    const llm = new FakeProvider({ alwaysBad: new Set([units[0].id]) });
    await translateUnits({ units, from: "en", to: "it", glossary: [], provider: llm });
    expect(llm.calls.length).toBe(2); // an LLM gets one more try
  });
  it("accepts names that machine translation returns unchanged, but not unchanged sentences", () => {
    const base = { from: "en", to: "it", keeps: [] as string[] };
    const name = "Risotto allo Zafferano e Midollo";
    expect(validateUnit({ ...base, source: name, output: name, kind: "dish_name" })).toEqual({ ok: true });
    const sentence = "Slow-braised veal shank with saffron risotto and gremolata.";
    expect(validateUnit({ ...base, source: sentence, output: sentence, kind: "dish_description" })).toMatchObject({ ok: false, reason: "echo" });
  });
});

describe("planning the work", () => {
  it("estimates the work before anything is spent", () => {
    const units = sampleUnits();
    const w = pendingWork(units, ["it", "fr"], SAMPLE_GLOSSARY);
    expect(w.texts).toBe(units.length * 2);
    expect(w.languagesToDo).toBe(2);
    expect(w.characters).toBe(units.reduce((n, u) => n + u.source.length, 0) * 2);
    // units that already have a translation in a language are not counted again
    const done = units.map((u) => ({ ...u, map: { ...u.map, it: "x" }, tx: { [`${u.field}:it`]: { by: "staff" as const, h: "", at: "" } } }));
    expect(pendingWork(done, ["it"], []).texts).toBe(0);
  });
});
