"use strict";

/* game-aurora-flow: every ribbon is proven, and the deep tier is the hard tier
 *
 * The forge module carries the panel's exact rules in a complete backtracking
 * solver: a ribbon may not step on another ribbon's cells, nor on another
 * pair's endpoint. A board ships only when that solver re-proves it from the
 * pairs alone, and the ladder is laid out in the order the solver measured.
 * This gate re-proves the whole shipped ladder through that same solver, then
 * holds the deep tier to its design brief: a grid no earlier rung opened, the
 * most ribbons on the ladder, a weave longer than the shipped ceiling, and
 * star bands cut at the same measured pace the forged tier ships at. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const aurora = require(path.join(root, "tools", "aurora-forge.js"));
  const auroLevels = aurora.loadLevels();

  check("game-aurora-flow", "the ladder holds twenty-four boards",
    auroLevels.length === 24, String(auroLevels.length));
  check("game-aurora-flow", "every board id is distinct",
    new Set(auroLevels.map((l) => l.id)).size === auroLevels.length);
  check("game-aurora-flow", "the ids run f1 through f24 in order",
    auroLevels.every((l, index) => l.id === "f" + (index + 1)),
    auroLevels.map((l) => l.id).join(","));

  /* The solver's own answer, re-run here at the shipped step cap - the proof
   * number the ladder is ordered by. The forge streams its own mulberry
   * generator, but the seeded swap keeps the run deterministic wherever the
   * booted app reaches for Math.random. */
  const auroSeeded = (seed, fn) => {
    const real = Math.random;
    let state = seed >>> 0;
    Math.random = () => {
      state = (Math.imul(state, 1103515245) + 12345) >>> 0;
      return state / 4294967296;
    };
    try { return fn(); } finally { Math.random = real; }
  };
  const measured = {};
  auroSeeded(41027, () => {
    auroLevels.forEach((level) => {
      const report = aurora.checkBoard(level);
      measured[level.id] = report.measure;
      check("game-aurora-flow",
        `${level.id}: the solver re-proves the board from the pairs alone`,
        report.problems.length === 0 && typeof report.measure.cells === "number",
        report.problems.length ? report.problems.join("; ") : report.measure.cells + " ribbon cells");
    });
  });
  const ink = (level) => measured[level.id].cells || 0;

  /* The forged half of the ladder (f11-f24) sits in the order the solver
   * measured, so no rung there may need less ribbon than the one before it. */
  const auroForged = auroLevels.filter((l) => Number(l.id.slice(1)) >= 11);
  check("game-aurora-flow", "the forged ladder only climbs: no rung needs less ribbon than the one before",
    auroForged.every((l, index) => index === 0 || ink(l) >= ink(auroForged[index - 1])),
    auroForged.map((l) => l.id + ":" + ink(l)).join(" "));

  const auroDeep = auroForged.filter((l) => ["f21", "f22", "f23", "f24"].includes(l.id));
  const auroF20 = auroLevels.find((l) => l.id === "f20");
  const auroShallow = auroLevels.filter((l) => !["f21", "f22", "f23", "f24"].includes(l.id));
  check("game-aurora-flow", "the deep tier is the hard tier: every rung out-inks the shipped ceiling",
    auroDeep.length === 4 && auroDeep.every((l) => ink(l) > ink(auroF20)),
    auroDeep.map((l) => l.id + ":" + ink(l)).join(" ") + " vs f20:" + ink(auroF20));
  check("game-aurora-flow", "the deep tier opens the grid no earlier rung touched",
    auroDeep.every((l) => l.size === 10) && auroShallow.every((l) => l.size <= 9),
    auroDeep.map((l) => l.size).join("/"));
  check("game-aurora-flow", "the deep tier carries the most ribbons on the ladder",
    auroDeep.every((l) => auroShallow.every((m) => m.pairs.length <= l.pairs.length)),
    auroDeep.map((l) => l.id + ":" + l.pairs.length).join(" "));
  check("game-aurora-flow", "every deep ribbon keeps its own colour",
    auroLevels.every((l) => l.pairs.length <= 16),
    auroLevels.map((l) => l.pairs.length).join(","));

  /* Bands: every board widens step for step, the forged rungs quote the
   * solver's own measure at the shipped pace, and the deep tier's three-star
   * line sits above the second tier's ceiling. */
  check("game-aurora-flow", "the star bands only widen inside a board",
    auroLevels.every((l) => l.starTimes[0] < l.starTimes[1] && l.starTimes[1] < l.starTimes[2]),
    auroLevels.map((l) => l.starTimes.join("/")).join(" "));
  check("game-aurora-flow", "the forged bands quote the solver's measure at the shipped pace",
    auroForged.every((l) =>
      l.starTimes[0] === Math.round(ink(l) * 1.02) &&
      l.starTimes[1] === Math.round(l.starTimes[0] * 1.55) &&
      l.starTimes[2] === Math.round(l.starTimes[0] * 2.15)),
    auroForged.map((l) => l.id + ":" + l.starTimes.join("/")).join(" "));
  check("game-aurora-flow", "the deep tier three-star line sits above the shipped ceiling",
    auroDeep.every((l) => l.starTimes[0] > auroF20.starTimes[0]),
    auroDeep.map((l) => l.starTimes[0]).join("/") + " vs " + auroF20.starTimes[0]);

  /* The deep tier's names travel with the module: both languages hold a real
   * string, and t() never falls back to the raw key. */
  check("game-aurora-flow", "the deep tier names resolve in both languages",
    ["auroL21", "auroL22", "auroL23", "auroL24"].every((key) =>
      App.I18N && App.I18N.en && App.I18N.en[key] && App.I18N.zh && App.I18N.zh[key] &&
      App.t(key) !== key),
    "a tier label fell back to its key");

  /* The unlock chain is derived, never stored, so it scales with the ladder:
   * clearing each rung in order must hand the player exactly the next one,
   * all twenty-four times, with nothing left locked behind the last. */
  const auroChain = App.createCampaign({
    key: "aurora-flow-gate-chain",
    levels: auroLevels.map((l) => ({ id: l.id, labelKey: l.labelKey })),
  });
  let auroWalked = 0;
  let auroChained = true;
  auroLevels.forEach((level, index) => {
    const outcome = auroChain.record(level.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) auroWalked += 1;
    const expected = index + 1 < auroLevels.length ? auroLevels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) auroChained = false;
  });
  check("game-aurora-flow", "the unlock chain walks all twenty-four rungs in order",
    auroWalked === 24 && auroChained && auroChain.clearedCount() === 24,
    auroWalked + " first clears");
};
