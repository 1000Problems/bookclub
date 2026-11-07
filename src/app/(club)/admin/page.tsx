import { notFound } from "next/navigation";
import { CLUB } from "@/lib/club";
import { saveCorrection, saveMeetingAdmin, saveSheetCells, saveVoteSheet } from "@/lib/actions";
import { FiveBooks } from "@/components/NextMeeting";
import { MonthField } from "@/components/MonthField";
import { whenLong } from "@/lib/text";
import { Hidden, L, load, Notice, type Page } from "@/lib/page";
import { sql, type Row } from "@/lib/studio";
import { AdminTabs, HostSelect, monthName, SheetFields, toHm, toYmd, workedOutNumber } from "./parts";

const addMonths = (slug: string, n: number) => { const [y, m] = slug.slice(0, 7).split("-").map(Number), d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const FUTURE_MONTHS = 3;

/** Every month in one editor, past and future: pick the month, change the row, save. Like the sheet. */
export default async function Meetings({ searchParams }: Page) {
  const handle = CLUB, q = await searchParams;
  // Admin views are refused outright for anyone else, so check before asking for them.
  const who = await load(handle, (x) => x.kind === "member" ? [{ sql: "select role from me" }, { sql: "select slug from next_meeting" }, { sql: "select slug, status, number from meetings order by slug" }] : [{ sql: "select 1" }]);
  if (who.rows?.[0]?.[0]?.role !== "scribe" || who.v.kind !== "member") notFound();
  const v = who.v, months = who.rows![2], first: string = months[0]?.slug ?? toYmd.format(new Date()).slice(0, 7), last: string = months.at(-1)?.slug ?? first;
  const nextSlug: string | undefined = who.rows![1][0]?.slug, opening = nextSlug ?? months.findLast((m) => m.status === "planned")?.slug ?? last;
  const max = addMonths(last, FUTURE_MONTHS);
  const slug = q.m && /^\d{4}-\d{2}[a-z]?$/.test(q.m) && q.m.slice(0, 7) >= first.slice(0, 7) && q.m.slice(0, 7) <= max ? q.m : opening, here = `/admin?m=${slug}`, year = slug.slice(0, 4);
  const { rows } = await sql(v, [
    { sql: "select slug, name, status from members_roster order by name" },
    { sql: "select * from sheet_meetings where slug = $1", params: [slug] },
    { sql: "select host, meets_at, venue_label, food, bring from meetings where slug = $1", params: [slug] },
    { sql: "select at_meeting, status from slates where at_meeting = $1", params: [slug] },
    { sql: "select b.title, b.author from candidates c join books b on b.slug = c.book where c.slate = $1 order by c.added_at", params: [slug] },
    { sql: "select v.meeting, v.member, v.name, v.attendance, v.score, v.word, v.corrected, v.entered_by, s.comment, s.miss_reason, s.sheet_code, s.sheet_vote, s.sheet_comment from meeting_votes v join sheet_votes s on s.meeting = v.meeting and s.member = v.member where v.meeting = $1 order by v.name", params: [slug] },
    { sql: "select slug, title, host_name, status, club_score from meeting_cards where year = $1 order by slug desc", params: [Number(year)] },
  ]);
  const roster = rows[0], m = rows[1][0] as Row | undefined, nx = rows[2][0] as Row | undefined, slate = rows[3][0] as Row | undefined, ballot = rows[4], votes = rows[5], yearRows = rows[6];
  const turnout: number = slate ? (await sql(v, [{ sql: "select cast_count from ballot_turnout($1)", params: [slug] }]).catch(() => null))?.rows[0]?.[0]?.cast_count ?? 0 : 0;
  const drafting = !slate || slate.status === "drafting", met = m?.status === "met", skipped = m?.status === "skipped";
  const numberHint = workedOutNumber(months, slug);
  const H = ({ sec }: { sec: string }) => <Hidden handle={handle} back={`${here}#${sec}`} />;

  return <><div className="ad-head"><h1>Admin</h1><span>Only admins can open this page.</span></div>
    <AdminTabs on="meetings" />
    <Notice q={q} handle={handle} here={here} />

    <section id="month" className="ad-sec ad-next">
      <div className="ad-eye"><span>Meeting</span><span>{slug === nextSlug ? "Next meeting" : met ? "Past month" : m ? (skipped ? "Skipped" : "Planned") : "Not set up yet: Save creates it"}</span></div>
      <div className="nm-pickrow"><MonthField value={slug} min={first.slice(0, 7)} max={max} /><label className="ad-c"><input form="meeting-form" type="checkbox" name="skip" defaultChecked={skipped} />Skip this month</label></div>
      <form key={slug} id="meeting-form" action={saveMeetingAdmin} className="ad-form"><H sec="month" /><input type="hidden" name="meeting" value={slug} /><input type="hidden" name="exists" value={m ? "1" : ""} /><input type="hidden" name="book" value={m?.book ?? ""} /><input type="hidden" name="status" value={m?.status ?? "planned"} />
        {m?.title && <p className="ad-note"><L href={`/m/${slug}`}>{m.title}</L>{m.author ? ` · ${m.author}` : ""}</p>}
        <label className="nm-when"><div className="sc-when">{nx?.meets_at ? whenLong(nx.meets_at) : "Date not set yet"}</div><input type="datetime-local" name="meets_at" defaultValue={nx?.meets_at ? `${toYmd.format(new Date(nx.meets_at))}T${toHm.format(new Date(nx.meets_at))}` : ""} aria-label="When" /></label>
        <div className="nm-four"><HostSelect people={roster} value={nx?.host} />
          <label className="sc-f"><span>Where</span><input name="venue_label" defaultValue={nx?.venue_label ?? ""} placeholder="Whose house?" /></label><label className="sc-f"><span>Food</span><input name="food" defaultValue={nx?.food ?? ""} placeholder="What's cooking?" /></label><label className="sc-f"><span>Bring</span><input name="bring" defaultValue={(nx?.bring ?? []).join(", ")} placeholder="Bread, wine…" /></label></div>
        <label className="ad-l">Notes<textarea className="ad-i" name="notes" rows={2} defaultValue={m?.notes ?? ""} placeholder="Date, place, food…" /></label>
        {!met && <>        {slate?.status === "picked" ? <div className="nm-panel"><div className="nm-panel-h"><b>The five books</b><span>Picked</span></div><div className="nm-rows">{ballot.map((b, i) => <div key={b.title} className="nm-row"><span className="nm-n">{i + 1}</span><span className="nm-t"><b>{b.title}</b>{b.author && <span>— {b.author}</span>}</span></div>)}</div></div>
          : <><input type="hidden" name="slate_status" value={slate?.status ?? ""} /><input type="hidden" name="five_was" value={[0, 1, 2, 3, 4].map((i) => `${ballot[i]?.title ?? ""}|${ballot[i]?.author ?? ""}`).join("¦")} />
            <FiveBooks key={slug} books={ballot.map((b) => ({ title: b.title, author: b.author }))} title="The five books" note={slate?.status === "voting" ? `posted · ${turnout} ranked` : slate?.status === "closed" ? "voting closed" : "the host can change these too"}>
              <div className="nm-foot"><button name="post" value="1" className="ad-b ad-ink">Post the five</button>{!drafting && <span>Changing a book takes the five back to drafting{turnout ? ` and clears ${turnout} ranking${turnout === 1 ? "" : "s"}` : ""}. Post again to reopen voting.</span>}</div></FiveBooks></>}</>}
        <details><summary className="ad-tog">Sheet details <span className="ad-note">· meeting number, Goodreads, title color</span></summary><SheetFields m={m} book={!!m?.book} numberHint={met ? null : numberHint} /></details>
        <div className="ad-line"><button className="ad-b ad-ink">Save meeting</button>{m && nx?.meets_at && <a className="ad-b" href={`/m/${slug}/calendar`}>Add to calendar</a>}</div></form>
      {m && <details><summary className="ad-tog">Original sheet cells <span className="ad-note">· as typed in Excel. These win over the fields above in the export; blank uses the site&apos;s value.</span></summary>
        <form action={saveSheetCells} className="ad-form"><H sec="fix" /><input type="hidden" name="meeting" value={m.slug} />
          <div className="ad-fields">{([["sheet_number", "Number"], ["sheet_title", "Title"], ["sheet_host", "Host"], ["sheet_score", "Score"], ["sheet_grx2", "GRx2"]] as const).map(([k, t]) => <label key={k} className="ad-l">{t}<input className="ad-i" name={k} defaultValue={m[k] ?? ""} /></label>)}</div>
          <label className="ad-l">Voting (hidden column)<textarea className="ad-i" name="sheet_voting" rows={2} defaultValue={m.sheet_voting ?? ""} /></label>
          <label className="ad-l">Other cells (JSON)<textarea className="ad-i" name="sheet_cells" rows={2} defaultValue={m.sheet_cells ? JSON.stringify(m.sheet_cells) : ""} /></label>
          <button className="ad-b">Save sheet cells</button></form></details>}
    </section>

    {m?.book && <section id="scores" className="ad-sec">
      <div className="ad-eye"><span>Scores and words</span><span>Only an admin can change entries after reveal.</span></div>
      <div className="ad-list">{votes.map((x) => { const scoredRow = x.attendance === "voted" || x.attendance === "partial"; const label = scoredRow ? "Scored" : x.attendance === "unfinished" ? "Didn't finish" : "Missed"; return <details key={x.member} className="ad-row"><summary><span className="ad-who"><b>{x.name}{x.corrected && <i className="ad-dot" title="Corrected by an admin" />}</b></span><b className="ad-score">{x.score ?? "—"}</b><span className="ad-word">{scoredRow ? x.word ?? "" : x.attendance === "missed" ? `missed · ${x.miss_reason ?? "no reason"}` : label}</span></summary>
        <form action={saveCorrection} className="ad-form"><H sec="fix" /><input type="hidden" name="meeting" value={x.meeting} /><input type="hidden" name="member" value={x.member} />
          <label className="ad-l">Status<select className="ad-i" name="status" defaultValue={label}><option>Scored</option><option>Missed</option><option>Didn&apos;t finish</option></select></label>
          <div className="ad-fields"><label className="ad-l">Score<input className="ad-i" inputMode="decimal" name="score" defaultValue={x.score ?? ""} /></label><label className="ad-l">Word<input className="ad-i" name="word" defaultValue={x.word ?? ""} /></label><label className="ad-l">Comment<input className="ad-i" name="comment" defaultValue={x.comment ?? ""} /></label><label className="ad-l">Reason, if missed<input className="ad-i" name="miss_reason" defaultValue={x.miss_reason ?? ""} /></label></div>
          <div className="ad-line"><button className="ad-b ad-ink">Save correction</button><span className="ad-note">Listed under Score corrections in Club.</span></div></form>
        <form action={saveVoteSheet} className="ad-form"><H sec="fix" /><input type="hidden" name="meeting" value={x.meeting} /><input type="hidden" name="member" value={x.member} />
          <div className="ad-fields"><label className="ad-l">Sheet code<select className="ad-i" name="sheet_code" defaultValue={x.sheet_code ?? ""}><option value="">None</option>{["miss", "---", "n/a", "hbb", "no vote"].map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="ad-l">Vote, as typed<input className="ad-i" name="sheet_vote" defaultValue={x.sheet_vote ?? ""} /></label><label className="ad-l">Comment, as typed<input className="ad-i" name="sheet_comment" defaultValue={x.sheet_comment ?? ""} /></label></div>
          <button className="ad-b">Save sheet cells</button></form></details>; })}{!votes.length && <p className="ad-note">No scores for this month yet.</p>}</div>
      <L className="ad-b" href={`/m/${slug}/goaround`}>Enter scores</L>
    </section>}

    <section id="year" className="ad-sec">
      <div className="ad-eye"><span>{year}</span><span>Tap a month to open it.</span></div>
      <div className="ad-list">{yearRows.map((r) => <L key={r.slug} href={`/admin?m=${r.slug}`} className={`ad-yr${r.slug === slug ? " on" : ""}`}><b>{monthName(r.slug)}{r.slug.length > 7 ? " (second book)" : ""}</b><span>{r.title ?? (r.status === "skipped" ? "Skipped" : "No book yet")}</span><span>{r.host_name ?? "No host"}</span><span>{r.club_score ?? "–"}</span></L>)}</div>
    </section></>;
}
