"use strict";

/* game-traffic: the depot and gridlock tiers are measured through the lot's
 * own slide rules.
 *
 * The gate prices every board with a unit-step breadth-first walk over
 * trafSlide/trafTaxiOut - the exact functions commitMove answers to - so an
 * escape that cannot be driven fails here, not on the road. The shipped
 * boards keep their shipped pars. Two tiers hold the tight line. The depot
 * tier j25-j30: three stars sits one step above the measured optimum, every
 * depot optimum costs strictly more than any board before it (24 against the
 * shipped peak of 13), and the grids really are fuller - eight or nine
 * vehicles with a truck in every deal, and a vertical car standing in the
 * taxi's own lane at the start. The gridlock tier j31-j40 is the ceiling:
 * eleven vehicles - the paint rail's own count, where the depot topped out
 * at nine - the cab backed against the left wall with all four lane cells
 * standing cars, and every optimum above the depot summit. trafficSolvable
 * re-proves each deal through the same rules the build ships. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.trafLevels;
  const depotIds = ["j25", "j26", "j27", "j28", "j29", "j30"];
  const gridlockIds = ["j31", "j32", "j33", "j34", "j35", "j36", "j37", "j38", "j39", "j40"];

  const expectedIds = Array.from({ length: 40 }, (_, index) => "j" + (index + 1));
  check("game-traffic", "the ladder holds forty boards",
    levels.length === 40, String(levels.length));
  check("game-traffic", "every board id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  check("game-traffic", "the ids run j1 through j40 in order",
    levels.map((level) => level.id).join(",") === expectedIds.join(","),
    levels.map((level) => level.id).join(","));
  const missingDepot = depotIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-traffic", "the depot tier j25-j30 is present",
    missingDepot.length === 0, missingDepot.join(","));
  const missingGridlock = gridlockIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-traffic", "the gridlock tier j31-j40 is present",
    missingGridlock.length === 0, missingGridlock.join(","));

  /* The pricer: one unit step per layer, because commitMove counts every
   * cell a car slides as its own move. */
  const SIZE = 6;
  const optimum = (cars) => {
    const start = cars.map((car) => car.slice());
    if (App.trafTaxiOut(start)) return 0;
    const key = (cars) => cars.map((car) => car[0] + "," + car[1]).join(";");
    const seen = new Map();
    seen.set(key(start), 0);
    let frontier = [start];
    let depth = 0;
    while (frontier.length && depth < 120) {
      depth += 1;
      const next = [];
      for (const cars of frontier) {
        for (let i = 0; i < cars.length; i += 1) {
          const horiz = cars[i][3] === 1;
          const axes = horiz ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
          for (const [dx, dy] of axes) {
            const reach = App.trafSlide(cars, i, dx, dy);
            const unit = dx !== 0 ? dx : dy;
            if (Math.abs(reach) < 1) continue;
            const nextCars = cars.map((car) => car.slice());
            nextCars[i][0] += horiz ? unit : 0;
            nextCars[i][1] += horiz ? 0 : unit;
            if (i === 0 && App.trafTaxiOut(nextCars)) return depth;
            const k = key(nextCars);
            if (!seen.has(k)) {
              seen.set(k, depth);
              next.push(nextCars);
            }
          }
        }
      }
      frontier = next;
    }
    return -1;
  };

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });

  /* Whole-ladder bar: every board drives out, every priced optimum fits
   * under the three-star line, and the star lines run upwards. */
  const problems = [];
  const optima = {};
  levels.forEach((level) => {
    const opt = optimum(level.cars);
    optima[level.id] = opt;
    if (opt < 0) problems.push(level.id + " has no escape the lot can drive");
    if (App.trafficSolvable(level) !== true) problems.push(level.id + " fails trafficSolvable");
    if (opt > level.par[0]) problems.push(`${level.id} optimum ${opt} above the three-star line ${level.par[0]}`);
    if (!(level.par[0] < level.par[1] && level.par[1] < level.par[2])) {
      problems.push(`${level.id} star lines do not run upwards ${level.par.join("/")}`);
    }
  });
  check("game-traffic",
    "every board is solvable and priced under its own three-star line",
    problems.length === 0, problems.join(" | "));

  /* The depot tier is the hard tier of the first thirty: each depot optimum
   * costs strictly more than any board before it, the tier climbs rung over
   * rung, and the three-star slack is the tightest the lot ships - one step
   * over the optimum (the boards before it run +1 to +7). */
  const before = levels.filter((level) => !depotIds.includes(level.id) && !gridlockIds.includes(level.id));
  const beforePeak = Math.max.apply(null, before.map((level) => optima[level.id]));
  const depot = depotIds.map((id) => byId[id]);
  const depotProblems = [];
  let last = 0;
  depot.forEach((level) => {
    const opt = optima[level.id];
    if (opt <= beforePeak) depotProblems.push(`${level.id} optimum ${opt} not above the peak before it (${beforePeak})`);
    if (opt <= last) depotProblems.push(`${level.id} optimum ${opt} does not climb past the rung before it (${last})`);
    if (level.par[0] !== opt + 1) depotProblems.push(`${level.id} three-star line ${level.par[0]} is not the measured optimum + 1 (${opt})`);
    last = opt;
  });
  check("game-traffic",
    "every depot board costs more than any board before it and climbs in order",
    depotProblems.length === 0, depotProblems.join(" | "));

  /* The depot wall is structural: eight or nine vehicles (the shipped peak
   * is eight), a truck in every deal, and a vertical car standing in the
   * taxi's own lane ahead of it at the start. */
  const shapeProblems = [];
  depot.forEach((level) => {
    if (level.cars.length < 8) shapeProblems.push(`${level.id} runs only ${level.cars.length} vehicles`);
    if (!level.cars.some((car) => car[2] === 3)) shapeProblems.push(level.id + " ships no truck");
    const taxi = level.cars[0];
    const grid = App.trafGrid(level.cars);
    let laneWall = false;
    for (let x = taxi[0] + taxi[2]; x < SIZE; x += 1) {
      const occupant = grid[x + taxi[1] * SIZE];
      if (occupant > 0 && level.cars[occupant][3] === 0) laneWall = true;
    }
    if (!laneWall) shapeProblems.push(level.id + " has no vertical car in the taxi's lane");
    if (App.trafTaxiOut(level.cars.map((car) => car.slice()))) {
      shapeProblems.push(level.id + " starts with the taxi already out");
    }
  });
  check("game-traffic",
    "every depot grid really walls the taxi: full lots, trucks, a car in the lane",
    shapeProblems.length === 0, shapeProblems.join(" | "));

  /* The gridlock tier is the ceiling: eleven vehicles (the paint rail's own
   * count, where the depot topped out at nine), the cab backed against the
   * left wall, all four lane cells standing cars - a four-car wall the first
   * thirty never deal - and every optimum strictly above the depot summit.
   * The star lines keep the depot's spread: optimum + 1 / + 5 / + 10. */
  const depotPeak = Math.max.apply(null, depot.map((level) => optima[level.id]));
  const gridlock = gridlockIds.map((id) => byId[id]);
  const gridlockProblems = [];
  last = 0;
  gridlock.forEach((level) => {
    const opt = optima[level.id];
    if (opt <= depotPeak) gridlockProblems.push(`${level.id} optimum ${opt} not above the depot summit (${depotPeak})`);
    if (opt <= last) gridlockProblems.push(`${level.id} optimum ${opt} does not climb past the rung before it (${last})`);
    if (level.par[0] !== opt + 1 || level.par[1] !== opt + 5 || level.par[2] !== opt + 10) {
      gridlockProblems.push(`${level.id} star lines ${level.par.join("/")} are not the measured optimum + 1 / + 5 / + 10 (${opt})`);
    }
    last = opt;
  });
  check("game-traffic",
    "every gridlock board costs more than the depot summit and climbs in order",
    gridlockProblems.length === 0, gridlockProblems.join(" | "));

  /* The gridlock wall is structural: eleven vehicles, a truck in every deal,
   * the cab against the left wall, and a standing car over every lane cell -
   * the wall is the board, not a detail of it. */
  const gridlockShapeProblems = [];
  gridlock.forEach((level) => {
    if (level.cars.length !== 11) gridlockShapeProblems.push(`${level.id} runs ${level.cars.length} vehicles, not eleven`);
    if (!level.cars.some((car) => car[2] === 3)) gridlockShapeProblems.push(level.id + " ships no truck");
    const taxi = level.cars[0];
    if (taxi[0] !== 0) gridlockShapeProblems.push(`${level.id} starts the cab at column ${taxi[0]}, not against the left wall`);
    const grid = App.trafGrid(level.cars);
    for (let x = taxi[0] + taxi[2]; x < SIZE; x += 1) {
      const occupant = grid[x + taxi[1] * SIZE];
      if (occupant < 0) gridlockShapeProblems.push(`${level.id} leaves lane cell ${x} open at the start`);
      else if (level.cars[occupant][3] === 1) gridlockShapeProblems.push(`${level.id} has a horizontal car standing in lane cell ${x}`);
    }
    if (App.trafTaxiOut(level.cars.map((car) => car.slice()))) {
      gridlockShapeProblems.push(level.id + " starts with the taxi already out");
    }
  });
  check("game-traffic",
    "every gridlock deal is eleven cars against a full standing wall",
    gridlockShapeProblems.length === 0, gridlockShapeProblems.join(" | "));

  /* The shape is fresh: across the first thirty boards no deal reaches ten
   * vehicles, and none walls all four lane cells from the cab at the wall -
   * their fullest lane is three standing cars. */
  const staleProblems = [];
  before.forEach((level) => {
    if (level.cars.length >= 10) staleProblems.push(`${level.id} already deals ${level.cars.length} vehicles`);
    const taxi = level.cars[0];
    const grid = App.trafGrid(level.cars);
    if (taxi[0] === 0) {
      let full = true;
      for (let x = taxi[0] + taxi[2]; x < SIZE; x += 1) {
        if (grid[x + taxi[1] * SIZE] < 0) full = false;
      }
      if (full) staleProblems.push(level.id + " already walls the whole lane from the left wall");
    }
  });
  check("game-traffic",
    "the first thirty never deal the gridlock shape: no ten-car lots, no four-car wall",
    staleProblems.length === 0, staleProblems.join(" | "));

  /* The unlock chain is derived, never stored: clearing each board in order
   * hands the player exactly the next one, all forty times. */
  const chain = App.createCampaign({
    key: "traffic-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.id })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-traffic", "the unlock chain walks all forty boards in order",
    walked === 40 && chained && chain.clearedCount() === 40, walked + " first clears");
};
