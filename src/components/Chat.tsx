"use client";
import { useEffect, useRef, useState } from "react";
import { first, tint } from "@/lib/record";
import { ago, Md } from "@/lib/text";
import { ScrollEnd } from "./Keep";

export type ChatPost = { id: string | number; name: string; body: string; created_at: string };

const CALM = 30_000, TALK = 5_000, TALK_FOR = 120_000, IDLE = 300_000, KEY = "sc-chat-talk";
const until = () => { try { return Number(sessionStorage.getItem(KEY)) || 0; } catch { return 0; } };
const talk = () => { try { sessionStorage.setItem(KEY, String(Date.now() + TALK_FOR)); } catch {} };

/** Home's club chat. The only live part of the site: it checks for new posts every 30 s while the window is focused
 *  and someone moved in the last 5 min; every 5 s for 2 min after you type or post, so a conversation can happen.
 *  The refresh button checks now and does the same. New posts are appended here; the rest of the page is never refreshed. */
export function Chat({ initial, live, empty, children }: { initial: ChatPost[]; live: boolean; empty: React.ReactNode; children?: React.ReactNode }) {
  const [posts, setPosts] = useState(initial);
  const seen = useRef(initial);
  // A post of your own reloads Home through its server action: take the fresh list.
  if (seen.current !== initial) { seen.current = initial; setPosts(initial); }
  const now = useRef<() => void>(() => {});
  const [spin, setSpin] = useState(false);
  const newest = useRef(initial.at(-1)?.created_at ?? null);
  newest.current = posts.at(-1)?.created_at ?? newest.current;

  useEffect(() => {
    if (!live) return;
    let timer: ReturnType<typeof setTimeout> | undefined, busy = false, moved = Date.now();
    const check = async () => {
      if (busy) return; busy = true;
      try {
        const r = await fetch(`/api/chat?after=${encodeURIComponent(newest.current ?? "1970-01-01T00:00:00Z")}`, { cache: "no-store" });
        const j = r.ok ? await r.json() : null;
        if (j?.posts?.length) {
          talk(); // someone's talking: keep up for a while
          setPosts((p) => { const ids = new Set(p.map((x) => x.id)); return [...p, ...(j.posts as ChatPost[]).filter((x) => !ids.has(x.id))].slice(-40); });
        }
      } catch {} finally { busy = false; }
    };
    const watching = () => !document.hidden && document.hasFocus() && Date.now() - moved < IDLE;
    const loop = () => {
      clearTimeout(timer);
      const fast = until() > Date.now();
      timer = setTimeout(async () => { if (watching()) await check(); loop(); }, fast ? TALK : CALM);
    };
    const wake = () => { const was = Date.now() - moved >= IDLE; moved = Date.now(); if (was) { void check(); loop(); } };
    const back = () => { if (!document.hidden && document.hasFocus()) { moved = Date.now(); void check(); loop(); } };
    // The refresh button: fetch now, then keep up as if you'd typed.
    now.current = () => { talk(); moved = Date.now(); setSpin(true); void check().finally(() => setSpin(false)); loop(); };
    loop();
    const acts = ["pointermove", "keydown", "scroll", "touchstart"] as const;
    acts.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    window.addEventListener("focus", back); document.addEventListener("visibilitychange", back);
    return () => { clearTimeout(timer); acts.forEach((e) => window.removeEventListener(e, wake)); window.removeEventListener("focus", back); document.removeEventListener("visibilitychange", back); };
  }, [live]);

  return <div className="contents" onInput={talk} onSubmit={talk}>
    {live && <button type="button" className="sc-mini" onClick={() => now.current()} disabled={spin} aria-label="Check for new messages"
      style={{ alignSelf: "flex-end", marginBottom: -4, background: "none", border: 0, cursor: "pointer", opacity: spin ? 0.5 : 1 }}>{spin ? "Checking…" : "↻ Refresh"}</button>}
    <div className="sc-chat"><ScrollEnd last={posts.at(-1)?.id ?? posts.length} />{empty}
      {posts.map((p) => <div key={p.id} className="sc-msg"><span className="sc-av" style={{ background: tint(p.name, 0.88, 0.07) }}>{p.name[0]}</span><span className="flex flex-col gap-0.5 min-w-0"><span className="muted text-xs"><b style={{ color: "#141413" }}>{first(p.name)}</b> · {ago(p.created_at)}</span><span style={{ lineHeight: 1.4, overflowWrap: "anywhere" }}><Md text={p.body} /></span></span></div>)}</div>
    {children}
  </div>;
}
