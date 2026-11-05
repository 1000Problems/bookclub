import { base, L, load, MembersOnly, Title, type Page } from "@/lib/page";

export default async function Book({ params }: Page) {
  const { handle, slug } = await params;
  const { rows } = await load(handle, () => [{ sql: "select * from book_cards where slug = $1", params: [slug] }, { sql: "select name, word, score from words where book = $1 order by score desc nulls last", params: [slug] }]);
  if (!rows) return <MembersOnly />;
  const k = rows[0][0];
  if (!k) return <p className="muted">No such book.</p>;
  return <><Title>{k.title}</Title><p className="muted">{k.author}</p>
    {k.kind && <p className={k.kind_by === "ai" ? "mt-2 inline-block px-2 rounded" : "mt-2"} style={k.kind_by === "ai" ? { border: "1px dashed var(--line)" } : undefined}>{k.kind}</p>}
    <p className="mt-2">On a slate {k.times_on_slate} times</p>
    <ul className="mt-3">{k.meetings.map((m: string) => <li key={m}><L href={`${base(handle)}/m/${m}`}>{m}</L></li>)}</ul>
    <ul className="card p-4 mt-3">{rows[1].map((w, i) => <li key={i}>{w.name}: {w.word}</li>)}</ul></>;
}
