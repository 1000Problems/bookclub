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
    {c.state === "connected" ? <form action={disconnectAi}><Hidden handle={handle} back={here} /><button className="btn">Disconnect</button></form> : <ol className="grid gap-3">
      <li><p className="label">1. Get your code</p><form action={getCode}><Hidden handle={handle} back={here} /><button className="btn btn-ink">Get your code</button></form></li>
      {q.code && <li><p className="label">2. Give it to your AI</p><pre className="card-lift p-3 whitespace-pre-wrap">{`Connect to my book club.\nCode: ${q.code}\nDocs: https://github.com/1000Problems/readingdocs/blob/main/bookclub/README.md`}</pre></li>}
      <li className="muted">3. Your AI says hello</li></ol>}</>;
}
