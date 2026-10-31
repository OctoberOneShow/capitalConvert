"use strict";

/* game-neon-drift: the deep tier proves through the forge's dual bar
 *
 * The forge (tools/drift-forge.js) transcribes the panel's own stepper and
 * runs both proofs the module's header demands: the scripted reference line
 * at 60 Hz - whose lap is the par the star bands hang off - and the keyboard
 * reachability replay, where -1/0/+1 steering is re-issued every 3-6 frames
 * across hundreds of line variants and three phase offsets. This gate
 * re-judges the whole shipped ladder through that checker, then holds the
 * deep tier to its brief: corridors the shipped ladder never shrank to, more
 * gates than the shipped ceiling, bands recomputed from App.driftPar with
 * the shipped 1.18/1.5 calibration, a keyboard lap that clears the three-star
 * line with the forge's ship margin, authored limits that agree with the
 * derived net, and names that resolve in both languages. The 25-30 summit
 * repeats that audit, then has each lesson cut out of a clone: the measured
 * lap (or, for the double-tap pad, the keyboard witness) has to move.
 *
 * The fourth tier n31-n40 widens the book, not the corridor - widths stay
 * inside the shipped 20-22 envelope while ten structural records fall one
 * per rung, each measured against every course before it through the forge's
 * courseMetrics: the longest ride along a course's own wake, the gate count
 * pushed past the thirty-gate ceiling twice, the 20px floor held past
 * twenty-six gates, a four-pad course, ten switchback reversals, a 502px
 * straight, the densest gate field, 3191 degrees of total steering and a
 * capstone pairing most gates with the longest tape. The tier's measured par
 * dips once, at its door - n31's boulevard hands the scripted line two
 * full-throttle straights - and never falls after it; every rung also has
 * its advertised lesson cut out of a clone and re-measured. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const drift = require(path.join(root, "tools", "drift-forge.js"));
  const nirCourses = drift.loadCourses();

  check("game-neon-drift", "the ladder holds forty courses",
    nirCourses.length === 40, String(nirCourses.length));
  check("game-neon-drift", "every course id is distinct and in ladder order",
    new Set(nirCourses.map((c) => c.id)).size === nirCourses.length &&
    nirCourses.every((c, index) => c.id === "n" + (index + 1)),
    nirCourses.map((c) => c.id).join(","));

  /* The forge's replay rolls no dice - the stepper and the variant grid are
   * pure - but the seeded swap keeps the run deterministic wherever the
   * booted app reaches for Math.random. */
  const nirSeeded = (seed, fn) => {
    const real = Math.random;
    let state = seed >>> 0;
    Math.random = () => {
      state = (Math.imul(state, 1103515245) + 12345) >>> 0;
      return state / 4294967296;
    };
    try { return fn(); } finally { Math.random = real; }
  };

  /* The dual bar, re-run over the whole ladder: the forge's own checker
   * carries nirPar (a course whose scripted line cannot finish is broken,
   * not slow) and nirReplay (the best keyboard variant judged on its worst
   * phase offset), and every course has to clear both. */
  const nirReports = new Map();
  nirSeeded(41027, () => {
    nirCourses.forEach((course) => {
      const report = drift.checkCourse(course);
      nirReports.set(course.id, report);
      check("game-neon-drift", `${course.id}: the forge's own checker clears it`,
        report.problems.length === 0, report.problems.join("; "));
      check("game-neon-drift",
        `${course.id}: a keyboard lap clears the three-star band with the forge's ship margin`,
        !!report.keyboard && !!report.bands && report.keyboard.worst <= report.bands[0] * 0.95,
        report.keyboard && report.bands
          ? `keyboard worst ${report.keyboard.worst.toFixed(1)} vs 3-star ${report.bands[0]}`
          : "no keyboard lap");
    });
  });

  /* The module's band convention: [par, 1.18x par, 1.5x par], strictly
   * rising inside a course, hung off a par the reference line actually
   * measured. */
  check("game-neon-drift", "the star bands only rise inside a course",
    nirCourses.every((c) => {
      const bands = nirReports.get(c.id).bands;
      return !!bands && bands[0] < bands[1] && bands[1] < bands[2];
    }),
    nirCourses.map((c) => {
      const bands = nirReports.get(c.id).bands;
      return c.id + ":" + (bands ? bands.join("/") : "-");
    }).join(" "));

  /* The deep tier is the hard tier in the ladder's own terms: tape the
   * shipped ladder never shrank to (the floor was 23, the exam runs 21) and
   * more gates than the shipped ceiling. */
  const nirDeepIds = ["n21", "n22", "n23", "n24"];
  const nirSummitIds = ["n25", "n26", "n27", "n28", "n29", "n30"];
  const nirFirst30 = nirCourses.slice(0, 30);
  const nirTier = nirFirst30.filter((c) => nirDeepIds.includes(c.id));
  const nirSummit = nirFirst30.filter((c) => nirSummitIds.includes(c.id));
  const nirShipped = nirFirst30.filter((c) =>
    !nirDeepIds.includes(c.id) && !nirSummitIds.includes(c.id));
  check("game-neon-drift", "the tier 21-24 rows all exist",
    nirTier.length === 4, nirTier.map((c) => c.id).join(","));
  check("game-neon-drift", "the deep tier corridor shrinks past the shipped floor",
    nirShipped.every((c) => c.width >= 23) &&
    nirTier.every((c) => c.width <= 23) && nirTier[3].width === 21,
    nirTier.map((c) => c.id + ":w" + c.width).join(" "));
  check("game-neon-drift", "every deep tier course gates more than the shipped ceiling",
    nirTier.every((c) => c.points.length - 1 > nirShipped[nirShipped.length - 1].points.length - 1),
    nirTier.map((c) => c.id + ":g" + (c.points.length - 1)).join(" "));

  /* The 25-30 summit is held to the exam's terms: it never widens past the
   * exam's 22px envelope unless a boost pad needs the room, keeps at least
   * the exam's sixteen gates, and every measured par opens above n24's and
   * climbs strictly to a closer that is the hardest row in the ladder. */
  const nirN24 = nirFirst30.filter((c) => c.id === "n24")[0];
  const nirSummitPars = nirSummit.map((c) => App.driftPar(c));
  const nirN24Par = App.driftPar(nirN24);
  check("game-neon-drift", "the summit 25-30 rows all exist",
    nirSummit.length === 6, nirSummit.map((c) => c.id).join(","));
  check("game-neon-drift", "the summit climbs past n24's measured par",
    nirSummitPars.every((par, index) =>
      par !== null && par > nirN24Par && (index === 0 || par > nirSummitPars[index - 1])),
    nirSummitPars.join(" -> ") + " vs n24 " + nirN24Par);
  check("game-neon-drift", "the summit tape holds the 22px envelope",
    nirSummit.every((c) => c.width <= 22),
    nirSummit.map((c) => c.id + ":w" + c.width).join(" "));
  check("game-neon-drift", "every summit course keeps at least n24's gate count",
    nirSummit.every((c) => c.points.length - 1 >= nirN24.points.length - 1),
    nirSummit.map((c) => c.id + ":g" + (c.points.length - 1)).join(" "));
  check("game-neon-drift", "n30 closes the ladder at its highest measured par",
    nirSummitPars[5] === Math.max.apply(null, nirSummitPars),
    nirSummitPars[5] + " vs " + Math.max.apply(null, nirSummitPars));

  /* The calibration anchor is the shipped ladder itself: band ratios measured
   * off n20's par, so the tier is held to the shipped convention and not to a
   * restated constant. */
  const nirAnchor = App.driftPar(nirShipped[nirShipped.length - 1]);
  const nirRatios = [
    Math.round(nirAnchor * 1.18 * 10) / 10 / nirAnchor,
    Math.round(nirAnchor * 1.5 * 10) / 10 / nirAnchor,
  ];

  /* The dual bar, through the game's own arithmetic: par comes from
   * App.driftPar - the module's own scripted line on the same pure stepper -
   * the bands are recomputed with the shipped nirBands calibration, and the
   * authored limit has to agree with the derived net. A band no keyboard lap
   * can reach already failed above. */
  nirTier.forEach((course) => {
    const report = nirReports.get(course.id);
    const par = App.driftPar(course);
    check("game-neon-drift", `${course.id}: the module and the forge measure the same par`,
      par !== null && report.par !== null && Math.abs(par - report.par) < 0.05,
      `module ${par} vs forge ${report.par}`);
    const bands = [
      Math.round(par * 10) / 10,
      Math.round(par * 1.18 * 10) / 10,
      Math.round(par * 1.5 * 10) / 10,
    ];
    check("game-neon-drift", `${course.id}: star bands hold the shipped calibration`,
      bands[0] === par && bands[0] < bands[1] && bands[1] < bands[2] &&
      Math.abs(bands[1] / par - nirRatios[0]) < 0.005 &&
      Math.abs(bands[2] / par - nirRatios[1]) < 0.005,
      bands.join("/"));
    check("game-neon-drift", `${course.id}: the authored limit agrees with the derived net`,
      course.limit === Math.ceil(par * 1.9),
      `authored ${course.limit} vs derived ${Math.ceil(par * 1.9)}`);
  });

  /* The summit repeats the same arithmetic through the module's own clock. */
  nirSummit.forEach((course) => {
    const report = nirReports.get(course.id);
    const par = App.driftPar(course);
    check("game-neon-drift", `${course.id}: the module and the forge measure the same par`,
      par !== null && report.par !== null && Math.abs(par - report.par) < 0.05,
      `module ${par} vs forge ${report.par}`);
    const bands = [
      Math.round(par * 10) / 10,
      Math.round(par * 1.18 * 10) / 10,
      Math.round(par * 1.5 * 10) / 10,
    ];
    check("game-neon-drift", `${course.id}: star bands hold the shipped calibration`,
      bands[0] === par && bands[0] < bands[1] && bands[1] < bands[2] &&
      Math.abs(bands[1] / par - nirRatios[0]) < 0.005 &&
      Math.abs(bands[2] / par - nirRatios[1]) < 0.005,
      bands.join("/"));
    check("game-neon-drift", `${course.id}: the authored limit agrees with the derived net`,
      course.limit === Math.ceil(par * 1.9),
      `authored ${course.limit} vs derived ${Math.ceil(par * 1.9)}`);
  });

  /* Mechanic proofs for the summit: each cut takes the advertised lesson out
   * of a clone and re-runs it through the forge. A course whose measured lap
   * (or reachable keyboard lap, for the pad double-tap) does not move was
   * padded, not designed. */
  const nirSummitById = (id) => nirSummit.filter((course) => course.id === id)[0];
  const nirCloneCut = (course, edit) => {
    const copy = JSON.parse(JSON.stringify(course));
    copy.id = course.id + "-cut";
    edit(copy);
    return copy;
  };
  const nirCutPar = (cut) => drift.nirPar(cut);

  const nirCut25 = nirCloneCut(nirSummitById("n25"), (course) => {
    course.points.splice(9, 5);
  });
  const nirCut25Par = nirCutPar(nirCut25);
  check("game-neon-drift", "n25's second wall-gap rank is load-bearing",
    nirCut25Par !== null && nirCut25Par < App.driftPar(nirSummitById("n25")) - 4,
    "cut par " + nirCut25Par);

  const nirCut26 = nirCloneCut(nirSummitById("n26"), (course) => {
    course.width = 24;
  });
  const nirCut26Par = nirCutPar(nirCut26);
  check("game-neon-drift", "n26's 20px wall gap is load-bearing: widening it shortens the lap",
    nirCut26Par !== null && nirCut26Par < App.driftPar(nirSummitById("n26")) - 0.5,
    "cut par " + nirCut26Par);

  const nirCut27 = nirCloneCut(nirSummitById("n27"), (course) => {
    course.pads = [{ x: 140, y: 360 }];
  });
  const nirCut27Report = drift.checkCourse(nirCut27);
  const nirReport27 = nirReports.get("n27");
  check("game-neon-drift",
    "n27's pad pays twice: one prelude pass leaves par alone but slows the keyboard line",
    nirCut27Report.problems.length === 0 && nirCut27Report.par !== null &&
    !!nirCut27Report.keyboard && !!nirReport27.keyboard &&
    Math.abs(nirCut27Report.par - nirReport27.par) < 0.5 &&
    nirCut27Report.keyboard.worst > nirReport27.keyboard.worst + 1.5,
    "cut " + nirCut27Report.par + "/" +
    (nirCut27Report.keyboard ? nirCut27Report.keyboard.worst.toFixed(1) : "-") +
    " vs " + nirReport27.par + "/" +
    (nirReport27.keyboard ? nirReport27.keyboard.worst.toFixed(1) : "-"));

  const nirCut28 = nirCloneCut(nirSummitById("n28"), (course) => {
    course.points.shift();
  });
  const nirCut28Par = nirCutPar(nirCut28);
  check("game-neon-drift", "n28's opening straight is load-bearing: cutting it shortens the lap",
    nirCut28Par !== null && nirCut28Par < App.driftPar(nirSummitById("n28")) - 1,
    "cut par " + nirCut28Par);

  const nirCut29 = nirCloneCut(nirSummitById("n29"), (course) => {
    course.points = course.points.slice(0, 19);
  });
  const nirCut29Par = nirCutPar(nirCut29);
  check("game-neon-drift", "n29's trail-crossing exit is load-bearing: removing it shortens the lap",
    nirCut29Par !== null && nirCut29Par < App.driftPar(nirSummitById("n29")) - 4,
    "cut par " + nirCut29Par);

  const nirCut30 = nirCloneCut(nirSummitById("n30"), (course) => {
    course.points[9].y = 175;
    course.points[11].y = 175;
    course.points[13].y = 175;
  });
  const nirCut30Par = nirCutPar(nirCut30);
  check("game-neon-drift", "n30's second gap rank is load-bearing: flattening it shortens the lap",
    nirCut30Par !== null && nirCut30Par < App.driftPar(nirSummitById("n30")) - 4,
    "cut par " + nirCut30Par);

  const nirCut30Boost = nirCloneCut(nirSummitById("n30"), (course) => {
    course.pads = [];
  });
  const nirCut30BoostReport = drift.checkCourse(nirCut30Boost);
  const nirReport30 = nirReports.get("n30");
  check("game-neon-drift", "n30's pad chain is load-bearing: without it the keyboard line slows",
    nirCut30BoostReport.problems.length === 0 && !!nirCut30BoostReport.keyboard &&
    !!nirReport30.keyboard &&
    nirCut30BoostReport.keyboard.worst > nirReport30.keyboard.worst + 0.8,
    "cut " + (nirCut30BoostReport.keyboard
      ? nirCut30BoostReport.keyboard.worst.toFixed(1) : "-") +
    " vs " + (nirReport30.keyboard ? nirReport30.keyboard.worst.toFixed(1) : "-"));

  /* The fourth tier n31-n40: ten rungs, each carrying one structural record
   * measured against every course before it, all off the forge's
   * courseMetrics - the same polyline arithmetic the stepper drives. */
  const nirWideIds = ["n31", "n32", "n33", "n34", "n35", "n36", "n37", "n38", "n39", "n40"];
  const nirWide = nirCourses.filter((c) => nirWideIds.includes(c.id));
  const nirWideProblems = [];
  check("game-neon-drift", "the fourth tier rows all exist",
    nirWide.length === 10, nirWide.map((c) => c.id).join(","));
  check("game-neon-drift", "the fourth tier holds the shipped 20-22px envelope",
    nirWide.every((c) => c.width >= 20 && c.width <= 22),
    nirWide.map((c) => c.id + ":w" + c.width).join(" "));

  /* The metrics table, measured once: the records below are read off it, and
   * every "past every course before it" is scoped by ladder position - later
   * tiers legitimately overtake earlier ones. */
  const nirMetrics = new Map();
  nirCourses.forEach((course) => nirMetrics.set(course.id, drift.courseMetrics(course)));
  const nirPeakBefore = (id, key) => {
    const index = nirCourses.findIndex((c) => c.id === id);
    return nirCourses.slice(0, index).reduce(
      (best, c) => Math.max(best, nirMetrics.get(c.id)[key]), -Infinity);
  };

  /* The dual bar through the module's own arithmetic, fourth tier: par from
   * App.driftPar, bands on the shipped calibration, the authored limit on
   * the derived net - and the pars climb strictly once the tier's door is
   * open. */
  let nirPrev = null;
  nirWide.forEach((course) => {
    const report = nirReports.get(course.id);
    const par = App.driftPar(course);
    check("game-neon-drift", `${course.id}: the module and the forge measure the same par`,
      par !== null && report.par !== null && Math.abs(par - report.par) < 0.05,
      `module ${par} vs forge ${report.par}`);
    const bands = [
      Math.round(par * 10) / 10,
      Math.round(par * 1.18 * 10) / 10,
      Math.round(par * 1.5 * 10) / 10,
    ];
    check("game-neon-drift", `${course.id}: star bands hold the shipped calibration`,
      bands[0] === par && bands[0] < bands[1] && bands[1] < bands[2] &&
      Math.abs(bands[1] / par - nirRatios[0]) < 0.005 &&
      Math.abs(bands[2] / par - nirRatios[1]) < 0.005,
      bands.join("/"));
    check("game-neon-drift", `${course.id}: the authored limit agrees with the derived net`,
      course.limit === Math.ceil(par * 1.9),
      `authored ${course.limit} vs derived ${Math.ceil(par * 1.9)}`);
    if (nirPrev !== null && !(par > nirPrev)) {
      nirWideProblems.push(course.id + " par " + par + " after " + nirPrev);
    }
    nirPrev = par;
  });
  /* The one measured dip: the Divide's boulevard hands the scripted line two
   * full-throttle straights, so the tier opens under n30 - and never falls
   * again. */
  const nirN30Par = App.driftPar(nirFirst30.filter((c) => c.id === "n30")[0]);
  check("game-neon-drift",
    "the tier's one par dip is the Divide's boulevard, measured and pinned",
    nirWide[0].id === "n31" && App.driftPar(nirWide[0]) < nirN30Par &&
    nirWideProblems.length === 0,
    "n31 " + App.driftPar(nirWide[0]) + " vs n30 " + nirN30Par +
    "; rises " + (nirWideProblems.length ? nirWideProblems.join("; ") : "clean"));

  /* The ten records, each against every course before it. */
  const nirById = (id) => nirCourses.filter((c) => c.id === id)[0];
  const nirM = (id) => nirMetrics.get(id);

  check("game-neon-drift",
    "n31 rides its own wake for 312px, past every course before it",
    nirM("n31").wake === 312 && nirM("n31").wake > nirPeakBefore("n31", "wake"),
    "wake " + nirM("n31").wake + " vs peak " + nirPeakBefore("n31", "wake"));
  check("game-neon-drift",
    "n32 opens the first course past the thirty-gate ceiling at 33",
    nirM("n32").gates === 33 && nirM("n32").gates > nirPeakBefore("n32", "gates"),
    "gates " + nirM("n32").gates + " vs peak " + nirPeakBefore("n32", "gates"));
  check("game-neon-drift",
    "n33 holds the 20px floor past twenty-six gates: 34 gates where n26 carried 26",
    nirById("n33").width === 20 && nirM("n33").gates === 34 &&
    nirCourses.slice(0, nirCourses.findIndex((c) => c.id === "n33"))
      .every((c) => c.width !== 20 || nirM(c.id).gates < 34),
    "20px predecessors " + nirCourses.slice(0, nirCourses.findIndex((c) => c.id === "n33"))
      .filter((c) => c.width === 20)
      .map((c) => c.id + ":" + nirM(c.id).gates).join(","));
  check("game-neon-drift",
    "n34 runs the first four-pad course",
    nirM("n34").pads === 4 && nirM("n34").pads > nirPeakBefore("n34", "pads"),
    "pads " + nirM("n34").pads + " vs peak " + nirPeakBefore("n34", "pads"));
  check("game-neon-drift",
    "n35 swings past eight switchback reversals: ten where n17 held eight",
    nirM("n35").reversals === 10 && nirM("n35").reversals > nirPeakBefore("n35", "reversals"),
    "reversals " + nirM("n35").reversals + " vs peak " + nirPeakBefore("n35", "reversals"));
  check("game-neon-drift",
    "n36 threads the densest gate field: 1.85 gates per 100px past n30's 1.61",
    nirM("n36").density > 1.8 && nirM("n36").density > nirPeakBefore("n36", "density"),
    "density " + nirM("n36").density.toFixed(2) + " vs peak " +
    nirPeakBefore("n36", "density").toFixed(2));
  check("game-neon-drift",
    "n37 takes the gate record again: 38 past the Apiary's 37",
    nirM("n37").gates === 38 && nirM("n37").gates > nirPeakBefore("n37", "gates"),
    "gates " + nirM("n37").gates + " vs peak " + nirPeakBefore("n37", "gates"));
  check("game-neon-drift",
    "n38 carries the longest single straight: 502px past n29's 402",
    nirM("n38").maxStraight === 502 && nirM("n38").maxStraight > nirPeakBefore("n38", "maxStraight"),
    "straight " + nirM("n38").maxStraight + " vs peak " + nirPeakBefore("n38", "maxStraight"));
  check("game-neon-drift",
    "n39 steers 3191 degrees, the deepest total heading change past every course before it",
    nirM("n39").turns === 3191 && nirM("n39").turns > nirPeakBefore("n39", "turns"),
    "turns " + nirM("n39").turns + " vs peak " + nirPeakBefore("n39", "turns"));
  check("game-neon-drift",
    "n40 pairs the records: 42 gates and 2846px of tape, past every course before it",
    nirM("n40").gates === 42 && nirM("n40").gates > nirPeakBefore("n40", "gates") &&
    nirM("n40").tape === 2846 && nirM("n40").tape > nirPeakBefore("n40", "tape"),
    "gates " + nirM("n40").gates + " vs peak " + nirPeakBefore("n40", "gates") +
    "; tape " + nirM("n40").tape + " vs peak " + nirPeakBefore("n40", "tape"));

  /* Mechanic proofs for the fourth tier: each advertised lesson cut out of a
   * clone and re-measured through the forge's reference line. */
  const nirWideById = (id) => nirWide.filter((course) => course.id === id)[0];

  const nirCut31 = nirCloneCut(nirWideById("n31"), (course) => {
    course.points = course.points.slice(0, 8).concat(course.points.slice(16));
  });
  const nirCut31Par = nirCutPar(nirCut31);
  check("game-neon-drift",
    "n31's second boulevard pass is load-bearing: removing it kills the ride and the lap",
    nirCut31Par !== null && nirCut31Par < App.driftPar(nirWideById("n31")) - 5 &&
    drift.courseMetrics(nirCut31).wake < nirM("n31").wake - 100,
    "cut ride " + drift.courseMetrics(nirCut31).wake + " vs " + nirM("n31").wake +
    ", cut par " + nirCut31Par);

  const nirCut32 = nirCloneCut(nirWideById("n32"), (course) => {
    course.points.splice(27, 6);
  });
  const nirCut32Par = nirCutPar(nirCut32);
  check("game-neon-drift", "n32's fifth rank is load-bearing: flattening it shortens the lap",
    nirCut32Par !== null && nirCut32Par < App.driftPar(nirWideById("n32")) - 4,
    "cut par " + nirCut32Par);

  const nirCut33 = nirCloneCut(nirWideById("n33"), (course) => {
    course.points[1].y = 86;
    course.points[3].y = 86;
    course.points[5].y = 86;
    course.points[7].y = 86;
  });
  const nirCut33Par = nirCutPar(nirCut33);
  check("game-neon-drift", "n33's nine-tooth crown is load-bearing: flattening it shortens the lap",
    nirCut33Par !== null && nirCut33Par < App.driftPar(nirWideById("n33")) - 5,
    "cut par " + nirCut33Par);

  const nirCut34 = nirCloneCut(nirWideById("n34"), (course) => {
    course.points[18].y = 200;
    course.points[20].y = 156;
    course.points[22].y = 200;
    course.points[24].y = 156;
  });
  const nirCut34Par = nirCutPar(nirCut34);
  check("game-neon-drift", "n34's third strip is load-bearing: flattening it shortens the lap",
    nirCut34Par !== null && nirCut34Par < App.driftPar(nirWideById("n34")) - 4,
    "cut par " + nirCut34Par);

  const nirCut35 = nirCloneCut(nirWideById("n35"), (course) => {
    course.points.splice(21, 6);
  });
  const nirCut35Par = nirCutPar(nirCut35);
  check("game-neon-drift", "n35's upper swings are load-bearing: removing two shortens the lap",
    nirCut35Par !== null && nirCut35Par < App.driftPar(nirWideById("n35")) - 3,
    "cut par " + nirCut35Par);

  const nirCut36 = nirCloneCut(nirWideById("n36"), (course) => {
    course.width = 24;
  });
  const nirCut36Par = nirCutPar(nirCut36);
  check("game-neon-drift", "n36's 20px tape is load-bearing: widening it shortens the lap",
    nirCut36Par !== null && nirCut36Par < App.driftPar(nirWideById("n36")) - 1,
    "cut par " + nirCut36Par);

  const nirCut37 = nirCloneCut(nirWideById("n37"), (course) => {
    course.points.splice(32, 8);
  });
  const nirCut37Par = nirCutPar(nirCut37);
  check("game-neon-drift", "n37's fifth strip is load-bearing: flattening it shortens the lap",
    nirCut37Par !== null && nirCut37Par < App.driftPar(nirWideById("n37")) - 4,
    "cut par " + nirCut37Par);

  const nirCut38 = nirCloneCut(nirWideById("n38"), (course) => {
    course.points = course.points.slice(0, 34).concat([{ x: 404, y: 321 }, { x: 378, y: 350 }]);
  });
  const nirCut38Par = nirCutPar(nirCut38);
  check("game-neon-drift", "n38's fifth comb row is load-bearing: dropping it shortens the lap",
    nirCut38Par !== null && nirCut38Par < App.driftPar(nirWideById("n38")) - 4,
    "cut par " + nirCut38Par);

  const nirCut39 = nirCloneCut(nirWideById("n39"), (course) => {
    course.points = course.points.slice(0, 24);
  });
  const nirCut39Par = nirCutPar(nirCut39);
  check("game-neon-drift", "n39's last two ranks are load-bearing: dropping them shortens the lap",
    nirCut39Par !== null && nirCut39Par < App.driftPar(nirWideById("n39")) - 5,
    "cut par " + nirCut39Par);

  const nirCut40 = nirCloneCut(nirWideById("n40"), (course) => {
    course.pads = [];
  });
  const nirCut40Report = drift.checkCourse(nirCut40);
  const nirReport40 = nirReports.get("n40");
  check("game-neon-drift", "n40's pad pair is load-bearing: without it the keyboard line slows",
    nirCut40Report.problems.length === 0 && !!nirCut40Report.keyboard &&
    !!nirReport40.keyboard &&
    nirCut40Report.keyboard.worst > nirReport40.keyboard.worst + 1,
    "cut " + (nirCut40Report.keyboard ? nirCut40Report.keyboard.worst.toFixed(1) : "-") +
    " vs " + (nirReport40.keyboard ? nirReport40.keyboard.worst.toFixed(1) : "-"));

  /* The course names travel with the module: both languages hold a real
   * string for every course (n1-n40 from the module's own addStrings), and
   * t() never falls back to the key. */
  check("game-neon-drift", "every course name resolves in both languages",
    nirCourses.every((course) =>
      App.I18N && App.I18N.en && App.I18N.en[course.labelKey] && App.I18N.zh && App.I18N.zh[course.labelKey] &&
      App.t(course.labelKey) !== course.labelKey),
    "a course label fell back to its key");

  /* The unlock chain is derived, never stored, so it scales with the ladder:
   * clearing each course in order must hand the player exactly the next one,
   * all forty times, with nothing left locked behind the last. */
  const nirChain = App.createCampaign({
    key: "neon-drift-gate-chain",
    levels: nirCourses.map((c) => ({ id: c.id, labelKey: c.labelKey })),
  });
  let nirWalked = 0;
  let nirChained = true;
  nirCourses.forEach((course, index) => {
    const outcome = nirChain.record(course.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) nirWalked += 1;
    const expected = index + 1 < nirCourses.length ? nirCourses[index + 1].id : null;
    if (outcome.unlockedNext !== expected) nirChained = false;
  });
  check("game-neon-drift", "the unlock chain walks all forty courses in order",
    nirWalked === 40 && nirChained && nirChain.clearedCount() === 40,
    nirWalked + " first clears");
};
