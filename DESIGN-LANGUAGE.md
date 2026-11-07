# Design language

The one set of rules for how the Soul Crushers site looks. Reading (`reading.hadmoney.com`) adopts the same rules next.
The values live in `src/app/globals.css`: the `:root` tokens and the DL1–DL3 blocks near the end of the file. When
this page and the CSS disagree, fix one of them; don't leave the drift.

History: Claude Design "Soul Crushers Design Language" 1b and 1c (tasks DL1–DL3), retuned to Reading's density in DL4
(2026-11-07). Angel preferred the site at 90% zoom and Reading's look; Reading itself had no rules (10 title styles,
about 20 text sizes, 12 corner radii), so we took its numbers, not its drift.

## Principles

1. **One of each.** One page title, one section heading, one card heading, one label, one segmented control, two
   buttons, three corner radii. A new page uses these; it doesn't invent a size.
2. **Dense, like Reading.** Small body text, modest titles, tight cards. The same density on phones (Angel: Reading
   feels great on a phone).
3. **Black is for "you are here" and "do this".** Only the selected header tab and primary buttons are solid ink.
4. **Warm is for "now".** The next meeting and the month being edited sit on the warm surface. Everything else is white
   or the book's own tint.
5. **Serif is for members' words and book covers only.**
6. **No label that repeats the title.** An eyebrow appears only when it adds something.
7. **Every page starts at the same height.** Home's next-meeting box and every page title start 72px from the top
   (12px below the header).

## Colour

| Token | Value | Use |
|---|---|---|
| `--bg` | #fafaf8 | Page background |
| `--surface` | #fff | Cards |
| `--field` | #f6f5f1 | Inputs, inner rows |
| `--seg` | #eeede8 | Segmented control track |
| `--text`, `--ink` | #141413 | Text; primary buttons; selected tab |
| `--label` | #3d3b37 | Secondary text on tinted heroes |
| `--muted` | #5e5c56 | Secondary text, subtitles, labels |
| `--faint` | #8f8d87 | Placeholders, least important text |
| `--accent` / `--accent-ink` | #e9a93a / #7a4f00 | Amber marks: NEXT tag, focus ring (`--mark`), the highlighted stat |
| `--warm` | oklch(.93 .06 80), soft amber | The "now" surface: Home's next meeting, Admin's month record |
| `--gold` | oklch(.87 .14 85) | Score pill, 9+ badge |
| `--trap`, `--trap-bg` | red | Danger: Retire, refusals |
| `tint(name)` | per book or person | Book heroes, member cards, author heroes, covers |

## Type

Plus Jakarta Sans throughout. Newsreader (serif, italic) only for members' words (`.sc-w`, `.word`, `.m6-word`,
`.sc-words`, `.sc-cloud`) and cover titles. JetBrains Mono only for labels.

| Role | Class | Size | Weight | Letter spacing |
|---|---|---|---|---|
| Page title (one per page) | `.sc-display` via `PageHead` | `clamp(28px,4vw,40px)`, line height 1 | 700 | −.045em |
| Subtitle | `.sc-pagehead-sub` | 15px, `--muted`, beside the title | 400 | |
| Section heading | `.sc-h2` | 22px | 700 | −.035em |
| Card heading | `.sc-t3`, `.sc-boxt` | 15px | 700 | −.02em |
| Body | `body` | 14px | 400 | |
| Small | `.sc-small` | 12px, `--muted` | | |
| Label (eyebrow) | `.sc-eyebrow` | mono 11px, uppercase, `--muted` (`--label` on a tint) | 500 | .06em |
| Big date | `.sc-when` | `clamp(26px,3.4vw,36px)` | 700 | |
| Names and numbers in cards | | 26px names, 20px stats, 24px words | | |

People's and authors' names animate with `AuthorName`: letters rise in, a marker sweeps under, the surname pops amber.
Book authors loop a gentle wave. Member names on the Members cards play once, staggered.

## Shape and space

| Token | Value | Use |
|---|---|---|
| `--r-hero` | 28px | Tinted heroes: next meeting, last time, book, member, author, Admin month |
| `--r-card` | 20px | Every white card, panel, box, dialog |
| `--r-row` | 12px | Inner rows, inputs, chips |
| pill | 999px | Buttons, tabs, tags |
| cover | 4px 7px 7px 4px | Book covers only |

Card padding is 16px 18px. Hero padding is `clamp(20px,3vw,28px)`. Cards use `box-shadow: var(--ring)`, not borders.
Anything else under 6px is a dot, bar or mark, kept small on purpose.

## Components

- **Header:** brand, tabs (Home, Members, Admin for admins), account pill on the right. Only the selected tab is ink;
  the account and Sign in pill is white with a hairline ring. On phones the brand shortens to "SC." and everything
  stays on one line.
- **Page head (`PageHead` in `src/components/ui.tsx`):** optional eyebrow on its own line; then the title with the
  subtitle beside it on the same baseline; controls on the right. Optional `tint` (a hero, radius 28) and `media` (a
  cover or photo first). Every page except Home opens with it. Home opens with the next-meeting box.
- **Buttons:** primary is ink with white text; quiet is white with a hairline ring. Both pills, 36px high, 13px 600.
  Danger is `--trap-bg` with red text. Ghost is text only.
- **Segmented control:** track `--seg`, 3px padding, radius 12. Buttons 28px high, radius 9, 12px 600. "On" is white
  with `0 1px 2px rgba(20,20,19,.1)`. Used for sorts, the Admin jump links, roles and settings.
- **Cards:** white, radius 20, ring shadow, padding 16/18. A card heading uses `.sc-t3`.
- **Covers:** the `Cover` component. Images load through `/api/cover` (cached a year by Vercel and the browser). A book
  with no catalog cover shows its tinted card with the title; Admin's "Cover image" field sets another edition's cover.
- **Saving:** Admin saves as you type. A small status tag says "Saving…", "All changes saved" or Studio's refusal.
  Changing someone's role asks first in a dialog.

## Phones

Same density as desktop. The header fits on one line at 390px. Grids drop to one column. Page heads wrap: the title
and subtitle first, then the controls below. The phone header block is the last rule in `globals.css` so it wins.

## Adding something new

1. Use `PageHead`, `.sc-h2`, `.sc-t3`, `.sc-small`, `.sc-eyebrow`, the button classes and the radius tokens.
2. No inline `fontSize`, `fontWeight`, `letterSpacing` or `borderRadius` in TSX. Inline styles are only for data:
   `tint()`, `heat()`, widths from scores, cover sizes.
3. If the design needs a value that isn't here, change this page and the token together, for every page.

## Next

- Apply DL1–DL4 to Reading, then point both sites at this page.
- Not settled yet: Home's layout direction (2a / 2b / 2c).
