import { CLUB, OPERATORS } from "@/lib/club";
import { L, load, MembersOnly, SignInToSee } from "@/lib/page";
import { heat, NOTES, notesOf, profiles, sgn } from "@/lib/members";
import { r2, RECORD, shape, when } from "@/lib/record";
import { sql } from "@/lib/studio";
import { Board, type Card } from "./Board";

/** 6a: scoreboard header, portrait cards, then past members. */
export default async function Members() {
  const { v, rows } = await load(CLUB, () => RECORD);
  if (!rows) return <MembersOnly />;
  if (v.kind !== "member") return <SignInToSee />;
  const { books, members } = shape(rows);
  const notes = notesOf(await sql(v, [NOTES]).then((r) => r.rows[0]).catch(() => []));
  const all = profiles(books, members, notes);
  const shown = all.filter((m) => !OPERATORS.has(m.slug)), cur = shown.filter((m) => m.current), past = shown.filter((m) => m.status === "alumni" && m.count > 0);
  const scored = books.filter((b) => b.score !== null), y0 = Math.min(...scored.map((b) => b.year));
  // The club's last 12 scored meetings, oldest first: one cell per meeting on every card.
  const last12 = scored.slice(0, 12).reverse();
  const cell = (slug: string, m: (typeof books)[number]) => {
    const x = m.votes.find((y) => y.member === slug), t = `${when(m)} · ${m.title}`;
    if (!x) return { bg: "transparent", sh: "inset 0 0 0 1px #eeede8", fg: "#141413", n: "", t: `${t} · not recorded` };
    if (x.score !== null) return { bg: heat(x.score), sh: "none", fg: x.score >= 7.5 ? "#fff" : "#141413", n: r2(x.score).replace(/^(\d+\.\d).*/, "$1"), t: `${t} · ${r2(x.score)}${x.word ? ` · ${x.word}` : ""}` };
    if (x.attendance === "missed") return { bg: "#e4e2dc", sh: "none", fg: "#5e5c56", n: "–", t: `${t} · missed` };
    return { bg: "#fff", sh: "inset 0 0 0 1px #b9b6ae", fg: "#5e5c56", n: "·", t: `${t} · no score` };
  };
  const cards: Card[] = cur.map((p) => {
    const pool = p.entries.filter((e) => e.score !== null && e.word);
    const last = pool.length ? pool[Math.floor(Math.random() * pool.length)] : undefined;
    return { slug: p.slug, name: p.name, hero: p.tint.hero, since: String(p.y0 || ""), hosted: p.hostedN, missed: p.missedN, count: p.count, avg: p.average, avgTxt: r2(p.average),
      lean: p.lean, leanWord: p.leanWord, leanTxt: p.lean === null ? "—" : sgn(p.lean), leanBg: p.leanBg, leanColor: p.leanColor,
      lastWord: last?.word ?? "—", lastBook: last?.m.title ?? "", hiS: r2(p.hi?.v.score), hiT: p.hi?.m.title ?? "—", loS: r2(p.lo?.v.score), loT: p.lo?.m.title ?? "—",
      strip: last12.map((m) => cell(p.slug, m)) };
  });
  const sumLine = `${cur.length} at the table now · ${scored.length} books scored since ${y0} · ${past.length} past members`;
  const stripNote = last12.length ? `${when(last12[0])} – ${when(last12.at(-1)!)}` : "";
  return <div className="sc-col" style={{ gap: 18 }}>
    <Board cards={cards} sumLine={sumLine} stripNote={stripNote} />
    {past.length > 0 && <div className="sc-col" style={{ gap: 12, paddingTop: 12 }}>
      <div className="m6-pasth"><b>Past members</b><span>Their scores are still in every average.</span></div>
      <div className="m6-past">{past.map((m) => <L key={m.slug} href={`/members/${m.slug}`} className="sc-past">
        <span className="sc-ini sm" style={{ background: m.tint.dot }}>{m.ini}</span>
        <span className="sc-past-who"><span>{m.name}</span><span>{m.span} · {m.count} books · {m.leanWord}</span></span>
        <b>{r2(m.average)}</b>
      </L>)}</div></div>}
  </div>;
}
