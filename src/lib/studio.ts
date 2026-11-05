// Site → Studio (design Appendix B). Server only; the site token never reaches the browser.
const STUDIO = () => process.env.STUDIO_URL ?? "https://db.byoaistudio.com";
const TOKEN = () => process.env.BYOAI_SITE_TOKEN ?? "";
export const SITE = "bookclub";

export class StudioError extends Error { constructor(m: string, public status: number) { super(m); } }
export type Row = Record<string, any>;
export type Stmt = { sql: string; params?: unknown[] };
export type Viewer = { kind: "public"; handle: string } | { kind: "member"; handle: string; session: string };

const publicCache = new Map<string, { at: number; v: { rows: Row[][]; change: string | null } }>();

async function post(path: string, headers: Record<string, string>, body: unknown) {
  const r = await fetch(STUDIO() + path, { method: "POST", cache: "no-store", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  const text = await r.text();
  let j: any; try { j = JSON.parse(text); } catch { j = { error: text }; }
  if (!r.ok) throw new StudioError(typeof j.error === "string" ? j.error : text, r.status);
  return j;
}

const objects = (res: any): Row[] => res.rows
  ? res.rows.map((row: unknown[]) => Object.fromEntries(res.columns.map((c: { name: string }, i: number) => [c.name, row[i]]))) : [];

/** One transaction. Public reads are cached 60 s here, per handle and batch (§4.4). */
export async function sql(v: Viewer, statements: Stmt[]) {
  if (v.kind === "member") {
    const j = await post("/sql", { "x-site": SITE, "x-session": v.session }, { statements });
    return { rows: (j.results as unknown[]).map(objects), change: (j.change_id as string | null) ?? null };
  }
  const key = v.handle + JSON.stringify(statements);
  const hit = publicCache.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.v;
  const j = await post("/sql", { authorization: `Bearer ${TOKEN()}`, "x-public-space": v.handle }, { statements });
  const out = { rows: (j.results as unknown[]).map(objects), change: null };
  publicCache.set(key, { at: Date.now(), v: out });
  return out;
}

export async function studio(v: Extract<Viewer, { kind: "member" }>, path: string, init: { method?: string; body?: unknown } = {}) {
  const r = await fetch(STUDIO() + path, {
    method: init.method ?? "GET", cache: "no-store",
    headers: { "x-site": SITE, "x-session": v.session, ...(init.body ? { "content-type": "application/json" } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (r.status === 204) return null;
  const t = await r.text();
  let j: any; try { j = JSON.parse(t); } catch { j = t; }
  if (!r.ok) throw new StudioError(j?.error ?? t, r.status);
  return j;
}

export const authorizeUrl = (ret: string, state: string, challenge: string) =>
  `${STUDIO()}/authorize?site=${SITE}&return=${encodeURIComponent(ret)}&state=${encodeURIComponent(state)}&code_challenge=${challenge}&code_challenge_method=S256`;
export const exchangePkce = (code: string, code_verifier: string) => post("/site/session", {}, { site: SITE, code, code_verifier });
export const exchangeJoin = (code: string) => post("/site/session", { authorization: `Bearer ${TOKEN()}` }, { code });
export const logout = (session: string) => post("/site/logout", { "x-site": SITE, "x-session": session }, {}).catch(() => null);
