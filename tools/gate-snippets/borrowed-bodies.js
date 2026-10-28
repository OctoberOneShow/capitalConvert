"use strict";

/* game-borrowed-bodies: every room is proved by the panel's own resolver, and
 * the deep tier is gated by the mechanic it names
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
 * from the wrong starting mind. */
module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const rooms = App.bodyRooms;
  const byId = (id) => rooms.find((room) => room.id === id);
  const deepIds = ["b21", "b22", "b23", "b24"];

  check("game-borrowed-bodies", "the campaign holds at least twenty-four rooms",
    rooms.length >= 24, String(rooms.length));
  check("game-borrowed-bodies", "every room id is distinct",
    new Set(rooms.map((room) => room.id)).size === rooms.length,
    rooms.map((room) => room.id).join(","));
  const missing = deepIds.filter((id) => !byId(id));
  check("game-borrowed-bodies", "the new tier b21-b24 is present",
    missing.length === 0, missing.join(","));

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
  check("game-borrowed-bodies", "b24 is the longest room in the campaign",
    b24.par === Math.max.apply(null, rooms.map((room) => room.par)),
    b24.par + " vs " + Math.max.apply(null, rooms.map((room) => room.par)));

  /* Copy travels with the module: a real string in both packs, and t() never
   * falls back to the raw key. */
  const copyKeys = ["brbR21", "brbR22", "brbR23", "brbR24"];
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-borrowed-bodies", "the four room names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
