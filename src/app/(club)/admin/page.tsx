import { notFound } from "next/navigation";
import { CLUB } from "@/lib/club";
import { deleteEmptyMonth, saveMonth, saveSheetCells } from "@/lib/actions";
import { FiveBooks } from "@/components/NextMeeting";
import { Hidden, L, load, Notice, type Page } from "@/lib/page";
import { sql, type Row } from "@/lib/studio";
import { MonthList, type MonthRow } from "./MonthList";
import { Quiet, RecordForm } from "./RecordForm";
import { AdminTabs, MONTHS, monthName, toHm, toYmd, workedOutNumber } from "./parts";

const addMonths = (slug: string, n: number) => { const [y, m] = slug.slice(0, 7).split("-").map(Number), d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const AHEAD = 3;
const between = (a: string, b: string) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));
const COLOR: Record<string, string> = { plain: "#141413", blue: "oklch(.45 .17 264)", red: "oklch(.52 .19 28)" };
const voteCell = (x: Row) => x.sheet_vote ?? x.sheet_code ?? (x.attendance === "missed" ? "miss" : x.attendance === "out" ? "n/a" : x.attendance === "unfinished" ? "hbb" : x.score != null ? String(Number(x.score)) : "");
const wordCell = (x: Row) => (x.sheet_comment ?? (x.attendance === "voted" || x.attendance === "partial" ? x.word ?? x.comment : x.miss_reason)) ?? "";

/** 4c: the sheet's rows on the left, the whole record of one month on the right. Past, next or future, one Save. */
export default async function Meetings({ searchParams }: Page) {
  const handle = CLUB, q = await searchParams;
  // Admin views are refused outright for anyone else, so check before asking for them.
  const who = await load(handle, (x) => x.kind === "member" ? [{ sql: "select role from me" }, { sql: "select slug from next_meeting" }, { sql: "select slug, status, number from meetings order by slug" }] : [{ sql: "select 1" }]);
  if (who.rows?.[0]?.[0]?.role !== "scribe" || who.v.kind !== "member") notFound();
  const v = who.v, months = who.rows![2], today = toYmd.format(new Date()).slice(0, 7), first: string = months[0]?.slug ?? today, last: string = months.at(-1)?.slug ?? first;
  const nextSlug: string | undefined = who.rows![1][0]?.slug, opening = nextSlug ?? months.findLast((m) => m.status === "planned")?.slug ?? last;
  // Upcoming months: the next three by default; + and − change how many (?ahead=). Months with data always show.
  const ahead = Math.min(Math.max(Number.isInteger(Number(q.ahead)) && q.ahead !== "" && q.ahead != null ? Number(q.ahead) : AHEAD, 0), 240);
  const blanks: Row[] = (await sql(v, [{ sql: `select m.slug from meetings m left join sheet_meetings s on s.slug = m.slug where m.slug > $1 and m.book is null and m.host is null and m.meets_at is null
    and m.venue_label is null and m.food is null and coalesce(cardinality(m.bring), 0) = 0 and m.cohost is null and m.notes is null and coalesce(s.sheet_cells, '{}'::jsonb) = '{}'::jsonb
    and not exists (select 1 from votes x where x.meeting = m.slug) and not exists (select 1 from candidates c where c.slate = m.slug)`, params: [today] }])).rows[0];
  const blank = new Set(blanks.map((r) => r.slug)), lastData = months.filter((x) => !blank.has(x.slug)).at(-1)?.slug ?? today;
  const end = [addMonths(today, ahead), lastData].sort().at(-1)!, max = end;
  const withAhead = (n: number) => (n === AHEAD ? "" : `ahead=${n}`), aq = withAhead(ahead), link = (s: string) => `/admin?m=${s}${aq ? `&${aq}` : ""}`;
  const slug = q.m && /^\d{4}-\d{2}[a-z]?$/.test(q.m) && q.m.slice(0, 7) >= first.slice(0, 7) && q.m.slice(0, 7) <= max ? q.m : opening, here = link(slug);
  const { rows } = await sql(v, [
    { sql: "select slug, name, status from members_roster order by name" },
    { sql: "select * from sheet_meetings where slug = $1", params: [slug] },
    { sql: "select host, meets_at, venue_label, food, bring, cohost from meetings where slug = $1", params: [slug] },
    { sql: "select at_meeting, status from slates where at_meeting = $1", params: [slug] },
    { sql: "select b.title, b.author from candidates c join books b on b.slug = c.book where c.slate = $1 order by c.added_at", params: [slug] },
    { sql: "select member, attendance, score, word, comment, miss_reason, sheet_code, sheet_vote, sheet_comment from sheet_votes where meeting = $1", params: [slug] },
    { sql: "select c.slug, c.number, c.title, c.author, c.host_name, c.status, c.club_score, s.no_score from meeting_cards c join meeting_sheet s on s.slug = c.slug order by c.slug desc" },
  ]);
  const roster = rows[0], m = rows[1][0] as Row | undefined, nx = rows[2][0] as Row | undefined, slate = rows[3][0] as Row | undefined, ballot = rows[4], votes = rows[5], all = rows[6];
  const turnout: number = slate ? (await sql(v, [{ sql: "select cast_count from ballot_turnout($1)", params: [slug] }]).catch(() => null))?.rows[0]?.[0]?.cast_count ?? 0 : 0;
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

  return <><div className="ad-head"><h1>Admin</h1><span>Only admins can open this page.</span></div>
    <AdminTabs on="meetings" />
    <Notice q={q} handle={handle} here={here} />
    <div className="am-grid">
      <MonthList rows={list} on={slug} link={aq} grow={grow} shrink={shrink} handle={handle} remove={deleteEmptyMonth} />

      <RecordForm key={slug} action={saveMonth} label={monthName(slug)}>
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
        {m && nx?.meets_at && <a className="ad-b am-cal" href={`/m/${slug}/calendar`}>Add to calendar</a>}
      </RecordForm>
    </div>

    {m && <details className="ad-sec"><summary className="ad-tog">Original sheet cells <span className="ad-note">· as typed in Excel. These win over the fields above in the export; blank uses the site&apos;s value.</span></summary>
      <form action={saveSheetCells} className="ad-form"><Hidden handle={handle} back={here} /><input type="hidden" name="meeting" value={m.slug} />
        <div className="ad-fields">{([["sheet_number", "Number"], ["sheet_title", "Title"], ["sheet_host", "Host"], ["sheet_score", "Score"], ["sheet_grx2", "GRx2"]] as const).map(([k, t]) => <label key={k} className="ad-l">{t}<input className="ad-i" name={k} defaultValue={m[k] ?? ""} /></label>)}</div>
        <input type="hidden" name="sheet_voting" value={m.sheet_voting ?? ""} />
        <label className="ad-l">Other cells (JSON)<textarea className="ad-i" name="sheet_cells" rows={2} defaultValue={m.sheet_cells ? JSON.stringify(m.sheet_cells) : ""} /></label>
        <button className="ad-b">Save sheet cells</button></form></details>}</>;
}
