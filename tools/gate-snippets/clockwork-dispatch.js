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
 * without, and the bay platform d24 cannot deliver to otherwise. The summit
 * tier gets the same treatment: d25's westbound return, d26's held column,
 * d27's one-way climb, d28's second berth, d29's reversal point and d30's
 * low west exit are each taken away from a clone and the rung must break. The
 * appended d31-d40 tier is cut the same way, and its two lower bands are shown
 * reachable by replaying padded winning plans at par + 2 and par + 5. */
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
  const priorIds = ["d21", "d22", "d23", "d24"];
  const deepIds = ["d25", "d26", "d27", "d28", "d29", "d30"];
  const summitIds = ["d31", "d32", "d33", "d34", "d35", "d36", "d37", "d38", "d39", "d40"];

  check("game-clockwork-dispatch", "the ladder holds at least thirty timetables",
    levels.length >= 30, String(levels.length));
  check("game-clockwork-dispatch", "every timetable id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missingPrior = priorIds.filter((id) => !byId(id));
  const missingDeep = deepIds.filter((id) => !byId(id));
  check("game-clockwork-dispatch", "the d21-d24 tier is present",
    missingPrior.length === 0, missingPrior.join(","));
  check("game-clockwork-dispatch", "the summit tier d25-d30 is present",
    missingDeep.length === 0, missingDeep.join(","));
  /* A floor, never an exact count: other tiers may append later. */
  check("game-clockwork-dispatch", "the ladder holds at least forty timetables",
    levels.length >= 40, String(levels.length));
  const missingSummit = summitIds.filter((id) => !byId(id));
  check("game-clockwork-dispatch", "the d31-d40 tier is present",
    missingSummit.length === 0, missingSummit.join(","));

  /* Bands must stay derived: a row that grows a starMoves field would quietly
   * replace the solver's number with an authored one. */
  const authored = levels.filter((level) => level.starMoves || level.bands || level.starFlips);
  check("game-clockwork-dispatch", "no timetable carries an authored star band",
    authored.length === 0, authored.map((level) => level.id).join(","));

  const proofProblems = [];
  const pars = {};
  const plans = {};
  levels.forEach((level) => {
    /* dispatchSolvable is the module's own bundle: the search, the plain-board
     * simulation that says whether the rung plays itself, and a replay of the
     * plan it found. */
    const proof = App.dispatchSolvable(level);
    pars[level.id] = proof.par;
    plans[level.id] = proof.plan;
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

  /* The new tier is the hard tier on the solver's own currency: it has to
   * climb inside itself and open above everything shipped before it. */
  const shippedMax = Math.max.apply(null, levels.slice(0, 20).map((level) => pars[level.id]));
  const priorPars = priorIds.map((id) => pars[id]);
  check("game-clockwork-dispatch", "the d21-d24 tier's par climbs and opens above the shipped summit",
    priorPars.every((par, index) => (index === 0 || par > priorPars[index - 1]) && par > shippedMax),
    priorPars.join("/") + " vs shipped " + shippedMax);

  const fittedMax = Math.max.apply(null, levels.slice(0, 24).map((level) => pars[level.id]));
  const deepPars = deepIds.map((id) => pars[id]);
  check("game-clockwork-dispatch", "the summit tier d25-d30 climbs and every rung opens above d24",
    deepPars.every((par, index) => (index === 0 || par > deepPars[index - 1]) && par > fittedMax),
    deepPars.join("/") + " vs d01-d24 " + fittedMax);

  /* The appended tier has to keep climbing on the prover's own number and has
   * to open above the shipped summit, so a later tier cannot be a step down. */
  const priorMax = Math.max.apply(null, levels.slice(0, 30).map((level) => pars[level.id]));
  const summitPars = summitIds.map((id) => pars[id]);
  check("game-clockwork-dispatch", "the d31-d40 tier climbs and every rung opens above d30",
    summitPars.every((par, index) => (index === 0 || par > summitPars[index - 1]) && par > priorMax),
    summitPars.join("/") + " vs d01-d30 " + priorMax);

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

  const d25 = byId("d25");
  const d25LowWest = d25.stations.findIndex((station) => station.edge === "l" && station.pos === 5);
  const d25East = copy(d25);
  if (d25LowWest !== -1) {
    d25East.stations[d25LowWest].edge = "r";
  }
  const cut25East = d25LowWest === -1 ? true : App.dispatchSolve(d25East).solvable;
  check("game-clockwork-dispatch", "d25 is a westbound return: both platforms sit on the left edge and moving the low one east breaks it",
    d25.stations.length === 2 && d25.stations.every((station) => station.edge === "l") &&
      d25.cells.length === 3 && d25.cells.every((cell) => cell.kind === "p" && cell.x === 7) &&
      d25LowWest !== -1 && !cut25East,
    d25.stations.map((station) => station.edge).join("") + " east solvable=" + cut25East);

  const d26 = byId("d26");
  const d26Proof = App.dispatchSolve(d26);
  const d26NoHold = copy(d26);
  d26NoHold.hold = 0;
  const d26Replay = App.dispatchRun(d26NoHold, d26Proof.plan, d26NoHold.limit);
  const d26Berths = d26.cells.filter((cell) => cell.kind === "s").length;
  const cut26Berth = App.dispatchSolve(park(copy(d26), "s")).solvable;
  check("game-clockwork-dispatch", "d26's held column is a berth away from being unroutable",
    d26.hold >= 3 && d26Berths === 1 && !cut26Berth,
    "hold " + d26.hold + ", " + d26Berths + " berths, cut solvable=" + cut26Berth);
  check("game-clockwork-dispatch", "d26's own plan crashes on the board if the hold is removed",
    d26Proof.solvable && !(d26Replay.over === "win" && d26Replay.crashes === 0),
    "hold 0 replay " + d26Replay.over + "/" + d26Replay.crashes + " " +
      d26Replay.delivered + "/" + d26.trains.length);

  const d27 = byId("d27");
  const d27Blocked = copy(d27);
  d27Blocked.rows = d27Blocked.rows.slice();
  d27Blocked.rows[2] = d27Blocked.rows[2].slice(0, 5) + "#" + d27Blocked.rows[2].slice(6);
  const cut27Column = App.dispatchSolve(d27Blocked).solvable;
  check("game-clockwork-dispatch", "d27 is a one-way climb: every point turns traffic up and blocking the column strands the high platform",
    d27.cells.length === 3 &&
      d27.cells.every((cell) => cell.kind === "p" && cell.x === 5 && cell.b === 1) &&
      d27.stations.some((station) => station.edge === "t" && station.pos === 5) &&
      !cut27Column,
    "blocked solvable=" + cut27Column);

  const d28 = byId("d28");
  const nearBerth = d28.cells.findIndex((cell) => cell.kind === "s" && cell.x === 2);
  const farBerth = d28.cells.findIndex((cell) => cell.kind === "s" && cell.x === 3);
  const d28NearCut = copy(d28);
  const d28FarCut = copy(d28);
  let cut28Near = true;
  let cut28Far = true;
  if (nearBerth !== -1) {
    d28NearCut.cells[nearBerth].x = 0;
    d28NearCut.cells[nearBerth].y = 0;
    cut28Near = App.dispatchSolve(d28NearCut).solvable;
  }
  if (farBerth !== -1) {
    d28FarCut.cells[farBerth].x = 0;
    d28FarCut.cells[farBerth].y = 0;
    cut28Far = App.dispatchSolve(d28FarCut).solvable;
  }
  check("game-clockwork-dispatch", "d28 is a two-berth ladder: neither berth alone holds the bay train long enough",
    d28.cells.filter((cell) => cell.kind === "s").length === 2 &&
      nearBerth !== -1 && farBerth !== -1 && !cut28Near && !cut28Far,
    "near cut solvable=" + cut28Near + ", far cut solvable=" + cut28Far);

  const d29 = byId("d29");
  const d29Turn = d29.cells.findIndex((cell) =>
    cell.kind === "p" && cell.x === 5 && cell.y === 1 && cell.a === 2 && cell.b === 0);
  const d29Proof = App.dispatchSolve(d29);
  const d29Fixed = copy(d29);
  if (d29Turn !== -1) {
    d29Fixed.cells[d29Turn].a = 0;
    d29Fixed.cells[d29Turn].b = 0;
  }
  const cut29Replay = App.dispatchRun(d29Fixed, d29Proof.plan, d29Fixed.limit);
  check("game-clockwork-dispatch", "d29's reversal point is load-bearing: its own winning plan fails when the point is fixed east",
    d29Turn !== -1 && d29Proof.solvable &&
      !(cut29Replay.over === "win" && cut29Replay.crashes === 0),
    "replay " + cut29Replay.over + "/" + cut29Replay.crashes + " " +
      cut29Replay.delivered + "/" + d29.trains.length);

  const d30 = byId("d30");
  const d30LowWest = d30.stations.findIndex((station) => station.edge === "l" && station.pos === 5);
  const d30East = copy(d30);
  if (d30LowWest !== -1) {
    d30East.stations[d30LowWest].edge = "r";
  }
  const cut30East = d30LowWest === -1 ? true : App.dispatchSolve(d30East).solvable;
  check("game-clockwork-dispatch", "d30 is the summit: three points over four platforms, and its low west exit cannot move east",
    d30.cells.length === 3 && d30.cells.every((cell) => cell.kind === "p") &&
      new Set(d30.cells.map((cell) => cell.x)).size === 1 &&
      d30.stations.length === 4 &&
      d30.stations.some((station) => station.edge === "l") &&
      d30.stations.some((station) => station.edge === "b") &&
      d30LowWest !== -1 && !cut30East,
    "cells x " + d30.cells.map((cell) => cell.x).join(",") +
      " stations " + d30.stations.map((station) => station.edge).join("") +
      " east solvable=" + cut30East);

  /* Copy travels with the module. */
  const copyKeys = [
    "cwkZ21", "cwkZ22", "cwkZ23", "cwkZ24",
    "cwkZ25", "cwkZ26", "cwkZ27", "cwkZ28", "cwkZ29", "cwkZ30",
  ];
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-clockwork-dispatch", "the deep-tier names cwkZ21-cwkZ30 resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The appended tier gets the same treatment. Each cut removes exactly the
   * mechanic that rung's name advertises, on a clone that drops the cached
   * board first, and the rung must stop solving. */
  const d31 = byId("d31");
  const d31Fixed = copy(d31);
  d31Fixed.cells[0].a = 0;
  d31Fixed.cells[0].b = 0;
  const cut31 = App.dispatchSolve(d31Fixed).solvable;
  check("game-clockwork-dispatch", "d31 is forty-two trains on one split point: fixed east, the top platform is stranded",
    d31.cells.length === 1 && d31.cells[0].kind === "p" && !cut31,
    "cells " + d31.cells.length + ", fixed east solvable=" + cut31);

  const d32 = byId("d32");
  const d32Far = d32.cells.findIndex((cell) => cell.kind === "s" && cell.x === 3);
  const d32Cut = copy(d32);
  if (d32Far !== -1) {
    d32Cut.cells[d32Far].x = 0;
    d32Cut.cells[d32Far].y = 0;
  }
  const cut32Far = d32Far === -1 ? true : App.dispatchSolve(d32Cut).solvable;
  check("game-clockwork-dispatch", "d32 is far-berth-first: without the far berth the near one alone cannot pace the bay train",
    d32Far !== -1 && !cut32Far, "far berth " + d32Far + ", cut solvable=" + cut32Far);

  const d33 = byId("d33");
  const d33West = d33.stations.findIndex((station) => station.edge === "l" && station.pos === 5);
  const d33East = copy(d33);
  if (d33West !== -1) {
    d33East.stations[d33West].edge = "r";
  }
  const cut33West = d33West === -1 ? true : App.dispatchSolve(d33East).solvable;
  check("game-clockwork-dispatch", "d33 pairs a westbound platform with a bay: moving the low stop east breaks the timetable",
    d33West !== -1 && !cut33West, "west platform " + d33West + ", east solvable=" + cut33West);

  const d34 = byId("d34");
  const d34High = copy(d34);
  d34High.cells[0].a = 0;
  d34High.cells[0].b = 0;
  const cut34High = App.dispatchSolve(d34High).solvable;
  check("game-clockwork-dispatch", "d34 is a two-bank column: fixing the high-bank point east cuts one half of the exchange",
    d34.cells.length === 4 && !cut34High, "fixed east solvable=" + cut34High);

  const d35 = byId("d35");
  const d35Mid = d35.cells.findIndex((cell) => cell.kind === "p" && cell.x === 5 && cell.y === 3);
  const d35Cut = copy(d35);
  if (d35Mid !== -1) {
    d35Cut.cells[d35Mid].b = 2;
  }
  const cut35Mid = d35Mid === -1 ? true : App.dispatchSolve(d35Cut).solvable;
  check("game-clockwork-dispatch", "d35's three colours share one column: turning the middle point west strands its platforms",
    d35Mid !== -1 && !cut35Mid, "middle point " + d35Mid + ", west solvable=" + cut35Mid);

  const d36 = byId("d36");
  const d36Short = copy(d36);
  d36Short.hold = 1;
  const cut36Hold = App.dispatchSolve(d36Short).solvable;
  check("game-clockwork-dispatch", "d36 is the hold-three queue: shortening the hold to one tick stops the board solving",
    d36.hold === 3 && !cut36Hold, "hold " + d36.hold + " -> 1 solvable=" + cut36Hold);

  const d37 = byId("d37");
  const d37Berth = d37.cells.findIndex((cell) => cell.kind === "s");
  const d37Cut = copy(d37);
  if (d37Berth !== -1) {
    d37Cut.cells[d37Berth].x = 0;
    d37Cut.cells[d37Berth].y = 0;
  }
  const cut37Berth = d37Berth === -1 ? true : App.dispatchSolve(d37Cut).solvable;
  check("game-clockwork-dispatch", "d37 throws one siding for two trains: with the berth gone the exchange stops solving",
    d37Berth !== -1 && !cut37Berth, "berth " + d37Berth + ", cut solvable=" + cut37Berth);

  const d38 = byId("d38");
  const d38Near = d38.cells.findIndex((cell) => cell.kind === "p" && cell.x === 3 && cell.y === 3);
  const d38Cut = copy(d38);
  if (d38Near !== -1) {
    d38Cut.cells[d38Near].a = 0;
    d38Cut.cells[d38Near].b = 0;
  }
  const cut38Near = d38Near === -1 ? true : App.dispatchSolve(d38Cut).solvable;
  check("game-clockwork-dispatch", "d38's twin lifts share a throat: fixing the near lift east strands its top platform",
    d38Near !== -1 && !cut38Near, "near lift " + d38Near + ", fixed east solvable=" + cut38Near);

  const d39 = byId("d39");
  const d39Trap = d39.cells.findIndex((cell) => cell.kind === "p" && cell.x === 2 && cell.y === 5);
  const d39Cut = copy(d39);
  if (d39Trap !== -1) {
    d39Cut.cells[d39Trap].b = 1;
  }
  const cut39Trap = d39Trap === -1 ? true : App.dispatchSolve(d39Cut).solvable;
  check("game-clockwork-dispatch", "d39's trap point must be thrown before the main timetable: both arms up wrecks the line",
    d39Trap !== -1 && !cut39Trap, "trap point " + d39Trap + ", both-up solvable=" + cut39Trap);

  const d40 = byId("d40");
  const d40Cut = copy(d40);
  d40Cut.cells[0].a = 0;
  d40Cut.cells[0].b = 0;
  const cut40 = App.dispatchSolve(d40Cut).solvable;
  check("game-clockwork-dispatch", "d40 is the grand exchange: fixing a bank point east collapses the shared throat",
    d40.cells.length === 4 && !cut40, "fixed east solvable=" + cut40);

  /* Bands are derived, never authored, so the lower bands exist only if some
   * winning line spends par + 2 and par + 5 flips. Each candidate adds paired
   * flips on a point in a quiet step (net zero) plus, for the five-flip line,
   * three flips late enough that no train is on that point any more. The
   * public runner decides: the padded plan must win with every flip scheduled. */
  const bandProblems = [];
  const bandValues = [];
  summitIds.forEach((id) => {
    const level = byId(id);
    const base = plans[id] || [];
    const baseRun = App.dispatchRun(level, base, level.limit);
    if (baseRun.over !== "win") {
      bandProblems.push(id + ":base " + baseRun.over);
      return;
    }
    const frames = baseRun.frames;
    const lastTick = frames.length - 1;
    const pointCells = [];
    level.cells.forEach((cell, index) => {
      if (cell.kind === "p") {
        pointCells.push(index);
      }
    });
    const occupied = (x, y, tick) => {
      const frame = frames[tick];
      return !!frame && frame.trains.some((train) => train.x === x && train.y === y);
    };
    const quiet = (x, y, tick) => tick >= 1 && !occupied(x, y, tick) && !occupied(x, y, tick - 1);
    const valueAt = (index, tick) => {
      let value = level.cells[index].init ? 1 : 0;
      base.forEach((flip) => {
        if (flip.cell === index && flip.tick <= tick) {
          value = flip.value ? 1 : 0;
        }
      });
      return value;
    };
    const wins = (plan) => {
      const run = App.dispatchRun(level, plan, level.limit);
      return run.over === "win" && run.crashes === 0 &&
        run.delivered === level.trains.length && run.unscheduled === 0;
    };
    let plus2 = null;
    let plus5 = null;
    pointCells.forEach((index) => {
      if (plus2 && plus5) {
        return;
      }
      const cell = level.cells[index];
      const pairAt = (tick) => {
        const value = valueAt(index, tick);
        return [
          { cell: index, value: value ? 0 : 1, tick: tick },
          { cell: index, value: value, tick: tick },
        ];
      };
      if (!plus2) {
        for (let tick = 1; tick <= lastTick; tick += 1) {
          if (!quiet(cell.x, cell.y, tick)) {
            continue;
          }
          const candidate = base.concat(pairAt(tick));
          if (wins(candidate)) {
            plus2 = candidate;
            break;
          }
        }
      }
      if (plus2 && !plus5) {
        for (let tick = lastTick; tick >= 1; tick -= 1) {
          if (!quiet(cell.x, cell.y, tick)) {
            continue;
          }
          const value = valueAt(index, tick);
          const triple = pairAt(1).concat([
            { cell: index, value: value ? 0 : 1, tick: tick },
            { cell: index, value: value, tick: tick },
            { cell: index, value: value ? 0 : 1, tick: tick },
          ]);
          const candidate = base.concat(triple);
          if (wins(candidate)) {
            plus5 = candidate;
            break;
          }
        }
      }
    });
    if (!plus2) {
      bandProblems.push(id + ":no-par+2");
    }
    if (!plus5) {
      bandProblems.push(id + ":no-par+5");
    }
    if (plus2 && plus5) {
      bandValues.push(id + " " + pars[id] + "+2/+5");
    }
  });
  check("game-clockwork-dispatch", "every d31-d40 rung also wins at par + 2 and par + 5, so both lower star bands are reachable",
    bandProblems.length === 0, bandProblems.length ? bandProblems.join(" | ") : bandValues.join(" "));

  const summitCopyKeys = ["cwkZ31", "cwkZ32", "cwkZ33", "cwkZ34", "cwkZ35",
    "cwkZ36", "cwkZ37", "cwkZ38", "cwkZ39", "cwkZ40"];
  const summitCopyProblems = summitCopyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-clockwork-dispatch", "the d31-d40 names cwkZ31-cwkZ40 resolve in both languages",
    summitCopyProblems.length === 0, summitCopyProblems.join(","));
};
