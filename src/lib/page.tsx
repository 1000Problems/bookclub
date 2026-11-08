import { PageHead } from "@/components/ui";
import Link from "next/link";
import { undo } from "./actions";
import { sql, StudioError, type Row, type Stmt, type Viewer } from "./studio";
import { viewerFor } from "./viewer";

export type Page = { params: Promise<Record<string, string>>; searchParams: Promise<Record<string, string | undefined>> };
export const base = (_h: string) => "";

export const MembersOnly = () => <div className="card p-6"><p className="muted">This club is members-only.</p></div>;

/** rows = null means Studio said the club is private (or doesn't exist): the same one card either way (SC6). */
export async function load(who: string | Viewer, st: (v: Viewer) => Stmt[]): Promise<{ v: Viewer; rows: Row[][] | null; signedIn: boolean }> {
  const v = typeof who === "string" ? await viewerFor(who) : who, handle = v.handle;
  try {
    return { v, rows: (await sql(v, st(v))).rows, signedIn: v.kind === "member" };
  } catch (e) {
    if (e instanceof StudioError && e.status === 403) return { v, rows: null, signedIn: false };
    if (e instanceof StudioError && e.status === 401 && v.kind === "member") return load({ kind: "public", handle }, st);   // a dead session reads as signed out
    throw e;
  }
}

/** For pages that call sql() before load(): a dead session reads as signed out. */
export async function liveViewer(handle: string): Promise<Viewer> {
  const v = await viewerFor(handle);
  if (v.kind !== "member") return v;
  try { await sql(v, [{ sql: "select 1" }]); return v; }
  catch (e) { if (e instanceof StudioError && e.status === 401) return { kind: "public", handle }; throw e; }
}

export function Notice({ q, handle, here }: { q: Record<string, string | undefined>; handle: string; here: string }) {
  return <>
    {q.e && <p role="alert" className="card-lift p-4 mb-3" style={{ color: "var(--trap-ink)", background: "var(--trap-bg)" }}>{q.e}</p>}
    {q.undo && <form action={undo} className="card-lift p-3 mb-3 flex items-center justify-between">
      <span className="muted">Saved.</span>
      <input type="hidden" name="handle" value={handle} /><input type="hidden" name="back" value={here} /><input type="hidden" name="change" value={q.undo} />
      <button className="btn btn-ghost">Undo</button>
    </form>}
  </>;
}
export const Hidden = ({ handle, back }: { handle: string; back: string }) => <><input type="hidden" name="handle" value={handle} /><input type="hidden" name="back" value={back} /></>;
export const Title = ({ children, eyebrow }: { children: React.ReactNode; eyebrow?: string }) => <PageHead eyebrow={eyebrow} title={children} />;
export const L = Link;
/** A member's name: a link to their page when signed in, plain text otherwise (PUBLIC-FRONT-v1). */
export const Who = ({ on, slug, className, style, children }: { on: boolean; slug: string; className?: string; style?: React.CSSProperties; children: React.ReactNode }) =>
  on ? <Link href={`/members/${slug}`} className={className} style={style}>{children}</Link> : <span className={className} style={style}>{children}</span>;
export const SignInToSee = () => <div className="sc-narrow"><div className="sc-panel"><p className="muted">Sign in to see the members.</p><a className="btn btn-ink" href="/auth/signin">Sign in</a></div></div>;
