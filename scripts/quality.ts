/**
 * Translation quality test: the repeatable version of "translate one real menu into a handful of
 * languages and see where 'supported' ends".
 *
 *   npm run quality                                  it,de (controls) + hi,mr,ar,ja,sw, both engines
 *   npm run quality -- --langs hi,ar --engines strong
 *   npm run quality -- --no-judge --no-back          cheapest run (validation only)
 *
 * For every language × engine: translate the sample menu (10 dishes + 2 stories) with the real
 * pipeline (no escalation, so each engine is measured on its own), back-translate to English,
 * flag ingredient swaps (pork→beef, dropped alcohol…), optionally have an LLM judge score meaning
 * preservation, then print a scorecard and write reports/quality-<time>.html (side-by-side,
 * shareable as a demo) plus reports/quality-latest.json. It also recommends tier + engine for
 * each language; apply those in lib/i18n/languages.ts.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { mkdirSync, writeFileSync } from "node:fs";
import { getLanguage, type Engine } from "../lib/i18n/languages";
import { mistralChat } from "../lib/translate/mistral";
import { getProvider } from "../lib/translate";
import { ProviderError, type TranslationProvider } from "../lib/translate/provider";
import { translateUnits, type UnitResult } from "../lib/translate/run";
import { ingredientFlags, type SafetyFlag } from "../lib/translate/safety";
import { SAMPLE_GLOSSARY, sampleUnits } from "../lib/translate/sample-menu";
import type { Unit } from "../lib/translate/units";

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const has = (n: string) => process.argv.includes(`--${n}`);

if (arg("provider")) process.env.TRANSLATION_PROVIDER = arg("provider"); // compare engines: --provider deepl|mistral
const LANGS = (arg("langs") ?? "it,de,hi,mr,ar,ja,sw").split(",").map((s) => s.trim()).filter(Boolean);
const ENGINES = (arg("engines") ?? "fast,strong").split(",").map((s) => s.trim()) as Engine[];
const BACK = !has("no-back");
const JUDGE_MODEL = has("no-judge") ? "" : process.env.TRANSLATION_JUDGE_MODEL || "";

type Row = {
  unit: Unit;
  ok: boolean;
  text: string;
  reason?: string;
  back?: string;
  flags: SafetyFlag[];
  score?: number;
  issues?: string[];
};
type Cell = {
  lang: string;
  engine: Engine;
  model: string;
  rows: Row[];
  pass: number;
  total: number;
  flagged: number;
  judgeAvg?: number;
  good: number;
  tokens: number;
  seconds: number;
  reasons: Record<string, number>;
};

async function backTranslate(provider: TranslationProvider, lang: string, rows: Row[]) {
  const todo = rows.filter((r) => r.ok);
  for (let i = 0; i < todo.length; i += 12) {
    const chunk = todo.slice(i, i + 12);
    try {
      const res = await provider.translate({
        from: lang,
        to: "en",
        engine: "strong",
        items: chunk.map((r) => ({ id: r.unit.id, text: r.text, kind: r.unit.kind })),
      });
      const byId = new Map(res.items.map((x) => [x.id, x.text]));
      for (const r of chunk) r.back = byId.get(r.unit.id);
    } catch (e) {
      if (!(e instanceof ProviderError)) throw e;
    }
  }
}

async function judge(lang: string, rows: Row[]) {
  const name = getLanguage(lang).name;
  const todo = rows.filter((r) => r.ok && r.back);
  for (let i = 0; i < todo.length; i += 8) {
    const chunk = todo.slice(i, i + 8);
    try {
      const res = await mistralChat({
        model: JUDGE_MODEL,
        system:
          `You review machine translations of restaurant menu copy from English into ${name}. For each item you get the English source, the ${name} translation, and an independent back-translation to English. ` +
          `Score meaning preservation 1-5 (5 = faithful and natural, 3 = understandable but with errors, 1 = wrong or nonsense). In "issues" list concrete problems, ESPECIALLY ingredient / meat / cooking-method substitutions (e.g. veal→cow bone, pork→beef), wrong dish type, lost allergen information, gibberish or offensive words. Use [] if there are none. Return JSON only.`,
        user: JSON.stringify({ items: chunk.map((r) => ({ id: r.unit.id, source: r.unit.source, translation: r.text, back_translation: r.back })) }),
        schema: {
          name: "judgement",
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: { id: { type: "string" }, score: { type: "integer" }, issues: { type: "array", items: { type: "string" } } },
                  required: ["id", "score", "issues"],
                  additionalProperties: false,
                },
              },
            },
            required: ["items"],
            additionalProperties: false,
          },
        },
      });
      const items = (res.json as { items: { id: string; score: number; issues: string[] }[] }).items ?? [];
      for (const it of items) {
        const row = chunk.find((r) => r.unit.id === it.id);
        if (row) {
          row.score = Math.max(1, Math.min(5, it.score));
          row.issues = it.issues;
        }
      }
    } catch (e) {
      if (!(e instanceof ProviderError)) throw e;
      console.warn(`  judge failed for ${lang}: ${e.message}`);
    }
  }
}

async function measure(provider: TranslationProvider, lang: string, engine: Engine): Promise<Cell> {
  const units = sampleUnits({ includeStories: true });
  const t0 = Date.now();
  const out = await translateUnits({ units, from: "en", to: lang, glossary: SAMPLE_GLOSSARY, provider, engine, escalate: false });
  const rows: Row[] = out.results.map((r: UnitResult) => ({
    unit: r.unit,
    ok: r.ok,
    text: r.ok ? r.text : (r.raw ?? ""),
    reason: r.ok ? undefined : r.reason,
    flags: [],
  }));
  if (BACK) await backTranslate(provider, lang, rows);
  for (const r of rows) if (r.ok && r.back) r.flags = ingredientFlags(r.unit.source, r.back, { isName: r.unit.kind === "dish_name" || r.unit.kind === "story_title" || r.unit.kind === "category" });
  if (BACK && JUDGE_MODEL) await judge(lang, rows);

  const reasons: Record<string, number> = {};
  for (const r of rows) if (r.reason) reasons[r.reason.split(":")[0]] = (reasons[r.reason.split(":")[0]] ?? 0) + 1;
  const scored = rows.filter((r) => r.score !== undefined);
  const good = rows.filter((r) => r.ok && r.flags.length === 0 && (r.score === undefined || r.score >= 4)).length;
  return {
    lang,
    engine,
    model: provider.modelFor(engine),
    rows,
    pass: rows.filter((r) => r.ok).length,
    total: rows.length,
    flagged: rows.filter((r) => r.flags.length).length,
    judgeAvg: scored.length ? scored.reduce((a, r) => a + (r.score ?? 0), 0) / scored.length : undefined,
    good,
    tokens: out.usage.inputTokens + out.usage.outputTokens,
    seconds: (Date.now() - t0) / 1000,
    reasons,
  };
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

function recommend(cells: Cell[]) {
  const rec: Record<string, { tier: string; engine: Engine; why: string }> = {};
  for (const lang of new Set(cells.map((c) => c.lang))) {
    const mine = cells.filter((c) => c.lang === lang);
    const ok = (c: Cell) => pct(c.good, c.total) >= 80 && c.flagged === 0 && (c.judgeAvg === undefined || c.judgeAvg >= 4.3);
    const fast = mine.find((c) => c.engine === "fast");
    const strong = mine.find((c) => c.engine === "strong");
    if (fast && ok(fast)) rec[lang] = { tier: "supported", engine: "fast", why: `fast engine good on ${pct(fast.good, fast.total)}% of units` };
    else if (strong && ok(strong)) rec[lang] = { tier: "supported", engine: "strong", why: `only the strong engine clears the bar (${pct(strong.good, strong.total)}%)` };
    else {
      const best = [...mine].sort((a, b) => b.good - a.good)[0];
      rec[lang] = { tier: "experimental", engine: "strong", why: `best engine reached only ${pct(best.good, best.total)}% good, ${best.flagged} flagged unit(s)` };
    }
  }
  return rec;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function html(cells: Cell[], rec: ReturnType<typeof recommend>, stamp: string) {
  const sections = cells
    .map((c) => {
      const L = getLanguage(c.lang);
      const rows = c.rows
        .map((r) => {
          const bad = !r.ok || r.flags.length || (r.score !== undefined && r.score < 4);
          const notes = [
            r.reason ? `<b>rejected:</b> ${esc(r.reason)}` : "",
            ...r.flags.map((f) => `<b>${f.kind}:</b> ${esc(f.detail)}`),
            r.score !== undefined ? `judge ${r.score}/5` : "",
            ...(r.issues ?? []).map(esc),
          ].filter(Boolean).join("<br>");
          return `<tr class="${bad ? "bad" : ""}"><td class="k">${esc(r.unit.kind.replace("_", " "))}</td><td>${esc(r.unit.source)}</td><td dir="${L.dir}" lang="${c.lang}">${esc(r.text)}</td><td>${esc(r.back ?? "")}</td><td class="n">${notes}</td></tr>`;
        })
        .join("");
      return `<section><h2>${esc(L.name)} <span class="nat" dir="${L.dir}">${esc(L.native)}</span> · <code>${c.engine}</code> (${esc(c.model)})</h2>
<p class="m">valid ${c.pass}/${c.total} · good ${pct(c.good, c.total)}% · flagged ${c.flagged}${c.judgeAvg !== undefined ? ` · judge ${c.judgeAvg.toFixed(1)}/5` : ""} · ${c.tokens} tokens · ${c.seconds.toFixed(1)}s</p>
<table><thead><tr><th></th><th>English source</th><th>${esc(L.name)}</th><th>Back to English</th><th>Checks</th></tr></thead><tbody>${rows}</tbody></table></section>`;
    })
    .join("\n");
  const recRows = Object.entries(rec)
    .map(([l, r]) => `<tr><td>${esc(getLanguage(l).name)}</td><td><b>${r.tier}</b></td><td>${r.engine}</td><td>${esc(r.why)}</td></tr>`)
    .join("");
  return `<!doctype html><meta charset="utf-8"><title>menu-stories translation quality ${stamp}</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:1250px;margin:2rem auto;padding:0 1rem;color:#1e1a16;background:#f4eee1}
h1{font-weight:500;font-size:2rem;margin:0}h2{font-weight:500;margin:2.5rem 0 .2rem}.nat{font-size:1.1em;color:#a68a4b}.m{color:#6b6256;margin:.2rem 0 .8rem}
table{border-collapse:collapse;width:100%;background:#faf6ec}th,td{border:1px solid #d6caae;padding:.45rem .6rem;vertical-align:top;text-align:left}th{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:#6b6256}
td.k{font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:#6b6256;white-space:nowrap}td.n{font-size:.82rem;color:#8c2a2a}tr.bad td{background:#f3e3df}code{background:#ebe3d0;padding:0 .3rem}</style>
<h1>Translation quality report</h1><p class="m">${stamp} · rows tinted red were rejected, flagged for an ingredient swap, or judged below 4/5.</p>
<h2>Recommendation</h2><table><thead><tr><th>Language</th><th>Tier</th><th>Engine</th><th>Why</th></tr></thead><tbody>${recRows}</tbody></table>
${sections}`;
}

async function main() {
  const provider = getProvider();
  console.log(`languages: ${LANGS.join(", ")} · engines: ${ENGINES.join(", ")} · back-translation: ${BACK} · judge: ${JUDGE_MODEL || "off"}`);
  console.log(`models: fast=${provider.modelFor("fast")} strong=${provider.modelFor("strong")}\n`);
  const cells: Cell[] = [];
  for (const lang of LANGS) {
    for (const engine of ENGINES) {
      process.stdout.write(`${lang.padEnd(8)} ${engine.padEnd(7)} … `);
      const c = await measure(provider, lang, engine);
      cells.push(c);
      console.log(
        `valid ${String(c.pass).padStart(2)}/${c.total}  good ${String(pct(c.good, c.total)).padStart(3)}%  flagged ${c.flagged}` +
          `${c.judgeAvg !== undefined ? `  judge ${c.judgeAvg.toFixed(1)}` : ""}  ${c.tokens} tok  ${c.seconds.toFixed(1)}s` +
          `${Object.keys(c.reasons).length ? `  rejects: ${JSON.stringify(c.reasons)}` : ""}`,
      );
    }
  }
  const rec = recommend(cells);
  console.log("\nrecommendation (apply in lib/i18n/languages.ts):");
  for (const [l, r] of Object.entries(rec)) {
    const cur = getLanguage(l);
    const change = cur.tier === r.tier && cur.engine === r.engine ? "no change" : `now ${cur.tier}/${cur.engine}`;
    console.log(`  ${l.padEnd(8)} → ${r.tier.padEnd(12)} engine=${r.engine.padEnd(6)} ${r.why}  [${change}]`);
  }

  mkdirSync("reports", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  writeFileSync(`reports/quality-${stamp}.html`, html(cells, rec, stamp));
  writeFileSync(
    "reports/quality-latest.json",
    JSON.stringify({ stamp, recommendation: rec, cells: cells.map((c) => ({ ...c, rows: c.rows.map((r) => ({ id: r.unit.id, source: r.unit.source, text: r.text, ok: r.ok, reason: r.reason, back: r.back, flags: r.flags, score: r.score, issues: r.issues })) })) }, null, 2),
  );
  console.log(`\nreport: reports/quality-${stamp}.html`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
