# Sheet record v1: the site stores the whole Soul Crushers sheet and exports it to Excel

Status: design, 2026-11-06 (rev 4). Rev 4 corrects the spec against the measured reference; Angel approved it the same day. Covers both repos: `byoaistudio` (Studio) and `bookclub` (site).

## 0. Goal and outcome

Shelby stops keeping the Google Sheet "Soul Crushers History". The site becomes the record.

**Done means:** Angel signs in on the real site on a phone, opens **`/admin`**, taps **Download Excel**, and the file
opened in Excel or Google Sheets looks like Shelby's sheet: same cells, codes, formulas, colors, widths, hidden
columns and frozen header. The only differences are the ones listed in §8.

Three requirements:
1. **Everything on the sheet is stored** in Studio, history included.
2. **The site can produce every kind of sheet data going forward.** Each column has a field and an admin input, so a
   row entered on the site exports like one Shelby typed.
3. **An admin can export** the record to Excel at any time, rebuilt from Studio on each request.

**Reference file:** `bookclub/Soul-Crushers-History.xlsx`, Google Sheets' own Excel download of the live sheet,
2026-11-06. It is the import source and the export target. It replaced an earlier hand-made file of the same name.

**Decisions changed:**
- Design v3.2 §12 said birthdates are never stored. **Reversed**: they're on the sheet, so they're stored, in a
  scribe-only table (§3.2).
- The import (TASK-53) reads Google's **CSV**. It moves to the **.xlsx**, because colors, bold, links and formulas
  aren't in the CSV.
- Scribe-only admin moves from `/club` to **`/admin`** (§6).

---

## 1. What exists today

**Studio (`byoaistudio`)**
- Schema: `migrations/063_bookclub.sql` (tables `byoaistudio_data.bookclub_*`, views in `byoaistudio_bookclub`),
  `065_two_book_month.sql` (slug `2017-06b`), `066_shared_books.sql` (Commons matching). Next free number: **067**.
- Import: `scripts/import-bookclub-sheet.mjs` (TASK-53, done 2026-11-05 from the live sheet's CSV). 138 of 138 club
  scores within 0.05 of the sheet; re-run is a no-op. It writes with `on conflict do nothing`.
- What the import drops or guesses today: birthdays (never read), title color and bold, links, the G cell, author as
  typed (it flips `Robinson, Marilynne` to `Marilynne Robinson`), the exact vote and comment text, the J cell text
  (parsed into votes, then discarded). `n/a`, `---`, `--`, `no vote` write nothing; `hbb` becomes `unfinished`
  (assumed); `?` writes nothing.
- Admin is Studio role `scribe` in `byoaistudio.space_members` (`role`, `member_slug not null`).
  `create-club.mjs` made Shelby the scribe (`shelby-g`).
- Studio rules: work on `main`; pushing `main` deploys db.byoaistudio.com; production migrations and imports are
  Angel's.

**Site (`bookclub`)**
- Scribe-only UI lives inside `src/app/(club)/club/page.tsx` (`rows[1]?.[0]?.role === "scribe"`): settings, roster,
  invites, Commons match review.
- All Studio access goes through `src/lib/studio.ts`; writes are server actions in `src/lib/actions.ts`.
- No spreadsheet library yet.

---

## 2. The reference, measured

**Sheet:** one tab `Books`, used range `A1:AP262`, freeze pane `A5`, default font Arial 10.

**Fixed rows**

| Row | Content | Format |
|---|---|---|
| 1 | `Soul Crushers History`, merged `A1:D1` | 18pt bold |
| 2 | empty | |
| 3 | member headers with birthdays (`Shelby G (4/2/67)`, `Tim D (TBD)`, `Chuck B`); two-column members merged across vote + comment | black fill, white text, height 23.25 |
| 4 | `Date` (merged `A4:B4`), `Book`, `Author`, `Host`, `Score`, `GRx2`, blank, `Notes`, `Voting`, then `vote` / `comments` | black fill, white text |
| 5 | per member: average and count, formulas | pink `EAD1DC`, grey `666666`, `#,##0.0` |

**Row shape (rev 4).** 2014–2026 have 12 rows, December to January. 2013 and earlier list only months with a meeting.
2008 ends with empty NOVEMBER–AUGUST rows, then a loose note in `I244`. June 2017 has two rows. Blank rows after a year
block: 2 for 2021 and later, 1 for 2020 and earlier. The year sits in A on each block's first row, which is November
for 2009 and 2010.

**Fixed columns**

| Col | Header | Width | Holds |
|---|---|---|---|
| A | Date | 8.1 | year on its December row (`2026`), meeting number (`181`), or `x` for skipped; text |
| B | | 16.9 | month, upper case, 12pt bold |
| C | Book | 35.4 | title, blue or red, sometimes bold; 14 `=HYPERLINK(url,title)` + 3 cell links (Goodreads, Google Books), underlined; `-- skipped --` uncolored |
| D | Author | 26.8 | as typed (`Robinson, Marilynne` old, `Alan Furst` new) |
| E | Host | 10.5 | first name |
| F | Score | 8.1 | `=AVERAGE(K{r}:AJ{r})` (138 rows) or `---`; `0.0` |
| G | GRx2 | default | `=3.45*2` (39) or a typed number; `0.0` |
| H | | 2.6 | always empty |
| I | Notes | 44.6 | date, place, food, swaps |
| J | Voting | 44.4, hidden | older-era scores as text for 15 meetings: `Kent=6, Henry=9, Kirk=9.48, JohnF=x`, `*Stephen=6` |

**Member columns** K…AK (sheet order): Matt A, Chuck B, Gordon B, Ballan C, Tim D, Will F, John F, Kirk G, Shelby G,
Stephen H, Tom M, Kent S, Henry S, Mike U, John W. Vote width 9, comment 24–30. Gordon B, John F and Mike U have a
vote column only. Hidden: J–Q, V (John F), AG–AI. AL–AP empty, width 15.1. Note: the import's `M` table already maps
columns from the data, because header names don't sit exactly over their votes.

**Vote-cell text:** `miss` 378, `n/a` 81, `---` 21, `hbb` 19, `?` 12, `no vote` 10. Numbers to 3 decimals.
**Comment cells:** `word: X` 457, reasons (`travelling`, `work`, `sick`, `harvest`, `wedding`…), did-not-finish
variants (`didnt finish`, `did not finish`, `dnf`, `didnt read`), short reviews, scores in comments
(`travel (9.2 / binacle)`).
**Fills:** yellow `FFFF00` on all 42 columns of row 9 (Sept 2026); green `00FF00` on row 25's `?` cells (July 2025), vote and comment. Row 160's seven `?` cells aren't green.
**Typed oddities (rev 4):** E holds `---` ×25, `Stephan`, `JohnW`, `John F`, `Kirk `. F holds `--` ×2, `6ish`, and is blank on rows 148, 160, 175 despite cells. C holds `-- pushed to September --` and `-- pushed to December --`. G holds `n/a`, `--`. `AB37` is `word: anima` with no vote. `M202` is a vote cell on a skipped row.
**Title styles:** blue 159 rows (129 plain, 15 bold, 11 underlined, 4 bold+underlined), red 46 (27, 17, 2
underlined). They don't follow fiction / nonfiction.
**Row 5:** hand-edited ranges that disagree (Matt `K34:K244`, Ballan `P76:P87`, a count from `R20`).

---

## 3. Studio changes (`byoaistudio`)

### 3.1 Migration `067_sheet_record.sql`

```sql
-- Members: the sheet's header label
alter table byoaistudio_data.bookclub_members add column sheet_label text;      -- 'Shelby G'; null → name

-- Books: link and the author as the sheet spells it
alter table byoaistudio_data.bookclub_books
  add column link_url text check (link_url is null or link_url ~ '^https?://'),
  add column sheet_author text;                                                 -- null → author

-- Meetings: title style, the --- score, and the history-only cells
alter table byoaistudio_data.bookclub_meetings
  add column title_color text not null default 'blue' check (title_color in ('blue','red')),
  add column title_bold boolean not null default false,
  add column no_score boolean not null default false,                           -- F shows '---'
  add column sheet_number text,                                                 -- A as typed when not the number ('x', '2026')
  add column sheet_grx2 text,                                                   -- G as typed: '=3.45*2' or '6.9'
  add column sheet_voting text,                                                 -- J as typed
  add column sheet_host text,                                                   -- E as typed ('---', 'Stephan', 'JohnW')
  add column sheet_score text,                                                  -- F as typed when not a formula or '---'; '' = blank
  add column sheet_title text,                                                  -- C as typed on a skipped row when not '-- skipped --'
  add column sheet_cells jsonb,                                                 -- cells with no real field: {"kirk-g.vote":"?"}
  add column sheet_history boolean not null default false;                      -- imported row: no computed '?'

-- Votes: the code Shelby used, and the two cells as typed
alter table byoaistudio_data.bookclub_votes
  add column sheet_code text check (sheet_code is null or sheet_code in ('miss','---','n/a','hbb','no vote')),
  add column sheet_vote text, add column sheet_comment text;

-- Birthdays: scribe only, like meeting_private
create table byoaistudio_data.bookclub_member_private (
  space_id bigint not null default byoaistudio.current_space(),
  member text not null,
  birthday date, birthday_text text,                                            -- 'TBD', 'tbd' when there's no date
  primary key (space_id, member),
  foreign key (space_id, member) references byoaistudio_data.bookclub_members (space_id, slug) on delete cascade
);
```

- **`sheet_cells` is only for cells that can't go in a real field**: the `?` cells and `AB37`. The import report lists
  each one.
- **Votes for every cell.** `attendance` stays as is. Cells that wrote nothing today (`n/a`, `---`, `no vote`) now
  get a row: `attendance = 'out'` for `n/a` and `hbb`, `'missed'` for `---` and `no vote`, plus `sheet_code`. Owed
  `?` stays computed (no row). The `bookclub_votes_no_score` check already allows these (no score).
  **Counting doesn't change:** `counted_votes` only counts `voted` / `partial`, so club scores stay 138/138.
  **Rows coded `---`, `no vote` or `n/a` stay off pages and stats:** `member_stats`, `attendance` and `meeting_votes`
  filter them out, so misses, the heat grid and `/stats` read as they did before 067.
  `hbb` moves from `unfinished` to `out` only if Shelby confirms (§10); until then keep `unfinished`.
- **`sheet_*` columns are history.** Written only under `is_maint()` (the import). `tg_votes` gets one line: on
  update by a non-maintenance caller, `new.sheet_vote := null; new.sheet_comment := null;` so an edited vote renders
  from its fields. Same idea in `tg_meetings`: `sheet_grx2` and `sheet_title` when `book` changes, `sheet_host` when
  `host` changes, `sheet_number` when `number` changes, `sheet_score` when `no_score` changes. `sheet_vote = ''` means
  the cell was blank (a vote that came only from the J text).
- **RLS.** `bookclub_member_private`: select and write `is_scribe()` or `is_maint()`; never `is_ai()`. Only `sheet_members` (read) and
  `member_birthdays` (write) expose it (§3.3). The new columns on existing tables follow their table's policies;
  they are **left out of the existing public views** (`members`, `books`, `meetings`, `votes`), so pages and AI keys
  don't see them. They're read through the `sheet_*` views and written through the scribe-only views in §3.3.
- **`enter_votes`** accepts `sheet_code` in each row. Scribes can't insert votes on a revealed meeting (`own` policy),
  so a new code is set while scoring is open; an existing row's code can't change after reveal except through it.
- **Log and undo.** Add `log_change` triggers on `bookclub_member_private` like its siblings.
- **Triggers' messages** (user-facing copy, shown verbatim): writing a birthday as a non-scribe →
  "Only an admin can change birthdays."; a bad link → "Links start with http:// or https://."

### 3.2 New member for Angel
`space_members.member_slug` is not null, so admin needs a slug. Add Angel as `bookclub_members ('angel', 'Angel',
status 'guest', note 'site operator')` and a `space_members` row `(soul-crushers, angel's account, 'scribe',
'angel')`. A guest with no votes never appears in the export (§5.1) or the stats. Script:
`scripts/add-scribe.mjs <handle> <account-email> <slug> "<name>"`, same shape as `create-club.mjs`, safe to run
twice. **Check while building:** pages that list `members` show guests; if Angel would appear on `/members`, filter
`note = 'site operator'` out there, or add status `'staff'` instead (decide in the task, write it under As built).

### 3.3 Views for the export
All `security_invoker`, all limited by RLS to what the caller sees:

```sql
create view sheet_members as                                        -- scribe only
  select m.slug, m.name, coalesce(m.sheet_label, m.name) as label, m.status, p.birthday, p.birthday_text
  from bookclub_members m left join bookclub_member_private p on p.member = m.slug
  where (is_scribe() and not is_ai()) or is_maint();

create view sheet_meetings as                                       -- scribe only
  select x.slug, x.number, x.month, x.status, x.book, b.title, coalesce(b.sheet_author, b.author) as author,
         b.link_url, b.goodreads_avg, h.name as host_name, x.notes, x.title_color, x.title_bold, x.no_score,
         x.sheet_number, x.sheet_grx2, x.sheet_voting, x.sheet_host, x.sheet_score, x.sheet_title, x.sheet_cells,
         x.sheet_history, x.scoring, x.continues
  from bookclub_meetings x left join bookclub_books b on b.slug = x.book left join bookclub_members h on h.slug = x.host
  where (is_scribe() and not is_ai()) or is_maint();

create view sheet_votes as                                          -- scribe only; RLS on votes still hides unrevealed
  select meeting, member, attendance, score, word, miss_reason, comment, sheet_code, sheet_vote, sheet_comment
  from bookclub_votes where (is_scribe() and not is_ai()) or is_maint();
```
Add them to the guard's allowed names the way 063's views are, and to the site-token app's view list (TASK-52).
**Write views (rev 4),** scribe only, single-table so updatable: `member_sheet (slug, sheet_label)`,
`member_birthdays (member, birthday, birthday_text)`, `book_sheet (slug, link_url, sheet_author)`,
`meeting_sheet (slug, title_color, title_bold, no_score)`. All `sheet_*` objects are refused to AI keys through
`app_objects`.

### 3.4 Import changes (`scripts/import-bookclub-sheet.mjs`)
- **Input:** `.xlsx` (add `exceljs` to Studio's dev dependencies). Keep the CSV path working for one release behind
  `--csv`, then remove.
- **Reads per cell:** value, formula text, font color, bold, underline, hyperlink. Formulas: `HYPERLINK(url,title)`
  → `link_url` + title; F `AVERAGE` → ignored (computed); G → `sheet_grx2`; row 5 → ignored (recomputed).
- **Writes everything in §3.1:** `sheet_label` and birthdays from row 3 (`Shelby G (4/2/67)` → label `Shelby G`,
  birthday 1967-04-02; `(TBD)` → `birthday_text`); `title_color` / `title_bold`; `sheet_author` (the flipped name
  stays in `author`); `no_score` for `---` in F; `sheet_number` for A when not the meeting number; `sheet_voting`;
  per vote `sheet_code`, `sheet_vote`, `sheet_comment`; new rows for `n/a`, `---`, `no vote`.
- **Re-runnable on production data.** Today's `on conflict do nothing` can't fill new columns. New flag
  **`--sheet`**: for existing rows, `update … set <only the new columns>` where they are null; never touches the
  fields the site may have changed since (scores, words, hosts, notes). Each batch one change, actor `import`, so
  it's undoable. Re-running is still a no-op.
- **Cell ledger.** Every non-empty cell of `A1:AP262` is marked with what consumed it. The report ends with
  `unaccounted: 0` or the list (address, value). Accept requires 0.
- **Report additions:** birthdays found, title styles by color, links found, vote codes by kind, J cells stored.

### 3.5 Studio tests
New `tests/30-bookclub-sheet.test.ts`, using `tests/bookclub-helpers.ts`:
- Member, public, host and AI key can't read `bookclub_member_private`, `sheet_members`, `sheet_meetings`,
  `sheet_votes`; scribe can.
- Scribe writes a birthday; member gets "Only an admin can change birthdays."
- Editing an imported vote as scribe clears `sheet_vote` / `sheet_comment`; maintenance doesn't.
- `n/a` / `---` / `no vote` rows don't change `book_scores` or `member_stats`.
- In `together` mode, `sheet_votes` hides unrevealed rows from the scribe exactly as `votes` does.
- Import on a fixture `.xlsx` (a few rows cut from the reference, in `fixtures/`): ledger 0, re-run no-op, `--sheet`
  fills new columns on an already-imported space without changing a site-edited score.

**Studio task:** `TASK-56-sheet-record.md` (migration, views, import, add-scribe, tests).

---

## 4. Going forward: admin inputs on the site

Every stored field gets an input, scribe only, on `/admin` (§6) or where the admin already edits that thing.

| Field | Where |
|---|---|
| Member label, birthday | `/admin/members` member form |
| Book link, sheet author, Goodreads rating | book page "Edit details" (existing) for scribes |
| Title color, bold | meeting form on `/admin/meetings` and the Home in-place edit |
| `no_score` | meeting form checkbox "No score this month" |
| Meeting number | meeting form; default previous + 1 |
| Vote code | score entry: the status dropdown gains `n/a`, `hbb`, `no vote` labels (scribe only); `miss` and `?` stay as today |
| Notes | existing |

Server actions in `src/lib/actions.ts` as usual: one request = one change = one Undo; Studio's refusals shown
verbatim.

---

## 5. The export (site)

### 5.1 Layout constant `src/lib/sheet/layout.ts`
Built once from the reference and checked in: column letters, widths, hidden flags, fixed headers, row 3 height,
fonts, fills, number formats, freeze, merges, and the member column list in sheet order, with the import's column
map: `{ member: 'john-f', comment: false, hidden: true }`.
- **Which members get columns:** the list, plus any member who has at least one vote and isn't in the list,
  appended alphabetically by last name with a vote + comment pair at standard widths. Guests and Angel with no votes
  never get a column. F's and row 5's ranges widen to the last member column.
- Alumni columns are hidden; J and V are always hidden, as in the reference.

### 5.2 Rows
- Years newest first. A year from 2014 on with at least one meeting gets 12 rows, December to January; months without
  a meeting show only the month name. This gives 2026's empty December and November and a new 2027 block. 2013 and
  earlier list only months with a meeting; `layout.ts` pins 2008's empty rows and the `I244` note.
- Year label in A on the year block's first row, 18pt bold. Blank rows after a block: 2 for 2021 and later, else 1.
- A: `sheet_number` if set, else `number` as text, `x` when skipped. Numbers are 10pt. Skipped: `sheet_title` or
  `-- skipped --` in C.
- Two-book month (`2017-06b`) and two-month books (`continues`) as rows in sheet order.

### 5.3 Cells
- C: title in `title_color`, bold per `title_bold`; with `link_url`: `=HYPERLINK("url","title")`, underlined.
- D: author (already `sheet_author` first). E: `sheet_host`, else host first name. I: notes.
- F: `sheet_score` if set (`''` is blank); else `---` if `no_score`; else `=AVERAGE(K{r}:{last}{r})` when the row has a
  vote. Cached results on every formula.
- G: `sheet_grx2` if set, else `=ROUND(goodreads_avg,2)*2`, else empty.
- J: `sheet_voting`.
- Votes:

| Data | vote cell | comment cell |
|---|---|---|
| `sheet_vote` / `sheet_comment` set (`''` = blank) | as typed | as typed |
| no row, `sheet_cells` has it | as typed, green if the reference's row was | as typed |
| no row, `sheet_history` | empty | empty |
| `voted` / `partial` | score (number) | `word: {word}` then comment |
| `missed` / `out` | `sheet_code` or `miss` | `miss_reason` |
| `unfinished` | score or `dnf` | comment |
| no row, met, member active | `?`, green | empty |
| row hidden by RLS | `?`, green | empty |
| not in the club yet | empty | empty |

- Row 3: `label` + ` (M/D/YY)` from `birthday`, or ` (TBD)` from `birthday_text`.
- Row 5: `=SUM(c6:cN)/COUNTIF(c6:cN,">0")` and `=COUNTIF(c6:cN,">0")` over the full body for every member.
- Yellow on all 42 columns of the `next_meeting` row.
- `layout.ts` pins historic format exceptions (F, G and vote number formats, odd A fonts, `I` alignment), generated
  from the reference and keyed by meeting.

### 5.4 Files

| Piece | Where |
|---|---|
| `exceljs` | `package.json` dependency (server only) |
| Layout | `src/lib/sheet/layout.ts` |
| Renderer `renderSheet(record): Workbook` | `src/lib/sheet/render.ts`, pure |
| Loader | `src/lib/sheet/load.ts`: one `sql()` batch over `club`, `sheet_members`, `sheet_meetings`, `sheet_votes`, `next_meeting` |
| Route | `src/app/api/export/sheet/route.ts` `GET`: viewer must be a member with role `scribe` (`me` view), else 404; streams the file, `Content-Disposition: attachment; filename="Soul-Crushers-History-YYYY-MM-DD.xlsx"` (club time zone) |
| Card | `/admin` "Club history spreadsheet": a plain link to the route, no form, nothing to undo |

About 250 × 40 cells, in memory, well under a second. No cache: always current.

---

## 6. `/admin` (site)

- New route group page `src/app/(club)/admin/page.tsx`, scribe only (others get 404 via `notFound()`).
- Moves from `/club`: settings, roster and invites, Commons match review. `/club` keeps what members use (about the
  club, `/club/ai`). Links into the old `/club` sections redirect to `/admin`.
- Sub-pages: `/admin/members` (roster, invites, label, birthday), `/admin/meetings` (meeting form fields from §4).
  The export card sits on `/admin`.
- Footer shows "Admin" to scribes only; the header admin badge from Shelby's list can follow later.
- Styles: existing `.sc-*` classes.

---

## 7. The comparison test (site) `scripts/compare-sheet.mjs`

`node scripts/compare-sheet.mjs <reference.xlsx> <export.xlsx>` reads both with `exceljs` and lists every
difference: cell value or formula (normalized for case, spaces, `$`); merges; freeze; widths (±0.5); hidden columns;
row 3 height; fills on every cell; and on non-empty cells font name, size, bold, underline, color, number format,
alignment. An unset font name or size equals the default Arial 10. It skips §8's items. Exit 0 means match.

Run: local Studio, import the reference, sign in as a local scribe, `GET /api/export/sheet`, compare. Run after every
renderer change.

---

## 8. Differences from the reference, on purpose
1. Row 5 uses one range per member, the same for everyone. Values change for most members.
2. Cell links become `HYPERLINK` formulas (same look).
3. Empty trailing rows past the last year block aren't written.
4. Underline follows `link_url`. Any title underlined without a link is listed by the import.
5. Yellow follows `next_meeting`, not a hand-picked row. With Sept 2026 imported as `met`, row 9 isn't yellow unless a
   later planned meeting makes another row yellow.
6. Formatting on empty cells isn't reproduced, fills excepted.

Anything else is a bug.

---

## 9. Build order and who does what

| # | Step | Repo | Who | Accept |
|---|---|---|---|---|
| 1 | Migration 067, views, triggers, tests | byoaistudio | Claude | `npm test` green incl. `30-bookclub-sheet` |
| 2 | Import: xlsx, every cell, `--sheet`, ledger | byoaistudio | Claude | local dry run on the reference: `unaccounted: 0`; 138/138 scores unchanged; re-run no-op |
| 3 | `add-scribe.mjs` | byoaistudio | Claude | local: Angel binds as scribe, isn't on `/members` |
| 4 | `/admin` page, moves from `/club`, admin inputs (§4) | bookclub | Claude | typecheck, build; local signed-in check |
| 5 | Export: layout, renderer, route, card, compare script | bookclub | Claude | `compare-sheet.mjs` exit 0 against local import |
| 6 | Production: migrate, `import --sheet`, add-scribe for Angel, push both repos | both | **Angel** | import report `unaccounted: 0` on production |
| 7 | Real check: phone, sign in, `/admin`, download, open in Excel and Google Sheets | | **Angel** | looks like the sheet; compare script on the downloaded file exits 0 |

Steps 1–3 and 4–5 can run in parallel; 5 needs 1–2 locally for real data.

**Site task:** `tasks/README.md` gets D12 "Sheet record and Excel export" pointing here.

---

## 10. Questions for Shelby (Sunday)

Built with the current guesses; each answer changes one row of §3.1 or one input.
1. What do `hbb`, `no vote` and `n/a` mean in a vote cell? (Today: `hbb` unfinished, `n/a` out, `no vote` missed.)
2. What does `*` mean in the Voting column?
3. What do red titles and bold titles mean? (Today: stored as typed, chosen by hand.)
4. Who should see birthdays? (Today: admins and the export only.)
5. GRx2 for new books: Goodreads rating × 2 from the site's book data. Is that what he does by hand?
6. `AB37` holds `word: anima` with no vote (Sept 2024, Stephen H). Stored as typed, no score. Is a score missing?
7. Did Sept 2026 meet? (Today: imported as `met`, status left as it is.)
