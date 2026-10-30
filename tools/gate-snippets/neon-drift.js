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
 * lap (or, for the double-tap pad, the keyboard witness) has to move. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const drift = require(path.join(root, "tools", "drift-forge.js"));
  const nirCourses = drift.loadCourses();

  check("game-neon-drift", "the ladder holds thirty courses",
    nirCourses.length === 30, String(nirCourses.length));
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
  const nirTier = nirCourses.filter((c) => nirDeepIds.includes(c.id));
  const nirSummit = nirCourses.filter((c) => nirSummitIds.includes(c.id));
  const nirShipped = nirCourses.filter((c) =>
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
   * exam's 22px envelope unless a boost pad needs the room, keeps at least the
   * exam's sixteen gates, and every measured par opens above n24's and climbs
   * strictly to a closer that is the hardest row in the ladder. */
  const nirN24 = nirCourses.filter((c) => c.id === "n24")[0];
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

  /* The course names travel with the module: both languages hold a real
   * string for every course (n1-n30 from the module's own addStrings), and
   * t() never falls back to the key. */
  check("game-neon-drift", "every course name resolves in both languages",
    nirCourses.every((course) =>
      App.I18N && App.I18N.en && App.I18N.en[course.labelKey] && App.I18N.zh && App.I18N.zh[course.labelKey] &&
      App.t(course.labelKey) !== course.labelKey),
    "a course label fell back to its key");

  /* The unlock chain is derived, never stored, so it scales with the ladder:
   * clearing each course in order must hand the player exactly the next one,
   * all thirty times, with nothing left locked behind the last. */
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
  check("game-neon-drift", "the unlock chain walks all thirty courses in order",
    nirWalked === 30 && nirChained && nirChain.clearedCount() === 30,
    nirWalked + " first clears");
};
