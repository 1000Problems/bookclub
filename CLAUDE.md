# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

We are building the Soul Crushers book club page (`bookclub.hadmoney.com`). It is not a generic book club product: no
creating clubs, no club list, no second club. Don't add multi-club generality. One club, served from the root. A Next.js 16 / React 19 /
Tailwind 4 app with no database of its own: all data lives in BYOAI Studio (`db.byoaistudio.com`), sibling repo
`../byoaistudio`. Schema, migrations and auth changes belong there (`byoaistudio/tasks/TASK-43…54`).

## Build to Shelby's experience

The top of `BOOK-CLUB-v3.2-DESIGN.md` lists Shelby's requirements from the 2026-11-03 call. They outrank the scenarios. Don't
attribute our technical choices (Borda, secrecy rules, Studio, no MCP) to Shelby.

- Decided: anybody can become a member, and named scores stay public. Don't reopen these.
- The real data is `Soul-Crushers-History.xlsx`, the latest record we have. Never invent schedule data or show test data.
- Everything must work with no AI. No action sends anyone to paste into an AI.
- A passing build is not evidence. Readiness means showing the gate on the real site on a phone: next meeting, books and
  history, front-page chat, taking part after sign-in, score and word, ranking five books.
- The look comes from Claude Design's "Soul Crushers Site v2" (D9 in `tasks/README.md`). Styles are the `.sc-*` classes in `src/app/globals.css`.

## Commands

```sh
npm run dev         # next dev on port 3100
npm run build
npm run start       # next start on port 3100
npx tsc --noEmit    # typecheck
```

There is no lint script and no test suite yet. E2E Playwright specs (`e2e/`) are planned but not started.

Copy `.env.example` to `.env.local`. It sets `STUDIO_URL`, `SITE_URL` and `BYOAI_SITE_TOKEN`. `SITE_URL` is required by
the auth routes, and `/api/changes` reads `STUDIO_URL` with no fallback. Full behaviour needs a reachable Studio.

## Where the spec lives

- `BOOK-CLUB-v3.2-DESIGN.md` is the current design; Shelby's requirements come first, then §2.00. It is large, so read by section:
  `## Scenarios` (SC1–SC6, with Accept lists), §4.4 (per-card home queries), §5 (data model, RLS, function contracts),
  Appendix A (seed fixture), Appendix B (site → Studio call contract). `MUST` means acceptance criteria.
- Older `BOOK-CLUB-v*-DESIGN.md` files are prior art. The v1 doc still holds import detail and the stats list.
- `tasks/README.md` tracks build status per step (D1–D8) and what is still missing.

## Architecture

**Every read and write is SQL sent to Studio from the server.** `src/lib/studio.ts` is the only gateway. The browser
never talks to Studio; `/api/changes` forwards its polling. `BYOAI_SITE_TOKEN` stays server-side.

- **Viewer** (`src/lib/viewer.ts`): `member` if the `bc_session` and `bc_club` cookies match the club, otherwise `public`.
- **Two auth paths in `sql()`**: members send `x-site` + `x-session`. Public requests send the site token + `x-public-space`
  and are cached in process for 60 s per handle and batch. Writes require a member.
- **Each `sql()` call is one transaction.** Statements can't pass results to each other, so use subqueries or lateral
  joins (§4.4). Permissions are enforced by Studio's RLS, not by this app.
- **SQL uses bare names.** Studio's guard refuses schema-qualified functions, and tenancy is Studio's hidden `space_id`:
  no `club_id` exists. Studio's views use `club_now()`, a clock tests can override (§5.0). Physical tables and the
  `byoaistudio_bookclub` schema are described in design §0.

**Reads**: pages under `src/app/(club)` call `load()` from `src/lib/page.tsx` with a function of the viewer returning
statements, usually one batch per page. `rows === null` means Studio returned 403 (private or missing club), and both
show the same card (SC6).

**Writes**: server actions in `src/lib/actions.ts`, submitted by plain forms. `run()` sends statements and `call()` hits
Studio REST paths. Both redirect to the form's hidden `back` value with `?undo=<change>` or `?e=<message>`, and `Notice`
renders those. One request = one change = one Undo. Forms need the `Hidden` fields (`handle`, `back`). Studio's refusal
messages are shown verbatim, so they are user-facing copy.

**Freshness**: `src/components/Fresh.tsx` polls `/api/changes` every 10 s while visible, then calls `router.refresh()`.

**Routing**: `CLUB` in `src/lib/club.ts` fixes the club. `base()` in `page.tsx` returns `""` and is a leftover from
`/c/[handle]`, which is gone. Sign-in is PKCE against Studio (`/auth/signin` → `/auth/callback`); `state=join` is the
invite flow, which exchanges a one-time code using the site token.

**Record pages** (home, books, book, author, members) load the whole record through `RECORD` and `shape()` in
`src/lib/record.ts`. Covers, descriptions, author photos, bios and news come from Studio's Commons through the club views (`book_cards`, `meeting_cards`, `authors`, `author_news`; design `SHARED-BOOKS-v1-DESIGN.md`). Author slugs come from Studio (`book_authors`), never from JS. No browser lookups.

**Styling**: Reading's light skin. Tokens and classes are in `src/app/globals.css`. The `@/` alias maps to `src/`.
