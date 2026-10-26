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
    /* Tables 16-20: the shoe turns back around. The stack keeps doubling,
     * sixteen and seventeen ride the deep-deck road with the bands held,
     * eighteen swaps in a six-deck shoe and nineteen a single deck - the
     * countable edge returns, so the three-star line moves in to meet it -
     * and the final felt deals two decks with the tightest lines of the
     * room. Swept here appended to the shipped ladder, in table order,
     * because the shared stream makes every number depend on position. */
    const brief = [
      { id: "b16", labelKey: "bjT16", decks: 30, start: 3276800, bets: [163840, 327680, 819200], target: 4915200, starHands: [7, 13, 26] },
      { id: "b17", labelKey: "bjT17", decks: 32, start: 6553600, bets: [327680, 655360, 1638400], target: 9830400, starHands: [7, 13, 26] },
      { id: "b18", labelKey: "bjT18", decks: 6, start: 13107200, bets: [819200, 1638400, 3276800], target: 19660800, starHands: [5, 11, 26] },
      { id: "b19", labelKey: "bjT19", decks: 1, start: 26214400, bets: [1638400, 3276800, 6553600], target: 39321600, starHands: [7, 13, 26] },
      { id: "b20", labelKey: "bjT20", decks: 2, start: 52428800, bets: [3276800, 6553600, 13107200], target: 78643200, starHands: [5, 10, 24] },
    ];
    /* Sweep the fifteen shipped tables plus the brief, in table order - the
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
