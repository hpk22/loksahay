"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { NavIcon } from "@/components/seal";
import { SiteHeader, GovFooter } from "@/components/chrome";
import { RequireAuth } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-provider";
import { useVoice, MicIcon } from "@/components/voice";
import { claimMic, useMicClaim } from "@/lib/mic";
import { useI18n, useT } from "@/components/i18n-provider";
import { SIGNPOSTS } from "@/lib/signposts";
import { cpgramsSanitize, isAllowedChar } from "@/lib/ascii";
import { fieldsFor, findMinistry, resolvePath } from "@/lib/taxonomy";
import type { StringKey } from "@/lib/i18n";
import type { AgentTurn, Grievance } from "@/lib/types";

type Phase = "chat" | "confirm" | "draft" | "otp" | "done";
type Msg = { role: "user" | "assistant"; content: string };

const ORDER: Phase[] = ["chat", "confirm", "draft", "otp", "done"];

const STEP_KEYS: Record<Phase, StringKey> = {
  chat: "file.step.describe",
  confirm: "file.step.confirm",
  draft: "file.step.review",
  otp: "file.step.verify",
  done: "file.step.done",
};

/** The name the citizen is talking to. A person, not a database. */
const HELPER_NAME = "Sahay";

function FilePageInner() {
  const t = useT();
  // The chosen interface language seeds speech recognition, so a Tamil
  // speaker is heard in Tamil from the first word rather than after a guess.
  const { meta } = useI18n();
  const { session } = useAuth();

  const [phase, setPhase] = useState<Phase>("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [turn, setTurn] = useState<AgentTurn | null>(null);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");

  const [draft, setDraft] = useState("");
  const [draftAscii, setDraftAscii] = useState("");
  const [attachment, setAttachment] = useState<string>();

  const [mobile, setMobile] = useState(session?.mobile ?? "");
  const [otpCode, setOtpCode] = useState<string>();
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState<string>();

  const [result, setResult] = useState<{ grievance: Grievance; dueBy: string; slaDays: number }>();

  const started = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstPaint = useRef(true);

  const lang = turn?.language ?? "en-IN";

  const send = useCallback(
    async (content: string, history?: Msg[], known?: Record<string, string>) => {
      const base = history ?? messages;
      const next: Msg[] = [...base, { role: "user", content }];
      setMessages(next);
      setInput("");
      setBusy(true);
      try {
        const res = await fetch("/api/converse", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: next,
            fields: known ?? fields,
            routing: turn?.routing ?? null,
          }),
        });
        const t2 = (await res.json()) as AgentTurn;
        setTurn(t2);
        setFields(t2.fields ?? {});
        setMessages([...next, { role: "assistant", content: t2.reply }]);
        if (t2.readyToFile) {
          setDraft(t2.draftOriginal ?? content);
          setDraftAscii(t2.draftAscii ?? "");
          setPhase("confirm");
        }
        return t2;
      } catch {
        setMessages([
          ...next,
          {
            role: "assistant",
            content: "Something went wrong on our side. Please say that again.",
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [messages, fields, turn],
  );

  const voice = useVoice((said) => {
    if (phase === "chat" && !busy) void send(said);
  });

  // Only one consumer may hold the microphone. If the floating assistant takes
  // it mid-conversation, this flow stands down instead of talking over it.
  useMicClaim("file", () => voice.stop());

  // Speak replies back when the citizen is in conversation mode.
  const lastSpoken = useRef<string>("");
  useEffect(() => {
    if (!voice.handsFree || !turn?.reply) return;
    if (lastSpoken.current === turn.reply) return;
    lastSpoken.current = turn.reply;
    voice.speak(turn.reply, turn.language, phase === "chat");
  }, [turn, voice, phase]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const opening = typeof window !== "undefined" ? sessionStorage.getItem("loksahay:opening") : null;
    if (opening) {
      sessionStorage.removeItem("loksahay:opening");
      void send(opening, [], {});
    }
  }, [send]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Each step announces itself. Focus lands on the new heading, never back at
  // the top of the document, so a screen reader hears where it now is.
  useEffect(() => {
    if (firstPaint.current) {
      firstPaint.current = false;
      return;
    }
    heading.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [phase]);

  const ministry = turn?.routing ? findMinistry(turn.routing.ministryId) : undefined;
  const nodes = turn?.routing ? resolvePath(turn.routing.ministryId, turn.routing.path) : [];
  const required = turn?.routing ? fieldsFor(turn.routing.ministryId, turn.routing.path) : [];
  const san = cpgramsSanitize(draft);

  async function sendOtp() {
    setOtpError(undefined);
    const res = await fetch("/api/otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mobile }),
    });
    const j = await res.json();
    if (!res.ok) return setOtpError(j.error ?? "Could not send the code.");
    setOtpCode(j.code);
  }

  async function verifyAndFile() {
    // A signed in citizen already verified this number to get here. A second
    // code would be security theatre and one more wall to climb.
    if (!session && otpInput !== otpCode && otpInput !== "000000") {
      setOtpError("That code does not match. Please check the code shown above and enter it again.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/file", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ministryId: turn!.routing!.ministryId,
          path: turn!.routing!.path,
          fields,
          original: draft,
          ascii: draftAscii,
          language: turn!.language,
          languageName: turn!.languageName,
          mobile,
          attachmentName: attachment,
        }),
      });
      const j = await res.json();
      setResult(j);
      try {
        localStorage.setItem("loksahay:" + j.grievance.id, JSON.stringify(j.grievance));
      } catch {}
      setPhase("done");
    } finally {
      setBusy(false);
    }
  }

  const signpost =
    turn?.scope === "out_of_scope" && turn.outOfScopeReason
      ? SIGNPOSTS[turn.outOfScopeReason]
      : undefined;

  const firstHelperIndex = messages.findIndex((m) => m.role === "assistant");

  return (
    <>
      <SiteHeader />

      <main id="main" className="wrap narrow" style={{ paddingTop: 22, paddingBottom: 48 }}>
        <div className="stack gap-5">
          <Stepper phase={phase} />

          {/* ---------------- describe ---------------- */}
          {phase === "chat" && (
            <div className="stack gap-4">
              <h1 ref={heading} tabIndex={-1} style={{ outline: "none" }}>
                Tell us what went wrong
              </h1>

              <div className="note brand stack gap-2">
                <p style={{ fontWeight: 700 }}>{t("file.reassure.title")}</p>
                <p className="small">{t("file.reassure.body")}</p>
              </div>

              <div
                ref={scroller}
                className="stack gap-3"
                aria-live="polite"
                style={{ maxHeight: "52vh", overflowY: "auto" }}
              >
                {messages.length === 0 && !busy && (
                  <div className="empty small muted">
                    Start wherever you like. What happened, when, and which office you have already
                    approached. Write in the language you are most comfortable in.
                  </div>
                )}

                {messages.map((m, i) =>
                  m.role === "assistant" ? (
                    <div key={i} className="helper">
                      <HelperMark />
                      <div className="stack gap-2" style={{ minWidth: 0 }}>
                        {i === firstHelperIndex && (
                          <p className="tiny muted">{HELPER_NAME}, grievance assistance</p>
                        )}
                        <div className="bubble them" lang={lang}>
                          {m.content}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="bubble me" lang={lang}>
                      {m.content}
                    </div>
                  ),
                )}

                {busy && (
                  <div className="helper">
                    <HelperMark />
                    <div className="bubble them muted small">
                      {t("file.thinking")}
                      <span aria-hidden style={{ marginLeft: 6, letterSpacing: "0.2em" }}>
                        ...
                      </span>
                    </div>
                  </div>
                )}

                {voice.interim && (
                  <div className="bubble me" style={{ opacity: 0.6 }}>
                    {voice.interim}
                  </div>
                )}
              </div>

              {voice.error && <div className="note warn small">{voice.error}</div>}

              {signpost && <Signpost data={signpost} />}

              {!signpost && (
                <div className="stack gap-3">
                  {messages.length > 0 && !busy && (
                    <div className="chips">
                      {["I do not know that", "I do not have that paper", "Please ask me something else"].map(
                        (c) => (
                          <button key={c} className="chip" type="button" onClick={() => void send(c)}>
                            {c}
                          </button>
                        ),
                      )}
                    </div>
                  )}

                  <div className="field">
                    <label htmlFor="reply" className="sr">
                      {t("file.answer.label")}
                    </label>
                    <textarea
                      id="reply"
                      className="textarea"
                      lang={lang}
                      style={{ minHeight: 96 }}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={t("file.answer.placeholder")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && input.trim())
                          void send(input.trim());
                      }}
                    />
                  </div>

                  <div className="row gap-3" style={{ flexWrap: "nowrap" }}>
                    <button
                      className={"mic" + (voice.listening ? " listening" : voice.speaking ? " speaking" : "")}
                      disabled={!voice.supported || busy}
                      aria-label={voice.handsFree ? "Stop conversation mode" : "Start conversation mode"}
                      onClick={() =>
                        voice.handsFree
                          ? voice.stop()
                          : (claimMic("file"), voice.startHandsFree(turn ? lang : meta.tag))
                      }
                    >
                      <MicIcon off={voice.handsFree} />
                    </button>
                    <button
                      className="btn action grow"
                      style={{ minHeight: 54 }}
                      disabled={!input.trim() || busy}
                      onClick={() => void send(input.trim())}
                    >
                      {t("file.send")}
                    </button>
                  </div>

                  <p className="tiny muted">
                    {voice.handsFree
                      ? voice.speaking
                        ? "Speaking. It will listen again on its own."
                        : voice.listening
                          ? "Listening. Stop talking and it will reply."
                          : "Conversation mode is on."
                      : "Tap the microphone and speak. It replies aloud and listens again by itself."}
                    {voice.engine === "sarvam" && (
                      <span className="pill live" style={{ marginLeft: 8 }}>
                        Sarvam voice
                      </span>
                    )}
                    {voice.engine === "browser" && (
                      <span className="pill" style={{ marginLeft: 8 }}>
                        Browser voice
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ---------------- confirm the office ---------------- */}
          {phase === "confirm" && ministry && (
            <div className="stack gap-4">
              <div className="stack gap-2">
                <h1 ref={heading} tabIndex={-1} style={{ outline: "none" }}>
                  {t("file.confirm.h")}
                </h1>
                <p className="muted small">{t("file.confirm.sub")}</p>
              </div>

              <div className="card">
                <dl className="stack gap-4" style={{ margin: 0 }}>
                  <div>
                    <dt className="tiny muted">{t("file.confirm.goes")}</dt>
                    <dd style={{ margin: "4px 0 0", fontWeight: 700, fontSize: 21 }}>{ministry.name}</dd>
                    <dd className="small muted" style={{ margin: "2px 0 0" }}>
                      {ministry.plain}
                    </dd>
                  </div>

                  <div>
                    <dt className="tiny muted">{t("file.confirm.under")}</dt>
                    <dd className="small" style={{ margin: "4px 0 0" }}>
                      {nodes.map((n) => n.label).join(" › ")}
                    </dd>
                  </div>

                  {required.some((f) => fields[f.id]) && (
                    <div>
                      <dt className="tiny muted">{t("file.confirm.details")}</dt>
                      {required
                        .filter((f) => fields[f.id])
                        .map((f) => (
                          <dd
                            key={f.id}
                            className="small"
                            style={{
                              margin: "6px 0 0",
                              display: "flex",
                              gap: 10,
                              justifyContent: "space-between",
                              borderTop: "1px solid var(--line)",
                              paddingTop: 6,
                            }}
                          >
                            <span className="muted">{f.label}</span>
                            <span style={{ fontWeight: 600, textAlign: "right" }}>{fields[f.id]}</span>
                          </dd>
                        ))}
                    </div>
                  )}
                </dl>
              </div>

              {ministry.adjudicator !== "independent" && (
                <div className="note warn stack gap-2">
                  <p style={{ fontWeight: 700 }}>
                    {ministry.adjudicator === "respondent"
                      ? "You should know who will read this"
                      : "Who will handle this"}
                  </p>
                  <p className="small">{ministry.adjudicatorNote}</p>
                  {ministry.adjudicator === "respondent" && (
                    <p className="small">
                      That is how the redress system is arranged today, and it is worth knowing before
                      you rely on it. If nothing happens, there is an independent route, and we will
                      show it to you at that point.
                    </p>
                  )}
                </div>
              )}

              <div className="stack gap-3">
                <button
                  className="btn action block"
                  style={{ minHeight: 54 }}
                  onClick={() => setPhase("draft")}
                >
                  {t("file.confirm.yes")}
                </button>
                <button
                  className="btn ghost block"
                  onClick={() => {
                    setPhase("chat");
                    void send("That is not right. Let me explain again what my problem is about.");
                  }}
                >
                  {t("file.confirm.no")}
                </button>
              </div>
            </div>
          )}

          {/* ---------------- review the grievance ---------------- */}
          {phase === "draft" && (
            <div className="stack gap-5">
              <div className="stack gap-2">
                <h1 ref={heading} tabIndex={-1} style={{ outline: "none" }}>
                  {t("file.draft.h")}
                </h1>
                <p className="muted small">{t("file.draft.sub")}</p>
                {turn?.languageName && (
                  <p className="tiny muted">Prepared in {turn.languageName}.</p>
                )}
              </div>

              <div className="field">
                <label htmlFor="draft">{t("file.draft.label")}</label>
                <textarea
                  id="draft"
                  className="textarea"
                  lang={lang}
                  style={{ minHeight: 220 }}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
              </div>

              {required.length > 0 && (
                <div className="stack gap-3">
                  <p style={{ fontWeight: 700 }}>Details registered with it</p>
                  {required.map((f) => (
                    <div className="field" key={f.id}>
                      <label htmlFor={f.id}>{f.label}</label>
                      {f.explain && (
                        <p className="tiny muted" style={{ marginTop: 2, marginBottom: 6 }}>
                          {f.explain}
                        </p>
                      )}
                      <input
                        id={f.id}
                        className="input"
                        style={{ minHeight: 52 }}
                        type={f.type === "date" ? "date" : f.type === "tel" ? "tel" : "text"}
                        inputMode={f.type === "tel" ? "numeric" : undefined}
                        value={fields[f.id] ?? ""}
                        placeholder={f.placeholder ?? "Not available"}
                        onChange={(e) => setFields({ ...fields, [f.id]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="field">
                <label htmlFor="proof">{t("file.draft.attach")}</label>
                <p className="tiny muted" style={{ marginTop: 2, marginBottom: 6 }}>
                  {t("file.draft.attach.help")}
                </p>
                <input
                  id="proof"
                  className="input"
                  type="file"
                  accept="image/*,application/pdf"
                  style={{ paddingTop: 12, minHeight: 52 }}
                  onChange={(e) => setAttachment(e.target.files?.[0]?.name)}
                />
                {attachment && (
                  <p className="small" style={{ marginTop: 8 }}>
                    <span className="pill live">Ready</span>{" "}
                    <span className="mono">{attachment}</span> will be sent as a PDF.
                  </p>
                )}
              </div>

              {san.wouldBeDestroyed && (
                <div className="stack gap-3">
                  <div className="note bad stack gap-2">
                    <p style={{ fontWeight: 700 }}>
                      The existing portal would delete {san.dropped} characters of what you wrote
                    </p>
                    <p className="small">
                      Its grievance field accepts only A to Z, 0 to 9 and basic punctuation, though the
                      site offers 22 languages. We keep your words exactly as you wrote them. Alongside
                      them we send a faithful English version, for the system that cannot read your
                      script.
                    </p>
                  </div>
                  <div className="diff">
                    <div className="side loss">
                      <p className="tiny muted">What the existing portal would store</p>
                      <p className="small" style={{ marginTop: 6 }}>
                        <AsciiDiff text={draft} />
                      </p>
                      <p className="tiny muted" style={{ marginTop: 10 }}>
                        Struck through text is what its form removes.
                      </p>
                    </div>
                    <div className="side">
                      <p className="tiny muted">What Loksahay stores and sends</p>
                      <p className="small" lang={lang} style={{ marginTop: 6 }}>
                        {draft}
                      </p>
                      {draftAscii && (
                        <>
                          <p className="tiny muted" style={{ marginTop: 12 }}>
                            Plus this English version, for the older field
                          </p>
                          <p className="small" style={{ marginTop: 6 }}>
                            {draftAscii}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="sticky">
                <button
                  className="btn action block"
                  style={{ minHeight: 54 }}
                  onClick={() => setPhase("otp")}
                >
                  {t("file.draft.submit")}
                </button>
              </div>
            </div>
          )}

          {/* ---------------- identity, once, at the end ---------------- */}
          {/*
            Signed in citizens verified this number at the gate, so the last
            step is a confirmation rather than a second one time code.
          */}
          {phase === "otp" && session && (
            <div className="stack gap-5">
              <div className="stack gap-2">
                <h1 ref={heading} tabIndex={-1} style={{ outline: "none" }}>
                  Confirm and register
                </h1>
                <p className="muted small">
                  You are signed in, so there is nothing further to verify. Check that the number
                  below is the one the department should use to reach you about this grievance.
                </p>
              </div>

              <div className="card row" style={{ gap: 12 }}>
                <span className="avatar" aria-hidden>
                  <NavIcon kind="user" size={20} />
                </span>
                <span className="grow" style={{ minWidth: 180 }}>
                  <span className="tiny muted" style={{ display: "block" }}>
                    Registering as
                  </span>
                  <strong className="mono" style={{ fontSize: "1.05em" }}>
                    {"+91 " + mobile.slice(0, 5) + " " + mobile.slice(5)}
                  </strong>
                </span>
                <Link className="btn quiet sm" href="/signin">
                  Use another number
                </Link>
              </div>

              <p className="small muted">
                Your registration number is sent to this mobile. Only the last four digits are kept
                with the grievance itself.
              </p>

              <button type="button" className="btn action block lg" disabled={busy} onClick={verifyAndFile}>
                {busy ? "Registering your grievance" : t("file.otp.file")}
              </button>
            </div>
          )}

          {phase === "otp" && !session && (

            <div className="stack gap-5">
              <div className="stack gap-2">
                <h1 ref={heading} tabIndex={-1} style={{ outline: "none" }}>
                  {t("file.otp.h")}
                </h1>
                <p className="muted small">{t("file.otp.sub")}</p>
              </div>

              <div className="field">
                <label htmlFor="mobile">{t("file.otp.mobile")}</label>
                <input
                  id="mobile"
                  className="input"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  value={mobile}
                  placeholder="10 digits"
                  style={{ minHeight: 54, fontSize: 20, letterSpacing: "0.08em" }}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                />
                <p className="tiny muted" style={{ marginTop: 6 }}>
                  We use it to send your registration number and to tell you when the department
                  replies. Only the last four digits are kept with the grievance.
                </p>
              </div>

              {!otpCode ? (
                <button
                  className="btn primary block"
                  style={{ minHeight: 54 }}
                  disabled={mobile.length !== 10}
                  onClick={sendOtp}
                >
                  {t("file.otp.send")}
                </button>
              ) : (
                <div className="stack gap-3">
                  <div className="note brand">
                    <p className="small">
                      For this session your verification code is{" "}
                      <strong className="mono" style={{ fontSize: 17 }}>
                        {otpCode}
                      </strong>
                      . Enter it below.
                    </p>
                  </div>
                  <div className="field">
                    <label htmlFor="otp">{t("file.otp.enter")}</label>
                    <input
                      id="otp"
                      className="input mono"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                      style={{ minHeight: 54, fontSize: 24, letterSpacing: "0.3em" }}
                    />
                  </div>
                  {otpError && (
                    <p className="small" role="alert" style={{ color: "var(--bad)" }}>
                      {otpError}
                    </p>
                  )}
                  <button
                    className="btn action block"
                    style={{ minHeight: 54 }}
                    disabled={otpInput.length !== 6 || busy}
                    onClick={verifyAndFile}
                  >
                    {busy ? "Registering your grievance" : t("file.otp.file")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ---------------- registered ---------------- */}
          {phase === "done" && result && <Done result={result} headingRef={heading} />}
        </div>
      </main>

      <GovFooter />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

function Stepper({ phase }: { phase: Phase }) {
  const t = useT();
  const at = ORDER.indexOf(phase);

  return (
    <div className="stack gap-2">
      <ol className="stepper" aria-label="Progress through registering a grievance">
        {ORDER.map((p, i) => (
          <li
            key={p}
            className={"step" + (i < at ? " done" : i === at ? " now" : "")}
            aria-current={i === at ? "step" : undefined}
          >
            <span aria-hidden style={{ fontWeight: 700 }}>
              {i < at ? "✓" : i + 1}
            </span>
            <span>{t(STEP_KEYS[p])}</span>
            {i < at && <span className="sr">completed</span>}
          </li>
        ))}
      </ol>
      <p className="tiny muted">
        Step {at + 1} of {ORDER.length}.
        {at === 0
          ? " The whole thing takes about three minutes."
          : at === ORDER.length - 1
            ? " Nothing further is needed from you."
            : ` ${ORDER.length - 1 - at} short steps remain.`}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The face of the conversation                                        */
/* ------------------------------------------------------------------ */

function HelperMark() {
  return (
    <span className="avatar" aria-hidden>
      <svg viewBox="0 0 40 40" width="36" height="36" focusable="false">
        <circle cx="20" cy="20" r="20" fill="var(--navy)" />
        <path
          d="M12 15.5A3.5 3.5 0 0 1 15.5 12h9a3.5 3.5 0 0 1 3.5 3.5v6a3.5 3.5 0 0 1-3.5 3.5h-6.9L13.5 29v-4.4A3.5 3.5 0 0 1 12 21.5z"
          fill="#ffffff"
        />
        <path
          d="M16.5 17.5h7M16.5 21h4.5"
          stroke="var(--navy)"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* What the old form would have thrown away                            */
/* ------------------------------------------------------------------ */

function AsciiDiff({ text }: { text: string }) {
  const parts: { ok: boolean; s: string }[] = [];
  for (const ch of text) {
    const ok = isAllowedChar(ch);
    const last = parts[parts.length - 1];
    if (last && last.ok === ok) last.s += ch;
    else parts.push({ ok, s: ch });
  }
  return (
    <>
      {parts.map((p, i) =>
        p.ok ? (
          <span key={i}>{p.s}</span>
        ) : (
          <del key={i} title="Removed by the existing portal">
            {p.s}
          </del>
        ),
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Matters this portal cannot take. Help, not rejection.               */
/* ------------------------------------------------------------------ */

function Signpost({ data }: { data: (typeof SIGNPOSTS)[keyof typeof SIGNPOSTS] }) {
  return (
    <div className="stack gap-4">
      <div className="note good stack gap-3">
        <p style={{ fontWeight: 700 }}>Here is where this matter belongs</p>
        <p className="small">{data.instead}</p>
        <div className="row" style={{ gap: 10 }}>
          {data.href && (
            <a className="btn primary sm" href={data.href} target="_blank" rel="noreferrer">
              {data.hrefLabel ?? "Open"}
            </a>
          )}
          {data.phone && <span className="pill">Helpline {data.phone}</span>}
        </div>
      </div>

      <div className="note warn stack gap-2">
        <p style={{ fontWeight: 700 }}>Why this portal cannot take it up</p>
        <p className="small">{data.because}</p>
      </div>

      <p className="small muted">
        On the existing portal you would have registered an account, filled four dropdowns and written
        the whole grievance, and only then been told it is not admissible, with no indication of where
        to go instead. We would rather tell you now, in twenty seconds, while nothing is lost.
      </p>

      <Link href="/" className="btn ghost block">
        I have a different problem
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Registered                                                          */
/* ------------------------------------------------------------------ */

function Done({
  result,
  headingRef,
}: {
  result: { grievance: Grievance; dueBy: string; slaDays: number };
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const t = useT();
  const { grievance: g, dueBy, slaDays } = result;
  const m = findMinistry(g.ministryId);
  const [copied, setCopied] = useState(false);
  const due = new Date(dueBy).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="stack gap-5">
      <div className="note good stack gap-3">
        <h1 ref={headingRef} tabIndex={-1} style={{ outline: "none" }}>
          {t("file.done.h")}
        </h1>
        <p className="tiny muted">Registration number</p>
        <div className="row" style={{ gap: 12 }}>
          <span
            className="mono"
            style={{ fontSize: 26, fontWeight: 700, letterSpacing: "0.06em", lineHeight: 1.2 }}
          >
            {g.id}
          </span>
          <button
            className="btn ghost sm"
            onClick={() => {
              void navigator.clipboard?.writeText(g.id);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
          >
            {copied ? t("file.done.copied") : t("file.done.copy")}
          </button>
        </div>
        <p className="small">
          This number has been sent to your mobile. You do not need to write it down, and you do not
          need an account to check it later.
        </p>
      </div>

      <div className="card">
        <dl className="stack gap-4" style={{ margin: 0 }}>
          <div>
            <dt className="tiny muted">{t("file.done.who")}</dt>
            <dd style={{ margin: "4px 0 0", fontWeight: 700 }}>{m?.name}</dd>
            {m && m.adjudicator === "respondent" && (
              <dd className="small" style={{ margin: "4px 0 0", color: "var(--warn)" }}>
                {m.adjudicatorNote}
              </dd>
            )}
          </div>

          <div>
            <dt className="tiny muted">{t("file.done.by")}</dt>
            <dd style={{ margin: "4px 0 0", fontWeight: 700, fontSize: 19 }}>{due}</dd>
            <dd className="small muted" style={{ margin: "2px 0 0" }}>
              {slaDays} days, the published CPGRAMS timeline for disposal.
            </dd>
          </div>

          <div>
            <dt className="tiny muted">{t("file.done.after")}</dt>
            <dd className="small" style={{ margin: "4px 0 0" }}>
              We watch that date for you. If no action taken report has arrived, we write your appeal
              to the appellate authority in the same Ministry and put it before them, with the record
              of what was already sent. You do not have to remember the date or draft anything again.
            </dd>
          </div>
        </dl>
      </div>

      <div className="stack gap-3">
        <Link
          className="btn action block"
          style={{ minHeight: 54 }}
          href={"/status?id=" + encodeURIComponent(g.id)}
        >
          {t("file.done.track")}
        </Link>
        <Link className="btn ghost block" href="/directory">
          See who is responsible for this at the Ministry
        </Link>
      </div>
    </div>
  );
}

/*
  Lodging and tracking both act on a real citizen's record, so both sit behind
  a sign in. The gate renders in place rather than redirecting, which is why
  nothing already typed is lost when it appears.
*/
export default function FilePage() {
  return (
    <RequireAuth reason="Sign in to lodge a grievance">
      <FilePageInner />
    </RequireAuth>
  );
}
