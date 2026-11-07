"use strict";

/* game-glyph-reversi: the ransom tier is sight past the ceiling, paid for
 * by the reopened tell; the quieting tier is the widest hand the panel has
 * ever shown, paid for by when it stops.
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
 * the forty-rung picker.
 *
 * The quieting tier r31-r40 spends the one lever the ransom never touched:
 * when the shaking stops. `calm` is a disc count - once the board holds
 * that many discs the roll is never taken again and the five-ply brain
 * finishes the game clean - and every shipped hand that shook at all shook
 * from the first disc to the last, so the field is dead weight on rungs
 * one to thirty. The tier ships the widest hand the game has shown (noise
 * 0.24, past r29's 0.18) and closes it sooner every rung, forty discs down
 * to twenty-two, while the price holds at the bench's own measured ten -
 * with the capstone priced at the richest line the bench ever landed on
 * this ladder, twenty-eight. The gate holds the tier to the same currency
 * as the summit: the re-hosted core, the two-ply reference hand, ten
 * paired seeded duels per rank, every rank beaten outright at least once
 * and inside its own band but never freely, every duel legal to the last
 * disc, and a greedy one-ply trap hand that never lands a band anywhere on
 * the tier. The close itself is proved two ways: the seated calm is the
 * authored one - on an instrumented roll the rival stops spending the
 * shake exactly at its own disc count, while the shipped noisy hand still
 * spends it on a nearly full board - and the close is load-bearing, the
 * same ten duels replayed with the calm struck out scoring strictly more
 * wins and a strictly richer mean against every rung on the tier. */

module.exports = function gate(ctx) {
  const { App, env, check, fs, path, root } = ctx;
  const levels = App.glyphReversiLevels;
  const summitIds = ["r25", "r26", "r27", "r28", "r29", "r30"];
  const quietIds = ["r31", "r32", "r33", "r34", "r35", "r36", "r37", "r38", "r39", "r40"];

  /* ---- the ladder and its unlock chain ---- */
  check("game-glyph-reversi", "the ladder holds forty ranks",
    levels.length === 40, String(levels.length));
  check("game-glyph-reversi", "every rank id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const missingSummit = summitIds.filter((id) => !byId[id]);
  check("game-glyph-reversi", "the summit tier r25-r30 is present",
    missingSummit.length === 0, missingSummit.join(","));
  const missingQuiet = quietIds.filter((id) => !byId[id]);
  check("game-glyph-reversi", "the quieting tier r31-r40 is present",
    missingQuiet.length === 0, missingQuiet.join(","));
  check("game-glyph-reversi",
    "the summit closes the shipped thirty and the quieting tier sits behind it",
    summitIds.every((id, i) => levels[24 + i] && levels[24 + i].id === id) &&
      quietIds.every((id, i) => levels[levels.length - 10 + i] && levels[levels.length - 10 + i].id === id),
    "24-29: " + levels.slice(24, 30).map((level) => level.id).join(",") +
      " | tail: " + levels.slice(-10).map((level) => level.id).join(","));

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
  check("game-glyph-reversi", "the unlock chain walks all forty ranks in order",
    walked === 40 && chained && chain.clearedCount() === 40,
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
  const shallower = levels.slice(0, 24).filter((level) => level.depth >= 5);
  check("game-glyph-reversi", "no rung before the summit searches past four plies",
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
  /* The trap hand: a greedy one-ply positional read, no search and no
   * denial - the player the ladder's habits were measured against only
   * when they must never be rewarded. */
  const revTrapPick = (board, player) => {
    const moves = rev.revMoves(board, player);
    if (!moves.length) return -1;
    let best = -Infinity;
    let pick = moves[0];
    for (const m of moves) {
      const v = revReadFor(rev.revApply(board, player, m).board, player);
      if (v > best) {
        best = v;
        pick = m;
      }
    }
    return pick;
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
   * verifies the pass was real: neither side holds a legal move. The
   * player's seat takes the reference hand by default; the trap hands pass
   * their own pick in. */
  const revDuel = (rank, seed, pickFn) => {
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
          ? (pickFn || revRefPick)(b, 1)
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

  /* ---- the quieting tier: when the shaking stops ----
   * Structural first: no rung before the tier carries a calm, the ten author
   * the close strictly falling from forty discs to twenty-two, the hand that
   * closes is the widest the game has shipped (past r29's 0.18) at the
   * summit's own fifth ply, no quieting rung opens early, the bands run
   * downwards with the two-star line half the three-star line and any win
   * worth a star, and the capstone's price is the richest line the bench
   * ever landed on this ladder. */
  const quiet = quietIds.map((id) => byId[id]);
  const preCalm = levels.slice(0, 30).filter((level) =>
    Object.prototype.hasOwnProperty.call(level, "calm"));
  check("game-glyph-reversi",
    "no rung before the quieting tier authors a close - the lever is dead for r1-r30",
    preCalm.length === 0, preCalm.map((level) => level.id).join(","));
  const quietShape = [];
  const CALMS = [40, 38, 36, 34, 32, 30, 28, 26, 24, 22];
  quiet.forEach((level, index) => {
    if (level.calm !== CALMS[index]) {
      quietShape.push(level.id + " closes at " + level.calm + ", not " + CALMS[index]);
    }
    if (level.noise <= 0.18) {
      quietShape.push(level.id + " shakes at " + level.noise + ", no wider than the shipped peak");
    }
    if (level.depth !== 5) {
      quietShape.push(level.id + " searches " + level.depth + " plies");
    }
    if (level.aiFirst) {
      quietShape.push(level.id + " opens early");
    }
    if (level.starMargin[0] <= level.starMargin[1] ||
        level.starMargin[1] <= level.starMargin[2]) {
      quietShape.push(level.id + " bands do not run downwards " +
        level.starMargin.join("/"));
    }
    if (level.id !== "r40" && level.starMargin[0] !== 10) {
      quietShape.push(level.id + " prices its band at " + level.starMargin[0]);
    }
  });
  if (quiet[9].starMargin[0] !== 28) quietShape.push("r40 does not price the richest line");
  check("game-glyph-reversi",
    "the quieting closes the widest shipped hand forty discs down to twenty-two, one rung at a time, at the summit's own ply",
    quietShape.length === 0, quietShape.join(" | "));

  /* The seated close is the authored one, read off the engine's own shake:
   * with the roll rigged to always fire, a rival pick on a board holding
   * fewer discs than the rung's calm spends the roll, the same pick two
   * discs past it spends none - and a shipped noisy hand still spends the
   * roll on a nearly full board, because no shipped hand ever closes. */
  const quietProbe = [];
  const rollCounts = { calls: 0 };
  const riggedRoll = () => {
    rollCounts.calls += 1;
    return 0;
  };
  const startCells = [27, 28, 35, 36];
  /* A synthetic lay holding exactly `discs` discs: the shipped opening four,
   * then the rival's colour on mirrored pairs of the remaining squares. The
   * three pairs that aim at the opening discs stay open - they are the read
   * that keeps a legal rival move on the board at any fullness - and so do
   * the corners, so the probe never seats a dead position. */
  const corridor = [19, 20, 21, 42, 43, 44];
  const quietBoard = (discs) => {
    const board = new Array(64).fill(0);
    board[27] = 2;
    board[28] = 1;
    board[35] = 1;
    board[36] = 2;
    let placed = 4;
    for (let i = 1; i < 32 && placed + 2 <= discs; i += 1) {
      if (i === 7 || startCells.indexOf(i) !== -1 || corridor.indexOf(i) !== -1 ||
          board[i] !== 0 || board[63 - i] !== 0) {
        continue;
      }
      board[i] = 2;
      board[63 - i] = 2;
      placed += 2;
    }
    return board;
  };
  const rollsFor = (rank, discs) => {
    const board = quietBoard(discs);
    rollCounts.calls = 0;
    const real = Math.random;
    Math.random = riggedRoll;
    try {
      const pick = rev.revPick(board, rank);
      if (pick < 0) return -1;
    } finally {
      Math.random = real;
    }
    return rollCounts.calls;
  };
  quiet.forEach((level) => {
    const under = rollsFor(level, level.calm - 2);
    const over = rollsFor(level, level.calm + 2);
    if (under < 1) quietProbe.push(level.id + " never shakes below its calm");
    if (over !== 0) quietProbe.push(level.id + " still shakes past its calm (" + over + ")");
  });
  const noisyShipped = byId.r30;
  const fullBoardRolls = rollsFor(noisyShipped, 54);
  const steadyShipped = rollsFor(plateau, 54);
  if (fullBoardRolls < 1) quietProbe.push("r30 stops shaking on a nearly full board");
  if (steadyShipped !== 0) quietProbe.push("the steady plateau spends a roll");
  check("game-glyph-reversi",
    "the seated calm is the authored one: the shake stops exactly at the rung's own disc count and no shipped hand ever closes",
    quietProbe.length === 0, quietProbe.join(" | "));

  /* The quieting bench: the same ten seeded duels a rung, plus the same
   * stream against a greedy one-ply trap hand, plus one counterfactual
   * bench on the very same seeds with the calm struck out - the tell that
   * never closes. Every rank is beaten outright at least once, lands its
   * own band at least once but never freely, every duel runs legal to the
   * last disc, every outright win earns a star under the game's own
   * starsFor, the trap never lands a band anywhere on the tier, and the
   * close costs the bench its games on every rung. */
  const quietBench = [];
  const bareTell = { noise: 0.24, depth: 5 };
  const bareGames = [];
  for (let s = 1; s <= REV_DUELS; s += 1) {
    bareGames.push(revDuel(bareTell, 91000 + s * 7717));
  }
  const bareMean = bareGames.reduce((sum, game) => sum + game.margin, 0) / REV_DUELS;
  const bareWins = bareGames.filter((game) => game.margin > 0).length;
  quiet.forEach((level) => {
    const games = revGames(level);
    const wins = games.filter((game) => game.margin > 0);
    const price = level.starMargin[0];
    const name = level.id + " calm=" + level.calm + " price=" + price;
    if (!wins.length) {
      quietBench.push(name + " is never beaten outright");
    }
    const landed = wins.filter((game) => game.margin >= price).length;
    if (!landed) {
      quietBench.push(name + " never lands its three-star band");
    }
    if (landed > REV_DUELS / 2) {
      quietBench.push(name + " lands its band in " + landed + " of " +
        REV_DUELS + " games - the price is not tight");
    }
    wins.forEach((game) => {
      if (App.starsFor(game.margin, level.starMargin, "high") <= 0) {
        quietBench.push(name + " a " + game.margin + "-disc win earns no star");
      }
    });
    games.forEach((game) => {
      if (!game.legalEnd) {
        quietBench.push(name + " a duel ended other than on a full board or a real double pass");
      }
    });
    const trapGames = [];
    for (let s = 1; s <= REV_DUELS; s += 1) {
      trapGames.push(revDuel(level, 91000 + s * 7717, revTrapPick));
    }
    trapGames.forEach((game) => {
      if (!game.legalEnd) {
        quietBench.push(name + " the trap duel ran illegal");
      }
      if (game.margin >= price) {
        quietBench.push(name + " the greedy trap lands the band at " + game.margin);
      }
    });
    const mean = games.reduce((sum, game) => sum + game.margin, 0) / REV_DUELS;
    if (!(bareMean > mean) || !(bareWins > wins.length)) {
      quietBench.push(name + " the close is not load-bearing (mean " +
        mean.toFixed(1) + " vs bare " + bareMean.toFixed(1) + ", wins " +
        wins.length + " vs bare " + bareWins + ")");
    }
  });
  check("game-glyph-reversi",
    "every quieting rank is beaten, priced at the bench's own line, legal to the last disc, trap-proof, and paid for by the close (" +
      "bare tell " + bareWins + " wins at " + bareMean.toFixed(1) + ")",
    quietBench.length === 0, quietBench.join(" | "));

  /* ---- the page: the real init path, the picker, the names ----
   * The stub DOM parses none of the game-panel markup, so the boot stages
   * a fresh set of the module's own pads (the way the echo gate stages
   * its panel) and boots the module exactly once through its real init
   * path; the assertion is that the boot runs clean and the campaign
   * picker comes out holding all forty ranks in order, the summit's and
   * the quieting's option labels resolved rather than keyed. */
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
  if (options.length !== 40) {
    pickerProblems.push("the picker holds " + options.length + " ranks");
  }
  options.forEach((option, index) => {
    if (option.value !== levels[index].id) {
      pickerProblems.push("option " + index + " is " + option.value);
    }
  });
  summit.concat(quiet).forEach((level) => {
    const option = options[levels.indexOf(level)];
    if (!option || option.textContent.indexOf(App.t(level.labelKey)) === -1 ||
        option.textContent.indexOf(level.labelKey) !== -1) {
      pickerProblems.push(level.id + " picker label unresolved");
    }
  });
  check("game-glyph-reversi",
    "the panel boots through its real init path with the forty-rank picker",
    pickerProblems.length === 0, pickerProblems.join(" | "));

  /* The tiers' names travel with the page: both languages hold a real
   * string and t() never falls back to the raw key. */
  const copyProblems = summit.concat(quiet).map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-glyph-reversi",
    "the sixteen summit and quieting rank names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
