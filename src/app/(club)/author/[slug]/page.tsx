import { AuthorName, Cover } from "@/components/ui";
import { CLUB } from "@/lib/club";
import { L, load, MembersOnly, type Page } from "@/lib/page";
import { avg, numeric, PHOTOS, r2, RECORD, shape, slugify, splitAuthors, surname, tint, when } from "@/lib/record";

export default async function Author({ params }: Page) {
  const { slug } = await params;
  const { rows } = await load(CLUB, () => RECORD);
  if (!rows) return <MembersOnly />;
  const books = shape(rows).books.filter((m) => splitAuthors(m.author).some((n) => slugify(n) === slug));
  if (!books.length) return <p className="muted">No such author.</p>;
  const name = splitAuthors(books[0].author).find((n) => slugify(n) === slug)!;
  const scored = books.filter((m) => m.score !== null), photo = PHOTOS[slug];
  const words = books.flatMap((m) => numeric(m).filter((v) => v.word).map((v) => ({ ...v, slug: m.slug, title: m.title })));
  const fans = new Map<string, { member: string; xs: number[] }>();
  for (const m of books) for (const v of numeric(m)) fans.set(v.name, { member: v.member, xs: [...(fans.get(v.name)?.xs ?? []), v.score!] });
  const yrs = [...new Set(books.map((m) => m.year))].join(", ");
  return <>
    <section className="sc-bookhero" style={{ background: tint(name, 0.93, 0.04) }}>
      <div className="sc-av" style={{ width: 150, height: 150, fontSize: 40, background: photo ? `center / cover url(${photo})` : "rgba(255,255,255,.7)" }}>{!photo && name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</div>
      <div className="sc-col"><AuthorName name={name} by={false} delay={300} /><span style={{ fontSize: 15, color: "#3d3b37" }}>{books.length} book{books.length === 1 ? "" : "s"} with the club{scored.length ? ` · average ${r2(avg(scored.map((m) => m.score!)))}` : ""} · {yrs}</span></div>
    </section>
    <article className="sc-art">
      <section className="sc-sec"><div className="sc-sech"><span>01</span><h2>With the club</h2></div><div className="sc-grid">{books.map((m) => <L key={m.slug} href={`/m/${m.slug}`} className="sc-col sc-card-b"><Cover title={m.title!} sur={surname(m.author)} url={m.cover} bg={tint(m.title!)} /><span className="sc-col" style={{ gap: 2 }}><b className="sc-b-t">{m.title}</b><span className="muted text-sm">{when(m)} · {r2(m.score)}</span></span></L>)}</div></section>
      {words.length > 0 && <section className="sc-sec"><div className="sc-sech"><span>02</span><h2>What we said</h2></div><div className="sc-wraps">{words.map((w, i) => <L key={i} href={`/m/${w.slug}`} className="sc-wordcard" style={{ background: "#fff" }}><span className="sc-w">{w.word}</span><span className="sc-mini">{w.name} · {r2(w.score)}{books.length > 1 ? ` · ${w.title}` : ""}</span></L>)}</div></section>}
      {books.length > 1 && fans.size > 0 && <section className="sc-sec"><div className="sc-sech"><span>03</span><h2>Who likes them</h2><span className="muted text-sm">average across their books</span></div>{[...fans].sort((a, b) => avg(b[1].xs)! - avg(a[1].xs)!).map(([who, f]) => <L key={who} href={`/members/${f.member}`} className="sc-vote" style={{ gridTemplateColumns: "110px minmax(0,1fr) 48px", alignItems: "center" }}><b>{who}</b><span className="sc-bar" style={{ maxWidth: "none", height: 6 }}><span style={{ width: `${avg(f.xs)! * 10}%`, background: "#141413" }} /></span><b style={{ fontSize: 14, textAlign: "right" }}>{r2(avg(f.xs))}</b></L>)}</section>}
    </article>
  </>;
}
