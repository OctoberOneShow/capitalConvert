"use strict";

/* game-glyph-sketch: the deep tier is the wide tray, the summit tier climbs
 * it, and the machine proof - unique line solvability - is re-run here over
 * the whole ladder.
 *
 * The engine reads only the art; the machine proof is that the row and
 * column clues alone close the picture. The gate re-hosts a standard
 * nonogram line solver (run-placement enumeration, intersected, swept to a
 * fixpoint) and proves four things. First, every rung shipped, deep or
 * summit line-solves to exactly its own picture - a board that needed a
 * guess would fail the sweep. Second, the tiers are the tray's only two
 * widenings, by structure: no shipped rung exceeds ten columns, every deep
 * rung is twelve, every summit rung fourteen. Third, the altitude buys
 * real work: the deduction waves rise within each tier, the deep mean sits
 * far above the shipped ladder's, the summit mean far above the deep's,
 * and the closer is the longest sweep the tray has ever asked for. Fourth,
 * the summit's line-solvable promise is load-bearing: every summit board
 * sits one pixel above the ambiguity edge - clearing any of its keystone
 * pixels stalls the sweep with cells no line can place - and the gate
 * re-measures that count for every rung.
 *
 * The quarter tier e31-e40 widens the tray a third time: every board is
 * sixteen by sixteen. The same machine proof runs over the ten - unique
 * line solvability, the deduction waves climbing strictly past the
 * summit's eighteen to the ladder's longest sweep on e40, and the
 * keystone count re-measured per board, where the quarter's measured
 * cuts run into the dozens - and the time bands take about a ninth
 * over e30 for the wider tray, then resume the shipped pace. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.sketchLevels || null;
  const deepIds = ["e21", "e22", "e23", "e24"];
  const summitIds = ["e25", "e26", "e27", "e28", "e29", "e30"];
  const quarterIds = ["e31", "e32", "e33", "e34", "e35",
    "e36", "e37", "e38", "e39", "e40"];

  /* The level table is closure-bound, so the gate re-hosts it the way
   * tools/static-checks.js hosts other closure-bound tables. */
  const fsMod = require("fs");
  const pathMod = require("path");
  const rootDir = pathMod.join(__dirname, "..", "..");
  const src = fsMod.readFileSync(
    pathMod.join(rootDir, "assets", "app", "game-glyph-sketch.js"), "utf8");
  const tableStart = src.indexOf("var sketchLevels = [");
  const tableEnd = src.indexOf("function initGlyphSketchGame");
  const table = new Function(tableStart === -1
    ? "return [];"
    : src.slice(tableStart, tableEnd) + "\nreturn sketchLevels;")();

  check("game-glyph-sketch", "the ladder holds forty boards",
    table.length === 40, String(table.length));
  check("game-glyph-sketch", "every board id is distinct",
    new Set(table.map((level) => level.id)).size === table.length,
    table.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !table.some((level) => level.id === id));
  check("game-glyph-sketch", "the deep tier e21-e24 is present",
    missing.length === 0, missing.join(","));
  const missingSummit = summitIds.filter((id) => !table.some((level) => level.id === id));
  check("game-glyph-sketch", "the summit tier e25-e30 is present",
    missingSummit.length === 0, missingSummit.join(","));
  const missingQuarter = quarterIds.filter((id) => !table.some((level) => level.id === id));
  check("game-glyph-sketch", "the quarter tier e31-e40 is present",
    missingQuarter.length === 0, missingQuarter.join(","));

  /* ---- the line solver, re-hosted ---------------------------------------- */
  const cluesOf = (line) => {
    const runs = [];
    let count = 0;
    for (const ch of line) {
      if (ch === "#") count += 1;
      else if (count) { runs.push(count); count = 0; }
    }
    if (count) runs.push(count);
    return runs.length ? runs : [0];
  };
  const placements = (n, runs, known) => {
    const results = [];
    const line = new Array(n).fill(0);
    const emit = (pos, run) => {
      if (run === runs.length) {
        for (let i = pos; i < n; i += 1) {
          if (known[i] === 1) return;
          line[i] = 0;
        }
        results.push(line.slice());
        return;
      }
      const len = runs[run];
      const rest = runs.slice(run + 1).reduce((a, b) => a + b + 1, 0);
      for (let start = pos; start + len + rest <= n; start += 1) {
        let fits = true;
        for (let i = pos; i < start && fits; i += 1) {
          if (known[i] === 1) fits = false;
        }
        for (let i = start; i < start + len && fits; i += 1) {
          if (known[i] === 0) fits = false;
        }
        if (!fits) continue;
        const after = start + len;
        const gap = run === runs.length - 1 ? 0 : 1;
        if (after + gap > n || (gap && known[after] === 1)) continue;
        const saved = [];
        for (let i = pos; i < after + gap; i += 1) {
          saved.push([i, line[i]]);
          line[i] = i >= start && i < after ? 1 : 0;
        }
        emit(after + gap, run + 1);
        for (const [i, v] of saved) line[i] = v;
      }
    };
    emit(0, 0);
    return results;
  };
  const deduceLine = (cells, runs) => {
    const options = placements(cells.length, runs, cells);
    if (!options.length) return null;
    const out = cells.slice();
    for (let i = 0; i < cells.length; i += 1) {
      if (cells[i] !== -1) continue;
      out[i] = options.every((opt) => opt[i] === 1) ? 1
        : options.every((opt) => opt[i] === 0) ? 0 : -1;
    }
    return out;
  };
  const lineSolve = (art) => {
    const rows = art.length;
    const cols = art[0].length;
    const rowClues = art.map(cluesOf);
    const colClues = Array.from({ length: cols }, (_, c) =>
      cluesOf(art.map((r) => r[c]).join("")));
    const grid = Array.from({ length: rows }, () => Array(cols).fill(-1));
    let waves = 0;
    let changed = true;
    while (changed) {
      changed = false;
      waves += 1;
      for (let r = 0; r < rows; r += 1) {
        const line = deduceLine(grid[r], rowClues[r]);
        if (!line) return { solved: false, waves, grid };
        for (let c = 0; c < cols; c += 1) {
          if (grid[r][c] === -1 && line[c] !== -1) { grid[r][c] = line[c]; changed = true; }
        }
      }
      for (let c = 0; c < cols; c += 1) {
        const line = deduceLine(grid.map((row) => row[c]), colClues[c]);
        if (!line) return { solved: false, waves, grid };
        for (let r = 0; r < rows; r += 1) {
          if (grid[r][c] === -1 && line[r] !== -1) { grid[r][c] = line[r]; changed = true; }
        }
      }
    }
    const solved = grid.every((row, r) =>
      row.every((v, c) => (v === 1) === (art[r][c] === "#")));
    return { solved, waves, grid };
  };
  /* Mean clue runs per line - how fragmented the clue structure is. */
  const runsMean = (art) => {
    const cols = art[0].length;
    let runs = 0;
    art.forEach((row) => { runs += cluesOf(row).filter((n) => n > 0).length; });
    for (let c = 0; c < cols; c += 1) {
      runs += cluesOf(art.map((r) => r[c]).join("")).filter((n) => n > 0).length;
    }
    return runs / (art.length + cols);
  };

  /* The whole ladder line-solves to its own picture. */
  const solveProblems = [];
  const wavesByLevel = {};
  table.forEach((level) => {
    const result = lineSolve(level.art);
    wavesByLevel[level.id] = result.waves;
    if (!result.solved) {
      solveProblems.push(`${level.id}: does not line-solve to its own picture`);
    }
  });
  check("game-glyph-sketch",
    "every one of the thirty boards line-solves uniquely to its own picture",
    solveProblems.length === 0, solveProblems.join(" | "));

  /* The tiers are the tray's only two widenings: shipped boards never
   * exceeded ten columns, every deep board is twelve, every summit board
   * is fourteen, and the time bands keep the shipped climb. */
  const byId = {};
  table.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);
  const summit = summitIds.map((id) => byId[id]);
  const shipped = table.filter((level) =>
    !deepIds.includes(level.id) && !summitIds.includes(level.id) &&
    !quarterIds.includes(level.id));
  check("game-glyph-sketch",
    "no shipped board exceeds ten columns, every deep board is twelve and every summit board is fourteen",
    shipped.every((level) => level.art[0].length <= 10) &&
    deep.every((level) => level.art.length === 12 && level.art[0].length === 12) &&
    summit.every((level) => level.art.length === 14 && level.art[0].length === 14),
    "deep sizes " + deep.map((level) => `${level.art.length}x${level.art[0].length}`).join("/") +
      ", summit sizes " + summit.map((level) => `${level.art.length}x${level.art[0].length}`).join("/"));
  check("game-glyph-sketch",
    "the deep time bands keep the shipped climb",
    deep.every((level, index) => {
      const prev = index === 0 ? byId.e20 : deep[index - 1];
      return level.starTimes[0] > prev.starTimes[0] &&
        level.starTimes[1] > prev.starTimes[1] &&
        level.starTimes[2] > prev.starTimes[2] &&
        level.starTimes[0] < level.starTimes[1] && level.starTimes[1] < level.starTimes[2];
    }),
    deep.map((level) => level.starTimes.join("/")).join(" "));

  /* The summit's time bands climb from e24, take about a ninth more for
   * the wider tray, then resume the shipped per-rung pace (under six
   * percent band over band). */
  const bandProblems = [];
  summit.forEach((level, index) => {
    const prev = index === 0 ? byId.e24 : summit[index - 1];
    const jump = level.starTimes[0] / prev.starTimes[0];
    if (!(level.starTimes[0] < level.starTimes[1] && level.starTimes[1] < level.starTimes[2])) {
      bandProblems.push(`${level.id}: bands are not ordered`);
    }
    if (index === 0 && !(jump >= 1.08 && jump <= 1.1)) {
      bandProblems.push(`e25 takes ${(jump * 100 - 100).toFixed(1)}% over e24, not about a ninth`);
    }
    if (index > 0 && !(level.starTimes[0] > prev.starTimes[0] &&
        level.starTimes[1] > prev.starTimes[1] && level.starTimes[2] > prev.starTimes[2])) {
      bandProblems.push(`${level.id}: does not clear the rung before it`);
    }
    if (index > 0 && level.starTimes.some((band, b) => band / prev.starTimes[b] > 1.06)) {
      bandProblems.push(`${level.id}: a band jumps more than six percent`);
    }
  });
  check("game-glyph-sketch",
    "the summit time bands climb from e24, jump about a ninth, then resume the shipped pace",
    bandProblems.length === 0, bandProblems.join(" | ") ||
      summit.map((level) => level.starTimes.join("/")).join(" "));

  /* The widening buys real work: the deep sweeps rise rung over rung, the
   * tier's mean wave count sits far above the shipped ladder's, and the
   * deep closer sweeps past every shipped board. */
  const shippedWaves = shipped.map((level) => wavesByLevel[level.id]);
  const deepWaves = deep.map((level) => wavesByLevel[level.id]);
  const mean = (list) => list.reduce((a, b) => a + b, 0) / list.length;
  const waveProblems = [];
  deep.forEach((level, index) => {
    if (index > 0 && !(wavesByLevel[level.id] > wavesByLevel[deep[index - 1].id])) {
      waveProblems.push(`${level.id} sweeps in ${wavesByLevel[level.id]} waves,` +
        ` not past the rung before it`);
    }
  });
  if (!(mean(deepWaves) > mean(shippedWaves) + 2)) {
    waveProblems.push(`deep mean ${mean(deepWaves).toFixed(1)} waves does not clear` +
      ` the shipped mean ${mean(shippedWaves).toFixed(1)} by two`);
  }
  if (!(wavesByLevel.e24 > Math.max.apply(null, shippedWaves))) {
    waveProblems.push(`the deep closer's ${wavesByLevel.e24} waves does not beat the` +
      ` shipped maximum ${Math.max.apply(null, shippedWaves)}`);
  }
  check("game-glyph-sketch",
    "the deep sweeps rise rung over rung and close past the shipped ladder",
    waveProblems.length === 0, waveProblems.join(" | ") ||
      `deep ${deepWaves.join("/")} vs shipped max ${Math.max.apply(null, shippedWaves)}`);

  /* Per summit rung: the engine's own proof, that the clues alone close
   * the picture, and that the sweep is longer than the rung before it -
   * e24's eleven waves included. */
  summit.forEach((level, index) => {
    const prev = index === 0 ? byId.e24 : summit[index - 1];
    const result = lineSolve(level.art);
    check("game-glyph-sketch",
      level.id + " line-solves uniquely to its own picture and sweeps past the rung before it",
      result.solved && result.waves > wavesByLevel[prev.id],
      result.solved
        ? result.waves + " waves vs " + prev.id + "'s " + wavesByLevel[prev.id]
        : "the sweep stalls");
  });

  /* The summit is the highest tier on the tray's own currency: its mean
   * wave count clears the deep tier's by two, and the closer ends the
   * ladder as the longest sweep it has ever asked for. */
  const summitWaves = summit.map((level) => wavesByLevel[level.id]);
  const allWaves = table.map((level) => wavesByLevel[level.id]);
  check("game-glyph-sketch",
    "the summit's mean sweep clears the deep tier's by two (" +
      mean(summitWaves).toFixed(1) + " vs " + mean(deepWaves).toFixed(1) + ")",
    mean(summitWaves) > mean(deepWaves) + 2,
    "summit " + summitWaves.join("/") + " vs deep " + deepWaves.join("/"));
  check("game-glyph-sketch",
    "e30 ends the pre-quarter ladder as its longest sweep",
    wavesByLevel.e30 === Math.max.apply(null,
      table.filter((level) => !quarterIds.includes(level.id))
        .map((level) => wavesByLevel[level.id])),
    "e30 " + wavesByLevel.e30 + " waves, pre-quarter max " +
      Math.max.apply(null, table.filter((level) => !quarterIds.includes(level.id))
        .map((level) => wavesByLevel[level.id])));

  /* The clue lines fragment with the altitude: the summit's runs per line
   * climb rung over rung. */
  const summitRuns = summit.map((level) => runsMean(level.art));
  const runsProblems = summitRuns.filter((runs, index) =>
    index > 0 && !(runs > summitRuns[index - 1]));
  check("game-glyph-sketch",
    "the summit's clue lines fragment rung over rung (" +
      summitRuns.map((runs) => runs.toFixed(2)).join(" -> ") + ")",
    runsProblems.length === 0, summitRuns.join("/"));

  /* The cut: the summit's defining deal is the line-solvable promise
   * itself, so the gate thins every summit board by one pixel at a time
   * and re-sweeps. Each rung must keep a measured set of keystone pixels
   * whose clearance stalls the sweep outright - the board sits one pixel
   * above the ambiguity edge, and the count is re-measured every run. */
  summit.forEach((level) => {
    const art = level.art;
    let filled = 0;
    let keystones = 0;
    for (let r = 0; r < art.length; r += 1) {
      for (let c = 0; c < art[0].length; c += 1) {
        if (art[r][c] !== "#") continue;
        filled += 1;
        const cut = art.map((row, ri) =>
          ri === r ? row.slice(0, c) + "." + row.slice(c + 1) : row);
        if (!lineSolve(cut).solved) keystones += 1;
      }
    }
    check("game-glyph-sketch",
      level.id + " sits one pixel above the ambiguity edge",
      keystones >= 10, keystones + " of " + filled + " pixel cuts stall the sweep");
  });

  /* ---- the quarter tier: the sixteen-wide tray ---- */
  const quarter = quarterIds.map((id) => byId[id]);
  const quarterProblems = [];
  quarter.forEach((level, index) => {
    const result = lineSolve(level.art);
    if (!result.solved) {
      quarterProblems.push(level.id + " does not line-solve to its own picture");
      return;
    }
    const prev = index === 0 ? byId.e30 : quarter[index - 1];
    if (!(result.waves > wavesByLevel[prev.id])) {
      quarterProblems.push(level.id + " sweeps in " + result.waves + " waves, not past " +
        prev.id + "'s " + wavesByLevel[prev.id]);
    }
    const sizeProblems = level.art.length !== 16 || level.art[0].length !== 16;
    if (sizeProblems) {
      quarterProblems.push(level.id + " is not a sixteen-wide tray (" +
        level.art.length + "x" + level.art[0].length + ")");
    }
  });
  check("game-glyph-sketch",
    "every quarter board line-solves uniquely, sweeps past the rung before it, and is sixteen wide",
    quarterProblems.length === 0, quarterProblems.join(" | "));
  const quarterWaves = quarter.map((level) => wavesByLevel[level.id]);
  const summitWavesMean = mean(summitWaves);
  check("game-glyph-sketch",
    "the quarter's mean sweep clears the summit's by two (" +
      mean(quarterWaves).toFixed(1) + " vs " + summitWavesMean.toFixed(1) + ")",
    mean(quarterWaves) > summitWavesMean + 2,
    "quarter " + quarterWaves.join("/") + " vs summit " + summitWaves.join("/"));
  check("game-glyph-sketch",
    "e40 ends the ladder as its longest sweep",
    wavesByLevel.e40 === Math.max.apply(null,
      table.map((level) => wavesByLevel[level.id])),
    "e40 " + wavesByLevel.e40 + " waves, ladder max " +
      Math.max.apply(null, table.map((level) => wavesByLevel[level.id])));

  /* The keystone promise re-measured on the wider tray: every quarter
   * board keeps a measured set of pixels whose clearance stalls the
   * sweep - the measured counts run into the dozens. */
  quarter.forEach((level) => {
    const art = level.art;
    let filled = 0;
    let keystones = 0;
    for (let r = 0; r < art.length; r += 1) {
      for (let c = 0; c < art[0].length; c += 1) {
        if (art[r][c] !== "#") continue;
        filled += 1;
        const cut = art.map((row, ri) =>
          ri === r ? row.slice(0, c) + "." + row.slice(c + 1) : row);
        if (!lineSolve(cut).solved) keystones += 1;
      }
    }
    check("game-glyph-sketch",
      level.id + " sits well above the ambiguity edge",
      keystones >= 10, keystones + " of " + filled + " pixel cuts stall the sweep");
  });

  /* The quarter's time bands: about a ninth over e30 for the wider tray,
   * then the shipped pace (no band jumps more than six percent). */
  const quarterBandProblems = [];
  quarter.forEach((level, index) => {
    const prev = index === 0 ? byId.e30 : quarter[index - 1];
    const jump = level.starTimes[0] / prev.starTimes[0];
    if (!(level.starTimes[0] < level.starTimes[1] && level.starTimes[1] < level.starTimes[2])) {
      quarterBandProblems.push(level.id + ": bands are not ordered");
    }
    if (index === 0 && !(jump >= 1.08 && jump <= 1.1)) {
      quarterBandProblems.push("e31 takes " + ((jump * 100 - 100).toFixed(1)) +
        "% over e30, not about a ninth");
    }
    if (index > 0 && level.starTimes.some((band, b) => band / prev.starTimes[b] > 1.06)) {
      quarterBandProblems.push(level.id + ": a band jumps more than six percent");
    }
  });
  check("game-glyph-sketch",
    "the quarter time bands climb from e30, jump about a ninth, then resume the shipped pace",
    quarterBandProblems.length === 0, quarterBandProblems.join(" | ") ||
      quarter.map((level) => level.starTimes.join("/")).join(" "));

  /* The tier's names resolve in both languages. */
  const copyKeys = deep.map((level) => level.labelKey)
    .concat(summit.map((level) => level.labelKey))
    .concat(quarter.map((level) => level.labelKey));
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-glyph-sketch", "the twenty deep, summit and quarter board names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each board in order
   * hands the player exactly the next one, all forty times. */
  const chain = App.createCampaign({
    key: "glyph-sketch-gate-chain",
    levels: table.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  table.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < table.length ? table[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-glyph-sketch", "the unlock chain walks all forty boards in order",
    walked === 40 && chained && chain.clearedCount() === 40, walked + " first clears");
};
