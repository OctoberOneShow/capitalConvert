#!/usr/bin/env node
/* SCRATCH measurement for the Shadow Puppeteer doubling pass. Deleted before
 * finishing. Boots the module exactly like tools/verify-game.js --isolated and
 * drives the exported pure core (App.shadowJoints / shadowProject / shadowFit /
 * shadowNudgeSpan / shadowSolvable). The census is an inlined copy of the
 * module's own projection math (verified against the exported functions on
 * every argmin pose it reports) so the whole snapped pose space can be walked:
 * the stored line's nudge span, the true cheapest clearing line, and the
 * clearing census per cost bucket. */
"use strict";

const fs = require("fs");
const path = require("path");
const { createEnvironment } = require("./stub-dom");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8").replace(/^\uFEFF/, "");

const RUNTIME = [
  "i18n", "core", "tools",
  "pet-data", "pet-state", "pet-life", "pet-art", "pet-dom", "pet-render", "pet-games", "pet",
  "game-campaign", "game-registry", "game-guide",
];
const target = process.argv[2] || "game-shadow-puppeteer";
const src = RUNTIME.map((n) => read("assets/app/" + n + ".js"))
  .concat([read("assets/app/" + target + ".js")])
  .join("\n");

const env = createEnvironment();
env.load(src);
env.domReady();
const App = env.window.CapitalConvert;

const STEP = 5;
const PASS = App.shadowPassFit;

function wrap180(d) {
  let x = d % 360;
  if (x > 180) x -= 360;
  if (x < -180) x += 360;
  return x;
}

function range(lo, hi) {
  const out = [];
  for (let v = lo; v <= hi; v += STEP) out.push(v);
  return out;
}
const LAMPS_X = range(15, 260);
const LAMPS_Y = range(15, 285);
const ANGS = range(-175, 175);
const RODS = range(120, 220);

/* exact copy of the module's projection + fit, no object allocation */
function inlineFit(puzzle, lx, ly, a1, a2, bx) {
  const u1x = Math.cos((a1 * Math.PI) / 180);
  const u1y = Math.sin((a1 * Math.PI) / 180);
  const u2x = Math.cos((a2 * Math.PI) / 180);
  const u2y = Math.sin((a2 * Math.PI) / 180);
  const baseY = puzzle.baseY;
  const ax = bx + puzzle.l1 * u1x;
  const ay = baseY + puzzle.l1 * u1y;
  const bxx = ax + puzzle.l2 * u2x;
  const byy = ay + puzzle.l2 * u2y;
  const l293 = 300 - lx;
  function wallY(px, py) {
    let dx = px - lx;
    if (Math.abs(dx) < 2) dx = dx < 0 ? -2 : 2;
    let t = l293 / dx;
    if (!isFinite(t)) t = 60;
    if (t > 60) t = 60;
    else if (t < -60) t = -60;
    let y = ly + t * (py - ly);
    if (!isFinite(y)) y = 0;
    if (y > 1600) y = 1600;
    else if (y < -1600) y = -1600;
    return y;
  }
  const w0 = wallY(bx, baseY);
  const w1 = wallY(ax, ay);
  const w2 = wallY(bxx, byy);
  const fits = [];
  for (let b = 0; b < puzzle.targets.length; b += 1) {
    const tg = puzzle.targets[b];
    const err = (Math.abs(w0 - tg.baseY) + Math.abs(w1 - tg.aY) + Math.abs(w2 - tg.bY)) / 3;
    let fit = Math.round(100 * (1 - err / Math.max(tg.tol, 1)));
    if (fit < 0) fit = 0;
    else if (fit > 100) fit = 100;
    fits.push(fit);
  }
  return fits;
}

/* verify the inline math against the exported core for a pose */
function crossCheck(puzzle, lx, ly, a1, a2, bx) {
  const pose = { lampX: lx, lampY: ly, ang1: a1, ang2: a2, baseX: bx };
  const proj = App.shadowProject({ x: lx, y: ly }, App.shadowJoints(puzzle, pose));
  return puzzle.targets.map((tg) => App.shadowFit(tg, proj));
}

function stepsBetween(a, b) {
  return (
    (Math.abs(a.lampX - b.lampX) + Math.abs(a.lampY - b.lampY) + Math.abs(a.baseX - b.baseX)) / STEP +
    (Math.abs(wrap180(a.ang1 - b.ang1)) + Math.abs(wrap180(a.ang2 - b.ang2))) / STEP
  );
}

/* Every pose with honest cost <= cap, recorded per beat it clears:
 * { minCost: [Infinity..], clear: [[poses..]..], minPose: [pose..], visited } */
function census(puzzle, cap) {
  const start = puzzle.start;
  const beats = puzzle.targets.length;
  const rods = puzzle.baseMovable ? RODS : [start.baseX];
  const minCost = new Array(beats).fill(Infinity);
  const minPose = new Array(beats).fill(null);
  const clear = [[], []];
  let visited = 0;
  for (const bx of rods) {
    const db = Math.abs(bx - start.baseX) / STEP;
    if (db > cap) continue;
    for (const a1 of ANGS) {
      const d1 = Math.abs(wrap180(a1 - start.ang1)) / STEP;
      if (db + d1 > cap) continue;
      for (const a2 of ANGS) {
        const d2 = Math.abs(wrap180(a2 - start.ang2)) / STEP;
        if (db + d1 + d2 > cap) continue;
        const angSplit = db + d1 + d2;
        for (const lx of LAMPS_X) {
          const dx = Math.abs(lx - start.lampX) / STEP;
          if (angSplit + dx > cap) continue;
          for (const ly of LAMPS_Y) {
            const dy = Math.abs(ly - start.lampY) / STEP;
            const cost = angSplit + dx + dy;
            if (cost > cap) continue;
            visited += 1;
            const fits = inlineFit(puzzle, lx, ly, a1, a2, bx);
            for (let b = 0; b < beats; b += 1) {
              if (fits[b] >= PASS) {
                if (cost < minCost[b]) {
                  minCost[b] = cost;
                  minPose[b] = { lampX: lx, lampY: ly, ang1: a1, ang2: a2, baseX: bx, cost };
                }
                clear[b].push({ lampX: lx, lampY: ly, ang1: a1, ang2: a2, baseX: bx, cost });
              }
            }
          }
        }
      }
    }
  }
  return { minCost, minPose, clear, visited };
}

function countPairs(c1, c2, limit) {
  let n = 0;
  for (const p1 of c1) {
    if (p1.cost > limit) continue;
    const budget = limit - p1.cost;
    for (const p2 of c2) {
      if (stepsBetween(p1, p2) <= budget) n += 1;
    }
  }
  return n;
}

function minPair(c1, c2) {
  let best = Infinity;
  let pair = null;
  for (const p1 of c1) {
    if (p1.cost >= best) continue;
    for (const p2 of c2) {
      const total = p1.cost + stepsBetween(p1, p2);
      if (total < best) {
        best = total;
        pair = [p1, p2];
      }
    }
  }
  return { best, pair };
}

function storedLine(puzzle) {
  const poses = [puzzle.start].concat(puzzle.solutions);
  let span = 0;
  for (let i = 1; i < poses.length; i += 1) span += App.shadowNudgeSpan(poses[i - 1], poses[i]);
  const fits = puzzle.solutions.map((sol, b) => crossCheck(puzzle, sol.lampX, sol.lampY, sol.ang1, sol.ang2, sol.baseX)[b]);
  return { span, fits, solvable: App.shadowSolvable(puzzle) };
}

function measure(puzzle, cap) {
  const beats = puzzle.targets ? puzzle.targets.length : 0;
  const line = storedLine(puzzle);
  const out = {
    id: puzzle.id, beats, span: line.span, fits: line.fits, solvable: line.solvable,
    bands: puzzle.starNudges ? puzzle.starNudges.slice() : null,
  };
  if (!beats) return out;
  const searchCap = Math.max(cap, line.span);
  const t0 = Date.now();
  const c = census(puzzle, searchCap);
  out.censusMs = Date.now() - t0;
  out.minSingle = c.minCost;
  out.visited = c.visited;
  out.checked = c.minPose.map((p) =>
    p ? crossCheck(puzzle, p.lampX, p.lampY, p.ang1, p.ang2, p.baseX).join("/") : "-",
  );
  const b = out.bands;
  if (beats === 1) {
    out.minTotal = c.minCost[0];
    const counts = [0, 0, 0, 0];
    for (const p of c.clear[0]) {
      if (p.cost <= b[0]) counts[0] += 1;
      if (p.cost <= b[1]) counts[1] += 1;
      if (p.cost <= b[2]) counts[2] += 1;
      counts[3] += 1;
    }
    out.counts = counts; /* <=b0, <=b1, <=b2, <=searchCap */
  } else {
    /* cheap honest line: pick P1 clearing beat 1, then P2 clearing beat 2.
     * Any better-than-stored path only uses poses with cost <= stored span
     * (triangle inequality), so capping both lists at the stored span is exact. */
    const c1 = c.clear[0].filter((p) => p.cost <= line.span);
    const c2 = c.clear[1].filter((p) => p.cost <= line.span);
    out.listSizes = [c1.length, c2.length];
    console.log(`  [${puzzle.id}] pair lists ${c1.length} x ${c2.length} = ${c1.length * c2.length}`);
    const t1 = Date.now();
    const best = minPair(c1, c2);
    out.pairMs = Date.now() - t1;
    out.minTotal = best.best <= line.span ? best.best : line.span;
    out.bestPair = best.pair && best.pair.map((p) => [p.lampX, p.lampY, p.ang1, p.ang2, p.baseX, p.cost]);
    const t2 = Date.now();
    out.counts = [b[0], b[1], b[2], searchCap].map((lim) => countPairs(c1, c2, lim));
    out.countMs = Date.now() - t2;
  }
  out.minArg = c.minPose.map((p) => p && [p.lampX, p.lampY, p.ang1, p.ang2, p.baseX, p.cost]);
  return out;
}

const puzzles = App.shadowPuzzles;
const caps = process.argv.slice(3).map(Number);
const CANDS = process.env.SHP_CANDIDATES;
if (CANDS) {
  /* optional JSON file with candidate puzzles: [ {id, ...}, ... ] */
  const cands = JSON.parse(read(CANDS));
  cands.forEach((puzzle) => {
    const cap = puzzle.cap || Math.max(puzzle.starNudges[2], 40);
    const m = measure(puzzle, cap);
    console.log(JSON.stringify(m));
  });
} else {
  puzzles.forEach((puzzle, i) => {
    const cap = caps[i] || puzzle.starNudges[2] + 6;
    const m = measure(puzzle, cap);
    console.log(
      `${m.id}: beats=${m.beats} span=${m.span} solvable=${m.solvable} fits=[${m.fits.map((f) => f.toFixed(1)).join(",")}] ` +
        `minSingle=[${m.minSingle.map((v) => (v === Infinity ? "-" : v)).join(",")}] argminSingle=${JSON.stringify(m.minArg)} ` +
        `crossChecked=${JSON.stringify(m.checked)}`,
    );
    console.log(
      `  minTotal=${m.minTotal} counts(<=b0,b1,b2,searchCap)=[${m.counts.join(",")}] bands=[${m.bands.join(",")}] ` +
        `visited=${m.visited} census=${m.censusMs}ms pair=${m.pairMs}ms count=${m.countMs}ms listSizes=[${m.listSizes}]`,
    );
    if (process.env.SHP_VERBOSE && m.bestPair) console.log("  bestPair", JSON.stringify(m.bestPair));
  });
}
