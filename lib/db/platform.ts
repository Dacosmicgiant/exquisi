/**
 * Platform-level (non-tenant) data access: the tenant roots themselves
 * (restaurants), staff users, platform settings, and the one deliberate
 * cross-tenant lookup (QR code → restaurant). Everything else is tenant data
 * and lives in tenant.ts.
 */
import { Types } from "mongoose";
import { connectDb } from "./connect";
import { CustomThemeModel, QrCodeModel, RestaurantModel, SettingModel, UserModel } from "./models";
import { plain, plainList } from "./serialize";
import {
  ConflictError,
  NotFoundError,
  TenantError,
  type CustomTheme,
  type Restaurant,
  type RestaurantInput,
  type RestaurantStatus,
  type StaffUser,
} from "./types";

const isDup = (e: unknown) => (e as { code?: number }).code === 11000;

export const restaurants = {
  async list(opts: { includeArchived?: boolean } = {}): Promise<Restaurant[]> {
    await connectDb();
    const q = opts.includeArchived ? {} : { status: { $ne: "archived" } };
    return plainList<Restaurant>(await RestaurantModel.find(q).sort({ created_at: -1 }).lean());
  },
  async get(id: string): Promise<Restaurant | null> {
    await connectDb();
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await RestaurantModel.findById(id).lean();
    return doc ? plain<Restaurant>(doc) : null;
  },
  async bySlug(slug: string): Promise<Restaurant | null> {
    await connectDb();
    const doc = await RestaurantModel.findOne({ slug: slug.toLowerCase() }).lean();
    return doc ? plain<Restaurant>(doc) : null;
  },
  async create(input: RestaurantInput): Promise<Restaurant> {
    await connectDb();
    try {
      const doc = await RestaurantModel.create({ ...input, plan: "standard" });
      return plain<Restaurant>(doc.toObject());
    } catch (e) {
      if (isDup(e)) throw new ConflictError("That slug is already taken");
      throw e;
    }
  },
  async update(id: string, patch: Partial<RestaurantInput>): Promise<Restaurant> {
    await connectDb();
    if (!Types.ObjectId.isValid(id)) throw new TenantError("Invalid restaurant id");
    try {
      const doc = await RestaurantModel.findByIdAndUpdate(
        id,
        { $set: patch },
        { returnDocument: "after", runValidators: true },
      ).lean();
      if (!doc) throw new NotFoundError("Restaurant not found");
      return plain<Restaurant>(doc);
    } catch (e) {
      if (isDup(e)) throw new ConflictError("That slug is already taken");
      throw e;
    }
  },
  /** Restaurants whose brand starts from this theme ("preset:x" / "custom:x"). */
  async usingTheme(themeId: string): Promise<Restaurant[]> {
    await connectDb();
    return plainList<Restaurant>(await RestaurantModel.find({ "brand.theme_id": themeId }).lean());
  },
  async setStatus(id: string, status: RestaurantStatus): Promise<void> {
    await connectDb();
    await RestaurantModel.updateOne({ _id: id }, { $set: { status } });
  },
};

type UserRecord = StaffUser & { password_hash: string };

export const users = {
  async findByEmail(email: string): Promise<UserRecord | null> {
    await connectDb();
    const doc = await UserModel.findOne({ email: email.toLowerCase().trim() }).lean();
    return doc ? plain<UserRecord>(doc) : null;
  },
  async upsert(email: string, passwordHash: string, role = "staff"): Promise<StaffUser> {
    await connectDb();
    const doc = await UserModel.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { $set: { password_hash: passwordHash, role } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).lean();
    const { password_hash: _p, ...rest } = plain<UserRecord>(doc);
    void _p;
    return rest;
  },
};

export const settings = {
  /** Raw (unvalidated) platform theme overrides; resolveTheme() sanitises them. */
  async getThemeOverrides(): Promise<unknown> {
    await connectDb();
    const doc = await SettingModel.findOne({ key: "theme" }).lean<{ value?: unknown }>();
    return doc?.value ?? {};
  },
  async setThemeOverrides(value: unknown): Promise<void> {
    await connectDb();
    await SettingModel.updateOne({ key: "theme" }, { $set: { value } }, { upsert: true });
  },
};

export type CustomThemeInput = { name: string; category: string; theme: unknown };

/** Staff-made themes, shared by every restaurant (platform data, not tenant data). */
export const customThemes = {
  async list(): Promise<CustomTheme[]> {
    await connectDb();
    return plainList<CustomTheme>(await CustomThemeModel.find({}).sort({ created_at: -1 }).lean());
  },
  async get(id: string): Promise<CustomTheme | null> {
    await connectDb();
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await CustomThemeModel.findById(id).lean();
    return doc ? plain<CustomTheme>(doc) : null;
  },
  async create(input: CustomThemeInput): Promise<CustomTheme> {
    await connectDb();
    const doc = await CustomThemeModel.create(input);
    return plain<CustomTheme>(doc.toObject());
  },
  async update(id: string, patch: Partial<CustomThemeInput>): Promise<CustomTheme> {
    await connectDb();
    if (!Types.ObjectId.isValid(id)) throw new NotFoundError("Theme not found");
    const doc = await CustomThemeModel.findByIdAndUpdate(id, { $set: patch }, { returnDocument: "after", runValidators: true }).lean();
    if (!doc) throw new NotFoundError("Theme not found");
    return plain<CustomTheme>(doc);
  },
  async remove(id: string): Promise<void> {
    await connectDb();
    if (!Types.ObjectId.isValid(id)) return;
    await CustomThemeModel.deleteOne({ _id: id });
  },
};

export type ResolvedQr = {
  restaurant_id: string;
  slug: string;
  status: RestaurantStatus;
  label: string;
  default_language: string;
  enabled_languages: string[];
};

/** The one deliberate cross-tenant lookup: QR code → where to send the diner. */
export async function resolveQrCode(code: string): Promise<ResolvedQr | null> {
  await connectDb();
  const qr = await QrCodeModel.findOne({ code: code.toLowerCase() }).lean<{
    restaurant_id: Types.ObjectId;
    label: string;
  }>();
  if (!qr) return null;
  const r = await RestaurantModel.findById(qr.restaurant_id)
    .select("slug status default_language enabled_languages")
    .lean<{ slug: string; status: RestaurantStatus; default_language: string; enabled_languages: string[] }>();
  if (!r) return null;
  return {
    restaurant_id: String(qr.restaurant_id),
    slug: r.slug,
    status: r.status,
    label: qr.label,
    default_language: r.default_language,
    enabled_languages: r.enabled_languages ?? [],
  };
}
