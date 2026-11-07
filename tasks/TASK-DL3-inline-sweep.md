# TASK DL3: One design language, part 3: sweep the inline styles in the page files

> Replace hard-coded inline font sizes, radii and label styles in the TSX with the DL1 classes, so the pages can't drift again.

## Context

DL1 fixed the CSS classes, but many pages still carry one-off inline styles that bypass them. In `(club)/page.tsx` alone there are `style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.04em" }}`, `fontSize: 19`, `fontSize: 17` and `fontSize: 15, fontWeight: 600, color: "#3d3b37"` for an eyebrow. Do this after DL1 and DL2.

## Requirements

1. Add three tiny utility classes to globals.css:
   ```css
   .sc-h2 { font-size:28px; font-weight:700; letter-spacing:-.04em; line-height:1.05; }   /* replaces the old sc-h2 clamp */
   .sc-t3 { font-size:17px; font-weight:700; letter-spacing:-.02em; line-height:1.2; }
   .sc-small { font-size:13px; color:var(--muted); }
   ```
2. In every file under `src/app/(club)/**` and `src/components/**`, replace inline `fontSize` / `fontWeight` / `letterSpacing` triples that are acting as headings with `sc-h2` or `sc-t3`, whichever is closer: 22–30px becomes `sc-h2`, 15–20px bold becomes `sc-t3`. Replace inline eyebrow-like spans (uppercase, or a small bold label above a value) with `className="sc-eyebrow"`.
3. Replace inline `fontSize: 12 | 13` with `color: "#5e5c56"` or `className="muted"`, using `sc-small`.
4. Replace the inline `borderRadius` values in the TSX with the DL1 tokens (`var(--r-card)` and so on), or drop them where the class already sets one.
5. Leave the `style` values that are data alone: `tint()`, `heat()`, widths from scores, bar percentages, `m.tint.*`, cover sizes and positions.

## Implementation notes

- Find the candidates with `grep -rn "fontSize:" src/app src/components` and `grep -rn "borderRadius" src/app src/components`.
- Work file by file: `(club)/page.tsx`, `m/[slug]/page.tsx`, `members/[slug]/page.tsx`, `author/[slug]/page.tsx`, `admin/*.tsx` and `components/ui.tsx`.
- If a replacement changes the size by more than 2px, it's still correct. The point is one scale.

## Do not change

- `src/lib/**`, `src/app/api/**` and `src/app/auth/**`.
- Logic, SQL, forms, hidden inputs and copy.
- The `AuthorName`, `Shelf` and `RankPicker` behaviour in `ui.tsx` (classes only).
- The data-driven `style` values listed in requirement 5.

## Acceptance criteria

- [ ] `npx tsc --noEmit` and `npm run build` pass.
- [ ] `grep -rn "fontSize: \(1[4-9]\|2[0-9]\|3[0-9]\)" src/app src/components` returns fewer than 10 hits, and each remaining hit is a number display (score, stat) or a cover.
- [ ] `grep -rn "borderRadius" src/app src/components` returns only data-driven or cover cases.
- [ ] There is no visible layout change beyond type sizes moving to the scale: no new wrapping and no overflow at 390px or 1280px.

## Verification

1. Visit each page at 390px and at 1280px, and compare against before (take screenshots before you start).
2. Run `git diff --stat`. The only files changed should be in `src/app/(club)/**`, `src/components/**` and `globals.css`.
