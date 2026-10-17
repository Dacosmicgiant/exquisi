"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { languageName, setLang, type LangMap } from "@/lib/i18n";

/**
 * One input per enabled language, writing into a language map.
 * v1 content is entered in the default language only, but every other
 * enabled language is already editable here.
 */
export function LangFields({
  label,
  languages,
  defaultLang,
  value,
  onChange,
  multiline,
  id,
  placeholder,
}: {
  label: string;
  languages: string[];
  defaultLang: string;
  value: LangMap;
  onChange: (next: LangMap) => void;
  multiline?: boolean;
  id: string;
  placeholder?: string;
}) {
  const ordered = [defaultLang, ...languages.filter((l) => l !== defaultLang)];
  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-${defaultLang}`} className="label-caps">
        {label}
      </Label>
      <div className="space-y-2">
        {ordered.map((lang) => {
          const common = {
            id: `${id}-${lang}`,
            value: value[lang] ?? "",
            placeholder: lang === defaultLang ? placeholder : `${placeholder ?? label} (${languageName(lang)})`,
            onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) =>
              onChange(setLang(value, lang, e.target.value)),
            lang,
          };
          return (
            <div key={lang} className="flex items-start gap-2">
              <span
                className="label-caps mt-2 w-9 shrink-0 text-center text-[0.6rem] text-muted-foreground"
                title={languageName(lang)}
              >
                {lang}
              </span>
              {multiline ? <Textarea rows={3} {...common} /> : <Input {...common} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
