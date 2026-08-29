import { NextResponse } from "next/server";
import { hasKey, text, MODEL } from "@/lib/llm";
import { appealPrompt } from "@/lib/prompts";
import { fallbackAppeal } from "@/lib/fallback";
import { fmtDate } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const b = (await req.json()) as {
    id: string;
    original: string;
    languageName: string;
    filedOn: string;
    closedOn: string;
    ministry: string;
  };

  const closed = fmtDate(b.closedOn);

  if (!hasKey()) {
    return NextResponse.json({ letter: fallbackAppeal(b.id, closed), model: "offline" });
  }

  try {
    const letter = await text([
      { role: "system", content: appealPrompt() },
      {
        role: "user",
        content: [
          "Language to write in: " + b.languageName,
          "Grievance number: " + b.id,
          "Filed on: " + fmtDate(b.filedOn),
          "Marked disposed of on: " + closed,
          "Department: " + b.ministry,
          "The citizen originally wrote:",
          b.original,
        ].join("\n"),
      },
    ]);
    return NextResponse.json({ letter, model: MODEL });
  } catch (err) {
    console.error("appeal draft failed", err);
    return NextResponse.json({
      letter: fallbackAppeal(b.id, closed),
      model: "offline (model call failed)",
    });
  }
}
