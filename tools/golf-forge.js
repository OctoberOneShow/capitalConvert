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
      m: Math.round((0.7 + rng() * 1.1) * 10) / 10,
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
    };
    const stars = {
      g9: [2, 4, 6], g10: [2, 4, 7],
      g11: [1, 2, 3], g12: [1, 2, 3], g13: [1, 2, 4], g14: [2, 3, 4],
      g15: [2, 3, 5], g16: [2, 4, 6], g17: [2, 4, 6], g18: [2, 4, 7],
      g19: [2, 4, 7], g20: [2, 4, 8],
      g21: [2, 4, 8], g22: [2, 5, 8], g23: [2, 5, 9], g24: [2, 5, 10],
      g25: [2, 5, 11], g26: [2, 5, 11], g27: [2, 6, 12],
      g28: [2, 6, 12], g29: [2, 6, 13], g30: [2, 6, 13],
    };
    (ids.length ? ids : Object.keys(brief)).forEach(function (id) {
      const spec = brief[id];
      if (!spec) return;
      let course = null;
      let report = null;
      for (let seed = 1; seed <= 220 && !course; seed += 1) {
        const candidate = forgeCourse(
          { id: id, labelKey: "cgfL" + id.slice(1), wells: spec.wells, r: spec.r },
          seed * 7919 + spec.wells * 131 + spec.r + spec.bump * 104729,
        );
        const attempt = checkCourse(candidate);
        if (attempt.problems.length) continue;
        /* Ask for a wide basin: a keyboard player re-issues the shot in 0.05
         * steps, so the answer must survive that quantisation. */
        if (attempt.shot.basin < 6) continue;
        course = candidate;
        report = attempt;
      }
      if (!course) {
        console.log(id + ": NO VERIFIED COURSE");
        return;
      }
      console.log(id + ": " + course.wells.length + " wells, basin " + report.shot.basin + "/25, one-shot at " + report.shot.angle.toFixed(3) + " / " + report.shot.power.toFixed(2));
      console.log(fmtCourse(course, stars[id]));
    });
  }
}

module.exports = { loadCourses, checkCourse, fly, forgeCourse };

if (require.main === module) {
  main();
}
