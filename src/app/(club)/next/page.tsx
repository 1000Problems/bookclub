import { CLUB } from "@/lib/club";
import { addCandidate, closeBallot, dropCandidate, openBallot, pick, reopenBallot, saveLogistics, setMeeting, startSlate } from "@/lib/actions";
import { base, Hidden, load, MembersOnly, Notice, Title, type Page } from "@/lib/page";
import { sql } from "@/lib/studio";
import { viewerFor } from "@/lib/viewer";

export default async function Next({ params, searchParams }: Page) {
  const handle = CLUB;
  const q = await searchParams, here = `${base(handle)}/next`;
  const v0 = await viewerFor(handle);
  if (v0.kind !== "member") return <p className="muted">Members: sign in.</p>;
  const open = (await sql(v0, [{ sql: "select slate from open_actions where kind = 'ballot'" }])).rows[0];
  for (const s of open) await sql(v0, [{ sql: "select close_if_due($1)", params: [s.slate] }]);
  const NEXT = "(select slug from next_meeting)";
  const { rows } = await load(handle, () => [
    { sql: "select slug, role from me" },
    { sql: "select slug, title, host, host_name, meets_at, venue_label, host_line, bring from next_meeting" },
    { sql: `select at_meeting, picks_for, host, host_name, status, picked_book from slates where status <> 'picked' or at_meeting = ${NEXT} order by at_meeting desc limit 1` },
    { sql: "select slate, book, title, author, pitch from slate_cards order by added_at" },
    { sql: `select address, directions, parking from meeting_directions where meeting = ${NEXT}` },
  ]);
  if (!rows) return <MembersOnly />;
  const me = rows[0][0], n = rows[1][0], s = rows[2][0], d = rows[4][0];
  const cards = s ? rows[3].filter((c) => c.slate === s.at_meeting) : [];
  const res = s && ["closed", "picked"].includes(s.status) ? (await sql(v0, [{ sql: "select book, title, points, firsts, place, tied, ballots, eligible from ballot_results where slate = $1 order by place, title", params: [s.at_meeting] }])).rows[0] : [];
  const canRun = me.role === "scribe" || s?.host === me.slug, canEdit = n && (me.role === "scribe" || n.host === me.slug);
  const S = () => <input type="hidden" name="slate" value={s.at_meeting} />;
  return <><Notice q={q} handle={handle} here={here} /><Title>Next</Title>
    {!s && n && (me.role === "scribe" || n.host === me.slug) && <form action={startSlate} className="mb-3"><Hidden handle={handle} back={here} /><input type="hidden" name="meeting" value={n.slug} /><button className="btn btn-ink">Start your slate</button></form>}
    {s && <section className="card p-4 mb-3"><p className="label">Slate · {s.host_name} · {s.status}</p>
      {cards.length === 0 && <p className="muted">Host: pick 5</p>}
      <ul className="grid gap-2 mt-2">{cards.map((c) => <li key={c.book}><span className="serif text-lg">{c.title}</span> <span className="muted">{c.author}</span><p className="muted">{c.pitch}</p>
        {canRun && s.status === "drafting" && <form action={dropCandidate}><Hidden handle={handle} back={here} /><S /><input type="hidden" name="book" value={c.book} /><button className="btn btn-ghost">Remove</button></form>}</li>)}</ul>
      {canRun && s.status === "drafting" && <>
        <form action={addCandidate} className="grid gap-2 mt-3"><Hidden handle={handle} back={here} /><S /><input className="field" name="title" placeholder="Title" required /><input className="field" name="author" placeholder="Author" /><input className="field" name="pitch" maxLength={280} placeholder="One-line pitch" /><button className="btn">Add book</button></form>
        <form action={openBallot} className="mt-3"><Hidden handle={handle} back={here} /><S /><button className="btn btn-ink">Open ballot</button></form></>}
      {canRun && s.status === "voting" && <form action={closeBallot} className="mt-3"><Hidden handle={handle} back={here} /><S /><button className="btn btn-ink">Close</button></form>}
      {me.role === "scribe" && ["voting", "closed"].includes(s.status) && <form action={reopenBallot} className="mt-2"><Hidden handle={handle} back={here} /><S /><button className="btn btn-ghost">Reopen for everyone</button></form>}
      {res.length > 0 && <ol className="mt-3">{res.map((r) => <li key={r.book} className="flex justify-between items-center">{r.title} <span className="mono">{r.points} ({r.firsts})</span>
        {canRun && s.status === "closed" && <form action={pick}><Hidden handle={handle} back="/" /><S /><input type="hidden" name="book" value={r.book} /><button className="btn">Pick</button></form>}</li>)}</ol>}
    </section>}
    {canEdit && <form id="place" action={saveLogistics} className="card p-4 grid gap-2"><p className="label">Time and place</p><Hidden handle={handle} back={here} /><input type="hidden" name="meeting" value={n.slug} />
      <input className="field" name="meets_at" placeholder="2026-12-03 19:00 America/Los_Angeles" defaultValue={n.meets_at ?? ""} aria-label="When" />
      <input className="field" name="venue_label" placeholder="at Kirk's" defaultValue={n.venue_label ?? ""} aria-label="Public place" />
      <input className="field" name="host_line" placeholder="Kirk's making soup" defaultValue={n.host_line ?? ""} aria-label="Host line" />
      <input className="field" name="bring" placeholder="bread, wine" defaultValue={(n.bring ?? []).join(", ")} aria-label="Bring" />
      <input className="field" name="address" placeholder="Address (members only)" defaultValue={d?.address ?? ""} aria-label="Address" />
      <input className="field" name="directions" placeholder="Directions" defaultValue={d?.directions ?? ""} aria-label="Directions" />
      <input className="field" name="parking" placeholder="Parking" defaultValue={d?.parking ?? ""} aria-label="Parking" /><button className="btn btn-ink">Save</button></form>}
    {!n && me.role === "scribe" && <form id="meetings" action={setMeeting} className="card p-4 grid gap-2"><p className="label">Set the next meeting</p><Hidden handle={handle} back={here} />
      <input className="field" name="slug" placeholder="2026-12" required /><input className="field" name="book" placeholder="Book slug" /><input className="field" name="host" placeholder="Host slug" /><button className="btn btn-ink">Save</button></form>}</>;
}
