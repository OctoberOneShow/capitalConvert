"use strict";

/* game-glyph-crossing: every ford is proven, and the deep tier and summit are
 * the hard tiers
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
 * floor, and bands quoted from each rung's own measured route.
 *
 * The summit c25-c30 closes the street the deep tier always left quiet:
 * rows 5, 6 and 7 each run two ways on every rung - ten lanes, the first
 * double-digit ford - while the brief bands keep tightening and every rung's
 * fastest lane outruns the deep summit's 198 with its tightest gap under the
 * deep summit's 86. The tier is priced in the prover's own currency: the
 * cleanest route climbs rung over rung from c24's 66 ticks to 105 on c30,
 * the bands quote each route at the deep tier's own 48x margin, and the
 * mirrored streets are load-bearing by ablation - pull the row-7 train (the
 * street the deep summit itself left quiet) from the shipped lanes and the
 * prover's own lethal() law measures row 7's rest moments rising on the
 * nine-lane twin, whose cleanest route collapses. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const crossing = require(path.join(root, "tools", "crossing-forge.js"));
  const croLevels = crossing.loadFords();

  check("game-glyph-crossing", "the ladder holds thirty fords",
    croLevels.length === 30, String(croLevels.length));
  check("game-glyph-crossing", "every ford id is distinct",
    new Set(croLevels.map((l) => l.id)).size === croLevels.length);
  check("game-glyph-crossing", "the ids run c1 through c30 in order",
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
  const croShallow = croLevels.filter((l) => {
    const n = Number(l.id.slice(1));
    return n < 21;
  });
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
    c25: { band: [140, 182, 80, 104], cross: [6, 2, 7, 5], seed: 7 },
    c26: { band: [146, 188, 78, 100], cross: [6, 2, 7, 5], seed: 29 },
    c27: { band: [152, 194, 76, 96], cross: [6, 2, 7, 5], seed: 6 },
    c28: { band: [154, 196, 76, 94], cross: [6, 2, 7, 5], seed: 24 },
    c29: { band: [160, 202, 74, 90], cross: [6, 2, 7, 5], seed: 24 },
    c30: { band: [166, 208, 72, 86], cross: [6, 2, 7, 5], seed: 16 },
  };
  const croDeepIds = ["c21", "c22", "c23", "c24"];
  const croSummitIds = ["c25", "c26", "c27", "c28", "c29", "c30"];
  const croBriefed = croDeepIds.concat(croSummitIds);
  check("game-glyph-crossing", "the deep and summit lanes are the forge's own output for their briefs",
    croBriefed.every((id) => {
      const level = croLevels.find((l) => l.id === id);
      const brief = croBriefs[id];
      const forgedLanes = crossing.forgeFord(
        { id: level.id, labelKey: level.labelKey, band: brief.band, cross: brief.cross },
        brief.seed * 7919 + brief.band[0] * 31 + brief.cross.length,
      ).lanes;
      return JSON.stringify(forgedLanes) === JSON.stringify(level.lanes);
    }),
    "a briefed rung's lanes drifted from its brief");

  /* ---- the summit: the quiet street closes, and the prover prices it ---- */
  const croSummit = croSummitIds.map((id) => croLevels.find((l) => l.id === id));
  const croF24 = croLevels.find((l) => l.id === "c24");

  /* The tier's shape: ten lanes everywhere in the summit and nowhere else,
   * all three streets mirrored, the tempo bands tightening rung over rung,
   * every fastest lane past the deep summit's 198 and every tightest window
   * under its 86 - with the records landing on c30. */
  const summitProblems = [];
  croSummit.forEach((level, index) => {
    if (level.lanes.length !== 10) {
      summitProblems.push(level.id + " fields " + level.lanes.length + " lanes");
    }
    [5, 6, 7].forEach((row) => {
      if (level.lanes.filter((lane) => lane.row === row).length !== 2) {
        summitProblems.push(level.id + " leaves street " + row + " one-way");
      }
    });
    if (!(croTop(level) > croTop(croF24))) {
      summitProblems.push(level.id + " top speed " + croTop(level) +
        " does not outrun the deep summit's " + croTop(croF24));
    }
    if (!(croTight(level) < croTight(croF24))) {
      summitProblems.push(level.id + " tightest gap " + croTight(level) +
        " does not dip under the deep summit's " + croTight(croF24));
    }
    const brief = croBriefs[level.id];
    if (index > 0) {
      const prev = croBriefs[croSummitIds[index - 1]];
      if (!(brief.band[0] > prev.band[0] && brief.band[1] > prev.band[1])) {
        summitProblems.push(level.id + " band does not outrun the rung before it");
      }
      if (!(brief.band[3] < prev.band[3] && brief.band[2] <= prev.band[2])) {
        summitProblems.push(level.id + " band does not tighten the windows");
      }
    }
  });
  if (!(croTop(croF24) === 198 && croTight(croF24) === 86)) {
    summitProblems.push("c24 is not the deep summit the tier is priced against");
  }
  if (!(croTop(croSummit[5]) === Math.max.apply(null, croLevels.map(croTop)))) {
    summitProblems.push("c30 does not hold the ladder's fastest lane");
  }
  if (!(croTight(croSummit[5]) === Math.min.apply(null, croLevels.map(croTight)))) {
    summitProblems.push("c30 does not hold the ladder's tightest window");
  }
  check("game-glyph-crossing",
    "the summit mirrors all three streets on ten lanes a rung, tightens the brief rung over rung, and lands the records on c30 (" +
      croSummit.map((l) => l.id + " top " + croTop(l) + "/gap " + croTight(l)).join(", ") +
      " vs c24 " + croTop(croF24) + "/" + croTight(croF24) + ")",
    summitProblems.length === 0, summitProblems.join(" | "));

  /* The tier only climbs in the prover's own currency: the cleanest route
   * lengthens rung over rung, opening past the deep summit's 66 ticks. */
  check("game-glyph-crossing",
    "the summit ladder only climbs: every rung's cleanest route is longer than c24's and the one before it",
    croSummit.every((l, index) => croRoutes[l.id] > croRoutes.c24 &&
      (index === 0 || croRoutes[l.id] > croRoutes[croSummit[index - 1].id])),
    croSummit.map((l) => l.id + ":" + croRoutes[l.id] + "t").join(" ") + " vs c24 " + croRoutes.c24 + "t");

  /* The summit bands are quoted, not guessed: each rung's three-star line is
   * its own measured route at the deep tier's own margin (48x), widened by
   * the same 1.5x / 2.05x steps, every line above the deep summit's, and
   * each far above the honest floor (the shipped 25x). */
  const bandProblems = [];
  croSummit.forEach((level) => {
    const exact = croRoutes[level.id] * 0.05 * 48;
    if (level.starTimes[0] !== Math.round(exact) ||
        level.starTimes[1] !== Math.round(exact * 1.5) ||
        level.starTimes[2] !== Math.round(exact * 2.05)) {
      bandProblems.push(level.id + " bands do not quote its route");
    }
    if (!(level.starTimes[0] > croF24.starTimes[0])) {
      bandProblems.push(level.id + " line sits below the deep summit's");
    }
    if (!(level.starTimes[0] >= 25 * croRoutes[level.id] * 0.05)) {
      bandProblems.push(level.id + " line dips under the honest floor");
    }
  });
  check("game-glyph-crossing",
    "the summit bands quote the prover's route at the deep tier's margin and climb past its line: " +
      croSummit.map((l) => l.id + ":" + l.starTimes.join("/")).join(" ") +
      " vs c24 " + croF24.starTimes.join("/"),
    bandProblems.length === 0, bandProblems.join(" | "));

  /* The mirrored streets are load-bearing by ablation. The twin is the same
   * ford with the row-7 train pulled - the street the deep summit left
   * quiet, and a nine-lane shape the deep tier itself fielded - every other
   * train untouched. The prover's own lethal() law counts row 7's rest
   * moments (a safe position at a tick, the walkable width at 2px, thirty
   * simulated seconds): the twin hands the street back thousands of them,
   * and its cleanest route collapses. */
  const RIVER_ROWS = [1, 2, 3];
  const ROAD_ROWS = [5, 6, 7];
  const CRO_CELL = 40;
  const CRO_WIDTH = CRO_CELL * 8;
  const croLethal = (props, row, x, time) => {
    if (x < CRO_CELL / 2 || x > CRO_WIDTH - CRO_CELL / 2) return true;
    const list = props.filter((p) => p.row === row);
    if (RIVER_ROWS.indexOf(row) !== -1) {
      return !list.some((p) => {
        const px = crossing.propAt(p, time);
        return x > px && x < px + p.len;
      });
    }
    if (ROAD_ROWS.indexOf(row) !== -1) {
      return list.some((p) => {
        const px = crossing.propAt(p, time);
        return x > px - 12 && x < px + p.len + 12;
      });
    }
    return false;
  };
  const croRest = (level, row) => {
    const props = crossing.spawnProps(level);
    let safe = 0;
    for (let t = 0; t < 600; t += 1) {
      for (let x = CRO_CELL / 2; x <= CRO_WIDTH - CRO_CELL / 2; x += 2) {
        if (!croLethal(props, row, x, t * 0.05)) safe += 1;
      }
    }
    return safe;
  };
  const ablationProblems = [];
  const ablationLines = [];
  croSummit.forEach((level) => {
    const twin = { id: level.id + "-twin", labelKey: level.labelKey,
      lanes: level.lanes.slice(0, 8).concat(level.lanes.slice(9)),
      starTimes: level.starTimes };
    if (twin.lanes.length !== 9 ||
        level.lanes.filter((lane) => lane.row === 7).length !== 2 ||
        twin.lanes.filter((lane) => lane.row === 7).length !== 1) {
      ablationProblems.push(level.id + " twin is not the row-7 pull");
      return;
    }
    const rest = croRest(level, 7);
    const twinRest = croRest(twin, 7);
    const twinRoute = crossing.checkFord(twin);
    const twinTicks = twinRoute.ok ? twinRoute.proof.ticks : -1;
    ablationLines.push(level.id + " +" + (twinRest - rest) + " rest moments, twin route " +
      (twinTicks < 0 ? "none" : twinTicks + "t vs " + croRoutes[level.id] + "t"));
    if (!(twinRest > rest)) {
      ablationProblems.push(level.id + ": the pulled train left row 7 as busy (" +
        rest + " vs " + twinRest + ")");
    }
    if (!(twinTicks < croRoutes[level.id])) {
      ablationProblems.push(level.id + ": the twin's cleanest route did not shorten");
    }
  });
  check("game-glyph-crossing",
    "pulling the row-7 train hands the street back its breathing room and shortens the cleanest route on every summit rung: " +
      ablationLines.join(", "),
    ablationProblems.length === 0, ablationProblems.join(" | "));

  /* The rung names travel with the ladder: both languages hold a real
   * string for every rung (c1-c20 from the shared dictionary, c21-c30 from
   * the module's own addStrings), and t() never falls back to the key. */
  check("game-glyph-crossing", "every rung name resolves in both languages",
    croLevels.every((l) =>
      App.I18N && App.I18N.en && App.I18N.en[l.labelKey] && App.I18N.zh && App.I18N.zh[l.labelKey] &&
      App.t(l.labelKey) !== l.labelKey),
    "a rung label fell back to its key");

  /* The unlock chain is derived, never stored, so it scales with the ladder:
   * clearing each rung in order must hand the player exactly the next one,
   * all thirty times, with nothing left locked behind the last. */
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
  check("game-glyph-crossing", "the unlock chain walks all thirty fords in order",
    croWalked === 30 && croChained && croChain.clearedCount() === 30,
    croWalked + " first clears");
};
