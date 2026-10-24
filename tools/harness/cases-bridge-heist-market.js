/* Focused gameplay checks for Paper Bridge, Lantern Heist and Moon Market. */
"use strict";

const fs = require("fs"), path = require("path");
const lib = require("./lib");
const { createEnvironment, check, run } = lib;
const source = ["i18n", "core", "game-campaign", "game-registry", "game-paper-bridge", "game-lantern-heist", "game-moon-market"]
  .map(name => fs.readFileSync(path.join(__dirname, "../../assets/app", name + ".js"), "utf8")).join("\n");
function boot(options) {
  const env = createEnvironment(options);
  env.load("window.CapitalConvert = {petNotifyGame: function () {}};");
  env.load(source);
  env.window.CapitalConvert.initRegistryGames();
  return env;
}
function point(canvas, x, y, env) {
  // A partly visible board can scroll when focus changes during pointerdown.
  let top = 0;
  const focus = canvas.focus;
  canvas.focus = function (options) {
    focus.call(canvas);
    if (!options || !options.preventScroll) top = 100;
  };
  canvas.getBoundingClientRect = () => ({ left: 0, top, width: canvas.width, height: canvas.height });
  env.dispatch(canvas, "pointerdown", { clientX: x, clientY: y });
}

run("Paper Bridge authored solutions", () => {
  const App = boot().window.CapitalConvert;
  for (const level of App.bridgeLevels) {
    const nodes = App.bridgeNodes(level);
    const beams = level.solution.map(([x1, y1, x2, y2]) => [y1 * 12 + x1, y2 * 12 + x2]);
    const built = [];
    for (const beam of beams) {
      check("Paper Bridge authored solutions", level.id + " can legally place every authored beam", App.bridgeBeamOk(nodes, built, ...beam) === "ok");
      built.push(beam);
    }
    const result = App.bridgeCheck(nodes, beams, App.bridgeSpan(level));
    check("Paper Bridge authored solutions", level.id + " crosses within its beam limit", result.ok && beams.length <= level.limit);
  }
});

run("Paper Bridge gap feedback", () => {
  const App = boot().window.CapitalConvert;
  const level = App.bridgeLevels[0], nodes = App.bridgeNodes(level);
  const end = 3 * 12 + 5;
  const result = App.bridgeCheck(nodes, [[level.startIndex, end]], App.bridgeSpan(level));
  check("Paper Bridge gap feedback", "an incomplete deck reports a gap", !result.ok && result.fail === "gap");
  check("Paper Bridge gap feedback", "the warning identifies the actual end of the partial deck", result.segment.a === end && result.segment.b === level.targetIndex);
});

run("Paper Bridge pointer, keyboard and cleanup", () => {
  const env = boot(), panel = env.byId("gamePanelPaperBridge"), canvas = panel.querySelector("canvas");
  panel.hidden = false;
  panel.querySelector(".game-actions button").focus();
  point(canvas, 13 + 4 * 30, 13 + 3 * 30, env);
  check("Paper Bridge pointer, keyboard and cleanup", "clicking a node transfers keyboard focus to the drawing", env.document.activeElement === canvas);
  env.dispatch(canvas, "keydown", { key: "ArrowRight" });
  env.dispatch(canvas, "keydown", { key: "ArrowRight" });
  env.dispatch(canvas, "keydown", { key: "Enter" });
  env.dispatch(canvas, "keydown", { key: "r" });
  env.timers.advance(1000);
  const save = JSON.parse(env.store.get("paper-bridge-campaign"));
  check("Paper Bridge pointer, keyboard and cleanup", "a bridge built with mixed controls earns three stars", save.cleared.b1.stars === 3);
  check("Paper Bridge pointer, keyboard and cleanup", "a completed crossing unlocks the next span", !env.byId("pbrSpanSel").querySelectorAll("option")[1].disabled);
  check("Paper Bridge pointer, keyboard and cleanup", "completion stops the cart timer", env.timers.pendingIntervals() === 0);
  env.dispatch(canvas, "keydown", { key: "r" });
  check("Paper Bridge pointer, keyboard and cleanup", "restart clears the drawing", panel.querySelector(".game-hud strong").textContent === "0/4");
  env.window.CapitalConvert.quietResetPaperBridge();
  check("Paper Bridge pointer, keyboard and cleanup", "closing leaves no interval armed", env.timers.pendingIntervals() === 0);
});

run("Lantern Heist authored routes", () => {
  const App = boot().window.CapitalConvert;
  App.heistRooms.forEach((room, index) => {
    let state = App.heistSetup(index);
    for (const code of room.solution) {
      state.action = App.heistDecode(code);
      const before = JSON.stringify(state);
      const next = App.heistStep(state);
      check("Lantern Heist authored routes", room.id + " does not mutate its input", JSON.stringify(state) === before);
      state = next;
    }
    check("Lantern Heist authored routes", room.id + " has a clean winning route", state.status === "won" && state.alarms === 0);
    check("Lantern Heist authored routes", room.id + " reaches the three-star band", state.turns <= room.starTurns[0]);
  });
});

run("Lantern Heist pointer and keyboard focus", () => {
  const env = boot(), panel = env.byId("gamePanelLanternHeist"), canvas = panel.querySelector("canvas");
  const restart = panel.querySelector(".game-actions button");
  restart.focus();
  point(canvas, 10 + 43 * 1.5, 10 + 43 * 7.5, env);
  check("Lantern Heist pointer and keyboard focus", "clicking the board transfers keyboard focus to it", env.document.activeElement === canvas);
  check("Lantern Heist pointer and keyboard focus", "the pointer move spends one turn", panel.querySelector(".game-hud strong").textContent.startsWith("1 /"));
  env.dispatch(canvas, "keydown", { key: "ArrowLeft" });
  check("Lantern Heist pointer and keyboard focus", "keyboard play continues after a pointer move", panel.querySelector(".game-hud strong").textContent.startsWith("2 /"));
  restart.click();
  check("Lantern Heist pointer and keyboard focus", "New Run resets the room", panel.querySelector(".game-hud strong").textContent.startsWith("0 /"));
});

run("Moon Market native trade buttons", () => {
  const env = boot(), panel = env.byId("gamePanelMoonMarket"), ledger = panel.querySelector(".mkt-ledger");
  const row = ledger.querySelectorAll(".mkt-row")[1];
  const [buy, sell] = row.querySelectorAll("button");
  const initialCash = panel.querySelectorAll(".game-hud strong")[1].textContent;
  buy.focus();
  // Browsers synthesize a button click only if keydown did not prevent it.
  const buyDefault = env.dispatch(buy, "keydown", { key: "Enter" });
  if (buyDefault) buy.click();
  check("Moon Market native trade buttons", "Enter on Buy preserves native button activation", buyDefault);
  check("Moon Market native trade buttons", "Enter buys the focused commodity rather than the highlighted row", row.querySelector(".mkt-hold").textContent === "x1" && ledger.querySelector(".mkt-hold").textContent === "x0");
  sell.focus();
  const sellDefault = env.dispatch(sell, "keydown", { key: "Enter" });
  if (sellDefault) sell.click();
  check("Moon Market native trade buttons", "Enter on Sell preserves native button activation", sellDefault);
  check("Moon Market native trade buttons", "the round trip restores cash and empties the intended holding", row.querySelector(".mkt-hold").textContent === "x0" && panel.querySelectorAll(".game-hud strong")[1].textContent === initialCash);
});

run("Moon Market day ledger and settlement", () => {
  const env = boot(), App = env.window.CapitalConvert, panel = env.byId("gamePanelMoonMarket");
  panel.querySelector(".game-actions button").click();
  check("Moon Market day ledger and settlement", "the first ledger entry closes day one", panel.querySelector(".mkt-ledgerline").textContent.startsWith("Day 1 closed:"));
  const level = App.marketLevels[0];
  const state = App.marketDeal(level);
  state.day = 6; state.cash = 100; state.holds = [2, 1, 0, 0];
  const before = JSON.stringify(state);
  const settle = App.marketSchedule(level, state.seed).prices[7];
  const expected = 100 - level.fee * 3 + settle[0] * 2 + settle[1];
  const closed = App.marketCloseDay(state, state.seed).state;
  check("Moon Market day ledger and settlement", "settlement does not mutate the input", JSON.stringify(state) === before);
  check("Moon Market day ledger and settlement", "remaining cargo is liquidated at the final prices", closed.credits === expected && closed.holds.every(qty => qty === 0));
  check("Moon Market day ledger and settlement", "cash includes the final liquidation proceeds", closed.cash === expected);
  check("Moon Market day ledger and settlement", "a settled week rejects further trade", App.marketTrade(closed, state.seed, [1, 0, 0, 0]).state === closed);
});

run("Moon Market limits and deterministic weeks", () => {
  const App = boot().window.CapitalConvert;
  for (const level of App.marketLevels) {
    const schedule = App.marketSchedule(level, level.seed);
    check("Moon Market limits and deterministic weeks", level.id + " replays identical prices", JSON.stringify(schedule) === JSON.stringify(App.marketSchedule(level, level.seed)));
    let state = App.marketDeal(level);
    for (let day = 0; day < 7 && state.status === "open"; day += 1) {
      const actions = App.marketGreedy(level, schedule, state);
      state = App.marketStep(state, state.seed, actions).state;
      check("Moon Market limits and deterministic weeks", level.id + " keeps cash and cargo within limits", state.cash >= 0 && state.holds.every(qty => Number.isInteger(qty) && qty >= 0) && state.holds.reduce((a, b) => a + b, 0) <= level.cap);
    }
    check("Moon Market limits and deterministic weeks", level.id + " ends within seven days", state.status !== "open");
  }
});

if (require.main === module) {
  lib.caseResults.forEach(result => console.log((result.failed ? "FAIL" : "PASS") + " " + result.name + " (" + result.checks + " checks)"));
  lib.failures.forEach(failure => console.log(failure));
  console.log("Checks passed: " + lib.passCount + "; failed: " + lib.failures.length);
  process.exitCode = lib.failures.length ? 1 : 0;
}
