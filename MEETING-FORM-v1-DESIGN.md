# Meeting form v1: pick any month, five ballot books, a worked-out meeting number

Status: design, 2026-11-06. Site only (`bookclub`), no Studio change. Changes the Next meeting section of `/admin`.

## Scenario
1. Angel opens `/admin`. The section header is **Meeting · [October 2026 · Kirk G ▾]**. It defaults to the next
   meeting. Kirk has filled everything in.
2. Angel opens the dropdown and picks **December 2026 · not set up**. The form loads for December.
3. He sets the host and place ("at Angel's"), saves. December now exists as a planned meeting.
4. When October and November are past, Home shows December: "date not set · at Angel's". The host can fill in time,
   place and what to bring himself (hosts already can).

## Month dropdown
- Replaces "Set up a later month" (a typed month field that complained "Please fill out this field").
- Lists the next meeting's month, then every month up to 12 months past it, plus any later planned month that exists.
- Each option shows its state: `December 2026 · Kirk G`, `· not set up`, `· skipped`, `· planned`.
- Choosing one reloads the section for that month (`?m=YYYY-MM`). Without JavaScript, an **Open** button does it.
- A month that doesn't exist is created when saved, as today.

## Meeting number
From the sheet: each month the club meets gets the previous number + 1. Skipped months get `x` and use no number
(Nov 2024 `x`, Oct 2024 169, the hidden December 170, Jan 2025 171). December's number is never shown because the
year label sits in that cell. Shelby stopped numbering in 2026, and Nov 2025 shows 181 although it was skipped (a slip).

Default when the month has no number and isn't skipped: the latest earlier **non-skipped** meeting with a number, plus
the count of non-skipped meetings after it up to and including this month. Oct 2025 = 180, so October 2026 = 191.
The field is pre-filled and editable, with the note "Worked out from the last numbered meeting." Past months aren't
backfilled: 2026's blank numbers stay blank unless an admin types one.

## Ballot books
- Five rows of **Book title / Author** in the form, replacing "The books on the ballot are set on Next book".
- They are the slate for this month's meeting (`slates.at_meeting = month`): the books people rank at this meeting.
- Saving creates the slate if needed, reuses a book with the same title, creates new books, adds new candidates and
  removes ones that were cleared, in the same change as the meeting.
- Once voting has opened the five show read-only with the ballot's state and a link to `/next`.
- Empty rows are fine; fewer than five is allowed while drafting.

## Accept
- [ ] Dropdown defaults to the next meeting; picking December loads December; saving creates it
- [ ] No "Please fill out this field" anywhere in the section
- [ ] October 2026's number pre-fills as 191; a skipped month shows no default
- [ ] Five title/author pairs save into the slate; clearing a row removes that candidate; a slate in voting is read-only
- [ ] Typecheck and build pass
