#!/usr/bin/env node
// Lists every difference between the reference and an export, skipping design EXCEL-EXPORT-v1 §8. Exit 0 means match.
//   node scripts/compare-sheet.mjs <reference.xlsx> <export.xlsx> [--limit 60]
import { createRequire } from "node:module";
const ExcelJS = createRequire(import.meta.url)("exceljs");
const [refPath, expPath, ...rest] = process.argv.slice(2);
if (!refPath || !expPath) throw new Error("usage: compare-sheet.mjs <reference.xlsx> <export.xlsx>");
const limit = rest.includes("--limit") ? Number(rest[rest.indexOf("--limit") + 1]) : 60;
const open = async (p) => { const w = new ExcelJS.Workbook(); await w.xlsx.readFile(p); return w.worksheets[0]; };
const a = await open(refPath), b = await open(expPath);
const out = [], say = (where, what, x, y) => out.push(`${where}  ${what}: ${JSON.stringify(x)} → ${JSON.stringify(y)}`);

const norm = (s) => String(s).toLowerCase().replace(/[\s$]/g, "");
function value(c) {
  const v = c.value;
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "object" && v.hyperlink) return norm(`=hyperlink("${v.hyperlink}","${v.text}")`);     // §8.2
  if (typeof v === "object" && ("formula" in v || "sharedFormula" in v)) return norm(`=${c.formula ?? v.formula}`);
  if (typeof v === "object" && v.richText) return norm(v.richText.map((t) => t.text).join(""));
  return norm(v);
}
const fill = (c) => (c.fill?.type === "pattern" && c.fill.pattern === "solid" ? c.fill.fgColor?.argb ?? "" : "");
const style = (c) => ({ font: c.font?.name || "Arial", size: c.font?.size || 10, bold: !!c.font?.bold, underline: !!c.font?.underline, color: c.font?.color?.argb ?? "",
  numFmt: c.numFmt ?? "", h: c.alignment?.horizontal ?? "", v: c.alignment?.vertical ?? "" });
const master = (c) => !c.isMerged || c.master === c;

const rows = Math.max(a.rowCount, b.rowCount);
for (let r = 1; r <= rows; r++) for (let n = 1; n <= 42; n++) {
  const x = a.getRow(r).getCell(n), y = b.getRow(r).getCell(n);
  if (!master(x)) continue;
  const row5 = r === 5 && n >= 11;                          // §8.1
  const vx = value(x), vy = value(y);
  if (vx !== vy && !row5) say(x.address, "value", vx, vy);
  if (fill(x) !== fill(y) && fill(x) !== "FFFFFF00" && fill(y) !== "FFFFFF00") say(x.address, "fill", fill(x), fill(y));   // §8.5 yellow follows next_meeting
  if (!vx || !vy) continue;                                 // §8.6
  const sx = style(x), sy = style(y);
  for (const k of Object.keys(sx)) if (sx[k] !== sy[k] && !(row5 && k === "numFmt")) say(x.address, k, sx[k], sy[k]);
}
const merges = (w) => [...w.model.merges].sort().join(" ");
if (merges(a) !== merges(b)) say("sheet", "merges", merges(a), merges(b));
const fz = (w) => { const v = w.views[0] ?? {}; return `${v.state}:${v.ySplit ?? 0}`; };
if (fz(a) !== fz(b)) say("sheet", "freeze", fz(a), fz(b));
for (let n = 1; n <= 42; n++) {
  const x = a.getColumn(n), y = b.getColumn(n);
  if (Math.abs((x.width ?? 12.63) - (y.width ?? 12.63)) > 0.5) say(x.letter, "width", x.width, y.width);
  if (!!x.hidden !== !!y.hidden) say(x.letter, "hidden", x.hidden, y.hidden);
}
if (a.getRow(3).height !== b.getRow(3).height) say("row 3", "height", a.getRow(3).height, b.getRow(3).height);

const kinds = {}; for (const l of out) { const k = l.split("  ")[1].split(":")[0]; kinds[k] = (kinds[k] ?? 0) + 1; }
out.slice(0, limit).forEach((l) => console.log(l));
console.log(`${out.length} differences`, kinds);
process.exit(out.length ? 1 : 0);
