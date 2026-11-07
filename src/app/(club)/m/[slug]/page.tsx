import { AuthorName, Cover } from "@/components/ui";
import { Fresh } from "@/components/Fresh";
import { saveBookDetails, saveScore, scoring } from "@/lib/actions";
import { CLUB } from "@/lib/club";
import { Hidden, L, load, MembersOnly, Notice, type Page } from "@/lib/page";
import { GREEN, kindLabel, NOTES, notesOf, profiles, RED, sgn, splitNotes } from "@/lib/members";
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
  // Admin views are refused for anyone else.
  const bookSheet = me?.role === "scribe" ? (await sql(v, [{ sql: "select s.link_url, s.sheet_author, b.goodreads_avg from book_sheet s join books b on b.slug = s.slug where s.slug = (select book from meetings where slug = $1)", params: [slug] }])).rows[0][0] : undefined;
  if (!m) return <p className="muted">No such meeting.</p>;
  // Members' own Reading pages for this book: signed-in members only, opted-in readers only (TASK-55 §5).
  const pages = signedIn && m.book ? await sql(v, [{ sql: "select * from member_pages($1)", params: [m.book] }]).then((r) => r.rows[0]).catch(() => []) : [];
  const comments = await sql(v, [NOTES]).then((r) => r.rows[0]).catch(() => []);
  const note = (id: string) => { const c = comments.find((x) => x.meeting === slug && x.member === id); return c?.comment ?? c?.miss_reason ?? ""; };
  const title = m.title ?? "Book not chosen yet", canRun = me && (me.role === "scribe" || m.host === me.slug);
  const num = numeric(m).sort((a, b) => b.score! - a.score!), out = m.votes.filter((x) => x.score === null);
  const people = new Map(profiles(books, rows[2], notesOf(comments)).map((p) => [p.slug, p]));
  const sheet = [...num, ...out].map((x) => { const p = people.get(x.member), usual = p?.average ?? null; return { ...x, usual, color: p?.tint.bar ?? "#e9a93a", delta: x.score !== null && usual !== null ? x.score - usual : null }; });
  const parts = splitNotes(m.notes), rankedN = rows[0].filter((x) => x.club_score !== null).length;
  const i = books.findIndex((x) => x.slug === slug), newer = books[i - 1], older = books[i + 1];
  const names = m.authors.map((a) => a.slug), same = books.filter((x) => x.slug !== slug && x.authors.some((a) => names.includes(a.slug)));
  const mine = num.find((x) => x.member === me?.slug);
  const act = (to: string, t: string) => <form action={scoring}><Hidden handle={CLUB} back={here} /><input type="hidden" name="meeting" value={slug} /><input type="hidden" name="to" value={to} /><button className="btn">{t}</button></form>;
  let sec = 0;
  const no = () => String(++sec).padStart(2, "0");
  return <>
    {signedIn && <Fresh />}
    <Notice q={q} handle={CLUB} here={here} />
    <div className="sc-col" style={{ gap: 16 }}>
    <section className="sc-card2a" style={{ background: tint(title, 0.93, 0.04) }}>
      <div className="sc-card2a-cover"><Cover title={title} sur={surname(m.author)} url={m.cover} bg={tint(title, 0.85, 0.06)} size="lg" /></div>
      <div className="sc-col" style={{ gap: 12, flex: "1 1 320px", minWidth: 0 }}>
        <L href={`/?y=${m.year}#books`} className="sc-eyebrow dark" style={{ fontSize: 12 }}>{m.number ? `No. ${m.number}` : "Not numbered"} · {MONL[monthOf(m)]} {m.year}</L>
        <h1 className="sc-card2a-t">{title}</h1>
        <div className="flex flex-wrap gap-5">{m.authors.map((a, k) => <AuthorName key={a.slug} name={a.name} small by={false} delay={350 + k * 300} href={`/author/${a.slug}`} />)}</div>
      </div>
      {m.score !== null && <div className="sc-card2a-s"><span>{r2(m.score)}</span><b>#{m.rank} of {rankedN}</b>{m.gr !== null && <span>Goodreads ×2 {r2(m.gr)}</span>}</div>}
    </section>
    <div className="sc-eve">
      <div><span className="sc-eyebrow">When</span><span>{m.meets_at ? whenLong(m.meets_at) : parts.date || `${MONL[monthOf(m)]} ${m.year}`}</span></div>
      <div><span className="sc-eyebrow">Where</span><span>{parts.place || m.venue?.replace(/^at\s+/, "") || "Not in the sheet"}</span>{m.host && <L href={`/members/${m.host}`}>hosted by {m.host_name}</L>}</div>
      <div><span className="sc-eyebrow">On the table</span><i>{parts.food || "—"}</i></div>
      <div><span className="sc-eyebrow">At the table</span><span>{num.length} of {sheet.length}</span><small>{out.length ? `${out.map((x) => x.name.split(" ")[0]).slice(0, 4).join(", ")}${out.length > 4 ? ` +${out.length - 4}` : ""} out` : sheet.length ? "full table" : "no scores yet"}</small></div>
    </div>
    <div className="sc-acts"><L className="sc-chipb" href={`/talk/${slug}`}>Talk</L>
      {canRun && m.scoring === "not_open" && act("open", "Open scoring")}{canRun && m.scoring === "open" && act("revealed", "Reveal")}{me?.role === "scribe" && m.scoring === "revealed" && act("open", "Reopen scoring")}
      {canRun && m.scoring === "open" && <L className="btn" href={`${here}/goaround`}>Go-around</L>}</div>
    {canRun && m.book && <details className="sc-panel mt-3"><summary className="label">Edit details</summary><form action={saveBookDetails} className="grid gap-2 mt-3"><Hidden handle={CLUB} back={here} /><input type="hidden" name="book" value={m.book} /><input type="hidden" name="meeting" value={slug} />
      <label className="label">Title<input className="field" name="title" defaultValue={m.title ?? ""} required /></label><label className="label">Author<input className="field" name="author" defaultValue={m.author ?? ""} /></label><label className="label">Notes: date, house, food<input className="field" name="notes" defaultValue={m.notes ?? ""} /></label>
      {me?.role === "scribe" && <><label className="label">Link<input className="field" type="url" name="link_url" defaultValue={bookSheet?.link_url ?? ""} placeholder="https://" /></label>
        <label className="label">Author as the sheet spells it<input className="field" name="sheet_author" defaultValue={bookSheet?.sheet_author ?? ""} /></label>
        <label className="label">Goodreads rating<input className="field" type="number" name="goodreads_avg" min={1} max={5} step={0.01} defaultValue={bookSheet?.goodreads_avg ?? ""} /></label></>}
      <button className="btn btn-ink">Save</button></form></details>}
    <div className="sc-sheet2">
      <div className="sc-srow head"><span>Member</span><span>Score</span><span className="sc-scale"><span>0</span><span>5</span><span>10</span></span><span>Word</span><span>vs their usual</span></div>
      {sheet.length === 0 && <p className="muted" style={{ padding: "12px 0" }}>No scores yet.</p>}
      {sheet.map((x) => <L key={x.member} href={`/members/${x.member}`} className="sc-srow" style={{ opacity: x.score === null ? 0.5 : 1 }}>
        <span className="who"><b>{x.name}</b><span>usually {r2(x.usual)}</span></span>
        <span className="num">{r2(x.score)}</span>
        <span className="bar"><span style={{ width: `${(x.score ?? 0) * 10}%`, background: x.color }} />{m.score !== null && <i style={{ left: `${m.score * 10}%` }} />}</span>
        <span className={x.score === null ? "word note" : "word"}>{x.score === null ? note(x.member) || kindLabel(x.attendance) : x.word || "—"}</span>
        <span className="delta" style={{ color: x.delta === null ? "#8f8d87" : x.delta >= 0 ? GREEN : RED }}>{x.delta === null ? (x.score === null ? kindLabel(x.attendance) : "") : sgn(x.delta)}</span>
      </L>)}
      {signedIn && m.scoring === "open" && <form action={saveScore} className="flex gap-1.5 items-center flex-wrap" style={{ paddingTop: 12, borderTop: "1px solid rgba(20,20,19,.07)" }}><Hidden handle={CLUB} back={here} /><input type="hidden" name="meeting" value={slug} /><b style={{ fontSize: 14 }}>{mine ? "Change yours" : "Yours"}</b><input className="sc-score-in" name="score" inputMode="decimal" placeholder={mine ? r2(mine.score) : "8.6"} defaultValue={mine?.score ?? ""} required /><input className="sc-word-in" name="word" maxLength={40} placeholder="one word" defaultValue={mine?.word ?? ""} /><button className="btn btn-ink">Save</button></form>}
    </div>
    {m.score !== null && <span className="faint" style={{ fontSize: 12, padding: "0 6px" }}>Amber tick: club average {r2(m.score)}. Right column: this score against that member&apos;s average over every book they&apos;ve scored.</span>}
    </div>
    <article className="sc-art">
      {(basics?.premise || m.notes) && <section className="sc-col" style={{ gap: 10, padding: "0 6px" }}>
        {basics?.premise && <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: "#3d3b37" }}>{basics.premise} {basics.basics_source && <a href={basics.basics_source} className="muted" style={{ fontSize: 12 }} rel="noopener">{/wikipedia\.org/.test(basics.basics_source) ? "From Wikipedia" : "Source"}</a>}</p>}
        {m.notes && <p className="muted" style={{ margin: 0, fontSize: 13 }}>From the sheet: <i className="sc-w" style={{ fontSize: 16 }}>{m.notes}</i></p>}
      </section>}
      {same.length > 0 && <section className="sc-sec"><div className="sc-sech"><span>{no()}</span><h2>Same author</h2></div><div className="sc-grid">{same.map((x) => <L key={x.slug} href={`/m/${x.slug}`} className="sc-col sc-card-b"><Cover title={x.title!} sur={surname(x.author)} url={x.cover} bg={tint(x.title!)} /><span className="muted text-sm">{when(x)}</span></L>)}</div></section>}
      {pages.length > 0 && <section className="sc-sec"><div className="sc-sech"><span>{no()}</span><h2>From members&apos; Reading</h2><span className="muted text-sm">their own pages, shown to members</span></div>
        {pages.map((p) => <div key={p.member} className="sc-col" style={{ gap: 6 }}><span className="sc-between"><b>{p.name}{p.section ? ` · ${p.section}` : ""}</b><a href={p.page_url} className="label" rel="noopener">Full page in Reading →</a></span><Md text={p.body ?? ""} /></div>)}</section>}
      {rows[4].map((w) => <section key={w.written_at} className="sc-panel"><p className="voice-claude label">written by {w.written_by_name}&apos;s AI</p><Md text={w.body} /></section>)}
      <nav className="sc-between" style={{ padding: "0 24px" }}><L href={older ? `/m/${older.slug}` : "/#books"} className="label">← {older?.title ?? "All books"}</L><L href={newer ? `/m/${newer.slug}` : "/#books"} className="label">{newer?.title ?? "All books"} →</L></nav>
    </article>
  </>;
}
