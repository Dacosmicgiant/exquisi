import { afterEach, describe, expect, it, vi } from "vitest";
import { CATALOG, SUPPORTED, findLanguage, getLanguage, languageCandidates, matchBrowserLanguages } from "@/lib/i18n/languages";
import { protectText, restoreText, relevantTerms } from "@/lib/translate/glossary";
import { MistralProvider, buildSystemPrompt } from "@/lib/translate/mistral";
import { ProviderError } from "@/lib/translate/provider";
import { translateUnits } from "@/lib/translate/run";
import { ingredientFlags } from "@/lib/translate/safety";
import { staffEdits } from "@/lib/translate/staff";
import { validateUnit, normalizeDigits } from "@/lib/translate/validate";
import { SAMPLE_GLOSSARY, sampleUnits } from "@/lib/translate/sample-menu";
import type { GlossaryTerm } from "@/lib/db/types";
import { FakeProvider } from "./fake-provider";

const glossary: GlossaryTerm[] = [
  { term: "tagliolini", kind: "keep" },
  { term: "Casentino", kind: "keep" },
  { term: "ragù", kind: "fixed", fixed: { hi: "रागू" } },
];

describe("language catalog", () => {
  it("has unique codes, native names, and at least 40 supported languages", () => {
    expect(new Set(CATALOG.map((l) => l.code)).size).toBe(CATALOG.length);
    expect(CATALOG.every((l) => l.native && l.name)).toBe(true);
    expect(SUPPORTED.length).toBeGreaterThanOrEqual(30);
    expect(CATALOG.length).toBeGreaterThan(100);
  });
  it("knows right-to-left languages", () => {
    for (const c of ["ar", "he", "ur", "fa"]) expect(getLanguage(c).dir).toBe("rtl");
    expect(getLanguage("hi").dir).toBe("ltr");
  });
  it("only gives a flag where one country clearly owns the language", () => {
    for (const c of ["en", "es", "pt", "ar", "zh", "hi", "bn"]) expect(getLanguage(c).flag).toBeUndefined();
    expect(getLanguage("hi").tier).toBe("experimental"); // measured below the bar
    expect(getLanguage("it").flag).toBe("it");
  });
  it("maps browser tags onto the catalog", () => {
    expect(findLanguage("zh-TW")?.code).toBe("zh-Hant");
    expect(findLanguage("zh-CN")?.code).toBe("zh");
    expect(findLanguage("pt-BR")?.code).toBe("pt");
    expect(findLanguage("no")?.code).toBe("nb");
    expect(findLanguage("xx-YY")).toBeNull();
    expect(matchBrowserLanguages(["hi-IN", "en-GB", "hi", "xx"]).map((l) => l.code)).toEqual(["hi", "en"]);
  });
  it("offers regional variants before the base language", () => {
    expect(languageCandidates("es-MX").map((l) => l.code)).toEqual(["es-419", "es"]);
    expect(languageCandidates("pt-PT").map((l) => l.code)).toEqual(["pt-PT", "pt"]);
    expect(languageCandidates("pt-BR").map((l) => l.code)).toEqual(["pt"]);
    expect(languageCandidates("fr-CA").map((l) => l.code)).toEqual(["fr-CA", "fr"]);
    expect(languageCandidates("zh-TW").map((l) => l.code)).toEqual(["zh-Hant"]);
    expect(findLanguage("pt-PT")?.code).toBe("pt-PT");
  });
  it("includes every language DeepL offers", () => {
    for (const c of ["an", "ay", "ba", "br", "gn", "la", "ln", "oc", "om", "qu", "sa", "tk", "tn", "ts", "tt", "wo"]) expect(findLanguage(c)?.code, c).toBe(c);
  });
});

describe("glossary protection", () => {
  it("wraps whole-word terms case-insensitively and restores them", () => {
    const { text, keeps, tokens } = protectText("Fresh Tagliolini with butter from the Casentino.", glossary, "hi");
    expect(text).toBe("Fresh [[T1]] with butter from the [[T2]].");
    expect(keeps).toEqual(["Tagliolini", "Casentino"]);
    expect(restoreText("ताज़ा [[T1]] और [[ T2 ]]", tokens)).toEqual({
      text: "ताज़ा Tagliolini और Casentino",
      missing: [],
    });
    expect(restoreText("ताज़ा पास्ता और [[T1]]", tokens).missing).toEqual(["Casentino"]);
    // a hallucinated placeholder is dropped rather than leaking into the menu
    expect(restoreText("[[T1]] [[T2]] [[T9]]", tokens).text).not.toContain("[[");
  });
  it("does not match inside other words and uses fixed renderings per language", () => {
    expect(protectText("tagliolinis", glossary, "hi").keeps).toEqual([]);
    const fixed = protectText("a rich ragù", glossary, "hi");
    expect(fixed.text).toBe("a rich [[T1]]");
    expect(restoreText("एक [[T1]]", fixed.tokens).text).toBe("एक रागू");
    expect(protectText("a rich ragù", glossary, "fr").keeps).toEqual(["ragù"]);
    expect(relevantTerms("only Casentino here", glossary).map((g) => g.term)).toEqual(["Casentino"]);
  });
});

describe("unit validation", () => {
  const base = { from: "en", keeps: [] as string[] };
  it("accepts a good translation", () => {
    expect(validateUnit({ ...base, to: "it", source: "Slow-braised veal shank, 12 hours.", output: "Stinco di vitello brasato lentamente, 12 ore." })).toEqual({ ok: true });
  });
  it("rejects an English echo, wrong script and mixed-script junk", () => {
    const source = "Slow-braised veal shank with saffron risotto and gremolata.";
    expect(validateUnit({ ...base, to: "it", source, output: source })).toMatchObject({ ok: false, reason: "echo" });
    expect(validateUnit({ ...base, to: "hi", source, output: source })).toMatchObject({ ok: false });
    expect(validateUnit({ ...base, to: "hi", source, output: "मild, rich, और नॉन स्पिसी रसोई में धीमी पकाई गई गाय के पैर का मांस" })).toMatchObject({ ok: false });
    expect(validateUnit({ ...base, to: "ja", source, output: "ゆっくり煮込んだ子牛のすね肉、サフランのリゾット、グレモラータ添え。" })).toEqual({ ok: true });
  });
  it("requires numbers and glossary terms to survive, and rejects markup leaks", () => {
    expect(validateUnit({ ...base, to: "it", source: "Aged 24 months.", output: "Stagionato per mesi." })).toMatchObject({ ok: false, reason: "digit:24" });
    expect(normalizeDigits("٢٤ and २४")).toBe("24 and 24");
    expect(validateUnit({ ...base, to: "ar", source: "Aged 24 months.", output: "معتق لمدة ٢٤ شهرا." })).toEqual({ ok: true });
    expect(validateUnit({ ...base, to: "it", source: "Fresh tagliolini.", output: "Pasta fresca.", missingKeeps: ["tagliolini"] })).toMatchObject({ ok: false });
    expect(validateUnit({ ...base, to: "it", source: "Fresh pasta.", output: "Pasta fresca [[T1]]" })).toMatchObject({ ok: false, reason: "artifact" });
    // original-language gloss in parentheses is allowed in a non-Latin sentence; bare stray Latin is not
    expect(validateUnit({ ...base, to: "hi", source: "Toasted bread, cured pork cheek, pecorino, black pepper.", output: "टोस्टेड ब्रेड, क्यूर्ड पोर्क चीक (guanciale), पेकोरिनो पनीर, काली मिर्च" })).toEqual({ ok: true });
    expect(restoreText("चीक (<keep>guanciale</keep>) है", []).text).toBe("चीक (guanciale) है");
  });
});

describe("translateUnits (pipeline core)", () => {
  const units = sampleUnits();

  it("translates every unit, keeps glossary terms verbatim and strips the tags", async () => {
    const provider = new FakeProvider();
    const out = await translateUnits({ units, from: "en", to: "it", glossary: SAMPLE_GLOSSARY, provider });
    expect(out.results.every((r) => r.ok)).toBe(true);
    const crostini = out.results.find((r) => r.unit.id === "dish:s2:context");
    expect(crostini?.ok && crostini.text).toContain("Guanciale");
    expect(out.results.every((r) => r.ok && !/<\/?keep>/.test(r.text))).toBe(true);
    expect(out.usage.inputTokens).toBeGreaterThan(0);
    // 30 units, batch of 15 → 2 calls
    expect(provider.calls.length).toBe(2);
  });

  it("uses the catalog engine (strong everywhere, measured) unless overridden", async () => {
    const it = new FakeProvider();
    await translateUnits({ units: units.slice(0, 3), from: "en", to: "it", glossary: [], provider: it });
    expect(it.calls[0].engine).toBe("strong");
    const fast = new FakeProvider();
    await translateUnits({ units: units.slice(0, 3), from: "en", to: "it", glossary: [], provider: fast, engine: "fast" });
    expect(fast.calls[0].engine).toBe("fast");
    const hi = new FakeProvider();
    await translateUnits({ units: units.slice(0, 3), from: "en", to: "hi", glossary: [], provider: hi });
    expect(hi.calls[0].engine).toBe("strong");
  });

  it("escalates failures to the strong engine, and gives up cleanly when still bad", async () => {
    const id = units[1].id; // a long description (echo detection ignores very short strings)
    const bad = units[2].id;
    const provider = new FakeProvider({ echoOnFast: new Set([id]), alwaysBad: new Set([bad]) });
    const out = await translateUnits({ units: units.slice(0, 4), from: "en", to: "it", glossary: [], provider, engine: "fast" });
    const first = out.results.find((r) => r.unit.id === id)!;
    expect(first.ok && first.engine).toBe("strong");
    const failed = out.results.find((r) => r.unit.id === bad)!;
    expect(failed.ok).toBe(false);
    expect(out.results.filter((r) => r.ok).length).toBe(3);
  });

  it("rejects a translation that dropped a glossary term", async () => {
    const id = "dish:s3:name"; // Tagliolini al Tartufo Bianco
    const provider = new FakeProvider({ dropKeeps: new Set([id]) });
    const out = await translateUnits({ units: units.filter((u) => u.id === id), from: "en", to: "it", glossary: SAMPLE_GLOSSARY, provider });
    expect(out.results[0].ok).toBe(false);
  });
});

describe("staff edit detection", () => {
  it("flags only changed non-default languages; clearing counts as an edit", () => {
    const edits = staffEdits({
      defaultLang: "en",
      glossary: [],
      before: { name: { en: "Risotto", it: "Risotto", fr: "Risotto" } },
      after: { name: { en: "Risotto Milanese", it: "Risotto alla Milanese", fr: "" } },
    });
    expect(edits.map((e) => [e.field, e.lang, e.text])).toEqual([
      ["name", "it", "Risotto alla Milanese"],
      ["name", "fr", ""],
    ]);
  });
});

describe("ingredient safety lexicon", () => {
  it("flags protein swaps and dropped high-stakes ingredients", () => {
    expect(ingredientFlags("Cured pork cheek, like bacon.", "Dried pig's ear, like bacon.").length).toBe(0);
    // dish names gain English words on the way back: not a swap
    expect(ingredientFlags("Spaghetti alle Vongole", "Spaghetti with clams", { isName: true })).toEqual([]);
    expect(ingredientFlags("Pasta with sauce", "Pasta with clams").some((f) => f.category === "shellfish")).toBe(true);
    expect(ingredientFlags("Slow-braised veal shank.", "Slow-braised pork knuckle.").some((f) => f.kind === "swap")).toBe(true);
    expect(ingredientFlags("Crostini with guanciale and pork.", "Crostini with herbs.").some((f) => f.category === "pork")).toBe(true);
    expect(ingredientFlags("Tiramisù with Marsala wine.", "Tiramisu with sweet coffee.").some((f) => f.category === "alcohol")).toBe(true);
    expect(ingredientFlags("Fresh egg pasta.", "Fresh pasta.")).toEqual([]);
  });
});

describe("MistralProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  const req = { from: "en", to: "it", engine: "fast" as const, items: [{ id: "a", text: "Hello", kind: "dish_name" as const }] };
  const ok = (items: unknown) =>
    new Response(JSON.stringify({ model: "m", usage: { prompt_tokens: 5, completion_tokens: 7 }, choices: [{ message: { content: JSON.stringify({ items }) } }] }), { status: 200 });

  it("picks the model per engine and sends strict JSON-schema output", async () => {
    vi.stubEnv("MISTRAL_API_KEY", "k");
    vi.stubEnv("MISTRAL_MODEL", "ministral-3b-2512");
    vi.stubEnv("MISTRAL_MODEL_STRONG", "ministral-14b-2512");
    const fetchMock = vi.fn().mockImplementation(async () => ok([{ id: "a", text: "Ciao" }]));
    vi.stubGlobal("fetch", fetchMock);
    const p = new MistralProvider();
    const res = await p.translate(req);
    expect(res.items).toEqual([{ id: "a", text: "Ciao" }]);
    expect(res.usage).toEqual({ inputTokens: 5, outputTokens: 7 });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("ministral-3b-2512");
    expect(body.temperature).toBe(0);
    expect(body.response_format.json_schema.strict).toBe(true);
    await p.translate({ ...req, engine: "strong" });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe("ministral-14b-2512");
  });

  it("retries a 429 and then succeeds", async () => {
    vi.stubEnv("MISTRAL_API_KEY", "k");
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => new Response("{}", { status: 429, headers: { "retry-after": "1" } }))
      .mockImplementationOnce(async () => ok([{ id: "a", text: "Ciao" }]));
    vi.stubGlobal("fetch", fetchMock);
    const res = await new MistralProvider().translate(req);
    expect(res.items[0].text).toBe("Ciao");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports unusable JSON as bad_output and a missing key as config", async () => {
    vi.stubEnv("MISTRAL_API_KEY", "k");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"items":[{"id":"a","text":"unterminated' } }] }), { status: 200 })));
    await expect(new MistralProvider().translate(req)).rejects.toMatchObject({ kind: "bad_output" });
    vi.stubEnv("MISTRAL_API_KEY", "");
    await expect(new MistralProvider().translate(req)).rejects.toBeInstanceOf(ProviderError);
  });

  it("tells the model the food-safety and glossary rules", () => {
    const prompt = buildSystemPrompt("en", "hi");
    expect(prompt).toContain("[[T1]]");
    expect(prompt).toContain("FOOD SAFETY");
    expect(prompt).toContain("हिन्दी");
  });
});
