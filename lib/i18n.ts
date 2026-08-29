/**
 * Language selection and interface strings.
 *
 * One choice, made once, governs the whole interface. The earlier build mixed
 * English and Hindi on the same screen, which is how a bilingual page reads to
 * someone who is fluent in exactly one of the two: half of it is noise. The
 * citizen picks a language before anything else and the site stays in it.
 *
 * The choice is kept in localStorage under `loksahay.lang` so it survives a
 * return visit, and mirrored to a cookie so the server can honour it later.
 */

import { EXTRA_TABLES } from "./i18n-tables";

export type LangCode =
  | "en" | "hi" | "bn" | "mr" | "ta" | "te" | "gu"
  | "kn" | "ml" | "pa" | "or" | "as" | "ur";

export type LangMeta = {
  code: LangCode;
  /** Name in the language itself. This is what a citizen scans for. */
  native: string;
  /** Name in English, for the second line of the tile. */
  english: string;
  /** BCP-47 tag handed to the speech and language models. */
  tag: string;
  /** CSS font stack variable to apply for this script. */
  script: "latin" | "deva" | "beng" | "guru" | "gujr" | "orya" | "taml" | "telu" | "knda" | "mlym" | "arab";
  dir: "ltr" | "rtl";
  /** Where it is most spoken. Helps people find their own row quickly. */
  where: string;
};

export const LANGUAGES: LangMeta[] = [
  { code: "hi", native: "हिन्दी", english: "Hindi", tag: "hi-IN", script: "deva", dir: "ltr", where: "उत्तर भारत" },
  { code: "en", native: "English", english: "English", tag: "en-IN", script: "latin", dir: "ltr", where: "All India" },
  { code: "bn", native: "বাংলা", english: "Bengali", tag: "bn-IN", script: "beng", dir: "ltr", where: "পশ্চিমবঙ্গ, ত্রিপুরা" },
  { code: "mr", native: "मराठी", english: "Marathi", tag: "mr-IN", script: "deva", dir: "ltr", where: "महाराष्ट्र" },
  { code: "te", native: "తెలుగు", english: "Telugu", tag: "te-IN", script: "telu", dir: "ltr", where: "ఆంధ్రప్రదేశ్, తెలంగాణ" },
  { code: "ta", native: "தமிழ்", english: "Tamil", tag: "ta-IN", script: "taml", dir: "ltr", where: "தமிழ்நாடு, புதுச்சேரி" },
  { code: "gu", native: "ગુજરાતી", english: "Gujarati", tag: "gu-IN", script: "gujr", dir: "ltr", where: "ગુજરાત" },
  { code: "kn", native: "ಕನ್ನಡ", english: "Kannada", tag: "kn-IN", script: "knda", dir: "ltr", where: "ಕರ್ನಾಟಕ" },
  { code: "ml", native: "മലയാളം", english: "Malayalam", tag: "ml-IN", script: "mlym", dir: "ltr", where: "കേരളം" },
  { code: "pa", native: "ਪੰਜਾਬੀ", english: "Punjabi", tag: "pa-IN", script: "guru", dir: "ltr", where: "ਪੰਜਾਬ" },
  { code: "or", native: "ଓଡ଼ିଆ", english: "Odia", tag: "or-IN", script: "orya", dir: "ltr", where: "ଓଡ଼ିଶା" },
  { code: "as", native: "অসমীয়া", english: "Assamese", tag: "as-IN", script: "beng", dir: "ltr", where: "অসম" },
  { code: "ur", native: "اردو", english: "Urdu", tag: "ur-IN", script: "arab", dir: "rtl", where: "جموں و کشمیر، تلنگانہ" },
];

export const DEFAULT_LANG: LangCode = "en";
export const STORAGE_KEY = "loksahay.lang";

export function langMeta(code: LangCode): LangMeta {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[1];
}

/* ------------------------------------------------------------------ */
/* Interface strings                                                   */
/* ------------------------------------------------------------------ */

/**
 * English is the source of record. Every other language holds the same keys.
 * A missing key falls back to English rather than rendering blank, so a
 * half-translated language still produces a usable page.
 */
const en = {
  /* language gate */
  "gate.title": "Choose your language",
  "gate.sub": "Everything after this, including the person who reads your grievance, will be in the language you pick. You can change it at any time from the top of the page.",
  "gate.continue": "Continue",
  "gate.note": "Your choice is saved on this device only.",

  /* utility strip and header */
  "top.skip": "Skip to main content",
  "top.help": "Help",
  "top.contact": "Contact us",
  "top.faq": "Questions people ask",
  "top.sitemap": "Site map",
  "top.textsize": "Text size",
  "top.contrast": "High contrast",
  "top.contrast.off": "Normal contrast",
  "top.language": "Language",

  "brand.name": "Loksahay",
  "brand.native": "लोकसहाय",
  "brand.tagline": "Public Grievance Assistance",
  "brand.line": "Loksahay assists citizens in lodging public grievances with the Ministry or Department concerned, and in following them through to disposal.",
  "brand.dept": "Public Grievance Assistance for Citizens of India",

  /* navigation */
  "nav.home": "Home",
  "nav.file": "Lodge a grievance",
  "nav.status": "Check status",
  "nav.directory": "Nodal officers",
  "nav.appeal": "Appeal authority",
  "nav.process": "How redress works",
  "nav.about": "About this service",
  "nav.cta": "Lodge a grievance",

  /* home */
  "home.h1": "Tell us what went wrong.",
  "home.h1.sub": "You do not need to know which ministry it belongs to. That is our work, not yours.",
  "home.box.title": "Describe your problem",
  "home.box.nologin": "Sign in with your mobile number",
  "home.placeholder": "My pension has not been credited for four months. I have been to the bank three times and nobody answers.",
  "home.speak": "Or say it out loud",
  "home.speak.sub": "Speak in Hindi, Marathi, Tamil and ten more. You do not have to type or to read.",
  "home.listening": "Listening. Please speak.",
  "home.continue": "Continue",
  "home.examples": "Not sure how to start? Try one of these",
  "home.trust.1": "Free of cost",
  "home.trust.1.sub": "No fee at any stage",
  "home.trust.2": "Reply within 21 days",
  "home.trust.2.sub": "The published timeline",
  "home.trust.3": "13 languages",
  "home.trust.3.sub": "Type or speak",
  "home.trust.4": "Secure sign in",
  "home.trust.4.sub": "Mobile number and a one time code",

  "home.tiles.title": "What would you like to do?",
  "home.tile.file": "Lodge a grievance",
  "home.tile.file.sub": "Takes about three minutes",
  "home.tile.status": "Check the status of a grievance",
  "home.tile.status.sub": "Your registration number is enough",
  "home.tile.directory": "Find the officer for your matter",
  "home.tile.directory.sub": "Nodal officers and appeal authorities",
  "home.tile.process": "Understand the redress process",
  "home.tile.process.sub": "What happens after you file",

  "home.excluded.title": "Matters not taken up as grievances",
  "home.excluded.sub": "If your matter is one of these, this portal cannot act on it. That does not mean nobody can. Each one has a proper channel, and we will take you to it.",
  "home.excluded.foot": "Not sure which applies to you? Describe your problem above. We will tell you in about twenty seconds, before you fill anything in.",

  /* the intake flow */
  "file.step.describe": "Describe",
  "file.step.confirm": "Confirm",
  "file.step.review": "Review",
  "file.step.verify": "Verify",
  "file.step.done": "Registered",

  "file.reassure.title": "You are not filling a form.",
  "file.reassure.body": "Answer in your own words. If you do not know an answer, say so and we will work around it. Nothing is submitted until you have read it and agreed.",
  "file.answer.label": "Your answer",
  "file.answer.placeholder": "Type your answer here",
  "file.send": "Send",
  "file.thinking": "Reading what you wrote",

  "file.confirm.h": "Is this the right office?",
  "file.confirm.sub": "You never had to pick a department. We worked it out from what you told us. All you do is check it.",
  "file.confirm.goes": "Goes to",
  "file.confirm.under": "Registered under",
  "file.confirm.details": "Details you gave",
  "file.confirm.yes": "Yes, that is correct",
  "file.confirm.no": "No, it is something else",

  "file.draft.h": "Read your grievance before it goes",
  "file.draft.sub": "We have written it in the form the department expects. These are your words. Change anything you wish.",
  "file.draft.label": "Your grievance",
  "file.draft.attach": "Add a photo of any letter, bill or receipt",
  "file.draft.attach.help": "A photograph from your phone is fine. The department only accepts a PDF, so we convert it for you.",
  "file.draft.submit": "This is correct, register it",

  "file.otp.h": "One last step: your mobile number",
  "file.otp.sub": "This is the first time we ask who you are. Nothing you have written is lost if you stop here. No account, no password, no captcha.",
  "file.otp.mobile": "Mobile number",
  "file.otp.send": "Send me a code",
  "file.otp.enter": "Enter the code",
  "file.otp.file": "Register my grievance",

  "file.done.h": "Registered. Here is what happens now.",
  "file.done.copy": "Copy",
  "file.done.copied": "Copied",
  "file.done.who": "With",
  "file.done.by": "They must respond by",
  "file.done.after": "If nothing happens by then",
  "file.done.track": "Track this grievance",

  /* status */
  "status.h1": "Check the status of a grievance",
  "status.sub": "Enter the registration number you were given, or pick one of your own below.",
  "status.label": "Registration number",
  "status.check": "Check status",
  "status.none": "We could not find a grievance with that number on this device.",

  /* directory */
  "dir.h1": "Nodal officers and appeal authorities",
  "dir.sub": "Every ministry, department, State and Union Territory has a named officer responsible for public grievances. If your matter is stuck, this is the person to contact and, after that, the authority you appeal to.",
  "dir.search": "Search by ministry, department, State or officer",
  "dir.tab.central": "Central ministries and departments",
  "dir.tab.state": "States and Union Territories",
  "dir.tab.appeal": "Appeal authorities",
  "dir.results": "results",
  "dir.call": "Call",
  "dir.email": "Email",
  "dir.copy": "Copy",
  "dir.empty": "No officer matched that search. Try the name of the ministry or the State.",

  /* process */
  "process.h1": "How redress works",
  "process.sub": "Six steps, and the timeline the government has published for each of them.",

  /* footer */
  "foot.quick": "Quick links",
  "foot.help": "Help and support",
  "foot.legal": "Terms and policy",
  "foot.helpline": "Grievance helpline",
  "foot.hours": "Monday to Friday, 9:00 AM to 5:30 PM",
  "foot.privacy": "Privacy",
  "foot.terms": "Terms of use",
  "foot.accessibility": "Accessibility statement",
  "foot.copyright": "Loksahay. Content owned and maintained by the Loksahay service team.",
  "foot.independent": "Loksahay is an independent public service and is not operated by the Government of India.",
  "foot.updated": "Last reviewed",
  "foot.browsers": "Best viewed in a current version of Chrome, Firefox, Edge or Safari. Works on a slow connection.",
} as const;

export type StringKey = keyof typeof en;

type Table = Partial<Record<StringKey, string>>;

const hi: Table = {
  "gate.title": "अपनी भाषा चुनिए",
  "gate.sub": "इसके बाद सब कुछ, आपकी शिकायत पढ़ने वाला अधिकारी भी, आपकी चुनी हुई भाषा में होगा। आप इसे कभी भी पृष्ठ के ऊपर से बदल सकते हैं।",
  "gate.continue": "आगे बढ़ें",
  "gate.note": "आपका चुनाव केवल इसी उपकरण पर सुरक्षित रखा जाता है।",

  "top.skip": "मुख्य विषय पर जाएँ",
  "top.help": "सहायता",
  "top.contact": "हमसे संपर्क करें",
  "top.faq": "अक्सर पूछे जाने वाले प्रश्न",
  "top.sitemap": "साइट मानचित्र",
  "top.textsize": "अक्षर का आकार",
  "top.contrast": "उच्च कंट्रास्ट",
  "top.contrast.off": "सामान्य कंट्रास्ट",
  "top.language": "भाषा",

  "brand.name": "लोकसहाय",
  "brand.native": "Loksahay",
  "brand.tagline": "जन शिकायत सहायता",
  "brand.line": "लोकसहाय नागरिकों को संबंधित मंत्रालय या विभाग में जन शिकायत दर्ज कराने और निपटान तक उसका अनुसरण करने में सहायता करता है।",
  "brand.dept": "भारत के नागरिकों के लिए जन शिकायत सहायता",

  "nav.home": "मुख्य पृष्ठ",
  "nav.file": "शिकायत दर्ज करें",
  "nav.status": "स्थिति देखें",
  "nav.directory": "नोडल अधिकारी",
  "nav.appeal": "अपील प्राधिकारी",
  "nav.process": "निवारण प्रक्रिया",
  "nav.about": "इस सेवा के बारे में",
  "nav.cta": "शिकायत दर्ज करें",

  "home.h1": "बताइए, क्या गड़बड़ हुई।",
  "home.h1.sub": "आपको यह जानने की आवश्यकता नहीं कि मामला किस मंत्रालय का है। यह हमारा काम है, आपका नहीं।",
  "home.box.title": "अपनी समस्या बताइए",
  "home.box.nologin": "मोबाइल नंबर से साइन इन कीजिए",
  "home.placeholder": "मेरी पेंशन चार महीने से नहीं आई है। मैं तीन बार बैंक गया, कोई उत्तर नहीं देता।",
  "home.speak": "या बोलकर बताइए",
  "home.speak.sub": "हिन्दी, मराठी, तमिल सहित तेरह भाषाओं में बोलिए। न लिखना पड़ेगा, न पढ़ना।",
  "home.listening": "सुन रहे हैं। कृपया बोलिए।",
  "home.continue": "आगे बढ़ें",
  "home.examples": "समझ नहीं आ रहा कैसे शुरू करें? इनमें से कोई देखिए",
  "home.trust.1": "पूर्णतः निःशुल्क",
  "home.trust.1.sub": "किसी भी चरण पर कोई शुल्क नहीं",
  "home.trust.2": "21 दिन में उत्तर",
  "home.trust.2.sub": "निर्धारित समय-सीमा",
  "home.trust.3": "13 भाषाएँ",
  "home.trust.3.sub": "लिखिए या बोलिए",
  "home.trust.4": "सुरक्षित साइन इन",
  "home.trust.4.sub": "मोबाइल नंबर और एक बार का कोड",

  "home.tiles.title": "आप क्या करना चाहते हैं?",
  "home.tile.file": "शिकायत दर्ज करें",
  "home.tile.file.sub": "लगभग तीन मिनट लगेंगे",
  "home.tile.status": "शिकायत की स्थिति देखें",
  "home.tile.status.sub": "पंजीकरण संख्या ही पर्याप्त है",
  "home.tile.directory": "अपने मामले का अधिकारी ढूँढ़ें",
  "home.tile.directory.sub": "नोडल अधिकारी और अपील प्राधिकारी",
  "home.tile.process": "निवारण प्रक्रिया समझें",
  "home.tile.process.sub": "दर्ज करने के बाद क्या होता है",

  "home.excluded.title": "जो मामले शिकायत के रूप में नहीं लिए जाते",
  "home.excluded.sub": "यदि आपका मामला इनमें से है तो यह पोर्टल उस पर कार्रवाई नहीं कर सकता। इसका अर्थ यह नहीं कि कोई नहीं कर सकता। प्रत्येक का उचित माध्यम है और हम आपको वहाँ तक पहुँचाएँगे।",
  "home.excluded.foot": "पता नहीं आपका मामला कौन-सा है? ऊपर अपनी समस्या लिखिए। कुछ भी भरने से पहले, लगभग बीस सेकंड में हम आपको बता देंगे।",

  "file.step.describe": "बताइए",
  "file.step.confirm": "पुष्टि",
  "file.step.review": "जाँच",
  "file.step.verify": "सत्यापन",
  "file.step.done": "पंजीकृत",

  "file.reassure.title": "यह कोई फ़ॉर्म नहीं है।",
  "file.reassure.body": "अपने शब्दों में उत्तर दीजिए। यदि कोई उत्तर नहीं जानते तो बता दीजिए, हम रास्ता निकाल लेंगे। जब तक आप पढ़कर सहमत न हों, कुछ भी दर्ज नहीं होगा।",
  "file.answer.label": "आपका उत्तर",
  "file.answer.placeholder": "अपना उत्तर यहाँ लिखिए",
  "file.send": "भेजें",
  "file.thinking": "आपकी बात पढ़ी जा रही है",

  "file.confirm.h": "क्या यही सही कार्यालय है?",
  "file.confirm.sub": "आपको विभाग चुनने की आवश्यकता नहीं पड़ी। आपने जो बताया उससे हमने निकाला है। आपको केवल जाँचना है।",
  "file.confirm.goes": "यहाँ भेजी जाएगी",
  "file.confirm.under": "इस श्रेणी में",
  "file.confirm.details": "आपके दिए विवरण",
  "file.confirm.yes": "हाँ, यही सही है",
  "file.confirm.no": "नहीं, यह कुछ और है",

  "file.draft.h": "भेजने से पहले अपनी शिकायत पढ़ लीजिए",
  "file.draft.sub": "विभाग जिस रूप में अपेक्षा करता है, हमने उसी रूप में लिखा है। शब्द आपके ही हैं। जो चाहें बदल सकते हैं।",
  "file.draft.label": "आपकी शिकायत",
  "file.draft.attach": "किसी पत्र, बिल या रसीद का फ़ोटो लगाइए",
  "file.draft.attach.help": "फ़ोन से लिया गया फ़ोटो पर्याप्त है। विभाग केवल PDF लेता है, इसलिए हम बदल देते हैं।",
  "file.draft.submit": "यह सही है, दर्ज कीजिए",

  "file.otp.h": "अंतिम चरण: आपका मोबाइल नंबर",
  "file.otp.sub": "अब पहली बार हम आपका परिचय पूछ रहे हैं। यहाँ रुक जाएँ तो भी लिखा हुआ कुछ नहीं जाएगा। न खाता, न पासवर्ड, न कैप्चा।",
  "file.otp.mobile": "मोबाइल नंबर",
  "file.otp.send": "कोड भेजिए",
  "file.otp.enter": "कोड लिखिए",
  "file.otp.file": "मेरी शिकायत दर्ज कीजिए",

  "file.done.h": "दर्ज हो गई। अब आगे यह होगा।",
  "file.done.copy": "प्रतिलिपि",
  "file.done.copied": "प्रतिलिपि बन गई",
  "file.done.who": "किसके पास है",
  "file.done.by": "उत्तर देने की अंतिम तिथि",
  "file.done.after": "उस तिथि तक कुछ न हो तो",
  "file.done.track": "इस शिकायत को देखें",

  "status.h1": "शिकायत की स्थिति देखें",
  "status.sub": "आपको दी गई पंजीकरण संख्या लिखिए, या नीचे से अपनी कोई शिकायत चुनिए।",
  "status.label": "पंजीकरण संख्या",
  "status.check": "स्थिति देखें",
  "status.none": "इस उपकरण पर उस संख्या की कोई शिकायत नहीं मिली।",

  "dir.h1": "नोडल अधिकारी और अपील प्राधिकारी",
  "dir.sub": "प्रत्येक मंत्रालय, विभाग, राज्य और संघ राज्य क्षेत्र में जन शिकायतों के लिए एक नामित अधिकारी होता है। यदि आपका मामला अटका है तो पहले इन्हें, और उसके बाद अपील प्राधिकारी को लिखिए।",
  "dir.search": "मंत्रालय, विभाग, राज्य या अधिकारी के नाम से खोजिए",
  "dir.tab.central": "केंद्रीय मंत्रालय और विभाग",
  "dir.tab.state": "राज्य और संघ राज्य क्षेत्र",
  "dir.tab.appeal": "अपील प्राधिकारी",
  "dir.results": "परिणाम",
  "dir.call": "फ़ोन",
  "dir.email": "ईमेल",
  "dir.copy": "प्रतिलिपि",
  "dir.empty": "उस खोज से कोई अधिकारी नहीं मिला। मंत्रालय या राज्य का नाम लिखकर देखिए।",

  "process.h1": "निवारण प्रक्रिया",
  "process.sub": "छह चरण, और प्रत्येक के लिए निर्धारित समय-सीमा।",

  "foot.quick": "त्वरित लिंक",
  "foot.help": "सहायता",
  "foot.legal": "नियम और नीति",
  "foot.helpline": "शिकायत हेल्पलाइन",
  "foot.hours": "सोमवार से शुक्रवार, प्रातः 9:00 से सायं 5:30 तक",
  "foot.privacy": "गोपनीयता",
  "foot.terms": "उपयोग की शर्तें",
  "foot.accessibility": "सुगम्यता वक्तव्य",
  "foot.copyright": "लोकसहाय। सामग्री का स्वामित्व और रखरखाव लोकसहाय सेवा दल के पास है।",
  "foot.independent": "लोकसहाय एक स्वतंत्र जन सेवा है और भारत सरकार द्वारा संचालित नहीं है।",
  "foot.updated": "अंतिम समीक्षा",
  "foot.browsers": "क्रोम, फ़ायरफ़ॉक्स, एज या सफारी के वर्तमान संस्करण में सर्वोत्तम। धीमे कनेक्शन पर भी चलता है।",
};

/*
  The tables for the languages beyond English and Hindi live in their own file
  purely for size. The import there is `import type`, which is erased at build
  time, so this is a one-way dependency at runtime and not a cycle.

  A language with no table, or a key missing from one, falls through to English
  rather than rendering blank. A half-translated language still gives a usable
  page.
*/
const TABLES: Record<LangCode, Table> = {
  en: en as unknown as Table,
  hi,
  bn: {},
  mr: {},
  ta: {},
  te: {},
  gu: {},
  kn: {},
  ml: {},
  pa: {},
  or: {},
  as: {},
  ur: {},
};

for (const [code, table] of Object.entries(EXTRA_TABLES)) {
  TABLES[code as LangCode] = { ...TABLES[code as LangCode], ...table };
}

export function translate(lang: LangCode, key: StringKey): string {
  return TABLES[lang]?.[key] ?? en[key] ?? key;
}

export function tableFor(lang: LangCode): Table {
  return TABLES[lang] ?? {};
}

export function registerTable(lang: LangCode, table: Table): void {
  TABLES[lang] = { ...TABLES[lang], ...table };
}
