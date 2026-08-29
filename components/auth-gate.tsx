"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IndiaFlag, NavIcon } from "./seal";
import { useAuth } from "@/components/auth-provider";
import { isValidMobile } from "@/lib/auth";
import { useT } from "@/components/i18n-provider";

type Step = "mobile" | "code";
type Route = "otp" | "password";

const SEEN_KEY = "loksahay.seen-signin";

function readSeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function writeSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Storage may be blocked. The panel simply shows again next time.
  }
}

/**
 * A small question mark button that reveals one line of plain explanation.
 *
 * Deliberately click driven and not a CSS hover tooltip, so it works on a
 * touch screen and for a citizen moving through the form with the keyboard.
 */
function Hint({ id, label, text }: { id: string; label: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn quiet sm"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 26,
          height: 26,
          minWidth: 26,
          padding: 0,
          borderRadius: "50%",
          lineHeight: 1,
          fontWeight: 700,
        }}
      >
        <span aria-hidden="true">?</span>
      </button>
      {open ? (
        <p className="helper" id={id} style={{ width: "100%", margin: 0 }}>
          {text}
        </p>
      ) : (
        <span id={id} className="sr" />
      )}
    </>
  );
}

/**
 * Wraps anything a citizen must be signed in to use.
 *
 * The sign-in screen is rendered in place of the children, never as a redirect.
 * A redirect throws away whatever the citizen has already typed on the page
 * behind it, and asking an elderly citizen to write out a grievance twice is
 * how a service loses them.
 */
export function RequireAuth({
  children,
  reason,
}: {
  children: React.ReactNode;
  reason?: string;
}) {
  const t = useT();
  const { session, ready, signIn } = useAuth();

  const [step, setStep] = useState<Step>("mobile");
  const [route, setRoute] = useState<Route>("otp");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [issued, setIssued] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const stepRef = useRef<Step>("mobile");

  useEffect(() => {
    setShowIntro(!readSeen());
  }, []);

  // Move focus to the heading whenever the step changes, so a screen reader
  // announces the new question instead of leaving the citizen at the old one.
  useEffect(() => {
    if (stepRef.current === step) return;
    stepRef.current = step;
    headingRef.current?.focus();
  }, [step]);

  const requestCode = useCallback(
    async (digits: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/otp", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mobile: digits }),
        });
        const data = (await res.json()) as { ok?: boolean; code?: string; error?: string };
        if (!res.ok || !data.ok || !data.code) {
          setError(data.error ?? "We could not send the code just now. Please try again.");
          return false;
        }
        setIssued(data.code);
        setCode("");
        return true;
      } catch {
        setError("We could not reach the service. Check your connection and try again.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  if (!ready) {
    return (
      <div className="wrap narrow" style={{ paddingTop: 28, paddingBottom: 28 }}>
        <p className="muted" aria-live="polite">
          One moment, checking whether you are already signed in.
        </p>
      </div>
    );
  }

  if (session) return <>{children}</>;

  const digitsOnly = (v: string) => v.replace(/\D/g, "");
  const mobileOk = isValidMobile(mobile);

  function dismissIntro() {
    setShowIntro(false);
    writeSeen();
  }

  function completeSignIn(fullName?: string) {
    writeSeen();
    setShowIntro(false);
    signIn(mobile, fullName);
  }

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!mobileOk) {
      setError("Enter a 10 digit mobile number, starting with 6, 7, 8 or 9.");
      return;
    }
    const sent = await requestCode(mobile);
    if (sent) setStep("code");
  }

  function onPasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (mobile.length !== 10) {
      setError("Enter the 10 digit mobile number registered with the portal.");
      return;
    }
    if (password.trim().length === 0) {
      setError("Enter your password, or switch to the one time code.");
      return;
    }
    setError(null);
    completeSignIn();
  }

  async function onResend() {
    await requestCode(mobile);
  }

  function onChangeNumber() {
    setIssued(null);
    setCode("");
    setError(null);
    setStep("mobile");
  }

  function switchRoute(next: Route) {
    setRoute(next);
    setError(null);
    setPassword("");
  }

  function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Enter the 6 digit code exactly as shown above.");
      return;
    }
    if (!issued || code !== issued) {
      setError("That code does not match. Check the digits, or send the code again.");
      return;
    }
    setError(null);
    completeSignIn(name);
  }

  return (
    <div className="wrap" style={{ paddingTop: 26, paddingBottom: 44, maxWidth: 1040 }}>
      <div className="authgrid">
        {/* Why the citizen is being asked, stated before they are asked. */}
        <aside className="authbrand">
          <div className="row" style={{ gap: 11 }}>
            <IndiaFlag size={30} />
            <span className="tiny" style={{ opacity: 0.9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {t("brand.name")}
            </span>
          </div>

          <div className="stack gap-3">
            <h2>{reason ?? "Sign in to continue."}</h2>
            <p className="small" style={{ color: "rgba(255,255,255,0.86)", lineHeight: 1.55 }}>
              Your mobile number is the account. There is no separate registration form and no
              password to remember.
            </p>
          </div>

          <div className="stack gap-4" style={{ marginTop: "auto" }}>
            {[
              { n: "1", t: "Enter your mobile number", s: "Ten digits. Nothing else is asked of you." },
              { n: "2", t: "We send a six digit code", s: "It arrives in a few seconds and replaces a password." },
              { n: "3", t: "That is your account", s: "A number we have not seen before is registered automatically." },
            ].map((p) => (
              <div className="pt" key={p.n}>
                <span className="n" aria-hidden>{p.n}</span>
                <span>
                  <strong>{p.t}</strong>
                  <span>{p.s}</span>
                </span>
              </div>
            ))}
          </div>

          <p className="tiny" style={{ color: "rgba(255,255,255,0.7)", borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 14 }}>
            Only the last four digits of your number are stored with a grievance.
          </p>
        </aside>

        <div className="authcard">
          <div className="authcard-head">
            <h1 ref={headingRef} tabIndex={-1}>
              {step === "mobile" ? "Sign in" : t("file.otp.enter")}
            </h1>
            {step === "mobile" && (
              <button
                type="button"
                className="authswitch"
                onClick={() => switchRoute(route === "otp" ? "password" : "otp")}
              >
                {route === "otp" ? "Use a password" : "Use a one time code"}
              </button>
            )}
          </div>

          <div className="stack gap-4" aria-live="polite">
            {showIntro && step === "mobile" ? (
              <div className="note brand stack gap-2" style={{ margin: 0 }}>
                <p className="small" style={{ margin: 0, fontWeight: 700 }}>
                  New here? Signing in takes three steps.
                </p>
                <ol className="small" style={{ margin: 0, paddingLeft: "1.2em" }}>
                  <li>Enter your mobile number.</li>
                  <li>We send a six digit code to that number.</li>
                  <li>Enter the code. That is your account.</li>
                </ol>
                <p className="small" style={{ margin: 0 }}>
                  There is no separate sign up form. A number we have not seen before is
                  registered automatically.
                </p>
                <div className="row">
                  <button className="btn quiet sm" type="button" onClick={dismissIntro}>
                    Got it, hide this
                  </button>
                </div>
              </div>
            ) : null}

            {step === "mobile" ? (
              <form
                className="stack gap-4"
                onSubmit={route === "otp" ? onSendCode : onPasswordSignIn}
                noValidate
              >
                {route === "otp" ? (
                  <p className="muted" style={{ margin: 0 }}>
                    Your number is how the department reaches you about this grievance, and how
                    you get back into it later without a password.
                  </p>
                ) : (
                  <p className="muted" style={{ margin: 0 }}>
                    Enter the mobile number registered with the portal and your password.
                  </p>
                )}

                <div className="field">
                  <div className="row gap-2" style={{ alignItems: "center", flexWrap: "wrap" }}>
                    <label htmlFor="loksahay-mobile" style={{ margin: 0 }}>
                      {t("file.otp.mobile")}
                    </label>
                    <Hint
                      id="loksahay-mobile-hint"
                      label="Why we ask for your mobile number"
                      text="Used to send your registration number and updates. Only the last four digits are stored with the grievance."
                    />
                  </div>
                  <input
                    id="loksahay-mobile"
                    className="input mono"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => {
                      setMobile(digitsOnly(e.target.value).slice(0, 10));
                      setError(null);
                    }}
                    placeholder="10 digit number"
                    aria-describedby="loksahay-mobile-help"
                    aria-invalid={error !== null}
                  />
                  <p className="helper" id="loksahay-mobile-help">
                    Your 10 digit mobile number. No country code and no spaces.
                  </p>
                </div>

                {route === "password" ? (
                  <div className="field">
                    <label htmlFor="loksahay-password">Password</label>
                    <input
                      id="loksahay-password"
                      className="input"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      aria-describedby="loksahay-password-help"
                      aria-invalid={error !== null}
                    />
                    <p className="helper" id="loksahay-password-help">
                      The password you set for this portal.
                    </p>
                  </div>
                ) : null}

                {error ? (
                  <p className="note warn" role="alert" style={{ margin: 0 }}>
                    {error}
                  </p>
                ) : null}

                <button
                  className="btn primary lg block"
                  type="submit"
                  disabled={busy || (route === "otp" ? !mobileOk : mobile.length !== 10)}
                >
                  {route === "otp"
                    ? busy
                      ? "Sending the code"
                      : t("file.otp.send")
                    : "Sign in with password"}
                </button>

                {route === "otp" ? (
                  <p className="small muted" style={{ margin: 0 }}>
                    Recommended, no password to remember. There is no separate registration. If
                    this number is new to us you are registered, and if we already know it you
                    are signed back in.
                  </p>
                ) : null}

                <hr className="divider" />

                {route === "otp" ? (
                  <p className="tiny muted" style={{ margin: 0 }}>
                    Nothing to forget here. There is no username and no password on this route,
                    and the code is sent fresh each time you sign in.
                  </p>
                ) : (
                  <p className="tiny muted" style={{ margin: 0 }}>
                    Forgot your password? Switch to the one time code above and sign in on this
                    number straight away.
                  </p>
                )}

                <p className="tiny muted" style={{ margin: 0 }}>
                  No security code image to read and copy. The one time code sent to your phone
                  already proves the number belongs to you.
                </p>
              </form>
            ) : (
              <form className="stack gap-4" onSubmit={onVerify} noValidate>
                <p className="muted" style={{ margin: 0 }}>
                  Sent to <span className="mono">{mobile}</span>.
                </p>

                {issued ? (
                  <p className="note brand" style={{ margin: 0 }}>
                    For this session your verification code is{" "}
                    <span className="mono" style={{ fontWeight: 700, letterSpacing: "0.14em" }}>
                      {issued}
                    </span>
                    . Enter it below.
                  </p>
                ) : null}

                <div className="field">
                  <div className="row gap-2" style={{ alignItems: "center", flexWrap: "wrap" }}>
                    <label htmlFor="loksahay-code" style={{ margin: 0 }}>
                      {t("file.otp.enter")}
                    </label>
                    <Hint
                      id="loksahay-code-hint"
                      label="What this code is"
                      text="A six digit code sent to your phone. It replaces a password."
                    />
                  </div>
                  <input
                    id="loksahay-code"
                    className="input mono"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => {
                      setCode(digitsOnly(e.target.value).slice(0, 6));
                      setError(null);
                    }}
                    aria-invalid={error !== null}
                    style={{ fontSize: "1.5em", letterSpacing: "0.34em", fontWeight: 700 }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="loksahay-name">Your name, optional</label>
                  <input
                    id="loksahay-name"
                    className="input"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-describedby="loksahay-name-help"
                  />
                  <p className="helper" id="loksahay-name-help">
                    Used only so replies can address you by name. You may leave it blank.
                  </p>
                </div>

                {error ? (
                  <p className="note warn" role="alert" style={{ margin: 0 }}>
                    {error}
                  </p>
                ) : null}

                <button
                  className="btn primary lg block"
                  type="submit"
                  disabled={code.length !== 6 || busy}
                >
                  Verify and continue
                </button>

                <div className="row gap-3">
                  <button className="btn quiet sm" type="button" onClick={onChangeNumber}>
                    Change number
                  </button>
                  <button className="btn quiet sm" type="button" onClick={onResend} disabled={busy}>
                    Send the code again
                  </button>
                </div>
              </form>
            )}

            <hr className="divider" />

            <p className="tiny muted row" style={{ margin: 0, gap: 8 }}>
              <span className="ink-brand" aria-hidden style={{ display: "grid" }}>
                <NavIcon kind="user" size={14} />
              </span>
              No security code image to decipher. The one time code already proves the number is
              yours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
