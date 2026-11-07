"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { saveMonthLive } from "@/lib/actions";

const WAIT = 700;

/** ADMIN 7a: the month's record saves as you type. A pause, a tick box or leaving a field sends the whole row; one save at a time. */
export function RecordForm({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLFormElement>(null), router = useRouter();
  const [state, setState] = useState<{ t: string; bad?: boolean }>({ t: "All changes saved" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null), running = useRef<Promise<void> | null>(null), again = useRef<FormData | null>(null);

  const send = async (d: FormData) => {
    setState({ t: "Saving…" });
    const r = await saveMonthLive(d);
    if (!r.ok) { setState({ t: r.error ?? "That didn't save.", bad: true }); return; }
    setState({ t: "All changes saved" });
    // What was just saved is now "as it was", before the refresh lands, so a quick next save doesn't send it again.
    const f = ref.current, set = (n: string, v: string) => { const el = f?.querySelector<HTMLInputElement>(`input[type=hidden][name="${CSS.escape(n)}"]`); if (el) el.value = v; };
    const g = (n: string) => String(d.get(n) ?? "");
    set("exists", "1"); set("title_was", g("title")); set("sheet_voting_was", g("sheet_voting"));
    if (d.has("ballot")) set("five_was", [0, 1, 2, 3, 4].map((i) => `${g(`bt${i}`).trim()}|${g(`ba${i}`).trim()}`).join("¦"));
    for (const k of ["sheet_number", "sheet_title", "sheet_host", "sheet_score", "sheet_grx2", "sheet_cells_json"]) if (d.has(k)) set(`${k}_was`, g(k));
    for (const m of d.getAll("vm").map(String)) { set(`v0:${m}`, g(`v:${m}`).trim()); set(`c0:${m}`, g(`c:${m}`).trim()); }
    router.refresh();   // hidden "as it was" fields come back current, so the next save only sends what changed
  };
  const queue = (d: FormData) => {
    // A save asked for mid-save waits, then reads the form fresh (a "Post the five" keeps its own data).
    if (running.current) { again.current = d.has("post") ? d : again.current ?? new FormData(); return; }
    running.current = send(d).finally(() => { running.current = null; const n = again.current; again.current = null; if (n && ref.current) queue(n.has("post") ? n : new FormData(ref.current)); });
  };
  const soon = (now = false) => {
    if (timer.current) clearTimeout(timer.current);
    setState({ t: "Not saved yet" });
    timer.current = setTimeout(() => ref.current && queue(new FormData(ref.current)), now ? 0 : WAIT);
  };
  useEffect(() => () => { if (timer.current) { clearTimeout(timer.current); if (ref.current) void saveMonthLive(new FormData(ref.current)); } }, []);
  const submit = (e: FormEvent<HTMLFormElement>) => {   // "Post the five" is the only button that submits
    e.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    queue(new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter));
  };
  const kind = (t: EventTarget) => (t as HTMLInputElement).type;
  return <form ref={ref} className="am-right" onSubmit={submit}
    onInput={(e) => { const k = kind(e.target); if (k !== "checkbox" && k !== "radio") soon(); }}
    onChange={(e) => { const k = kind(e.target); if (k === "checkbox" || k === "radio" || (e.target as HTMLElement).tagName === "SELECT" || k === "date" || k === "time") soon(true); }}
    onBlur={() => { if (timer.current && state.t === "Not saved yet") soon(true); }}>
    <span className={`am-saved${state.bad ? " bad" : ""}`} role="status">{state.t}</span>
    {children}
  </form>;
}

/** Retired members with no entry this month fold into one button, as in 4c. */
export function Quiet({ names, children }: { names: string[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!names.length) return null;
  return <>{open && children}<button type="button" className="ad-b am-quiet" onClick={() => setOpen(!open)}>{open ? `Hide the ${names.length} retired members with no entry` : `+ ${names.length} retired members with no entry this month (${names.join(", ")})`}</button></>;
}
