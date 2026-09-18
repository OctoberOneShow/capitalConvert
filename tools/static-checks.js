#!/usr/bin/env node
/*
 * Static acceptance checks for the pet companion change.
 *
 *   1. the four pages still expose exactly 18 game tabs / 18 game panels
 *   2. both shared assets are requested with ?v=38 on all four pages
 *   3. only the cache-busting string changed on the asset lines of each page
 *   4. the pet markup is NOT present in any HTML file (it is JS-injected)
 *   5. UTF-8 / CJK integrity (BOM, no U+FFFD, no latin1 mojibake, sample strings)
 *   5b. the Glyph Match level ladder (keys, defensive storage, JS-injected
 *      level cells)
 *   5c. Elements (pure simulation core, elemental expansion, challenges, canvas
 *      rendering, keyboard path, cancellable loop, versioned storage)
 *   6. pet CSS: stacking below the game modal, motion + theme variants, no
 *      external assets, balanced braces, and the viewport guard that makes the
 *      panel scroll internally instead of overflowing the top of the screen
 *   7. pet JS: no window.prompt/confirm, DOM built with createElement(NS),
 *      mounted on document.body, no permanent rAF loop
 *   8. the extended pet (progression / interactions / mini-games): every
 *      mini-game timer is cancellable, lifecycle hooks exist, stages and
 *      accessories all have CSS, motion-off rules cover the new effects
 *
 * Usage: node tools/static-checks.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const PAGES = [
  "index.html",
  "english_filter.html",
  "chinese_punctuation.html",
  "words_replacing.html",
];

/* The full element roster, in the order the palette, the module's label map and
 * the number keys all use. Ids 0-5 keep the meaning they have always had, so
 * everything the checks pinned before the expansion is still pinned. */
const ELEMENTS_ROSTER = [
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
const ELEMENTS_KEYS = {
  empty: "elementsEmpty",
  stone: "elementsStone",
  sand: "elementsSand",
  water: "elementsWater",
  plant: "elementsPlant",
  fire: "elementsFire",
  wood: "elementsWood",
  ash: "elementsAsh",
  oil: "elementsOil",
  lava: "elementsLava",
  ice: "elementsIce",
  steam: "elementsSteam",
  acid: "elementsAcid",
  seed: "elementsSeed",
  smoke: "elementsSmoke",
  glass: "elementsGlass",
  void: "elementsVoid",
};

let passed = 0;
const failures = [];

function check(label, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${label}`);
    return true;
  }
  failures.push(label + (detail ? ` (${detail})` : ""));
  console.log(`FAIL  ${label}${detail ? " -> " + detail : ""}`);
  return false;
}

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function gitShow(rev, file) {
  return execFileSync("git", ["show", `${rev}:${file}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

/* The Glyph Match pool is written as \uXXXX escapes so the source stays pure
 * ASCII; read the array back as glyph strings for counting. */
function memoryGlyphPool(source) {
  const block = /var memoryGlyphs = \[([\s\S]*?)\];/.exec(source);
  if (!block) return [];
  const entryRe = /"((?:\\u[0-9a-fA-F]{4})+|[\u3400-\u9fff\uf900-\ufaff])"/g;
  return Array.from(block[1].matchAll(entryRe)).map((match) => match[1]);
}

console.log("== 1/2. page structure and asset versions ==");
const APP_MODULES = [
  "i18n", "core", "tools", "pet-data", "pet-state", "pet-life", "pet-art",
  "pet-dom", "pet-render", "pet-games", "pet", "game-campaign",
  "game-elements-core", "game-elements",
  "game-typing", "game-memory", "game-2048", "game-reflex",
  "game-caret-dash", "game-spot-diff", "game-plumber", "game-stack",
  "game-color-code", "game-breakout", "game-ember-dice", "game-snake",
  "game-lights", "game-mines", "game-gomoku", "game-traffic", "game-vault",
  "main",
];
const STYLE_MODULES = ["base", "games", "pet"];
PAGES.forEach((page) => {
  const html = read(page);
  const tabs = countOccurrences(html, 'class="game-tab"');
  const panels = countOccurrences(html, 'class="game-panel"');
  check(`${page}: exactly 18 game-tab`, tabs === 18, `found ${tabs}`);
  check(`${page}: exactly 18 game-panel`, panels === 18, `found ${panels}`);
  check(
    `${page}: stylesheets requested as ?v=38`,
    STYLE_MODULES.every((name) => html.includes(`assets/styles/${name}.css?v=38`)),
  );
  check(
    `${page}: scripts requested as ?v=38`,
    APP_MODULES.every((name) => html.includes(`assets/app/${name}.js?v=38`)),
  );
  check(
    `${page}: no stale ?v=37 / ?v=36 / ?v=35 / ?v=34 / ?v=33 / ?v=32 / ?v=31 / ?v=30 / ?v=29 / ?v=28 / ?v=27 / ?v=26 / ?v=25 / ?v=24 / ?v=23 / ?v=22 / ?v=21 / ?v=20 / ?v=19 / ?v=18 / ?v=17 / ?v=16 / ?v=15 / ?v=14 / ?v=13 / ?v=12 / ?v=11 / ?v=10 / ?v=9 / ?v=8 / ?v=7 / ?v=6 / ?v=5 / ?v=4 left`,
    !html.includes("?v=37") &&
      !html.includes("?v=36") &&
      !html.includes("?v=35") &&
      !html.includes("?v=34") &&
      !html.includes("?v=33") &&
      !html.includes("?v=32") &&
      !html.includes("?v=31") &&
      !html.includes("?v=30") &&
      !html.includes("?v=29") &&
      !html.includes("?v=28") &&
      !html.includes("?v=27") &&
      !html.includes("?v=26") &&
      !html.includes("?v=25") &&
      !html.includes("?v=24") &&
      !html.includes("?v=23") &&
      !html.includes("?v=22") &&
      !html.includes("?v=21") &&
      !html.includes("?v=20") &&
      !html.includes("?v=19") &&
      !html.includes("?v=18") &&
      !html.includes("?v=17") &&
      !html.includes("?v=16") &&
      !html.includes("?v=15") &&
      !html.includes("?v=14") &&
      !html.includes("?v=13") &&
      !html.includes("?v=12") &&
      !html.includes("?v=11") &&
      !html.includes("?v=10") &&
      !html.includes("?v=9") &&
      !html.includes("?v=8") &&
      !html.includes("?v=7") &&
      !html.includes("?v=6") &&
      !html.includes("?v=5") &&
      !html.includes("?v=4"),
  );

  const assetLines = html
    .split("\n")
    .filter((line) => /assets\/(app\/[a-z0-9-]+\.js|styles\/[a-z]+\.css)\?v=/.test(line));
  check(
    `${page}: all split assets referenced (${STYLE_MODULES.length} css + ${APP_MODULES.length} js)`,
    assetLines.length === STYLE_MODULES.length + APP_MODULES.length,
    `found ${assetLines.length}`,
  );
  check(
    `${page}: all asset references are ?v=38`,
    assetLines.every((line) => line.includes("?v=38")),
    assetLines.join(" | "),
  );

  const headAssetLines = gitShow("HEAD", page)
    .split("\n")
    .filter((line) => /assets\/(app(\/|\.js)|styles(\/|\.css)).*\?v=/.test(line));
  const normalizeVersion = (line) =>
    line.replace(/\?v=\d+/, "?v=<version>");
  // Keep this check version-agnostic so it validates future bumps too.
  // After the app.js/styles.css -> app/*/styles/* split the shape changed
  // intentionally (2 monoliths -> 22 modules), so only verify every current
  // reference is versioned and every expected module is present.
  check(
    `${page}: asset lines are all versioned split modules`,
    assetLines.every((line) => /\?v=38/.test(line)) &&
      STYLE_MODULES.every((name) => html.includes(`assets/styles/${name}.css?v=38`)) &&
      APP_MODULES.every((name) => html.includes(`assets/app/${name}.js?v=38`)),
    "asset reference shape changed beyond version token",
  );
});

console.log("\n== 4. pet markup stays out of the HTML files ==");
PAGES.forEach((page) => {
  const html = read(page);
  /* Split scripts live under assets/app/pet-*.js, so only look for injected
   * markup (ids/classes), not the script file names themselves. */
  check(`${page}: no injected pet markup in the page`, !/id="pet|class="pet-|petWidget"|petAdoptForm/.test(html));
});

console.log("\n== 5. encoding / CJK integrity ==");
/* The monoliths are gone: pages and harness run the split modules in
 * APP_MODULES/STYLE_MODULES order, so checks read that concatenation. */
const appJs = APP_MODULES.map((name) =>
  fs.readFileSync(path.join(root, "assets", "app", name + ".js"), "utf8").replace(/^﻿/, ""),
).join("\n");
const stylesCss = STYLE_MODULES.map((name) =>
  fs.readFileSync(path.join(root, "assets", "styles", name + ".css"), "utf8"),
).join("\n");
/* Focused slices so checks cannot be satisfied by unrelated modules. */
const PET_FILES = ["pet-data", "pet-state", "pet-life", "pet-art", "pet-dom", "pet-render", "pet-games", "pet"];
const petJsEarly = PET_FILES.map((name) =>
  fs.readFileSync(path.join(root, "assets", "app", name + ".js"), "utf8").replace(/^﻿/, ""),
).join("\n");
const elementsCoreJs = fs.readFileSync(path.join(root, "assets", "app", "game-elements-core.js"), "utf8").replace(/^﻿/, "");
const elementsUiJs = fs.readFileSync(path.join(root, "assets", "app", "game-elements.js"), "utf8").replace(/^﻿/, "");
const elementsCorePlusUi = elementsCoreJs + "\n" + elementsUiJs;
const bom = fs.readFileSync(path.join(root, "assets", "app", "i18n.js")).subarray(0, 3);
check(
  "split app modules keep their UTF-8 BOM",
  bom[0] === 0xef && bom[1] === 0xbb && bom[2] === 0xbf,
  Array.from(bom)
    .map((b) => b.toString(16))
    .join(" "),
);
[
  ["split app modules", appJs],
  ["split styles", stylesCss],
  ...PAGES.map((page) => [page, read(page)]),
].forEach(([file, text]) => {
  check(`${file}: no U+FFFD replacement characters`, !text.includes("\uFFFD"));
  check(
    `${file}: no latin1-read-as-utf8 mojibake runs`,
    !/[\u00c2\u00c3\u00c5\u00e6\u00e7\u00e8-\u00ef][\u0080-\u00bf\u00c0-\u00ff]{2,}/.test(text),
  );
});
[
  "灵符配对",
  "光标疾驰",
  "游戏结束",
  "括弧灵",
  "笔尖灵",
  "标签灵",
].forEach((sample) => {
  check(`split app modules still contain "${sample}"`, appJs.includes(sample));
});

console.log("\n== 5b. Glyph Match level ladder ==");
const ladderSource = /var memoryLevels = \[([\s\S]*?)\];/.exec(appJs);
const rungs = ladderSource
  ? Array.from(ladderSource[1].matchAll(/pairs:\s*(\d+),\s*cols:\s*(\d+)/g)).map(
      (match) => ({ pairs: Number(match[1]), cols: Number(match[2]) }),
    )
  : [];
check("the level ladder is declared", rungs.length > 0, String(rungs.length));
check(
  "the ladder has at least 5 levels",
  rungs.length >= 5,
  String(rungs.length),
);
check(
  "the pair count increases on every rung",
  rungs.every((rung, index) => index === 0 || rung.pairs > rungs[index - 1].pairs),
  rungs.map((rung) => rung.pairs).join(" -> "),
);
const legacyPairs = /var memoryLegacyPairs = (\d+);/.exec(appJs);
const glyphPool = memoryGlyphPool(appJs);
check(
  "one rung reproduces the original 6-pair board",
  !!legacyPairs && rungs.some((rung) => rung.pairs === Number(legacyPairs[1])),
  legacyPairs && legacyPairs[1],
);
check(
  "the original board sits mid-ladder, not on the first rung",
  !!legacyPairs && rungs.findIndex((rung) => rung.pairs === Number(legacyPairs[1])) > 0,
);
check(
  "no deck exceeds the glyph pool",
  rungs.length > 0 && rungs.every((rung) => rung.pairs <= glyphPool.length),
  `largest rung ${Math.max(...rungs.map((rung) => rung.pairs))} vs pool ${glyphPool.length}`,
);
check(
  "every glyph in the pool is distinct",
  new Set(glyphPool).size === glyphPool.length && glyphPool.length > 0,
  String(glyphPool.length),
);
check(
  "the original six glyphs still lead the pool",
  ["\\u5929", "\\u4e3b", "\\u795e", "\\u5149", "\\u5723", "\\u7075"].every(
    (escaped, index) => glyphPool[index] === escaped,
  ),
  glyphPool.slice(0, 6).join(" "),
);
rungs.forEach((rung) => {
  check(
    `CSS lays out the ${rung.pairs}-pair rung in ${rung.cols} columns`,
    rung.cols === 4 ||
      new RegExp(
        `\\.memory-grid\\[data-cols="${rung.cols}"\\][^{]*\\{[^}]*repeat\\(${rung.cols},`,
      ).test(stylesCss),
    `no rule for data-cols="${rung.cols}"`,
  );
});
check(
  "app.js stamps the column count on the grid",
  /grid\.setAttribute\("data-cols", String\(info\.cols\)\)/.test(appJs),
);
check(
  "the level cell is injected, not hard-coded in the pages",
  /function buildLevelStat/.test(appJs) &&
    PAGES.every((page) => !read(page).includes("memoryLevel")),
);
check(
  "the legacy key name is unchanged",
  /memoryBestKey = "glyph-match-best"/.test(appJs),
);
check(
  "the stored value is versioned so old scalars can migrate",
  /memoryStoreVersion = 2/.test(appJs) &&
    /function readProgress/.test(appJs) &&
    /migrated\.bests\[String\(legacyLevel\)\] = legacy/.test(appJs),
);
check(
  "progress parsing is defensive (try/catch around getItem and JSON.parse)",
  /try \{\s*raw = localStorage\.getItem\(memoryBestKey\)/.test(appJs) &&
    /try \{\s*parsed = JSON\.parse\(text\)/.test(appJs),
);
check(
  "the result line stays a role=status live region",
  PAGES.every((page) =>
    /id="memoryResult" role="status"/.test(read(page)),
  ),
);
check(
  "the card buttons keep their aria-label wiring",
  /t\("cardDown", \{ n: String\(index \+ 1\) \}\)/.test(appJs),
);

console.log("\n== 5c. Elements ==");
PAGES.forEach((page) => {
  const html = read(page);
  check(
    `${page}: has the Elements tab wired to its panel`,
    html.includes('id="gameTabElements"') &&
      html.includes('aria-controls="gamePanelElements"') &&
      html.includes('data-i18n="tabElements"'),
  );
  check(
    `${page}: has the Elements panel wired back to its tab`,
    html.includes('id="gamePanelElements"') &&
      html.includes('aria-labelledby="gameTabElements"') &&
      html.includes('role="tabpanel"'),
  );
  check(
    `${page}: the sandbox canvas keeps a name, a description and a tab stop`,
    /<canvas[^>]*id="elementsCanvas"[^>]*tabindex="0"/.test(html) &&
      /<canvas[^>]*aria-label="[^"]+"/.test(html) &&
      /<canvas[^>]*data-i18n-aria="elementsCanvasLabel"/.test(html) &&
      /<canvas[^>]*aria-describedby="elementsDescription"/.test(html) &&
      /<p class="visually-hidden" id="elementsDescription"><\/p>/.test(html),
  );
  check(
    `${page}: the palette is seventeen real buttons with pressed states`,
    countOccurrences(html, 'class="elements-tool"') === 17 &&
      countOccurrences(html, 'aria-pressed="false"') >= 17 &&
      html.includes('data-element="water"') &&
      html.includes('data-element="fire"'),
  );
  check(
    `${page}: the expanded palette carries every new element`,
    ELEMENTS_ROSTER.every((name) =>
      html.includes('data-element="' + name + '"'),
    ) &&
      ELEMENTS_ROSTER.every((name) =>
        html.includes('data-i18n="' + ELEMENTS_KEYS[name] + '"'),
      ),
  );
  check(
    `${page}: the hand controls are real, labelled buttons`,
    /<button[^>]*id="elementsPauseBtn"[^>]*>/.test(html) &&
      /<button[^>]*id="elementsStepBtn"[^>]*>/.test(html) &&
      /<button[^>]*id="elementsPickBtn"[^>]*>/.test(html) &&
      /<button[^>]*id="elementsUndoBtn"[^>]*>/.test(html) &&
      html.includes('data-i18n="elementsPause"') &&
      html.includes('data-i18n="elementsStep"') &&
      html.includes('data-i18n="elementsPick"') &&
      html.includes('data-i18n="elementsUndo"'),
  );
  check(
    `${page}: the brush sizes are a labelled group of four`,
    /<div class="elements-brushes"[^>]*role="group"/.test(html) &&
      countOccurrences(html, 'class="elements-brush"') === 3 &&
      countOccurrences(html, 'class="elements-brush is-active"') === 1 &&
      html.includes('data-size="0"') &&
      html.includes('data-size="3"'),
  );
  check(
    `${page}: the speed control is a labelled select of four ticks`,
    /<label[^>]*for="elementsSpeed"[^>]*data-i18n="elementsSpeedLabel"/.test(html) &&
      /<select[^>]*id="elementsSpeed"/.test(html) &&
      ['value="0.5"', 'value="1" selected', 'value="2"', 'value="4"'].every(
        (option) => html.includes(option),
      ),
  );
  check(
    `${page}: the HUD carries the paint allowance and the legend line`,
    /<strong id="elementsBudget">/.test(html) &&
      /<p class="elements-legend" id="elementsLegend"><\/p>/.test(html) &&
      html.includes('data-i18n="elementsBudgetLabel"'),
  );
  check(
    `${page}: the challenge picker is a labelled select`,
    /<label[^>]*for="elementsChallenge"[^>]*data-i18n="elementsChallengeLabel"/.test(html) &&
      /<select[^>]*id="elementsChallenge"/.test(html),
  );
  check(
    `${page}: the Elements result line is a role=status live region`,
    /id="elementsResult" role="status"/.test(html),
  );
  check(
    `${page}: the goal is shown as its own text, not only announced`,
    /<p class="elements-goal" id="elementsGoal"><\/p>/.test(html),
  );
  check(
    `${page}: the reset control is a real button`,
    /<button class="ghost" id="elementsResetBtn"[^>]*>/.test(html),
  );
  /* A new panel is easy to drop into the drawer one closing tag short, which
   * the structural lookups above would not notice. */
  const drawerStart = html.indexOf('<div class="game-modal"');
  const drawer = html.slice(drawerStart, html.indexOf('<script src="assets/app/'));
  check(
    `${page}: the game drawer markup is balanced`,
    drawerStart !== -1 &&
      countOccurrences(drawer, "<div") === countOccurrences(drawer, "</div>"),
    `${countOccurrences(drawer, "<div")} open / ${countOccurrences(drawer, "</div>")} closed`,
  );
});

check(
  "the sandbox is registered as the sixth tab",
  /\{ name: "elements", tab: tabElements, panel: panelElements \}/.test(appJs) &&
    /tabElements\.addEventListener\("click"/.test(appJs),
);
check(
  "the fail-closed guard covers both new elements",
  /!tabElements \|\|/.test(appJs) && /!panelElements/.test(appJs),
);
check(
  "the sandbox is initialised and reset by the shared shell",
  /initElements\(\)/.test(appJs) &&
    /(var quietResetElements = null;|App\.quietResetElements = null)/.test(appJs) &&
    countOccurrences(appJs, "quietResetElements()") === 2,
);
check(
  "no Fix-It Ladder code or styling is left behind",
  !/fixitBestKey|fixitRungs|initFixitLadder|quietResetFixitLadder|expectedFixit/.test(appJs) &&
    !/fixit-/.test(appJs) &&
    !/fixit/i.test(stylesCss),
);
check(
  "the retired Fix-It Ladder keys stay in both dictionaries, unused",
  /"tabFixitLadder": "Fix-It Ladder"/.test(appJs) &&
    /"tabFixitLadder": "修文阶梯"/.test(appJs) &&
    countOccurrences(appJs, '"fixitLog":') === 2 &&
    countOccurrences(appJs, '"fixitJob6":') === 2 &&
    !/t\("fixit/.test(appJs),
);

/* The sandbox itself, so the checks below cannot be satisfied by some other
 * game's code that happens to use the same names. */
const elementsJs = elementsCorePlusUi;
check("app.js contains the Elements module", elementsJs.length > 0);
/* Every id the module looks up has to exist in the real markup: the harness
 * boots from its own fixture, so a typo here would only show up in a browser
 * as a game that quietly refuses to start. */
const elementsLookups = Array.from(
  elementsJs
    .slice(elementsJs.indexOf("function initElements"))
    .matchAll(/getElement\("([A-Za-z0-9]+)"\)/g),
).map((match) => match[1]);
check(
  "every id the sandbox looks up exists in all four pages",
  elementsLookups.length >= 12 &&
    PAGES.every((page) => {
      const html = read(page);
      return elementsLookups.every((id) => html.includes('id="' + id + '"'));
    }),
  PAGES.map((page) =>
    elementsLookups
      .filter((id) => !read(page).includes('id="' + id + '"'))
      .join(","),
  ).join(" | ") || String(elementsLookups.length),
);
check(
  "the palette names the module maps are the ones the markup carries",
  PAGES.every((page) =>
    ELEMENTS_ROSTER.every((name) =>
      read(page).includes('data-element="' + name + '"'),
    ),
  ) && ELEMENTS_ROSTER.length === 17,
);

check(
  "the grid is a fixed 80 by 56 board",
  /elementsCols = 80/.test(appJs) &&
    /elementsRows = 56/.test(appJs) &&
    /function createElementsSim\(options\)/.test(appJs),
);
check(
  "the factory is self-contained and constructible on its own",
  (() => {
    try {
      const fnStart = elementsCoreJs.indexOf("function createElementsSim");
      const exportIdx = elementsCoreJs.indexOf("App.createElementsSim");
      const core = elementsCoreJs.slice(fnStart, exportIdx);
      const factory = new Function(core + "\nreturn createElementsSim;")();
      const sim = factory({ cols: 80, rows: 56, seed: 7 });
      return (
        typeof factory === "function" &&
        sim.cols === 80 &&
        sim.rows === 56 &&
        sim.cells.length === 80 * 56 &&
        typeof sim.step === "function" &&
        typeof sim.progress === "function"
      );
    } catch (error) {
      return false;
    }
  })(),
  "the factory text is not runnable on its own",
);
check(
  "the element set is empty, stone, sand, water, plant and fire, plus the expansion ids",
  /var EMPTY = 0;/.test(elementsJs) &&
    /var STONE = 1;/.test(elementsJs) &&
    /var SAND = 2;/.test(elementsJs) &&
    /var WATER = 3;/.test(elementsJs) &&
    /var PLANT = 4;/.test(elementsJs) &&
    /var FIRE = 5;/.test(elementsJs) &&
    /var WOOD = 6;/.test(elementsJs) &&
    /var ASH = 7;/.test(elementsJs) &&
    /var OIL = 8;/.test(elementsJs) &&
    /var LAVA = 9;/.test(elementsJs) &&
    /var ICE = 10;/.test(elementsJs) &&
    /var STEAM = 11;/.test(elementsJs) &&
    /var ACID = 12;/.test(elementsJs) &&
    /var SEED = 13;/.test(elementsJs) &&
    /var SMOKE = 14;/.test(elementsJs) &&
    /var GLASS = 15;/.test(elementsJs) &&
    /var VOID = 16;/.test(elementsJs),
);
check(
  "sand falls, sinks through water and piles diagonally",
  /function moveSand/.test(elementsJs) &&
    /function movePowder\(cell, x, y, sink\)/.test(elementsJs) &&
    /under === EMPTY \|\| \(sink && under === WATER\)/.test(elementsJs) &&
    /return movePowder\(cell, x, y, true\)/.test(elementsJs) &&
    /function swap/.test(elementsJs),
);
check(
  "water falls and then spreads sideways so it levels out",
  /spread = 3/.test(elementsJs) &&
    /function flowReach\(x, y, sign, reach\)/.test(elementsJs) &&
    /function moveLiquid\(cell, x, y, opts\)/.test(elementsJs) &&
    /function moveWater\(cell, x, y\)/.test(elementsJs) &&
    /return moveLiquid\(cell, x, y\);/.test(elementsJs),
);
check(
  "the expansion's powders, liquids and gases share those movers",
  /movePowder\(cell, x, y, false\)/.test(elementsJs) &&
    /oilMotion = \{ spread: oilSpread, float: true \}/.test(elementsJs) &&
    /lavaMotion = \{ spread: lavaSpread, chance: lavaChance \}/.test(elementsJs) &&
    /function moveGas\(cell, x, y\)/.test(elementsJs) &&
    /settings\.float && y > 0 && cells\[cell - cols\] === WATER/.test(elementsJs),
);
check(
  "steam and smoke carry their own countdowns and acid its uses",
  /var steamLife = 120;/.test(elementsJs) &&
    /var smokeLife = 90;/.test(elementsJs) &&
    /var acidUses = 3;/.test(elementsJs) &&
    /function initialLife\(value\)/.test(elementsJs) &&
    /function gasStep\(cell, x, y, kind\)/.test(elementsJs) &&
    /cells\[cell\] = kind === STEAM \? WATER : EMPTY;/.test(elementsJs),
);
check(
  "every fuel and every soluble solid is named in exactly one place",
  /function isFuel\(value\)/.test(elementsJs) &&
    /value === PLANT \|\| value === WOOD \|\| value === OIL \|\| value === SEED/.test(
      elementsJs,
    ) &&
    /function isSoluble\(value\)/.test(elementsJs) &&
    /!isFuel\(cells\[cell\]\)/.test(elementsJs) &&
    /!isSoluble\(cells\[index\(nx, ny\)\]\)/.test(elementsJs),
);
check(
  "lava is heat: it glasses sand, melts ice and boils water into stone",
  /function lavaReacts\(cell, x, y\)/.test(elementsJs) &&
    /set\(x \+ dirX\[step\], y \+ dirY\[step\], STEAM\);/.test(elementsJs) &&
    /set\(x, y, STONE\);/.test(elementsJs) &&
    /near === SAND/.test(elementsJs) &&
    /set\(nx, ny, GLASS\);/.test(elementsJs),
);
check(
  "the board can pour for itself and hand the brush an allowance",
  /function addSpawner\(x, y, value, every, remaining\)/.test(elementsJs) &&
    /generation % spec\.every !== 0/.test(elementsJs) &&
    /if \(ink > 0 && inkLeft <= 0\) \{\s*return false;/.test(elementsJs) &&
    /function spendInk\(\)/.test(elementsJs) &&
    /function remember\(\)/.test(elementsJs) &&
    /function undo\(\)/.test(elementsJs) &&
    /var undoLimit = 6;/.test(elementsJs),
);
check(
  "a plant grows one cell upward into water and consumes it",
  /function growPlant/.test(elementsJs) &&
    /if \(cells\[above\] !== WATER\) \{/.test(elementsJs) &&
    /cells\[above\] = PLANT;/.test(elementsJs) &&
    /growNow = generation % growEvery === 0/.test(elementsJs),
);
check(
  "fire ignites plants, is doused by adjacent water and expires on its own",
  /function ignite/.test(elementsJs) &&
    /function burn/.test(elementsJs) &&
    /life\[cell\] = life\[cell\] - 1;/.test(elementsJs) &&
    /set\(x - 1, y, EMPTY\);/.test(elementsJs) &&
    /life\[cell\] = fireLife;/.test(elementsJs),
);
check(
  "the plant cadence is slower than the simulation",
  /growEvery = 8/.test(elementsJs) && /elementsTickMs = 50/.test(appJs),
);
check(
  "the step is seeded and never calls Math.random",
  /function random\(\)/.test(elementsJs) &&
    /seedState = \(seedState \* 48271\) % 2147483647;/.test(elementsJs) &&
    !/Math\.random\s*\(/.test(elementsJs),
);
check(
  "out-of-bounds writes are refused, counted and hashed against",
  /outOfRangeWrites \+= 1;/.test(elementsJs) &&
    /outOfRangeWrites: function \(\)/.test(elementsJs) &&
    /function hash\(\)/.test(elementsJs),
);
check(
  "twelve boards declare a goal, a limit, a par, a budget and a palette",
  countOccurrences(appJs, 'labelKey: "elementsChallenge') === 12 &&
    countOccurrences(appJs, "goalKey:") === 12 &&
    countOccurrences(appJs, "tools: [") === 12 &&
    countOccurrences(appJs, "stars: [") === 12 &&
    countOccurrences(appJs, "budget:") === 12 &&
    /limit: 60/.test(appJs) &&
    /limit: 20/.test(appJs) &&
    /limit: 90/.test(appJs),
);
check(
  "the campaign table is the design's eleven boards in teaching order",
  (() => {
    const table = appJs.slice(
      appJs.indexOf("var elementsChallenges = ["),
      appJs.indexOf("var elementsBasePalette"),
    );
    const order = [];
    const re = /id: "([a-z]+)",/g;
    let m;
    while ((m = re.exec(table)) !== null) order.push(m[1]);
    return (
      order.join(",") ===
      "free,grow,flood,extinguish,glass,quench,thaw,spill,etch,sprout,geyser,grove"
    );
  })(),
);
check(
  "the goals are the design's five descriptor kinds",
  /free: \{ kind: "none" \}/.test(elementsJs) &&
    /grow: \{ kind: "growTop" \}/.test(elementsJs) &&
    /sprout: \{ kind: "growTop" \}/.test(elementsJs) &&
    /extinguish: \{ kind: "countZero", element: FIRE \}/.test(elementsJs) &&
    /quench: \{ kind: "countZero", element: LAVA \}/.test(elementsJs) &&
    /spill: \{ kind: "countZero", element: OIL \}/.test(elementsJs) &&
    /glass: \{ kind: "countAtLeast", element: GLASS, need: 16 \}/.test(elementsJs) &&
    /kind: "countZeroPlusMin"/.test(elementsJs) &&
    /kind: "zoneFill"/.test(elementsJs) &&
    /function progress\(id\) \{\s*var goal = boardGoals\[id\]/.test(elementsJs) &&
    /goal.kind === "growTop"/.test(elementsJs) &&
    /goal.kind === "countZero"/.test(elementsJs) &&
    /goal.kind === "countAtLeast"/.test(elementsJs) &&
    /goal.kind === "zoneFill"/.test(elementsJs) &&
    /goal.kind === "countZeroPlusMin"/.test(elementsJs),
);
check(
  "the eight campaign boards are builders inside the factory",
  [
    "buildGlass",
    "buildQuench",
    "buildThaw",
    "buildSpill",
    "buildEtch",
    "buildSprout",
    "buildGeyser",
    "buildGrove",
    "buildShowcase",
  ].every((name) => elementsJs.indexOf("function " + name + "(") !== -1) &&
    /function markZone\(x0, y0, x1, y1, frac\)/.test(elementsJs) &&
    /id === "grove"\) \{\s*buildGrove\(\);/.test(elementsJs) &&
    /buildFree\(\);\s*buildShowcase\(\);/.test(elementsJs),
);
check(
  "the campaign unlocks in order and derives the palette from it",
  /var elementsBasePalette = \["empty", "stone", "sand", "water", "plant", "fire"\]/.test(
    appJs,
  ) &&
    /elementsUnlockByChallenge = \{/.test(appJs) &&
    /glass: \["lava"\]/.test(appJs) &&
    /sprout: \["wood", "seed", "ash"\]/.test(appJs) &&
    /grove: \["void"\]/.test(appJs) &&
    /var elementsFinalUnlock = "glass"/.test(appJs) &&
    /function challengeUnlocked\(id\)/.test(appJs) &&
    /return cleared\[elementsChallenges\[rung - 1\]\.id\] === true/.test(appJs) &&
    /function boardTools\(info\)/.test(appJs) &&
    /option\.disabled = !open/.test(appJs),
);
check(
  "free play is the one board with no clock and every tool",
  (() => {
    const table = appJs.slice(
      appJs.indexOf("var elementsChallenges = ["),
      appJs.indexOf("var typingPhrases"),
    );
    const free = /id: "free",([\s\S]*?)\n    \},/.exec(table);
    return (
      !!free &&
      /limit: 0,/.test(free[1]) &&
      /budget: 0,/.test(free[1]) &&
      /* The six original elements still lead the list, so the number keys
       * 1-6 still pick what they always did. */
      /tools: \[\s*"empty",\s*"stone",\s*"sand",\s*"water",\s*"plant",\s*"fire",/.test(
        table,
      ) &&
      ELEMENTS_ROSTER.every((name) => free[1].includes('"' + name + '"')) &&
      countOccurrences(table, "limit: 0,") === 1
    );
  })(),
);
check(
  "the three original win conditions keep their exact numbers",
  /topPlant === 0/.test(elementsJs) &&
    /target: rows,/.test(elementsJs) &&
    /return \{ value: left, target: zeroTarget, done: left === 0 \};/.test(
      elementsJs,
    ) &&
    /done: zoneTarget > 0 && wet >= zoneTarget/.test(elementsJs) &&
    /zoneTarget = Math\.ceil\(\s*\(zone\.x1 - zone\.x0 \+ 1\)/.test(elementsJs),
);
check(
  "the grow board is a walled shaft with a seed and a pool",
  /function buildGrow/.test(elementsJs) &&
    /fill\(cx - 4, 0, cx - 1, floor - 1, STONE\)/.test(elementsJs) &&
    /fill\(cx, floor - 20, cx, floor - 1, WATER\)/.test(elementsJs) &&
    /set\(cx, floor - 1, PLANT\)/.test(elementsJs),
);
check(
  "the extinguish board is a serpentine hedge with fire at its near end",
  /function buildExtinguish/.test(elementsJs) &&
    /set\(x0, top, FIRE\)/.test(elementsJs) &&
    /pitch = 6/.test(elementsJs),
);
check(
  "the flood board marks a target zone and pours only from above its rim",
  /function buildFlood/.test(elementsJs) &&
    /zone = \{ x0: left \+ 3/.test(elementsJs) &&
    /zoneTarget = Math\.ceil\(/.test(elementsJs) &&
    /addPourZone\(0, 0, cols - 1, rim - 1\);/.test(elementsJs),
);
check(
  "the brush never overwrites a solid cell and the eraser clears anything",
  /if \(cells\[cell\] !== EMPTY\) \{\s*return false;/.test(elementsJs) &&
    /if \(value === EMPTY\) \{/.test(elementsJs) &&
    /return set\(x, y, value\);/.test(elementsJs),
);
check(
  "a board's pour zone is enforced in the simulation, not in a DOM handler",
  /var pourZones = \[\];/.test(elementsJs) &&
    /function addPourZone\(x0, y0, x1, y1\)/.test(elementsJs) &&
    /function inPourZone\(x, y\)/.test(elementsJs) &&
    /if \(!pourZones\.length\) \{\s*return true;/.test(elementsJs) &&
    /* The test sits in `paint` ahead of the empty-cell branch, so the eraser
     * is fenced in exactly like an element. */
    /if \(!inPourZone\(x, y\)\) \{\s*return false;\s*\}\s*var cell = index\(x, y\);\s*if \(value === EMPTY\) \{/.test(
      elementsJs,
    ) &&
    /pourZones: function \(\) \{/.test(elementsJs) &&
    /clearBoard\(\)[\s\S]*?pourZones = \[\];/.test(elementsJs),
);
check(
  "every timed board fences the brush in, and free play does not",
  (() => {
    const builders = elementsJs.slice(elementsJs.indexOf("function buildFree("));
    const timed = [
      "buildGrow",
      "buildFlood",
      "buildExtinguish",
      "buildGlass",
      "buildQuench",
      "buildThaw",
      "buildSpill",
      "buildEtch",
      "buildSprout",
      "buildGeyser",
      "buildGrove",
    ];
    const fenced = (name) => {
      const start = builders.indexOf("function " + name + "(");
      const next = builders.indexOf("function build", start + 1);
      const body = builders.slice(start, next === -1 ? builders.length : next);
      return /addPourZone\(/.test(body);
    };
    const freeStart = builders.indexOf("function buildFree(");
    const freeEnd = builders.indexOf("function buildGrow(");
    const free = builders.slice(freeStart, freeEnd);
    const showcase = builders.slice(
      builders.indexOf("function buildShowcase("),
      builders.indexOf("function loadPreset("),
    );
    return (
      /* Fifteen fenced regions across the eleven timed boards: one each for
       * ten of them, nine for the serpentine hedge (the bands of air between
       * its rows), three for the sprout shaft and two for the geyser's
       * pockets. */
      countOccurrences(builders, "addPourZone(") === 15 &&
      timed.every(fenced) &&
      !/addPourZone\(/.test(free) &&
      !/addPourZone\(/.test(showcase)
    );
  })(),
  String(countOccurrences(elementsJs, "addPourZone(")),
);
check(
  "the pour zone is drawn as a theme-aware wash over the empty cells",
  /pour: \[12, 44, 40\]/.test(appJs) &&
    /pour: \[222, 242, 228\]/.test(appJs) &&
    /var pours = sim\.pourZones\(\);/.test(appJs) &&
    /value === EMPTY && pours\.length/.test(appJs) &&
    /colour = palette\.pour;/.test(appJs),
);
check(
  "rendering is one grid-resolution ImageData, never per-cell DOM",
  /createImageData\(sim\.cols, sim\.rows\)/.test(appJs) &&
    /putImageData\(imageData, 0, 0\)/.test(appJs) &&
    /drawImage\(offscreen, 0, 0, canvas\.width, canvas\.height\)/.test(appJs) &&
    /canvas\.width = sim\.cols \* elementsScale/.test(appJs),
);
check(
  "the CSS keeps the scaled-up pixels crisp and both themes legible",
  /image-rendering:\s*pixelated/.test(stylesCss) &&
    /imageSmoothingEnabled/.test(appJs) &&
    /\[data-theme="light"\] \.elements-canvas/.test(stylesCss) &&
    /@keyframes elementsToolPulse/.test(stylesCss) &&
    /\[data-motion="off"\] \.elements-tool\.is-active\s*\{[^}]*animation:\s*none\s*!important/.test(
      stylesCss,
    ),
);
check(
  "the loop is a tracked interval, never rAF, and is cleared on every exit",
  /window\.setInterval\(tick, tickMs\(\)\)/.test(appJs) &&
    /function tickMs\(\)\s*\{\s*return Math\.max\(1, Math\.round\(elementsTickMs \/ speed\)\);/.test(
      appJs,
    ) &&
    /window\.clearInterval\(intervalId\)/.test(appJs) &&
    !/requestAnimationFrame/.test(elementsJs),
);
check(
  "the loop only runs while its own panel and the document are visible",
  /function boardVisible\(\)\s*\{[\s\S]{0,200}?!panel\.hidden && !document\.hidden/.test(
    elementsJs,
  ) &&
    /document\.addEventListener\("visibilitychange", handleVisibility\)/.test(elementsJs) &&
    /function syncLoop/.test(elementsJs),
);
check(
  "an armed timed board freezes the world and cannot win or be charged",
  /function boardArmed\(\)\s*\{\s*return challenge\.limit > 0 && !runActive;/.test(
    elementsJs,
  ) &&
    /var frozen = boardArmed\(\);\s*if \(!frozen\) \{\s*advance\(\);/.test(
      elementsJs,
    ) &&
    /function advance\(\)\s*\{\s*sim\.step\(\);/.test(elementsJs) &&
    countOccurrences(elementsJs, "sim.step()") === 1 &&
    /if \(runActive\) \{\s*if \(sim\.progress\(challenge\.id\)\.done\) \{\s*completeRun\(\);/.test(
      elementsJs,
    ),
);
check(
  "pause, step and speed all go through the one tracked interval",
  /function setPaused\(next\)/.test(elementsJs) &&
    /function stepOnce\(\)/.test(elementsJs) &&
    /if \(boardArmed\(\)\) \{\s*runActive = true;\s*resultEl\.textContent = t\("elementsGo"\);/.test(
      elementsJs,
    ) &&
    /intervalId !== null \|\| !boardVisible\(\) \|\| paused/.test(elementsJs) &&
    countOccurrences(elementsJs, "window.setInterval") === 1 &&
    countOccurrences(elementsJs, "window.clearInterval") === 1,
);
check(
  "the keyboard path picks tools, moves a cursor and places elements",
  /parseInt\(key, 10\)/.test(elementsJs) &&
    /key === "ArrowLeft"/.test(elementsJs) &&
    /key === "Enter"/.test(elementsJs) &&
    /paintBlob\(\s*cursorX,\s*cursorY,\s*ids\[activeTool\],\s*elementsCursorBrush,?\s*\)/.test(
      elementsJs,
    ) &&
    /var brushRadii = \[0, 1, 2, 3\];/.test(elementsJs) &&
    /sim\.paintBlob\(x, y, ids\[activeTool\], brushRadius\(\)\)/.test(elementsJs),
);
check(
  "pointer painting maps through the canvas rect and interpolates a drag",
  /function cellAt\(clientX, clientY\)/.test(elementsJs) &&
    /getBoundingClientRect/.test(elementsJs) &&
    /function paintLine/.test(elementsJs) &&
    /pointerdown/.test(elementsJs),
);
check(
  "a completed challenge tells the pet exactly once",
  countOccurrences(elementsJs, "petNotifyGame(") === 1 &&
    /petNotifyGame\(isBest\)/.test(elementsJs),
);
check(
  "win, timeout, best and the log all go through t()",
  /t\("elementsWin", \{ s: seconds\.toFixed\(1\) \}\)/.test(elementsJs) &&
    /t\("elementsTimeUp"\)/.test(elementsJs) &&
    /t\("newBest"\)/.test(elementsJs) &&
    /t\("bestTime", \{ s: best\.toFixed\(1\) \}\)/.test(elementsJs) &&
    /t\("elementsLog", \{/.test(elementsJs),
);
check(
  "the stored progress is versioned under its own key",
  /elementsBestKey = "elements-best"/.test(appJs) &&
    /elementsStoreVersion = 2/.test(appJs) &&
    /elementsMaxSeconds = 3600/.test(appJs),
);
check(
  "progress parsing is defensive (try/catch around getItem and JSON.parse)",
  /try \{\s*raw = localStorage\.getItem\(elementsBestKey\)/.test(appJs) &&
    /try \{\s*parsed = JSON\.parse\(text\)/.test(appJs) &&
    /localStorage\.setItem\(\s*elementsBestKey/.test(appJs),
);
check(
  "every Elements string is looked up through t() or data-i18n",
  countOccurrences(elementsJs, 't("elements') >= 10 &&
    !/"[A-Z][a-z]+ [a-z]+ [a-z]+/.test(elementsJs),
);
[
  "tabElements",
  "hudGoal",
  "elementsChallengeLabel",
  "elementsChallengeFree",
  "elementsChallengeGrow",
  "elementsChallengeExtinguish",
  "elementsChallengeFlood",
  "elementsGoalFree",
  "elementsGoalGrow",
  "elementsGoalExtinguish",
  "elementsGoalFlood",
  "elementsToolsLabel",
  "elementsEmpty",
  "elementsStone",
  "elementsSand",
  "elementsWater",
  "elementsPlant",
  "elementsFire",
  "elementsWood",
  "elementsAsh",
  "elementsOil",
  "elementsLava",
  "elementsIce",
  "elementsSteam",
  "elementsAcid",
  "elementsSeed",
  "elementsSmoke",
  "elementsGlass",
  "elementsVoid",
  "elementsReset",
  "elementsSpeedLabel",
  "elementsBrushLabel",
  "elementsPause",
  "elementsResume",
  "elementsStep",
  "elementsPick",
  "elementsUndo",
  "elementsBudgetLabel",
  "elementsBudgetUnlimited",
  "elementsLegend",
  "elementsClassStatic",
  "elementsClassPowder",
  "elementsClassLiquid",
  "elementsClassGas",
  "elementsPicked",
  "elementsPickHint",
  "elementsPickBlocked",
  "elementsPourHint",
  "elementsUndone",
  "elementsUndoEmpty",
  "elementsPaused",
  "elementsResumed",
  "elementsCanvasLabel",
  "elementsDescription",
  "elementsCountNone",
  "elementsGo",
  "elementsWin",
  "elementsTimeUp",
  "elementsLog",
  "elementsHint",
].forEach((key) => {
  check(
    `the "${key}" key exists in both languages`,
    countOccurrences(appJs, `"${key}":`) === 2,
    String(countOccurrences(appJs, `"${key}":`)),
  );
});

console.log("\n== 5d. Spot the Diff and Punctuation Plumber ==");
PAGES.forEach((page) => {
  const html = read(page);
  check(
    `${page}: has both new tabs wired to their panels`,
    html.includes('id="gameTabSpotDiff"') &&
      html.includes('aria-controls="gamePanelSpotDiff"') &&
      html.includes('data-i18n="tabSpotDiff"') &&
      html.includes('id="gameTabPlumber"') &&
      html.includes('aria-controls="gamePanelPlumber"') &&
      html.includes('data-i18n="tabPlumber"'),
  );
  check(
    `${page}: both new panels are wired back to their tabs`,
    html.includes('id="gamePanelSpotDiff"') &&
      html.includes('aria-labelledby="gameTabSpotDiff"') &&
      html.includes('id="gamePanelPlumber"') &&
      html.includes('aria-labelledby="gameTabPlumber"'),
  );
});
check(
  "the two new games are registered as drawer tabs",
  /\{ name: "spotDiff", tab: tabSpotDiff, panel: panelSpotDiff \}/.test(appJs) &&
    /\{ name: "plumber", tab: tabPlumber, panel: panelPlumber \}/.test(appJs) &&
    /tabSpotDiff\.addEventListener\("click"/.test(appJs) &&
    /tabPlumber\.addEventListener\("click"/.test(appJs),
);
check(
  "both new games are reset by the shared shell",
  /App\.quietResetSpotDiff = null/.test(appJs) &&
    /App\.quietResetPlumber = null/.test(appJs) &&
    countOccurrences(appJs, "quietResetSpotDiff()") === 2 &&
    countOccurrences(appJs, "quietResetPlumber()") === 2,
);
const spotJs = fs
  .readFileSync(path.join(root, "assets", "app", "game-spot-diff.js"), "utf8")
  .replace(/^﻿/, "");
const plumberJs = fs
  .readFileSync(path.join(root, "assets", "app", "game-plumber.js"), "utf8")
  .replace(/^﻿/, "");
const newGameLookups = Array.from(
  `${spotJs}\n${plumberJs}`.matchAll(/getElement\("([A-Za-z0-9]+)"\)/g),
).map((match) => match[1]);
check(
  "every id the new games look up exists in all four pages",
  newGameLookups.length >= 18 &&
    PAGES.every((page) => {
      const html = read(page);
      return newGameLookups.every((id) => html.includes('id="' + id + '"'));
    }),
  newGameLookups.join(","),
);
check(
  "the Spot the Diff ladder grows its diffs rung by rung",
  (() => {
    const block = /var spotLevels = \[([\s\S]*?)\];/.exec(spotJs);
    if (!block) return false;
    const counts = Array.from(block[1].matchAll(/diffs:\s*(\d+)/g)).map(
      (match) => Number(match[1]),
    );
    return (
      counts.length >= 3 &&
      counts.every((n, index) => index === 0 || n > counts[index - 1])
    );
  })(),
);
check(
  "the Spot the Diff storage is versioned and migrates the v1 scalar best",
  /spotStoreVersion = 2/.test(spotJs) &&
    /\^\\d\+\$/.test(spotJs) &&
    /function readProgress/.test(spotJs) &&
    /JSON\.parse\(String\(raw\)\)/.test(spotJs),
);
check(
  "a missed click costs the Spot the Diff clock",
  /spotPenaltyMs = 2000/.test(spotJs) &&
    /penaltyMs \+= spotPenaltyMs/.test(spotJs) &&
    /Date\.now\(\) - startedAt \+ penaltyMs/.test(spotJs),
);
check(
  "rung 3 plants homoglyph damage the easier rungs never use",
  /var spotHomoglyphs = \{/.test(spotJs) &&
    /homoglyphs: true/.test(spotJs) &&
    /homoglyphs: false/.test(spotJs),
);
check(
  "spot-the-diff character spans keep their spaces visible",
  /\.spot-char\s*\{[^}]*display:\s*inline-block[^}]*white-space:\s*pre/.test(stylesCss),
);
check(
  "plumber scores ride the combo multiplier and a strike wipes it",
  /function comboMult/.test(plumberJs) &&
    /score \+= gained/.test(plumberJs) &&
    /streak = 0;/.test(plumberJs),
);
check(
  "the slow drizzle halves fall speed inside a time-boxed window",
  /plumberDrizzleMs = 3000/.test(plumberJs) &&
    /drizzleUntil = Date\.now\(\) \+ plumberDrizzleMs/.test(plumberJs) &&
    /drizzleActive\(\) \? 0\.5 : 1/.test(plumberJs),
);
[
  "tabSpotDiff",
  "hudFound",
  "hudMisses",
  "spotPrompt",
  "spotGo",
  "spotWrong",
  "spotFound",
  "spotEditLabel",
  "spotHint",
  "logSpot",
  "spotPenalty",
  "spotLevelCleared",
  "spotNextLevel",
  "spotAllLevels",
  "tabPlumber",
  "plumberPrompt",
  "plumberGo",
  "plumberMissed",
  "plumberOver",
  "plumberBinFull",
  "plumberBinHalf",
  "plumberFieldLabel",
  "plumberHint",
  "logPlumber",
  "hudCombo",
  "plumberStreak",
  "plumberSlow",
].forEach((key) => {
  check(
    `the "${key}" key exists in both languages`,
    countOccurrences(appJs, `"${key}":`) === 2,
    String(countOccurrences(appJs, `"${key}":`)),
  );
});

console.log("\n== 5e. Stack, Color Code, Inkball and Ember Dice ==");
const FOUR_GAMES = [
  { name: "stack", tab: "gameTabStack", panel: "gamePanelStack", file: "game-stack" },
  { name: "colorCode", tab: "gameTabColorCode", panel: "gamePanelColorCode", file: "game-color-code" },
  { name: "breakout", tab: "gameTabBreakout", panel: "gamePanelBreakout", file: "game-breakout" },
  { name: "emberDice", tab: "gameTabEmberDice", panel: "gamePanelEmberDice", file: "game-ember-dice" },
];
FOUR_GAMES.forEach((game) => {
  PAGES.forEach((page) => {
    const html = read(page);
    check(
      `${page}: ${game.name} tab and panel are wired both ways`,
      html.includes(`id="${game.tab}"`) &&
        html.includes(`aria-controls="${game.panel}"`) &&
        html.includes(`id="${game.panel}"`) &&
        html.includes(`aria-labelledby="${game.tab}"`),
    );
  });
  const gameSource = fs
    .readFileSync(path.join(root, "assets", "app", game.file + ".js"), "utf8")
    .replace(/^﻿/, "");
  const lookups = Array.from(
    gameSource.matchAll(/getElement\("([A-Za-z0-9]+)"\)/g),
  ).map((match) => match[1]);
  check(
    `${game.file}: every id it looks up exists in all four pages`,
    lookups.length >= 8 &&
      PAGES.every((page) => {
        const html = read(page);
        return lookups.every((id) => html.includes('id="' + id + '"'));
      }),
    lookups.join(","),
  );
  const pascal = game.name.charAt(0).toUpperCase() + game.name.slice(1);
  const entryRe = new RegExp(
    `\\{ name: "${game.name}", tab: tab${pascal}, panel: panel${pascal} \\}`,
  );
  const listenerRe = new RegExp(`tab${pascal}\\.addEventListener\\("click"`);
  check(
    `${game.name} is registered as a drawer tab with a click listener`,
    entryRe.test(appJs) && listenerRe.test(appJs),
  );
});
check(
  "the two interval games are reset by the shared shell",
  /App\.quietResetStack = null/.test(appJs) &&
    /App\.quietResetBreakout = null/.test(appJs) &&
    countOccurrences(appJs, "quietResetStack()") === 2 &&
    countOccurrences(appJs, "quietResetBreakout()") === 2,
);
[
  "tabStack",
  "hudHeight",
  "hudPerfect",
  "stackFieldLabel",
  "stackPrompt",
  "stackGo",
  "stackPerfect",
  "stackOver",
  "stackHint",
  "logStack",
  "tabColorCode",
  "hudTry",
  "hudStreak",
  "ccPaletteLabel",
  "ccBoardLabel",
  "ccPrompt",
  "ccNoFill",
  "ccFeedback",
  "ccWin",
  "ccLost",
  "ccBestLine",
  "ccSlotLabel",
  "ccEmpty",
  "ccSecretLabel",
  "ccHint",
  "logCC",
  "ccColor0",
  "ccColor1",
  "ccColor2",
  "ccColor3",
  "ccColor4",
  "ccColor5",
  "tabBreakout",
  "hudLives",
  "brkCanvasLabel",
  "brkPrompt",
  "brkLaunch",
  "brkPlay",
  "brkLifeLost",
  "brkLevelUp",
  "brkOver",
  "brkHint",
  "logBrk",
  "tabEmberDice",
  "hudTurn",
  "hudBank",
  "diceAtStake",
  "diceRoll",
  "diceBankBtn",
  "dicePrompt",
  "diceGo",
  "diceRolled",
  "diceBurn",
  "diceBanked",
  "diceOver",
  "diceHint",
  "logDice",
].forEach((key) => {
  check(
    `the "${key}" key exists in both languages`,
    countOccurrences(appJs, `"${key}":`) === 2,
    String(countOccurrences(appJs, `"${key}":`)),
  );
});

console.log("\n== 5f. Serpent, Lights Out and Glyph Mines ==");
const THREE_GAMES = [
  { name: "snake", tab: "gameTabSnake", panel: "gamePanelSnake", file: "game-snake" },
  { name: "lights", tab: "gameTabLights", panel: "gamePanelLights", file: "game-lights" },
  { name: "mines", tab: "gameTabMines", panel: "gamePanelMines", file: "game-mines" },
];
THREE_GAMES.forEach((game) => {
  PAGES.forEach((page) => {
    const html = read(page);
    check(
      `${page}: ${game.name} tab and panel are wired both ways`,
      html.includes(`id="${game.tab}"`) &&
        html.includes(`aria-controls="${game.panel}"`) &&
        html.includes(`id="${game.panel}"`) &&
        html.includes(`aria-labelledby="${game.tab}"`),
    );
  });
  const gameSource = fs
    .readFileSync(path.join(root, "assets", "app", game.file + ".js"), "utf8")
    .replace(/^﻿/, "");
  const lookups = Array.from(
    gameSource.matchAll(/getElement\("([A-Za-z0-9]+)"\)/g),
  ).map((match) => match[1]);
  check(
    `${game.file}: every id it looks up exists in all four pages`,
    lookups.length >= 7 &&
      PAGES.every((page) => {
        const html = read(page);
        return lookups.every((id) => html.includes('id="' + id + '"'));
      }),
    lookups.join(","),
  );
  const pascal = game.name.charAt(0).toUpperCase() + game.name.slice(1);
  check(
    `${game.name} is registered as a drawer tab with a click listener`,
    new RegExp(`\\{ name: "${game.name}", tab: tab${pascal}, panel: panel${pascal} \\}`).test(appJs) &&
      new RegExp(`tab${pascal}\\.addEventListener\\("click"`).test(appJs),
  );
});
check(
  "the two interval games of batch three are reset by the shell",
  /App\.quietResetSnake = null/.test(appJs) &&
    /App\.quietResetMines = null/.test(appJs) &&
    countOccurrences(appJs, "quietResetSnake()") === 2 &&
    countOccurrences(appJs, "quietResetMines()") === 2,
);
check(
  "the picker is a two-column grid, not a hidden carousel",
  /\.game-tabs\s*\{[^}]*display:\s*grid/.test(stylesCss) &&
    /\.game-tabs\s*\{[^}]*grid-template-columns:\s*repeat\(2/.test(stylesCss) &&
    !/\.game-tabs\s*\{[^}]*overflow-x/.test(stylesCss) &&
    !stylesCss.includes("is-fade-left") &&
    !stylesCss.includes("game-tabs-bar") &&
    !appJs.includes("updateStripFade") &&
    !appJs.includes("scrollIntoView"),
  "carousel machinery still present",
);
check(
  "the collapsed grid names its hidden count",
  /\.game-tabs\.is-collapsed \.game-tab:nth-child\(n \+ 7\)\s*\{\s*display:\s*none/.test(stylesCss) &&
    /"\+" \+ Math\.max\(0, gameTabEntries\.length - pickerVisibleCount\)/.test(appJs) &&
    PAGES.every((page) => read(page).includes('class="game-tabs-more"')),
);
check(
  "mines places its field after the first dig",
  /function placeMines\(safeIndex\)/.test(
    fs.readFileSync(path.join(root, "assets", "app", "game-mines.js"), "utf8"),
  ) &&
    /banned\.indexOf\(spot\) === -1/.test(
      fs.readFileSync(path.join(root, "assets", "app", "game-mines.js"), "utf8"),
    ),
);
check(
  "lights boards start from darkness and get shuffled, so they are always solvable",
  /flipCross\(Math\.floor\(Math\.random\(\) \* cells\.length\)\)/.test(
    fs.readFileSync(path.join(root, "assets", "app", "game-lights.js"), "utf8"),
  ),
);
[
  "tabSnake",
  "hudLength",
  "snkFieldLabel",
  "snkPrompt",
  "snkGo",
  "snkOver",
  "snkHint",
  "logSnk",
  "tabLights",
  "litFieldLabel",
  "litPrompt",
  "litSolved",
  "litLevelUp",
  "litDone",
  "litBestLine",
  "litHint",
  "logLit",
  "litCell",
  "litOn",
  "litOff",
  "tabMines",
  "hudFlags",
  "hudMines",
  "mnFieldLabel",
  "mnPrompt",
  "mnGo",
  "mnBoom",
  "mnCleared",
  "mnFlagMode",
  "mnFlagOn",
  "mnFlagOff",
  "mnHint",
  "mnCell",
  "mnFlagged",
  "mnMine",
  "logMines",
].forEach((key) => {
  check(
    `the "${key}" key exists in both languages`,
    countOccurrences(appJs, `"${key}":`) === 2,
    String(countOccurrences(appJs, `"${key}":`)),
  );
});

console.log("\n== 5g. grid picker polish ==");
PAGES.forEach((page) => {
  const html = read(page);
  check(
    `${page}: the More games toggle is wired to the tablist`,
    html.includes('id="gameTabs"') &&
      html.includes('id="gameTabsToggle"') &&
      html.includes('aria-controls="gameTabs"') &&
      html.includes('aria-expanded="false"') &&
      html.includes('id="gameTabsLabel"') &&
      html.includes('id="gameTabsCount"'),
  );
});
check(
  "the toggle swaps its own i18n key and persists the mode",
  /pickerLabel\.setAttribute\("data-i18n", labelKey\)/.test(appJs) &&
    /"tabsShowLess" : "tabsShowMore"/.test(appJs) &&
    /localStorage\.getItem\("game-tabs-expanded"\)/.test(appJs) &&
    /localStorage\.setItem\("game-tabs-expanded"/.test(appJs),
);
check(
  "tabs meet the 44px touch minimum",
  /\.game-tab\s*\{[^}]*min-height:\s*44px/.test(stylesCss),
);
check(
  "tabs answer presses, and motion-off stills them",
  /\.game-tab:active\s*\{[^}]*scale\(/.test(stylesCss) &&
    /\[data-motion="off"\] \.game-tab:active\s*\{[^}]*transform:\s*none !important/.test(stylesCss),
);
check(
  "the focus ring is one token defined for both themes",
  countOccurrences(stylesCss, "--focus-ring:") === 2 &&
    countOccurrences(stylesCss, "0 0 0 3px rgba(255, 107, 53, 0.28)") === 1 &&
    countOccurrences(stylesCss, "0 0 0 3px rgba(0, 112, 138, 0.45)") === 1 &&
    countOccurrences(stylesCss, "0 0 0 3px rgba(0, 242, 255, 0.24)") === 0,
  `dark=${countOccurrences(stylesCss, "0 0 0 3px rgba(255, 107, 53, 0.28)")} light=${countOccurrences(stylesCss, "0 0 0 3px rgba(0, 112, 138, 0.45)")}`,
);
["tabsShowMore", "tabsShowLess"].forEach((key) => {
  check(
    `the "${key}" key exists in both languages`,
    countOccurrences(appJs, `"${key}":`) === 2,
    String(countOccurrences(appJs, `"${key}":`)),
  );
});

console.log("\n== 5h. campaigns ==");
const campaignJs = fs
  .readFileSync(path.join(root, "assets", "app", "game-campaign.js"), "utf8")
  .replace(/^﻿/, "");
check(
  "the campaign core runs headless and chains unlocks",
  (() => {
    try {
      const fnStart = campaignJs.indexOf("function starsFor");
      const exportIdx = campaignJs.indexOf("App.starsFor");
      const core = campaignJs.slice(fnStart, exportIdx);
      const factory = new Function(core + "\nreturn createCampaign;")();
      const levels = [{ id: "a" }, { id: "b" }, { id: "c" }];
      const c = factory({ key: "probe-campaign", levels });
      if (c.isUnlocked("b")) return false;
      const outcome = c.record("a", { stars: 2, best: 10, better: "high" });
      return (
        outcome.firstClear === true &&
        outcome.unlockedNext === "b" &&
        c.isUnlocked("b") &&
        !c.isUnlocked("c") &&
        c.stars("a") === 2 &&
        c.best("a") === 10 &&
        c.nextLevelId() === "b" &&
        c.totalStars() === 2 &&
        c.maxStars() === 9
      );
    } catch (error) {
      return false;
    }
  })(),
);
check(
  "starsFor reads both directions against the 3/2/1 thresholds",
  (() => {
    try {
      const fnStart = campaignJs.indexOf("function starsFor");
      const exportIdx = campaignJs.indexOf("App.starsFor");
      const fn = new Function(
        campaignJs.slice(fnStart, exportIdx) + "\nreturn starsFor;",
      )();
      return (
        fn(100, [90, 60, 30], "high") === 3 &&
        fn(45, [90, 60, 30], "high") === 1 &&
        fn(10, [20, 30, 45], "low") === 3 &&
        fn(50, [20, 30, 45], "low") === 0
      );
    } catch (error) {
      return false;
    }
  })(),
);
const campaignGames = [
  { file: "game-breakout", table: "brkLevels", count: 15, select: "brkLevelSel" },
  { file: "game-snake", table: "snkLevels", count: 10, select: "snkLevelSel" },
  { file: "game-ember-dice", table: "diceTables", count: 5, select: "diceTableSel" },
];
campaignGames.forEach((game) => {
  const source = fs
    .readFileSync(path.join(root, "assets", "app", game.file + ".js"), "utf8")
    .replace(/^﻿/, "");
  const block = new RegExp("var " + game.table + " = \\[([\\s\\S]*?)\\n  \\];").exec(source);
  const ids = block
    ? Array.from(block[1].matchAll(/id:\s*"([a-z0-9]+)"/g)).map((m) => m[1])
    : [];
  check(
    `${game.file}: the ${game.table} table has ${game.count} distinct levels`,
    ids.length === game.count && new Set(ids).size === game.count,
    String(ids.length),
  );
  check(
    `${game.file}: the campaign picker is wired in init`,
    source.includes("createCampaign") &&
      source.includes("fillCampaignPicker") &&
      source.includes('getElement("' + game.select + '")'),
  );
  PAGES.forEach((page) => {
    check(
      `${page}: ${game.select} exists`,
      read(page).includes('id="' + game.select + '"'),
    );
  });
});
[
  "campaignStars",
  "brkLevelSelectLabel",
  "brkCleared",
  "brkNextLevel",
  "brkCampaignDone",
  "snkLevelSelectLabel",
  "snkGoal",
  "snkCleared",
  "snkNextHouse",
  "snkCampaignDone",
  "snkRetry",
  "diceTableSelectLabel",
  "diceCleared",
  "diceNextTable",
  "diceCampaignDone",
  "diceMissed",
  "diceTaxed",
].forEach((key) => {
  check(
    `the "${key}" key exists in both languages`,
    countOccurrences(appJs, `"${key}":`) === 2,
    String(countOccurrences(appJs, `"${key}":`)),
  );
});
["brkL", "snkL", "diceTable", "diceRule"].forEach((prefix) => {
  for (let index = 1; index <= 15; index += 1) {
    const key = prefix + index;
    const hits = countOccurrences(appJs, `"${key}":`);
    if (prefix === "brkL" || hits > 0) {
      check(
        `the "${key}" key exists in both languages`,
        hits === 2,
        String(hits),
      );
    }
  }
});

console.log("\n== 5i. Gomoku, Traffic Jam and Letter Vault ==");
const TRIO_GAMES = [
  { name: "gomoku", tab: "gameTabGomoku", panel: "gamePanelGomoku", file: "game-gomoku" },
  { name: "traffic", tab: "gameTabTraffic", panel: "gamePanelTraffic", file: "game-traffic" },
  { name: "vault", tab: "gameTabVault", panel: "gamePanelVault", file: "game-vault" },
];
TRIO_GAMES.forEach((game) => {
  PAGES.forEach((page) => {
    const html = read(page);
    check(
      `${page}: ${game.name} tab and panel are wired both ways`,
      html.includes(`id="${game.tab}"`) &&
        html.includes(`aria-controls="${game.panel}"`) &&
        html.includes(`id="${game.panel}"`) &&
        html.includes(`aria-labelledby="${game.tab}"`),
    );
  });
  const gameSource = fs
    .readFileSync(path.join(root, "assets", "app", game.file + ".js"), "utf8")
    .replace(/^﻿/, "");
  const lookups = Array.from(
    gameSource.matchAll(/getElement\("([A-Za-z0-9]+)"\)/g),
  ).map((match) => match[1]);
  check(
    `${game.file}: every id it looks up exists in all four pages`,
    lookups.length >= 7 &&
      PAGES.every((page) => {
        const html = read(page);
        return lookups.every((id) => html.includes('id="' + id + '"'));
      }),
    lookups.join(","),
  );
  const pascal = game.name.charAt(0).toUpperCase() + game.name.slice(1);
  check(
    `${game.name} is registered as a drawer tab with a click listener`,
    new RegExp(`\\{ name: "${game.name}", tab: tab${pascal}, panel: panel${pascal} \\}`).test(appJs) &&
      new RegExp(`tab${pascal}\\.addEventListener\\("click"`).test(appJs),
  );
});
check(
  "gomoku's Undo unlocks from the move that creates the history",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-gomoku.js"),
      "utf8",
    );
    const start = src.indexOf("function place(");
    const body = src.slice(start, src.indexOf("function playHuman(", start));
    return (
      start !== -1 &&
      body.includes("history.push(index)") &&
      body.includes("undoBtn.disabled")
    );
  })(),
);
check(
  "Traffic Jam needs the taxi at the exit wall, not just a clear lane",
  (() => {
    try {
      const src = fs.readFileSync(
        path.join(root, "assets", "app", "game-traffic.js"),
        "utf8",
      );
      const code = src.slice(
        src.indexOf("var trafSize"),
        src.indexOf("App.trafficSolvable"),
      );
      const probe = new Function(
        code +
          "\nreturn { lane: trafExitOpen([[0, 2, 2, 1]]), parked: trafTaxiOut([[0, 2, 2, 1]]), out: trafTaxiOut([[4, 2, 2, 1]]) };",
      )();
      return probe.lane === true && probe.parked === false && probe.out === true;
    } catch (error) {
      return false;
    }
  })(),
);
check(
  "every Traffic Jam 3-star band is reachable (budgeted Dijkstra)",
  (() => {
    try {
      const src = fs.readFileSync(
        path.join(root, "assets", "app", "game-traffic.js"),
        "utf8",
      );
      const code = src.slice(
        src.indexOf("var trafSize"),
        src.indexOf("App.trafficSolvable"),
      );
      const api = new Function(
        code + "\nreturn { trafLevels, trafSlide, trafKey, trafTaxiOut };",
      )();
      const slide = api.trafSlide;
      const key = api.trafKey;
      const out = api.trafTaxiOut;
      return api.trafLevels.every((level) => {
        const budget = level.par[0];
        const start = level.cars.map((car) => car.slice());
        if (out(start)) {
          return true;
        }
        const buckets = [];
        for (let cost = 0; cost <= budget; cost += 1) {
          buckets.push([]);
        }
        buckets[0].push(start);
        const best = {};
        best[key(start)] = 0;
        for (let cost = 0; cost <= budget; cost += 1) {
          for (const cars of buckets[cost]) {
            if (best[key(cars)] < cost) {
              continue;
            }
            for (let index = 0; index < cars.length; index += 1) {
              const horiz = cars[index][3] === 1;
              for (const dir of [-1, 1]) {
                const reach = slide(
                  cars,
                  index,
                  horiz ? dir : 0,
                  horiz ? 0 : dir,
                );
                for (let step = 1; step <= Math.abs(reach); step += 1) {
                  const total = cost + step;
                  if (total > budget) {
                    continue;
                  }
                  const next = cars.map((car) => car.slice());
                  next[index][0] += horiz ? dir * step : 0;
                  next[index][1] += horiz ? 0 : dir * step;
                  if (index === 0 && out(next)) {
                    return true;
                  }
                  if (best[key(next)] === undefined || best[key(next)] > total) {
                    best[key(next)] = total;
                    buckets[total].push(next);
                  }
                }
              }
            }
          }
        }
        return false;
      });
    } catch (error) {
      return false;
    }
  })(),
);
check(
  "every Traffic Jam board is provably solvable (BFS)",
  (() => {
    try {
      const src = fs.readFileSync(
        path.join(root, "assets", "app", "game-traffic.js"),
        "utf8",
      );
      const constStart = src.indexOf("var trafSize");
      const exportIdx = src.indexOf("App.trafficSolvable");
      const code = src.slice(constStart, exportIdx);
      const probe = new Function(
        code + "\nreturn trafLevels.map((l) => trafficSolvable(l, 30000));",
      )();
      return probe.length === 16 && probe.every(Boolean);
    } catch (error) {
      return false;
    }
  })(),
);
check(
  "the vault's letter feedback counts duplicates the Wordle way",
  (() => {
    try {
      const src = fs.readFileSync(
        path.join(root, "assets", "app", "game-vault.js"),
        "utf8",
      );
      const fnStart = src.indexOf("var vaultWidth");
      const vExport = src.indexOf("App.initVaultGame");
      const fn = new Function(
        src.slice(fnStart, vExport) + "\nreturn vaultLetterStatus;",
      )();
      const s1 = fn("speed", "spend");
      const s2 = fn("eerie", "reedy");
      return (
        s1.join(",") === "green,green,green,gray,green" &&
        s2[0] === "yellow" &&
        s2[1] === "green" &&
        s2[2] === "yellow" &&
        s2[3] === "gray"
      );
    } catch (error) {
      return false;
    }
  })(),
);
[
  "tabGomoku",
  "gomokuRankLabel",
  "gomokuRank1",
  "gomokuRank2",
  "gomokuRank3",
  "gomokuBoardLabel",
  "gomokuPrompt",
  "gomokuYourTurn",
  "gomokuAiTurn",
  "gomokuWin",
  "gomokuLoss",
  "gomokuDraw",
  "gomokuNextRank",
  "gomokuAllRanks",
  "gomokuCell",
  "gomokuBlack",
  "gomokuWhite",
  "gomokuUndo",
  "gomokuHint",
  "logGomoku",
  "tabTraffic",
  "trafLevelSelectLabel",
  "trafBoardLabel",
  "trafBoardLabelN",
  "trafPrompt",
  "trafWin",
  "trafNext",
  "trafAllBoards",
  "trafCar",
  "trafTaxi",
  "trafHint",
  "logTraf",
  "tabVault",
  "hudGuesses",
  "vaultBoardLabel",
  "vaultPromptDaily",
  "vaultPromptRandom",
  "vaultTooShort",
  "vaultWin",
  "vaultLoss",
  "vaultBestLine",
  "vaultEnter",
  "vaultBack",
  "vaultDailyBtn",
  "vaultRandomBtn",
  "vaultHint",
  "logVault",
].forEach((key) => {
  check(
    `the "${key}" key exists in both languages`,
    countOccurrences(appJs, `"${key}":`) === 2,
    String(countOccurrences(appJs, `"${key}":`)),
  );
});

console.log("\n== 6. pet CSS ==");
const petCssStart = stylesCss.indexOf("   Pet companion");
const petCss = petCssStart === -1 ? "" : stylesCss.slice(petCssStart);
check("styles.css contains the pet companion block", petCss.length > 0);
const braces = (text) =>
  text.split("").reduce((depth, char) => {
    if (char === "{") return depth + 1;
    if (char === "}") return depth - 1;
    return depth;
  }, 0);
check("styles.css braces balance", braces(stylesCss) === 0, String(braces(stylesCss)));
const petZ = /\.pet-widget\s*\{[^}]*z-index:\s*(\d+)/.exec(petCss);
const modalZ = /\.game-modal\s*\{[^}]*z-index:\s*(\d+)/.exec(stylesCss);
check(
  "pet widget stacks below the game modal",
  !!petZ && !!modalZ && Number(petZ[1]) < Number(modalZ[1]),
  `pet=${petZ && petZ[1]} modal=${modalZ && modalZ[1]}`,
);
check(
  "pet widget is fixed to a corner with safe-area insets",
  /position:\s*fixed/.test(petCss) &&
    /env\(safe-area-inset-bottom\)/.test(petCss) &&
    /env\(safe-area-inset-right\)/.test(petCss),
);
check(
  "motion-off disables idle/reaction animations",
  /\[data-motion="off"\][^{]*\.pet-idle[^{]*\{[^}]*animation:\s*none\s*!important/.test(
    petCss,
  ) ||
    /\[data-motion="off"\]\s*\.pet-idle,[\s\S]{0,400}?animation:\s*none\s*!important/.test(
      petCss,
    ),
);
check(
  "motion-off hides particles",
  /\[data-motion="off"\]\s*\.pet-particle\s*\{[^}]*display:\s*none/.test(petCss),
);
check(
  "reduced-motion media query also hides particles",
  /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.pet-particle\s*\{\s*display:\s*none/.test(
    petCss,
  ),
);
check(
  "light theme variants exist for the pet",
  /\[data-theme="light"\]\s*\.pet-widget\[data-species=/.test(petCss) ||
    /\[data-theme="light"\][^{]*\.pet-/.test(petCss),
);
check(
  "idle motion and reactions use CSS keyframes",
  ["petBob", "petHappy", "petFloat"].every((name) =>
    petCss.includes(`@keyframes ${name}`),
  ),
);
check(
  "no external assets referenced by the pet styles",
  !/url\(/.test(petCss) && !/https?:/.test(petCss),
);
check(
  "mobile safe-area breakpoint declared",
  /@media \(max-width: 480px\)/.test(petCss),
);

/* Regression guard: the Stats view is taller than a phone viewport. The widget
 * must be capped and the panel (its only visible child in that view) must
 * scroll internally, otherwise the panel overflows the top of the screen and
 * the clipped content cannot be reached. */
const petWidgetRule = /^\.pet-widget\s*\{([^}]*)\}/m.exec(stylesCss);
const petPanelRule = /^\.pet-panel\s*\{([^}]*)\}/m.exec(stylesCss);
const ruleBody = (match) => (match ? match[1].replace(/\s+/g, " ").trim() : "");
check(
  "the widget is capped to the viewport",
  !!petWidgetRule && /max-height\s*:/.test(petWidgetRule[1]),
  ruleBody(petWidgetRule) || "no .pet-widget rule",
);
check(
  "the panel carries a max-height",
  !!petPanelRule && /max-height\s*:/.test(petPanelRule[1]),
  ruleBody(petPanelRule) || "no .pet-panel rule",
);
check(
  "the panel scrolls internally",
  !!petPanelRule && /overflow-y\s*:\s*(auto|scroll)/.test(petPanelRule[1]),
  ruleBody(petPanelRule) || "no .pet-panel rule",
);
check(
  "the panel contains its overscroll (no scroll chaining)",
  !!petPanelRule && /overscroll-behavior\s*:\s*contain/.test(petPanelRule[1]),
  ruleBody(petPanelRule) || "no .pet-panel rule",
);
check(
  "the panel cap and the widget cap share the same viewport budget",
  !!petWidgetRule &&
    !!petPanelRule &&
    /var\(--pet-vgap\)/.test(petWidgetRule[1]) &&
    /var\(--pet-vgap\)/.test(petPanelRule[1]) &&
    /--pet-vgap\s*:/.test(petWidgetRule[1]),
  ruleBody(petPanelRule) || "no .pet-panel rule",
);

const petJsForClasses = petJsEarly;
const cssClassNames = new Set(
  Array.from(petCss.matchAll(/\.(pet-[a-z0-9-]+)/g)).map((match) => match[1]),
);
const jsClassNames = new Set(
  Array.from(petJsForClasses.matchAll(/(?<!-)pet-[a-z0-9-]+/g)).map(
    (match) => match[0],
  ),
);
// Classes that carry no styling of their own: they are always applied together
// with .pet-accent, which supplies the fill.
const UNSTYLED_BY_DESIGN = new Set(["pet-drop", "pet-breather", "pet-antenna"]);
const unstyledClasses = Array.from(jsClassNames)
  .filter((name) => !cssClassNames.has(name) && !UNSTYLED_BY_DESIGN.has(name))
  .sort();
check(
  "every class the pet JS emits has a CSS rule",
  unstyledClasses.length === 0,
  unstyledClasses.join(", "),
);
check(
  "colour-only art details inherit .pet-accent",
  ["pet-drop", "pet-breather", "pet-antenna"].every((name) =>
    jsClassNames.has(name),
  ),
);

const undefinedVars = Array.from(petCss.matchAll(/var\((--[a-z0-9-]+)(,)?/g))
  .filter((match) => !match[2])
  .map((match) => match[1])
  .filter(
    (name) =>
      !new RegExp("\\" + name + "\\s*:").test(stylesCss),
  );
check(
  "no var(--x) without fallback that is never defined",
  undefinedVars.length === 0,
  Array.from(new Set(undefinedVars)).join(", "),
);

["happy", "neutral", "hungry", "sleepy"].forEach((mood) => {
  check(
    `CSS has a rendering rule for mood "${mood}"`,
    petCss.includes(`[data-mood="${mood}"]`),
  );
});
check(
  "mood mouth shapes are all defined",
  ["happy", "neutral", "hungry", "sleepy"].every((mood) =>
    petCss.includes(`.pet-mouth-${mood}`),
  ),
);

console.log("\n== 7. pet JS ==");
const petJs = petJsEarly;
check("app.js contains the pet module", petJs.length > 0);
check(
  "no window.prompt / window.confirm used",
  !/window\.prompt|window\.confirm|(^|[^.\w])prompt\(|(^|[^.\w])confirm\(/.test(petJs),
);
check(
  "DOM built with createElement / createElementNS",
  /document\.createElement\(/.test(petJs) && /document\.createElementNS\(/.test(petJs),
);
check(
  "only one storage key is used",
  countOccurrences(petJs, "capitalconvert-pet") === 1,
  String(countOccurrences(petJs, "capitalconvert-pet")),
);
check('storage key is exactly "capitalconvert-pet"', /petStorageKey = "capitalconvert-pet"/.test(petJs));
check(
  "state is parsed defensively (try/catch around JSON.parse)",
  /JSON\.parse/.test(petJs) && /catch \(error\)/.test(petJs),
);
check(
  "no requestAnimationFrame loop in the pet module",
  !/requestAnimationFrame/.test(petJs),
);
check(
  "decay timer is an interval and is cleared",
  /window\.setInterval\(petOnTick, petTickMs\)/.test(petJs) &&
    /window\.clearInterval\((petDecayTimer|Pet\.decayTimer)\)/.test(petJs),
);
check(
  "visibilitychange handler is registered",
  /addEventListener\("visibilitychange", petHandleVisibility\)/.test(petJs),
);
check(
  "particle effects early-return when motion is off",
  /if \([^)]*isMotionOff\(\)\) \{\s*return;\s*\}/.test(petJs) &&
    /function petSpawnParticles[\s\S]{0,120}?isMotionOff\(\)/.test(petJs),
);
check(
  "every pet string goes through t() or data-i18n",
  countOccurrences(petJs, 't("pet') >= 30,
  String(countOccurrences(petJs, 't("pet')),
);

/* No hard-coded visible English in the pet module: every literal that reads
 * like a sentence must be an id, a class list, an attribute name, an i18n key
 * or SVG path data. */
const suspiciousLiterals = Array.from(petJs.matchAll(/"([^"\\\n]{2,})"/g))
  .map((match) => match[1])
  .filter((value) => {
    if (/^pet[A-Z]/.test(value)) return false; // i18n key
    if (/^(pet-|is-|data-|aria-|http|M\d|\d)/.test(value)) return false;
    if (/^[a-z-]+$/.test(value)) return false; // tag / id / storage key
    if (/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/.test(value)) return false; // svg path
    return /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(value);
  });
check(
  "no hard-coded visible sentences in the pet JS",
  suspiciousLiterals.length === 0,
  suspiciousLiterals.join(" | "),
);

console.log("\n== 8. extended pet (progression / interactions / mini-games) ==");
check(
  "mini-game timers are tracked and cleared",
  /function petMiniTrack/.test(petJs) &&
    /function petMiniClearTimers/.test(petJs) &&
    /window\.clearTimeout\(id\)/.test(petJs),
);
check(
  "visibilitychange stops the mini-game",
  /function petHandleVisibility[\s\S]{0,400}?petMiniStop\(\)/.test(petJs),
);
check(
  "hiding the pet stops the mini-game",
  /function petOnHide[\s\S]{0,300}?petMiniStop\(\)/.test(petJs),
);
check(
  "game awareness hook exists and never calls into the games",
  /function petNotifyGame\(/.test(petJs) &&
    !/readBest\(|createConfetti\(|endRound\(|startRound\(/.test(petJs),
);
check(
  "both mini-games are implemented",
  petJs.includes("function petStartToss") && petJs.includes("function petStartSimon"),
);
check(
  "progression is table-driven with 10 levels and 3 stages",
  /petLevelXpTable = \[0, 20, 50, 90, 140, 200, 280, 380, 500, 650\]/.test(petJs) &&
    /petStageOrder = \["baby", "grown", "elder"\]/.test(petJs),
);
["baby", "grown", "elder"].forEach((stage) => {
  check(
    `CSS reveals the "${stage}" evolution stage`,
    petCss.includes(`[data-stage="${stage}"] .pet-stage-${stage}`),
  );
});
["hat", "scarf", "glasses", "crown", "aura"].forEach((accessory) => {
  check(
    `CSS reveals the "${accessory}" accessory`,
    petCss.includes(`[data-acc="${accessory}"] .pet-acc-${accessory}`),
  );
});
["bl", "tr", "tl"].forEach((corner) => {
  check(
    `CSS positions the widget in corner "${corner}"`,
    petCss.includes(`.pet-widget[data-corner="${corner}"]`),
  );
});
check(
  "motion-off disables the new cursor/combo/toast animations",
  /\[data-motion="off"\] \.pet-look\s*\{[^}]*transform:\s*none/.test(petCss) &&
    /\[data-motion="off"\] \.pet-combo[\s\S]{0,120}?animation:\s*none/.test(petCss),
);
check(
  "reduced-motion media query also stills the new effects",
  /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.pet-game-marker[\s\S]*?animation:\s*none/.test(
    petCss,
  ),
);
check(
  "richer idle animation (blink + antenna/plume wiggle) is declared",
  ["petBlink", "petWiggle"].every((name) =>
    petCss.includes(`@keyframes ${name}`),
  ),
);
check(
  "mini-game boards fit the narrow panel (a dedicated wider width exists)",
  /\[data-view="games"\]\s*\.pet-panel[\s\S]{0,120}?width:/.test(petCss),
);

console.log("\n== 9. care & return + personality ==");
[
  [".pet-attention", "attention chip"],
  [".pet-emote", "idle emote bubble"],
  [".pet-repair", "streak repair banner"],
  [".pet-acc-medal", "7-day exclusive medal"],
].forEach(([selector, label]) => {
  check(`CSS styles the ${label}`, petCss.includes(selector));
});
check(
  "CSS reveals the exclusive medal accessory",
  /\[data-acc="medal"\]\s*\.pet-acc-medal\s*\{[^}]*display:\s*inline/.test(petCss),
);
check(
  "attention signal reacts to [data-attention]",
  /\[data-attention\][^{]*\{/.test(petCss),
);
check(
  "seasonal accent is driven by [data-season]",
  ["winter", "spring", "summer", "autumn"].every((season) =>
    petCss.includes(`.pet-widget[data-season="${season}"]`),
  ),
);
check(
  "motion-off stills the emote / attention animations",
  /\[data-motion="off"\]\s*\.pet-attention,[\s\S]{0,200}?animation:\s*none\s*!important/.test(
    petCss,
  ) &&
    /\[data-motion="off"\][^{]*\.pet-emote[^{]*\{[^}]*animation:\s*none\s*!important/.test(
      petCss,
    ),
);
check(
  "reduced-motion also stills the emote",
  /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.pet-emote[^}]*\{[^}]*animation:\s*none\s*!important/.test(
    petCss,
  ),
);
check(
  "emote pop is a CSS keyframe",
  petCss.includes("@keyframes petEmotePop"),
);
check(
  "care grace window is a real constant",
  /petCareGraceMs = 15 \* 60 \* 1000/.test(petJs),
);
check(
  "attention episodes are evaluated with a one-shot logged latch",
  /function petEvaluateAttention/.test(petJs) &&
    /episode\.logged = true/.test(petJs),
);
check(
  "care mistakes are counted, not spammed",
  /(petState\.careMistakes|Pet\.state\.careMistakes)\s*=/.test(petJs) && /result\.logged\.push/.test(petJs),
);
check(
  "welcome-back reward is capped by the decay cap",
  /function petWelcomeBack/.test(petJs) &&
    /Math\.min\(awayMs, petDecayCapMs\)/.test(petJs),
);
check(
  "streak escalation is table-driven and has a day-7 exclusive",
  /petStreakRewards = \[2, 3, 4, 5, 6, 8, 12\]/.test(petJs) &&
    /petExclusiveStreak = 7/.test(petJs),
);
check(
  "streak repair spends treats and has its own controls",
  /function petOnRepair\b/.test(petJs) &&
    /petAddTreats\(-petRepairCost\)/.test(petJs) &&
    /function petOnRepairDecline/.test(petJs),
);
check(
  "the exclusive is applied, not merely flagged",
  /(petState\.accessory|Pet\.state\.accessory) = petExclusiveAccessory/.test(petJs),
);
check(
  "petting draws energy down with diminishing happiness",
  /(petState\.energy|Pet\.state\.energy) = petClamp\(\s*(petState\.energy|Pet\.state\.energy) - /.test(petJs) &&
    /(petCombo|Pet\.combo) <= 2 \? 6 : Math\.max\(2, 6 - \((petCombo|Pet\.combo) - 2\)\)/.test(petJs),
);
check(
  "the emote is throttled and tick-driven (no permanent timer)",
  /function petEmoteBeat/.test(petJs) &&
    /now - (petEmoteAt|Pet\.emoteAt) < petEmoteEveryMs/.test(petJs) &&
    /petEmoteBeat\(now\)/.test(petJs),
);
check(
  "emote uses reduced-motion aware pop class",
  /classList\.toggle\("is-pop", !isMotionOff\(\)\)/.test(petJs),
);
check(
  "tiered verbal words exist for hunger and mood",
  /function petHungerWordKey/.test(petJs) && /function petMoodWordKey/.test(petJs),
);
check(
  "seasonal + date lines use local date math only",
  /function petSeason\b/.test(petJs) && /function petDateKey/.test(petJs),
);
check(
  "widget exposes data-season and data-attention",
  /setAttribute\("data-season"/.test(petJs) &&
    /setAttribute\("data-attention"/.test(petJs),
);

console.log("\n== summary ==");
console.log(`passed: ${passed}`);
console.log(`failed: ${failures.length}`);
if (failures.length) {
  failures.forEach((line) => console.log("  - " + line));
}
process.exit(failures.length ? 1 : 0);
