# TASK DL1: One design language, part 1: tokens and the shared CSS values

> Shrink the site's visual vocabulary to one set of sizes, radii, labels, controls and cards. Do it by changing the values of the existing `.sc-*`, `.m6-*`, `.a7-*`, `.ad-*`, `.am-*`, `.lg-*`, `.cs-*` and `.nm-*` classes in `src/app/globals.css`. Don't rename classes in TSX.

## Context

Each page was designed on its own in Claude Design, so the look has drifted. Claude Design's "Soul Crushers Design Language", turn 1, counted the drift: 7 page-title styles, 9 corner radii, 7 segmented controls, 5 eyebrow/label styles, 6 section-heading styles, 6 button styles and 9 card shells. This task brings the CSS down to the set below. DL2 does the header and page heads. DL3 sweeps the inline styles in the page files.

## The set (the only allowed values after DL1–DL3)

Add these to the `:root` block at the top of `src/app/globals.css`:

```css
/* Design language (Claude Design "Soul Crushers Design Language" 1b) */
--warm: oklch(.95 .03 80);           /* the "now" surface: next meeting, admin next */
--gold: oklch(.87 .14 85);           /* score pill, 9+ badge */
--r-hero: 28px;                      /* tinted heroes: next meeting, last time, book, member, author */
--r-card: 20px;                      /* every white card / panel / box */
--r-row: 12px;                       /* inner rows, inputs, chips, hilo cells */
--fs-display: 56px;                  /* one page title per page (clamp(36px,5vw,56px)) */
--fs-h2: 28px;                       /* section heading */
--fs-h3: 17px;                       /* card heading */
--eyebrow: 500 11px/1.2 var(--font-mono);   /* letter-spacing .06em; uppercase; color var(--muted) */
```

| Role | Value |
|---|---|
| Page title | 700, `clamp(36px,5vw,56px)`, letter-spacing -.05em, line-height .95 |
| H2 (section) | 700, 28px, -.04em, line-height 1.05 |
| H3 (card) | 700, 17px, -.02em |
| Body | 15px; small 13px; `--muted` for secondary |
| Eyebrow | mono 11px, .06em, uppercase, `--muted` (`--label` on a tinted hero) |
| Hero | radius 28, padding `clamp(24px,3.5vw,36px)`, background `--warm` or `tint()` |
| Card | `#fff`, radius 20, `box-shadow: var(--ring)`, padding 20px 22px |
| Row/input | radius 12, background `--field` |
| Primary button | height 40, pill, `--ink` bg, white, 14px 600 |
| Quiet button | height 40, pill, `#fff`, `box-shadow: 0 0 0 1px rgba(20,20,19,.1)` |
| Segment | track `#eeede8` padding 3px radius 12; button height 30, radius 9, 12px 600; on = `#fff` + `0 1px 2px rgba(20,20,19,.1)` |
| Serif (Newsreader) | only for cover titles and members' words (`.sc-w`, `.word`, `.m6-word`, `.sc-words`, `.sc-cloud`) |

## Requirements

1. Add the tokens above to `:root` in `src/app/globals.css`.
2. **Radii.** Every `border-radius` on a surface class becomes `var(--r-hero)`, `var(--r-card)`, `var(--r-row)` or `999px`. Heroes are `.sc-next`, `.sc-last`, `.sc-hero`, `.sc-bookhero`, `.sc-card2a`, `.sc-memhero`, `.sc-mhero`, `.am-rec` and `.ad-next`. Cards are `.sc-panel`, `.sc-box`, `.sc-mcard`, `.sc-mem`, `.sc-past`, `.sc-arg`, `.sc-sheet`, `.sc-sheet2`, `.sc-ledger`, `.sc-scores`, `.sc-eve > div`, `.m6-card`, `.ad-sec`, `.am-left`, `.am-box`, `.lg`, `.cs-card`, `.a7-export`, `.a7-more`, `.nm-panel`, `.nm-pop` and `.lg-dlg`. Inner rows and inputs get `--r-row`. Covers (`.sc-cover`) keep `4px 7px 7px 4px`.
3. **Segmented controls.** `.seg`, `.sc-seg`, `.sc-sorts`, `.m6-sorts`, `.a7-jump`, `.lg-seg` and `.am-filters` all get the Segment values above. Keep each selector's existing "on" hook (`.on`, `[aria-pressed="true"]`, `[aria-checked="true"]`, `a:hover`), but give every one the same on style.
4. **Eyebrows.** `.sc-eyebrow`, `.sc-eyebrow.dark`, `.sc-f > span`, `.ad-eye > span:first-child`, `.am-nav`, `.am-status > span`, `.sc-author-by`, `.lg-head`, `.sc-lrow.head`, `.sc-srow.head`, `.m6-strip > span:first-child`, `.m6-hilo > span > span` and `.a7-export > span` all use the Eyebrow values. `.label` stays as it is (forms use it), but `.label` inside `.sc-next` and `.sc-panel` headings becomes an eyebrow.
5. **Headings and buttons.**
   - Headings:
     - `.sc-h3`, `.m6-pasth b` and `.a7-sec b` become H2.
     - `.sc-boxt`, `.sc-boxh span:first-child`, `.nm-panel-h b`, `.am-h b`, `.lg-h b`, `.cs-h b` and `.sc-sec h2` become H3.
     - The numbered `.sc-sech > span:first-child` (01, 02…) is removed with `display:none`.
   - Buttons:
     - Primary: `.btn-ink`, `.ad-ink`, `.sc-cta`, `.nm-rsvp` and `.sc-inline button`.
     - Quiet: `.btn` and `.ad-b`.
     - `.btn-lg` is deleted from use. Leave the class in place but set it to the same 40px height.

## Implementation notes

- Edit **only** `src/app/globals.css`. Change values in place. Don't rename classes, and don't add new class names to TSX in this task.
- Where a rule hard-codes `#141413`, `#5e5c56`, `#3d3b37`, `#f6f5f1` or `#eeede8`, it may switch to the matching var. That's optional, and the visual result must be the same.
- `.sc-when` (the big date) becomes 48px max: `clamp(32px,4.4vw,48px)`.
- `.sc-h1`, `.sc-mname`, `.m6-head h1`, `.a7-head h1`, `.ad-head h1`, `.sc-card2a-t` and `.sc-memhero h1` all get the Page title value. DL2 replaces their markup, but the values land here first.
- The phone block `@media (max-width:480px)` near the bottom must stay last, so it still wins.

## Do not change

- Anything in `src/lib/` (studio, actions, record, members, page, text, viewer, sheet). That is data and auth.
- `src/app/api/`, `src/app/auth/`: routes.
- The Reading-skin classes: `.briefing`, `.prose-note`, `.note`, `.look-*`, `.acc-*`, `.flip*`, `.sheet`, `.scrim`, `.fab`, `.chip`, `.mark-*`, `.voice-*`, `.k-*`, `.mention*`, `.edition-body`. The AI sections use them, and they are out of scope.
- Animations and keyframes (`AuthorName`, `.anim-*`, `blurIn`, `.author-pop`).
- Any copy text, SQL or component logic.
- The `.sc-cover` shape and the `tint()` colours.

## Acceptance criteria

- [ ] `npx tsc --noEmit` and `npm run build` pass.
- [ ] `git diff --stat` shows only `src/app/globals.css`.
- [ ] `grep -oE "border-radius: ?[0-9]+px" src/app/globals.css | sort -u` lists only 12px, 20px and 28px, plus covers, the badge and small dots. Any other value has a comment saying why.
- [ ] On `/`, `/members`, `/members/<slug>`, `/m/<slug>`, `/author/<slug>` and `/admin`, every segmented control looks the same: same height, same track and same on state.
- [ ] Phone width (390px): the header still fits on one line, and the `/` shelf tabs still fit.

## Verification

1. `npm run dev`, then open each page listed above at 1280px and at 390px.
2. Compare them against Claude Design "Soul Crushers Design Language", option 1b.
3. `git diff --stat`, and confirm that only globals.css changed.
