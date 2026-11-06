import { CLUB } from "@/lib/club";
import { disconnectAi, getCode } from "@/lib/actions";
import { liveViewer, Hidden, L, Notice, Title, type Page } from "@/lib/page";
import { studio } from "@/lib/studio";
import { ago } from "@/lib/text";

export default async function Ai({ params, searchParams }: Page) {
  const handle = CLUB;
  const q = await searchParams, here = "/account/ai";
  const v = await liveViewer(handle);
  if (v.kind !== "member") return <p className="muted">Members: sign in.</p>;
  const c = await studio(v, "/site/connection");
  const status = c.state === "connected" ? `Connected · ${c.last_used_at ? `last used ${ago(c.last_used_at)}` : "not used yet"}` : c.state === "code_open" ? "Code waiting" : "Not connected";
  return <><p className="mb-3"><L href="/account">Account</L></p><Notice q={q} handle={handle} here={here} /><Title>Connect your AI</Title><p className="label">{status}</p>
    <section className="card p-4 my-3"><p className="label">Where the club&apos;s data lives</p><p className="muted">In the club&apos;s space on BYOAI Studio (db.byoaistudio.com), not on your computer and not inside your AI. The club owns it; the scribe runs it. <strong>Your AI borrows your access:</strong> it sees what you can see, can&apos;t cast votes or post for you, and you can disconnect it any time.</p></section>
    <p className="muted">A connection lasts for one conversation with your AI. For a new conversation, get a new code: it replaces the old connection.</p>
    <ol className="grid gap-3 my-3">
      <li><p className="label">1. Get a code</p><form action={getCode}><Hidden handle={handle} back={here} /><button className="btn btn-ink">{c.state === "connected" ? "Get a new code" : "Get your code"}</button></form></li>
      {q.code && <li><p className="label">2. Give it to your AI</p><pre className="card-lift p-3 whitespace-pre-wrap">{`Connect to my book club.\nCode: ${q.code}\nDocs: https://github.com/1000Problems/readingdocs/blob/main/bookclub/README.md\nBefore you run anything, tell me in one sentence what you'll send and where. Keep the key in this chat only; don't save it anywhere.`}</pre><p className="muted">Your AI will ask before it contacts db.byoaistudio.com, and your computer may ask you to approve it. That&apos;s expected: it&apos;s sending this code to the club&apos;s database to get a key.</p></li>}
      <li className="muted">3. Your AI says hello</li></ol>
    {c.state === "connected" && <form action={disconnectAi}><Hidden handle={handle} back={here} /><button className="btn">Disconnect</button></form>}</>;
}
