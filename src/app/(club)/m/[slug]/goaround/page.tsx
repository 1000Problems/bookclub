import { CLUB } from "@/lib/club";
import { saveTable } from "@/lib/actions";
import { base, Hidden, load, MembersOnly, Notice, Title, type Page } from "@/lib/page";

export default async function Goaround({ params, searchParams }: Page) {
  const handle = CLUB; const { slug } = await params;
  const q = await searchParams, here = `${base(handle)}/m/${slug}/goaround`;
  const { rows } = await load(handle, (v) => v.kind === "member" ? [
    { sql: "select member, name, has_entry from scoring_progress($1)", params: [slug] },
    { sql: "select member from rsvp_board where meeting = $1 and status = 'yes'", params: [slug] },
    { sql: "select member, score, word, attendance from votes where meeting = $1", params: [slug] },
    { sql: "select role from me" },
    { sql: "select member, sheet_code from sheet_votes where meeting = $1 and sheet_code in ('n/a', 'hbb', 'no vote')", params: [slug] },
  ] : [{ sql: "select 1" }]).catch((e) => ({ rows: [[], [], []], error: e.message as string }) as never);
  if (!rows) return <MembersOnly />;
  if (rows.length < 3) return <p className="muted">Members: sign in.</p>;
  const yes = new Set(rows[1].map((r) => r.member)), seen = new Map(rows[2].map((r) => [r.member, r]));
  const scribe = rows[3]?.[0]?.role === "scribe", codes = new Map((rows[4] ?? []).map((r) => [r.member, r.sheet_code]));
  const list = [...rows[0]].sort((a, b) => Number(yes.has(b.member)) - Number(yes.has(a.member)));
  return <><Notice q={q} handle={handle} here={here} /><Title>Go-around</Title>
    <form action={saveTable} className="grid gap-3"><Hidden handle={handle} back={here} /><input type="hidden" name="meeting" value={slug} />
      {list.map((m) => { const s = seen.get(m.member); return <fieldset key={m.member} className="card-lift p-3 grid gap-2">
        <legend className="label">{m.name} {m.has_entry && !s && "entered ✓"}</legend>
        <input type="hidden" name="member" value={m.member} />
        <div className="flex gap-2"><input className="field" name={`s:${m.member}`} inputMode="decimal" placeholder="Score" defaultValue={s?.score ?? ""} aria-label={`${m.name} score`} />
          <input className="field" name={`w:${m.member}`} placeholder="Word" defaultValue={s?.word ?? ""} aria-label={`${m.name} word`} /></div>
        <select className="field" name={`a:${m.member}`} defaultValue={codes.has(m.member) ? `code:${codes.get(m.member)}` : s?.attendance ?? ""} aria-label={`${m.name} attendance`}><option value="">—</option><option value="voted">Read it</option><option value="partial">Part</option><option value="unfinished">Unfinished</option><option value="missed">Missed</option><option value="out">Out</option>{scribe && <><option value="code:n/a">n/a</option><option value="code:hbb">hbb</option><option value="code:no vote">no vote</option></>}</select>
      </fieldset>; })}
      <fieldset className="card-lift p-3 grid gap-2"><legend className="label">+ guest</legend>
        <input className="field" name="guest" placeholder="Name" /><input className="field" name="gscore" inputMode="decimal" placeholder="Score" /><input className="field" name="gword" placeholder="Word" /></fieldset>
      <button className="btn btn-ink btn-lg">Save all</button></form></>;
}
