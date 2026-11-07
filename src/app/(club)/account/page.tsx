import { CLUB } from "@/lib/club";
import { L, load, MembersOnly } from "@/lib/page";
import { PageHead } from "@/components/ui";
import { tint } from "@/lib/record";
import { studio } from "@/lib/studio";
import { ago } from "@/lib/text";

const ROLE: Record<string, string> = { scribe: "Admin", member: "Member", alumni: "Alumni", guest: "Guest" };
const STATUS: Record<string, string> = { active: "Active", alumni: "Past member", guest: "Guest" };

/** Account (Claude Design "Account & AI page redesign" 1b): PageHead, two cards, rows that open things. */
export default async function Account() {
  const { v, rows, signedIn } = await load(CLUB, (x) => x.kind === "member"
    ? [{ sql: "select slug, name, role, status from me" }, { sql: "select count(*)::int n from members where slug = me()" }] : [{ sql: "select 1" }]);
  if (!rows && !signedIn) return <MembersOnly />;
  if (!signedIn || v.kind !== "member") return <div className="sc-col" style={{ gap: 16 }}><PageHead title="Account" sub="Sign in to see your account." right={<a className="btn btn-ink" href="/auth/signin?back=/account">Sign in</a>} /></div>;
  const me = rows?.[0]?.[0], listed = rows?.[1]?.[0]?.n > 0, name: string = me?.name ?? "—";
  const c = await studio(v, "/site/connection").catch(() => null);
  const ai = c?.state === "connected" ? `Connected · ${c.last_used_at ? `last used ${ago(c.last_used_at)}` : "not used yet"}` : "Not connected · optional, the site works without it";
  const ini = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return <div className="sc-col" style={{ gap: 16 }}>
    <PageHead title="Account" sub={`Signed in as ${name}`} right={<form method="post" action="/auth/signout"><button className="btn">Sign out</button></form>} />
    <div className="ac-grid">
      <section className="sc-box ac-card">
        <div className="ac-who"><span className="ac-ini" style={{ background: tint(name, 0.85, 0.08) }}>{ini}</span><span><b>{name}</b><span className="sc-small">{ROLE[me?.role] ?? me?.role ?? "—"} · {STATUS[me?.status] ?? me?.status ?? "—"}</span></span></div>
        <div className="ac-row"><span>Role</span><b>{ROLE[me?.role] ?? me?.role ?? "—"}</b></div>
        <div className="ac-row"><span>Status</span><b>{STATUS[me?.status] ?? me?.status ?? "—"}</b></div>
        {listed && <L href={`/members/${me?.slug}`} className="ac-row ac-link"><span>Member page</span><b>Open →</b></L>}
      </section>
      <section className="sc-box ac-card">
        <L href="/ai" className="ac-row ac-link ac-ai"><span className="sc-col" style={{ gap: 2 }}><b className="sc-t3">Your AI</b><span className="sc-small">{ai}</span></span><b>{c?.state === "connected" ? "Manage →" : "Connect →"}</b></L>
      </section>
    </div>
  </div>;
}
