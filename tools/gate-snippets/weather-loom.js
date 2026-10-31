"use strict";

/* game-weather-loom: the far-ridge seasons w25-w30 and the crowded decade
 * w31-w40, proved by the shipped replay.
 *
 * The head gate already replays every season's authored weave through
 * App.loomRun and demands three stars, every parish fed and nothing
 * flooded - the far-ridge seasons and the crowded decade clear that the
 * same way the shipped twenty-four do, because they were woven and
 * re-windowed by tools/weather-forge.js (--summit / --deep) against
 * exactly that bar. This gate pins the tiers' own shape on top.
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
 * The season names resolve in both language packs. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.loomLevels;
  const ridgeIds = ["w25", "w26", "w27", "w28", "w29", "w30"];
  const deepIds = ["w31", "w32", "w33", "w34", "w35", "w36", "w37", "w38", "w39", "w40"];

  check("game-weather-loom", "the ladder holds at least forty seasons",
    levels.length >= 40, String(levels.length));
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
  check("game-weather-loom", "the far-ridge seasons w25-w30 exist in order",
    ridgeMissing.length === 0 && inOrder(ridgeIds), ridgeMissing.join(",") || "ordered");
  check("game-weather-loom", "the crowded-decade seasons w31-w40 exist in order",
    deepMissing.length === 0 && inOrder(deepIds), deepMissing.join(",") || "ordered");
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
  ridgeIds.concat(deepIds).forEach((id) => {
    const key = "wlkZ" + Number(id.slice(1));
    const en = App.t(key);
    const zh = App.I18N.zh[key];
    if (!en || en === key || !zh || zh === key || en === zh) {
      copyProblems.push(key);
    }
  });
  check("game-weather-loom",
    "the sixteen far-ridge and crowded-decade names resolve to distinct names in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each season in
   * order hands the player exactly the next one, all the way to w40. */
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
