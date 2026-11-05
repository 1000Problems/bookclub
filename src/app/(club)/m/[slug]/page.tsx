import { CLUB } from "@/lib/club";
import { Fresh } from "@/components/Fresh";
import { scoring } from "@/lib/actions";
import { base, Hidden, L, load, MembersOnly, Notice, Title, type Page } from "@/lib/page";
import { Md, whenLong } from "@/lib/text";

export default async function Meeting({ params, searchParams }: Page) {
  const handle = CLUB; const { slug } = await params;
  const q = await searchParams, b = base(handle), here = `${b}/m/${slug}`;
  const { rows, signedIn } = await load(handle, (v) => [
    { sql: "select * from meeting_cards where slug = $1", params: [slug] },
    { sql: "select member, name, attendance, score, word, source, corrected from meeting_votes where meeting = $1 order by score desc nulls last", params: [slug] },
    { sql: "select body, written_by_name, written_at from writeups where subject = $1", params: [`m:${slug}`] },
    { sql: "select meets_at, food, notes from meetings where slug = $1", params: [slug] },
    ...(v.kind === "member" ? [{ sql: "select slug, role from me" }] : []),
  ]);
  if (!rows) return <MembersOnly />;
  const m = rows[0][0], me = rows[4]?.[0];
  if (!m) return <p className="muted">No such meeting.</p>;
  const canRun = me && (me.role === "scribe" || m.host === me.slug), x = rows[3][0];
  const act = (to: string, t: string) => <form action={scoring}><Hidden handle={handle} back={here} /><input type="hidden" name="meeting" value={slug} /><input type="hidden" name="to" value={to} /><button className="btn btn-ink">{t}</button></form>;
  return <>
    {signedIn && <Fresh />}
    <Notice q={q} handle={handle} here={here} />
    <Title>{m.title ?? slug}</Title>
    <p className="muted">{m.author}</p>
    <p className="mt-2">{whenLong(x.meets_at)} · {m.venue_label ?? "Place TBD"} · Hosted by {m.host_name}</p>
    {x.food && <p className="muted">{x.food}</p>}{x.notes && <p className="muted">{x.notes}</p>}
    {m.club_score != null && <p className="mono text-3xl my-3">{Number(m.club_score).toFixed(1)} <span className="text-sm muted">#{m.rank_all}{m.gr_x2 != null && ` · GR×2 ${Number(m.gr_x2).toFixed(1)}`}</span></p>}
    <div className="flex gap-2 my-3 flex-wrap">
      {canRun && m.scoring === "not_open" && act("open", "Open scoring")}
      {canRun && m.scoring === "open" && act("revealed", "Reveal")}
      {me?.role === "scribe" && m.scoring === "revealed" && act("open", "Reopen scoring")}
      {signedIn && m.scoring === "open" && <L className="btn" href={`${here}/score`}>Score</L>}
      {canRun && m.scoring === "open" && <L className="btn" href={`${here}/goaround`}>Go-around</L>}
      <L className="btn" href={`${b}/talk/${slug}`}>Talk</L>
    </div>
    <ul className="card p-4 grid gap-2">{rows[1].length === 0 && <li className="muted">No scores to show.</li>}
      {rows[1].map((v) => <li key={v.member} className="flex justify-between"><span>{v.name}</span>
        <span className="mono">{v.score != null ? Number(v.score) : "—"} {v.word ?? v.attendance}{v.corrected && <span className="faint text-xs"> corrected</span>}</span></li>)}
    </ul>
    {rows[2].map((w) => <section key={w.written_at} className="card p-4 mt-3"><p className="voice-claude label">written by {w.written_by_name}&apos;s AI · {new Date(w.written_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p><Md text={w.body} /></section>)}
  </>;
}
