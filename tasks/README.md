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
