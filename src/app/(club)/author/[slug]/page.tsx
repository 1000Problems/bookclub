import { PageHead } from "@/components/ui";
import { AuthorName, Cover } from "@/components/ui";
import { CLUB } from "@/lib/club";
import { L, load, MembersOnly, type Page } from "@/lib/page";
import { avg, numeric, r2, RECORD, shape, surname, tint, when } from "@/lib/record";
import { sql } from "@/lib/studio";
import { Md } from "@/lib/text";

/** An author: facts and news from the Commons, the club's history with them, members' own Reading pages (TASK-55). */
export default async function Author({ params }: Page) {
  const { slug } = await params;
  const { v, rows, signedIn } = await load(CLUB, () => [...RECORD,
    { sql: "select name, photo_url, wikipedia, bio_facts, basics_source, born_year, died_year from authors where slug = $1", params: [slug] },
    { sql: "select headline, url, source, kind, published_on from author_news where author = $1 order by published_on desc nulls last limit 8", params: [slug] }]);
  if (!rows) return <MembersOnly />;
  const books = shape(rows).books.filter((m) => m.authors.some((a) => a.slug === slug));
  const facts = rows[4][0], news = rows[5];
  if (!books.length || !facts) return <p className="muted">No such author.</p>;
  const pages = signedIn ? await sql(v, [{ sql: "select * from member_author_pages($1)", params: [slug] }]).then((r) => r.rows[0]).catch(() => []) : [];
  const name: string = facts.name, photo: string | null = facts.photo_url;
  const scored = books.filter((m) => m.score !== null);
  const words = books.flatMap((m) => numeric(m).filter((v) => v.word).map((v) => ({ ...v, slug: m.slug, title: m.title })));
  const fans = new Map<string, { member: string; xs: number[] }>();
  for (const m of books) for (const v of numeric(m)) fans.set(v.name, { member: v.member, xs: [...(fans.get(v.name)?.xs ?? []), v.score!] });
  const yrs = [...new Set(books.map((m) => m.year))].join(", ");
  const life = facts.born_year ? ` · ${facts.born_year}–${facts.died_year ?? ""}` : "";
  let sec = 0;
  const no = () => String(++sec).padStart(2, "0");
  return <>
    <PageHead tint={tint(name, 0.93, 0.04)} media={<div className="sc-av" style={{ width: 150, height: 150, fontSize: 40, background: photo ? `center / cover url(${photo})` : "rgba(255,255,255,.7)" }}>{!photo && name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</div>}
      eyebrow="Author" title={<AuthorName name={name} by={false} delay={300} />}
      sub={<>{books.length} book{books.length === 1 ? "" : "s"} with the club{scored.length ? ` · average ${r2(avg(scored.map((m) => m.score!)))}` : ""} · {yrs}{life}</>}
      right={facts.basics_source ? <a href={facts.basics_source} className="btn" rel="noopener">{/wikipedia\.org/.test(facts.basics_source) ? "From Wikipedia" : "Source"}</a> : undefined} />
    {facts.bio_facts && <p className="sc-bio">{facts.bio_facts}</p>}
    <article className="sc-art">
      <section className="sc-sec"><div className="sc-sech"><span>{no()}</span><h2>With the club</h2></div><div className="sc-grid">{books.map((m) => <L key={m.slug} href={`/m/${m.slug}`} className="sc-col sc-card-b"><Cover title={m.title!} sur={surname(m.author)} url={m.cover} bg={tint(m.title!)} /><span className="sc-col" style={{ gap: 2 }}><b className="sc-b-t">{m.title}</b><span className="muted text-sm">{when(m)} · {r2(m.score)}</span></span></L>)}</div></section>
      {words.length > 0 && <section className="sc-sec"><div className="sc-sech"><span>{no()}</span><h2>What we said</h2></div><div className="sc-wraps">{words.map((w, i) => <L key={i} href={`/m/${w.slug}`} className="sc-wordcard" style={{ background: "#fff" }}><span className="sc-w">{w.word}</span><span className="sc-mini">{w.name} · {r2(w.score)}{books.length > 1 ? ` · ${w.title}` : ""}</span></L>)}</div></section>}
      {books.length > 1 && fans.size > 0 && <section className="sc-sec"><div className="sc-sech"><span>{no()}</span><h2>Who likes them</h2><span className="muted text-sm">average across their books</span></div>{[...fans].sort((a, b) => avg(b[1].xs)! - avg(a[1].xs)!).map(([who, f]) => <L key={who} href={`/members/${f.member}`} className="sc-vote" style={{ gridTemplateColumns: "110px minmax(0,1fr) 48px", alignItems: "center" }}><b>{who}</b><span className="sc-bar" style={{ maxWidth: "none", height: 6 }}><span style={{ width: `${avg(f.xs)! * 10}%`, background: "#141413" }} /></span><b style={{ fontSize: 14, textAlign: "right" }}>{r2(avg(f.xs))}</b></L>)}</section>}
      {news.length > 0 && <section className="sc-sec"><div className="sc-sech"><span>{no()}</span><h2>Lately</h2><span className="muted text-sm">news and articles</span></div><div className="sc-col" style={{ gap: 10 }}>{news.map((n) => <a key={n.url} href={n.url} rel="noopener nofollow" className="sc-col" style={{ gap: 2 }}><b style={{ fontSize: 15 }}>{n.headline}</b><span className="muted text-xs">{[n.source, n.published_on?.slice?.(0, 10), n.kind !== "news" ? n.kind : null].filter(Boolean).join(" · ")}</span></a>)}</div></section>}
      {pages.length > 0 && <section className="sc-sec"><div className="sc-sech"><span>{no()}</span><h2>From members&apos; Reading</h2><span className="muted text-sm">their own pages, shown to members</span></div>
        {pages.map((p) => <div key={p.member} className="sc-col" style={{ gap: 6 }}><span className="sc-between"><b>{p.name}{p.section ? ` · ${p.section}` : ""}</b><a href={p.page_url} className="label" rel="noopener">Full page in Reading →</a></span><Md text={p.body ?? ""} /></div>)}</section>}
    </article>
  </>;
}
