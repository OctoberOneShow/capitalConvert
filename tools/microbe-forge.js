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
 *   node tools/microbe-forge.js --summit   # score the summit table below
 *   node tools/microbe-forge.js --cinder   # score the 41-44 windows and slip
 *   node tools/microbe-forge.js --search   # re-run the 21-24 seed search
 *   node tools/microbe-forge.js --sweep    # walk the lever space
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

/* The summit bench, dishes 31-40: the documented measurement of the tier
 * that prices its difficulty into the player's own hand. The walk is the
 * same greedy allocator - a two-point (then one-point) hand simply has
 * fewer saves to spend, so the tier buys its levers with the softest
 * opening the lab has printed (base 2, a first) and, from m34, with the
 * shallow pool's own clamp on what a card may demand. Kept row-for-row
 * equal to the shipped table; the gate re-checks that equality. */
const SUMMIT = [
  /* m31 - The Short Hand: two mutations a generation where every earlier
   * dish handed over three, and the first cards that open demanding five
   * (base 2). The lean hand cannot answer a demand that is already high,
   * so the opener walks the floor from generation two. */
  { id: "m31", gens: 10, seed: 50024, cap: 17, traitMax: 5, start: 12, base: 2, step: 1, points: 2,
    plan: [["heat", "defence"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "acid"], ["acid", "speed"]],
    starBand: [4480, 4180, 3830] },
  /* m32 - The Long Trial: the first dish past ten generations. One more
   * card of the same storm on the same lean hand; the extra generation
   * pays four hundred divisions of floor rides into the metric. */
  { id: "m32", gens: 11, seed: 50024, cap: 17, traitMax: 5, start: 12, base: 2, step: 1, points: 2,
    plan: [["heat", "defence"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "acid"], ["acid", "speed"]],
    starBand: [4880, 4580, 4230] },
  /* m33 - Sixteen Tall: the first dish under seventeen. One point less of
   * headroom per strain, same storm, same hand. */
  { id: "m33", gens: 11, seed: 50003, cap: 16, traitMax: 5, start: 12, base: 2, step: 1, points: 2,
    plan: [["heat", "defence"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "acid"], ["acid", "speed"]],
    starBand: [4880, 4580, 4230] },
  /* m34 - Four Wide: the first pool of four. traitMax is two levers - it
   * caps what a strain may stack AND clamps what a card may demand - so
   * the demand ceiling dips from eight to seven here and the walk reads
   * two survivors a generation higher: the cards ask for less, not the
   * dish for less. Seven of a maximum eight still means both members of a
   * pair sit at or beside the ceiling. */
  { id: "m34", gens: 11, seed: 50004, cap: 16, traitMax: 4, start: 12, base: 2, step: 1, points: 2,
    plan: [["heat", "defence"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "acid"], ["acid", "speed"]],
    starBand: [6480, 6180, 5830] },
  /* m35 - Eleven Founders: the weakest flask the lab has seeded, one point
   * under the bench's own starving floor. The uneven founding pairs pull
   * the walk back down to the floor of four. */
  { id: "m35", gens: 11, seed: 50000, cap: 16, traitMax: 4, start: 11, base: 2, step: 1, points: 2,
    plan: [["heat", "defence"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "acid"], ["acid", "speed"]],
    starBand: [4480, 4180, 3830] },
  /* m36 - Two Throats: the first deck printed entirely from the two newest
   * pressures - flare and venom, nothing older. Both are two-clause cards
   * that lean on one trait pair each, so the narrow deck is what the lean
   * hand can still answer. */
  { id: "m36", gens: 11, seed: 50002, cap: 16, traitMax: 4, start: 11, base: 2, step: 1, points: 2,
    plan: [["heat", "speed"], ["acid", "defence"]],
    starBand: [4480, 4180, 3830] },
  /* m37 - The Whole Deck: the first dish that deals from all ten cards the
   * lab has printed, one rotation, where no earlier dish printed more than
   * six. The colony has to be broadly competent under a four ceiling. */
  { id: "m37", gens: 11, seed: 50002, cap: 16, traitMax: 4, start: 11, base: 2, step: 1, points: 2,
    plan: [["heat"], ["acid"], ["defence"], ["speed"], ["heat", "defence"], ["acid", "speed"], ["defence", "speed"], ["heat", "acid"], ["heat", "speed"], ["acid", "defence"]],
    starBand: [4480, 4180, 3830] },
  /* m38 - Twelve Deep: the longest trial the lab has shipped, the whole
   * deck over twelve generations. */
  { id: "m38", gens: 12, seed: 50002, cap: 16, traitMax: 4, start: 11, base: 2, step: 1, points: 2,
    plan: [["heat"], ["acid"], ["defence"], ["speed"], ["heat", "defence"], ["acid", "speed"], ["defence", "speed"], ["heat", "acid"], ["heat", "speed"], ["acid", "defence"]],
    starBand: [4880, 4580, 4230] },
  /* m39 - Fifteen Tall: the first dish under sixteen. Against the four
   * ceiling that leaves every strain a point short of a full house, so
   * selection never quite stalls. */
  { id: "m39", gens: 12, seed: 50002, cap: 15, traitMax: 4, start: 11, base: 2, step: 1, points: 2,
    plan: [["heat"], ["acid"], ["defence"], ["speed"], ["heat", "defence"], ["acid", "speed"], ["defence", "speed"], ["heat", "acid"], ["heat", "speed"], ["acid", "defence"]],
    starBand: [4880, 4580, 4230] },
  /* m40 - The Last Point: the capstone. One mutation a generation - the
   * leanest hand the lab has ever printed - with every floor lever at once
   * at its tier minimum: cap 15, traitMax 4, start 11, twelve generations,
   * the whole deck. The hand holds on 281 of a thousand seedings, the
   * narrowest window the summit bench ships; the shipped seed walks it at
   * the floor of four. */
  { id: "m40", gens: 12, seed: 50005, cap: 15, traitMax: 4, start: 11, base: 2, step: 1, points: 1,
    plan: [["heat"], ["acid"], ["defence"], ["speed"], ["heat", "defence"], ["acid", "speed"], ["defence", "speed"], ["heat", "acid"], ["heat", "speed"], ["acid", "defence"]],
    starBand: [4990, 4690, 4340] },
];

/* The cinder bench, dishes 41-44: the documented measurement of the tier
 * that crosses the two floors the summit only reached. The whole-deck rows
 * share the summit capstone's deck, climb and soft opening (base 2, step 1,
 * points 1, traitMax 4, start 11) and carry them past two floors no shipped
 * dish had crossed - the budget under fifteen (m41) and the trial past
 * twelve (m42, m43) - and the capstone narrows the deck to flare and venom
 * over fifteen generations. The anchor is the shipped culture's own walk:
 * the cinder cultures are the ones that never dip (the first one-point-hand
 * cultures the lab has shipped that never touch the floor of four), the
 * three-star line sits one hundred and one under that walk, and the
 * one-star line sits one hundred under the floor line the one surviving
 * slip lands on. Kept row-for-row equal to the shipped table; the gate
 * re-checks that equality. */
const CINDER = [
  /* m41 - Fourteen Tall: the budget crosses under fifteen. A colony at
   * fourteen points is shut three generations in, so the founding batch
   * either freezes into a shape that covers the whole storm or rides the
   * floor from the dip on: 270 of a thousand seedings finish where the
   * capstone's own levers finish 308, and restoring fifteen on a mutated
   * copy climbs the window back to the capstone's own - the rung's window
   * is the budget's price, not the seed's luck. */
  { id: "m41", gens: 12, seed: 60018, cap: 14, traitMax: 4, start: 11, base: 2, step: 1, points: 1,
    plan: [["heat"], ["acid"], ["defence"], ["speed"], ["heat", "defence"], ["acid", "speed"], ["defence", "speed"], ["heat", "acid"], ["heat", "speed"], ["acid", "defence"]],
    starBand: [6790, 6490, 4990] },
  /* m42 - Thirteen Deep: the trial crosses past twelve. One more generation
   * of the same storm on the same culture; the extra floor ride pays five
   * hundred and ninety-nine into the metric, and a mutated copy cut back to
   * twelve walks under the shipped two-star line. */
  { id: "m42", gens: 13, seed: 60018, cap: 14, traitMax: 4, start: 11, base: 2, step: 1, points: 1,
    plan: [["heat"], ["acid"], ["defence"], ["speed"], ["heat", "defence"], ["acid", "speed"], ["defence", "speed"], ["heat", "acid"], ["heat", "speed"], ["acid", "defence"]],
    starBand: [7389, 7089, 5390] },
  /* m43 - Fourteen Deep: one more floor ride, fourteen generations. */
  { id: "m43", gens: 14, seed: 60018, cap: 14, traitMax: 4, start: 11, base: 2, step: 1, points: 1,
    plan: [["heat"], ["acid"], ["defence"], ["speed"], ["heat", "defence"], ["acid", "speed"], ["defence", "speed"], ["heat", "acid"], ["heat", "speed"], ["acid", "defence"]],
    starBand: [7988, 7688, 5788] },
  /* m44 - The Last Throat: the capstone. The deck narrows to flare and
   * venom - the two aligned pairs - over fifteen generations, the longest
   * trial the lab has shipped. The window shuts: fourteen seedings in a
   * thousand finish (the whole deck back on the same levers finishes
   * forty-eight in two hundred where the narrowed one finishes two), the
   * shipped culture is the only seeding in its range that never dips, and
   * no slip survives it - the engine's line is the only line that finishes
   * the dish. */
  { id: "m44", gens: 15, seed: 60655, cap: 14, traitMax: 4, start: 11, base: 2, step: 1, points: 1,
    plan: [["heat", "speed"], ["acid", "defence"]],
    starBand: [8587, 8287, 7937] },
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

if (process.argv.includes("--summit")) {
  /* Documents the seeding windows the summit bench ships from: the lean
   * hands cannot carry every founding colony, so each slot is walked over
   * a thousand seeds and only some of them hold the floor. The shipped
   * seed anchors its band the way --search anchored the 21-24 tier - the
   * seed is what lands the greedy walk inside the [100, 110] window over
   * its own three-star line - and the count beside it says how wide that
   * window was: m40 is the narrowest seeding the lab has ever shipped. */
  SUMMIT.forEach((slot) => {
    let playable = 0;
    for (let seed = 50000; seed < 51000; seed += 1) {
      const level = Object.assign({}, slot, { seed: seed });
      const proof = App.microbeBeatable(level);
      if (proof.collapsed || proof.minSurvivors < 4 || proof.metric < slot.starBand[1]) {
        continue;
      }
      playable += 1;
    }
    const proof = App.microbeBeatable(slot);
    console.log(
      `${slot.id} seed ${slot.seed} -> ${proof.collapsed ? "COLLAPSED at gen " + proof.gen :
        `metric ${proof.metric}, floor ${proof.minSurvivors}, window ${proof.metric - slot.starBand[0]}`}` +
        `, ${playable}/1000 seedings carry the dish`,
    );
  });
  process.exit(0);
}

if (process.argv.includes("--cinder")) {
  /* Documents the seeding windows the cinder bench ships from and the slip
   * its one-star line is anchored to. The walk is the same greedy allocator;
   * the slip is the walk with its last spendable point thrown at the legal
   * raise that keeps the fewest survivors - the one mistake the culture
   * forgives, which lands it on the floor line. The capstone forgives
   * nothing, and the mutation lines re-measure the two window claims the
   * gate holds: the budget floor is m41's price and the narrowed deck is
   * m44's. */
  const TRAITS = ["heat", "acid", "speed", "defence"];
  const traitSum = (microbe) => TRAITS.reduce((total, name) => total + microbe.traits[name], 0);
  const slip = (slot) => {
    const level = Object.assign({}, slot);
    const spendable = [];
    let list = App.microbePopulation(level, level.seed);
    for (let gen = 0; gen < level.gens; gen += 1) {
      const card = App.microbeCard(level, gen);
      const plan = App.microbeAllocate(list, card, App.microbeSequence(level).slice(gen + 1, gen + 4), 1, level);
      if (plan.waste === 0) spendable.push(gen);
      list = App.microbeSurvive(list, card, level).offspring;
    }
    const last = spendable[spendable.length - 1];
    list = App.microbePopulation(level, level.seed);
    let survivors = 0;
    let waste = 0;
    for (let gen = 0; gen < level.gens; gen += 1) {
      const card = App.microbeCard(level, gen);
      if (gen === last) {
        let worst = null;
        for (let pick = 0; pick < list.length; pick += 1) {
          for (const trait of TRAITS) {
            const microbe = list[pick];
            if (microbe.traits[trait] >= level.traitMax || traitSum(microbe) >= level.cap) continue;
            const trial = list.map((other) => ({ id: other.id, name: other.name, traits: Object.assign({}, other.traits) }));
            trial[pick].traits[trait] += 1;
            const survived = App.microbeSurvive(trial, card, level).survived;
            if (!worst || survived < worst.survived) worst = { survived, trial };
          }
        }
        if (worst) {
          list = worst.trial;
        } else {
          waste += 1;
        }
      } else {
        const plan = App.microbeAllocate(list, card, App.microbeSequence(level).slice(gen + 1, gen + 4), 1, level);
        list = plan.list;
        waste += plan.waste;
      }
      const outcome = App.microbeSurvive(list, card, level);
      if (outcome.collapsed) return { lost: true, gen: gen + 1 };
      survivors += outcome.survived;
      list = outcome.offspring;
    }
    return { lost: false, metric: App.microbeMetric(survivors, waste) };
  };
  CINDER.forEach((slot) => {
    let finish = 0;
    let floats = 0;
    for (let seed = 60000; seed < 61000; seed += 1) {
      const proof = App.microbeBeatable(Object.assign({}, slot, { seed: seed }));
      if (proof.collapsed) continue;
      finish += 1;
      if (proof.minSurvivors >= 5) floats += 1;
    }
    const proof = App.microbeBeatable(slot);
    const slipped = slip(slot);
    const slipText = slipped.lost
      ? `no slip survives (the last spendable point thrown wide loses the culture at gen ${slipped.gen})`
      : `slip banks ${slipped.metric} against the one-star line ${slot.starBand[2]}`;
    console.log(
      `${slot.id} seed ${slot.seed} -> ${proof.collapsed ? "COLLAPSED at gen " + proof.gen :
        `metric ${proof.metric}, floor ${proof.minSurvivors}, window ${proof.metric - slot.starBand[0]}`}` +
        `, ${finish}/1000 seedings finish, ${floats} never dip` +
        `, ${slipText}`,
    );
  });
  const wholeDeck = [["heat"], ["acid"], ["defence"], ["speed"], ["heat", "defence"], ["acid", "speed"], ["defence", "speed"], ["heat", "acid"], ["heat", "speed"], ["acid", "defence"]];
  const windowOf = (level, cap, plan) => {
    let count = 0;
    for (let seed = 60000; seed < 60200; seed += 1) {
      const proof = App.microbeBeatable(Object.assign({}, level, { seed: seed, cap: cap, plan: plan }));
      if (!proof.collapsed && proof.minSurvivors >= 4) count += 1;
    }
    return count;
  };
  console.log(
    `m41 window over 200 seedings: cap 14 -> ${windowOf(CINDER[0], 14, CINDER[0].plan)}` +
      `, cap 15 (the mutated copy) -> ${windowOf(CINDER[0], 15, CINDER[0].plan)}`,
  );
  console.log(
    `m44 window over 200 seedings: two throats -> ${windowOf(CINDER[3], 14, CINDER[3].plan)}` +
      `, whole deck (the mutated copy) -> ${windowOf(CINDER[3], 14, wholeDeck)}`,
  );
  process.exit(0);
}

/* The audit runs only on the command line: the verify-levels gate requires
 * this module for CANDIDATES (the documented measurement of the 21-24 tier)
 * and for SUMMIT (the documented measurement of the 31-40 tier), both kept
 * row-for-row equal to the shipped table, and must not print here. */
if (require.main === module) {
  if (process.argv.includes("--mine")) {
    console.log("id     greedy walk");
    CANDIDATES.forEach((level) => line(level.id, level, null));
  } else {
    console.log("id     greedy walk                                  shipped band");
    App.microbeLevels.forEach((level) => line(level.id, level, level.starBand));
  }
}

module.exports = { CANDIDATES, SUMMIT, CINDER, line };
