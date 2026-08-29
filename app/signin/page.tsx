"use client";

import Link from "next/link";
import { SiteHeader, GovFooter } from "@/components/chrome";
import { RequireAuth } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-provider";
import { useT } from "@/components/i18n-provider";
import { NavIcon } from "@/components/seal";

/*
  A real destination for the Sign in control in the masthead.

  RequireAuth renders the sign in card in place of its children, so this page
  is the card when signed out and a short confirmation when signed in. Giving
  the control somewhere of its own matters more than it looks: a citizen who
  wants to sign in before starting should not have to open the grievance form
  to find out how.
*/

function SignedIn() {
  const { session, signOut } = useAuth();
  const t = useT();
  if (!session) return null;

  return (
    <div className="stack gap-5">
      <div className="stack gap-2">
        <h1>You are signed in</h1>
        <p className="lede muted">
          Your grievances are linked to the mobile number ending {session.last4}. You can lodge a
          new one, or check one you have already lodged.
        </p>
      </div>

      <div className="card stack gap-3">
        <div className="row" style={{ gap: 12 }}>
          <span className="avatar" aria-hidden>
            <NavIcon kind="user" size={20} />
          </span>
          <span>
            <strong style={{ display: "block" }}>
              {session.name ? session.name : "Mobile number ending " + session.last4}
            </strong>
            <span className="small muted">
              {session.name ? "Mobile number ending " + session.last4 : "Signed in on this device"}
            </span>
          </span>
        </div>

        <hr className="divider" />

        <div className="row" style={{ gap: 10 }}>
          <Link className="btn action" href="/file">
            {t("nav.file")}
          </Link>
          <Link className="btn ghost" href="/status">
            {t("nav.status")}
          </Link>
          <button type="button" className="btn quiet" onClick={signOut} style={{ marginInlineStart: "auto" }}>
            <NavIcon kind="signout" size={16} />
            Sign out
          </button>
        </div>
      </div>

      <p className="small muted">
        Signing out removes the session from this device. It does not withdraw any grievance you
        have already lodged, and your registration numbers keep working.
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap narrow stack gap-5" style={{ paddingTop: 28, paddingBottom: 44 }}>
        <RequireAuth reason="Sign in to lodge and track grievances">
          <SignedIn />
        </RequireAuth>
      </main>
      <GovFooter />
    </>
  );
}
