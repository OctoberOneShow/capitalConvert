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
