import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authorizeUrl } from "@/lib/studio";
import { COOKIE } from "@/lib/viewer";

export async function GET(req: Request) {
  const back = new URL(req.url).searchParams.get("back") ?? "/";
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  (await cookies()).set(COOKIE.verifier, verifier, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  const ret = `${process.env.SITE_URL}/auth/callback`;
  return NextResponse.redirect(authorizeUrl(ret, back.startsWith("/") ? back : "/", challenge), 303);
}
