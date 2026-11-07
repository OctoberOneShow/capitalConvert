"use strict";

/* game-weather-loom: the far-ridge seasons w25-w30, the crowded decade
 * w31-w40 and the walled coast w41-w44, proved by the shipped replay.
 *
 * The head gate already replays every season's authored weave through
 * App.loomRun and demands three stars, every parish fed and nothing
 * flooded - the far-ridge seasons, the crowded decade and the walled
 * coast clear that the same way the shipped twenty-four do, because
 * they were woven and re-windowed by tools/weather-forge.js
 * (--summit / --deep / --coast) against exactly that bar. This gate pins
 * the tiers' own shape on top.
 *
 * Far ridge w25-w30: the six seasons exist in order; no village window in
 * the tier is wider than the shipped 20-point ceiling; no window was cut
 * around a dry settlement - a village whose rain never reached the drink
 * line ships a season that tolerates zero; every budget sits within four
 * points of its own weave's spend; and w30's nine parishes outrank every
 * season before it.
 *
 * Crowded decade w31-w40: every rung takes one structural record away from
 * the ladder behind it, and each record is measured, not asserted - the
 * first ten-parish season, the longest canal (counted by walking the
 * arrow chains from open water), the earliest rain call and lowest flood
 * line under a triple bill, the frost year that fills the map, the first
 * scorched fen, the leanest source, a wet front walking under a storm
 * bill, the biggest weave, the tightest fourteen-wide windows, and the
 * eleven-parish capstone. The dry line holds across the tier, every
 * budget sits within four of its own spend, and no tool in any shipped
 * weave is spare: dropping any one tool takes a parish's harvest with it.
 *
 * Walled coast w41-w44: the tier's one new mechanic is the rationed sea.
 * Every season the loom had shipped drew from a fully open sea column -
 * all eight rows kept a live water cell at x=0 - so the coast runs ridge
 * down onto the open column itself: two stones, then three, four and
 * five, leaving six, five, four and three live mouths, measured off the
 * table rung over rung. No walled row keeps a lake, so its parishes
 * drink only from branch arrows pushed out of the open rows beside them,
 * and the walled-row parishes climb 2 -> 3 -> 4 -> 5 while the capstone's
 * twelve parishes top the decade's eleven under the storm bill. The
 * stones are proved load-bearing the way the bench proves a mechanic:
 * flatten the coast off a mutated copy of each season and the shipped
 * weave busts its bands. The dry line, the fourteen-wide windows, the
 * two-point budgets and the no-spare-tool law hold across the tier, a
 * dawdling win (one tool short) still stars, and the season names
 * resolve in both language packs. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.loomLevels;
  const ridgeIds = ["w25", "w26", "w27", "w28", "w29", "w30"];
  const deepIds = ["w31", "w32", "w33", "w34", "w35", "w36", "w37", "w38", "w39", "w40"];
  const coastIds = ["w41", "w42", "w43", "w44"];

  check("game-weather-loom", "the ladder holds forty-four seasons",
    levels.length === 44, String(levels.length));
  check("game-weather-loom", "every season id is distinct",
    new Set(levels.map((l) => l.id)).size === levels.length,
    levels.map((l) => l.id).join(","));
  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const posOf = (id) => levels.findIndex((l) => l.id === id);
  const inOrder = (ids) => ids.every((id, index) => posOf(id) > -1 &&
    (index === 0 || posOf(id) > posOf(ids[index - 1])));
  const ridgeMissing = ridgeIds.filter((id) => !byId[id]);
  const deepMissing = deepIds.filter((id) => !byId[id]);
  const coastMissing = coastIds.filter((id) => !byId[id]);
  check("game-weather-loom", "the far-ridge seasons w25-w30 exist in order",
    ridgeMissing.length === 0 && inOrder(ridgeIds), ridgeMissing.join(",") || "ordered");
  check("game-weather-loom", "the crowded-decade seasons w31-w40 exist in order",
    deepMissing.length === 0 && inOrder(deepIds), deepMissing.join(",") || "ordered");
  check("game-weather-loom", "the walled-coast seasons w41-w44 exist in order after the decade",
    coastMissing.length === 0 && inOrder(coastIds) && posOf("w41") > posOf("w40"),
    coastMissing.join(",") || "ordered");
  const ridge = ridgeIds.map((id) => byId[id]);
  const deep = deepIds.map((id) => byId[id]);
  const before = (id) => levels.slice(0, posOf(id));

  /* ---- Far ridge shape --------------------------------------------------- */
  const wide = ridge.filter((l) =>
    l.villages.some((v) => v.max - v.min > 20));
  check("game-weather-loom",
    "no far-ridge window is wider than the shipped 20-point ceiling",
    wide.length === 0, wide.map((l) => l.id).join(","));
  const preRidge = before("w25");
  check("game-weather-loom",
    "the far-ridge capstone holds more parishes than any season before it",
    byId.w30.villages.length === 9 &&
      preRidge.every((l) => l.villages.length < 9) &&
      ridge.slice(0, 5).every((l) => l.villages.length < 9),
    ridge.map((l) => l.id + ":" + l.villages.length).join(","));

  /* The dry line: every village's authored replay lands real rain, not a
   * window that merely tolerates zero. */
  const dryProblems = [];
  ridge.concat(deep).forEach((level) => {
    const run = App.loomRun(level, level.plan);
    level.villages.forEach((v) => {
      const got = run.state.rain[v.y * 10 + v.x] || 0;
      if (got < 22) {
        dryProblems.push(`${level.id}: village ${v.x},${v.y} rained ${got}`);
      }
    });
  });
  check("game-weather-loom",
    "every far-ridge and crowded-decade village drinks real rain in the authored replay",
    dryProblems.length === 0, dryProblems.slice(0, 4).join(" | "));

  /* The loom dial stays honest: each budget within four of its own spend,
   * so no season ships slack the weave never needed. */
  const COST = { w: 1, h: 2, s: 1 };
  const costOf = (level) => (level.plan || []).reduce(
    (sum, act) => sum + (COST[act.kind] || 1), 0);
  const slackProblems = [];
  ridge.concat(deep).forEach((level) => {
    const cost = costOf(level);
    if (cost > level.points || level.points - cost > 4) {
      slackProblems.push(`${level.id}: ${cost}/${level.points}`);
    }
  });
  check("game-weather-loom",
    "every far-ridge and crowded-decade budget sits within four points of its own weave",
    slackProblems.length === 0, slackProblems.join(","));

  /* ---- Crowded decade: every record is measured, not asserted ------------ */
  const wlkCfgNum = (level, key, fallback) =>
    level.cfg && level.cfg[key] !== undefined ? level.cfg[key] : fallback;
  const recordProblems = [];
  const push = (ok, message) => { if (!ok) recordProblems.push(message); };

  push(byId.w31.villages.length === 10 &&
    before("w31").every((l) => l.villages.length < 10),
  "w31 is not the first ten-parish season");
  push(byId.w32.villages.every((v) => v.x >= 4) &&
    before("w32").some((l) => l.villages.some((v) => v.x < 4)),
  "w32 is not the first season with no parish within four cells of the sea");
  push(wlkCfgNum(byId.w33, "rainAt", 58) === 48 &&
    before("w33").every((l) => wlkCfgNum(l, "rainAt", 58) > 48),
  "w33's rain call is not the earliest the ladder has shipped");
  push(wlkCfgNum(byId.w33, "floodLimit", 92) === 66 &&
    (byId.w33.cfg || {}).floodWeight === 3 &&
    before("w33").every((l) => wlkCfgNum(l, "floodLimit", 92) > 66),
  "w33's flood line is not the lowest under a triple bill");
  push(wlkCfgNum(byId.w34, "ambient", 50) === 44 &&
    byId.w34.villages.length === 8 &&
    before("w34").every((l) => wlkCfgNum(l, "ambient", 50) !== 44 || l.villages.length < 8),
  "w34 is not the fullest frost year");
  push((byId.w35.hot || []).length >= 2 &&
    before("w35").every((l) => !(l.hot || []).length),
  "w35 is not the ladder's first scorched fen");
  push(wlkCfgNum(byId.w36, "source", 6) === 4 &&
    before("w36").every((l) => wlkCfgNum(l, "source", 6) > 4),
  "w36's source is not the leanest the canals have carried");
  push((byId.w37.wet || []).length > 0 &&
    (byId.w37.cfg || {}).floodWeight === 3 &&
    before("w37").every((l) => !(l.wet || []).length || (l.cfg || {}).floodWeight === undefined),
  "w37 is not the first wet front under a storm bill");
  /* The decade's biggest weave: the far ridge's w29 (49) and w30 (53) keep
   * the ladder-wide record, so the claim is scoped to the tier. */
  push(before("w38").slice(posOf("w31")).every((l) => costOf(l) < costOf(byId.w38)),
  `w38's weave (cost ${costOf(byId.w38)}) is not the biggest the decade has spent`);
  push(byId.w39.villages.every((v) => v.max - v.min === 14) &&
    before("w39").every((l) => l.villages.every((v) => v.max - v.min >= 16)),
  "w39's windows are not the tightest the loom has shipped");
  push(byId.w40.villages.length === 11 &&
    before("w40").every((l) => l.villages.length < 11) &&
    (byId.w40.cfg || {}).floodWeight === 3 &&
    byId.w40.villages.every((v) => v.max - v.min === 14) &&
    (byId.w40.lake || []).length === 4,
  "w40 is not the eleven-parish capstone under the triple bill at fourteen-wide windows");
  check("game-weather-loom",
    "every crowded-decade record beats every rung shipped before it",
    recordProblems.length === 0, recordProblems.slice(0, 4).join(" | "));

  /* No crowded-decade window widens past the far ridge's shipped 16, and
   * the replay of every authored weave still clears at three stars. */
  const deepWide = deep.filter((l) =>
    l.villages.some((v) => v.max - v.min > 16));
  check("game-weather-loom",
    "no crowded-decade window is wider than the far ridge's shipped 16",
    deepWide.length === 0, deepWide.map((l) => l.id).join(","));
  const replayProblems = [];
  deep.forEach((level) => {
    const run = App.loomRun(level, level.plan);
    if (run.stars !== 3 || run.score.fed !== level.villages.length ||
      run.score.flooded !== 0) {
      replayProblems.push(`${level.id}: stars ${run.stars}, fed ${run.score.fed}/${level.villages.length}, flooded ${run.score.flooded}`);
    }
  });
  check("game-weather-loom",
    "every crowded-decade weave replays at three stars with nothing flooded",
    replayProblems.length === 0, replayProblems.slice(0, 4).join(" | "));

  /* No tool in a crowded-decade weave is spare: dropping any one tool takes
   * a parish's harvest with it - stars fall, a parish leaves its window or
   * a cell floods. */
  const spareProblems = [];
  deep.forEach((level) => {
    (level.plan || []).forEach((act, index) => {
      const shorter = level.plan.filter((_, i) => i !== index);
      const run = App.loomRun(level, shorter);
      if (run.stars === 3 && run.score.fed === level.villages.length &&
        run.score.flooded === 0) {
        spareProblems.push(`${level.id}: tool ${index} (${act.kind} ${act.x},${act.y}) is spare`);
      }
    });
  });
  check("game-weather-loom",
    "no crowded-decade weave carries a spare tool",
    spareProblems.length === 0, spareProblems.slice(0, 4).join(" | "));

  /* The names travel in both packs. */
  const copyProblems = [];
  ridgeIds.concat(deepIds).concat(coastIds).forEach((id) => {
    const key = "wlkZ" + Number(id.slice(1));
    const en = App.t(key);
    const zh = App.I18N.zh[key];
    if (!en || en === key || !zh || zh === key || en === zh) {
      copyProblems.push(key);
    }
  });
  check("game-weather-loom",
    "the twenty far-ridge, crowded-decade and walled-coast names resolve to distinct names in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* ---- Walled coast w41-w44: the rationed sea ---------------------------- */
  /* The mechanic's dials, measured off the shipped table: ridge cells on
   * the open column x=0 wall whole rows off from the sea, the live mouths
   * shrink rung over rung, no walled row keeps a lake, and the walled-row
   * parishes - which can drink only from branch arrows pushed out of the
   * open rows beside them - climb with the stones. The exact shape is
   * pinned so the tier cannot quietly change without re-proving it. */
  const coast = coastIds.map((id) => byId[id]);
  const coastOf = (level) => {
    const walledRows = new Set((level.ridge || [])
      .filter((c) => c.x === 0).map((c) => c.y));
    let mouths = 0;
    for (let y = 0; y < 8; y += 1) {
      if (!walledRows.has(y)) mouths += 1;
    }
    return { mouths: mouths, walledRows: walledRows };
  };
  const coastShape = coast.map((level) => {
    const shape = coastOf(level);
    return {
      id: level.id,
      mouths: shape.mouths,
      walls: shape.walledRows.size,
      walledParishes: level.villages.filter((v) => shape.walledRows.has(v.y)).length,
      parishes: level.villages.length,
    };
  });
  check("game-weather-loom",
    "the coast's measured shape is the one it shipped with: " +
      coastShape.map((s) => s.id + " mouths " + s.mouths + ", stones " + s.walls +
        ", walled-row parishes " + s.walledParishes + ", parishes " + s.parishes).join(" | "),
    JSON.stringify(coastShape.map((s) => [s.mouths, s.walls, s.walledParishes, s.parishes])) ===
      JSON.stringify([[6, 2, 2, 11], [5, 3, 3, 12], [4, 4, 4, 12], [3, 5, 5, 12]]),
    JSON.stringify(coastShape));
  const coastMouths = coastShape.map((s) => s.mouths);
  check("game-weather-loom",
    "the live sea mouths shrink strictly rung over rung " + coastMouths.join(" -> "),
    coastMouths.every((value, index) => index === 0 || value < coastMouths[index - 1]),
    JSON.stringify(coastMouths));
  const coastWalls = coastShape.map((s) => s.walls);
  check("game-weather-loom",
    "the coast stones climb strictly rung over rung " + coastWalls.join(" -> "),
    coastWalls.every((value, index) => index === 0 || value > coastWalls[index - 1]),
    JSON.stringify(coastWalls));
  const walledParishes = coastShape.map((s) => s.walledParishes);
  check("game-weather-loom",
    "the walled-row parishes climb strictly rung over rung " + walledParishes.join(" -> "),
    walledParishes.every((value, index) => index === 0 || value > walledParishes[index - 1]),
    JSON.stringify(walledParishes));
  const walledLakes = [];
  coast.forEach((level) => {
    const shape = coastOf(level);
    (level.lake || []).forEach((cell) => {
      if (shape.walledRows.has(cell.y)) {
        walledLakes.push(level.id + " lake " + cell.x + "," + cell.y);
      }
    });
  });
  check("game-weather-loom",
    "no walled coast row keeps a lake - the walled rows drink from branches only",
    walledLakes.length === 0, walledLakes.join(","));
  const earlierWalls = levels.filter((level) => !coastIds.includes(level.id) &&
    (level.ridge || []).some((c) => c.x === 0));
  check("game-weather-loom",
    "the rationed sea belongs to the coast alone - no season shipped before w41 walls the open column",
    earlierWalls.length === 0, earlierWalls.map((l) => l.id).join(","));
  check("game-weather-loom",
    "w42 is the first twelve-parish season and the capstone holds twelve on three mouths",
    byId.w42.villages.length === 12 &&
      levels.filter((l) => posOf(l.id) < posOf("w42")).every((l) => l.villages.length < 12) &&
      byId.w44.villages.length === 12 && coastShape[3].mouths === 3,
    "w42 " + byId.w42.villages.length + ", w44 " + byId.w44.villages.length);

  /* The coast replays clean against the same bar the forge wove it with:
   * three stars, nothing flooded, no dry parish, no window wider than the
   * decade's tightest fourteen, and no budget more than two points loose. */
  const coastReplayProblems = [];
  coast.forEach((level) => {
    const run = App.loomRun(level, level.plan);
    const cost = costOf(level);
    if (run.stars !== 3 || run.score.fed !== level.villages.length ||
      run.score.flooded !== 0) {
      coastReplayProblems.push(`${level.id}: stars ${run.stars}, fed ${run.score.fed}/${level.villages.length}, flooded ${run.score.flooded}`);
    }
    level.villages.forEach((v) => {
      const got = run.state.rain[v.y * 10 + v.x] || 0;
      if (got < 22) {
        coastReplayProblems.push(`${level.id}: village ${v.x},${v.y} rained ${got}`);
      }
    });
    if (level.villages.some((v) => v.max - v.min > 14)) {
      coastReplayProblems.push(`${level.id}: a window is wider than 14`);
    }
    if (cost > level.points || level.points - cost > 2) {
      coastReplayProblems.push(`${level.id}: budget ${cost}/${level.points}`);
    }
  });
  check("game-weather-loom",
    "every coast weave replays at three stars with nothing flooded, no dry parish," +
      " no window wider than fourteen and no budget more than two points loose",
    coastReplayProblems.length === 0, coastReplayProblems.slice(0, 4).join(" | "));

  const coastSpares = [];
  coast.forEach((level) => {
    (level.plan || []).forEach((act, index) => {
      const shorter = level.plan.filter((_, i) => i !== index);
      const run = App.loomRun(level, shorter);
      if (run.stars === 3 && run.score.fed === level.villages.length &&
        run.score.flooded === 0) {
        coastSpares.push(`${level.id}: tool ${index} (${act.kind} ${act.x},${act.y}) is spare`);
      }
    });
  });
  check("game-weather-loom",
    "no coast weave carries a spare tool",
    coastSpares.length === 0, coastSpares.slice(0, 4).join(" | "));

  /* The stones are proved load-bearing the way the bench proves a
   * mechanic: cut them out of a mutated copy of each season and the
   * shipped weave must bust its bands - a freed mouth overwaters the
   * walled rows the wall was starving. */
  const coastFlattenProblems = [];
  coast.forEach((level) => {
    const flat = Object.assign({}, level, {
      ridge: (level.ridge || []).filter((c) => c.x !== 0),
      cfgCache: undefined,
    });
    const run = App.loomRun(flat, level.plan);
    if (run.stars === 3 && run.score.fed === level.villages.length &&
      run.score.flooded === 0) {
      coastFlattenProblems.push(`${level.id}: still clears without its stones`);
    }
  });
  check("game-weather-loom",
    "the stones are load-bearing: flatten the coast off a mutated copy" +
      " and the shipped weave busts its bands",
    coastFlattenProblems.length === 0, coastFlattenProblems.slice(0, 4).join(" | "));

  /* A dawdling win still stars: one tool short, one parish left thirsty,
   * nothing flooded - the one-star line is reachable on every coast rung. */
  const dawdleProblems = [];
  coast.forEach((level) => {
    const found = (level.plan || []).some((act, index) => {
      const shorter = level.plan.filter((_, i) => i !== index);
      const run = App.loomRun(level, shorter);
      return run.stars === 1 && run.score.flooded === 0;
    });
    if (!found) dawdleProblems.push(level.id);
  });
  check("game-weather-loom",
    "a dawdling win still stars: every coast season lands exactly one star one tool short",
    dawdleProblems.length === 0, dawdleProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each season in
   * order hands the player exactly the next one, all the way to w44. */
  const chain = App.createCampaign({
    key: "weather-loom-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-weather-loom", "the unlock chain walks every season in order",
    walked === levels.length && chained && chain.clearedCount() === levels.length,
    walked + " first clears");
};
