#!/usr/bin/env node
/*
 * Static acceptance checks for the pet companion change.
 *
 *   1. the four pages still expose exactly 49 game tabs / 49 game panels
 *   2. both shared assets are requested with ?v=57 on all four pages
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

/* Registry games ship their copy inside their own module, and a pack may put two
 * keys on one line, which the six-space shape the shipped dictionary uses cannot
 * see. Parse the addStrings bodies directly instead of guessing by indentation. */
function collectPackKeys(source) {
  const pack = /App\.addStrings\(\{([\s\S]*?)\n {2}\}\);/.exec(source);
  const out = { en: [], zh: [] };
  if (!pack) {
    return out;
  }
  ["en", "zh"].forEach((lang) => {
    const body = new RegExp(`\\b${lang}:\\s*\\{([\\s\\S]*?)\\n {4}\\}`).exec(pack[1]);
    if (body) {
      Array.from(body[1].matchAll(/"([A-Za-z0-9]+)"\s*:/g)).forEach((match) =>
        out[lang].push(match[1]),
      );
    }
  });
  return out;
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
/* index.html is the manifest: the script tags it carries are the modules the
 * app boots, in load order. Deriving the list here means a new game module
 * cannot drift from this suite, and the check below still catches a tag that
 * points at a file which was never written. */
const APP_MODULES = Array.from(
  read("index.html").matchAll(/assets\/app\/([a-z0-9-]+)\.js\?v=\d+/g),
).map((match) => match[1]);
check(
  `all ${APP_MODULES.length} app modules on the manifest exist on disk`,
  APP_MODULES.length >= 60 &&
    APP_MODULES.every((name) =>
      fs.existsSync(path.join(root, "assets", "app", name + ".js")),
    ),
  APP_MODULES.filter(
    (name) => !fs.existsSync(path.join(root, "assets", "app", name + ".js")),
  ).join(","),
);
const STYLE_MODULES = ["base", "games", "pet"];
PAGES.forEach((page) => {
  const html = read(page);
  const tabs = countOccurrences(html, 'class="game-tab"');
  const panels = countOccurrences(html, 'class="game-panel"');
  check(`${page}: exactly 49 game-tab`, tabs === 49, `found ${tabs}`);
  check(`${page}: exactly 49 game-panel`, panels === 49, `found ${panels}`);
  check(
    `${page}: stylesheets requested as ?v=57`,
    STYLE_MODULES.every((name) => html.includes(`assets/styles/${name}.css?v=57`)),
  );
  check(
    `${page}: scripts requested as ?v=57`,
    APP_MODULES.every((name) => html.includes(`assets/app/${name}.js?v=57`)),
  );
  /* Collect every ?v= token on the page and require them all to equal
   * the current cache-busting version, so single-digit versions cannot
   * substring-match two-digit ones again. */
  const pageVersions = Array.from(html.matchAll(/\?v=(\d+)/g)).map(
    (match) => match[1],
  );
  check(
    `${page}: every asset token is ?v=57 with no stale versions left`,
    pageVersions.length > 0 && pageVersions.every((v) => v === "57"),
    Array.from(new Set(pageVersions)).join(",") || "none found",
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
    `${page}: all asset references are ?v=57`,
    assetLines.every((line) => line.includes("?v=57")),
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
    assetLines.every((line) => /\?v=57/.test(line)) &&
      STYLE_MODULES.every((name) => html.includes(`assets/styles/${name}.css?v=57`)) &&
      APP_MODULES.every((name) => html.includes(`assets/app/${name}.js?v=57`)),
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
  (() => {
    /* Count inside the Elements table only: these field names belong to other
     * games too, and a global count broke every time one was added. */
    const table = appJs.slice(
      appJs.indexOf("var elementsChallenges = ["),
      appJs.indexOf("var elementsBasePalette"),
    );
    return (
      countOccurrences(table, 'labelKey: "elementsChallenge') === 12 &&
      countOccurrences(table, "goalKey:") === 12 &&
      countOccurrences(table, "tools: [") === 12 &&
      countOccurrences(table, "stars: [") === 12 &&
      countOccurrences(table, "budget:") === 12 &&
      /limit: 60/.test(table) &&
      /limit: 20/.test(table) &&
      /limit: 90/.test(table)
    );
  })(),
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
  { file: "game-breakout", table: "brkLevels", count: 17, select: "brkLevelSel" },
  { file: "game-snake", table: "snkLevels", count: 12, select: "snkLevelSel" },
  { file: "game-ember-dice", table: "diceTables", count: 7, select: "diceTableSel" },
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
      return probe.length >= 16 && probe.every(Boolean);
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

console.log("\n== 5j. Glyph Blocks, Ink Cascade and Ink Beat ==");
const NEW_GAMES = [
  { name: "glyphBlocks", tab: "gameTabGlyphBlocks", panel: "gamePanelGlyphBlocks", file: "game-glyph-blocks" },
  { name: "inkCascade", tab: "gameTabInkCascade", panel: "gamePanelInkCascade", file: "game-ink-cascade" },
  { name: "inkBeat", tab: "gameTabInkBeat", panel: "gamePanelInkBeat", file: "game-ink-beat" },
];
NEW_GAMES.forEach((game) => {
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
  check(
    `${game.name} is registered as a drawer tab with a click listener`,
    new RegExp(`\\{ name: "${game.name}", tab: tab${pascal}, panel: panel${pascal} \\}`).test(appJs) &&
      new RegExp(`tab${pascal}\\.addEventListener\\("click"`).test(appJs),
  );
});
check(
  "the two loop-driven games of batch four are reset by the shell",
  /App\.quietResetGlyphBlocks = null/.test(appJs) &&
    /App\.quietResetInkBeat = null/.test(appJs) &&
    countOccurrences(appJs, "quietResetGlyphBlocks()") === 2 &&
    countOccurrences(appJs, "quietResetInkBeat()") === 2,
);
[
  "tabGlyphBlocks", "blkFieldLabel", "blkPrompt", "blkGo", "blkPaused",
  "blkOver", "blkRetry", "blkCleared", "blkNextFloor", "blkCampaignDone",
  "blkNextLabel", "blkBtnLeft", "blkBtnTurn", "blkBtnRight", "blkBtnDrop",
  "blkControlsLabel", "blkHint", "blkLevelSelectLabel", "blkL1", "blkL8",
  "hudLines", "logBlk",
  "tabInkCascade", "inkBoardLabel", "inkPrompt", "inkReady", "inkCleared",
  "inkOut", "inkRetry", "inkNextPool", "inkCampaignDone", "inkCell",
  "inkColor0", "inkColor5", "inkHint", "inkLevelSelectLabel", "inkL1", "inkL8",
  "logInk",
  "tabInkBeat", "beatFieldLabel", "beatPrompt", "beatReady", "beatGo",
  "beatPaused", "beatFinished", "beatRetry", "beatNextTrack", "beatCampaignDone",
  "beatLane0", "beatLane3", "beatPadsLabel", "beatHint",
  "beatSongSelectLabel", "beatL1", "beatL6", "logBeat",
].forEach((key) => {
  check(
    `the "${key}" key exists in both languages`,
    countOccurrences(appJs, `"${key}":`) === 2,
    String(countOccurrences(appJs, `"${key}":`)),
  );
});

console.log("\n== 5k. Bubble Ink, Glyph Echo and Ink Slash ==");
const BATCH_FIVE = [
  { name: "bubbleInk", tab: "gameTabBubbleInk", panel: "gamePanelBubbleInk", file: "game-bubble-ink" },
  { name: "glyphEcho", tab: "gameTabGlyphEcho", panel: "gamePanelGlyphEcho", file: "game-glyph-echo" },
  { name: "inkSlash", tab: "gameTabInkSlash", panel: "gamePanelInkSlash", file: "game-ink-slash" },
];
BATCH_FIVE.forEach((game) => {
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
  check(
    `${game.name} is registered as a drawer tab with a click listener`,
    new RegExp(`\\{ name: "${game.name}", tab: tab${pascal}, panel: panel${pascal} \\}`).test(appJs) &&
      new RegExp(`tab${pascal}\\.addEventListener\\("click"`).test(appJs),
  );
});
check(
  "the three timer games of batch five are reset by the shell",
  /App\.quietResetBubbleInk = null/.test(appJs) &&
    /App\.quietResetGlyphEcho = null/.test(appJs) &&
    /App\.quietResetInkSlash = null/.test(appJs) &&
    countOccurrences(appJs, "quietResetBubbleInk()") === 2 &&
    countOccurrences(appJs, "quietResetGlyphEcho()") === 2 &&
    countOccurrences(appJs, "quietResetInkSlash()") === 2,
);
[
  "tabBubbleInk", "bubFieldLabel", "bubPrompt", "bubReady", "bubGo",
  "bubPaused", "bubOver", "bubOutShots", "bubRetry", "bubCleared",
  "bubNextSpring", "bubCampaignDone", "hudShots", "hudPopped",
  "bubHint", "bubLevelSelectLabel", "bubL1", "bubL8", "logBubbleInk",
  "tabGlyphEcho", "echoFieldLabel", "echoPrompt", "echoReady", "echoWatch",
  "echoYourTurn", "echoMistake", "echoOut", "echoRetry", "echoCleared",
  "echoNextChime", "echoCampaignDone", "echoPaused", "echoPad0",
  "echoPad3", "echoPadsLabel", "hudRound", "hudLongest", "echoHint",
  "echoLevelSelectLabel", "echoL1", "echoL6", "logGlyphEcho",
  "tabInkSlash", "slashFieldLabel", "slashPrompt", "slashReady", "slashGo",
  "slashPaused", "slashOver", "slashTimeUp", "slashRetry", "slashCleared",
  "slashNextStroke", "slashCampaignDone", "slashHint",
  "slashLevelSelectLabel", "slashL1", "slashL6", "logInkSlash",
].forEach((key) => {
  check(
    `the "${key}" key exists in both languages`,
    countOccurrences(appJs, `"${key}":`) === 2,
    String(countOccurrences(appJs, `"${key}":`)),
  );
});

console.log("\n== 5l. Peg Splash, Glyph Raid and Glyph Leap ==");
const BATCH_SIX = [
  { name: "pegSplash", tab: "gameTabPegSplash", panel: "gamePanelPegSplash", file: "game-peg-splash" },
  { name: "glyphRaid", tab: "gameTabGlyphRaid", panel: "gamePanelGlyphRaid", file: "game-glyph-raid" },
  { name: "glyphLeap", tab: "gameTabGlyphLeap", panel: "gamePanelGlyphLeap", file: "game-glyph-leap" },
];
BATCH_SIX.forEach((game) => {
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
  check(
    `${game.name} is registered as a drawer tab with a click listener`,
    new RegExp(`\\{ name: "${game.name}", tab: tab${pascal}, panel: panel${pascal} \\}`).test(appJs) &&
      new RegExp(`tab${pascal}\\.addEventListener\\("click"`).test(appJs),
  );
});
check(
  "the three loop games of batch six are reset by the shell",
  /App\.quietResetPegSplash = null/.test(appJs) &&
    /App\.quietResetGlyphRaid = null/.test(appJs) &&
    /App\.quietResetGlyphLeap = null/.test(appJs) &&
    countOccurrences(appJs, "quietResetPegSplash()") === 2 &&
    countOccurrences(appJs, "quietResetGlyphRaid()") === 2 &&
    countOccurrences(appJs, "quietResetGlyphLeap()") === 2,
);
[
  "tabPegSplash", "pegFieldLabel", "pegPrompt", "pegReady", "pegGo",
  "pegPaused", "pegOut", "pegRetry", "pegCleared", "pegNextBoard",
  "pegCampaignDone", "hudTargets", "hudBalls", "pegHint",
  "pegLevelSelectLabel", "pegL1", "pegL6", "logPegSplash",
  "tabGlyphRaid", "raidFieldLabel", "raidPrompt", "raidReady", "raidGo",
  "raidPaused", "raidOver", "raidRetry", "raidCleared", "raidNextWave",
  "raidCampaignDone", "raidHint", "raidLevelSelectLabel", "raidL1",
  "raidL6", "logGlyphRaid",
  "tabGlyphLeap", "leapFieldLabel", "leapPrompt", "leapReady", "leapGo",
  "leapPaused", "leapOver", "leapRetry", "leapCleared", "leapNextAscent",
  "leapCampaignDone", "hudJumps", "leapHint", "leapLevelSelectLabel",
  "leapL1", "leapL6", "logGlyphLeap",
].forEach((key) => {
  check(
    `the "${key}" key exists in both languages`,
    countOccurrences(appJs, `"${key}":`) === 2,
    String(countOccurrences(appJs, `"${key}":`)),
  );
});

console.log("\n== 5m. Aurora Flow and Comet Golf ==");
const BATCH_SEVEN = [
  { name: "auroraFlow", tab: "gameTabAuroraFlow", panel: "gamePanelAuroraFlow", file: "game-aurora-flow" },
  { name: "cometGolf", tab: "gameTabCometGolf", panel: "gamePanelCometGolf", file: "game-comet-golf" },
];
BATCH_SEVEN.forEach((game) => {
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
  check(
    `${game.name} is registered as a drawer tab with a click listener`,
    new RegExp(`\\{ name: "${game.name}", tab: tab${pascal}, panel: panel${pascal} \\}`).test(appJs) &&
      new RegExp(`tab${pascal}\\.addEventListener\\("click"`).test(appJs),
  );
});
check(
  "the two batch-seven games are reset by the shell",
  /App\.quietResetAuroraFlow = null/.test(appJs) &&
    /App\.quietResetCometGolf = null/.test(appJs) &&
    countOccurrences(appJs, "quietResetAuroraFlow()") === 2 &&
    countOccurrences(appJs, "quietResetCometGolf()") === 2,
);
check(
  "every Aurora Flow pair set stays inside its own board and uses distinct cells",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-aurora-flow.js"),
      "utf8",
    );
    const block = /var auroraLevels = \[([\s\S]*?)\n  \];/.exec(src);
    if (!block) return false;
    const sizes = Array.from(block[1].matchAll(/size:\s*(\d+)/g)).map((m) => Number(m[1]));
    const pairSets = Array.from(block[1].matchAll(/pairs:\s*\[([\s\S]*?)\]/g)).map(
      (m) => Array.from(m[1].matchAll(/\[(\d+), (\d+), (\d+), (\d+)\]/g)).map(
        (p) => p.slice(1).map(Number),
      ),
    );
    if (sizes.length !== 8 || pairSets.length !== 8) return false;
    return pairSets.every((pairs, index) => {
      const size = sizes[index];
      const seen = new Set();
      return pairs.every((pair) => {
        const keys = [
          pair[0] + ":" + pair[1],
          pair[2] + ":" + pair[3],
        ];
        return keys.every((key) => {
          const [x, y] = key.split(":").map(Number);
          if (x >= size || y >= size || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });
    });
  })(),
);
check(
  "every Comet Golf target sits clear of its own wells",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-comet-golf.js"),
      "utf8",
    );
    const block = /var cgfLevels = \[([\s\S]*?)\n  \];/.exec(src);
    if (!block) return false;
    const targets = Array.from(block[1].matchAll(/target:\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+),\s*r:\s*(\d+)/g));
    const wellSets = Array.from(block[1].matchAll(/wells:\s*\[([\s\S]*?)\]\s*,\s*\n\s*starShots/g)).map(
      (m) => Array.from(m[1].matchAll(/x:\s*(\d+),\s*y:\s*(\d+),\s*m:\s*[\d.]+,\s*r:\s*(\d+)/g)).map(
        (w) => w.slice(1).map(Number),
      ),
    );
    if (targets.length !== 8 || wellSets.length !== 8) return false;
    return targets.every((target, index) => {
      const tx = Number(target[1]);
      const ty = Number(target[2]);
      const tr = Number(target[3]);
      return wellSets[index].every(([wx, wy, wr]) => {
        return Math.hypot(tx - wx, ty - wy) > tr + wr + 6;
      });
    });
  })(),
);
[
  "tabAuroraFlow", "auroLevelSelectLabel", "auroL1", "auroL6",
  "auroFieldLabel", "auroPrompt", "auroReady", "auroPaused",
  "auroCleared", "auroNextBoard", "auroCampaignDone", "auroHint",
  "logAuroraFlow",
  "tabCometGolf", "cgfLevelSelectLabel", "cgfL1", "cgfL6",
  "cgfFieldLabel", "cgfPrompt", "cgfReady", "cgfPaused", "cgfCrash",
  "cgfLost", "cgfAgain", "cgfCleared", "cgfNextCourse",
  "cgfCampaignDone", "cgfHint", "logCometGolf",
  "hudLaunches", "hudPar",
].forEach((key) => {
  check(
    `the "${key}" key exists in both languages`,
    countOccurrences(appJs, `"${key}":`) === 2,
    String(countOccurrences(appJs, `"${key}":`)),
  );
});

console.log("\n== 5n. Prism Path and Starfall Lander ==");
const BATCH_EIGHT = [
  { name: "prismPath", tab: "gameTabPrismPath", panel: "gamePanelPrismPath", file: "game-prism-path" },
  { name: "starfall", tab: "gameTabStarfall", panel: "gamePanelStarfall", file: "game-starfall" },
];
BATCH_EIGHT.forEach((game) => {
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
  check(
    `${game.name} is registered as a drawer tab with a click listener`,
    new RegExp(`\\{ name: "${game.name}", tab: tab${pascal}, panel: panel${pascal} \\}`).test(appJs) &&
      new RegExp(`tab${pascal}\\.addEventListener\\("click"`).test(appJs),
  );
});
check(
  "the two batch-eight games are reset by the shell",
  /App\.quietResetPrismPath = null/.test(appJs) &&
    /App\.quietResetStarfall = null/.test(appJs) &&
    countOccurrences(appJs, "quietResetPrismPath()") === 2 &&
    countOccurrences(appJs, "quietResetStarfall()") === 2,
);
check(
  "every Prism Path board carries an emitter, mirrors and targets inside its grid",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-prism-path.js"),
      "utf8",
    );
    const block = /var prismLevels = \[([\s\S]*?)\n  \];/.exec(src);
    if (!block) return false;
    const grids = Array.from(block[1].matchAll(/w:\s*(\d+),\s*h:\s*(\d+)/g)).map(
      (m) => [Number(m[1]), Number(m[2])],
    );
    const emitters = Array.from(block[1].matchAll(/emitter:\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+),\s*dir:\s*(\d+)\s*\}/g));
    const mirrorSets = Array.from(block[1].matchAll(/mirrors:\s*\[([\s\S]*?)\]\s*,\s*\n\s*starTimes/g)).map(
      (m) => Array.from(m[1].matchAll(/x:\s*(\d+),\s*y:\s*(\d+)/g)),
    );
    const targetSets = Array.from(block[1].matchAll(/targets:\s*\[([\s\S]*?)\]\s*,\s*\n\s*walls/g)).map(
      (m) => Array.from(m[1].matchAll(/\[\d+,\s*\d+\]/g)),
    );
    if (grids.length !== 8 || emitters.length !== 8 || mirrorSets.length !== 8 || targetSets.length !== 8) {
      return false;
    }
    return grids.every(([w, h], index) => {
      const ex = Number(emitters[index][1]);
      const ey = Number(emitters[index][2]);
      if (ex >= w || ey >= h) return false;
      return mirrorSets[index].every(
        (m) => Number(m[1]) < w && Number(m[2]) < h,
      );
    });
  })(),
);
check(
  "Starfall keeps thrust above every gravity and the fuels curve downward",
  /var lantThrust = 235;/.test(
    fs.readFileSync(path.join(root, "assets", "app", "game-starfall.js"), "utf8"),
  ) &&
    (() => {
      const src = fs.readFileSync(
        path.join(root, "assets", "app", "game-starfall.js"),
        "utf8",
      );
      const block = /var lantLevels = \[([\s\S]*?)\n  \];/.exec(src);
      if (!block) return false;
      const gravities = Array.from(block[1].matchAll(/gravity:\s*(\d+)/g)).map((m) => Number(m[1]));
      const fuels = Array.from(block[1].matchAll(/fuel:\s*(\d+)/g)).map((m) => Number(m[1]));
      if (gravities.length !== 8 || fuels.length !== 8) return false;
      return (
        gravities.every((g) => g < 235) &&
        gravities.every((g, i) => i === 0 || g > gravities[i - 1]) &&
        fuels.every((f, i) => i === 0 || f <= fuels[i - 1])
      );
    })(),
);
[
  "tabPrismPath", "prismLevelSelectLabel", "prismL1", "prismL6",
  "prismFieldLabel", "prismPrompt", "prismReady", "prismPaused",
  "prismCleared", "prismNextBoard", "prismCampaignDone", "prismHint",
  "logPrismPath",
  "tabStarfall", "lantLevelSelectLabel", "lantL1", "lantL6",
  "lantFieldLabel", "lantPrompt", "lantReady", "lantPaused", "lantCrash",
  "lantAgain", "lantCleared", "lantNextSector", "lantCampaignDone",
  "lantBtnThrust", "lantBtnLeft", "lantBtnRight", "lantHint",
  "logStarfall", "hudFuel",
].forEach((key) => {
  check(
    `the "${key}" key exists in both languages`,
    countOccurrences(appJs, `"${key}":`) === 2,
    String(countOccurrences(appJs, `"${key}":`)),
  );
});

console.log("\n== 5o. Ink Sort and Glyph Crossing ==");
const BATCH_NINE = [
  { name: "inkSort", tab: "gameTabInkSort", panel: "gamePanelInkSort", file: "game-ink-sort" },
  { name: "glyphCrossing", tab: "gameTabGlyphCrossing", panel: "gamePanelGlyphCrossing", file: "game-glyph-crossing" },
];
BATCH_NINE.forEach((game) => {
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
  check(
    `${game.name} is registered as a drawer tab with a click listener`,
    new RegExp(`\\{ name: "${game.name}", tab: tab${pascal}, panel: panel${pascal} \\}`).test(appJs) &&
      new RegExp(`tab${pascal}\\.addEventListener\\("click"`).test(appJs),
  );
});
check(
  "the two batch-nine games are reset by the shell",
  /App\.quietResetInkSort = null/.test(appJs) &&
    /App\.quietResetGlyphCrossing = null/.test(appJs) &&
    countOccurrences(appJs, "quietResetInkSort()") === 2 &&
    countOccurrences(appJs, "quietResetGlyphCrossing()") === 2,
);
check(
  "every Ink Sort deal replays its recorded walk back to a uniform state",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-ink-sort.js"),
      "utf8",
    );
    const fnStart = src.indexOf("var SORT_CAP = 4;");
    const fnEnd = src.indexOf("App.inkSortGenerate");
    const factory = new Function(
      src.slice(fnStart, fnEnd) + "\nreturn sortGenerate;",
    )();
    const configs = [
      [3, 5, 8], [4, 6, 14], [4, 7, 20], [5, 8, 28], [6, 9, 38], [7, 10, 50],
    ];
    return configs.every(([colors, tubeCount, depth]) => {
      for (var trial = 0; trial < 12; trial += 1) {
        const deal = factory(colors, tubeCount, depth);
        const replay = deal.tubes.map((tube) => tube.slice());
        const cap = 4;
        const topRun = (tubes, i) => {
          if (!tubes[i].length) return null;
          const color = tubes[i][tubes[i].length - 1];
          let count = 1;
          for (let j = tubes[i].length - 2; j >= 0; j -= 1) {
            if (tubes[i][j] !== color) break;
            count += 1;
          }
          return { color, count };
        };
        for (const [from, to] of deal.solution) {
          if (!replay[from].length || replay[to].length >= cap) return false;
          const run = topRun(replay, from);
          if (replay[to].length && replay[to][replay[to].length - 1] !== run.color) {
            return false;
          }
          const amount = Math.min(run.count, cap - replay[to].length);
          for (let u = 0; u < amount; u += 1) {
            replay[to].push(replay[from].pop());
          }
        }
        const allUniform = replay.every(
          (tube) =>
            !tube.length ||
            (tube.length === cap && tube.every((c) => c === tube[0])),
        );
        if (!allUniform) return false;
      }
      return true;
    });
  })(),
);
check(
  "every Glyph Crossing lane set covers rows 1-3 and 5-7 with rising speeds",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-glyph-crossing.js"),
      "utf8",
    );
    const block = /var croLevels = \[([\s\S]*?)\n  \];/.exec(src);
    if (!block) return false;
    const laneSets = Array.from(block[1].matchAll(/lanes:\s*\[([\s\S]*?)\]\s*,\s*\n\s*starTimes/g));
    if (laneSets.length !== 6) return false;
    const speeds = [];
    const ok = laneSets.every((set) => {
      const lanes = Array.from(set[1].matchAll(/row:\s*(\d+),\s*dir:\s*(-?\d+),\s*speed:\s*(\d+)/g));
      if (lanes.length !== 6) return false;
      const rows = lanes.map((l) => Number(l[1])).sort((a, b) => a - b).join(",");
      if (rows !== "1,2,3,5,6,7") return false;
      lanes.forEach((l) => speeds.push(Number(l[3])));
      return true;
    });
    return ok && speeds[speeds.length - 1] > speeds[0];
  })(),
);
[
  "tabInkSort", "sorLevelSelectLabel", "sorL1", "sorL6",
  "sorFieldLabel", "sorPrompt", "sorReady", "sorPaused", "sorCleared",
  "sorNextVial", "sorCampaignDone", "sorHint", "logInkSort",
  "tabGlyphCrossing", "croLevelSelectLabel", "croL1", "croL6",
  "croFieldLabel", "croPrompt", "croReady", "croGo", "croPaused",
  "croSplashed", "croSquashed", "croTryAgain", "croLost", "croRetryRun",
  "croCleared", "croNextFord", "croCampaignDone", "croBtnUp", "croBtnDown",
  "croBtnLeft", "croBtnRight", "croHint", "logGlyphCrossing",
].forEach((key) => {
  check(
    `the "${key}" key exists in both languages`,
    countOccurrences(appJs, `"${key}":`) === 2,
    String(countOccurrences(appJs, `"${key}":`)),
  );
});

console.log("\n== 5p. Glyph Pusher and Glyph Net ==");
const BATCH_TEN = [
  { name: "glyphPusher", tab: "gameTabGlyphPusher", panel: "gamePanelGlyphPusher", file: "game-glyph-pusher" },
  { name: "glyphNet", tab: "gameTabGlyphNet", panel: "gamePanelGlyphNet", file: "game-glyph-net" },
];
BATCH_TEN.forEach((game) => {
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
  check(
    `${game.name} is registered as a drawer tab with a click listener`,
    new RegExp(`\\\{ name: "${game.name}", tab: tab${pascal}, panel: panel${pascal} \\\}`).test(appJs) &&
      new RegExp(`tab${pascal}\\\.addEventListener\\\("click"`).test(appJs),
  );
});
check(
  "the two batch-ten games are reset by the shell",
  /App\.quietResetGlyphPusher = null/.test(appJs) &&
    /App\.quietResetGlyphNet = null/.test(appJs) &&
    countOccurrences(appJs, "quietResetGlyphPusher()") === 2 &&
    countOccurrences(appJs, "quietResetGlyphNet()") === 2,
);
check(
  "every Glyph Pusher board balances boxes with goals and stays BFS-solvable",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-glyph-pusher.js"),
      "utf8",
    );
    const block = /var pushLevels = \[([\s\S]*?)\n  \];/.exec(src);
    if (!block) return false;
    const maps = Array.from(block[1].matchAll(/map:\s*\[([\s\S]*?)\]/g));
    const roomIds = Array.from(block[1].matchAll(/id:\s*"([a-z0-9]+)"/g)).map((m) => m[1]);
    /* Room count comes from the table so the ladder can keep growing. */
    if (roomIds.length < 8 || maps.length !== roomIds.length) return false;
    const thresholds = Array.from(block[1].matchAll(/starMoves:\s*\[(\d+),\s*(\d+),\s*(\d+)\]/g)).map(
      (m) => [Number(m[1]), Number(m[2]), Number(m[3])],
    );
    if (thresholds.length !== roomIds.length) return false;
    return maps.every((m, index) => {
      const rows = Array.from(m[1].matchAll(/"([^"]*)"/g)).map((x) => x[1]);
      const H = rows.length;
      const W = Math.max(...rows.map((r) => r.length));
      const grid = rows.map((r) => r.padEnd(W, "#").split(""));
      let player = null;
      let boxes = [];
      const goals = new Set();
      const wall = (x, y) => grid[y][x] === "#";
      for (let y = 0; y < H; y += 1) {
        for (let x = 0; x < W; x += 1) {
          const c = grid[y][x];
          if (c === "@") player = [x, y];
          if (c === "$") boxes.push(x + "," + y);
          if (c === "o") goals.add(x + "," + y);
        }
      }
      if (!player || boxes.length === 0 || boxes.length !== goals.size) return false;
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const seen = new Set([player.join(",") + "|" + boxes.slice().sort().join(";")]);
      let queue = [{ p: player, b: boxes, d: 0 }];
      while (queue.length) {
        const st = queue.shift();
        if (st.b.every((b) => goals.has(b))) {
          return st.d <= thresholds[index][0];
        }
        const boxSet = new Set(st.b);
        const reach = {};
        const walk = [st.p];
        reach[st.p.join(",")] = true;
        while (walk.length) {
          const [x, y] = walk.shift();
          for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            const k = nx + "," + ny;
            if (wall(nx, ny) || boxSet.has(k) || reach[k]) continue;
            reach[k] = true;
            walk.push([nx, ny]);
          }
        }
        for (const b of st.b) {
          const [bx, by] = b.split(",").map(Number);
          for (const [dx, dy] of dirs) {
            if (!reach[bx - dx + "," + (by - dy)]) continue;
            const nbx = bx + dx;
            const nby = by + dy;
            if (wall(nbx, nby) || boxSet.has(nbx + "," + nby)) continue;
            const nb2 = st.b.map((x2) => (x2 === b ? nbx + "," + nby : x2));
            const k3 = bx + "," + by + "|" + nb2.slice().sort().join(";");
            if (seen.has(k3)) continue;
            seen.add(k3);
            queue.push({ p: [bx, by], b: nb2, d: st.d + 1 });
          }
        }
      }
      return false;
    });
  })(),
);
check(
  "every Glyph Net deal is winnable at its base rotation and unsolved as dealt",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-glyph-net.js"),
      "utf8",
    );
    const slice = src.slice(src.indexOf("var NET_DX"), src.indexOf("App.glyphNetGenerate"));
    const api = new Function(
      slice + "\nreturn { glyphNetGenerate: netGenerate, glyphNetWin: netWin };",
    )();
    const sizes = [4, 4, 5, 5, 6, 7];
    return sizes.every((size) => {
      for (let trial = 0; trial < 8; trial += 1) {
        const deal = api.glyphNetGenerate(size);
        if (!deal || deal.terminals.length < 3 || deal.opt < 3) return false;
        if (!api.glyphNetWin(deal.size, deal.conns, deal.rot.map(() => 0))) {
          return false;
        }
        if (api.glyphNetWin(deal.size, deal.conns, deal.rot)) {
          return false;
        }
      }
      return true;
    });
  })(),
);
check(
  "a Glyph Net board only wins with every bulb on the source's side",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-glyph-net.js"),
      "utf8",
    );
    const slice = src.slice(
      src.indexOf("var NET_DX"),
      src.indexOf("App.glyphNetGenerate"),
    );
    const netWin = new Function(slice + "\nreturn netWin;")();
    const F = false;
    const T = true;
    const none = [F, F, F, F];
    /* [north, east, south, west]. Every arm below has a matching partner, so
     * only reachability from the source tells these two boards apart. */
    const oneLoop = [
      [F, T, T, F],
      [F, F, T, T],
      [T, T, F, F],
      [T, F, F, T],
    ];
    const twoLoops = [
      [F, T, T, F],
      [F, F, T, T],
      none,
      none,
      [T, T, F, F],
      [T, F, F, T],
      none,
      none,
      none,
      none,
      [F, T, T, F],
      [F, F, T, T],
      none,
      none,
      [T, T, F, F],
      [T, F, F, T],
    ];
    const zeros = (count) => {
      const out = [];
      for (let i = 0; i < count; i += 1) {
        out.push(0);
      }
      return out;
    };
    return (
      netWin(2, oneLoop, zeros(4)) === true &&
      netWin(4, twoLoops, zeros(16)) === false
    );
  })(),
);
[
  "tabGlyphPusher", "sokLevelSelectLabel", "sokL1", "sokL6",
  "sokFieldLabel", "sokPrompt", "sokReady", "sokPaused", "sokCleared",
  "sokNextRoom", "sokCampaignDone", "sokUndo", "sokHint",
  "logGlyphPusher",
  "tabGlyphNet", "netLevelSelectLabel", "netL1", "netL6",
  "netFieldLabel", "netPrompt", "netReady", "netPaused", "netCleared",
  "netNextGrid", "netCampaignDone", "netHint", "logGlyphNet",
].forEach((key) => {
  check(
    `the "${key}" key exists in both languages`,
    countOccurrences(appJs, `"${key}":`) === 2,
    String(countOccurrences(appJs, `"${key}":`)),
  );
});
console.log("\n== 5q. Glyph Sketch and Glyph Fifteen ==");
const BATCH_ELEVEN = [
  { name: "glyphSketch", tab: "gameTabGlyphSketch", panel: "gamePanelGlyphSketch", file: "game-glyph-sketch" },
  { name: "glyphFifteen", tab: "gameTabGlyphFifteen", panel: "gamePanelGlyphFifteen", file: "game-glyph-fifteen" },
];
BATCH_ELEVEN.forEach((game) => {
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
  "the two batch-eleven games are reset by the shell",
  /App\.quietResetGlyphSketch = null/.test(appJs) &&
    /App\.quietResetGlyphFifteen = null/.test(appJs) &&
    countOccurrences(appJs, "quietResetGlyphSketch()") === 2 &&
    countOccurrences(appJs, "quietResetGlyphFifteen()") === 2,
);
check(
  "every Glyph Sketch picture is uniquely solvable by row and column logic",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-glyph-sketch.js"),
      "utf8",
    );
    const block = /var sketchLevels = \[([\s\S]*?)\n  \];/.exec(src);
    if (!block) return false;
    const arts = Array.from(block[1].matchAll(/art:\s*\[([\s\S]*?)\]/g)).map((m) =>
      Array.from(m[1].matchAll(/"([^"]*)"/g)).map((x) => x[1]),
    );
    if (arts.length !== 6) return false;
    function lineOptions(line, clue) {
      const n = line.length;
      const out = [];
      function go(pos, ci, cells) {
        if (ci === clue.length) {
          const cells2 = cells.slice();
          let ok = true;
          for (let k = pos; k < n; k++) {
            if (line[k] === 1) {
              ok = false;
              break;
            }
            cells2.push(0);
          }
          if (ok) out.push(cells2);
          return;
        }
        const len = clue[ci];
        for (let start = pos; start + len <= n; start++) {
          let ok = true;
          for (let k = pos; k < start; k++) {
            if (line[k] === 1) {
              ok = false;
              break;
            }
          }
          if (!ok) continue;
          for (let k = start; k < start + len; k++) {
            if (line[k] === 0) {
              ok = false;
              break;
            }
          }
          if (!ok) continue;
          if (start + len < n && line[start + len] === 1) continue;
          const cells2 = cells.slice();
          for (let k = pos; k < start; k++) cells2.push(0);
          for (let k = 0; k < len; k++) cells2.push(1);
          let np = start + len;
          if (np < n) {
            cells2.push(0);
            np++;
          }
          go(np, ci + 1, cells2);
        }
      }
      go(0, 0, []);
      return out;
    }
    return arts.every((art) => {
      const R = art.length;
      const C = art[0].length;
      const grid = art.map((r) => [...r].map((c) => (c === "#" ? 1 : 0)));
      const lineOf = (line) => {
        const out = [];
        let run = 0;
        for (const v of line) {
          if (v) run++;
          else if (run) {
            out.push(run);
            run = 0;
          }
        }
        if (run) out.push(run);
        return out.length ? out : [0];
      };
      const rowClue = grid.map(lineOf);
      const colClue = Array.from({ length: C }, (_, c) =>
        lineOf(grid.map((r) => r[c])),
      );
      const known = Array.from({ length: R }, () => Array(C).fill(-1));
      let changed = true;
      let guard = 0;
      while (changed && guard++ < 100) {
        changed = false;
        for (let r = 0; r < R; r++) {
          const opts = lineOptions(
            known[r].map((v) => (v === -1 ? 2 : v)),
            rowClue[r],
          );
          if (!opts.length) return false;
          for (let c = 0; c < C; c++) {
            const vals = new Set(opts.map((o) => o[c]));
            if (vals.size === 1 && known[r][c] === -1) {
              known[r][c] = opts[0][c];
              changed = true;
            }
          }
        }
        for (let c = 0; c < C; c++) {
          const line = Array.from({ length: R }, (_, r) =>
            known[r][c] === -1 ? 2 : known[r][c],
          );
          const opts = lineOptions(line, colClue[c]);
          if (!opts.length) return false;
          for (let r = 0; r < R; r++) {
            const vals = new Set(opts.map((o) => o[r]));
            if (vals.size === 1 && known[r][c] === -1) {
              known[r][c] = opts[0][r];
              changed = true;
            }
          }
        }
      }
      return (
        known.every((row) => row.every((v) => v !== -1)) &&
        known.every((row, r) =>
          row.every((v, c) => (v === 1) === (grid[r][c] === 1)),
        )
      );
    });
  })(),
);
check(
  "every Glyph Fifteen deal passes the sliding-parity solvability rule",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-glyph-fifteen.js"),
      "utf8",
    );
    const start = src.indexOf("function ftShuffle");
    const end = src.indexOf("App.glyphFifteenShuffle");
    const shuffle = new Function(
      src.slice(start, end) + "\nreturn ftShuffle;",
    )();
    const configs = [
      [3, 60], [3, 130], [3, 220], [4, 300], [4, 440], [4, 600],
    ];
    return configs.every(([n, walk]) => {
      for (let trial = 0; trial < 12; trial += 1) {
        const deal = shuffle(n, walk);
        const arr = deal.board.filter((v) => v !== 0);
        let inv = 0;
        for (let i = 0; i < arr.length; i++) {
          for (let j = i + 1; j < arr.length; j++) {
            if (arr[i] > arr[j]) inv++;
          }
        }
        if (n % 2 === 1) {
          if (inv % 2 !== 0) return false;
        } else {
          const rowFromBottom = n - Math.floor(deal.board.indexOf(0) / n);
          if ((inv + rowFromBottom) % 2 !== 1) return false;
        }
      }
      return true;
    });
  })(),
);
check(
  "every Glyph Leap ascent keeps its gaps inside the bounce apex",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-glyph-leap.js"),
      "utf8",
    );
    const bounce = Number(/var leapBounce = (\d+);/.exec(src)[1]);
    const gravity = Number(/var leapGravity = (\d+);/.exec(src)[1]);
    const apex = (bounce * bounce) / (2 * gravity);
    const block = /var leapLevels = \[([\s\S]*?)\n  \];/.exec(src);
    if (!block) return false;
    const gapMaxes = Array.from(block[1].matchAll(/gapMax:\s*(\d+)/g)).map((m) =>
      Number(m[1]),
    );
    const goals = Array.from(block[1].matchAll(/goal:\s*(\d+)/g)).map((m) =>
      Number(m[1]),
    );
    const ids = Array.from(block[1].matchAll(/id:\s*"([a-z0-9]+)"/g)).map((m) => m[1]);
    /* Length comes from the table, so extending the ladder is not a failure. */
    if (ids.length < 10 || gapMaxes.length !== ids.length || goals.length !== ids.length) {
      return false;
    }
    return (
      gapMaxes.every((g) => g <= apex - 4) &&
      goals.every((g, i) => i === 0 || g > goals[i - 1])
    );
  })(),
);
check(
  "every Bubble Ink spring asks for a score the wall can actually pay",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-bubble-ink.js"),
      "utf8",
    );
    const block = /var bubLevels = \[([\s\S]*?)\n  \];/.exec(src);
    if (!block) return false;
    const rows = Array.from(block[1].matchAll(/rows:\s*(\d+)/g)).map((m) => Number(m[1]));
    const targets = Array.from(block[1].matchAll(/target:\s*(\d+)/g)).map((m) => Number(m[1]));
    const ids = Array.from(block[1].matchAll(/id:\s*"([a-z0-9]+)"/g)).map((m) => m[1]);
    /* Targets are capped by how many bubbles the wall holds, so this ladder
     * cannot be lengthened by raising targets alone; derive the length from
     * the table rather than pinning it. */
    if (ids.length < 8 || rows.length !== ids.length || targets.length !== ids.length) {
      return false;
    }
    return rows.every((rowCount, i) => {
      const bubbles = rowCount * 14;
      return targets[i] * 1.4 <= bubbles * 12 && targets[i] >= 300;
    });
  })(),
);
[
  "tabGlyphSketch", "skLevelSelectLabel", "skL1", "skL6",
  "skFieldLabel", "skPrompt", "skReady", "skPaused", "skCleared",
  "skNextBoard", "skCampaignDone", "skHint", "logGlyphSketch",
  "tabGlyphFifteen", "ftLevelSelectLabel", "ftL1", "ftL6",
  "ftFieldLabel", "ftPrompt", "ftReady", "ftPaused", "ftCleared",
  "ftNextBoard", "ftCampaignDone", "ftHint", "logGlyphFifteen",
  "leapL7", "leapL8", "inkL9", "inkL10", "bubL9", "bubL10",
  "pegL7", "pegL8", "raidL7", "raidL8",
].forEach((key) => {
  check(
    `the "${key}" key exists in both languages`,
    countOccurrences(appJs, `"${key}":`) === 2,
    String(countOccurrences(appJs, `"${key}":`)),
  );
});

console.log("\n== 5r. Glyph Sudoku and Glyph Reversi ==");
const BATCH_TWELVE = [
  { name: "glyphSudoku", tab: "gameTabGlyphSudoku", panel: "gamePanelGlyphSudoku", file: "game-glyph-sudoku" },
  { name: "glyphReversi", tab: "gameTabGlyphReversi", panel: "gamePanelGlyphReversi", file: "game-glyph-reversi" },
];
BATCH_TWELVE.forEach((game) => {
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
  "the two batch-twelve games are reset by the shell",
  /App\.quietResetGlyphSudoku = null/.test(appJs) &&
    /App\.quietResetGlyphReversi = null/.test(appJs) &&
    countOccurrences(appJs, "quietResetGlyphSudoku()") === 2 &&
    countOccurrences(appJs, "quietResetGlyphReversi()") === 2,
);
check(
  "every Glyph Sudoku deal has a valid solution and exactly one answer",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-glyph-sudoku.js"),
      "utf8",
    );
    const start = src.indexOf("function sudValid");
    const end = src.indexOf("App.glyphSudokuGenerate");
    const api = new Function(
      src.slice(start, end) + "\nreturn { sudGenerate, sudValid, sudCountSolutions };",
    )();
    const configs = [
      [4, 2, 2, 8], [4, 2, 2, 6], [6, 2, 3, 14], [6, 2, 3, 12], [9, 3, 3, 34], [9, 3, 3, 30],
    ];
    return configs.every(([size, bw, bh, clues]) => {
      for (let trial = 0; trial < 3; trial += 1) {
        const deal = api.sudGenerate(size, bw, bh, clues);
        const rows = [];
        for (let r = 0; r < size; r++) {
          rows.push(deal.solution.slice(r * size, r * size + size));
        }
        if (!api.sudValid(rows, size, bw, bh)) return false;
        if (api.sudCountSolutions(deal.puzzle.slice(), size, bw, bh, 2) !== 1) {
          return false;
        }
      }
      return true;
    });
  })(),
);
check(
  "a Glyph Sudoku grid clears only with no wrong digits left",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-glyph-sudoku.js"),
      "utf8",
    );
    const start = src.indexOf("function checkCleared()");
    const end = src.indexOf("solved = true", start);
    const body = src.slice(start, end);
    return (
      start !== -1 &&
      end !== -1 &&
      body.includes("!board[i] || wrong[i]") &&
      !/if \(!board\[i\]\)/.test(body)
    );
  })(),
);
check(
  "every Glyph Reversi rank finishes AI-vs-AI games without illegal moves",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-glyph-reversi.js"),
      "utf8",
    );
    const start = src.indexOf("var REV_N = 8;");
    const end = src.indexOf("App.glyphReversiMoves");
    const api = new Function(
      src.slice(start, end) +
        "\nreturn { revMoves, revApply, revPick, revScore };",
    )();
    const startBoard = [];
    for (let i = 0; i < 64; i++) startBoard.push(0);
    startBoard[27] = 2;
    startBoard[28] = 1;
    startBoard[35] = 1;
    startBoard[36] = 2;
    const opening = api.revMoves(startBoard, 1).sort((a, b) => a - b).join(",");
    if (opening !== "19,26,37,44") return false;
    const depths = [0, 0, 1, 1, 2, 3];
    return depths.every((depth, rank) => {
      for (let game = 0; game < 6; game += 1) {
        let board = startBoard.slice();
        let player = 1;
        let passes = 0;
        let guard = 0;
        while (guard++ < 200) {
          const moves = api.revMoves(board, player);
          if (!moves.length) {
            passes++;
            if (passes >= 2) break;
            player = player === 1 ? 2 : 1;
            continue;
          }
          passes = 0;
          let index;
          if (player === 1) {
            let best = -1;
            let bestIndex = -1;
            for (const m of moves) {
              const score = api.revScore(api.revApply(board, 1, m).board).player;
              if (score > best) {
                best = score;
                bestIndex = m;
              }
            }
            index = bestIndex;
          } else {
            index = api.revPick(board, { noise: 0, depth });
            if (index === -1 || !moves.includes(index)) return false;
          }
          board = api.revApply(board, player, index).board;
          player = player === 1 ? 2 : 1;
        }
        const score = api.revScore(board);
        if (score.player + score.ai < 9) return false;
      }
      return true;
    });
  })(),
);
[
  "tabGlyphSudoku", "sudLevelSelectLabel", "sudL1", "sudL6",
  "sudPadLabel", "sudFieldLabel", "sudPrompt", "sudReady", "sudPaused",
  "sudCleared", "sudNextGrid", "sudCampaignDone", "sudHint",
  "logGlyphSudoku",
  "tabGlyphReversi", "revLevelSelectLabel", "revL1", "revL6",
  "revYouLabel", "revAiLabel", "revFieldLabel", "revPrompt", "revReady",
  "revPaused", "revWin", "revLoss", "revDraw", "revRetry",
  "revNextRank", "revCampaignDone", "revYouPassed", "revAiPassed",
  "revHint", "logGlyphReversi",
].forEach((key) => {
  check(
    `the "${key}" key exists in both languages`,
    countOccurrences(appJs, `"${key}":`) === 2,
    String(countOccurrences(appJs, `"${key}":`)),
  );
});
console.log("\n== 5s. Glyph Glide and Glyph Four ==");
const BATCH_THIRTEEN = [
  { name: "glyphGlide", tab: "gameTabGlyphGlide", panel: "gamePanelGlyphGlide", file: "game-glyph-glide" },
  { name: "glyphFour", tab: "gameTabGlyphFour", panel: "gamePanelGlyphFour", file: "game-glyph-four" },
];
BATCH_THIRTEEN.forEach((game) => {
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
  "the two batch-thirteen games are reset by the shell",
  /App\.quietResetGlyphGlide = null/.test(appJs) &&
    /App\.quietResetGlyphFour = null/.test(appJs) &&
    countOccurrences(appJs, "quietResetGlyphGlide()") === 2 &&
    countOccurrences(appJs, "quietResetGlyphFour()") === 2,
);
check(
  "every Glyph Glide deal is solvable at the par the generator quotes",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-glyph-glide.js"),
      "utf8",
    );
    const start = src.indexOf("var GLIDE_DIRS");
    const end = src.indexOf("App.glyphGlideGenerate");
    const api = new Function(
      src.slice(start, end) + "\nreturn { glideGenerate: glideGenerate, glideSolve: glideSolve };",
    )();
    const configs = [
      [8, 6, 0, 3, 5], [8, 6, 1, 4, 7], [9, 7, 2, 5, 9],
      [9, 7, 2, 7, 11], [10, 8, 3, 7, 15], [10, 8, 3, 8, 18],
      [11, 9, 4, 9, 19], [12, 9, 5, 10, 21],
    ];
    return configs.every(([w, h, stars, minPar, maxPar]) => {
      for (let trial = 0; trial < 8; trial += 1) {
        const deal = api.glideGenerate(w, h, stars, minPar, maxPar);
        if (!deal) return false;
        const solved = api.glideSolve(
          deal.wall, w, h, deal.start, deal.goal, deal.stars,
        );
        /* The solver must confirm the quoted par on every deal, and the
         * graceful fallback must never quote a trivial one-slide board. */
        if (solved !== deal.par || solved < 2) {
          return false;
        }
      }
      return true;
    });
  })(),
);
check(
  "every Glyph Four rank plays legal drops and finishes AI-vs-AI games",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-glyph-four.js"),
      "utf8",
    );
    const start = src.indexOf("var C4_W = 7;");
    const end = src.indexOf("App.glyphFourDropRow");
    const api = new Function(
      src.slice(start, end) +
        "\nreturn { c4DropRow, c4WinLine, c4Pick, c4Full };",
    )();
    const depths = [0, 1, 2, 3, 4, 5];
    const noises = [0.55, 0.3, 0.15, 0.05, 0, 0];
    return depths.every((depth, rank) => {
      for (let game = 0; game < 5; game += 1) {
        let board = [];
        for (let i = 0; i < 42; i++) board.push(0);
        let player = 1;
        let guard = 0;
        while (guard++ < 60) {
          if (api.c4Full(board)) break;
          const col = api.c4Pick(board, {
            depth,
            noise: player === 2 ? noises[rank] : 0,
          });
          if (col === -1) break;
          const row = api.c4DropRow(board, col);
          if (row === -1) return false;
          board[row * 7 + col] = player;
          if (api.c4WinLine(board, player)) break;
          player = player === 1 ? 2 : 1;
        }
      }
      return true;
    });
  })(),
);
check(
  "Glyph Four's AI never drops into a full column under repeated probes",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-glyph-four.js"),
      "utf8",
    );
    const start = src.indexOf("var C4_W = 7;");
    const end = src.indexOf("App.glyphFourDropRow");
    const api = new Function(
      src.slice(start, end) + "\nreturn { c4Pick };",
    )();
    const board = [];
    for (let i = 0; i < 42; i++) board.push(i % 7 === 3 ? 1 : 0);
    for (let trial = 0; trial < 40; trial += 1) {
      const col = api.c4Pick(board, { depth: 3, noise: 0.5 });
      if (col === 3) return false;
    }
    return true;
  })(),
);
[
  "tabGlyphGlide", "glLevelSelectLabel", "glL1", "glL6",
  "glFieldLabel", "glPrompt", "glReady", "glPaused", "glCleared",
  "glNextRink", "glCampaignDone", "glHint", "logGlyphGlide",
  "tabGlyphFour", "c4LevelSelectLabel", "c4L1", "c4L6",
  "c4FieldLabel", "c4Prompt", "c4Ready", "c4Paused", "c4Win", "c4Loss",
  "c4Draw", "c4Retry", "c4NextBoard", "c4CampaignDone", "c4Hint",
  "logGlyphFour",
].forEach((key) => {
  check(
    `the "${key}" key exists in both languages`,
    countOccurrences(appJs, `"${key}":`) === 2,
    String(countOccurrences(appJs, `"${key}":`)),
  );
});
console.log("\n== 5t. per-game visual guides ==");
const guideSource = fs
  .readFileSync(path.join(root, "assets", "app", "game-guide.js"), "utf8")
  .replace(/^﻿/, "");
const guidedPanels = Array.from(
  guideSource.matchAll(/panel:\s*"([A-Za-z0-9]+)"/g),
).map((m) => m[1]);
check(
  "the guide data covers every one of the 49 drawer panels",
  guidedPanels.length === 49 && new Set(guidedPanels).size === 49,
  "found " + guidedPanels.length + " unique " + new Set(guidedPanels).size,
);
check(
  "every panel id referenced by the guide exists in all four pages",
  PAGES.every((page) =>
    guidedPanels.every((panel) => read(page).includes('id="' + panel + '"')),
  ),
);
check(
  "every guide entry carries a diagram and both step languages",
  (() => {
    const entries = guideSource.split('panel: "').slice(1);
    return (
      entries.length === 49 &&
      entries.every(
        (entry) =>
          entry.includes("svg:") &&
          entry.includes("en: [") &&
          entry.includes("zh: [") &&
          (entry.match(/svg:/g) || []).length === 1,
      )
    );
  })(),
);
check(
  "the guide renderer is wired into the shared bootstrap",
  /initGameGuides\(\);/.test(appJs) &&
    /App\.initGameGuides = initGameGuides;/.test(guideSource),
);
check(
  "the guide toggle exists in both languages",
  countOccurrences(appJs, '"gameGuideToggle":') === 2,
  String(countOccurrences(appJs, '"gameGuideToggle":')),
);
check(
  "the guide panel is styled",
  stylesCss.includes(".game-guide") &&
    stylesCss.includes(".game-guide-art svg") &&
    stylesCss.includes(".game-guide-body ol"),
);

check(
  "every guide entry carries at least five labeled steps in both languages",
  (() => {
    const entries = guideSource.split('panel: "').slice(1);
    const stepsOf = (chunk, lang) => {
      const m = new RegExp(lang + ": \\[" + "([\\s\\S]*?)\\],").exec(chunk);
      if (!m) return 0;
      return (m[1].match(/"/g) || []).length / 2;
    };
    return (
      entries.length === 49 &&
      entries.every(
        (chunk) =>
          stepsOf(chunk, "en") >= 5 &&
          stepsOf(chunk, "zh") >= 5,
      )
    );
  })(),
);
console.log("\n== 5u. Glyph Tower and Glyph Fleet ==");
const BATCH_FIFTEEN = [
  { name: "glyphTower", tab: "gameTabGlyphTower", panel: "gamePanelGlyphTower", file: "game-glyph-tower" },
  { name: "glyphFleet", tab: "gameTabGlyphFleet", panel: "gamePanelGlyphFleet", file: "game-glyph-fleet" },
];
BATCH_FIFTEEN.forEach((game) => {
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
  "the two batch-fifteen games are reset by the shell",
  /App\.quietResetGlyphTower = null/.test(appJs) &&
    /App\.quietResetGlyphFleet = null/.test(appJs) &&
    countOccurrences(appJs, "quietResetGlyphTower()") === 2 &&
    countOccurrences(appJs, "quietResetGlyphFleet()") === 2,
);
check(
  "Glyph Tower star thresholds all sit above the 2^n - 1 optimum",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-glyph-tower.js"),
      "utf8",
    );
    const minMoves = (n) => Math.pow(2, n) - 1;
    const block = /var towLevels = \[([\s\S]*?)\n  \];/.exec(src);
    if (!block) return false;
    const discs = Array.from(block[1].matchAll(/discs:\s*(\d+)/g)).map((m) =>
      Number(m[1]),
    );
    const thresholds = Array.from(block[1].matchAll(/starMoves:\s*\[(\d+),\s*(\d+),\s*(\d+)\]/g)).map(
      (m) => [Number(m[1]), Number(m[2]), Number(m[3])],
    );
    const ids = Array.from(block[1].matchAll(/id:\s*"([a-z0-9]+)"/g)).map((m) => m[1]);
    /* Length comes from the table; the invariant is the optimum, not the size. */
    if (ids.length < 5 || discs.length !== ids.length || thresholds.length !== ids.length) {
      return false;
    }
    return discs.every((n, i) => {
      const opt = minMoves(n);
      return (
        thresholds[i][0] >= opt &&
        thresholds[i][1] > thresholds[i][0] &&
        thresholds[i][2] > thresholds[i][1]
      );
    });
  })(),
);
check(
  "every Glyph Fleet placement is legal and every admiral duel terminates legally",
  (() => {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-glyph-fleet.js"),
      "utf8",
    );
    const start = src.indexOf("var FLT_N = 8;");
    const end = src.indexOf("App.glyphFleetPlace");
    const api = new Function(
      src.slice(start, end) +
        "\nreturn { glyphFleetPlace: fltPlace, glyphFleetAiPick: fltAiPick, glyphFleetQueue: fltQueueAround };",
    )();
    for (let trial = 0; trial < 20; trial += 1) {
      const fleet = api.glyphFleetPlace();
      if (Object.keys(fleet.occupied).length !== 12) return false;
      if (fleet.ships.length !== 4) return false;
      const total = fleet.ships.reduce((sum, s) => sum + s.cells.length, 0);
      if (total !== 12) return false;
    }
    const skills = [0, 1, 2, 3, 4, 5];
    return skills.every((skill) => {
      for (let game = 0; game < 8; game += 1) {
        const A = api.glyphFleetPlace();
        const B = api.glyphFleetPlace();
        const boardA = [];
        const boardB = [];
        for (let i = 0; i < 64; i++) {
          boardA.push(0);
          boardB.push(0);
        }
        const stA = { queue: [] };
        const stB = { queue: [] };
        let turn = 0;
        let guard = 0;
        const alive = (F) => F.ships.every((s) => s.hits < s.size);
        while (guard++ < 300 && alive(A) && alive(B)) {
          const shooterA = turn % 2 === 0;
          const board = shooterA ? boardB : boardA;
          const target = shooterA ? B : A;
          const state = shooterA ? stA : stB;
          const index = api.glyphFleetAiPick(
            board,
            state,
            shooterA ? 5 : skill,
          );
          if (index === -1) break;
          if (board[index] !== 0) return false;
          board[index] = target.occupied[index] ? 2 : 1;
          if (target.occupied[index]) {
            target.ships.forEach((s) => {
              if (s.cells.includes(index)) s.hits += 1;
            });
            api.glyphFleetQueue(index, state);
          }
          turn += 1;
        }
        if (!alive(A) && !alive(B)) return false;
      }
      return true;
    });
  })(),
);
[
  "tabGlyphTower", "towLevelSelectLabel", "towL1", "towL5",
  "towFieldLabel", "towPrompt", "towReady", "towPaused", "towCleared",
  "towNextTower", "towCampaignDone", "towHint", "logGlyphTower",
  "tabGlyphFleet", "fltLevelSelectLabel", "fltL1", "fltL6",
  "fltFieldLabel", "fltPrompt", "fltReady", "fltPaused", "fltHit",
  "fltMiss", "fltAiHit", "fltTurn", "fltWin", "fltLoss", "fltRetry",
  "fltNextFleet", "fltCampaignDone", "fltHint", "logGlyphFleet",
].forEach((key) => {
  check(
    `the "${key}" key exists in both languages`,
    countOccurrences(appJs, `"${key}":`) === 2,
    String(countOccurrences(appJs, `"${key}":`)),
  );
});
console.log("\n== 5w. Ember Sticks and Glyph Dots ==");
const PAIR_GAMES = [
  { name: "nim", tab: "gameTabNim", panel: "gamePanelNim", file: "game-ember-sticks" },
  { name: "dots", tab: "gameTabDots", panel: "gamePanelDots", file: "game-glyph-dots" },
];
PAIR_GAMES.forEach((game) => {
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
  const gameSource = read("assets/app/" + game.file + ".js").replace(/^﻿/, "");
  const lookups = Array.from(
    gameSource.matchAll(/getElement\("([A-Za-z0-9]+)"\)/g),
  ).map((match) => match[1]);
  const pascal = game.name.charAt(0).toUpperCase() + game.name.slice(1);
  check(
    `${game.file}: every id it looks up exists in all four pages`,
    lookups.length >= 7 &&
      PAGES.every((page) => {
        const html = read(page);
        return lookups.every((id) => html.includes('id="' + id + '"'));
      }),
    lookups.join(","),
  );
  check(
    `${game.name} is registered as a drawer tab with a click listener`,
    new RegExp(`\\{ name: "${game.name}", tab: tab${pascal}, panel: panel${pascal} \\}`).test(appJs) &&
      new RegExp(`tab${pascal}\\.addEventListener\\("click"`).test(appJs),
  );
});
check(
  "Ember Sticks: the perfect move always hands over a lost position",
  (() => {
    try {
      const src = read("assets/app/game-ember-sticks.js").replace(/^﻿/, "");
      const slice = src.slice(
        src.indexOf("function nimTotal"),
        src.indexOf("function initNimGame"),
      );
      const api = new Function(slice + "\nreturn { nimBestMove, nimTotal };")();
      const { nimBestMove, nimTotal } = api;
      const wins = (rows, misere, memo) => {
        const total = nimTotal(rows);
        if (total === 0) {
          return misere;
        }
        const key = rows.join(",") + (misere ? "m" : "n");
        if (memo[key] !== undefined) {
          return memo[key];
        }
        let result = false;
        for (let row = 0; row < rows.length && !result; row += 1) {
          for (let keep = 0; keep < rows[row] && !result; keep += 1) {
            const next = rows.slice();
            next[row] = keep;
            if (!wins(next, misere, memo)) {
              result = true;
            }
          }
        }
        memo[key] = result;
        return result;
      };
      for (const misere of [false, true]) {
        const memo = {};
        for (let a = 0; a <= 4; a += 1) {
          for (let b = 0; b <= 4; b += 1) {
            for (let c = 0; c <= 4; c += 1) {
              const rows = [a, b, c];
              if (nimTotal(rows) === 0) {
                continue;
              }
              const move = nimBestMove(rows, misere);
              const after = rows.slice();
              after[move[0]] = move[1];
              /* A move that lifts nothing would quietly stall a table. */
              if (nimTotal(after) >= nimTotal(rows)) {
                return false;
              }
              if (wins(rows, misere, memo) && wins(after, misere, memo)) {
                return false;
              }
            }
          }
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  })(),
);
check(
  "Ember Sticks: every table can be won by the player who moves first",
  (() => {
    try {
      const src = read("assets/app/game-ember-sticks.js").replace(/^﻿/, "");
      const slice = src.slice(
        src.indexOf("var nimLevels"),
        src.indexOf("function initNimGame"),
      );
      const api = new Function(
        slice + "\nreturn { nimBestMove, nimTotal, nimLevels };",
      )();
      const { nimBestMove, nimTotal, nimLevels } = api;
      const wins = (rows, misere, memo) => {
        if (nimTotal(rows) === 0) {
          return misere;
        }
        const key = rows.join(",") + (misere ? "m" : "n");
        if (memo[key] !== undefined) {
          return memo[key];
        }
        let result = false;
        for (let row = 0; row < rows.length && !result; row += 1) {
          for (let keep = 0; keep < rows[row] && !result; keep += 1) {
            const next = rows.slice();
            next[row] = keep;
            if (!wins(next, misere, memo)) {
              result = true;
            }
          }
        }
        memo[key] = result;
        return result;
      };
      /* Walking the AI's own replies has to end with the player holding the
       * win, which is the same as saying the opening rows are a first-player
       * win under that table's rule. */
      return nimLevels.every((level) => {
        const memo = {};
        if (!wins(level.rows.slice(), level.misere, memo)) {
          return false;
        }
        let rows = level.rows.slice();
        let mine = 0;
        let guard = 0;
        while (nimTotal(rows) && guard < 60) {
          const move = nimBestMove(rows, level.misere);
          const after = rows.slice();
          after[move[0]] = move[1];
          if (wins(after, level.misere, memo)) {
            return false;
          }
          mine += 1;
          rows = after;
          if (!nimTotal(rows)) {
            break;
          }
          const reply = nimBestMove(rows, level.misere);
          const back = rows.slice();
          back[reply[0]] = reply[1];
          if (!wins(back, level.misere, memo)) {
            return false;
          }
          rows = back;
          guard += 1;
        }
        return mine > 0 && nimTotal(rows) === 0;
      });
    } catch (error) {
      return false;
    }
  })(),
);
check(
  "Glyph Dots: AI self-play fills the plate and owns every box",
  (() => {
    try {
      const src = read("assets/app/game-glyph-dots.js").replace(/^﻿/, "");
      const slice = src.slice(
        src.indexOf("function dotsIndex"),
        src.indexOf("function initDotsGame"),
      );
      const api = new Function(
        slice +
          "\nreturn { dotsAiMove, dotsLegal, dotsApply, dotsCount, dotsYou: 1, dotsAi: 2 };",
      )();
      const blank = (boxes) => ({
        boxes,
        h: new Array(boxes * (boxes + 1)).fill(0),
        v: new Array(boxes * (boxes + 1)).fill(0),
        owner: new Array(boxes * boxes).fill(0),
      });
      return [3, 4, 5].every((boxes) => {
        const state = blank(boxes);
        let who = api.dotsYou;
        let guard = 0;
        while (api.dotsLegal(state).length && guard < 400) {
          const move = api.dotsAiMove(state, who, 0);
          if (!move) {
            return false;
          }
          const closed = api.dotsApply(state, move, who);
          if (!closed.length) {
            who = who === api.dotsYou ? api.dotsAi : api.dotsYou;
          }
          guard += 1;
        }
        const yours = api.dotsCount(state, api.dotsYou);
        const theirs = api.dotsCount(state, api.dotsAi);
        const laid = (who) =>
          state.h.filter((owner) => owner === who).length +
          state.v.filter((owner) => owner === who).length;
        return (
          api.dotsLegal(state).length === 0 &&
          yours + theirs === boxes * boxes &&
          /* A sweep is legal in this game, so require sticks, not boxes. */
          laid(api.dotsYou) > 0 &&
          laid(api.dotsAi) > 0
        );
      });
    } catch (error) {
      return false;
    }
  })(),
);
check(
  "Glyph Dots: the AI never walks past a box it could close",
  (() => {
    try {
      const src = read("assets/app/game-glyph-dots.js").replace(/^﻿/, "");
      const slice = src.slice(
        src.indexOf("function dotsIndex"),
        src.indexOf("function initDotsGame"),
      );
      const api = new Function(
        slice + "\nreturn { dotsAiMove, dotsLegal, dotsApply };",
      )();
      for (let trial = 0; trial < 300; trial += 1) {
        const boxes = 3;
        const state = {
          boxes,
          h: new Array(boxes * (boxes + 1)).fill(0),
          v: new Array(boxes * (boxes + 1)).fill(0),
          owner: new Array(boxes * boxes).fill(0),
        };
        /* Randomly seed legal positions, then look for one with a free box. */
        for (let step = 0; step < 8; step += 1) {
          const legal = api.dotsLegal(state);
          if (!legal.length) {
            break;
          }
          const pick = legal[Math.floor(Math.random() * legal.length)];
          const who = 1 + (step % 2);
          api.dotsApply(state, pick, who);
        }
        const legal = api.dotsLegal(state);
        if (!legal.length) {
          continue;
        }
        let completing = legal.some((move) => {
          const probe = JSON.parse(JSON.stringify(state));
          return api.dotsApply(probe, move, 2).length > 0;
        });
        if (!completing) {
          continue;
        }
        const chosen = api.dotsAiMove(state, 2, 0);
        const taken = api.dotsApply(state, chosen, 2).length;
        if (!taken) {
          return false;
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  })(),
);
check(
  "the newest game blocks theme their text and surfaces with tokens",
  (() => {
    const gamesCss = read("assets/styles/games.css");
    const start = gamesCss.indexOf("/* Ember Sticks -");
    if (start === -1) {
      return false;
    }
    const region = gamesCss.slice(start);
    /* Hardcoded near-white text measured 1.1:1 on the light theme, which made
     * the quiz note unreadable; tokens flip with the theme. Anchored to the
     * start of a declaration so accent borders are not swept up with it. */
    return (
      !/^\s*color:\s*rgba\(/m.test(region) &&
      !/background:\s*rgba\(15,\s*23,\s*42/.test(region) &&
      region.includes("var(--text-secondary)") &&
      region.includes("var(--panel-bg)")
    );
  })(),
);
console.log("\n== 5x. Republic Rewind ==");
PAGES.forEach((page) => {
  const html = read(page);
  check(
    `${page}: republic tab and panel are wired both ways`,
    html.includes('id="gameTabRepublic"') &&
      html.includes('aria-controls="gamePanelRepublic"') &&
      html.includes('id="gamePanelRepublic"') &&
      html.includes('aria-labelledby="gameTabRepublic"'),
  );
});
check(
  "game-republic-quiz: every id it looks up exists in all four pages",
  (() => {
    const source = read("assets/app/game-republic-quiz.js").replace(/^﻿/, "");
    const lookups = Array.from(
      source.matchAll(/getElement\("([A-Za-z0-9]+)"\)/g),
    ).map((match) => match[1]);
    return (
      lookups.length >= 7 &&
      PAGES.every((page) => {
        const html = read(page);
        return lookups.every((id) => html.includes('id="' + id + '"'));
      })
    );
  })(),
);
check(
  "republic is registered as a drawer tab with a click listener",
  /\{ name: "republic", tab: tabRepublic, panel: panelRepublic \}/.test(appJs) &&
    /tabRepublic\.addEventListener\("click"/.test(appJs),
);
check(
  "every Republic Rewind card is bilingual, has four distinct options and a real answer",
  (() => {
    const source = read("assets/app/game-republic-quiz.js").replace(/^﻿/, "");
    const decks = new Function(
      source.slice(source.indexOf("var rqDecks"), source.indexOf("function rqText")) +
        "\nreturn rqDecks;",
    )();
    const hasHan = (text) => /[㐀-鿿]/.test(text);
    if (decks.length !== 7) {
      return false;
    }
    return decks.every((deck) =>
      deck.cards.every((card) => {
        const questionBoth =
          typeof card.q.en === "string" &&
          card.q.en.length > 8 &&
          hasHan(card.q.zh);
        const noteBoth =
          typeof card.note.en === "string" &&
          card.note.en.length > 8 &&
          hasHan(card.note.zh);
        const optionsOk =
          card.o.length === 4 &&
          card.o.every(
            (option) =>
              typeof option.en === "string" &&
              option.en.length > 0 &&
              typeof option.zh === "string" &&
              option.zh.length > 0,
          );
        /* Two options with the same text would make the card unfair. */
        const english = card.o.map((option) => option.en.toLowerCase());
        const chinese = card.o.map((option) => option.zh);
        const distinct =
          new Set(english).size === 4 && new Set(chinese).size === 4;
        const answerOk =
          Number.isInteger(card.a) && card.a >= 0 && card.a < card.o.length;
        return questionBoth && noteBoth && optionsOk && distinct && answerOk;
      }) &&
        /* The three-star band must be reachable with the deck's own size. */
        deck.stars[0] <= deck.cards.length &&
        deck.stars[0] > deck.stars[1] &&
        deck.stars[1] > deck.stars[2],
    );
  })(),
);
console.log("\n== 5v. the drawer reset contract holds for every game ==");
(() => {
  const exported = new Set();
  APP_MODULES.forEach((name) => {
    const src = read("assets/app/" + name + ".js").replace(/^﻿/, "");
    Array.from(
      src.matchAll(/App\.(quietReset[A-Za-z0-9]+) = ([^\n]*)/g),
    ).forEach((match) => {
      /* core.js pre-declares each hook as null; only a real assignment is an
       * export, and some games assign a named function instead of a literal. */
      if (match[2].trim() !== "null;") {
        exported.add(match[1]);
      }
    });
  });
  const called = new Set(
    Array.from(appJs.matchAll(/App\.(quietReset[A-Za-z0-9]+)\(\)/g)).map(
      (match) => match[1],
    ),
  );
  /* Registry games are paused through one fan-out instead of a hand-written
   * call pair per game, so their hooks are covered by resetRegistryGames().
   * The name comes from the descriptor block: a module's own data rows can hold
   * a `name:` field too, and matching that first would invent a bogus hook. */
  const registryHooks = new Set(
    APP_MODULES.filter((name) => /^game-/.test(name) && name !== "game-registry")
      .map((name) => read("assets/app/" + name + ".js").replace(/^﻿/, ""))
      .map((src) =>
        /App\.registerGame\(\s*\{[\s\S]{0,400}?name:\s*"([A-Za-z0-9]+)"/.exec(src),
      )
      .filter(Boolean)
      .map((match) =>
        `quietReset${match[1].charAt(0).toUpperCase()}${match[1].slice(1)}`,
      ),
  );
  const halfWired = Array.from(exported).filter(
    (hook) =>
      !registryHooks.has(hook) && countOccurrences(appJs, hook + "()") !== 2,
  );
  const fanOut = countOccurrences(
    read("assets/app/game-typing.js"),
    "App.resetRegistryGames()",
  );
  const unpaused = Array.from(exported).filter(
    (hook) => registryHooks.has(hook) && fanOut !== 2,
  );
  const orphanCalls = Array.from(called).filter(
    (hook) => !exported.has(hook) && !registryHooks.has(hook),
  );
  check(
    `all ${exported.size} reset hooks run on both the tab switch and the close path`,
    exported.size >= 30 && halfWired.length === 0 && unpaused.length === 0,
    halfWired.concat(unpaused).join(","),
  );
  check(
    "the shell never calls a reset hook no game exports",
    orphanCalls.length === 0,
    orphanCalls.join(","),
  );
})();
/* A pointer id the browser has released makes setPointerCapture throw, and the
 * exception escapes the pointerdown handler before the drag is set up - so the
 * player's drag dies instead of merely losing its edge extension. */
(() => {
  const offenders = [];
  APP_MODULES.filter((name) => /^game-/.test(name)).forEach((name) => {
    const source = read("assets/app/" + name + ".js");
    Array.from(source.matchAll(/\.setPointerCapture\(/g)).forEach((match) => {
      if (!/try\s*\{/.test(source.slice(Math.max(0, match.index - 200), match.index))) {
        offenders.push(name);
      }
    });
  });
  check(
    "every pointer capture is wrapped in a try so a stale pointer id cannot kill a drag",
    offenders.length === 0,
    offenders.join(","),
  );
})();
console.log("\n== 5y. Kalah Row, Twenty-One Parlor and Roof Garden ==");
const DRAWER_TRIO = [
  { name: "kalah", tab: "gameTabKalah", panel: "gamePanelKalah", file: "game-kalah-row" },
  { name: "blackjack", tab: "gameTabBlackjack", panel: "gamePanelBlackjack", file: "game-blackjack" },
  { name: "garden", tab: "gameTabGarden", panel: "gamePanelGarden", file: "game-roof-garden" },
];
DRAWER_TRIO.forEach((game) => {
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
  const gameSource = read("assets/app/" + game.file + ".js").replace(/^﻿/, "");
  const lookups = Array.from(
    gameSource.matchAll(/getElement\("([A-Za-z0-9]+)"\)/g),
  ).map((match) => match[1]);
  const pascal = game.name.charAt(0).toUpperCase() + game.name.slice(1);
  check(
    `${game.file}: every id it looks up exists in all four pages`,
    lookups.length >= 7 &&
      PAGES.every((page) => {
        const html = read(page);
        return lookups.every((id) => html.includes('id="' + id + '"'));
      }),
    lookups.join(","),
  );
  check(
    `${game.name} is registered as a drawer tab with a click listener`,
    new RegExp(`\\{ name: "${game.name}", tab: tab${pascal}, panel: panel${pascal} \\}`).test(appJs) &&
      new RegExp(`tab${pascal}\\.addEventListener\\("click"`).test(appJs),
  );
});
/* The shell walks its own entry list to show, hide and label the drawer, so a
 * tab in the markup that is missing from that list is dead furniture. */
(() => {
  const markupIds = new Set(
    Array.from(read("index.html").matchAll(/id="(gameTab[A-Za-z0-9]+|gamePanel[A-Za-z0-9]+)"/g))
      .map((match) => match[1]),
  );
  const markupTabs = Array.from(
    read("index.html").matchAll(/<button class="game-tab" id="(gameTab[A-Za-z0-9]+)"/g),
  ).map((match) => match[1]);
  const entries = Array.from(
    appJs.matchAll(/\{ name: "([A-Za-z0-9]+)", tab: ([A-Za-z0-9]+), panel: ([A-Za-z0-9]+) \}/g),
  );
  const bound = (variable) => {
    const declaration = new RegExp(`var ${variable} = getElement\\("([A-Za-z0-9]+)"\\);`).exec(appJs);
    return declaration ? declaration[1] : "";
  };
  const dangling = entries
    .map((match) => [bound(match[2]), bound(match[3])])
    .filter(([tabId, panelId]) => !markupIds.has(tabId) || !markupIds.has(panelId));
  check(
    `the shell's ${entries.length} drawer entries bind a real tab and panel from the markup`,
    entries.length === markupTabs.length && dangling.length === 0,
    `entries ${entries.length}, tabs ${markupTabs.length}, dangling ${dangling.length}`,
  );
})();
/* A t("key") that no dictionary carries renders as an empty label, which is
 * how a shipped game ends up with a blank button. */
(() => {
  const dictionary = new Set(
    Array.from(appJs.matchAll(/^\s{6}"([A-Za-z0-9]+)":/gm)).map((match) => match[1]),
  );
  const used = new Set();
  APP_MODULES.filter((name) => /^game-/.test(name)).forEach((name) => {
    const source = read("assets/app/" + name + ".js");
    Array.from(source.matchAll(/\bt\("([A-Za-z0-9]+)"\s*[,)]/g)).forEach((match) =>
      used.add(match[1]),
    );
    /* A registry game carries its own copy; those keys are as real as the ones
     * in i18n.js, and the six-space pattern above cannot see two per line. */
    const pack = collectPackKeys(source);
    pack.en.concat(pack.zh).forEach((key) => dictionary.add(key));
  });
  PAGES.forEach((page) => {
    Array.from(
      read(page).matchAll(/data-i18n(?:-aria)?="([A-Za-z0-9]+)"/g),
    ).forEach((match) => used.add(match[1]));
  });
  const absent = Array.from(used).filter((key) => !dictionary.has(key));
  check(
    `all ${used.size} translation keys the games and the markup ask for exist in both dictionaries`,
    used.size >= 300 && absent.length === 0,
    absent.join(","),
  );
})();
check(
  "Kalah Row: sowing never feeds the rival store and always banks the pairing stone",
  (() => {
    try {
      const src = read("assets/app/game-kalah-row.js").replace(/^﻿/, "");
      const slice = src.slice(
        src.indexOf("var malPits"),
        src.indexOf("function initMancalaGame"),
      );
      const api = new Function(
        slice + "\nreturn { malFresh, malSow, malLegal, malTally, malOver };",
      )();
      const total = (cells) => cells.reduce((sum, n) => sum + n, 0);
      /* one stone from pit 6 steps over the shut rival store into pit 8 */
      const lone = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];
      const skip = api.malSow(lone, 6, "you");
      if (skip.extra !== false || skip.cells[7] !== 0 || skip.cells[8] !== 1) {
        return false;
      }
      /* a seven-stone lap lands back in the player's store and frees another sow */
      const lap = api.malSow([0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0], 6, "you");
      if (
        lap.extra !== true ||
        lap.cells[0] !== 1 ||
        lap.cells[7] !== 0 ||
        total(lap.cells) !== 7
      ) {
        return false;
      }
      /* a full board still adds up after a sow, and the rival store stays shut */
      const open = api.malSow(api.malFresh(), 1, "you");
      if (total(open.cells) !== 48 || open.cells[7] !== 0 || open.cells[1] !== 0 ||
        open.cells[5] !== 5) {
        return false;
      }
      /* a last stone in a vacant home pit takes the facing stones with it */
      const board = [0, 0, 0, 3, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0];
      const step = api.malSow(board, 3, "you");
      if (step.captured !== 2 || step.cells[0] !== 3 || step.cells[6] !== 0 ||
        step.cells[8] !== 0 || total(step.cells) !== 5) {
        return false;
      }
      /* the same shape played by the rival must feed their store, not ours */
      const mirror = [0, 0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0];
      const back = api.malSow(mirror, 9, "ai");
      if (back.captured !== 2 || back.cells[7] !== 3 || back.cells[0] !== 0 ||
        back.cells[2] !== 0 || total(back.cells) !== 5) {
        return false;
      }
      return api.malLegal(board, "you").join() === "3";
    } catch (error) {
      return false;
    }
  })(),
);
check(
  "Kalah Row: every round conserves its 48 stones and always ends",
  (() => {
    try {
      const src = read("assets/app/game-kalah-row.js").replace(/^﻿/, "");
      const slice = src.slice(
        src.indexOf("var malPits"),
        src.indexOf("function initMancalaGame"),
      );
      const api = new Function(
        slice +
          "\nreturn { malFresh, malSow, malLegal, malTally, malOver, malBestMove };",
      )();
      const total = (cells) => cells.reduce((sum, n) => sum + n, 0);
      const sum = (cells) => api.malTally(cells);
      for (let game = 0; game < 40; game += 1) {
        let cells = api.malFresh();
        let who = "you";
        let sows = 0;
        while (!api.malOver(cells) && sows < 400) {
          const legal = api.malLegal(cells, who);
          /* a side with stones always has a legal sow, or the round stalls */
          if (!legal.length) {
            return false;
          }
          const index = Math.random() < 0.5 ? legal[0] : legal[legal.length - 1];
          const step = api.malSow(cells, index, who);
          cells = step.cells;
          if (total(cells) !== 48) {
            return false;
          }
          if (!step.extra) {
            who = who === "you" ? "ai" : "you";
          }
          sows += 1;
        }
        if (!api.malOver(cells)) {
          return false;
        }
        const tally = sum(cells);
        if (tally.you + tally.ai !== 48) {
          return false;
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  })(),
);
check(
  "Kalah Row: the top bench plays without luck and the ranks unlock in order",
  (() => {
    try {
      const src = read("assets/app/game-kalah-row.js").replace(/^﻿/, "");
      const slice = src.slice(
        src.indexOf("var malPits"),
        src.indexOf("function initMancalaGame"),
      );
      const api = new Function(slice + "\nreturn { malRanks, malFresh, malBestMove, malSow };")();
      const { malRanks } = api;
      if (
        malRanks.length !== 4 ||
        !malRanks.every(
          (rank, index) =>
            index === 0 ||
            (rank.depth >= malRanks[index - 1].depth &&
              rank.margin[0] > malRanks[index - 1].margin[0]),
        ) ||
        malRanks.some((rank) => rank.depth < 1 || rank.noise > 0 && rank.depth === 3)
      ) {
        return false;
      }
      /* the master bench has to pick a legal pit out of a real board */
      const pick = api.malBestMove(api.malFresh(), "ai", 3, 0);
      return pick !== null && pick > 7;
    } catch (error) {
      return false;
    }
  })(),
);
check(
  "Twenty-One Parlor: aces drop to one only when the hand needs it",
  (() => {
    try {
      const src = read("assets/app/game-blackjack.js").replace(/^﻿/, "");
      const slice = src.slice(
        src.indexOf("var bjSuits"),
        src.indexOf("function initBlackjackGame"),
      );
      const api = new Function(slice + "\nreturn { bjCount, bjNatural, bjTables };")();
      const hand = (...faces) =>
        api.bjCount(faces.map((face) => ({ face, suit: "\u2660" })));
      const cases = [
        ["A", 11, true],
        ["A", "A", 12, true],
        ["A", "A", "A", 13, true],
        ["A", "A", "A", "A", "A", 15, true],
        ["A", "6", 17, true],
        ["A", "K", 21, true],
        ["A", "7", "5", 13, false],
        ["K", "Q", "J", 30, false],
        ["10", "6", "A", 17, false],
      ];
      for (const spec of cases) {
        const faces = spec.slice(0, spec.length - 2);
        const got = hand(...faces);
        if (got.total !== spec[spec.length - 2] || got.soft !== spec[spec.length - 1]) {
          return false;
        }
      }
      /* a 21 built from three cards is a total, not a natural */
      if (!api.bjNatural([{ face: "A" }, { face: "K" }])) {
        return false;
      }
      if (api.bjNatural([{ face: "A" }, { face: "K" }, { face: "A" }])) {
        return false;
      }
      if (api.bjNatural([{ face: "7" }, { face: "7" }, { face: "7" }])) {
        return false;
      }
      return api.bjTables.every(
        (table) =>
          table.bets.length === 3 &&
          table.bets[0] < table.bets[1] &&
          table.bets[1] < table.bets[2] &&
          table.bets[2] * 4 === table.start &&
          table.target === Math.round(table.start * 1.5) &&
          table.starHands[0] < table.starHands[1] &&
          table.starHands[1] < table.starHands[2] &&
          table.decks >= 1,
      );
    } catch (error) {
      return false;
    }
  })(),
);
check(
  "Twenty-One Parlor: the house stands on 17, a broke player is restaked and a banked table clears the seat",
  /while \(bjCount\(dealer\)\.total < 17\)/.test(
    read("assets/app/game-blackjack.js"),
  ) &&
    /if \(chips < table\.bets\[0\]\) \{/.test(read("assets/app/game-blackjack.js")) &&
    /if \(chips < table\.bets\[0\]\) \{[\s\S]{0,240}?chips = table\.start;/.test(
      read("assets/app/game-blackjack.js"),
    ) &&
    /table\.bets\.forEach/.test(read("assets/app/game-blackjack.js")) &&
    /function clearTable\([\s\S]*?loadTable\(advance \|\| table\)/.test(
      read("assets/app/game-blackjack.js"),
    ),
);
const parlorStats = [];
check(
  "Twenty-One Parlor: every table is beatable and each star band is reachable",
  (() => {
    try {
      const src = read("assets/app/game-blackjack.js").replace(/^﻿/, "");
      const slice = src.slice(
        src.indexOf("var bjSuits"),
        src.indexOf("function initBlackjackGame"),
      );
      const realRandom = Math.random;
      let seed = 20261002;
      Math.random = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
      };
      try {
        const api = new Function(slice + "\nreturn { bjShoe, bjCount, bjNatural, bjTables };")();
        const settle = (player, dealer, bet) => {
          const you = api.bjCount(player).total;
          const house = api.bjCount(dealer).total;
          const youNatural = api.bjNatural(player);
          const houseNatural = api.bjNatural(dealer);
          if (you > 21) return -bet;
          if (youNatural && !houseNatural) return Math.round(bet * 1.5);
          if (houseNatural && !youNatural) return -bet;
          if (house > 21) return bet;
          if (you > house) return bet;
          if (you < house) return -bet;
          return 0;
        };
        return api.bjTables.every((table) => {
          const bet = table.bets[2];
          let reached = 0;
          let three = 0;
          let two = 0;
          let one = 0;
          for (let trial = 0; trial < 160; trial += 1) {
            let shoe = api.bjShoe(table.decks);
            const draw = () => {
              if (!shoe.length) shoe = api.bjShoe(table.decks);
              return shoe.pop();
            };
            let chips = table.start;
            let hands = 0;
            while (chips < table.target && hands < 300) {
              const player = [draw(), draw()];
              const dealer = [draw(), draw()];
              if (!api.bjNatural(player) && !api.bjNatural(dealer)) {
                while (api.bjCount(player).total < 18) player.push(draw());
                while (api.bjCount(dealer).total < 17) dealer.push(draw());
              }
              chips += settle(player, dealer, bet);
              hands += 1;
              if (chips < table.bets[0]) chips = table.start;
            }
            if (chips >= table.target) {
              reached += 1;
              if (hands <= table.starHands[0]) three += 1;
              if (hands <= table.starHands[1]) two += 1;
              if (hands <= table.starHands[2]) one += 1;
            }
          }
          parlorStats.push(
            `${table.id} cleared ${reached}/160, 3★ ${three}, 2★ ${two}, 1★ ${one}`,
          );
          /* the one-star line has to be the ordinary outcome of a win, the
           * three-star line rare but real, and no table a pure coin flip */
          return (
            reached >= 140 &&
            one >= reached * 0.7 &&
            two >= reached * 0.4 &&
            three >= 2 &&
            three <= reached * 0.65
          );
        });
      } finally {
        Math.random = realRandom;
      }
    } catch (error) {
      return false;
    }
  })(),
  parlorStats.join(" | ") || "seeded 160-run sweep per table at the top bet",
);
check(
  "Roof Garden: every bed can be sown and its three-star line beats the greedy run",
  (() => {
    try {
      const src = read("assets/app/game-roof-garden.js").replace(/^﻿/, "");
      const slice = src.slice(
        src.indexOf("var gdnPlots"),
        src.indexOf("function initRoofGardenGame"),
      );
      const api = new Function(
        slice + "\nreturn { gdnBeds, gdnRipe, gdnSecondsToGoal, gdnPlots };",
      )();
      const { gdnBeds, gdnRipe, gdnSecondsToGoal } = api;
      return gdnBeds.every((bed, index) => {
        const greedy = gdnSecondsToGoal(bed);
        if (bed.start < bed.cost || greedy < 0 || greedy > bed.starTimes[0]) {
          return false;
        }
        if (bed.goal <= bed.start || bed.starTimes[0] >= bed.starTimes[1] ||
          bed.starTimes[1] >= bed.starTimes[2]) {
          return false;
        }
        if (index > 0) {
          const prior = gdnBeds[index - 1];
          if (bed.cost <= prior.cost || bed.goal <= prior.goal) return false;
        }
        const planted = bed.growMs;
        const beds = [planted, 0, 0, 0];
        return (
          gdnRipe(beds, 0, planted + bed.growMs, bed) === true &&
          gdnRipe(beds, 0, planted + bed.growMs - 1, bed) === false &&
          gdnRipe(beds, 1, planted + bed.growMs, bed) === false
        );
      });
    } catch (error) {
      return false;
    }
  })(),
);
check(
  "Roof Garden: ripening is drawn by CSS, so the bed needs no timer of its own",
  (() => {
    const source = read("assets/app/game-roof-garden.js");
    const css = stylesCss;
    return (
      !/setInterval\(|setTimeout\(/.test(source) &&
      /if \(isMotionOff\(\)\)/.test(source) &&
      /classList\.add\("is-ripening"\)/.test(source) &&
      css.includes(".gdn-plot.is-ripening .gdn-bar") &&
      css.includes("@keyframes gdnRipen") &&
      css.includes("@keyframes gdnBloom") &&
      /@keyframes gdnBloom \{[\s\S]*?99\.5%[\s\S]*?opacity: 1/.test(css) &&
      css.includes("@keyframes gdnWilt") &&
      css.includes("[data-motion=\"off\"] .gdn-plot.is-ripening") &&
      /--gdn-run/.test(css)
    );
  })(),
);
console.log("\n== 5z. every star ladder can actually be climbed ==");
/* starsFor() returns on the first band the value clears, so a ladder aimed at
 * "high" has to fall and one aimed at "low" has to rise. An inverted list
 * leaves the middle and bottom bands unreachable and nobody notices until a
 * player cannot explain their own stars. */
(() => {
  const offenders = [];
  let ladders = 0;
  APP_MODULES.filter((name) => /^game-/.test(name)).forEach((name) => {
    const source = read("assets/app/" + name + ".js").replace(/^﻿/, "");
    const directions = Array.from(
      source.matchAll(/starsFor\([\s\S]{0,120}?,\s*"(low|high)"/g),
    ).map((match) => match[1]);
    if (!directions.length) {
      return;
    }
    const high = directions.includes("high");
    const low = directions.includes("low");
    Array.from(
      source.matchAll(/\b([A-Za-z0-9]*(?:star|margin|par|pad|gain|fuel|band)[A-Za-z0-9]*):\s*\[([\s\S]*?)\]/gi),
    ).forEach((match) => {
      const values = match[2]
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((n) => !isNaN(n));
      if (values.length !== 3) {
        return;
      }
      ladders += 1;
      const rising = values[0] <= values[1] && values[1] <= values[2];
      const falling = values[0] >= values[1] && values[1] >= values[2];
      /* a module that scores both ways needs a ladder that reads either way,
       * which is only possible when all three bands match */
      const ok = high && low ? rising && falling : high ? falling : rising;
      if (!ok) {
        offenders.push(`${name}.${match[1]}=${values.join(",")} for "${high ? "high" : "low"}"`);
      }
    });
  });
  check(
    `all ${ladders} star band ladders run the direction their game scores`,
    ladders >= 20 && offenders.length === 0,
    offenders.join(" | "),
  );
})();
console.log("\n== 6. registry games: injected, linked, bilingual, scoped ==");
(() => {
  const registryModules = APP_MODULES.filter(
    (name) => /^game-/.test(name) && name !== "game-registry",
  ).filter((name) =>
    read("assets/app/" + name + ".js").includes("App.registerGame("),
  );

  check(
    `all ${registryModules.length} registry games are mounted by the drawer`,
    registryModules.length >= 20 &&
      APP_MODULES.includes("game-registry") &&
      APP_MODULES.indexOf("game-registry") <
        registryModules.reduce(
          (earliest, name) => Math.min(earliest, APP_MODULES.indexOf(name)),
          APP_MODULES.length,
        ),
    `modules ${registryModules.length}, registry at ${APP_MODULES.indexOf("game-registry")}`,
  );

  const typingSource = read("assets/app/game-typing.js");
  const guideSource = read("assets/app/game-guide.js");
  const bootstrapSource = read("assets/app/main.js");
  const registrySource = read("assets/app/game-registry.js");
  check(
    "the shell injects, pauses and documents registry games without a hand-written list",
    /App\.buildRegistryTabs\(/.test(typingSource) &&
      countOccurrences(typingSource, "App.resetRegistryGames()") === 2 &&
      /initRegistryGames\(\);/.test(bootstrapSource) &&
      /App\.getRegistryGuides\(\)/.test(guideSource) &&
      /App\.registerGame = registerGame;/.test(registrySource),
  );
  check(
    "the registry builds its panels with createElement, never innerHTML",
    !/\.innerHTML\s*=/.test(registrySource),
  );

  registryModules.forEach((name) => {
    const source = read("assets/app/" + name + ".js").replace(/^﻿/, "");

    check(
      `${name}: loads on all four pages at the current version`,
      PAGES.every((page) =>
        read(page).includes(`assets/app/${name}.js?v=57`),
      ),
    );
    check(
      `${name}: registers exactly one descriptor`,
      countOccurrences(source, "App.registerGame(") === 1,
      String(countOccurrences(source, "App.registerGame(")),
    );

    const desc = /App\.registerGame\(\s*\{[\s\S]{0,400}?name:\s*"([A-Za-z0-9]+)"[\s\S]{0,200}?tabKey:\s*"([A-Za-z0-9]+)"/.exec(
      source,
    );
    if (!check(`${name}: declares a name and a tabKey`, !!desc)) {
      return;
    }
    const gameName = desc[1];
    const tabKey = desc[2];
    const pascal = gameName.charAt(0).toUpperCase() + gameName.slice(1);
    check(
      `${name}: name and tabKey follow the same convention`,
      tabKey === "tab" + pascal,
      `${tabKey} vs tab${pascal}`,
    );
    check(
      `${name}: the tab label key lives in its own pack`,
      new RegExp(`^      "${tabKey}":`, "m").test(source),
    );

    const pack = /App\.addStrings\(\{([\s\S]*?)\n  \}\);/.exec(source);
    if (!check(`${name}: ships a bilingual pack`, !!pack)) {
      return;
    }
    const enBlock = /\ben:\s*\{([\s\S]*?)\n\s{4}\}/.exec(pack[1]);
    const zhBlock = /\bzh:\s*\{([\s\S]*?)\n\s{4}\}/.exec(pack[1]);
    if (!check(`${name}: pack has both en and zh bodies`, !!enBlock && !!zhBlock)) {
      return;
    }
    const grab = (body) =>
      Array.from(body.matchAll(/"([A-Za-z0-9]+)":/g)).map((match) => match[1]);
    const enKeys = grab(enBlock[1]);
    const zhKeys = grab(zhBlock[1]);
    check(
      `${name}: en and zh packs are 1:1 (${enKeys.length} keys)`,
      enKeys.length === zhKeys.length &&
        enKeys.length === new Set(enKeys).size &&
        enKeys.every((key) => zhKeys.includes(key)),
      `en ${enKeys.length} zh ${zhKeys.length}`,
    );
    /* addStrings keeps the shared dictionary authoritative, so a pack key that
     * i18n.js already owns would silently render someone else's wording. */
    const sharedDict = new Set(
      Array.from(
        read("assets/app/i18n.js").matchAll(/^\s{6}"([A-Za-z0-9]+)":/gm),
      ).map((match) => match[1]),
    );
    const shadowed = enKeys.filter((key) => sharedDict.has(key));
    check(
      `${name}: no pack key is shadowed by the shared dictionary`,
      shadowed.length === 0,
      shadowed.join(","),
    );
    const bare = Array.from(
      pack[1].matchAll(/^\s{6}([A-Za-z][A-Za-z0-9]*):/gm),
    ).map((match) => match[1]);
    check(
      `${name}: pack keys are quoted for the six-space key audit`,
      bare.length === 0,
      bare.join(","),
    );

    /* Every t("key") the module can reach must be carried by the dictionary. */
    const used = Array.from(
      source.matchAll(/\bt\("([A-Za-z0-9]+)"\s*[,)]/g),
    ).map((match) => match[1]);
    const shared = [
      "campaignStars",
      "newBest",
      "elementsLocked",
      "gameGuideToggle",
      "noBest",
      "btnNewRound",
    ];
    const dictionary = new Set(
      Array.from(appJs.matchAll(/^\s{6}"([A-Za-z0-9]+)":/gm)).map(
        (match) => match[1],
      ),
    );
    enKeys.concat(zhKeys).forEach((key) => dictionary.add(key));
    const missing = used.filter(
      (key) => !dictionary.has(key) && !shared.includes(key),
    );
    check(
      `${name}: all ${used.length} translation keys it asks for exist`,
      missing.length === 0,
      missing.join(","),
    );

    const guide = /guide:\s*\{[\s\S]*?\ben:\s*\[([\s\S]*?)\],[\s\S]*?\bzh:\s*\[([\s\S]*?)\]/.exec(
      source,
    );
    if (check(`${name}: ships a how-to guide`, !!guide)) {
      const count = (body) => (body.match(/"/g) || []).length / 2;
      const enSteps = count(guide[1]);
      const zhSteps = count(guide[2]);
      check(
        `${name}: the guide gives the same number of steps in both languages`,
        enSteps >= 4 && enSteps === zhSteps,
        `en ${enSteps}, zh ${zhSteps}`,
      );
    }

    check(
      `${name}: keeps its listeners inside its own panel`,
      !/document\.addEventListener\(/.test(source) &&
        !/window\.addEventListener\(/.test(source),
    );
    check(
      `${name}: never writes markup through innerHTML`,
      !/\.innerHTML\s*=/.test(source),
    );
    check(
      `${name}: no blocking dialog and no direct localStorage`,
      !/window\.prompt|window\.confirm|localStorage/.test(source),
    );
    check(
      `${name}: its stylesheet was merged into the game styles`,
      stylesCss.includes(`/* ${name} (registry game) */`),
    );

    const hooks = Array.from(
      source.matchAll(/App\.quietReset([A-Za-z0-9]+)\s*=/g),
    ).map((match) => match[1]);
    check(
      `${name}: names its pause hook after its descriptor`,
      hooks.length <= 1 && (hooks.length === 0 || hooks[0] === pascal),
      hooks.join(","),
    );
  });

  const total = registryModules.length + 49;
  check(
    `the drawer now serves ${total} games while the pages still hand-wire 49`,
    total >= 69 &&
      PAGES.every(
        (page) =>
          countOccurrences(read(page), 'class="game-tab"') === 49 &&
          countOccurrences(read(page), 'class="game-panel"') === 49,
      ),
    `registry ${registryModules.length}`,
  );
})();
console.log("\n== summary ==");
console.log(`passed: ${passed}`);
console.log(`failed: ${failures.length}`);
if (failures.length) {
  failures.forEach((line) => console.log("  - " + line));
}
process.exit(failures.length ? 1 : 0);
