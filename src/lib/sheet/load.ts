import type { Row, Viewer } from "@/lib/studio";
import { sql } from "@/lib/studio";

export type SheetRecord = { club: Row; members: Row[]; meetings: Row[]; votes: Row[]; next: string | null };

/** One batch, one transaction: the record as the signed-in scribe sees it (§5.4). */
export async function loadSheet(v: Viewer): Promise<SheetRecord> {
  const { rows } = await sql(v, [{ sql: "select name from club" }, { sql: "select * from sheet_members" }, { sql: "select * from sheet_meetings" },
    { sql: "select * from sheet_votes" }, { sql: "select slug from next_meeting" }]);
  return { club: rows[0][0], members: rows[1], meetings: rows[2], votes: rows[3], next: rows[4][0]?.slug ?? null };
}
