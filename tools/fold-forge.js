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
 *   node tools/fold-forge.js list [f13 f20 ...]  # verify shipped/one sheets
 *   node tools/fold-forge.js forge f13           # print one new verified sheet
 *   node tools/fold-forge.js crown [f47 f50 ...] # search + certify crown rungs
 *
 * `list` prints, beside the three answers, the measured numbers a tier brief
 * cites: the widest print an open stamp floods, the exact deal floor (the
 * least ink any conceivable deal can lay - the sum of the `wants` smallest
 * open-orbit prints) and the stamp pool. `crown` runs the structured search
 * behind the crown tier (f47-f56): axis crease sets are enumerated from the
 * load-bearing families (a left comb {1,3}[,{5},{7}] plus up to three far
 * lines), paired, filtered by the rung's record brief and deal-floor window,
 * then certified under the full bar - twelve single-shot deals, every crease
 * needed on every dealt sheet, the pigeonhole bar (each crease's cut strands
 * more pool reps than a deal can leave out), whole-orbit keep-clears, and
 * every record held against every sheet before it.
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
  let dealtMin = Infinity;
  let dealtMax = 0;
  const count = deals || 12;
  for (let seed = 1; seed <= count; seed += 1) {
    const result = deal(sheet, mulberry(seed * 7919 + sheet.side * 31 + sheet.wants));
    if (result.reserve) {
      reserveDeals += 1;
      continue;
    }
    okDeals += 1;
    dealtMin = Math.min(dealtMin, result.target.length);
    dealtMax = Math.max(dealtMax, result.target.length);
    if (needed.length < 3) needed.push(...creasesAllNeeded(sheet, result));
  }
  if (reserveDeals) found.push(reserveDeals + " of " + count + " deals fell through to the reserve");
  if (needed.length) found.push(needed.join("; "));
  /* The measured numbers a tier brief cites: the widest print an open stamp
   * floods, and the exact deal floor - the least ink any conceivable deal can
   * lay, the sum of the `wants` smallest open-orbit prints. */
  const prints = pool.map((cell) => shfPositions([cell], sheet.intended, sheet.side).length)
    .sort((a, b) => a - b);
  const floor = prints.slice(0, sheet.wants).reduce((sum, n) => sum + n, 0);
  return {
    problems: found,
    stats: {
      side: sheet.side,
      unit: unit.length,
      pool: pool.length,
      wants: sheet.wants,
      par: sheet.par,
      okDeals: okDeals,
      print: prints.length ? prints[prints.length - 1] : 0,
      floor: floor,
      dealtMin: okDeals ? dealtMin : 0,
      dealtMax: dealtMax,
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

/* ---- the crown tier (f47-f56): structured search + certification ------------ */

/* One axis's crease lines, enumerated from the load-bearing families: a left
 * comb {1,3}[,{5},{7}] - deeper combs measure redundant (an inner crease's
 * mirror pairs are re-reached through its neighbours, and the cut test fails)
 * - plus up to three far lines that reach across the sheet. */
function crownAxisSets(side) {
  const gutters = [];
  for (let k = 1; k < side; k += 1) gutters.push(2 * k - 1);
  const out = [];
  for (const left of [[1, 3], [1, 3, 5], [1, 3, 7]]) {
    const top = left[left.length - 1];
    const rest = gutters.filter((line) => line > top);
    const rec = (start, acc) => {
      if (acc.length > 0) out.push(left.concat(acc));
      if (acc.length === 3) return;
      for (let i = start; i < rest.length; i += 1) {
        acc.push(rest[i]);
        rec(i + 1, acc);
        acc.pop();
      }
    };
    rec(0, []);
  }
  return out;
}

function crownBands1d(side, lines) {
  const parent = Array.from({ length: side }, (_, i) => i);
  const find = (a) => (parent[a] === a ? a : (parent[a] = find(parent[a])));
  lines.forEach((line) => {
    for (let x = 0; x < side; x += 1) {
      const m = line - x;
      if (m >= 0 && m < side) {
        const ra = find(x);
        const rb = find(m);
        if (ra !== rb) parent[ra] = rb;
      }
    }
  });
  const map = {};
  for (let x = 0; x < side; x += 1) (map[find(x)] = map[find(x)] || []).push(x);
  return Object.values(map).sort((a, b) => a[0] - b[0]);
}

function crownSig1d(side, lines) {
  return crownBands1d(side, lines).map((b) => b.join(":")).join("|");
}

/* A crease can only be load-bearing if cutting it changes its own axis's
 * partition - an axis whose band structure survives the cut strands nobody.
 * This cheap 1D test prunes the dense combs whose inner creases are dead
 * weight, before any 2D certification runs. */
function crownAxisLoadBearing(side, lines) {
  return lines.every((line) => {
    const rest = lines.filter((other) => other !== line);
    return crownSig1d(side, rest) !== crownSig1d(side, lines);
  });
}

/* The rung briefs. Each rung names its hardware records - checked against
 * every sheet before it in the shipped ladder - and a deal-floor clamp: the
 * tier's floor line is reported rung over rung (it dips where the pool
 * widens or the pockets multiply, each dip the record's own cost, the way
 * the fourth tier's dealt targets dip at f33 and f37) and is formally
 * claimed as a record only where it passes everything the drawer has ever
 * dealt - f55 and the capstone. `par` bounds hold the tier's crease line,
 * `axis` caps the per-axis creases, `pockets` fixes the keep-clear orbit
 * count for the multi-block rungs. */
function crownBriefs() {
  return {
    f47: { side: 17, wants: 15, par: [10, 10], axis: 5, poolMax: 17, clamp: [60, 150], records: ["side", "wants"] },
    f48: { side: 17, wants: 15, par: [10, 10], axis: 5, clamp: [151, 230], records: ["print"] },
    f49: { side: 17, wants: 16, par: [10, 10], axis: 5, clamp: [60, 150], records: ["wants", "pool"] },
    f50: { side: 17, wants: 16, par: [11, 11], axis: 6, clamp: [60, 165], records: ["par"] },
    f51: { side: 17, wants: 16, par: [11, 11], axis: 6, clamp: [60, 230], records: ["floor"] },
    f52: { side: 18, wants: 16, par: [11, 11], axis: 6, clamp: [60, 185], records: ["side"] },
    f53: { side: 18, wants: 16, par: [11, 11], axis: 6, clamp: [60, 250], records: ["floor"] },
    f54: { side: 18, wants: 16, par: [11, 11], axis: 6, clamp: [60, 275], records: ["floor"] },
    f55: { side: 18, wants: 16, par: [11, 11], axis: 6, clamp: [60, 200], records: ["open"], open: true },
    f56: { side: 18, wants: 16, par: [12, 12], axis: 6, clamp: [320, 324], records: ["par", "floor"], spent: true },
  };
}

/* Build one candidate sheet from an axis pair and a keep-clear orbit. The
 * authored reserve lays the tray on the widest orbits, so its spread is the
 * sheet's own upper bound. */
function crownSheet(id, brief, vset, hset, avoidCells) {
  const intended = vset
    .map((line) => ({ axis: "v", line }))
    .concat(hset.map((line) => ({ axis: "h", line })));
  const avoid = avoidCells.map((cell) => shfKey(cell.x, cell.y));
  const unit = shfUnit(intended, brief.side);
  const avoidSet = shfSet(avoid);
  const open = unit.filter((cell) => !avoidSet[shfKey(cell.x, cell.y)]);
  const sized = open
    .map((cell) => ({ cell, print: shfPositions([cell], intended, brief.side).length }))
    .sort((a, b) => b.print - a.print);
  const authored = sized.slice(0, brief.wants).map((entry) => entry.cell);
  return {
    id,
    side: brief.side,
    wants: brief.wants,
    par: intended.length,
    intended,
    avoid,
    authored,
  };
}

/* Keep-clear pockets: the avoided cells split into connected dry regions
 * (4-adjacency), the way the shipped briefs count pockets - f30's "two
 * keep-clear pockets", f35's "a single keep-clear cell". */
function crownPockets(avoidKeys) {
  if (!avoidKeys || !avoidKeys.length) return 0;
  const cells = new Set(avoidKeys);
  const seen = new Set();
  let count = 0;
  avoidKeys.forEach((startKey) => {
    if (seen.has(startKey)) return;
    count += 1;
    const queue = [startKey];
    seen.add(startKey);
    while (queue.length) {
      const key = queue.shift();
      const parts = key.split(",").map(Number);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach((step) => {
        const next = (parts[0] + step[0]) + "," + (parts[1] + step[1]);
        if (cells.has(next) && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      });
    }
  });
  return count;
}

/* The full certification bar, one sheet: the forge's three questions, the cut
 * test on every dealt sheet, the pigeonhole bar, whole-orbit keep-clears, the
 * rung's records against every sheet before it, and the deal-floor window. */
function certifyCrown(sheet, brief, ladder, floorWindow) {
  const problems = [];
  const report = checkSheet(sheet, 12);
  problems.push(...report.problems);
  const position = ladder.filter((other) => crownId(other.id) < crownId(sheet.id));
  const unit = shfUnit(sheet.intended, sheet.side);
  const avoidSet = shfSet(sheet.avoid);
  const pool = unit.filter((cell) => !avoidSet[shfKey(cell.x, cell.y)]);
  const prints = pool.map((cell) => shfPositions([cell], sheet.intended, sheet.side).length)
    .sort((a, b) => a - b);
  const floor = prints.slice(0, sheet.wants).reduce((sum, n) => sum + n, 0);
  const printMax = prints.length ? prints[prints.length - 1] : 0;
  const axisPeak = Math.max(
    sheet.intended.filter((f) => f.axis === "v").length,
    sheet.intended.filter((f) => f.axis === "h").length,
  );
  const peaks = { side: 0, par: 0, wants: 0, pool: 0, print: 0, axis: 0, floor: 0, keepclears: 0, open: 0 };
  position.forEach((other) => {
    const oUnit = shfUnit(other.intended, other.side);
    const oAvoid = shfSet(other.avoid || []);
    const oPool = oUnit.filter((cell) => !oAvoid[shfKey(cell.x, cell.y)]);
    let oPrint = 0;
    let oFloor = 0;
    const oPrints = [];
    oPool.forEach((cell) => {
      const size = shfPositions([cell], other.intended, other.side).length;
      oPrint = Math.max(oPrint, size);
      oPrints.push(size);
    });
    oPrints.sort((a, b) => a - b);
    oFloor = oPrints.slice(0, other.wants).reduce((sum, n) => sum + n, 0);
    peaks.side = Math.max(peaks.side, other.side);
    peaks.par = Math.max(peaks.par, other.par);
    peaks.wants = Math.max(peaks.wants, other.wants);
    peaks.pool = Math.max(peaks.pool, oPool.length);
    peaks.print = Math.max(peaks.print, oPrint);
    peaks.floor = Math.max(peaks.floor, oFloor);
    peaks.keepclears = Math.max(peaks.keepclears, crownPockets(other.avoid || []));
    /* The widest sheet dealt with no keep-clear at all - f45's record. */
    if (!(other.avoid || []).length) peaks.open = Math.max(peaks.open, other.side);
    peaks.axis = Math.max(peaks.axis,
      Math.max(
        other.intended.filter((f) => f.axis === "v").length,
        other.intended.filter((f) => f.axis === "h").length,
      ));
  });
  const measured = {
    side: sheet.side, par: sheet.par, wants: sheet.wants, pool: pool.length,
    print: printMax, axis: axisPeak, floor,
    keepclears: crownPockets(sheet.avoid),
    open: (sheet.avoid || []).length ? 0 : sheet.side,
  };
  const recordTests = {
    side: measured.side > peaks.side,
    par: measured.par > peaks.par,
    wants: measured.wants > peaks.wants,
    pool: measured.pool > peaks.pool,
    print: measured.print > peaks.print,
    axis: measured.axis > peaks.axis,
    floor: measured.floor > peaks.floor,
    keepclears: measured.keepclears > peaks.keepclears,
    open: measured.open > peaks.open,
  };
  brief.records.forEach((record) => {
    if (!recordTests[record]) {
      problems.push("record " + record + " " + measured[record] + " does not pass the peak " + peaks[record]);
    }
  });
  if (sheet.par !== sheet.intended.length) problems.push("par is not the crease set it intends");
  /* No rung repeats another rung's crease set - the drawer never ships the
   * same sheet twice. */
  const signature = sheet.intended.map((f) => f.axis + f.line).sort().join("|");
  const repeat = ladder.find((other) => other.id !== sheet.id &&
    other.intended.map((f) => f.axis + f.line).sort().join("|") === signature);
  if (repeat) problems.push("the crease set repeats " + repeat.id + "'s");
  /* Whole-orbit keep-clear: every avoided cell mirrors only onto avoided
   * cells, so the block removes real stamp choices rather than singletons. */
  (sheet.avoid || []).forEach((cellKey) => {
    const parts = cellKey.split(",").map(Number);
    const orbit = shfPositions([{ x: parts[0], y: parts[1] }], sheet.intended, sheet.side);
    if (!orbit.every((cell) => avoidSet[shfKey(cell.x, cell.y)])) {
      problems.push("the keep-clear is not a whole orbit");
    }
  });
  if (brief.spent && pool.length !== sheet.wants) {
    problems.push("the capstone's pool is " + pool.length + ", not the spent " + sheet.wants);
  }
  if (!brief.spent && pool.length < sheet.wants + 1) {
    problems.push("pool " + pool.length + " leaves no slack over the tray " + sheet.wants);
  }
  if (brief.poolMax && pool.length > brief.poolMax) {
    problems.push("pool " + pool.length + " passes the brief's cap " + brief.poolMax);
  }
  if (brief.pockets && measured.keepclears !== brief.pockets) {
    problems.push("the sheet keeps " + measured.keepclears + " orbits clear, not the " + brief.pockets + " the brief asks");
  }
  if (floor < floorWindow[0] || floor > floorWindow[1]) {
    problems.push("deal floor " + floor + " misses the window " + floorWindow[0] + "-" + floorWindow[1]);
  }
  /* The pigeonhole bar: each crease's cut strands more pool reps than a deal
   * can leave out, so every conceivable deal needs every crease. */
  sheet.intended.forEach((_, g) => {
    const rest = sheet.intended.filter((__, j) => j !== g);
    const stranded = pool.filter((rep) =>
      shfPositions([rep], rest, sheet.side).length <
      shfPositions([rep], sheet.intended, sheet.side).length).length;
    if (stranded <= pool.length - sheet.wants) {
      problems.push("cutting crease " + g + " strands only " + stranded +
        " of " + pool.length + " pool reps");
    }
  });
  /* The cut test on every dealt sheet, not a sample: one crease below the
   * intended set and no dealt sheet may still ink its whole target. */
  for (let seed = 1; seed <= 12 && problems.length < 8; seed += 1) {
    const result = deal(sheet, mulberry(seed * 7919 + sheet.side * 31 + sheet.wants));
    if (result.reserve) continue;
    sheet.intended.forEach((_, g) => {
      const rest = sheet.intended.filter((__, j) => j !== g);
      const spread = shfPositions(result.stamps, rest, sheet.side);
      if (result.target.every((cell) =>
        spread.some((sp) => sp.x === cell.x && sp.y === cell.y))) {
        problems.push("seed " + seed + ": cutting crease " + g + " still covers the target");
      }
    });
  }
  return { problems, measured, peaks };
}

function crownId(id) { return parseInt(id.slice(1), 10); }

/* The structured search behind one crown rung: enumerate axis sets from the
 * load-bearing families, pair them, keep a few candidates per orbit profile,
 * order by fit to the rung's deal-floor window, certify until one passes. */
function searchCrown(id, brief, ladder, floorWindow, budget) {
  const axisSets = crownAxisSets(brief.side)
    .filter((set) => crownAxisLoadBearing(brief.side, set));
  /* Key by band profile AND crease count: one band profile can be realized
   * by sets of different sizes, and the rung's par bound applies to the
   * crease count, not to the profile. */
  const byProfile = new Map();
  axisSets.forEach((set) => {
    const bands = crownBands1d(brief.side, set);
    const sig = bands.map((b) => b.length).join(",") + "#" + set.length;
    if (!byProfile.has(sig)) byProfile.set(sig, []);
    const list = byProfile.get(sig);
    if (list.length < 8) list.push({ set, bands });
  });
  const profiles = Array.from(byProfile.entries());
  const candidates = [];
  profiles.forEach((vpEntry) => {
    profiles.forEach((hpEntry) => {
      const nv = vpEntry[1][0].set.length;
      const nh = hpEntry[1][0].set.length;
      const par = nv + nh;
      const axis = Math.max(nv, nh);
      if (par < brief.par[0] || par > brief.par[1]) return;
      if (axis > brief.axis) return;
      /* Orbit prints are the products of the two axes' band widths; the
       * coarse filter runs on those, before any full certification. */
      const sizes = [];
      vpEntry[1][0].bands.forEach((cb) => {
        hpEntry[1][0].bands.forEach((rb) => sizes.push(cb.length * rb.length));
      });
      sizes.sort((a, b) => a - b);
      const unit = sizes.length;
      if (unit < brief.wants + (brief.spent ? 0 : 1)) return;
      if (brief.spent && unit > brief.wants + 1) return;
      if (brief.poolMax && unit > brief.poolMax + 1) return;
      const floor = sizes.slice(0, brief.wants).reduce((sum, n) => sum + n, 0);
      if (floor < floorWindow[0] || floor > floorWindow[1]) return;
      candidates.push({
        vProfile: vpEntry[0], hProfile: hpEntry[0],
        vSets: vpEntry[1], hSets: hpEntry[1], floor, sizes,
      });
    });
  });
  const center = (floorWindow[0] + floorWindow[1]) / 2;
  candidates.sort((a, b) =>
    Math.abs(a.floor - center) - Math.abs(b.floor - center) ||
    b.sizes[b.sizes.length - 1] - a.sizes[a.sizes.length - 1]);
  let certified = 0;
  const diag = { candidates: candidates.length, rejected: [] };
  for (const candidate of candidates) {
    if (certified >= budget) break;
    /* Try a few axis-set representatives and keep-clear choices per profile. */
    for (const vEntry of candidate.vSets) {
      for (const hEntry of candidate.hSets) {
        if (certified >= budget) break;
        /* Keep-clear candidates: none at all, one small whole orbit, or -
         * for the multi-block rungs - every combo of `pockets` of the
         * smallest whole orbits. Each candidate expands to every cell of its
         * orbit, because a partial block would fail the orbit-closed check. */
        const orbitPairs = [];
        vEntry.bands.forEach((cb) => {
          hEntry.bands.forEach((rb) => {
            const size = cb.length * rb.length;
            if (size <= 4) orbitPairs.push({ size, cb, rb });
          });
        });
        orbitPairs.sort((a, b) => a.size - b.size);
        const expand = (pair) =>
          pair.cb.flatMap((x) => pair.rb.map((y) => ({ x, y })));
        const small = orbitPairs.slice(0, 6).map(expand);
        const avoidChoices = [];
        if (brief.open) {
          avoidChoices.push([]);
        } else if (brief.pockets) {
          if (small.length >= brief.pockets) {
            const combo = (start, acc) => {
              if (acc.length === brief.pockets) {
                avoidChoices.push([].concat.apply([], acc));
                return;
              }
              for (let i = start; i < small.length; i += 1) {
                acc.push(small[i]);
                combo(i + 1, acc);
                acc.pop();
              }
            };
            combo(0, []);
          }
        } else {
          if (!brief.avoidMin) avoidChoices.push([]);
          small.slice(0, 2).forEach((orbit) => avoidChoices.push(orbit));
        }
        for (const avoidCells of avoidChoices) {
          if (certified >= budget) break;
          const sheet = crownSheet(id, brief, vEntry.set, hEntry.set, avoidCells);
          certified += 1;
          const verdict = certifyCrown(sheet, brief, ladder, floorWindow);
          if (!verdict.problems.length) {
            diag.tries = certified;
            return { sheet, verdict, diag };
          }
          if (diag.rejected.length < 10) {
            diag.rejected.push(
              "v[" + vEntry.set.join("+") + "] h[" + hEntry.set.join("+") + "] avoid[" +
                sheet.avoid.join(" ") + "]: " + verdict.problems.slice(0, 2).join("; "));
          }
        }
      }
    }
  }
  diag.tries = certified;
  return { sheet: null, diag };
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
        `${report.problems.length ? "FAIL" : "ok  "}  ${sheet.id}  side ${sheet.side}  unit ${report.stats.unit}  pool ${report.stats.pool}  wants ${sheet.wants}  par ${sheet.par}  print ${report.stats.print}  floor ${report.stats.floor}  dealt ${report.stats.dealtMin}-${report.stats.dealtMax}  deals ${report.stats.okDeals}/12${report.problems.length ? "  " + report.problems.join("; ") : ""}`,
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
    return;
  }

  if (mode === "crown") {
    const briefs = crownBriefs();
    const ladder = loadSheets();
    const ids = only.length ? only : Object.keys(briefs);
    ids.forEach((id) => {
      const brief = briefs[id];
      if (!brief) return;
      const shipped = ladder.find((sheet) => sheet.id === id);
      if (shipped) {
        const recheck = certifyCrown(shipped, brief, ladder,
          [brief.clamp[0], brief.clamp[1]]);
        console.log(
          `${recheck.problems.length ? "FAIL" : "ok  "}  ${id} (shipped)  side ${shipped.side}  par ${shipped.par}  wants ${shipped.wants}  pool ${recheck.measured.pool}  print ${recheck.measured.print}  floor ${recheck.measured.floor}  records ${brief.records.join("+")}${recheck.problems.length ? "  " + recheck.problems.slice(0, 3).join("; ") : ""}`);
        return;
      }
      const found = searchCrown(id, brief, ladder, brief.clamp, 160);
      if (!found.sheet) {
        console.log(`${id}: NO CERTIFIED SHEET (candidates ${found.diag.candidates}, certified-tries ${found.diag.tries})`);
        found.diag.rejected.forEach((line) => console.log("   . " + line));
        return;
      }
      const v = found.verdict.measured;
      console.log(
        `ok  ${id}  side ${v.side}  par ${v.par}  wants ${v.wants}  pool ${v.pool}  print ${v.print}  floor ${v.floor}  avoid ${found.sheet.avoid.length}  records ${brief.records.join("+")}`);
      console.log(fmtSheet(found.sheet, "shfS" + id.slice(1)));
    });
    return;
  }
}

module.exports = {
  loadSheets, checkSheet, forgeSheet, shfUnit, shfPositions, shfTargetSolvable,
  crownBriefs, certifyCrown, searchCrown, crownSheet, crownAxisSets, crownBands1d,
};

if (require.main === module) {
  main();
}
