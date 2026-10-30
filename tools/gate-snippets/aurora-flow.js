"use strict";

/* game-aurora-flow: every ribbon is proven, and the summit is the hard tier
 *
 * The forge module carries the panel's exact rules in a complete backtracking
 * solver: a ribbon may not step on another ribbon's cells, nor on another
 * pair's endpoint. A board ships only when that solver re-proves it from the
 * pairs alone, and the ladder is laid out in the order the solver measured.
 * This gate re-proves the whole shipped ladder through that same solver,
 * holds the deep tier to its design brief - a grid no earlier rung opened,
 * the full ribbon deck, a weave longer than the shipped ceiling - and then
 * holds the summit tier f25-f30 to its own: the dial is the weave, the
 * solver's measured answer, climbing strictly rung over rung from just past
 * the deep ceiling of 94 inked cells into an eleventh row no earlier rung
 * opened. The panel is the lever, and the gate proves it two ways: re-deal
 * the deep tier's own ten-across panel through the forge's own screen and
 * nothing re-solves above its 94-cell ceiling, while every summit rung needs
 * more ribbon than that ceiling and the biggest weaves could not physically
 * fit the hundred-cell panel at all; and the star bands stay cut at the
 * shipped pace, so the summit's own lines quote its own measured weave. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const aurora = require(path.join(root, "tools", "aurora-forge.js"));
  const auroLevels = aurora.loadLevels();
  const summitIds = ["f25", "f26", "f27", "f28", "f29", "f30"];

  check("game-aurora-flow", "the ladder holds thirty boards",
    auroLevels.length === 30, String(auroLevels.length));
  check("game-aurora-flow", "every board id is distinct",
    new Set(auroLevels.map((l) => l.id)).size === auroLevels.length);
  check("game-aurora-flow", "the ids run f1 through f30 in order",
    auroLevels.every((l, index) => l.id === "f" + (index + 1)),
    auroLevels.map((l) => l.id).join(","));
  const summitMissing = summitIds.filter((id) => !auroLevels.some((l) => l.id === id));
  check("game-aurora-flow", "the summit tier f25-f30 is present in order",
    summitMissing.length === 0 &&
      summitIds.every((id, index) =>
        auroLevels.findIndex((l) => l.id === id) >
          (index === 0 ? -1 : auroLevels.findIndex((l) => l.id === summitIds[index - 1]))),
    summitMissing.join(",") || "ordered");

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

  /* The forged half of the ladder (f11-f30) sits in the order the solver
   * measured, so no rung there may need less ribbon than the one before it. */
  const auroForged = auroLevels.filter((l) => Number(l.id.slice(1)) >= 11);
  check("game-aurora-flow", "the forged ladder only climbs: no rung needs less ribbon than the one before",
    auroForged.every((l, index) => index === 0 || ink(l) >= ink(auroForged[index - 1])),
    auroForged.map((l) => l.id + ":" + ink(l)).join(" "));

  const auroDeep = auroForged.filter((l) => ["f21", "f22", "f23", "f24"].includes(l.id));
  const auroF20 = auroLevels.find((l) => l.id === "f20");
  const auroF24 = auroLevels.find((l) => l.id === "f24");
  const auroShallow = auroLevels.filter((l) =>
    !["f21", "f22", "f23", "f24"].concat(summitIds).includes(l.id));
  check("game-aurora-flow", "the deep tier is the hard tier of the shipped half: every rung out-inks the shipped ceiling",
    auroDeep.length === 4 && auroDeep.every((l) => ink(l) > ink(auroF20)),
    auroDeep.map((l) => l.id + ":" + ink(l)).join(" ") + " vs f20:" + ink(auroF20));
  check("game-aurora-flow", "the deep tier opens the grid no earlier rung touched",
    auroDeep.every((l) => l.size === 10) && auroShallow.every((l) => l.size <= 9),
    auroDeep.map((l) => l.size).join("/"));
  check("game-aurora-flow", "the deep tier fields the full ribbon deck the colour table covers",
    auroDeep.every((l) => l.pairs.length >= 15) &&
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

  /* ---- the summit: the weave is the dial, the eleventh row is the lever -- */
  const auroSummit = summitIds.map((id) => auroLevels.find((l) => l.id === id));
  const auroSummitProblems = [];
  if (auroSummit.some((l) => !l)) {
    auroSummitProblems.push("a summit rung is missing");
  } else {
    if (!auroSummit.every((l) => l.size === 11) ||
        !auroLevels.slice(0, 24).every((l) => l.size <= 10)) {
      auroSummitProblems.push("the summit does not open an eleventh row no earlier rung touched");
    }
    /* Strictly more ribbon rung over rung, and strictly more than the deep
     * tier's own ceiling - the tier's monotone climb in the solver's own
     * currency. */
    let prev = ink(auroF24);
    auroSummit.forEach((l) => {
      if (!(ink(l) > prev)) {
        auroSummitProblems.push(l.id + " needs " + ink(l) +
          " ribbon cells, not more than the rung before it (" + prev + ")");
      }
      prev = ink(l);
    });
    if (!(auroSummit[5].pairs.length === 16)) {
      auroSummitProblems.push("f30 does not field the full sixteen-ribbon deck");
    }
  }
  check("game-aurora-flow",
    "the summit opens the eleventh row and out-inks the deep ceiling rung over rung (" +
      auroSummit.map((l) => l.id + ":" + ink(l)).join(", ") + " vs f24:" + ink(auroF24) + ")",
    auroSummitProblems.length === 0, auroSummitProblems.join(" | "));

  /* The panel is the lever, priced by re-deal: the forge's own screen, run
   * against the deep tier's ten-across panel with the deep tier's own
   * construction, never re-solves above its 94-cell ceiling - while the
   * summit's rungs all need more ribbon than that, and the biggest weaves
   * could not physically fit the hundred-cell panel at all. */
  const reDeals = aurora.summitCandidates(
    { id: "probe", size: 10, seeds: 60, keep: 12, coverMin: 92, coverMax: 100, seedBase: 317 },
    317);
  check("game-aurora-flow",
    "re-deal the deep tier's own panel and the screen never re-solves above its 94-cell ceiling (" +
      reDeals.length + " proven re-deals, best " +
      (reDeals.length ? Math.max.apply(null, reDeals.map((c) => c.ink)) : "-") + " cells)",
    reDeals.length >= 8 && reDeals.every((c) => c.ink <= 94),
    reDeals.map((c) => c.ink).join(","));
  const oversize = auroSummit.filter((l) => ink(l) > 100);
  check("game-aurora-flow",
    "the summit weaves past a hundred cells could not physically fit the deep panel (" +
      oversize.map((l) => l.id + ":" + ink(l)).join(", ") + " against its hundred cells)",
    oversize.length >= 1 && oversize.every((l) => ink(l) > 100),
    oversize.map((l) => l.id).join(",") || "none past 100");

  check("game-aurora-flow", "the summit three-star lines sit above the deep ceiling",
    auroSummit.every((l) => l.starTimes[0] > auroF24.starTimes[0]),
    auroSummit.map((l) => l.starTimes[0]).join("/") + " vs " + auroF24.starTimes[0]);

  /* The deep and summit names travel with the module: both languages hold a
   * real string, and t() never falls back to the raw key. */
  check("game-aurora-flow", "the deep and summit names resolve in both languages",
    ["auroL21", "auroL22", "auroL23", "auroL24",
      "auroL25", "auroL26", "auroL27", "auroL28", "auroL29", "auroL30"].every((key) =>
      App.I18N && App.I18N.en && App.I18N.en[key] && App.I18N.zh && App.I18N.zh[key] &&
      App.t(key) !== key),
    "a tier label fell back to its key");

  /* The unlock chain is derived, never stored, so it scales with the ladder:
   * clearing each rung in order must hand the player exactly the next one,
   * all thirty times, with nothing left locked behind the last. */
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
  check("game-aurora-flow", "the unlock chain walks all thirty rungs in order",
    auroWalked === 30 && auroChained && auroChain.clearedCount() === 30,
    auroWalked + " first clears");
};
