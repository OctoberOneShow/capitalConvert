"use strict";

/* game-crosswind-kites: the Squall Line summit is proved through the module's
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
 * The shipped ladder carries gated ribbons exactly once - k13, three of them,
 * each wanting six quiet seconds - and out on the front they are the load-
 * bearing refuel. Every summit rung carries at least five gated ribbons on
 * five quiet seconds or fewer, so the mechanic differs from every earlier
 * flight structurally, not by degree. The difficulty spine is the one the
 * tier comment names: the rival's closing pressure - its speed minus the hook
 * reach it flies against - climbs strictly from the Stratosphere Apex's 202
 * to 225 while the speed itself climbs 220 to 242, never repeating a value.
 *
 * Playability is proved two ways. Every summit flight boots through the real
 * builder (App.initCrosswindKitesGame) in the stub DOM, with the unlock chain
 * seeded so the builder arms that flight natively, and the panel is required
 * to hold the thirty-flight picker, the resolved bilingual objective, and an
 * armed readout that counts the exact sky it opened. Then the scripted
 * reference line flies the exported stepper end to end and banks three stars
 * under App.starsFor with the module's own bands - bands that must hang off
 * the measured par by the shipped formula, run strictly downwards, and stay
 * below the stream length, so no flight can be three-starred by emptying the
 * sky. The names ride the module's own addStrings in both languages. The
 * whole gate replays thirty measured flights and boots six panels in a few
 * seconds, well under the minute the orchestrator allows. */

module.exports = function gate(ctx) {
  const { App, env, check } = ctx;
  const flights = App.kiteFlights || [];
  const summitIds = ["k25", "k26", "k27", "k28", "k29", "k30"];

  /* ---- (1) the ladder: thirty flights, distinct, in order, summit last ---- */

  check("game-crosswind-kites", "the ladder holds thirty flights",
    flights.length === 30, String(flights.length));
  const ladderOrder = flights.every((flight, index) => flight.id === "k" + (index + 1));
  check("game-crosswind-kites", "every flight id is distinct and in ladder order",
    new Set(flights.map((flight) => flight.id)).size === flights.length && ladderOrder,
    flights.map((flight) => flight.id).join(","));
  const summitInPlace = summitIds.every((id, index) =>
    flights[24 + index] && flights[24 + index].id === id);
  check("game-crosswind-kites", "the summit k25-k30 closes the ladder, appended after k24",
    summitInPlace, "tail: " + flights.slice(-6).map((flight) => flight.id).join(","));

  const byId = {};
  flights.forEach((flight) => { byId[flight.id] = flight; });
  const summit = summitIds.map((id) => byId[id]).filter(Boolean);
  const shipped = flights.slice(0, 24);

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

  /* ---- (2) the unlock chain walks all thirty in order ---- */

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
  check("game-crosswind-kites", "the unlock chain walks all thirty flights in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");

  /* ---- (3) the summit carries the mechanic, and the metric climbs ---- */

  /* The quiet line as the economy. A gated ribbon is one whose stream row
   * carries a gate: it scores either way but only buys air time on a line
   * kept quiet for that many seconds. Counted straight off the shipped rows,
   * the way kctAdvance reads them. */
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
    "the quiet-line economy is the summit's alone: five or more gated ribbons per summit rung on five quiet seconds or fewer, three or fewer (all at six) on every shipped rung",
    mechanicProblems.length === 0 && shippedWantedSix,
    mechanicProblems.join(" | ") ||
      "summit gates " + summit.map((def) => gatedCount(def) + "@" + quietFloor(def) + "s").join(" ") +
      " vs shipped " + shippedRhythms.join(","));

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

  /* ---- (4) playability: the reference line replays the exported stepper ---- */

  /* The module's own kctRun, re-hosted: the same reference pilot options, the
   * same 1/60 step, the same ceiling. Deterministic end to end because the
   * module rolls no die; the gate adds no randomness of its own. */
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

  /* The shipped twenty-four still measure: the ladder the summit was appended
   * to is replayed untouched, so the gate sees the same sky the players do. */
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

  /* The summit the same way, with the bar that matters: the flight ends, the
   * reference line hooks a real number of ribbons, and that number is exactly
   * the par the module cached - so no basePar safety net masked a stream the
   * pilot cannot fly. */
  const proofProblems = [];
  const proofs = {};
  summit.forEach((def) => {
    const run = replay(def);
    proofs[def.id] = run;
    const par = App.kitePar(def);
    if (!run.finished) proofProblems.push(def.id + " never landed");
    if (!(run.caught > 0)) proofProblems.push(def.id + " caught nothing");
    if (run.caught !== par) {
      proofProblems.push(def.id + " replay " + run.caught + " vs par " + par);
    }
  });
  check("game-crosswind-kites",
    "every summit flight replays to a landed, catchable sky at its own measured par",
    proofProblems.length === 0, proofProblems.slice(0, 4).join(" | "));

  /* ---- (5) star bands honest: shipped formula, tight but reachable ---- */

  const bandProblems = [];
  summit.forEach((def) => {
    const par = App.kitePar(def);
    const bands = App.kiteBands(def);
    const name = def.id + " par=" + par + " bands=" + bands.join("/");
    /* The shipped ladder: three stars one ribbon short of the measured line,
     * two at about 65 per cent, one at about 40, never touching. */
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
    /* The proof run itself banks three, a bare one-star catch banks one, and
     * an empty flight banks nothing - the same semantics finish() pays. */
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
    "every summit rung's bands hang off its measured line by the shipped formula and the proof run banks three stars",
    bandProblems.length === 0, bandProblems.slice(0, 4).join(" | "));

  /* ---- (6) boot: every summit flight through the real builder ---- */

  /* The builder reads its unlock chain out of storage, so the gate seeds the
   * campaign record up to the flight under test and the panel then arms that
   * flight natively - the same path a player's twenty-fifth clear takes. */
  const bootProblems = [];
  summit.forEach((def, index) => {
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
    "each summit flight boots through the real builder and arms its own sky",
    bootProblems.length === 0, bootProblems.slice(0, 4).join(" | "));

  /* ---- (7) the summit's names resolve in both languages ---- */

  const copyKeys = [];
  summit.forEach((def) => {
    copyKeys.push(def.labelKey, def.noteKey);
  });
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-crosswind-kites", "the six summit flight names and notes resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
