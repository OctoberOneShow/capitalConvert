"use strict";

/* game-pocket-photographer: the last ponds are measured, and their seeds are
 * chosen by the house's own law.
 *
 * The last ponds pph25-pph30 each load one dial to an extreme the tour had
 * only ever brushed - six of one bird on the water, the tightest behaviour
 * window of the deep tiers, the smallest glass, the six-frame roll for four
 * species, the strictest bar pair, and the capstone that carries three at
 * once. The gate holds every pond to the module's own proof: the scripted
 * line must win inside the roll and reach the pond's measured band, the
 * bands must be the module's own load-time measurement, and the shipped
 * seed law must hold - at least half of the twenty-four rounds a pond
 * actually deals (seed + round x 131) reach their own band. The tier's
 * best measured album tops every shipped band, no two last ponds share a
 * dial shape, and the single flock deals more of one bird than any earlier
 * pond. Names travel in both languages and the unlock chain walks all
 * thirty ponds in order.
 */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.photoLevels || [];
  const summitIds = ["pph25", "pph26", "pph27", "pph28", "pph29", "pph30"];

  check("game-pocket-photographer", "the tour holds thirty ponds",
    levels.length === 30, String(levels.length));
  check("game-pocket-photographer", "every pond id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = summitIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-pocket-photographer", "the last ponds pph25-pph30 are present",
    missing.length === 0, missing.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const summit = summitIds.map((id) => byId[id]);

  /* The module's own proof, per pond, plus the shipped seed law over the
   * twenty-four rounds each pond really deals. */
  const proofProblems = [];
  summit.forEach((level) => {
    const bands = App.photoBands(level);
    const run = App.photoBestLine(level);
    if (!run || !run.win) {
      proofProblems.push(level.id + " has no winning line");
      return;
    }
    if (run.metric < bands[2]) {
      proofProblems.push(`${level.id} line ${run.metric} misses the legal album ${bands[2]}`);
    }
    if (JSON.stringify(bands) !== JSON.stringify(App.photoBands(level))) {
      proofProblems.push(level.id + " bands moved between reads");
    }
    let reach = 0;
    for (let round = 0; round < 24; round += 1) {
      const seed = level.seed + round * 131;
      const roundRun = App.photoBestLine(Object.assign({}, level, {
        id: level.id + "-round" + round, seed: seed,
      }));
      if (roundRun && roundRun.win && roundRun.metric >= bands[0]) reach += 1;
    }
    if (reach < 12) {
      proofProblems.push(`${level.id} only ${reach}/24 rounds reach their own band`);
    }
  });
  check("game-pocket-photographer",
    "every last pond proves its album and half its rounds reach the measured band",
    proofProblems.length === 0, proofProblems.slice(0, 4).join(" | "));

  /* The tier stands above the gallery it follows and its best album tops the
   * gallery's own best - the direct-predecessor comparison a summit owes. */
  const gallery = ["pph21", "pph22", "pph23", "pph24"].map((id) => byId[id]);
  const galleryFloor = Math.min(...gallery.map((level) => App.photoBands(level)[0]));
  const galleryTop = Math.max(...gallery.map((level) => App.photoBands(level)[0]));
  const summitTop = Math.max(...summit.map((level) => App.photoBands(level)[0]));
  const low = summit.filter((level) => App.photoBands(level)[0] < galleryFloor)
    .map((level) => level.id);
  check("game-pocket-photographer",
    "every last pond measures above the master gallery's floor, and the tier's best album tops the gallery's best",
    low.length === 0 && summitTop > galleryTop,
    `gallery floor ${galleryFloor}, top ${galleryTop}, summit top ${summitTop}, low: ${low.join(",")}`);

  /* No two last ponds lean on the same dial shape - dials and the crowd they
   * deal together - and each carries at least three dials at the tour's edge. */
  const shape = (level) => [level.budget, level.drift, level.momentScale,
    level.scoreMin, level.behaviourMin, level.frameW,
    level.roster.map((r) => r.n).sort((a, b) => a - b).join("-")].join("/");
  const shapes = new Set(summit.map(shape));
  const dupes = summit.filter((level) => levels.some((other) =>
    other.id !== level.id && !summitIds.includes(other.id) && shape(other) === shape(level)))
    .map((level) => level.id);
  const edge = (level) => (level.budget <= 7 ? 1 : 0) +
    (level.momentScale <= 0.88 ? 1 : 0) +
    (level.drift >= 0.11 ? 1 : 0) +
    (level.scoreMin >= 82 ? 1 : 0) +
    (level.behaviourMin >= 26 ? 1 : 0) +
    (level.frameW <= 178 ? 1 : 0);
  const slack = summit.filter((level) => edge(level) < 3).map((level) => level.id);
  check("game-pocket-photographer",
    "the six last ponds are six dial shapes, each loaded to the tour's edge",
    shapes.size === 6 && dupes.length === 0 && slack.length === 0,
    `slack: ${slack.join(",")} dupes: ${dupes.join(",")}`);

  /* The single flock deals more of one bird than any earlier pond. */
  const flock = byId.pph25;
  const biggestRoster = Math.max(...levels.filter((level) => level.id !== "pph25")
    .map((level) => Math.max(...level.roster.map((r) => r.n))));
  const flockMax = Math.max(...flock.roster.map((r) => r.n));
  check("game-pocket-photographer",
    "the single flock deals six of one bird, more than any pond before it",
    flockMax === 6 && biggestRoster < flockMax,
    `flock ${flockMax} vs shipped max ${biggestRoster}`);

  /* The tier's names resolve in both languages. */
  const copyProblems = summit.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-pocket-photographer", "the six last-pond names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each pond in order
   * hands the player exactly the next one, all thirty times. */
  const chain = App.createCampaign({
    key: "pocket-photographer-gate-chain",
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
  check("game-pocket-photographer", "the unlock chain walks all thirty ponds in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
