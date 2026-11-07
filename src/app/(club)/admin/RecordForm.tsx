"use client";
import { useRef, useState, type ReactNode } from "react";

const changed = (el: Element) => {
  if (el instanceof HTMLInputElement) return el.type === "checkbox" || el.type === "radio" ? el.checked !== el.defaultChecked : el.type !== "hidden" && el.value !== el.defaultValue;
  if (el instanceof HTMLTextAreaElement) return el.value !== el.defaultValue;
  if (el instanceof HTMLSelectElement) return [...el.options].some((o) => o.selected !== o.defaultSelected);
  return false;
};

/** 4c's record: edited cells turn yellow, the bar counts what isn't saved, Discard puts it all back. */
export function RecordForm({ action, label, children }: { action: (d: FormData) => void; label: string; children: ReactNode }) {
  const ref = useRef<HTMLFormElement>(null), [n, setN] = useState(0);
  const count = () => {
    const f = ref.current; if (!f) return;
    const names = new Set<string>();
    for (const el of f.elements) { const on = changed(el); (el.closest(".am-cell, .am-mem > div, .am-even label, .nm-row") as HTMLElement | null)?.classList.toggle("dirty", on || !!el.closest(".dirty-keep")); if (on && "name" in el) names.add((el as HTMLInputElement).name); }
    f.querySelectorAll(".dirty").forEach((c) => { if (![...c.querySelectorAll("input, select, textarea")].some(changed)) c.classList.remove("dirty"); });
    setN(names.size);
  };
  return <form ref={ref} action={action} className="am-right" onInput={count} onChange={count} onReset={() => setTimeout(count)}>
    {children}
    <div className="am-save"><button className="ad-b ad-ink">Save {label}</button>{n > 0 && <button type="reset" className="ad-b">Discard</button>}
      <span className={n ? "ad-warn" : undefined}>{n ? `${n} change${n === 1 ? "" : "s"} on this month · not saved` : "All saved. Changes go into the record and the Excel export."}</span></div>
  </form>;
}

/** Retired members with no entry this month fold into one button, as in 4c. */
export function Quiet({ names, children }: { names: string[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!names.length) return null;
  return <>{open && children}<button type="button" className="ad-b am-quiet" onClick={() => setOpen(!open)}>{open ? `Hide the ${names.length} retired members with no entry` : `+ ${names.length} retired members with no entry this month (${names.join(", ")})`}</button></>;
}
