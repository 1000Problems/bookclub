import ExcelJS from "exceljs";
import type { Row } from "@/lib/studio";
import history from "./history.json";
import { BLACK, BLUE, colLetter, colNumber, COLUMN_COUNT, FIRST_BODY_ROW, FONT, FREEZE_ROW, FULL_YEARS_FROM, GREEN, GREEN_OWED, GREY, HEADS, MEMBERS, MERGES, MONTHS, NEW_MEMBER_WIDTHS,
  NO_PINK, NOTE_INK, PINK, RED, ROW3_HEIGHT, TITLE, WHITE, WIDTHS, YEAR_TAIL, yearGap, YELLOW, type MemberColumn } from "./layout";
import type { SheetRecord } from "./load";

type Style = { numFmt?: string; size?: number; bold?: boolean; h?: string; plain?: boolean };
const HISTORY = history as Record<string, Record<string, Style>>;

const NOTE_DAY = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "short", month: "short", day: "numeric" });
/** An upcoming month has no typed notes yet: write them the sheet's way from its date, place and food ("Thu, Nov 26 Tom's Green chili"). */
export function planNote(m: Row): string | null {
  if (m.status !== "planned") return null;
  const day = m.meets_at ? NOTE_DAY.format(new Date(m.meets_at)) : null;
  return [day, m.venue_label, m.food].filter(Boolean).join(" ") || null;
}
const num = (s: string) => (s !== "" && !Number.isNaN(Number(s)) ? Number(s) : null);
const lastName = (m: Row) => String(m.label).trim().split(/\s+/).at(-1)!.toLowerCase();

/** The sheet's columns, plus anyone with a vote who isn't on it: alphabetical, after the last column in use (§5.1). */
function columns(r: SheetRecord): { cols: MemberColumn[]; added: MemberColumn[] } {
  const known = new Set(MEMBERS.map((m) => m.member)), voted = new Set(r.votes.filter((v) => v.sheet_vote !== "").map((v) => v.member));   // "" = only in the J text
  let n = colNumber("AK");
  const added = r.members.filter((m) => !known.has(m.slug) && voted.has(m.slug)).sort((a, b) => lastName(a).localeCompare(lastName(b)))
    .map((m) => { const vote = colLetter(++n), comment = colLetter(++n); return { member: m.slug as string, vote, comment, label: vote }; });
  return { cols: [...MEMBERS, ...added], added };
}

/** Sheet order: newest year first, one entry per row. */
function body(r: SheetRecord) {
  const by = new Map<string, Row[]>();
  for (const m of r.meetings) { const k = String(m.slug).slice(0, 7); by.set(k, [...(by.get(k) ?? []), m].sort((a, b) => String(a.slug).localeCompare(String(b.slug)))); }
  const years = [...new Set(r.meetings.map((m) => Number(String(m.slug).slice(0, 4))))].sort((a, b) => b - a);
  const out: ({ year: number; first: boolean; month: string | null; m: Row | null; note?: string } | null)[] = [];
  years.forEach((y, i) => {
    let first = true;
    for (let mo = 11; mo >= 0; mo--) {
      const key = `${y}-${String(mo + 1).padStart(2, "0")}`, list = by.get(key) ?? [];
      if (!list.length && y < FULL_YEARS_FROM) continue;
      for (const m of list.length ? list : [null]) { out.push({ year: y, first, month: MONTHS[mo], m }); first = false; }
    }
    const tail = YEAR_TAIL[y];
    if (tail) { for (const month of tail.months) out.push({ year: y, first: false, month, m: null }); out.push({ year: y, first: false, month: null, m: null, note: tail.note }); }
    if (i < years.length - 1) for (let g = 0; g < yearGap(y); g++) out.push(null);
  });
  return out;
}

type Cell = { value: ExcelJS.CellValue; green?: boolean } | null;
function voteCells(r: Row | undefined, m: Row, member: string, active: boolean): { vote: Cell; comment: Cell } {
  const cells = (m.sheet_cells ?? {}) as Record<string, string>;
  const typed = (s: string): Cell => (s === "" ? null : { value: num(s) ?? s });
  if (r) {
    if (r.sheet_vote !== null || r.sheet_comment !== null) return { vote: typed(r.sheet_vote ?? ""), comment: r.sheet_comment ? { value: r.sheet_comment } : null };
    const words = [r.word && `word: ${r.word}`, r.comment].filter(Boolean).join(" ");
    if (r.attendance === "voted" || r.attendance === "partial") return { vote: { value: Number(r.score) }, comment: words ? { value: words } : null };
    if (r.attendance === "missed" || r.attendance === "out") return { vote: { value: r.sheet_code ?? "miss" }, comment: r.miss_reason ? { value: r.miss_reason } : null };
    return { vote: { value: r.score !== null ? Number(r.score) : r.sheet_code ?? "dnf" }, comment: r.comment ? { value: r.comment } : null };
  }
  const green = GREEN_OWED.has(m.slug);
  const v = cells[`${member}.vote`], c = cells[`${member}.comment`];
  if (v !== undefined || c !== undefined) return { vote: v ? { value: v, green: v === "?" && green } : null, comment: c ? { value: c, green: c === "?" && green } : null };
  if (!m.sheet_history && m.status === "met" && active) return { vote: { value: "?", green: true }, comment: null };
  return { vote: null, comment: null };
}

/** Pure: the record in, a workbook out. */
export function renderSheet(r: SheetRecord): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Books", { views: [{ state: "frozen", ySplit: FREEZE_ROW, topLeftCell: "A5" }], properties: { defaultRowHeight: 12.75, defaultColWidth: 12.63 } as ExcelJS.WorksheetProperties });
  const { cols, added } = columns(r);
  const base = { name: FONT, size: 10 };
  const put = (addr: string, value: ExcelJS.CellValue, s: Partial<ExcelJS.Font> = {}, a: Partial<ExcelJS.Alignment> = {}, numFmt?: string, fill?: string) => {
    const c = ws.getCell(addr);
    if (value !== null) c.value = value;
    c.font = { ...base, ...s };
    c.alignment = { vertical: "top", wrapText: true, ...a };
    if (numFmt) c.numFmt = numFmt;
    if (fill) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill }, bgColor: { argb: fill } };
    return c;
  };

  WIDTHS.forEach(([l, width, hidden]) => { const c = ws.getColumn(l); c.width = width; if (hidden) c.hidden = true; });
  for (const m of added) { ws.getColumn(m.vote).width = NEW_MEMBER_WIDTHS.vote; ws.getColumn(m.comment!).width = NEW_MEMBER_WIDTHS.comment; ws.mergeCells(`${m.vote}3:${m.comment}3`); }
  MERGES.forEach((x) => ws.mergeCells(x));
  const center = { horizontal: "center" as const };

  // Rows 1–4
  put("A1", TITLE, { size: 18, bold: false });
  const who = new Map(r.members.map((m) => [m.slug as string, m]));
  ws.getRow(3).height = ROW3_HEIGHT;
  for (const c of cols) {
    const m = who.get(c.member), b = m?.birthday ? String(m.birthday).slice(0, 10).split("-") : null;
    const tail = b ? ` (${Number(b[1])}/${Number(b[2])}/${b[0].slice(2)})` : m?.birthday_text ? ` (${m.birthday_text})` : "";
    put(`${c.vote}3`, null, { bold: true, color: { argb: WHITE } }, center, undefined, BLACK);
    if (c.comment && c.label === c.comment) put(`${c.comment}3`, null, { bold: true, color: { argb: WHITE } }, center, undefined, BLACK);
    if (m) ws.getCell(`${c.label}3`).value = `${m.label}${tail}`;
    put(`${c.vote}4`, "vote", { color: { argb: WHITE } }, center, undefined, BLACK);
    if (c.comment) put(`${c.comment}4`, "comments", { color: { argb: WHITE } }, c.comment === "AD" ? { horizontal: "left" } : center, undefined, BLACK);
  }
  for (const l of ["A", "C", "D", "E", "F", "G", "H", "I", "J"]) {
    put(`${l}4`, HEADS[l] ?? null, { color: { argb: WHITE } }, center, l === "A" || l === "I" ? "@" : l === "F" || l === "G" ? "#,##0.00" : undefined, BLACK);
  }

  // Body
  const rows = body(r), byCell = new Map(r.votes.map((v) => [`${v.meeting}|${v.member}`, v]));
  const last = cols.at(-1)!.vote, lastRow = FIRST_BODY_ROW + rows.length - 1, voteNumbers = new Map(cols.map((c) => [c.vote, [] as number[]]));
  rows.forEach((row, i) => {
    if (!row) return;
    const n = FIRST_BODY_ROW + i, m = row.m, q = (m && HISTORY[m.slug]) || {};
    const st = (l: string, d: Style, value: ExcelJS.CellValue, font: Partial<ExcelJS.Font> = {}) => {
      const s = { ...d, ...q[l] };
      put(`${l}${n}`, value, { ...font, ...(s.plain ? { color: undefined } : {}), ...(s.size ? { size: s.size } : {}), ...(s.bold !== undefined ? { bold: s.bold } : {}) }, s.h ? { horizontal: s.h as ExcelJS.Alignment["horizontal"] } : {}, s.numFmt);
    };
    if (row.first) st("A", { size: 18, bold: true, h: "center", numFmt: "@" }, String(row.year));
    else if (m) st("A", { size: 10, h: "center", numFmt: "@" }, m.sheet_number ?? (m.number !== null ? String(m.number) : m.status === "skipped" ? "x" : null));
    if (row.month) st("B", { size: 12, bold: true }, row.month);
    if (row.note) { st("I", { numFmt: "@" }, row.note, { color: { argb: NOTE_INK } }); ws.getCell(`I${n}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE }, bgColor: { argb: WHITE } }; }
    if (!m) return;
    const yellow = r.next === m.slug;

    if (m.status === "skipped") st("C", {}, m.sheet_title ?? "-- skipped --", { color: { argb: BLUE } });
    else if (m.title) {
      const title = String(m.title), color = { argb: m.title_color === "red" ? RED : m.title_color === "plain" ? "FF000000" : BLUE };
      st("C", {}, m.link_url ? { formula: `HYPERLINK("${m.link_url}","${title.replace(/"/g, '""')}")`, result: title } : title,
        { color, bold: !!m.title_bold, ...(m.link_url ? { underline: true } : {}) });
    }
    if (m.author) st("D", {}, m.author);
    const host = m.sheet_host ?? (m.host_name ? String(m.host_name).split(/\s+/)[0] : null);
    if (host !== null) st("E", {}, host);
    const note = m.notes ?? planNote(m);
    if (note) st("I", {}, note);
    if (m.sheet_voting) st("J", {}, m.sheet_voting);

    // Votes first: F's cached result needs them.
    const row_: number[] = [];
    for (const c of cols) {
      const v = byCell.get(`${m.slug}|${c.member}`), { vote, comment } = voteCells(v, m, c.member, who.get(c.member)?.status === "active");
      for (const [l, x, h] of [[c.vote, vote, "center"], [c.comment, comment, ""]] as [string | null, Cell, string][]) {
        if (!l || !x) continue;
        st(l, { h }, x.value);
        if (x.green) { const g = ws.getCell(`${l}${n}`); g.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN }, bgColor: { argb: GREEN } }; }
        if (l === c.vote && typeof x.value === "number") { row_.push(x.value); voteNumbers.get(c.vote)!.push(x.value); }
      }
    }
    const fNum = { numFmt: "#,##0.0", h: "center" };
    if (m.sheet_score !== null) { if (m.sheet_score !== "") st("F", fNum, m.sheet_score); }
    else if (m.no_score) st("F", fNum, "---");
    else if (row_.length) st("F", fNum, { formula: `AVERAGE(K${n}:${last}${n})`, result: row_.reduce((a, b) => a + b, 0) / row_.length });
    if (m.sheet_grx2 !== null) {
      const f = String(m.sheet_grx2).match(/^=([\d.]+)\*([\d.]+)$/);
      st("G", fNum, f ? { formula: `${f[1]}*${f[2]}`, result: Number(f[1]) * Number(f[2]) } : String(m.sheet_grx2).startsWith("=") ? { formula: String(m.sheet_grx2).slice(1), result: undefined as never } : num(m.sheet_grx2) ?? m.sheet_grx2);
    } else if (m.goodreads_avg !== null) st("G", fNum, { formula: `ROUND(${m.goodreads_avg},2)*2`, result: Math.round(Number(m.goodreads_avg) * 100) / 100 * 2 });
    if (yellow) for (let c = 1; c <= COLUMN_COUNT; c++) { const x = ws.getRow(n).getCell(c); x.fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW }, bgColor: { argb: YELLOW } }; }
  });

  // Row 5: one range for everybody.
  for (const c of cols) {
    const range = `${c.vote}${FIRST_BODY_ROW}:${c.vote}${lastRow}`, nums = voteNumbers.get(c.vote)!.filter((x) => x > 0), sum = nums.reduce((a, b) => a + b, 0);
    const font = { color: { argb: GREY } }, pink = NO_PINK.has(c.vote) ? undefined : PINK;
    put(`${c.vote}5`, { formula: `SUM(${range})/COUNTIF(${range},">0")`, result: nums.length ? sum / nums.length : 0 }, font, center, "#,##0.0", pink);
    if (c.comment) put(`${c.comment}5`, { formula: `COUNTIF(${range},">0")`, result: nums.length }, font, NO_PINK.has(c.comment) ? center : { horizontal: "left" }, NO_PINK.has(c.comment) ? "#,##0.0" : "#,##0", NO_PINK.has(c.comment) ? undefined : PINK);
  }
  return wb;
}
