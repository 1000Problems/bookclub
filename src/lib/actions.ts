"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql, studio, StudioError, type Stmt } from "./studio";
import { viewerFor } from "./viewer";

const f = (d: FormData, k: string) => { const v = d.get(k); return typeof v === "string" && v !== "" ? v : null; };
const num = (d: FormData, k: string) => { const v = f(d, k); return v === null ? null : Number(v); };

function back(d: FormData, q: Record<string, string>) {
  revalidatePath("/", "layout");   // every action ends here: drop remembered pages so a save always shows
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
    const r = await studio(v, "/club/invites", { method: "POST", body: { member_slug: f(d, "slug"), role: f(d, "role") ?? "member", name: f(d, "name") } });
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
export async function saveMeetingSheet(d: FormData) {
  await run(d, [
    { sql: "update meeting_sheet set title_color = $2, title_bold = $3, no_score = $4 where slug = $1", params: [f(d, "meeting"), f(d, "title_color"), d.has("title_bold"), d.has("no_score")] },
    { sql: "update meetings set number = $2 where slug = $1", params: [f(d, "meeting"), num(d, "number")] },
  ]);
}
/** Every cell the sheet kept as typed (CLUB-ROLES-v1 §5). Blank means the export uses the site's value. */
export async function saveSheetCells(d: FormData) {
  const k = ["sheet_number", "sheet_title", "sheet_host", "sheet_score", "sheet_grx2", "sheet_voting"];
  await run(d, [{ sql: `update meeting_sheet set ${k.map((c, i) => `${c} = $${i + 2}`).join(", ")}, sheet_cells = $8::jsonb where slug = $1`, params: [f(d, "meeting"), ...k.map((c) => f(d, c)), f(d, "sheet_cells")] }]);
}
export async function saveVoteSheet(d: FormData) {
  await run(d, [{ sql: "update vote_sheet set sheet_code = $3, sheet_vote = $4, sheet_comment = $5 where meeting = $1 and member = $2", params: [f(d, "meeting"), f(d, "member"), f(d, "sheet_code"), f(d, "sheet_vote"), f(d, "sheet_comment")] }]);
}
export async function saveMemberSheet(d: FormData) {
  await run(d, [
    { sql: "update member_sheet set sheet_label = $2 where slug = $1", params: [f(d, "slug"), f(d, "sheet_label")] },
    { sql: `insert into member_birthdays (member, birthday, birthday_text) values ($1, $2, $3) on conflict (member)
      do update set birthday = excluded.birthday, birthday_text = excluded.birthday_text`, params: [f(d, "slug"), f(d, "birthday"), f(d, "birthday_text")] },
  ]);
}

/* The admin page. Studio refuses anyone but a scribe; the sheet columns are only reachable through its scribe views. */
const local = (d: FormData) => { const at = f(d, "meets_at"); return at ? `${at.replace("T", " ")} America/Los_Angeles` : null; };
const bringList = (d: FormData) => (f(d, "bring") ?? "").split(",").map((x) => x.trim()).filter(Boolean);

/** Five title/author rows → the month's slate, in the order shown. Candidates are read by added_at, so they're rewritten. */
function fiveBooks(d: FormData, slate: string) {
  const pairs: [string, string | null][] = [];
  for (let i = 0; i < 5; i++) { const t = f(d, `bt${i}`)?.trim(); if (t) pairs.push([t, f(d, `ba${i}`)?.trim() ?? null]); }
  const base = Date.now(), st: Stmt[] = [{ sql: "insert into slates (at_meeting) values ($1) on conflict (at_meeting) do nothing", params: [slate] }, { sql: "delete from candidates where slate = $1", params: [slate] }];
  pairs.forEach(([t, a], i) => {
    const bslug = t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    st.push({ sql: "insert into books (slug, title, author) select $1, $2, $3 where not exists (select 1 from books where lower(title) = lower($2)) on conflict (slug) do nothing", params: [bslug, t, a] },
      { sql: "insert into candidates (slate, book, added_at) select $1, (select slug from books where lower(title) = lower($2) order by slug limit 1), $3::timestamptz on conflict (slate, book) do nothing", params: [slate, t, new Date(base + i).toISOString()] });
  });
  return { st, n: pairs.length };
}
const fiveKey = (d: FormData) => [0, 1, 2, 3, 4].map((i) => `${f(d, `bt${i}`)?.trim() ?? ""}|${f(d, `ba${i}`)?.trim() ?? ""}`).join("¦");
/** The host's card on Home: only the fields hosts may change. "Post the five" also opens voting. */
export async function saveHostMeeting(d: FormData) {
  const slug = f(d, "meeting")!, slate = f(d, "slate") ?? slug;
  const st: Stmt[] = [{ sql: "update meetings set meets_at = $2, venue_label = $3, food = $4, bring = $5 where slug = $1", params: [slug, local(d), f(d, "venue_label"), f(d, "food"), bringList(d)] }];
  const five = d.has("ballot") ? fiveBooks(d, slate) : null;
  if (five) st.push(...five.st);
  const post = d.get("post") === "1";
  if (post && five && five.n < 5) redirect(back(d, { e: "Add all five books first." }));
  if (post && five) st.push({ sql: "select * from open_ballot($1, null)", params: [slate] });
  await run(d, st, !post);
}
export async function saveMeetingAdmin(d: FormData) {
  const slug = f(d, "meeting")!, book = f(d, "book"), details = d.has("details");
  const status = details ? f(d, "status") : d.has("skip") ? "skipped" : f(d, "status") === "skipped" ? "planned" : f(d, "status");
  const st: Stmt[] = [];
  if (!f(d, "exists")) st.push({ sql: "insert into meetings (slug, month, status) values ($1, ($1 || '-01')::date, $2)", params: [slug, status] });
  st.push(details ? { sql: "update meetings set host = $2, notes = $3 where slug = $1", params: [slug, f(d, "host"), f(d, "notes")] }
    : { sql: "update meetings set host = $2, notes = $3, status = $4, meets_at = $5, venue_label = $6, food = $7, bring = $8 where slug = $1", params: [slug, f(d, "host"), f(d, "notes"), status, local(d), f(d, "venue_label"), f(d, "food"), bringList(d)] });
  if (d.has("number")) st.push({ sql: "update meetings set number = $2 where slug = $1", params: [slug, num(d, "number")] },
    { sql: "update meeting_sheet set no_score = $2 where slug = $1", params: [slug, d.has("no_score")] });
  if (d.has("title_color")) st.push({ sql: "update meeting_sheet set title_color = $2, title_bold = $3 where slug = $1", params: [slug, f(d, "title_color"), d.has("title_bold")] });
  // A posted slate goes back to drafting only if its books really changed: that clears the rankings.
  const post = d.get("post") === "1";
  let posted = false;
  if (d.has("ballot")) {
    const five = fiveBooks(d, slug), was = f(d, "slate_status"), changed = fiveKey(d) !== f(d, "five_was");
    if (post && five.n < 5) redirect(back(d, { e: "Add all five books first." }));
    if (!was || was === "drafting" || changed) {
      if (was && was !== "drafting") st.push({ sql: "select redraft_slate($1)", params: [slug] });
      st.push(...five.st);
      if (post) { st.push({ sql: "select * from open_ballot($1, null)", params: [slug] }); posted = true; }
    }
  }
  if (book && d.has("link_url")) st.push({ sql: "update book_sheet set link_url = $2, sheet_author = $3 where slug = $1", params: [book, f(d, "link_url"), f(d, "sheet_author")] },
    { sql: "update books set goodreads_avg = $2 where slug = $1", params: [book, num(d, "goodreads_avg")] });
  await run(d, st, !posted && !st.some((x) => x.sql.includes("redraft_slate")));
}
const STATUS: Record<string, string> = { Scored: "voted", Missed: "missed", "Didn't finish": "unfinished" };
export async function saveCorrection(d: FormData) {
  const a = STATUS[f(d, "status") ?? "Scored"], noScore = a === "missed";
  await run(d, [{ sql: "update votes set attendance = $3, score = $4, word = $5, comment = $6, miss_reason = $7, source = 'table' where meeting = $1 and member = $2",
    params: [f(d, "meeting"), f(d, "member"), a, noScore ? null : num(d, "score"), noScore ? null : f(d, "word")?.trim() ?? null, f(d, "comment"), noScore ? f(d, "miss_reason") : null] }]);
}
export async function addMember(d: FormData) {
  const name = (f(d, "name") ?? "").trim(), slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), joined = f(d, "joined");
  const v = await member(d);
  let to: string;
  try {
    const st: Stmt[] = [{ sql: "insert into members (slug, name, status, joined_on) values ($1, $2, 'active', $3::date)", params: [slug, name, joined ? `${joined}-01` : null] }];
    if (f(d, "birthday")) st.push({ sql: "insert into member_birthdays (member, birthday) values ($1, $2)", params: [slug, f(d, "birthday")] });
    await sql(v, st);
    const r = await studio(v, "/club/invites", { method: "POST", body: { member_slug: slug, role: f(d, "role") ?? "member", name } });
    to = back(d, { invite: r.url });
  } catch (e) { if (!(e instanceof StudioError)) throw e; to = back(d, { e: e.message }); }
  redirect(to);
}
export async function setRole(d: FormData) { await call(d, `/club/members/${f(d, "slug")}`, "PATCH", { role: f(d, "role") }); }
export async function cancelInvite(d: FormData) { await call(d, `/club/invites/${f(d, "id")}`, "DELETE"); }
export async function removeSignIn(d: FormData) { await call(d, `/club/members/${f(d, "slug")}`, "DELETE"); }
export async function markPast(d: FormData) {
  const slug = f(d, "slug"), v = await member(d);
  let to = back(d, {});
  try {
    await studio(v, `/club/members/${slug}`, { method: "DELETE" }).catch((e) => { if (!(e instanceof StudioError) || e.status !== 404) throw e; });   // no sign-in is fine
    await sql(v, [{ sql: "update members set status = 'alumni', left_on = current_date where slug = $1", params: [slug] }]);
  } catch (e) { if (!(e instanceof StudioError)) throw e; to = back(d, { e: e.message }); }
  redirect(to);
}
export async function makeActive(d: FormData) { await run(d, [{ sql: "update members set status = 'active', left_on = null where slug = $1", params: [f(d, "slug")] }]); }

/* TASK-55: match club books to Commons ISBNs. Admin only (Studio refuses anyone else). */
export async function matchBooks(d: FormData) { await run(d, [{ sql: "select count(*) from match_isbn()" }], false); }
export async function setIsbn(d: FormData) { await run(d, [{ sql: "select set_isbn($1, $2)", params: [f(d, "book"), f(d, "isbn")] }]); }

/* Admin months 4c: one Save for a month's whole record, like a row in the sheet. */
const bookSlug = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export async function saveMonth(d: FormData) {
  const slug = f(d, "meeting")!, pick = f(d, "status") ?? f(d, "status_was") ?? "planned";
  const status = pick === "noscore" ? "met" : pick === "next" ? "planned" : pick, st: Stmt[] = [];
  const day = f(d, "meets_on"), at = day ? `${day} ${f(d, "meets_time") ?? "19:00"} America/Los_Angeles` : null;
  if (!f(d, "exists")) st.push({ sql: "insert into meetings (slug, month, status) values ($1, ($1 || '-01')::date, $2)", params: [slug, status] });
  st.push({ sql: "update meetings set host = $2, notes = $3, status = $4, meets_at = $5, venue_label = $6, food = $7, bring = $8, number = $9, cohost = $10 where slug = $1",
    params: [slug, f(d, "host"), f(d, "notes"), status, at, f(d, "venue_label"), f(d, "food"), bringList(d), num(d, "number") ?? num(d, "number_hint"), f(d, "cohost")] });
  st.push({ sql: "update meeting_sheet set no_score = $2, title_color = $3, title_bold = $4 where slug = $1", params: [slug, pick === "noscore", f(d, "title_color") ?? "blue", d.has("title_bold")] });
  if (f(d, "sheet_voting") !== f(d, "sheet_voting_was")) st.push({ sql: "update meeting_sheet set sheet_voting = $2 where slug = $1", params: [slug, f(d, "sheet_voting")] });
  // C and D: a new title points the month at that book, made if the club never had it.
  const title = f(d, "title")?.trim() ?? null, author = f(d, "author")?.trim() ?? null, retitled = !!title && title !== f(d, "title_was");
  if (retitled) st.push({ sql: "insert into books (slug, title, author) select $1, $2, $3 where not exists (select 1 from books where lower(title) = lower($2)) on conflict (slug) do nothing", params: [bookSlug(title), title, author] },
    { sql: "update meetings set book = (select slug from books where lower(title) = lower($2) order by slug limit 1) where slug = $1", params: [slug, title] });
  if (title) {
    const grx2 = num(d, "grx2"), sheetAuthor = !retitled && author !== f(d, "author_site") ? author : null;
    st.push({ sql: "update book_sheet set link_url = $2, sheet_author = $3 where slug = (select book from meetings where slug = $1)", params: [slug, f(d, "link_url"), sheetAuthor] },
      { sql: "update books set goodreads_avg = $2 where slug = (select book from meetings where slug = $1)", params: [slug, grx2 === null ? null : Math.round(grx2 * 50) / 100] });
  }
  // The five. Before the month meets, a posted five goes back to drafting only if it changed.
  const post = d.get("post") === "1";
  let posted = false;
  if (d.has("ballot")) {
    const five = fiveBooks(d, slug), sw = f(d, "slate_status"), changed = fiveKey(d) !== f(d, "five_was");
    if (post && five.n < 5) redirect(back(d, { e: "Add all five books first." }));
    if (changed || (post && (!sw || sw === "drafting"))) {
      if (sw && sw !== "drafting" && changed) st.push({ sql: "select redraft_slate($1)", params: [slug] });
      if (changed) st.push(...five.st);
      if (post) { st.push({ sql: "select * from open_ballot($1, null)", params: [slug] }); posted = true; }
    }
  }
  // Member columns, as typed: only the cells that changed. Studio adds, changes or clears them.
  const cells = d.getAll("vm").map(String).flatMap((m) => {
    const vote = f(d, `v:${m}`)?.trim() ?? "", comment = f(d, `c:${m}`)?.trim() ?? "";
    return vote === (f(d, `v0:${m}`) ?? "") && comment === (f(d, `c0:${m}`) ?? "") ? [] : [{ member: m, vote, comment }];
  });
  if (cells.length) st.push({ sql: "select sheet_set_votes($1, $2)", params: [slug, JSON.stringify(cells)] });
  await run(d, st, !posted && !st.some((x) => x.sql.includes("redraft_slate")));
}
/** The − on the furthest upcoming month: deletes it only if nothing was ever entered. Studio would cascade, so check here in SQL. */
export async function deleteEmptyMonth(d: FormData) {
  const slug = f(d, "meeting");
  await run(d, [
    { sql: "delete from slates where at_meeting = $1 and not exists (select 1 from candidates where slate = $1)", params: [slug] },
    { sql: `delete from meetings m where slug = $1 and book is null and host is null and meets_at is null and venue_label is null and food is null
      and coalesce(cardinality(bring), 0) = 0 and cohost is null and notes is null
      and coalesce((select sheet_cells from sheet_meetings s where s.slug = m.slug), '{}'::jsonb) = '{}'::jsonb
      and not exists (select 1 from votes x where x.meeting = m.slug) and not exists (select 1 from candidates c where c.slate = m.slug)`, params: [slug] },
  ]);
}
