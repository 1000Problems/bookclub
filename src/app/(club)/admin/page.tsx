import { notFound } from "next/navigation";
import { CLUB } from "@/lib/club";
import { saveMonth, saveSheetCells } from "@/lib/actions";
import { FiveBooks } from "@/components/NextMeeting";
import { Hidden, L, load, Notice, type Page } from "@/lib/page";
import { sql, type Row } from "@/lib/studio";
import { MonthList, type MonthRow } from "./MonthList";
import { AdminTabs, MONTHS, monthName, toHm, toYmd, workedOutNumber } from "./parts";

const addMonths = (slug: string, n: number) => { const [y, m] = slug.slice(0, 7).split("-").map(Number), d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const FUTURE_MONTHS = 3;
const voteCell = (x: Row) => x.sheet_code ?? (x.attendance === "missed" ? "miss" : x.attendance === "out" ? "n/a" : x.attendance === "unfinished" ? "hbb" : x.score != null ? String(Number(x.score)) : "");
const wordCell = (x: Row) => (x.attendance === "missed" ? x.miss_reason : x.sheet_comment ?? x.word) ?? "";

/** 4c: the sheet's rows on the left, the whole record of one month on the right. Past, next or future, one Save. */
export default async function Meetings({ searchParams }: Page) {
  const handle = CLUB, q = await searchParams;
  // Admin views are refused outright for anyone else, so check before asking for them.
  const who = await load(handle, (x) => x.kind === "member" ? [{ sql: "select role from me" }, { sql: "select slug from next_meeting" }, { sql: "select slug, status, number from meetings order by slug" }] : [{ sql: "select 1" }]);
  if (who.rows?.[0]?.[0]?.role !== "scribe" || who.v.kind !== "member") notFound();
  const v = who.v, months = who.rows![2], today = toYmd.format(new Date()).slice(0, 7), first: string = months[0]?.slug ?? today, last: string = months.at(-1)?.slug ?? first;
  const nextSlug: string | undefined = who.rows![1][0]?.slug, opening = nextSlug ?? months.findLast((m) => m.status === "planned")?.slug ?? last;
  const max = addMonths(last > today ? last : today, FUTURE_MONTHS);
  const slug = q.m && /^\d{4}-\d{2}[a-z]?$/.test(q.m) && q.m.slice(0, 7) >= first.slice(0, 7) && q.m.slice(0, 7) <= max ? q.m : opening, here = `/admin?m=${slug}`;
  const { rows } = await sql(v, [
    { sql: "select slug, name, status from members_roster order by name" },
    { sql: "select * from sheet_meetings where slug = $1", params: [slug] },
    { sql: "select host, meets_at, venue_label, food, bring from meetings where slug = $1", params: [slug] },
    { sql: "select at_meeting, status from slates where at_meeting = $1", params: [slug] },
    { sql: "select b.title, b.author from candidates c join books b on b.slug = c.book where c.slate = $1 order by c.added_at", params: [slug] },
    { sql: "select v.member, v.attendance, v.score, v.word, s.miss_reason, s.sheet_code, s.sheet_comment from meeting_votes v join sheet_votes s on s.meeting = v.meeting and s.member = v.member where v.meeting = $1", params: [slug] },
    { sql: "select c.slug, c.number, c.title, c.author, c.host_name, c.status, c.club_score, s.no_score from meeting_cards c join meeting_sheet s on s.slug = c.slug order by c.slug desc" },
  ]);
  const roster = rows[0], m = rows[1][0] as Row | undefined, nx = rows[2][0] as Row | undefined, slate = rows[3][0] as Row | undefined, ballot = rows[4], votes = rows[5], all = rows[6];
  const turnout: number = slate ? (await sql(v, [{ sql: "select cast_count from ballot_turnout($1)", params: [slug] }]).catch(() => null))?.rows[0]?.[0]?.cast_count ?? 0 : 0;
  const card = all.find((r) => r.slug === slug) as Row | undefined;

  // The list: every month the club has, plus empty months up to three past the last one.
  const have = new Set(all.map((r) => r.slug)), yearAgo = addMonths(today, -12);
  const extra: Row[] = [];
  for (let s = addMonths(last, 1); s <= max; s = addMonths(s, 1)) if (!have.has(s)) extra.push({ slug: s, status: "empty" });
  const list: MonthRow[] = [...extra.reverse(), ...all].map((r) => {
    const upcoming = r.status === "planned" || r.status === "empty", skip = r.status === "skipped", next = r.slug === nextSlug;
    const needs = r.status === "met" && !r.no_score && r.slug >= yearAgo && (!r.title || r.club_score == null);
    return { slug: r.slug, n: r.number != null ? String(r.number) : "", mon: MONTHS[Number(r.slug.slice(5, 7)) - 1].slice(0, 3) + (r.slug.length > 7 ? "²" : ""), next, upcoming, needs, empty: !r.title,
      title: skip ? "Skipped" : r.title ?? (next ? "Ballot open" : upcoming ? "Not set up yet" : "Book not entered"),
      sub: [r.host_name, r.title ? r.author : skip ? "" : r.status === "empty" ? "Planned" : r.status === "met" ? "Met" : "Planned"].filter(Boolean).join(" · "),
      score: r.no_score ? "--" : r.club_score != null ? Number(r.club_score).toFixed(2) : "" };
  });
  const i = list.findIndex((r) => r.slug === slug), older = list[i + 1], newer = list[i - 1];

  const met = m?.status === "met", status = m?.status === "skipped" ? "skipped" : met && m?.no_score ? "noscore" : m?.status ?? "planned";
  const statusLabel = slug === nextSlug ? "Next" : { met: "Met", noscore: "No score", skipped: "Skipped", planned: "Planned" }[status as string];
  const numberHint = met || status === "skipped" ? null : workedOutNumber(months, slug);
  const score = m?.no_score ? "--" : card?.club_score != null ? Number(card.club_score).toFixed(2) : "–";
  const byMember = new Map(votes.map((x) => [x.member, x]));
  const people = roster.filter((p) => p.status === "active" || byMember.has(p.slug));
  const local = nx?.meets_at ? `${toYmd.format(new Date(nx.meets_at))}T${toHm.format(new Date(nx.meets_at))}` : "";
  const subline = m?.title ? `${m.title}${m.author ? ` · ${m.author}` : ""}${m.host_name ? ` · hosted by ${m.host_name}` : ""}` : m?.host_name ? `Hosted by ${m.host_name} · book not picked yet` : m ? (status === "skipped" ? "The club didn't meet." : "Nothing entered yet.") : "Not set up yet. Save creates it.";
  const Cell = ({ col, k, children, wide }: { col: string; k: string; children: React.ReactNode; wide?: boolean }) => <label className={`am-cell${wide ? " wide" : ""}`}><span><i>{col}</i>{k}</span>{children}</label>;

  return <><div className="ad-head"><h1>Admin</h1><span>Only admins can open this page.</span></div>
    <AdminTabs on="meetings" />
    <Notice q={q} handle={handle} here={here} />
    <div className="am-grid">
      <MonthList rows={list} on={slug} nextSlug={nextSlug} />

      <form key={slug} action={saveMonth} className="am-right">
        <Hidden handle={handle} back={here} /><input type="hidden" name="meeting" value={slug} /><input type="hidden" name="exists" value={m ? "1" : ""} />
        <input type="hidden" name="status_was" value={m?.status ?? "planned"} /><input type="hidden" name="book" value={m?.book ?? ""} />
        <input type="hidden" name="title_was" value={m?.title ?? ""} /><input type="hidden" name="author_site" value={card?.author ?? ""} /><input type="hidden" name="sheet_voting_was" value={m?.sheet_voting ?? ""} />

        <section className="am-rec">
          <div className="am-nav">{older ? <L className="ad-b" href={`/admin?m=${older.slug}`}>‹ {monthName(older.slug)}</L> : <span />}
            <span>Row {m?.number ?? numberHint ?? "—"} · {statusLabel}</span>
            {newer ? <L className="ad-b" href={`/admin?m=${newer.slug}`}>{monthName(newer.slug)} ›</L> : <span />}</div>
          <div className="am-title"><span><b>{monthName(slug)}{slug.length > 7 ? " (second book)" : ""}</b><span>{subline}</span></span>
            <span className="am-score"><b>{score}</b><span>{score === "--" ? "no score this month" : score === "–" ? "no votes yet" : "club score · average of the votes"}</span></span></div>
          <div className="am-status" role="radiogroup" aria-label="Status"><span>Status</span>
            {([["met", "Met"], ["planned", "Planned"], ["skipped", "Skipped"], ["noscore", "No score"]] as const).map(([k, t]) => <label key={k}><input type="radio" name="status" value={k} defaultChecked={status === k} />{t}</label>)}
            {slug === nextSlug && <i className="am-next">NEXT</i>}</div>
          <div className="am-sheet">
            <Cell col="A" k="#"><input type="number" name="number" defaultValue={m?.number ?? numberHint ?? ""} placeholder="number" /></Cell>
            <Cell col="B" k="Date and time"><input type="datetime-local" name="meets_at" defaultValue={local} /></Cell>
            <Cell col="C" k="Book" wide><input name="title" defaultValue={m?.title ?? ""} placeholder={met ? "Book not entered" : "Picked from the five"} style={{ fontWeight: m?.title_bold ? 700 : 500, color: m?.title_color === "red" ? "oklch(.52 .19 28)" : "oklch(.45 .17 264)" }} /></Cell>
            <Cell col="D" k="Author" wide><input name="author" defaultValue={m?.author ?? ""} placeholder="—" /></Cell>
            <Cell col="E" k="Host"><select name="host" defaultValue={nx?.host ?? ""}><option value="">Not set</option>{roster.filter((p) => p.status !== "guest").map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select></Cell>
            <Cell col="F" k="Score · from the votes"><input value={score} readOnly tabIndex={-1} className="am-ro" /></Cell>
            <Cell col="G" k="Goodreads rating (×2 in the sheet)"><input type="number" name="goodreads_avg" min={1} max={5} step={0.01} defaultValue={m?.goodreads_avg ?? ""} placeholder="4.12" disabled={!m?.book} /></Cell>
            <div className="am-cell wide"><span><i>C</i>Title format, as in the sheet</span><span className="am-fmt">
              <label><input type="checkbox" name="title_bold" defaultChecked={!!m?.title_bold} /><b>B</b></label>
              <label><input type="radio" name="title_color" value="blue" defaultChecked={m?.title_color !== "red"} /><i className="am-dot blue" />Blue</label>
              <label><input type="radio" name="title_color" value="red" defaultChecked={m?.title_color === "red"} /><i className="am-dot red" />Red</label></span></div>
            <Cell col="C" k="Goodreads link on the title" wide><input type="url" name="link_url" defaultValue={m?.link_url ?? ""} placeholder="https://www.goodreads.com/book/show/…" disabled={!m?.book} /></Cell>
            <Cell col="I" k="Notes" wide><textarea name="notes" rows={2} defaultValue={m?.notes ?? ""} placeholder="Date, place, food…" /></Cell>
            <Cell col="J" k="Voting · the sheet's hidden column" wide><textarea name="sheet_voting" rows={1} defaultValue={m?.sheet_voting ?? ""} placeholder="Blank: written from the votes" className="am-mono" /></Cell>
          </div>
        </section>

        <section className="am-box"><div className="am-h"><b>The evening</b><span>What members see on Home</span></div>
          <div className="am-even">
            <label>Where<input name="venue_label" defaultValue={nx?.venue_label ?? ""} placeholder="Whose house?" /></label>
            <label>Food<input name="food" defaultValue={nx?.food ?? ""} placeholder="What's cooking?" /></label>
            <label>Bring<input name="bring" defaultValue={(nx?.bring ?? []).join(", ")} placeholder="Bread, wine…" /></label></div></section>

        {met || slate?.status === "picked" ? <section className="am-box"><div className="am-h"><b>The five</b><span>{ballot.length ? `${ballot.length} / 5 · ${met ? "as voted" : "picked"}` : "not recorded for this month"}</span></div>
          {!!ballot.length && <div className="am-five">{ballot.map((b, n) => { const win = m?.title && b.title.toLowerCase() === m.title.toLowerCase(); return <div key={b.title} className={win ? "win" : undefined}><span>{n + 1}{win ? " · picked" : ""}</span><b>{b.title}</b><span>{b.author}</span></div>; })}</div>}</section>
          : <><input type="hidden" name="slate_status" value={slate?.status ?? ""} /><input type="hidden" name="five_was" value={[0, 1, 2, 3, 4].map((n) => `${ballot[n]?.title ?? ""}|${ballot[n]?.author ?? ""}`).join("¦")} />
            <FiveBooks key={slug} books={ballot.map((b) => ({ title: b.title, author: b.author }))} title="The five" note={slate?.status === "voting" ? `posted · ${turnout} ranked` : slate?.status === "closed" ? "voting closed" : "drafting · the host can add these too"}>
              <div className="nm-foot"><button name="post" value="1" className="ad-b ad-ink">Save and post the five</button>{slate && slate.status !== "drafting" && <span>Changing a book takes the five back to drafting{turnout ? ` and clears ${turnout} ranking${turnout === 1 ? "" : "s"}` : ""}.</span>}</div></FiveBooks></>}

        {m?.book && <section className="am-box"><div className="am-h"><b>Member columns</b><span>Vote takes a number or miss · n/a · hbb · --- · no vote</span></div>
          <datalist id="am-codes">{["miss", "n/a", "hbb", "---", "no vote"].map((c) => <option key={c} value={c} />)}</datalist>
          <div className="am-mem">{people.map((p) => { const x = byMember.get(p.slug); return <div key={p.slug} className={p.status !== "active" ? "past" : undefined}>
            <span className="am-who">{p.name}{p.status !== "active" && <i>past</i>}</span>
            {x ? <><input type="hidden" name="vm" value={p.slug} /><input type="hidden" name={`n:${p.slug}`} value={p.name} /><input type="hidden" name={`v0:${p.slug}`} value={voteCell(x)} /><input type="hidden" name={`c0:${p.slug}`} value={wordCell(x)} />
              <input name={`v:${p.slug}`} defaultValue={voteCell(x)} list="am-codes" placeholder="vote" aria-label={`${p.name} vote`} className="am-v" />
              <input name={`c:${p.slug}`} defaultValue={wordCell(x)} placeholder="word or comment" aria-label={`${p.name} word`} /></>
              : <span className="ad-note">No entry. Add it in the go-around while scoring is open.</span>}</div>; })}</div>
          <L className="ad-b" href={`/m/${slug}/goaround`}>Open the go-around</L></section>}

        <div className="am-save"><button className="ad-b ad-ink">Save {monthName(slug)}</button><span>Changes go into the record and the Excel export.</span>{m && nx?.meets_at && <a className="ad-b" href={`/m/${slug}/calendar`}>Add to calendar</a>}</div>
      </form>
    </div>

    {m && <details className="ad-sec"><summary className="ad-tog">Original sheet cells <span className="ad-note">· as typed in Excel. These win over the fields above in the export; blank uses the site&apos;s value.</span></summary>
      <form action={saveSheetCells} className="ad-form"><Hidden handle={handle} back={here} /><input type="hidden" name="meeting" value={m.slug} />
        <div className="ad-fields">{([["sheet_number", "Number"], ["sheet_title", "Title"], ["sheet_host", "Host"], ["sheet_score", "Score"], ["sheet_grx2", "GRx2"]] as const).map(([k, t]) => <label key={k} className="ad-l">{t}<input className="ad-i" name={k} defaultValue={m[k] ?? ""} /></label>)}</div>
        <input type="hidden" name="sheet_voting" value={m.sheet_voting ?? ""} />
        <label className="ad-l">Other cells (JSON)<textarea className="ad-i" name="sheet_cells" rows={2} defaultValue={m.sheet_cells ? JSON.stringify(m.sheet_cells) : ""} /></label>
        <button className="ad-b">Save sheet cells</button></form></details>}</>;
}
