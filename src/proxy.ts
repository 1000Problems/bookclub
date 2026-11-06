import { NextResponse, type NextRequest } from "next/server";

/** Tells the header which tab is on. */
export function proxy(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-sc-path", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ["/((?!_next|api|auth|authors|favicon).*)"] };
