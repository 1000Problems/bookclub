import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logout } from "@/lib/studio";
import { COOKIE } from "@/lib/viewer";

export async function POST() {
  const jar = await cookies();
  const s = jar.get(COOKIE.session)?.value;
  if (s) await logout(s);
  jar.delete(COOKIE.session); jar.delete(COOKIE.club);
  return NextResponse.redirect(`${process.env.SITE_URL}/`, 303);
}
