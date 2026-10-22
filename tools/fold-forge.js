#!/usr/bin/env node
/* Shadow Fold sheet forge + verifier.
 *
 * The module deals the target at run time: it picks `wants` orbit
 * representatives at random, folds them through the sheet's creases, and throws
 * the deal away unless the paired-check proves it solvable. This tool carries
 * the same arithmetic (shfPositions / shfUnit / shfTargetSolvable / shfDeal,
 * transcribed from game-shadow-fold.js) and asks three questions of a sheet:
 *
 *   1. the deal stays solvable across many seeded deals - never the reserve;
 *   2. every crease the sheet intends is actually needed for that deal;
 *   3. the authored reserve the module falls back to is itself clean.
 *
 * Usage:
 *   node tools/fold-forge.js list [f13 f20 ...]  # verify shipped/one sheets
 *   node tools/fold-forge.js forge f13           # print one new verified sheet
 */
"use strict";

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "assets", "app", "game-shadow-fold.js");

function loadSheets() {
  const file = fs.readFileSync(FILE, "utf8");
  const start = file.indexOf("var shfSheets = [");
  if (start < 0) throw new Error("shfSheets not found");
  const open = file.indexOf("[", start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < file.length; i += 1) {
    const ch = file[i];
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  /* eslint-disable-next-line no-new-func */
  return new Function("return " + file.slice(open, end))();
}

/* ---- the module's own arithmetic, transcribed ---------------------------------- */
function shfKey(x, y) {
  return x + "," + y;
}
function shfNorm(list) {
  const out = [];
  (list || []).forEach((cell) => {
    if (typeof cell === "string") {
      const parts = cell.split(",");
      out.push({ x: parseInt(parts[0], 10), y: parseInt(parts[1], 10) });
    } else if (cell && typeof cell.x === "number" && typeof cell.y === "number") {
      out.push({ x: cell.x, y: cell.y });
    }
  });
  return out;
}
function shfMirror(cell, fold) {
  return fold.axis === "v"
    ? { x: fold.line - cell.x, y: cell.y }
    : { x: cell.x, y: fold.line - cell.y };
}
function shfIn(cell, side) {
  return cell.x >= 0 && cell.y >= 0 && cell.x < side && cell.y < side;
}
function shfPositions(stamps, folds, side) {
  const seen = {};
  const out = [];
  const queue = shfNorm(stamps);
  const lines = folds || [];
  while (queue.length) {
    const cell = queue.shift();
    if (!shfIn(cell, side)) continue;
    const key = shfKey(cell.x, cell.y);
    if (seen[key]) continue;
    seen[key] = true;
    out.push({ x: cell.x, y: cell.y });
    lines.forEach((fold) => {
      const twin = shfMirror(cell, fold);
      if (shfIn(twin, side) && !seen[shfKey(twin.x, twin.y)]) queue.push(twin);
    });
  }
  out.sort((a, b) => a.y - b.y || a.x - b.x);
  return out;
}
function shfSet(cells) {
  const map = {};
  shfNorm(cells).forEach((cell) => {
    map[shfKey(cell.x, cell.y)] = true;
  });
  return map;
}
function shfUnit(folds, side) {
  const out = [];
  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const orbit = shfPositions([{ x: x, y: y }], folds, side);
      const low = orbit[0];
      if (low && low.x === x && low.y === y) out.push({ x: x, y: y });
    }
  }
  return out;
}
function shfTargetSolvable(target, folds, side) {
  const wanted = shfNorm(target);
  const targetSet = shfSet(wanted);
  const stamps = [];
  wanted.forEach((cell) => {
    const orbit = shfPositions([cell], folds, side);
    const low = orbit[0];
    if (low && low.x === cell.x && low.y === cell.y) stamps.push(cell);
  });
  const spread = shfPositions(stamps, folds, side);
  let extra = 0;
  spread.forEach((cell) => {
    if (!targetSet[shfKey(cell.x, cell.y)]) extra += 1;
  });
  const missing = wanted.reduce((count, cell) => {
    const covered = spread.some((sp) => sp.x === cell.x && sp.y === cell.y);
    return covered ? count : count + 1;
  }, 0);
  return { ok: extra === 0 && missing === 0, stamps: stamps, extra: extra, missing: missing };
}

function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clean(sheet, cells) {
  const avoid = shfSet(sheet.avoid || []);
  return cells.every((cell) => !avoid[shfKey(cell.x, cell.y)]);
}

/* Shuffle the way the module does, but seeded so a report is reproducible. */
function deal(sheet, rng) {
  const unit = shfUnit(sheet.intended, sheet.side);
  const avoid = shfSet(sheet.avoid || []);
  const out = unit.filter((cell) => !avoid[shfKey(cell.x, cell.y)]).slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  const picks = out.slice(0, sheet.wants);
  const target = shfPositions(picks, sheet.intended, sheet.side);
  if (target.length <= picks.length + 1 || !clean(sheet, target)) return { reserve: true };
  const check = shfTargetSolvable(target, sheet.intended, sheet.side);
  if (check.ok && check.stamps.length === picks.length) {
    return { stamps: picks, target: target, budget: picks.length + 1 };
  }
  return { reserve: true };
}

/* Every intended crease has to earn its keep: drop it and the deal must no
 * longer ink the whole target, or the sheet's par is a lie. */
function creasesAllNeeded(sheet, result) {
  const notes = [];
  sheet.intended.forEach((fold, index) => {
    const rest = sheet.intended.filter((_, i) => i !== index);
    const spread = shfPositions(result.stamps, rest, sheet.side);
    const covers = result.target.every((cell) =>
      spread.some((sp) => sp.x === cell.x && sp.y === cell.y),
    );
    if (covers) notes.push("crease " + (index + 1) + " is not needed for this deal");
  });
  return notes;
}

function checkSheet(sheet, deals) {
  const found = [];
  const unit = shfUnit(sheet.intended, sheet.side);
  const pool = unit.filter((cell) => !shfSet(sheet.avoid || [])[shfKey(cell.x, cell.y)]);
  if (pool.length < sheet.wants) {
    found.push("pool " + pool.length + " cannot supply " + sheet.wants + " stamps");
  }
  const authored = shfNorm(sheet.authored);
  const authoredTarget = shfPositions(authored, sheet.intended, sheet.side);
  if (authoredTarget.length <= authored.length + 1) found.push("authored stamps barely spread");
  if (!clean(sheet, authoredTarget)) found.push("authored ink touches an avoided cell");
  const authoredCheck = shfTargetSolvable(authoredTarget, sheet.intended, sheet.side);
  if (!authoredCheck.ok || authoredCheck.stamps.length !== authored.length) {
    found.push("authored reserve is not solvable as written");
  }
  let okDeals = 0;
  let reserveDeals = 0;
  const needed = [];
  const count = deals || 12;
  for (let seed = 1; seed <= count; seed += 1) {
    const result = deal(sheet, mulberry(seed * 7919 + sheet.side * 31 + sheet.wants));
    if (result.reserve) {
      reserveDeals += 1;
      continue;
    }
    okDeals += 1;
    if (needed.length < 3) needed.push(...creasesAllNeeded(sheet, result));
  }
  if (reserveDeals) found.push(reserveDeals + " of " + count + " deals fell through to the reserve");
  if (needed.length) found.push(needed.join("; "));
  return {
    problems: found,
    stats: {
      side: sheet.side,
      unit: unit.length,
      pool: pool.length,
      wants: sheet.wants,
      par: sheet.intended.length,
      okDeals: okDeals,
    },
  };
}

function fmtSheet(sheet, labelKey) {
  const folds = sheet.intended.map((f) => `{ axis: "${f.axis}", line: ${f.line} }`).join(", ");
  const authored = sheet.authored.map((c) => `{ x: ${c.x}, y: ${c.y} }`).join(", ");
  const avoid = shfNorm(sheet.avoid || [])
    .map((c) => `"${shfKey(c.x, c.y)}"`)
    .join(", ");
  const lines = [
    "    {",
    `      id: "${sheet.id}", labelKey: "${labelKey}",`,
    "      side: " + sheet.side + ",",
    "      wants: " + sheet.wants + ",",
    "      par: " + sheet.par + ",",
    "      intended: [" + folds + "],",
  ];
  if (sheet.avoid && sheet.avoid.length) lines.push("      avoid: [" + avoid + "],");
  lines.push("      authored: [" + authored + "],");
  lines.push("    },");
  return lines.join("\n");
}

/* Search a few crease sets and keep the first one whose orbit region is the
 * size the brief asks for; then lay authored stamps as the reps that spread. */
function forgeSheet(spec, seed) {
  const rng = mulberry(seed);
  const { side, creases: wantCreases, wants } = spec;
  const gutters = [];
  for (let k = 1; k < side; k += 1) gutters.push({ axis: "v", line: 2 * k - 1, k: k });
  for (let j = 1; j < side; j += 1) gutters.push({ axis: "h", line: 2 * j - 1, k: j });

  const scored = [];
  const seenFold = {};
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const shuffled = gutters.slice();
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }
    const folds = shuffled.slice(0, wantCreases);
    const signature = folds
      .map((f) => f.axis + f.line)
      .sort()
      .join("|");
    if (seenFold[signature]) continue;
    seenFold[signature] = true;
    const unit = shfUnit(folds, side);
    if (unit.length < wants + 1) continue;
    scored.push({ folds: folds, unit: unit.length });
    if (scored.length >= 24) break;
  }
  if (!scored.length) return null;

  /* Aim for an orbit region about twice the stamp count: big enough that the
   * dealer has a real choice, small enough that every stamp folds far. */
  const target = wants * 2;
  scored.sort((a, b) => Math.abs(a.unit - target) - Math.abs(b.unit - target) || a.unit - b.unit);
  const folds = scored[0].folds;
  const unit = shfUnit(folds, side);
  const spreadScore = unit
    .map((cell) => {
      const spread = shfPositions([cell], folds, side);
      return { cell: cell, spread: spread.length };
    })
    .sort((a, b) => b.spread - a.spread);
  const authored = spreadScore.slice(0, wants).map((entry) => entry.cell);
  return {
    id: spec.id,
    side: side,
    wants: wants,
    par: wantCreases,
    intended: folds,
    authored: authored,
    avoid: (spec.avoid || []).map((cell) => shfKey(cell[0], cell[1])),
  };
}

function main() {
  const mode = process.argv[2] || "list";
  const only = process.argv.slice(3);

  if (mode === "list" || mode === "check") {
    const sheets = loadSheets();
    sheets.forEach((sheet) => {
      if (only.length && only.indexOf(sheet.id) === -1) return;
      const report = checkSheet(sheet);
      console.log(
        `${report.problems.length ? "FAIL" : "ok  "}  ${sheet.id}  side ${sheet.side}  unit ${report.stats.unit}  pool ${report.stats.pool}  wants ${sheet.wants}  par ${sheet.par}  deals ${report.stats.okDeals}/12${report.problems.length ? "  " + report.problems.join("; ") : ""}`,
      );
    });
    return;
  }

  if (mode === "forge") {
    const brief = {
      f11: { side: 7, creases: 3, wants: 4 },
      f12: { side: 7, creases: 4, wants: 4 },
      f13: { side: 7, creases: 4, wants: 5 },
      f14: { side: 8, creases: 4, wants: 4 },
      f15: { side: 8, creases: 4, wants: 5 },
      f16: { side: 8, creases: 5, wants: 4 },
      f17: { side: 9, creases: 5, wants: 5 },
      f18: { side: 9, creases: 5, wants: 6 },
      f19: { side: 9, creases: 5, wants: 5 },
      f20: { side: 9, creases: 6, wants: 6 },
    };
    const ids = only.length ? only : Object.keys(brief);
    ids.forEach((id) => {
      const spec = brief[id];
      if (!spec) return;
      let sheet = null;
      for (let seed = 1; seed <= 12 && !sheet; seed += 1) {
        const candidate = forgeSheet(Object.assign({ id: id }, spec), seed * 104729);
        if (!candidate) continue;
        if (checkSheet(candidate).problems.length) continue;
        sheet = candidate;
      }
      if (!sheet) {
        console.log(id + ": NO VERIFIED SHEET");
        return;
      }
      console.log(id + ": side " + sheet.side + ", par " + sheet.par + ", wants " + sheet.wants);
      console.log(fmtSheet(sheet, "shfS" + id.slice(1)));
    });
  }
}

module.exports = { loadSheets, checkSheet, forgeSheet, shfUnit, shfPositions, shfTargetSolvable };

if (require.main === module) {
  main();
}
