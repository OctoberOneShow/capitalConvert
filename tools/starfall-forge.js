#!/usr/bin/env node
/* Starfall Lander sector forge + verifier.
 *
 * A sector is checked by landing it. This module re-implements the panel's
 * flight (same thrust, gravity, burn rate, safe gates, pad window) and flies a
 * small family of scripted pilots at it - the way the neon drift module's own
 * comment describes checking a course against many line variants. A sector
 * ships when one of those pilots touches down inside the pad window with fuel
 * on the gauge and a controlled descent, so the star bands are set from a
 * measured flight rather than a guess.
 *
 * Usage:
 *   node tools/starfall-forge.js list     # fly the shipped sectors
 *   node tools/starfall-forge.js forge    # print new verified sectors
 */
"use strict";

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "assets", "app", "game-starfall.js");

/* The engine's own constants, read off game-starfall.js. */
const LANT_WIDTH = 320;
const LANT_HEIGHT = 360;
const LANT_THRUST = 235;
const LANT_TURN = 2.6;
const LANT_SAFE_VY = 36;
const LANT_SAFE_VX = 28;
const LANT_SAFE_ANGLE = 0.5;
const LANT_BURN = 16;

function loadLevels() {
  const file = fs.readFileSync(FILE, "utf8");
  const start = file.indexOf("var lantLevels = [");
  if (start < 0) throw new Error("lantLevels not found");
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

function terrainY(level, x) {
  const points = level.terrain;
  if (x <= 0) return points[0][1];
  if (x >= LANT_WIDTH) return points[points.length - 1][1];
  for (let index = 1; index < points.length; index += 1) {
    if (x <= points[index][0] * LANT_WIDTH) {
      const x0 = points[index - 1][0] * LANT_WIDTH;
      const x1 = points[index][0] * LANT_WIDTH;
      const y0 = points[index - 1][1];
      const y1 = points[index][1];
      const f = (x - x0) / Math.max(x1 - x0, 1);
      return y0 + (y1 - y0) * f;
    }
  }
  return points[points.length - 1][1];
}
function onPad(level, x) {
  return x >= level.pad.x0 * LANT_WIDTH && x <= level.pad.x1 * LANT_WIDTH;
}

function clamp(lo, hi, v) {
  return Math.max(lo, Math.min(hi, v));
}

/* One pilot's settings. The knobs are the choices a hand makes: how hard to
 * lean, how early to flare, how deep to hold the crossing descent. */
function flySector(level, pilot, dt, trace) {
  const step = dt || 1 / 60;
  let x = 34;
  let y = 44;
  let vx = 14;
  let vy = 0;
  let angle = 0;
  let fuel = level.fuel;
  let time = 0;
  let thrustSeconds = 0;
  let maxSpeed = 0;
  let landing = null;
  const lean = pilot.lean;
  const padCentre = clamp(
    level.pad.x0 * LANT_WIDTH + 6,
    level.pad.x1 * LANT_WIDTH - 6,
    ((level.pad.x0 + level.pad.x1) / 2) * LANT_WIDTH,
  );
  const groundAtPad = terrainY(level, padCentre);
  const limit = 90;
  while (time < limit) {
    const ground = terrainY(level, x);
    const heightToFloor = ground - (y + 10);
    const brake = Math.max(20, Math.cos(lean) * LANT_THRUST - level.gravity);
    const ballistic = Math.sqrt(2 * brake * Math.max(0, heightToFloor - 4));
    const dx = Math.abs(padCentre - x);
    const crossing = dx > pilot.align;
    const timeToCross = dx / Math.max(14, Math.abs(vx));
    const mergeVy = (groundAtPad - y) / Math.max(0.4, timeToCross);
    let allowed = crossing
      ? Math.min(ballistic, Math.max(7, mergeVy))
      : ballistic;
    const aligned = onPad(level, x) && dx < pilot.align;
    if (aligned && heightToFloor < pilot.flareHeight) {
      /* Flare to a steady touchdown speed, never to zero: holding a zero descent over the last pixels is a hover, and a hover empties the gauge. */
      allowed = Math.max(6, pilot.flareVy);
    }
    const wantVx = clamp(-60, 60, (padCentre - x) * pilot.steer);
    const wantVy = clamp(-25, 400, allowed);
    const ax = (wantVx - vx) * 1.1;
    const ay = (wantVy - vy) * 1.1;
    let target = clamp(-lean, lean, Math.atan2(ax, -ay));
    if (aligned && heightToFloor < 70) target *= 0.35;
    angle += clamp(target - angle, -LANT_TURN * step, LANT_TURN * step);

    /* Burn for the vertical need only: steering costs a tilted nose, and a
     * pilot who burns for every lean climbs instead of descending. */
    const tx = Math.sin(angle) * LANT_THRUST;
    const ty = -Math.cos(angle) * LANT_THRUST;
    if (fuel > 0 && ay * ty > 0) {
      if (trace) {
        trace.push(
          "t " + time.toFixed(2) + "  x " + x.toFixed(1) + "  y " + y.toFixed(1) +
            "  ground " + ground.toFixed(0) + "  vy " + vy.toFixed(1) +
            "  vx " + vx.toFixed(1) + "  angle " + angle.toFixed(2) +
            "  allowed " + allowed.toFixed(1) + "  dx " + Math.abs(padCentre - x).toFixed(1) +
            "  aligned " + aligned,
        );
      }
      vx += tx * step;
      vy += ty * step;
      fuel = Math.max(0, fuel - LANT_BURN * step);
      thrustSeconds += step;
    }
    vy += level.gravity * step;
    x += vx * step;
    y += vy * step;
    maxSpeed = Math.max(maxSpeed, Math.hypot(vx, vy));
    if (x < 6) {
      x = 6;
      vx = Math.abs(vx) * 0.4;
    } else if (x > LANT_WIDTH - 6) {
      x = LANT_WIDTH - 6;
      vx = -Math.abs(vx) * 0.4;
    }
    if (y < 8) {
      y = 8;
      vy = Math.abs(vy) * 0.3;
    }
    time += step;
    if (y + 10 >= terrainY(level, x)) {
      const safe =
        onPad(level, x) &&
        vy < LANT_SAFE_VY &&
        vy > -LANT_SAFE_VY &&
        Math.abs(vx) < LANT_SAFE_VX &&
        Math.abs(angle) < LANT_SAFE_ANGLE;
      landing = {
        safe: safe,
        x: x,
        vy: vy,
        vx: vx,
        angle: angle,
        fuel: Math.max(0, Math.round(fuel)),
        time: Math.round(time * 10) / 10,
        thrust: Math.round(thrustSeconds * 10) / 10,
        speed: Math.round(maxSpeed),
      };
      break;
    }
  }
  return landing;
}

const PILOTS = [];
[0.4, 0.45, 0.5].forEach(function (lean) {
  [10, 16, 24, 34].forEach(function (align) {
    [26, 40, 55].forEach(function (flareHeight) {
      [9, 14, 20].forEach(function (flareVy) {
        [0.3, 0.45].forEach(function (steer) {
          PILOTS.push({ lean: lean, align: align, flareHeight: flareHeight, flareVy: flareVy, steer: steer });
        });
      });
    });
  });
});
/* A coarse subset for screening candidates: one in nine covers the spread of
 * the knobs, and a candidate that survives it still faces the full swarm. */
const QUICK = PILOTS.filter(function (_, index) {
  return index % 9 === 0;
});

/* Fly the pilots, keep the landing that leaves the most fuel behind: that is
 * the line a good hand would fly. `pool` lets a caller screen coarsely. */
function bestLanding(level, pool) {
  const set = pool || PILOTS;
  let best = null;
  set.forEach(function (pilot) {
    const landing = flySector(level, pilot);
    if (!landing || !landing.safe) return;
    if (!best || landing.fuel > best.fuel) {
      best = landing;
      best.pilot = pilot;
    }
  });
  return best;
}

function checkLevel(level) {
  const problems = [];
  [level.pad.y, level.terrain[0][1], level.terrain[level.terrain.length - 1][1]].forEach(function (y) {
    if (y < 0 || y > LANT_HEIGHT - 20) problems.push("terrain or pad sits off the sky");
  });
  if (level.pad.x1 <= level.pad.x0) problems.push("pad has no width");
  if (level.pad.x0 < 0 || level.pad.x1 > 1) problems.push("pad sits outside the field");
  const padYs = [];
  for (let fx = level.pad.x0; fx <= level.pad.x1; fx += 0.02) {
    padYs.push(terrainY(level, fx * LANT_WIDTH));
  }
  const ridge = Math.max.apply(null, padYs);
  const trough = Math.min.apply(null, padYs);
  if (ridge > LANT_HEIGHT - 30 || trough < 150) {
    problems.push("the pad window sits off the reachable ground");
  }
  const best = bestLanding(level);
  if (!best) {
    /* Report the closest attempt so a failure says why. */
    const near = QUICK.map(function (pilot) {
      return flySector(level, pilot);
    }).filter(Boolean);
    const worst = near.length ? near[0] : null;
    problems.push(
      worst
        ? "no pilot lands inside the window (closest at x " + Math.round(worst.x) +
          ", vy " + worst.vy.toFixed(1) + ", vx " + worst.vx.toFixed(1) + ")"
        : "no pilot reaches the ground",
    );
  }
  return { problems: problems, landing: best };
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

/* Lay a sector: a ridge spine with one low shelf cut into it for the pad, so
 * a craft descending from the spawn settles into the window instead of having
 * to fly over a step. Lowest ground wins the window. */
function forgeSector(spec, seed) {
  const rng = mulberry(seed);
  const points = spec.points;
  const spine = [];
  for (let i = 0; i < points; i += 1) {
    spine.push({ fx: i / (points - 1), y: Math.round(235 + rng() * 85) });
  }
  /* The pad shelf goes at the lowest ground of the interior: everything around
   * it is higher, so the approach is always downhill. */
  let at = 1;
  let lowest = -Infinity;
  for (let i = 1; i < spine.length - 1; i += 1) {
    if (spine[i].y > lowest) {
      lowest = spine[i].y;
      at = i;
    }
  }
  const half = 0.07 + rng() * 0.06;
  const padY = spine[at].y;
  const x0 = clamp(0.08, 0.92 - half * 2, spine[at].fx - half);
  spine[at] = { fx: x0, y: padY };
  spine.splice(at + 1, 0, { fx: x0 + half * 2, y: padY });
  /* Neighbours stand just proud of the shelf, the way the shipped sectors do:
   * the window is the lowest ground on the field, but only by a few units, so
   * a craft descending from the spawn settles into it instead of climbing. */
  spine[at + 2].y = Math.min(spine[at + 2].y, padY) - Math.round(4 + rng() * 10);
  spine[at - 1].y = Math.min(spine[at - 1].y, padY) - Math.round(4 + rng() * 10);
  spine.sort(function (a, b) {
    return a.fx - b.fx;
  });
  /* The field ends sit a little proud as well, so neither wall of the sky is
   * a landing hazard. */
  spine[0] = { fx: 0, y: Math.min(spine[0].y, padY - 6) };
  spine[spine.length - 1] = { fx: 1, y: Math.min(spine[spine.length - 1].y, padY - 6) };
  const terrain = spine.map(function (point) {
    return [point.fx, point.y];
  });
  return {
    id: spec.id,
    labelKey: spec.labelKey,
    gravity: spec.gravity,
    fuel: spec.fuel,
    terrain: terrain,
    pad: { x0: x0 + 0.015, x1: x0 + half * 2 - 0.015, y: padY },
    starFuel: [0, 0, 0],
  };
}

function fmtLevel(level, stars) {
  const terrain = level.terrain.map(function (point) {
    return "[" + point[0].toFixed(3) + ", " + point[1] + "]";
  });
  return [
    "    {",
    '      id: "' + level.id + '", labelKey: "' + level.labelKey + '", gravity: ' + level.gravity + ", fuel: " + level.fuel + ",",
    "      terrain: [" + terrain.join(", ") + "],",
    "      pad: { x0: " + level.pad.x0.toFixed(3) + ", x1: " + level.pad.x1.toFixed(3) + ", y: " + level.pad.y + " },",
    "      starFuel: [" + stars.join(", ") + "],",
    "    },",
  ].join("\n");
}

function main() {
  const mode = process.argv[2] || "list";
  const levels = loadLevels();

  if (mode === "list") {
    let bad = 0;
    const t0 = Date.now();
    levels.forEach(function (level) {
      const report = checkLevel(level);
      if (report.problems.length) bad += 1;
      console.log(
        (report.problems.length ? "FAIL" : "ok  ") +
          "  " + level.id + "  g " + level.gravity + "  fuel " + level.fuel +
          (report.landing
            ? "  best landing vy " + report.landing.vy.toFixed(1) +
              " vx " + report.landing.vx.toFixed(1) +
              " in " + report.landing.time + "s with " + report.landing.fuel + "% left"
            : "") +
          (report.problems.length ? "  " + report.problems.join("; ") : ""),
      );
    });
    console.log(
      (bad ? bad + " sector(s) failed" : "all " + levels.length + " sectors land") +
        " in " + (Date.now() - t0) + "ms",
    );
    process.exit(bad ? 1 : 0);
  }

  if (mode === "forge") {
    const ids = process.argv.slice(3);
    const brief = {};
    for (let i = 11; i <= 20; i += 1) {
      brief["s" + i] = {
        id: "s" + i,
        labelKey: "lantL" + i,
        gravity: 127 + (i - 11) * 3,
        fuel: 76 - Math.round((i - 11) * 0.9),
        points: i < 14 ? 5 : i < 17 ? 6 : 7,
        bump: (i - 10) * 37,
        need: 8,
      };
    }
    /* The summit tier's shipped shapes (s21-s24) are hand-laid - decoy
     * basin, slot canyon, mesa, wedge - and proven through checkLevel in
     * list mode; the brief only carries the tier's tank and gravity walk,
     * and the generator still offers its generic ridge-and-shelf take. */
    for (let i = 21; i <= 24; i += 1) {
      brief["s" + i] = {
        id: "s" + i,
        labelKey: "lantL" + i,
        gravity: 154 + (i - 20) * 4,
        fuel: 68 - (i - 20),
        points: i < 22 ? 9 : i < 24 ? 8 : 11,
        bump: (i - 10) * 37,
        need: 8,
      };
    }
    /* The last ridge tier (s25-s30) ships hand-laid the same way - false
     * terrace, saddle, stitch, eave, causeway, last inch - and its brief
     * carries the flattened gravity walk (171-176) and the draining tank
     * (63-58) the tier comment in game-starfall.js commits to. */
    for (let i = 25; i <= 30; i += 1) {
      brief["s" + i] = {
        id: "s" + i,
        labelKey: "lantL" + i,
        gravity: 170 + (i - 24),
        fuel: 64 - (i - 24),
        points: i < 28 ? 10 : 11,
        bump: (i - 10) * 37,
        need: 8,
      };
    }
    /* The chasm tier (s31-s40) ships hand-laid the same way - hairline,
     * comb, sink, tower, sliver, saw, brink, thread, chasm, pinpoint -
     * and its brief carries the resumed gravity walk (177-186) and the
     * shallow tank drain (57 down to 52) the tier comment commits to; the
     * pull's own burn bill is why the walk flattens, not a guessed one. */
    const lantChasmTank = [57, 57, 57, 56, 56, 55, 54, 54, 53, 52];
    for (let i = 31; i <= 40; i += 1) {
      brief["s" + i] = {
        id: "s" + i,
        labelKey: "lantL" + i,
        gravity: 176 + (i - 30),
        fuel: lantChasmTank[i - 31],
        points: 12,
        bump: (i - 10) * 37,
        need: 8,
      };
    }
    (ids.length ? ids : Object.keys(brief)).forEach(function (id) {
      const spec = brief[id];
      let level = null;
      let landing = null;
      for (let seed = 1; seed <= 150 && !level; seed += 1) {
        const candidate = forgeSector(spec, seed * 7919 + spec.points * 131 + spec.bump * 104729);
        const quick = bestLanding(candidate, QUICK);
        if (!quick || quick.fuel < 14) continue;
        const full = bestLanding(candidate, PILOTS);
        if (!full || full.fuel < (spec.need || 12)) continue;
        if (checkLevel(candidate).problems.length) continue;
        level = candidate;
        landing = full;
      }
      if (!level) {
        console.log(id + ": NO VERIFIED SECTOR");
        return;
      }
      const fuel = landing.fuel;
      const stars = [
        Math.max(6, Math.round(fuel * 0.62)),
        Math.max(4, Math.round(fuel * 0.42)),
        Math.max(2, Math.round(fuel * 0.22)),
      ];
      console.log(
        id + ": g " + level.gravity + ", fuel " + level.fuel + ", best landing with " +
          fuel + "% left in " + landing.time + "s -> stars " + stars.join("/"),
      );
      console.log(fmtLevel(level, stars));
    });
  }
}

module.exports = { loadLevels, checkLevel, flySector, forgeSector, bestLanding, terrainY, PILOTS };

if (require.main === module) {
  main();
}
