import { defaultTheme } from "@/theme/theme.config";
import {
  overrideSectionSchemas,
  type Theme,
  type ThemeOverrides,
} from "./schema";

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function get(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const p of path) {
    if (!isObj(cur)) return undefined;
    cur = cur[p];
  }
  return cur;
}

function set(obj: Record<string, unknown>, path: string[], value: unknown) {
  let cur = obj;
  path.slice(0, -1).forEach((p) => {
    if (!isObj(cur[p])) cur[p] = {};
    cur = cur[p] as Record<string, unknown>;
  });
  cur[path[path.length - 1]] = value;
}

/**
 * Validate an untrusted override blob section by section. Invalid sections
 * are dropped, so a bad value in the database falls back to the layer below
 * instead of breaking a page.
 */
export function sanitizeOverrides(raw: unknown): ThemeOverrides {
  const out: Record<string, unknown> = {};
  if (!isObj(raw)) return out;
  for (const [key, schema] of Object.entries(overrideSectionSchemas)) {
    const path = key.split(".");
    const value = get(raw, path);
    if (value === undefined || value === null) continue;
    const parsed = schema.safeParse(value);
    if (parsed.success && !(isObj(parsed.data) && Object.keys(parsed.data).length === 0)) {
      set(out, path, parsed.data);
    }
  }
  return out as ThemeOverrides;
}

export function mergeTheme(base: Theme, o: ThemeOverrides): Theme {
  return {
    mode: o.mode ?? base.mode,
    radius: o.radius ?? base.radius,
    density: o.density ?? base.density,
    fonts: { ...base.fonts, ...o.fonts },
    type: { ...base.type, ...o.type },
    shadow: { ...base.shadow, ...o.shadow },
    motion: { ...base.motion, ...o.motion },
    ornaments: { ...base.ornaments, ...o.ornaments },
    colors: {
      light: { ...base.colors.light, ...o.colors?.light },
      dark: { ...base.colors.dark, ...o.colors?.dark },
    },
  };
}

/** theme.config.ts < ...layers (platform overrides, then restaurant overrides). */
export function resolveTheme(...layers: unknown[]): Theme {
  return layers.reduce<Theme>(
    (acc, layer) => mergeTheme(acc, sanitizeOverrides(layer)),
    defaultTheme,
  );
}
