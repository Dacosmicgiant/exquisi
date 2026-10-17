/** The 14 EU major allergens. Keys are stored on dishes; labels are display-only. */
export const ALLERGENS = [
  { key: "gluten", en: "Gluten", it: "Glutine" },
  { key: "crustaceans", en: "Crustaceans", it: "Crostacei" },
  { key: "eggs", en: "Eggs", it: "Uova" },
  { key: "fish", en: "Fish", it: "Pesce" },
  { key: "peanuts", en: "Peanuts", it: "Arachidi" },
  { key: "soy", en: "Soy", it: "Soia" },
  { key: "milk", en: "Milk", it: "Latte" },
  { key: "nuts", en: "Tree nuts", it: "Frutta a guscio" },
  { key: "celery", en: "Celery", it: "Sedano" },
  { key: "mustard", en: "Mustard", it: "Senape" },
  { key: "sesame", en: "Sesame", it: "Sesamo" },
  { key: "sulphites", en: "Sulphites", it: "Solfiti" },
  { key: "lupin", en: "Lupin", it: "Lupini" },
  { key: "molluscs", en: "Molluscs", it: "Molluschi" },
] as const;

export type AllergenKey = (typeof ALLERGENS)[number]["key"];
export const ALLERGEN_KEYS = ALLERGENS.map((a) => a.key) as [AllergenKey, ...AllergenKey[]];

export function allergenLabel(key: string, lang: string): string {
  const a = ALLERGENS.find((x) => x.key === key);
  if (!a) return key;
  return (lang === "it" ? a.it : a.en) ?? a.en;
}
