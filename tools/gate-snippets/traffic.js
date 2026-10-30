"use strict";

/* game-traffic: the depot tier is measured through the lot's own slide rules.
 *
 * The gate prices every board with a unit-step breadth-first walk over
 * trafSlide/trafTaxiOut - the exact functions commitMove answers to - so an
 * escape that cannot be driven fails here, not on the road. The shipped
 * boards keep their shipped pars; the depot tier j25-j30 holds the tighter
 * line: three stars sits one step above the measured optimum, every depot
 * optimum costs strictly more than any shipped board's (24 against the
 * shipped peak of 13), and the grids really are fuller - eight or nine
 * vehicles with a truck in every deal, and a vertical car standing in the
 * taxi's own lane at the start, so the wall the escape negotiates is on the
 * board, not just in the par numbers. trafficSolvable re-proves each deal
 * through the same rules the build ships. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.trafLevels;
  const depotIds = ["j25", "j26", "j27", "j28", "j29", "j30"];

  check("game-traffic", "the ladder holds thirty boards",
    levels.length === 30, String(levels.length));
  check("game-traffic", "every board id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = depotIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-traffic", "the depot tier j25-j30 is present",
    missing.length === 0, missing.join(","));

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

  /* The depot tier is the hard tier: each depot optimum costs strictly more
   * than any shipped board's, the tier climbs rung over rung, and the
   * three-star slack is the tightest the lot ships - one step over the
   * optimum (the shipped boards run +1 to +7). */
  const shipped = levels.filter((level) => !depotIds.includes(level.id));
  const shippedPeak = Math.max.apply(null, shipped.map((level) => optima[level.id]));
  const depot = depotIds.map((id) => byId[id]);
  const depotProblems = [];
  let last = 0;
  depot.forEach((level) => {
    const opt = optima[level.id];
    if (opt <= shippedPeak) depotProblems.push(`${level.id} optimum ${opt} not above the shipped peak ${shippedPeak}`);
    if (opt <= last) depotProblems.push(`${level.id} optimum ${opt} does not climb past the rung before it (${last})`);
    if (level.par[0] !== opt + 1) depotProblems.push(`${level.id} three-star line ${level.par[0]} is not the measured optimum + 1 (${opt})`);
    last = opt;
  });
  check("game-traffic",
    "every depot board costs more than any shipped board and climbs in order",
    depotProblems.length === 0, depotProblems.join(" | "));

  /* The wall is structural: eight or nine vehicles (the shipped peak is
   * eight), a truck in every deal, and a vertical car standing in the taxi's
   * own lane ahead of it at the start. */
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

  /* The unlock chain is derived, never stored: clearing each board in order
   * hands the player exactly the next one, all thirty times. */
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
  check("game-traffic", "the unlock chain walks all thirty boards in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
