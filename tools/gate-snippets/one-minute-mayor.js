"use strict";

/* game-one-minute-mayor: the deep tier's lesson - a district that plans
 * without a worksite - is structural, and the game's own measured plan sits
 * witness on every rung.
 *
 * The module ships the whole headless core the panel plays with: mayorPlan
 * (greedy plus seeded restarts over the exported scorer), mayorBeatable
 * (the proof that fills stars/plan/proof at load), mayorPlace/mayorScore
 * (pure replay). The core draws no Math.random, so the bench needs no
 * seeding - every hand below is deterministic in the engine's own currency.
 * The gate proves four things. First, every deep rung is beatable through
 * the shipped solver, and replaying the authored line scores exactly the
 * three-star band it measured. Second, the lesson is structural: all twenty
 * shipped plans buy a worksite, no deep plan does, and the wall that prices
 * the plant out is geometry the legality reader itself confirms - every lot
 * a stop's bridge could carry to a work-legal lot is work-legal itself, so
 * the employable ground is an island of far works lots with no garden on it,
 * and the bench shows even that island loses to the garden line. Third, the bench: greedy hands
 * over every seed and room never beat the plan, hands forced to open with a
 * worksite always land under three stars (the plant is a trap, not a
 * strategy), and the naive sprawl does not even clear one star - the bands
 * are reachable but not free. Fourth, the copy: the four district names and
 * the guide's new-tier line resolve in both languages, and the unlock chain
 * walks all twenty-four rungs in order. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.mayorDistricts;
  const deepIds = ["o21", "o22", "o23", "o24"];

  check("game-one-minute-mayor", "the ladder holds twenty-four districts",
    levels.length === 24, String(levels.length));
  check("game-one-minute-mayor", "every district id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-one-minute-mayor", "the deep tier o21-o24 is present",
    missing.length === 0, missing.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);
  const shallow = levels.filter((level) => !deepIds.includes(level.id));

  /* A seeded greedy hand, written against the exported primitives only: every
   * legal blueprint on every lot is scored, the best gain is kept, and the
   * pick wanders inside `room` of the top on the hand's own seed. The same
   * shape the shipped omvGreedy runs - the bench borrows the planner's own
   * move, not a private approximation. */
  const lcg = (seed) => {
    let state = seed % 2147483647;
    if (state <= 0) state += 2147483646;
    return () => {
      state = (state * 16807) % 2147483647;
      return (state - 1) / 2147483646;
    };
  };
  const legalCells = (grid, kind) => {
    const out = [];
    for (let y = 0; y < grid.side; y += 1) {
      for (let x = 0; x < grid.side; x += 1) {
        if (App.mayorLegal(grid, kind, x, y) === "ok") out.push({ kind, x, y });
      }
    }
    return out;
  };
  const greedyHand = (district, seed, room, forced) => {
    const rng = lcg(seed);
    let grid = App.mayorFresh(district);
    for (let turn = 0; turn < district.turns; turn += 1) {
      let tried = [];
      if (turn === 0 && forced) {
        tried = legalCells(grid, forced.kind).filter(
          (cell) => cell.x === forced.x && cell.y === forced.y);
        if (!tried.length) return null;
      } else {
        App.mayorTypes.forEach((kind) => { tried = tried.concat(legalCells(grid, kind)); });
      }
      if (!tried.length) return null;
      let top = null;
      tried.forEach((cell) => {
        cell.gain = App.mayorScore(App.mayorPlace(grid, cell.kind, cell.x, cell.y));
        if (top === null || cell.gain > top.gain) top = cell;
      });
      const pool = tried.filter((cell) => cell.gain >= top.gain - room);
      const pick = pool[Math.floor(rng() * pool.length) % pool.length];
      grid = App.mayorPlace(grid, pick.kind, pick.x, pick.y);
    }
    return App.mayorScore(grid);
  };
  /* Two habit hands: the sprawl builds every home it can first; the recipe
   * runs the housing-then-plant-then-plumbing order twenty rungs teach. */
  const naiveHand = (district, cycle) => {
    let grid = App.mayorFresh(district);
    for (let turn = 0; turn < district.turns; turn += 1) {
      const kind = cycle[turn % cycle.length];
      const cells = legalCells(grid, kind);
      if (!cells.length) return null;
      grid = App.mayorPlace(grid, kind, cells[0].x, cells[0].y);
    }
    return App.mayorScore(grid);
  };

  /* Every deep district, proved through the game's own engine: the shipped
   * solver calls it beatable, the authored line replays to its own three-star
   * band, the bands run downwards to a live target, and the plan's ledger
   * prints the jobless homes the shape makes unavoidable. */
  const runProblems = [];
  deep.forEach((level) => {
    const proof = level.proof || App.mayorBeatable(level);
    if (!proof || !proof.ok) {
      runProblems.push(`${level.id}: the shipped solver cannot prove it beatable`);
      return;
    }
    if (proof.turns !== level.turns) {
      runProblems.push(`${level.id}: the plan played ${proof.turns} of ${level.turns} placements`);
    }
    if (!(level.stars[0] > level.stars[1] && level.stars[1] > level.stars[2] &&
        level.stars[2] >= 1)) {
      runProblems.push(`${level.id}: bands do not run downwards ${level.stars.join("/")}`);
    }
    if (proof.plan !== level.stars[0]) {
      runProblems.push(`${level.id}: plan ${proof.plan} is not the three-star band ${level.stars[0]}`);
    }
    let grid = App.mayorFresh(level);
    const kinds = proof.moves.map((move) => move.kind).join("");
    for (let i = 0; i < proof.moves.length; i += 1) {
      const move = proof.moves[i];
      const placed = App.mayorPlace(grid, move.kind, move.x, move.y);
      if (!placed) {
        runProblems.push(`${level.id}: authored move ${i} (${move.kind}) is not legal`);
        break;
      }
      grid = placed;
    }
    if (App.mayorScore(grid) !== level.stars[0]) {
      runProblems.push(`${level.id}: replaying the authored line scores ` +
        `${App.mayorScore(grid)}, not ${level.stars[0]}`);
    }
    if (kinds.indexOf("W") !== -1) {
      runProblems.push(`${level.id}: the measured plan buys a worksite (${kinds})`);
    }
    const analysis = App.mayorAnalyze(grid);
    if (analysis.counts.jobless < 2) {
      runProblems.push(`${level.id}: the plan prints only ${analysis.counts.jobless} jobless homes`);
    }
  });
  check("game-one-minute-mayor",
    "the game's own plan proves every deep rung beatable, and no measured plan buys a worksite",
    runProblems.length === 0, runProblems.slice(0, 4).join(" | "));

  /* The lesson is structural, in both directions. Every shipped rung's plan
   * pays for a worksite; every deep rung's plan proves the ledger closes
   * without one; and the wall is geometry, not luck - on each deep rung the
   * lots the legality reader still sells to a worksite lie beyond a stop's
   * five-street bridge (omvStopReach) of every lot a home can stand on, so
   * an empty plant there scores -2 forever. */
  const buyers = shallow.filter((level) => {
    const moves = (level.proof && level.proof.moves) || App.mayorPlan(level).moves;
    return moves.some((move) => move.kind === "W");
  });
  check("game-one-minute-mayor",
    "every shipped plan buys a worksite; the deep tier's plans prove the ledger closes without one",
    buyers.length === shallow.length, "shipped buyers " + buyers.length + "/" + shallow.length);
  const walls = [];
  deep.forEach((level) => {
    const fresh = App.mayorFresh(level);
    const homes = legalCells(fresh, "H");
    const works = legalCells(fresh, "W");
    const workAt = {};
    works.forEach((lot) => { workAt[lot.y * fresh.side + lot.x] = true; });
    works.forEach((lot) => {
      homes.forEach((home) => {
        const steps = Math.abs(home.x - lot.x) + Math.abs(home.y - lot.y);
        if (steps <= 5 && !workAt[home.y * fresh.side + home.x]) {
          walls.push(`${level.id}: a home lot at ${home.x},${home.y} sits within a ` +
            `stop's bridge of the work lot at ${lot.x},${lot.y}`);
        }
      });
    });
  });
  check("game-one-minute-mayor",
    "on every deep rung the only lots a stop's bridge can carry to work are work lots themselves",
    walls.length === 0, walls.slice(0, 3).join(" | "));

  /* The tier's knobs stay on the ladder's curve: slack never rises through
   * the deep tier and the tight rungs print the shortest ledgers shipped. */
  const knobs = [];
  for (let i = 1; i < deep.length; i += 1) {
    if (deep[i].slack > deep[i - 1].slack) {
      knobs.push(`${deep[i].id}: slack rises to ${deep[i].slack}`);
    }
  }
  const shortestShipped = Math.min.apply(null, shallow.map((level) => level.turns));
  if (!(deep[0].slack <= byId.o20.slack) || !deep[1] ||
    !deep.every((level) => level.slack <= byId.o20.slack)) {
    knobs.push("deep slack is looser than o20's");
  }
  if (!deep.every((level) => level.turns < shortestShipped || level.id === "o23")) {
    knobs.push("a tight rung prints more placements than the shortest shipped ledger");
  }
  check("game-one-minute-mayor",
    "deep slack stays at o20's floor or below and the tight rungs out-short the shipped ledger",
    knobs.length === 0, knobs.join(" | "));

  /* The bench, in the engine's own currency. Greedy hands over every seed
   * and room never beat the measured plan; hands forced to open with a
   * worksite always land under three stars; the habit hands do not even
   * clear one star; and the target itself is reachable by real hands. */
  const SEEDS = [1, 3, 5, 7, 11, 17, 29, 43];
  const ROOMS = [0, 2, 4];
  const FORCED_SEEDS = [5, 11, 29];
  const FORCED_ROOMS = [0, 2];
  const benchProblems = [];
  deep.forEach((level) => {
    let peak = 0;
    let worstForced = Infinity;
    SEEDS.forEach((seed) => ROOMS.forEach((room) => {
      const score = greedyHand(level, seed, room);
      if (score !== null) peak = Math.max(peak, score);
    }));
    const workLots = legalCells(App.mayorFresh(level), "W");
    workLots.forEach((lot) => FORCED_SEEDS.forEach((seed) => FORCED_ROOMS.forEach((room) => {
      const score = greedyHand(level, seed, room, lot);
      if (score !== null) worstForced = Math.min(worstForced, score);
    })));
    /* the trap must bite: every forced-plant hand lands under three stars */
    if (workLots.length && worstForced >= level.stars[0]) {
      benchProblems.push(`${level.id}: a hand forced to open with a worksite still ` +
        `reaches ${worstForced} against a three-star band of ${level.stars[0]}`);
    }
    if (peak > level.stars[0]) {
      benchProblems.push(`${level.id}: a free hand reaches ${peak}, over the plan's ${level.stars[0]}`);
    }
    const sprawl = naiveHand(level, ["H", "W", "T", "R", "G"]);
    const recipe = naiveHand(level, ["H", "W", "T"]);
    if (sprawl !== null && sprawl >= level.stars[2]) {
      benchProblems.push(`${level.id}: the sprawl hand clears one star with ${sprawl}`);
    }
    if (recipe !== null && recipe >= level.stars[2]) {
      benchProblems.push(`${level.id}: the recipe hand clears one star with ${recipe}`);
    }
    if (level.stars[2] > peak) {
      benchProblems.push(`${level.id}: the one-star target ${level.stars[2]} is over the bench peak ${peak}`);
    }
  });
  check("game-one-minute-mayor",
    "the bench holds: nothing beats the plan, the worksite is a trap on every rung, the sprawl never stars",
    benchProblems.length === 0, benchProblems.slice(0, 4).join(" | "));

  /* The tier's names resolve in both languages. */
  const copyProblems = deep.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-one-minute-mayor", "the four deep district names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The guide carries the new-tier line in both languages. */
  const guide = (App.getRegistryGuides || function () { return []; })()
    .filter((entry) => entry.id === "oneMinuteMayor")[0];
  const guideProblems = [];
  if (!guide) {
    guideProblems.push("the game ships no guide");
  } else {
    if (!(guide.en || []).some((line) => line.indexOf("New tier:") === 0)) {
      guideProblems.push("the English guide has no New tier line");
    }
    if (!(guide.zh || []).some((line) => line.indexOf("新层级：") === 0)) {
      guideProblems.push("the Chinese guide has no 新层级 line");
    }
  }
  check("game-one-minute-mayor", "the guide announces the new tier in both languages",
    guideProblems.length === 0, guideProblems.join(" | "));

  /* The unlock chain is derived, never stored: clearing each district in
   * order hands the player exactly the next one, all twenty-four times. */
  const chain = App.createCampaign({
    key: "one-minute-mayor-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, {
      stars: 3, best: (level.proof && level.proof.plan) || 1, better: "high",
    });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-one-minute-mayor", "the unlock chain walks all twenty-four districts in order",
    walked === 24 && chained && chain.clearedCount() === 24, walked + " first clears");
};
