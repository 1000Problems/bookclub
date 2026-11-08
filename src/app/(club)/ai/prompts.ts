/** "Try asking your AI": the tutorial. Your AI can do everything you can on the site and nothing you can't, so every
 *  prompt works with the member's own access. "Says no" marks the one thing nobody can do: see secret scores. */
export type Kind = "Read" | "Change" | "Says no";
export type Example = { kind: Kind; ask: string; does: string };
export type Section = { key: string; title: string; items: Example[] };

const r = (ask: string, does: string): Example => ({ kind: "Read", ask, does });
const c = (ask: string, does: string): Example => ({ kind: "Change", ask, does });
const no = (ask: string, does: string): Example => ({ kind: "Says no", ask, does });

export const MEMBER: Section[] = [
  { key: "start", title: "Start here", items: [
    r("Who am I in the club, and what can you do for me here?", "Reads your name and role, then tells you what it can help with."),
    r("When's the next meeting, who's hosting, and who's coming?", "The same card you see on Home, with the RSVPs."),
    r("What's the best book we've ever read, and what did people say about it?", "Every score and word since 2008."),
  ] },
  { key: "next", title: "Next meeting", items: [
    r("What are we reading next, how long is it, and what's it about?", "The next meeting's book, with the shared book facts."),
    r("Give me a 2-minute primer on this month's book without spoilers.", "The book's facts plus what your AI already knows."),
    r("What should I bring, and where exactly are we meeting?", "The host's notes and directions for the next meeting."),
    c("RSVP me yes for the next meeting.", "Your RSVP shows on Home, signed as your AI. Undo any time."),
  ] },
  { key: "pick", title: "Picking", items: [
    r("What are the five candidates, and what's the pitch for each?", "The current slate, with each book's pitch."),
    r("Which of the five are most like books we scored highly?", "Compares the slate with our history."),
    r("Help me rank the five. Ask me a few questions first.", "It helps you think. You still vote on the site."),
    r("How close was the last vote?", "Totals only. Who ranked what stays secret."),
    r("Which books keep getting pitched but never picked?", "Books on past slates that never won."),
  ] },
  { key: "score", title: "Score night", items: [
    r("How did last month's meeting go: the score, the rank and the top words?", "Last meeting's club score, rank and words."),
    r("Remind me how I scored books by this author before.", "Your own past scores for the author."),
    c("Enter my score: 8.2, word 'relentless'.", "Works while scoring is open, the same as entering it on the site."),
    no("Show me Shelby's score before the reveal.", "It can't, because you can't. Your AI sees only what you can."),
  ] },
  { key: "history", title: "History", items: [
    r("Our top 10 books of all time, with scores.", "Ranked club scores since 2008."),
    r("Our best and worst year, and why.", "Averages by year, with the books behind them."),
    r("Which authors have we read most, and how did they do?", "Counts and scores by author."),
    r("Where do we disagree most with Goodreads?", "Club score next to the Goodreads average."),
    r("How has our fiction and nonfiction mix changed over the years?", "The mix by year and by era."),
    r("Whose picks as host score best?", "Each host's average pick score."),
  ] },
  { key: "me", title: "Me", items: [
    r("How do my scores compare to everyone else's?", "Your highs, lows and average next to the club's."),
    r("Which books have I missed, and why?", "Your missed nights and the reasons on record."),
    r("Who in the club scores most like me?", "Compares your scores with each member's on the same books."),
    r("What words do I use most?", "Your words at the table, counted."),
  ] },
  { key: "beyond", title: "Beyond", items: [
    r("Tell me about this month's author: life, other books, recent news.", "Author bio and news from the shared facts."),
    r("Recommend 5 books like our top 10 that we haven't read.", "Checks the history so it doesn't suggest repeats."),
    c("Post in the chat that I'm bringing wine.", "Goes on Home, signed as your AI. Undo any time."),
    c("Write up last month's meeting from my notes.", "Shows on the book's page, signed as your AI. Undo any time."),
  ] },
];

/** Shown only to admins, on its own tab. */
export const ADMIN: Section[] = [
  { key: "admin", title: "Admin", items: [
    c("Set up January: Tim hosts, the 22nd at 7, at his place.", "Updates the month for everyone, as in Admin."),
    c("Make Project Hail Mary the book for January.", "Sets the month's book. Undo any time."),
    c("Put these five on the slate, with a one-line pitch each.", "Builds the next slate for the vote."),
    r("Who hasn't RSVP'd for the next meeting?", "The RSVP board, with who's missing."),
    r("Who's due to host next?", "The host rotation."),
    r("Which months have missing scores or words?", "Gaps in the record, month by month."),
    c("Fix last March: the book was The Road, not No Country.", "Corrects the month. Signed as your AI, undo any time."),
    c("Fill in the missing details for our books: page counts and descriptions.", "Adds book facts where they're empty."),
    r("Here's a photo of last night's score sheet. Read it back to me.", "Your AI reads the photo. You enter the scores yourself."),
    c("Post a poll: should we skip December?", "Goes on Home under the chat."),
  ] },
];

/** What's live moves first; sections that would come back empty for this member are dropped. */
export function arrange(ctx: { scoring: boolean; voting: boolean; scored: boolean }) {
  const first = ctx.scoring ? "score" : ctx.voting ? "pick" : null;
  const xs = MEMBER.filter((s) => s.key !== "me" || ctx.scored);
  const i = xs.findIndex((s) => s.key === first);
  return i > 0 ? [xs[0], xs[i], ...xs.slice(1).filter((s) => s.key !== first)] : xs;
}
