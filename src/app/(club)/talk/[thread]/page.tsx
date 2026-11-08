import { CLUB } from "@/lib/club";
import { hidePost, post } from "@/lib/actions";
import { base, Hidden, load, MembersOnly, Notice, Title, type Page } from "@/lib/page";
import { ago, Md } from "@/lib/text";

export default async function Thread({ params, searchParams }: Page) {
  const handle = CLUB; const { thread } = await params;
  const q = await searchParams, here = `${base(handle)}/talk/${thread}`;
  const { rows, signedIn } = await load(handle, (v) => [
    { sql: "select title from threads where slug = $1", params: [thread] },
    { sql: "select id, name, body, created_at, edited_at, hidden from thread_posts where thread = $1 order by created_at", params: [thread] },
    ...(v.kind === "member" ? [{ sql: "select role from me" }] : []),
  ]);
  if (!rows) return <MembersOnly />;
  return <><Notice q={q} handle={handle} here={here} /><Title>{rows[0][0]?.title ?? "Talk"}</Title>
    {rows[1].map((p) => <article key={p.id} className="mb-3" style={p.hidden ? { opacity: .5 } : undefined}><p className="label">{p.name} <span className="faint">· {ago(p.created_at)}{p.edited_at ? " · edited" : ""}</span></p><Md text={p.body} />
      {rows[2]?.[0]?.role === "scribe" && !p.hidden && <form action={hidePost}><Hidden handle={handle} back={here} /><input type="hidden" name="id" value={p.id} /><button className="btn btn-ghost">Hide</button></form>}</article>)}
    {signedIn && <form action={post} className="grid gap-2"><Hidden handle={handle} back={here} /><input type="hidden" name="thread" value={thread} /><textarea className="field" name="body" maxLength={4000} required aria-label="Post" /><button className="btn btn-ink">Post</button></form>}</>;
}
