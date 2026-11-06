"use client";
import { useState, type ReactNode } from "react";

const move = <T,>(a: T[], i: number, j: number) => { if (j < 0 || j >= a.length) return a; const b = [...a]; [b[i], b[j]] = [b[j], b[i]]; return b; };
const Arrows = ({ i, last, go }: { i: number; last: number; go: (from: number, to: number) => void }) => <span className="nm-arrows">
  <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => go(i, i - 1)}>↑</button><button type="button" aria-label="Move down" disabled={i === last} onClick={() => go(i, i + 1)}>↓</button></span>;

/** Five title/author rows you can reorder. Fields post as bt0…bt4, ba0…ba4, in the order shown. Used by the host on Home and on /admin. */
export function FiveBooks({ books, title, note, children }: { books: { title: string; author: string | null }[]; title: string; note: string; children?: ReactNode }) {
  const [rows, setRows] = useState(() => Array.from({ length: 5 }, (_, i) => ({ id: i, t: books[i]?.title ?? "", a: books[i]?.author ?? "" })));
  const set = (i: number, k: "t" | "a", v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return <div className="nm-panel"><div className="nm-panel-h"><b>{title}</b><span>{rows.filter((r) => r.t.trim()).length} / 5 · {note}</span></div>
    <input type="hidden" name="ballot" value="1" />
    <div className="nm-rows">{rows.map((r, i) => <div key={r.id} className="nm-row nm-edit"><span className="nm-n">{i + 1}</span>
      <input name={`bt${i}`} value={r.t} onChange={(e) => set(i, "t", e.target.value)} placeholder="Book name" aria-label={`Book ${i + 1} name`} />
      <input name={`ba${i}`} value={r.a} onChange={(e) => set(i, "a", e.target.value)} placeholder="Author name" aria-label={`Book ${i + 1} author`} />
      <Arrows i={i} last={4} go={(a, b) => setRows((x) => move(x, a, b))} /></div>)}</div>{children}</div>;
}

/** The five, reordered with arrows. Studio's ballot is the top three, cast once, so moving doesn't save: the button does. */
export function RankFive({ books, action, slate, back, handle }: { books: { book: string; title: string; author: string | null }[]; action: (d: FormData) => void; slate: string; back: string; handle: string }) {
  const [rows, setRows] = useState(books);
  return <form action={action} className="nm-panel"><input type="hidden" name="handle" value={handle} /><input type="hidden" name="back" value={back} /><input type="hidden" name="slate" value={slate} />
    {["first", "second", "third"].map((n, i) => <input key={n} type="hidden" name={n} value={rows[i]?.book ?? ""} />)}
    <div className="nm-panel-h"><b>Rank the five</b><span>1 = read this next · your top three count</span></div>
    <div className="nm-rows">{rows.map((b, i) => <div key={b.book} className="nm-row"><span className="nm-n">{i + 1}</span><span className="nm-t"><b>{b.title}</b>{b.author && <span>— {b.author}</span>}</span><Arrows i={i} last={rows.length - 1} go={(x, y) => setRows((r) => move(r, x, y))} /></div>)}</div>
    <div className="nm-foot"><button className="btn btn-ink">Cast my ranking</button><span>You can&apos;t change it after this.</span></div></form>;
}

const NOTE: Record<string, string> = { no: "Want to say why? (optional)", maybe: "What's it depend on? (optional)" };
const LABEL: Record<string, string> = { yes: "Going ✓ · change", maybe: "Maybe · change", no: "Can't · change" };

/** "Are you coming?" off the card's top-right button. */
export function RsvpPopup({ action, meeting, handle, status, guests, note, count }: { action: (d: FormData) => void; meeting: string; handle: string; status: string | null; guests: number; note: string; count: string }) {
  const [open, setOpen] = useState(false), [pick, setPick] = useState(status);
  return <><button type="button" className={`nm-rsvp${status === "yes" ? " on" : ""}`} aria-expanded={open} onClick={() => setOpen(!open)}>{status ? LABEL[status] : "Are you coming?"}</button>
    {open && <form action={action} className="nm-pop"><input type="hidden" name="handle" value={handle} /><input type="hidden" name="back" value="/" /><input type="hidden" name="meeting" value={meeting} /><input type="hidden" name="guests" value={guests} /><input type="hidden" name="status" value={pick ?? ""} />
      <div className="nm-panel-h"><b>Are you coming?</b><span>{count}</span></div>
      <div className="sc-seg nm-seg">{[["yes", "I'm in"], ["maybe", "Maybe"], ["no", "Can't"]].map(([k, t]) => <button type="button" key={k} className={pick === k ? "on" : ""} onClick={() => setPick(k)}>{t}</button>)}</div>
      <textarea name="bringing" rows={2} defaultValue={note} placeholder={NOTE[pick ?? ""] ?? "A note for the host (optional)"} aria-label="Note" />
      <div className="nm-foot end"><button type="button" className="btn btn-ghost" onClick={() => { setPick(status); setOpen(false); }}>Cancel</button><button className="btn btn-ink" disabled={!pick}>Save</button></div></form>}</>;
}
