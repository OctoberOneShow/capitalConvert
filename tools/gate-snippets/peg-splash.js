"use strict";

/* game-peg-splash: the deep tier teaches the one lever the calm ladder
 * never touched - crosswind - and the gate proves it through the board's
 * own engine, not around it.
 *
 * By b20 every other lever was spent: six balls, forty oranges out of the
 * same 84-peg field, the bucket at five times its opening speed. So rungs
 * 21-24 hold all of that fixed and spend the whole lesson on the wind: the
 * gust climbs twenty a rung and switches banks, and no shipped rung carries
 * a wind field at all. The engine is the panel's own physics - the module
 * deals the field and steps the ball through pegStepBall, and it exports
 * the same deal and the same flight law to this gate (App.pegSplashField,
 * App.pegSplashSimulate, a 1/120s-stepped replay that rolls no die of its
 * own; rand only flows to the hand). Three hands sit the bench: a probing
 * hand that reads candidate lines through the flight law before committing
 * (a strong hand clears every deep rung at its three-star band), a trembling
 * hand that plays the probing line with a seeded execution tremor (clears a
 * rung now and then, never three-stars), and a naive hand that fires
 * straight down (carries nothing). The wind is load-bearing twice over: the
 * same trembling bench on the same boards under a calm sky clears strictly
 * more, and one identical straight drop scores a different board with the
 * wind on. The bands are the strong hand's own measured line, not invented.
 */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.pegSplashLevels || [];
  const deepIds = ["b21", "b22", "b23", "b24"];

  check("game-peg-splash", "the ladder holds twenty-four boards",
    levels.length === 24, String(levels.length));
  check("game-peg-splash", "every board id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-peg-splash", "the deep tier b21-b24 is present",
    missing.length === 0, missing.join(","));
  check("game-peg-splash", "the deep tier is the ladder's back straight",
    deepIds.every((id, i) => levels[levels.length - 4 + i] &&
      levels[levels.length - 4 + i].id === id),
    "last four: " + levels.slice(-4).map((level) => level.id).join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);
  const shallow = levels.filter((level) => deepIds.indexOf(level.id) === -1);

  /* The lesson is structural: every shipped rung leaves the wind field off
   * and the panel plays those boards calm, while the deep tier's gust
   * climbs twenty a rung and switches banks - reading the chevrons both
   * ways is the tier's work. Everything else b20 fixed stays fixed. */
  const calmShipped = shallow.every((level) => level.wind === undefined);
  const deepWinds = deep.every((level) => level.wind !== undefined);
  const gustShape = deep.map((level) => level.wind).join(",") === "40,-60,80,-100" &&
    deep.every((level, i) => i === 0 ||
      Math.abs(level.wind) - Math.abs(deep[i - 1].wind) === 20) &&
    deep.every((level, i) => i === 0 || Math.sign(level.wind) !== Math.sign(deep[i - 1].wind));
  const heldFixed = deep.every((level) =>
    level.balls === 6 && level.orange === 40 && level.bucketSpeed === 500);
  check("game-peg-splash",
    "rungs 1-20 ship calm, the deep gust climbs twenty a rung switching banks, all else held at b20",
    calmShipped && deepWinds && gustShape && heldFixed,
    "winds " + deep.map((level) => level.wind).join(","));

  /* The counterfactual twin changes only the sky: the calm twin of a deep
   * rung deals the identical field through the module's own deal, and every
   * deep board really lays its forty targets. */
  const fieldProblems = [];
  deep.forEach((level) => {
    const windy = App.pegSplashField(level);
    const calm = App.pegSplashField(Object.assign({}, level, { wind: 0 }));
    const same = windy.length === calm.length && windy.every((peg, i) =>
      peg.x === calm[i].x && peg.y === calm[i].y && peg.orange === calm[i].orange);
    if (!same) {
      fieldProblems.push(level.id + ": the calm twin deals a different field");
    }
    if (windy.filter((peg) => peg.orange).length !== level.orange) {
      fieldProblems.push(level.id + ": deals " +
        windy.filter((peg) => peg.orange).length + " of " + level.orange + " targets");
    }
  });
  check("game-peg-splash",
    "every deep board lays its forty targets and its calm twin deals the identical field",
    fieldProblems.length === 0, fieldProblems.slice(0, 4).join(" | "));

  /* The bench hands, over the panel's own simulator. The probing hand reads
   * candidate lines through the flight law before committing - coarse sweep,
   * target-aimed endgame, one local refine - and values a bucket catch the
   * way the campaign does, as balls in the bank. The trembling hand plays
   * the same lines with a seeded tremor in the shot, so every seed is a
   * different execution of the same read. */
  const ANGLES = [];
  for (let i = 0; i < 18; i += 1) ANGLES.push(0.28 + (Math.PI - 0.56) * i / 17);
  const HOLDS = [];
  for (let h = 0; h < 1.47; h += 1.47 / 7) HOLDS.push(h);
  const scoreOf = (view, r) => {
    const need = view.orangeLeft() > view.ballsLeft * 4;
    return (r.end === "cleared" ? 1e6 : 0) + r.orangeKilled * 100 + r.gained * 0.2 +
      (r.end === "caught" ? (need ? 250 : 60) : 0);
  };
  const bestOf = (view, cands) => {
    let best = null;
    let bestScore = -Infinity;
    for (const c of cands) {
      const s = scoreOf(view, view.probe(c));
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    return { best, bestScore };
  };
  const strongPolicy = (shots, view) => {
    const cands = [];
    for (const a of ANGLES) for (const h of HOLDS) cands.push({ angle: a, hold: h });
    const targets = view.targets();
    if (targets.length <= 8) {
      for (const tg of targets) {
        const direct = Math.atan2(tg.y - 18, tg.x - 160);
        for (const off of [-0.09, -0.06, -0.03, 0, 0.03, 0.06, 0.09]) {
          const a = Math.max(0.26, Math.min(Math.PI - 0.26, direct + off));
          for (const h of [0, 0.37, 0.74, 1.1]) cands.push({ angle: a, hold: h });
        }
      }
    }
    let pick = bestOf(view, cands);
    for (let round = 0; round < 2 && pick.best; round += 1) {
      const fine = [];
      for (const off of [-0.012, -0.006, 0, 0.006, 0.012]) {
        const a = Math.max(0.26, Math.min(Math.PI - 0.26, pick.best.angle + off));
        fine.push({ angle: a, hold: Math.max(0, pick.best.hold - 0.05) });
        fine.push({ angle: a, hold: pick.best.hold + 0.05 });
      }
      const refined = bestOf(view, fine);
      if (refined.bestScore > pick.bestScore) pick = refined;
    }
    return pick.best;
  };
  const tremblingPolicy = (noise) => (shots, view) => {
    const pick = strongPolicy(shots, view);
    if (!pick) return null;
    const r = view.rand();
    return {
      angle: Math.max(0.26, Math.min(Math.PI - 0.26, pick.angle + (r * 2 - 1) * noise)),
      hold: pick.hold,
    };
  };
  const naivePolicy = (shots, view) => {
    const r = view.rand();
    return { angle: Math.PI / 2 + (r * 2 - 1) * 0.15, hold: 0 };
  };
  const lcg = (seed) => {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };
  const NOISE_SEEDS = [11, 22, 33, 44, 55, 66, 77, 88];
  const benchTrembling = (level) => {
    let clears = 0;
    let threeStars = 0;
    NOISE_SEEDS.forEach((seed) => {
      const run = App.pegSplashSimulate(level, tremblingPolicy(0.015), lcg(seed));
      if (run.cleared) {
        clears += 1;
        if (run.stars === 3) threeStars += 1;
      }
    });
    return { clears, threeStars };
  };

  /* Engine proof, rung by rung: the probing hand clears the shipped peak
   * (calibrating the bench) and every deep rung, finishing each with at
   * least its three-star bank, and the sim pays the stars through the same
   * bands the panel pays - bands ordered, nothing invented. */
  const proofProblems = [];
  [byId.b20].concat(deep).forEach((level) => {
    const run = App.pegSplashSimulate(level, strongPolicy, lcg(7));
    if (!run.cleared) {
      proofProblems.push(level.id + ": the probing hand does not clear");
      return;
    }
    if (level.starBands) {
      const bands = level.starBands;
      if (!(bands[0] > bands[1] && bands[1] > bands[2])) {
        proofProblems.push(level.id + ": bands do not descend " + bands.join("/"));
      }
      if (run.ballsLeft < bands[0] || run.stars !== 3) {
        proofProblems.push(level.id + ": cleared with " + run.ballsLeft +
          " balls, under the three-star band " + bands[0]);
      }
    }
  });
  check("game-peg-splash",
    "the probing hand clears the shipped peak and every deep rung at its measured three-star bank",
    proofProblems.length === 0, proofProblems.slice(0, 4).join(" | "));

  /* Reachable but not free: the trembling hand still lands a deep rung now
   * and then but never three-stars one, and the naive straight hand carries
   * nothing at all - the tier asks for reads, not luck. */
  const benchProblems = [];
  const naiveTier = { clears: 0, threeStars: 0 };
  deep.forEach((level) => {
    const tremble = benchTrembling(level);
    if (tremble.clears < 1 || tremble.clears > 4) {
      benchProblems.push(level.id + ": trembling hand clears " + tremble.clears + "/8");
    }
    if (tremble.threeStars !== 0) {
      benchProblems.push(level.id + ": trembling hand three-starred " + tremble.threeStars + "/8");
    }
    NOISE_SEEDS.forEach((seed) => {
      const run = App.pegSplashSimulate(level, naivePolicy, lcg(seed));
      if (run.cleared) {
        naiveTier.clears += 1;
        if (run.stars === 3) naiveTier.threeStars += 1;
      }
    });
  });
  if (naiveTier.clears > 2 || naiveTier.threeStars !== 0) {
    benchProblems.push("naive hand carried " + naiveTier.clears + " clears, " +
      naiveTier.threeStars + " three-star");
  }
  check("game-peg-splash",
    "the deep top band is reachable but not free: a trembling hand scrapes a rung, a naive hand carries nothing",
    benchProblems.length === 0, benchProblems.slice(0, 4).join(" | "));

  /* The wind is load-bearing, twice measured. Hand every deep board a calm
   * sky and the same trembling bench on the same field and seeds clears
   * strictly more; and one identical straight drop - same cannon, same
   * clock, same field - scores a different board with the wind on, which is
   * the shove itself showing up in the engine's own currency. */
  const counterProblems = [];
  deep.forEach((level) => {
    const twin = Object.assign({}, level, { wind: 0 });
    const windy = benchTrembling(level);
    const calm = benchTrembling(twin);
    if (calm.clears <= windy.clears) {
      counterProblems.push(level.id + ": calm bench clears " + calm.clears +
        " against the windy " + windy.clears);
    }
    const drop = { angle: Math.PI / 2, hold: 0 };
    const oneShot = (shots) => (shots === 0 ? drop : null);
    const flewWind = App.pegSplashSimulate(level, oneShot, lcg(3));
    const flewCalm = App.pegSplashSimulate(twin, oneShot, lcg(3));
    if (flewWind.score === flewCalm.score) {
      counterProblems.push(level.id + ": the straight drop flew the same board calm");
    }
  });
  check("game-peg-splash",
    "the same boards bench easier under a calm sky and the same drop flies differently under wind",
    counterProblems.length === 0, counterProblems.slice(0, 4).join(" | "));

  /* The tier's names resolve in both languages, and the guide names the
     crosswind in both too - the chevrons are nothing without a heads-up. */
  const copyProblems = deep.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-peg-splash", "the four deep board names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
  const guideEn = (App.I18N && App.I18N.en && App.I18N.en.pegHint) || "";
  const guideZh = (App.I18N && App.I18N.zh && App.I18N.zh.pegHint) || "";
  check("game-peg-splash", "the guide warns about the crosswind in both languages",
    /crosswind/i.test(guideEn) && guideEn.indexOf("New tier") !== -1 &&
      guideZh.indexOf("侧风") !== -1 && guideZh.indexOf("新层级") !== -1,
    "en " + /crosswind/i.test(guideEn) + ", zh " + (guideZh.indexOf("侧风") !== -1));

  /* The unlock chain is derived, never stored: clearing each board in order
   * hands the player exactly the next one, all twenty-four times. */
  const chain = App.createCampaign({
    key: "peg-splash-gate-chain",
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
  check("game-peg-splash", "the unlock chain walks all twenty-four boards in order",
    walked === 24 && chained && chain.clearedCount() === 24, walked + " first clears");
};
