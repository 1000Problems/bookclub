"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { addMemberLive, bringBackLive, cancelInviteLive, inviteLive, resetSignInLive, retireLive, setRoleLive, type Live } from "@/lib/actions";

export type Person = { slug: string; name: string; ini: string; dot: string; sub: string; self: boolean; admin: boolean; signedIn: string | null; invite: { id: string; url: string | null; expires: string } | null };
export type Past = { slug: string; name: string; ini: string; dot: string; sub: string };

/** ADMIN 7a, Members: a ledger. Every action saves at once; making someone an admin, or not, asks first. */
export function Ledger({ handle, people, past, admins, summary, month }: { handle: string; people: Person[]; past: Past[]; admins: number; summary: string; month: string }) {
  const router = useRouter(), [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null), [links, setLinks] = useState<Record<string, string>>({});
  const [want, setWant] = useState<Record<string, "member" | "scribe">>({}), [ask, setAsk] = useState<{ p: Person; role: "member" | "scribe" } | null>(null);
  const [retiring, setRetiring] = useState<string | null>(null), [adding, setAdding] = useState(false), [pastOpen, setPastOpen] = useState(false), [copied, setCopied] = useState<string | null>(null);
  const [newName, setNewName] = useState(""), [newRole, setNewRole] = useState<"member" | "scribe">("member");
  const dlg = useRef<HTMLDialogElement>(null);

  const go = (job: () => Promise<Live>, done = "Saved", after?: (r: Live) => void) => start(async () => {
    const r = await job();
    if (!r.ok) { setMsg({ t: r.error ?? "That didn't save.", bad: true }); return; }
    after?.(r); setMsg({ t: done }); router.refresh();
  });
  const roleOf = (p: Person) => want[p.slug] ?? (p.admin ? "scribe" : "member");
  const pick = (p: Person, role: "member" | "scribe") => { if (role === roleOf(p)) return; setAsk({ p, role }); dlg.current?.showModal(); };
  const confirm = () => {
    const a = ask; dlg.current?.close(); setAsk(null); if (!a) return;
    const { p, role } = a, first = p.name.split(" ")[0];
    if (p.signedIn) go(() => setRoleLive(handle, p.slug, role), `${first} is ${role === "scribe" ? "an admin" : "a member"} now`);
    else if (p.invite) go(async () => { const c = await cancelInviteLive(handle, p.invite!.id); return c.ok ? inviteLive(handle, p.slug, p.name, role) : c; }, `New ${role === "scribe" ? "admin" : "member"} link for ${first}`, (r) => r.url && setLinks((l) => ({ ...l, [p.slug]: r.url! })));
    else setWant((w) => ({ ...w, [p.slug]: role }));
  };
  const copy = (slug: string, url: string) => { navigator.clipboard?.writeText(url).then(() => { setCopied(slug); setTimeout(() => setCopied(null), 1500); }); };

  return <section id="members" className="lg">
    <div className="lg-top">
      <div className="lg-h"><b>Members</b><span>{summary}</span></div>
      <div className="lg-tools"><span className={`lg-tag${msg?.bad ? " bad" : ""}`} role="status">{busy ? "Saving…" : msg?.t ?? "Saves automatically"}</span><span className="lg-fine">No sign-up anywhere. Links only.</span>
        <button type="button" className="ad-b ad-ink" onClick={() => setAdding(!adding)}>+ Add member</button></div>
    </div>
    {adding && <div className="lg-add">
      <label>Name, as the sheet spells it<input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Dan K" autoFocus /></label>
      <label>Joining month<input value={month} readOnly /></label>
      <span className="lg-seg">{(["member", "scribe"] as const).map((r) => <button key={r} type="button" aria-pressed={newRole === r} onClick={() => setNewRole(r)}>{r === "scribe" ? "Admin" : "Member"}</button>)}</span>
      <button type="button" className="ad-b ad-ink" disabled={busy || !newName.trim()} onClick={() => go(() => addMemberLive(handle, newName, newRole), `${newName.trim()} added`, (r) => { const slug = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); if (r.url) setLinks((l) => ({ ...l, [slug]: r.url! })); setNewName(""); setAdding(false); })}>Add and get link</button>
    </div>}
    <div className="lg-head"><span>Member</span><span>Sign-in</span><span>Role</span><span>Actions</span></div>
    {people.map((p) => {
      const first = p.name.split(" ")[0], role = roleOf(p), lastAdmin = p.admin && admins <= 1, link = links[p.slug] ?? p.invite?.url ?? null, inv = !!p.invite || !!links[p.slug];
      return <div key={p.slug} className="lg-row">
        <div className="lg-line">
          <div className="lg-who"><span className="lg-ini" style={{ background: p.dot }}>{p.ini}</span><span><b>{p.name}{p.self && <span> · you</span>}</b><span>{p.sub}</span></span></div>
          <div className="lg-sign">{p.signedIn ? <><i className="lg-dot in" />Signed in · since {p.signedIn}</> : inv ? <span className="lg-inv">Invite out{p.invite ? ` · expires ${p.invite.expires}` : ""}</span> : <><i className="lg-dot none" />No sign-in yet</>}</div>
          <div className="lg-role">{p.self ? <span className="lg-fixed">Admin · can&apos;t change</span>
            : <span className="lg-seg">{(["member", "scribe"] as const).map((r) => <button key={r} type="button" aria-pressed={role === r} disabled={busy || (lastAdmin && r === "member")} title={lastAdmin && r === "member" ? "The club needs at least one admin." : undefined} onClick={() => pick(p, r)}>{r === "scribe" ? "Admin" : "Member"}</button>)}</span>}</div>
          <div className="lg-acts">
            {!p.signedIn && !inv && <button type="button" className="ad-b ad-ink lg-sm" disabled={busy} onClick={() => go(() => inviteLive(handle, p.slug, p.name, role), `Link ready for ${first}`, (r) => r.url && setLinks((l) => ({ ...l, [p.slug]: r.url! })))}>Get invite link</button>}
            {inv && <>{link && <button type="button" className="ad-b lg-sm" onClick={() => copy(p.slug, link)}>{copied === p.slug ? "Copied ✓" : "Copy link"}</button>}
              {p.invite && <button type="button" className="lg-text" disabled={busy} onClick={() => go(() => cancelInviteLive(handle, p.invite!.id), "Invite cancelled", () => setLinks((l) => { const n = { ...l }; delete n[p.slug]; return n; }))}>Cancel invite</button>}</>}
            {p.signedIn && !links[p.slug] && <button type="button" className="lg-text" disabled={busy} onClick={() => go(() => resetSignInLive(handle, p.slug, p.name, role), `New link for ${first}`, (r) => r.url && setLinks((l) => ({ ...l, [p.slug]: r.url! })))}>Reset sign-in</button>}
            {!p.self && !lastAdmin && <button type="button" className="lg-retire" onClick={() => setRetiring(retiring === p.slug ? null : p.slug)}>Retire</button>}
          </div>
        </div>
        {inv && link && <div className="lg-link"><span>Text this to {first}. It works once.</span><code>{link}</code></div>}
        {retiring === p.slug && <div className="lg-confirm"><span>Retire <b>{p.name}</b>? Their sign-in stops. Scores and words stay in the history, and you can bring them back any time.</span>
          <button type="button" className="ad-b lg-sm" onClick={() => setRetiring(null)}>Keep</button><button type="button" className="ad-b ad-danger lg-sm" disabled={busy} onClick={() => { setRetiring(null); go(() => retireLive(handle, p.slug), `${first} retired`); }}>Retire {first}</button></div>}
      </div>;
    })}
    <div className="lg-past">
      <button type="button" className="lg-pastbtn" onClick={() => setPastOpen(!pastOpen)}>{pastOpen ? "▾" : "▸"} Past members · {past.length}<span>· their scores and words stay in the history</span></button>
      {pastOpen && <div className="lg-pastlist">{past.map((p) => <div key={p.slug}><span className="lg-ini" style={{ background: p.dot }}>{p.ini}</span><span><b>{p.name}</b><span>{p.sub}</span></span>
        <button type="button" className="ad-b lg-sm" disabled={busy} onClick={() => go(() => bringBackLive(handle, p.slug), `${p.name.split(" ")[0]} is back`)}>Bring back</button></div>)}</div>}
    </div>

    <dialog ref={dlg} className="lg-dlg" onClose={() => setAsk(null)}>
      {ask && <><b>{ask.role === "scribe" ? `Make ${ask.p.name} an admin?` : `Make ${ask.p.name} a member?`}</b>
        <p>{ask.role === "scribe" ? `${ask.p.name.split(" ")[0]} will see the Admin page and can change every month, every score, every member and the club's settings.` : `${ask.p.name.split(" ")[0]} will lose the Admin page. Their scores and words don't change.`}</p>
        <div><button type="button" className="ad-b" onClick={() => dlg.current?.close()}>Cancel</button><button type="button" className="ad-b ad-ink" onClick={confirm}>{ask.role === "scribe" ? "Make admin" : "Make member"}</button></div></>}
    </dialog>
  </section>;
}
