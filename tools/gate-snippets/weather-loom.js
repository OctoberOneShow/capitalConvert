"use strict";

/* game-weather-loom: the far-ridge seasons w25-w30, proved by the shipped
 * replay.
 *
 * The head gate already replays every season's authored weave through
 * App.loomRun and demands three stars, every parish fed and nothing
 * flooded - the far-ridge seasons clear that the same way the shipped
 * twenty-four do, because they were woven and re-windowed by
 * tools/weather-forge.js --summit against exactly that bar. This gate pins
 * the tier's own shape on top: the six seasons exist in order; no village
 * window in the tier is wider than the shipped 20-point ceiling (most sit
 * at 16, the tightest the loom has shipped); no window was cut around a
 * dry settlement - a village whose rain never reached the drink line ships
 * a season that tolerates zero, which is what the forge's dry gate exists
 * to prevent; every budget sits within four points of its own weave's
 * spend, so the loom dial stays a constraint rather than decoration; and
 * the capstone holds more parishes than any season before it. The season
 * names resolve in both language packs. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.loomLevels;
  const ridgeIds = ["w25", "w26", "w27", "w28", "w29", "w30"];

  check("game-weather-loom", "the ladder holds thirty seasons",
    levels.length === 30, String(levels.length));
  check("game-weather-loom", "every season id is distinct",
    new Set(levels.map((l) => l.id)).size === levels.length,
    levels.map((l) => l.id).join(","));
  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const missing = ridgeIds.filter((id) => !byId[id]);
  const inOrder = ridgeIds.every((id, index) => levels.findIndex((l) => l.id === id) >
    (index === 0 ? -1 : levels.findIndex((l) => l.id === ridgeIds[index - 1])));
  check("game-weather-loom", "the far-ridge seasons w25-w30 exist in order",
    missing.length === 0 && inOrder, missing.join(",") || "ordered");
  const ridge = ridgeIds.map((id) => byId[id]);

  /* Window shape: the tier never widens past the shipped ceiling, and the
   * capstone's nine parishes outrank every season before it. */
  const wide = ridge.filter((l) =>
    l.villages.some((v) => v.max - v.min > 20));
  check("game-weather-loom",
    "no far-ridge window is wider than the shipped 20-point ceiling",
    wide.length === 0, wide.map((l) => l.id).join(","));
  const shipped = levels.filter((l) => !ridgeIds.includes(l.id));
  check("game-weather-loom",
    "the capstone holds more parishes than any earlier season",
    byId.w30.villages.length === 9 &&
      shipped.every((l) => l.villages.length < 9) &&
      ridge.slice(0, 5).every((l) => l.villages.length < 9),
    ridge.map((l) => l.id + ":" + l.villages.length).join(","));

  /* The dry line: every village's authored replay lands real rain, not a
   * window that merely tolerates zero. */
  const dryProblems = [];
  ridge.forEach((level) => {
    const run = App.loomRun(level, level.plan);
    level.villages.forEach((v) => {
      const got = run.state.rain[v.y * 10 + v.x] || 0;
      if (got < 22) {
        dryProblems.push(`${level.id}: village ${v.x},${v.y} rained ${got}`);
      }
    });
  });
  check("game-weather-loom",
    "every far-ridge village drinks real rain in the authored replay",
    dryProblems.length === 0, dryProblems.slice(0, 4).join(" | "));

  /* The loom dial stays honest: each budget within four of its own spend,
   * so no season ships slack the weave never needed. */
  const COST = { w: 1, h: 2, s: 1 };
  const slackProblems = [];
  ridge.forEach((level) => {
    const cost = (level.plan || []).reduce((sum, act) => sum + (COST[act.kind] || 1), 0);
    if (cost > level.points || level.points - cost > 4) {
      slackProblems.push(`${level.id}: ${cost}/${level.points}`);
    }
  });
  check("game-weather-loom",
    "every far-ridge budget sits within four points of its own weave",
    slackProblems.length === 0, slackProblems.join(","));

  /* The names travel in both packs. */
  const copyProblems = [];
  ridgeIds.forEach((id, index) => {
    const key = "wlkZ" + (25 + index);
    const en = App.t(key);
    const zh = App.I18N.zh[key];
    if (!en || en === key || !zh || zh === key || en === zh) {
      copyProblems.push(key);
    }
  });
  check("game-weather-loom",
    "the six far-ridge season names resolve to distinct names in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
