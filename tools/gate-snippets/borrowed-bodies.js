"use strict";

/* game-borrowed-bodies: every room is proved by the panel's own resolver, and
 * the deep tier, the summit and the tether tier are each gated by the mechanic
 * they name
 *
 * brbSolve is breadth-first over brbApply - the same function the keys and the
 * pointer drive - so a proved route is a route a player can take, and the par
 * it returns is the number the HUD quotes and the anchor of starMoves. The
 * campaign drops any room the proof cannot finish, which makes an unsolvable
 * row invisible in the picker rather than loud, so this gate counts solved
 * rooms, not rows. Each of b21-b24 is then held to its brief by cutting the
 * mechanic out of a copy of its own map and re-proving: the terrain rungs lose
 * most of their length without the perch or the water, the crate rungs collapse
 * to a short walk without the crate, and two of them cannot be opened at all
 * from the wrong starting mind.
 *
 * The summit b25-b30 rebuilds the road code: each rung re-terrains the walk to
 * the flag so more of it is one-body ground while the crate stays load-bearing,
 * and the prover - deterministic, no seeds - holds every rung to that brief.
 * The pars open above b24 and climb strictly to a closer that ends the ladder
 * as its longest room; the moth can never open a summit room, the last two
 * cannot be opened by the eel either, and cutting the crates out of any summit
 * map drops it to a quarter of par or less.
 *
 * The tether tier b31-b40 taxes the borrow itself: `tether` authors the
 * settling count, the moves the mind has to walk in a borrowed body before it
 * can borrow again, and structurally nothing before the tier carries the
 * field. The rooms walk back over the summit's own long dance with the crab
 * alone holding the opening, the settling count walks three moves to fifteen,
 * and the prover holds every rung to the brief: the pars open above b30's 120
 * and climb strictly (134 to 358), cutting the tether out of any tier map
 * drops it back toward the bare walk, the moth and the eel can open none of
 * them, and the proved plans never hold two possessions closer together than
 * the authored tether - the engine's own rule, visible in the route it
 * proofed. */
module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const rooms = App.bodyRooms;
  const byId = (id) => rooms.find((room) => room.id === id);
  const deepIds = ["b21", "b22", "b23", "b24"];
  const summitIds = ["b25", "b26", "b27", "b28", "b29", "b30"];
  const tetherIds = ["b31", "b32", "b33", "b34", "b35", "b36", "b37", "b38", "b39", "b40"];

  check("game-borrowed-bodies", "the campaign holds at least forty rooms",
    rooms.length >= 40, String(rooms.length));
  check("game-borrowed-bodies", "every room id is distinct",
    new Set(rooms.map((room) => room.id)).size === rooms.length,
    rooms.map((room) => room.id).join(","));
  const missing = deepIds.filter((id) => !byId(id));
  check("game-borrowed-bodies", "the new tier b21-b24 is present",
    missing.length === 0, missing.join(","));
  const missingSummit = summitIds.filter((id) => !byId(id));
  check("game-borrowed-bodies", "the summit tier b25-b30 is present",
    missingSummit.length === 0, missingSummit.join(","));
  const missingTether = tetherIds.filter((id) => !byId(id));
  check("game-borrowed-bodies", "the tether tier b31-b40 is present",
    missingTether.length === 0, missingTether.join(","));
  check("game-borrowed-bodies", "the tether tier sits behind the summit and closes the ladder",
    tetherIds.every((id, index) =>
      rooms.indexOf(byId(id)) === rooms.indexOf(byId("b30")) + 1 + index),
    tetherIds.map((id) => rooms.indexOf(byId(id))).join(","));

  /* The tether tier as structure: no shipped room carries the field, and the
   * ten author the settling counts the tier comment prints. */
  check("game-borrowed-bodies", "no room before the tier authors a tether - the lever is dead for b1-b30",
    rooms.filter((room) => !tetherIds.includes(room.id))
      .every((room) => !room.tether),
    rooms.filter((room) => !tetherIds.includes(room.id) && room.tether)
      .map((room) => room.id).join(","));
  check("game-borrowed-bodies", "the ten tier rooms author settling counts from three moves to fifteen",
    tetherIds.map((id) => byId(id).tether).join(",") === "3,7,7,10,10,11,12,13,14,15" &&
      tetherIds.every((id) => byId(id).tether >= 3),
    tetherIds.map((id) => byId(id).tether).join(","));

  /* The load-time proof must still hold when re-run, and the bands must be the
   * ones the module wrote from it. */
  const solvedIds = rooms.filter((room) => App.bodySolvable(room)).map((room) => room.id);
  check("game-borrowed-bodies", "the solver finishes every room, so the campaign keeps all of them",
    solvedIds.length === rooms.length,
    solvedIds.join(",") + " of " + rooms.map((room) => room.id).join(","));

  const bandProblems = [];
  const replayProblems = [];
  rooms.forEach((room) => {
    const proof = App.bodySolve(room, 120000);
    const par = App.bodyPar(room);
    if (!proof.solved || room.par !== par || proof.par !== par) {
      bandProblems.push(room.id + ":par " + (room.par || "-") + "/" + par + "/" + proof.par);
    }
    const want = [par, par + 3, par + 8];
    if (!room.starMoves || room.starMoves.join(",") !== want.join(",")) {
      bandProblems.push(room.id + ":bands " + (room.starMoves || []).join("/"));
    }
    /* Replay the proved route through the panel's own applier: the plan must
     * actually land the mind on the flag, not merely look short. */
    let state = App.bodyStart(room);
    proof.plan.forEach((action) => {
      const step = App.bodyApply(state, action);
      if (step && step.state) {
        state = step.state;
      }
    });
    if (!state.won) {
      replayProblems.push(room.id);
    }
  });
  check("game-borrowed-bodies", "every room's stored par and star bands match a fresh solve",
    bandProblems.length === 0, bandProblems.join(" "));
  check("game-borrowed-bodies", "every proved plan replays to the flag through the panel's applier",
    replayProblems.length === 0, replayProblems.join(","));

  /* The tier is a real step: each new par beats the shipped summit, and the
   * four climb among themselves. */
  const shippedMax = Math.max.apply(null, rooms.slice(0, 20).map((room) => room.par));
  const deepPars = deepIds.map((id) => byId(id).par);
  check("game-borrowed-bodies", "the new tier opens above the shipped summit and climbs",
    deepPars.every((par, index) => (index === 0 || par > deepPars[index - 1]) && par > shippedMax),
    deepPars.join("/") + " vs shipped " + shippedMax);

  /* Mechanic proofs. cut() re-proves a copy with one terrain kind removed, so a
   * rung that would play the same without its advertised cell fails here. */
  const cut = (room, chars) => {
    const map = room.map.map((row) => {
      let out = row;
      chars.forEach((ch) => { out = out.split(ch).join("."); });
      return out;
    });
    return App.bodySolve({ id: room.id + "-cut", labelKey: room.labelKey, map: map, mind: room.mind }, 120000);
  };
  const otherMind = (room, mind) =>
    App.bodySolve({ id: room.id + "-" + mind, labelKey: room.labelKey, map: room.map, mind: mind }, 120000);

  const b21 = byId("b21");
  const b21Perch = cut(b21, ["^"]);
  const b21Water = cut(b21, ["~"]);
  check("game-borrowed-bodies", "b21 is the perch-and-water stair, not an open floor",
    b21Perch.solved && b21Water.solved && b21Perch.par < b21.par && b21Water.par < b21.par,
    "perch cut " + b21Perch.par + ", water cut " + b21Water.par + " vs " + b21.par);
  check("game-borrowed-bodies", "b21 cannot be opened by the crab, so the eel's first walk is the lesson",
    !otherMind(b21, "C").solved, "crab mind solved=" + otherMind(b21, "C").solved);

  const b22 = byId("b22");
  const b22Water = cut(b22, ["~"]);
  const b22Perch = cut(b22, ["^"]);
  check("game-borrowed-bodies", "b22's wet crossing carries most of its length",
    b22Water.solved && b22Perch.solved && b22Water.par < b22.par && b22Perch.par < b22.par,
    "water cut " + b22Water.par + ", perch cut " + b22Perch.par + " vs " + b22.par);
  check("game-borrowed-bodies", "b22 cannot be opened by the moth",
    !otherMind(b22, "M").solved, "moth mind solved=" + otherMind(b22, "M").solved);

  const b23 = byId("b23");
  const b24 = byId("b24");
  const b23Crate = cut(b23, ["B"]);
  const b24Crate = cut(b24, ["B"]);
  check("game-borrowed-bodies", "b23 is a push puzzle: without the crate it is a short walk",
    b23Crate.solved && b23Crate.par <= b23.par / 4,
    "crate cut " + b23Crate.par + " vs " + b23.par);
  check("game-borrowed-bodies", "b24 is a push puzzle handed across water: without the crate it collapses",
    b24Crate.solved && b24Crate.par <= b24.par / 4,
    "crate cut " + b24Crate.par + " vs " + b24.par);
  check("game-borrowed-bodies", "b24 is the longest of the first twenty-four rooms",
    b24.par === Math.max.apply(null, rooms.slice(0, 24).map((room) => room.par)),
    b24.par + " vs " + Math.max.apply(null, rooms.slice(0, 24).map((room) => room.par)));

  /* The summit is priced on the same prover. Each rung must keep the crate
   * load-bearing (a quarter of par or less without it), keep every terrain
   * kind carrying real length, and stay shut to the moth; b29 and b30 shut
   * to the eel too, so only the crab's whole opening sequence fits. */
  const summitProofs = [];
  summitIds.forEach((id) => {
    const room = byId(id);
    const crateCut = cut(room, ["B"]);
    const perchCut = cut(room, ["^"]);
    const waterCut = cut(room, ["~"]);
    const chasmCut = cut(room, ["_"]);
    const moth = otherMind(room, "M");
    const eel = otherMind(room, "E");
    const cutOk = crateCut.solved && perchCut.solved && waterCut.solved && chasmCut.solved &&
      crateCut.par <= room.par / 4 &&
      perchCut.par < room.par && waterCut.par < room.par && chasmCut.par < room.par;
    summitProofs.push(id + (cutOk ? ":ok" : ":cut " +
      [crateCut, perchCut, waterCut, chasmCut].map((c) => c.solved ? c.par : "x").join("/")));
    check("game-borrowed-bodies", id + ": the crate is load-bearing and every terrain carries length",
      cutOk,
      "crate " + (crateCut.solved ? crateCut.par : "x") +
        ", perch " + (perchCut.solved ? perchCut.par : "x") +
        ", water " + (waterCut.solved ? waterCut.par : "x") +
        ", chasm " + (chasmCut.solved ? chasmCut.par : "x") + " vs " + room.par);
    check("game-borrowed-bodies", id + ": the moth can never open it" +
        (id === "b29" || id === "b30" ? ", nor the eel" : ""),
      !moth.solved && (id === "b29" || id === "b30" ? !eel.solved : true),
      "moth solved=" + moth.solved + ", eel solved=" + eel.solved);
  });
  check("game-borrowed-bodies", "every summit cut left its rung shorter in its advertised shape",
    summitProofs.every((p) => p.endsWith(":ok")), summitProofs.join(" "));

  /* The summit is a real summit: it opens above b24, climbs strictly through
   * the six, and the closer ends the ladder as its longest room. */
  const summitPars = summitIds.map((id) => byId(id).par);
  check("game-borrowed-bodies", "the summit opens above b24 and climbs (" +
      summitPars.join(" -> ") + " vs " + b24.par + ")",
    summitPars.every((par, index) => (index === 0 || par > summitPars[index - 1]) && par > b24.par),
    summitPars.join("/") + " vs " + b24.par);
  const b30 = byId("b30");
  check("game-borrowed-bodies", "b30 ends the shipped ladder as its longest room",
    b30.par === Math.max.apply(null, rooms.slice(0, 30).map((room) => room.par)),
    b30.par + " vs " + Math.max.apply(null, rooms.slice(0, 30).map((room) => room.par)));

  /* The tether tier is priced on the same prover. The settling count is the
   * lesson, so each rung must open above the summit's closer, climb strictly
   * through the ten, keep the borrow tax load-bearing (cutting the tether
   * out drops the rung back toward the bare walk), stay shut to the moth and
   * the eel, and show the engine's own rule inside the proved route: no two
   * possessions land closer together than the authored tether. */
  const b31 = byId("b31");
  let tetherPrev = b30.par;
  const gapProblems = [];
  const gaps = {};
  tetherIds.forEach((id) => {
    const room = byId(id);
    const proof = App.bodySolve(room, 120000);
    const bare = App.bodySolve({ id: room.id + "-gate-bare", labelKey: room.labelKey, map: room.map, mind: room.mind }, 120000);
    const moth = otherMind(room, "M");
    const eel = otherMind(room, "E");
    check("game-borrowed-bodies", id + ": the tether is load-bearing and the room opens for the crab alone",
      proof.solved && proof.par > tetherPrev && proof.par > b30.par &&
        bare.solved && bare.par < proof.par && !moth.solved && !eel.solved,
      "par " + proof.par + " (prev " + tetherPrev + "), bare " +
        (bare.solved ? bare.par : "x") + ", moth " + (moth.solved ? moth.par : "shut") +
        ", eel " + (eel.solved ? eel.par : "shut"));
    if (proof.solved && proof.par > tetherPrev) {
      tetherPrev = proof.par;
    }
    let lastPossess = -Infinity;
    let roomGap = Infinity;
    proof.plan.forEach((action, index) => {
      if (action.type === "possess") {
        roomGap = Math.min(roomGap, index - lastPossess);
        lastPossess = index;
      }
    });
    gaps[id] = roomGap;
    if (!(roomGap >= room.tether)) {
      gapProblems.push(id + ": possessions " + roomGap + " apart under a tether of " + room.tether);
    }
  });
  check("game-borrowed-bodies", "the tether pars climb strictly to the closer (" +
      tetherIds.map((id) => byId(id).par).join(" -> ") + " vs " + b30.par + ")",
    tetherIds.every((id, index) => index === 0 || byId(id).par > byId(tetherIds[index - 1]).par) &&
      b31.par > b30.par && byId("b40").par === Math.max.apply(null, rooms.map((room) => room.par)),
    tetherIds.map((id) => byId(id).par).join("/") + " vs " + b30.par);
  check("game-borrowed-bodies", "no proved tier route borrows twice within its own settling count (" +
      tetherIds.map((id) => id + " " + gaps[id] + "/" + byId(id).tether).join(" ") + ")",
    gapProblems.length === 0, gapProblems.join(" | "));

  /* Copy travels with the module: a real string in both packs, and t() never
   * falls back to the raw key. */
  const copyKeys = ["brbR21", "brbR22", "brbR23", "brbR24",
    "brbR25", "brbR26", "brbR27", "brbR28", "brbR29", "brbR30",
    "brbR31", "brbR32", "brbR33", "brbR34", "brbR35",
    "brbR36", "brbR37", "brbR38", "brbR39", "brbR40"];
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-borrowed-bodies", "the twenty deep, summit and tether room names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
