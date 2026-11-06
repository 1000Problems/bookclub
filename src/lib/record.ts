import type { Row } from "./studio";

/** The club record as the pages read it: one batch, the same rows for everyone Studio lets see them. */
export const RECORD = [
  { sql: "select slug, month, year, status, scoring, title, author, book, cover_url, club_score, gr_x2, rank_all, host, host_name, venue_label, premise from meeting_cards order by month desc" },
  { sql: "select meeting, member, name, status, attendance, score, word from meeting_votes" },
  { sql: "select slug, name, status from members order by name" },
  // Authors as Studio names them (book_authors): the same slugs Reading and the Commons use (TASK-55).
  { sql: "select m.slug, m.number, m.food, m.notes, m.meets_at, m.bring, coalesce((select json_agg(json_build_object('name', a.name, 'slug', a.author) order by a.ord) from book_authors a where a.book = m.book), '[]') as authors from meetings m" },
];

export type Vote = { meeting: string; member: string; name: string; attendance: string; score: number | null; word: string | null };
export type Who = { name: string; slug: string };
export type Meet = { authors: Who[]; premise: string | null; slug: string; month: string; year: number; status: string; scoring: string; title: string | null; author: string | null; book: string | null; cover: string | null; score: number | null; gr: number | null; rank: number | null; host: string | null; host_name: string | null; venue: string | null; number: number | null; food: string | null; notes: string | null; meets_at: string | null; bring: string[] | null; votes: Vote[] };

const n = (x: unknown) => (x === null || x === undefined ? null : Number(x));

export function shape(rows: Row[][]) {
  const extra = new Map(rows[3].map((x) => [x.slug, x]));
  const votes = new Map<string, Vote[]>();
  for (const v of rows[1]) {
    const o = { ...v, score: n(v.score) } as Vote;
    votes.set(v.meeting, [...(votes.get(v.meeting) ?? []), o]);
  }
  const all: Meet[] = rows[0].map((m) => {
    const x = extra.get(m.slug);
    return { authors: (typeof x?.authors === "string" ? JSON.parse(x.authors) : x?.authors) ?? [], premise: m.premise ?? null, slug: m.slug, month: m.month, year: m.year, status: m.status, scoring: m.scoring, title: m.title, author: m.author, book: m.book, cover: m.cover_url, score: n(m.club_score), gr: n(m.gr_x2), rank: m.rank_all, host: m.host, host_name: m.host_name, venue: m.venue_label, number: x?.number ?? null, food: x?.food ?? null, notes: x?.notes ?? null, meets_at: x?.meets_at ?? null, bring: x?.bring ?? null, votes: votes.get(m.slug) ?? [] };
  });
  return { all, books: all.filter((m) => m.title), members: rows[2] };
}

export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthOf = (m: { month: string }) => Number(m.month.slice(5, 7)) - 1;
export const when = (m: { month: string; year: number }) => `${MON[monthOf(m)]} ${m.year}`;
export const r2 = (x: number | null | undefined) => (x === null || x === undefined || Number.isNaN(x) ? "—" : String(Math.round(x * 100) / 100));
export const first = (name?: string | null) => (name ?? "").replace(/\s+[A-Z]$/, "");

const hue = (t: string) => { let x = 0; for (const c of t) x = (x * 31 + c.charCodeAt(0)) % 360; return x; };
export const tint = (t: string, l = 0.93, c = 0.035) => `oklch(${l} ${c} ${hue(t)})`;

/** Sheet authors are often "Surname, First". */
export function author(a?: string | null) {
  if (!a) return "";
  let m = a.match(/^(\S+),\s*Jr\.,\s*(.+)$/);
  if (m) return `${m[2]} ${m[1]} Jr.`;
  m = a.match(/^(\S+),\s*([^,]+)$/);
  return m ? `${m[2]} ${m[1]}` : a;
}
export const surname = (a?: string | null) => (author(a).split(/[,&]/)[0].trim().split(" ").pop() ?? "").toUpperCase();
export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const numeric = (m: Meet) => m.votes.filter((v) => v.score !== null);
