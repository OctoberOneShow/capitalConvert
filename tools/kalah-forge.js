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
 *   node tools/kalah-forge.js tier
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
 *
 * Ranks 31-40 were audited here rung by rung: the tier re-benched every
 * lever the ring has left and found most of them dead. A count past
 * twenty-four stones a board and a budget past three thousand nodes
 * measure game for game with the seamless ring's own (the board is short
 * from the first sow either way, so the wider numbers read nothing new);
 * a guard past sixteen, a star price past four and a half and a tempo past
 * five never move a hand in clean play - zero of forty seeded games change
 * under each, so the record hunter's flip boards come back empty and the
 * ring's prices stand. The prepared book still gets punished. What bites
 * is the refusal, the blind sow, the tell and the toll: the seventh deny
 * flips a live board (at six the hand leaves the rival a star pit, at
 * seven it refuses - and the cut bench gives the games back, so the price
 * is load-bearing in both directions) and ships at the fairness floor,
 * the blind sow drains to zero across two rungs, and the toll climbs past
 * the gilded ring on tells of eighteen, twenty-four and thirty-three in a
 * hundred - fifteen and thirty in a hundred were benched for the ladder
 * and measured dead at every toll they could carry. `tier` prints the
 * audit: every rung's measured bands beside its cut - the record reverted
 * and the rank re-benched - so a rung whose record is decorative shows a
 * cut that moves nothing.
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
    slice +
      "\nreturn { malRanks, malFresh, malSow, malOver, malScore, malBestMove," +
      " malRivalOf, malLegal, malIsPit, malFacing, malThreats };",
  )();
}

/* The bench's raw output: the forty beaten margins of the reference player,
 * on the same deterministic stream the static check has always used. */
function bench(api, rank) {
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
    return margins;
  } finally {
    Math.random = realRandom;
  }
}

/* Band shares off a bench: the three-star, two-star and outright-win rates. */
function shares(api, rank, margins) {
  const list = margins || bench(api, rank);
  const share = (need) => (100 * list.filter((m) => m >= need).length) / list.length;
  return { top: share(rank.margin[0]), mid: share(rank.margin[1]), win: share(1) };
}

function fairness(api, rank) {
  const verdict = shares(api, rank);
  return { top: verdict.top, wins: verdict.win };
}

/* Exact round solver: the best outcome sign (+1 win, 0 draw, -1 loss) the
 * mover can force from a position through the engine's own sowing rules,
 * both sides playing on. Memoized on (cells, mover) and cut off the moment
 * a forced win is found, so short boards stay cheap; it throws once it has
 * opened `cap` positions, which is how a board reports itself too big. */
function solveRound(api, startCells, startMover, cap) {
  const { malSow, malOver, malScore, malRivalOf } = api;
  const memo = new Map();
  let opened = 0;
  const isPit = (index, who) =>
    index !== 0 && index !== 7 && (who === "you" ? index > 0 && index < 7 : index > 7);
  const walk = (cells, mover) => {
    if (malOver(cells)) {
      const diff = malScore(cells, mover);
      return diff > 0 ? 1 : diff < 0 ? -1 : 0;
    }
    const key = cells.join(",") + "|" + mover;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    opened += 1;
    if (opened > cap) throw new Error("solveRound cap " + cap + " blown");
    let best = -2;
    for (let index = 0; index < 14; index += 1) {
      if (!isPit(index, mover) || cells[index] === 0) continue;
      const out = malSow(cells, index, mover);
      const nextMover = out.extra ? mover : malRivalOf(mover);
      let value = walk(out.cells, nextMover);
      if (nextMover !== mover) value = -value;
      if (value > best) best = value;
      if (best === 1) break;
    }
    memo.set(key, best);
    return best;
  };
  return { value: walk(startCells, startMover), opened };
}

/* The audit tier's cut table: each rung's record reverted, for re-benching.
 * The gate and `tier` both read this, so the shipped claim and the tool
 * cannot drift apart. */
const TIER_CUTS = {
  m31: { label: "deny 7 -> 6", patch: { deny: 6 } },
  m32: { label: "flub 0.02 -> 0.04", patch: { flub: 0.04 } },
  m33: { label: "flub 0 -> 0.02", patch: { flub: 0.02 } },
  m34: { label: "slip 0.18 -> 0.12", patch: { slip: 0.12 } },
  m35: { label: "toll 29 -> 27", patch: { margin: [27, 16, 1] } },
  m36: { label: "toll 31 -> 29", patch: { margin: [29, 17, 1] } },
  m37: { label: "slip 0.24 -> 0.12", patch: { slip: 0.12 } },
  m38: { label: "slip 0.33 -> 0.12", patch: { slip: 0.12 } },
  m39: { label: "slip 0.33 -> 0.12", patch: { slip: 0.12 } },
  m40: { label: "toll 39 -> 37", patch: { margin: [37, 22, 1] } },
};

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

  if (mode === "tier") {
    api.malRanks.slice(30).forEach(function (rank) {
      const verdict = shares(api, rank);
      const cut = TIER_CUTS[rank.id];
      const cutVerdict = cut
        ? shares(api, Object.assign({}, rank, cut.patch))
        : null;
      console.log(
        rank.id +
          "  band " + rank.margin[0] + " at " + verdict.top.toFixed(1) + "%" +
          "  (mid " + rank.margin[1] + " at " + verdict.mid.toFixed(1) + "%" +
          ", wins " + verdict.win.toFixed(1) + "%)" +
          (cut ? "  cut " + cut.label + ": " +
            "band " + cutVerdict.top.toFixed(1) + "%" : ""),
      );
    });
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

module.exports = { loadApi, bench, shares, fairness, solveRound, TIER_CUTS };

if (require.main === module) {
  main();
}
