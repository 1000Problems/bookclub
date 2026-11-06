import { notFound } from "next/navigation";
import { CLUB } from "@/lib/club";
import { saveMeetingSheet } from "@/lib/actions";
import { Hidden, load, Notice, Title, type Page } from "@/lib/page";

export default async function AdminMeetings({ searchParams }: Page) {
  const handle = CLUB, q = await searchParams;
  const { rows } = await load(handle, (x) => x.kind === "member" ? [{ sql: "select role from me" },
    { sql: "select slug, number, title, status, title_color, title_bold, no_score from sheet_meetings order by slug desc" }] : [{ sql: "select 1" }]);
  if (rows?.[0]?.[0]?.role !== "scribe") notFound();
  const all = rows[1], m = all.find((x) => x.slug === q.m) ?? all[0];
  const here = `/admin/meetings?m=${m?.slug ?? ""}`;
  // Default for a meeting with no number: one more than the closest numbered meeting before it.
  const prev = m && all.slice(all.indexOf(m) + 1).find((x) => x.number !== null);
  return <><Notice q={q} handle={handle} here={here} /><Title>Meetings</Title>
    <form method="get" className="card p-4 flex gap-2 items-end"><label className="label flex-1">Meeting<select className="field" name="m" defaultValue={m?.slug}>{all.map((x) => <option key={x.slug} value={x.slug}>{x.slug} {x.title ?? `(${x.status})`}</option>)}</select></label><button className="btn">Open</button></form>
    {m && <form action={saveMeetingSheet} className="card p-4 grid gap-2 mt-3"><Hidden handle={handle} back={here} /><input type="hidden" name="meeting" value={m.slug} />
      <p className="label">{m.title ?? m.slug}</p>
      <label className="label">Meeting number<input className="field" type="number" name="number" defaultValue={m.number ?? (prev ? prev.number + 1 : "")} /></label>
      <label className="label">Title color<select className="field" name="title_color" defaultValue={m.title_color}><option value="blue">Blue</option><option value="red">Red</option></select></label>
      <label className="flex gap-2 items-center"><input type="checkbox" name="title_bold" defaultChecked={m.title_bold} />Bold title</label>
      <label className="flex gap-2 items-center"><input type="checkbox" name="no_score" defaultChecked={m.no_score} />No score this month</label>
      <button className="btn btn-ink">Save</button></form>}</>;
}
