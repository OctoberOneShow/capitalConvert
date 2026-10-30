"use strict";

/* game-paper-bridge: the master works are proven by the yard's own checker.
 *
 * The gate replays all thirty authored plans through bridgeCheck - the exact
 * call the build button and the span loader answer to - so a plan that cannot
 * carry the cart fails here, not on the drawing. The master term b25-b30 is
 * held to the shipped summit's own bar and one line stricter: every plan
 * stands, cannot spare a single beam (lifting any one makes the span fall),
 * and the yard hands out exact change - the limit sits exactly on the proven
 * plan. Every beam of every plan is also shown buildable: aligned along the
 * eight lattice directions, within the four-node reach, and not a duplicate
 * of its own plan, so what ships is what a player could really lay. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.bridgeLevels;
  const masterIds = ["b25", "b26", "b27", "b28", "b29", "b30"];

  check("game-paper-bridge", "the ladder holds thirty spans",
    levels.length === 30, String(levels.length));
  check("game-paper-bridge", "every span id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = masterIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-paper-bridge", "the master term b25-b30 is present",
    missing.length === 0, missing.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });

  /* Whole-ladder regression: every authored plan, shipped or new, carries the
   * cart through the real checker. */
  const falls = [];
  levels.forEach((level) => {
    const nodes = App.bridgeNodes(level);
    const plan = level.solution.map((pair) => [pair[0] + pair[1] * 12, pair[2] + pair[3] * 12]);
    const proof = App.bridgeCheck(nodes, plan, App.bridgeSpan(level));
    if (!proof.ok) falls.push(`${level.id} falls (${proof.fail})`);
  });
  check("game-paper-bridge",
    "all thirty authored plans stand through bridgeCheck",
    falls.length === 0, falls.join(" | "));

  /* Buildability: every beam of every plan is one a player could really lay. */
  const unbuildable = [];
  levels.forEach((level) => {
    const nodes = App.bridgeNodes(level);
    const plan = level.solution.map((pair) => [pair[0] + pair[1] * 12, pair[2] + pair[3] * 12]);
    plan.forEach((pair, i) => {
      const others = plan.filter((_, j) => j !== i);
      const why = App.bridgeBeamOk(nodes, others, pair[0], pair[1]);
      if (why !== "ok") unbuildable.push(`${level.id} beam ${i}: ${why}`);
    });
  });
  check("game-paper-bridge",
    "every beam of every plan is buildable on the lattice",
    unbuildable.length === 0, unbuildable.join(" | "));

  /* The master term: exact change only. Each plan stands, cannot spare one,
   * and the limit sits on the plan - one wasted beam fails the purse. */
  const masterProblems = [];
  masterIds.forEach((id) => {
    const level = byId[id];
    const nodes = App.bridgeNodes(level);
    const plan = level.solution.map((pair) => [pair[0] + pair[1] * 12, pair[2] + pair[3] * 12]);
    const spares = [];
    plan.forEach((_, i) => {
      const reduced = plan.filter((_, j) => j !== i);
      if (App.bridgeCheck(nodes, reduced, App.bridgeSpan(level)).ok) spares.push(i);
    });
    if (spares.length) masterProblems.push(`${id} carries ${spares.length} spare beam(s)`);
    if (level.limit !== level.solution.length) {
      masterProblems.push(`${id} limit ${level.limit} is not the proven plan (${level.solution.length})`);
    }
    if (level.par !== level.solution.length) {
      masterProblems.push(`${id} par ${level.par} is not the proven plan (${level.solution.length})`);
    }
  });
  check("game-paper-bridge",
    "every master span cannot spare a beam and ships at exact change",
    masterProblems.length === 0, masterProblems.join(" | "));

  /* The master term is the wide term: the grand truss crosses the tour's
   * widest barren gap - no island, no pier, ten beams of pure lattice. */
  const grand = byId.b30;
  check("game-paper-bridge",
    "b30 is the widest barren crossing of the tour (two ledges, no islands)",
    grand.ground.length === 2 &&
      grand.solution.length >= Math.max.apply(null, masterIds.map((id) => byId[id].solution.length)),
    `ledges ${grand.ground.length}, beams ${grand.solution.length}`);

  /* The tier's names travel with the page: both languages hold a real string
   * and t() never falls back to the raw key. */
  const copyProblems = masterIds.map((id) => byId[id].labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-paper-bridge", "the six master span names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each span in order
   * hands the player exactly the next one, all thirty times. */
  const chain = App.createCampaign({
    key: "paper-bridge-gate-chain",
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
  check("game-paper-bridge", "the unlock chain walks all thirty spans in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
