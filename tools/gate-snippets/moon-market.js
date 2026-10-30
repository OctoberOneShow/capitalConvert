"use strict";

/* game-moon-market: the deep tier taxes time itself, and the summit taxes the
 * exit; the gate makes every week pay for its own bands.
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
 * and by measurement: no rung outside the ramp tiers carries the field, and
 * cutting it out of a deep row's copy changes what the same carrier line
 * banks on that row.
 *
 * Seats 25-30 are the summit tier and bend the last lever, `toll`: credits a
 * unit pays the house on every exit, each sale and the day-7 bell alike, so a
 * round trip has to clear the toll on top of the fees and a churned week pays
 * it again on every re-entry. The ratchet climbs 4-5-6-7-8-9 across the six,
 * mixed with the levers the ladder already taught. The bench replays every
 * summit week through the same engine: the toll-aware line - the deep tier's
 * proven ramp shape with the toll netted into the round-trip gain and a hold
 * kept through a dip a later exit still wins - banks exactly its top band on
 * the row's own seed, while the toll-blind bench that three-stars m24 (the
 * shipped greedy, the ramp-aware prover, the daily flipper and the
 * buy-and-hold carrier) cannot bank a single star on any summit row. Where no
 * toll is charged the toll-aware line replays the deep tier's line exactly,
 * and cutting the toll out of a summit row's copy lets the old blind line
 * overshoot what it banked under the toll: the house cut is what held it
 * back. The hook is inert where the field is absent: every shallow week
 * replayed with a fake toll:0 clone walks day for day identically. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.marketLevels;
  const deepIds = ["m21", "m22", "m23", "m24"];
  const summitIds = ["m25", "m26", "m27", "m28", "m29", "m30"];
  const probeSeeds = [11, 101, 1009, 4243];
  const mktDays = 7;

  check("game-moon-market", "the ladder holds thirty seats",
    Array.isArray(levels) && levels.length === 30, String(levels && levels.length));
  check("game-moon-market", "every seat id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-moon-market", "the deep tier m21-m24 is present",
    missing.length === 0, missing.join(","));
  const missingSummit = summitIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-moon-market", "the summit tier m25-m30 is present",
    missingSummit.length === 0, missingSummit.join(","));
  check("game-moon-market", "the deep and summit tiers sit at the tail in order",
    levels.slice(20).map((level) => level.id).join(",") ===
      deepIds.concat(summitIds).join(","),
    levels.slice(20).map((level) => level.id).join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]).filter(Boolean);
  const summit = summitIds.map((id) => byId[id]).filter(Boolean);

  /* The ramp is structural: no rung outside the two ramp tiers carries the
   * field the deep tier's mechanic reads, so shallow weeks replay exactly as
   * they shipped. */
  const rampTiers = deepIds.concat(summitIds);
  const shallowRamped = levels.filter((level) =>
    !rampTiers.includes(level.id) &&
    Object.prototype.hasOwnProperty.call(level, "feeRamp"));
  check("game-moon-market", "no rung outside the ramp tiers carries the carry ramp",
    shallowRamped.length === 0, shallowRamped.map((level) => level.id).join(","));

  /* The toll is structural too: every summit rung carries it, no rung before
   * the summit does, and the ratchet climbs 4-5-6-7-8-9 with no plateau. */
  const tollRungs = levels.filter((level) =>
    !summitIds.includes(level.id) &&
    Object.prototype.hasOwnProperty.call(level, "toll"));
  check("game-moon-market", "no rung before the summit carries the exit toll",
    tollRungs.length === 0, tollRungs.map((level) => level.id).join(","));
  const summitTolls = summit.map((level) => level.toll);
  check("game-moon-market", "every summit rung carries a toll and the ratchet climbs 4-9",
    summitTolls.join(",") === "4,5,6,7,8,9" &&
      summitTolls.every((toll, index) => index === 0 || toll > summitTolls[index - 1]),
    summitTolls.join(","));

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

  /* The summit's toll-aware line: the ramp-aware prover's shape with the two
   * lessons the toll teaches - a round trip only fires when its rise clears
   * the toll as well as the carry, and a hold in a dip is kept when a later
   * exit nets more after toll and carry and the purse can wait there. With
   * no toll charged it is the deep tier's own line. */
  const tollGreedy = (level, sched, state) => {
    const toll = level.toll || 0;
    const feeAt = (day) => level.fee + (level.feeRamp ? level.feeRamp * day : 0);
    const ev = sched.events[state.day];
    const blocked = ev && ev.kind === "storm" ? ev.goods : -1;
    const day = state.day;
    const p = sched.prices[day];
    const n = sched.prices[day + 1] || sched.prices[mktDays];
    const perUnit = feeAt(day);
    const actions = [0, 0, 0, 0];
    let held = 0;
    for (let i = 0; i < 4; i += 1) {
      held += state.holds[i];
    }
    /* the fee bill for the whole hold from tonight up to (not counting) d2 -
     * the purse has to be able to pay its way to a later exit. */
    const carryTo = (d2, units) => {
      let cost = 0;
      for (let k = day; k < d2; k += 1) cost += feeAt(k);
      return cost * units;
    };
    for (let i = 0; i < 4; i += 1) {
      if (!(state.holds[i] > 0) || i === blocked) continue;
      if (!(n[i] - p[i] <= perUnit || day === mktDays - 1)) continue;
      let better = false;
      for (let d2 = day + 1; d2 <= mktDays && !better; d2 += 1) {
        const fees = carryTo(d2, held);
        if (fees > state.cash) break;
        const price = d2 < mktDays ? sched.prices[d2][i] : sched.prices[mktDays][i];
        if (price - toll - fees > p[i] - toll) better = true;
      }
      if (!better) {
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
      const gain = n[i] - p[i] - perUnit - toll;
      if (gain > bestGain) {
        bestGain = gain;
        bestI = i;
      }
    }
    if (bestI >= 0 && day < mktDays - 1 && p[bestI] > 0) {
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
   * overnight riser net of tonight's ramped fee - cargo never sleeps twice,
   * so on a tolled week the house is paid every single day. */
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
      const budget = state.cash - (level.fee + (level.feeRamp || 0) * state.day) * 2 - 1;
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
   * settlement liquidate whatever the toll and the ramp have left. */
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

  /* A row's copy with one field cut out, so a proof can show the mechanic it
   * names is load-bearing - or inert where the field never shipped. */
  const withoutField = (level, field, fake) => {
    const copy = {};
    Object.keys(level).forEach((key) => {
      if (key !== field) copy[key] = level[key];
      else if (fake !== undefined) copy[key] = fake;
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
        const holdFlat = carrierLine(withoutField(level, "feeRamp"), seed);
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

  /* The summit's bands and proofs. On every summit seat's own week the
   * toll-aware line banks at least its top band while every toll-blind hand
   * - including the ramp-aware prover that three-stars m24 - stays under the
   * target: the star is unreachable without reading the toll. The blind
   * greedy replays on a toll:0 copy strictly above what it banked under the
   * toll, the toll-aware line replays the deep tier's line exactly where no
   * toll is charged, and every probe week settles to a number. */
  const summitBandProblems = [];
  const summitProofProblems = [];
  const cutProblems = [];
  summit.forEach((level) => {
    const band = level.starCredits;
    const name = `${level.id} toll=${level.toll}` +
      (level.feeRamp ? ` ramp=${level.feeRamp}` : "");
    if (!Array.isArray(band) || band.length !== 3 ||
        !(band[0] > band[1] && band[1] > band[2])) {
      summitBandProblems.push(name + " bands do not descend " + String(band));
      return;
    }
    seeded(9127, () => {
      [level.seed].concat(probeSeeds).forEach((seed) => {
        const greedy = playLine(level, App.marketGreedy, seed);
        const ramp = playLine(level, rampGreedy, seed);
        const flip = playLine(level, flipper, seed);
        const aware = playLine(level, tollGreedy, seed);
        const hold = carrierLine(level, seed);
        const hands = [greedy, ramp, flip, aware, hold];
        if (!hands.every((v) => typeof v === "number" && isFinite(v))) {
          summitProofProblems.push(`${level.id} seed ${seed} a replay did not settle to a number`);
          return;
        }
        if (seed !== level.seed) return;
        const stars = (value) => App.starsFor(value, band, "high");
        if (stars(aware) !== 3 || aware < band[0]) {
          summitProofProblems.push(`${level.id} the toll-aware line does not bank the` +
            ` top band (${aware} vs ${band.join("/")})`);
        }
        const blindBest = Math.max(greedy, ramp, flip, hold);
        if (stars(blindBest) !== 0) {
          summitProofProblems.push(`${level.id} a toll-blind hand banks a star` +
            ` (best ${blindBest} vs target ${band[2]})`);
        }
        const greedyCut = playLine(withoutField(level, "toll"), App.marketGreedy, seed);
        if (!(greedyCut > greedy)) {
          cutProblems.push(`${level.id} cutting the toll does not free the blind line` +
            ` (${greedy} tolled vs ${greedyCut} cut)`);
        }
      });
    });
    const ceiling = App.marketCeiling(level);
    if (!(band[0] > ceiling)) {
      summitBandProblems.push(`${name} top band ${band[0]} <= greedy ceiling ${ceiling}`);
    }
  });
  check("game-moon-market",
    "every summit band descends and tops the seat's own greedy ceiling",
    summitBandProblems.length === 0, summitBandProblems.join(" | "));
  check("game-moon-market",
    "on every summit week the toll-aware line banks three stars and no toll-blind hand banks one",
    summitProofProblems.length === 0, summitProofProblems.join(" | "));
  check("game-moon-market",
    "cutting the toll out of a summit row lets the old blind line overshoot its tolled bank",
    cutProblems.length === 0, cutProblems.join(" | "));

  /* The contrast that makes the tier the summit: the deep tier's own
   * toll-blind prover line three-stars m24 and replays unchanged on the
   * toll-aware line where no toll is charged - and the same lines cannot
   * bank a single star on any summit row. */
  const m24 = byId.m24;
  const m24Line = m24 ? playLine(m24, rampGreedy, m24.seed) : 0;
  const contrastProblems = [];
  if (!m24 || App.starsFor(m24Line, m24.starCredits, "high") !== 3) {
    contrastProblems.push(`m24's ramp-aware prover banks ${m24Line}, not three stars`);
  }
  deep.forEach((level) => {
    if (playLine(level, tollGreedy, level.seed) !==
        playLine(level, rampGreedy, level.seed)) {
      contrastProblems.push(`${level.id}: with no toll the summit line must replay the deep tier's line`);
    }
  });
  summit.forEach((level) => {
    const stars = App.starsFor(playLine(level, rampGreedy, level.seed),
      level.starCredits, "high");
    if (stars !== 0) {
      contrastProblems.push(`${level.id}: m24's toll-blind prover line banks ${stars} stars`);
    }
  });
  check("game-moon-market",
    "the line that three-stars m24 falls to zero stars on every summit rung, and the summit line replays it where no toll is charged",
    contrastProblems.length === 0, contrastProblems.join(" | "));

  /* The hook is inert where the field never shipped: every shallow week
   * replayed through a toll:0 clone walks day for day identically - same
   * cash, cargo and flags each day, same settlement. */
  const weekPrint = (level, seed) => {
    const sched = App.marketSchedule(level, seed);
    let state = App.marketDeal(level, seed);
    const days = [];
    let guard = 0;
    while (state.status === "open" && guard < mktDays + 2) {
      days.push([state.day, state.cash, state.holds.join("/"),
        state.bought.join("/"), state.sold.join("/")].join(":"));
      state = App.marketStep(state, seed, App.marketGreedy(level, sched, state)).state;
      guard += 1;
    }
    days.push([state.day, state.status, state.credits].join(":"));
    return days.join("|");
  };
  const inertProblems = [];
  levels.filter((level) => !summitIds.includes(level.id)).forEach((level) => {
    [level.seed].concat(probeSeeds).forEach((seed) => {
      if (weekPrint(level, seed) !==
          weekPrint(withoutField(level, "toll", 0), seed)) {
        inertProblems.push(`${level.id} seed ${seed} moved under a fake toll:0`);
      }
    });
  });
  check("game-moon-market",
    "every pre-summit week replays byte-identically with a fake toll:0 on its copy",
    inertProblems.length === 0, inertProblems.join(" | "));

  /* The tier's names travel with the page: both languages hold a real string
   * and t() never falls back to the raw key. */
  const copyProblems = deep.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-moon-market", "the four deep seat names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  const summitCopyProblems = summit.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-moon-market", "the six summit seat names resolve in both languages",
    summitCopyProblems.length === 0, summitCopyProblems.join(","));

  /* The guide teaches both tiers' mechanics in both languages. */
  const desc = (typeof App.getRegisteredGames === "function"
    ? App.getRegisteredGames() : [])
    .find((entry) => entry && entry.name === "moonMarket");
  const guideOk = !!desc && !!desc.guide &&
    desc.guide.en.some((line) => /carry ramp|feeRamp/.test(line)) &&
    desc.guide.zh.some((line) => /仓储爬坡|feeRamp/.test(line));
  check("game-moon-market", "the guide teaches the carry ramp in both languages",
    guideOk, desc && desc.guide ? "guide lines found" : "moonMarket guide missing");
  const summitGuideOk = !!desc && !!desc.guide &&
    desc.guide.en.some((line) => /Summit: seats 25-30/.test(line) && /toll/.test(line)) &&
    desc.guide.zh.some((line) => /巅峰段/.test(line) && /toll/.test(line));
  check("game-moon-market", "the guide teaches the exit toll in both languages",
    summitGuideOk, desc && desc.guide ? "summit guide lines found" : "moonMarket guide missing");

  /* The unlock chain is derived, never stored: clearing each seat in order
   * hands the player exactly the next one, all thirty times. */
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
  check("game-moon-market", "the unlock chain walks all thirty seats in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
