"use strict";

/* game-glyph-sudoku: the deep hall is dealt from seals the gate breaks
 * twice, and solved through the real board.
 *
 * The summit opened the 12x12 hall with its boxes three wide and four
 * tall; the deep hall turns that room every way it turns and digs each
 * geometry as deep as it will go. The gate proves the claim per rung: the
 * sealed seed deals the same board twice, the carve lands on the exact
 * givens count the rung asks for (the random deal only hopes), the answer
 * is one answer and a full valid grid, and the deal is a real carve - the
 * board holds empties, so no rung is the generator's cyclic fallback and
 * none is free. The clock keeps the shipped 1.2x ramp rung over rung, so
 * the tier's hardest room is also its longest. Then the proof is played:
 * each rung's unique answer is entered through the engine's own pad and
 * pointer paths cell by cell, and the engine must clear the board and pay
 * three stars for it - the concrete line the ladder sells is the answer
 * itself, and the replay walks it. The chain hands all thirty rungs on,
 * and the deep hall's shared stage names resolve in both languages. */

const DEEP = ["u25", "u26", "u27", "u28", "u29", "u30"];

/* The shipped twenty-four rows' load-bearing fields, so the extension is
 * provably additive: same order, same shapes, same seals, same clocks. */
const SHIPPED = [
  ["u1", "sudL1", 4, 2, 2, 8, null], ["u2", "sudL2", 4, 2, 2, 6, null],
  ["u3", "sudL3", 6, 2, 3, 14, null], ["u4", "sudL4", 6, 2, 3, 12, null],
  ["u5", "sudL5", 9, 3, 3, 34, null], ["u6", "sudL6", 9, 3, 3, 30, null],
  ["u7", "sudL7", 9, 3, 3, 26, null], ["u8", "sudL8", 9, 3, 3, 24, null],
  ["u9", "lvlNum9", 9, 3, 3, 22, null], ["u10", "lvlNum10", 9, 3, 3, 21, null],
  ["u11", "lvlNum11", 9, 3, 3, 21, null], ["u12", "lvlNum12", 9, 3, 3, 20, null],
  ["u13", "lvlNum13", 9, 3, 3, 20, null], ["u14", "lvlNum14", 9, 3, 3, 19, null],
  ["u15", "lvlNum15", 9, 3, 3, 19, null], ["u16", "lvlNum16", 9, 3, 3, 18, null],
  ["u17", "lvlNum17", 9, 3, 3, 18, null], ["u18", "lvlNum18", 9, 3, 3, 18, null],
  ["u19", "lvlNum19", 9, 3, 3, 17, null], ["u20", "lvlNum20", 9, 3, 3, 17, null],
  ["u21", "lvlNum21", 9, 3, 3, 23, 216], ["u22", "lvlNum22", 10, 2, 5, 31, 128],
  ["u23", "lvlNum23", 10, 5, 2, 31, 5], ["u24", "lvlNum24", 12, 3, 4, 52, 20],
];

module.exports = function gate(ctx) {
  const { App, env, check, fs, path, root } = ctx;

  /* ---- the ladder, parsed from the module's own source ----------------- */
  const sudSrc = fs
    .readFileSync(path.join(root, "assets", "app", "game-glyph-sudoku.js"), "utf8")
    .replace(/^﻿/, "");
  const sudSlice = sudSrc.slice(
    sudSrc.indexOf("var sudLevels"),
    sudSrc.indexOf("/* Pure generator"),
  );
  const rows = {};
  const order = [];
  for (const rowText of Array.from(sudSlice.matchAll(/\{[^{}]*\}/g))) {
    const text = rowText[0];
    const id = (/id:\s*"([a-z0-9]+)"/.exec(text) || [])[1];
    if (!id) continue;
    order.push(id);
    rows[id] = {
      text,
      labelKey: (/labelKey:\s*"([A-Za-z0-9]+)"/.exec(text) || [])[1],
      size: Number((/size:\s*(\d+)/.exec(text) || [])[1]),
      bw: Number((/bw:\s*(\d+)/.exec(text) || [])[1]),
      bh: Number((/bh:\s*(\d+)/.exec(text) || [])[1]),
      clues: Number((/clues:\s*(\d+)/.exec(text) || [])[1]),
      seed: /seed:\s*(\d+)/.exec(text) ? Number(/seed:\s*(\d+)/.exec(text)[1]) : null,
      starTimes: /starTimes:\s*\[(\d+),\s*(\d+),\s*(\d+)\]/.exec(text).slice(1).map(Number),
    };
  }

  check("game-glyph-sudoku", "the ladder holds thirty grids",
    order.length === 30, String(order.length));
  check("game-glyph-sudoku", "every grid id is distinct and the ladder runs u1-u30 in order",
    order.every((id, index) => id === "u" + (index + 1)), order.join(","));
  const deepMissing = DEEP.filter((id) => !order.includes(id));
  check("game-glyph-sudoku", "the deep hall u25-u30 is present, after the summit",
    deepMissing.length === 0 &&
      DEEP.every((id, index) => order.indexOf(id) >
        (index === 0 ? order.indexOf("u24") : order.indexOf(DEEP[index - 1]))),
    deepMissing.join(","));

  const untouched = SHIPPED.every(([id, labelKey, size, bw, bh, clues, seed], index) => {
    const row = rows[id];
    return order[index] === id && row &&
      row.labelKey === labelKey && row.size === size && row.bw === bw &&
      row.bh === bh && row.clues === clues && row.seed === seed;
  });
  check("game-glyph-sudoku", "the shipped twenty-four rows are untouched",
    untouched, untouched ? "u1-u24 match" : "a shipped row drifted");

  const fieldDrift = DEEP.filter((id) => {
    const keys = Array.from(rows[id].text.matchAll(/([a-zA-Z]+)\s*:/g)).map((m) => m[1]);
    return keys.join(",") !== "id,labelKey,size,bw,bh,clues,seed,starTimes" ||
      rows[id].size !== 12 || rows[id].seed === null;
  });
  check("game-glyph-sudoku",
    "each deep hall row carries only the fields the engine reads, sealed to a seed on the 12x12",
    fieldDrift.length === 0, fieldDrift.join(","));

  const rampProblems = [];
  DEEP.forEach((id, index) => {
    const prev = index === 0 ? rows.u24 : rows[DEEP[index - 1]];
    rows[id].starTimes.forEach((band, k) => {
      if (band !== Math.round(prev.starTimes[k] * 1.2)) {
        rampProblems.push(id + ":band" + k + " " + band + " vs " + prev.starTimes[k] + "*1.2");
      }
    });
  });
  check("game-glyph-sudoku",
    "the deep hall clock keeps the shipped 1.2x ramp off the summit's bands, rung over rung",
    rampProblems.length === 0, rampProblems.join(" | "));

  /* ---- the seals: every deep hall deal, broken twice ------------------- */
  const deals = {};
  const sealProblems = [];
  DEEP.forEach((id) => {
    const row = rows[id];
    const dealA = App.glyphSudokuGenerate(row.size, row.bw, row.bh, row.clues, { seed: row.seed });
    const dealB = App.glyphSudokuGenerate(row.size, row.bw, row.bh, row.clues, { seed: row.seed });
    deals[id] = dealA;
    if (JSON.stringify(dealA.puzzle) !== JSON.stringify(dealB.puzzle)) {
      sealProblems.push(id + ": the seal dealt two boards");
    }
    if (dealA.givens !== row.clues) {
      sealProblems.push(id + ": carve " + dealA.givens + " of " + row.clues);
    }
    const answers = App.glyphSudokuCountSolutions(dealA.puzzle, row.size, row.bw, row.bh, 2);
    if (answers !== 1) {
      sealProblems.push(id + ": " + answers + " answers");
    }
    const givens = dealA.puzzle.filter((v) => v > 0).length;
    if (givens >= row.size * row.size) {
      sealProblems.push(id + ": no carve, the board is the fallback");
    }
    if (!(row.starTimes[0] < row.starTimes[1] && row.starTimes[1] < row.starTimes[2])) {
      sealProblems.push(id + ": star times do not fall");
    }
  });
  check("game-glyph-sudoku",
    "every deep hall seal deals one board twice, carves to the exact givens count, keeps a single answer, and is a real carve",
    sealProblems.length === 0, sealProblems.join(" | "));

  const gridProblems = [];
  DEEP.forEach((id) => {
    const row = rows[id];
    const deal = deals[id];
    const solutionRows = Array.from({ length: row.size }, (_, r) =>
      deal.solution.slice(r * row.size, (r + 1) * row.size));
    if (deal.solution.length !== row.size * row.size ||
        !App.glyphSudokuValid(solutionRows, row.size, row.bw, row.bh)) {
      gridProblems.push(id + ": the sealed answer is not a full valid grid");
    }
    /* The carve disagrees with the answer on exactly the empties: every
     * empty cell is a cell the player still has to earn. */
    const empties = deal.puzzle.filter((v) => v === 0).length;
    if (empties !== row.size * row.size - row.clues) {
      gridProblems.push(id + ": " + empties + " empties vs " + (row.size * row.size - row.clues));
    }
  });
  check("game-glyph-sudoku",
    "every deep hall answer is a full valid grid and every empty cell is the player's to earn",
    gridProblems.length === 0, gridProblems.join(" | "));

  /* ---- the replay: the unique answer, entered on the real board -------- */
  env.setMotion("off");
  const makeSud = (id, tag) => {
    const found = env.byId(id);
    if (found) return found;
    const el = env.document.createElement(tag || "div");
    el.id = id;
    env.document.body.appendChild(el);
    return el;
  };
  const sudCanvas = makeSud("sudCanvas", "canvas");
  makeSud("sudFilled");
  makeSud("sudMisses");
  makeSud("sudTime");
  makeSud("sudResult");
  makeSud("sudNewBtn", "button");
  makeSud("sudBest");
  const sudSelectEl = makeSud("sudLevelSel", "select");
  const sudPadEl = makeSud("sudPad");
  makeSud("gamePanelGlyphSudoku");
  const sudSeeded = {};
  for (let c = 1; c <= 24; c += 1) sudSeeded["u" + c] = { stars: 3, best: 0 };
  env.store.set("glyph-sudoku-campaign", JSON.stringify({ v: 1, cleared: sudSeeded }));
  App.initGlyphSudokuGame();

  /* The pointer path reads the canvas through its box and raster size, so
   * both are pinned to the geometry the game draws in. */
  sudCanvas.width = 320;
  sudCanvas.height = 320;
  sudCanvas.getBoundingClientRect = () => ({
    top: 0, left: 0, right: 320, bottom: 320, width: 320, height: 320, x: 0, y: 0,
  });

  const sudStars = (levelId) => {
    const save = JSON.parse(env.store.get("glyph-sudoku-campaign"));
    return (save.cleared[levelId] || { stars: 0 }).stars;
  };
  const sudSelectLevel = (levelId) => {
    sudSelectEl.value = levelId;
    env.dispatch(sudSelectEl, "change");
    check("game-glyph-sudoku", `${levelId} unlocks as its neighbour clears`,
      sudSelectEl.value === levelId);
  };

  /* The cell geometry the game draws: 12 cells of 25px inside a 8px inset
   * (Math.floor((320 - 12) / 12) = 25, x0 = Math.floor((320 - 300) / 2)). */
  const replayProblems = [];
  DEEP.forEach((id) => {
    const row = rows[id];
    const deal = deals[id];
    const cell = Math.floor((320 - 12) / row.size);
    const x0 = Math.floor((320 - cell * row.size) / 2);
    sudSelectLevel(id);
    for (let index = 0; index < row.size * row.size; index += 1) {
      const value = deal.solution[index];
      if (deal.puzzle[index]) continue; /* a given: already on the board */
      const c = index % row.size;
      const r = Math.floor(index / row.size);
      env.dispatch(sudCanvas, "pointerdown", {
        clientX: x0 + c * cell + cell / 2,
        clientY: x0 + r * cell + cell / 2,
      });
      sudPadEl.children[value - 1].click();
    }
    if (sudStars(id) !== 3) {
      replayProblems.push(id + ": the unique answer paid " + sudStars(id) + " stars");
    }
  });
  check("game-glyph-sudoku",
    "every deep hall rung clears through the real pad and pointer paths, and the unique answer pays its three stars",
    replayProblems.length === 0, replayProblems.join(" | "));

  /* ---- the chain, derived and never stored ----------------------------- */
  const chain = App.createCampaign({
    key: "glyph-sudoku-gate-chain",
    levels: order.map((id) => ({ id: id, labelKey: rows[id].labelKey })),
  });
  let walked = 0;
  let chained = true;
  order.forEach((id, index) => {
    const outcome = chain.record(id, { stars: 3, best: 10, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < order.length ? order[index + 1] : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-glyph-sudoku", "the unlock chain hands each grid to the next, all thirty",
    walked === 30 && chained && chain.clearedCount() === 30,
    walked + " first clears, chained " + chained);

  /* ---- the names travel in both languages ------------------------------ */
  const labelProblems = DEEP.map((id) => rows[id].labelKey).filter((key) => {
    const en = App.I18N && App.I18N.en && App.I18N.en[key];
    const zh = App.I18N && App.I18N.zh && App.I18N.zh[key];
    return typeof en !== "string" || !en.length ||
      typeof zh !== "string" || !zh.length || zh === en ||
      !App.t(key) || App.t(key) === key;
  });
  check("game-glyph-sudoku", "the six deep hall names resolve in both languages as real strings",
    labelProblems.length === 0, labelProblems.join(","));
};
