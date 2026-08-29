"use client";

import Link from "next/link";
import { SiteHeader, GovFooter } from "@/components/chrome";
import { useT } from "@/components/i18n-provider";
import { SIGNPOSTS } from "@/lib/signposts";
import type { SignpostId } from "@/lib/types";

type Stage = {
  n: number;
  title: string;
  what: string;
  who: string;
  when: string;
  /** Something the citizen can act on at this stage. */
  you?: string;
};

const STAGES: Stage[] = [
  {
    n: 1,
    title: "Grievance lodged and registration number issued",
    what:
      "Your grievance is recorded in your own words and a registration number is issued at once. The number is the only thing needed to check the status afterwards. No account is created.",
    who: "Loksahay intake, on your behalf",
    when: "Immediate. The number is shown on screen and sent to your mobile number.",
    you: "Keep the registration number. Write it down or photograph the screen.",
  },
  {
    n: 2,
    title: "Examined and forwarded to the subordinate office concerned",
    what:
      "The Ministry or Department that receives the grievance examines it, decides which office holds the matter, and forwards it there. If it belongs to another Ministry altogether, it is transferred, and you are told.",
    who: "The nodal grievance officer of the Ministry or Department",
    when: "Within the first few days of receipt, counted inside the overall timeline below.",
  },
  {
    n: 3,
    title: "The officer examines it and may ask you for information",
    what:
      "The dealing officer examines the records held by that office. They may telephone or write to you asking for a document, a reference number or a date. This is a normal part of the examination and not a rejection.",
    who: "The dealing officer in the subordinate office",
    when: "Inside the overall timeline below.",
    you: "Answer any request quickly. A grievance waiting on a missing document is the most common cause of delay.",
  },
  {
    n: 4,
    title: "Action taken report recorded and the grievance disposed of",
    what:
      "The officer records an action taken report setting out what was examined and what has been decided or done, and the grievance is marked disposed of. The report is shown to you in full on the status page. A file closed with no action taken report is not a redress, and the status page says so plainly.",
    who: "The dealing officer, under the Ministry or Department concerned",
    when: "Within 21 days of the grievance being lodged.",
  },
  {
    n: 5,
    title: "If you are not satisfied, appeal within 30 days",
    what:
      "An appeal is a short statement of why the reply does not address the matter. You do not need a lawyer, a fee or a fresh grievance. Quote the registration number and the date of disposal.",
    who: "You, to the appellate authority of the Ministry or Department",
    when: "Within 30 days of the date of disposal.",
    you: "If the file was closed with no action taken report, say exactly that in the first line of the appeal.",
  },
  {
    n: 6,
    title: "The appellate authority decides",
    what:
      "A senior officer, designated by the Ministry or Department as its appellate authority, reviews how the grievance was handled and records a reasoned decision. The decision is communicated to you.",
    who: "The nodal appellate authority of the Ministry or Department",
    when: "Within 30 days of receiving the appeal.",
  },
];

const TIMELINES: { figure: string; label: string; note: string }[] = [
  {
    figure: "21 days",
    label: "To redress a grievance",
    note: "Counted from the day the grievance is lodged.",
  },
  {
    figure: "30 days",
    label: "Where the matter needs longer",
    note: "An interim reply must be given, stating why more time is required.",
  },
  {
    figure: "30 days",
    label: "To appeal, and to decide an appeal",
    note: "30 days from disposal to appeal. 30 days from receipt for the authority to decide.",
  },
];

const EXCLUDED: SignpostId[] = [
  "subjudice",
  "rti",
  "service_matter",
  "suggestion",
  "religious",
  "state_subject",
  "consumer_private",
];

const EXCLUDED_TITLE: Record<SignpostId, string> = {
  subjudice: "Matters that are before a court",
  rti: "Requests for information",
  service_matter: "Service matters of government employees",
  suggestion: "Suggestions and ideas",
  religious: "Religious matters",
  state_subject: "Matters that belong to a State government",
  consumer_private: "Complaints against a private business",
};

export default function ProcessPage() {
  const t = useT();

  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap stack gap-5" style={{ paddingTop: 24, paddingBottom: 40 }}>
        <div className="stack gap-2">
          <h1>{t("process.h1")}</h1>
          <p className="lede muted">{t("process.sub")}</p>
        </div>

        <section className="stack gap-3">
          <div className="sectionhead">
            <h2 style={{ fontSize: 20 }}>The timelines, at a glance</h2>
          </div>
          <div className="grid3">
            {TIMELINES.map((k) => (
              <div key={k.label} className="card kpi stack gap-2">
                <p className="ink-accent" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>
                  {k.figure}
                </p>
                <p style={{ fontWeight: 600 }}>{k.label}</p>
                <p className="tiny muted">{k.note}</p>
              </div>
            ))}
          </div>
          <p className="small muted">
            The 21 day timeline applies to most grievances. Where a matter genuinely needs longer,
            the office must send you an interim reply within 30 days saying why, and continue to work
            on it. Silence is not one of the permitted outcomes.
          </p>
        </section>

        <section className="stack gap-3">
          <div className="sectionhead">
            <h2 style={{ fontSize: 20 }}>The six stages</h2>
            <p className="small muted">
              What happens at each stage, who does it, and by when. You are told at every stage where
              your grievance has reached.
            </p>
          </div>

          <ol className="tl stepper" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {STAGES.map((s) => (
              <li key={s.n} className="step">
                <div className="card stack gap-3">
                  <div className="row" style={{ gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                    <span className="pill">Stage {s.n}</span>
                    <h3 style={{ fontSize: 18, margin: 0 }}>{s.title}</h3>
                  </div>
                  <p className="small">{s.what}</p>
                  <div className="grid2">
                    <div className="meta stack gap-2">
                      <p className="tiny muted">Who does this</p>
                      <p className="small">{s.who}</p>
                    </div>
                    <div className="meta stack gap-2">
                      <p className="tiny muted">Published timeline</p>
                      <p className="small">{s.when}</p>
                    </div>
                  </div>
                  {s.you && (
                    <div className="note brand">
                      <p className="small">
                        <strong>What helps: </strong>
                        {s.you}
                      </p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="stack gap-3">
          <div className="sectionhead">
            <h2 style={{ fontSize: 20 }}>What this portal cannot take up</h2>
            <p className="small muted">
              Some matters cannot be dealt with as public grievances. That does not mean nobody can
              act on them. Each one has a proper channel, and it is named here.
            </p>
          </div>

          <div className="stack gap-3">
            {EXCLUDED.map((id) => {
              const sp = SIGNPOSTS[id];
              return (
                <div key={id} className="card stack gap-2">
                  <p style={{ fontWeight: 700 }}>{EXCLUDED_TITLE[id]}</p>
                  <p className="small muted">{sp.because}</p>
                  <p className="small">
                    <strong>Where it goes: </strong>
                    {sp.instead}
                  </p>
                  {(sp.href || sp.phone) && (
                    <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
                      {sp.href && (
                        <a href={sp.href} target="_blank" rel="noreferrer" className="small">
                          {sp.hrefLabel ?? sp.href}
                        </a>
                      )}
                      {sp.phone && (
                        <a href={"tel:" + sp.phone} className="small">
                          Helpline {sp.phone}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="small muted">
            Not sure which of these applies to you? Describe the problem when you lodge it. You will
            be told before you fill anything in, and pointed to the office that can act.
          </p>
        </section>

        <section>
          <div className="panelhead">If nothing happens</div>
          <div className="panelbody stack gap-3">
            <p className="small">
              If the 21 day timeline passes with no reply, or a file is closed without an action
              taken report, you have two remedies and both are free. Write to the nodal grievance
              officer of the Ministry or Department, quoting the registration number. If that does
              not produce an answer, appeal to the appellate authority within 30 days of disposal.
            </p>
            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <Link className="btn primary" href="/directory">
                Find the nodal officer
              </Link>
              <Link className="btn ghost" href="/status">
                Check the status of a grievance
              </Link>
            </div>
          </div>
        </section>

        <Link href="/file" className="btn action" style={{ alignSelf: "flex-start" }}>
          Lodge a grievance
        </Link>
      </main>
      <GovFooter />
    </>
  );
}
