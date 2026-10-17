import { getLanguage, type Script } from "@/lib/i18n/languages";

/**
 * Cheap, deterministic checks on one machine-translated unit. The goal is to catch
 * the failure modes seen in small models: English echoes, wrong script, mixed-script junk,
 * dropped numbers, mangled glossary terms, leaked markup. A unit that fails is retried
 * on the strong engine and, if it still fails, stays in the source language (never garbage).
 */
export type Validation = { ok: true } | { ok: false; reason: string };

const SCRIPT_RE: Record<Script, string> = {
  Latn: "\\p{Script=Latin}",
  Cyrl: "\\p{Script=Cyrillic}",
  Grek: "\\p{Script=Greek}",
  Arab: "\\p{Script=Arabic}",
  Hebr: "\\p{Script=Hebrew}",
  Deva: "\\p{Script=Devanagari}",
  Beng: "\\p{Script=Bengali}",
  Taml: "\\p{Script=Tamil}",
  Telu: "\\p{Script=Telugu}",
  Knda: "\\p{Script=Kannada}",
  Mlym: "\\p{Script=Malayalam}",
  Gujr: "\\p{Script=Gujarati}",
  Guru: "\\p{Script=Gurmukhi}",
  Orya: "\\p{Script=Oriya}",
  Sinh: "\\p{Script=Sinhala}",
  Thai: "\\p{Script=Thai}",
  Laoo: "\\p{Script=Lao}",
  Khmr: "\\p{Script=Khmer}",
  Mymr: "\\p{Script=Myanmar}",
  Ethi: "\\p{Script=Ethiopic}",
  Armn: "\\p{Script=Armenian}",
  Geor: "\\p{Script=Georgian}",
  Hans: "\\p{Script=Han}",
  Hant: "\\p{Script=Han}",
  Jpan: "\\p{Script=Han}|\\p{Script=Hiragana}|\\p{Script=Katakana}",
  Kore: "\\p{Script=Hangul}|\\p{Script=Han}",
};

const ZEROS = [0x30, 0x660, 0x6f0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66, 0xe50, 0xed0, 0x1040, 0x17e0, 0xff10];

/** Map every Unicode decimal digit to ASCII so "٢٤" and "24" compare equal. */
export function normalizeDigits(s: string): string {
  return s.replace(/\p{Nd}/gu, (ch) => {
    const cp = ch.codePointAt(0)!;
    const zero = ZEROS.filter((z) => z <= cp).pop() ?? 0x30;
    const v = cp - zero;
    return v >= 0 && v <= 9 ? String(v) : ch;
  });
}

const letters = (s: string) => (s.match(/\p{L}/gu) ?? []).length;
const countScript = (s: string, script: Script) =>
  (s.match(new RegExp(SCRIPT_RE[script], "gu")) ?? []).length;

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const removeAll = (s: string, parts: string[]) =>
  parts.reduce((acc, p) => (p ? acc.replace(new RegExp(esc(p), "gi"), " ") : acc), s);
/** The prompt allows an original-language word in parentheses when the target has no standard term. */
const withoutLatinGlosses = (s: string) => s.replace(/[(（][^)）]*\p{Script=Latin}[^)）]*[)）]/gu, " ");

export function validateUnit(args: {
  source: string;
  output: string;
  from: string;
  to: string;
  /** protected strings that must appear verbatim */
  keeps?: string[];
  /** protected strings that did not survive */
  missingKeeps?: string[];
  /** what the text is; names legitimately come back unchanged from machine translation */
  kind?: string;
}): Validation {
  const { source, output, from, to } = args;
  const out = output.trim();
  if (!out) return { ok: false, reason: "empty" };
  if (/\[\[\s*T\d|```|^\s*(translation|translated)\s*:/i.test(out)) return { ok: false, reason: "artifact" };
  if (args.missingKeeps?.length) return { ok: false, reason: `glossary:${args.missingKeeps[0]}` };

  const target = getLanguage(to);
  const src = getLanguage(from);

  // length sanity (skip for very short strings such as names)
  if (source.length >= 12) {
    const ratio = out.length / source.length;
    const min = ["Hans", "Hant", "Jpan", "Kore"].includes(target.script) ? 0.12 : 0.25;
    if (ratio < min || ratio > 4.5) return { ok: false, reason: `length:${ratio.toFixed(2)}` };
  }

  // every number in the source must survive (prices, years, counts)
  const nums = normalizeDigits(source).match(/\d+(?:[.,]\d+)?/g) ?? [];
  const outNorm = normalizeDigits(out);
  for (const n of nums) if (!outNorm.includes(n)) return { ok: false, reason: `digit:${n}` };

  // script check, ignoring protected terms which are legitimately in the source script
  const bare = withoutLatinGlosses(removeAll(out, args.keeps ?? []));
  const total = letters(bare);
  if (total >= 4) {
    const ratio = countScript(bare, target.script) / total;
    const long = total >= 40;
    if (target.script !== "Latn") {
      if (ratio < (long ? 0.85 : 0.6)) return { ok: false, reason: `script:${target.script}:${ratio.toFixed(2)}` };
      // stray Latin words in a non-Latin sentence ("मild", "サフラノリスotto") are junk, not translation
      const latinRuns = (bare.match(/\p{Script=Latin}{3,}/gu) ?? []).join("").length;
      if (latinRuns / total > 0.08) return { ok: false, reason: `mixed_script:${(latinRuns / total).toFixed(2)}` };
    } else if (ratio < 0.8) {
      return { ok: false, reason: `script:Latn:${ratio.toFixed(2)}` };
    }
  }

  // English (or any source) echoed back unchanged
  const isName = args.kind === "dish_name" || args.kind === "category" || args.kind === "restaurant_name" || args.kind === "story_title";
  if (!isName && src.script === target.script && source.length > 25 && out.toLowerCase() === source.trim().toLowerCase()) {
    return { ok: false, reason: "echo" };
  }
  return { ok: true };
}
