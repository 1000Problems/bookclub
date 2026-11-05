import { Fresh } from "@/components/Fresh";
import { castBallot } from "@/lib/actions";
import { base, Hidden, Notice, Title, type Page } from "@/lib/page";
import { sql } from "@/lib/studio";
import { viewerFor } from "@/lib/viewer";

export default async function Ballot({ params, searchParams }: Page) {
  const { handle } = await params;
  const q = await searchParams, here = `${base(handle)}/ballot`;
  const v = await viewerFor(handle);
  if (v.kind !== "member") return <p className="muted">Members: sign in.</p>;
  const slate = (await sql(v, [{ sql: "select slate from open_actions where kind = 'ballot'" }])).rows[0][0]?.slate;
  if (slate) await sql(v, [{ sql: "select close_if_due($1)", params: [slate] }]);
  if (!slate) return <><Notice q={q} handle={handle} here={here} /><p className="muted">No ballot is open.</p></>;
  const { rows } = await sql(v, [{ sql: "select book, title, author, pitch from slate_cards where slate = $1 order by added_at", params: [slate] }, { sql: "select * from ballot_turnout($1)", params: [slate] }]);
  const t = rows[1][0];
  const Pick = ({ n, label, req }: { n: string; label: string; req?: boolean }) => <label className="label">{label}<select className="field" name={n} required={req} defaultValue=""><option value="">—</option>{rows[0].map((b) => <option key={b.book} value={b.book}>{b.title}</option>)}</select></label>;
  return <><Fresh ballot /><Notice q={q} handle={handle} here={here} /><Title>Vote for next book</Title>
    <p className="muted mb-3">Secret from everyone in the club and every AI. Not a bank vault.</p>
    {t.me_cast ? <p className="card p-4">Your ballot is in. {t.cast_count} of {t.eligible} have voted.</p> : <>
      <ul className="grid gap-2 mb-3">{rows[0].map((b) => <li key={b.book} className="card-lift p-3"><span className="serif text-lg">{b.title}</span> <span className="muted">{b.author}</span><p className="muted">{b.pitch}</p></li>)}</ul>
      <form action={castBallot} className="grid gap-2"><Hidden handle={handle} back={here} /><input type="hidden" name="slate" value={slate} /><Pick n="first" label="1st" req /><Pick n="second" label="2nd" /><Pick n="third" label="3rd" /><button className="btn btn-ink btn-lg">Confirm</button></form>
      <p className="muted mt-2">{t.cast_count} of {t.eligible} have voted.</p></>}</>;
}
