import { load, MembersOnly, Title, type Page } from "@/lib/page";

export default async function Member({ params }: Page) {
  const { handle, slug } = await params;
  const { rows } = await load(handle, () => [
    { sql: "select name from members where slug = $1", params: [slug] }, { sql: "select * from member_stats where member = $1", params: [slug] },
    { sql: "select word, title, meeting from words where member = $1 order by meeting desc", params: [slug] }, { sql: "select * from host_stats where member = $1", params: [slug] },
  ]);
  if (!rows) return <MembersOnly />;
  const s = rows[1][0], h = rows[3][0];
  return <><Title>{rows[0][0]?.name ?? slug}</Title>
    {s && <p>Mean <span className="mono">{Number(s.mean).toFixed(2)}</span> over {s.n}{s.easy_rank && ` · easy #${s.easy_rank} · harsh #${s.harsh_rank}`}</p>}
    {h && <p>Hosted {h.times_hosted}</p>}
    <ul className="card p-4 mt-3">{rows[2].map((w) => <li key={w.meeting}>{w.word} <span className="faint">{w.title}</span></li>)}</ul></>;
}
