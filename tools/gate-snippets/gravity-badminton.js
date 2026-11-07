"use strict";

/* game-gravity-badminton: a match is data, so the gate re-plays all forty-four of
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
 * rung's court.
 *
 * The locked rotation b31-b40 takes the champion's own seal and perfects it:
 * every rung is locked on all four pulls, gives nothing away (err zero) and
 * never parks (freeze zero - the champion's last window, shut), while the
 * champion's dials climb past their ceiling - pace 192 to 228, power 1.42 to
 * 1.6, reach 19 to 23.5, swing 63 to 72, spread 2.7 to 3.15, and the re-read
 * falls 0.018 to 0.002. No shipped foe pairs the champion's seal with the
 * champion's power and a faster re-read. The band documents its own
 * measurement: the shipped baseBands equal [par, par+2, par+4] exactly.
 *
 * The long courts b41-b44 spend the one dial no earlier rung touched: the match
 * itself. Each long court is played to nine (toWin: 9), the seal holds for a
 * third longer, the capstone fields the fastest body on the ladder (pace 244,
 * reach 28, swing 78), and all stored lines differ. The panel boots through its
 * real init path with the unlock chain seeded, the names ride addStrings in both
 * languages, and the unlock chain walks all forty-four. */

module.exports = function gate(ctx) {
  const { App, env, check } = ctx;
  const levels = App.badmintonLevels || [];
  const court = App.badmintonCourt;
  const name = "game-gravity-badminton";
  const tierIds = ["b25", "b26", "b27", "b28", "b29", "b30"];
  const rotationIds = ["b31", "b32", "b33", "b34", "b35", "b36", "b37", "b38", "b39", "b40"];
  const longIds = ["b41", "b42", "b43", "b44"];

  /* ---- (1) the ladder: forty-four foes, distinct, in order, tiers last ---- */

  check(name, "the ladder holds forty-four opponents",
    levels.length === 44, String(levels.length));
  const ids = levels.map((level) => level.id);
  check(name, "every opponent id is distinct and in ladder order",
    new Set(ids).size === ids.length &&
      ids.every((id, index) => id === "b" + (index + 1)),
    ids.join(","));
  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const tierInPlace = tierIds.every((id, index) =>
    levels[24 + index] && levels[24 + index].id === id);
  const rotationInPlace = rotationIds.every((id, index) =>
    levels[30 + index] && levels[30 + index].id === id);
  const longInPlace = longIds.every((id, index) =>
    levels[40 + index] && levels[40 + index].id === id);
  check(name, "the event horizon tier b25-b30 sits after b24, the locked rotation b31-b40 and long courts b41-b44 close the ladder",
    tierInPlace && rotationInPlace && longInPlace, "tail: " + levels.slice(-10).map((level) => level.id).join(","));
  const tier = tierIds.map((id) => byId[id]).filter(Boolean);
  const rotation = rotationIds.map((id) => byId[id]).filter(Boolean);
  const long = longIds.map((id) => byId[id]).filter(Boolean);
  const shipped = levels.slice(0, 24);
  const extended = tier.concat(rotation, long);

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
    const needed = level.toWin || court.toWin;
    if (!run || run.won < needed) {
      playProblems.push(level.id + " does not win its own line");
      return;
    }
    if (run.conceded >= needed) {
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
    "every stored line on all forty-four rungs wins outright, lands on its measured par," +
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

  /* ---- (3b) the locked rotation: the champion's seal perfected, dials past it ---- */

  const b30 = capstone;
  const rotationProblems = [];
  const rotPowers = rotation.map((level) => level.power);
  const rotPaces = rotation.map((level) => level.speed);
  const rotSpreads = rotation.map((level) => level.spread);
  const rotReaches = rotation.map((level) => level.reach);
  const rotHeights = rotation.map((level) => level.height);
  const rotReacts = rotation.map((level) => level.react);
  rotation.forEach((level, index) => {
    const seal = [0, 1, 2, 3].every((pull) => (level.lock || []).indexOf(pull) >= 0);
    if (!(level.err === 0 && level.freeze === 0 && seal)) {
      rotationProblems.push(level.id + " does not keep the champion's seal (err " +
        level.err + ", freeze " + level.freeze + ", lock " + (level.lock || []).join(",") + ")");
    }
    if (!(level.power > b30.power) || (index > 0 && level.power <= rotPowers[index - 1])) {
      rotationProblems.push("power " + level.power + " at " + level.id + " does not climb past the champion");
    }
    if (!(level.speed > b30.speed) || (index > 0 && level.speed <= rotPaces[index - 1])) {
      rotationProblems.push("pace " + level.speed + " at " + level.id + " does not climb past the champion");
    }
    if (index > 0 && level.spread <= rotSpreads[index - 1]) {
      rotationProblems.push("spread " + level.spread + " at " + level.id + " does not climb");
    }
    if (index > 0 && level.reach <= rotReaches[index - 1]) {
      rotationProblems.push("reach " + level.reach + " at " + level.id + " does not climb");
    }
    if (index > 0 && level.height <= rotHeights[index - 1]) {
      rotationProblems.push("swing " + level.height + " at " + level.id + " does not climb");
    }
    if (!(level.react <= b30.react) || (index > 0 && level.react >= rotReacts[index - 1])) {
      rotationProblems.push("re-read " + level.react + " at " + level.id + " does not fall");
    }
  });
  check(name,
    "the locked rotation keeps the champion's seal on every rung and pushes its dials" +
      " past the ceiling: power " + b30.power + " -> " + rotPowers.join(" -> ") +
      ", pace " + b30.speed + " -> " + rotPaces.join(" -> ") +
      ", re-read " + b30.react + " -> " + rotReacts.join(" -> "),
    rotationProblems.length === 0, rotationProblems.join(" | ") || "climbs");

  const rotSealProblems = shipped.filter((level) =>
    level.err === 0 && level.freeze === 0 &&
    [0, 1, 2, 3].every((pull) => (level.lock || []).indexOf(pull) >= 0) &&
    level.power >= rotation[0].power && level.react <= rotation[0].react);
  check(name,
    "no shipped foe pairs the champion's seal (all pulls locked, nothing gifted," +
      " nothing parked) with the champion's power and a faster re-read",
    rotSealProblems.length === 0,
    rotSealProblems.map((level) => level.id).join(",") || "the seal is the rotation's alone");

  const rotCapstone = byId.b40;
  check(name,
    "the rotation's capstone is the perfected seal: the champion's dials at their top",
    rotCapstone.speed === Math.max.apply(null, rotPaces) &&
      rotCapstone.power === Math.max.apply(null, rotPowers) &&
      rotCapstone.react === Math.min.apply(null, rotReacts) &&
      rotCapstone.err === 0 && rotCapstone.freeze === 0 &&
      [0, 1, 2, 3].every((pull) => (rotCapstone.lock || []).indexOf(pull) >= 0),
    "pace " + rotCapstone.speed + ", power " + rotCapstone.power + ", re-read " + rotCapstone.react);

  /* ---- (3c) the long courts: played to nine, fastest body ---- */
  const b40 = rotCapstone;
  const longProblems = [];
  long.forEach((level) => {
    if (level.toWin !== 9) {
      longProblems.push(level.id + " is not played to nine (toWin: " + level.toWin + ")");
    }
    if (level.err !== 0 || level.freeze !== 0) {
      longProblems.push(level.id + " breaks discipline: err " + level.err + ", freeze " + level.freeze);
    }
    if (level.power !== b40.power || level.react !== b40.react) {
      longProblems.push(level.id + " alters power or reaction from champion: " + level.power + "/" + level.react);
    }
  });
  const longCapstone = byId.b44;
  check(name,
    "the long courts b41-b44 are played to nine, keep the seal's discipline, and the capstone fields the fastest body",
    longProblems.length === 0 &&
      longCapstone.speed === 244 && longCapstone.reach === 28 && longCapstone.height === 78,
    longProblems.join(" | ") || "pace 244, reach 28, swing 78");

  /* ---- (4) the tiers' lines are their own, and their bands are honest ---- */

  const lineKey = (line) => line.map((entry) => entry.u + "/" + entry.target).join(";");
  const shippedKeys = {};
  shipped.forEach((level) => { shippedKeys[lineKey(level.line)] = level.id; });
  const copied = extended.filter((level) => shippedKeys[lineKey(level.line)]).map((level) => level.id);
  const distinctLines = new Set(extended.map((level) => lineKey(level.line))).size === extended.length;
  check(name,
    "no extended line is copied whole from a shipped court and all twenty differ",
    copied.length === 0 && distinctLines,
    copied.join(",") || "twenty own lines");

  const docProblems = extended.filter((level) => {
    const par = App.badmintonPar(level);
    return level.baseBands.join("/") !== [par, par + 2, par + 4].join("/");
  }).map((level) => level.id + " documents " + level.baseBands.join("/") +
    " against measured " + [App.badmintonPar(level), App.badmintonPar(level) + 2, App.badmintonPar(level) + 4].join("/"));
  check(name,
    "every extended rung's shipped baseBands document its own measured par",
    docProblems.length === 0, docProblems.join(" | ") || "documented");

  /* ---- (5) boot: the extended tiers through the real builder ---- */

  const bootProblems = [];
  extended.forEach((def, index) => {
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
    "each extended foe boots through the real builder and the panel arms its own court",
    bootProblems.length === 0, bootProblems.slice(0, 4).join(" | "));

  /* ---- (6) the unlock chain walks all forty-four ---- */

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
  check(name, "the unlock chain walks all forty-four opponents in order",
    walked === 44 && chained && chain.clearedCount() === 44, walked + " first clears");

  /* ---- (7) the tiers' names resolve in both languages ---- */

  const copyProblems = extended.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check(name, "the twenty extended opponent names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
