#!/usr/bin/env node
/* Aurora Flow board forge + verifier.
 *
 * The game's rule, read off game-aurora-flow.js: a ribbon is a vertex-disjoint
 * path between its two endpoints - it may not step on another ribbon's cells
 * NOR on another pair's endpoint cell. Every board is therefore checked with a
 * complete backtracking solver that holds exactly those rules.
 *
 * The forge builds boards solution-first (one long self-avoiding snake over the
 * grid, cut into consecutive pieces that are disjoint by construction), then
 * the independent solver re-solves each board from the pairs alone. A board
 * ships only when the solver proves it, and the solver's own shortest answer is
 * what the ladder is ordered by.
 *
 * Usage:
 *   node tools/aurora-forge.js list             # re-verify every shipped board
 *   node tools/aurora-forge.js board '<json>'   # verify one board literal
 *   node tools/aurora-forge.js forge --only=f13 --seeds=12
 *   node tools/aurora-forge.js emit             # print verified JSON for 11-20
 */
"use strict";

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "assets", "app", "game-aurora-flow.js");

function loadLevels() {
  const file = fs.readFileSync(FILE, "utf8");
  const start = file.indexOf("var auroraLevels = [");
  if (start < 0) throw new Error("auroraLevels not found");
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

/* --------------------------------------------------------------- solver -- */
/* Complete backtracking search for vertex-disjoint ribbon paths, holding the
 * panel's rules exactly. Returns { paths, steps, capped, unsolvable }. */
function solve(size, pairs, opts) {
  const options = opts || {};
  const stepCap = options.stepCap || 2000000;
  const key = (x, y) => y * size + x;
  const inside = (x, y) => x >= 0 && y >= 0 && x < size && y < size;
  const occupied = new Set();
  const reserved = new Set();
  pairs.forEach(function (pair) {
    reserved.add(key(pair[0], pair[1]));
    reserved.add(key(pair[2], pair[3]));
  });
  const paths = new Array(pairs.length).fill(null);
  let steps = 0;
  let capped = false;

  function neighbours(x, y) {
    const out = [];
    if (inside(x - 1, y)) out.push([x - 1, y]);
    if (inside(x + 1, y)) out.push([x + 1, y]);
    if (inside(x, y - 1)) out.push([x, y - 1]);
    if (inside(x, y + 1)) out.push([x, y + 1]);
    return out;
  }

  /* Necessary condition: every open pair's endpoints must still touch one
   * shared free region. One flood fill labels the free cells; each pair is
   * then a constant-time look at the two mouths it owns. */
  function openPairsStillMeet() {
    const labels = new Map();
    let nextLabel = 1;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const k = key(x, y);
        if (labels.has(k) || occupied.has(k) || reserved.has(k)) continue;
        const label = nextLabel;
        nextLabel += 1;
        labels.set(k, label);
        const queue = [[x, y]];
        while (queue.length) {
          const [cx, cy] = queue.shift();
          for (const [nx, ny] of neighbours(cx, cy)) {
            const nk = key(nx, ny);
            if (labels.has(nk) || occupied.has(nk) || reserved.has(nk)) continue;
            labels.set(nk, label);
            queue.push([nx, ny]);
          }
        }
      }
    }
    for (let p = 0; p < pairs.length; p += 1) {
      if (paths[p]) continue;
      const [ax, ay, bx, by] = pairs[p];
      /* An adjacent pair closes in one hop and needs no free cell between. */
      if (Math.abs(ax - bx) + Math.abs(ay - by) === 1) continue;
      const ownA = key(ax, ay);
      const ownB = key(bx, by);
      const freeish = (k) => !occupied.has(k) && (!reserved.has(k) || k === ownA || k === ownB);
      const reachA = new Set();
      neighbours(ax, ay).forEach(function ([nx, ny]) {
        const nk = key(nx, ny);
        if (freeish(nk) && labels.has(nk)) reachA.add(labels.get(nk));
      });
      const shared = neighbours(bx, by).some(function ([nx, ny]) {
        const nk = key(nx, ny);
        return freeish(nk) && reachA.has(labels.get(nk));
      });
      if (!shared) return false;
    }
    return true;
  }

  /* Static order, nearest pairs first: they commit the fewest cells and so are
   * the cheapest to place before the board gets crowded. */
  const order = pairs
    .map((pair, index) => ({
      index,
      dist: Math.abs(pair[0] - pair[2]) + Math.abs(pair[1] - pair[3]),
    }))
    .sort((a, b) => a.dist - b.dist || a.index - b.index);

  /* How many cells this endpoint could still grow into, counting its own twin
   * as a mouth. */
  function openScore(x, y, ownA, ownB) {
    return neighbours(x, y).filter(function ([nx, ny]) {
      const k = key(nx, ny);
      if (occupied.has(k)) return false;
      return !reserved.has(k) || k === ownA || k === ownB;
    }).length;
  }

  /* DFS over simple paths: at every step, prune any branch that cuts an open
   * pair in half, and claim interiors with `occupied` once a ribbon closes. */
  function route(orderPos) {
    if (orderPos >= order.length) return true;
    if (steps > stepCap) {
      capped = true;
      return false;
    }
    const pairIndex = order[orderPos].index;
    const [x1, y1, x2, y2] = pairs[pairIndex];
    const aK = key(x1, y1);
    const bK = key(x2, y2);
    if (occupied.has(aK) || occupied.has(bK)) return false;
    const forward = openScore(x1, y1, aK, bK) <= openScore(x2, y2, aK, bK);
    const start = forward ? [x1, y1] : [x2, y2];
    const goal = forward ? [x2, y2] : [x1, y1];
    const path = [start];
    const onPath = new Set([key(start[0], start[1])]);

    function walk() {
      steps += 1;
      if (steps > stepCap) {
        capped = true;
        return false;
      }
      const [cx, cy] = path[path.length - 1];
      if (cx === goal[0] && cy === goal[1]) {
        for (let i = 1; i < path.length - 1; i += 1) occupied.add(key(path[i][0], path[i][1]));
        paths[pairIndex] = path.slice();
        if (openPairsStillMeet() && route(orderPos + 1)) return true;
        paths[pairIndex] = null;
        for (let i = 1; i < path.length - 1; i += 1) occupied.delete(key(path[i][0], path[i][1]));
        return false;
      }
      /* Nearest-to-goal first: the shortest routes carry the solutions, and
       * the search still visits every simple path before it gives up. */
      const options = neighbours(cx, cy).sort(function (p, q) {
        return (
          Math.abs(p[0] - goal[0]) +
          Math.abs(p[1] - goal[1]) -
          (Math.abs(q[0] - goal[0]) + Math.abs(q[1] - goal[1]))
        );
      });
      for (const [nx, ny] of options) {
        const k = key(nx, ny);
        if (onPath.has(k)) continue;
        if (occupied.has(k)) continue;
        if (reserved.has(k) && k !== aK && k !== bK) continue;
        onPath.add(k);
        path.push([nx, ny]);
        if (openPairsStillMeet()) {
          if (walk()) return true;
        }
        path.pop();
        onPath.delete(k);
      }
      return false;
    }
    return walk();
  }

  const solved = route(0);
  if (capped) return { paths: null, capped: true, steps };
  if (!solved) return { paths: null, capped: false, steps, unsolvable: true };
  return { paths, capped: false, steps };
}

/* ------------------------------------------------------------- forge --- */
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

/* One self-avoiding snake over the grid - Warnsdorff's rule keeps it running
 * to the far corners instead of stranding itself - cut into consecutive pieces
 * whose ends become the pairs. Consecutive pieces cannot collide, so a solution
 * always exists; the verifier below still proves it from the pairs alone. */
function generateBoard(spec, seed) {
  const rng = mulberry(seed);
  const { size, pairs: pairCount, border } = spec;
  const key = (x, y) => y * size + x;
  const inside = (x, y) => x >= 0 && y >= 0 && x < size && y < size;
  const isBorder = (x, y) => x === 0 || y === 0 || x === size - 1 || y === size - 1;

  function neighboursOf(x, y) {
    const out = [];
    if (inside(x - 1, y)) out.push([x - 1, y]);
    if (inside(x + 1, y)) out.push([x + 1, y]);
    if (inside(x, y - 1)) out.push([x, y - 1]);
    if (inside(x, y + 1)) out.push([x, y + 1]);
    return out;
  }

  let snake = [];
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const sx = border ? (rng() < 0.5 ? 0 : size - 1) : Math.floor(rng() * size);
    const sy = Math.floor(rng() * size);
    const path = [[sx, sy]];
    const onPath = new Set([key(sx, sy)]);
    for (;;) {
      const [cx, cy] = path[path.length - 1];
      const open = neighboursOf(cx, cy).filter(([nx, ny]) => !onPath.has(key(nx, ny)));
      if (!open.length) break;
      open.sort(function (p, q) {
        const gp = neighboursOf(p[0], p[1]).filter(([nx, ny]) => !onPath.has(key(nx, ny))).length;
        const gq = neighboursOf(q[0], q[1]).filter(([nx, ny]) => !onPath.has(key(nx, ny))).length;
        return gp - gq || rng() - 0.5;
      });
      const [nx, ny] = open[0];
      onPath.add(key(nx, ny));
      path.push([nx, ny]);
    }
    if (path.length > snake.length) snake = path;
    if (snake.length > size * size * 0.72) break;
  }

  const minPiece = 3;
  if (snake.length < minPiece * pairCount) return [];
  const found = [];
  for (let attempt = 0; attempt < 600; attempt += 1) {
    const cuts = new Set();
    let spin = 0;
    while (cuts.size < pairCount - 1 && spin < 80) {
      spin += 1;
      cuts.add(minPiece + Math.floor(rng() * (snake.length - minPiece - minPiece + 1)));
    }
    const points = [0].concat(Array.from(cuts).sort((a, b) => a - b), [snake.length]);
    const pieces = [];
    let spread = 0;
    let ok = true;
    for (let i = 0; i + 1 < points.length; i += 1) {
      const piece = snake.slice(points[i], points[i + 1]);
      const head = piece[0];
      const tail = piece[piece.length - 1];
      if (piece.length < minPiece ||
          Math.abs(head[0] - tail[0]) + Math.abs(head[1] - tail[1]) < 2) {
        ok = false;
        break;
      }
      if (border && !(isBorder(head[0], head[1]) && isBorder(tail[0], tail[1]))) {
        ok = false;
        break;
      }
      spread += Math.abs(head[0] - tail[0]) + Math.abs(head[1] - tail[1]);
      pieces.push(piece);
    }
    if (!ok || pieces.length !== pairCount) continue;
    const board = {
      id: null,
      size: size,
      pairs: pieces.map(function (piece) {
        return [piece[0][0], piece[0][1], piece[piece.length - 1][0], piece[piece.length - 1][1]];
      }),
    };
    found.push({ score: spread, board: board });
  }
  found.sort(function (a, b) { return b.score - a.score; });
  return found.slice(0, spec.variants || 2).map(function (entry) { return entry.board; });
}

function checkBoard(level, stepCap) {
  const problems = [];
  const { size, pairs } = level;
  const seen = new Set();
  pairs.forEach(function (pair, index) {
    const cells = [[pair[0], pair[1]], [pair[2], pair[3]]];
    cells.forEach(function ([x, y]) {
      /* one endpoint per cell, no pair may share one with another */
      if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= size || y >= size) {
        problems.push(`pair ${index} endpoint outside the board`);
      }
      const k = y * size + x;
      if (seen.has(k)) problems.push(`pair ${index} shares an endpoint cell`);
      seen.add(k);
    });
  });
  const solved = solve(size, pairs, { stepCap: stepCap || 2000000 });
  if (solved.capped) problems.push(`solver hit its step cap (${solved.steps})`);
  else if (solved.unsolvable) problems.push("no disjoint path solution exists");
  return { problems: problems, measure: solved.capped || solved.unsolvable ? {} : { steps: solved.steps, cells: solved.paths.reduce(function (sum, p) { return sum + p.length; }, 0) } };
}

function boardStats(level) {
  const dists = level.pairs.map((p) => Math.abs(p[0] - p[2]) + Math.abs(p[1] - p[3]));
  const cells = dists.reduce((a, b) => a + b, 0);
  const m = measure(level);
  return {
    pairs: level.pairs.length,
    avgDist: cells / dists.length,
    ink: m.cells,
    fill: m.cells / (level.size * level.size),
    steps: m.steps,
  };
}

function measure(level) {
  const solved = solve(level.size, level.pairs);
  if (solved.capped || solved.unsolvable) return { steps: solved.steps };
  const cells = solved.paths.reduce((sum, p) => sum + p.length, 0);
  return { steps: solved.steps, cells: cells };
}

/* ---------------------------------------------------------------- emit -- */
/* Boards 11-20 are re-forged and re-verified here, then handed to
 * tools/apply-aurora-levels.js which writes them into the module. */
function emit() {
  const brief = [
    { id: "f11", labelKey: "auroL11", size: 8, pairs: 10, seedBase: 1103 },
    { id: "f12", labelKey: "auroL12", size: 8, pairs: 11, seedBase: 2311 },
    { id: "f13", labelKey: "auroL13", size: 9, pairs: 11, seedBase: 3701 },
    { id: "f14", labelKey: "auroL14", size: 8, pairs: 11, seedBase: 5309 },
    { id: "f15", labelKey: "auroL15", size: 9, pairs: 12, seedBase: 7109 },
    { id: "f16", labelKey: "auroL16", size: 9, pairs: 13, seedBase: 9701 },
    { id: "f17", labelKey: "auroL17", size: 9, pairs: 13, seedBase: 11317 },
    { id: "f18", labelKey: "auroL18", size: 9, pairs: 14, seedBase: 13109 },
    { id: "f19", labelKey: "auroL19", size: 9, pairs: 14, seedBase: 15121 },
    { id: "f20", labelKey: "auroL20", size: 9, pairs: 15, seedBase: 17327 },
  ];
  const out = [];
  brief.forEach(function (spec) {
    let best = null;
    for (let seed = 1; seed <= 12; seed += 1) {
      const candidates = generateBoard(spec, seed * 7919 + spec.seedBase);
      candidates.forEach(function (candidate) {
        const screen = checkBoard(candidate, 300000);
        if (screen.problems.length || typeof screen.measure.cells !== "number") return;
        if (best && screen.measure.cells <= best.cells) return;
        best = { board: candidate, cells: screen.measure.cells, steps: screen.measure.steps };
      });
    }
    if (!best) {
      console.log(`!! ${spec.id}: no board`);
      return;
    }
    out.push({ id: spec.id, labelKey: spec.labelKey, size: best.board.size, pairs: best.board.pairs, cells: best.cells, steps: best.steps });
  });
  return out;
}

function main() {
  const mode = process.argv[2] || "list";

  if (mode === "emit") {
    const boards = emit();
    boards.sort((a, b) => a.cells - b.cells || a.steps - b.steps);
    /* The ladder is ordered by how much ribbon the solver had to lay, so the
     * rungs climb; ids follow that order, which is why the forged ids are
     * re-assigned here rather than kept. */
    boards.forEach((board, index) => {
      board.id = "f" + (11 + index);
      board.labelKey = "auroL" + (11 + index);
      /* 3-star holds f10's budget of roughly one second per inked cell, then
       * the bands widen along the same climb. */
      const three = Math.round(board.cells * 1.02);
      board.starTimes = [
        three,
        Math.round(three * 1.55),
        Math.round(three * 2.15),
      ];
    });
    fs.writeFileSync(
      path.join(__dirname, "_aurora_boards.json"),
      JSON.stringify(boards, null, 2) + "\n",
    );
    boards.forEach((board) => {
      console.log(
        `${board.id}  size ${board.size}  pairs ${board.pairs.length}  ink ${board.cells}  fill ${((board.cells / (board.size * board.size)) * 100).toFixed(0)}%  steps ${board.steps}  stars ${board.starTimes.join("/")}`,
      );
    });
    return;
  }

  if (mode === "list") {
    const levels = loadLevels();
    let bad = 0;
    levels.forEach((level) => {
      const t0 = Date.now();
      const { problems, measure: m } = checkBoard(level);
      if (problems.length) bad += 1;
      console.log(
        `${problems.length ? "FAIL" : "ok  "}  ${level.id}  size ${level.size}  pairs ${level.pairs.length}  ribbon cells ${m.cells || "-"}  ${Date.now() - t0}ms${problems.length ? "  " + problems.join("; ") : ""}`,
      );
    });
    console.log(bad ? `${bad} board(s) failed` : `all ${levels.length} boards verified`);
    process.exit(bad ? 1 : 0);
  }

  if (mode === "board") {
    const level = JSON.parse(process.argv[3]);
    const { problems, measure: m } = checkBoard(level);
    if (problems.length) {
      console.log("FAIL " + problems.join("; "));
      process.exit(1);
    }
    console.log(`ok  ribbon cells ${m.cells}`);
    return;
  }

  if (mode === "forge") {
    const only = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);
    const seeds = Number((process.argv.find((a) => a.startsWith("--seeds=")) || "").slice(8)) || 12;
    const boards = emit();
    boards
      .filter((board) => !only || board.id === only)
      .forEach((board) => {
        console.log(
          `${board.id}: size ${board.size} pairs ${board.pairs.length} ink ${board.cells} fill ${((board.cells / (board.size * board.size)) * 100).toFixed(0)}%`,
        );
        console.log("    {");
        console.log(`      id: "${board.id}", labelKey: "${board.labelKey}", size: ${board.size},`);
        console.log("      pairs: [" + board.pairs.map((p) => `[${p.join(", ")}]`).join(", ") + "],");
        console.log("      starTimes: [" + (board.starTimes || []).join(", ") + "],");
        console.log("    },");
      });
    void seeds;
  }
}

module.exports = { solve, loadLevels, checkBoard, generateBoard, boardStats, measure, emit };

if (require.main === module) {
  main();
}
