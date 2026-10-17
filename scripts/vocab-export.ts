/** Writes reports/vocab-review.csv for native-speaker review of the fixed allergen/UI vocabulary. */
import { mkdirSync, writeFileSync } from "node:fs";
import { vocabCsv, vocabLanguages, REVIEWED } from "../lib/i18n/vocab";

mkdirSync("reports", { recursive: true });
writeFileSync("reports/vocab-review.csv", vocabCsv());
console.log(`wrote reports/vocab-review.csv for ${vocabLanguages().length} languages (${REVIEWED.size} reviewed)`);
