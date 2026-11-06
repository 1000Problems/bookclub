import { AuthorName, AutoField, Cover } from "@/components/ui";
import { Fresh } from "@/components/Fresh";
import { addCandidate, post, saveHero, saveRsvp, saveScore, saveTitleStyle, setChat } from "@/lib/actions";
import { CLUB } from "@/lib/club";
import { Hidden, L, load, MembersOnly, Notice, type Page } from "@/lib/page";
import { first, numeric, r2, RECORD, shape, surname, tint, when, type Meet } from "@/lib/record";
import { sql, studio, type Row } from "@/lib/studio";
import { ago, Md, whenLong } from "@/lib/text";
import { viewerFor } from "@/lib/viewer";

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

export default async function Home({ searchParams }: Page) {
  const q = await searchParams;
  const pre = await viewerFor(CLUB);
  if (pre.kind === "member") {
    const open = (await sql(pre, [{ sql: "select slate from open_actions where kind = 'ballot'" }])).rows[0];
    for (const s of open) await sql(pre, [{ sql: "select close_if_due($1)", params: [s.slate] }]);
  }
  const { v, rows, signedIn } = await load(CLUB, (x) => [...RECORD, { sql: CLUB_SQL }, { sql: NEXT }, { sql: POSTS },
    { sql: "select at_meeting, status from slates where status <> 'picked' order by at_meeting desc limit 1" },
    { sql: "select slate, book, title, author, cover_url from slate_cards order by added_at" },
    ...(x.kind === "member" ? [{ sql: "select slug, name, role from me" }, { sql: "select status, guests, bringing from my_rsvp where meeting = (select slug from next_meeting)" }, { sql: "select status, count(*)::int n from rsvp_board where meeting = (select slug from next_meeting) group by status" }, { sql: "select slug, title_color, title_bold from meeting_sheet" }] : [])]);
  if (!rows) return <MembersOnly />;
  const { all, books, members } = shape(rows);
  const club = rows[4][0], view = rows[5][0] as Row | undefined, posts = [...rows[6]].reverse(), slate = rows[7][0], me = rows[9]?.[0], rsvp = rows[10]?.[0], board = rows[11] ?? [], styles = rows[rows.length - 1] ?? [];
  const cards = slate ? rows[8].filter((c) => c.slate === slate.at_meeting) : [];
  // The sheet can run out of dates: the newest planned month is still the next meeting (SC7).
  const planned = all.filter((m) => m.status === "planned").at(0) as Meet | undefined;
  const nextSlug = view?.slug ?? planned?.slug, nm = all.find((m) => m.slug === nextSlug);
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
  const conn = v.kind === "member" ? await studio(v, "/site/connection").catch(() => null) : null;
  const yes = board.find((x) => x.status === "yes")?.n ?? 0, maybe = board.find((x) => x.status === "maybe")?.n ?? 0;
  const whenText = view?.meets_at ? whenLong(view.meets_at) : "Date not set yet";
  const F = ({ k, label, val, ph }: { k: string; label: string; val: string; ph: string }) => <label className="sc-f"><span>{label}</span>{canEdit ? <AutoField form="hero" name={k} defaultValue={val} placeholder={ph} /> : <div className={val ? "" : "unset"}>{val || "Not set yet"}</div>}</label>;

  const titleStyle = canAdmin && nm ? styles.find((x) => x.slug === nm.slug) : undefined;
  return <>
    {signedIn && <Fresh ballot={voting} />}
    <Notice q={q} handle={CLUB} here="/" />
    <div className="sc-row2">
      <section className="sc-next" aria-label="Next meeting">
        <div className="sc-between"><span className="label">Next meeting{nm ? ` · ${when(nm)}` : ""}</span></div>
        {canEdit && <form id="hero" action={saveHero}><Hidden handle={CLUB} back="/" /><input type="hidden" name="meeting" value={nm!.slug} /></form>}
        {canEdit ? <label className="sc-col" style={{ gap: 4 }}><div className="sc-when" style={{ padding: 0, margin: 0 }}>{whenText}</div><AutoField form="hero" type="datetime-local" name="meets_at" defaultValue={local(view?.meets_at ?? nm?.meets_at ?? null)} aria-label="When" className="field" style={{ minHeight: 40, maxWidth: 260, background: "rgba(255,255,255,.7)" }} /></label> : <div className="sc-when" style={{ padding: 0, margin: 0 }}>{whenText}</div>}
        <div className="sc-fields">
          <label className="sc-f"><span>Host</span><div className={nm?.host_name ? "" : "unset"}>{nm?.host_name ?? "Not set yet"}</div></label>
          <F k="venue_label" label="Where" val={nm?.venue ?? ""} ph="Whose house?" /><F k="food" label="Food" val={nm?.food ?? ""} ph="What's cooking?" /><F k="bring" label="Bring" val={bring} ph="Bread, wine…" />
        </div>
        {titleStyle && <form action={saveTitleStyle} className="flex gap-2 items-center flex-wrap"><Hidden handle={CLUB} back="/" /><input type="hidden" name="meeting" value={nm!.slug} />
          <select className="field" style={{ width: "auto" }} name="title_color" defaultValue={titleStyle.title_color} aria-label="Title color on the sheet"><option value="blue">Blue title</option><option value="red">Red title</option></select>
          <label className="flex gap-2 items-center"><input type="checkbox" name="title_bold" defaultChecked={titleStyle.title_bold} />Bold</label><button className="btn btn-ghost">Save</button></form>}
        {nm && <div className="sc-col"><div className="sc-between"><span className="label">{yes + maybe > 0 || signedIn ? `Who's coming · ${yes} going${maybe ? ` · ${maybe} maybe` : ""}` : `${(view?.rsvp_yes ?? 0)} going`}</span></div>
          {signedIn && <form action={saveRsvp} className="flex gap-1.5 flex-wrap"><Hidden handle={CLUB} back="/" /><input type="hidden" name="meeting" value={nm.slug} /><input type="hidden" name="guests" value={rsvp?.guests ?? 0} /><input type="hidden" name="bringing" value={rsvp?.bringing ?? ""} />
            {[["yes", "I'm in"], ["maybe", "Maybe"], ["no", "Can't"]].map(([s, t]) => <button key={s} name="status" value={s} className={`btn ${rsvp?.status === s ? "btn-ink" : ""}`}>{t}</button>)}</form>}</div>}
        <div className="sc-col" style={{ marginTop: "auto" }}>
          {nm?.title ? <div className="flex gap-4 items-center"><div style={{ width: 74, flexShrink: 0 }}><Cover title={nm.title} sur={surname(nm.author)} url={nm.cover} bg={tint(nm.title)} size="sm" /></div><div className="sc-col" style={{ gap: 4 }}><span className="label">What we&apos;re reading</span><L href={`/m/${nm.slug}`} style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1.05 }}>{nm.title}</L></div></div> : <>
          <div className="sc-between"><span className="label">What we&apos;re reading · {cards.length === 5 ? "five books are up" : cards.length ? `${5 - cards.length} more to post` : "host posts five books"}</span><span className="sc-mini">{cards.length} / 5</span></div>
          <div className="sc-slots">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="sc-slot">{cards[i] ? <Cover title={cards[i].title} sur={surname(cards[i].author)} url={cards[i].cover_url} bg={tint(cards[i].title)} size="sm" /> : <div className="sc-empty">{i + 1}</div>}</div>)}
            <div className="sc-rankbox">
              {canSlate && <form action={addCandidate} className="sc-inline"><Hidden handle={CLUB} back="/" /><input type="hidden" name="slate" value={slate.at_meeting} /><input name="title" placeholder="Host: add a book" aria-label="Title" required /><button>Add</button></form>}
              {me && !slate && (canAdmin || nm?.host === me.slug) && <L href="/next" className="sc-cta" style={{ background: "#fff", color: "#141413" }}>Host: start your five</L>}
              <L href={voting ? "/ballot" : "/next"} className={`sc-cta${voting ? "" : " off"}`}>Rank your top three →</L>
            </div></div></>}
        </div>
      </section>

      <div className="sc-side">
        <section className="sc-panel grow" aria-label="Club chat">
          <div className="sc-between" style={{ alignItems: "center", flexWrap: "wrap" }}><span className="flex flex-col gap-0.5"><span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.02em" }}>Club chat</span><span className="muted text-xs">{club.public_talk ? "Public: anyone can read, members post" : "Members only: hidden from the public"}</span></span>
            {canAdmin && <form action={setChat} className="sc-seg"><Hidden handle={CLUB} back="/" /><button name="public" value="1" className={club.public_talk ? "on" : ""}>Public</button><button name="public" value="0" className={club.public_talk ? "" : "on"}>Members</button></form>}</div>
          <div className="sc-chat">{!chatOpen && <span className="muted py-5">The club keeps its chat to members. Sign in to read it.</span>}{chatOpen && posts.length === 0 && <span className="faint py-5">No messages yet.</span>}
            {chatOpen && posts.map((p) => <div key={p.id} className="sc-msg"><span className="sc-av" style={{ background: tint(p.name, 0.88, 0.07) }}>{p.name[0]}</span><span className="flex flex-col gap-0.5 min-w-0"><span className="muted text-xs"><b style={{ color: "#141413" }}>{first(p.name)}</b> · {ago(p.created_at)}</span><span style={{ fontSize: 15, lineHeight: 1.4, overflowWrap: "anywhere" }}><Md text={p.body} /></span></span></div>)}</div>
          {signedIn ? <form action={post} className="sc-inline soft"><Hidden handle={CLUB} back="/" /><input name="body" maxLength={4000} required aria-label="Post to the club" placeholder="Need a ride? Bringing bread?" /><button>Post</button></form> : <a href="/auth/signin" className="sc-cta" style={{ background: "#f6f5f1", color: "#141413" }}>Sign in to post</a>}
        </section>
        {pendingFresh && <section className="sc-panel" style={{ boxShadow: "var(--lift)", flexDirection: "row", gap: 18 }}>
          <L href={`/m/${pendingFresh.slug}`} style={{ width: 72, flexShrink: 0 }}><Cover title={pendingFresh.title!} sur={surname(pendingFresh.author)} url={pendingFresh.cover} bg={tint(pendingFresh.title!)} size="sm" /></L>
          <div className="sc-col" style={{ flex: 1, gap: 8 }}><span className="label">Still to score · {when(pendingFresh)}</span><L href={`/m/${pendingFresh.slug}`} style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.15 }}>{pendingFresh.title}</L><span className="muted" style={{ fontSize: 13 }}>{pendingFresh.notes}</span>
            {signedIn && pendingFresh.scoring === "open" && <form action={saveScore} className="flex gap-1.5"><Hidden handle={CLUB} back="/" /><input type="hidden" name="meeting" value={pendingFresh.slug} /><input className="sc-score-in" name="score" inputMode="decimal" placeholder="8.6" required /><input className="sc-word-in" name="word" maxLength={40} placeholder="river" /><button className="btn btn-ink">Save</button></form>}
            <div className="sc-wraps">{numeric(pendingFresh).map((x) => <span key={x.member} className="sc-chip"><b>{r2(x.score)}</b> <i style={{ fontSize: 14 }}>{x.word}</i> · {first(x.name)}</span>)}</div></div></section>}
      </div>
    </div>

    <div className="sc-stats"><span><b>{books.length}</b>books</span><span><b>{new Date().getFullYear() - since}</b>years</span><span><b>{words}</b>words at the table</span><L href="/members"><b>{active}</b>members</L></div>

    {last && <section className="sc-last" style={{ background: tint(last.title!) }}>
      <L href={`/m/${last.slug}`} style={{ width: 170, flexShrink: 0, transform: "rotate(-2deg)" }}><Cover title={last.title!} sur={surname(last.author)} url={last.cover} bg={tint(last.title!, 0.85, 0.06)} size="lg" /></L>
      <div className="sc-col" style={{ flex: "1 1 360px", gap: 16 }}><span style={{ fontSize: 15, fontWeight: 600, color: "#3d3b37" }}>Last time · {when(last)} · hosted by {first(last.host_name)}</span><L href={`/m/${last.slug}`} className="sc-h2">{last.title}</L>
        <div>{last.authors.slice(0, 1).map((a) => <AuthorName key={a.slug} name={a.name} small by={false} href={`/author/${a.slug}`} />)}</div>
        <div className="flex gap-2.5 items-center flex-wrap"><span className="sc-pill-score" style={{ alignSelf: "center" }}>Club {r2(last.score)}</span><span className="muted" style={{ fontSize: 13 }}>Goodreads ×2 · {r2(last.gr)}</span></div>
        <div className="sc-wraps">{numeric(last).filter((x) => x.word).sort((a, b) => b.score! - a.score!).map((x) => <L key={x.member} href={`/members/${x.member}`} className="sc-wordcard"><span className="sc-w">{x.word}</span><span className="sc-mini">{first(x.name)} · {r2(x.score)}</span></L>)}</div></div>
    </section>}

    {splits.length > 0 && <div className="sc-col" style={{ paddingTop: 44, gap: 16 }}><span className="sc-h3">Arguments worth having</span><div className="sc-tri">{splits.map((x) => <L key={x.m.slug} href={`/m/${x.m.slug}`} className="sc-arg"><div style={{ width: 54, flexShrink: 0 }}><Cover title={x.m.title!} sur={surname(x.m.author)} url={x.m.cover} bg={tint(x.m.title!)} size="xs" /></div><div className="sc-col" style={{ gap: 6 }}><span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1.2 }}>{x.m.title}</span><span className="muted text-xs">{when(x.m)} · club {r2(x.m.score)}</span><span style={{ fontSize: 14, lineHeight: 1.4 }}>{first(x.lo.name)} gave it <b>{r2(x.lo.score)}</b>. {first(x.hi.name)} gave it <b>{r2(x.hi.score)}</b>.</span></div></L>)}</div></div>}

    <div className="sc-col" style={{ paddingTop: 44, gap: 20 }}><div className="flex items-baseline gap-2.5"><span className="sc-h3">Every book</span><span className="faint" style={{ fontSize: 16, fontWeight: 500 }}>{books.length}</span><L href="/books" className="label ml-auto">By year →</L></div>
      <div className="sc-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: "28px 20px" }}>{books.map((m) => <L key={m.slug} href={`/m/${m.slug}`} className="sc-col sc-card-b" style={{ gap: 10 }}><Cover title={m.title!} sur={surname(m.author)} url={m.cover} bg={tint(m.title!)} /><span className="flex flex-col gap-0.5"><b style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.25 }}>{m.title}</b><span className="muted text-xs">{when(m)} · {first(m.host_name) || "—"}</span></span></L>)}</div></div>
    {conn && conn.state !== "connected" && <p className="muted mt-6" style={{ fontSize: 13 }}><L href="/club/ai">Connect your AI (optional)</L></p>}
  </>;
}
