# Home shelf v1

Status: design, 2026-11-06. Site only (`bookclub`). No Studio change. Takes the idea of Reading's shelf tabs, without user-made subshelves.

## Goal
The Books tab goes away. Home's Every book section becomes the shelf. Every book page (`/m/...`) stays, and every card opens one.

## Design
- **Place:** where Every book is now, below Arguments.
- **Shelves:** Every book, then one per year with books, newest first. Automatic; nobody manages them. As many years as fit on the screen, the rest in an Older dropdown. A picked older year shows on the dropdown.
- **Order:** By date (newest first) is the default. By score puts the highest first; unscored books go last, newest first.
- **Views:** Covers and Sheet. Both follow the same shelf and order.
- **Rating:** the club's score, as a badge and a bar, gold at 9 or above. No rank. "Not scored" when there's none. Goodreads stays off the cards. Same number as the book page.
- **Stats line:** books, average, words for the shelf. Year shelves add their skipped months.
- **URL:** `/?y=2015&sort=score&view=sheet#books`. Back from a book page lands on the same shelf.
- **Removed:** the rotating top-three hero, and the Books tab.
- **Old links:** `/books` and `/books?y=2015` redirect to the matching shelf. `/history` too.

## Accept
- [x] No Books tab; Home is on for book and author pages
- [x] Every book plus years; the rest in Older; a picked older year shows
- [x] Date default; score sort; unscored last
- [x] Covers and Sheet both follow shelf and sort
- [x] Back from a book page returns to the same shelf
- [x] `/books?y=2015` redirects to that shelf
- [x] Fits at 390px; typecheck and build pass
