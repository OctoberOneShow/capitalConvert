/* Focused gameplay regressions. Run directly with node or require from the harness. */
"use strict";

const fs = require("fs");
const path = require("path");
const lib = require("./lib");
const { createEnvironment, check, run } = lib;
const root = path.join(__dirname, "..", "..");

/* The inspection hook exists only in this VM copy. Production games keep their
 * closure state private; fixtures set up precise player-reachable situations. */
function arcade(name) {
  const env = createEnvironment();
  const source = fs.readFileSync(path.join(root, "assets", "app", "game-" + name + ".js"), "utf8");
  const App = env.window.CapitalConvert = {
    t: (key, values) => key + (values ? JSON.stringify(values) : ""),
    getElement: (id) => env.byId(id),
    logAction() {}, createConfetti() {}, petNotifyGame() {},
    storage: env.localStorage, isMotionOff: () => false, setStatus() {},
  };
  const frames = new Map();
  let nextFrame = 1;
  env.window.requestAnimationFrame = (fn) => {
    const id = nextFrame++;
    frames.set(id, fn);
    return id;
  };
  env.window.cancelAnimationFrame = (id) => frames.delete(id);
  const ids = new Set(Array.from(source.matchAll(/getElement\("([^"]+)"\)/g), (m) => m[1]));
  if (name === "glyph-echo" || name === "ink-beat") {
    for (let index = 0; index < 4; index += 1) ids.add((name === "glyph-echo" ? "echo" : "beat") + "Pad" + index);
  }
  Array.from(source.matchAll(/getElementById\("([^"]+)"\)/g), (m) => m[1]).forEach((id) => ids.add(id));
  ids.forEach((id) => {
    const node = env.document.createElement(/Canvas|Next$/.test(id) ? "canvas" : /Sel$/.test(id) ? "select" : "div");
    node.id = id;
    node.width = 320;
    node.height = 360;
    node.getBoundingClientRect = () => ({ left: 0, top: 0, width: 320, height: 360 });
    env.document.body.appendChild(node);
  });
  if (name === "typing") {
    const dialog = env.document.createElement("div");
    dialog.className = "game-dialog";
    env.byId("gameModal").appendChild(dialog);
  }
  env.load(fs.readFileSync(path.join(root, "assets", "app", "game-campaign.js"), "utf8"));
  const marker = /\r?\n  }\r?\n\r?\n\r?\n  \/\* Exported/;
  if (!marker.test(source)) throw new Error("inspection marker missing: " + name);
  env.load(source.replace(marker, "\n    App.arcadeInspect = function (code) { return eval(code); };\n  }\n\n\n  /* Exported"));
  const initializer = /App\.(init\w+) =/.exec(source)[1];
  App[initializer]();
  if (!App.arcadeInspect) throw new Error("fixture failed to initialize: " + name);
  return Object.assign(env, { App, frames, inspect: App.arcadeInspect });
}

const matchBoard = "board = Array.from({length: 64}, function (_, i) { return (i % 8 + Math.floor(i / 8)) % 6; }); board[0] = 1; board[1] = 0; board[2] = 1; board[9] = 1;";

run("arcade-cascade-budget", () => {
  const env = arcade("ink-cascade");
  env.inspect(matchBoard + " movesLeft = 0; score = 0; render(); renderHud();");
  env.byId("inkBoard").children[1].click();
  env.byId("inkBoard").children[9].click();
  env.timers.advance(190);
  check("arcade-cascade-budget", "a spent move budget cannot produce another scoring swap", env.inspect("score === 0 && movesLeft === 0"));
});

run("arcade-cascade-restart", () => {
  const env = arcade("ink-cascade");
  env.inspect(matchBoard + " attemptSwap(1, 9);");
  check("arcade-cascade-restart", "the fixture starts a cascade", env.timers.pendingTimeouts() === 1);
  env.timers.advance(190);
  env.byId("inkNewBtn").click();
  const board = env.inspect("JSON.stringify(board)");
  env.timers.advance(1000);
  check("arcade-cascade-restart", "reset cancels the old cascade callback", env.timers.pendingTimeouts() === 0);
  check("arcade-cascade-restart", "old matches cannot change a fresh round", env.inspect("score === 0 && movesLeft === level.moves && JSON.stringify(board)") === board);
});

run("arcade-cascade-pause-score", () => {
  const env = arcade("ink-cascade");
  env.inspect(matchBoard + " attemptSwap(1, 9);");
  env.timers.advance(190);
  check("arcade-cascade-pause-score", "the initial match scores once", env.inspect("score") === 30);
  /* Refills deliberately contain no follow-up match, isolating the pending pop. */
  env.inspect("collapseAndRefill = function () { board = Array.from({length: 64}, function (_, i) { return (i % 8 + Math.floor(i / 8)) % 6; }); }; ");
  env.App.quietResetInkCascade();
  check("arcade-cascade-pause-score", "closing mid-pop does not score the same match twice", env.inspect("score") === 30);
  check("arcade-cascade-pause-score", "closing leaves complete tiles and no timer", env.inspect("board.every(function (color) { return color >= 0; })") && env.timers.pendingTimeouts() === 0);
});

run("arcade-echo-restart", () => {
  const env = arcade("glyph-echo");
  env.byId("echoStartBtn").click();
  env.timers.advance(200);
  env.byId("echoStartBtn").click();
  env.timers.advance(env.inspect("level.stepMs + 21"));
  check("arcade-echo-restart", "an old sequence cannot unlock pads during a restarted replay", env.inspect("state") === "showing");
  env.timers.advance(200);
  check("arcade-echo-restart", "the restarted sequence eventually accepts input", env.inspect("state") === "input");
});

run("arcade-beat-restart", () => {
  const env = arcade("ink-beat");
  env.byId("beatStartBtn").click();
  env.byId("beatStartBtn").click();
  check("arcade-beat-restart", "restarting has exactly one animation callback", env.frames.size === 1, String(env.frames.size));
  env.App.quietResetInkBeat();
  check("arcade-beat-restart", "closing cancels every rhythm callback", env.frames.size === 0, String(env.frames.size));
});

run("arcade-crossing-lane-spacing", () => {
  const env = arcade("glyph-crossing");
  env.inspect("for (var step = 0; step < 3000; step += 1) update(0.032);");
  check("arcade-crossing-lane-spacing", "traffic and logs retain their spacing after repeated wraps", env.inspect("level.lanes.every(function (lane, laneIndex) { var list = props.filter(function (prop) { return prop.lane === laneIndex; }).map(function (prop) { return prop.x; }).sort(function (a, b) { return a - b; }); return list.every(function (x, index) { return index === 0 || Math.abs(x - list[index - 1] - lane.len - lane.gap) < 0.001; }); })"));
});

run("arcade-crossing-respawn", () => {
  const env = arcade("glyph-crossing");
  env.byId("croStartBtn").click();
  env.inspect("die('car');");
  env.App.quietResetGlyphCrossing();
  env.byId("croStartBtn").click();
  env.byId("croRight").click();
  const x = env.inspect("frog.x");
  env.timers.advance(550);
  check("arcade-crossing-respawn", "an earlier run's respawn cannot teleport the new frog", env.inspect("frog.x") === x);
});

run("arcade-leap-continuation", () => {
  const env = arcade("glyph-leap");
  env.byId("leapStartBtn").click();
  const count = env.inspect("platforms.length");
  env.inspect("player.y = -400; player.vy = -100; update(0.016);");
  check("arcade-leap-continuation", "scrolling up generates ledges above the new camera", env.inspect("platforms.some(function (p) { return p.y <= camY - 120; })"), "initial platforms: " + count);
});

run("arcade-leap-landing", () => {
  const env = arcade("glyph-leap");
  env.byId("leapStartBtn").click();
  env.inspect("platforms = [{x: 120, baseX: 120, y: 200, w: 80, kind: 'static'}]; player = {x: 160, y: 190, vx: 0, vy: 500, r: 9}; update(0.032);");
  check("arcade-leap-landing", "a fast downward crossing still lands on a thin ledge", env.inspect("player.vy < 0 && jumps === 1"));
});

run("arcade-breakout-tough-contact", () => {
  const env = arcade("breakout");
  env.inspect("bricks = [makeBrick(2, 2, 't'), makeBrick(6, 0, 'n')]; ball = {x: bricks[0].x + 17, y: bricks[0].y + 15 + brkBallR - 0.5, vx: 0, vy: -2}; stepBall(); stepBall();");
  check("arcade-breakout-tough-contact", "one contact removes one tough-brick hit point", env.inspect("bricks[0].hp === 1 && ball.vy > 0 && score === 0"));
});

run("arcade-typing-deadline", () => {
  const env = arcade("typing");
  const input = env.byId("typingInput");
  input.value = env.inspect("phrase[0]");
  env.dispatch(input, "input");
  /* Model a throttled/background timer: input arrives before the delayed tick. */
  env.clock.now += 10050;
  input.value = env.inspect("phrase");
  env.dispatch(input, "input");
  check("arcade-typing-deadline", "completion after ten seconds ends as time up", env.byId("gameResult").textContent.startsWith("typingTimeUp"));
  check("arcade-typing-deadline", "a late completion cannot save a best", !env.store.has("typing-sprint-best"));
});

run("arcade-starfall-held-controls", () => {
  const env = arcade("starfall");
  env.byId("lantStartBtn").click();
  env.dispatch(env.byId("lantCanvas"), "keydown", { key: "ArrowUp" });
  env.App.quietResetStarfall();
  env.byId("lantStartBtn").click();
  env.inspect("update(0.016);");
  check("arcade-starfall-held-controls", "reopening cannot leave thrust stuck on", env.inspect("lander.fuel === level.fuel"));
});

run("arcade-responsive-aim", () => {
  [
    ["bubble-ink", "bubStartBtn", "bubCanvas", 270],
    ["peg-splash", "pegStartBtn", "pegCanvas", 300],
  ].forEach(([name, startId, canvasId, height]) => {
    const env = arcade(name);
    env.byId(startId).click();
    const canvas = env.byId(canvasId);
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 480, height: height * 1.5 });
    env.dispatch(canvas, "pointermove", { clientX: 240, clientY: 150 });
    const vertical = name === "bubble-ink" ? -Math.PI / 2 : Math.PI / 2;
    check("arcade-responsive-aim", name + " aims vertically at the displayed canvas centre", Math.abs(env.inspect("aim") - vertical) < 1e-9);
  });
});

run("arcade-beat-delayed-frame", () => {
  const env = arcade("ink-beat");
  env.byId("beatStartBtn").click();
  env.inspect("startAt = nowSec() - notes[0][3].time;");
  env.dispatch(env.byId("beatCanvas"), "keydown", { key: env.inspect("beatKeys[0]") });
  check("arcade-beat-delayed-frame", "a current note is hittable despite expired notes from a delayed frame", env.inspect("perfectCount === 1 && notes[0][3].hit"));
  check("arcade-beat-delayed-frame", "expired notes are marked missed before judging a new hit", env.inspect("missCount > 0 && notes[0][0].judged && !notes[0][0].hit"));
});

run("arcade-animation-lifecycle", () => {
  [
    ["starfall", "lantStartBtn", "quietResetStarfall"],
    ["glyph-crossing", "croStartBtn", "quietResetGlyphCrossing"],
    ["comet-golf", null, "quietResetCometGolf"],
  ].forEach(([name, startId, resetName]) => {
    const env = arcade(name);
    check("arcade-animation-lifecycle", name + " starts with no hidden animation callback", env.frames.size === 0);
    if (startId) env.byId(startId).click();
    else env.dispatch(env.byId("cgfCanvas"), "keydown", { key: "Enter" });
    check("arcade-animation-lifecycle", name + " starts animating on play", env.frames.size === 1);
    env.App[resetName]();
    check("arcade-animation-lifecycle", name + " cancels its callback on drawer close", env.frames.size === 0);
  });
  ["bubble-ink", "peg-splash"].forEach((name) => {
    const env = arcade(name);
    env.byId(name === "bubble-ink" ? "bubStartBtn" : "pegStartBtn").click();
    const [id, callback] = Array.from(env.frames.entries())[0];
    env.frames.delete(id);
    env.inspect("alive = false;");
    callback(env.clock.now + 16);
    check("arcade-animation-lifecycle", name + " stops scheduling frames when a round ends", env.frames.size === 0);
  });
});

/* Exercise the untouched arcade modules alongside the repairs so changes to
 * shared storage or loop startup cannot silently break their ordinary controls. */
[
  ["typing", "gameStartBtn", "typingInput", "quietResetTyping"],
  ["reflex", "reflexStartBtn", "reflexPad", "quietResetReflex"],
  ["caret-dash", "caretStartBtn", "caretField", "quietResetCaretDash"],
  ["stack", "stackStartBtn", "stackField", "quietResetStack"],
  ["breakout", "brkStartBtn", "brkCanvas", "quietResetBreakout"],
  ["snake", "snkStartBtn", "snkCanvas", "quietResetSnake"],
  ["glyph-blocks", "blkStartBtn", "blkCanvas", "quietResetGlyphBlocks"],
  ["ink-cascade", "inkNewBtn", "inkBoard", "quietResetInkCascade"],
  ["ink-beat", "beatStartBtn", "beatCanvas", "quietResetInkBeat"],
  ["bubble-ink", "bubStartBtn", "bubCanvas", "quietResetBubbleInk"],
  ["glyph-echo", "echoStartBtn", "echoBoard", "quietResetGlyphEcho"],
  ["ink-slash", "slashStartBtn", "slashCanvas", "quietResetInkSlash"],
  ["peg-splash", "pegStartBtn", "pegCanvas", "quietResetPegSplash"],
  ["glyph-raid", "raidStartBtn", "raidCanvas", "quietResetGlyphRaid"],
  ["glyph-leap", "leapStartBtn", "leapCanvas", "quietResetGlyphLeap"],
  ["comet-golf", "cgfStartBtn", "cgfCanvas", "quietResetCometGolf"],
  ["starfall", "lantStartBtn", "lantCanvas", "quietResetStarfall"],
  ["glyph-crossing", "croStartBtn", "croCanvas", "quietResetGlyphCrossing"],
].forEach(([name, startId, fieldId, resetName]) => run("arcade-smoke-" + name, () => {
  const env = arcade(name);
  env.byId(startId).click();
  const field = env.byId(fieldId);
  ["ArrowLeft", "ArrowRight", "ArrowUp", " "].forEach((key) => {
    env.dispatch(field, "keydown", { key });
    env.dispatch(field, "keyup", { key });
  });
  for (let step = 0; step < 20; step += 1) {
    env.timers.advance(16);
    Array.from(env.frames.entries()).forEach(([id, callback]) => {
      env.frames.delete(id);
      callback(env.clock.now);
    });
  }
  env.App[resetName]();
  check("arcade-smoke-" + name, "ordinary startup and keyboard play complete without errors", true);
  check("arcade-smoke-" + name, "drawer close leaves no game interval or animation callback", env.timers.pendingIntervals() === 0 && env.frames.size === 0);
}));

if (require.main === module) {
  console.log("checks passed: " + lib.passCount);
  console.log("checks failed: " + lib.failures.length);
  lib.failures.forEach((failure) => console.error(failure));
  process.exitCode = lib.failures.length ? 1 : 0;
}
