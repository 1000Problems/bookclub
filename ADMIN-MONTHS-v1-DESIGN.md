# Admin months v1: edit any month like a row in the sheet

Status: built.

## Why
Admin had two month pickers, one for the future and one for past scores. Each reloaded the page, and a past date couldn't be changed at all. Shelby kept the sheet by finding a row and editing it. Admin should work the same way.

## Tabs
`/admin` opens on Meetings. Order: Club, Meetings.

- **Club** (`/admin/club`): everything not tied to a month. Members, settings and book matching, export, score corrections.
- **Meetings** (`/admin`): one editor for every month.

## Meetings
- `<input type="month">`. Safari on a Mac and Firefox show a text box; half-typed values are ignored.
- Opens on the next meeting. `?m=` keeps the month after a save.
- Range: first meeting to three months past the last month with data.
- Changing the month uses client navigation: no full page reload.
- A month with no meeting opens blank, and Save creates it.
- One Save for date, host, place, food, bring, notes, skip, sheet details and, unless the month is past, the five.
- Below: Original sheet cells, then scores and words, then that year's months. A two-book month (`2017-06b`) is opened from the year list.

Loads one month plus that year's list, so a switch doesn't load the whole history.

## Not in v1
Search. Direct typing in cells. A month's change history.

## v2: Claude Design 4c, "Rows and record, all of it editable"
Source: `Book club admin redesign.zip`, `Admin Meetings.dc.html`, section 4c.

- Left: every month, newest first, grouped by year with "N scored · avg". Filters All, Needs filling in, Upcoming; search by book, author or host; Next meeting button. Empty months up to three past the last one show as "Not set up yet".
- Needs filling in: met in the last 12 months, not "no score", missing a book or a score.
- Right: ‹ older and newer ›, row number and status, score from the votes. Status: Met, Planned, Skipped, No score (Next is shown, not set).
- Sheet columns A #, B date and time, C book (typing a new title points the month at that book), D author, E host, F score (read only), G Goodreads rating, title colour and bold, link, I notes, J voting.
- The evening: where, food, bring. The five: editable until the month has met or a book is picked.
- Member columns: vote (number, miss, n/a, hbb, ---, no vote) and word or comment. Only changed rows are sent.
- One Save for all of it (`saveMonth`). Original sheet cells stay below.

Left out:
- Co-host: Studio has no field.
- Plain title colour: Studio allows blue or red only.
- New vote rows for a month that has met: Studio lets a scribe update a vote but not insert one. Those members show "No entry" and the go-around link.
- `?` as a vote: no sheet code for it.
