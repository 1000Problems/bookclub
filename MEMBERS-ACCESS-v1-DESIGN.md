# Members and access v1: invite links, one-step join, block and delete

Status: design, 2026-11-06 (rev 3). Not built. Covers `byoaistudio` (Studio) and `bookclub` (site).
Builds on what is already in place: `/admin` with its sub-nav and Admin tab (D12, D13), `/account` (D14), and the
sheet record (TASK-56, migration 067). The next Studio migration is **068**.

## 0. Rules

From Shelby (meeting 2026-11-06) and Angel (2026-11-06):

1. **Only admins add people.** No self-signup, no "create account", no "sign up" anywhere a club member can see.
   An admin adds the person and gives them a link; the link is the only way in.
2. **Members never see Studio.** Joining, signing in, resetting a password: all on the club site, in the club's look.
   Studio does the work behind the site's server.
3. **Admins can block and delete** members.
4. **Admins reset passwords** by sending a new link. No email anywhere.
5. Admins are Shelby and Kent (Angel too, from the sheet record spec).

**Decisions reversed:**
- Design v3.2 "Decided by Angel, 2026-11-05: anybody can become a member" (built as `sites.open_space` and
  `space_members.auto`, migration 064) is **gone**. Signing in never makes anyone a member.
- Design v3.2 §4 "The site has no login or signup pages … Sign in calls Studio `/authorize`": **replaced.** The site has
  its own sign-in page (username + password) and its own join page. No sign-up page exists anywhere.
- Studio's `/join/<token>` page ("Sign up or log in to join") is **retired** for the club.

**Current membership:** the only account that has joined is Shelby's. He stays, as admin. Every other roster member
joins through SA1.

---

## 1. What exists today

**Studio**
- `space_invites` (062): single-use link, only the token's sha256 stored, `member_slug`, `member_name`, `role`, 14-day
  expiry, `used_at`, `revoked_at`. `POST /club/invites`, `DELETE /club/invites/:id`.
- `db.byoaistudio.com/join/<token>`: Studio page with **Sign up** / **log in** links, then **Join**.
- `DELETE /club/members/:slug` and `PATCH /club/members/:slug` (`src/lib/club-api.ts`).
- Accounts are email + password (004); sessions in `byoaistudio.sessions`.
- 064: `sites.open_space`, read in `src/lib/store/sites.ts` and `invites.ts`; `space_members.auto`.

**Site** (as of commit `0be94ce`)
- Header: tabs Home, Books, Members, and **Admin** for scribes (`src/app/(club)/layout.tsx`). Signed in, the name pill
  opens `/account`; signed out, it says **Sign in** and goes to `/auth/signin` → PKCE redirect to Studio's `/login`.
- `/account` (`src/app/(club)/account/page.tsx`): name, role, status, AI connection, **Sign out** (posts
  `/auth/signout`). Signed out it offers Sign in. `/club` links redirect here.
- `/admin` with sub-nav Overview · Members · Meetings (`src/app/(club)/admin/`).
- `/admin/members` (`src/app/(club)/admin/members/page.tsx`): roster from `members_roster` (`slug, name, status,
  linked`) and `sheet_members`; per row **Copy invite link** (`invite`, always `role: "member"`, only when active and
  not linked), **Remove** (`removeMember`: Studio DELETE, then `status = 'alumni'`), and a "Sheet label and birthday"
  form (`saveMemberSheet`); **Add** at the bottom (`addRoster`, a bare insert, no invite). The link is shown with
  "Text this link: …".

**"Create account" / "sign up" wording that has to go**
- Studio `src/app/join/[token]/page.tsx`: "Sign up or log in to join."
- Design docs v3–v3.2: SC5 step 3 ("→ **Sign up**"), the join Accept item "Join works for sign-up…", the S2 item
  "Sign in or sign up (existing Studio email + password; signup creates…)", §4 "no login or signup pages".
  Mark those superseded by this doc (§7), don't rewrite history.
- The site's own pages have none today. They must stay that way: an Accept check greps for it (§2).

---

## 2. Scenarios

### SA1. Invite someone on the roster (John W)
1. An admin opens `/admin/members`. John W's row says **No sign-in yet**. Tap **Get invite link**.
2. The row shows `bookclub.hadmoney.com/join/<token>`, **Copy**, "Expires Nov 20". The admin texts it.
3. John opens it. One screen:

   > **Soul Crushers**
   > Welcome, John W.
   > Username [johnw______]
   > Password [__________]
   > **[Join]**
   > You'll sign in with this username and password.

4. He keeps or changes the username, types a password, taps **Join**, and lands on Home signed in as John W, with his
   history already his (`john-w`).

**Accept (MUST)**
- One screen, two fields, one button, on the club site. No email, no Studio page, no redirect off
  `bookclub.hadmoney.com`.
- Username pre-filled (`John W` → `johnw`), editable. Taken → "That username is taken." on the same screen, what he typed
  kept, a suggestion (`johnw2`). Rules: 3–30 characters, letters, numbers, dot, dash; not case-sensitive. Password at
  least 8 characters ("Use at least 8 characters.").
- His account is linked to `john-w`; nothing is copied or moved.
- The row now says **Joined Nov 6**. Reopening the link: "This invite was already used." with **Sign in**.

### SA2. Add someone new (Dave R)
1. On `/admin/members`, **Add someone new**: name, role (**Member** / **Admin**), joining month (default this month),
   optional birthday.
2. **Add and get link**: roster entry and invite in one change; the link is shown to copy.
3. Dave joins as in SA1.

**Accept (MUST)**
- One form, one tap, one change; one Undo removes both.
- A name already on the roster: "There's already a Dave R. Use their invite link instead."
- Dave is on the members list at once and gets an export column from his first vote.

### SA3. Block someone (Will F)
For a member who has history, or anyone the admin may want back later.
1. **Block** on Will's row. Confirm: "Block Will F? He'll be signed out everywhere and can't sign in. His scores and
   words stay in the club's history. You can unblock him later."
2. Will's site sessions and AI keys are revoked, open invites cancelled, `status` becomes `'alumni'` with `left_on`
   today, and his membership is marked blocked.

**Accept (MUST)**
- His next request on any device is signed out; his AI key gets 401.
- Signing in: "You're not in this club anymore. Ask an admin to invite you back."
- History stays on books, member page and export.
- **Unblock** restores sign-in with his existing username and password; **Get invite link** also works.
- An admin can't block themselves; the last admin can't be blocked ("The club needs at least one admin.").

### SA4. Delete someone (Dave R, added by mistake)
1. **Delete** on Dave's row. Confirm, naming exactly what goes:
   - **No history** (no votes, posts, RSVPs, hosted meetings): "Delete Dave R? He's removed from the club completely."
     The roster entry, invites, membership and his login are deleted.
   - **Has history:** "Dave R has 12 scores and 3 posts. Deleting removes his sign-in for good, but his name and scores
     stay in the club's history." The login and membership are deleted; the roster entry stays as a past member. To
     come back he needs a new invite and a new username.
2. Undo is available for the no-history case (one change). Deleting a login can't be undone: the confirm says so.

**Accept (MUST)**
- The club's history is never deleted by deleting a person. Scores, words and posts stay, and the export is unchanged.
- After delete, his username is free again.
- Same self / last-admin rules as SA3.

### SA5. Forgotten password (Kirk G)
1. **New sign-in link** on Kirk's row; the admin texts it.
2. Kirk opens it: "Welcome back, Kirk G. Username [kirkg] Password [____] **[Save and sign in]**".

**Accept (MUST)** only the password (and username, if he edits it) changes; a "Sign out his other devices" checkbox for
the admin, off by default; the old password stops working.

### SA6. Roles
Each row has **Member / Admin**. The invite (SA1) and add (SA2) forms take the role. Takes effect on the member's next
request. Last-admin rule applies.

### SA7. Shelby's account
Shelby's account is the existing email account from `create-club.mjs`. At go-live an admin (Angel) sends him a **New
sign-in link** (SA5): he picks a username and password, and from then on signs in like everyone else. His role stays
admin, his `shelby-g` link and history are unchanged. Angel's operator membership from `add-scribe.mjs` (`angel`)
gets the same treatment: a New sign-in link, then username sign-in.

### SA8. Signing in
The header's **Sign in** pill (and `/account` when signed out) opens `/signin` on the club site: username, password, **Sign in**. Wrong either way: "That username
and password don't match." Blocked: the SA3 message. No "create account" or "forgot password" link: the page says
"Need a sign-in link? Ask Shelby or Kent." (names from the club's admins).

**Accept for the whole doc:** `grep -rniE "sign ?up|create (an )?account|register"` over `bookclub/src` and over
Studio's club-facing pages (`src/app/join`, the new `/site/*` routes) finds nothing user-facing.

---

## 3. `/admin/members` (site)

Rework the existing page in place (same file, sub-nav and `.sc-*` look). Keep the per-row "Sheet label and birthday"
form. Replace **Add** with **Add someone new** at the top, and **Copy invite link** / **Remove** with the actions below.
The roster data comes from `GET /club/members` (§4.2) plus `sheet_members`.

One list in sheet order, then guests and blocked:

| Column | Shows |
|---|---|
| Name | sheet label; past members greyed |
| Sign-in | **Joined Nov 6** · username (admins only) · **Invited, expires Nov 20** · **No sign-in yet** · **Blocked Nov 6** |
| Role | Member / Admin |
| Actions | Get invite link · Copy link again · Cancel invite · New sign-in link · Block / Unblock · Delete |

Top: **Add someone new** (SA2). Birthday and sheet-label fields come from the sheet record spec.

All actions are server actions in `src/lib/actions.ts`: one request = one change = one Undo (except deleting a login).
Studio's refusals shown verbatim. Links are copied and texted; nothing is emailed.

---

## 4. Studio changes (`byoaistudio`)

### 4.1 Migration `068_member_logins.sql`
```sql
-- Username logins for club members (no email)
alter table byoaistudio.spaces add column username text
  check (username is null or username ~ '^[a-z0-9][a-z0-9.-]{2,29}$');
create unique index spaces_username on byoaistudio.spaces (username) where username is not null;

-- Invites: join (first sign-in) or reset (new password)
alter table byoaistudio.space_invites
  add column purpose text not null default 'join' check (purpose in ('join','reset'));

-- Block
alter table byoaistudio.space_members add column blocked_at timestamptz, add column blocked_by bigint
  references byoaistudio.spaces (id) on delete set null;

-- Open signup off for good
update byoaistudio.sites set open_space = null where open_space is not null;
```
- `bind()` refuses a membership with `blocked_at` set, exactly like no membership: "You're not in this club anymore.
  Ask an admin to invite you back."
- Sign-in paths that read `open_space` (`store/sites.ts`, `store/invites.ts`) lose the auto-member branch. The
  `open_space` and `auto` columns stay until a later cleanup migration.
- A new invite for a member cancels that member's earlier unused ones.
- Account for a username login: a private space row as today (Studio needs one per account), `email` null,
  `username` set, password hashed as in 004. The member never sees or names it.

### 4.2 Endpoints

Site token only (called by the site's server, never the browser):

| Endpoint | Does |
|---|---|
| `GET /site/invite/:token` | club name, member name, purpose, suggested username; or the problem message |
| `POST /site/invite/:token/accept` | `{username, password}` → `join`: creates the username account, links `space_members(member_slug, role)`; `reset`: sets the password (and username) on the linked account. Marks the invite used, returns a one-time code. All or nothing: a taken username writes nothing |
| `POST /site/login` | `{username, password}` → one-time code if a non-blocked member of this club; else the §2 SA8 / SA3 message |
| `POST /site/password` (+ member session) | `{current, next}` → changes the caller's own password; wrong current: "That's not your current password." |

The `me` view gains `username` (the caller's own only).

Site token + admin session:

| Endpoint | Does |
|---|---|
| `POST /club/invites` | existing; adds `purpose`; honours `role`; returns `${SITE_URL}/join/<token>` |
| `DELETE /club/invites/:id` | existing |
| `POST /club/members` | roster row + optional invite in one change (SA2) |
| `PATCH /club/members/:slug` | `{role}` · `{blocked: true/false}` (SA3, SA6); last-admin and self rules |
| `DELETE /club/members/:slug` | **changes meaning**: delete (SA4). No history → roster row, invites, membership, login. History → membership and login; roster row to `alumni`. Today's "remove" behaviour becomes `PATCH {blocked: true}` |
| `GET /club/members` | adds `username`, `joined_at`, `blocked_at`, open invite `expires_at`, `role`, `has_history` |

The one-time code goes through the site's existing code exchange (`/auth/callback`, `state=join`), so sessions are
made exactly as now.

**Security**
- Passwords travel browser → site server → Studio over HTTPS; the site never stores or logs them (no password in
  server action logs or error messages).
- Rate limit on `/site/login` and `/accept`: 5 tries per username and per IP per 15 minutes, then "Too many tries. Wait
  15 minutes or ask an admin for a new link."
- Same message for unknown username and wrong password.
- Tokens: single use, hashed, 14 days.

### 4.3 Retire Studio's club join page
`src/app/join/[token]/page.tsx` and `accept/route.ts`: for an invite whose site is the Book Club, redirect to
`${SITE_URL}/join/<token>`. The "Sign up" and "log in" links are deleted. (Other future clubs would get the same
treatment; Reading doesn't use invites.)

### 4.4 Tests (`tests/31-bookclub-access.test.ts`)
- Join: success links the slug; taken username writes nothing; used, expired, cancelled tokens refused.
- Reset: new password works, old fails, slug unchanged.
- Login: member gets a code; blocked gets the message; non-member refused; a fresh account is never auto-added
  (open signup gone).
- Block: sessions and AI keys revoked, invites cancelled, `bind()` refuses; unblock restores.
- Delete: no-history case removes everything and is one change; history case keeps votes and posts and frees the
  username.
- Self and last-admin refusals for block, delete and role.
- Rate limit trips on the 6th try.

**Studio task:** `TASK-57-member-logins.md`.

---

## 5. Site changes (`bookclub`)

| Piece | Where |
|---|---|
| Join page | `src/app/join/[token]/page.tsx` (outside `(club)`, club look): `GET /site/invite/:token`; form → server action → `/accept` → code exchange → `/`. Reset purpose shows "Welcome back" and **Save and sign in** |
| Sign-in page | `src/app/signin/page.tsx`: username + password → `/site/login` → code exchange, back to `back`. The header pill and `/account`'s signed-out button point here |
| Remove PKCE sign-in | `src/app/auth/signin/route.ts` redirects to `/signin`; `/auth/callback` keeps only the code exchange; `/auth/signout` unchanged |
| `/account` | adds **Username** and a **Change password** form (current + new) → `POST /site/password` |
| `/admin/members` | §3, reworking the existing page |
| Actions in `src/lib/actions.ts` | `inviteMember` (replaces `invite`; role and purpose), `addAndInvite` (replaces `addRoster`), `newSignInLink`, `setRole`, `blockMember`, `unblockMember`, `deleteMember` (replaces `removeMember`), `cancelInvite`, `changePassword`. `saveMemberSheet` stays |
| Copy check | the §2 grep runs in `npm run build`'s prebuild (fails the build if it matches) |

---

## 6. Build order

| # | Step | Repo | Who |
|---|---|---|---|
| 1 | Migration 068, endpoints, rate limit, retire Studio join, tests | byoaistudio | Claude |
| 2 | Join page, sign-in page, PKCE route removed | bookclub | Claude |
| 3 | `/admin/members` and actions | bookclub | Claude |
| 4 | Local run of SA1–SA8, signed in, phone width, grep check | both | Claude |
| 5 | Production: migrate, push both repos | both | **Angel** |
| 6 | Shelby: send him a New sign-in link (SA7) | | **Angel** |
| 7 | Real check on a phone: invite a test member, join, sign out, sign in, block, delete | | **Angel** |

The sheet record (067) and `/admin` are built; this starts from there. The bookclub working tree has uncommitted D14
work (`/account`, the moved AI page, this doc): commit it first so this work starts clean. Add D15 "Members and
access" to `tasks/README.md`.

---

## 7. Docs to mark superseded

Add one line under each, pointing here, without rewriting them:
- `BOOK-CLUB-v3.2-DESIGN.md`: "Decided by Angel, 2026-11-05: anybody can become a member"; §2.00; §4 "no login or
  signup pages"; SC5 steps 3 and 9; the S2 join item; the "Join works for sign-up" Accept line.
- `byoaistudio/tasks/TASK-49-invites.md`, `TASK-54-open-club.md`: As built note "superseded by TASK-57".

---

## 8. Open questions

1. **Can blocked former members still read?** Design: no, blocked means signed out. If Shelby wants "past member, can
   read", that's a separate state from blocked.
2. Who are the admins named on the sign-in page? Design: whoever has the admin role, first names.
