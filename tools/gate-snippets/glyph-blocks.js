"use strict";

/* game-glyph-blocks: the deep tier is benched by the same scripted stacker
 * that clears the shipped tiers, and its twin-door lesson is proved two ways.
 *
 * `holes: 2` opens two columns in every rubble row instead of one, so no row
 * clears until both doors are built. The gate holds the four new rungs to the
 * shipped gate's own bar - one-ply Dellacherie over the game's reachable
 * spots plus a best reply, six seeds, f16 calibrating the bench - and then
 * cuts the mechanic out of a copy of its own row: no shipped rung opens two
 * doors, every deep rung's starting heap opens twice the ground a single-door
 * twin opens, and the tier as a whole wins strictly less often than the
 * shipped peak does on the same seeds, so the lesson costs the bench real
 * wins rather than decoration. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.blkLevels;
  const deepIds = ["f21", "f22", "f23", "f24"];

  check("game-glyph-blocks", "the ladder holds twenty-four floors",
    levels.length === 24, String(levels.length));
  check("game-glyph-blocks", "every floor id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-glyph-blocks", "the deep tier f21-f24 is present",
    missing.length === 0, missing.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });

  /* The bench: the shipped gate's own policy and seeds, re-hosted here so the
   * deep tier is measured exactly the way f17-f20 are measured in
   * tools/verify-levels.js. Deterministic end to end: blkSimulate rolls no
   * die outside the seeded stream it is handed. */
  const blkRows = App.blkRows;
  const blkCols = App.blkCols;
  const cloneGrid = (grid) => grid.map((row) => row.slice());
  const blkRng = (seed) => {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const blkScoreSpot = (spot, grid) => {
    const grid2 = cloneGrid(grid);
    const matrix = spot.matrix;
    for (let y = 0; y < matrix.length; y += 1) {
      for (let px = 0; px < matrix[y].length; px += 1) {
        if (matrix[y][px] && spot.y + y >= 0) grid2[spot.y + y][spot.x + px] = "#";
      }
    }
    let rowsCleared = 0;
    for (let y = blkRows - 1; y >= 0; y -= 1) {
      let full = true;
      for (let px = 0; px < blkCols; px += 1) {
        if (!grid2[y][px]) {
          full = false;
          break;
        }
      }
      if (full) {
        rowsCleared += 1;
        grid2.splice(y, 1);
        grid2.unshift(new Array(blkCols).fill(""));
        y += 1;
      }
    }
    let bottom = 0;
    for (let y = 0; y < matrix.length; y += 1) {
      if (matrix[y].some((c) => c)) bottom = y;
    }
    let rowTrans = 0;
    for (let y = 0; y < blkRows; y += 1) {
      let prev = true;
      for (let px = 0; px < blkCols; px += 1) {
        const cur = !!grid2[y][px];
        if (prev !== cur) rowTrans += 1;
        prev = cur;
      }
      if (prev !== true) rowTrans += 1;
    }
    let colTrans = 0;
    let holes = 0;
    let wells = 0;
    for (let px = 0; px < blkCols; px += 1) {
      let prev = false;
      for (let y = 0; y < blkRows; y += 1) {
        const cur = !!grid2[y][px];
        if (prev !== cur) colTrans += 1;
        prev = cur;
      }
      let seen = false;
      for (let y = 0; y < blkRows; y += 1) {
        if (grid2[y][px]) seen = true;
        else if (seen) holes += 1;
      }
      for (let y = 0; y < blkRows; y += 1) {
        const left = px === 0 || !!grid2[y][px - 1];
        const right = px === blkCols - 1 || !!grid2[y][px + 1];
        if (!grid2[y][px] && left && right) {
          let d = 0;
          let yy = y;
          while (yy < blkRows && !grid2[yy][px]) {
            d += 1;
            yy += 1;
          }
          wells += (d * (d + 1)) / 2;
          break;
        }
      }
    }
    const score =
      -4.5 * (blkRows - (spot.y + bottom)) +
      3.4 * rowsCleared -
      3.2 * rowTrans -
      9.3 * colTrans -
      12 * holes -
      3.4 * wells;
    return { score, grid2 };
  };
  const blkPolicy = (letter, nextLetter, grid, level, spots) => {
    const scored = spots.map((spot) => {
      const out = blkScoreSpot(spot, grid);
      return { spot, score: out.score, grid2: out.grid2 };
    });
    for (const row of scored) {
      const nextSpots = App.blkReachable(row.grid2, App.blkShapes[nextLetter]);
      let bestNext = -Infinity;
      for (const ns of nextSpots) {
        const s = blkScoreSpot(ns, row.grid2).score;
        if (s > bestNext) bestNext = s;
      }
      row.combined =
        row.score + 0.6 * (bestNext === -Infinity ? row.score : bestNext);
    }
    scored.sort((a, b) => b.combined - a.combined);
    return scored.length ? spots.indexOf(scored[0].spot) : 0;
  };
  const blkSeeds = [1000, 1077, 1154, 1231, 1308, 1385];
  const blkRun = (level, seed) => App.blkSimulate(level, blkPolicy, blkRng(seed));
  const bench = (level, seeds) => {
    const runs = seeds.map((seed) => blkRun(level, seed));
    const won = runs.filter((run) => run.won);
    return {
      won: won.length,
      total: runs.length,
      best: won.length ? Math.min.apply(null, won.map((run) => run.seconds)) : null,
      worst: won.length ? Math.max.apply(null, won.map((run) => run.seconds)) : null,
    };
  };

  /* Calibration: the scripted stacker clears the shipped peak in a realistic
   * share, so the bar the deep tier has to meet is the shipped bar. */
  const f16 = bench(byId.f16, blkSeeds);
  check("game-glyph-blocks",
    `f16 calibrates the bench: the scripted stacker clears the shipped peak (${f16.won}/6)`,
    f16.won >= 3, `${f16.won}/6`);
  const f20 = bench(byId.f20, blkSeeds);

  /* Every deep rung meets the shipped bar: cleared in a realistic share of
   * seeds, every won line lands the two-star band, the three-star line is
   * played for rather than given, the bands run downwards, and no deep rung
   * is easier than the shipped peak on the same seeds. */
  const deep = deepIds.map((id) => byId[id]);
  const runProblems = [];
  let tierWins = 0;
  let tierRuns = 0;
  deep.forEach((level) => {
    const run = bench(level, blkSeeds);
    tierWins += run.won;
    tierRuns += run.total;
    const name = `${level.id} goal=${level.goal} garbage=${level.garbage} startMs=${level.startMs}` +
      `${level.holes ? " holes=" + level.holes : ""}` +
      `${level.pieces ? " " + level.pieces : ""}${level.rise ? " rise=" + level.rise : ""}`;
    if (!(run.won >= 3 && run.won >= f16.won - 1)) {
      runProblems.push(`${name} won ${run.won}/6 (f16 ${f16.won}/6)`);
    }
    if (run.worst === null || run.worst > level.starTimes[1]) {
      runProblems.push(`${name} a won line missed the two-star band` +
        ` (worst ${run.worst} vs ${level.starTimes[1]})`);
    }
    if (run.best === null || run.best > level.starTimes[0] ||
        level.starTimes[0] >= level.starTimes[1]) {
      runProblems.push(`${name} the three-star line is not played for` +
        ` (best ${run.best} vs ${level.starTimes[0]})`);
    }
    if (!(level.starTimes[0] < level.starTimes[1] &&
        level.starTimes[1] < level.starTimes[2])) {
      runProblems.push(`${name} bands do not run downwards ${level.starTimes.join("/")}`);
    }
    if (run.won > f20.won) {
      runProblems.push(`${name} won ${run.won}/6, easier than the shipped peak's ${f20.won}/6`);
    }
  });
  check("game-glyph-blocks",
    "every deep rung clears the shipped bench at the shipped peak's bar",
    runProblems.length === 0, runProblems.join(" | "));

  /* The tier costs wins: on the same seeds the deep tier as a whole wins
   * strictly less often than the shipped peak does, so the twin door is not
   * decoration. */
  check("game-glyph-blocks",
    "the deep tier wins strictly less often than the shipped peak on the same seeds",
    tierWins / tierRuns < f20.won / f20.total,
    `tier ${tierWins}/${tierRuns} vs f20 ${f20.won}/${f20.total}`);

  /* The twin door is structural. No shipped rung opens two doors; every deep
   * rung does and the deal really lays it: the deep tier's starting heaps
   * open exactly twice the ground a single-door twin opens, column by
   * column, through the game's own hole chooser on a seeded stream. */
  const shallowHoles = levels.filter((level) =>
    !deepIds.includes(level.id) && level.holes !== undefined && level.holes >= 2);
  check("game-glyph-blocks",
    "no shipped rung opens two doors in its rubble",
    shallowHoles.length === 0, shallowHoles.map((level) => level.id).join(","));
  const doorProblems = [];
  deep.forEach((level) => {
    if (level.holes !== 2) {
      doorProblems.push(level.id + " does not ask for two doors");
      return;
    }
    const seen = new Set();
    for (let probe = 0; probe < 40; probe += 1) {
      const holes = App.blkRubbleHoles(level, blkRng(91000 + probe * 7));
      if (holes.length !== 2 || new Set(holes).size !== 2) {
        doorProblems.push(`${level.id} dealt ${holes.length} doors on seed ${probe}`);
      }
      holes.forEach((col) => seen.add(col));
    }
  });
  check("game-glyph-blocks",
    "every deep rung's rubble really opens two distinct doors per row",
    doorProblems.length === 0, doorProblems.join(" | "));
  const twin = Object.assign({}, byId.f21, { holes: 1 });
  const twinOpens = (level) => {
    let opens = 0;
    for (let row = 0; row < level.garbage; row += 1) {
      App.blkRubbleHoles(level, blkRng(515000 + row * 13)).forEach(() => { opens += 1; });
    }
    return opens;
  };
  check("game-glyph-blocks",
    "f21's starting heap opens twice the ground its single-door twin opens",
    twinOpens(byId.f21) === 2 * twinOpens(twin),
    `${twinOpens(byId.f21)} vs ${twinOpens(twin)}`);
  /* The hole chooser kept the shipped deals whole: rungs without `holes`
   * still open exactly one door per row, one draw per row, so every shipped
   * rung replays the stream it shipped with. */
  const shippedOpens = twinOpens(byId.f20);
  check("game-glyph-blocks",
    "a shipped rung's heap still opens one door per row under the shared chooser",
    shippedOpens === byId.f20.garbage && twinOpens(byId.f16) === byId.f16.garbage,
    `f20 ${shippedOpens}/${byId.f20.garbage}, f16 ${twinOpens(byId.f16)}/${byId.f16.garbage}`);

  /* The tier's names travel with the page: both languages hold a real string
   * and t() never falls back to the raw key. */
  const copyProblems = deepIds.map((id) =>
    byId[id].labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-glyph-blocks", "the four deep floor names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each floor in order
   * hands the player exactly the next one, all twenty-four times. */
  const chain = App.createCampaign({
    key: "glyph-blocks-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-glyph-blocks", "the unlock chain walks all twenty-four floors in order",
    walked === 24 && chained && chain.clearedCount() === 24, walked + " first clears");
};
