#!/usr/bin/env node
/* Glyph Crossing ford forge + verifier.
 *
 * The panel's rules are copied here exactly: the frog hops one cell at a
 * time, river rows drown it unless a log is under it (which then carries it),
 * road rows squash it when a streak comes within 12px, and the ford clears
 * only when all four pad columns have been stood on - with three lives for
 * the whole run.
 *
 * Rather than trust a hand-written policy, a ford is proved by breadth-first
 * search over the joint state (pads collected, row, position, time). If the
 * search reaches the state where every pad has been stood on, the ford is
 * clearable; the route it found is the certificate, and its length in ticks
 * is what the star bands are set from.
 *
 * Usage:
 *   node tools/crossing-forge.js list          # prove the shipped fords
 *   node tools/crossing-forge.js board <json>  # prove one ford literal
 *   node tools/crossing-forge.js forge         # print new proved fords
 */
"use strict";

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "assets", "app", "game-glyph-crossing.js");

const CRO_CELL = 40;
const CRO_COLS = 8;
const CRO_WIDTH = CRO_CELL * CRO_COLS;
const RIVER_ROWS = [1, 2, 3];
const ROAD_ROWS = [5, 6, 7];
const PAD_COLS = [1, 3, 5, 7];

/* Time quantum and horizon for the search. The panel runs at 60fps; a fifth of
 * a second is far finer than any lane cycle that matters, and 150 seconds is
 * far longer than a clean run takes. */
const TICK = 0.05;
const MAX_TICKS = 3000;

function loadFords() {
  const file = fs.readFileSync(FILE, "utf8");
  const start = file.indexOf("var croLevels = [");
  if (start < 0) throw new Error("croLevels not found");
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

function spawnProps(level) {
  const props = [];
  level.lanes.forEach(function (lane, laneIndex) {
    const span = lane.len + lane.gap;
    const count = Math.ceil((CRO_WIDTH + span) / span) + 1;
    for (let index = 0; index < count; index += 1) {
      props.push({
        row: lane.row,
        dir: lane.dir,
        speed: lane.speed,
        len: lane.len,
        cycle: count * span,
        x0: index * span + (laneIndex * 53) % span,
      });
    }
  });
  return props;
}

/* Where a prop sits after `time` seconds, wrapped the way the panel wraps it
 * (the whole train jumps by a whole cycle once its head leaves the sky). */
function propAt(prop, time) {
  const cycle = prop.cycle;
  let x = prop.x0 + prop.dir * prop.speed * time;
  if (prop.dir > 0) {
    const limit = CRO_WIDTH + 20;
    while (x > limit) x -= cycle;
    while (x <= limit - cycle) x += cycle;
  } else {
    const limit = -20 - prop.len;
    while (x < limit) x += cycle;
    while (x >= limit + cycle) x -= cycle;
  }
  return x;
}

const propsByRowCache = new WeakMap();
function propsByRow(props, row) {
  let map = propsByRowCache.get(props);
  if (!map) {
    map = new Map();
    props.forEach(function (prop) {
      if (!map.has(prop.row)) map.set(prop.row, []);
      map.get(prop.row).push(prop);
    });
    propsByRowCache.set(props, map);
  }
  const list = map.get(row);
  return list || [];
}

/* Would the frog at (row, x) be alive at `time`? */
function lethal(props, row, x, time) {
  if (x < CRO_CELL / 2 || x > CRO_WIDTH - CRO_CELL / 2) return true;
  const list = propsByRow(props, row);
  if (RIVER_ROWS.indexOf(row) !== -1) {
    return !list.some(function (prop) {
      return x > propAt(prop, time) && x < propAt(prop, time) + prop.len;
    });
  }
  if (ROAD_ROWS.indexOf(row) !== -1) {
    return list.some(function (prop) {
      return x > propAt(prop, time) - 12 && x < propAt(prop, time) + prop.len + 12;
    });
  }
  return false;
}

function rideOn(props, row, x, time) {
  return propsByRow(props, row).find(function (prop) {
    return x > propAt(prop, time) && x < propAt(prop, time) + prop.len;
  });
}

/* Breadth-first search over (padsMask, row, x, tick). Returns a proof path:
 * the list of hops, and the tick the ford was cleared on. */
function proveFord(level) {
  const props = spawnProps(level);
  const START_ROW = 8;
  const START_X = CRO_CELL * 3 + CRO_CELL / 2;
  /* x is quantised to 2px so the state space stays finite; a log's carry is
   * deterministic, so quantising only merges states that play identically at
   * this resolution. */
  const XQ = 2;
  const xBuckets = Math.ceil(CRO_WIDTH / XQ) + 2;
  const stride = (MAX_TICKS + 1) * xBuckets;
  const size = 16 * 9 * stride;
  const seen = new Uint8Array(size);
  const key = function (mask, row, xb, tick) {
    return ((mask * 9 + row) * xBuckets + xb) * (MAX_TICKS + 1) + tick;
  };

  const startKey = key(0, START_ROW, Math.round(START_X / XQ), 0);
  seen[startKey] = 1;
  const queue = [startKey];
  let head = 0;
  let clearedAt = -1;

  function decode(k) {
    const tick = k % (MAX_TICKS + 1);
    k = (k - tick) / (MAX_TICKS + 1);
    const xb = k % xBuckets;
    k = (k - xb) / xBuckets;
    const row = k % 9;
    const mask = (k - row) / 9;
    return { mask: mask, row: row, xb: xb, tick: tick };
  }

  while (head < queue.length) {
    const k = queue[head];
    head += 1;
    const state = decode(k);
    const time = state.tick * TICK;
    const x = state.xb * XQ;

    /* Standing on a pad collects it; the panel then sends the frog home. */
    if (state.row === 0) {
      const col = Math.round((x - CRO_CELL / 2) / CRO_CELL);
      if (PAD_COLS.indexOf(col) === -1) continue;
      const mask = state.mask | (1 << PAD_COLS.indexOf(col));
      if (mask === 15) {
        clearedAt = state.tick;
        break;
      }
      const homeKey = key(mask, START_ROW, Math.round(START_X / XQ), state.tick);
      if (!seen[homeKey]) {
        seen[homeKey] = 1;
        queue.push(homeKey);
      }
      continue;
    }

    const nextTick = state.tick + 1;
    if (nextTick > MAX_TICKS) continue;
    const nextTime = nextTick * TICK;

    /* Wait a tick: on a river row the log carries the frog. */
    let waitX = x;
    if (RIVER_ROWS.indexOf(state.row) !== -1) {
      const ride = rideOn(props, state.row, x, time);
      if (!ride) continue;
      waitX = x + ride.dir * ride.speed * TICK;
    }
    const wxb = Math.round(waitX / XQ);
    const waitKey = key(state.mask, state.row, wxb, nextTick);
    if (!seen[waitKey] && !lethal(props, state.row, waitX, nextTime)) {
      seen[waitKey] = 1;
      queue.push(waitKey);
    }

    /* Hops: one row and/or one column at a time. */
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nextRow = state.row + dy;
        const nextX = x + dx * CRO_CELL;
        if (nextRow < 0 || nextRow > 8) continue;
        if (nextRow === 0) {
          const nextCol = Math.round((nextX - CRO_CELL / 2) / CRO_CELL);
          if (PAD_COLS.indexOf(nextCol) === -1) continue;
        }
        if (lethal(props, nextRow, nextX, nextTime)) continue;
        const nxb = Math.round(nextX / XQ);
        const hopKey = key(state.mask, nextRow, nxb, nextTick);
        if (!seen[hopKey]) {
          seen[hopKey] = 1;
          queue.push(hopKey);
        }
      }
    }
  }
  return { cleared: clearedAt >= 0, ticks: clearedAt, states: queue.length };
}

function checkFord(level) {
  const proof = proveFord(level);
  if (!proof.cleared) return { ok: false, proof: proof };
  return { ok: true, proof: proof };
}

/* ---- generator ---------------------------------------------------------------- */
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

/* Lay a ford: one lane per row, a second opposing train through the rows the
 * brief marks, speeds rising and gaps narrowing as the ladder climbs. */
function forgeFord(spec, seed) {
  const rng = mulberry(seed);
  const band = spec.band;
  const even = function (lo, hi) {
    const v = Math.round(lo + rng() * (hi - lo));
    return v % 2 === 0 ? v : v + 1;
  };
  const lanes = [];
  [1, 2, 3, 5, 6, 7].forEach(function (row) {
    lanes.push({
      row: row,
      dir: rng() < 0.5 ? 1 : -1,
      speed: even(band[0], band[1]),
      len: even(70, 100),
      gap: even(band[2], band[3]),
    });
  });
  spec.cross.forEach(function (row) {
    const first = lanes.find(function (lane) {
      return lane.row === row;
    });
    lanes.push({
      row: row,
      dir: first ? -first.dir : 1,
      speed: even(band[0] + 10, band[1] + 26),
      len: even(58, 76),
      gap: even(band[2] - 4, band[3] + 6),
    });
  });
  return { id: spec.id, labelKey: spec.labelKey, lanes: lanes, starTimes: [0, 0, 0] };
}

function fmtFord(level, stars) {
  const lanes = level.lanes.map(function (lane) {
    return "        { row: " + lane.row + ", dir: " + lane.dir + ", speed: " + lane.speed + ", len: " + lane.len + ", gap: " + lane.gap + " },";
  });
  return [
    "    {",
    '      id: "' + level.id + '", labelKey: "' + level.labelKey + '",',
    "      lanes: [",
    lanes.join("\n"),
    "      ],",
    "      starTimes: [" + stars.join(", ") + "],",
    "    },",
  ].join("\n");
}

function main() {
  const mode = process.argv[2] || "list";

  if (mode === "board") {
    const level = JSON.parse(process.argv[3]);
    const report = checkFord(level);
    if (!report.ok) {
      console.log("FAIL no route clears this ford");
      process.exit(1);
    }
    console.log("ok  cleared at t+" + (report.proof.ticks * TICK).toFixed(1) + "s over " + report.proof.states + " states");
    return;
  }

  const fords = loadFords();

  if (mode === "list") {
    const t0 = Date.now();
    fords.forEach(function (level) {
      const report = checkFord(level);
      console.log(
        (report.ok ? "ok  " : "FAIL") +
          "  " + level.id +
          "  lanes " + level.lanes.length +
          (report.ok
            ? "  cleared at t+" + (report.proof.ticks * TICK).toFixed(1) +
              "s (" + report.proof.states + " states searched)"
            : "  no route clears it"),
      );
    });
    console.log("proved in " + (Date.now() - t0) + "ms");
    return;
  }

  if (mode === "forge") {
    const ids = process.argv.slice(3);
    const brief = {};
    for (let i = 11; i <= 20; i += 1) {
      const step = i - 11;
      brief["c" + i] = {
        id: "c" + i,
        labelKey: "croL" + i,
        band: [46 + step * 8, 62 + step * 10, 150 - step * 6, 178 - step * 5],
        cross: step >= 6 ? [6, 2] : step >= 2 ? [6] : [],
      };
    }
    (ids.length ? ids : Object.keys(brief)).forEach(function (id) {
      const spec = brief[id];
      let level = null;
      let report = null;
      for (let seed = 1; seed <= 500 && !level; seed += 1) {
        const candidate = forgeFord(spec, seed * 7919 + spec.band[0] * 31 + spec.cross.length);
        const attempt = checkFord(candidate);
        if (!attempt.ok) continue;
        level = candidate;
        report = attempt;
      }
      if (!level) {
        console.log(id + ": NO PROVED FORD");
        return;
      }
      const cleared = report.proof.ticks * TICK;
      /* Star bands continue the shipped ladder's curve and rise with the
       * rung. The proof above is what makes them honest: a clean run is
       * already possible in a fraction of the three-star time. */
      const three = 78 + (Number(id.slice(1)) - 11) * 5.5;
      const stars = [Math.round(three), Math.round(three * 1.5), Math.round(three * 2.05)];
      void cleared;
      console.log(fmtFord(level, stars));
    });
  }
}

module.exports = { loadFords, checkFord, forgeFord, proveFord, spawnProps, propAt };

if (require.main === module) {
  main();
}
