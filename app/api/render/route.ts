import { NextResponse } from "next/server";
import { hasKey, text as complete } from "@/lib/llm";
import { cpgramsSanitize, hasIndicScript } from "@/lib/ascii";

/*
  Renders a grievance written in an Indian script into the ASCII the legacy
  grievance field can actually store.

  The conversational route gets this back from the model as part of its turn.
  The form route has no model call in it, so without this endpoint a citizen
  who writes in Devanagari through the form sees the character-loss panel show
  what the legacy field would destroy and nothing that survives it. That reads
  as "your language does not work here", which is the exact opposite of the
  argument this service makes.

  Every failure path returns 200 with an empty string. The caller treats an
  empty rendering as "not available" and shows the panel exactly as it degrades
  without this call, so a slow or missing model never blocks a citizen and
  never leaves the panel half filled.
*/

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM = [
  "You render an Indian citizen's grievance into English for a government computer system that can only store the characters A to Z, a to z, 0 to 9, and basic punctuation.",
  "Translate faithfully. Keep every fact: dates, amounts, place names, account and reference numbers, the number of times the citizen says they followed up.",
  "Do not summarise, do not shorten, do not soften, and do not add anything the citizen did not say.",
  "Write in the plain formal register of an Indian government grievance. Use the first person, as the citizen.",
  "Transliterate proper nouns rather than translating them. A person or place keeps its name.",
  "Output the rendered grievance only. No preamble, no notes, no quotation marks.",
].join(" ");

export async function POST(req: Request) {
  let body: { text?: string; languageName?: string };
  try {
    body = (await req.json()) as { text?: string; languageName?: string };
  } catch {
    return NextResponse.json({ ascii: "" });
  }

  const source = (body.text ?? "").trim();

  // Nothing to render: the text is empty, or it is already storable as written.
  if (!source || !hasIndicScript(source)) return NextResponse.json({ ascii: "" });
  if (!hasKey()) return NextResponse.json({ ascii: "" });

  try {
    const rendered = await complete([
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content:
          "Grievance, written in " +
          (body.languageName || "an Indian language") +
          ":\n\n" +
          source,
      },
    ]);

    // Guarantee the constraint rather than trusting the model to have met it.
    // A stray character here would be silently dropped by the real field.
    const { ascii } = cpgramsSanitize(rendered);
    return NextResponse.json({ ascii: ascii.trim() });
  } catch (err) {
    console.error("ascii rendering failed, degrading to none", err);
    return NextResponse.json({ ascii: "" });
  }
}
