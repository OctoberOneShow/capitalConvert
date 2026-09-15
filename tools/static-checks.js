#!/usr/bin/env node
/*
 * Static acceptance checks for the pet companion change.
 *
 *   1. the four pages still expose exactly 6 game tabs / 6 game panels
 *   2. both shared assets are requested with ?v=15 on all four pages
 *   3. only the cache-busting string changed on the asset lines of each page
 *   4. the pet markup is NOT present in any HTML file (it is JS-injected)
 *   5. UTF-8 / CJK integrity (BOM, no U+FFFD, no latin1 mojibake, sample strings)
 *   5b. the Glyph Match level ladder (keys, defensive storage, JS-injected
 *      level cells)
 *   5c. Elements (pure simulation core, challenges, canvas rendering, keyboard
 *      path, cancellable loop, versioned storage)
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
PAGES.forEach((page) => {
  const html = read(page);
  const tabs = countOccurrences(html, 'class="game-tab"');
  const panels = countOccurrences(html, 'class="game-panel"');
  check(`${page}: exactly 6 game-tab`, tabs === 6, `found ${tabs}`);
  check(`${page}: exactly 6 game-panel`, panels === 6, `found ${panels}`);
  check(
    `${page}: stylesheet requested as ?v=15`,
    html.includes("assets/styles.css?v=15"),
  );
  check(
    `${page}: script requested as ?v=15`,
    html.includes("assets/app.js?v=15"),
  );
  check(
    `${page}: no stale ?v=14 / ?v=13 / ?v=12 / ?v=11 / ?v=10 / ?v=9 / ?v=8 / ?v=7 / ?v=6 / ?v=5 / ?v=4 left`,
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
    .filter((line) => /assets\/(app\.js|styles\.css)\?v=/.test(line));
  check(
    `${page}: exactly 2 versioned asset references`,
    assetLines.length === 2,
    `found ${assetLines.length}`,
  );
  check(
    `${page}: both asset references are ?v=15`,
    assetLines.every((line) => line.includes("?v=15")),
    assetLines.join(" | "),
  );

  const headAssetLines = gitShow("HEAD", page)
    .split("\n")
    .filter((line) => /assets\/(app\.js|styles\.css)\?v=/.test(line));
  const normalizeVersion = (line) =>
    line.replace(/\?v=\d+/, "?v=<version>");
  // Keep this check version-agnostic so it validates future bumps too.
  check(
    `${page}: asset lines differ from HEAD only by the version bump`,
    assetLines.every((line) => {
      const needle = line.includes("styles.css") ? "assets/styles.css" : "assets/app.js";
      const headLine = headAssetLines.find((candidate) => candidate.includes(needle));
      return !!headLine && normalizeVersion(headLine) === normalizeVersion(line);
    }),
    "asset reference shape changed beyond version token",
  );
});

console.log("\n== 4. pet markup stays out of the HTML files ==");
PAGES.forEach((page) => {
  const html = read(page);
  check(`${page}: no injected pet markup in the page`, !/pet-|petWidget|petAdopt/.test(html));
});

console.log("\n== 5. encoding / CJK integrity ==");
const appJs = read("assets/app.js");
const stylesCss = read("assets/styles.css");
const bom = fs.readFileSync(path.join(root, "assets/app.js")).subarray(0, 3);
check(
  "assets/app.js keeps its UTF-8 BOM",
  bom[0] === 0xef && bom[1] === 0xbb && bom[2] === 0xbf,
  Array.from(bom)
    .map((b) => b.toString(16))
    .join(" "),
);
[
  ["assets/app.js", appJs],
  ["assets/styles.css", stylesCss],
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
  check(`assets/app.js still contains "${sample}"`, appJs.includes(sample));
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
    `${page}: the palette is six real buttons with pressed states`,
    countOccurrences(html, 'class="elements-tool"') === 6 &&
      countOccurrences(html, 'aria-pressed="false"') >= 6 &&
      html.includes('data-element="water"') &&
      html.includes('data-element="fire"'),
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
  const drawer = html.slice(drawerStart, html.indexOf('<script src="assets/app.js'));
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
    /var quietResetElements = null;/.test(appJs) &&
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
const elementsStart = appJs.indexOf("function createElementsSim");
const elementsJs =
  elementsStart === -1 ? "" : appJs.slice(elementsStart, appJs.indexOf("function initG2048"));
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
    ["empty", "stone", "sand", "water", "plant", "fire"].every((name) =>
      read(page).includes('data-element="' + name + '"'),
    ),
  ),
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
      const core = elementsJs.slice(0, elementsJs.indexOf("\n  function initElements"));
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
  "the element set is empty, stone, sand, water, plant and fire",
  /var EMPTY = 0;/.test(elementsJs) &&
    /var STONE = 1;/.test(elementsJs) &&
    /var SAND = 2;/.test(elementsJs) &&
    /var WATER = 3;/.test(elementsJs) &&
    /var PLANT = 4;/.test(elementsJs) &&
    /var FIRE = 5;/.test(elementsJs),
);
check(
  "sand falls, sinks through water and piles diagonally",
  /function moveSand/.test(elementsJs) &&
    /cells\[below\] === EMPTY \|\| cells\[below\] === WATER/.test(elementsJs) &&
    /function swap/.test(elementsJs),
);
check(
  "water falls and then spreads sideways so it levels out",
  /spread = 3/.test(elementsJs) &&
    /function flowReach/.test(elementsJs) &&
    /function moveWater/.test(elementsJs),
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
    !/Math\.random/.test(elementsJs),
);
check(
  "out-of-bounds writes are refused, counted and hashed against",
  /outOfRangeWrites \+= 1;/.test(elementsJs) &&
    /outOfRangeWrites: function \(\)/.test(elementsJs) &&
    /function hash\(\)/.test(elementsJs),
);
check(
  "four challenges declare a goal, a limit and a palette each",
  countOccurrences(appJs, 'labelKey: "elementsChallenge') === 4 &&
    countOccurrences(appJs, "goalKey:") === 4 &&
    countOccurrences(appJs, "tools: [") === 4 &&
    /limit: 60/.test(appJs) &&
    /limit: 20/.test(appJs),
);
check(
  "free play is the one board with no clock and every tool",
  /id: "free",[\s\S]{0,240}?limit: 0,[\s\S]{0,80}?"empty", "stone", "sand", "water", "plant", "fire"/.test(
    appJs,
  ),
);
check(
  "the three win conditions are the documented ones",
  /topPlant === 0/.test(elementsJs) &&
    /done: fires === 0/.test(elementsJs) &&
    /done: zoneTarget > 0 && wet >= zoneTarget/.test(elementsJs),
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
  "the flood board marks a target zone and refuses paint below its rim",
  /function buildFlood/.test(elementsJs) &&
    /zone = \{ x0: left \+ 3/.test(elementsJs) &&
    /aboveRow = rim;/.test(elementsJs) &&
    /aboveRow >= 0 && y >= aboveRow/.test(elementsJs) &&
    /zoneTarget = Math\.ceil\(/.test(elementsJs),
);
check(
  "the brush never overwrites a solid cell and the eraser clears anything",
  /if \(cells\[cell\] !== EMPTY\) \{\s*return false;/.test(elementsJs) &&
    /if \(value === EMPTY\) \{/.test(elementsJs) &&
    /return set\(x, y, value\);/.test(elementsJs),
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
  /window\.setInterval\(tick, elementsTickMs\)/.test(appJs) &&
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
    /var frozen = boardArmed\(\);\s*if \(!frozen\) \{\s*sim\.step\(\);/.test(
      elementsJs,
    ) &&
    /if \(runActive\) \{\s*if \(sim\.progress\(challenge\.id\)\.done\) \{\s*completeRun\(\);/.test(
      elementsJs,
    ),
);
check(
  "the keyboard path picks tools, moves a cursor and places elements",
  /parseInt\(key, 10\)/.test(elementsJs) &&
    /key === "ArrowLeft"/.test(elementsJs) &&
    /key === "Enter"/.test(elementsJs) &&
    /paintBlob\(cursorX, cursorY, ids\[activeTool\], elementsCursorBrush\)/.test(elementsJs),
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
    /elementsStoreVersion = 1/.test(appJs) &&
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
  "elementsReset",
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

const petJsForClasses = appJs.slice(
  appJs.indexOf("Pet companion"),
  appJs.indexOf("window.formatText"),
);
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
const petJsStart = appJs.indexOf("Pet companion");
const petJs = petJsStart === -1 ? "" : appJs.slice(petJsStart, appJs.indexOf("window.formatText"));
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
    /window\.clearInterval\(petDecayTimer\)/.test(petJs),
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
  /petState\.careMistakes\s*=/.test(petJs) && /result\.logged\.push/.test(petJs),
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
  /petState\.accessory = petExclusiveAccessory/.test(petJs),
);
check(
  "petting draws energy down with diminishing happiness",
  /petState\.energy = petClamp\(\s*petState\.energy - /.test(petJs) &&
    /petCombo <= 2 \? 6 : Math\.max\(2, 6 - \(petCombo - 2\)\)/.test(petJs),
);
check(
  "the emote is throttled and tick-driven (no permanent timer)",
  /function petEmoteBeat/.test(petJs) &&
    /now - petEmoteAt < petEmoteEveryMs/.test(petJs) &&
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
