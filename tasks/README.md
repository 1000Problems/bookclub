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
