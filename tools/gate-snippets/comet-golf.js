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
 * ring lines never fall within the tier.
 *
 * The fifth tier g41-g44 is the singularity tier, and it carries one new
 * mechanic no shipped course ever had: a 2.0 singularity, the first wells
 * the drawer has ever dealt past the 1.9 cap g34 broke. Every course of
 * the tier runs fourteen wells - the first field past the deep-field
 * tier's thirteen - under a sky that swells rung over rung past the
 * capstone's 18.6 (19.9 -> 20.4 -> 20.9 -> 22.1), on the eight-pixel ring
 * floor, with the par line climbing from nineteen to twenty-one. The tier
 * opens with exactly one singularity per sky, g43 doubles it, and the
 * capstone pairs the records. The gate holds the mechanic two ways:
 * structurally, against the census of every shipped row - no course before
 * the tier ever massed past 1.9 - and live, by cutting the 2.0 giants out
 * of a mutant copy of each shipped course and re-flying the recorded
 * one-shot through fly(): the shot must die, so the giants bend the answer
 * rather than decorating the field.
 *
 * The sixth tier g45-g50 is the citadel tier, and it moves the mechanic to
 * the cup: every course's ring guard - the nearest well to the ring - is a
 * 2.0 singularity, where the heaviest guardian any earlier course kept was
 * g39's 1.9 (seventy-four pixels out) and the closest of any mass was
 * g38's 1.5 at twenty-eight. The moat closes rung over rung through
 * disjoint pixel bands the forge lays candidates inside, so the measured
 * guard falls no matter where in its band each hole landed:
 * 44 -> 42 -> 37 -> 33 -> 31 -> 26, the capstone past g38's record with a
 * heavier guardian and its crash disc reaching three pixels inside the
 * capture disc's rim. No citadel sky carries filler - every well masses at
 * least 1.2 where the pre-tier wilds dipped to 0.6 - and every citadel sky
 * out-masses the tier-five capstone's 22.1 while the par line climbs from
 * twenty-one to the capstone's twenty-three, the deepest launch budget the
 * sky has ever asked for. The bound answers are replayed the same way the
 * forge shipped them: checkCourse ranks every wide answer and the gate
 * re-flies the widest one that dies without its giants, then re-runs the
 * cut itself. Star bands, both languages and the unlock chain are checked
 * last. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const golfForge = require(path.join(root, "tools", "golf-forge.js"));
  const cgfCourses = golfForge.loadCourses();

  check("game-comet-golf", "the sky holds fifty courses",
    cgfCourses.length === 50, String(cgfCourses.length));
  check("game-comet-golf", "every course id is distinct",
    new Set(cgfCourses.map((c) => c.id)).size === cgfCourses.length);
  check("game-comet-golf", "the ids run g1 through g50 in order",
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
   * shot the checker found, so nothing is trusted twice. Bound briefs
   * (the singularity and citadel tiers) are judged by their own
   * convention: checkCourse ranks every wide answer and hands back the
   * widest one that dies when the 2.0 giants are cut out of a mutant
   * copy - the very shot the forge shipped. */
  const cgfReports = {};
  cgfSeeded(41027, () => {
    cgfCourses.forEach((course) => {
      const spec = golfForge.brief[course.id];
      const report = golfForge.checkCourse(course, { wantBound: !!(spec && spec.wantBound) });
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
  const cgfSingIds = ["g41", "g42", "g43", "g44"];
  const cgfOpen = cgfCourses.filter((c) => cgfOpenIds.includes(c.id));
  const cgfCrowd = cgfCourses.filter((c) => cgfCrowdIds.includes(c.id));
  const cgfDeep = cgfCourses.filter((c) => cgfDeepIds.includes(c.id));
  const cgfSky = cgfCourses.filter((c) => cgfSkyIds.includes(c.id));
  const cgfNew = cgfCourses.filter((c) => cgfNewIds.includes(c.id));
  const cgfSing = cgfCourses.filter((c) => cgfSingIds.includes(c.id));

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

  /* The fifth tier g41-g44: the singularity tier. One mechanic - a 2.0
   * giant no shipped course ever carried - rides a field of fourteen wells
   * past every ceiling the deep-field capstone left, and the sky, field,
   * par and ring lines are read off the shipped rows, never asserted. */
  const cgfSingularities = (c) => c.wells.filter((well) => well.m >= 2).length;
  check("game-comet-golf", "the singularity tier is present",
    cgfSing.length === 4, cgfSing.map((c) => c.id).join(","));
  check("game-comet-golf", "the singularity tier's well, par and ring lines never fall",
    cgfSing.map((c) => c.wells.length).join(",") === "14,14,14,14" &&
    cgfSing.map((c) => c.starShots[2]).join(",") === "19,19,20,21" &&
    cgfSing.every((c, index) => index === 0 || c.target.r <= cgfSing[index - 1].target.r),
    cgfSing.map((c) => c.id + ":w" + c.wells.length + "/p" + c.starShots[2] + "/r" + c.target.r).join(" "));
  check("game-comet-golf", "not one singularity-tier hole falls to the lazy straight line",
    cgfSing.every((c) => cgfStraightHits(c) === 0),
    cgfSing.filter((c) => cgfStraightHits(c) > 0).map((c) => c.id + ":" + cgfStraightHits(c)).join(" "));
  check("game-comet-golf",
    "every singularity-tier course keeps a 2.0 giant and no shipped course before the tier ever massed past 1.9",
    cgfSing.every((c) => cgfSingularities(c) >= 1) &&
      cgfBefore("g41").every((c) => cgfHeaviest(c) <= 1.9),
    "pre-tier heaviest " + cgfPeak(cgfBefore("g41"), cgfHeaviest) +
      ", tier census " + cgfSing.map((c) => cgfSingularities(c)).join(","));
  check("game-comet-golf",
    "g41 opens the first fourteen-well field",
    cgfCourse("g41").wells.length === 14 &&
      cgfBefore("g41").every((c) => c.wells.length < 14),
    "previous peak " + cgfPeak(cgfBefore("g41"), (c) => c.wells.length));
  check("game-comet-golf",
    "g42 heaves the heaviest sky to date: 20.4 total mass",
    cgfMass(cgfCourse("g42")) === 20.4 &&
      cgfBefore("g42").every((c) => cgfMass(c) < 20.4),
    "previous peak " + cgfPeak(cgfBefore("g42"), cgfMass));
  check("game-comet-golf",
    "g43 doubles the mechanic: the first twin singularities, where no course before the tier carried even one 2.0 well",
    cgfSingularities(cgfCourse("g43")) === 2 &&
      cgfBefore("g41").every((c) => cgfSingularities(c) === 0),
    "pre-tier census " +
      cgfPeak(cgfBefore("g41"), cgfSingularities));
  check("game-comet-golf",
    "g44 pairs the records: the heaviest sky (22.1) under the deepest launch budget (twenty-one) with both giants aboard",
    cgfMass(cgfCourse("g44")) === 22.1 && cgfCourse("g44").starShots[2] === 21 &&
      cgfSingularities(cgfCourse("g44")) === 2 &&
      cgfBefore("g44").every((c) => cgfMass(c) < 22.1 && c.starShots[2] < 21),
    "previous peaks mass " + cgfPeak(cgfBefore("g44"), cgfMass) +
      ", par " + cgfPeak(cgfBefore("g44"), (c) => c.starShots[2]));
  check("game-comet-golf",
    "g44 holds the tier's field cap and ring floor while it breaks the budget",
    cgfCourse("g44").wells.length === 14 && cgfCourse("g44").target.r === 8,
    "wells " + cgfCourse("g44").wells.length + ", ring " + cgfCourse("g44").target.r);

  /* The sixth tier g45-g50: the citadel tier. The mechanic moves to the
   * cup - a 2.0 singularity parked in close orbit of the ring, closing
   * rung over rung through disjoint pixel bands - and the lines are read
   * off the shipped rows, never asserted. */
  const cgfCitadelIds = ["g45", "g46", "g47", "g48", "g49", "g50"];
  const cgfCitadel = cgfCourses.filter((c) => cgfCitadelIds.includes(c.id));
  check("game-comet-golf", "the citadel tier is present",
    cgfCitadel.length === 6, cgfCitadel.map((c) => c.id).join(","));
  check("game-comet-golf", "the citadel tier's well, par and ring lines never fall",
    cgfCitadel.map((c) => c.wells.length).join(",") === "14,14,14,14,14,14" &&
    cgfCitadel.map((c) => c.starShots[2]).join(",") === "21,21,22,22,22,23" &&
    cgfCitadel.every((c, index) => index === 0 || c.target.r <= cgfCitadel[index - 1].target.r),
    cgfCitadel.map((c) => c.id + ":w" + c.wells.length + "/p" + c.starShots[2] + "/r" + c.target.r).join(" "));
  check("game-comet-golf", "not one citadel-tier hole falls to the lazy straight line",
    cgfCitadel.every((c) => cgfStraightHits(c) === 0),
    cgfCitadel.filter((c) => cgfStraightHits(c) > 0).map((c) => c.id + ":" + cgfStraightHits(c)).join(" "));
  check("game-comet-golf",
    "every citadel course's ring guard is a 2.0 singularity and no earlier course ever posted one",
    cgfCitadel.every((c) => cgfRingGuardMass(c) === 2) &&
      cgfCourses.filter((c) => !cgfCitadelIds.includes(c.id)).every((c) => cgfRingGuardMass(c) <= 1.9),
    "pre-tier heaviest guard " + cgfPeak(cgfCourses.filter((c) => !cgfCitadelIds.includes(c.id)), cgfRingGuardMass) +
      ", citadel guards " + cgfCitadel.map((c) => cgfRingGuardMass(c)).join(","));
  check("game-comet-golf",
    "the moat closes rung over rung: measured guards 44, 42, 37, 33, 31, 26",
    cgfCitadel.map((c) => cgfRingGuard(c)).join(",") === "44,42,37,33,31,26" &&
      cgfCitadel.every((c, index) => index === 0 || cgfRingGuard(c) < cgfRingGuard(cgfCitadel[index - 1])),
    "moat " + cgfCitadel.map((c) => c.id + ":" + cgfRingGuard(c)).join(" "));
  check("game-comet-golf",
    "each moat lands in its brief's disjoint band and never strays into a neighbour's",
    cgfCitadel.every((c, index) => {
      const spec = golfForge.brief[c.id];
      const guard = cgfRingGuard(c);
      return guard >= spec.ringGuardMin && guard <= spec.ringGuard &&
        cgfCitadel.every((other, otherIndex) =>
          otherIndex === index || cgfRingGuard(other) !== guard);
    }),
    "moat " + cgfCitadel.map((c) => cgfRingGuard(c)).join(","));
  check("game-comet-golf",
    "g45 opens the first ring guard the sky has ever posted at mass 2.0",
    cgfRingGuardMass(cgfCourse("g45")) === 2 &&
      cgfBefore("g45").every((c) => cgfRingGuardMass(c) <= 1.9),
    "previous peak " + cgfPeak(cgfBefore("g45"), cgfRingGuardMass));
  check("game-comet-golf",
    "g47 posts the first twin-guarded cup and the twins stay through the capstone",
    cgfCitadel.slice(2).every((c) => cgfSingularities(c) >= 2) &&
      cgfCourses.filter((c) => !cgfCitadelIds.includes(c.id) && !cgfSingIds.includes(c.id))
        .every((c) => cgfSingularities(c) === 0),
    "citadel census " + cgfCitadel.map((c) => cgfSingularities(c)).join(","));
  check("game-comet-golf",
    "no citadel sky carries filler: every well masses 1.2 or more where the pre-tier wilds dipped to 0.6",
    cgfCitadel.every((c) => Math.min.apply(null, c.wells.map((well) => well.m)) >= 1.2) &&
      Math.min.apply(null, cgfCourses.filter((c) => !cgfCitadelIds.includes(c.id))
        .reduce((all, c) => all.concat(c.wells.map((well) => well.m)), [])) < 1.2,
    "citadel floor " + Math.min.apply(null, cgfCitadel.reduce((all, c) => all.concat(c.wells.map((well) => well.m)), [])) +
      ", pre-tier floor " + Math.min.apply(null, cgfCourses.filter((c) => !cgfCitadelIds.includes(c.id))
        .reduce((all, c) => all.concat(c.wells.map((well) => well.m)), [])));
  check("game-comet-golf",
    "every citadel sky out-masses the tier-five capstone's 22.1 and the measured line is 22.5 to 24.0",
    cgfCitadel.every((c) => cgfMass(c) >= 22.2) &&
      cgfBefore("g45").every((c) => cgfMass(c) < 22.2) &&
      Math.min.apply(null, cgfCitadel.map(cgfMass)) === 22.2 &&
      Math.max.apply(null, cgfCitadel.map(cgfMass)) === 24,
    "citadel masses " + cgfCitadel.map((c) => cgfMass(c)).join(",") +
      ", pre-tier peak " + cgfPeak(cgfBefore("g45"), cgfMass));
  check("game-comet-golf",
    "g50 pairs the records: the closest ring approach the sky has ever asked (twenty-six pixels) under the deepest launch budget (twenty-three) with both giants aboard",
    cgfRingGuard(cgfCourse("g50")) === 26 && cgfCourse("g50").starShots[2] === 23 &&
      cgfSingularities(cgfCourse("g50")) === 2 &&
      cgfBefore("g50").every((c) => cgfRingGuard(c) > 26 && c.starShots[2] < 23),
    "previous peaks moat " + cgfPeak(cgfBefore("g50"), cgfRingGuard) +
      ", par " + cgfPeak(cgfBefore("g50"), (c) => c.starShots[2]));
  check("game-comet-golf",
    "g50 holds the tier's field cap and ring floor while it breaks the budget",
    cgfCourse("g50").wells.length === 14 && cgfCourse("g50").target.r === 8,
    "wells " + cgfCourse("g50").wells.length + ", ring " + cgfCourse("g50").target.r);

  /* Provenance: every deep-field, singularity and citadel course is
   * regenerated from the seed noted in its comment, through the forge's own
   * brief and generator, and has to come out byte-identical to the shipped
   * row - the shipped bytes are the verified candidate, not a transcription
   * of one. */
  const cgfSeeds = {
    g31: 15, g32: 110, g33: 16, g34: 2, g35: 2, g36: 2, g37: 19, g38: 1116, g39: 353, g40: 25,
    g41: 75, g42: 423, g43: 469, g44: 1854,
    g45: 2422, g46: 6874, g47: 18768, g48: 3110, g49: 41464, g50: 72623,
  };
  cgfNew.concat(cgfSing, cgfCitadel).forEach((course) => {
    const spec = golfForge.brief[course.id];
    const regen = cgfSeeded(cgfSeeds[course.id], () => golfForge.forgeCourse(
      { id: course.id, labelKey: course.labelKey, wells: spec.wells, r: spec.r, maxM: spec.maxM, minWell: spec.minWell },
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
  const cgfBasins = { g31: 9, g32: 10, g33: 6, g34: 9, g35: 9, g36: 6, g37: 6, g38: 6, g39: 11, g40: 7, g41: 8, g42: 6, g43: 9, g44: 9, g45: 7, g46: 6, g47: 8, g48: 6, g49: 7, g50: 6 };
  const cgfRides = { g31: 1.83, g32: 2.47, g33: 3.22, g34: 3.55, g35: 1.02, g36: 3.22, g37: 1.25, g38: 1.67, g39: 2.0, g40: 3.68, g41: 3.12, g42: 3.45, g43: 2.77, g44: 2.05, g45: 3.33, g46: 3.58, g47: 3.18, g48: 2.55, g49: 3.72, g50: 2.52 };
  cgfNew.concat(cgfSing, cgfCitadel).forEach((course) => {
    const shot = cgfReports[course.id].shot;
    const flight = golfForge.fly(course, shot.angle, shot.power);
    check("game-comet-golf", `${course.id}: the recorded one-shot re-flies into the ring`,
      !!flight && flight.hit === true &&
        Math.round(flight.age * 100) === Math.round(cgfRides[course.id] * 100) &&
        shot.basin === cgfBasins[course.id],
      "hit " + !!flight.hit + ", ride " + flight.age.toFixed(2) + "s, basin " + shot.basin + "/25");
  });

  /* The mechanic is not decorative: cut the 2.0 giants out of a mutant copy
   * of each singularity and citadel course and re-fly the recorded one-shot
   * - the shot that threaded their pull must die, the same cut the forge
   * shipped against. The game has no authored reserve - a course is its
   * solution - so a shot that still landed without the giants would mark
   * them as scenery. For the citadel rows the recorded shot is itself the
   * widest answer that dies under this cut, and the cut must still land
   * that verdict. */
  cgfSing.concat(cgfCitadel).forEach((course) => {
    const shot = cgfReports[course.id].shot;
    const mutant = {
      tee: course.tee,
      target: course.target,
      wells: course.wells.filter((well) => well.m < 2),
    };
    const flight = golfForge.fly(mutant, shot.angle, shot.power);
    check("game-comet-golf",
      `${course.id}: cutting the singularity out of a mutant copy kills the proven one-shot`,
      !!flight && flight.hit === false,
      "the recorded shot still lands without the " +
        cgfSingularities(course) + " 2.0 giant(s)");
  });

  /* The star lines are honest both ways: the engine's own line - the
   * recorded one-shot, a single launch - lands the full three stars, a
   * dawdling round that burns the whole par still stars, and one launch
   * past par is nothing at all. */
  check("game-comet-golf",
    "every singularity course stars the engine's own one-shot line and a dawdling par round, and nothing past it",
    cgfSing.every((c) =>
      App.starsFor(1, c.starShots, "low") === 3 &&
      App.starsFor(c.starShots[2], c.starShots, "low") === 1 &&
      App.starsFor(c.starShots[2] + 1, c.starShots, "low") === 0),
    cgfSing.map((c) => c.id + ":" + c.starShots.join("/")).join(" "));
  check("game-comet-golf",
    "every citadel course stars the engine's own one-shot line and a dawdling par round, and nothing past it",
    cgfCitadel.every((c) =>
      App.starsFor(1, c.starShots, "low") === 3 &&
      App.starsFor(c.starShots[2], c.starShots, "low") === 1 &&
      App.starsFor(c.starShots[2] + 1, c.starShots, "low") === 0),
    cgfCitadel.map((c) => c.id + ":" + c.starShots.join("/")).join(" "));

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
  check("game-comet-golf", "the four singularity course names resolve in both languages",
    cgfSingIds.every((id) => {
      const key = "cgfL" + id.slice(1);
      const en = App.I18N && App.I18N.en ? App.I18N.en[key] : null;
      const zh = App.I18N && App.I18N.zh ? App.I18N.zh[key] : null;
      return !!en && en !== key && !!zh && zh !== key && en !== zh && App.t(key) !== key;
    }), "a singularity label fell back to its key");
  check("game-comet-golf", "the six citadel course names resolve in both languages",
    cgfCitadelIds.every((id) => {
      const key = "cgfL" + id.slice(1);
      const en = App.I18N && App.I18N.en ? App.I18N.en[key] : null;
      const zh = App.I18N && App.I18N.zh ? App.I18N.zh[key] : null;
      return !!en && en !== key && !!zh && zh !== key && en !== zh && App.t(key) !== key;
    }), "a citadel label fell back to its key");
  check("game-comet-golf", "every course's labelKey follows the cgfL scheme",
    cgfCourses.every((c) => c.labelKey === "cgfL" + c.id.slice(1)),
    cgfCourses.filter((c) => c.labelKey !== "cgfL" + c.id.slice(1)).map((c) => c.id).join(","));

  /* The unlock chain is derived, never stored, so it scales with the ladder:
   * clearing each course in order must hand the player exactly the next
   * one, all fifty times, with nothing left locked behind the last. */
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
  check("game-comet-golf", "the unlock chain walks all fifty courses in order",
    cgfWalked === 50 && cgfChained && cgfChain.clearedCount() === 50,
    cgfWalked + " first clears");
};
