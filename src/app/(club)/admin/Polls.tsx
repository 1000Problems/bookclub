"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { closePollLive, postPollLive, reopenPollLive, type Live } from "@/lib/actions";

export type AdminPoll = { id: number; question: string; options: string[]; anon: boolean; reveal: string; closes_at: string | null; is_open: boolean; posted_at: string; counts: number[]; voted: number };
export type Voter = { member: string; name: string; answer: string | null };

const BLANK = { question: "", options: ["Yes", "No"], closes: "meeting", reveal: "after", anon: false };
const KEY = "sc-poll-draft";
const mon = (at: string) => new Date(at).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "short", year: "numeric" });
const day = (at: string) => new Date(at).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "long", month: "long", day: "numeric" });
const ini = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/** Design 8b: Polls, first in Admin's Club section. Write one, watch it come in, look back at old ones. */
export function Polls({ handle, polls, voters }: { handle: string; polls: AdminPoll[]; voters: Voter[] }) {
  const router = useRouter(), [busy, start] = useTransition(), [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);
  const [d, setD] = useState(BLANK);
  // The draft is kept on this device as you type, so leaving the page doesn't lose it.
  useEffect(() => { try { const x = localStorage.getItem(KEY); if (x) setD({ ...BLANK, ...JSON.parse(x) }); } catch {} }, []);
  const set = (p: Partial<typeof BLANK>) => setD((o) => { const n = { ...o, ...p }; try { localStorage.setItem(KEY, JSON.stringify(n)); } catch {} return n; });
  const go = (job: () => Promise<Live>, done: string, after?: () => void) => start(async () => { const r = await job(); if (!r.ok) { setMsg({ t: r.error ?? "That didn't save.", bad: true }); return; } after?.(); setMsg({ t: done }); router.refresh(); });

  const liveP = polls[0], past = polls.slice(1), ready = !!d.question.trim() && d.options.filter((o) => o.trim()).length >= 2;
  const seg = (k: "closes" | "reveal", list: [string, string][]) => <span className="lg-seg">{list.map(([v, t]) => <button key={v} type="button" aria-pressed={d[k] === v} onClick={() => set({ [k]: v })}>{t}</button>)}</span>;
  const total = liveP ? liveP.counts.reduce((a, b) => a + b, 0) : 0;

  return <section className="cs-card pl-admin" id="polls">
    <div className="cs-h"><span className="pl-h"><b>Polls</b><span className="sc-small">One live at a time, shown on Home under the chat.</span></span>
      <span className={`lg-tag${msg?.bad ? " bad" : ""}`} role="status">{busy ? "Saving…" : msg?.t ?? "Saves automatically"}</span></div>
    <div className="pl-grid">
      <div className="pl-new">
        <div className="cs-h"><b>New poll</b><span>{d.question ? "draft kept as you type" : "nothing posted yet"}</span></div>
        <label className="pl-f"><span className="sc-eyebrow">Question</span><input value={d.question} onChange={(e) => set({ question: e.target.value })} placeholder="Should we read something under 300 pages?" maxLength={200} /></label>
        <div className="pl-f"><span className="sc-eyebrow">Answers</span>
          {d.options.map((o, i) => <div key={i} className="pl-opt"><b>{i + 1}</b><input value={o} onChange={(e) => set({ options: d.options.map((x, j) => (j === i ? e.target.value : x)) })} placeholder="Answer" aria-label={`Answer ${i + 1}`} />
            {d.options.length > 2 && <button type="button" className="lg-text" aria-label={`Remove answer ${i + 1}`} onClick={() => set({ options: d.options.filter((_, j) => j !== i) })}>×</button>}</div>)}
          <div className="pl-presets">{d.options.length < 6 && <button type="button" className="lg-text" onClick={() => set({ options: [...d.options, ""] })}>+ Add an answer</button>}
            {([["Yes / No", ["Yes", "No"]], ["Yes / No / Maybe", ["Yes", "No", "Maybe"]], ["Pick a date", ["Thu", "Fri", "Sat"]]] as const).map(([t, o]) => <button key={t} type="button" className="pl-chip" onClick={() => set({ options: [...o] })}>{t}</button>)}</div></div>
        <div className="pl-two"><div className="pl-f"><span className="sc-eyebrow">Closes</span>{seg("closes", [["meeting", "At the meeting"], ["week", "In a week"]])}</div>
          <div className="pl-f"><span className="sc-eyebrow">Results show</span>{seg("reveal", [["after", "After voting"], ["close", "When it closes"]])}</div></div>
        <label className="cs-box"><input type="checkbox" checked={d.anon} onChange={(e) => set({ anon: e.target.checked })} />Secret ballot: show counts, not who voted</label>
        <div className="pl-post"><button type="button" className="btn btn-ink" disabled={!ready || busy}
          onClick={() => go(() => postPollLive(handle, { question: d.question, options: d.options, anon: d.anon, reveal: d.reveal, closes: d.closes }), "Posted to Home", () => { setD(BLANK); try { localStorage.removeItem(KEY); } catch {} })}>
          {liveP?.is_open ? "Post and close the current poll" : "Post to Home"}</button>
          <span className="sc-small">{ready ? "It shows on Home under the chat straight away." : "Write a question and at least two answers."}</span></div>
      </div>

      <div className="pl-side">
        {liveP ? <div className="pl-live">
          <div className="pl-top"><span className="sc-eyebrow"><i className={`pl-dot${liveP.is_open ? " on" : ""}`} />{liveP.is_open ? "Live on Home" : "Closed · still on Home"}</span><span className="sc-small">{liveP.voted} of {voters.length} voted</span></div>
          <b className="pl-q">{liveP.question}</b>
          <div className="pl-tally">{liveP.options.map((o, i) => { const n = liveP.counts[i], pct = total ? (n / total) * 100 : 0;
            return <div key={o}><b>{o}</b><span className="pl-track"><span style={{ width: `${pct}%` }} /></span><b>{n}</b></div>; })}</div>
          <div className="pl-voters">{voters.map((v) => <span key={v.member} title={v.name} className={v.answer ? "in" : undefined}><i>{ini(v.name)}</i>{liveP.anon ? (v.answer ? "voted" : "—") : v.answer ?? "not yet"}</span>)}</div>
          <div className="pl-acts">{liveP.is_open
            ? <><button type="button" className="btn" disabled={busy} onClick={() => go(() => closePollLive(handle, liveP.id), "Poll closed")}>Close now</button><span className="sc-small">{liveP.closes_at ? `Closes ${day(liveP.closes_at)}.` : "Open until you close it."}</span></>
            : <><span className="sc-small">Closed. Results stay on Home until you post the next one.</span><button type="button" className="btn" disabled={busy} onClick={() => go(() => reopenPollLive(handle, liveP.id), "Poll reopened")}>Reopen</button></>}</div>
        </div> : <div className="pl-live"><span className="sc-small">No poll yet. The first one you post shows on Home under the chat.</span></div>}

        <div className="pl-past"><div className="cs-h"><b>Past polls</b><span>{past.length} poll{past.length === 1 ? "" : "s"}</span></div>
          {past.map((p) => { const t = p.counts.reduce((a, b) => a + b, 0), mx = Math.max(...p.counts), wi = p.counts.indexOf(mx);
            return <div key={p.id} className="pl-prow"><span className="pl-when">{mon(p.posted_at)}</span>
              <span className="pl-pq"><b>{p.question}</b><span>{t} voted · {p.options.map((o, i) => `${o} ${p.counts[i]}`).join(" · ")}{p.anon ? " · secret" : ""}</span></span>
              <span className="pl-pwin"><span className="pl-stack">{p.counts.map((c, i) => <i key={i} style={{ width: `${t ? (c / t) * 100 : 0}%`, background: i === wi ? "var(--ink)" : i === 1 ? "#c9c7c0" : "#e4e2dc" }} />)}</span><span>{t ? `${p.options[wi]} · ${Math.round((mx / t) * 100)}%` : "no votes"}</span></span></div>; })}
          {!past.length && <span className="sc-small">Older polls show here.</span>}</div>
      </div>
    </div>
  </section>;
}
