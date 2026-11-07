"use client";
import { useState } from "react";

/** The message for your AI, with a button that copies it. If the browser refuses, the text stays there to select by hand. */
export function CopyPrompt({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = () => navigator.clipboard.writeText(text).then(() => setState("copied"), () => setState("failed"));
  return <><pre className="card-lift p-3 whitespace-pre-wrap">{text}</pre>
    <div className="flex gap-3 items-center my-2"><button type="button" className="btn btn-ink" onClick={copy}>{state === "copied" ? "Copied ✓" : "Copy"}</button>
      <span role="status" className="muted">{state === "copied" ? "Now paste it in your AI." : state === "failed" ? "Couldn't copy. Select the text above and copy it." : "Copy this, then paste it in your AI."}</span></div></>;
}
