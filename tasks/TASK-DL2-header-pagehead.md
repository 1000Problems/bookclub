# TASK DL2: One design language, part 2: one header and one page head on every page

> Every page under `src/app/(club)` gets the same header and opens with the same `PageHead`: eyebrow, title, one line, and controls on the right.

## Context

Claude Design "Soul Crushers Design Language", option 1c. Today the pages open in different ways:

- Home has no title.
- Members and Admin use a 56px h1 with different wrappers (`.m6-head`, `.a7-head`, `.ad-head`).
- Book, member and author pages use three different hero layouts (`.sc-card2a`, `.sc-mhero`, `.sc-bookhero`).
- About and Next still use the old serif `Title`.

In the header, the selected tab and the account pill are both solid ink, so they compete. Do DL1 first.

## Requirements

1. **Header** (`src/app/(club)/layout.tsx` + `.sc-pill` in globals.css):
   - The account pill and the "Sign in" pill become the Quiet button style: `#fff`, `box-shadow: 0 0 0 1px rgba(20,20,19,.1)`, `color:#141413`, 36px high.
   - Only the selected tab (`.sc-tab.on`) is solid ink.
   - The tabs stay as they are in `NavTabs.tsx` (Home, Members, Admin for the scribe).
2. **Footer**: keep the links. Restyle `.sc-foot` to 13px `--muted`, with 32px top padding, and remove the `margin:-90px` hack.
3. **`PageHead` component.** Add it to `src/components/ui.tsx`:
   ```tsx
   export function PageHead({ eyebrow, title, sub, right, tint }: { eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode; tint?: string }) {
     return <header className={`sc-pagehead${tint ? " tinted" : ""}`} style={tint ? { background: tint } : undefined}>
       <div className="sc-col" style={{ gap: 8, minWidth: 0 }}>
         {eyebrow && <span className="sc-eyebrow">{eyebrow}</span>}
         <h1 className="sc-display">{title}</h1>
         {sub && <span className="sc-pagehead-sub">{sub}</span>}
       </div>
       {right && <div className="sc-pagehead-right">{right}</div>}
     </header>;
   }
   ```
   Add the CSS:
   ```css
   .sc-pagehead { display:flex; justify-content:space-between; align-items:flex-end; gap:16px; flex-wrap:wrap; padding:12px 4px 4px; }
   .sc-pagehead.tinted { border-radius:var(--r-hero); padding:clamp(24px,3.5vw,36px); }
   .sc-display { margin:0; font-size:clamp(36px,5vw,56px); font-weight:700; letter-spacing:-.05em; line-height:.95; text-wrap:balance; }
   .sc-pagehead-sub { font-size:15px; color:var(--label); }
   .sc-pagehead-right { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
   ```
4. **Use `PageHead` on these pages.** Keep every value and every link they show today; only the wrapper changes.

   | Page | eyebrow | title | sub | right | tint |
   |---|---|---|---|---|---|
   | `members/Board.tsx` (replace `.m6-head`) | "Members" | "At the table now" | `sumLine` | the sort segment | none |
   | `members/[slug]/page.tsx` (the left column of `.sc-mhero` becomes PageHead; Loved/Their words stay below as two cards) | `← Members` link + `m.since` | `m.name` | the `.sc-mstats` row | lean pill | `m.tint.hero` |
   | `m/[slug]/page.tsx` (replace the text column of `.sc-card2a`; the cover stays left, inside the tinted head) | No. · Month Year link | `title` | authors (`AuthorName small`) | score block `.sc-card2a-s` | `tint(title,.93,.04)` |
   | `author/[slug]/page.tsx` (replace the `.sc-bookhero` text column; the photo stays) | "Author" | name (`AuthorName`) | books · average · years | Wikipedia source link | `tint(name,.93,.04)` |
   | `admin/page.tsx` (replace `.a7-head` / `.ad-head`) | "Admin" | the existing h1 text | the existing subline | the existing jump segment | none |
   | `about`, `next`, `stats`, `talk`, `ballot`, `account` (replace `Title` from `src/lib/page.tsx`) | page name | the existing title text | — | — | none |

5. Home (`(club)/page.tsx`) gets **no** `PageHead` in this task. Its layout waits for the home direction the user picks (2a / 2b / 2c). Leave the home page alone, apart from what DL1's CSS does.

## Implementation notes

- `Title` in `src/lib/page.tsx` may become `export const Title = ({ children }) => <PageHead title={children} />`. That's fine as long as the import works from a server file (PageHead is in a `"use client"` file, which is okay because it has no hooks). Otherwise update the callers.
- When `PageHead` has a cover or photo, pass them as a wrapper: `<div className="sc-row-head">{cover}<PageHead …/></div>`, or add an optional `media` prop. Keep it simple: one optional `media?: ReactNode` rendered before the text column is fine.
- Remove CSS that becomes unused: `.m6-head`, `.a7-head`, `.ad-head`, `.sc-h1`, `.sc-mname`, `.sc-card2a-t`, `.sc-memhero`. Only remove them after grepping that nothing uses them.

## Do not change

- `src/lib/` except the `Title` line in `page.tsx`.
- `src/components/NavTabs.tsx` logic (the tab matching), `Fresh.tsx` and `NextMeeting.tsx`.
- `(club)/page.tsx` (home).
- All SQL, actions, forms and hidden fields, and any copy beyond the eyebrow words in the table above.
- The `AuthorName` animation.

## Acceptance criteria

- [ ] `npx tsc --noEmit` and `npm run build` pass.
- [ ] Each page in the table opens with `.sc-pagehead`, and there is exactly one `<h1>` per page.
- [ ] `grep -rn "m6-head\|a7-head\|ad-head\|sc-mname\|sc-card2a-t" src` returns nothing.
- [ ] In the header, only the selected tab is solid ink, and the account/sign-in pill is white.
- [ ] At 390px the header fits on one line, and page heads wrap with the right-hand controls below the title.

## Verification

1. Open `/members`, `/members/shelby` (or any member), `/m/2026-08`, an author, `/admin`, `/about` and `/next`, signed in as the scribe and signed out.
2. Compare them against Claude Design option 1c.
3. Run `git diff --stat`. The only files changed should be the pages in the table, `ui.tsx`, `page.tsx` (the `Title` line), `layout.tsx` and `globals.css`.
