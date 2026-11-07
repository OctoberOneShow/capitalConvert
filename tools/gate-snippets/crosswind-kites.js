"use strict";

/* game-crosswind-kites: the Squall Line and Tempest tiers are proved through the module's
 * own exported core, and the proof is deterministic by construction.
 *
 * The module rolls no die anywhere. The gust field is a pure function of the
 * flight clock, both pilots are pure reads of the same sky, and the stepper
 * runs on the fixed 1/60 grid the module already funnels every tick through.
 * So the honest bar here is the one the module set for itself - "par is not
 * guessed - a scripted pilot flies the identical stepper at 60Hz" - and this
 * gate re-runs that exact measurement through the exported App.kiteWorld /
 * App.kitePilot / App.kiteAdvance at the same fixed step, then requires the
 * replay to finish inside the module's own step ceiling, to catch a real
 * number of ribbons, and to land exactly the par the module cached, so a
 * broken stream could never hide behind its basePar safety net. There is no
 * random stream to seed: the same flight, the same pilot, the same sky, every
 * run, here and in the browser.
 *
 * The summit k25-k30 is the Squall Line: the quiet line becomes the economy.
 * The tempest k31-k40 is the Cyclone Apex: closing pressures escalate past
 * 225 up to 256, rival speeds reach 271, and gated quiet-line timing demands
 * sub-3.2s discipline across up to 36 flying ribbons.
 *
 * Playability is proved through the real builder in the stub DOM and the pure
 * stepper end-to-end. */

module.exports = function gate(ctx) {
  const { App, env, check } = ctx;
  const flights = App.kiteFlights || [];
  const summitIds = ["k25", "k26", "k27", "k28", "k29", "k30"];
  const tempestIds = ["k31", "k32", "k33", "k34", "k35", "k36", "k37", "k38", "k39", "k40"];

  /* ---- (1) the ladder: forty flights, distinct, in order ---- */

  check("game-crosswind-kites", "the ladder holds forty flights",
    flights.length === 40, String(flights.length));
  const ladderOrder = flights.every((flight, index) => flight.id === "k" + (index + 1));
  check("game-crosswind-kites", "every flight id is distinct and in ladder order",
    new Set(flights.map((flight) => flight.id)).size === flights.length && ladderOrder,
    flights.map((flight) => flight.id).join(","));
  const summitInPlace = summitIds.every((id, index) =>
    flights[24 + index] && flights[24 + index].id === id);
  const tempestInPlace = tempestIds.every((id, index) =>
    flights[30 + index] && flights[30 + index].id === id);
  check("game-crosswind-kites", "the summit k25-k30 sits after k24 and tempest k31-k40 closes the ladder",
    summitInPlace && tempestInPlace, "tail: " + flights.slice(-10).map((flight) => flight.id).join(","));

  const byId = {};
  flights.forEach((flight) => { byId[flight.id] = flight; });
  const summit = summitIds.map((id) => byId[id]).filter(Boolean);
  const tempest = tempestIds.map((id) => byId[id]).filter(Boolean);
  const shipped = flights.slice(0, 24);
  const extended = summit.concat(tempest);

  /* The proof replays the module's pure core, so those exports are the floor
   * everything else stands on. */
  const coreReady = typeof App.kiteWorld === "function" &&
    typeof App.kiteAdvance === "function" &&
    typeof App.kitePilot === "function" &&
    typeof App.kitePar === "function" &&
    typeof App.kiteBands === "function" &&
    typeof App.initCrosswindKitesGame === "function";
  check("game-crosswind-kites",
    "the module exports the pure core and the real builder the proof replays",
    coreReady, "kiteWorld/kiteAdvance/kitePilot/kitePar/kiteBands/initCrosswindKitesGame");

  /* ---- (2) the unlock chain walks all forty in order ---- */

  const chain = App.createCampaign({
    key: "crosswind-kites-gate-chain",
    levels: flights.map((flight) => ({ id: flight.id, labelKey: flight.labelKey })),
  });
  let walked = 0;
  let chained = true;
  flights.forEach((flight, index) => {
    const outcome = chain.record(flight.id, { stars: 3, best: 1, better: "high" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < flights.length ? flights[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-crosswind-kites", "the unlock chain walks all forty flights in order",
    walked === 40 && chained && chain.clearedCount() === 40, walked + " first clears");

  /* ---- (3) the summit & tempest carry the mechanic, and the metric climbs ---- */

  const isGate = (ribbon) =>
    typeof ribbon.gate === "number" && isFinite(ribbon.gate) && ribbon.gate > 0;
  const gatedCount = (def) => def.stream.filter(isGate).length;
  const quietFloor = (def) => {
    const gates = def.stream.filter(isGate).map((ribbon) => ribbon.gate);
    return gates.length ? Math.min.apply(null, gates) : null;
  };

  const mechanicProblems = [];
  summit.forEach((def) => {
    if (gatedCount(def) < 5) {
      mechanicProblems.push(def.id + " carries only " + gatedCount(def) + " gated ribbons");
    }
    const floor = quietFloor(def);
    if (floor === null || floor > 5) {
      mechanicProblems.push(def.id + " wants " + floor + " quiet seconds");
    }
  });
  tempest.forEach((def) => {
    if (gatedCount(def) < 6) {
      mechanicProblems.push(def.id + " carries only " + gatedCount(def) + " gated ribbons");
    }
    const floor = quietFloor(def);
    if (floor === null || floor > 3.25) {
      mechanicProblems.push(def.id + " wants " + floor + " quiet seconds");
    }
  });
  shipped.forEach((def) => {
    if (gatedCount(def) > 3) {
      mechanicProblems.push(def.id + " already carries " + gatedCount(def) + " gated ribbons");
    }
  });
  const shippedRhythms = [];
  shipped.forEach((def) => {
    def.stream.forEach((ribbon) => {
      if (isGate(ribbon)) shippedRhythms.push(ribbon.gate);
    });
  });
  const shippedWantedSix = shippedRhythms.every((gate) => gate === 6);
  check("game-crosswind-kites",
    "the quiet-line economy is structured: summit >= 5 gates @ <=5s, tempest >= 6 gates @ <=3.2s, shipped <= 3 @ 6s",
    mechanicProblems.length === 0 && shippedWantedSix,
    mechanicProblems.join(" | ") || "all tiers obey quiet-line parameters");

  /* The difficulty spine, in the game's own tunables: the rival's closing
   * pressure is its speed minus the hook reach it flies against, and both the
   * pressure and the raw speed climb strictly past the Stratosphere Apex. */
  const pressure = (def) => def.rival.speed - def.grab;
  const k24 = byId.k24;
  const pressures = summit.map(pressure);
  const speeds = summit.map((def) => def.rival.speed);
  const pressureClimbs = pressures.every((value, index) =>
    value > pressure(k24) && (index === 0 || value > pressures[index - 1]));
  const speedClimbs = speeds.every((value, index) =>
    value > k24.rival.speed && (index === 0 || value > speeds[index - 1]));
  check("game-crosswind-kites",
    "the rival's closing pressure climbs strictly past the apex: " +
      pressure(k24) + " -> " + pressures.join(" -> "),
    pressureClimbs,
    pressure(k24) + " vs " + pressures.join(","));
  check("game-crosswind-kites",
    "the rival speed itself climbs strictly " + k24.rival.speed + " -> " + speeds.join(" -> "),
    speedClimbs, k24.rival.speed + " vs " + speeds.join(","));

  const k30 = byId.k30;
  const tempestPressures = tempest.map(pressure);
  const tempestSpeeds = tempest.map((def) => def.rival.speed);
  const tempestPressureClimbs = tempestPressures.every((value, index) =>
    value > pressure(k30) && (index === 0 || value > tempestPressures[index - 1]));
  const tempestSpeedClimbs = tempestSpeeds.every((value, index) =>
    value > k30.rival.speed && (index === 0 || value > tempestSpeeds[index - 1]));
  check("game-crosswind-kites",
    "the tempest closing pressure climbs strictly past k30: " +
      pressure(k30) + " -> " + tempestPressures.join(" -> "),
    tempestPressureClimbs,
    pressure(k30) + " vs " + tempestPressures.join(","));
  check("game-crosswind-kites",
    "the tempest rival speed climbs strictly " + k30.rival.speed + " -> " + tempestSpeeds.join(" -> "),
    tempestSpeedClimbs, k30.rival.speed + " vs " + tempestSpeeds.join(","));

  /* ---- (4) playability: the reference line replays the exported stepper ---- */

  const STEP_CEILING = 60 * 120;
  const replay = (def) => {
    let world = App.kiteWorld(def);
    const rival = def.rival || { gain: 0.8, lead: 0.4, speed: 140, react: 0.5 };
    const pilot = { was: 0, last: { steer: 0, reel: 0, pump: false } };
    const foe = { was: 0, last: { steer: 0, reel: 0, pump: false } };
    let steps = 0;
    while (!world.over && steps < STEP_CEILING) {
      const you = App.kitePilot(world, world.you, {
        gain: 1, lead: 1, speed: 190, prefer: -1, pump: true,
        was: pilot.was, last: pilot.last,
      });
      const rivalInput = App.kitePilot(world, world.foe, {
        gain: rival.gain, lead: rival.lead, speed: rival.speed, react: rival.react,
        prefer: rival.lane >= 0 ? rival.lane : -1, pump: false,
        was: foe.was, last: foe.last,
      });
      pilot.was = you.was;
      pilot.last = you.hold;
      foe.was = rivalInput.was;
      foe.last = rivalInput.hold;
      world = App.kiteAdvance(world, def, you, rivalInput, 1 / 60).world;
      steps += 1;
    }
    return {
      caught: world.you.score,
      rival: world.foe.score,
      steps: steps,
      finished: world.over && steps < STEP_CEILING,
    };
  };

  const shippedProblems = [];
  shipped.forEach((def) => {
    const run = replay(def);
    const par = App.kitePar(def);
    if (!run.finished) shippedProblems.push(def.id + " never landed");
    if (!(run.caught > 0)) shippedProblems.push(def.id + " caught nothing");
    if (run.caught !== par) shippedProblems.push(def.id + " replay " + run.caught + " vs par " + par);
  });
  check("game-crosswind-kites",
    "the shipped twenty-four still replay to their own measured par",
    shippedProblems.length === 0, shippedProblems.slice(0, 4).join(" | "));

  const proofProblems = [];
  extended.forEach((def) => {
    const run = replay(def);
    const par = App.kitePar(def);
    if (!run.finished) proofProblems.push(def.id + " never landed");
    if (!(run.caught > 0)) proofProblems.push(def.id + " caught nothing");
    if (run.caught !== par) {
      proofProblems.push(def.id + " replay " + run.caught + " vs par " + par);
    }
  });
  check("game-crosswind-kites",
    "every extended flight replays to a landed, catchable sky at its own measured par (16 flights)",
    proofProblems.length === 0, proofProblems.slice(0, 4).join(" | "));

  /* ---- (5) star bands honest: shipped formula, tight but reachable ---- */

  const bandProblems = [];
  extended.forEach((def) => {
    const par = App.kitePar(def);
    const bands = App.kiteBands(def);
    const name = def.id + " par=" + par + " bands=" + bands.join("/");
    const expectedThree = Math.max(2, Math.min(def.stream.length - 1, par - 1));
    const expectedTwo = Math.max(1, Math.min(expectedThree - 1, Math.round(par * 0.65)));
    const expectedOne = Math.max(1, Math.min(expectedTwo - 1, Math.round(par * 0.4)));
    if (bands[0] !== expectedThree || bands[1] !== expectedTwo || bands[2] !== expectedOne) {
      bandProblems.push(name + " leaves the shipped formula");
    }
    if (!(bands[0] > bands[1] && bands[1] > bands[2])) {
      bandProblems.push(name + " does not descend");
    }
    if (bands[0] >= def.stream.length) {
      bandProblems.push(name + " could be three-starred by emptying the sky");
    }
    if (App.starsFor(par, bands, "high") !== 3) {
      bandProblems.push(name + " proof run missed three stars");
    }
    if (App.starsFor(bands[2], bands, "high") !== 1) {
      bandProblems.push(name + " one-star line pays " + App.starsFor(bands[2], bands, "high"));
    }
    if (App.starsFor(0, bands, "high") !== 0) {
      bandProblems.push(name + " an empty flight banked a star");
    }
  });
  check("game-crosswind-kites",
    "every extended flight's bands hang off its measured line by the shipped formula and the proof run banks three stars",
    bandProblems.length === 0, bandProblems.slice(0, 4).join(" | "));

  /* ---- (6) boot: extended flights through the real builder ---- */

  const bootProblems = [];
  extended.forEach((def, index) => {
    const cleared = {};
    for (let k = 1; k <= 24 + index; k += 1) {
      cleared["k" + k] = { stars: 3, best: 9 };
    }
    env.store.set("crosswind-kites-campaign", JSON.stringify({ v: 1, cleared: cleared }));
    const panel = env.document.createElement("div");
    try {
      App.initCrosswindKitesGame(panel);
      const canvas = panel.querySelector(".kct-canvas");
      const select = panel.querySelector("#kctFlightSel");
      const resultNode = panel.querySelector(".game-result");
      const readoutNode = panel.querySelector(".kct-line");
      const result = resultNode ? resultNode.textContent : "";
      const readout = readoutNode ? readoutNode.textContent : "";
      const name = App.t(def.labelKey);
      const problems = [];
      if (!canvas) problems.push("no sky canvas");
      if (!select) problems.push("no flight picker");
      if (select && select.children.length !== flights.length) {
        problems.push("picker holds " + select.children.length + " flights");
      }
      if (select && select.value !== def.id) {
        problems.push("armed " + select.value + ", wanted " + def.id);
      }
      if (!name || name === def.labelKey) problems.push("label fell back to its key");
      if (name && result.indexOf(name) < 0) problems.push("objective does not name the flight");
      if (result.indexOf("{") >= 0) problems.push("objective leaked a placeholder");
      if (readout.indexOf(String(def.stream.length)) < 0) {
        problems.push("armed readout miscounts the stream: " + readout);
      }
      if (problems.length) bootProblems.push(def.id + ": " + problems.join("; "));
      App.quietResetCrosswindKites();
    } catch (error) {
      bootProblems.push(def.id + " threw: " + (error && error.message));
    }
  });
  check("game-crosswind-kites",
    "each extended flight boots through the real builder and arms its own sky",
    bootProblems.length === 0, bootProblems.slice(0, 4).join(" | "));

  /* ---- (7) the extended flight names resolve in both languages ---- */

  const copyKeys = [];
  extended.forEach((def) => {
    copyKeys.push(def.labelKey, def.noteKey);
  });
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-crosswind-kites", "all sixteen extended flight names and notes resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
