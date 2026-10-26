@AGENTS.md

# menu-stories — architecture rules

**Product (pivoted):** a multilingual, story-rich menu sold as software, per location. Diner scans a
QR → small static language screen → menu fully rendered in their language, with written dish
stories. Differentiator = translating *meaning* (glossary, dish context, spice, safe allergens),
not just words. Staff admin only (us + the salesperson); restaurants never log in.

**Not in scope:** billing (invoiced manually; `plan` is just `"standard"`), restaurant logins,
self-serve uploads, review workflow, dubbing, RBAC. Films are a dormant optional add-on: the
`stories.video` schema stays, no film UI/player is built or shown (`lib/features.ts` when added).
Cloudinary is for images only.

## Rules that must hold (tests enforce several: `npm test`)

1. **Tenant scoping.** All tenant data (dishes, stories, qr_codes, events, categories) is accessed
   through `forTenant(restaurantId)` in `lib/db/tenant.ts`. It requires and validates the id and
   injects it into every filter/write. Never touch Mongoose models outside `lib/db`
   (ESLint `no-restricted-imports` + `tests/boundaries.test.ts`). Non-tenant access lives only in
   `lib/db/platform.ts` (restaurants, users, platform settings, `resolveQrCode`).
   Every record carries `restaurant_id` except `users`. UI/route code imports *types* from
   `lib/db/types.ts` only.
2. **Language maps.** Every user-facing text field is `{ en: "...", it: "..." }` (`LangMap`,
   `lib/i18n`). v1 fills only the default language; schema and UI support more. Render with
   `resolveText(map, lang, defaultLang)`.
2b. **Translation rules** (`lib/translate/`, catalog in `lib/i18n/languages.ts`):
   - **Provider:** `deepl` (default; a dedicated translation API: deterministic, cannot invent text) via
     `TRANSLATION_PROVIDER`; `mistral` (LLM) stays as an optional fallback. Both implement `TranslationProvider`.
     We deliberately do NOT use Google Cloud Translate. DeepL offers 104 of our 120 catalog languages (the checklist only lists those); the catalog still holds
     am, ceb, fy, gd, km, kn, ku, lo, or, sd, si, sm, sn, so, yo, which DeepL cannot do: they are never listed or faked.
     Never call a translation service outside `lib/translate`. `provider.deterministic` makes the pipeline skip retries.
   - **The workflow (spend calls once, on purpose).** Staff write the menu once in the source language (with photos).
     On the Translations tab they tick languages from a checklist of EVERY language DeepL offers (104 entries, from
     `lib/i18n/languages.ts`) and press Generate (`generateLanguages`). The menu is translated, saved permanently in the
     language maps (editable), and `enabled_languages` becomes exactly the list diners see on the QR language screen.
     Diners only READ saved text: there is no live or on-demand translation anywhere, and a language that is not offered
     has no page (404). Editing menu text does NOT translate unless the restaurant opts in (`restaurants.auto_translate`,
     default false); changed texts show as "waiting" with a character estimate.
   - Each language has a `tier` (supported | experimental) and `engine` (fast | strong, Mistral only) in ONE file.
     Tiers come from `npm run quality [-- --provider deepl|mistral]` (bar: ≥80% good, 0 flagged swaps, judge ≥4.3);
     the measured table is in the header of `languages.ts`.
   - **Allergens, dietary tags, spice levels and UI strings are a fixed hand-written vocabulary
     (`lib/i18n/vocab.ts`), never machine translated.** Unknown language → English label, not MT.
   - Original (source-language) dish names are ALWAYS shown; the translation is secondary.
   - Staff edits (`tx[field:lang].by === "staff"`) are never overwritten. Machine writes are guarded in
     the update filters (`forTenant().i18n.applyMachine`). Changed source → stale via `sourceHash`.
   - Language maps are merged per language on update (`""` clears one language); never replace a whole map.
   - Glossary terms become numbered placeholders (`[[T1]]`: `<x>` ignore_tags for DeepL, `translate="no"` spans for
     Google) and are restored byte-for-byte; failed units stay in the source language (never garbage). All output
     passes `validateUnit` (script, digits, glossary, echo; names may legitimately come back unchanged).
   - Experimental-tier output carries a visible "Machine translated, may be inaccurate" note and can
     be switched off per restaurant (`allow_experimental`).
3a. **Diner menu layout.** `/m/{slug}/{lang}` opens on "What's on your mind?" (`ui.prompt`, hand-written per language) and a
   list of category rows only; each category is a native `<details name="menu-category">` (one open at a time, no JS needed;
   `CategoryScript` just scrolls the opened one to the top and honours `#cat-<key>`), and dishes inside are cards with the
   photo on top (4:3, `.dish-card`, `diner.css`). Photos inside folded categories are not fetched until opened, so nothing is
   preloaded. A one-category menu starts open. Dish photos: landscape 4:3, 1200×900 or more.
3. **Server components by default.** Never mark a page `"use client"`. The only client island on
   diner pages is `LanguagePicker` (suggested language, search, `ms-lang` cookie, `menu_view` beacon).
   The written dish story is a plain `<details>`. (If films return: a lazy `StoryPlayer` island.) Mutations are Server Actions
   that call `requireStaff()` first.
4. **Films (dormant add-on).** If re-enabled: lazy player, never preload video, poster first, fall back
   to the written story (`text_fallback`, which is now the primary story text).
5. **All media through `lib/media`.** API: `getUploadSignature()`, `imageUrl()`, `videoSources()`,
   `posterUrl()`. Only `lib/media/sign.server.ts` imports the `cloudinary` SDK; `next-cloudinary`
   (CldImage, upload widget) is imported only inside `lib/media`. Image fields store
   `{ provider, public_id }`, never URLs. Images are always `f_auto,q_auto`; video is adaptive HLS
   (`sp_auto`). Language-specific audio/dubbing is chosen *inside* `videoSources()` (v2) — don't
   assume audio tracks vs. per-language variants yet.
6. **Menu = static + ISR.** `/m/{slug}` (language screen) and `/m/{slug}/{lang}` (menu) are statically
   generated; admin edits and finished translations call `revalidateMenu(slug)`. No client-side data
   fetching, no spinners. `/r/{code}` is the permanent QR redirect (uses the `ms-lang` cookie when set);
   codes are never edited or reused. Diners never wait on live translation for a restaurant's enabled
   languages; other languages translate once on first request, then are cached.
7. **Performance budget:** menu visible < 2 s on throttled 4G (`npm run lhci`). Diner routes must
   not import motion libs (`motion`, Magic UI, Aceternity); diner motion is CSS-only.
8. **Analytics** are anonymous, fire-and-forget (`sendBeacon`), never block rendering.

## Text-to-speech and pre-visit links
- **Speech uses the diner's device voices** (Web Speech API; `components/diner/Speak.tsx`): free, no server call. Buttons are
  server-rendered `hidden`; an inline script (not a React client component) reveals only those whose language the device
  can speak (`lib/i18n/tts.ts` maps catalog codes to BCP-47 tags). Dish NAMES are pronounced in
  `restaurants.dish_name_language` (e.g. Italian for an English menu of Italian dishes), descriptions and stories in the
  page language. Buttons carry `suppressHydrationWarning` because the script un-hides them before hydration. No cloud TTS.
- **Pre-visit links:** `/m/{slug}` (or `/m/{slug}/{lang}`) is permanent and public; the admin QR tab has Copy-ready links
  and a booking message (`ShareLinks`, `menuAddress()`).

## Prices in other currencies
- A restaurant prices its menu in `restaurants.currency` (any of ~156 ISO currencies, `lib/currencies.ts`). On each diner page
  an approximate price in the **home currency of the page language** is shown under it ("≈ ₹1,921"), toggled per restaurant by
  `show_converted_prices` (default on). Language → currency is `lib/i18n/currency.ts` (a language is not a country: `en` → USD,
  `ar` → SAR, `eo` → none; same currency as the menu → nothing shown).
- Rates come from the free keyless `open.er-api.com` (`lib/currency/rates.ts`), fetched **server-side while the static page is
  generated** (cached ~6h by Next's data cache; the page itself revalidates hourly). Never from the browser (rule 6). Any failure
  just omits the approximate price. The footer carries the provider's required attribution (`lib/currency/attribution.ts`) plus
  the pair and date: no words, so nothing to translate. The stored price is never converted or changed.

## Menu admin forms
Dish/category dialogs scroll inside a fixed header and footer (`components/admin/DialogLayout.tsx`). Source-language fields come
first; translations are last, one language at a time (`TranslationsPanel`), because a restaurant can offer 100+ languages.
Text boxes keep raw input (`setLangRaw`); `langMapSchema` trims and drops blanks on the server. Do not trim per keystroke.

## Long lists (admin)
Any list that can grow past a screen uses the shared folding pattern in `components/admin/Collapsible.tsx`: `Collapsible`
(chevron header, count, actions that work while folded, body unmounted when folded), `useCollapsed` + `CollapseAll`, and
`useShowMore` / `ShowMoreButton` / `ShowMoreList` (reveal in steps; the last works from server components). Search force-opens
folded groups. Applied to: menu categories, the translation language checklist (by tier), offered-language status (needs
translating / complete), review & edit (per dish), glossary, theme gallery (by category), restaurants (by status), QR codes,
analytics rows. Preview uses one language `<select>`, not a button per language. Don't render one control per language.
The diner language screen is deliberately NOT folded: diners must see every offered language (search + suggested on top).

## Media (images only)
Uploads are fully signed, browser → Cloudinary directly (`lib/media/UploadButton.tsx`, the only place that
uses the upload widget). `/api/media/sign` (staff only) signs the widget's exact params after checking the
folder is the restaurant's own (`menu-stories/{restaurantId}/images`) and rejecting any param that could
redirect or transform uploads (`signWidgetParams`, tested). **No upload preset is needed or used.**
`lib/media/MediaImage.tsx` is a client wrapper around CldImage (next-cloudinary can't render in a server component).

## Analytics (anonymous, fire-and-forget)
Events: `menu_view`, `language_select`, `story_open` (+ dormant `story_play/complete`). Menu pages send them with an
inline `<script>` (`components/diner/AnalyticsBeacon.tsx`, not a React client component); the picker uses
`lib/analytics/client.ts`. Both use `sendBeacon` to `/api/events` (rate limited, validates the dish belongs to the
restaurant). Session id lives in sessionStorage; no cookies, no personal data. Dashboard: restaurant → Analytics.

## Theme: one file
`theme/theme.config.ts` is the single source of truth (light + dark palettes, fonts, type, radius,
density, shadows, motion, ornaments). Resolution: `theme.config.ts` < platform overrides (DB,
`/admin/theme`, shown as "House style") < the restaurant's chosen theme (`brand.theme_id`, `"preset:<id>"` or
`"custom:<id>"`) < the restaurant's own tweaks (`restaurants.brand` colours/fonts/theme). **Themes library:** 25
code presets in `lib/theme/presets.ts` (name + category: fine dining, trattoria & bistro, café, bakery & dessert,
bar & lounge, seafood & coastal, casual & street food, modern & minimal), built with `buildColors`
(`lib/theme/palette.ts`, keeps text readable; `tests/theme.presets.test.ts` enforces contrast, fonts and validity).
Staff can save unlimited named **custom themes** (platform collection `custom_themes`, `customThemes` in
`lib/db/platform.ts`; always stored as a complete Theme) at `/admin/themes`, or from any restaurant's Brand tab
("Save as custom theme"). A restaurant stores only the reference plus its diff, so editing a custom theme rebuilds
every menu using it (`revalidateThemeUsers`); a custom theme in use cannot be deleted. Fonts live in
`lib/theme/fonts.ts` (19 self-hosted variable fonts; add one = install `@fontsource-variable/x`, add to the catalog and `scripts/copy-fonts.ts`, `npm run fonts`). Pure logic is in `lib/theme/*`
(`resolve` validates section-by-section so bad data falls back instead of breaking pages;
`css` emits CSS variables + at most **two** `@font-face` rules, `font-display: swap`). Tailwind
and shadcn tokens map to those variables in `app/globals.css`; never hard-code colours or fonts.
Mode: `<html data-mode="light|dark">`; absent = follow the OS (diner pages stay static/JS-free).
Aesthetic: rich, old-money Italian — parchment & bottle green / espresso & aged gold, hairline
brass rules, near-square radii, Cormorant Garamond + Jost, roman-numeral categories.

## Layout
- Root layouts via route groups: `app/(site)` splash, `app/(admin)/admin` staff app, and (Week 3) the
  language screen `m/[slug]` and menu `m/[slug]/[lang]` (separate roots so `<html lang dir>` is right
  without client JS). Each injects its own resolved theme.
- `components/ui` = shadcn (base-nova / Base UI) + Magic UI + Aceternity (added via the shadcn
  registries in `components.json`). Admin-only motion components; never in diner routes.
- `lib/db/models/index.ts` has all Mongoose schemas, typed loosely on purpose (precise inference
  makes `tsc` run out of memory).

## Commands (npm)
`npm run dev` · `typecheck` · `lint` · `test` (uses throwaway DB `menu_stories_test`) ·
`seed` (demo restaurant `casa-valdarno`: 10 dishes, glossary) · `translate -- --slug X [--langs hi,ar] [--force]` ·
`quality [-- --langs hi,ar --engines strong]` (language/engine scorecard + HTML report in `reports/`) ·
`create-admin` · `fonts` · `lhci` (Lighthouse CI; needs `CHROME_PATH`) · `smoke` (end-to-end: QR → language → menu → story → admin analytics) · `vocab:export`

## Env (see `.env.example`; real values only in gitignored `.env.local`)
`MONGODB_URI`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST`, `APP_URL` (encoded into QR codes —
permanent once printed), `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET/UPLOAD_PRESET`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `TRANSLATION_PROVIDER`, `MISTRAL_API_KEY`, `MISTRAL_MODEL`,
`MISTRAL_MODEL_STRONG`, `DEEPL_API_KEY` (":fx" suffix = free plan), optional `DEEPL_CONCURRENCY` (default 5; the free plan 429s above ~8),
`TRANSLATION_CONCURRENCY`, optional `TRANSLATION_JUDGE_MODEL` (quality script only). `NEXT_PUBLIC_CLOUDINARY_*` are derived in `next.config.ts`.
`demo/…` public ids resolve to Cloudinary's public demo cloud (seed + placeholders).

## Gotchas (Next 16.3 / this stack)
- `proxy.ts` replaces `middleware.ts`; `params` and `searchParams` are Promises.
- `revalidateTag(tag, { expire: 0 })` needs the 2nd argument.
- Base UI buttons: `render={<Link/>}` requires `nativeButton={false}`.
- React 19 resets uncontrolled forms after an action; return values you need to keep.
- Display serifs draw "1" like "I": use `.font-numeric` for big figures.
- Auth.js v5 beta: JWT type augmentation is `declare module "@auth/core/jwt"`.
- **Revalidation:** only LITERAL page paths invalidate static pages here (`revalidatePath('/m/x/en')`);
  layout-type and `[slug]` pattern forms silently do nothing (verified with the `x-nextjs-cache` header on a
  production build). Use `await revalidateMenu(restaurantId)` (`lib/revalidate.ts`), which invalidates the language
  screen plus one page per language the restaurant has. `revalidatePlatformTheme()` does it for every restaurant.
  Dev never caches, so this only shows up in `npm run build && npm run start`.
- Folders starting with `_` are private in the App Router (not routed).
- Production Next prefetches every visible link, so Playwright `networkidle` never settles on admin pages.
- Mistral on this key rate-limits quickly (429): `mistralChat` backs off honouring `Retry-After`;
  keep `TRANSLATION_CONCURRENCY` low. Truncated JSON → batch is split and retried.
