/**
 * Ingredient-swap detector for the quality script.
 *
 * Small models translate "veal" as "cow's bone" and "pork cheek" as "pig's ear".
 * For diners with religious or dietary restrictions that is more than a typo. We
 * back-translate to English and compare a small lexicon of high-stakes ingredient
 * categories: a category present in the source but missing from the back-translation
 * (and/or a different protein appearing) is flagged for human review.
 */
const LEXICON: Record<string, string[]> = {
  pork: ["pork", "pig", "pigs", "bacon", "ham", "guanciale", "prosciutto", "pancetta", "sausage", "lard", "nduja", "'nduja"],
  beef: ["beef", "veal", "ox", "oxtail", "steer", "calf", "carpaccio"],
  lamb: ["lamb", "mutton"],
  poultry: ["chicken", "poultry", "duck", "turkey", "hen"],
  fish: ["fish", "tuna", "salmon", "cod", "anchovy", "anchovies", "sea bass", "swordfish", "sardine"],
  shellfish: ["shrimp", "prawn", "crab", "lobster", "clam", "clams", "mussel", "mussels", "oyster", "squid", "octopus", "shellfish", "scampi"],
  egg: ["egg", "eggs"],
  dairy: ["cheese", "butter", "cream", "milk", "mascarpone", "parmigiano", "parmesan", "mozzarella", "burrata", "ricotta"],
  alcohol: ["wine", "marsala", "beer", "vodka", "rum", "liqueur", "liquor", "brandy", "grappa", "prosecco", "amaretto"],
  nuts: ["nut", "nuts", "almond", "almonds", "hazelnut", "walnut", "pistachio", "pine nut", "pine nuts"],
  truffle: ["truffle", "truffles"],
  saffron: ["saffron"],
  chili: ["chili", "chilli", "chile", "pepperoncino", "spicy", "hot pepper"],
};

const PROTEINS = ["pork", "beef", "lamb", "poultry", "fish", "shellfish"];

const has = (text: string, words: string[]) =>
  words.some((w) => new RegExp(`(?<![a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`, "i").test(text));

export function categoriesIn(text: string): Set<string> {
  return new Set(Object.entries(LEXICON).filter(([, words]) => has(text, words)).map(([k]) => k));
}

export type SafetyFlag = { kind: "missing" | "swap"; category: string; detail: string };

export function ingredientFlags(sourceEn: string, backEn: string, opts: { isName?: boolean } = {}): SafetyFlag[] {
  const src = categoriesIn(sourceEn);
  const back = categoriesIn(backEn);
  const flags: SafetyFlag[] = [];
  for (const c of src) {
    if (!back.has(c)) {
      const intruders = PROTEINS.filter((p) => back.has(p) && !src.has(p));
      if (PROTEINS.includes(c) && intruders.length) {
        flags.push({ kind: "swap", category: c, detail: `${c} → ${intruders.join("/")}` });
      } else if (["pork", "beef", "alcohol", "shellfish", "fish", "nuts"].includes(c)) {
        // (egg/dairy are not flagged here: allergens are shown from the fixed vocabulary)
        flags.push({ kind: "missing", category: c, detail: `${c} not found in back-translation` });
      }
    }
  }
  // Dish names ("Spaghetti alle Vongole") legitimately gain English words on the way back
  // ("…with clams"), so only descriptions and stories are checked for appearing ingredients.
  for (const p of opts.isName ? [] : PROTEINS) {
    if (back.has(p) && !src.has(p) && !flags.some((f) => f.kind === "swap" && f.detail.includes(p))) {
      flags.push({ kind: "swap", category: p, detail: `${p} appeared but is not in the source` });
    }
  }
  return flags;
}
