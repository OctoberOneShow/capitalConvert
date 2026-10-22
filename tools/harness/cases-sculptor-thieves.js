/* Gameplay regressions for Blind Sculptor and Rule Thieves. */
"use strict";

const lib = require("./lib");
const { boot, check, run } = lib;

run("Blind Sculptor overhang geometry", () => {
  const App = boot().window.CapitalConvert;
  const level = App.sculptorLevels.find(level => level.id === "b4");
  // This seed previously counted floor cells as unsupported upper blocks.
  const shape = App.sculptorGenerate(3, level.blocks, 45086, level);
  check("Blind Sculptor overhang geometry", "an overhang has an upper block with empty space directly below",
    shape.cells.some(cell => cell >= 9 && !(shape.mask & (1 << (cell - 9)))));
});

run("Blind Sculptor generated puzzle proofs", () => {
  const App = boot().window.CapitalConvert;
  for (const level of App.sculptorLevels) {
    for (let round = 1; round <= 16; round += 1) {
      const shape = App.sculptorGenerate(3, level.blocks, level.seed + round * 101, level);
      const slices = shape.order.map(key => App.sculptorSlice(shape, key[0].toLowerCase(), Number(key[1]) - 1));
      const label = level.id + " round " + round;
      check("Blind Sculptor generated puzzle proofs", label + " has the advertised block count", shape.cells.length === level.blocks);
      check("Blind Sculptor generated puzzle proofs", label + " has a unique solution within its probe budget",
        App.sculptorCandidates(shape.order, slices, level.blocks) === 1 && shape.order.length <= shape.probes);
      check("Blind Sculptor generated puzzle proofs", label + " stays in its measured par band",
        shape.par >= level.minPar && shape.par <= level.maxPar);
      if (level.want === "overhang") {
        check("Blind Sculptor generated puzzle proofs", label + " has a real overhang",
          shape.cells.some(cell => cell >= 9 && !(shape.mask & (1 << (cell - 9)))));
      }
    }
  }
});

run("Blind Sculptor first new round", () => {
  const env = boot(), App = env.window.CapitalConvert;
  const panel = env.byId("gamePanelBlindSculptor");
  const level = App.sculptorLevels[0];
  const first = App.sculptorGenerate(3, level.blocks, level.seed + 101, level);
  const second = App.sculptorGenerate(3, level.blocks, level.seed + 202, level);
  let probe;
  for (const axis of ["z", "y", "x"]) {
    for (let index = 0; index < 3; index += 1) {
      const before = App.sculptorSlice(first, axis, index);
      const after = App.sculptorSlice(second, axis, index);
      if (before.bits.join("") !== after.bits.join("")) probe = { axis, index, before, after };
    }
  }
  check("Blind Sculptor first new round", "the first two seeds yield distinct shapes", !!probe);
  if (!probe) return;
  function readSlice() {
    panel.querySelectorAll(".bld-axis")[["z", "y", "x"].indexOf(probe.axis)].click();
    panel.querySelectorAll(".bld-index")[probe.index].click();
    panel.querySelector(".bld-go").click();
    return panel.querySelector(".bld-read").textContent;
  }
  check("Blind Sculptor first new round", "the initial reading matches seed one", readSlice() === probe.before.text);
  panel.querySelector(".game-actions").querySelectorAll("button")[3].click();
  check("Blind Sculptor first new round", "New Round advances to seed two immediately", readSlice() === probe.after.text);
});

run("Blind Sculptor build and progress", () => {
  const env = boot(), App = env.window.CapitalConvert;
  const panel = env.byId("gamePanelBlindSculptor");
  const level = App.sculptorLevels[0];
  const shape = App.sculptorGenerate(3, level.blocks, level.seed + 101, level);
  const cells = panel.querySelectorAll(".bld-cell");
  const submit = panel.querySelector(".game-actions").querySelector("button");
  submit.click();
  check("Blind Sculptor build and progress", "an empty submission does not spend a guess", panel.querySelector(".game-best").textContent.includes("3 guesses"));
  for (const cell of shape.cells) cells.find(node => Number(node.dataset.cell) === cell).click();
  submit.click();
  const saved = JSON.parse(env.store.get("blind-sculptor-campaign"));
  check("Blind Sculptor build and progress", "a correct build awards stars and saves the clear", saved.cleared.b1.stars === 3);
  check("Blind Sculptor build and progress", "winning unlocks the second solid", !env.byId("bldBlockSel").querySelectorAll("option")[1].disabled);
  const placed = panel.querySelector(".game-hud").textContent;
  cells[0].click();
  check("Blind Sculptor build and progress", "a completed build rejects further changes", panel.querySelector(".game-hud").textContent === placed);
});

run("Rule Thieves immediate win evaluation", () => {
  const App = boot().window.CapitalConvert;
  const state = App.ruleSetup({
    one: [13, 20, 24], two: [6, 9, 10], walls: [1, 3],
    tok: [17, 7, 20, 8], obj: 2, cap: 34,
  });
  state.tok[2].o = 1;
  state.ply = 6;
  for (const side of [1, 2]) {
    const position = JSON.parse(JSON.stringify(state));
    if (side === 2) {
      position.cell = position.cell.map(owner => owner ? 3 - owner : 0);
      position.tok.forEach(token => { if (token.o) token.o = 3 - token.o; });
      position.turn = 2;
    }
    const chosen = App.rulePick(position, { depth: 0, noise: 0 });
    const next = App.ruleApply(position, chosen);
    check("Rule Thieves immediate win evaluation", "the easiest rival recognizes a finished win for side " + side,
      next.over === side && next.reason === "rules");
  }
});

run("Rule Thieves legal play invariants", () => {
  const App = boot().window.CapitalConvert;
  let seed = 1729;
  for (const level of App.ruleLevels) {
    let state = App.ruleSetup(level);
    for (let ply = 0; ply < level.cap && !state.over; ply += 1) {
      const moves = App.ruleMoves(state, state.turn);
      check("Rule Thieves legal play invariants", level.id + " offers a legal move on ply " + ply, moves.length > 0);
      if (!moves.length) break;
      seed = (seed * 48271) % 2147483647;
      const before = JSON.stringify(state);
      const next = App.ruleApply(state, moves[seed % moves.length]);
      check("Rule Thieves legal play invariants", level.id + " preserves the input state", JSON.stringify(state) === before);
      check("Rule Thieves legal play invariants", level.id + " advances one turn and preserves all six thieves",
        next.ply === state.ply + 1 && next.turn === 3 - state.turn && next.cell.filter(Boolean).length === 6);
      check("Rule Thieves legal play invariants", level.id + " keeps walls unoccupied", next.cell.every((owner, index) => !owner || !next.wall[index]));
      state = next;
    }
    check("Rule Thieves legal play invariants", level.id + " terminates by its turn limit", !!App.ruleTerminal(state));
  }
});

run("Rule Thieves controls and undo", () => {
  const env = boot();
  const panel = env.byId("gamePanelRuleThieves");
  const mode = env.byId("rltModeSel");
  mode.value = "two";
  env.dispatch(mode, "change");
  const cells = panel.querySelectorAll(".rlt-cell");
  const initial = cells.map(cell => cell.textContent).join("|");
  cells[15].click(); cells[16].click();
  check("Rule Thieves controls and undo", "a legal first move passes play to player two", panel.querySelector(".game-hud").textContent.includes("player 2"));
  cells[0].click(); cells[5].click();
  env.dispatch(panel.querySelector(".rlt-board"), "keydown", { key: "u" });
  check("Rule Thieves controls and undo", "undo restores one whole round", cells.map(cell => cell.textContent).join("|") === initial);
  cells[15].click(); cells[16].click();
  env.dispatch(panel.querySelector(".rlt-board"), "keydown", { key: "r" });
  check("Rule Thieves controls and undo", "restart restores the opening", cells.map(cell => cell.textContent).join("|") === initial);
});

if (require.main === module) {
  lib.caseResults.forEach(result => console.log((result.failed ? "FAIL" : "PASS") + " " + result.name + " (" + result.checks + " checks)"));
  console.log("Checks passed: " + lib.passCount + "; failed: " + lib.failures.length);
  lib.failures.forEach(failure => console.log(failure));
  process.exitCode = lib.failures.length ? 1 : 0;
}
