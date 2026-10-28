"use strict";

/* game-tea-house: the long tier fills the room back up and strikes an answer
 * off the tray at every rung.
 *
 * The shipped deep tier (s21-s24) emptied the room; the long tier (s25-s30)
 * does the opposite. Two refusals the shipped ladder never used - Yun's
 * scalding and Kuo's green - enter beside the shipped ones (the clerk's mild,
 * He's charcoal) and are paired into new slates, so a guest who once had two
 * answers has one, and the homesick old woman and the road-worn peddler can end
 * up reaching for the same smoked pot.
 * Chairs climb 22 23 24 25 26 27 across eight and nine nights and the target
 * climbs 20 21 22 23 24 25: the printed need is the measured ceiling of the
 * sitting's own deal, and the bench shows the ceiling moving with the roll.
 * Nothing in the engine is new: App.teaSolve proves every mood of every chair
 * on every night has a tray answer and a proven listening path inside the
 * night's budget, App.teaBestLine replays the real resolver to a win, and a
 * bench of seeded deals measures the bands off that same resolver. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.teaLevels || [];
  const deepIds = ["s25", "s26", "s27", "s28", "s29", "s30"];

  check("game-tea-house", "the ladder holds at least thirty sittings",
    levels.length >= 30, String(levels.length));
  check("game-tea-house", "every sitting id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-tea-house", "the long tier s25-s30 is present",
    missing.length === 0, missing.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);
  const s20 = byId.s20;
  const s24 = byId.s24;
  const s30 = byId.s30;
  const chairsOf = (level) => level.nights.reduce((a, n) => a + n.seats.length, 0);

  /* The shipped ladder is untouched, so every one of the thirty rungs still
   * has to pass the house's own prover on its own deal. */
  const ladderProblems = levels.filter((level) => App.teaSolve(level).ok !== true)
    .map((level) => level.id);
  check("game-tea-house", "every rung of the ladder clears its own prover",
    ladderProblems.length === 0, ladderProblems.join(","));

  /* The new tier is a real climb: need and chairs both rise rung by rung, and
   * every rung sits above the shipped deep tier's target. */
  const climbProblems = [];
  deep.forEach((level, index) => {
    if (level.need <= s24.need) { climbProblems.push(`${level.id} need ${level.need} not above s24's ${s24.need}`); }
    if (index > 0) {
      const prev = deep[index - 1];
      if (level.need <= prev.need) { climbProblems.push(`${level.id} need ${level.need} <= ${prev.id} ${prev.need}`); }
      if (chairsOf(level) <= chairsOf(prev)) { climbProblems.push(`${level.id} ${chairsOf(level)} chairs <= ${prev.id} ${chairsOf(prev)}`); }
    }
  });
  check("game-tea-house", "the long tier climbs in need and in chairs",
    climbProblems.length === 0, climbProblems.slice(0, 4).join(" | "));

  /* The engine's own prover, per sitting: every mood the roll can hand out has
   * a tray answer and a proven listening path inside the night budget, and the
   * replayed best line wins the sitting's own deal with the top band set by
   * that line and above the printed target. */
  const solveProblems = [];
  deep.forEach((level) => {
    const solve = App.teaSolve(level);
    if (!solve.ok) {
      solveProblems.push(`${level.id} prover: ${solve.unreachable.join("; ") || "best line short of target"}`);
      return;
    }
    const line = App.teaBestLine(level);
    const bands = App.teaBands(level);
    if (!line.win) { solveProblems.push(`${level.id} best line ${line.soothed} misses ${line.target}`); }
    if (line.soothed !== bands[0]) { solveProblems.push(`${level.id} top band ${bands[0]} != replayed line ${line.soothed}`); }
    if (bands[0] <= bands[2]) { solveProblems.push(`${level.id} top band ${bands[0]} not above target ${bands[2]}`); }
  });
  check("game-tea-house",
    "the prover clears every long sitting and the replayed line wins above its own target",
    solveProblems.length === 0, solveProblems.slice(0, 4).join(" | "));

  /* One seeded deal per trial through the same resolver the panel drives: the
   * sitting's own seed offsets the roll instead of a foreign stream, so every
   * rung is benched the way its own deal was anchored. s20 runs the identical
   * bench as the shipped calibration point. */
  const TRIALS = 24;
  const benchLine = (level, trial) => {
    const variant = Object.assign({}, level, {
      id: level.id + "-bench-" + trial,
      seed: level.seed + 911 * (trial + 1)
    });
    levels.push(variant);
    try { return App.teaBestLine(variant); } finally { levels.pop(); }
  };
  const bench = (level) => {
    const bands = App.teaBands(level);
    let wins = 0;
    let reach = 0;
    for (let trial = 0; trial < TRIALS; trial += 1) {
      const line = benchLine(level, trial);
      if (line.soothed >= Math.max(1, level.need)) { wins += 1; }
      if (line.soothed >= bands[0]) { reach += 1; }
    }
    return { wins, reach, bands };
  };

  const s20Bench = bench(s20);
  const benchProblems = [];
  deep.forEach((level) => {
    const run = bench(level);
    if (run.wins === 0) { benchProblems.push(`${level.id} no seeded deal reaches the target`); }
    if (run.wins > s20Bench.wins) {
      benchProblems.push(`${level.id} wins ${run.wins}/${TRIALS} over the shipped peak's ${s20Bench.wins}`);
    }
    if (run.reach >= run.wins || run.reach === 0) {
      benchProblems.push(`${level.id} top band ${run.bands[0]} reached on ${run.reach} of ${run.wins} wins`);
    }
    if (chairsOf(level) - level.need >= chairsOf(s20) - s20.need) {
      benchProblems.push(`${level.id} allows ${chairsOf(level) - level.need} dropped chairs, s20 allows ${chairsOf(s20) - s20.need}`);
    }
    if (chairsOf(level) - App.teaBestLine(level).soothed > chairsOf(s20) - App.teaBestLine(s20).soothed) {
      benchProblems.push(`${level.id} best play drops more chairs than s20's best play does`);
    }
  });
  check("game-tea-house",
    "every long sitting wins less often than the shipped peak and lands above its own floor",
    benchProblems.length === 0, benchProblems.slice(0, 4).join(" | "));
  check("game-tea-house",
    "the shipped peak itself still clears its bench",
    s20Bench.wins > 0 && s20Bench.reach > 0,
    `s20 wins ${s20Bench.wins}/${TRIALS}, top band reached ${s20Bench.reach}`);

  /* The summit is s30: it closes the ladder, carries the largest room and the
   * highest target, and its replayed line is the longest in the house. */
  const summitProblems = [];
  if (levels[levels.length - 1].id !== "s30") { summitProblems.push("s30 is not the last sitting"); }
  if (s30.need !== Math.max.apply(null, levels.map((level) => level.need))) {
    summitProblems.push(`s30 need ${s30.need} is not the ladder maximum`);
  }
  if (chairsOf(s30) !== Math.max.apply(null, levels.map(chairsOf))) {
    summitProblems.push(`s30 chairs ${chairsOf(s30)} are not the widest room`);
  }
  if (s30.need <= s20.need) { summitProblems.push(`s30 need ${s30.need} not above s20's ${s20.need}`); }
  const s30Line = App.teaBestLine(s30);
  const longest = Math.max.apply(null, levels.map((level) => App.teaBestLine(level).soothed));
  if (s30Line.soothed !== longest) { summitProblems.push(`s30 line ${s30Line.soothed} is not the house's longest`); }
  check("game-tea-house", "s30 is the summit: the last sitting, the widest room, the highest target",
    summitProblems.length === 0, summitProblems.slice(0, 4).join(" | "));

  /* The long nights keep the shipped voice: every claim the house hands over
   * speaks in both languages. */
  const voiceProblems = [];
  deep.forEach((level) => {
    level.nights.forEach((night, ni) => {
      (night.gossip || []).forEach((entry) => {
        if (entry.rumour && (!entry.en || !entry.zh)) {
          voiceProblems.push(`${level.id} night ${ni + 1}: ${entry.id}`);
        }
      });
    });
  });
  check("game-tea-house", "every long-tier rumour carries a line in both languages",
    voiceProblems.length === 0, voiceProblems.slice(0, 4).join(" | "));

  /* The tier's names resolve in both languages. */
  const copyProblems = deep.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-tea-house", "the six long sitting names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each sitting in order
   * hands the player exactly the next one, all the way to s30. */
  const chain = App.createCampaign({
    key: "tea-house-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey }))
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 99, better: "high" });
    if (outcome.firstClear) { walked += 1; }
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) { chained = false; }
  });
  check("game-tea-house", "the unlock chain walks every sitting in order",
    walked === levels.length && chained && chain.clearedCount() === levels.length,
    walked + " first clears");
};
