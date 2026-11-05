# Book Club — v3.2 design

**Status: built · 2026-11-05 · supersedes [v3.1](BOOK-CLUB-v3.1-DESIGN.md)**. Where v3.2's §2.00 and older text disagree, §2.00 wins.
The rest below is v3.1 is v3 corrected against the live
Studio code and PR #1; every change is listed in §2.0. v2 and v1 stay as prior art (import details, stats lists).

Inputs: v2 (11-03, ready to code) · Angel 11-04: *"lets make sure our scenarios are there. front page with chat, all
data, voting, optional byoaidb. create next version fully code ready"* · v1 draft (11-01/11-02) · Shelby call on the
hadmoney nextbot recording (11-03) · byoaistudio `docs/STUDIO.md` v1.1, `docs/DB-IMPL.md` v1.2, `src/lib/api.ts` (box
mirror under `/workspace/spine/byoaistudio`, migrations through 057; live `main` also has `058_ask.sql`) ·
[byoaistudio PR #1](https://github.com/1000Problems/byoaistudio/pull/1) (TASK-42, `059_space_members.sql`, still open,
not merged as of 11-04) · Reading `shelf/DESIGN_BRIEF.md`.

Decided by Angel and not reopened here: **the database is `db.byoaistudio.com`** (Studio), not a Postgres of our own.
**BYOAI is optional**: every member can use the whole site with no AI. **No MCP.**

**What v3 added:** a first-class [`## Scenarios`](#scenarios) section (SC1–SC6) that names the four pillars Angel asked
for (front page with chat, all data, voting, optional BYOAI DB) as fixtures + numbered steps + accept checklists, and
the contracts that were still prose in v2: per-card home queries (§4.4), view columns (§5.8), every function's
signature and return shape (§5.10), the site → Studio call contract (Appendix B), a shared seed fixture
(Appendix A), and a definition of done keyed to scenario IDs (§14.2).

---

## 0. How to read this doc

- `MUST` = acceptance criteria. Every work item in `## byoaistudio changes` (§9) and `## Reading changes` (§10) is a
  checkbox with an "Accept" list. Every Book Club table in §5 has its DDL shape and RLS spelled out. Every scenario in
  `## Scenarios` has an Accept list; §14.2 says which scenarios must pass for v2.0 to ship.
- Physical tables are `byoaistudio_data.bookclub_*`. Views and functions are in schema `byoaistudio_bookclub` (Studio's `byoaistudio_<app>` rule; the shared Neon
  fingerprint forbids any other schema). The app slug is `byoaistudio_bookclub`. **Every statement the site or an AI
  sends uses bare names**: the guard refuses schema-qualified functions. Function names in this doc are bare; the
  migration qualifies them in DDL (`byoaistudio_bookclub.me()`). There's no `club_id` anywhere: tenancy is Studio's hidden `space_id` (DB-IMPL §3–4).
- Migration numbers are given at merge time. Live `main` ends at `058_ask.sql`; PR #1 takes `059`. The names below
  say what each migration does, not its number.
- "Role" means the Studio club role that `bind` copies from `space_members` (PR #1). "Channel" means how the request
  came in (§9 S4): `site` (signed-in site session), `public` (signed-out site request), `ai` (a member's key), `owner`
  (maintenance/import).
- Section numbers §1–§15 match v2 so cross-references from v2 tasks still resolve. New material sits in new
  subsections (§4.4, §5.10, §14.1–§14.3), in `## Scenarios` (between §4 and §5), and in Appendices A–B.
- Code blocks marked `sql` are DDL-shaped (column, type, check, RLS rule); the migration writes them out in full.
  Code blocks in Appendix A are literal: the fixture file is that text.
- Times are America/Los_Angeles (PT) in UI copy and fixtures; columns are `timestamptz`.

---

## 1. Product

**One line:** Book Club shows a club when and where it meets next and what everyone is reading. It keeps the club's
shared history, scores and talk on one calm site that anyone can use without an AI. Any member who wants to can
connect their own AI to the club's database to ask it things.

### The four pillars (Angel, 11-04) → where each is specified
| Pillar | What it means | Pages | Data | Scenario |
|---|---|---|---|---|
| **Front page with chat** | Home answers when / where / what / bring, then whatever is open, then the club chat, then last time | `/` | `next_meeting`, `rsvp_counts`, `my_rsvp`, `meeting_directions`, `open_actions`, `club_posts`, `last_meeting` (§4.4) | **SC1** |
| **All data** | 18 years of history imported once, then kept by forms; every stat Shelby gets asked is a database view; members, public and AIs see the same rows through the same RLS | `/history`, `/m/[slug]`, `/b/[slug]`, `/stats`, `/members` | `meeting_cards`, `book_scores`, `words`, `member_stats`, `host_stats`, `mix`, `attendance` (§5.8) | **SC2** |
| **Voting** | Host's slate of 5 → secret top-3 ballot on phones → database counts → pick → next meeting on home. Plus the score go-around | `/next`, `/ballot`, `/m/[slug]/score`, `/m/[slug]/goaround` | `slates`, `candidates`, ballot functions, `votes` (§5.4–5.5, §5.10) | **SC3**, **SC3b** |
| **Optional BYOAI DB** | The club's data is a Studio space on `db.byoaistudio.com`. Any member may connect their own AI to it (read what they can, write AI-voice things); nobody has to | `/club/ai` + header pill | Studio S3/S4/S9; `writeups`, `later`, `books` facts | **SC4** |

### Goals (v3 = v2 goals, unchanged)
1. **The home page answers "when / where / what are we reading / what do I bring"** within one second on a phone.
   This is Shelby's #1 job for hosts and members.
2. **Club chat on the home page.** Visitors can read it by default (Shelby: "my mom wants to see what we're reading").
   The scribe can switch it to members only.
3. **Two rituals, done on phones:**
   - **Score go-around:** after the talk, each person gives a 0–10 score (decimals allowed) and one word ("Siddhartha
     8.6 / river"). The phone records what's said aloud, and the scribe or host can enter the whole table in one form.
   - **Next-book vote:** the host brings 5 books, and each member ranks a top 3 on their phone. The database counts
     the result, so no one person gets blamed ("F1 for books").
4. **History since Dec 2008**, imported from the Soul Crushers sheet once, then kept up by forms. It answers the
   questions Shelby gets asked: top 10, harshest voter, fiction mix, hosts.
5. **Four personas:** admin (scribe), host, member and public. Admin, host and member are close in rights. Public is
   the odd one out (§3).
6. **Simple sign-in:** an invite link plus Studio email sign-in, and a long session so members rarely log in again.
7. **Optional BYOAI**, for ask-the-data only. The site never needs it. The AI talks to the club database through plain
   SQL. **No MCP.**
8. **Connecting an AI is familiar:** a clear connected / not connected state and a 3-step checklist that disappears
   once it's done.
9. **Club #2 is a sign-up, not a rewrite.** Nothing in the schema is specific to Soul Crushers.

### Non-goals (unchanged from v2)
- MCP servers, connectors or plugins of any kind (STUDIO §12; Shelby's "server can change after install").
- An AI acting as a member: AIs never cast scores, words, ballots, RSVPs or posts.
- "Paste this prompt into Claude" as the main way to do anything (Shelby's Reading critique).
- Native apps. The site is phone-first web.
- Email or SMS sending in v2.0 (no sender exists; §13 O3). Reminders show on the home page.
- Recording meetings or podcasts, discovering other clubs, follower counts.
- Member birthdates (in the sheet header; never imported).
- Linking club books into a member's Reading library (later).

---

## 2. What changed

### 2.00 v3.2 vs v3.1 (Angel, 2026-11-05)
**This site is the Soul Crushers page, not a platform for clubs.**
| Topic | v3.1 | **v3.2** |
|---|---|---|
| Address | `/c/[handle]`, sign-in card at the root (D19) | `bookclub.hadmoney.com` **is** the club's home; all pages at the root. D19 and goal 9 are withdrawn |
| Visibility | off until the scribe opens it | public from launch; sign-in is optional |
| Accounts | invite required | **anyone who creates an account is a member** (`sites.open_space`, TASK-54): role `member`, status `active`, slug and name from the account handle. No visitor role |
| Invites | the only way in | optional: they link an account to a roster row (e.g. imported history), moving any auto member's posts, RSVPs and scores |
| Scores | public by default | public (`public_scores = true`), confirmed |
| BYOAI | optional | optional, for signed-in members |

**Consequences of "every account is a member":** every §3 member right applies to any account, including addresses and
directions, RSVP names, scoring and the ballot, and each new account raises the ballot's "N of M". §8's "never public" list
now means "never to signed-out visitors".

### 2.0 v3.1 vs v3
v3.1 changes no product decision. It fixes what would have failed against the live code, the tests and Postgres.

| # | v3 | **v3.1** | Why |
|---|---|---|---|
| 1 | schema `bookclub` | `byoaistudio_bookclub` (§0) | Studio's schema rule and the shared Neon fingerprint |
| 2 | `bookclub.fn()` in statements | bare names; `bookclub.now()` → `club_now()` | Guard refuses qualified functions; bare `now()` would resolve to Postgres's |
| 3 | column `cast` | `cast_count` (§5.10) | Reserved word |
| 4 | dark tokens, Geist | Reading's real light skin (§4.3, D20) | v3's values weren't in Reading's `globals.css` |
| 5 | `picks_for` foreign key | no foreign key (§5.5) | Fixture and `open_ballot` point at a meeting that doesn't exist yet |
| 6 | policy-name error map | refusal triggers + named constraints (§5.10, D21) | Postgres doesn't report which policy refused |
| 7 | table scores by upsert; own upsert leaves `source` | `enter_votes`, upsert sets `source`, `votes_stamp` (§5.4, D23) | Upsert fails under `together` RLS; own edit over a table row was refused; "corrected" never showed |
| 8 | `bind` untouched by S6 | site login added (S6) | A memberless site bind would be `maintenance` |
| 9 | "nobody is a member" of appfn | ownership window (S7) | Postgres refuses the owner change otherwise |
| 10 | write views implied | listed in §5.8 | The SQL writes to them |
| 11 | Appendix B from memory | rewritten from `api.ts` | Wrong params and response shapes |
| 12 | public club not chosen; `Cache-Control` on POST; per-IP limit | `/c/[handle]` (D19), site cache, per-`(site, space)` limit | No route to a club; POST isn't CDN-cached; all requests come from the site server |
| 13 | home batch used `$1` from earlier statements | subqueries and a lateral join (§4.4) | Statements can't pass results |
| 14 | invite "creates a session" | one-time code + site token (S2) | The site holds the session, so it has to receive it |
| 15 | sessions 90 days, no work item | per-site `session_days` (S3, D22) | Studio is 30 days |
| 16 | AI could read private talk; host's AI could edit meetings | channel tests in §5.2, §5.6 | `is_roster()` is true for keys |
| 17 | test expectations | 2 no answer; 4 words; Nora has no account; Will's `missed` row; SC1 step 14 skips, not deletes; AI row parity excludes `open_actions` and own-state views | Didn't match the fixture or rules |
| 18 | `club` thread seeded by migration | `club_thread` trigger (§5.6) | Spaces created later would have none |
| 19 | `plurality`; §3 tie-break | Borda only (D24); tie-break in §6.3 | No counting rule; §3 had no tie-break |
| 20 | `unique` on expressions | unique indexes (§5.2, §5.7) | Invalid as table constraints |

### 2.1 v3 vs v2
| Topic | v2 | **v3** | Why |
|---|---|---|---|
| Scenarios | flows in prose (§6) | **`## Scenarios` SC1–SC6**, each with actors, fixture, numbered steps (UI + SQL/function/endpoint), Accept incl. negative cases | Angel 11-04 |
| Home cards | listed contents | **§4.4 card contracts:** one query per card, exact fields, who sees what, empty states | No guessing at build time |
| Slate meeting link | `slates.for_meeting` "the planned next one", while `pick` "creates next month's meeting" (ambiguous) | **`at_meeting`** (the meeting where the ballot runs; pk) + **`picks_for`** (the month whose book it picks; set at open, created by `pick` if missing). Default: the host of `at_meeting` brings the slate (§13 O5 confirms with Shelby; schema serves either) | Removes the one contradiction in v2 |
| Ballot/score functions | names + prose | **§5.10 contracts:** parameter types, return shapes, who may call, exact error strings; adds `close_if_due`, `scoring_set`; `cast_ballot` returns turnout computed **before** `forget_binding()` | Ready to code |
| Scoring status changes | "host may update `scoring`" | `scoring_set(meeting, to)` function + transition trigger: `not_open→open→revealed`; `revealed→open` scribe only | Transitions in one place |
| Stats views | names | **§5.8 column lists** for every view + `meeting_cards`, `last_meeting`, `club_posts`, `open_actions`, `my_rsvp` | Pages and AI docs share one contract |
| Eligible voters | unstated | active roster rows (`scribe`/`member` role) **with** a linked Studio membership; Studio exposes `byoaistudio.space_member_slugs()` to `byoaistudio_appfn` (S3) | Turnout "5 of 8" has to be exact |
| `/changes` for sites | key-only today (`api.ts`) | S9 adds site-session auth to `GET /changes` so R4 and Book Club live refresh work | Found reading `api.ts` |
| Site → Studio calls | implied | **Appendix B**: every call is `POST /sql` JSON `{"statements":[{"sql","params"}]}` with `X-Site` + `X-Session` (or site token + `X-Public-Space`), plus the named Studio endpoints | Track D steps list them |
| Fixture | none | **Appendix A**: one shared seed (`fixtures/sc.sql` + `fixtures/sc-studio.json`) used by SC1–SC6 and the DB tests | Same data in every test |
| Definition of done | one sentence | **§14.2**: scenario IDs that must pass, DB tests vs e2e, plus the live-cycle check | Testable |
| Track D | 7 steps, outcomes only | each step lists **pages, views/functions and Studio endpoints**, and the scenarios it turns green | Ready to code |

Everything else in v2 carries forward unchanged (permissions, privacy, S1–S12, R1–R9, import, decisions, out of scope).

### 2.2 v2 vs v1 (kept for context)
| Topic | v1 | **v2 (decided)** | Why |
|---|---|---|---|
| Public visitors | members-only, no logged-out reading | **public persona**: home, history and chat are readable while signed out; scribe switches with `club.visibility` | Shelby: "mom" persona; chat public, club may flip private |
| Home page | search + "next up" strip + history grid | **logistics first**: next meeting card (book, date/time, host, place, bring, RSVP), then votes or scoring if open, then chat | Shelby's #1 job |
| Score reveal | hide until the scribe reveals (RLS) | **club setting** `score_reveal`. Default `open` (the go-around is spoken aloud). `together` mode is still **enforced by RLS** | Shelby's table ritual; Angel's rule that hiding happens in the DB |
| Who enters scores | each member on their own phone | each member **or** the scribe/host for the whole table (go-around form) | Matches the spoken ritual |
| Roles | scribe/host/member/alumni/guest, fine-grained | admin (scribe) is special; host is **derived from the meeting**; host and member rights mostly the same; public is read-only | Shelby: first three "interchangeable" |
| RSVP / bring | not in v1 | `rsvps` (yes/no/maybe, +guests, bringing) and `meetings.bring` | Host tracks who's coming; "bring bread/wine" |
| Directions | `venue_text` only | public sees "at Kirk's". **Street address and directions are members-only** (separate table) | Public home must not show house addresses |
| Talk + AI | AI can't read posts (default) | public talk → AI may read (it's public anyway). Private talk → `talk_visible_to_ai` (default false) | Same rule, made consistent with public |
| Connect AI | a footnote | first-class: status pill, 3-step checklist, one-click disconnect, "who owns the data" line | Live demo pain |
| Studio work | "real design needed" | **designed** (§9): members, invites, (space, member) sessions and keys, channels, public bind, site pool, site-only and unlogged tables, ballot unlinking, per-member history, maintenance path | Angel's review |
| Ballot secrecy | site-only + unlogged | site-only + unlogged + **close-time shuffle + forget the binding** (closes the `xmin` link) | Engineering fix (§5.5) |
| Reading | out of scope | **§10 Reading changes** track | Angel: the design should include Reading changes |

---
## 3. Personas and permissions

| Persona | Studio role | Who (Soul Crushers) | One-line job |
|---|---|---|---|
| **Admin** | `scribe` | Shelby (Kent keeps it social) | Keeps the ritual moving: roster, rotation, corrections, privacy, opening and closing votes |
| **Host** | derived: `meetings.host = me` for the next or current meeting | whoever's month it is | Brings 5 books; directions; what to bring; who's coming |
| **Member** | `member` | ~8 active (10–20 to plan for) | When/where/what; RSVP; score + word; rank top 3; chat |
| **Public** | `public` (Studio bind with no member, §9 S5) | mom, friends, prospective members | Sees what the club is reading and how it's going |
| (Alumni) | `alumni` | Matt, Ballan, Tim… | History stays forever; may sign in to read and chat |
| (Guest) | `guest` | one-night visitor | Can be scored by the scribe/host; may hold an account to chat |

`space_members.role = 'host'` from PR #1 is **not used** by Book Club. Host is computed per meeting, so rotation drives
permissions without anyone editing roles.

### Permissions matrix (enforced by RLS and grants; the site only mirrors it)

✓ = allowed · own = own row only · — = no · (p) = only while `club.visibility = 'public'`

| Action | Scribe | Host (of that meeting) | Member | Alumni / Guest | Public | Member's AI key |
|---|---|---|---|---|---|---|
| Read next meeting (book, date, host, "at X's", bring) | ✓ | ✓ | ✓ | ✓ | ✓ (p) | same as its member |
| Read address / directions | ✓ | ✓ | ✓ | ✓ | — | same as its member |
| Edit next meeting logistics (date, time, venue, address, bring) | ✓ | ✓ | — | — | — | scribe's AI only |
| Create / skip / reschedule meetings, rotation | ✓ | — | — | — | — | scribe's AI only |
| RSVP | own + anyone | anyone, for their meeting | own | own | — | **no** |
| Score + word | anyone, while open; corrections after | anyone, while open, for their meeting | own, while open | — (scribe/host enters) | — | **no** |
| See others' scores while scoring is open | `score_reveal=open`: ✓ · `together`: — | same | same | same | — | same as its member |
| See scores after reveal | ✓ | ✓ | ✓ | ✓ | ✓ (p) if `public_scores` | same as its member |
| Open / reveal / reopen scoring | ✓ | ✓ (their meeting) | — | — | — | **no** (site only) |
| Build slate (5 books + pitches) | ✓ | ✓ (their slate = `slates.host`, default host of `at_meeting`) | — | — | — | scribe's or host's AI may add `books` facts, not candidates |
| Open / close ballot | ✓ | ✓ (their slate) | — | — | — | **no** |
| Cast ballot | own | own | own | — | — | **no** (site only) |
| See ballot turnout (count) | ✓ | ✓ | ✓ | ✓ | — | — |
| See ballot results (after close) | ✓ | ✓ | ✓ | ✓ | ✓ (p) | ✓ (after close) |
| See who cast which ballot | **nobody**, ever, including the scribe, the operator's app tables and the change log (§5.5) | | | | | |
| Read chat | ✓ | ✓ | ✓ | ✓ | ✓ (p) if `public_talk` | if talk is public, or `talk_visible_to_ai` |
| Post / edit own post | ✓ | ✓ | ✓ | ✓ | — | **no** |
| Hide a post | ✓ | — | — | — | — | — |
| Roster, invites, roles, privacy settings | ✓ | — | — | — | — | — (Studio API, site only) |
| Book facts (cover, isbn, GR avg, kind suggestion) | ✓ | ✓ | ✓ | — | — | ✓ (`kind` as a suggestion) |
| AI write-ups (`writeups`) | — | — | — | — | read (p) | ✓ (AI voice, attributed to its member) |
| Undo | any change (not ballots) | own | own | own | — | own |
| Trigger a due close (`close_if_due`: all voted or `closes_at` passed) | ✓ | ✓ | ✓ | — | — | **no** |
| Hide own connect checklist (`prefs`) | own | own | own | own | — | — |

---

## 4. Information architecture and pages

Nav (phone bottom bar, 5 items): **Home · History · Stats · Talk · Club**. Look is Reading's skin (§4.3).

**Club URLs (D19).** Every path in this doc is relative to **`/c/[handle]`** (`/c/soul-crushers/m/2026-09`); the doc
writes it short, so "opens `/`" means the club's home. The handle in the URL picks the club for signed-out visitors and
goes to Studio as `X-Public-Space`. Bare site root: signed in → redirect to the session's club; signed out → one card,
"Members: sign in", with no club list. A signed-in visitor on another club's URL gets that club's public view plus
**Switch club**. An unknown or private handle gets the members-only card, so handles can't be probed. The Studio return
URL is one fixed `/auth/callback`; `state` carries the page to return to.

### 4.1 Pages

| Path | Who | Contents | Notes |
|---|---|---|---|
| `/` **Home** | all | Card contracts in **§4.4**. **(1) Next meeting card:** cover, title, author, "Thu Dec 3 · 7 pm", "at Kirk's", host line ("Kirk's making soup"), **Bring:** chips (bread · wine · gummies), RSVP row (Going / Maybe / Can't, +guest) with "6 going". Members only: "Directions" expander (address + notes), "Add to calendar" (.ics download, built on the site). **(2) Action card**, only when open: "Vote for next book: 4 of 8 have voted" → `/ballot`, or "Score Siddhartha" → `/m/2026-11/score`, or "Host: pick your 5" (host only). **(3) Club chat:** last 20 posts in the `club` thread, composer for signed-in roster. **(4) Last time:** last meeting, club score, #rank all time, 5 words. **(5) Connect checklist** (§7), only for signed-in members not connected and not dismissed | Public sees 1 (no RSVP or directions), 3 read-only (if `public_talk`), 4 (scores if `public_scores`). Banner when the meeting is ≤ 7 days away: "One week out: RSVP" |
| `/history` | all (p) | Meetings by year, newest first: book cards with club score and GR×2; skipped months as thin lines; search hero ("/" key) | v1 "Library" |
| `/m/[slug]` | all (p) | Cover header, date, host, place ("at X's"), food/notes (human), club score vs GR×2, rank; **scores + words list** (subject to reveal rules); AI write-up if any; link to the meeting thread; "Ask your AI" locator if connected | slug = `YYYY-MM` |
| `/m/[slug]/score` | roster | Own score: decimal keypad 0–10, one word (required unless "missed"/"unfinished"), attendance chips | Quick-capture bottom sheet |
| `/m/[slug]/goaround` | scribe, host | **Table entry:** RSVP'd-yes members first, then rest of active roster, then "+ guest"; each row: score, word, attendance; "Save all" = one request (one undoable change) | Shelby's spoken go-around |
| `/next` | roster | Next host, slate of 5 with pitches, ballot status/turnout; host: add/replace books (title lookup → card), pitch, Open/Close | |
| `/ballot` | roster active | 5 cards → tap 1st/2nd/3rd (≤3), Confirm. "Your ballot is in. 5 of 8 have voted." No running tally | Site-only |
| `/b/[slug]` | all (p) | Book card, meeting(s), times on a slate | |
| `/stats` | all (p) except member-level stats need `public_scores` | v1 §8.1 list: top/bottom 10, "is X top 10", easiest/harshest, fiction mix by era, hosts, attendance, club vs Goodreads, words | Database views do the math |
| `/talk`, `/talk/[thread]` | read: all (p if `public_talk`); post: roster | `club` thread (= home chat) + one per meeting (auto) + standing threads | Unread dots for signed-in users |
| `/members`, `/members/[slug]` | roster; public sees names only | Active/alumni; member page: mean, count, harsh/easy rank, words, hosted | |
| `/club` | all | About; "Members: sign in"; scribe: **Settings** (visibility, public_scores, public_talk, score_reveal, talk_visible_to_ai, slate size), **Roster** (add roster row, invite link, role, remove), **Import review** | |
| `/club/ai` | roster | Connect your AI (§7): status, 3 steps, disconnect, "who owns the data" | |
| Studio `db.byoaistudio.com/join/[token]` | invitee | Studio page (§9 S2), not a Book Club page | |

The site has **no login or signup pages** (STUDIO §5). "Sign in" calls Studio `/authorize` with PKCE (TASK-17).

### 4.2 Empty states (club #2 and pilot)
Club with no history ("Add your first meeting · Import a sheet"); no next meeting ("Scribe: set the next meeting");
slate empty ("Host: pick 5"); quiet chat; member with no scores.

### 4.3 Skin
Reading's real skin, copied from `reading/shelf/src/app/globals.css` (Claude Design "Shelf Site"). **Light only.**
Tokens: bg `#fafaf8`, surface `#fff`, field `#f6f5f1`, seg `#eeede8`, line `rgba(20,20,19,.08)`, text and ink `#141413`,
label `#3d3b37`, muted `#5e5c56`, faint `#8f8d87`, accent `#e9a93a`, accent-ink `#7a4f00`, mark `rgba(233,169,58,.32)`,
plus the `--claude*`, `--trap*`, `--ring` and `--lift` tokens as written there.
Fonts: Newsreader (`--font-serif`; titles, book text), Plus Jakarta Sans (`--font-sans`; UI), JetBrains Mono
(`--font-mono`; tags, numbers). Classes: `.card .card-lift .field .btn .btn-ink .btn-ghost .btn-lg .chip .seg .tag .label
.muted .faint .prose-note`, with `.mark-claude` and `.voice-claude` for AI voice and `.mark-mine` and `.voice-mine` for
member voice. Next.js 16 + Tailwind v4, no component libraries. 375 px first, tap targets ≥ 44 px. Copy the file's
tokens and these classes into `bookclub/src/app/globals.css` (a shared package can come later; R8).
Voices: **member** (personal, name-attributed) · **club record** (plain facts, mono numbers) · **AI** (`writeups`
only, labelled "written by Shelby's AI · date", Reading's "Claude's summary" style). An unconfirmed AI suggestion
(`kind_by='ai'`) is drawn dashed until a person taps Confirm.

### 4.4 Home page contracts (card by card)

**One round trip.** The site server renders `/` from **one** Studio `POST /sql` JSON request whose `statements`
array holds every read below that applies to the viewer (Appendix B). Statements in a batch can't pass results to
each other, so a card that needs the next meeting uses a subquery: `(select slug from next_meeting)`. While a slate is
`voting`, the separate `close_if_due` request (§5.10) also runs on page load; it isn't part of this count. Signed-in = `X-Session` (channel `site`);
signed-out = site token + `X-Public-Space: <handle>` (channel `public`, select only; the **site server** caches the
result 60 s per handle and page, because a `POST` isn't cacheable by a CDN). Budget: Studio p95 ≤ 250 ms for
the batch; first paint ≤ 1 s on a mid phone over 4G. Directions and the host RSVP board are fetched lazily (second
request) only when expanded or when the viewer is the host.

Card order is fixed: **0 header → 1 next meeting → 2 action → 3 chat → 4 last time → 5 connect checklist.**

| # | Card | Shown to | Statement(s) (`$n` = params) | Fields rendered | Empty / quiet state |
|---|---|---|---|---|---|
| 0 | Header | all | `select name, visibility, public_talk, public_scores, score_reveal from club` · signed-in: `select slug, name, role from me` · signed-in: Studio `GET /site/connection` (S9, separate fetch, cached 30 s) | club name; "Sign in" (public) or member name + **AI pill** (amber dot "Connected" / muted "Not connected"; pill only if state ≠ `none` **or** the checklist isn't hidden) | — |
| 1 | **Next meeting** | all (p) | `select slug, month, meets_at, book, title, author, cover_url, host, host_name, venue_label, host_line, bring, days_until, rsvp_yes, rsvp_maybe, rsvp_guests from next_meeting` | cover · title · author · `meets_at` as "Thu Nov 12 · 7 pm" (or "Date TBD") · `venue_label` ("at Kirk's"; "Place TBD") · `host_line` or "Hosted by Kirk M" · **Bring** chips from `bring` · "N going" = `rsvp_yes + rsvp_guests` (+ "M maybe") | no row → public: "Next meeting not set yet"; scribe: "Set the next meeting" → `/club#meetings`; member: same as public |
| 1a | RSVP row | roster | `select status, guests, bringing from my_rsvp where meeting = (select slug from next_meeting)` | Going / Maybe / Can't toggle (selected = `status`), "+ guest" stepper (0–5), "I'm bringing ___" | no row = nothing selected |
| 1b | Week-out banner | roster | derived: `days_until <= 7` and `my_rsvp` empty | "One week out: RSVP" above card 1 | — |
| 1c | Directions expander | roster | lazy: `select address, directions, parking from meeting_directions where meeting = $1` | address (tap → maps link), directions, parking | no row → "Host hasn't added directions yet" (host sees "Add directions" → `/next#place`) |
| 1d | Add to calendar | roster | none (built from card 1 + 1c) | `.ics` download: SUMMARY "Book Club: <title>", DTSTART `meets_at`, 3 h, LOCATION = address (members) | hidden when `meets_at` null |
| 1e | Host strip | host of that meeting, scribe | lazy: `select member, name, status, guests, bringing from rsvp_board where meeting = $1` | "6 yes · 1 maybe · 3 no answer" (no answer = `status is null`), tap → list; **Edit logistics** → `/next#place` | — |
| 2 | **Action** | roster only | `select kind, meeting, slate, title, detail, href, host_only from open_actions order by sort` · `select a.slate, t.* from open_actions a cross join lateral ballot_turnout(a.slate) t where a.kind = 'ballot'` | one card per row, max 2 (ballot first): **ballot** "Vote for next book · 3 of 4 have voted" or "Your ballot is in · 3 of 4" (`me_cast`) → `/ballot` · **score** "Score *The Overstory*" (or "You scored 8.4 · edit") → `/m/<slug>/score` · **slate** (host) "Host: pick your 5 · 4 of 5" → `/next` · **logistics** (host) "Set the time and place" → `/next#place` · **schedule** (scribe) "Set the next meeting" | no rows → card absent (no placeholder) |
| 3 | **Club chat** | all (p if `public_talk`) | `select id, member, name, body, created_at, edited_at, mine from club_posts order by created_at desc limit 20` · roster: `select last_read_at from my_reads where thread = 'club'` | newest last (render reversed), name, relative time, Markdown body (sanitized; no images in v2.0), "edited"; composer (roster): textarea ≤ 4000, **Post**; own post: Edit · unread divider at `last_read_at` · "Open Talk" → `/talk/club` | zero posts → "Quiet so far. Say hi." (roster) / "No talk yet." (public) · public + `public_talk=false` → card absent, no "sign in to read" tease |
| 4 | **Last time** | all (p) | `select slug, month, title, author, cover_url, host_name, club_score, rank_all, ranked_count, top_words from last_meeting` | cover · title · "Hosted by Will H · Sep 2026" · **7.9** club score · "#2 of 3 all time" · up to 5 words (`top_words`, highest scores first) · → `/m/<slug>` | no row → card absent · public + `public_scores=false` → `club_score`, `rank_all` null and `top_words` empty → "Scores are members-only" |
| 5 | **Connect your AI** | roster, signed in, Studio state ≠ `connected`, not hidden | `select ai_checklist_hidden_at from my_prefs` + `GET /site/connection` | the 3-step checklist (§7) · **Hide** = `insert into prefs (member, ai_checklist_hidden_at) values (me(), now()) on conflict (member) do update set ai_checklist_hidden_at = excluded.ai_checklist_hidden_at` | — (never shown to public; never shown again once step 3 has ticked) |

**Writes from Home** (each is its own `POST /sql`, channel `site`, one change = one Undo toast):
| Action | Statement | Refusal copy (§5.10) |
|---|---|---|
| RSVP | `insert into rsvps (meeting, status, guests, bringing) values ($1,$2,$3,$4) on conflict (meeting, member) do update set status = excluded.status, guests = excluded.guests, bringing = excluded.bringing, updated_at = now()` (`member` defaults to `me()`) | `rsvps_write` → "Only you can RSVP for yourself (or the host/scribe for you)." |
| Post | `insert into posts (thread, body) values ('club', $1) returning id, created_at` | `posts_insert` → "Sign in as a member to post." |
| Edit own post | `update posts set body = $2, edited_at = now() where id = $1` | `posts_update` → "You can only edit your own posts." |
| Mark read | `insert into reads (thread, last_read_at) values ('club', now()) on conflict (thread, member) do update set last_read_at = excluded.last_read_at` (fired when card 3 scrolls into view) | — |

**Freshness:** signed-in Home polls `GET /changes?since=<cursor>` every 10 s while visible (S9 site-session auth;
same pattern as R4) and re-runs the batch when any of `meetings, rsvps, posts, slates, votes` changed. Ballot casts are
unlogged, so turnout refreshes by re-calling `ballot_turnout` every 10 s while a `ballot` action card is shown.
Public Home doesn't poll (60 s cache).

---

## Scenarios

*(§SC)* Named, testable scenarios for the four pillars Angel asked for (11-04), plus invite/join and the privacy
toggle. An engineer implements and tests these as written; if a step needs something not specified here or in §4.4,
§5 or §5.10, that's a doc bug: fix the doc first.

### SC.0 Conventions (all scenarios)
- **Fixture:** every scenario starts from **Appendix A** (`fixtures/sc.sql` for the club space `sc-crushers`, and
  `fixtures/sc-studio.json` for Studio accounts, spaces and memberships), loaded by
  `node scripts/load-fixture.mjs sc` (maintenance bind, actor `fixture`). "Given" lines list only the changes from
  that base.
- **Clock:** the views use `club_now()` (§5.0), which reads GUC `bookclub.now` when set and `now()` otherwise. Tests
  pin it (`setClock('2026-11-06 12:00 America/Los_Angeles')` unless a step says otherwise); the site reads
  `BOOKCLUB_NOW` for relative copy. Production never sets either.
- **People (fixture):** Shelby G `shelby-g` (scribe) · Kirk M `kirk-m` (member; hosts the next meeting, 2026-11) ·
  Kent L `kent-l` (member; also in a second club) · Will H `will-h` (member) · Nora P `nora-p` (active roster row, **no
  account yet**) · Matt A `matt-a` (alumni, no account) · Dana `dana-guest` (guest, no account) · **Public** = a
  signed-out phone. Eligible voters = 4 (`shelby-g, kirk-m, kent-l, will-h`).
- **Two test layers per scenario:** **DB** = `byoaistudio/tests/2x-bookclub-scN.test.ts`, running the listed SQL with
  `asSite(slug)`, `asPublic()`, `asAi(slug)`, `asMaint()` binds (S3/S4/S5) against the real migration. **E2E** =
  `bookclub/e2e/scN-*.spec.ts` (Playwright, 375×667 viewport, local Studio + local site). An Accept line marked
  **[DB]** or **[E2E]** belongs to that layer; unmarked lines are checked by both.
- **SQL in steps** is exactly what the site sends in a `POST /sql` JSON statement (Appendix B). `me` is the binding's
  member; the site never sends a member slug where `me()` is the default.
- Negative cases are written as **✗** lines: the action must fail with the quoted one-line message (§5.10 error table) and change nothing.

---

### SC1 — Front page with chat
**Intent:** the home page answers when / where / what / bring, shows what's open, and carries the club chat, with
exactly the right slice for public, member and host.

**Actors:** public · member (Kent) · host of the next meeting (Kirk) · scribe (Shelby).

**Fixture:** Appendix A base. Clock 2026-11-06 12:00 PT. Next meeting `2026-11` *Piranesi*, Thu Nov 12 7 pm, "at
Kirk's", host line "Kirk's making soup", bring `{bread,wine}`, private address set; RSVPs: shelby-g yes (+1 guest),
will-h maybe; slate `2026-11` drafting with 4 candidates; `club` thread has 3 visible posts + 1 hidden; last revealed
meeting `2026-09` *Siddhartha* (club score 7.9, #2 of 3).

**Steps — public**
1. Signed-out phone opens `/`. Site server → Studio `POST /sql` with the site token and `X-Public-Space: sc-crushers`, batch
   = card 0 (`club`), card 1 (`next_meeting`), card 3 (`club_posts`), card 4 (`last_meeting`) from §4.4. No `me`, no
   `my_rsvp`, no `open_actions`, no `GET /site/connection`.
2. Public taps the meeting card → `/m/2026-11` (book, date, "at Kirk's", no address).
3. Public scrolls to chat; there is no composer, only "Members: sign in to join the talk".

**Steps — member (Kent)**
4. Kent signs in (Studio `/authorize` PKCE → `POST /site/session`), lands on `/`. Batch = all public statements +
   `me`, `my_rsvp`, `open_actions`, `my_reads`, `my_prefs`; plus `GET /site/connection`.
5. Kent sees the week-out banner (6 days, no RSVP), taps **Going**, "+1" → RSVP write (§4.4) → card shows "4 going"
   (shelby 1+1 guest, kent 1+1 guest) "· 1 maybe". Undo toast appears.
6. Kent opens **Directions** → lazy `meeting_directions` → address, gate code, parking. Taps **Add to calendar** →
   `.ics` downloads with LOCATION = the address.
7. Action card: "Host is picking the books" is **not** shown to Kent (slate drafting is host-only); no ballot or
   score card (none open). So no action card at all.
8. Kent types "Halfway. The statues!" → **Post** → `insert into posts (thread, body) values ('club', $1)` → appears at
   the bottom of chat with "Kent L · now". He edits it → "edited". Unread divider is gone after the card is in view
   (`reads` upsert).
9. Connect checklist (card 5) shows (Kent not connected). Kent taps **Hide** → `prefs` upsert → card gone on reload;
   header pill hidden too (state `none` + hidden).

**Steps — host (Kirk)**
10. Kirk signs in → `/`. Action card **slate**: "Host: pick your 5 · 4 of 5" → `/next`. Host strip under card 1:
    "2 yes · 1 maybe · 2 no answer" (after step 5: shelby yes, kent yes, will maybe, kirk and nora none; `rsvp_board` lists every active member) → list via
    `rsvp_board`.
11. Kirk taps **Edit logistics** → `/next#place`, changes host line to "Soup + bread, bring wine" →
    `update meetings set host_line = $2 where slug = $1` → Home card 1 shows it on next load (and public within 60 s, the site cache).

**Steps — quiet and empty states** (Given variants, DB + E2E)
12. Given `delete from posts` (maint): member sees "Quiet so far. Say hi."; public sees "No talk yet."
13. Given `update club set public_talk = false`: public batch's `club_posts` returns 0 rows **and** card 3 is not
    rendered for public; members still see chat.
14. Given `update meetings set status = 'skipped' where slug = '2026-11'` (maint; a delete would hit foreign keys): public/member see "Next meeting not set yet"; Shelby (scribe) sees the
    **schedule** action "Set the next meeting".
15. Given `update meetings set meets_at = null, venue_label = null where slug='2026-11'`: card shows "Date TBD ·
    Place TBD"; no calendar button; Kirk sees the **logistics** action.

**Accept**
- [ ] Public batch returns: card 1 with `venue_label` "at Kirk's" and **no** address fields in any response body (grep
  the JSON for "Test Lane" → absent) **[E2E]**; `rsvp_yes/rsvp_maybe/rsvp_guests` numbers only, no names.
- [ ] Public card 4 shows 7.9 and "#2 of 3" (fixture `public_scores=true`); with `public_scores=false` shows "Scores are
  members-only" and the response carries null score/rank and empty `top_words` **[DB]**.
- [ ] Public sees the 3 visible posts, newest last, **not** the hidden one; no composer, no RSVP row, no directions,
  no action card, no connect checklist, no AI pill.
- [ ] ✗ Public `insert into posts (thread, body) values ('club','hi')` → refused at grant level (render pool is select
  only) **[DB]**; ✗ public `select * from meeting_directions` → 0 rows **[DB]**; ✗ public `select * from rsvp_board` →
  0 rows **[DB]**; ✗ public `select * from rsvps` → 0 rows **[DB]**.
- [ ] Kent's RSVP is one change; Undo restores "no answer"; ✗ Kent `insert into rsvps (meeting, member, status) values
  ('2026-11','will-h','no')` → "Only you can RSVP for yourself (or the host/scribe for you)." **[DB]**
- [ ] Kirk (host) can RSVP for Will; Shelby (scribe) can too; Kirk can edit `host_line`; ✗ Kirk `update meetings set
  book='dune' where slug='2026-11'` → "Hosts can change time, place and bring; the book and host are the scribe's."
  **[DB]**
- [ ] Kirk sees host strip + slate action; Kent sees neither **[E2E]**.
- [ ] Chat: last 20 only (seed 25 posts in a variant → 20 rendered, "Open Talk" link to the rest) **[E2E]**; Markdown
  rendered with links `rel="nofollow noopener"` and no raw HTML **[E2E]**.
- [ ] Quiet/empty states 12–15 render exactly the copy above.
- [ ] Home batch is **one** `POST /sql` for public and one (+ the connection fetch) for members **[E2E, network log]**;
  Studio batch p95 ≤ 250 ms on fixture size **[DB, timing]**.
- [ ] Signed-in Home picks up a post made from another session within 10 s without reload (`/changes` poll) **[E2E]**.

---

### SC2 — All data
**Intent:** after the import, every page and every stat shows the club's history correctly, and public, roster and a
member's AI see the same rows filtered by the same RLS.

**Actors:** scribe (import runner = Angel/Shelby via script) · member (Will) · public · member's AI (Kent's key,
connected as in SC4).

**Fixture:** two runs. **SC2-a (fixture):** Appendix A base, which already holds 4 past meetings (2019-11, 2024-05,
2026-08 skipped, 2026-09) with revealed scores. **SC2-b (import):** an empty space `sc-import` (bookclub app on,
`create-club.mjs`) and the real sheet export (`/tmp/sc.xlsx` on the box; re-export before the real run). SC2-b is
the §12 accept list as a scenario.

**Steps — import (SC2-b)**
1. `node scripts/import-bookclub-sheet.mjs sc-import /tmp/sc.xlsx --dry-run` → prints: meetings parsed, skipped rows,
   `continues` links, member list (slug, aliases), row-5 checksum table (member, sheet mean/count, computed mean/count,
   Δ), `legacy_score` vs computed `club_score` mismatches, and the `guest_counts` × `partial_counts` grid (4 combos,
   mismatch count each). Writes nothing (no `changes` rows for the space).
2. Scribe picks the setting combo with the fewest mismatches → `update club set guest_counts = $1, partial_counts = $2`
   (maint) before the real run.
3. Real run (no `--dry-run`, `--batch 25`): batches of 25 meetings; each batch is one change. Re-running is a no-op
   (`on conflict do nothing`).
4. Unparsed cells → `votes.comment` + a `later` row (`kind='import_flag'`); fiction/nonfiction empty → one `later` row
   per book (`kind='kind'`).

**Steps — reading the data (SC2-a, as Will on the site)**
5. `/history` → `select slug, month, year, status, title, author, cover_url, club_score, gr_x2, rank_all, host_name,
   venue_label from meeting_cards order by month desc` → grouped by `year`: 2026 (Nov planned "upcoming", Oct met
   "scores not in yet", Sep 7.9, Aug "skipped" thin line), 2024 (May 8.6), 2019 (Nov 6.7).
6. `/m/2026-09` → `select * from meeting_cards where slug=$1` + `select member, name, attendance, score, word, source,
   corrected from meeting_votes where meeting=$1 order by score desc nulls last` + `select body, written_by_name,
   written_at from writeups where subject = 'm:2026-09'` → list: Kent 9.0 om · Shelby 8.6 river · Dana (guest) 8.0
   ferry · Kirk 7.25 quiet · Will 6.5 slow · Matt — missed.
7. `/b/siddhartha` → `select * from book_cards where slug=$1` (meetings, times on a slate).
8. `/stats` → one batch:
   - top 10: `select title, club_score, gr_x2, delta, rank_all, meeting from book_scores order by rank_all limit 10`
   - bottom 10: same `order by rank_all desc limit 10`
   - "is the latest top 10?": `select title, rank_all, ranked_count from last_meeting`
   - easy/harsh: `select name, n, mean, easy_rank, harsh_rank from member_stats where easy_rank is not null order by easy_rank`
   - fiction mix: `select period, period_kind, fiction, nonfiction, untagged, pct_fiction from mix order by period`
   - hosts: `select name, times_hosted, mean_pick_score, best_title from host_stats order by times_hosted desc`
   - attendance: `select name, attended, missed, out, longest_streak from attendance order by attended desc`
   - club vs Goodreads: `select title, club_score, gr_x2, delta from book_scores order by delta desc limit 5` (and `asc`)
   - words: `select word, name, title, meeting from words where member = $1` on member pages; `where book = $1` on book pages
9. `/members` → `select slug, name, status from members order by status, name`; `/members/kent-l` → `select * from
   member_stats where member=$1` + `words where member=$1` + `host_stats where member=$1`.

**Steps — same rows, three audiences**
10. Public runs steps 5–9 (`X-Public-Space`): same rows for meetings, books, book scores and stats **because**
    `public_scores=true`; `/members` shows names only (`members` view for public has `slug, name, status` and nothing
    else).
11. Given `public_scores=false`: public `book_scores`, `meeting_votes`, `words`, `member_stats` → 0 rows; `meeting_cards`
    rows present with `club_score`/`rank_all` null; `/stats` for public shows only the fiction mix and hosts (counts),
    with "Scores are members-only".
12. Kent's AI (SC4 key) runs the **Ask the club** walkthrough (views only, as BookClubDocs `STATS.md` teaches):
    - "How many nonfiction books since 2020?" → `select sum(nonfiction) from mix where period_kind = 'year' and
      period >= '2020'` → **1** (*Born a Crime*, 2024-05).
    - "Is *Siddhartha* top 10 all time?" → `select rank_all, ranked_count from book_scores where book = 'siddhartha'`
      → **#2 of 3**.
    - "Who's the harshest voter?" → `select name, mean, n from member_stats where harsh_rank = 1` → **Will H 6.75
      (n=2)** (fixture `stats_min_n = 2`).
    - "What words did we use for *Born a Crime*?" → `select name, word from words where book = 'born-a-crime'`.
    - The AI may then write `insert into writeups (subject, body) values ('club:year-2026', $1)` (SC4).

**Accept**
- [ ] [DB] SC2-a computed values match exactly: `book_scores` = born-a-crime 8.6 #1, siddhartha 7.9 #2, sapiens 6.7 #3,
  `ranked_count` 3; *The Overstory* absent (scoring `not_open`) and 2026-08 absent (skipped).
- [ ] [DB] Counting rules: Will's 2019 `unfinished` 4.0 is excluded from sapiens (6.7 not 6.15); Will's 2024 `partial`
  7.0 is included (8.6); Dana (guest) is included while `guest_counts=true` (7.9) and excluded when false (7.8).
- [ ] [DB] `member_stats` (min n 2): kent-l 8.883 easy #1 … will-h 6.75 harsh #1; matt-a (n=1) has null ranks; guests are
  not in `member_stats`.
- [ ] [DB] `mix` year rows: 2019 nonfiction 1 · 2024 nonfiction 1 · 2026 fiction 2 (Siddhartha + Overstory are `met`;
  mix counts met meetings, not scores) · era rows (5-year buckets from the founding year, §5.8): `2018–2022` nonfiction 1 · `2023–2027` fiction 2, nonfiction 1; `pct_fiction` 2026 = 100.
- [ ] [DB] `host_stats`: kent-l hosted 2 (sapiens, overstory), mean_pick_score 6.7 (Overstory unscored), kirk-m 1 (8.6),
  will-h 1 (7.9), shelby-g 0.
- [ ] [DB] Public with `public_scores=true` gets byte-identical rows to Will for `meeting_cards`, `book_scores`, `mix`,
  `host_stats`; with false gets the step-11 shape. `members` for public exposes only `slug, name, status`.
- [ ] [DB] Kent's AI gets the same rows as Kent on every stats view; the four ask-the-club answers are 1, #2 of 3, Will H
  6.75, and the 4 born-a-crime words (brave, funny, mother, sharp).
- [ ] [DB] ✗ AI `select * from ballot_choices` → "ballots are only available on the club site"; ✗ public `select note
  from members` → column doesn't exist in the public-safe view (`members` view never has `note`).
- [ ] SC2-b dry run: ~192 meetings, 15 skipped rows recognized, Moby Dick linked via `continues`, row-5 checksum within
  ±0.05 mean and exact count for ≥ 90% of members (rest listed), **zero birthdates** in any table, zero writes.
- [ ] SC2-b real run: re-run is a no-op (0 new changes); every batch is undoable; `/history` shows 2008-12 at the bottom.
- [ ] [E2E] Every number on `/stats` links to the meetings behind it (`/m/<slug>` or a filtered `/history?…`).

---
### SC3 — Voting (slate → secret top-3 ballot → pick → next meeting on home)
**Intent:** the host's 5 books become a secret phone ballot the database counts; the winner becomes next month's
meeting; nobody (scribe, host, AI, change log) can tie a ballot to a member.

**Actors:** host (Kirk) · scribe (Shelby) · members (Kent, Will) · member's AI (Kent's key) · public.

**Fixture:** Appendix A base: slate `2026-11` (at Kirk's meeting; `picks_for` `2026-12`), host `kirk-m`, `drafting`,
candidates `the-road, educated, dune, the-wager` with pitches. Rotation `will-h → shelby-g → kirk-m → kent-l`. Kent's
AI key exists (connected per SC4). Clock 2026-11-12 20:30 PT (the meeting night).

**Steps**
1. Kirk → `/next`: `select at_meeting, picks_for, host, host_name, status, opens_at, closes_at from slates where
   at_meeting = $1` + `select book, title, author, cover_url, pitch from slate_cards where slate = $1`.
2. Kirk adds the 5th: types "Lincoln in the" → site server Open Library lookup (no DB) and `select slug, title, author
   from books where lower(title) like lower($1) || '%' limit 5` → picks → if new, `insert into books (slug, title,
   author, cover_url, year_published) values (…) on conflict (slug) do nothing` → `insert into candidates (slate, book,
   pitch) values ('2026-11', 'lincoln-in-the-bardo', 'Ghosts, but funny.')`.
3. ✗ Kirk tries a 6th → "The slate is full (5 books)." ✗ Kent tries to add a candidate → "Only the host or scribe can
   change the slate."
4. At the table, Kirk taps **Open ballot** → `select * from open_ballot('2026-11', null)` → status `voting`,
   `opens_at` now, `closes_at` null (manual). Every member's Home shows the **ballot** action card.
5. Each member on `/ballot`: cards from `slate_cards`; taps 1st/2nd/3rd; **Confirm** → its own request containing
   exactly one statement `select * from cast_ballot($1, $2, $3, $4)`:
   - Shelby: dune, educated, the-road
   - Kirk: educated, dune, the-wager
   - Kent: dune, the-wager, educated
   - Will: educated, the-road, *(none)*
   Each returns `(cast_count, eligible) = (n, 4)` → "Your ballot is in. n of 4 have voted." No tally anywhere.
6. Home/`/ballot` for everyone: `select * from ballot_turnout('2026-11')` → `cast_count, eligible, me_cast`.
7. After Will's cast, any active member's next page load calls `select close_if_due('2026-11')` → `true`
   (`cast_count = eligible`) → slate `closed`. (Kirk can also tap **Close** → `select * from close_ballot('2026-11')`.)
8. Everyone (public too, since `visibility='public'`): `select book, title, points, firsts, ballots, place, tied from
   ballot_results where slate = '2026-11' order by place` → **educated 9 (2 firsts) · dune 8 (2) · the-road 3 (0) ·
   the-wager 3 (0) · lincoln-in-the-bardo 0**; place 3 shows `tied = true` for the-road/the-wager (no effect: only the
   winner matters).
9. Kirk taps **Pick *Educated*** → `select pick('2026-11', 'educated', null)` → returns `'2026-12'`; slate
   `picked`; meeting `2026-12` created `planned`, book `educated`, host = next in rotation after kirk-m = `kent-l`,
   `venue_member = kent-l`, `meets_at`/`venue_label` null.
10. Clock → 2026-11-13 09:00 PT. Home card 1 for everyone = `2026-12` *Educated* · "Date TBD · Place TBD" · "Hosted by
    Kent L"; Kent sees the **logistics** action and, since he hosts 2026-12, he'll own slate `2026-12` (created on his
    first visit to `/next`: `insert into slates (at_meeting, picks_for) values ('2026-12', null)`; `picks_for` is set
    by `open_ballot`).

**Secrecy leak checks** (DB unless marked; all run after step 9 and again after a `reopen_ballot`)
- [ ] `bookclub_ballot_choices` and `bookclub_ballot_pending` have **no member column** (schema test reads
  `information_schema.columns` as owner).
- [ ] `select count(*) from byoaistudio.changes where tbl like 'bookclub_ballot_%'` = **0** (unlogged; S6). `/history`
  for the space lists no ballot rows; `/undo` of any change never touches them.
- [ ] For every `ballot_choices` row: `xmin` is the **close** transaction's xid, and `select count(*) from
  byoaistudio.tx_space where xid in (<each cast request's xid>)` = **0** (forget_binding; S7). The close xid's
  `tx_space` row names Kirk (who closed), not any voter.
- [ ] `ballot_choices` row order ≠ cast order across 20 seeded runs (shuffle at close; probabilistic test, p < 0.01).
- [ ] `ballot_voters.cast_minute` is truncated to the minute; with 4 casts in one minute nothing orders them.
- [ ] ✗ Shelby (scribe) `select * from ballot_pending` / `ballot_choices` / `ballot_voters` and the physical
  `byoaistudio_data.bookclub_ballot_*` names via `/sql` site channel → refused (no views, schema banned by the guard, no
  direct grants; functions only). The only per-member ballot fact anyone can read is
  their own `me_cast` from `ballot_turnout`.
- [ ] ✗ Kent's AI: `select * from ballot_results` **while voting** → 0 rows; `select * from ballot_turnout('2026-11')`
  → "ballots are only available on the club site"; `select cast_ballot(…)` → same message; `/describe` (AI)
  lists `ballot_results` only. After close, AI `select * from ballot_results` → the step-8 rows.
- [ ] ✗ Kent casts twice → "You've already voted. Ballots can't be changed (the scribe can reopen for everyone)."
- [ ] ✗ Will casts `dune, dune, null` → "Pick different books for 1st, 2nd and 3rd."; ✗ casts `moby-dick` → "That book
  isn't on this slate."; ✗ Nora (no account) can't reach `/ballot`; ✗ Matt (alumni) has no session; ✗ a guest-role
  account → "Only active members vote."
- [ ] ✗ Cast after close → "Voting is closed."; ✗ Kent `select close_ballot('2026-11')` while voting → "Only the
  host or scribe can close the ballot."; Kent's `close_if_due` before all voted → `false`, nothing changes.
- [ ] A statement placed **after** `cast_ballot` in the same request sees zero rows / fails closed ("no space is bound")
  — the site never does this; the test proves it can't leak.
- [ ] **Reopen:** after step 7 (before pick), Shelby `select reopen_ballot('2026-11')` → voters, pending and
  choices for that slate are all deleted, status `voting`, turnout `0 of 4`; Kent can cast again. ✗ Kirk (host) reopen
  → "Only the scribe can reopen a ballot."; ✗ reopen after `picked` → "This slate is already picked."
- [ ] Results view: ✗ any role while `voting` → 0 rows; after close → rows for roster, AI and public (p).
- [ ] Pick: ✗ Kent `pick` → "Only the host or scribe can pick."; ✗ pick a non-candidate → "That book isn't on this
  slate."; pick twice → "This slate is already picked."; `pick(..., 'shelby-g')` overrides the rotation host.
- [ ] [E2E] Kent's phone never shows another member's choices; the "Secret from everyone in the club and every AI. Not
  a bank vault." line is on `/ballot`.

---

### SC3b — Score go-around (open → own or table entry → reveal, both reveal modes)
**Intent:** after the talk, everyone's 0–10 + one word is captured on phones (own or table entry), visibility follows
`score_reveal`, and reveal puts the meeting into history and stats.

**Actors:** host of the meeting (Kent, hosts `2026-10`) · scribe (Shelby) · members (Kirk, Will) · guest (Dana, entered
by host) · Kent's AI · public.

**Fixture:** Appendix A base: meeting `2026-10` *The Overstory*, `status='met'`, `scoring='not_open'`, host `kent-l`.
Run twice: **SC3b-open** (`score_reveal='open'`, default) and **SC3b-together** (`update club set score_reveal='together'`).

**Steps**
1. Kent (host) on `/m/2026-10` taps **Open scoring** → `select scoring_set('2026-10', 'open')` → `open`.
   Home for roster shows the **score** action.
2. Shelby on her phone `/m/2026-10/score`: keypad 8.432, word "roots", attendance `voted` → `insert into votes (meeting,
   attendance, score, word, source) values ('2026-10','voted',8.432,'roots','me') on conflict (meeting, member) do update
   set attendance = excluded.attendance, score = excluded.score, word = excluded.word, source = excluded.source`
   (trigger `votes_stamp` sets `entered_by` and `entered_at`).
3. Kent opens `/m/2026-10/goaround`: rows = RSVP'd-yes first (none for Oct), then active roster, then "+ guest";
   reads `select member, name, has_entry from scoring_progress('2026-10')` (✓/—) plus, in `open` mode, current
   rows from `meeting_votes`. He enters as people speak: Kirk 7.999 "trees", Kent 9 "canopy", Will `missed` (reason
   "travel"), "+ guest" Dana 7.5 "seeds". **Save all** = one request: `select enter_votes('2026-10', $1)` with the rows as
   JSON (§5.10; one change → one Undo). A new guest is an `insert into members` statement first in the same request.
4. **SC3b-open:** while open, Will sees Shelby's 8.432/roots and the table rows live; public sees nothing.
   **SC3b-together:** while open, each member sees only their own row; Kent and Shelby see ✓/— only (from
   `scoring_progress`), not values (the goaround form shows "entered ✓" for rows already entered by others, and Kent
   can overwrite them only by typing a new value).
5. Kent taps **Reveal** → `select scoring_set('2026-10', 'revealed')` → club score shows **8.2** (8.432, 7.999,
   9.0, 7.5 with guest), rank among revealed meetings, words list; meeting appears in `book_scores`, stats update.
6. Correction later: Shelby `update votes set score = 8.5 where meeting='2026-10' and member='kirk-m'` → "corrected"
   mark on that row (`corrected = true` in `meeting_votes`: `source <> 'import' and entered_at > revealed_at`).

**Accept**
- [ ] [DB] Write rules: ✗ Kirk enters for Will while open (`source='me'`, member will-h) → "You can only enter your own
  score while scoring is open."; Kent (host) can enter for anyone through `enter_votes`, including over a row entered earlier, in both reveal modes; ✗ Kirk direct insert with
  `source='table'` → same message; ✗ Kirk `enter_votes` → "Only the scribe or host can enter the table."; ✗ any write while `not_open`; ✗ member write after `revealed`; scribe correction after reveal ✓.
- [ ] [DB] Checks: ✗ `voted` with null word → "A score needs one word."; ✗ score 10.5 → "Scores are 0 to 10."; ✗ word
  "two  spaces" → refused; `missed` with a score → refused; `unfinished` with score 4 → stored, never counted.
- [ ] [DB] Visibility, **open** mode: after step 3, Will (own `missed` row) sees the 4 others' rows during `open`; public 0 rows until
  `revealed`, then all (with `public_scores`).
- [ ] [DB] Visibility, **together** mode: during `open`, Will sees only the own `missed` row, Kirk sees only the own row, Kent (host) and
  Shelby (scribe) see only their own rows via `votes` and ✓/— via `scoring_progress`; **Kent's AI sees only Kent's
  row** (`asAi('kent-l')`); after reveal everyone sees all.
- [ ] [DB] ✗ Kirk `select * from scoring_progress('2026-10')` → "Only the scribe or host can see who has
  scored."; ✗ Kirk `scoring_set('2026-10','revealed')` → "Only the scribe or host can open or reveal scoring."; ✗ Kent
  `scoring_set('2026-10','open')` after reveal → "Only the scribe can reopen scoring."; ✗ any AI `scoring_set` →
  "Scoring is opened and revealed on the club site."; ✗ AI `insert into votes …` → "Your AI can't enter scores or
  words. Those are yours."
- [ ] [DB] After reveal: `book_scores` has the-overstory 8.2 with `n_scores = 4` (Will missed, not counted);
  `host_stats` kent-l `mean_pick_score` = avg of unrounded club scores (6.6875, 8.2328) → shown **7.5**.
- [ ] Go-around **Save all** is one change; Undo removes all 4 rows; a later own-phone edit by Kirk overwrites his table
  row (last write wins, both logged with actor).
- [ ] [E2E] Keypad accepts "8.432", rejects a 4th decimal; word field trims and refuses spaces inside the word only if
  doubled; "missed"/"unfinished" chips hide the word requirement.

---
### SC4 — Optional BYOAI DB
**Intent:** the product is complete with zero AI; any member *may* connect their own AI to the club's Studio space on
`db.byoaistudio.com`, and that AI reads what its member can and writes only AI-voice things.

**What "BYOAI DB" means here:** the club's database **is** a Studio members space (`sc-crushers`) on
`db.byoaistudio.com`. Connecting an AI = giving it a Studio key bound to `(club space, member)` (S3) that talks plain
SQL to Studio `/sql`. No MCP, no plugin, no local DB, no copy of the data.

**Actors:** member (Kent) · his AI (any chat AI that can make HTTP requests, following BookClubDocs) · scribe
(Shelby) · everyone else with **no** AI.

**Fixture:** Appendix A base. **SC4-none:** assert `select count(*) from byoaistudio.keys where space_id = <sc-crushers>`
= 0 before and after. **SC4-connect:** same base; Kent starts not connected.

**Steps — SC4-none (definition of done without AI)**
1. Run SC1, SC2-a, SC3, SC3b, SC5, SC6 end to end with no key ever created for the space.
2. Check every page in §4.1 renders for every persona with **no** AI-dependent element except card 5 / `/club/ai`
   (which is optional and hideable). No page says "ask your AI to…" as a required step; "Ask your AI" locators render
   only when the viewer's state is `connected`.

**Steps — SC4-connect**
3. Kent → `/club/ai`: `GET /site/connection` → `{state:'none'}` → copy: "Not connected" + the "Where the club's data
   lives" panel (§7) + 3 steps, step 1 active.
4. **Get your code** → `POST /site/connection/code` → `{code, expires_at}` (10 min) → state `code_open` ("code
   waiting · expires in 9 min").
5. **Give it to your AI** → one copy block (the only paste in Book Club):
   ```
   Connect to my book club.
   Code: BC-7KQ2-91XD   (expires 3:21 pm)
   Docs: https://github.com/1000Problems/BookClubDocs
   ```
6. The AI reads BookClubDocs `README.md`, redeems: `POST https://db.byoaistudio.com/connect {code, name:"Kent's
   Claude"}` → key bound to `(sc-crushers, kent-l)`. Checklist ticks step 2 (`state:'connected'`, `last_used_at` null →
   "connected · not used yet").
7. The AI's first `POST /sql` (`select name from club`) → Studio sets `last_used_at` → the page's 5 s poll ticks step 3:
   "Connected · ask it anything about the club". Card 5 disappears from Home for good; header pill = amber
   "Connected · last used just now".
8. AI **reads** (same rows as Kent, §SC2 step 12): `book_scores`, `member_stats`, `mix`, `meeting_votes` (reveal rules),
   `next_meeting`, `meeting_directions` (Kent is roster), `club_posts` (talk public), `later`.
9. AI **writes** (each one change, attributed "Kent L's AI" in Studio history, S8):
   - `insert into writeups (subject, body) values ('m:2026-09', $1) on conflict (subject) do update set body =
     excluded.body` → `/m/2026-09` shows it labelled "written by Kent L's AI · Nov 6".
   - `update books set cover_url = $2, goodreads_avg = 4.24, goodreads_checked_on = current_date where slug = 'piranesi'`
   - `update books set kind = 'nonfiction', kind_by = 'ai' where slug = 'the-wager'` → dashed until a person Confirms
     (`update books set kind_by = 'me' where slug = $1`, site).
   - `update later set done_at = now() where id = $1` for an owed cover item.
10. AI **refusals** (each returns the one-liner, changes nothing): votes, RSVPs, posts, candidates, ballot functions,
    scoring_set, club settings, roster.
11. Home/pages pick up AI writes within 10 s (`/changes` poll) with toast "Updated by Kent L's AI just now".
12. **Disconnect** on `/club/ai` → `DELETE /site/connection` → state `none`; the AI's next `/sql` → 401
    "this key was disconnected".
13. Privacy toggle interplay: given `visibility='members'` and `talk_visible_to_ai=false`, AI `select * from
    club_posts` → 0 rows; flip `talk_visible_to_ai=true` → rows.

**Accept**
- [ ] SC4-none: all listed scenarios pass with zero keys; no page or flow blocks on AI; no console errors from S9 when
  the state is `none`.
- [ ] Connect needs exactly one paste (the step-5 block) and no other copy action anywhere in Book Club (grep user
  copy for "paste" / "copy prompt" → only `/club/ai` step 2) **[E2E + grep]**.
- [ ] States render exactly: `none` · `code_open` (with countdown) · `connected · not used yet` · `connected · last used
  N min ago`; step 3 ticks within 5 s of the first `/sql` with no reload **[E2E]**.
- [ ] [DB] The key is member-scoped: ✗ it can't bind `sc-otherclub` (Kent is a member there too: needs its own key) or
  Kent's private Reading space; one open key per (club, member): a second redeem replaces the first (D9).
- [ ] [DB] Reads: for every §5.8 view except `open_actions`, `my_reads`, `my_prefs` and `reads`/`prefs` (site-only by
  design), `asAi('kent-l')` rows = `asSite('kent-l')` rows (talk: when AI-readable).
- [ ] [DB] Writes allowed: `writeups` (only on channel `ai`; ✗ site insert into writeups → "Write-ups are your AI's
  voice; post in Talk instead."), `books` facts, `kind` with `kind_by='ai'` (✗ AI `kind_by='me'` → "Your AI can suggest
  fiction/nonfiction; a person confirms."), `later`.
- [ ] [DB] Writes refused on channel `ai`, with message: `votes` "Your AI can't enter scores or words. Those are yours." ·
  `rsvps` "Your AI can't RSVP for you." · `posts` "Your AI can't post in the club chat." · `candidates` "Your AI can't
  change the slate." · any ballot function / `ballot_*` table "ballots are only available on the club site" ·
  `scoring_set` "Scoring is opened and revealed on the club site." · `club` "Club settings change on the club site." ·
  `members`/`rotation` from a non-scribe's AI "Only the scribe's AI can change the roster."
- [ ] [DB] Together mode: AI sees only its member's vote row until reveal (SC3b).
- [ ] [DB] Disconnect revokes immediately (next request 401); removing Kent from the club (SC5 step 9) also revokes it.
- [ ] Studio history shows AI changes as "Kent L's AI", site changes as "Kent L"; Kent can undo his AI's change (own
  member), Will can't (403 "You can only undo your own changes.").

---

### SC5 — Invite, join, multi-club picker
**Intent:** the scribe turns a roster row into a signed-in member with a link; an account in two clubs picks one.

**Actors:** scribe (Shelby) · invitee (Nora, `nora@sc.test`, no Studio account) · Kent (member of `sc-crushers` and
`sc-otherclub`).

**Fixture:** Appendix A base (roster row `nora-p` active, unlinked; `sc-otherclub` has Kent as `kent` member).

**Steps**
1. Shelby → `/club` Roster: `GET /club/members` (Studio, scribe view: slug, role, joined, last seen) joined on the site
   with `select slug, name, status from members` → Nora shows "not joined".
2. **Copy invite link** → `POST /club/invites {member_slug:'nora-p', role:'member'}` → `{url, expires_at}`
   (`https://db.byoaistudio.com/join/<token>`, 14 days). Shelby texts it (no email sent).
3. Nora opens it on her phone → Studio `/join/<token>`: "Soul Crushers (test) · You're invited as Nora P" → **Sign up**
   (email + password) → one owner transaction: account created, `space_members(sc-crushers, nora, member, 'nora-p')`,
   invite marked used, site session created → redirect to the Book Club site `/` signed in (90-day sliding session).
4. Nora's Home: member view (RSVP, chat composer, card 5). `ballot_turnout` eligible is now **5**.
5. ✗ Nora (or anyone) opens the same link again → "This invite was already used." Expired → "This invite expired. Ask
   your scribe for a new one." Revoked (`DELETE /club/invites/:id`) → "This invite was cancelled."
6. ✗ Shelby invites `nora-p` again → "Nora P has already joined." ✗ Nora's account accepting a second invite to
   `sc-crushers` for `will-h` → "You're already in this club."
7. Kent signs in on a fresh browser → `/authorize?site=bookclub` → **club picker** (Soul Crushers (test), Other Club
   (test)) → picks Soul Crushers → session `(bookclub, sc-crushers, kent)`. `/club` → **Switch club** → picker again.
8. An account with no club membership → "You're not in a club here yet: ask your scribe for an invite."
9. Shelby removes Will: `DELETE /club/members/will-h` → Will's site sessions and AI keys for `sc-crushers` revoked in the
   same transaction; `update members set status = 'alumni', left_on = current_date where slug = 'will-h'` (site,
   same flow); Will's history stays.

**Accept**
- [ ] Join works for sign-up and, in a variant that creates Nora's account first, for an already-signed-in Studio account
  (one tap) **[E2E]**.
- [ ] [DB] Token stored hashed only; single use; 14-day expiry; the role on the membership = the invite's role;
  `space_members.member_slug` unique per space.
- [ ] [DB] After join, `select slug, name, role from me` as Nora = `nora-p, Nora P, member`; eligible voters 5.
- [ ] Picker appears only for >1 club; the chosen club is the session's space; a session for club A never reads club
  B rows **[DB]**.
- [ ] [DB] After step 9: Will's old session → 401 on next request; `members.status='alumni'`; his votes still in
  `book_scores`; eligible voters back to 4.
- [ ] ✗ Kirk (member) `POST /club/invites` → 403 "Only the scribe can invite."

---

### SC6 — Public ↔ private toggle
**Intent:** one scribe switch makes the club members-only for signed-out visitors, enforced by Studio and by RLS, and
switching back restores the public view.

**Actors:** scribe (Shelby) · public · member (Kent).

**Fixture:** Appendix A base (`visibility='public'`, `public_talk=true`, `public_scores=true`, `spaces.public_read=true`).

**Steps**
1. Shelby → `/club` Settings → **Visibility: Members only** → site sends, in this order: Studio `PUT /club/visibility
   {public:false}` (sets `spaces.public_read=false`), then `update club set visibility = 'members'`. If the second
   fails, the site retries it; the Studio flag alone already blocks public reads.
2. Public phone (after ≤ 60 s cache) opens `/` → one card: club name, `about`, "Members: sign in". `/history`,
   `/stats`, `/talk`, `/m/*`, `/b/*` → same one-card page (HTTP 200, no data).
3. Public request (site token) straight to Studio `POST /sql` with `X-Public-Space: sc-crushers` → **403** "this club is
   members-only".
4. Kent (signed in) sees everything unchanged; his AI unchanged except talk: with `talk_visible_to_ai=false`, AI
   `club_posts` → 0 rows.
5. Shelby flips back: `PUT /club/visibility {public:true}` then `update club set visibility='public'` → public sees SC1's
   public view again. Sub-toggles: `public_talk=false` hides card 3 + `/talk` for public only; `public_scores=false`
   gives SC2 step 11.

**Accept**
- [ ] [DB] With `public_read=false`, every public statement → 403 before SQL runs; with `public_read=true` but
  `club.visibility='members'` (inconsistent state) every public select returns 0 rows (RLS), so either layer alone is
  enough.
- [ ] [DB] ✗ Kent `PUT /club/visibility` → 403 "Only the scribe can change club privacy."; ✗ Kent `update club set
  visibility='public'` → "Only the scribe can change club settings."
- [ ] [DB] ✗ `PUT /club/visibility {public:true}` on a private (Reading) space → refused (S5 trigger).
- [ ] [E2E] Members-only public page leaks nothing: no book titles, member names, post bodies, counts or dates in the
  HTML or JSON.
- [ ] Switching takes effect within 60 s for public (cache), immediately for Studio `/sql`.
- [ ] Both changes appear in Studio history as "Shelby G"; Undo of the `club` row change also calls `PUT
  /club/visibility` to match (the site's undo handler for this one table).

---
## 5. Data model

### 5.0 Helpers (in the bookclub migration; all `stable`, `security invoker`, `set search_path = byoaistudio_bookclub, byoaistudio_data, byoaistudio`)
```sql
me()          returns text    -- byoaistudio.current_member_slug()             (S3)
role()        returns text    -- byoaistudio.current_role()  (scribe|member|alumni|guest|public|maintenance)
channel()     returns text    -- byoaistudio.current_channel() (site|ai|public|owner)  (S4)
is_roster()   := role() in ('scribe','member','alumni','guest')
is_active()   := role() in ('scribe','member')
is_scribe()   := role() = 'scribe'
is_public()   := role() = 'public'
is_maint()    := role() = 'maintenance'            -- owner login only (PR #1); undo, delete-space, import
is_host(m text) := exists (select 1 from bookclub_meetings where slug = m and host = me())
setting(k text) returns text  -- reads the one bookclub_club row; public may read it
club_now()         returns timestamptz -- coalesce(nullif(current_setting('bookclub.now', true),'')::timestamptz, now())
                                           -- test clock (SC.0); never set in production. Views use it, not now().
is_ai()       := channel() = 'ai'
eligible_voters() returns setof text  -- definer (appfn): members.status='active' slugs that have a
                                           -- space_members row with role in ('scribe','member'), via
                                           -- byoaistudio.space_member_slugs() (S3)
```
Every policy wraps calls in `(select …)` for initplan evaluation (DB-IMPL §4). Every table has `space_id bigint not null
default byoaistudio.current_space()`, PK leading with `space_id`, forced RLS, base policy `space_id = (select
byoaistudio.current_space())` AND'd with the rules below, and a permissive `is_maint()` clause for all operations.

### 5.1 Club and people
```sql
bookclub_club (one row per space; pk space_id)
  name text not null, founded_on date, about text,                       -- about = Markdown, human
  visibility text not null default 'public' check (visibility in ('public','members')),
  public_talk boolean not null default true,      -- only meaningful when visibility='public'
  public_scores boolean not null default true,    -- revealed scores + words on public pages
  score_reveal text not null default 'open' check (score_reveal in ('open','together')),
  talk_visible_to_ai boolean not null default false,   -- only consulted when talk isn't public
  score_min numeric not null default 0, score_max numeric not null default 10,
  ballot_method text not null default 'top3_borda' check (ballot_method = 'top3_borda'),
  slate_size smallint not null default 5 check (slate_size between 2 and 8),
  partial_counts boolean not null default true,
  guest_counts boolean not null default true,      -- confirm at import (§12 checksum)
  stats_min_n smallint not null default 10         -- easy/harsh ranks need n ≥ this (fixture: 2)
  RLS: select = everyone incl. public · update = scribe

bookclub_members  pk (space_id, slug)
  slug text check (slug ~ '^[a-z0-9-]+$'),  name text not null ("Shelby G"),  aliases text[] default '{}',
  status text not null check (status in ('active','alumni','guest')),
  joined_on date, left_on date, note text
  -- NO account id, NO email, NO birthdate. Link to a Studio account is space_members.member_slug (S3).
  RLS: select = roster; public only if visibility='public' (names only, the view never exposes note) ·
       insert/update = scribe; the host of a meeting whose scoring is 'open' may insert status='guest' rows
       (go-around "+ guest") · delete = scribe (refused by FK if referenced) · channel()='ai' only for the
       scribe's AI

bookclub_rotation pk (space_id, position)   position int, member text → members
  RLS: select roster · write scribe
```

### 5.2 Books and meetings
```sql
bookclub_books  pk (space_id, slug)
  slug, title not null, author text, isbn text, cover_url text, year_published int,
  kind text check (kind in ('fiction','nonfiction')), kind_by text check (kind_by in ('me','ai')),
  goodreads_avg numeric(3,2) check (goodreads_avg between 1 and 5), goodreads_checked_on date
  unique index on (space_id, lower(title), lower(coalesce(author,'')))  -- duplicate refused with existing slug
  RLS: select everyone (public if visibility='public') · insert/update roster-active + AI keys;
       AI may set kind only with kind_by='ai' (check in trigger: channel()='ai' ⇒ kind_by='ai')

bookclub_meetings  pk (space_id, slug)          slug = 'YYYY-MM'
  number int, month date not null, status text not null check (status in ('planned','met','skipped')),
  meets_at timestamptz,                -- date + time ("Thu Dec 3, 7 pm"); null until set
  book text → books, host text → members, venue_member text → members,
  venue_label text,                    -- public-safe: "at Kirk's", "Eleven Winery"
  host_line text,                      -- "Kirk's making soup" (human)
  bring text[] not null default '{}',  -- chips: {bread,wine,gummies}
  food text, notes text,               -- after the night (human)
  continues text → meetings,           -- two-month books: scores live on the last one
  scoring text not null default 'not_open' check (scoring in ('not_open','open','revealed')),
  legacy_score numeric,                -- import only; hidden from views after review
  revealed_at timestamptz              -- set by scoring_set(…,'revealed'); drives the "corrected" mark
  RLS select: roster; public if visibility='public'
  RLS insert/delete: scribe · update: scribe; host of that meeting (not the host's AI: channel() <> 'ai' unless
      scribe; "Only the scribe's AI can change meetings.") may update only
      meets_at, venue_member, venue_label, host_line, bring, food, notes (enforced by BEFORE UPDATE
      trigger `meetings_host_cols` comparing old/new for non-scribes → "Hosts can change time, place and
      bring; the book and host are the scribe's."; skipped while `bookclub.in_scoring_set` is on)
  `scoring` and `revealed_at` change ONLY through scoring_set() (§5.10); trigger
      `meetings_scoring_guard` refuses direct updates of those columns unless is_maint() or the
      function's local flag `bookclub.in_scoring_set` is on.
  Trigger `meetings_thread`: after insert → insert thread (slug = meeting slug, kind='meeting').

bookclub_meeting_private  pk (space_id, meeting)  → meetings
  address text, directions text, parking text     -- members-only logistics
  RLS select: roster · write: scribe or is_host(meeting)
  View `meeting_directions`. Never readable by public (no public clause at all).
```

### 5.3 RSVP
```sql
bookclub_rsvps  pk (space_id, meeting, member)      member text not null default me() → members
  status text not null check (status in ('yes','maybe','no')), guests smallint not null default 0 check (guests between 0 and 5),
  bringing text, updated_at timestamptz default now()
  RLS select: roster (counts shown to public via view `rsvp_counts` only if visibility='public': yes/maybe totals, no names)
  RLS write: (member = me() and is_roster()) or is_scribe() or is_host(meeting); channel() <> 'ai'
```

### 5.4 Scores and words
```sql
bookclub_votes  pk (space_id, meeting, member)      member text not null default me() → members
  attendance text not null check (attendance in ('voted','partial','unfinished','missed','out')),
  score numeric(5,3) check (score between 0 and 10),          -- 7.999 and 8.432 exist; keep 3 decimals
  word text check (word is null or (length(word) <= 40 and word !~ '\s{2,}')),
  miss_reason text, comment text,
  source text not null check (source in ('me','table','import')),   -- 'table' = scribe/host go-around
  entered_by text → members, entered_at timestamptz default now()
  check: attendance in ('voted','partial') ⇒ score not null and word not null
         attendance in ('missed','out')    ⇒ score is null
         attendance = 'unfinished'         ⇒ score may be present but never counts
```
**Visibility (RLS `for select`), the whole rule:**
```sql
using ( base and ( is_maint()
  or ( is_roster() and (
         member = me()
      or m.scoring = 'revealed'
      or (m.scoring = 'open' and setting('score_reveal') = 'open') ))
  or ( is_public() and setting('visibility')='public' and setting('public_scores')::bool
       and m.scoring = 'revealed' ) ) )
-- m = the vote's meeting (correlated subquery on bookclub_meetings)
```
In `together` mode a member's AI key also sees only that member's row until reveal, because the AI binds as that
member. A connected AI therefore can't peek. Scribe and host see who has entered (not the scores) through
`scoring_progress(meeting)`, a security-definer function owned by `byoaistudio_appfn` (S7) that returns
`(member, name, has_entry boolean)` (§5.10).

**Write (RLS insert/update):**
```sql
with check ( base and channel() <> 'ai' and m.scoring = 'open' and member = me() and is_active() and source = 'me' )
 or ( base and is_scribe() and m.scoring = 'revealed' )          -- corrections, logged + undoable
 or is_maint()                                                    -- import (source='import')
 or current_user = 'byoaistudio_appfn'                            -- enter_votes (§5.10) only
```
**Table entry goes through `enter_votes` (§5.10), never a direct upsert.** Postgres applies the select policy to the
existing row of an `on conflict do update`, so in `together` mode a direct upsert by the host fails on any row the host
can't see. The definer function has no such limit and reveals nothing.

**Trigger `votes_stamp`** (BEFORE insert/update, skipped for `is_maint()`): sets `entered_by = me()` and
`entered_at = now()`. This is what makes the "corrected" mark work on a plain `update votes` after reveal.

**`club_score` (view `book_scores`):** `round(avg(score), 1)` over rows where `attendance='voted'`, or
`attendance='partial' and partial_counts`, and the member isn't a guest unless `guest_counts`. Only meetings with
`scoring='revealed'` appear.

**Votes policies:** `votes_write_own`, `votes_correct`, `votes_not_ai` (restrictive: `channel() <> 'ai'`). Their
one-line refusals come from the §5.10 trigger.

### 5.5 Slate and ballot (site-only, unlogged, unlinked)
```sql
bookclub_slates  pk (space_id, at_meeting)          -- at_meeting → meetings: the meeting where the ballot runs
  picks_for text null,                               -- slug of the month this picks; set by open_ballot (default:
                                                     -- month after at_meeting). NO foreign key: the meeting row
                                                     -- may not exist until pick creates it
  host text not null → members                       -- default: host of at_meeting (trigger); scribe may change
  status text not null default 'drafting' check (status in ('drafting','voting','closed','picked')),
  opens_at, closes_at timestamptz,                   -- closes_at null = manual close / all voted
  picked_book text → books,
  ballots int, eligible int                          -- written by close_ballot
  RLS select: roster; public if visibility='public' and status in ('closed','picked')
  RLS insert: scribe, or host of at_meeting (status 'drafting') · update: scribe or slates.host, only
      host/closes_at while drafting; status/opens_at/picks_for/picked_book/ballots/eligible ONLY via §5.10
      functions (trigger `slates_status_guard`) · channel() <> 'ai'

bookclub_candidates  pk (space_id, slate, book)   slate → slates(at_meeting), book → books, pitch text (human, ≤ 280),
                                                  added_at timestamptz default now()
  ≤ club.slate_size rows per slate (trigger → "The slate is full (5 books).")
  RLS select like slates (public after close); insert/update/delete: scribe or slates.host, only while
      slate.status='drafting' ("Only the host or scribe can change the slate."); channel() <> 'ai'
      ("Your AI can't change the slate.")

-- ↓ SITE-ONLY (app_objects ai_visible=false) and UNLOGGED (app_objects logged=false), S6/S7
bookclub_ballot_voters   pk (space_id, slate, member)    cast_minute timestamptz not null   -- date_trunc('minute', now())
bookclub_ballot_pending  pk (space_id, slate, ballot uuid)  first text not null, second text, third text  -- NO member column
bookclub_ballot_choices  pk (space_id, slate, ballot uuid)  first text not null, second text, third text  -- written only at close
```
**Grants:** none of the three tables to `byoaistudio_space` (AI), `byoaistudio_render` (public) or `byoaistudio_site`
(site). Only `byoaistudio_appfn` (function owner) touches them, with policies `to byoaistudio_appfn using (space_id =
(select byoaistudio.current_space()))`. The site reaches them only through the §5.10 functions.

**`ballot_results` view** (owned by `byoaistudio_appfn`, `security_invoker = false`, so it reads `ballot_choices`
with the owner's rights while still filtered by the bound space): one row per candidate of a slate whose status is
`closed`/`picked` **and** the caller may see that slate (roster; AI; public when `visibility='public'`). Columns:
`slate, book, title, points int, firsts int, seconds int, thirds int, ballots int, eligible int, place int, tied
boolean`. `place` = dense rank by `(points desc, firsts desc)`; `tied` = another row has the same `(points, firsts)`.
Grant select to site, space and render. It's the only ballot object in AI `/describe`.

**Why all four mechanisms** (unchanged from v2):
| Leak | Closed by |
|---|---|
| A member, host, scribe or AI reads who chose what | no member column on choices; no grants; functions only; RLS |
| Change log shows `member:x` next to choices | tables registered **unlogged**: no change trigger, no `/history`, no `/undo` (S6) |
| Postgres `xmin` on choice rows → `tx_space(xid → member)` | choices live in `pending` until close and are rewritten (shuffled) by the close transaction. `forget_binding()` deletes the cast transaction's `tx_space` row before commit, so the voter is never stored next to that xid |
| A running tally anchors loud voices | no results view rows until close; turnout count only |
| Database operator (WAL, server logs, timing) | **not claimed.** Studio doesn't log `/sql` bodies or member ids for requests that call site-only functions (S7). The UI says: "Secret from everyone in the club and every AI. Not a bank vault." |

A ballot can't be changed once cast. Reopening is `reopen_ballot(slate)` (scribe): it wipes voters, pending
and choices for that slate, and everyone votes again. That's a deliberate action, not `/undo`.

### 5.6 Talk
```sql
bookclub_threads  pk (space_id, slug)   title text not null, meeting text → meetings null,
                                        kind text not null check (kind in ('club','meeting','standing')),
                                        pinned bool default false, closed bool default false,
                                        created_by text default me()
  -- trigger `club_thread` after insert on bookclub_club creates thread 'club' (home chat), so a space gets it
  -- whenever its club row is created; meeting threads auto-created by trigger on meetings insert; pinned while their
  -- month is current
  RLS select: like posts · insert 'standing': roster · update pinned/closed: scribe
bookclub_posts  pk (space_id, id uuid default gen_random_uuid())
  thread text not null → threads, member text not null → members default me(),
  body text not null check (length(body) between 1 and 4000) (Markdown),
  created_at timestamptz default now(), edited_at timestamptz, hidden_by text → members,
  source text not null default 'me' check (source = 'me')
  RLS select: (is_roster() and channel() <> 'ai' and (hidden_by is null or is_scribe()))
           or (is_public() and setting('visibility')='public' and setting('public_talk')::bool and hidden_by is null)
           or (channel() = 'ai' and hidden_by is null and ((setting('visibility')='public' and setting('public_talk')::bool)
               or setting('talk_visible_to_ai')::bool))
  -- the channel test in the first branch is required: an AI key's role is a roster role
  RLS insert (`posts_insert`): is_roster() and member = me() and channel() <> 'ai' and not thread.closed
  RLS update (`posts_update`): USING = the select rule, so the refusal trigger fires (§5.10); WITH CHECK own row,
      body/edited_at only; scribe may set hidden_by (and clear it)
bookclub_reads  pk (space_id, thread, member)  member default me(), last_read_at timestamptz
  -- unread dots; own row only; unlogged + ai_visible=false (noise)
```

### 5.7 AI voice, owed work, prefs
```sql
bookclub_writeups  pk (space_id, subject)
  subject text check (subject ~ '^(m|b|member|club):[a-z0-9-]+$'),   -- m:2026-09 · b:piranesi · member:kent-l · club:year-2026
  body text not null (Markdown, ≤ 20000), written_by text not null default me() → members,
  written_at timestamptz default now()
  RLS select: roster; public if visibility='public' (subjects whose target is public)
  RLS insert/update: channel() = 'ai' and written_by = me() ("Write-ups are your AI's voice; post in Talk instead.")
  delete: scribe (site) or the writing member's AI

bookclub_later  pk (space_id, id uuid default gen_random_uuid())
  kind text not null check (kind in ('cover','goodreads','kind','import_flag','writeup')),
  subject text not null,            -- same format as writeups.subject
  note text, created_at timestamptz default now(), created_by text,
  done_at timestamptz, done_by text
  unique index on (space_id, kind, subject) where done_at is null
  RLS select: roster + AI · insert: roster, AI, maint · update done_at/done_by: roster or AI · delete: scribe
  -- TASK-31 owed pattern; trigger adds 'cover'/'goodreads'/'kind' rows when a book lacks them

bookclub_prefs  pk (space_id, member)  member default me(), ai_checklist_hidden_at timestamptz
  -- own row only; unlogged + ai_visible=false
```

### 5.8 Views (the read contract for pages, stats, docs and AIs)
All `security_invoker = true` (inherit table RLS; score visibility follows §5.4 automatically) unless noted.
Numbers: club scores `numeric(3,1)` display, computed from unrounded averages; member means `numeric(5,3)`.

| View | Columns | Notes |
|---|---|---|
| `me` | `slug, name, role, status` | one row for signed-in; zero for public. PR #1's deferred "who am I" |
| `club` | all `bookclub_club` columns | public may read |
| `members` | `slug, name, status, joined_on, left_on` (+ `aliases, note` for roster only via `members_roster`, which is read-only; the scribe's `note` and `aliases` edits use `update members_private`, a plain view with `slug, aliases, note`, scribe only) | public: rows only when `visibility='public'` |
| `members_roster` | `slug, name, aliases, status, joined_on, left_on, note, linked boolean` | roster only; `linked` from `space_member_slugs()` |
| `books` | table columns | |
| `votes`, `rsvps`, `posts`, `slates`, `candidates`, `rotation`, `meeting_private`, `threads`, `reads`, `prefs` | table columns except `space_id` | **plain one-table write views**, one per table named in the scenarios' SQL; Studio's upsert rewrite needs them. RLS as in §5.1–5.7. `reads` and `prefs` are `ai_visible=false` |
| `book_cards` | `slug, title, author, cover_url, kind, kind_by, goodreads_avg, gr_x2, meetings text[], times_on_slate int` | `/b/[slug]` |
| `meetings` | table columns except `legacy_score` | |
| `meeting_cards` | `slug, number, month, year, status, scoring, book, title, author, cover_url, kind, host, host_name, venue_label, club_score, n_scores, gr_x2, rank_all, rank_year` | score columns null unless `book_scores` row visible |
| `next_meeting` | `slug, month, meets_at, book, title, author, cover_url, host, host_name, venue_label, host_line, bring, days_until int, rsvp_yes int, rsvp_maybe int, rsvp_guests int` | earliest `status='planned'` meeting with `coalesce(meets_at, month + interval '1 month') >= club_now() - interval '4 hours'`; `days_until` = whole days from `club_now()` to `meets_at` (PT); RSVP numbers via definer `rsvp_counts()` so public gets counts, never names |
| `last_meeting` | `slug, month, title, author, cover_url, host_name, club_score, rank_all, ranked_count, top_words text[]` | latest `scoring='revealed'` meeting; `top_words` = up to 5 words by score desc from visible votes |
| `meeting_directions` | `meeting, address, directions, parking` | roster only (no public clause) |
| `my_rsvp` | `meeting, status, guests, bringing` | `member = me()` |
| `rsvp_board` | `meeting, member, name, status, guests, bringing` | roster; one row per active member (left join; `status` null = no answer) |
| `open_actions` | `sort int, kind text ('ballot','score','slate','logistics','schedule'), meeting, slate, title, detail, href, host_only bool` | roster only; zero rows for public/AI. ballot: slate `voting`; score: meeting `scoring='open'` (`detail` = own score if entered); slate: `drafting` and `slates.host = me()`; logistics: next meeting `host = me()` and (`meets_at` or `venue_label` null); schedule: scribe and no `next_meeting` |
| `meeting_votes` | `meeting, member, name, status, attendance, score, word, source, corrected bool, entered_by` | visibility = §5.4 rule; `corrected` = `source <> 'import' and revealed_at is not null and entered_at > revealed_at` |
| `book_scores` | `meeting, book, title, author, month, year, host, club_score, club_score_raw, n_scores, gr_x2, delta, rank_all, rank_year, ranked_count` | revealed meetings only; counting rule §5.4; `gr_x2 = goodreads_avg*2`; `delta = club_score_raw - gr_x2`; ranks = `rank()` by `club_score_raw desc`. Two-month books: scores on the last meeting, `continues` rows excluded |
| `member_stats` | `member, name, status, n, mean, stdev, misses, unfinished, easy_rank, harsh_rank` | revealed meetings only; not guests; counting rule; ranks null when `n < stats_min_n` |
| `host_stats` | `member, name, times_hosted, mean_pick_score, best_meeting, best_title` | `times_hosted` counts `status='met'` meetings; mean over revealed |
| `mix` | `period text, period_kind text ('year'\|'era'), fiction, nonfiction, untagged, pct_fiction` | counts `status='met'` meetings with a book; era = 5-year buckets starting at `year(founded_on)` (`2008–2012`, `2013–2017`, …); `pct_fiction` over tagged only |
| `attendance` | `member, name, attended, missed, out, unfinished, longest_streak` | attended = voted/partial/unfinished |
| `words` | `meeting, book, title, member, name, word, score` | visible votes with a word |
| `slate_cards` | `slate, book, title, author, cover_url, kind, pitch, added_at` | like candidates RLS |
| `ballot_results` | see §5.5 | definer-owned |
| `club_posts` | `id, thread, member, name, body, created_at, edited_at, mine bool, hidden bool` | `thread='club'`; `hidden` true only for scribe |
| `thread_posts` | same + any thread | `/talk/[thread]` |
| `my_reads` | `thread, last_read_at` | own rows |
| `my_prefs` | `ai_checklist_hidden_at` | own row |
| `writeups` | `subject, body, written_by, written_by_name, written_at` | label "written by <name>'s AI · <date>" |
| `later` | table columns | |

### 5.9 Logging summary
| Table | Change log + undo | AI visible |
|---|---|---|
| club, members, rotation, books, meetings, meeting_private, rsvps, votes, slates, candidates, threads, posts, writeups, later | **yes** (actor = member + channel, S8) | yes, per RLS (posts conditional; meeting_private = roster) |
| ballot_voters, ballot_pending, ballot_choices | **no** | **no** |
| reads, prefs | no (noise) | no |

### 5.10 Function contracts (one place)
All in schema `byoaistudio_bookclub`. "Site" = execute granted to `byoaistudio_site` only, registered in `app_objects` with
`ai_visible=false` (S6/S7), so an AI call gets "ballots are only available on the club site" (ballot functions) or
"Scoring is opened and revealed on the club site." (scoring). Definer functions are owned by `byoaistudio_appfn`,
`set search_path = byoaistudio_bookclub, byoaistudio_data, byoaistudio, pg_temp`, and re-check the caller with `me()`/`role()`
first. Errors are `raise exception using errcode = 'P0001', message = <copy>`; Studio returns the message as the
one-liner. `slate` parameters are the slate's `at_meeting` slug.

| Function | Params | Returns | Who | Effect / rules |
|---|---|---|---|---|
| `scoring_progress` | `p_meeting text` | `table(member text, name text, has_entry boolean)` | site; scribe or host of meeting | active roster + guests with a row; never returns scores |
| `enter_votes` | `p_meeting text, p_rows jsonb` (array of `{member, attendance, score, word, miss_reason}`) | `int` (rows saved) | site; definer; scribe or host of meeting; scoring `open` | upserts every row with `source='table'`, `entered_by = me()`, in one statement's transaction; same column checks as `votes`; refuses `member` not in roster |
| `scoring_set` | `p_meeting text, p_to text` (`'open'\|'revealed'`) | `text` (new `scoring`) | site; definer; scribe or host (open, reveal); scribe only for `revealed → open` | `not_open→open` (sets `status='met'` if `planned`); `open→revealed` (sets `revealed_at`); `revealed→open` scribe; anything else → "Scoring can't go from X to Y." |
| `open_ballot` | `p_slate text, p_closes_at timestamptz default null` | `table(status text, opens_at timestamptz, closes_at timestamptz, picks_for text)` | site; scribe or `slates.host` | `drafting→voting`; needs 2..`slate_size` candidates ("Add at least 2 books."); sets `picks_for` = next month slug if null |
| `cast_ballot` | `p_slate text, p_first text, p_second text default null, p_third text default null` | `table(cast_count int, eligible int)` | site; `me()` in `eligible_voters()` | slate `voting`; not in `ballot_voters`; books are candidates and distinct; inserts voters (`cast_minute`) + pending (`gen_random_uuid()`); computes turnout; **then** `byoaistudio.forget_binding()`; returns. **Sent alone in its own request.** |
| `ballot_turnout` | `p_slate text` | `table(cast_count int, eligible int, me_cast boolean)` | site; roster | `eligible` = live count of `eligible_voters()` while voting; frozen `slates.eligible` after close |
| `close_ballot` | `p_slate text` | `setof ballot_results` row type | site; scribe or `slates.host` | `voting→closed`; insert into choices from pending `order by random()`; delete pending; write `ballots`, `eligible`; return results |
| `close_if_due` | `p_slate text` | `boolean` (true = closed now) | site; any active member | closes (as `close_ballot`) only if `cast_count = eligible` or `closes_at <= club_now()`; else false, no change. Site calls it on `/`, `/ballot`, `/next` loads while a slate is `voting` |
| `reopen_ballot` | `p_slate text` | `void` | site; scribe | from `voting`/`closed` only; deletes voters, pending, choices for slate; status `voting`; clears `ballots`/`eligible` |
| `pick` | `p_slate text, p_book text, p_host text default null` | `text` (picked meeting slug) | site; scribe or `slates.host` | `closed→picked`; `p_book` must be a candidate; upsert meeting `picks_for` (`planned`, book, host = `p_host` or next in rotation after the `at_meeting` host, `venue_member` = that host); sets `picked_book` |
| `rsvp_counts` | `p_meeting text` | `table(yes int, maybe int, guests int)` | definer; everyone incl. public (p) | used by `next_meeting`; counts only |
| `eligible_voters` | — | `setof text` | definer (internal) | §5.0 |

**How refusals reach the user (D21).** Postgres doesn't name the policy that refused a row, so a policy-to-message map
can't work. RLS stays the enforcement. Messages come from three places:
1. **Refusal triggers:** a BEFORE insert/update/delete trigger on each logged write table repeats the rule and raises
   the copy below with `errcode = 'P0001'`. It runs before RLS, so the user gets the message; if a trigger is ever wrong,
   RLS still refuses. UPDATE and DELETE policies use `USING` = the select rule, otherwise a forbidden row is filtered out,
   the trigger never fires, and the statement "succeeds" on 0 rows.
2. **Check constraints:** name them and add `bookclub_*` entries to `CONSTRAINT_MESSAGES` in `src/lib/errors.ts`.
3. **Fallback (S3):** a raw RLS error on a members space returns "You can't do that here." instead of today's "your
   own space" line.
Studio returns P0001 messages without the `statement n:` prefix (S3). "Policy / source" below names the rule, not a
Postgres object Studio can read.

**Error copy** — the site shows these verbatim:
| Rule / source | Message |
|---|---|
| `rsvps_write` | Only you can RSVP for yourself (or the host/scribe for you). |
| `rsvps_not_ai` | Your AI can't RSVP for you. |
| `votes_write_own` | You can only enter your own score while scoring is open. |
| `votes_not_ai` | Your AI can't enter scores or words. Those are yours. |
| votes checks | A score needs one word. · Scores are 0 to 10. · One word, no double spaces. |
| `meetings_host_cols` | Hosts can change time, place and bring; the book and host are the scribe's. · (AI) Only the scribe's AI can change meetings. |
| `posts_insert` / `posts_not_ai` | Sign in as a member to post. / Your AI can't post in the club chat. |
| `posts_update` | You can only edit your own posts. |
| `candidates_*` | Only the host or scribe can change the slate. · The slate is full (5 books). · Your AI can't change the slate. |
| `club_update` | Only the scribe can change club settings. · (AI) Club settings change on the club site. |
| `members_write` (AI) | Only the scribe's AI can change the roster. |
| `writeups_write` | Write-ups are your AI's voice; post in Talk instead. |
| `books_kind_ai` | Your AI can suggest fiction/nonfiction; a person confirms. |
| ballot fns | You've already voted. Ballots can't be changed (the scribe can reopen for everyone). · Pick different books for 1st, 2nd and 3rd. · That book isn't on this slate. · Only active members vote. · Voting is closed. · Only the host or scribe can close the ballot. · Only the scribe can reopen a ballot. · This slate is already picked. · Only the host or scribe can pick. · Add at least 2 books. |
| scoring fns | Only the scribe or host can enter the table. · Only the scribe or host can see who has scored. · Only the scribe or host can open or reveal scoring. · Only the scribe can reopen scoring. · Scoring can't go from X to Y. |
| guard (S6/S7, AI channel) | ballots are only available on the club site · Scoring is opened and revealed on the club site. |
| Studio (S1/S2/S5/S8/S10, not SQL) | You can only undo your own changes. · Only the scribe can invite. · Only the scribe can change club privacy. · this club is members-only · this key was disconnected · This invite was already used. · This invite expired. Ask your scribe for a new one. · This invite was cancelled. · Nora P has already joined. (`<name> has already joined.`) · You're already in this club. · You're not in a club here yet: ask your scribe for an invite. |

---

## 6. Flows

### 6.1 Monthly cycle
1. **Rotation** says who hosts next. The scribe can override (swaps happen: Will↔Shelby in Aug–Sep 2026).
2. **Host builds the slate** on `/next` (slate `at_meeting` = this month's meeting; `slates.host` defaults to its
   host, D14/O5): types a title, picks the match (books table, then Open Library lookup on the
   site server), adds a one-line pitch. Five max. Status `drafting`.
3. **At the meeting:** discussion → **score go-around** (§6.2) → host taps **Open ballot** → phones vote (§6.3) →
   Close → winner on every phone → `pick` creates the `picks_for` meeting (default next month). *Tested by SC3 / SC3b.*
4. **During the month:** the host fills `meets_at`, place, host line and bring list. Members RSVP. Home shows the card.
   At ≤ 7 days a "One week out: RSVP" banner shows, and the host sees "6 yes · 1 maybe · 3 no answer".
5. Rotation advances when `pick` runs (host of `picks_for` = next in rotation after the `at_meeting` host unless
   given).

### 6.2 Scoring (go-around)
1. Host or scribe taps **Open scoring** on `/m/[slug]` (`scoring: not_open → open`).
2. Either each person types their own on `/m/[slug]/score`, or the scribe/host types the table on
   `/m/[slug]/goaround` as people speak. Both can happen; one row per member, last write wins, every write logged.
3. In `open` reveal mode (default), entries appear live for the roster. In `together` mode, members see only their
   own until reveal; the scribe sees ✓/— via `scoring_progress`.
4. **Reveal** (scribe or host) → `revealed`. `club_score` and rank show up, and the meeting joins history.
5. Corrections later: scribe only (logged, undoable, shows a small "corrected" mark). Reopen: scribe only
   (`scoring_set(m,'open')`). All transitions go through `scoring_set` (§5.10). *Tested by SC3b (both modes).*

### 6.3 Ballot
`/ballot` → tap up to 3 in order → Confirm → `cast_ballot` (its own request) → "Your ballot is in. N of M have
voted." No tally → Close (manual `close_ballot`, or `close_if_due` on any member's page load once all have voted or
`closes_at` passed) → `ballot_results` → order by points, then firsts; if first place is still tied, the host chooses among the tied books → **Pick**. *Tested by SC3.*

### 6.4 Talk
Home shows thread `club`. Meeting threads are created automatically and pinned during their month. Posts are
Markdown, human only. Edit your own; the scribe can hide. Unread dots come from `reads`. No email digest in v2.0.
Home contract: §4.4 card 3. *Tested by SC1.*

### 6.5 Public vs private toggle (scribe, `/club` settings)
- `visibility = public` (default): signed-out visitors get Home (no RSVP or directions), History, Book, Meeting
  (scores only if `public_scores`), Stats (member stats only if `public_scores`), Talk read-only (if `public_talk`),
  and a members list with names only.
- `visibility = members`: signed-out visitors see a one-card page: club name, about, "Members: sign in".
- **Enforced twice:** Studio refuses a public bind unless `spaces.public_read = true` (S5), and the site's settings
  form sets both together through the Studio API (S5) plus the `club` row (*SC6*). App RLS decides the rows. Switching to
  private takes effect on the next request (the site server caches public pages at most 60 s).

### 6.6 Joining (invite)
Scribe on `/club` → Roster → pick a roster row (e.g. `kirk-m`) or add one → **Copy invite link**
(`https://db.byoaistudio.com/join/<token>`, 14 days, single use). The scribe texts it; we don't send email. Kirk opens
it → Studio sign-in or sign-up (email + password) → Studio adds `space_members(role=member, member_slug='kirk-m')` →
redirect to the club's home signed in (90-day sliding session; handoff in S2). Already signed in to Studio = one tap. *SC5.*

### 6.7 Sign-in for an account in several clubs
Studio `/authorize?site=bookclub` shows a club picker if the account belongs to more than one members space with app
`bookclub`. The chosen club becomes the session's space. The site shows "Switch club" in `/club`. *SC5.*

---

## 7. Connect your AI (optional, ask-the-data)

**Mental model (exact copy on `/club/ai`):**
> **Where the club's data lives:** in the club's space on BYOAI Studio (db.byoaistudio.com), not on your computer and
> not inside your AI. The club owns it; Shelby runs it. **Your AI borrows your access:** it sees what you can see,
> can't cast votes or post for you, and you can disconnect it any time.

**States** (from Studio `GET /site/connection`, S9): `not connected` · `connected · last used 3 min ago` ·
`connected · not used yet` · `code waiting (expires in 9 min)`.

**Checklist** (shows on Home and `/club/ai` until step 3 is ✓ or dismissed; each step ticks itself):
1. **Get your code**: button → Studio issues a connect code for (club space, me). Shows code + copy.
2. **Give it to your AI**: one block to paste into the AI's project or instructions: the code, the docs repo link
   (`github.com/1000Problems/BookClubDocs`) and "Connect to my book club". This is the **only** paste step in Book
   Club, it happens once, and the site never asks for it again.
3. **Your AI says hello**: ✓ when the key's first `/sql` lands (`last_used_at` set). The site polls every 5 s while the
   page is open, then shows "Connected · ask it anything about the club".

After that: the header shows a small dot (amber = connected), "Ask your AI" locators appear (v1 §6.4 format: name +
link, no instructions), and **Disconnect** is one button (revokes the key). Nothing else on the site changes, and
nobody is asked to connect.

What the AI can do: read every view its member can (RLS), add book facts, suggest `kind`, write `writeups`, work
`later`. What it can't: votes, RSVPs, posts, candidates, ballots, roster or settings (RLS `channel() <> 'ai'` + grants).
*Both paths, not connecting and connecting, are SC4.*

---

## 8. Privacy stance
- Public by default for what the club is reading and talking about. Never public: addresses/directions, RSVP names,
  ballots, emails (Studio only; never in app tables), birthdates (never stored).
- Ballot secrecy as §5.5, stated honestly in the UI.
- AI providers: a member's AI sees only what that member sees. Private-talk is not AI-readable unless the club opts in.
- Removing a member (scribe): `space_members` row deleted → their site sessions and AI keys for that club are revoked
  in the same transaction (S3). Their roster row and history stay (status → alumni).

---

## byoaistudio changes

*(§9)*

Repo `1000Problems/byoaistudio`. **Start from PR #1** (TASK-42, `059_space_members.sql`). Review and merge it as S1.
Everything below builds on it; this is the full group-space surface. Reading has to keep working the whole way
(every item has a Reading non-regression check). Production migrate is Angel's call. Each item = one TASK file +
migration + tests; the test numbers continue `tests/20-*`.

**v3 notes (2026-11-04):** live `main` already has `058_ask.sql` (the box mirror at /workspace/spine stops at 057, so
re-pull before writing). PR #1 is still **open** and becomes `059`; renumber anything after it at merge. v3 changes in
this section: S3 adds `space_member_slugs()`; S9 adds site-session `GET /changes`; S11 Accept names the shared fixture
and SC tests.

**v3.1 notes (2026-11-05):** checked against `api.ts`, `guard.ts`, `errors.ts`, `db.ts` and PR #1. Items marked **(v3.1)**
are new or corrected: S2 handoff, S3 session length and error path, S5 public request, S6 `bind` hole, S7 ownership.

### S1. Merge space members (PR #1 as base)
- [ ] Review PR #1; merge to `main`. Keep `sharing`, `space_members`, five-arg `bind`, `current_member()`,
  `current_role()`, owner `maintenance` bind.
- [ ] Extend the role check to `('scribe','host','member','alumni','guest')` + the bind-only roles `public` and
  `maintenance` (never stored in `space_members`).
- **Accept:** PR #1 tests green on `main`; Reading suite green; the 5k search timing test is tracked separately (it was
  already red before this).

### S2. Invites and the join page
- [ ] Migration: `byoaistudio.space_invites(token_hash text pk, space_id, member_slug text not null, role text not null
  check in ('member','alumni','guest','scribe'), created_by bigint, created_at, expires_at (14 d), used_by bigint, used_at,
  revoked_at)`.
- [ ] API `POST /club/invites {member_slug, role}` (site session, scribe only) → `{url, expires_at}`.
  `GET /club/invites`, `DELETE /club/invites/:id`.
- [ ] Page `/join/[token]`: shows the club name and "You're invited as Kirk M". Sign in or sign up (existing Studio
  email + password; signup creates the person's private space as today). On accept, in one owner transaction: insert
  `space_members(space, account, role, member_slug)`, mark used, open a one-time site code for `(site, club,
  member)`, redirect to the site's `/auth/callback?code=…&state=join`.
- [ ] **(v3.1)** The site redeems that code with its server-side token (`POST /site/session {code}` + `Authorization:
  Bearer`), the existing non-PKCE form, because the join didn't start from the site's browser session. 60 s, single use.
- **Accept:** a used, expired or revoked token gives a clear one-line page; the same account can't join twice; a
  `member_slug` already linked in that space is refused; the token is never stored in plain text; a test covers sign-up
  via an invite.

### S3. Member slugs and member-scoped sessions and keys
- [ ] `space_members.member_slug text not null`, unique `(space_id, member_slug)`, slug check. New
  `byoaistudio.current_member_slug()` (definer, granted like `current_member`). `bind` copies it into `tx_space.member_slug`.
- [ ] `site_sessions.member_id bigint null`, `site_codes.member_id bigint null`, `keys.member_id bigint null`,
  `connect_codes.member_id bigint null`. Replace
  `connect_codes_one_open` with a unique index on `(space_id, coalesce(member_id, 0)) where status='open'`.
- [ ] `/authorize` for a site whose app is used by members spaces: resolve the account's memberships for that app →
  0: "You're not in a club here yet: ask your scribe for an invite" · 1: bind · >1: club picker. The session stores
  `(site, space=club, member=account)`.
- [ ] `/sql`, `/describe`, `/history`, `/undo`, `/changes` pass `memberId` to `withSpace` whenever the session or key
  has one.
- [ ] `POST /connect-codes` from a club site session → code for `(club, member)`. The redeemed key inherits the member.
- [ ] Removing a membership (`DELETE /club/members/:slug`, scribe) or changing its role revokes that member's sessions
  and keys for that space (role change: sessions survive, since the role is read at every bind).
- [ ] API: `GET /club/members` (scribe: slug, role, joined, last seen; members: slug, role) · `PATCH /club/members/:slug
  {role}` · `DELETE …`. Never returns emails to non-scribes; scribes see email only to resend an invite (optional).
- [ ] **(v3)** `byoaistudio.space_member_slugs() returns table(member_slug text, role text)` (definer; rows of
  `space_members` for `current_space()` only; execute granted to `byoaistudio_appfn` only). Book Club uses it for
  `eligible_voters()` and `members_roster.linked` (§5.0, §5.8). Never exposes account ids or emails.
- [ ] **(v3.1)** Error path: P0001 messages return without the `statement n:` prefix on members spaces; a raw RLS
  error (42501) on a members space returns "You can't do that here." instead of "your own space". App messages follow
  §5.10; **no** policy-message table (Postgres doesn't report the policy).
- [ ] **(v3.1)** `sites.session_days int not null default 30`; `/site/session` and the sliding update read it instead of
  `SITE_SESSION_DAYS`. `site.mjs` sets 90 for `bookclub`. Reading stays 30. `/site/session` also returns `member_slug`.
- **Accept:** a key for club A can't bind club B or the member's private space; a revoked member's key → 401 on the
  next request; a 3-club account sees the picker; Reading sessions and keys (member null) unchanged: Reading suite
  green.

### S4. Channels
- [ ] `tx_space.channel text not null` in `('ai','site','public','owner')`. It's part of the bind signature:
  `hmac("<space>:<actor>:<member|->:<channel>:<nonce>")`. New `byoaistudio.current_channel()`.
- [ ] The server sets it: key requests → `ai`; site session → `site`; public site request → `public`; owner pool →
  `owner`. The AI can't choose it.
- **Accept:** a test policy `channel() <> 'ai'` refuses a key insert and allows the same insert from a site session
  for the same member; a forged channel → `bad binding`.

### S5. Public read for members spaces
- [ ] `spaces.public_read boolean not null default false` (members spaces only; trigger refuses it on private spaces).
- [ ] `bind` path: render login + `p_member null` + `channel='public'` + `public_read=true` → `role='public'`, member null.
  Otherwise the PR #1 rule holds (`a member is required`).
- [ ] **(v3.1)** Site request with the site token (`Authorization: Bearer byoai_render_…`) and `X-Public-Space: <handle>`,
  no session → render pool, select only, rate-limited per `(site, space)`, because every request arrives from the site
  server's address, not the visitor's. `Cache-Control: no-store`; the site server does the 60 s caching (§4.4).
- [ ] API `PUT /club/visibility {public: bool}` (scribe session) sets `public_read`. The site calls it together with
  updating `club.visibility`.
- **Accept:** `public_read=false` → public request 403 `this club is members-only`; `true` → only rows whose policies
  include `is_public()` come back; public writes are refused at the grant level (render login); Reading private spaces
  can't be made public.

### S6. Site pool + app object registry (site-only, unlogged)
- [ ] **(v3.1)** Change `bind`'s check to `session_user in ('byoaistudio_space', 'byoaistudio_render', 'byoaistudio_site')`.
  PR #1 lists only two logins, so a site-pool bind with no member would otherwise get `role='maintenance'` and pass every
  `is_maint()` policy. Accept: a test binds the site login on a members space with no member → `a member is required`.
- [ ] New login role `byoaistudio_site` (member of nothing). Site-session requests (Reading included) use it. Its
  grants = `byoaistudio_space`'s app and platform grants (`bind`, `current_*`, `current_change`), plus execute on
  site-only app functions. Password stored like
  `space_password`. `scripts/setup.mjs` creates it.
- [ ] Registry `byoaistudio.app_objects(app text, object text, ai_visible boolean not null default true, logged boolean
  not null default true, primary key (app, object))`. The app migration declares its exceptions.
- [ ] `setUpApp`/migrate helper: attach the change trigger to every `byoaistudio_data.<app>_*` table **except**
  `logged=false`. `/undo` refuses changes touching unlogged tables (none should exist); `/history` never lists them.
- [ ] Guard: on channel `ai`, any reference to an `ai_visible=false` object → `ballots are only available on the club
  site` (generic: `<object> is only available on the site`). `/describe` for AI keys omits them. Grants also keep them
  away from `byoaistudio_space` (defence in depth).
- **Accept:** a test app with one unlogged site-only table → site insert works, `byoaistudio.changes` gets zero rows
  for it, the AI select is refused by the guard **and** by grants with the guard off, `/describe` (AI) doesn't list it;
  Reading on the site pool passes its full suite.

### S7. Definer-function owner and binding forget (ballot unlinking)
- [ ] NOLOGIN role `byoaistudio_appfn` (member of nothing; **no standing members**). App migrations create
  `security definer` functions owned by it with pinned `search_path`.
- [ ] **(v3.1)** Ownership needs a window: Postgres refuses `alter … owner to` unless the migration user can `set role`
  to the new owner, and the new owner needs `create` on the schema. In one transaction the migration runs `grant
  byoaistudio_appfn to current_user`, grants schema `create`, alters owners, then revokes both. Accept: after migrate,
  `pg_auth_members` has no row for `byoaistudio_appfn`. Table policies may be `to byoaistudio_appfn`.
  Allowed only in trusted (Angel's) app migrations (STUDIO §8).
- [ ] `byoaistudio.forget_binding()` (definer, execute to `byoaistudio_appfn` only): deletes the current xid's
  `tx_space` row. Afterwards `current_*()` return null, so any later statement in the request fails closed.
- [ ] Request logging: when a request calls a function registered `ai_visible=false`, the server logs no SQL body and
  no member id (only site, status, duration).
- [ ] Guard allowlist: app functions are allowed on the site channel when registered in `app_objects`; on the ai
  channel only if `ai_visible`.
- **Accept:** test: cast in a request → after commit there's no `tx_space` row for that xid, and no table joins the
  pending row's `xmin` to a member; a statement after `forget_binding()` in the same request sees zero rows; neither the
  AI key nor the space login can execute `forget_binding`.

### S8. Per-member history and undo
- [ ] `changes.member_slug text null`, copied from `tx_space` by the change trigger. `/history` shows "Kirk M" (or "Kirk
  M's AI" when channel `ai`; add `changes.channel`).
- [ ] `/undo` on a members space: allowed if the change is the caller's own (same member), or the caller is scribe.
  It runs on the owner pool with a `maintenance` bind (app policies include `is_maint()`); the undo change itself is
  attributed `undo by <slug>`.
- [ ] `deleteSpace` for a members space works through the maintenance bind (PR #1's deferred item).
- **Accept:** a member can't undo another member's change (403 one-liner); the scribe can; undo of undo works; a
  maintenance bind on the space login is impossible (bind refuses).

### S9. Connection status API (used by Book Club and Reading)
- [ ] `GET /site/connection` (site session) → `{state: 'none'|'code_open'|'connected', key_name, last_used_at,
  code_expires_at}` for the session's (space, member).
- [ ] `POST /site/connection/code` → new code (replaces the open one); `DELETE /site/connection` → revoke this
  member's keys for this space.
- [ ] **(v3)** `GET /changes?since=<cursor>` accepts a site session (`X-Site` + `X-Session`) as well as a key. Rows are
  filtered to the session's space; unlogged tables never appear (S6). Response `{cursor, changes:[{table, op, at,
  member_slug, channel}]}` with no row bodies (the site re-fetches through `/sql`, so RLS still decides what it sees).
  Rate limit 1 per 5 s per session. Needed by §4.4 freshness, SC1 step 14, SC4 step 11 and Reading R4.
- **Accept:** works for private spaces (Reading: member null) and clubs; key `last_used_at` updates at most every 30 s;
  a site session gets `/changes` for its own space only (other space → 403); no row bodies in the payload.

### S10. Club provisioning script
- [ ] `scripts/create-club.mjs <handle> --site bookclub --scribe <account-email> --scribe-slug shelby-g`: creates the
  members space, enables app `bookclub`, inserts the scribe membership, seeds the `club` row via a maintenance bind.
  The site registration (`site.mjs`) gets the bookclub return URLs.
- **Accept:** running it twice is a no-op; club #2 dry run works from an empty space.

### S11. Book Club app migration lives here
- [ ] `migrations/0xx_bookclub.sql`: everything in §5 (tables, forced RLS, policies, refusal triggers, helpers, functions
  owned by `byoaistudio_appfn`, views, grants to `byoaistudio_space`, `_render` and `_site`, `app_objects` rows, `apps` row
  `byoaistudio_bookclub`, `bookclub_*` entries in `CONSTRAINT_MESSAGES`). Track B writes it (§14).
- [ ] **(v3)** `fixtures/sc.sql` + `fixtures/sc-studio.json` (Appendix A) and `scripts/load-fixture.mjs sc` live in
  the byoaistudio repo (test-only; refuses to run against a non-test database unless `--i-mean-it`).
- **Accept:** `tests/2x-bookclub.test.ts` covers the matrix in §3 row by row (each ✓ and each — as a test), the
  score-visibility rule in both reveal modes for site **and** AI channels, the ballot leak table in §5.5, and the
  public toggle. **(v3)** Plus `tests/2x-bookclub-sc1.test.ts` … `-sc6.test.ts`: every `[DB]` Accept line of
  SC1–SC6 (§ Scenarios) runs against the fixture, and every §5.10 error string is asserted at least once.

### S12 (optional, not blocking v2.0). Mail sender
- [ ] One provider (Angel picks) for invite emails, a one-week-out reminder and a talk digest. Until then, invites
  are copy-link and reminders show on Home.

---

## Reading changes

*(§10)*

Repo `1000Problems/reading` (site) + `ReadingDocs`. Separate from the Book Club site; these come from the same
Shelby feedback ("pretty spreadsheet for your AI", "Add book → paste prompt feels like a fake app", "who owns the DB?",
first connect is hard). Each item is independent and can ship before Book Club. Verify paths against the repo before
editing.

### R1. Connection status in the header
- [ ] Small pill on every page: **Connected · last used 3 min ago** (amber dot) / **Not connected** (muted). Tap →
  `/connect`. Uses S9 `GET /site/connection`.
- **Accept:** state matches Studio within 30 s; no pill for signed-out views.

### R2. First-run 3-step checklist
- [ ] Same three steps as Book Club §7 (get code → give it to your AI with the ReadingDocs link → AI says hello ✓).
  Shown on Home while there's no key `last_used_at`; disappears for good once step 3 is ✓; "Hide" also dismisses it.
  Replaces any multi-paragraph connect instructions.
- **Accept:** a new account sees it; after the AI's first `/sql` it ticks itself without a reload (5 s poll on that
  page only); never shown again.

### R3. Native Add book is the primary path
- [ ] `+ Add book`: title with live lookup (Open Library) → pick → status → **Save** = a site write (`books` insert,
  actor = you). The book shows up immediately with cover/title/author.
- [ ] The AI work Reading needs (the short personal note, ranks, page sections) becomes an **owed item** (TASK-31 /
  `later` pattern) that the connected AI picks up, not a prompt the user copies.
- [ ] Remove "copy this prompt to Claude" as the main add flow. The "Ask your AI" locator stays as a secondary link
  on the book page (name + link only, ask-ai-locator-table.md).
- [ ] ReadingDocs `BOOKS.md`: "books added on the site arrive with an owed note; write it" (keeps STUDIO §7's "every
  book gets its short note", just later).
- **Accept:** adding a book works with no AI connected; a connected AI's next session lists the owed note; no flow
  requires clipboard paste.

### R4. The site refreshes after an AI write
- [ ] While a page is visible, poll Studio `GET /changes?since=<cursor>` every 10 s (DB-IMPL §7). On new changes,
  re-fetch the page's data and show a quiet toast "Updated by your AI just now". Stop polling when the tab is hidden.
  Depends on **S9 (v3)**: `/changes` was key-only in Studio as of 2026-11-04; the site-session form is new.
- **Accept:** the AI inserts a book while `/` is open → it appears within 10 s without a manual reload; no polling in
  background tabs.

### R5. "Who owns the data" made explicit
- [ ] `/connect` and the account menu get one panel: "Your library lives in your own space on BYOAI Studio
  (db.byoaistudio.com), not on your computer and not inside Claude. Your AI gets a key to it; disconnect any time.
  Studio's undo/history: [link]."
- **Accept:** copy present on `/connect` and the first-run checklist; links to Studio history.

### R6. Invite reorganizing by hand (less "done", more Excel-like)
- [ ] Direct manipulation as site writes: change status by tap, edit tags inline, **drag to reorder within a shelf**
  (store a manual position as a site write; add a column in a Reading migration only if none exists), and override
  one book's rank factor scores from the book page (the database recomputes `rank`).
- [ ] Every hand edit shows in Studio history as "you" and is undoable (toast with Undo).
- **Accept:** reorder and inline edits persist without an AI; undo from the toast restores.

### R7. Language: no fake-app copy
- [ ] Audit buttons/labels that tell the user to go do something in Claude. Replace them with either a native action
  or an owed item. Keep "Ask your AI" locators, which are fine.
- **Accept:** a grep for "paste"/"copy prompt" in user-facing copy returns only the one-time connect step.

### R8. Share the skin
- [ ] Book Club copies `globals.css` tokens and classes verbatim in v2.0. Later (not blocking): extract a
  `@1000problems/skin` package used by both.
- **Accept (v2.0):** Book Club uses the same token values; no visual drift on the shared classes.

### R9. Non-regression with Studio changes
- [ ] Reading runs on the new `byoaistudio_site` pool (S6) and the member-null session path (S3) with no code change
  beyond Studio's client lib; full Reading smoke test (home, book, add, notes, shelves, undo) after each Studio merge.

---

## 11. BookClubDocs (the AI's manual; Markdown only)
Repo `1000Problems/BookClubDocs`, mirroring ReadingDocs: `README.md` (connect, confirm the club handle before any
write, resolve a pasted locator, job table) · `SAFETY.md` (never write votes/words/RSVPs/posts/ballots; human voice is
sacred; ask before bulk) · `CLUB.md` (every view and column with meaning) · `STATS.md` (SQL for the canned questions against the §5.8 view columns, each
checked against the SC2 fixture answers, + how to answer fuzzy ones) · `WRITEUPS.md` · `LATER.md` (work owed items: covers, GR scores, kind suggestions) ·
`IMPORT.md` (§12, for club #2). No MCP, skills or plugins. SC4-connect step 8 is the acceptance test for
`README.md` + `STATS.md`.

---
## 12. Import from the Soul Crushers sheet
v1 §9 stays as the spec (what the sheet holds, column map, drift rules); changes for v2 are below.
- **Source:** Google Sheet "Soul Crushers History" (export used in design: `/tmp/sc.csv`, `/tmp/sc.xlsx` on the box;
  re-export before the real run).
- **Script:** `byoaistudio/scripts/import-bookclub-sheet.mjs <space-handle> <file.xlsx> [--dry-run] [--batch 25]`. It
  runs on the **owner pool with a maintenance bind** (actor `import`), so it doesn't wait on S3 keys. Every batch is one
  change (undoable), and upserts use `on conflict (slug) do nothing`. It can run against a local/test DB with the
  bookclub migration only.
- **Members:** header names → `bookclub_members` (slug from name, aliases from the drift list). **Birthdates in headers
  are stripped and never stored.** No accounts; S2 invites link them later by `member_slug`.
- **Votes:** `source='import'`; parsing as v1 §9.2 (`part(n)` → partial, `(unfinished)`, `(out)`, `x` → missed,
  `word: …`); unparsed → `comment` + `later` item.
- **Meetings:** `scoring='revealed'` for all past meetings; `status='planned'` for future rows; `venue_label` parsed
  only when it's unambiguous ("Tim's house" → "at Tim's"); addresses never imported (none are in the sheet anyway).
- **Checksums:** row-5 per-member mean and count vs computed; `legacy_score` vs computed `club_score`. The dry-run
  prints a mismatch list. **Use it to settle `guest_counts` and `partial_counts`**: pick the defaults that minimize
  mismatches, show Shelby the remainder.
- **Fiction/nonfiction:** starts empty (highlighting isn't in the export). Shelby confirms on `/club` → Import review,
  or a connected AI suggests (`kind_by='ai'`) and he bulk-confirms.
- **Accept:** dry run on the box export: ~192 meetings, 15 skipped rows recognized, Moby Dick linked via
  `continues`, row-5 checksum within ±0.05 mean and exact count for ≥ 90% of members (rest listed), zero birthdates
  in any table. *This is SC2-b; SC2-a checks the same views on the Appendix A fixture.*

---

## 13. Decisions

### DECIDED (v2 and v3, all still locked in v3.1; schema can be written now)
| # | Question (v1 §12) | Decision |
|---|---|---|
| D1 (12.1) | Database | `db.byoaistudio.com`. No HTTH Postgres |
| D2 (12.5) | Score reveal | Club setting `score_reveal`, **default `open`** (go-around aloud; phones capture it). `together` mode exists and is enforced by RLS for site and AI channels |
| D3 (12.6) | Partial / unfinished | **`partial` counts**, **`unfinished` doesn't**, missed/out have no score. `partial_counts` setting kept (confirm via checksum) |
| D4 (12.7) | Score scale | **0–10, up to 3 decimals** (`numeric(5,3)`); club score shown to 1 decimal |
| D5 (12.3) | Public | **Public home, history and chat on by default**; scribe toggle `visibility`; `public_scores` default on; addresses and RSVP names never public |
| D6 (12.4) | Ballot | Top-3 Borda 3/2/1; ≤3 ranks; **no change after cast** (scribe can reopen for everyone); show **count only**, never names |
| D7 (12.8) | AI reads talk | Allowed when talk is public; else `talk_visible_to_ai` (default false) |
| D8 (12.10) | Guests / alumni | Guests scored by scribe/host (`source='table'`); `guest_counts` default true pending checksum; alumni get accounts only if invited |
| D9 (12.11) | AI keys | One key per (club, member); same member can also have a Reading key (separate spaces) |
| D10 (12.14) | Club settings | Editable by scribe in v2 (`/club` settings) |
| D11 | Host as role | Derived from the meeting; `space_members.role='host'` unused |
| D12 | Login | Studio email + password via invite link, 90-day sliding site session. Magic link needs S12 |
| D13 | MCP | None, ever (STUDIO §12) |
| D14 (v3) | Slate keys | `slates.at_meeting` (pk; the meeting where the ballot runs) + `picks_for` (the meeting it picks; default next month). `slates.host` defaults to the host of `at_meeting`; scribe can change it. Replaces v2's ambiguous `for_meeting`. See O5 |
| D15 (v3) | Ballot results access | `ballot_results` is an appfn-owned non-invoker view exposing aggregates only, after close; ballot tables have no grants to site/space/render; per-member ballot state is only `me_cast` |
| D16 (v3) | Eligible voters | Active roster rows with a linked Studio membership (`space_member_slugs()`, S3). Unlinked rows (e.g. `nora-p` before joining) don't count toward "N of M" |
| D17 (v3) | Close trigger | No cron: `close_if_due` runs on any active member's page load while voting (all voted, or `closes_at` passed) |
| D18 (v3) | Test clock | `club_now()` GUC + site `BOOKCLUB_NOW`, tests only |

| D19 (v3.1) | Club URLs | `/c/[handle]` for every club page; bare root goes to the session's club or a sign-in card (§4). Club #2 needs no deploy |
| D20 (v3.1) | Skin | Reading's real light skin, tokens copied from `globals.css` (§4.3). Replaces v3's dark tokens, which never matched Reading |
| D21 (v3.1) | Refusal copy | Triggers and named constraints supply messages; RLS still enforces (§5.10). Replaces the policy-name map |
| D22 (v3.1) | Session length | 90 days for Book Club through per-site `sites.session_days`; Reading stays 30 (S3) |
| D23 (v3.1) | Table scores | `enter_votes` definer function, because a direct upsert fails under `together` RLS (§5.4) |
| D24 (v3.1) | Ballot method | `top3_borda` only in v2.0; `plurality` removed until it has a counting rule |

### Still open (none block schema or Studio work)
- **O1 Domain** (12.2): proposed `bookclub.hadmoney.com`. Blocks deploy only. *Angel.*
- **O2 Pilot meeting** (12.13): which meeting is the first entered only on the site (Oct = Kirk is in the sheet;
  Nov/Dec blank)? *Shelby.*
- **O3 Mail sender** (12.9 / S12): provider choice and whether reminders/digest are needed for v2.1. *Angel.*
- **O4 Fiction tagging** (12.12): Shelby tags vs bulk-confirms AI suggestions. Same schema either way. *Shelby.*
- **O5 (v3) Who brings the slate:** default is the host of the meeting where the ballot runs (Kirk brings Dec's
  options to Nov). If the club's habit is "next month's host brings their 5", the scribe changes `slates.host` per slate
  or we flip the trigger default. Schema works either way. *Shelby.*
- **O6 (v3.1) Sheet export:** `/tmp/sc.xlsx` and `/tmp/sc.csv` aren't on Angel's machine. Export the sheet before SC2-b.
  Blocks the import dry run only (row 3 of §14.2). *Angel or Shelby.*

---

## 14. Build order

```
Track A  byoaistudio  S1 → S3 → S4 → S6 → S7 → S5 → S8 → S2 → S9 → S10      (S12 optional)
Track B  bookclub     schema (S11) + fixture (Appendix A) + import script + checksum
                      ── parallel with A; tests use a maintenance bind and stubbed current_*() until S3/S4 land
Track C  Reading      R1–R9 (R1/R2/R4 need S9; R3/R5/R6/R7 can start now)
Track D  site         after A (S1–S8 minimum) and B: D1 → D7
```

**Track A order rationale:** S1 is the base; S3/S4 make member and channel visible to policies (Track B's RLS
depends on them); S6/S7 unblock ballots; S5 public; S8 history; S2/S9/S10 are product plumbing the site needs.

**Track B goes green scenario by scenario at the DB layer first:** `2x-bookclub-sc2` (views on the fixture) →
`-sc1` → `-sc3b` → `-sc3` → `-sc6` → `-sc4` → `-sc5` (needs S2). Track D then turns on the E2E layer for the same IDs.

**Track D (site).** Repo `1000Problems/bookclub`, to be created (Next.js 16, Tailwind v4, Reading tokens; R8). Every step lists the
pages, the views/functions it reads or calls, the Studio endpoints, and the scenarios it turns green. *Not started by
this doc: no repo, no app code yet.*

| Step | Pages | Views / functions (§5.8, §5.10) | Studio endpoints | Green | Shelby sees |
|---|---|---|---|---|---|
| **D1 Shell + sign-in + public fetch** | layout, `/c/[handle]` routing and bare-root rule, site-side 60 s public cache, header pill placeholder, `/` (cards 0, 1 read-only), `/club` (about + "Members: sign in") | `club`, `me`, `next_meeting` | `GET /authorize` (PKCE), `POST /site/session`, `POST /site/logout`, `POST /sql` (session and `X-Public-Space`) | SC1 steps 1–2, 4 | home card with the next meeting |
| **D2 Home logistics** | `/` cards 1a–1e, 2 (logistics kind), 4; `/m/[slug]` header; `.ics` route | `my_rsvp`, `rsvp_board`, `meeting_directions`, `open_actions`, `last_meeting`; writes `rsvps`, `meetings` (host cols), `meeting_private` | `POST /sql`, `POST /undo` | SC1 steps 5–7, 11–13 | when / where / what to bring, RSVP |
| **D3 Talk** | `/` card 3, `/talk`, `/talk/[thread]` | `club_posts`, `thread_posts`, `my_reads`; writes `posts`, `reads` | `POST /sql`, `GET /changes` (site session, S9 v3) | SC1 (all), SC6 talk rows | chat on the front page |
| **D4 Read pages** | `/history`, `/m/[slug]`, `/b/[slug]`, `/stats`, `/members`, `/members/[slug]` | `meeting_cards`, `meeting_votes`, `book_cards`, `book_scores`, `member_stats`, `host_stats`, `mix`, `attendance`, `words`, `members`, `writeups` | `POST /sql` | SC2-a (E2E), SC6 public rows | answers he used to compute by hand |
| **D5 Scoring** | `/m/[slug]` (Open/Reveal), `/m/[slug]/score`, `/m/[slug]/goaround`; card 2 score kind | `scoring_set`, `scoring_progress`, `enter_votes`, `meeting_votes`; writes `votes`, `members` (guest) | `POST /sql`, `POST /undo`, `GET /changes` | SC3b-open, SC3b-together | first live night with no spreadsheet |
| **D6 Slate + ballot** | `/next`, `/ballot`; card 2 ballot/slate kinds | `slate_cards`, `open_ballot`, `cast_ballot` (own request), `ballot_turnout`, `close_ballot`, `close_if_due`, `reopen_ballot`, `pick`, `ballot_results`; writes `candidates`, `books` | `POST /sql` (S7 no-log path) | SC3 | first phone vote at the table |
| **D7 Club, roster, invites, AI, docs** | `/club` settings + roster + import review, `/club/ai`, card 5, header pill; BookClubDocs repo | `club`, `members_roster`, `my_prefs`, `later`; writes `club`, `members`, `rotation`, `prefs` | `POST/GET/DELETE /club/invites`, `GET/PATCH/DELETE /club/members`, `PUT /club/visibility`, `GET /site/connection`, `POST /site/connection/code`, `DELETE /site/connection`, Studio `/join/[token]` | SC4-none, SC4-connect, SC5, SC6 | connect is optional and one paste; club #2 dry run |

### 14.1 Test layout
```
byoaistudio/
  fixtures/sc.sql, fixtures/sc-studio.json          Appendix A
  scripts/load-fixture.mjs                           `node scripts/load-fixture.mjs sc [--clock '2026-11-06 12:00 PT']`
  tests/2x-bookclub.test.ts                          §3 matrix row by row (S11)
  tests/2x-bookclub-sc1.test.ts … -sc6.test.ts       [DB] Accept lines; helpers asSite/asPublic/asAi/asMaint, setClock
bookclub/
  e2e/sc1-home-chat.spec.ts   e2e/sc2-all-data.spec.ts   e2e/sc3-voting.spec.ts   e2e/sc3b-goaround.spec.ts
  e2e/sc4-byoai.spec.ts       e2e/sc5-invite.spec.ts     e2e/sc6-public-private.spec.ts
  e2e/global-setup.ts        loads the fixture into local Studio, sets BOOKCLUB_NOW
```
Each `it`/`test` title starts with the scenario ID and step or Accept line (`SC3 accept: no xmin link`), so a failing
title points straight at this doc.

### 14.2 Definition of done (v2.0 = v3 design shipped)
| # | Must pass | Layer |
|---|---|---|
| 1 | SC1: front page with chat (public, member, host, scribe) | DB + E2E |
| 2 | SC2-a: every stat on the fixture equals the Accept numbers | DB + E2E |
| 3 | SC2-b: import dry run on the real export within the §12 checksum bounds | script |
| 4 | SC3: slate → ballot → pick, all secrecy checks | DB + E2E |
| 5 | SC3b-open and SC3b-together | DB + E2E |
| 6 | SC4-none (no key ever created) and SC4-connect | DB + E2E |
| 7 | SC5: invite, join, picker, refusals | DB + E2E |
| 8 | SC6: public ↔ private | DB + E2E |
| 9 | §3 matrix suite (S11) and Reading's full suite (R9) | DB |
| 10 | **Live:** Soul Crushers holds one full cycle (RSVP → meeting → go-around scores → ballot → pick → next home card) entirely on the site; the public home loads on a signed-out phone | manual, Shelby |
| 11 | **Live:** at least one member's AI answers "how many nonfiction books since 2020?" from the club DB (BookClubDocs `STATS.md`) | manual |

Rows 1–9 gate the deploy (O1 domain); rows 10–11 close v2.0.

---

## 15. Out of scope (v2, unchanged in v3)
MCP of any kind · email/SMS sending (S12 later) · native apps · meeting recording/transcripts · club discovery,
public profiles, followers · AI-authored votes/posts/RSVPs · a general CSV importer UI for any club (club #2 uses the
script + their column map) · linking club books into Reading libraries · paid tiers/billing · moderation beyond
scribe-hide · calendar sync beyond a downloadable .ics · per-club custom fields · splitting a real `accounts` table out
of `spaces` (stay with "account = private space" per PR #1) · **(v3)** a background job/cron for ballot close
(`close_if_due` covers it) · live websockets (10 s `/changes` poll is enough).

---

## Appendix A. Shared seed fixture

Loaded by `node scripts/load-fixture.mjs sc` (byoaistudio repo, test databases only). Studio objects first
(`sc-studio.json`, owner pool), then `sc.sql` in **one** maintenance-bind transaction per space (actor `fixture`), so
the whole base is a single undoable change and `/history` starts clean. The scenario Accept numbers (SC2-a, SC3,
SC3b) are computed from exactly these rows; if you change a row, recompute the Accept lines in the same commit.

### A.1 `fixtures/sc-studio.json`
```json
{
  "accounts": [
    { "email": "shelby@sc.test", "password": "sc-test-shelby", "name": "Shelby G" },
    { "email": "kirk@sc.test",   "password": "sc-test-kirk",   "name": "Kirk M" },
    { "email": "kent@sc.test",   "password": "sc-test-kent",   "name": "Kent L" },
    { "email": "will@sc.test",   "password": "sc-test-will",   "name": "Will H" }
  ],
  "spaces": [
    { "handle": "sc-crushers",  "name": "Soul Crushers (test)", "sharing": "members", "apps": ["bookclub"], "public_read": true },
    { "handle": "sc-otherclub", "name": "Other Club (test)",    "sharing": "members", "apps": ["bookclub"], "public_read": false }
  ],
  "memberships": [
    { "space": "sc-crushers",  "email": "shelby@sc.test", "role": "scribe", "member_slug": "shelby-g" },
    { "space": "sc-crushers",  "email": "kirk@sc.test",   "role": "member", "member_slug": "kirk-m" },
    { "space": "sc-crushers",  "email": "kent@sc.test",   "role": "member", "member_slug": "kent-l" },
    { "space": "sc-crushers",  "email": "will@sc.test",   "role": "member", "member_slug": "will-h" },
    { "space": "sc-otherclub", "email": "kent@sc.test",   "role": "member", "member_slug": "kent" }
  ],
  "sites": [
    { "site": "bookclub", "return_urls": ["http://localhost:3100/auth/callback"] }
  ],
  "keys": [],
  "invites": []
}
```
Nora has **no** account and no membership: SC5 signs her up through the invite. No keys
exist: SC4-none asserts that; SC3/SC4-connect create Kent's key in their Given steps. Passwords are test-only.

### A.2 `fixtures/sc.sql` (space `sc-crushers`)
```sql
-- run under: bind(sc-crushers, actor 'fixture', member null, role 'maintenance', channel 'owner')
-- club_thread trigger creates thread 'club' from the club insert; meetings_thread creates one per meeting
-- load-fixture.mjs creates spaces from sc-studio.json directly, not through create-club.mjs, so the club insert is first

insert into byoaistudio_bookclub.club (name, founded_on, about, visibility, public_talk, public_scores, score_reveal,
                           talk_visible_to_ai, slate_size, ballot_method, partial_counts, guest_counts, stats_min_n)
values ('Soul Crushers (test)', '2008-12-01', 'A test copy of the club. Books monthly since 2008.',
        'public', true, true, 'open', false, 5, 'top3_borda', true, true, 2);

insert into byoaistudio_bookclub.members (slug, name, status, joined_on, left_on) values
  ('shelby-g',   'Shelby G', 'active', '2008-12-01', null),
  ('kirk-m',     'Kirk M',   'active', '2010-03-01', null),
  ('kent-l',     'Kent L',   'active', '2012-06-01', null),
  ('will-h',     'Will H',   'active', '2015-01-01', null),
  ('nora-p',     'Nora P',   'active', '2026-10-01', null),
  ('matt-a',     'Matt A',   'alumni', '2009-01-01', '2021-12-31'),
  ('dana-guest', 'Dana',     'guest',  null,         null);

insert into byoaistudio_bookclub.rotation (position, member) values
  (1, 'will-h'), (2, 'shelby-g'), (3, 'kirk-m'), (4, 'kent-l');

insert into byoaistudio_bookclub.books (slug, title, author, kind, kind_by, goodreads_avg) values
  ('siddhartha',   'Siddhartha',      'Hermann Hesse',    'fiction',    'me', 4.05),
  ('the-overstory','The Overstory',   'Richard Powers',   'fiction',    'me', 4.11),
  ('piranesi',     'Piranesi',        'Susanna Clarke',   'fiction',    'me', 4.24),
  ('sapiens',      'Sapiens',         'Yuval Noah Harari','nonfiction', 'me', 4.38),
  ('born-a-crime', 'Born a Crime',    'Trevor Noah',      'nonfiction', 'me', 4.48),
  ('the-road',     'The Road',        'Cormac McCarthy',  'fiction',    'me', 3.99),
  ('educated',     'Educated',        'Tara Westover',    'nonfiction', 'me', 4.47),
  ('dune',         'Dune',            'Frank Herbert',    'fiction',    'me', 4.27),
  ('the-wager',    'The Wager',       'David Grann',      'nonfiction', 'me', 4.12);
-- lincoln-in-the-bardo (George Saunders, fiction, 3.75) is added by SC3 step 2, not here.

insert into byoaistudio_bookclub.meetings (slug, month, status, book, host, venue_member, venue_label, host_line, bring,
                               meets_at, scoring, revealed_at) values
  ('2019-11', '2019-11-01', 'met',     'sapiens',       'kent-l', 'kent-l', 'at Kent''s', null, '{}',
     '2019-11-14 19:00 America/Los_Angeles', 'revealed', '2019-11-14 21:00 America/Los_Angeles'),
  ('2024-05', '2024-05-01', 'met',     'born-a-crime',  'kirk-m', 'kirk-m', 'at Kirk''s', null, '{}',
     '2024-05-09 19:00 America/Los_Angeles', 'revealed', '2024-05-09 21:00 America/Los_Angeles'),
  ('2026-08', '2026-08-01', 'skipped', null,            null,     null,     null,         null, '{}',
     null, 'not_open', null),
  ('2026-09', '2026-09-01', 'met',     'siddhartha',    'will-h', 'will-h', 'at Will''s', null, '{}',
     '2026-09-10 19:00 America/Los_Angeles', 'revealed', '2026-09-10 21:00 America/Los_Angeles'),
  ('2026-10', '2026-10-01', 'met',     'the-overstory', 'kent-l', 'kent-l', 'at Kent''s', null, '{}',
     '2026-10-08 19:00 America/Los_Angeles', 'not_open', null),          -- Kent swapped in (rotation says Shelby)
  ('2026-11', '2026-11-01', 'planned', 'piranesi',      'kirk-m', 'kirk-m', 'at Kirk''s', 'Kirk''s making soup',
     '{bread,wine}', '2026-11-12 19:00 America/Los_Angeles', 'not_open', null);

insert into byoaistudio_bookclub.meeting_private (meeting, address, directions, parking) values
  ('2026-11', '1 Test Lane, Paso Robles', 'Gate code 0000; park on the street', null);

-- votes: source 'import' for the old ones, 'me'/'table' for 2026-09 (entered_at before revealed_at: not "corrected")
insert into byoaistudio_bookclub.votes (meeting, member, attendance, score, word, source, entered_by, entered_at) values
  ('2019-11', 'shelby-g',   'voted',      7.000, 'big',      'import', null, '2019-11-14 20:00 America/Los_Angeles'),
  ('2019-11', 'kirk-m',     'voted',      5.500, 'smug',     'import', null, '2019-11-14 20:00 America/Los_Angeles'),
  ('2019-11', 'kent-l',     'voted',      8.250, 'fire',     'import', null, '2019-11-14 20:00 America/Los_Angeles'),
  ('2019-11', 'matt-a',     'voted',      6.000, 'sweeping', 'import', null, '2019-11-14 20:00 America/Los_Angeles'),
  ('2019-11', 'will-h',     'unfinished', 4.000, null,       'import', null, '2019-11-14 20:00 America/Los_Angeles'),
  ('2024-05', 'shelby-g',   'voted',      9.100, 'mother',   'import', null, '2024-05-09 20:00 America/Los_Angeles'),
  ('2024-05', 'kirk-m',     'voted',      8.800, 'funny',    'import', null, '2024-05-09 20:00 America/Los_Angeles'),
  ('2024-05', 'kent-l',     'voted',      9.400, 'brave',    'import', null, '2024-05-09 20:00 America/Los_Angeles'),
  ('2024-05', 'will-h',     'partial',    7.000, 'sharp',    'import', null, '2024-05-09 20:00 America/Los_Angeles'),
  ('2026-09', 'shelby-g',   'voted',      8.600, 'river',    'me',     'shelby-g', '2026-09-10 20:30 America/Los_Angeles'),
  ('2026-09', 'kirk-m',     'voted',      7.250, 'quiet',    'me',     'kirk-m',   '2026-09-10 20:30 America/Los_Angeles'),
  ('2026-09', 'kent-l',     'voted',      9.000, 'om',       'me',     'kent-l',   '2026-09-10 20:30 America/Los_Angeles'),
  ('2026-09', 'will-h',     'voted',      6.500, 'slow',     'me',     'will-h',   '2026-09-10 20:30 America/Los_Angeles'),
  ('2026-09', 'matt-a',     'missed',     null,  null,       'table',  'will-h',   '2026-09-10 20:30 America/Los_Angeles'),
  ('2026-09', 'dana-guest', 'voted',      8.000, 'ferry',    'table',  'will-h',   '2026-09-10 20:30 America/Los_Angeles');
-- Expected (SC2-a): club_score 2019-11 = 6.7 (6.6875), 2024-05 = 8.6 (8.575), 2026-09 = 7.9 (7.87; 7.8 with
-- guest_counts=false). member_stats: kent-l 8.883 n=3 easiest #1; will-h 6.750 n=2 harshest #1; shelby-g 8.233;
-- kirk-m 7.183; matt-a n=1 (no rank). Nonfiction meetings since 2020 = 1 (2024-05).

insert into byoaistudio_bookclub.rsvps (meeting, member, status, guests) values
  ('2026-11', 'shelby-g', 'yes',   1),
  ('2026-11', 'will-h',   'maybe', 0);

insert into byoaistudio_bookclub.posts (thread, member, body, created_at, hidden_by) values
  ('club', 'kirk-m',   'Soup is on. Bring bread.',              '2026-11-03 18:00 America/Los_Angeles', null),
  ('club', 'shelby-g', 'Ballot opens after the go-around.',     '2026-11-04 09:00 America/Los_Angeles', null),
  ('club', 'kent-l',   'Halfway through Piranesi — the statues!','2026-11-05 21:00 America/Los_Angeles', null),
  ('club', 'will-h',   'Test post the scribe hid.',             '2026-11-05 22:00 America/Los_Angeles', 'shelby-g');

insert into byoaistudio_bookclub.slates (at_meeting, picks_for, host, status) values
  ('2026-11', '2026-12', 'kirk-m', 'drafting');

insert into byoaistudio_bookclub.candidates (slate, book, pitch) values
  ('2026-11', 'the-road',  'Bleak and short. You''ll finish it.'),
  ('2026-11', 'educated',  'The one everyone''s mother read.'),
  ('2026-11', 'dune',      'We keep saying we will.'),
  ('2026-11', 'the-wager', 'Shipwreck, mutiny, lawyers.');
```
`sc-otherclub` gets only a `club` row, which also creates its `club` thread, (`'Other Club (test)'`, `visibility='members'`) and member `kent` (Kent L,
active). It exists for SC4 (key scoping) and SC5 (picker).

---

## Appendix B. Site → Studio call contract

All calls go from the site **server** (Next.js route handlers / server components) to `https://db.byoaistudio.com`
(local: `STUDIO_URL`). The browser never talks to Studio except the `/authorize` and `/join` redirects.

**Two ways to name the site:** `Bearer` = `Authorization: Bearer byoai_render_…` (server-side secret). `X-Site` =
`X-Site: bookclub`, the public slug, accepted with `X-Session` (the session is bound to the site). (S…) marks calls that
don't exist yet; the rest are live today and verified against `src/lib/api.ts`.

| Call | Headers | Body / query | Returns | Used by |
|---|---|---|---|---|
| `GET /authorize?site=bookclub&return=<url>&state=<page>&code_challenge=…&code_challenge_method=S256` | — (browser redirect) | PKCE S256; `return` must be registered | 303 to `return?code=&state=`; club picker if >1 club (S3) | D1, SC1, SC5 |
| `POST /site/session` | — | `{site, code, code_verifier}` | `{session, expires_at, handle}` + `member_slug` (S3); 90-day sliding for bookclub | D1 |
| `POST /site/session` (join) | `Bearer` | `{code}` | same | SC5 (S2) |
| `POST /site/logout` | `X-Site`, `X-Session` | — | 204 | D1 |
| `POST /sql` (member) | `Content-Type: application/json`, `X-Site`, `X-Session` | `{"statements":[{"sql":"…","params":[…]}]}` (one transaction; ≤ 50 statements) | `{"results":[{"columns":[{"name","type"}],"rows":[[…]]} or {"command":"INSERT 0 1"}],"change_id":"…"}` (rows are arrays in column order) or `{"error":"<one line>"}` (§5.10 copy) | everything |
| `POST /sql` (public, S5) | `Content-Type: application/json`, `Bearer`, `X-Public-Space: <handle>` | same; select only | same; 403 `this club is members-only` when private | SC1, SC6 |
| `POST /undo` | `X-Site`, `X-Session` | `{change_id}` | `{undone}` or 403 "You can only undo your own changes." (S8) | toasts |
| `GET /changes?since=<id>` (S9) | `X-Site`, `X-Session` | numeric change row id | `{cursor, changes:[{table, op, at, member_slug, channel}]}`. The AI key form stays TSV | §4.4 freshness |
| `GET /site/connection` (S9) | `X-Site`, `X-Session` | — | `{state, key_name, last_used_at, code_expires_at}` | header pill, card 5, `/club/ai` |
| `POST /site/connection/code` · `DELETE /site/connection` (S9) | `X-Site`, `X-Session` | — | `{code, expires_at}` · 204 | `/club/ai` |
| `POST /club/invites` · `GET` · `DELETE /club/invites/:id` (S2) | `X-Site`, `X-Session` (scribe) | `{member_slug, role}` | `{url, expires_at}` | `/club` roster, SC5 |
| `GET /club/members` · `PATCH`/`DELETE /club/members/:slug` (S3) | `X-Site`, `X-Session` | `{role}` | list / 204 | `/club` roster |
| `PUT /club/visibility` (S5) | `X-Site`, `X-Session` (scribe) | `{public: bool}` | 204 | `/club` settings, SC6 |

**Rules the site follows:** `cast_ballot` is always the only statement in its request (S7 no-log path; also keeps
`forget_binding` from breaking later statements). A failed batch shows the `error` line verbatim. The site
server caches public responses ≤ 60 s; member responses are never cached. The site token never reaches the browser.

---
*2026-11-05. v3.1 supersedes v3. Grounded in byoaistudio docs as mirrored on the box (migrations
through 057), live `main` (has `058_ask.sql`) and open PR #1 (`059_space_members.sql`, last updated 2026-11-01 PT).
Verify migration numbers and Reading file paths against the live repos when starting each task.*
