"use strict";

/* game-ember-sticks: perfect play wins every table, and the endgame tier
 * narrows the dawdle
 *
 * The game's own perfect-play functions are the solver: nimBestMove answers
 * every position, a brute-force oracle proves the opening rows a first-
 * player win, and a memoised turn count walks every winning line to measure
 * the fastest win and the dawdling one. This gate re-proves the whole
 * endgame tier through those functions, then holds the new tier to its
 * design brief: the three-star line stays pinned at the engine's own line,
 * the win-by-strategy proof stays intact, and the dawdle margin - the room
 * between the line and the longest winning line - narrows rung over rung
 * from the widest felt's eleven of your turns down to one.
 *
 * The margin is priced by twins and ablations: the full staircase s25 grew
 * from owns the margin s25 misses by one step, seven even twos dawdle to
 * the same board-length as s29 from a line one turn shorter, the six
 * stair's margin falls from eight to one the moment the misere rule comes
 * on, and the shapes one stone from the shipped ones lose outright - the
 * oracle proves the win is the geometry's own, not an accident. */
module.exports = function gate(ctx) {
  const { App, check, fs, path, root } = ctx;
  const src = fs.readFileSync(
    path.join(root, "assets", "app", "game-ember-sticks.js"), "utf8",
  ).replace(/^﻿/, "");
  const slice = src.slice(src.indexOf("var nimLevels"), src.indexOf("function initNimGame"));
  const nim = new Function(slice + "\nreturn { nimBestMove, nimTotal, nimLevels };")();
  const levels = nim.nimLevels;
  const summitIds = ["s25", "s26", "s27", "s28", "s29", "s30"];

  /* ---- ladder shape ---- */
  check("game-ember-sticks", "the sticks ladder holds thirty tables",
    levels.length === 30, String(levels.length));
  check("game-ember-sticks", "every table id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length);
  check("game-ember-sticks", "the ids run s1 through s30 in order",
    levels.every((level, index) => level.id === "s" + (index + 1)),
    levels.map((level) => level.id).join(","));
  const summitMissing = summitIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-ember-sticks", "the endgame tier s25-s30 is present in order",
    summitMissing.length === 0 &&
      summitIds.every((id, index) => levels.findIndex((level) => level.id === id) >
        (index === 0 ? -1 : levels.findIndex((level) => level.id === summitIds[index - 1]))),
    summitMissing.join(",") || "ordered");
  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });

  /* ---- the game's own solver: oracle, turn range, shipped line ---- */
  const oracleMemo = { normal: {}, misere: {} };
  const oracle = (rows, misere) => {
    const memo = misere ? oracleMemo.misere : oracleMemo.normal;
    const wins = (state) => {
      if (nim.nimTotal(state) === 0) return misere;
      const key = state.join(",");
      if (memo[key] !== undefined) return memo[key];
      let result = false;
      for (let row = 0; row < state.length && !result; row += 1) {
        for (let keep = 0; keep < state[row] && !result; keep += 1) {
          const next = state.slice();
          next[row] = keep;
          if (!wins(next)) result = true;
        }
      }
      memo[key] = result;
      return result;
    };
    return wins(rows.slice());
  };
  const turnRange = (rows, misere) => {
    const memo = {};
    const solve = (state, mode) => {
      if (nim.nimTotal(state) === 0) return 0;
      const key = state.join(",") + mode;
      if (memo[key] !== undefined) return memo[key];
      let best = mode === "min" ? Infinity : -Infinity;
      for (let row = 0; row < state.length; row += 1) {
        for (let keep = 0; keep < state[row]; keep += 1) {
          const next = state.slice();
          next[row] = keep;
          if (nim.nimTotal(next) === 0) {
            if (misere) continue;
            best = mode === "min" ? Math.min(best, 1) : Math.max(best, 1);
            continue;
          }
          const reply = nim.nimBestMove(next, misere);
          const back = next.slice();
          back[reply[0]] = reply[1];
          const rest = solve(back, mode);
          if (rest === null) continue;
          best = mode === "min" ? Math.min(best, 1 + rest) : Math.max(best, 1 + rest);
        }
      }
      const out = best === Infinity || best === -Infinity ? null : best;
      memo[key] = out;
      return out;
    };
    return { min: solve(rows.slice(), "min"), max: solve(rows.slice(), "max") };
  };
  const shippedLine = (rows, misere) => {
    const board = rows.slice();
    let turns = 0;
    let won = null;
    while (nim.nimTotal(board) > 0 && turns < 200) {
      const move = nim.nimBestMove(board, misere);
      board[move[0]] = move[1];
      turns += 1;
      if (nim.nimTotal(board) === 0) { won = !misere; break; }
      const reply = nim.nimBestMove(board, misere);
      board[reply[0]] = reply[1];
      if (nim.nimTotal(board) === 0) { won = misere; break; }
    }
    return { won: won, turns: turns };
  };
  const soundOnPaths = (rows, misere) => {
    const seen = {};
    const walk = (state, playerToMove) => {
      if (nim.nimTotal(state) === 0) return true;
      const key = state.join(",") + (playerToMove ? "p" : "a");
      if (seen[key]) return true;
      seen[key] = true;
      if (playerToMove) {
        for (let row = 0; row < state.length; row += 1) {
          for (let keep = 0; keep < state[row]; keep += 1) {
            const next = state.slice();
            next[row] = keep;
            if (nim.nimTotal(next) === 0) continue;
            if (!walk(next, false)) return false;
          }
        }
        return true;
      }
      const move = nim.nimBestMove(state, misere);
      if (!move) return false;
      const next = state.slice();
      next[move[0]] = move[1];
      if (nim.nimTotal(next) === 0) return true;
      if (oracle(state, misere) && oracle(next, misere)) return false;
      return walk(next, true);
    };
    return walk(rows.slice(), true);
  };

  /* ---- every rung re-proves through the solver ---- */
  const measured = {};
  ["s24"].concat(summitIds).forEach((id) => {
    const level = byId[id];
    const range = turnRange(level.rows, level.misere);
    const line = shippedLine(level.rows, level.misere);
    measured[id] = { range: range, line: line };
    const label = `${id} [${level.rows.join(",")}] ${level.misere ? "misere" : "normal"}`;
    check("game-ember-sticks", `${label} bands rise for the low scorer`,
      level.starTurns[0] <= level.starTurns[1] && level.starTurns[1] <= level.starTurns[2],
      level.starTurns.join("/"));
    check("game-ember-sticks", `${label} is a first-player win`,
      oracle(level.rows, level.misere) === true);
    check("game-ember-sticks", `${label} the shipped perfect line wins the table`,
      line.won === true, `turns ${line.turns}`);
    check("game-ember-sticks", `${label} the three-star turn holds the optimal line`,
      line.turns <= level.starTurns[0], `${line.turns} vs ${level.starTurns[0]}`);
    check("game-ember-sticks", `${label} the three-star turn is not a free ride`,
      level.starTurns[0] < range.max, `${level.starTurns[0]} vs max ${range.max}`);
    check("game-ember-sticks", `${label} the two-star turn is reachable without perfect play`,
      range.min < level.starTurns[1], `${range.min} vs ${level.starTurns[1]}`);
    check("game-ember-sticks", `${label} a dawdling win stays inside the one-star turn`,
      range.max <= level.starTurns[2], `${range.max} vs ${level.starTurns[2]}`);
    check("game-ember-sticks", `${label} the game's own move stays sound along every play line`,
      soundOnPaths(level.rows, level.misere) === true);
  });

  /* ---- the endgame tier is monotone in the solver's own currency ---- */
  /* The dawdle margin - one-star room minus the three-star line, which is
   * the longest winning line minus the engine's own - falls rung over rung
   * down the tier, from under the widest felt's, and the longest win itself
   * shortens with it: the felt stops widening and the dawdle dies. */
  const marginOf = (id) =>
    measured[id].range.max - measured[id].line.turns;
  const marginProblems = [];
  let prevMargin = marginOf("s24");
  let prevMax = measured.s24.range.max;
  summitIds.forEach((id) => {
    const margin = marginOf(id);
    if (!(margin < prevMargin)) {
      marginProblems.push(id + " dawdle margin " + margin +
        " does not narrow on the rung before it (" + prevMargin + ")");
    }
    if (!(measured[id].range.max < prevMax)) {
      marginProblems.push(id + " longest win " + measured[id].range.max +
        " does not shorten on the rung before it (" + prevMax + ")");
    }
    prevMargin = margin;
    prevMax = measured[id].range.max;
  });
  check("game-ember-sticks",
    "the endgame tier's dawdle margin narrows rung over rung from the widest felt's (" +
      summitIds.map((id) => id + " " + marginOf(id)).join(", ") + " vs s24 " + marginOf("s24") + ")",
    marginProblems.length === 0, marginProblems.join(" | "));
  check("game-ember-sticks",
    "the three-star line stays pinned at the engine's own line down the whole tier",
    summitIds.every((id) => measured[id].line.turns === byId[id].starTurns[0]),
    summitIds.map((id) => id + ":" + measured[id].line.turns).join(","));

  /* ---- the margin is priced by twins and ablations ---- */
  const twinProblems = [];
  /* s24's full staircase owns the margin s25 misses by one step, on the
   * same three-star line. */
  if (!(marginOf("s24") > marginOf("s25") &&
      measured.s24.line.turns === measured.s25.line.turns)) {
    twinProblems.push("s24/s25: margins " + marginOf("s24") + " vs " + marginOf("s25") +
      " on lines " + measured.s24.line.turns + " vs " + measured.s25.line.turns);
  }
  /* Seven even twos dawdle to s29's board-length from a shorter line - the
   * odd three is what burns the spare turn. */
  const sevens = turnRange([2, 2, 2, 2, 2, 2, 2], false);
  const sevensLine = shippedLine([2, 2, 2, 2, 2, 2, 2], false);
  if (!(sevens.max === measured.s29.range.max && sevensLine.turns < measured.s29.line.turns)) {
    twinProblems.push("seven twos: max " + sevens.max + " line " + sevensLine.turns +
      " vs s29 max " + measured.s29.range.max + " line " + measured.s29.line.turns);
  }
  /* The six stair's margin falls from eight to one the moment the misere
   * rule comes on - the rule, not the shape, closes the dawdle. */
  const sixStair = turnRange([2, 3, 4, 5, 6, 7], false);
  const sixStairLine = shippedLine([2, 3, 4, 5, 6, 7], false);
  const normalMargin = sixStair.max - sixStairLine.turns;
  if (!(normalMargin > marginOf("s30"))) {
    twinProblems.push("six stair: normal margin " + normalMargin +
      " vs misere margin " + marginOf("s30"));
  }
  check("game-ember-sticks",
    "the dawdle margin is priced by twins: the family neighbours own wider margins on the same lines",
    twinProblems.length === 0, twinProblems.join(" | "));

  const lossProblems = [];
  [[[3, 3, 3, 3, 3, 3], "s28's threes matched"],
   [[2, 2, 2, 2, 2, 2, 2, 2], "s29's twos made even"],
   [[1, 2, 3, 4, 5, 6, 7], "the six stair stretched to seven"]].forEach((pair) => {
    if (oracle(pair[0], false) !== false) {
      lossProblems.push("[" + pair[0].join(",") + "] (" + pair[1] + ") is not a loss");
    }
  });
  check("game-ember-sticks",
    "the shipped shapes sit one stone from losing: matched threes, even twos and the seven-step stair all lose",
    lossProblems.length === 0, lossProblems.join(" | "));

  /* ---- the names travel with the module ---- */
  const copyProblems = summitIds.map((id) => byId[id].labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-ember-sticks", "the six endgame names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* ---- the unlock chain is derived, never stored ---- */
  const chain = App.createCampaign({
    key: "ember-sticks-gate-chain",
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
  check("game-ember-sticks", "the unlock chain walks all thirty tables in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
