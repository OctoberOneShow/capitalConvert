#!/usr/bin/env node
/*
 * Per-module verifier for registry games, usable BEFORE a module is linked into
 * the pages (tools/link-registry-games.js does the linking centrally).
 *
 * It boots the real app inside the stub DOM, seeds the two containers the
 * drawer would pass to App.buildRegistryTabs, injects the given modules' games,
 * then drives each one: click every button, arrow/space/enter keys, and
 * pointer swipes over any canvas/svg with a faked layout box. Every thrown
 * error is a failure, so a module can be proven without a browser.
 *
 * Usage: node tools/verify-game.js game-lantern-heist game-pocket-detective
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { createEnvironment } = require("./stub-dom");

const root = path.join(__dirname, "..");
const VERSION = 56;

function readText(file) {
  return fs.readFileSync(path.join(root, file), "utf8").replace(/^﻿/, "");
}

function manifest() {
  const html = readText("index.html");
  return Array.from(
    html.matchAll(/assets\/app\/([a-z0-9-]+)\.js\?v=\d+/g),
  ).map((match) => match[1]);
}

const ISOLATED = process.argv.includes("--isolated");
/* Shared runtime every game needs; in isolated mode nothing else loads, so a
 * module another worker is mid-editing cannot abort this boot chain and be
 * misread as a defect in the game being checked. */
const RUNTIME = [
  "i18n", "core", "tools",
  "pet-data", "pet-state", "pet-life", "pet-art", "pet-dom", "pet-render", "pet-games", "pet",
  "game-campaign", "game-registry", "game-guide",
  "love-deepspace-combat",
  "love-deepspace-dates",
];

const extras = process.argv.slice(2).filter((name) => !name.startsWith("--"));
if (!extras.length) {
  console.error("usage: node tools/verify-game.js [--isolated] <game-module-slug> ...");
  process.exit(2);
}

const sources = extras.map((name) => {
  const file = path.join("assets", "app", name + ".js");
  if (!fs.existsSync(path.join(root, file))) {
    console.error(`missing module: ${file}`);
    process.exit(2);
  }
  const source = readText(file);
  if (!source.includes("App.registerGame(")) {
    console.error(`${name}: does not call App.registerGame(`);
    process.exit(2);
  }
  return { name, source, file };
});

const appSource = (ISOLATED
  ? RUNTIME.filter((name) => !extras.includes(name))
  : manifest().filter((name) => !extras.includes(name))
)
  .map((name) => readText(path.join("assets", "app", name + ".js")))
  .concat(sources.map((entry) => entry.source))
  .join("\n");

let passed = 0;
const failures = [];

function check(label, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${label}`);
    return true;
  }
  failures.push(label + (detail ? ` -> ${detail}` : ""));
  console.log(`FAIL  ${label}${detail ? ` -> ${detail}` : ""}`);
  return false;
}

function descNameFor(source) {
  const match = /App\.registerGame\(\s*\{\s*\n?\s*name:\s*"([A-Za-z0-9]+)"/.exec(source);
  return match ? match[1] : null;
}

/* The stub's getBoundingClientRect is all zeros, which hides canvas hit-testing
 * behind the same guard browsers need. A faked box makes pointer paths testable. */
function giveItABox(element) {
  element.getBoundingClientRect = () => ({
    top: 0,
    left: 0,
    right: 320,
    bottom: 320,
    width: 320,
    height: 320,
    x: 0,
    y: 0,
  });
}

function fire(target, type, init) {
  target.dispatchEvent(new (require("./stub-dom").StubEvent)(type, init || {}));
}

function driveGame(env, panel, errors, tag) {
  const buttons = panel.querySelectorAll("button");
  buttons.forEach((button, index) => {
    try {
      button.click();
      button.click();
    } catch (error) {
      errors.push(`${tag}: button #${index} threw ${error.message}`);
    }
  });

  const selects = panel.querySelectorAll("select");
  selects.forEach((select, index) => {
    try {
      const options = select.querySelectorAll("option");
      if (options.length > 1) {
        select.value = options[1].value;
        fire(select, "change");
      }
    } catch (error) {
      errors.push(`${tag}: select #${index} threw ${error.message}`);
    }
  });

  const fields = ["canvas", "svg", "div", "input"];
  fields.forEach((kind) => {
    panel.querySelectorAll(kind).forEach((element, index) => {
      giveItABox(element);
      const points = [
        [40, 40],
        [160, 160],
        [280, 250],
      ];
      points.forEach(([x, y]) => {
        ["pointerdown", "pointermove", "pointerup", "click"].forEach((type) => {
          try {
            fire(element, type, { clientX: x, clientY: y, bubbles: true });
          } catch (error) {
            errors.push(`${tag}: ${kind} #${index} ${type} threw ${error.message}`);
          }
        });
      });
      ["keydown", "keyup"].forEach((type) => {
        ["ArrowLeft,0,0", "ArrowRight,0,0", "ArrowUp,0,0", "ArrowDown,0,0", "Enter,13,13", " ", "Tab,9,9", "Escape,27,27", "z,90,90", "x,88,88", "u,117,117"].forEach(
          (spec) => {
            const parts = spec.split(",");
            try {
              fire(element, type, { key: parts[0], keyCode: Number(parts[1] || 0) });
            } catch (error) {
              errors.push(`${tag}: ${kind} #${index} ${type} ${parts[0]} threw ${error.message}`);
            }
          },
        );
      });
    });
  });

  const textables = panel.querySelectorAll("input, textarea");
  textables.forEach((field, index) => {
    field.value = "abc";
    ["input", "keydown", "keyup"].forEach((type) => {
      try {
        fire(field, type, { key: "a", bubbles: true });
      } catch (error) {
        errors.push(`${tag}: field #${index} ${type} threw ${error.message}`);
      }
    });
  });

  try {
    env.timers.advance(4000);
  } catch (error) {
    errors.push(`${tag}: a scheduled callback threw ${error.message}`);
  }
}

const env = createEnvironment();
const tabsGrid = env.document.createElement("div");
tabsGrid.className = "game-tabs";
tabsGrid.id = "gameTabs";
const dialog = env.document.createElement("div");
dialog.className = "game-dialog";
const shipped = env.document.createElement("div");
shipped.className = "game-panel";
shipped.id = "gamePanelTyping";
dialog.appendChild(shipped);
env.document.body.appendChild(tabsGrid);
env.document.body.appendChild(dialog);

env.load(appSource);
const App = env.window.CapitalConvert;
const picked = [];
App.buildRegistryTabs(tabsGrid, dialog, (name) => picked.push(name));
env.domReady();
/* Isolated mode loads no main.js, so start the injected games here; the
 * registry records which descriptors already began, making this safe to repeat.
 * The guides are normally built by main.js too, and both passes are idempotent. */
App.initRegistryGames();
if (ISOLATED) {
  App.initGameGuides();
}

check("the app boots with the modules under test", env.initError === null, String(env.initError && env.initError.message));

sources.forEach((entry) => {
  const name = descNameFor(entry.source);
  if (!check(`${entry.name}: registers a descriptor with name: "..."`, !!name, entry.source.slice(0, 0))) {
    return;
  }
  const desc = App.getRegisteredGames().find((game) => game.name === name);
  if (!check(`${name}: reached the registry`, !!desc)) {
    return;
  }
  const tab = env.byId(desc.tabId);
  const panel = env.byId(desc.panelId);
  check(`${name}: tab and panel were injected`, !!tab && !!panel);
  if (!tab || !panel) {
    return;
  }
  check(
    `${name}: tab and panel name each other and the panel starts hidden`,
    tab.getAttribute("aria-controls") === desc.panelId &&
      panel.getAttribute("aria-labelledby") === desc.tabId &&
      panel.hidden === true,
  );
  check(`${name}: panel content is built, not innerHTML`, panel.children.length >= 4, `children ${panel.children.length}`);
  check(`${name}: a how-to guide was injected`, !!panel.querySelector(".game-guide"));
  check(`${name}: the tab label is translated`, tab.textContent !== desc.tabKey && tab.textContent.length > 0, tab.textContent);

  const keys = Array.from(entry.source.matchAll(/\bt\("([A-Za-z0-9]+)"\s*[,)]/g)).map((m) => m[1]);
  const unresolved = keys.filter((key) => App.t(key) === key);
  check(`${name}: all ${keys.length} translation keys resolve`, keys.length >= 8 && unresolved.length === 0, unresolved.join(","));

  const pack = /App\.addStrings\(\{([\s\S]*?)\n  \}\);/.exec(entry.source);
  if (check(`${name}: ships a bilingual pack`, !!pack)) {
    const en = /en:\s*\{([\s\S]*?)\n?\s{4}\}/.exec(pack[1]);
    const zh = /zh:\s*\{([\s\S]*?)\n?\s{4}\}/.exec(pack[1]);
    const grab = (body) => Array.from(body.matchAll(/"([A-Za-z0-9]+)":/g)).map((m) => m[1]);
    const bareKeys = (body) =>
      Array.from(body.matchAll(/^\s{6}([A-Za-z][A-Za-z0-9]*):/gm))
        .map((m) => m[1])
        .filter((key) => key !== "en" && key !== "zh");
    const enKeys = en ? grab(en[1]) : [];
    const zhKeys = zh ? grab(zh[1]) : [];
    check(
      `${name}: en and zh packs are 1:1 (${enKeys.length} keys)`,
      !!en && !!zh && enKeys.length === zhKeys.length && enKeys.every((k) => zhKeys.indexOf(k) !== -1),
      `en ${enKeys.length} zh ${zhKeys.length} only-en ${enKeys.filter((k) => zhKeys.indexOf(k) === -1).join(",")}`,
    );
    check(
      `${name}: pack keys are quoted, as the static key audit reads them`,
      !!en && !!zh && !bareKeys(en[1]).length && !bareKeys(zh[1]).length,
      `unquoted: ${bareKeys(en ? en[1] : "").concat(bareKeys(zh ? zh[1] : "")).join(",")}`,
    );
  }

  const errors = [];
  driveGame(env, panel, errors, name);
  check(`${name}: simulated play stays error-free`, errors.length === 0, errors.slice(0, 3).join(" | "));

  /* A broken number format leaks into the DOM as "NaN" or "[object Object]"
   * long before anything throws, so read back what the player would see. */
  const rendered = panel.textContent.replace(/\s+/g, " ");
  const leak = /(NaN|\[object [A-Za-z]+]|undefined|\bnull\b)/.exec(rendered);
  check(
    `${name}: nothing unrendered reaches the panel text`,
    !leak,
    leak ? rendered.slice(Math.max(0, leak.index - 45), leak.index + 45) : "",
  );
});

App.getRegisteredGames().forEach((desc) => {
  const tab = env.byId(desc.tabId);
  if (!tab) {
    return;
  }
  const before = picked.length;
  tab.click();
  check(`${desc.name}: its tab routes through the shell's select handler`, picked.length === before + 1 && picked[before] === desc.name, picked[before]);
});

/* Timer hygiene. A game that starts a repeating timer at boot keeps ticking with
 * its panel hidden, and that second interval breaks the drawer's
 * single-decay-interval invariant the pet cases assert. A one-shot timeout armed
 * at boot is the same leak in miniature: it survives the shell's fx cleanup.
 * Boot once more with both timer factories watched, then attribute every non-pet
 * callback to its module by matching the callback source text. */
const audit = createEnvironment();
const realSetInterval = audit.window.setInterval;
const realSetTimeout = audit.window.setTimeout;
const started = [];
audit.window.setInterval = function (fn, ms) {
  const id = realSetInterval(fn, ms);
  started.push({ kind: "interval", ms: ms, body: String(fn).replace(/\s+/g, " ") });
  return id;
};
audit.window.setTimeout = function (fn, ms) {
  const id = realSetTimeout(fn, ms);
  started.push({ kind: "timeout", ms: ms, body: String(fn).replace(/\s+/g, " ") });
  return id;
};
audit.load(appSource);
audit.domReady();
const haystack = sources.concat(
  manifest()
    .filter((name) => !sources.some((entry) => entry.name === name))
    .map((name) => ({ name, source: readText(path.join("assets", "app", name + ".js")) })),
);
function ownerOf(body) {
  const flat = body.slice(0, 60);
  const found = haystack.find((entry) =>
    entry.source.replace(/\s+/g, " ").includes(flat),
  );
  return found ? found.name : "unknown module";
}
const gameTimers = started
  .filter((timer) => !/petOnTick/.test(timer.body))
  .map((timer) => `${ownerOf(timer.body)} leaves a ${timer.kind} (${timer.ms}ms) armed behind a hidden panel`);
check(
  "no game leaves a timer armed behind a hidden panel",
  gameTimers.length === 0,
  gameTimers.slice(0, 3).join(" | "),
);

console.log(`\nchecks passed: ${passed}`);
console.log(`checks failed: ${failures.length}`);
if (failures.length) {
  console.log("\nFAILURES:");
  failures.forEach((line) => console.log("  - " + line));
}
process.exit(failures.length ? 1 : 0);
