"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Month picker: opens that month without a page reload. Safari on a Mac and Firefox show a text box, so a half-typed value is ignored. */
export function MonthField({ value, min, max }: { value: string; min: string; max: string }) {
  const router = useRouter(), [pending, go] = useTransition();
  return <input className="ad-pick" type="month" key={value} defaultValue={value.slice(0, 7)} min={min} max={max} aria-label="Month" aria-busy={pending} style={pending ? { opacity: .5 } : undefined}
    onChange={(e) => { const m = e.currentTarget.value; if (/^\d{4}-\d{2}$/.test(m) && m >= min && m <= max) go(() => router.replace(`/admin?m=${m}`, { scroll: false })); }} />;
}
