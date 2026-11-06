import { CLUB } from "@/lib/club";
import { L, load, MembersOnly } from "@/lib/page";
import { NOTES, notesOf, profiles, sgn, type Profile } from "@/lib/members";
import { r2, RECORD, shape } from "@/lib/record";
import { sql } from "@/lib/studio";

function Current({ m }: { m: Profile }) {
  return <L href={`/members/${m.slug}`} className="sc-mcard">
    <div className="sc-mcard-h" style={{ background: m.tint.hero }}>
      <span className="sc-ini" style={{ background: m.tint.dot }}>{m.ini}</span>
      <span className="sc-mcard-who"><span>{m.name}</span><span>{m.since}</span></span>
      <span className="sc-mcard-avg"><b>{r2(m.average)}</b><span>avg of {m.count}</span></span>
    </div>
    <div className="sc-mcard-b">
      <div className="flex items-center gap-2 flex-wrap"><span className="sc-lean" style={{ background: m.leanBg, color: m.leanColor }}>{m.leanWord} grader {m.lean === null ? "—" : sgn(m.lean)}</span><span className="muted" style={{ fontSize: 13 }}>vs the club</span></div>
      <div className="sc-hilo">
        <div><span className="sc-eyebrow">Highest · {r2(m.hi?.v.score)}</span><span>{m.hi?.m.title ?? "—"}</span></div>
        <div><span className="sc-eyebrow">Lowest · {r2(m.lo?.v.score)}</span><span>{m.lo?.m.title ?? "—"}</span></div>
      </div>
      {m.words.length > 0 && <div className="sc-col" style={{ gap: 6 }}><span className="sc-eyebrow">Recent words</span><div className="sc-words">{m.words.map((w) => <i key={w.slug} title={w.title}>{w.word}</i>)}</div></div>}
      <div className="sc-mcard-f"><span><b>{m.hostedN}</b> hosted</span><span><b>{m.missedN}</b> missed{m.reasonShort}</span>{m.bestHost && <span>{m.bestHost}</span>}</div>
    </div>
  </L>;
}

export default async function Members() {
  const { v, rows } = await load(CLUB, () => RECORD);
  if (!rows) return <MembersOnly />;
  const { books, members } = shape(rows);
  const notes = notesOf(await sql(v, [NOTES]).then((r) => r.rows[0]).catch(() => []));
  const all = profiles(books, members, notes);
  const cur = all.filter((m) => m.current), past = all.filter((m) => m.status === "alumni" && m.count > 0);
  return <div className="sc-col" style={{ gap: 20 }}>
    <div className="sc-col" style={{ gap: 8 }}><h1 className="sc-h1">At the table now</h1><span className="muted" style={{ fontSize: 15 }}>{cur.length} now · everyone who has sat at the table since {Math.min(...books.map((b) => b.year))}</span></div>
    <div className="sc-mgrid">{cur.map((m) => <Current key={m.slug} m={m} />)}</div>
    {past.length > 0 && <><span className="mt-3" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.03em" }}>Past members</span>
      <div className="sc-pastgrid">{past.map((m) => <L key={m.slug} href={`/members/${m.slug}`} className="sc-past">
        <span className="sc-ini sm" style={{ background: m.tint.dot }}>{m.ini}</span>
        <span className="sc-past-who"><span>{m.name}</span><span>{m.span} · {m.count} scored · {m.leanWord}</span></span>
        <b>{r2(m.average)}</b>
      </L>)}</div></>}
  </div>;
}
