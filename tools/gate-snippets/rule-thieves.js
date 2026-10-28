"use strict";

/* game-rule-thieves: the deep tier is mated, minimal and unlike anything
 * shipped
 *
 * The module's own horizon eval answers a leaf with a mate-shaped guess - it
 * will call a defensible position lost - so this gate trusts only an exact
 * search: terminal values straight off the module's own ruleMoves/ruleApply/
 * terminal table, alpha-beta with a bound-typed transposition table (a cached
 * narrow-window value is a bound, never an answer), iterative deepening from
 * ply one. That proves each deep opening's par is a real forced win AND that
 * no faster win exists, in about a minute of honest arithmetic. Around it sit
 * the shape checks: every opening distinct, star bands derived from the par,
 * the deep pars past anything the shipped twenty measured, and copy that
 * resolves in both languages. */
module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.ruleLevels;
  const deepIds = ["o21", "o22", "o23", "o24"];
  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });

  check("game-rule-thieves", "the ladder holds twenty-four openings",
    levels.length === 24, String(levels.length));
  check("game-rule-thieves", "every opening id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !byId[id]);
  check("game-rule-thieves", "the deep tier o21-o24 is present",
    missing.length === 0, missing.join(","));
  check("game-rule-thieves", "every opening is a different board",
    new Set(levels.map((level) => JSON.stringify([
      level.obj, level.walls, level.one, level.two, level.tok,
    ]))).size === levels.length, "");

  /* Exact mate prover: terminal-only values, sound transposition table. */
  const WIN = 100000;
  const makeProver = () => {
    const tt = new Map();
    const key = (st) =>
      st.cell.join("") + st.tok.map((tk) => tk.c + "." + tk.o + "." + tk.s).join(",") +
      st.turn + st.lock.join("+") + st.lockFor;
    const rank = (st, m) => {
      if (m.q === st.obj) return 100;
      if (m.k === 2) return 80;
      if (m.k === 3) return 70;
      for (let i = 0; i < st.tok.length; i += 1) {
        if (st.tok[i].c === m.q && st.tok[i].o === 0) return 60;
      }
      return 0;
    };
    const nega = (st, d, alpha, beta) => {
      if (st.over) {
        if (st.over === 3) return 0;
        return st.over === st.turn ? WIN - st.ply : -(WIN - st.ply);
      }
      if (d <= 0) return 0;
      const k = d + "|" + key(st);
      const entry = tt.get(k);
      let a = alpha;
      let b = beta;
      if (entry) {
        if (entry.flag === 0) return entry.value;
        if (entry.flag === 1 && entry.value >= beta) return entry.value;
        if (entry.flag === 2 && entry.value <= alpha) return entry.value;
        if (entry.flag === 1 && entry.value > a) a = entry.value;
        if (entry.flag === 2 && entry.value < b) b = entry.value;
        if (a >= b) return entry.value;
      }
      const moves = App.ruleMoves(st, st.turn);
      moves.sort((x, y) => rank(st, y) - rank(st, x));
      if (!moves.length) return -(WIN - st.ply);
      const aOrig = a;
      let best = -WIN * 4;
      for (let i = 0; i < moves.length; i += 1) {
        const next = App.ruleApply(st, moves[i]);
        if (!next) continue;
        const value = -nega(next, d - 1, -b, -a);
        if (value > best) best = value;
        if (best > a) a = best;
        if (a >= b) break;
      }
      tt.set(k, { flag: best <= aOrig ? 2 : best >= beta ? 1 : 0, value: best });
      return best;
    };
    return (st, maxD) => {
      tt.clear();
      for (let d = 1; d <= maxD; d += 1) {
        const value = nega(st, d, -WIN * 4, WIN * 4);
        if (value > WIN / 2) return WIN - value;
        if (value < -WIN / 2) return -(WIN + value);
      }
      return 0;
    };
  };
  const exactPar = makeProver();

  /* The deep tier is mated for real: a forced win exists, it takes exactly
   * the advertised plies, and the star band is that par in the mover's own
   * move count plus the standing slack of two and five. */
  const deepProblems = [];
  deepIds.forEach((id) => {
    const level = byId[id];
    const measured = exactPar(App.ruleSetup(level), 17);
    if (measured <= 0) {
      deepProblems.push(id + ": no forced win (measured " + measured + ")");
      return;
    }
    const moves = Math.ceil(measured / 2);
    if (measured !== moves * 2 - 1 || moves !== level.starMoves[0] ||
      level.starMoves[1] !== moves + 2 || level.starMoves[2] !== moves + 5) {
      deepProblems.push(id + ": par " + measured + " vs band " + level.starMoves.join("/"));
    }
  });
  check("game-rule-thieves",
    "every deep opening's forced win is real, minimal, and banded from it",
    deepProblems.length === 0, deepProblems.join(" | "));

  /* The tier climbs past everything shipped, and the shipped bands keep the
   * same derived shape they always had. */
  const shipped = levels.filter((level) => !deepIds.includes(level.id));
  const shippedMoves = shipped.map((level) => level.starMoves[0]);
  const deepMoves = deepIds.map((id) => byId[id].starMoves[0]);
  check("game-rule-thieves",
    "the deep tier asks more moves than any shipped opening",
    Math.min.apply(null, deepMoves) > Math.max.apply(null, shippedMoves),
    "shipped max " + Math.max.apply(null, shippedMoves) + " vs deep " +
      deepIds.map((id) => byId[id].id.slice(1) + ":" + byId[id].starMoves[0]).join("/"));
  /* "low" stars need thresholds[0] <= three-star moves <= two-star <= one-star,
   * so a band is a problem when it does not strictly rise (same shape as the
   * glyph-blocks gate). */
  const bandProblems = levels.filter((level) =>
    !(level.starMoves[0] < level.starMoves[1] && level.starMoves[1] < level.starMoves[2]));
  check("game-rule-thieves", "every star band rises for the low scorer",
    bandProblems.length === 0,
    bandProblems.map((level) => level.id).join(","));

  /* The unlock chain is derived, never stored: clearing each opening in order
   * hands the player exactly the next one, all twenty-four times. */
  const chain = App.createCampaign({
    key: "rule-thieves-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: level.starMoves[0], better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-rule-thieves", "the unlock chain walks all twenty-four openings in order",
    walked === 24 && chained && chain.clearedCount() === 24, walked + " first clears");

  /* Copy travels with the module. */
  const copyProblems = deepIds.reduce((acc, id) => {
    ["rltO" + id.slice(1), "rltTwist" + id.slice(1)].forEach((keyName) => {
      if (!(App.I18N && App.I18N.en && App.I18N.en[keyName]) ||
        !(App.I18N && App.I18N.zh && App.I18N.zh[keyName]) ||
        !App.t(keyName) || App.t(keyName) === keyName) acc.push(keyName);
    });
    return acc;
  }, []);
  check("game-rule-thieves", "the four opening names and twists resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
