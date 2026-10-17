import { config } from "dotenv";

config({ path: ".env.local" });
// Never run DB tests against the real database: point at a throwaway one.
if (process.env.MONGODB_URI) {
  process.env.MONGODB_URI = process.env.MONGODB_URI.replace(
    /\/menu_stories(\?|$)/,
    "/menu_stories_test$1",
  );
}
