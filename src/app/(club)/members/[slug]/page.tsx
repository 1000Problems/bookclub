import { PageHead } from "@/components/ui";
import { CLUB } from "@/lib/club";
import { L, load, MembersOnly, type Page } from "@/lib/page";
import { GREEN, heat, NOTES, notesOf, profiles, RED, sgn } from "@/lib/members";
import { author, r2, RECORD, shape, when } from "@/lib/record";
import { sql } from "@/lib/studio";

const SORTS = [["date", "Newest"], ["score", "Their score"], ["delta", "Most above club"]] as const;

export default async function Member({ params, searchParams }: Page) {
  const { slug } = await params;
  const q = await searchParams;
  const { v, rows } = await load(CLUB, () => RECORD);
  if (!rows) return <MembersOnly />;
  const { books, members } = shape(rows);
  const notes = notesOf(await sql(v, [NOTES]).then((r) => r.rows[0]).catch(() => []));
  const all = profiles(books, members, notes), m = all.find((x) => x.slug === slug);
  if (!m) return <p className="muted">No such member.</p>;
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  const ring = [...all.filter((x) => x.current).sort(byName), ...all.filter((x) => x.status === "alumni" && x.count > 0).sort(byName)];
  const i = ring.findIndex((x) => x.slug === slug), prev = ring[(i - 1 + ring.length) % ring.length], next = ring[(i + 1) % ring.length];
  const sort = SORTS.some(([k]) => k === q.sort) ? q.sort! : "date";
  const key = (e: (typeof m.entries)[number]) => (sort === "score" ? e.score ?? -1 : sort === "delta" ? e.delta ?? -99 : e.stamp);
  const entries = [...m.entries].sort((a, b) => key(b) - key(a));
  const stat = (t: string, s: string | number) => <span><b>{s}</b><span>{t}</span></span>;
  const line = (e: (typeof m.top)[number]) => <L key={e.m.slug} href={`/m/${e.m.slug}`} className="sc-bookline"><span>{e.m.title}</span><b>{r2(e.v.score)}</b></L>;
  return <div className="sc-col" style={{ gap: 16 }}>
    <PageHead tint={m.tint.hero} eyebrow={<><L href="/members">← Members</L>{m.since && <> · {m.since}</>}</>} title={m.name}
      sub={<div className="sc-mstats">{stat("average", r2(m.average))}{stat("scored", m.count)}{stat("hosted", m.hostedN)}{stat("came & scored", m.attended)}</div>}
      right={<span className="sc-lean" style={{ background: "rgba(255,255,255,.75)", color: m.leanColor }}>{m.leanWord} grader {m.lean === null ? "—" : sgn(m.lean)}</span>} />
    <div className="sc-pair sc-mtwo">
      {m.top.length > 0 && <section className="sc-box sc-col" style={{ gap: 8 }}>
        <span className="sc-eyebrow dark">Loved most</span>{m.top.map(line)}
        <span className="sc-eyebrow dark mt-1.5">Least</span>{m.bottom.map(line)}
      </section>}
      <section className="sc-box sc-col" style={{ gap: 8 }}>
        <span className="sc-eyebrow dark">Their words</span>
        <div className="sc-words lg">{m.words.map((w) => <L key={w.slug} href={`/m/${w.slug}`} title={w.title}><i>{w.word}</i></L>)}</div>
        <span className="mt-auto sc-small">{m.missLine}</span>
      </section>
    </div>

    <div className="sc-pair">
      <section className="sc-box">
        <div className="sc-boxh"><span>Scores over time</span><span>dot: theirs · line: club</span></div>
        <div className="sc-trend"><span className="mid" /><span className="y" style={{ top: -6 }}>10</span><span className="y" style={{ top: "calc(50% - 6px)" }}>5</span>
          {m.trend.map((d, k) => <span key={k}>{d.club !== null && <span title={d.title} className="c" style={{ left: `${d.left}%`, top: `${d.club}%` }} />}<span title={d.title} className="d" style={{ left: `${d.left}%`, top: `${d.mine}%`, background: m.tint.mark }} /></span>)}
        </div>
        <div className="sc-axis"><span>{m.y0}</span><span>{m.y1}</span></div>
        <span className="sc-small">{m.trendLine}</span>
      </section>
      <section className="sc-box">
        <div className="sc-boxh"><span>Every meeting</span><span>{m.attLine}</span></div>
        <div className="sc-col" style={{ gap: 6 }}>{m.years.map((y) => <div key={y.y} className="sc-hy"><span>{y.y}</span>
          <div>{y.cells.map((c, k) => c.slug ? <L key={k} href={`/m/${c.slug}`} title={c.title} aria-label={c.title} style={{ background: c.bg, boxShadow: c.shadow }} /> : <span key={k} title={c.title} style={{ background: c.bg, boxShadow: c.shadow }} />)}</div><b>{y.avg === "—" ? "" : y.avg}</b></div>)}</div>
        <div className="sc-legend"><span>low<span className="flex gap-px">{[2, 4, 6, 8, 9, 10].map((s) => <i key={s} style={{ background: heat(s) }} />)}</span>high</span><span><i style={{ background: "#e4e2dc" }} />missed</span><span><i style={{ boxShadow: "inset 0 0 0 1px #b9b6ae" }} />didn&apos;t finish</span></div>
      </section>
    </div>

    <div className="sc-pair">
      <section className="sc-box">
        <span className="sc-boxt">Hosted · {m.hostedN}</span>
        {m.hosted.length === 0 && <p className="muted" style={{ margin: 0 }}>Hasn&apos;t hosted yet.</p>}
        {m.hosted.map((h) => <L key={h.slug} href={`/m/${h.slug}`} className="sc-hosted"><span>{when(h)}</span><span className="sc-col" style={{ gap: 2, minWidth: 0 }}><b>{h.title}</b>{h.notes && <i>{h.notes}</i>}</span><b>{r2(h.score)}</b></L>)}
      </section>
      <section className="sc-box" style={{ gap: 14 }}>
        <span className="sc-boxt">Every word · {m.allWords.length}</span>
        <div className="sc-cloud">{m.allWords.map((w, k) => <L key={k} href={`/m/${w.slug}`} title={w.title} style={{ fontSize: w.px }}><i>{w.word}</i></L>)}</div>
        <span className="faint text-xs">Bigger word, higher score. Each word opens its book.</span>
        {m.reasons.length > 0 && <div className="sc-col sc-why"><span>Why they missed</span><div className="flex flex-wrap gap-1.5">{m.reasons.map(([r, n]) => <span key={r} className="sc-reason">{r}<span>{n}</span></span>)}</div></div>}
      </section>
    </div>

    <section className="sc-col mt-2" style={{ gap: 12 }}>
      <div className="flex justify-between items-end gap-3 flex-wrap"><span className="sc-h2">Every book</span>
        <div className="sc-sorts">{SORTS.map(([k, t]) => <L key={k} scroll={false} replace href={k === "date" ? `/members/${slug}` : `/members/${slug}?sort=${k}`} className={k === sort ? "on" : ""}>{t}</L>)}</div></div>
      <div className="sc-ledger"><div>
        <div className="sc-lrow head"><span>Month</span><span>Book</span><span>Theirs</span><span>Word / note</span><span>Club</span><span>vs club</span></div>
        {entries.map((e) => <L key={e.m.slug} href={`/m/${e.m.slug}`} className="sc-lrow" style={{ opacity: e.score !== null ? 1 : 0.55 }}>
          <span>{when(e.m)}</span>
          <span className="sc-col" style={{ gap: 0, minWidth: 0 }}><b>{e.m.title}</b><span>{author(e.m.author)}{e.hosted ? " · they hosted" : e.m.host_name ? ` · ${e.m.host_name}'s pick` : ""}</span></span>
          <b>{r2(e.score)}</b><span className={e.score !== null ? "word" : "word note"}>{e.word}</span><span>{r2(e.m.score)}</span>
          <span style={{ fontWeight: 700, color: e.delta === null ? "#8f8d87" : e.delta >= 0 ? GREEN : RED }}>{sgn(e.delta)}</span>
        </L>)}
      </div></div>
    </section>

    <nav className="sc-between sc-small" style={{ padding: "8px 4px", fontWeight: 600 }}><L href={`/members/${prev.slug}`}>← {prev.name}</L><L href={`/members/${next.slug}`}>{next.name} →</L></nav>
  </div>;
}
