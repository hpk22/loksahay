"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Seal, FooterBadge, NavIcon, IndiaFlag } from "./seal";
import { useI18n } from "./i18n-provider";
import { useAuth } from "./auth-provider";
import { LANGUAGES } from "@/lib/i18n";

/*
  Three tiers, in the order a government portal uses them: a utility bar for
  the things a citizen needs before they need anything else, the identity of
  the service, then the navigation. The structure is familiar on purpose. The
  craft inside it is not.
*/

const NAV = [
  { href: "/", key: "nav.home", icon: "home" },
  { href: "/file", key: "nav.file", icon: "file" },
  { href: "/status", key: "nav.status", icon: "status" },
  { href: "/directory", key: "nav.directory", icon: "directory" },
  { href: "/process", key: "nav.process", icon: "process" },
] as const;

/* ------------------------------------------------------------------ */

function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === lang);

  return (
    <div className="langmenu" ref={box}>
      <button
        type="button"
        className="ctl"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
        style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
        </svg>
        <span className="sr">{t("top.language")}: </span>
        <span data-s={current?.script}>{current?.native}</span>
      </button>

      {open && (
        <div className="sheet" role="menu" aria-label={t("top.language")}>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="menuitem"
              lang={l.tag}
              aria-current={l.code === lang}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
            >
              <span data-s={l.script}>{l.native}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/*
  Who is signed in, stated in the masthead rather than buried in a menu. The
  number is shown as its last four digits only: enough for a citizen to
  recognise their own account, not enough to expose it to someone reading over
  their shoulder in a queue.
*/
function AccountControl() {
  const { session, ready, signOut } = useAuth();

  if (!ready) return null;

  if (!session) {
    return (
      <Link href="/signin" className="ctl" style={{ display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none", padding: "4px 12px" }}>
        <NavIcon kind="user" size={14} />
        Sign in
      </Link>
    );
  }

  return (
    <span className="row" style={{ gap: 6 }}>
      <Link href="/signin" className="ctl" style={{ display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none", padding: "4px 12px" }}>
        <NavIcon kind="user" size={14} />
        <span className="mono">{"••••" + session.last4}</span>
      </Link>
      <button type="button" className="ctl" onClick={signOut} aria-label="Sign out">
        <NavIcon kind="signout" size={14} />
      </button>
    </span>
  );
}

function UtilityBar() {
  const { t } = useI18n();
  const [fs, setFs] = useState<"" | "lg" | "xl">("");
  const [hc, setHc] = useState(false);

  // Both controls persist, because someone who needs larger text needs it on
  // every visit, not just this one.
  useEffect(() => {
    try {
      const s = localStorage.getItem("loksahay.fs");
      if (s === "lg" || s === "xl") setFs(s);
      if (localStorage.getItem("loksahay.hc") === "1") setHc(true);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    if (fs) el.setAttribute("data-fs", fs);
    else el.removeAttribute("data-fs");
    try {
      localStorage.setItem("loksahay.fs", fs);
    } catch {
      /* storage unavailable */
    }
  }, [fs]);

  useEffect(() => {
    document.documentElement.classList.toggle("hc", hc);
    try {
      localStorage.setItem("loksahay.hc", hc ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  }, [hc]);

  return (
    <div className="topbar">
      <div className="wrap row" style={{ justifyContent: "space-between", gap: 6 }}>
        <div className="row" style={{ gap: 0 }}>
          <a href="#main" className="skip sr">
            {t("top.skip")}
          </a>
          <span className="row" style={{ gap: 9, paddingInlineEnd: 12, marginInlineEnd: 4, borderInlineEnd: "1px solid rgba(255,255,255,0.22)" }}>
            <IndiaFlag size={26} />
            <span className="tiny" style={{ opacity: 0.92, fontWeight: 600, letterSpacing: "0.02em" }}>
              {t("brand.dept")}
            </span>
          </span>
          <Link href="/about">{t("nav.about")}</Link>
          <span className="sep" aria-hidden>|</span>
          <Link href="/process">{t("nav.process")}</Link>
          <span className="sep" aria-hidden>|</span>
          <Link href="/directory">{t("top.contact")}</Link>
        </div>

        <div className="row" style={{ gap: 7 }}>
          <span className="sr">{t("top.textsize")}</span>
          <span className="tiny" aria-hidden style={{ opacity: 0.75 }}>
            {t("top.textsize")}
          </span>
          <button className="ctl" onClick={() => setFs("")} aria-pressed={fs === ""} aria-label="Normal text size">
            A
          </button>
          <button className="ctl" onClick={() => setFs("lg")} aria-pressed={fs === "lg"} aria-label="Large text size">
            A+
          </button>
          <button className="ctl" onClick={() => setFs("xl")} aria-pressed={fs === "xl"} aria-label="Largest text size">
            A++
          </button>
          <button className="ctl" onClick={() => setHc(!hc)} aria-pressed={hc}>
            {hc ? t("top.contrast.off") : t("top.contrast")}
          </button>
          <LanguageSwitcher />
          <AccountControl />
        </div>
      </div>
    </div>
  );
}

function BrandBar() {
  const { t } = useI18n();
  // The service name in Devanagari sits above the rest, the way a department
  // lockup carries Hindi above English. Dropped when the chosen language
  // already renders the name in that script, so it is never printed twice.
  const deva = "लोकसहाय";
  const showScript = t("brand.name") !== deva;

  return (
    <div className="brandbar">
      <div className="wrap inner">
        <Link href="/" className="lockup">
          <span className="mark">
            <Seal size={62} />
          </span>
          <span className="rule" aria-hidden />
          <span>
            {showScript && (
              <span className="script deva" lang="hi">
                {deva}
              </span>
            )}
            <span className="kicker">{t("brand.name")}</span>
            <span className="name">{t("brand.tagline")}</span>
          </span>
        </Link>

      </div>
    </div>
  );
}

function MainNav() {
  const path = usePathname();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [path]);

  return (
    <nav className="navbar" aria-label="Main">
      <div className="wrap" style={{ display: "flex", alignItems: "center" }}>
        <button
          className="burger"
          aria-expanded={open}
          aria-controls="mainnav-list"
          onClick={() => setOpen(!open)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
          {t("nav.home")}
        </button>

        <ul id="mainnav-list" className={open ? "open grow" : "grow"}>
          {NAV.map((n) => (
            <li key={n.href}>
              <Link href={n.href} aria-current={path === n.href ? "page" : undefined}>
                <NavIcon kind={n.icon} />
                {t(n.key)}
              </Link>
            </li>
          ))}
          <li style={{ marginInlineStart: "auto" }}>
            <Link href="/file" className="cta">
              {t("nav.cta")}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden style={{ marginInlineStart: 6 }}>
                <path d="M5 12h13M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export function SiteHeader() {
  return (
    <>
      <UtilityBar />
      <BrandBar />
      <MainNav />
    </>
  );
}

/** Section rail, for pages deep enough to need one. */
export function Rail({ current }: { current?: string }) {
  const { t } = useI18n();
  const items = [
    { href: "/file", key: "nav.file", icon: "file" },
    { href: "/status", key: "nav.status", icon: "status" },
    { href: "/directory", key: "nav.directory", icon: "directory" },
    { href: "/process", key: "nav.process", icon: "process" },
    { href: "/about", key: "nav.about", icon: "user" },
  ] as const;

  return (
    <nav className="rail" aria-label="Section">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={current === i.href ? "page" : undefined}
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <NavIcon kind={i.icon} />
          {t(i.key)}
        </Link>
      ))}
    </nav>
  );
}

export function GovFooter() {
  const { t } = useI18n();
  const year = 2026;

  return (
    <footer className="sitefooter">
      <div className="wrap">
        <div className="footgrid">
          <div className="stack gap-3">
            <div className="row" style={{ gap: 12 }}>
              <IndiaFlag size={40} />
              <span style={{ color: "#fff" }}>
                <Seal size={40} />
              </span>
              <span>
                <strong style={{ color: "#fff", fontSize: 19, display: "block", lineHeight: 1.15 }}>
                  {t("brand.name")}
                </strong>
                <span style={{ fontSize: 12.5, color: "#a9a29a" }}>{t("brand.tagline")}</span>
              </span>
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#c4beb7", maxWidth: "34ch" }}>
              {t("brand.line")}
            </p>
            <div className="row" style={{ gap: 8 }}>
              <FooterBadge label={t("home.trust.3")} sub={t("home.trust.3.sub")} />
              <FooterBadge label={t("home.trust.4")} sub={t("home.trust.4.sub")} />
            </div>
          </div>

          <div className="stack gap-2">
            <h4>{t("foot.quick")}</h4>
            <Link href="/file">{t("nav.file")}</Link>
            <Link href="/status">{t("nav.status")}</Link>
            <Link href="/directory">{t("nav.directory")}</Link>
            <Link href="/process">{t("nav.process")}</Link>
          </div>

          <div className="stack gap-2">
            <h4>{t("foot.help")}</h4>
            <Link href="/about">{t("nav.about")}</Link>
            <Link href="/process">{t("top.faq")}</Link>
            <Link href="/directory">{t("nav.appeal")}</Link>
            <p style={{ fontSize: 13, color: "#a9a29a", marginTop: 4 }}>{t("foot.hours")}</p>
          </div>

          <div className="stack gap-2">
            <h4>{t("foot.legal")}</h4>
            <Link href="/about">{t("foot.privacy")}</Link>
            <Link href="/about">{t("foot.terms")}</Link>
            <Link href="/about">{t("foot.accessibility")}</Link>
            <p style={{ fontSize: 13, color: "#a9a29a", marginTop: 4 }}>
              {t("foot.updated")}: 29 August {year}
            </p>
          </div>
        </div>

        <div className="foot-base stack gap-2">
          <p>{t("foot.independent")}</p>
          <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
            <span>
              © {year} {t("foot.copyright")}
            </span>
            <span>{t("foot.browsers")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
