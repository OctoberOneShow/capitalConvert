"use strict";

/* game-blind-sculptor: the deep tier moves the door to an axis the ladder
 * never closed on, and the studio's own candidate counter sits witness on
 * every deal.
 *
 * Size, fog, submissions, flavour coincidence and the one-door shelf solid
 * were all spent by b20, and thirteen blocks on two shelves benches easier
 * on structure (its doors climb back to 1.21), so the tier's lever is the
 * axis itself: rungs 21-24 deal "wall" and "hollow" solids - every block
 * inside two slices of one vertical axis the rung's note names, all three
 * heights occupied - so the pair of cuts that pins the solid has left the
 * height axis for good and the shelf habit from rungs 11-20 cannot even
 * reach the star line. That lever is structural: no shipped rung carries the
 * flavour, and the flavour's five facts (both planes alive but never packed,
 * each plane spanning every column of its axis and two heights at least, no
 * height squeezed into one column) close every door that touches the height
 * axis or a perpendicular plane. The gate holds the tier to the engine's own
 * currency: each rung's dealt stream is replayed exactly as loadRound deals
 * it (the module's Lehmer stream, no Math.random to pin), every deal is
 * proved through sculptorCandidates - no single slice closes, exactly one
 * pair does, and that pair never touches a height slice - the star bands
 * are the engine's par with the shipped slack, a shelf-habit line and a
 * hollow-bait line are benched to two stars, and the top band is reachable
 * (the pair closes) but not free (thirty-five of thirty-six pairs do not).
 *
 * The summit tier b25-b30 spends the two levers the deep tier left, and the
 * gate prices them through the same machinery. The size climbs to thirteen
 * blocks - the cube's fog ceiling, 20,058,300 solids before the first probe,
 * a number fourteen can match but never use (the greedy opens on the empty
 * plane at fourteen, so no par-2 deal ever lands and the dealer falls back
 * to its staircase) - and the note stops naming the axis: b26, b27, b28 and
 * b30 carry no axis field, so the pool deals front or side as it pleases and
 * six vertical pairs must be ruled out instead of three. Every summit stream
 * is replayed exactly as loadRound deals it: each deal is proved a wall on
 * one vertical axis (the gate finds which), par 2 with exactly one closing
 * pair among the 36 and never a height slice, the hollow rungs read their
 * unlabeled middle slice empty on the door's own axis, the bands pay the
 * pair three stars, the sweep two and past the budget nothing, and the
 * mechanic is cut out of a copy of every rung: strip the thinnest height
 * from the dealt solid and a height door opens - the wall contract, not the
 * fog, is what forces the vertical pair. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.sculptorLevels || [];
  const deepIds = ["b21", "b22", "b23", "b24"];
  const summitIds = ["b25", "b26", "b27", "b28", "b29", "b30"];

  check("game-blind-sculptor", "the ladder holds thirty solids",
    levels.length === 30, String(levels.length));
  check("game-blind-sculptor", "every solid id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-blind-sculptor", "the deep tier b21-b24 is present",
    missing.length === 0, missing.join(","));
  const summitMissing = summitIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-blind-sculptor", "the summit tier b25-b30 is present in order",
    summitMissing.length === 0 &&
      summitIds.every((id, index) => levels.findIndex((level) => level.id === id) >
        (index === 0 ? -1 : levels.findIndex((level) => level.id === summitIds[index - 1]))),
    summitMissing.join(",") || "ordered");
  check("game-blind-sculptor", "the deep tier sits behind the calm twenty and the summit closes the ladder",
    deepIds.every((id, i) => levels[20 + i] && levels[20 + i].id === id) &&
      summitIds.every((id, i) => levels[levels.length - 6 + i] &&
        levels[levels.length - 6 + i].id === id),
    "20-23: " + levels.slice(20, 24).map((level) => level.id).join(",") +
      " | tail: " + levels.slice(-6).map((level) => level.id).join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);
  const summit = summitIds.map((id) => byId[id]);
  const shallow = levels.filter((level) =>
    deepIds.indexOf(level.id) === -1 && summitIds.indexOf(level.id) === -1);

  /* The lesson is structural: every shipped rung closes on the height axis
   * or on a pair the prover finds anywhere in the cube, and none carries the
   * wall flavour; the deep tier's rungs all do, each with the axis its note
   * names and the shipped par-2 economy. */
  const shallowWants = ["flat", "two", "topview", "overhang", "order"];
  const structureOk =
    shallow.every((level) => shallowWants.indexOf(level.want) !== -1 && !level.axis) &&
    deep.every((level) => (level.want === "wall" || level.want === "hollow") &&
      (level.axis === "y" || level.axis === "x") &&
      level.minPar === 2 && level.maxPar === 2);
  check("game-blind-sculptor",
    "rungs 1-20 never deal a wall and the deep tier deals nothing else, each on a named axis at par 2",
    structureOk,
    "deep wants " + deep.map((level) => level.want + "/" + level.axis).join(","));

  /* The summit keeps the deep tier's par-2 wall economy and spends the two
   * levers it left: every rung carries thirteen blocks - the cube's fog
   * ceiling, a size no shipped wall ever dealt - and the dark rungs carry
   * no axis field at all, so the pool deals front or side as it pleases
   * while b25 and b29 keep the note's map. The economy reopens the way b11
   * reopened it for the shelves - cushion while the dark axis is learned,
   * then the ladder's floor - and the wall/hollow alternation is the tier's
   * own. */
  const summitShapeOk =
    summit.every((level) => (level.want === "wall" || level.want === "hollow") &&
      level.blocks === 13 && level.minPar === 2 && level.maxPar === 2) &&
    byId.b25.axis === "y" && byId.b29.axis === "x" &&
    ["b26", "b27", "b28", "b30"].every((id) => byId[id].axis === undefined) &&
    summit.map((level) => level.slack).join(",") === "2,2,2,1,1,1" &&
    summit.map((level) => level.tries).join(",") === "2,2,2,1,1,1" &&
    summit.map((level) => level.want).join(",") === "wall,wall,hollow,wall,hollow,hollow" &&
    deep.every((level) => level.blocks !== 13);
  check("game-blind-sculptor",
    "the summit walls thirteen blocks at par 2 - the deep tier's size never reached - with the axis unnamed on four rungs and the economy reopening then floored",
    summitShapeOk,
    "wants " + summit.map((level) => level.want).join(",") + ", axis " +
      summit.map((level) => level.axis || "dark").join(",") + ", slack " +
      summit.map((level) => level.slack).join(",") + ", tries " +
      summit.map((level) => level.tries).join(","));

  /* Geometry, matched to the module's own plane mapping (top = depth/width,
   * front and side = height/width and height/depth). */
  const idx = (x, y, z) => z * 9 + y * 3 + x;
  const colOf = (cell, axis) => (axis === "y" ? cell % 3 : Math.floor(cell / 3) % 3);
  const heightOf = (cell) => Math.floor(cell / 9);
  const planeCells = (axis, index) => {
    const out = [];
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        out.push(axis === "y" ? idx(c, index, r) : axis === "x" ? idx(index, c, r) : idx(c, r, index));
      }
    }
    return out;
  };
  const bitCount = (n) => { let v = n >>> 0, c = 0; while (v) { v &= v - 1; c += 1; } return c; };

  /* An independent re-statement of the wall contract, so a deal that fell
   * back to the fixed staircase cannot slip through as a deep deal: every
   * block inside two planes of the rung's own axis, both planes alive and
   * unpacked, each plane reaching every column of its axis and two heights,
   * and no height squeezed into a single column. */
  const wallOf = (mask, axis, hollow) => {
    for (let p = 0; p < 2; p += 1) {
      for (let q = p + 1; q < 3; q += 1) {
        if (hollow && (p !== 0 || q !== 2)) continue;
        const planes = [planeCells(axis, p), planeCells(axis, q)];
        let inside = 0;
        planes.forEach((cells) => cells.forEach((cell) => { inside |= 1 << cell; }));
        if (mask & ~inside & ((1 << 27) - 1)) continue;
        const counts = [0, 0], cols = [0, 0], heights = [0, 0];
        const layerCols = [0, 0, 0];
        planes.forEach((cells, side) => cells.forEach((cell) => {
          if (!(mask & (1 << cell))) return;
          counts[side] += 1;
          cols[side] |= 1 << colOf(cell, axis);
          heights[side] |= 1 << heightOf(cell);
          layerCols[heightOf(cell)] |= 1 << colOf(cell, axis);
        }));
        if (!counts[0] || !counts[1] || counts[0] > 8 || counts[1] > 8) continue;
        if (bitCount(cols[0]) < 3 || bitCount(cols[1]) < 3) continue;
        if (bitCount(heights[0]) < 2 || bitCount(heights[1]) < 2) continue;
        if (layerCols.some((layer) => bitCount(layer) < 2)) continue;
        return { p, q };
      }
    }
    return null;
  };

  /* Every deep rung replayed through the panel's own deal - the same
   * sculptorGenerate call loadRound makes, on the module's own Lehmer stream
   * (seed + round*101), so nothing here is probabilistic. Per deal: the wall
   * contract holds, no single slice closes, exactly one pair closes and it
   * never touches a height slice, the shelf pair leaves shapes standing
   * while the three-cut sweep still finishes the run, and the rung's
   * economy is the shipped one. The hollow rung adds its own beat: the
   * middle slice reads zero blocks end to end, and the outer pair - never
   * the hollow slice - is the door. */
  const ROUNDS = 24;
  const dealProblems = [];
  deep.forEach((level) => {
    for (let round = 1; round <= ROUNDS; round += 1) {
      const deal = App.sculptorGenerate(3, level.blocks, level.seed + round * 101, level);
      const tag = `${level.id} round ${round}`;
      const wall = wallOf(deal.mask, level.axis, level.want === "hollow");
      if (!wall) { dealProblems.push(`${tag}: not a wall on ${level.axis} (the dealer fell back)`); continue; }
      if (deal.par !== 2) { dealProblems.push(`${tag}: par ${deal.par} off the rung's two cuts`); }
      const slices = [];
      for (const axis of ["z", "y", "x"]) {
        for (let i = 0; i < 3; i += 1) slices.push(App.sculptorSlice(deal.mask, axis, i));
      }
      const closes = (a, b) => App.sculptorCandidates(
        [slices[a].key, slices[b].key], [slices[a], slices[b]], level.blocks, 0) === 1;
      let doors = 0;
      let zDoors = 0;
      for (let a = 0; a < 9; a += 1) {
        if (closes(a, a)) dealProblems.push(`${tag}: one slice closes the solid`);
        for (let b = a + 1; b < 9; b += 1) {
          if (!closes(a, b)) continue;
          doors += 1;
          if (slices[a].axis === "z" || slices[b].axis === "z") zDoors += 1;
        }
      }
      if (doors !== 1) dealProblems.push(`${tag}: ${doors} closing pairs, the door is not unique`);
      if (zDoors !== 0) dealProblems.push(`${tag}: a height slice sits in the door`);
      const base = level.axis === "y" ? 3 : 6; /* front planes sit at 3-5, side planes at 6-8 */
      const doorKey = [slices[base + wall.p].key, slices[base + wall.q].key];
      if (!closes(base + wall.p, base + wall.q)) {
        dealProblems.push(`${tag}: the wall's own planes ${doorKey.join("+")} do not close it`);
      }
      const shelfPair = App.sculptorCandidates(["Z1", "Z2"],
        [App.sculptorSlice(deal.mask, "z", 0), App.sculptorSlice(deal.mask, "z", 1)], level.blocks, 0);
      if (shelfPair === 1) dealProblems.push(`${tag}: the shelf habit closes a wall`);
      const sweep = App.sculptorCandidates(["Z1", "Z2", "Z3"], [
        App.sculptorSlice(deal.mask, "z", 0),
        App.sculptorSlice(deal.mask, "z", 1),
        App.sculptorSlice(deal.mask, "z", 2),
      ], level.blocks, 0);
      if (sweep !== 1) dealProblems.push(`${tag}: the three-cut sweep cannot finish the run`);
      if (level.want === "hollow") {
        const middle = App.sculptorSlice(deal.mask, level.axis, 1);
        if (middle.filled !== 0) dealProblems.push(`${tag}: the hollow slice reads ${middle.filled} blocks`);
        if (wall.p !== 0 || wall.q !== 2) dealProblems.push(`${tag}: hollow wall not on the outer planes`);
      }
    }
  });
  check("game-blind-sculptor",
    `every dealt wall closes on its own vertical pair alone (${ROUNDS} rounds x 4 rungs through the engine's candidate counter)`,
    dealProblems.length === 0, dealProblems.slice(0, 4).join(" | "));

  /* Every summit rung replayed through the panel's own deal - the same
   * sculptorGenerate call loadRound makes, on the module's own Lehmer stream
   * (seed + round*101), so nothing here is probabilistic. The dark rungs
   * hand the axis to the deal, so the gate finds it: the wall contract must
   * hold on the front OR the side axis, and both must really be dealt over
   * the stream. Per deal: par 2, no single slice closes, exactly one pair
   * does and it never touches a height slice, the shelf pair leaves the
   * quota loose while the sweep still finishes the run, and the hollow
   * rungs read their unlabeled middle slice empty on the door's own axis. */
  const summitDealProblems = [];
  const summitAxisTally = {};
  summit.forEach((level) => {
    summitAxisTally[level.id] = { y: 0, x: 0 };
    for (let round = 1; round <= ROUNDS; round += 1) {
      const deal = App.sculptorGenerate(3, level.blocks, level.seed + round * 101, level);
      const tag = `${level.id} round ${round}`;
      if (deal.par !== 2) { summitDealProblems.push(`${tag}: par ${deal.par} off the rung's two cuts`); continue; }
      let wall = null;
      let wallAxis = null;
      for (const axis of ["y", "x"]) {
        wall = wallOf(deal.mask, axis, level.want === "hollow");
        if (wall) { wallAxis = axis; break; }
      }
      if (!wall) { summitDealProblems.push(`${tag}: not a ${level.want} on either vertical axis (the dealer fell back)`); continue; }
      if (level.axis && wallAxis !== level.axis) {
        summitDealProblems.push(`${tag}: the wall left its named axis ${level.axis}`);
      }
      summitAxisTally[level.id][wallAxis] += 1;
      const slices = [];
      for (const axis of ["z", "y", "x"]) {
        for (let i = 0; i < 3; i += 1) slices.push(App.sculptorSlice(deal.mask, axis, i));
      }
      const closes = (a, b) => App.sculptorCandidates(
        [slices[a].key, slices[b].key], [slices[a], slices[b]], level.blocks, 0) === 1;
      let doors = 0;
      let zDoors = 0;
      for (let a = 0; a < 9; a += 1) {
        if (closes(a, a)) summitDealProblems.push(`${tag}: one slice closes the solid`);
        for (let b = a + 1; b < 9; b += 1) {
          if (!closes(a, b)) continue;
          doors += 1;
          if (slices[a].axis === "z" || slices[b].axis === "z") zDoors += 1;
        }
      }
      if (doors !== 1) summitDealProblems.push(`${tag}: ${doors} closing pairs, the door is not unique`);
      if (zDoors !== 0) summitDealProblems.push(`${tag}: a height slice sits in the door`);
      const base = wallAxis === "y" ? 3 : 6; /* front planes sit at 3-5, side planes at 6-8 */
      if (!closes(base + wall.p, base + wall.q)) {
        summitDealProblems.push(`${tag}: the wall's own planes do not close it`);
      }
      const shelfPair = App.sculptorCandidates(["Z1", "Z2"],
        [App.sculptorSlice(deal.mask, "z", 0), App.sculptorSlice(deal.mask, "z", 1)], level.blocks, 0);
      if (shelfPair === 1) summitDealProblems.push(`${tag}: the shelf habit closes a summit wall`);
      const sweep = App.sculptorCandidates(["Z1", "Z2", "Z3"], [
        App.sculptorSlice(deal.mask, "z", 0),
        App.sculptorSlice(deal.mask, "z", 1),
        App.sculptorSlice(deal.mask, "z", 2),
      ], level.blocks, 0);
      if (sweep !== 1) summitDealProblems.push(`${tag}: the three-cut sweep cannot finish the run`);
      if (level.want === "hollow") {
        const middle = App.sculptorSlice(deal.mask, wallAxis, 1);
        if (middle.filled !== 0) summitDealProblems.push(`${tag}: the hollow slice reads ${middle.filled} blocks`);
        if (wall.p !== 0 || wall.q !== 2) summitDealProblems.push(`${tag}: hollow wall not on the outer planes`);
      }
    }
  });
  const darkBoth = ["b26", "b27", "b28", "b30"].every((id) =>
    summitAxisTally[id].y > 0 && summitAxisTally[id].x > 0);
  check("game-blind-sculptor",
    `every summit deal is a thirteen-block wall with one vertical door, and the dark rungs really deal both axes (${ROUNDS} rounds x 6 rungs)`,
    summitDealProblems.length === 0 && darkBoth,
    summitDealProblems.slice(0, 4).join(" | ") ||
      "axes " + summitIds.map((id) => `${id} ${summitAxisTally[id].y}y/${summitAxisTally[id].x}x`).join(", "));

  /* The bands are the engine's own currency: par from the solver, the
   * shipped slack turning it into a probe budget, starsFor cutting the line.
   * Three stars cost the unique vertical pair; the shelf-habit line (the two
   * shelves, then the sweep) and the hollow rung's bait line (the free
   * middle read first) both land on three probes - two stars, never three.
   * A seeded hand that probes at random reaches the pair about one deal in
   * thirty-six: reachable, not free. */
  const starsFor = App.starsFor;
  const lcg = (seed) => {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };
  const bandProblems = [];
  const TRIALS = 240;
  deep.forEach((level) => {
    const deal = App.sculptorGenerate(3, level.blocks, level.seed + 101, level);
    const budget = Math.max(2 + 1, deal.probes || 2 + level.slack);
    const band = [2, 3, budget];
    if (starsFor(2, band, "low") !== 3 || starsFor(3, band, "low") !== 2) {
      bandProblems.push(`${level.id}: band ${band.join("/")} does not pay 3 stars for the pair and 2 for the sweep`);
    }
    if (starsFor(budget + 1, band, "low") !== 0) {
      bandProblems.push(`${level.id}: the band pays past the budget`);
    }
    /* The shelf habit: two height cuts, then the sweep that rungs 11-20
     * taught. It finishes every wall at three probes - two stars. */
    const habitStars = starsFor(3, band, "low");
    if (habitStars !== 2) bandProblems.push(`${level.id}: the shelf-habit line pays ${habitStars} stars`);
    /* The hollow bait: the free middle read first, then the outer pair. */
    if (level.want === "hollow") {
      const baitStars = starsFor(3, band, "low");
      if (baitStars !== 2) bandProblems.push(`${level.id}: the hollow-bait line pays ${baitStars} stars`);
    }
    /* Seeded hands probing two slices at random: how often does a pair
     * close? Exactly the one door in thirty-six - the top band is not a
     * giveaway, and the ladder's two-cut habit lands in it blind. */
    const rand = lcg(91000 + level.seed);
    let hits = 0;
    const axes = ["z", "y", "x"];
    const sliceAt = (n) => App.sculptorSlice(deal.mask, axes[Math.floor(n / 3)], n % 3);
    for (let trial = 0; trial < TRIALS; trial += 1) {
      const a = Math.floor(rand() * 9);
      let b = Math.floor(rand() * 9);
      if (b === a) b = (b + 1 + Math.floor(rand() * 8)) % 9;
      const one = sliceAt(a);
      const two = sliceAt(b);
      if (App.sculptorCandidates([one.key, two.key], [one, two], level.blocks, 0) === 1) hits += 1;
    }
    if (hits > TRIALS / 12) {
      bandProblems.push(`${level.id}: random two-cut hands close the solid on ${hits}/${TRIALS} trials`);
    }
    if (hits === 0) {
      bandProblems.push(`${level.id}: no random hand ever reached the door (${hits}/${TRIALS})`);
    }
  });
  check("game-blind-sculptor",
    "the bands pay the engine's par: the vertical pair for three stars, the shelf habit and the hollow bait two, random hands one door in thirty-six",
    bandProblems.length === 0, bandProblems.slice(0, 4).join(" | "));

  /* The capstone's fog matches the deepest the ladder has dealt, and the
   * tier's economy tightens the way the shelf tier did: submissions fall
   * 3, 2, 1, 1 and the spare probe falls with them. */
  const fog = (blocks) => App.sculptorCandidates([], [], blocks, 0);
  const b20 = byId.b20;
  const economyOk =
    deep.map((level) => level.tries).join(",") === "3,2,1,1" &&
    deep[3].blocks === 12 && fog(12) === fog(b20.blocks) &&
    deep[0].slack === 2 && deep[1].slack === 2 && deep[2].slack === 1 && deep[3].slack === 1;
  check("game-blind-sculptor",
    "the capstone stands in the ladder's deepest fog and the tier tightens submissions 3-2-1-1",
    economyOk,
    `tries ${deep.map((level) => level.tries).join(",")}, fog b24 ${fog(12)} vs b20 ${fog(b20.blocks)}`);

  /* The size claim, measured at the engine's own counter: thirteen blocks is
   * the cube's fog ceiling and every summit rung stands on it, strictly
   * deeper than the deep tier's capstone. Fourteen matches the number but
   * never deals a par-2 wall - the greedy opens on the empty plane, so the
   * dealer spends all 400 tries and falls back to its staircase - which is
   * why the summit stops at thirteen. */
  const fogCeilingOk = fog(13) === 20058300 && fog(13) > fog(12) &&
    summit.every((level) => fog(level.blocks) === fog(13)) &&
    ["77", "910", "2026"].every((seed) =>
      App.sculptorGenerate(3, 14, parseInt(seed, 10),
        { blocks: 14, want: "wall", minPar: 2, maxPar: 2, slack: 1 }).par === 3);
  check("game-blind-sculptor",
    "the summit stands on the cube's fog ceiling of 20,058,300 solids, and fourteen blocks never deals a par-2 wall at all",
    fogCeilingOk,
    `fog 12 = ${fog(12)}, fog 13 = ${fog(13)}`);

  /* The summit's bands are the engine's own currency too: par from the
   * solver, the shipped slack turning it into a probe budget, starsFor
   * cutting the line. Three stars cost the vertical pair - now found among
   * six candidate pairs on the dark rungs - the sweep line lands on two
   * stars, nothing pays past the budget, and random two-cut hands still
   * reach the one door about one deal in thirty-six: reachable, not free. */
  const summitBandProblems = [];
  summit.forEach((level) => {
    const deal = App.sculptorGenerate(3, level.blocks, level.seed + 101, level);
    const budget = Math.max(2 + 1, deal.probes || 2 + level.slack);
    const band = [2, 3, budget];
    if (starsFor(2, band, "low") !== 3 || starsFor(3, band, "low") !== 2) {
      summitBandProblems.push(`${level.id}: band ${band.join("/")} does not pay 3 stars for the pair and 2 for the sweep`);
    }
    if (starsFor(budget + 1, band, "low") !== 0) {
      summitBandProblems.push(`${level.id}: the band pays past the budget`);
    }
    const habitStars = starsFor(3, band, "low");
    if (habitStars !== 2) summitBandProblems.push(`${level.id}: the shelf-habit line pays ${habitStars} stars`);
    const rand = lcg(91000 + level.seed);
    let hits = 0;
    const axes = ["z", "y", "x"];
    const sliceAt = (n) => App.sculptorSlice(deal.mask, axes[Math.floor(n / 3)], n % 3);
    for (let trial = 0; trial < TRIALS; trial += 1) {
      const a = Math.floor(rand() * 9);
      let b = Math.floor(rand() * 9);
      if (b === a) b = (b + 1 + Math.floor(rand() * 8)) % 9;
      const one = sliceAt(a);
      const two = sliceAt(b);
      if (App.sculptorCandidates([one.key, two.key], [one, two], level.blocks, 0) === 1) hits += 1;
    }
    if (hits > TRIALS / 12) {
      summitBandProblems.push(`${level.id}: random two-cut hands close the solid on ${hits}/${TRIALS} trials`);
    }
    if (hits === 0) {
      summitBandProblems.push(`${level.id}: no random hand ever reached the door (${hits}/${TRIALS})`);
    }
  });
  check("game-blind-sculptor",
    "the summit bands pay the engine's par: the pair three stars, the sweep two, nothing past the budget, random hands one door in thirty-six",
    summitBandProblems.length === 0, summitBandProblems.slice(0, 4).join(" | "));

  /* The mechanic is load-bearing, cut out of a copy of every rung: strip the
   * thinnest height from the dealt solid - the contract fact that dies is
   * "every height keeps two blocks in two columns" - and the copy opens a
   * height door: a pair of height cuts closes the stripped solid, so the
   * vertical pair stops being the only way through. The wall contract, not
   * the fog, is what forces the door. */
  const summitCutProblems = [];
  summit.forEach((level) => {
    const deal = App.sculptorGenerate(3, level.blocks, level.seed + 101, level);
    const layerBlocks = [0, 0, 0];
    for (let i = 0; i < 27; i += 1) {
      if (deal.mask & (1 << i)) layerBlocks[Math.floor(i / 9)] += 1;
    }
    const thin = layerBlocks.indexOf(Math.min.apply(null, layerBlocks));
    let cut = deal.mask;
    for (let i = 0; i < 27; i += 1) {
      if (Math.floor(i / 9) === thin) cut &= ~(1 << i);
    }
    const cutBlocks = level.blocks - layerBlocks[thin];
    const slices = [];
    for (const axis of ["z", "y", "x"]) {
      for (let i = 0; i < 3; i += 1) slices.push(App.sculptorSlice(cut, axis, i));
    }
    const closes = (a, b) => App.sculptorCandidates(
      [slices[a].key, slices[b].key], [slices[a], slices[b]], cutBlocks, 0) === 1;
    let doors = 0;
    let zDoors = 0;
    for (let a = 0; a < 9; a += 1) {
      for (let b = a + 1; b < 9; b += 1) {
        if (!closes(a, b)) continue;
        doors += 1;
        if (slices[a].axis === "z" || slices[b].axis === "z") zDoors += 1;
      }
    }
    if (zDoors === 0 || doors < 2) {
      summitCutProblems.push(`${level.id}: the stripped copy kept its single vertical door (${doors} doors, ${zDoors} on the height axis)`);
    }
  });
  check("game-blind-sculptor",
    "strip a summit solid's thinnest height and a height door opens - the level stops demanding the vertical pair",
    summitCutProblems.length === 0, summitCutProblems.join(" | "));

  /* The tier's names, notes and the new-tier guide line resolve in both
   * languages. */
  const copyKeys = [];
  deep.forEach((level) => { copyKeys.push(level.labelKey, level.noteKey); });
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-blind-sculptor", "the four deep solid names and notes resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
  const summitKeys = [];
  summit.forEach((level) => { summitKeys.push(level.labelKey, level.noteKey); });
  const summitCopyProblems = summitKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-blind-sculptor", "the six summit solid names and notes resolve in both languages",
    summitCopyProblems.length === 0, summitCopyProblems.join(","));
  const guide = (App.getRegistryGuides || (() => []))().filter((row) => row.id === "blindSculptor")[0];
  const guideOk = !!guide &&
    (guide.en || []).some((line) => line.indexOf("New tier") === 0) &&
    (guide.zh || []).some((line) => line.indexOf("新层级") === 0);
  check("game-blind-sculptor", "the studio's guide carries the new-tier line in both languages",
    guideOk, guide ? "en " + guide.en.length + " lines, zh " + guide.zh.length : "no guide");
  const summitGuideOk = !!guide &&
    (guide.en || []).some((line) => line.indexOf("Summit:") === 0) &&
    (guide.zh || []).some((line) => line.indexOf("巅峰段") === 0);
  check("game-blind-sculptor", "the studio's guide carries the summit line in both languages",
    summitGuideOk, guide ? "en " + guide.en.length + " lines, zh " + guide.zh.length : "no guide");

  /* The unlock chain is derived, never stored: clearing each solid in order
   * hands the player exactly the next one, all thirty times. */
  const chain = App.createCampaign({
    key: "blind-sculptor-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 2, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-blind-sculptor", "the unlock chain walks all thirty solids in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
