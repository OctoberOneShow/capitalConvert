"use strict";

/* game-loopwright: every floor is walked, and the overhaul is held down
 *
 * The module proves each floor at load time - lpwSolved replays the authored
 * run list with accumulating ghosts and only a floor whose last run wins
 * ships - and tools/loopwright-forge.js carries the same engine for deeper
 * probes. This gate re-walks the whole forty-floor ladder through that
 * engine, then holds the two back tiers to their design briefs. The summit
 * f25-f30's dial is the plate count the win law itself holds (a floor only
 * clears when EVERY plate is still pressed on the winning frame), the rooms
 * climb from three plates to the full eight, the crew grows with the room
 * (par 3, 3, 4, 4, 5, 5 runs), no shorter final run wins given the authored
 * ghosts, and the tier's choreography is load-bearing three ways - strip
 * the crates and no final run wins at par length because the presses the
 * crates delivered outnumber the bodies left; strip the ghosts and the
 * closer dies on its own shut door; strip the waits and the no-delay walk
 * dies on the door too, because a ghost only holds its plate once its run
 * has settled.
 *
 * The overhaul f31-f40 climbs past it: the crew goes six runs, then seven,
 * then the full eight, the press line runs 8, 8, 8, 8, 9, 10, 10, 10, 11,
 * 12 and never falls, and each rung takes one measured record against every
 * floor before it - the first six-run crew, the first three-ram floor, the
 * first four-door stack, the first three-pad shift, the first nine- and
 * ten-, eleven- and twelve-plate yards, the first five-crate fleet, the
 * longest shift and deepest wait line the panel has dealt, and the first
 * relays of seven and eight runs whose closers deliver a press of their
 * own. The crews are arithmetic: a
 * ghost presses at most two plates (its body plus one crate) and the
 * closer's body is owed to G, so each yard measurably strands the crew
 * below the one it ships with. Everything below is measured through the
 * module's own engine: replayRuns keeps the per-run receipts, searchMinimum
 * sweeps the panel's chips up to par-1 ops, and the win frames are taken
 * apart press by press. Star bands, both languages and the unlock chain are
 * checked last. */
module.exports = function gate(ctx) {
  const { App, env, check, path, root } = ctx;
  const lpw = require(path.join(root, "tools", "loopwright-forge.js"));
  const floors = App.lpwFloors;
  const summitIds = ["f25", "f26", "f27", "f28", "f29", "f30"];
  const overhaulIds = ["f31", "f32", "f33", "f34", "f35", "f36", "f37", "f38", "f39", "f40"];

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
  check("game-loopwright", "the ladder holds forty floors",
    floors.length === 40, String(floors.length));
  check("game-loopwright", "every floor id is distinct and in ladder order",
    new Set(floors.map((floor) => floor.id)).size === floors.length &&
      floors.every((floor, index) => floor.id === "f" + (index + 1)),
    floors.map((floor) => floor.id).join(","));
  check("game-loopwright", "every floor carries its own load-time proof",
    floors.every((floor) => floor.valid === true && App.loopSolved(floor) === true),
    floors.filter((floor) => !(floor.valid && App.loopSolved(floor)))
      .map((floor) => floor.id).join(","));

  const tierInOrder = (ids) => {
    const missing = ids.filter((id) => !floors.some((floor) => floor.id === id));
    return missing.length === 0 &&
      ids.every((id, index) =>
        floors.findIndex((floor) => floor.id === id) >
          (index === 0 ? -1 : floors.findIndex((floor) => floor.id === ids[index - 1])));
  };
  check("game-loopwright", "the summit tier f25-f30 is present in order",
    tierInOrder(summitIds), summitIds.filter((id) => !floors.some((f) => f.id === id)).join(",") || "ordered");
  check("game-loopwright", "the overhaul tier f31-f40 is present in order",
    tierInOrder(overhaulIds), overhaulIds.filter((id) => !floors.some((f) => f.id === id)).join(",") || "ordered");

  const byId = {};
  floors.forEach((floor) => { byId[floor.id] = floor; });
  const f24 = byId.f24;
  const summit = summitIds.map((id) => byId[id]);
  const overhaul = overhaulIds.map((id) => byId[id]);
  const posOf = (id) => floors.findIndex((floor) => floor.id === id);
  const before = (id) => floors.slice(0, posOf(id));

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

  /* ---- the overhaul f31-f40: the crew and the press count ---- */
  /* Lines that must never fall inside the tier, measured off the parsed
   * floors: the crew 6, 6, 6, 6, 6, 7, 7, 7, 7, 7; the eight-slot cap
   * bound everywhere; the press line 8, 8, 8, 8, 9, 10, 10, 10, 11, 12. */
  const overRuns = overhaul.map((floor) => floor.parRuns);
  const overPlates = overhaul.map((floor) => floor.grid.plates.length);
  check("game-loopwright", "the overhaul is present with all ten rungs",
    overhaul.length === 10, overhaul.map((floor) => floor.id).join(","));
  check("game-loopwright",
    "the overhaul's crew line runs 6, 6, 6, 6, 6, 7, 7, 7, 7, 8 and never falls",
    JSON.stringify(overRuns) === JSON.stringify([6, 6, 6, 6, 6, 7, 7, 7, 7, 8]) &&
      overRuns.every((n, i) => i === 0 || n >= overRuns[i - 1]),
    overRuns.join("/"));
  check("game-loopwright",
    "the overhaul's press line runs 8, 8, 8, 8, 9, 10, 10, 10, 11, 12 and never falls",
    JSON.stringify(overPlates) === JSON.stringify([8, 8, 8, 8, 9, 10, 10, 10, 11, 12]) &&
      overPlates.every((n, i) => i === 0 || n >= overPlates[i - 1]),
    overPlates.join("/"));
  check("game-loopwright",
    "every overhaul closer binds the eight-slot cap and keeps the shipped star calibration",
    overhaul.every((floor) =>
      floor.parOps === 8 &&
      floor.parRuns === floor.programs.length &&
      floor.parOps === Math.max.apply(null, floor.programs.map((run) => run.length)) &&
      floor.starRuns[0] === floor.parRuns &&
      floor.starRuns[1] === floor.parRuns + 1 &&
      floor.starRuns[2] === floor.parRuns + 3 &&
      App.starsFor(floor.parRuns, floor.starRuns, "low") === 3 &&
      App.starsFor(floor.parRuns + 1, floor.starRuns, "low") === 2),
    overhaul.map((floor) => floor.id + ":" + floor.parRuns + "runs/" + floor.parOps + "ops").join(" "));

  /* Every authored run is replayed with its receipts, the crew is the
   * floor, and no shorter final run wins - the whole tier, seeded. */
  seeded(() => {
    overhaul.forEach((floor) => {
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
      const shorter = lpw.searchMinimum(floor, {
        ghosts: replay.ghosts,
        alphabet: ["F", "B", "L", "R", "W", "P"],
        maxLen: floor.parOps - 1,
      });
      check("game-loopwright",
        `${floor.id}: no program under ${floor.parOps} ops wins - the shipped closer is the measured minimum`,
        shorter === null, JSON.stringify(shorter));
    });
  });

  /* The win frames, taken apart press by press: who holds each plate on
   * the frame the win law judges - ghost bodies, ghost crates, the live
   * crates (the closer's own shoulder), and placed pads. */
  const winPress = {};
  const ticksOf = {};
  const waitsOf = {};
  seeded(() => {
    floors.forEach((floor) => {
      const base = App.loopParse(floor);
      const ghosts = [];
      let ticks = 0;
      for (let i = 0; i < floor.programs.length - 1; i += 1) {
        const sim = App.loopSim(lpw.gridWith(base, ghosts), floor.programs[i], 64);
        ticks += sim.steps;
        ghosts.push(sim.frames);
      }
      const closer = App.loopSim(lpw.gridWith(base, ghosts), floor.programs[floor.programs.length - 1], 64);
      ticks += closer.steps;
      const fin = closer.frames[closer.frames.length - 1];
      const key = (c) => c.x + "," + c.y;
      const bodies = new Set();
      const gCrates = new Set();
      const gPads = new Set();
      ghosts.forEach((frames) => {
        const f = frames[frames.length - 1];
        bodies.add(f.w.x + "," + f.w.y);
        (f.crates || []).forEach((c) => gCrates.add(key(c)));
        (f.pads || []).forEach((p) => { if (!p.held) gPads.add(key(p)); });
      });
      let viaBody = 0;
      let viaGhostCrate = 0;
      let viaLiveCrate = 0;
      let viaPad = 0;
      let moved = false;
      base.plates.forEach((p, pi) => {
        if (!fin.press[pi]) return;
        const k = key(p);
        if (bodies.has(k)) viaBody += 1;
        else if (gCrates.has(k)) viaGhostCrate += 1;
        else if (gPads.has(k)) viaPad += 1;
        else if ((fin.crates || []).some((c) => key(c) === k)) viaLiveCrate += 1;
        else if ((fin.pads || []).some((pd) => !pd.held && key(pd) === k)) viaPad += 1;
      });
      (fin.crates || []).forEach((c) => {
        if (!base.crates.some((b) => b.x === c.x && b.y === c.y) &&
            !ghosts.some((frames) => {
              const f = frames[frames.length - 1];
              return (f.crates || []).some((g) => g.x === c.x && g.y === c.y);
            })) {
          moved = true;
        }
      });
      winPress[floor.id] = {
        bodies: viaBody, ghostCrates: viaGhostCrate, liveCrates: viaLiveCrate,
        pads: viaPad, padsOnPlates: base.plates.filter((p) => gPads.has(key(p))).length,
        closerPress: moved,
      };
      ticksOf[floor.id] = ticks;
      waitsOf[floor.id] = floor.programs.reduce(
        (sum, run) => sum + run.filter((op) => op === "W").length, 0);
    });
  });

  /* The tier's records, each a number measured against every floor before
   * it - scoped by position, so later tiers may legitimately overtake. */
  const peakBefore = (id, get) => Math.max.apply(null, before(id).map(get));
  const recProblems = [];
  const rec = (id, label, ok, detail) => {
    if (!ok) recProblems.push(id + " " + label + (detail ? " (" + detail + ")" : ""));
  };
  rec("f31", "first six-run crew",
    byId.f31.parRuns === 6 && peakBefore("f31", (f) => f.parRuns) === 5);
  rec("f31", "its crew bound holds: four ghosts press at most 7 of 8",
    winPress.f31.bodies + winPress.f31.ghostCrates === 8 && winPress.f31.bodies === 5);
  rec("f32", "first three-ram floor",
    byId.f32.grid.pistons.length === 3 && peakBefore("f32", (f) => f.grid.pistons.length) === 2);
  rec("f32", "the rams are phased 1, 2, 0 and the straight walk dies on the mouth ram",
    JSON.stringify(byId.f32.pistonOffsets) === JSON.stringify([1, 2, 0]));
  rec("f33", "first four-door stack",
    byId.f33.grid.doors.length === 4 && peakBefore("f33", (f) => f.grid.doors.length) === 3);
  rec("f33", "the stack is wired [0, 1, 7, 6]",
    JSON.stringify(byId.f33.doorPlates) === JSON.stringify([0, 1, 7, 6]));
  rec("f34", "first three-pad shift",
    byId.f34.grid.pads.length === 3 && peakBefore("f34", (f) => f.grid.pads.length) === 2);
  rec("f34", "three pads sit on plates at the winning frame, past the two of f10/f12",
    winPress.f34.padsOnPlates === 3 && peakBefore("f34", (f) => winPress[f.id].padsOnPlates) === 2);
  rec("f35", "first nine-plate yard, past the summit's full house",
    byId.f35.grid.plates.length === 9 && peakBefore("f35", (f) => f.grid.plates.length) === 8);
  rec("f36", "first ten-plate floor",
    byId.f36.grid.plates.length === 10 && peakBefore("f36", (f) => f.grid.plates.length) === 9);
  rec("f36", "first seven-run crew",
    byId.f36.parRuns === 7 && peakBefore("f36", (f) => f.parRuns) === 6);
  rec("f37", "first five-crate fleet",
    byId.f37.grid.crates.length === 5 && peakBefore("f37", (f) => f.grid.crates.length) === 4);
  rec("f38", "the longest shift the panel has dealt: 48 ticks, past every floor before it",
    ticksOf.f38 === 48 && peakBefore("f38", (f) => ticksOf[f.id]) === 45);
  rec("f38", "the deepest wait line: 6 waits, where five was the old ceiling",
    waitsOf.f38 === 6 && peakBefore("f38", (f) => waitsOf[f.id]) === 5);
  rec("f39", "first eleven-plate yard",
    byId.f39.grid.plates.length === 11 && peakBefore("f39", (f) => f.grid.plates.length) === 10);
  rec("f39", "the first crew of seven or more closed out by the closer's own shove (f2, f7 and f21 ran smaller crews)",
    winPress.f39.closerPress === true && byId.f39.parRuns >= 7 &&
      before("f39").filter((f) => winPress[f.id].closerPress)
        .every((f) => f.parRuns <= 2));
  rec("f40", "the capstone: twelve plates under the first eight-run crew",
    byId.f40.grid.plates.length === 12 && byId.f40.parRuns === 8 &&
      peakBefore("f40", (f) => f.grid.plates.length) === 11 &&
      peakBefore("f40", (f) => f.parRuns) === 7);
  rec("f40", "the longest shift of the first forty: 52 ticks",
    ticksOf.f40 === 52 && peakBefore("f40", (f) => ticksOf[f.id]) === 48);
  check("game-loopwright",
    "every overhaul rung takes its measured record against every floor before it (" +
      "runs 6 then 7 then 8, plates 8 to 12, pistons 3, doors 4, pads 3, crates 5, ticks 48 and 52, waits 6)",
    recProblems.length === 0, recProblems.join(" | "));

  /* The crews are arithmetic: (runs-2) ghosts press measurably fewer
   * plates than the yard holds, so the shipped crew is the count the yard
   * itself demands. f37 overrides - its fourth column's pusher has no
   * plate for its own body, so five ghosts press nine, not ten. */
  const ceilings = {
    f31: 7, f32: 7, f33: 7, f34: 6, f35: 8,
    f36: 9, f37: 9, f38: 9, f39: 10, f40: 11,
  };
  check("game-loopwright",
    "each overhaul yard strands the crew below the one it ships with (7<8, 7<8, 7<8, 6<8, 8<9, 9<10, 9<10, 9<10, 10<11, 11<12)",
    overhaul.every((floor) => ceilings[floor.id] < floor.grid.plates.length),
    overhaul.map((floor) => floor.id + ":" + ceilings[floor.id] + "<" + floor.grid.plates.length).join(" "));
  check("game-loopwright",
    "every overhaul crew of ghosts actually reaches its measured press count on the winning frame",
    overhaul.every((floor) => {
      const press = winPress[floor.id];
      return press.bodies + press.ghostCrates + press.liveCrates + press.pads ===
        floor.grid.plates.length;
    }),
    overhaul.map((floor) => floor.id + ":" +
      (winPress[floor.id].bodies + "+" + winPress[floor.id].ghostCrates + "+" +
        winPress[floor.id].liveCrates + "+" + winPress[floor.id].pads)).join(" "));

  /* The ram phases are load-bearing where the tier deals them: the straight
   * no-wait walks and parks die on the down-ticks the authored runs wait
   * out (f32's mouth ram, f33's shut stack, f38's corridor). */
  seeded(() => {
    const ramProbes = [
      { id: "f32", walk: ["F", "F", "F", "F", "F", "F"], what: "the mouth ram's down-tick" },
      { id: "f33", walk: ["F", "F", "F", "F", "F"], what: "the shut third gate" },
      { id: "f38", walk: ["R", "F", "L", "F", "F", "F", "F"], what: "the corridor ram's down-tick" },
    ];
    ramProbes.forEach((probe) => {
      const floor = byId[probe.id];
      const ghosts = lpw.prefixGhosts(floor);
      const sim = App.loopSim(lpw.gridWith(App.loopParse(floor), ghosts), probe.walk, 64);
      check("game-loopwright",
        `${probe.id}: the no-wait walk dies on ${probe.what} - the phases are the clock`,
        sim.reason === "wall" && !sim.win, "reason " + sim.reason);
    });
    /* f39/f40's closers are Manhattan-exact: their crates are the only
     * presses on their plates that no ghost delivered. */
    ["f39", "f40"].forEach((id) => {
      check("game-loopwright",
        `${id}: the winning frame holds a crate the closer moved itself - the eleventh and twelfth presses are its own shoulder`,
        winPress[id].closerPress === true && winPress[id].liveCrates === 1,
        JSON.stringify(winPress[id]));
    });
  });

  /* ---- the names travel with the module ---- */
  seeded(() => {
    const savedEn = App.I18N.en;
    const savedZh = App.I18N.zh;
    App.I18N.en = savedZh;
    App.I18N.zh = savedEn;
    const swapped = summit.concat(overhaul).every((floor) => {
      const text = App.t(floor.labelKey);
      return text && text !== floor.labelKey;
    });
    App.I18N.en = savedEn;
    App.I18N.zh = savedZh;
    check("game-loopwright", "the summit and overhaul names resolve through App.t in the boot language",
      summit.concat(overhaul).every((floor) => {
        const text = App.t(floor.labelKey);
        return text && text !== floor.labelKey;
      }), "a tier label fell back to its key");
    check("game-loopwright", "the summit and overhaul names resolve through App.t in the other language",
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
  check("game-loopwright", "the unlock chain walks all forty rungs in order",
    walked === 40 && chained && chain.clearedCount() === 40,
    walked + " first clears");
};
