# Shared books and authors: Book Club ↔ Reading via Commons — design v1

**Status: built 2026-11-05 (Studio 066, TASK-55; Reading TASK-57; commons job `basics`), not yet live · Angel + Claude.** Touches `byoaistudio` (Commons, bookclub schema), `bookclub`
(site) and `reading` (one opt-in). Builds on Reading's `dossier/dossier-fast-pages-design-v3.md` (not built) and
`shelf/docs/COMMONS-JOB.md` (built). Sequenced **after** the Book Club readiness gate (v3.2, Shelby's requirements).

## 0. Decisions (Angel, 2026-11-05)

| # | Decision |
|---|---|
| D1 | Every club book and author gets a **default page**: a short factual description ("section 1") + shared news and articles. This is the default, with or without AI |
| D2 | Members who use Reading can write their own pages there with their own AI; those carry over to Book Club (§5). Read live, never copied |
| D3 | Match club books to ISBNs as far as we can. Angel is adding every Soul Crushers book to his Reading library (§4) |
| D4 | Book-level articles: **later**, not in v1 |
| D5 | Goodreads average is a fact: it moves to Commons |
| D6 | **Shared data only.** Code stays separate in each app; no shared package |
| D7 | Commons keeps one writer (the commons job). Book Club never writes facts. Corrections to a member's own page happen **in Reading, not Book Club** |

## 1. Principle: three layers

| Layer | What | Written by | Stored |
|---|---|---|---|
| **Facts** (`byoaistudio_commons`) | ISBN, cover, year, pages, Goodreads avg, **description**, author photo, Wikipedia, **bio**, articles | commons job | once, for every space |
| **Voice** (per space) | Reading: a reader's own pages, notes, "why". Book Club: scores, words, chat, write-ups | the person or club | in their own space |
| **Links** (views) | club book ↔ member's Reading page; Reading book ↔ club score | nobody: a view joins | never copied |

Carried from dossier v3 §1: **Commons holds facts with sources, no prose in anyone's voice.** The default description is
factual (premise + standing), not a pitch. A reader's `pitch` stays in their space.

## 2. Today (what this replaces)

| Thing | Book Club today | After |
|---|---|---|
| Cover | `bookclub_books.cover_url` + `later` 'cover' queue + browser Open Library lookup in `ui.tsx` (localStorage) | `book_facts.cover_url` via ISBN; browser lookup deleted |
| Author photo | `public/authors/*.jpg` copied from `reading/_authors`; `PHOTOS` map in `record.ts` | `author_facts.photo_url`; folder and map deleted |
| Author identity | JS `slugify` / `splitAuthors` in `record.ts` | DB `reading_author_slug()` / `reading_split_authors()` only |
| Book description | none (`meetings.notes` only) | `book_facts.premise` + `standing` |
| Author description | none | `author_facts.bio_facts` + `standing` + `now` |
| News | none | `author_articles` (exists) |
| Goodreads | `bookclub_books.goodreads_avg` | `book_facts.goodreads_avg` |

Reading already falls back to Commons when a reader's own row is empty (`src/lib/shared-facts.ts`). Book Club gets the
same rule, but in SQL views so the site needs no fallback code.

## 3. Commons changes (byoaistudio migration `066_commons_basics.sql`)

A **slice of dossier v3 Phase 1**: only the columns the default page needs. Column names match dossier v3 §4.1/§4.5
exactly, so the full dossier later adds to this and doesn't rename. Same forced-RLS rule as 037 (read all, write
`commons_writer()` only). No existing row changes.

`book_facts` add:
- `premise text check (length(premise) <= 400)`: 1–2 factual sentences, no voice
- `standing text check (length(standing) <= 600)`: awards, influence, adaptations, reception
- `first_year smallint`, `work_type text` (dossier v3 list)
- `author_slugs text[] not null default '{}'`
- `goodreads_avg numeric(3,2) check (goodreads_avg between 1 and 5)`, `goodreads_checked_on date` (D5)
- `basics_source text check (basics_source ~ '^https?://')`, `basics_at timestamptz`

`author_facts` add:
- `born_year smallint`, `died_year smallint`, `nationality text`
- `bio_facts text check (length(bio_facts) <= 600)`, `standing text check (length(standing) <= 600)`
- `now text check (length(now) <= 300)`, `now_on date`
- `basics_source`, `basics_at` as above

**Source rule (as built).** v1 stores the first whole sentences of Wikipedia's lead (premise ≤400, bio ≤600), never
publisher copy, with the article URL in `basics_source`; pages show "From Wikipedia" linking to it (CC BY-SA attribution).
No AI step in v1: the job has no AI and invents nothing. `standing` stays empty until an AI fill (dossier v3 §5) is added.

**Who fills it.** The commons job's new `basics` phase (`reading/shelf/docs/COMMONS-JOB.md`). A book article is accepted
only when it reads like a book, names the author and isn't a redirect; the book's own article beats a franchise or film
page. No match = blank, and the page says nothing.

## 4. Matching club books to ISBNs (D3)

**Will adding every Soul Crushers book to Angel's Reading fix it? Mostly, in two halves.**

1. **Commons gets filled: yes.** `wanted_books()` scans every space's `reading_books`. Once Angel's library has them,
   the commons job finds an ISBN-13, cover, year and pages for each book. Reading's add-book lookup (TASK-04) already
   picks an ISBN when you add a book, which beats a blind title search.
2. **The club's own rows still need their ISBN set: not by itself.** `bookclub_books.isbn` stays null. RLS keeps Angel's
   space and the club's space apart, so the club can't read his library. But it **can** read Commons, so matching becomes
   a lookup against `book_facts` by title + author. That's deterministic, not a web search.

Also: the job shouldn't depend on Angel's library. `wanted_books()` should also scan `bookclub_books` (a one-line
union), so a book the club adds next month gets its facts even if nobody has it in Reading.

**Match step** (bookclub schema, `066`):
- `bookclub_match_isbn()`, run by the scribe or maintenance: for each club book with no ISBN, find `book_facts` rows where
  the folded title is equal and the first author's slug is in `author_slugs`.
  - Exactly one match → set `isbn`, `match_by = 'auto'`.
  - Several (editions) → prefer the one with a cover, then the oldest `first_year`; `match_by = 'auto'`.
  - None or ambiguous title → a `later` item `kind = 'isbn'` (replaces 'cover').
- New columns: `bookclub_books.match_by text check in ('auto','me')`, `matched_at`.
- The admin fixes leftovers on the book page with **Find this book** (title + author → up to 5 Commons/Open Library
  results with covers, as TASK-04) → `match_by = 'me'`. This is a club identity fix, not a fact edit, so it's allowed (D7).
- The importer (`065`) runs the match after loading the sheet.

**Expected result:** most of about 200 books match automatically. Leftovers are likely translated titles (*Ficciones*),
subtitles and two-book months (065). A one-screen review list handles those.

## 5. Members' own pages carry over (D2)

A Reading page is personal: it's in the reader's space and in their voice (Reading `STUDIO.md`: "meaning is personal;
facts can be shared"). Carrying it to the club is **opt-in per reader, read live, never copied**.

- **Reading:** a setting, *Show my pages for books I share with my club* (`reading_settings.club_pages boolean default
  false`), plus a link from the Reading account to the club membership (same Studio account: `space_members`).
- **Studio:** a definer function `bookclub_member_pages(isbn13)` for the club space. It returns, for each active club
  member who opted in and has a page for that ISBN: member name, page URL, `updated_at`, and the page's first section
  (`pitch`, or the template's first section). It exposes no other sections, notes or ranks. Only when both accounts are
  linked and the reader opted in.
- **Book Club book page:** the default description (Commons) first, then **From members' Reading**: "Shelby's page ·
  updated 2 d ago", showing the first section and a link to the full page in Reading. Editing happens in Reading only
  (D7). The club page shows no edit control for it.
- **Freshness:** the reader's Reading change has a `change_id`. The club page reads live, so the next load shows it.
  Live refresh across spaces is out of v1.
- **Author pages:** same pattern with `bookclub_member_author_pages(slug)`.
- **The other way (Reading shows the club):** on a Reading book page, "Soul Crushers · Aug 2026 · club 8.4 ·
  *river*", from the club's public views, for readers who are club members. Named scores are already public (v3.2), so
  this leaks nothing new.

## 6. Book Club views and pages

Views in `byoaistudio_bookclub` (`066`). Existing view names and columns stay, so pages change only where noted.

- `books`: `cover_url` = `coalesce(own override, f.cover_url)`; adds `premise`, `standing`, `first_year`,
  `goodreads_avg` from `book_facts` by `isbn`. `meeting_cards`, `slate_cards`, `next_meeting` and `last_meeting` take
  cover and Goodreads from it.
- `authors` (new): slug, name, photo_url, wikipedia, bio_facts, standing, now, born/died, from `reading_split_authors`
  over club books, joined to `author_facts`; plus `book_count` and `club_avg` for the club.
- `author_news` (new): `author_articles` for club authors, newest first, `limit` in the page query.

The club's own `cover_url` stays as an **override** only (a club that wants a different edition's cover). The importer
stops writing it.

**Pages**
- `/m/[slug]` (book): description + source line, Goodreads ×2 beside the club score, words and scores (unchanged),
  members' Reading pages (§5), the author strip with photo.
- `/author/[slug]`: photo, bio + standing + "now", club history with this author (books, scores, words), news list,
  members' Reading author pages.
- Remove: browser Open Library lookup and localStorage in `ui.tsx`, `PHOTOS`, `public/authors/`, JS slugging for author
  links (the views return slugs).
- Without AI, everything above shows. With no Commons data, the page still works: tinted cover card, no description line.

## 7. Goodreads (D5)

Move to `book_facts.goodreads_avg`. The importer moves the sheet's values (the sheet is the source today) into Commons
through the commons writer, with the job's write path: one-off, `basics_source = 'sheet'`. Club views read Commons.
Reading can show it too. **Open:** after the import, how does it stay current? Goodreads has no public API, so v1
freezes the sheet values and adds no scraping.

## 8. Out of v1
- Book-level articles (D4) → v2 (`book_articles`, same shape as `author_articles`).
- The rest of dossier v3 (points, links, sources tables, AI "no search" promise).
- Live cross-space refresh.
- Shared UI code (D6).

## 9. Build order (after the v3.2 readiness gate)

1. **Angel:** add the Soul Crushers books to Reading (in progress). Then run the commons job (covers and photos, existing).
2. **Studio `066`:** Commons columns (§3), the `wanted_books` union, bookclub match + views (§4, §6), Goodreads move (§7).
   Tests: RLS (club can't write Commons), match cases (one, editions, none), the views' fallback.
3. **Commons job `basics` phase:** fill descriptions and bios for club books and authors first (≈200 books), review a 20-row sample.
4. **Book Club site:** switch pages to the views, delete the duplicated code and assets (§6), match review list.
5. **Reading opt-in + `bookclub_member_pages`** (§5), then the Reading → club line.

**Done when:** on a phone, signed out, a club book page shows a real cover, a sourced description and author news, with
no AI. A member who opted in sees their Reading page's first section on the club book page within one load of editing
it in Reading. `public/authors/` and the browser cover lookup are gone.

## 10. Open questions: settled when building (change any of them)
1. Premise only on pages; `standing` exists but is empty in v1.
2. The opt-in covers all of a reader's pages (`reading_profiles.club_pages`, off by default).
3. Inline first section, **signed-in club members only**; signed-out visitors and AIs get nothing (`member_pages` is site-only).
4. Two-book months: views are per book, nothing special needed.
5. Both: the importer runs `match_isbn()` after loading, and `/club` has **Match what we can** + **Find this book**.
