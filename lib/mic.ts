"use client";

/*
  One microphone, several possible consumers.

  The homepage runs its own useVoice() dictation button and /file runs a full
  conversation with a third. Now that a floating assistant can be opened on top
  of either, two live getUserMedia streams can exist on one page at once — and
  when they do, both transcribe the same room and each hears the other's
  playback. The browser permits it, which is precisely why it has to be
  prevented here.

  The rule: whoever is about to start listening announces the claim, and every
  other consumer stands down. Deliberately built as a broadcast rather than a
  provider, because ownership of these components is currently split across two
  people working in parallel — a component that never hears a foreign claim
  behaves exactly as it did before, so half of this can land without the other.
*/

import { useEffect, useRef } from "react";

export const MIC_CLAIM_EVENT = "loksahay:mic-claim";

type ClaimDetail = { owner: string };

/** Announce that `owner` is taking the microphone. Call before listening. */
export function claimMic(owner: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ClaimDetail>(MIC_CLAIM_EVENT, { detail: { owner } }));
}

/**
 * Release the microphone whenever someone other than `owner` claims it.
 * `standDown` is held in a ref so a caller may pass a fresh closure each
 * render without the listener being torn down and rebuilt every time.
 */
export function useMicClaim(owner: string, standDown: () => void): void {
  const ref = useRef(standDown);

  // Kept current in an effect rather than during render, so a caller may pass a
  // fresh closure each render without the listener being rebuilt every time.
  useEffect(() => {
    ref.current = standDown;
  });

  useEffect(() => {
    const onClaim = (e: Event) => {
      const detail = (e as CustomEvent<ClaimDetail>).detail;
      if (!detail || detail.owner === owner) return;
      ref.current();
    };
    window.addEventListener(MIC_CLAIM_EVENT, onClaim);
    return () => window.removeEventListener(MIC_CLAIM_EVENT, onClaim);
  }, [owner]);
}
