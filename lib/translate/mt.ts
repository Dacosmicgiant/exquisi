/**
 * Shared plumbing for machine-translation APIs (DeepL): entity handling, protected-term
 * markup, a small concurrency limiter, and a fetch wrapper with sensible retry rules.
 */
import { ProviderError } from "./provider";

export const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
/** Undo HTML/XML entity encoding ("&#39;", "&amp;", "&quot;"…) in an API response. */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (m, e: string) => {
    if (e[0] === "#") {
      const cp = e[1] === "x" || e[1] === "X" ? Number.parseInt(e.slice(2), 16) : Number.parseInt(e.slice(1), 10);
      return Number.isFinite(cp) && cp > 0 && cp < 0x110000 ? String.fromCodePoint(cp) : m;
    }
    return NAMED[e] ?? m;
  });
}

const TOKEN = /\[\[T\d+\]\]/g;
/** Wrap each protected-term placeholder so the engine leaves it alone. */
export const wrapTokens = (s: string, open: string, close: string) => s.replace(TOKEN, (t) => `${open}${t}${close}`);

export type Limiter = <T>(fn: () => Promise<T>) => Promise<T>;
export function createLimiter(max: number): Limiter {
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    active--;
    queue.shift()?.();
  };
  return async (fn) => {
    if (active >= max) await new Promise<void>((r) => queue.push(r));
    active++;
    try {
      return await fn();
    } finally {
      next();
    }
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch + JSON with retries for what is worth retrying (429, 5xx, network, timeout), honouring
 * Retry-After. Quota/auth/bad-request errors fail immediately with a clear kind.
 */
export async function mtFetchJson<T>(
  url: string,
  init: RequestInit,
  opts: { name: string; maxAttempts?: number; timeoutMs?: number; sleepMs?: (attempt: number) => number } = { name: "provider" },
): Promise<{ data: T; headers: Headers }> {
  const max = opts.maxAttempts ?? 5;
  let last: ProviderError | undefined;
  for (let attempt = 0; attempt < max; attempt++) {
    let wait = 0;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 45_000);
      let res: Response;
      try {
        res = await fetch(url, { ...init, signal: ctrl.signal });
      } finally {
        clearTimeout(timer);
      }
      if (res.ok) return { data: (await res.json()) as T, headers: res.headers };
      const body = (await res.text().catch(() => "")).slice(0, 240);
      if (res.status === 429 || res.status >= 500) {
        const ra = Number(res.headers.get("retry-after"));
        wait = Number.isFinite(ra) && ra > 0 ? ra * 1000 : (opts.sleepMs?.(attempt) ?? Math.min(20_000, 1000 * 2 ** attempt));
        last = new ProviderError(`${opts.name} ${res.status}`, res.status === 429 ? "rate_limit" : "http", res.status);
      } else if (res.status === 456 || (res.status === 403 && /quota|limit|billing/i.test(body))) {
        throw new ProviderError(`${opts.name}: quota exhausted (${res.status}). ${body}`, "quota", res.status);
      } else if (res.status === 401 || res.status === 403) {
        throw new ProviderError(`${opts.name}: the API key was rejected (${res.status}). ${body}`, "config", res.status);
      } else {
        throw new ProviderError(`${opts.name} ${res.status}: ${body}`, "http", res.status);
      }
    } catch (e) {
      if (e instanceof ProviderError && e.kind !== "rate_limit" && e.kind !== "http") throw e;
      if (e instanceof ProviderError && e.status && e.status < 500 && e.status !== 429) throw e;
      if (!(e instanceof ProviderError)) {
        const aborted = e instanceof Error && e.name === "AbortError";
        last = new ProviderError(aborted ? `${opts.name} request timed out` : `${opts.name} network error: ${(e as Error).message}`, aborted ? "timeout" : "http");
        wait = opts.sleepMs?.(attempt) ?? Math.min(15_000, 1000 * 2 ** attempt);
      }
    }
    if (attempt < max - 1) await sleep(wait);
  }
  throw last ?? new ProviderError(`${opts.name} failed`, "http");
}
