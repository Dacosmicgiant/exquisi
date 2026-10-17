"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { languageName, setLangRaw, type LangMap } from "@/lib/i18n";

export type TranslationField = {
  key: string;
  label: string;
  value: LangMap;
  onChange: (next: LangMap) => void;
  multiline?: boolean;
};

/**
 * Translations live below everything else in a dish/category form, one language at a time.
 * (A restaurant can offer 100+ languages; showing an input per language per field made the form endless.)
 * Normally the Translations tab fills these in; editing here corrects a wording and is never overwritten.
 */
export function TranslationsPanel({
  languages,
  defaultLang,
  fields,
}: {
  languages: string[];
  defaultLang: string;
  fields: TranslationField[];
}) {
  const targets = useMemo(() => languages.filter((l) => l !== defaultLang), [languages, defaultLang]);
  const filled = (l: string) => fields.some((f) => (f.value[l] ?? "").trim());
  const filledCount = targets.filter(filled).length;
  const [open, setOpen] = useState(false);
  const [lang, setLangState] = useState(() => targets.find(filled) ?? targets[0] ?? "");

  if (targets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Only {languageName(defaultLang)} is offered so far. Tick more languages on the Translations tab and they appear here, already translated.
      </p>
    );
  }

  return (
    <div className="border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start hover:bg-accent/40"
      >
        <span>
          <span className="block text-sm font-medium">Translations</span>
          <span className="block text-xs text-muted-foreground">
            {filledCount} of {targets.length} language{targets.length === 1 ? "" : "s"} filled · generated from the Translations tab, editable here
          </span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-5 border-t px-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tr-lang" className="label-caps">Language</Label>
            <NativeSelect id="tr-lang" value={lang} onChange={(e) => setLangState(e.target.value)}>
              {targets.map((l) => (
                <option key={l} value={l}>
                  {filled(l) ? "✓ " : "   "}
                  {languageName(l)}
                </option>
              ))}
            </NativeSelect>
          </div>

          {fields.map((f) => {
            const id = `tr-${f.key}-${lang}`;
            const source = (f.value[defaultLang] ?? "").trim();
            const common = {
              id,
              lang,
              value: f.value[lang] ?? "",
              placeholder: source ? "Not translated yet" : "",
              onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => f.onChange(setLangRaw(f.value, lang, e.target.value)),
            };
            return (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={id} className="label-caps">{f.label}</Label>
                {source && <p className="text-xs text-muted-foreground">{languageName(defaultLang)}: {source}</p>}
                {f.multiline ? <Textarea rows={3} {...common} /> : <Input {...common} />}
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">Text you type here is kept: re-generating translations never overwrites it. Clear a box to let the next Generate fill it again.</p>
        </div>
      )}
    </div>
  );
}
