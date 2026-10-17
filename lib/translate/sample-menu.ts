/**
 * Demo menu used by the seed AND the quality script. Deliberately includes the cases
 * where machine translation hurts: pork (guanciale), veal, bone marrow, alcohol, clams,
 * truffle, chilli heat, plus glossary terms that must never be translated.
 */
import type { GlossaryTerm } from "@/lib/db/types";
import type { Unit, UnitKind } from "./units";

export const SAMPLE_LANG = "en";

export const SAMPLE_GLOSSARY: GlossaryTerm[] = [
  { term: "tagliolini", kind: "keep" },
  { term: "guanciale", kind: "keep" },
  { term: "gremolata", kind: "keep" },
  { term: "Casentino", kind: "keep" },
  { term: "Chianina", kind: "keep" },
  { term: "Datterini", kind: "keep" },
  { term: "Carnaroli", kind: "keep" },
  { term: "Savoiardi", kind: "keep" },
  { term: "Marsala", kind: "keep" },
  { term: "Parmigiano", kind: "keep" },
];

export const SAMPLE_CATEGORIES = ["Antipasti", "Primi", "Secondi", "Dolci"] as const;

export type SampleDish = {
  category: (typeof SAMPLE_CATEGORIES)[number];
  name: string;
  description: string;
  context: string;
  price: number; // minor units
  allergens: string[];
  dietary: string[];
  spice_level: number;
  image: string | null; // demo/ public id
  story?: "truffle" | "saffron";
};

export const SAMPLE_DISHES: SampleDish[] = [
  { category: "Antipasti", name: "Burrata di Andria", description: "Datterini tomatoes, basil oil, Maldon salt, grilled sourdough.", context: "Fresh cow's-milk cheese with a soft, creamy centre.", price: 1800, allergens: ["milk", "gluten"], dietary: ["vegetarian"], spice_level: 0, image: "samples/food/spices" },
  { category: "Antipasti", name: "Carpaccio di Manzo", description: "Chianina beef, aged Parmigiano, rocket, lemon, black pepper.", context: "Raw beef sliced paper-thin and dressed at the table.", price: 2200, allergens: ["milk"], dietary: ["contains_beef"], spice_level: 0, image: "samples/food/fish-vegetables" },
  { category: "Antipasti", name: "Crostini al Guanciale", description: "Toasted bread, cured pork cheek, pecorino, black pepper.", context: "Guanciale is cured pork cheek, similar to bacon but silkier.", price: 1600, allergens: ["gluten", "milk"], dietary: ["contains_pork"], spice_level: 1, image: null },
  { category: "Primi", name: "Tagliolini al Tartufo Bianco", description: "Hand-cut egg tagliolini, Casentino butter, shaved white truffle.", context: "Thin ribbon pasta served with seasonal white truffle.", price: 3400, allergens: ["gluten", "eggs", "milk"], dietary: ["vegetarian"], spice_level: 0, image: "samples/food/pot-mussels", story: "truffle" },
  { category: "Primi", name: "Spaghetti alle Vongole", description: "Spaghetti with fresh clams, white wine, garlic, parsley and chilli.", context: "Pasta with clams in a light wine sauce.", price: 2600, allergens: ["gluten", "molluscs", "sulphites"], dietary: ["contains_alcohol"], spice_level: 1, image: null },
  { category: "Primi", name: "Risotto allo Zafferano e Midollo", description: "Carnaroli rice, saffron, roasted bone marrow, gremolata.", context: "Creamy rice cooked slowly with saffron.", price: 2800, allergens: ["milk", "celery"], dietary: ["contains_beef"], spice_level: 0, image: "samples/breakfast", story: "saffron" },
  { category: "Secondi", name: "Ossobuco alla Milanese", description: "Slow-braised veal shank, saffron risotto, gremolata. Rich and mild, not spicy.", context: "Veal shank cooked until tender enough to cut with a spoon.", price: 3800, allergens: ["celery", "milk", "gluten"], dietary: ["contains_beef"], spice_level: 0, image: null, story: "saffron" },
  { category: "Secondi", name: "Pollo alla Diavola", description: "Spatchcocked chicken, hot chilli, rosemary and lemon.", context: "Grilled chicken with a fiery chilli marinade.", price: 2900, allergens: [], dietary: [], spice_level: 3, image: null },
  { category: "Secondi", name: "Parmigiana di Melanzane", description: "Layers of aubergine, tomato, basil and mozzarella, baked until golden.", context: "A baked vegetable dish with melted cheese.", price: 2200, allergens: ["milk"], dietary: ["vegetarian"], spice_level: 0, image: null },
  { category: "Dolci", name: "Tiramisù della Casa", description: "Savoiardi, mascarpone, espresso, Marsala, cocoa.", context: "Coffee-soaked sponge fingers layered with mascarpone cream.", price: 1400, allergens: ["gluten", "eggs", "milk", "sulphites"], dietary: ["vegetarian", "contains_alcohol"], spice_level: 0, image: "samples/food/dessert" },
];

export const SAMPLE_STORIES = {
  truffle: {
    title: "The White Truffle of San Miniato",
    body: "Each November, at first light, Marco and his dog Bianca walk the oak woods above San Miniato. The white truffle is found by scent alone, lifted by hand, and brought to our kitchen within the day. We shave it, paper-thin, over fresh egg tagliolini finished with butter from the Casentino.",
    video: { public_id: "demo/dog", duration: 15 },
    poster: "samples/food/spices",
  },
  saffron: {
    title: "Saffron, Gathered by Hand",
    body: "The crocus blooms for a single fortnight. Each flower is picked at dawn and its three crimson threads separated by hand, one by one. Eighty thousand blossoms yield a kilo. We stir them into Carnaroli rice with bone marrow, and nothing else.",
    video: { public_id: "demo/elephants", duration: 20 },
    poster: null as string | null,
  },
} as const;

/** The sample menu as translation units (no database), for the quality script and tests. */
export function sampleUnits(opts: { includeStories?: boolean } = {}): Unit[] {
  const units: Unit[] = [];
  const push = (id: string, field: string, kind: UnitKind, source: string, context?: string) =>
    units.push({ id, entity: "dish", entityId: id.split(":")[1], field, kind, source, context, map: { [SAMPLE_LANG]: source }, tx: undefined });
  SAMPLE_DISHES.forEach((d, i) => {
    const base = `dish:s${i}`;
    push(`${base}:name`, "name", "dish_name", d.name);
    push(`${base}:description`, "description", "dish_description", d.description, d.name);
    push(`${base}:context`, "context", "dish_context", d.context, d.name);
  });
  if (opts.includeStories) {
    for (const [k, s] of Object.entries(SAMPLE_STORIES)) {
      push(`story:${k}:title`, "title", "story_title", s.title);
      push(`story:${k}:text_fallback`, "text_fallback", "story_body", s.body, s.title);
    }
  }
  return units;
}
