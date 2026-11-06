"use server";
import { redirect } from "next/navigation";
import { sql, studio, StudioError, type Stmt } from "./studio";
import { viewerFor } from "./viewer";

const f = (d: FormData, k: string) => { const v = d.get(k); return typeof v === "string" && v !== "" ? v : null; };
const num = (d: FormData, k: string) => { const v = f(d, k); return v === null ? null : Number(v); };

function back(d: FormData, q: Record<string, string>) {
  const b = f(d, "back") ?? "/";
  const u = new URL(b, "http://x");
  for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
  return u.pathname + u.search + u.hash;
}

async function member(d: FormData) {
  const v = await viewerFor(f(d, "handle") ?? "");
  if (v.kind !== "member") redirect(back(d, { e: "Members: sign in." }));
  return v;
}

/** One request = one change = one Undo. Studio's one-liner shows verbatim on failure. */
async function run(d: FormData, statements: Stmt[], undoable = true) {
  const v = await member(d);
  let to: string;
  try {
    const r = await sql(v, statements);
    to = back(d, undoable && r.change ? { undo: r.change } : {});
  } catch (e) {
    if (!(e instanceof StudioError)) throw e;
    to = back(d, { e: e.message });
  }
  redirect(to);
}
async function call(d: FormData, path: string, method: string, body?: unknown, ok: Record<string, string> = {}) {
  const v = await member(d);
  let to: string;
  try { await studio(v, path, { method, body }); to = back(d, ok); }
  catch (e) { if (!(e instanceof StudioError)) throw e; to = back(d, { e: e.message }); }
  redirect(to);
}

export async function undo(d: FormData) { await call(d, "/undo", "POST", { change_id: f(d, "change") }); }

export async function saveRsvp(d: FormData) {
  await run(d, [{ sql: `insert into rsvps (meeting, status, guests, bringing) values ($1,$2,$3,$4) on conflict (meeting, member) do update
    set status = excluded.status, guests = excluded.guests, bringing = excluded.bringing, updated_at = now()`,
    params: [f(d, "meeting"), f(d, "status"), num(d, "guests") ?? 0, f(d, "bringing")] }]);
}
export async function post(d: FormData) {
  await run(d, [{ sql: "insert into posts (thread, body) values ($1, $2) returning id, created_at", params: [f(d, "thread") ?? "club", f(d, "body")] }]);
}
export async function editPost(d: FormData) {
  await run(d, [{ sql: "update posts set body = $2, edited_at = now() where id = $1", params: [f(d, "id"), f(d, "body")] }]);
}
export async function hidePost(d: FormData) {
  await run(d, [{ sql: "update posts set hidden_by = me() where id = $1", params: [f(d, "id")] }]);
}
export async function markRead(d: FormData) {
  await run(d, [{ sql: "insert into reads (thread, last_read_at) values ($1, now()) on conflict (thread, member) do update set last_read_at = excluded.last_read_at", params: [f(d, "thread") ?? "club"] }], false);
}
export async function hideChecklist(d: FormData) {
  await run(d, [{ sql: "insert into prefs (member, ai_checklist_hidden_at) values (me(), now()) on conflict (member) do update set ai_checklist_hidden_at = excluded.ai_checklist_hidden_at" }], false);
}
export async function saveLogistics(d: FormData) {
  const bring = (f(d, "bring") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  await run(d, [
    { sql: "update meetings set meets_at = $2, venue_label = $3, host_line = $4, bring = $5 where slug = $1", params: [f(d, "meeting"), f(d, "meets_at"), f(d, "venue_label"), f(d, "host_line"), bring] },
    { sql: `insert into meeting_private (meeting, address, directions, parking) values ($1,$2,$3,$4) on conflict (meeting)
      do update set address = excluded.address, directions = excluded.directions, parking = excluded.parking`, params: [f(d, "meeting"), f(d, "address"), f(d, "directions"), f(d, "parking")] },
  ]);
}
export async function setMeeting(d: FormData) {
  await run(d, [{ sql: "insert into meetings (slug, month, status, book, host) values ($1, ($1 || '-01')::date, 'planned', $2, $3)", params: [f(d, "slug"), f(d, "book"), f(d, "host")] }]);
}
export async function saveScore(d: FormData) {
  const a = f(d, "attendance") ?? "voted";
  await run(d, [{ sql: `insert into votes (meeting, attendance, score, word, miss_reason, source) values ($1,$2,$3,$4,$5,'me') on conflict (meeting, member) do update
    set attendance = excluded.attendance, score = excluded.score, word = excluded.word, miss_reason = excluded.miss_reason, source = excluded.source`,
    params: [f(d, "meeting"), a, num(d, "score"), f(d, "word")?.trim() ?? null, f(d, "miss_reason")] }]);
}
const CODE_ATTENDANCE: Record<string, string> = { "n/a": "out", hbb: "unfinished", "no vote": "missed" };
export async function saveTable(d: FormData) {
  const rows = d.getAll("member").map(String).flatMap((m) => {
    const a = f(d, `a:${m}`), s = f(d, `s:${m}`);
    if (!a && !s) return [];
    // Scribe's sheet codes: the option value is "code:<sheet code>". enter_votes ignores a code from anyone else.
    const code = a?.startsWith("code:") ? a.slice(5) : null;
    return [{ member: m, attendance: code ? CODE_ATTENDANCE[code] : a ?? "voted", score: s === null ? null : Number(s), word: f(d, `w:${m}`), miss_reason: f(d, `r:${m}`), sheet_code: code }];
  });
  const name = f(d, "guest"), slug = name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-guest";
  const st: Stmt[] = [];
  if (name) {
    st.push({ sql: "insert into members (slug, name, status) values ($1, $2, 'guest') on conflict (slug) do nothing", params: [slug, name] });
    rows.push({ member: slug, attendance: "voted", score: num(d, "gscore"), word: f(d, "gword"), miss_reason: null, sheet_code: null });
  }
  st.push({ sql: "select enter_votes($1, $2)", params: [f(d, "meeting"), JSON.stringify(rows)] });
  await run(d, st);
}
export async function scoring(d: FormData) { await run(d, [{ sql: "select scoring_set($1, $2)", params: [f(d, "meeting"), f(d, "to")] }]); }

export async function addCandidate(d: FormData) {
  const title = f(d, "title") ?? "", author = f(d, "author");
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  await run(d, [
    { sql: "insert into books (slug, title, author) values ($1, $2, $3) on conflict (slug) do nothing", params: [slug, title, author] },
    { sql: "insert into candidates (slate, book, pitch) values ($1, $2, $3)", params: [f(d, "slate"), slug, f(d, "pitch")] },
  ]);
}
export async function dropCandidate(d: FormData) { await run(d, [{ sql: "delete from candidates where slate = $1 and book = $2", params: [f(d, "slate"), f(d, "book")] }]); }
export async function startSlate(d: FormData) { await run(d, [{ sql: "insert into slates (at_meeting, picks_for) values ($1, null)", params: [f(d, "meeting")] }]); }
export async function openBallot(d: FormData) { await run(d, [{ sql: "select * from open_ballot($1, null)", params: [f(d, "slate")] }], false); }
export async function closeBallot(d: FormData) { await run(d, [{ sql: "select * from close_ballot($1)", params: [f(d, "slate")] }], false); }
export async function reopenBallot(d: FormData) { await run(d, [{ sql: "select reopen_ballot($1)", params: [f(d, "slate")] }], false); }
export async function pick(d: FormData) { await run(d, [{ sql: "select pick($1, $2, null)", params: [f(d, "slate"), f(d, "book")] }], false); }
/** Alone in its request, always (Appendix B). */
export async function castBallot(d: FormData) {
  await run(d, [{ sql: "select * from cast_ballot($1, $2, $3, $4)", params: [f(d, "slate"), f(d, "first"), f(d, "second"), f(d, "third")] }], false);
}

export async function saveSettings(d: FormData) {
  const pub = f(d, "visibility") === "public";
  const v = await member(d);
  let to = back(d, {});
  try {
    await studio(v, "/club/visibility", { method: "PUT", body: { public: pub } });
    await sql(v, [{ sql: `update club set visibility = $1, public_talk = $2, public_scores = $3, score_reveal = $4, talk_visible_to_ai = $5, slate_size = $6`,
      params: [pub ? "public" : "members", d.has("public_talk"), d.has("public_scores"), f(d, "score_reveal"), d.has("talk_visible_to_ai"), num(d, "slate_size")] }]);
  } catch (e) { if (!(e instanceof StudioError)) throw e; to = back(d, { e: e.message }); }
  redirect(to);
}
export async function addRoster(d: FormData) {
  const name = f(d, "name") ?? "";
  await run(d, [{ sql: "insert into members (slug, name, status, joined_on) values ($1, $2, 'active', current_date)", params: [name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name] }]);
}
export async function invite(d: FormData) {
  const v = await member(d);
  let to: string;
  try {
    const r = await studio(v, "/club/invites", { method: "POST", body: { member_slug: f(d, "slug"), role: "member", name: f(d, "name") } });
    to = back(d, { invite: r.url });
  } catch (e) { if (!(e instanceof StudioError)) throw e; to = back(d, { e: e.message }); }
  redirect(to);
}
export async function removeMember(d: FormData) {
  const slug = f(d, "slug");
  const v = await member(d);
  let to = back(d, {});
  try {
    await studio(v, `/club/members/${slug}`, { method: "DELETE" });
    await sql(v, [{ sql: "update members set status = 'alumni', left_on = current_date where slug = $1", params: [slug] }]);
  } catch (e) { if (!(e instanceof StudioError)) throw e; to = back(d, { e: e.message }); }
  redirect(to);
}
export async function getCode(d: FormData) {
  const v = await member(d);
  const r = await studio(v, "/site/connection/code", { method: "POST" });
  redirect(back(d, { code: r.code }));
}
export async function disconnectAi(d: FormData) { await call(d, "/site/connection", "DELETE"); }

/* Direct edits from the home page and the book page. */
export async function saveHero(d: FormData) {
  const at = f(d, "meets_at");
  const bring = (f(d, "bring") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  await run(d, [{ sql: "update meetings set meets_at = $2, venue_label = $3, food = $4, bring = $5 where slug = $1",
    params: [f(d, "meeting"), at ? `${at.replace("T", " ")} America/Los_Angeles` : null, f(d, "venue_label"), f(d, "food"), bring] }]);
}
export async function setChat(d: FormData) { await run(d, [{ sql: "update club set public_talk = $1", params: [f(d, "public") === "1"] }], false); }
export async function saveBookDetails(d: FormData) {
  const st: Stmt[] = [
    { sql: "update books set title = $2, author = $3 where slug = $1", params: [f(d, "book"), f(d, "title"), f(d, "author")] },
    { sql: "update meetings set notes = $2 where slug = $1", params: [f(d, "meeting"), f(d, "notes")] },
  ];
  if (d.has("link_url")) st.push(   // scribe's fields
    { sql: "update book_sheet set link_url = $2, sheet_author = $3 where slug = $1", params: [f(d, "book"), f(d, "link_url"), f(d, "sheet_author")] },
    { sql: "update books set goodreads_avg = $2 where slug = $1", params: [f(d, "book"), num(d, "goodreads_avg")] });
  await run(d, st);
}

/* Sheet record (EXCEL-EXPORT-v1 §4). Studio refuses anyone but a scribe. */
export async function saveTitleStyle(d: FormData) {
  await run(d, [{ sql: "update meeting_sheet set title_color = $2, title_bold = $3 where slug = $1", params: [f(d, "meeting"), f(d, "title_color"), d.has("title_bold")] }]);
}
export async function saveMeetingSheet(d: FormData) {
  await run(d, [
    { sql: "update meeting_sheet set title_color = $2, title_bold = $3, no_score = $4 where slug = $1", params: [f(d, "meeting"), f(d, "title_color"), d.has("title_bold"), d.has("no_score")] },
    { sql: "update meetings set number = $2 where slug = $1", params: [f(d, "meeting"), num(d, "number")] },
  ]);
}
export async function saveMemberSheet(d: FormData) {
  await run(d, [
    { sql: "update member_sheet set sheet_label = $2 where slug = $1", params: [f(d, "slug"), f(d, "sheet_label")] },
    { sql: `insert into member_birthdays (member, birthday, birthday_text) values ($1, $2, $3) on conflict (member)
      do update set birthday = excluded.birthday, birthday_text = excluded.birthday_text`, params: [f(d, "slug"), f(d, "birthday"), f(d, "birthday_text")] },
  ]);
}

/* TASK-55: match club books to Commons ISBNs. Admin only (Studio refuses anyone else). */
export async function matchBooks(d: FormData) { await run(d, [{ sql: "select count(*) from match_isbn()" }], false); }
export async function setIsbn(d: FormData) { await run(d, [{ sql: "select set_isbn($1, $2)", params: [f(d, "book"), f(d, "isbn")] }]); }
