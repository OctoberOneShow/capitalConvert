"use strict";

/* game-comet-golf: the whole ladder replays the forge's flights, and the
 * deep tiers are held to their own design briefs
 *
 * The forge (tools/golf-forge.js) carries the panel's own flight ODE - its
 * fly() is the module's update() step for step, with the same capped pull,
 * the same radii and the same nine-second window - and asks three questions
 * of a course: a one-shot exists somewhere in the aim space, the field is
 * honest (every well on the sky, clear of tee and ring, at least one of them
 * bending the flight line), and the answer survives keyboard quantisation.
 * This gate re-judges the whole shipped ladder through that checker, then
 * separates the ladder into tiers: the opening ten stay at three wells or
 * fewer, the crowded tier climbs to four and five, the deep tier flies six
 * and seven wells against a ring the older courses never shrank to, and the
 * deep-sky tier packs eight to ten wells while the ring settles at nine and
 * the par line rises with the clutter.
 *
 * The fourth tier g31-g40 packs the field past both ceilings - eleven,
 * twelve and then thirteen wells, the ring dropping to eight pixels for the
 * last five - and takes one structural record per rung against every course
 * before it, the same way the shadow-fold ladder's fourth tier does. Every
 * record is a number the forge printed: the deepest field, the heaviest sky
 * (total well mass, 15.1 then 17.4 then the capstone's 18.6 against g29's
 * 14.3), the first guardian past the 1.8 mass cap, the first ring under
 * nine, the tightest ring guard (twenty-eight pixels against g19's
 * thirty-seven), and the first giant parked on the ring's approach. Every
 * new hole also refuses the lazy straight line at every power - not one of
 * the ten falls to it. Provenance is checked the hard way: each deep-field
 * course is re-generated from the seed recorded in its comment and compared
 * well for well against the shipped bytes, and the forge's own one-shot is
 * re-flown through fly() and must land in the recorded ride time. The game
 * has no authored reserve - a course is its solution - so the re-flown shot
 * is the only fallback there could be. Records are scoped by position -
 * later tiers legitimately overtake earlier ones - and the well, par and
 * ring lines never fall within the tier. Star bands, both languages and the
 * unlock chain are checked last. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const golfForge = require(path.join(root, "tools", "golf-forge.js"));
  const cgfCourses = golfForge.loadCourses();

  check("game-comet-golf", "the sky holds forty courses",
    cgfCourses.length === 40, String(cgfCourses.length));
  check("game-comet-golf", "every course id is distinct",
    new Set(cgfCourses.map((c) => c.id)).size === cgfCourses.length);
  check("game-comet-golf", "the ids run g1 through g40 in order",
    cgfCourses.every((c, index) => c.id === "g" + (index + 1)),
    cgfCourses.map((c) => c.id).join(","));

  /* The forge rolls its own mulberry stream when it lays candidates, but the
   * seeded swap keeps the run deterministic wherever the booted app reaches
   * for Math.random - the same bar the shadow-fold gate holds. */
  const cgfSeeded = (seed, fn) => {
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
   * included, so the deep-field tier cannot ship with a quietly broken
   * elder. The reports are kept: the fourth tier's replay flies the very
   * shot the checker found, so nothing is trusted twice. */
  const cgfReports = {};
  cgfSeeded(41027, () => {
    cgfCourses.forEach((course) => {
      const report = golfForge.checkCourse(course);
      cgfReports[course.id] = report;
      check("game-comet-golf", `${course.id}: the forge's own checker clears it`,
        report.problems.length === 0, report.problems.join("; "));
      check("game-comet-golf", `${course.id}: the one-shot survives keyboard steps`,
        !!report.shot && report.shot.basin >= 6,
        report.shot ? "basin " + report.shot.basin + "/25" : "no shot");
    });
  });

  const cgfOpenIds = ["g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8", "g9", "g10"];
  const cgfCrowdIds = ["g11", "g12", "g13", "g14", "g15", "g16", "g17", "g18", "g19", "g20"];
  const cgfDeepIds = ["g21", "g22", "g23", "g24"];
  const cgfSkyIds = ["g25", "g26", "g27", "g28", "g29", "g30"];
  const cgfNewIds = ["g31", "g32", "g33", "g34", "g35", "g36", "g37", "g38", "g39", "g40"];
  const cgfOpen = cgfCourses.filter((c) => cgfOpenIds.includes(c.id));
  const cgfCrowd = cgfCourses.filter((c) => cgfCrowdIds.includes(c.id));
  const cgfDeep = cgfCourses.filter((c) => cgfDeepIds.includes(c.id));
  const cgfSky = cgfCourses.filter((c) => cgfSkyIds.includes(c.id));
  const cgfNew = cgfCourses.filter((c) => cgfNewIds.includes(c.id));

  /* The elder tiers hold the briefs they shipped under: the opening ten
   * never see more than three wells, the crowded tier runs four and five,
   * the deep tier flies six and seven against a shrinking ring, and the
   * deep-sky tier thickens to eight, nine, then ten while the ring lands
   * at nine and the par line rises with the clutter. */
  check("game-comet-golf", "the opening ten stay at three wells or fewer",
    cgfOpen.length === 10 && cgfOpen.every((c) => c.wells.length <= 3),
    cgfOpen.map((c) => c.id + ":" + c.wells.length).join(" "));
  check("game-comet-golf", "the crowded tier climbs to four and five wells",
    cgfCrowd.length === 10 && cgfCrowd.every((c) => c.wells.length >= 3) &&
    cgfCrowd.some((c) => c.wells.length === 4) && cgfCrowd.some((c) => c.wells.length === 5),
    cgfCrowd.map((c) => c.id + ":" + c.wells.length).join(" "));
  check("game-comet-golf", "the deep tier flies six wells or more against a ring at twelve or under",
    cgfDeep.length === 4 && cgfDeep.every((c) => c.wells.length >= 6 && c.target.r <= 12) &&
    cgfDeep[cgfDeep.length - 1].target.r === 10,
    cgfDeep.map((c) => c.id + ":" + c.wells.length + "/r" + c.target.r).join(" "));
  check("game-comet-golf", "the deep-sky tier thickens eight, nine, then ten and lands the ring at nine",
    cgfSky.map((c) => c.wells.length).join(",") === "8,8,9,9,10,10" &&
    cgfSky.every((c, index) => index === 0 || c.target.r <= cgfSky[index - 1].target.r) &&
    cgfSky[cgfSky.length - 1].target.r === 9,
    cgfSky.map((c) => c.wells.length + "/r" + c.target.r).join(" "));
  check("game-comet-golf", "the deep-sky par line rises with the clutter",
    cgfSky.map((c) => c.starShots[2]).join(",") === "11,11,12,12,13,13",
    cgfSky.map((c) => c.starShots.join("/")).join(" "));

  /* The fourth tier g31-g40: ten rungs, one record each, the lines never
   * falling. Mass is the forge's own rounding of the field's total well
   * mass; the ring guard is the closest any well comes to the ring; the
   * guard's mass is the mass of the well that owns the approach. */
  const cgfMass = (c) => Math.round(c.wells.reduce((sum, well) => sum + well.m, 0) * 10) / 10;
  const cgfHeaviest = (c) => Math.max.apply(null, c.wells.map((well) => well.m));
  const cgfRingGuard = (c) =>
    Math.round(Math.min.apply(null, c.wells.map((well) =>
      Math.hypot(well.x - c.target.x, well.y - c.target.y))));
  const cgfRingGuardMass = (c) => {
    let mass = 0;
    let bestD = Infinity;
    c.wells.forEach((well) => {
      const d = Math.hypot(well.x - c.target.x, well.y - c.target.y);
      if (d < bestD) {
        bestD = d;
        mass = well.m;
      }
    });
    return mass;
  };
  /* The lazy straight shot: dead at the ring, every power on the grid. */
  const cgfStraightHits = (c) => {
    const angle = Math.atan2(c.target.y - c.tee.y, c.target.x - c.tee.x);
    let hits = 0;
    for (let p = 0.15; p <= 1.001; p += 0.05) {
      if (golfForge.fly(c, angle, p).hit) hits += 1;
    }
    return hits;
  };
  const cgfPosOf = (id) => cgfCourses.findIndex((c) => c.id === id);
  const cgfBefore = (id) => cgfCourses.slice(0, cgfPosOf(id));
  const cgfCourse = (id) => cgfCourses.find((c) => c.id === id);
  const cgfPeak = (list, value) => Math.max.apply(null, list.map(value));

  check("game-comet-golf", "the fourth tier is present",
    cgfNew.length === 10, cgfNew.map((c) => c.id).join(","));
  check("game-comet-golf", "the fourth tier's well, par and ring lines never fall",
    cgfNew.map((c) => c.wells.length).join(",") === "11,11,12,12,13,13,13,13,13,13" &&
    cgfNew.map((c) => c.starShots[2]).join(",") === "14,14,15,15,16,16,17,17,17,18" &&
    cgfNew.every((c, index) => index === 0 || c.target.r <= cgfNew[index - 1].target.r),
    cgfNew.map((c) => c.id + ":w" + c.wells.length + "/p" + c.starShots[2] + "/r" + c.target.r).join(" "));
  check("game-comet-golf", "not one fourth-tier hole falls to the lazy straight line",
    cgfNew.every((c) => cgfStraightHits(c) === 0),
    cgfNew.filter((c) => cgfStraightHits(c) > 0).map((c) => c.id + ":" + cgfStraightHits(c)).join(" "));

  check("game-comet-golf",
    "g31 opens the first eleven-well field",
    cgfCourse("g31").wells.length === 11 &&
      cgfBefore("g31").every((c) => c.wells.length < 11),
    "previous peak " + cgfPeak(cgfBefore("g31"), (c) => c.wells.length));
  check("game-comet-golf",
    "g32 heaves the heaviest sky to date: 15.1 total mass",
    cgfMass(cgfCourse("g32")) === 15.1 &&
      cgfBefore("g32").every((c) => cgfMass(c) < 15.1),
    "previous peak " + cgfPeak(cgfBefore("g32"), cgfMass));
  check("game-comet-golf",
    "g33 opens the first twelve-well field",
    cgfCourse("g33").wells.length === 12 &&
      cgfBefore("g33").every((c) => c.wells.length < 12),
    "previous peak " + cgfPeak(cgfBefore("g33"), (c) => c.wells.length));
  check("game-comet-golf",
    "g34 breaks the guardian mass cap: one well at 1.9 where every earlier sky stopped at 1.8",
    cgfHeaviest(cgfCourse("g34")) === 1.9 &&
      cgfBefore("g34").every((c) => cgfHeaviest(c) <= 1.8),
    "previous peak " + cgfPeak(cgfBefore("g34"), cgfHeaviest));
  check("game-comet-golf",
    "g35 opens the first thirteen-well field",
    cgfCourse("g35").wells.length === 13 &&
      cgfBefore("g35").every((c) => c.wells.length < 13),
    "previous peak " + cgfPeak(cgfBefore("g35"), (c) => c.wells.length));
  check("game-comet-golf",
    "g36 drops the first ring under nine: eight pixels",
    cgfCourse("g36").target.r === 8 &&
      cgfBefore("g36").every((c) => c.target.r >= 9),
    "previous floor " + Math.min.apply(null, cgfBefore("g36").map((c) => c.target.r)));
  check("game-comet-golf",
    "g37 heaves the mass record again: 17.4 total mass",
    cgfMass(cgfCourse("g37")) === 17.4 &&
      cgfBefore("g37").every((c) => cgfMass(c) < 17.4),
    "previous peak " + cgfPeak(cgfBefore("g37"), cgfMass));
  check("game-comet-golf",
    "g38 hangs the tightest ring guard the sky has shipped: twenty-eight pixels",
    cgfRingGuard(cgfCourse("g38")) === 28 &&
      cgfBefore("g38").every((c) => cgfRingGuard(c) > 28),
    "previous peak " + cgfPeak(cgfBefore("g38"), cgfRingGuard));
  check("game-comet-golf",
    "g39 parks the first giant on the ring's approach: a 1.9 guard where g9 and g28 stopped at 1.8",
    cgfRingGuardMass(cgfCourse("g39")) === 1.9 &&
      cgfBefore("g39").every((c) => cgfRingGuardMass(c) <= 1.8),
    "previous peak " + cgfPeak(cgfBefore("g39"), cgfRingGuardMass));
  check("game-comet-golf",
    "g40 pairs the records: the heaviest sky (18.6) under the deepest launch budget (eighteen)",
    cgfMass(cgfCourse("g40")) === 18.6 && cgfCourse("g40").starShots[2] === 18 &&
      cgfBefore("g40").every((c) => cgfMass(c) < 18.6 && c.starShots[2] < 18),
    "previous peaks mass " + cgfPeak(cgfBefore("g40"), cgfMass) +
      ", par " + cgfPeak(cgfBefore("g40"), (c) => c.starShots[2]));
  check("game-comet-golf",
    "g40 holds the tier's field cap and ring floor while it breaks the budget",
    cgfCourse("g40").wells.length === 13 && cgfCourse("g40").target.r === 8,
    "wells " + cgfCourse("g40").wells.length + ", ring " + cgfCourse("g40").target.r);

  /* Provenance: every deep-field course is regenerated from the seed noted
   * in its comment, through the forge's own brief and generator, and has to
   * come out byte-identical to the shipped row - the shipped bytes are the
   * verified candidate, not a transcription of one. */
  const cgfSeeds = { g31: 15, g32: 110, g33: 16, g34: 2, g35: 2, g36: 2, g37: 19, g38: 1116, g39: 353, g40: 25 };
  cgfNew.forEach((course) => {
    const spec = golfForge.brief[course.id];
    const regen = cgfSeeded(cgfSeeds[course.id], () => golfForge.forgeCourse(
      { id: course.id, labelKey: course.labelKey, wells: spec.wells, r: spec.r, maxM: spec.maxM },
      cgfSeeds[course.id] * 7919 + spec.wells * 131 + spec.r + spec.bump * 104729,
    ));
    check("game-comet-golf", `${course.id}: re-generating from its recorded seed reproduces the shipped course`,
      JSON.stringify([regen.tee, regen.target, regen.wells]) ===
        JSON.stringify([course.tee, course.target, course.wells]),
      "shipped " + JSON.stringify([course.tee, course.target]) +
        " vs regen " + JSON.stringify([regen.tee, regen.target]));
  });

  /* The replay: the forge's own answer re-flown through the engine path.
   * Basin and ride time are the numbers the tier comment prints, so the
   * comment is checked against the physics, not the other way round. */
  const cgfBasins = { g31: 9, g32: 10, g33: 6, g34: 9, g35: 9, g36: 6, g37: 6, g38: 6, g39: 11, g40: 7 };
  const cgfRides = { g31: 1.83, g32: 2.47, g33: 3.22, g34: 3.55, g35: 1.02, g36: 3.22, g37: 1.25, g38: 1.67, g39: 2.0, g40: 3.68 };
  cgfNew.forEach((course) => {
    const shot = cgfReports[course.id].shot;
    const flight = golfForge.fly(course, shot.angle, shot.power);
    check("game-comet-golf", `${course.id}: the recorded one-shot re-flies into the ring`,
      !!flight && flight.hit === true &&
        Math.round(flight.age * 100) === Math.round(cgfRides[course.id] * 100) &&
        shot.basin === cgfBasins[course.id],
      "hit " + !!flight.hit + ", ride " + flight.age.toFixed(2) + "s, basin " + shot.basin + "/25");
  });

  /* Star bands in the module's convention: launch counts against a "low is
   * better" scorer, so clearing the 3-star line takes one launch (the
   * proven one-shot), the 2-star line the mid band, the 1-star line the
   * par, and one launch past par is no stars at all. */
  check("game-comet-golf", "every course's launch bands rise",
    cgfCourses.every((c) => c.starShots[0] < c.starShots[1] && c.starShots[1] < c.starShots[2]),
    cgfCourses.filter((c) => !(c.starShots[0] < c.starShots[1] && c.starShots[1] < c.starShots[2]))
      .map((c) => c.id).join(","));
  check("game-comet-golf", "the star bands cut at the 3-star, 2-star and par lines for every course",
    cgfCourses.every((c) =>
      App.starsFor(c.starShots[0], c.starShots, "low") === 3 &&
      App.starsFor(c.starShots[0] + 1, c.starShots, "low") === 2 &&
      App.starsFor(c.starShots[1] + 1, c.starShots, "low") === 1 &&
      App.starsFor(c.starShots[2] + 1, c.starShots, "low") === 0),
    cgfCourses.map((c) => c.id + ":" + c.starShots.join("/")).join(" "));

  /* The deep-field course names travel with the module: both languages hold
   * a real string for every new hole (cgfL31-cgfL40 from the module's own
   * addStrings), and t() never falls back to the key. */
  check("game-comet-golf", "the ten deep-field course names resolve in both languages",
    cgfNewIds.every((id) => {
      const key = "cgfL" + id.slice(1);
      const en = App.I18N && App.I18N.en ? App.I18N.en[key] : null;
      const zh = App.I18N && App.I18N.zh ? App.I18N.zh[key] : null;
      return !!en && en !== key && !!zh && zh !== key && en !== zh && App.t(key) !== key;
    }), "a deep-field label fell back to its key");
  check("game-comet-golf", "every course's labelKey follows the cgfL scheme",
    cgfCourses.every((c) => c.labelKey === "cgfL" + c.id.slice(1)),
    cgfCourses.filter((c) => c.labelKey !== "cgfL" + c.id.slice(1)).map((c) => c.id).join(","));

  /* The unlock chain is derived, never stored, so it scales with the ladder:
   * clearing each course in order must hand the player exactly the next
   * one, all forty times, with nothing left locked behind the last. */
  const cgfChain = App.createCampaign({
    key: "comet-golf-gate-chain",
    levels: cgfCourses.map((course) => ({ id: course.id, labelKey: course.labelKey })),
  });
  let cgfWalked = 0;
  let cgfChained = true;
  cgfCourses.forEach((course, index) => {
    const outcome = cgfChain.record(course.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) cgfWalked += 1;
    const expected = index + 1 < cgfCourses.length ? cgfCourses[index + 1].id : null;
    if (outcome.unlockedNext !== expected) cgfChained = false;
  });
  check("game-comet-golf", "the unlock chain walks all forty courses in order",
    cgfWalked === 40 && cgfChained && cgfChain.clearedCount() === 40,
    cgfWalked + " first clears");
};
