import { NextResponse } from "next/server";
import { hasSarvam, speechToText } from "@/lib/sarvam";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  if (!hasSarvam()) {
    return NextResponse.json({ error: "no_sarvam" }, { status: 501 });
  }

  const form = await req.formData();
  const file = form.get("audio");
  const hint = (form.get("language") as string) || "unknown";
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "no_audio" }, { status: 400 });
  }

  try {
    const out = await speechToText(file, hint);
    return NextResponse.json(out);
  } catch (err) {
    console.error("stt failed", err);
    return NextResponse.json({ error: "stt_failed" }, { status: 502 });
  }
}
