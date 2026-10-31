"use strict";

/* game-kitchen-relay: the deep tier's pile-up is structural, and the game's
 * own plan sits witness on every service.
 *
 * The module ships a complete headless line - kitchenPlan (the greedy chef
 * program), kitchenCovers (replay and score), kitchenBands (bands measured
 * off that line, never invented) and kitchenBeatable (the one-star line
 * inside the window) - so the gate runs exactly that line over the deep
 * tier. The proofs: every deep service is beatable inside its own window
 * with its own bands; the plan's covers land its own three-star line; and
 * the lesson is structural - no shipped rung ever held two jams at the same
 * bell, every deep rung holds a pile-up, the tier's jam pressure is the
 * heaviest the pass has seen, and the capstone's ticket list is the longest.
 * The pure core draws no Math.random, so the bench needs no seeding.
 *
 * The summit tier svc25-svc30 pulls the one lever the deep tier left, and
 * the gate prices it the same way. `creep` multiplies the unattended idle of
 * every pan step - the number the pan face's burn clock divides by - and it
 * is a dead field for v1-24: every shipped rung replays byte-identically
 * through a creep:1 clone of itself. The ratchet climbs 1.2-1.75 one notch a
 * rung, and the tier is priced in the engine's own currencies: the plan is
 * replayed on each rung's own seed and on four probe seeds, and the
 * one-star band the player is shown survives every seed probed; the same
 * greedy line on the no-creep twin of a rung banks strictly more covers
 * than the rung lets it, so the creep is what holds the pass back on every
 * summit rung; and the tightest burn clock a pan face can show, measured
 * off each rung's own built tickets, falls rung over rung from the shipped
 * 2.15s to 1.23s at the summit.
 *
 * The late shift svc31-svc40 seats the second wave and adds the kitchen's
 * first new dish since the two-heat pot. No new field ships; instead every
 * rung takes one record off every rung shipped before it - the shortest
 * window, the longest list, the first four-step recipe (a slow roast that
 * rides only its debut rung), the busiest repair bill, the hottest pan, the
 * thinnest hold, the shortest lead, the fastest arrivals, the longest walk,
 * and a capstone pairing the longest list with the hottest pan behind a
 * triple pile-up. The tier's measured currency is the share of the house
 * the plan serves: 18/30, 13/32, 11/28, 11/28, 11/28, 11/30, 10/28, 8/28,
 * 8/28, 9/34 - never rising rung over rung. Every rung is probed on four
 * foreign seeds against its own one-star band, and every rung's record
 * dial, cut back inside the shipped envelope, frees covers (points on the
 * hold rung) the rung would not pay - the record is load-bearing, never
 * decoration. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.kitchenLevels;
  const deepIds = ["svc21", "svc22", "svc23", "svc24"];
  const summitIds = ["svc25", "svc26", "svc27", "svc28", "svc29", "svc30"];

  check("game-kitchen-relay", "the ladder holds at least forty services",
    levels.length >= 40, String(levels.length));
  check("game-kitchen-relay", "every service id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-kitchen-relay", "the deep tier svc21-svc24 is present",
    missing.length === 0, missing.join(","));
  const summitMissing = summitIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-kitchen-relay", "the summit tier svc25-svc30 is present in order",
    summitMissing.length === 0 &&
      summitIds.every((id, index) => levels.findIndex((level) => level.id === id) >
        (index === 0 ? -1 : levels.findIndex((level) => level.id === summitIds[index - 1]))),
    summitMissing.join(",") || "ordered");

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);
  const summit = summitIds.map((id) => byId[id]);
  /* The rungs the deep tier was measured against: every rung before the
   * deep tier itself, which is the set its pile-up and pressure proofs were
   * written over. The late shift legitimately exceeds these records, so it
   * stays out of the baseline. */
  const shallow = levels.slice(0, levels.findIndex((level) => level.id === "svc21"));

  /* Every deep service plays out under the game's own plan: the one-star
   * band is reachable inside the window, the plan covers its own three-star
   * line, and nothing runs past the window. */
  const runProblems = [];
  const runs = {};
  deep.forEach((level) => {
    const service = App.kitchenMakeService(level);
    const program = App.kitchenPlan(level);
    const run = App.kitchenCovers(service, program);
    runs[level.id] = run;
    if (!App.kitchenBeatable(level)) {
      runProblems.push(`${level.id}: the one-star band is out of reach`);
    }
    if (run.covers < App.kitchenBands(level)[0]) {
      runProblems.push(`${level.id}: the plan covered ${run.covers}, under its own` +
        ` three-star band ${App.kitchenBands(level)[0]}`);
    }
    if (run.end > level.window + 0.5) {
      runProblems.push(`${level.id}: the service ran to ${run.end.toFixed(1)}` +
        ` past the ${level.window}s window`);
    }
    const bands = App.kitchenBands(level);
    if (!(bands[0] > bands[1] && bands[1] > bands[2])) {
      runProblems.push(`${level.id}: bands do not run downwards ${bands.join("/")}`);
    }
  });
  check("game-kitchen-relay",
    "the game's own plan proves every deep service beatable inside its window",
    runProblems.length === 0, runProblems.join(" | "));

  /* The pile-up is structural. A jam bell is the `at` of a jam entry: no
   * shipped rung ever rang one bell twice, every deep rung rings at least
   * one bell twice, and the tier's jam pressure - entries times need - is
   * the heaviest the pass has seen. */
  const bellCount = (level) => {
    const bells = {};
    (level.jams || []).forEach((jam) => {
      bells[jam.at] = (bells[jam.at] || 0) + 1;
    });
    return Math.max.apply(null, [0].concat(Object.keys(bells).map((at) => bells[at])));
  };
  const jamPressure = (level) =>
    (level.jams || []).reduce((sum, jam) => sum + jam.need, 0);
  check("game-kitchen-relay",
    "no shipped rung ever jammed two stations at one bell; every deep rung holds a pile-up",
    shallow.every((level) => bellCount(level) <= 1) &&
    deep.every((level) => bellCount(level) >= 2),
    "deep pile-up sizes " + deep.map((level) => bellCount(level)).join("/"));
  check("game-kitchen-relay",
    "the deep jam pressure is the heaviest the pass has seen",
    deep.every((level) => jamPressure(level) > jamPressure(byId.svc20)) &&
    deep.every((level) => shallow.every((shipped) => jamPressure(level) > jamPressure(shipped))),
    `deep ${deep.map((level) => jamPressure(level).toFixed(1)).join("/")} vs shipped max ` +
      Math.max.apply(null, shallow.map((level) => jamPressure(level))).toFixed(1));
  check("game-kitchen-relay",
    "the capstone deals the longest ticket list and the tightest window pair of its era",
    byId.svc24.count >= byId.svc20.count &&
    levels.slice(0, levels.findIndex((level) => level.id === "svc25")).every((level) => byId.svc24.count >= level.count) &&
    byId.svc24.window <= byId.svc20.window,
    `capstone ${byId.svc24.count} tickets in ${byId.svc24.window}s`);

  /* The deep tier's names resolve in both languages. */
  const copyProblems = deep.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-kitchen-relay", "the four deep service names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The fast pan is structural: every summit rung carries the creep and the
   * ratchet climbs 1.2-1.75 one notch a rung with no plateau, and no rung
   * before the summit carries the field the hook reads. */
  const creeps = summit.map((level) => level.creep);
  check("game-kitchen-relay",
    "every summit rung turns the pan up and the ratchet climbs 1.2-1.75 with no plateau",
    creeps.join(",") === "1.2,1.3,1.4,1.5,1.6,1.75" &&
      summit.every((level, index) => index === 0 || level.creep > summit[index - 1].creep),
    creeps.join(","));
  const earlyCreep = levels.slice(0, levels.findIndex((level) => level.id === "svc25"))
    .filter((level) => Object.prototype.hasOwnProperty.call(level, "creep"));
  check("game-kitchen-relay", "no rung before the summit carries the fast-pan dial",
    earlyCreep.length === 0, earlyCreep.map((level) => level.id).join(","));

  /* Every summit service plays out under the game's own plan: the one-star
   * band is reachable inside the window, the plan covers its own three-star
   * line, the bands run downwards, and nothing runs past the window. On
   * four probe seeds per rung the plan still reaches the one-star line the
   * player is shown. */
  const PROBE_SEEDS = [77, 1234, 90210, 555];
  const summitRunProblems = [];
  summit.forEach((level) => {
    const service = App.kitchenMakeService(level);
    const program = App.kitchenPlan(level);
    const run = App.kitchenCovers(service, program);
    if (!App.kitchenBeatable(level)) {
      summitRunProblems.push(`${level.id}: the one-star band is out of reach`);
    }
    if (run.covers < App.kitchenBands(level)[0]) {
      summitRunProblems.push(`${level.id}: the plan covered ${run.covers}, under its own` +
        ` three-star band ${App.kitchenBands(level)[0]}`);
    }
    if (run.end > level.window + 0.5) {
      summitRunProblems.push(`${level.id}: the service ran to ${run.end.toFixed(1)}` +
        ` past the ${level.window}s window`);
    }
    const bands = App.kitchenBands(level);
    if (!(bands[0] > bands[1] && bands[1] > bands[2])) {
      summitRunProblems.push(`${level.id}: bands do not run downwards ${bands.join("/")}`);
    }
    PROBE_SEEDS.forEach((seed) => {
      const probe = App.kitchenCovers(
        App.kitchenMakeService(Object.assign({}, level, { seed: seed })));
      if (!(probe.covers >= bands[2])) {
        summitRunProblems.push(`${level.id}: seed ${seed} covered ${probe.covers},` +
          ` under the one-star band ${bands[2]}`);
      }
    });
  });
  check("game-kitchen-relay",
    "the game's own plan proves every summit service beatable inside its window, on its own seed and four probes",
    summitRunProblems.length === 0, summitRunProblems.join(" | "));

  /* The fast pan is load-bearing: the same greedy line on a copy of a rung
   * with the creep cut out banks strictly more covers than the rung lets it
   * - on every summit rung's own seed, the creep is what holds the pass
   * back. */
  const biteProblems = [];
  const biteLines = [];
  summit.forEach((level) => {
    const flat = Object.assign({}, level);
    delete flat.creep;
    const bitten = App.kitchenCovers(level).covers;
    const freed = App.kitchenCovers(flat).covers;
    biteLines.push(`${level.id} ${bitten} vs ${freed}`);
    if (!(freed > bitten)) {
      biteProblems.push(`${level.id}: without the creep the plan covered ${freed}` +
        ` against the rung's ${bitten}`);
    }
  });
  check("game-kitchen-relay",
    "cutting the creep out of a summit rung frees covers the rung would not pay (" +
      biteLines.join(", ") + ")",
    biteProblems.length === 0, biteProblems.join(" | "));

  /* The pan face's burn clock is the tier's own currency: the fastest idle
   * any of a rung's built tickets carries is the shipped 0.13 multiplied by
   * the rung's creep, so the shortest burn clock the pass can show falls
   * strictly rung over rung, and every summit rung burns a pan faster than
   * every shipped rung ever did. */
  const fastestIdle = (level) => {
    const service = App.kitchenMakeService(level);
    let worst = 0;
    service.tickets.forEach((ticket) => {
      ticket.steps.forEach((step) => {
        if (step.idle > worst) { worst = step.idle; }
      });
    });
    return worst;
  };
  /* The "shipped worst" baseline is the ladder as the summit shipped it -
   * the late shift's hotter pans (svc35, svc40) legitimately outburn the
   * summit, so the baseline stops before the late shift. */
  const shippedWorst = Math.max.apply(null,
    levels.slice(0, levels.findIndex((level) => level.id === "svc25")).map(fastestIdle));
  const clockProblems = [];
  let prevIdle = 0;
  const clocks = [];
  summit.forEach((level) => {
    const idle = fastestIdle(level);
    clocks.push(`${level.id} ${(0.28 / idle).toFixed(2)}s`);
    if (!(idle > prevIdle)) {
      clockProblems.push(`${level.id}: fastest idle ${idle.toFixed(3)} does not` +
        ` outburn the rung before it (${prevIdle.toFixed(3)})`);
    }
    if (!(idle > shippedWorst)) {
      clockProblems.push(`${level.id}: fastest idle ${idle.toFixed(3)} is not over` +
        ` the shipped worst ${shippedWorst.toFixed(3)}`);
    }
    prevIdle = idle;
  });
  check("game-kitchen-relay",
    "the summit's burn clocks fall strictly rung over rung and every one undercuts the shipped worst " +
      (0.28 / shippedWorst).toFixed(2) + "s (" + clocks.join(", ") + ")",
    clockProblems.length === 0, clockProblems.join(" | "));

  /* The hook is dead where the field never shipped: every shipped rung
   * replayed through a creep:1 clone of itself walks the same greedy line
   * byte for byte. */
  const inertProblems = [];
  shallow.concat(deep).filter((level) => level.creep === undefined).forEach((level) => {
    const clone = Object.assign({}, level, { creep: 1 });
    if (JSON.stringify(App.kitchenPlan(level)) !== JSON.stringify(App.kitchenPlan(clone))) {
      inertProblems.push(level.id);
    }
  });
  check("game-kitchen-relay",
    "every rung without the dial replays byte-identically through a creep:1 clone",
    inertProblems.length === 0, inertProblems.join(","));

  /* The summit's names resolve in both languages. */
  const summitCopyProblems = summit.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-kitchen-relay", "the six summit service names resolve in both languages",
    summitCopyProblems.length === 0, summitCopyProblems.join(","));

  /* The guide teaches the fast pan in both languages. */
  const desc = (typeof App.getRegisteredGames === "function"
    ? App.getRegisteredGames() : [])
    .find((entry) => entry && entry.name === "kitchenRelay");
  const guideOk = !!desc && !!desc.guide &&
    desc.guide.en.some((line) => /Summit: services 25-30/.test(line) && /creep/.test(line)) &&
    desc.guide.zh.some((line) => /巅峰段/.test(line) && /creep/.test(line));
  check("game-kitchen-relay", "the guide teaches the fast pan in both languages",
    guideOk, desc && desc.guide ? "guide lines found" : "kitchenRelay guide missing");


  /* ---- the late shift svc31-svc40: one record a night, measured ----
   * No new field ships: each rung takes one scarcity record off every rung
   * shipped before it, adds the kitchen's first new dish since the two-heat
   * pot, and the game's own chef sits witness on every service the way it
   * does on the shipped tiers. The tier's measured currency is the share of
   * the house the plan serves, which never rises rung over rung, and each
   * record dial, cut back inside the shipped envelope, is load-bearing. */
  const lateIds = ["svc31", "svc32", "svc33", "svc34", "svc35", "svc36", "svc37", "svc38", "svc39", "svc40"];
  const lateMissing = lateIds.filter((id) => !byId[id]);
  const lateInOrder = lateIds.every((id, index) => levels.findIndex((level) => level.id === id) >
    (index === 0 ? -1 : levels.findIndex((level) => level.id === lateIds[index - 1])));
  check("game-kitchen-relay", "the late shift svc31-svc40 is present in order",
    lateMissing.length === 0 && lateInOrder, lateMissing.join(",") || "ordered");
  const late = lateIds.map((id) => byId[id]);
  const posOf = (id) => levels.findIndex((level) => level.id === id);
  const before = (id) => levels.slice(0, posOf(id));

  /* The chef sits witness: every late-shift service is beatable inside its
   * own window with its own bands, and the bands are what the plan covered
   * - the top band is the plan's own line, not a number beside it. */
  const latePlan = {};
  const lateWitness = [];
  late.forEach((level) => {
    const run = App.kitchenCovers(App.kitchenMakeService(level), App.kitchenPlan(level));
    const bands = App.kitchenBands(level);
    latePlan[level.id] = { run, bands };
    if (!App.kitchenBeatable(level)) {
      lateWitness.push(level.id + " unbeatable (covers " + run.covers + ", end " + run.end.toFixed(1) + ")");
    }
    if (bands[0] !== run.covers || bands[1] >= bands[0] || bands[2] >= bands[1]) {
      lateWitness.push(level.id + " bands " + bands.join("/") + " off the plan covers " + run.covers);
    }
    if (run.end > level.window + 0.5) {
      lateWitness.push(level.id + " runs to " + run.end.toFixed(1) + " of " + level.window);
    }
  });
  check("game-kitchen-relay",
    "the chef sits witness on every late-shift service: beatable inside its window, bands on its own measured line",
    lateWitness.length === 0, lateWitness.slice(0, 4).join(" | "));

  /* The one-star band the player is shown survives four probe seeds per
   * rung - the summit's own standard, held against the late shift too. */
  const lateProbeProblems = [];
  late.forEach((level) => {
    const bands = latePlan[level.id].bands;
    PROBE_SEEDS.forEach((seed) => {
      const probe = App.kitchenCovers(
        App.kitchenMakeService(Object.assign({}, level, { seed: seed })));
      if (!(probe.covers >= bands[2])) {
        lateProbeProblems.push(`${level.id}: seed ${seed} covered ${probe.covers},` +
          ` under the one-star band ${bands[2]}`);
      }
    });
  });
  check("game-kitchen-relay",
    "every late-shift one-star band survives four probe seeds",
    lateProbeProblems.length === 0, lateProbeProblems.slice(0, 4).join(" | "));

  /* The tier's measured currency: the share of the house the best line
   * serves falls rung over rung and never rises - 18/30, 13/32, 11/28,
   * 11/28, 11/28, 11/30, 10/28, 8/28, 8/28, 9/34. */
  const lateShares = late.map((level) => ({
    id: level.id,
    share: latePlan[level.id].run.covers / level.count,
    line: latePlan[level.id].run.covers + "/" + level.count,
  }));
  const lateShareProblems = [];
  lateShares.forEach((row, index) => {
    if (index > 0 && row.share > lateShares[index - 1].share) {
      lateShareProblems.push(row.id + " rises over " + lateShares[index - 1].id);
    }
  });
  check("game-kitchen-relay",
    "the share of the house the plan serves never rises across the late shift (" +
      lateShares.map((row) => row.id + " " + row.line).join(", ") + ")",
    lateShareProblems.length === 0, lateShareProblems.join(" | "));

  /* The records, each held against every rung shipped before it - scoped
   * by position, so a later tier legitimately overtakes an earlier peak. */
  const lateRecordProblems = [];
  const lPush = (ok, message) => { if (!ok) lateRecordProblems.push(message); };
  lPush(byId.svc31.window === 96 && before("svc31").every((l) => l.window > 96),
    "svc31 does not close the shortest window the pass has run");
  lPush(byId.svc32.count === 32 && before("svc32").every((l) => l.count < 32),
    "svc32 does not seat the longest ticket list");
  lPush(App.kitchenRecipes.roast.steps.length === 4 &&
    App.kitchenRecipes.roast.steps.filter((step) => step.kind === "sear" || step.kind === "simmer").length === 3 &&
    before("svc33").every((l) => l.recipes.every((r) => App.kitchenRecipes[r].steps.length < 4)) &&
    levels.every((l) => l.id === "svc33" || l.recipes.indexOf("roast") < 0),
    "svc33 does not deal the first four-step dish, or the roast rides another rung");
  lPush(byId.svc34.jams.length === 6 &&
    before("svc34").every((l) => (l.jams || []).length < 6) &&
    jamPressure(byId.svc34) > jamPressure(byId.svc24) &&
    before("svc34").every((l) => jamPressure(byId.svc34) > jamPressure(l)),
    "svc34 does not ring the busiest repair bill the pass has seen");
  lPush(byId.svc35.creep === 1.8 && before("svc35").every((l) => !(l.creep > 1.8)),
    "svc35 does not turn the pan past the summit");
  lPush(byId.svc36.holdWin === 4 && before("svc36").every((l) => l.holdWin > 4),
    "svc36 does not thin the hold to four seconds");
  lPush(byId.svc37.lead === 22 && before("svc37").every((l) => l.lead > 22),
    "svc37 does not cut the lead to 22 seconds");
  lPush(byId.svc38.every === 3.7 && before("svc38").every((l) => l.every > 3.7),
    "svc38 does not run the fastest kitchen the pass has seated");
  lPush(byId.svc39.moveTime === 0.5 && before("svc39").every((l) => l.moveTime < 0.5),
    "svc39 does not stretch the walk to half a second a change");
  lPush(byId.svc40.count === 34 && byId.svc40.creep === 1.85 &&
    bellCount(byId.svc40) === 3 &&
    before("svc40").every((l) => l.count < 34 && !(l.creep > 1.85)),
    "svc40 does not pair the longest list with the hottest pan behind a triple pile-up");
  check("game-kitchen-relay",
    "every late-shift record beats every rung shipped before it",
    lateRecordProblems.length === 0, lateRecordProblems.slice(0, 4).join(" | "));

  /* Each record dial, cut back inside the shipped envelope, is load-bearing:
   * the same greedy line on the cut clone banks strictly more covers - or
   * pays strictly more points on the hold rung, whose dial prices cold
   * plates, not covers - than the rung lets it. */
  const lateCuts = {
    svc31: [(level) => { level.window = 106; }, "covers", "the window back at the summit's 106"],
    svc32: [(level) => { level.every = 4.6; }, "covers", "the arrivals slowed to 4.6"],
    svc33: [(level) => { level.recipes = ["duck", "duck", "sauce", "fillet"]; }, "covers", "the roast swapped for a duck"],
    svc34: [(level) => { level.jams = []; }, "covers", "the repair bill torn out"],
    svc35: [(level) => { delete level.creep; }, "covers", "the creep cut out"],
    svc36: [(level) => { level.holdWin = 10; }, "points", "the hold window widened to 10"],
    svc37: [(level) => { level.lead = 26; }, "covers", "the lead restored to 26"],
    svc38: [(level) => { level.every = 4.4; }, "covers", "the arrivals slowed to 4.4"],
    svc39: [(level) => { level.moveTime = 0.35; }, "covers", "the walk shortened to 0.35"],
    svc40: [(level) => { delete level.creep; }, "covers", "the creep cut out"],
  };
  const lateCutProblems = [];
  const lateCutLines = [];
  late.forEach((level) => {
    const [mutate, metric, label] = lateCuts[level.id];
    const bitten = App.kitchenCovers(level)[metric];
    const clone = Object.assign({}, level);
    mutate(clone);
    const freed = App.kitchenCovers(clone)[metric];
    lateCutLines.push(`${level.id} ${bitten}->${freed}`);
    if (!(freed > bitten)) {
      lateCutProblems.push(`${level.id}: with ${label} the plan still banks` +
        ` ${freed} ${metric} against the rung's ${bitten}`);
    }
  });
  check("game-kitchen-relay",
    "each late-shift record dial, cut back inside the shipped envelope, frees what the rung would not pay (" +
      lateCutLines.join(", ") + ")",
    lateCutProblems.length === 0, lateCutProblems.join(" | "));

  /* The late shift's two record pans outburn every rung shipped before
   * them - 1.20s and 1.16s of burn clock against the summit's 1.23s - and
   * the capstone outburns the rung that held the record. */
  const idle35 = fastestIdle(byId.svc35);
  const idle40 = fastestIdle(byId.svc40);
  const worstBefore35 = Math.max.apply(null, before("svc35").map(fastestIdle));
  const worstBefore40 = Math.max.apply(null, before("svc40").map(fastestIdle));
  const lateClockProblems = [];
  if (!(idle35 > worstBefore35)) {
    lateClockProblems.push("svc35 does not outburn every rung before it");
  }
  if (!(idle40 > worstBefore40)) {
    lateClockProblems.push("svc40 does not outburn every rung before it");
  }
  if (!(idle40 > idle35)) {
    lateClockProblems.push("svc40 does not outburn the rung that held the record");
  }
  check("game-kitchen-relay",
    "the late shift's record pans undercut every burn clock shipped before them (" +
      "svc35 " + (0.28 / idle35).toFixed(2) + "s, svc40 " + (0.28 / idle40).toFixed(2) + "s" +
      " against the summit's " + (0.28 / worstBefore35).toFixed(2) + "s)",
    lateClockProblems.length === 0, lateClockProblems.join(" | "));

  /* The ten late-shift names and the new dish resolve in both languages. */
  const lateCopyProblems = late.map((level) => level.labelKey).concat(["kchRRoast"]).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-kitchen-relay", "the ten late-shift names and the slow roast resolve in both languages",
    lateCopyProblems.length === 0, lateCopyProblems.join(","));

  /* The guide teaches the late shift in both languages. */
  const lateGuideOk = !!desc && !!desc.guide &&
    desc.guide.en.some((line) => /Encore: the late shift/.test(line) && /record/.test(line)) &&
    desc.guide.zh.some((line) => /加演段：夜班接力/.test(line) && /纪录/.test(line));
  check("game-kitchen-relay", "the guide teaches the late shift in both languages",
    lateGuideOk, desc && desc.guide ? "guide lines found" : "kitchenRelay guide missing");

  /* The unlock chain is derived, never stored: clearing each service in
   * order hands the player exactly the next one, all forty times. */
  const chain = App.createCampaign({
    key: "kitchen-relay-gate-chain",
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
  check("game-kitchen-relay", "the unlock chain walks every service in order",
    walked === levels.length && chained && chain.clearedCount() === levels.length, walked + " first clears");
};
