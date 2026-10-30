"use strict";

/* game-deep-freeze: the white-summit winters are questions the ladder never
 * asked, proved by the module's own planner.
 *
 * The long winters had taken the dials to their shipped ceilings; the summit
 * f25-f30 opens the dials the ladder had never turned - the first chill-five
 * sky, the first spread-three forecast, the lean pantry, the blind homeward
 * leg, the first three-kilo pack, and the capstone that carries the deep
 * cold and the shifting sky together. The gate holds each first to the
 * ladder's own history (no earlier rung turns that dial), holds every map
 * to the engine's own solver - a plan exists, the deadline is walkable, and
 * the three-star line is the planner's own proven shortest line - and walks
 * the summit's pars in non-decreasing order with the capstone at the
 * ladder's maximum. Bands come from the module's load-time measurement, so
 * a stale band cannot ship. Names resolve in both languages and the unlock
 * chain walks all thirty expeditions in order.
 */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.dfzLevels || [];
  const summitIds = ["f25", "f26", "f27", "f28", "f29", "f30"];

  check("game-deep-freeze", "the ladder holds thirty expeditions",
    levels.length === 30, String(levels.length));
  check("game-deep-freeze", "every expedition id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = summitIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-deep-freeze", "the white summit f25-f30 is present",
    missing.length === 0, missing.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const summit = summitIds.map((id) => byId[id]);

  /* The dial firsts: each summit rung turns a dial the ladder never turned
   * before it - chill five, spread three, the lean pantry's thirst-led sky,
   * the blind homeward leg, the three-kilo pack, and the capstone's pairing. */
  const firstProblems = [];
  const chill5 = levels.filter((level) => level.chill >= 5).map((level) => level.id);
  if (chill5[0] !== "f25" || chill5.length < 2) {
    firstProblems.push("chill five first appears at " + chill5.join(","));
  }
  const spread3 = levels.filter((level) => level.spread >= 3).map((level) => level.id);
  if (spread3[0] !== "f26" || spread3.length < 2) {
    firstProblems.push("spread three first appears at " + spread3.join(","));
  }
  const cap3 = levels.filter((level) => level.cap <= 3).map((level) => level.id);
  if (cap3[0] !== "f29" || cap3.length !== 1) {
    firstProblems.push("the three-kilo pack first appears at " + cap3.join(","));
  }
  const blindHome = levels.filter((level) =>
    level.start === 11 && level.goal === 0 && level.reach <= 1).map((level) => level.id);
  if (blindHome[0] !== "f28" || blindHome.length !== 1) {
    firstProblems.push("the blind homeward leg first appears at " + blindHome.join(","));
  }
  const famine = levels.filter((level) =>
    level.food <= 5 && level.hazardWeights[0] === 0 &&
    level.hazardWeights[1] >= 3 && level.hazardWeights[2] >= 1)
    .map((level) => level.id);
  if (famine[0] !== "f27" || famine.length !== 1) {
    firstProblems.push("the lean pantry first appears at " + famine.join(","));
  }
  const pair = levels.filter((level) => level.chill >= 5 && level.spread >= 3)
    .map((level) => level.id);
  if (pair.length !== 1 || pair[0] !== "f30") {
    firstProblems.push("the deep-cold shifting sky is carried by " + pair.join(","));
  }
  check("game-deep-freeze",
    "each summit rung turns a dial no earlier rung turned",
    firstProblems.length === 0, firstProblems.join(" | "));

  /* The engine's own solver walks every map on the ladder, and each three-
   * star line is the planner's own proven shortest line, not an authored
   * number. */
  const walkProblems = [];
  levels.forEach((level) => {
    if (!App.freezeBeatable(level)) {
      walkProblems.push(level.id + " is not walkable inside its deadline");
      return;
    }
    const plan = App.freezePlan(level);
    if (!plan) {
      walkProblems.push(level.id + " has no planner line at all");
      return;
    }
    if (level.starDays[0] !== plan.days) {
      walkProblems.push(`${level.id} top band ${level.starDays[0]} != planner line ${plan.days}`);
    }
    const band = App.freezeBand(level);
    if (JSON.stringify(band) !== JSON.stringify(level.starDays)) {
      walkProblems.push(`${level.id} stored band ${level.starDays.join("/")} != measured ${band.join("/")}`);
    }
  });
  check("game-deep-freeze",
    "every expedition is walkable and its bands are the planner's own",
    walkProblems.length === 0, walkProblems.slice(0, 4).join(" | "));

  /* The summit's measured pars never fall, and the capstone carries the
   * summit's own deepest line - the fullest question in the tier. */
  const pars = summit.map((level) => App.freezePlan(level).days);
  let falls = false;
  for (let i = 1; i < pars.length; i += 1) {
    if (pars[i] < pars[i - 1]) falls = true;
  }
  const winters = ["f21", "f22", "f23", "f24"].map((id) => byId[id])
    .map((level) => App.freezePlan(level).days);
  const atLeastTheWinters = Math.min(...pars) >= Math.min(...winters);
  check("game-deep-freeze",
    "the summit's planner pars never fall, it starts at the long winters' depth, and the capstone is the tier's deepest",
    !falls && atLeastTheWinters && pars[pars.length - 1] === Math.max(...pars),
    `summit pars ${pars.join("/")} vs long winters ${winters.join("/")}`);

  /* The deadlines hold a fair slack: every summit deadline is at least the
   * planner line plus two, so the run is a trek, not a single forced line. */
  const slackProblems = [];
  summit.forEach((level) => {
    const par = App.freezePlan(level).days;
    if (level.days < par + 2) {
      slackProblems.push(`${level.id} deadline ${level.days} gives the ${par}-day line no slack`);
    }
  });
  check("game-deep-freeze", "every summit deadline keeps at least two days of slack",
    slackProblems.length === 0, slackProblems.join(" | "));

  /* The tier's names resolve in both languages. */
  const copyProblems = summit.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-deep-freeze", "the six summit expedition names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each expedition in
   * order hands the player exactly the next one, all thirty times. */
  const chain = App.createCampaign({
    key: "deep-freeze-gate-chain",
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
  check("game-deep-freeze", "the unlock chain walks all thirty expeditions in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
