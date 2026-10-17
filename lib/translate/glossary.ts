import type { GlossaryTerm } from "@/lib/db/types";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const TOKEN_RE = /\[\[\s*T(\d+)\s*\]\]/g;

/** One regex over all terms, longest first, so "tagliolini al tartufo" wins over "tagliolini". */
function termRegex(terms: GlossaryTerm[]): RegExp | null {
  const parts = terms
    .map((t) => t.term.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(esc);
  if (!parts.length) return null;
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${parts.join("|")})(?![\\p{L}\\p{N}])`, "giu");
}

/** Glossary terms that actually occur in `text` (case-insensitive, whole word). */
export function relevantTerms(text: string, glossary: GlossaryTerm[]): GlossaryTerm[] {
  return glossary.filter((g) => {
    const re = termRegex([g]);
    return !!re && re.test(text);
  });
}

const findTerm = (glossary: GlossaryTerm[], matched: string) =>
  glossary.find((g) => g.term.trim().toLowerCase() === matched.toLowerCase());

export type KeepToken = { token: string; value: string };

/**
 * Replace glossary terms with numbered placeholders ([[T1]], [[T2]]…) that the model must copy
 * unchanged, then put the exact original back after translation. Small models transliterate or
 * garble names when merely asked to "keep" them ("Guanciale" → "ग्वांचiale"); placeholders make
 * the name survive byte-for-byte. "fixed" terms with a hand-written rendering for this language
 * are restored as that rendering instead.
 */
export function protectText(
  text: string,
  glossary: GlossaryTerm[],
  lang: string,
): { text: string; keeps: string[]; tokens: KeepToken[] } {
  const re = termRegex(glossary);
  if (!re) return { text, keeps: [], tokens: [] };
  const tokens: KeepToken[] = [];
  const out = text.replace(re, (m) => {
    const g = findTerm(glossary, m);
    const value = (g?.kind === "fixed" && g.fixed?.[lang]) || m;
    const token = `[[T${tokens.length + 1}]]`;
    tokens.push({ token, value });
    return token;
  });
  return { text: out, keeps: tokens.map((t) => t.value), tokens };
}

/** Put the protected terms back. `missing` lists terms whose placeholder the model dropped or mangled. */
export function restoreText(output: string, tokens: KeepToken[]): { text: string; missing: string[] } {
  const seen = new Set<string>();
  // small models sometimes improvise <keep> markup around original-language glosses: drop the tags, keep the words
  let text = output.replace(/<\/?keep>/gi, "").replace(TOKEN_RE, (_m, n: string) => {
    const t = tokens[Number(n) - 1];
    if (!t) return "";
    seen.add(t.token);
    return t.value;
  });
  // a hallucinated placeholder (more tokens than we sent) leaves nothing behind
  text = text.replace(/[ \t]{2,}/g, " ");
  return { text, missing: tokens.filter((t) => !seen.has(t.token)).map((t) => t.value) };
}

/** Stable signature of the glossary entries that affect `text` for `lang` (feeds the staleness hash). */
export function glossarySignature(text: string, glossary: GlossaryTerm[], lang: string): string {
  return relevantTerms(text, glossary)
    .map((g) => `${g.term.toLowerCase()}|${g.kind}|${g.kind === "fixed" ? (g.fixed?.[lang] ?? "") : ""}`)
    .sort()
    .join(";");
}
