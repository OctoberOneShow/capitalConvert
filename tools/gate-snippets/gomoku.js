"use strict";

/* game-gomoku: the quiet summit is a steadier hand and a wider front, not a
 * deeper search.
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
 */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const ranks = App.gomokuRanks || [];
  const summitIds = ["r25", "r26", "r27", "r28", "r29", "r30"];

  check("game-gomoku", "the ladder holds thirty ranks",
    ranks.length === 30, String(ranks.length));
  check("game-gomoku", "every rank id is distinct",
    new Set(ranks.map((r) => r.id)).size === ranks.length,
    ranks.map((r) => r.id).join(","));
  const missing = summitIds.filter((id) => !ranks.some((r) => r.id === id));
  check("game-gomoku", "the quiet summit r25-r30 is present",
    missing.length === 0, missing.join(","));

  const byId = {};
  ranks.forEach((r) => { byId[r.id] = r; });
  const summit = summitIds.map((id) => byId[id]);
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
  if (hold3[0] !== "r27" || hold3.length !== 4) {
    shapeProblems.push("the triple front first opens at " + hold3.join(","));
  }
  check("game-gomoku",
    "the quiet summit keeps the ceiling, drains the blink, widens the front, and keeps the star law",
    shapeProblems.length === 0, shapeProblems.slice(0, 4).join(" | "));

  /* The tier's names resolve in both languages. */
  const copyProblems = summit.map((r) => r.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-gomoku", "the six quiet-summit rank names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each rank in order
   * hands the player exactly the next one, all thirty times. */
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
  check("game-gomoku", "the unlock chain walks all thirty ranks in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
