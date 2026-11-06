import { Shelf, type ShelfBook } from "@/components/ui";
import { CLUB } from "@/lib/club";
import { L, load, MembersOnly, type Page } from "@/lib/page";
import { author, avg, numeric, r2, RECORD, shape, surname, tint, when, type Meet } from "@/lib/record";

export default async function Books({ searchParams }: Page) {
  const q = await searchParams, yr = q.y ? Number(q.y) : null;
  const { rows } = await load(CLUB, () => RECORD);
  if (!rows) return <MembersOnly />;
  const { all, books, members } = shape(rows);
  const names = members.filter((m) => m.status !== "guest").map((m) => m.name);
  const years = [...new Set(books.map((m) => m.year))];
  const pool = books.filter((m) => !yr || m.year === yr);
  const scored = pool.filter((m) => m.score !== null).sort((a, b) => b.score! - a.score!);
  const rank = new Map(scored.map((m, i) => [m.slug, i + 1]));
  const card = (m: Meet): ShelfBook => ({
    slug: m.slug, title: m.title!, author: author(m.author).split(/\s*[,&]\s*/)[0], sur: surname(m.author), cover: m.cover, bg: tint(m.title!), score: m.score, scoreText: r2(m.score),
    pct: m.score === null ? 0 : m.score * 10, gold: (m.score ?? 0) >= 9, when: when(m), year: m.year, host: m.host_name ?? "—", gr: r2(m.gr), rank: rank.get(m.slug) ?? null, notes: m.notes ?? "",
    cells: names.map((n) => { const v = m.votes.find((x) => x.name === n); if (!v) return { score: "", word: "", dim: false, full: "" };
      return v.score !== null ? { score: r2(v.score), word: v.word ?? "", dim: false, full: `${r2(v.score)}${v.word ? ` · ${v.word}` : ""}` } : { score: v.attendance, word: "", dim: true, full: v.attendance }; }),
  });
  const skips = all.filter((m) => m.status === "skipped" && (!yr || m.year === yr));
  return <>
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-4"><h1 className="sc-h1">Books</h1><p className="muted" style={{ fontSize: 15 }}>Every book the club has read since {Math.min(...books.map((m) => m.year))}, ranked by the score we gave it.</p></div>
    <Shelf list={pool.map(card)} top={scored.slice(0, 3).map(card)} names={names} label={yr ? `Top of ${yr}` : "Top of every year"} />
    <div className="sc-stats" style={{ padding: 0 }}><span><b>{pool.length}</b>books</span><span><b>{r2(avg(scored.map((m) => m.score!)))}</b>average</span><span><b>{pool.reduce((a, m) => a + numeric(m).filter((v) => v.word).length, 0)}</b>words</span><span><b>{skips.length}</b>months skipped</span></div>
    <nav aria-label="Years" className="sc-yrs"><L href="/books" className={`sc-yr${yr ? "" : " on"}`}>All years<span>{books.length}</span></L>{years.map((y) => <L key={y} href={`/books?y=${y}`} className={`sc-yr${y === yr ? " on" : ""}`}>{y}<span>{books.filter((m) => m.year === y).length}</span></L>)}</nav>
  </>;
}
