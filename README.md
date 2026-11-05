# Book Club (1000Problems)

**Status: v3.2 built and live at bookclub.hadmoney.com (2026-11-05), supersedes v3.1.** No app repo or prod schema yet.

A BYOAI site for book clubs, designed with Soul Crushers (Shelby's club, since 2008). Logistics first ("when / where /
what are we reading / what do I bring"), club chat on the home page (visitors can read it by default; the scribe can
make it members only), score + word go-around, top-3 phone ballot. Reading's real light skin; sign-in through BYOAI Studio
(`db.byoaistudio.com`); works fully **without** AI. BYOAI is optional, for asking the data questions only, with no MCP.

- **Current design:** [BOOK-CLUB-v3.2-DESIGN.md](BOOK-CLUB-v3.2-DESIGN.md) (§2.00 is the latest). It has `## Scenarios` (SC1 front page with
  chat · SC2 all data · SC3 voting + SC3b score go-around · SC4 optional BYOAI DB · SC5 invite/join · SC6 public ↔
  private), each with a fixture, numbered steps and an Accept checklist; per-card home queries (§4.4); function
  contracts (§5.10); the shared seed fixture (Appendix A); the site → Studio call contract (Appendix B); and
  `## byoaistudio changes` (S1–S12) and `## Reading changes` (R1–R9) as checkbox work items.
- Prior art: [BOOK-CLUB-v3-DESIGN.md](BOOK-CLUB-v3-DESIGN.md), [BOOK-CLUB-v2-DESIGN.md](BOOK-CLUB-v2-DESIGN.md) (numbering kept) and
  [BOOK-CLUB-v1-DESIGN.md](BOOK-CLUB-v1-DESIGN.md) (import detail and stats list still referenced).
- Build: Studio (S1–S10, starting from [byoaistudio#1](https://github.com/1000Problems/byoaistudio/pull/1)) ∥ bookclub
  schema + fixture + sheet import ∥ Reading fixes → then the site
  (D1–D7). Done = SC1–SC6 green + one live cycle (§14.2).
- Siblings: Reading (`reading`, `ReadingDocs`), BYOAI Studio (`byoaistudio`). This folder is not a git repo yet.
