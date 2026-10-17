import { getFont } from "./fonts";
import type { ColorSet, Theme } from "./schema";

const kebab = (s: string) => s.replace(/[A-Z0-9]/g, (m) => `-${m.toLowerCase()}`);

const DENSITY: Record<Theme["density"], string> = {
  compact: "0.75",
  comfortable: "1",
  spacious: "1.35",
};

function colorVars(c: ColorSet): string {
  const v: Record<string, string> = {};
  for (const [k, val] of Object.entries(c)) v[kebab(k)] = val;
  // shadcn sidebar tokens are derived, not separately themed
  v["sidebar"] = c.card;
  v["sidebar-foreground"] = c.cardForeground;
  v["sidebar-primary"] = c.primary;
  v["sidebar-primary-foreground"] = c.primaryForeground;
  v["sidebar-accent"] = c.accent;
  v["sidebar-accent-foreground"] = c.accentForeground;
  v["sidebar-border"] = c.border;
  v["sidebar-ring"] = c.ring;
  return Object.entries(v)
    .map(([k, val]) => `--${k}:${val};`)
    .join("");
}

/** Strips anything that could break out of a <style> element. Values are already schema-validated. */
const safe = (s: string) => s.replace(/<\/?style/gi, "");

export function fontFaceCss(theme: Theme): string {
  const keys = Array.from(new Set([theme.fonts.display, theme.fonts.body]));
  return keys
    .map((k) => {
      const f = getFont(k);
      return `@font-face{font-family:"${f.family}";src:url(${f.file}) format("woff2");font-weight:${f.weights};font-style:normal;font-display:swap;}`;
    })
    .join("");
}

/** URLs to <link rel=preload> for the page's (max two) font files. */
export function fontPreloads(theme: Theme): string[] {
  return Array.from(new Set([theme.fonts.display, theme.fonts.body])).map(
    (k) => getFont(k).file,
  );
}

/**
 * Resolved theme → one inlinable stylesheet.
 *
 * Mode strategy (no JS needed for diner pages):
 *  - <html data-mode="light|dark"> forces a mode
 *  - no data-mode (or "system") follows prefers-color-scheme
 */
export function themeToCss(theme: Theme): string {
  const d = getFont(theme.fonts.display);
  const b = getFont(theme.fonts.body);
  const m = theme.motion;
  const shared =
    `--font-display:"${d.family}",${d.fallback};` +
    `--font-body:"${b.family}",${b.fallback};` +
    `--radius:${theme.radius};` +
    `--base-size:${theme.type.baseSize};` +
    `--line-height:${theme.type.lineHeight};` +
    `--display-weight:${theme.type.displayWeight};` +
    `--display-tracking:${theme.type.displayTracking};` +
    `--label-tracking:${theme.type.labelTracking};` +
    `--space-unit:${DENSITY[theme.density]};` +
    `--shadow-soft:${theme.shadow.soft};` +
    `--shadow-lifted:${theme.shadow.lifted};` +
    `--motion-duration:${m.enabled ? m.duration : "0ms"};` +
    `--motion-ease:${m.ease};` +
    `--grain-opacity:${theme.ornaments.paperGrain ? "1" : "0"};` +
    `--ornament-double-rule:${theme.ornaments.doubleRule ? "1" : "0"};`;

  const light = colorVars(theme.colors.light);
  const dark = colorVars(theme.colors.dark);

  return safe(
    `:root{${shared}${light}color-scheme:light;}` +
      `@media (prefers-color-scheme:dark){:root:not([data-mode="light"]){${dark}color-scheme:dark;}}` +
      `:root[data-mode="light"]{${light}color-scheme:light;}` +
      `:root[data-mode="dark"]{${dark}color-scheme:dark;}`,
  );
}

/**
 * Same tokens, scoped to one element (the admin preview) so the restaurant's palette never leaks
 * into the admin UI. Mode is chosen explicitly with data-mode="light|dark" on the wrapper.
 */
export function themeToScopedCss(theme: Theme, selector: string): string {
  const d = getFont(theme.fonts.display);
  const b = getFont(theme.fonts.body);
  const m = theme.motion;
  const shared =
    `--font-display:"${d.family}",${d.fallback};--font-body:"${b.family}",${b.fallback};--radius:${theme.radius};` +
    `--base-size:${theme.type.baseSize};--line-height:${theme.type.lineHeight};--display-weight:${theme.type.displayWeight};` +
    `--display-tracking:${theme.type.displayTracking};--label-tracking:${theme.type.labelTracking};` +
    `--shadow-soft:${theme.shadow.soft};--shadow-lifted:${theme.shadow.lifted};` +
    `--motion-duration:${m.enabled ? m.duration : "0ms"};--motion-ease:${m.ease};` +
    `--grain-opacity:${theme.ornaments.paperGrain ? "1" : "0"};--ornament-double-rule:${theme.ornaments.doubleRule ? "1" : "0"};`;
  return safe(
    `${selector}{${shared}${colorVars(theme.colors.light)}color-scheme:light;}` +
      `${selector}[data-mode="dark"]{${colorVars(theme.colors.dark)}color-scheme:dark;}`,
  );
}

/** Value for <html data-mode>. "system" → undefined so the media query decides. */
export function htmlMode(theme: Theme): "light" | "dark" | undefined {
  return theme.mode === "system" ? undefined : theme.mode;
}
