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
 * The pure core draws no Math.random, so the bench needs no seeding. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.kitchenLevels;
  const deepIds = ["svc21", "svc22", "svc23", "svc24"];

  check("game-kitchen-relay", "the ladder holds twenty-four services",
    levels.length === 24, String(levels.length));
  check("game-kitchen-relay", "every service id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-kitchen-relay", "the deep tier svc21-svc24 is present",
    missing.length === 0, missing.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);
  const shallow = levels.filter((level) => !deepIds.includes(level.id));

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

  /* The tier's names resolve in both languages. */
  const copyProblems = deep.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-kitchen-relay", "the four deep service names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each service in
   * order hands the player exactly the next one, all twenty-four times. */
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
  check("game-kitchen-relay", "the unlock chain walks all twenty-four services in order",
    walked === 24 && chained && chain.clearedCount() === 24, walked + " first clears");
};
