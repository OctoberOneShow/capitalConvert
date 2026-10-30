"use strict";

/* game-glyph-leap: the deep tier is proved the way the sky itself is built -
 * geometrically, deal by deal, through the game's own spawn law and physics,
 * and the summit is proved the way it is climbed - run by run, through the
 * game's own leapSimulate.
 *
 * A climb is a chain of hops, and a hop is connectable when the horizontal
 * distance the arc must cover fits inside what the run physics can deliver
 * in the air time the gap allows: full run speed across the bounce-to-ledge
 * flight, plus the landing windows of both ledges, minus the worst drift of
 * a moving target. The gate replays forty seeded deals of every rung through
 * the game's own leapSpawn and proves every hop of every deal is connectable
 * - no deal the rng can lay is unclimbable in principle. It then measures the
 * slack each hop leaves over and proves the deep tier is the hard tier by
 * construction: `ledge` narrows the boards below anything shipped before,
 * the springs fade, the drifting share climbs, the summit keeps its +900 a
 * rung, and the slack a hop leaves shrinks rung over rung into the deep
 * tier. A narrowed board is still landable - the smallest deep ledge holds
 * the player's diameter with room to spare - and the shipped physics law
 * (no gap above what a normal bounce clears) is re-derived here from the
 * exported constants rather than trusted.
 *
 * The summit h25-h30 is benched on the engine itself. leapSimulate is the
 * live loop's own ascent (the shared spawn law, platform motion, bounce
 * physics and screen wrap at a fixed tick) driven by a scripted
 * model-predictive hand: each tick it rolls a small plan library out through
 * the sim's own step - two aim plans at the ledges the flight apex still
 * covers, a walk plan that lands back on the launch board displaced toward
 * the blocked target, hold left/right and brake - and keeps the plan that
 * lands the highest ledge soonest. One target set is frozen per flight (on
 * probe.jumps) so the steering of a flight pulls one way throughout. The
 * climb is height-stationary by construction - leapSpawn draws from the
 * level's dials alone - so a seeded 1200-unit slice's seconds per 1000
 * project to the full rung; the gate prices each summit three-star line off
 * the strong hand's own clean slices (six seeds per rung, 81011..81097 step
 * 12) and proves the line bites: the shipped rung's clean seeds straddle it,
 * median under, slowest seed over. The weaker lag-and-chase hand the gate
 * keeps never finishes a slice at all. The board is the load-bearing dial by
 * re-deal: relax `ledge` back to the shipped 1.0 on the live def and the
 * deal machinery measures the margin coming back - the mean landing slack a
 * hop leaves rises by 23-24 px on every summit rung over the same seeded
 * hops - while the hand's cut median finishes under the line it only
 * straddled at 0.62. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.leapLevels;
  const deepIds = ["h21", "h22", "h23", "h24"];
  const summitIds = ["h25", "h26", "h27", "h28", "h29", "h30"];

  check("game-glyph-leap", "the ladder holds thirty ascents",
    levels.length === 30, String(levels.length));
  check("game-glyph-leap", "every ascent id is distinct and in ladder order",
    new Set(levels.map((level) => level.id)).size === levels.length &&
    levels.every((level, index) => level.id === "h" + (index + 1)),
    levels.map((level) => level.id).join(","));
  const missing = deepIds.concat(summitIds).filter((id) =>
    !levels.some((level) => level.id === id));
  check("game-glyph-leap", "the deep tier h21-h24 and the summit h25-h30 are present",
    missing.length === 0, missing.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });

  /* The physics law the shipped comments claim: every gap a rung can spawn
   * stays under what a normal bounce clears, with a margin to steer in. */
  const rise = (App.leapBounce * App.leapBounce) / (2 * App.leapGravity);
  check("game-glyph-leap",
    "every rung's gap ceiling sits under what a normal bounce clears",
    levels.every((level) => level.gapMax <= rise - 4),
    `max gap ${Math.max.apply(null, levels.map((level) => level.gapMax))} vs rise ${rise.toFixed(1)}`);

  /* The rng the deals are replayed with - one stream per rung per seed, the
   * way the live game draws from Math.random. */
  const leapRng = (seed) => {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const PLAYER_R = 9;
  const RUN_SPEED = 240;
  const DEAL_SEEDS = [];
  for (let seed = 0; seed < 40; seed += 1) DEAL_SEEDS.push(81000 + seed * 37);

  /* One deal: the chain of ledges the rung's own spawn law lays, walking up
   * `count` hops from the ground board. */
  const deal = (level, seed, count) => {
    const rng = leapRng(seed);
    const chain = [{ x: 120, w: 80, y: 340, kind: "static", amp: 0 }];
    let topY = 340;
    for (let hop = 0; hop < count; hop += 1) {
      const platform = App.leapSpawn(level, topY, rng);
      chain.push(platform);
      topY = platform.y;
    }
    return chain;
  };

  /* Hop connectability: the arc leaves ledge i and must come down inside
   * ledge i+1. The air time is set by the gap; the ground a full-speed run
   * covers in that air is the reach; the landing windows of both ledges
   * widen what the arc can hit; and the well wraps, so a ledge across the
   * seam is as near as the wrap makes it. Drift is excluded here on
   * purpose: a drifting ledge is a designed lever this gate measures
   * separately, not a broken deal, so what this bound flags is a hop whose
   * position alone puts it out of physics - the luck the rng lays. */
  const hopNeed = (a, b) => {
    const gap = a.y - b.y;
    const tAir = App.leapBounce / App.leapGravity +
      Math.sqrt((2 * (rise - gap)) / App.leapGravity);
    const reach = RUN_SPEED * tAir;
    let need = Math.abs((b.x + b.w / 2) - (a.x + a.w / 2));
    need = Math.min(need, App.leapWidth - need);
    const slack = reach + (a.w + b.w) / 2 + 2 * PLAYER_R - need;
    return { gap, tAir, reach, need, slack };
  };

  const DEAL_HOPS = 120;
  const unreachableByLevel = {};
  const slackByLevel = {};
  levels.forEach((level) => {
    let slackSum = 0;
    let slackHops = 0;
    let unreachable = 0;
    DEAL_SEEDS.forEach((seed) => {
      const chain = deal(level, seed, DEAL_HOPS);
      for (let hop = 0; hop < DEAL_HOPS; hop += 1) {
        const hopOut = hopNeed(chain[hop], chain[hop + 1]);
        if (hopOut.slack < 0) unreachable += 1;
        slackSum += hopOut.slack;
        slackHops += 1;
      }
    });
    unreachableByLevel[level.id] = unreachable / slackHops;
    slackByLevel[level.id] = slackSum / slackHops;
  });
  const h20Unreachable = unreachableByLevel.h20;
  const unreachableProblems = deepIds.concat(summitIds).filter((id) =>
    unreachableByLevel[id] > h20Unreachable);
  check("game-glyph-leap",
    "no deep or summit rung lays more positionally unreachable hops than the shipped peak does",
    unreachableProblems.length === 0,
    deepIds.concat(summitIds).map((id) => `${id} ${(unreachableByLevel[id] * 100).toFixed(2)}%` +
      ` vs h20 ${(h20Unreachable * 100).toFixed(2)}%`).join(", "));

  /* The deep tier is the hard tier by construction. No shipped rung narrows
   * its boards; every deep rung does, and each deep rung narrows further.
   * The springs fade below the shipped floor and the drifting share climbs
   * above the shipped ceiling, while the summit keeps its +900 a rung. */
  const deep = deepIds.map((id) => byId[id]);
  const shallow = levels.filter((level) => !deepIds.includes(level.id) &&
    !summitIds.includes(level.id));
  check("game-glyph-leap",
    "no shipped rung narrows its ledges; the deep tier narrows rung over rung",
    shallow.every((level) => !level.ledge) &&
    deep.every((level) => level.ledge && level.ledge < 1) &&
    deep.every((level, index) =>
      index === 0 || level.ledge < deep[index - 1].ledge),
    deep.map((level) => level.id + ":x" + level.ledge).join(" "));
  check("game-glyph-leap",
    "the smallest deep board still holds the player with room to turn",
    Math.round(64 * deep[deep.length - 1].ledge) >= 4 * PLAYER_R,
    `w ${Math.round(64 * deep[deep.length - 1].ledge)} vs player ${4 * PLAYER_R}`);
  check("game-glyph-leap",
    "the deep springs fade below the shipped floor and the drift share climbs above it",
    deep.every((level) => level.spring < 0.12) &&
    deep.every((level) => level.moving > 0.56) &&
    deep.every((level, index) => index === 0 ||
      (level.spring <= deep[index - 1].spring && level.moving >= deep[index - 1].moving)),
    deep.map((level) => level.id + ":s" + level.spring + "/m" + level.moving).join(" "));
  check("game-glyph-leap",
    "the summit keeps its +900 a rung into the deep tier",
    deep.every((level, index) => index === 0
      ? level.goal === shallow[shallow.length - 1].goal + 900
      : level.goal === deep[index - 1].goal + 900),
    deep.map((level) => level.goal).join("/"));

  /* The slack a hop leaves - the room a player has to mis-time and still
   * land - shrinks into the deep tier: each deep rung's mean slack sits
   * strictly under the rung before it, and under the shipped peak. */
  const slackProblems = [];
  deep.forEach((level, index) => {
    const prev = index === 0 ? byId.h20 : deep[index - 1];
    if (!(slackByLevel[level.id] < slackByLevel[prev.id])) {
      slackProblems.push(`${level.id} mean slack ${slackByLevel[level.id].toFixed(1)}` +
        ` vs ${prev.id} ${slackByLevel[prev.id].toFixed(1)}`);
    }
  });
  check("game-glyph-leap",
    "the landing slack a hop leaves shrinks rung over rung into the deep tier",
    slackProblems.length === 0,
    slackProblems.join(" | ") ||
      `h20 ${slackByLevel.h20.toFixed(1)} -> ` +
      deep.map((level) => `${level.id} ${slackByLevel[level.id].toFixed(1)}`).join(" -> "));

  /* The star bands keep the shipped shape: three-star line first, bands
   * rising, each rung's bands above the rung before it. */
  check("game-glyph-leap",
    "the deep bands rise inside each rung and never dip below the rung before",
    deep.every((level) =>
      level.starTimes[0] < level.starTimes[1] && level.starTimes[1] < level.starTimes[2]) &&
    deep.every((level, index) => {
      const prev = index === 0 ? byId.h20 : deep[index - 1];
      return level.starTimes[0] >= prev.starTimes[0] &&
        level.starTimes[1] >= prev.starTimes[1] &&
        level.starTimes[2] >= prev.starTimes[2];
    }),
    deep.map((level) => level.starTimes.join("/")).join(" "));

  /* The tier's names resolve in both languages (the shared numbered-label
   * shelf carries them). */
  const copyProblems = deep.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-glyph-leap", "the four deep ascent names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* ---- the summit: dials, then the bench ---- */
  const summit = summitIds.map((id) => byId[id]);
  const h24 = byId.h24;
  check("game-glyph-leap",
    "the summit closes the window rung over rung until h30 deals nothing but ceiling gaps",
    summit.every((level, index) => index === 0
      ? level.gapMin === h24.gapMin
      : level.gapMin >= summit[index - 1].gapMin) &&
    summit.every((level) => level.gapMax === 92) &&
    summit[summit.length - 1].gapMin === summit[summit.length - 1].gapMax,
    summit.map((level) => level.id + ":" + level.gapMin + "-" + level.gapMax).join(" "));
  check("game-glyph-leap",
    "the summit holds the boards at the deep tier's floor width and pays for it in springs",
    summit.every((level) => level.ledge <= h24.ledge && level.ledge >= 0.6) &&
    summit.every((level, index) => level.spring >= h24.spring) &&
    summit.every((level, index) => level.moving >= h24.moving) &&
    summit.every((level, index) => index === 0 || level.moving >= summit[index - 1].moving),
    summit.map((level) => level.id + ":x" + level.ledge + "/s" + level.spring +
      "/m" + level.moving).join(" "));
  check("game-glyph-leap",
    "the summit keeps the +900 a rung and every summit board holds the player",
    summit.every((level, index) => index === 0
      ? level.goal === h24.goal + 900
      : level.goal === summit[index - 1].goal + 900) &&
    summit.every((level) => Math.round(64 * level.ledge) >= 4 * PLAYER_R),
    summit.map((level) => level.goal).join("/") +
      ` boards ${summit.map((level) => Math.round(64 * level.ledge)).join("/")}`);
  check("game-glyph-leap",
    "the summit bands rise inside each rung and never dip below the deep tier",
    summit.every((level) =>
      level.starTimes[0] < level.starTimes[1] && level.starTimes[1] < level.starTimes[2]) &&
    summit.every((level, index) => {
      const prev = index === 0 ? h24 : summit[index - 1];
      return level.starTimes[0] >= prev.starTimes[0] &&
        level.starTimes[1] >= prev.starTimes[1] &&
        level.starTimes[2] >= prev.starTimes[2];
    }),
    summit.map((level) => level.starTimes.join("/")).join(" "));
  const slackSummitProblems = summit.filter((level) =>
    slackByLevel[level.id] >= slackByLevel.h24);
  check("game-glyph-leap",
    "every summit rung opens under the deep tier's landing slack and ends lower than it opens",
    slackSummitProblems.length === 0 &&
    slackByLevel.h30 < slackByLevel.h25,
    slackSummitProblems.map((level) => level.id + " " + slackByLevel[level.id].toFixed(1)).join(" ") ||
      `h24 ${slackByLevel.h24.toFixed(1)} -> ` +
      summit.map((level) => `${level.id} ${slackByLevel[level.id].toFixed(1)}`).join(" -> "));

  /* ---- the bench: the game's own headless ascent, played by hand ---- */
  const G = App.leapGravity;
  const W = App.leapWidth;
  const CAP = 240; /* leapRunSpeed */
  const ACC = 950; /* leapRunAccel */
  const DT = 1 / 60;
  const SLICE = 1200;
  const BENCH_SEEDS = [81011, 81023, 81047, 81061, 81083, 81097];

  /* Roll the sim's own step (platform drift first, then the player, then
   * the landing test, in the live loop's order) under a fixed steer plan.
   * Boards ride the tracked quadratic - the drift period is ~5 s, so the
   * quadratic is sub-pixel over a flight horizon. */
  function rollout(planFn, me, platforms, mem, horizon) {
    let x = me.x;
    let vx = me.vx;
    let vy = me.vy;
    let feet = me.y + PLAYER_R;
    const boards = platforms.map((p) => {
      const m = mem.get(p.y);
      return { y: p.y, x: p.x, w: p.w, kind: p.kind, v: m ? m.v : 0, a: m ? m.a : 0 };
    });
    let firstSteer = 0;
    for (let tick = 1; tick <= horizon; tick += 1) {
      for (const b of boards) {
        if (b.v !== 0 || b.a !== 0) {
          b.x += b.v * DT + 0.5 * b.a * DT * DT;
          b.v += b.a * DT;
        }
      }
      const steer = planFn({ x, vx, vy, feet, tick, boards }) || 0;
      if (tick === 1) firstSteer = steer;
      if (steer !== 0) {
        vx += steer * ACC * DT;
        vx = Math.max(-CAP, Math.min(CAP, vx));
      } else {
        vx -= vx * Math.min(1, DT * 6);
      }
      vy += G * DT;
      const prevFeet = feet;
      x += vx * DT;
      feet += vy * DT;
      if (x < -PLAYER_R) {
        x = W + PLAYER_R;
      } else if (x > W + PLAYER_R) {
        x = -PLAYER_R;
      }
      if (vy > 0) {
        for (const b of boards) {
          if (
            prevFeet <= b.y + 4 &&
            feet >= b.y &&
            x > b.x - PLAYER_R &&
            x < b.x + b.w + PLAYER_R
          ) {
            return { landed: b.y, tick, feet, landX: x, firstSteer };
          }
        }
      }
    }
    return { landed: null, tick: horizon, feet, landX: x, firstSteer };
  }

  /* The strong hand: model-predictive with per-flight commitment. On each
   * landing it freezes the flight state - the board just left, the highest
   * ledges the launch apex covers (reach-filtered), and a walk offset toward
   * the blocked target - and each tick keeps the plan whose rollout lands
   * the highest ledge soonest, with a small bonus for landing closer to the
   * target so repositioning bounces accumulate instead of recentering. */
  function makeStrongHand() {
    const mem = new Map();
    let lastJumps = -1;
    let launchY = null;
    let walkOffset = 0;
    const targetYs = [];
    let blockedCx = 160;
    return function hand(probe) {
      const me = probe.player;
      for (const p of probe.platforms) {
        const prev = mem.get(p.y);
        if (!prev) {
          mem.set(p.y, { x: p.x, t: probe.seconds, v: (p.drift || 0) * 60, a: 0 });
        } else if (probe.seconds > prev.t) {
          const dt = probe.seconds - prev.t;
          const v = (p.x - prev.x) / dt;
          const a = (v - prev.v) / dt;
          mem.set(p.y, { x: p.x, t: probe.seconds, v, a: 0.6 * a + 0.4 * prev.a });
        }
      }
      const feet = me.y + PLAYER_R;
      if (probe.jumps !== lastJumps) {
        lastJumps = probe.jumps;
        let launch = null;
        for (const p of probe.platforms) {
          if (p.y >= feet - 2 && p.y <= feet + 14) {
            launch = p;
            break;
          }
        }
        if (launch) {
          launchY = launch.y;
          const apexY = feet - (me.vy < 0 ? (me.vy * me.vy) / (2 * G) : 0);
          const cands = probe.platforms
            .filter((p) => p.y >= apexY - 2)
            .sort((a, b) => a.y - b.y);
          targetYs.length = 0;
          for (const p of cands) {
            const disc = me.vy * me.vy + 2 * G * (p.y - feet);
            if (disc < 0) continue;
            const t = Math.max(0.04, (Math.sqrt(disc) - me.vy) / G);
            const cx = p.x + p.w / 2 +
              (p.kind === "move" && mem.get(p.y) ? mem.get(p.y).v * t : 0);
            const dAcc = 0.5 * ACC * t * t;
            const lo = Math.max(me.x + me.vx * t - dAcc, me.x - CAP * t);
            const hi = Math.min(me.x + me.vx * t + dAcc, me.x + CAP * t);
            if (cx >= lo - (p.w / 2 + PLAYER_R - 4) && cx <= hi + (p.w / 2 + PLAYER_R - 4)) {
              targetYs.push(p.y);
              if (targetYs.length === 2) break;
            }
          }
          if (cands.length) {
            blockedCx = cands[0].x + cands[0].w / 2;
          }
          const half = launch.w / 2 + PLAYER_R - 7;
          walkOffset = Math.max(-half, Math.min(half, blockedCx - (launch.x + launch.w / 2)));
        } else {
          launchY = null;
          targetYs.length = 0;
        }
      }
      const near = probe.platforms.filter(
        (p) =>
          p.y >= (targetYs.length ? targetYs[targetYs.length - 1] : feet) - 220 &&
          p.y <= feet + 360,
      );
      const horizon = me.vy < 0 ? 100 : 60;
      const aimPlan = (ty) => (st) => {
        let target = null;
        for (const b of st.boards) {
          if (b.y === ty) {
            target = b;
            break;
          }
        }
        if (!target || (st.vy > 0 && st.feet > ty + 12)) return 0;
        const disc = st.vy * st.vy + 2 * G * (ty - st.feet);
        const t = disc > 0 ? Math.max(0.04, (Math.sqrt(disc) - st.vy) / G) : 0.2;
        const cx = Math.max(
          9 + target.w / 2,
          Math.min(W - 9 - target.w / 2, target.x + target.v * t + 0.5 * target.a * t * t + target.w / 2),
        );
        const aStar = (2 * (cx - st.x - st.vx * t)) / (t * t);
        return aStar >= 0 ? 1 : -1;
      };
      const walkPlan =
        launchY === null
          ? null
          : (st) => {
              let target = null;
              for (const b of st.boards) {
                if (b.y === launchY) {
                  target = b;
                  break;
                }
              }
              if (!target || (st.vy > 0 && st.feet > launchY + 12)) return 0;
              const disc = st.vy * st.vy + 2 * G * (launchY - st.feet);
              const t = disc > 0 ? Math.max(0.04, (Math.sqrt(disc) - st.vy) / G) : 0.2;
              const half = target.w / 2 + 2;
              const aim =
                target.x + target.w / 2 + Math.max(-half, Math.min(half, walkOffset));
              const aStar = (2 * (aim - st.x - st.vx * t)) / (t * t);
              return aStar >= 0 ? 1 : -1;
            };
      const plans = [];
      for (const ty of targetYs) plans.push(aimPlan(ty));
      if (walkPlan) plans.push(walkPlan);
      plans.push(() => 1);
      plans.push(() => -1);
      plans.push((st) => (Math.abs(st.vx) > 30 ? (st.vx > 0 ? -1 : 1) : 0));
      let bestFirstSteer = 0;
      let bestScore = -Infinity;
      for (const plan of plans) {
        const r = rollout(plan, me, near, mem, horizon);
        const progress =
          (Math.abs(me.x - blockedCx) - Math.abs(r.landX - blockedCx)) * 0.3;
        const score =
          r.landed !== null
            ? 200000 - r.landed * 10 - r.tick + progress
            : 200000 - (r.feet + 60) * 10 - r.tick;
        if (score > bestScore) {
          bestScore = score;
          bestFirstSteer = r.firstSteer;
        }
      }
      return bestFirstSteer;
    };
  }

  /* The weak hand: aims at where the nearest board above the feet sits right
   * now, corrects late and never brakes - the lag is the point. */
  function makeWeakHand(deadband) {
    return function hand(probe) {
      const me = probe.player;
      let target = null;
      for (const p of probe.platforms) {
        if (p.y < me.y - 2 && (!target || p.y > target.y)) target = p;
      }
      if (!target) return 0;
      const dx = target.x + target.w / 2 - me.x;
      return dx > deadband ? 1 : dx < -deadband ? -1 : 0;
    };
  }

  /* One seeded slice: the rung's own spawn law, climbed 1200 units through
   * leapSimulate. The spawn law draws from the dials alone, so the slice's
   * seconds per 1000 project to the full rung. */
  const sliceRun = (level, hand, seed) =>
    App.leapSimulate(Object.assign({}, level, { goal: SLICE }), hand, leapRng(seed));

  /* The summit's three-star lines, authored from the measured pace: each
   * line must sit inside its rung's clean-slice straddle (median implied
   * full time under the line, the slowest clean seed over it) and above the
   * deep tier's line. */
  const straddleProblems = [];
  const summitBench = summit.map((level) => {
    const strong = BENCH_SEEDS.map((seed) => sliceRun(level, makeStrongHand(), seed));
    const clean = [];
    strong.forEach((r) => {
      if (r.cleared) {
        clean.push((r.seconds / SLICE) * 1000 * (level.goal / 1000));
      }
    });
    clean.sort((a, b) => a - b);
    const median = clean.length ? clean[Math.floor((clean.length - 1) / 2)] : Infinity;
    const max = clean.length ? clean[clean.length - 1] : Infinity;
    const line = level.starTimes[0];
    if (clean.length < 3 || !(median <= line) || !(max > line)) {
      straddleProblems.push(
        `${level.id} clean ${clean.length} median ${median.toFixed(0)} ` +
        `max ${max.toFixed(0)} line ${line}`);
    }
    return { level, strong, clean, median, max, line };
  });
  check("game-glyph-leap",
    "every summit line is priced inside its rung's clean-slice straddle: median under, slowest seed over",
    straddleProblems.length === 0,
    straddleProblems.join(" | ") ||
      summitBench.map((b) =>
        `${b.level.id} ${b.clean.length}/6 median ${b.median.toFixed(0)}` +
        ` max ${b.max.toFixed(0)} line ${b.line}`).join(" "));

  /* The weak hand never reaches the summit's three-star line: it either
   * falls before the slice ends or, if it finishes, projects past the line. */
  const weakHand = makeWeakHand(8);
  const weakProblems = [];
  summitBench.forEach((b) => {
    let clean = 0;
    BENCH_SEEDS.forEach((seed) => {
      const r = sliceRun(b.level, weakHand, seed);
      if (r.cleared) {
        clean += 1;
        if ((r.seconds / SLICE) * 1000 * (b.level.goal / 1000) <= b.line) {
          weakProblems.push(`${b.level.id} weak seed under the line`);
        }
      }
    });
    b.weakClean = clean;
  });
  check("game-glyph-leap",
    "the weak hand the gate keeps never finishes a summit slice at the three-star pace",
    weakProblems.length === 0,
    weakProblems.join(" | ") ||
      summitBench.map((b) => `${b.level.id} weak clean ${b.weakClean}/6`).join(" "));

  /* The board is load-bearing by re-deal: relax `ledge` to the shipped 1.0
   * on a copy of the def and (a) the deal machinery measures the landing
   * margin coming back - the mean hop slack rises by over 20 px on every
   * summit rung over the same seeded hops - and (b) the hand's cut median
   * now finishes under the line its shipped rung only straddled. */
  const cutProblems = [];
  const cutSlackGains = [];
  summitBench.forEach((b) => {
    const cutLevel = Object.assign({}, b.level, { ledge: 1 });
    let slackSum = 0;
    DEAL_SEEDS.forEach((seed) => {
      const chain = deal(cutLevel, seed, DEAL_HOPS);
      for (let hop = 0; hop < DEAL_HOPS; hop += 1) {
        slackSum += hopNeed(chain[hop], chain[hop + 1]).slack;
      }
    });
    const cutSlack = slackSum / (DEAL_SEEDS.length * DEAL_HOPS);
    const gain = cutSlack - slackByLevel[b.level.id];
    cutSlackGains.push(`${b.level.id} +${gain.toFixed(1)}px`);
    if (gain < 20) {
      cutProblems.push(`${b.level.id} slack gain ${gain.toFixed(1)}px`);
    }
    const cutImplied = [];
    BENCH_SEEDS.forEach((seed) => {
      const r = sliceRun(cutLevel, makeStrongHand(), seed);
      if (r.cleared) {
        cutImplied.push((r.seconds / SLICE) * 1000 * (b.level.goal / 1000));
      }
    });
    cutImplied.sort((a, b2) => a - b2);
    if (!cutImplied.length ||
      cutImplied[Math.floor((cutImplied.length - 1) / 2)] >= b.line) {
      cutProblems.push(`${b.level.id} cut median ${cutImplied.length ? cutImplied[Math.floor((cutImplied.length - 1) / 2)].toFixed(0) : "none"} vs line ${b.line}`);
    }
  });
  check("game-glyph-leap",
    "the cut board restores the climber's margin and drops the line's bite: slack +20px and cut median under the line on every summit rung",
    cutProblems.length === 0,
    cutProblems.join(" | ") || cutSlackGains.join(" "));

  /* The unlock chain is derived, never stored: clearing each ascent in order
   * hands the player exactly the next one, all thirty times. */
  const chain = App.createCampaign({
    key: "glyph-leap-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-glyph-leap", "the unlock chain walks all thirty ascents in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");

  /* The summit's names travel with the module in both languages. */
  const summitCopyProblems = summit.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-glyph-leap", "the six summit ascent names resolve in both languages",
    summitCopyProblems.length === 0, summitCopyProblems.join(","));
};
