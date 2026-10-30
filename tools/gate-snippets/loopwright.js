"use strict";

/* game-loopwright: every floor is walked, and the summit is held down
 *
 * The module proves each floor at load time - lpwSolved replays the authored
 * run list with accumulating ghosts and only a floor whose last run wins
 * ships - and tools/loopwright-forge.js carries the same engine for deeper
 * probes. This gate re-walks the whole thirty-floor ladder through that
 * engine, then holds the summit tier f25-f30 to its design brief: the dial
 * is the plate count the win law itself holds (a floor only clears when
 * EVERY plate is still pressed on the winning frame), the rooms climb from
 * three plates to the full eight, the crew grows with the room (par 3, 3,
 * 4, 4, 5, 5 runs), no shorter final run wins given the authored ghosts,
 * and the tier's choreography is load-bearing three ways - strip the crates
 * and no final run wins at par length because the presses the crates
 * delivered outnumber the bodies left; strip the ghosts and the closer dies
 * on its own shut door; strip the waits and the no-delay walk dies on the
 * door too, because a ghost only holds its plate once its run has settled. */
module.exports = function gate(ctx) {
  const { App, env, check, path, root } = ctx;
  const lpw = require(path.join(root, "tools", "loopwright-forge.js"));
  const floors = App.lpwFloors;
  const summitIds = ["f25", "f26", "f27", "f28", "f29", "f30"];

  /* The floor build (lpwParse + piston phases) is seeded inside the module,
   * but the boot itself may reach for Math.random elsewhere; pin it the way
   * every gate here does so the run is byte-for-byte repeatable. */
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
  check("game-loopwright", "the ladder holds thirty floors",
    floors.length === 30, String(floors.length));
  check("game-loopwright", "every floor id is distinct and in ladder order",
    new Set(floors.map((floor) => floor.id)).size === floors.length &&
      floors.every((floor, index) => floor.id === "f" + (index + 1)),
    floors.map((floor) => floor.id).join(","));
  check("game-loopwright", "every floor carries its own load-time proof",
    floors.every((floor) => floor.valid === true && App.loopSolved(floor) === true),
    floors.filter((floor) => !(floor.valid && App.loopSolved(floor)))
      .map((floor) => floor.id).join(","));

  const summitMissing = summitIds.filter((id) => !floors.some((floor) => floor.id === id));
  check("game-loopwright", "the summit tier f25-f30 is present in order",
    summitMissing.length === 0 &&
      summitIds.every((id, index) =>
        floors.findIndex((floor) => floor.id === id) >
          (index === 0 ? -1 : floors.findIndex((floor) => floor.id === summitIds[index - 1]))),
    summitMissing.join(",") || "ordered");

  const byId = {};
  floors.forEach((floor) => { byId[floor.id] = floor; });
  const f24 = byId.f24;
  const summit = summitIds.map((id) => byId[id]);

  /* ---- the dial: plates held on the winning frame ---- */
  const dialProblems = [];
  let prevPlates = f24.grid.plates.length;
  let prevRuns = f24.parRuns;
  summit.forEach((floor) => {
    const plates = floor.grid.plates.length;
    if (!(plates === prevPlates + 1)) {
      dialProblems.push(floor.id + " holds " + plates +
        " plates, not one more than the rung before it (" + prevPlates + ")");
    }
    if (!(floor.parRuns >= prevRuns)) {
      dialProblems.push(floor.id + " asks for fewer runs (" + floor.parRuns +
        ") than the rung before it (" + prevRuns + ")");
    }
    if (!(floor.parOps <= 8)) {
      dialProblems.push(floor.id + " needs " + floor.parOps + " slots, over the eight the panel allows");
    }
    prevPlates = plates;
    prevRuns = floor.parRuns;
  });
  if (!(byId.f30.grid.plates.length === 8)) {
    dialProblems.push("f30 is not the full house: it holds " + byId.f30.grid.plates.length + " plates");
  }
  if (byId.f30.parOps !== 8) {
    dialProblems.push("f30's closer does not bind the eight-slot cap (" + byId.f30.parOps + " ops)");
  }
  check("game-loopwright",
    "the summit holds one more plate every rung, three up to the full eight, with the crew growing and f30 binding the eight-slot cap (" +
      summit.map((floor) => floor.id + ":" + floor.grid.plates.length + "plates/" + floor.parRuns + "runs").join(", ") +
      " vs f24:" + f24.grid.plates.length + "plates/" + f24.parRuns + "runs)",
    dialProblems.length === 0, dialProblems.join(" | "));

  /* ---- the shipped calibration holds on the summit ---- */
  check("game-loopwright", "the summit keeps the shipped star calibration and the par line earns three stars but is not free",
    summit.every((floor) =>
      floor.parRuns === floor.programs.length &&
      floor.parOps === Math.max.apply(null, floor.programs.map((run) => run.length)) &&
      floor.starRuns[0] === floor.parRuns &&
      floor.starRuns[1] === floor.parRuns + 1 &&
      floor.starRuns[2] === floor.parRuns + 3 &&
      App.starsFor(floor.parRuns, floor.starRuns, "low") === 3 &&
      App.starsFor(floor.parRuns + 1, floor.starRuns, "low") === 2),
    summit.map((floor) => floor.id + ":" + floor.starRuns.join("/")).join(" "));

  /* ---- the crew is the floor: re-walk every summit rung ---- */
  seeded(() => {
    summit.forEach((floor) => {
      const replay = lpw.replayRuns(floor);
      const last = replay.runs[replay.runs.length - 1];
      check("game-loopwright",
        `${floor.id}: every authored run ends clean, leaves its ghost, and the last wins with every plate held`,
        replay.solved &&
          replay.ghosts.length === floor.programs.length - 1 &&
          replay.runs.every((run, index) =>
            index === replay.runs.length - 1 ? run.win : run.reason === "done") &&
          last.end.x === replay.base.goal.x && last.end.y === replay.base.goal.y &&
          last.allPlates,
        JSON.stringify(replay.runs));
      const alone = App.loopSim(lpw.gridWith(replay.base, []), floor.programs[floor.programs.length - 1], 64);
      check("game-loopwright",
        `${floor.id}: the final run alone cannot win - the crew is the floor`,
        !alone.win, "reason " + alone.reason);
    });
  });

  /* ---- the searches: no shorter run, no crateless shortcut ---- */
  seeded(() => {
    summit.forEach((floor) => {
      const ghosts = lpw.prefixGhosts(floor);
      const shorter = lpw.searchMinimum(floor, {
        ghosts: ghosts,
        alphabet: ["F", "B", "L", "R", "W", "P"],
        maxLen: floor.parOps - 1,
      });
      check("game-loopwright",
        `${floor.id}: no program under ${floor.parOps} ops wins - the shipped closer is the measured minimum`,
        shorter === null, JSON.stringify(shorter));
      /* the crateless twin: every crate erased from the board and from the
       * ghosts' frozen frames, so the presses the crates delivered are gone
       * and a body can hold only one plate */
      const base = App.loopParse(floor);
      const twinBase = Object.assign({}, base, { crates: [] });
      const twinGhosts = ghosts.map((frames) =>
        frames.map((frame) => Object.assign({}, frame, { crates: [] })));
      const twin = lpw.searchMinProgram(twinBase, twinGhosts,
        ["F", "B", "L", "R", "W"], floor.parOps);
      check("game-loopwright",
        `${floor.id}: strip the crates and no final run wins at par length - the presses outnumber the bodies`,
        twin === null, JSON.stringify(twin));
      const straight = floor.programs[floor.programs.length - 1].filter((op) => op !== "W");
      const straightSim = App.loopSim(lpw.gridWith(base, ghosts), straight, 64);
      check("game-loopwright",
        `${floor.id}: the no-wait walk dies on the shut door - the waits are the clock`,
        straightSim.reason === "wall" && !straightSim.win, "reason " + straightSim.reason);
    });
  });

  /* ---- the names travel with the module ---- */
  seeded(() => {
    const savedEn = App.I18N.en;
    const savedZh = App.I18N.zh;
    App.I18N.en = savedZh;
    App.I18N.zh = savedEn;
    const swapped = summit.every((floor) => {
      const text = App.t(floor.labelKey);
      return text && text !== floor.labelKey;
    });
    App.I18N.en = savedEn;
    App.I18N.zh = savedZh;
    check("game-loopwright", "the summit names resolve through App.t in the boot language",
      summit.every((floor) => {
        const text = App.t(floor.labelKey);
        return text && text !== floor.labelKey;
      }), "a tier label fell back to its key");
    check("game-loopwright", "the summit names resolve through App.t in the other language",
      swapped, "a tier label fell back to its key");
  });

  /* ---- the unlock chain is derived, never stored ---- */
  const chain = App.createCampaign({
    key: "loopwright-gate-chain",
    levels: floors.map((floor) => ({ id: floor.id, labelKey: floor.labelKey })),
  });
  let walked = 0;
  let chained = true;
  floors.forEach((floor, index) => {
    const outcome = chain.record(floor.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < floors.length ? floors[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-loopwright", "the unlock chain walks all thirty rungs in order",
    walked === 30 && chained && chain.clearedCount() === 30,
    walked + " first clears");
};
