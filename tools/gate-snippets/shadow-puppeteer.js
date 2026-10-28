"use strict";

/* game-shadow-puppeteer: the whole campaign is proven, and the new tier is
 * four distinct pose lessons
 *
 * The panel's geometry is the proof: shpProject intersects every lamp ray
 * with the wall, shpFit prints the same percentage the HUD shows, and
 * shpNudgeSpan is the exact count of key presses a stored solution costs.
 * This gate re-runs the module's own exports over the live ladder, then holds
 * p21-p24 to their design briefs: a full half-turn between beats, a rod that
 * travels while the lamp holds, a near-mirrored ghost pair tight enough that
 * a one-step overshoot on both hinges fails, and a finale that moves all four
 * levers on both beats. Star bands are anchored to the measured chained span,
 * names and briefs must exist in both languages, and the unlock chain must
 * still walk every rung in order. */
module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const shpPuzzles = App.shadowPuzzles;
  const shpById = (id) => shpPuzzles.find((puzzle) => puzzle.id === id);
  const shpSign = (from, to) => {
    let delta = to - from;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    return delta;
  };
  /* The chained nudge road start -> beat 1 -> beat 2, in the module's own
   * units. A stored band that is lower than this is unreachable at three
   * stars; a band anchored higher is invented. */
  const shpChainSpan = (puzzle) => {
    let span = 0;
    let prev = puzzle.start;
    puzzle.solutions.forEach((sol) => {
      span += App.shadowNudgeSpan(prev, sol);
      prev = sol;
    });
    return span;
  };
  const shpTwoBeat = (puzzle) => !!puzzle && !!puzzle.targets && puzzle.targets.length === 2;

  check("game-shadow-puppeteer", "the campaign holds at least twenty-four poses",
    shpPuzzles.length >= 24, String(shpPuzzles.length));
  check("game-shadow-puppeteer", "every pose id is distinct",
    new Set(shpPuzzles.map((puzzle) => puzzle.id)).size === shpPuzzles.length);
  const shpTier = ["p21", "p22", "p23", "p24"];
  const shpMissing = shpTier.filter((id) => !shpById(id));
  check("game-shadow-puppeteer", "the new tier p21-p24 is present",
    shpMissing.length === 0, shpMissing.join(","));

  /* Every ghost was built from the module's own projection, so the module's
   * own fit percentage must clear the shipped pass bar on every beat. */
  const shpFitProblems = [];
  shpPuzzles.forEach((puzzle) => {
    if (!puzzle.solutions || !puzzle.targets) {
      return;
    }
    if (puzzle.solutions.length !== puzzle.targets.length) {
      shpFitProblems.push(puzzle.id + ":beat-count");
      return;
    }
    puzzle.solutions.forEach((sol, index) => {
      const projected = App.shadowProject(
        { x: sol.lampX, y: sol.lampY },
        App.shadowJoints(puzzle, sol),
      );
      const fit = App.shadowFit(puzzle.targets[index], projected);
      if (fit < App.shadowPassFit) {
        shpFitProblems.push(puzzle.id + "#" + (index + 1) + ":" + fit + "%");
      }
    });
  });
  check("game-shadow-puppeteer", "every stored solution covers its ghost at the pass bar",
    shpFitProblems.length === 0,
    shpFitProblems.length ? shpFitProblems.join(" ") : "all beats fit");

  /* Bands: the two-beat anchor is measured, never guessed, and the three
   * lines only widen. This covers the shipped two-beat poses as well, so a
   * new rung cannot quietly inherit a stale anchor. */
  const shpAnchorProblems = [];
  const shpBandProblems = [];
  shpPuzzles.forEach((puzzle) => {
    if (!shpTwoBeat(puzzle)) {
      return;
    }
    const span = shpChainSpan(puzzle);
    if (puzzle.starNudges[0] !== span) {
      shpAnchorProblems.push(puzzle.id + ":" + puzzle.starNudges[0] + "vs" + span);
    }
    if (!(puzzle.starNudges[0] < puzzle.starNudges[1] &&
      puzzle.starNudges[1] < puzzle.starNudges[2])) {
      shpBandProblems.push(puzzle.id + ":" + puzzle.starNudges.join("/"));
    }
  });
  check("game-shadow-puppeteer", "every two-beat star anchor is its measured chained span",
    shpAnchorProblems.length === 0,
    shpAnchorProblems.length ? shpAnchorProblems.join(" ") : "all two-beat anchors measured");
  check("game-shadow-puppeteer", "every two-beat star band only widens",
    shpBandProblems.length === 0, shpBandProblems.join(" "));

  /* p21: a full 180-degree hinge turn between beats, with the lamp and rod
   * parked, so the turn itself is the only road. */
  const shpP21 = shpById("p21");
  const shpP21Turn = shpTwoBeat(shpP21) &&
    shpP21.solutions[0].lampX === shpP21.solutions[1].lampX &&
    shpP21.solutions[0].lampY === shpP21.solutions[1].lampY &&
    shpP21.solutions[0].baseX === shpP21.solutions[1].baseX &&
    (Math.abs(shpSign(shpP21.solutions[0].ang1, shpP21.solutions[1].ang1)) === 180 ||
      Math.abs(shpSign(shpP21.solutions[0].ang2, shpP21.solutions[1].ang2)) === 180);
  check("game-shadow-puppeteer", "p21 turns a hinge through a full 180 degrees between beats",
    shpP21Turn, shpP21 ? shpP21.solutions[0].ang1 + "->" + shpP21.solutions[1].ang1 : "missing");

  /* p22: beat two is a rod performance - the lamp does not move at all and
   * the plinth travels at least forty pixels. */
  const shpP22 = shpById("p22");
  const shpP22Rod = shpTwoBeat(shpP22) && shpP22.baseMovable === true &&
    shpP22.solutions[0].lampX === shpP22.solutions[1].lampX &&
    shpP22.solutions[0].lampY === shpP22.solutions[1].lampY &&
    Math.abs(shpP22.solutions[1].baseX - shpP22.solutions[0].baseX) >= 40;
  check("game-shadow-puppeteer", "p22 travels the rod at least forty pixels while the lamp holds",
    shpP22Rod, shpP22 ? shpP22.solutions[0].baseX + "->" + shpP22.solutions[1].baseX : "missing");

  /* p23: the ghosts are mirrored about the rod height, the stored hinges are
   * exact opposites, the tolerance is the tightest in the tier, and the
   * engine itself rejects a one-step overshoot on both hinges. */
  const shpP23 = shpById("p23");
  const shpT0 = shpP23 && shpP23.targets[0];
  const shpT1 = shpP23 && shpP23.targets[1];
  const shp23Mirror = shpTwoBeat(shpP23) &&
    shpT0.baseY === shpT1.baseY &&
    Math.abs(shpT0.aY + shpT1.aY - 2 * shpT0.baseY) <= 2 &&
    Math.abs(shpT0.bY + shpT1.bY - 2 * shpT0.baseY) <= 2 &&
    shpP23.solutions[0].ang1 === -shpP23.solutions[1].ang1 &&
    shpP23.solutions[0].ang2 === -shpP23.solutions[1].ang2 &&
    shpP23.solutions[0].lampX === shpP23.solutions[1].lampX &&
    shpP23.solutions[0].baseX === shpP23.solutions[1].baseX &&
    shpT0.tol <= 14 && shpT1.tol <= 14;
  check("game-shadow-puppeteer", "p23 mirrors its ghosts and hinges with the tightest tolerance",
    shp23Mirror, shpP23 ? shpT0.aY + "/" + shpT1.aY + " tol" + shpT0.tol : "missing");
  let shp23Overfit = 100;
  if (shp23Mirror) {
    const overshoot = Object.assign({}, shpP23.solutions[1], {
      ang1: shpP23.solutions[1].ang1 + 5,
      ang2: shpP23.solutions[1].ang2 + 5,
    });
    shp23Overfit = App.shadowFit(
      shpT1,
      App.shadowProject(
        { x: overshoot.lampX, y: overshoot.lampY },
        App.shadowJoints(shpP23, overshoot),
      ),
    );
  }
  check("game-shadow-puppeteer", "p23 fails one extra step on both hinges",
    shp23Mirror && shp23Overfit < App.shadowPassFit, shp23Overfit + "%");

  /* p24: the finale chains all four lever types on both legs - lamp x/y,
   * upper arm, forearm and rod each move from the start to beat one and
   * again from beat one to beat two. */
  const shpP24 = shpById("p24");
  const shpLeg = (from, to) => ({
    lamp: from.lampX !== to.lampX || from.lampY !== to.lampY,
    arm: from.ang1 !== to.ang1,
    fore: from.ang2 !== to.ang2,
    rod: from.baseX !== to.baseX,
  });
  let shpP24Chain = false;
  if (shpTwoBeat(shpP24) && shpP24.baseMovable === true) {
    const leg1 = shpLeg(shpP24.start, shpP24.solutions[0]);
    const leg2 = shpLeg(shpP24.solutions[0], shpP24.solutions[1]);
    shpP24Chain = ["lamp", "arm", "fore", "rod"].every((key) => leg1[key] && leg2[key]);
  }
  check("game-shadow-puppeteer", "p24 chains all four lever types on both beats",
    shpP24Chain, shpP24 ? "baseMovable=" + !!shpP24.baseMovable : "missing");

  /* The tier is a genuine step above the shipped ceiling: each new anchor is
   * longer than p20's measured anchor. */
  const shpP20 = shpById("p20");
  const shpTierSpans = shpTier.map((id) => shpById(id)).filter(Boolean).map(shpChainSpan);
  check("game-shadow-puppeteer", "the new tier opens above p20's measured anchor",
    shpTierSpans.length === 4 && shpP20 &&
      shpTierSpans.every((span) => span > shpChainSpan(shpP20)),
    shpTierSpans.join("/") + " vs " + (shpP20 ? shpChainSpan(shpP20) : "missing"));

  /* Copy travels with the module: a real string in both packs, and t() never
   * falls back to the raw key. */
  const shpCopyKeys = ["shpP21", "shpP22", "shpP23", "shpP24",
    "shpB21", "shpB22", "shpB23", "shpB24"];
  const shpCopyProblems = shpCopyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-shadow-puppeteer", "the four names and briefs resolve in both languages",
    shpCopyProblems.length === 0, shpCopyProblems.join(","));

  /* The chain is derived from the live ladder, so it must hand out every rung
   * in order and leave nothing locked after the finale. */
  const shpChain = App.createCampaign({
    key: "shadow-puppeteer-gate-chain",
    levels: shpPuzzles.map((puzzle) => ({ id: puzzle.id, labelKey: puzzle.labelKey })),
  });
  let shpWalked = 0;
  let shpChained = true;
  shpPuzzles.forEach((puzzle, index) => {
    const outcome = shpChain.record(puzzle.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) {
      shpWalked += 1;
    }
    const expected = index + 1 < shpPuzzles.length ? shpPuzzles[index + 1].id : null;
    if (outcome.unlockedNext !== expected) {
      shpChained = false;
    }
  });
  check("game-shadow-puppeteer", "the unlock chain walks all twenty-four poses in order",
    shpWalked === shpPuzzles.length && shpChained &&
      shpChain.clearedCount() === shpPuzzles.length,
    shpWalked + " first clears");
};
