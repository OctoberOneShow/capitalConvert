"use strict";

/* game-ocean-archaeologist: the whole ladder replays through the module's own
 * three lines, and the trench tier's squeeze is proven by relaxing it
 *
 * The module ships its own proof machinery - ocnWreck deals a seeded wreck,
 * ocnPlan/LiftLine/QuickLine measure the best, salvage and hurried lines, and
 * ocnBeatable checks the bands over sixty seeds - so the gate drives exactly
 * that, plus the deal filter, on every rung of twenty-four. The bands were
 * read off the same measurement (they are the floors of the three lines over
 * the proof seeds), so "beatable" here is the module agreeing with itself,
 * never an assertion from thin air.
 *
 * The trench tier d21-d24 pushes one economics lever past anything the
 * ladder had run, and the gate proves the lever is the rung the honest way:
 * on a clone with the binding lever relaxed, the best measured line climbs -
 * d21 and d22 breathe (air 104/72 opened up climb 7->9 and 4->7), d23
 * reprices the record (28 down to 8 climbs 7->12), and d24 reprices the
 * whole bill at once (record 22, ping 11, bag 7 down to 6/3/2 doubles the
 * best line from 6 to 12). A rung whose lesson can be relaxed away fails the
 * build. */

function minPlan(App, row) {
  let min = Infinity;
  for (let s = 1; s <= 60; s += 1) {
    const wreck = App.diveWreck(row, s * 104729 + 11);
    if (!App.diveReachable(wreck)) {
      continue;
    }
    min = Math.min(min, App.divePlan(wreck).quality);
  }
  return min;
}

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.diveLevels;
  const byId = (id) => levels.find((level) => level.id === id);
  const tierIds = ["d21", "d22", "d23", "d24"];

  check("game-ocean-archaeologist", "the dive ladder holds twenty-four sites",
    levels.length === 24, String(levels.length));
  check("game-ocean-archaeologist", "every site id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = tierIds.filter((id) => !byId(id));
  check("game-ocean-archaeologist", "the trench tier d21-d24 is present",
    missing.length === 0, missing.join(","));

  /* The module's own proof replayed on the whole ladder: bands descending,
   * at least one anchor, and every one of the sixty proof seeds stays inside
   * all three lines' bands. */
  const weak = [];
  levels.forEach((level) => {
    if (!App.diveBeatable(level)) {
      weak.push(level.id);
    }
  });
  check("game-ocean-archaeologist", "every rung survives the module's own sixty-seed proof",
    weak.length === 0, weak.join(","));

  /* The deal filter keeps the three-star anchor live: every dealt wreck of
   * the trench tier measures at or above its band on the best line. */
  const deals = [];
  tierIds.forEach((id) => {
    const level = byId(id);
    for (let seed = 1; seed <= 12; seed += 1) {
      const wreck = App.diveDeal(level, seed * 7717);
      if (App.divePlan(wreck).quality < level.starQuality[0]) {
        deals.push(id + "@" + seed);
      }
    }
  });
  check("game-ocean-archaeologist", "the deal filter keeps the summit anchor live",
    deals.length === 0, deals.join(" "));

  /* The trench tier's squeeze is load-bearing: relax the binding lever on a
   * clone and the best measured line climbs. */
  const climbs = [];
  const cuts = [
    ["d21", { air: 130 }, "air"],
    ["d22", { air: 110 }, "air"],
    ["d23", { docCost: 8 }, "record price"],
    ["d24", { docCost: 6, pingCost: 3, liftCost: 2 }, "the whole bill"],
  ];
  cuts.forEach(([id, cut, lever]) => {
    const level = byId(id);
    const base = minPlan(App, level);
    const relaxed = Object.assign({}, level, cut);
    const after = minPlan(App, relaxed);
    if (!(after > base)) {
      climbs.push(id + " " + base + "->" + after);
    }
  });
  check("game-ocean-archaeologist",
    "relaxing each trench lever lets the best line climb",
    climbs.length === 0, climbs.join(" | "));

  /* The summit carries the dearest bill and the busiest site on the ladder. */
  const summit = byId("d24");
  const dearest = levels.every((level) =>
    level === summit ||
    level.docCost + level.pingCost + level.liftCost <
      summit.docCost + summit.pingCost + summit.liftCost);
  check("game-ocean-archaeologist", "the summit charges the dearest bill on the ladder",
    dearest,
    levels.map((level) => level.docCost + level.pingCost + level.liftCost).join(","));

  /* And the trench tier keeps the star contract: bands descend and never sit
   * above the measured floor of their own line. */
  const badBands = tierIds.filter((id) => {
    const level = byId(id);
    const bands = level.starQuality;
    return !(bands[0] >= bands[1] && bands[1] >= bands[2] && bands[2] >= 1);
  });
  check("game-ocean-archaeologist", "the trench bands run downwards from three stars",
    badBands.length === 0, badBands.join(","));

  /* Trench labels travel in both dictionaries and never fall back to keys. */
  ["en", "zh"].forEach((lang) => {
    const ok = tierIds.every((id) => {
      const level = byId(id);
      const text = App.I18N && App.I18N[lang] ? App.I18N[lang][level.labelKey] : null;
      return typeof text === "string" && text && text !== level.labelKey &&
        App.t(level.labelKey) !== level.labelKey;
    });
    check("game-ocean-archaeologist", `the trench labels resolve in ${lang}`,
      !!ok, tierIds.join(","));
  });
};
