"use strict";

/* game-shadow-fold: the whole ladder replays the forge's seeded deals, and
 * the summit tiers are held to their own design briefs
 *
 * The forge (tools/fold-forge.js) transcribes the panel's own mirror
 * arithmetic (shfPositions / shfUnit / shfTargetSolvable / shfDeal) and asks
 * three questions of a sheet: the seeded deals all solve and none falls
 * through to the authored reserve, every intended crease is provably needed,
 * and the reserve itself is clean. This gate re-judges the whole shipped
 * ladder through that checker, then separates the ladder into tiers: the
 * calibration rows stay at nine-cell paper, six creases and six stamps; the
 * wide tier holds that paper and raises both ceilings; the deep tier widens
 * the paper to ten and eleven cells, asks for up to ten stamps, keeps its
 * keep-clear blocks whole (every avoid cell's full orbit is inside the
 * block, so the dealer removes real stamp choices rather than singletons),
 * and ships the only eight-crease sheet of the first thirty. The deepest
 * deals are measured through the module's own dealer and must reach further
 * than any nine-cell sheet's.
 *
 * The fourth tier f31-f40 widens the paper again - twelve, thirteen and
 * fourteen cells - and takes one structural record per rung against every
 * sheet before it, the same way the morse ladder's fourth tier does. Every
 * record is a number the engine printed: the widest side, the heaviest
 * single print (read off foldUnit and foldPositions across each pool), the
 * deepest tray, the first five-crease axis, the first nine-crease sheet,
 * the widest stamp pool, and the largest deal target the module's own
 * dealer has ever produced - f40 floods a constant 192 of its 196 cells on
 * every seeded deal because its pool is exactly its tray. The dealt-target
 * dips at f33 and f37 are measured too and pinned to their cause: keep-clear
 * orbits never reach the ink. Records are scoped by position - later tiers
 * legitimately overtake earlier ones - and the par, tray and paper lines
 * never fall within the tier. Star bands, both languages and the unlock
 * chain are checked last.
 *
 * The zenith tier f41-f43 widens the paper again and takes one
 * record per rung against every sheet before it: f41 the first
 * fifteen-cell paper and the heaviest print the game has ever stamped
 * (eighty-eight cells, past the capstone's eighty), f42 the first
 * ten-crease sheet, f43 the first thirteen-stamp tray. The same bench the
 * fourth tier answers - sixty seeded deals, every crease load-bearing -
 * runs over the zenith too, its keep-clears are whole orbits, its pool
 * covers its tray, and its par, tray and paper lines never fall.
 *
 * The apex tier f44-f46 widens the paper once more and keeps the same
 * bench, one record per rung: f44 the first sixteen-cell paper, f45 the
 * widest open pool the drawer has dealt from (all sixteen orbits in
 * play, no keep-clear at all - the far creases pair columns and rows
 * instead of banding them), f46 the first fourteen-stamp tray. The
 * certification bar is the same, and goes one step further: on every
 * apex sheet each crease's cut strands more pool representatives than a
 * deal can leave out, so every conceivable deal - not just the seeded
 * ones - needs every crease, and any tray-sized pick of the pool spreads
 * past the ink budget, so no deal can ever fall through to the reserve.
 *
 * The crown tier f47-f56 closes the drawer out on eighteen-cell paper
 * under eleven creases, one record per rung: f47 the first seventeen-cell
 * paper and the first fifteen-stamp tray, f48 the heaviest print the game
 * has ever stamped (a hundred and twenty-one cells, past the zenith's
 * eighty-eight), f49 the first sixteen-stamp tray from the widest pool
 * any sheet has drawn from (nineteen open orbits, past f45's sixteen),
 * f50 the first eleven-crease sheet - and with it the first six-crease
 * axis, f52 the first eighteen-cell paper, f55 the widest sheet ever
 * dealt with no keep-clear at all (eighteen open orbits, past f45's
 * sixteen), and f56 the capstone: the only twelve-crease sheet, whose
 * pool is spent exactly - sixteen stamps against sixteen open orbits -
 * so every deal inks all 324 cells. The tier's difficulty line is the
 * deal floor - the least ink any conceivable deal can lay, the sum of
 * the tray's smallest orbit prints, computed exactly off the engine for
 * every sheet on the ladder: it climbs 224, 242, 258, 324 across the
 * floor rungs f51, f53, f54 and f56 (each claim against every sheet
 * before it, past the whole-cloth capstone f40's 192), and where it dips
 * (f49, f52, f55) the dip is the record's own cost. The same sixty-deal
 * bench the fourth tier answers runs over the crown, every crease is cut
 * on every dealt sheet, keep-clears are whole orbits, and both languages
 * hold real names for all ten rungs. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const foldForge = require(path.join(root, "tools", "fold-forge.js"));
  const shfSheets = App.foldSheets;
  const shfKeyOf = (cell) => cell.x + "," + cell.y;

  check("game-shadow-fold", "the ladder holds fifty-six sheets",
    shfSheets.length === 56, String(shfSheets.length));
  check("game-shadow-fold", "every sheet id is distinct",
    new Set(shfSheets.map((sheet) => sheet.id)).size === shfSheets.length);
  check("game-shadow-fold", "the ids run f1 through f56 in order",
    shfSheets.every((sheet, index) => sheet.id === "f" + (index + 1)),
    shfSheets.map((sheet) => sheet.id).join(","));

  /* The forge's checker rolls its own mulberry stream, but the seeded swap
   * keeps the run deterministic wherever the booted app reaches for
   * Math.random - the deal path below is one of those places. */
  const shfSeeded = (seed, fn) => {
    const real = Math.random;
    let a = seed >>> 0;
    Math.random = () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    try { return fn(); } finally { Math.random = real; }
  };

  /* The three questions, re-run over the whole ladder - the shipped rows
   * included, so the summit tiers cannot ship with a quietly broken elder. */
  shfSeeded(41027, () => {
    shfSheets.forEach((sheet) => {
      const report = foldForge.checkSheet(sheet, 12);
      check("game-shadow-fold", `${sheet.id}: the forge's three questions answer clean`,
        report.problems.length === 0, report.problems.join("; "));
    });
  });

  const shfWideIds = ["f21", "f22", "f23", "f24"];
  const shfDeepIds = ["f25", "f26", "f27", "f28", "f29", "f30"];
  const shfNewIds = ["f31", "f32", "f33", "f34", "f35", "f36", "f37", "f38", "f39", "f40"];
  const shfWide = shfSheets.filter((sheet) => shfWideIds.includes(sheet.id));
  const shfDeep = shfSheets.filter((sheet) => shfDeepIds.includes(sheet.id));
  const shfNew = shfSheets.filter((sheet) => shfNewIds.includes(sheet.id));
  /* A tier's records are claims against the rungs before it. Scoping the
   * calibration rows (and every "largest so far" below) by position keeps
   * that true now that the fourth tier opens wider paper, deeper trays and
   * heavier prints than anything the first thirty dealt. */
  const shfPosOf = (id) => shfSheets.findIndex((sheet) => sheet.id === id);
  const shfBefore = (id) => shfSheets.slice(0, shfPosOf(id));
  const shfFirst30 = shfSheets.slice(0, 30);
  const shfCalibration = shfFirst30.filter((sheet) =>
    !shfWideIds.includes(sheet.id) && !shfDeepIds.includes(sheet.id));

  /* Tier one: the calibration rows never leave nine-cell paper. Tier two:
   * the wide tier holds that paper and raises both ceilings together. */
  check("game-shadow-fold", "the calibration rows stay at nine-cell paper, six creases and six stamps",
    shfCalibration.length === 20 &&
    shfCalibration.every((sheet) => sheet.side <= 9 && sheet.par <= 6 && sheet.wants <= 6),
    shfCalibration.filter((sheet) => sheet.side > 9 || sheet.par > 6 || sheet.wants > 6)
      .map((sheet) => sheet.id).join(","));
  check("game-shadow-fold", "the wide tier holds the shipped paper and maxes the crease and tray ceilings",
    shfWide.length === 4 &&
    shfWide.every((sheet) => sheet.side === 9 && sheet.par >= 6 && sheet.wants >= 6) &&
    shfWide.some((sheet) => sheet.par === 7) &&
    shfWide.some((sheet) => sheet.wants === 7) &&
    shfWide.some((sheet) => sheet.par === 7 && sheet.wants === 7),
    shfWide.map((sheet) => sheet.id + ":p" + sheet.par + "/w" + sheet.wants).join(" "));

  /* Tier three: the deep tier widens the paper itself. Both new sides must
   * appear, the ladder's largest tray (ten stamps) lives here, and f30 is the
   * only sheet in the drawer that asks for eight creases. */
  check("game-shadow-fold", "the deep tier rows all exist and leave nine-cell paper",
    shfDeep.length === 6 && shfDeep.every((sheet) => sheet.side >= 10),
    shfDeep.map((sheet) => sheet.id + ":side" + sheet.side).join(" "));
  check("game-shadow-fold", "the deep tier uses both ten- and eleven-cell paper",
    shfDeep.some((sheet) => sheet.side === 10) && shfDeep.some((sheet) => sheet.side === 11),
    shfDeep.map((sheet) => sheet.side).join(","));
  const shfTrayMax = Math.max.apply(null, shfFirst30.map((sheet) => sheet.wants));
  check("game-shadow-fold", "the deep tier's ten-stamp tray is the largest of the first thirty sheets",
    shfTrayMax === 10 && shfDeep.some((sheet) => sheet.wants === 10) &&
    shfDeep.every((sheet) => sheet.wants >= 7),
    shfDeep.map((sheet) => sheet.id + ":w" + sheet.wants).join(" "));
  const shfEight = shfFirst30.filter((sheet) => sheet.par >= 8).map((sheet) => sheet.id);
  check("game-shadow-fold", "f30 is the only sheet of the first thirty that asks for eight creases",
    shfEight.length === 1 && shfEight[0] === "f30",
    shfEight.join(","));

  /* A keep-clear block has to remove whole orbits, not scattered cells: every
   * cell in it must mirror only onto other cells in it, so the block is a
   * real slice of the stamp region, and the pool it leaves still covers the
   * tray. */
  const shfOrbitClosed = (sheet) => {
    const avoid = new Set(sheet.avoid || []);
    if (!avoid.size) return false;
    for (const key of avoid) {
      const parts = key.split(",").map(Number);
      const orbit = foldForge.shfPositions([{ x: parts[0], y: parts[1] }], sheet.intended, sheet.side);
      if (!orbit.every((cell) => avoid.has(shfKeyOf(cell)))) return false;
    }
    return true;
  };
  check("game-shadow-fold", "every deep keep-clear block is orbit-closed",
    shfDeep.every(shfOrbitClosed),
    shfDeep.filter((sheet) => !shfOrbitClosed(sheet)).map((sheet) => sheet.id).join(","));
  const shfPool = (sheet) => {
    const avoid = new Set(sheet.avoid || []);
    return foldForge.shfUnit(sheet.intended, sheet.side)
      .filter((cell) => !avoid.has(shfKeyOf(cell))).length;
  };
  check("game-shadow-fold", "every deep sheet still has at least its tray in the stamp pool",
    shfDeep.every((sheet) => shfPool(sheet) >= sheet.wants),
    shfDeep.map((sheet) => sheet.id + ":" + shfPool(sheet) + "/" + sheet.wants).join(" "));

  /* Band monotonicity in the module's convention: the bands are
   * [par, par + 1, par + 2] against a "low is better" scorer, so the par the
   * bands hang off must be exactly the crease set the forge proved needed,
   * and App.starsFor must cut 3/2/1/0 stars at exactly those lines. */
  check("game-shadow-fold", "every sheet's par is the crease set it intends",
    shfSheets.every((sheet) => sheet.par === sheet.intended.length),
    shfSheets.filter((sheet) => sheet.par !== sheet.intended.length)
      .map((sheet) => sheet.id).join(","));
  check("game-shadow-fold", "the star bands cut at par, par+1 and par+2 for every sheet",
    shfSheets.every((sheet) =>
      App.starsFor(sheet.par, [sheet.par, sheet.par + 1, sheet.par + 2], "low") === 3 &&
      App.starsFor(sheet.par + 1, [sheet.par, sheet.par + 1, sheet.par + 2], "low") === 2 &&
      App.starsFor(sheet.par + 2, [sheet.par, sheet.par + 1, sheet.par + 2], "low") === 1 &&
      App.starsFor(sheet.par + 3, [sheet.par, sheet.par + 1, sheet.par + 2], "low") === 0),
    shfSheets.map((sheet) => sheet.id + ":p" + sheet.par).join(" "));

  /* The module's own deal path, driven live with Math.random stubbed the way
   * the other engine benches stub it: every deal carries the full tray, the
   * tray cannot cover the target flat, the stamps all sit in the orbit
   * region, and the module's own solvability check signs the deal. The deal
   * sizes are recorded, because the deep paper's whole point is that it holds
   * targets no nine-cell sheet can. */
  const shfTargetMax = {};
  shfSheets.forEach((sheet) => {
    const unitKeys = new Set(
      foldForge.shfUnit(sheet.intended, sheet.side).map((cell) => shfKeyOf(cell)));
    shfTargetMax[sheet.id] = 0;
    for (let seed = 1; seed <= 8; seed += 1) {
      const deal = shfSeeded(seed * 104729 + sheet.wants, () => App.foldDeal(sheet));
      const good = !!deal &&
        deal.stamps.length === sheet.wants &&
        deal.stamps.every((cell) => unitKeys.has(shfKeyOf(cell))) &&
        deal.budget === deal.stamps.length + 1 &&
        deal.target.length > deal.budget &&
        App.foldTargetSolvable(deal.target, sheet.intended, sheet.side).ok;
      if (deal) shfTargetMax[sheet.id] = Math.max(shfTargetMax[sheet.id], deal.target.length);
      check("game-shadow-fold",
        `${sheet.id}: the module's own deal path deals a solvable sheet (seed ${seed})`,
        good, JSON.stringify(deal && { n: deal.stamps.length, t: deal.target.length }));
    }
  });
  const shfDeepMax = Math.max.apply(null, shfDeep.map((sheet) => shfTargetMax[sheet.id]));
  const shfLowerMax = Math.max.apply(null, shfCalibration.concat(shfWide)
    .map((sheet) => shfTargetMax[sheet.id]));
  check("game-shadow-fold", "the deep paper deals targets beyond any nine-cell sheet",
    shfDeepMax > shfLowerMax,
    "deep " + shfDeepMax + " vs nine-cell " + shfLowerMax);
  check("game-shadow-fold", "f30's deals are the largest of the first thirty sheets",
    shfTargetMax.f30 === Math.max.apply(null, shfFirst30.map((sheet) => shfTargetMax[sheet.id])),
    "f30 " + shfTargetMax.f30 + " of " +
      JSON.stringify(shfDeep.map((sheet) => sheet.id + ":" + shfTargetMax[sheet.id])));

  /* The fourth tier f31-f40 widens the paper again and takes one record
   * per rung against every sheet before it, the way the morse ladder's
   * fourth tier does. Everything below is measured through the module's
   * own engine: foldDeal deals each sheet live over a sixty-deal bench,
   * foldTargetSolvable signs every deal, foldUnit and foldPositions read
   * the print each open stamp floods, and the intended creases are cut
   * one at a time to prove the par is load-bearing on every dealt
   * sheet. The records are scoped by position - later tiers legitimately
   * overtake earlier ones. */
  const shfNewProblems = [];
  const shfBench = 60;
  const shfDealStats = {};
  shfNew.forEach((sheet) => {
    const unitKeys = new Set(
      foldForge.shfUnit(sheet.intended, sheet.side).map((cell) => shfKeyOf(cell)));
    const stats = { min: Infinity, max: 0, stalls: 0 };
    let needed = true;
    for (let seed = 1; seed <= shfBench; seed += 1) {
      const deal = shfSeeded(seed * 104729 + sheet.wants, () => App.foldDeal(sheet));
      if (!deal) {
        stats.stalls += 1;
        continue;
      }
      const good = deal.stamps.length === sheet.wants &&
        deal.stamps.every((cell) => unitKeys.has(shfKeyOf(cell))) &&
        deal.budget === deal.stamps.length + 1 &&
        deal.target.length > deal.budget &&
        App.foldTargetSolvable(deal.target, sheet.intended, sheet.side).ok;
      if (!good) shfNewProblems.push(sheet.id + ": seed " + seed + " dealt a bad sheet");
      /* The tier's cut test: one crease below the intended set and the
       * dealt sheet can no longer ink its whole target, so the par the
       * star bands hang off is the crease set the forge proved needed. */
      for (let g = 0; g < sheet.intended.length; g += 1) {
        const rest = sheet.intended.filter((_, j) => j !== g);
        const spread = App.foldPositions(deal.stamps, rest, sheet.side);
        if (deal.target.every((cell) =>
          spread.some((sp) => sp.x === cell.x && sp.y === cell.y))) {
          needed = false;
        }
      }
      stats.min = Math.min(stats.min, deal.target.length);
      stats.max = Math.max(stats.max, deal.target.length);
    }
    if (stats.stalls) {
      shfNewProblems.push(sheet.id + ": the dealer stalled on " + stats.stalls + " seeds");
    }
    if (!needed) {
      shfNewProblems.push(sheet.id + ": an intended crease is not needed for a dealt sheet");
    }
    shfDealStats[sheet.id] = stats;
  });
  check("game-shadow-fold",
    `the fourth tier deals clean on its own bench and every intended crease is load-bearing (${shfBench} deals x ${shfNew.length} rungs)`,
    shfNewProblems.length === 0, shfNewProblems.slice(0, 4).join(" | "));

  /* The measured numbers the records hang off, read off every sheet on
   * the ladder: the widest print an open stamp floods (the pool through
   * foldPositions), the stamp pool left beside the keep-clears, the
   * orbit count it is drawn from, and the authored reserve's target. */
  const shfPrintMax = {};
  const shfPoolOf = {};
  const shfUnitOf = {};
  const shfAuthoredTgt = {};
  const shfFloorOf = {};
  shfSheets.forEach((sheet) => {
    const avoid = new Set(sheet.avoid || []);
    const unit = foldForge.shfUnit(sheet.intended, sheet.side);
    let printMax = 0;
    let pool = 0;
    const prints = [];
    unit.forEach((cell) => {
      if (avoid.has(shfKeyOf(cell))) return;
      pool += 1;
      const size = foldForge.shfPositions([cell], sheet.intended, sheet.side).length;
      prints.push(size);
      printMax = Math.max(printMax, size);
    });
    prints.sort((a, b) => a - b);
    /* The deal floor: the least ink any conceivable deal can lay - the sum
     * of the tray's smallest orbit prints. */
    shfFloorOf[sheet.id] = prints.slice(0, sheet.wants).reduce((sum, n) => sum + n, 0);
    shfPrintMax[sheet.id] = printMax;
    shfPoolOf[sheet.id] = pool;
    shfUnitOf[sheet.id] = unit.length;
    shfAuthoredTgt[sheet.id] =
      App.foldPositions(sheet.authored, sheet.intended, sheet.side).length;
  });
  const shfSheet = (id) => shfSheets.find((sheet) => sheet.id === id);
  const shfAxisPeak = (sheet) => Math.max(
    sheet.intended.filter((fold) => fold.axis === "v").length,
    sheet.intended.filter((fold) => fold.axis === "h").length);
  const shfRises = (list) => list.every((n, i) => i === 0 || n >= list[i - 1]);
  const shfPars = shfNew.map((sheet) => sheet.par);
  const shfWants = shfNew.map((sheet) => sheet.wants);
  const shfSides = shfNew.map((sheet) => sheet.side);

  check("game-shadow-fold", "the fourth tier is present",
    shfNew.length === 10, shfNew.map((sheet) => sheet.id).join(","));
  check("game-shadow-fold", "every fourth-tier keep-clear block, where one exists, is orbit-closed",
    shfNew.every((sheet) => !sheet.avoid || !sheet.avoid.length || shfOrbitClosed(sheet)),
    shfNew.filter((sheet) => sheet.avoid && sheet.avoid.length && !shfOrbitClosed(sheet))
      .map((sheet) => sheet.id).join(","));
  check("game-shadow-fold", "every fourth-tier sheet still has at least its tray in the stamp pool",
    shfNew.every((sheet) => shfPoolOf[sheet.id] >= sheet.wants),
    shfNew.map((sheet) => sheet.id + ":" + shfPoolOf[sheet.id] + "/" + sheet.wants).join(" "));
  check("game-shadow-fold", "the fourth tier's par, tray and paper lines never fall",
    shfRises(shfPars) && shfRises(shfWants) && shfRises(shfSides) &&
    shfPars[0] === 8 && shfPars[shfPars.length - 1] === 9 &&
    shfWants[0] === 8 && shfWants[shfWants.length - 1] === 12 &&
    shfSides[0] === 12 && shfSides[shfSides.length - 1] === 14,
    `par ${shfPars.join("/")} wants ${shfWants.join("/")} side ${shfSides.join("/")}`);

  check("game-shadow-fold",
    "f31 opens the first twelve-cell paper",
    shfSheet("f31").side === 12 && shfBefore("f31").every((sheet) => sheet.side < 12),
    "previous peak " + Math.max.apply(null, shfBefore("f31").map((sheet) => sheet.side)));
  check("game-shadow-fold",
    "f32 prints past the deep tier's ceiling: forty-eight cells off one stamp",
    shfPrintMax.f32 === 48 &&
      shfBefore("f32").every((sheet) => shfPrintMax[sheet.id] < 48),
    "previous peak " + Math.max.apply(null, shfBefore("f32").map((sheet) => shfPrintMax[sheet.id])));
  check("game-shadow-fold",
    "f33 deals the first eleven-stamp tray and its pool still covers it",
    shfSheet("f33").wants === 11 &&
      shfBefore("f33").every((sheet) => sheet.wants < 11) &&
      shfPoolOf.f33 >= 11,
    "previous peak " + Math.max.apply(null, shfBefore("f33").map((sheet) => sheet.wants)) +
      "; pool " + shfPoolOf.f33);
  check("game-shadow-fold",
    "f34 pulls five creases on one axis, one more than any sheet before it",
    shfAxisPeak(shfSheet("f34")) === 5 &&
      shfBefore("f34").every((sheet) => shfAxisPeak(sheet) < 5),
    "previous peak " + Math.max.apply(null, shfBefore("f34").map(shfAxisPeak)));
  check("game-shadow-fold",
    "f34's pool is exactly its tray, so every deal inks all but the keep-clears",
    shfPoolOf.f34 === shfSheet("f34").wants &&
      shfDealStats.f34.min === 140 && shfDealStats.f34.max === 140 &&
      140 === shfSheet("f34").side * shfSheet("f34").side - shfSheet("f34").avoid.length,
    "pool " + shfPoolOf.f34 + ", dealt " + shfDealStats.f34.min + "-" + shfDealStats.f34.max);
  check("game-shadow-fold",
    "f35 opens the first thirteen-cell paper",
    shfSheet("f35").side === 13 && shfBefore("f35").every((sheet) => sheet.side < 13),
    "previous peak " + Math.max.apply(null, shfBefore("f35").map((sheet) => sheet.side)));
  check("game-shadow-fold",
    "f36 opens the first nine-crease sheet",
    shfSheet("f36").par === 9 && shfSheet("f36").intended.length === 9 &&
      shfBefore("f36").every((sheet) => sheet.par < 9),
    "previous peak " + Math.max.apply(null, shfBefore("f36").map((sheet) => sheet.par)));
  check("game-shadow-fold",
    "f37 deals from the widest stamp pool the drawer has held: eighteen orbits, fifteen open",
    shfUnitOf.f37 === 18 && shfPoolOf.f37 === 15 &&
      shfBefore("f37").every((sheet) => shfUnitOf[sheet.id] < 18 && shfPoolOf[sheet.id] < 15),
    "previous peaks unit " + Math.max.apply(null, shfBefore("f37").map((sheet) => shfUnitOf[sheet.id])) +
      ", pool " + Math.max.apply(null, shfBefore("f37").map((sheet) => shfPoolOf[sheet.id])));
  check("game-shadow-fold",
    "f38 deals the first twelve-stamp tray and its pool still covers it",
    shfSheet("f38").wants === 12 &&
      shfBefore("f38").every((sheet) => sheet.wants < 12) &&
      shfPoolOf.f38 >= 12,
    "previous peak " + Math.max.apply(null, shfBefore("f38").map((sheet) => sheet.wants)) +
      "; pool " + shfPoolOf.f38);
  check("game-shadow-fold",
    "f39 squares the print up to sixty-four cells, past every sheet before it",
    shfPrintMax.f39 === 64 &&
      shfBefore("f39").every((sheet) => shfPrintMax[sheet.id] < 64),
    "previous peak " + Math.max.apply(null, shfBefore("f39").map((sheet) => shfPrintMax[sheet.id])));
  check("game-shadow-fold",
    "f40 pairs the records: fourteen-cell paper and an eighty-cell print, past every sheet before it",
    shfSheet("f40").side === 14 && shfPrintMax.f40 === 80 &&
      shfBefore("f40").every((sheet) =>
        sheet.side < 14 && shfPrintMax[sheet.id] < 80),
    "previous peaks side " + Math.max.apply(null, shfBefore("f40").map((sheet) => sheet.side)) +
      ", print " + Math.max.apply(null, shfBefore("f40").map((sheet) => shfPrintMax[sheet.id])));
  check("game-shadow-fold",
    "f40's pool is exactly its twelve-stamp tray and every deal floods 192 of its 196 cells, the largest sheet the drawer has ever dealt",
    shfPoolOf.f40 === shfSheet("f40").wants &&
      shfDealStats.f40.min === 192 && shfDealStats.f40.max === 192 &&
      192 === shfSheet("f40").side * shfSheet("f40").side - shfSheet("f40").avoid.length &&
      shfBefore("f40").every((sheet) => shfTargetMax[sheet.id] < 192),
    "pool " + shfPoolOf.f40 + ", dealt " + shfDealStats.f40.min + "-" + shfDealStats.f40.max +
      ", previous peak " + Math.max.apply(null, shfBefore("f40").map((sheet) => shfTargetMax[sheet.id])));
  check("game-shadow-fold",
    "the two dealt-target dips are the records' own cost: keep-clear orbits never reach the ink",
    shfAuthoredTgt.f33 < shfAuthoredTgt.f32 && shfAuthoredTgt.f37 < shfAuthoredTgt.f36 &&
      shfAuthoredTgt.f32 === 138 && shfAuthoredTgt.f33 === 136 &&
      shfAuthoredTgt.f36 === 162 && shfAuthoredTgt.f37 === 152,
    `authored targets f32 ${shfAuthoredTgt.f32} vs f33 ${shfAuthoredTgt.f33}, ` +
      `f36 ${shfAuthoredTgt.f36} vs f37 ${shfAuthoredTgt.f37}`);

  /* ---- the zenith tier f41-f43: one record per rung, the fourth tier's
   * bench, whole-orbit keep-clears ------------------------------------- */
  const shfZenithIds = ["f41", "f42", "f43"];
  const shfZenith = shfZenithIds.map((id) => shfSheet(id));
  const shfZenithProblems = [];
  const shfZenithStats = {};
  shfZenith.forEach((sheet) => {
    const unitKeys = new Set(
      foldForge.shfUnit(sheet.intended, sheet.side).map((cell) => shfKeyOf(cell)));
    if (!sheet.avoid || !sheet.avoid.length || !shfOrbitClosed(sheet)) {
      shfZenithProblems.push(sheet.id + ": the keep-clear is not a whole orbit");
    }
    if (shfPoolOf[sheet.id] < sheet.wants) {
      shfZenithProblems.push(sheet.id + ": pool " + shfPoolOf[sheet.id] +
        " cannot supply " + sheet.wants + " stamps");
    }
    const stats = { min: Infinity, max: 0, stalls: 0 };
    let needed = true;
    for (let seed = 1; seed <= shfBench; seed += 1) {
      const deal = shfSeeded(seed * 104729 + sheet.wants, () => App.foldDeal(sheet));
      if (!deal) {
        stats.stalls += 1;
        continue;
      }
      const good = deal.stamps.length === sheet.wants &&
        deal.stamps.every((cell) => unitKeys.has(shfKeyOf(cell))) &&
        deal.budget === deal.stamps.length + 1 &&
        deal.target.length > deal.budget &&
        App.foldTargetSolvable(deal.target, sheet.intended, sheet.side).ok;
      if (!good) shfZenithProblems.push(sheet.id + ": seed " + seed + " dealt a bad sheet");
      for (let g = 0; g < sheet.intended.length; g += 1) {
        const rest = sheet.intended.filter((_, j) => j !== g);
        const spread = App.foldPositions(deal.stamps, rest, sheet.side);
        if (deal.target.every((cell) =>
          spread.some((sp) => sp.x === cell.x && sp.y === cell.y))) {
          needed = false;
        }
      }
      stats.min = Math.min(stats.min, deal.target.length);
      stats.max = Math.max(stats.max, deal.target.length);
    }
    if (stats.stalls) {
      shfZenithProblems.push(sheet.id + ": the dealer stalled on " + stats.stalls + " seeds");
    }
    if (!needed) {
      shfZenithProblems.push(sheet.id + ": an intended crease is not needed for a dealt sheet");
    }
    shfZenithStats[sheet.id] = stats;
  });
  check("game-shadow-fold",
    `the zenith deals clean on the fourth tier's bench and every intended crease is load-bearing (${shfBench} deals x 3 rungs)`,
    shfZenithProblems.length === 0, shfZenithProblems.slice(0, 4).join(" | "));
  const shfZenithPars = shfZenith.map((sheet) => sheet.par);
  const shfZenithWants = shfZenith.map((sheet) => sheet.wants);
  const shfZenithSides = shfZenith.map((sheet) => sheet.side);
  check("game-shadow-fold",
    "the zenith's par, tray and paper lines never fall",
    shfRises(shfZenithPars) && shfRises(shfZenithWants) && shfRises(shfZenithSides) &&
      shfZenithSides.every((side) => side === 15) &&
      shfZenithPars[0] === 9 && shfZenithPars[shfZenithPars.length - 1] === 10 &&
      shfZenithWants[shfZenithWants.length - 1] === 13,
    `par ${shfZenithPars.join("/")} wants ${shfZenithWants.join("/")} side ${shfZenithSides.join("/")}`);
  check("game-shadow-fold",
    "f41 opens the first fifteen-cell paper and stamps the heaviest print the game has carried: eighty-eight cells, past the capstone's eighty",
    shfSheet("f41").side === 15 && shfPrintMax.f41 === 88 &&
      shfBefore("f41").every((sheet) => sheet.side < 15 && shfPrintMax[sheet.id] < 88),
    "previous peaks side " + Math.max.apply(null, shfBefore("f41").map((sheet) => sheet.side)) +
      ", print " + Math.max.apply(null, shfBefore("f41").map((sheet) => shfPrintMax[sheet.id])));
  check("game-shadow-fold",
    "f42 opens the first ten-crease sheet, one more than any sheet before it",
    shfSheet("f42").par === 10 && shfSheet("f42").intended.length === 10 &&
      shfBefore("f42").every((sheet) => sheet.par < 10),
    "previous peak " + Math.max.apply(null, shfBefore("f42").map((sheet) => sheet.par)));
  check("game-shadow-fold",
    "f43 deals the first thirteen-stamp tray and its pool still covers it",
    shfSheet("f43").wants === 13 &&
      shfBefore("f43").every((sheet) => sheet.wants < 13) &&
      shfPoolOf.f43 >= 13,
    "previous peak " + Math.max.apply(null, shfBefore("f43").map((sheet) => sheet.wants)) +
      "; pool " + shfPoolOf.f43);
  check("game-shadow-fold",
    "no rung below the zenith fields its hardware - fifteen-cell paper, ten creases and the thirteen-stamp tray all live above f40",
    shfSheets.slice(0, 40).every((sheet) =>
      sheet.side <= 14 && sheet.par <= 9 && sheet.wants <= 12),
    shfSheets.slice(0, 40).filter((sheet) =>
      sheet.side > 14 || sheet.par > 9 || sheet.wants > 12)
      .map((sheet) => sheet.id).join(","));

  /* ---- the apex tier f44-f46: sixteen-cell paper, one record per rung,
   * the zenith's bench, and a pigeonhole bar on top: each crease's cut
   * must strand more pool reps than a deal can leave out, so every
   * conceivable deal needs every crease ------------------------------- */
  const shfApexIds = ["f44", "f45", "f46"];
  const shfApex = shfApexIds.map((id) => shfSheet(id));
  const shfApexProblems = [];
  const shfApexStats = {};
  shfApex.forEach((sheet) => {
    const unitKeys = new Set(
      foldForge.shfUnit(sheet.intended, sheet.side).map((cell) => shfKeyOf(cell)));
    if (sheet.avoid && sheet.avoid.length && !shfOrbitClosed(sheet)) {
      shfApexProblems.push(sheet.id + ": the keep-clear is not a whole orbit");
    }
    if (shfPoolOf[sheet.id] < sheet.wants) {
      shfApexProblems.push(sheet.id + ": pool " + shfPoolOf[sheet.id] +
        " cannot supply " + sheet.wants + " stamps");
    }
    /* The pigeonhole bar: for each crease, count pool reps whose orbit
     * shrinks when it is cut. A deal draws `wants` of the pool, so if
     * more than pool - wants reps shrink, every conceivable deal picks
     * at least one stranded rep and the crease is always load-bearing. */
    const poolReps = foldForge.shfUnit(sheet.intended, sheet.side)
      .filter((cell) => !(sheet.avoid || []).some((key) => key === shfKeyOf(cell)));
    sheet.intended.forEach((_, g) => {
      const rest = sheet.intended.filter((_, j) => j !== g);
      const stranded = poolReps.filter((rep) =>
        foldForge.shfPositions([rep], rest, sheet.side).length <
        foldForge.shfPositions([rep], sheet.intended, sheet.side).length).length;
      if (stranded <= poolReps.length - sheet.wants) {
        shfApexProblems.push(sheet.id + ": cutting crease " + g +
          " strands only " + stranded + " of " + poolReps.length +
          " pool reps - a deal could leave them all out");
      }
    });
    const stats = { min: Infinity, max: 0, stalls: 0 };
    let needed = true;
    for (let seed = 1; seed <= shfBench; seed += 1) {
      const deal = shfSeeded(seed * 104729 + sheet.wants, () => App.foldDeal(sheet));
      if (!deal) {
        stats.stalls += 1;
        continue;
      }
      const good = deal.stamps.length === sheet.wants &&
        deal.stamps.every((cell) => unitKeys.has(shfKeyOf(cell))) &&
        deal.budget === deal.stamps.length + 1 &&
        deal.target.length > deal.budget &&
        App.foldTargetSolvable(deal.target, sheet.intended, sheet.side).ok;
      if (!good) shfApexProblems.push(sheet.id + ": seed " + seed + " dealt a bad sheet");
      for (let g = 0; g < sheet.intended.length; g += 1) {
        const rest = sheet.intended.filter((_, j) => j !== g);
        const spread = App.foldPositions(deal.stamps, rest, sheet.side);
        if (deal.target.every((cell) =>
          spread.some((sp) => sp.x === cell.x && sp.y === cell.y))) {
          needed = false;
        }
      }
      stats.min = Math.min(stats.min, deal.target.length);
      stats.max = Math.max(stats.max, deal.target.length);
    }
    if (stats.stalls) {
      shfApexProblems.push(sheet.id + ": the dealer stalled on " + stats.stalls + " seeds");
    }
    if (!needed) {
      shfApexProblems.push(sheet.id + ": an intended crease is not needed for a dealt sheet");
    }
    shfApexStats[sheet.id] = stats;
  });
  check("game-shadow-fold",
    `the apex deals clean on the zenith's bench and every crease strands more reps than a deal can skip (${shfBench} deals x 3 rungs)`,
    shfApexProblems.length === 0, shfApexProblems.slice(0, 4).join(" | "));
  const shfApexPars = shfApex.map((sheet) => sheet.par);
  const shfApexWants = shfApex.map((sheet) => sheet.wants);
  const shfApexSides = shfApex.map((sheet) => sheet.side);
  check("game-shadow-fold",
    "the apex's par, tray and paper lines never fall",
    shfRises(shfApexPars) && shfRises(shfApexWants) && shfRises(shfApexSides) &&
      shfApexSides.every((side) => side === 16) &&
      shfApexPars.every((par) => par === 10) &&
      shfApexWants[shfApexWants.length - 1] === 14,
    `par ${shfApexPars.join("/")} wants ${shfApexWants.join("/")} side ${shfApexSides.join("/")}`);
  check("game-shadow-fold",
    "f44 opens the first sixteen-cell paper, one cell wider than the zenith's fifteen",
    shfSheet("f44").side === 16 &&
      shfBefore("f44").every((sheet) => sheet.side < 16),
    "previous peak " + Math.max.apply(null, shfBefore("f44").map((sheet) => sheet.side)));
  check("game-shadow-fold",
    "f45 deals from the widest open pool the drawer has held: sixteen orbits in play, none kept clear, past f37's fifteen",
    shfPoolOf.f45 === 16 && !(shfSheet("f45").avoid || []).length &&
      shfBefore("f45").every((sheet) => shfPoolOf[sheet.id] < 16),
    "previous peak " + Math.max.apply(null, shfBefore("f45").map((sheet) => shfPoolOf[sheet.id])) +
      "; f45 keeps " + (shfSheet("f45").avoid || []).length + " cells clear");
  check("game-shadow-fold",
    "f46 deals the first fourteen-stamp tray and its pool still covers it",
    shfSheet("f46").wants === 14 &&
      shfBefore("f46").every((sheet) => sheet.wants < 14) &&
      shfPoolOf.f46 >= 14,
    "previous peak " + Math.max.apply(null, shfBefore("f46").map((sheet) => sheet.wants)) +
      "; pool " + shfPoolOf.f46);
  check("game-shadow-fold",
    "no rung below the apex fields its hardware - sixteen-cell paper and the fourteen-stamp tray all live above f43",
    shfSheets.slice(0, 43).every((sheet) =>
      sheet.side <= 15 && sheet.par <= 10 && sheet.wants <= 13),
    shfSheets.slice(0, 43).filter((sheet) =>
      sheet.side > 15 || sheet.par > 10 || sheet.wants > 13)
      .map((sheet) => sheet.id).join(","));

  /* ---- the crown tier f47-f56: eighteen-cell paper under eleven creases,
   * one record per rung, the deal floor as the difficulty line ---------
   * The floor is computed exactly (the sum of the tray's smallest orbit
   * prints), so the four floor claims below are not seeded samples but
   * bounds on every conceivable deal. */
  const shfCrownIds = ["f47", "f48", "f49", "f50", "f51", "f52", "f53", "f54", "f55", "f56"];
  const shfCrown = shfCrownIds.map((id) => shfSheet(id));
  const shfCrownProblems = [];
  const shfCrownStats = {};
  shfCrown.forEach((sheet) => {
    const unitKeys = new Set(
      foldForge.shfUnit(sheet.intended, sheet.side).map((cell) => shfKeyOf(cell)));
    if (sheet.avoid && sheet.avoid.length && !shfOrbitClosed(sheet)) {
      shfCrownProblems.push(sheet.id + ": the keep-clear is not a whole orbit");
    }
    if (shfPoolOf[sheet.id] < sheet.wants) {
      shfCrownProblems.push(sheet.id + ": pool " + shfPoolOf[sheet.id] +
        " cannot supply " + sheet.wants + " stamps");
    }
    const stats = { min: Infinity, max: 0, stalls: 0 };
    let needed = true;
    for (let seed = 1; seed <= shfBench; seed += 1) {
      const deal = shfSeeded(seed * 104729 + sheet.wants, () => App.foldDeal(sheet));
      if (!deal) {
        stats.stalls += 1;
        continue;
      }
      const good = deal.stamps.length === sheet.wants &&
        deal.stamps.every((cell) => unitKeys.has(shfKeyOf(cell))) &&
        deal.budget === deal.stamps.length + 1 &&
        deal.target.length > deal.budget &&
        App.foldTargetSolvable(deal.target, sheet.intended, sheet.side).ok;
      if (!good) shfCrownProblems.push(sheet.id + ": seed " + seed + " dealt a bad sheet");
      for (let g = 0; g < sheet.intended.length; g += 1) {
        const rest = sheet.intended.filter((_, j) => j !== g);
        const spread = App.foldPositions(deal.stamps, rest, sheet.side);
        if (deal.target.every((cell) =>
          spread.some((sp) => sp.x === cell.x && sp.y === cell.y))) {
          needed = false;
        }
      }
      stats.min = Math.min(stats.min, deal.target.length);
      stats.max = Math.max(stats.max, deal.target.length);
    }
    if (stats.stalls) {
      shfCrownProblems.push(sheet.id + ": the dealer stalled on " + stats.stalls + " seeds");
    }
    if (!needed) {
      shfCrownProblems.push(sheet.id + ": an intended crease is not needed for a dealt sheet");
    }
    shfCrownStats[sheet.id] = stats;
  });
  check("game-shadow-fold",
    `the crown deals clean on the fourth tier's bench and every intended crease is load-bearing (${shfBench} deals x 10 rungs)`,
    shfCrownProblems.length === 0, shfCrownProblems.slice(0, 4).join(" | "));
  const shfCrownPars = shfCrown.map((sheet) => sheet.par);
  const shfCrownWants = shfCrown.map((sheet) => sheet.wants);
  const shfCrownSides = shfCrown.map((sheet) => sheet.side);
  check("game-shadow-fold",
    "the crown's par, tray and paper lines never fall",
    shfRises(shfCrownPars) && shfRises(shfCrownWants) && shfRises(shfCrownSides) &&
      shfCrownPars[0] === 10 && shfCrownPars[shfCrownPars.length - 1] === 12 &&
      shfCrownWants[0] === 15 && shfCrownWants[shfCrownWants.length - 1] === 16 &&
      shfCrownSides[0] === 17 && shfCrownSides[shfCrownSides.length - 1] === 18,
    `par ${shfCrownPars.join("/")} wants ${shfCrownWants.join("/")} side ${shfCrownSides.join("/")}`);
  check("game-shadow-fold",
    "f47 opens the first seventeen-cell paper and the first fifteen-stamp tray",
    shfSheet("f47").side === 17 && shfSheet("f47").wants === 15 &&
      shfBefore("f47").every((sheet) => sheet.side < 17 && sheet.wants < 15),
    "previous peaks side " + Math.max.apply(null, shfBefore("f47").map((sheet) => sheet.side)) +
      ", tray " + Math.max.apply(null, shfBefore("f47").map((sheet) => sheet.wants)));
  check("game-shadow-fold",
    "f48 prints past every sheet before it: a hundred and twenty-one cells off one stamp, past the zenith's eighty-eight",
    shfPrintMax.f48 === 121 &&
      shfBefore("f48").every((sheet) => shfPrintMax[sheet.id] < 121),
    "previous peak " + Math.max.apply(null, shfBefore("f48").map((sheet) => shfPrintMax[sheet.id])));
  check("game-shadow-fold",
    "f49 deals the first sixteen-stamp tray from the widest pool any sheet has drawn from: nineteen open orbits, past f45's sixteen",
    shfSheet("f49").wants === 16 && shfPoolOf.f49 === 19 &&
      shfBefore("f49").every((sheet) => sheet.wants < 16 && shfPoolOf[sheet.id] < 19),
    "previous peaks tray " + Math.max.apply(null, shfBefore("f49").map((sheet) => sheet.wants)) +
      ", pool " + Math.max.apply(null, shfBefore("f49").map((sheet) => shfPoolOf[sheet.id])));
  check("game-shadow-fold",
    "f50 opens the first eleven-crease sheet, and with it the first six-crease axis",
    shfSheet("f50").par === 11 &&
      Math.max.apply(null, shfBefore("f50").map((sheet) => sheet.par)) < 11 &&
      shfAxisPeak(shfSheet("f50")) === 6 &&
      shfBefore("f50").every((sheet) => shfAxisPeak(sheet) < 6),
    "previous peaks par " + Math.max.apply(null, shfBefore("f50").map((sheet) => sheet.par)) +
      ", axis " + Math.max.apply(null, shfBefore("f50").map(shfAxisPeak)));
  check("game-shadow-fold",
    "f51's deal floor is the first past the whole-cloth capstone's 192: no conceivable deal lays less than 224 cells",
    shfFloorOf.f51 === 224 &&
      shfBefore("f51").every((sheet) => shfFloorOf[sheet.id] < 224),
    "previous peak " + Math.max.apply(null, shfBefore("f51").map((sheet) => shfFloorOf[sheet.id])));
  check("game-shadow-fold",
    "f52 opens the first eighteen-cell paper",
    shfSheet("f52").side === 18 &&
      shfBefore("f52").every((sheet) => sheet.side < 18),
    "previous peak " + Math.max.apply(null, shfBefore("f52").map((sheet) => sheet.side)));
  check("game-shadow-fold",
    "the floor ladder climbs 224, 242, 258 across f51, f53 and f54, each claim against every sheet before it",
    shfFloorOf.f53 === 242 && shfFloorOf.f53 > shfFloorOf.f51 &&
      shfBefore("f53").every((sheet) => shfFloorOf[sheet.id] < 242) &&
      shfFloorOf.f54 === 258 && shfFloorOf.f54 > shfFloorOf.f53 &&
      shfBefore("f54").every((sheet) => shfFloorOf[sheet.id] < 258),
    `f51 ${shfFloorOf.f51}, f53 ${shfFloorOf.f53}, f54 ${shfFloorOf.f54}`);
  check("game-shadow-fold",
    "f55 is the widest sheet ever dealt with no keep-clear at all: eighteen open orbits, past f45's sixteen-cell sheet",
    !(shfSheet("f55").avoid || []).length && shfSheet("f55").side === 18 &&
      shfBefore("f55").every((sheet) =>
        (sheet.avoid || []).length || sheet.side < 18),
    "previous avoid-free peak side " +
      Math.max.apply(null, shfBefore("f55")
        .filter((sheet) => !(sheet.avoid || []).length)
        .map((sheet) => sheet.side).concat(0)));
  check("game-shadow-fold",
    "f56 is the only twelve-crease sheet: its pool is spent exactly, sixteen stamps against sixteen open orbits, and every deal floods all 324 cells",
    shfSheets.filter((sheet) => sheet.par >= 12).map((sheet) => sheet.id).join(",") === "f56" &&
      shfPoolOf.f56 === shfSheet("f56").wants &&
      shfCrownStats.f56.min === 324 && shfCrownStats.f56.max === 324 &&
      shfFloorOf.f56 === 324 && shfFloorOf.f56 > shfFloorOf.f54 &&
      shfBefore("f56").every((sheet) => shfFloorOf[sheet.id] < 324),
    `twelve-crease rungs beyond f56: ` +
      shfSheets.slice(shfPosOf("f56") + 1).filter((sheet) => sheet.par >= 12)
        .map((sheet) => sheet.id).join(",") +
      `; pool ${shfPoolOf.f56}, dealt ${shfCrownStats.f56.min}-${shfCrownStats.f56.max}, floor ${shfFloorOf.f56}`);
  check("game-shadow-fold",
    "no rung below the crown fields its hardware - seventeen-cell paper, eleven creases, the fifteen-stamp tray, the six-crease axis, the hundred-plus print and the nineteen-orbit pool all live above f46",
    shfSheets.slice(0, 46).every((sheet) =>
      sheet.side <= 16 && sheet.par <= 10 && sheet.wants <= 14 &&
      shfAxisPeak(sheet) <= 5 && shfPrintMax[sheet.id] <= 88 &&
      shfPoolOf[sheet.id] <= 16),
    shfSheets.slice(0, 46).filter((sheet) =>
      sheet.side > 16 || sheet.par > 10 || sheet.wants > 14 ||
      shfAxisPeak(sheet) > 5 || shfPrintMax[sheet.id] > 88 ||
      shfPoolOf[sheet.id] > 16)
      .map((sheet) => sheet.id).join(","));


  /* The summit sheet names travel with the module: both languages hold a
   * real string for every summit sheet (shfS21-shfS30 from the module's own
   * addStrings), and t() never falls back to the key. */
  check("game-shadow-fold", "the summit sheet names resolve in both languages",
    shfWideIds.concat(shfDeepIds).every((id) => {
      const key = "shfS" + id.slice(1);
      const en = App.I18N && App.I18N.en ? App.I18N.en[key] : null;
      const zh = App.I18N && App.I18N.zh ? App.I18N.zh[key] : null;
      return !!en && en !== key && !!zh && zh !== key && App.t(key) !== key;
    }), "a summit label fell back to its key");
  check("game-shadow-fold", "the ten fourth-tier sheet names resolve in both languages",
    shfNewIds.every((id) => {
      const key = "shfS" + id.slice(1);
      const en = App.I18N && App.I18N.en ? App.I18N.en[key] : null;
      const zh = App.I18N && App.I18N.zh ? App.I18N.zh[key] : null;
      return !!en && en !== key && !!zh && zh !== key && App.t(key) !== key;
    }), "a fourth-tier label fell back to its key");
  check("game-shadow-fold", "the three zenith sheet names resolve in both languages",
    shfZenithIds.every((id) => {
      const key = "lvlNum" + id.slice(1);
      const en = App.I18N && App.I18N.en ? App.I18N.en[key] : null;
      const zh = App.I18N && App.I18N.zh ? App.I18N.zh[key] : null;
      return !!en && en !== key && !!zh && zh !== key && App.t(key) !== key;
    }), "a zenith label fell back to its key");
  check("game-shadow-fold", "the three apex sheet names resolve in both languages",
    shfApexIds.every((id) => {
      const key = "lvlNum" + id.slice(1);
      const en = App.I18N && App.I18N.en ? App.I18N.en[key] : null;
      const zh = App.I18N && App.I18N.zh ? App.I18N.zh[key] : null;
      return !!en && en !== key && !!zh && zh !== key && App.t(key) !== key;
    }), "an apex label fell back to its key");
  check("game-shadow-fold", "the ten crown sheet names resolve in both languages",
    shfCrownIds.every((id) => {
      const key = "shfS" + id.slice(1);
      const en = App.I18N && App.I18N.en ? App.I18N.en[key] : null;
      const zh = App.I18N && App.I18N.zh ? App.I18N.zh[key] : null;
      return !!en && en !== key && !!zh && zh !== key && App.t(key) !== key;
    }), "a crown label fell back to its key");

  /* The unlock chain is derived, never stored, so it scales with the ladder:
   * clearing each sheet in order must hand the player exactly the next one,
   * all fifty-six times, with nothing left locked behind the last. */
  const shfChain = App.createCampaign({
    key: "shadow-fold-gate-chain",
    levels: shfSheets.map((sheet) => ({ id: sheet.id, labelKey: sheet.labelKey })),
  });
  let shfWalked = 0;
  let shfChained = true;
  shfSheets.forEach((sheet, index) => {
    const outcome = shfChain.record(sheet.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) shfWalked += 1;
    const expected = index + 1 < shfSheets.length ? shfSheets[index + 1].id : null;
    if (outcome.unlockedNext !== expected) shfChained = false;
  });
  check("game-shadow-fold", "the unlock chain walks all fifty-six sheets in order",
    shfWalked === 56 && shfChained && shfChain.clearedCount() === 56,
    shfWalked + " first clears");
};
