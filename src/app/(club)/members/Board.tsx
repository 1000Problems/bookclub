"use client";
import Link from "next/link";
import { useState } from "react";
import { AuthorName, PageHead } from "@/components/ui";

export type Card = {
  slug: string; name: string; hero: string; since: string; hosted: number; missed: number; count: number; avg: number | null; avgTxt: string;
  lean: number | null; leanWord: string; leanTxt: string; leanBg: string; leanColor: string; lastWord: string; lastBook: string;
  hiS: string; hiT: string; loS: string; loT: string; strip: { bg: string; sh: string; fg: string; n: string; t: string }[];
};
const SORTS = [["avg", "Average"], ["lean", "Most generous"], ["books", "Most books"], ["name", "A–Z"]] as const;
type Sort = (typeof SORTS)[number][0];
const order: Record<Sort, (a: Card, b: Card) => number> = {
  avg: (a, b) => (b.avg ?? -1) - (a.avg ?? -1), lean: (a, b) => (b.lean ?? -9) - (a.lean ?? -9), books: (a, b) => b.count - a.count, name: (a, b) => a.name.localeCompare(b.name),
};
const note: Record<Sort, (p: Card) => string> = { avg: (p) => `avg ${p.avgTxt}`, lean: (p) => `${p.leanTxt} vs club`, books: (p) => `${p.count} books`, name: () => "" };
const HI: Record<Sort, number> = { avg: 0, lean: -1, books: 1, name: -1 };

/** 6a: scoreboard header, portrait cards. The sort reorders the cards; each card shows its rank. */
export function Board({ cards, sumLine, stripNote }: { cards: Card[]; sumLine: string; stripNote: string }) {
  const [sort, setSort] = useState<Sort>("name");
  const rows = [...cards].sort(order[sort]);
  return <>
    <PageHead title="At the table now" sub={sumLine}
      right={<div className="m6-sorts" role="group" aria-label="Sort">{SORTS.map(([k, t]) => <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)}>{t}</button>)}</div>} />
    <div className="m6-grid">{rows.map((p, i) => <Link key={p.slug} href={`/members/${p.slug}`} className="m6-card">
      <div className="m6-hero" style={{ background: p.hero }}>
        <span className="m6-rank"><span>{i + 1}</span>{note[sort](p)}</span>
        <span className="m6-word">{p.lastWord}</span>
        <span className="m6-for">their word for<br /><b>{p.lastBook}</b></span>
      </div>
      <div className="m6-body">
        <div className="m6-top"><span><span className="m6-name"><AuthorName name={p.name} by={false} small loop={false} delay={200 + i * 120} /></span><span>Scoring since {p.since} · hosted {p.hosted}</span></span><span className="m6-lean" style={{ background: p.leanBg, color: p.leanColor }}>{p.leanWord} {p.leanTxt}</span></div>
        <div className="m6-stats">{[["average", p.avgTxt], ["books", p.count], ["hosted", p.hosted], ["missed", p.missed]].map(([k, v], j) => <span key={k}><b style={j === HI[sort] ? { color: "#7a4f00" } : undefined}>{v}</b><span>{k}</span></span>)}</div>
        <div className="m6-strip"><span><span>Last 12 meetings</span><span>{stripNote}</span></span><span>{p.strip.map((c, j) => <i key={j} title={c.t} style={{ background: c.bg, boxShadow: c.sh, color: c.fg }}>{c.n}</i>)}</span></div>
        <div className="m6-hilo"><span><span>LOVED · {p.hiS}</span><b>{p.hiT}</b></span><span><span>LOATHED · {p.loS}</span><b>{p.loT}</b></span></div>
      </div>
    </Link>)}</div>
  </>;
}
