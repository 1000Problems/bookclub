import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeJoin, exchangePkce } from "@/lib/studio";
import { COOKIE } from "@/lib/viewer";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const code = q.get("code") ?? "", state = q.get("state") ?? "/";
  const site = process.env.SITE_URL!;
  const jar = await cookies();
  const verifier = jar.get(COOKIE.verifier)?.value;
  const s = state === "join" ? await exchangeJoin(code) : verifier ? await exchangePkce(code, verifier) : null;
  if (!s) return NextResponse.redirect(`${site}/`, 303);
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: site.startsWith("https"), path: "/", expires: new Date(s.expires_at) };
  jar.set(COOKIE.session, s.session, opts);
  jar.set(COOKIE.club, s.handle, opts);
  jar.delete(COOKIE.verifier);
  const page = state.startsWith(`/c/${s.handle}`) ? state : `/c/${s.handle}`;
  return NextResponse.redirect(site + page, 303);
}
