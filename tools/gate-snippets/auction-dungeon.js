"use strict";

/* game-auction-dungeon: the deep tier puts the doors themselves on a fuse, the
 * summit puts the sales themselves under a bell, and the hall's own resolvers
 * sit witness on every hammer.
 *
 * The auction-side levers (rival purses, reserves, the four-coin step, the
 * miser's spree) and the door-side levers (guard, rend, massed packs, the
 * warden up front) were all spent by a20, so the deep tier's lever is time at
 * the door: rungs 21-24 author `cap`, a per-door fuse of twelve rounds down to
 * eight, where every shipped rung sat the engine's own sixteen-round calendar.
 * That lever is structural - the field is absent from rungs 1-20 - and the
 * gate holds the tier to the engine's own currency: the shipped solver
 * (auctionCeiling) must clear every deep rung and the printed bands must be
 * its own measured line, the shipped trap line (auctionTakeAll) and a
 * pass-everything hand must not three-star the tier, a bench of seeded hands
 * playing the engine's own move menu - contest a seeded subset of lots, climb
 * them like the solver, shipped tactic at the doors, seeded rests at the
 * camps - must clear every rung without reaching its top band for free, and
 * the fuse must be load-bearing: the same seeded hands replayed on the shipped
 * sixteen-round calendar clear more often, on every rung some of them are
 * driven off the door by the fuse alone, and on three of the four the
 * planner's own richest line keeps strictly more with the calendar in its
 * hands.
 *
 * The summit tier a25-a30 spends the one lever the doors never touched - the
 * sale. `hammer` authors the house bell: after that many paddles the lot
 * closes with the top bid taking it, no last seat standing required, so a
 * paddle is a bid and a tick of the bell at once. The field is absent from
 * every rung before the tier, so all shipped sales resolve exactly as they
 * always did - the gate replays them byte-identically on clones that carry the
 * bell hook. The gate holds the summit to the same currency: the shipped
 * solver clears every rung at its own measured band (strictly ordered, never
 * richer than a fifth of the purse), the trap line never three-stars, a hand
 * that never bids carries nothing out, the seeded bench clears every rung
 * without reaching the top band for free, and the bell is load-bearing from
 * both sides - wide-bell lines that clear the rung are driven off it, and
 * hands the wide calendar prices out of their purse only clear under it. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.auctionLevels || [];
  const deepIds = ["a21", "a22", "a23", "a24"];
  const summitIds = ["a25", "a26", "a27", "a28", "a29", "a30"];

  check("game-auction-dungeon", "the ladder holds thirty runs",
    levels.length === 30, String(levels.length));
  check("game-auction-dungeon", "every run id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-auction-dungeon", "the deep tier a21-a24 is present",
    missing.length === 0, missing.join(","));
  const summitMissing = summitIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-auction-dungeon", "the summit tier a25-a30 is present",
    summitMissing.length === 0, summitMissing.join(","));
  check("game-auction-dungeon",
    "the deep tier sits behind the shipped twenty and the summit closes the ladder",
    deepIds.every((id, i) => levels[20 + i] && levels[20 + i].id === id) &&
      summitIds.every((id, i) => levels[levels.length - 6 + i] && levels[levels.length - 6 + i].id === id),
    "20-23: " + levels.slice(20, 24).map((level) => level.id).join(",") +
      " | tail: " + levels.slice(-6).map((level) => level.id).join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);
  const summit = summitIds.map((id) => byId[id]);
  const shipped = levels.slice(0, 20);

  /* The lesson is structural: no shipped rung carries a cap field, so all
   * twenty sit the engine's own sixteen-round door calendar, while the deep
   * tier authors its fuse - twelve rounds, then ten, nine, eight - and the
   * seated cap the panel and planner fight under is the authored one. The
   * summit's rungs carry their own fuses down to eight under the bell. */
  const shallowShipped = shipped.every((level) =>
    !level.cap && App.auctionCap(level) === 16);
  const deepFuses = deep.map((level) => level.cap);
  const deepSeated = deep.every((level) => App.auctionCap(level) === level.cap);
  const summitFuses = summit.map((level) => App.auctionCap(level));
  check("game-auction-dungeon",
    "rungs 1-20 sit the shipped sixteen-round door, the deep tier authors twelve down to eight and the summit its own down to the fuse floor",
    shallowShipped && deepSeated && deepFuses.join(",") === "12,10,9,8" &&
      summitFuses.join(",") === "10,9,9,9,8,10",
    "deep caps " + deepFuses.join(",") + " | summit caps " + summitFuses.join(","));

  /* One seeded hand = one legal line through the exported resolvers only: at
   * each lot a seeded decision to contest or pass, contested lots climbed one
   * step a turn exactly the way the shipped solver climbs, the shipped tactic
   * at the doors, a seeded rest rule at the camps. The counterfactual calendar
   * is the very same rung with its two to eight rounds handed back. */
  const lcg = (seed) => {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };
  const play = (level, hand, rand) => {
    const step = Math.max(1, level.step || 2);
    const contest = {};
    let run = App.auctionRun(level, level.seed);
    let guard = 0;
    while (run.phase !== "won" && run.phase !== "lost" && guard < 400) {
      guard += 1;
      if (run.phase === "bid") {
        if (!run.lot || run.lot.done) {
          run = App.auctionAdvance(run);
          continue;
        }
        if (contest[run.lot.item] === undefined) {
          contest[run.lot.item] = rand() < hand.contestP && run.kit.length < level.slots;
        }
        if (contest[run.lot.item] &&
            run.purse - (run.lot.price + step) >= Math.round(level.purse * hand.floorFrac)) {
          run = App.auctionRound(run, [step]).state;
        } else {
          run = App.auctionRound(run, [0]).state;
        }
        continue;
      }
      if (run.phase === "camp") {
        if (run.restsLeft > 0 && run.hp < Math.round(run.maxHp * hand.restFrac)) {
          const took = App.auctionRest(run);
          if (took.note === "mend") {
            run = took.state;
            continue;
          }
        }
        run = App.auctionAdvance(run);
        continue;
      }
      if (run.phase === "fight") {
        run = App.auctionEncounter(run, App.auctionTactic(run, App.auctionKit(run.kit))).state;
        if (run.wiped) {
          run = App.auctionAdvance(run);
        }
        continue;
      }
      run = App.auctionAdvance(run);
    }
    return run;
  };
  const wideCalendar = (level) => Object.assign({}, level, { id: level.id + "-gate16", cap: 16 });
  const withoutHammer = (level) => {
    const clone = Object.assign({}, level, { id: level.id + "-gate-wide" });
    delete clone.hammer;
    return clone;
  };

  /* Every deep rung proved through the shipped solver: the rung is clearable
   * at all, the printed three-star band is the solver's own richest line (no
   * band is invented), the bands descend for the low scorer, and the top band
   * keeps no more than a fifth of the purse - the line burns for its fuse. */
  const proofProblems = [];
  deep.forEach((level) => {
    if (!App.auctionSurvivable(level)) {
      proofProblems.push(level.id + ": the shipped solver clears nothing");
      return;
    }
    const best = App.auctionCeiling(level);
    if (!best || level.starPurse[0] !== best.purse) {
      proofProblems.push(level.id + ": top band " + level.starPurse[0] +
        " is not the solver's line " + (best ? best.purse : "none"));
    }
    const bands = level.starPurse;
    if (!(bands[0] > bands[2] && bands[1] > bands[2] && bands[1] <= bands[0])) {
      proofProblems.push(level.id + ": bands do not order " + bands.join("/"));
    }
    if (bands[0] > Math.round(level.purse * 0.2)) {
      proofProblems.push(level.id + ": three stars keep " + bands[0] + " of " + level.purse);
    }
  });
  check("game-auction-dungeon",
    "every deep rung is cleared by the shipped solver at its own measured band",
    proofProblems.length === 0, proofProblems.slice(0, 4).join(" | "));

  /* The bench: forty seeded hands a rung through the same resolvers, with the
   * same stream replayed on the shipped sixteen-round calendar. A strong hand
   * clears every rung, the top band is not free, the shipped trap line never
   * three-stars the tier, and a hand that never bids carries nothing out. */
  const TRIALS = 40;
  const benchProblems = [];
  const fuseKills = {};
  const plannerGaps = {};
  deep.forEach((level) => {
    const wide = wideCalendar(level);
    const top = level.starPurse[0];
    let wins = 0;
    let three = 0;
    let kills = 0;
    for (let trial = 0; trial < TRIALS; trial += 1) {
      const rand = lcg(41000 + trial * 7919);
      const hand = {
        contestP: 0.25 + rand() * 0.5,
        floorFrac: rand() * 0.12,
        restFrac: 0.5 + rand() * 0.45
      };
      const got = play(level, hand, rand);
      if (got.phase === "won") {
        wins += 1;
        if (got.purse >= top) three += 1;
      }
      if (play(wide, hand, rand).phase === "won") {
        if (got.phase !== "won") kills += 1;
      }
    }
    fuseKills[level.id] = kills;
    const trap = App.auctionTakeAll(level);
    if (trap.phase === "won" && trap.purse >= top) {
      benchProblems.push(level.id + ": the take-all trap three-stars at " + trap.purse);
    }
    const drifter = play(level, { contestP: 0, floorFrac: 0, restFrac: 1 }, lcg(7));
    if (drifter.phase === "won") {
      benchProblems.push(level.id + ": a hand that never bids cleared the run");
    }
    if (wins < 2) {
      benchProblems.push(level.id + ": no seeded hand carries the run (" + wins + ")");
    }
    if (wins > TRIALS / 2) {
      benchProblems.push(level.id + ": seeded hands clear too freely (" + wins + "/" + TRIALS + ")");
    }
    if (three > 2) {
      benchProblems.push(level.id + ": the top band fell to " + three + " seeded hands");
    }
  });
  deep.forEach((level) => {
    const mine = App.auctionCeiling(level);
    const theirs = App.auctionCeiling(wideCalendar(level));
    plannerGaps[level.id] = mine && theirs ? theirs.purse - mine.purse : -1;
  });
  check("game-auction-dungeon",
    "seeded hands clear every deep rung, the top band is not free, and the trap lines stay traps",
    benchProblems.length === 0, benchProblems.slice(0, 4).join(" | "));

  /* The fuse is load-bearing: on every deep rung at least two seeded lines
   * that clear the shipped sixteen-round calendar are driven off the door by
   * the fuse alone, and on three of the four the planner's own richest line
   * keeps strictly more coins when the calendar is handed back - the tier's
   * lesson costs the searcher real money. */
  const loadProblems = [];
  deep.forEach((level) => {
    if (fuseKills[level.id] < 2) {
      loadProblems.push(level.id + ": the fuse killed " + fuseKills[level.id] + " calendar lines");
    }
  });
  const gapped = deepIds.filter((id) => plannerGaps[id] > 0);
  if (gapped.length < 3) {
    loadProblems.push("the planner gap holds on only " + gapped.length + " of four: " +
      deepIds.map((id) => id + "+" + plannerGaps[id]).join(" "));
  }
  check("game-auction-dungeon",
    "the fuse is load-bearing: calendar-clearing lines die on the deep doors and the planner pays for the shorter bell",
    loadProblems.length === 0, loadProblems.slice(0, 4).join(" | "));

  /* ---- the summit tier: the house bell on every sale ----
   * Structural first: no rung before the summit authors a bell, the six author
   * fourteen paddles down to eight with no plateau, the seated bell is the
   * authored one, and every shipped rung still seats the shipped sale guard. */
  const preBell = shipped.concat(deep).filter((level) =>
    Object.prototype.hasOwnProperty.call(level, "hammer"));
  check("game-auction-dungeon",
    "no rung before the summit authors a house bell - the lever is dead for a1-a24",
    preBell.length === 0, preBell.map((level) => level.id).join(","));
  const bells = summit.map((level) => level.hammer);
  const bellsSeated = summit.every((level) => App.auctionHammer(level) === level.hammer);
  const bellGuard = shipped.concat(deep).every((level) => App.auctionHammer(level) === 48);
  check("game-auction-dungeon",
    "the summit rings the bell at fourteen paddles down to eight and every shipped sale seats the shipped guard",
    bellsSeated && bellGuard && bells.join(",") === "14,12,11,10,9,8" &&
      bells.every((bell, i) => i === 0 || bell < bells[i - 1]),
    "bells " + bells.join(","));

  /* The hook is inert where the field never shipped: every shipped rung,
   * replayed with one seeded hand on its own copy with the hammer field struck
   * out - and again on a clone that carries the field at the shipped guard
   * value - walks to the same end, coin for coin. */
  const runPrint = (level, hand, rand) => {
    const got = play(level, hand, rand);
    return [got.phase, got.purse, got.hp, got.kit.join("+"), got.encIdx, got.seed].join(":");
  };
  const inertHand = { contestP: 0.5, floorFrac: 0.05, restFrac: 0.7 };
  const inertProblems = [];
  shipped.concat(deep).forEach((level) => {
    const bare = withoutHammer(level);
    const guarded = Object.assign({}, level, { id: level.id + "-gate-bell48", hammer: 48 });
    if (runPrint(level, inertHand, lcg(5150)) !== runPrint(bare, inertHand, lcg(5150)) ||
        runPrint(level, inertHand, lcg(5150)) !== runPrint(guarded, inertHand, lcg(5150))) {
      inertProblems.push(level.id);
    }
  });
  check("game-auction-dungeon",
    "every shipped rung replays byte-identically with the bell struck out and with the bell seated at the shipped guard",
    inertProblems.length === 0, inertProblems.join(","));

  /* Every summit rung proved through the shipped solver: clearable at all, the
   * printed three-star band is the solver's own richest line, the bands order
   * strictly, the top band keeps no more than a fifth of the purse, and the
   * wide bell's line never keeps less - capped sales can only free coins. */
  const summitProofProblems = [];
  summit.forEach((level) => {
    if (!App.auctionSurvivable(level)) {
      summitProofProblems.push(level.id + ": the shipped solver clears nothing");
      return;
    }
    const best = App.auctionCeiling(level);
    if (!best || level.starPurse[0] !== best.purse) {
      summitProofProblems.push(level.id + ": top band " + level.starPurse[0] +
        " is not the solver's line " + (best ? best.purse : "none"));
    }
    const bands = level.starPurse;
    if (!(bands[0] > bands[1] && bands[1] > bands[2])) {
      summitProofProblems.push(level.id + ": bands do not strictly order " + bands.join("/"));
    }
    if (bands[0] > Math.round(level.purse * 0.2)) {
      summitProofProblems.push(level.id + ": three stars keep " + bands[0] + " of " + level.purse);
    }
    const theirs = App.auctionCeiling(withoutHammer(level));
    if (theirs && best && theirs.purse < best.purse) {
      summitProofProblems.push(level.id + ": the wide bell's line keeps less (" +
        theirs.purse + " vs " + best.purse + ")");
    }
  });
  check("game-auction-dungeon",
    "every summit rung is cleared by the shipped solver at its own measured band, strictly ordered and never richer than a fifth of the purse",
    summitProofProblems.length === 0, summitProofProblems.slice(0, 4).join(" | "));

  /* The summit bench: the same forty seeded hands a rung, with the same stream
   * replayed on the hand's own rung with the bell cut out. The top band is
   * reachable but not free, the trap line stays a trap, a hand that never bids
   * carries nothing out, and the bell bites from both sides - wide-bell lines
   * die under it and hands the wide calendar prices out only clear with it. */
  const summitBenchProblems = [];
  const bellKills = {};
  const bellGives = {};
  summit.forEach((level) => {
    const wide = withoutHammer(level);
    const top = level.starPurse[0];
    let wins = 0;
    let three = 0;
    let kills = 0;
    let gives = 0;
    for (let trial = 0; trial < TRIALS; trial += 1) {
      const rand = lcg(41000 + trial * 7919);
      const hand = {
        contestP: 0.25 + rand() * 0.5,
        floorFrac: rand() * 0.12,
        restFrac: 0.5 + rand() * 0.45
      };
      const got = play(level, hand, rand);
      if (got.phase === "won") {
        wins += 1;
        if (got.purse >= top) three += 1;
      }
      if (play(wide, hand, rand).phase === "won") {
        if (got.phase !== "won") kills += 1;
      } else if (got.phase === "won") {
        gives += 1;
      }
    }
    bellKills[level.id] = kills;
    bellGives[level.id] = gives;
    const trap = App.auctionTakeAll(level);
    if (trap.phase === "won" && trap.purse >= top) {
      summitBenchProblems.push(level.id + ": the take-all trap three-stars at " + trap.purse);
    }
    const drifter = play(level, { contestP: 0, floorFrac: 0, restFrac: 1 }, lcg(7));
    if (drifter.phase === "won") {
      summitBenchProblems.push(level.id + ": a hand that never bids cleared the run");
    }
    if (wins < 2) {
      summitBenchProblems.push(level.id + ": no seeded hand carries the run (" + wins + ")");
    }
    if (wins > TRIALS / 2) {
      summitBenchProblems.push(level.id + ": seeded hands clear too freely (" + wins + "/" + TRIALS + ")");
    }
    if (three > 2) {
      summitBenchProblems.push(level.id + ": the top band fell to " + three + " seeded hands");
    }
    if (kills < 2) {
      summitBenchProblems.push(level.id + ": the bell killed " + kills + " wide-bell lines");
    }
    if (gives < 1) {
      summitBenchProblems.push(level.id + ": the bell gave " + gives + " hands a rung the wide calendar priced out");
    }
  });
  check("game-auction-dungeon",
    "seeded hands clear every summit rung, the top band is not free, the trap lines stay traps and the bell bites from both sides (" +
      summitIds.map((id) => id + " -" + bellKills[id] + "/+" + bellGives[id]).join(" ") + ")",
    summitBenchProblems.length === 0, summitBenchProblems.slice(0, 4).join(" | "));

  /* The tier's names, twists and bell line resolve in both languages. */
  const copyKeys = [];
  deep.forEach((level) => {
    copyKeys.push(level.labelKey, level.twistKey);
  });
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-auction-dungeon", "the four deep run names and twists resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
  const summitCopyKeys = ["audBellLine"];
  summit.forEach((level) => {
    summitCopyKeys.push(level.labelKey, level.twistKey);
  });
  const summitCopyProblems = summitCopyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-auction-dungeon", "the six summit run names, twists and the bell line resolve in both languages",
    summitCopyProblems.length === 0, summitCopyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each run in order
   * hands the player exactly the next one, all thirty times. */
  const chain = App.createCampaign({
    key: "auction-dungeon-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 99, better: "high" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-auction-dungeon", "the unlock chain walks all thirty runs in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
