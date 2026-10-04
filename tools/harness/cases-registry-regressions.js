/* Focused gameplay regressions for games mounted through the registry. */
"use strict";

const { createEnvironment, appSource, boot, check, run } = require("./lib");
const vm = require("vm");

run("Lantern Heist patrol turns", () => {
  const env = boot();
  const App = env.window.CapitalConvert;
  const before = App.heistSetup(0);
  before.action = App.heistDecode("w");
  const after = App.heistStep(before);
  check("Lantern Heist patrol turns", "waiting spends one turn", after.turns === 1);
  check("Lantern Heist patrol turns", "waiting advances a patrol", after.guards[0].i === 1);
  check("Lantern Heist patrol turns", "waiting leaves the player in place", after.pos.x === before.pos.x && after.pos.y === before.pos.y);
  check("Lantern Heist patrol turns", "the core preserves its input state", before.turns === 0 && before.guards[0].i === 0);

  const blocked = App.heistSetup(0);
  blocked.action = App.heistDecode("l");
  const bumped = App.heistStep(blocked);
  check("Lantern Heist patrol turns", "a blocked move remains free", bumped.turns === 0 && bumped.guards[0].i === 0 && bumped.event === "bump");

  App.heistRooms.forEach((room, index) => {
    let state = App.heistSetup(index);
    for (const code of room.solution) {
      state.action = App.heistDecode(code);
      state = App.heistStep(state);
    }
    check("Lantern Heist patrol turns", room.id + " still has a winning authored route", state.status === "won" && state.alarms === 0);
  });
});

run("Clockwork Dispatch collisions and timetable", () => {
  const App = boot().window.CapitalConvert;
  const rows = ["#########", "#########", "#########", ".........", "#########", "#########", "#########"];
  const opposing = {
    rows, cells: [{ x: 2, y: 3, kind: "p", a: 2, b: 2, init: 0 }], stations: [],
    trains: [{ c: 0, row: 3, tick: 0 }, { c: 1, row: 3, tick: 1 }], limit: 8,
  };
  const collision = App.dispatchRun(opposing, [], 3);
  check("Clockwork Dispatch collisions and timetable", "head-on trains both crash", collision.crashes === 2 && collision.frames[3].trains.length === 0);
  check("Clockwork Dispatch collisions and timetable", "head-on crashes are reported once per train", collision.events.filter((event) => event.type === "crash" && event.why === "crowd").length === 2);

  const simultaneous = {
    rows, cells: [], stations: [], trains: [{ c: 0, row: 3, tick: 0 }, { c: 1, row: 3, tick: 0 }], limit: 8,
  };
  const spawn = App.dispatchRun(simultaneous, [], 0);
  check("Clockwork Dispatch collisions and timetable", "train zero occupies its entrance", spawn.crashes === 1 && spawn.frames[0].trains.length === 1);
  check("Clockwork Dispatch collisions and timetable", "an occupied entrance reports a signal crash", spawn.events[0] && spawn.events[0].why === "signal");

  App.dispatchLevels.forEach((level) => {
    const early = App.dispatchRun(level, [], 2);
    const due = level.trains.filter((train) => train.tick <= 2).length;
    const seen = new Set(early.frames.flatMap((frame) => frame.trains.map((train) => train.id)));
    check("Clockwork Dispatch collisions and timetable", level.id + " spawns trains on their listed ticks", seen.size === due);
    const proof = App.dispatchSolve(level);
    const replay = App.dispatchRun(level, proof.plan);
    check("Clockwork Dispatch collisions and timetable", level.id + " retains a collision-free winning plan", proof.solvable && replay.over === "win" && replay.crashes === 0 && replay.delivered === level.trains.length);
  });
});

run("Dream Orchestra mute", () => {
  const env = createEnvironment();
  const oscillators = [];
  env.window.AudioContext = class {
    constructor() { this.currentTime = 0; this.state = "running"; this.destination = {}; }
    createOscillator() {
      const oscillator = { frequency: {}, connect() {}, start() {}, stops: [], stop(at) { this.stops.push(at); } };
      oscillators.push(oscillator);
      return oscillator;
    }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  };
  env.load(appSource);
  env.domReady();
  const panel = env.byId("gamePanelDreamOrchestra");
  const transport = panel.querySelector(".drm-transport").querySelectorAll("button");
  transport[2].click();
  const scheduledCount = oscillators.length;
  check("Dream Orchestra mute", "reference playback schedules audible notes", oscillators.length > 0 && oscillators.every((node) => node.stops.length === 1 && node.stops[0] > 0));
  transport[3].click();
  check("Dream Orchestra mute", "muting immediately stops every scheduled oscillator", oscillators.length > 0 && oscillators.every((node) => node.stops.length === 2 && node.stops[1] === undefined));
  check("Dream Orchestra mute", "the sound control reports its muted state", transport[3].getAttribute("aria-pressed") === "true");
  transport[1].click();
  transport[2].click();
  check("Dream Orchestra mute", "starting playback while muted creates no audible notes", oscillators.length === scheduledCount);
});

run("Microbe Lab keyboard mutations", () => {
  const env = boot();
  const panel = env.byId("gamePanelMicrobeLab");
  const stage = panel.querySelector(".mcb-stage");
  const initialTrait = panel.querySelector(".mcb-trait").textContent;
  const initialHud = panel.querySelector(".game-hud").textContent;
  env.dispatch(stage, "keydown", { key: "ArrowUp" });
  check("Microbe Lab keyboard mutations", "raising a trait updates its displayed value immediately", panel.querySelector(".mcb-trait").textContent !== initialTrait);
  check("Microbe Lab keyboard mutations", "raising a trait immediately spends a displayed point", panel.querySelector(".game-hud").textContent !== initialHud);
  env.dispatch(stage, "keydown", { key: "ArrowDown" });
  check("Microbe Lab keyboard mutations", "lowering a trait immediately restores its displayed value and point", panel.querySelector(".mcb-trait").textContent === initialTrait && panel.querySelector(".game-hud").textContent === initialHud);
});

/* A 3-star band nobody can reach is a trap: on the late missions full
 * deduction used to be a 0.2-0.4% lottery, so those ladders now read "deduce
 * everything, or deduce all but one and buy the last group". This walks each
 * mission's real deal stream - the same solvable-broadcast filter the game
 * uses - and holds every top band above a floor a player can actually hit. */
run("Morse star bands", () => {
  const App = boot().window.CapitalConvert;
  App.morseLevels.forEach((level) => {
    const stream = [];
    let cursor = 0;
    for (let step = 0; step < 400; step += 1) {
      for (let probe = 0; probe < 96; probe += 1) {
        const mission = App.morseDeal(level, cursor + probe);
        if (App.morseSolvable(mission)) {
          cursor = cursor + probe + 1;
          stream.push(mission);
          break;
        }
      }
    }
    check("Morse star bands", level.id + " always deals a winnable broadcast", stream.length === 400);
    const bands = { 1: 0, 2: 0, 3: 0 };
    stream.forEach((mission) => {
      const solved = App.morseSolve(mission);
      bands[solved.stars] = (bands[solved.stars] || 0) + 1;
    });
    check("Morse star bands", level.id + " honours its floor: every win pays at least one star",
      bands[1] + bands[2] + bands[3] === stream.length);
    const top = Math.round((bands[3] / stream.length) * 1000) / 10;
    check("Morse star bands", level.id + " top band is not a lottery (" + bands[3] + "/" + stream.length + ", " + top + "%)",
      bands[3] * 50 >= stream.length);
  });
});

run("Rooftop Radio final scan", () => {
  const env = boot();
  const panel = env.byId("gamePanelRooftopRadio");
  const canvas = panel.querySelector("canvas");
  const originalRandom = env.sandbox.Math.random;
  try {
    // A new sweep with a known transmitter still goes through the real UI.
    env.sandbox.Math.random = () => 0;
    panel.querySelector(".game-actions").querySelector("button").click();
  } finally {
    env.sandbox.Math.random = originalRandom;
  }
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 320, height: 320 });
  env.dispatch(canvas, "pointerdown", { clientX: 35, clientY: 35 });
  check("Rooftop Radio final scan", "a direct hit completes the sweep in one scan", panel.querySelector(".game-result").textContent.startsWith(env.window.CapitalConvert.t("rrFound", { n: 1, s: 3 })));
  check("Rooftop Radio final scan", "the successful scan is deducted from the displayed battery", panel.querySelector(".game-hud").querySelector("strong").textContent.includes("7"));
});

run("Neon Drift checkpoint calibration", () => {
  const App = boot().window.CapitalConvert;
  App.driftCourses.forEach((course) => {
    // A distinct ID bypasses the cached UI par. The sentinel makes a failed
    // reference run visible instead of accepting its authored fallback.
    const measured = App.driftPar(Object.assign({}, course, { id: course.id + "-regression", basePar: 999 }));
    check("Neon Drift checkpoint calibration", course.id + " finishes every checkpoint before setting its par", measured > 0 && measured < 999);
    check("Neon Drift checkpoint calibration", course.id + " has a demonstrated lap inside its time limit", measured < course.limit);
  });
});

run("Ember Delve bounded route proof", () => {
  const env = boot();
  // A broken loop must fail within a bounded check instead of hanging the
  // entire harness. Both explicit and default sample counts must terminate.
  vm.runInContext("window.__stairSpans = window.CapitalConvert.delveLevels.map(function(level) { return window.CapitalConvert.delveStairSpan(level, 2); }); window.__defaultSpan = window.CapitalConvert.delveStairSpan(window.CapitalConvert.delveLevels[0]);", env.sandbox, { timeout: 1500 });
  check("Ember Delve bounded route proof", "every sampled level respects its four-step stair bound", env.window.__stairSpans.length === 5 && env.window.__stairSpans.every((distance) => distance >= 2 && distance <= 4));
  check("Ember Delve bounded route proof", "the default proof terminates within the same route bound", env.window.__defaultSpan >= 2 && env.window.__defaultSpan <= 4);
});

run("Whisper Deck documented echo chain", () => {
  const App = boot().window.CapitalConvert;
  let state = App.whisperDeal(App.whisperLevels[0], 811, 0);
  state.hand = ["sip", "gust", "gust"];
  state.draw = ["wall", "wall", "wall", "wall"];
  const lane = state.foe.intent.lane;
  const before = state.foe.resolve;
  state = App.whisperPlay(state, 0, lane);
  state = App.whisperPlay(state, 0, lane);
  check("Whisper Deck documented echo chain", "a flow card arms the next strike during the same turn", before - state.foe.resolve === App.whisperCards.gust.power + App.whisperCards.gust.echo.power + 2);
  state = App.whisperEndTurn(state);
  const nextBefore = state.foe.resolve;
  state = App.whisperPlay(state, 0, state.foe.intent.lane);
  check("Whisper Deck documented echo chain", "a new turn starts without a carried echo bonus", nextBefore - state.foe.resolve === App.whisperCards.gust.power + 2);
  const guide = App.getRegisteredGames().find((game) => game.name === "whisperDeck").guide;
  check("Whisper Deck documented echo chain", "English guidance describes the demonstrated same-turn chain", guide.en.some((line) => line.startsWith("Echo:") && line.includes("same turn")) && App.t("wsdEchoWord", { y: "flow", v: "+3 power" }).includes("this turn"));
});
