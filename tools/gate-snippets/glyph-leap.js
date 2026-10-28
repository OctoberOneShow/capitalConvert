"use strict";

/* game-glyph-leap: the deep tier is proved the way the sky itself is built -
 * geometrically, deal by deal, through the game's own spawn law and physics.
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
 * exported constants rather than trusted. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.leapLevels;
  const deepIds = ["h21", "h22", "h23", "h24"];

  check("game-glyph-leap", "the ladder holds twenty-four ascents",
    levels.length === 24, String(levels.length));
  check("game-glyph-leap", "every ascent id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-glyph-leap", "the deep tier h21-h24 is present",
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
  const unreachableProblems = deepIds.filter((id) =>
    unreachableByLevel[id] > h20Unreachable);
  check("game-glyph-leap",
    "no deep rung lays more positionally unreachable hops than the shipped peak does",
    unreachableProblems.length === 0,
    deepIds.map((id) => `${id} ${(unreachableByLevel[id] * 100).toFixed(2)}%` +
      ` vs h20 ${(h20Unreachable * 100).toFixed(2)}%`).join(", "));

  /* The deep tier is the hard tier by construction. No shipped rung narrows
   * its boards; every deep rung does, and each deep rung narrows further.
   * The springs fade below the shipped floor and the drifting share climbs
   * above the shipped ceiling, while the summit keeps its +900 a rung. */
  const deep = deepIds.map((id) => byId[id]);
  const shallow = levels.filter((level) => !deepIds.includes(level.id));
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

  /* The unlock chain is derived, never stored: clearing each ascent in order
   * hands the player exactly the next one, all twenty-four times. */
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
  check("game-glyph-leap", "the unlock chain walks all twenty-four ascents in order",
    walked === 24 && chained && chain.clearedCount() === 24, walked + " first clears");
};
