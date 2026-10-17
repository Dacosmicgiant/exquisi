import { describe, expect, it } from "vitest";
import { parseMenuText, parsePrice } from "@/lib/import/parse";

describe("menu import parser", () => {
  it("reads tab-separated rows pasted from a spreadsheet, with a header", () => {
    const { rows, errors } = parseMenuText("Category\tName\tDescription\tPrice\nAntipasti\tBurrata\tTomatoes, basil\t€18\nPrimi\tCacio e Pepe\t\t16,50");
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { category: "Antipasti", name: "Burrata", description: "Tomatoes, basil", price: 18 },
      { category: "Primi", name: "Cacio e Pepe", description: "", price: 16.5 },
    ]);
  });
  it("reads CSV with quoted commas and no header", () => {
    const { rows } = parseMenuText('Dolci,Tiramisù,"Savoiardi, mascarpone, ""espresso""",14');
    expect(rows[0]).toMatchObject({ name: "Tiramisù", description: 'Savoiardi, mascarpone, "espresso"', price: 14 });
  });
  it("reports unusable lines instead of guessing", () => {
    const { rows, errors } = parseMenuText("Antipasti,,x,5\n,Soup,x,5\nPrimi,Pasta,x,free");
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(3);
  });
  it("parses prices in common formats", () => {
    expect(parsePrice("€ 18")).toBe(18);
    expect(parsePrice("18.50 EUR")).toBe(18.5);
    expect(parsePrice("n/a")).toBeNull();
  });
});
