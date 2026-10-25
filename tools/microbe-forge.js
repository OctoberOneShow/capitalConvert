#!/usr/bin/env node
/*
 * Microbe Lab forge.
 *
 * Replays a candidate dish through the game's own greedy allocator and prints
 * what it is actually worth, so a rung's star band is measured instead of
 * guessed. `microbeBeatable` is the same walk the floor proof in
 * game-microbe-lab.js uses, so a result here is the result in the panel.
 *
 *   node tools/microbe-forge.js            # audit every shipped rung
 *   node tools/microbe-forge.js --mine     # score the candidate table below
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { createEnvironment } = require("./stub-dom");

const root = path.join(__dirname, "..");
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

/* The candidate dishes. Every one is walked before its band is written. */
const CANDIDATES = [
  { id: "m14", gens: 10, seed: 17231, cap: 22, traitMax: 7, start: 15, base: 4, step: 2,
    plan: [["heat", "acid"], ["defence", "speed"], ["heat"], ["acid", "speed"], ["defence"]] },
  { id: "m15", gens: 10, seed: 18119, cap: 22, traitMax: 7, start: 15, base: 4, step: 2,
    plan: [["heat", "defence"], ["acid", "speed"], ["heat", "acid"], ["defence", "speed"], ["heat"], ["acid"]] },
  { id: "m16", gens: 10, seed: 19087, cap: 21, traitMax: 7, start: 14, base: 4, step: 2,
    plan: [["heat", "acid"], ["defence", "speed"], ["heat", "defence"], ["acid", "speed"], ["speed"]] },
  { id: "m17", gens: 10, seed: 20143, cap: 21, traitMax: 7, start: 14, base: 4, step: 2,
    plan: [["heat", "defence"], ["acid", "speed"], ["heat", "acid"], ["defence", "speed"], ["defence"], ["speed"]] },
  { id: "m18", gens: 10, seed: 21191, cap: 20, traitMax: 7, start: 14, base: 4, step: 2,
    plan: [["heat", "acid"], ["defence", "speed"], ["heat", "defence"], ["acid", "speed"], ["heat", "acid"], ["defence"]] },
  { id: "m19", gens: 10, seed: 22229, cap: 20, traitMax: 7, start: 13, base: 4, step: 2,
    plan: [["heat", "acid"], ["defence", "speed"], ["heat", "defence"], ["acid", "speed"], ["heat", "acid"], ["defence", "speed"]] },
  { id: "m20", gens: 10, seed: 23327, cap: 19, traitMax: 7, start: 13, base: 4, step: 2,
    plan: [["heat", "acid"], ["defence", "speed"], ["heat", "defence"], ["acid", "speed"], ["heat", "acid"], ["defence", "speed"]] },
];

function line(label, level, band) {
  const proof = App.microbeBeatable(level);
  const verdict = proof.collapsed
    ? "COLLAPSED at gen " + proof.gen
    : `metric ${proof.metric}, floor ${proof.minSurvivors}, waste ${proof.waste}`;
  const bandText = band ? `, band ${band.join("/")}` : "";
  console.log(`${label.padEnd(6)} ${verdict}${bandText}`);
  return proof;
}

if (process.argv.includes("--search")) {
  /* Picks a seed for each new rung instead of guessing one: the levers tighten
   * slot by slot (cap 22 -> 19, start 15 -> 13, five cards -> six) and the seed
   * is whatever lands the greedy walk inside that slot's score window, so the
   * seven new dishes read as one descending ramp rather than seven dice rolls. */
  const P5 = [["heat", "acid"], ["defence", "speed"], ["heat", "defence"], ["acid", "speed"], ["heat"]];
  const P6 = [["heat", "acid"], ["defence", "speed"], ["heat", "defence"], ["acid", "speed"], ["heat", "acid"], ["defence", "speed"]];
  const SLOTS = [
    { id: "m19", cap: 21, start: 14, base: 4, step: 2, plan: P6 },
    { id: "pA", cap: 20, start: 15, base: 4, step: 3, plan: P6 },
    { id: "pB", cap: 20, start: 14, base: 4, step: 3, plan: P6 },
    { id: "pC", cap: 21, start: 13, base: 4, step: 2, plan: P6 },
    { id: "pD", cap: 22, start: 15, base: 4, step: 2, plan: P5 },
  ];
  SLOTS.forEach((slot) => {
    /* Keep one seed per distinct greedy score, then report the whole spread:
     * the score a dish pays out is lumpy, so the ramp is chosen from what the
     * lever set can actually produce instead of from a window it may not hit. */
    const seen = new Map();
    for (let seed = 17000; seed < 17400; seed += 1) {
      const level = {
        id: slot.id, gens: 10, seed: seed, cap: slot.cap, traitMax: 7,
        start: slot.start, base: slot.base, step: slot.step, plan: slot.plan,
      };
      const proof = App.microbeBeatable(level);
      if (proof.collapsed || proof.minSurvivors < 4) continue;
      if (proof.metric < 5400) continue;
      if (!seen.has(proof.metric)) {
        seen.set(proof.metric, { seed: seed, floor: proof.minSurvivors });
      }
    }
    const list = Array.from(seen.entries()).sort((a, b) => b[0] - a[0]).slice(-12).reverse();
    console.log(
      `${slot.id} cap ${slot.cap} start ${slot.start} base ${slot.base} step ${slot.step} -> ` +
        (list.length
          ? list.map(([metric, info]) => `${metric}@${info.seed}(f${info.floor})`).join(" ")
          : "nothing playable"),
    );
  });
  process.exit(0);
}

if (process.argv.includes("--sweep")) {
  /* Walks the whole lever space against one hard plan so a new rung can be
   * chosen by measurement: a dish that collapses is unplayable, and a lower
   * greedy metric is a dish the greedy hand cannot carry. */
  const PLAN = [
    ["heat", "acid"],
    ["defence", "speed"],
    ["heat", "defence"],
    ["acid", "speed"],
  ];
  const rows = [];
  for (let cap = 18; cap <= 23; cap += 1) {
    for (let traitMax = 5; traitMax <= 8; traitMax += 1) {
      for (let start = 12; start <= 16; start += 1) {
        for (let base = 3; base <= 4; base += 1) {
          for (let step = 2; step <= 3; step += 1) {
            for (let seed = 17000; seed <= 17040; seed += 137) {
              const level = {
                id: "sweep", gens: 10, seed: seed, cap: cap, traitMax: traitMax,
                start: start, base: base, step: step, plan: PLAN,
              };
              const proof = App.microbeBeatable(level);
              if (proof.collapsed) continue;
              rows.push({ cap, traitMax, start, base, step, seed, metric: proof.metric, floor: proof.minSurvivors });
            }
          }
        }
      }
    }
  }
  rows.sort((a, b) => a.metric - b.metric);
  console.log("cap traitMax start base step seed   metric floor");
  rows.slice(0, 40).forEach((r) => {
    console.log(
      `${String(r.cap).padStart(3)} ${String(r.traitMax).padStart(8)} ${String(r.start).padStart(5)} ` +
        `${String(r.base).padStart(4)} ${String(r.step).padStart(4)} ${String(r.seed).padStart(5)} ` +
        `${String(r.metric).padStart(7)} ${String(r.floor).padStart(5)}`,
    );
  });
  console.log(`\nplayable dishes: ${rows.length}`);
  process.exit(0);
}

if (process.argv.includes("--mine")) {
  console.log("id     greedy walk");
  CANDIDATES.forEach((level) => line(level.id, level, null));
} else {
  console.log("id     greedy walk                                  shipped band");
  App.microbeLevels.forEach((level) => line(level.id, level, level.starBand));
}
