/**
 * THE tenant-scoped data-access helper.
 *
 * Every read and write of tenant data (dishes, stories, QR codes, events,
 * categories) goes through forTenant(restaurantId). The id is required, is
 * validated, and is injected into every filter and every write; callers can
 * never pass a different restaurant_id through input. Route handlers and
 * server actions must not touch Mongoose models directly.
 */
import { Types } from "mongoose";
import { randomInt } from "node:crypto";
import { analyticsRepo } from "./analytics";
import { connectDb } from "./connect";
import {
  DishModel,
  EventModel,
  JobModel,
  QrCodeModel,
  RestaurantModel,
  StoryModel,
} from "./models";
import { plain, plainList } from "./serialize";
import {
  ConflictError,
  NotFoundError,
  TenantError,
  type Category,
  type Dish,
  type DishInput,
  type EventType,
  type GlossaryTerm,
  type QrCode,
  type Restaurant,
  type Story,
  type StoryInput,
  type TranslationJob,
  type TxEntity,
} from "./types";
import { TX_FIELDS } from "@/lib/translate/units";
import type { LangMap } from "@/lib/i18n";

const oid = (id: string, what = "id"): Types.ObjectId => {
  if (!id || !Types.ObjectId.isValid(id)) throw new TenantError(`Invalid ${what}`);
  return new Types.ObjectId(id);
};

/** Drop fields callers must never control. */
const strip = <T extends object>(input: T) => {
  const { restaurant_id: _r, _id: _i, id: _d, ...rest } = input as Record<string, unknown>;
  void _r; void _i; void _d;
  return rest as Partial<T>;
};

/**
 * Language maps are merged per language, never replaced wholesale: a form that only knows
 * about some languages, or a machine translation written a moment ago, can't be clobbered.
 * An empty string clears that language.
 */
const MAP_LANG_RE = /^[A-Za-z0-9-]{2,12}$/;
function applyMapPatch(
  set: Record<string, unknown>,
  unset: Record<string, "">,
  field: string,
  map: Record<string, string> | undefined,
) {
  if (!map) return;
  for (const [lang, text] of Object.entries(map)) {
    if (!MAP_LANG_RE.test(lang)) continue;
    if (typeof text === "string" && text.trim()) set[`${field}.${lang}`] = text.trim();
    else unset[`${field}.${lang}`] = "";
  }
}
const mergeOps = (set: Record<string, unknown>, unset: Record<string, "">) => ({
  ...(Object.keys(set).length ? { $set: set } : {}),
  ...(Object.keys(unset).length ? { $unset: unset } : {}),
});

const QR_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const newQrCode = (len = 6) =>
  Array.from({ length: len }, () => QR_ALPHABET[randomInt(QR_ALPHABET.length)]).join("");

const slugKey = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "category";

export function forTenant(restaurantId: string) {
  if (!restaurantId) throw new TenantError("restaurantId is required");
  const rid = oid(restaurantId, "restaurantId");
  const scope = { restaurant_id: rid };

  /** Story ids on a dish must belong to this tenant (films are reusable *within* a restaurant). */
  async function assertStoriesOwned(ids: string[] | undefined) {
    if (!ids?.length) return;
    const oids = ids.map((i) => oid(i, "story id"));
    const n = await StoryModel.countDocuments({ ...scope, _id: { $in: oids } });
    if (n !== new Set(ids).size) throw new TenantError("Story does not belong to this restaurant");
  }

  const dishes = {
    async list(opts: { onlyAvailable?: boolean } = {}): Promise<Dish[]> {
      await connectDb();
      const docs = await DishModel.find({ ...scope, ...(opts.onlyAvailable ? { available: true } : {}) })
        .sort({ order: 1, _id: 1 })
        .lean();
      return plainList<Dish>(docs);
    },
    async get(id: string): Promise<Dish | null> {
      await connectDb();
      const doc = await DishModel.findOne({ ...scope, _id: oid(id) }).lean();
      return doc ? plain<Dish>(doc) : null;
    },
    async create(input: Omit<DishInput, "order"> & { order?: number }): Promise<Dish> {
      await connectDb();
      await assertStoriesOwned(input.story_ids);
      const last = await DishModel.findOne({ ...scope, category: input.category })
        .sort({ order: -1 })
        .select("order")
        .lean<{ order: number }>();
      const doc = await DishModel.create({
        ...strip(input),
        ...scope,
        order: input.order ?? (last ? last.order + 1 : 0),
      });
      return plain<Dish>(doc.toObject());
    },
    async update(id: string, patch: Partial<DishInput>): Promise<Dish> {
      await connectDb();
      await assertStoriesOwned(patch.story_ids);
      const { name, description, context, ...rest } = strip(patch) as Partial<DishInput>;
      const set: Record<string, unknown> = { ...rest };
      const unset: Record<string, ""> = {};
      applyMapPatch(set, unset, "name", name);
      applyMapPatch(set, unset, "description", description);
      applyMapPatch(set, unset, "context", context);
      const doc = await DishModel.findOneAndUpdate({ ...scope, _id: oid(id) }, mergeOps(set, unset), {
        returnDocument: "after",
        runValidators: true,
      }).lean();
      if (!doc) throw new NotFoundError("Dish not found");
      return plain<Dish>(doc);
    },
    async remove(id: string): Promise<void> {
      await connectDb();
      await DishModel.deleteOne({ ...scope, _id: oid(id) });
    },
    /** Persist a new ordering for the given dish ids (index = order). */
    async reorder(ids: string[]): Promise<void> {
      await connectDb();
      if (!ids.length) return;
      await DishModel.bulkWrite(
        ids.map((id, order) => ({
          updateOne: { filter: { ...scope, _id: oid(id) }, update: { $set: { order } } },
        })),
      );
    },
    async setAvailability(id: string, available: boolean): Promise<void> {
      await connectDb();
      await DishModel.updateOne({ ...scope, _id: oid(id) }, { $set: { available } });
    },
    async moveToCategory(fromKey: string, toKey: string): Promise<void> {
      await connectDb();
      await DishModel.updateMany({ ...scope, category: fromKey }, { $set: { category: toKey } });
    },
    async countInCategory(key: string): Promise<number> {
      await connectDb();
      return DishModel.countDocuments({ ...scope, category: key });
    },
  };

  const stories = {
    async list(opts: { onlyLive?: boolean } = {}): Promise<Story[]> {
      await connectDb();
      const docs = await StoryModel.find({ ...scope, ...(opts.onlyLive ? { status: "live" } : {}) })
        .sort({ created_at: -1 })
        .lean();
      return plainList<Story>(docs);
    },
    async byIds(ids: string[], opts: { onlyLive?: boolean } = {}): Promise<Story[]> {
      await connectDb();
      if (!ids.length) return [];
      const docs = await StoryModel.find({
        ...scope,
        _id: { $in: ids.map((i) => oid(i, "story id")) },
        ...(opts.onlyLive ? { status: "live" } : {}),
      }).lean();
      return plainList<Story>(docs);
    },
    async get(id: string): Promise<Story | null> {
      await connectDb();
      const doc = await StoryModel.findOne({ ...scope, _id: oid(id) }).lean();
      return doc ? plain<Story>(doc) : null;
    },
    async create(input: StoryInput): Promise<Story> {
      await connectDb();
      const doc = await StoryModel.create({ ...strip(input), ...scope, source: "produced_by_us" });
      return plain<Story>(doc.toObject());
    },
    async update(id: string, patch: Partial<StoryInput>): Promise<Story> {
      await connectDb();
      const { title, text_fallback, ...rest } = strip(patch) as Partial<StoryInput>;
      const set: Record<string, unknown> = { ...rest };
      const unset: Record<string, ""> = {};
      applyMapPatch(set, unset, "title", title);
      applyMapPatch(set, unset, "text_fallback", text_fallback);
      const doc = await StoryModel.findOneAndUpdate({ ...scope, _id: oid(id) }, mergeOps(set, unset), {
        returnDocument: "after",
        runValidators: true,
      }).lean();
      if (!doc) throw new NotFoundError("Story not found");
      return plain<Story>(doc);
    },
    async remove(id: string): Promise<void> {
      await connectDb();
      const sid = oid(id);
      await StoryModel.deleteOne({ ...scope, _id: sid });
      await DishModel.updateMany({ ...scope, story_ids: sid }, { $pull: { story_ids: sid } });
    },
  };

  const qrCodes = {
    async list(): Promise<QrCode[]> {
      await connectDb();
      return plainList<QrCode>(await QrCodeModel.find(scope).sort({ created_at: 1 }).lean());
    },
    async get(id: string): Promise<QrCode | null> {
      await connectDb();
      const doc = await QrCodeModel.findOne({ ...scope, _id: oid(id) }).lean();
      return doc ? plain<QrCode>(doc) : null;
    },
    /** Codes are permanent identifiers: only created, never edited, so printed QRs can't break. */
    async create(label: string): Promise<QrCode> {
      await connectDb();
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          const doc = await QrCodeModel.create({ ...scope, code: newQrCode(), label });
          return plain<QrCode>(doc.toObject());
        } catch (e) {
          if ((e as { code?: number }).code !== 11000) throw e;
        }
      }
      throw new ConflictError("Could not allocate a unique QR code");
    },
    async rename(id: string, label: string): Promise<void> {
      await connectDb();
      await QrCodeModel.updateOne({ ...scope, _id: oid(id) }, { $set: { label } });
    },
    async remove(id: string): Promise<void> {
      await connectDb();
      await QrCodeModel.deleteOne({ ...scope, _id: oid(id) });
    },
  };

  const events = {
    /** Fire-and-forget analytics write. Validates dish/story belong to this tenant. */
    async record(e: {
      type: EventType;
      session_id: string;
      language: string;
      dish_id?: string | null;
      story_id?: string | null;
    }): Promise<boolean> {
      await connectDb();
      const dish = e.dish_id ? oid(e.dish_id, "dish id") : null;
      const story = e.story_id ? oid(e.story_id, "story id") : null;
      if (dish && !(await DishModel.exists({ ...scope, _id: dish }))) return false;
      if (story && !(await StoryModel.exists({ ...scope, _id: story }))) return false;
      await EventModel.create({
        ...scope,
        type: e.type,
        session_id: e.session_id,
        language: e.language,
        dish_id: dish,
        story_id: story,
      });
      return true;
    },
  };

  /** Categories live on the restaurant document (_id === restaurantId). */
  const categories = {
    async list(): Promise<Category[]> {
      await connectDb();
      const doc = await RestaurantModel.findById(rid).select("categories").lean<{ categories?: Category[] }>();
      return [...(doc?.categories ?? [])].sort((a, b) => a.order - b.order);
    },
    async add(name: LangMap): Promise<Category> {
      await connectDb();
      const existing = await categories.list();
      const base = slugKey(Object.values(name)[0] ?? "category");
      let key = base;
      for (let i = 2; existing.some((c) => c.key === key); i++) key = `${base}-${i}`;
      const cat: Category = { key, name, order: existing.length };
      await RestaurantModel.updateOne({ _id: rid }, { $push: { categories: cat } });
      return cat;
    },
    async rename(key: string, name: LangMap): Promise<void> {
      await connectDb();
      const set: Record<string, unknown> = {};
      const unset: Record<string, ""> = {};
      applyMapPatch(set, unset, "categories.$.name", name);
      await RestaurantModel.updateOne({ _id: rid, "categories.key": key }, mergeOps(set, unset));
    },
    async reorder(keys: string[]): Promise<void> {
      await connectDb();
      const existing = await categories.list();
      const byKey = new Map(existing.map((c) => [c.key, c]));
      const next = keys.filter((k) => byKey.has(k)).map((k, order) => ({ ...byKey.get(k)!, order }));
      await RestaurantModel.updateOne({ _id: rid }, { $set: { categories: next } });
    },
    /** Refuses while dishes remain, so nothing is silently orphaned. */
    async remove(key: string): Promise<void> {
      await connectDb();
      if (await dishes.countInCategory(key)) {
        throw new ConflictError("Move or delete this category's dishes first");
      }
      await RestaurantModel.updateOne({ _id: rid }, { $pull: { categories: { key } } });
    },
  };

  /**
   * Translation storage. Language maps stay the render source; `tx` records provenance.
   * Machine writes can never overwrite staff-edited text (enforced in the update filters).
   */
  const LANG_RE = /^[A-Za-z0-9-]{2,12}$/;
  const checkField = (entity: TxEntity, field: string, lang: string) => {
    if (!TX_FIELDS[entity].includes(field) || !LANG_RE.test(lang)) throw new TenantError("Invalid translation target");
  };
  type MachineWrite = { entity: TxEntity; entityId: string; field: string; text: string; h: string; model: string };

  const i18n = {
    async snapshot(): Promise<{ restaurant: Restaurant; dishes: Dish[]; stories: Story[] }> {
      await connectDb();
      const [r, d, s] = await Promise.all([
        RestaurantModel.findById(rid).lean(),
        DishModel.find(scope).sort({ order: 1, _id: 1 }).lean(),
        StoryModel.find(scope).lean(),
      ]);
      if (!r) throw new NotFoundError("Restaurant not found");
      return { restaurant: plain<Restaurant>(r), dishes: plainList<Dish>(d), stories: plainList<Story>(s) };
    },

    /** Persist validated machine translations. Skips anything a person has edited. Returns units written. */
    async applyMachine(lang: string, writes: MachineWrite[]): Promise<number> {
      await connectDb();
      let written = 0;
      const at = new Date().toISOString();
      for (const w of writes) {
        checkField(w.entity, w.field, lang);
        const key = `${w.field}:${lang}`;
        const entry = { by: "machine", h: w.h, m: w.model, at };
        const text = w.text.trim();
        if (!text) continue;
        let res;
        if (w.entity === "dish" || w.entity === "story") {
          const Model = w.entity === "dish" ? DishModel : StoryModel;
          res = await Model.updateOne(
            {
              ...scope,
              _id: oid(w.entityId),
              $or: [{ [`tx.${key}.by`]: "machine" }, { [`${w.field}.${lang}`]: { $in: [null, ""] } }],
            },
            { $set: { [`${w.field}.${lang}`]: text, [`tx.${key}`]: entry } },
          );
        } else if (w.entity === "restaurant") {
          res = await RestaurantModel.updateOne(
            { _id: rid, $or: [{ [`tx.${key}.by`]: "machine" }, { [`${w.field}.${lang}`]: { $in: [null, ""] } }] },
            { $set: { [`${w.field}.${lang}`]: text, [`tx.${key}`]: entry } },
          );
        } else {
          res = await RestaurantModel.updateOne(
            { _id: rid },
            { $set: { [`categories.$[c].${w.field}.${lang}`]: text, [`categories.$[c].tx.${key}`]: entry } },
            {
              arrayFilters: [
                {
                  "c.key": w.entityId,
                  $or: [{ [`c.tx.${key}.by`]: "machine" }, { [`c.${w.field}.${lang}`]: { $in: [null, ""] } }],
                },
              ],
            },
          );
        }
        if (res.modifiedCount) written++;
      }
      return written;
    },

    /** A person set (or cleared) a translation. Staff text is never overwritten by machine runs. */
    async setStaff(entity: TxEntity, entityId: string, field: string, lang: string, text: string, h: string) {
      await connectDb();
      checkField(entity, field, lang);
      const key = `${field}:${lang}`;
      const clean = text.trim();
      const set = clean
        ? { $set: { [`${field}.${lang}`]: clean, [`tx.${key}`]: { by: "staff", h, at: new Date().toISOString() } } }
        : { $unset: { [`${field}.${lang}`]: "", [`tx.${key}`]: "" } };
      if (entity === "dish") await DishModel.updateOne({ ...scope, _id: oid(entityId) }, set);
      else if (entity === "story") await StoryModel.updateOne({ ...scope, _id: oid(entityId) }, set);
      else if (entity === "restaurant") await RestaurantModel.updateOne({ _id: rid }, set);
      else {
        const prefixed = Object.fromEntries(
          Object.entries(set).map(([op, v]) => [op, Object.fromEntries(Object.entries(v).map(([k, x]) => [`categories.$[c].${k}`, x]))]),
        );
        await RestaurantModel.updateOne({ _id: rid }, prefixed, { arrayFilters: [{ "c.key": entityId }] });
      }
    },

    glossary: {
      async get(): Promise<GlossaryTerm[]> {
        await connectDb();
        const r = await RestaurantModel.findById(rid).select("glossary").lean<{ glossary?: GlossaryTerm[] }>();
        return r?.glossary ?? [];
      },
      async set(terms: GlossaryTerm[]): Promise<void> {
        await connectDb();
        const clean = terms
          .map((t) => ({ ...t, term: t.term.trim() }))
          .filter((t) => t.term)
          .slice(0, 200);
        await RestaurantModel.updateOne({ _id: rid }, { $set: { glossary: clean } });
      },
    },

    jobs: {
      /** Take the per-language lock. Returns null if a fresh job is already running. */
      async acquire(lang: string, total: number): Promise<TranslationJob | null> {
        await connectDb();
        if (!LANG_RE.test(lang)) throw new TenantError("Invalid language");
        const cutoff = new Date(Date.now() - 3 * 60_000);
        await JobModel.updateMany(
          { ...scope, lang, status: "running", updated_at: { $lt: cutoff } },
          { $set: { status: "failed", error: "Timed out (no progress for 3 minutes)" } },
        );
        const res = await JobModel.findOneAndUpdate(
          { ...scope, lang, status: "running" },
          { $setOnInsert: { total, done: 0, failed_units: 0, tokens: 0, chars: 0, started_at: new Date(), updated_at: new Date() } },
          { upsert: true, returnDocument: "after", includeResultMetadata: true },
        );
        if (res.lastErrorObject?.updatedExisting) return null;
        return plain<TranslationJob>(res.value);
      },
      async update(id: string, inc: { done?: number; failed_units?: number; tokens?: number; chars?: number }) {
        await connectDb();
        await JobModel.updateOne(
          { ...scope, _id: oid(id) },
          { $inc: { done: inc.done ?? 0, failed_units: inc.failed_units ?? 0, tokens: inc.tokens ?? 0, chars: inc.chars ?? 0 }, $set: { updated_at: new Date() } },
        );
      },
      async finish(id: string, status: "done" | "failed", extra: { error?: string; model?: string } = {}) {
        await connectDb();
        await JobModel.updateOne({ ...scope, _id: oid(id) }, { $set: { status, updated_at: new Date(), ...extra } });
      },
      /** Is a fresh job running for this language? */
      async isRunning(lang: string): Promise<boolean> {
        await connectDb();
        return !!(await JobModel.exists({ ...scope, lang, status: "running", updated_at: { $gt: new Date(Date.now() - 3 * 60_000) } }));
      },
      /** Most recent job per language. */
      async latest(): Promise<TranslationJob[]> {
        await connectDb();
        const docs = await JobModel.find(scope).sort({ updated_at: -1 }).limit(200).lean();
        const seen = new Set<string>();
        return plainList<TranslationJob>(docs).filter((j) => (seen.has(j.lang) ? false : (seen.add(j.lang), true)));
      },
    },
  };

  return {
    restaurantId,
    dishes,
    stories,
    qrCodes,
    events,
    categories,
    i18n,
    analytics: analyticsRepo(rid),
  };
}

export type Tenant = ReturnType<typeof forTenant>;
