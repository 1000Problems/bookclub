import { notFound } from "next/navigation";
import { CLUB } from "@/lib/club";
import { addMember, cancelInvite, invite, markPast, makeActive, matchBooks, removeSignIn, saveCorrection, saveMeetingAdmin, saveMemberSheet, saveSettings, setIsbn, setRole } from "@/lib/actions";
import { FiveBooks } from "@/components/NextMeeting";
import { whenLong } from "@/lib/text";
import { Hidden, L, load, Notice, type Page } from "@/lib/page";
import { MonthPick } from "@/components/MonthPick";
import { sql, studio, type Row } from "@/lib/studio";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthName = (slug: string) => `${MONTHS[Number(slug.slice(5, 7)) - 1]} ${slug.slice(0, 4)}`;
const short = (at: string) => new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" });
const ini = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const toYmd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" });
const toHm = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit" });
const JUMP = [["next", "Next meeting"], ["fix", "Corrections"], ["members", "Members"], ["changes", "Changes"], ["export", "Export"], ["settings", "Settings"]];
const LOCKED_SELF = "That's you. You can't change your own role or remove yourself.", LOCKED_LAST = "The club needs at least one admin.";

/** Everything a month's sheet row needs. Shared by Next meeting and a past month's details. */
function SheetFields({ m, book, numberHint }: { m: Row | undefined; book: boolean; numberHint?: number | null }) {
  return <div className="ad-fields">
    {book && <><label className="ad-l">Goodreads link<input className="ad-i" type="url" name="link_url" defaultValue={m?.link_url ?? ""} placeholder="https://www.goodreads.com/book/show/…" /></label>
      <label className="ad-l">Goodreads rating<input className="ad-i" type="number" name="goodreads_avg" min={1} max={5} step={0.01} defaultValue={m?.goodreads_avg ?? ""} placeholder="e.g. 4.12" /></label>
      <label className="ad-l">Author, as the sheet writes it<input className="ad-i" name="sheet_author" defaultValue={m?.author ?? ""} /></label>
      <label className="ad-l">Title color<select className="ad-i" name="title_color" defaultValue={m?.title_color ?? "blue"}><option value="blue">Blue</option><option value="red">Red</option></select></label>
      <label className="ad-c"><input type="checkbox" name="title_bold" defaultChecked={!!m?.title_bold} />Bold</label></>}
    <label className="ad-l">Meeting number<input className="ad-i" type="number" name="number" defaultValue={m?.number ?? numberHint ?? ""} placeholder="#" />{m?.number == null && numberHint != null && <span className="ad-note">Worked out from the last numbered meeting.</span>}</label>
    <label className="ad-c"><input type="checkbox" name="no_score" defaultChecked={!!m?.no_score} />No score this month</label>
  </div>;
}
const HostSelect = ({ people, value }: { people: Row[]; value?: string | null }) => <label className="ad-l">Host<select className="ad-i" name="host" defaultValue={value ?? ""}><option value="">Not set</option>{people.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select></label>;

export default async function Admin({ searchParams }: Page) {
  const handle = CLUB, q = await searchParams;
  const fixSlug = q.fix ?? "";
  const { v, rows } = await load(handle, (x) => x.kind === "member" ? [{ sql: "select slug, name, role from me" }, { sql: "select * from club" },
    { sql: "select slug, name, status, linked from members_roster order by name" },
    { sql: "select * from sheet_meetings order by slug desc" },
    { sql: "select slug, host, meets_at, venue_label, food, bring from meetings" },
    { sql: "select slug from next_meeting" },
    { sql: "select b.slug, b.title, b.author from later l join books b on l.subject = 'b:' || b.slug where l.kind = 'isbn' and l.done_at is null order by b.title" },
    { sql: "select count(*) filter (where isbn is not null)::int as matched, count(*)::int as total from books" },
    { sql: "select at_meeting, status, ballots, eligible from slates" },
    { sql: "select c.slate, b.title, b.author from candidates c join books b on b.slug = c.book order by c.added_at" },
    { sql: "select v.meeting, v.member, v.name, v.attendance, v.score, v.word, v.corrected, v.entered_by, s.comment, s.miss_reason from meeting_votes v join sheet_votes s on s.meeting = v.meeting and s.member = v.member order by v.name" },
  ] : [{ sql: "select 1" }]);
  const me = rows?.[0]?.[0];
  if (me?.role !== "scribe" || v.kind !== "member") notFound();
  const c = rows![1][0], roster = rows![2], meetings = rows![3], extra = new Map(rows![4].map((m) => [m.slug, m])), unmatched = rows![6], counts = rows![7][0], slates = rows![8], cands = rows![9], allVotes = rows![10];
  const [signIns, invites] = await Promise.all([studio(v, "/club/members"), studio(v, "/club/invites")]) as [{ members: Row[] }, { invites: Row[] }];
  const signIn = new Map(signIns.members.map((m) => [m.slug, m])), openInvite = new Map(invites.invites.filter((i) => !i.used_at && !i.revoked_at && new Date(i.expires_at) > new Date()).map((i) => [i.member_slug, i]));
  const admins = signIns.members.filter((m) => m.role === "scribe").length;

  // The month in the form: ?m=, otherwise next_meeting, otherwise the newest planned month, otherwise this month.
  const nowSlug = toYmd.format(new Date()).slice(0, 7);
  const defaultSlug: string = rows![5][0]?.slug ?? meetings.find((m) => m.status === "planned")?.slug ?? nowSlug;
  const later = q.m && /^\d{4}-\d{2}[a-z]?$/.test(q.m) && q.m !== defaultSlug ? q.m : null;
  const nextSlug: string = later ?? defaultSlug;
  const monthOptions = monthsFrom(defaultSlug < nowSlug ? defaultSlug : nowSlug, meetings, nextSlug).map((slug) => {
    const m = meetings.find((x) => x.slug === slug), host = roster.find((p) => p.slug === extra.get(slug)?.host)?.name;
    const state = !m ? "not set up" : m.status === "skipped" ? "skipped" : host ?? (m.title ? m.title : "planned");
    return { slug, label: `${monthName(slug)} · ${state}${slug === defaultSlug ? " (next)" : ""}` };
  });
  const numberHint = workedOutNumber(meetings, nextSlug);
  const slate = slates.find((x) => x.at_meeting === nextSlug), ballot = cands.filter((x) => x.slate === nextSlug), drafting = !slate || slate.status === "drafting";
  const nm = meetings.find((m) => m.slug === nextSlug), nx = extra.get(nextSlug), skipped = nm?.status === "skipped";
  const hostName = roster.find((p) => p.slug === nx?.host)?.name;
  const people = roster.filter((p) => p.status === "active");
  const past = meetings.find((m) => m.status === "met" && m.title);

  // Corrections
  const scored = meetings.filter((m) => m.scoring === "revealed" && m.title);
  const fix = scored.find((m) => m.slug === fixSlug) ?? scored[0], fx = extra.get(fix?.slug), votes = allVotes.filter((x) => x.meeting === fix?.slug);
  const qs = (o: Record<string, string | null | undefined>) => { const u = new URLSearchParams(); for (const [k, val] of Object.entries(o)) if (val) u.set(k, val); const t = u.toString(); return t ? `?${t}` : ""; };
  const here = `/admin${qs({ m: later, fix: fixSlug })}`;
  const corrected = allVotes.filter((x) => x.corrected);

  const finding = q.find ? unmatched.find((x) => x.slug === q.find) : undefined;
  const found = finding ? await findEditions(finding.title, finding.author) : [];
  const Box = ({ n, t }: { n: string; t: string }) => <label className="ad-c"><input type="checkbox" name={n} defaultChecked={c[n]} />{t}</label>;
  const H = ({ sec }: { sec: string }) => <Hidden handle={handle} back={`${here}#${sec}`} />;

  const Person = ({ p }: { p: Row }) => {
    const si = signIn.get(p.slug), inv = openInvite.get(p.slug), s = sheetOf.get(p.slug), self = p.slug === me.slug, admin = si?.role === "scribe", last = admin && admins <= 1;
    const lock = self ? LOCKED_SELF : last ? LOCKED_LAST : "";
    const state = si ? `Joined ${short(si.joined)}${self ? " · you" : ""}` : inv ? `Invited, expires ${short(inv.expires_at)}` : "In the history · no sign-in yet";
    return <details className="ad-row"><summary><span className="ad-ini">{ini(p.name)}</span><span className="ad-who"><b>{p.name}{admin && <i className="ad-tag">Admin</i>}</b><span className={si ? "" : "ad-warn"}>{state}</span></span><span className="ad-more">Manage</span></summary>
      <div className="ad-body">
        {!si && !inv && <form action={invite}><H sec="members" /><input type="hidden" name="slug" value={p.slug} /><input type="hidden" name="name" value={p.name} /><button className="ad-b">Get invite link</button></form>}
        {inv && <form action={cancelInvite}><H sec="members" /><input type="hidden" name="id" value={inv.id} /><button className="ad-b">Cancel invite</button></form>}
        {si && <form action={setRole} className="ad-line"><H sec="members" /><input type="hidden" name="slug" value={p.slug} /><input type="hidden" name="role" value={admin ? "member" : "scribe"} /><button className="ad-b" disabled={!!lock}>{admin ? "Make member" : "Make admin"}</button></form>}
        {lock && <p className="ad-note">{lock}</p>}
        {!lock && <details className="ad-confirm"><summary className="ad-b ad-danger">Mark as past member</summary><p>Mark {p.name} as a past member? Their sign-in stops working. Their scores and words stay in the club&apos;s history.</p>
          <form action={markPast}><H sec="members" /><input type="hidden" name="slug" value={p.slug} /><button className="ad-b ad-danger">Mark as past member</button></form></details>}
        {!lock && si && <details className="ad-confirm"><summary className="ad-b ad-danger">Remove sign-in</summary><p>Remove {p.name}&apos;s sign-in? They&apos;re signed out everywhere. They stay on the roster, and you can send a new invite link.</p>
          <form action={removeSignIn}><H sec="members" /><input type="hidden" name="slug" value={p.slug} /><button className="ad-b ad-danger">Remove sign-in</button></form></details>}
        <details><summary className="ad-tog">Sheet label and birthday</summary><form action={saveMemberSheet} className="ad-fields"><H sec="members" /><input type="hidden" name="slug" value={p.slug} />
          <label className="ad-l">Label<input className="ad-i" name="sheet_label" defaultValue={s?.label ?? ""} /></label>
          <label className="ad-l">Birthday<input className="ad-i" type="date" name="birthday" defaultValue={s?.birthday ? String(s.birthday).slice(0, 10) : ""} /></label>
          <label className="ad-l">Or, with no date<input className="ad-i" name="birthday_text" defaultValue={s?.birthday_text ?? ""} placeholder="TBD" /></label><button className="ad-b">Save</button></form></details>
      </div></details>;
  };
  const sheetOf = new Map((await sheetMembers(v)).map((m) => [m.slug, m]));
  const pastPeople = roster.filter((p) => p.status === "alumni");

  return <><div className="ad-head"><h1>Admin</h1><span>Only admins can open this page.</span></div>
    <nav className="ad-jump" aria-label="Admin sections">{JUMP.map(([id, t]) => <a key={id} href={`#${id}`}>{t}</a>)}</nav>
    <Notice q={q} handle={handle} here={`${here}`} />

    <section id="next" className="ad-sec ad-next">
      <div className="ad-eye"><span>Meeting</span><span>{hostName ? `${hostName} hosts, so they can fill these in too.` : skipped ? "Skipped" : "No host yet"}</span></div>
      <div className="nm-pickrow"><MonthPick options={monthOptions} value={nextSlug} keep={fixSlug ? { fix: fixSlug } : {}} /><label className="ad-c"><input form="meeting-form" type="checkbox" name="skip" defaultChecked={skipped} />Skip this month</label></div>
      {nextSlug && <form id="meeting-form" action={saveMeetingAdmin} className="ad-form"><H sec="next" /><input type="hidden" name="meeting" value={nextSlug} /><input type="hidden" name="exists" value={nm ? "1" : ""} /><input type="hidden" name="book" value={nm?.book ?? ""} /><input type="hidden" name="status" value={nm?.status ?? "planned"} />
        <label className="nm-when"><div className="sc-when">{nx?.meets_at ? whenLong(nx.meets_at) : "Date not set yet"}</div><input type="datetime-local" name="meets_at" defaultValue={nx?.meets_at ? `${toYmd.format(new Date(nx.meets_at))}T${toHm.format(new Date(nx.meets_at))}` : ""} aria-label="When" /></label>
        <div className="nm-four"><label className="sc-f"><span>Host</span><select name="host" defaultValue={nx?.host ?? ""}><option value="">Not set</option>{people.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select></label>
          <label className="sc-f"><span>Where</span><input name="venue_label" defaultValue={nx?.venue_label ?? ""} placeholder="Whose house?" /></label><label className="sc-f"><span>Food</span><input name="food" defaultValue={nx?.food ?? ""} placeholder="What's cooking?" /></label><label className="sc-f"><span>Bring</span><input name="bring" defaultValue={(nx?.bring ?? []).join(", ")} placeholder="Bread, wine…" /></label></div>
        {drafting ? <FiveBooks key={nextSlug} books={ballot.map((b) => ({ title: b.title, author: b.author }))} title="The five books" note="the host can change these too" />
          : <div className="nm-panel"><div className="nm-panel-h"><b>The five books</b><span>{slate?.status === "voting" ? `Voting is open${slate.ballots != null ? ` · ${slate.ballots} of ${slate.eligible ?? "?"} voted` : ""}` : "The ballot is closed"}</span></div><div className="nm-rows">{ballot.map((b, i) => <div key={b.title} className="nm-row"><span className="nm-n">{i + 1}</span><span className="nm-t"><b>{b.title}</b>{b.author && <span>— {b.author}</span>}</span></div>)}</div><L className="ad-note" href="/next">Next book</L></div>}
        <details><summary className="ad-tog">Sheet details <span className="ad-note">· meeting number, Goodreads, title color, notes</span></summary><label className="ad-l">Notes<textarea className="ad-i" name="notes" rows={2} defaultValue={nm?.notes ?? ""} placeholder="Date, place, food…" /></label><SheetFields m={nm} book={!!nm?.book} numberHint={numberHint} /></details>
        <div className="ad-line"><button className="ad-b ad-ink">Save meeting</button>{nm && nx?.meets_at && <a className="ad-b" href={`/m/${nextSlug}/calendar`}>Add to calendar</a>}</div></form>}
      {past && <p className="ad-note">Last: {monthName(past.slug)}, {past.title}{past.host_name ? `, hosted by ${past.host_name}` : ""}.</p>}
    </section>

    <section id="fix" className="ad-sec">
      <div className="ad-eye"><span>Correct a score or word</span><span>Only an admin can change entries after reveal.</span></div>
      <form method="get" className="ad-line">{later && <input type="hidden" name="m" value={later} />}<select className="ad-pick" name="fix" defaultValue={fix?.slug} aria-label="Month">{scored.map((m) => <option key={m.slug} value={m.slug}>{monthName(m.slug)} · {m.title}{m.host_name ? ` · hosted by ${m.host_name}` : ""}</option>)}</select><button className="ad-b">Open</button></form>
      {fix && <details><summary className="ad-tog">Month details</summary><form action={saveMeetingAdmin} className="ad-form"><H sec="fix" /><input type="hidden" name="meeting" value={fix.slug} /><input type="hidden" name="exists" value="1" /><input type="hidden" name="book" value={fix.book ?? ""} /><input type="hidden" name="status" value={fix.status} /><input type="hidden" name="details" value="1" />
        <HostSelect people={roster} value={fx?.host} /><label className="ad-l">Notes<textarea className="ad-i" name="notes" rows={2} defaultValue={fix.notes ?? ""} /></label><SheetFields m={fix} book={!!fix.book} /><button className="ad-b">Save month details</button></form></details>}
      <div className="ad-list">{votes.map((x) => { const scoredRow = x.attendance === "voted" || x.attendance === "partial"; const label = scoredRow ? "Scored" : x.attendance === "unfinished" ? "Didn't finish" : "Missed"; return <details key={x.member} className="ad-row"><summary><span className="ad-who"><b>{x.name}{x.corrected && <i className="ad-dot" title="Corrected by an admin" />}</b></span><b className="ad-score">{x.score ?? "—"}</b><span className="ad-word">{scoredRow ? x.word ?? "" : x.attendance === "missed" ? `missed · ${x.miss_reason ?? "no reason"}` : label}</span></summary>
        <form action={saveCorrection} className="ad-form"><H sec="fix" /><input type="hidden" name="meeting" value={x.meeting} /><input type="hidden" name="member" value={x.member} />
          <label className="ad-l">Status<select className="ad-i" name="status" defaultValue={label}><option>Scored</option><option>Missed</option><option>Didn&apos;t finish</option></select></label>
          <div className="ad-fields"><label className="ad-l">Score<input className="ad-i" inputMode="decimal" name="score" defaultValue={x.score ?? ""} /></label><label className="ad-l">Word<input className="ad-i" name="word" defaultValue={x.word ?? ""} /></label><label className="ad-l">Comment<input className="ad-i" name="comment" defaultValue={x.comment ?? ""} /></label><label className="ad-l">Reason, if missed<input className="ad-i" name="miss_reason" defaultValue={x.miss_reason ?? ""} /></label></div>
          <div className="ad-line"><button className="ad-b ad-ink">Save correction</button><span className="ad-note">Listed under Score corrections below.</span></div></form></details>; })}{!votes.length && <p className="ad-note">No entries for this month.</p>}</div>
    </section>

    <section id="members" className="ad-sec">
      <div className="ad-eye"><span>Members</span><span>No sign-up anywhere. Links only.</span></div>
      {q.invite && <div className="ad-link"><span>Text this link. It works once.</span><code>{q.invite}</code></div>}
      <details><summary className="ad-tog">Add someone new</summary><form action={addMember} className="ad-form"><H sec="members" />
        <label className="ad-l">Name, as the sheet spells it<input className="ad-i" name="name" required /></label>
        <div className="ad-fields"><label className="ad-l">Role<select className="ad-i" name="role" defaultValue="member"><option value="member">Member</option><option value="scribe">Admin</option></select></label>
          <label className="ad-l">Joining month<input className="ad-i" type="month" name="joined" /></label><label className="ad-l">Birthday (optional)<input className="ad-i" type="date" name="birthday" /></label></div>
        <button className="ad-b ad-ink">Add and get link</button></form></details>
      <div className="ad-list">{people.map((p) => <Person key={p.slug} p={p} />)}{roster.filter((p) => p.status === "guest").map((p) => <Person key={p.slug} p={p} />)}</div>
      {pastPeople.length > 0 && <details><summary className="ad-tog">Past members · {pastPeople.length}</summary><div className="ad-list">{pastPeople.map((p) => <div key={p.slug} className="ad-row ad-flat"><span className="ad-ini">{ini(p.name)}</span><span className="ad-who"><b>{p.name}</b></span><form action={makeActive}><H sec="members" /><input type="hidden" name="slug" value={p.slug} /><button className="ad-b">Make active again</button></form></div>)}</div><p className="ad-note">Their scores and words stay in the history.</p></details>}
      <p className="ad-note">You can&apos;t remove yourself or the last admin. Forgotten password? Remove their sign-in and send a new invite link. Nothing is emailed.</p>
    </section>

    <section id="changes" className="ad-sec">
      <div className="ad-eye"><span>Score corrections</span><span>Who changed what.</span></div>
      <div className="ad-list">{corrected.map((x) => <div key={`${x.meeting}|${x.member}`} className="ad-log"><b>{x.name}</b> · {monthName(x.meeting.slice(0, 7))} · {x.score ?? "no score"}{x.word ? ` · ${x.word}` : ""}<span>by {roster.find((p) => p.slug === x.entered_by)?.name ?? x.entered_by}</span></div>)}{!corrected.length && <p className="ad-note">No corrections yet.</p>}</div>
    </section>

    <section id="export" className="ad-sec ad-export"><span className="ad-eye"><span>Get the club&apos;s data out</span></span><p>The whole record, laid out like the Google Sheet. Opens in Excel, Numbers or Google Sheets.</p>
      <a className="ad-b" href="/api/export/sheet">Download Excel (.xlsx)</a><p className="ad-fine">This site is the official record now. The Google Sheet isn&apos;t kept in sync. Never included: passwords, invite links, private directions, or how anyone voted on the book ballot.</p></section>

    <section id="settings" className="ad-sec"><details open={!!q.find}><summary className="ad-tog"><b>Club settings</b> · Privacy, scoring and book matching. Rarely changed.</summary>
      <form action={saveSettings} className="ad-form"><H sec="settings" /><div className="ad-fields">
        <label className="ad-l">Visibility<select className="ad-i" name="visibility" defaultValue={c.visibility}><option value="public">Public</option><option value="members">Members only</option></select></label>
        <label className="ad-l">Score reveal<select className="ad-i" name="score_reveal" defaultValue={c.score_reveal}><option value="open">Open</option><option value="together">Together</option></select></label>
        <label className="ad-l">Slate size<input className="ad-i" type="number" name="slate_size" min={2} max={8} defaultValue={c.slate_size} /></label></div>
        <Box n="public_talk" t="Visitors can read chat" /><Box n="public_scores" t="Visitors can see scores" /><Box n="talk_visible_to_ai" t="AIs can read private talk" /><button className="ad-b ad-ink">Save</button></form>
      <div className="ad-form"><p className="label">Books matched to an edition · {counts?.matched ?? 0} of {counts?.total ?? 0}</p><p className="ad-note">A matched book gets its cover, description and author news from the shared catalog. Unmatched books keep a plain card.</p>
        <form action={matchBooks}><H sec="settings" /><button className="ad-b">Match what we can</button></form>
        {unmatched.length > 0 && <details open={!!q.find}><summary className="ad-tog">Unmatched · {unmatched.length}</summary><ul className="ad-list">{unmatched.map((b) => <li key={b.slug} className="grid gap-2">
          <span className="flex justify-between items-center gap-2"><span>{b.title} <span className="faint">{b.author}</span></span><L className="btn btn-ghost" href={`/admin?find=${b.slug}#find`}>Find this book</L></span>
          {finding?.slug === b.slug && <div id="find" className="grid gap-2">{found.length === 0 && <span className="muted">Open Library found nothing. Paste an ISBN-13 instead.</span>}
            {found.map((e) => <form key={e.isbn} action={setIsbn} className="flex gap-3 items-center"><H sec="settings" /><input type="hidden" name="book" value={b.slug} /><input type="hidden" name="isbn" value={e.isbn} />
              {e.cover ? <img src={e.cover} alt="" width={40} height={60} style={{ objectFit: "cover", borderRadius: 3 }} /> : <span style={{ width: 40, height: 60, background: "#eee", borderRadius: 3 }} />}
              <span className="flex-1">{e.title} <span className="faint">{e.author}{e.year ? ` · ${e.year}` : ""} · {e.isbn}</span></span><button className="btn">This one</button></form>)}
            <form action={setIsbn} className="flex gap-2"><H sec="settings" /><input type="hidden" name="book" value={b.slug} /><input className="field" name="isbn" placeholder="ISBN-13" inputMode="numeric" required aria-label="ISBN-13" /><button className="btn">Set</button></form></div>}</li>)}</ul></details>}</div>
    </details></section></>;
}

const sheetMembers = async (v: Parameters<typeof sql>[0]) => (await sql(v, [{ sql: "select slug, label, birthday::text as birthday, birthday_text from sheet_members" }])).rows[0];

/** Up to 5 Open Library editions with an ISBN-13, for the admin to pick from. Server-side; nothing is stored here. */
async function findEditions(title: string, author: string | null) {
  const u = `https://openlibrary.org/search.json?${new URLSearchParams({ title, ...(author ? { author: author.split(",")[0] } : {}), limit: "8", fields: "title,author_name,first_publish_year,isbn,cover_i" })}`;
  const j = await fetch(u, { headers: { "user-agent": "SoulCrushersBookClub/1.0 (bookclub.hadmoney.com)" }, next: { revalidate: 3600 } }).then((r) => r.json()).catch(() => null);
  const out: { isbn: string; title: string; author: string; year: number | null; cover: string | null }[] = [];
  for (const d of j?.docs ?? []) {
    const isbn = (d.isbn ?? []).find((x: string) => /^97[89]\d{10}$/.test(x));
    if (!isbn || out.some((o) => o.isbn === isbn)) continue;
    out.push({ isbn, title: d.title, author: (d.author_name ?? []).join(", "), year: d.first_publish_year ?? null, cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-S.jpg` : null });
    if (out.length === 5) break;
  }
  return out;
}

/** The next meeting's month, then 12 more, plus any later planned month that exists, in order. */
function monthsFrom(start: string, meetings: Row[], current: string) {
  const out = new Set<string>();
  let [y, m] = start.slice(0, 7).split("-").map(Number);
  for (let i = 0; i <= 13; i++) { out.add(`${y}-${String(m).padStart(2, "0")}`); if (++m > 12) { m = 1; y++; } }
  for (const x of meetings) if (x.slug >= start && x.status !== "met") out.add(x.slug);
  out.add(current);
  return [...out].sort();
}
/** Sheet rule: each month the club meets is the previous number + 1; skipped months use none. */
function workedOutNumber(meetings: Row[], slug: string): number | null {
  const me = meetings.find((m) => m.slug === slug);
  if (me?.status === "skipped") return null;
  const before = meetings.filter((m) => m.slug < slug).sort((a, b) => (a.slug < b.slug ? 1 : -1));
  const base = before.find((m) => m.number != null && m.status !== "skipped");
  if (!base) return null;
  const between = before.filter((m) => m.slug > base.slug && m.status !== "skipped").length;
  return Number(base.number) + between + 1;
}
