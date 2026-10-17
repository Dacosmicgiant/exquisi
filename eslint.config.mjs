import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // ── Architecture boundaries (see CLAUDE.md) ───────────────────────────────
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["lib/db/**", "scripts/**", "tests/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "mongoose", message: "Data access goes through lib/db (forTenant / platform)." },
          ],
          patterns: [
            { group: ["**/lib/db/models", "**/lib/db/models/*", "@/lib/db/models", "@/lib/db/models/*"], message: "Mongoose models never leave lib/db. Use forTenant(restaurantId) or lib/db/platform." },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["lib/media/**", "tests/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "cloudinary", message: "All media goes through lib/media." },
            { name: "next-cloudinary", message: "All media goes through lib/media (MediaImage / UploadButton)." },
          ],
          patterns: [{ group: ["cloudinary/*", "next-cloudinary/*"], message: "All media goes through lib/media." }],
        },
      ],
    },
  },
  // files that are outside BOTH exemptions must satisfy both rules; ESLint merges the
  // rule options per file, so declare the combined set for the common case:
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["lib/db/**", "lib/media/**", "scripts/**", "tests/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "mongoose", message: "Data access goes through lib/db (forTenant / platform)." },
            { name: "cloudinary", message: "All media goes through lib/media." },
            { name: "next-cloudinary", message: "All media goes through lib/media (MediaImage / UploadButton)." },
          ],
          patterns: [
            { group: ["**/lib/db/models", "**/lib/db/models/*", "@/lib/db/models", "@/lib/db/models/*"], message: "Mongoose models never leave lib/db." },
            { group: ["cloudinary/*", "next-cloudinary/*"], message: "All media goes through lib/media." },
          ],
        },
      ],
    },
  },

  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "coverage/**", ".lighthouseci/**"]),
]);

export default eslintConfig;
