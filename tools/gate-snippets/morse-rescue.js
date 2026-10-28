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
 * every rung shipped before it. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.morseLevels;
  const deepIds = ["m21", "m22", "m23", "m24"];

  check("game-morse-rescue", "the ladder holds twenty-four missions",
    levels.length === 24, String(levels.length));
  check("game-morse-rescue", "every mission id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-morse-rescue", "the deep tier m21-m24 is present",
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
  [byId.m20].concat(deep).forEach((level) => {
    const isDeep = deepIds.includes(level.id);
    const walk = stream(level, STREAM);
    if (walk.stalled || walk.out.length !== STREAM) {
      runProblems.push(`${level.id}: the deal stream stalled at ${walk.out.length}`);
      return;
    }
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
      maxCost = Math.max(maxCost, solved.cost);
      maxNeed = Math.max(maxNeed, solved.batterySpent);
      bands[solved.stars] = (bands[solved.stars] || 0) + 1;
    });
    needByLevel[level.id] = maxNeed;
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
  });
  check("game-morse-rescue",
    `every deep stream deals clean and every band sits on its measured line (${STREAM} broadcasts x 5 rungs)`,
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

  /* The tier's names resolve in both languages. */
  const copyProblems = deep.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-morse-rescue", "the four deep mission names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each mission in
   * order hands the player exactly the next one, all twenty-four times. */
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
  check("game-morse-rescue", "the unlock chain walks all twenty-four missions in order",
    walked === 24 && chained && chain.clearedCount() === 24, walked + " first clears");
};
