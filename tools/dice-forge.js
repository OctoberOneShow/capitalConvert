#!/usr/bin/env node
/* Ember Dice table forge + verifier.
 *
 * The table's own rules: ten turns; a turn is any number of rolls followed by a
 * bank; a burn face zeroes the stake and ends the turn; banking pays the stake
 * less the tax (a negative tax is a bounty, and it only lands on a bank, so it
 * is unbankable points); three stars means clearing with three turns spare.
 *
 * Rather than guess whether a target is reachable, this solves the table.
 * Value iteration over (turns left, bank, stake) gives the exact probability of
 * clearing under the best policy, so a table is measured - how often it clears
 * inside ten turns, and how often inside seven, which is the three-star line.
 *
 * Usage:
 *   node tools/dice-forge.js list          # measure the shipped tables
 *   node tools/dice-forge.js probe '<json>'
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
   * Banks are indexed 0..target; stakes 0..limit. */
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
        const net = Math.max(0, stake - table.tax);
        const banked = Math.min(table.target, bank + net);
        const bankValue = prev[at(banked, 0)];
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
    /* The new tier: pairs tables with a second burn face - two dice make a
     * burn far likelier (1 - (4/6)^2 = 56%) - paid for by a bigger bounty,
     * which is the only lever this engine has that lifts a target while
     * keeping the three-star line reachable. */
    const brief = [
      { id: "t11", target: 150, burn: [1, 6], tax: -30, pairs: true },
      { id: "t12", target: 165, burn: [1, 2], tax: -34, pairs: true },
      { id: "t13", target: 180, burn: [1, 6], tax: -40, pairs: true },
      { id: "t14", target: 195, burn: [1, 2], tax: -44, pairs: true },
      { id: "t15", target: 210, burn: [1, 6], tax: -52, pairs: true },
      { id: "t16", target: 225, burn: [1, 2], tax: -58, pairs: true },
    ];
    brief.forEach(function (spec) {
      const m = measure(spec);
      console.log(
        spec.id +
          ": target " + spec.target +
          ", burn [" + spec.burn.join(",") + "], tax " + spec.tax +
          ", dice " + (spec.pairs ? 2 : 1) +
          "  clears " + (m.clear * 100).toFixed(1) + "%" +
          "  three-star " + (m.three * 100).toFixed(1) + "%",
      );
    });
  }
}

module.exports = { loadTables, measure, solveTable, outcomes };

if (require.main === module) {
  main();
}
