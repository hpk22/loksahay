import type { Grievance } from "./types";
import { cpgramsSanitize } from "./ascii";

/**
 * In-memory store. No database by design at this stage.
 * The client also mirrors each filed grievance into localStorage so a tracking
 * link keeps working even when a serverless instance is recycled.
 */
const db = new Map<string, Grievance>();

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export function addDays(iso: string, n: number): Date {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d;
}

export function fmtDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function daysBetween(a: string | Date, b: string | Date): number {
  const x = typeof a === "string" ? new Date(a) : a;
  const y = typeof b === "string" ? new Date(b) : b;
  return Math.round((y.getTime() - x.getTime()) / 86_400_000);
}

function seed() {
  if (db.size) return;

  // Case 1 reproduces the failure mode we found on the live portal:
  // received, then "disposed of" a week later with no action taken report.
  const filed1 = daysAgo(34);
  const closed1 = daysAgo(27);
  const original1 =
    "माझी पेन्शन गेल्या चार महिन्यांपासून जमा झालेली नाही. मी बँकेत तीन वेळा गेलो आणि कार्यालयातही चौकशी केली, पण कोणीही उत्तर देत नाही.";
  const s1 = cpgramsSanitize(original1);
  db.set("LKS/DOPPW/2026/0004821", {
    id: "LKS/DOPPW/2026/0004821",
    createdAt: filed1,
    mobileLast4: "2550",
    language: "mr-IN",
    languageName: "Marathi",
    ministryId: "DOPPW",
    path: ["not_credited", "monthly_stopped"],
    fields: { ppo: "Not available", months: "May 2026", bank: "Bank of Maharashtra" },
    original: original1,
    ascii: s1.ascii,
    droppedChars: s1.dropped,
    status: "disposed",
    closedAt: closed1,
    atr: "", // Empty on purpose. This is the whole problem.
    officer: { role: "Subordinate officer", organisation: "Department of Pension", independence: "same_org" },
    timeline: [
      { date: filed1, label: "You filed this grievance", tone: "neutral" },
      {
        date: closed1,
        label: "Marked CASE DISPOSED OF",
        detail: "No action taken report was recorded.",
        actor: "Department of Pension",
        tone: "bad",
      },
    ],
  });

  // Case 2: what a good outcome looks like, for contrast.
  const filed2 = daysAgo(19);
  const acted2 = daysAgo(9);
  const closed2 = daysAgo(6);
  const original2 = "Speed post booked on 5th has not been delivered and tracking has not moved for nine days.";
  const s2 = cpgramsSanitize(original2);
  db.set("LKS/DPOST/2026/0011204", {
    id: "LKS/DPOST/2026/0011204",
    createdAt: filed2,
    mobileLast4: "4417",
    language: "en-IN",
    languageName: "English",
    ministryId: "DPOST",
    path: ["delivery", "not_delivered"],
    fields: { tracking: "EX1234567IN", booked_on: "5 Aug 2026", office: "Kothrud HO" },
    original: original2,
    ascii: s2.ascii,
    droppedChars: s2.dropped,
    status: "resolved",
    closedAt: closed2,
    atr: "Article was mis-sorted to the Warje sub-office. It has been retrieved and delivered on 20 Aug 2026. The sorting assistant has been counselled and the delivery register corrected.",
    officer: { role: "Superintendent of Post Offices", organisation: "India Post, Pune", independence: "same_org" },
    timeline: [
      { date: filed2, label: "You filed this grievance", tone: "neutral" },
      { date: acted2, label: "Officer traced the article", detail: "Found mis-sorted at Warje sub-office.", actor: "India Post, Pune", tone: "neutral" },
      { date: closed2, label: "Resolved with a written explanation", detail: "Article delivered. Cause identified and corrected.", actor: "India Post, Pune", tone: "good" },
    ],
  });
}

export function getGrievance(id: string): Grievance | undefined {
  seed();
  return db.get(id);
}

export function putGrievance(g: Grievance): void {
  seed();
  db.set(g.id, g);
}

export function allGrievances(): Grievance[] {
  seed();
  return [...db.values()];
}

/** CPGRAMS-shaped registration number, so the format stays familiar. */
export function makeRegistrationNumber(ministryId: string): string {
  const year = new Date().getFullYear();
  const n = Math.floor(Math.random() * 9_000_000) + 1_000_000;
  return "LKS/" + ministryId + "/" + year + "/" + String(n).slice(0, 7);
}
