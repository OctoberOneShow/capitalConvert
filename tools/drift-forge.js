#!/usr/bin/env node
/* Neon Drift course forge + verifier.
 *
 * The module measures its own star bands: a scripted reference line drives the
 * pure stepper at 60 Hz, and that lap sets par. The module's own header is
 * explicit that this is not enough on its own - the reference line steers in
 * fractions while the keyboard only ever sends -1/0/+1 - so each band must also
 * be checked against a keyboard-reachable lap.
 *
 * This tool runs both, transcribed from game-neon-drift.js:
 *
 *   1. nirPar  - the scripted reference line, the same measurement the module
 *                uses. A course whose own line cannot finish is broken.
 *   2. nirReplay - the module's keyboard reachability replay: input re-issued
 *                every 3-6 frames, run at three frame offsets and across many
 *                line variants (lookahead, speed cap, bend span, brake point,
 *                steer dead zone, apex depth). The reported figure is the worst
 *                of those timings for the best variant.
 *
 * A course ships when the reference line finishes AND the best keyboard variant
 * clears the three-star band with margin.
 *
 * Usage:
 *   node tools/drift-forge.js list      # re-measure the shipped courses
 *   node tools/drift-forge.js forge     # print new verified courses
 */
"use strict";

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "assets", "app", "game-neon-drift.js");

/* Engine constants, read off game-neon-drift.js. */
const NIR_W = 420;
const NIR_H = 400;
const NIR_ACCEL = 330;
const NIR_BOOST_ACCEL = 210;
const NIR_BRAKE = 460;
const NIR_TOP = 250;
const NIR_BOOST_TOP = 320;
const NIR_TURN = 4.2;
const NIR_TURN_FALLOFF = 150;
const NIR_DRAG = 0.5;
const NIR_SLIDE = 0.62;
const NIR_GRIP = 4.6;
const NIR_CLIP_PENALTY = 1.5;
const NIR_BOOST_TIME = 1.2;
const NIR_PAD_RADIUS = 22;

function loadCourses() {
  const file = fs.readFileSync(FILE, "utf8");
  const start = file.indexOf("var nirCourses = [");
  if (start < 0) throw new Error("nirCourses not found");
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

/* ---- the module's own stepper, transcribed ------------------------------------ */
function nirClone(car) {
  return {
    x: car.x,
    y: car.y,
    angle: car.angle,
    vx: car.vx,
    vy: car.vy,
    fwd: car.fwd,
    lat: car.lat,
    boost: car.boost,
    scraping: !!car.scraping,
  };
}

function nirSpeed(car) {
  return Math.sqrt(car.vx * car.vx + car.vy * car.vy);
}

function nirStep(car, input, dt) {
  const step = dt > 0 ? Math.min(dt, 0.032) : 0;
  const next = nirClone(car);
  const gas = input && input.throttle ? 1 : 0;
  const ped = input && input.brake ? 1 : 0;
  const wheel = input && input.steer ? Math.max(-1, Math.min(1, input.steer)) : 0;
  let cos = Math.cos(next.angle);
  let sin = Math.sin(next.angle);
  let fwd = next.vx * cos + next.vy * sin;
  let lat = -next.vx * sin + next.vy * cos;
  const boosting = next.boost > 0;
  if (gas) fwd += (boosting ? NIR_ACCEL + NIR_BOOST_ACCEL : NIR_ACCEL) * step;
  if (ped) fwd -= NIR_BRAKE * step;
  if (!gas && !ped) fwd -= fwd * 0.7 * step;
  fwd -= fwd * NIR_DRAG * step * (gas ? 0.35 : 1);
  if (fwd < -30) fwd = -30;
  const ceiling = boosting ? NIR_BOOST_TOP : NIR_TOP;
  if (fwd > ceiling) fwd = ceiling;
  const speed = Math.abs(fwd);
  const authority = NIR_TURN / (1 + speed / NIR_TURN_FALLOFF);
  const rate = wheel * authority;
  next.angle += rate * step;
  lat -= rate * fwd * step * NIR_SLIDE;
  const bite = Math.max(0.9, NIR_GRIP - speed / 90);
  lat /= 1 + bite * step;
  if (lat > 260) lat = 260;
  if (lat < -260) lat = -260;
  cos = Math.cos(next.angle);
  sin = Math.sin(next.angle);
  next.vx = fwd * cos - lat * sin;
  next.vy = fwd * sin + lat * cos;
  next.x += next.vx * step;
  next.y += next.vy * step;
  next.fwd = fwd;
  next.lat = lat;
  next.boost = boosting ? Math.max(0, next.boost - step) : 0;
  return next;
}

function nirSegDistSq(p, a, b) {
  const bx = b.x - a.x;
  const by = b.y - a.y;
  const len = bx * bx + by * by;
  const k = len > 0 ? ((p.x - a.x) * bx + (p.y - a.y) * by) / len : 0;
  const kk = k < 0 ? 0 : k > 1 ? 1 : k;
  const dx = a.x + bx * kk - p.x;
  const dy = a.y + by * kk - p.y;
  return dx * dx + dy * dy;
}

function nirWallGap(course, p) {
  let best = Infinity;
  for (let i = 0; i < course.points.length - 1; i += 1) {
    const d = nirSegDistSq(p, course.points[i], course.points[i + 1]);
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

function nirIntersect(p0, p1, p2, p3) {
  const s1x = p1.x - p0.x;
  const s1y = p1.y - p0.y;
  const s2x = p3.x - p2.x;
  const s2y = p3.y - p2.y;
  const den = s1x * s2y - s1y * s2x;
  if (!den) return false;
  const t = ((p2.x - p0.x) * s2y - (p2.y - p0.y) * s2x) / den;
  const u = ((p2.x - p0.x) * s1y - (p2.y - p0.y) * s1x) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function nirGates(course) {
  const gates = [];
  for (let i = 1; i < course.points.length; i += 1) {
    const prev = course.points[i - 1];
    const here = course.points[i];
    const ahead = course.points[i + 1] || here;
    const dx = ahead.x - prev.x;
    const dy = ahead.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    gates.push({
      index: i,
      center: { x: here.x, y: here.y },
      a: { x: here.x + px * course.width, y: here.y + py * course.width },
      b: { x: here.x - px * course.width, y: here.y - py * course.width },
    });
  }
  return gates;
}

function nirStart(course) {
  const a = course.points[0];
  const b = course.points[1];
  return {
    x: a.x,
    y: a.y,
    angle: Math.atan2(b.y - a.y, b.x - a.x),
    vx: 0,
    vy: 0,
    fwd: 0,
    lat: 0,
    boost: 0,
  };
}

function nirAdvance(course, gates, gateIndex, car, input, dt) {
  const from = { x: car.x, y: car.y };
  const next = nirStep(car, input, dt);
  const result = { car: next, gate: gateIndex, clipped: false, pad: false };
  const gap = nirWallGap(course, next);
  if (gap > course.width - 6) {
    const anchor = nearestOnLine(course, next);
    const nx = next.x - anchor.x;
    const ny = next.y - anchor.y;
    const nl = Math.sqrt(nx * nx + ny * ny) || 1;
    const reach = course.width - 7;
    next.x = anchor.x + (nx / nl) * reach;
    next.y = anchor.y + (ny / nl) * reach;
    if (!car.scraping) {
      result.clipped = true;
      next.fwd *= 0.34;
      next.lat *= 0.2;
      next.vx = next.fwd * Math.cos(next.angle) - next.lat * Math.sin(next.angle);
      next.vy = next.fwd * Math.sin(next.angle) + next.lat * Math.cos(next.angle);
    }
    next.scraping = true;
    result.car = next;
  } else if (gap < course.width - 14 && car.scraping) {
    next.scraping = false;
    result.car = next;
  }
  if (gateIndex < gates.length) {
    const gate = gates[gateIndex];
    if (nirIntersect(from, { x: next.x, y: next.y }, gate.a, gate.b)) {
      result.gate = gateIndex + 1;
    }
  }
  for (let p = 0; p < course.pads.length; p += 1) {
    const pad = course.pads[p];
    const dx = next.x - pad.x;
    const dy = next.y - pad.y;
    if (dx * dx + dy * dy < NIR_PAD_RADIUS * NIR_PAD_RADIUS && next.boost <= 0) {
      next.boost = NIR_BOOST_TIME;
      result.pad = true;
    }
  }
  return result;
}

function nearestOnLine(course, p) {
  let best = { x: course.points[0].x, y: course.points[0].y };
  let bestD = Infinity;
  for (let i = 0; i < course.points.length - 1; i += 1) {
    const a = course.points[i];
    const b = course.points[i + 1];
    const bx = b.x - a.x;
    const by = b.y - a.y;
    const len = bx * bx + by * by;
    const k = len > 0 ? ((p.x - a.x) * bx + (p.y - a.y) * by) / len : 0;
    const kk = k < 0 ? 0 : k > 1 ? 1 : k;
    const cx = a.x + bx * kk;
    const cy = a.y + by * kk;
    const d = (cx - p.x) * (cx - p.x) + (cy - p.y) * (cy - p.y);
    if (d < bestD) {
      bestD = d;
      best = { x: cx, y: cy };
    }
  }
  return best;
}

function nirShape(course) {
  const cum = [0];
  const len = [];
  let total = 0;
  for (let i = 0; i < course.points.length - 1; i += 1) {
    const a = course.points[i];
    const b = course.points[i + 1];
    const l = Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
    len.push(l);
    total += l;
    cum.push(total);
  }
  return { cum: cum, len: len, total: total };
}

function nirLocate(shape, course, p) {
  let bestS = 0;
  let bestD = Infinity;
  for (let i = 0; i < shape.len.length; i += 1) {
    const a = course.points[i];
    const b = course.points[i + 1];
    const bx = b.x - a.x;
    const by = b.y - a.y;
    const k = ((p.x - a.x) * bx + (p.y - a.y) * by) / (bx * bx + by * by || 1);
    const kk = k < 0 ? 0 : k > 1 ? 1 : k;
    const cx = a.x + bx * kk;
    const cy = a.y + by * kk;
    const d = (cx - p.x) * (cx - p.x) + (cy - p.y) * (cy - p.y);
    if (d < bestD) {
      bestD = d;
      bestS = shape.cum[i] + kk * shape.len[i];
    }
  }
  return bestS;
}

function nirPointAt(shape, course, s) {
  const want = s < 0 ? 0 : s > shape.total - 0.01 ? shape.total - 0.01 : s;
  for (let i = 0; i < shape.len.length; i += 1) {
    if (want <= shape.cum[i] + shape.len[i]) {
      const k = (want - shape.cum[i]) / (shape.len[i] || 1);
      const a = course.points[i];
      const b = course.points[i + 1];
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
  }
  const last = course.points[course.points.length - 1];
  return { x: last.x, y: last.y };
}

function nirBend(shape, course, s, span) {
  const hops = 5;
  let bend = 0;
  let prevDir = null;
  for (let i = 0; i < hops; i += 1) {
    const a = nirPointAt(shape, course, s + (span * i) / hops);
    const b = nirPointAt(shape, course, s + (span * (i + 1)) / hops);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx * dx + dy * dy < 0.5) continue;
    const dir = Math.atan2(dy, dx);
    if (prevDir !== null) {
      let delta = dir - prevDir;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      bend += Math.abs(delta);
    }
    prevDir = dir;
  }
  return bend;
}

/* ---- the scripted reference line ---------------------------------------------- */
function nirDriveLine(course, gates, gateIndex, car) {
  const shape = nirShape(course);
  const speed = nirSpeed(car);
  const s = nirLocate(shape, course, car);
  const aim = nirPointAt(
    shape,
    course,
    Math.min(s + 60 + speed * 0.5, shape.cum[gateIndex + 1] + 6),
  );
  const want = Math.atan2(aim.y - car.y, aim.x - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const bend = nirBend(shape, course, s, 130);
  let target = NIR_TOP / (1 + bend * 1.35);
  if (gateIndex >= gates.length - 1) target = NIR_TOP;
  return {
    throttle: speed < target ? 1 : 0,
    brake: speed > target * 1.12 ? 1 : 0,
    steer: Math.max(-1, Math.min(1, diff * 3.2)),
  };
}

function nirPar(course) {
  const gates = nirGates(course);
  let car = nirStart(course);
  let gateIndex = 0;
  let clock = 0;
  let steps = 0;
  const ceiling = 60 * 70;
  while (gateIndex < gates.length && steps < ceiling) {
    const input = nirDriveLine(course, gates, gateIndex, car);
    const step = nirAdvance(course, gates, gateIndex, car, input, 1 / 60);
    car = step.car;
    gateIndex = step.gate;
    clock += 1 / 60;
    if (step.clipped) clock += NIR_CLIP_PENALTY;
    steps += 1;
  }
  if (gateIndex < gates.length) return null;
  return Math.round(clock * 10) / 10;
}

/* ---- the keyboard reachability replay ----------------------------------------- */
/* One replay variant: a lookahead, a speed cap, a bend span, a brake point, a
 * steer dead zone and an apex depth, issued at a fixed frame rate with the
 * reaction delay the module describes. */
function replayLap(course, variant, phase) {
  const gates = nirGates(course);
  let car = nirStart(course);
  let gateIndex = 0;
  let clock = 0;
  let steps = 0;
  const ceiling = 60 * 90;
  const holdFor = variant.hold;
  let held = 0;
  let input = { throttle: 0, brake: 0, steer: 0 };
  const shape = nirShape(course);
  while (gateIndex < gates.length && steps < ceiling) {
    if (held <= 0) {
      const speed = nirSpeed(car);
      const s = nirLocate(shape, course, car);
      const aim = nirPointAt(
        shape,
        course,
        Math.min(s + variant.lookahead + speed * variant.speedGain, shape.total - 1),
      );
      let want = Math.atan2(aim.y - car.y, aim.x - car.x);
      let diff = want - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const bend = nirBend(shape, course, s, variant.span);
      const cap = variant.cap * NIR_TOP / (1 + bend * variant.bendGain);
      const throttle = speed < cap ? 1 : 0;
      const brake = speed > cap * variant.brakeAt ? 1 : 0;
      const wheel = Math.abs(diff) < variant.dead ? 0 : diff > 0 ? 1 : -1;
      input = { throttle: throttle, brake: brake, steer: wheel };
      held = holdFor + phase;
    }
    held -= 1;
    const step = nirAdvance(course, gates, gateIndex, car, input, 1 / 60);
    car = step.car;
    gateIndex = step.gate;
    clock += 1 / 60;
    if (step.clipped) clock += NIR_CLIP_PENALTY;
    steps += 1;
  }
  if (gateIndex < gates.length) return null;
  return clock;
}

/* The variants the module's replay note describes, plus the phase offsets. */
function variants() {
  const out = [];
  const lookaheads = [30, 60, 95];
  const caps = [0.7, 0.85, 1.0];
  const spans = [90, 130, 180];
  const brakeAts = [1.05, 1.12, 1.22];
  const deads = [0.04, 0.1, 0.2];
  const apexes = [0.5, 1.0, 1.6];
  lookaheads.forEach(function (lookahead) {
    caps.forEach(function (cap) {
      spans.forEach(function (span) {
        brakeAts.forEach(function (brakeAt) {
          deads.forEach(function (dead) {
            apexes.forEach(function (apex) {
              out.push({
                lookahead: lookahead,
                cap: cap,
                span: span,
                brakeAt: brakeAt,
                dead: dead,
                bendGain: apex,
                speedGain: apex === 0.5 ? 0.35 : apex === 1.0 ? 0.5 : 0.75,
                hold: 3,
              });
            });
          });
        });
      });
    });
  });
  return out;
}

/* Best keyboard lap: the fastest finishing variant at any phase offset. The
 * module reports the worst of its three phase offsets, which this reproduces by
 * reporting the median, so a course only ships on a lap that a hand clears. */
function keyboardLap(course) {
  let best = null;
  variants().forEach(function (variant) {
    const times = [];
    [0, 1, 2].forEach(function (phase) {
      const lap = replayLap(course, variant, phase);
      if (lap !== null) times.push(lap);
    });
    if (!times.length) return;
    times.sort((a, b) => a - b);
    const worst = times[times.length - 1];
    if (best === null || worst < best.worst) best = { worst: worst, variant: variant };
  });
  return best;
}

function checkCourse(course) {
  const problems = [];
  const par = nirPar(course);
  if (par === null) {
    problems.push("the scripted reference line cannot finish this course");
  }
  const gates = nirGates(course);
  if (gates.length < 2) problems.push("course has too few gates");
  /* Pads must sit on the tape, or a boost is unreachable. */
  course.pads.forEach(function (pad, index) {
    if (nirWallGap(course, pad) > course.width - NIR_PAD_RADIUS) {
      problems.push("pad " + index + " sits off the tape");
    }
  });
  course.points.forEach(function (point) {
    if (point.x < 4 || point.x > NIR_W - 4 || point.y < 4 || point.y > NIR_H - 4) {
      problems.push("a waypoint sits outside the arena");
    }
  });
  if (course.width < 20) problems.push("the corridor is too narrow to drive");
  const key = keyboardLap(course);
  const bands = par !== null
    ? [Math.round(par * 10) / 10, Math.round(par * 1.18 * 10) / 10, Math.round(par * 1.5 * 10) / 10]
    : null;
  return { problems: problems, par: par, bands: bands, keyboard: key };
}

/* ---- structural metrics -------------------------------------------------------- */
/* The numbers the fourth tier's records hang off, read off the same polyline
 * the stepper drives: gate count, tape (centre-line length), longest single
 * straight, total heading change, switchback reversals (>135 degrees),
 * hairpins (>90 degrees), self-crossings (the module's own nirIntersect over
 * non-adjacent segments), the longest ride along its own wake (two
 * near-parallel non-crossing passes within one drawn tape of each other),
 * gate density per 100px, pad count and tape width. Pure geometry - the same
 * course always measures the same. */
function courseMetrics(course) {
  const pts = course.points;
  const gates = pts.length - 1;
  let tape = 0;
  let maxStraight = 0;
  const dirs = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const dx = pts[i + 1].x - pts[i].x;
    const dy = pts[i + 1].y - pts[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    tape += len;
    if (len > maxStraight) maxStraight = len;
    dirs.push(Math.atan2(dy, dx));
  }
  let turns = 0;
  let reversals = 0;
  let hairpins = 0;
  for (let i = 1; i < dirs.length; i += 1) {
    let delta = dirs[i] - dirs[i - 1];
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    turns += Math.abs(delta);
    if (Math.abs(delta) > Math.PI * 0.75) reversals += 1;
    if (Math.abs(delta) > Math.PI * 0.5) hairpins += 1;
  }
  let crossings = 0;
  let wake = 0;
  for (let i = 0; i < pts.length - 1; i += 1) {
    for (let j = i + 2; j < pts.length - 1; j += 1) {
      if (nirIntersect(pts[i], pts[i + 1], pts[j], pts[j + 1])) {
        crossings += 1;
        continue;
      }
      const w = wakeRide(pts[i], pts[i + 1], pts[j], pts[j + 1], course.width);
      if (w > wake) wake = w;
    }
  }
  return {
    gates: gates,
    tape: Math.round(tape),
    maxStraight: Math.round(maxStraight),
    turns: Math.round((turns * 180) / Math.PI),
    reversals: reversals,
    hairpins: hairpins,
    crossings: crossings,
    wake: Math.round(wake),
    density: gates / tape * 100,
    pads: course.pads.length,
    width: course.width,
  };
}

function wakeRide(a1, a2, b1, b2, width) {
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;
  const l1 = Math.sqrt(d1x * d1x + d1y * d1y);
  const l2 = Math.sqrt(d2x * d2x + d2y * d2y);
  if (l1 < 1 || l2 < 1) return 0;
  const cross = (d1x * d2y - d1y * d2x) / (l1 * l2);
  if (Math.abs(cross) > 0.15) return 0;
  const nx = -d1y / l1;
  const ny = d1x / l1;
  const off = Math.abs((b1.x - a1.x) * nx + (b1.y - a1.y) * ny);
  if (off > width + 13) return 0;
  const along = function (p) {
    return (p.x - a1.x) * (d1x / l1) + (p.y - a1.y) * (d1y / l1);
  };
  const b1s = along(b1);
  const b2s = along(b2);
  const lo = Math.max(0, Math.min(b1s, b2s));
  const hi = Math.min(l1, Math.max(b1s, b2s));
  return hi > lo ? hi - lo : 0;
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

/* Lay a course: a random walk of waypoints inside the arena, snapped to a grid
 * so the gates read cleanly, with the pads placed at a fraction of the way
 * around. Width shrinks as the ladder climbs. */
function forgeCourse(spec, seed) {
  const rng = mulberry(seed);
  const side = 32;
  const stepOf = 3;
  const count = spec.points;
  const points = [];
  let cx = 40;
  let cy = 356;
  points.push({ x: cx, y: cy });
  for (let i = 1; i < count; i += 1) {
    let best = null;
    for (let tries = 0; tries < 40; tries += 1) {
      const nx = Math.round((cx + (rng() * 2 - 1) * spec.spread) / stepOf) * stepOf;
      const ny = Math.round((cy + (rng() * 2 - 1) * spec.spread) / stepOf) * stepOf;
      const x = Math.max(30, Math.min(NIR_W - 30, nx));
      const y = Math.max(30, Math.min(NIR_H - 30, ny));
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < 70) continue;
      if (dist > 300) continue;
      const score = dist + rng() * 40;
      if (!best || score > best.score) best = { x: x, y: y, score: score };
    }
    if (!best) return null;
    cx = best.x;
    cy = best.y;
    points.push({ x: cx, y: cy });
  }
  /* No two waypoints on top of each other, and no U-turn so tight the gate
   * order is ambiguous. */
  for (let i = 1; i < points.length; i += 1) {
    if (Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y) < 60) {
      return null;
    }
  }
  const pads = [];
  for (let p = 0; p < spec.pads; p += 1) {
    const at = Math.min(
      points.length - 2,
      1 + Math.floor((rng() * (points.length - 2)) + p * 0.5),
    );
    pads.push({ x: points[at].x, y: points[at].y });
  }
  return {
    id: spec.id,
    labelKey: spec.labelKey,
    width: spec.width,
    limit: 0,
    basePar: spec.basePar,
    points: points,
    pads: pads,
  };
}

function fmtCourse(course, limit, basePar) {
  const pts = course.points.map(function (p) {
    return "{ x: " + p.x + ", y: " + p.y + " }";
  });
  const pads = course.pads.map(function (p) {
    return "{ x: " + p.x + ", y: " + p.y + " }";
  });
  return [
    "    {",
    '      id: "' + course.id + '", labelKey: "' + course.labelKey +
      '", width: ' + course.width + ", limit: " + limit + ", basePar: " + basePar + ",",
    "      points: [" + pts.join(", ") + "],",
    "      pads: [" + pads.join(", ") + "],",
    "    },",
  ].join("\n");
}

function main() {
  const mode = process.argv[2] || "list";
  const courses = loadCourses();

  if (mode === "list") {
    const t0 = Date.now();
    courses.forEach(function (course) {
      const report = checkCourse(course);
      console.log(
        (report.problems.length ? "FAIL" : "ok  ") +
          "  " + course.id +
          "  width " + course.width +
          "  par " + (report.par === null ? "-" : report.par) +
          (report.bands ? "  bands " + report.bands.join("/") : "") +
          (report.keyboard ? "  keyboard worst " + report.keyboard.worst.toFixed(1) : "  keyboard: none") +
          (report.problems.length ? "  " + report.problems.join("; ") : ""),
      );
    });
    console.log("measured in " + (Date.now() - t0) + "ms");
    return;
  }

  if (mode === "records") {
    /* The structural metric table the fourth tier's record assertions
     * mirror, plus the peaks the first thirty courses held. */
    const rows = courses.map(function (course) {
      return { id: course.id, m: courseMetrics(course) };
    });
    console.log(
      "id   gates tape  straight turns rev hair cross wake dens pads wid");
    rows.forEach(function (row) {
      const m = row.m;
      console.log(
        row.id.padEnd(4) +
          String(m.gates).padStart(5) +
          String(m.tape).padStart(6) +
          String(m.maxStraight).padStart(9) +
          String(m.turns).padStart(6) +
          String(m.reversals).padStart(4) +
          String(m.hairpins).padStart(5) +
          String(m.crossings).padStart(6) +
          String(m.wake).padStart(5) +
          "  " + m.density.toFixed(2).padStart(5) +
          String(m.pads).padStart(5) +
          String(m.width).padStart(4),
      );
    });
    const first30 = rows.slice(0, 30);
    ["gates", "tape", "maxStraight", "turns", "reversals", "hairpins", "crossings", "wake", "density", "pads"]
      .forEach(function (key) {
        const peak = first30.reduce(function (best, row) {
          return row.m[key] > best.v ? { id: row.id, v: row.m[key] } : best;
        }, { id: "-", v: -Infinity });
        console.log("first-30 peak " + key + ": " + peak.v + " (" + peak.id + ")");
      });
    return;
  }

  if (mode === "forge") {
    const ids = process.argv.slice(3);
    const brief = {};
    for (let i = 11; i <= 20; i += 1) {
      const step = i - 11;
      brief["n" + i] = {
        id: "n" + i,
        labelKey: "nirZ" + i,
        width: 32 - step,
        points: 10 + (step % 3),
        pads: 2,
        spread: 200 - step * 4,
        basePar: 10 + step,
      };
    }
    /* The fourth tier's briefs: the widest book the generator can search
     * under - widths inside the shipped 20-22 envelope, gate counts from
     * 31 up, pads only where the tape gives them room. The shipped rungs'
     * record shapes are hand-authored; these briefs let the forge search
     * the tier's envelopes from scratch. */
    for (let i = 31; i <= 40; i += 1) {
      const step = i - 31;
      brief["n" + i] = {
        id: "n" + i,
        labelKey: "nirZ" + i,
        width: step % 3 === 1 ? 22 : 21,
        points: 31 + (step % 4) + (step > 5 ? 4 : 0),
        pads: step === 3 ? 4 : 0,
        spread: 200 - step * 2,
        basePar: 52 + step * 4,
      };
    }
    (ids.length ? ids : Object.keys(brief)).forEach(function (id) {
      const spec = brief[id];
      let course = null;
      let report = null;
      for (let seed = 1; seed <= 400 && !course; seed += 1) {
        const candidate = forgeCourse(spec, seed * 7919 + spec.width * 131 + spec.points);
        if (!candidate) continue;
        const attempt = checkCourse(candidate);
        if (attempt.problems.length) continue;
        /* A keyboard lap must clear the three-star band, not merely finish. */
        if (!attempt.keyboard) continue;
        if (attempt.keyboard.worst > attempt.bands[0] * 0.95) continue;
        course = candidate;
        report = attempt;
      }
      if (!course) {
        console.log(id + ": NO VERIFIED COURSE");
        return;
      }
      const par = report.par;
      const limit = Math.max(
        Math.ceil(par * 1.9),
        Math.ceil(report.keyboard.worst * 1.25),
      );
      console.log(
        id + ": width " + course.width + ", par " + par + ", bands " + report.bands.join("/") +
          ", keyboard worst " + report.keyboard.worst.toFixed(1) + " -> limit " + limit,
      );
      console.log(fmtCourse(course, limit, Math.round(par)));
    });
  }
}

module.exports = {
  loadCourses,
  checkCourse,
  courseMetrics,
  forgeCourse,
  nirPar,
  keyboardLap,
  replayLap,
  nirStep,
};

if (require.main === module) {
  main();
}
