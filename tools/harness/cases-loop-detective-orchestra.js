/* Focused gameplay regressions for the programming, deduction and music games. */
"use strict";

const fs = require("fs"), path = require("path");
const lib = require("./lib");
const { createEnvironment, check, run } = lib;
const source = ["i18n", "core", "game-campaign", "game-registry", "game-loopwright", "game-pocket-detective", "game-dream-orchestra"]
  .map(name => fs.readFileSync(path.join(__dirname, "../../assets/app", name + ".js"), "utf8")).join("\n");
function boot(options) {
  const env = createEnvironment(options);
  env.frames = new Map();
  let frameId = 0;
  env.window.requestAnimationFrame = fn => { const id = ++frameId; env.frames.set(id, fn); return id; };
  env.window.cancelAnimationFrame = id => env.frames.delete(id);
  env.oscillators = [];
  env.window.AudioContext = class {
    constructor() { this.currentTime = 0; this.state = "running"; this.destination = {}; }
    createOscillator() {
      const oscillator = { frequency: {}, connect() {}, start() {}, stops: [], stop(at) { this.stops.push(at); } };
      env.oscillators.push(oscillator);
      return oscillator;
    }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  };
  env.load("window.CapitalConvert = {petNotifyGame: function () {}};");
  env.load(source);
  env.window.CapitalConvert.initRegistryGames();
  return env;
}
function nativeKey(env, node, key) {
  node.focus();
  const allowed = env.dispatch(node, "keydown", { key });
  // Native buttons synthesize their click when the key's default is preserved.
  if (allowed && (key === "Enter" || key === " ")) node.click();
  return allowed;
}

run("Loopwright authored programs", () => {
  const App = boot().window.CapitalConvert;
  for (const floor of App.lpwFloors) {
    check("Loopwright authored programs", floor.id + " has a winning ghost sequence", App.loopSolved(floor));
    check("Loopwright authored programs", floor.id + " fits every program into eight slots", floor.programs.every(program => program.length <= 8));
    const before = JSON.stringify(floor.grid);
    App.loopSim(floor.grid, floor.programs[0], 64);
    check("Loopwright authored programs", floor.id + " preserves the original floor", JSON.stringify(floor.grid) === before);
  }
});

run("Loopwright playback score snapshot", () => {
  const env = boot(), panel = env.byId("gamePanelLoopwright"), canvas = panel.querySelector("canvas");
  const slots = panel.querySelectorAll(".lpw-slot");
  // Four moves reach G; four explicit waits make this an eight-instruction run.
  for (const key of ["1", "1", "1", "1", "8", "8", "8", "8"]) env.dispatch(canvas, "keydown", { key });
  panel.querySelector(".game-actions button").click();
  for (let index = 7; index >= 4; index -= 1) {
    slots[index].click();
    env.dispatch(canvas, "keydown", { key: "Backspace" });
  }
  env.timers.advance(3000);
  const saved = JSON.parse(env.store.get("loopwright-campaign"));
  check("Loopwright playback score snapshot", "editing the next program cannot improve the executed program's stars", saved.cleared.f1.stars === 2);
  const result = panel.querySelector(".game-result").textContent;
  check("Loopwright playback score snapshot", "completion reports the executed instruction count", result.includes("8 instructions"));
  const completed = slots.map(slot => slot.textContent).join("|");
  env.dispatch(canvas, "keydown", { key: "1" });
  env.dispatch(canvas, "keydown", { key: "Backspace" });
  check("Loopwright playback score snapshot", "finished programs reject keyboard edits", slots.map(slot => slot.textContent).join("|") === completed);
  check("Loopwright playback score snapshot", "completion leaves no replay timeout", env.timers.pendingTimeouts() === 0);
});

run("Loopwright replay restart", () => {
  const env = boot(), panel = env.byId("gamePanelLoopwright"), canvas = panel.querySelector("canvas");
  env.dispatch(canvas, "keydown", { key: "1" });
  const actions = panel.querySelector(".game-actions").querySelectorAll("button");
  actions[0].click(); actions[2].click();
  env.timers.advance(3000);
  check("Loopwright replay restart", "an old replay cannot modify a restarted floor", !env.store.has("loopwright-campaign") && panel.querySelector(".lpw-slot").textContent === "1:·");
  check("Loopwright replay restart", "restart cancels the old replay", env.timers.pendingTimeouts() === 0);
});

run("Pocket Detective case proofs", () => {
  const App = boot().window.CapitalConvert;
  for (const rung of App.detectiveRungs) {
    const puzzle = App.detectiveCase(rung);
    check("Pocket Detective case proofs", rung.id + " has exactly one answer", App.detectiveCountSolutions(puzzle.clues, { n: rung.n }, 2) === 1);
    check("Pocket Detective case proofs", rung.id + " only gives true clues", puzzle.clues.every(clue => App.detectiveHolds(clue, puzzle.solution)));
    const notes = [];
    for (let cat = 0; cat < 3; cat += 1) for (let who = 0; who < rung.n; who += 1) notes[cat * rung.n * rung.n + puzzle.solution[cat][who] * rung.n + who] = 1;
    check("Pocket Detective case proofs", rung.id + " accepts its answer", App.detectiveGrade(notes, puzzle.solution, rung.n).solved);
    notes[0] = puzzle.solution[0][0] === 0 ? 2 : 1;
    check("Pocket Detective case proofs", rung.id + " rejects a contradicted cell", !App.detectiveGrade(notes, puzzle.solution, rung.n).solved);
  }
});

run("Pocket Detective focused cells", () => {
  const env = boot(), panel = env.byId("gamePanelPocketDetective");
  const cells = panel.querySelectorAll(".pdk-cell");
  nativeKey(env, cells[4], "Enter");
  check("Pocket Detective focused cells", "Enter marks the cell reached with Tab", cells[4].classList.contains("is-yes") && !cells[0].classList.contains("is-yes"));
  env.dispatch(cells[4], "keydown", { key: "ArrowRight" });
  check("Pocket Detective focused cells", "arrows move focus with the cursor", env.document.activeElement === cells[5]);
  nativeKey(env, env.document.activeElement, "Enter");
  check("Pocket Detective focused cells", "Enter marks the destination after arrow navigation", cells[5].classList.contains("is-yes") && cells[4].classList.contains("is-yes"));
  env.window.CapitalConvert.quietResetPocketDetective();
  check("Pocket Detective focused cells", "pausing preserves the notes", cells[4].classList.contains("is-yes") && cells[5].classList.contains("is-yes"));
});

run("Dream Orchestra authored scores", () => {
  const App = boot().window.CapitalConvert;
  for (const level of App.drmLevels) {
    const pattern = App.orchestraEmptyPattern();
    level.target.forEach((note, step) => { if (note) pattern[note.v][step] = note.r; });
    check("Dream Orchestra authored scores", level.id + " matches its target", App.orchestraMatch(pattern, level.target).done);
    check("Dream Orchestra authored scores", level.id + " obeys all voice rules", App.orchestraViolations(pattern, level.rules).length === 0);
    check("Dream Orchestra authored scores", level.id + " has a measured reachable par", App.orchestraPar(level)[0] === level.target.filter(Boolean).length);
  }
});

run("Dream Orchestra native controls", () => {
  const env = boot(), panel = env.byId("gamePanelDreamOrchestra");
  const transport = panel.querySelector(".drm-transport").querySelectorAll("button");
  check("Dream Orchestra native controls", "Enter activates the focused reference button", nativeKey(env, transport[2], "Enter") && env.oscillators.length > 0);
  check("Dream Orchestra native controls", "playback keys on buttons do not add notes", panel.querySelectorAll(".has-note").length === 0);
  nativeKey(env, transport[1], " ");
  check("Dream Orchestra native controls", "Space activates Stop and silences scheduled notes", env.oscillators.length > 0 && env.oscillators.every(node => node.stops.length === 2));
  const select = panel.querySelector("select");
  check("Dream Orchestra native controls", "the piece selector keeps native arrow navigation", env.dispatch(select, "keydown", { key: "ArrowDown" }));
  env.window.CapitalConvert.quietResetDreamOrchestra();
});

run("Dream Orchestra grid activation", () => {
  const env = boot(), panel = env.byId("gamePanelDreamOrchestra");
  const cells = panel.querySelectorAll(".drm-cell"), first = cells[6 * 16 + 3], next = cells[6 * 16 + 4];
  first.click();
  check("Dream Orchestra grid activation", "a normal click places a note", first.classList.contains("has-note"));
  nativeKey(env, first, "Enter");
  check("Dream Orchestra grid activation", "Enter toggles the focused note exactly once", !first.classList.contains("has-note") && panel.querySelectorAll(".has-note").length === 0);
  env.dispatch(first, "keydown", { key: "ArrowRight" });
  check("Dream Orchestra grid activation", "arrows move keyboard focus to the next beat", env.document.activeElement === next);
  nativeKey(env, env.document.activeElement, "Enter");
  check("Dream Orchestra grid activation", "the next beat receives the note", next.classList.contains("has-note") && !first.classList.contains("has-note"));
  env.window.CapitalConvert.quietResetDreamOrchestra();
});

run("Dream Orchestra complete scores", () => {
  const env = boot(), App = env.window.CapitalConvert, panel = env.byId("gamePanelDreamOrchestra");
  const selector = panel.querySelector("select");
  const cells = panel.querySelectorAll(".drm-cell");
  App.drmLevels.forEach(level => {
    selector.value = level.id;
    env.dispatch(selector, "change");
    level.target.forEach((note, step) => { if (note) cells[(7 - note.r) * 16 + step].click(); });
    const saved = JSON.parse(env.store.get("dream-orchestra-campaign"));
    check("Dream Orchestra complete scores", level.id + " can be completed through real note buttons for three stars", saved.cleared[level.id].stars === 3);
  });
  App.quietResetDreamOrchestra();
});

run("Dream Orchestra accessible step numbers", () => {
  for (const language of ["en-US", "zh-CN"]) {
    const env = boot({ language }), panel = env.byId("gamePanelDreamOrchestra");
    panel.querySelectorAll(".drm-cell").forEach((cell, index) => {
      const step = index % 16 + 1, label = cell.getAttribute("aria-label");
      check("Dream Orchestra accessible step numbers", language + " identifies beat " + step,
        !/\{[^}]+\}/.test(label) && label.includes(language === "zh-CN" ? "第 " + step + " 步" : "step " + step + ","));
    });
    env.window.CapitalConvert.quietResetDreamOrchestra();
  }
});

if (require.main === module) {
  lib.caseResults.forEach(result => console.log((result.failed ? "FAIL" : "PASS") + " " + result.name + " (" + result.checks + " checks)"));
  lib.failures.forEach(failure => console.log(failure));
  console.log("Checks passed: " + lib.passCount + "; failed: " + lib.failures.length);
  process.exitCode = lib.failures.length ? 1 : 0;
}
