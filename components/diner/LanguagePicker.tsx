"use client";

import { useEffect, useMemo, useState } from "react";
import { Flag } from "@/components/diner/Flag";
import { track } from "@/lib/analytics/client";
import { matchBrowserLanguages } from "@/lib/i18n/languages";

export type LangLite = { code: string; name: string; native: string; dir: "ltr" | "rtl"; tier: "supported" | "experimental"; flag?: string };

const COOKIE = "ms-lang";

const readCookie = (): string | null => {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
};
const remember = (code: string) => {
  try {
    document.cookie = `${COOKIE}=${encodeURIComponent(code)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  } catch {}
};

/** Plain <a>: choosing a language is a full document navigation anyway (the menu is its own root layout). */
function Option({ l, slug, hint, big = true }: { l: LangLite; slug: string; hint?: string; big?: boolean }) {
  return (
    <a
      href={`/m/${slug}/${l.code}`}
      data-lang={l.code}
      className="lang-option group flex items-center justify-between gap-4 border border-border bg-card/60 px-5 py-4"
      lang={l.code}
      dir={l.dir}
    >
      <span className="flex min-w-0 items-center gap-3">
        <Flag code={l.flag} />
        <span className={`${big ? "text-[1.7rem]" : "text-xl"} font-display leading-tight`}>{l.native}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end text-end" dir="ltr">
        <span className="label-caps text-[0.62rem] text-muted-foreground">{hint ?? l.name}</span>
        {l.tier === "experimental" && <span className="label-caps text-[0.58rem] text-highlight">experimental</span>}
      </span>
    </a>
  );
}

/**
 * The only client island on the language screen. Without JavaScript every option is still a
 * plain link; with it we add: your phone's language on top, your last choice, and search.
 * The full list is always rendered (a restaurant may offer 100+ languages); offscreen rows skip
 * layout via content-visibility so the first paint stays fast.
 */
export function LanguagePicker({ slug, languages }: { slug: string; languages: LangLite[] }) {
  // The server renders the first language in the "suggested" slot, so the layout is already the
  // right height before JavaScript runs; the browser's language then swaps in without a shift.
  const [suggested, setSuggested] = useState<LangLite[]>(languages.slice(0, 1));
  const [remembered, setRemembered] = useState<LangLite | null>(null);
  const [q, setQ] = useState("");

  const all = useMemo(() => new Map(languages.map((l) => [l.code, l])), [languages]);

  useEffect(() => {
    // external sources (browser settings + cookie), read once on mount
    const prefs = matchBrowserLanguages(navigator.languages?.length ? navigator.languages : [navigator.language]);
    const mine = prefs.map((p) => all.get(p.code)).filter((x): x is LangLite => !!x);
    const saved = readCookie();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemembered(saved ? (all.get(saved) ?? null) : null);
    if (mine.length) setSuggested(mine.slice(0, 1));
  }, [all]);

  // One delegated handler instead of one per option: remember the choice and count the tap.
  const onPick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-lang]");
    if (!a) return;
    const code = a.dataset.lang!;
    remember(code);
    track({ slug, type: "language_select", language: code });
  };

  const top = new Set<string>([...(remembered ? [remembered.code] : []), ...suggested.map((s) => s.code)]);
  const needle = q.trim().toLowerCase();
  const matches = (l: LangLite) => l.native.toLowerCase().includes(needle) || l.name.toLowerCase().includes(needle) || l.code.toLowerCase() === needle;
  const rest = languages.filter((l) => !top.has(l.code) && (!needle || matches(l)));
  const showTop = !needle;

  return (
    <div className="mt-10 space-y-10" onClick={onPick}>
      {showTop && (remembered || suggested.length > 0) && (
        <section aria-label="Suggested for you" className="space-y-2.5">
          <h2 className="label-caps text-[0.68rem] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
            {remembered ? "Your last choice" : "Suggested for you"}
          </h2>
          {remembered && <Option l={remembered} slug={slug} />}
          {suggested.filter((s) => s.code !== remembered?.code).map((l) => (
            <Option key={l.code} l={l} slug={slug} />
          ))}
        </section>
      )}

      <section aria-label="Available here" className="space-y-3">
        <h2 className="label-caps text-[0.68rem] text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
          {languages.length > 1 ? `All ${languages.length} languages at this restaurant` : "Available at this restaurant"}
        </h2>
        {languages.length > 8 && (
          <label className="block">
            <span className="sr-only">Search languages</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search languages…"
              className="w-full border border-border bg-transparent px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:border-ornament"
              autoComplete="off"
            />
          </label>
        )}
        <div className="space-y-2.5">
          {rest.map((l) => (
            <Option key={l.code} l={l} slug={slug} big={false} />
          ))}
          {rest.length === 0 && needle && <p className="py-6 text-center text-sm text-muted-foreground">No language matches “{q}”.</p>}
        </div>
        {languages.some((l) => l.tier === "experimental") && (
          <p className="pt-1 text-center text-xs text-muted-foreground">
            Languages marked “experimental” are machine translated and may be inaccurate.
          </p>
        )}
      </section>
    </div>
  );
}
