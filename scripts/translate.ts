/**
 * Translate a restaurant's menu from the command line.
 *   npm run translate -- --slug casa-valdarno                 enabled languages, changed units only
 *   npm run translate -- --slug casa-valdarno --langs hi,ar  specific languages
 *   npm run translate -- --slug casa-valdarno --force         also regenerate fresh machine translations
 * Staff-edited text is never overwritten, with or without --force.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const { restaurants } = await import("../lib/db/platform");
  const { translateRestaurant } = await import("../lib/translate/service");
  const slug = arg("slug");
  if (!slug) throw new Error("--slug is required");
  const r = await restaurants.bySlug(slug);
  if (!r) throw new Error(`No restaurant with slug "${slug}"`);
  const langs = arg("langs")?.split(",").map((s) => s.trim()).filter(Boolean);
  const started = Date.now();
  const res = await translateRestaurant(r.id, langs, { force: process.argv.includes("--force") });
  for (const s of res) {
    console.log(
      `${s.lang.padEnd(8)} ${s.status.padEnd(8)} translated=${s.translated} failed=${s.failed} tokens=${s.tokens}${s.error ? `  (${s.error})` : ""}`,
    );
  }
  console.log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
