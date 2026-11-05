"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** §4.4 freshness: polls while visible, refreshes on any change, says when it was the member's AI. */
export function Fresh({ ballot }: { ballot?: boolean }) {
  const router = useRouter();
  const cursor = useRef<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    const tick = async () => {
      if (document.hidden) return;
      if (ballot) router.refresh();
      const r = await fetch(`/api/changes?since=${cursor.current ?? "0"}`).catch(() => null);
      if (!r?.ok) return;
      const j = await r.json();
      const first = cursor.current === null;
      if (j.cursor) cursor.current = j.cursor;
      if (first || !j.changes?.length) return;
      const ai = j.changes.find((c: { channel: string; member_slug: string }) => c.channel === "ai");
      if (ai) setToast(`Updated by ${ai.member_slug}'s AI just now`);
      router.refresh();
    };
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, [router, ballot]);
  return toast ? <p className="card-lift p-3 mb-3 muted" role="status">{toast}</p> : null;
}
