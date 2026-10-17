/** Prices are stored as integer minor units (cents/paise) in the restaurant's currency. */
const digits = (currency: string) =>
  new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;

export const toMinor = (major: number, currency: string) =>
  Math.round(major * 10 ** digits(currency));

export const toMajor = (minor: number, currency: string) => minor / 10 ** digits(currency);

/** Menu-style price: no currency clutter, trailing zeros dropped (e.g. "24", "18.50"). */
export function formatPlain(minor: number, currency: string): string {
  const major = toMajor(minor, currency);
  return Number.isInteger(major) ? String(major) : major.toFixed(digits(currency));
}

export function formatPrice(minor: number, currency: string, lang = "en"): string {
  return new Intl.NumberFormat(lang, { style: "currency", currency }).format(toMajor(minor, currency));
}

export function currencySymbol(currency: string, lang = "en"): string {
  return (
    new Intl.NumberFormat(lang, { style: "currency", currency })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? currency
  );
}

/** Convert a price in minor units of `from` into a plain number of major units of `to`. */
export const convertMajor = (minor: number, from: string, rate: number): number => toMajor(minor, from) * rate;

/**
 * "≈ ₹1,640": an approximate price in another currency, formatted for the reader's language.
 * Big amounts drop the decimals; small ones keep them so "≈ $2.10" isn't shown as "$2".
 */
export function formatApprox(major: number, currency: string, lang = "en"): string {
  const whole = major >= 100 || digits(currency) === 0;
  return new Intl.NumberFormat(lang, {
    style: "currency",
    currency,
    maximumFractionDigits: whole ? 0 : undefined,
  }).format(whole ? Math.round(major) : major);
}
