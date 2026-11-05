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
