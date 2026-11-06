import { CLUB } from "@/lib/club";
import { L, load, MembersOnly } from "@/lib/page";
import { avg, r2, RECORD, shape, tint } from "@/lib/record";

export default async function Members() {
  const { rows } = await load(CLUB, () => RECORD);
  if (!rows) return <MembersOnly />;
  const { books, members } = shape(rows);
  const stat = (m: { slug: string; name: string }) => {
    const vs = books.filter((b) => b.votes.some((v) => v.member === m.slug)).map((b) => ({ b, v: b.votes.find((v) => v.member === m.slug)! }));
    const num = vs.filter((x) => x.v.score !== null), yrs = vs.map((x) => x.b.year);
    return { ...m, span: yrs.length ? `${Math.min(...yrs)}–${Math.max(...yrs)}` : "", avg: r2(avg(num.map((x) => x.v.score!))), count: num.length, hosted: books.filter((b) => b.host === m.slug).length, last: vs.find((x) => x.v.word)?.v.word ?? "—" };
  };
  const cur = members.filter((m) => m.status === "active").map((m) => stat(m as { slug: string; name: string })), past = members.filter((m) => m.status === "alumni").map((m) => stat(m as { slug: string; name: string }));
  return <div className="sc-col" style={{ gap: 20 }}>
    <div className="flex flex-wrap items-baseline gap-3"><h1 className="sc-h1">Members</h1><span className="muted" style={{ fontSize: 15 }}>{cur.length} now · everyone who has sat at the table since {Math.min(...books.map((b) => b.year))}</span></div>
    <div className="sc-mems">{cur.map((m) => <L key={m.slug} href={`/members/${m.slug}`} className="sc-mem">
      <div className="flex items-center gap-3"><span className="sc-tick" style={{ background: tint(m.name, 0.8, 0.09) }} /><span className="flex flex-col"><span style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-.02em" }}>{m.name}</span><span className="muted text-xs">{m.span}</span></span></div>
      <div className="sc-nums2"><span><b>{m.avg}</b>average</span><span><b>{m.count}</b>scored</span><span><b>{m.hosted}</b>hosted</span></div>
      <span className="muted" style={{ fontSize: 13 }}>Latest word <i className="sc-w" style={{ fontSize: 17, color: "#141413" }}>{m.last}</i></span></L>)}</div>
    {past.length > 0 && <><span className="mt-4" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.03em" }}>Past members</span>
    <div className="sc-mems">{past.map((m) => <L key={m.slug} href={`/members/${m.slug}`} className="sc-mem">
      <div className="flex items-center gap-3"><span className="sc-tick" style={{ height: 28, background: tint(m.name, 0.8, 0.09) }} /><span className="flex flex-col"><span style={{ fontSize: 17, fontWeight: 700 }}>{m.name}</span><span className="muted text-xs">{m.span}</span></span></div>
      <span style={{ fontSize: 13, color: "#3d3b37" }}><b>{m.avg}</b> avg · {m.count} scored · {m.hosted} hosted</span></L>)}</div></>}
  </div>;
}
