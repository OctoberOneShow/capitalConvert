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
 * chain are checked last. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const foldForge = require(path.join(root, "tools", "fold-forge.js"));
  const shfSheets = App.foldSheets;
  const shfKeyOf = (cell) => cell.x + "," + cell.y;

  check("game-shadow-fold", "the ladder holds forty sheets",
    shfSheets.length === 40, String(shfSheets.length));
  check("game-shadow-fold", "every sheet id is distinct",
    new Set(shfSheets.map((sheet) => sheet.id)).size === shfSheets.length);
  check("game-shadow-fold", "the ids run f1 through f40 in order",
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
  shfSheets.forEach((sheet) => {
    const avoid = new Set(sheet.avoid || []);
    const unit = foldForge.shfUnit(sheet.intended, sheet.side);
    let printMax = 0;
    let pool = 0;
    unit.forEach((cell) => {
      if (avoid.has(shfKeyOf(cell))) return;
      pool += 1;
      printMax = Math.max(printMax,
        foldForge.shfPositions([cell], sheet.intended, sheet.side).length);
    });
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

  /* The unlock chain is derived, never stored, so it scales with the ladder:
   * clearing each sheet in order must hand the player exactly the next one,
   * all forty times, with nothing left locked behind the last. */
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
  check("game-shadow-fold", "the unlock chain walks all forty sheets in order",
    shfWalked === 40 && shfChained && shfChain.clearedCount() === 40,
    shfWalked + " first clears");
};
