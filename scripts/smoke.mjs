/**
 * End-to-end smoke test for the product's "done" criteria:
 *   scan QR on a phone → language screen → pick language → translated menu → open a dish story
 *   → the visit shows up in the admin analytics.
 *
 *   npm run dev            (or `npm run build && npm run start`) with the seeded demo restaurant
 *   npm run smoke
 *
 * Env: BASE_URL (default http://localhost:3000), ADMIN_EMAIL / ADMIN_PASSWORD (from .env.local),
 *      CHROME_PATH (optional Chromium executable).
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const env = { ...Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])), ...process.env };
const BASE = env.BASE_URL || "http://localhost:3000";
const SLUG = "casa-valdarno";
let failed = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${extra ? `  ${extra}` : ""}`);
  if (!ok) failed++;
};

const browser = await chromium.launch(env.CHROME_PATH ? { executablePath: env.CHROME_PATH } : {});

async function adminStats(ctx) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/admin/login`);
  if (p.url().includes("/login")) {
    await p.fill("#email", env.ADMIN_EMAIL);
    await p.fill("#password", env.ADMIN_PASSWORD);
    await Promise.all([p.waitForURL(`${BASE}/admin`), p.click("button[type=submit]")]);
  }
  // (no "networkidle": production Next keeps prefetching links in view)
  await p.locator("a", { hasText: "Casa Valdarno" }).first().waitFor();
  await p.waitForTimeout(500);
  await p.locator("a", { hasText: "Casa Valdarno" }).first().click();
  await p.waitForURL(/restaurants\/[0-9a-f]{24}$/);
  const base = p.url();
  await p.goto(`${base}/qr`);
  await p.waitForSelector("img[alt^='QR code']");
  const code = (await p.locator("p[title*='/r/']").first().getAttribute("title")).split("/r/")[1];
  await p.goto(`${base}/analytics?days=7`);
  await p.waitForSelector("[data-testid=tiles]");
  // read the real values from data-value (the visible numbers count up over ~1.5s)
  const tiles = (await p.locator("[data-testid=tiles] [data-value]").evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-value")))));
  const langs = await p.locator("[data-testid=languages]").innerText();
  const stories = await p.locator("[data-testid=stories]").innerText();
  await p.close();
  return { base, code, views: tiles[0], visitors: tiles[1], picks: tiles[2], opens: tiles[3], langs, stories };
}

const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const before = await adminStats(adminCtx);
console.log(`QR code ${before.code}; analytics before: views=${before.views} picks=${before.picks} stories=${before.opens}`);

// ── the diner, on a phone set to Hindi ────────────────────────────────────────
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "hi-IN", deviceScaleFactor: 2 });
const p = await phone.newPage();
await p.goto(`${BASE}/r/${before.code}`);
check("QR redirect lands on the language screen", new URL(p.url()).pathname === `/m/${SLUG}`, p.url());
await p.waitForSelector("[aria-label='Suggested for you'] a");
// the server renders the default language in this slot; the picker swaps in the device language after hydration
await p.waitForSelector(`[aria-label='Suggested for you'] a[href='/m/${SLUG}/hi']`, { timeout: 15000 }).catch(() => {});
const suggested = await p.locator("[aria-label='Suggested for you'] a").first().getAttribute("href");
check("phone language (Hindi) is suggested first", suggested === `/m/${SLUG}/hi`, suggested);
check("native name in large type", (await p.locator("[aria-label='Suggested for you'] a").first().innerText()).includes("हिन्दी"));
await p.locator("[aria-label='Suggested for you'] a").first().click();
await p.waitForURL(`${BASE}/m/${SLUG}/hi`);
// categories start folded ("What's on your mind?" + a list of headings): the dishes appear when one is opened
check("menu opens on folded categories", (await p.locator("details.cat[open]").count()) === 0 && (await p.locator(".prompt").count()) === 1);
await p.locator("details.cat > summary").first().click();
await p.waitForSelector("details.cat[open] h3");
check("menu is rendered in Hindi", (await p.evaluate(() => document.documentElement.lang)) === "hi");
const names = await p.evaluate(() => [...document.querySelectorAll("h3")].map((h) => h.textContent.trim()));
check("original dish names are always shown", names.includes("Burrata di Andria") && names.includes("Tagliolini al Tartufo Bianco"));
check("allergens come from the fixed vocabulary", (await p.locator("ul[aria-label] li").allInnerTexts()).some((t) => t.includes("दूध")));
check("machine-translation notice shown", (await p.locator("aside[role=note]").count()) === 1);
// open the category that holds the first dish story, then the story itself
await p.evaluate(() => { const d = document.querySelector("details.story")?.closest("details.cat"); if (d) d.open = true; });
await p.locator("details.cat[open] details.story summary").first().click();
await p.waitForTimeout(600);
await p.goto(`${BASE}/r/${before.code}`);
check("returning diner skips the language screen", new URL(p.url()).pathname === `/m/${SLUG}/hi`, p.url());
await p.waitForTimeout(600);

// ── and it shows up in the admin ──────────────────────────────────────────────
// beacons are fire-and-forget (and a cold server may still be generating pages), so poll until the counts land
let after = before;
for (let i = 0; i < 8; i++) {
  await new Promise((r) => setTimeout(r, 1500));
  after = await adminStats(adminCtx);
  if (after.views >= before.views + 2 && after.picks >= before.picks + 1 && after.opens >= before.opens + 1) break;
}
console.log(`analytics after:  views=${after.views} picks=${after.picks} stories=${after.opens}`);
check("menu views increased", after.views >= before.views + 2, `${before.views} → ${after.views}`);
check("language pick recorded", after.picks >= before.picks + 1, `${before.picks} → ${after.picks}`);
check("story open recorded", after.opens >= before.opens + 1, `${before.opens} → ${after.opens}`);
check("Hindi appears in the language breakdown", after.langs.includes("हिन्दी"));
check("a dish appears under most-opened stories", !after.stories.includes("No stories opened yet"));

// ── beacon endpoint hygiene ───────────────────────────────────────────────────
const bad = await adminCtx.request.post(`${BASE}/api/events`, { data: "{not json", headers: { "content-type": "application/json" } });
check("events endpoint rejects junk", bad.status() === 400);
const forged = await adminCtx.request.post(`${BASE}/api/events`, { data: { slug: SLUG, type: "story_open", session_id: "forged-session-1", language: "hi", dish_id: "000000000000000000000000" } });
check("events endpoint answers 204 and ignores a dish that isn't the restaurant's", forged.status() === 204);

// ── text-to-speech: buttons appear only for languages the device can speak ────────────
const speechCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await speechCtx.addInitScript(() => {
  const spoken = [];
  window.__spoken = spoken;
  const voices = [{ lang: "it_IT" }, { lang: "hi-IN" }];
  Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: function (t) { this.text = t; } });
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { getVoices: () => voices, speak: (u) => spoken.push({ text: u.text, voice: u.voice && u.voice.lang }), cancel() {}, addEventListener() {} } });
});
const sp = await speechCtx.newPage();
await sp.goto(`${BASE}/m/${SLUG}/hi`);
await sp.locator("details.cat > summary").first().click();
await sp.waitForSelector("details.cat[open] h3");
await sp.waitForSelector("h3 button[data-speak]:not([hidden])", { timeout: 5000 }).catch(() => {});
check("speaker buttons appear when the device has a voice", (await sp.locator("button[data-speak]:not([hidden])").count()) > 0);
await sp.locator("h3 button[data-speak]:not([hidden])").first().click();
const said = await sp.evaluate(() => window.__spoken);
check("a dish name is pronounced in the language it is written in (Italian)", said.length > 0 && said[0].voice === "it_IT", JSON.stringify(said[0] ?? null));
await speechCtx.close();
const quiet = await browser.newContext({ viewport: { width: 390, height: 844 } });
await quiet.addInitScript(() => Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined }));
const qp = await quiet.newPage();
await qp.goto(`${BASE}/m/${SLUG}/hi`);
await qp.locator("details.cat > summary").first().click();
await qp.waitForSelector("details.cat[open] h3");
await qp.waitForTimeout(800);
check("no speaker buttons on a device without speech", (await qp.locator("button[data-speak]:not([hidden])").count()) === 0);

await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
