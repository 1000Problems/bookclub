# Club polls v1

Source: Claude Design "Book club polls" (`Polls.dc.html`): 8a Home, 8b Admin. Styled to `DESIGN-LANGUAGE.md` (DL4).

## Home (8a)
- The poll card replaces "Still to score", under the chat. Members only; signed out, nothing shows.
- Before you vote: the question and one button per answer. "Results show after you vote" (or "when the poll closes").
- After you vote: one row per answer with a bar, percent and count. Your answer has a dark ring and a "your vote" tag;
  tap another answer to change while it's open. Under it: faces and first names of who voted, or "Secret ballot".
- Closed: results for everyone, the winner tagged "won". It stays on Home until the next poll is posted.

## Admin (8b), first in the Club section
- **New poll**: question, 2–6 answers (× to remove, + Add an answer, presets Yes / No, Yes / No / Maybe, Pick a date),
  Closes (At the meeting = when the next meeting starts; In a week), Results show (After voting; When it closes),
  Secret ballot. The draft is kept on this device as you type. "Post and close the current poll" or "Post to Home".
- **Live on Home**: tallies, every active member with their answer ("voted" on a secret ballot, "not yet"), Close now
  or Reopen.
- **Past polls**: month, question, counts, a stacked bar and the winner.

## Studio (migration 079, `byoaistudio`)
Tables `bookclub_polls` and `bookclub_poll_votes`, reached only through definer functions:
`poll_live()`, `poll_vote(poll, answer)` (blank takes the vote back), `poll_post(question, options, anon, reveal, closes)`,
`poll_close(poll)`, `poll_reopen(poll)`, `poll_list()`, `poll_voters(poll)`. Admins post, close and reopen; active
members vote for themselves while a poll is open; counts stay hidden until you've voted (or until it closes); a
secret ballot never returns who voted what. Tests: `tests/35-polls.test.ts`.

## Differs from the design
- Buttons are 36px (DL4), not the design's 40px.
- "Closes at the meeting" shows the date ("closes Nov 26") rather than the words.
- The draft lives in this browser, not in Studio.
