import { describe, expect, it } from "vitest";
import { themeToCss, fontFaceCss } from "@/lib/theme/css";
import { resolveTheme, sanitizeOverrides } from "@/lib/theme/resolve";
import { defaultTheme } from "@/theme/theme.config";
import { brandToOverrides } from "@/lib/theme/server";

describe("theme resolution", () => {
  it("returns theme.config.ts when there are no overrides", () => {
    expect(resolveTheme()).toEqual(defaultTheme);
    expect(resolveTheme({}, undefined, null)).toEqual(defaultTheme);
  });

  it("layers platform < restaurant overrides", () => {
    const t = resolveTheme(
      { colors: { light: { primary: "#112233" } }, radius: "1rem" },
      { colors: { light: { primary: "#445566" } } },
    );
    expect(t.colors.light.primary).toBe("#445566");
    expect(t.radius).toBe("1rem");
    expect(t.colors.light.background).toBe(defaultTheme.colors.light.background);
    expect(t.colors.dark).toEqual(defaultTheme.colors.dark);
  });

  it("drops invalid sections instead of breaking the page", () => {
    const o = sanitizeOverrides({
      colors: { light: { primary: "not-a-colour" } },
      fonts: { display: "comic-sans" },
      radius: "0.5rem",
      motion: { duration: "slow" },
    });
    expect(o.colors).toBeUndefined();
    expect(o.fonts).toBeUndefined();
    expect(o.motion).toBeUndefined();
    expect(o.radius).toBe("0.5rem");
    expect(resolveTheme({ fonts: { display: "comic-sans" } }).fonts).toEqual(defaultTheme.fonts);
  });

  it("folds a restaurant brand into an override layer", () => {
    const t = resolveTheme(
      {},
      brandToOverrides({ colors: { dark: { background: "#000000" } }, fonts: { display: "playfair-display" }, theme: { density: "spacious" } }),
    );
    expect(t.colors.dark.background).toBe("#000000");
    expect(t.fonts.display).toBe("playfair-display");
    expect(t.density).toBe("spacious");
  });

  it("emits css variables for both modes and at most two font files", () => {
    const css = themeToCss(defaultTheme);
    expect(css).toContain("--background:#F4EEE1");
    expect(css).toContain("--background:#14110E");
    expect(css).toContain('prefers-color-scheme:dark');
    expect(css).toContain('[data-mode="dark"]');
    const faces = fontFaceCss(defaultTheme).match(/@font-face/g) ?? [];
    expect(faces.length).toBe(2);
    expect(fontFaceCss(defaultTheme)).toContain("font-display:swap");
    const same = resolveTheme({ fonts: { display: "jost", body: "jost" } });
    expect((fontFaceCss(same).match(/@font-face/g) ?? []).length).toBe(1);
  });
});
