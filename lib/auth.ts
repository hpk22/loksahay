/**
 * Citizen sign-in state.
 *
 * A mobile number and a one time code, nothing else. No password is stored,
 * asked for or accepted anywhere in this service. The session lives in
 * localStorage on the citizen's own device, so the full number never has to be
 * held anywhere the citizen cannot clear themselves.
 *
 * Every storage access is guarded. Private browsing and locked down devices
 * throw on the first read, and a citizen who cannot store a session should
 * still be able to use the page for the length of one visit.
 */

export type Session = {
  /** Full 10 digits, kept only on this device. */
  mobile: string;
  /** Last four digits, safe to show back on screen. */
  last4: string;
  /** Optional, asked once at registration. Used only to address the citizen. */
  name?: string;
  /** ISO timestamp of the moment the code was accepted. */
  signedInAt: string;
};

export const AUTH_KEY = "loksahay.session";

/** Exactly ten digits, first digit 6 to 9, as Indian mobile numbering allots. */
export function isValidMobile(m: string): boolean {
  return /^[6-9]\d{9}$/.test(m ?? "");
}

function isSession(v: unknown): v is Session {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  if (typeof s.mobile !== "string" || !isValidMobile(s.mobile)) return false;
  if (typeof s.last4 !== "string") return false;
  if (typeof s.signedInAt !== "string") return false;
  if (s.name !== undefined && typeof s.name !== "string") return false;
  return true;
}

export function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    // Storage unavailable, or the stored value is not ours to read.
    return null;
  }
}

export function writeSession(s: Session): void {
  try {
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(s));
  } catch {
    // The session still holds in memory for the length of this visit.
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(AUTH_KEY);
  } catch {
    // Nothing was stored, so nothing needs removing.
  }
}
