import { AuthorName, Cover } from "@/components/ui";
import { Fresh } from "@/components/Fresh";
import { saveBookDetails, saveScore, scoring } from "@/lib/actions";
import { CLUB } from "@/lib/club";
import { Hidden, L, load, MembersOnly, Notice, type Page } from "@/lib/page";
import { MONL, monthOf, numeric, r2, RECORD, shape, surname, tint, when } from "@/lib/record";
import { sql } from "@/lib/studio";
import { Md, whenLong } from "@/lib/text";

export default async function Meeting({ params, searchParams }: Page) {
  const { slug } = await params;
  const q = await searchParams, here = `/m/${slug}`;
  const { v, rows, signedIn } = await load(CLUB, (x) => [...RECORD,
    { sql: "select body, written_by_name, written_at from writeups where subject = $1", params: [`m:${slug}`] },
    { sql: "select premise, basics_source, isbn from book_cards where slug = (select book from meetings where slug = $1)", params: [slug] },
    ...(x.kind === "member" ? [{ sql: "select slug, role from me" }] : [])]);
  if (!rows) return <MembersOnly />;
  const { books, all } = shape(rows), m = all.find((x) => x.slug === slug), basics = rows[5][0], me = rows[6]?.[0];
  if (!m) return <p className="muted">No such meeting.</p>;
  // Members' own Reading pages for this book: signed-in members only, opted-in readers only (TASK-55 §5).
  const pages = signedIn && m.book ? await sql(v, [{ sql: "select * from member_pages($1)", params: [m.book] }]).then((r) => r.rows[0]).catch(() => []) : [];
  const comments = await sql(v, [{ sql: "select member, comment, miss_reason from votes where meeting = $1", params: [slug] }]).then((r) => r.rows[0]).catch(() => []);
  const note = (id: string) => { const c = comments.find((x) => x.member === id); return c?.comment ?? c?.miss_reason ?? ""; };
  const title = m.title ?? "Book not chosen yet", canRun = me && (me.role === "scribe" || m.host === me.slug);
  const num = numeric(m).sort((a, b) => b.score! - a.score!), missed = m.votes.filter((x) => x.score === null);
  const i = books.findIndex((x) => x.slug === slug), newer = books[i - 1], older = books[i + 1];
  const names = m.authors.map((a) => a.slug), same = books.filter((x) => x.slug !== slug && x.authors.some((a) => names.includes(a.slug)));
  const mine = num.find((x) => x.member === me?.slug), seen: Record<number, number> = {};
  const dots = num.map((x) => { const k = Math.round(x.score! * 2); seen[k] = (seen[k] ?? 0) + 1; return { ...x, top: seen[k] % 2 ? 9 : -12 }; });
  const act = (to: string, t: string) => <form action={scoring}><Hidden handle={CLUB} back={here} /><input type="hidden" name="meeting" value={slug} /><input type="hidden" name="to" value={to} /><button className="btn">{t}</button></form>;
  const hi = num[0], lo = num.at(-1);
  let sec = 2;
  const no = () => String(++sec).padStart(2, "0");
  return <>
    {signedIn && <Fresh />}
    <Notice q={q} handle={CLUB} here={here} />
    <section className="sc-bookhero" style={{ background: tint(title, 0.93, 0.04) }}>
      <div className="sc-bookcover"><Cover title={title} sur={surname(m.author)} url={m.cover} bg={tint(title, 0.85, 0.06)} size="lg" /></div>
      <div className="sc-col" style={{ flex: "1 1 360px", gap: 16 }}>
        <h1 className="sc-h1" style={{ fontSize: "clamp(27px,4vw,48px)", textWrap: "balance" }}>{title}</h1>
        <div className="flex flex-wrap gap-5">{m.authors.map((a, k) => <AuthorName key={a.slug} name={a.name} small by={k === 0} delay={350 + k * 300} href={`/author/${a.slug}`} />)}</div>
        <div className="sc-chips">
          <span className="sc-pill-score" style={{ alignSelf: "center" }}>Club score {r2(m.score)}</span><span className="sc-chipb">Goodreads ×2 {r2(m.gr)}</span>
          {m.host && <L href={`/members/${m.host}`} className="sc-chipb">Hosted by {m.host_name}</L>}<L href={`/books?y=${m.year}`} className="sc-chipb">{MONL[monthOf(m)]} {m.year}</L>
          {canRun && m.scoring === "not_open" && act("open", "Open scoring")}{canRun && m.scoring === "open" && act("revealed", "Reveal")}{me?.role === "scribe" && m.scoring === "revealed" && act("open", "Reopen scoring")}
          {canRun && m.scoring === "open" && <L className="btn" href={`${here}/goaround`}>Go-around</L>}
          <L className="sc-chipb" href={`/talk/${slug}`}>Talk</L>
        </div>
        {basics?.premise && <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, maxWidth: "36em", color: "#3d3b37" }}>{basics.premise} {basics.basics_source && <a href={basics.basics_source} className="muted" style={{ fontSize: 12 }} rel="noopener">{/wikipedia\.org/.test(basics.basics_source) ? "From Wikipedia" : "Source"}</a>}</p>}
        {m.notes && <p className="sc-w" style={{ margin: "6px 0 0", fontStyle: "italic", fontSize: 16, lineHeight: 1.4, maxWidth: "30em" }}>“{m.notes}”</p>}
      </div>
    </section>
    {canRun && m.book && <details className="sc-panel mt-3"><summary className="label">Edit details</summary><form action={saveBookDetails} className="grid gap-2 mt-3"><Hidden handle={CLUB} back={here} /><input type="hidden" name="book" value={m.book} /><input type="hidden" name="meeting" value={slug} />
      <label className="label">Title<input className="field" name="title" defaultValue={m.title ?? ""} required /></label><label className="label">Author<input className="field" name="author" defaultValue={m.author ?? ""} /></label><label className="label">Notes: date, house, food<input className="field" name="notes" defaultValue={m.notes ?? ""} /></label><button className="btn btn-ink">Save</button></form></details>}
    <article className="sc-art">
      <section className="sc-sec"><div className="sc-sech"><span>01</span><h2>The evening</h2></div><div className="sc-kv">
        <span>Month</span><span>{m.meets_at ? whenLong(m.meets_at) : `${MONL[monthOf(m)]} ${m.year}`}</span><span>Meeting</span><span>{m.number ? `No. ${m.number}` : "Not numbered in the sheet"}</span>
        <span>Host</span><span>{m.host_name ?? "—"}</span>{m.venue && <><span>Where</span><span>{m.venue}</span></>}{m.food && <><span>Food</span><span>{m.food}</span></>}
        <span>From the sheet</span><span className="sc-w" style={{ fontSize: 18 }}>{m.notes ?? "—"}</span><span>At the table</span><span>{num.length} scored{missed.length ? ` · ${missed.length} didn't` : ""}</span></div></section>
      <section className="sc-sec"><div className="sc-sech"><span>02</span><h2>Around the table</h2><span className="muted text-sm">score and one word</span></div>
        {dots.length > 0 && <div><div className="sc-line">{m.score !== null && <div className="sc-avg" title="Club average" style={{ left: `${m.score * 10}%` }} />}{dots.map((o) => <span key={o.member} className="sc-dot" title={`${o.name} ${r2(o.score)}${o.word ? ` · ${o.word}` : ""}`} style={{ left: `${Math.max(1.5, Math.min(98.5, o.score! * 10))}%`, top: o.top, background: tint(o.name, 0.85, 0.08) }}>{o.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>)}</div><div className="flex justify-between sc-mini"><span>0</span><span>5</span><span>10</span></div></div>}
        <div className="sc-col" style={{ gap: 0 }}>{num.length === 0 && <p className="muted">No scores yet.</p>}{num.map((x) => <L key={x.member} href={`/members/${x.member}`} className="sc-vote"><b style={{ fontSize: 14 }}>{x.name}</b><span>{r2(x.score)}</span><span className="flex flex-col gap-0.5 min-w-0"><span className="sc-w">{x.word}</span>{note(x.member) && <span className="muted" style={{ fontSize: 13 }}>{note(x.member)}</span>}</span></L>)}</div>
        {signedIn && m.scoring === "open" && <form action={saveScore} className="flex gap-1.5 items-center flex-wrap"><Hidden handle={CLUB} back={here} /><input type="hidden" name="meeting" value={slug} /><b style={{ fontSize: 14 }}>{mine ? "Change yours" : "Yours"}</b><input className="sc-score-in" name="score" inputMode="decimal" placeholder={mine ? r2(mine.score) : "8.6"} defaultValue={mine?.score ?? ""} required /><input className="sc-word-in" name="word" maxLength={40} placeholder="one word" defaultValue={mine?.word ?? ""} /><button className="btn btn-ink">Save</button></form>}
      </section>
      {missed.length > 0 && <section className="sc-sec"><div className="sc-sech"><span>{no()}</span><h2>Not at the table</h2></div><div className="sc-wraps">{missed.map((x) => <L key={x.member} href={`/members/${x.member}`} className="sc-chipb" style={{ background: "#f6f5f1" }}>{x.name} · {x.attendance}{note(x.member) ? ` · ${note(x.member)}` : ""}</L>)}</div></section>}
      {m.score !== null && <section className="sc-sec"><div className="sc-sech"><span>{no()}</span><h2>The numbers</h2></div><div className="sc-nums"><span><b>{r2(m.score)}</b><span>club average</span></span><span><b>{r2(m.gr)}</b><span>Goodreads ×2</span></span><span><b>{r2(hi?.score)}</b><span>highest · {hi?.name}</span></span><span><b>{r2(lo?.score)}</b><span>lowest · {lo?.name}</span></span></div><p className="muted">#{m.rank} of {rows[0].filter((x) => x.club_score !== null).length} scored books.{m.gr !== null ? ` The club scored it ${m.score >= m.gr ? "above" : "below"} Goodreads by ${r2(Math.abs(m.score - m.gr))}.` : ""}</p></section>}
      {same.length > 0 && <section className="sc-sec"><div className="sc-sech"><span>{no()}</span><h2>Same author</h2></div><div className="sc-grid">{same.map((x) => <L key={x.slug} href={`/m/${x.slug}`} className="sc-col sc-card-b"><Cover title={x.title!} sur={surname(x.author)} url={x.cover} bg={tint(x.title!)} /><span className="muted text-sm">{when(x)}</span></L>)}</div></section>}
      {pages.length > 0 && <section className="sc-sec"><div className="sc-sech"><span>{no()}</span><h2>From members&apos; Reading</h2><span className="muted text-sm">their own pages, shown to members</span></div>
        {pages.map((p) => <div key={p.member} className="sc-col" style={{ gap: 6 }}><span className="sc-between"><b>{p.name}{p.section ? ` · ${p.section}` : ""}</b><a href={p.page_url} className="label" rel="noopener">Full page in Reading →</a></span><Md text={p.body ?? ""} /></div>)}</section>}
      {rows[4].map((w) => <section key={w.written_at} className="sc-panel"><p className="voice-claude label">written by {w.written_by_name}&apos;s AI</p><Md text={w.body} /></section>)}
      <nav className="sc-between" style={{ padding: "0 24px" }}><L href={older ? `/m/${older.slug}` : "/books"} className="label">← {older?.title ?? "All books"}</L><L href={newer ? `/m/${newer.slug}` : "/books"} className="label">{newer?.title ?? "All books"} →</L></nav>
    </article>
  </>;
}
