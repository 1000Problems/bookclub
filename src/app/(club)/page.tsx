import { viewerFor } from "@/lib/viewer";
import { PollCard, type LivePoll } from "@/components/Poll";
import { AuthorName, Cover, Shelf, type ShelfBook } from "@/components/ui";
import { Fresh } from "@/components/Fresh";
import { FiveBooks, RankFive, RsvpPopup } from "@/components/NextMeeting";
import { castBallot, post, saveHostMeeting, saveRsvp, saveScore, setChat } from "@/lib/actions";
import { CLUB } from "@/lib/club";
import { liveViewer, Hidden, L, Who, load, MembersOnly, Notice, type Page } from "@/lib/page";
import { author, first, numeric, r2, RECORD, shape, surname, tint, when, type Meet } from "@/lib/record";
import { sql, studio, type Row } from "@/lib/studio";
import { ago, Md, whenLong } from "@/lib/text";

const CLUB_SQL = "select name, visibility, public_talk from club";
const NEXT = "select slug, month, meets_at, book, title, author, cover_url, host, host_name, venue_label, host_line, bring, days_until, rsvp_yes, rsvp_maybe, rsvp_guests from next_meeting";
const POSTS = "select id, name, body, created_at from club_posts order by created_at desc limit 40";
const PT = "America/Los_Angeles";

/** For a datetime-local input, in club time. */
function local(at: string | null) {
  if (!at) return "";
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: PT, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(at)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

const Five = ({ rows, title, sub, link }: { rows: Row[]; title: string; sub: string; link?: string }) => <div className="nm-panel"><div className="nm-panel-h"><b>{title}</b><span>{link ? <L href={link}>{sub} →</L> : sub}</span></div>
  {rows.length > 0 && <div className="nm-rows">{rows.map((b, i) => <div key={b.book} className="nm-row"><span className="nm-n">{i + 1}</span><span className="nm-t"><b>{b.title}</b>{b.author && <span>— {b.author}</span>}</span></div>)}</div>}</div>;

export default async function Home({ searchParams }: Page) {
  const q = await searchParams;
  // One batch to Studio. A member's batch first closes any ballot that's due, so the rest reads the result.
  // The AI-connection check runs alongside it. A dead session falls back to signed out inside load().
  const viewer = await viewerFor(CLUB);
  const connP = viewer.kind === "member" ? studio(viewer, "/site/connection").catch(() => null) : Promise.resolve(null);
  // The club poll (design 8a) replaces "Still to score". Its own call, so a poll problem never takes Home down.
  const pollP = viewer.kind === "member" ? sql(viewer, [{ sql: "select * from poll_live()" }]).then((r) => (r.rows[0][0] as LivePoll | undefined) ?? null).catch(() => null) : Promise.resolve(null);
  const loaded = await load(viewer, (x) => [...(x.kind === "member" ? [{ sql: "select close_if_due(slate) from open_actions where kind = 'ballot'" }] : []), ...RECORD, { sql: CLUB_SQL }, { sql: NEXT }, { sql: POSTS },
    { sql: "select at_meeting, status from slates where status <> 'picked' order by at_meeting desc" },
    { sql: "select slate, book, title, author, cover_url from slate_cards order by added_at" },
    ...(x.kind === "member" ? [{ sql: "select slug, name, role from me" }, { sql: "select status, guests, bringing from my_rsvp where meeting = (select slug from next_meeting)" }, { sql: "select status, count(*)::int n from rsvp_board where meeting = (select slug from next_meeting) group by status" }] : [])]);
  const { v, signedIn } = loaded, rows = loaded.rows && v.kind === "member" ? loaded.rows.slice(1) : loaded.rows;
  if (!rows) return <MembersOnly />;
  const { all, books, members } = shape(rows);
  const club = rows[4][0], view = rows[5][0] as Row | undefined, posts = [...rows[6]].reverse(), me = rows[9]?.[0], rsvp = rows[10]?.[0], board = rows[11] ?? [];
  // The sheet can run out of dates: the newest planned month is still the next meeting (SC7).
  const planned = all.filter((m) => m.status === "planned").at(0) as Meet | undefined;
  const nextSlug = view?.slug ?? planned?.slug, nm = all.find((m) => m.slug === nextSlug);
  // The next meeting's own slate; an older open slate still counts until it's picked.
  const slate = rows[7].find((x) => x.at_meeting === nextSlug) ?? rows[7][0], cards = slate ? rows[8].filter((c) => c.slate === slate.at_meeting) : [];
  const [turnout, conn, poll] = await Promise.all([slate && v.kind === "member" ? sql(v, [{ sql: "select * from ballot_turnout($1)", params: [slate.at_meeting] }]).then((r) => r.rows[0]?.[0]).catch(() => null) : null, v.kind === "member" ? connP : null, v.kind === "member" ? pollP : null]);
  const bring = nm?.bring?.join(", ") ?? "";
  const canEdit = !!nm && !!me && (me.role === "scribe" || nm.host === me.slug), canAdmin = me?.role === "scribe";
  const canSlate = !!me && !!slate && slate.status === "drafting" && cards.length < 5 && (canAdmin || nm?.host === me.slug);
  const voting = slate?.status === "voting";
  const pendingFresh = books.slice(0, 3).find((m) => m.slug !== nextSlug && m.status === "met" && numeric(m).length < 3);
  const last = books.find((m) => m.score !== null && m !== pendingFresh);
  const splits = books.flatMap((m) => { const n = numeric(m); if (m.score === null || n.length < 4) return [];
    const s = [...n].sort((a, b) => a.score! - b.score!), lo = s[0], hi = s.at(-1)!; return [{ m, lo, hi, gap: hi.score! - lo.score! }]; }).sort((a, b) => b.gap - a.gap).slice(0, 3);
  const words = books.reduce((n, m) => n + m.votes.filter((x) => x.word).length, 0), since = Math.min(...books.map((m) => m.year));
  const active = members.filter((m) => m.status === "active").length, chatOpen = club.public_talk || signedIn;
  const yes = board.find((x) => x.status === "yes")?.n ?? 0, maybe = board.find((x) => x.status === "maybe")?.n ?? 0;
  const whenText = view?.meets_at ? whenLong(view.meets_at) : "Date not set yet";

  const names = members.filter((x) => x.status !== "guest").map((x) => x.name as string);
  const shelfCard = (m: Meet): ShelfBook => ({
    slug: m.slug, title: m.title!, author: author(m.author).split(/\s*[,&]\s*/)[0], sur: surname(m.author), cover: m.cover, bg: tint(m.title!), score: m.score, scoreText: r2(m.score),
    pct: m.score === null ? 0 : m.score * 10, gold: (m.score ?? 0) >= 9, when: when(m), year: m.year, host: first(m.host_name) || "—", gr: r2(m.gr), notes: m.notes ?? "", words: numeric(m).filter((v) => v.word).length,
    cells: names.map((n) => { const v = m.votes.find((x) => x.name === n); if (!v) return { score: "", word: "", dim: false, full: "" };
      return v.score !== null ? { score: r2(v.score), word: v.word ?? "", dim: false, full: `${r2(v.score)}${v.word ? ` · ${v.word}` : ""}` } : { score: v.attendance, word: "", dim: true, full: v.attendance }; }),
  });
  const hosting = !!nm && !!me && nm.host === me.slug;
  const no = board.find((x) => x.status === "no")?.n ?? 0;
  return <>
    {signedIn && <Fresh ballot={voting} />}
    <Notice q={q} handle={CLUB} here="/" />
    <div className="sc-row2">
      {hosting ? <form action={saveHostMeeting} className="sc-next" aria-label="You're hosting"><Hidden handle={CLUB} back="/" /><input type="hidden" name="meeting" value={nm!.slug} />{slate && <input type="hidden" name="slate" value={slate.at_meeting} />}
        <div className="sc-between"><span className="nm-hosting"><b>You&apos;re hosting</b><span>{when(nm!)}</span></span><span className="sc-mini">{yes} going · {maybe} maybe · {no} can&apos;t</span></div>
        <label className="nm-when"><div className="sc-when">{whenText}</div><input type="datetime-local" name="meets_at" defaultValue={local(view?.meets_at ?? nm?.meets_at ?? null)} aria-label="When" /></label>
        <div className="nm-four"><div className="sc-f"><span>Host</span><div>{nm!.host_name}</div></div>
          <label className="sc-f"><span>Where</span><input name="venue_label" defaultValue={nm!.venue ?? ""} placeholder="Whose house?" /></label><label className="sc-f"><span>Food</span><input name="food" defaultValue={nm!.food ?? ""} placeholder="What's cooking?" /></label><label className="sc-f"><span>Bring</span><input name="bring" defaultValue={bring} placeholder="Bread, wine…" /></label></div>
        {!slate || slate.status === "drafting" ? <FiveBooks books={cards.map((c) => ({ title: c.title, author: c.author }))} title="Your five books" note="your order is what members see"><div className="nm-foot"><button name="post" value="1" className="btn btn-ink">Post the five</button><button className="btn">Save</button></div></FiveBooks>
          : <><Five rows={cards} title="Your five books" sub={slate.status === "voting" ? `Voting is open · ${turnout?.cast_count ?? 0} of ${turnout?.eligible ?? "?"} ranked` : "Voting is closed"} /><div className="nm-foot"><button className="btn btn-ink">Save</button></div></>}
      </form>
      : <section className="sc-next" aria-label="Next meeting">
        <div className="sc-between"><span className="label">Next meeting{nm ? ` · ${when(nm)}` : ""}</span>{signedIn && nm && <RsvpPopup action={saveRsvp} meeting={nm.slug} handle={CLUB} status={rsvp?.status ?? null} guests={rsvp?.guests ?? 0} note={rsvp?.bringing ?? ""} count={`${yes} going · ${maybe} maybe`} />}</div>
        <div className="sc-when" style={{ padding: 0, margin: 0 }}>{whenText}</div>
        <div className="nm-four">{[["Host", nm?.host_name], ["Where", nm?.venue], ["Food", nm?.food], ["Bring", bring]].map(([k, val]) => <div key={k} className="sc-f"><span>{k}</span><div className={val ? "" : "unset"}>{val || "Not set yet"}</div></div>)}</div>
        {!signedIn && nm && <span className="sc-mini">{view?.rsvp_yes ?? 0} going</span>}
        {slate && cards.length > 0 ? (voting && signedIn && !turnout?.me_cast ? <RankFive books={cards as { book: string; title: string; author: string | null }[]} action={castBallot} slate={slate.at_meeting} back="/" handle={CLUB} />
          : <Five rows={cards} title={voting ? "The five" : "The five so far"} sub={voting ? (turnout?.me_cast ? `Your ballot is in · ${turnout.cast_count} of ${turnout.eligible} ranked` : "Members rank these") : slate.status === "drafting" ? `${cards.length} / 5 · the host posts these` : "Voting is closed"} link={slate.status === "closed" ? "/next" : undefined} />)
          : nm?.title ? <div className="nm-pick"><L href={`/m/${nm.slug}`} className="nm-pick-cover"><Cover title={nm.title} sur={surname(nm.author)} url={nm.cover} bg={tint(nm.title, 0.85, 0.06)} size="lg" /></L>
            <div className="sc-col" style={{ gap: 12, flex: "1 1 260px", minWidth: 0 }}><span className="sc-eyebrow">What we&apos;re reading</span><L href={`/m/${nm.slug}`} className="sc-h2">{nm.title}</L>
              <div>{nm.authors.slice(0, 1).map((a) => <AuthorName key={a.slug} name={a.name} small by={false} href={`/author/${a.slug}`} />)}</div>
              {nm.premise && <p className="nm-pick-about">{nm.premise}</p>}</div></div>
          : <Five rows={[]} title="The five" sub="The host hasn't posted them yet" />}
      </section>}

      <div className="sc-side">
        <section className="sc-panel grow" aria-label="Club chat">
          <div className="sc-between" style={{ alignItems: "center", flexWrap: "wrap" }}><span className="flex flex-col gap-0.5"><span className="sc-t3">Club chat</span><span className="muted text-xs">{club.public_talk ? "Public: anyone can read, members post" : "Members only: hidden from the public"}</span></span>
            {canAdmin && <form action={setChat} className="sc-seg"><Hidden handle={CLUB} back="/" /><button name="public" value="1" className={club.public_talk ? "on" : ""}>Public</button><button name="public" value="0" className={club.public_talk ? "" : "on"}>Members</button></form>}</div>
          <div className="sc-chat">{!chatOpen && <span className="muted py-5">The club keeps its chat to members. Sign in to read it.</span>}{chatOpen && posts.length === 0 && <span className="faint py-5">No messages yet.</span>}
            {chatOpen && posts.map((p) => <div key={p.id} className="sc-msg"><span className="sc-av" style={{ background: tint(p.name, 0.88, 0.07) }}>{p.name[0]}</span><span className="flex flex-col gap-0.5 min-w-0"><span className="muted text-xs"><b style={{ color: "#141413" }}>{first(p.name)}</b> · {ago(p.created_at)}</span><span style={{ lineHeight: 1.4, overflowWrap: "anywhere" }}><Md text={p.body} /></span></span></div>)}</div>
          {signedIn ? <form action={post} className="sc-inline soft"><Hidden handle={CLUB} back="/" /><input name="body" maxLength={4000} required aria-label="Post to the club" placeholder="Need a ride? Bringing bread?" /><button>Post</button></form> : <a href="/auth/signin" className="sc-cta" style={{ background: "#f6f5f1", color: "#141413" }}>Sign in to post</a>}
        </section>
        {poll && <PollCard poll={poll} handle={CLUB} />}
      </div>
    </div>

    <div className="sc-stats"><span><b>{books.length}</b>books</span><span><b>{new Date().getFullYear() - since}</b>years</span><span><b>{words}</b>words at the table</span>{signedIn ? <L href="/members"><b>{active}</b>members</L> : <span><b>{active}</b>members</span>}</div>

    {last && <section className="sc-last" style={{ background: tint(last.title!) }}>
      <L href={`/m/${last.slug}`} style={{ width: 170, flexShrink: 0, transform: "rotate(-2deg)" }}><Cover title={last.title!} sur={surname(last.author)} url={last.cover} bg={tint(last.title!, 0.85, 0.06)} size="lg" /></L>
      <div className="sc-col" style={{ flex: "1 1 360px", gap: 16 }}><span className="sc-eyebrow">Last time · {when(last)} · hosted by {first(last.host_name)}</span><L href={`/m/${last.slug}`} className="sc-h2">{last.title}</L>
        <div>{last.authors.slice(0, 1).map((a) => <AuthorName key={a.slug} name={a.name} small by={false} href={`/author/${a.slug}`} />)}</div>
        <div className="flex gap-2.5 items-center flex-wrap"><span className="sc-pill-score" style={{ alignSelf: "center" }}>Club {r2(last.score)}</span><span className="sc-small">Goodreads ×2 · {r2(last.gr)}</span></div>
        <div className="sc-wraps">{numeric(last).filter((x) => x.word).sort((a, b) => b.score! - a.score!).map((x) => <Who key={x.member} on={signedIn} slug={x.member} className="sc-wordcard"><span className="sc-w">{x.word}</span><span className="sc-mini">{first(x.name)} · {r2(x.score)}</span></Who>)}</div></div>
    </section>}

    {splits.length > 0 && <div className="sc-col" style={{ paddingTop: 44, gap: 16 }}><span className="sc-h3">Arguments worth having</span><div className="sc-tri">{splits.map((x) => <L key={x.m.slug} href={`/m/${x.m.slug}`} className="sc-arg"><div style={{ width: 54, flexShrink: 0 }}><Cover title={x.m.title!} sur={surname(x.m.author)} url={x.m.cover} bg={tint(x.m.title!)} size="xs" /></div><div className="sc-col" style={{ gap: 6 }}><span className="sc-t3">{x.m.title}</span><span className="muted text-xs">{when(x.m)} · club {r2(x.m.score)}</span><span style={{ lineHeight: 1.4 }}>{first(x.lo.name)} gave it <b>{r2(x.lo.score)}</b>. {first(x.hi.name)} gave it <b>{r2(x.hi.score)}</b>.</span></div></L>)}</div></div>}

    <div id="books" className="sc-col" style={{ paddingTop: 44, gap: 20, scrollMarginTop: 70 }}><span className="sc-h3">Every book</span>
      <Shelf list={books.map(shelfCard)} names={names} skips={all.filter((m) => m.status === "skipped").map((m) => ({ year: m.year, when: when(m) }))} y={q.y && /^\d{4}$/.test(q.y) ? Number(q.y) : null} sort={q.sort === "score" ? "score" : "date"} view={q.view === "table" ? "table" : "covers"} /></div>
    {conn && conn.state !== "connected" && <p className="sc-small mt-6"><L href="/ai">Connect your AI (optional)</L></p>}
  </>;
}
