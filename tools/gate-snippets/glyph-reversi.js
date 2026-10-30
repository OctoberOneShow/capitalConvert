"use strict";

/* game-glyph-reversi: the ransom tier is sight past the ceiling, paid for
 * by the reopened tell.
 *
 * The shipped ladder refuses to cross the deep brain's four plies ("the
 * tier buys its climb in arrangements, not plies"), so the summit's new
 * mechanic is the ply itself: depth five, one past every shipped rank. The
 * clean five-ply brain is beyond the reference hand entirely - the bench
 * never takes a game off it - so the tier pays its ransom out of the game's
 * own noise lever, reopened and widened rung over rung, and charges the
 * climb on the score: the three-star lead rises six, seven, eight, nine,
 * ten, twelve, past the plateau's five, with the capstone trading tell for
 * tempo (the rival opens). The gate proves the tier through the game's own
 * engine exactly the way the shipped gate benches ranks 16-20: the
 * re-hosted core, the two-ply reference hand, ten paired seeded duels per
 * rank. The assertions: every summit duel runs legal to the last disc,
 * every rank is beaten outright at least once, every rank's three-star
 * band is landed but never freely (at most half the bench), every outright
 * win earns at least one star under App.starsFor, the same bench takes
 * every game off the plateau rival, and the six summit names resolve in
 * both languages behind a panel that boots through its real init path with
 * the thirty-rung picker. */

module.exports = function gate(ctx) {
  const { App, env, check, fs, path, root } = ctx;
  const levels = App.glyphReversiLevels;
  const summitIds = ["r25", "r26", "r27", "r28", "r29", "r30"];

  /* ---- the ladder and its unlock chain ---- */
  check("game-glyph-reversi", "the ladder holds thirty ranks",
    levels.length === 30, String(levels.length));
  check("game-glyph-reversi", "every rank id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const missingSummit = summitIds.filter((id) => !byId[id]);
  check("game-glyph-reversi", "the summit tier r25-r30 is present",
    missingSummit.length === 0, missingSummit.join(","));

  const chain = App.createCampaign({
    key: "glyph-reversi-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 1, better: "high" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-glyph-reversi", "the unlock chain walks all thirty ranks in order",
    walked === 30 && chained && chain.clearedCount() === 30,
    walked + " first clears");

  /* ---- the summit's shape: the ply, the tell, the ransom ---- */
  const summit = summitIds.map((id) => byId[id]);
  const plateau = byId.r24;
  const shapeProblems = [];
  summit.forEach((level, index) => {
    if (level.depth !== 5) {
      shapeProblems.push(level.id + " depth " + level.depth + " != 5");
    }
    if (!(level.noise > 0)) {
      shapeProblems.push(level.id + " carries no tell");
    }
    if (level.starMargin[0] !== 6 + [0, 1, 2, 3, 4, 6][index]) {
      shapeProblems.push(level.id + " three-star line " + level.starMargin[0]);
    }
    if (level.starMargin[0] <= level.starMargin[1] ||
        level.starMargin[1] <= level.starMargin[2]) {
      shapeProblems.push(level.id + " bands do not run downwards " +
        level.starMargin.join("/"));
    }
    if (level.id !== "r30" && level.aiFirst) {
      shapeProblems.push(level.id + " opens early");
    }
  });
  if (!summit[5].aiFirst) shapeProblems.push("r30 does not open");
  check("game-glyph-reversi",
    "the summit sits one ply past every shipped rank, tell reopened, ransom rising",
    shapeProblems.length === 0, shapeProblems.join(" | "));
  const shallower = levels.filter((level) =>
    !summitIds.includes(level.id) && level.depth >= 5);
  check("game-glyph-reversi", "no earlier rung searches past four plies",
    shallower.length === 0, shallower.map((level) => level.id).join(","));
  const cheapRansom = summit.filter((level) =>
    level.starMargin[0] <= plateau.starMargin[0]);
  check("game-glyph-reversi",
    "every summit ransom exceeds the plateau's three-star price",
    cheapRansom.length === 0, cheapRansom.map((level) => level.id).join(","));

  /* ---- the engine core, re-hosted the way the shipped gate hosts it ---- */
  const revSrc = fs
    .readFileSync(path.join(root, "assets", "app", "game-glyph-reversi.js"), "utf8")
    .replace(/^﻿/, "");
  const revCore =
    "var App = { glyphReversiMoves: null };\n" +
    "var REV_N = 8, REV_EMPTY = 0, REV_PLAYER = 1, REV_AI = 2;\n" +
    "var REV_DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];\n" +
    revSrc.slice(
      revSrc.indexOf("var revLevels = ["),
      revSrc.indexOf("App.glyphReversiScore"),
    ) +
    "\nreturn { revMoves: revMoves, revApply: revApply, revPick: revPick," +
    " revScore: revScore, revLevels: revLevels };";
  const rev = new Function(revCore)();

  const revStart = () => {
    const board = new Array(64).fill(0);
    board[27] = 2;
    board[28] = 1;
    board[35] = 1;
    board[36] = 2;
    return board;
  };
  const REV_WEIGHTS = [
    120, -20, 10, 5, 5, 10, -20, 120,
    -20, -40, -5, -5, -5, -5, -40, -20,
    10, -5, 3, 1, 1, 3, -5, 10,
    5, -5, 1, 1, 1, 1, -5, 5,
    5, -5, 1, 1, 1, 1, -5, 5,
    10, -5, 3, 1, 1, 3, -5, 10,
    -20, -40, -5, -5, -5, -5, -40, -20,
    120, -20, 10, 5, 5, 10, -20, 120,
  ];
  const revReadFor = (board, player) => {
    let total = 0;
    for (let i = 0; i < 64; i += 1) {
      if (board[i] === player) total += REV_WEIGHTS[i];
      else if (board[i] !== 0) total -= REV_WEIGHTS[i];
    }
    return total;
  };
  /* Two-ply reference: strong enough to punish a soft rival, honest enough
   * to lose to a real one. Same shape as the engine's own deep search. */
  const revRefPick = (board, player) => {
    const moves = rev.revMoves(board, player);
    if (!moves.length) return -1;
    const foe = player === 1 ? 2 : 1;
    const neg = (b, p, d, alpha, beta) => {
      const ms = rev.revMoves(b, p);
      if (!ms.length) {
        if (!rev.revMoves(b, p === 1 ? 2 : 1).length) {
          const s = rev.revScore(b);
          const mine = p === 1 ? s.player : s.ai;
          const theirs = p === 1 ? s.ai : s.player;
          return mine > theirs ? 10000 + mine
            : mine === theirs ? 0 : -10000 - theirs;
        }
        return neg(b, p === 1 ? 2 : 1, d, alpha, beta);
      }
      if (d <= 0) return revReadFor(b, p);
      ms.sort((x, y) => REV_WEIGHTS[y] - REV_WEIGHTS[x]);
      let best = -Infinity;
      for (const m of ms) {
        const v = -neg(rev.revApply(b, p, m).board, p === 1 ? 2 : 1, d - 1, -beta, -alpha);
        if (v > best) best = v;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
      }
      return best;
    };
    let best = -Infinity;
    let bestMove = moves[0];
    for (const m of moves.slice().sort((a, b) => REV_WEIGHTS[b] - REV_WEIGHTS[a])) {
      const v = -neg(rev.revApply(board, player, m).board, foe, 1, -Infinity, -best);
      if (v > best) {
        best = v;
        bestMove = m;
      }
    }
    return bestMove;
  };
  const revSeeded = (seed, fn) => {
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
  /* One full duel: the reference hand (player discs) against the rank's own
   * brain, with the rival opening when the rank says aiFirst. A duel ends
   * either on a full board or on a genuine double pass, and the exit
   * verifies the pass was real: neither side holds a legal move. */
  const revDuel = (rank, seed) => {
    const board = revSeeded(seed, () => {
      const b = revStart();
      let turn = rank.aiFirst ? 2 : 1;
      let passes = 0;
      let stuck = false;
      for (let guard = 0; guard < 200 && passes < 2; guard += 1) {
        const moves = rev.revMoves(b, turn);
        if (!moves.length) {
          passes += 1;
          if (passes >= 2) {
            stuck = !rev.revMoves(b, 1).length && !rev.revMoves(b, 2).length;
          }
          turn = turn === 1 ? 2 : 1;
          continue;
        }
        passes = 0;
        const move = turn === 1
          ? revRefPick(b, 1)
          : rev.revPick(b, rank);
        const applied = rev.revApply(b, turn, move);
        if (!applied) throw new Error("illegal move at " + move);
        for (let i = 0; i < 64; i += 1) b[i] = applied.board[i];
        turn = turn === 1 ? 2 : 1;
      }
      return { board: b, stuck: stuck };
    });
    const score = rev.revScore(board.board);
    return {
      margin: score.player - score.ai,
      discs: score.player + score.ai,
      legalEnd: board.stuck || score.player + score.ai === 64,
    };
  };

  const REV_DUELS = 10;
  const revGames = (rank) => {
    const games = [];
    for (let s = 1; s <= REV_DUELS; s += 1) {
      games.push(revDuel(rank, 91000 + s * 7717));
    }
    return games;
  };

  /* The bench's floor: the same ten streams take every game off the
   * plateau rival, so the summit's prices are charged above a brain the
   * bench already beats for free. */
  const plateauGames = revGames(plateau);
  check("game-glyph-reversi",
    "the bench takes every game off the plateau rival on the same streams",
    plateauGames.every((game) => game.margin > 0 && game.legalEnd),
    JSON.stringify(plateauGames.map((game) => game.margin)));

  /* The tell's reason: the clean five-ply brain is beyond the reference
   * hand - not one seeded duel goes the bench's way. */
  const cleanGames = [];
  for (let s = 1; s <= 4; s += 1) {
    cleanGames.push(revDuel({ noise: 0, depth: 5 }, 91000 + s * 7717));
  }
  check("game-glyph-reversi",
    "the clean five-ply brain never drops a seeded duel to the reference hand",
    cleanGames.every((game) => game.margin < 0 && game.legalEnd),
    JSON.stringify(cleanGames.map((game) => game.margin)));

  /* The ransom bench: every summit rank is beaten outright at least once,
   * lands its own three-star band at least once but never freely, every
   * duel runs legal to the last disc, and every outright win earns at
   * least one star under the game's own starsFor. */
  const benchProblems = [];
  summit.forEach((rank) => {
    const games = revGames(rank);
    const wins = games.filter((game) => game.margin > 0);
    const name = rank.id + " tell=" + rank.noise +
      (rank.aiFirst ? " rival-first" : "") +
      " line=" + rank.starMargin[0];
    if (!wins.length) {
      benchProblems.push(name + " is never beaten outright");
    }
    const landed = wins.filter((game) => game.margin >= rank.starMargin[0]).length;
    if (!landed) {
      benchProblems.push(name + " never lands its three-star band");
    }
    if (landed > REV_DUELS / 2) {
      benchProblems.push(name + " lands its band in " + landed + " of " +
        REV_DUELS + " games - the price is not tight");
    }
    wins.forEach((game) => {
      if (App.starsFor(game.margin, rank.starMargin, "high") <= 0) {
        benchProblems.push(name + " a " + game.margin +
          "-disc win earns no star");
      }
    });
    games.forEach((game) => {
      if (!game.legalEnd) {
        benchProblems.push(name + " a duel ended other than on a full board or a real double pass");
      }
    });
  });
  check("game-glyph-reversi",
    "every summit rank is beaten, priced tight, legal to the last disc, and worth a star",
    benchProblems.length === 0, benchProblems.join(" | "));

  /* ---- the page: the real init path, the picker, the names ----
   * The stub DOM parses none of the game-panel markup, so the boot stages
   * a fresh set of the module's own pads (the way the echo gate stages
   * its panel) and boots the module exactly once through its real init
   * path; the assertion is that the boot runs clean and the campaign
   * picker comes out holding all thirty ranks in order, the summit's
   * option labels resolved rather than keyed. */
  const doc = env.document;
  ["revCanvas", "revYou", "revAi", "revTime", "revResult", "revNewBtn",
    "revBest", "revLevelSel"].forEach((id) => {
    const stale = doc.getElementById(id);
    if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
  });
  const makePad = (id, tag) => {
    const el = doc.createElement(tag || "div");
    el.id = id;
    doc.body.appendChild(el);
    return el;
  };
  makePad("revCanvas", "canvas");
  makePad("revYou");
  makePad("revAi");
  makePad("revTime");
  makePad("revResult");
  makePad("revNewBtn", "button");
  makePad("revBest");
  const select = makePad("revLevelSel", "select");
  let bootError = null;
  try {
    App.initGlyphReversiGame();
  } catch (error) {
    bootError = error && error.message;
  }
  const options = Array.from(select.querySelectorAll("option"));
  const pickerProblems = [];
  if (bootError) pickerProblems.push("boot threw: " + bootError);
  if (typeof App.quietResetGlyphReversi !== "function") {
    pickerProblems.push("the boot never reached its reset hook");
  }
  if (options.length !== 30) {
    pickerProblems.push("the picker holds " + options.length + " ranks");
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
  check("game-glyph-reversi",
    "the panel boots through its real init path with the thirty-rank picker",
    pickerProblems.length === 0, pickerProblems.join(" | "));

  /* The tier's names travel with the page: both languages hold a real
   * string and t() never falls back to the raw key. */
  const copyProblems = summit.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-glyph-reversi", "the six summit rank names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
