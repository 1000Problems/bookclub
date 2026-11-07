# Club roles v1: your AI has your rights, enforced by the database

Status: built. Studio migrations 075 and 076, site Sheet cells panels.

## 0. Goal

- The database is yours, as in Reading. Your AI gets full SQL. No action lists, no MCP.
- A member and their AI have the same rights. Admin rights come only from the account.
- The wall is physical: a non-admin runs as a Postgres role with no grant on admin data.
- Scenario: the spreadsheet is retired. Shelby kept it and now uses the site. **An admin must be able to edit everything that was on the sheet.**

## 1. Who gets what

| Tier | Examples | Member and their AI | Admin and their AI |
|---|---|---|---|
| Yours | your RSVP, score, word, posts, prefs | full SQL | full SQL |
| Club, public record | meetings, books, votes as shown, the five | read; host writes their meeting and slate | read and write |
| Admin | settings, roster details, sheet record, birthdays, hidden posts | no access | read and write |
| Commons | book and author facts | read | read |
| Ballots | individual choices | no access | no access |

Decided: admins and their AIs see all sheet data, birthdays included. Individual ballots stay closed to everyone, because they were never on the sheet's terms and admins can't read them on the site.

## 2. The logins

- One database. No second copy.
- Two extra logins: `byoaistudio_site_admin` and `byoaistudio_space_admin`, with their own passwords and connection pools.
- `withSpace` looks up the member's role and picks the pool. Non-admins stay on `byoaistudio_site` and `byoaistudio_space`.
- The base logins have no grant on admin data, so Postgres refuses it however the SQL is written.
- Studio's rule stands: login roles are members of nothing, so a connection can't switch to admin. That's why this uses logins, not `set role`.
- A role change applies on the next request.
- New club tables must grant the admin logins as well as the base ones.

Stays a row check:
- "This row is mine": row-level security on `member = me()`.
- "Host of this meeting": a fact on the meeting row, so hosting starts and ends with the month. There is no host role or host database.

## 3. Rules that move into the database

- Can't remove the last admin: a trigger on `space_members`, so it holds on every path.
- Can't change your own role or remove yourself: Studio's `/club/members` routes. AI keys can't reach `space_members`, so role changes stay on the site.

## 4. Books

- Admins edit any book.
- A host can add books while they host a planned meeting.
- A host can edit a book on the five or booked for a planned meeting they host, unless the club has already read it.
- Everyone else, and their AIs: read only.

Write-ups were not on the sheet, so they are out of scope for now and unchanged.

## 5. The sheet: what an admin can edit

| Sheet data | Stored in | Editable on the site today |
|---|---|---|
| Book title, author | `books` | yes |
| Host | `meetings.host` | yes |
| Notes | `meetings.notes` | yes |
| Date, place, food | `meetings` | yes |
| Meeting number | `meetings.number` | yes |
| Title color, bold, no score | `meetings` | yes |
| Book link, sheet author, Goodreads | `books` | yes |
| Member label, birthday | `members`, `member_private` | yes |
| Scores, words, comments, attendance | `votes` | yes |
| Sheet vote codes | `votes.sheet_code` | yes, on score entry |
| GRx2 as typed | `meetings.sheet_grx2` | yes, Original sheet cells |
| Older text scores (hidden Voting column) | `meetings.sheet_voting` | yes, Original sheet cells |
| Raw number, host, score, title cells | `meetings.sheet_number`, `sheet_host`, `sheet_score`, `sheet_title` | yes, Original sheet cells |
| Other kept cells | `meetings.sheet_cells` | yes, Original sheet cells |
| Raw vote and comment cells | `votes.sheet_vote`, `sheet_comment` | yes, Original sheet cells |

The export prefers an original cell over the site's value. Editing the normal field already cleared most of them (Studio 067). 075 adds the two that were missing: a vote change clears the month's typed score, and a new Goodreads rating clears the typed GRx2. An admin can also edit or blank any original cell directly, in "Original sheet cells" under Corrections.

## 6. Launch steps

- Both real admins are set up before Angel gives up the role. The last-admin rule refuses it otherwise.
- Shelby's acceptance test, on a phone: edit each row of §5, then check it in the exported file.

## 7. Open

- Who is the second real admin?
