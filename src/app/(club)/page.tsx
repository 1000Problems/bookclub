import { CLUB } from "@/lib/club";
import { Fresh } from "@/components/Fresh";
import { editPost, hideChecklist, post, saveRsvp } from "@/lib/actions";
import { base, Hidden, L, load, MembersOnly, Notice, type Page } from "@/lib/page";
import { sql, studio, type Row } from "@/lib/studio";
import { ago, Md, monthYear, whenLong } from "@/lib/text";
import { viewerFor } from "@/lib/viewer";

const CLUB = "select name, visibility, public_talk, public_scores, score_reveal from club";
const NEXT = "select slug, month, meets_at, book, title, author, cover_url, host, host_name, venue_label, host_line, bring, days_until, rsvp_yes, rsvp_maybe, rsvp_guests from next_meeting";
const POSTS = "select id, member, name, body, created_at, edited_at, mine from club_posts order by created_at desc limit 20";
const LAST = "select slug, month, title, author, cover_url, host_name, club_score, rank_all, ranked_count, top_words from last_meeting";

export default async function Home({ params, searchParams }: Page) {
  const handle = CLUB;
  const q = await searchParams;
  const b = base(handle);
  const pre = await viewerFor(handle);
  if (pre.kind === "member") {
    const v = (await sql(pre, [{ sql: "select slate from open_actions where kind = 'ballot'" }])).rows[0];
    for (const s of v) await sql(pre, [{ sql: "select close_if_due($1)", params: [s.slate] }]);
  }
  const { v, rows, signedIn } = await load(handle, (x) => [
    { sql: CLUB }, { sql: NEXT }, { sql: POSTS }, { sql: LAST },
    ...(x.kind === "member" ? [
      { sql: "select slug, name, role from me" },
      { sql: "select status, guests, bringing from my_rsvp where meeting = (select slug from next_meeting)" },
      { sql: "select kind, meeting, slate, title, detail, href, host_only from open_actions order by sort" },
      { sql: "select a.slate, t.* from open_actions a cross join lateral ballot_turnout(a.slate) t where a.kind = 'ballot'" },
      { sql: "select last_read_at from my_reads where thread = 'club'" },
      { sql: "select ai_checklist_hidden_at from my_prefs" },
      { sql: "select address, directions, parking from meeting_directions where meeting = (select slug from next_meeting)" },
      { sql: "select status, count(*)::int n from rsvp_board where meeting = (select slug from next_meeting) group by status" },
    ] : []),
  ]);
  if (!rows) return <MembersOnly />;
  const [club, next, posts, last] = [rows[0][0], rows[1][0] as Row | undefined, [...rows[2]].reverse(), rows[3][0] as Row | undefined];
  const me = rows[4]?.[0], rsvp = rows[5]?.[0], actions = (rows[6] ?? []).slice(0, 2), turnout = rows[7]?.[0], read = rows[8]?.[0]?.last_read_at, prefs = rows[9]?.[0], dir = rows[10]?.[0], board = rows[11] ?? [];
  const conn = v.kind === "member" ? await studio(v, "/site/connection").catch(() => ({ state: "none" })) : null;
  const isHost = next && me && (next.host === me.slug || me.role === "scribe");
  const count = (s: string | null) => board.find((x) => x.status === s)?.n ?? 0;
  const showConnect = signedIn && conn?.state !== "connected" && !prefs?.ai_checklist_hidden_at;

  return <div className="grid gap-4">
    {signedIn && <Fresh ballot={turnout != null} />}
    <Notice q={q} handle={handle} here="/" />
    {next && signedIn && next.days_until !== null && next.days_until <= 7 && !rsvp && <p className="card-lift p-3">One week out: RSVP</p>}

    <section className="card p-5" aria-label="Next meeting">
      {!next ? <p className="muted">Next meeting not set yet</p> : <>
        <L href={`${b}/m/${next.slug}`} className="flex gap-4">
          {next.cover_url && <img src={next.cover_url} alt="" className="w-20 rounded-lg" />}
          <span><span className="serif text-2xl block">{next.title}</span><span className="muted">{next.author}</span></span>
        </L>
        <p className="mt-3 font-semibold">{whenLong(next.meets_at)}</p>
        <p>{next.venue_label ?? "Place TBD"}</p>
        <p className="muted">{next.host_line ?? `Hosted by ${next.host_name}`}</p>
        {next.bring.length > 0 && <p className="mt-2 flex gap-2 flex-wrap"><span className="label">Bring:</span>{next.bring.map((x: string) => <span key={x} className="chip px-3">{x}</span>)}</p>}
        <p className="mt-2">{next.rsvp_yes + next.rsvp_guests} going{next.rsvp_maybe ? ` · ${next.rsvp_maybe} maybe` : ""}</p>
        {signedIn && <form action={saveRsvp} className="mt-3 grid gap-2">
          <Hidden handle={handle} back="/" /><input type="hidden" name="meeting" value={next.slug} />
          <div className="flex gap-2">
            {[["yes", "Going"], ["maybe", "Maybe"], ["no", "Can't"]].map(([s, t]) => <button key={s} name="status" value={s} className={`btn ${rsvp?.status === s ? "btn-ink" : ""}`}>{t}</button>)}
          </div>
          <label className="label">Guests <input className="field" type="number" name="guests" min={0} max={5} defaultValue={rsvp?.guests ?? 0} /></label>
          <input className="field" name="bringing" placeholder="I'm bringing…" defaultValue={rsvp?.bringing ?? ""} />
        </form>}
        {signedIn && <details className="mt-3"><summary className="label">Directions</summary>
          {dir ? <div className="mt-2"><a href={`https://maps.apple.com/?q=${encodeURIComponent(dir.address ?? "")}`}>{dir.address}</a><p>{dir.directions}</p><p>{dir.parking}</p></div>
               : <p className="muted mt-2">Host hasn&apos;t added directions yet</p>}
        </details>}
        {signedIn && next.meets_at && <a className="btn mt-3" href={`${b}/m/${next.slug}/calendar`}>Add to calendar</a>}
        {isHost && <p className="mt-3 muted">{count("yes")} yes · {count("maybe")} maybe · {count(null)} no answer · <L href={`${b}/next#place`}>Edit logistics</L></p>}
      </>}
    </section>

    {actions.map((a) => {
      if (a.kind === "slate" && !a.detail) return null;
      const text = a.kind === "ballot" ? `${turnout?.me_cast ? "Your ballot is in" : "Vote for next book"} · ${turnout?.cast_count} of ${turnout?.eligible}${turnout?.me_cast ? "" : " have voted"}`
        : a.kind === "score" ? (a.detail ? `You scored ${Number(a.detail)} · edit` : a.title)
        : a.kind === "slate" ? `Host: pick your 5 · ${a.detail} of 5` : a.title;
      return <L key={a.kind + (a.meeting ?? "")} href={b + a.href} className="card-lift p-4 font-semibold block">{text}</L>;
    })}

    {(signedIn || club.public_talk) && <section className="card p-5" aria-label="Club chat">
      {posts.length === 0 ? <p className="muted">{signedIn ? "Quiet so far. Say hi." : "No talk yet."}</p> : posts.map((p) => <article key={p.id} className="mb-3">
        {read && p.created_at > read && <hr />}
        <p className="label">{p.name} <span className="faint">· {ago(p.created_at)}{p.edited_at ? " · edited" : ""}</span></p>
        <Md text={p.body} />
        {p.mine && <details><summary className="faint text-sm">Edit</summary><form action={editPost} className="grid gap-2"><Hidden handle={handle} back="/" /><input type="hidden" name="id" value={p.id} /><textarea className="field" name="body" maxLength={4000} defaultValue={p.body} /><button className="btn">Save</button></form></details>}
      </article>)}
      {signedIn ? <form action={post} className="grid gap-2 mt-3"><Hidden handle={handle} back="/" /><textarea className="field" name="body" maxLength={4000} required aria-label="Post to the club" /><button className="btn btn-ink">Post</button></form>
        : <p className="muted mt-3">Members: sign in to join the talk</p>}
      <L href={`${b}/talk/club`} className="muted block mt-2">Open Talk</L>
    </section>}

    {last && <L href={`${b}/m/${last.slug}`} className="card p-5 block" aria-label="Last time">
      <p className="label">Last time</p>
      <p className="serif text-xl">{last.title}</p>
      <p className="muted">Hosted by {last.host_name} · {monthYear(last.month)}</p>
      {last.club_score == null ? <p className="muted mt-2">Scores are members-only</p> : <>
        <p className="mono text-2xl mt-2">{Number(last.club_score).toFixed(1)} <span className="text-sm muted">#{last.rank_all} of {last.ranked_count} all time</span></p>
        <p className="muted">{last.top_words.join(" · ")}</p>
      </>}
    </L>}

    {showConnect && <section className="card p-5" aria-label="Connect your AI">
      <p className="label">Connect your AI (optional)</p>
      <p className="muted mt-1">Get a code, give it to your AI, and it says hello. <L href={`${b}/club/ai`}>Start</L></p>
      <form action={hideChecklist} className="mt-2"><Hidden handle={handle} back="/" /><button className="btn btn-ghost">Hide</button></form>
    </section>}
  </div>;
}
