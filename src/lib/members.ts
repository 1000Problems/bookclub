import { avg, MON, monthOf, r2, tint, when, type Meet, type Vote } from "./record";
import type { Row } from "./studio";

export const GREEN = "oklch(.50 .10 155)", RED = "oklch(.50 .15 28)";
/** Per-vote comments and miss reasons. Sent on its own: a refusal here must not take the page down. */
export const NOTES = { sql: "select meeting, member, comment, miss_reason from votes where comment is not null or miss_reason is not null" };
export type Notes = Map<string, string>;
export const notesOf = (rows: Row[]): Notes => new Map(rows.map((r) => [`${r.meeting}|${r.member}`, r.comment ?? r.miss_reason ?? ""]));

export const sgn = (x: number | null) => (x === null ? "" : `${x >= 0 ? "+" : "−"}${r2(Math.abs(x))}`);
export const heat = (s: number) => `oklch(${(0.95 - s * 0.04).toFixed(3)} ${(0.03 + s * 0.011).toFixed(3)} 75)`;
export const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(0, 2);
export const kindLabel = (a: string) => (a === "missed" ? "missed" : a === "unfinished" ? "didn't finish" : "no score");

function reasonOf(note: string) {
  const s = note.toLowerCase();
  for (const [re, t] of [[/travel/, "travelling"], [/work/, "work"], [/harvest/, "harvest"], [/sick/, "sick"], [/wedding/, "a wedding"]] as const) if (re.test(s)) return t;
  return s.replace(/[.?]+$/, "");
}

type Entry = { m: Meet; v: Vote };
export type Cell = { slug?: string; bg: string; shadow: string; title: string };

export function profiles(books: Meet[], members: Row[], notes: Notes) {
  const chrono = [...books].reverse(), stamp = (m: Meet) => m.year * 12 + monthOf(m);
  return members.map((mb) => {
    const name = mb.name as string, slug = mb.slug as string;
    const es: Entry[] = chrono.flatMap((m) => m.votes.filter((v) => v.member === slug).map((v) => ({ m, v })));
    const sc = es.filter((e) => e.v.score !== null), score = (e: Entry) => e.v.score!;
    const note = (e: Entry) => notes.get(`${e.m.slug}|${slug}`) ?? "";
    const yrs = es.map((e) => e.m.year), minY = yrs.length ? Math.min(...yrs) : null, maxY = yrs.length ? Math.max(...yrs) : null;
    const average = avg(sc.map(score)), lean = avg(sc.filter((e) => e.m.score !== null).map((e) => score(e) - e.m.score!));
    const byScore = [...sc].sort((a, b) => score(b) - score(a));
    const hosted = books.filter((m) => m.host === slug), missed = es.filter((e) => e.v.attendance === "missed");
    const unfinished = es.filter((e) => e.v.attendance === "unfinished").length;
    const counts: Record<string, number> = {};
    for (const e of missed) { const r = reasonOf(note(e)); if (r) counts[r] = (counts[r] ?? 0) + 1; }
    const reasons = Object.entries(counts).sort((a, b) => b[1] - a[1]), top = reasons[0];
    const best = hosted.filter((m) => m.score !== null).sort((a, b) => b.score! - a.score!)[0];
    const worded = [...es].reverse().filter((e) => e.v.word);
    const lo = sc.length ? Math.min(...sc.map(score)) : 0, hi = sc.length ? Math.max(...sc.map(score)) : 0;
    const half = Math.floor(sc.length / 2);
    const t0 = sc.length ? stamp(sc[0].m) : 0, t1 = sc.length ? stamp(sc[sc.length - 1].m) : 0;
    const leanWord = lean === null ? "Unknown" : lean >= 0.15 ? "Generous" : lean <= -0.15 ? "Tough" : "Even";
    const years = minY === null ? [] : Array.from({ length: maxY! - minY + 1 }, (_, i) => minY + i).map((y) => {
      const ys = chrono.filter((m) => m.year === y);
      const cells: Cell[] = Array.from({ length: 12 }, (_, mo) => {
        const m = ys.filter((x) => monthOf(x) === mo).at(-1);
        if (!m) return { bg: "transparent", shadow: "inset 0 0 0 1px #f1f0eb", title: `${MON[mo]} ${y} · no meeting` };
        const v = m.votes.find((x) => x.member === slug), t = `${when(m)} · ${m.title}`, n = notes.get(`${m.slug}|${slug}`);
        if (!v) return { slug: m.slug, bg: "#fafaf8", shadow: "inset 0 0 0 1px #eeede8", title: `${t} · not recorded` };
        if (v.score !== null) return { slug: m.slug, bg: heat(v.score), shadow: "none", title: `${t} · ${r2(v.score)}${v.word ? ` · ${v.word}` : ""}` };
        if (v.attendance === "missed") return { slug: m.slug, bg: "#e4e2dc", shadow: "none", title: `${t} · missed${n ? ` (${n})` : ""}` };
        return { slug: m.slug, bg: "#fff", shadow: "inset 0 0 0 1px #b9b6ae", title: `${t} · ${n || kindLabel(v.attendance)}` };
      });
      return { y, cells, avg: r2(avg(sc.filter((e) => e.m.year === y).map(score))) };
    });
    return {
      slug, name, status: mb.status as string, ini: initials(name), current: mb.status === "active",
      span: minY === null ? "" : `${minY}–${maxY}`, since: minY === null ? "" : mb.status === "active" ? `At the table since ${minY}` : `${minY}–${maxY}`,
      average, count: sc.length, hostedN: hosted.length, missedN: missed.length, unfinished, lean, leanWord,
      leanColor: lean === null ? "#5e5c56" : lean >= 0.15 ? GREEN : lean <= -0.15 ? RED : "#3d3b37",
      leanBg: lean === null ? "#f6f5f1" : lean >= 0.15 ? "oklch(.95 .03 155)" : lean <= -0.15 ? "oklch(.965 .025 28)" : "#f6f5f1",
      hi: byScore[0], lo: byScore.at(-1), top: byScore.slice(0, 3), bottom: byScore.slice(-2).reverse(),
      words: worded.slice(0, 6).map((e) => ({ word: e.v.word!, slug: e.m.slug, title: `${e.m.title} · ${r2(e.v.score)}` })),
      allWords: worded.map((e) => ({ word: e.v.word!, slug: e.m.slug, title: `${when(e.m)} · ${e.m.title} · ${r2(e.v.score)}`, px: e.v.score !== null ? Math.round(15 + ((e.v.score - lo) / ((hi - lo) || 1)) * 15) : 15 })),
      bestHost: best ? `Best night hosted: ${best.title} (${r2(best.score)})` : "", reasonShort: top ? `, mostly ${top[0]}` : "",
      missLine: `Missed ${missed.length}${top ? `, most often for ${top[0]} (${top[1]})` : ""}. ${unfinished} unfinished.`,
      attended: es.length ? `${Math.round((sc.length / es.length) * 100)}%` : "—", attLine: `${sc.length} scored · ${missed.length} missed · ${unfinished} unfinished`,
      reasons, hosted: [...hosted], years, y0: sc[0]?.m.year ?? "", y1: sc.at(-1)?.m.year ?? "",
      trend: sc.map((e) => ({ left: ((stamp(e.m) - t0) / ((t1 - t0) || 1)) * 100, mine: (10 - score(e)) * 10, club: e.m.score !== null ? (10 - e.m.score) * 10 : null, title: `${when(e.m)} · ${e.m.title} · theirs ${r2(score(e))} · club ${r2(e.m.score)}` })),
      trendLine: sc.length > 3 ? `First half of their books: ${r2(avg(sc.slice(0, half).map(score)))} average. Second half: ${r2(avg(sc.slice(half).map(score)))}.` : "",
      entries: [...es].reverse().map((e) => {
        const has = e.v.score !== null, d = has && e.m.score !== null ? e.v.score! - e.m.score : null;
        return { m: e.m, score: e.v.score, delta: d, stamp: stamp(e.m), word: has ? e.v.word ?? "" : note(e) || kindLabel(e.v.attendance), hosted: e.m.host === slug };
      }),
      tint: { hero: tint(name, 0.94, 0.035), dot: tint(name, 0.85, 0.08), mark: tint(name, 0.55, 0.13), bar: tint(name, 0.72, 0.11) },
    };
  });
}
export type Profile = ReturnType<typeof profiles>[number];

const PLACE = /^(.*?\b(?:house|office|winery|cabin|patio|place|cottage|backyard|yard|pad|shack|fort|cafe|zoom|hangouts)\b)[\s,]*(.*)$/i;
const NOTE_DATE = /^((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*,?\s+\w+\s+\d+|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d+(?:\/\d+)?)[\s,]*/;
/** The sheet keeps date, house and food in one note. Split it; anything unclear stays in the note. */
export function splitNotes(notes: string | null) {
  let rest = (notes ?? "").trim(), date = "", place = "";
  const d = rest.match(NOTE_DATE);
  if (d) { date = d[1].replace(",", ""); rest = rest.slice(d[0].length); }
  const p = rest.match(PLACE);
  if (p) { place = p[1].replace(/^(will be )?at\s+/i, "").trim(); rest = p[2]; }
  return { date, place, food: date || place ? rest.replace(/^[,\s]+/, "").trim() : "" };
}
