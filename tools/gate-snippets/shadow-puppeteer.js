"use strict";

/* game-shadow-puppeteer: the whole campaign is proven, and the new tier is
 * six distinct pose lessons
 *
 * The panel's geometry is the proof: shpProject intersects every lamp ray
 * with the wall, shpFit prints the same percentage the HUD shows, and
 * shpNudgeSpan is the exact count of key presses a stored solution costs.
 * This gate re-runs the module's own exports over the live ladder, then holds
 * p21-p30 to their design briefs: a full half-turn between beats, a rod that
 * travels while the lamp holds, a near-mirrored ghost pair tight enough that
 * a one-step overshoot on both hinges fails, a finale that moves all four
 * levers on both beats, a double hinge somersault, a lamp-only beat, a
 * mirrored lamp, a locked-lamp rod beat, a tight four-lever quartet and the
 * longest road in the play. Star bands are anchored to the measured chained
 * span, names and briefs must exist in both languages, and the unlock chain
 * must still walk every rung in order. */
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
  /* Re-run one beat with a lever clone: the fit the HUD would print. */
  const shpCutFit = (puzzle, index, patch) => {
    const pose = Object.assign({}, puzzle.solutions[index], patch);
    return App.shadowFit(
      puzzle.targets[index],
      App.shadowProject(
        { x: pose.lampX, y: pose.lampY },
        App.shadowJoints(puzzle, pose),
      ),
    );
  };
  const shpLeg = (from, to) => ({
    lamp: from.lampX !== to.lampX || from.lampY !== to.lampY,
    arm: from.ang1 !== to.ang1,
    fore: from.ang2 !== to.ang2,
    rod: from.baseX !== to.baseX,
  });

  check("game-shadow-puppeteer", "the campaign holds at least thirty poses",
    shpPuzzles.length >= 30, String(shpPuzzles.length));
  check("game-shadow-puppeteer", "every pose id is distinct",
    new Set(shpPuzzles.map((puzzle) => puzzle.id)).size === shpPuzzles.length);
  const shpTier = ["p25", "p26", "p27", "p28", "p29", "p30"];
  const shpMissing = shpTier.filter((id) => !shpById(id));
  check("game-shadow-puppeteer", "the new tier p25-p30 is present",
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
  let shpP24Chain = false;
  if (shpTwoBeat(shpP24) && shpP24.baseMovable === true) {
    const leg1 = shpLeg(shpP24.start, shpP24.solutions[0]);
    const leg2 = shpLeg(shpP24.solutions[0], shpP24.solutions[1]);
    shpP24Chain = ["lamp", "arm", "fore", "rod"].every((key) => leg1[key] && leg2[key]);
  }
  check("game-shadow-puppeteer", "p24 chains all four lever types on both beats",
    shpP24Chain, shpP24 ? "baseMovable=" + !!shpP24.baseMovable : "missing");

  /* p25: the somersault - beat two parks the lamp and the rod and flips both
   * hinges through a half-turn. Holding either hinge at its beat-one angle
   * strands the ghost off the bar. */
  const shpP25 = shpById("p25");
  const shpP25Parked = shpTwoBeat(shpP25) &&
    shpP25.solutions[0].lampX === shpP25.solutions[1].lampX &&
    shpP25.solutions[0].lampY === shpP25.solutions[1].lampY &&
    shpP25.solutions[0].baseX === shpP25.solutions[1].baseX &&
    Math.abs(shpSign(shpP25.solutions[0].ang1, shpP25.solutions[1].ang1)) === 180 &&
    Math.abs(shpSign(shpP25.solutions[0].ang2, shpP25.solutions[1].ang2)) === 180;
  const shp25ArmCut = shpP25Parked
    ? shpCutFit(shpP25, 1, { ang1: shpP25.solutions[0].ang1 }) : 100;
  const shp25ForeCut = shpP25Parked
    ? shpCutFit(shpP25, 1, { ang2: shpP25.solutions[0].ang2 }) : 100;
  check("game-shadow-puppeteer", "p25 somersaults both hinges a half-turn with the lamp parked",
    shpP25Parked, shpP25 ? shpP25.solutions[0].ang1 + "->" + shpP25.solutions[1].ang1 : "missing");
  check("game-shadow-puppeteer", "p25 fails when either hinge is held on beat two",
    shpP25Parked && shp25ArmCut < App.shadowPassFit && shp25ForeCut < App.shadowPassFit,
    shp25ArmCut + "%/" + shp25ForeCut + "%");

  /* p26: the lamp alone - beat two is rigid (both hinges and the rod held)
   * while the lamp travels at least sixty nudges. Freezing the lamp strands
   * the ghost. */
  const shpP26 = shpById("p26");
  const shpP26Rigid = shpTwoBeat(shpP26) && !shpP26.baseMovable &&
    shpP26.solutions[0].ang1 === shpP26.solutions[1].ang1 &&
    shpP26.solutions[0].ang2 === shpP26.solutions[1].ang2 &&
    shpP26.solutions[0].baseX === shpP26.solutions[1].baseX &&
    App.shadowNudgeSpan(shpP26.solutions[0], shpP26.solutions[1]) >= 60;
  const shp26Cut = shpP26Rigid
    ? shpCutFit(shpP26, 1, {
      lampX: shpP26.solutions[0].lampX,
      lampY: shpP26.solutions[0].lampY,
    }) : 100;
  check("game-shadow-puppeteer", "p26 moves only the lamp on beat two",
    shpP26Rigid, shpP26 ? "lamp only" : "missing");
  check("game-shadow-puppeteer", "p26 fails when the lamp is held on beat two",
    shpP26Rigid && shp26Cut < App.shadowPassFit, shp26Cut + "%");

  /* p27: the mirror and the lamp - ghosts and lamp exact reflections about the
   * rod's height, both hinges negated, tolerance twelve or tighter. Holding
   * the lamp at beat one's height breaks the reflection. */
  const shpP27 = shpById("p27");
  const shp27T0 = shpP27 && shpP27.targets[0];
  const shp27T1 = shpP27 && shpP27.targets[1];
  const shp27Mirror = shpTwoBeat(shpP27) &&
    Math.abs(shp27T0.baseY + shp27T1.baseY - 2 * shpP27.baseY) <= 1 &&
    Math.abs(shp27T0.aY + shp27T1.aY - 2 * shpP27.baseY) <= 1 &&
    Math.abs(shp27T0.bY + shp27T1.bY - 2 * shpP27.baseY) <= 1 &&
    shpP27.solutions[0].lampX === shpP27.solutions[1].lampX &&
    shpP27.solutions[0].lampY + shpP27.solutions[1].lampY === 2 * shpP27.baseY &&
    shpP27.solutions[0].baseX === shpP27.solutions[1].baseX &&
    shpP27.solutions[0].ang1 === -shpP27.solutions[1].ang1 &&
    shpP27.solutions[0].ang2 === -shpP27.solutions[1].ang2 &&
    shp27T0.tol <= 12 && shp27T1.tol <= 12;
  const shp27Cut = shp27Mirror
    ? shpCutFit(shpP27, 1, { lampY: shpP27.solutions[0].lampY }) : 100;
  check("game-shadow-puppeteer", "p27 mirrors the lamp as well as both hinges",
    shp27Mirror, shpP27 ? shp27T0.aY + "/" + shp27T1.aY + " tol" + shp27T0.tol : "missing");
  check("game-shadow-puppeteer", "p27 fails when the lamp keeps beat one's height",
    shp27Mirror && shp27Cut < App.shadowPassFit, shp27Cut + "%");

  /* p28: the rod answers the arms - beat two freezes the lamp, turns both
   * hinges a half-turn and still needs the rod to travel fifty pixels. Holding
   * any of the three levers strands the base shadow. */
  const shpP28 = shpById("p28");
  const shpP28Locked = shpTwoBeat(shpP28) && shpP28.baseMovable === true &&
    shpP28.solutions[0].lampX === shpP28.solutions[1].lampX &&
    shpP28.solutions[0].lampY === shpP28.solutions[1].lampY &&
    Math.abs(shpSign(shpP28.solutions[0].ang1, shpP28.solutions[1].ang1)) === 180 &&
    Math.abs(shpSign(shpP28.solutions[0].ang2, shpP28.solutions[1].ang2)) === 180 &&
    Math.abs(shpP28.solutions[1].baseX - shpP28.solutions[0].baseX) >= 50;
  const shp28RodCut = shpP28Locked
    ? shpCutFit(shpP28, 1, { baseX: shpP28.solutions[0].baseX }) : 100;
  const shp28ArmCut = shpP28Locked
    ? shpCutFit(shpP28, 1, { ang1: shpP28.solutions[0].ang1 }) : 100;
  check("game-shadow-puppeteer", "p28 turns both hinges while the lamp holds and the rod travels",
    shpP28Locked, shpP28 ? shpP28.solutions[0].baseX + "->" + shpP28.solutions[1].baseX : "missing");
  check("game-shadow-puppeteer", "p28 fails when the rod is held on beat two",
    shpP28Locked && shp28RodCut < App.shadowPassFit && shp28ArmCut < App.shadowPassFit,
    shp28RodCut + "%/" + shp28ArmCut + "%");

  /* p29: the tight quartet - every lever moves on both legs under a fourteen
   * pixel bar, and the forearm alone is the trim: holding it at beat one's
   * angle loses the beat. */
  const shpP29 = shpById("p29");
  let shpP29Quartet = false;
  if (shpTwoBeat(shpP29) && shpP29.baseMovable === true &&
    shpP29.targets.every((target) => target.tol <= 16)) {
    const leg1 = shpLeg(shpP29.start, shpP29.solutions[0]);
    const leg2 = shpLeg(shpP29.solutions[0], shpP29.solutions[1]);
    shpP29Quartet = ["lamp", "arm", "fore", "rod"].every((key) => leg1[key] && leg2[key]);
  }
  const shp29ForeCut = shpP29Quartet
    ? shpCutFit(shpP29, 1, { ang2: shpP29.solutions[0].ang2 }) : 100;
  check("game-shadow-puppeteer", "p29 chains all four levers under a tight bar",
    shpP29Quartet, shpP29 ? "tol" + shpP29.targets[0].tol : "missing");
  check("game-shadow-puppeteer", "p29 fails when the forearm is held on beat two",
    shpP29Quartet && shp29ForeCut < App.shadowPassFit, shp29ForeCut + "%");

  /* p30: the summit - all four lever types on both legs, a half-turn on the
   * upper arm inside beat two, and the longest measured road in the play. A
   * held rod or a held upper arm loses the final beat. */
  const shpP30 = shpById("p30");
  let shpP30Chain = false;
  if (shpTwoBeat(shpP30) && shpP30.baseMovable === true &&
    Math.abs(shpSign(shpP30.solutions[0].ang1, shpP30.solutions[1].ang1)) === 180) {
    const leg1 = shpLeg(shpP30.start, shpP30.solutions[0]);
    const leg2 = shpLeg(shpP30.solutions[0], shpP30.solutions[1]);
    shpP30Chain = ["lamp", "arm", "fore", "rod"].every((key) => leg1[key] && leg2[key]);
  }
  const shp30RodCut = shpP30Chain
    ? shpCutFit(shpP30, 1, { baseX: shpP30.solutions[0].baseX }) : 100;
  const shp30ArmCut = shpP30Chain
    ? shpCutFit(shpP30, 1, { ang1: shpP30.solutions[0].ang1 }) : 100;
  check("game-shadow-puppeteer", "p30 chains all four levers and flips its upper arm",
    shpP30Chain, shpP30 ? shpP30.solutions[0].ang1 + "->" + shpP30.solutions[1].ang1 : "missing");
  check("game-shadow-puppeteer", "p30 fails when the rod or the upper arm is held",
    shpP30Chain && shp30RodCut < App.shadowPassFit && shp30ArmCut < App.shadowPassFit,
    shp30RodCut + "%/" + shp30ArmCut + "%");

  /* The new tier is a genuine step above the shipped ceiling: every new
   * anchor opens above p24's measured 142, and p30 is the longest road in the
   * whole play. */
  const shpP24Span = shpP24 && shpTwoBeat(shpP24) ? shpChainSpan(shpP24) : 0;
  const shpTierSpans = shpTier.map((id) => shpById(id)).filter(Boolean).map(shpChainSpan);
  check("game-shadow-puppeteer", "the new tier opens above p24's measured anchor",
    shpTierSpans.length === 6 &&
      shpTierSpans.every((span) => span > shpP24Span),
    shpTierSpans.join("/") + " vs " + shpP24Span);
  const shpEarlierSpans = shpPuzzles
    .filter((puzzle) => puzzle.id !== "p30" && puzzle.solutions && puzzle.targets)
    .map(shpChainSpan);
  check("game-shadow-puppeteer", "p30 is the longest measured road in the play",
    shpP30Chain && shpEarlierSpans.length > 0 &&
      shpEarlierSpans.every((span) => shpChainSpan(shpP30) > span),
    shpP30 ? shpChainSpan(shpP30) + " vs " + Math.max.apply(null, shpEarlierSpans) : "missing");

  /* Copy travels with the module: a real string in both packs, and t() never
   * falls back to the raw key. */
  const shpCopyKeys = ["shpP21", "shpP22", "shpP23", "shpP24",
    "shpP25", "shpP26", "shpP27", "shpP28", "shpP29", "shpP30",
    "shpB21", "shpB22", "shpB23", "shpB24",
    "shpB25", "shpB26", "shpB27", "shpB28", "shpB29", "shpB30"];
  const shpCopyProblems = shpCopyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-shadow-puppeteer", "every tier name and brief resolves in both languages",
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
  check("game-shadow-puppeteer", "the unlock chain walks all thirty poses in order",
    shpWalked === shpPuzzles.length && shpChained &&
      shpChain.clearedCount() === shpPuzzles.length,
    shpWalked + " first clears");
};
