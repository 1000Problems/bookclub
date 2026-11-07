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
