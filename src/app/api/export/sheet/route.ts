import { notFound } from "next/navigation";
import { CLUB } from "@/lib/club";
import { loadSheet } from "@/lib/sheet/load";
import { renderSheet } from "@/lib/sheet/render";
import { sql, StudioError } from "@/lib/studio";
import { viewerFor } from "@/lib/viewer";

/** Rebuilt from Studio on each request. Anyone but a scribe gets a 404. */
export async function GET() {
  const v = await viewerFor(CLUB);
  if (v.kind !== "member") notFound();
  const role = await sql(v, [{ sql: "select role from me" }]).then((r) => r.rows[0][0]?.role).catch((e) => { if (e instanceof StudioError) return null; throw e; });
  if (role !== "scribe") notFound();
  const file = await renderSheet(await loadSheet(v)).xlsx.writeBuffer();
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
  return new Response(file as ArrayBuffer, { headers: {
    "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "content-disposition": `attachment; filename="Soul-Crushers-History-${day}.xlsx"`, "cache-control": "no-store" } });
}
