"use client";

import { useEffect, useRef, useState } from "react";
import { LANGUAGES, type LangCode } from "@/lib/i18n";
import { useI18n } from "./i18n-provider";

/*
  The first screen of a multilingual service has a chicken and egg problem:
  which language do you write "choose your language" in? Writing it in English
  quietly tells a Tamil speaker that English is the real language and the rest
  are a courtesy. So the heading cycles through all thirteen, each tile carries
  its own script, and nothing is asked before this is answered.
*/

const HEADING: Record<LangCode, string> = {
  en: "Choose your language",
  hi: "अपनी भाषा चुनिए",
  bn: "আপনার ভাষা বেছে নিন",
  mr: "आपली भाषा निवडा",
  ta: "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்",
  te: "మీ భాషను ఎంచుకోండి",
  gu: "તમારી ભાષા પસંદ કરો",
  kn: "ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆರಿಸಿ",
  ml: "നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക",
  pa: "ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ",
  or: "ଆପଣଙ୍କ ଭାଷା ବାଛନ୍ତୁ",
  as: "আপোনাৰ ভাষা বাছনি কৰক",
  ur: "اپنی زبان منتخب کیجیے",
};

const CONTINUE: Record<LangCode, string> = {
  en: "Continue",
  hi: "आगे बढ़ें",
  bn: "এগিয়ে যান",
  mr: "पुढे जा",
  ta: "தொடரவும்",
  te: "కొనసాగించండి",
  gu: "આગળ વધો",
  kn: "ಮುಂದುವರಿಸಿ",
  ml: "തുടരുക",
  pa: "ਅੱਗੇ ਵਧੋ",
  or: "ଆଗକୁ ଯାଆନ୍ତୁ",
  as: "আগবাঢ়ক",
  ur: "آگے بڑھیں",
};

const NOTE: Record<LangCode, string> = {
  en: "Everything after this, including the reply to your grievance, will be in this language. You can change it at any time from the top of the page.",
  hi: "इसके बाद सब कुछ, आपकी शिकायत का उत्तर भी, इसी भाषा में होगा। आप इसे कभी भी पृष्ठ के ऊपर से बदल सकते हैं।",
  bn: "এর পরে সবকিছু, আপনার অভিযোগের উত্তরও, এই ভাষাতেই হবে। পৃষ্ঠার উপর থেকে আপনি যে কোনও সময় বদলাতে পারেন।",
  mr: "यानंतर सर्व काही, तुमच्या तक्रारीचे उत्तरही, याच भाषेत असेल. पानाच्या वरून तुम्ही ते केव्हाही बदलू शकता.",
  ta: "இதற்குப் பிறகு அனைத்தும், உங்கள் புகாருக்கான பதிலும், இதே மொழியில் இருக்கும். பக்கத்தின் மேலிருந்து எப்போது வேண்டுமானாலும் மாற்றலாம்.",
  te: "దీని తర్వాత అంతా, మీ ఫిర్యాదుకు సమాధానం కూడా, ఇదే భాషలో ఉంటుంది. పేజీ పైభాగం నుండి ఎప్పుడైనా మార్చుకోవచ్చు.",
  gu: "આ પછી બધું, તમારી ફરિયાદનો જવાબ પણ, આ જ ભાષામાં હશે. પાનાની ઉપરથી તમે ગમે ત્યારે બદલી શકો છો.",
  kn: "ಇದರ ನಂತರ ಎಲ್ಲವೂ, ನಿಮ್ಮ ದೂರಿನ ಉತ್ತರವೂ, ಇದೇ ಭಾಷೆಯಲ್ಲಿ ಇರುತ್ತದೆ. ಪುಟದ ಮೇಲ್ಭಾಗದಿಂದ ಯಾವಾಗ ಬೇಕಾದರೂ ಬದಲಾಯಿಸಬಹುದು.",
  ml: "ഇതിനുശേഷം എല്ലാം, നിങ്ങളുടെ പരാതിക്കുള്ള മറുപടിയും, ഈ ഭാഷയിൽ ആയിരിക്കും. പേജിന്റെ മുകളിൽ നിന്ന് എപ്പോൾ വേണമെങ്കിലും മാറ്റാം.",
  pa: "ਇਸ ਤੋਂ ਬਾਅਦ ਸਭ ਕੁਝ, ਤੁਹਾਡੀ ਸ਼ਿਕਾਇਤ ਦਾ ਜਵਾਬ ਵੀ, ਇਸੇ ਭਾਸ਼ਾ ਵਿੱਚ ਹੋਵੇਗਾ। ਪੰਨੇ ਦੇ ਉੱਪਰੋਂ ਤੁਸੀਂ ਕਦੇ ਵੀ ਬਦਲ ਸਕਦੇ ਹੋ।",
  or: "ଏହା ପରେ ସବୁକିଛି, ଆପଣଙ୍କ ଅଭିଯୋଗର ଉତ୍ତର ମଧ୍ୟ, ଏହି ଭାଷାରେ ହେବ। ପୃଷ୍ଠାର ଉପରୁ ଆପଣ ଯେକୌଣସି ସମୟରେ ବଦଳାଇ ପାରିବେ।",
  as: "ইয়াৰ পিছত সকলো, আপোনাৰ অভিযোগৰ উত্তৰো, এই ভাষাতে হ'ব। পৃষ্ঠাৰ ওপৰৰ পৰা আপুনি যিকোনো সময়তে সলনি কৰিব পাৰে।",
  ur: "اس کے بعد سب کچھ، آپ کی شکایت کا جواب بھی، اسی زبان میں ہوگا۔ آپ اسے صفحے کے اوپر سے کسی بھی وقت بدل سکتے ہیں۔",
};

export function LanguageGate() {
  const { lang, setLang, needsChoice, ready } = useI18n();
  const [picked, setPicked] = useState<LangCode>(lang);
  const [spin, setSpin] = useState(0);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Follow the browser guess until the citizen touches a tile.
  useEffect(() => {
    if (needsChoice) setPicked(lang);
  }, [needsChoice, lang]);

  // Rotate the heading so no single language sits at the top by default.
  useEffect(() => {
    if (!needsChoice) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => setSpin((n) => n + 1), 2200);
    return () => window.clearInterval(id);
  }, [needsChoice]);

  // Hold focus inside the dialogue. It is the only thing on screen.
  useEffect(() => {
    if (!needsChoice) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !cardRef.current) return;
      const focusable = cardRef.current.querySelectorAll<HTMLElement>("button, [href]");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [needsChoice]);

  if (!ready || !needsChoice) return null;

  const spinLang = LANGUAGES[spin % LANGUAGES.length].code;
  const headLang = spin === 0 ? picked : spinLang;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="gate-h">
      <div className="modal-card" ref={cardRef}>
        <div className="modal-head stack gap-2">
          <p className="tiny" style={{ opacity: 0.8, letterSpacing: "0.1em", fontWeight: 700 }}>
            LOKSAHAY
          </p>
          <h2 id="gate-h" style={{ minHeight: "1.3em" }}>
            <span key={headLang}>{HEADING[headLang]}</span>
          </h2>
          <p className="small" style={{ opacity: 0.9 }}>
            {headLang === "en" ? null : HEADING.en}
          </p>
        </div>

        <div className="stack gap-4" style={{ padding: 24 }}>
          <div className="langgrid">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                className="langtile"
                aria-pressed={picked === l.code}
                onClick={() => setPicked(l.code)}
                lang={l.tag}
              >
                <span className="native" data-s={l.script} dir={l.dir}>
                  {l.native}
                </span>
                <span className="rom">{l.english}</span>
              </button>
            ))}
          </div>

          <p className="small muted" dir={LANGUAGES.find((l) => l.code === picked)?.dir}>
            {NOTE[picked]}
          </p>

          <button
            ref={confirmRef}
            type="button"
            className="btn action block lg"
            onClick={() => setLang(picked)}
          >
            {CONTINUE[picked]}
          </button>
        </div>
      </div>
    </div>
  );
}
