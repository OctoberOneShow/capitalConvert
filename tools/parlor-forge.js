#!/usr/bin/env node
/* Twenty-One Parlor table forge.
 *
 * The project's static check sweeps each table 160 times on one deterministic
 * stream - bet the top stake, hit to 18, restake when broke - and requires the
 * table to clear in at least 140 of those runs, with the one-star line the
 * ordinary outcome of a win, the two-star line common, and the three-star line
 * rare but real. Because the stream is shared, a table's numbers depend on
 * where it sits in the sweep, so this tool replays the whole sweep in table
 * order rather than measuring a candidate on its own.
 *
 * Usage:
 *   node tools/parlor-forge.js list
 *   node tools/parlor-forge.js probe '<json table>'
 *   node tools/parlor-forge.js forge
 */
"use strict";

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "assets", "app", "game-blackjack.js");

function loadApi() {
  const src = fs.readFileSync(FILE, "utf8").replace(/^﻿/, "");
  const slice = src.slice(
    src.indexOf("var bjSuits"),
    src.indexOf("function initBlackjackGame"),
  );
  /* eslint-disable-next-line no-new-func */
  return new Function(slice + "\nreturn { bjShoe, bjCount, bjNatural, bjTables };")();
}

/* Replays the check's sweep across every table in order, with one stream. */
function sweep(api, tables) {
  const realRandom = Math.random;
  let seed = 20261002;
  Math.random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const settle = (player, dealer, bet) => {
    const you = api.bjCount(player).total;
    const house = api.bjCount(dealer).total;
    const youNatural = api.bjNatural(player);
    const houseNatural = api.bjNatural(dealer);
    if (you > 21) return -bet;
    if (youNatural && !houseNatural) return Math.round(bet * 1.5);
    if (houseNatural && !youNatural) return -bet;
    if (house > 21) return bet;
    if (you > house) return bet;
    if (you < house) return -bet;
    return 0;
  };
  const stats = [];
  try {
    tables.forEach((table) => {
      const bet = table.bets[2];
      let reached = 0;
      let three = 0;
      let two = 0;
      let one = 0;
      for (let trial = 0; trial < 160; trial += 1) {
        let shoe = api.bjShoe(table.decks);
        const draw = () => {
          if (!shoe.length) shoe = api.bjShoe(table.decks);
          return shoe.pop();
        };
        let chips = table.start;
        let hands = 0;
        while (chips < table.target && hands < 300) {
          const player = [draw(), draw()];
          const dealer = [draw(), draw()];
          if (!api.bjNatural(player) && !api.bjNatural(dealer)) {
            while (api.bjCount(player).total < 18) player.push(draw());
            while (api.bjCount(dealer).total < 17) dealer.push(draw());
          }
          chips += settle(player, dealer, bet);
          hands += 1;
          if (chips < table.bets[0]) chips = table.start;
        }
        if (chips >= table.target) {
          reached += 1;
          if (hands <= table.starHands[0]) three += 1;
          if (hands <= table.starHands[1]) two += 1;
          if (hands <= table.starHands[2]) one += 1;
        }
      }
      const ok =
        reached >= 140 &&
        one >= reached * 0.7 &&
        two >= reached * 0.4 &&
        three >= 2 &&
        three <= reached * 0.65;
      stats.push({
        id: table.id,
        reached: reached,
        three: three,
        two: two,
        one: one,
        ok: ok,
        line: `${table.id} cleared ${reached}/160, 3★ ${three}, 2★ ${two}, 1★ ${one}`,
      });
    });
  } finally {
    Math.random = realRandom;
  }
  return stats;
}

function main() {
  const mode = process.argv[2] || "list";
  const api = loadApi();

  if (mode === "probe") {
    const candidate = JSON.parse(process.argv[3]);
    const stats = sweep(api, api.bjTables.concat([candidate]));
    const last = stats[stats.length - 1];
    console.log(last.line + (last.ok ? "   PASS" : "   FAIL"));
    return;
  }

  if (mode === "forge") {
    /* Tables 21-24: the salon above the pit. The stack keeps doubling - the
     * last felt stakes every bankroll the shipped ladder owns on one hand -
     * and the shoe halves table by table: eight decks, the house's own
     * standard felt, then four, two, and the single deck the game began on,
     * with the bands never loosening from the last shipped felt and walking
     * down to a three-hand clear on the final deck. Swept here appended to
     * the shipped ladder, in table order, because the shared stream makes
     * every number depend on position. */
    const brief = [
      { id: "b21", labelKey: "bjT21", decks: 8, start: 104857600, bets: [6553600, 13107200, 26214400], target: 157286400, starHands: [5, 10, 24] },
      { id: "b22", labelKey: "bjT22", decks: 4, start: 209715200, bets: [13107200, 26214400, 52428800], target: 314572800, starHands: [4, 9, 24] },
      { id: "b23", labelKey: "bjT23", decks: 2, start: 419430400, bets: [26214400, 52428800, 104857600], target: 629145600, starHands: [4, 9, 23] },
      { id: "b24", labelKey: "bjT24", decks: 1, start: 838860800, bets: [52428800, 104857600, 209715200], target: 1258291200, starHands: [3, 9, 23] },
    ];
    /* Sweep the twenty shipped tables plus the brief, in table order - the
     * shared stream makes every number depend on position, so the brief is
     * never measured on its own. */
    sweep(api, api.bjTables.slice(0, api.bjTables.length - brief.length).concat(brief))
      .slice(brief.length * -1)
      .forEach(function (entry) {
        console.log((entry.ok ? "ok  " : "FAIL") + "  " + entry.line);
      });
    return;
  }

  const stats = sweep(api, api.bjTables);
  stats.forEach(function (entry) {
    console.log((entry.ok ? "ok  " : "FAIL") + "  " + entry.line);
  });
}

module.exports = { loadApi, sweep };

if (require.main === module) {
  main();
}
