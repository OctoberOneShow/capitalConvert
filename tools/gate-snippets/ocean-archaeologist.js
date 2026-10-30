"use strict";

/* game-ocean-archaeologist: the whole ladder replays through the module's own
 * three lines, and the trench and summit tiers' squeezes are proven by relaxing
 * them
 *
 * The module ships its own proof machinery - ocnWreck deals a seeded wreck,
 * ocnPlan/LiftLine/QuickLine measure the best, salvage and hurried lines, and
 * ocnBeatable checks the bands over sixty seeds - so the gate drives exactly
 * that, plus the deal filter, on every rung of thirty. The bands were read off
 * the same measurement (they are the floors of the three lines over the proof
 * seeds), so "beatable" here is the module agreeing with itself, never an
 * assertion from thin air.
 *
 * The trench tier d21-d24 pushes one economics lever past anything the ladder
 * had run, and the gate proves the lever is the rung the honest way: on a
 * clone with the binding lever relaxed, the best measured line climbs - d21
 * and d22 breathe (air 104/72 opened up climb 7->9 and 4->7), d23 reprices the
 * record (28 down to 8 climbs 7->12), and d24 reprices the whole bill at once
 * (record 22, ping 11, bag 7 down to 6/3/2 doubles the best line from 6 to
 * 12). A rung whose lesson can be relaxed away fails the build.
 *
 * The summit tier d25-d30 carries the same contract past d24's floor of 6:
 * d25 flattens three disagreeing bays (3->6), d26 opens a starved tank (4->10),
 * d27 reprices the ping that a blind survey makes dear (4->6), d28 clears the
 * silt that halves every bag (4->6), d29 reprices a record against a bag at 3
 * (4->6), and d30 opens the tank under the ladder's dearest total bill
 * (3->6). Every summit band is the measured floor of its own line over the same
 * sixty proof seeds, and every one of the thirty dealt anchors measures three
 * stars through App.starsFor. */

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

function meanPlan(App, row) {
  let sum = 0;
  let seen = 0;
  for (let s = 1; s <= 60; s += 1) {
    const wreck = App.diveWreck(row, s * 104729 + 11);
    if (!App.diveReachable(wreck)) {
      continue;
    }
    sum += App.divePlan(wreck).quality;
    seen += 1;
  }
  return seen ? sum / seen : Infinity;
}

/* The floor of each of the module's three exported lines over the same sixty
 * proof seeds the module's own beatable proof replays. */
function measuredBands(App, row) {
  const floor = [Infinity, Infinity, Infinity];
  for (let s = 1; s <= 60; s += 1) {
    const wreck = App.diveWreck(row, s * 104729 + 11);
    if (!App.diveReachable(wreck)) {
      continue;
    }
    floor[0] = Math.min(floor[0], App.divePlan(wreck).quality);
    floor[1] = Math.min(floor[1], App.diveLiftLine(wreck).quality);
    floor[2] = Math.min(floor[2], App.diveQuickLine(wreck).quality);
  }
  return floor;
}

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.diveLevels;
  const byId = (id) => levels.find((level) => level.id === id);
  const tierIds = ["d21", "d22", "d23", "d24"];
  const summitIds = ["d25", "d26", "d27", "d28", "d29", "d30"];

  check("game-ocean-archaeologist", "the dive ladder holds thirty sites",
    levels.length === 30, String(levels.length));
  check("game-ocean-archaeologist", "every site id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = tierIds.filter((id) => !byId(id));
  check("game-ocean-archaeologist", "the trench tier d21-d24 is present",
    missing.length === 0, missing.join(","));
  const missingSummit = summitIds.filter((id) => !byId(id));
  check("game-ocean-archaeologist", "the summit tier d25-d30 is present",
    missingSummit.length === 0, missingSummit.join(","));
  check("game-ocean-archaeologist", "the trench and summit tiers sit at the tail in order",
    levels.slice(20).map((level) => level.id).join(",") ===
      tierIds.concat(summitIds).join(","),
    levels.slice(20).map((level) => level.id).join(","));

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
   * the trench and summit tiers measures at or above its band on the best line. */
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
  check("game-ocean-archaeologist", "the deal filter keeps the trench anchor live",
    deals.length === 0, deals.join(" "));

  const summitDeals = [];
  summitIds.forEach((id) => {
    const level = byId(id);
    for (let seed = 1; seed <= 12; seed += 1) {
      const wreck = App.diveDeal(level, seed * 7717);
      if (App.divePlan(wreck).quality < level.starQuality[0]) {
        summitDeals.push(id + "@" + seed);
      }
    }
  });
  check("game-ocean-archaeologist", "the deal filter keeps the summit anchor live",
    summitDeals.length === 0, summitDeals.join(" "));

  /* The star contract itself, through the same starsFor the panel uses: every
   * site's three-star line is reachable from one of the module's own deals. */
  const starless = levels.filter((level) => {
    const wreck = App.diveDeal(level, 7717);
    return !wreck ||
      App.starsFor(App.divePlan(wreck).quality, level.starQuality, "high") !== 3;
  });
  check("game-ocean-archaeologist", "every site's three-star line is reachable by the module's own solver",
    starless.length === 0, starless.map((level) => level.id).join(","));

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

  /* The summit tier's six lessons, one relaxed lever each. */
  const summitClimbs = [];
  const summitCuts = [
    ["d25", { bays: 0 }, "the disagreeing bays"],
    ["d26", { air: 110 }, "the starved tank"],
    ["d27", { pingCost: 2 }, "the blind survey's ping"],
    ["d28", { silt: 0 }, "the silt"],
    ["d29", { docCost: 6 }, "the record price"],
    ["d30", { air: 130 }, "the starved tank"],
  ];
  summitCuts.forEach(([id, cut, lever]) => {
    const level = byId(id);
    const base = minPlan(App, level);
    const relaxed = Object.assign({}, level, cut);
    const after = minPlan(App, relaxed);
    if (!(after > base)) {
      summitClimbs.push(id + " " + lever + " " + base + "->" + after);
    }
  });
  check("game-ocean-archaeologist",
    "relaxing each summit lever lets the best line climb",
    summitClimbs.length === 0, summitClimbs.join(" | "));

  /* Every summit band is measured, never invented: the floor each exported
   * line actually reached over the same sixty proof seeds. */
  const unmeasured = summitIds.filter((id) => {
    const level = byId(id);
    const measured = measuredBands(App, level);
    const bands = level.starQuality;
    return measured[0] !== bands[0] ||
      measured[1] !== bands[1] ||
      measured[2] !== bands[2];
  });
  check("game-ocean-archaeologist",
    "every summit band is the measured floor of its own line",
    unmeasured.length === 0,
    summitIds.map((id) => {
      const level = byId(id);
      return id + " " + measuredBands(App, level).join("/") + " vs " +
        level.starQuality.join("/");
    }).join(" | "));

  /* Each summit rung falls below d24 on the metric the ladder is scored on:
   * the floor and the average of the best measured line. */
  const d24 = byId("d24");
  const d24Floor = minPlan(App, d24);
  const d24Mean = meanPlan(App, d24);
  const soft = summitIds.filter((id) => {
    const level = byId(id);
    return !(minPlan(App, level) < d24Floor) || !(meanPlan(App, level) < d24Mean);
  });
  check("game-ocean-archaeologist",
    "every summit site is harder than d24 on the measured best line",
    soft.length === 0,
    soft.map((id) => {
      const level = byId(id);
      return id + " floor " + minPlan(App, level) + " mean " +
        meanPlan(App, level).toFixed(2);
    }).join(" | ") + " vs d24 " + d24Floor + "/" + d24Mean.toFixed(2));

  /* The summit carries the dearest bill and the busiest site on the ladder. */
  const summit = byId("d30");
  const dearest = levels.every((level) =>
    level === summit ||
    level.docCost + level.pingCost + level.liftCost <
      summit.docCost + summit.pingCost + summit.liftCost);
  check("game-ocean-archaeologist", "the summit charges the dearest bill on the ladder",
    dearest,
    levels.map((level) => level.docCost + level.pingCost + level.liftCost).join(","));

  /* And the tiers keep the star contract: bands descend and never sit above
   * the measured floor of their own line. */
  const badBands = tierIds.filter((id) => {
    const level = byId(id);
    const bands = level.starQuality;
    return !(bands[0] >= bands[1] && bands[1] >= bands[2] && bands[2] >= 1);
  });
  check("game-ocean-archaeologist", "the trench bands run downwards from three stars",
    badBands.length === 0, badBands.join(","));

  const badSummitBands = summitIds.filter((id) => {
    const level = byId(id);
    const bands = level.starQuality;
    return !(bands[0] >= bands[1] && bands[1] >= bands[2] && bands[2] >= 1);
  });
  check("game-ocean-archaeologist", "the summit bands run downwards from three stars",
    badSummitBands.length === 0, badSummitBands.join(","));

  /* Tier labels travel in both dictionaries and never fall back to keys. */
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

  ["en", "zh"].forEach((lang) => {
    const ok = summitIds.every((id) => {
      const level = byId(id);
      const text = App.I18N && App.I18N[lang] ? App.I18N[lang][level.labelKey] : null;
      return typeof text === "string" && text && text !== level.labelKey &&
        App.t(level.labelKey) !== level.labelKey;
    });
    check("game-ocean-archaeologist", `the summit labels resolve in ${lang}`,
      !!ok, summitIds.join(","));
  });

  /* The unlock chain is derived, never stored: clearing each site in order
   * hands the player exactly the next one, all thirty times. */
  try {
    if (App.storage && App.storage.removeItem) {
      App.storage.removeItem("ocean-archaeologist-gate-chain");
    }
  } catch (error) {
    /* a torn-down storage only means the chain starts fresh */
  }
  const chain = App.createCampaign({
    key: "ocean-archaeologist-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 1 });
    if (outcome.firstClear) {
      walked += 1;
    }
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) {
      chained = false;
    }
  });
  check("game-ocean-archaeologist", "the unlock chain walks all thirty sites in order",
    walked === 30 && chained && chain.clearedCount() === 30,
    walked + " first clears");
};
