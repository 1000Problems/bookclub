# Account page v1

Status: design, 2026-11-06. Site only (`bookclub`). No Studio change. Replaces `/club`.

## Goal
"Club" is the wrong name for what's left there. Your name in the header opens **Account**: who you are on the site, your AI connection, and sign out.

## Design
- **`/account`, signed in:** name, role (Admin, Member, Alumni, Guest), roster status, a link to your member page if you're on `/members`, AI connection status with a link to manage it, and Sign out.
- **`/account`, signed out:** a Sign in button that returns here.
- **`/account/ai`:** the connect-your-AI page, moved from `/club/ai`, with a link back to Account.
- **`/about`:** public. The club's name, about text and a Members link. Footer "Club" becomes "About".
- **Sign out** lives on Account only; the footer button goes.
- **Old links:** `/club` → `/account`, `/club/ai` → `/account/ai`, `/club?find=` → `/admin?find=`.

## Left out
Email: the site can't read it. `me` carries slug, name, role and status. Showing it needs a Studio change.

## Accept
- [x] The name pill opens `/account`
- [x] Account shows the right role for an admin and a member
- [x] Signed out, `/account` offers Sign in
- [x] Sign out works and is only on Account
- [x] `/about` works signed out; the footer says About
- [x] Old `/club` links redirect
- [x] Typecheck and build pass
