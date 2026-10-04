/* Gameplay regressions driven through the real game handlers and virtual clock.
 * Run directly with node tools/harness/cases-puzzle-regressions.js, or require
 * this file from the shared harness. Test-only probes expose difficult late-game
 * board states without adding any production debugging API. */
"use strict";

const fs = require("fs");
const path = require("path");
const lib = require("./lib");
const { createEnvironment, run, check } = lib;
const appRoot = path.join(__dirname, "..", "..", "assets", "app");

function read(name) {
  return fs.readFileSync(path.join(appRoot, name + ".js"), "utf8");
}

function random(seed) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function fixture(slug, init, options = {}) {
  const env = createEnvironment({ store: options.store });
  env.sandbox.Math = Object.create(Math);
  env.sandbox.Math.random = options.random || random(91837);
  const rewards = [];
  const App = (env.window.CapitalConvert = {
    t: (key, values) => key + (values ? " " + JSON.stringify(values) : ""),
    getElement: (id) => env.byId(id),
    logAction() {},
    createConfetti() {},
    petNotifyGame: (best) => rewards.push(best),
    storage: env.localStorage,
  });
  const frames = [];
  env.window.requestAnimationFrame = (handler) => {
    frames.push(handler);
    return frames.length;
  };
  let source = read(slug);
  const ids = new Set(Array.from(source.matchAll(/(?:getElement|getElementById)\("([^"]+)"\)/g), (match) => match[1]));
  ids.forEach((id) => {
    const tag = /Canvas$/.test(id) ? "canvas" : /(?:Btn|KeepBtn)$/.test(id) ? "button" : /(?:Sel)$/.test(id) ? "select" : "div";
    const node = env.document.createElement(tag);
    node.id = id;
    node.width = 320;
    node.height = 320;
    node.hidden = /Overlay$/.test(id);
    node.getBoundingClientRect = () => ({ left: 0, top: 0, width: 320, height: 320, right: 320, bottom: 320 });
    env.document.body.appendChild(node);
  });
  if (options.probe) source = options.probe(source);
  env.load(read("game-campaign") + "\n" + source);
  App[init]();
  return { env, App, rewards, frames };
}

function click(env, id) {
  env.dispatch(env.byId(id), "click");
}

function attachDrawer(env, App, tabId) {
  const source = read("game-typing");
  Array.from(source.matchAll(/getElement\("([^"]+)"\)/g), (match) => match[1]).forEach((id) => {
    if (env.byId(id)) return;
    const node = env.document.createElement(/(?:Btn|gameTab|Toggle)/.test(id) ? "button" : id === "typingInput" ? "input" : "div");
    node.id = id;
    env.document.body.appendChild(node);
  });
  const modal = env.byId("gameModal");
  const dialog = env.document.createElement("div");
  dialog.className = "game-dialog";
  modal.appendChild(dialog);
  modal.hidden = true;
  const tabs = env.byId("gameTabs");
  env.queryAll("[id]").forEach((node) => {
    if (/^gameTab(?!s)/.test(node.id)) tabs.appendChild(node);
    if (/^gamePanel/.test(node.id)) dialog.appendChild(node);
  });
  App.setStatus = () => {};
  env.load(source);
  App.initTypingGame();
  click(env, "gameToggleBtn");
  click(env, tabId);
}

function mismatch(env) {
  const cards = env.byId("memoryGrid").children;
  const other = cards.find((card) => card.getAttribute("data-glyph") !== cards[0].getAttribute("data-glyph"));
  env.dispatch(cards[0], "click");
  env.dispatch(other, "click");
  return cards.find((card) => card !== cards[0] && card !== other);
}

run("memory reshuffle cancels the old mismatch", () => {
  const name = "memory reshuffle cancels the old mismatch";
  const { env } = fixture("game-memory", "initMemoryGame");
  mismatch(env);
  env.timers.advance(100);
  click(env, "memoryStartBtn");
  const third = mismatch(env);
  env.timers.advance(600);
  env.dispatch(third, "click");
  check(name, "a stale timeout cannot allow a third card during the new mismatch", env.byId("memoryGrid").children.filter((card) => card.classList.contains("flipped")).length === 2);
  env.timers.advance(100);
  env.dispatch(third, "click");
  check(name, "the current mismatch releases the board after its own delay", third.classList.contains("flipped"));
});

run("gomoku enforces alternating turns", () => {
  const name = "gomoku enforces alternating turns";
  const { env } = fixture("game-gomoku", "initGomokuGame");
  const cells = env.byId("gomokuBoard").children;
  env.dispatch(cells[0], "click");
  env.dispatch(cells[1], "click");
  check(name, "rapid second human click is ignored", env.byId("gomokuMoves").textContent === "1");
  env.timers.advance(260);
  check(name, "the AI replies exactly once", env.byId("gomokuMoves").textContent === "2" && cells.filter((cell) => cell.classList.contains("is-white")).length === 1);
  const empty = cells.find((cell) => !cell.classList.contains("is-black") && !cell.classList.contains("is-white"));
  env.dispatch(empty, "click");
  check(name, "human input resumes after the reply", env.byId("gomokuMoves").textContent === "3");
  click(env, "gomokuUndoBtn");
  env.timers.advance(260);
  check(name, "undo cancels the pending reply", env.byId("gomokuMoves").textContent === "2");
});

run("mines flags preserve the first safe dig", () => {
  const name = "mines flags preserve the first safe dig";
  let spot = 0;
  const { env } = fixture("game-mines", "initMinesGame", { random: () => (((spot++ * 7) % 81) + 0.1) / 81 });
  const cells = env.byId("mnGrid").children;
  click(env, "mnFlagBtn");
  env.dispatch(cells[0], "click");
  check(name, "flag-mode click places a flag without starting the timer", cells[0].classList.contains("is-flagged") && env.timers.pendingIntervals() === 0);
  click(env, "mnFlagBtn");
  env.dispatch(cells[0], "click");
  check(name, "digging a flagged cell keeps the board idle", env.timers.pendingIntervals() === 0);
  env.dispatch(cells[2], "click");
  check(name, "the first actual dig is safe after preliminary flagging", cells[2].classList.contains("is-open") && !cells[2].classList.contains("is-mine") && env.byId("mnResult").textContent === "mnGo");
  env.dispatch(cells[7], "click");
  check(name, "the detonated mine remains highlighted after the final repaint", cells[7].classList.contains("is-boom") && env.byId("mnResult").textContent === "mnBoom");
  click(env, "mnStartBtn");
  check(name, "a new board clears the old blast marker", !cells[7].classList.contains("is-boom"));
});

run("lights out paints the winning cross", () => {
  const name = "lights out paints the winning cross";
  const { env, rewards } = fixture("game-lights", "initLightsGame", { random: () => 0 });
  const cells = env.byId("litGrid").children;
  check(name, "fixture starts with a visible cross", cells.some((cell) => cell.classList.contains("is-on")));
  env.dispatch(cells[0], "click");
  check(name, "the completed board visibly goes dark", cells.every((cell) => !cell.classList.contains("is-on") && cell.getAttribute("aria-pressed") === "false"));
  check(name, "one completion is rewarded", rewards.length === 1 && env.byId("litMoves").textContent === "1");
});

run("traffic cars move in both directions", () => {
  const name = "traffic cars move in both directions";
  const { env } = fixture("game-traffic", "initTrafficGame");
  const board = env.byId("trafBoard");
  env.dispatch(board.children[0], "click");
  env.dispatch(board, "keydown", { key: "ArrowRight" });
  env.dispatch(board, "keydown", { key: "ArrowLeft" });
  check(name, "taxi can return left after moving right", env.byId("trafMoves").textContent === "2" && board.children[0].style.left === "0%");
  env.dispatch(board.children[2], "click");
  env.dispatch(board, "keydown", { key: "ArrowUp" });
  check(name, "vertical cars can move up", env.byId("trafMoves").textContent === "3" && board.children[2].style.top === "0%");
});

run("2048 handles a winning board with no further moves", () => {
  const name = "2048 handles a winning board with no further moves";
  const store = new Map([["g2048-state", JSON.stringify({ grid: [[1024, 1024, 4, 8], [8, 16, 2, 4], [4, 8, 4, 8], [8, 4, 8, 4]], score: 0, won: false, over: false })]]);
  const { env, rewards } = fixture("game-2048", "initG2048", { store, random: () => 0 });
  env.dispatch(env.byId("g2048Board"), "keydown", { key: "ArrowLeft" });
  check(name, "reaching 2048 offers the win continuation", env.byId("g2048OverlayText").textContent === "g2048Win" && env.byId("g2048KeepBtn").hidden === false);
  click(env, "g2048KeepBtn");
  check(name, "continuing an immovable board reports game over", env.byId("g2048Overlay").hidden === false && env.byId("g2048KeepBtn").hidden === true && JSON.parse(store.get("g2048-state")).over === true);
  env.dispatch(env.byId("g2048Board"), "keydown", { key: "ArrowLeft" });
  check(name, "game over is rewarded only once", rewards.length === 1);
});

run("reversi cancels old AI moves on restart", () => {
  const name = "reversi cancels old AI moves on restart";
  const { env, App } = fixture("game-glyph-reversi", "initGlyphReversiGame");
  attachDrawer(env, App, "gameTabGlyphReversi");
  const canvas = env.byId("revCanvas");
  env.dispatch(canvas, "pointerdown", { clientX: 6 + 3.5 * 38, clientY: 6 + 2.5 * 38 });
  check(name, "a legal player move queues the reply", env.timers.pendingTimeouts() === 1);
  click(env, "gameCloseBtn");
  click(env, "gameToggleBtn");
  env.dispatch(canvas, "pointerdown", { clientX: 6 + 2.5 * 38, clientY: 6 + 3.5 * 38 });
  check(name, "closing the drawer preserves the AI turn lock", env.byId("revYou").textContent === "4");
  click(env, "revNewBtn");
  env.timers.advance(500);
  check(name, "the new opening remains unchanged after the old reply time", env.byId("revYou").textContent === "2" && env.byId("revAi").textContent === "2");
});

run("four cancels old AI drops on restart", () => {
  const name = "four cancels old AI drops on restart";
  const { env, App, frames } = fixture("game-glyph-four", "initGlyphFourGame");
  attachDrawer(env, App, "gameTabGlyphFour");
  env.dispatch(env.byId("c4Canvas"), "pointerdown", { clientX: 160, clientY: 160 });
  for (let frame = 0; frame < 21; frame += 1) frames.shift()();
  check(name, "the landed player disc queues the AI drop", env.timers.pendingTimeouts() === 1 && env.byId("c4You").textContent === "1");
  click(env, "gameCloseBtn");
  click(env, "gameToggleBtn");
  env.dispatch(env.byId("c4Canvas"), "pointerdown", { clientX: 80, clientY: 160 });
  check(name, "closing the drawer cannot grant an extra human drop", env.byId("c4Moves").textContent === "1");
  click(env, "c4NewBtn");
  env.timers.advance(500);
  for (let frame = 0; frame < 24; frame += 1) frames.shift()();
  check(name, "the restarted board receives no stale AI disc", env.byId("c4Ai").textContent === "0" && env.byId("c4You").textContent === "0");
});

run("fleet cancels old AI shots on restart", () => {
  const name = "fleet cancels old AI shots on restart";
  const { env, App } = fixture("game-glyph-fleet", "initGlyphFleetGame");
  attachDrawer(env, App, "gameTabGlyphFleet");
  const canvas = env.byId("fltCanvas");
  env.dispatch(canvas, "pointerdown", { clientX: 175, clientY: 39 });
  check(name, "a player shot queues the AI reply", env.timers.pendingTimeouts() === 1 && env.byId("fltShots").textContent === "1");
  click(env, "gameTabTyping");
  click(env, "gameTabGlyphFleet");
  env.dispatch(canvas, "pointerdown", { clientX: 193, clientY: 39 });
  check(name, "closing the drawer cannot grant an extra human shot", env.byId("fltShots").textContent === "1");
  click(env, "fltNewBtn");
  env.timers.advance(700);
  check(name, "the new board stays ready after the old shot time", env.byId("fltShots").textContent === "0" && env.byId("fltResult").textContent === "fltReady");
});

run("reversi resolves every consecutive forced pass", () => {
  const name = "reversi resolves every consecutive forced pass";
  const { env, App } = fixture("game-glyph-reversi", "initGlyphReversiGame", {
    probe: (source) => source.replace(
      "    loadLevel(revLevels[campaign.indexOf(campaign.nextLevelId())]);",
      "    App.__puzzleTest = { setBoard: function (value) { board = value.slice(); passCount = 0; }, board: function () { return board; }, playTurn: playTurn, cleared: function () { return cleared; } };\n    loadLevel(revLevels[campaign.indexOf(campaign.nextLevelId())]);",
    ),
  });
  // Two disjoint captures are available to the AI; the player must pass twice.
  const board = Array(64).fill(2);
  board[0] = 0;
  board[1] = 1;
  board[62] = 1;
  board[63] = 0;
  check(name, "fixture requires a player pass and has two AI moves", App.glyphReversiMoves(board, 1).length === 0 && App.glyphReversiMoves(board, 2).length === 2);
  App.__puzzleTest.setBoard(board);
  App.__puzzleTest.playTurn();
  check(name, "both forced AI captures resolve and the loss concludes", App.__puzzleTest.cleared() && App.__puzzleTest.board().every((cell) => cell === 2) && env.byId("revResult").textContent.startsWith("revLoss"));
});

run("spot diff advances without beating a legacy best", () => {
  const name = "spot diff advances without beating a legacy best";
  const store = new Map([["spot-diff-best", "1"]]);
  const { env } = fixture("game-spot-diff", "initSpotDiffGame", { store });
  click(env, "spotStartBtn");
  env.timers.advance(1000);
  const base = env.byId("spotBase").children;
  const edit = env.byId("spotEdit");
  const differences = edit.children.filter((cell, index) => cell.textContent !== base[index].textContent);
  differences.forEach((cell) => env.dispatch(edit, "click", { target: cell }));
  const saved = JSON.parse(store.get("spot-diff-best"));
  check(name, "a slower clear preserves the old best and unlocks the next rung", saved.level === 2 && saved.bests["1"] === 1);
  click(env, "spotStartBtn");
  check(name, "the next round starts at the unlocked level", env.byId("spotLevel").textContent === "2/5");
});

run("spot diff wrong flashes clear after repeated mistakes", () => {
  const name = "spot diff wrong flashes clear after repeated mistakes";
  const { env } = fixture("game-spot-diff", "initSpotDiffGame");
  click(env, "spotStartBtn");
  const base = env.byId("spotBase").children;
  const edit = env.byId("spotEdit");
  const unchanged = edit.children.filter((cell, index) => cell.textContent === base[index].textContent);
  env.dispatch(edit, "click", { target: unchanged[0] });
  env.timers.advance(100);
  env.dispatch(edit, "click", { target: unchanged[1] });
  env.timers.advance(450);
  check(name, "no earlier wrong character remains permanently highlighted", edit.children.every((cell) => !cell.classList.contains("is-wrong")));
  env.dispatch(edit, "click", { target: unchanged[0] });
  click(env, "spotStartBtn");
  env.timers.advance(500);
  check(name, "a restart cancels the old flash callback", edit.children.every((cell) => !cell.classList.contains("is-wrong")));
});

run("aurora keeps ribbons clear of other endpoints", () => {
  const name = "aurora keeps ribbons clear of other endpoints";
  const { App } = fixture("game-aurora-flow", "initAuroraFlowGame", {
    probe: (source) => source.replace(
      "    loadLevel(auroraLevels[campaign.indexOf(campaign.nextLevelId())]);",
      "    App.__puzzleTest = { ribbons: function () { return ribbons; }, beginDrag: beginDrag, extend: extendRibbon };\n    loadLevel(auroraLevels[campaign.indexOf(campaign.nextLevelId())]);",
    ),
  });
  const probe = App.__puzzleTest;
  probe.beginDrag(0);
  probe.extend(0, 5);
  probe.extend(0, 10);
  probe.extend(0, 15); // Another pair's starting endpoint.
  check(name, "another pair's starting dot cannot be crossed", probe.ribbons()[0].cells.join(",") === "0,5,10");
  probe.beginDrag(0);
  [1, 2, 3, 4, 9, 14].forEach((cell) => probe.extend(0, cell));
  check(name, "a completed ribbon ends at its twin", probe.ribbons()[0].done && probe.ribbons()[0].cells[probe.ribbons()[0].cells.length - 1] === 9);
  probe.beginDrag(9);
  check(name, "grabbing a completed twin starts a fresh ribbon", probe.ribbons()[0].cells.length === 1 && probe.ribbons()[0].cells[0] === 9 && !probe.ribbons()[0].done);
  probe.beginDrag(12);
  probe.extend(2, 13);
  probe.extend(2, 14);
  check(name, "the second ribbon can reach its own unobstructed twin", probe.ribbons()[2].done);
});

run("pusher preserves the next room's starting position", () => {
  const name = "pusher preserves the next room's starting position";
  const { env, App } = fixture("game-glyph-pusher", "initGlyphPusherGame", {
    probe: (source) => source.replace(
      "    loadLevel(pushLevels[campaign.indexOf(campaign.nextLevelId())]);",
      "    App.__puzzleTest = { player: function () { return player; }, level: function () { return level; } };\n    loadLevel(pushLevels[campaign.indexOf(campaign.nextLevelId())]);",
    ),
  });
  env.dispatch(env.byId("sokCanvas"), "keydown", { key: "ArrowRight" });
  check(name, "the one-push opening unlocks the second room", App.__puzzleTest.level().id === "k2");
  check(name, "the next room starts at its declared player cell", App.__puzzleTest.player().join(",") === "2,2" && env.byId("sokMoves").textContent === "0");
  env.dispatch(env.byId("sokCanvas"), "keydown", { key: "ArrowDown" });
  check(name, "the new room's first push is valid", env.byId("sokMoves").textContent === "1");
});

if (require.main === module) {
  lib.caseResults.forEach((result) => console.log(`${result.failed ? "FAIL" : "PASS"} ${result.name}: ${result.checks} checks`));
  lib.failures.forEach((failure) => console.error(failure));
  console.log(`${lib.passCount} checks passed; ${lib.failures.length} failed`);
  process.exitCode = lib.failures.length ? 1 : 0;
}
