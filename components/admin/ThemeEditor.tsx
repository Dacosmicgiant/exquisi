"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { fontFaceCss, themeToScopedCss } from "@/lib/theme/css";
import { FONT_CATALOG } from "@/lib/theme/fonts";
import { contrastRatio, diffTheme, hasOverrides } from "@/lib/theme/overrides";
import type { ColorSet, ColorToken, Theme, ThemeOverrides } from "@/lib/theme/schema";
import { toRoman } from "@/lib/roman";
import "@/components/diner/diner.css"; // the preview uses the real diner classes

type Save = (overrides: ThemeOverrides) => Promise<{ ok: boolean; error?: string }>;

const GROUPS: { title: string; hint: string; tokens: [ColorToken, string][] }[] = [
  { title: "Surfaces", hint: "Page and panel backgrounds", tokens: [["background", "Page"], ["card", "Card"], ["popover", "Popover"], ["secondary", "Secondary"], ["muted", "Muted"], ["accent", "Hover / accent"]] },
  { title: "Text", hint: "Ink on those surfaces", tokens: [["foreground", "Main text"], ["cardForeground", "Text on card"], ["popoverForeground", "Text on popover"], ["secondaryForeground", "Text on secondary"], ["mutedForeground", "Quiet text"], ["accentForeground", "Text on accent"]] },
  { title: "Brand", hint: "Buttons, rules, emphasis", tokens: [["primary", "Primary"], ["primaryForeground", "Text on primary"], ["ornament", "Gold / ornament"], ["highlight", "Prices / emphasis"], ["ring", "Focus ring"], ["border", "Borders"], ["input", "Inputs"], ["destructive", "Danger"]] },
  { title: "Charts", hint: "Analytics colours", tokens: [["chart1", "Series 1"], ["chart2", "Series 2"], ["chart3", "Series 3"], ["chart4", "Series 4"], ["chart5", "Series 5"]] },
];

const CHECKS: { fg: ColorToken; bg: ColorToken; label: string; min: number }[] = [
  { fg: "foreground", bg: "background", label: "Main text on page", min: 4.5 },
  { fg: "mutedForeground", bg: "background", label: "Quiet text on page", min: 4.5 },
  { fg: "primaryForeground", bg: "primary", label: "Button text", min: 4.5 },
  { fg: "highlight", bg: "background", label: "Prices on page", min: 4.5 },
  { fg: "ornament", bg: "background", label: "Gold rules (decorative)", min: 3 },
];

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function ColorRow({ label, value, base, onChange }: { label: string; value: string; base: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setText(value);
  }
  const six = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
  return (
    <div className="flex items-center gap-3 py-1.5">
      <input
        type="color"
        value={six}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="size-8 shrink-0 cursor-pointer border bg-transparent p-0.5"
        aria-label={`${label} colour`}
      />
      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
      <Input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (HEX.test(e.target.value)) onChange(e.target.value);
        }}
        className="h-8 w-28 font-mono text-xs"
        aria-label={`${label} hex`}
        aria-invalid={!HEX.test(text)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={value.toLowerCase() === base.toLowerCase() ? "invisible" : ""}
        onClick={() => onChange(base)}
        aria-label={`Reset ${label}`}
        title="Reset to inherited value"
      >
        <RotateCcw className="size-3.5" />
      </Button>
    </div>
  );
}

function Preview({ theme }: { theme: Theme }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: fontFaceCss(theme) + themeToScopedCss(theme, ".tp") }} />
      <div className="grid gap-4 xl:grid-cols-2">
        {(["light", "dark"] as const).map((mode) => (
          <div key={mode} className="tp overflow-hidden border" data-mode={mode} style={{ contain: "layout paint", position: "relative" }}>
            <div className="diner px-6 py-7" style={{ minHeight: 0 }}>
              <p className="label-caps text-center text-[0.6rem] text-muted-foreground">{mode}</p>
              <h3 className="mt-2 text-center text-3xl leading-tight">Casa Valdarno</h3>
              <div className="mx-auto mt-4 max-w-[10rem] rule-double" />
              <div className="mt-6 flex items-baseline gap-3">
                {theme.ornaments.romanNumerals && <span className="font-display text-lg text-ornament">{toRoman(2)}.</span>}
                <h4 className="text-2xl">Primi</h4>
              </div>
              <div className="mt-2 rule-double" />
              <div className="py-4">
                <div className="leader">
                  <span className="font-display text-[1.25rem] leading-tight">Tagliolini al Tartufo</span>
                  {theme.ornaments.dottedLeaders && <span className="fill" aria-hidden="true" />}
                  <span className="font-numeric text-highlight">€34</span>
                </div>
                <p className="mt-1.5 text-sm">Hand-cut egg tagliolini, Casentino butter, shaved white truffle.</p>
                <p className="mt-1 text-[0.85rem] text-muted-foreground">Thin ribbon pasta served with seasonal white truffle.</p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  <li className="chip">Gluten</li>
                  <li className="chip">Milk</li>
                  <li className="chip chip-warn">Contains alcohol</li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="label-caps inline-block px-3.5 py-2 text-[0.65rem]" style={{ background: "var(--primary)", color: "var(--primary-foreground)", borderRadius: "var(--radius)" }}>Primary</span>
                <span className="label-caps inline-block border px-3.5 py-2 text-[0.65rem]" style={{ borderColor: "var(--border)", background: "var(--card)", borderRadius: "var(--radius)" }}>Card</span>
                <span className="label-caps inline-block px-3.5 py-2 text-[0.65rem]" style={{ background: "var(--accent)", color: "var(--accent-foreground)", borderRadius: "var(--radius)" }}>Accent</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function ThemeEditor({
  base,
  initial,
  onSave,
  baseLabel,
  children,
  dirtyExtra = false,
  saveDisabled = false,
  saveLabel = "Save theme",
  savedMessage = "Saved. Menus are rebuilding.",
  extraActions,
}: {
  /** Resolved theme of the layer below (theme.config.ts for the platform; the platform theme for a restaurant). */
  base: Theme;
  /** Currently effective theme (base + saved overrides). */
  initial: Theme;
  onSave: Save;
  baseLabel: string;
  children?: React.ReactNode;
  /** something outside the editor changed (e.g. the chosen theme), so Save should be enabled */
  dirtyExtra?: boolean;
  saveDisabled?: boolean;
  saveLabel?: string;
  savedMessage?: string;
  /** extra buttons in the sticky bar, given the working theme */
  extraActions?: (working: Theme) => React.ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [t, setT] = useState<Theme>(initial);
  const [edit, setEdit] = useState<"light" | "dark">("light");
  const [confirmReset, setConfirmReset] = useState(false);

  const diff = useMemo(() => diffTheme(base, t), [base, t]);
  const dirty = dirtyExtra || JSON.stringify(diffTheme(base, initial)) !== JSON.stringify(diff);

  const setColor = (mode: "light" | "dark", token: ColorToken, v: string) =>
    setT((p) => ({ ...p, colors: { ...p.colors, [mode]: { ...p.colors[mode], [token]: v } } }));

  const save = (overrides: ThemeOverrides, ok: string, then?: () => void) =>
    start(async () => {
      const res = await onSave(overrides);
      if (!res.ok) {
        toast.error(res.error ?? "Could not save");
        return;
      }
      toast.success(ok);
      then?.();
      router.refresh();
    });

  const colors: ColorSet = t.colors[edit];

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,26rem)_1fr]">
      <div className="space-y-10">
        {children}

        <section>
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-2xl">Palette</h2>
            <div className="flex border" role="tablist" aria-label="Mode to edit">
              {(["light", "dark"] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={edit === m}
                  onClick={() => setEdit(m)}
                  className={`label-caps px-3 py-1.5 text-[0.62rem] ${edit === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          {GROUPS.map((g) => (
            <div key={g.title} className="mt-6">
              <p className="label-caps text-[0.62rem]">{g.title} <span className="normal-case tracking-normal text-muted-foreground">· {g.hint}</span></p>
              <div className="mt-1 divide-y divide-border/60">
                {g.tokens.map(([token, label]) => (
                  <ColorRow key={`${edit}-${token}`} label={label} value={colors[token]} base={base.colors[edit][token]} onChange={(v) => setColor(edit, token, v)} />
                ))}
              </div>
            </div>
          ))}
          <div className="mt-6 border bg-card/50 p-4">
            <p className="label-caps text-[0.62rem]">Readability · {edit}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {CHECKS.map((c) => {
                const r = contrastRatio(colors[c.fg], colors[c.bg]);
                const ok = r !== null && r >= c.min;
                return (
                  <li key={c.label} className="flex items-center justify-between gap-3">
                    <span>{c.label}</span>
                    <span className={`font-numeric text-xs ${ok ? "text-primary" : "text-destructive"}`}>
                      {r ? r.toFixed(1) : "—"}:1 {ok ? "✓" : `needs ${c.min}:1`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="border-b pb-3 text-2xl">Typography</h2>
          {(["display", "body"] as const).map((role) => (
            <div key={role} className="space-y-2">
              <Label className="label-caps" htmlFor={`font-${role}`}>{role === "display" ? "Headings" : "Body text"}</Label>
              <NativeSelect id={`font-${role}`} value={t.fonts[role]} onChange={(e) => setT((p) => ({ ...p, fonts: { ...p.fonts, [role]: e.target.value } }))}>
                {FONT_CATALOG.map((f) => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </NativeSelect>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Menu pages load exactly these two font files. Non-Latin languages use the phone’s own fonts.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="label-caps" htmlFor="weight">Heading weight</Label>
              <NativeSelect id="weight" value={t.type.displayWeight} onChange={(e) => setT((p) => ({ ...p, type: { ...p.type, displayWeight: Number(e.target.value) } }))}>
                {[300, 400, 500, 600, 700].map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label className="label-caps" htmlFor="tracking">Label spacing</Label>
              <NativeSelect id="tracking" value={t.type.labelTracking} onChange={(e) => setT((p) => ({ ...p, type: { ...p.type, labelTracking: e.target.value } }))}>
                {["0.1em", "0.16em", "0.24em", "0.32em"].map((w) => (
                  <option key={w}>{w}</option>
                ))}
              </NativeSelect>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="border-b pb-3 text-2xl">Shape &amp; feel</h2>
          <div className="space-y-2">
            <Label className="label-caps" htmlFor="radius">Corner radius <span className="font-numeric normal-case text-muted-foreground">{t.radius}</span></Label>
            <input
              id="radius"
              type="range"
              min={0}
              max={1.25}
              step={0.125}
              value={Number.parseFloat(t.radius)}
              onChange={(e) => setT((p) => ({ ...p, radius: `${e.target.value}rem` }))}
              className="w-full accent-[var(--primary)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="label-caps" htmlFor="density">Density</Label>
              <NativeSelect id="density" value={t.density} onChange={(e) => setT((p) => ({ ...p, density: e.target.value as Theme["density"] }))}>
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="spacious">Spacious</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label className="label-caps" htmlFor="mode">Default mode</Label>
              <NativeSelect id="mode" value={t.mode} onChange={(e) => setT((p) => ({ ...p, mode: e.target.value as Theme["mode"] }))}>
                <option value="system">Follow the device</option>
                <option value="light">Always light</option>
                <option value="dark">Always dark</option>
              </NativeSelect>
            </div>
          </div>
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>Gentle motion<span className="block text-xs text-muted-foreground">Fades and rises on the menu</span></span>
            <Switch checked={t.motion.enabled} onCheckedChange={(c) => setT((p) => ({ ...p, motion: { ...p.motion, enabled: c } }))} />
          </label>
        </section>

        <section className="space-y-3">
          <h2 className="border-b pb-3 text-2xl">Ornaments</h2>
          {(
            [
              ["doubleRule", "Double rules", "Thin-over-thick lines under headings"],
              ["paperGrain", "Paper grain", "A barely visible paper texture"],
              ["romanNumerals", "Roman numerals", "I. Antipasti · II. Primi"],
              ["dottedLeaders", "Dotted leaders", "Dish ······· price"],
            ] as const
          ).map(([key, title, hint]) => (
            <label key={key} className="flex items-center justify-between gap-4 text-sm">
              <span>{title}<span className="block text-xs text-muted-foreground">{hint}</span></span>
              <Switch checked={t.ornaments[key]} onCheckedChange={(c) => setT((p) => ({ ...p, ornaments: { ...p.ornaments, [key]: c } }))} />
            </label>
          ))}
        </section>

        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t bg-background/95 px-4 py-4 backdrop-blur sm:mx-0 sm:px-0">
          <Button size="lg" className="label-caps" disabled={pending || !dirty || saveDisabled} onClick={() => save(diff, savedMessage)}>
            {pending ? "Saving…" : saveLabel}
          </Button>
          {extraActions?.(t)}
          <Button variant="ghost" onClick={() => setT(base)} disabled={pending}>
            Reset to {baseLabel}
          </Button>
          {hasOverrides(diffTheme(base, initial)) && (
            <Button variant="ghost" onClick={() => setConfirmReset(true)} disabled={pending}>
              Remove saved changes
            </Button>
          )}
        </div>
      </div>

      <div className="xl:sticky xl:top-20 xl:self-start">
        <p className="label-caps mb-3 text-[0.62rem] text-muted-foreground">Live preview · light and dark</p>
        <Preview theme={t} />
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={`Remove all saved changes?`}
        description={`Everything returns to ${baseLabel}. This rebuilds the affected menus.`}
        confirmLabel="Remove changes"
        onConfirm={() => save({}, "Back to defaults", () => setT(base))}
      />
    </div>
  );
}
