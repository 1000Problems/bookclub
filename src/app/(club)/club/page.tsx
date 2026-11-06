import { CLUB } from "@/lib/club";
import { addRoster, invite, matchBooks, removeMember, saveSettings, setIsbn } from "@/lib/actions";
import { base, Hidden, L, load, MembersOnly, Notice, Title, type Page } from "@/lib/page";
import { studio } from "@/lib/studio";
import { Md } from "@/lib/text";

export default async function Club({ params, searchParams }: Page) {
  const handle = CLUB;
  const q = await searchParams, b = base(handle), here = `${b}/club`;
  const { v, rows, signedIn } = await load(handle, (x) => [{ sql: "select * from club" }, ...(x.kind === "member" ? [{ sql: "select role from me" }, { sql: "select slug, name, status, linked from members_roster order by status, name" },
    { sql: "select b.slug, b.title, b.author from later l join books b on l.subject = 'b:' || b.slug where l.kind = 'isbn' and l.done_at is null order by b.title" },
    { sql: "select count(*) filter (where isbn is not null)::int as matched, count(*)::int as total from books" }] : [])]);
  if (!rows) return <MembersOnly />;
  const c = rows[0][0], scribe = rows[1]?.[0]?.role === "scribe";
  void (v.kind === "member" && scribe && await studio(v, "/club/members").catch(() => null));
  const unmatched = rows[3] ?? [], counts = rows[4]?.[0], finding = q.find ? unmatched.find((x) => x.slug === q.find) : undefined;
  const found = finding ? await findEditions(finding.title, finding.author) : [];
  const Box = ({ n, t }: { n: string; t: string }) => <label className="flex gap-2 items-center"><input type="checkbox" name={n} defaultChecked={c[n]} />{t}</label>;
  return <><Notice q={q} handle={handle} here={here} /><Title>{c.name}</Title>{c.about && <Md text={c.about} />}
    {q.invite && <p className="card-lift p-3 my-3 break-all">Text this link: {q.invite}</p>}
    <p className="my-3 flex gap-3"><L href={`${b}/members`}>Members</L>{signedIn && <L href={`${b}/club/ai`}>Connect your AI</L>}</p>
    {signedIn && <form method="post" action="/auth/signout"><button className="btn btn-ghost">Sign out</button></form>}
    {scribe && <><form action={saveSettings} className="card p-4 grid gap-2 mt-3"><p className="label">Settings</p><Hidden handle={handle} back={here} />
      <label className="label">Visibility<select className="field" name="visibility" defaultValue={c.visibility}><option value="public">Public</option><option value="members">Members only</option></select></label>
      <Box n="public_talk" t="Visitors can read chat" /><Box n="public_scores" t="Visitors can see scores" /><Box n="talk_visible_to_ai" t="AIs can read private talk" />
      <label className="label">Score reveal<select className="field" name="score_reveal" defaultValue={c.score_reveal}><option value="open">Open</option><option value="together">Together</option></select></label>
      <label className="label">Slate size<input className="field" type="number" name="slate_size" min={2} max={8} defaultValue={c.slate_size} /></label><button className="btn btn-ink">Save</button></form>
    <section className="card p-4 mt-3"><p className="label">Roster</p><ul className="grid gap-2 mt-2">{rows[2].map((m) => <li key={m.slug} className="flex justify-between items-center gap-2"><span>{m.name} <span className="faint">{m.status}{m.linked ? "" : " · not joined"}</span></span>
      {!m.linked && m.status === "active" && <form action={invite}><Hidden handle={handle} back={here} /><input type="hidden" name="slug" value={m.slug} /><input type="hidden" name="name" value={m.name} /><button className="btn">Copy invite link</button></form>}
      {m.linked && <form action={removeMember}><Hidden handle={handle} back={here} /><input type="hidden" name="slug" value={m.slug} /><button className="btn btn-ghost">Remove</button></form>}</li>)}</ul>
      <form action={addRoster} className="flex gap-2 mt-3"><Hidden handle={handle} back={here} /><input className="field" name="name" placeholder="Name" required aria-label="New member name" /><button className="btn">Add</button></form></section>
    <section className="card p-4 mt-3"><p className="label">Books matched to an edition · {counts?.matched ?? 0} of {counts?.total ?? 0}</p>
      <p className="muted text-sm mt-1">A matched book gets its cover, description and author news from the shared catalog. Unmatched books keep a plain card.</p>
      <form action={matchBooks} className="mt-2"><Hidden handle={handle} back={here} /><button className="btn">Match what we can</button></form>
      {unmatched.length > 0 && <ul className="grid gap-2 mt-3">{unmatched.map((b) => <li key={b.slug} className="grid gap-2">
        <span className="flex justify-between items-center gap-2"><span>{b.title} <span className="faint">{b.author}</span></span><L className="btn btn-ghost" href={`${here}?find=${b.slug}#find`}>Find this book</L></span>
        {finding?.slug === b.slug && <div id="find" className="grid gap-2">{found.length === 0 && <span className="muted">Open Library found nothing. Paste an ISBN-13 instead.</span>}
          {found.map((e) => <form key={e.isbn} action={setIsbn} className="flex gap-3 items-center"><Hidden handle={handle} back={here} /><input type="hidden" name="book" value={b.slug} /><input type="hidden" name="isbn" value={e.isbn} />
            {e.cover ? <img src={e.cover} alt="" width={40} height={60} style={{ objectFit: "cover", borderRadius: 3 }} /> : <span style={{ width: 40, height: 60, background: "#eee", borderRadius: 3 }} />}
            <span className="flex-1">{e.title} <span className="faint">{e.author}{e.year ? ` · ${e.year}` : ""} · {e.isbn}</span></span><button className="btn">This one</button></form>)}
          <form action={setIsbn} className="flex gap-2"><Hidden handle={handle} back={here} /><input type="hidden" name="book" value={b.slug} /><input className="field" name="isbn" placeholder="ISBN-13" inputMode="numeric" required aria-label="ISBN-13" /><button className="btn">Set</button></form></div>}</li>)}</ul>}
    </section></>}</>;
}

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
