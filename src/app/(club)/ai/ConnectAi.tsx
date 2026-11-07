"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { aiCodeLive, aiDisconnectLive } from "@/lib/actions";
import { PageHead } from "@/components/ui";

type Status = { state: string; key_created_at?: string | null; last_used_at?: string | null; code_expires_at?: string | null;
  last_code?: { status: string; created_at: string; used_at: string | null } | null; ai_changes?: { table: string; op: string; at: string }[] };
type Phase = "listen" | "hello" | "ready";
const DOCS = "https://github.com/1000Problems/readingdocs/blob/main/bookclub/README.md";
const HELLO_MS = 2500;
const t = (x?: string | null) => (x ? new Date(x).getTime() : 0);
const mmss = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
const ago = (x: string) => { const s = Math.max(0, Math.round((Date.now() - t(x)) / 1000)); return s < 45 ? "Just now" : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} d ago`; };
const WHAT: Record<string, string> = { meetings: "a meeting", posts: "a chat post", rsvps: "an RSVP", votes: "a score", writeups: "a write-up", books: "a book", candidates: "the five", slates: "the five", polls: "a poll", poll_votes: "a poll vote", threads: "a talk thread", members: "a member", club: "the club settings", later: "a to-do", meeting_sheet: "a month's sheet row", book_sheet: "a book's sheet details", vote_sheet: "a vote cell" };
const VERB: Record<string, string> = { INSERT: "Added", UPDATE: "Changed", DELETE: "Removed", insert: "Added", update: "Changed", delete: "Removed" };

/** Back-to-back changes of the same kind read as one line with a count. */
const runs = (xs: { table: string; op: string; at: string }[]) => xs.reduce<{ table: string; op: string; at: string; n: number }[]>((out, x) => {
  const last = out.at(-1);
  if (last && last.table === x.table && last.op.toLowerCase() === x.op.toLowerCase()) last.n++; else out.push({ ...x, n: 1 });
  return out;
}, []);

export type Example = { kind: string; ask: string; does: string };

/** Connect your AI (Claude Design "Account & AI page redesign"). Live: a code on open, a check each second while it
 *  waits, "said hello" when the AI trades the code for its key, "ready" on its first read. Always "your AI", no brand. */
export function ConnectAi({ handle, initial, ini, examples }: { handle: string; initial: Status; ini: string; examples: Example[] }) {
  const [st, setSt] = useState<Status>(initial);
  const [phase, setPhase] = useState<Phase>(initial.state === "connected" ? "ready" : "listen");
  const [code, setCode] = useState<{ code: string; expires: number; made: number } | null>(null);
  const [copied, setCopied] = useState(false), [exCopied, setExCopied] = useState(-1), [now, setNow] = useState(() => Date.now());
  const [err, setErr] = useState<string | null>(null), [waitStart, setWaitStart] = useState(() => Date.now());
  const helloAt = useRef(0), busy = useRef(false);

  const newCode = useCallback(async () => {
    if (busy.current) return; busy.current = true; setErr(null);
    const r = await aiCodeLive(handle); busy.current = false;
    if (!r.ok || !r.code) { setErr(r.error ?? "Couldn't make a code. Try again."); return; }
    setCode({ code: r.code, expires: t(r.expires_at) || Date.now() + 600_000, made: Date.now() }); setCopied(false); setPhase("listen"); helloAt.current = 0; setWaitStart(Date.now());
  }, [handle]);

  // On open: a fresh code, unless already connected.
  useEffect(() => { if (initial.state !== "connected") void newCode(); }, [initial.state, newCode]);

  // Each second while waiting (and while the tab is visible); every 10 s once ready, for "what your AI just did".
  useEffect(() => {
    const every = phase === "ready" ? 10_000 : 1000;
    const id = setInterval(async () => {
      setNow(Date.now());
      if (document.visibilityState !== "visible") return;
      const s: Status = await fetch("/api/ai-status", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      if (!s) return;
      setSt(s);
      if (phase === "ready" || !code) return;
      const lc = s.last_code, used = lc?.status === "used" && t(lc.used_at) >= code.made - 5000;
      if (!used) return;
      if (!helloAt.current) { helloAt.current = Date.now(); setPhase("hello"); }
      // Connected once the AI holds its key: it may ask the member before its first query, so don't wait for one.
      if (Date.now() - helloAt.current >= HELLO_MS) setPhase("ready");
    }, every);
    return () => clearInterval(id);
  }, [phase, code]);

  const copy = (text: string) => { try { void navigator.clipboard?.writeText(text); } catch {} };
  const prompt = code ? `Connect to my book club.\nCode: ${code.code}\nDocs: ${DOCS}\nKeep the key in this chat only; don't save it anywhere.` : "";
  const left = code ? Math.max(0, Math.round((code.expires - now) / 1000)) : 0;
  const done = phase === "ready" ? 3 : phase === "hello" ? 2 : copied ? 1 : 0;
  const disconnect = async () => { const r = await aiDisconnectLive(handle); if (!r.ok) { setErr(r.error ?? "That didn't work."); return; } setSt({ state: "none" }); await newCode(); };

  return <div className="sc-col" style={{ gap: 16 }}>
    <PageHead title="Bring Your Own AI" sub="Let it read and update the club for you, with your permissions."
      right={phase === "ready" ? <button type="button" className="btn" onClick={disconnect}>Disconnect</button> : undefined} />
    {err && <p className="sc-small" role="alert" style={{ color: "var(--trap)" }}>{err}</p>}

    <div className={`cx-grid${phase === "ready" ? " ready" : ""}`}>

      {phase !== "ready" ? <section className="sc-panel cx-prompt">
        <div className="sc-between"><span className="sc-eyebrow">Copy this to your AI</span><span className={`sc-eyebrow${code && left < 60 && phase === "listen" ? " cx-warn" : ""}`}>{phase === "hello" ? "Code used ✓" : !code ? "Making a code…" : left === 0 ? "Code expired" : `Expires in ${mmss(left)}`}</span></div>
        <pre className="cx-code" style={{ opacity: phase === "hello" ? 0.5 : 1 }}>{code ? <>Connect to my book club.{"\n"}Code: <mark>{code.code}</mark>{"\n"}Docs: {DOCS}{"\n"}Keep the key in this chat only; don&apos;t save it anywhere.</> : "…"}</pre>
        <div className="cx-row"><button type="button" className="btn btn-ink" disabled={!code || left === 0} onClick={() => { copy(prompt); setCopied(true); setWaitStart(Date.now()); }}>{copied ? "Copied ✓" : "Copy prompt"}</button>
          <span className="sc-small" role="status">{phase === "hello" ? "Your AI has it." : copied ? "Now paste it in your AI." : "Copy this, then paste it in your AI."}</span>
          <button type="button" className="btn" onClick={() => void newCode()}>New code</button></div>
        <span className="sc-small">Paste it into a new chat. One code connects one conversation; a new code replaces the old connection.</span>
      </section> : <section className="sc-panel cx-did">
        <div className="sc-between"><span className="sc-eyebrow">What your AI just did</span><span className="sc-small">Every change it makes is signed as your AI</span></div>
        <div className="cx-log">
          {st.last_used_at && <div><span className="sc-eyebrow">{ago(st.last_used_at)}</span><span><b>Last used</b><span className="sc-small">Reading or changing the club with your access</span></span></div>}
          {runs(st.ai_changes ?? []).map((c, i) => <div key={i}><span className="sc-eyebrow">{ago(c.at)}</span><span><b>{VERB[c.op] ?? "Changed"} {WHAT[c.table] ?? c.table.replace(/_/g, " ")}{c.n > 1 ? ` ×${c.n}` : ""}</b></span></div>)}
          {st.key_created_at && <div><span className="sc-eyebrow">{ago(st.key_created_at)}</span><span><b>Used your code</b><span className="sc-small">Got its own key, tied to your account</span></span></div>}
        </div>
        <div className="cx-row"><span className="sc-small">New chat tomorrow? Get a new code; it replaces this connection.</span><button type="button" className="btn" onClick={() => void newCode()}>Connect a new chat</button></div>
      </section>}
      <section className="cx-stage">
        <div className={`cx-steps${phase === "listen" && !copied ? " still" : ""}`}>{["Copy the prompt", "Your AI says hello", "Ready"].map((l, i) => <span key={l} className={i < done ? "done" : i === done ? "on" : undefined}><span>{i < done ? "✓" : i + 1}</span>{l}</span>)}</div>
        <Viz phase={phase} copied={copied} ini={ini} still={phase === "listen" && !copied} />
        <div className="cx-say">
          {phase === "listen" && !copied && <><span className="sc-eyebrow">Ready when you are</span><b>Copy the prompt, then paste it to your AI. This page will know when it arrives.</b><span className="sc-small">Nothing to install. Your AI talks to the club&apos;s database directly, the same data you see on these pages.</span></>}
          {phase === "listen" && copied && <><span className="sc-eyebrow">Listening for your AI</span><b>Now paste it into a chat with your AI.</b><span className="sc-small">It will ask before it contacts db.byoaistudio.com, and your computer may ask you to approve it. Say yes: it&apos;s trading the code for its own key.</span></>}
          {phase === "hello" && <><span className="sc-eyebrow">Your AI said hello</span><b>Your AI found the club.</b><span className="sc-small">It used your code and got its own key. Now it&apos;s reading the club for the first time…</span></>}
          {phase === "ready" && <><span className="sc-eyebrow">Connected</span><b>You&apos;re set. Ask it anything about the club.</b><span className="sc-small">Your AI can see and do what you can here, and nothing you can&apos;t. Keep talking to it in the same chat.</span></>}
          <span className="cx-live"><i className={phase === "ready" ? "ok" : undefined} />{phase === "ready" ? (st.last_used_at ? `Connected · last used ${ago(st.last_used_at).toLowerCase()}` : "Connected · your AI holds its key") : phase === "listen" && !copied ? "Waiting for you to copy the prompt" : `Listening · ${mmss(Math.round((now - waitStart) / 1000))}`}</span>
        </div>
      </section>
    </div>

    {phase === "ready" && <section className="sc-col" style={{ gap: 12 }}>
      <div className="sc-between"><h2 className="sc-h2" style={{ margin: 0 }}>Try asking your AI</h2><span className="sc-small">Tap one to copy it, then paste it in the same chat.</span></div>
      <div className="cx-ex">{examples.map((e, i) => <button key={e.ask} type="button" className={exCopied === i ? "on" : undefined} onClick={() => { copy(e.ask); setExCopied(i); setTimeout(() => setExCopied(-1), 2200); }}>
        <span className="sc-between"><span className={`sc-eyebrow${e.kind !== "Ask" ? " cx-kind" : ""}`}>{e.kind}</span><span className="sc-small">{exCopied === i ? "Copied ✓" : "Copy"}</span></span>
        <b>“{e.ask}”</b><span className="sc-small">{e.does}</span></button>)}</div>
    </section>}

    <section className="sc-col" style={{ gap: 12 }}>
      <h2 className="sc-h2" style={{ margin: 0 }}>What connecting means</h2>
      <div className="cx-why">
        <div><b>It works as you</b><span>Your AI borrows your access: it can see and do what you can on this site, and nothing you can&apos;t. Admin rights come only from your account.</span></div>
        <div><b>The data stays with the club</b><span>It lives in the club&apos;s space on BYOAI Studio, not on your computer and not inside your AI. The club owns it; the admins run it.</span></div>
        <div><b>You stay in charge</b><span>Everything it changes is signed as your AI, so the club can see who did what. Disconnect any time, and the site works fully without it.</span></div>
      </div>
    </section>
  </div>;
}

/** You → your AI → the club. Dots travel while it waits; the AI pops in when it says hello; the club bursts to a ✓. */
function Viz({ phase, copied, ini, still }: { phase: Phase; copied: boolean; ini: string; still: boolean }) {
  const p = phase === "ready" ? 2 : phase === "hello" ? 1 : 0;
  return <div className={`cx-viz${still ? " still" : ""}`} data-p={p}>
    <div className="cx-node"><span className="cx-c you">{ini}</span><span className="cx-l"><b>You</b><span>ask in plain words</span></span></div>
    <div className={`cx-line${p > 0 ? " fill" : ""}`} />
    <div className="cx-node">{p === 0 ? <span className="cx-c ghost">AI</span> : <span className="cx-c ai pop">{p === 1 && <i className="cx-ring rip" />}AI</span>}
      <span className="cx-l"><b className={p ? undefined : "dim"}>Your AI</b><span>{p === 0 ? "not here yet" : p === 1 ? "said hello" : "connected"}</span></span></div>
    <div className={`cx-line${p === 2 ? " fill" : p === 0 ? " dash still" : ""}`}>
      
      {p === 1 && <><i className="cx-dot r fast" /><i className="cx-dot l fast late" /><i className="cx-dot r fast amber" /></>}</div>
    <div className="cx-node">{p === 2 ? <span className="cx-c club done pop"><i className="cx-ring burst" /><i className="cx-ring burst ink late" />✓</span>
      : <span className={`cx-c club${p === 1 ? " quick" : ""}`}><i className="cx-ring rip" /><i className="cx-ring rip late" /><span>SC<em>.</em></span></span>}
      <span className="cx-l"><b>The club</b><span>{p === 2 ? "ready" : "listening"}</span></span></div>
  </div>;
}
