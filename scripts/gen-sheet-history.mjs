#!/usr/bin/env node
// Writes src/lib/sheet/history.json: the format quirks of past rows, keyed by meeting and column. Compares the reference
// with an export made while history.json was {}. Formats only, never data.
//   node scripts/gen-sheet-history.mjs <reference.xlsx> <export.xlsx>
import fs from "node:fs";
import { createRequire } from "node:module";
const ExcelJS = createRequire(import.meta.url)("exceljs");
const [refPath, expPath] = process.argv.slice(2);
const open = async (p) => { const w = new ExcelJS.Workbook(); await w.xlsx.readFile(p); return w.worksheets[0]; };
const a = await open(refPath), b = await open(expPath);
const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const out = {}, seen = new Set();
let year = null;
for (let r = 6; r <= a.rowCount; r++) {
  const y = String(a.getRow(r).getCell(1).value ?? ""), mon = String(a.getRow(r).getCell(2).value ?? "");
  if (/^20\d\d$/.test(y)) year = y;
  if (!MONTHS.includes(mon)) continue;
  let slug = `${year}-${String(MONTHS.indexOf(mon) + 1).padStart(2, "0")}`;
  if (seen.has(slug)) slug += "b";
  seen.add(slug);
  for (let n = 1; n <= 42; n++) {
    const x = a.getRow(r).getCell(n), z = b.getRow(r).getCell(n);
    if (x.value === null || z.value === null) continue;
    const q = {}, l = x.address.replace(/\d+/, "");
    if ((x.numFmt ?? "") !== (z.numFmt ?? "")) q.numFmt = x.numFmt ?? "";
    if ((x.alignment?.horizontal ?? "") !== (z.alignment?.horizontal ?? "")) q.h = x.alignment?.horizontal ?? "";
    if (!!x.font?.bold !== !!z.font?.bold && n !== 3) q.bold = !!x.font?.bold;
    if ((x.font?.size ?? 10) !== (z.font?.size ?? 10)) q.size = x.font?.size ?? 10;
    if (n === 3 && !x.font?.color && z.font?.color) q.plain = true;
    if (Object.keys(q).length) (out[slug] ??= {})[l] = q;
  }
}
fs.writeFileSync("src/lib/sheet/history.json", JSON.stringify(out));
console.log(`${Object.keys(out).length} meetings`);
