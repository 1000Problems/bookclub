"use client";
import { useEffect, useRef, useState } from "react";

/** The "now" colour is picked once per page load. Fresh's router.refresh() brings a new pick from the server; ignore it. */
export function NowTint({ pick, children }: { pick: string; children: React.ReactNode }) {
  const [tint] = useState(pick);
  return <main className="sc-main" style={{ "--warm": tint } as React.CSSProperties}>{children}</main>;
}

/** Keeps a scrolling list at its newest (bottom) item: on load and whenever the newest item changes. */
export function ScrollEnd({ last }: { last: string | number | null }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { const box = ref.current?.parentElement; if (box) box.scrollTop = box.scrollHeight; }, [last]);
  return <span ref={ref} hidden />;
}
