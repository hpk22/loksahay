/*
  The introductory band that sits directly below the main navigation on the
  homepage, above the intake box.

  Deliberately NOT a carousel. pgportal.gov.in rotates eight banners on its
  homepage; auto-advancing panels hide content from exactly the people this
  serves — a pensioner reading slowly, a screen-reader user moved mid-sentence,
  someone on a slow connection who has already scrolled past slide one before
  slide two loads. So everything is presented at once, statically, in the order
  a first-time visitor needs it: what this is, how it works, what it covers.

  This is a server component. It holds no state and no handlers, so it carries
  no "use client" directive. It is imported by app/page.tsx, which is itself a
  client component, so it still ends up in that client module graph — expected,
  and free, because this file ships no interactivity of its own.

  Every figure in COPY.figures is counted from data in this repo. Nothing here
  is estimated. See the note under the figures for provenance.
*/

import { ActionIcon } from "./seal";
import s from "./hero.module.css";

/* ------------------------------------------------------------------ */
/* Copy — the only place user-facing text lives in this file           */
/* ------------------------------------------------------------------ */
/**
 * EVERY user-facing string sits in this one block so a later i18n pass can
 * lift it into lib/i18n.ts without touching the JSX below. English only, on
 * purpose: the interface is moving to "one chosen language governs the whole
 * page", so there are no mixed-script second lines here.
 *
 * Where lib/i18n.ts already reserves a key for a string, the key is noted
 * beside it, so extraction is a rename rather than a rewrite.
 */
const COPY = {
  eyebrow: "Public grievance assistance for citizens of India", // brand.dept
  headline: "You should not have to know which ministry owns your problem.",
  lede:
    "Describe what went wrong, once, in your own words. Loksahay works out which office is responsible, writes the grievance in the form the government expects, and follows it up.",

  /* Trust chips — home.trust.1 … home.trust.4 in lib/i18n.ts */
  trustLabel: "What this service guarantees",
  trust: [
    { label: "Free of cost", sub: "No fee at any stage" },
    { label: "No account needed", sub: "Mobile number only, at the end" },
    { label: "13 languages", sub: "Type it or speak it" },
    { label: "Reply within 21 days", sub: "The published timeline" },
  ],

  stepsTitle: "How this works",
  steps: [
    {
      kind: "help" as const,
      title: "Tell us what went wrong",
      body:
        "In your own words, typed or spoken. Nothing about ministries, category codes or official forms yet.",
    },
    {
      kind: "file" as const,
      title: "We find the office and write it up",
      body:
        "Loksahay works out the ministry, the category path and the service-specific details the official form expects. You only check that it is right.",
    },
    {
      kind: "track" as const,
      title: "You get a number, and a route if nothing happens",
      body:
        "Track it with that number alone, with no sign in. If the 21 days lapse, or it is closed with no action recorded, the appeal to the Nodal Appellate Authority is drafted for you.",
    },
  ],

  coverageTitle: "Who you can reach through this service",
  figures: [
    // CENTRAL_NODAL in lib/directory.ts — 92 entries, S.No. 1 to 92
    { value: "92", label: "Central ministries and departments with a named grievance officer" },
    // STATE_NODAL in lib/directory.ts — 37 entries, S.No. 1 to 37
    { value: "37", label: "States and union territories with a nodal officer on record" },
    // APPELLATE in lib/directory.ts — 88 entries, S.No. 1 to 88
    { value: "88", label: "Appellate authorities, for when a grievance goes nowhere" },
    // LANGUAGES in lib/i18n.ts — 13 entries
    { value: "13", label: "Languages you can write or speak your grievance in" },
  ],
  coverageNote:
    "Officer and appellate figures are counted from the directories published by the national grievance portal and transcribed into this prototype. The department routing tree here is a working subset of eight ministries; the officer directory is the complete published list.",
} as const;

/* ------------------------------------------------------------------ */

/**
 * The site's tick mark, drawn here rather than imported: the one in
 * components/seal.tsx is baked into FooterBadge, which is styled for the dark
 * footer ground and is illegible on paper. Same path, same stroke, so the two
 * read as one family.
 */
function Tick() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      aria-hidden
    >
      <path d="M4 12.5l5.5 5.5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Hero() {
  return (
    <section className={s.intro} aria-labelledby="hero-title">
      {/* 1. The promise, on a solid institutional ground. */}
      <div className={s.band}>
        <p className={s.eyebrow}>{COPY.eyebrow}</p>
        <h1 id="hero-title" className={s.headline}>
          {COPY.headline}
        </h1>
        <p className={s.lede}>{COPY.lede}</p>
      </div>

      <ul className={s.trustbar} aria-label={COPY.trustLabel}>
        {COPY.trust.map((t) => (
          <li key={t.label} className={s.trust}>
            <span className={s.trustMark} aria-hidden>
              <Tick />
            </span>
            <span className={s.trustText}>
              <strong>{t.label}</strong>
              <span>{t.sub}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* 2. Three steps, in the panel idiom used across the rest of the site. */}
      <div>
        <h2 className={"panelhead " + s.panelHeading}>{COPY.stepsTitle}</h2>
        <div className="panelbody">
          <ol className={s.steps}>
            {COPY.steps.map((step, i) => (
              <li key={step.title} className={s.stepItem}>
                <span className={s.stepTop}>
                  <span className={s.stepNum} aria-hidden>
                    {i + 1}
                  </span>
                  <span className={s.stepIcon} aria-hidden>
                    <ActionIcon kind={step.kind} size={26} />
                  </span>
                </span>
                <strong className={s.stepTitle}>{step.title}</strong>
                <span className={s.stepBody}>{step.body}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* 3. Coverage, with counted figures and their provenance. */}
      <div>
        <h2 className={"panelhead " + s.panelHeading}>{COPY.coverageTitle}</h2>
        <div className="panelbody">
          <dl className={s.figures}>
            {COPY.figures.map((f) => (
              <div key={f.label} className={s.figure}>
                <dt className={"kpi " + s.figureValue}>{f.value}</dt>
                <dd className={s.figureLabel}>{f.label}</dd>
              </div>
            ))}
          </dl>
          <p className={s.figureNote}>{COPY.coverageNote}</p>
        </div>
      </div>
    </section>
  );
}
