"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { votePollLive } from "@/lib/actions";

export type LivePoll = { id: number; question: string; options: string[]; anon: boolean; reveal: string; closes_at: string | null; is_open: boolean;
  my_answer: string | null; counts: number[] | null; voted: number; eligible: number; voters: string[] | null };

const day = (at: string) => new Date(at).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric" });
const ini = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/** Design 8a: the club poll on Home, under the chat. Tap an answer; results show after you vote (or when it closes);
 *  tap another answer to change while it's open. Closed, it stays until the next poll is posted. */
export function PollCard({ poll, handle }: { poll: LivePoll; handle: string }) {
  const router = useRouter(), [busy, start] = useTransition(), [err, setErr] = useState<string | null>(null);
  const [mine, setMine] = useState(poll.my_answer);
  const vote = (a: string) => { if (!poll.is_open || busy || a === mine) return; const was = mine; setMine(a); setErr(null);
    start(async () => { const r = await votePollLive(handle, poll.id, a); if (!r.ok) { setMine(was); setErr(r.error ?? "That didn't save."); } else router.refresh(); }); };
  const counts = poll.counts, total = counts ? counts.reduce((a, b) => a + b, 0) : 0, max = counts ? Math.max(...counts) : 0;
  const results = !!counts;
  const eyebrow = poll.is_open ? `Club poll${poll.closes_at ? ` · closes ${day(poll.closes_at)}` : ""}` : `Club poll · closed`;
  const names = poll.voters ?? [];
  return <section className="sc-panel pl-card" aria-label="Club poll">
    <div className="pl-top"><span className="sc-eyebrow"><i className={`pl-dot${poll.is_open ? " on" : ""}`} />{eyebrow}</span><span className="sc-small">{poll.voted} of {poll.eligible} voted</span></div>
    <b className="pl-q">{poll.question}</b>
    {!results ? <>
      <div className="pl-btns">{poll.options.map((o) => <button key={o} type="button" className={`btn${mine === o ? " btn-ink" : ""}`} disabled={!poll.is_open || busy} onClick={() => vote(o)}>{o}</button>)}</div>
      <span className="sc-small">{mine ? "Results show when the poll closes." : poll.reveal === "close" ? "Results show when the poll closes." : "Results show after you vote."}</span>
    </> : <>
      <div className="pl-rows">{poll.options.map((o, i) => { const n = counts![i], pct = total ? Math.round((n / total) * 100) : 0, me = mine === o, won = !poll.is_open && n === max && max > 0;
        return <button key={o} type="button" className={`pl-row${me ? " mine" : ""}`} disabled={!poll.is_open || busy} onClick={() => vote(o)} aria-pressed={me}>
          <span className="pl-bar" style={{ width: `${pct}%`, background: me || won ? "oklch(.87 .14 85 / .75)" : "rgba(20,20,19,.08)" }} />
          <span className="pl-label">{o}{me && <i>your vote</i>}{won && <i>won</i>}</span><span className="pl-num"><b>{pct}%</b><span>{n}</span></span></button>; })}</div>
    </>}
    {err && <span className="sc-small" role="alert" style={{ color: "var(--trap)" }}>{err}</span>}
  </section>;
}
