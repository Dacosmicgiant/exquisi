/**
 * Pure translation core: batching → provider → glossary restore → validation → retry on the
 * strong engine → give up (unit stays in the source language). No database, no Next.js, so the
 * service, the quality script and the tests all use exactly this code path.
 */
import type { GlossaryTerm } from "@/lib/db/types";
import { getLanguage, type Engine } from "@/lib/i18n/languages";
import { protectText, restoreText } from "./glossary";
import { sourceHash } from "./provenance";
import { ProviderError, type TranslationProvider, type Usage } from "./provider";
import type { Unit } from "./units";
import { validateUnit } from "./validate";

export type UnitResult =
  | { ok: true; unit: Unit; text: string; h: string; model: string; engine: Engine }
  | { ok: false; unit: Unit; reason: string; /** what the model produced, for reports */ raw?: string };

export type RunOutput = { results: UnitResult[]; usage: Usage; calls: number; models: string[] };

export type RunOptions = {
  units: Unit[];
  from: string;
  to: string;
  glossary: GlossaryTerm[];
  provider: TranslationProvider;
  /** Override the catalog's engine for this language. */
  engine?: Engine;
  /** Escalate failures to the strong engine (default true). */
  escalate?: boolean;
  maxBatchItems?: number;
  maxBatchChars?: number;
  onProgress?: (done: number, total: number) => void;
};

const add = (a: Usage, b: Usage): Usage => ({
  inputTokens: a.inputTokens + b.inputTokens,
  outputTokens: a.outputTokens + b.outputTokens,
  characters: (a.characters ?? 0) + (b.characters ?? 0),
});

function batches(units: Unit[], maxItems: number, maxChars: number): Unit[][] {
  const out: Unit[][] = [];
  let cur: Unit[] = [];
  let chars = 0;
  for (const u of units) {
    if (cur.length && (cur.length >= maxItems || chars + u.source.length > maxChars)) {
      out.push(cur);
      cur = [];
      chars = 0;
    }
    cur.push(u);
    chars += u.source.length;
  }
  if (cur.length) out.push(cur);
  return out;
}

export async function translateUnits(o: RunOptions): Promise<RunOutput> {
  const { from, to, glossary, provider } = o;
  const firstEngine: Engine = o.engine ?? getLanguage(to).engine;
  const results = new Map<string, UnitResult>();
  const models = new Set<string>();
  let usage: Usage = { inputTokens: 0, outputTokens: 0, characters: 0 };
  let calls = 0;
  let finished = 0;

  const protectedBy = new Map<string, ReturnType<typeof protectText>>();
  for (const u of o.units) protectedBy.set(u.id, protectText(u.source, glossary, to));

  /** One provider call over `group`; splits the group if the model returns unusable JSON. */
  async function attempt(group: Unit[], engine: Engine): Promise<Map<string, { text: string; model: string } | string>> {
    const out = new Map<string, { text: string; model: string } | string>();
    try {
      calls++;
      const res = await provider.translate({
        from,
        to,
        engine,
        items: group.map((u) => ({ id: u.id, text: protectedBy.get(u.id)!.text, kind: u.kind, context: u.context })),
      });
      usage = add(usage, res.usage);
      models.add(res.model);
      const byId = new Map(res.items.map((i) => [i.id, i.text]));
      for (const u of group) {
        const text = byId.get(u.id);
        out.set(u.id, text === undefined ? "missing_item" : { text, model: res.model });
      }
    } catch (e) {
      if (e instanceof ProviderError && e.kind === "bad_output" && group.length > 1) {
        const mid = Math.ceil(group.length / 2);
        for (const half of [group.slice(0, mid), group.slice(mid)]) {
          for (const [k, v] of await attempt(half, engine)) out.set(k, v);
        }
      } else {
        const reason = e instanceof ProviderError ? `${e.kind}:${e.message}` : `error:${(e as Error).message}`;
        for (const u of group) out.set(u.id, reason);
      }
    }
    return out;
  }

  function judge(u: Unit, raw: string, engine: Engine, model: string): UnitResult {
    const prot = protectedBy.get(u.id)!;
    const restored = restoreText(raw, prot.tokens);
    const v = validateUnit({
      source: u.source,
      output: restored.text,
      from,
      to,
      kind: u.kind,
      keeps: prot.keeps,
      missingKeeps: restored.missing,
    });
    return v.ok
      ? { ok: true, unit: u, text: restored.text.trim(), h: sourceHash(u.source, glossary, to), model, engine }
      : { ok: false, unit: u, reason: v.reason, raw: restored.text };
  }

  async function pass(units: Unit[], engine: Engine, maxItems: number) {
    for (const group of batches(units, maxItems, o.maxBatchChars ?? 5000)) {
      const raw = await attempt(group, engine);
      for (const u of group) {
        const r = raw.get(u.id);
        if (typeof r === "string" || r === undefined) results.set(u.id, { ok: false, unit: u, reason: r ?? "no_result" });
        else results.set(u.id, judge(u, r.text, engine, r.model));
      }
    }
  }

  await pass(o.units, firstEngine, o.maxBatchItems ?? 15);
  finished = [...results.values()].filter((r) => r.ok).length;
  o.onProgress?.(finished, o.units.length);

  // retry failures once, escalating to the strong engine, in small batches
  const failed = () => o.units.filter((u) => results.get(u.id)?.ok === false);
  // (a deterministic machine-translation API would return the same thing again, so there is nothing to retry)
  if (failed().length && o.escalate !== false && !provider.deterministic) {
    // transport-level failures (rate limit exhausted etc.) are not worth escalating
    const retryable = failed().filter((u) => {
      const r = results.get(u.id) as { reason: string };
      return !/^(rate_limit|config|timeout|http):/.test(r.reason);
    });
    if (retryable.length) await pass(retryable, "strong", 5);
  }
  o.onProgress?.([...results.values()].filter((r) => r.ok).length, o.units.length);

  return {
    results: o.units.map((u) => results.get(u.id) ?? { ok: false as const, unit: u, reason: "no_result" }),
    usage,
    calls,
    models: [...models],
  };
}
