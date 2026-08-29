import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Verification code issuer. The code is returned to the client for now.
 * The code is returned to the browser and shown on screen on purpose, so a
 * reviewer can complete the journey. 000000 always works.
 */
export async function POST(req: Request) {
  const { mobile } = (await req.json()) as { mobile?: string };
  const digits = (mobile ?? "").replace(/\D/g, "");
  if (digits.length !== 10) {
    return NextResponse.json({ error: "Enter a 10 digit mobile number." }, { status: 400 });
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  return NextResponse.json({ ok: true, mock: true, code });
}
