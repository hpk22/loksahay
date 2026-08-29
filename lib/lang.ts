/**
 * Deterministic script detection.
 *
 * Asking the model which language to reply in turned out to be unreliable:
 * a small model primed with Indian-language examples would answer an English
 * speaker in Marathi. Script is a solved problem in Unicode, so we decide it
 * here and tell the model what to do rather than asking it.
 */

type Lang = { code: string; name: string; script: string };

const BLOCKS: Array<{ re: RegExp; lang: Lang }> = [
  { re: /[ঀ-৿]/, lang: { code: "bn-IN", name: "Bengali", script: "Bengali" } },
  { re: /[਀-੿]/, lang: { code: "pa-IN", name: "Punjabi", script: "Gurmukhi" } },
  { re: /[઀-૿]/, lang: { code: "gu-IN", name: "Gujarati", script: "Gujarati" } },
  { re: /[଀-୿]/, lang: { code: "or-IN", name: "Odia", script: "Odia" } },
  { re: /[஀-௿]/, lang: { code: "ta-IN", name: "Tamil", script: "Tamil" } },
  { re: /[ఀ-౿]/, lang: { code: "te-IN", name: "Telugu", script: "Telugu" } },
  { re: /[ಀ-೿]/, lang: { code: "kn-IN", name: "Kannada", script: "Kannada" } },
  { re: /[ഀ-ൿ]/, lang: { code: "ml-IN", name: "Malayalam", script: "Malayalam" } },
];

/** Words that are common in Marathi and rare or absent in Hindi. */
const MARATHI = ["आहे", "नाही", "माझी", "माझा", "मला", "तुमच्या", "झाले", "गेलो", "केली", "आणि कोणीही", "पासून"];

export function detectLanguage(text: string): Lang {
  for (const b of BLOCKS) if (b.re.test(text)) return b.lang;

  if (/[ऀ-ॿ]/.test(text)) {
    const marathi = MARATHI.some((w) => text.includes(w));
    return marathi
      ? { code: "mr-IN", name: "Marathi", script: "Devanagari" }
      : { code: "hi-IN", name: "Hindi", script: "Devanagari" };
  }

  return { code: "en-IN", name: "English", script: "Latin" };
}

/** A hard, per-turn instruction that overrides the model's own inclination. */
export function languageDirective(text: string): string {
  const l = detectLanguage(text);
  if (l.code === "en-IN") {
    return "The citizen's most recent message is written in English, in the Latin script. You MUST write your reply in English. Do not reply in Hindi, Marathi or any other language.";
  }
  return (
    "The citizen's most recent message is written in " +
    l.name +
    ", in the " +
    l.script +
    " script. You MUST write your reply in " +
    l.name +
    ", in the " +
    l.script +
    " script. Do not reply in English."
  );
}
