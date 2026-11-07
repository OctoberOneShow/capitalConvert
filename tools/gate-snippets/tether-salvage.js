"use strict";

/* game-tether-salvage: every scene is proved by the module's own replay, and
 * the gate re-proves all forty of them.
 *
 * A scene ships only when its stored line - {fly here, hook, lead it in}
 * phases, rung over rung - docks the manifest through the same tetherStep
 * the player drives, so the gate's floor is App.tetherSceneSolvable on every
 * rung plus App.tetherUnproven empty: a scene the proof pass rejects is a
 * shipped-content defect, not a row that was never written. The ladder
 * itself is ordered by what the replay measured - the maneuvering steps of
 * the best line - so the gate holds the ticks to a non-decreasing walk with
 * no rung easier than the one before it.
 *
 * The whole-manifest tier s31-s40 ends the ladder: need four of four afloat,
 * where nothing shipped before ever asked for more than three, so nothing
 * can be abandoned and nothing can be lost without the run ending. The
 * stored tour docks all four hulls, the tank is rationed rung over rung down
 * to a few gallons over what the tour burns, and the deep-water rungs add a
 * mid-field well the tow has to fight. Star bands are measured, not
 * invented: ttsMeasure replays the line clean and jittered, and the gate
 * demands the ordered bands, a three-star line the clean run actually
 * banks, and a thin fuel margin the ration guarantees. The panel boots each
 * new scene through its real init path, the names ride addStrings in both
 * languages, and the unlock chain walks all forty. */

module.exports = function gate(ctx) {
  const { App, env, check } = ctx;
  const levels = App.tetherLevels || [];
  const name = "game-tether-salvage";
  const tierIds = ["s31", "s32", "s33", "s34", "s35", "s36", "s37", "s38", "s39", "s40"];

  /* ---- (1) the ladder: forty scenes, distinct, ordered by measured steps ---- */

  check(name, "the recovery ladder holds forty scenes",
    levels.length === 40, String(levels.length));
  check(name, "every scene id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const ticks = levels.map((level) => App.tetherReplay(level, 0, 1).ticks);
  const tickWalk = ticks.every((value, index) =>
    index === 0 || value >= ticks[index - 1]);
  check(name,
    "the ladder rises with no rung easier than the one before it (" +
      ticks.slice(-12).join(" -> ") + ")",
    tickWalk, ticks.join(","));
  const tailInPlace = tierIds.every((id, index) =>
    levels[30 + index] && levels[30 + index].id === id);
  check(name, "the whole-manifest tier s31-s40 closes the ladder, appended after s30",
    tailInPlace, "tail: " + levels.slice(-10).map((level) => level.id).join(","));
  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const tier = tierIds.map((id) => byId[id]).filter(Boolean);
  const shipped = levels.slice(0, 30);

  const coreReady = typeof App.tetherSceneSolvable === "function" &&
    typeof App.tetherReplay === "function" &&
    typeof App.tetherMeasure === "function" &&
    typeof App.tetherStep === "function" &&
    typeof App.initTetherSalvageGame === "function";
  check(name,
    "the module exports the pure core, the measured bands and the real builder the proof replays",
    coreReady, "tetherSceneSolvable/tetherReplay/tetherMeasure/tetherStep/initTetherSalvageGame");

  /* ---- (2) every shipped rung still docks, and nothing was dropped ---- */

  const solvableProblems = [];
  levels.forEach((level) => {
    const out = App.tetherSceneSolvable(level);
    if (!(out === true || (out && out.ok === true))) {
      solvableProblems.push(level.id + " does not dock its own line");
    }
  });
  check(name, "every scene on all forty rungs docks its own stored line",
    solvableProblems.length === 0, solvableProblems.slice(0, 4).join(" | "));
  check(name, "the proof pass dropped nothing: the unproven list is empty",
    Array.isArray(App.tetherUnproven) && App.tetherUnproven.length === 0,
    JSON.stringify((App.tetherUnproven || []).map((level) => level.id)));

  /* ---- (3) the whole-manifest law: need four of four, never asked before ---- */

  const lawProblems = [];
  tier.forEach((level) => {
    if (level.need !== 4) {
      lawProblems.push(level.id + " asks for " + level.need + " hulls, not the whole manifest");
    }
    if ((level.cargos || []).length !== 4) {
      lawProblems.push(level.id + " floats " + (level.cargos || []).length + " hulls under a need of four");
    }
  });
  check(name,
    "every manifest rung demands all four hulls and floats exactly four",
    lawProblems.length === 0, lawProblems.join(" | "));
  const shippedNeed = shipped.map((level) => level.need);
  check(name,
    "no shipped scene ever asked for more than three hulls (max " +
      Math.max.apply(null, shippedNeed) + ")",
    Math.max.apply(null, shippedNeed) <= 3, shippedNeed.join(","));

  /* ---- (4) the ration: thin margins, measured by the replay ---- */

  const margins = tier.map((level) => App.tetherReplay(level, 0, 1).fuel);
  const rationProblems = [];
  margins.forEach((left, index) => {
    if (!(left >= 2 && left <= 16)) {
      rationProblems.push(tier[index].id + " docks with " + left +
        " fuel - the ration is not the rung's discipline");
    }
  });
  check(name,
    "the ration is real: every manifest line docks on a thin tank (" +
      margins.join(" -> ") + ")",
    rationProblems.length === 0, rationProblems.join(" | "));

  /* The ration is the dial, so the dial itself must walk: inside each water
   * the tank falls rung over rung, the closer docks on the thinnest ration
   * of the tier, the opening water sails without a well while every
   * deep-water rung fights exactly one, and the deep water is where the
   * tour draws out longest - the mid pair under the tier's tightest cable
   * and heaviest pull, the last four on the longest measured tours. */
  const waters = [tier.slice(0, 4), tier.slice(4, 6), tier.slice(6)];
  const walkProblems = [];
  waters.forEach((water) => {
    water.forEach((level, index) => {
      if (index > 0 && !(level.fuel < water[index - 1].fuel)) {
        walkProblems.push(level.id + " sails a tank of " + level.fuel +
          " after " + water[index - 1].id + "'s " + water[index - 1].fuel);
      }
    });
  });
  check(name,
    "the ration is the dial and it walks: every water's tank shrinks rung over rung (" +
      waters.map((water) => water.map((level) => level.fuel).join("/")).join(" | ") + ")",
    walkProblems.length === 0, walkProblems.join(" | "));
  check(name,
    "the last convoy docks on the thinnest ration of the tier (" + margins[9] + ")",
    Math.min.apply(null, margins) === margins[margins.length - 1],
    margins.join(","));
  const wellProblems = tier.filter((level, index) =>
    index < 4
      ? level.wells && level.wells.length
      : !level.wells || level.wells.length !== 1
  ).map((level) => level.id);
  check(name,
    "the opening water sails without a well and every deep-water rung fights exactly one",
    wellProblems.length === 0, wellProblems.join(","));
  const midPair = tier.slice(4, 6);
  const deep = tier.slice(6);
  const deepTicks = ticks.slice(36);
  const pulls = tier.filter((level) => level.wells && level.wells.length)
    .map((level) => level.wells[0].g);
  check(name,
    "the deep water fights: the mid pair rides the tier's tightest cable (" +
      midPair.map((level) => level.snap).join("/") + ") and heaviest pull (" +
      midPair[0].wells[0].g + "), the last four draw the longest tours (" +
      deepTicks.join("/") + ")",
    Math.min.apply(null, tier.map((level) => level.snap)) === midPair[0].snap &&
      Math.max.apply(null, pulls) === midPair[0].wells[0].g &&
      deepTicks.every((value, index) =>
        index === 0 || value >= deepTicks[index - 1]) &&
      deepTicks[0] >= Math.max.apply(null, ticks.slice(30, 36)),
    deepTicks.join(","));

  /* ---- (5) star bands measured: ordered, three-star reachable, honest ---- */

  const bandProblems = [];
  tier.forEach((level) => {
    const m = App.tetherMeasure(level);
    const best = App.tetherReplay(level, 0, 1);
    const bands = m.bands;
    if (!(bands[0] > bands[1] && bands[1] >= bands[2] && bands[2] >= 1)) {
      bandProblems.push(level.id + " bands " + bands.join("/") + " are not ordered");
    }
    if (App.starsFor(best.fuel, bands, "high") !== 3) {
      bandProblems.push(level.id + " its own clean line banks only " +
        App.starsFor(best.fuel, bands, "high") + " stars");
    }
    if (App.starsFor(0, bands, "high") !== 0) {
      bandProblems.push(level.id + " a dry dock would still star");
    }
    if (m.won !== true) {
      bandProblems.push(level.id + " the band's own measurement does not dock");
    }
  });
  check(name,
    "every manifest rung's measured bands are ordered, bank three stars on the" +
      " clean line and nothing on a dry tank",
    bandProblems.length === 0, bandProblems.slice(0, 4).join(" | "));

  /* ---- (6) boot: the tier through the real builder ---- */

  const bootProblems = [];
  tier.forEach((def, index) => {
    const cleared = {};
    for (let s = 1; s <= 30 + index; s += 1) {
      cleared["s" + s] = { stars: 3, best: 0 };
    }
    env.store.set("tether-salvage-campaign", JSON.stringify({ v: 1, cleared: cleared }));
    const panel = env.document.createElement("div");
    try {
      App.initTetherSalvageGame(panel);
      const canvas = panel.querySelector(".tts-canvas");
      const select = panel.querySelector("#ttsSceneSel");
      const resultNode = panel.querySelector(".game-result");
      const result = resultNode ? resultNode.textContent : "";
      const sceneName = App.t(def.labelKey);
      const problems = [];
      if (!canvas) problems.push("no salvage canvas");
      if (!select) problems.push("no scene picker");
      if (select && select.children.length !== levels.length) {
        problems.push("picker holds " + select.children.length + " scenes");
      }
      if (select && select.value !== def.id) {
        problems.push("armed " + select.value + ", wanted " + def.id);
      }
      if (!sceneName || sceneName === def.labelKey) problems.push("label fell back to its key");
      if (sceneName && result.indexOf(sceneName) < 0) {
        problems.push("the order line does not name the scene");
      }
      if (result.indexOf("{") >= 0) problems.push("order line leaked a placeholder");
      if (problems.length) bootProblems.push(def.id + ": " + problems.join("; "));
      App.quietResetTetherSalvage();
    } catch (error) {
      bootProblems.push(def.id + " threw: " + (error && error.message));
    }
  });
  check(name,
    "each manifest scene boots through the real builder and the panel arms its own recovery",
    bootProblems.length === 0, bootProblems.slice(0, 4).join(" | "));

  /* ---- (7) the unlock chain walks all forty ---- */

  const chain = App.createCampaign({
    key: "tether-salvage-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 0, better: "high" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check(name, "the unlock chain walks all forty scenes in order",
    walked === 40 && chained && chain.clearedCount() === 40, walked + " first clears");

  /* ---- (8) the tier's names and briefs resolve in both languages ---- */

  const copyProblems = tier.reduce((keys, level) =>
    keys.concat([level.labelKey, level.briefKey]), []).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check(name, "the ten manifest scene names and briefs resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
  const diverged = tier.filter((level) => App.t(level.labelKey) === App.t(level.briefKey));
  check(name, "every manifest name differs from its brief",
    diverged.length === 0, diverged.map((level) => level.id).join(","));
};
