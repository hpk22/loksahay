"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  APPELLATE,
  CENTRAL_NODAL,
  STATE_NODAL,
  type AppellateAuthority,
  type NodalOfficer,
} from "@/lib/directory";
import { useT } from "@/components/i18n-provider";

/* ------------------------------------------------------------------ *
 * Both published tables carry the same eight fields, so one row type
 * serves the whole page.
 * ------------------------------------------------------------------ */
type Row = NodalOfficer | AppellateAuthority;
type TabKey = "central" | "state" | "appeal";

/** Cards added per page. A full first paint of 92 cards is slow on a cheap phone. */
const PAGE = 40;
const TABS: TabKey[] = ["central", "state", "appeal"];

/**
 * The published tables name the same body in two different styles. The nodal
 * table prints "Posts", the appellate table prints "Department of Posts".
 * Lower-casing, dropping punctuation and dropping the leading "Ministry of" or
 * "Department of" brings the two into line so the pair can be found.
 */
function normOrg(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^(the\s+)?(ministry|department|deptt|dept)\s+(of|for)\s+/, "")
    .trim();
}

/** A second, more forgiving key that also settles singular against plural. */
function looseOrg(value: string): string {
  return normOrg(value)
    .split(" ")
    .map((w) => {
      if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
      if (w.length > 4 && w.endsWith("s")) return w.slice(0, -1);
      return w;
    })
    .join(" ");
}

function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return "tel:" + digits;
}

function haystack(row: Row, appeal?: AppellateAuthority): string {
  return [row.org, row.name, row.designation, appeal?.org, appeal?.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/* ------------------------------------------------------------------ *
 * Copy button
 * ------------------------------------------------------------------ */
function CopyButton({ value, label }: { value: string; label: string }) {
  const t = useT();
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return; // clipboard blocked, the number is still on screen to read
    }
    setDone(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 1800);
  }

  return (
    <button
      type="button"
      className="btn ghost sm"
      onClick={copy}
      aria-label={label}
      aria-live="polite"
    >
      {done ? "Copied" : t("dir.copy")}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Contact block: phone, email, address
 * ------------------------------------------------------------------ */
function Contact({ row, rank }: { row: Row; rank: string }) {
  const t = useT();
  const [openAddress, setOpenAddress] = useState(false);
  const addressId = "addr-" + rank + "-" + row.id;

  return (
    <div className="stack gap-3">
      <div>
        <p style={{ fontWeight: 700, margin: 0 }}>{row.name || "Name not published"}</p>
        {row.designation ? <p className="small muted" style={{ margin: 0 }}>{row.designation}</p> : null}
      </div>

      {row.phone ? (
        <div className="row gap-2 meta" style={{ flexWrap: "wrap", alignItems: "center" }}>
          <a
            className="btn sm"
            href={telHref(row.phone)}
            aria-label={t("dir.call") + " " + (row.name || row.org) + ", " + row.phone}
          >
            {t("dir.call")}
          </a>
          <span className="mono small">{row.phone}</span>
          <CopyButton value={row.phone} label={t("dir.copy") + " phone number " + row.phone} />
        </div>
      ) : null}

      {row.email ? (
        <div className="row gap-2 meta" style={{ flexWrap: "wrap", alignItems: "center" }}>
          <a
            className="btn sm"
            href={"mailto:" + row.email}
            aria-label={t("dir.email") + " " + (row.name || row.org) + ", " + row.email}
          >
            {t("dir.email")}
          </a>
          <span className="mono small" style={{ wordBreak: "break-all" }}>
            {row.email}
          </span>
          <CopyButton value={row.email} label={t("dir.copy") + " e-mail address " + row.email} />
        </div>
      ) : null}

      {row.address ? (
        <div>
          <button
            type="button"
            className="btn ghost sm"
            aria-expanded={openAddress}
            aria-controls={addressId}
            onClick={() => setOpenAddress((v) => !v)}
          >
            {openAddress ? "Hide address" : "Show address"}
          </button>
          {openAddress ? (
            <p id={addressId} className="tiny muted" style={{ marginTop: 8 }}>
              {row.address}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * One result card. The nodal officer and the appellate authority are two
 * rungs of the same ladder, so where both are published they sit on one card.
 * ------------------------------------------------------------------ */
function OfficerCard({
  row,
  appeal,
  showLadder,
}: {
  row: Row;
  appeal?: AppellateAuthority;
  showLadder: boolean;
}) {
  return (
    <article className="dcard card">
      <div className="dcard-head">
        <h3 style={{ margin: 0, fontSize: "1.05em" }}>{row.org}</h3>
      </div>

      <div className="dcard-body stack gap-3">
        {showLadder ? (
          <p className="tiny muted" style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            First contact
          </p>
        ) : null}

        <Contact row={row} rank="a" />

        {showLadder && appeal ? (
          <>
            <div className="divider" style={{ borderTop: "1px solid var(--line)" }} />
            <p className="tiny muted" style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              If they do not respond, appeal to
            </p>
            <Contact row={appeal} rank="b" />
          </>
        ) : null}

        {showLadder && !appeal ? (
          <p className="tiny muted" style={{ margin: 0 }}>
            No separate appeal authority is published for this department. Write again to the same
            office and ask for the matter to be placed before the appellate authority.
          </p>
        ) : null}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ *
 * The page
 * ------------------------------------------------------------------ */
export function DirectoryView() {
  const t = useT();
  const [tab, setTab] = useState<TabKey>("central");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  /* Pair every central department with its appellate authority, once. */
  const centralPairs = useMemo(() => {
    const strict = new Map<string, AppellateAuthority>();
    const loose = new Map<string, AppellateAuthority | null>();
    for (const a of APPELLATE) {
      const k = normOrg(a.org);
      if (!strict.has(k)) strict.set(k, a);
      const lk = looseOrg(a.org);
      loose.set(lk, loose.has(lk) ? null : a);
    }
    return CENTRAL_NODAL.map((row) => {
      const appeal = strict.get(normOrg(row.org)) ?? loose.get(looseOrg(row.org)) ?? undefined;
      return { row, appeal: appeal ?? undefined, hay: haystack(row, appeal ?? undefined) };
    });
  }, []);

  const statePairs = useMemo(
    () => STATE_NODAL.map((row) => ({ row, appeal: undefined, hay: haystack(row) })),
    [],
  );

  const appealPairs = useMemo(
    () => APPELLATE.map((row) => ({ row, appeal: undefined, hay: haystack(row) })),
    [],
  );

  const source = tab === "central" ? centralPairs : tab === "state" ? statePairs : appealPairs;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return source;
    const terms = q.split(/\s+/);
    return source.filter((item) => terms.every((term) => item.hay.includes(term)));
  }, [source, query]);

  const visible = filtered.slice(0, limit);
  const remaining = filtered.length - visible.length;

  /* Letter groups for the States and Union Territories tab. */
  const letterGroups = useMemo(() => {
    if (tab !== "state") return [];
    const groups: Array<{ letter: string; items: typeof visible }> = [];
    for (const item of visible) {
      const letter = (item.row.org[0] || "#").toUpperCase();
      const last = groups[groups.length - 1];
      if (last && last.letter === letter) last.items.push(item);
      else groups.push({ letter, items: [item] });
    }
    return groups;
  }, [tab, visible]);

  const counts: Record<TabKey, number> = {
    central: CENTRAL_NODAL.length,
    state: STATE_NODAL.length,
    appeal: APPELLATE.length,
  };
  const tabLabel: Record<TabKey, string> = {
    central: t("dir.tab.central"),
    state: t("dir.tab.state"),
    appeal: t("dir.tab.appeal"),
  };

  function pickTab(next: TabKey) {
    setTab(next);
    setLimit(PAGE);
  }

  function onTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    pickTab(TABS[next]);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="stack gap-5">
      <header className="stack gap-2">
        <h1 style={{ margin: 0 }}>{t("dir.h1")}</h1>
        <p className="lede muted" style={{ margin: 0 }}>
          {t("dir.sub")}
        </p>
      </header>

      {/* When to use this page */}
      <section className="note brand stack gap-2" aria-label="When to use this page">
        <p style={{ margin: 0 }}>
          Use this page only when a grievance has already been lodged and the date given for its
          disposal has passed. Quote your registration number in every call and every message,
          otherwise the office cannot trace the file.
        </p>
        <p className="small" style={{ margin: 0 }}>
          <Link href="/file">Lodge a grievance</Link>
          <span className="muted"> or </span>
          <Link href="/status">check the status of one already lodged</Link>.
        </p>
      </section>

      {/* Search */}
      <div className="searchbar stack gap-2">
        <label className="sr" htmlFor="dir-search">
          {t("dir.search")}
        </label>
        <input
          id="dir-search"
          className="input"
          type="search"
          autoFocus
          autoComplete="off"
          placeholder={t("dir.search")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE);
          }}
        />
      </div>

      {/* Tabs */}
      <div className="tabs row gap-2" role="tablist" aria-label={t("dir.h1")} style={{ flexWrap: "wrap" }}>
        {TABS.map((key, i) => (
          <button
            key={key}
            type="button"
            className="tab"
            role="tab"
            id={"tab-" + key}
            aria-selected={tab === key}
            aria-controls={"panel-" + key}
            tabIndex={tab === key ? 0 : -1}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            onClick={() => pickTab(key)}
            onKeyDown={(e) => onTabKeyDown(e, i)}
          >
            {tabLabel[key]} ({counts[key]})
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={"panel-" + tab}
        aria-labelledby={"tab-" + tab}
        tabIndex={-1}
        className="stack gap-4"
      >
        <p className="small muted" aria-live="polite" style={{ margin: 0 }}>
          {filtered.length} {t("dir.results")}
          {query.trim() ? " for " + query.trim() : ""}
        </p>

        {/* A to Z index, States and Union Territories only */}
        {tab === "state" && letterGroups.length > 1 ? (
          <nav className="chips row gap-2" aria-label="Jump to a letter" style={{ flexWrap: "wrap" }}>
            {letterGroups.map((g) => (
              <a key={g.letter} className="chip" href={"#letter-" + g.letter}>
                {g.letter}
              </a>
            ))}
          </nav>
        ) : null}

        {filtered.length === 0 ? (
          <div className="empty card stack gap-2">
            <p style={{ margin: 0 }}>{t("dir.empty")}</p>
            <p className="small muted" style={{ margin: 0 }}>
              Search for the subject rather than the full title, for example Railways, Posts,
              Pension or Kerala. States and Union Territories are listed on their own tab. If you
              are not sure which office your matter belongs to,{" "}
              <Link href="/file">lodge the grievance</Link> and it will be routed for you.
            </p>
          </div>
        ) : tab === "state" ? (
          <div className="stack gap-4">
            {letterGroups.map((g) => (
              <section key={g.letter} className="stack gap-3">
                <h2
                  id={"letter-" + g.letter}
                  className="sectionhead"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    margin: 0,
                    padding: "6px 0",
                    background: "var(--page)",
                    fontSize: "1em",
                  }}
                >
                  {g.letter}
                </h2>
                <div className="grid2">
                  {g.items.map((item) => (
                    <OfficerCard key={item.row.id} row={item.row} showLadder={false} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid2">
            {visible.map((item) => (
              <OfficerCard
                key={item.row.id}
                row={item.row}
                appeal={item.appeal}
                showLadder={tab === "central"}
              />
            ))}
          </div>
        )}

        {remaining > 0 ? (
          <button type="button" className="btn block" onClick={() => setLimit((n) => n + PAGE)}>
            Show more ({remaining} still to show)
          </button>
        ) : null}
      </div>
    </div>
  );
}
