import Link from "next/link";
import { undo } from "./actions";
import { sql, StudioError, type Row, type Stmt, type Viewer } from "./studio";
import { viewerFor } from "./viewer";

export type Page = { params: Promise<Record<string, string>>; searchParams: Promise<Record<string, string | undefined>> };
export const base = (h: string) => `/c/${h}`;

export const MembersOnly = () => <div className="card p-6"><p className="muted">This club is members-only.</p></div>;

/** rows = null means Studio said the club is private (or doesn't exist): the same one card either way (SC6). */
export async function load(handle: string, st: (v: Viewer) => Stmt[]): Promise<{ v: Viewer; rows: Row[][] | null; signedIn: boolean }> {
  const v = await viewerFor(handle);
  try {
    return { v, rows: (await sql(v, st(v))).rows, signedIn: v.kind === "member" };
  } catch (e) {
    if (e instanceof StudioError && e.status === 403) return { v, rows: null, signedIn: false };
    throw e;
  }
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
export const Title = ({ children }: { children: React.ReactNode }) => <h1 className="serif text-3xl mb-4">{children}</h1>;
export const L = Link;
