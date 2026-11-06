import { notFound } from "next/navigation";
import { CLUB } from "@/lib/club";
import { addRoster, invite, removeMember, saveMemberSheet } from "@/lib/actions";
import { Hidden, L, load, Notice, Title, type Page } from "@/lib/page";

export default async function AdminMembers({ searchParams }: Page) {
  const handle = CLUB, q = await searchParams, here = "/admin/members";
  const { rows } = await load(handle, (x) => x.kind === "member" ? [{ sql: "select role from me" },
    { sql: "select slug, name, status, linked from members_roster order by status, name" },
    { sql: "select slug, label, birthday::text as birthday, birthday_text from sheet_members" }] : [{ sql: "select 1" }]);
  if (rows?.[0]?.[0]?.role !== "scribe") notFound();
  const sheet = new Map(rows[2].map((m) => [m.slug, m]));
  return <><Notice q={q} handle={handle} here={here} /><Title>Members</Title><p className="my-3"><L href="/admin">Admin</L></p>
    {q.invite && <p className="card-lift p-3 my-3 break-all">Text this link: {q.invite}</p>}
    <section className="card p-4 mt-3"><p className="label">Roster</p><ul className="grid gap-3 mt-2">{rows[1].map((m) => { const s = sheet.get(m.slug); return <li key={m.slug} className="grid gap-2">
      <span className="flex justify-between items-center gap-2"><span>{m.name} <span className="faint">{m.status}{m.linked ? "" : " · not joined"}</span></span>
        {!m.linked && m.status === "active" && <form action={invite}><Hidden handle={handle} back={here} /><input type="hidden" name="slug" value={m.slug} /><input type="hidden" name="name" value={m.name} /><button className="btn">Copy invite link</button></form>}
        {m.linked && <form action={removeMember}><Hidden handle={handle} back={here} /><input type="hidden" name="slug" value={m.slug} /><button className="btn btn-ghost">Remove</button></form>}</span>
      <details><summary className="label">Sheet label and birthday</summary><form action={saveMemberSheet} className="grid gap-2 mt-2"><Hidden handle={handle} back={here} /><input type="hidden" name="slug" value={m.slug} />
        <label className="label">Label<input className="field" name="sheet_label" defaultValue={s?.label ?? ""} /></label>
        <label className="label">Birthday<input className="field" type="date" name="birthday" defaultValue={s?.birthday ?? ""} /></label>
        <label className="label">Or, with no date<input className="field" name="birthday_text" defaultValue={s?.birthday_text ?? ""} placeholder="TBD" /></label>
        <button className="btn">Save</button></form></details></li>; })}</ul>
      <form action={addRoster} className="flex gap-2 mt-3"><Hidden handle={handle} back={here} /><input className="field" name="name" placeholder="Name" required aria-label="New member name" /><button className="btn">Add</button></form></section></>;
}
