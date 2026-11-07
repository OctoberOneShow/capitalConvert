"use strict";

/* game-prism-path: every board replays the real beam, and the top two tiers
 * are held to their own design briefs
 *
 * prism-forge is the game's own release bar on one engine: audit replays
 * every reachable orientation of every board through the same beam tracer
 * the page runs, so a board only ships when some orientation lights every
 * target, the handed deal does not, 2-5 flips separate the two, few
 * orientations solve it, the solution beam touches every element and bends
 * at least three times. This gate re-judges the whole sixty-board ladder
 * that way, then holds the summit tier p25-p30 to its design brief: the
 * dial is the fan - the target count the HUD serves - climbing from eight
 * lit marks to ten on benches that rise to twelve elements with a fifth
 * splitter and, on p29, a fourth weld; every summit rung is solved by
 * exactly one orientation and sits five flips off the deal, every solution
 * beam out-sweeps the deep summit's own, star bands rise rung over rung
 * above p24's, and the forks are proven load-bearing by twins: strip a
 * summit board's splitters down to plain mirrors and no orientation lights
 * more than seven of its targets.
 *
 * The observatory tier p31-p40 takes one structural record per rung against
 * every board before it, each a number the engine printed: p31 the first
 * eleven-across bench, p32 the first sweep past Supernova's fifty-seven
 * cells (fifty-nine), p33 the first six-fork bench, p34 the first five-weld
 * board, p35 the first eleven-mark fan, p36 the first thirteen-element
 * bench, p37 the bendiest route the game has carried (twenty-one bends
 * against the summit's fifteen), p38 the first twelve-across bench, p39 the
 * heaviest sweep (seventy-one cells), and p40 the capstone - twelve marks
 * lit by exactly one orientation out of two hundred and fifty-six. The
 * dials never fall rung over rung - targets, elements, forks, welds and
 * the paper itself only climb - every deal in the tier sits five flips out,
 * three of the deals start in the dark, star bands climb above p30's, and
 * the same twin test proves the sixth fork load-bearing: stripped, no
 * orientation lights more than eight of any observatory board's targets.
 *
 * The zenith tier p41-p46 keeps the same bar and takes one record per rung
 * against every board before it: p41 the first thirteen-across bench, p42
 * the first seven-fork bench, p43 the first fourteen-element bench, p44 the
 * first six-weld board, p45 the heaviest sweep the game has carried
 * (eighty-seven cells, past p39's seventy-one), and p46 the closer -
 * thirteen marks, a mark more than any board before it, lit by exactly one
 * orientation. The dials never fall, every deal sits five flips out, two of
 * the deals start in the dark, star bands climb above p40's, and the twin
 * test proves the seventh fork load-bearing like the sixth.
 *
 * The apex tier p47-p50 keeps the zenith's bar and takes one record per
 * rung against every board before it: p47 the first fourteen-across bench,
 * p48 the first eight-fork bench, p49 the first fifteen-element bench, and
 * p50 the closer - fourteen marks, a mark more than any board before it,
 * lit by exactly one orientation out of five hundred and twelve. The dials
 * never fall, every deal sits five flips out, one of the deals starts in
 * the dark, star bands climb above p46's, and the twin test proves the
 * eighth fork load-bearing like the seventh.
 *
 * The pinnacle tier p51-p60 keeps the apex's bar and takes one record per
 * rung against every board before it: p51 the first fifteen-across bench,
 * p52 the first nine-fork bench, p53 the first sixteen-element bench, p54
 * the first seven-weld board, p55 the first fifteen-mark fan, p56 the
 * heaviest sweep the game has carried (a hundred and twelve cells, past
 * p45's eighty-seven) lit from a single orientation, p57 the first
 * sixteen-across bench, p58 the bendiest route the game has carried
 * (twenty-nine bends against p53's twenty-seven) also unique, p59 the
 * first seventeen-element bench, and p60 the capstone - sixteen marks, a
 * mark more than any board before it, lit by exactly one orientation out
 * of a thousand and twenty-four. The dials never fall, every deal sits
 * five flips out, none of the ten deals starts in the dark - the heavy
 * hardware glows a mark or two even as dealt - star bands climb above
 * p50's, and the twin test proves the ninth fork load-bearing like the
 * eighth. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const prismForge = require(path.join(root, "tools", "prism-forge.js"));
  const boards = prismForge.readLevels();
  const summitIds = ["p25", "p26", "p27", "p28", "p29", "p30"];
  const observatoryIds = ["p31", "p32", "p33", "p34", "p35", "p36", "p37", "p38", "p39", "p40"];
  const zenithIds = ["p41", "p42", "p43", "p44", "p45", "p46"];
  const apexIds = ["p47", "p48", "p49", "p50"];
  const pinnacleIds = [
    "p51", "p52", "p53", "p54", "p55", "p56", "p57", "p58", "p59", "p60",
  ];

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
  check("game-prism-path", "the ladder holds sixty boards",
    boards.length === 60, String(boards.length));
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
  const observatoryMissing =
    observatoryIds.filter((id) => !boards.some((board) => board.id === id));
  check("game-prism-path", "the observatory tier p31-p40 is present in order",
    observatoryMissing.length === 0 &&
      observatoryIds.every((id, index) =>
        boards.findIndex((board) => board.id === id) >
          (index === 0 ? boards.findIndex((board) => board.id === "p30")
            : boards.findIndex((board) => board.id === observatoryIds[index - 1]))),
    observatoryMissing.join(",") || "ordered");
  const zenithMissing =
    zenithIds.filter((id) => !boards.some((board) => board.id === id));
  check("game-prism-path", "the zenith tier p41-p46 is present in order",
    zenithMissing.length === 0 &&
      zenithIds.every((id, index) =>
        boards.findIndex((board) => board.id === id) >
          (index === 0 ? boards.findIndex((board) => board.id === "p40")
            : boards.findIndex((board) => board.id === zenithIds[index - 1]))),
    zenithMissing.join(",") || "ordered");
  const apexMissing =
    apexIds.filter((id) => !boards.some((board) => board.id === id));
  check("game-prism-path", "the apex tier p47-p50 is present in order",
    apexMissing.length === 0 &&
      apexIds.every((id, index) =>
        boards.findIndex((board) => board.id === id) >
          (index === 0 ? boards.findIndex((board) => board.id === "p46")
            : boards.findIndex((board) => board.id === apexIds[index - 1]))),
    apexMissing.join(",") || "ordered");
  const pinnacleMissing =
    pinnacleIds.filter((id) => !boards.some((board) => board.id === id));
  check("game-prism-path", "the pinnacle tier p51-p60 is present in order",
    pinnacleMissing.length === 0 &&
      pinnacleIds.every((id, index) =>
        boards.findIndex((board) => board.id === id) >
          (index === 0 ? boards.findIndex((board) => board.id === "p50")
            : boards.findIndex((board) => board.id === pinnacleIds[index - 1]))),
    pinnacleMissing.join(",") || "ordered");

  /* ---- every board replays the real beam ---- */
  const reports = {};
  seeded(() => {
    boards.forEach((board) => {
      const strict = Number(String(board.id).replace(/\D/g, "")) >= 11;
      const report = prismForge.audit(board, strict);
      reports[board.id] = report;
      check("game-prism-path",
        `${board.id}: every reachable orientation replays through the real beam and clears the ${strict ? "release" : "tutorial"} bar`,
        report.ok === true, report.problems.join("; "));
    });
  });

  const byId = {};
  boards.forEach((board) => { byId[board.id] = board; });
  const p24 = byId.p24;
  const p30 = byId.p30;
  const summit = summitIds.map((id) => byId[id]);
  const observatory = observatoryIds.map((id) => byId[id]);
  const p24Report = prismForge.audit(p24, true);
  const p30Report = prismForge.audit(p30, true);
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
    "no rung below the summit fields the summit's hardware - the fifth splitter and the twelve-element bench live above p24",
    boards.slice(0, 24).every((board) =>
      board.mirrors.length <= 10 &&
      board.mirrors.filter((m) => m.split).length <= 4 &&
      board.targets.length <= 7),
    boards.filter((board) => board.mirrors.length > 10 ||
      board.mirrors.filter((m) => m.split).length > 4 || board.targets.length > 7)
      .map((board) => board.id).join(","));

  /* ---- the observatory takes one record per rung ----
   * The dials the summit grew - fan, bench, forks, welds, paper - never
   * fall across the tier, every deal sits five flips out, no rung hands
   * the player fewer free elements than p24, and each rung's record is
   * asserted as the number the forge printed, against every board before
   * it. The three rungs whose records are measured off the solution beam
   * solve from exactly one orientation, so the measured beam is the
   * beam. */
  const obsReports = {};
  const obsProblems = [];
  let prevObs = {
    targets: p30Report.targets,
    elements: p30Report.elements,
    splitters: p30Report.splitters,
    locked: p30Report.locked,
    w: p30.w,
    h: p30.h,
  };
  observatory.forEach((board) => {
    const report = prismForge.audit(board, true);
    obsReports[board.id] = report;
    if (!(report.targets >= prevObs.targets)) {
      obsProblems.push(board.id + " lights fewer targets (" + report.targets +
        ") than the rung before it (" + prevObs.targets + ")");
    }
    if (!(report.elements >= prevObs.elements)) {
      obsProblems.push(board.id + " fields fewer elements (" + report.elements +
        ") than the rung before it (" + prevObs.elements + ")");
    }
    if (!(report.splitters >= prevObs.splitters)) {
      obsProblems.push(board.id + " rides fewer forks (" + report.splitters +
        ") than the rung before it (" + prevObs.splitters + ")");
    }
    if (!(report.locked >= prevObs.locked)) {
      obsProblems.push(board.id + " carries fewer welds (" + report.locked +
        ") than the rung before it (" + prevObs.locked + ")");
    }
    if (!(board.w >= prevObs.w && board.h >= prevObs.h)) {
      obsProblems.push(board.id + " shrinks the paper below the rung before it");
    }
    if (report.solutions > 2) {
      obsProblems.push(board.id + " is lit by " + report.solutions +
        " orientations (the observatory keeps at most two)");
    }
    if (!(report.flips >= 4)) {
      obsProblems.push(board.id + " deal sits " + report.flips + " flips out (want 4-5)");
    }
    if (freeOf(board) < freeOf(p24)) {
      obsProblems.push(board.id + " hands the player fewer free elements than p24");
    }
    prevObs = {
      targets: report.targets,
      elements: report.elements,
      splitters: report.splitters,
      locked: report.locked,
      w: board.w,
      h: board.h,
    };
  });
  if (!(obsReports.p40.targets === 12)) {
    obsProblems.push("p40 is not the full fan: it lights " + obsReports.p40.targets + " targets");
  }
  check("game-prism-path",
    "the observatory takes one record per rung and never lowers a dial (" +
      observatory.map((board) => board.id + ":" + obsReports[board.id].targets + "t/" +
        obsReports[board.id].elements + "e/" + obsReports[board.id].splitters + "s/" +
        obsReports[board.id].locked + "w/" + obsReports[board.id].cells + "c").join(", ") +
      " vs p30:" + p30Report.targets + "t/" + p30Report.elements + "e/" +
      p30Report.splitters + "s/" + p30Report.locked + "w/" + p30Report.cells + "c)",
    obsProblems.length === 0, obsProblems.join(" | "));

  /* The records themselves, each scoped by position: the number the rung
   * advertises, and the previous peak it beats. Peaks read the reports the
   * whole-ladder pass already collected, so the tutorial rows keep their
   * own bar. */
  const obsPeak = (pick, id) => Math.max.apply(null,
    boards.slice(0, boards.findIndex((board) => board.id === id))
      .map((board) => pick(reports[board.id])));
  /* The paper's width rides on the literal, not the audit report. */
  const obsPeakSide = (id) => Math.max.apply(null,
    boards.slice(0, boards.findIndex((board) => board.id === id))
      .map((board) => board.w));
  check("game-prism-path",
    "p31 opens the first eleven-across bench",
    byId.p31.w === 11 && byId.p31.h === 11 && obsPeakSide("p31") < 11,
    "previous peak " + obsPeakSide("p31"));
  check("game-prism-path",
    "p32 sweeps past the summit's ceiling: fifty-nine cells, past Supernova's fifty-seven, from a single orientation",
    obsReports.p32.cells === 59 && obsReports.p32.solutions === 1 &&
      obsPeak((r) => r.cells, "p32") < 59,
    "previous peak " + obsPeak((r) => r.cells, "p32"));
  check("game-prism-path",
    "p33 rides the first six-fork bench",
    obsReports.p33.splitters === 6 && obsPeak((r) => r.splitters, "p33") < 6,
    "previous peak " + obsPeak((r) => r.splitters, "p33"));
  check("game-prism-path",
    "p34 bolts down the first five-weld board",
    obsReports.p34.locked === 5 && obsPeak((r) => r.locked, "p34") < 5,
    "previous peak " + obsPeak((r) => r.locked, "p34"));
  check("game-prism-path",
    "p35 lights the first eleven-mark fan",
    obsReports.p35.targets === 11 && obsPeak((r) => r.targets, "p35") < 11,
    "previous peak " + obsPeak((r) => r.targets, "p35"));
  check("game-prism-path",
    "p36 fields the first thirteen-element bench",
    obsReports.p36.elements === 13 && obsPeak((r) => r.elements, "p36") < 13,
    "previous peak " + obsPeak((r) => r.elements, "p36"));
  check("game-prism-path",
    "p37 runs the bendiest route the game has carried: twenty-one bends against the summit's fifteen, from a single orientation",
    obsReports.p37.turns === 21 && obsReports.p37.solutions === 1 &&
      obsPeak((r) => r.turns, "p37") < 21,
    "previous peak " + obsPeak((r) => r.turns, "p37"));
  check("game-prism-path",
    "p38 opens the first twelve-across bench",
    byId.p38.w === 12 && byId.p38.h === 12 && obsPeakSide("p38") < 12,
    "previous peak " + obsPeakSide("p38"));
  check("game-prism-path",
    "p39 floods seventy-one cells, the heaviest sweep the game has carried, from a single orientation",
    obsReports.p39.cells === 71 && obsReports.p39.solutions === 1 &&
      obsPeak((r) => r.cells, "p39") < 71,
    "previous peak " + obsPeak((r) => r.cells, "p39"));
  check("game-prism-path",
    "p40 is the capstone: twelve marks off thirteen elements, lit by one orientation out of two hundred and fifty-six",
    obsReports.p40.targets === 12 && obsPeak((r) => r.targets, "p40") < 12 &&
      obsReports.p40.solutions === 1 &&
      prismForge.orientations(prismForge.normalise(byId.p40)).length === 256,
    "previous fan peak " + obsPeak((r) => r.targets, "p40") + ", orientations " +
      prismForge.orientations(prismForge.normalise(byId.p40)).length);
  check("game-prism-path",
    "three observatory deals start in the dark and none lights more than two marks",
    observatory.every((board) => obsReports[board.id].lit <= 2) &&
      observatory.filter((board) => obsReports[board.id].lit === 0).length === 3,
    observatory.map((board) => board.id + ":" + obsReports[board.id].lit).join(","));
  check("game-prism-path",
    "no rung below the observatory fields its hardware - the sixth fork, the fifth weld, the thirteen-element bench, eleven-across paper and the eleven-mark fan all live above p30",
    boards.slice(0, 30).every((board) =>
      board.w <= 10 && board.h <= 10 &&
      board.mirrors.length <= 12 &&
      board.mirrors.filter((m) => m.split).length <= 5 &&
      board.mirrors.filter((m) => m.locked).length <= 4 &&
      board.targets.length <= 10),
    boards.slice(0, 30).filter((board) =>
      board.w > 10 || board.h > 10 || board.mirrors.length > 12 ||
      board.mirrors.filter((m) => m.split).length > 5 ||
      board.mirrors.filter((m) => m.locked).length > 4 ||
      board.targets.length > 10).map((board) => board.id).join(","));

  /* ---- the zenith takes one record per rung ----
   * The observatory's dials never fall across the zenith either, every deal
   * sits five flips out, no rung hands the player fewer free elements than
   * p24, and each rung's record is asserted as the number the forge
   * printed, against every board before it. */
  const zenith = zenithIds.map((id) => byId[id]);
  const zenithReports = {};
  const zenithProblems = [];
  let prevZenith = {
    targets: obsReports.p40.targets,
    elements: obsReports.p40.elements,
    splitters: obsReports.p40.splitters,
    locked: obsReports.p40.locked,
    w: byId.p40.w,
    h: byId.p40.h,
  };
  zenith.forEach((board) => {
    const report = prismForge.audit(board, true);
    zenithReports[board.id] = report;
    if (!(report.targets >= prevZenith.targets)) {
      zenithProblems.push(board.id + " lights fewer targets (" + report.targets +
        ") than the rung before it (" + prevZenith.targets + ")");
    }
    if (!(report.elements >= prevZenith.elements)) {
      zenithProblems.push(board.id + " fields fewer elements (" + report.elements +
        ") than the rung before it (" + prevZenith.elements + ")");
    }
    if (!(report.splitters >= prevZenith.splitters)) {
      zenithProblems.push(board.id + " rides fewer forks (" + report.splitters +
        ") than the rung before it (" + prevZenith.splitters + ")");
    }
    if (!(report.locked >= prevZenith.locked)) {
      zenithProblems.push(board.id + " carries fewer welds (" + report.locked +
        ") than the rung before it (" + prevZenith.locked + ")");
    }
    if (!(board.w >= prevZenith.w && board.h >= prevZenith.h)) {
      zenithProblems.push(board.id + " shrinks the paper below the rung before it");
    }
    if (report.solutions > 2) {
      zenithProblems.push(board.id + " is lit by " + report.solutions +
        " orientations (the zenith keeps at most two)");
    }
    if (!(report.flips >= 4)) {
      zenithProblems.push(board.id + " deal sits " + report.flips + " flips out (want 4-5)");
    }
    if (freeOf(board) < freeOf(p24)) {
      zenithProblems.push(board.id + " hands the player fewer free elements than p24");
    }
    prevZenith = {
      targets: report.targets,
      elements: report.elements,
      splitters: report.splitters,
      locked: report.locked,
      w: board.w,
      h: board.h,
    };
  });
  check("game-prism-path",
    "the zenith takes one record per rung and never lowers a dial (" +
      zenith.map((board) => board.id + ":" + zenithReports[board.id].targets + "t/" +
        zenithReports[board.id].elements + "e/" + zenithReports[board.id].splitters + "s/" +
        zenithReports[board.id].locked + "w/" + zenithReports[board.id].cells + "c").join(", ") +
      " vs p40:" + obsReports.p40.targets + "t/" + obsReports.p40.elements + "e/" +
      obsReports.p40.splitters + "s/" + obsReports.p40.locked + "w/" + obsReports.p40.cells + "c)",
    zenithProblems.length === 0, zenithProblems.join(" | "));
  const zenithPeak = (pick, id) => Math.max.apply(null,
    boards.slice(0, boards.findIndex((board) => board.id === id))
      .map((board) => pick(reports[board.id])));
  const zenithPeakSide = (id) => Math.max.apply(null,
    boards.slice(0, boards.findIndex((board) => board.id === id))
      .map((board) => board.w));
  check("game-prism-path",
    "p41 opens the first thirteen-across bench",
    byId.p41.w === 13 && byId.p41.h === 13 && zenithPeakSide("p41") < 13,
    "previous peak " + zenithPeakSide("p41"));
  check("game-prism-path",
    "p42 rides the first seven-fork bench",
    zenithReports.p42.splitters === 7 && zenithPeak((r) => r.splitters, "p42") < 7,
    "previous peak " + zenithPeak((r) => r.splitters, "p42"));
  check("game-prism-path",
    "p43 fields the first fourteen-element bench, lit from a single orientation",
    zenithReports.p43.elements === 14 && zenithReports.p43.solutions === 1 &&
      zenithPeak((r) => r.elements, "p43") < 14,
    "previous peak " + zenithPeak((r) => r.elements, "p43"));
  check("game-prism-path",
    "p44 bolts down the first six-weld board, lit from a single orientation",
    zenithReports.p44.locked === 6 && zenithReports.p44.solutions === 1 &&
      zenithPeak((r) => r.locked, "p44") < 6,
    "previous peak " + zenithPeak((r) => r.locked, "p44"));
  check("game-prism-path",
    "p45 floods eighty-seven cells, the heaviest sweep the game has carried, from a single orientation",
    zenithReports.p45.cells === 87 && zenithReports.p45.solutions === 1 &&
      zenithPeak((r) => r.cells, "p45") < 87,
    "previous peak " + zenithPeak((r) => r.cells, "p45"));
  check("game-prism-path",
    "p46 is the closer: thirteen marks - a mark more than any board before it - lit by exactly one orientation",
    zenithReports.p46.targets === 13 && zenithPeak((r) => r.targets, "p46") < 13 &&
      zenithReports.p46.solutions === 1,
    "previous fan peak " + zenithPeak((r) => r.targets, "p46"));
  check("game-prism-path",
    "two zenith deals start in the dark and none lights more than two marks",
    zenith.every((board) => zenithReports[board.id].lit <= 2) &&
      zenith.filter((board) => zenithReports[board.id].lit === 0).length === 2,
    zenith.map((board) => board.id + ":" + zenithReports[board.id].lit).join(","));
  check("game-prism-path",
    "no rung below the zenith fields its hardware - the seventh fork, the sixth weld, the fourteen-element bench, thirteen-across paper and the thirteen-mark fan all live above p40",
    boards.slice(0, 40).every((board) =>
      board.w <= 12 && board.h <= 12 &&
      board.mirrors.length <= 13 &&
      board.mirrors.filter((m) => m.split).length <= 6 &&
      board.mirrors.filter((m) => m.locked).length <= 5 &&
      board.targets.length <= 12),
    boards.slice(0, 40).filter((board) =>
      board.w > 12 || board.h > 12 || board.mirrors.length > 13 ||
      board.mirrors.filter((m) => m.split).length > 6 ||
      board.mirrors.filter((m) => m.locked).length > 5 ||
      board.targets.length > 12).map((board) => board.id).join(","));

  /* ---- the apex takes one record per rung ----
   * The zenith's dials never fall across the apex either, every deal sits
   * five flips out, no rung hands the player fewer free elements than p24,
   * and each rung's record is asserted as the number the forge printed,
   * against every board before it. */
  const apex = apexIds.map((id) => byId[id]);
  const apexReports = {};
  const apexProblems = [];
  let prevApex = {
    targets: zenithReports.p46.targets,
    elements: zenithReports.p46.elements,
    splitters: zenithReports.p46.splitters,
    locked: zenithReports.p46.locked,
    w: byId.p46.w,
    h: byId.p46.h,
  };
  apex.forEach((board) => {
    const report = prismForge.audit(board, true);
    apexReports[board.id] = report;
    if (!(report.targets >= prevApex.targets)) {
      apexProblems.push(board.id + " lights fewer targets (" + report.targets +
        ") than the rung before it (" + prevApex.targets + ")");
    }
    if (!(report.elements >= prevApex.elements)) {
      apexProblems.push(board.id + " fields fewer elements (" + report.elements +
        ") than the rung before it (" + prevApex.elements + ")");
    }
    if (!(report.splitters >= prevApex.splitters)) {
      apexProblems.push(board.id + " rides fewer forks (" + report.splitters +
        ") than the rung before it (" + prevApex.splitters + ")");
    }
    if (!(report.locked >= prevApex.locked)) {
      apexProblems.push(board.id + " carries fewer welds (" + report.locked +
        ") than the rung before it (" + prevApex.locked + ")");
    }
    if (!(board.w >= prevApex.w && board.h >= prevApex.h)) {
      apexProblems.push(board.id + " shrinks the paper below the rung before it");
    }
    if (report.solutions > 2) {
      apexProblems.push(board.id + " is lit by " + report.solutions +
        " orientations (the apex keeps at most two)");
    }
    if (!(report.flips >= 4)) {
      apexProblems.push(board.id + " deal sits " + report.flips + " flips out (want 4-5)");
    }
    if (freeOf(board) < freeOf(p24)) {
      apexProblems.push(board.id + " hands the player fewer free elements than p24");
    }
    prevApex = {
      targets: report.targets,
      elements: report.elements,
      splitters: report.splitters,
      locked: report.locked,
      w: board.w,
      h: board.h,
    };
  });
  check("game-prism-path",
    "the apex takes one record per rung and never lowers a dial (" +
      apex.map((board) => board.id + ":" + apexReports[board.id].targets + "t/" +
        apexReports[board.id].elements + "e/" + apexReports[board.id].splitters + "s/" +
        apexReports[board.id].locked + "w/" + apexReports[board.id].cells + "c").join(", ") +
      " vs p46:" + zenithReports.p46.targets + "t/" + zenithReports.p46.elements + "e/" +
      zenithReports.p46.splitters + "s/" + zenithReports.p46.locked + "w/" +
      zenithReports.p46.cells + "c)",
    apexProblems.length === 0, apexProblems.join(" | "));
  const apexPeak = (pick, id) => Math.max.apply(null,
    boards.slice(0, boards.findIndex((board) => board.id === id))
      .map((board) => pick(reports[board.id])));
  const apexPeakSide = (id) => Math.max.apply(null,
    boards.slice(0, boards.findIndex((board) => board.id === id))
      .map((board) => board.w));
  check("game-prism-path",
    "p47 opens the first fourteen-across bench",
    byId.p47.w === 14 && byId.p47.h === 14 && apexPeakSide("p47") < 14,
    "previous peak " + apexPeakSide("p47"));
  check("game-prism-path",
    "p48 rides the first eight-fork bench",
    apexReports.p48.splitters === 8 && apexPeak((r) => r.splitters, "p48") < 8,
    "previous peak " + apexPeak((r) => r.splitters, "p48"));
  check("game-prism-path",
    "p49 fields the first fifteen-element bench",
    apexReports.p49.elements === 15 && apexPeak((r) => r.elements, "p49") < 15,
    "previous peak " + apexPeak((r) => r.elements, "p49"));
  check("game-prism-path",
    "p50 is the closer: fourteen marks - a mark more than any board before it - off fifteen elements, lit by one orientation out of five hundred and twelve",
    apexReports.p50.targets === 14 && apexPeak((r) => r.targets, "p50") < 14 &&
      apexReports.p50.solutions === 1 &&
      prismForge.orientations(prismForge.normalise(byId.p50)).length === 512,
    "previous fan peak " + apexPeak((r) => r.targets, "p50") + ", orientations " +
      prismForge.orientations(prismForge.normalise(byId.p50)).length);
  check("game-prism-path",
    "one apex deal starts in the dark and none lights more than two marks",
    apex.every((board) => apexReports[board.id].lit <= 2) &&
      apex.filter((board) => apexReports[board.id].lit === 0).length === 1,
    apex.map((board) => board.id + ":" + apexReports[board.id].lit).join(","));
  check("game-prism-path",
    "no rung below the apex fields its hardware - the eighth fork, the fifteen-element bench, fourteen-across paper and the fourteen-mark fan all live above p46",
    boards.slice(0, 46).every((board) =>
      board.w <= 13 && board.h <= 13 &&
      board.mirrors.length <= 14 &&
      board.mirrors.filter((m) => m.split).length <= 7 &&
      board.mirrors.filter((m) => m.locked).length <= 6 &&
      board.targets.length <= 13),
    boards.slice(0, 46).filter((board) =>
      board.w > 13 || board.h > 13 || board.mirrors.length > 14 ||
      board.mirrors.filter((m) => m.split).length > 7 ||
      board.mirrors.filter((m) => m.locked).length > 6 ||
      board.targets.length > 13).map((board) => board.id).join(","));

  /* ---- the pinnacle takes one record per rung ----
   * The apex's dials never fall across the pinnacle either, every deal
   * sits five flips out, no rung hands the player fewer free elements
   * than p24, and each rung's record is asserted as the number the forge
   * printed, against every board before it. The five rungs whose records
   * are measured off the solution beam - p56's sweep, p58's bends and the
   * p60 capstone among them - solve from exactly one orientation, so the
   * measured beam is the beam. */
  const pinnacle = pinnacleIds.map((id) => byId[id]);
  const pinnacleReports = {};
  const pinnacleProblems = [];
  let prevPinnacle = {
    targets: apexReports.p50.targets,
    elements: apexReports.p50.elements,
    splitters: apexReports.p50.splitters,
    locked: apexReports.p50.locked,
    w: byId.p50.w,
    h: byId.p50.h,
  };
  pinnacle.forEach((board) => {
    const report = prismForge.audit(board, true);
    pinnacleReports[board.id] = report;
    if (!(report.targets >= prevPinnacle.targets)) {
      pinnacleProblems.push(board.id + " lights fewer targets (" + report.targets +
        ") than the rung before it (" + prevPinnacle.targets + ")");
    }
    if (!(report.elements >= prevPinnacle.elements)) {
      pinnacleProblems.push(board.id + " fields fewer elements (" + report.elements +
        ") than the rung before it (" + prevPinnacle.elements + ")");
    }
    if (!(report.splitters >= prevPinnacle.splitters)) {
      pinnacleProblems.push(board.id + " rides fewer forks (" + report.splitters +
        ") than the rung before it (" + prevPinnacle.splitters + ")");
    }
    if (!(report.locked >= prevPinnacle.locked)) {
      pinnacleProblems.push(board.id + " carries fewer welds (" + report.locked +
        ") than the rung before it (" + prevPinnacle.locked + ")");
    }
    if (!(board.w >= prevPinnacle.w && board.h >= prevPinnacle.h)) {
      pinnacleProblems.push(board.id + " shrinks the paper below the rung before it");
    }
    if (report.solutions > 2) {
      pinnacleProblems.push(board.id + " is lit by " + report.solutions +
        " orientations (the pinnacle keeps at most two)");
    }
    if (!(report.flips >= 4)) {
      pinnacleProblems.push(board.id + " deal sits " + report.flips + " flips out (want 4-5)");
    }
    if (freeOf(board) < freeOf(p24)) {
      pinnacleProblems.push(board.id + " hands the player fewer free elements than p24");
    }
    prevPinnacle = {
      targets: report.targets,
      elements: report.elements,
      splitters: report.splitters,
      locked: report.locked,
      w: board.w,
      h: board.h,
    };
  });
  check("game-prism-path",
    "the pinnacle takes one record per rung and never lowers a dial (" +
      pinnacle.map((board) => board.id + ":" + pinnacleReports[board.id].targets + "t/" +
        pinnacleReports[board.id].elements + "e/" + pinnacleReports[board.id].splitters + "s/" +
        pinnacleReports[board.id].locked + "w/" + pinnacleReports[board.id].cells + "c").join(", ") +
      " vs p50:" + apexReports.p50.targets + "t/" + apexReports.p50.elements + "e/" +
      apexReports.p50.splitters + "s/" + apexReports.p50.locked + "w/" +
      apexReports.p50.cells + "c)",
    pinnacleProblems.length === 0, pinnacleProblems.join(" | "));
  const pinnaclePeak = (pick, id) => Math.max.apply(null,
    boards.slice(0, boards.findIndex((board) => board.id === id))
      .map((board) => pick(reports[board.id])));
  const pinnaclePeakSide = (id) => Math.max.apply(null,
    boards.slice(0, boards.findIndex((board) => board.id === id))
      .map((board) => board.w));
  check("game-prism-path",
    "p51 opens the first fifteen-across bench",
    byId.p51.w === 15 && byId.p51.h === 15 && pinnaclePeakSide("p51") < 15,
    "previous peak " + pinnaclePeakSide("p51"));
  check("game-prism-path",
    "p52 rides the first nine-fork bench",
    pinnacleReports.p52.splitters === 9 && pinnaclePeak((r) => r.splitters, "p52") < 9,
    "previous peak " + pinnaclePeak((r) => r.splitters, "p52"));
  check("game-prism-path",
    "p53 fields the first sixteen-element bench",
    pinnacleReports.p53.elements === 16 && pinnaclePeak((r) => r.elements, "p53") < 16,
    "previous peak " + pinnaclePeak((r) => r.elements, "p53"));
  check("game-prism-path",
    "p54 bolts down the first seven-weld board",
    pinnacleReports.p54.locked === 7 && pinnaclePeak((r) => r.locked, "p54") < 7,
    "previous peak " + pinnaclePeak((r) => r.locked, "p54"));
  check("game-prism-path",
    "p55 lights the first fifteen-mark fan",
    pinnacleReports.p55.targets === 15 && pinnaclePeak((r) => r.targets, "p55") < 15,
    "previous peak " + pinnaclePeak((r) => r.targets, "p55"));
  check("game-prism-path",
    "p56 floods a hundred and twelve cells, the heaviest sweep the game has carried, from a single orientation",
    pinnacleReports.p56.cells === 112 && pinnacleReports.p56.solutions === 1 &&
      pinnaclePeak((r) => r.cells, "p56") < 112,
    "previous peak " + pinnaclePeak((r) => r.cells, "p56"));
  check("game-prism-path",
    "p57 opens the first sixteen-across bench",
    byId.p57.w === 16 && byId.p57.h === 16 && pinnaclePeakSide("p57") < 16,
    "previous peak " + pinnaclePeakSide("p57"));
  check("game-prism-path",
    "p58 runs the bendiest route the game has carried: twenty-nine bends against p53's twenty-seven, from a single orientation",
    pinnacleReports.p58.turns === 29 && pinnacleReports.p58.solutions === 1 &&
      pinnaclePeak((r) => r.turns, "p58") < 29,
    "previous peak " + pinnaclePeak((r) => r.turns, "p58"));
  check("game-prism-path",
    "p59 fields the first seventeen-element bench",
    pinnacleReports.p59.elements === 17 && pinnaclePeak((r) => r.elements, "p59") < 17,
    "previous peak " + pinnaclePeak((r) => r.elements, "p59"));
  check("game-prism-path",
    "p60 is the closer: sixteen marks - a mark more than any board before it - off seventeen elements, lit by one orientation out of a thousand and twenty-four",
    pinnacleReports.p60.targets === 16 && pinnaclePeak((r) => r.targets, "p60") < 16 &&
      pinnacleReports.p60.solutions === 1 &&
      prismForge.orientations(prismForge.normalise(byId.p60)).length === 1024,
    "previous fan peak " + pinnaclePeak((r) => r.targets, "p60") + ", orientations " +
      prismForge.orientations(prismForge.normalise(byId.p60)).length);
  check("game-prism-path",
    "no pinnacle deal starts in the dark and none lights more than two marks",
    pinnacle.every((board) => pinnacleReports[board.id].lit >= 1 &&
      pinnacleReports[board.id].lit <= 2),
    pinnacle.map((board) => board.id + ":" + pinnacleReports[board.id].lit).join(","));
  check("game-prism-path",
    "no rung below the pinnacle fields its hardware - the ninth fork, the seven-weld board, the sixteen- and seventeen-element benches, fifteen- and sixteen-across paper and the fifteen-mark fan all live above p50",
    boards.slice(0, 50).every((board) =>
      board.w <= 14 && board.h <= 14 &&
      board.mirrors.length <= 15 &&
      board.mirrors.filter((m) => m.split).length <= 8 &&
      board.mirrors.filter((m) => m.locked).length <= 6 &&
      board.targets.length <= 14),
    boards.slice(0, 50).filter((board) =>
      board.w > 14 || board.h > 14 || board.mirrors.length > 15 ||
      board.mirrors.filter((m) => m.split).length > 8 ||
      board.mirrors.filter((m) => m.locked).length > 6 ||
      board.targets.length > 14).map((board) => board.id).join(","));

  /* ---- the star bands rise into and up the summit, then the observatory ---- */
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
  check("game-prism-path",
    "the observatory star bands only widen inside a board and climb above p30's, rung over rung",
    observatory.every((board, index) =>
      board.starTimes.length === 3 &&
      board.starTimes[0] < board.starTimes[1] && board.starTimes[1] < board.starTimes[2] &&
      board.starTimes.every((line, lineIndex) => line > p30.starTimes[lineIndex]) &&
      (index === 0 || [0, 1, 2].every((lineIndex) =>
        board.starTimes[lineIndex] > observatory[index - 1].starTimes[lineIndex]))),
    p30.id + " " + p30.starTimes.join("/") + " vs " +
      observatory.map((board) => board.id + " " + board.starTimes.join("/")).join(" | "));
  check("game-prism-path",
    "the zenith star bands only widen inside a board and climb above p40's, rung over rung",
    zenith.every((board, index) =>
      board.starTimes.length === 3 &&
      board.starTimes[0] < board.starTimes[1] && board.starTimes[1] < board.starTimes[2] &&
      board.starTimes.every((line, lineIndex) => line > byId.p40.starTimes[lineIndex]) &&
      (index === 0 || [0, 1, 2].every((lineIndex) =>
        board.starTimes[lineIndex] > zenith[index - 1].starTimes[lineIndex]))),
    byId.p40.id + " " + byId.p40.starTimes.join("/") + " vs " +
      zenith.map((board) => board.id + " " + board.starTimes.join("/")).join(" | "));
  check("game-prism-path",
    "the apex star bands only widen inside a board and climb above p46's, rung over rung",
    apex.every((board, index) =>
      board.starTimes.length === 3 &&
      board.starTimes[0] < board.starTimes[1] && board.starTimes[1] < board.starTimes[2] &&
      board.starTimes.every((line, lineIndex) => line > byId.p46.starTimes[lineIndex]) &&
      (index === 0 || [0, 1, 2].every((lineIndex) =>
        board.starTimes[lineIndex] > apex[index - 1].starTimes[lineIndex]))),
    byId.p46.id + " " + byId.p46.starTimes.join("/") + " vs " +
      apex.map((board) => board.id + " " + board.starTimes.join("/")).join(" | "));
  check("game-prism-path",
    "the pinnacle star bands only widen inside a board and climb above p50's, rung over rung",
    pinnacle.every((board, index) =>
      board.starTimes.length === 3 &&
      board.starTimes[0] < board.starTimes[1] && board.starTimes[1] < board.starTimes[2] &&
      board.starTimes.every((line, lineIndex) => line > byId.p50.starTimes[lineIndex]) &&
      (index === 0 || [0, 1, 2].every((lineIndex) =>
        board.starTimes[lineIndex] > pinnacle[index - 1].starTimes[lineIndex]))),
    byId.p50.id + " " + byId.p50.starTimes.join("/") + " vs " +
      pinnacle.map((board) => board.id + " " + board.starTimes.join("/")).join(" | "));

  /* ---- the forks are load-bearing: splitter-stripped twins ---- */
  seeded(() => {
    summit.concat(observatory).concat(zenith).concat(apex).concat(pinnacle)
      .forEach((board) => {
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
    const observatoryNames = [];
    observatoryIds.forEach((id, index) => {
      const key = "prismL" + (31 + index);
      const en = App.t(key);
      const zh = App.I18N.zh[key];
      if (!(en && en !== key) || !(zh && zh !== key) || en === zh) {
        observatoryNames.push(key);
      }
    });
    check("game-prism-path", "the observatory names resolve to a name in both languages",
      observatoryNames.length === 0, observatoryNames.join(","));
    const zenithNames = [];
    zenithIds.forEach((id, index) => {
      const key = "lvlNum" + (41 + index);
      const en = App.t(key);
      const zh = App.I18N.zh[key];
      if (!(en && en !== key) || !(zh && zh !== key) || en === zh) {
        zenithNames.push(key);
      }
    });
    check("game-prism-path", "the zenith names resolve to a name in both languages",
      zenithNames.length === 0, zenithNames.join(","));
    const apexNames = [];
    apexIds.forEach((id, index) => {
      const key = "lvlNum" + (47 + index);
      const en = App.t(key);
      const zh = App.I18N.zh[key];
      if (!(en && en !== key) || !(zh && zh !== key) || en === zh) {
        apexNames.push(key);
      }
    });
    check("game-prism-path", "the apex names resolve to a name in both languages",
      apexNames.length === 0, apexNames.join(","));
    const pinnacleNames = [];
    pinnacleIds.forEach((id, index) => {
      const key = "prismL" + (51 + index);
      const en = App.t(key);
      const zh = App.I18N.zh[key];
      if (!(en && en !== key) || !(zh && zh !== key) || en === zh) {
        pinnacleNames.push(key);
      }
    });
    check("game-prism-path", "the pinnacle names resolve to a name in both languages",
      pinnacleNames.length === 0, pinnacleNames.join(","));
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
  check("game-prism-path", "the unlock chain walks all sixty rungs in order",
    walked === 60 && chained && chain.clearedCount() === 60,
    walked + " first clears");
};
