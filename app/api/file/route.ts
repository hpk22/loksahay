import { NextResponse } from "next/server";
import { cpgramsSanitize } from "@/lib/ascii";
import { findMinistry } from "@/lib/taxonomy";
import { makeRegistrationNumber, putGrievance } from "@/lib/store";
import type { Grievance } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const b = (await req.json()) as {
    ministryId: string;
    path: string[];
    fields: Record<string, string>;
    original: string;
    ascii?: string;
    language: string;
    languageName: string;
    mobile: string;
    attachmentName?: string;
  };

  const ministry = findMinistry(b.ministryId);
  if (!ministry) {
    return NextResponse.json({ error: "Unknown ministry" }, { status: 400 });
  }

  const sanitized = cpgramsSanitize(b.original);
  const now = new Date().toISOString();
  const id = makeRegistrationNumber(b.ministryId);

  const officer =
    ministry.adjudicator === "respondent"
      ? {
          role: "Subordinate officer",
          organisation: b.fields.provider || b.fields.bank || b.fields.insurer || "the service provider",
          independence: ministry.adjudicator,
        }
      : {
          role: "Public Grievance Officer",
          organisation: ministry.name,
          independence: ministry.adjudicator,
        };

  const g: Grievance = {
    id,
    createdAt: now,
    mobileLast4: (b.mobile || "").slice(-4),
    language: b.language,
    languageName: b.languageName,
    ministryId: b.ministryId,
    path: b.path,
    fields: b.fields,
    original: b.original,
    // The English/ASCII payload the legacy portal can physically accept.
    ascii: b.ascii?.trim() || sanitized.ascii,
    droppedChars: sanitized.dropped,
    attachmentName: b.attachmentName,
    status: "under_process",
    officer,
    timeline: [
      {
        date: now,
        label: "Filed",
        detail: "Sent to " + ministry.name + ".",
        tone: "neutral",
      },
    ],
  };

  putGrievance(g);

  const due = new Date(now);
  due.setDate(due.getDate() + ministry.slaDays);

  return NextResponse.json({ grievance: g, dueBy: due.toISOString(), slaDays: ministry.slaDays });
}
