import { CLUB } from "@/lib/club";
import { addRoster, invite, removeMember, saveSettings } from "@/lib/actions";
import { base, Hidden, L, load, MembersOnly, Notice, Title, type Page } from "@/lib/page";
import { studio } from "@/lib/studio";
import { Md } from "@/lib/text";

export default async function Club({ params, searchParams }: Page) {
  const handle = CLUB;
  const q = await searchParams, b = base(handle), here = `${b}/club`;
  const { v, rows, signedIn } = await load(handle, (x) => [{ sql: "select * from club" }, ...(x.kind === "member" ? [{ sql: "select role from me" }, { sql: "select slug, name, status, linked from members_roster order by status, name" }] : [])]);
  if (!rows) return <MembersOnly />;
  const c = rows[0][0], scribe = rows[1]?.[0]?.role === "scribe";
  void (v.kind === "member" && scribe && await studio(v, "/club/members").catch(() => null));
  const Box = ({ n, t }: { n: string; t: string }) => <label className="flex gap-2 items-center"><input type="checkbox" name={n} defaultChecked={c[n]} />{t}</label>;
  return <><Notice q={q} handle={handle} here={here} /><Title>{c.name}</Title>{c.about && <Md text={c.about} />}
    {q.invite && <p className="card-lift p-3 my-3 break-all">Text this link: {q.invite}</p>}
    <p className="my-3 flex gap-3"><L href={`${b}/members`}>Members</L>{signedIn && <L href={`${b}/club/ai`}>Connect your AI</L>}</p>
    {signedIn && <form method="post" action="/auth/signout"><button className="btn btn-ghost">Sign out</button></form>}
    {scribe && <><form action={saveSettings} className="card p-4 grid gap-2 mt-3"><p className="label">Settings</p><Hidden handle={handle} back={here} />
      <label className="label">Visibility<select className="field" name="visibility" defaultValue={c.visibility}><option value="public">Public</option><option value="members">Members only</option></select></label>
      <Box n="public_talk" t="Visitors can read chat" /><Box n="public_scores" t="Visitors can see scores" /><Box n="talk_visible_to_ai" t="AIs can read private talk" />
      <label className="label">Score reveal<select className="field" name="score_reveal" defaultValue={c.score_reveal}><option value="open">Open</option><option value="together">Together</option></select></label>
      <label className="label">Slate size<input className="field" type="number" name="slate_size" min={2} max={8} defaultValue={c.slate_size} /></label><button className="btn btn-ink">Save</button></form>
    <section className="card p-4 mt-3"><p className="label">Roster</p><ul className="grid gap-2 mt-2">{rows[2].map((m) => <li key={m.slug} className="flex justify-between items-center gap-2"><span>{m.name} <span className="faint">{m.status}{m.linked ? "" : " · not joined"}</span></span>
      {!m.linked && m.status === "active" && <form action={invite}><Hidden handle={handle} back={here} /><input type="hidden" name="slug" value={m.slug} /><input type="hidden" name="name" value={m.name} /><button className="btn">Copy invite link</button></form>}
      {m.linked && <form action={removeMember}><Hidden handle={handle} back={here} /><input type="hidden" name="slug" value={m.slug} /><button className="btn btn-ghost">Remove</button></form>}</li>)}</ul>
      <form action={addRoster} className="flex gap-2 mt-3"><Hidden handle={handle} back={here} /><input className="field" name="name" placeholder="Name" required aria-label="New member name" /><button className="btn">Add</button></form></section></>}</>;
}
