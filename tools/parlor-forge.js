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
  const settle = (player, dealer, bet, table) => {
    const you = api.bjCount(player).total;
    const house = api.bjCount(dealer).total;
    const youNatural = api.bjNatural(player);
    const houseNatural = api.bjNatural(dealer);
    if (you > 21) return -bet;
    if (youNatural && !houseNatural) return Math.round(bet * (table.pays || 1.5));
    if (houseNatural && !youNatural) return -bet;
    if (house > 21) return bet;
    if (you > house) return bet;
    if (you < house) return -bet;
    if (table.pushLose) return -bet;
    return 0;
  };
  /* The bench dealer mirrors the engine's housePlay exactly: it draws to 17,
   * and on the summit felts it also pushes a soft 17 - the same two loops the
   * module plays. */
  const houseDraw = (dealer, draw, table) => {
    for (;;) {
      while (api.bjCount(dealer).total < 17) dealer.push(draw());
      if (!(table.soft17 && api.bjCount(dealer).total === 17 && api.bjCount(dealer).soft)) {
        return;
      }
      dealer.push(draw());
    }
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
            houseDraw(dealer, draw, table);
          }
          chips += settle(player, dealer, bet, table);
          hands += 1;
          if (chips < table.bets[0]) chips = table.restake !== undefined ? table.restake : table.start;
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
    /* Tables 25-30: the rope above the salon. One deck throughout, and the
     * rules climb rung over rung: the dealer pushes a soft 17, every tie
     * pays the house, the naturals shorten to seven for five, and then the
     * buy-back shrinks - one and a half top bets, three quarters, one half.
     * Swept here appended to the shipped ladder, in table order, because
     * the shared stream makes every number depend on position. */
    const brief = [
      { id: "b25", labelKey: "bjT25", decks: 1, start: 1677721600, bets: [104857600, 209715200, 419430400], target: 2516582400, starHands: [3, 10, 25], soft17: true },
      { id: "b26", labelKey: "bjT26", decks: 1, start: 3355443200, bets: [209715200, 419430400, 838860800], target: 5033164800, starHands: [3, 10, 26], soft17: true, pushLose: true },
      { id: "b27", labelKey: "bjT27", decks: 1, start: 6710886400, bets: [419430400, 838860800, 1677721600], target: 10066329600, starHands: [3, 12, 33], soft17: true, pushLose: true, pays: 1.4 },
      { id: "b28", labelKey: "bjT28", decks: 1, start: 13421772800, bets: [838860800, 1677721600, 3355443200], target: 20132659200, starHands: [3, 20, 72], soft17: true, pushLose: true, pays: 1.4, restake: 5033164800 },
      { id: "b29", labelKey: "bjT29", decks: 1, start: 26843545600, bets: [1677721600, 3355443200, 6710886400], target: 40265318400, starHands: [3, 16, 69], soft17: true, pushLose: true, pays: 1.4, restake: 5033164800 },
      { id: "b30", labelKey: "bjT30", decks: 1, start: 53687091200, bets: [3355443200, 6710886400, 13421772800], target: 80530636800, starHands: [3, 16, 84], soft17: true, pushLose: true, pays: 1.4, restake: 6710886400 },
    ];
    /* Sweep the shipped ladder plus the brief, in table order - the shared
     * stream makes every number depend on position, so the brief is never
     * measured on its own. */
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
