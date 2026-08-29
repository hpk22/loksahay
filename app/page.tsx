"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { SiteHeader, GovFooter } from "@/components/chrome";
import { ActionIcon } from "@/components/seal";
import { useVoice, MicIcon } from "@/components/voice";
import { claimMic, useMicClaim } from "@/lib/mic";
import { useI18n } from "@/components/i18n-provider";
import { SIGNPOSTS } from "@/lib/signposts";
import type { LangCode } from "@/lib/i18n";

/*
  The live portal opens on an eight panel rotating carousel and asks a citizen
  to register an account before it will hear a word of their problem. This page
  does the opposite: the box you type into is the first thing on the screen, it
  is the largest thing on the screen, and it needs no account.
*/

type Example = { label: string; sub: string; text: string };

const EXAMPLES: Partial<Record<LangCode, Example[]>> = {
  en: [
    {
      label: "My pension has stopped",
      sub: "Pension and retirement",
      text: "My pension has not been credited for the last four months. I have been to the bank three times and asked at the office as well, but nobody gives me an answer.",
    },
    {
      label: "Mobile data is very slow",
      sub: "Telecommunications",
      text: "My mobile data has been extremely slow for the last two months in Pune. I have complained to the operator twice and nothing has changed.",
    },
    {
      label: "There is no water in our area",
      sub: "See what happens with this one",
      text: "There has been no water supply in our area for the last eight days and nobody from the office is responding.",
    },
  ],
  hi: [
    {
      label: "मेरी पेंशन बंद हो गई है",
      sub: "पेंशन और सेवानिवृत्ति",
      text: "मेरी पेंशन पिछले चार महीने से नहीं आई है। मैं तीन बार बैंक गया और कार्यालय में भी पूछा, पर कोई उत्तर नहीं देता।",
    },
    {
      label: "मोबाइल डेटा बहुत धीमा है",
      sub: "दूरसंचार",
      text: "पिछले दो महीने से मेरा मोबाइल डेटा बहुत धीमा चल रहा है। मैंने कंपनी में दो बार शिकायत की, कुछ नहीं हुआ।",
    },
    {
      label: "हमारे क्षेत्र में पानी नहीं आ रहा",
      sub: "देखिए इसका क्या होता है",
      text: "हमारे क्षेत्र में पिछले आठ दिन से पानी की आपूर्ति बंद है और कार्यालय से कोई उत्तर नहीं मिल रहा।",
    },
  ],
  mr: [
    {
      label: "माझी पेन्शन बंद झाली आहे",
      sub: "पेन्शन आणि सेवानिवृत्ती",
      text: "माझी पेन्शन गेल्या चार महिन्यांपासून जमा झालेली नाही. मी बँकेत तीन वेळा गेलो आणि कार्यालयातही चौकशी केली, पण कोणीही उत्तर देत नाही.",
    },
    {
      label: "मोबाईल डेटा खूप हळू आहे",
      sub: "दूरसंचार",
      text: "गेल्या दोन महिन्यांपासून माझा मोबाईल डेटा खूप हळू चालतो. मी कंपनीकडे दोनदा तक्रार केली, काहीही बदल झाला नाही.",
    },
    {
      label: "आमच्या भागात पाणी येत नाही",
      sub: "याचे काय होते ते पाहा",
      text: "आमच्या भागात गेल्या आठ दिवसांपासून पाणीपुरवठा बंद आहे आणि कार्यालयातून कोणीही उत्तर देत नाही.",
    },
  ],
};

const EXCLUDED = [
  { id: "rti", label: "Right to Information requests" },
  { id: "subjudice", label: "Matters before a court" },
  { id: "service_matter", label: "Service matters of government employees" },
  { id: "state_subject", label: "Subjects handled by your State government" },
  { id: "consumer_private", label: "Complaints against a private business" },
] as const;

function Check() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" aria-hidden>
      <path d="M4 12.5l5.5 5.5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const { t, lang, meta } = useI18n();
  const [text, setText] = useState("");
  const voice = useVoice((said) => setText((prev) => (prev ? prev + " " + said : said)));

  // Only one consumer may hold the microphone. If the floating assistant takes
  // it, this dictation button releases rather than transcribing the same room.
  useMicClaim("home", () => voice.stop());

  const examples = EXAMPLES[lang] ?? EXAMPLES.en!;

  const go = () => {
    if (!text.trim()) return;
    sessionStorage.setItem("loksahay:opening", text.trim());
    router.push("/file");
  };

  return (
    <>
      <SiteHeader />

      <section className="hero">
        <div className="wrap stack gap-4">
          <p className="sectionhead" style={{ color: "var(--saffron-bright)" }}>
            {t("brand.dept")}
          </p>
          <h1>{t("home.h1")}</h1>
          <p className="lede">{t("home.h1.sub")}</p>
        </div>
      </section>

      <main id="main" className="wrap stack gap-6" style={{ paddingBottom: 20 }}>
        {/* The one thing a person came here to do, lifted over the hero. */}
        <section className="hero-lift">
          <div className="panelhead row" style={{ justifyContent: "space-between" }}>
            <span>{t("home.box.title")}</span>
            <span className="tiny" style={{ opacity: 0.85, fontWeight: 500 }}>
              {t("home.box.nologin")}
            </span>
          </div>

          <div className="panelbody stack gap-4">
            <div className="field">
              <label htmlFor="problem" className="sr">
                {t("home.box.title")}
              </label>
              <textarea
                id="problem"
                className="textarea"
                lang={meta.tag}
                dir={meta.dir}
                value={voice.interim ? text + (text ? " " : "") + voice.interim : text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("home.placeholder")}
                style={{ minHeight: 148, fontSize: "1.05em" }}
              />
            </div>

            <div className="row" style={{ gap: 16 }}>
              <button
                type="button"
                className={"mic" + (voice.listening ? " listening" : "")}
                onClick={() => {
                  if (voice.listening) return voice.stop();
                  claimMic("home");
                  voice.listen(meta.tag);
                }}
                disabled={!voice.supported}
                aria-label={voice.listening ? "Stop listening" : t("home.speak")}
              >
                <MicIcon off={voice.listening} />
              </button>

              <div className="grow" style={{ minWidth: 220 }}>
                <p style={{ fontWeight: 700 }}>
                  {voice.listening ? t("home.listening") : t("home.speak")}
                </p>
                <p className="small muted">{t("home.speak.sub")}</p>
              </div>

              <button type="button" className="btn action lg" onClick={go} disabled={!text.trim()}>
                {t("home.continue")}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
                  <path d="M5 12h13M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <hr className="divider" />

            <div className="stack gap-2">
              <p className="small muted" style={{ fontWeight: 700 }}>
                {t("home.examples")}
              </p>
              <div className="chips">
                {examples.map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    className="chip"
                    onClick={() => setText(ex.text)}
                    style={{ flexDirection: "column", alignItems: "flex-start", gap: 1, borderRadius: 10, paddingBlock: 8 }}
                  >
                    <span>{ex.label}</span>
                    <span className="tiny muted" style={{ fontWeight: 500 }}>
                      {ex.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="trustbar" aria-label="What this service guarantees">
          {[1, 2, 3, 4].map((n) => (
            <div className="trust" key={n}>
              <span className="mark">
                <Check />
              </span>
              <span>
                <strong>{t(("home.trust." + n) as "home.trust.1")}</strong>
                <span>{t(("home.trust." + n + ".sub") as "home.trust.1.sub")}</span>
              </span>
            </div>
          ))}
        </section>

        <section className="stack gap-4">
          <h2>{t("home.tiles.title")}</h2>
          <div className="tiles">
            <Link href="/file" className="tile">
              <span className="circ">
                <ActionIcon kind="file" />
              </span>
              <strong>{t("home.tile.file")}</strong>
              <span className="sub">{t("home.tile.file.sub")}</span>
              <span className="go">{t("nav.cta")} →</span>
            </Link>
            <Link href="/status" className="tile">
              <span className="circ">
                <ActionIcon kind="track" />
              </span>
              <strong>{t("home.tile.status")}</strong>
              <span className="sub">{t("home.tile.status.sub")}</span>
              <span className="go">{t("status.check")} →</span>
            </Link>
            <Link href="/directory" className="tile">
              <span className="circ">
                <ActionIcon kind="directory" />
              </span>
              <strong>{t("home.tile.directory")}</strong>
              <span className="sub">{t("home.tile.directory.sub")}</span>
              <span className="go">{t("nav.directory")} →</span>
            </Link>
            <Link href="/process" className="tile">
              <span className="circ">
                <ActionIcon kind="help" />
              </span>
              <strong>{t("home.tile.process")}</strong>
              <span className="sub">{t("home.tile.process.sub")}</span>
              <span className="go">{t("nav.process")} →</span>
            </Link>
          </div>
        </section>


        {/*
          Three steps, stated before anyone commits. Knowing the shape of a
          process is what makes people willing to start it.
        */}
        <section className="stack gap-4">
          <div className="stack gap-1">
            <p className="sectionhead">How this works</p>
            <h2>Three steps, and you are done with the hard part after the first</h2>
          </div>
          <div className="grid3">
            {[
              {
                n: "1",
                kind: "help" as const,
                title: "Tell us what went wrong",
                body: "In your own words, typed or spoken. Nothing about ministries, category codes or official forms yet.",
              },
              {
                n: "2",
                kind: "file" as const,
                title: "We find the office and write it up",
                body: "Loksahay works out the Ministry, the category and the details the official form expects. You only check that it is right.",
              },
              {
                n: "3",
                kind: "track" as const,
                title: "You get a number, and a route if nothing happens",
                body: "Track it with that number alone, with no sign in. If the timeline lapses, or it is closed with no action recorded, the appeal is drafted for you.",
              },
            ].map((st) => (
              <div className="card stack gap-3" key={st.n}>
                <div className="row" style={{ gap: 10 }}>
                  <span
                    className="avatar"
                    style={{ background: "var(--navy)", fontWeight: 800, fontSize: 16 }}
                    aria-hidden
                  >
                    {st.n}
                  </span>
                  <span className="ink-brand" aria-hidden>
                    <ActionIcon kind={st.kind} size={26} />
                  </span>
                </div>
                <strong style={{ fontSize: "1.05em" }}>{st.title}</strong>
                <p className="small muted">{st.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What the service actually holds, in numbers a citizen can check. */}
        <section className="stack gap-4">
          <div className="stack gap-1">
            <p className="sectionhead">Coverage</p>
            <h2>Who you can reach through this service</h2>
          </div>
          <div className="trustbar" style={{ background: "var(--line)" }}>
            {[
              { v: "92", l: "Central Ministries and Departments with a named grievance officer" },
              { v: "37", l: "States and Union Territories with a nodal officer on record" },
              { v: "88", l: "Appellate authorities, for when a grievance goes nowhere" },
              { v: "13", l: "Languages you can write or speak your grievance in" },
            ].map((f) => (
              <div className="trust stack gap-2" key={f.v} style={{ alignItems: "flex-start" }}>
                <span className="kpi ink-brand">
                  {f.v}
                </span>
                <span className="small muted" style={{ lineHeight: 1.4 }}>
                  {f.l}
                </span>
              </div>
            ))}
          </div>
          <p className="tiny muted">
            Officer and appellate details are transcribed from the directories published by the
            national grievance portal. <Link href="/directory">Search the full directory</Link>.
          </p>
        </section>

        {/*
          On the live portal this list sits on slide four of a rotating carousel
          and names no destination, so a citizen learns their matter is excluded
          only after filling the whole form. Here it is on the front page and
          every line points somewhere.
        */}
        <section>
          <div className="panelhead">{t("home.excluded.title")}</div>
          <div className="panelbody stack gap-3">
            <p className="small muted">{t("home.excluded.sub")}</p>

            {EXCLUDED.map((e) => {
              const s = SIGNPOSTS[e.id];
              return (
                <div
                  key={e.id}
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    gap: 12,
                    paddingBottom: 12,
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <span className="grow" style={{ minWidth: 200 }}>
                    <strong>{e.label}</strong>
                    <span className="tiny muted" style={{ display: "block", lineHeight: 1.4 }}>
                      {s.instead}
                    </span>
                  </span>
                  {s.href ? (
                    <a className="btn ghost sm" href={s.href} target="_blank" rel="noreferrer">
                      {s.hrefLabel ?? "Open"}
                    </a>
                  ) : (
                    <span className="small muted">No administrative remedy</span>
                  )}
                </div>
              );
            })}

            <p className="tiny muted">{t("home.excluded.foot")}</p>
          </div>
        </section>
      </main>

      <GovFooter />
    </>
  );
}
