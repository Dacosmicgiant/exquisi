"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Plus, RefreshCw, Search, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Collapsible } from "@/components/admin/Collapsible";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { GlossaryTerm, TxEntity } from "@/lib/db/types";
import type { UnitState } from "@/lib/translate/provenance";
import {
  generateLanguages,
  saveGlossary,
  saveTranslation,
  setAllowExperimental,
  setAutoTranslate,
  translateNow,
} from "@/app/(admin)/admin/(app)/restaurants/[id]/translations/actions";

export type LangRow = {
  code: string;
  native: string;
  name: string;
  dir: "ltr" | "rtl";
  tier: "supported" | "experimental";
  engine: "fast" | "strong";
  percent: number;
  counts: Record<UnitState, number>;
  job: { status: "running" | "done" | "failed"; done: number; total: number; tokens: number; chars: number; failed: number; error?: string; updated_at: string; model?: string } | null;
};

export type LangChoice = {
  code: string;
  name: string;
  native: string;
  dir: "ltr" | "rtl";
  tier: "supported" | "experimental";
  /** currently shown to diners */
  offered: boolean;
  /** texts still to translate for this language, and their size */
  texts: number;
  characters: number;
};

export type ReviewUnit = {
  id: string;
  entity: TxEntity;
  entityId: string;
  field: string;
  group: string;
  who: string;
  kind: string;
  source: string;
  byLang: Record<string, { text: string; state: UnitState; by: "machine" | "staff" | null }>;
};

/** A moment in the future, computed outside render so the lint purity rule stays happy. */
const horizon = (ms: number) => Date.now() + ms;

const STATE: Record<UnitState, { label: string; cls: string }> = {
  missing: { label: "Not translated", cls: "border-destructive/50 text-destructive" },
  fresh: { label: "Machine", cls: "border-border text-muted-foreground" },
  stale: { label: "Out of date", cls: "border-ornament/60 text-ornament" },
  staff: { label: "Edited by staff", cls: "border-primary/50 text-primary" },
  staff_stale: { label: "Source changed: review", cls: "border-highlight/60 text-highlight" },
};

const FIELD_LABEL: Record<string, string> = { name: "name", description: "description", context: "what to expect", title: "title", text_fallback: "story" };

function Badge({ state }: { state: UnitState }) {
  const s = STATE[state];
  return <span className={`label-caps inline-block border px-1.5 py-0.5 text-[0.58rem] ${s.cls}`}>{s.label}</span>;
}

export function TranslationsManager(props: {
  restaurantId: string;
  defaultLang: string;
  defaultNative: string;
  allowExperimental: boolean;
  providerName: string;
  sourceChars: number;
  autoTranslate: boolean;
  choices: LangChoice[];
  unsupported: number;
  waiting: { texts: number; characters: number };
  rows: LangRow[];
  review: ReviewUnit[];
  glossary: GlossaryTerm[];
}) {
  const { restaurantId, rows, review } = props;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [watchUntil, setWatchUntil] = useState(0);
  const [lang, setLang] = useState(rows[0]?.code ?? "");
  const [filter, setFilter] = useState<"attention" | "all">("attention");
  const [reviewOpen, setReviewOpen] = useState(true);
  const [reviewQuery, setReviewQuery] = useState("");
  // per-dish folding: an explicit choice wins, otherwise only the first few groups start open
  const [groupChoice, setGroupChoice] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [confirmForce, setConfirmForce] = useState<string | null | undefined>(undefined);
  const [confirmGenerate, setConfirmGenerate] = useState<string[] | null>(null);

  const running = rows.some((r) => r.job?.status === "running");
  useEffect(() => {
    if (!running && Date.now() > watchUntil) return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [running, watchUntil, router]);

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? "Failed");
        return;
      }
      if (ok) toast.success(ok);
      router.refresh();
    });

  const translate = (code: string | undefined, force = false) => {
    setWatchUntil(horizon(90_000));
    act(() => translateNow(restaurantId, code, force), "Translating in the background…");
  };

  const current = rows.find((r) => r.code === lang);
  const rq = reviewQuery.trim().toLowerCase();
  const visible = useMemo(
    () =>
      review.filter((u) => {
        const st = u.byLang[lang]?.state;
        if (!(filter === "all" || (st && st !== "fresh" && st !== "staff"))) return false;
        return !rq || `${u.who} ${u.group} ${u.source} ${u.byLang[lang]?.text ?? ""}`.toLowerCase().includes(rq);
      }),
    [review, lang, filter, rq],
  );
  const groups = useMemo(() => {
    const m = new Map<string, { key: string; title: string; kind: string; units: ReviewUnit[] }>();
    for (const u of visible) {
      const g = m.get(u.entityId) ?? { key: u.entityId, title: u.who || u.group, kind: u.group, units: [] };
      g.units.push(u);
      m.set(u.entityId, g);
    }
    return [...m.values()];
  }, [visible]);
  const groupOpen = (key: string, i: number) => !!rq || (groupChoice[key] ?? i < 3);
  const setAllGroups = (open: boolean) => setGroupChoice(Object.fromEntries(groups.map((g) => [g.key, open])));
  const openCount = groups.filter((g, i) => groupOpen(g.key, i)).length;

  return (
    <div className="space-y-16">
      {/* ── overview ───────────────────────────────────────────────── */}
      <section>
        <GeneratePanel
          choices={props.choices}
          unsupported={props.unsupported}
          providerName={props.providerName}
          waiting={props.waiting}
          pending={pending}
          onGenerate={(langs) => setConfirmGenerate(langs)}
          autoTranslate={props.autoTranslate}
          onAuto={(on) => act(() => setAutoTranslate(restaurantId, on), on ? "Automatic translation on" : "Automatic translation off")}
        />

        {rows.length === 0 && (
          <p className="mt-8 border border-dashed p-10 text-center text-muted-foreground">
            Only {props.defaultNative} is enabled. Generate the supported languages above, or add some in Settings.
          </p>
        )}

        {rows.length > 0 && (
          <p className="mt-10 text-sm text-muted-foreground">
            <span className="font-numeric text-foreground">{rows.filter((r) => r.percent === 100).length}</span> of {rows.length} languages complete
          </p>
        )}

        {rows.length > 10 ? (
          <CompactTable rows={rows} defaultNative={props.defaultNative} pending={pending} onTranslate={(c) => translate(c)} onReview={(c) => { setLang(c); setReviewOpen(true); setTimeout(() => document.getElementById("review")?.scrollIntoView({ behavior: "smooth" }), 50); }} />
        ) : (
        <ul className="mt-8 grid gap-5 md:grid-cols-2">
          {rows.map((r) => {
            const job = r.job;
            const isRunning = job?.status === "running";
            const attention = r.counts.missing + r.counts.stale + r.counts.staff_stale;
            return (
              <li key={r.code} className="border bg-card p-5" data-testid={`lang-${r.code}`}>
                <div className="flex items-start justify-between gap-3">
                  <div dir={r.dir}>
                    <p className="font-display text-2xl leading-tight" lang={r.code}>{r.native}</p>
                    <p className="label-caps mt-1 text-[0.6rem] text-muted-foreground" dir="ltr">
                      {r.name} · {r.code}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {r.tier === "experimental" && <span className="label-caps border border-highlight/60 px-1.5 py-0.5 text-[0.58rem] text-highlight">Experimental</span>}
                    {props.providerName === "mistral" && <span className="label-caps text-[0.58rem] text-muted-foreground">{r.engine} engine</span>}
                  </div>
                </div>

                <div className="mt-5 h-1.5 w-full overflow-hidden bg-muted" role="progressbar" aria-valuenow={r.percent} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full bg-primary transition-all" style={{ width: `${r.percent}%` }} />
                </div>
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="font-numeric text-foreground">{r.percent}%</span>
                  <span>{r.counts.fresh} machine</span>
                  <span>{r.counts.staff + r.counts.staff_stale} by staff</span>
                  {r.counts.missing > 0 && <span className="text-destructive">{r.counts.missing} missing</span>}
                  {r.counts.stale > 0 && <span className="text-ornament">{r.counts.stale} out of date</span>}
                  {r.counts.staff_stale > 0 && <span className="text-highlight">{r.counts.staff_stale} to review</span>}
                </p>

                {job && (
                  <p className="mt-3 text-xs text-muted-foreground" data-testid={`job-${r.code}`}>
                    {isRunning ? (
                      <span className="inline-flex items-center gap-1.5 text-foreground">
                        <Loader2 className="size-3 animate-spin" /> Translating… {job.done}/{job.total}
                      </span>
                    ) : (
                      <>
                        Last run {job.status}
                        {job.chars ? ` · ${job.chars.toLocaleString()} characters` : job.tokens ? ` · ${job.tokens.toLocaleString()} tokens` : ""}
                        {job.failed ? ` · ${job.failed} left in ${props.defaultNative}` : ""}
                        {job.model ? ` · ${job.model}` : ""}
                      </>
                    )}
                    {job.error && !isRunning && <span className="mt-1 block text-destructive">{job.error}</span>}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => translate(r.code)} disabled={pending || isRunning || attention === 0}>
                    {attention === 0 ? "Up to date" : "Translate what’s missing"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmForce(r.code)} disabled={pending || isRunning}>
                    <RefreshCw className="size-3.5" /> Regenerate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setLang(r.code); setReviewOpen(true); setTimeout(() => document.getElementById("review")?.scrollIntoView({ behavior: "smooth" }), 50); }}>
                    Review
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        )}

        <label className="mt-8 flex items-center justify-between gap-6 border-t pt-6">
          <span>
            <span className="label-caps block">Offer experimental languages</span>
            <span className="text-sm text-muted-foreground">
              Languages outside the well-supported set are machine translated and may be inaccurate. Diners see a warning. Switch off to hide them.
            </span>
          </span>
          <Switch checked={props.allowExperimental} onCheckedChange={(c) => act(() => setAllowExperimental(restaurantId, c), c ? "Experimental languages on" : "Experimental languages off")} disabled={pending} aria-label="Offer experimental languages" />
        </label>
      </section>

      {/* ── review ─────────────────────────────────────────────────── */}
      {rows.length > 0 && current && (
        <Collapsible
          id="review"
          level="h2"
          title="Review & edit"
          meta={`${current.name} · ${visible.length} ${visible.length === 1 ? "text" : "texts"}`}
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          headerClassName="border-b pb-4"
          titleClassName="text-3xl"
        >
          <div className="flex flex-wrap items-center gap-3 py-4">
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 start-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={reviewQuery} onChange={(e) => setReviewQuery(e.target.value)} placeholder="Search texts" aria-label="Search texts" className="ps-8" />
            </div>
            <div className="w-48">
              <NativeSelect value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language to review">
                {rows.map((r) => (
                  <option key={r.code} value={r.code}>{r.native} · {r.name}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="w-44">
              <NativeSelect value={filter} onChange={(e) => setFilter(e.target.value as "attention" | "all")} aria-label="Filter">
                <option value="attention">Needs attention</option>
                <option value="all">Everything</option>
              </NativeSelect>
            </div>
            {groups.length > 1 && (
              <Button variant="ghost" size="sm" className="ms-auto" onClick={() => setAllGroups(openCount < groups.length)}>
                {openCount < groups.length ? "Expand all" : "Collapse all"}
              </Button>
            )}
          </div>

          {groups.length === 0 && (
            <p className="py-10 text-center text-muted-foreground">
              {rq ? `No text matches “${reviewQuery.trim()}”.` : `Nothing needs attention in ${current.name}.`}
            </p>
          )}
          <div className="divide-y border-y">
            {groups.map((g, gi) => {
              const open = groupOpen(g.key, gi);
              const todo = g.units.filter((u) => {
                const st = u.byLang[lang]?.state;
                return st && st !== "fresh" && st !== "staff";
              }).length;
              return (
                <Collapsible
                  key={g.key}
                  open={open}
                  onOpenChange={(o) => setGroupChoice((c) => ({ ...c, [g.key]: o }))}
                  title={g.title || "Untitled"}
                  meta={`${g.kind} · ${g.units.length} ${g.units.length === 1 ? "text" : "texts"}${todo ? ` · ${todo} to check` : ""}`}
                  headerClassName="px-1 py-3"
                  titleClassName="font-display text-xl"
                >
                  <ul className="divide-y border-t">
                    {g.units.map((u) => {
                      const cell = u.byLang[lang];
                      const key = `${u.id}:${lang}`;
                      const value = drafts[key] ?? cell.text;
                      const changed = value.trim() !== cell.text.trim();
                      return (
                        <li key={key} className="grid gap-4 px-1 py-5 md:grid-cols-2" data-testid={`unit-${u.id}`}>
                          <div>
                            <p className="label-caps text-[0.6rem] text-muted-foreground">
                              {u.group} · {u.who} · {FIELD_LABEL[u.field] ?? u.field}
                            </p>
                            <p className="mt-1.5 leading-relaxed">{u.source}</p>
                          </div>
                          <div>
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <Badge state={cell.state} />
                            </div>
                            <Textarea
                              value={value}
                              dir={current.dir}
                              lang={lang}
                              rows={Math.min(8, Math.max(2, Math.ceil(u.source.length / 60)))}
                              onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                              placeholder={cell.state === "missing" ? "Not translated yet — type a translation, or press Translate." : ""}
                              aria-label={`${current.name} translation`}
                            />
                            <div className="mt-2 flex gap-2">
                              <Button
                                size="sm"
                                disabled={pending || !changed}
                                onClick={() =>
                                  act(
                                    () => saveTranslation(restaurantId, u.entity, u.entityId, u.field, lang, value),
                                    value.trim() ? "Saved. Your wording is now protected from machine updates." : "Cleared. It will be translated again.",
                                  )
                                }
                              >
                                Save
                              </Button>
                              {cell.state === "staff" || cell.state === "staff_stale" ? (
                                <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => saveTranslation(restaurantId, u.entity, u.entityId, u.field, lang, ""), "Reverted to machine translation")}>
                                  Revert to machine
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Collapsible>
              );
            })}
          </div>
        </Collapsible>
      )}

      <GlossaryEditor restaurantId={restaurantId} initial={props.glossary} langs={rows} pending={pending} act={act} />

      <ConfirmDialog
        open={confirmGenerate !== null}
        onOpenChange={(o) => !o && setConfirmGenerate(null)}
        title={`Offer ${confirmGenerate?.length ?? 0} language${confirmGenerate?.length === 1 ? "" : "s"}?`}
        description={(() => {
          const sel = new Set(confirmGenerate ?? []);
          const todo = props.choices.filter((c) => sel.has(c.code) && c.texts > 0);
          const chars = todo.reduce((n, c) => n + c.characters, 0);
          const texts = todo.reduce((n, c) => n + c.texts, 0);
          return `${texts ? `This translates ${texts.toLocaleString()} texts (about ${chars.toLocaleString()} characters) with ${props.providerName}. ` : "Everything selected is already translated, so no translation call is made. "}Diners will see exactly the languages you ticked. The translations are saved permanently and stay editable; your hand-edited text is kept.`;
        })()}
        confirmLabel="Generate"
        onConfirm={() => {
          if (!confirmGenerate) return;
          setWatchUntil(horizon(180_000));
          start(async () => {
            const res = await generateLanguages(restaurantId, confirmGenerate);
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success(`Offering ${res.data.languages} languages. Translating in the background…${res.data.skipped.length ? ` (${res.data.skipped.length} not offered by ${props.providerName}: ${res.data.skipped.slice(0, 4).join(", ")})` : ""}`);
            router.refresh();
          });
        }}
      />

      <ConfirmDialog
        open={confirmForce !== undefined}
        onOpenChange={(o) => !o && setConfirmForce(undefined)}
        title="Regenerate machine translations?"
        description="Machine text will be rewritten, so wording may change. Anything you edited by hand is kept."
        confirmLabel="Regenerate"
        onConfirm={() => translate(confirmForce ?? undefined, true)}
      />
    </div>
  );
}

function GlossaryEditor({
  restaurantId,
  initial,
  langs,
  pending,
  act,
}: {
  restaurantId: string;
  initial: GlossaryTerm[];
  langs: LangRow[];
  pending: boolean;
  act: (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string) => void;
}) {
  const [terms, setTerms] = useState<GlossaryTerm[]>(initial);
  const [lang, setLang] = useState(langs[0]?.code ?? "");
  const [q, setQ] = useState("");
  const dirty = JSON.stringify(terms) !== JSON.stringify(initial);
  const patch = (i: number, p: Partial<GlossaryTerm>) => setTerms((t) => t.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const needle = q.trim().toLowerCase();
  const rowsShown = terms.map((t, i) => ({ t, i })).filter(({ t }) => !needle || t.term.toLowerCase().includes(needle));

  return (
    <Collapsible
      id="glossary"
      level="h2"
      title="Glossary"
      meta={`${terms.length} ${terms.length === 1 ? "term" : "terms"}`}
      defaultOpen={terms.length <= 12}
      headerClassName="border-b pb-4"
      titleClassName="text-3xl"
    >
      <p className="mt-4 max-w-xl text-muted-foreground">
        Terms that must never be translated: dish styles, producers, regions. They are protected word for word in every language.
        “Fixed” lets you choose the exact rendering for one language. Changing the glossary marks affected text as out of date.
      </p>
      {terms.length > 8 && (
        <div className="relative mt-4 max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 start-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search terms" aria-label="Search terms" className="ps-8" />
        </div>
      )}
      <ul className="mt-4 divide-y">
        {rowsShown.map(({ t, i }) => (
          <li key={i} className="grid items-center gap-3 py-3 sm:grid-cols-[1.4fr_1fr_1.4fr_auto]">
            <Input value={t.term} onChange={(e) => patch(i, { term: e.target.value })} aria-label="Term" placeholder="e.g. tagliolini" />
            <NativeSelect value={t.kind} onChange={(e) => patch(i, { kind: e.target.value as GlossaryTerm["kind"] })} aria-label="Mode">
              <option value="keep">Keep as written</option>
              <option value="fixed">Fixed per language</option>
            </NativeSelect>
            {t.kind === "fixed" ? (
              <Input
                value={t.fixed?.[lang] ?? ""}
                onChange={(e) => patch(i, { fixed: { ...(t.fixed ?? {}), [lang]: e.target.value } })}
                placeholder={lang ? `Rendering in ${lang}` : "Add a language first"}
                disabled={!lang}
                aria-label="Fixed rendering"
              />
            ) : (
              <span className="text-sm text-muted-foreground">Appears exactly as written</span>
            )}
            <Button variant="ghost" size="icon-sm" aria-label="Remove term" onClick={() => setTerms((x) => x.filter((_, j) => j !== i))}>
              <Trash2 className="size-3.5" />
            </Button>
          </li>
        ))}
        {terms.length === 0 && <li className="py-6 text-sm text-muted-foreground">No terms yet.</li>}
        {terms.length > 0 && rowsShown.length === 0 && <li className="py-6 text-sm text-muted-foreground">No term matches “{q}”.</li>}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => { setQ(""); setTerms((t) => [...t, { term: "", kind: "keep" }]); }}>
          <Plus className="size-3.5" /> Add term
        </Button>
        {terms.some((t) => t.kind === "fixed") && langs.length > 0 && (
          <div className="w-44">
            <NativeSelect value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language for fixed renderings">
              {langs.map((r) => (
                <option key={r.code} value={r.code}>{r.native}</option>
              ))}
            </NativeSelect>
          </div>
        )}
        <Button size="sm" disabled={pending || !dirty} onClick={() => act(() => saveGlossary(restaurantId, terms.filter((t) => t.term.trim())), "Glossary saved")}>
          Save glossary
        </Button>
      </div>
    </Collapsible>
  );
}

function GeneratePanel({
  choices,
  unsupported,
  providerName,
  waiting,
  pending,
  onGenerate,
  autoTranslate,
  onAuto,
}: {
  choices: LangChoice[];
  unsupported: number;
  providerName: string;
  waiting: { texts: number; characters: number };
  pending: boolean;
  onGenerate: (langs: string[]) => void;
  autoTranslate: boolean;
  onAuto: (on: boolean) => void;
}) {
  const initial = useMemo(() => new Set(choices.filter((c) => c.offered).map((c) => c.code)), [choices]);
  const [selected, setSelected] = useState<Set<string>>(initial);
  const [q, setQ] = useState("");
  const toggle = (code: string, on: boolean) =>
    setSelected((p) => {
      const n = new Set(p);
      if (on) n.add(code);
      else n.delete(code);
      return n;
    });
  const needle = q.trim().toLowerCase();
  const shown = choices.filter((c) => !needle || c.native.toLowerCase().includes(needle) || c.name.toLowerCase().includes(needle) || c.code.toLowerCase() === needle);
  const supportedAll = choices.filter((c) => c.tier === "supported");
  const picked = choices.filter((c) => selected.has(c.code));
  const todo = picked.filter((c) => c.texts > 0);
  const chars = todo.reduce((n, c) => n + c.characters, 0);
  const changed = picked.length !== initial.size || picked.some((c) => !initial.has(c.code)) || todo.length > 0;

  const group = (tier: "supported" | "experimental") => shown.filter((c) => c.tier === tier);
  const Row = ({ c }: { c: LangChoice }) => (
    <label className="flex cursor-pointer items-center gap-3 border-b border-border/50 px-3 py-2 hover:bg-accent/40" data-testid={`choice-${c.code}`}>
      <Checkbox checked={selected.has(c.code)} onCheckedChange={(v) => toggle(c.code, v === true)} aria-label={`Offer ${c.name}`} />
      <span className="min-w-0 flex-1 truncate" dir={c.dir}>
        <span className="font-display text-lg" lang={c.code}>{c.native}</span>
        <span className="label-caps ms-2 text-[0.55rem] text-muted-foreground" dir="ltr">{c.name}</span>
      </span>
      <span className="label-caps shrink-0 text-[0.55rem] text-muted-foreground">
        {c.texts === 0 ? <span className="text-primary">ready</span> : c.offered ? `${c.texts} to do` : ""}
      </span>
    </label>
  );

  return (
    <div className="border bg-card/60 p-6">
      <div className="max-w-2xl">
        <h2 className="text-3xl">Languages &amp; translations</h2>
        <p className="mt-2 text-muted-foreground">
          Write the menu once, in the source language, with photos. Tick the languages this restaurant should offer and press
          Generate: the menu is translated into each and saved permanently, and diners see exactly this list when they scan the QR
          code. After that, no translation call is made when diners browse, and every text stays editable.
        </p>
        <p className="mt-3 text-sm">
          {waiting.texts > 0 ? (
            <>
              <b className="font-numeric">{waiting.texts.toLocaleString()}</b> texts in the languages already offered are not translated yet.{" "}
            </>
          ) : null}
          <span className="text-muted-foreground">
            Engine: {providerName}, which offers {choices.length} languages{unsupported > 0 ? ` (${unsupported} others in our catalog are not available from it)` : ""}.
          </span>
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search languages…" className="h-9 w-56" aria-label="Search languages" />
        <Button size="sm" variant="outline" onClick={() => setSelected(new Set(choices.map((c) => c.code)))}>All {choices.length}</Button>
        <Button size="sm" variant="outline" onClick={() => setSelected(new Set(supportedAll.map((c) => c.code)))}>Well-supported ({supportedAll.length})</Button>
        <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>None</Button>
        <span className="ms-auto text-sm text-muted-foreground" data-testid="selected-count"><b className="font-numeric text-foreground">{picked.length}</b> selected</span>
      </div>

      <div className="mt-3 divide-y border" data-testid="choices">
        {(["supported", "experimental"] as const).map((tier) => {
          const items = group(tier);
          if (!items.length) return null;
          const all = choices.filter((c) => c.tier === tier);
          const inGroup = all.filter((c) => selected.has(c.code)).length;
          const setGroup = (on: boolean) =>
            setSelected((p) => {
              const n = new Set(p);
              for (const c of items) {
                if (on) n.add(c.code);
                else n.delete(c.code);
              }
              return n;
            });
          return (
            <Collapsible
              key={tier}
              id={`tier-${tier}`}
              level="h3"
              title={tier === "supported" ? "Well supported" : "Experimental"}
              meta={`${all.length} languages · ${inGroup} selected${tier === "experimental" ? " · machine translated, diners see a warning" : ""}`}
              defaultOpen={tier === "supported"}
              forceOpen={!!needle}
              headerClassName="bg-card px-3 py-2"
              titleClassName="label-caps text-[0.7rem]"
              actions={
                <>
                  <Button size="xs" variant="ghost" onClick={() => setGroup(true)}>{needle ? "Select shown" : "Select all"}</Button>
                  <Button size="xs" variant="ghost" onClick={() => setGroup(false)}>{needle ? "Clear shown" : "None"}</Button>
                </>
              }
            >
              <div className="max-h-[22rem] overflow-y-auto border-t">
                {items.map((c) => (
                  <Row key={c.code} c={c} />
                ))}
              </div>
            </Collapsible>
          );
        })}
        {shown.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No language matches “{q}”.</p>}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Button size="lg" onClick={() => onGenerate(picked.map((c) => c.code))} disabled={pending || !changed}>
          <Sparkles className="size-4" /> {picked.length ? `Generate ${picked.length} language${picked.length === 1 ? "" : "s"}` : "Offer the source language only"}
        </Button>
        <p className="text-sm text-muted-foreground" data-testid="estimate">
          {todo.length > 0 ? `${todo.reduce((n, c) => n + c.texts, 0).toLocaleString()} texts · about ${chars.toLocaleString()} characters to translate` : picked.length ? "Nothing new to translate for this selection." : ""}
        </p>
      </div>

      <label className="mt-6 flex items-center justify-between gap-6 border-t pt-5">
        <span>
          <span className="label-caps block">Translate automatically when menu text changes</span>
          <span className="text-sm text-muted-foreground">
            Off by default: editing a dish never spends a translation call. Switch on only if you want every change translated right away.
          </span>
        </span>
        <Switch checked={autoTranslate} onCheckedChange={onAuto} disabled={pending} aria-label="Translate automatically" />
      </label>
    </div>
  );
}

function CompactTable({ rows, defaultNative, pending, onTranslate, onReview }: { rows: LangRow[]; defaultNative: string; pending: boolean; onTranslate: (code: string) => void; onReview: (code: string) => void }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const matching = rows.filter((r) => !needle || r.native.toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle) || r.code.toLowerCase() === needle);
  const needsWork = (r: LangRow) => r.job?.status === "running" || r.job?.status === "failed" || r.counts.missing + r.counts.stale + r.counts.staff_stale > 0;
  const todo = matching.filter(needsWork);
  const done = matching.filter((r) => !needsWork(r));

  const line = (r: LangRow) => {
    const running = r.job?.status === "running";
    const attention = r.counts.missing + r.counts.stale + r.counts.staff_stale;
    return (
      <div key={r.code} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] items-center gap-4 px-4 py-2.5" data-testid={`lang-${r.code}`}>
        <div className="min-w-0" dir={r.dir}>
          <span className="font-display text-lg" lang={r.code}>{r.native}</span>{" "}
          <span className="label-caps text-[0.58rem] text-muted-foreground" dir="ltr">{r.name}</span>
          {r.tier === "experimental" && <span className="label-caps ms-2 text-[0.55rem] text-highlight" dir="ltr">experimental</span>}
        </div>
        <div className="min-w-0 text-xs text-muted-foreground" data-testid={`job-${r.code}`}>
          <div className="h-1 bg-muted"><div className="h-full bg-primary" style={{ width: `${r.percent}%` }} /></div>
          <p className="mt-1 truncate">
            {running ? `Translating… ${r.job?.done}/${r.job?.total}` : `${r.percent}%${attention ? ` · ${attention} to do` : ""}${r.job?.failed ? ` · ${r.job.failed} left in ${defaultNative}` : ""}${r.job?.status === "failed" && r.job.error ? ` · ${r.job.error.slice(0, 60)}` : ""}`}
          </p>
        </div>
        <div className="flex gap-1">
          <Button size="xs" variant="outline" disabled={pending || running || attention === 0} onClick={() => onTranslate(r.code)}>
            {attention === 0 ? "Done" : "Translate"}
          </Button>
          <Button size="xs" variant="ghost" onClick={() => onReview(r.code)}>Review</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-4" data-testid="lang-table">
      <div className="relative mb-3 max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 start-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search offered languages" aria-label="Search offered languages" className="ps-8" />
      </div>
      <div className="divide-y border">
        {todo.length > 0 && (
          <Collapsible level="h3" title="Needs translating" meta={`${todo.length} ${todo.length === 1 ? "language" : "languages"}`} defaultOpen forceOpen={!!needle} headerClassName="bg-card px-4 py-2" titleClassName="label-caps text-[0.7rem]">
            <div className="divide-y border-t">{todo.map(line)}</div>
          </Collapsible>
        )}
        {done.length > 0 && (
          <Collapsible level="h3" title="Complete" meta={`${done.length} ${done.length === 1 ? "language" : "languages"}`} defaultOpen={todo.length === 0} forceOpen={!!needle} headerClassName="bg-card px-4 py-2" titleClassName="label-caps text-[0.7rem]">
            <div className="divide-y border-t">{done.map(line)}</div>
          </Collapsible>
        )}
        {matching.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No language matches “{q}”.</p>}
      </div>
    </div>
  );
}
