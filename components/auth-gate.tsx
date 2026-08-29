"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { isValidMobile } from "@/lib/auth";
import { useT } from "@/components/i18n-provider";

type Step = "mobile" | "code";

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
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [issued, setIssued] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const stepRef = useRef<Step>("mobile");

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

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!mobileOk) {
      setError("Enter a 10 digit mobile number, starting with 6, 7, 8 or 9.");
      return;
    }
    const sent = await requestCode(mobile);
    if (sent) setStep("code");
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
    signIn(mobile, name);
  }

  return (
    <div className="wrap narrow" style={{ paddingTop: 28, paddingBottom: 40 }}>
      <div className="card">
        <div className="panelhead">
          <h1
            ref={headingRef}
            tabIndex={-1}
            style={{ margin: 0, fontSize: "1.35em", outline: "none" }}
          >
            {step === "mobile" ? "Sign in with your mobile number" : t("file.otp.enter")}
          </h1>
        </div>

        <div className="panelbody">
          <div className="stack gap-4" aria-live="polite">
            <p className="lede" style={{ margin: 0 }}>
              {reason ?? "Sign in to continue."}
            </p>

            {step === "mobile" ? (
              <form className="stack gap-4" onSubmit={onSendCode} noValidate>
                <p className="muted" style={{ margin: 0 }}>
                  Your number is how the department reaches you about this grievance, and how
                  you get back into it later without a password.
                </p>

                <div className="field">
                  <label htmlFor="loksahay-mobile">{t("file.otp.mobile")}</label>
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
                    Ten digits, no country code and no spaces.
                  </p>
                </div>

                {error ? (
                  <p className="note bad" role="alert" style={{ margin: 0 }}>
                    {error}
                  </p>
                ) : null}

                <button className="btn primary lg block" type="submit" disabled={!mobileOk || busy}>
                  {busy ? "Sending the code" : t("file.otp.send")}
                </button>

                <p className="small muted" style={{ margin: 0 }}>
                  There is no separate registration. If this number is new to us you are
                  registered, and if we already know it you are signed back in.
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
                  <label htmlFor="loksahay-code">{t("file.otp.enter")}</label>
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
                  <p className="note bad" role="alert" style={{ margin: 0 }}>
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

            <p className="tiny muted" style={{ margin: 0 }}>
              No password is ever asked for. Your number is kept on this device.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
