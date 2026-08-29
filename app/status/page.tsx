"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader, GovFooter } from "@/components/chrome";
import { RequireAuth } from "@/components/auth-gate";
import { useT } from "@/components/i18n-provider";
import { findMinistry, pathLabel } from "@/lib/taxonomy";
import type { Grievance } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

function fmt(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function days(a: string | Date, b: string | Date) {
  const x = (typeof a === "string" ? new Date(a) : a).getTime();
  const y = (typeof b === "string" ? new Date(b) : b).getTime();
  return Math.round((y - x) / 86_400_000);
}

function addDays(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d;
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

/* ------------------------------------------------------------------ */
/* Standing: the one answer a citizen came for                         */
/* ------------------------------------------------------------------ */

type Standing = {
  caption: string;
  headline: string;
  detail: string;
  label: string;
  colour: string;
  /** True when the published timeline has passed with nothing recorded. */
  overdue: boolean;
  closedEmpty: boolean;
  dueBy: Date;
  slaDays: number;
};

function standingOf(g: Grievance): Standing {
  const m = findMinistry(g.ministryId);
  const slaDays = m?.slaDays ?? 21;
  const dueBy = addDays(g.createdAt, slaDays);
  const left = days(new Date(), dueBy);
  const elapsed = days(g.createdAt, new Date());
  const closedEmpty = g.status !== "under_process" && !g.atr;

  if (g.status === "under_process") {
    const overdue = left < 0;
    const late = Math.abs(left);
    return {
      caption: "Time left to reply",
      headline: overdue
        ? "Overdue by " + late + " " + plural(late, "day", "days")
        : left === 0
          ? "Due today"
          : left + " " + plural(left, "day remaining", "days remaining"),
      detail: overdue
        ? "The " +
          slaDays +
          " day timeline passed on " +
          fmt(dueBy) +
          ". Nothing has been recorded since then."
        : "The office must record its reply by " +
          fmt(dueBy) +
          ". Lodged on " +
          fmt(g.createdAt) +
          ", " +
          elapsed +
          " " +
          plural(elapsed, "day", "days") +
          " ago.",
      label: overdue ? "Overdue" : "Under examination",
      colour: overdue ? "var(--bad)" : left <= 5 ? "var(--warn)" : "var(--good)",
      overdue,
      closedEmpty,
      dueBy,
      slaDays,
    };
  }

  const held = g.closedAt ? days(g.createdAt, g.closedAt) : elapsed;

  if (closedEmpty) {
    return {
      caption: "Outcome",
      headline: "Closed without an answer",
      detail:
        "Marked disposed of on " +
        (g.closedAt ? fmt(g.closedAt) : "an unrecorded date") +
        ", " +
        held +
        " " +
        plural(held, "day", "days") +
        " after it was lodged. No action taken report was recorded, so nothing describes what was examined or decided.",
      label: "Disposed",
      colour: "var(--bad)",
      overdue: false,
      closedEmpty,
      dueBy,
      slaDays,
    };
  }

  return {
    caption: "Outcome",
    headline: "Redressed",
    detail:
      "Disposed of on " +
      (g.closedAt ? fmt(g.closedAt) : fmt(new Date())) +
      ", " +
      held +
      " " +
      plural(held, "day", "days") +
      " after it was lodged, with a written action taken report.",
    label: "Redressed",
    colour: "var(--good)",
    overdue: false,
    closedEmpty,
    dueBy,
    slaDays,
  };
}

/* ------------------------------------------------------------------ */
/* Grievances held on this device                                      */
/* ------------------------------------------------------------------ */

function readDevice(): Grievance[] {
  const out: Grievance[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith("loksahay:")) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Grievance;
      if (parsed && typeof parsed.id === "string" && typeof parsed.createdAt === "string") {
        out.push(parsed);
      }
    }
  } catch {
    /* storage unavailable, the lookup box still works */
  }
  return out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function DeviceCard({ g }: { g: Grievance }) {
  const s = standingOf(g);
  const m = findMinistry(g.ministryId);
  return (
    <Link
      className="card stack gap-2"
      href={"/status?id=" + encodeURIComponent(g.id)}
      style={{ textDecoration: "none", color: "var(--ink)", borderLeft: "5px solid " + s.colour }}
    >
      <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span className="mono small">{g.id}</span>
        <span className="pill" style={{ color: s.colour, borderColor: s.colour }}>
          {s.label}
        </span>
      </div>
      <p style={{ fontWeight: 700 }}>{m?.plain ?? m?.name ?? "Grievance"}</p>
      <p className="small" style={{ color: s.colour, fontWeight: 600 }}>
        {s.headline}
      </p>
      <p className="tiny muted">Lodged on {fmt(g.createdAt)}</p>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Lookup                                                              */
/* ------------------------------------------------------------------ */

function Lookup() {
  const t = useT();
  const router = useRouter();
  const [id, setId] = useState("");
  const [mine, setMine] = useState<Grievance[] | null>(null);

  useEffect(() => {
    setMine(readDevice());
  }, []);

  const go = () => {
    const clean = id.trim();
    if (clean) router.push("/status?id=" + encodeURIComponent(clean));
  };

  return (
    <div className="stack gap-5">
      <div className="stack gap-2">
        <h1>{t("status.h1")}</h1>
        <p className="lede muted">{t("status.sub")}</p>
      </div>

      {mine && mine.length > 0 && (
        <section className="stack gap-3">
          <div className="sectionhead">
            <h2 style={{ fontSize: 20 }}>Grievances lodged from this device</h2>
            <p className="small muted">
              Open one to see the deadline and everything recorded so far. You do not need to type
              the registration number.
            </p>
          </div>
          <div className="stack gap-3">
            {mine.map((g) => (
              <DeviceCard key={g.id} g={g} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="panelhead">{t("status.label")}</div>
        <div className="panelbody stack gap-4">
          <div className="stack gap-2">
            <label htmlFor="rn">{t("status.label")}</label>
            <p className="small muted" id="rn-help">
              It looks like LKS/DOPPW/2026/0004821 and was shown to you when the grievance was
              registered. It is also in the message sent to your mobile number.
            </p>
            <input
              id="rn"
              className="input mono"
              value={id}
              aria-describedby="rn-help"
              autoComplete="off"
              placeholder="LKS/DOPPW/2026/0004821"
              onChange={(e) => setId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") go();
              }}
            />
          </div>
          <button className="btn action block" disabled={!id.trim()} onClick={go}>
            {t("status.check")}
          </button>
        </div>
      </section>

      {mine && mine.length === 0 && (
        <div className="card flat stack gap-3">
          <p style={{ fontWeight: 700 }}>Nothing has been lodged from this device yet</p>
          <p className="small muted">
            If you lodged a grievance on another phone or computer, enter its registration number
            above. If you have not lodged one, you can do that now. It takes about three minutes and
            no account is needed.
          </p>
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <Link className="btn primary" href="/file">
              Lodge a grievance
            </Link>
            <Link className="btn ghost" href="/process">
              How redress works
            </Link>
          </div>
        </div>
      )}

      <div className="note brand">
        <p className="small">
          Lost the registration number and this is not the device you lodged it from? The nodal
          officer of the Ministry or Department concerned can retrieve it from your mobile number.
          Their contact details are in the{" "}
          <Link href="/directory">directory of nodal officers</Link>.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

function Detail({ id }: { id: string }) {
  const [g, setG] = useState<Grievance | null>(null);
  const [missing, setMissing] = useState(false);
  const [letter, setLetter] = useState<string>();
  const [drafting, setDrafting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const local = typeof window !== "undefined" ? localStorage.getItem("loksahay:" + id) : null;
    if (local) {
      setG(JSON.parse(local) as Grievance);
      return;
    }
    fetch("/api/status?id=" + encodeURIComponent(id))
      .then(async (r) => (r.ok ? ((await r.json()).grievance as Grievance) : null))
      .then((x) => (x ? setG(x) : setMissing(true)))
      .catch(() => setMissing(true));
  }, [id]);

  const draftAppeal = useCallback(async () => {
    if (!g) return;
    setDrafting(true);
    try {
      const res = await fetch("/api/appeal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: g.id,
          original: g.original,
          languageName: g.languageName,
          filedOn: g.createdAt,
          closedOn: g.closedAt ?? new Date().toISOString(),
          ministry: findMinistry(g.ministryId)?.name ?? "",
        }),
      });
      const j = await res.json();
      setLetter(j.letter);
    } finally {
      setDrafting(false);
    }
  }, [g]);

  if (missing) {
    return (
      <div className="stack gap-4">
        <h1>No grievance found with that number</h1>
        <p className="lede muted">
          Registration numbers are long and easy to mistype. Check the number against the message
          you were sent, then try again.
        </p>
        <div className="card flat stack gap-3">
          <p style={{ fontWeight: 700 }}>Two things worth checking</p>
          <ul className="stack gap-2 small muted" style={{ margin: 0, paddingLeft: 20 }}>
            <li>
              The number has four parts separated by a slash, such as LKS/DOPPW/2026/0004821. The
              digit 0 and the letter O are easy to confuse.
            </li>
            <li>
              A grievance opened on another phone or computer is still traceable by the same number.
              The number is what matters, not the device.
            </li>
          </ul>
        </div>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <Link className="btn primary" href="/status">
            Try another number
          </Link>
          <Link className="btn ghost" href="/directory">
            Contact a nodal officer
          </Link>
          <Link className="btn ghost" href="/file">
            Lodge a grievance
          </Link>
        </div>
      </div>
    );
  }

  if (!g) {
    return (
      <div className="stack gap-3">
        <h1>Checking the status</h1>
        <p className="muted">One moment. Retrieving the record for {id}.</p>
      </div>
    );
  }

  const s = standingOf(g);
  const m = findMinistry(g.ministryId);
  const appealBy = g.closedAt ? addDays(g.closedAt, 30) : null;
  const appealDaysLeft = appealBy ? days(new Date(), appealBy) : 0;
  const needsNextStep = s.overdue || s.closedEmpty;

  return (
    <div className="stack gap-5">
      <div className="stack gap-2">
        <p className="mono small muted">{g.id}</p>
        <h1>{m?.plain ?? m?.name ?? "Your grievance"}</h1>
        <p className="small muted">
          With {m?.name ?? "the department concerned"}. Lodged on {fmt(g.createdAt)}.
        </p>
      </div>

      {/* The countdown. This is the answer people came for. */}
      <div
        className="card stack gap-3"
        style={{ borderLeft: "6px solid " + s.colour }}
        aria-live="polite"
      >
        <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span className="tiny muted">{s.caption}</span>
          <span className="pill" style={{ color: s.colour, borderColor: s.colour }}>
            {s.label}
          </span>
        </div>
        <p style={{ fontSize: 38, lineHeight: 1.12, fontWeight: 700, color: s.colour }}>
          {s.headline}
        </p>
        <p className="small muted">{s.detail}</p>
      </div>

      {g.status === "under_process" && m && m.adjudicator === "respondent" && (
        <div className="note warn">
          <p className="small">{m.adjudicatorNote}</p>
        </div>
      )}

      {/* What has happened, in order. */}
      <section className="stack gap-3">
        <h2 style={{ fontSize: 20 }}>What has happened so far</h2>
        <ul className="tl">
          {g.timeline.map((e, i) => (
            <li key={i} className={e.tone}>
              <p className="tiny muted">{fmt(e.date)}</p>
              <p style={{ fontWeight: 600 }}>{e.label}</p>
              {e.detail && <p className="small muted">{e.detail}</p>}
              {e.actor && <p className="tiny muted">{e.actor}</p>}
            </li>
          ))}
          {g.status === "under_process" && (
            <li>
              <p className="tiny muted">By {fmt(s.dueBy)}</p>
              <p style={{ fontWeight: 600, color: "var(--muted)" }}>Reply due</p>
              <p className="small muted">
                The office is expected to record an action taken report by this date.
              </p>
            </li>
          )}
        </ul>
      </section>

      {/* Action taken report, or the plain absence of one. */}
      {g.atr ? (
        <section>
          <div className="panelhead">Action taken report</div>
          <div className="panelbody stack gap-3">
            <p>{g.atr}</p>
            <p className="tiny muted">
              Recorded by {g.officer?.role ?? "the dealing officer"}
              {g.officer?.organisation ? ", " + g.officer.organisation : ""}
              {g.closedAt ? " on " + fmt(g.closedAt) : ""}.
            </p>
          </div>
        </section>
      ) : g.status !== "under_process" ? (
        <div className="note bad stack gap-2">
          <p style={{ fontWeight: 700 }}>No action taken report was recorded</p>
          <p className="small">
            The file was closed without any description of what was examined, by whom, or what was
            decided. A closure of this kind is not a redress of your grievance, and this page will
            not describe it as one. You may appeal.
          </p>
        </div>
      ) : null}

      {/* The citizen's own words, kept intact. */}
      <section>
        <div className="panelhead">Your grievance, as you wrote it</div>
        <div className="panelbody stack gap-3">
          <p lang={g.language} style={{ whiteSpace: "pre-wrap" }}>
            {g.original}
          </p>
          {g.droppedChars > 0 && (
            <p className="tiny muted">
              {g.droppedChars} characters of your text cannot be carried in the department&apos;s
              Latin-only field. Your wording is held here in full, and a faithful English version was
              transmitted alongside it.
            </p>
          )}
          <details>
            <summary className="small muted" style={{ cursor: "pointer" }}>
              What was transmitted to the department
            </summary>
            <p className="small mono" style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
              {pathLabel(g.ministryId, g.path)}
              {"\n\n"}
              {g.ascii}
            </p>
          </details>
        </div>
      </section>

      {/* Recourse, stated plainly rather than buried. */}
      {needsNextStep && (
        <section>
          <div className="panelhead">What you can do next</div>
          <div className="panelbody stack gap-4">
            <div className="stack gap-2">
              <p style={{ fontWeight: 700 }}>Take it to the nodal officer</p>
              <p className="small muted">
                Every Ministry, Department, State and Union Territory has a named officer
                responsible for public grievances. Quote the registration number above when you
                write or call. This is usually faster than waiting.
              </p>
              <Link className="btn primary" href="/directory" style={{ alignSelf: "flex-start" }}>
                Contact the nodal officer for this Ministry
              </Link>
            </div>

            <div className="divider" />

            <div className="stack gap-3">
              <p style={{ fontWeight: 700 }}>Appeal to the appellate authority</p>
              {appealBy ? (
                <p className="small muted">
                  An appeal may be made within 30 days of the date of disposal.{" "}
                  {appealDaysLeft > 0
                    ? appealDaysLeft +
                      " " +
                      plural(appealDaysLeft, "day remains", "days remain") +
                      ", until " +
                      fmt(appealBy) +
                      "."
                    : "That window closed on " +
                      fmt(appealBy) +
                      ". You may still write to the appellate authority, stating why the appeal is late."}{" "}
                  The appellate authority is required to decide within 30 days of receiving it.
                </p>
              ) : (
                <p className="small muted">
                  The published timeline has passed without a reply. You may write to the appellate
                  authority of the Ministry or Department, quoting the registration number and the
                  date on which the grievance was lodged. The appellate authority is required to
                  decide within 30 days of receiving an appeal.
                </p>
              )}

              {s.closedEmpty &&
                (!letter ? (
                  <button
                    className="btn action"
                    onClick={draftAppeal}
                    disabled={drafting}
                    style={{ alignSelf: "flex-start" }}
                  >
                    {drafting ? "Preparing the letter" : "Prepare my appeal letter"}
                  </button>
                ) : (
                  <div className="stack gap-3">
                    <label htmlFor="appeal">Your appeal. Change anything you wish.</label>
                    <textarea
                      id="appeal"
                      className="textarea"
                      lang={g.language}
                      style={{ minHeight: 220 }}
                      value={letter}
                      onChange={(e) => setLetter(e.target.value)}
                    />
                    <button
                      className="btn primary"
                      style={{ alignSelf: "flex-start" }}
                      onClick={() => {
                        void navigator.clipboard?.writeText(letter);
                        setCopied(true);
                      }}
                    >
                      {copied ? "Copied" : "Copy the letter"}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <Link className="btn ghost" href="/status">
          Check another grievance
        </Link>
        <Link className="btn ghost" href="/file">
          Lodge a new grievance
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StatusInner() {
  const id = useSearchParams().get("id");
  return id ? <Detail id={id} /> : <Lookup />;
}

function StatusPageInner() {
  return (
    <main id="main" className="wrap stack gap-5" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <Suspense fallback={<p className="muted">Checking the status.</p>}>
        <StatusInner />
      </Suspense>
    </main>
  );
}

/*
  Lodging and tracking both act on a real citizen's record, so both sit behind
  a sign in. The gate renders in place rather than redirecting, which is why
  nothing already typed is lost when it appears.
*/
export default function StatusPage() {
  return (
    <>
      <SiteHeader />
      <RequireAuth reason="Sign in to check the status of your grievance">
        <StatusPageInner />
      </RequireAuth>
      <GovFooter />
    </>
  );
}
