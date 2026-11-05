import { saveScore } from "@/lib/actions";
import { base, Hidden, load, MembersOnly, Notice, Title, type Page } from "@/lib/page";

export default async function Score({ params, searchParams }: Page) {
  const { handle, slug } = await params;
  const q = await searchParams, here = `${base(handle)}/m/${slug}/score`;
  const { rows, signedIn } = await load(handle, () => [{ sql: "select title from meeting_cards where slug = $1", params: [slug] }, { sql: "select attendance, score, word from votes where meeting = $1 and member = (select slug from me)", params: [slug] }]);
  if (!rows) return <MembersOnly />;
  if (!signedIn) return <p className="muted">Members: sign in.</p>;
  const mine = rows[1][0];
  return <><Notice q={q} handle={handle} here={here} /><Title>Score {rows[0][0]?.title}</Title>
    <form action={saveScore} className="grid gap-3"><Hidden handle={handle} back={here} /><input type="hidden" name="meeting" value={slug} />
      <label className="label">Score, 0–10<input className="field" name="score" inputMode="decimal" pattern="(10(\.0{1,3})?|\d(\.\d{1,3})?)" defaultValue={mine?.score ?? ""} /></label>
      <label className="label">One word<input className="field" name="word" maxLength={40} defaultValue={mine?.word ?? ""} /></label>
      <label className="label">How it went<select className="field" name="attendance" defaultValue={mine?.attendance ?? "voted"}>
        <option value="voted">Read it</option><option value="partial">Read part</option><option value="unfinished">Unfinished</option><option value="missed">Missed</option><option value="out">Out</option></select></label>
      <label className="label">Reason, if you missed<input className="field" name="miss_reason" /></label>
      <button className="btn btn-ink btn-lg">Save</button></form></>;
}
