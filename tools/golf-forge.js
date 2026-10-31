#!/usr/bin/env node
/* Comet Golf course forge + verifier.
 *
 * The panel's flight is a plain ODE, so a course is checked by flying it: every
 * hole must (1) be beatable in one shot somewhere in the aim space, (2) refuse
 * the lazy straight line from tee to ring, so the hole asks for real thought,
 * and (3) expose a basin, not a single lucky pixel - the shot has to be
 * repeatable by a hand on a mouse or a keyboard.
 *
 * Usage:
 *   node tools/golf-forge.js list              # verify the shipped courses
 *   node tools/golf-forge.js forge g11 g12     # print new verified courses
 */
"use strict";

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "assets", "app", "game-comet-golf.js");

/* The engine's own constants, read off game-comet-golf.js. */
const CGF_WIDTH = 320;
const CGF_HEIGHT = 360;
const CGF_GRAVITY = 5200;
const CGF_MAX_ACCEL = 950;
const CGF_MAX_SPEED = 470;
const CGF_COMET_R = 5;
const CGF_MAX_SHOT_SECONDS = 9;

function loadCourses() {
  const file = fs.readFileSync(FILE, "utf8");
  const start = file.indexOf("var cgfLevels = [");
  if (start < 0) throw new Error("cgfLevels not found");
  const open = file.indexOf("[", start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < file.length; i += 1) {
    const ch = file[i];
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  /* eslint-disable-next-line no-new-func */
  return new Function("return " + file.slice(open, end))();
}

/* One flight. Mirrors update(): well pull capped, straight-line no-gravity
 * path otherwise, target and wells tested with the same radii. */
function fly(course, angle, power, dt) {
  const step = dt || 1 / 60;
  const speed = CGF_MAX_SPEED * power;
  let x = course.tee.x;
  let y = course.tee.y;
  let vx = Math.cos(angle) * speed;
  let vy = Math.sin(angle) * speed;
  let age = 0;
  while (age <= CGF_MAX_SHOT_SECONDS) {
    let ax = 0;
    let ay = 0;
    course.wells.forEach(function (well) {
      const dx = well.x - x;
      const dy = well.y - y;
      const d2 = Math.max(dx * dx + dy * dy, 64);
      const d = Math.sqrt(d2);
      const pull = Math.min(CGF_MAX_ACCEL, (CGF_GRAVITY * well.m) / d2);
      ax += (dx / d) * pull;
      ay += (dy / d) * pull;
    });
    vx += ax * step;
    vy += ay * step;
    x += vx * step;
    y += vy * step;
    age += step;
    const dxT = x - course.target.x;
    const dyT = y - course.target.y;
    if (Math.hypot(dxT, dyT) < course.target.r + CGF_COMET_R) return { hit: true, age: age };
    let crashed = false;
    course.wells.forEach(function (well) {
      if (Math.hypot(x - well.x, y - well.y) < well.r + CGF_COMET_R) crashed = true;
    });
    if (
      crashed ||
      x < -50 ||
      y < -50 ||
      x > CGF_WIDTH + 50 ||
      y > CGF_HEIGHT + 50
    ) {
      return { hit: false, crashed: crashed, age: age };
    }
  }
  return { hit: false, crashed: false, age: age };
}

/* Coarse sweep, then a local refine: enough to prove a hole-in-one exists and
 * to size the basin around it. */
function bestShot(course) {
  const coarse = [];
  for (let a = -Math.PI; a < Math.PI; a += 0.03) {
    for (let p = 0.15; p <= 1.001; p += 0.05) {
      const shot = fly(course, a, p);
      if (shot.hit) coarse.push({ angle: a, power: p });
    }
  }
  if (!coarse.length) return null;
  /* Refine around every coarse hit and keep the one with the widest basin. */
  let best = null;
  coarse.forEach(function (seed) {
    const hits = [];
    for (let da = -0.04; da <= 0.0401; da += 0.02) {
      for (let dp = -0.02; dp <= 0.0201; dp += 0.02) {
        const a = seed.angle + da;
        const p = Math.min(1, Math.max(0.15, seed.power + dp));
        if (fly(course, a, p).hit) hits.push({ angle: a, power: p });
      }
    }
    if (!best || hits.length > best.basin) {
      best = { angle: seed.angle, power: seed.power, basin: hits.length };
    }
  });
  best.totalHits = coarse.length;
  return best;
}

function checkCourse(course) {
  const problems = [];
  /* Every well must sit inside the sky and clear of tee and target. */
  course.wells.forEach(function (well, index) {
    if (well.x < 6 || well.x > CGF_WIDTH - 6 || well.y < 6 || well.y > CGF_HEIGHT - 6) {
      problems.push("well " + index + " is off the sky");
    }
    if (Math.hypot(well.x - course.tee.x, well.y - course.tee.y) < well.r + 12) {
      problems.push("well " + index + " buries the tee");
    }
    if (Math.hypot(well.x - course.target.x, well.y - course.target.y) < well.r + course.target.r + 6) {
      problems.push("well " + index + " buries the target");
    }
  });
  /* The wells have to matter: at least one has to sit close enough to the
   * tee-to-ring line that it bends the flight, or the hole is scenery. */
  const lineDx = course.target.x - course.tee.x;
  const lineDy = course.target.y - course.tee.y;
  const lineLen = Math.hypot(lineDx, lineDy) || 1;
  const nearest = course.wells.reduce(function (best, well) {
    const t = Math.max(
      0,
      Math.min(1, ((well.x - course.tee.x) * lineDx + (well.y - course.tee.y) * lineDy) / (lineLen * lineLen)),
    );
    const nearX = course.tee.x + lineDx * t;
    const nearY = course.tee.y + lineDy * t;
    return Math.min(best, Math.hypot(well.x - nearX, well.y - nearY));
  }, Infinity);
  if (nearest > 70) {
    problems.push("no well sits near the flight line - the hole is scenery");
  }
  const shot = bestShot(course);
  if (!shot) {
    problems.push("no one-shot solution exists");
  } else if (shot.basin < 3) {
    problems.push("the only shot is a hair-thin window (" + shot.basin + "/25)");
  }
  return { problems: problems, shot: shot };
}

/* ---- generator ---------------------------------------------------------------- */
function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Lay a course: tee and ring on opposite thirds of the sky, wells scattered
 * between them, then let the verifier decide whether the hole is honest. */
function forgeCourse(spec, seed) {
  const rng = mulberry(seed);
  const corner = rng() < 0.5;
  const teeX = corner ? 36 : CGF_WIDTH - 36;
  const targetX = corner ? CGF_WIDTH - 36 : 36;
  const tee = { x: teeX, y: 60 + Math.floor(rng() * 240) };
  const target = { x: targetX, y: 60 + Math.floor(rng() * 240), r: spec.r || 14 };
  const wells = [];
  for (let i = 0; i < spec.wells; i += 1) {
    wells.push({
      x: Math.round(60 + rng() * (CGF_WIDTH - 120)),
      y: Math.round(50 + rng() * (CGF_HEIGHT - 100)),
      /* spec.maxM lifts the mass cap - the deep-field tier breaks the 1.8
       * guardian every earlier tier stopped at. */
      m: Math.round((0.7 + rng() * (spec.maxM ? spec.maxM - 0.7 : 1.1)) * 10) / 10,
      r: Math.round(9 + rng() * 5),
    });
  }
  return {
    id: spec.id,
    labelKey: spec.labelKey,
    tee: tee,
    target: target,
    wells: wells,
    starShots: [0, 0, 0],
  };
}

function fmtCourse(course, stars) {
  const wellLines = course.wells.map(function (well) {
    return "        { x: " + well.x + ", y: " + well.y + ", m: " + well.m + ", r: " + well.r + " },";
  });
  return [
    "    {",
    '      id: "' + course.id + '", labelKey: "' + course.labelKey + '",',
    "      tee: { x: " + course.tee.x + ", y: " + course.tee.y + " }, target: { x: " + course.target.x + ", y: " + course.target.y + ", r: " + course.target.r + " },",
    "      wells: [",
    wellLines.join("\n"),
    "      ],",
    "      starShots: [" + stars.join(", ") + "],",
    "    },",
  ].join("\n");
}

/* The per-hole forge brief: well count, ring radius, the tier bump that
 * separates the seed streams, and the record predicates a hole's candidate
 * has to carry. The gate reads it back to re-generate every deep-field
 * course from the seed recorded in its comment. */
const brief = {
  /* g9/g10 shipped under the old basin>=3 bar; they re-forge here so the
   * whole sky meets the same keyboard bar the deep tier is held to. */
  g9: { bump: 3, wells: 3, r: 14 },
  g10: { bump: 0, wells: 3, r: 13 },
  g11: { bump: 1, wells: 3, r: 14 },
  g12: { bump: 2, wells: 3, r: 14 },
  g13: { bump: 3, wells: 4, r: 14 },
  g14: { bump: 4, wells: 4, r: 13 },
  g15: { bump: 5, wells: 4, r: 13 },
  g16: { bump: 6, wells: 4, r: 13 },
  g17: { bump: 7, wells: 5, r: 13 },
  g18: { bump: 8, wells: 5, r: 12 },
  g19: { bump: 9, wells: 5, r: 12 },
  g20: { bump: 10, wells: 5, r: 12 },
  /* The deep tier: more wells in the same sky and a ring that keeps
   * shrinking - the forge still has to prove a repeatable one-shot. */
  g21: { bump: 11, wells: 6, r: 12 },
  g22: { bump: 12, wells: 6, r: 11 },
  g23: { bump: 13, wells: 7, r: 11 },
  g24: { bump: 14, wells: 7, r: 10 },
  /* The deep-sky tier past g24: the wells climb to eight, nine, then
   * ten in the same 320x360 sky while the ring settles at nine - the
   * forge's bar does not move, so every one of these still needs a
   * repeatable one-shot (basin >= 6 of 25) to ship. */
  g25: { bump: 15, wells: 8, r: 10 },
  g26: { bump: 16, wells: 8, r: 10 },
  g27: { bump: 17, wells: 9, r: 10 },
  g28: { bump: 18, wells: 9, r: 9 },
  g29: { bump: 19, wells: 10, r: 9 },
  g30: { bump: 20, wells: 10, r: 9 },
  /* The deep-field tier past g30: eleven to thirteen wells in the same
   * sky, the ring past the nine-pixel floor, and the same keyboard bar.
   * Each spec carries the record its hole claims, checked against the
   * peaks the first thirty measured: g32 the heaviest sky (past g29's
   * 14.3 total mass), g34 the first guardian past the 1.8 cap, g36 the
   * first ring under nine, g37 the mass record again, g38 a guardian
   * hovering twenty-eight pixels off the ring (past g19's 37), g39 the
   * ring's own guard masses 1.9 - the first giant parked at the ring,
   * where g9 and g28's guards stopped at 1.8 - and g40 the capstone -
   * the heaviest sky, the thirteen-well field, the eight-pixel ring and
   * the deepest launch budget in one course. Every new hole also has to
   * refuse the lazy straight line at every power. */
  g31: { bump: 21, wells: 11, r: 9, noStraight: true },
  g32: { bump: 22, wells: 11, r: 9, noStraight: true, minMass: 15 },
  g33: { bump: 23, wells: 12, r: 9, noStraight: true },
  g34: { bump: 24, wells: 12, r: 9, noStraight: true, maxM: 1.9, wantHeavy: true },
  g35: { bump: 25, wells: 13, r: 9, noStraight: true },
  g36: { bump: 26, wells: 13, r: 8, noStraight: true },
  g37: { bump: 27, wells: 13, r: 8, noStraight: true, minMass: 16.5 },
  /* The guardian-hugging records are rare finds: they get a wider seed
   * sweep than the layout-driven holes. g39's giant at the gate also
   * needs the lifted mass cap, or no 1.9 guardian could ever be dealt. */
  g38: { bump: 28, wells: 13, r: 8, noStraight: true, ringGuard: 30, seeds: 1200 },
  g39: { bump: 29, wells: 13, r: 8, noStraight: true, maxM: 1.9, ringGuardMass: 1.9, seeds: 1200 },
  g40: { bump: 30, wells: 13, r: 8, noStraight: true, minMass: 18 },
};

function main() {
  const mode = process.argv[2] || "list";
  const courses = loadCourses();

  if (mode === "list") {
    let bad = 0;
    const t0 = Date.now();
    courses.forEach(function (course) {
      const report = checkCourse(course);
      if (report.problems.length) bad += 1;
      console.log(
        (report.problems.length ? "FAIL" : "ok  ") +
          "  " + course.id +
          "  wells " + course.wells.length +
          (report.shot ? "  one-shot at " + report.shot.angle.toFixed(2) + "rad / " + report.shot.power.toFixed(2) + "  basin " + report.shot.basin + "/25  hits " + report.shot.totalHits : "") +
          (report.problems.length ? "  " + report.problems.join("; ") : ""),
      );
    });
    console.log((bad ? bad + " course(s) failed" : "all " + courses.length + " courses verified") + " in " + (Date.now() - t0) + "ms");
    process.exit(bad ? 1 : 0);
  }

  if (mode === "forge") {
    const ids = process.argv.slice(3);
    const stars = {
      g9: [2, 4, 6], g10: [2, 4, 7],
      g11: [1, 2, 3], g12: [1, 2, 3], g13: [1, 2, 4], g14: [2, 3, 4],
      g15: [2, 3, 5], g16: [2, 4, 6], g17: [2, 4, 6], g18: [2, 4, 7],
      g19: [2, 4, 7], g20: [2, 4, 8],
      g21: [2, 4, 8], g22: [2, 5, 8], g23: [2, 5, 9], g24: [2, 5, 10],
      g25: [2, 5, 11], g26: [2, 5, 11], g27: [2, 6, 12],
      g28: [2, 6, 12], g29: [2, 6, 13], g30: [2, 6, 13],
      g31: [2, 6, 14], g32: [2, 6, 14], g33: [2, 7, 15],
      g34: [2, 7, 15], g35: [2, 7, 16], g36: [2, 7, 16],
      g37: [2, 8, 17], g38: [2, 8, 17], g39: [2, 8, 17],
      g40: [2, 8, 18],
    };
    /* The deep-field tier's record predicates, measured through the same
     * flight the panel flies: a hole ships only when the candidate actually
     * carries the record its brief claims, not just a clean one-shot. */
    const cgfMass = function (course) {
      return Math.round(course.wells.reduce(function (sum, well) {
        return sum + well.m;
      }, 0) * 10) / 10;
    };
    const cgfStraightHits = function (course) {
      const angle = Math.atan2(course.target.y - course.tee.y, course.target.x - course.tee.x);
      let hits = 0;
      for (let p = 0.15; p <= 1.001; p += 0.05) {
        if (fly(course, angle, p).hit) hits += 1;
      }
      return hits;
    };
    const cgfRingGuard = function (course) {
      return Math.min.apply(null, course.wells.map(function (well) {
        return Math.hypot(well.x - course.target.x, well.y - course.target.y);
      }));
    };
    /* The mass of the guardian that owns the ring's approach. */
    const cgfRingGuardMass = function (course) {
      let mass = 0;
      let bestD = Infinity;
      course.wells.forEach(function (well) {
        const d = Math.hypot(well.x - course.target.x, well.y - course.target.y);
        if (d < bestD) {
          bestD = d;
          mass = well.m;
        }
      });
      return mass;
    };

    (ids.length ? ids : Object.keys(brief)).forEach(function (id) {
      const spec = brief[id];
      if (!spec) return;
      let course = null;
      let report = null;
      let usedSeed = 0;
      for (let seed = 1; seed <= (spec.seeds || 220) && !course; seed += 1) {
        const candidate = forgeCourse(
          { id: id, labelKey: "cgfL" + id.slice(1), wells: spec.wells, r: spec.r, maxM: spec.maxM },
          seed * 7919 + spec.wells * 131 + spec.r + spec.bump * 104729,
        );
        if (spec.minMass && cgfMass(candidate) < spec.minMass) continue;
        if (spec.wantHeavy && !candidate.wells.some(function (well) { return well.m >= 1.9; })) continue;
        if (spec.ringGuard && cgfRingGuard(candidate) > spec.ringGuard) continue;
        if (spec.ringGuardMass && cgfRingGuardMass(candidate) < spec.ringGuardMass) continue;
        if (spec.noStraight && cgfStraightHits(candidate) > 0) continue;
        const attempt = checkCourse(candidate);
        if (attempt.problems.length) continue;
        /* Ask for a wide basin: a keyboard player re-issues the shot in 0.05
         * steps, so the answer must survive that quantisation. */
        if (attempt.shot.basin < 6) continue;
        course = candidate;
        report = attempt;
        usedSeed = seed;
      }
      if (!course) {
        console.log(id + ": NO VERIFIED COURSE");
        return;
      }
      const ride = fly(course, report.shot.angle, report.shot.power);
      console.log(id + ": " + course.wells.length + " wells, mass " + cgfMass(course) +
        ", basin " + report.shot.basin + "/25, one-shot at " + report.shot.angle.toFixed(3) + " / " + report.shot.power.toFixed(2) +
        ", ride " + ride.age.toFixed(2) + "s, ring guard " + Math.round(cgfRingGuard(course)) +
        " at mass " + cgfRingGuardMass(course) +
        ", straight hits " + cgfStraightHits(course) + " (seed " + usedSeed + ")");
      console.log(fmtCourse(course, stars[id]));
    });
  }
}

module.exports = { loadCourses, checkCourse, fly, forgeCourse, brief };

if (require.main === module) {
  main();
}
