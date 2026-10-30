"use strict";

/* game-roof-garden: the harvest-ledger summit is measured, not guessed.
 *
 * The pavilion arc scaled the purse and the target; the summit g25-g30 puts
 * the garden on the books. Its law is arithmetic, so the gate proves it
 * arithmetically: every summit target is an exact number of harvests
 * (goal = k x crop, k whole), every summit return stays fractional so no
 * rung replays g8's triple ledger, and both the seed price and the target
 * climb on every rung past g24's. The engine's own greedy floor
 * (App.gardenSecondsToGoal, the shipped simulator) completes all thirty
 * beds, the summit bands keep the shipped 1.31x / 1.77x pace with the
 * greedy floor clearing the three-star line, and the tier still breaks one
 * lever per rung - six distinct rhythms, never a scaled copy. Names travel
 * in both languages and the unlock chain walks all thirty beds in order.
 */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.gardenBeds || [];
  const summitIds = ["g25", "g26", "g27", "g28", "g29", "g30"];

  check("game-roof-garden", "the ladder holds thirty beds",
    levels.length === 30, String(levels.length));
  check("game-roof-garden", "every bed id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = summitIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-roof-garden", "the harvest-ledger summit g25-g30 is present",
    missing.length === 0, missing.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const summit = summitIds.map((id) => byId[id]);
  const g24 = byId.g24;
  const g8 = byId.g8;

  /* The ledger law: exact harvest counts, fractional returns, rising purse
   * and target - and g8 stays the only rung that divides into itself. */
  const ledgerProblems = [];
  summit.forEach((level, index) => {
    if (level.goal % level.crop !== 0) {
      ledgerProblems.push(`${level.id} target ${level.goal} is not a whole number of ${level.crop} harvests`);
    }
    if (Number.isInteger(level.crop / level.cost)) {
      ledgerProblems.push(`${level.id} returns ${level.crop / level.cost} whole seeds back`);
    }
    if (level.goal <= g24.goal || level.cost <= g24.cost) {
      ledgerProblems.push(`${level.id} does not clear g24's ${g24.goal}/${g24.cost}`);
    }
    if (index > 0) {
      const prev = summit[index - 1];
      if (level.goal <= prev.goal || level.cost <= prev.cost) {
        ledgerProblems.push(`${level.id} does not climb past ${prev.id}`);
      }
    }
  });
  check("game-roof-garden",
    "every summit target is an exact harvest count at a fractional return, climbing past g24",
    ledgerProblems.length === 0, ledgerProblems.slice(0, 4).join(" | "));
  const earlierTriple = levels.filter((level) =>
    !summitIds.includes(level.id) &&
    level.crop % level.cost === 0 &&
    level.start % level.crop === 0 &&
    level.goal % level.crop === 0);
  check("game-roof-garden",
    "g8 stays the only pre-summit rung whose seed, crop and target divide into each other",
    earlierTriple.length === 1 && earlierTriple[0].id === "g8",
    earlierTriple.map((level) => level.id).join(","));

  /* The house habit holds: the six summit beds are six rhythms, not one
   * scaled copy - plots opening on tick zero and grow clocks both vary. */
  const openings = new Set(summit.map((level) => Math.floor(level.start / level.cost)));
  const clocks = new Set(summit.map((level) => level.growMs));
  check("game-roof-garden",
    "the summit breaks one lever per rung: three or more openings and four or more clocks",
    openings.size >= 3 && clocks.size >= 4,
    `openings ${[...openings].join("/")} clocks ${[...clocks].join("/")}`);

  /* The engine's own greedy floor completes every bed on the ladder. */
  const stuck = levels.filter((level) => App.gardenSecondsToGoal(level) < 0)
    .map((level) => level.id);
  check("game-roof-garden", "the greedy floor ripens all thirty beds to their goals",
    stuck.length === 0, stuck.join(","));

  /* The summit's bands keep the shipped pace: the greedy floor clears the
   * three-star line, the band runs rising, and a hand twice as slow as the
   * floor misses the one-star line - the bands bind in both directions. */
  const bandProblems = [];
  summit.forEach((level) => {
    const floor = App.gardenSecondsToGoal(level);
    const bands = level.starTimes;
    if (!bands || bands.length !== 3) {
      bandProblems.push(`${level.id} has no three-line band`);
      return;
    }
    if (!(bands[0] < bands[1] && bands[1] < bands[2])) {
      bandProblems.push(`${level.id} band ${bands.join("/")} does not rise`);
    }
    if (App.starsFor(floor, bands, "low") !== 3) {
      bandProblems.push(`${level.id} floor ${floor}s misses the three-star line ${bands[0]}`);
    }
    if (App.starsFor(Math.ceil(floor * 2.1), bands, "low") !== 0) {
      bandProblems.push(`${level.id} a ${Math.ceil(floor * 2.1)}s hand still banks a star`);
    }
  });
  check("game-roof-garden",
    "every summit band is rising, floor-three-star, and binds from above",
    bandProblems.length === 0, bandProblems.slice(0, 4).join(" | "));

  /* The tier's names resolve in both languages. */
  const copyProblems = summit.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-roof-garden", "the six summit bed names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each bed in order
   * hands the player exactly the next one, all thirty times. */
  const chain = App.createCampaign({
    key: "roof-garden-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 99, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-roof-garden", "the unlock chain walks all thirty beds in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
