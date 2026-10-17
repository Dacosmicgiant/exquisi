import { describe, expect, it } from "vitest";
import { contrastRatio, diffTheme, hasOverrides, overridesToBrand } from "@/lib/theme/overrides";
import { resolveTheme } from "@/lib/theme/resolve";
import { defaultTheme } from "@/theme/theme.config";

describe("theme overrides", () => {
  it("diff of identical themes is empty", () => {
    expect(hasOverrides(diffTheme(defaultTheme, structuredClone(defaultTheme)))).toBe(false);
  });
  it("round-trips: resolving the diff reproduces the edited theme", () => {
    const edited = structuredClone(defaultTheme);
    edited.colors.light.primary = "#123456";
    edited.colors.dark.background = "#000000";
    edited.fonts.display = "playfair-display";
    edited.radius = "0.5rem";
    edited.ornaments.paperGrain = false;
    const diff = diffTheme(defaultTheme, edited);
    expect(diff.colors?.light).toEqual({ primary: "#123456" }); // only what changed
    expect(diff.fonts).toEqual({ display: "playfair-display" });
    expect(resolveTheme(diff)).toEqual(edited);
  });
  it("maps overrides onto the restaurant brand shape", () => {
    const b = overridesToBrand({ colors: { light: { primary: "#111111" } }, fonts: { body: "inter" }, radius: "0", density: "spacious" });
    expect(b.colors?.light?.primary).toBe("#111111");
    expect(b.fonts).toEqual({ body: "inter" });
    expect(b.theme).toEqual({ radius: "0", density: "spacious" });
  });
  it("computes WCAG contrast", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777", "#777")).toBe(1);
    expect(contrastRatio("nope", "#fff")).toBeNull();
    // the default palette is readable
    expect(contrastRatio(defaultTheme.colors.light.foreground, defaultTheme.colors.light.background)!).toBeGreaterThan(7);
    expect(contrastRatio(defaultTheme.colors.dark.foreground, defaultTheme.colors.dark.background)!).toBeGreaterThan(7);
  });
});
