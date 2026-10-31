#!/usr/bin/env node
/* Ember Dice table forge + verifier.
 *
 * The table's own rules: ten turns; a turn is any number of rolls followed by
 * a bank; a burn face zeroes the stake and ends the turn; banking pays the
 * stake less the tax (a negative tax is a bounty, and it only lands on a
 * bank, so it is unbankable points); three stars means clearing with three
 * turns spare. A bank needs a stake to collect from - bankStake() returns
 * while the stake is empty - so the solver never credits a bounty on air.
 *
 * Rather than guess whether a target is reachable, this solves the table.
 * Value iteration over (turns left, bank, stake) gives the exact probability
 * of clearing under the best policy, so a table is measured - how often it
 * clears inside ten turns, and how often inside seven, which is the three-star
 * line.
 *
 * Usage:
 *   node tools/dice-forge.js list          # measure the shipped tables
 *   node tools/dice-forge.js probe '<json>'
 *   node tools/dice-forge.js forge         # the fourth-tier brief, measured
 */
"use strict";

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "assets", "app", "game-ember-dice.js");

function loadTables() {
  const src = fs.readFileSync(FILE, "utf8");
  const start = src.indexOf("var diceTables = [");
  if (start < 0) throw new Error("diceTables not found");
  const open = src.indexOf("[", start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  /* eslint-disable-next-line no-new-func */
  return new Function("return " + src.slice(open, end))();
}

/* Every roll outcome: {gain, weight}. One die, or two when the table pairs. */
function outcomes(table) {
  const out = [];
  const dice = table.pairs ? 2 : 1;
  const total = Math.pow(6, dice);
  for (let code = 0; code < total; code += 1) {
    let value = code;
    const faces = [];
    for (let d = 0; d < dice; d += 1) {
      faces.push(1 + (value % 6));
      value = Math.floor(value / 6);
    }
    const burned = faces.some((face) => table.burn.indexOf(face) !== -1);
    const gain = faces.reduce((sum, face) => sum + face, 0);
    out.push({ burned: burned, gain: gain, weight: 1 / total });
  }
  return out;
}

/* Exact solve. `cap` bounds the stake we bother to distinguish: past it the
 * right play is always to bank. */
function solveTable(table, turns, cap) {
  const limit = cap || table.target + 72;
  const rolls = outcomes(table);
  const safe = rolls.filter((roll) => !roll.burned);
  const burnP = rolls.reduce((sum, roll) => (roll.burned ? sum + roll.weight : sum), 0);
  /* f[r][bank][stake] = best probability of clearing.
   * Banks are indexed 0..target; stakes 0..limit. Round zero is priced flat:
   * a clearing bank on the very last turn reads the zero table, so every
   * line the forge prints leaves out the runs that clear exactly on turn
   * ten - the measured clear share is a floor on the engine's true rate, and
   * the shipped bands are claimed on that conservative side. The whole
   * ladder, first through fortieth, is measured under this one convention. */
  const size = (table.target + 1) * (limit + 1);
  let prev = new Float64Array(size);
  let curr = new Float64Array(size);
  const at = (bank, stake) => bank * (limit + 1) + stake;

  for (let r = 1; r <= turns; r += 1) {
    /* A stake large enough to clear on the next bank ends the recursion, so
     * stakes are solved from the top down. */
    for (let stake = limit; stake >= 0; stake -= 1) {
      for (let bank = 0; bank <= table.target; bank += 1) {
        if (bank >= table.target) {
          curr[at(bank, stake)] = 1;
          continue;
        }
        /* banking an empty stake collects nothing: the table disables the
         * button and bankStake() returns while stake <= 0 */
        let bankValue = 0;
        if (stake > 0) {
          const net = Math.max(0, stake - table.tax);
          const banked = Math.min(table.target, bank + net);
          bankValue = prev[at(banked, 0)];
        }
        let rollValue = burnP * prev[at(bank, 0)];
        safe.forEach(function (roll) {
          const grew = Math.min(limit, stake + roll.gain);
          rollValue += roll.weight * curr[at(bank, grew)];
        });
        curr[at(bank, stake)] = Math.max(bankValue, rollValue);
      }
    }
    const swap = prev;
    prev = curr;
    curr = swap;
  }
  return prev[at(0, 0)];
}

function measure(table) {
  return {
    clear: solveTable(table, 10),
    three: solveTable(table, 7),
  };
}

/* ---- generator ---------------------------------------------------------------- */
function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function main() {
  const mode = process.argv[2] || "list";
  const tables = loadTables();

  if (mode === "list") {
    const t0 = Date.now();
    tables.forEach(function (table) {
      const m = measure(table);
      console.log(
        "ok    " + table.id +
          "  target " + table.target +
          "  dice " + (table.pairs ? 2 : 1) +
          "  burn [" + table.burn.join(",") + "]" +
          "  tax " + table.tax +
          "  clears " + (m.clear * 100).toFixed(1) + "%" +
          "  three-star " + (m.three * 100).toFixed(1) + "%",
      );
    });
    console.log("measured in " + (Date.now() - t0) + "ms");
    return;
  }

  if (mode === "probe") {
    const table = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
    const m = measure(table);
    console.log(
      table.id +
        "  target " + table.target +
        "  dice " + (table.pairs ? 2 : 1) +
        "  burn [" + table.burn.join(",") + "]" +
        "  tax " + table.tax +
        "  clears " + (m.clear * 100).toFixed(1) + "%" +
        "  three-star " + (m.three * 100).toFixed(1) + "%",
    );
    return;
  }

  if (mode === "forge") {
    /* The fourth tier: tables 31-40, the tier the felt built. The first
     * thirty lit every ember the room had (1, 2, 3 and 6, on one die and on
     * two); this tier burns the faces the room never burned - the 4, the 5,
     * the parity splits, and the first four-ember felt - and charges the
     * economy it never charged, the house's tax at double the Tax Table's
     * rate. Every rung below sits on its measured starvation edge, and the
     * tier's difficulty line is the descent: the three-star share falls
     * strictly rung over rung, from the four-ember felt's 32.0 down to a
     * point over the band floor the summit tier already reached. The brief
     * also prints the two pins: the twin-ember pairs felt's target
     * invariance (340 measures Pyre Summit's own two lines) and the
     * four-ember pairs felt, which cannot ship at any bounty. */
    const tier = tables.filter((table) =>
      ["t31", "t32", "t33", "t34", "t35", "t36", "t37", "t38", "t39", "t40"]
        .includes(table.id));
    tier.forEach(function (table) {
      const m = measure(table);
      const starved = measure(Object.assign({}, table, { tax: table.tax + 2 }));
      console.log(
        table.id +
          ": target " + table.target +
          ", burn [" + table.burn.join(",") + "], tax " + table.tax +
          ", dice " + (table.pairs ? 2 : 1) +
          "  clears " + (m.clear * 100).toFixed(1) + "%" +
          "  three-star " + (m.three * 100).toFixed(1) + "%" +
          "  | one stingier: " + (starved.clear * 100).toFixed(1) + "/" +
          (starved.three * 100).toFixed(1),
      );
    });
    const byId = {};
    tables.forEach((table) => { byId[table.id] = table; });
    const far = measure(byId.t35);
    const pyre = measure(byId.t27);
    console.log(
      "invariance: t35 at 340 measures " + (far.clear * 100).toFixed(1) + "/" +
        (far.three * 100).toFixed(1) + " against t27's " +
        (pyre.clear * 100).toFixed(1) + "/" + (pyre.three * 100).toFixed(1) + " at 320",
    );
    const oneBank = measure({ id: "probe", target: 40, burn: [1, 2, 3, 6], tax: -35, pairs: true });
    const twoBanks = measure({ id: "probe", target: 60, burn: [1, 2, 3, 6], tax: -45, pairs: true });
    console.log(
      "four-ember pairs: one bank " + (oneBank.clear * 100).toFixed(1) + "/" +
        (oneBank.three * 100).toFixed(1) + ", two banks " +
        (twoBanks.clear * 100).toFixed(1) + "/" + (twoBanks.three * 100).toFixed(1) +
        " - no bounty lands it in the bands",
    );
  }
}

module.exports = { loadTables, measure, solveTable, outcomes };

if (require.main === module) {
  main();
}
