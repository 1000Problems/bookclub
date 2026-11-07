"use client";
import { useState, useTransition } from "react";
import { saveMemberSheetLive } from "@/lib/actions";

type R = { slug: string; name: string; label: string; birthday: string; birthdayText: string };

/** Sheet column labels and birthdays, for the export. Each row saves when you leave it. */
export function MemberSheet({ handle, rows }: { handle: string; rows: R[] }) {
  const [busy, start] = useTransition(), [msg, setMsg] = useState<string | null>(null);
  const save = (e: React.FocusEvent<HTMLDivElement>, r: R) => {
    const el = e.currentTarget, get = (n: string) => (el.querySelector(`[name=${n}]`) as HTMLInputElement).value;
    if (el.contains(e.relatedTarget as Node)) return;
    const n = { label: get("label"), birthday: get("birthday"), birthdayText: get("birthday_text") };
    if (n.label === r.label && n.birthday === r.birthday && n.birthdayText === r.birthdayText) return;
    start(async () => { const x = await saveMemberSheetLive(handle, r.slug, n.label, n.birthday, n.birthdayText); setMsg(x.ok ? `${r.name}: saved` : x.error ?? "That didn't save."); if (x.ok) Object.assign(r, n); });
  };
  return <div className="a7-sheet"><span className="ad-note" role="status">{busy ? "Saving…" : msg ?? "Saves when you leave a row."}</span>
    {rows.map((r) => <div key={r.slug} onBlur={(e) => save(e, r)}><b>{r.name}</b>
      <label>Label<input name="label" defaultValue={r.label} /></label><label>Birthday<input type="date" name="birthday" defaultValue={r.birthday} /></label><label>Or, no date<input name="birthday_text" defaultValue={r.birthdayText} placeholder="TBD" /></label></div>)}</div>;
}
