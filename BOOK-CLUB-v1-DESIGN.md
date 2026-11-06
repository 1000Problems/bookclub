# Book Club — v1 design (draft)

> **Superseded prior art.** We are building the Soul Crushers book club page, not a generic book club product. Its goals of serving "any other book club later" and "club #2" are withdrawn. Current spec: [v3.2](BOOK-CLUB-v3.2-DESIGN.md).

Status: **draft for Angel**, 2026-11-01; revised **2026-11-02** from Angel's readiness review. §12.1 decided: Studio DB.
Partly ready: Studio membership design + `bookclub` migration/import can start in parallel; site waits on both.
Design partner: **Soul Crushers** (Shelby, scribe since 2008).

Sources: Shelby call transcript (2026-11-01), Soul Crushers History sheet (export used for design: `/tmp/sc.csv`,
`/tmp/sc.xlsx` on the bot box), live Studio/Reading docs in the **`1000Problems/byoaistudio`** and **`reading`**
repos on disk (`docs/STUDIO.md`, `docs/DB-IMPL.md`, `tasks/TASK-12`, `TASK-17`, `TASK-18`, Reading's
`shelf/DESIGN_BRIEF.md`, `ReadingDocs/README.md`, `IMPORT.md`). A mirrored copy of some spine docs also lives on the
bot box under `/workspace/spine/` — prefer the git repos as source of truth. This `bookclub/` folder is **not a git
repo yet**.

---

## 1. The product in one line

**Book Club is a club's shared history, rituals and talk, on one calm site; any member can use all of it with no AI,
and anyone who wants can connect their own AI to the club's database to do the heavy lifting.**

Who it's for, in order:
1. **Soul Crushers** — ~15 people on the roster, ~8 active, 190+ meetings since Dec 2008, Shelby as scribe.
2. Any other book club later. We design against Soul Crushers' real data and rituals, and keep the shape general
   (one club = one space, §10), so club #2 is a sign-up, not a rewrite.

The moment we're after (same spirit as Reading's README): Shelby opens the site on his phone after a meeting, enters
the night in one short form, everyone's scores and words come in from their own phones, and the next time someone asks
"is Moby Dick top ten all time?" the answer is already on the Stats page. Nobody touches a spreadsheet again.

## 2. Relationship to Reading and BYOAI Studio

Reading is the **first multi-user BYOAI site**: anyone signs up at db.byoaistudio.com, gets a space, connects their own
AI, and the site renders what their AI builds (STUDIO.md §1–§5). Book Club is the **second site on the same rails**, with
two deliberate differences:

| | Reading | Book Club |
|---|---|---|
| Whose data | one person's library (a private space) | one **club's** history (a shared club space, many members) |
| Without an AI | site is empty; the AI fills it (STUDIO §7.1) | **site is fully usable**: forms, ballots, stats, talk all work with no AI |
| What the AI does | almost everything | **enrichment only**: import help, fuzzy questions, write-ups, cleanup, reminders |
| Site writes | small owner edits (actor "you") | load-bearing: every vote, word, ballot, post and meeting record |
| Look | calm, literary, dark/amber | **same skin** (§6) |

Kept from Studio exactly:
- **App = schema + Markdown repo + site** (STUDIO §4). Schema in the studio; a Markdown-only repo (`BookClubDocs`) as
  the AI's manual; a site on its own domain.
- **Sign in with BYOAI Studio** is the only way in (STUDIO §5; PKCE per TASK-17). The site has no login/signup pages.
- **Plain SQL contract** for AIs: connect code → key → `/describe` → `/sql`; every request one change, undoable —
  **except** secret-ballot tables, which must skip change logging and undo (§5.4, §10.2).
- **Natural keys (slugs)**, not ids, for anything an AI or the site addresses (STUDIO §2).
- **Two voices** on screen: what humans wrote vs what an AI wrote (DESIGN_BRIEF "Mine vs Claude's").
- **"Ask your AI" locators**, not instructions (ask-ai-locator-table.md).

Changed for Book Club (needs Studio work, §10 — a **real design**, not a spike): a space can have **members**; some
tables are **site-only** (an AI key can't read them); some tables are **unlogged** (no change row, no undo — ballots).

## 3. Goals and non-goals (v1)

v1 = **everything on Shelby's list**. Not a cut-down MVP.

### Goals
1. **History**: every meeting since 2008 — book, author, host, date, venue, club score, Goodreads score, notes (food,
   place, what happened), skipped months, two-month books.
2. **Votes + one word**: per member per meeting, a number and a required word; misses with a reason.
3. **Roster**: active members and alumni; alumni stay in history forever.
4. **Forms, not cells**: Shelby (and hosts, and members for their own vote) enter everything through phone-friendly forms.
5. **Answers to the questions people ask Shelby**: top/bottom books, top-10 check, easiest/harshest voter, who voted
   most, fiction vs nonfiction mix (overall and by era), host counts, attendance.
6. **The ritual**: next host brings five books → club picks one → next month at the host's place, host cooks →
   rotation continues.
7. **Secret phone ballot (top 3)**, auto-tallied, so the loud voices don't decide.
8. **Between-meeting talk** that replaces email threads: per-book and general threads that don't get lost.
9. **Optional AI**: Shelby or any member can connect their AI to the club's database; the site never requires it.
10. **General enough** that a second club can sign up without schema changes.

### Non-goals (v1)
- Recording/podcasting meetings (Shelby's friend's sci-fi club does this; later idea).
- Public celebrity-club packaging, discovery of other clubs, follower counts.
- HTTH-style human-verification machinery for chat. Book Club talk is private to members; HTTH is the sibling project.
- AI-written content posing as a member. AIs never cast votes, words, ballots or posts for anyone.
- Linking club books into a member's personal Reading library (nice later; same commons covers make it easy).
- Native apps. Phone web only (same as Reading).
- Member birthdates. The sheet header has them; we don't import or store them.

## 4. Personas and roles

| Role | Who (Soul Crushers) | Can do on the site |
|---|---|---|
| **Scribe** (admin) | Shelby | everything: meetings, roster, rotation, open/close scoring and ballots, fix anyone's entry (logged), invite members, club settings, import review |
| **Host** | whoever's month it is | their meeting's notes (venue, food, what happened), their slate of five, open the ballot for their slate |
| **Member** | the ~8 active | own vote + word, own ballot, posts, read everything in the club |
| **Alumni** | Matt, Ballan, Tim, … who phased out | a roster row with history; may have **no account at all**. If they sign in later, read-only + talk unless re-activated |
| **Guest** (open) | a one-night visitor | open question (§12) |

Roles are per club (a person can be scribe of one club, member of another). **Host is not a stored role**: it's derived
from the meeting (`meetings.host`), so rotation drives permissions automatically.

Connecting an AI is **orthogonal to role**: any member may connect one; the AI's key gets that member's role and no
more (§10).

## 5. Core objects (data model sketch)

One club = one Studio space (§10), so no `club_id` column anywhere — Studio's hidden `space_id` does that job, exactly as
for Reading. Names below are the bare view names an AI or the site sees. Sketch, not DDL.

### 5.1 Club and people
- **`club`** (one row): `name`, `founded_on`, `score_scale` (default 0–10, decimals allowed — the sheet has 7.999 and
  8.432), `ballot_method` (default `top3_borda`), `slate_size` (default 5), `talk_visible_to_ai` (default false, §8.4),
  `about` (Markdown, human).
- **`members`**: `slug` (pk-ish, e.g. `shelby-g`), `name` ("Shelby G"), `aliases` (`{Shelby}`; for import: `JohnF`,
  `JF`, `John F`), `status` (`active` | `alumni` | `guest`), `role` (`scribe` | `member`), `joined_on`, `left_on`,
  `account` (Studio handle once they sign in; null for alumni who never do), `note`. **No birthdate column.**
- **`host_rotation`**: `position`, `member` — the order Shelby keeps. "Next host" is computed (§7.1); swaps are just a
  meeting with a different host (`venue_member` handles "at Will's house, switch w/ Shelby").

### 5.2 Books and meetings
- **`books`**: `slug`, `title`, `author` (one spelling; "Last, First" from the old era rewritten), `isbn`, `cover_url`,
  `kind` (`fiction` | `nonfiction` | null), `kind_by` (`me` | `ai` — an AI guess shows as a suggestion until a human
  confirms), `goodreads_avg` (1–5, stored raw; the site shows ×2 like the sheet's `GRx2`), `goodreads_checked_on`,
  `year_published`. Covers/ISBNs can join commons `book_facts` (TASK-18) when present.
- **`meetings`**: `slug` (`2026-08`), `number` (the sheet's running count, e.g. 180; null where the sheet has `x`),
  `month` (first of month), `met_on` (date, e.g. Thu Aug 27), `status` (`planned` | `met` | `skipped`), `book`,
  `host` (member who chose the book), `venue_member` (whose house, if different), `venue_text` (e.g. "Eleven Winery"),
  `food` (short text), `notes` (Markdown, human: what happened), `continues` (slug of the earlier meeting when a book
  spans two months — Moby Dick May→June; scores live on the last one), `scoring` (`closed` | `open` | `revealed`).
- **`club_score`**: computed by the database (a view), mean of counted votes, 1 decimal. Not typed. Import keeps the
  sheet's typed score as `legacy_score` to flag disagreements once, then hides it.

### 5.3 Votes and words
- **`votes`**: `meeting`, `member`, `attendance` (`voted` | `partial` | `unfinished` | `missed` | `out`), `score`
  (0–10, decimals), `word` (required when `attendance` is `voted`/`partial`), `miss_reason` (`work`, `travel`, free
  text), `comment` (legacy text like "travel (9.2 / binacle)"), `source` (`me` = entered on site by that member,
  `scribe` = entered by scribe for them, `import`). One row per member per meeting.
- Whether `partial` ("part(8)") counts toward `club_score` is a club setting (§12).
- **Reveal (database rule, not UI-only)**: while `meetings.scoring = open`, RLS on `votes` lets a member
  **read only their own row** (and lets the scribe see entry checkmarks without scores if needed via a narrow view).
  A connected AI using that member's key sees the same: only that member's vote until reveal. After `reveal_scoring`,
  all members (and AIs) can read every score and word for that meeting. Same anti-anchoring idea as the ballot. Votes
  are not secret once revealed — they're public in the sheet today. Hiding numbers only in the site is **not enough**.

### 5.4 The pick: slate and secret ballot
- **`slates`**: `for_meeting` (the upcoming meeting), `host`, `status` (`drafting` | `voting` | `closed` | `picked`),
  `opens_at`, `closes_at`, `picked_book`.
- **`candidates`**: `slate`, `book` (≤ `slate_size`, default 5), `pitch` (host's one line, human).
- **`ballot_voters`** (**site-only**): `slate`, `member`, `cast_at`. Who has voted; no choices.
- **`ballot_choices`** (**site-only**): `slate`, `ballot` (random id), `first`, `second`, `third`. **No member column.**
  Choices are stored unlinked from the voter, so even the scribe and a database read can't tie a ballot to a person
  (beyond timing — we round `cast_at` to the minute and insert choices in a separate statement order; good enough for
  a book club, stated honestly in the UI).
- **Unlogged + no undo (required for secrecy):** both `ballot_voters` and `ballot_choices` **must skip Studio's change
  triggers and `/undo`**. Studio's default contract is "every request one change, undoable" with actor on the log
  (§2, §10.1). If a `ballot_choices` insert is logged as `member:x`, the change log re-links the voter to their
  choices and the ballot is no longer secret. Site-only alone is not enough — the tables also need an **unlogged /
  no-history** declaration that Studio supports (§10.2 item 4). Undo of a cast ballot is not offered; re-open +
  re-vote (if ever allowed) is a deliberate scribe action, not `/undo`.
- **`ballot_results`** (view, visible to members and AIs **only when `status` ≥ `closed`**): per candidate points,
  first-choice count, ballots cast, turnout. Raw ballots never appear in any AI-readable view.

### 5.5 Talk
- **`threads`**: `slug`, `title`, `meeting` or `book` (optional anchor), `started_by`, `pinned`, `closed`.
  Every meeting gets a thread automatically ("Ficciones — Aug 2026"); plus a few standing ones ("Logistics", "Off topic").
- **`posts`**: `thread`, `member`, `body` (Markdown, human), `created_at`, `edited_at`, `source` = `me` always.

### 5.6 AI voice
- **`writeups`**: `subject` (`meeting:2026-08`, `book:ficciones`, `member:kent-s`, `year:2025`), `body` (Markdown),
  `written_by` (the member whose AI wrote it), `source` = `ai` always, `written_at`. The only table an AI writes prose
  into. Rendered in the AI voice (§6.2).
- **`later`** (optional, Reading's Later pattern): things owed — missing covers, missing Goodreads scores, unconfirmed
  fiction/nonfiction, import flags. The site shows them; a connected AI can work them; a human can fix them by form.

### 5.7 Stats views (database does the arithmetic)
`book_scores` (club score, GR×2, delta, rank all-time, rank in year), `member_stats` (mean, count, stdev, misses,
easiest/harshest rank, words), `host_stats` (times hosted, avg score of their picks), `mix` (fiction/nonfiction by year
and by 5-year era), `attendance` (per member per year), `word_cloud` source (all words with meeting). Same rule as
Reading's ranking: **developer defines slots, database computes, site renders** (STUDIO §4).

## 6. Site surfaces (borrowing Reading's UI)

### 6.1 The skin (from `reading/shelf/DESIGN_BRIEF.md`)
- Tokens unchanged: bg `#0d0f14`, panel `#151922`, line `#252b38`, text `#e7e9ee`, muted `#8b93a7`, accent amber
  `#f2b84b`. Light mode welcome, as in Reading.
- Newsreader for titles and book text; Geist for UI and numbers.
- Same shared classes (`.panel .input .btn .btn-primary .muted .prose-note`); Next.js 16 + Tailwind v4, no component
  libraries (Reading's constraints). Ideally lifted from Reading's `globals.css` into a shared package or copied verbatim.
- **Phone first** (375px, one hand), tap targets ≥ 44px; desktop second.
- **Book cards** with covers (Open Library / commons), title, author; no-cover cards styled like Reading's.
- Calm and literary, **not a SaaS dashboard**: stats are sentences and short ranked lists with covers, not charts walls.

### 6.2 Voices
| Voice | What | Look (Reading pattern) |
|---|---|---|
| **Member** | votes, words, posts, host pitches, meeting notes | "mine" style: short, personal, attributed by name |
| **Club record** | dates, books, hosts, computed scores | plain facts, Geist numbers |
| **AI** | `writeups` only | Reading's "Claude's summary" style: magazine explainer, labeled "written by Shelby's AI", date |

An AI suggestion that isn't confirmed (e.g. `kind_by = ai`) shows dashed/quiet until a human taps Confirm.

### 6.3 Pages
| Page | Path | What | Reading pattern borrowed |
|---|---|---|---|
| **Home / Library** | `/` | Search hero ("/" hotkey: books, authors, words, posts). Then **Next up** strip (next meeting, host, book or "slate voting"), then the history as book cards grouped by year, newest first; skipped months as thin lines | Home: search hero, grouped book cards |
| **Meeting** | `/m/2026-08` | Cover, title, author, host, date, venue, food. Club score vs Goodreads×2. Members' scores + words as a list (or reveal state). Notes. AI write-up if any. Thread link. Ask your AI | Book page: cover header, then two voices |
| **Book** | `/b/ficciones` | Usually one meeting; two for Moby Dick; also "was on a slate N times" | Book page |
| **Next** | `/next` | Next host (from rotation), date, the slate of five as cards with pitches, ballot status, turnout | Book cards |
| **Ballot** | `/ballot` | Phone: pick 1st, 2nd, 3rd from the five; confirm; "Your ballot is in. 5 of 8 have voted." | Quick-capture bottom sheet |
| **Score** | `/m/2026-08/score` | Phone: my score (decimal keypad), my word, or "missed" + reason | Quick capture |
| **Scribe** | `/scribe` | Shelby's desk: new meeting, open/close scoring and ballots, fix entries, roster, rotation, import review, Later | Add-book form + Later |
| **Members** | `/members`, `/members/kent-s` | Roster: active / alumni. Member page: their mean, count, easiest/harshest rank, all their words, books they hosted | — |
| **Stats** | `/stats` | The questions people ask, each a short answer with covers: top 10, bottom 10, "is this top 10?", easiest/harshest, most votes, fiction mix by era, hosts, attendance, biggest club-vs-Goodreads gaps | Review cards for "remember this one?" |
| **Talk** | `/talk`, `/talk/:thread` | Threads newest-activity first; meeting threads pinned during their month | — |
| **Club** | `/club` | About, members of this club, settings (scribe), "Connect your AI" | — |

Quick action (Reading's global quick capture): a floating **+** on phone opens the most likely action — "Score
Ficciones", "Vote for next book", "Post in Ficciones thread" — depending on what's open.

Empty states (club #2): brand-new club with no history ("Add your first meeting" / "Import a sheet"), a meeting with no
scores yet, a slate with no candidates, a quiet thread.

### 6.4 "Ask your AI" (only when the viewer has an AI connected)
Exactly Reading's locator shape (`ask-ai-locator-table.md`): label **Ask your AI**, copies names + link, no
instructions:
```
Soul Crushers — Ficciones (Aug 2026)
https://<bookclub-domain>/m/2026-08
```
Places it appears: Meeting, Book, Member, Stats, Scribe › Later, Import review. Without an AI, those buttons are absent;
nothing else on the page changes. (The BookClubDocs README tells the AI how to resolve a pasted link, as ReadingDocs does.)

## 7. Flows

### 7.1 The monthly cycle (the ritual)
1. **Rotation** says who hosts next (Shelby can override: swaps happen, e.g. Will/Shelby in Aug–Sep 2026).
2. **Host builds the slate**: on `/next`, adds five books (title box → match from commons / Open Library → card),
   each with a one-line pitch. Status `drafting`.
3. **At the meeting**, host taps **Open ballot**. Everyone votes on their phone (§7.3). Host/scribe taps **Close**
   (or it closes when every active member has voted, or at `closes_at`). Result shows on everyone's phone at once.
4. **Picked book** becomes next month's meeting: `planned`, host set, book set, venue = host's place by default.
5. **Next month**, the meeting happens; scoring (§7.2) opens; host adds food/venue/notes.
6. Rotation advances.

### 7.2 Scribe and scoring flow
- **Before**: meeting already exists as `planned` from step 4. Scribe/host fills date + venue (one form).
- **At/after the meeting**: scribe taps **Open scoring**. Each member enters score + word on their phone (or "missed"
  + reason). Scribe sees a checklist of active members with ✓/— (not the numbers). Scribe can enter for someone who
  texted him (source `scribe`, shown with a small mark).
- **Reveal**: scribe taps **Reveal** → all scores and words show; `club_score` computes; the meeting card appears in
  history with its rank ("#14 all time").
- **Notes**: host or scribe adds the human bits (food, what happened). Always typed; that's fine (Shelby: "the computer
  can't know").
- **Corrections**: any edit is a change in Studio history with the editor's name; undo per change.

### 7.3 Ballot flow (secret, top 3)
1. Member opens `/ballot` (or the + button). Sees five cards.
2. Taps 1st, 2nd, 3rd (or fewer: a ballot may rank 1–3 books). Confirm.
3. Site calls the club's `cast_ballot` function (site session only): checks the member is active, the slate is
   `voting`, and they haven't voted; writes `ballot_voters` and, separately, `ballot_choices` with a random id.
4. Screen: "Your ballot is in. 5 of 8 have voted." No running tally while voting is open (that's what loud voices
   would anchor on).
5. On close: `ballot_results` becomes readable. Default method **Borda 3/2/1**; tie → most first choices → host's call
   (one tap, logged). Club can switch to plain plurality or instant-runoff later (club setting).
6. A ballot can't be changed once cast (because it's unlinked from the voter). Open question (§12).

What the AI can see: `ballot_results` after close, turnout, never `ballot_voters`/`ballot_choices`. That's enforced by
grants, not by the manual (§10).

### 7.4 Talk flow
- Threads per meeting (auto), per book on a slate (optional), and standing threads. Post = Markdown, human only.
- Unread dots per thread for the viewer. Reply-to quoting. Edit own post (history kept); scribe can hide a post.
- Notifications: in-site unread counts in v1. **Email digest** ("3 new posts in Ficciones") needs a mail sender that
  neither Studio nor Reading has today — open (§12). Until then, people still get the habit from the site + one email
  from Shelby pointing at it.
- Book Club talk is private to members. No logged-out reading.

## 8. Stats and Ask: site SQL vs connected AI

### 8.1 Site answers (no AI, always on)
The Stats page renders the database views from §5.7. The canned questions, from what Shelby said people ask:
1. Top 10 / bottom 10 books all time (and by year / era).
2. "Is <latest book> top 10 all time?" — every meeting card shows its all-time rank; Stats has the answer at the top.
3. Easiest and harshest voter (mean, with minimum N votes), most consistent, most votes cast.
4. Fiction vs nonfiction: overall %, by year, by era ("2012–2016 was 60% nonfiction").
5. Hosts: times hosted, average club score of their picks, best pick.
6. Attendance: who came most, streaks; misses by reason.
7. Club vs Goodreads: books we loved that Goodreads didn't, and the reverse.
8. Words: all words for a book; a member's words over the years.

Each answer is a sentence plus a short list with covers. Every number links to the meetings behind it.

### 8.2 AI answers (only with a connected AI)
Fuzzy or one-off questions ("what did we read the year Kent hosted three times?", "which books split us the most?",
"write a 2025 year-in-review") go to the member's own AI through **Ask your AI** on `/stats` or any page. The AI reads
the views with SQL and replies in the member's chat; if the member asks for something durable, it writes a
`writeups` row (AI voice) that the site shows on that subject's page.

### 8.3 What the AI may write
| Table | AI may write? |
|---|---|
| `books` facts (isbn, cover, goodreads_avg, year, `kind` as a suggestion) | yes, any connected member's AI |
| `meetings`, `members`, `host_rotation`, legacy import rows | only an AI connected by the **scribe** |
| `writeups`, `later` | yes (AI voice) |
| `votes`, `posts`, `candidates.pitch`, `notes` | **no** — human voice. Exception: the scribe-approved one-time import writes historical `votes` with `source = import` |
| `ballot_*` | **no**, and can't read them |

### 8.4 Talk and AIs
Posts are the club's private, profane banter. A member's connected AI reading them sends club chatter to that member's
AI provider. Default: `posts` is **not** readable by AI keys (`club.talk_visible_to_ai = false`); the club can turn it
on. Open (§12).

## 9. Import from the Soul Crushers sheet

One time, Shelby's approval, Reading's IMPORT.md spirit: **column map → example rows → counts → one yes → batched,
idempotent, undoable upserts**.

### 9.1 What the sheet holds (from the export)
- Rows by year (2026 → 2008), month names, a running meeting number in column A (181, 180, …; `x` on some skipped
  months), `-- skipped --` rows (15 seen), first meeting Dec 2008 ("very first book club meeting").
- ~192 meeting rows with a book (incl. Sep 2026 planned, Moby Dick twice: May "--", June 9.0).
- Columns: Date, Book, Author, Host, Score, GRx2, Notes, Voting, then per-member `vote` + `comments` pairs for 15
  named members. **Header names carry birthdates** ("Shelby G (4/2/67)") — strip, never store.
- **Two eras of votes**: recent years in per-member columns (`7.9`, `word: tetragrammaton`; `miss`, `work`); older years
  as free text in the `Voting` column ("Kent=6, Henry=9, … JohnF=x", "Shelby=part(8)", "Gordon (unfinished)",
  "Kirk (out)", "Chuck from Hawaii = 6.375").
- Row 5 holds per-member averages and counts (e.g. one pair is 7.5 / 113). **Use it as a checksum**, not as data.
- Header columns and data columns are not perfectly aligned (pairs shift around unused columns) — map by checking
  sample rows, not by header position.
- Drift: authors "Last, First" in old rows vs "First Last" now; member aliases (Stephen/Stephan/Steven, JohnF/JF/John F,
  JohnW/JW/John W); hosts `---` when unknown; notes mix date + venue + food ("Thu, Jul 23 Tim's house ratatouille and
  key lime pie!"); "switch w/" swaps.
- **Fiction/nonfiction lives only in Shelby's highlighting**, which the export doesn't carry (1 of 206 book cells has a
  fill in the xlsx). So `kind` starts empty: Shelby confirms on a form, or a connected AI suggests (`kind_by = ai`) and he
  confirms in bulk.

### 9.2 Column map
| Sheet | Book Club | How |
|---|---|---|
| A (year / number / `x`) | `meetings.number`, year context | number when numeric; year rows set context |
| Month | `meetings.month` | with year context |
| Book | `books.title`, `meetings.book` | `-- skipped --` → `status = skipped`, no book; same title twice in a row → `continues` |
| Author | `books.author` | one spelling per person; "Last, First" → "First Last" |
| Host | `meetings.host` | alias → member slug; `---` → null + a Later item |
| Score | `meetings.legacy_score` | compared to computed mean; differences listed for Shelby, not silently kept |
| GRx2 | `books.goodreads_avg` | ÷ 2; `--`/empty → null |
| Notes | `met_on`, `venue_*`, `food`, `notes` | parse date and "X's house" when unambiguous; otherwise keep whole text in `notes` |
| Voting (free text) | `votes` | parse `Name=score`; `x` → missed; `part(n)` → partial n; `(unfinished)` / `(out)` → those states; unparsed fragments → `comment` + Later item |
| vote / comments pairs | `votes.score`, `word`, `attendance`, `miss_reason` | `word: …` → word; `miss` + text → missed + reason |
| Member header | `members` | name only; **birthdate dropped**; status active if voted in the last 12 months (Shelby confirms) |
| Row 5 averages | — | checksum only |

### 9.3 Who runs it
- **Path A (default): one guided import**, run by Angel's or Shelby's connected AI following `BookClubDocs/IMPORT.md`, or
  a one-off script Angel runs; either way it writes through `/sql` in batches (first 25 meetings, check with Shelby, then
  the rest; each batch one undoable change; `on conflict (slug) do nothing`).
- **Then the site's Import review** (`/scribe/import`, no AI needed): counts, checksum vs row 5 per member, and every flag
  as a fix-it form (unknown host, unparsed vote, score mismatch, author variant).
- Not in v1: a general CSV importer on the site for any club's sheet. Club #2 uses Path A with their own column map.

## 10. Auth and tenancy (proposal)

### 10.1 The model: **one club = one Studio space, with members**
- Every person has a normal Studio account (as for Reading). Shelby's account can also own his Reading space; nothing
  changes there.
- A **club space** is a Studio space of app `bookclub` that has **members** (accounts) with a club role. Soul Crushers is
  space `soulcrushers`. Club #2 is another space — no `club_id` in the schema; tenancy stays Studio's hidden `space_id`.
- **Site sign-in** (STUDIO §5, TASK-17 PKCE): member signs in through db.byoaistudio.com; the site session is bound to
  (site, **club space**, **member**). If the account is in several clubs, the site shows a club picker after sign-in.
- **Site writes** run with that session; the change log actor is the **member** (e.g. `member:shelby-g`), not a bare
  "you", so club history shows who changed what.
- **AI connect**: from the club's `/club` page (or Studio's space page), a member gets a connect code for the club space.
  The key is bound to (club space, member, role). Same `/describe`, `/sql`, `/history`, `/undo` as Reading.
- **Revoke**: scribe can remove a member (their sessions and AI keys for that club die). Member can disconnect their AI.

### 10.2 What Studio must add — **design first, then build** (not a spike)
STUDIO.md §3 says "private by default, no sharing between users". Book Club needs one sanctioned exception, and the
**whole product after the import rests on this**. Step 1 of the build order is a **real Studio design** covering every
item below (acceptance criteria, migration shape, Reading non-regression), then implementation. A partial code spike
([PR #1](https://github.com/1000Problems/byoaistudio/pull/1) / TASK-42) already explores `space_members` +
`current_member()` / `current_role()`; it is **not** the complete Studio work and must not be treated as done.

Concretely Studio must support:
1. **Space members**: `space_members(space, account, role)` + invite flow (scribe sends an invite link; invitee signs in
   or signs up; joins). Today an account *is* a space (TASK-12 `set-login` sets email/password on a space).
2. **Member-aware binding**: `bind()` already records an `actor` (DB-IMPL §2); the app needs to read the current member
   and role inside SQL (e.g. `byoaistudio.current_member()`, `current_role()`) so RLS/policies can say "a member writes
   only their own vote", "only scribe writes meetings", "only own vote row while scoring is open".
3. **Site sessions and AI keys scoped to (space, member)**, plus the club picker when an account has several.
4. **Site-only + unlogged objects** (two separate knobs):
   - **Site-only**: reachable from a site session, never from an AI key (`ballot_*`; optionally `posts`). Today both
     site writes and AI SQL run on the `byoaistudio_space` pool (DB-IMPL §8); this needs a third pool/role for site
     sessions or a policy on the session kind.
   - **Unlogged / no-undo**: tables that **skip change triggers and `/history`/`/undo`** so a ballot cast cannot be
     reconstructed from `member:x` next to `ballot_choices` rows. Required for §5.4 secrecy. Site-only without
     unlogged still leaks via the change log.
5. **Per-member change attribution** in `/history` (actor = member) and a scribe-only undo for others' changes
   (does not apply to unlogged ballot tables).
6. Nice-to-have: commons `wanted_books()` (TASK-18) also reading `bookclub_books`, so club covers/ISBNs get filled by the
   same job.

### 10.3 What the Book Club site/app owns
- The schema, views, RLS policies keyed on member/role, `cast_ballot`/`open_*`/`close_*`/`reveal` functions, computed
  stats.
- All pages and forms; club picker UI; invite UX (calling Studio's invite).
- `BookClubDocs` (the AI manual).

### 10.4 Fallback (off the table)
HTTH's v1 kept shared data in its own Postgres. **Decided (§12.1):** Book Club uses `db.byoaistudio.com`. Do the Studio
membership + site-only + unlogged work properly; do not prototype on a separate club Postgres.

### 10.5 Privacy stance
- Club space is **members-only**. No public history page in v1 (the sheet link is semi-public today; Shelby decides, §12).
- No birthdates, no emails shown to other members, no phone numbers.
- Ballot secrecy: from members, hosts, the scribe, every AI, **and the change log**; stated plainly as "not from the
  database operator's timing logs" (§5.4). Site-only + unlogged together.
- Talk not AI-readable by default (§8.4).

## 11. Packaging: schema + Markdown repo + site

1. **Schema** — Studio app `bookclub`: migration creating `byoaistudio_data.bookclub_*` tables with RLS and change
   triggers (except unlogged ballot tables), `bookclub.*` views (bare names above), stats views, functions
   (`cast_ballot`, `open_scoring`, `reveal_scoring`, `open_ballot`, `close_ballot`, `pick`), grants (site-only objects
   excluded from the AI role). Vote RLS encodes reveal. Runs once for all club spaces (DB-IMPL §8 pattern). Can be
   written and tested against a club space **in parallel** with Studio membership landing; live multi-member site
   use waits on §10.2.
2. **Markdown repo** — `1000Problems/BookClubDocs` (mirrors ReadingDocs): `README.md` (connect, resolve a pasted locator,
   job table), `SAFETY.md` (never write votes/words/posts/ballots; human voice is sacred; ask before bulk), `CLUB.md`
   (tables and meaning), `IMPORT.md` (sheet import, §9), `STATS.md` (example SQL for the canned questions and how to
   answer fuzzy ones), `WRITEUPS.md` (meeting/year/member write-ups in AI voice), `DAILY.md` (optional: work the Later
   list; remind before a meeting — the AI messages its own member, never the club).
3. **Site** — Next.js 16 + Tailwind v4, Reading's tokens and classes; signs in via Studio; reads/writes via `/sql` JSON
   form with `X-Site` + `X-Session` (TASK-17). Domain: open (§12).

## 12. Open questions for Angel (and Shelby)

1. **Studio change**: **Decided 2026-11-01 (Angel):** use `db.byoaistudio.com`. Add space members (shared club
   spaces) to Studio. HTTH-style own Postgres is off the table.
2. **Domain**: `bookclub.hadmoney.com`, a `byoai` subdomain, or Shelby's own? **Blocks deploy only, not coding.**
3. **Public read**: keep history members-only, or let Shelby publish a read-only history page?
4. **Ballot**: Borda 3/2/1 default OK? Allow changing a ballot before close (requires keeping a voter link, weaker
   secrecy)? Show who has voted (names) or only the count?
5. **Score reveal** (**blocks `votes` / migration**): reveal-together for meeting scores, or enter openly as today?
6. **Partial / unfinished votes** (**blocks `club_score` view**): count toward the club score? (Sheet has `part(8)`,
   "unfinished".)
7. **Score scale** (**blocks `votes.score` type**): keep 0–10 with up to 3 decimals (7.999 exists) or round to 0.1
   going forward?
8. **Talk and AIs**: may members' AIs read posts? Default no.
9. **Notifications**: is an email digest required for v1 talk to beat email? (No sender exists in Studio/Reading.)
10. **Guests and alumni**: can a guest score a night? Do alumni get accounts by default?
11. **AI connections per member**: one key per member per club (proposed) — and does it fold into Studio's open
    question "one connection per space covering all apps"?
12. **Fiction/nonfiction**: does Shelby want to tag ~190 books himself, or confirm AI suggestions in bulk?
13. **Pilot date**: which meeting is the first live one (Oct host Kirk is in the sheet; Nov/Dec are blank)?
14. **Generalization**: should club settings (slate size, method, scale) be editable in v1 or fixed to Soul Crushers'?

## 13. Suggested build order

**Readiness (2026-11-02):** partly ready. Steps 1–2 can start now (in parallel). Site and later steps wait until both
are done. Domain (§12.2) does not block coding. §12.5–§12.7 must be decided **before** writing the `votes` /
`club_score` parts of the migration.

### Parallel track A — Studio (must be a real design, then build)
1. **Studio design doc** for group spaces: membership, `current_member()` / `current_role()`, `(space, member)`
   sessions and AI keys, **site-only** objects, **unlogged / no-undo** tables, per-member history. Acceptance criteria
   and Reading non-regression. Expand beyond the TASK-42 / [PR #1](https://github.com/1000Problems/byoaistudio/pull/1)
   spike (membership + bind only).
2. **Implement and land** that Studio design on `byoaistudio` (migrate when ready). Every Book Club page after import
   needs this.

### Parallel track B — Book Club data (does not wait on membership to *exist*)
3. **Decide §12.5, §12.6, §12.7** (reveal, partials, decimals) — they change `votes` and `club_score`.
4. **`bookclub` migration + import script** against the Soul Crushers sheet (Path A); checksum vs row 5; flag list for
   Shelby. Can target a test club space; RLS/grants written to the contract in §10 even if Studio bits land slightly
   later. *Shelby sees: his whole history, correct (SQL or a throwaway read).*

### Then the site (after A and B)
5. **Read-only site** in Reading's skin: Home/Library, Meeting, Book, Members, Stats (site SQL). Sign-in for Shelby.
   *Shelby sees: answers he used to crunch by hand.*
6. **Members + roles on the site**: invites, club picker, member-scoped writes, history with member names.
7. **Scribe + scoring forms**: new meeting, notes, open/reveal scoring, phone score + word. Vote RLS enforces
   reveal. *First live meeting entered with no spreadsheet.*
8. **Slate + secret ballot**: host's five, `cast_ballot`, results, pick → next meeting, rotation advance. Site-only +
   unlogged. *First phone vote at the table.*
9. **Talk**: meeting threads, standing threads, unread. (Email digest if §12.9 says so.)
10. **Optional AI**: `BookClubDocs`, connect from `/club`, Ask-your-AI locators, `writeups` in AI voice, `kind`
    suggestions, Later list.
11. **Club #2 dry run**: a fake second club from an empty space; fix anything Soul-Crushers-specific that leaked into
    the schema.

---

*Revised 2026-11-02 from Angel's readiness review. Prefer git repos (`byoaistudio`, `reading`) over box spine copies.
Where this draft depends on something not built (full §10.2 Studio surface, email digest), it says so. PR #1 is a
partial spike only.*
