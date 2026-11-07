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
 *
 * The storm front pph31-pph40 turns the tour's wind from a reading into a
 * law: every pond carries `gust`, a dial no shipped pond has, and pphStep
 * walks the viewfinder along the water by sin(t + windPhase) * gust - the
 * same seeded wind phase the focus ring already drifts by - so the boat
 * moves with no hand on it. The gate proves the dial both ways through the
 * engine: stepped with empty input, every shipped pond's frame sits exactly
 * still while every storm pond's frame wanders, the capstone's wander more
 * than double the intro's. The gust itself strictly rises 18 to 45 px a
 * second, and the rest of each row is the shipped ladder pushed to or past
 * its extremes: the behaviour bar climbs 27 to 30 (two points under the
 * coot's moment ceiling, where rung 30 left five), the window never widens
 * past the deep tiers' 0.85 while rung 30 deals 0.86, the ring drifts 0.13
 * to 0.15 past the shipped 0.125 ceiling, and the roll falls to five frames
 * for four species. Every storm pond is held to the module's own proof at
 * the house law - the scripted line wins on the shipped seed and at least
 * half of the twenty-four rounds that pond actually deals reach their own
 * measured band - with no two storm ponds sharing a dial shape.
 */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.photoLevels || [];
  const summitIds = ["pph25", "pph26", "pph27", "pph28", "pph29", "pph30"];
  const stormIds = ["pph31", "pph32", "pph33", "pph34", "pph35",
    "pph36", "pph37", "pph38", "pph39", "pph40"];

  check("game-pocket-photographer", "the tour holds forty ponds",
    levels.length === 40, String(levels.length));
  check("game-pocket-photographer", "every pond id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = summitIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-pocket-photographer", "the last ponds pph25-pph30 are present",
    missing.length === 0, missing.join(","));
  const missingStorm = stormIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-pocket-photographer", "the storm front pph31-pph40 is present",
    missingStorm.length === 0, missingStorm.join(","));

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

  /* ---- the storm front: the wind is a law now ---- */
  const storm = stormIds.map((id) => byId[id]).filter(Boolean);
  const gusts = [18, 21, 24, 27, 30, 33, 36, 39, 42, 45];
  const pph30 = byId.pph30;
  const stormShapeProblems = [];
  storm.forEach((level, index) => {
    if (!level.wind) stormShapeProblems.push(level.id + " is not windy");
    if (level.gust !== gusts[index]) {
      stormShapeProblems.push(`${level.id} carries gust ${level.gust}, not the ladder's ${gusts[index]}`);
    }
    if (level.scoreMin !== 84) stormShapeProblems.push(`${level.id} scores at ${level.scoreMin}, not the roll's ceiling 84`);
    if (level.need !== 4) stormShapeProblems.push(level.id + " asks for " + level.need + " species");
    if (level.behaviourMin < (index === 0 ? 27 : storm[index - 1].behaviourMin)) {
      stormShapeProblems.push(`${level.id} lets the behaviour bar fall to ${level.behaviourMin}`);
    }
    if (level.momentScale > 0.85) stormShapeProblems.push(`${level.id} widens the window to ${level.momentScale}`);
    if (level.drift < (index === 0 ? 0.13 : storm[index - 1].drift)) {
      stormShapeProblems.push(`${level.id} calms the ring to ${level.drift}`);
    }
    if (level.budget > (index === 0 ? 7 : storm[index - 1].budget)) {
      stormShapeProblems.push(`${level.id} lengthens the roll to ${level.budget}`);
    }
  });
  const landing = storm[storm.length - 1];
  if (landing.behaviourMin <= pph30.behaviourMin) {
    stormShapeProblems.push("the storm's behaviour bar lands at " + landing.behaviourMin + ", not above rung 30's " + pph30.behaviourMin);
  }
  if (landing.drift <= pph30.drift) stormShapeProblems.push("the storm's ring lands at " + landing.drift + ", not past rung 30's " + pph30.drift);
  if (landing.budget >= pph30.budget) stormShapeProblems.push("the storm's roll lands at " + landing.budget + ", not below rung 30's " + pph30.budget);
  if (landing.momentScale >= pph30.momentScale) stormShapeProblems.push("the storm's window lands at " + landing.momentScale + ", not under rung 30's " + pph30.momentScale);
  if (gusts[gusts.length - 1] !== 45) stormShapeProblems.push("the gust ladder does not crest at 45");
  const earlyGust = levels.filter((level) => level.gust !== undefined && stormIds.indexOf(level.id) === -1)
    .map((level) => level.id);
  check("game-pocket-photographer",
    "the storm's gust rises 18 to 45 and every dial lands at or past the shipped extremes - no earlier pond carries the dial",
    stormShapeProblems.length === 0 && earlyGust.length === 0,
    stormShapeProblems.join(" | ") + (earlyGust.length ? " | early gust: " + earlyGust.join(",") : ""));

  /* The dial is real in the stepper, proved both ways: stepped with empty
   * input for a second and a half, every shipped pond's frame sits exactly
   * still - no pond before the storm moves a pixel without a hand - while
   * every storm pond's frame wanders, and the capstone's un-steered wander
   * is more than double the intro's. */
  const wanderOf = (level) => {
    const state = App.photoMake(level, level.seed);
    const x0 = state.frame.x;
    let max = 0;
    for (let i = 0; i < 90; i += 1) {
      const next = App.photoStep(state, {}, 1 / 60);
      Object.keys(next).forEach((key) => { state[key] = next[key]; });
      max = Math.max(max, Math.abs(next.frame.x - x0));
    }
    return max;
  };
  const stillProblems = [];
  levels.filter((level) => stormIds.indexOf(level.id) === -1).forEach((level) => {
    const drift = wanderOf(level);
    if (drift !== 0) stillProblems.push(`${level.id} drifts ${drift.toFixed(1)}px with no hand on it`);
  });
  const wanders = storm.map((level) => wanderOf(level));
  storm.forEach((level, index) => {
    if (!(wanders[index] > 0)) stillProblems.push(`${level.id} never wanders without a hand`);
  });
  if (!(wanders[wanders.length - 1] > 2 * wanders[0])) {
    stillProblems.push(`the capstone's wander ${wanders[wanders.length - 1].toFixed(1)}px is not over twice the intro's ${wanders[0].toFixed(1)}px`);
  }
  check("game-pocket-photographer",
    "the wind moves the boat: shipped ponds sit exactly still un-steered, every storm pond wanders, and the capstone wanders over twice the intro",
    stillProblems.length === 0,
    stillProblems.join(" | ") || "wander " + stormIds.map((id, i) => `${id} ${wanders[i].toFixed(1)}px`).join(", "));

  /* Every storm pond is held to the module's own proof at the house law: the
   * scripted line wins on the shipped seed inside its roll, the bands are
   * the module's own load-time measurement, at least half of the
   * twenty-four rounds the pond actually deals reach their own band, no two
   * storm ponds share a dial shape, and no storm pond shares one with any
   * earlier pond. */
  const stormProofProblems = [];
  const stormShape = (level) => [level.budget, level.drift, level.momentScale,
    level.gust, level.scoreMin, level.behaviourMin, level.frameW,
    level.roster.map((r) => r.n).sort((a, b) => a - b).join("-")].join("/");
  const stormShapes = new Set(storm.map(stormShape));
  const stormDupes = storm.filter((level) => levels.some((other) =>
    other.id !== level.id && stormShape(other) === stormShape(level))).map((level) => level.id);
  storm.forEach((level) => {
    const bands = App.photoBands(level);
    const run = App.photoBestLine(level);
    if (!run || !run.win) {
      stormProofProblems.push(level.id + " has no winning line");
      return;
    }
    if (run.metric < bands[2]) {
      stormProofProblems.push(`${level.id} line ${run.metric} misses the legal album ${bands[2]}`);
    }
    if (JSON.stringify(bands) !== JSON.stringify(App.photoBands(level))) {
      stormProofProblems.push(level.id + " bands moved between reads");
    }
    if (bands[0] !== run.metric) {
      stormProofProblems.push(`${level.id} band0 ${bands[0]} is not the measured line ${run.metric}`);
    }
    let reach = 0;
    for (let round = 0; round < 24; round += 1) {
      const seed = level.seed + round * 131;
      const roundRun = App.photoBestLine(Object.assign({}, level, {
        id: level.id + "-gate-round" + round, seed: seed,
      }));
      if (roundRun && roundRun.win && roundRun.metric >= bands[0]) reach += 1;
    }
    if (reach < 12) {
      stormProofProblems.push(`${level.id} only ${reach}/24 rounds reach their own band`);
    }
  });
  check("game-pocket-photographer",
    "every storm pond proves its album, half its rounds reach the measured band, and no dial shape repeats",
    stormProofProblems.length === 0 && stormShapes.size === 10 && stormDupes.length === 0,
    stormProofProblems.slice(0, 3).join(" | ") + (stormDupes.length ? " dupes: " + stormDupes.join(",") : ""));

  /* The tier's names resolve in both languages. */
  const copyProblems = summit.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-pocket-photographer", "the six last-pond names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
  const stormCopyProblems = storm.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key || App.I18N.zh[key] === App.I18N.en[key]);
  check("game-pocket-photographer", "the ten storm-pond names resolve in both languages",
    stormCopyProblems.length === 0, stormCopyProblems.join(","));
  const desc = (App.getRegisteredGames ? App.getRegisteredGames() : [])
    .filter((game) => game.name === "pocketPhotographer")[0];
  const stormGuide = desc && desc.guide &&
    (desc.guide.en || []).some((line) => line.indexOf("Storm:") === 0) &&
    (desc.guide.zh || []).some((line) => line.indexOf("风暴") === 0);
  check("game-pocket-photographer", "the guide carries the storm line in both languages",
    !!stormGuide, desc && desc.guide ? "en " + desc.guide.en.length + " lines, zh " + desc.guide.zh.length : "no guide");

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
  check("game-pocket-photographer", "the unlock chain walks all forty ponds in order",
    walked === 40 && chained && chain.clearedCount() === 40, walked + " first clears");
};
