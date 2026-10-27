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
 * derived net, and names that resolve in both languages. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const drift = require(path.join(root, "tools", "drift-forge.js"));
  const nirCourses = drift.loadCourses();

  check("game-neon-drift", "the ladder holds twenty-four courses",
    nirCourses.length === 24, String(nirCourses.length));
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
  const nirTier = nirCourses.filter((c) => ["n21", "n22", "n23", "n24"].includes(c.id));
  const nirShipped = nirCourses.filter((c) => !["n21", "n22", "n23", "n24"].includes(c.id));
  check("game-neon-drift", "the tier 21-24 rows all exist",
    nirTier.length === 4, nirTier.map((c) => c.id).join(","));
  check("game-neon-drift", "the deep tier corridor shrinks past the shipped floor",
    nirShipped.every((c) => c.width >= 23) &&
    nirTier.every((c) => c.width <= 23) && nirTier[3].width === 21,
    nirTier.map((c) => c.id + ":w" + c.width).join(" "));
  check("game-neon-drift", "every deep tier course gates more than the shipped ceiling",
    nirTier.every((c) => c.points.length - 1 > nirShipped[nirShipped.length - 1].points.length - 1),
    nirTier.map((c) => c.id + ":g" + (c.points.length - 1)).join(" "));

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

  /* The course names travel with the module: both languages hold a real
   * string for every course (n1-n24 from the module's own addStrings), and
   * t() never falls back to the key. */
  check("game-neon-drift", "every course name resolves in both languages",
    nirCourses.every((course) =>
      App.I18N && App.I18N.en && App.I18N.en[course.labelKey] && App.I18N.zh && App.I18N.zh[course.labelKey] &&
      App.t(course.labelKey) !== course.labelKey),
    "a course label fell back to its key");

  /* The unlock chain is derived, never stored, so it scales with the ladder:
   * clearing each course in order must hand the player exactly the next one,
   * all twenty-four times, with nothing left locked behind the last. */
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
  check("game-neon-drift", "the unlock chain walks all twenty-four courses in order",
    nirWalked === 24 && nirChained && nirChain.clearedCount() === 24,
    nirWalked + " first clears");
};
