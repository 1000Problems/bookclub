import { sql } from "@/lib/studio";
import { viewerFor } from "@/lib/viewer";

const stamp = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
const esc = (s: string) => s.replace(/[\\,;]/g, "\\$&").replace(/\n/g, "\\n");

export async function GET(_: Request, { params }: { params: Promise<{ handle: string; slug: string }> }) {
  const { handle, slug } = await params;
  const v = await viewerFor(handle);
  if (v.kind !== "member") return new Response("Members: sign in.", { status: 401 });
  const { rows } = await sql(v, [
    { sql: "select title, meets_at from meeting_cards c join meetings m using (slug) where slug = $1", params: [slug] },
    { sql: "select address from meeting_directions where meeting = $1", params: [slug] },
  ]);
  const m = rows[0][0];
  if (!m?.meets_at) return new Response("No date yet.", { status: 404 });
  const start = new Date(m.meets_at), end = new Date(start.getTime() + 3 * 3600_000);
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//1000Problems//Book Club//EN", "BEGIN:VEVENT", `UID:${handle}-${slug}@bookclub`,
    `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${esc(`Book Club: ${m.title}`)}`,
    ...(rows[1][0]?.address ? [`LOCATION:${esc(rows[1][0].address)}`] : []), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return new Response(body, { headers: { "content-type": "text/calendar", "content-disposition": `attachment; filename="${slug}.ics"` } });
}
