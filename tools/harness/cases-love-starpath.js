"use strict";

const fs = require("fs");
const path = require("path");
const { createEnvironment, check, run } = require("./lib");
const source = ["i18n", "core", "love-deepspace-starpath"]
  .map(name => fs.readFileSync(path.join(__dirname, "../../assets/app", name + ".js"), "utf8")).join("\n");
const key = "love-deepspace-starpath-v1";
function boot(options) {
  const env = createEnvironment(options); env.load(source);
  env.App = env.window.CapitalConvert;
  return env;
}
function solveByRotating(App, state, rotate) {
  const stage = App.ldsStarpathStages[state.stage], solution = App.ldsSolveStarpath(stage, state.masks);
  if (!solution) return false;
  for (const index of solution.route) {
    let limit = 0;
    while (state.masks[index] !== solution.masks[index] && limit++ < 4 && !state.done) {
      if (!rotate(index)) return false;
    }
  }
  return state.done;
}
function mount(env, options) {
  const host = env.document.createElement("div"); env.document.body.appendChild(host);
  const rewards = [], moments = [];
  const game = env.App.mountLdsStarpath(host, Object.assign({ onReward: (kind, token) => rewards.push([kind, token]), onMoment: mood => moments.push(mood), isHidden: () => false }, options));
  game.setPartner({ id: "xavier", nameKey: "ldsXavier" });
  return { host, game, rewards, moments };
}
function completeUI(env, mounted) {
  let state = mounted.game.inspect().state;
  const solution = env.App.ldsSolveStarpath(env.App.ldsStarpathStages[state.stage], state.masks);
  for (const index of solution.route) {
    let limit = 0;
    while (state.masks[index] !== solution.masks[index] && limit++ < 4 && !state.done) {
      mounted.host.querySelector('[data-starpath-tile="' + index + '"]').click();
      state = mounted.game.inspect().state;
    }
  }
  return state.done;
}

run("Starpath twelve solvable constellations", () => {
  const { App } = boot();
  check("Starpath twelve solvable constellations", "twelve authored stages span three board sizes", App.ldsStarpathStages.length === 12 && new Set(App.ldsStarpathStages.map(s => s.size)).size === 3);
  for (const stage of App.ldsStarpathStages) {
    const state = App.ldsCreateStarpath(stage.id), initial = App.ldsTraceStarpath(stage, state.masks);
    const answer = App.ldsSolveStarpath(stage, state.masks);
    check("Starpath twelve solvable constellations", "stage " + (stage.id + 1) + " starts unsolved and has an exact positive par", !initial.solved && !!answer && answer.moves === stage.par && stage.par > 0);
    const legalWin = solveByRotating(App, state, index => App.ldsStarpathRotate(state, index));
    const final = App.ldsTraceStarpath(stage, state.masks);
    check("Starpath twelve solvable constellations", "stage " + (stage.id + 1) + " wins by legal rotations at par", legalWin && final.connected && final.beacons === stage.beacons.length && state.moves === stage.par && App.ldsStarpathStars(state) === 3);
    const frozen = JSON.stringify(state);
    check("Starpath twelve solvable constellations", "stage " + (stage.id + 1) + " stops changing after a clear", !App.ldsStarpathRotate(state, answer.route[1]) && !App.ldsStarpathUndo(state) && !App.ldsStarpathHint(state) && JSON.stringify(state) === frozen);
  }
});

run("Starpath light and ratings", () => {
  const { App } = boot();
  const stage = App.ldsStarpathStages[0], state = App.ldsCreateStarpath(0);
  check("Starpath light and ratings", "light stops when the neighbour does not reciprocate", App.ldsTraceStarpath(stage, state.masks).lit.join(",") === String(stage.source));
  check("Starpath light and ratings", "source, destination and void cannot rotate", !App.ldsStarpathRotate(state, stage.source) && !App.ldsStarpathRotate(state, stage.destination) && !App.ldsStarpathRotate(state, 0) && state.moves === 0);
  const undone = App.ldsCreateStarpath(1), editable = App.ldsStarpathStages[1].cells.findIndex(cell => cell.mask && !cell.locked), before = undone.masks.slice();
  App.ldsStarpathRotate(undone, editable); App.ldsStarpathUndo(undone);
  check("Starpath light and ratings", "undo restores orientation but preserves used moves", undone.masks.join() === before.join() && undone.moves === 1 && !undone.history.length);
  solveByRotating(App, undone, index => App.ldsStarpathRotate(undone, index));
  check("Starpath light and ratings", "one extra turn gets two stars", App.ldsStarpathStars(undone) === 2);
  const hinted = App.ldsCreateStarpath(6), hint = App.ldsStarpathHint(hinted);
  check("Starpath light and ratings", "a hint points at a legal unlocked tile without changing orientations", !!hint && !App.ldsStarpathStages[6].cells[hint.index].locked && hinted.hints === 1 && hinted.moves === 0 && hinted.masks.join() === App.ldsCreateStarpath(6).masks.join());
  solveByRotating(App, hinted, index => App.ldsStarpathRotate(hinted, index));
  check("Starpath light and ratings", "assisted completion earns one star", App.ldsStarpathStars(hinted) === 1);
  // A synthetic route reaches the destination while its disconnected beacon
  // remains dark; reaching the goal alone must never clear the puzzle.
  const synthetic = { size: 3, source: 3, destination: 5, beacons: [1] };
  const connected = App.ldsTraceStarpath(synthetic, [0, 10, 0, 2, 10, 8, 0, 0, 0]);
  check("Starpath light and ratings", "all beacons are required even when the goal is reached", connected.connected && !connected.solved && connected.beacons === 0);
  // Check the solver against an independent exhaustive orientation search on
  // the four smallest boards, rather than trusting its own target masks.
  for (let id = 0; id < 4; id++) {
    const puzzle = App.ldsStarpathStages[id], editableCells = puzzle.cells.map((cell, index) => !cell.locked && cell.mask ? index : -1).filter(index => index >= 0);
    const masks = puzzle.cells.map(cell => cell.mask); let minimum = Infinity;
    function enumerate(depth, moves) {
      if (moves >= minimum) return;
      if (depth === editableCells.length) { if (App.ldsTraceStarpath(puzzle, masks).solved) minimum = moves; return; }
      const index = editableCells[depth], original = masks[index];
      for (let turns = 0; turns < 4; turns++) { masks[index] = App.ldsStarpathRotateMask(original, turns); enumerate(depth + 1, moves + turns); }
      masks[index] = original;
    }
    enumerate(0, 0);
    check("Starpath light and ratings", "stage " + (id + 1) + " par matches independent exhaustive search", minimum === puzzle.par);
  }
});

run("Starpath validated progress and rewards", () => {
  const env = boot(), App = env.App;
  for (const raw of ["{invalid", "null", '{"version":99,"partners":{"xavier":[3]}}', '{"version":1,"partners":{"xavier":[-1,3,3]}}']) {
    check("Starpath validated progress and rewards", "malformed records start at the first sky: " + raw.slice(0, 30), App.ldsStarpathProgress(App.ldsReadStarpath(raw), "xavier").cleared === 0);
  }
  const hostile = App.ldsReadStarpath(JSON.stringify({ version: 1, partners: { xavier: [3, 0, 3], sylus: ["3", 3], caleb: [2, 4, 3] } }));
  check("Starpath validated progress and rewards", "noncontiguous, string, and out-of-range records cannot unlock later stages", hostile.partners.xavier.join() === [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].join() && hostile.partners.sylus.every(n => n === 0) && hostile.partners.caleb[0] === 2 && hostile.partners.caleb[1] === 0 && hostile.partners.caleb[2] === 0);
  const clean = App.ldsReadStarpath(), lockedWin = App.ldsCreateStarpath(2);
  solveByRotating(App, lockedWin, index => App.ldsStarpathRotate(lockedWin, index));
  check("Starpath validated progress and rewards", "clears from locked stages cannot be recorded", !App.ldsRecordStarpath(clean, "xavier", lockedWin) && App.ldsStarpathProgress(clean, "xavier").cleared === 0);
  const valid = App.ldsCreateStarpath(0); solveByRotating(App, valid, index => App.ldsStarpathRotate(valid, index));
  const falseCount = JSON.parse(JSON.stringify(valid)); falseCount.moves = 0;
  const falseAnchor = JSON.parse(JSON.stringify(valid)); falseAnchor.masks[3] = 15;
  check("Starpath validated progress and rewards", "impossible move counts, changed fixed anchors and malformed states are rejected", !App.ldsRecordStarpath(clean, "xavier", falseCount) && !App.ldsRecordStarpath(clean, "xavier", falseAnchor) && !App.ldsRecordStarpath(clean, "xavier", {stage:99,done:true}));
  const m = mount(env);
  check("Starpath validated progress and rewards", "stage selection enforces unlocks", !m.game.selectStage(11) && m.game.inspect().state.stage === 0 && m.host.querySelector('[data-starpath-stage="11"]').disabled);
  for (let id = 0; id < 12; id++) {
    check("Starpath validated progress and rewards", "stage " + (id + 1) + " is playable when unlocked", m.game.selectStage(id) && completeUI(env, m));
  }
  const info = m.game.getProgress();
  check("Starpath validated progress and rewards", "all twelve legal UI wins save 36 stars and twelve distinct memories", info.cleared === 12 && info.totalStars === 36 && info.unlocked === 12 && m.rewards.length === 12 && new Set(m.rewards.map(reward => reward.join())).size === 12);
  m.game.selectStage(0); completeUI(env, m);
  check("Starpath validated progress and rewards", "replay does not grant a duplicate reward", m.rewards.length === 12);
  const snapshot = m.game.getProgress(); snapshot.stars[0] = 0;
  check("Starpath validated progress and rewards", "inspection cannot mutate saved stars", m.game.getProgress().stars[0] === 3);
  const reopened = mount(env); reopened.game.selectStage(0); completeUI(env, reopened);
  check("Starpath validated progress and rewards", "reopening retains best stars and prevents reward replay", reopened.game.getProgress().totalStars === 36 && !reopened.rewards.length);
  m.game.setPartner({ id: "zayne", nameKey: "ldsZayne" }); completeUI(env, m);
  check("Starpath validated progress and rewards", "each partner has independent clear rewards and records", m.rewards.length === 13 && m.game.getProgress().cleared === 1);
  m.game.setPartner({ id: "xavier", nameKey: "ldsXavier" });
  check("Starpath validated progress and rewards", "returning to a partner restores their own records", m.game.getProgress().totalStars === 36);
  check("Starpath validated progress and rewards", "valid storage persisted the stars", JSON.parse(env.store.get(key)).partners.xavier.every(n => n === 3));
  for (const storageMode of ["absent", "readwrite-throw"]) {
    const blocked = boot({ storageMode }), game = mount(blocked); completeUI(blocked, game);
    const again = mount(blocked); again.game.selectStage(0); completeUI(blocked, again);
    check("Starpath validated progress and rewards", storageMode + " storage still supports completion and session replay protection", game.game.getProgress().cleared === 1 && game.rewards.length === 1 && !again.rewards.length);
  }
});

run("Starpath keyboard and visibility lifecycle", () => {
  const env = boot(); let hidden = false; const m = mount(env, { isHidden: () => hidden });
  const tile = () => m.host.querySelector('[data-starpath-tile="4"]');
  hidden = true; tile().click();
  check("Starpath keyboard and visibility lifecycle", "hidden activity rejects input", m.game.inspect().state.moves === 0 && !m.rewards.length);
  hidden = false; m.game.pause(); tile().click();
  check("Starpath keyboard and visibility lifecycle", "paused activity rejects input", m.game.inspect().state.moves === 0 && m.game.inspect().paused);
  m.game.refresh(); env.dispatch(tile(), "keydown", { key: "Enter", repeat: true });
  check("Starpath keyboard and visibility lifecycle", "held keys cannot rotate repeatedly", m.game.inspect().state.moves === 0);
  env.dispatch(tile(), "keydown", { key: "Enter", repeat: false });
  check("Starpath keyboard and visibility lifecycle", "Enter legally completes a constellation", m.game.inspect().state.done && m.rewards.length === 1);
  m.game.selectStage(1); const sourceTile = m.host.querySelector('[data-starpath-tile="0"]'); sourceTile.focus();
  env.dispatch(sourceTile, "keydown", { key: "ArrowRight" });
  check("Starpath keyboard and visibility lifecycle", "arrow keys focus the adjacent star", env.document.activeElement === m.host.querySelector('[data-starpath-tile="1"]'));
  const before = m.game.inspect().state.moves; env.setHidden(true); tile().click(); env.setHidden(false);
  check("Starpath keyboard and visibility lifecycle", "background document blocks rotations", m.game.inspect().state.moves === before);
  m.game.pause(); hidden = true; m.game.refresh();
  check("Starpath keyboard and visibility lifecycle", "hidden refresh does not resume activity", m.game.inspect().paused);
  hidden = false; m.game.refresh();
  check("Starpath keyboard and visibility lifecycle", "visible refresh resumes without resetting the puzzle", !m.game.inspect().paused && m.game.inspect().state.stage === 1);
  const chinese = boot({ store: env.store, language: "zh-CN" }), translated = mount(chinese); translated.game.refresh();
  check("Starpath keyboard and visibility lifecycle", "headings, stage names and tile descriptions translate on refresh", translated.host.querySelector(".lsp-title").textContent === "星轨共鸣" && translated.host.querySelector(".lsp-stage-heading").textContent.includes("轻轻转弯") && translated.host.querySelector('[data-starpath-tile="1"]').getAttribute("aria-label").includes("第 1 行"));
});

if (require.main === module) {
  const lib = require("./lib");
  console.log("Starpath checks passed: " + lib.passCount + "; failed: " + lib.failures.length);
  lib.failures.forEach(failure => console.log(failure));
  process.exitCode = lib.failures.length ? 1 : 0;
}
