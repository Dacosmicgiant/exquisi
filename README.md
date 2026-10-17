# menu-stories

A multilingual, story-rich menu sold as software, per restaurant location. A diner scans a table QR code,
picks a language on a small static screen, and reads the menu fully in that language, with written dish
stories, hand-written allergen labels and the original dish names always visible.

Built with Next.js 16 (App Router), MongoDB/Mongoose, Auth.js, Tailwind, shadcn/ui + Magic UI + Aceternity,
Cloudinary (images) and Mistral (translation). Architecture rules live in [CLAUDE.md](CLAUDE.md).

## Run it
```bash
npm install
cp .env.example .env.local        # fill in MongoDB, Cloudinary, Mistral and admin credentials
npm run create-admin              # the single staff login
npm run seed                      # demo restaurant: Casa Valdarno, 10 dishes, glossary, 2 QR codes
npm run translate -- --slug casa-valdarno
npm run dev                       # http://localhost:3000   admin: /admin
```

## Translation
The engine is DeepL (a dedicated translation API, not an LLM): put `DEEPL_API_KEY` in `.env.local`. `TRANSLATION_PROVIDER=mistral` is an optional LLM fallback.
In the admin: restaurant → Translations → **Generate translations** (or all supported / every language). It
translates the whole menu once, stores it, and you can edit any text. Diners only read saved text; editing a dish
makes no API call unless you switch on "Translate automatically".

## Checks
```bash
npm run typecheck && npm run lint && npm test
npm run build && npm run start
npm run smoke                     # end-to-end, needs the server above and CHROME_PATH (or Playwright browsers)
CHROME_PATH=/path/to/chrome npm run lhci   # Lighthouse, mobile, simulated slow 4G
npm run quality -- --langs hi,ar  # translation quality scorecard + side-by-side HTML report in reports/
npm run vocab:export              # allergen/UI labels for native-speaker review
```

## Before showing a restaurant
- Have native speakers review the allergen vocabulary (`lib/i18n/vocab.ts`) for every language you offer.
- Run `npm run quality` for each language you plan to sell and set its tier in `lib/i18n/languages.ts`.
- Set `APP_URL` to the final public domain **before printing QR codes**.
- Rotate any secrets that were pasted into chats or shared.
