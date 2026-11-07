import { NextResponse } from "next/server";
import { CLUB } from "@/lib/club";
import { studio } from "@/lib/studio";
import { viewerFor } from "@/lib/viewer";

/** Connect your AI: the page asks every second while it waits. The browser never talks to Studio directly. */
export async function GET() {
  const v = await viewerFor(CLUB);
  if (v.kind !== "member") return NextResponse.json({ state: "signed_out" }, { headers: { "cache-control": "no-store" } });
  const c = await studio(v, "/site/connection").catch(() => null);
  return NextResponse.json(c ?? { state: "unknown" }, { headers: { "cache-control": "no-store" } });
}
