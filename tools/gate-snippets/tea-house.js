"use strict";

/* game-tea-house: the deep tier empties the room, and the house's own prover
 * sits witness on every deal.
 *
 * The tray, the grudges and the urgent moods were all spent by s20, so the
 * tier's lever is the roster: rungs 21-24 bring the chair rotation out of the
 * s4/s5 tutorial drawer and drop the table from four seats to three and
 * finally two. Nothing in the engine is new, which is exactly what the gate
 * holds the tier to: App.teaSolve proves every mood of every chair on every
 * night has a proven path inside the night's budget, App.teaBestLine replays
 * the real resolver to a win on the sitting's own deal, and a bench of seeded
 * deals measures the bands off that same resolver - three stars reachable but
 * not free, and the whole tier won less often than the shipped peak on the
 * same stream. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.teaLevels || [];
  const deepIds = ["s21", "s22", "s23", "s24"];

  check("game-tea-house", "the ladder holds twenty-four sittings",
    levels.length === 24, String(levels.length));
  check("game-tea-house", "every sitting id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-tea-house", "the deep tier s21-s24 is present",
    missing.length === 0, missing.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);
  const s20 = byId.s20;
  const chairsOf = (level) => level.nights.reduce((a, n) => a + n.seats.length, 0);

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
    "the prover clears every deep sitting and the replayed line wins at its own band",
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
    "every deep sitting wins less often than the shipped peak and lands above its own floor",
    benchProblems.length === 0, benchProblems.slice(0, 4).join(" | "));
  check("game-tea-house",
    "the shipped peak itself still clears its bench",
    s20Bench.wins > 0 && s20Bench.reach > 0,
    `s20 wins ${s20Bench.wins}/${TRIALS}, top band reached ${s20Bench.reach}`);

  /* The deep nights keep the shipped voice: every claim the house hands over
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
  check("game-tea-house", "every deep rumour carries a line in both languages",
    voiceProblems.length === 0, voiceProblems.slice(0, 4).join(" | "));

  /* The tier's names resolve in both languages. */
  const copyProblems = deep.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-tea-house", "the four deep sitting names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each sitting in order
   * hands the player exactly the next one, all twenty-four times. */
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
  check("game-tea-house", "the unlock chain walks all twenty-four sittings in order",
    walked === 24 && chained && chain.clearedCount() === 24, walked + " first clears");
};
