import { cookies } from "next/headers";
import type { Viewer } from "./studio";

export const COOKIE = { session: "bc_session", club: "bc_club", verifier: "bc_pkce" };

/** The session counts only on the club it belongs to; on any other club's URL the visitor is public (§4). */
export async function viewerFor(handle: string): Promise<Viewer> {
  const c = await cookies();
  const session = c.get(COOKIE.session)?.value, club = c.get(COOKIE.club)?.value;
  return session && club === handle ? { kind: "member", handle, session } : { kind: "public", handle };
}
