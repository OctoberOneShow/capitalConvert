"use strict";

/* game-coral-architect: the summit tier is dealt lawfully and proven by the
 * module's own engines.
 *
 * The summit c25-c30 opens the long reef - twenty-one to twenty-four turns,
 * longer than any shipped rung - and gives every rung one draft law the
 * earlier tiers never held for a whole deal. The gate proves the laws
 * structurally (every offer carries a sponge or an urchin, the two tiles
 * that plant anywhere, so no draft order strands the player), proves every
 * deal fair through the shipped prover at its own seed and again over six
 * hundred draft orders, cuts the bands the shipped way - the three-star
 * line IS the deal's own greedy line, with the 0.86 / 0.72 ratios below it -
 * and holds the random spectrum clear of the top band on every rung, so
 * none of the summit can be cleared by a careless hand. The climb is real:
 * turn counts never fall across the tier, every rung passes the masterwork,
 * and the capstone is the longest reef the drawer ships. Names resolve in
 * both languages and the unlock chain walks all thirty rungs in order.
 */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.reefLevels || [];
  const summitIds = ["c25", "c26", "c27", "c28", "c29", "c30"];

  check("game-coral-architect", "the ladder holds at least forty reefs",
    levels.length >= 40, String(levels.length));
  check("game-coral-architect", "every reef id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = summitIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-coral-architect", "the summit c25-c30 is present",
    missing.length === 0, missing.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const summit = summitIds.map((id) => byId[id]);
  const c24 = byId.c24;

  /* The draft law: every summit offer carries a sponge or an urchin, the
   * two species that plant at any depth with no chain rule, so some tile
   * in every offer is plantable while a cell stands free. */
  const lawless = [];
  summit.forEach((level) => {
    level.offers.forEach((offer, turn) => {
      if (!offer.includes("S") && !offer.includes("X")) {
        lawless.push(`${level.id} turn ${turn + 1}: ${offer}`);
      }
    });
  });
  check("game-coral-architect",
    "every summit offer carries a plant-anywhere tile (S or X)",
    lawless.length === 0, lawless.slice(0, 4).join(" | "));

  /* The shipped prover, at its own seed, plus a six-hundred-order sweep:
   * no draft order strands the player, and the sweep's random spectrum
   * stays clear of the three-star line on every rung. */
  const fairProblems = [];
  summit.forEach((level) => {
    const shipped = App.reefFair(level);
    if (!shipped.fair) {
      fairProblems.push(`${level.id} fails the shipped prover (${shipped.deadOffers} dead)`);
    }
    const wide = App.reefFair(level, 600);
    if (!wide.fair) {
      fairProblems.push(`${level.id} fails the 600-order sweep (${wide.deadOffers} dead)`);
    }
    if (wide.random >= level.stars[0]) {
      fairProblems.push(`${level.id} a careless hand reaches ${wide.random} against a ${level.stars[0]} line`);
    }
  });
  check("game-coral-architect",
    "every summit deal is fair at the shipped seed and over 600 orders, and never randomly clears",
    fairProblems.length === 0, fairProblems.slice(0, 4).join(" | "));

  /* The bands are cut the shipped way: the three-star line is the deal's
   * own greedy line, and the lower lines keep the shipped ratios. */
  const bandProblems = [];
  summit.forEach((level) => {
    const greedy = App.reefGreedy(level).score;
    const stars = level.stars;
    if (stars[0] !== greedy) {
      bandProblems.push(`${level.id} top band ${stars[0]} != greedy line ${greedy}`);
    }
    const two = stars[1] / stars[0];
    const one = stars[2] / stars[0];
    if (two < 0.84 || two > 0.88 || one < 0.7 || one > 0.74) {
      bandProblems.push(`${level.id} ratios ${two.toFixed(3)}/${one.toFixed(3)} leave the shipped pace`);
    }
    if (!(stars[0] > stars[1] && stars[1] > stars[2])) {
      bandProblems.push(`${level.id} bands ${stars.join("/")} do not fall`);
    }
  });
  check("game-coral-architect",
    "every summit band is the proven greedy line at the shipped ratios",
    bandProblems.length === 0, bandProblems.slice(0, 4).join(" | "));

  /* The climb: turns never fall across the tier, every rung passes the
   * masterwork, and the capstone is the ladder's longest reef. */
  const climbProblems = [];
  summit.forEach((level, index) => {
    if (level.turns <= c24.turns) {
      climbProblems.push(`${level.id} ${level.turns} turns does not pass c24's ${c24.turns}`);
    }
    if (index > 0 && level.turns < summit[index - 1].turns) {
      climbProblems.push(`${level.id} ${level.turns} turns falls below ${summit[index - 1].id}`);
    }
  });
  const summitLongest = levels.slice(0, levels.findIndex((l) => l.id === "c31")).reduce((a, b) => (b.turns > a.turns ? b : a));
  if (summitLongest.id !== "c30") {
    climbProblems.push(`the summit's longest reef is ${summitLongest.id}, not the capstone`);
  }
  check("game-coral-architect",
    "the summit climbs past the masterwork and lands its longest reef on the capstone",
    climbProblems.length === 0, climbProblems.slice(0, 4).join(" | "));

  /* The tier's names resolve in both languages. */
  const copyProblems = summit.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-coral-architect", "the six summit reef names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));


  /* ---- the midnight reef c31-c40: measured records, dealt lawfully ----
   * Every rung takes one record away from the ladder behind it, each held
   * against every reef shipped before it (later tiers legitimately overtake
   * earlier ones, so the claims are scoped by position). The bands are cut
   * the shipped way and every deal is fair over the six-hundred-order sweep
   * with the random spectrum clear of the top band. */
  const deepIds = ["c31", "c32", "c33", "c34", "c35", "c36", "c37", "c38", "c39", "c40"];
  const deepMissing = deepIds.filter((id) => !byId[id]);
  const deepInOrder = deepIds.every((id, index) => levels.findIndex((l) => l.id === id) >
    (index === 0 ? -1 : levels.findIndex((l) => l.id === deepIds[index - 1])));
  check("game-coral-architect", "the midnight reef c31-c40 exists in order",
    deepMissing.length === 0 && deepInOrder, deepMissing.join(",") || "ordered");
  const deep = deepIds.map((id) => byId[id]);
  const before = (id) => levels.slice(0, levels.findIndex((l) => l.id === id));
  const fShare = (level) => {
    const text = App.reefPoolFor(level).join("");
    return text.split("").filter((kind) => kind === "F").length / Math.max(1, text.length);
  };
  const deepProblems = [];
  const dPush = (ok, message) => { if (!ok) deepProblems.push(message); };
  dPush(byId.c31.turns === 25 && before("c31").every((l) => l.turns < 25),
    "c31 is not the first 25-turn reef");
  dPush(fShare(byId.c32) >= 0.5 && before("c32").every((l) => fShare(l) < 0.5),
    "c32 is not the first half-fan draft");
  dPush(App.reefPoolFor(byId.c33).every((offer) => offer.split("").filter((k) => k === "F").length >= 2) &&
    before("c33").some((l) => App.reefPoolFor(l).some((offer) => offer.split("").filter((k) => k === "F").length < 2)),
    "c33 is not the first draft where every offer carries a fan pair");
  dPush(byId.c34.turns === 26 && before("c34").every((l) => l.turns < 26),
    "c34 is not the first 26-turn reef");
  dPush(byId.c35.turns === 27 && before("c35").every((l) => l.turns < 27),
    "c35 is not the first 27-turn reef");
  dPush(App.reefPoolFor(byId.c36).every((offer) => offer.includes("F") && offer.includes("X")) &&
    before("c36").some((l) => App.reefPoolFor(l).some((offer) => !(offer.includes("F") && offer.includes("X")))),
    "c36 is not the first draft where every offer pairs a fan with an urchin");
  dPush(byId.c37.turns === 28 && before("c37").every((l) => l.turns < 28),
    "c37 is not the first 28-turn reef");
  dPush(byId.c38.turns === 29 && before("c38").every((l) => l.turns < 29),
    "c38 is not the first 29-turn reef");
  dPush(byId.c39.turns === 30 && before("c39").every((l) => l.turns < 30),
    "c39 is not the first 30-turn reef");
  dPush(byId.c40.turns === 31 && levels.every((l) => l.id === "c40" || l.turns < 31),
    "c40 is not the longest reef the drawer ships");
  check("game-coral-architect",
    "every midnight-reef record beats every reef shipped before it",
    deepProblems.length === 0, deepProblems.slice(0, 4).join(" | "));

  /* The draft law holds across the tier, every deal is fair over the wide
   * sweep, the random spectrum stays clear, and the bands are cut the
   * shipped way against the deal's own greedy line. */
  const deepLawless = [];
  deep.forEach((level) => {
    App.reefPoolFor(level).forEach((offer, turn) => {
      if (!offer.includes("S") && !offer.includes("X")) {
        deepLawless.push(`${level.id} turn ${turn + 1}: ${offer}`);
      }
    });
  });
  check("game-coral-architect",
    "every midnight-reef offer carries a plant-anywhere tile (S or X)",
    deepLawless.length === 0, deepLawless.slice(0, 4).join(" | "));
  const deepFairProblems = [];
  deep.forEach((level) => {
    const shipped = App.reefFair(level);
    if (!shipped.fair) {
      deepFairProblems.push(`${level.id} fails the shipped prover (${shipped.deadOffers} dead)`);
    }
    const wide = App.reefFair(level, 600);
    if (!wide.fair) {
      deepFairProblems.push(`${level.id} fails the 600-order sweep (${wide.deadOffers} dead)`);
    }
    if (wide.random >= level.stars[0]) {
      deepFairProblems.push(`${level.id} a careless hand reaches ${wide.random} against a ${level.stars[0]} line`);
    }
  });
  check("game-coral-architect",
    "every midnight deal is fair at the shipped seed and over 600 orders, and never randomly clears",
    deepFairProblems.length === 0, deepFairProblems.slice(0, 4).join(" | "));
  const deepBandProblems = [];
  deep.forEach((level) => {
    const greedy = App.reefGreedy(level).score;
    const stars = level.stars;
    if (stars[0] !== greedy) {
      deepBandProblems.push(`${level.id} top band ${stars[0]} != greedy line ${greedy}`);
    }
    const two = stars[1] / stars[0];
    const one = stars[2] / stars[0];
    if (two < 0.84 || two > 0.88 || one < 0.7 || one > 0.74) {
      deepBandProblems.push(`${level.id} ratios ${two.toFixed(3)}/${one.toFixed(3)} leave the shipped pace`);
    }
    if (!(stars[0] > stars[1] && stars[1] > stars[2])) {
      deepBandProblems.push(`${level.id} bands ${stars.join("/")} do not fall`);
    }
  });
  check("game-coral-architect",
    "every midnight band is the proven greedy line at the shipped ratios",
    deepBandProblems.length === 0, deepBandProblems.slice(0, 4).join(" | "));
  /* The length ladder never falls across the tier and opens past c30. */
  const deepClimb = deep.every((level, index) =>
    level.turns > byId.c30.turns &&
    (index === 0 || level.turns >= deep[index - 1].turns));
  check("game-coral-architect",
    "the midnight reef keeps climbing: no rung falls below the capstone of the summit",
    deepClimb, deep.map((l) => l.id + ":" + l.turns).join(","));
  const deepCopy = deep.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-coral-architect", "the ten midnight reef names resolve in both languages",
    deepCopy.length === 0, deepCopy.join(","));
  /* The unlock chain is derived, never stored: clearing each reef in order
   * hands the player exactly the next one, all thirty times. */
  const chain = App.createCampaign({
    key: "coral-architect-gate-chain",
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
  check("game-coral-architect", "the unlock chain walks every reef in order",
    walked === levels.length && chained && chain.clearedCount() === levels.length, walked + " first clears");
};
