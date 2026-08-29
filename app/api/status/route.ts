import { NextResponse } from "next/server";
import { getGrievance } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const g = getGrievance(id);
  if (!g) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ grievance: g });
}
