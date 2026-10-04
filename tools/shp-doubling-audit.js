#!/usr/bin/env node
/* SCRATCH audit for the Shadow Puppeteer doubling pass. Deleted before
 * finishing. Boots the module exactly like tools/verify-game.js --isolated and
 * drives the exported pure core (App.shadowJoints / shadowProject / shadowFit /
 * shadowNudgeSpan / shadowSolvable). The census is an inlined copy of the
 * module's own projection math (every argmin pose is re-verified through the
 * exported functions) so the whole snapped pose space can be walked:
 *   - the stored line's nudge span (the star-band anchor),
 *   - M_min: the cheapest honest clearing line (single pose, or the cheapest
 *     P1->P2 pair for two-beat puzzles; capped at the stored span, which is
 *     exact by the triangle inequality),
 *   - the clearing census per beat and cost bucket (basin width).
 * Candidate mode (SHP_CANDIDATES=file.json) measures authored puzzles whose
 * targets are derived from their stored solutions. */
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

/* exact copy of the module's projection + fit, allocation-free */
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

/* re-verify a pose through the exported core */
function crossCheck(puzzle, lx, ly, a1, a2, bx) {
  const pose = { lampX: lx, lampY: ly, ang1: a1, ang2: a2, baseX: bx };
  const proj = App.shadowProject({ x: lx, y: ly }, App.shadowJoints(puzzle, pose));
  return puzzle.targets.map((tg) => App.shadowFit(tg, proj));
}

function projectSolution(puzzle, sol) {
  const pose = { lampX: sol.lampX, lampY: sol.lampY, ang1: sol.ang1, ang2: sol.ang2, baseX: sol.baseX };
  const proj = App.shadowProject({ x: sol.lampX, y: sol.lampY }, App.shadowJoints(puzzle, pose));
  return proj;
}

function targetFromSolution(puzzle, sol, tol) {
  const proj = projectSolution(puzzle, sol);
  return {
    baseY: Math.round(proj.base.y),
    aY: Math.round(proj.a.y),
    bY: Math.round(proj.b.y),
    tol,
  };
}

function stepsBetween(a, b) {
  return (
    (Math.abs(a.lampX - b.lampX) + Math.abs(a.lampY - b.lampY) + Math.abs(a.baseX - b.baseX)) / STEP +
    (Math.abs(wrap180(a.ang1 - b.ang1)) + Math.abs(wrap180(a.ang2 - b.ang2))) / STEP
  );
}

/* Every pose with honest cost <= cap, recorded per beat it clears. */
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

function minPair(c1, c2) {
  let best = Infinity;
  let pair = null;
  const sorted1 = c1.slice().sort((x, y) => x.cost - y.cost);
  const sorted2 = c2.slice().sort((x, y) => x.cost - y.cost);
  for (const p1 of sorted1) {
    /* total = p1.cost + steps >= max(p1.cost, p2.cost): skip provably safe */
    if (p1.cost >= best) break;
    for (const p2 of sorted2) {
      if (p2.cost >= best) break;
      const total = p1.cost + stepsBetween(p1, p2);
      if (total < best) {
        best = total;
        pair = [p1, p2];
      }
    }
  }
  return { best, pair };
}

function bucketize(list, buckets) {
  const counts = buckets.map(() => 0);
  for (const p of list) {
    for (let i = 0; i < buckets.length; i += 1) {
      if (p.cost <= buckets[i]) counts[i] += 1;
    }
  }
  return counts;
}

function keyOf(p) {
  return p.lampX + "," + p.lampY + "," + p.ang1 + "," + p.ang2 + "," + p.baseX;
}

function measure(puzzle, quiet) {
  const beats = puzzle.targets ? puzzle.targets.length : 0;
  const poses = [puzzle.start].concat(puzzle.solutions);
  let span = 0;
  for (let i = 1; i < poses.length; i += 1) span += App.shadowNudgeSpan(poses[i - 1], poses[i]);
  const solFits = puzzle.solutions.map((sol, b) =>
    crossCheck(puzzle, sol.lampX, sol.lampY, sol.ang1, sol.ang2, sol.baseX)[b],
  );
  const out = {
    id: puzzle.id,
    beats,
    span,
    solvable: App.shadowSolvable(puzzle),
    solFits: solFits.map((f) => Math.round(f * 10) / 10),
    bands: puzzle.starNudges ? puzzle.starNudges.slice() : null,
  };
  if (!beats) return out;
  const cap = puzzle.cap || (puzzle.starNudges ? puzzle.starNudges[2] : span + 9);
  out.cap = cap;
  const t0 = Date.now();
  const c = census(puzzle, Math.max(cap, span));
  out.censusMs = Date.now() - t0;
  out.visited = c.visited;
  out.minSingle = c.minCost;
  out.minArg = c.minPose.map((p) =>
    p ? [p.lampX, p.lampY, p.ang1, p.ang2, p.baseX, p.cost, crossCheck(puzzle, p.lampX, p.lampY, p.ang1, p.ang2, p.baseX).join("/")] : null,
  );
  const bands = out.bands || [span, span + 4, span + 9];
  if (beats === 1) {
    out.Mmin = c.minCost[0];
    const buckets = [out.Mmin, bands[0], bands[1], bands[2]];
    out.poseCounts = bucketize(c.clear[0], buckets);
    out.poseBuckets = buckets;
  } else {
    const c1 = c.clear[0].filter((p) => p.cost <= span);
    const c2 = c.clear[1].filter((p) => p.cost <= span);
    out.listSizes = [c1.length, c2.length];
    const t1 = Date.now();
    const best = minPair(c1, c2);
    out.pairMs = Date.now() - t1;
    out.Mmin = best.best <= span ? best.best : span;
    out.bestPair = best.pair && best.pair.map((p) => [p.lampX, p.lampY, p.ang1, p.ang2, p.baseX, p.cost]);
    const buckets = [bands[0], bands[1], bands[2]];
    out.counts1 = bucketize(c1, buckets);
    out.counts2 = bucketize(c2, buckets);
    const set1 = new Set(c1.filter((p) => p.cost <= bands[0]).map(keyOf));
    let both = 0;
    for (const p of c2) {
      if (p.cost <= bands[0] && set1.has(keyOf(p))) both += 1;
    }
    out.directBothAtB0 = both;
    /* Exact count of winning lines for the top band: pairs (p1, p2) with
     * p1.cost + steps(p1, p2) <= bands[0]. Certified honest-play basin. */
    const L = bands[0];
    const q1 = c1.filter((p) => p.cost <= L);
    const q2 = c2.filter((p) => p.cost <= L);
    const product = q1.length * q2.length;
    if (product <= 60000000) {
      const t3 = Date.now();
      let count = 0;
      for (const p1 of q1) {
        for (const p2 of q2) {
          if (p1.cost + stepsBetween(p1, p2) <= L) count += 1;
        }
      }
      out.pairCountB0 = count;
      out.pairCountMs = Date.now() - t3;
    } else {
      out.pairCountB0 = "skip(" + product + ")";
    }
  }
  if (!quiet) {
    console.log(JSON.stringify(out));
  }
  return out;
}

const CANDS = process.env.SHP_CANDIDATES;
if (CANDS) {
  const cands = JSON.parse(read(CANDS));
  cands.forEach((cand) => {
    const tols = cand.sweepTols || [cand.tol || (cand.tols ? cand.tols[0] : 50)];
    const seen = new Set();
    tols.forEach((tol) => {
      const puzzle = {
        id: cand.id + "-" + tol,
        baseY: cand.baseY,
        l1: cand.l1,
        l2: cand.l2,
        baseMovable: !!cand.baseMovable,
        start: cand.start,
        solutions: cand.solutions,
        targets: null,
        starNudges: null,
        cap: cand.cap || 74,
      };
      puzzle.targets = cand.solutions.map((sol, i) =>
        targetFromSolution(cand, sol, cand.tols ? cand.tols[i] : tol),
      );
      const m = measure(puzzle, true);
      const ys = puzzle.targets.flatMap((t) => [t.baseY, t.aY, t.bY]);
      const offWall = ys.some((y) => y < 5 || y > 295);
      const line =
        `${m.id}: span=${m.span} Mmin=${m.Mmin} solFits=[${m.solFits.join(",")}] visited=${m.visited} ${m.censusMs}ms` +
        (m.beats === 2
          ? ` lists=[${m.listSizes}] pair=${m.pairMs}ms counts1=[${m.counts1}] counts2=[${m.counts2}] both=${m.directBothAtB0} pcB0=${m.pairCountB0}`
          : ` poseCounts=[${m.poseCounts}] @ [${m.poseBuckets}]`) +
        ` targets=${JSON.stringify(puzzle.targets)}${offWall ? "  OFF-WALL" : ""}`;
      console.log(line);
    });
  });
} else {
  App.shadowPuzzles.forEach((puzzle) => {
    measure(puzzle, false);
  });
}
