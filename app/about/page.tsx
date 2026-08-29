"use client";

import Link from "next/link";
import { SiteHeader, GovFooter } from "@/components/chrome";
import { useT } from "@/components/i18n-provider";
import { LANGUAGES } from "@/lib/i18n";

export default function AboutPage() {
  const t = useT();

  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap stack gap-5" style={{ paddingTop: 24, paddingBottom: 40 }}>
        <div className="stack gap-2">
          <h1>{t("nav.about")}</h1>
          <p className="lede muted">
            Loksahay helps a citizen lodge a public grievance with the right government office, in
            the language they speak, and follow it until it is answered. The service is free and no
            account is required.
          </p>
        </div>

        <section>
          <div className="panelhead">What this service does</div>
          <div className="panelbody stack gap-3">
            <p className="small">
              You describe what went wrong, in your own words, by typing or by speaking. Loksahay
              identifies the Ministry or Department responsible, prepares the grievance in the form
              that office expects, and asks you to read it before anything is registered. A
              registration number is issued at once.
            </p>
            <p className="small">
              After that, the service keeps track of the timeline on your behalf. The status page
              shows how many days remain before a reply is due, everything recorded so far, and the
              action taken report when it arrives. If the timeline passes, or a grievance is closed
              with nothing recorded, you are told plainly and shown the next step.
            </p>
            <p className="small">
              Some matters cannot be taken up as grievances. Those are checked at the start, before
              you fill anything in, and you are directed to the office that can act.{" "}
              <Link href="/process">How redress works</Link> sets out each stage and the published
              timeline for it.
            </p>
          </div>
        </section>

        <section>
          <div className="panelhead">Who it is for</div>
          <div className="panelbody stack gap-3">
            <p className="small">
              It is built for anyone entitled to a government service that has not been delivered: a
              pensioner whose payment has stopped, a family waiting on a document, a household whose
              connection has failed, a person who has written three times and had no reply.
            </p>
            <p className="small">
              It assumes no familiarity with departmental structure. You are never asked to name a
              Ministry, choose a category, or know which office holds your file. Working that out is
              the service&apos;s task. It also assumes you may be using a small screen on a slow
              connection, and that you may prefer to speak rather than type.
            </p>
          </div>
        </section>

        <section className="stack gap-3">
          <div className="sectionhead">
            <h2 style={{ fontSize: 20 }}>Languages</h2>
            <p className="small muted">
              The whole interface, including the person who reads your grievance back to you, works
              in thirteen languages. Choose one at the top of any page. Your grievance is held in the
              script you wrote it in, and is never reduced to a rough English summary.
            </p>
          </div>
          <div className="chips row" style={{ flexWrap: "wrap", gap: 10 }}>
            {LANGUAGES.map((l) => (
              <span
                key={l.code}
                className="chip pill"
                style={{ textTransform: "none", letterSpacing: 0, padding: "8px 12px" }}
              >
                <span lang={l.tag} dir={l.dir} style={{ fontWeight: 700 }}>
                  {l.native}
                </span>
                <span className="tiny muted">{l.english}</span>
              </span>
            ))}
          </div>
        </section>

        <section>
          <div className="panelhead">How grievances are routed</div>
          <div className="panelbody stack gap-3">
            <p className="small">
              Every grievance belongs to one Ministry or Department, and within it to a category and
              a subordinate office. Loksahay reads what you have written, identifies that route, and
              shows it to you in plain words before registering anything. If the route is wrong, you
              say so and it is corrected.
            </p>
            <p className="small">
              Where a matter is the responsibility of a State government rather than a central
              Ministry, you are told at that point instead of after a month of waiting. Where the
              officer who will examine your grievance works for the organisation you are complaining
              about, that is stated on the status page, because it affects what you should expect.
            </p>
            <p className="small">
              The named nodal officers and appellate authorities for every Ministry, Department,
              State and Union Territory are listed in the{" "}
              <Link href="/directory">directory of nodal officers</Link>.
            </p>
          </div>
        </section>

        <section>
          <div className="panelhead">Accessibility</div>
          <div className="panelbody stack gap-3">
            <p className="small">
              Readers of this service are often elderly, tired, or reading on a phone in poor light.
              Four controls are provided, and all of them work on every page.
            </p>
            <ul className="stack gap-2 small" style={{ margin: 0, paddingLeft: 20 }}>
              <li>
                <strong>Text size.</strong> Three sizes, set from the strip at the top of the page.
                The whole page resizes, not just part of it.
              </li>
              <li>
                <strong>High contrast.</strong> A black and yellow mode for low vision, set from the
                same strip.
              </li>
              <li>
                <strong>Speech input.</strong> You may say your grievance out loud instead of typing
                it, in any of the thirteen languages.
              </li>
              <li>
                <strong>Speech output.</strong> Replies are read back aloud, so the service can be
                used without reading anything.
              </li>
            </ul>
            <p className="small muted">
              Every page can be operated by keyboard alone, carries a skip link to the main content,
              and is laid out to be usable on a screen 320 pixels wide.
            </p>
          </div>
        </section>

        <section>
          <div className="panelhead">Privacy</div>
          <div className="panelbody stack gap-3">
            <p className="small">
              No account is required. There is no password, no captcha and no session that expires
              while you are thinking. You are not asked who you are until the moment of registration,
              and nothing you have written is lost if you decide to stop before then.
            </p>
            <p className="small">
              Your mobile number is used for two purposes only: to verify that the grievance comes
              from you, and to send you updates on it. It is not used for anything else.
            </p>
            <p className="small">
              What you write is shared with the department handling your grievance, and with nobody
              beyond it. Your grievance is not sold, published, or passed to any other organisation.
              Where a detail is not needed, it is not asked for, which is why some fields request
              only the last four digits of a number.
            </p>
          </div>
        </section>

        <div className="note brand">
          <p className="small">
            Loksahay is an independent public service and is not operated by the Government of India.
            It assists citizens in reaching the correct government office.
          </p>
        </div>

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <Link className="btn action" href="/file">
            Lodge a grievance
          </Link>
          <Link className="btn ghost" href="/status">
            Check the status of a grievance
          </Link>
          <Link className="btn ghost" href="/process">
            How redress works
          </Link>
        </div>
      </main>
      <GovFooter />
    </>
  );
}
