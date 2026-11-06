"use client";
import { createElement as h, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export const Narrow = ({ children }: { children: ReactNode }) => <div className="sc-narrow">{children}</div>;

/** A book: a tinted card with its title, and the cover on top when the Commons has one (TASK-55: no browser lookups). */
export function Cover({ title, sur = "", url, bg, size = "md", style, badge }: { title: string; sur?: string; url?: string | null; bg: string; size?: "xs" | "sm" | "md" | "lg"; style?: CSSProperties; badge?: ReactNode }) {
  return <div className={`sc-cover sc-cover-${size}`} style={{ background: bg, ...style }}>
    <span className="sc-cover-t"><span className="sc-cover-title">{title}</span>{size !== "xs" && size !== "sm" && <span className="sc-cover-a">{sur}</span>}</span>
    {url && <span className="sc-cover-img" style={{ backgroundImage: `url(${url})` }} />}
    {badge}
  </div>;
}

/** Reading's author name: letters arrive, a marker sweeps under, the surname pops, a soft wave repeats. */
export function AuthorName({ name, delay = 250, by = true, small = false, href, loop = true }: { name: string; delay?: number; by?: boolean; small?: boolean; href?: string; loop?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const [swept, setSwept] = useState(false);
  const ws = name.split(" ");
  const rev = [...ws].reverse().findIndex((w) => !/^(Jr\.?|Sr\.?|&)$/.test(w));
  const sur = ws.length - 1 - (rev < 0 ? 0 : rev);
  const d0 = delay + 120 + name.length * 26 + 300;
  useEffect(() => {
    const t = setTimeout(() => setSwept(true), 40);
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return () => clearTimeout(t);
    const S = "cubic-bezier(.3,1.5,.45,1)";
    const chars = [...el.querySelectorAll("[data-ch]")];
    chars.forEach((c, k) => c.animate([{ opacity: 0, transform: "translateY(.55em) rotateX(-80deg)", filter: "blur(6px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 700, delay: delay + 120 + k * 26, easing: S, fill: "backwards" }));
    const pop = (d: number) => el.querySelectorAll("[data-sur]").forEach((s) => s.animate([{ transform: "none", color: "#141413" }, { transform: "translateY(-3px) scale(1.07)", color: "#7a4f00", offset: 0.4 }, { transform: "none", color: "#141413" }], { duration: 900, delay: d, easing: "cubic-bezier(.3,1.3,.45,1)" }));
    const end = delay + 120 + chars.length * 26 + 900;
    pop(end);
    const wave = () => { chars.forEach((c, k) => c.animate([{ transform: "none" }, { transform: "translateY(-.18em)", offset: 0.4 }, { transform: "none" }], { duration: 600, delay: k * 35, easing: "cubic-bezier(.3,1.3,.45,1)" })); pop(chars.length * 35 + 150); };
    let iv: ReturnType<typeof setInterval> | undefined;
    const st = loop ? setTimeout(() => { wave(); iv = setInterval(wave, 2600); }, end + 1600) : undefined;
    return () => { clearTimeout(t); if (st) clearTimeout(st); if (iv) clearInterval(iv); };
  }, [delay, loop]);
  return h(href ? "a" : "span", { ref, href, className: "sc-author" },
    by && <span className="sc-author-by">Written by</span>,
    <span className={small ? "sc-author-name sc-small" : "sc-author-name"}>
      {ws.map((w, k) => <span key={k} data-sur={k === sur ? "" : undefined} className={`sc-word${k === sur ? " sc-sur" : ""}`} style={{ backgroundSize: swept ? "100% 100%" : "0% 100%", transitionDelay: swept ? `${d0 + k * 140}ms` : "0ms" }}>
        {[...w].map((c, j) => <span key={j} data-ch="" style={{ display: "inline-block" }}>{c}</span>)}
      </span>)}
    </span>);
}

/** Saves when you leave a changed field, like a spreadsheet cell. */
export function AutoField({ form, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { form: string }) {
  return <input {...p} form={form} onBlur={(e) => { if (e.target.value !== (p.defaultValue ?? "")) (document.getElementById(form) as HTMLFormElement | null)?.requestSubmit(); }} />;
}

/** Tap books in order: first tap is 1, then 2, then 3. */
export function RankPicker({ books, children }: { books: { book: string; title: string; author?: string | null; pitch?: string | null; bg: string; sur: string; cover?: string | null }[]; children: ReactNode }) {
  const [order, setOrder] = useState<string[]>([]);
  const tap = (b: string) => setOrder((o) => (o.includes(b) ? o.filter((x) => x !== b) : o.length < 3 ? [...o, b] : o));
  return <div className="sc-col">
    <div className="sc-rank">{books.map((b) => { const i = order.indexOf(b.book); return <button type="button" key={b.book} aria-pressed={i >= 0} onClick={() => tap(b.book)} className={`sc-rank-b${i >= 0 ? " on" : ""}`}>
      <Cover title={b.title} sur={b.sur} url={b.cover} bg={b.bg} size="sm" badge={i >= 0 ? <span className="sc-rank-n">{i + 1}</span> : undefined} />
      <span className="sc-col" style={{ gap: 2, textAlign: "left", minWidth: 0 }}><b>{b.title}</b><span className="muted">{b.author}</span>{b.pitch && <span className="muted">{b.pitch}</span>}</span>
    </button>; })}</div>
    {["first", "second", "third"].map((n, i) => <input key={n} type="hidden" name={n} value={order[i] ?? ""} />)}
    <p className="muted">{order.length === 0 ? "Tap your favourite first." : order.length < 3 ? `${3 - order.length} more, or confirm now.` : "That's your top three."}</p>
    {order.length > 0 && children}
  </div>;
}

export type ShelfBook = { slug: string; title: string; author: string; sur: string; cover: string | null; bg: string; score: number | null; scoreText: string; pct: number; gold: boolean; when: string; year: number; host: string; gr: string; rank: number | null; notes: string; cells: { score: string; word: string; dim: boolean; full: string }[] };

/** Books: the top three in a rotating stack, then covers or the sheet. */
export function Shelf({ list, top, names, label }: { list: ShelfBook[]; top: ShelfBook[]; names: string[]; label: string }) {
  const [sort, setSort] = useState("score"), [view, setView] = useState("covers"), [idx, setIdx] = useState(0), [paused, setPaused] = useState(false);
  useEffect(() => { const t = setInterval(() => { if (!paused) setIdx((i) => i + 1); }, 6000); return () => clearInterval(t); }, [paused]);
  const n = top.length, at = n ? idx % n : 0, cur = top[at];
  const sorted = sort === "score" ? [...list].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)) : list;
  const STACK = ["translate3d(0,0,0) rotate(-2deg)", "translate3d(42px,-10px,-60px) rotate(5deg) scale(.9)", "translate3d(76px,-16px,-120px) rotate(10deg) scale(.8)"];
  const Seg = ({ v, set, opts }: { v: string; set: (s: string) => void; opts: [string, string][] }) => <div className="sc-seg">{opts.map(([k, t]) => <button key={k} onClick={() => set(k)} className={v === k ? "on" : ""}>{t}</button>)}</div>;
  return <>
    {cur && <div className="sc-hero" style={{ background: cur.bg }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="sc-stack">{top.map((b, i) => { const pos = (i - at + n) % n; return <a key={b.slug} href={`/m/${b.slug}`} aria-label={b.title} onClick={(e) => { if (pos) { e.preventDefault(); setIdx(i); } }} style={{ transform: STACK[pos], zIndex: 3 - pos, filter: pos ? `saturate(${1 - pos * 0.25}) brightness(${1 - pos * 0.06}) blur(${pos * 0.6}px)` : "none" }}><Cover title={b.title} sur={b.sur} url={b.cover} bg={b.bg} size="lg" style={{ width: "100%" }} /></a>; })}</div>
      <div className="sc-col sc-hero-t">
        <div className="sc-bars">{top.map((b, i) => <button key={b.slug} aria-label={`Show ${b.title}`} onClick={() => setIdx(i)}><span key={i === at ? `on-${idx}` : "off"} style={{ transform: i < at ? "scaleX(1)" : i === at ? undefined : "scaleX(0)", animation: i === at ? `bar 6s linear both${paused ? " paused" : ""}` : "none" }} /></button>)}</div>
        <span className="sc-between"><b className="label">{label}</b><span className="muted text-xs">{at + 1} / {n}</span></span>
        <span className="sc-pill-score">#{cur.rank} · {cur.scoreText}</span>
        <a href={`/m/${cur.slug}`} className="sc-h2">{cur.title}</a>
        <div style={{ minHeight: 58 }}>{cur.author && <AuthorName key={`${cur.slug}-${idx}`} name={cur.author} />}</div>
        <span className="sc-meta"><span>{cur.when}</span><span>Hosted by {cur.host}</span><span>Goodreads ×2 · {cur.gr}</span></span>
        <div><a href={`/m/${cur.slug}`} className="btn btn-ink">Open book →</a></div>
      </div>
    </div>}
    <div className="sc-tools"><Seg v={sort} set={setSort} opts={[["score", "By score"], ["date", "By month"]]} /><Seg v={view} set={setView} opts={[["covers", "Covers"], ["table", "Sheet"]]} /></div>
    {view === "covers" ? <div className="sc-grid">{sorted.map((b) => <a key={b.slug} href={`/m/${b.slug}`} className="sc-col sc-card-b">
      <Cover title={b.title} sur={b.sur} url={b.cover} bg={b.bg} badge={<span className={`sc-badge${b.gold ? " gold" : ""}`}>{b.score === null ? "Not scored" : `#${b.rank} · ${b.scoreText}`}</span>} />
      <span className="sc-col" style={{ gap: 3 }}><b className="sc-b-t">{b.title}</b><span className="sc-b-a">{b.author}</span>
        <span className="sc-b-s"><span>{b.scoreText}</span><span className="sc-bar"><span style={{ width: `${b.pct}%`, background: b.gold ? "oklch(0.75 0.15 80)" : "#141413" }} /></span><span className="muted">{b.when}</span></span>
        <span className="muted text-sm">Hosted by {b.host}</span></span></a>)}</div>
    : <div className="sc-sheet"><table><thead><tr><th>Month</th><th>Book · notes</th><th>Host</th><th>Club</th><th>GR×2</th>{names.map((m) => <th key={m}>{m}</th>)}</tr></thead>
      <tbody>{sorted.map((r) => <tr key={r.slug}><td className="muted">{r.when}</td><td><a href={`/m/${r.slug}`}><b>{r.title}</b><span className="sc-sheet-n">{r.author}{r.notes ? ` · ${r.notes}` : ""}</span></a></td><td>{r.host}</td><td className="num"><b>{r.scoreText}</b></td><td className="num muted">{r.gr}</td>
        {r.cells.map((c, i) => <td key={i} title={c.full} className="cell" style={{ opacity: c.dim ? 0.45 : 1 }}><b>{c.score}</b><i>{c.word}</i></td>)}</tr>)}</tbody></table></div>}
  </>;
}
