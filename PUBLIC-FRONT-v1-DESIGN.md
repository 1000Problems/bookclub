# Public front, members behind sign-in (v1)

Angel, 2026-11-07. Site change only. No change to Studio, RLS or the data.

## What a visitor sees

| Signed out | Signed in |
|---|---|
| Header tabs: **Home** only, plus Sign in | Home · Members · Bring Your Own AI · Admin (admins only) |
| Home, book pages `/m/…`, author pages, footer pages (Talk, Stats, Next book, About) | Everything |
| Member names as plain text, no link | Names link to `/members/<slug>` |
| `/members` and `/members/<slug>`: a "Sign in to see members" card | The pages as today |
| Home stats line: "N members" stays, as plain text | Links to `/members` |

## Rules

1. Hiding is enforced on the page, not only in the nav. Typing `/members/kent-s` while signed out shows the sign-in card.
2. One helper, `Who` in `src/lib/page.tsx`, decides link or text from `signedIn`. Every member link on a public page uses it.
3. Named scores stay public (decided). A signed-out visitor still sees who scored what on a book page. This change removes the click-through to a person, not the data.
4. `/ai`, `/admin`, `/account` and `/ballot` already need sign-in. Unchanged.

## Where member links live on public pages

- Home: the word cards under the last meeting; "N members" in the stats line.
- Book page `/m/<slug>`: "hosted by"; the score rows.
- Author page: "Who likes them".

## Acceptance

- A1 Signed out on a phone: header shows Home and Sign in only.
- A2 Signed out: no member name on Home, a book page or an author page is a link. "N members" shows, not a link.
- A3 Signed out: `/members` and `/members/<slug>` show the sign-in card, no names.
- A4 Signed in: every tab and every member link works as before.
