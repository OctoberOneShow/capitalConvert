#!/usr/bin/env node
/* Prism Path level forge.
 *
 * Two jobs, one engine - the same beam tracer the game runs:
 *
 *   node tools/prism-forge.js forge [seed]   search for new boards
 *   node tools/prism-forge.js verify         prove every shipped board
 *
 * `forge` walks random layouts and keeps only the boards that survive the
 * release bar below; it prints them as source-ready literals. `verify` reads
 * the live `prismLevels` table out of assets/app/game-prism-path.js and
 * re-checks that bar, so a hand edit cannot ship an unsolvable board.
 *
 * Release bar for every board:
 *   1. geometry      emitter, walls, elements and targets all inside the grid,
 *                    and no two of them share a cell;
 *   2. unsolved deal the slopes the player is handed do not already light
 *                    every target;
 *   3. solvable      some orientation of the free elements lights them all;
 *   4. earned        2-5 flips separate the deal from the nearest solution;
 *   5. tight         at most four orientations solve it, so guessing cannot
 *                    carry the board;
 *   6. every element counts - the solution beam touches each element;
 *   7. route         the solution beam turns at least three times.
 */
"use strict";

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var GAME_FILE = path.join(ROOT, "assets", "app", "game-prism-path.js");

/* dir: 0 right, 1 down, 2 left, 3 up. slope 1 is "/", slope 0 is "\". */
var STEP_X = [1, 0, -1, 0];
var STEP_Y = [0, 1, 0, -1];
var REFLECT = {
  0: { 1: 3, 0: 1 },
  1: { 1: 0, 0: 2 },
  2: { 1: 1, 0: 3 },
  3: { 1: 2, 0: 0 },
};

function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cellKey(x, y) {
  return x + "," + y;
}

/* The board a tracer understands. `elements` carry the author's fields plus
 * an `index`; locked elements never move, splitters pass the beam straight
 * through *and* reflect it. */
function normalise(level) {
  var elements = (level.mirrors || []).map(function (mirror, index) {
    return {
      index: index,
      x: mirror.x,
      y: mirror.y,
      slope: mirror.slope,
      split: !!mirror.split,
      locked: !!mirror.locked,
    };
  });
  var walls = {};
  (level.walls || []).forEach(function (wall) {
    walls[cellKey(wall[0], wall[1])] = true;
  });
  return {
    id: level.id,
    w: level.w,
    h: level.h,
    emitter: level.emitter,
    targets: level.targets || [],
    walls: walls,
    elements: elements,
  };
}

function trace(board, slopes) {
  var visited = {};
  var hits = {};
  var seen = {};
  var turns = 0;
  var queue = [{ x: board.emitter.x, y: board.emitter.y, dir: board.emitter.dir }];
  var guard = 0;
  while (queue.length && guard < 8000) {
    guard += 1;
    var cur = queue.shift();
    var x = cur.x + STEP_X[cur.dir];
    var y = cur.y + STEP_Y[cur.dir];
    if (x < 0 || y < 0 || x >= board.w || y >= board.h) {
      continue;
    }
    var stateKey = x + "," + y + "," + cur.dir;
    if (seen[stateKey]) {
      continue;
    }
    seen[stateKey] = true;
    visited[cellKey(x, y)] = true;
    if (board.walls[cellKey(x, y)]) {
      continue;
    }
    var outs = [];
    var element = null;
    for (var i = 0; i < board.elements.length; i += 1) {
      if (board.elements[i].x === x && board.elements[i].y === y) {
        element = board.elements[i];
        break;
      }
    }
    if (element) {
      hits[element.index] = true;
      turns += 1;
      outs.push(REFLECT[cur.dir][slopes[element.index]]);
      if (element.split) {
        outs.push(cur.dir);
      }
    } else {
      outs.push(cur.dir);
    }
    /* Reaching the emitter ends that branch: the housing absorbs it. */
    if (x === board.emitter.x && y === board.emitter.y) {
      continue;
    }
    outs.forEach(function (dir) {
      queue.push({ x: x, y: y, dir: dir });
    });
  }
  var lit = board.targets.filter(function (target) {
    return visited[cellKey(target[0], target[1])];
  }).length;
  var cells = Object.keys(visited).length;
  return { visited: visited, hits: hits, turns: turns, lit: lit, cells: cells };
}

function freeIndices(board) {
  return board.elements.filter(function (element) {
    return !element.locked;
  }).map(function (element) {
    return element.index;
  });
}

/* Every reachable orientation of the board: locked elements keep the author's
 * slope, the rest sweep both values. */
function orientations(board) {
  var free = freeIndices(board);
  var list = [];
  var total = Math.pow(2, free.length);
  for (var mask = 0; mask < total; mask += 1) {
    var slopes = board.elements.map(function (element) {
      return element.slope;
    });
    free.forEach(function (index, bit) {
      slopes[index] = (mask >> bit) & 1;
    });
    list.push(slopes);
  }
  return list;
}

function hamming(a, b, free) {
  var count = 0;
  free.forEach(function (index) {
    if (a[index] !== b[index]) {
      count += 1;
    }
  });
  return count;
}

function geometryProblems(board) {
  var problems = [];
  var taken = {};
  function claim(x, y, what) {
    if (x < 0 || y < 0 || x >= board.w || y >= board.h) {
      problems.push(what + " (" + x + "," + y + ") is outside the grid");
      return;
    }
    var key = cellKey(x, y);
    if (taken[key]) {
      problems.push(what + " (" + x + "," + y + ") shares a cell with " + taken[key]);
      return;
    }
    taken[key] = what;
  }
  claim(board.emitter.x, board.emitter.y, "emitter");
  (board.walls ? Object.keys(board.walls) : []).forEach(function (key) {
    var parts = key.split(",");
    claim(Number(parts[0]), Number(parts[1]), "wall");
  });
  board.elements.forEach(function (element) {
    claim(element.x, element.y, element.split ? "splitter" : "mirror");
  });
  board.targets.forEach(function (target) {
    claim(target[0], target[1], "target");
  });
  return problems;
}

/* The release bar, run against one board. `deal` is the slope vector the
 * player is handed; it defaults to the author's slopes.
 *
 * Every board has to clear the baseline: sane geometry, a deal that is not
 * already solved, and at least one orientation that is. Boards from p11 on
 * also clear the design bar - earned flips, few solutions, no dead element
 * and a beam that actually bends. The original ten shipped as tutorials and
 * keep their looser shape on purpose. */
function audit(rawLevel, strict) {
  var board = normalise(rawLevel);
  var problems = geometryProblems(board).filter(function (problem) {
    return strict || !/target .* shares a cell/.test(problem);
  });
  var free = freeIndices(board);
  if (!board.elements.length) {
    problems.push("no elements");
  }
  if (!board.targets.length) {
    problems.push("no targets");
  }
  if (problems.length) {
    return { id: board.id, ok: false, problems: problems };
  }
  var deal = board.elements.map(function (element) {
    return element.slope;
  });
  var all = orientations(board);
  var runs = all.map(function (slopes) {
    return { slopes: slopes, result: trace(board, slopes) };
  });
  var solved = runs.filter(function (run) {
    return run.result.lit === board.targets.length;
  });
  var dealRun = runs.filter(function (run) {
    return hamming(run.slopes, deal, free) === 0;
  })[0];
  if (!solved.length) {
    return {
      id: board.id,
      ok: false,
      problems: ["no orientation lights all " + board.targets.length + " targets"],
    };
  }
  if (dealRun.result.lit === board.targets.length) {
    return { id: board.id, ok: false, problems: ["the deal already lights every target"] };
  }
  var nearest = solved.reduce(function (best, run) {
    return Math.min(best, hamming(run.slopes, deal, free));
  }, 99);
  var fattest = solved.reduce(function (best, run) {
    var used = Object.keys(run.result.hits).length;
    return used > best.used ? { used: used, run: run } : best;
  }, { used: -1, run: null });
  if (!strict) {
    return {
      id: board.id,
      ok: true,
      problems: [],
      targets: board.targets.length,
      elements: board.elements.length,
      splitters: board.elements.filter(function (e) { return e.split; }).length,
      locked: board.elements.filter(function (e) { return e.locked; }).length,
      flips: nearest,
      solutions: solved.length,
      lit: dealRun.result.lit,
      turns: fattest.run.result.turns,
      cells: fattest.run.result.cells,
    };
  }
  if (nearest < 2 || nearest > 5) {
    return {
      id: board.id,
      ok: false,
      problems: ["nearest solution is " + nearest + " flips away (want 2-5)"],
    };
  }
  if (solved.length > 4) {
    return {
      id: board.id,
      ok: false,
      problems: [solved.length + " orientations solve it (want at most 4)"],
    };
  }
  if (fattest.used < board.elements.length) {
    return {
      id: board.id,
      ok: false,
      problems: ["only " + fattest.used + "/" + board.elements.length + " elements carry the solution beam"],
    };
  }
  if (fattest.run.result.turns < 3) {
    return {
      id: board.id,
      ok: false,
      problems: ["the solution beam only turns " + fattest.run.result.turns + " times (want 3+)"],
    };
  }
  return {
    id: board.id,
    ok: true,
    problems: [],
    targets: board.targets.length,
    elements: board.elements.length,
    splitters: board.elements.filter(function (e) { return e.split; }).length,
    locked: board.elements.filter(function (e) { return e.locked; }).length,
    flips: nearest,
    solutions: solved.length,
    lit: dealRun.result.lit,
    turns: fattest.run.result.turns,
    cells: fattest.run.result.cells,
  };
}

/* ------------------------------------------------------------------ forge */

function randomLayout(rand, spec) {
  var w = spec.w;
  var h = spec.h;
  var side = Math.floor(rand() * 4);
  var emitter;
  if (side === 0) {
    emitter = { x: 0, y: 1 + Math.floor(rand() * (h - 2)), dir: 0 };
  } else if (side === 1) {
    emitter = { x: 1 + Math.floor(rand() * (w - 2)), y: 0, dir: 1 };
  } else if (side === 2) {
    emitter = { x: w - 1, y: 1 + Math.floor(rand() * (h - 2)), dir: 2 };
  } else {
    emitter = { x: 1 + Math.floor(rand() * (w - 2)), y: h - 1, dir: 3 };
  }
  var taken = {};
  taken[cellKey(emitter.x, emitter.y)] = true;
  function pick() {
    for (var attempt = 0; attempt < 200; attempt += 1) {
      var x = Math.floor(rand() * w);
      var y = Math.floor(rand() * h);
      if (!taken[cellKey(x, y)]) {
        taken[cellKey(x, y)] = true;
        return { x: x, y: y };
      }
    }
    return null;
  }
  var walls = [];
  for (var i = 0; i < spec.walls; i += 1) {
    var wall = pick();
    if (wall) {
      walls.push([wall.x, wall.y]);
    }
  }
  var elements = [];
  for (var j = 0; j < spec.elements; j += 1) {
    var cell = pick();
    if (!cell) {
      break;
    }
    elements.push({
      x: cell.x,
      y: cell.y,
      slope: rand() < 0.5 ? 0 : 1,
      split: false,
      locked: false,
    });
  }
  return { w: w, h: h, emitter: emitter, walls: walls, mirrors: elements, targets: [] };
}

function spread(board, cells) {
  var minX = 99;
  var maxX = -1;
  var minY = 99;
  var maxY = -1;
  cells.forEach(function (cell) {
    minX = Math.min(minX, cell[0]);
    maxX = Math.max(maxX, cell[0]);
    minY = Math.min(minY, cell[1]);
    maxY = Math.max(maxY, cell[1]);
  });
  return Math.max(maxX - minX, maxY - minY);
}

/* The observatory tier's benches are too dense for uniform scatter: on an
 * eleven-across board with twelve elements, not one layout in three thousand
 * had a single orientation whose beam touched every element, so the scatter
 * search starves before it ever reaches the deal. `chain` specs are laid
 * along a simulated beam walk instead: each element is seated on the ray the
 * walk is travelling, its slope chosen by looking down both outgoing legs,
 * and an old element caught in the path is a free re-hit bend. The
 * all-element run the release bar demands therefore exists by construction,
 * the walk records the corridor it crosses, and walls are cut only outside
 * that corridor so no breaker can amputate the chain. Everything downstream
 * - the orientation sweep, the deal, the audit - still judges the finished
 * board the same way as a scatter board. */
function chainedLayout(rand, spec) {
  var w = spec.w;
  var h = spec.h;
  var side = Math.floor(rand() * 4);
  var emitter;
  if (side === 0) {
    emitter = { x: 0, y: 1 + Math.floor(rand() * (h - 2)), dir: 0 };
  } else if (side === 1) {
    emitter = { x: 1 + Math.floor(rand() * (w - 2)), y: 0, dir: 1 };
  } else if (side === 2) {
    emitter = { x: w - 1, y: 1 + Math.floor(rand() * (h - 2)), dir: 2 };
  } else {
    emitter = { x: 1 + Math.floor(rand() * (w - 2)), y: h - 1, dir: 3 };
  }
  var taken = {};
  var corridor = {};
  taken[cellKey(emitter.x, emitter.y)] = "emitter";
  var gapMin = spec.gapMin || 1;
  var gapMax = spec.gapMax || 3;
  var elements = [];
  function elementAt(x, y) {
    for (var i = 0; i < elements.length; i += 1) {
      if (elements[i].x === x && elements[i].y === y) {
        return elements[i];
      }
    }
    return null;
  }
  /* How far the beam travels from a cell before the edge, the housing or an
   * element stops it, and which of the three stopped it. */
  function probe(x, y, dir) {
    for (var step = 1; step <= 24; step += 1) {
      var nx = x + STEP_X[dir] * step;
      var ny = y + STEP_Y[dir] * step;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
        return { room: step - 1, kind: "edge" };
      }
      if (taken[cellKey(nx, ny)]) {
        return { room: step, kind: taken[cellKey(nx, ny)] };
      }
    }
    return { room: 24, kind: "edge" };
  }
  var x = emitter.x;
  var y = emitter.y;
  var dir = emitter.dir;
  var guard = 0;
  while (elements.length < spec.elements && guard < 400) {
    guard += 1;
    var ahead = probe(x, y, dir);
    var gap = 0;
    if (ahead.kind === "element" && ahead.room <= 9 && rand() < 0.5) {
      gap = ahead.room;
    } else {
      var top = Math.min(gapMax, ahead.room - 1);
      if (top < gapMin) {
        return null;
      }
      gap = gapMin + Math.floor(rand() * (top - gapMin + 1));
    }
    var sx = x;
    var sy = y;
    for (var step = 0; step < gap; step += 1) {
      sx += STEP_X[dir];
      sy += STEP_Y[dir];
      corridor[cellKey(sx, sy)] = true;
    }
    if (taken[cellKey(sx, sy)]) {
      if (taken[cellKey(sx, sy)] === "emitter") {
        return null;
      }
      /* Re-hit: the beam bounces off the old element and the walk goes on
       * without spending the budget - an extra bend in the shipped route. */
      var old = elementAt(sx, sy);
      x = sx;
      y = sy;
      dir = REFLECT[dir][old.slope];
      continue;
    }
    taken[cellKey(sx, sy)] = "element";
    /* Both slopes are legal at the new seat; look down each outgoing leg and
     * prefer the one that re-hits an old element or simply has room. */
    var legA = REFLECT[dir][1];
    var legB = REFLECT[dir][0];
    var rayA = probe(sx, sy, legA);
    var rayB = probe(sx, sy, legB);
    var okA = rayA.room >= gapMin + 1 || (rayA.kind === "element" && rayA.room <= 9);
    var okB = rayB.room >= gapMin + 1 || (rayB.kind === "element" && rayB.room <= 9);
    var slope;
    if (!okA && !okB) {
      return null;
    } else if (!okB) {
      slope = 1;
    } else if (!okA) {
      slope = 0;
    } else {
      var hitA = rayA.kind === "element" && rayA.room <= 9;
      var hitB = rayB.kind === "element" && rayB.room <= 9;
      if ((hitA || hitB) && rand() < 0.75) {
        slope = hitA && (!hitB || rand() < 0.5) ? 1 : 0;
      } else {
        var roomy = rayA.room === rayB.room ? (rand() < 0.5 ? 1 : 0)
          : rayA.room > rayB.room ? 1 : 0;
        slope = rand() < 0.85 ? roomy : 1 - roomy;
      }
    }
    elements.push({ x: sx, y: sy, slope: slope, split: false, locked: false });
    x = sx;
    y = sy;
    dir = REFLECT[dir][slope];
  }
  if (elements.length < spec.elements) {
    return null;
  }
  var walls = [];
  for (var i = 0; i < spec.walls; i += 1) {
    var wall = null;
    for (var tryWall = 0; tryWall < 200 && !wall; tryWall += 1) {
      var wx = Math.floor(rand() * w);
      var wy = Math.floor(rand() * h);
      if (!taken[cellKey(wx, wy)] && !corridor[cellKey(wx, wy)]) {
        taken[cellKey(wx, wy)] = "wall";
        wall = [wx, wy];
      }
    }
    if (wall) {
      walls.push(wall);
    }
  }
  return { w: w, h: h, emitter: emitter, walls: walls, mirrors: elements, targets: [] };
}

function forgeOne(rand, spec) {
  var layout = spec.chain ? chainedLayout(rand, spec) : randomLayout(rand, spec);
  if (!layout) {
    return null;
  }
  /* Splitters and welded elements are chosen before the board is normalised:
   * the enumeration below has to know which slopes can actually move, or it
   * would propose solutions the finished board cannot reach. */
  var order = layout.mirrors.map(function (mirror, index) {
    return index;
  });
  for (var swap = order.length - 1; swap > 0; swap -= 1) {
    var other = Math.floor(rand() * (swap + 1));
    var hold = order[swap];
    order[swap] = order[other];
    order[other] = hold;
  }
  order.forEach(function (index, position) {
    if (position < spec.splitters) {
      layout.mirrors[index].split = true;
    } else if (position < spec.splitters + spec.locked) {
      layout.mirrors[index].locked = true;
    }
  });
  var board = normalise(layout);
  var free = freeIndices(board);
  var all = orientations(board);
  var runs = all.map(function (slopes) {
    return { slopes: slopes, result: trace(board, slopes) };
  });
  /* Candidate solutions: beams that travel far, turn often and use every
   * element, so no mirror in the finished board is dead weight. */
  var candidates = runs.filter(function (run) {
    return (
      Object.keys(run.result.hits).length === board.elements.length &&
      run.result.turns >= spec.turns &&
      run.result.cells >= spec.cells
    );
  });
  if (!candidates.length) {
    return null;
  }
  var elementKeys = {};
  board.elements.forEach(function (element) {
    elementKeys[cellKey(element.x, element.y)] = true;
  });
  var emitterKey = cellKey(board.emitter.x, board.emitter.y);
  var best = null;
  candidates.forEach(function (run) {
    var pool = Object.keys(run.result.visited).filter(function (key) {
      return !elementKeys[key] && key !== emitterKey;
    });
    if (pool.length < spec.targets) {
      return;
    }
    for (var sample = 0; sample < spec.samples; sample += 1) {
      var chosen = [];
      var bag = pool.slice();
      while (chosen.length < spec.targets && bag.length) {
        chosen.push(bag.splice(Math.floor(rand() * bag.length), 1)[0]);
      }
      if (chosen.length < spec.targets) {
        continue;
      }
      if (spread(board, chosen.map(function (key) {
        return key.split(",").map(Number);
      })) < spec.spread) {
        continue;
      }
      var targets = chosen.map(function (key) {
        return key.split(",").map(Number);
      });
      var solving = runs.filter(function (other) {
        return targets.every(function (target) {
          return other.result.visited[cellKey(target[0], target[1])];
        });
      });
      if (!solving.length || solving.length > spec.maxSolutions) {
        continue;
      }
      /* The deal: an orientation the player is handed that is not a solution
       * and sits 2-4 flips from the nearest one. */
      var deals = runs.filter(function (other) {
        var litDeal = targets.filter(function (target) {
          return other.result.visited[cellKey(target[0], target[1])];
        }).length;
        if (litDeal === spec.targets || litDeal > spec.maxLitDeal) {
          return false;
        }
        var near = solving.reduce(function (low, solution) {
          return Math.min(low, hamming(other.slopes, solution.slopes, free));
        }, 99);
        return near >= spec.minFlips && near <= spec.maxFlips;
      });
      if (!deals.length) {
        continue;
      }
      var deal = deals[Math.floor(rand() * deals.length)];
      var level = {
        w: board.w,
        h: board.h,
        emitter: board.emitter,
        targets: targets,
        walls: board.walls ? Object.keys(board.walls).map(function (key) {
          return key.split(",").map(Number);
        }) : [],
        mirrors: board.elements.map(function (element, index) {
          return {
            x: element.x,
            y: element.y,
            slope: deal.slopes[index],
            split: element.split,
            locked: element.locked,
          };
        }),
      };
      var report = audit(level, true);
      if (!report.ok) {
        continue;
      }
      var score =
        report.targets * 12 +
        report.cells * 2 +
        report.turns * 6 +
        (5 - report.solutions) * 5 +
        report.flips * 4;
      if (!best || score > best.score) {
        best = { score: score, level: level, report: report };
      }
    }
  });
  return best;
}

function printLevel(level, meta) {
  var lines = [];
  lines.push("    {");
  lines.push(
    '      id: "' + meta.id + '", labelKey: "' + meta.labelKey + '", w: ' +
      level.w + ", h: " + level.h + ",",
  );
  lines.push(
    "      emitter: { x: " + level.emitter.x + ", y: " + level.emitter.y +
      ", dir: " + level.emitter.dir + " },",
  );
  lines.push("      targets: [" + level.targets.map(function (target) {
    return "[" + target[0] + ", " + target[1] + "]";
  }).join(", ") + "],");
  lines.push("      walls: [" + level.walls.map(function (wall) {
    return "[" + wall[0] + ", " + wall[1] + "]";
  }).join(", ") + "],");
  lines.push("      mirrors: [");
  level.mirrors.forEach(function (mirror) {
    var parts = [
      "x: " + mirror.x,
      "y: " + mirror.y,
      "slope: " + mirror.slope,
    ];
    if (mirror.split) {
      parts.push("split: true");
    }
    if (mirror.locked) {
      parts.push("locked: true");
    }
    lines.push("        { " + parts.join(", ") + " },");
  });
  lines.push("      ],");
  lines.push("      starTimes: [" + meta.starTimes.join(", ") + "],");
  lines.push("    },");
  return lines.join("\n");
}

function forge(seed) {
  var specs = [
    { w: 7, h: 7, walls: 2, elements: 4, splitters: 0, locked: 0, targets: 3, turns: 3, cells: 12, spread: 4, minFlips: 2, maxFlips: 3, maxSolutions: 4, maxLitDeal: 1, samples: 90 },
    { w: 7, h: 7, walls: 3, elements: 5, splitters: 0, locked: 0, targets: 4, turns: 4, cells: 14, spread: 4, minFlips: 2, maxFlips: 4, maxSolutions: 4, maxLitDeal: 1, samples: 90 },
    { w: 8, h: 8, walls: 3, elements: 5, splitters: 1, locked: 0, targets: 4, turns: 4, cells: 16, spread: 5, minFlips: 2, maxFlips: 4, maxSolutions: 3, maxLitDeal: 1, samples: 90 },
    { w: 8, h: 8, walls: 4, elements: 6, splitters: 1, locked: 0, targets: 4, turns: 5, cells: 18, spread: 5, minFlips: 2, maxFlips: 4, maxSolutions: 3, maxLitDeal: 1, samples: 90 },
    { w: 8, h: 8, walls: 4, elements: 6, splitters: 2, locked: 0, targets: 5, turns: 5, cells: 20, spread: 5, minFlips: 3, maxFlips: 4, maxSolutions: 3, maxLitDeal: 1, samples: 90 },
    { w: 9, h: 9, walls: 4, elements: 6, splitters: 1, locked: 1, targets: 5, turns: 5, cells: 22, spread: 6, minFlips: 2, maxFlips: 4, maxSolutions: 3, maxLitDeal: 1, samples: 90 },
    { w: 9, h: 9, walls: 5, elements: 7, splitters: 2, locked: 1, targets: 5, turns: 6, cells: 24, spread: 6, minFlips: 3, maxFlips: 5, maxSolutions: 3, maxLitDeal: 2, samples: 110 },
    { w: 9, h: 9, walls: 5, elements: 7, splitters: 2, locked: 2, targets: 6, turns: 6, cells: 24, spread: 6, minFlips: 2, maxFlips: 5, maxSolutions: 3, maxLitDeal: 2, samples: 140 },
    { w: 9, h: 9, walls: 6, elements: 8, splitters: 2, locked: 2, targets: 6, turns: 6, cells: 26, spread: 6, minFlips: 2, maxFlips: 5, maxSolutions: 3, maxLitDeal: 2, samples: 140 },
    { w: 9, h: 9, walls: 6, elements: 8, splitters: 3, locked: 2, targets: 6, turns: 7, cells: 28, spread: 7, minFlips: 3, maxFlips: 5, maxSolutions: 3, maxLitDeal: 2, samples: 140 },
    /* The deep tier holds the bar Aurora Engine set - deals 4-5 flips out -
     * and widens the game: seven targets, then the first ten-across bench,
     * then the most welded board, then the summit with four splitters, ten
     * elements and a single solving orientation on the wide bench. */
    { w: 9, h: 9, walls: 6, elements: 8, splitters: 3, locked: 2, targets: 7, turns: 7, cells: 30, spread: 7, minFlips: 4, maxFlips: 5, maxSolutions: 2, maxLitDeal: 2, samples: 140 },
    { w: 10, h: 10, walls: 7, elements: 8, splitters: 3, locked: 2, targets: 6, turns: 8, cells: 32, spread: 8, minFlips: 4, maxFlips: 5, maxSolutions: 2, maxLitDeal: 2, samples: 140, attempts: 60000 },
    { w: 10, h: 10, walls: 7, elements: 9, splitters: 3, locked: 3, targets: 6, turns: 8, cells: 34, spread: 8, minFlips: 4, maxFlips: 5, maxSolutions: 2, maxLitDeal: 2, samples: 140, attempts: 60000 },
    { w: 10, h: 10, walls: 8, elements: 10, splitters: 4, locked: 3, targets: 7, turns: 9, cells: 36, spread: 9, minFlips: 4, maxFlips: 5, maxSolutions: 1, maxLitDeal: 2, samples: 160, attempts: 60000 },
    /* The summit tier keeps the wide bench and grows the fan rung over
     * rung: eight marks on ten elements, the bench rising to eleven and
     * twelve elements with a fifth splitter riding it, nine marks, then the
     * closing rung's ten - a third of the panel lit at once - with the
     * tightest uniqueness bar (one solving orientation) on the last two. */
    { w: 10, h: 10, walls: 8, elements: 10, splitters: 4, locked: 3, targets: 8, turns: 9, cells: 36, spread: 9, minFlips: 4, maxFlips: 5, maxSolutions: 2, maxLitDeal: 2, samples: 160, attempts: 60000 },
    { w: 10, h: 10, walls: 8, elements: 11, splitters: 4, locked: 3, targets: 8, turns: 10, cells: 38, spread: 9, minFlips: 4, maxFlips: 5, maxSolutions: 2, maxLitDeal: 2, samples: 160, attempts: 60000 },
    { w: 10, h: 10, walls: 8, elements: 11, splitters: 5, locked: 3, targets: 9, turns: 10, cells: 38, spread: 9, minFlips: 4, maxFlips: 5, maxSolutions: 2, maxLitDeal: 2, samples: 160, attempts: 60000 },
    { w: 10, h: 10, walls: 9, elements: 12, splitters: 5, locked: 3, targets: 9, turns: 11, cells: 40, spread: 9, minFlips: 4, maxFlips: 5, maxSolutions: 2, maxLitDeal: 2, samples: 160, attempts: 60000 },
    { w: 10, h: 10, walls: 9, elements: 12, splitters: 5, locked: 4, targets: 9, turns: 11, cells: 42, spread: 9, minFlips: 4, maxFlips: 5, maxSolutions: 1, maxLitDeal: 2, samples: 160, attempts: 60000 },
    { w: 10, h: 10, walls: 9, elements: 12, splitters: 5, locked: 4, targets: 10, turns: 12, cells: 44, spread: 9, minFlips: 4, maxFlips: 5, maxSolutions: 1, maxLitDeal: 2, samples: 180, attempts: 80000 },
    /* The observatory tier keeps the summit's bar - deals four to five flips
     * out, the beam touching every element - and takes one structural record
     * per rung against every board before it: the first eleven-across bench,
     * a sweep past Supernova's fifty-seven cells, the first six-fork bench,
     * the first five-weld board, the first eleven-mark fan, the
     * thirteen-element bench, the bendiest route, the first twelve-across
     * bench, the heaviest sweep, and the closer's twelve marks. The record
     * rungs solve from exactly one orientation so the measured beam is the
     * beam, not one solution among several. The dense benches starve the
     * scatter search - no random eleven-across layout in three thousand had
     * an orientation touching all twelve elements - so the five rungs the
     * scatter could not feed are laid out by chainedLayout's beam walk. */
    { w: 11, h: 11, walls: 8, elements: 12, splitters: 5, locked: 4, targets: 10, turns: 10, cells: 34, spread: 9, minFlips: 4, maxFlips: 5, maxSolutions: 2, maxLitDeal: 2, samples: 160, attempts: 60000, chain: true, gapMin: 1, gapMax: 3 },
    { w: 11, h: 11, walls: 7, elements: 12, splitters: 5, locked: 4, targets: 10, turns: 11, cells: 58, spread: 9, minFlips: 4, maxFlips: 5, maxSolutions: 1, maxLitDeal: 2, samples: 160, attempts: 80000, chain: true, gapMin: 3, gapMax: 5 },
    { w: 11, h: 11, walls: 8, elements: 12, splitters: 6, locked: 4, targets: 10, turns: 11, cells: 40, spread: 9, minFlips: 4, maxFlips: 5, maxSolutions: 2, maxLitDeal: 2, samples: 160, attempts: 60000 },
    { w: 11, h: 11, walls: 8, elements: 12, splitters: 6, locked: 5, targets: 10, turns: 11, cells: 40, spread: 9, minFlips: 4, maxFlips: 5, maxSolutions: 2, maxLitDeal: 2, samples: 160, attempts: 60000 },
    { w: 11, h: 11, walls: 8, elements: 12, splitters: 6, locked: 5, targets: 11, turns: 11, cells: 44, spread: 9, minFlips: 4, maxFlips: 5, maxSolutions: 2, maxLitDeal: 2, samples: 160, attempts: 80000 },
    { w: 11, h: 11, walls: 8, elements: 13, splitters: 6, locked: 5, targets: 11, turns: 12, cells: 44, spread: 9, minFlips: 4, maxFlips: 5, maxSolutions: 2, maxLitDeal: 2, samples: 160, attempts: 80000 },
    { w: 11, h: 11, walls: 8, elements: 13, splitters: 6, locked: 5, targets: 11, turns: 16, cells: 44, spread: 9, minFlips: 4, maxFlips: 5, maxSolutions: 1, maxLitDeal: 2, samples: 180, attempts: 80000, chain: true, gapMin: 1, gapMax: 3 },
    { w: 12, h: 12, walls: 9, elements: 13, splitters: 6, locked: 5, targets: 11, turns: 12, cells: 46, spread: 9, minFlips: 4, maxFlips: 5, maxSolutions: 2, maxLitDeal: 2, samples: 160, attempts: 80000 },
    { w: 12, h: 12, walls: 8, elements: 13, splitters: 6, locked: 5, targets: 11, turns: 12, cells: 68, spread: 9, minFlips: 4, maxFlips: 5, maxSolutions: 1, maxLitDeal: 2, samples: 180, attempts: 80000, chain: true, gapMin: 3, gapMax: 6 },
    { w: 12, h: 12, walls: 8, elements: 13, splitters: 6, locked: 5, targets: 12, turns: 13, cells: 60, spread: 9, minFlips: 4, maxFlips: 5, maxSolutions: 1, maxLitDeal: 2, samples: 200, attempts: 100000, chain: true, gapMin: 2, gapMax: 5 },
  ];
  var names = [
    ["p11", "prismL11"], ["p12", "prismL12"], ["p13", "prismL13"],
    ["p14", "prismL14"], ["p15", "prismL15"], ["p16", "prismL16"],
    ["p17", "prismL17"], ["p18", "prismL18"], ["p19", "prismL19"],
    ["p20", "prismL20"], ["p21", "prismL21"], ["p22", "prismL22"],
    ["p23", "prismL23"], ["p24", "prismL24"], ["p25", "prismL25"],
    ["p26", "prismL26"], ["p27", "prismL27"], ["p28", "prismL28"],
    ["p29", "prismL29"], ["p30", "prismL30"],
    ["p31", "prismL31"], ["p32", "prismL32"], ["p33", "prismL33"],
    ["p34", "prismL34"], ["p35", "prismL35"], ["p36", "prismL36"],
    ["p37", "prismL37"], ["p38", "prismL38"], ["p39", "prismL39"],
    ["p40", "prismL40"],
  ];
  var times = [
    [42, 64, 90], [46, 70, 98], [50, 76, 106], [54, 82, 114], [58, 88, 122],
    [62, 94, 130], [66, 100, 138], [70, 106, 146], [78, 118, 162], [88, 132, 180],
    [92, 138, 188], [98, 146, 198], [104, 156, 210], [112, 166, 224],
    [118, 177, 236], [124, 186, 248], [132, 198, 264], [140, 210, 280],
    [148, 222, 296], [158, 237, 316],
    [168, 252, 336], [178, 267, 356], [188, 282, 376], [198, 297, 396],
    [210, 315, 420], [220, 330, 440], [232, 348, 464], [244, 366, 488],
    [256, 384, 512], [272, 408, 544],
  ];
  /* `from` lets a search re-run only the deep rungs (board number, default 11)
   * so an already-shipped rung is never re-forged over. */
  var from = Number((typeof process !== "undefined" &&
    process.argv && process.argv[4]) || 11);
  specs.forEach(function (spec, index) {
    if (Number(String(names[index][0]).replace(/\D/g, "")) < from) {
      return;
    }
    var found = null;
    for (var attempt = 0; attempt < (spec.attempts || 14000) && !found; attempt += 1) {
      var rand = mulberry32(seed + index * 7919 + attempt * 104729);
      var result = forgeOne(rand, spec);
      if (result && result.score >= 60) {
        found = result;
      }
    }
    if (!found) {
      console.log("/* " + names[index][0] + ": no board cleared the bar */");
      return;
    }
    console.log(printLevel(found.level, {
      id: names[index][0],
      labelKey: names[index][1],
      starTimes: times[index],
    }));
    console.log("/* " + names[index][0] + " " + JSON.stringify(found.report) + " */");
  });
}

/* ----------------------------------------------------------------- verify */

function readLevels() {
  var source = fs.readFileSync(GAME_FILE, "utf8").replace(/^﻿/, "");
  var block = /var prismLevels = \[([\s\S]*?)\n  \];/.exec(source);
  if (!block) {
    throw new Error("could not find the prismLevels table");
  }
  /* The table is a plain literal, so it evaluates as-is. */
  return new Function("return [" + block[1] + "];")();
}

function verify() {
  var levels = readLevels();
  var failures = 0;
  console.log("Prism Path boards: " + levels.length);
  levels.forEach(function (level) {
    /* Boards p11 and up are held to the full design bar; the original ten
     * are the tutorial ladder and only have to be sound and solvable. */
    var report = audit(level, Number(String(level.id).replace(/\D/g, "")) >= 11);
    if (!report.ok) {
      failures += 1;
      console.log("  FAIL " + level.id + " - " + report.problems.join("; "));
      return;
    }
    console.log(
      "  ok   " + level.id + " (" + level.w + "x" + level.h + ")" +
        " targets=" + report.targets +
        " elements=" + report.elements +
        " splitters=" + report.splitters +
        " locked=" + report.locked +
        " flips>=" + report.flips +
        " solutions=" + report.solutions +
        " beam=" + report.cells + " cells, " + report.turns + " turns",
    );
  });
  if (failures) {
    console.log("\n" + failures + " board(s) failed the release bar.");
    process.exitCode = 1;
    return;
  }
  console.log("\nAll " + levels.length + " boards clear the release bar.");
}

/* The orientation closest to the deal that lights every target, or null. The
 * harness drives the shipped board with this, which is what proves the game's
 * own tracer and the forge's agree. */
function solve(rawLevel) {
  var board = normalise(rawLevel);
  var free = freeIndices(board);
  var deal = board.elements.map(function (element) {
    return element.slope;
  });
  var best = null;
  orientations(board).forEach(function (slopes) {
    var run = trace(board, slopes);
    if (run.lit !== board.targets.length) {
      return;
    }
    var distance = hamming(slopes, deal, free);
    if (!best || distance < best.distance) {
      best = { distance: distance, slopes: slopes };
    }
  });
  return best;
}

module.exports = {
  trace: trace,
  audit: audit,
  orientations: orientations,
  solve: solve,
  readLevels: readLevels,
  normalise: normalise,
};

if (require.main === module) {
  if (process.argv[2] === "forge") {
    forge(Number(process.argv[3] || 20261018));
  } else {
    verify();
  }
}
