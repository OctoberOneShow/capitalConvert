#!/usr/bin/env node
/*
 * Standalone runner for one verify-levels gate snippet.
 *
 * Boots the real app in the stub DOM exactly the way tools/verify-levels.js
 * does, then runs a single gate snippet against the live App. This lets a
 * gate be written and iterated on without touching verify-levels.js itself;
 * once a snippet passes here it is inlined into verify-levels.js by hand.
 *
 *   node tools/gate-snippets/_runner.js <slug>
 *
 * The snippet file tools/gate-snippets/<slug>.js must export one function:
 *   module.exports = function gate(ctx) { ... }
 * with ctx = { App, env, check, fs, path, root }.
 *
 * `check(caseName, label, ok, detail)` records like verify-levels does: pass
 * or print `FAIL caseName :: label -> detail`, and the runner exits nonzero
 * when anything failed.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { createEnvironment } = require("../stub-dom");

const slug = process.argv[2];
if (!slug) {
  console.error("usage: node tools/gate-snippets/_runner.js <slug>");
  process.exit(1);
}
const snippetFile = path.join(__dirname, slug + ".js");
if (!fs.existsSync(snippetFile)) {
  console.error("no snippet at tools/gate-snippets/" + slug + ".js");
  process.exit(1);
}

const root = path.join(__dirname, "..", "..");
const pageHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const APP_MODULES = Array.from(
  pageHtml.matchAll(/assets\/app\/([a-z0-9-]+)\.js\?v=\d+/g),
).map((match) => match[1]);
const appSource = APP_MODULES.map((name) =>
  fs
    .readFileSync(path.join(root, "assets", "app", name + ".js"), "utf8")
    .replace(/^﻿/, ""),
).join("\n");

const env = createEnvironment({});
env.load(appSource);
env.domReady();
const App = env.sandbox.CapitalConvert || env.window.CapitalConvert;

let pass = 0;
const failures = [];
function check(caseName, label, ok, detail) {
  if (ok) {
    pass += 1;
    return;
  }
  failures.push(`${caseName} :: ${label}${detail ? " -> " + detail : ""}`);
}

const gate = require(snippetFile);
gate({ App, env, check, fs, path, root });

console.log(`pass ${pass}, fail ${failures.length}`);
failures.forEach((line) => console.log("FAIL " + line));
if (failures.length) process.exitCode = 1;
