/**
 * Mongoose models. Imported ONLY from files inside lib/db (enforced by ESLint
 * and tests/boundaries.test.ts). Everything else goes through forTenant() or
 * the platform helper.
 */
import { Schema, model, models, type Model } from "mongoose";

// Loosely typed on purpose: inferring Mongoose generics from these schema literals blows up tsc.
type AnyDoc = Record<string, unknown>;

const M = Schema.Types.Mixed;
const OID = Schema.Types.ObjectId;

const imageRef = { provider: { type: String, enum: ["cloudinary"], default: "cloudinary" }, public_id: { type: String, required: true } };

const restaurantSchema = new Schema<AnyDoc>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9]+(-[a-z0-9]+)*$/ },
    name: { type: M, default: {} },
    brand: { type: M, default: {} },
    default_language: { type: String, default: "en" },
    dish_name_language: { type: String, default: "" },
    enabled_languages: { type: [String], default: ["en"] },
    currency: { type: String, default: "EUR" },
    status: { type: String, enum: ["draft", "live", "archived"], default: "draft", index: true },
    plan: { type: String, enum: ["production", "standard"], default: "standard" },
    categories: { type: [{ _id: false, key: String, name: M, order: Number, tx: M }], default: [] },
    glossary: { type: [M], default: [] },
    allow_experimental: { type: Boolean, default: true },
    auto_translate: { type: Boolean, default: false },
    tx: { type: M, default: {} },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, minimize: false },
);

const dishSchema = new Schema<AnyDoc>(
  {
    restaurant_id: { type: OID, required: true, index: true },
    category: { type: String, required: true },
    name: { type: M, default: {} },
    description: { type: M, default: {} },
    context: { type: M, default: {} },
    spice_level: { type: Number, default: 0, min: 0, max: 3 },
    dietary: { type: [String], default: [] },
    tx: { type: M, default: {} },
    price: { type: Number, default: 0, min: 0 },
    allergens: { type: [String], default: [] },
    image: { type: new Schema<AnyDoc>(imageRef, { _id: false }), default: null },
    order: { type: Number, default: 0 },
    available: { type: Boolean, default: true },
    story_ids: { type: [OID], default: [] },
  },
  { timestamps: true, minimize: false },
);
dishSchema.index({ restaurant_id: 1, category: 1, order: 1 });

const storySchema = new Schema<AnyDoc>(
  {
    restaurant_id: { type: OID, required: true, index: true },
    source: { type: String, enum: ["produced_by_us"], default: "produced_by_us" },
    title: { type: M, default: {} },
    video: {
      type: new Schema<AnyDoc>({ ...imageRef, duration: Number }, { _id: false }),
      default: null,
    },
    poster: { type: new Schema<AnyDoc>(imageRef, { _id: false }), default: null },
    text_fallback: { type: M, default: {} },
    tx: { type: M, default: {} },
    audio_tracks: { type: [M], default: [] },
    subtitles: { type: [M], default: [] },
    status: { type: String, enum: ["draft", "live"], default: "draft" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, minimize: false },
);

const jobSchema = new Schema<AnyDoc>(
  {
    restaurant_id: { type: OID, required: true },
    lang: { type: String, required: true },
    status: { type: String, enum: ["running", "done", "failed"], default: "running" },
    total: { type: Number, default: 0 },
    done: { type: Number, default: 0 },
    failed_units: { type: Number, default: 0 },
    tokens: { type: Number, default: 0 },
    chars: { type: Number, default: 0 },
    error: String,
    model: String,
    started_at: { type: Date, default: () => new Date() },
    updated_at: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);
jobSchema.index({ restaurant_id: 1, lang: 1, updated_at: -1 });

const qrSchema = new Schema<AnyDoc>(
  {
    restaurant_id: { type: OID, required: true, index: true },
    code: { type: String, required: true, unique: true },
    label: { type: String, default: "" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

const eventSchema = new Schema<AnyDoc>(
  {
    restaurant_id: { type: OID, required: true },
    dish_id: { type: OID, default: null },
    story_id: { type: OID, default: null },
    type: { type: String, enum: ["menu_view", "language_select", "story_open", "story_play", "story_complete"], required: true },
    language: { type: String, default: "en" },
    session_id: { type: String, required: true },
    timestamp: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);
eventSchema.index({ restaurant_id: 1, type: 1, timestamp: -1 });
eventSchema.index({ restaurant_id: 1, dish_id: 1, type: 1 });

const userSchema = new Schema<AnyDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    role: { type: String, default: "staff" },
    restaurant_ids: { type: [OID], default: [] },
  },
  { timestamps: true },
);

const settingSchema = new Schema<AnyDoc>(
  { key: { type: String, required: true, unique: true }, value: { type: M, default: {} } },
  { timestamps: true, minimize: false },
);

const reg = (name: string, schema: Schema<AnyDoc>, collection: string): Model<AnyDoc> =>
  (models[name] as Model<AnyDoc> | undefined) ?? model<AnyDoc>(name, schema, collection);

export const RestaurantModel = reg("Restaurant", restaurantSchema, "restaurants");
export const DishModel = reg("Dish", dishSchema, "dishes");
export const StoryModel = reg("Story", storySchema, "stories");
export const QrCodeModel = reg("QrCode", qrSchema, "qr_codes");
export const EventModel = reg("Event", eventSchema, "events");
export const JobModel = reg("TranslationJob", jobSchema, "translation_jobs");
export const UserModel = reg("User", userSchema, "users");
export const SettingModel = reg("PlatformSetting", settingSchema, "platform_settings");
