"use strict";

/* game-morse-rescue: the deep tier's bands are measured, not guessed, and
 * its lesson - the bank running dry - is structural, not decorative.
 *
 * Each deep rung (and the shipped peak calibrating the bench) walks its own
 * real deal stream - the same solvable-broadcast filter the panel uses -
 * and the gate proves three things about it. First, the stream never stalls:
 * every one of the broadcasts is found inside the dealer's 96-step walk.
 * Second, the star bands sit on measured lines: the top band is not a
 * lottery (at least two percent of the stream solves into it, the harness's
 * own floor), every winnable line still pays a star, and the window pays
 * for every replay the solver's best line asks for, so "winnable" is
 * winnable on the clock too. Third, the lesson is structural: the records
 * the tier claims - the longest tape, the fewest sends, the driest bank
 * against real noise, the capstone pairing all three - are held against
 * every rung shipped before it.
 *
 * The final tier m25-m30 turns the bands into measurements outright: the
 * top band IS the cheapest winning line in the stream, the one-star band
 * IS the worst, the window pays the bank with no second spare, and every
 * broadcast solves on the first probe. Its bills climb one replay at a
 * time from 7 to 22, and the summit's tape, static and bill each beat
 * every rung before the tier. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.morseLevels;
  const deepIds = ["m21", "m22", "m23", "m24", "m25", "m26", "m27", "m28", "m29", "m30"];
  const finalIds = ["m25", "m26", "m27", "m28", "m29", "m30"];

  check("game-morse-rescue", "the ladder holds thirty missions",
    levels.length === 30, String(levels.length));
  check("game-morse-rescue", "every mission id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-morse-rescue", "the deep tier m21-m30 is present",
    missing.length === 0, missing.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);
  const shallow = levels.filter((level) => !deepIds.includes(level.id));

  /* Walk a mission's real deal stream: the solvable-broadcast filter the
   * panel deals with, cursor walking exactly as loadLevel walks it. */
  const stream = (level, count) => {
    const out = [];
    let cursor = 0;
    let maxWalk = 0;
    for (let step = 0; step < count; step += 1) {
      let found = null;
      for (let probe = 0; probe < 96; probe += 1) {
        const mission = App.morseDeal(level, cursor + probe);
        if (App.morseSolvable(mission)) {
          maxWalk = Math.max(maxWalk, probe);
          cursor = cursor + probe + 1;
          found = mission;
          break;
        }
      }
      if (!found) return { out, maxWalk, stalled: true };
      out.push(found);
    }
    return { out, maxWalk, stalled: false };
  };

  /* Per rung: the stream never stalls, every deal's solver line costs what
   * the metric says, the bands are reachable but not free, and - on the
   * deep tier, whose brief is scarcity that still wins - the window pays
   * for the replays the best line needs. m20 calibrates the stream and the
   * band bar only: the shipped peak already ships the tension its own
   * comment describes ("the window only pays for two replays"), so the
   * window law is the deep tier's, not its. */
  const STREAM = 250;
  const runProblems = [];
  const needByLevel = {};
  const measured = {};
  [byId.m20].concat(deep).forEach((level) => {
    const isDeep = deepIds.includes(level.id);
    const walk = stream(level, STREAM);
    if (walk.stalled || walk.out.length !== STREAM) {
      runProblems.push(`${level.id}: the deal stream stalled at ${walk.out.length}`);
      return;
    }
    let minCost = Infinity;
    let maxCost = 0;
    let maxNeed = 0;
    const bands = { 1: 0, 2: 0, 3: 0 };
    walk.out.forEach((mission) => {
      const solved = App.morseSolve(mission);
      if (!solved) {
        runProblems.push(`${level.id}: a streamed broadcast does not solve`);
        return;
      }
      if (solved.cost !== solved.batterySpent * 3 + 1) {
        runProblems.push(`${level.id}: solver line cost ${solved.cost} off the metric`);
      }
      minCost = Math.min(minCost, solved.cost);
      maxCost = Math.max(maxCost, solved.cost);
      maxNeed = Math.max(maxNeed, solved.batterySpent);
      bands[solved.stars] = (bands[solved.stars] || 0) + 1;
    });
    needByLevel[level.id] = maxNeed;
    measured[level.id] = { min: minCost, max: maxCost, need: maxNeed, walk: walk.maxWalk };
    if (maxCost > level.starCost[2]) {
      runProblems.push(`${level.id}: a winnable line costs ${maxCost}` +
        ` over the one-star band ${level.starCost[2]}`);
    }
    if (!(level.starCost[0] < level.starCost[1] &&
        level.starCost[1] < level.starCost[2])) {
      runProblems.push(`${level.id}: bands do not rise ${level.starCost.join("/")}`);
    }
    const topShare = (bands[3] || 0) / walk.out.length;
    if (topShare < 0.02) {
      runProblems.push(`${level.id}: the top band is a lottery (${bands[3] || 0}/${STREAM})`);
    }
    const replaysPaid = Math.floor(level.window / level.drain);
    if (isDeep && replaysPaid < maxNeed) {
      runProblems.push(`${level.id}: the window pays ${replaysPaid} replays` +
        ` but the best line needs ${maxNeed}`);
    }
    if (finalIds.includes(level.id)) {
      /* The final tier's bands are the measured bills themselves: the top
       * band sits on the cheapest winning line in the stream, the one-star
       * band on the worst, the bank is spent whole on that worst line, the
       * window pays the bank with no second spare, and every broadcast
       * solves on the first probe. */
      if (minCost !== level.starCost[0]) {
        runProblems.push(`${level.id}: cheapest line ${minCost} off the top band ${level.starCost[0]}`);
      }
      if (maxCost !== level.starCost[2]) {
        runProblems.push(`${level.id}: worst line ${maxCost} off the one-star band ${level.starCost[2]}`);
      }
      if (maxNeed !== level.battery) {
        runProblems.push(`${level.id}: the worst line spends ${maxNeed} of ${level.battery} cells`);
      }
      if (level.window !== level.battery * level.drain) {
        runProblems.push(`${level.id}: the window pays ${level.window},` +
          ` not the bank exactly (${level.battery * level.drain})`);
      }
      if (walk.maxWalk !== 0) {
        runProblems.push(`${level.id}: the filter had to walk ${walk.maxWalk}` +
          " deals to find a solvable broadcast");
      }
    }
  });
  check("game-morse-rescue",
    `every deep stream deals clean and every band sits on its measured line (${STREAM} broadcasts x ${deep.length + 1} rungs)`,
    runProblems.length === 0, runProblems.slice(0, 4).join(" | "));

  /* The lesson is structural: each record the tier claims beats every
   * shipped rung. */
  check("game-morse-rescue",
    "m21 reads the longest tape the ladder has ever dealt",
    byId.m21.groups === 9 && shallow.every((level) => level.groups < 9),
    "shipped max groups " + Math.max.apply(null, shallow.map((level) => level.groups)));
  check("game-morse-rescue",
    "m22 gives the sends the scarcity: two sends, fewer than any shipped rung",
    byId.m22.attempts === 2 && shallow.every((level) => level.attempts > 2),
    "shipped min attempts " + Math.min.apply(null, shallow.map((level) => level.attempts)));
  check("game-morse-rescue",
    "m23 dries the bank: one cell against real noise, mostly deduced",
    byId.m23.battery === 1 && byId.m23.noise >= 2 &&
    shallow.every((level) => level.battery > 1 || level.noise < 2) &&
    needByLevel.m23 <= 1,
    "no shipped rung pairs one battery cell with noise 2 or worse; m23 needs " +
      (needByLevel.m23 === undefined ? "?" : needByLevel.m23) + " bought groups at most");
  check("game-morse-rescue",
    "m24 pairs the scarcity: no shipped rung dealt this long a tape this dry this fast",
    shallow.every((level) =>
      level.groups < byId.m24.groups ||
      level.battery > byId.m24.battery ||
      level.attempts > byId.m24.attempts),
    "capstone groups 9 / battery 2 / attempts 3");

  /* The final tier's records, held against every rung before the tier: the
   * tapes open longer than the ladder has ever dealt, the static eats more,
   * m26 keeps a single send, and the measured bills climb one replay at a
   * time from 7 to 22 - the summit dearer than m24's whole band. */
  const final = finalIds.map((id) => byId[id]);
  const preFinal = levels.filter((level) => !finalIds.includes(level.id));
  const preMaxGroups = Math.max.apply(null, preFinal.map((level) => level.groups));
  const preMaxNoise = Math.max.apply(null, preFinal.map((level) => level.noise));
  const preMinAttempts = Math.min.apply(null, preFinal.map((level) => level.attempts));
  const finalMins = final.map((level) => measured[level.id] && measured[level.id].min);
  const billsClimb = final.every((level, index) =>
    typeof finalMins[index] === "number" &&
    finalMins[index] === level.starCost[0] &&
    (index === 0 || finalMins[index] > finalMins[index - 1]));
  check("game-morse-rescue",
    "the final tier opens a longer tape than the ladder has ever dealt (10 groups over the old peak 9)",
    preMaxGroups === 9 && final.every((level) => level.groups > preMaxGroups),
    `pre-tier peak ${preMaxGroups}; tier ${final.map((level) => level.groups).join("/")}`);
  check("game-morse-rescue",
    "m30's static eats more than any rung before the tier (11 over the old peak 5)",
    preMaxNoise === 5 && byId.m30.noise > preMaxNoise &&
      final.every((level) => level.noise >= preMaxNoise),
    `pre-tier peak ${preMaxNoise}; tier ${final.map((level) => level.noise).join("/")}`);
  check("game-morse-rescue",
    "m26 gives the sends the scarcity: one send, fewer than any rung before the tier",
    byId.m26.attempts === 1 && preMinAttempts === 2,
    "pre-tier min attempts " + preMinAttempts);
  check("game-morse-rescue",
    "the final bills climb one replay at a time from 7 to 22, and m24's whole band sits under the summit",
    billsClimb && finalMins[0] === 7 &&
      finalMins[finalMins.length - 1] === 22 &&
      !!measured.m24 && measured.m24.max < finalMins[finalMins.length - 1] &&
      byId.m24.starCost[2] < finalMins[finalMins.length - 1],
    `bills ${finalMins.join("/")}; m24 worst ${measured.m24 && measured.m24.max}`);

  /* The tier's names resolve in both languages. */
  const copyProblems = deep.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-morse-rescue", "the ten deep mission names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each mission in
   * order hands the player exactly the next one, all thirty times. */
  const chain = App.createCampaign({
    key: "morse-rescue-gate-chain",
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
  check("game-morse-rescue", "the unlock chain walks all thirty missions in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
