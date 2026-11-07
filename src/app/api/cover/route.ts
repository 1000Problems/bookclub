/** Book covers through our own site. Open Library bounces every cover to archive.org (2–13 s, never cached by the
 *  browser), so each refresh started over. Here the first request fetches it once; Vercel's CDN and the browser keep it. */
const HOSTS = [/^covers\.openlibrary\.org$/, /(^|\.)archive\.org$/, /^books\.google\.com$/, /(^|\.)googleusercontent\.com$/, /^upload\.wikimedia\.org$/, /(^|\.)media-amazon\.com$/, /(^|\.)ssl-images-amazon\.com$/];
const YEAR = "public, max-age=31536000, s-maxage=31536000, immutable";

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("u") ?? "";
  let u: URL;
  try { u = new URL(raw); } catch { return new Response("bad url", { status: 400 }); }
  // Not a cover host we know: send the browser there directly instead of acting as an open proxy.
  if (u.protocol !== "https:" || !HOSTS.some((h) => h.test(u.hostname))) return Response.redirect(u.toString(), 307);
  try {
    const r = await fetch(u, { redirect: "follow", signal: AbortSignal.timeout(25_000), headers: { "user-agent": "SoulCrushersBookClub/1.0 (bookclub.hadmoney.com)" } });
    const type = r.headers.get("content-type") ?? "";
    if (!r.ok || !type.startsWith("image/")) return fallback(u, `${r.status} ${type} ${r.url}`);
    return new Response(r.body, { headers: { "content-type": type, "cache-control": YEAR } });
  } catch (e) {
    return fallback(u, String(e).slice(0, 200));
  }
}

/** Anything goes wrong: the browser fetches the cover itself, as before, and nothing is cached. */
const fallback = (u: URL, why: string) => new Response(null, { status: 307, headers: { location: u.toString(), "cache-control": "no-store", "x-cover-upstream": why.replace(/[^\x20-\x7e]/g, "") } });
