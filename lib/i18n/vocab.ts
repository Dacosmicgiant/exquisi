/**
 * FIXED VOCABULARY — never machine translated.
 *
 * Allergens, dietary tags, spice levels and the handful of UI strings that matter for safety
 * are hand-written per language and shipped as data. A language without an entry falls back to
 * English labels (never to machine translation).
 *
 * ⚠ These are DRAFTS. Every language is marked `reviewed: false` except English until a native
 * speaker signs it off. Run `npm run vocab:export` for a CSV to send to reviewers, then flip the
 * language into REVIEWED below. Do not show a pilot restaurant a language that is not reviewed.
 *
 * Format per language: 4 groups separated by ";", items separated by "|":
 *   allergens(14) ; dietary(5) ; spice(3) ; ui(7)
 * Allergen order:  gluten|crustaceans|eggs|fish|peanuts|soy|milk|nuts|celery|mustard|sesame|sulphites|lupin|molluscs
 * Dietary order:   vegetarian|vegan|contains_pork|contains_beef|contains_alcohol
 * Spice order:     mild|medium|hot
 * UI order:        story|machine|experimental|changeLanguage|allergens|askStaff|chooseLanguage
 */
import { ALLERGEN_KEYS, type AllergenKey } from "@/lib/allergens";
import { DIETARY_KEYS, type DietaryKey } from "@/lib/db/types";

export const UI_KEYS = ["story", "machine", "experimental", "changeLanguage", "allergens", "askStaff", "chooseLanguage"] as const;
export type UiKey = (typeof UI_KEYS)[number];

export type Vocab = {
  allergens: Record<AllergenKey, string>;
  dietary: Record<DietaryKey, string>;
  spice: [string, string, string];
  ui: Record<UiKey, string>;
};

const RAW: Record<string, string> = {
  en: "Gluten|Crustaceans|Eggs|Fish|Peanuts|Soy|Milk|Tree nuts|Celery|Mustard|Sesame|Sulphites|Lupin|Molluscs;Vegetarian|Vegan|Contains pork|Contains beef|Contains alcohol;Mild|Medium|Hot;The story|Machine translated|Machine translated, may be inaccurate|Change language|Allergens|Please tell your server about any allergies or dietary needs.|Choose your language",
  it: "Glutine|Crostacei|Uova|Pesce|Arachidi|Soia|Latte|Frutta a guscio|Sedano|Senape|Sesamo|Solfiti|Lupini|Molluschi;Vegetariano|Vegano|Contiene maiale|Contiene manzo|Contiene alcol;Delicato|Medio|Piccante;La storia|Tradotto automaticamente|Tradotto automaticamente, potrebbe contenere errori|Cambia lingua|Allergeni|Informi il personale di sala di eventuali allergie o esigenze alimentari.|Scegli la lingua",
  fr: "Gluten|Crustacés|Œufs|Poisson|Arachides|Soja|Lait|Fruits à coque|Céleri|Moutarde|Sésame|Sulfites|Lupin|Mollusques;Végétarien|Végétalien|Contient du porc|Contient du bœuf|Contient de l'alcool;Doux|Moyen|Fort;L'histoire|Traduit automatiquement|Traduit automatiquement, peut contenir des erreurs|Changer de langue|Allergènes|Veuillez signaler toute allergie ou régime alimentaire à votre serveur.|Choisissez votre langue",
  de: "Gluten|Krebstiere|Eier|Fisch|Erdnüsse|Soja|Milch|Schalenfrüchte|Sellerie|Senf|Sesam|Sulfite|Lupinen|Weichtiere;Vegetarisch|Vegan|Enthält Schweinefleisch|Enthält Rindfleisch|Enthält Alkohol;Mild|Mittel|Scharf;Die Geschichte|Maschinell übersetzt|Maschinell übersetzt, kann Fehler enthalten|Sprache ändern|Allergene|Bitte informieren Sie Ihre Bedienung über Allergien oder Ernährungswünsche.|Wählen Sie Ihre Sprache",
  es: "Gluten|Crustáceos|Huevos|Pescado|Cacahuetes|Soja|Leche|Frutos de cáscara|Apio|Mostaza|Sésamo|Sulfitos|Altramuces|Moluscos;Vegetariano|Vegano|Contiene cerdo|Contiene ternera|Contiene alcohol;Suave|Medio|Picante;La historia|Traducido automáticamente|Traducido automáticamente, puede contener errores|Cambiar idioma|Alérgenos|Informe a su camarero de cualquier alergia o necesidad dietética.|Elija su idioma",
  pt: "Glúten|Crustáceos|Ovos|Peixe|Amendoins|Soja|Leite|Frutos de casca rija|Aipo|Mostarda|Sésamo|Sulfitos|Tremoço|Moluscos;Vegetariano|Vegano|Contém porco|Contém carne de vaca|Contém álcool;Suave|Médio|Picante;A história|Traduzido automaticamente|Traduzido automaticamente, pode conter erros|Mudar de idioma|Alergénios|Informe o seu empregado de mesa sobre alergias ou necessidades alimentares.|Escolha o seu idioma",
  nl: "Gluten|Schaaldieren|Eieren|Vis|Pinda's|Soja|Melk|Noten|Selderij|Mosterd|Sesam|Sulfiet|Lupine|Weekdieren;Vegetarisch|Veganistisch|Bevat varkensvlees|Bevat rundvlees|Bevat alcohol;Mild|Medium|Pittig;Het verhaal|Automatisch vertaald|Automatisch vertaald, kan fouten bevatten|Taal wijzigen|Allergenen|Meld allergieën of dieetwensen aan uw bediening.|Kies uw taal",
  sv: "Gluten|Kräftdjur|Ägg|Fisk|Jordnötter|Soja|Mjölk|Nötter|Selleri|Senap|Sesam|Sulfiter|Lupin|Blötdjur;Vegetarisk|Vegansk|Innehåller fläsk|Innehåller nötkött|Innehåller alkohol;Mild|Medel|Stark;Berättelsen|Maskinöversatt|Maskinöversatt, kan innehålla fel|Byt språk|Allergener|Berätta för personalen om allergier eller kostbehov.|Välj ditt språk",
  da: "Gluten|Skaldyr|Æg|Fisk|Jordnødder|Soja|Mælk|Nødder|Selleri|Sennep|Sesam|Sulfitter|Lupin|Bløddyr;Vegetarisk|Vegansk|Indeholder svinekød|Indeholder oksekød|Indeholder alkohol;Mild|Medium|Stærk;Historien|Maskinoversat|Maskinoversat, kan indeholde fejl|Skift sprog|Allergener|Fortæl personalet om allergier eller kostbehov.|Vælg dit sprog",
  nb: "Gluten|Skalldyr|Egg|Fisk|Peanøtter|Soya|Melk|Nøtter|Selleri|Sennep|Sesam|Sulfitter|Lupin|Bløtdyr;Vegetarisk|Vegansk|Inneholder svinekjøtt|Inneholder storfekjøtt|Inneholder alkohol;Mild|Middels|Sterk;Historien|Maskinoversatt|Maskinoversatt, kan inneholde feil|Bytt språk|Allergener|Si fra til betjeningen om allergier eller kostholdsbehov.|Velg språk",
  ca: "Gluten|Crustacis|Ous|Peix|Cacauets|Soja|Llet|Fruits de closca|Api|Mostassa|Sèsam|Sulfits|Tramussos|Mol·luscs;Vegetarià|Vegà|Conté porc|Conté vedella|Conté alcohol;Suau|Mitjà|Picant;La història|Traduït automàticament|Traduït automàticament, pot contenir errors|Canvia d'idioma|Al·lèrgens|Informeu el cambrer de qualsevol al·lèrgia o necessitat dietètica.|Trieu el vostre idioma",
  fi: "Gluteeni|Äyriäiset|Kananmuna|Kala|Maapähkinä|Soija|Maito|Pähkinät|Selleri|Sinappi|Seesami|Sulfiitit|Lupiini|Nilviäiset;Kasvisruoka|Vegaaninen|Sisältää sianlihaa|Sisältää naudanlihaa|Sisältää alkoholia;Mieto|Keskivahva|Tulinen;Tarina|Konekäännös|Konekäännös, voi sisältää virheitä|Vaihda kieli|Allergeenit|Kerro tarjoilijalle allergioista tai ruokavaliosta.|Valitse kielesi",
  pl: "Gluten|Skorupiaki|Jaja|Ryby|Orzeszki ziemne|Soja|Mleko|Orzechy|Seler|Gorczyca|Sezam|Siarczyny|Łubin|Mięczaki;Wegetariańskie|Wegańskie|Zawiera wieprzowinę|Zawiera wołowinę|Zawiera alkohol;Łagodne|Średnie|Ostre;Historia|Tłumaczenie maszynowe|Tłumaczenie maszynowe, może zawierać błędy|Zmień język|Alergeny|Prosimy poinformować obsługę o alergiach lub potrzebach żywieniowych.|Wybierz język",
  cs: "Lepek|Korýši|Vejce|Ryby|Arašídy|Sója|Mléko|Skořápkové plody|Celer|Hořčice|Sezam|Siřičitany|Vlčí bob|Měkkýši;Vegetariánské|Veganské|Obsahuje vepřové|Obsahuje hovězí|Obsahuje alkohol;Mírné|Středně pálivé|Pálivé;Příběh|Strojově přeloženo|Strojově přeloženo, může obsahovat chyby|Změnit jazyk|Alergeny|Informujte obsluhu o alergiích nebo dietních potřebách.|Vyberte jazyk",
  sk: "Lepok|Kôrovce|Vajcia|Ryby|Arašidy|Sója|Mlieko|Orechy|Zeler|Horčica|Sezam|Siričitany|Vlčí bôb|Mäkkýše;Vegetariánske|Vegánske|Obsahuje bravčové|Obsahuje hovädzie|Obsahuje alkohol;Jemné|Stredne ostré|Ostré;Príbeh|Strojovo preložené|Strojovo preložené, môže obsahovať chyby|Zmeniť jazyk|Alergény|Informujte obsluhu o alergiách alebo diétnych potrebách.|Vyberte jazyk",
  hu: "Glutén|Rákfélék|Tojás|Hal|Földimogyoró|Szója|Tej|Diófélék|Zeller|Mustár|Szezám|Szulfitok|Csillagfürt|Puhatestűek;Vegetáriánus|Vegán|Sertéshúst tartalmaz|Marhahúst tartalmaz|Alkoholt tartalmaz;Enyhe|Közepes|Csípős;A történet|Gépi fordítás|Gépi fordítás, hibákat tartalmazhat|Nyelv váltása|Allergének|Kérjük, jelezze a felszolgálónak allergiáját vagy étrendi igényeit.|Válasszon nyelvet",
  ro: "Gluten|Crustacee|Ouă|Pește|Arahide|Soia|Lapte|Fructe cu coajă|Țelină|Muștar|Susan|Sulfiți|Lupin|Moluște;Vegetarian|Vegan|Conține carne de porc|Conține carne de vită|Conține alcool;Ușor|Mediu|Iute;Povestea|Tradus automat|Tradus automat, poate conține erori|Schimbă limba|Alergeni|Vă rugăm să informați personalul despre alergii sau nevoi alimentare.|Alegeți limba",
  hr: "Gluten|Rakovi|Jaja|Riba|Kikiriki|Soja|Mlijeko|Orašasti plodovi|Celer|Gorušica|Sezam|Sulfiti|Lupina|Mekušci;Vegetarijansko|Veganski|Sadrži svinjetinu|Sadrži govedinu|Sadrži alkohol;Blago|Srednje|Ljuto;Priča|Strojni prijevod|Strojni prijevod, može sadržavati pogreške|Promijeni jezik|Alergeni|Obavijestite osoblje o alergijama ili prehrambenim potrebama.|Odaberite jezik",
  bg: "Глутен|Ракообразни|Яйца|Риба|Фъстъци|Соя|Мляко|Ядки|Целина|Горчица|Сусам|Сулфити|Лупина|Мекотели;Вегетарианско|Веганско|Съдържа свинско|Съдържа телешко|Съдържа алкохол;Леко|Средно|Люто;Историята|Машинен превод|Машинен превод, може да съдържа грешки|Смяна на езика|Алергени|Моля, съобщете на сервитьора за алергии или хранителни нужди.|Изберете език",
  el: "Γλουτένη|Καρκινοειδή|Αυγά|Ψάρι|Αράπικα φιστίκια|Σόγια|Γάλα|Ξηροί καρποί|Σέλινο|Μουστάρδα|Σουσάμι|Θειώδη|Λούπινο|Μαλάκια;Χορτοφαγικό|Βίγκαν|Περιέχει χοιρινό|Περιέχει βοδινό|Περιέχει αλκοόλ;Ήπιο|Μέτριο|Πικάντικο;Η ιστορία|Αυτόματη μετάφραση|Αυτόματη μετάφραση, μπορεί να περιέχει λάθη|Αλλαγή γλώσσας|Αλλεργιογόνα|Ενημερώστε το προσωπικό για αλλεργίες ή διατροφικές ανάγκες.|Επιλέξτε γλώσσα",
  tr: "Gluten|Kabuklu deniz ürünleri|Yumurta|Balık|Yer fıstığı|Soya|Süt|Sert kabuklu yemişler|Kereviz|Hardal|Susam|Sülfitler|Acı bakla|Yumuşakçalar;Vejetaryen|Vegan|Domuz eti içerir|Sığır eti içerir|Alkol içerir;Hafif|Orta|Acı;Hikâye|Makine çevirisi|Makine çevirisi, hatalar içerebilir|Dili değiştir|Alerjenler|Alerji veya diyet ihtiyaçlarınızı lütfen garsona bildirin.|Dilinizi seçin",
  ru: "Глютен|Ракообразные|Яйца|Рыба|Арахис|Соя|Молоко|Орехи|Сельдерей|Горчица|Кунжут|Сульфиты|Люпин|Моллюски;Вегетарианское|Веганское|Содержит свинину|Содержит говядину|Содержит алкоголь;Мягкое|Средней остроты|Острое;История|Машинный перевод|Машинный перевод, возможны неточности|Сменить язык|Аллергены|Сообщите официанту об аллергиях или диетических потребностях.|Выберите язык",
  uk: "Глютен|Ракоподібні|Яйця|Риба|Арахіс|Соя|Молоко|Горіхи|Селера|Гірчиця|Кунжут|Сульфіти|Люпин|Молюски;Вегетаріанське|Веганське|Містить свинину|Містить яловичину|Містить алкоголь;М'яке|Середньої гостроти|Гостре;Історія|Машинний переклад|Машинний переклад, можливі неточності|Змінити мову|Алергени|Повідомте офіціанта про алергії чи дієтичні потреби.|Оберіть мову",
  ar: "الغلوتين|القشريات|البيض|السمك|الفول السوداني|الصويا|الحليب|المكسرات|الكرفس|الخردل|السمسم|الكبريتات|الترمس|الرخويات;نباتي|نباتي صرف (فيغان)|يحتوي على لحم الخنزير|يحتوي على لحم البقر|يحتوي على كحول;خفيف|متوسط|حار;القصة|ترجمة آلية|ترجمة آلية، وقد تحتوي على أخطاء|تغيير اللغة|مسببات الحساسية|يرجى إبلاغ النادل بأي حساسية أو احتياجات غذائية.|اختر لغتك",
  he: "גלוטן|סרטנים|ביצים|דגים|בוטנים|סויה|חלב|אגוזים|סלרי|חרדל|שומשום|סולפיטים|תורמוס|רכיכות;צמחוני|טבעוני|מכיל בשר חזיר|מכיל בשר בקר|מכיל אלכוהול;מתון|בינוני|חריף;הסיפור|תרגום אוטומטי|תרגום אוטומטי, עשוי להכיל טעויות|החלפת שפה|אלרגנים|אנא ספרו למלצר על אלרגיות או צרכים תזונתיים.|בחרו שפה",
  hi: "ग्लूटेन|क्रस्टेशियन (कवचधारी जीव)|अंडे|मछली|मूंगफली|सोया|दूध|मेवे (ट्री नट्स)|अजवाइन (सेलेरी)|सरसों|तिल|सल्फाइट|ल्यूपिन|मोलस्क (सीप-घोंघा आदि);शाकाहारी|वीगन|इसमें सूअर का मांस है|इसमें गोमांस है|इसमें शराब है;हल्का तीखा|मध्यम तीखा|बहुत तीखा;कहानी|मशीन अनुवाद|मशीन अनुवाद, इसमें त्रुटियाँ हो सकती हैं|भाषा बदलें|एलर्जन|कृपया किसी भी एलर्जी या खान-पान संबंधी ज़रूरत के बारे में वेटर को बताएँ।|अपनी भाषा चुनें",
  bn: "গ্লুটেন|ক্রাস্টেসিয়ান (খোলসযুক্ত প্রাণী)|ডিম|মাছ|চিনাবাদাম|সয়া|দুধ|বাদাম জাতীয় ফল|সেলারি|সরিষা|তিল|সালফাইট|লুপিন|মলাস্ক (শামুক-ঝিনুক জাতীয়);নিরামিষ|ভেগান|শূকরের মাংস আছে|গরুর মাংস আছে|অ্যালকোহল আছে;হালকা ঝাল|মাঝারি ঝাল|তীব্র ঝাল;গল্প|যান্ত্রিক অনুবাদ|যান্ত্রিক অনুবাদ, ভুল থাকতে পারে|ভাষা পরিবর্তন|অ্যালার্জেন|অনুগ্রহ করে অ্যালার্জি বা খাদ্যসংক্রান্ত প্রয়োজনের কথা ওয়েটারকে জানান।|আপনার ভাষা বেছে নিন",
  mr: "ग्लूटेन|कवचधारी प्राणी (क्रस्टेशियन)|अंडी|मासे|शेंगदाणे|सोया|दूध|सुका मेवा (ट्री नट्स)|सेलेरी|मोहरी|तीळ|सल्फाइट|ल्युपिन|मृदुकाय प्राणी (मोलस्क);शाकाहारी|वीगन|डुकराचे मांस आहे|गोमांस आहे|मद्य आहे;सौम्य तिखट|मध्यम तिखट|जहाल तिखट;कथा|यांत्रिक भाषांतर|यांत्रिक भाषांतर, त्यात चुका असू शकतात|भाषा बदला|ऍलर्जन|कृपया कोणत्याही ऍलर्जी किंवा आहारविषयक गरजांबद्दल वेटरला सांगा.|तुमची भाषा निवडा",
  ta: "குளுட்டன்|ஓடுடைய கடல் உயிரினங்கள்|முட்டை|மீன்|நிலக்கடலை|சோயா|பால்|கொட்டை வகைகள்|செலரி|கடுகு|எள்|சல்பைட்|லூபின்|மெல்லுடலிகள்;சைவம்|வீகன்|பன்றி இறைச்சி உள்ளது|மாட்டிறைச்சி உள்ளது|மதுபானம் உள்ளது;லேசான காரம்|நடுத்தர காரம்|அதிக காரம்;கதை|இயந்திர மொழிபெயர்ப்பு|இயந்திர மொழிபெயர்ப்பு, பிழைகள் இருக்கலாம்|மொழியை மாற்று|ஒவ்வாமைப் பொருட்கள்|ஒவ்வாமை அல்லது உணவுத் தேவைகள் இருந்தால் பணியாளரிடம் தெரிவிக்கவும்.|உங்கள் மொழியைத் தேர்வு செய்யுங்கள்",
  te: "గ్లూటెన్|క్రస్టేషియన్లు (గవ్వ జీవులు)|గుడ్లు|చేప|వేరుశెనగ|సోయా|పాలు|గింజలు|సెలెరీ|ఆవాలు|నువ్వులు|సల్ఫైట్లు|ల్యూపిన్|మొలస్క్‌లు;శాకాహారం|వీగన్|పంది మాంసం ఉంది|గొడ్డు మాంసం ఉంది|మద్యం ఉంది;తక్కువ కారం|మధ్యస్థ కారం|ఎక్కువ కారం;కథ|యంత్ర అనువాదం|యంత్ర అనువాదం, తప్పులు ఉండవచ్చు|భాష మార్చండి|అలెర్జీ కారకాలు|అలెర్జీలు లేదా ఆహార అవసరాల గురించి దయచేసి వెయిటర్‌కు చెప్పండి.|మీ భాషను ఎంచుకోండి",
  ur: "گلوٹین|کرسٹیشین (خول دار آبی جانور)|انڈے|مچھلی|مونگ پھلی|سویا|دودھ|گری دار میوے|اجوائن (سیلری)|رائی|تل|سلفائٹس|لیوپن|مولسکس (نرم جسم والے آبی جانور);سبزی خور|ویگن|اس میں سور کا گوشت ہے|اس میں بڑے کا گوشت ہے|اس میں الکحل ہے;ہلکا تیز|درمیانہ تیز|بہت تیز;کہانی|مشینی ترجمہ|مشینی ترجمہ، غلطیاں ہو سکتی ہیں|زبان تبدیل کریں|الرجی پیدا کرنے والے اجزاء|براہِ کرم کسی بھی الرجی یا غذائی ضرورت کے بارے میں ویٹر کو بتائیں۔|اپنی زبان منتخب کریں",
  id: "Gluten|Krustasea|Telur|Ikan|Kacang tanah|Kedelai|Susu|Kacang pohon|Seledri|Mustard|Wijen|Sulfit|Lupin|Moluska;Vegetarian|Vegan|Mengandung babi|Mengandung daging sapi|Mengandung alkohol;Ringan|Sedang|Pedas;Kisahnya|Diterjemahkan otomatis|Diterjemahkan otomatis, mungkin tidak akurat|Ganti bahasa|Alergen|Mohon beri tahu pelayan jika Anda memiliki alergi atau kebutuhan diet.|Pilih bahasa Anda",
  ms: "Gluten|Krustasea|Telur|Ikan|Kacang tanah|Soya|Susu|Kekacang pokok|Saderi|Mustard|Bijan|Sulfit|Lupin|Moluska;Vegetarian|Vegan|Mengandungi babi|Mengandungi daging lembu|Mengandungi alkohol;Ringan|Sederhana|Pedas;Kisahnya|Diterjemah secara automatik|Diterjemah secara automatik, mungkin tidak tepat|Tukar bahasa|Alergen|Sila maklumkan pelayan tentang sebarang alahan atau keperluan diet.|Pilih bahasa anda",
  th: "กลูเตน|สัตว์น้ำมีเปลือก (กุ้ง ปู)|ไข่|ปลา|ถั่วลิสง|ถั่วเหลือง|นม|ถั่วเปลือกแข็ง|คื่นฉ่าย|มัสตาร์ด|งา|ซัลไฟต์|ลูพิน|หอยและหมึก;มังสวิรัติ|วีแกน|มีเนื้อหมู|มีเนื้อวัว|มีแอลกอฮอล์;เผ็ดน้อย|เผ็ดปานกลาง|เผ็ดมาก;เรื่องราว|แปลโดยเครื่อง|แปลโดยเครื่อง อาจไม่ถูกต้อง|เปลี่ยนภาษา|สารก่อภูมิแพ้|โปรดแจ้งพนักงานหากคุณมีอาการแพ้หรือข้อจำกัดด้านอาหาร|เลือกภาษาของคุณ",
  vi: "Gluten|Động vật giáp xác|Trứng|Cá|Đậu phộng|Đậu nành|Sữa|Các loại hạt|Cần tây|Mù tạt|Mè|Sunfit|Đậu lupin|Động vật thân mềm;Món chay|Món thuần chay|Có thịt heo|Có thịt bò|Có cồn;Cay nhẹ|Cay vừa|Rất cay;Câu chuyện|Dịch tự động|Dịch tự động, có thể không chính xác|Đổi ngôn ngữ|Chất gây dị ứng|Vui lòng báo nhân viên nếu bạn bị dị ứng hoặc có nhu cầu ăn uống đặc biệt.|Chọn ngôn ngữ của bạn",
  zh: "麸质|甲壳类|蛋|鱼|花生|大豆|牛奶|坚果|芹菜|芥末|芝麻|亚硫酸盐|羽扇豆|软体动物;素食|纯素|含猪肉|含牛肉|含酒精;微辣|中辣|重辣;故事|机器翻译|机器翻译，可能不准确|切换语言|过敏原|如有过敏或饮食需求，请告知服务员。|选择您的语言",
  "zh-Hant": "麩質|甲殼類|蛋|魚|花生|大豆|牛奶|堅果|芹菜|芥末|芝麻|亞硫酸鹽|羽扇豆|軟體動物;素食|純素|含豬肉|含牛肉|含酒精;微辣|中辣|重辣;故事|機器翻譯|機器翻譯，可能不準確|切換語言|過敏原|如有過敏或飲食需求，請告知服務人員。|選擇您的語言",
  ja: "グルテン|甲殻類|卵|魚|落花生（ピーナッツ）|大豆|乳|木の実類|セロリ|からし|ごま|亜硫酸塩|ルピナス|軟体動物;ベジタリアン|ヴィーガン|豚肉を含む|牛肉を含む|アルコールを含む;ピリ辛|中辛|激辛;ストーリー|機械翻訳|機械翻訳のため不正確な場合があります|言語を変更|アレルゲン|アレルギーや食事制限がある場合は、スタッフにお知らせください。|言語を選択",
  ko: "글루텐|갑각류|달걀|생선|땅콩|대두|우유|견과류|셀러리|겨자|참깨|아황산염|루핀|연체동물;채식|비건|돼지고기 포함|소고기 포함|알코올 포함;순한 맛|중간 맛|매운 맛;이야기|기계 번역|기계 번역으로 부정확할 수 있습니다|언어 변경|알레르기 유발 성분|알레르기나 식이 제한이 있으시면 직원에게 알려 주세요.|언어를 선택하세요",
  fil: "Gluten|Crustacean|Itlog|Isda|Mani|Soya|Gatas|Mga mani at buto ng puno|Kintsay|Mustasa|Linga|Sulfites|Lupin|Molusko;Vegetarian|Vegan|May baboy|May baka|May alak;Banayad|Katamtaman|Maanghang;Ang kuwento|Isinalin ng makina|Isinalin ng makina, maaaring may mali|Palitan ang wika|Mga allergen|Pakisabi sa waiter kung may allergy o espesyal na pangangailangan sa pagkain.|Piliin ang iyong wika",
};

/** Languages whose labels a native speaker has signed off. Only English until reviewers respond. */
export const REVIEWED = new Set<string>(["en"]);

const shape = { allergens: ALLERGEN_KEYS.length, dietary: DIETARY_KEYS.length, spice: 3, ui: UI_KEYS.length };

function parse(code: string, raw: string): Vocab {
  const g = raw.split(";").map((x) => x.split("|"));
  if (g.length !== 4 || g[0].length !== shape.allergens || g[1].length !== shape.dietary || g[2].length !== 3 || g[3].length !== shape.ui) {
    throw new Error(`Vocabulary for "${code}" has the wrong shape`);
  }
  return {
    allergens: Object.fromEntries(ALLERGEN_KEYS.map((k, i) => [k, g[0][i]])) as Vocab["allergens"],
    dietary: Object.fromEntries(DIETARY_KEYS.map((k, i) => [k, g[1][i]])) as Vocab["dietary"],
    spice: [g[2][0], g[2][1], g[2][2]],
    ui: Object.fromEntries(UI_KEYS.map((k, i) => [k, g[3][i]])) as Vocab["ui"],
  };
}

const cache = new Map<string, Vocab>();
export const hasVocab = (lang: string) => lang in RAW;
export const vocabLanguages = () => Object.keys(RAW);

/** Labels for a language, or the English set when none is written yet (never machine translated). */
export function getVocab(lang: string): Vocab & { fallback: boolean; reviewed: boolean } {
  // a regional variant (pt-PT, es-419, fr-CA) uses its base language's hand-written labels
  const base = lang.split("-")[0];
  const code = hasVocab(lang) ? lang : hasVocab(base) && base !== "zh" ? base : "en";
  let v = cache.get(code);
  if (!v) {
    v = parse(code, RAW[code]);
    cache.set(code, v);
  }
  return { ...v, fallback: code === "en" && base !== "en", reviewed: REVIEWED.has(code) };
}

/** CSV for native-speaker review: one row per language and label. */
export function vocabCsv(): string {
  const en = getVocab("en");
  const rows: string[][] = [["language", "reviewed", "group", "key", "english", "label"]];
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  for (const code of vocabLanguages()) {
    const v = getVocab(code);
    const add = (group: string, key: string, english: string, label: string) =>
      rows.push([code, String(v.reviewed), group, key, english, label]);
    for (const k of ALLERGEN_KEYS) add("allergen", k, en.allergens[k], v.allergens[k]);
    for (const k of DIETARY_KEYS) add("dietary", k, en.dietary[k], v.dietary[k]);
    v.spice.forEach((s, i) => add("spice", ["mild", "medium", "hot"][i], en.spice[i], s));
    for (const k of UI_KEYS) add("ui", k, en.ui[k], v.ui[k]);
  }
  return rows.map((r) => r.map(q).join(",")).join("\n");
}
