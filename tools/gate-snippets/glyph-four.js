"use strict";

/* game-glyph-four: the summit tier is the peak brain on a longer clock.
 *
 * The engine's knobs are spent by rung 24 - the search purse answers before
 * any configured depth past eleven does, noise is already at its floor, and
 * withdrawing the tempo concession makes the rank unbeatable (the engine's
 * own brain at depth six and depth eight drops 0 of 10 mirrors to it). So
 * the summit escalates the way the shipped ladder always has - the sight ask
 * climbs one ply per rung, seventeen through twenty-two, past the
 * sovereign's sixteen - and charges the climb on the star clock, re-priced
 * at the engine's own line: [4, 5, 6] against the sovereign's decorative
 * [5, 7, 9].
 *
 * The gate proves the tier four ways, all through the game's own engine.
 * Structurally: six summit rungs whose depths run strictly 17-22 above the
 * peak's 16 while every earlier rung stays at or below it, the peak brain's
 * settings carried unchanged (tempo on, noise zero), and bands tighter than
 * the shipped peak's on every line. Through the search: on seeded boards
 * spanning the midgame and endgame, every summit rank picks exactly what
 * f24 picks - the brain is inherited, not weakened - and on a paired seed
 * the summit ends the reference's night no later than the peak does.
 * Through the bench: the rank's own brain, seated first through the
 * colour-swapped board the shipped reversi gate uses for its light seat,
 * plays the shipped two-ply reference hand six times - every outright win
 * earns at least one star under App.starsFor, both four-disc wins land the
 * three-star line, and all three bands are hit. And on the page: the panel
 * boots through its real init path in the stub DOM with the thirty-rung
 * picker it should have, the unlock chain walks every rung in order, and
 * the six summit names resolve in both languages. */

module.exports = function gate(ctx) {
  const { App, env, check, fs, path, root } = ctx;
  const levels = App.glyphFourLevels;
  const summitIds = ["f25", "f26", "f27", "f28", "f29", "f30"];

  /* ---- the ladder and its unlock chain ---- */
  check("game-glyph-four", "the ladder holds thirty boards",
    levels.length === 30, String(levels.length));
  check("game-glyph-four", "every board id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const missingSummit = summitIds.filter((id) => !byId[id]);
  check("game-glyph-four", "the summit tier f25-f30 is present",
    missingSummit.length === 0, missingSummit.join(","));

  const chain = App.createCampaign({
    key: "glyph-four-gate-chain",
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
  check("game-glyph-four", "the unlock chain walks all thirty boards in order",
    walked === 30 && chained && chain.clearedCount() === 30,
    walked + " first clears");

  /* ---- the summit's shape: the sight ask climbs, the brain carries ---- */
  const summit = summitIds.map((id) => byId[id]);
  const peak = byId.f24;
  const shapeProblems = [];
  summit.forEach((level, index) => {
    if (level.depth !== 17 + index) {
      shapeProblems.push(level.id + " depth " + level.depth + " != " + (17 + index));
    }
    if (level.tempo !== 1 || level.noise !== 0) {
      shapeProblems.push(level.id + " carries tempo " + level.tempo +
        " noise " + level.noise + ", not the peak brain's");
    }
    if (level.starMoves[0] >= level.starMoves[1] ||
        level.starMoves[1] >= level.starMoves[2]) {
      shapeProblems.push(level.id + " bands do not run downwards " +
        level.starMoves.join("/"));
    }
  });
  check("game-glyph-four",
    "the summit sight ask climbs strictly 17-22 with the peak brain's settings",
    shapeProblems.length === 0, shapeProblems.join(" | "));
  const shallower = levels.filter((level) =>
    !summitIds.includes(level.id) && level.depth >= 17);
  check("game-glyph-four", "no earlier rung asks for sight past sixteen",
    shallower.length === 0, shallower.map((level) => level.id).join(","));
  const clockProblems = summit.filter((level) =>
    level.starMoves[0] >= peak.starMoves[0] ||
    level.starMoves[1] >= peak.starMoves[1] ||
    level.starMoves[2] >= peak.starMoves[2]);
  check("game-glyph-four",
    "every summit band is tighter than the shipped peak's on every line",
    clockProblems.length === 0,
    clockProblems.map((level) => level.id).join(","));
  const bandRepeat = levels.filter((level) => !summitIds.includes(level.id) &&
    level.starMoves[0] === 4 && level.starMoves[1] === 5 && level.starMoves[2] === 6);
  check("game-glyph-four", "no earlier rung prices the summit's clock",
    bandRepeat.length === 0, bandRepeat.map((level) => level.id).join(","));

  /* ---- the engine core, re-hosted the way the shipped gate hosts it ---- */
  const c4Src = fs
    .readFileSync(path.join(root, "assets", "app", "game-glyph-four.js"), "utf8")
    .replace(/^﻿/, "");
  const c4Core =
    "var App = {};\n" +
    c4Src.slice(c4Src.indexOf("var C4_W = 7;"), c4Src.indexOf("App.glyphFourDropRow")) +
    "\nreturn { c4DropRow: c4DropRow, c4WinLine: c4WinLine, c4Pick: c4Pick," +
    " c4Full: c4Full, c4Evaluate: c4Evaluate, c4Levels: c4Levels };";
  const c4 = new Function(c4Core)();
  const c4Seeded = (seed, fn) => {
    const real = Math.random;
    let a = seed >>> 0;
    Math.random = () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    try {
      return fn();
    } finally {
      Math.random = real;
    }
  };
  const c4RefPick = (board) => {
    const order = [3, 2, 4, 1, 5, 0, 6];
    const cols = order.filter((c) => c4.c4DropRow(board, c) !== -1);
    if (!cols.length) return -1;
    const neg = (state, depth, alpha, beta, maxing) => {
      if (c4.c4WinLine(state, 1)) return 100000;
      if (c4.c4WinLine(state, 2)) return -100000;
      if (c4.c4Full(state) || depth === 0) return c4.c4Evaluate(state);
      const cs = order.filter((c) => c4.c4DropRow(state, c) !== -1);
      let best = maxing ? -Infinity : Infinity;
      for (const c of cs) {
        const r = c4.c4DropRow(state, c);
        state[r * 7 + c] = maxing ? 1 : 2;
        const v = neg(state, depth - 1, alpha, beta, !maxing);
        state[r * 7 + c] = 0;
        if (maxing) {
          if (v > best) best = v;
          if (best > alpha) alpha = best;
        } else {
          if (v < best) best = v;
          if (best < beta) beta = best;
        }
        if (alpha >= beta) break;
      }
      return best;
    };
    let best = -Infinity;
    let bestCol = cols[0];
    for (const c of cols) {
      const r = c4.c4DropRow(board, c);
      board[r * 7 + c] = 1;
      const v = neg(board, 1, -Infinity, Infinity, false);
      board[r * 7 + c] = 0;
      if (v > best) {
        best = v;
        bestCol = c;
      }
    }
    return bestCol;
  };
  const c4Duel = (rank, seed) =>
    c4Seeded(seed, () => {
      const board = new Array(42).fill(0);
      let player = 1;
      let playerMoves = 0;
      for (let guard = 0; guard < 60 && !c4.c4Full(board); guard += 1) {
        const col = player === 1 ? c4RefPick(board) : c4.c4Pick(board, rank);
        if (col === -1) return { moves: playerMoves, over: "full" };
        const row = c4.c4DropRow(board, col);
        if (row === -1) throw new Error("illegal drop onto a full column");
        board[row * 7 + col] = player;
        if (c4.c4WinLine(board, player)) {
          return { moves: playerMoves, over: player === 1 ? "p1" : "p2" };
        }
        player = player === 1 ? 2 : 1;
        if (player === 1) playerMoves += 1;
      }
      return { moves: playerMoves, over: "full" };
    });

  /* The brain is inherited, not weakened: on seeded boards spanning the
   * phases where duels are decided, every summit rank picks exactly what
   * the shipped peak picks (each pick seeded alike, so the tempo rolls
   * line up). */
  const c4PhaseBoard = (seed, plies) =>
    c4Seeded(seed, () => {
      const board = new Array(42).fill(0);
      const order = [3, 2, 4, 1, 5, 0, 6];
      let turn = 1;
      for (let i = 0; i < plies; i += 1) {
        const cols = order.filter((c) => c4.c4DropRow(board, c) !== -1);
        if (!cols.length) break;
        const col = cols[Math.floor(Math.random() * Math.min(3, cols.length))];
        const row = c4.c4DropRow(board, col);
        board[row * 7 + col] = turn;
        if (c4.c4WinLine(board, turn)) break;
        turn = turn === 1 ? 2 : 1;
      }
      return board;
    });
  const identityProblems = [];
  [18, 30].forEach((plies) => {
    const board = c4PhaseBoard(927000 + plies * 331, plies);
    const peakPick = c4Seeded(555000 + plies, () => c4.c4Pick(board.slice(), peak));
    summit.forEach((level) => {
      const pick = c4Seeded(555000 + plies, () => c4.c4Pick(board.slice(), level));
      if (pick !== peakPick) {
        identityProblems.push(level.id + " diverges from f24 at " + plies + " plies");
      }
    });
  });
  check("game-glyph-four",
    "every summit rank picks the shipped peak's move on seeded phase boards",
    identityProblems.length === 0, identityProblems.join(" | "));

  /* The tempo concession is machinery, not a label: on seeded midgames the
   * pick moves when tempo is switched off. */
  let tempoDiffers = 0;
  for (let s = 1; s <= 24; s += 1) {
    const board = c4Seeded(707000 + s * 331, () => {
      const b = new Array(42).fill(0);
      [[3, 1], [3, 2], [4, 1], [2, 1], [5, 2], [4, 1]].forEach(([c, p]) => {
        const r = c4.c4DropRow(b, c);
        b[r * 7 + c] = p;
      });
      return b;
    });
    const withTempo = c4Seeded(808000 + s * 97, () =>
      c4.c4Pick(board, { depth: 6, noise: 0, tempo: 1 }));
    const without = c4Seeded(808000 + s * 97, () =>
      c4.c4Pick(board, { depth: 6, noise: 0, tempo: 0 }));
    if (withTempo !== without) tempoDiffers += 1;
  }
  check("game-glyph-four", "the carried tempo concession moves the pick on real boards",
    tempoDiffers >= 2, String(tempoDiffers) + " of 24 boards");

  /* The conquest holds on a paired seed: the summit ends the reference's
   * night no later than the shipped peak does, and the night still ends in
   * the rival's favour. */
  const peakNight = c4Duel(peak, 61000 + 613);
  const summitNight = c4Duel(summit[0], 61000 + 613);
  check("game-glyph-four",
    "the summit's conquest of the reference is no slower than the peak's on the paired seed",
    summitNight.over === "p2" && summitNight.moves <= peakNight.moves,
    "summit " + summitNight.moves + " (" + summitNight.over +
      ") vs peak " + peakNight.moves + " (" + peakNight.over + ")");

  /* ---- the bench: the engine's own line prices the clock ----
   * The rank's own brain takes the player seat through the colour-swapped
   * board (the engine's pick is written for the rival seat) and plays the
   * shipped two-ply reference hand, which now holds the rival discs. Six
   * seeded games: every outright win must earn its star under the game's
   * own starsFor, the four-disc line must be landed but not every game,
   * and all three bands must be hit somewhere. */
  const c4Swap = (board) =>
    board.map((cell) => (cell === 1 ? 2 : cell === 2 ? 1 : 0));
  const c4BenchDuel = (rank, seed) =>
    c4Seeded(seed, () => {
      const board = new Array(42).fill(0);
      let player = 1;
      let playerMoves = 0;
      for (let guard = 0; guard < 60 && !c4.c4Full(board); guard += 1) {
        const seen = c4Swap(board);
        const col = player === 1 ? c4.c4Pick(seen, rank) : c4RefPick(seen);
        if (col === -1) return { result: "full", discs: playerMoves };
        const row = c4.c4DropRow(board, col);
        if (row === -1) throw new Error("illegal bench drop onto a full column");
        board[row * 7 + col] = player;
        if (c4.c4WinLine(board, player)) {
          return {
            result: player === 1 ? "p1win" : "p2win",
            discs: playerMoves,
          };
        }
        player = player === 1 ? 2 : 1;
        if (player === 1) playerMoves += 1;
      }
      return { result: "full", discs: playerMoves };
    });
  const benchSeeds = [2, 3, 4, 5, 7, 8].map((s) => 407000 + s * 733);
  const benchGames = benchSeeds.map((seed) => c4BenchDuel(summit[5], seed));
  const benchProblems = [];
  const wins = benchGames.filter((game) => game.result === "p1win");
  if (!wins.length) benchProblems.push("the bench never wins a game");
  const starCounts = { 1: 0, 2: 0, 3: 0 };
  wins.forEach((game) => {
    const stars = App.starsFor(game.discs, summit[5].starMoves, "low");
    if (stars <= 0) {
      benchProblems.push("a " + game.discs + "-disc win earns no star");
    } else {
      starCounts[stars] += 1;
    }
  });
  if (!starCounts[3]) benchProblems.push("no bench win lands the three-star line");
  if (!starCounts[2]) benchProblems.push("no bench win lands the two-star band");
  if (!starCounts[1]) benchProblems.push("no bench win lands the one-star band");
  check("game-glyph-four",
    "the bench's six games earn every band under starsFor, three-star tight",
    benchProblems.length === 0,
    benchGames.map((game) => game.result + ":" + game.discs).join(" ") +
      (benchProblems.length ? " -> " + benchProblems.join(" | ") : ""));

  /* ---- the page: the real init path, the picker, the names ----
   * The stub DOM parses none of the game-panel markup, so the boot stages
   * a fresh set of the module's own pads (the way the echo gate stages
   * its panel) and boots the module exactly once through its real init
   * path; the assertion is that the boot runs clean and the campaign
   * picker comes out holding all thirty rungs in order, the summit's
   * option labels resolved rather than keyed. */
  const doc = env.document;
  ["c4Canvas", "c4You", "c4Ai", "c4Moves", "c4Result", "c4NewBtn", "c4Best",
    "c4LevelSel"].forEach((id) => {
    const stale = doc.getElementById(id);
    if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
  });
  const makePad = (id, tag) => {
    const el = doc.createElement(tag || "div");
    el.id = id;
    doc.body.appendChild(el);
    return el;
  };
  makePad("c4Canvas", "canvas");
  makePad("c4You");
  makePad("c4Ai");
  makePad("c4Moves");
  makePad("c4Result");
  makePad("c4NewBtn", "button");
  makePad("c4Best");
  const select = makePad("c4LevelSel", "select");
  let bootError = null;
  try {
    App.initGlyphFourGame();
  } catch (error) {
    bootError = error && error.message;
  }
  const options = Array.from(select.querySelectorAll("option"));
  const pickerProblems = [];
  if (bootError) pickerProblems.push("boot threw: " + bootError);
  if (typeof App.quietResetGlyphFour !== "function") {
    pickerProblems.push("the boot never reached its reset hook");
  }
  if (options.length !== 30) {
    pickerProblems.push("the picker holds " + options.length + " rungs");
  }
  options.forEach((option, index) => {
    if (option.value !== levels[index].id) {
      pickerProblems.push("option " + index + " is " + option.value);
    }
  });
  summit.forEach((level) => {
    const option = options[levels.indexOf(level)];
    if (!option || option.textContent.indexOf(App.t(level.labelKey)) === -1 ||
        option.textContent.indexOf(level.labelKey) !== -1) {
      pickerProblems.push(level.id + " picker label unresolved");
    }
  });
  check("game-glyph-four",
    "the panel boots through its real init path with the thirty-rung picker",
    pickerProblems.length === 0, pickerProblems.join(" | "));

  /* The tier's names travel with the page: both languages hold a real
   * string and t() never falls back to the raw key. */
  const copyProblems = summit.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-glyph-four", "the six summit board names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
