"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useI18n, useT } from "@/components/i18n-provider";
import { MicIcon, useVoice } from "@/components/voice";
import { claimMic, useMicClaim } from "@/lib/mic";
import { MINISTRIES, fieldsFor, findMinistry, pathLabel, resolvePath } from "@/lib/taxonomy";
import type { FieldSpec, TaxNode } from "@/lib/types";
import s from "./form-flow.module.css";

/*
  The form route.

  Everything else in this service assumes the citizen does not know which
  Department owns their problem, and works that out by talking to them. That is
  the right default. It is not the right only option. Someone standing in a
  noisy queue, someone whose phone has no working microphone, someone who has
  lodged this same grievance four times and knows exactly where it goes, for
  them a conversation is an obstacle, not a kindness.

  So this is the traditional route: pick the Department, walk the category tree,
  fill the service-specific details, write the problem in your own words. It
  ends by handing the caller the same four facts the conversational path
  produces, so the steps after it need no branch of their own.

  Two things it refuses to reproduce from the live portal:

  * A dropdown of official Department names and nothing else. "Department of
    Telecommunications" tells a person with slow mobile data nothing. Every
    Department here leads with what a citizen would actually call it, and
    carries the official name underneath.
  * Silence about who receives the grievance. The moment a Department is picked,
    its adjudicatorNote and its published timeline are on screen, before any
    effort has been spent.

  What it deliberately does not do: render a stepper (the page owns that, and
  this route and the conversation are both the same "Describe" stage), and
  check admissibility (lib/taxonomy.ts is a closed list of eight central
  Ministries, so an RTI request or a State subject cannot be picked here in the
  first place, the taxonomy is the safety net).

  The microphone is strictly opt-in and never starts by itself. See the note
  above the dictation button.
*/

/* -------------------------------------------------------------------------
   Every user-facing string this component writes lives in this one block, in
   English only, so a later pass can lift it out into lib/i18n.ts in one move.
   Strings that already exist as keys there are read through useT() instead and
   are deliberately absent from this block. Nothing is added to lib/i18n.ts.
   ------------------------------------------------------------------------- */
const T = {
  ministryH: "Which of these is your grievance about?",
  ministryHelp:
    "Pick the one that sounds closest. If two seem to fit, pick either, you are shown where it is going before anything is registered, and you can come back and change it.",
  ministryLegend: "The Department your grievance belongs to",
  ministryErr:
    "Choose the one closest to your grievance. If none of them sounds right, go back and talk it through instead, we will work it out from what you say.",

  categoryHelp: "Choose the line that describes it best.",
  categoryErr: "Choose one of these to carry on.",
  categoryFirst: "What is it about?",
  categoryWithin: "Within ",
  categoryWithinEnd: ", which is it?",
  categoryLeaf: "Nothing further is asked after this one.",

  detailsH: "A few details this Department asks for",
  detailsHelp:
    "These are the details the Department needs to trace your case. If you do not have one of them, say so and the grievance goes without it rather than stalling here.",
  fieldErr: "Fill this in, or mark it as one you do not have.",
  notHave: "I do not have this",
  notHaveValue: "Not available",

  describeH: "Now tell us what went wrong, in your own words",
  describeHelp:
    "This is the part an officer actually reads. Write it the way you would say it: what happened, when, and which office you have already approached. Write in whichever language you are most comfortable in.",
  describePlaceholder:
    "My pension has not been credited for four months. I have been to the bank three times and nobody answers.",
  describeErr:
    "Please describe what happened in a sentence or two. Even one line in your own words is enough, it is what the officer reads first.",

  dictate: "Dictate this instead of typing",
  dictateStop: "Stop dictating",
  dictateHint:
    "Optional. The microphone opens only when you press this, takes one answer, and closes again. Nothing is spoken back to you.",
  dictateListening: "Listening. Speak now, then pause.",
  dictateNone: "This device has no microphone available, so type your answer instead.",

  timeline: "They must respond within",
  days: "days",
  whoReads: "You should know who will read this",
  whoHandles: "Who will handle this",
  respondentExtra:
    "That is how the redress system is arranged today, and it is worth knowing before you rely on it. If nothing happens, there is an independent route, and we show it to you at that point.",

  clearedPath:
    "You changed the Department, so the categories you had chosen were cleared, they belonged to the old one. What you wrote in your own words has been kept.",

  back: "Back",
  backToChoice: "Back to the two ways in",
  next: "Continue",
  finish: "Check this and continue",
  errorPrefix: "Error:",
} as const;

/** Identifies this component in the page-wide microphone claim. See lib/mic.ts. */
const MIC_OWNER = "form";

/** Below this the description is almost certainly not yet a grievance. */
const MIN_DESCRIPTION = 10;

/**
 * What the caller receives. Deliberately the same four facts the conversational
 * path produces, so the steps after this one need no branch of their own.
 */
export type FormResult = {
  /** Ministry.id from lib/taxonomy. */
  ministryId: string;
  /** Ordered node ids, main category first. */
  path: string[];
  /** Keyed by FieldSpec.id, exactly as fieldsFor() names them. */
  fields: Record<string, string>;
  /** The citizen's own words, in their own script. Never rewritten here. */
  description: string;
};

type Step =
  | { kind: "ministry" }
  | { kind: "category"; level: number }
  | { kind: "fields" }
  | { kind: "describe" };

/** The options offered at one level of the tree, driven entirely by the data. */
function optionsAt(ministryId: string, path: string[], level: number): TaxNode[] {
  const m = findMinistry(ministryId);
  if (!m) return [];
  if (level === 0) return m.tree;
  const nodes = resolvePath(ministryId, path.slice(0, level));
  return nodes[level - 1]?.children ?? [];
}

/** Drop answers whose field no longer exists under the newly chosen branch. */
function pruneFields(prev: Record<string, string>, ministryId: string, path: string[]) {
  const keep = new Set(fieldsFor(ministryId, path).map((f) => f.id));
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(prev)) if (keep.has(k)) out[k] = v;
  return out;
}

export function FormFlow({
  onComplete,
  onBack,
}: {
  onComplete: (result: FormResult) => void;
  onBack: () => void;
}) {
  const t = useT();
  // The chosen interface language seeds speech recognition, so dictation hears
  // a Tamil speaker in Tamil from the first word rather than after a guess.
  const { meta } = useI18n();

  const [ministryId, setMinistryId] = useState("");
  const [path, setPath] = useState<string[]>([]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [description, setDescription] = useState("");

  const [cursor, setCursor] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clearedPath, setClearedPath] = useState(false);

  const heading = useRef<HTMLHeadingElement>(null);
  const firstPaint = useRef(true);

  const uid = useId();
  const id = (suffix: string) => uid + suffix;

  /*
    Dictation only. The transcript is appended to whatever has already been
    typed, so a person can type half of it and speak the rest.
  */
  const voice = useVoice((said) => {
    setDescription((prev) => (prev.trim() ? prev.trimEnd() + " " + said : said));
  });

  // Only one consumer may hold the microphone. If the floating assistant or the
  // conversational flow takes it, this stands down instead of talking over it.
  // Declared here, above every branch, so it is never conditionally registered.
  useMicClaim(MIC_OWNER, () => voice.stop());

  // Hand the device back on the way out. `stop` is stable, so this is unmount.
  const voiceStop = voice.stop;
  useEffect(() => voiceStop, [voiceStop]);

  /*
    The walk is derived from the taxonomy on every render rather than stored,
    which is what keeps it honest: depth varies by branch, a node with no
    children ends the walk, and a leaf with no fields skips the details step
    altogether. Nothing here knows how deep any particular branch goes.
  */
  const steps = useMemo<Step[]>(() => {
    const out: Step[] = [{ kind: "ministry" }];
    if (!findMinistry(ministryId)) return out;

    for (let level = 0; ; level++) {
      const options = optionsAt(ministryId, path, level);
      if (options.length === 0) break; // a leaf: the walk ends here
      out.push({ kind: "category", level });
      const answered = path[level] && options.some((n) => n.id === path[level]);
      if (!answered) return out; // nothing further is knowable yet
    }

    if (fieldsFor(ministryId, path).length > 0) out.push({ kind: "fields" });
    out.push({ kind: "describe" });
    return out;
  }, [ministryId, path]);

  // A late change higher up the tree can shorten the walk under the cursor.
  const at = Math.min(cursor, steps.length - 1);
  const step = steps[at];

  const ministry = findMinistry(ministryId);
  const required = ministryId ? fieldsFor(ministryId, path) : [];

  // Each step announces itself: focus lands on the new heading, never back at
  // the top of the document, so a screen reader hears where it now is.
  useEffect(() => {
    if (firstPaint.current) {
      firstPaint.current = false;
      return;
    }
    heading.current?.focus();
  }, [at]);

  /* ------------------------------ answering ----------------------------- */

  function pickMinistry(nextId: string) {
    if (nextId === ministryId) return;
    // Changing the Department necessarily invalidates the category path: those
    // node ids belong to the old tree and mean nothing under the new one. Clear
    // them and say so, rather than carrying a stale breadcrumb forward.
    setClearedPath(path.length > 0);
    setMinistryId(nextId);
    setPath([]);
    setFields((prev) => pruneFields(prev, nextId, []));
    setErrors({});
  }

  function pickCategory(level: number, nodeId: string) {
    const next = [...path.slice(0, level), nodeId];
    setPath(next);
    // Answers survive if the same field still exists on the new branch, which
    // is what makes correcting a wrong turn cheap.
    setFields((prev) => pruneFields(prev, ministryId, next));
    setErrors({});
  }

  /* ----------------------------- validation ----------------------------- */

  /** The errors for the current step, keyed by the control's own id suffix. */
  function validate(): Record<string, string> {
    if (step.kind === "ministry") {
      return ministryId ? {} : { ministry: T.ministryErr };
    }
    if (step.kind === "category") {
      const key = "cat-" + step.level;
      return path[step.level] ? {} : { [key]: T.categoryErr };
    }
    if (step.kind === "fields") {
      const out: Record<string, string> = {};
      for (const f of required) if (!(fields[f.id] ?? "").trim()) out[f.id] = T.fieldErr;
      return out;
    }
    return description.trim().length >= MIN_DESCRIPTION ? {} : { description: T.describeErr };
  }

  /** Move focus to the first control the citizen still has to deal with. */
  function focusFirst(keys: string[]) {
    if (typeof document === "undefined") return;
    for (const k of keys) {
      const el = document.getElementById(id("-" + k));
      if (el) {
        el.focus();
        return;
      }
    }
  }

  function advance() {
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      focusFirst(Object.keys(found));
      return;
    }
    setErrors({});
    setClearedPath(false);
    if (step.kind === "describe") {
      onComplete({ ministryId, path, fields, description: description.trim() });
      return;
    }
    setCursor(at + 1);
  }

  function goBack() {
    setErrors({});
    if (at === 0) {
      voice.stop();
      onBack();
      return;
    }
    setCursor(at - 1);
  }

  /* ------------------------------ dictation ----------------------------- */

  function toggleDictation() {
    if (voice.listening) {
      voice.stop();
      return;
    }
    // Announce the claim first so every other consumer on the page stands down,
    // then open the microphone for exactly one answer. Never startHandsFree:
    // nothing on this route may keep the device or speak back at the citizen.
    claimMic(MIC_OWNER);
    voice.listen(meta.tag);
  }

  /* -------------------------------- render ------------------------------ */

  return (
    <div className="stack gap-5">
      {/* the breadcrumb, from the moment there is one, in the portal's own idiom */}
      {ministry && (
        <div className={s.crumb}>
          <span className="tiny muted">{t("file.confirm.under")}</span>
          <p className="small" style={{ fontWeight: 600 }}>
            {pathLabel(ministryId, path)}
          </p>
        </div>
      )}

      {/* who receives this, and by when, before any effort is spent on it */}
      {ministry && (
        <div className="stack gap-3">
          <div
            className={
              ministry.adjudicator === "respondent"
                ? "note warn stack gap-2"
                : "note brand stack gap-2"
            }
          >
            <p style={{ fontWeight: 700 }}>
              {ministry.adjudicator === "respondent" ? T.whoReads : T.whoHandles}
            </p>
            {ministry.adjudicatorNote && <p className="small">{ministry.adjudicatorNote}</p>}
            {ministry.adjudicator === "respondent" && <p className="small">{T.respondentExtra}</p>}
            <p className="small">
              {T.timeline}{" "}
              <strong>
                {ministry.slaDays} {T.days}
              </strong>
              .
            </p>
          </div>

          {clearedPath && <p className={"small " + s.cleared}>{T.clearedPath}</p>}
        </div>
      )}

      {/* ---------------- Department ---------------- */}
      {step.kind === "ministry" && (
        <div className="stack gap-4">
          <div className="stack gap-2">
            <h1 ref={heading} tabIndex={-1} className={s.stepHead}>
              {T.ministryH}
            </h1>
            <p className="small muted">{T.ministryHelp}</p>
          </div>

          {/*
            Not a <select>. A native select carries one line per option, and the
            one line the live portal picks is the official name, precisely the
            failure this service exists to correct. Radios are native controls
            too, keyboard and screen-reader complete, no custom dropdown
            anywhere, and they let what a citizen would actually call the
            Department lead, with the official name underneath it.
          */}
          {/*
            role="radiogroup" is set explicitly because aria-invalid belongs on
            the group, not on an individual radio, the radio role does not
            support it. The legend is named explicitly for the same reason: an
            explicit role overrides the implicit fieldset mapping, so the name
            is wired by hand rather than left to it.
          */}
          <fieldset
            className={s.fieldset}
            role="radiogroup"
            aria-labelledby={id("-ministry-legend")}
            aria-invalid={errors.ministry ? true : undefined}
            aria-describedby={errors.ministry ? id("-ministry-err") : undefined}
          >
            <legend id={id("-ministry-legend")} className="sr">
              {T.ministryLegend}
            </legend>
            <div className={s.opts}>
              {MINISTRIES.map((m, i) => (
                <label key={m.id} className={s.opt + (ministryId === m.id ? " " + s.optOn : "")}>
                  <input
                    type="radio"
                    className={s.radio}
                    name={id("-ministry-group")}
                    id={i === 0 ? id("-ministry") : undefined}
                    value={m.id}
                    checked={ministryId === m.id}
                    aria-describedby={errors.ministry ? id("-ministry-err") : undefined}
                    onChange={() => pickMinistry(m.id)}
                  />
                  <span className={s.optText}>
                    <span className={s.optPlain}>{m.plain}</span>
                    <span className={s.optName}>{m.name}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <FieldError id={id("-ministry-err")} message={errors.ministry} />
        </div>
      )}

      {/* ---------------- the category tree, one level at a time ---------------- */}
      {step.kind === "category" && (
        <CategoryStep
          key={"cat-" + step.level}
          options={optionsAt(ministryId, path, step.level)}
          chosen={path[step.level]}
          headingRef={heading}
          firstId={id("-cat-" + step.level)}
          groupName={id("-cat-" + step.level + "-group")}
          errorId={id("-cat-" + step.level + "-err")}
          error={errors["cat-" + step.level]}
          parentLabel={
            step.level === 0
              ? undefined
              : resolvePath(ministryId, path.slice(0, step.level))[step.level - 1]?.label
          }
          onPick={(nodeId) => pickCategory(step.level, nodeId)}
        />
      )}

      {/* ---------------- what this particular service asks for ---------------- */}
      {step.kind === "fields" && (
        <div className="stack gap-4">
          <div className="stack gap-2">
            <h1 ref={heading} tabIndex={-1} className={s.stepHead}>
              {T.detailsH}
            </h1>
            <p className="small muted">{T.detailsHelp}</p>
          </div>

          <div className="stack gap-4">
            {required.map((f) => (
              <ServiceField
                key={f.id}
                spec={f}
                value={fields[f.id] ?? ""}
                inputId={id("-" + f.id)}
                explainId={id("-" + f.id + "-x")}
                errorId={id("-" + f.id + "-err")}
                error={errors[f.id]}
                onChange={(v) => setFields((prev) => ({ ...prev, [f.id]: v }))}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---------------- their own words ---------------- */}
      {step.kind === "describe" && (
        <div className="stack gap-4">
          <div className="stack gap-2">
            <h1 ref={heading} tabIndex={-1} className={s.stepHead}>
              {T.describeH}
            </h1>
            <p className="small muted">{T.describeHelp}</p>
          </div>

          <div className="field">
            <label htmlFor={id("-description")}>{t("file.draft.label")}</label>
            <textarea
              id={id("-description")}
              className="textarea"
              lang={meta.tag}
              dir={meta.dir}
              style={{ minHeight: 160 }}
              value={description}
              placeholder={T.describePlaceholder}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={errors.description ? id("-description-err") : undefined}
              onChange={(e) => setDescription(e.target.value)}
            />
            <FieldError id={id("-description-err")} message={errors.description} />
          </div>

          {/*
            Dictation, offered and never imposed. One press takes one answer and
            closes the microphone again. There is no hands-free mode on this
            route and nothing is read back aloud: a person who chose the form
            chose it partly to avoid exactly that.
          */}
          <div className="stack gap-2">
            {voice.supported ? (
              <>
                <div className="row gap-3">
                  <button
                    type="button"
                    className="btn ghost"
                    aria-pressed={voice.listening}
                    onClick={toggleDictation}
                  >
                    <MicIcon off={voice.listening} />
                    {voice.listening ? T.dictateStop : T.dictate}
                  </button>
                  {voice.listening && <span className="pill live">{T.dictateListening}</span>}
                </div>
                <p className="tiny muted">{T.dictateHint}</p>
                <p className="sr" aria-live="polite">
                  {voice.listening ? T.dictateListening : ""}
                </p>
                {voice.interim && (
                  <p className="small muted" lang={meta.tag}>
                    {voice.interim}
                  </p>
                )}
              </>
            ) : (
              <p className="tiny muted">{T.dictateNone}</p>
            )}
            {voice.error && <div className="note warn small">{voice.error}</div>}
          </div>
        </div>
      )}

      {/* ---------------- move ---------------- */}
      <div className={s.actions}>
        <button type="button" className="btn ghost" onClick={goBack}>
          {at === 0 ? T.backToChoice : T.back}
        </button>
        {/*
          Never disabled. A button that goes grey without saying why leaves the
          citizen guessing; this one always responds, and if something is
          missing it says so beside the control that is missing it, and puts the
          cursor there.
        */}
        <button
          type="button"
          className="btn action grow"
          style={{ minHeight: 54 }}
          onClick={advance}
        >
          {step.kind === "describe" ? T.finish : T.next}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One level of the tree                                               */
/* ------------------------------------------------------------------ */

function CategoryStep({
  options,
  chosen,
  headingRef,
  firstId,
  groupName,
  errorId,
  error,
  parentLabel,
  onPick,
}: {
  options: TaxNode[];
  chosen: string | undefined;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  firstId: string;
  groupName: string;
  errorId: string;
  error?: string;
  parentLabel?: string;
  onPick: (nodeId: string) => void;
}) {
  // The question names the branch it is narrowing, so "Billing related" is not
  // asked in a vacuum three screens after the Department was chosen.
  const question = parentLabel
    ? T.categoryWithin + parentLabel + T.categoryWithinEnd
    : T.categoryFirst;

  return (
    <div className="stack gap-4">
      <div className="stack gap-2">
        <h1 ref={headingRef} tabIndex={-1} className={s.stepHead}>
          {question}
        </h1>
        <p className="small muted">{T.categoryHelp}</p>
      </div>

      {/* See the note on the Department group: aria-invalid belongs on the group. */}
      <fieldset
        className={s.fieldset}
        role="radiogroup"
        aria-labelledby={groupName + "-legend"}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      >
        <legend id={groupName + "-legend"} className="sr">
          {question}
        </legend>
        <div className={s.opts}>
          {options.map((n, i) => (
            <label key={n.id} className={s.opt + (chosen === n.id ? " " + s.optOn : "")}>
              <input
                type="radio"
                className={s.radio}
                name={groupName}
                id={i === 0 ? firstId : undefined}
                value={n.id}
                checked={chosen === n.id}
                aria-describedby={error ? errorId : undefined}
                onChange={() => onPick(n.id)}
              />
              <span className={s.optText}>
                <span className={s.optPlain}>{n.label}</span>
                {!n.children && <span className={s.optName}>{T.categoryLeaf}</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <FieldError id={errorId} message={error} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One service-specific field                                          */
/* ------------------------------------------------------------------ */

function ServiceField({
  spec,
  value,
  inputId,
  explainId,
  errorId,
  error,
  onChange,
}: {
  spec: FieldSpec;
  value: string;
  inputId: string;
  explainId: string;
  errorId: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const describedBy = [spec.explain ? explainId : "", error ? errorId : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="field">
      <label htmlFor={inputId}>{spec.label}</label>
      {/*
        `explain` is the whole point of this step: it turns the portal's own
        wording into something a person can actually answer. Render it, always.
      */}
      {spec.explain && (
        <p id={explainId} className="tiny muted" style={{ marginTop: 2, marginBottom: 6 }}>
          {spec.explain}
        </p>
      )}
      <input
        id={inputId}
        className="input"
        style={{ minHeight: 52 }}
        type={spec.type === "date" ? "date" : spec.type === "tel" ? "tel" : "text"}
        inputMode={spec.type === "tel" ? "numeric" : undefined}
        value={value}
        placeholder={spec.placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className={s.fieldFoot}>
        <FieldError id={errorId} message={error} />
        {/* Not knowing a reference number must not be the end of the road. */}
        <button type="button" className="btn quiet sm" onClick={() => onChange(T.notHaveValue)}>
          {T.notHave}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* An error, beside the thing that caused it                           */
/* ------------------------------------------------------------------ */

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className={"small " + s.err}>
      <span className="sr">{T.errorPrefix} </span>
      {message}
    </p>
  );
}
