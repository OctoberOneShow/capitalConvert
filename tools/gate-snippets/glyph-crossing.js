"use strict";

/* game-glyph-crossing: every ford is proven, and the deep tier, summit,
 * deluge, flood and timetable are the hard tiers
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
 * nine-lane twin, whose cleanest route collapses.
 *
 * The deluge c31-c40 closes the river the summit left one-way: row 1, the
 * pad-side lane, runs both ways from c31 (eleven lanes, a first) and row 3
 * joins at c34 (twelve, the first board whose every row runs both ways).
 * One structural record a rung against every sheet before it, each a number
 * the engine printed - the lane count, the fastest lane, the tightest
 * window, the busiest spawner, the slowest lane, the longest clean route -
 * with the par lines (lanes, top speed, tightest gap, route, three-star
 * band) never falling inside the tier and every rung opening past the
 * summit's own 234 / 72 / 105t. The bands quote each route at the same 48x
 * margin. The river's traffic is load-bearing by the river's own ablation:
 * a river counter-train is platform as well as hazard, so pulling the row-1
 * train never shortens the cleanest route - what it hands back is measured
 * with the prover's own propAt arithmetic, row 1's sweep moments (the
 * log-stands that flush the frog off the board inside a second and a half),
 * which fall by 16,039 to 22,317 on every rung when the mirror goes.
 *
 * The timetable c45-c54 lays the ladder's first third trains - streets
 * only, in the order the campaign doubled them, with row 2 joining from
 * c48 - thirteen lanes a board then fourteen, the first fords past the
 * flood's twelve. The brief bands hold the floodgate's own, so the tier's
 * records are counted in trains and routes rather than clicks, and its
 * signature proof is the prover's own ablation: a street's third train is
 * load-bearing on every rung (pull it and the cleanest route always
 * shortens) while row 2's third train is shadow (pull it and no route
 * moves at all) - the deluge's river law read to its end, drawn rung by
 * rung by the same prover that priced the tier. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const crossing = require(path.join(root, "tools", "crossing-forge.js"));
  const croLevels = crossing.loadFords();

  check("game-glyph-crossing", "the ladder holds fifty-four fords",
    croLevels.length === 54, String(croLevels.length));
  check("game-glyph-crossing", "every ford id is distinct",
    new Set(croLevels.map((l) => l.id)).size === croLevels.length);
  check("game-glyph-crossing", "the ids run c1 through c54 in order",
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
   * under its 86 - with the first thirty's records landing on c30. */
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
  /* The records are scoped by position: the first thirty's fastest lane and
   * tightest window land on c30 - the deluge tier legitimately overtakes
   * both, and holds them from c40 on. */
  const croFirst30 = croLevels.slice(0, 30);
  if (!(croTop(croSummit[5]) === Math.max.apply(null, croFirst30.map(croTop)))) {
    summitProblems.push("c30 does not hold the first thirty's fastest lane");
  }
  if (!(croTight(croSummit[5]) === Math.min.apply(null, croFirst30.map(croTight)))) {
    summitProblems.push("c30 does not hold the first thirty's tightest window");
  }
  check("game-glyph-crossing",
    "the summit mirrors all three streets on ten lanes a rung, tightens the brief rung over rung, and lands the first thirty's records on c30 (" +
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

  /* ---- the deluge: the river closes, and the prover prices it ----
   * c31-c40 mirror the two river lanes every earlier ford left one-way -
   * row 1, the pad-side lane, from c31; row 3 from c34 - and take one
   * structural record a rung against every sheet before it. Everything
   * below is measured through the module's own engine: the prover's route
   * is the cleanest crossing, spawnProps counts the board the panel's own
   * spawner lays, and propAt drives the sweep law that ablates the new
   * trains. The records are scoped by position - later rungs legitimately
   * overtake earlier ones. */
  const croDelugeIds = ["c31", "c32", "c33", "c34", "c35", "c36", "c37", "c38", "c39", "c40"];
  const croDeluge = croDelugeIds.map((id) => croLevels.find((l) => l.id === id));
  const croF30 = croLevels.find((l) => l.id === "c30");
  check("game-glyph-crossing", "the deluge is present",
    croDeluge.length === 10, croDeluge.map((l) => l.id).join(","));

  /* Provenance, the deep tier's way: the shipped lanes are the forge's own
   * output for each rung's brief, at the seed the brief pins - not
   * hand-tuned neighbours of it. `node tools/crossing-forge.js forge c31`
   * regenerates the rung. */
  const croDelugeBriefs = {
    c31: { band: [172, 214, 70, 84], cross: [6, 2, 7, 5, 1], seed: 12 },
    c32: { band: [178, 220, 68, 82], cross: [6, 2, 7, 5, 1], seed: 54 },
    c33: { band: [184, 226, 66, 80], cross: [6, 2, 7, 5, 1], seed: 26 },
    c34: { band: [190, 232, 64, 78], cross: [6, 2, 7, 5, 1, 3], seed: 17 },
    c35: { band: [196, 238, 62, 76], cross: [6, 2, 7, 5, 1, 3], seed: 84 },
    c36: { band: [202, 244, 60, 74], cross: [6, 2, 7, 5, 1, 3], seed: 85 },
    c37: { band: [208, 250, 58, 72], cross: [6, 2, 7, 5, 1, 3], seed: 65 },
    c38: { band: [214, 256, 56, 70], cross: [6, 2, 7, 5, 1, 3], seed: 40 },
    c39: { band: [220, 262, 54, 68], cross: [6, 2, 7, 5, 1, 3], seed: 20 },
    c40: { band: [226, 268, 52, 66], cross: [6, 2, 7, 5, 1, 3], seed: 54 },
  };
  check("game-glyph-crossing", "the deluge lanes are the forge's own output for their briefs",
    croDelugeIds.every((id) => {
      const level = croLevels.find((l) => l.id === id);
      const brief = croDelugeBriefs[id];
      const forgedLanes = crossing.forgeFord(
        { id: level.id, labelKey: level.labelKey, band: brief.band, cross: brief.cross },
        brief.seed * 7919 + brief.band[0] * 31 + brief.cross.length,
      ).lanes;
      return JSON.stringify(forgedLanes) === JSON.stringify(level.lanes);
    }),
    "a deluge rung's lanes drifted from its brief");

  /* The tier's shape: eleven lanes through c33, twelve from c34 on and
   * nowhere before, the pad-side lane mirrored on every rung and row 3
   * from c34 - streets no earlier ford ever doubled - and from c34 every
   * row on the board runs both ways. */
  const croDoubled = (l) => [1, 2, 3, 5, 6, 7].filter((row) =>
    l.lanes.filter((lane) => lane.row === row).length === 2);
  check("game-glyph-crossing",
    "the deluge fields eleven lanes through c33 and twelve from c34, mirrors row 1 throughout and row 3 from c34, and no earlier ford mirrors either",
    croDeluge.every((l, index) =>
      l.lanes.length === (index < 3 ? 11 : 12) &&
      croDoubled(l).indexOf(1) !== -1 &&
      (index < 3
        ? croDoubled(l).indexOf(3) === -1 && croDoubled(l).length === 5
        : croDoubled(l).length === 6)) &&
    croFirst30.every((l) => croDoubled(l).indexOf(1) === -1 && croDoubled(l).indexOf(3) === -1),
    croDeluge.map((l) => l.id + ":" + l.lanes.length + "L doubled " + croDoubled(l).join("/")).join(" "));

  /* The tier only climbs: lanes, top speed, three-star band and cleanest
   * route never fall rung over rung, the tightest window never loosens,
   * and the whole tier opens past the summit's own 234 / 72 / 105t / 252s.
   * (The spawner's prop count is not a difficulty line - it follows the
   * rolled lane spans - and its measured dip after c35 is the record's own
   * cost, pinned in the tier comment.) */
  const croMin = (l) => Math.min(...l.lanes.map((lane) => lane.speed));
  const croProps = (l) => crossing.spawnProps(l).length;
  const croNeverFalls = (list) => list.every((n, i) => i === 0 || n >= list[i - 1]);
  const croNeverLoosens = (list) => list.every((n, i) => i === 0 || n <= list[i - 1]);
  check("game-glyph-crossing",
    "the deluge's lanes, top speed, three-star band and cleanest route never fall and its tightest window never loosens, opening past the summit's own",
    croNeverFalls(croDeluge.map((l) => l.lanes.length)) &&
    croNeverFalls(croDeluge.map(croTop)) &&
    croNeverLoosens(croDeluge.map(croTight)) &&
    croNeverFalls(croDeluge.map((l) => croRoutes[l.id])) &&
    croNeverFalls(croDeluge.map((l) => l.starTimes[0])) &&
    croTop(croDeluge[0]) > croTop(croF30) && croTight(croDeluge[0]) < croTight(croF30) &&
    croRoutes.c31 > croRoutes.c30 && croDeluge[0].starTimes[0] > croF30.starTimes[0],
    `top ${croDeluge.map(croTop).join("/")} vs ${croTop(croF30)}, gap ` +
      `${croDeluge.map(croTight).join("/")} vs ${croTight(croF30)}, ` +
      `route ${croDelugeIds.map((id) => croRoutes[id]).join("/")}t vs ${croRoutes.c30}t, ` +
      `band ${croDeluge.map((l) => l.starTimes[0]).join("/")} vs ${croF30.starTimes[0]}`);

  /* The measured lines, quoted exactly as the engine printed them. */
  check("game-glyph-crossing",
    "the deluge's top speeds, windows and cleanest routes are exactly the prover's printout",
    JSON.stringify(croDeluge.map(croTop)) === JSON.stringify([236, 238, 240, 256, 260, 270, 272, 282, 286, 292]) &&
    JSON.stringify(croDeluge.map(croTight)) === JSON.stringify([68, 68, 64, 64, 62, 60, 58, 58, 52, 48]) &&
    JSON.stringify(croDelugeIds.map((id) => croRoutes[id])) ===
      JSON.stringify([109, 113, 113, 114, 155, 159, 160, 163, 169, 170]),
    "top " + croDeluge.map(croTop).join("/") + ", gap " + croDeluge.map(croTight).join("/") +
      ", route " + croDelugeIds.map((id) => croRoutes[id]).join("/") + "t");

  /* One record a rung against every sheet before it, each pinned to the
   * number the engine measured: c31 the first eleven-lane ford, c32 the
   * fastest lane yet, c33 the narrowest window yet, c34 the first
   * twelve-lane ford on an all-both-ways river, c35 the busiest spawner
   * (still the ladder's peak when the deluge closes), c36 the first ford
   * with no lane under 200, c37 the narrowest window again, c38 the
   * longest clean route yet, c39 the pace record again, c40 the capstone
   * holding the pace, window and route lines at once. */
  const croPeakOf = (list, fn) => Math.max.apply(null, list.map(fn));
  const croValleyOf = (list, fn) => Math.min.apply(null, list.map(fn));
  const croBefore = (level) => croLevels.slice(0, croLevels.indexOf(level));
  const croProblems = [];
  croDeluge.forEach((level) => {
    const before = croBefore(level);
    const id = level.id;
    if (id === "c31" || id === "c34") {
      const want = id === "c31" ? 11 : 12;
      if (!(level.lanes.length === want &&
          croPeakOf(before, (l) => l.lanes.length) === want - 1)) {
        croProblems.push(id + " is not the first " + want + "-lane ford");
      }
    }
    if (id === "c32" || id === "c39") {
      if (!(croTop(level) > croPeakOf(before, croTop))) {
        croProblems.push(id + " top " + croTop(level) + " does not outrun every sheet before it");
      }
    }
    if (id === "c33" || id === "c37") {
      if (!(croTight(level) < croValleyOf(before, croTight))) {
        croProblems.push(id + " gap " + croTight(level) + " does not dip under every sheet before it");
      }
    }
    if (id === "c34" && croDoubled(level).length !== 6) {
      croProblems.push("c34 is not the first all-both-ways board");
    }
    if (id === "c35") {
      if (!(croProps(level) > croPeakOf(before, croProps))) {
        croProblems.push("c35 spawns " + croProps(level) + " props, not a record");
      }
      if (!(croProps(level) === croPeakOf(croLevels.slice(0, 40), croProps))) {
        croProblems.push("c35's spawner peak does not stand through the deluge");
      }
    }
    if (id === "c36" && !(croMin(level) > croPeakOf(before, croMin))) {
      croProblems.push("c36's slowest lane " + croMin(level) + " does not outrun every sheet before it");
    }
    if (id === "c38" && !(croRoutes.c38 > croPeakOf(before, (l) => croRoutes[l.id]))) {
      croProblems.push("c38's cleanest route " + croRoutes.c38 + "t is not a record");
    }
    if (id === "c40") {
      if (!(croTop(level) > croPeakOf(before, croTop) &&
          croTight(level) < croValleyOf(before, croTight) &&
          croRoutes.c40 > croPeakOf(before, (l) => croRoutes[l.id]))) {
        croProblems.push("c40 does not hold the pace, window and route lines at once");
      }
    }
  });
  check("game-glyph-crossing",
    "each deluge rung holds its measured record: lanes " +
      croDeluge.map((l) => l.lanes.length).join("/") + ", top " + croDeluge.map(croTop).join("/") +
      ", gap " + croDeluge.map(croTight).join("/") + ", slowest " + croDeluge.map(croMin).join("/") +
      ", props " + croDeluge.map(croProps).join("/") + ", route " +
      croDelugeIds.map((id) => croRoutes[id]).join("/") + "t",
    croProblems.length === 0, croProblems.join(" | "));

  /* The deluge bands are quoted, not guessed: each rung's three-star line
   * is its own measured route at the deep tier's margin (48x), widened by
   * the same 1.5x / 2.05x steps, every line above the summit's. */
  check("game-glyph-crossing",
    "the deluge bands quote the prover's route at the deep tier's margin and climb past the summit's line: " +
      croDeluge.map((l) => l.id + ":" + l.starTimes.join("/")).join(" ") +
      " vs c30 " + croF30.starTimes.join("/"),
    croDeluge.every((l) => {
      const exact = croRoutes[l.id] * 0.05 * 48;
      return l.starTimes[0] === Math.round(exact) &&
        l.starTimes[1] === Math.round(exact * 1.5) &&
        l.starTimes[2] === Math.round(exact * 2.05) &&
        l.starTimes[0] > croF30.starTimes[0];
    }),
    "a deluge band does not quote its route");

  /* The river's own ablation law. On a road row, pulling a train adds rest
   * moments - the summit's law. On a river row the train is platform as
   * well as hazard, so the rest law reads backwards and the cleanest route
   * never moves. The law that holds is sweep: log-stands (x, t) the
   * prover's own propAt arithmetic carries off the board within a second
   * and a half. Pull the row-1 counter-train - the mirrored pad-side lane
   * - and row 1's sweep falls by 16,039 to 22,317 on every deluge rung:
   * the mirror is what floods the street, never decorative. */
  const croSweep = (level, row) => {
    const props = crossing.spawnProps(level).filter((p) => p.row === row);
    let n = 0;
    for (let t = 0; t < 600; t += 1) {
      for (let x = CRO_CELL / 2; x <= CRO_WIDTH - CRO_CELL / 2; x += 2) {
        const hit = props.find((p) => {
          const px = crossing.propAt(p, t * 0.05);
          return x > px && x < px + p.len;
        });
        if (hit) {
          const out = x + hit.dir * hit.speed * 1.5;
          if (out < CRO_CELL / 2 || out > CRO_WIDTH - CRO_CELL / 2) n += 1;
        }
      }
    }
    return n;
  };
  const croSweepLines = [];
  const croSweepProblems = [];
  croDeluge.forEach((level) => {
    /* The row-1 pull: the mirrored train is the only fast row-1 lane past
     * the base six, so the twin leaves the summit's own pad-side lane. */
    const cut = level.lanes.findIndex((lane, i) =>
      i >= 6 && lane.row === 1 && lane.speed >= croDelugeBriefs[level.id].band[0] + 10);
    const twin = { id: level.id + "-twin", labelKey: level.labelKey,
      lanes: level.lanes.slice(0, cut).concat(level.lanes.slice(cut + 1)),
      starTimes: level.starTimes };
    if (cut !== 10 || twin.lanes.length !== level.lanes.length - 1 ||
        level.lanes.filter((lane) => lane.row === 1).length !== 2 ||
        twin.lanes.filter((lane) => lane.row === 1).length !== 1) {
      croSweepProblems.push(level.id + " twin is not the row-1 pull");
      return;
    }
    const sweep = croSweep(level, 1);
    const twinSweep = croSweep(twin, 1);
    croSweepLines.push(level.id + " -" + (sweep - twinSweep) +
      " sweep moments (" + sweep + " -> " + twinSweep + ")");
    if (!(sweep - twinSweep >= 16039 && sweep - twinSweep <= 22317)) {
      croSweepProblems.push(level.id + ": the pulled train's sweep delta " +
        (sweep - twinSweep) + " is off the measured 16,039-22,317 band");
    }
    if (twinSweep >= sweep) {
      croSweepProblems.push(level.id + ": the pulled train left row 1 as swept");
    }
  });
  check("game-glyph-crossing",
    "pulling the row-1 train off each deluge rung drops the pad-side street's sweep moments, the prover's own propAt law: " +
      croSweepLines.join(", "),
    croSweepProblems.length === 0, croSweepProblems.join(" | "));

  /* ---- the flood c41-c44: the river keeps rising past the deluge ----
   * The same forge, the same prover, one structural record a rung against
   * every sheet before it: c41 the first lane past the deluge's 292 pace,
   * c42 the first window under the deluge's 48 floor, c43 the first ford
   * with no lane under 250, and c44 the capstone holding the pace, window
   * and route lines at once. The par lines never fall inside the tier, the
   * bands quote each route at the deep tier's own 48x margin, and the
   * spawner stays under c35's standing peak. */
  const croFloodIds = ['c41', 'c42', 'c43', 'c44'];
  const croFlood = croFloodIds.map((id) => croLevels.find((l) => l.id === id));
  const croF40 = croLevels.find((l) => l.id === 'c40');
  check('game-glyph-crossing', 'the flood is present',
    croFlood.length === 4, croFlood.map((l) => l.id).join(','));

  /* Provenance: the shipped lanes are the forge's own output for each
   * rung's brief, at the seed the brief pins. */
  const croFloodBriefs = {
    c41: { band: [232, 274, 50, 64], cross: [6, 2, 7, 5, 1, 3], seed: 257 },
    c42: { band: [238, 280, 48, 62], cross: [6, 2, 7, 5, 1, 3], seed: 59 },
    c43: { band: [244, 286, 46, 60], cross: [6, 2, 7, 5, 1, 3], seed: 159 },
    c44: { band: [250, 292, 44, 58], cross: [6, 2, 7, 5, 1, 3], seed: 127 },
  };
  check("game-glyph-crossing", "the flood lanes are the forge's own output for their briefs",
    croFloodIds.every((id) => {
      const level = croLevels.find((l) => l.id === id);
      const brief = croFloodBriefs[id];
      const forgedLanes = crossing.forgeFord(
        { id: level.id, labelKey: level.labelKey, band: brief.band, cross: brief.cross },
        brief.seed * 7919 + brief.band[0] * 31 + brief.cross.length,
      ).lanes;
      return JSON.stringify(forgedLanes) === JSON.stringify(level.lanes);
    }),
    "a flood rung's lanes drifted from its brief");

  /* The tier's shape: twelve lanes everywhere - every row on the board
   * running both ways, as the deluge closed - and nowhere before. */
  check('game-glyph-crossing',
    'the flood fields twelve lanes a rung with every row doubled, and the deluge closed at twelve',
    croFlood.every((l) => l.lanes.length === 12 && croDoubled(l).length === 6) &&
      croDeluge.slice(3).every((l) => l.lanes.length === 12) &&
      croDeluge.slice(0, 3).every((l) => l.lanes.length === 11),
    croFlood.map((l) => l.id + ':' + l.lanes.length + 'L doubled ' + croDoubled(l).join('/')).join(' '));

  /* The tier only climbs: lanes, top speed, three-star band and cleanest
   * route never fall, the tightest window never loosens, and the whole tier
   * opens past the deluge's own 292 / 48 / 170t / 408s. */
  check('game-glyph-crossing',
    "the flood's lanes, top speed, three-star band and cleanest route never fall and its tightest window never loosens, opening past the deluge's own",
    croNeverFalls(croFlood.map((l) => l.lanes.length)) &&
    croNeverFalls(croFlood.map(croTop)) &&
    croNeverLoosens(croFlood.map(croTight)) &&
    croNeverFalls(croFlood.map((l) => croRoutes[l.id])) &&
    croNeverFalls(croFlood.map((l) => l.starTimes[0])) &&
    croTop(croFlood[0]) > croTop(croF40) && croTight(croFlood[0]) <= croTight(croF40) &&
    croRoutes.c41 > croRoutes.c40 && croFlood[0].starTimes[0] > croF40.starTimes[0],
    'top ' + croFlood.map(croTop).join('/') + ' vs ' + croTop(croF40) + ', gap ' +
      croFlood.map(croTight).join('/') + ' vs ' + croTight(croF40) + ', route ' +
      croFloodIds.map((id) => croRoutes[id]).join('/') + 't vs ' + croRoutes.c40 + 't, ' +
      'band ' + croFlood.map((l) => l.starTimes[0]).join('/') + ' vs ' + croF40.starTimes[0]);

  /* One record a rung against every sheet before it, each measured: */
  const croFloodProblems = [];
  croFlood.forEach((level) => {
    const before = croBefore(level);
    const id = level.id;
    if (id === 'c41' && !(croTop(level) > croPeakOf(before, croTop))) {
      croFloodProblems.push('c41 top ' + croTop(level) + ' does not outrun every sheet before it');
    }
    if (id === 'c42' && !(croTight(level) < croValleyOf(before, croTight))) {
      croFloodProblems.push('c42 gap ' + croTight(level) + ' does not dip under every sheet before it');
    }
    if (id === 'c43' && !(croMin(level) > croPeakOf(before, croMin))) {
      croFloodProblems.push('c43 slowest lane ' + croMin(level) + ' does not outrun every sheet before it');
    }
    if (id === 'c44') {
      if (!(croTop(level) > croPeakOf(before, croTop) &&
          croTight(level) < croValleyOf(before, croTight) &&
          croRoutes.c44 > croPeakOf(before, (l) => croRoutes[l.id]))) {
        croFloodProblems.push('c44 does not hold the pace, window and route lines at once');
      }
    }
  });
  check('game-glyph-crossing',
    'each flood rung holds its measured record: top ' + croFlood.map(croTop).join('/') +
      ', gap ' + croFlood.map(croTight).join('/') + ', slowest ' + croFlood.map(croMin).join('/') +
      ', route ' + croFloodIds.map((id) => croRoutes[id]).join('/') + 't',
    croFloodProblems.length === 0, croFloodProblems.join(' | '));

  /* The flood bands quote the prover's route at the deep tier's margin and
   * climb past the deluge's line: */
  check('game-glyph-crossing',
    "the flood bands quote the prover's route at the deep tier's margin and climb past the deluge's line: " +
      croFlood.map((l) => l.id + ':' + l.starTimes.join('/')).join(' ') +
      ' vs c40 ' + croF40.starTimes.join('/'),
    croFlood.every((l) => {
      const exact = croRoutes[l.id] * 0.05 * 48;
      return l.starTimes[0] === Math.round(exact) &&
        l.starTimes[1] === Math.round(exact * 1.5) &&
        l.starTimes[2] === Math.round(exact * 2.05) &&
        l.starTimes[0] > croF40.starTimes[0];
    }),
    'a flood band does not quote its route');

  /* ---- the timetable c45-c54: the third train, and the water line ----
   * Every ford the campaign has ever shipped runs at most two trains per
   * row, so the tier lays the third - streets only, in the order the
   * campaign doubled them (row 6 at c45, row 7 at c46, row 5 at c47; row
   * 2, the first doubled river, beside them from c48) - thirteen lanes a
   * board, then fourteen, the first fords past the flood's twelve. The
   * brief bands hold the floodgate's own 232/274/50/64 (238/280/48/62 from
   * c51, 244/286/46/60 at the capstone), so the tier's records are counted
   * in trains and routes, not clicks: no rung's fastest lane passes the
   * Cataract's 312, the windows open at 52 - two clicks looser than the
   * flood closed, an honest cost the tier comment pins - and the spawner
   * leaves the Logjam's 60 behind for good. The signature proof is the
   * prover's own ablation: pulling a street's third train always shortens
   * the cleanest route, while pulling row 2's third train moves no route
   * at all - the deluge's river law read to its end, a river's third train
   * is shadow, and rows 1 and 3 stay doubled because of it. */
  const croTimetableIds = ["c45", "c46", "c47", "c48", "c49", "c50", "c51", "c52", "c53", "c54"];
  const croTimetable = croTimetableIds.map((id) => croLevels.find((l) => l.id === id));
  const croF44 = croLevels.find((l) => l.id === "c44");
  check("game-glyph-crossing", "the timetable is present",
    croTimetable.length === 10, croTimetable.map((l) => l.id).join(","));

  /* Provenance: the shipped lanes are the forge's own output for each
   * rung's brief, at the seed the brief pins. `node
   * tools/crossing-forge.js forge c45` regenerates the rung. */
  const croTimetableBriefs = {
    c45: { band: [232, 274, 50, 64], cross: [6, 2, 7, 5, 1, 3, 6], seed: 1 },
    c46: { band: [232, 274, 50, 64], cross: [6, 2, 7, 5, 1, 3, 7], seed: 1 },
    c47: { band: [232, 274, 50, 64], cross: [6, 2, 7, 5, 1, 3, 5], seed: 1 },
    c48: { band: [232, 274, 50, 64], cross: [6, 2, 7, 5, 1, 3, 6, 2], seed: 52 },
    c49: { band: [232, 274, 50, 64], cross: [6, 2, 7, 5, 1, 3, 7, 2], seed: 36 },
    c50: { band: [232, 274, 50, 64], cross: [6, 2, 7, 5, 1, 3, 5, 2], seed: 28 },
    c51: { band: [238, 280, 48, 62], cross: [6, 2, 7, 5, 1, 3, 6, 2], seed: 42 },
    c52: { band: [238, 280, 48, 62], cross: [6, 2, 7, 5, 1, 3, 7, 2], seed: 21 },
    c53: { band: [238, 280, 48, 62], cross: [6, 2, 7, 5, 1, 3, 5, 2], seed: 32 },
    c54: { band: [244, 286, 46, 60], cross: [6, 2, 7, 5, 1, 3, 6, 2], seed: 44 },
  };
  check("game-glyph-crossing", "the timetable lanes are the forge's own output for their briefs",
    croTimetableIds.every((id) => {
      const level = croLevels.find((l) => l.id === id);
      const brief = croTimetableBriefs[id];
      const forgedLanes = crossing.forgeFord(
        { id: level.id, labelKey: level.labelKey, band: brief.band, cross: brief.cross },
        brief.seed * 7919 + brief.band[0] * 31 + brief.cross.length,
      ).lanes;
      return JSON.stringify(forgedLanes) === JSON.stringify(level.lanes);
    }),
    "a timetable rung's lanes drifted from its brief");

  /* The tier's shape: one tripled row a rung through c47 - streets only,
   * in the campaign's own doubling order 6, 7, 5 - and from c48 a second
   * on row 2, the first doubled river, so the rung is fourteen lanes wide
   * with the street cycling 6, 7, 5 and the capstone back to row 6. No
   * earlier ford triples a row or fields thirteen lanes. */
  const croTripled = (l) => [1, 2, 3, 5, 6, 7].filter((row) =>
    l.lanes.filter((lane) => lane.row === row).length === 3);
  const croTimetableProblems = [];
  croTimetable.forEach((level, index) => {
    const wantLanes = index < 3 ? 13 : 14;
    const wantStreet = [6, 7, 5, 6, 7, 5, 6, 7, 5, 6][index];
    if (level.lanes.length !== wantLanes) {
      croTimetableProblems.push(level.id + " fields " + level.lanes.length + " lanes");
    }
    const tripled = croTripled(level);
    if (index < 3) {
      if (JSON.stringify(tripled) !== JSON.stringify([wantStreet])) {
        croTimetableProblems.push(level.id + " triples " + tripled.join("/") +
          ", not exactly street " + wantStreet);
      }
    } else if (JSON.stringify(tripled) !== JSON.stringify([wantStreet, 2].sort((a, b) => a - b))) {
      croTimetableProblems.push(level.id + " triples " + tripled.join("/") +
        ", not streets " + wantStreet + " and 2");
    }
  });
  if (!croLevels.slice(0, 44).every((l) => l.lanes.length <= 12 && croTripled(l).length === 0)) {
    croTimetableProblems.push("a ford before c45 already triples a row or passes twelve lanes");
  }
  check("game-glyph-crossing",
    "the timetable triples streets 6/7/5 in the campaign's doubling order, adds row 2 from c48, and no earlier ford triples anything",
    croTimetableProblems.length === 0, croTimetableProblems.join(" | "));

  /* The tier only climbs in the prover's own currency: the cleanest route
   * rises rung over rung, the lane count and three-star band never fall,
   * the tightest window never loosens, and the whole tier opens past the
   * flood's own 224t / 12L / 60 props / 538s. The rolled fastest lane is
   * the express dice inside the held bands (290-306, never past the
   * Cataract's 312) and is quoted here, not asserted. */
  check("game-glyph-crossing",
    "the timetable's lanes, three-star band and cleanest route never fall and its tightest window never loosens, opening past the flood's own",
    croNeverFalls(croTimetable.map((l) => l.lanes.length)) &&
    croNeverLoosens(croTimetable.map(croTight)) &&
    croNeverFalls(croTimetable.map((l) => croRoutes[l.id])) &&
    croNeverFalls(croTimetable.map((l) => l.starTimes[0])) &&
    croRoutes.c45 > croRoutes.c44 && croTimetable[0].lanes.length > croF44.lanes.length &&
    croProps(croTimetable[0]) > croProps(croF44) && croTimetable[0].starTimes[0] > croF44.starTimes[0],
    "route " + croTimetableIds.map((id) => croRoutes[id]).join("/") + "t vs " + croRoutes.c44 + "t, " +
      "lanes " + croTimetable.map((l) => l.lanes.length).join("/") + " vs " + croF44.lanes.length +
      ", props " + croTimetable.map(croProps).join("/") + " vs " + croProps(croF44) +
      ", gap " + croTimetable.map(croTight).join("/") + " vs " + croTight(croF44) +
      ", band " + croTimetable.map((l) => l.starTimes[0]).join("/") + " vs " + croF44.starTimes[0]);

  /* One record a rung, each measured: c45 the first thirteen-lane ford and
   * the rung that takes the spawner past the Logjam's standing 60, c48 the
   * first fourteen-lane ford, c53 the tier's fastest lane and the ladder's
   * busiest spawner together, c54 the capstone holding the longest
   * cleanest route the prover has ever measured. Every rung's spawner
   * clears the Logjam's line, which the flood only matched. */
  const croTimetableRecords = [];
  const croF45 = croTimetable[0];
  if (!(croF45.lanes.length === 13 && croPeakOf(croBefore(croF45), (l) => l.lanes.length) === 12)) {
    croTimetableRecords.push("c45 is not the first thirteen-lane ford");
  }
  if (!(croProps(croF45) > croPeakOf(croBefore(croF45), croProps))) {
    croTimetableRecords.push("c45 spawns " + croProps(croF45) + " props, not a record");
  }
  const croF48 = croTimetable[3];
  if (!(croF48.lanes.length === 14 && croPeakOf(croBefore(croF48), (l) => l.lanes.length) === 13)) {
    croTimetableRecords.push("c48 is not the first fourteen-lane ford");
  }
  if (!croTimetable.every((l) => croProps(l) > 60)) {
    croTimetableRecords.push("a timetable rung's spawner dips under the Logjam's 60");
  }
  const croF53 = croTimetable[8];
  if (!(croTop(croF53) === Math.max.apply(null, croTimetable.map(croTop)) &&
      croProps(croF53) === croPeakOf(croLevels, croProps))) {
    croTimetableRecords.push("c53 does not hold the tier's pace peak and the ladder's spawner peak together");
  }
  const croF54 = croTimetable[9];
  if (!(croRoutes.c54 > croPeakOf(croBefore(croF54), (l) => croRoutes[l.id]) &&
      croRoutes.c54 === Math.max.apply(null, croLevels.map((l) => croRoutes[l.id])))) {
    croTimetableRecords.push("c54 does not hold the ladder's longest cleanest route");
  }
  check("game-glyph-crossing",
    "each timetable rung holds its measured record: lanes " +
      croTimetable.map((l) => l.lanes.length).join("/") + ", top " + croTimetable.map(croTop).join("/") +
      ", gap " + croTimetable.map(croTight).join("/") + ", props " + croTimetable.map(croProps).join("/") +
      ", route " + croTimetableIds.map((id) => croRoutes[id]).join("/") + "t",
    croTimetableRecords.length === 0, croTimetableRecords.join(" | "));

  /* The tier's signature proof, rung by rung: the prover's own ablation
   * draws the water line. Pull a street's third train and the twin always
   * routes strictly shorter - the third train is the tier's whole
   * difficulty (+52t on row 6, +58t on row 7, +263t on the median street
   * through the 13-lane rungs, 121t to 594t across the 14-lane ones). Pull
   * row 2's third train and the route holds tick for tick on every
   * fourteen-lane rung - the river's third train is shadow, the deluge's
   * law at its limit, and the reason rows 1 and 3 ship doubled. */
  const croAblationLines = [];
  const croAblationProblems = [];
  croTimetable.forEach((level) => {
    const brief = croTimetableBriefs[level.id];
    const streetRow = brief.cross[6];
    const rowOf = (row) => level.lanes
      .map((lane, i) => lane.row === row ? i : -1).filter((i) => i >= 0);
    const streetIdx = rowOf(streetRow)[2];
    const twin = { id: level.id + "-twin", labelKey: level.labelKey,
      lanes: level.lanes.slice(0, streetIdx).concat(level.lanes.slice(streetIdx + 1)),
      starTimes: level.starTimes };
    const route = croRoutes[level.id];
    const streetReport = crossing.checkFord(twin);
    if (!streetReport.ok) {
      croAblationProblems.push(level.id + ": the street-pull twin is stranded, not easier");
      return;
    }
    const streetTicks = streetReport.proof.ticks;
    croAblationLines.push(level.id + " street pull " + route + "t -> " + streetTicks + "t");
    if (streetTicks >= route) {
      croAblationProblems.push(level.id + ": pulling street " + streetRow +
        "'s third train did not shorten the route (" + route + "t vs " + streetTicks + "t)");
    }
    if (level.lanes.length === 14) {
      if (rowOf(2).length !== 3 || level.lanes[13].row !== 2) {
        croAblationProblems.push(level.id + " is not the row-2 + street shape the twin needs");
        return;
      }
      const riverTwin = { id: level.id + "-river-twin", labelKey: level.labelKey,
        lanes: level.lanes.slice(0, 13), starTimes: level.starTimes };
      const riverReport = crossing.checkFord(riverTwin);
      if (!riverReport.ok) {
        croAblationProblems.push(level.id + ": the row-2 pull stranded the board");
        return;
      }
      croAblationLines.push("river pull " + riverReport.proof.ticks + "t (shadow)");
      if (riverReport.proof.ticks !== route) {
        croAblationProblems.push(level.id + ": pulling row 2's third train moved the route (" +
          route + "t vs " + riverReport.proof.ticks + "t) - the shadow law broke");
      }
    }
  });
  check("game-glyph-crossing",
    "the prover's own ablation draws the water line on every timetable rung: " +
      croAblationLines.join(", "),
    croAblationProblems.length === 0, croAblationProblems.join(" | "));

  /* The timetable bands are quoted, not guessed: each rung's three-star
   * line is its own measured route at the deep tier's margin (48x),
   * widened by the same 1.5x / 2.05x steps, every line above the flood's. */
  check("game-glyph-crossing",
    "the timetable bands quote the prover's route at the deep tier's margin and climb past the flood's line: " +
      croTimetable.map((l) => l.id + ":" + l.starTimes.join("/")).join(" ") +
      " vs c44 " + croF44.starTimes.join("/"),
    croTimetable.every((l) => {
      const exact = croRoutes[l.id] * 0.05 * 48;
      return l.starTimes[0] === Math.round(exact) &&
        l.starTimes[1] === Math.round(exact * 1.5) &&
        l.starTimes[2] === Math.round(exact * 2.05) &&
        l.starTimes[0] > croF44.starTimes[0];
    }),
    "a timetable band does not quote its route");

  /* The rung names travel with the ladder: both languages hold a real
   * string for every rung (c1-c20 from the shared dictionary, c21-c40 from
   * the module's own addStrings), and t() never falls back to the key. */
  check("game-glyph-crossing", "every rung name resolves in both languages",
    croLevels.every((l) =>
      App.I18N && App.I18N.en && App.I18N.en[l.labelKey] && App.I18N.zh && App.I18N.zh[l.labelKey] &&
      App.t(l.labelKey) !== l.labelKey),
    "a rung label fell back to its key");

  /* The unlock chain is derived, never stored, so it scales with the ladder:
   * clearing each rung in order must hand the player exactly the next one,
   * all forty times, with nothing left locked behind the last. */
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
  check("game-glyph-crossing", "the unlock chain walks all fifty-four fords in order",
    croWalked === 54 && croChained && croChain.clearedCount() === 54,
    croWalked + " first clears");
};
