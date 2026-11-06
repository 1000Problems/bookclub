# Admin tab v1

Status: design, 2026-11-06. Site only (`bookclub`). No Studio change. Amends `EXCEL-EXPORT-v1-DESIGN.md` §6.

## Goal
Admin work doesn't sit behind a person's name. An admin sees an **Admin** tab in the header. Nobody else sees it.

## Design
- **Header:** tabs are Home, Books, Members, then Admin, shown only when `me.role = 'scribe'`. It's on for any `/admin` path.
- **One way in:** remove the footer "Admin" link and the `/club` "Admin" link.
- **Name pill:** still goes to `/club`, which keeps the club's about text, Members, Connect your AI and sign out.
- **Sub-nav:** replaced by one page with jump links (tasks/README.md D15).
- **Access doesn't change:** hiding the tab is cosmetic. Pages and `/api/export/sheet` still refuse non-scribes.
- **Phone:** the header must fit four tabs and the pill at 390px. At 480px and under, the brand shortens to `SC.`. It keeps its accessible name.
- **Admin badge:** the tab replaces the "header admin badge" §6 left for later. What Shelby meant by it is a question for Sunday.

## Not in this change
`/club` stays. Turning it into an account menu is a later decision.

## Accept
- [x] Scribe sees the Admin tab; a member and a signed-out visitor don't
- [x] No Admin link in the footer or on `/club`
- [x] Header fits on one screen width at 390px, signed in as a scribe
- [x] Typecheck and build pass
