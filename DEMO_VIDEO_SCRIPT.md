# Demo video script: menu-stories (90 seconds)

**Demo restaurant:** The Corner Kitchen (`/m/the-corner-kitchen`), an ordinary neighbourhood restaurant with 4 sections × 4 everyday
dishes (Starters, Mains, Desserts, Drinks), prices in pounds, every dish with a written story.
**Length:** 90 s hard cap · **Narration:** 136 words (about 60 s of speech, the rest is deliberate pauses so the viewer *hears* the
speaker button and *sees* the video start) · **Format:** phone-screen recordings for the guest scenes (9:16 inside a 16:9 frame), desktop
recordings for the two admin scenes.

The one-line pitch the video proves: **a guest scans a QR code and reads the whole menu in their own language, hears it, and watches it,
and the restaurant set it all up in a few clicks and a brand of its own.**

---

## 1. Before you record (do these once)

| # | Do this | Why |
|---|---|---|
| 1 | **Deploy the latest code** (commit + push, wait for the Vercel build) and record against `https://menu-stories.vercel.app`, not `localhost`. | The card layout, story videos and story editor are not on production yet. A localhost QR code can't be scanned by a phone, and the dev server shows a corner badge and is slow on first load. |
| 2 | **Warm every page once** (open each language, each section, the admin tabs) a minute before recording. | First visits can take several seconds; you don't want that on camera. |
| 3 | **Add the 16 story videos** (see §5): paste each unlisted YouTube link into the dish's *Story → Story video* field, or into `VIDEOS` in `scripts/seed-demo.ts` and run `npm run seed:demo`. | The video scene needs real links. Only the dish you open on camera needs one (**Fish and Chips** in scene 4), but the pitch is "every dish". |
| 4 | **Upload dish photos** (landscape 4:3, at least 1200 × 900) and a **logo** on the *Brand* tab. | The demo data has no photos or logo: cards with photos on top are the hero shot. |
| 5 | **Check device voices on the recording device**: open the console and run `speechSynthesis.getVoices().filter(v => /^(en\|hi)/.test(v.lang))`. You need a Hindi voice (`hi-IN`) and an English one. | The speaker buttons only appear when the device can speak that language (iPhone/Android: usually yes; Windows/macOS: install the Hindi voice; Linux Chrome: often none, so don't record there). |
| 6 | Set the phone's language to **Hindi** (or a browser profile with Hindi first). | That is what makes Hindi the suggested language on the language screen. |
| 7 | Leave the restaurant on the **House style** (it starts that way) so the theme change in scene 6 is a visible before/after. | |
| 8 | Show the QR code from the admin: *Restaurants → The Corner Kitchen → QR codes → "Demo table" → PNG*. Put it on a second screen or print it. | Scene 1 is a real scan. The direct link is `/r/6q5ba5` if the scan fails. |

**Already done by the seed script:** the restaurant (live), 16 dishes with descriptions, "what to expect" lines, allergens, dietary tags and
spice, 16 written stories, and the menu **fully translated into Hindi, Japanese, Arabic, French, Spanish and German** (nothing left in English).
Prices are in £, so the Hindi page shows "≈ ₹…" under each one and the Arabic page shows riyals.

> Hindi is labelled *experimental* in our language table, so its pages carry a small "Machine translated, may be inaccurate" note. That's
> the product being honest; keep it in shot, or demonstrate Japanese/French/German (no note) if you'd rather not draw attention to it.

---

## 2. The script (timed)

| Time | On screen | Action | Narration |
|---|---|---|---|
| **0:00 – 0:10**<br>*Scan & choose* | Phone, full screen | Camera scans the QR → the language screen opens with **हिन्दी suggested at the top** → tap it. Menu loads on **"आज क्या खाने का मन है?"** with four folded section rows (Starters, Mains, Desserts, Drinks). | "Scan the table QR code. Their language is already suggested. One tap, and the whole menu is in Hindi." |
| **0:10 – 0:25**<br>*Meaning, not just words* | Phone | Tap **Starters**: the four cards open. Slow scroll to **Chicken Wings**: show **£8 ≈ ₹…**, the Hindi description, the "what to expect" line, the spice chip and the allergen chips. Tap **Desserts**, then use **Change language** and pick **Arabic**: the page flips right to left. | "Prices in rupees. Allergens from a fixed, hand-checked vocabulary, never a machine's guess. Original dish names stay, so ordering is easy. And Arabic flips right to left." |
| **0:25 – 0:40**<br>*Hear it in its own language* | Phone, then close-up | Back to Hindi, open **Mains**. Tap the **speaker next to "Fish and Chips"** (an English voice says the name), then the **speaker under the description**: a Hindi voice reads it. **Pause the narration for the ~4 s of audio.** | "Tap the speaker, and the dish is read aloud in the guest's own language, so they know exactly what they're ordering." |
| **0:40 – 0:55**<br>*Every dish has a story* | Phone | Still in **Mains → Fish and Chips → "कहानी"**. The story opens with its title and text and a **16:9 video poster with a play button**. Tap play: the short video starts inside the menu. **Let it play ~3 s with its own sound.** | "Every dish has a story, in words and in a short video that plays right inside the menu. Nothing loads until the guest taps." |
| **0:55 – 1:10**<br>*One click, every language* | Desktop | Admin → **The Corner Kitchen → Translations**. Scroll the checklist (Well supported / Experimental). **Keep the seven already-ticked languages ticked** (Generate sets the offered list to exactly what is ticked), tick one new language (e.g. Portuguese), press **Generate**, confirm. A real translation takes about 20–30 s and about 5,000 characters, so cut or speed-ramp it. Cut to the language status list showing it "Complete". (Pressing Generate with only the seven already ticked makes **no API call** and is the free, instant fallback.) | "Behind the scenes, write the menu once. Tick your languages, press Generate. It's translated, saved, and fully editable." |
| **1:10 – 1:25**<br>*It looks like you* | Desktop → phone | Admin → **Brand**. Scroll the theme gallery (25 themes by venue type), click a preset that suits a friendly neighbourhood place (e.g. **Flat White** or **Burger Joint**), tweak one colour and drop in the logo, **Save theme**. Cut to the phone menu: new palette, fonts and logo. | "And it looks like you. Twenty-five ready-made themes, or build your own. Colours, fonts, logo. Every restaurant, its own brand." |
| **1:25 – 1:30**<br>*Close* | Logo end-card | menu-stories wordmark over the themed menu in Hindi. Caption: **104 languages · speech · stories · your brand.** | "menu-stories. Every guest, in their own language." |

### Clean narration (read straight through, 136 words)

> Scan the table QR code. Their language is already suggested. One tap, and the whole menu is in Hindi.
>
> Prices in rupees. Allergens from a fixed, hand-checked vocabulary, never a machine's guess. Original dish names stay, so ordering is easy. And Arabic flips right to left.
>
> Tap the speaker, and the dish is read aloud in the guest's own language, so they know exactly what they're ordering.
>
> Every dish has a story, in words and in a short video that plays right inside the menu. Nothing loads until the guest taps.
>
> Behind the scenes, write the menu once. Tick your languages, press Generate. It's translated, saved, and fully editable.
>
> And it looks like you. Twenty-five ready-made themes, or build your own. Colours, fonts, logo. Every restaurant, its own brand.
>
> menu-stories. Every guest, in their own language.

### On-screen captions (3-4 words each, lower third)

`Scan → your language` · `Allergens: never guessed` · `Read aloud in Hindi` · `A story for every dish` · `104 languages, one click` · `Your brand, your theme` · `menu-stories`

---

## 3. Recording notes

- **Order of shooting ≠ order of the video.** Shoot all phone scenes in one sitting (so the language, voices and theme are consistent), then the admin scenes. Shoot the **Brand** scene last, because it changes how the menu looks, and record the phone "after" shot immediately after saving.
- **Audio:** record the speaker and story-video audio *clean* (system audio or the phone's own mic in a quiet room) and mix the narration **under** them. Duck the narration for ~4 s at 0:30 and ~3 s at 0:47.
- **Screen size:** phone scenes at 390 × 844 (iPhone 14-ish) at 2× scale. If you use desktop Chrome, use DevTools device mode with that size.
- **Hindi note** (see §1): either keep it or use Japanese for the language scene and keep Hindi only for the speech scene.
- **Cutting to 60 s:** drop the Arabic flip (scene 2), the theme tweak and logo step (scene 6: just click a preset), and play only the first 2 s of the video.
- **If the language screen doesn't suggest Hindi:** the browser's preferred languages decide it. Add Hindi first in browser settings, or just tap हिन्दी in the list.

## 4. If something goes wrong on the day

| Problem | Fix |
|---|---|
| No speaker buttons | The device has no voice for that language (checklist item 5). Use a phone, or install the voices. |
| A video won't play | The link must be **Unlisted** (not Private) and embedding must be allowed in YouTube Studio → Video → Advanced settings → *Allow embedding*. |
| A page is slow the first time | Warm it (checklist item 2) or record on the production site, not `npm run dev`. |
| Worried about spending DeepL characters on camera | The confirm dialog shows the character count before anything runs; a new language is about 5,000 characters. Pressing Generate with only the seven already-translated languages ticked spends nothing. |
| Want to reset the demo | `npm run seed:demo -- --reset --translate hi,ja,ar,fr,es,de` rebuilds the dishes and stories and re-translates (about 31,000 DeepL characters, and it **removes dish photos and videos**). |

## 5. Story-video shot list (one 10–20 s horizontal clip per dish)

Upload each as **Unlisted** to YouTube, 16:9 (a vertical Short will be letter-boxed), and paste the link in the dish's *Story → Story video* field.

| Section | Dish | Clip idea |
|---|---|---|
| Starters | Tomato Soup | Soup poured into the bowl; bread dipped in |
| | Chicken Wings | Wings tossed in hot sauce; a dip into the blue cheese |
| | Garlic Bread with Cheese | Cheese bubbling, then a slice pulled apart |
| | Caesar Salad | Dressing drizzled; Parmesan shaved over |
| Mains | Fish and Chips | Batter crackling as it comes out of the fryer; lemon squeezed |
| | Cheeseburger and Chips | Cheese melting on the patty; the burger pressed together |
| | Roast Chicken Dinner | Gravy poured over the plate |
| | Vegetable Curry with Rice | Curry spooned over steaming rice |
| Desserts | Apple Crumble and Custard | Custard poured over the crumble |
| | Chocolate Brownie | A spoon breaking into the gooey middle; ice cream melting |
| | Sticky Toffee Pudding | Toffee sauce poured over the sponge |
| | Vanilla Ice Cream | Three scoops going into the bowl; wafer added |
| Drinks | Pot of Tea | Tea poured from the pot; milk swirling in |
| | Filter Coffee | Coffee dripping into the jug, then poured |
| | Fresh Orange Juice | Oranges halved and squeezed into the glass |
| | Homemade Lemonade | Ice, lemon and mint going into the glass; sparkling water poured |

> The video's own sound is part of the shot. If the clip has no audio, keep it to 4-5 s and let the narration carry it.
