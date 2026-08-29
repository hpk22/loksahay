"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
  Bidirectional voice, built on Sarvam AI.

  Two problems with the existing portal's voice tool. It is one-directional ,
  hold the mic, speak, release, wait, read, and the browser speech APIs it
  leans on are poor at Indian languages, which defeats the point of a service
  that claims to serve 22 of them.

  So: speech in goes to Sarvam's Saarika, speech out comes from Sarvam's
  Bulbul, and the microphone reopens by itself the moment the reply finishes
  playing. You talk, it answers aloud, it listens again, like a clerk taking
  down your complaint across a desk.

  Audio is captured as raw PCM and encoded to WAV in the browser rather than
  handed to MediaRecorder, because the container MediaRecorder produces varies
  by browser and Sarvam wants a format we can guarantee. Capturing the samples
  ourselves also gives us the loudness figure needed to detect when someone has
  stopped speaking, which is what makes the turn-taking work.

  If Sarvam is unreachable, everything falls back to the browser speech APIs.
*/

const TARGET_SR = 16000;
const SILENCE_RMS = 0.012;
const SILENCE_MS = 1500; // quiet for this long after speech ends the turn
const MIN_SPEECH_MS = 350; // ignore a cough
const MAX_MS = 20000; // hard ceiling on one turn

type Engine = "sarvam" | "browser" | "unknown";

/* ------------------------------ wav encoding ------------------------------ */

function downsample(input: Float32Array, from: number, to: number): Float32Array {
  if (to >= from) return input;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), input.length);
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  str(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/* --------------------------- browser fallback ---------------------------- */

type SRAlt = { 0: { transcript: string }; isFinal: boolean };
type SREvent = { resultIndex: number; results: { length: number; [i: number]: SRAlt } };
type SR = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
type SRCtor = new () => SR;

function browserSR(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/* --------------------------------- hook ---------------------------------- */

export function useVoice(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState("");
  const [handsFree, setHandsFree] = useState(false);
  const [engine, setEngine] = useState<Engine>("unknown");
  const [error, setError] = useState<string>();

  const finalRef = useRef(onFinal);
  const handsFreeRef = useRef(false);
  const detectedRef = useRef("unknown");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // recording plumbing
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const srRef = useRef<SR | null>(null);
  const abortRef = useRef(false);
  // transcribe() may need to reopen the microphone, but listenSarvam is
  // declared below it and the two are mutually dependent. A ref breaks the cycle.
  const listenRef = useRef<(lang: string) => void>(() => {});

  finalRef.current = onFinal;
  handsFreeRef.current = handsFree;

  useEffect(() => {
    const canRecord =
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof (window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext) !==
        "undefined";
    setSupported(canRecord || Boolean(browserSR()));
    return () => {
      abortRef.current = true;
      teardown();
      audioRef.current?.pause();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function teardown() {
    try {
      nodeRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void ctxRef.current?.close();
    } catch {
      /* already gone */
    }
    nodeRef.current = null;
    streamRef.current = null;
    ctxRef.current = null;
  }

  /** Browser-speech fallback path. */
  const listenBrowser = useCallback((lang: string) => {
    const Ctor = browserSR();
    if (!Ctor) return;
    srRef.current?.abort();
    const rec = new Ctor();
    rec.lang = lang || "en-IN";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const said = e.results[i][0].transcript.trim();
          setInterim("");
          if (said) finalRef.current(said);
          return;
        }
      }
    };
    rec.onerror = () => { setListening(false); setInterim(""); };
    rec.onend = () => { setListening(false); setInterim(""); };
    try {
      rec.start();
      srRef.current = rec;
      setEngine("browser");
      setListening(true);
    } catch {
      setListening(false);
    }
  }, []);

  const transcribe = useCallback(async (wav: Blob) => {
    setInterim("…");
    try {
      const form = new FormData();
      form.append("audio", wav, "speech.wav");
      form.append("language", detectedRef.current);
      const res = await fetch("/api/stt", { method: "POST", body: form });
      if (res.status === 501) throw new Error("no_sarvam");
      if (!res.ok) throw new Error("stt_failed");
      const j = (await res.json()) as { transcript: string; languageCode: string };
      setEngine("sarvam");
      if (j.languageCode) detectedRef.current = j.languageCode;
      setInterim("");
      if (j.transcript) finalRef.current(j.transcript);
      else if (handsFreeRef.current) listenRef.current(detectedRef.current); // heard nothing, listen again
    } catch {
      setInterim("");
      setError("Could not hear that clearly. Please try again, or type it.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Record until the speaker goes quiet, then send to Sarvam. */
  const listenSarvam = useCallback(
    async (lang: string) => {
      setError(undefined);
      teardown();
      chunksRef.current = [];

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
        });
      } catch {
        setError("Microphone permission is needed to speak. You can type instead.");
        listenBrowser(lang);
        return;
      }

      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      // Route through a silent gain node: some browsers will not run the
      // processor unless it is connected to the destination, and we obviously
      // must not play the microphone back into the room.
      const mute = ctx.createGain();
      mute.gain.value = 0;

      ctxRef.current = ctx;
      streamRef.current = stream;
      nodeRef.current = node;

      let voicedMs = 0;
      let silenceMs = 0;
      let totalMs = 0;
      let done = false;

      const finish = async () => {
        if (done) return;
        done = true;
        const sr = ctx.sampleRate;
        teardown();
        setListening(false);
        if (abortRef.current) return;

        const total = chunksRef.current.reduce((n, c) => n + c.length, 0);
        if (!total || voicedMs < MIN_SPEECH_MS) {
          if (handsFreeRef.current) setTimeout(() => void listenSarvam(lang), 150);
          return;
        }
        const merged = new Float32Array(total);
        let at = 0;
        for (const c of chunksRef.current) { merged.set(c, at); at += c.length; }
        chunksRef.current = [];
        await transcribe(encodeWav(downsample(merged, sr, TARGET_SR), TARGET_SR));
      };

      node.onaudioprocess = (e) => {
        if (done) return;
        const input = e.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(input));

        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
        const rms = Math.sqrt(sum / input.length);
        const ms = (input.length / ctx.sampleRate) * 1000;
        totalMs += ms;

        if (rms > SILENCE_RMS) { voicedMs += ms; silenceMs = 0; }
        else if (voicedMs >= MIN_SPEECH_MS) silenceMs += ms;

        if (silenceMs >= SILENCE_MS || totalMs >= MAX_MS) void finish();
      };

      source.connect(node);
      node.connect(mute);
      mute.connect(ctx.destination);
      setEngine("sarvam");
      setListening(true);
    },
    [listenBrowser, transcribe],
  );

  listenRef.current = (lang: string) => void listenSarvam(lang);

  const listen = useCallback(
    (lang: string) => {
      abortRef.current = false;
      if (lang && lang !== "unknown") detectedRef.current = lang;
      void listenSarvam(lang);
    },
    [listenSarvam],
  );

  const stop = useCallback(() => {
    abortRef.current = true;
    handsFreeRef.current = false;
    setHandsFree(false);
    srRef.current?.abort();
    srRef.current = null;
    teardown();
    setListening(false);
    setInterim("");
    if (audioRef.current) {
      audioRef.current.pause();
      // Stopping mid-reply means onended never fires, so release it here too.
      if (audioRef.current.src.startsWith("blob:")) URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  /** Speak a reply through Sarvam, then reopen the microphone. */
  const speak = useCallback(
    (text: string, lang: string, thenListen: boolean) => {
      const relisten = () => {
        setSpeaking(false);
        if (thenListen && handsFreeRef.current && !abortRef.current) {
          setTimeout(() => void listenSarvam(lang), 250);
        }
      };

      const browserSpeak = () => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return relisten();
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang || "en-IN";
        u.rate = 0.95;
        u.onstart = () => setSpeaking(true);
        u.onend = relisten;
        u.onerror = relisten;
        setEngine("browser");
        window.speechSynthesis.speak(u);
      };

      setSpeaking(true);
      fetch("/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, language: lang }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("tts");
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);

          /*
            One object URL per spoken reply, and a hands-free conversation is
            many replies. Without the revoke, each one pins its WAV for the
            life of the document, which is the kind of slow leak that only
            shows up on the cheap phone this service is aimed at.

            settle() also makes the path fire exactly once. Previously onerror
            and the play() rejection could both reach relisten and start two
            listening loops over the same microphone.
          */
          let settled = false;
          const settle = (then: () => void) => {
            if (settled) return;
            settled = true;
            URL.revokeObjectURL(url);
            then();
          };

          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => settle(relisten);
          audio.onerror = () => settle(relisten);
          setEngine("sarvam");
          try {
            await audio.play();
          } catch (err) {
            // Hand over to the browser voice, but free the blob on the way out.
            settle(() => {});
            throw err;
          }
        })
        .catch(browserSpeak);
    },
    [listenSarvam],
  );

  const startHandsFree = useCallback(
    (lang: string) => {
      abortRef.current = false;
      handsFreeRef.current = true;
      setHandsFree(true);
      void listenSarvam(lang);
    },
    [listenSarvam],
  );

  return {
    supported, listening, speaking, interim, handsFree, engine, error,
    listen, stop, speak, startHandsFree,
  };
}

export function MicIcon({ off = false }: { off?: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {off ? (
        <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
      ) : (
        <>
          <rect x="9" y="2.5" width="6" height="11" rx="3" fill="currentColor" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 17.5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
