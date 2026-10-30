"use strict";

/* game-gravity-badminton: a match is data, so the gate re-plays all thirty of
 * them. Every rung ships a stored line of {stand here, land it there} entries
 * and the module already carries the replay runner the par and the bands are
 * cut from (App.badmintonRally over App.badmintonState with the panel's own
 * options - slow shuttle off, aim assist on). The gate walks every line
 * through that runner and demands the whole match: won outright before the
 * cap, the concession landing exactly on the measured par, the bands hanging
 * off that par by the shipped [par, par+2, par+4] ladder, the three-star rung
 * reached by the line itself, and the court ending where the rotation says -
 * the pull swings to the next wall after every started rally, so the final
 * gravity is the rally count mod four, and a replay that ends anywhere else
 * is not the game the pixels draw.
 *
 * The event horizon tier b25-b30 closes the leaks the grand apex still had:
 * its three dials climb monotonically past the apex wall (power 1.3 up to
 * 1.4, err 0.1 down to nothing, base pace 170 up to 190), the capstone is
 * fully locked on all four pulls with err zero, so nothing it hits can be
 * waited out and nothing it does is a gift, and every stored line is the
 * rung's own - six distinct programs, none copied whole from an earlier
 * rung's court. The band documents its own measurement: the shipped
 * baseBands on the summit equal [par, par+2, par+4] exactly. The panel boots
 * through its real init path with the unlock chain seeded, the names ride
 * addStrings in both languages, and the unlock chain walks all thirty. */

module.exports = function gate(ctx) {
  const { App, env, check } = ctx;
  const levels = App.badmintonLevels || [];
  const court = App.badmintonCourt;
  const name = "game-gravity-badminton";
  const tierIds = ["b25", "b26", "b27", "b28", "b29", "b30"];

  /* ---- (1) the ladder: thirty foes, distinct, in order, tier last ---- */

  check(name, "the ladder holds thirty opponents",
    levels.length === 30, String(levels.length));
  const ids = levels.map((level) => level.id);
  check(name, "every opponent id is distinct and in ladder order",
    new Set(ids).size === ids.length &&
      ids.every((id, index) => id === "b" + (index + 1)),
    ids.join(","));
  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const tierInPlace = tierIds.every((id, index) =>
    levels[24 + index] && levels[24 + index].id === id);
  check(name, "the event horizon tier b25-b30 closes the ladder, appended after b24",
    tierInPlace, "tail: " + levels.slice(-6).map((level) => level.id).join(","));
  const tier = tierIds.map((id) => byId[id]).filter(Boolean);
  const shipped = levels.slice(0, 24);

  const coreReady = typeof App.badmintonState === "function" &&
    typeof App.badmintonRally === "function" &&
    typeof App.badmintonSolvable === "function" &&
    typeof App.badmintonPar === "function" &&
    typeof App.badmintonBands === "function" &&
    typeof App.initGravityBadmintonGame === "function" &&
    court && court.toWin === 7;
  check(name,
    "the module exports the pure core, the real builder and the seven-point court the proof replays",
    coreReady, "badmintonState/badmintonRally/badmintonSolvable/badmintonPar/badmintonBands");

  /* ---- (2) the full ladder re-played through the exported runner ---- */

  const play = (level) =>
    App.badmintonRally(App.badmintonState(level, { slow: false, assist: true }), level.line);

  const playProblems = [];
  levels.forEach((level) => {
    const run = play(level);
    const par = App.badmintonPar(level);
    const bands = App.badmintonBands(level);
    if (!run || run.won < court.toWin) {
      playProblems.push(level.id + " does not win its own line");
      return;
    }
    if (run.conceded >= court.toWin) {
      playProblems.push(level.id + " loses the match at " + run.won + "-" + run.conceded);
    }
    if (run.rallies > level.cap) {
      playProblems.push(level.id + " needs " + run.rallies + " rallies past the cap " + level.cap);
    }
    if (!App.badmintonSolvable(level)) {
      playProblems.push(level.id + " fails the module's own solvability proof");
    }
    if (run.conceded !== par) {
      playProblems.push(level.id + " concedes " + run.conceded + " against measured par " + par);
    }
    if (bands.join("/") !== [par, par + 2, par + 4].join("/")) {
      playProblems.push(level.id + " bands " + bands.join("/") + " leave the measured par " + par);
    }
    if (!(bands[0] < bands[1] && bands[1] < bands[2])) {
      playProblems.push(level.id + " bands " + bands.join("/") + " are not strictly ordered");
    }
    if (run.conceded > bands[0] || App.starsFor(run.conceded, bands, "low") !== 3) {
      playProblems.push(level.id + " its own line banks only " +
        App.starsFor(run.conceded, bands, "low") + " stars");
    }
    if (App.starsFor(bands[2], bands, "low") !== 1 ||
        App.starsFor(bands[2] + 1, bands, "low") !== 0) {
      playProblems.push(level.id + " the one-star rung is not the serviceable boundary");
    }
    if (run.state.gravity !== run.rallies % 4) {
      playProblems.push(level.id + " ended on pull " + run.state.gravity +
        " after " + run.rallies + " rallies - the rotation broke");
    }
  });
  check(name,
    "every stored line on all thirty rungs wins outright, lands on its measured par," +
    " hangs the bands off it, banks three stars and ends where the rotation says",
    playProblems.length === 0, playProblems.slice(0, 4).join(" | "));

  /* ---- (3) the tier closes the leaks: the dials climb, the gifts stop ---- */

  const b24 = byId.b24;
  const dialProblems = [];
  const powers = tier.map((level) => level.power);
  const errs = tier.map((level) => level.err);
  const paces = tier.map((level) => level.speed);
  powers.forEach((value, index) => {
    if (!(value > b24.power) || (index > 0 && value <= powers[index - 1])) {
      dialProblems.push("power " + value + " at " + tier[index].id + " does not climb past the apex");
    }
  });
  errs.forEach((value, index) => {
    if (value > b24.err || (index > 0 && value >= errs[index - 1])) {
      dialProblems.push("err " + value + " at " + tier[index].id + " does not fall");
    }
  });
  paces.forEach((value, index) => {
    if (!(value > b24.speed) || (index > 0 && value <= paces[index - 1])) {
      dialProblems.push("pace " + value + " at " + tier[index].id + " does not climb past the apex");
    }
  });
  check(name,
    "the tier's dials climb monotonically past the apex wall: power " +
      b24.power + " -> " + powers.join(" -> ") + ", err " + b24.err + " -> " +
      errs.join(" -> ") + ", pace " + b24.speed + " -> " + paces.join(" -> "),
    dialProblems.length === 0, dialProblems.join(" | ") || "climbs");

  const capstone = byId.b30;
  const locked = [0, 1, 2, 3].every((pull) => (capstone.lock || []).indexOf(pull) >= 0);
  check(name,
    "the capstone gives nothing away: err zero and all four pulls locked",
    capstone.err === 0 && locked,
    "err " + capstone.err + ", lock " + (capstone.lock || []).join(","));

  /* ---- (4) the tier's lines are its own, and its bands are honest ---- */

  const lineKey = (line) => line.map((entry) => entry.u + "/" + entry.target).join(";");
  const shippedKeys = {};
  shipped.forEach((level) => { shippedKeys[lineKey(level.line)] = level.id; });
  const copied = tier.filter((level) => shippedKeys[lineKey(level.line)]).map((level) => level.id);
  const distinctLines = new Set(tier.map((level) => lineKey(level.line))).size === tier.length;
  check(name,
    "no summit line is copied whole from a shipped court and all six differ",
    copied.length === 0 && distinctLines,
    copied.join(",") || "six own lines");

  const docProblems = tier.filter((level) => {
    const par = App.badmintonPar(level);
    return level.baseBands.join("/") !== [par, par + 2, par + 4].join("/");
  }).map((level) => level.id + " documents " + level.baseBands.join("/") +
    " against measured " + [App.badmintonPar(level), App.badmintonPar(level) + 2, App.badmintonPar(level) + 4].join("/"));
  check(name,
    "every summit rung's shipped baseBands document its own measured par",
    docProblems.length === 0, docProblems.join(" | ") || "documented");

  /* ---- (5) boot: the tier through the real builder ---- */

  const bootProblems = [];
  tier.forEach((def, index) => {
    const cleared = {};
    for (let b = 1; b <= 24 + index; b += 1) {
      cleared["b" + b] = { stars: 3, best: 0 };
    }
    env.store.set("gravity-badminton-campaign", JSON.stringify({ v: 1, cleared: cleared }));
    const panel = env.document.createElement("div");
    try {
      App.initGravityBadmintonGame(panel);
      const canvas = panel.querySelector(".gbm-canvas");
      const select = panel.querySelector("#gbmFoeSel");
      const resultNode = panel.querySelector(".game-result");
      const result = resultNode ? resultNode.textContent : "";
      const foeName = App.t(def.labelKey);
      const problems = [];
      if (!canvas) problems.push("no court canvas");
      if (!select) problems.push("no opponent picker");
      if (select && select.children.length !== levels.length) {
        problems.push("picker holds " + select.children.length + " opponents");
      }
      if (select && select.value !== def.id) {
        problems.push("armed " + select.value + ", wanted " + def.id);
      }
      if (!foeName || foeName === def.labelKey) problems.push("label fell back to its key");
      if (foeName && result.indexOf(foeName) < 0) {
        problems.push("the order line does not name the foe");
      }
      if (result.indexOf("{") >= 0) problems.push("order line leaked a placeholder");
      if (problems.length) bootProblems.push(def.id + ": " + problems.join("; "));
      App.quietResetGravityBadminton();
    } catch (error) {
      bootProblems.push(def.id + " threw: " + (error && error.message));
    }
  });
  check(name,
    "each summit foe boots through the real builder and the panel arms its own court",
    bootProblems.length === 0, bootProblems.slice(0, 4).join(" | "));

  /* ---- (6) the unlock chain walks all thirty ---- */

  const chain = App.createCampaign({
    key: "gravity-badminton-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 0, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check(name, "the unlock chain walks all thirty opponents in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");

  /* ---- (7) the tier's names resolve in both languages ---- */

  const copyProblems = tier.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check(name, "the six summit opponent names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
