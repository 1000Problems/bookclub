import { Cover } from "@/components/ui";
import { CLUB } from "@/lib/club";
import { L, load, MembersOnly, type Page } from "@/lib/page";
import { avg, r2, RECORD, shape, surname, tint, when } from "@/lib/record";

export default async function Member({ params }: Page) {
  const { slug } = await params;
  const { rows } = await load(CLUB, () => RECORD);
  if (!rows) return <MembersOnly />;
  const { books, members } = shape(rows), who = members.find((m) => m.slug === slug);
  if (!who) return <p className="muted">No such member.</p>;
  const vs = books.flatMap((b) => b.votes.filter((v) => v.member === slug).map((v) => ({ b, v })));
  const num = vs.filter((x) => x.v.score !== null), hosted = books.filter((b) => b.host === slug), yrs = vs.map((x) => x.b.year);
  const hi = [...num].sort((a, b) => b.v.score! - a.v.score!)[0], lo = [...num].sort((a, b) => a.v.score! - b.v.score!)[0];
  const n = (b: string, s: string | number) => <span className="flex flex-col"><b style={{ fontSize: 34, letterSpacing: "-.04em" }}>{s}</b><span style={{ fontSize: 13, color: "#3d3b37" }}>{b}</span></span>;
  return <div className="sc-col" style={{ gap: 28 }}>
    <div className="sc-memhero" style={{ background: tint(who.name, 0.94, 0.035) }}>
      <L href="/members" className="label">← Members</L><h1>{who.name}</h1>
      {yrs.length > 0 && <span style={{ fontSize: 15, color: "#3d3b37" }}>{Math.min(...yrs)}–{Math.max(...yrs)}</span>}
      <div className="flex flex-wrap gap-7">{n("average score", r2(avg(num.map((x) => x.v.score!))))}{n("books scored", num.length)}{n("words", vs.filter((x) => x.v.word).length)}{n("hosted", hosted.length)}</div>
      {hi && <div className="sc-wraps"><L href={`/m/${hi.b.slug}`} className="sc-chipb" style={{ height: "auto", padding: "10px 14px", fontWeight: 400 }}>Highest: <b>{r2(hi.v.score)}</b> for <i>{hi.b.title}</i></L><L href={`/m/${lo.b.slug}`} className="sc-chipb" style={{ height: "auto", padding: "10px 14px", fontWeight: 400 }}>Lowest: <b>{r2(lo.v.score)}</b> for <i>{lo.b.title}</i></L></div>}
    </div>
    {hosted.length > 0 && <section className="sc-col"><span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.03em" }}>Hosted</span><div className="flex gap-3.5 overflow-x-auto pb-2">{hosted.map((b) => <L key={b.slug} href={`/m/${b.slug}`} className="sc-col" style={{ width: 96, flexShrink: 0, gap: 6 }}><Cover title={b.title!} sur={surname(b.author)} url={b.cover} bg={tint(b.title!)} size="sm" /><span className="muted text-xs">{when(b)}</span></L>)}</div></section>}
    <section className="sc-col"><span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.03em" }}>Every score</span>
      <div className="sc-scores">{vs.map(({ b, v }) => { const dl = v.score !== null && b.score !== null ? v.score - b.score : null; return <L key={b.slug} href={`/m/${b.slug}`} className="sc-sr" style={{ opacity: v.score === null ? 0.5 : 1 }}>
        <Cover title={b.title!} sur={surname(b.author)} url={b.cover} bg={tint(b.title!)} size="xs" style={{ width: 30 }} />
        <span className="flex flex-col gap-0.5 min-w-0"><span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{b.title} <i className="sc-w" style={{ fontWeight: 400, fontSize: 16, color: "#3d3b37" }}>{v.word}</i></span><span className="muted text-xs">{when(b)} · club {r2(b.score)}</span></span>
        <span style={{ fontSize: 18, fontWeight: 700, textAlign: "right" }}>{v.score !== null ? r2(v.score) : v.attendance}</span>
        <span className="text-xs" style={{ textAlign: "right", color: dl === null ? "#8f8d87" : dl >= 0 ? "oklch(.50 .10 155)" : "oklch(.50 .15 28)" }}>{dl === null ? "" : `${dl >= 0 ? "+" : ""}${r2(dl)}`}</span></L>; })}</div>
      <span className="faint text-xs">Right column: their score against the club average.</span></section>
  </div>;
}
