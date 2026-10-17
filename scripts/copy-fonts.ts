/**
 * Copies the latin variable woff2 file for each catalog font out of
 * @fontsource-variable into public/fonts. Run: npm run fonts
 */
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const out = join(root, "public", "fonts");
mkdirSync(out, { recursive: true });

const fonts = [
  "cormorant-garamond",
  "playfair-display",
  "eb-garamond",
  "fraunces",
  "jost",
  "inter",
  "libre-franklin",
  "manrope",
];

let missing = 0;
for (const key of fonts) {
  const src = join(
    root,
    "node_modules",
    "@fontsource-variable",
    key,
    "files",
    `${key}-latin-wght-normal.woff2`,
  );
  if (!existsSync(src)) {
    console.error(`missing: ${src}`);
    missing++;
    continue;
  }
  copyFileSync(src, join(out, `${key}.woff2`));
  console.log(`copied ${key}.woff2`);
}
process.exit(missing ? 1 : 0);
