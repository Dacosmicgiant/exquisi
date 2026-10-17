/** Lean Mongo doc → plain DTO: _id → id, ObjectIds → strings, Dates → ISO strings. */
export function plain<T>(doc: unknown): T {
  const json = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
  return rename(json) as T;
}

function rename(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(rename);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (k === "__v") continue;
      if (k === "_id") {
        out.id = val;
        continue;
      }
      out[k] = rename(val);
    }
    return out;
  }
  return v;
}

export const plainList = <T>(docs: unknown[]): T[] => docs.map((d) => plain<T>(d));
