import { PageHead } from "@/components/ui";
import { notFound } from "next/navigation";
import { CLUB } from "@/lib/club";
import { deleteEmptyMonth } from "@/lib/actions";
import { FiveBooks } from "@/components/NextMeeting";
import { Hidden, L, load, Notice, type Page } from "@/lib/page";
import { sql, studio, StudioError, type Row } from "@/lib/studio";
import { viewerFor } from "@/lib/viewer";
import { tint } from "@/lib/record";
import { Ledger, type Past, type Person } from "./Ledger";
import { ClubSettings } from "./ClubCards";
import { MemberSheet } from "./MemberSheet";
import { Polls, type AdminPoll, type Voter } from "./Polls";
import { MonthList, type MonthRow } from "./MonthList";
import { Quiet, RecordForm } from "./RecordForm";
import { ini, MONTHS, monthName, short, toHm, toYmd, workedOutNumber } from "./parts";

const addMonths = (slug: string, n: number) => { const [y, m] = slug.slice(0, 7).split("-").map(Number), d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const AHEAD = 3;
const between = (a: string, b: string) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));
const COLOR: Record<string, string> = { plain: "#141413", blue: "oklch(.45 .17 264)", red: "oklch(.52 .19 28)" };
const voteCell = (x: Row) => x.sheet_vote ?? x.sheet_code ?? (x.attendance === "missed" ? "miss" : x.attendance === "out" ? "n/a" : x.attendance === "unfinished" ? "hbb" : x.score != null ? String(Number(x.score)) : "");
const wordCell = (x: Row) => (x.sheet_comment ?? (x.attendance === "voted" || x.attendance === "partial" ? x.word ?? x.comment : x.miss_reason)) ?? "";

/** ADMIN 7a: one page. Members, then every month (4c), then the club. Everything saves as you go. */
export default async function Admin({ searchParams }: Page) {
  const handle = CLUB, q = await searchParams;
  const v = await viewerFor(handle);
  if (v.kind !== "member") notFound();
  // One batch for the whole page. The month comes from ?m=, else the next meeting, else the newest planned or any month.
  // Studio refuses admin views to anyone else, so a refusal here means "not an admin": the not-found page.
  const today = toYmd.format(new Date()).slice(0, 7), want = q.m && /^\d{4}-\d{2}[a-z]?$/.test(q.m) ? q.m : null;
  const PICK = "coalesce($1::text, (select slug from next_meeting), (select max(slug) from meetings where status = 'planned'), (select max(slug) from meetings))";
  // Polls (design 8b) in their own call, so a poll problem never takes Admin down.
  const pollsP = sql(v, [{ sql: "select * from poll_list()" }]).then(async (r) => {
    const polls = r.rows[0] as AdminPoll[], live = polls[0];
    const voters = live ? (await sql(v, [{ sql: "select * from poll_voters($1)", params: [live.id] }])).rows[0] as Voter[] : [];
    return { polls, voters };
  }).catch(() => null);
  const sideP = Promise.all([studio(v, "/club/members").catch(() => ({ members: [] })), studio(v, "/club/invites").catch(() => ({ invites: [] }))]) as Promise<[{ members: Row[] }, { invites: Row[] }]>;
  let rows: Row[][];
  try {
    rows = (await sql(v, [
      { sql: "select role, slug from me" }, { sql: "select slug, meets_at from next_meeting" }, { sql: "select slug, status, number from meetings order by slug" },
      { sql: `select m.slug from meetings m left join sheet_meetings s on s.slug = m.slug where m.slug > $1 and m.book is null and m.host is null and m.meets_at is null
        and m.venue_label is null and m.food is null and coalesce(cardinality(m.bring), 0) = 0 and m.cohost is null and m.notes is null and coalesce(s.sheet_cells, '{}'::jsonb) = '{}'::jsonb
        and not exists (select 1 from votes x where x.meeting = m.slug) and not exists (select 1 from candidates c where c.slate = m.slug)`, params: [today] },
      { sql: `select ${PICK} as slug`, params: [want] },
      { sql: "select slug, name, status from members_roster order by name" },
      { sql: `select * from sheet_meetings where slug = ${PICK}`, params: [want] },
      { sql: `select host, meets_at, venue_label, food, bring, cohost from meetings where slug = ${PICK}`, params: [want] },
      { sql: `select at_meeting, status, case when status in ('voting', 'closed') then (select cast_count from ballot_turnout(at_meeting)) end as turnout from slates where at_meeting = ${PICK}`, params: [want] },
      { sql: `select b.title, b.author from candidates c join books b on b.slug = c.book where c.slate = ${PICK} order by c.added_at`, params: [want] },
      { sql: `select member, attendance, score, word, comment, miss_reason, sheet_code, sheet_vote, sheet_comment from sheet_votes where meeting = ${PICK}`, params: [want] },
      { sql: "select c.slug, c.number, c.title, c.author, c.host_name, c.status, c.club_score, s.no_score from meeting_cards c join meeting_sheet s on s.slug = c.slug order by c.slug desc" },
      { sql: "select * from club" },
      { sql: "select b.slug, b.title, b.author from later l join books b on l.subject = 'b:' || b.slug where l.kind = 'isbn' and l.done_at is null order by b.title" },
      { sql: "select count(*) filter (where isbn is not null)::int as matched, count(*)::int as total from books" },
      { sql: "select meeting, name, score, word, entered_by from meeting_votes where corrected order by meeting desc limit 12" },
      { sql: "select v.member, extract(year from min(m.month))::int as y0, extract(year from max(m.month))::int as y1, count(v.score)::int as n, round(avg(v.score), 2)::text as a from votes v join meetings m on m.slug = v.meeting group by v.member" },
      { sql: "select slug, label, birthday::text as birthday, birthday_text from sheet_members" },
      { sql: `select cover_url from books where slug = (select book from meetings where slug = ${PICK})`, params: [want] },
    ])).rows;
  } catch (e) { if (e instanceof StudioError) notFound(); throw e; }
  if (rows[0][0]?.role !== "scribe") notFound();
  const months = rows[2], nextSlug: string | undefined = rows[1][0]?.slug;
  // Upcoming months: the next three by default; + and − change how many (?ahead=). Months with data always show.
  const ahead = Math.min(Math.max(Number.isInteger(Number(q.ahead)) && q.ahead !== "" && q.ahead != null ? Number(q.ahead) : AHEAD, 0), 240);
  const blank = new Set(rows[3].map((r) => r.slug)), lastData = months.filter((x) => !blank.has(x.slug)).at(-1)?.slug ?? today;
  const end = [addMonths(today, ahead), lastData].sort().at(-1)!;
  const withAhead = (n: number) => (n === AHEAD ? "" : `ahead=${n}`), aq = withAhead(ahead), link = (s: string) => `/admin?m=${s}${aq ? `&${aq}` : ""}`;
  const slug: string = rows[4][0]?.slug ?? today, here = link(slug);
  const [signIns, invites] = await sideP;
  const pollData = await pollsP;
  const roster = rows[5], m = rows[6][0] as Row | undefined, nx = rows[7][0] as Row | undefined, slate = rows[8][0] as Row | undefined, ballot = rows[9], votes = rows[10], all = rows[11];
  const club = rows[12][0], unmatched = rows[13], counts = rows[14][0], corrected = rows[15], stats = new Map(rows[16].map((r) => [r.member, r])), sheetMembers = rows[17], coverOverride: string = rows[18][0]?.cover_url ?? "";
  const meSlug: string = rows[0][0].slug, nextAt = rows[1][0]?.meets_at;

  // Members (7a): the ledger. Studio's sign-ins and open invites, joined to the roster.
  const signIn = new Map(signIns.members.map((x) => [x.slug, x])), openInv = new Map(invites.invites.filter((x) => !x.used_at && !x.revoked_at && new Date(x.expires_at) > new Date()).map((x) => [x.member_slug, x]));
  const admins = signIns.members.filter((x) => x.role === "scribe").length;
  const statLine = (slug: string, past = false) => { const x = stats.get(slug); return x ? (past ? `${x.y0}–${x.y1} · ${x.n} books · avg ${Number(x.a).toFixed(2)}` : `Since ${x.y0} · ${x.n} books${x.a ? ` · avg ${Number(x.a).toFixed(2)}` : ""}`) : "No scores yet"; };
  const people: Person[] = roster.filter((p) => p.status === "active" || p.status === "guest").map((p) => { const si = signIn.get(p.slug), inv = openInv.get(p.slug);
    return { slug: p.slug, name: p.name, ini: ini(p.name), dot: tint(p.name, 0.85, 0.08), sub: statLine(p.slug), self: p.slug === meSlug, admin: si?.role === "scribe", signedIn: si ? short(si.joined) : null,
      invite: inv ? { id: String(inv.id), url: inv.url ?? null, expires: short(inv.expires_at) } : null }; });
  const past: Past[] = roster.filter((p) => p.status === "alumni").map((p) => ({ slug: p.slug, name: p.name, ini: ini(p.name), dot: tint(p.name, 0.85, 0.08), sub: statLine(p.slug, true) }));
  const nIn = people.filter((p) => p.signedIn).length, nInv = people.filter((p) => !p.signedIn && p.invite).length;
  const memSummary = `${people.length} active · ${nIn} signed in · ${nInv} invite${nInv === 1 ? "" : "s"} out · ${people.length - nIn - nInv} not yet`;
  const sumLine = `${people.length} members${nextAt ? ` · next meeting ${new Date(nextAt).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "long", month: "long", day: "numeric" })}` : ""} · everything saves as you go`;
  const turnout: number = slate?.turnout ?? 0;
  const card = all.find((r) => r.slug === slug) as Row | undefined;

  // The list: every month the club has, plus empty months up to three past the last one.
  const have = new Set(all.map((r) => r.slug)), yearAgo = addMonths(today, -12);
  const extra: Row[] = [];
  for (let s = today; s <= end; s = addMonths(s, 1)) if (!have.has(s)) extra.push({ slug: s, status: "empty" });
  const list: MonthRow[] = [...extra, ...all.filter((r) => r.slug.slice(0, 7) <= end)].sort((a, b) => (a.slug < b.slug ? 1 : -1)).map((r) => {
    const upcoming = r.status === "planned" || r.status === "empty", skip = r.status === "skipped", next = r.slug === nextSlug;
    const needs = r.status === "met" && !r.no_score && r.slug >= yearAgo && (!r.title || r.club_score == null);
    return { slug: r.slug, n: r.number != null ? String(r.number) : "", mon: MONTHS[Number(r.slug.slice(5, 7)) - 1].slice(0, 3) + (r.slug.length > 7 ? "²" : ""), next, upcoming, needs, empty: !r.title,
      title: skip ? "Skipped" : r.title ?? (next ? "Ballot open" : upcoming ? "Not set up yet" : "Book not entered"),
      sub: [r.host_name, r.title ? r.author : skip ? "" : r.status === "empty" ? "Planned" : r.status === "met" ? "Met" : "Planned"].filter(Boolean).join(" · "),
      score: r.no_score ? "--" : r.club_score != null ? Number(r.club_score).toFixed(2) : "" };
  });
    // − only on the furthest month, and only when it holds nothing. A saved blank month is deleted; a placeholder just hides.
  const shrink = end > today && (!have.has(end) || blank.has(end)) ? { slug: end, saved: have.has(end), href: `/admin?m=${slug <= addMonths(end, -1) ? slug : addMonths(end, -1)}${withAhead(between(today, end) - 1) ? `&${withAhead(between(today, end) - 1)}` : ""}` } : null;
  const grow = { label: monthName(addMonths(end, 1)), href: `/admin?m=${addMonths(end, 1)}&ahead=${between(today, end) + 1}` };
  const i = list.findIndex((r) => r.slug === slug), older = list[i + 1], newer = list[i - 1];

  const met = m?.status === "met", status = m?.status === "skipped" ? "skipped" : met && m?.no_score ? "noscore" : slug === nextSlug ? "next" : m?.status ?? "planned";
  const statusLabel = { met: "Met", next: "Next", noscore: "No score", skipped: "Skipped", planned: "Planned" }[status as string];
  const numberHint = met || status === "skipped" ? null : workedOutNumber(months, slug);
  const score = m?.no_score ? "--" : card?.club_score != null ? Number(card.club_score).toFixed(2) : "–";
  const byMember = new Map(votes.map((x) => [x.member, x]));
  const cells = (m?.sheet_cells ?? {}) as Record<string, string>, hasCells = (p: Row) => byMember.has(p.slug) || cells[`${p.slug}.vote`] != null || cells[`${p.slug}.comment`] != null;
  const shown = roster.filter((p) => p.status === "active" || hasCells(p)), quiet = roster.filter((p) => p.status === "alumni" && !hasCells(p));
  const day = nx?.meets_at ? toYmd.format(new Date(nx.meets_at)) : "", time = nx?.meets_at ? toHm.format(new Date(nx.meets_at)) : "";
  const memberRow = (p: Row) => { const x = byMember.get(p.slug), v0 = x ? voteCell(x) : cells[`${p.slug}.vote`] ?? "", c0 = x ? wordCell(x) : cells[`${p.slug}.comment`] ?? "";
    return <div key={p.slug} className={p.status !== "active" ? "past" : undefined}>
      <span className="am-who">{p.name}{p.status !== "active" && <i>retired</i>}</span>
      <input type="hidden" name="vm" value={p.slug} /><input type="hidden" name={`v0:${p.slug}`} value={v0} /><input type="hidden" name={`c0:${p.slug}`} value={c0} />
      <input name={`v:${p.slug}`} defaultValue={v0} list="am-codes" placeholder="vote" aria-label={`${p.name} vote`} className="am-v" />
      <input name={`c:${p.slug}`} defaultValue={c0} placeholder="word or comment" aria-label={`${p.name} word`} /></div>; };
  const subline = m?.title ? `${m.title}${m.author ? ` · ${m.author}` : ""}${m.host_name ? ` · hosted by ${m.host_name}` : ""}` : m?.host_name ? `Hosted by ${m.host_name} · book not picked yet` : m ? (status === "skipped" ? "The club didn't meet." : "Nothing entered yet.") : "Not set up yet. Save creates it.";
  const Cell = ({ col, k, children, wide }: { col: string; k: string; children: React.ReactNode; wide?: boolean }) => <label className={`am-cell${wide ? " wide" : ""}`}><span><i>{col}</i>{k}</span>{children}</label>;

  return <><PageHead title="Admin" sub={sumLine}
      right={<nav className="a7-jump" aria-label="Admin sections"><a href="#members">Members</a><a href="#meetings">Meetings</a><a href="#club">Club</a></nav>} />
    <Notice q={q} handle={handle} here={here} />
    <Ledger handle={handle} people={people} past={past} admins={admins} summary={memSummary} month={monthName(today)} />

    <div id="meetings" className="a7-sec"><b>Meetings</b><span>Every month in the record. Pick one on the left; type anywhere on the right.</span></div>
    <div className="am-grid">
      <MonthList rows={list} on={slug} link={aq} grow={grow} shrink={shrink} handle={handle} remove={deleteEmptyMonth} />

      <RecordForm key={slug}>
        <Hidden handle={handle} back={here} /><input type="hidden" name="meeting" value={slug} /><input type="hidden" name="exists" value={m ? "1" : ""} />
        <input type="hidden" name="status_was" value={m?.status ?? "planned"} /><input type="hidden" name="book" value={m?.book ?? ""} />
        <input type="hidden" name="title_was" value={m?.title ?? ""} /><input type="hidden" name="author_site" value={card?.author ?? ""} /><input type="hidden" name="sheet_voting_was" value={m?.sheet_voting ?? ""} /><input type="hidden" name="number_hint" value={numberHint ?? ""} />

        <section className="am-rec">
          <div className="am-nav">{older ? <L className="ad-b" href={link(older.slug)}>‹ {monthName(older.slug)}</L> : <span />}
            <span>Row {m?.number ?? numberHint ?? "—"} · {statusLabel}</span>
            {newer ? <L className="ad-b" href={link(newer.slug)}>{monthName(newer.slug)} ›</L> : <span />}</div>
          <div className="am-title"><span><b>{monthName(slug)}{slug.length > 7 ? " (second book)" : ""}</b><span>{subline}</span></span>
            <span className="am-score"><b>{score}</b><span>{score === "--" ? "no score this month" : score === "–" ? "no votes yet" : "club score · average of the votes"}</span></span></div>
          <div className="am-status" role="radiogroup" aria-label="Status"><span>Status</span>
            {([["met", "Met"], ["next", "Next"], ["planned", "Planned"], ["skipped", "Skipped"], ["noscore", "No score"]] as const).map(([k, t]) => <label key={k}><input type="radio" name="status" value={k} defaultChecked={status === k} />{t}</label>)}</div>
          <div className="am-sheet">
            <Cell col="A" k="#"><input type="number" name="number" defaultValue={m?.number ?? ""} placeholder={numberHint != null ? `${numberHint} · worked out` : "number"} /></Cell>
            <Cell col="B" k="Date"><input type="date" name="meets_on" defaultValue={day} /></Cell>
            <Cell col="C" k="Book" wide><input name="title" defaultValue={m?.title ?? ""} placeholder={met ? "Book not entered" : "Picked from the five"} style={{ fontWeight: m?.title_bold ? 700 : 500, color: COLOR[m?.title_color ?? "blue"] }} /></Cell>
            <Cell col="D" k="Author" wide><input name="author" defaultValue={m?.author ?? ""} placeholder="—" /></Cell>
            <Cell col="E" k="Host"><select name="host" defaultValue={nx?.host ?? ""}><option value="">Not set</option>{roster.filter((p) => p.status !== "guest").map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select></Cell>
            <Cell col="F" k="Score · from the votes"><input value={score} readOnly tabIndex={-1} className="am-ro" /></Cell>
            <Cell col="G" k="GR×2"><input type="number" name="grx2" min={2} max={10} step={0.01} defaultValue={m?.goodreads_avg != null ? (Number(m.goodreads_avg) * 2).toFixed(2) : ""} placeholder="4.45 × 2" /></Cell>
            <div className="am-cell wide"><span><i>C</i>Title format, as in the sheet</span><span className="am-fmt">
              <label><input type="checkbox" name="title_bold" defaultChecked={!!m?.title_bold} /><b>B</b></label>
              {(["plain", "blue", "red"] as const).map((c) => <label key={c}><input type="radio" name="title_color" value={c} defaultChecked={(m?.title_color ?? "blue") === c} /><i className={`am-dot ${c}`} />{c[0].toUpperCase() + c.slice(1)}</label>)}</span></div>
            <Cell col="C" k="Goodreads link on the title" wide><input type="url" name="link_url" defaultValue={m?.link_url ?? ""} placeholder="https://www.goodreads.com/book/show/…" /></Cell>
            <Cell col="—" k="Cover image · a link to another edition's cover; blank uses the catalog's" wide><input type="url" name="cover_url" defaultValue={coverOverride} placeholder="https://…" /><input type="hidden" name="cover_url_was" value={coverOverride} /></Cell>
            <Cell col="I" k="Notes" wide><textarea name="notes" rows={2} defaultValue={m?.notes ?? ""} placeholder="Date, place, food…" /></Cell>
            <Cell col="J" k="Voting · the sheet's hidden column" wide><textarea name="sheet_voting" rows={1} defaultValue={m?.sheet_voting ?? ""} placeholder="Kent=6, Henry=9, …" className="am-mono" /></Cell>
          </div>
        </section>

        <section className="am-box"><div className="am-h"><b>The evening</b><span>What members see on Home</span></div>
          <div className="am-even">
            <label>Time<input type="time" name="meets_time" defaultValue={time} /></label>
            <label>Where<input name="venue_label" defaultValue={nx?.venue_label ?? ""} placeholder="Whose house?" /></label>
            <label>Food<input name="food" defaultValue={nx?.food ?? ""} placeholder="What's cooking?" /></label>
            <label>Bring<input name="bring" defaultValue={(nx?.bring ?? []).join(", ")} placeholder="Bread, wine…" /></label>
            <label>Co-host<input name="cohost" defaultValue={nx?.cohost ?? ""} placeholder="optional" /></label></div></section>

        {slate?.status === "picked" ? <section className="am-box"><div className="am-h"><b>The five</b><span>{ballot.length} / 5 · picked</span></div>
          <div className="am-five">{ballot.map((b, n) => { const win = m?.title && b.title.toLowerCase() === m.title.toLowerCase(); return <div key={b.title} className={win ? "win" : undefined}><span>{n + 1}{win ? " · picked" : ""}</span><b>{b.title}</b><span>{b.author}</span></div>; })}</div></section>
          : <><input type="hidden" name="slate_status" value={slate?.status ?? ""} /><input type="hidden" name="five_was" value={[0, 1, 2, 3, 4].map((n) => `${ballot[n]?.title ?? ""}|${ballot[n]?.author ?? ""}`).join("¦")} />
            <FiveBooks key={slug} books={ballot.map((b) => ({ title: b.title, author: b.author }))} title="The five" note={slate?.status === "voting" ? `posted · ${turnout} ranked` : slate?.status === "closed" ? "voting closed" : met ? (ballot.length ? "as recorded" : "not recorded for this month") : "drafting"}>
              {!met && <div className="nm-foot"><button name="post" value="1" className="ad-b ad-ink">Save and post the five</button>{slate && slate.status !== "drafting" && <span>Changing a book takes the five back to drafting{turnout ? ` and clears ${turnout} ranking${turnout === 1 ? "" : "s"}` : ""}.</span>}</div>}</FiveBooks></>}

        {status !== "skipped" && <section className="am-box"><div className="am-h"><b>Member columns</b><span>Vote takes a number or miss · n/a · hbb · --- · no vote · ?</span></div>
          <datalist id="am-codes">{["miss", "n/a", "hbb", "---", "no vote", "?"].map((c) => <option key={c} value={c} />)}</datalist>
          <div className="am-mem">{shown.map(memberRow)}<Quiet names={quiet.map((p) => String(p.name).split(" ")[0])}>{quiet.map(memberRow)}</Quiet></div></section>}
      </RecordForm>
    </div>

    <div id="club" className="a7-sec"><b>Club</b><span>Polls, settings and the export.</span></div>
    {pollData && <Polls handle={handle} polls={pollData.polls} voters={pollData.voters} />}
    <div className="a7-club">
      <ClubSettings handle={handle} initial={{ visibility: club.visibility, score_reveal: club.score_reveal, slate_size: club.slate_size, public_talk: !!club.public_talk, public_scores: !!club.public_scores, talk_visible_to_ai: !!club.talk_visible_to_ai }} matched={counts?.matched ?? 0} total={counts?.total ?? 0} />
      <div className="a7-export"><span>Get the club&apos;s data out</span><p>The whole record, laid out like the old sheet. Opens in Excel, Numbers or Google Sheets.</p><a className="ad-b" href="/api/export/sheet">Download Excel (.xlsx)</a><p className="a7-fine">Never included: passwords, invite links, private directions, or ballot votes.</p></div>
      <div className="cs-card"><div className="cs-h"><b>Score corrections</b><span>Who changed what</span></div>
        {corrected.map((x) => <div key={`${x.meeting}|${x.name}`} className="a7-log"><span><b>{x.name}</b> · {monthName(x.meeting.slice(0, 7))} · {x.score != null ? Number(x.score) : "no score"}{x.word ? ` · ${x.word}` : ""}</span><span>by {roster.find((p) => p.slug === x.entered_by)?.name ?? x.entered_by}</span></div>)}
        {!corrected.length && <p className="ad-note">No corrections yet.</p>}</div>
    </div>
    <details className="a7-more"><summary className="ad-tog">Sheet labels and birthdays · for the export</summary>
      <MemberSheet handle={handle} rows={roster.filter((p) => p.status !== "guest").map((p) => { const x = sheetMembers.find((r) => r.slug === p.slug); return { slug: p.slug, name: p.name, label: x?.label ?? "", birthday: x?.birthday ? String(x.birthday).slice(0, 10) : "", birthdayText: x?.birthday_text ?? "" }; })} /></details>
  </>;
}
