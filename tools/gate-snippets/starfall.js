"use strict";

/* game-starfall: the whole ladder replays the forge's seeded flights, and
 * the chasm tier is held to its own design brief
 *
 * The forge (tools/starfall-forge.js) re-hosts the panel's flight (same
 * thrust, gravity, burn rate, safe gates, pad window) and flies its swarm
 * of scripted pilots at every sector - a sector ships only when one of
 * those pilots touches down inside the pad window with fuel on the gauge
 * and a controlled descent, and the star bands are that measured landing's
 * own line - 62/42/22 percent of the best fuel it leaves, the shipped
 * calibration. This gate re-judges all forty sectors through that same
 * flight, then holds the tiers to their briefs: the calibration rows stay
 * on gentle gravity with generous tanks; the heavy-gravity tier carries
 * the same engines into the regime where the tank decides the run; the
 * summit tier changes what the ground asks of the descent, one idea per
 * sector; the last ridge tier flattens the gravity walk and lets the
 * ridge make the difficulty.
 *
 * The fourth tier s31-s40 drops the range into a chasm and takes one
 * structural record per rung against every sector before it, the way the
 * shadow-fold ladder's fourth tier does. Every record is a number the
 * engine printed: the tightest window (the first thirty's floor was the
 * Last Inch's twenty-four pixels; the tier cuts twenty-two, twenty,
 * eighteen and finally a sixteen-pixel capstone), the busiest ground
 * (twelve then thirteen control points past the eleven-point ceiling),
 * the deepest window (a 322 floor under the Wedge's 320), the tallest
 * rock (88 units of tower over the floor, past Iron Vale's 86), and the
 * deepest trap (a chasm 92 then 102 units below the window, past the
 * Needles' 90). The records are scoped by position - later tiers
 * legitimately overtake earlier ones - and the gravity, tank and window
 * lines never fall within the tier. The tank's walk is the pull's own
 * bill and is measured too: the burn a landing charges climbs with
 * gravity (near 47 at 177, near 54 by 186 on the swarm's numbers), so
 * the tier drains 57 to 52 and ships its deep floors early. Star bands,
 * both languages and the unlock chain are checked last. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const forge = require(path.join(root, "tools", "starfall-forge.js"));
  const lantLevels = forge.loadLevels();
  const LANT_WIDTH = 320;

  check("game-starfall", "the sky holds forty sectors",
    lantLevels.length === 40, String(lantLevels.length));
  check("game-starfall", "every sector id is distinct",
    new Set(lantLevels.map((level) => level.id)).size === lantLevels.length,
    lantLevels.map((level) => level.id).join(" "));
  check("game-starfall", "the ladder is ordered and gapless",
    lantLevels.every((level, index) => level.id === "s" + (index + 1)),
    lantLevels.map((level) => level.id).join(","));

  /* The forge's flight arithmetic is deterministic - fixed 1/60 steps, no
   * randomness anywhere - but the campaign walk below runs through the
   * booted app, so the seeded swap keeps the whole gate reproducible
   * wherever anything reaches for Math.random. */
  const lantSeeded = (seed, fn) => {
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

  /* The forge's checker and the full pilot swarm, re-run over the whole
   * ladder - the shipped rows included, so the chasm tier cannot ship
   * with a quietly broken elder. Every sector must clear the field
   * checks and land a pilot inside the window with fuel on the gauge and
   * the engine's own safe gates met. */
  lantSeeded(41027, () => {
    lantLevels.forEach((level) => {
      const report = forge.checkLevel(level);
      check("game-starfall", `${level.id}: the forge's own checker clears it`,
        report.problems.length === 0, report.problems.join("; "));
      const landing = forge.bestLanding(level);
      check("game-starfall",
        `${level.id}: a pilot lands inside the window with fuel and a controlled descent`,
        !!landing && landing.safe && landing.fuel > 0,
        landing
          ? "fuel " + landing.fuel + ", vy " + landing.vy.toFixed(1) +
            ", vx " + landing.vx.toFixed(1) + ", angle " + landing.angle.toFixed(2)
          : "no pilot reaches the pad");
    });
  });

  const lantSummitIds = ["s21", "s22", "s23", "s24"];
  const lantRidgeIds = ["s25", "s26", "s27", "s28", "s29", "s30"];
  const lantChasmIds = ["s31", "s32", "s33", "s34", "s35", "s36", "s37", "s38", "s39", "s40"];
  const lantSummit = lantLevels.filter((level) => lantSummitIds.includes(level.id));
  const lantRidge = lantLevels.filter((level) => lantRidgeIds.includes(level.id));
  const lantChasm = lantLevels.filter((level) => lantChasmIds.includes(level.id));

  /* The ascent never backs up, anywhere on the ladder. */
  check("game-starfall", "gravity only climbs across the whole ladder",
    lantLevels.every((level, index) =>
      index === 0 || level.gravity > lantLevels[index - 1].gravity),
    lantLevels.map((level) => "g" + level.gravity).join(" "));

  /* Tier one through three briefs: the calibration rows on gentle gravity,
   * the heavy tier into the tank-decided regime, the summit tier past the
   * shipped ceiling, the ridge tier with the walk flattened. */
  check("game-starfall", "the calibration rows stay under the heavy tier's pull",
    lantLevels.slice(0, 10).every((level) => level.gravity <= 124 && level.fuel >= 76),
    lantLevels.slice(0, 10).map((level) => level.id + ":g" + level.gravity).join(" "));
  check("game-starfall", "the summit tier rows all exist and climb past the ridge ceiling with thrust in hand",
    lantSummit.length === 4 &&
    lantSummit.every((level) => level.gravity > 154 && level.gravity <= 200),
    lantSummit.map((level) => level.id + ":g" + level.gravity).join(" "));
  check("game-starfall", "the summit tier keeps draining the tank",
    lantSummit.every((level) => level.fuel < 68) &&
    lantSummit.every((level, index) =>
      index === 0 || level.fuel < lantSummit[index - 1].fuel),
    lantSummit.map((level) => "f" + level.fuel).join(" "));
  check("game-starfall",
    "the ridge tier opens above the summit and its gravity walk flattens",
    lantRidge.length === 6 &&
    lantRidge[0].gravity > lantSummit[lantSummit.length - 1].gravity &&
    lantRidge.every((level) => level.gravity > 154 && level.gravity <= 200) &&
    lantRidge[lantRidge.length - 1].gravity - lantRidge[0].gravity <= 6,
    lantRidge.map((level) => "g" + level.gravity).join(" "));
  check("game-starfall", "the ridge tier keeps draining the tank",
    lantRidge.every((level) => level.fuel < 68) &&
    lantRidge.every((level, index) =>
      index === 0 || level.fuel < lantRidge[index - 1].fuel) &&
    lantRidge[0].fuel < lantSummit[lantSummit.length - 1].fuel,
    lantRidge.map((level) => "f" + level.fuel).join(" "));

  /* The chasm tier's own brief. The pull's walk resumes, the tank pays
   * the burn the pull charges, and every window is tighter than the Last
   * Inch's - the numbers below are the ones the swarm printed, with the
   * records scoped by position against every sector before each rung. */
  const lantPosOf = (id) => lantLevels.findIndex((level) => level.id === id);
  const lantBefore = (id) => lantLevels.slice(0, lantPosOf(id));
  const lantSheet = (id) => lantLevels.find((level) => level.id === id);

  /* Field measures, read off each sector's own terrain with the module's
   * arithmetic: the window's width in pixels, the control-point count,
   * the tallest rock over the window's floor and the deepest ground
   * below it. Every terrain extreme sits on a control point, so the
   * sampled peaks are exact; the width is held to two decimals so equal
   * fractions compare equal through the float subtraction. */
  const lantWidthOf = (level) =>
    Math.round((level.pad.x1 - level.pad.x0) * LANT_WIDTH * 100) / 100;
  const lantTerrainPeak = (level, pick) => {
    let extreme = pick === "high" ? Infinity : -Infinity;
    for (let x = 0; x <= LANT_WIDTH; x += 0.5) {
      const y = forge.terrainY(level, x);
      extreme = pick === "high" ? Math.min(extreme, y) : Math.max(extreme, y);
    }
    return extreme;
  };
  const lantWallOf = (level) =>
    Math.round((level.pad.y - lantTerrainPeak(level, "high")) * 100) / 100;
  const lantBasinOf = (level) =>
    Math.round((lantTerrainPeak(level, "low") - level.pad.y) * 100) / 100;

  const lantChasmG = lantChasm.map((level) => level.gravity);
  const lantChasmF = lantChasm.map((level) => level.fuel);
  const lantChasmW = lantChasm.map((level) => lantWidthOf(level));
  const lantNeverFalls = (list) => list.every((n, i) => i === 0 || n <= list[i - 1]);

  check("game-starfall", "the chasm tier rows all exist",
    lantChasm.length === 10, lantChasm.map((level) => level.id).join(","));
  check("game-starfall",
    "the chasm tier resumes the gravity walk - 177 to 186, still 49 inside the engine's thrust",
    lantChasmG[0] === 177 && lantChasmG[lantChasmG.length - 1] === 186 &&
    lantChasmG.every((g, i) => i === 0 || g === lantChasmG[i - 1] + 1) &&
    lantChasmG.every((g) => g > 176 && g <= 200) &&
    235 - lantChasmG[lantChasmG.length - 1] >= 49,
    lantChasmG.join("/"));
  check("game-starfall",
    "the chasm tier's tank starts under the ridge's 58, never rises and ends at 52",
    lantChasmF[0] === 57 && lantChasmF[lantChasmF.length - 1] === 52 &&
    lantNeverFalls(lantChasmF) && lantChasmF[0] < lantRidge[lantRidge.length - 1].fuel,
    lantChasmF.join("/"));
  check("game-starfall",
    "every chasm window is tighter than the Last Inch's and the line never widens",
    lantChasmW.every((w) => w < 24) && lantNeverFalls(lantChasmW),
    lantChasmW.map((w) => w.toFixed(2)).join("/"));
  check("game-starfall",
    "the Last Inch was the narrowest window of the first thirty sectors",
    Math.min.apply(null, lantBefore("s31").map(lantWidthOf)) === 24,
    "first-thirty floor " + Math.min.apply(null, lantBefore("s31").map(lantWidthOf)).toFixed(2));

  /* The ten records, each a measured number against every sector before
   * its rung. The windows round to the pixel the tier comment names
   * (22.08 ships as twenty-two, the way the Stitch's 27.2 ships as
   * twenty-seven); the wall and basin peaks sit on control points and
   * come out exact. */
  const lantRecord = (id, label, ok, detail) =>
    check("game-starfall", `${id}: ${label}`, ok, detail);

  lantRecord("s31", "opens the first window under the Last Inch - twenty-two pixels",
    Math.round(lantWidthOf(lantSheet("s31"))) === 22 &&
      lantBefore("s31").every((level) => lantWidthOf(level) > 22.5),
    "previous floor " + Math.min.apply(null, lantBefore("s31").map(lantWidthOf)).toFixed(2));
  lantRecord("s32", "draws the busiest ground yet - twelve control points",
    lantSheet("s32").terrain.length === 12 &&
      lantBefore("s32").every((level) => level.terrain.length < 12),
    "previous peak " + Math.max.apply(null, lantBefore("s32").map((level) => level.terrain.length)));
  lantRecord("s33", "sinks the deepest window yet - a floor at 322",
    lantSheet("s33").pad.y === 322 &&
      lantBefore("s33").every((level) => level.pad.y < 322),
    "previous peak " + Math.max.apply(null, lantBefore("s33").map((level) => level.pad.y)));
  lantRecord("s34", "raises the tallest rock yet - 88 units over the window's floor",
    Math.round(lantWallOf(lantSheet("s34"))) === 88 &&
      lantBefore("s34").every((level) => lantWallOf(level) < 88),
    "previous peak " + Math.max.apply(null, lantBefore("s34").map(lantWallOf)).toFixed(2));
  lantRecord("s35", "cuts the first twenty-pixel window",
    Math.round(lantWidthOf(lantSheet("s35"))) === 20 &&
      lantBefore("s35").every((level) => lantWidthOf(level) > 20.5),
    "previous floor " + Math.min.apply(null, lantBefore("s35").map(lantWidthOf)).toFixed(2));
  lantRecord("s36", "out-saws the Comb - thirteen control points",
    lantSheet("s36").terrain.length === 13 &&
      lantBefore("s36").every((level) => level.terrain.length < 13),
    "previous peak " + Math.max.apply(null, lantBefore("s36").map((level) => level.terrain.length)));
  lantRecord("s37", "hangs the deepest trap yet - a chasm 92 below the window",
    Math.round(lantBasinOf(lantSheet("s37"))) === 92 &&
      lantBefore("s37").every((level) => lantBasinOf(level) < 92),
    "previous peak " + Math.max.apply(null, lantBefore("s37").map(lantBasinOf)).toFixed(2));
  lantRecord("s38", "threads the first eighteen-pixel window",
    Math.round(lantWidthOf(lantSheet("s38"))) === 18 &&
      lantBefore("s38").every((level) => lantWidthOf(level) > 18.5),
    "previous floor " + Math.min.apply(null, lantBefore("s38").map(lantWidthOf)).toFixed(2));
  lantRecord("s39", "sinks the chasm to 102 below the window",
    Math.round(lantBasinOf(lantSheet("s39"))) === 102 &&
      lantBefore("s39").every((level) => lantBasinOf(level) < 102),
    "previous peak " + Math.max.apply(null, lantBefore("s39").map(lantBasinOf)).toFixed(2));
  lantRecord("s40", "pairs the records: sixteen pixels on the deepest tank and the steepest pull",
    Math.round(lantWidthOf(lantSheet("s40"))) === 16 &&
      lantSheet("s40").fuel === 52 && lantSheet("s40").gravity === 186 &&
      lantBefore("s40").every((level) =>
        lantWidthOf(level) > 16.5 && level.fuel > 52 && level.gravity < 186),
    "previous floors width " +
      Math.min.apply(null, lantBefore("s40").map(lantWidthOf)).toFixed(2) +
      ", tank " + Math.min.apply(null, lantBefore("s40").map((level) => level.fuel)) +
      ", gravity " + Math.max.apply(null, lantBefore("s40").map((level) => level.gravity)));

  /* The swarm's own bench over the chasm tier: the measured landing must
   * keep the headroom the star bands stand on, and every band must be
   * that landing's own 62/42/22 line (floors 6/4/2), descending, with
   * the three-star line reachable and never free. The calibrated tiers
   * above the chasm are held to the same calibration. */
  const lantCalibrated = lantSummit.concat(lantRidge, lantChasm);
  lantChasm.forEach((level) => {
    const landing = lantSeeded(level.gravity, () => forge.bestLanding(level));
    check("game-starfall",
      `${level.id}: the measured landing keeps the bands' headroom`,
      !!landing && landing.safe && landing.fuel >= 8,
      landing ? "fuel " + landing.fuel : "no landing");
    const measured = [
      Math.max(6, Math.round(landing.fuel * 0.62)),
      Math.max(4, Math.round(landing.fuel * 0.42)),
      Math.max(2, Math.round(landing.fuel * 0.22)),
    ];
    check("game-starfall", `${level.id}: the star bands are the measured landing's own line`,
      level.starFuel[0] === measured[0] &&
      level.starFuel[1] === measured[1] &&
      level.starFuel[2] === measured[2],
      "table " + level.starFuel.join("/") + " vs measured " + measured.join("/"));
    check("game-starfall",
      `${level.id}: the three-star line sits under the reference flight and the bands descend`,
      level.starFuel[0] <= landing.fuel &&
      level.starFuel[0] > level.starFuel[1] &&
      level.starFuel[1] > level.starFuel[2],
      level.starFuel.join("/") + " vs fuel " + landing.fuel);
  });
  check("game-starfall",
    "every calibrated tier ships the swarm's own calibration (s21-s40)",
    lantCalibrated.every((level) => {
      const landing = lantSeeded(level.gravity + 1, () => forge.bestLanding(level));
      return !!landing && landing.safe &&
        level.starFuel[0] === Math.max(6, Math.round(landing.fuel * 0.62)) &&
        level.starFuel[1] === Math.max(4, Math.round(landing.fuel * 0.42)) &&
        level.starFuel[2] === Math.max(2, Math.round(landing.fuel * 0.22));
    }), "a calibrated band drifted off the measured landing");

  /* The chasm sector names travel with the module: both languages hold a
   * real string for every name (lantL31-lantL40 from the module's own
   * addStrings), and t() never falls back to the key. */
  check("game-starfall", "the chasm sector names resolve in both languages",
    lantChasmIds.every((id) => {
      const key = "lantL" + id.slice(1);
      const en = App.I18N && App.I18N.en ? App.I18N.en[key] : null;
      const zh = App.I18N && App.I18N.zh ? App.I18N.zh[key] : null;
      return !!en && en !== key && !!zh && zh !== key && App.t(key) !== key;
    }), "a chasm label fell back to its key");
  check("game-starfall", "the summit and ridge sector names resolve in both languages",
    lantSummitIds.concat(lantRidgeIds).every((id) => {
      const key = "lantL" + id.slice(1);
      const en = App.I18N && App.I18N.en ? App.I18N.en[key] : null;
      const zh = App.I18N && App.I18N.zh ? App.I18N.zh[key] : null;
      return !!en && en !== key && !!zh && zh !== key && App.t(key) !== key;
    }), "a summit or ridge label fell back to its key");

  /* The unlock chain is derived, never stored, so it scales with the
   * ladder: clearing each sector in order must hand the player exactly
   * the next one, all forty times, with nothing left locked behind the
   * last. */
  const lantChain = App.createCampaign({
    key: "starfall-gate-chain",
    levels: lantLevels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let lantWalked = 0;
  let lantChained = true;
  lantLevels.forEach((level, index) => {
    const outcome = lantChain.record(level.id, { stars: 3, best: 10, better: "high" });
    if (outcome.firstClear) lantWalked += 1;
    const expected = index + 1 < lantLevels.length ? lantLevels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) lantChained = false;
  });
  check("game-starfall", "the unlock chain walks all forty sectors in order",
    lantWalked === 40 && lantChained && lantChain.clearedCount() === 40,
    lantWalked + " first clears");
};
