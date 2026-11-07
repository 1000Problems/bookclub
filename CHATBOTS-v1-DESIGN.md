# Chatbots v1 (draft): Bring Your Own AI for plain chat apps

Status: draft, not started. Written 2026-11-07 after Angel tried the connect prompt in free Gemini.

## The problem

Bring Your Own AI works today only with an AI that can call an API: it sends the code to `db.byoaistudio.com/connect`
(a POST), then sends SQL with its key. That works in AI tools that run commands (Claude Code, Codex, Gemini CLI) and in
paid chat apps with an agent or computer-use mode. It does not work in a normal chat window, free or paid:

1. **It can't read the instructions.** The prompt links GitHub's page for the README, which is mostly page chrome and
   scripts. Free Gemini reported "the page does not contain any readable text".
2. **It can't make the calls.** A chat window can at most open a web page. It can't POST, and it can't send a header.

Until this ships, the site says plainly: you need an AI that can connect to apps, usually a paid plan.

## The idea: a read link

A member gets a **read link** on the Bring Your Own AI page and pastes it into any chat app:
`https://db.byoaistudio.com/r/<token>/`. It opens a small site of plain-text pages that link to each other. The AI
answers by following links.

Why pages and links, not a query URL: chat apps usually open only addresses they were given, either pasted by the user or
found on a page they already opened. They tend to refuse addresses they make up, so `…/q?sql=select…` would fail.
Every page this design adds is reachable by a link from the index.

### Pages (plain text or Markdown, no scripts)

| Page | Content |
|---|---|
| `/r/<t>/` | What this is, who it belongs to, when it expires, and links to everything below |
| `next` | Next meeting: date, host, place, bring, RSVPs, the five and the ranking state |
| `books` | Every book by club score, newest-year links; each links to its page |
| `books/<slug>` | One book: date, host, club score and rank, every member's score and word, missed and why |
| `members` | Everyone at the table and past members; each links to their page |
| `members/<slug>` | Average, lean vs the club, highs and lows, words, hosted, missed |
| `polls` | Current and past polls with results (same rules as `poll_list()`) |
| `chat` | Recent club chat (members only, as on Home) |
| `years/<y>` | A year: books, averages, hosts, best and worst |

### Rules

- **Read only.** No page writes, and no parameter turns into a write.
- **The member's rights, no more.** Pages run as that member through the same views and RLS. Admin data never shows.
- **Short-lived and revocable.** Default 24 hours. Revoke on the Bring Your Own AI page. One live link per member;
  a new one replaces the old.
- **The key is in the address.** Chat apps log the pages they open, so the link can end up in their history. That's why
  it is read-only and expires. The page says to treat it like a private document link.
- Rate-limited per token. `cache-control: no-store`, but some apps cache anyway, so fresh RSVPs may show late.

### Also fixes the instructions

Serve the README as plain text from our own site (`bookclub.hadmoney.com/ai/docs`) and point both prompts at it.

## Work

1. Studio: `read_links` (token hash, member, expires, revoked) and `/r/<token>/…` routes that render the pages above
   from the club views, as that member.
2. Site: on `/ai`, a second option, **Get a read link**: the link, its expiry, Copy, Revoke. A sentence on which apps
   it suits (any chat app that can open links) and what it can't do (change anything, answer outside the pages).
3. Docs: the plain-text README on our site; the prompts link there.
4. Test in Claude.ai, ChatGPT and free Gemini before telling the club. Write down which can open and follow links.

## Open questions

- Expiry: 24 hours, a week, or until revoked?
- Pages: leave chat out? Add Talk threads, write-ups, the go-around?
- Later: a real connector (MCP server) for chat apps that support custom connectors, including writes. This is more work,
  usually needs a paid plan, and earlier designs avoided MCP on purpose.
