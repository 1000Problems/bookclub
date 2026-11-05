import { base, L, load, MembersOnly, Title, type Page } from "@/lib/page";
import type { Row } from "@/lib/studio";

const n1 = (v: unknown) => (v == null ? "—" : Number(v).toFixed(1));
const Sec = ({ t, children }: { t: string; children: React.ReactNode }) => <section className="card p-4 mb-3"><h2 className="label mb-2">{t}</h2>{children}</section>;

export default async function Stats({ params }: Page) {
  const { handle } = await params;
  const b = base(handle);
  const { rows } = await load(handle, () => [
    { sql: "select title, club_score, gr_x2, delta, rank_all, meeting from book_scores order by rank_all limit 10" },
    { sql: "select title, club_score, rank_all, meeting from book_scores order by rank_all desc limit 10" },
    { sql: "select name, n, mean, easy_rank, harsh_rank from member_stats where easy_rank is not null order by easy_rank" },
    { sql: "select period, period_kind, fiction, nonfiction, untagged, pct_fiction from mix order by period" },
    { sql: "select name, times_hosted, mean_pick_score, best_title, best_meeting from host_stats order by times_hosted desc" },
    { sql: "select name, attended, missed, out, longest_streak from attendance order by attended desc" },
    { sql: "select title, delta, meeting from book_scores where delta is not null order by delta desc limit 5" },
    { sql: "select title, rank_all, ranked_count from last_meeting" },
  ]);
  if (!rows) return <MembersOnly />;
  const line = (r: Row) => <li key={r.meeting}><L href={`${b}/m/${r.meeting}`}>#{r.rank_all} {r.title} <span className="mono">{n1(r.club_score)}</span></L></li>;
  return <><Title>Stats</Title>
    {rows[0].length === 0 && <p className="muted mb-3">Scores are members-only</p>}
    {rows[0].length > 0 && <Sec t="Top 10"><ol>{rows[0].map(line)}</ol></Sec>}
    {rows[1].length > 0 && <Sec t="Bottom 10"><ol>{rows[1].map(line)}</ol></Sec>}
    {rows[7][0]?.rank_all != null && <Sec t="Latest"><p>{rows[7][0].title} is #{rows[7][0].rank_all} of {rows[7][0].ranked_count}</p></Sec>}
    {rows[2].length > 0 && <Sec t="Easiest to harshest"><ol>{rows[2].map((r) => <li key={r.name}>{r.name} <span className="mono">{Number(r.mean).toFixed(2)}</span> <span className="faint">n={r.n}</span></li>)}</ol></Sec>}
    <Sec t="Fiction mix"><ul>{rows[3].filter((r) => r.period_kind === "era").map((r) => <li key={r.period}><L href={`${b}/history`}>{r.period}: {r.fiction} fiction, {r.nonfiction} nonfiction{r.untagged ? `, ${r.untagged} untagged` : ""}</L></li>)}</ul></Sec>
    <Sec t="Hosts"><ul>{rows[4].map((r) => <li key={r.name}>{r.name}: {r.times_hosted} hosted{r.mean_pick_score != null && ` · ${n1(r.mean_pick_score)}`}{r.best_meeting && <> · <L href={`${b}/m/${r.best_meeting}`}>{r.best_title}</L></>}</li>)}</ul></Sec>
    {rows[5].length > 0 && <Sec t="Attendance"><ul>{rows[5].map((r) => <li key={r.name}>{r.name}: {r.attended} attended, {r.missed} missed, streak {r.longest_streak}</li>)}</ul></Sec>}
    {rows[6].length > 0 && <Sec t="Club vs Goodreads"><ul>{rows[6].map((r) => <li key={r.meeting}><L href={`${b}/m/${r.meeting}`}>{r.title} <span className="mono">{Number(r.delta).toFixed(1)}</span></L></li>)}</ul></Sec>}</>;
}
