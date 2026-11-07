# TASK DL4: One design language, part 4: Reading's density

> Keep the DL1–DL3 rulebook (one title, three radii, one segment, one eyebrow, two buttons) and retune its numbers to Reading's density. Once the book club is right, the same rulebook goes to Reading.

## Context

Angel compared the book club at 90% zoom with Reading (`reading.hadmoney.com/shelves/goodreads`) and preferred both to the book club at 100%. Measured in Chrome at 1312px wide:

- The book club's page title is 56px (`clamp(36px,5vw,56px)`), with the subtitle stacked below it in #3d3b37.
- Reading's title is 40px (`clamp(28px,4vw,40px)`, −.045em), with the subtitle beside it in #5e5c56.

Reading's code isn't consistent: 10 h1 styles, about 20 text sizes and 12 radii. Its feel comes from density: most text is 12–13px, and its buttons are 32–44px. So we take Reading's numbers, not its drift. Angel: Reading feels great on a phone, so phones get the same density.

## The retuned set

| Role | DL1 | DL4 |
|---|---|---|
| Page title | clamp(36px,5vw,56px), −.05em, lh .95 | **clamp(28px,4vw,40px), −.045em, lh 1** |
| Subtitle | own line, 15px, --label | **beside the title, baseline-aligned, 15px, --muted** |
| H2 (section) | 28px | **22px**, −.035em |
| H3 (card) | 17px | **15px** |
| Body / small | 15 / 13 | **14 / 12** |
| Buttons (primary, quiet) | 40px | **36px**, 13px 600 |
| Segment buttons | 30px | **28px** |
| Card padding | 20–24px | **16px 18px** |
| Hero padding | up to 36–44px | **clamp(20px,3vw,28px)** |
| Big date (.sc-when) | up to 48px | **clamp(26px,3.4vw,36px)** |
| Big numbers in cards | 24–26px names, 24px stats, 30px words | **20px names, 20px stats, 24px words** |

Radii (28 / 20 / 12), colours, the eyebrow and the serif rule stay as DL1 set them.

## Requirements

1. Change the values in place in `src/app/globals.css`: the `:root` tokens, the DL1–DL3 blocks, and the page sections they cover. Don't add an override layer.
2. `PageHead`: eyebrow on its own line; the title and subtitle share a line and wrap together. The controls stay on the right.
3. Body text is 14px from `body`; `.sc-small` is 12px.
4. Keep the phone header block last.

## Acceptance

- [ ] `npx tsc --noEmit` and `npm run build` pass.
- [ ] On `/members` at 1312px, the title measures 40px, and the subtitle sits beside it in #5e5c56.
- [ ] `/`, `/members`, `/members/<slug>`, `/m/<slug>`, `/author/<slug>` and `/admin` look right at 1312px and 390px. Nothing overlaps, and the header fits on one line.
