"use strict";

/* game-shadow-fold: the whole ladder replays the forge's seeded deals, and the
 * summit tier is the hard tier
 *
 * The forge (tools/fold-forge.js) transcribes the panel's own mirror
 * arithmetic (shfPositions / shfUnit / shfTargetSolvable / shfDeal) and asks
 * three questions of a sheet: the seeded deals all solve and none falls
 * through to the authored reserve, every intended crease is provably needed,
 * and the reserve itself is clean. This gate re-judges the whole shipped
 * ladder through that checker, then holds the summit tier to its design
 * brief: the shipped paper with more creases and more stamps asked than the
 * shipped ceiling, star bands that hang off the creases the forge measured
 * and cut where the module's own scorer says they do, the module's own deal
 * path dealing solvable sheets live, names that resolve in both languages,
 * and an unlock chain that still walks one rung per sheet at twenty-four. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const foldForge = require(path.join(root, "tools", "fold-forge.js"));
  const shfSheets = App.foldSheets;

  check("game-shadow-fold", "the ladder holds twenty-four sheets",
    shfSheets.length === 24, String(shfSheets.length));
  check("game-shadow-fold", "every sheet id is distinct",
    new Set(shfSheets.map((sheet) => sheet.id)).size === shfSheets.length);
  check("game-shadow-fold", "the ids run f1 through f24 in order",
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

  /* The three questions, re-run over the whole ladder - the shipped twenty
   * included, so the summit tier cannot ship with a quietly broken elder. */
  shfSeeded(41027, () => {
    shfSheets.forEach((sheet) => {
      const report = foldForge.checkSheet(sheet, 12);
      check("game-shadow-fold", `${sheet.id}: the forge's three questions answer clean`,
        report.problems.length === 0, report.problems.join("; "));
    });
  });

  /* The tier rows all exist, and the tier is the hard tier in the ladder's
   * own terms: the shipped calibration is nine-cell paper with at most six
   * creases and six stamps, and the summit holds that paper while raising
   * both ceilings, with one rung maxing them together. */
  const shfTierIds = ["f21", "f22", "f23", "f24"];
  const shfTier = shfSheets.filter((sheet) => shfTierIds.includes(sheet.id));
  const shfShipped = shfSheets.filter((sheet) => !shfTierIds.includes(sheet.id));
  check("game-shadow-fold", "the summit tier rows all exist", shfTier.length === 4,
    shfTier.map((sheet) => sheet.id).join(","));
  check("game-shadow-fold",
    "the summit tier holds the shipped paper and maxes the crease and tray ceilings",
    shfShipped.every((sheet) => sheet.side <= 9 && sheet.par <= 6 && sheet.wants <= 6) &&
    shfTier.every((sheet) => sheet.side === 9 && sheet.par >= 6 && sheet.wants >= 6) &&
    shfTier.some((sheet) => sheet.par === 7) &&
    shfTier.some((sheet) => sheet.wants === 7) &&
    shfTier.some((sheet) => sheet.par === 7 && sheet.wants === 7),
    shfTier.map((sheet) => sheet.id + ":p" + sheet.par + "/w" + sheet.wants).join(" "));

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
   * region, and the module's own solvability check signs the deal. */
  const shfKeyOf = (cell) => cell.x + "," + cell.y;
  shfTier.forEach((sheet) => {
    const unitKeys = new Set(
      foldForge.shfUnit(sheet.intended, sheet.side).map((cell) => shfKeyOf(cell)));
    for (let seed = 1; seed <= 8; seed += 1) {
      const deal = shfSeeded(seed * 104729 + sheet.wants, () => App.foldDeal(sheet));
      const good = !!deal &&
        deal.stamps.length === sheet.wants &&
        deal.stamps.every((cell) => unitKeys.has(shfKeyOf(cell))) &&
        deal.budget === deal.stamps.length + 1 &&
        deal.target.length > deal.budget &&
        App.foldTargetSolvable(deal.target, sheet.intended, sheet.side).ok;
      check("game-shadow-fold",
        `${sheet.id}: the module's own deal path deals a solvable sheet (seed ${seed})`,
        good, JSON.stringify(deal && { n: deal.stamps.length, t: deal.target.length }));
    }
  });

  /* The summit sheet names travel with the module: both languages hold a
   * real string for every new sheet (shfS21-shfS24 from the module's own
   * addStrings), and t() never falls back to the key. */
  check("game-shadow-fold", "the summit sheet names resolve in both languages",
    shfTierIds.every((id) => {
      const key = "shfS" + id.slice(1);
      const en = App.I18N && App.I18N.en ? App.I18N.en[key] : null;
      const zh = App.I18N && App.I18N.zh ? App.I18N.zh[key] : null;
      return !!en && en !== key && !!zh && zh !== key && App.t(key) !== key;
    }), "a summit label fell back to its key");

  /* The unlock chain is derived, never stored, so it scales with the ladder:
   * clearing each sheet in order must hand the player exactly the next one,
   * all twenty-four times, with nothing left locked behind the last. */
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
  check("game-shadow-fold", "the unlock chain walks all twenty-four sheets in order",
    shfWalked === 24 && shfChained && shfChain.clearedCount() === 24,
    shfWalked + " first clears");
};
