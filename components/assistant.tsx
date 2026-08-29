"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { MicIcon, useVoice } from "@/components/voice";
import { Seal } from "@/components/seal";
import { SIGNPOSTS } from "@/lib/signposts";
import type { ChatMsg } from "@/lib/llm";
import type { AgentTurn } from "@/lib/types";
import { claimMic, useMicClaim } from "@/lib/mic";
import s from "./assistant.module.css";

/*
  The floating assistant.

  A person who lands anywhere on this site — the process page, the directory,
  the status lookup — and realises they need help should not have to find their
  way back to /file to ask for it. This is that help: a small offer pinned to
  the corner that opens into a real conversation, spoken aloud, in the
  citizen's own language.

  It consumes the existing voice engine wholesale (components/voice.tsx). It
  does not own a microphone of its own, does not re-implement Saarika or
  Bulbul, and does not duplicate the turn logic in app/api/converse. What it
  adds is a compact surface for that same machinery, plus a hand-off into the
  full intake at /file once the citizen has said enough.

  It deliberately renders nothing on /file, which already runs a full
  conversation with its own microphone. Two microphone consumers on one page
  would fight each other for the audio device.
*/

/* -------------------------------------------------------------------------
   Every user-facing string this component writes lives in this one block, in
   English only, so a future translation pass can lift it out in one move.
   Model replies are NOT here: they come back from /api/converse in whatever
   language the citizen used, and are rendered exactly as received.
   ------------------------------------------------------------------------- */
const T = {
  launcherTitle: "Need help?",
  launcherSub: "Talk to Loksahay",
  launcherShort: "Help",
  launcherAria: "Open Loksahay help. Describe your problem and we will find the right department.",
  dismiss: "Hide the help button",
  panelTitle: "Loksahay help",
  panelSub: "Tell us what went wrong. We work out the department.",
  close: "Close help",

  greeting:
    "Tell me what went wrong, in your own words and in your own language. You do not need to know which department it belongs to — that is our job.",

  stateIdle: "Ready when you are",
  stateListening: "Listening — speak now",
  stateThinking: "Thinking",
  stateSpeaking: "Loksahay is speaking",

  startVoice: "Start talking",
  stopVoice: "Stop talking",
  startVoiceAria: "Start a hands-free spoken conversation",
  stopVoiceAria: "Stop the spoken conversation and release the microphone",
  handsFreeHint: "It replies aloud and opens the microphone again by itself. You need not touch the screen.",
  noMic: "No microphone is available on this device. You can type instead.",

  typeLabel: "Type your answer instead",
  typePlaceholder: "Or type it here…",
  send: "Send",

  engineSarvam: "Sarvam AI voice",
  engineBrowser: "Browser voice",
  engineIdle: "Voice not started",
  engineSarvamTitle: "Speech in through Sarvam Saarika, speech out through Sarvam Bulbul.",
  engineBrowserTitle:
    "Sarvam was not reachable, so this fell back to the browser's own speech, which is weaker at Indian languages.",
  engineIdleTitle: "Start talking and this will show which speech engine is actually being used.",

  offline: "Offline mode — no model key is configured, so answers are coming from a simple built-in fallback.",
  trouble: "Something went wrong on our side and I did not get that. Please say it again, or type it.",

  handoff: "Continue on the full form",
  handoffHint: "This carries what you have said into the full grievance form. Nothing is lost.",
  outOfScopeTitle: "This one is not for the grievance portal",
  outOfScopeWhere: "Where it does belong",
  openLink: "Open",
  helpline: "Helpline",

  transcriptLabel: "Conversation with Loksahay",
  you: "You",
  us: "Loksahay",
} as const;

/** Routes that run their own microphone, so this must not render on them. */
const SILENT_ROUTES = ["/file"];

/** Identifies this component in the page-wide microphone claim. See lib/mic.ts. */
const MIC_OWNER = "assistant";

/** Give up on a turn rather than sitting in "thinking" for ever. */
const REQUEST_TIMEOUT_MS = 25_000;

/** Offer the hand-off once the citizen has actually described something. */
const HANDOFF_MIN_USER_TURNS = 2;

type Phase = "idle" | "listening" | "thinking" | "speaking";

type Bubble = {
  id: number;
  role: "user" | "assistant";
  text: string;
  /** BCP-47 code so the right script font applies. */
  lang: string;
  /** Written locally, in English — never sent back to the model. */
  local?: boolean;
};

type VoiceApi = ReturnType<typeof useVoice>;

export function Assistant() {
  const pathname = usePathname();
  const router = useRouter();
  const { meta, needsChoice } = useI18n();

  /*
    Hidden on routes that own the microphone, and while the first-visit language
    gate is still up: that gate is a blocking modal with a focus trap, and a
    bubble underneath it would be an invisible but reachable tab stop.
  */
  const hidden =
    needsChoice || SILENT_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [turn, setTurn] = useState<AgentTurn | null>(null);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const mountedRef = useRef(true);
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const timersRef = useRef<Set<number>>(new Set());
  const reduceRef = useRef(false);
  const seqRef = useRef(0);
  const greetedRef = useRef(false);
  const returnFocusRef = useRef(false);
  /** A transcript that arrived while a turn was still in flight. */
  const pendingRef = useRef<string | null>(null);
  const sendRef = useRef<((text: string) => Promise<void>) | null>(null);

  /** What we actually POST. The local greeting and local error notes stay out. */
  const historyRef = useRef<ChatMsg[]>([]);
  const fieldsRef = useRef<Record<string, string>>({});
  const routingRef = useRef<AgentTurn["routing"]>(null);

  // The hook returns a fresh object every render; mirror it so the callbacks
  // below can stay stable without going stale.
  const voiceRef = useRef<VoiceApi | null>(null);

  const push = useCallback((b: Omit<Bubble, "id">) => {
    seqRef.current += 1;
    const id = seqRef.current;
    setBubbles((prev) => [...prev, { ...b, id }]);
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      // Saarika can hand us a transcript while the previous turn is still in
      // flight. Queue it rather than dropping it, which would leave hands-free
      // waiting for a reply that never comes.
      if (busyRef.current) {
        pendingRef.current = text;
        return;
      }

      busyRef.current = true;
      setBusy(true);
      setTyped("");
      push({ role: "user", text, lang: "" });

      const next: ChatMsg[] = [...historyRef.current, { role: "user", content: text }];
      historyRef.current = next;

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      let timedOut = false;
      const timer = window.setTimeout(() => {
        timedOut = true;
        ctrl.abort();
      }, REQUEST_TIMEOUT_MS);
      timersRef.current.add(timer);

      try {
        const res = await fetch("/api/converse", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: next,
            fields: fieldsRef.current,
            routing: routingRef.current,
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("converse_failed");
        const t = (await res.json()) as AgentTurn;
        if (!mountedRef.current) return;

        historyRef.current = [...next, { role: "assistant", content: t.reply }];
        fieldsRef.current = t.fields ?? fieldsRef.current;
        routingRef.current = t.routing ?? routingRef.current;
        setTurn(t);
        push({ role: "assistant", text: t.reply, lang: t.language });

        // Speaking with thenListen=true is what makes this bidirectional: the
        // hook reopens the microphone by itself when playback ends.
        if (voiceRef.current?.handsFree) voiceRef.current.speak(t.reply, t.language, true);
      } catch {
        // A close aborts the request on purpose; that is not an error to show.
        if (!mountedRef.current || (ctrl.signal.aborted && !timedOut)) return;
        push({ role: "assistant", text: T.trouble, lang: "en-IN", local: true });
        // Keep hands-free alive: say the apology aloud, which reopens the mic.
        if (voiceRef.current?.handsFree) voiceRef.current.speak(T.trouble, "en-IN", true);
      } finally {
        window.clearTimeout(timer);
        timersRef.current.delete(timer);
        if (abortRef.current === ctrl) abortRef.current = null;
        busyRef.current = false;
        if (mountedRef.current) setBusy(false);
        const queued = pendingRef.current;
        pendingRef.current = null;
        if (queued && mountedRef.current) void sendRef.current?.(queued);
      }
    },
    [push],
  );

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  // onFinal is held in a ref inside the hook, so this closure is always fresh.
  const voice = useVoice((said) => {
    void send(said);
  });

  useEffect(() => {
    voiceRef.current = voice;
  });

  /* ------------------------------- lifecycle ------------------------------ */

  useEffect(() => {
    mountedRef.current = true;
    const timers = timersRef.current;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      abortRef.current = null;
      for (const t of timers) window.clearTimeout(t);
      timers.clear();
      // Release the microphone and stop any playback on the way out.
      voiceRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reduceRef.current = mq.matches;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const close = useCallback(() => {
    // Only one microphone consumer at a time: always hand the device back.
    voiceRef.current?.stop();
    abortRef.current?.abort();
    abortRef.current = null;
    busyRef.current = false;
    pendingRef.current = null;
    setBusy(false);
    // The trigger is not mounted yet at this point, so the focus move has to
    // wait for the collapsed state to render. See the effect below.
    returnFocusRef.current = true;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (open || !returnFocusRef.current) return;
    returnFocusRef.current = false;
    triggerRef.current?.focus();
  }, [open]);

  /*
    Navigating onto a route that owns the microphone hands the device back at
    once. This only touches the external systems — the mic and the in-flight
    request — because the render already returns null while hidden, and the
    aborted fetch clears `busy` through its own finally block. Leaving `open`
    alone means the conversation is still there if the citizen comes back.
  */
  useEffect(() => {
    if (!hidden) return;
    voiceRef.current?.stop();
    abortRef.current?.abort();
    abortRef.current = null;
  }, [hidden]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Move focus into the dialog on open, and greet once.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    if (greetedRef.current) return;
    greetedRef.current = true;
    push({ role: "assistant", text: T.greeting, lang: "en-IN", local: true });
  }, [open, push]);

  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduceRef.current ? "auto" : "smooth" });
  }, [bubbles, busy, open, voice.interim]);

  /* --------------------------------- state -------------------------------- */

  const phase: Phase = busy
    ? "thinking"
    : voice.speaking
      ? "speaking"
      : voice.listening
        ? "listening"
        : voice.interim
          ? "thinking"
          : "idle";

  const phaseLabel =
    phase === "listening"
      ? T.stateListening
      : phase === "thinking"
        ? T.stateThinking
        : phase === "speaking"
          ? T.stateSpeaking
          : T.stateIdle;

  // Before the first reply lands there is no detected language, so fall back to
  // the one the citizen chose for the interface rather than to English.
  const lang = turn?.language ?? meta.tag;
  const said = bubbles.filter((b) => b.role === "user");
  const signpost =
    turn?.scope === "out_of_scope" && turn.outOfScopeReason
      ? SIGNPOSTS[turn.outOfScopeReason]
      : undefined;
  const canHandOff =
    !signpost && (turn?.readyToFile === true || said.length >= HANDOFF_MIN_USER_TURNS);

  /*
    Another consumer on this page — the homepage dictation button — has taken
    the microphone. Stand down rather than run a second capture stream that
    transcribes the same room and hears our own playback.
  */
  useMicClaim(MIC_OWNER, () => voiceRef.current?.stop());

  const toggleVoice = () => {
    if (voice.handsFree) voice.stop();
    else {
      // Take the device from any other consumer on the page before opening it,
      // and seed recognition with the chosen interface language so a Tamil
      // speaker is heard in Tamil from the first word rather than the second.
      claimMic(MIC_OWNER);
      voice.startHandsFree(lang);
    }
  };

  const handOff = () => {
    // Contract matched to app/page.tsx (writer) and app/file/page.tsx (reader):
    // a single plain string under "loksahay:opening", consumed and removed on
    // mount there, then replayed as the opening user message.
    const opening = (turn?.draftOriginal ?? said.map((b) => b.text).join("\n\n")).trim();
    voiceRef.current?.stop();
    abortRef.current?.abort();
    abortRef.current = null;
    setOpen(false);
    try {
      if (opening) sessionStorage.setItem("loksahay:opening", opening);
    } catch {
      /* private browsing; /file simply starts empty */
    }
    router.push("/file");
  };

  if (hidden) return null;

  /* --------------------------------- render ------------------------------- */

  if (!open) {
    if (dismissed) return null;
    return (
      <div className={s.dock}>
        <div className={s.launcher}>
          <button
            ref={triggerRef}
            type="button"
            className={s.launcherMain}
            aria-label={T.launcherAria}
            aria-expanded={false}
            aria-controls="loksahay-assistant"
            onClick={() => setOpen(true)}
          >
            <span className={s.launcherMark} aria-hidden="true">
              <Seal size={26} />
            </span>
            <span className={s.launcherText}>
              <strong>{T.launcherTitle}</strong>
              <span className={s.launcherSub}>{T.launcherSub}</span>
              <span className={s.launcherShort}>{T.launcherShort}</span>
            </span>
          </button>
          <button type="button" className={s.launcherX} aria-label={T.dismiss} onClick={() => setDismissed(true)}>
            <CloseGlyph />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="loksahay-assistant"
      ref={panelRef}
      className={s.panel}
      role="dialog"
      /*
        aria-modal is deliberately NOT set. We do not make the rest of the page
        inert and we do not trap the keyboard, so claiming modality would lie to
        a screen reader. Escape closes, focus returns to the trigger, and Tab
        leaves the panel normally.
      */
      aria-labelledby="loksahay-assistant-title"
      aria-describedby="loksahay-assistant-sub"
      tabIndex={-1}
    >
      <header className={s.head}>
        <span className={s.headMark} aria-hidden="true">
          <Seal size={30} />
        </span>
        <span className={s.headText}>
          <strong id="loksahay-assistant-title">{T.panelTitle}</strong>
          <span id="loksahay-assistant-sub" className={s.headSub}>
            {T.panelSub}
          </span>
        </span>
        <button type="button" className={s.headX} aria-label={T.close} onClick={close}>
          <CloseGlyph />
        </button>
      </header>

      {/* Whose turn it is. Shape and colour carry it, not only the words. */}
      <div className={s.status} data-phase={phase}>
        <span className={s.orb} data-phase={phase} aria-hidden="true">
          <StateGlyph phase={phase} />
        </span>
        <span className={s.statusText}>
          <strong>{phaseLabel}</strong>
          <span
            className={s.engine}
            data-engine={voice.engine}
            title={
              voice.engine === "sarvam"
                ? T.engineSarvamTitle
                : voice.engine === "browser"
                  ? T.engineBrowserTitle
                  : T.engineIdleTitle
            }
          >
            {voice.engine === "sarvam"
              ? T.engineSarvam
              : voice.engine === "browser"
                ? T.engineBrowser
                : T.engineIdle}
          </span>
        </span>
      </div>

      <div
        ref={logRef}
        className={s.log}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label={T.transcriptLabel}
        aria-busy={busy}
      >
        {bubbles.map((b) => (
          <p
            key={b.id}
            className={b.role === "user" ? `${s.bubble} ${s.me}` : `${s.bubble} ${s.them}`}
            lang={b.role === "assistant" && !b.local ? b.lang : undefined}
          >
            <span className={s.who}>{b.role === "user" ? T.you : T.us}</span>
            {b.text}
          </p>
        ))}

        {voice.interim && (
          <p className={`${s.bubble} ${s.me} ${s.interim}`}>
            <span className={s.who}>{T.you}</span>
            {voice.interim}
          </p>
        )}

        {busy && (
          <p className={`${s.bubble} ${s.them} ${s.thinking}`}>
            <span className={s.who}>{T.us}</span>
            <span className={s.dots} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className={s.srOnly}>{T.stateThinking}</span>
          </p>
        )}
      </div>

      <div className={s.foot}>
        {turn?.degraded && <p className={`${s.note} ${s.noteWarn}`}>{T.offline}</p>}
        {voice.error && (
          <p className={`${s.note} ${s.noteBad}`} role="status">
            {voice.error}
          </p>
        )}
        {!voice.supported && <p className={`${s.note} ${s.noteWarn}`}>{T.noMic}</p>}

        {signpost && (
          <div className={`${s.note} ${s.noteWarn} ${s.signpost}`}>
            <strong>{T.outOfScopeTitle}</strong>
            <span>{signpost.because}</span>
            <strong>{T.outOfScopeWhere}</strong>
            <span>{signpost.instead}</span>
            <span className={s.signpostLinks}>
              {signpost.href && (
                <a className={s.link} href={signpost.href} target="_blank" rel="noreferrer">
                  {signpost.hrefLabel ?? T.openLink}
                </a>
              )}
              {signpost.phone && (
                <span className={s.tag}>
                  {T.helpline} {signpost.phone}
                </span>
              )}
            </span>
          </div>
        )}

        {canHandOff && (
          <button type="button" className={s.handoff} onClick={handOff}>
            {T.handoff}
            <span className={s.handoffHint}>{T.handoffHint}</span>
          </button>
        )}

        <button
          type="button"
          className={s.talk}
          data-on={voice.handsFree ? "true" : "false"}
          disabled={!voice.supported}
          aria-pressed={voice.handsFree}
          aria-label={voice.handsFree ? T.stopVoiceAria : T.startVoiceAria}
          onClick={toggleVoice}
        >
          <span className={s.talkMark} aria-hidden="true">
            <MicIcon off={voice.handsFree} />
          </span>
          <span className={s.talkText}>
            <strong>{voice.handsFree ? T.stopVoice : T.startVoice}</strong>
            <span>{T.handsFreeHint}</span>
          </span>
        </button>

        <form
          className={s.compose}
          onSubmit={(e) => {
            e.preventDefault();
            void send(typed);
          }}
        >
          <label className={s.srOnly} htmlFor="loksahay-assistant-input">
            {T.typeLabel}
          </label>
          <input
            id="loksahay-assistant-input"
            className={s.input}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={T.typePlaceholder}
            autoComplete="off"
          />
          <button type="submit" className={s.sendBtn} disabled={!typed.trim() || busy}>
            {T.send}
          </button>
        </form>
      </div>
    </div>
  );
}

/* --------------------------------- glyphs -------------------------------- */

function CloseGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The state has to be readable by someone who cannot read. Each phase gets a
 * distinct silhouette, so it survives high-contrast mode and reduced motion,
 * where the colour and the movement both go away.
 */
function StateGlyph({ phase }: { phase: Phase }) {
  if (phase === "listening")
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <line className={s.bar1} x1="4" y1="9" x2="4" y2="15" />
          <line className={s.bar2} x1="8.7" y1="5" x2="8.7" y2="19" />
          <line className={s.bar3} x1="13.3" y1="7" x2="13.3" y2="17" />
          <line className={s.bar4} x1="18" y1="10" x2="18" y2="14" />
        </g>
      </svg>
    );
  if (phase === "speaking")
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" fill="currentColor" />
        <path
          className={s.wave1}
          d="M15.5 9a4.2 4.2 0 0 1 0 6"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          className={s.wave2}
          d="M18.6 6.4a8.2 8.2 0 0 1 0 11.2"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  if (phase === "thinking")
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <g fill="currentColor">
          <circle className={s.bar1} cx="5.5" cy="12" r="2.1" />
          <circle className={s.bar2} cx="12" cy="12" r="2.1" />
          <circle className={s.bar3} cx="18.5" cy="12" r="2.1" />
        </g>
      </svg>
    );
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="10.5" rx="3" fill="currentColor" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 17.5V21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
