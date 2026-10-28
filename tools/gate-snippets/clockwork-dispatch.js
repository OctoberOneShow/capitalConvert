"use strict";

/* game-clockwork-dispatch: every timetable is proved twice, and the deep tier
 * breaks the moment its advertised mechanic is taken away
 *
 * dispatchSolve searches the same cwkStep the panel steps, and its plan is only
 * accepted here after dispatchRun replays it to a win with zero crashes and the
 * whole manifest delivered. Doing nothing must crash, or the rung is a free
 * ride. Star bands are not authored at all - the panel scores
 * starsFor(value, [par, par + 2, par + 5], "low") straight off the solver's
 * par - so this gate checks that no row carries a band of its own and that the
 * measured par climbs through the new tier. Then each rung is cut down to its
 * brief: the berth that d21 cannot route without, the left-edge platforms and
 * the single drop column d22 needs, the hold value d23's own plan crashes
 * without, and the bay platform d24 cannot deliver to otherwise. */
module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.dispatchLevels;
  const byId = (id) => levels.find((level) => level.id === id);
  /* cwkBoard caches the compiled track/cell/station maps on the row object
   * itself, so a clone that keeps `board` would silently ignore every edit a
   * proof makes to rows, cells or stations. */
  const copy = (level) => {
    const clone = JSON.parse(JSON.stringify(level));
    delete clone.board;
    return clone;
  };
  const deepIds = ["d21", "d22", "d23", "d24"];

  check("game-clockwork-dispatch", "the ladder holds at least twenty-four timetables",
    levels.length >= 24, String(levels.length));
  check("game-clockwork-dispatch", "every timetable id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !byId(id));
  check("game-clockwork-dispatch", "the deep tier d21-d24 is present",
    missing.length === 0, missing.join(","));

  /* Bands must stay derived: a row that grows a starMoves field would quietly
   * replace the solver's number with an authored one. */
  const authored = levels.filter((level) => level.starMoves || level.bands || level.starFlips);
  check("game-clockwork-dispatch", "no timetable carries an authored star band",
    authored.length === 0, authored.map((level) => level.id).join(","));

  const proofProblems = [];
  const pars = {};
  levels.forEach((level) => {
    /* dispatchSolvable is the module's own bundle: the search, the plain-board
     * simulation that says whether the rung plays itself, and a replay of the
     * plan it found. */
    const proof = App.dispatchSolvable(level);
    pars[level.id] = proof.par;
    if (!proof.solvable) {
      proofProblems.push(level.id + ":unsolvable");
      return;
    }
    const replay = App.dispatchRun(level, proof.plan, level.limit);
    if (replay.over !== "win" || replay.crashes !== 0 || replay.delivered !== level.trains.length) {
      proofProblems.push(level.id + ":replay " + replay.over + "/" + replay.crashes +
        "/" + replay.delivered + " of " + level.trains.length);
    }
    /* A rung that plays itself is not a rung: the same board left untouched
     * has to crash. */
    if (proof.idleCrashes <= 0 || proof.needsWork !== true) {
      proofProblems.push(level.id + ":idle-safe");
    }
    /* And the timetable must be honest: by tick 2 exactly the trains listed at
     * tick <= 2 are on the board. */
    const early = App.dispatchRun(level, [], 2);
    const due = level.trains.filter((train) => train.tick <= 2).length;
    const seen = new Set(early.frames.flatMap((frame) => frame.trains.map((train) => train.id)));
    if (seen.size !== due) {
      proofProblems.push(level.id + ":spawn " + seen.size + " vs " + due);
    }
  });
  check("game-clockwork-dispatch", "every timetable has a collision-free plan that replays to a win, fails when left alone, and spawns on its listed ticks",
    proofProblems.length === 0, proofProblems.join(" | "));

  /* The new tier is the hard tier on the solver's own currency. */
  const shippedMax = Math.max.apply(null, levels.slice(0, 20).map((level) => pars[level.id]));
  const deepPars = deepIds.map((id) => pars[id]);
  check("game-clockwork-dispatch", "the deep tier's par climbs and opens above the shipped summit",
    deepPars.every((par, index) => (index === 0 || par > deepPars[index - 1]) && par > shippedMax),
    deepPars.join("/") + " vs shipped " + shippedMax);

  /* Mechanic proofs. A cut here moves a cell out of the layout rather than
   * deleting it from the array, because the engine indexes its arm state by
   * cell position - and the same cut on a shipped rung must leave that rung
   * solvable, or the cut would prove nothing about the new one. */
  const park = (level, kind) => {
    level.cells.forEach((cell) => {
      if (cell.kind === kind) {
        cell.x = 0;
        cell.y = 0;
      }
    });
    return level;
  };
  const d21 = byId("d21");
  const cut21Berth = App.dispatchSolve(park(copy(d21), "s")).solvable;
  const cut20Berth = App.dispatchSolve(park(copy(byId("d20")), "s")).solvable;
  const d21LongHold = copy(d21);
  d21LongHold.hold = 6;
  const cut21Hold = App.dispatchSolve(d21LongHold).solvable;
  check("game-clockwork-dispatch", "d21 cannot be routed at all once its berth is taken off the layout",
    !cut21Berth, "no-berth solvable=" + cut21Berth);
  check("game-clockwork-dispatch", "the same cut leaves the shipped summit routable, so d21's berth is its own lesson",
    cut20Berth, "d20 no-berth solvable=" + cut20Berth);
  check("game-clockwork-dispatch", "d21's short hold is part of the design: a longer hold makes it unsolvable",
    !cut21Hold, "hold 6 solvable=" + cut21Hold);

  const d22 = byId("d22");
  const d22East = copy(d22);
  d22East.stations[0].edge = "r";
  const d22BlockedColumn = copy(d22);
  d22BlockedColumn.rows = d22BlockedColumn.rows.slice();
  d22BlockedColumn.rows[2] = d22BlockedColumn.rows[2].slice(0, 7) + "#" + d22BlockedColumn.rows[2].slice(8);
  const cut22East = App.dispatchSolve(d22East).solvable;
  const cut22Column = App.dispatchSolve(d22BlockedColumn).solvable;
  check("game-clockwork-dispatch", "d22 is a westbound terminus: moving one platform to the right edge breaks it",
    d22.stations.every((station) => station.edge === "l") && !cut22East,
    d22.stations.map((station) => station.edge).join("") + " east solvable=" + cut22East);
  check("game-clockwork-dispatch", "d22's single drop column is the only way down",
    !cut22Column, "blocked solvable=" + cut22Column);

  const d23 = byId("d23");
  const d23NoHold = copy(d23);
  d23NoHold.hold = 0;
  const d23Proof = App.dispatchSolve(d23);
  const d23ReplayWithoutHold = App.dispatchRun(d23NoHold, d23Proof.plan, d23NoHold.limit);
  const cut23Berths = App.dispatchSolve(park(copy(d23), "s")).solvable;
  check("game-clockwork-dispatch", "d23 needs its berths to stretch the arrivals",
    d23.cells.filter((cell) => cell.kind === "s").length >= 2 && !cut23Berths,
    d23.cells.filter((cell) => cell.kind === "s").length + " berths, cut solvable=" + cut23Berths);
  check("game-clockwork-dispatch", "d23's own plan crashes on the board if the hold is removed",
    d23.hold >= 2 && !(d23ReplayWithoutHold.over === "win" && d23ReplayWithoutHold.crashes === 0),
    "hold " + d23.hold + " -> hold 0 replay " + d23ReplayWithoutHold.over + "/" + d23ReplayWithoutHold.crashes);

  const d24 = byId("d24");
  const d24BayToRight = copy(d24);
  const bayIndex = d24BayToRight.stations.findIndex((station) => station.edge === "b");
  d24BayToRight.stations[bayIndex].edge = "r";
  const cut24Bay = App.dispatchSolve(d24BayToRight).solvable;
  check("game-clockwork-dispatch", "d24 runs three live points down one column to three platforms",
    d24.cells.length === 3 && d24.cells.every((cell) => cell.kind === "p") &&
      new Set(d24.cells.map((cell) => cell.x)).size === 1 &&
      d24.stations.length === 3 && d24.stations.some((station) => station.edge === "b"),
    d24.cells.map((cell) => cell.kind + "@" + cell.x + "," + cell.y).join(" ") +
      " stations " + d24.stations.map((station) => station.edge).join(""));
  check("game-clockwork-dispatch", "d24's bay train cannot be handed to a side platform",
    bayIndex !== -1 && !cut24Bay, "bay moved to the right edge solvable=" + cut24Bay);

  /* Copy travels with the module. */
  const copyKeys = ["cwkZ21", "cwkZ22", "cwkZ23", "cwkZ24"];
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-clockwork-dispatch", "the four timetable names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
