import { CLUB } from "@/lib/club";
import { liveViewer, MembersOnly } from "@/lib/page";
import { sql, studio } from "@/lib/studio";
import { ConnectAi, type Example } from "./ConnectAi";

/** Examples that are true for this club and this person: every one works with their own access. Admins get the two
 *  things only they can do (post a poll, set a month); everyone else gets write-ups and their own scores. */
const ASK: Example[] = [
  { kind: "Ask", ask: "Which book did we score highest, and who loved it most?", does: "Reads every score and word since 2008." },
  { kind: "Ask", ask: "When's the next meeting, who's hosting, and who's coming?", does: "Reads the next meeting and the RSVPs, the same card you see on Home." },
  { kind: "Ask", ask: "What did we decide in our polls this year?", does: "Reads every poll and how it came out." },
  { kind: "Ask", ask: "How do my scores compare to everyone else's?", does: "Your highs, lows and average next to the club's." },
];
const ADMIN: Example[] = [
  { kind: "Write", ask: "Post a poll asking if we should skip December.", does: "Goes on Home under the chat. Only admins can post." },
  { kind: "Fix", ask: "Make Tim the host for January and set the date to the 22nd at 7.", does: "Updates the month for everyone, as in Admin." },
];
const MEMBER: Example[] = [
  { kind: "Write", ask: "Write up our last meeting from my notes.", does: "Shows on the book's page, signed as your AI." },
  { kind: "Ask", ask: "Which books have I missed, and why?", does: "Your missed nights and the reasons on record." },
];

export default async function Ai() {
  const v = await liveViewer(CLUB);
  if (v.kind !== "member") return <MembersOnly />;
  const [c, me] = await Promise.all([studio(v, "/site/connection").catch(() => ({ state: "none" })), sql(v, [{ sql: "select name, role from me" }]).then((r) => r.rows[0][0]).catch(() => null)]);
  const ini = String(me?.name ?? "You").split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  return <ConnectAi handle={CLUB} initial={c} ini={ini} examples={[...ASK, ...(me?.role === "scribe" ? ADMIN : MEMBER)]} />;
}
