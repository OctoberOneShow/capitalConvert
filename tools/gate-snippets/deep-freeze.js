"use strict";

/* game-deep-freeze: the white-summit winters and the walk-out winters are
 * questions the ladder never asked, proved by the module's own planner.
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
 * a stale band cannot ship.
 *
 * The walk-out tier f31-f40 changes where the party stands when the storm
 * hits: every one of the first thirty expeditions mustered at a trailhead -
 * Base Camp or the Rescue Hut, the map's two ends, all thirty times - and
 * every walk-out rung musters where the storm caught the party instead (the
 * Rock Shelter, the Cold Sink, the Serac Field, Depot Four, the Crevasse
 * Rim, once the Hut itself) and walks OUT, west to Base Camp, on the
 * five-kilo pack - the coat and the crampons, with the stove, the ration
 * pack and the kit proven uncarryable from the module's own item table -
 * through a chill-five, whiteout-led sky. Every deadline sits exactly two
 * days over the planner's own measured line, the lines never fall rung over
 * rung, and the capstone's seven-day line out-walks the summit capstone's
 * five and every homeward leg the ladder shipped. Names resolve in both
 * languages and the unlock chain walks all forty expeditions in order.
 */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.dfzLevels || [];
  const summitIds = ["f25", "f26", "f27", "f28", "f29", "f30"];
  const walkoutIds = ["f31", "f32", "f33", "f34", "f35", "f36", "f37", "f38", "f39", "f40"];

  check("game-deep-freeze", "the ladder holds forty expeditions",
    levels.length === 40, String(levels.length));
  check("game-deep-freeze", "every expedition id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = summitIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-deep-freeze", "the white summit f25-f30 is present",
    missing.length === 0, missing.join(","));
  const missingWalkout = walkoutIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-deep-freeze", "the walk-out tier f31-f40 is present",
    missingWalkout.length === 0, missingWalkout.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const summit = summitIds.map((id) => byId[id]);
  const walkout = walkoutIds.map((id) => byId[id]);

  /* The dial firsts: each summit rung turns a dial the ladder never turned
   * before it - chill five, spread three, the lean pantry's thirst-led sky,
   * the blind homeward leg, the three-kilo pack, and the capstone's pairing.
   * The firsts are held against the first thirty; the walk-out tier
   * deliberately re-deals some of the summit's pairings (f38 marches a blind
   * homeward leg again), because its law is the muster and the light pack,
   * not the dials. */
  const firstProblems = [];
  const shippedThirty = levels.slice(0, 30);
  const chill5 = shippedThirty.filter((level) => level.chill >= 5).map((level) => level.id);
  if (chill5[0] !== "f25" || chill5.length < 2) {
    firstProblems.push("chill five first appears at " + chill5.join(","));
  }
  const spread3 = shippedThirty.filter((level) => level.spread >= 3).map((level) => level.id);
  if (spread3[0] !== "f26" || spread3.length < 2) {
    firstProblems.push("spread three first appears at " + spread3.join(","));
  }
  const cap3 = shippedThirty.filter((level) => level.cap <= 3).map((level) => level.id);
  if (cap3[0] !== "f29" || cap3.length !== 1) {
    firstProblems.push("the three-kilo pack first appears at " + cap3.join(","));
  }
  const blindHome = shippedThirty.filter((level) =>
    level.start === 11 && level.goal === 0 && level.reach <= 1).map((level) => level.id);
  if (blindHome[0] !== "f28" || blindHome.length !== 1) {
    firstProblems.push("the blind homeward leg first appears at " + blindHome.join(","));
  }
  const famine = shippedThirty.filter((level) =>
    level.food <= 5 && level.hazardWeights[0] === 0 &&
    level.hazardWeights[1] >= 3 && level.hazardWeights[2] >= 1)
    .map((level) => level.id);
  if (famine[0] !== "f27" || famine.length !== 1) {
    firstProblems.push("the lean pantry first appears at " + famine.join(","));
  }
  const pair = shippedThirty.filter((level) => level.chill >= 5 && level.spread >= 3)
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

  /* ---- the walk-out tier: muster where the storm caught you ----
   * The law, real in the rows: every walk-out rung musters away from Base
   * Camp and walks out west to it, on the five-kilo pack, under a chill-five
   * whiteout-led sky, and no shipped expedition musters anywhere but the two
   * trailheads or pairs the homeward leg with a light pack, a merciless sky
   * or a whiteout-led forecast. */
  const musterProblems = [];
  const musters = new Set();
  walkout.forEach((level) => {
    if (level.goal !== 0) {
      musterProblems.push(level.id + " does not walk out to Base Camp");
    }
    if (level.start === 0) {
      musterProblems.push(level.id + " musters at Base Camp, not in the field");
    }
    if (level.cap !== 5) {
      musterProblems.push(`${level.id} marches on a ${level.cap}-kilo cap, not the five-kilo pack`);
    }
    if (level.chill !== 5) {
      musterProblems.push(`${level.id} walks under a chill-${level.chill} sky`);
    }
    const weights = level.hazardWeights;
    if (weights[3] !== 4 || weights.some((weight, index) => index !== 3 && weight >= 4)) {
      musterProblems.push(level.id + " does not march under a whiteout-led forecast");
    }
    musters.add(level.start);
  });
  [6, 7, 8, 9, 10, 11].forEach((node) => {
    if (!musters.has(node)) {
      musterProblems.push("no walk-out rung musters at node " + node);
    }
  });
  check("game-deep-freeze",
    "every walk-out rung musters away from Base Camp and walks out west on the five-kilo pack, in a chill-five whiteout-led sky",
    musterProblems.length === 0, musterProblems.join(" | "));

  const trailheadOnly = levels.slice(0, 30).filter((level) => level.start !== 0 && level.start !== 11)
    .map((level) => level.id);
  check("game-deep-freeze",
    "the first thirty expeditions all muster at the trailheads - the walk-out muster is new to the tier",
    trailheadOnly.length === 0, trailheadOnly.join(","));
  const homewardPairs = levels.slice(0, 30).filter((level) => level.goal === 0 &&
    (level.cap <= 5 || level.chill >= 5 ||
      level.hazardWeights[3] >= 4 && level.hazardWeights[3] > level.hazardWeights[2]))
    .map((level) => level.id + ` (cap ${level.cap}, chill ${level.chill})`);
  check("game-deep-freeze",
    "no shipped homeward leg pairs the walk back with a five-kilo pack, a chill-five sky or a whiteout-led forecast",
    homewardPairs.length === 0, homewardPairs.join(",") || "none");

  /* The pack law, measured from the module's own item table: no pack within
   * the five-kilo cap carries the coat with the stove, the ration pack or
   * the kit, while the crampons and the lamp still ride - the melt, the
   * pantry and the kit are what the muster leaves in the snow. */
  const packProblems = [];
  for (let mask = 0; mask < (1 << App.freezeItems.length); mask += 1) {
    const pack = App.freezePackOf(mask);
    if (App.freezeWeight(pack) > 5) {
      continue;
    }
    if (pack[0] && (pack[1] || pack[3] || pack[5])) {
      packProblems.push("a five-kilo pack carries the coat with " +
        [pack[1] && "the stove", pack[3] && "the rations", pack[5] && "the kit"]
          .filter(Boolean).join(" + "));
    }
  }
  const coatCrampons = App.freezePackOf(
    (1 << 0) | (1 << 2));
  if (App.freezeWeight(coatCrampons) !== 5) {
    packProblems.push("the coat and crampons no longer weigh five together");
  }
  check("game-deep-freeze",
    "the five-kilo pack carries the coat and crampons and provably cannot carry the stove, the ration pack or the kit",
    packProblems.length === 0, packProblems.join(" | "));

  /* Every walk-out deadline sits exactly two days over the planner's own
   * line on the shipped seed, the lines never fall rung over rung, and the
   * deadline never loosens. */
  const walkPars = [];
  const walkoutProblems = [];
  walkout.forEach((level) => {
    const plan = App.freezePlan(level);
    if (!plan) {
      walkoutProblems.push(level.id + " has no planner line at all");
      return;
    }
    walkPars.push(plan.days);
    if (level.days !== plan.days + 2) {
      walkoutProblems.push(`${level.id} deadline ${level.days} is not the ${plan.days}-day line + 2`);
    }
    const band = App.freezeBand(level);
    if (band[0] !== plan.days || band[2] !== level.days) {
      walkoutProblems.push(`${level.id} bands ${band.join("/")} do not sit on the measured line`);
    }
  });
  for (let i = 1; i < walkPars.length; i += 1) {
    if (walkPars[i] < walkPars[i - 1]) {
      walkoutProblems.push(`the walk-out line falls to ${walkPars[i]} at rung ${i}`);
    }
  }
  check("game-deep-freeze",
    "every walk-out deadline is exactly its measured line + 2, the lines never fall, the bands sit on the planner's own proof (" +
      walkPars.join("/") + ")",
    walkoutProblems.length === 0, walkoutProblems.join(" | "));

  /* The landing beats the ladder's own history: the capstone's seven-day
   * line out-walks the summit capstone's five from Base Camp and every
   * homeward leg the ladder ever shipped, and it is the tighter trek - a
   * bigger share of its deadline is proven march. */
  const f30Par = App.freezePlan(byId.f30).days;
  const homewardPars = ["f14", "f18", "f22"].map((id) => App.freezePlan(byId[id]).days);
  const capstone = byId.f40;
  const capstonePar = App.freezePlan(capstone).days;
  check("game-deep-freeze",
    `the walk-out capstone proves the deepest walk-out line the drawer has shipped (${capstonePar} days against the summit capstone's ${f30Par} and homeward legs ${homewardPars.join("/")})`,
    capstonePar > f30Par && homewardPars.every((par) => capstonePar > par),
    `capstone ${capstonePar} vs f30 ${f30Par}, homeward ${homewardPars.join("/")}`);
  check("game-deep-freeze",
    "the walk-out capstone is the tighter trek: its proven line fills more of its deadline than the summit's own capstone",
    capstonePar / capstone.days > f30Par / byId.f30.days,
    `${capstone.id} ${capstonePar}/${capstone.days} vs f30 ${f30Par}/${byId.f30.days}`);

  /* The tier's names resolve in both languages. */
  const copyProblems = summit.concat(walkout).map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-deep-freeze", "the sixteen summit and walk-out expedition names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each expedition in
   * order hands the player exactly the next one, all forty times. */
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
  check("game-deep-freeze", "the unlock chain walks all forty expeditions in order",
    walked === 40 && chained && chain.clearedCount() === 40, walked + " first clears");
};
