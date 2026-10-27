"use strict";

/* game-glyph-crossing: every ford is proven, and the deep tier is the hard tier
 *
 * The forge module carries the panel's exact rules in a breadth-first prover
 * over the joint state (pads collected, row, position, time): river rows
 * drown the frog unless a log carries it, road rows squash it when a streak
 * closes within 12px, and the ford clears only when all four pad columns
 * have been stood on. A ford ships only when that prover finds a route, and
 * the route's tick length is the certificate its star bands are quoted from.
 * This gate re-proves the whole shipped ladder through that same prover,
 * then holds the deep tier to its design brief: nine lanes on every rung, a
 * fastest lane above the shipped ceiling, a tightest gap under the shipped
 * floor, and bands quoted from each rung's own measured route. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const crossing = require(path.join(root, "tools", "crossing-forge.js"));
  const croLevels = crossing.loadFords();

  check("game-glyph-crossing", "the ladder holds twenty-four fords",
    croLevels.length === 24, String(croLevels.length));
  check("game-glyph-crossing", "every ford id is distinct",
    new Set(croLevels.map((l) => l.id)).size === croLevels.length);
  check("game-glyph-crossing", "the ids run c1 through c24 in order",
    croLevels.every((l, index) => l.id === "c" + (index + 1)),
    croLevels.map((l) => l.id).join(","));

  /* The prover's own answer, re-run here - the route is the certificate and
   * its tick length is what the deep tier's bands quote. The panel itself is
   * deterministic (the prop trains spawn from the lane table, never from
   * Math.random), but the seeded swap keeps the run reproducible wherever a
   * shared module reaches for Math.random. */
  const croSeeded = (seed, fn) => {
    const real = Math.random;
    let state = seed >>> 0;
    Math.random = () => {
      state = (Math.imul(state, 1103515245) + 12345) >>> 0;
      return state / 4294967296;
    };
    try { return fn(); } finally { Math.random = real; }
  };
  const croRoutes = {};
  croSeeded(41027, () => {
    croLevels.forEach((level) => {
      const report = crossing.checkFord(level);
      croRoutes[level.id] = report.ok ? report.proof.ticks : -1;
      check("game-glyph-crossing",
        `${level.id}: the prover finds a route that stands on all four pads`,
        report.ok,
        report.ok
          ? "cleared at t+" + (report.proof.ticks * 0.05).toFixed(2) + "s over " +
            report.proof.states + " states"
          : "no route clears it");
    });
  });

  /* The module's band convention: strictly rising inside a rung. */
  check("game-glyph-crossing", "the star bands only rise inside a rung",
    croLevels.every((l) => l.starTimes[0] < l.starTimes[1] && l.starTimes[1] < l.starTimes[2]),
    croLevels.map((l) => l.starTimes.join("/")).join(" "));

  /* The second tier keeps the shipped ladder curve it was cut from: the
   * three-star line rises 5.5s a rung from 78s, widened by 1.5x / 2.05x. */
  const croCurve = (n) => 78 + (n - 11) * 5.5;
  const croForged = croLevels.filter((l) => {
    const n = Number(l.id.slice(1));
    return n >= 11 && n <= 20;
  });
  check("game-glyph-crossing", "the second tier keeps the shipped band curve",
    croForged.every((l) =>
      l.starTimes[0] === Math.round(croCurve(Number(l.id.slice(1)))) &&
      l.starTimes[1] === Math.round(croCurve(Number(l.id.slice(1))) * 1.5) &&
      l.starTimes[2] === Math.round(croCurve(Number(l.id.slice(1))) * 2.05)),
    croForged.map((l) => l.id + ":" + l.starTimes.join("/")).join(" "));

  /* Honesty floor for every forged rung: the prover's route clears the
   * three-star line with the shipped margin to spare (the second tier's
   * own margins run 25x-65x the route). */
  check("game-glyph-crossing", "every forged rung clears its three-star line with the shipped margin to spare",
    croLevels.filter((l) => Number(l.id.slice(1)) >= 11).every((l) =>
      l.starTimes[0] >= 25 * croRoutes[l.id] * 0.05),
    croLevels.filter((l) => Number(l.id.slice(1)) >= 11)
      .map((l) => l.id + ":" + (l.starTimes[0] / (croRoutes[l.id] * 0.05)).toFixed(1) + "x").join(" "));

  /* The deep tier is the hard tier, in the ladder's own terms: nine lanes
   * on every rung (the shipped ceiling was eight), a fastest lane above
   * the shipped 172, a tightest gap under the shipped 96. */
  const croDeep = croLevels.filter((l) => ["c21", "c22", "c23", "c24"].includes(l.id));
  const croF20 = croLevels.find((l) => l.id === "c20");
  const croShallow = croLevels.filter((l) => !["c21", "c22", "c23", "c24"].includes(l.id));
  const croTop = (l) => Math.max(...l.lanes.map((lane) => lane.speed));
  const croTight = (l) => Math.min(...l.lanes.map((lane) => lane.gap));
  check("game-glyph-crossing", "the deep tier is the hard tier: nine lanes on every rung",
    croDeep.length === 4 && croDeep.every((l) => l.lanes.length === 9) &&
      croShallow.every((l) => l.lanes.length <= 8),
    croDeep.map((l) => l.id + ":" + l.lanes.length).join(" "));
  check("game-glyph-crossing", "the deep tier outruns the shipped speed ceiling",
    croDeep.every((l) => croTop(l) > 172) && croShallow.every((l) => croTop(l) <= 172),
    croDeep.map((l) => l.id + ":" + croTop(l)).join(" ") + " vs shipped 172");
  check("game-glyph-crossing", "the deep tier dips under the shipped gap floor",
    croDeep.every((l) => croTight(l) < 96) && croShallow.every((l) => croTight(l) >= 96),
    croDeep.map((l) => l.id + ":" + croTight(l)).join(" ") + " vs shipped 96");

  /* The deep ladder only climbs: the prover's cleanest route lengthens rung
   * over rung, which is the order the tier sits in. */
  check("game-glyph-crossing", "the deep ladder only climbs: no rung's cleanest route is shorter than the one before",
    croDeep.every((l, index) => index === 0 || croRoutes[l.id] >= croRoutes[croDeep[index - 1].id]),
    croDeep.map((l) => l.id + ":" + croRoutes[l.id] + "t").join(" "));

  /* The deep bands are quoted, not guessed: each rung's three-star line is
   * its own measured route at the forged half's mean margin (48x the
   * prover's route), widened by the shipped 1.5x / 2.05x steps - and the
   * whole tier sits above the second tier's ceiling. */
  check("game-glyph-crossing", "the deep bands quote the prover's route at the shipped mean margin",
    croDeep.every((l) => {
      const exact = croRoutes[l.id] * 0.05 * 48;
      return l.starTimes[0] === Math.round(exact) &&
        l.starTimes[1] === Math.round(exact * 1.5) &&
        l.starTimes[2] === Math.round(exact * 2.05);
    }),
    croDeep.map((l) => l.id + ":" + l.starTimes.join("/")).join(" "));
  check("game-glyph-crossing", "the deep tier's three-star line sits above the shipped ceiling",
    croDeep.every((l) => l.starTimes[0] > croF20.starTimes[0]),
    croDeep.map((l) => l.starTimes[0]).join("/") + " vs " + croF20.starTimes[0]);

  /* Provenance: the shipped lanes are the forge's own output for each
   * rung's brief, not hand-tuned neighbours of it. */
  const croBriefs = {
    c21: { band: [124, 160, 94, 128], cross: [6, 2, 7], seed: 81 },
    c22: { band: [130, 168, 92, 122], cross: [6, 2, 7], seed: 89 },
    c23: { band: [136, 176, 90, 118], cross: [6, 2, 5], seed: 275 },
    c24: { band: [148, 190, 84, 110], cross: [6, 2, 5], seed: 174 },
  };
  check("game-glyph-crossing", "the deep lanes are the forge's own output for their briefs",
    croDeep.every((l) => {
      const brief = croBriefs[l.id];
      const forgedLanes = crossing.forgeFord(
        { id: l.id, labelKey: l.labelKey, band: brief.band, cross: brief.cross },
        brief.seed * 7919 + brief.band[0] * 31 + brief.cross.length,
      ).lanes;
      return JSON.stringify(forgedLanes) === JSON.stringify(l.lanes);
    }),
    "a deep rung's lanes drifted from its brief");

  /* The rung names travel with the ladder: both languages hold a real
   * string for every rung (c1-c20 from the shared dictionary, c21-c24 from
   * the module's own addStrings), and t() never falls back to the key. */
  check("game-glyph-crossing", "every rung name resolves in both languages",
    croLevels.every((l) =>
      App.I18N && App.I18N.en && App.I18N.en[l.labelKey] && App.I18N.zh && App.I18N.zh[l.labelKey] &&
      App.t(l.labelKey) !== l.labelKey),
    "a rung label fell back to its key");

  /* The unlock chain is derived, never stored, so it scales with the ladder:
   * clearing each rung in order must hand the player exactly the next one,
   * all twenty-four times, with nothing left locked behind the last. */
  const croChain = App.createCampaign({
    key: "glyph-crossing-gate-chain",
    levels: croLevels.map((l) => ({ id: l.id, labelKey: l.labelKey })),
  });
  let croWalked = 0;
  let croChained = true;
  croLevels.forEach((level, index) => {
    const outcome = croChain.record(level.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) croWalked += 1;
    const expected = index + 1 < croLevels.length ? croLevels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) croChained = false;
  });
  check("game-glyph-crossing", "the unlock chain walks all twenty-four fords in order",
    croWalked === 24 && croChained && croChain.clearedCount() === 24,
    croWalked + " first clears");
};
