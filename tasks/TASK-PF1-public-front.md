# TASK PF1: Public front, members behind sign-in

> Spec: `PUBLIC-FRONT-v1-DESIGN.md`. Site only; no Studio change.

## Steps

1. `src/lib/page.tsx`: add `Who({ on, slug, className?, style?, children })`. It renders a `Link` to `/members/<slug>` when `on`, otherwise a `<span>` with the same class and style. Add `SignInToSee`: a panel with one line and a Sign in button.
2. `src/components/NavTabs.tsx`: show Members only when `member`.
3. `src/app/(club)/members/page.tsx` and `members/[slug]/page.tsx`: when `v.kind !== "member"`, return `SignInToSee`.
4. Home `src/app/(club)/page.tsx`: word cards use `Who`. In the stats line, "N members" is a link only when signed in.
5. `src/app/(club)/m/[slug]/page.tsx`: "hosted by" and the score rows use `Who`.
6. `src/app/(club)/author/[slug]/page.tsx`: "Who likes them" rows use `Who`.

## Done when

`npx tsc --noEmit` and `npm run build` pass, and A1–A4 in the design hold on bookclub.hadmoney.com, signed out and signed in.
