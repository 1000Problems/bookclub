"use client";
import Link from "next/link";
import { useState } from "react";

export type MonthRow = { slug: string; n: string; mon: string; title: string; sub: string; score: string; needs: boolean; next: boolean; upcoming: boolean; empty: boolean };

/** 4c, left side: every row of the sheet, newest first. Filter and search stay on the phone; a tap opens that month. */
type Shrink = { slug: string; saved: boolean; href: string } | null;
export function MonthList({ rows, on, nextSlug, link, grow, shrink, handle, remove }: { rows: MonthRow[]; on: string; nextSlug?: string; link: string; grow: { label: string; href: string }; shrink: Shrink; handle: string; remove: (d: FormData) => void }) {
  const go = (slug: string) => `/admin?m=${slug}${link ? `&${link}` : ""}`;
  const [filter, setFilter] = useState<"all" | "attention" | "upcoming">("all"), [q, setQ] = useState("");
  const tests = { all: () => true, attention: (r: MonthRow) => r.needs, upcoming: (r: MonthRow) => r.upcoming };
  const s = q.trim().toLowerCase();
  const list = rows.filter(tests[filter]).filter((r) => !s || `${r.title} ${r.sub}`.toLowerCase().includes(s));
  const years = [...new Set(list.map((r) => r.slug.slice(0, 4)))];
  return <div className="am-left">
    <div className="am-filters">{([["all", "All"], ["attention", "Needs filling in"], ["upcoming", "Upcoming"]] as const).map(([k, label]) =>
      <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}<span>{rows.filter(tests[k]).length}</span></button>)}</div>
    <div className="am-find"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a book, author or host" aria-label="Find" />
      {nextSlug && <Link className="ad-b ad-ink" href={go(nextSlug)} scroll={false} onClick={() => { setFilter("all"); setQ(""); }}>Next meeting</Link>}</div>
    <div className="am-rows">{filter !== "attention" && !s && <Link className="am-add" href={grow.href} scroll={false}>+ Add {grow.label}</Link>}
      {years.map((y) => {
      const rs = list.filter((r) => r.slug.startsWith(y)), sc = rs.map((r) => Number(r.score)).filter((x) => r_ok(x));
      return <div key={y}><div className="am-year"><b>{y}</b><span>{sc.length ? `${sc.length} scored · avg ${(sc.reduce((a, b) => a + b, 0) / sc.length).toFixed(2)}` : `${rs.length} months`}</span></div>
        {rs.map((r) => <div key={r.slug} className="am-line"><Link href={go(r.slug)} scroll={false} className={`am-row${r.slug === on ? " on" : ""}`} aria-current={r.slug === on ? "page" : undefined}>
          <span className="am-n">{r.n}</span><b className="am-mon">{r.mon}</b>
          <span className="am-t"><span><b style={r.empty ? { opacity: .6 } : undefined}>{r.title}</b>{r.needs && <i className="ad-dot" title="Needs filling in" />}{r.next && <i className="am-next">NEXT</i>}</span><span>{r.sub}</span></span>
          <b className="am-sc">{r.score}</b></Link>
          {shrink?.slug === r.slug && (shrink.saved
            ? <form action={remove}><input type="hidden" name="handle" value={handle} /><input type="hidden" name="back" value={shrink.href} /><input type="hidden" name="meeting" value={r.slug} /><button className="am-minus" aria-label={`Remove ${r.mon}`} title="Remove this empty month">−</button></form>
            : <Link className="am-minus" href={shrink.href} scroll={false} aria-label={`Remove ${r.mon}`} title="Remove this empty month">−</Link>)}</div>)}</div>;
    })}{!list.length && <p className="ad-note">No months match.</p>}</div>
  </div>;
}
const r_ok = (x: number) => Number.isFinite(x) && x > 0;
