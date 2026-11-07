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
- Right: ‹ older and newer ›, row number and status, score from the votes. Status: Met, Next, Planned, Skipped, No score. Next saves as planned.
- Sheet columns A #, B date, C book (a new title points the month at that book), D author, E host, F score (read only), G GR×2, title format Plain, Blue or Red and bold, link, I notes, J voting.
- The evening: time, where, food, bring, co-host.
- The five: editable for any month unless a book was picked from it. Post only before the month meets.
- Member columns: every active member, plus retired members with an entry; the rest open with one button. Vote is a number, miss, n/a, hbb, ---, no vote or ?, with the word or comment. An admin adds, changes or clears any cell for any month, as in Excel (Studio 078 `sheet_set_votes`). A score needs no word here; a comment over 40 characters is kept as a comment.
- Edited cells turn yellow; the bar counts unsaved changes; Save or Discard.
- Original sheet cells stay below.

Differs from 4c: unsaved edits don't follow you to another month, so the list has no "edited" tag. Host is a roster dropdown, not free text.

## v3: adding and removing upcoming months
- The list shows the next three months from today by default, plus every month that has data.
- "+ Add <month>" at the top shows one more month. No limit. The count lives in the address (`?ahead=`), so a fresh visit is back to three.
- The furthest month gets a − only when it holds nothing: no book, host, date, place, food, bring, co-host, notes, five, votes or sheet cells. A number alone doesn't count.
- − on a month never saved just hides it. − on a saved blank month deletes it (`deleteEmptyMonth`, which checks emptiness in the same SQL, so a month with data can't be deleted). Undo works.
- Only the furthest month can be removed, so the list never has a gap.
