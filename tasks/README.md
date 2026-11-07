# Book Club site tasks (design §14, Track D)
Studio tasks are `byoaistudio/tasks/TASK-43…53`. Local only so far: no GitHub repo, no deploy, no production migrate.

| Step | Status | Still missing |
|---|---|---|
| D1 Shell, sign-in, public fetch | built | Header AI pill |
| D2 Home logistics | built | Directions and RSVP board load in the main batch, not lazily |
| D3 Talk | built | Unread dots on `/talk` |
| D4 Read pages | built | `/history` search; not every number on `/stats` links through |
| D5 Scoring | built | Decimal keypad is a plain input |
| D6 Slate + ballot | built | Ballot uses selects, not tap cards; no Open Library lookup |
| D7 Club, roster, invites, AI | partly | Import review; 3-step checklist on Home is a short card; `/club/ai` doesn't poll; BookClubDocs repo not created |

Other tracks not started: E2E Playwright specs (`e2e/`), sheet import (needs a fresh export), Reading R1–R9.
A 38-check scripted smoke against a local Studio passed on 2026-11-05. No one has looked at the pages in a browser yet.

## D8 One club at the root (v3.2): done
Pages moved to `src/app/(club)`, `/c/[handle]` removed, club fixed in `src/lib/club.ts`. Studio side: TASK-54.

## D9 Claude Design "Soul Crushers Site v2": built 2026-11-05
Source: `Bookclub homepage directions.zip`. Real Studio data, not the design's localStorage.
- [x] Header with Home, Books, Members. Footer links to Talk, Stats, Next book, Club
- [x] Home: next meeting (undated planned month still shows, SC7), in-place edits for host and admin, five book slots, chat with public switch, still to score, last time, arguments, every book
- [x] Books: rotating top three, years, covers and sheet views. `/history` redirects here
- [x] Book page at `/m/[slug]`, author page, members, member page
- [x] Ballot: tap to rank
- [x] Kept from the earlier Site design: RSVP on home, because v2 dropped it

Checked against a local mock Studio built from the design's JSON, signed out only. Not yet checked: real Studio, signed-in flows, phone width.
Left out: birthdays (never stored, §12). `next_meeting` in `byoaistudio` still needs the SC7 change. Ride field not built.

## D10 Shared books (SHARED-BOOKS-v1-DESIGN.md): built 2026-11-05, not live
Studio TASK-55 (066), Reading TASK-57, commons job `basics` phase.
- [x] Pages read cover, Goodreads, description and author facts from Commons through the views
- [x] Delete the browser Open Library lookup, `PHOTOS`, `public/authors/`, JS author slugs
- [x] Book page: description with source, members' Reading pages (signed-in only)
- [x] Author page: photo, bio, club history, news, members' pages
- [x] Admin: match review list on `/club` (Find this book)
Checked: Studio suite (one timing test already over its limit before 066), typecheck and `next build` here and in Reading.
Not checked: a browser against a real Studio, signed in; the commons `basics` run on production (needs the laptop: Wikipedia blocks the cloud).

## D11 Members and book redesign: built 2026-11-05
Source: `Members and book page redesigns.zip`, `Members.dc.html` (list and member) and direction 2a Scorecard in `Members and Book Directions.dc.html`.
- [x] `src/lib/members.ts`: one set of member stats for all three pages
- [x] Members list: "At the table now" cards, past members
- [x] Member page: hero, scores over time, every-meeting heat grid, hosted, every word, why they missed, every book with sorts
- [x] Book page 2a: hero with score and rank, four evening cards, score sheet with "vs their usual"
- [x] Kept on the book page: scoring, edit details, Talk, description, same author, members' Reading pages, write-ups
Differences from the design: no birthdays (never stored, §12); current means `status = active`, not "voted since 2025"; cells and words link to the book so they work on a phone; the score sheet restacks at phone width.

## D12 Sheet record and Excel export (EXCEL-EXPORT-v1-DESIGN.md rev 4)
Studio TASK-56 (067). Steps 6 and 7 of §9 are Angel's.
- [x] §6 `/admin`, `/admin/members`, `/admin/meetings`; scribe-only parts moved from `/club`; footer "Admin" for scribes
- [x] §4 admin inputs: label, birthday, link, sheet author, Goodreads rating, title color and bold, `no_score`, meeting number, vote codes
- [x] §5 export: `exceljs`, `src/lib/sheet/{layout,render,load}.ts`, route, card on `/admin`
- [x] §7 `scripts/compare-sheet.mjs` exits 0 against a local import

**As built, 2026-11-06.** Local Studio only; not deployed. `compare-sheet.mjs`: 0 differences on a database rebuilt from scratch. Forward check: a row entered through Studio as the scribe exports with link, color, bold, GRx2, yellow and green `?`; an edited vote renders from its fields.
- Format quirks of past rows are in `src/lib/sheet/history.json`, made by `scripts/gen-sheet-history.mjs` from an export with `{}`. Formats only, no data.
- Width 9 is written as 9.01: `exceljs` drops a width of exactly 9, and Excel would fall back to 12.63.
- Compare ignores yellow (§8.5). With Sept 2026 imported as `met`, the local export has no yellow row.
- George has no column: his votes exist only in the J text.
- Vote codes in the go-around are saved while scoring is open only (TASK-56).
- Signed out, `/admin` shows the not-found page with HTTP 200, no admin content. A signed-in non-scribe gets 404. The export route gives 404 to both.
- `open_actions` in Studio still links `/club#meetings`. A hash never reaches the server, so it can't redirect; that form is on `/next`.
Not checked: a browser, phone width, Excel or Google Sheets. Those are step 7.

## D13 Admin tab (ADMIN-TAB-v1-DESIGN.md)
- [x] Header tab for scribes; footer and `/club` links removed
- [x] Sub-nav on `/admin`, `/admin/members`, `/admin/meetings`
- [x] Brand shortens to `SC.` at 480px and under

## D14 Account page (ACCOUNT-PAGE-v1-DESIGN.md)
- [x] `/account` replaces `/club`; the name pill opens it; sign out lives there
- [x] `/account/ai` moved from `/club/ai`
- [x] `/about` holds the club's about text; footer says About
- [x] Old `/club` links redirect
Left out: email. The site can't read it without a Studio change.

## D15 Admin redesign (Claude Design "Soul Crushers admin redesign", direction 2a, `Admin Page.dc.html`)
- [x] One page: Next meeting, Corrections, Members, Corrections log, Export, Settings. Replaces the sub-nav; `/admin/members` and `/admin/meetings` redirect
Left out, because Studio has no support and adding it needs a migration: announcements, polls, Block, New sign-in link, the full change log, usernames.
Vote codes `n/a`, `hbb`, `no vote` can't be set after reveal (TASK-56), so Corrections offers Scored, Missed, Didn't finish.
Hiding the tab is cosmetic and so are the UI locks on self and last admin: Studio doesn't enforce those two yet.
The book page doesn't show the corrected mark yet, so the design's "shows on the book page" copy is left out.

## D16 Meeting form (MEETING-FORM-v1-DESIGN.md)
- [x] Month dropdown as the section header, default next meeting (`src/components/MonthPick.tsx`)
- [x] Worked-out meeting number default (`workedOutNumber` in `admin/page.tsx`)
- [x] Five ballot book pairs in the form (`saveMeetingAdmin`, `ballot` fields)

**As built, 2026-11-06.** Typecheck and `next build` pass. Not run against a Studio: the only configured Studio is the
real one. Check on a local Studio or right after deploy: December from the dropdown saves; October's number shows 191
(depends on how the import numbered Dec 2025); a drafting slate takes five pairs, a cleared row drops its candidate, a
slate in voting is read-only.

## D16 Home shelf (HOME-SHELF-v1-DESIGN.md)
- [x] Books tab removed; `/books` and `/history` redirect to Home's shelf
- [x] Shelves: Every book, the years that fit, Older dropdown
- [x] By date default, By score; Covers and Sheet; club score on every card
- [x] Shelf, sort and view live in the URL, so Back lands on the same shelf
Book pages stay. The rotating hero is gone.

## D17 Next meeting redesign (Claude Design "Next Meeting Directions", 2a and 3a)
- [x] Home, member: warm card, RSVP popup, rank the five
- [x] Home, host: "You're hosting" form, five books with order, Post the five (saves and opens voting)
- [x] `/admin`: same form with month dropdown, host, skip, sheet details
- [x] One five-book control for host and admin; order saved through `added_at`
Differs from the design: ranking doesn't save as you move. Studio's ballot is the top three, cast once, so arrows reorder and "Cast my ranking" submits. Notes moved into Sheet details, because the design has no place for them and the export needs them. Admins who aren't the host see the member card on Home and use `/admin`.
Removed from Home: title color and bold (in Sheet details on `/admin`).

## D18 Admin can edit a posted five
- [x] Studio 068 `redraft_slate(slate)`: scribe only, back to drafting, clears rankings; a picked slate stays
- [x] `/admin` edits the five in any state but picked, with Post the five. Unchanged books leave voting alone

## D19 Faster tabs
- [x] `(club)/loading.tsx`: a tab switches at once, with a light placeholder
- [x] `staleTimes.dynamic = 30`: pages opened in the last 30 seconds come back instantly
- [x] Every action clears remembered pages (`revalidatePath` in `back()`), so your own saves always show
- [x] Redirect-only stubs moved out of `(club)`, so they stay real 307s
Not done, on purpose: the server cache, fewer Home calls, smaller Home data, Home tab without a reload, lazy covers.

## D20 Club roles and every sheet cell
Spec `CLUB-ROLES-v1-DESIGN.md`. Your AI has your rights, enforced by Postgres.
- [x] Admin logins, picked per request (Studio 075)
- [x] Admin data walled from the base logins (Studio 076)
- [x] Hosts edit books only on their planned month
- [x] Last admin and self locks in Studio
- [x] Every sheet cell editable: Original sheet cells under Corrections
- [ ] Shelby's check on a phone, then the exported file
- [ ] Second real admin named and set up before Angel steps down

## D21 Admin months
Spec `ADMIN-MONTHS-v1-DESIGN.md`.
- [x] Tabs: Club and Meetings; Admin opens on Meetings
- [x] One month picker, past and future, no page reload
- [x] One editor per month, scores included; year list below
- [ ] Angel fixes the 2026-10 date on the live site

## D22 Admin months 4c (ADMIN-MONTHS-v1-DESIGN.md, v2)
- [x] Month list with filters, search, year averages, Next meeting
- [x] Whole record on the right, one Save (`saveMonth`): status, columns A–J, evening with co-host, the five, member cells
- [x] Studio 078: admin adds, changes or clears any vote cell; co-host; plain title
- [ ] Run Studio 078 on production
- [ ] Check on the live site, signed in as admin, at phone width
Studio suite (bookclub files 25–34) passes; typecheck and `next build` pass here. Not run against a Studio with 078.

## D23 Add and remove upcoming months (ADMIN-MONTHS-v1-DESIGN.md, v3)
- [x] Next three months by default; "+ Add" shows one more (`?ahead=`)
- [x] − on the furthest month when it's empty; deletes a saved blank month
- [ ] Check on the live site, signed in as admin
Typecheck and `next build` pass. Not run against a Studio.

## D24 Admin 7a and Members 6a (ADMIN-7A-DESIGN.md)
- [x] One Admin page: Members ledger, Meetings, Club; no Save buttons
- [x] Role changes ask first; invite links show and copy again (Studio: invite list returns open links)
- [x] Members 6a: sortable portrait cards, last 12, loved and loathed
- [ ] Check on the live site, signed in as admin, at phone width
Typecheck and `next build` pass. Not rendered: the local site token is revoked, so nothing loads locally.

## D25 Faster signed-in pages
- [x] Home: one Studio batch (ballot close folded in, no separate session check); turnout and AI status run alongside
- [x] Admin: one Studio batch (who, blank months, the month and the rest); sign-ins and invites run alongside
- [x] Admin autosave: no page refresh per save; one refresh when you leave the month, and after Post the five
- [ ] Measure signed in on the live site
Typecheck and `next build` pass. Not measured signed in: the production token can't be pulled.
