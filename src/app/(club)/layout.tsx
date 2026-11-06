import { headers } from "next/headers";
import { CLUB } from "@/lib/club";
import { L, load } from "@/lib/page";

export default async function Club({ children }: { children: React.ReactNode }) {
  const { rows, signedIn } = await load(CLUB, (v) => [{ sql: "select name from club" }, ...(v.kind === "member" ? [{ sql: "select slug, name, role from me" }] : [])]);
  const me = rows?.[1]?.[0];
  const path = (await headers()).get("x-sc-path") ?? "";
  const tabs: [string, string, boolean][] = [["Home", "/", /^\/($|m\/|b\/|author)/.test(path)], ["Members", "/members", path.startsWith("/members")],
    ...(me?.role === "scribe" ? [["Admin", "/admin", path.startsWith("/admin")] as [string, string, boolean]] : [])];
  return <>
    <header className="sc-top"><div className="sc-top-in">
      <div className="flex items-center gap-3.5 min-w-0">
        <L href="/" className="sc-brand" aria-label="Soul Crushers"><span className="sc-brand-long">Soul Crushers</span><span className="sc-brand-short">SC</span><i>.</i></L>
        <nav className="flex gap-0.5">{tabs.map(([t, h, on]) => <L key={h} href={h} className={`sc-tab${on ? " on" : ""}`}>{t}</L>)}</nav>
      </div>
      {signedIn ? <L href="/account" className="sc-pill">{me?.name}</L> : <a className="sc-pill" href="/auth/signin">Sign in</a>}
    </div></header>
    <main className="sc-main">{rows ? children : <div className="sc-narrow"><div className="sc-panel"><p className="muted">Members: sign in.</p><a className="btn btn-ink" href="/auth/signin">Sign in</a></div></div>}</main>
    <footer className="sc-foot"><L href="/talk">Talk</L><L href="/stats">Stats</L><L href="/next">Next book</L><L href="/about">About</L></footer>
  </>;
}
