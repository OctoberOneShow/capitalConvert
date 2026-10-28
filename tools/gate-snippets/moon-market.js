"use strict";

/* game-moon-market: the deep tier taxes time itself, and the gate makes the
 * week pay for its own bands.
 *
 * Seats 21-24 bend one new lever, `feeRamp`: the nightly storage fee grows by
 * that many credits per held unit every day (day d charges fee + feeRamp*d),
 * so a hold bought early sleeps cheap and the same cargo carried toward the
 * weekend is taxed out of the sky. Nothing here is assumed. Every claim is a
 * line replayed day by day through the module's own marketStep on the seat's
 * seeded week: the seat's blind greedy run banks exactly its one-star band, a
 * buy-and-hold carrier banks nothing once the ramp has bitten it, and a
 * ramp-aware prover (the greedy shape with tonight's real per-unit fee in the
 * sell test and the float guard, plus a same-day flipper) banks the three-star
 * line the blind greedy cannot reach. The ramp is load-bearing by structure
 * and by measurement: no shipped rung carries the field, and cutting it out of
 * a deep row's copy changes what the same carrier line banks on that row. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.marketLevels;
  const deepIds = ["m21", "m22", "m23", "m24"];
  const probeSeeds = [11, 101, 1009, 4243];
  const mktDays = 7;

  check("game-moon-market", "the ladder holds twenty-four seats",
    Array.isArray(levels) && levels.length === 24, String(levels && levels.length));
  check("game-moon-market", "every seat id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-moon-market", "the deep tier m21-m24 is present",
    missing.length === 0, missing.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]).filter(Boolean);

  /* The ramp is structural: not one shipped rung carries the field the deep
   * tier's mechanic reads, so shallow weeks replay exactly as they shipped. */
  const shallowRamped = levels.filter((level) =>
    !deepIds.includes(level.id) &&
    Object.prototype.hasOwnProperty.call(level, "feeRamp"));
  check("game-moon-market", "no shipped rung carries the carry ramp",
    shallowRamped.length === 0, shallowRamped.map((level) => level.id).join(","));

  /* Deterministic replay: Math.random pinned to a stream so even a stray draw
   * cannot move a week; the engine itself is seeded by the row. */
  const seeded = (seed, fn) => {
    const real = Math.random;
    let state = seed >>> 0;
    Math.random = () => {
      state = (Math.imul(state, 1103515245) + 12345) >>> 0;
      return state / 4294967296;
    };
    try { return fn(); } finally { Math.random = real; }
  };

  /* The ramp-aware prover: the shipped greedy's shape with tonight's real
   * per-unit fee in both the sell test and the float guard. */
  const rampGreedy = (level, sched, state) => {
    const ev = sched.events[state.day];
    const blocked = ev && ev.kind === "storm" ? ev.goods : -1;
    const p = sched.prices[state.day];
    const n = sched.prices[state.day + 1] || sched.prices[mktDays];
    const perUnit = level.fee + (level.feeRamp ? level.feeRamp * state.day : 0);
    const actions = [0, 0, 0, 0];
    let held = 0;
    for (let i = 0; i < 4; i += 1) {
      held += state.holds[i];
    }
    for (let i = 0; i < 4; i += 1) {
      if (state.holds[i] > 0 && i !== blocked &&
          (n[i] - p[i] <= perUnit || state.day === mktDays - 1)) {
        actions[i] = -state.holds[i];
        held -= state.holds[i];
      }
    }
    let dumped = 0;
    while (state.cash < perUnit * (held + 1) * 2 + 1 && dumped < 4) {
      dumped += 1;
      let dump = -1;
      let big = 0;
      for (let i = 0; i < 4; i += 1) {
        if (state.holds[i] > 0 && i !== blocked && actions[i] === 0 &&
            state.holds[i] > big) {
          big = state.holds[i];
          dump = i;
        }
      }
      if (dump < 0) break;
      actions[dump] = -state.holds[dump];
      held -= state.holds[dump];
    }
    let bestGain = 0;
    let bestI = -1;
    for (let i = 0; i < 4; i += 1) {
      if (i === blocked || actions[i] < 0) continue;
      const gain = n[i] - p[i] - perUnit;
      if (gain > bestGain) {
        bestGain = gain;
        bestI = i;
      }
    }
    if (bestI >= 0 && state.day < mktDays - 1 && p[bestI] > 0) {
      for (let qty = level.cap - held; qty >= 1; qty -= 1) {
        if (qty * p[bestI] <= state.cash - perUnit * (held + qty) * 2) {
          actions[bestI] = qty;
          break;
        }
      }
    }
    return actions;
  };

  /* The same-day flipper: sell everything each morning, then buy the best
   * overnight riser net of tonight's ramped fee - cargo never sleeps twice. */
  const flipper = (level, sched, state) => {
    const ev = sched.events[state.day];
    const blocked = ev && ev.kind === "storm" ? ev.goods : -1;
    const p = sched.prices[state.day];
    const n = sched.prices[state.day + 1] || sched.prices[mktDays];
    const perUnit = level.fee + (level.feeRamp ? level.feeRamp * state.day : 0);
    const actions = [0, 0, 0, 0];
    let held = 0;
    for (let i = 0; i < 4; i += 1) {
      if (state.holds[i] > 0) held += state.holds[i];
      if (state.holds[i] > 0 && i !== blocked) actions[i] = -state.holds[i];
    }
    if (state.day >= mktDays - 1) {
      return actions;
    }
    let bestGain = 0;
    let bestI = -1;
    for (let i = 0; i < 4; i += 1) {
      if (i === blocked) continue;
      const gain = n[i] - p[i] - perUnit;
      if (gain > bestGain) {
        bestGain = gain;
        bestI = i;
      }
    }
    if (bestI >= 0) {
      const budget = state.cash - (level.fee + level.feeRamp * state.day) * 2 - 1;
      const qty = Math.min(level.cap - held, Math.floor(budget / p[bestI]));
      if (qty > 0) actions[bestI] = qty;
    }
    return actions;
  };

  /* One full week of a policy through the module's own engine, on an explicit
   * seed so the prover can also walk weeks the row does not ship. */
  const playLine = (level, policy, seed) => {
    let state = App.marketDeal(level, seed);
    const sched = App.marketSchedule(level, seed);
    let guard = 0;
    while (state.status === "open" && guard < mktDays + 2) {
      state = App.marketStep(state, seed, policy(level, sched, state)).state;
      guard += 1;
    }
    return state.credits;
  };

  /* The naive carrier: half the purse into as many units of the cheapest
   * day-0 good as cap and purse allow, then hold the week and let the day-7
   * settlement liquidate whatever the ramp has left. */
  const carrierLine = (level, seed) => {
    const sched = App.marketSchedule(level, seed);
    let state = App.marketDeal(level, seed);
    const p0 = sched.prices[0];
    let cheap = 0;
    for (let i = 1; i < 4; i += 1) {
      if (p0[i] < p0[cheap]) cheap = i;
    }
    const ev = sched.events[0];
    if (ev && ev.kind === "storm" && ev.goods === cheap) cheap = (cheap + 1) % 4;
    const qty = Math.min(level.cap, Math.floor(state.cash / 2 / p0[cheap]));
    const actions = [0, 0, 0, 0];
    actions[cheap] = qty;
    let guard = 0;
    while (state.status === "open" && guard < mktDays + 2) {
      const actions0 = state.day === 0 ? actions : [0, 0, 0, 0];
      state = App.marketStep(state, seed, actions0).state;
      guard += 1;
    }
    return state.credits;
  };

  /* The row's own copy with the ramp field cut out, so the one engine line
   * that reads feeRamp is proved inert when it is absent. */
  const withoutRamp = (level) => {
    const copy = {};
    Object.keys(level).forEach((key) => {
      if (key !== "feeRamp") copy[key] = level[key];
    });
    return copy;
  };

  /* Bands: strictly descending, and the three-star line sits above the seat's
   * own measured greedy ceiling - the bar every measured seat m6-m20 ships. */
  const bandProblems = [];
  deep.forEach((level) => {
    const band = level.starCredits;
    const name = `${level.id} fee=${level.fee} ramp=${level.feeRamp}`;
    if (!Array.isArray(band) || band.length !== 3 ||
        !(band[0] > band[1] && band[1] > band[2])) {
      bandProblems.push(name + " bands do not descend " + String(band));
      return;
    }
    const ceiling = App.marketCeiling(level);
    if (!(band[0] > ceiling)) {
      bandProblems.push(`${name} top band ${band[0]} <= greedy ceiling ${ceiling}`);
    }
  });
  check("game-moon-market",
    "the deep bands descend and top the seats' own greedy ceilings",
    bandProblems.length === 0, bandProblems.join(" | "));

  /* The proofs: on each deep seat's own seeded week the blind greedy line
   * banks exactly its one-star band, a measured line banks the three-star
   * band, the carrier banks nothing; every probe week besides must at least
   * walk the engine and settle to a number. */
  const proofProblems = [];
  const rampProblems = [];
  deep.forEach((level) => {
    const band = level.starCredits;
    if (!Array.isArray(band) || band.length !== 3) return;
    seeded(9127, () => {
      [level.seed].concat(probeSeeds).forEach((seed) => {
        const greedy = playLine(level, App.marketGreedy, seed);
        const ramp = playLine(level, rampGreedy, seed);
        const flip = playLine(level, flipper, seed);
        const hold = carrierLine(level, seed);
        const plan = Math.max(greedy, ramp, flip);
        if (![greedy, ramp, flip, hold].every((v) => typeof v === "number" && isFinite(v))) {
          proofProblems.push(`${level.id} seed ${seed} a replay did not settle to a number`);
          return;
        }
        if (seed !== level.seed) return;
        const stars = (value) => App.starsFor(value, band, "high");
        if (stars(plan) !== 3) {
          proofProblems.push(`${level.id} no measured line reaches three stars` +
            ` (best ${plan} vs ${band[0]})`);
        }
        if (stars(greedy) !== 1) {
          proofProblems.push(`${level.id} the blind greedy line does not bank its` +
            ` one-star band (${greedy} in ${band.join("/")})`);
        }
        if (stars(hold) !== 0) {
          proofProblems.push(`${level.id} the carrier is not held under the target (${hold})`);
        }
        const holdFlat = carrierLine(withoutRamp(level), seed);
        if (!(hold < holdFlat)) {
          rampProblems.push(`${level.id} cutting the ramp does not drop the carrier` +
            ` (${hold} with vs ${holdFlat} without)`);
        }
      });
    });
  });
  check("game-moon-market",
    "every deep week proves greedy one star, carrier zero, a measured line three",
    proofProblems.length === 0, proofProblems.join(" | "));
  check("game-moon-market",
    "cutting the ramp out of a deep row changes what its carrier banks",
    rampProblems.length === 0, rampProblems.join(" | "));

  /* The tier's names travel with the page: both languages hold a real string
   * and t() never falls back to the raw key. */
  const copyProblems = deep.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-moon-market", "the four deep seat names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The guide teaches the tier's mechanic in both languages. */
  const desc = (typeof App.getRegisteredGames === "function"
    ? App.getRegisteredGames() : [])
    .find((entry) => entry && entry.name === "moonMarket");
  const guideOk = !!desc && !!desc.guide &&
    desc.guide.en.some((line) => /carry ramp|feeRamp/.test(line)) &&
    desc.guide.zh.some((line) => /仓储爬坡|feeRamp/.test(line));
  check("game-moon-market", "the guide teaches the carry ramp in both languages",
    guideOk, desc && desc.guide ? "guide lines found" : "moonMarket guide missing");

  /* The unlock chain is derived, never stored: clearing each seat in order
   * hands the player exactly the next one, all twenty-four times. */
  const chain = App.createCampaign({
    key: "moon-market-gate-chain",
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
  check("game-moon-market", "the unlock chain walks all twenty-four seats in order",
    walked === 24 && chained && chain.clearedCount() === 24, walked + " first clears");
};
