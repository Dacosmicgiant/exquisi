/**
 * Small SVG flags, ONLY for languages where one country clearly owns the language (see the
 * `flag` field in lib/i18n/languages.ts). Anything not drawn here simply shows no flag.
 */
type Spec =
  | { h: [string, number][] }
  | { v: [string, number][] }
  | { dot: [string, string] }
  | { cross: [string, string, string?] };

const W = "#ffffff";
const SPECS: Record<string, Spec> = {
  it: { v: [["#009246", 1], [W, 1], ["#ce2b37", 1]] },
  fr: { v: [["#0055a4", 1], [W, 1], ["#ef4135", 1]] },
  de: { h: [["#000000", 1], ["#dd0000", 1], ["#ffce00", 1]] },
  nl: { h: [["#ae1c28", 1], [W, 1], ["#21468b", 1]] },
  pl: { h: [[W, 1], ["#dc143c", 1]] },
  hu: { h: [["#ce2939", 1], [W, 1], ["#477050", 1]] },
  bg: { h: [[W, 1], ["#00966e", 1], ["#d62612", 1]] },
  ro: { v: [["#002b7f", 1], ["#fcd116", 1], ["#ce1126", 1]] },
  ua: { h: [["#0057b7", 1], ["#ffd700", 1]] },
  ee: { h: [["#0072ce", 1], ["#000000", 1], [W, 1]] },
  lt: { h: [["#fdb913", 1], ["#006a44", 1], ["#c1272d", 1]] },
  id: { h: [["#e70011", 1], [W, 1]] },
  th: { h: [["#a51931", 1], [W, 1], ["#2d2a4a", 2], [W, 1], ["#a51931", 1]] },
  jp: { dot: [W, "#bc002d"] },
  se: { cross: ["#006aa7", "#fecc00"] },
  dk: { cross: ["#c8102e", W] },
  fi: { cross: [W, "#003580"] },
  no: { cross: ["#ba0c2f", W, "#00205b"] },
};

export function Flag({ code, className = "" }: { code?: string; className?: string }) {
  const spec = code ? SPECS[code] : undefined;
  if (!spec) return null;
  const stripes = (list: [string, number][], vertical: boolean) => {
    const total = list.reduce((a, [, w]) => a + w, 0);
    let pos = 0;
    return list.map(([c, w], i) => {
      const size = (w / total) * (vertical ? 3 : 2);
      const el = vertical ? (
        <rect key={i} x={pos} y={0} width={size} height={2} fill={c} />
      ) : (
        <rect key={i} x={0} y={pos} width={3} height={size} fill={c} />
      );
      pos += size;
      return el;
    });
  };
  return (
    <svg viewBox="0 0 3 2" aria-hidden="true" className={`inline-block h-[0.9em] w-[1.35em] shrink-0 outline outline-1 -outline-offset-1 outline-black/15 ${className}`}>
      {"h" in spec && stripes(spec.h, false)}
      {"v" in spec && stripes(spec.v, true)}
      {"dot" in spec && (
        <>
          <rect width="3" height="2" fill={spec.dot[0]} />
          <circle cx="1.5" cy="1" r="0.6" fill={spec.dot[1]} />
        </>
      )}
      {"cross" in spec && (
        <>
          <rect width="3" height="2" fill={spec.cross[0]} />
          {spec.cross[2] ? (
            <>
              <rect x="0.8" width="0.5" height="2" fill={spec.cross[1]} />
              <rect y="0.75" width="3" height="0.5" fill={spec.cross[1]} />
              <rect x="0.9" width="0.3" height="2" fill={spec.cross[2]} />
              <rect y="0.85" width="3" height="0.3" fill={spec.cross[2]} />
            </>
          ) : (
            <>
              <rect x="0.8" width="0.4" height="2" fill={spec.cross[1]} />
              <rect y="0.8" width="3" height="0.4" fill={spec.cross[1]} />
            </>
          )}
        </>
      )}
    </svg>
  );
}
