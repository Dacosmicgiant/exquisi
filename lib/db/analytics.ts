import type { Types } from "mongoose";
import { EventModel } from "./models";
import type { AnalyticsSummary, DailyPoint, DishAnalytics, DishInterest, LanguageStat } from "./types";

export type Range = { from: Date; to: Date };

/** Tenant-bound aggregations. Only reachable through forTenant(id).analytics. */
export function analyticsRepo(rid: Types.ObjectId) {
  const match = (r: Range, extra: Record<string, unknown> = {}) => ({
    restaurant_id: rid,
    timestamp: { $gte: r.from, $lte: r.to },
    ...extra,
  });

  return {
    async summary(r: Range): Promise<AnalyticsSummary> {
      const [byType, visitors] = await Promise.all([
        EventModel.aggregate<{ _id: string; n: number }>([
          { $match: match(r) },
          { $group: { _id: "$type", n: { $sum: 1 } } },
        ]),
        EventModel.aggregate<{ n: number }>([
          { $match: match(r, { type: "menu_view" }) },
          { $group: { _id: "$session_id" } },
          { $count: "n" },
        ]),
      ]);
      const count = (t: string) => byType.find((x) => x._id === t)?.n ?? 0;
      const plays = count("story_play");
      const completes = count("story_complete");
      return {
        menuViews: count("menu_view"),
        uniqueVisitors: visitors[0]?.n ?? 0,
        languageSelects: count("language_select"),
        storyOpens: count("story_open"),
        storyPlays: plays,
        storyCompletes: completes,
        completionRate: plays ? Math.min(1, completes / plays) : 0,
      };
    },

    /** Which languages diners read the menu in (menu views) and pick (language screen taps). */
    async languages(r: Range): Promise<LanguageStat[]> {
      const rows = await EventModel.aggregate<{ _id: { l: string; t: string }; n: number }>([
        { $match: match(r, { type: { $in: ["menu_view", "language_select"] } }) },
        { $group: { _id: { l: "$language", t: "$type" }, n: { $sum: 1 } } },
      ]);
      const map = new Map<string, LanguageStat>();
      for (const row of rows) {
        const cur = map.get(row._id.l) ?? { language: row._id.l, views: 0, selects: 0 };
        if (row._id.t === "menu_view") cur.views = row.n;
        else cur.selects = row.n;
        map.set(row._id.l, cur);
      }
      return [...map.values()].sort((a, b) => b.views + b.selects - (a.views + a.selects));
    },

    /** Dishes whose written story diners opened most. */
    async dishInterest(r: Range): Promise<DishInterest[]> {
      const rows = await EventModel.aggregate<{ _id: Types.ObjectId; n: number }>([
        { $match: match(r, { type: "story_open", dish_id: { $ne: null } }) },
        { $group: { _id: "$dish_id", n: { $sum: 1 } } },
        { $sort: { n: -1 } },
        { $limit: 20 },
      ]);
      return rows.map((x) => ({ dish_id: String(x._id), opens: x.n }));
    },

    async byDish(r: Range): Promise<DishAnalytics[]> {
      const rows = await EventModel.aggregate<{
        _id: { dish: Types.ObjectId; type: string };
        n: number;
      }>([
        {
          $match: match(r, {
            dish_id: { $ne: null },
            type: { $in: ["story_play", "story_complete"] },
          }),
        },
        { $group: { _id: { dish: "$dish_id", type: "$type" }, n: { $sum: 1 } } },
      ]);
      const map = new Map<string, DishAnalytics>();
      for (const row of rows) {
        const id = String(row._id.dish);
        const cur = map.get(id) ?? { dish_id: id, plays: 0, completes: 0, completionRate: 0 };
        if (row._id.type === "story_play") cur.plays = row.n;
        else cur.completes = row.n;
        map.set(id, cur);
      }
      return [...map.values()]
        .map((d) => ({ ...d, completionRate: d.plays ? Math.min(1, d.completes / d.plays) : 0 }))
        .sort((a, b) => b.plays - a.plays);
    },

    async daily(r: Range): Promise<DailyPoint[]> {
      const rows = await EventModel.aggregate<{
        _id: { d: string; type: string };
        n: number;
      }>([
        { $match: match(r, { type: { $in: ["menu_view", "story_open", "story_play"] } }) },
        {
          $group: {
            _id: { d: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }, type: "$type" },
            n: { $sum: 1 },
          },
        },
      ]);
      const days = new Map<string, DailyPoint>();
      const cursor = new Date(r.from);
      cursor.setUTCHours(0, 0, 0, 0);
      while (cursor <= r.to) {
        const key = cursor.toISOString().slice(0, 10);
        days.set(key, { date: key, views: 0, plays: 0 });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      for (const row of rows) {
        const p = days.get(row._id.d);
        if (!p) continue;
        if (row._id.type === "menu_view") p.views = row.n;
        else p.plays += row.n; // story opens (+ film plays when that add-on is on)
      }
      return [...days.values()];
    },
  };
}
