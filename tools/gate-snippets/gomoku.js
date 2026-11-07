"use strict";

/* game-gomoku: the quiet summit is a steadier hand and a wider front, not a
 * deeper search; the patient answers are a wider read at a shorter sight.
 *
 * The deep read is already at the engine's honest ceiling - r24's fourteen
 * plies cost real seconds a move on an open board, and a rank that searched
 * deeper would stall the panel instead of sharpening it - so the summit
 * r25-r30 is paid for where every shipped rank above five pays: the blink
 * drains from 0.09 to 0.04, the tempo tax climbs to five, and the last three
 * ranks hold three fronts at once. The gate holds the ladder shape exactly
 * (thirty ranks, the sight pinned at the ceiling, the blink strictly below
 * the shipped peak and strictly falling, the tax never lightening, the
 * triple front opening first at r27), holds every rung to the ladder's own
 * star law of four, six and eight a band, and proves the names travel and
 * the chain walks, all thirty times. This is the shipped gate's own bar for
 * this game - shape and bands, not duels: one deep pick costs seconds, so a
 * full-match proof is minutes a rank, out of the engine's own clock budget.
 *
 * The patient answers r31-r40 spend the one dial the shipped ladder never
 * touched: `narrow`, the number of rival answers the engine's hold makes a
 * read survive. No shipped rank carries the field; every shipped read took
 * three answers a ply. The tier steps the sight down to five plies - what
 * the clock affords with room to spare - and climbs the answers four to
 * thirteen rung over rung at that fixed sight, so the read changes
 * character while the branching the answers add is paid for by the plies
 * they replace. The gate keeps this game's own bar for the tier - shape and
 * bands, not full matches - and adds two proofs the clock does afford at
 * the tier's own sight: seeded against the ladder's wall (r10), the plain
 * five-ply read loses all four duels while r32's own seated five-answer
 * read wins all four on the same seeds - the answers, not the sight, took
 * those games - and on seeded boards the seated answer moves the shipped
 * engine's pick away from its narrow-struck twin on every rung probed. The
 * shape law holds (no rung below the tier carries an answer, the answers
 * climb strictly, the sight sits fixed at five plies, the blink never
 * rises past the summit's floor, the tax and the triple front never
 * lighten), the star law continues four, six and eight a band to the
 * capstone, the names travel in both languages, and the chain walks, all
 * forty times. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const ranks = App.gomokuRanks || [];
  const summitIds = ["r25", "r26", "r27", "r28", "r29", "r30"];
  const patientIds = ["r31", "r32", "r33", "r34", "r35", "r36", "r37", "r38", "r39", "r40"];

  check("game-gomoku", "the ladder holds forty ranks",
    ranks.length === 40, String(ranks.length));
  check("game-gomoku", "every rank id is distinct",
    new Set(ranks.map((r) => r.id)).size === ranks.length,
    ranks.map((r) => r.id).join(","));
  const missing = summitIds.filter((id) => !ranks.some((r) => r.id === id));
  check("game-gomoku", "the quiet summit r25-r30 is present",
    missing.length === 0, missing.join(","));
  const missingPatient = patientIds.filter((id) => !ranks.some((r) => r.id === id));
  check("game-gomoku", "the patient answers r31-r40 are present",
    missingPatient.length === 0, missingPatient.join(","));

  const byId = {};
  ranks.forEach((r) => { byId[r.id] = r; });
  const summit = summitIds.map((id) => byId[id]);
  const patient = patientIds.map((id) => byId[id]);
  const r24 = byId.r24;

  /* The ladder shape: the sight stays pinned at the engine's honest ceiling,
   * the blink drains below the shipped peak and never back up, the tempo tax
   * never lightens, the triple front opens first at r27, and every rung
   * keeps the ladder's own star law of four, six and eight. */
  const shapeProblems = [];
  summit.forEach((r, index) => {
    if (r.depth !== r24.depth) {
      shapeProblems.push(`${r.id} searches ${r.depth} plies past the ${r24.depth}-ply ceiling`);
    }
    if (!(r.noise < r24.noise)) {
      shapeProblems.push(`${r.id} blinks at ${r.noise}, no steadier than r24's ${r24.noise}`);
    }
    if (index > 0) {
      const prev = summit[index - 1];
      if (!(r.noise < prev.noise)) {
        shapeProblems.push(`${r.id} blinks at ${r.noise} after ${prev.id}'s ${prev.noise}`);
      }
      if (r.tempo < prev.tempo) {
        shapeProblems.push(`${r.id} tempo ${r.tempo} lightens ${prev.id}'s ${prev.tempo}`);
      }
      if (r.hold < prev.hold) {
        shapeProblems.push(`${r.id} holds ${r.hold} fronts after ${prev.id}'s ${prev.hold}`);
      }
    }
    const law = [
      r24.starMoves[0] + 4 * (index + 1),
      r24.starMoves[1] + 6 * (index + 1),
      r24.starMoves[2] + 8 * (index + 1),
    ];
    if (r.starMoves.join("/") !== law.join("/")) {
      shapeProblems.push(`${r.id} bands ${r.starMoves.join("/")} leave the ladder's own star law ${law.join("/")}`);
    }
  });
  const hold3 = ranks.filter((r) => r.hold >= 3).map((r) => r.id);
  if (hold3[0] !== "r27" || hold3.length !== 14) {
    shapeProblems.push("the triple front first opens at " + hold3.join(","));
  }
  check("game-gomoku",
    "the quiet summit keeps the ceiling, drains the blink, widens the front, and keeps the star law",
    shapeProblems.length === 0, shapeProblems.slice(0, 4).join(" | "));

  /* The patient answers' law, real in the rows: no rung before the tier
   * carries an answer, the ten climb four to thirteen strictly, the sight
   * sits fixed at five plies below the ceiling, the blink never rises past
   * the summit's floor, the tax and the triple front never lighten, every
   * capability the summit held stays held, and the star law continues
   * four, six and eight a band to the capstone. */
  const patientProblems = [];
  ranks.slice(0, 30).forEach((r) => {
    if (Object.prototype.hasOwnProperty.call(r, "narrow")) {
      patientProblems.push(r.id + " reads extra answers");
    }
  });
  patient.forEach((r, index) => {
    if (r.narrow !== 4 + index) {
      patientProblems.push(`${r.id} survives ${r.narrow} answers, not ${4 + index}`);
    }
    if (r.depth !== 5) {
      patientProblems.push(`${r.id} searches ${r.depth} plies off the fixed sight`);
    }
    if (r.noise > summit[5].noise) {
      patientProblems.push(`${r.id} blinks at ${r.noise}, past the summit's floor`);
    }
    if (r.tempo < summit[5].tempo || r.hold < summit[5].hold || r.defense < 4 ||
      !r.holes || !r.fork || !r.sente) {
      patientProblems.push(`${r.id} lightens what the summit held`);
    }
    const step = index + 7;
    const law = [
      r24.starMoves[0] + 4 * step,
      r24.starMoves[1] + 6 * step,
      r24.starMoves[2] + 8 * step,
    ];
    if (r.starMoves.join("/") !== law.join("/")) {
      patientProblems.push(`${r.id} bands ${r.starMoves.join("/")} leave the star law ${law.join("/")}`);
    }
    if (r.depth >= r24.depth) {
      patientProblems.push(`${r.id} keeps the ceiling it was meant to hand back`);
    }
  });
  check("game-gomoku",
    "the patient answers climb four to thirteen at a fixed five-ply sight, hold the summit's habits, and keep the star law",
    patientProblems.length === 0, patientProblems.slice(0, 4).join(" | "));

  /* The answers are load-bearing, and the gate can afford to prove it at
   * the tier's own sight exactly because the sight is five plies. Two
   * proofs: seeded against the ladder's wall (r10), the struck twin - the
   * same row with the answer struck, three answers, the shipped read -
   * loses all four duels while r32's own seated five-answer read wins all
   * four on the same seeds; and on seeded boards the seated answer moves
   * the shipped engine's pick away from its struck twin on every rung
   * probed. */
  const N = 13;
  const fiveAt = (board, x, y, who) => {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    return dirs.some(([dx, dy]) => {
      let run = 1;
      for (let s = 1; s < 5; s += 1) {
        const nx = x + dx * s;
        const ny = y + dy * s;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N || board[nx + ny * N] !== who) break;
        run += 1;
      }
      for (let s = 1; s < 5; s += 1) {
        const nx = x - dx * s;
        const ny = y - dy * s;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N || board[nx + ny * N] !== who) break;
        run += 1;
      }
      return run >= 5;
    });
  };
  const duel = (black, white, seed) => {
    const board = new Array(N * N).fill(0);
    for (let stone = 0; stone < 80; stone += 1) {
      const who = stone % 2 === 0 ? 1 : 2;
      const rank = who === 1 ? black : white;
      const real = Math.random;
      let a = seed * 7919 + stone * 104729;
      Math.random = () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      let pick;
      try {
        pick = App.gomokuPick(board, rank, who);
      } finally {
        Math.random = real;
      }
      if (pick < 0 || board[pick] !== 0) return "cap";
      board[pick] = who;
      if (fiveAt(board, pick % N, Math.floor(pick / N), who)) {
        return who === 1 ? "black" : "white";
      }
    }
    return "cap";
  };
  const struck = (rank) => {
    const clone = Object.assign({}, rank);
    delete clone.narrow;
    return clone;
  };
  const wall = byId.r10;
  const seeds = [11, 23, 37, 51];
  const r32 = byId.r32;
  const seatedWins = seeds.filter((seed) => duel(r32, wall, seed) === "black").length;
  const struckWins = seeds.filter((seed) => duel(struck(r32), wall, seed) === "black").length;
  check("game-gomoku",
    "r32's own seated answer takes the four seeded duels the struck three-answer read loses (" +
      seatedWins + "/4 seated vs " + struckWins + "/4 struck against the wall)",
    seatedWins === 4 && struckWins === 0,
    seatedWins + " vs " + struckWins);

  /* The seated answer moves the real engine's pick: on seeded midgame
   * boards the rung's own read plays a different stone than its
   * narrow-struck twin, on every rung probed. */
  const lcg = (seed) => {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };
  const boardAt = (stones, seed) => {
    const rand = lcg(seed);
    const board = new Array(N * N).fill(0);
    for (let step = 0; step < stones; step += 1) {
      const open = [];
      for (let i = 0; i < board.length; i += 1) {
        if (board[i] === 0) open.push(i);
      }
      board[open[Math.floor(rand() * open.length)]] = step % 2 === 0 ? 1 : 2;
    }
    return board;
  };
  const probeBoards = [18, 22, 26, 30].map((stones, i) => boardAt(stones, 1000 + i * 17));
  const probeIds = ["r31", "r35", "r40"];
  const probeProblems = [];
  probeIds.forEach((id) => {
    const rank = byId[id];
    const diverged = probeBoards.filter((board) =>
      App.gomokuPick(board, rank, 2) !== App.gomokuPick(board, struck(rank), 2)).length;
    if (diverged < 1) {
      probeProblems.push(id + " reads exactly what its struck twin reads");
    }
  });
  check("game-gomoku",
    "the seated answer moves the shipped engine's pick on every rung probed (" +
      probeIds.join(", ") + ")",
    probeProblems.length === 0, probeProblems.join(" | "));

  /* The tiers' names resolve in both languages. */
  const copyProblems = summit.concat(patient).map((r) => r.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-gomoku", "the sixteen summit and patient rank names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each rank in order
   * hands the player exactly the next one, all forty times. */
  const chain = App.createCampaign({
    key: "gomoku-gate-chain",
    levels: ranks.map((r) => ({ id: r.id, labelKey: r.labelKey })),
  });
  let walked = 0;
  let chained = true;
  ranks.forEach((rank, index) => {
    const outcome = chain.record(rank.id, { stars: 3, best: 99, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < ranks.length ? ranks[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-gomoku", "the unlock chain walks all forty ranks in order",
    walked === 40 && chained && chain.clearedCount() === 40, walked + " first clears");
};
