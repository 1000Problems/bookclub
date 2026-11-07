import { CLUB } from "@/lib/club";
import { L, load, MembersOnly, Title } from "@/lib/page";
import { studio } from "@/lib/studio";
import { ago } from "@/lib/text";

const ROLE: Record<string, string> = { scribe: "Admin", member: "Member", alumni: "Alumni", guest: "Guest" };
const STATUS: Record<string, string> = { active: "Active", alumni: "Past member", guest: "Guest" };

export default async function Account() {
  const { v, rows, signedIn } = await load(CLUB, (x) => x.kind === "member"
    ? [{ sql: "select slug, name, role, status from me" }, { sql: "select count(*)::int n from members where slug = me()" }] : [{ sql: "select 1" }]);
  if (!rows && !signedIn) return <MembersOnly />;
  if (!signedIn || v.kind !== "member") return <><Title eyebrow="Account">Account</Title><div className="card p-4"><p className="muted mb-3">Sign in to see your account.</p><a className="btn btn-ink" href="/auth/signin?back=/account">Sign in</a></div></>;
  const me = rows?.[0]?.[0], listed = rows?.[1]?.[0]?.n > 0;
  const c = await studio(v, "/site/connection").catch(() => null);
  const ai = c?.state === "connected" ? `Connected · ${c.last_used_at ? `last used ${ago(c.last_used_at)}` : "not used yet"}` : c?.state === "code_open" ? "Code waiting" : "Not connected";
  const Line = ({ k, children }: { k: string; children: React.ReactNode }) => <div className="flex justify-between gap-3"><span className="muted">{k}</span><span>{children}</span></div>;
  return <><Title eyebrow="Account">Account</Title>
    <section className="card p-4 grid gap-2"><Line k="Name">{me?.name ?? "—"}</Line><Line k="Role">{ROLE[me?.role] ?? me?.role ?? "—"}</Line><Line k="Status">{STATUS[me?.status] ?? me?.status ?? "—"}</Line>
      {listed && <L href={`/members/${me?.slug}`}>Your member page</L>}</section>
    <section className="card p-4 mt-3 grid gap-2"><Line k="Your AI">{ai}</Line><L href="/account/ai">{c?.state === "connected" ? "Manage your AI" : "Connect your AI"}</L></section>
    <form method="post" action="/auth/signout" className="mt-3"><button className="btn btn-ghost">Sign out</button></form></>;
}
