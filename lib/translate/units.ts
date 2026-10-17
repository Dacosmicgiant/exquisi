/**
 * "Units" are the individual translatable strings of a restaurant:
 * restaurant name, category names, dish name/description/context, story title/body.
 * Pure functions over a snapshot, so the pipeline, the quality script and the tests share them.
 */
import type { Dish, GlossaryTerm, Restaurant, Story, TxEntity, TxMap } from "@/lib/db/types";
import type { LangMap } from "@/lib/i18n";
import { unitState, type UnitState } from "./provenance";

export type UnitKind =
  | "restaurant_name"
  | "category"
  | "dish_name"
  | "dish_description"
  | "dish_context"
  | "story_title"
  | "story_body";

export type Unit = {
  /** `${entity}:${entityId}:${field}` */
  id: string;
  entity: TxEntity;
  entityId: string;
  field: string;
  kind: UnitKind;
  /** Source-language text. */
  source: string;
  /** Extra hint for the model (e.g. the dish a description belongs to). */
  context?: string;
  /** Current language map and provenance of the entity, for state checks. */
  map: LangMap;
  tx: TxMap | undefined;
};

export type Snapshot = { restaurant: Restaurant; dishes: Dish[]; stories: Story[] };

/** Which fields of each entity are translatable (also the write whitelist in the tenant repo). */
export const TX_FIELDS: Record<TxEntity, readonly string[]> = {
  restaurant: ["name"],
  category: ["name"],
  dish: ["name", "description", "context"],
  story: ["title", "text_fallback"],
};

export const unitId = (entity: TxEntity, entityId: string, field: string) => `${entity}:${entityId}:${field}`;

export function collectUnits(s: Snapshot): Unit[] {
  const from = s.restaurant.default_language;
  const units: Unit[] = [];
  const add = (
    entity: TxEntity,
    entityId: string,
    field: string,
    kind: UnitKind,
    map: LangMap | undefined,
    tx: TxMap | undefined,
    context?: string,
  ) => {
    const source = map?.[from]?.trim();
    if (!source) return;
    units.push({ id: unitId(entity, entityId, field), entity, entityId, field, kind, source, context, map: map ?? {}, tx });
  };

  add("restaurant", s.restaurant.id, "name", "restaurant_name", s.restaurant.name, s.restaurant.tx);
  for (const c of s.restaurant.categories) add("category", c.key, "name", "category", c.name, c.tx);

  for (const d of s.dishes) {
    const dishName = d.name?.[from];
    add("dish", d.id, "name", "dish_name", d.name, d.tx);
    add("dish", d.id, "description", "dish_description", d.description, d.tx, dishName);
    add("dish", d.id, "context", "dish_context", d.context, d.tx, dishName);
  }
  for (const st of s.stories) {
    add("story", st.id, "title", "story_title", st.title, st.tx);
    add("story", st.id, "text_fallback", "story_body", st.text_fallback, st.tx, st.title?.[from]);
  }
  return units;
}

export function stateOf(unit: Unit, lang: string, glossary: GlossaryTerm[]): UnitState {
  return unitState({
    sourceText: unit.source,
    targetText: unit.map[lang],
    tx: unit.tx,
    field: unit.field,
    lang,
    glossary,
  });
}

/** Units that need (re)translation into `lang`. Staff-owned units are never included. */
export function unitsToTranslate(
  units: Unit[],
  lang: string,
  glossary: GlossaryTerm[],
  opts: { force?: boolean } = {},
): Unit[] {
  return units.filter((u) => {
    const st = stateOf(u, lang, glossary);
    return st === "missing" || st === "stale" || (opts.force && st === "fresh");
  });
}

export function coverage(units: Unit[], lang: string, glossary: GlossaryTerm[]) {
  const counts: Record<UnitState, number> = { missing: 0, fresh: 0, stale: 0, staff: 0, staff_stale: 0 };
  for (const u of units) counts[stateOf(u, lang, glossary)]++;
  const total = units.length;
  const covered = counts.fresh + counts.staff + counts.staff_stale + counts.stale;
  return { total, counts, percent: total ? Math.round((covered / total) * 100) : 100 };
}
