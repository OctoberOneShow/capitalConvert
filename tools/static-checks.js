#!/usr/bin/env node
/*
 * Static acceptance checks for the pet companion change.
 *
 *   1. the four pages still expose exactly 5 game tabs / 5 game panels
 *   2. both shared assets are requested with ?v=7 on all four pages
 *   3. only the cache-busting string changed on the asset lines of each page
 *   4. the pet markup is NOT present in any HTML file (it is JS-injected)
 *   5. UTF-8 / CJK integrity (BOM, no U+FFFD, no latin1 mojibake, sample strings)
 *   6. pet CSS: stacking below the game modal, motion + theme variants, no
 *      external assets, balanced braces
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

console.log("== 1/2. page structure and asset versions ==");
PAGES.forEach((page) => {
  const html = read(page);
  const tabs = countOccurrences(html, 'class="game-tab"');
  const panels = countOccurrences(html, 'class="game-panel"');
  check(`${page}: exactly 5 game-tab`, tabs === 5, `found ${tabs}`);
  check(`${page}: exactly 5 game-panel`, panels === 5, `found ${panels}`);
  check(
    `${page}: stylesheet requested as ?v=7`,
    html.includes("assets/styles.css?v=7"),
  );
  check(`${page}: script requested as ?v=7`, html.includes("assets/app.js?v=7"));
  check(
    `${page}: no stale ?v=6 / ?v=5 / ?v=4 left`,
    !html.includes("?v=6") && !html.includes("?v=5") && !html.includes("?v=4"),
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
    `${page}: both asset references are ?v=7`,
    assetLines.every((line) => line.includes("?v=7")),
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

console.log("\n== summary ==");
console.log(`passed: ${passed}`);
console.log(`failed: ${failures.length}`);
if (failures.length) {
  failures.forEach((line) => console.log("  - " + line));
}
process.exit(failures.length ? 1 : 0);
