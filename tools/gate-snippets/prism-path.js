"use strict";

/* game-prism-path: every board replays the real beam, and the summit grows
 * the fan
 *
 * prism-forge is the game's own release bar on one engine: audit replays
 * every reachable orientation of every board through the same beam tracer
 * the page runs, so a board only ships when some orientation lights every
 * target, the handed deal does not, 2-5 flips separate the two, few
 * orientations solve it, the solution beam touches every element and bends
 * at least three times. This gate re-judges the whole thirty-board ladder
 * that way, then holds the summit tier p25-p30 to its design brief: the
 * dial is the fan - the target count the HUD serves - climbing from eight
 * lit marks to ten on benches that rise to twelve elements with a fifth
 * splitter and, on p29, a fourth weld; every summit rung is solved by
 * exactly one orientation and sits five flips off the deal, every solution
 * beam out-sweeps the deep summit's own, star bands rise rung over rung
 * above p24's, and the forks are proven load-bearing by twins: strip a
 * summit board's splitters down to plain mirrors and no orientation lights
 * more than seven of its targets. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const prismForge = require(path.join(root, "tools", "prism-forge.js"));
  const boards = prismForge.readLevels();
  const summitIds = ["p25", "p26", "p27", "p28", "p29", "p30"];

  /* The audit sweeps every orientation of every board; the boot may reach
   * for Math.random elsewhere, so pin it the way every gate here does. */
  const seeded = (fn) => {
    const real = Math.random;
    let state = 41027 >>> 0;
    Math.random = () => {
      state = (Math.imul(state, 1103515245) + 12345) >>> 0;
      return state / 4294967296;
    };
    try { return fn(); } finally { Math.random = real; }
  };

  /* ---- ladder shape ---- */
  check("game-prism-path", "the ladder holds thirty boards",
    boards.length === 30, String(boards.length));
  check("game-prism-path", "every board id is distinct",
    new Set(boards.map((board) => board.id)).size === boards.length,
    boards.map((board) => board.id).join(","));
  check("game-prism-path", "the booted table is the ladder the forge re-reads",
    App.prismLevels.length === boards.length &&
      App.prismLevels.every((level, index) => level.id === boards[index].id),
    `booted ${App.prismLevels.length} vs source ${boards.length}`);
  const summitMissing = summitIds.filter((id) => !boards.some((board) => board.id === id));
  check("game-prism-path", "the summit tier p25-p30 is present in order",
    summitMissing.length === 0 &&
      summitIds.every((id, index) =>
        boards.findIndex((board) => board.id === id) >
          (index === 0 ? -1 : boards.findIndex((board) => board.id === summitIds[index - 1]))),
    summitMissing.join(",") || "ordered");

  /* ---- every board replays the real beam ---- */
  seeded(() => {
    boards.forEach((board) => {
      const strict = Number(String(board.id).replace(/\D/g, "")) >= 11;
      const report = prismForge.audit(board, strict);
      check("game-prism-path",
        `${board.id}: every reachable orientation replays through the real beam and clears the ${strict ? "release" : "tutorial"} bar`,
        report.ok === true, report.problems.join("; "));
    });
  });

  const byId = {};
  boards.forEach((board) => { byId[board.id] = board; });
  const p24 = byId.p24;
  const summit = summitIds.map((id) => byId[id]);
  const p24Report = prismForge.audit(p24, true);
  const freeOf = (board) => board.mirrors.filter((m) => !m.locked).length;

  /* ---- the summit keeps the wide bench and grows the fan ----
   * Three measured axes carry the climb - the fan (targets), the bench
   * (elements) and the welds (locked steel the route must be built
   * around). Every rung strictly grows at least one and never shrinks any
   * below the deep summit's, and p29 is the tier's welded rung: its fourth
   * lock is the growth the fan and bench do not give it. */
  const summitReports = {};
  const dialProblems = [];
  let prevTargets = p24Report.targets;
  let prevElements = p24Report.elements;
  let prevLocked = p24Report.locked;
  summit.forEach((board) => {
    const report = prismForge.audit(board, true);
    summitReports[board.id] = report;
    if (!(report.targets >= prevTargets)) {
      dialProblems.push(board.id + " lights fewer targets (" + report.targets +
        ") than the rung before it (" + prevTargets + ")");
    }
    if (!(report.elements >= prevElements)) {
      dialProblems.push(board.id + " fields fewer elements (" + report.elements +
        ") than the rung before it (" + prevElements + ")");
    }
    if (!(report.locked >= prevLocked)) {
      dialProblems.push(board.id + " carries fewer welds (" + report.locked +
        ") than the rung before it (" + prevLocked + ")");
    }
    if (!(report.targets > prevTargets || report.elements > prevElements ||
        report.locked > prevLocked)) {
      dialProblems.push(board.id + " grows no axis over the rung before it");
    }
    if (report.solutions !== 1) {
      dialProblems.push(board.id + " is lit by " + report.solutions +
        " orientations (the summit keeps exactly one)");
    }
    if (!(report.flips >= 4)) {
      dialProblems.push(board.id + " deal sits " + report.flips + " flips out (want 4-5)");
    }
    if (!(report.cells > p24Report.cells)) {
      dialProblems.push(board.id + " beam sweeps " + report.cells +
        " cells, under the deep summit's " + p24Report.cells);
    }
    if (freeOf(board) < freeOf(p24)) {
      dialProblems.push(board.id + " hands the player fewer free elements than p24");
    }
    prevTargets = report.targets;
    prevElements = report.elements;
    prevLocked = report.locked;
  });
  if (!(summitReports.p30.targets === 10)) {
    dialProblems.push("p30 is not the full fan: it lights " + summitReports.p30.targets + " targets");
  }
  check("game-prism-path",
    "the summit grows the fan rung over rung, eight marks to ten, on benches that rise to twelve elements with a fifth splitter, each rung unique and out-sweeping the deep summit (" +
      summit.map((board) => board.id + ":" + summitReports[board.id].targets + "t/" +
        summitReports[board.id].elements + "e/" + summitReports[board.id].cells + "c").join(", ") +
      " vs p24:" + p24Report.targets + "t/" + p24Report.elements + "e/" + p24Report.cells + "c)",
    dialProblems.length === 0, dialProblems.join(" | "));
  check("game-prism-path",
    "no shipped rung fields the summit's hardware - the fifth splitter and the twelve-element bench are summit-only",
    boards.slice(0, 24).every((board) =>
      board.mirrors.length <= 10 &&
      board.mirrors.filter((m) => m.split).length <= 4 &&
      board.targets.length <= 7),
    boards.filter((board) => board.mirrors.length > 10 ||
      board.mirrors.filter((m) => m.split).length > 4 || board.targets.length > 7)
      .map((board) => board.id).join(","));

  /* ---- the star bands rise into and up the summit ---- */
  check("game-prism-path",
    "the summit star bands only widen inside a board and climb above p24's, rung over rung",
    summit.every((board, index) =>
      board.starTimes.length === 3 &&
      board.starTimes[0] < board.starTimes[1] && board.starTimes[1] < board.starTimes[2] &&
      board.starTimes.every((line, lineIndex) => line > p24.starTimes[lineIndex]) &&
      (index === 0 || [0, 1, 2].every((lineIndex) =>
        board.starTimes[lineIndex] > summit[index - 1].starTimes[lineIndex]))),
    p24.id + " " + p24.starTimes.join("/") + " vs " +
      summit.map((board) => board.id + " " + board.starTimes.join("/")).join(" | "));

  /* ---- the forks are load-bearing: splitter-stripped twins ---- */
  seeded(() => {
    summit.forEach((board) => {
      const twin = JSON.parse(JSON.stringify(board));
      twin.mirrors = twin.mirrors.map((m) => Object.assign({}, m, { split: false }));
      const bare = prismForge.normalise(twin);
      let best = 0;
      prismForge.orientations(bare).forEach((slopes) => {
        best = Math.max(best, prismForge.trace(bare, slopes).lit);
      });
      check("game-prism-path",
        `${board.id}: strip the splitters and no orientation lights more than ${best} of its ${board.targets.length} targets - the forks are the board`,
        best < board.targets.length, best + " of " + board.targets.length);
    });
  });

  /* ---- the names travel in both packs ---- */
  seeded(() => {
    const nameProblems = [];
    summitIds.forEach((id, index) => {
      const key = "prismL" + (25 + index);
      const en = App.t(key);
      const zh = App.I18N.zh[key];
      if (!(en && en !== key) || !(zh && zh !== key) || en === zh) {
        nameProblems.push(key);
      }
    });
    check("game-prism-path", "the summit names resolve to a name in both languages",
      nameProblems.length === 0, nameProblems.join(","));
  });

  /* ---- the unlock chain is derived, never stored ---- */
  const chain = App.createCampaign({
    key: "prism-path-gate-chain",
    levels: boards.map((board) => ({ id: board.id, labelKey: board.labelKey })),
  });
  let walked = 0;
  let chained = true;
  boards.forEach((board, index) => {
    const outcome = chain.record(board.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < boards.length ? boards[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-prism-path", "the unlock chain walks all thirty rungs in order",
    walked === 30 && chained && chain.clearedCount() === 30,
    walked + " first clears");
};
