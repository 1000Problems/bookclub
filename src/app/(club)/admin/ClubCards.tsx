"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { matchBooksLive, saveSettingsLive } from "@/lib/actions";

type Settings = { visibility: string; score_reveal: string; slate_size: number; public_talk: boolean; public_scores: boolean; talk_visible_to_ai: boolean };

/** ADMIN 7a, Club settings: every switch saves as you change it. */
export function ClubSettings({ handle, initial, matched, total }: { handle: string; initial: Settings; matched: number; total: number }) {
  const router = useRouter(), [busy, start] = useTransition(), [s, setS] = useState(initial), [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);
  const save = (n: Settings) => { const was = s; setS(n); start(async () => { const r = await saveSettingsLive(handle, n); if (!r.ok) { setS(was); setMsg({ t: r.error ?? "That didn't save.", bad: true }); } else { setMsg({ t: "Saved" }); router.refresh(); } }); };
  const seg = (k: "visibility" | "score_reveal", opts: [string, string][]) => <span className="lg-seg">{opts.map(([v, t]) => <button key={v} type="button" aria-pressed={s[k] === v} onClick={() => s[k] !== v && save({ ...s, [k]: v })}>{t}</button>)}</span>;
  const box = (k: "public_talk" | "public_scores" | "talk_visible_to_ai", t: string) => <label className="cs-box"><input type="checkbox" checked={s[k]} onChange={(e) => save({ ...s, [k]: e.target.checked })} />{t}</label>;
  const left = total - matched;
  return <div className="cs-card">
    <div className="cs-h"><b>Club settings</b><span className={msg?.bad ? "ad-warn" : undefined} role="status">{busy ? "Saving…" : msg?.t ?? "Saves as you change it"}</span></div>
    <div className="cs-row"><span>Who can see the site</span>{seg("visibility", [["public", "Public"], ["members", "Members"]])}</div>
    <div className="cs-row"><span>Score reveal</span>{seg("score_reveal", [["open", "Open"], ["together", "Together"]])}</div>
    <div className="cs-row"><span>Books on each ballot</span><span className="cs-step"><button type="button" aria-label="Fewer" disabled={s.slate_size <= 2} onClick={() => save({ ...s, slate_size: s.slate_size - 1 })}>−</button><b>{s.slate_size}</b><button type="button" aria-label="More" disabled={s.slate_size >= 8} onClick={() => save({ ...s, slate_size: s.slate_size + 1 })}>+</button></span></div>
    <div className="cs-boxes">{box("public_talk", "Visitors can read chat")}{box("public_scores", "Visitors can see scores")}{box("talk_visible_to_ai", "AIs can read private talk")}</div>
    <div className="cs-row cs-match"><span>Books matched to an edition <b>{matched} / {total}</b></span>
      {left > 0 && <button type="button" className="cs-link" disabled={busy} onClick={() => start(async () => { const r = await matchBooksLive(handle); setMsg(r.ok ? { t: "Matched what we could" } : { t: r.error ?? "That didn't run.", bad: true }); router.refresh(); })}>Match {left} more</button>}</div>
  </div>;
}
