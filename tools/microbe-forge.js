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
  /* m21 - One Throat: the deck narrows onto one trait. flare (heat+speed)
   * prints for the first time and joins brand and grey, so every card is
   * answered through speed; the fastest climb the engine allows (step 1)
   * reaches the shipped demand ceiling by generation four. */
  { id: "m21", gens: 10, seed: 24338, cap: 20, traitMax: 7, start: 14, base: 4, step: 1,
    plan: [["heat", "defence"], ["heat", "speed"], ["defence", "speed"], ["heat", "defence"], ["heat", "speed"], ["defence", "speed"]],
    starBand: [5680, 5380, 4730] },
  /* m22 - Shallow Pool: traitMax 6 for the first time since m8, and it is two
   * levers at once - no strain stacks past six and no card demands past nine.
   * venom (acid+defence) prints for the first time. */
  { id: "m22", gens: 10, seed: 24222, cap: 20, traitMax: 6, start: 15, base: 4, step: 1,
    plan: [["heat", "speed"], ["acid", "defence"], ["heat", "acid"], ["acid", "speed"], ["defence", "speed"], ["heat"]],
    starBand: [5680, 5380, 4730] },
  /* m23 - Starving Flask: start 13, the weakest founding colony the ladder has
   * ever shipped, against the full six-card storm; the greedy line spends the
   * trial one life above the floor. */
  { id: "m23", gens: 10, seed: 24072, cap: 21, traitMax: 7, start: 13, base: 3, step: 2,
    plan: [["heat", "acid"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "defence"], ["acid", "speed"]],
    starBand: [5580, 5280, 4630] },
  /* m24 - The Last Niche: both ceilings bite at once - cap 19, the tightest
   * budget in the game, over the shallow pool, on the step 1 climb. */
  { id: "m24", gens: 10, seed: 24001, cap: 19, traitMax: 6, start: 14, base: 4, step: 1,
    plan: [["heat", "acid"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "defence"], ["acid", "speed"]],
    starBand: [5580, 5280, 4630] },
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
  /* Picks a seed for each new rung instead of guessing one: the 21-24 tier
   * buys its difficulty out of the deck, the pool, the founding colony and
   * both ceilings - new dual cards (heat+speed, acid+defence), traitMax
   * 7 -> 6, start down to 13, cap down to 19, the step 1 climb - and the seed
   * is whatever lands the greedy walk inside that slot's score window, so the
   * four new dishes read as one descending ramp rather than four dice rolls.
   * The windows are what each lever set can actually produce: the score pays
   * out in survivor hundreds minus waste ones, so a 57-survivor line (568x)
   * only exists on a knife edge - most seed ranges collapse outright. */
  const PTHROAT = [["heat", "defence"], ["heat", "speed"], ["defence", "speed"], ["heat", "defence"], ["heat", "speed"], ["defence", "speed"]];
  const PSHALLOW = [["heat", "speed"], ["acid", "defence"], ["heat", "acid"], ["acid", "speed"], ["defence", "speed"], ["heat"]];
  const PALL = [["heat", "acid"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "defence"], ["acid", "speed"]];
  const SLOTS = [
    { id: "m21", cap: 20, traitMax: 7, start: 14, base: 4, step: 1, plan: PTHROAT, low: 5782 },
    { id: "m22", cap: 20, traitMax: 6, start: 15, base: 4, step: 1, plan: PSHALLOW, low: 5780 },
    { id: "m23", cap: 21, traitMax: 7, start: 13, base: 3, step: 2, plan: PALL, low: 5688 },
    { id: "m24", cap: 19, traitMax: 6, start: 14, base: 4, step: 1, plan: PALL, low: 5682 },
  ];
  SLOTS.forEach((slot) => {
    /* Keep one seed per distinct greedy score, then report the whole spread:
     * the ramp is chosen from what the lever set can actually produce instead
     * of from a window it may not hit. */
    const seen = new Map();
    for (let seed = 24000; seed < 24800; seed += 1) {
      const level = {
        id: slot.id, gens: 10, seed: seed, cap: slot.cap, traitMax: slot.traitMax,
        start: slot.start, base: slot.base, step: slot.step, plan: slot.plan,
      };
      const proof = App.microbeBeatable(level);
      if (proof.collapsed || proof.minSurvivors < 4) continue;
      if (proof.metric < slot.low) continue;
      if (!seen.has(proof.metric)) {
        seen.set(proof.metric, { seed: seed, floor: proof.minSurvivors, n: 0 });
      }
      seen.get(proof.metric).n += 1;
    }
    const list = Array.from(seen.entries()).sort((a, b) => a[0] - b[0]).slice(0, 8);
    console.log(
      `${slot.id} cap ${slot.cap} traitMax ${slot.traitMax} start ${slot.start} base ${slot.base} step ${slot.step} -> ` +
        (list.length
          ? list.map(([metric, info]) => `${metric}x${info.n}@${info.seed}(f${info.floor})`).join(" ")
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

/* The audit runs only on the command line: the verify-levels gate requires
 * this module for CANDIDATES (the documented measurement of the 21-24 tier,
 * kept row-for-row equal to the shipped table) and must not print here. */
if (require.main === module) {
  if (process.argv.includes("--mine")) {
    console.log("id     greedy walk");
    CANDIDATES.forEach((level) => line(level.id, level, null));
  } else {
    console.log("id     greedy walk                                  shipped band");
    App.microbeLevels.forEach((level) => line(level.id, level, level.starBand));
  }
}

module.exports = { CANDIDATES, line };
