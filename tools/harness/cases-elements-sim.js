/*
 * Elements cases (part 1).
 * The simulation core and the campaign boards, driving the real
 * createElementsSim extracted from the app source.
 */
"use strict";

const { createEnvironment, appSource, check, near, boot, seedToolDom, run } = require("./lib");

const ELEMENTS_KEY = "elements-best";

/* Extracts a top-level function from app.js by brace matching, so the harness
 * can run the REAL code rather than trusting a copy of it. */
function extractAppFunction(name) {
  const start = appSource.indexOf("function " + name + "(");
  if (start === -1) throw new Error("missing " + name);
  const open = appSource.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < appSource.length; i += 1) {
    const char = appSource[i];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return appSource.slice(start, i + 1);
    }
  }
  throw new Error("unbalanced " + name);
}

/* The elemental sandbox exactly as app.js declares it: a single self-contained
 * factory with no DOM, no timers and no Math.random, so every rule driven below
 * is the rule the page runs. */
const realElements = new Function(
  extractAppFunction("createElementsSim") + "\nreturn createElementsSim;",
)();

function newSim(options) {
  return realElements(
    Object.assign({ cols: 80, rows: 56, seed: 4242 }, options || {}),
  );
}

function steps(sim, count) {
  for (let i = 0; i < count; i += 1) sim.step();
  return sim;
}

/* Every cell holding a value, so a rule can be checked against where the
 * material actually ended up rather than against an assumed layout. */
function cellsWith(sim, value) {
  const found = [];
  for (let y = 0; y < sim.rows; y += 1) {
    for (let x = 0; x < sim.cols; x += 1) {
      if (sim.get(x, y) === value) found.push({ x, y });
    }
  }
  return found;
}

/* The height of each column's material, measured from the bottom edge up. */
function columnHeights(sim, value) {
  const heights = [];
  for (let x = 0; x < sim.cols; x += 1) {
    let height = 0;
    for (let y = sim.rows - 1; y >= 0; y -= 1) {
      if (sim.get(x, y) === value) height = sim.rows - y;
    }
    heights.push(height);
  }
  return heights;
}

/* A grain is at rest when the cell below it, or one of the two cells below its
 * diagonals, holds the same material or stone. */
function resting(sim, x, y, value) {
  const solid = (cell) => cell === value || cell === sim.stone;
  return (
    y === sim.rows - 1 ||
    solid(sim.get(x, y + 1)) ||
    solid(sim.get(x - 1, y + 1)) ||
    solid(sim.get(x + 1, y + 1))
  );
}

/* The panel the four pages carry, rebuilt for a headless boot. */
/* The full roster, in the order the palette and the number keys use. Ids 0-5
 * keep the positions they have always had, so 1-6 still mean what they meant
 * before the expansion. */
const ELEMENT_TOOLS = [
  "empty",
  "stone",
  "sand",
  "water",
  "plant",
  "fire",
  "wood",
  "ash",
  "oil",
  "lava",
  "ice",
  "steam",
  "acid",
  "seed",
  "smoke",
  "glass",
  "void",
];

function buildElementsPanel(env) {
  const doc = env.document;
  const panel = doc.createElement("div");
  panel.className = "game-panel";
  panel.id = "gamePanelElements";
  panel.hidden = true;

  const hud = doc.createElement("div");
  hud.className = "game-hud";
  [
    ["elementsTimeLabel", "Time", "span"],
    ["elementsTime", "0.0s", "strong"],
    ["elementsProgress", "-", "strong"],
    ["elementsBudgetLabel", "Ink", "span"],
    ["elementsBudget", "-", "strong"],
    ["elementsStarsLabel", "Stars", "span"],
    ["elementsStars", "-", "strong"],
  ].forEach(([id, text, tag]) => {
    const stat = doc.createElement("div");
    stat.className = "game-stat";
    const element = doc.createElement(tag);
    element.id = id;
    element.textContent = text;
    stat.appendChild(element);
    hud.appendChild(stat);
  });

  const row = doc.createElement("div");
  row.className = "elements-row";
  const label = doc.createElement("label");
  label.className = "elements-label";
  label.setAttribute("for", "elementsChallenge");
  label.setAttribute("data-i18n", "elementsChallengeLabel");
  label.textContent = "Challenge";
  const select = doc.createElement("select");
  select.className = "elements-select";
  select.id = "elementsChallenge";
  row.appendChild(label);
  row.appendChild(select);

  const speedRow = doc.createElement("div");
  speedRow.className = "elements-row";
  const speedLabel = doc.createElement("label");
  speedLabel.className = "elements-label";
  speedLabel.setAttribute("for", "elementsSpeed");
  speedLabel.setAttribute("data-i18n", "elementsSpeedLabel");
  speedLabel.textContent = "Speed";
  const speed = doc.createElement("select");
  speed.className = "elements-select";
  speed.id = "elementsSpeed";
  speed.value = "1";
  speedRow.appendChild(speedLabel);
  speedRow.appendChild(speed);

  const tools = doc.createElement("div");
  tools.className = "elements-tools";
  tools.setAttribute("role", "group");
  ELEMENT_TOOLS.forEach((name) => {
    const button = doc.createElement("button");
    const suffix = name.charAt(0).toUpperCase() + name.slice(1);
    button.className = "elements-tool";
    button.id = "elementsTool" + suffix;
    button.setAttribute("type", "button");
    button.setAttribute("data-element", name);
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("data-i18n", "elements" + suffix);
    tools.appendChild(button);
  });

  const legend = doc.createElement("p");
  legend.className = "elements-legend";
  legend.id = "elementsLegend";

  const brushRow = doc.createElement("div");
  brushRow.className = "elements-row";
  const brushLabel = doc.createElement("span");
  brushLabel.className = "elements-label";
  brushLabel.id = "elementsBrushLabel";
  brushLabel.setAttribute("data-i18n", "elementsBrushLabel");
  brushLabel.textContent = "Brush";
  const brushes = doc.createElement("div");
  brushes.className = "elements-brushes";
  brushes.setAttribute("role", "group");
  brushes.setAttribute("aria-labelledby", "elementsBrushLabel");
  [0, 1, 2, 3].forEach((size, index) => {
    const button = doc.createElement("button");
    button.className = "elements-brush" + (size === 2 ? " is-active" : "");
    button.id = "elementsBrush" + String(index + 1);
    button.setAttribute("type", "button");
    button.setAttribute("data-size", String(size));
    button.setAttribute("aria-pressed", size === 2 ? "true" : "false");
    button.textContent = String(size * 2 + 1);
    brushes.appendChild(button);
  });
  brushRow.appendChild(brushLabel);
  brushRow.appendChild(brushes);

  const stage = doc.createElement("div");
  stage.className = "elements-stage";
  stage.id = "elementsStage";
  const canvas = doc.createElement("canvas");
  canvas.className = "elements-canvas";
  canvas.id = "elementsCanvas";
  canvas.setAttribute("width", "320");
  canvas.setAttribute("height", "224");
  canvas.setAttribute("tabindex", "0");
  canvas.setAttribute("role", "application");
  canvas.setAttribute("aria-label", "Element sandbox.");
  canvas.setAttribute("data-i18n-aria", "elementsCanvasLabel");
  canvas.setAttribute("aria-describedby", "elementsDescription");
  const cursor = doc.createElement("span");
  cursor.className = "elements-cursor";
  cursor.id = "elementsCursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.hidden = true;
  stage.appendChild(canvas);
  stage.appendChild(cursor);

  const description = doc.createElement("p");
  description.className = "visually-hidden";
  description.id = "elementsDescription";
  const goal = doc.createElement("p");
  goal.className = "elements-goal";
  goal.id = "elementsGoal";
  const result = doc.createElement("p");
  result.className = "game-result";
  result.id = "elementsResult";
  result.setAttribute("role", "status");
  result.setAttribute("data-i18n", "elementsGoalFree");
  result.textContent = "Free play.";

  /* The hand controls the expansion added: hold the loop, take one generation,
   * eyedrop and undo. */
  const hand = doc.createElement("div");
  hand.className = "elements-actions";
  [
    ["elementsPauseBtn", "elementsPause", "Pause", true],
    ["elementsStepBtn", "elementsStep", "Step", false],
    ["elementsPickBtn", "elementsPick", "Pick", true],
    ["elementsUndoBtn", "elementsUndo", "Undo", false],
  ].forEach(([id, key, text, pressed]) => {
    const button = doc.createElement("button");
    button.className = "ghost";
    button.id = id;
    if (pressed) button.setAttribute("aria-pressed", "false");
    const inner = doc.createElement("span");
    inner.setAttribute("data-i18n", key);
    inner.textContent = text;
    button.appendChild(inner);
    hand.appendChild(button);
  });

  const actions = doc.createElement("div");
  actions.className = "game-actions";
  const startBtn = doc.createElement("button");
  startBtn.className = "primary";
  startBtn.id = "elementsStartBtn";
  const startLabel = doc.createElement("span");
  startLabel.setAttribute("data-i18n", "btnStart");
  startLabel.textContent = "Start";
  startBtn.appendChild(startLabel);
  const resetBtn = doc.createElement("button");
  resetBtn.className = "ghost";
  resetBtn.id = "elementsResetBtn";
  const resetLabel = doc.createElement("span");
  resetLabel.setAttribute("data-i18n", "elementsReset");
  resetLabel.textContent = "Reset board";
  resetBtn.appendChild(resetLabel);
  const best = doc.createElement("p");
  best.className = "game-best";
  best.id = "elementsBest";
  best.setAttribute("data-i18n", "noBest");
  best.textContent = "No best yet";
  actions.appendChild(startBtn);
  actions.appendChild(resetBtn);
  actions.appendChild(best);

  [
    hud,
    row,
    speedRow,
    tools,
    legend,
    brushRow,
    stage,
    description,
    goal,
    result,
    hand,
    actions,
  ].forEach((node) => panel.appendChild(node));
  return panel;
}

function seedElementsDom(env) {
  const panel = buildElementsPanel(env);
  /* The real pages start with the panel hidden behind its tab; a panel-only
   * boot stands in for the player having opened that tab. */
  panel.hidden = false;
  env.document.body.appendChild(panel);
}

/* Panel-only boot: no drawer, so the loop can only start when the player does
 * something (start, reset, paint), which keeps the timer assertions sharp. */
function bootElements(options) {
  const env = createEnvironment(options || {});
  /* The tool page's elements too, so the action log a win writes has its
   * targets - exactly what the real pages provide. */
  seedToolDom(env);
  seedElementsDom(env);
  env.load(appSource);
  env.domReady();
  return env;
}

function elementsStore(env) {
  const raw = env.store.get(ELEMENTS_KEY);
  return raw === undefined ? null : JSON.parse(raw);
}

function elementsRecord(v, cleared, bests) {
  return JSON.stringify({ v: v, cleared: cleared || {}, bests: bests || {} });
}

function bootElementsWith(record) {
  return bootElements({ store: new Map([[ELEMENTS_KEY, record]]) });
}

/* The campaign order, which is also the unlock chain. */
const ELEMENTS_ORDER = [
  "free",
  "grow",
  "flood",
  "extinguish",
  "glass",
  "quench",
  "thaw",
  "spill",
  "etch",
  "sprout",
  "geyser",
  "grove",
];

/* The par table as the page declares it, so a check can compare a board's
 * rungs against what the board can actually do instead of a copy. */
const ELEMENTS_PARS = (() => {
  const table = appSource.slice(
    appSource.indexOf("var elementsChallenges = ["),
    appSource.indexOf("var elementsBasePalette"),
  );
  const pars = {};
  const re = /id: "([a-z]+)",[\s\S]*?stars: \[([^\]]+)\]/g;
  let match;
  while ((match = re.exec(table)) !== null) {
    pars[match[1]] = match[2].split(",").map((n) => parseFloat(n));
  }
  return pars;
})();

/* A v2 record cleared through `id` (inclusive), so a case can start with the
 * board it wants to play already unlocked - and with the elements that board
 * era has handed out. */
function clearedThrough(id, bests) {
  const cleared = {};
  const upto = ELEMENTS_ORDER.indexOf(id);
  ELEMENTS_ORDER.forEach((name, index) => {
    if (name !== "free" && index <= upto) cleared[name] = true;
  });
  return JSON.stringify({ v: 2, cleared: cleared, bests: bests || {} });
}

/* Every challenge cleared: the whole roster, glass included, is unlocked. */
function unlockedRecord() {
  return clearedThrough("grove");
}

/* The board the campaign opens on, with every element the last era unlocks. */
function boardRecordUpTo(id) {
  return bootElementsWith(clearedThrough(id));
}

function selectChallenge(env, id) {
  const select = env.byId("elementsChallenge");
  select.value = id;
  env.dispatch(select, "change", {});
}

function challengeOptionEl(env, id) {
  return env.byId("elementsChallenge").childNodes.find((node) => node.value === id);
}

function challengeOption(env, id) {
  const option = env
    .byId("elementsChallenge")
    .childNodes.find((node) => node.value === id);
  return option ? option.textContent : "";
}

function clickTool(env, name) {
  env.byId("elementsTool" + name.charAt(0).toUpperCase() + name.slice(1)).click();
}

function pressKey(env, key) {
  env.dispatch(env.byId("elementsCanvas"), "keydown", { key: key });
}

function clickBrush(env, size) {
  env.byId("elementsBrush" + String(size + 1)).click();
}

function setSpeedTo(env, value) {
  const select = env.byId("elementsSpeed");
  select.value = String(value);
  env.dispatch(select, "change", {});
}

function clickHand(env, id) {
  env.byId(id).click();
}

/* The canvas maps pointer coordinates through its bounding rect; the stub
 * reports a zero rect, so app.js falls back to the 320x224 internal size and
 * one cell is four client pixels. */
function canvasPoint(env, x, y) {
  const canvas = env.byId("elementsCanvas");
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.width || 320;
  const height = rect.height || canvas.height || 224;
  return {
    clientX: rect.left + ((x + 0.5) * width) / 80,
    clientY: rect.top + ((y + 0.5) * height) / 56,
  };
}

function paintCell(env, x, y) {
  const canvas = env.byId("elementsCanvas");
  const point = canvasPoint(env, x, y);
  env.dispatch(canvas, "pointerdown", {
    clientX: point.clientX,
    clientY: point.clientY,
    button: 0,
    pointerId: 1,
  });
  env.dispatch(canvas, "pointerup", { pointerId: 1 });
}

/* A drag, painted the way a pointer drag paints: one blob per sample, joined
 * up so a fast swipe leaves a line. */
function paintAcross(env, x0, x1, y) {
  const canvas = env.byId("elementsCanvas");
  const from = canvasPoint(env, x0, y);
  env.dispatch(canvas, "pointerdown", {
    clientX: from.clientX,
    clientY: from.clientY,
    button: 0,
    pointerId: 1,
  });
  const stepX = x1 >= x0 ? 1 : -1;
  for (let x = x0 + stepX; stepX > 0 ? x <= x1 : x >= x1; x += stepX) {
    const point = canvasPoint(env, x, y);
    env.dispatch(canvas, "pointermove", {
      clientX: point.clientX,
      clientY: point.clientY,
      pointerId: 1,
    });
  }
  env.dispatch(canvas, "pointerup", { pointerId: 1 });
}

/* What the renderer last handed to the canvas, read back at grid resolution:
 * the app fills one RGBA quad per cell and blits it through an offscreen
 * canvas at 4x. */
function renderedImage(env) {
  const ctx = env.byId("elementsCanvas").getContext("2d");
  if (!ctx) return null;
  if (ctx.lastImage && ctx.lastImage.data) return ctx.lastImage;
  /* The app blits through an offscreen canvas at grid resolution, so that is
   * where the pixels were put. */
  const source = ctx.lastSource;
  const sourceCtx = source && source.getContext ? source.getContext("2d") : null;
  return sourceCtx ? sourceCtx.lastImage : null;
}

function pixelAt(env, x, y) {
  const image = renderedImage(env);
  if (!image || !image.data) return null;
  const offset = (y * 80 + x) * 4;
  return [
    image.data[offset],
    image.data[offset + 1],
    image.data[offset + 2],
    image.data[offset + 3],
  ];
}

function looksLikeFire(pixel) {
  return !!pixel && pixel[0] === 255 && pixel[1] >= 110 && pixel[2] <= 110;
}

function looksLikeWater(pixel) {
  return !!pixel && pixel[2] > 150 && pixel[2] > pixel[1] + 40;
}

function looksLikeEmpty(pixel) {
  if (!pixel) return false;
  const dark = pixel[0] < 40 && pixel[1] < 60 && pixel[2] < 80;
  const light = pixel[0] > 235 && pixel[1] > 235 && pixel[2] > 235;
  return dark || light;
}

/* Stone is the only desaturated material, in either theme. */
function looksLikeStone(pixel) {
  if (!pixel) return false;
  return (
    Math.abs(pixel[0] - pixel[1]) < 24 &&
    Math.abs(pixel[1] - pixel[2]) < 28 &&
    pixel[0] > 60 &&
    pixel[0] < 235
  );
}

function won(env) {
  return /Goal met/.test(env.byId("elementsResult").textContent);
}

/* The frame the renderer last produced, copied out: the app paints into one
 * reused ImageData, so a snapshot has to be taken before the world is given a
 * chance to move. */
function frameSnapshot(env) {
  const image = renderedImage(env);
  return image && image.data ? Array.from(image.data) : null;
}

/* How many bytes of the rendered frame changed between two snapshots, or -1
 * when there was no frame to compare. */
function frameDiff(before, after) {
  if (!before || !after || before.length !== after.length) return -1;
  let changed = 0;
  for (let i = 0; i < before.length; i += 1) {
    if (before[i] !== after[i]) changed += 1;
  }
  return changed;
}

/* --- playing the boards the way a player would ------------------------- */

/* Flood: pour water in above the rim and let it find its level. */
function pourFlood(env, rounds) {
  clickTool(env, "water");
  let guard = 0;
  while (!won(env) && guard < (rounds || 12)) {
    paintAcross(env, 32, 48, 20);
    env.timers.advance(2000);
    guard += 1;
  }
  return won(env);
}

/* Grow: pour straight down the well, on top of the plant. */
function pourGrow(env, rounds) {
  clickTool(env, "water");
  let guard = 0;
  while (!won(env) && guard < (rounds || 20)) {
    for (let y = 0; y <= 10; y += 1) {
      paintCell(env, 40, y);
    }
    env.timers.advance(3000);
    guard += 1;
  }
  return won(env);
}

/* Extinguish: douse the run the fire is creeping along. */
function douseHedge(env, rounds) {
  clickTool(env, "water");
  let guard = 0;
  while (!won(env) && guard < (rounds || 12)) {
    paintAcross(env, 6, 73, 3);
    env.timers.advance(600);
    guard += 1;
  }
  return won(env);
}

/* The whole drawer, so tab switching / closing really runs the shared shell
 * (initTypingGame owns those listeners and its fail-closed guard needs all
 * eighteen tabs and panels). Only the typing and ladder panels need their bodies:
 * the other games return early without theirs. */
function seedDrawerDom(env) {
  const doc = env.document;

  const openBtn = doc.createElement("button");
  openBtn.id = "gameToggleBtn";
  doc.body.appendChild(openBtn);

  const modal = doc.createElement("div");
  modal.className = "game-modal";
  modal.id = "gameModal";
  modal.hidden = true;
  doc.body.appendChild(modal);

  const backdrop = doc.createElement("div");
  backdrop.className = "game-modal-backdrop";
  backdrop.id = "gameBackdrop";
  modal.appendChild(backdrop);

  const dialog = doc.createElement("div");
  dialog.className = "game-dialog";
  modal.appendChild(dialog);

  const closeBtn = doc.createElement("button");
  closeBtn.className = "game-close";
  closeBtn.id = "gameCloseBtn";
  dialog.appendChild(closeBtn);

  const tabs = doc.createElement("div");
  tabs.className = "game-tabs";
  tabs.id = "gameTabs";
  tabs.setAttribute("role", "tablist");
  dialog.appendChild(tabs);
  [
    ["gameTabTyping", "gamePanelTyping", true],
    ["gameTabMemory", "gamePanelMemory", false],
    ["gameTab2048", "gamePanel2048", false],
    ["gameTabReflex", "gamePanelReflex", false],
    ["gameTabCaretDash", "gamePanelCaretDash", false],
    ["gameTabElements", "gamePanelElements", false],
    ["gameTabSpotDiff", "gamePanelSpotDiff", false],
    ["gameTabPlumber", "gamePanelPlumber", false],
    ["gameTabStack", "gamePanelStack", false],
    ["gameTabColorCode", "gamePanelColorCode", false],
    ["gameTabBreakout", "gamePanelBreakout", false],
    ["gameTabEmberDice", "gamePanelEmberDice", false],
    ["gameTabSnake", "gamePanelSnake", false],
    ["gameTabLights", "gamePanelLights", false],
    ["gameTabMines", "gamePanelMines", false],
    ["gameTabGomoku", "gamePanelGomoku", false],
    ["gameTabTraffic", "gamePanelTraffic", false],
    ["gameTabVault", "gamePanelVault", false],
  ].forEach(([tabId, panelId, first]) => {
    const tab = doc.createElement("button");
    tab.className = "game-tab";
    tab.id = tabId;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", first ? "true" : "false");
    tab.setAttribute("aria-controls", panelId);
    tab.tabIndex = first ? 0 : -1;
    tabs.appendChild(tab);
  });

  const pickerToggle = doc.createElement("button");
  pickerToggle.className = "game-tabs-more";
  pickerToggle.id = "gameTabsToggle";
  pickerToggle.setAttribute("aria-expanded", "false");
  pickerToggle.setAttribute("aria-controls", "gameTabs");
  const pickerLabel = doc.createElement("span");
  pickerLabel.id = "gameTabsLabel";
  pickerLabel.setAttribute("data-i18n", "tabsShowMore");
  const pickerCount = doc.createElement("span");
  pickerCount.id = "gameTabsCount";
  pickerToggle.appendChild(pickerLabel);
  pickerToggle.appendChild(pickerCount);
  dialog.appendChild(pickerToggle);

  ["gamePanelTyping", "gamePanelMemory", "gamePanel2048", "gamePanelReflex",
    "gamePanelCaretDash", "gamePanelSpotDiff", "gamePanelPlumber",
    "gamePanelStack", "gamePanelColorCode", "gamePanelBreakout",
    "gamePanelEmberDice", "gamePanelSnake", "gamePanelLights",
    "gamePanelMines", "gamePanelGomoku", "gamePanelTraffic",
    "gamePanelVault"].forEach((panelId, index) => {
    const panel = doc.createElement("div");
    panel.className = "game-panel";
    panel.id = panelId;
    panel.hidden = index !== 0;
    dialog.appendChild(panel);
  });
  dialog.appendChild(buildElementsPanel(env));

  /* Typing panel body; the sandbox body comes from buildElementsPanel above.
   * The other three games return early without their own markup, which keeps
   * this fixture focused on the shared drawer shell. */
  [
    ["typingTarget", "p"],
    ["typingTargetText", "span"],
    ["typingInput", "input"],
    ["gameStartBtn", "button"],
    ["gameTime", "strong"],
    ["gameWpm", "strong"],
    ["gameAcc", "strong"],
    ["gameTrackFill", "span"],
    ["gameResult", "p"],
    ["gameBest", "p"],
  ].forEach(([id, tag]) => {
    const element = doc.createElement(tag);
    element.id = id;
    env.byId("gamePanelTyping").appendChild(element);
  });
}

function bootDrawer(options) {
  const env = createEnvironment(options || {});
  seedToolDom(env);
  seedDrawerDom(env);
  env.load(appSource);
  env.domReady();
  return env;
}

/* 44. the simulation rules --------------------------------------------- */
run("elements-sim", () => {
  const sim = newSim();
  check(
    "elements-sim",
    "the board is 80 by 56 with the six documented elements",
    sim.cols === 80 &&
      sim.rows === 56 &&
      sim.cells.length === 80 * 56 &&
      sim.empty === 0 &&
      sim.stone === 1 &&
      sim.sand === 2 &&
      sim.water === 3 &&
      sim.plant === 4 &&
      sim.fire === 5,
    `${sim.cols}x${sim.rows}`,
  );
  check(
    "elements-sim",
    "stone never moves",
    (() => {
      const wall = newSim();
      wall.clear();
      wall.set(10, 10, wall.stone);
      steps(wall, 50);
      return wall.get(10, 10) === wall.stone && wall.count(wall.stone) === 1;
    })(),
  );

  /* Sand: falls, sinks through water, piles into a slope. */
  const sand = newSim();
  sand.clear();
  sand.set(10, 0, sand.sand);
  sand.step();
  check(
    "elements-sim",
    "sand falls a cell per generation",
    sand.get(10, 1) === sand.sand && sand.get(10, 0) === sand.empty,
  );
  const sink = newSim();
  sink.clear();
  for (let y = 31; y <= 32; y += 1) {
    sink.set(9, y, sink.stone);
    sink.set(11, y, sink.stone);
  }
  sink.set(10, 32, sink.stone);
  sink.set(10, 31, sink.water);
  sink.set(10, 30, sink.sand);
  sink.step();
  check(
    "elements-sim",
    "sand sinks through water by swapping with it",
    sink.get(10, 31) === sink.sand && sink.get(10, 30) === sink.water,
  );
  check(
    "elements-sim",
    "sinking swaps instead of deleting either element",
    sink.count(sink.sand) === 1 && sink.count(sink.water) === 1,
  );

  const pour = newSim();
  pour.clear();
  for (let i = 0; i < 40; i += 1) {
    pour.set(40, i, pour.sand);
  }
  steps(pour, 900);
  const pile = columnHeights(pour, pour.sand);
  const pileWidth = pile.filter((height) => height > 0).length;
  const pileHeight = Math.max(...pile);
  check(
    "elements-sim",
    "poured sand spreads out instead of standing as a column",
    pileWidth >= 4,
    String(pileWidth),
  );
  check(
    "elements-sim",
    "sand piles into a slope, not a tower",
    pileHeight <= pileWidth + 2,
    `${pileHeight} high on ${pileWidth} wide`,
  );
  check(
    "elements-sim",
    "the pile reaches the floor",
    cellsWith(pour, pour.sand).some((cell) => cell.y === pour.rows - 1),
  );
  check(
    "elements-sim",
    "no grain is left floating",
    cellsWith(pour, pour.sand).every((cell) =>
      resting(pour, cell.x, cell.y, pour.sand),
    ),
  );
  check(
    "elements-sim",
    "sand is never created or destroyed",
    pour.count(pour.sand) === 40,
    String(pour.count(pour.sand)),
  );

  /* Water: falls, then spreads sideways until it levels out. */
  const drop = newSim();
  drop.clear();
  drop.set(10, 0, drop.water);
  drop.step();
  check(
    "elements-sim",
    "water falls a cell per generation",
    drop.get(10, 1) === drop.water,
  );
  steps(drop, 200);
  check(
    "elements-sim",
    "water comes to rest on the floor",
    drop.get(10, drop.rows - 1) === drop.water && drop.count(drop.water) === 1,
  );

  const pool = newSim();
  pool.clear();
  for (let y = 48; y < 56; y += 1) {
    pool.set(20, y, pool.water);
    pool.set(21, y, pool.water);
  }
  steps(pool, 400);
  const level = columnHeights(pool, pool.water);
  const wetColumns = level.filter((height) => height > 0).length;
  check(
    "elements-sim",
    "a standing column of water flattens out",
    wetColumns >= 5,
    `${wetColumns} columns`,
  );
  check(
    "elements-sim",
    "level water is only a couple of rows deep",
    Math.max(...level) <= 4,
    String(Math.max(...level)),
  );
  check(
    "elements-sim",
    "flowing water is conserved",
    pool.count(pool.water) === 16,
    String(pool.count(pool.water)),
  );

  /* Plants: static, but they drink the water above them. */
  const shaft = newSim();
  shaft.clear();
  for (let y = 40; y < 56; y += 1) {
    shaft.set(9, y, shaft.stone);
    shaft.set(11, y, shaft.stone);
  }
  shaft.set(10, 55, shaft.plant);
  shaft.set(10, 54, shaft.water);
  shaft.set(10, 53, shaft.water);
  steps(shaft, shaft.growEvery - 1);
  check(
    "elements-sim",
    "a plant waits for its growth cadence",
    shaft.get(10, 54) === shaft.water,
  );
  shaft.step();
  check(
    "elements-sim",
    "a plant grows one cell up into the water above it",
    shaft.get(10, 54) === shaft.plant,
  );
  check(
    "elements-sim",
    "the water it grew into is consumed",
    shaft.count(shaft.water) === 1,
    String(shaft.count(shaft.water)),
  );
  steps(shaft, shaft.growEvery * 2);
  check(
    "elements-sim",
    "the plant keeps climbing while it has water",
    shaft.get(10, 53) === shaft.plant && shaft.count(shaft.water) === 0,
  );
  steps(shaft, shaft.growEvery * 3);
  check(
    "elements-sim",
    "with no water above it the plant stops growing",
    shaft.get(10, 52) === shaft.empty && shaft.count(shaft.plant) === 3,
    String(shaft.count(shaft.plant)),
  );

  /* Fire: spreads through plants, expires without fuel. */
  const alone = newSim();
  alone.clear();
  alone.set(10, 30, alone.fire);
  steps(alone, alone.fireLife - 1);
  check(
    "elements-sim",
    "a flame with no fuel keeps burning for its whole life",
    alone.count(alone.fire) === 1,
  );
  alone.step();
  check(
    "elements-sim",
    "and then expires on its own",
    alone.count(alone.fire) === 0 && alone.get(10, 30) === alone.empty,
  );

  const hedge = newSim();
  hedge.clear();
  for (let x = 10; x <= 14; x += 1) {
    hedge.set(x, 30, hedge.plant);
  }
  hedge.set(10, 30, hedge.fire);
  hedge.step();
  check(
    "elements-sim",
    "fire ignites the plant beside it",
    hedge.get(11, 30) === hedge.fire && hedge.count(hedge.fire) === 2,
  );
  steps(hedge, 4);
  check(
    "elements-sim",
    "the fire front walks the plant line at a cell per generation",
    hedge.get(14, 30) === hedge.fire,
  );
  steps(hedge, hedge.fireLife + 40);
  check(
    "elements-sim",
    "a burnt-out line leaves neither fire nor plant behind",
    hedge.count(hedge.fire) === 0 && hedge.count(hedge.plant) === 0,
    `${hedge.count(hedge.fire)} / ${hedge.count(hedge.plant)}`,
  );

  /* Water: puts fire out and is consumed doing it. */
  const above = newSim();
  above.clear();
  above.set(10, 30, above.fire);
  above.set(10, 29, above.water);
  above.step();
  check(
    "elements-sim",
    "water dropped on a fire puts it out",
    above.count(above.fire) === 0 && above.count(above.water) === 0,
    `${above.count(above.fire)} / ${above.count(above.water)}`,
  );
  const below = newSim();
  below.clear();
  for (let x = 4; x <= 16; x += 1) {
    below.set(x, 55, below.stone);
  }
  below.set(10, 54, below.water);
  below.set(10, 53, below.fire);
  below.step();
  check(
    "elements-sim",
    "water under a fire douses it too, and is consumed",
    below.count(below.fire) === 0 && below.count(below.water) === 0,
  );

  /* Bounds safety and determinism. */
  const bounds = newSim();
  bounds.loadPreset("free");
  check(
    "elements-sim",
    "a fresh board reports no out-of-range writes",
    bounds.outOfRangeWrites() === 0,
  );
  for (let x = 0; x < 80; x += 1) {
    bounds.set(x, 0, bounds.sand);
    bounds.set(x, 55, bounds.water);
  }
  for (let y = 0; y < 56; y += 1) {
    bounds.set(0, y, bounds.water);
    bounds.set(79, y, bounds.sand);
  }
  const sandBefore = bounds.count(bounds.sand);
  steps(bounds, 300);
  check(
    "elements-sim",
    "no rule ever writes outside the grid",
    bounds.outOfRangeWrites() === 0,
    String(bounds.outOfRangeWrites()),
  );
  check(
    "elements-sim",
    "the grid keeps its size while it runs",
    bounds.cells.length === 80 * 56 && bounds.life.length === 80 * 56,
  );
  check(
    "elements-sim",
    "out-of-bounds reads report stone, never undefined",
    bounds.get(-1, -1) === bounds.stone &&
      bounds.get(80, 20) === bounds.stone &&
      bounds.get(20, 56) === bounds.stone,
  );
  check(
    "elements-sim",
    "sand is still neither created nor destroyed after 300 generations",
    bounds.count(bounds.sand) === sandBefore,
    `${sandBefore} -> ${bounds.count(bounds.sand)}`,
  );
  const counted = bounds.outOfRangeWrites();
  const refused = [
    bounds.set(-1, 0, bounds.sand),
    bounds.set(80, 0, bounds.sand),
    bounds.set(0, -1, bounds.sand),
    bounds.set(0, 56, bounds.sand),
  ];
  check(
    "elements-sim",
    "direct writes outside the grid are refused and counted",
    refused.every((value) => value === false) &&
      bounds.outOfRangeWrites() === counted + 4,
    String(bounds.outOfRangeWrites()),
  );

  const twinA = newSim();
  const twinB = newSim();
  twinA.loadPreset("free");
  twinB.loadPreset("free");
  check(
    "elements-sim",
    "two sims with the same seed start identical",
    twinA.hash() === twinB.hash() && twinA.hash() > 0,
  );
  const startHash = twinA.hash();
  steps(twinA, 200);
  steps(twinB, 200);
  check(
    "elements-sim",
    "and are still identical after 200 generations",
    twinA.hash() === twinB.hash() && twinA.hash() !== startHash,
  );
  const other = newSim({ seed: 987654 });
  other.loadPreset("free");
  steps(other, 200);
  check(
    "elements-sim",
    "a different seed settles differently",
    other.hash() !== twinA.hash(),
  );
  twinB.loadPreset("free");
  steps(twinB, 200);
  check(
    "elements-sim",
    "reloading the board reseeds the run",
    twinB.hash() === twinA.hash(),
  );
});

/* 44b. the expanded roster and every essential reaction ------------------ */

/* A two-cell pocket sealed on all sides but its own column, so a rule under
 * test is decided by the rule and not by its own material flowing away. The
 * free cells are the middle column's bottom two rows. */
function pocket() {
  const sim = newSim();
  sim.clear();
  for (let x = 0; x < sim.cols; x += 1) sim.set(x, sim.rows - 1, sim.stone);
  for (let y = sim.rows - 3; y <= sim.rows - 2; y += 1) {
    sim.set(9, y, sim.stone);
    sim.set(11, y, sim.stone);
  }
  sim.set(9, sim.rows - 4, sim.stone);
  sim.set(10, sim.rows - 4, sim.stone);
  sim.set(11, sim.rows - 4, sim.stone);
  return sim;
}

/* A five-wide, seven-tall basin on the floor, for the rules that need a column
 * of one liquid beside another. */
function basin() {
  const sim = newSim();
  sim.clear();
  for (let x = 0; x < sim.cols; x += 1) sim.set(x, sim.rows - 1, sim.stone);
  for (let y = sim.rows - 8; y <= sim.rows - 2; y += 1) {
    sim.set(7, y, sim.stone);
    sim.set(13, y, sim.stone);
  }
  return sim;
}

run("elements-expansion", () => {
  const sim = newSim();
  check(
    "elements-expansion",
    "the roster is the six originals plus eleven new ids",
    Object.keys(sim.ids).length === 17 &&
      sim.empty === 0 &&
      sim.stone === 1 &&
      sim.sand === 2 &&
      sim.water === 3 &&
      sim.plant === 4 &&
      sim.fire === 5 &&
      sim.wood === 6 &&
      sim.ash === 7 &&
      sim.oil === 8 &&
      sim.lava === 9 &&
      sim.ice === 10 &&
      sim.steam === 11 &&
      sim.acid === 12 &&
      sim.seed === 13 &&
      sim.smoke === 14 &&
      sim.glass === 15 &&
      sim.void === 16,
    JSON.stringify(sim.ids),
  );
  check(
    "elements-expansion",
    "the expanded board is still 80 by 56 with one counter per cell",
    sim.cells.length === 80 * 56 && sim.life.length === 80 * 56,
  );
  check(
    "elements-expansion",
    "the fuel and corrosion sets are the documented ones",
    sim.isFuel(sim.plant) &&
      sim.isFuel(sim.wood) &&
      sim.isFuel(sim.oil) &&
      sim.isFuel(sim.seed) &&
      !sim.isFuel(sim.water) &&
      !sim.isFuel(sim.ash) &&
      !sim.isFuel(sim.glass) &&
      sim.isSoluble(sim.stone) &&
      sim.isSoluble(sim.wood) &&
      sim.isSoluble(sim.glass) &&
      sim.isSoluble(sim.plant) &&
      sim.isSoluble(sim.sand) &&
      sim.isSoluble(sim.ash) &&
      !sim.isSoluble(sim.ice) &&
      !sim.isSoluble(sim.empty),
  );
  check(
    "elements-expansion",
    "steam, smoke and acid are handed their counters on creation",
    (() => {
      const board = newSim();
      board.clear();
      board.set(10, 10, board.steam);
      board.set(20, 10, board.smoke);
      board.set(30, 10, board.acid);
      const counters = [
        board.life[board.index(10, 10)],
        board.life[board.index(20, 10)],
        board.life[board.index(30, 10)],
      ];
      return (
        counters[0] === board.steamLife &&
        counters[1] === board.smokeLife &&
        counters[2] === board.acidUses &&
        board.steamLife === 120 &&
        board.smokeLife === 90 &&
        board.acidUses === 3
      );
    })(),
  );

  /* 2: sand meets lava. */
  check(
    "elements-expansion",
    "sand + lava -> glass, and the lava stays lava",
    (() => {
      const board = pocket();
      board.set(10, 54, board.lava);
      board.set(10, 53, board.sand);
      board.step();
      return (
        board.get(10, 54) === board.lava &&
        board.get(10, 53) === board.glass &&
        board.count(board.sand) === 0 &&
        board.count(board.glass) === 1
      );
    })(),
  );
  /* 3: lava meets water. */
  check(
    "elements-expansion",
    "lava + water -> stone + steam, two cells for two",
    (() => {
      const board = pocket();
      board.set(10, 54, board.lava);
      board.set(10, 53, board.water);
      board.step();
      return (
        board.get(10, 54) === board.stone &&
        board.get(10, 53) === board.steam &&
        board.count(board.lava) === 0 &&
        board.count(board.water) === 0
      );
    })(),
  );
  /* 4: lava meets ice. */
  check(
    "elements-expansion",
    "lava + ice -> stone + water",
    (() => {
      const board = pocket();
      board.set(10, 54, board.lava);
      board.set(10, 53, board.ice);
      board.step();
      return (
        board.get(10, 54) === board.stone &&
        board.get(10, 53) === board.water &&
        board.count(board.ice) === 0
      );
    })(),
  );
  /* 7: fire meets wood. Wood is structural fuel: it burns, it is not a plant. */
  check(
    "elements-expansion",
    "fire ignites wood, and wood neither grows nor drinks water",
    (() => {
      const board = pocket();
      board.set(10, 54, board.fire);
      board.set(10, 53, board.wood);
      board.step();
      const burnt = board.get(10, 53) === board.fire && board.count(board.fire) === 2;
      const garden = pocket();
      garden.set(10, 54, garden.wood);
      garden.set(10, 53, garden.water);
      steps(garden, 40);
      return (
        burnt &&
        garden.get(10, 54) === garden.wood &&
        garden.count(garden.water) === 1 &&
        garden.count(garden.wood) === 1
      );
    })(),
  );
  /* 8: fire meets oil. */
  check(
    "elements-expansion",
    "fire ignites oil",
    (() => {
      const board = pocket();
      board.set(10, 54, board.oil);
      board.set(10, 53, board.fire);
      board.step();
      return board.count(board.fire) === 2 && board.count(board.oil) === 0;
    })(),
  );
  /* 9: fire meets seed. */
  check(
    "elements-expansion",
    "fire ignites seed",
    (() => {
      const board = pocket();
      board.set(10, 54, board.seed);
      board.set(10, 53, board.fire);
      board.step();
      return board.count(board.fire) === 2 && board.count(board.seed) === 0;
    })(),
  );
  /* 12: oil floats. */
  check(
    "elements-expansion",
    "oil rises through the water above it, one cell per generation",
    (() => {
      const board = basin();
      for (let x = 8; x <= 12; x += 1) {
        for (let y = 49; y <= 54; y += 1) board.set(x, y, board.water);
      }
      board.set(10, 54, board.oil);
      board.step();
      const oneUp = board.get(10, 53) === board.oil && board.get(10, 54) === board.water;
      steps(board, 8);
      /* It climbs to the surface and stops there: nothing lighter can be
       * above it, and the water underneath holds it up. */
      const surfaced = board.get(10, 49) === board.oil;
      return (
        oneUp &&
        surfaced &&
        board.count(board.oil) === 1 &&
        board.count(board.water) === 29
      );
    })(),
  );
  /* 13: a seed sprouts. */
  check(
    "elements-expansion",
    "a seed next to water sprouts into a plant and drinks the water",
    (() => {
      const board = pocket();
      board.set(10, 54, board.water);
      board.set(10, 53, board.seed);
      board.step();
      return (
        board.get(10, 53) === board.plant &&
        board.count(board.seed) === 0 &&
        board.count(board.water) === 0
      );
    })(),
  );
  /* 14: acid corrodes, and is bounded by its uses. */
  check(
    "elements-expansion",
    "acid dissolves three solids and is spent",
    (() => {
      const board = basin();
      for (let x = 8; x <= 12; x += 1) board.set(x, 54, board.stone);
      board.set(10, 54, board.acid);
      const before = board.count(board.stone);
      steps(board, 6);
      return (
        board.count(board.stone) === before - 3 &&
        board.count(board.acid) === 0
      );
    })(),
  );
  check(
    "elements-expansion",
    "acid eats only what it is allowed to, and only when it is there",
    (() => {
      /* Walled in by ice, which is not in the soluble set, so the acid has
       * nothing to do and keeps every use it has. */
      const board = newSim();
      board.clear();
      for (let y = 52; y <= 55; y += 1) {
        board.set(9, y, board.ice);
        board.set(11, y, board.ice);
      }
      for (let x = 9; x <= 11; x += 1) {
        board.set(x, 55, board.ice);
        board.set(x, 52, board.ice);
      }
      board.set(10, 53, board.ice);
      board.set(10, 54, board.acid);
      const ice = board.count(board.ice);
      steps(board, 20);
      return (
        board.count(board.acid) === 1 &&
        board.life[board.index(10, 54)] === board.acidUses &&
        board.count(board.ice) === ice
      );
    })(),
  );
  /* 16/18: the gases and their countdowns. */
  check(
    "elements-expansion",
    "steam rises, then condenses into water when its life runs out",
    (() => {
      const board = newSim();
      board.clear();
      board.set(10, 40, board.steam);
      board.step();
      const rose = board.get(10, 39) === board.steam;
      steps(board, board.steamLife - 2);
      const alive = board.count(board.steam) === 1;
      board.step();
      return (
        rose &&
        alive &&
        board.count(board.steam) === 0 &&
        board.count(board.water) === 1 &&
        board.get(10, 0) === board.water
      );
    })(),
  );
  check(
    "elements-expansion",
    "smoke rises, then dissipates into nothing at all",
    (() => {
      const board = newSim();
      board.clear();
      board.set(10, 40, board.smoke);
      steps(board, board.smokeLife - 1);
      const alive = board.count(board.smoke) === 1;
      board.step();
      return (
        alive &&
        board.count(board.smoke) === 0 &&
        board.count(board.water) === 0 &&
        board.count(board.empty) === 80 * 56
      );
    })(),
  );
  check(
    "elements-expansion",
    "steam condenses on ice and takes the ice with it",
    (() => {
      const board = pocket();
      board.set(10, 54, board.ice);
      board.set(10, 53, board.steam);
      board.step();
      return (
        board.get(10, 53) === board.water &&
        board.get(10, 54) === board.water &&
        board.count(board.ice) === 0
      );
    })(),
  );
  /* Ice: melted by heat, chilled rather than instantly doused. */
  check(
    "elements-expansion",
    "a flame melts the ice it touches and is chilled, not doused",
    (() => {
      const board = pocket();
      board.set(10, 54, board.ice);
      board.set(10, 53, board.fire);
      board.step();
      const chilled = board.life[board.index(10, 53)];
      const melted =
        board.count(board.ice) === 0 &&
        board.count(board.water) === 1 &&
        board.count(board.fire) === 1;
      const surviving = chilled === board.fireLife - 2;
      board.step();
      /* With the meltwater trapped beside it, the douse rule takes over. */
      return (
        melted && surviving && board.count(board.fire) === 0 && board.count(board.water) === 0
      );
    })(),
  );
  /* 20: void drains. */
  check(
    "elements-expansion",
    "void erases every neighbour that is not a wall",
    (() => {
      const board = newSim();
      board.clear();
      board.set(40, 30, board.void);
      board.set(39, 30, board.sand);
      board.set(41, 30, board.water);
      board.set(40, 29, board.plant);
      board.set(40, 31, board.ice);
      board.set(39, 31, board.stone);
      board.step();
      return (
        board.get(39, 30) === board.empty &&
        board.get(41, 30) === board.empty &&
        board.get(40, 29) === board.empty &&
        board.get(40, 31) === board.empty &&
        board.get(39, 31) === board.stone &&
        board.count(board.void) === 1
      );
    })(),
  );
  /* The inert ones stay inert, which is what makes them useful as structure. */
  check(
    "elements-expansion",
    "ash and glass are inert: fire cannot light them and lava cannot melt them",
    (() => {
      const board = pocket();
      board.set(10, 54, board.ash);
      board.set(10, 53, board.fire);
      steps(board, board.fireLife + 6);
      const ashSurvived = board.count(board.ash) === 1 && board.count(board.fire) === 0;
      const kiln = pocket();
      kiln.set(10, 54, kiln.lava);
      kiln.set(10, 53, kiln.glass);
      steps(kiln, 5);
      return (
        ashSurvived &&
        kiln.count(kiln.glass) === 1 &&
        kiln.count(kiln.lava) === 1
      );
    })(),
  );
  check(
    "elements-expansion",
    "steam is not water: a flame beside it is not doused",
    (() => {
      const board = pocket();
      board.set(10, 54, board.steam);
      board.set(10, 53, board.fire);
      steps(board, 20);
      return board.count(board.fire) === 1 && board.count(board.steam) === 1;
    })(),
  );
  check(
    "elements-expansion",
    "every element can be piled on the board without a single stray write",
    (() => {
      const board = newSim();
      board.clear();
      Object.keys(board.ids).forEach((name) => {
        for (let y = 0; y < board.rows; y += 1) board.set(39, y, board.ids[name]);
      });
      steps(board, 300);
      return (
        board.outOfRangeWrites() === 0 &&
        board.cells.length === 80 * 56 &&
        board.get(-1, -1) === board.stone &&
        board.get(80, 56) === board.stone &&
        board.count(board.empty) <= 80 * 56
      );
    })(),
  );
  check(
    "elements-expansion",
    "the whole expanded board is still a seeded, repeatable world",
    (() => {
      const a = newSim();
      const b = newSim();
      a.loadPreset("free");
      b.loadPreset("free");
      for (let x = 20; x < 30; x += 1) {
        a.set(x, 10, a.lava);
        b.set(x, 10, b.lava);
        a.set(x, 20, a.acid);
        b.set(x, 20, b.acid);
        a.set(x, 30, a.oil);
        b.set(x, 30, b.oil);
      }
      steps(a, 250);
      steps(b, 250);
      return a.hash() === b.hash() && a.hash() > 0;
    })(),
  );
  /* The mechanics that live in the factory itself. */
  check(
    "elements-expansion",
    "a spawner pours on its cadence and only into an empty cell",
    (() => {
      const board = newSim();
      board.loadPreset("free");
      const before = board.count(board.water);
      steps(board, 11);
      const notYet = board.count(board.water) === before;
      steps(board, 1);
      const poured = board.count(board.water) === before + 1;
      board.clear();
      board.addSpawner(20, 20, board.water, 1, 2);
      steps(board, 6);
      return notYet && poured && board.count(board.water) === 2;
    })(),
  );
  check(
    "elements-expansion",
    "the paint allowance is exact, refuses at zero and refills on reload",
    (() => {
      const board = newSim();
      board.clear();
      board.setInk(2);
      const first = board.paint(10, 10, board.sand);
      const second = board.paint(11, 10, board.sand);
      const third = board.paint(12, 10, board.sand);
      const spent = board.inkLeft() === 0 && board.count(board.sand) === 2;
      board.clear();
      const refilled = board.inkLeft() === 2 && board.paint(12, 10, board.sand) === true;
      const free = newSim();
      free.clear();
      return (
        first === true &&
        second === true &&
        third === false &&
        spent &&
        refilled &&
        free.ink() === 0 &&
        free.paint(10, 10, free.sand) === true
      );
    })(),
  );
  check(
    "elements-expansion",
    "undo rewinds the board, the generator and the random stream together",
    (() => {
      const board = newSim();
      board.loadPreset("free");
      const before = board.hash();
      const generation = board.generation();
      board.remember();
      board.paint(30, 30, board.sand);
      board.paint(31, 30, board.sand);
      const changed = board.hash() !== before;
      const back = board.undo() === true && board.hash() === before;
      const rewound = board.generation() === generation;
      const empty = board.undo() === false && board.undoDepth() === 0;
      board.remember();
      board.forget();
      const refused = board.undoDepth() === 0;
      board.remember();
      for (let i = 0; i < 10; i += 1) board.remember();
      return (
        changed && back && rewound && empty && refused && board.undoDepth() === 6
      );
    })(),
  );
});

/* 45. the four boards -------------------------------------------------- */
run("elements-boards", () => {
  ["free", "grow", "extinguish", "flood"].forEach((id) => {
    const one = newSim();
    const two = newSim();
    one.loadPreset(id);
    two.loadPreset(id);
    check(
      "elements-boards",
      `${id}: the starting board is deterministic`,
      one.hash() === two.hash() && one.count(one.stone) > 0,
    );
    check(
      "elements-boards",
      `${id}: laying out the board writes nothing out of range`,
      one.outOfRangeWrites() === 0,
      String(one.outOfRangeWrites()),
    );
    check(
      "elements-boards",
      `${id}: the board does not start already won`,
      one.progress(id).done === false,
    );
  });

  const free = newSim();
  free.loadPreset("free");
  check(
    "elements-boards",
    "free play opens with sand, water and a garden, but no fire",
    free.count(free.sand) > 20 &&
      free.count(free.water) > 50 &&
      free.count(free.plant) > 5 &&
      free.count(free.fire) === 0,
    `${free.count(free.sand)} sand, ${free.count(free.water)} water, ${free.count(free.plant)} plant`,
  );
  check(
    "elements-boards",
    "free play has no goal to reach",
    free.progress("free").done === false && free.progress("free").target === 0,
  );

  const grow = newSim();
  grow.loadPreset("grow");
  check(
    "elements-boards",
    "grow: a seed sits at the bottom of a one-cell well",
    grow.get(40, 54) === grow.plant &&
      grow.get(39, 20) === grow.stone &&
      grow.get(41, 20) === grow.stone &&
      grow.get(40, 20) === grow.empty,
  );
  check(
    "elements-boards",
    "grow: the pool only fills the bottom of the well",
    grow.count(grow.water) === 19 && grow.progress("grow").value < grow.rows * 0.5,
    `${grow.count(grow.water)} water`,
  );

  const hedge = newSim();
  hedge.loadPreset("extinguish");
  check(
    "elements-boards",
    "extinguish: one fire burns at the near end of the hedge",
    hedge.count(hedge.fire) === 1 && hedge.get(4, 4) === hedge.fire,
  );
  check(
    "elements-boards",
    "extinguish: the hedge is long enough to outlast the clock",
    hedge.count(hedge.plant) > 500,
    String(hedge.count(hedge.plant)),
  );
  check(
    "elements-boards",
    "extinguish: nothing else can catch fire",
    cellsWith(hedge, hedge.fire).every((cell) => {
      const neighbours = [
        hedge.get(cell.x - 1, cell.y),
        hedge.get(cell.x + 1, cell.y),
        hedge.get(cell.x, cell.y - 1),
        hedge.get(cell.x, cell.y + 1),
      ];
      return neighbours.filter((value) => value === hedge.plant).length === 1;
    }),
  );

  const flood = newSim();
  flood.loadPreset("flood");
  const zone = flood.zone();
  check(
    "elements-boards",
    "flood: the marked zone sits inside the basin walls",
    !!zone &&
      zone.x0 > 26 &&
      zone.x1 < 54 &&
      zone.y0 > 24 &&
      zone.y1 < 55 &&
      flood.progress("flood").target > 100,
    JSON.stringify(zone),
  );
  check(
    "elements-boards",
    "flood: the basin starts dry",
    flood.count(flood.water) === 0 && flood.progress("flood").value === 0,
  );
  check(
    "elements-boards",
    "flood: paint is refused at or below the rim, allowed above it",
    (() => {
      const pours = flood.pourZones();
      return (
        pours.length === 1 &&
        pours[0].y1 === 23 &&
        flood.paint(40, pours[0].y1, flood.water) === true &&
        flood.paint(40, pours[0].y1 + 1, flood.water) === false &&
        flood.paint(40, zone.y1, flood.water) === false &&
        flood.count(flood.water) === 1
      );
    })(),
    JSON.stringify(flood.pourZones()),
  );
  check(
    "elements-boards",
    "the brush never overwrites a solid cell",
    (() => {
      const board = newSim();
      board.loadPreset("free");
      const before = board.count(board.stone);
      board.paintBlob(40, 55, board.water, 2);
      board.paintBlob(40, 55, board.sand, 2);
      board.paintBlob(40, 55, board.fire, 2);
      return board.count(board.stone) === before && board.count(board.fire) === 0;
    })(),
  );
  check(
    "elements-boards",
    "the eraser does clear a solid cell",
    (() => {
      const board = newSim();
      board.loadPreset("free");
      const before = board.count(board.stone);
      const erased = board.paintBlob(1, 55, board.empty, 1);
      return erased === 3 && board.count(board.stone) === before - 3;
    })(),
  );
});

/* 46. the three win conditions fire exactly when they are met ----------- */
run("elements-goals", () => {
  /* Grow: any plant on the top row. */
  const grow = newSim();
  grow.loadPreset("grow");
  check(
    "elements-goals",
    "grow is not won while the plant is still climbing",
    grow.progress("grow").done === false && grow.progress("grow").value < grow.rows,
  );
  grow.set(40, 1, grow.plant);
  check(
    "elements-goals",
    "a plant on the second row is not the top row",
    grow.progress("grow").done === false,
  );
  grow.set(40, 0, grow.plant);
  const growWin = grow.progress("grow");
  check(
    "elements-goals",
    "grow is won the moment a plant reaches the top row",
    growWin.done === true && growWin.value === grow.rows && growWin.target === grow.rows,
    JSON.stringify(growWin),
  );

  /* Extinguish: no fire left. */
  const hedge = newSim();
  hedge.loadPreset("extinguish");
  const burning = hedge.progress("extinguish");
  check(
    "elements-goals",
    "extinguish is not won while a fire burns",
    burning.done === false && burning.value === 1 && burning.target === 1,
    JSON.stringify(burning),
  );
  const flame = cellsWith(hedge, hedge.fire)[0];
  hedge.set(flame.x, flame.y, hedge.empty);
  check(
    "elements-goals",
    "extinguish is won the moment the last fire is out",
    hedge.progress("extinguish").done === true &&
      hedge.progress("extinguish").value === 0,
  );

  /* Flood: enough water inside the marked zone. */
  const flood = newSim();
  flood.loadPreset("flood");
  const zone = flood.zone();
  const target = flood.progress("flood").target;
  check(
    "elements-goals",
    "flood is not won with an empty basin",
    flood.progress("flood").done === false && target > 0,
  );
  let placed = 0;
  for (let y = zone.y1; y >= zone.y0 && placed < target - 1; y -= 1) {
    for (let x = zone.x0; x <= zone.x1 && placed < target - 1; x += 1) {
      flood.set(x, y, flood.water);
      placed += 1;
    }
  }
  check(
    "elements-goals",
    "one drop short of the target is not a win",
    flood.progress("flood").value === target - 1 &&
      flood.progress("flood").done === false,
    `${flood.progress("flood").value}/${target}`,
  );
  flood.set(zone.x0, zone.y0, flood.water);
  check(
    "elements-goals",
    "the target drop wins it",
    flood.progress("flood").value === target &&
      flood.progress("flood").done === true,
    `${flood.progress("flood").value}/${target}`,
  );
  check(
    "elements-goals",
    "water outside the zone does not count",
    (() => {
      const board = newSim();
      board.loadPreset("flood");
      for (let x = 0; x < 20; x += 1) {
        board.set(x, 55 - 1, board.water);
      }
      return board.progress("flood").value === 0;
    })(),
  );
});

/* 46b. the campaign: the eight new boards, their goals, the unlock chain,
 * the star table and the v2 store ---------------------------------------- */

/* The starting board of every campaign board, as the factory lays it out. */
const CAMPAIGN_STARTS = {
  glass: (b) => b.count(b.lava) === 72 && b.count(b.sand) === 10 && b.count(b.glass) === 0,
  quench: (b) => b.count(b.lava) === 48 && b.count(b.water) === 0 && b.count(b.stone) === 124,
  thaw: (b) => b.count(b.water) === 736 && b.count(b.ice) === 105,
  spill: (b) => b.count(b.oil) === 208 && b.count(b.water) === 312,
  etch: (b) => b.count(b.water) === 0 && b.count(b.stone) === 167 && b.count(b.acid) === 0,
  sprout: (b) => b.count(b.wood) === 16 && b.count(b.water) === 24 && b.count(b.seed) === 1,
  geyser: (b) => b.count(b.lava) === 68 && b.count(b.ice) === 204,
  grove: (b) => b.count(b.wood) === 102 && b.count(b.fire) === 2,
};

run("elements-campaign", () => {
  /* --- every campaign board lays out what it declares ----------------- */
  Object.keys(CAMPAIGN_STARTS).forEach((id) => {
    const one = newSim();
    const two = newSim();
    one.loadPreset(id);
    two.loadPreset(id);
    check(
      "elements-campaign",
      `${id}: the opening board is deterministic and writes nothing out of range`,
      one.hash() === two.hash() && one.outOfRangeWrites() === 0 && one.count(one.stone) > 0,
      String(one.outOfRangeWrites()),
    );
    check(
      "elements-campaign",
      `${id}: the opening layout is the one the board declares`,
      CAMPAIGN_STARTS[id](one),
      JSON.stringify({
        lava: one.count(one.lava),
        water: one.count(one.water),
        ice: one.count(one.ice),
        oil: one.count(one.oil),
        wood: one.count(one.wood),
        sand: one.count(one.sand),
      }),
    );
    check(
      "elements-campaign",
      `${id}: the board does not start already won`,
      one.progress(id).done === false,
    );
  });

  /* --- the three original boards keep their opening numbers ----------- */
  const growBoard = newSim();
  growBoard.loadPreset("grow");
  const floodBoard = newSim();
  floodBoard.loadPreset("flood");
  const hedgeBoard = newSim();
  hedgeBoard.loadPreset("extinguish");
  check(
    "elements-campaign",
    "grow, flood and extinguish keep the numbers their tests pin down",
    growBoard.progress("grow").value === 2 &&
      growBoard.progress("grow").target === 56 &&
      growBoard.count(growBoard.water) === 19 &&
      floodBoard.progress("flood").target === 158 &&
      floodBoard.progress("flood").value === 0 &&
      hedgeBoard.progress("extinguish").value === 1 &&
      hedgeBoard.progress("extinguish").target === 1,
    JSON.stringify([
      growBoard.progress("grow"),
      floodBoard.progress("flood"),
      hedgeBoard.progress("extinguish"),
    ]),
  );

  /* --- free play's showcase ------------------------------------------- */
  const showcase = newSim();
  showcase.loadPreset("free");
  check(
    "elements-campaign",
    "free play adds the showcase without disturbing the hopper or garden",
    showcase.count(showcase.lava) > 0 &&
      showcase.count(showcase.ice) > 0 &&
      showcase.count(showcase.oil) > 0 &&
      showcase.count(showcase.sand) > 20 &&
      showcase.count(showcase.water) > 50 &&
      showcase.count(showcase.plant) > 5 &&
      showcase.count(showcase.fire) === 0 &&
      showcase.progress("free").target === 0,
    JSON.stringify({
      lava: showcase.count(showcase.lava),
      ice: showcase.count(showcase.ice),
      oil: showcase.count(showcase.oil),
    }),
  );

  /* --- each new goal fires exactly at its threshold -------------------- */
  const glassGate = (() => {
    const b = newSim();
    b.loadPreset("glass");
    b.set(1, 1, b.glass);
    const under = b.progress("glass");
    for (let i = 0; i < 20; i += 1) b.set(i, 1, b.glass);
    const at = b.progress("glass");
    return { under, at };
  })();
  check(
    "elements-campaign",
    "glass: 16 cells wins it, 15 does not",
    glassGate.under.value === 1 &&
      glassGate.under.done === false &&
      glassGate.under.target === 16 &&
      glassGate.at.value === 20 &&
      glassGate.at.done === true,
    JSON.stringify(glassGate),
  );

  const quenchGate = (() => {
    const b = newSim();
    b.loadPreset("quench");
    const start = b.progress("quench");
    const last = cellsWith(b, b.lava)[0];
    b.set(last.x, last.y, b.stone);
    const one = b.progress("quench");
    const dry = newSim();
    dry.loadPreset("quench");
    cellsWith(dry, dry.lava).forEach((c) => dry.set(c.x, c.y, dry.stone));
    return { start, one, empty: dry.progress("quench") };
  })();
  check(
    "elements-campaign",
    "quench: the tray counts down and only an empty tray wins it",
    quenchGate.start.value === 48 &&
      quenchGate.start.target === 48 &&
      quenchGate.start.done === false &&
      quenchGate.one.value === 47 &&
      quenchGate.one.done === false &&
      quenchGate.empty.value === 0 &&
      quenchGate.empty.done === true,
    JSON.stringify(quenchGate),
  );

  const spillGate = (() => {
    const b = newSim();
    b.loadPreset("spill");
    const start = b.progress("spill");
    const drop = cellsWith(b, b.oil)[0];
    b.set(drop.x, drop.y, b.empty);
    const one = b.progress("spill");
    cellsWith(b, b.oil).forEach((c) => b.set(c.x, c.y, b.empty));
    return { start, one, none: b.progress("spill") };
  })();
  check(
    "elements-campaign",
    "spill: one drop of oil left is not a win, none is",
    spillGate.start.value === 208 &&
      spillGate.start.target === 208 &&
      spillGate.one.done === false &&
      spillGate.none.value === 0 &&
      spillGate.none.done === true,
    JSON.stringify(spillGate),
  );

  /* The three zone boards: one cell short is not a win, the target cell is -
   * and water outside the marked rectangle never counts. */
  ["thaw", "etch", "geyser"].forEach((id) => {
    const b = newSim();
    b.loadPreset(id);
    const z = b.zone();
    const target = b.progress(id).target;
    let placed = 0;
    for (let y = z.y1; y >= z.y0 && placed < target - 1; y -= 1) {
      for (let x = z.x0; x <= z.x1 && placed < target - 1; x += 1) {
        b.set(x, y, b.water);
        placed += 1;
      }
    }
    const short = b.progress(id);
    const outsider = newSim();
    outsider.loadPreset(id);
    for (let x = 0; x < 8; x += 1) outsider.set(x, 1, outsider.water);
    const outside = outsider.progress(id).value;
    b.set(z.x0, z.y0, b.water);
    const wonNow = b.progress(id);
    check(
      "elements-campaign",
      `${id}: the marked zone wins at its target and not a drop earlier`,
      target > 0 &&
        short.value === target - 1 &&
        short.done === false &&
        wonNow.value >= target &&
        wonNow.done === true &&
        outside === 0,
      JSON.stringify({ target, short, wonNow, outside }),
    );
  });

  /* Save the Grove is a two-part goal: no fire AND enough timber left. */
  const groveGate = (() => {
    const b = newSim();
    b.loadPreset("grove");
    const start = b.progress("grove");
    cellsWith(b, b.fire).forEach((c) => b.set(c.x, c.y, b.empty));
    const outButFull = b.progress("grove");
    const groveCells = [];
    for (let y = 52; y <= 53; y += 1) {
      for (let x = 53; x <= 60; x += 1) {
        if (b.get(x, y) === b.wood) groveCells.push({ x, y });
      }
    }
    groveCells.slice(0, 3).forEach((c) => b.set(c.x, c.y, b.empty));
    const thirteen = b.progress("grove");
    b.set(groveCells[2].x, groveCells[2].y, b.wood);
    const fourteen = b.progress("grove");
    b.set(9, 52, b.fire);
    const burning = b.progress("grove");
    return { start, outButFull, thirteen, fourteen, burning };
  })();
  check(
    "elements-campaign",
    "grove: the timber is protected by fire and by count",
    groveGate.start.value === 16 &&
      groveGate.start.zero === 2 &&
      groveGate.start.done === false &&
      groveGate.outButFull.value === 16 &&
      groveGate.outButFull.done === true &&
      groveGate.thirteen.value === 13 &&
      groveGate.thirteen.done === false &&
      groveGate.fourteen.value === 14 &&
      groveGate.fourteen.done === true &&
      groveGate.burning.done === false,
    JSON.stringify(groveGate),
  );

  /* --- the unlock chain ----------------------------------------------- */
  const fresh = bootElements({});
  const gate = (env, id) => challengeOptionEl(env, id).disabled;
  check(
    "elements-campaign",
    "a fresh record opens free play and Grow, and nothing else",
    gate(fresh, "free") === false &&
      gate(fresh, "grow") === false &&
      ELEMENTS_ORDER.slice(2).every((id) => gate(fresh, id) === true),
    ELEMENTS_ORDER.filter((id) => gate(fresh, id) === false).join(","),
  );
  check(
    "elements-campaign",
    "clearing a board opens the next one and only the next one",
    (() => {
      const env = boardRecordUpTo("grow");
      return (
        gate(env, "grow") === false &&
        gate(env, "flood") === false &&
        gate(env, "extinguish") === true &&
        gate(env, "glass") === true
      );
    })(),
  );
  check(
    "elements-campaign",
    "the whole chain follows the campaign order",
    ELEMENTS_ORDER.every((id, index) => {
      const env = boardRecordUpTo(id);
      const next = ELEMENTS_ORDER[index + 1];
      const open = ELEMENTS_ORDER.filter((other) => !gate(env, other));
      return (
        gate(env, id) === false &&
        (!next || gate(env, next) === false) &&
        ELEMENTS_ORDER.slice(index + 2).every((later) => gate(env, later) === true) &&
        open.length === Math.min(index + 2, ELEMENTS_ORDER.length)
      );
    }),
    ELEMENTS_ORDER.map((id) => {
      const env = boardRecordUpTo(id);
      return id + ":" + ELEMENTS_ORDER.filter((other) => !gate(env, other)).join("+");
    }).join(" | "),
  );
  check(
    "elements-campaign",
    "free play is never locked and never recorded as cleared",
    (() => {
      const env = boardRecordUpTo("grove");
      return gate(env, "free") === false && elementsStore(env).cleared.free === undefined;
    })(),
  );

  /* --- element unlocks ------------------------------------------------- */
  const offered = (env) =>
    ELEMENT_TOOLS.filter((name) => {
      const button = env.byId(
        "elementsTool" + name.charAt(0).toUpperCase() + name.slice(1),
      );
      return button.disabled === false;
    });
  check(
    "elements-campaign",
    "the base six are the whole palette until the campaign hands more out",
    offered(fresh).join(",") === "empty,stone,sand,water,plant,fire",
    offered(fresh).join(","),
  );
  check(
    "elements-campaign",
    "a new element arrives with the board that introduces it",
    offered(fresh).indexOf("lava") === -1 &&
      /* floor is cleared, so glass is still locked and lava is not out yet */
      offered(boardRecordUpTo("flood")).indexOf("lava") === -1 &&
      offered(boardRecordUpTo("extinguish")).indexOf("lava") !== -1 &&
      offered(boardRecordUpTo("extinguish")).indexOf("steam") === -1 &&
      offered(boardRecordUpTo("glass")).indexOf("steam") !== -1 &&
      offered(boardRecordUpTo("quench")).indexOf("ice") !== -1 &&
      offered(boardRecordUpTo("thaw")).indexOf("oil") !== -1 &&
      offered(boardRecordUpTo("spill")).indexOf("acid") !== -1,
    offered(boardRecordUpTo("flood")).join(","),
  );
  check(
    "elements-campaign",
    "wood, seed and ash unlock with Sprout, void with the grove, glass last",
    offered(boardRecordUpTo("spill")).indexOf("wood") === -1 &&
      offered(boardRecordUpTo("etch")).indexOf("wood") !== -1 &&
      offered(boardRecordUpTo("sprout")).indexOf("wood") !== -1 &&
      offered(boardRecordUpTo("sprout")).indexOf("seed") !== -1 &&
      offered(boardRecordUpTo("sprout")).indexOf("ash") !== -1 &&
      offered(boardRecordUpTo("sprout")).indexOf("void") === -1 &&
      offered(boardRecordUpTo("geyser")).indexOf("void") !== -1 &&
      offered(boardRecordUpTo("geyser")).indexOf("glass") === -1 &&
      offered(boardRecordUpTo("grove")).indexOf("glass") !== -1,
    offered(boardRecordUpTo("sprout")).join(","),
  );
  check(
    "elements-campaign",
    "a challenge only offers its own tools, intersected with the unlocks",
    (() => {
      const env = boardRecordUpTo("grove");
      selectChallenge(env, "sprout");
      return (
        env.byId("elementsToolWater").disabled === false &&
        env.byId("elementsToolFire").disabled === false &&
        env.byId("elementsToolSand").disabled === true &&
        env.byId("elementsToolEmpty").disabled === true
      );
    })(),
  );

  /* --- stars are computed from the bests ------------------------------- */
  const starEnv = (bests) => bootElementsWith(clearedThrough("grove", bests));
  const starLine = (env, id) => {
    selectChallenge(env, id);
    return env.byId("elementsStars").textContent;
  };
  check(
    "elements-campaign",
    "the star line is empty until a board has a time",
    starLine(bootElements({}), "grow") === "\u2014",
    starLine(bootElements({}), "grow"),
  );
  check(
    "elements-campaign",
    "the thresholds award three, two and one star",
    starLine(starEnv({ flood: 20 }), "flood") === "\u2605\u2605\u2605" &&
      starLine(starEnv({ flood: 40 }), "flood") === "\u2605\u2605\u2606" &&
      starLine(starEnv({ flood: 60 }), "flood") === "\u2605\u2606\u2606",
    [
      starLine(starEnv({ flood: 20 }), "flood"),
      starLine(starEnv({ flood: 40 }), "flood"),
      starLine(starEnv({ flood: 60 }), "flood"),
    ].join(" / "),
  );
  check(
    "elements-campaign",
    "a time just inside the three-star par still counts as three",
    starLine(starEnv({ grow: 23.9 }), "grow") === "\u2605\u2605\u2605" &&
      starLine(starEnv({ grow: 24 }), "grow") === "\u2605\u2605\u2605" &&
      starLine(starEnv({ grow: 24.1 }), "grow") === "\u2605\u2605\u2606",
    starLine(starEnv({ grow: 24.1 }), "grow"),
  );
  check(
    "elements-campaign",
    "Grow's three-star par sits above the climb's own floor",
    (() => {
      /* The plant climbs one cell per growEvery generations and the seed starts
       * near the floor, so no run can be scored before the whole shaft has been
       * climbed. The par has to clear that, or the best a player can do is
       * two stars. */
      const sim = newSim();
      sim.loadPreset("grow");
      let seedRow = -1;
      for (let y = 0; y < sim.rows && seedRow < 0; y += 1) {
        if (sim.get(40, y) === sim.plant) seedRow = y;
      }
      const floorSeconds = (seedRow * sim.growEvery * 50) / 1000;
      return seedRow > 0 && ELEMENTS_PARS.grow[0] > floorSeconds;
    })(),
    `${ELEMENTS_PARS.grow[0]}s vs the climb`,
  );
  check(
    "elements-campaign",
    "the picker carries the stars a board has earned",
    /\u2605\u2605\u2606/.test(challengeOption(starEnv({ flood: 40 }), "flood")),
    challengeOption(starEnv({ flood: 40 }), "flood"),
  );
  check(
    "elements-campaign",
    "a hand-written star table cannot disagree with the best times",
    (() => {
      const env = bootElementsWith(
        JSON.stringify({
          v: 2,
          cleared: { flood: true },
          bests: { flood: 55 },
          stars: { flood: 3 },
        }),
      );
      selectChallenge(env, "flood");
      return (
        env.byId("elementsStars").textContent === "\u2605\u2606\u2606" &&
        elementsStore(env).stars.flood === 1
      );
    })(),
  );
  check(
    "elements-campaign",
    "a clear records its star alongside the best",
    (() => {
      const env = bootElements({});
      selectChallenge(env, "grow");
      env.byId("elementsStartBtn").click();
      const clearedIt = pourGrow(env);
      const written = elementsStore(env);
      return (
        clearedIt &&
        written.v === 2 &&
        written.cleared.grow === true &&
        written.bests.grow > 0 &&
        written.stars.grow >= 1 &&
        env.byId("elementsStars").textContent !== "\u2014"
      );
    })(),
  );

  /* --- the v1 record migrates in place --------------------------------- */
  check(
    "elements-campaign",
    "a v1 record is read, re-scored and rewritten as v2",
    (() => {
      let env = null;
      let threw = null;
      try {
        env = bootElementsWith(
          JSON.stringify({
            v: 1,
            cleared: { grow: true, flood: true, extinguish: true },
            bests: { flood: 25.5, extinguish: 4 },
          }),
        );
      } catch (error) {
        threw = error;
      }
      const written = env ? elementsStore(env) : null;
      return (
        !threw &&
        !!written &&
        written.v === 2 &&
        written.cleared.flood === true &&
        written.bests.flood === 25.5 &&
        written.stars.flood === 2 &&
        written.stars.grow === 1 &&
        written.stars.extinguish === 3
      );
    })(),
    "a v1 record did not migrate cleanly",
  );
  check(
    "elements-campaign",
    "an unversioned v1 record migrates too",
    (() => {
      const env = bootElementsWith(
        JSON.stringify({ cleared: { flood: true }, bests: { flood: 10 } }),
      );
      const written = elementsStore(env);
      return (
        written.v === 2 &&
        written.cleared.flood === true &&
        written.bests.flood === 10 &&
        written.stars.flood === 3
      );
    })(),
  );
  check(
    "elements-campaign",
    "a v2 record is left alone",
    (() => {
      const env = bootElementsWith(
        JSON.stringify({ v: 2, cleared: { grow: true }, bests: { grow: 9 }, stars: { grow: 3 } }),
      );
      return elementsStore(env).v === 2 && elementsStore(env).stars.grow === 3;
    })(),
  );
  check(
    "elements-campaign",
    "a record from a future version keeps its clears but not its bests",
    (() => {
      const env = bootElementsWith(
        '{"v":3,"cleared":{"flood":true},"bests":{"flood":2}}',
      );
      const written = elementsStore(env);
      return (
        written.v === 2 &&
        written.cleared.flood === true &&
        written.bests.flood === 2 &&
        written.stars.flood === 3
      );
    })(),
  );
  check(
    "elements-campaign",
    "an out-of-range v1 best is dropped but the clear and its star survive",
    (() => {
      const env = bootElementsWith(
        JSON.stringify({ v: 1, cleared: { flood: true }, bests: { flood: 999999 } }),
      );
      const written = elementsStore(env);
      return written.bests.flood === undefined && written.stars.flood === 1;
    })(),
  );
  check(
    "elements-campaign",
    "a truncated record falls back to a blank v2 record",
    (() => {
      const env = bootElementsWith('{"v":2,"cleared":{"flood":tr');
      const written = elementsStore(env);
      return (
        written.v === 2 &&
        JSON.stringify(written.cleared) === "{}" &&
        JSON.stringify(written.stars) === "{}"
      );
    })(),
  );

  /* --- nothing is recorded while a board is armed ---------------------- */
  const armed = bootElements({});
  selectChallenge(armed, "grove");
  armed.timers.advance(30000);
  check(
    "elements-campaign",
    "an armed campaign board runs no clock, wins nothing and stores nothing",
    armed.store.get(ELEMENTS_KEY) === undefined &&
      !won(armed) &&
      armed.byId("elementsTime").textContent === "60.0s",
    `${armed.store.get(ELEMENTS_KEY)} / ${armed.byId("elementsTime").textContent}`,
  );
});

/* 46c. the pour zones: where a board lets the brush work ----------------- */

module.exports = {
  ELEMENTS_KEY,
  newSim,
  ELEMENT_TOOLS,
  seedElementsDom,
  bootElements,
  elementsStore,
  elementsRecord,
  bootElementsWith,
  ELEMENTS_ORDER,
  ELEMENTS_PARS,
  unlockedRecord,
  selectChallenge,
  challengeOption,
  clickTool,
  pressKey,
  clickBrush,
  setSpeedTo,
  clickHand,
  paintCell,
  paintAcross,
  renderedImage,
  pixelAt,
  looksLikeFire,
  looksLikeWater,
  looksLikeEmpty,
  looksLikeStone,
  won,
  frameSnapshot,
  frameDiff,
  pourFlood,
  pourGrow,
  douseHedge,
  bootDrawer,
  pocket,
  basin,
};
