import assert from "node:assert/strict";
import fs from "node:fs/promises";

const source = await fs.readFile(new URL("./src/app.jsx", import.meta.url), "utf8");
const match = source.match(/function compactWorksheetRows\(ws\) \{[\s\S]*?\n\}\n\nfunction dataUrlToBlob/);
assert.ok(match, "compactWorksheetRows must be present");
const helper = match[0].replace(/\n\nfunction dataUrlToBlob$/, "");

const columnName = (column) => {
  let result = "";
  for (let n = column + 1; n; n = Math.floor((n - 1) / 26)) result = String.fromCharCode(65 + ((n - 1) % 26)) + result;
  return result;
};
const XLSX = {
  utils: {
    encode_cell: ({ r, c }) => `${columnName(c)}${r + 1}`,
    decode_range: (value) => {
      const parse = (cell) => {
        const [, letters, row] = cell.match(/^([A-Z]+)(\d+)$/);
        let column = 0;
        for (const ch of letters) column = column * 26 + ch.charCodeAt(0) - 64;
        return { r: Number(row) - 1, c: column - 1 };
      };
      const [start, end] = value.split(":");
      return { s: parse(start), e: parse(end || start) };
    },
    encode_range: ({ s, e }) => `${columnName(s.c)}${s.r + 1}:${columnName(e.c)}${e.r + 1}`,
  },
};
const compactWorksheetRows = new Function("XLSX", `${helper}\nreturn compactWorksheetRows;`)(XLSX);

const ws = {
  "!ref": "A1:C5",
  "!rows": [{ hpt: 40 }, { hpt: 220 }, { hpt: 220 }, { hpt: 220 }, { hpt: 220 }],
  A1: { v: "Date" }, B1: { v: "HN" }, C1: { v: "Patient Name" },
  A2: { v: "2026-08-06", s: { font: { bold: true } } }, B2: { v: "111" }, C2: { v: "First case" },
  A4: { v: "2026-08-07", s: { fill: { fgColor: { rgb: "ABCDEF" } } } }, B4: { v: "222" }, C4: { v: "Second case" },
};

compactWorksheetRows(ws);
assert.equal(ws["!ref"], "A1:C3", "empty rows must be removed from the sheet range");
assert.equal(ws.A2.v, "2026-08-06");
assert.equal(ws.A3.v, "2026-08-07", "later case must shift directly after prior case");
assert.deepEqual(ws.A3.s, { fill: { fgColor: { rgb: "ABCDEF" } } }, "cell styling must move with its case");
assert.equal(ws.A4, undefined, "trailing blank cells must be removed");
assert.equal(ws["!rows"][1].hpt, 18, "case rows use compact height");

// Model SheetJS append origin:-1 after cleanup, then compact again.
ws.A4 = { v: "2026-08-08" }; ws.B4 = { v: "333" }; ws.C4 = { v: "New case" }; ws["!ref"] = "A1:C4";
compactWorksheetRows(ws);
assert.equal(ws["!ref"], "A1:C4");
assert.equal(ws.A4.v, "2026-08-08", "new notes append immediately after the last case");
console.log("compactWorksheetRows tests passed");
