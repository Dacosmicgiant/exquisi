import { z } from "zod";
import { ALLERGEN_KEYS } from "@/lib/allergens";
import { DIETARY_KEYS } from "@/lib/db/types";
import { FONT_KEYS } from "@/lib/theme/fonts";

export const langMapSchema = z.record(z.string().min(2).max(8), z.string().max(4000));

export const imageRefSchema = z.object({
  provider: z.literal("cloudinary"),
  public_id: z.string().min(1).max(300),
});
export const videoRefSchema = imageRefSchema.extend({ duration: z.number().nonnegative().optional() });

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and single hyphens only");

const nonEmptyMap = (msg: string) =>
  langMapSchema.refine((m) => Object.values(m).some((v) => v.trim()), msg);

export const restaurantSchema = z
  .object({
    slug: slugSchema,
    name: nonEmptyMap("Name is required"),
    default_language: z.string().min(2).max(8),
    enabled_languages: z.array(z.string().min(2).max(8)).min(1),
    currency: z.string().length(3).toUpperCase(),
    status: z.enum(["draft", "live", "archived"]),
  })
  .refine((r) => r.enabled_languages.includes(r.default_language), {
    message: "The default language must be enabled",
    path: ["default_language"],
  });
export type RestaurantFormValues = z.infer<typeof restaurantSchema>;

export const brandSchema = z.object({
  logo: imageRefSchema.nullable().optional(),
  colors: z.object({ light: z.record(z.string(), z.string()).optional(), dark: z.record(z.string(), z.string()).optional() }).optional(),
  fonts: z.object({ display: z.enum(FONT_KEYS).optional(), body: z.enum(FONT_KEYS).optional() }).optional(),
  theme: z.record(z.string(), z.unknown()).optional(),
});

export const dishSchema = z.object({
  category: z.string().min(1),
  name: langMapSchema,
  description: langMapSchema,
  context: langMapSchema,
  spice_level: z.number().int().min(0).max(3),
  dietary: z.array(z.enum(DIETARY_KEYS)),
  /** integer minor units */
  price: z.number().int().min(0).max(100_000_000),
  allergens: z.array(z.enum(ALLERGEN_KEYS)),
  image: imageRefSchema.nullable(),
  available: z.boolean(),
  story_ids: z.array(z.string()),
});
export type DishFormValues = z.infer<typeof dishSchema>;

export const storySchema = z.object({
  title: langMapSchema,
  text_fallback: langMapSchema,
  video: videoRefSchema.nullable(),
  poster: imageRefSchema.nullable(),
  status: z.enum(["draft", "live"]),
});
export type StoryFormValues = z.infer<typeof storySchema>;

export const eventSchema = z.object({
  slug: slugSchema,
  type: z.enum(["menu_view", "language_select", "story_open", "story_play", "story_complete"]),
  session_id: z.string().min(8).max(64),
  language: z.string().min(2).max(8),
  dish_id: z.string().optional().nullable(),
  story_id: z.string().optional().nullable(),
});
