"use strict";

/* game-glyph-sketch: the deep tier is the wide tray, and the machine proof
 * - unique line solvability - is re-run here over the whole ladder.
 *
 * The engine reads only the art; the machine proof is that the row and
 * column clues alone close the picture. The gate re-hosts a standard
 * nonogram line solver (run-placement enumeration, intersected, swept to a
 * fixpoint) and proves three things. First, every rung shipped or deep
 * line-solves to exactly its own picture - a board that needed a guess
 * would fail the sweep. Second, the deep tier is the wide tray by
 * structure: no shipped rung exceeds ten columns, every deep rung is
 * twelve, the first widening the ladder has ever shipped. Third, the
 * widening buys real work: the deduction waves the four deep boards demand
 * rise rung over rung, the tier's mean sits far above the shipped ladder's,
 * and the summit's sweep is the longest the tray has ever asked for. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.sketchLevels || null;
  const deepIds = ["e21", "e22", "e23", "e24"];

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

  check("game-glyph-sketch", "the ladder holds twenty-four boards",
    table.length === 24, String(table.length));
  check("game-glyph-sketch", "every board id is distinct",
    new Set(table.map((level) => level.id)).size === table.length,
    table.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !table.some((level) => level.id === id));
  check("game-glyph-sketch", "the deep tier e21-e24 is present",
    missing.length === 0, missing.join(","));

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
    "every board in the ladder line-solves uniquely to its own picture",
    solveProblems.length === 0, solveProblems.join(" | "));

  /* The deep tier is the wide tray: shipped boards never exceeded ten
   * columns, every deep board is twelve - the first widening in twenty
   * rungs - and the time bands keep the shipped climb. */
  const byId = {};
  table.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);
  const shallow = table.filter((level) => !deepIds.includes(level.id));
  check("game-glyph-sketch",
    "no shipped board exceeds ten columns; every deep board is twelve",
    shallow.every((level) => level.art[0].length <= 10) &&
    deep.every((level) => level.art.length === 12 && level.art[0].length === 12),
    "deep sizes " + deep.map((level) => `${level.art.length}x${level.art[0].length}`).join("/"));
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

  /* The widening buys real work: the deep sweeps rise rung over rung, the
   * tier's mean wave count sits far above the shipped ladder's, and the
   * summit's sweep is the longest the tray has ever asked for. */
  const shippedWaves = shallow.map((level) => wavesByLevel[level.id]);
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
    waveProblems.push(`the summit's ${wavesByLevel.e24} waves does not beat the` +
      ` shipped maximum ${Math.max.apply(null, shippedWaves)}`);
  }
  check("game-glyph-sketch",
    "the deep sweeps rise rung over rung and the summit is the longest yet",
    waveProblems.length === 0, waveProblems.join(" | ") ||
      `deep ${deepWaves.join("/")} vs shipped max ${Math.max.apply(null, shippedWaves)}`);

  /* The tier's names resolve in both languages. */
  const copyProblems = deep.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-glyph-sketch", "the four deep board names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each board in order
   * hands the player exactly the next one, all twenty-four times. */
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
  check("game-glyph-sketch", "the unlock chain walks all twenty-four boards in order",
    walked === 24 && chained && chain.clearedCount() === 24, walked + " first clears");
};
