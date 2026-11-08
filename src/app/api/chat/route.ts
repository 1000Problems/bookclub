import { NextResponse } from "next/server";
import { CLUB } from "@/lib/club";
import { sql } from "@/lib/studio";
import { viewerFor } from "@/lib/viewer";

/** Home's chat check: only posts newer than `after`. Usually an empty list. Members only, never cached. */
export async function GET(req: Request) {
  const v = await viewerFor(CLUB);
  if (v.kind !== "member") return NextResponse.json({ posts: [] });
  const after = new URL(req.url).searchParams.get("after") ?? "1970-01-01T00:00:00Z";
  try {
    const r = await sql(v, [{ sql: "select id, name, body, created_at from club_posts where created_at > $1::timestamptz order by created_at limit 40", params: [after] }]);
    return NextResponse.json({ posts: r.rows[0] }, { headers: { "cache-control": "no-store" } });
  } catch { return NextResponse.json({ posts: [] }); }
}
