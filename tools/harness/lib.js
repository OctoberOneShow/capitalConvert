#!/usr/bin/env node
/*
 * Shared plumbing for the pet/games harness: the split app sources, the
 * stub-DOM boot, the assertion counters, and the time/storage helpers the
 * individual case files lean on.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { createEnvironment } = require("../stub-dom");

/* The app ships as ordered plain scripts (see assets/app/); concatenating
 * them in page order reproduces the old single-file assets/app.js exactly,
 * so the harness keeps driving the real code the pages run. */
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

const appSource = APP_MODULES.map((name) =>
  fs
    .readFileSync(path.join(__dirname, "..", "..", "assets", "app", name + ".js"), "utf8")
    .replace(/^﻿/, ""),
).join("\n");

const stylesSource = ["base", "games", "pet"]
  .map((name) =>
    fs.readFileSync(path.join(__dirname, "..", "..", "assets", "styles", name + ".css"), "utf8"),
  )
  .join("\n");

const PET_KEY = "capitalconvert-pet";
const GLYPH_KEY = "glyph-match-best";

let passCount = 0;
const failures = [];
const notes = [];

function check(caseName, label, condition, detail) {
  if (condition) {
    passCount += 1;
    return true;
  }
  failures.push(`${caseName} :: ${label}${detail ? " -> " + detail : ""}`);
  return false;
}

function near(actual, expected, tolerance) {
  return Math.abs(actual - expected) <= (tolerance === undefined ? 1e-6 : tolerance);
}

function boot(overrides) {
  const env = createEnvironment(overrides);
  env.load(appSource);
  env.domReady();
  return env;
}

function adopt(env, species, name) {
  const input = env.byId("petSpeciesInput-" + species);
  input.checked = true;
  env.dispatch(input, "change");
  env.byId("petAdoptName").value = name;
  env.dispatch(env.byId("petAdoptForm"), "submit");
}

function statValue(env, key) {
  const el = env.byId("petStatValue" + key.charAt(0).toUpperCase() + key.slice(1));
  return el ? Number(el.textContent) : NaN;
}

function fxCount(env) {
  const fx = env.byId("petFx");
  return fx ? fx.childNodes.length : -1;
}

/* Creates the tool page's real elements so the text tools can run headlessly. */
function seedToolDom(env) {
  [
    ["inputText", "textarea"],
    ["outputText", "textarea"],
    ["changeSummary", "div"],
    ["statusMessage", "div"],
    ["recentAction", "div"],
    ["historyList", "ul"],
    ["diffPreview", "div"],
  ].forEach(([id, tag]) => {
    const element = env.document.createElement(tag);
    element.id = id;
    env.document.body.appendChild(element);
  });
}

const caseResults = [];

function run(name, fn) {
  const passedBefore = passCount;
  const failedBefore = failures.length;
  try {
    fn();
  } catch (error) {
    failures.push(`${name} :: threw ${error && error.stack ? error.stack.split("\n")[0] : error}`);
  }
  caseResults.push({
    name,
    checks: passCount - passedBefore,
    failed: failures.length - failedBefore,
  });
}

/* helpers for the extended cases --------------------------------------- */

function savedPet(overrides) {
  const base = {
    species: "bracko",
    name: "Pip",
    happiness: 70,
    hunger: 20,
    energy: 70,
    xp: 0,
    treats: 3,
    tricks: [],
    achievements: {},
    accessory: "none",
    hue: "default",
    daysVisited: 1,
    streak: 1,
    lastDay: "",
    totalFeeds: 0,
    totalBrush: 0,
    totalTricks: 0,
    bestCombo: 0,
    miniGamesFinished: 0,
    pos: "br",
    sound: false,
    lastSeen: 1757000000000,
    hidden: false,
  };
  return Object.assign(base, overrides || {});
}

function storeWith(state) {
  return new Map([[PET_KEY, JSON.stringify(state)]]);
}

function dayString(ms) {
  const date = new Date(ms);
  return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
}

/* A timestamp at a chosen local wall-clock time, so time-of-day / season
 * cases are deterministic on any host timezone. */
function localStamp(year, monthIndex, day, hour) {
  return new Date(year, monthIndex, day, hour || 12, 0, 0, 0).getTime();
}

function seedGameDom(env) {
  [
    ["reflexPad", "button"],
    ["reflexPadText", "span"],
    ["reflexLast", "span"],
    ["reflexBest", "span"],
    ["reflexResult", "p"],
    ["reflexStartBtn", "button"],
  ].forEach(([id, tag]) => {
    const element = env.document.createElement(tag);
    element.id = id;
    env.document.body.appendChild(element);
  });
}


module.exports = {
  createEnvironment,
  appSource,
  stylesSource,
  PET_KEY,
  GLYPH_KEY,
  check,
  near,
  boot,
  adopt,
  statValue,
  fxCount,
  seedToolDom,
  run,
  savedPet,
  storeWith,
  dayString,
  localStamp,
  seedGameDom,
  caseResults,
  failures,
  notes,
  get passCount() {
    return passCount;
  },
};
