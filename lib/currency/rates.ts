import "server-only";
import { languageCurrency } from "@/lib/i18n/currency";

/** An exchange rate for one currency pair, as of the day the provider published it. */
export type Fx = { from: string; to: string; rate: number; date: string };

// Free, keyless, daily rates for ~160 currencies. The provider's terms ask for attribution (shown in the menu footer).
const ENDPOINT = "https://open.er-api.com/v6/latest";

/** Pull one rate out of the provider's payload; null if it is not a well-formed success response. */
export function parseRate(payload: unknown, from: string, to: string): Fx | null {
  const p = payload as { result?: string; base_code?: string; rates?: Record<string, unknown>; time_last_update_unix?: number } | null;
  if (!p || p.result !== "success" || p.base_code !== from) return null;
  const rate = p.rates?.[to];
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) return null;
  const date = typeof p.time_last_update_unix === "number" ? new Date(p.time_last_update_unix * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return { from, to, rate, date };
}

/**
 * Today's rate for `from` → `to`, or null when it cannot be had. Called while a menu page is being
 * (re)generated, never from the browser; Next caches the response so the provider is hit a few times a day.
 * Any failure just means the menu is shown without the approximate price.
 */
export async function getFx(from: string, to: string): Promise<Fx | null> {
  if (!from || !to || from === to) return null;
  try {
    const res = await fetch(`${ENDPOINT}/${encodeURIComponent(from)}`, {
      next: { revalidate: 21_600 },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return parseRate(await res.json(), from, to);
  } catch {
    return null;
  }
}

/** The rate to show on a restaurant's `lang` menu: menu currency → the language's home currency (null = show nothing). */
export async function menuFx(restaurant: { currency: string; show_converted_prices?: boolean }, lang: string): Promise<Fx | null> {
  if (restaurant.show_converted_prices === false) return null;
  const home = languageCurrency(lang);
  return home && home !== restaurant.currency ? getFx(restaurant.currency, home) : null;
}
