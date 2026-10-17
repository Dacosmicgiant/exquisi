import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SKIP = new Set(["node_modules", ".next", ".git", "public", "tests", "coverage"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(ROOT).map((p) => ({ rel: relative(ROOT, p), src: readFileSync(p, "utf8") }));
const importsOf = (src: string) =>
  [...src.matchAll(/(?:import|export)[^;]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1] ?? m[2]);

describe("architecture boundaries", () => {
  it("only lib/db imports mongoose or the models", () => {
    const bad = files.filter(
      (f) =>
        !f.rel.startsWith("lib/db/") &&
        !f.rel.startsWith("scripts/") &&
        importsOf(f.src).some((i) => i === "mongoose" || /lib\/db\/models/.test(i)),
    );
    expect(bad.map((f) => f.rel)).toEqual([]);
  });

  it("only lib/media imports cloudinary / next-cloudinary", () => {
    const bad = files.filter(
      (f) =>
        !f.rel.startsWith("lib/media/") &&
        importsOf(f.src).some((i) => i === "cloudinary" || i.startsWith("next-cloudinary") || i.startsWith("cloudinary/")),
    );
    expect(bad.map((f) => f.rel)).toEqual([]);
  });

  it("only lib/media/sign.server.ts imports the Cloudinary SDK", () => {
    const sdk = files.filter((f) => importsOf(f.src).some((i) => i === "cloudinary"));
    expect(sdk.map((f) => f.rel)).toEqual(["lib/media/sign.server.ts"]);
  });

  it("pages are never client components", () => {
    const bad = files.filter((f) => /(^|\/)page\.tsx$/.test(f.rel) && /^\s*["']use client["']/.test(f.src));
    expect(bad.map((f) => f.rel)).toEqual([]);
  });

  it("diner routes never import the motion libraries", () => {
    const diner = files.filter((f) => f.rel.startsWith("app/(menu)/") || f.rel.startsWith("components/diner/"));
    const bad = diner.filter((f) =>
      importsOf(f.src).some((i) => i.startsWith("motion") || i.startsWith("framer-motion") || /components\/ui\/(blur-fade|border-beam|shine-border|number-ticker|spotlight|background-beams|text-generate-effect)/.test(i)),
    );
    expect(bad.map((f) => f.rel)).toEqual([]);
  });
});
