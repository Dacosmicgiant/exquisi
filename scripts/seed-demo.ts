/**
 * Demo restaurant for recording the product video (see DEMO_VIDEO_SCRIPT.md): "The Corner Kitchen", an ordinary neighbourhood
 * restaurant with 4 sections × 4 everyday dishes, each with a written story, allergens, dietary tags and a "what to expect" line.
 * All of it is fictional demo content. It starts UNBRANDED (house style) so the Brand tab can be shown re-theming it live.
 *
 *   npm run seed:demo                                create it (a QR code "Demo table" too). Existing slug → only applies VIDEOS below
 *   npm run seed:demo -- --translate hi,ja,ar,fr,es,de   also translate the menu into those languages now (spends DeepL characters)
 *   npm run seed:demo -- --reset                     wipe and rebuild its dishes/stories (keeps brand, QR codes; photos/videos are lost)
 *
 * Story videos: paste each dish's UNLISTED YouTube link into VIDEOS (or into the dish's Story field in the admin) and re-run.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import type { DishInput } from "../lib/db/types";

/** dish name → unlisted YouTube link. Empty = no video yet. */
const VIDEOS: Record<string, string> = {
  "Tomato Soup": "",
  "Chicken Wings": "",
  "Garlic Bread with Cheese": "",
  "Caesar Salad": "",
  "Fish and Chips": "",
  "Cheeseburger and Chips": "",
  "Roast Chicken Dinner": "",
  "Vegetable Curry with Rice": "",
  "Apple Crumble and Custard": "",
  "Chocolate Brownie": "",
  "Sticky Toffee Pudding": "",
  "Vanilla Ice Cream": "",
  "Pot of Tea": "",
  "Filter Coffee": "",
  "Fresh Orange Juice": "",
  "Homemade Lemonade": "",
};

type Demo = {
  name: string;
  description: string;
  context: string;
  price: number; // GBP
  spice?: number;
  dietary?: string[];
  allergens: string[];
  story: [title: string, text: string];
};

const SECTIONS: { name: string; dishes: Demo[] }[] = [
  {
    name: "Starters",
    dishes: [
      {
        name: "Tomato Soup",
        description: "Creamy tomato soup with a slice of buttered bread.",
        context: "Warm, smooth and mild. A good way to start.",
        price: 6,
        dietary: ["vegetarian"],
        allergens: ["gluten", "milk"],
        story: ["A bowl of comfort", "Tomato soup is the dish people ask for when it is cold outside. Ours is made from ripe tomatoes, simmered slowly and finished with a little cream, then served with buttered bread for dipping."],
      },
      {
        name: "Chicken Wings",
        description: "Crispy chicken wings tossed in hot sauce, with celery and a blue cheese dip.",
        context: "Sticky, spicy and best eaten with your hands. Six wings.",
        price: 8,
        spice: 2,
        allergens: ["milk", "celery"],
        story: ["Made for sharing", "Hot wings are said to have begun in Buffalo, New York, in 1964, and quickly became the snack everyone wants to share. Ours are baked, then fried until crisp and tossed in a spicy sauce. The cool dip is there for a reason."],
      },
      {
        name: "Garlic Bread with Cheese",
        description: "Toasted baguette with garlic butter and melted mozzarella.",
        context: "Hot, buttery and cheesy. Easy to share.",
        price: 6,
        dietary: ["vegetarian"],
        allergens: ["gluten", "milk"],
        story: ["Simple and always first to go", "Garlic bread needs only a few things done well: good bread, plenty of garlic butter and a hot oven. Add melted cheese and it is gone before the main courses arrive."],
      },
      {
        name: "Caesar Salad",
        description: "Crisp lettuce, grilled chicken, croutons, Parmesan and Caesar dressing.",
        context: "A classic salad that is filling enough for lunch.",
        price: 9,
        allergens: ["gluten", "eggs", "milk", "fish", "mustard"],
        story: ["Named after its cook", "The Caesar salad is named after Caesar Cardini, an Italian-born chef who made it in Tijuana, Mexico, in 1924. The dressing is the secret: egg, lemon, garlic and Parmesan, with a little anchovy."],
      },
    ],
  },
  {
    name: "Mains",
    dishes: [
      {
        name: "Fish and Chips",
        description: "Beer-battered cod, thick-cut chips, mushy peas and tartare sauce.",
        context: "A big portion: crisp batter outside, flaky white fish inside.",
        price: 14,
        allergens: ["gluten", "fish", "eggs", "mustard"],
        story: ["A British favourite", "Fish and chips has been a British takeaway favourite for more than 150 years. We keep it the traditional way: fresh cod in a light, crisp batter, chunky chips and a squeeze of lemon, with mushy peas on the side."],
      },
      {
        name: "Cheeseburger and Chips",
        description: "A juicy beef burger with melted cheese, lettuce and tomato in a toasted bun, served with chips.",
        context: "A proper burger: juicy, with melted cheese. Eat it with both hands.",
        price: 13,
        dietary: ["contains_beef"],
        allergens: ["gluten", "milk", "eggs", "mustard"],
        story: ["The everyday classic", "Everyone has a favourite way to eat a cheeseburger, so we keep ours simple: a juicy beef patty, melted cheddar, crisp lettuce and tomato, and our own sauce in a toasted bun, with a pile of hot chips."],
      },
      {
        name: "Roast Chicken Dinner",
        description: "Roast chicken, roast potatoes, seasonal vegetables, Yorkshire pudding and gravy.",
        context: "A hearty plate with everything on it. Gravy comes poured over.",
        price: 16,
        allergens: ["gluten", "eggs", "milk", "celery"],
        story: ["Sunday on a plate", "In Britain the roast dinner is the meal families sit down to together. Ours has golden roast potatoes, a light Yorkshire pudding and plenty of gravy, and you do not have to wait for Sunday."],
      },
      {
        name: "Vegetable Curry with Rice",
        description: "Mild vegetable curry with chickpeas and spinach, served with basmati rice.",
        context: "A gentle, fragrant curry with a little warmth. Fully vegan.",
        price: 12,
        spice: 1,
        dietary: ["vegan"],
        allergens: [],
        story: ["Curry, the British way", "Curry has been on British tables for a very long time and is now one of the nation's favourite dinners. Ours is mild and fragrant, full of vegetables and chickpeas, and made without any meat or dairy."],
      },
    ],
  },
  {
    name: "Desserts",
    dishes: [
      {
        name: "Apple Crumble and Custard",
        description: "Baked apples under a buttery crumble, with hot vanilla custard.",
        context: "Warm and sweet, with a crunchy top.",
        price: 7,
        dietary: ["vegetarian"],
        allergens: ["gluten", "milk", "eggs"],
        story: ["The pudding everyone grew up on", "Crumble is one of Britain's best-loved puddings: soft apples under a golden, buttery topping. It is at its best with plenty of hot custard poured over the top."],
      },
      {
        name: "Chocolate Brownie",
        description: "Warm chocolate brownie with walnuts and vanilla ice cream.",
        context: "Rich and gooey in the middle. Very chocolatey.",
        price: 7,
        dietary: ["vegetarian"],
        allergens: ["gluten", "eggs", "milk", "nuts"],
        story: ["Chocolate, no apologies", "A good brownie is crisp on top and soft in the middle. We serve ours warm with a scoop of vanilla ice cream melting on the side, so you get hot and cold in every spoonful."],
      },
      {
        name: "Sticky Toffee Pudding",
        description: "Date sponge with warm toffee sauce and cream.",
        context: "A very sweet, soft sponge. A little goes a long way.",
        price: 7,
        dietary: ["vegetarian"],
        allergens: ["gluten", "eggs", "milk"],
        story: ["The one people come back for", "Sticky toffee pudding is a modern British classic: a moist sponge made with dates, drowned in warm toffee sauce. It is the dessert regulars order without opening the menu."],
      },
      {
        name: "Vanilla Ice Cream",
        description: "Three scoops of vanilla ice cream with a wafer.",
        context: "Cold, creamy and simple. Good for sharing.",
        price: 5,
        dietary: ["vegetarian"],
        allergens: ["milk", "eggs", "gluten"],
        story: ["Plain and perfect", "Sometimes the best dessert is the simplest. Smooth vanilla ice cream, three generous scoops and a crisp wafer: an easy end to a meal."],
      },
    ],
  },
  {
    name: "Drinks",
    dishes: [
      {
        name: "Pot of Tea",
        description: "A pot of English breakfast tea, served with milk.",
        context: "Enough for two cups. Served hot.",
        price: 3,
        dietary: ["vegetarian"],
        allergens: ["milk"],
        story: ["The national drink", "Tea is part of everyday British life, from a quiet morning to a long chat. We serve it the proper way, in a pot, with the milk on the side so you can pour it how you like it."],
      },
      {
        name: "Filter Coffee",
        description: "Freshly brewed filter coffee with free refills.",
        context: "Smooth and medium strength. Refills are free.",
        price: 3,
        dietary: ["vegan"],
        allergens: [],
        story: ["Always a fresh pot", "Filter coffee is made to be shared and refilled. We brew a fresh pot throughout the day, so your cup is never left to go cold."],
      },
      {
        name: "Fresh Orange Juice",
        description: "Oranges squeezed to order.",
        context: "Bright, sweet and cold. No added sugar.",
        price: 4,
        dietary: ["vegan"],
        allergens: [],
        story: ["Squeezed to order", "We squeeze each glass when you order it, because orange juice tastes best in the first few minutes. Nothing is added: just oranges."],
      },
      {
        name: "Homemade Lemonade",
        description: "Lemons, sugar and sparkling water, served over ice with mint.",
        context: "Sweet and sharp. Very refreshing.",
        price: 4,
        dietary: ["vegan"],
        allergens: [],
        story: ["Sharp, sweet and cold", "Real lemonade is simple: fresh lemons, a little sugar and plenty of ice. We make it in small batches, and top it with sparkling water and a sprig of mint."],
      },
    ],
  },
];

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

async function main() {
  const { restaurants } = await import("../lib/db/platform");
  const { forTenant } = await import("../lib/db/tenant");
  const { toMinor } = await import("../lib/money");
  const { parseYouTubeUrl } = await import("../lib/media/youtube");

  const slug = "the-corner-kitchen";
  const reset = process.argv.includes("--reset");
  const translateTo = arg("translate")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];

  let r = await restaurants.bySlug(slug);
  const fresh = !r;
  if (!r) {
    r = await restaurants.create({
      slug,
      name: { en: "The Corner Kitchen" },
      default_language: "en",
      enabled_languages: ["en"],
      currency: "GBP",
      status: "live",
      brand: {},
      allow_experimental: true,
    });
  }
  const db = forTenant(r.id);

  if (fresh || reset) {
    for (const d of await db.dishes.list()) await db.dishes.remove(d.id);
    for (const s of await db.stories.list()) await db.stories.remove(s.id);
    for (const c of await db.categories.list()) await db.categories.remove(c.key).catch(() => undefined);

    for (const sec of SECTIONS) {
      const cat = await db.categories.add({ en: sec.name });
      for (const d of sec.dishes) {
        const story = await db.stories.create({
          title: { en: d.story[0] },
          text_fallback: { en: d.story[1] },
          video: null,
          poster: null,
          audio_tracks: [],
          subtitles: [],
          status: "live",
        });
        const input: DishInput = {
          category: cat.key,
          name: { en: d.name },
          description: { en: d.description },
          context: { en: d.context },
          spice_level: d.spice ?? 0,
          dietary: d.dietary ?? [],
          price: toMinor(d.price, "GBP"),
          allergens: d.allergens,
          image: null,
          order: 0,
          available: true,
          story_ids: [story.id],
        };
        await db.dishes.create(input);
      }
    }
    console.log(`created ${slug}: ${SECTIONS.length} sections, ${SECTIONS.reduce((n, s) => n + s.dishes.length, 0)} dishes, each with a story`);
  } else {
    console.log(`${slug} already exists: left as it is (use --reset to rebuild).`);
  }

  if (!(await db.qrCodes.list()).length) {
    const q = await db.qrCodes.create("Demo table");
    console.log(`qr: ${process.env.APP_URL ?? "http://localhost:3000"}/r/${q.code}`);
  }

  // story videos: apply the links above to the dishes' stories
  const dishes = await db.dishes.list();
  let linked = 0;
  for (const [name, url] of Object.entries(VIDEOS)) {
    if (!url.trim()) continue;
    const id = parseYouTubeUrl(url);
    if (!id) {
      console.warn(`  not a YouTube link, skipped: ${name} → ${url}`);
      continue;
    }
    const dish = dishes.find((d) => d.name.en === name);
    if (dish?.story_ids[0]) {
      await db.stories.update(dish.story_ids[0], { youtube_id: id });
      linked++;
    }
  }
  const withVideo = (await db.stories.list()).filter((s) => s.youtube_id).length;
  console.log(`story videos: ${withVideo} of ${dishes.length} dishes (${linked} set this run)`);

  // optional: translate now (this is the only part that spends DeepL characters)
  if (translateTo.length) {
    const { translateRestaurant } = await import("../lib/translate/service");
    await restaurants.update(r.id, { enabled_languages: ["en", ...translateTo.filter((l) => l !== "en")] });
    const res = await translateRestaurant(r.id, translateTo);
    for (const s of res) console.log(`${s.lang.padEnd(6)} ${s.status.padEnd(8)} translated=${s.translated} failed=${s.failed} chars=${s.chars}${s.error ? `  (${s.error})` : ""}`);
    console.log(`characters used this run: ${res.reduce((n, s) => n + s.chars, 0)}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
