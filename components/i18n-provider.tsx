"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LANG,
  LANGUAGES,
  STORAGE_KEY,
  langMeta,
  translate,
  type LangCode,
  type LangMeta,
  type StringKey,
} from "@/lib/i18n";

type Ctx = {
  lang: LangCode;
  meta: LangMeta;
  setLang: (c: LangCode) => void;
  t: (k: StringKey) => string;
  /** False until the stored choice has been read, so nothing flashes. */
  ready: boolean;
  /** True when this device has never chosen. Drives the opening dialogue. */
  needsChoice: boolean;
};

const LangCtx = createContext<Ctx | null>(null);

function readStored(): LangCode | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v && LANGUAGES.some((l) => l.code === v)) return v as LangCode;
  } catch {
    /* private browsing, or storage disabled */
  }
  return null;
}

/**
 * Offer the browser's own language first. Someone whose phone is already set to
 * Tamil should find Tamil pre-selected rather than hunting for it.
 */
function guessFromBrowser(): LangCode {
  try {
    for (const nav of navigator.languages ?? [navigator.language]) {
      const base = nav.toLowerCase().split("-")[0];
      const hit = LANGUAGES.find((l) => l.code === base);
      if (hit) return hit.code;
    }
  } catch {
    /* nothing to guess from */
  }
  return DEFAULT_LANG;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(DEFAULT_LANG);
  const [ready, setReady] = useState(false);
  const [needsChoice, setNeedsChoice] = useState(false);

  useEffect(() => {
    const stored = readStored();
    if (stored) {
      setLangState(stored);
    } else {
      setLangState(guessFromBrowser());
      setNeedsChoice(true);
    }
    setReady(true);
  }, []);

  const setLang = useCallback((c: LangCode) => {
    setLangState(c);
    setNeedsChoice(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, c);
      // Mirrored so a future server render can pick the language up too.
      document.cookie = STORAGE_KEY + "=" + c + ";path=/;max-age=31536000;samesite=lax";
    } catch {
      /* the choice still holds for this session */
    }
  }, []);

  const meta = useMemo(() => langMeta(lang), [lang]);

  // Drive the document itself, so screen readers, spellcheck and the font
  // stacks in globals.css all follow the same single choice.
  useEffect(() => {
    if (!ready) return;
    const el = document.documentElement;
    el.setAttribute("lang", meta.tag);
    el.setAttribute("dir", meta.dir);
    el.setAttribute("data-script", meta.script);
  }, [meta, ready]);

  const t = useCallback((k: StringKey) => translate(lang, k), [lang]);

  const value = useMemo<Ctx>(
    () => ({ lang, meta, setLang, t, ready, needsChoice }),
    [lang, meta, setLang, t, ready, needsChoice],
  );

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(LangCtx);
  if (!c) throw new Error("useI18n must be used inside <LanguageProvider>");
  return c;
}

/** Shorthand for the common case. */
export function useT(): (k: StringKey) => string {
  return useI18n().t;
}
