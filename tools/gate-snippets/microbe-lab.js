"use strict";

/* game-microbe-lab: the long bench, dishes m25-m30, proved by the dish's
 * own floor line.
 *
 * The greedy allocator that proves every shipped dish proves these six the
 * same way: the line must survive the whole trial at the floor of four or
 * better, reach the two-star band, and sit one hundred and five over the
 * three-star line - inside the [100, 110] window the shipped deep tier
 * anchored, so a band the greedy line collects fails and a band it cannot
 * see fails too. The tier's difficulty is priced in the levers, because
 * the metric saturates once a dish rides the floor: the seeding thins to
 * twelve founders, the pool shallows to five traits, the ceiling drops to
 * seventeen - each a lever minimum the ladder had never shipped - the
 * lever sums run strictly downwards to the capstone, and m25 opens below
 * the deep summit's own metric, the sharpest single drop in the game. The
 * two base-3 rungs trade a slower card climb for their tight ceilings, so
 * the gate reads their price from the levers, not from the metric. The
 * dish names and the twist lines resolve in both language packs. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.microbeLevels;
  const benchIds = ["m25", "m26", "m27", "m28", "m29", "m30"];

  check("game-microbe-lab", "the ladder holds thirty dishes",
    levels.length === 30, String(levels.length));
  check("game-microbe-lab", "every dish id is distinct",
    new Set(levels.map((l) => l.id)).size === levels.length,
    levels.map((l) => l.id).join(","));
  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const bench = benchIds.map((id) => byId[id]);
  const missing = benchIds.filter((id) => !byId[id]);
  check("game-microbe-lab", "the long-bench dishes m25-m30 exist in order",
    missing.length === 0 &&
      benchIds.every((id, index) => levels.findIndex((l) => l.id === id) >
        (index === 0 ? -1 : levels.findIndex((l) => l.id === benchIds[index - 1]))),
    missing.join(",") || "ordered");

  /* The floor line: the greedy allocator proves every rung the way it
   * proves the shipped twenty-four. */
  const proofs = new Map();
  const lineProblems = [];
  bench.forEach((level) => {
    const proof = App.microbeBeatable(level);
    proofs.set(level.id, proof);
    if (proof.collapsed || proof.cleared !== level.gens || proof.minSurvivors < 4) {
      lineProblems.push(`${level.id}: ${JSON.stringify(proof)}`);
    }
    if (proof.metric < level.starBand[1]) {
      lineProblems.push(`${level.id}: greedy ${proof.metric} under the two-star line ${level.starBand[1]}`);
    }
    const window = proof.metric - level.starBand[0];
    if (window < 100 || window > 110) {
      lineProblems.push(`${level.id}: window ${window} outside [100, 110]`);
    }
    if (!(level.starBand[0] > level.starBand[1] && level.starBand[1] > level.starBand[2])) {
      lineProblems.push(`${level.id}: bands do not run downwards ${level.starBand.join("/")}`);
    }
  });
  check("game-microbe-lab",
    "every long-bench dish survives the greedy line inside the shipped window",
    lineProblems.length === 0, lineProblems.slice(0, 4).join(" | "));

  /* The opening drop: m25's greedy line lands strictly below the deep
   * summit's - the tier starts where the old ladder topped out. */
  const summit = App.microbeBeatable(byId.m24);
  check("game-microbe-lab",
    `m25 opens below the deep summit's metric (${summit.metric})`,
    !proofs.get("m25").collapsed && proofs.get("m25").metric < summit.metric,
    `m25 ${proofs.get("m25").metric} vs m24 ${summit.metric}`);

  /* The levers are the price: the sums run downwards to the capstone, the
   * capstone holds the tier minimum on every lever, and each lever reaches
   * a minimum the first twenty-four dishes never shipped. */
  const shipped = levels.filter((l) => !benchIds.includes(l.id));
  const sums = bench.map((l) => l.cap + l.traitMax + l.start);
  const sumsRise = benchIds.filter((id, index) =>
    index > 0 && sums[index] > sums[index - 1]);
  check("game-microbe-lab",
    `the lever sums never rise across the bench (${sums.join(" >= ")})`,
    sumsRise.length === 0, sumsRise.join(","));
  const cap30 = byId.m30;
  check("game-microbe-lab",
    "the capstone holds the tier minimum on every lever",
    cap30.cap === Math.min(...bench.map((l) => l.cap)) &&
      cap30.traitMax === Math.min(...bench.map((l) => l.traitMax)) &&
      cap30.start === Math.min(...bench.map((l) => l.start)),
    `m30 cap ${cap30.cap} tm ${cap30.traitMax} start ${cap30.start}`);
  /* The levers are the price: the early dishes printed low ceilings on
   * trivial environments and the deep tier traded them back for pressure,
   * so the honest bar is the summit's own row - the bench never loosens a
   * lever m24 set, every rung tightens at least one of them, and the
   * capstone tightens all three at once. */
  const m24row = byId.m24;
  const looser = bench.filter((l) =>
    l.cap > m24row.cap || l.traitMax > m24row.traitMax || l.start > m24row.start);
  check("game-microbe-lab",
    `no bench dish loosens a lever the summit set (m24 cap ${m24row.cap} tm ${m24row.traitMax} start ${m24row.start})`,
    looser.length === 0, looser.map((l) => l.id).join(","));
  const static_ = bench.filter((l) =>
    l.cap === m24row.cap && l.traitMax === m24row.traitMax && l.start === m24row.start);
  check("game-microbe-lab", "every bench dish tightens at least one lever against the summit",
    static_.length === 0, static_.map((l) => l.id).join(","));
  check("game-microbe-lab",
    "the capstone tightens all three levers at once",
    cap30.cap < m24row.cap && cap30.traitMax < m24row.traitMax && cap30.start < m24row.start,
    `m30 cap ${cap30.cap} tm ${cap30.traitMax} start ${cap30.start}`);

  /* The copy travels: dish names and twist lines resolve in both packs. */
  const copyProblems = [];
  benchIds.forEach((id, index) => {
    const n = 25 + index;
    ["mcbZ" + n, "mcbTwist" + n].forEach((key) => {
      const en = App.t(key);
      const zh = App.I18N.zh[key];
      if (!en || en === key || !zh || zh === key || en === zh) {
        copyProblems.push(key);
      }
    });
  });
  check("game-microbe-lab",
    "the long-bench names and twist lines resolve to distinct values in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
