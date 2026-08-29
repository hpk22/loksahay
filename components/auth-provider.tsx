"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearSession, readSession, writeSession, type Session } from "@/lib/auth";

type Ctx = {
  session: Session | null;
  /** False until localStorage has been read, so nothing flashes. */
  ready: boolean;
  signIn: (mobile: string, name?: string) => void;
  signOut: () => void;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  // Read after mount, never during render. The server has no localStorage, so
  // reading during render would hand back a different first paint and break
  // hydration.
  useEffect(() => {
    setSession(readSession());
    setReady(true);
  }, []);

  const signIn = useCallback((mobile: string, name?: string) => {
    const digits = (mobile ?? "").replace(/\D/g, "");
    const trimmed = name?.trim();
    const next: Session = {
      mobile: digits,
      last4: digits.slice(-4),
      signedInAt: new Date().toISOString(),
      ...(trimmed ? { name: trimmed } : {}),
    };
    setSession(next);
    writeSession(next);
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    clearSession();
  }, []);

  const value = useMemo<Ctx>(
    () => ({ session, ready, signIn, signOut }),
    [session, ready, signIn, signOut],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): Ctx {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}
