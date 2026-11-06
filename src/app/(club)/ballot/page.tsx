import { CLUB } from "@/lib/club";
import { Fresh } from "@/components/Fresh";
import { RankPicker } from "@/components/ui";
import { surname, tint } from "@/lib/record";
import { castBallot } from "@/lib/actions";
import { liveViewer, base, Hidden, Notice, Title, type Page } from "@/lib/page";
import { sql } from "@/lib/studio";

export default async function Ballot({ params, searchParams }: Page) {
  const handle = CLUB;
  const q = await searchParams, here = `${base(handle)}/ballot`;
  const v = await liveViewer(handle);
  if (v.kind !== "member") return <p className="muted">Members: sign in.</p>;
  const slate = (await sql(v, [{ sql: "select slate from open_actions where kind = 'ballot'" }])).rows[0][0]?.slate;
  if (slate) await sql(v, [{ sql: "select close_if_due($1)", params: [slate] }]);
  if (!slate) return <><Notice q={q} handle={handle} here={here} /><p className="muted">No ballot is open.</p></>;
  const { rows } = await sql(v, [{ sql: "select book, title, author, pitch, cover_url from slate_cards where slate = $1 order by added_at", params: [slate] }, { sql: "select * from ballot_turnout($1)", params: [slate] }]);
  const t = rows[1][0];
  return <><Fresh ballot /><Notice q={q} handle={handle} here={here} /><Title>Vote for next book</Title>
    <p className="muted mb-3">Secret from everyone in the club and every AI. Not a bank vault.</p>
    {t.me_cast ? <p className="card p-4">Your ballot is in. {t.cast_count} of {t.eligible} have voted.</p> : <>
      <form action={castBallot}><Hidden handle={handle} back={here} /><input type="hidden" name="slate" value={slate} /><RankPicker books={rows[0].map((b) => ({ book: b.book, title: b.title, author: b.author, pitch: b.pitch, cover: b.cover_url, bg: tint(b.title), sur: surname(b.author) }))}><button className="btn btn-ink btn-lg">Confirm</button></RankPicker></form>
      <p className="muted mt-2">{t.cast_count} of {t.eligible} have voted.</p></>}</>;
}
