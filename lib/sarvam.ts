/**
 * Sarvam AI for Indian-language speech.
 *
 * The browser's own speech APIs are poor at Indic languages, which defeats the
 * entire point of a grievance system that claims to serve 22 of them. Sarvam's
 * models are built for exactly this, so speech goes through them and only the
 * reasoning stays with the OpenAI model.
 *
 * Verified contract:
 *   POST /text-to-speech  { text, target_language_code, speaker, model }
 *                         -> { request_id, audios: [base64 wav] }
 *   POST /speech-to-text  multipart: file, model, language_code
 *                         -> { request_id, transcript, language_code, language_probability }
 */

const BASE = "https://api.sarvam.ai";
export const TTS_MODEL = process.env.SARVAM_TTS_MODEL || "bulbul:v3";
export const STT_MODEL = process.env.SARVAM_STT_MODEL || "saarika:v2.5";
export const SPEAKER = process.env.SARVAM_SPEAKER || "ritu";

export function hasSarvam(): boolean {
  return Boolean(process.env.SARVAM_API_KEY);
}

function headers(): Record<string, string> {
  return { "api-subscription-key": process.env.SARVAM_API_KEY ?? "" };
}

/** Sarvam uses od-IN for Odia where BCP-47 commonly uses or-IN. */
const ALIASES: Record<string, string> = { "or-IN": "od-IN" };

const SUPPORTED = new Set([
  "hi-IN", "bn-IN", "kn-IN", "ml-IN", "mr-IN", "od-IN",
  "pa-IN", "ta-IN", "te-IN", "gu-IN", "en-IN",
]);

export function toSarvamLang(code: string | undefined): string {
  if (!code) return "en-IN";
  const c = ALIASES[code] ?? code;
  return SUPPORTED.has(c) ? c : "en-IN";
}

export async function textToSpeech(text: string, languageCode: string): Promise<Buffer> {
  const res = await fetch(BASE + "/text-to-speech", {
    method: "POST",
    headers: { ...headers(), "content-type": "application/json" },
    body: JSON.stringify({
      // The endpoint caps a single input; replies here are two or three
      // sentences, but truncate defensively rather than fail the turn.
      text: text.slice(0, 480),
      target_language_code: toSarvamLang(languageCode),
      speaker: SPEAKER,
      model: TTS_MODEL,
    }),
  });

  if (!res.ok) {
    throw new Error("sarvam tts " + res.status + " " + (await res.text()).slice(0, 200));
  }

  const json = (await res.json()) as { audios?: string[] };
  const b64 = json.audios?.[0];
  if (!b64) throw new Error("sarvam tts returned no audio");
  return Buffer.from(b64, "base64");
}

export type Transcription = { transcript: string; languageCode: string; confidence: number };

export async function speechToText(
  audio: Blob,
  languageCode = "unknown",
): Promise<Transcription> {
  const form = new FormData();
  form.append("file", audio, "speech.wav");
  form.append("model", STT_MODEL);
  form.append("language_code", languageCode);

  const res = await fetch(BASE + "/speech-to-text", { method: "POST", headers: headers(), body: form });

  if (!res.ok) {
    throw new Error("sarvam stt " + res.status + " " + (await res.text()).slice(0, 200));
  }

  const json = (await res.json()) as {
    transcript?: string;
    language_code?: string;
    language_probability?: number;
  };
  return {
    transcript: (json.transcript ?? "").trim(),
    languageCode: json.language_code ?? "en-IN",
    confidence: json.language_probability ?? 0,
  };
}
