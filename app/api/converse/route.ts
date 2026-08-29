import { NextResponse } from "next/server";
import { hasKey, structured, MODEL, type ChatMsg } from "@/lib/llm";
import { systemPrompt, TURN_SCHEMA } from "@/lib/prompts";
import { fallbackTurn } from "@/lib/fallback";
import { detectLanguage, languageDirective } from "@/lib/lang";
import { fieldsFor } from "@/lib/taxonomy";
import type { AgentTurn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

type RawTurn = {
  reply: string;
  language: string;
  languageName: string;
  scope: "in_scope" | "out_of_scope" | "unknown";
  outOfScopeReason: string | null;
  ministryId: string | null;
  path: string[];
  confidence: number;
  fields: { id: string; value: string }[];
  missing: string[];
  readyToFile: boolean;
  draftOriginal: string | null;
  draftAscii: string | null;
};

export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages: ChatMsg[];
    fields?: Record<string, string>;
    routing?: { ministryId: string; path: string[] } | null;
  };
  const messages = body.messages ?? [];
  const known = body.fields ?? {};
  const userTurns = messages.filter((m) => m.role === "user").map((m) => m.content);
  const latest = userTurns[userTurns.length - 1] ?? "";
  const detected = detectLanguage(latest);

  // Once we know the node, tell the model exactly which facts that leaf needs.
  const needed = body.routing ? fieldsFor(body.routing.ministryId, body.routing.path) : [];
  const fieldBrief = needed.length
    ? "Fields this category requires: " +
      needed
        .map((f) => f.id + " (" + f.label + ")" + (known[f.id] ? " - ALREADY KNOWN" : ""))
        .join("; ") +
      ". If the citizen has ALREADY stated any of these values anywhere in the conversation, put them into fields on this turn without asking. Then ask only for what is still genuinely missing, one at a time."
    : "";

  if (!hasKey()) {
    return NextResponse.json({ ...fallbackTurn(userTurns, known), model: "offline" });
  }

  try {
    const raw = await structured<RawTurn>(
      [
        { role: "system", content: systemPrompt() },
        ...messages,
        {
          role: "system",
          content: [
            languageDirective(latest),
            "Facts already collected: " +
              (Object.keys(known).length ? JSON.stringify(known) : "none yet") +
              ". Do not ask for any of these again.",
            fieldBrief,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
      TURN_SCHEMA,
      "intake_turn",
    );

    const fields: Record<string, string> = { ...known };
    for (const f of raw.fields ?? []) if (f.value) fields[f.id] = f.value;

    const turn: AgentTurn = {
      reply: raw.reply,
      language: detected.code,
      languageName: detected.name,
      scope: raw.scope,
      outOfScopeReason: (raw.outOfScopeReason ?? undefined) as AgentTurn["outOfScopeReason"],
      routing:
        raw.ministryId && raw.path?.length
          ? {
              ministryId: raw.ministryId,
              // Models sometimes echo the dotted trail shown in the prompt
              // (mobile.data_speed.low_speed) instead of plain per-level ids,
              // and sometimes prepend the ministry id to the path. Normalise
              // both so resolvePath can always walk what comes back.
              path: raw.path
                .map((p) => p.split(".").pop() ?? p)
                .filter((p) => p && p.toUpperCase() !== raw.ministryId?.toUpperCase()),
              confidence: raw.confidence ?? 0.7,
            }
          : null,
      fields,
      missing: raw.missing ?? [],
      readyToFile: raw.readyToFile,
      draftOriginal: raw.draftOriginal ?? undefined,
      draftAscii: raw.draftAscii ?? undefined,
    };

    return NextResponse.json({ ...turn, model: MODEL });
  } catch (err) {
    console.error("converse failed, degrading", err);
    return NextResponse.json({
      ...fallbackTurn(userTurns, known),
      model: "offline (model call failed)",
    });
  }
}
