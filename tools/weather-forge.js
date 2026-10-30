#!/usr/bin/env node
/*
 * Weather Loom forge.
 *
 * A season is only shippable if the weave that clears it is written down, so
 * this tool finds that weave instead of guessing it: it lays one tool at a
 * time - the one that most reduces how far the harvest still is from the
 * villages' windows - until the greedy season feeds every village and floods
 * nothing, which is the three-star line by construction.
 *
 *   node tools/weather-forge.js             # audit every shipped season
 *   node tools/weather-forge.js --forge     # weave the seven new seasons
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { createEnvironment } = require("./stub-dom");

const root = path.join(__dirname, "..");
const pageHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const APP_MODULES = Array.from(
  pageHtml.matchAll(/assets\/app\/([a-z0-9-]+)\.js\?v=\d+/g),
).map((match) => match[1]);
const appSource = APP_MODULES.map((name) =>
  fs
    .readFileSync(path.join(root, "assets", "app", name + ".js"), "utf8")
    .replace(/^﻿/, ""),
).join("\n");

const env = createEnvironment({});
env.load(appSource);
env.domReady();
const App = env.sandbox.CapitalConvert || env.window.CapitalConvert;

const COLS = 10;
const ROWS = 8;
const COST = { w: 1, h: 2, s: 1 };
const LIMIT = 92;

const spot = (x, y) => ({ x: x, y: y });
const village = (x, y, min, max) => ({ x: x, y: y, min: min, max: max });
const wind = (x, y, dir) => ({ x: x, y: y, kind: "w", dir: dir === undefined ? 0 : dir });
const pump = (x, y) => ({ x: x, y: y, kind: "h", dir: 0 });

/* The new seasons. Each one names its own weather, its own terrain and
 * its own settlements; the forge only has to find the weave. `width` is how
 * much slack a village's window leaves - it narrows as the ladder climbs. */
const NEW_SEASONS = [
  {
    id: "w14", points: 20, ticks: 20, width: 30,
    cfg: { source: 8, lakeSource: 4 },
    lake: [spot(9, 4)],
    villages: [village(3, 1), village(3, 5), village(7, 4)],
  },
  {
    id: "w15", points: 21, ticks: 20, width: 30,
    cfg: { source: 9, lakeSource: 4 },
    ridge: [spot(4, 3), spot(4, 4)],
    villages: [village(2, 1), village(2, 6), village(6, 2), village(6, 5)],
  },
  {
    id: "w16", points: 24, ticks: 20, width: 28,
    cfg: { source: 7, lakeSource: 4 },
    ridge: [spot(3, 2), spot(3, 5)],
    lake: [spot(8, 3)],
    villages: [village(5, 1), village(5, 6), village(8, 5), village(2, 7)],
  },
  {
    id: "w17", points: 23, ticks: 20, width: 28,
    cfg: { source: 7, lakeSource: 5 },
    ridge: [spot(4, 0), spot(4, 1), spot(4, 6), spot(4, 7)],
    villages: [village(2, 2), village(2, 5), village(6, 3), village(6, 4), village(6, 2)],
  },
  {
    id: "w18", points: 24, ticks: 20, width: 26,
    cfg: { source: 8, lakeSource: 4 },
    ridge: [spot(3, 3), spot(3, 4), spot(6, 2), spot(6, 5)],
    lake: [spot(8, 6)],
    villages: [village(2, 1), village(2, 6), village(2, 4), village(7, 1), village(7, 6)],
  },
  {
    id: "w19", points: 25, ticks: 24, width: 24,
    cfg: { source: 6, creep: 0.08, wind: 0.6, rainAt: 56 },
    wet: [spot(1, 3), spot(2, 3)],
    ridge: [spot(5, 1), spot(5, 6)],
    villages: [village(3, 3), village(6, 3), village(4, 0), village(8, 2), village(4, 7)],
  },
  {
    id: "w20", points: 26, ticks: 20, width: 22,
    cfg: { source: 7, lakeSource: 4, ambient: 56, lift: 0.4 },
    ridge: [spot(4, 3), spot(4, 4)],
    lake: [spot(7, 1), spot(7, 6)],
    villages: [village(2, 1), village(2, 6), village(3, 3), village(6, 2), village(6, 5), village(9, 3)],
  },
  /* w21: the far shore - the longest canal the ladder has ever run dies long
   * before the eastern sea line, and only a heater sump pumping the creep
   * back into it lets the far parish drink at all. The authored weave below
   * was walked through App.loomRun; the forge re-proves it instead of
   * re-searching it. */
  {
    id: "w21", points: 27, ticks: 20, width: 22,
    cfg: { source: 8 },
    ridge: [spot(6, 1), spot(6, 6)],
    villages: [village(2, 0), village(5, 1), village(9, 3), village(2, 5), village(5, 6), village(2, 7)],
    plan: [
      wind(0, 0), wind(1, 0),
      wind(0, 1), wind(1, 1), wind(2, 1), wind(3, 1), wind(4, 1),
      wind(0, 3), wind(1, 3), wind(2, 3), wind(3, 3), wind(4, 3), wind(5, 3), wind(6, 3), wind(7, 3), wind(8, 3),
      pump(6, 4),
      wind(0, 5), wind(1, 5),
      wind(0, 6), wind(1, 6), wind(2, 6), wind(3, 6), wind(4, 6),
      wind(0, 7), wind(1, 7),
    ],
  },
  /* w22: the needle gate - a full ridge wall with one gap; the east country
   * drinks from the single canal that threads the gap and its short branches. */
  {
    id: "w22", points: 27, ticks: 20, width: 22,
    cfg: { source: 8, drain: 0.8 },
    ridge: [spot(4, 0), spot(4, 1), spot(4, 2), spot(4, 4), spot(4, 5), spot(4, 6), spot(4, 7)],
    villages: [village(2, 2), village(2, 6), village(6, 3), village(8, 3), village(9, 2)],
  },
  /* w23: storm ledger - rain comes early and heavy and a flooded cell costs
   * double, so the season is won by not overpouring six crowded parishes. */
  {
    id: "w23", points: 28, ticks: 20, width: 22,
    cfg: { source: 9, lakeSource: 4, rainAt: 52, dump: 0.6, floodLimit: 80, floodWeight: 2 },
    ridge: [spot(2, 3), spot(2, 4), spot(8, 3)],
    lake: [spot(5, 4)],
    villages: [village(6, 1), village(6, 2), village(5, 3), village(6, 5), village(4, 6), village(1, 6)],
  },
  /* w24: seven parishes - the most settlements the loom has ever held, behind
   * ridge stubs and twin lakes, with the tightest windows on the ladder. */
  {
    id: "w24", points: 30, ticks: 20, width: 20,
    cfg: { source: 8, lakeSource: 4, ambient: 54, lift: 0.42, wind: 0.55 },
    ridge: [spot(3, 3), spot(3, 4), spot(6, 2), spot(6, 5)],
    lake: [spot(8, 1), spot(4, 7)],
    villages: [village(1, 1), village(1, 6), village(2, 2), village(5, 1), village(5, 6), village(8, 4), village(9, 6)],
  },
  /* The far-ridge seasons (w25-w30). The deep tier ended on seven parishes at
   * thirty loom points; these six keep filling the country in - eight, then
   * nine settlements, two needle gates at once, a march with no lake to
   * refill from, a flood ledger that bills every overpour triple - while the
   * windows tighten from a 20-wide slack to 16, the tightest the loom has
   * shipped. Each season is woven by the forge and re-windowed off its own
   * weave, so what ships is what wins. */
  {
    id: "w25", points: 34, ticks: 20, width: 20,
    cfg: { source: 8, lakeSource: 4 },
    ridge: [spot(5, 5)],
    lake: [spot(8, 1), spot(2, 6)],
    villages: [village(2, 0), village(3, 1), village(5, 2), village(2, 3), village(4, 4), village(1, 5), village(3, 6), village(5, 7)],
  },
  {
    id: "w26", points: 44, ticks: 20, width: 16,
    cfg: { source: 9, lakeSource: 4, rainAt: 54, dump: 0.5, floodLimit: 70, floodWeight: 3 },
    ridge: [spot(2, 3), spot(2, 4), spot(8, 3)],
    lake: [spot(5, 4)],
    villages: [village(6, 1), village(6, 2), village(5, 3), village(6, 5), village(4, 6), village(1, 6)],
  },
  {
    id: "w27", points: 40, ticks: 20, width: 16,
    cfg: { source: 8, lakeSource: 4, ambient: 54, lift: 0.42, wind: 0.55 },
    ridge: [spot(4, 3), spot(4, 4), spot(7, 0), spot(7, 7)],
    lake: [spot(7, 1), spot(7, 6)],
    villages: [village(2, 1), village(2, 6), village(3, 3), village(6, 2), village(6, 5), village(9, 3), village(9, 0)],
  },
  {
    id: "w28", points: 45, ticks: 20, width: 18,
    cfg: { source: 8 },
    ridge: [spot(2, 3), spot(5, 1), spot(5, 6)],
    villages: [village(1, 1), village(4, 0), village(3, 4), village(1, 5), village(4, 7), village(6, 5), village(8, 3)],
  },
  {
    id: "w29", points: 53, ticks: 20, width: 18,
    cfg: { source: 8, drain: 0.8 },
    ridge: [spot(5, 0), spot(5, 1), spot(5, 2), spot(5, 4), spot(5, 5), spot(5, 6)],
    villages: [village(2, 1), village(2, 5), village(7, 0), village(6, 3), village(7, 6), village(9, 7)],
  },
  {
    id: "w30", points: 53, ticks: 20, width: 16,
    cfg: { source: 8, lakeSource: 4, ambient: 54, lift: 0.42, wind: 0.55 },
    ridge: [spot(3, 3), spot(3, 4), spot(6, 2), spot(6, 5)],
    lake: [spot(8, 1), spot(4, 7)],
    villages: [village(1, 0), village(4, 1), village(7, 1), village(1, 4), village(5, 3), village(8, 4), village(1, 7), village(5, 6), village(8, 7)],
  },
];

function cellsOf(level) {
  const taken = {};
  (level.ridge || []).forEach((cell) => {
    taken[cell.x + "," + cell.y] = true;
  });
  return taken;
}

/* How far today's season still is from a clean harvest. Villages count by how
 * far their rain sits outside the window; a flooded cell costs far more than a
 * thirsty one, because a flood cannot be undone by adding more water. */
function deficit(level, plan) {
  delete level.cfgCache;
  const run = App.loomRun(level, plan);
  const rain = run.state.rain;
  let dist = 0;
  const home = {};
  level.villages.forEach((v, index) => {
    const at = v.y * COLS + v.x;
    home[at] = index;
    const got = rain[at] || 0;
    dist += Math.max(0, v.min - got) + Math.max(0, got - v.max);
  });
  let flooded = run.score.flooded;
  for (let i = 0; i < rain.length; i += 1) {
    if (home[i] !== undefined || i % COLS === 0) continue;
    if ((level.lake || []).some((cell) => cell.y * COLS + cell.x === i)) continue;
    if (rain[i] > LIMIT) flooded += 1;
  }
  /* A canal reads as no progress at all until its last cell lands, so the
   * moisture already carried towards the settlements is the tie-breaker that
   * keeps the beam growing the right canal instead of three wrong ones. A
   * settlement that stays dry is a finished harvest just as much as a flooded
   * one, so a dry village is penalised too: every season is built to leave each
   * settlement with real rain, never a window that merely tolerates zero. */
  let carried = 0;
  let dry = 0;
  level.villages.forEach((v) => {
    const got = rain[v.y * COLS + v.x] || 0;
    carried += run.state.moist[v.y * COLS + v.x] || 0;
    if (got < 22) dry += (22 - got) * 6;
  });
  return dist * 10 + flooded * 200 + dry - carried / 1000;
}

function spent(plan) {
  return plan.reduce((sum, act) => sum + COST[act.kind], 0);
}

/* A canal is a chain, so the next tool only ever goes on the frontier: the
 * open sea, a cell touching a tool already down, a lake, or a settlement that
 * wants shade or a heater. Growing the season that way keeps the search small
 * enough to beam through, and it is also how a player actually builds one. */
function candidateCells(level, plan) {
  const ridge = cellsOf(level);
  const used = {};
  plan.forEach((act) => {
    used[act.x + "," + act.y] = true;
  });
  const set = {};
  for (let y = 0; y < ROWS; y += 1) {
    if (!ridge["0," + y] && !used["0," + y]) set["0," + y] = { x: 0, y: y };
  }
  plan.forEach((act) => {
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      const x = act.x + dx;
      const y = act.y + dy;
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
      if (ridge[x + "," + y] || used[x + "," + y]) return;
      set[x + "," + y] = { x: x, y: y };
    });
  });
  (level.lake || []).forEach((cell) => {
    if (!ridge[cell.x + "," + cell.y] && !used[cell.x + "," + cell.y]) {
      set[cell.x + "," + cell.y] = { x: cell.x, y: cell.y };
    }
  });
  level.villages.forEach((cell) => {
    if (!ridge[cell.x + "," + cell.y] && !used[cell.x + "," + cell.y]) {
      set[cell.x + "," + cell.y] = { x: cell.x, y: cell.y };
    }
  });
  const out = [];
  Object.keys(set).forEach((key) => {
    const cell = set[key];
    out.push({ x: cell.x, y: cell.y, kind: "w", dir: 0 });
    out.push({ x: cell.x, y: cell.y, kind: "w", dir: 1 });
    out.push({ x: cell.x, y: cell.y, kind: "w", dir: 2 });
    out.push({ x: cell.x, y: cell.y, kind: "w", dir: 3 });
    out.push({ x: cell.x, y: cell.y, kind: "s", dir: 0 });
    if (spent(plan) + 2 <= level.points) {
      out.push({ x: cell.x, y: cell.y, kind: "h", dir: 0 });
    }
  });
  return out;
}

/* The seed is the canal every player would draw first: from the open sea along
 * the settlement's own row, one arrow per cell, skipping mountains. Two
 * settlements in a row share one canal, exactly as in the shipped seasons. */
function seedPlan(level) {
  const ridge = cellsOf(level);
  const used = {};
  const plan = [];
  level.villages.forEach((v) => {
    for (let x = 0; x < v.x; x += 1) {
      const key = x + "," + v.y;
      if (ridge[key] || used[key]) continue;
      used[key] = true;
      plan.push({ x: x, y: v.y, kind: "w", dir: 0 });
    }
  });
  return plan;
}

/* A window-free pass comes first: fill every settlement with as much rain as
 * the weather allows, ignoring where the windows will land. Only once the
 * canals are actually delivering does the season get its windows, so the weave
 * is never told to aim at a near-empty sky. */
function freeDeficit(level, plan) {
  delete level.cfgCache;
  const run = App.loomRun(level, plan);
  let carried = 0;
  level.villages.forEach((v) => {
    carried += run.state.rain[v.y * COLS + v.x] || 0;
  });
  let flooded = run.score.flooded;
  let dry = 0;
  for (let i = 0; i < run.state.rain.length; i += 1) {
    if (i % COLS === 0) continue;
    const onVillage = level.villages.some((v) => v.y * COLS + v.x === i);
    const onLake = (level.lake || []).some((cell) => cell.y * COLS + cell.x === i);
    if (onVillage || onLake) continue;
    if (run.state.rain[i] > LIMIT) flooded += 1;
  }
  level.villages.forEach((v) => {
    const got = run.state.rain[v.y * COLS + v.x] || 0;
    if (got < 22) dry += (22 - got) * 6;
  });
  return -carried / 1000 + flooded * 200 + dry;
}

function sow(level) {
  let plan = seedPlan(level);
  let best = freeDeficit(level, plan);
  for (let round = 0; round < 40 && best > -90; round += 1) {
    let pick = null;
    let pickScore = best;
    const moves = [];
    candidateCells(level, plan).forEach((act) => {
      if (spent(plan) + COST[act.kind] <= level.points) {
        moves.push({ plan: plan.concat([act]) });
      }
    });
    plan.forEach((act, index) => {
      moves.push({ plan: plan.filter((_, i) => i !== index) });
      for (let dir = 0; dir < 4; dir += 1) {
        if (dir === act.dir && act.kind === "w") continue;
        const copy = plan.slice();
        copy[index] = { x: act.x, y: act.y, kind: act.kind, dir: dir };
        moves.push({ plan: copy });
      }
    });
    for (let i = 0; i < moves.length; i += 1) {
      moves[i].score = freeDeficit(level, moves[i].plan);
      if (moves[i].score < pickScore) {
        pickScore = moves[i].score;
        pick = moves[i];
      }
    }
    if (!pick) break;
    plan = pick.plan;
    best = pick.score;
  }
  return plan;
}

/* Then local search: the seed gets the water close, and one move at a time -
 * add a tool, drop one, or turn an arrow - walks the harvest the rest of the
 * way into every window without flooding anything. */
function weave(level, initPlan) {
  let plan = initPlan && initPlan.length ? initPlan.slice() : seedPlan(level);
  let best = deficit(level, plan);
  for (let round = 0; round < 60 && best > 0; round += 1) {
    let pick = null;
    let pickScore = best;
    const moves = [];
    candidateCells(level, plan).forEach((act) => {
      if (spent(plan) + COST[act.kind] <= level.points) {
        moves.push({ plan: plan.concat([act]), score: 0 });
      }
    });
    plan.forEach((act, index) => {
      moves.push({ plan: plan.filter((_, i) => i !== index), score: 0 });
      for (let dir = 0; dir < 4; dir += 1) {
        if (dir === act.dir && act.kind === "w") continue;
        const copy = plan.slice();
        copy[index] = { x: act.x, y: act.y, kind: act.kind, dir: dir };
        moves.push({ plan: copy, score: 0 });
      }
    });
    for (let i = 0; i < moves.length; i += 1) {
      moves[i].score = deficit(level, moves[i].plan);
      if (moves[i].score < pickScore) {
        pickScore = moves[i].score;
        pick = moves[i];
      }
    }
    if (!pick) break;
    plan = pick.plan;
    best = pick.score;
  }
  return { plan: plan, deficit: best };
}

function source(act) {
  if (act.kind === "w") {
    return act.dir === 0
      ? `wlkWind(${act.x}, ${act.y})`
      : `wlkWind(${act.x}, ${act.y}, ${act.dir})`;
  }
  if (act.kind === "s") return `wlkShade(${act.x}, ${act.y})`;
  return `wlkHeat(${act.x}, ${act.y})`;
}

/* Windows have to exist before the weave can be scored, so a season is first
 * dealt raw - what the bare weather already drops on each settlement - and
 * only then woven and re-windowed around the season it actually becomes. */
function window(level, half) {
  delete level.cfgCache;
  const run = App.loomRun(level, level.plan || []);
  const villages = level.villages.map((v) => {
    const got = run.state.rain[v.y * COLS + v.x] || 0;
    return village(v.x, v.y, Math.max(0, Math.round(got - half)), Math.round(got + half));
  });
  return Object.assign({}, level, { villages: villages });
}

if (process.argv.includes("--forge") || process.argv.includes("--summit")) {
  /* --summit weaves only the far-ridge seasons (w25-w30), so the new tier can
   * be iterated without re-running the eleven shipped briefs ahead of it. */
  const wlkSummitIds = ["w25", "w26", "w27", "w28", "w29", "w30"];
  const wlkBriefs = process.argv.includes("--summit")
    ? NEW_SEASONS.filter((season) => wlkSummitIds.includes(season.id))
    : NEW_SEASONS;
  wlkBriefs.forEach((season) => {
    /* Weave and re-window until the two agree: the windows say what counts as
     * a harvest, the weave is aimed at them, and each pass re-aims both at the
     * season the other one just produced. A season that ships an authored
     * weave starts from it - the forge then only re-proves it. */
    let plan = season.plan ? season.plan.slice() : sow(season);
    if (!Array.isArray(plan)) throw new Error(season.id + " sow returned " + typeof plan);
    let level = window(Object.assign({}, season, { plan: plan }), season.width / 2);
    plan = weave(level, plan).plan;
    level = window(
      Object.assign({}, season, { villages: level.villages, plan: plan }),
      season.width / 2,
    );
    plan = weave(level, plan).plan;
    /* The last weave moves the rain, so the windows that ship are measured off
     * it - by construction every village sits inside its own window, which is
     * what makes the season winnable by the plan that ships with it. */
    const villages = window(Object.assign({}, season, { plan: plan }), season.width / 2).villages;
    const final = Object.assign({}, season, { villages: villages });
    delete final.width;
    const proof = App.loomRun(final, plan);
    /* The dry line is a hard gate, not a penalty the weave may leave on the
     * table: a village whose window was cut around a dry settlement ships a
     * season that tolerates zero, which is exactly what the forge exists to
     * prevent. Refuse to print such a season instead of shipping it. */
    const wlkThirsty = villages.filter((v) => {
      const got = proof.state.rain[v.y * COLS + v.x] || 0;
      return got < 22;
    });
    if (proof.stars !== 3 || proof.score.fed !== villages.length ||
      proof.score.flooded !== 0 || wlkThirsty.length) {
      throw new Error(
        season.id + " did not weave clean: stars " + proof.stars +
        ", fed " + proof.score.fed + "/" + villages.length +
        ", flooded " + proof.score.flooded +
        (wlkThirsty.length ? ", dry: " + wlkThirsty.map((v) => v.x + "," + v.y).join(" ") : "") +
        " - raise the budget or ease the geography",
      );
    }
    console.log(
      `\n/* ${season.id}: tools ${plan.length}, ` +
        `cost ${spent(plan)}/${season.points}, stars ${proof.stars}, ` +
        `fed ${proof.score.fed}/${villages.length}, flooded ${proof.score.flooded} */`,
    );
    console.log(`    {`);
    console.log(`      id: "${season.id}", labelKey: "wlkZ${season.id.slice(1)}", points: ${season.points}, ticks: ${season.ticks},`);
    console.log(`      cfg: { ${Object.keys(season.cfg).map((k) => k + ": " + season.cfg[k]).join(", ")} },`);
    if (season.ridge) {
      console.log(`      ridge: [${season.ridge.map((c) => `wlkSpot(${c.x}, ${c.y})`).join(", ")}],`);
    }
    if (season.lake) {
      console.log(`      lake: [${season.lake.map((c) => `wlkSpot(${c.x}, ${c.y})`).join(", ")}],`);
    }
    if (season.wet) {
      console.log(`      wet: [${season.wet.map((c) => `wlkSpot(${c.x}, ${c.y})`).join(", ")}],`);
    }
    console.log(`      villages: [`);
    villages.forEach((v) => {
      console.log(`        wlkVillage(${v.x}, ${v.y}, ${v.min}, ${v.max}),`);
    });
    console.log(`      ],`);
    console.log(`      plan: [`);
    for (let i = 0; i < plan.length; i += 4) {
      console.log(`        ${plan.slice(i, i + 4).map(source).join(", ")},`);
    }
    console.log(`      ],`);
    console.log(`    },`);
  });
} else {
  console.log("id    tools  cost/budget  stars  fed  flooded");
  App.loomLevels.forEach((level) => {
    const run = App.loomRun(level, level.plan);
    const cost = (level.plan || []).reduce((sum, act) => sum + COST[act.kind], 0);
    console.log(
      `${level.id.padEnd(5)} ${String(level.plan.length).padStart(5)}  ` +
        `${String(cost + "/" + level.points).padStart(11)}  ${String(run.stars).padStart(5)}  ` +
        `${String(run.score.fed + "/" + level.villages.length).padStart(3)}  ${run.score.flooded}`,
    );
  });
}
