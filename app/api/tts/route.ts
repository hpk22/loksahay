import { NextResponse } from "next/server";
import { hasSarvam, textToSpeech } from "@/lib/sarvam";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  if (!hasSarvam()) {
    return NextResponse.json({ error: "no_sarvam" }, { status: 501 });
  }
  const { text, language } = (await req.json()) as { text?: string; language?: string };
  if (!text?.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });

  try {
    const wav = await textToSpeech(text, language ?? "en-IN");
    return new Response(new Uint8Array(wav), {
      headers: { "content-type": "audio/wav", "cache-control": "no-store" },
    });
  } catch (err) {
    console.error("tts failed", err);
    return NextResponse.json({ error: "tts_failed" }, { status: 502 });
  }
}
