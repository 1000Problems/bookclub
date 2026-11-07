import { notFound } from "next/navigation";
import { CLUB } from "@/lib/club";
import { addMember, cancelInvite, invite, markPast, makeActive, matchBooks, removeSignIn, saveMemberSheet, saveSettings, setIsbn, setRole } from "@/lib/actions";
import { Hidden, L, load, Notice, type Page } from "@/lib/page";
import { sql, studio, type Row } from "@/lib/studio";
import { AdminTabs, ini, LOCKED_LAST, LOCKED_SELF, monthName, short } from "../parts";

const sheetMembers = async (v: Parameters<typeof sql>[0]) => (await sql(v, [{ sql: "select slug, label, birthday::text as birthday, birthday_text from sheet_members" }])).rows[0];
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

export default async function Club({ searchParams }: Page) {
  const handle = CLUB, q = await searchParams, here = "/admin/club";
  // Admin views are refused outright for anyone else, so check before asking for them.
  const who = await load(handle, (x) => x.kind === "member" ? [{ sql: "select role from me" }] : [{ sql: "select 1" }]);
  if (who.rows?.[0]?.[0]?.role !== "scribe" || who.v.kind !== "member") notFound();
  const { v, rows } = await load(handle, (x) => x.kind === "member" ? [{ sql: "select slug, name, role from me" }, { sql: "select * from club" },
    { sql: "select slug, name, status, linked from members_roster order by name" },
    { sql: "select b.slug, b.title, b.author from later l join books b on l.subject = 'b:' || b.slug where l.kind = 'isbn' and l.done_at is null order by b.title" },
    { sql: "select count(*) filter (where isbn is not null)::int as matched, count(*)::int as total from books" },
    { sql: "select meeting, name, score, word, entered_by from meeting_votes where corrected order by meeting desc" },
  ] : [{ sql: "select 1" }]);
  const me = rows?.[0]?.[0];
  if (me?.role !== "scribe" || v.kind !== "member") notFound();
  const c = rows![1][0], roster = rows![2], unmatched = rows![3], counts = rows![4][0], corrected = rows![5];
  const [signIns, invites] = await Promise.all([studio(v, "/club/members"), studio(v, "/club/invites")]) as [{ members: Row[] }, { invites: Row[] }];
  const signIn = new Map(signIns.members.map((m) => [m.slug, m])), openInvite = new Map(invites.invites.filter((i) => !i.used_at && !i.revoked_at && new Date(i.expires_at) > new Date()).map((i) => [i.member_slug, i]));
  const admins = signIns.members.filter((m) => m.role === "scribe").length;
  const people = roster.filter((p) => p.status === "active");
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
    <AdminTabs on="club" />
    <Notice q={q} handle={handle} here={here} />

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

    <section id="settings" className="ad-sec"><details open={!!q.find}><summary className="ad-tog"><b>Club settings</b> · Privacy, scoring and book matching. Rarely changed.</summary>
      <form action={saveSettings} className="ad-form"><H sec="settings" /><div className="ad-fields">
        <label className="ad-l">Visibility<select className="ad-i" name="visibility" defaultValue={c.visibility}><option value="public">Public</option><option value="members">Members only</option></select></label>
        <label className="ad-l">Score reveal<select className="ad-i" name="score_reveal" defaultValue={c.score_reveal}><option value="open">Open</option><option value="together">Together</option></select></label>
        <label className="ad-l">Slate size<input className="ad-i" type="number" name="slate_size" min={2} max={8} defaultValue={c.slate_size} /></label></div>
        <Box n="public_talk" t="Visitors can read chat" /><Box n="public_scores" t="Visitors can see scores" /><Box n="talk_visible_to_ai" t="AIs can read private talk" /><button className="ad-b ad-ink">Save</button></form>
      <div className="ad-form"><p className="label">Books matched to an edition · {counts?.matched ?? 0} of {counts?.total ?? 0}</p><p className="ad-note">A matched book gets its cover, description and author news from the shared catalog. Unmatched books keep a plain card.</p>
        <form action={matchBooks}><H sec="settings" /><button className="ad-b">Match what we can</button></form>
        {unmatched.length > 0 && <details open={!!q.find}><summary className="ad-tog">Unmatched · {unmatched.length}</summary><ul className="ad-list">{unmatched.map((b) => <li key={b.slug} className="grid gap-2">
          <span className="flex justify-between items-center gap-2"><span>{b.title} <span className="faint">{b.author}</span></span><L className="btn btn-ghost" href={`/admin/club?find=${b.slug}#find`}>Find this book</L></span>
          {finding?.slug === b.slug && <div id="find" className="grid gap-2">{found.length === 0 && <span className="muted">Open Library found nothing. Paste an ISBN-13 instead.</span>}
            {found.map((e) => <form key={e.isbn} action={setIsbn} className="flex gap-3 items-center"><H sec="settings" /><input type="hidden" name="book" value={b.slug} /><input type="hidden" name="isbn" value={e.isbn} />
              {e.cover ? <img src={e.cover} alt="" width={40} height={60} style={{ objectFit: "cover", borderRadius: 3 }} /> : <span style={{ width: 40, height: 60, background: "#eee", borderRadius: 3 }} />}
              <span className="flex-1">{e.title} <span className="faint">{e.author}{e.year ? ` · ${e.year}` : ""} · {e.isbn}</span></span><button className="btn">This one</button></form>)}
            <form action={setIsbn} className="flex gap-2"><H sec="settings" /><input type="hidden" name="book" value={b.slug} /><input className="field" name="isbn" placeholder="ISBN-13" inputMode="numeric" required aria-label="ISBN-13" /><button className="btn">Set</button></form></div>}</li>)}</ul></details>}</div>
    </details></section>
    <section id="export" className="ad-sec ad-export"><span className="ad-eye"><span>Get the club&apos;s data out</span></span><p>The whole record, laid out like the Google Sheet. Opens in Excel, Numbers or Google Sheets.</p>
      <a className="ad-b" href="/api/export/sheet">Download Excel (.xlsx)</a><p className="ad-fine">This site is the official record now. The Google Sheet isn&apos;t kept in sync. Never included: passwords, invite links, private directions, or how anyone voted on the book ballot.</p></section>

    <section id="changes" className="ad-sec">
      <div className="ad-eye"><span>Score corrections</span><span>Who changed what.</span></div>
      <div className="ad-list">{corrected.map((x) => <div key={`${x.meeting}|${x.member}`} className="ad-log"><b>{x.name}</b> · {monthName(x.meeting.slice(0, 7))} · {x.score ?? "no score"}{x.word ? ` · ${x.word}` : ""}<span>by {roster.find((p) => p.slug === x.entered_by)?.name ?? x.entered_by}</span></div>)}{!corrected.length && <p className="ad-note">No corrections yet.</p>}</div>
    </section>

  </>;
}
