# Book Club — v2 design

**Status: ready to code** · 2026-11-03 · supersedes [BOOK-CLUB-v1-DESIGN.md](BOOK-CLUB-v1-DESIGN.md) where they conflict
(v1 stays as prior art for the import details and stats lists).

Inputs: v1 draft (11-01/11-02) · Angel's readiness review (11-02) · Shelby call on the hadmoney nextbot recording
(11-03, ~7:07–7:38 PM PT) · byoaistudio `docs/STUDIO.md` v1.1, `docs/DB-IMPL.md` v1.2, migrations through 057 (box
mirror under `/workspace/spine/`) · [byoaistudio PR #1](https://github.com/1000Problems/byoaistudio/pull/1) (TASK-42,
`059_space_members.sql`, open, not merged) · Reading `shelf/DESIGN_BRIEF.md`.

Decided by Angel and not reopened here: **the database is `db.byoaistudio.com`** (Studio). An HTTH-style Postgres of
our own is off.

Shelby's Thursday (11-05) draft = this doc's §1–§8 as a short read, plus a static home mock if there's time. Coding
starts on tracks A, B and C (§14) now. The site (track D) waits for A and B.

---

## 0. How to read this doc

- `MUST` = acceptance criteria. Every work item in §9 (byoaistudio) and §10 (Reading) is a checkbox with an "Accept"
  list. Every Book Club table in §5 has its DDL shape and RLS spelled out.
- Physical tables are `byoaistudio_data.bookclub_*`. Views are in schema `bookclub` with bare names (`meetings`,
  `votes`). There's no `club_id` anywhere: tenancy is Studio's hidden `space_id` (DB-IMPL §3–4).
- Migration numbers are given at merge time. PR #1 takes `059`, and the names below say what each migration does.
- "Role" means the Studio club role that `bind` copies from `space_members` (PR #1). "Channel" means how the request
  came in (§9 S4).

---

## 1. Product

**One line:** Book Club shows a club when and where it meets next and what everyone is reading. It keeps the club's
shared history, scores and talk on one calm site that anyone can use without an AI. Any member who wants to can
connect their own AI to the club's database to ask it things.

### Goals (v2)
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

### Non-goals (v2)
- MCP servers, connectors or plugins of any kind (STUDIO §12; Shelby's "server can change after install").
- An AI acting as a member: AIs never cast scores, words, ballots, RSVPs or posts.
- "Paste this prompt into Claude" as the main way to do anything (Shelby's Reading critique).
- Native apps. The site is phone-first web.
- Email or SMS sending in v2.0 (no sender exists; §13 O3). Reminders show on the home page.
- Recording meetings or podcasts, discovering other clubs, follower counts.
- Member birthdates (in the sheet header; never imported).
- Linking club books into a member's Reading library (later).

---

## 2. What v2 changes from v1

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
| Studio work | "real design needed" | **designed here** (§9): members, invites, (space, member) sessions and keys, channels, public bind, site pool, site-only and unlogged tables, ballot unlinking, per-member history, maintenance path | Angel's review |
| Ballot secrecy | site-only + unlogged | site-only + unlogged + **close-time shuffle + forget the binding** (closes the `xmin` link) | Engineering fix (§5.5) |
| Reading | out of scope | **§10 Reading changes** track: same lessons applied to Reading | Angel: the design should include Reading changes |

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
| Build slate (5 books + pitches) | ✓ | ✓ (their slate) | — | — | — | scribe's or host's AI may add `books` facts, not candidates |
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

---

## 4. Information architecture and pages

Nav (phone bottom bar, 5 items): **Home · History · Stats · Talk · Club**. Look is Reading's skin (§4.3).

### 4.1 Pages

| Path | Who | Contents | Notes |
|---|---|---|---|
| `/` **Home** | all | **(1) Next meeting card:** cover, title, author, "Thu Dec 3 · 7 pm", "at Kirk's", host line ("Kirk's making soup"), **Bring:** chips (bread · wine · gummies), RSVP row (Going / Maybe / Can't, +guest) with "6 going". Members only: "Directions" expander (address + notes), "Add to calendar" (.ics download, built on the site). **(2) Action card**, only when open: "Vote for next book: 4 of 8 have voted" → `/ballot`, or "Score Siddhartha" → `/m/2026-11/score`, or "Host: pick your 5" (host only). **(3) Club chat:** last 20 posts in the `club` thread, composer for signed-in roster. **(4) Last time:** last meeting, club score, #rank all time, 5 words. **(5) Connect checklist** (§7), only for signed-in members not connected and not dismissed | Public sees 1 (no RSVP or directions), 3 read-only (if `public_talk`), 4 (scores if `public_scores`). Banner when the meeting is ≤ 7 days away: "One week out: RSVP" |
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
| `/club` | all | About; "Members: sign in"; scribe: **Settings** (visibility, public_scores, public_talk, score_reveal, talk_visible_to_ai, slate size, ballot method), **Roster** (add roster row, invite link, role, remove), **Import review** | |
| `/club/ai` | roster | Connect your AI (§7): status, 3 steps, disconnect, "who owns the data" | |
| Studio `db.byoaistudio.com/join/[token]` | invitee | Studio page (§9 S2), not a Book Club page | |

The site has **no login or signup pages** (STUDIO §5). "Sign in" calls Studio `/authorize` with PKCE (TASK-17).

### 4.2 Empty states (club #2 and pilot)
Club with no history ("Add your first meeting · Import a sheet"); no next meeting ("Scribe: set the next meeting");
slate empty ("Host: pick 5"); quiet chat; member with no scores.

### 4.3 Skin
Reading tokens exactly: bg `#0d0f14`, panel `#151922`, line `#252b38`, text `#e7e9ee`, muted `#8b93a7`, accent `#f2b84b`.
Newsreader (titles, book text) and Geist (UI, numbers). Classes `.panel .input .btn .btn-primary .muted .prose-note`.
Next.js 16 + Tailwind v4, no component libraries. 375 px first, tap targets ≥ 44 px, light mode supported. Copy the
tokens from Reading's `globals.css` into `bookclub/src/app/globals.css` (a shared package can come later; R8).
Voices: **member** (personal, name-attributed) · **club record** (plain facts, Geist numbers) · **AI** (`writeups`
only, labelled "written by Shelby's AI · date", Reading's "Claude's summary" style). An unconfirmed AI suggestion
(`kind_by='ai'`) is drawn dashed until a person taps Confirm.

---

## 5. Data model

### 5.0 Helpers (in the bookclub migration; all `stable`, `security invoker`, `set search_path = bookclub, byoaistudio`)
```sql
bookclub.me()          returns text    -- byoaistudio.current_member_slug()             (S3)
bookclub.role()        returns text    -- byoaistudio.current_role()  (scribe|member|alumni|guest|public|maintenance)
bookclub.channel()     returns text    -- byoaistudio.current_channel() (site|ai|public|owner)  (S4)
bookclub.is_roster()   := role() in ('scribe','member','alumni','guest')
bookclub.is_active()   := role() in ('scribe','member')
bookclub.is_scribe()   := role() = 'scribe'
bookclub.is_public()   := role() = 'public'
bookclub.is_maint()    := role() = 'maintenance'            -- owner login only (PR #1); undo, delete-space, import
bookclub.is_host(m text) := exists (select 1 from bookclub_meetings where slug = m and host = me())
bookclub.setting(k text) returns text  -- reads the one bookclub_club row; public may read it
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
  ballot_method text not null default 'top3_borda' check (ballot_method in ('top3_borda','plurality')),
  slate_size smallint not null default 5 check (slate_size between 2 and 8),
  partial_counts boolean not null default true,
  guest_counts boolean not null default true       -- confirm at import (§12 checksum)
  RLS: select = everyone incl. public · update = scribe

bookclub_members  pk (space_id, slug)
  slug text check (slug ~ '^[a-z0-9-]+$'),  name text not null ("Shelby G"),  aliases text[] default '{}',
  status text not null check (status in ('active','alumni','guest')),
  joined_on date, left_on date, note text
  -- NO account id, NO email, NO birthdate. Link to a Studio account is space_members.member_slug (S3).
  RLS: select = roster; public only if visibility='public' (names only, the view never exposes note) ·
       insert/update = scribe · delete = scribe (refused by FK if referenced)

bookclub_rotation pk (space_id, position)   position int, member text → members
  RLS: select roster · write scribe
```

### 5.2 Books and meetings
```sql
bookclub_books  pk (space_id, slug)
  slug, title not null, author text, isbn text, cover_url text, year_published int,
  kind text check (kind in ('fiction','nonfiction')), kind_by text check (kind_by in ('me','ai')),
  goodreads_avg numeric(3,2) check (goodreads_avg between 1 and 5), goodreads_checked_on date
  unique (space_id, lower(title), lower(coalesce(author,'')))  -- duplicate refused with existing slug
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
  legacy_score numeric                 -- import only; hidden from views after review
  RLS select: roster; public if visibility='public'
  RLS insert/delete: scribe · update: scribe; host of that meeting may update only
      meets_at, venue_member, venue_label, host_line, bring, food, notes, scoring (enforced by a
      BEFORE UPDATE trigger comparing old/new for non-scribes)

bookclub_meeting_private  pk (space_id, meeting)  → meetings
  address text, directions text, parking text     -- members-only logistics
  RLS select: roster · write: scribe or is_host(meeting)
  View `meeting_directions`. Never readable by public (no public clause at all).
```

### 5.3 RSVP
```sql
bookclub_rsvps  pk (space_id, meeting, member)
  status text not null check (status in ('yes','maybe','no')), guests smallint not null default 0 check (guests between 0 and 5),
  bringing text, updated_at timestamptz default now()
  RLS select: roster (counts shown to public via view `rsvp_counts` only if visibility='public': yes/maybe totals, no names)
  RLS write: (member = me() and is_roster()) or is_scribe() or is_host(meeting); channel() <> 'ai'
```

### 5.4 Scores and words
```sql
bookclub_votes  pk (space_id, meeting, member)
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
`bookclub.scoring_progress(meeting)`, a security-definer function owned by `byoaistudio_appfn` (S7) that returns
`(member, has_entry boolean)`.

**Write (RLS insert/update):**
```sql
with check ( base and channel() <> 'ai' and m.scoring = 'open' and (
    (member = me() and is_active() and source = 'me')
 or ((is_scribe() or is_host(meeting)) and source = 'table') ) )
 or ( base and is_scribe() and m.scoring = 'revealed' )          -- corrections, logged + undoable
 or is_maint()                                                    -- import (source='import')
```
**`club_score` (view `book_scores`):** `round(avg(score), 1)` over rows where `attendance='voted'`, or
`attendance='partial' and partial_counts`, and the member isn't a guest unless `guest_counts`. Only meetings with
`scoring='revealed'` appear.

### 5.5 Slate and ballot (site-only, unlogged, unlinked)
```sql
bookclub_slates  pk (space_id, for_meeting)            -- for_meeting → meetings (the planned next one)
  host text → members, status text check (status in ('drafting','voting','closed','picked')),
  opens_at, closes_at timestamptz, picked_book text → books,
  turnout int, ballots int                              -- written by close_ballot
  RLS select: roster; public if visibility='public' and status in ('closed','picked')
  RLS write: scribe or host of the slate; status changes only via functions below

bookclub_candidates  pk (space_id, slate, book)    pitch text (human)   -- ≤ slate_size, trigger-checked
  RLS like slates; insert/update only while slate.status='drafting'; channel() <> 'ai'

-- ↓ SITE-ONLY (registered ai_visible=false) and UNLOGGED (registered logged=false), S6/S7
bookclub_ballot_voters   pk (space_id, slate, member)   cast_minute timestamptz   -- rounded to the minute
bookclub_ballot_pending  pk (space_id, slate, ballot uuid)  first text, second text, third text   -- no member column
bookclub_ballot_choices  pk (space_id, slate, ballot uuid)  first text, second text, third text   -- written only at close
```
Grants: none to `byoaistudio_space` (AI) or `byoaistudio_render`. `byoaistudio_site` gets **no direct DML**, only
`execute` on the functions. Policies: `to byoaistudio_appfn using (base)`. Select on `ballot_voters` for roster
`where member = me()` (so "you voted" shows), and select on `ballot_choices` for roster once the slate is closed
(anonymous rows, site only).

Functions (owned by `byoaistudio_appfn`, `security definer`, pinned `search_path`, execute granted to
`byoaistudio_site` only):
- `bookclub.open_ballot(slate)`: scribe or host; `drafting → voting`; needs 2..slate_size candidates.
- `bookclub.cast_ballot(slate, first, second, third)`: active member; slate `voting`; not yet voted; books are
  candidates and distinct; `second`/`third` may be null. Inserts `ballot_voters(member, date_trunc('minute', now()))`,
  inserts `ballot_pending` with `gen_random_uuid()`, then calls **`byoaistudio.forget_binding()`** (S7) as its last
  step. **The site sends `cast_ballot` alone in its own request.**
- `bookclub.ballot_turnout(slate) → (cast int, eligible int)`: roster.
- `bookclub.close_ballot(slate)`: scribe or host; `voting → closed`. Copies `ballot_pending` into `ballot_choices`
  `order by random()`, deletes pending, computes points. Borda 3/2/1; tie → more first choices → `pick` by host.
  Auto-close is the site calling close when `cast = eligible` or `closes_at` has passed (a scheduler isn't needed).
- `bookclub.pick(slate, book)`: scribe or host; `closed → picked`; creates or updates next month's meeting (`planned`,
  book, host = next in rotation unless overridden, `venue_member` = host).
- View `ballot_results` (security invoker over `ballot_choices`): per candidate points, first-choice count, ballots,
  turnout. Readable by roster, AI keys and public (p) **only when the slate is `closed`/`picked`**. That's the only
  ballot object in `/describe` for AI keys.

**Why all four mechanisms:**
| Leak | Closed by |
|---|---|
| A member, host, scribe or AI reads who chose what | no member column on choices; site-only grants; RLS |
| Change log shows `member:x` next to choices | tables registered **unlogged**: no change trigger, no `/history`, no `/undo` (S6) |
| Postgres `xmin` on choice rows → `tx_space(xid → member)` | choices live in `pending` only until close and are rewritten by the close transaction. `forget_binding()` deletes the cast transaction's `tx_space` row before commit, so the voter is never stored next to that xid |
| A running tally anchors loud voices | no results view until close |
| Database operator (WAL, server logs, timing) | **not claimed.** Studio doesn't log `/sql` bodies or member ids for requests that call site-only functions (S7). The UI says: "Secret from everyone in the club and every AI. Not a bank vault." |

A ballot can't be changed once cast. Reopening is `bookclub.reopen_ballot(slate)` (scribe): it wipes voters, pending
and choices for that slate, and everyone votes again. That's a deliberate action, not `/undo`.

### 5.6 Talk
```sql
bookclub_threads  pk (space_id, slug)   title, meeting text → meetings null, kind check (kind in ('club','meeting','standing')),
                                        pinned bool, closed bool, created_by text
  -- migration seeds 'club' (home chat); meeting threads auto-created by trigger on meetings insert
bookclub_posts  pk (space_id, id uuid default gen_random_uuid())
  thread text → threads, member text → members default me(), body text not null (Markdown, ≤ 4000),
  created_at, edited_at, hidden_by text, source text not null default 'me' check (source = 'me')
  RLS select: (is_roster() and hidden_by is null or is_scribe())
           or (is_public() and visibility='public' and public_talk and hidden_by is null)
           AI keys: allowed iff (visibility='public' and public_talk) or talk_visible_to_ai
  RLS insert: is_roster() and member = me() and channel() <> 'ai' · update: own body (edited_at) or scribe hide
bookclub_reads  pk (space_id, thread, member)  last_read_at  -- unread dots; own row only; unlogged (noise)
```

### 5.7 AI voice and owed work
- `bookclub_writeups (subject text, body text, written_by text default me(), written_at)`, pk `(space_id, subject)`.
  Insert/update only when `channel()='ai'` (it's the AI's voice). Readable by roster, and by public (p).
- `bookclub_later` (owed items: missing cover, GR score, unconfirmed kind, import flags), using Reading's TASK-31 owed
  pattern. Roster can read it and fix items by form; AI keys can work it.

### 5.8 Stats views (database does the arithmetic)
`book_scores` (club score, GR×2, delta, rank all-time, rank in year) · `member_stats` (mean, n, stdev, misses,
easy/harsh rank with n ≥ 10) · `host_stats` · `mix` (fiction/nonfiction by year and 5-year era) · `attendance` ·
`words` (word, member, meeting). All are `security_invoker`, so they inherit the score-visibility rules.
`next_meeting` (one row: the earliest `planned` meeting ≥ today) drives the home card. `me` (one row: my slug, name,
role) is the PR #1 deferred "who am I" view.

### 5.9 Logging summary
| Table | Change log + undo | AI visible |
|---|---|---|
| club, members, rotation, books, meetings, meeting_private, rsvps, votes, slates, candidates, threads, posts, writeups, later | **yes** (actor = member, S8) | yes, per RLS (posts conditional) |
| ballot_voters, ballot_pending, ballot_choices | **no** | **no** |
| reads | no (noise) | no |

---

## 6. Flows

### 6.1 Monthly cycle
1. **Rotation** says who hosts next. The scribe can override (swaps happen: Will↔Shelby in Aug–Sep 2026).
2. **Host builds the slate** on `/next`: types a title, picks the match (books table, then Open Library lookup on the
   site server), adds a one-line pitch. Five max. Status `drafting`.
3. **At the meeting:** discussion → **score go-around** (§6.2) → host taps **Open ballot** → phones vote (§6.3) →
   Close → winner on every phone → `pick` creates next month's meeting.
4. **During the month:** the host fills `meets_at`, place, host line and bring list. Members RSVP. Home shows the card.
   At ≤ 7 days a "One week out: RSVP" banner shows, and the host sees "6 yes · 1 maybe · 3 no answer".
5. Rotation advances when `pick` runs.

### 6.2 Scoring (go-around)
1. Host or scribe taps **Open scoring** on `/m/[slug]` (`scoring: not_open → open`).
2. Either each person types their own on `/m/[slug]/score`, or the scribe/host types the table on
   `/m/[slug]/goaround` as people speak. Both can happen; one row per member, last write wins, every write logged.
3. In `open` reveal mode (default), entries appear live for the roster. In `together` mode, members see only their
   own until reveal; the scribe sees ✓/— via `scoring_progress`.
4. **Reveal** (scribe or host) → `revealed`. `club_score` and rank show up, and the meeting joins history.
5. Corrections later: scribe only (logged, undoable, shows a small "corrected" mark).

### 6.3 Ballot
`/ballot` → tap up to 3 in order → Confirm → `cast_ballot` (its own request) → "Your ballot is in. N of M have
voted." No tally → Close (manual, all voted, or `closes_at`) → `ballot_results` → tie-break → **Pick**.

### 6.4 Talk
Home shows thread `club`. Meeting threads are created automatically and pinned during their month. Posts are
Markdown, human only. Edit your own; the scribe can hide. Unread dots come from `reads`. No email digest in v2.0.

### 6.5 Public vs private toggle (scribe, `/club` settings)
- `visibility = public` (default): signed-out visitors get Home (no RSVP or directions), History, Book, Meeting
  (scores only if `public_scores`), Stats (member stats only if `public_scores`), Talk read-only (if `public_talk`),
  and a members list with names only.
- `visibility = members`: signed-out visitors see a one-card page: club name, about, "Members: sign in".
- **Enforced twice:** Studio refuses a public bind unless `spaces.public_read = true` (S5), and the site's settings
  form sets both together through the Studio API (S5) plus the `club` row. App RLS decides the rows. Switching to
  private takes effect on the next request (no caching of public pages beyond 60 s; S5 `Cache-Control`).

### 6.6 Joining (invite)
Scribe on `/club` → Roster → pick a roster row (e.g. `kirk-m`) or add one → **Copy invite link**
(`https://db.byoaistudio.com/join/<token>`, 14 days, single use). The scribe texts it; we don't send email. Kirk opens
it → Studio sign-in or sign-up (email + password) → Studio adds `space_members(role=member, member_slug='kirk-m')` →
redirect to `bookclub site /` signed in (90-day sliding session). Already signed in to Studio = one tap.

### 6.7 Sign-in for an account in several clubs
Studio `/authorize?site=bookclub` shows a club picker if the account belongs to more than one members space with app
`bookclub`. The chosen club becomes the session's space. The site shows "Switch club" in `/club`.

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
  `space_members(space, account, role, member_slug)`, mark used, create a site session for the club's registered
  `bookclub` site, redirect to its return URL.
- **Accept:** a used, expired or revoked token gives a clear one-line page; the same account can't join twice; a
  `member_slug` already linked in that space is refused; the token is never stored in plain text; a test covers sign-up
  via an invite.

### S3. Member slugs and member-scoped sessions and keys
- [ ] `space_members.member_slug text not null`, unique `(space_id, member_slug)`, slug check. New
  `byoaistudio.current_member_slug()` (definer, granted like `current_member`). `bind` copies it into `tx_space.member_slug`.
- [ ] `site_sessions.member_id bigint null`, `keys.member_id bigint null`, `connect_codes.member_id bigint null`. Replace
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
- [ ] `/sql` error mapping: an RLS refusal on a members space reports the policy name mapped to a one-liner
  (`votes_write` → "you can only enter your own score while scoring is open"), not "your own space".
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
- [ ] Site request with `X-Site` and `X-Public-Space: <handle>` and no session → render pool, select only, rate-limited
  per IP, `Cache-Control: public, max-age=60`.
- [ ] API `PUT /club/visibility {public: bool}` (scribe session) sets `public_read`. The site calls it together with
  updating `club.visibility`.
- **Accept:** `public_read=false` → public request 403 `this club is members-only`; `true` → only rows whose policies
  include `is_public()` come back; public writes are refused at the grant level (render login); Reading private spaces
  can't be made public.

### S6. Site pool + app object registry (site-only, unlogged)
- [ ] New login role `byoaistudio_site` (member of nothing). Site-session requests (Reading included) use it. Its
  grants = `byoaistudio_space`'s app grants, plus execute on site-only app functions. Password stored like
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
- [ ] NOLOGIN role `byoaistudio_appfn` (member of nothing; nobody is a member of it). App migrations create
  `security definer` functions owned by it with pinned `search_path`. Table policies may be `to byoaistudio_appfn`.
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
- **Accept:** works for private spaces (Reading: member null) and clubs; key `last_used_at` updates at most every 30 s.

### S10. Club provisioning script
- [ ] `scripts/create-club.mjs <handle> --site bookclub --scribe <account-email> --scribe-slug shelby-g`: creates the
  members space, enables app `bookclub`, inserts the scribe membership, seeds the `club` row via a maintenance bind.
  The site registration (`site.mjs`) gets the bookclub return URLs.
- **Accept:** running it twice is a no-op; club #2 dry run works from an empty space.

### S11. Book Club app migration lives here
- [ ] `migrations/0xx_bookclub.sql`: everything in §5 (tables, forced RLS, policies, triggers, helpers, functions owned
  by `byoaistudio_appfn`, views, grants, `app_objects` rows, `apps` row `bookclub`). Track B writes it (§14).
- **Accept:** `tests/2x-bookclub.test.ts` covers the matrix in §3 row by row (each ✓ and each — as a test), the
  score-visibility rule in both reveal modes for site **and** AI channels, the ballot leak table in §5.5, and the
  public toggle.

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
sacred; ask before bulk) · `CLUB.md` (every view and column with meaning) · `STATS.md` (SQL for the canned questions +
how to answer fuzzy ones) · `WRITEUPS.md` · `LATER.md` (work owed items: covers, GR scores, kind suggestions) ·
`IMPORT.md` (§12, for club #2). No MCP, skills or plugins.

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
  in any table.

---

## 13. Decisions

### DECIDED for v2 (schema can be written now)
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

### Still open (none block schema or Studio work)
- **O1 Domain** (12.2): proposed `bookclub.hadmoney.com`. Blocks deploy only. *Angel.*
- **O2 Pilot meeting** (12.13): which meeting is the first entered only on the site (Oct = Kirk is in the sheet;
  Nov/Dec blank)? *Shelby.*
- **O3 Mail sender** (12.9 / S12): provider choice and whether reminders/digest are needed for v2.1. *Angel.*
- **O4 Fiction tagging** (12.12): Shelby tags vs bulk-confirms AI suggestions. Same schema either way. *Shelby.*

---

## 14. Build order

```
Track A  byoaistudio  S1 → S3 → S4 → S6 → S7 → S5 → S8 → S2 → S9 → S10      (S12 optional)
Track B  bookclub     schema (S11) + import script + checksum   ── parallel with A; tests use a maintenance
                                                                    bind and stubbed current_*() until S3/S4 land
Track C  Reading      R1–R9 (R1/R2 need S9; R3/R4/R5/R6/R7 can start now)
Track D  site         after A (S1–S8 minimum) and B: D1 → D7
```

**Track A order rationale:** S1 is the base; S3/S4 make member and channel visible to policies (Track B's RLS
depends on them); S6/S7 unblock ballots; S5 public; S8 history; S2/S9/S10 are product plumbing the site needs.

**Track D (site), each step shows Shelby something:**
1. **Repo + shell:** `1000Problems/bookclub` (Next.js 16, Tailwind v4, Reading tokens), Studio PKCE sign-in, public
   fetch path. *Shelby sees: home card with the imported next meeting.*
2. **Home logistics + RSVP + bring + directions** (§4.1 cards 1, 4). *First "when/where/what".*
3. **Talk:** home chat, meeting threads, unread, public read. *Chat on the front page.*
4. **History, meeting, book, members, stats** pages (reads only). *Answers he used to compute by hand.*
5. **Scoring:** open/reveal, own score, go-around form. *First live night with no spreadsheet.*
6. **Slate + ballot:** `/next`, `/ballot`, close, pick, rotation. *First phone vote at the table.*
7. **Club settings + roster/invites + connect your AI** (§7) + BookClubDocs. Then a **club #2 dry run** from an empty
   space.

**Definition of done for v2.0:** Soul Crushers holds one full cycle (RSVP → meeting → go-around scores → ballot →
pick → next home card) entirely on the site, public home visible to a signed-out phone, and at least one member's AI
answering "how many nonfiction books since 2020?" from the club DB.

---

## 15. Out of scope (v2)
MCP of any kind · email/SMS sending (S12 later) · native apps · meeting recording/transcripts · club discovery,
public profiles, followers · AI-authored votes/posts/RSVPs · a general CSV importer UI for any club (club #2 uses the
script + their column map) · linking club books into Reading libraries · paid tiers/billing · moderation beyond
scribe-hide · calendar sync beyond a downloadable .ics · per-club custom fields · splitting a real `accounts` table out
of `spaces` (stay with "account = private space" per PR #1).

---
*2026-11-03. Grounded in byoaistudio `main` docs as mirrored on the box (migrations through 057) + PR #1's diff. Verify
migration numbers and Reading file paths against the live repos when starting each task.*
