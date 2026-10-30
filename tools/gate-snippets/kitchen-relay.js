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
 * 2.15s to 1.23s at the summit. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.kitchenLevels;
  const deepIds = ["svc21", "svc22", "svc23", "svc24"];
  const summitIds = ["svc25", "svc26", "svc27", "svc28", "svc29", "svc30"];

  check("game-kitchen-relay", "the ladder holds thirty services",
    levels.length === 30, String(levels.length));
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
  /* the rungs the deep tier was measured against: everything shipped before
   * it, which is the set its pile-up and pressure proofs were written over */
  const shallow = levels.filter((level) => !deepIds.includes(level.id) &&
    !summitIds.includes(level.id));

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
    "the capstone deals the longest ticket list and the tightest window pair",
    byId.svc24.count >= byId.svc20.count &&
    shallow.every((level) => byId.svc24.count >= level.count) &&
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
  const earlyCreep = levels.filter((level) => !summitIds.includes(level.id) &&
    Object.prototype.hasOwnProperty.call(level, "creep"));
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
  const shippedWorst = Math.max.apply(null, shallow.concat(deep).map(fastestIdle));
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
  shallow.concat(deep).forEach((level) => {
    const clone = Object.assign({}, level, { creep: 1 });
    if (JSON.stringify(App.kitchenPlan(level)) !== JSON.stringify(App.kitchenPlan(clone))) {
      inertProblems.push(level.id);
    }
  });
  check("game-kitchen-relay",
    "every shipped rung replays byte-identically through a creep:1 clone",
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

  /* The unlock chain is derived, never stored: clearing each service in
   * order hands the player exactly the next one, all thirty times. */
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
  check("game-kitchen-relay", "the unlock chain walks all thirty services in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
