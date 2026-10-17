/**
 * Parse a menu pasted from a spreadsheet or a document: tab- or comma-separated rows of
 *   category, name, description, price
 * (a header row is optional). Pure, so the dialog preview and the server action agree.
 */
export type ImportRow = { category: string; name: string; description: string; price: number };
export type ParsedMenu = { rows: ImportRow[]; errors: string[] };

function splitLine(line: string, delim: string): string[] {
  if (delim === "\t") return line.split("\t").map((c) => c.trim());
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** "€18", "18,50", "18.50 EUR" → 18.5; null if there is no number. */
export function parsePrice(raw: string): number | null {
  const m = raw.replace(/\s/g, "").match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!m) return null;
  const n = Number.parseFloat(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseMenuText(text: string, max = 300): ParsedMenu {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [], errors: [] };
  const delim = lines.some((l) => l.includes("\t")) ? "\t" : ",";
  const rows: ImportRow[] = [];
  const errors: string[] = [];
  let startAt = 0;
  const first = splitLine(lines[0], delim).map((c) => c.toLowerCase());
  if (first.includes("name") || first.includes("dish") || first.includes("category")) startAt = 1;

  for (let i = startAt; i < lines.length; i++) {
    const [category = "", name = "", description = "", price = ""] = splitLine(lines[i], delim);
    if (!name) {
      errors.push(`Line ${i + 1}: no dish name`);
      continue;
    }
    if (!category) {
      errors.push(`Line ${i + 1} (${name}): no category`);
      continue;
    }
    const p = parsePrice(price);
    if (p === null) {
      errors.push(`Line ${i + 1} (${name}): no price`);
      continue;
    }
    rows.push({ category: category.slice(0, 80), name: name.slice(0, 120), description: description.slice(0, 600), price: p });
    if (rows.length >= max) {
      errors.push(`Only the first ${max} dishes are imported at a time`);
      break;
    }
  }
  return { rows, errors };
}
