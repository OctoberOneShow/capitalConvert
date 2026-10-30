#!/usr/bin/env node
/* Kalah Row rank forge.
 *
 * The row is verified the way the project's static check verifies it: a fixed
 * reference player (3-4 plies, the habits a teaching rank assumes) plays each
 * rank twenty times per depth on a deterministic stream, and a rank is fair
 * only when it is beaten outright in at least 5% of those games and by its
 * three-star margin in at least 15%. This tool replays that bench for whatever
 * rows it is given, so a rank can be tuned against the standard that will
 * judge it instead of being guessed at.
 *
 * Usage:
 *   node tools/kalah-forge.js list
 *   node tools/kalah-forge.js probe '<json row>'
 *
 * Ranks 16-20 were tuned here through fairness(): the habits deepen rather
 * than the search (keep, deny and tempo climb, the endgame count rises, and
 * ranks 18 and 20 spend a real node budget on the short board), the flub and
 * slip rates fall, and rank 19 re-widens the tell in exchange for the
 * friendliest margin since rank 9. A prepared opening (book) was benched for
 * the deep tier and rejected - the reference player punishes a fixed opening
 * so hard that the rank measured softer than rank 1 - so the book stays a
 * teaching habit.
 *
 * Ranks 21-24 were tuned here the same way: the tier past the sovereign
 * keeps the search where the sovereign left it and climbs on the prices
 * instead - keep to sixteen, threat to four and a half, tempo to five -
 * paying in a wider slip where it can, while the summit stops erring
 * outright (flub 0.04 and no tell at all). Two benches were rejected: a
 * seventh deny, which distorts the sow enough to measure softer than the
 * sovereign, and any node budget past three thousand, which measured game
 * for game with the sovereign's - past that the ring has no more bottom to
 * read. `list` judges whatever the module ships, in ladder order.
 *
 * Ranks 25-30 were tuned here the same way, on the bench's own beaten
 * margins: the ransom tier keeps the seamless ring's search and prices and
 * asks you to win by more - five, nine, thirteen, seventeen, nineteen,
 * twenty-five stones - each band authored from the distribution the bench
 * actually beats that rung by, and each rung's tell widened (slip 0, 0,
 * 0.03, 0.03, 0.12, 0.12) because a rout that big has to come from
 * somewhere: the seamless ring's own losses never reach twenty-five, so
 * the deep bands measure out of the fairness band on its tell and the tell
 * is what pays them. Deeper cups were benched for the tier and rejected:
 * at five through sixteen stones a cup the bench's outcome goes bimodal -
 * it either routs the rank outright or never wins a game - so no deep-cups
 * rank can be judged hard-but-fair by the bench at all.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "assets", "app", "game-kalah-row.js");

function loadApi() {
  const src = fs.readFileSync(FILE, "utf8").replace(/^﻿/, "");
  const slice = src.slice(src.indexOf("var malPits"), src.indexOf("function initMancalaGame"));
  /* eslint-disable-next-line no-new-func */
  return new Function(
    slice + "\nreturn { malRanks, malFresh, malSow, malOver, malScore, malBestMove, malRivalOf };",
  )();
}

function fairness(api, rank) {
  const { malFresh, malSow, malOver, malScore, malBestMove, malRivalOf } = api;
  const human = { keep: 4, threat: 1, deny: 1, tempo: 2.5, count: 10 };
  const realRandom = Math.random;
  let seed = 20261013;
  Math.random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  try {
    const playOne = (depth) => {
      let cells = malFresh();
      let mover = "you";
      for (let guard = 0; guard < 4000 && !malOver(cells); guard += 1) {
        const move =
          mover === "you"
            ? malBestMove(cells, "you", depth, 0, human)
            : malBestMove(cells, "ai", rank.depth, rank.noise, rank);
        if (move === null || move === undefined) break;
        const step = malSow(cells, move, mover);
        cells = step.cells;
        if (!step.extra) mover = malRivalOf(mover);
      }
      return malScore(cells, "you");
    };
    const margins = [];
    for (const depth of [3, 4]) {
      seed = 987654321 + depth * 7717;
      for (let trial = 0; trial < 20; trial += 1) margins.push(playOne(depth));
    }
    const share = (need) => (100 * margins.filter((m) => m >= need).length) / margins.length;
    return { top: share(rank.margin[0]), wins: share(1) };
  } finally {
    Math.random = realRandom;
  }
}

function main() {
  const mode = process.argv[2] || "list";
  const api = loadApi();

  if (mode === "probe") {
    const rank = JSON.parse(process.argv[3]);
    const verdict = fairness(api, rank);
    const fair = verdict.wins >= 5 && verdict.top >= 15;
    console.log(
      rank.id +
        " depth " + rank.depth +
        "  top band " + rank.margin[0] + " at " + verdict.top.toFixed(0) + "%" +
        "  (wins " + verdict.wins.toFixed(0) + "%)" +
        (fair ? "  FAIR" : "  too strong"),
    );
    return;
  }

  api.malRanks.forEach(function (rank) {
    const verdict = fairness(api, rank);
    const fair = verdict.wins >= 5 && verdict.top >= 15;
    console.log(
      (fair ? "ok  " : "FAIL") +
        "  " + rank.id +
        "  depth " + rank.depth +
        "  keep " + (rank.keep || 0) +
        "  deny " + (rank.deny || 0) +
        "  count " + (rank.count || 0) +
        "  flub " + (rank.flub || 0) +
        "  band " + rank.margin[0] + " at " + verdict.top.toFixed(0) + "%" +
        "  (wins " + verdict.wins.toFixed(0) + "%)",
    );
  });
}

module.exports = { loadApi, fairness };

if (require.main === module) {
  main();
}
