import { L, base, load } from "@/lib/page";

export default async function Club({ children, params }: { children: React.ReactNode; params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const { rows, signedIn } = await load(handle, (v) => [{ sql: "select name, about from club" }, ...(v.kind === "member" ? [{ sql: "select slug, name, role from me" }] : [])]);
  const club = rows?.[0][0], me = rows?.[1]?.[0], b = base(handle);
  const nav = [["Home", b], ["History", `${b}/history`], ["Stats", `${b}/stats`], ["Talk", `${b}/talk`], ["Club", `${b}/club`]];
  if (!rows) return <main className="mx-auto max-w-xl p-4"><div className="card p-6"><p className="muted">Members: sign in.</p><a className="btn btn-ink mt-4" href={`/auth/signin?back=${b}`}>Sign in</a></div></main>;
  return (
    <div className="mx-auto max-w-xl p-4 pb-24">
      <header className="flex items-center justify-between mb-4">
        <L href={b} className="serif text-xl">{club?.name}</L>
        {signedIn ? <span className="muted text-sm">{me?.name}</span> : <a className="btn btn-ghost" href={`/auth/signin?back=${b}`}>Sign in</a>}
      </header>
      {children}
      <nav className="fixed bottom-0 left-0 right-0 flex justify-around p-2" style={{ background: "var(--surface)", boxShadow: "var(--ring)" }}>
        {nav.map(([t, h]) => <L key={h} href={h} className="btn btn-ghost">{t}</L>)}
      </nav>
    </div>
  );
}
