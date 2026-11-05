import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SITE } from "@/lib/studio";
import { COOKIE } from "@/lib/viewer";

/** The browser's poll, forwarded: the browser never talks to Studio directly (Appendix B). */
export async function GET(req: Request) {
  const session = (await cookies()).get(COOKIE.session)?.value;
  if (!session) return NextResponse.json({ changes: [] });
  const since = new URL(req.url).searchParams.get("since") ?? "0";
  const r = await fetch(`${process.env.STUDIO_URL}/changes?since=${encodeURIComponent(since)}`, { cache: "no-store", headers: { "x-site": SITE, "x-session": session } });
  if (!r.ok) return NextResponse.json({ cursor: since, changes: [] });
  return NextResponse.json(await r.json());
}
