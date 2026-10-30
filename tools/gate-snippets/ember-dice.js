"use strict";

/* game-ember-dice: the summit tables are solved, not guessed, and the summit
 * tier is the hard tier
 *
 * The forge module carries the table's own rules in an exact solver: value
 * iteration over (turns left, bank, stake) under the best stopping policy,
 * so a table ships only when the solver measures it - a comfortable share of
 * runs clears inside the ten turns, and the three-star line (clear with
 * three turns spare) lands in the band the shipped tables occupy. This gate
 * re-measures the whole summit through that same solver, then holds the new
 * tier to its design brief: targets no earlier rung asked for, a burn
 * density no earlier rung lit, and a bounty sitting on the starvation edge
 * the forge can re-measure one bounty stingier.
 *
 * The summit tier t25-t30 moves the dial from the target to the felt. The
 * forge measures the pairs felts as target-invariant at the starvation edge
 * (two-ember pairs pin at a 19.6-19.7% three-star line whatever the target,
 * the classic three-ember pairs at 25.1%), so the only lever the solver
 * answers to is which faces burn - the yield of the rolls that survive. The
 * gate holds the tier to that brief: the three-star line falls rung over
 * rung (22.8, 19.7, 19.6, 16.7, 16.2, 15.0%), each rung under the Last
 * Ember's 25.1 and inside the shipped bands; every bounty again sits one
 * stingier from falling out; and the felt is priced by twins - the same
 * target and bounty on a classic felt measures easier on both lines on
 * every rung probed. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const dice = require(path.join(root, "tools", "dice-forge.js"));
  const tables = dice.loadTables();
  const summitIds = ["t25", "t26", "t27", "t28", "t29", "t30"];

  check("game-ember-dice", "the dice ladder holds thirty tables",
    tables.length === 30, String(tables.length));
  check("game-ember-dice", "every table id is distinct",
    new Set(tables.map((table) => table.id)).size === tables.length);
  check("game-ember-dice", "the ids run t1 through t30 in order",
    tables.every((table, index) => table.id === "t" + (index + 1)),
    tables.map((table) => table.id).join(","));
  const summitMissing = summitIds.filter((id) => !tables.some((table) => table.id === id));
  check("game-ember-dice", "the summit tier t25-t30 is present in order",
    summitMissing.length === 0 &&
      summitIds.every((id, index) => tables.findIndex((table) => table.id === id) >
        (index === 0 ? -1 : tables.findIndex((table) => table.id === summitIds[index - 1]))),
    summitMissing.join(",") || "ordered");
  tables.forEach((table) => {
    check("game-ember-dice", `${table.id} carries a legal rule`,
      table.target > 0 &&
      table.burn.length >= 1 &&
      table.burn.every((face) => face >= 1 && face <= 6) &&
      typeof table.tax === "number" &&
      (table.pairs === true || table.pairs === false),
      JSON.stringify(table));
  });

  /* The forge's answer, re-run here: value iteration over (turns, bank,
   * stake) is exact and rolls no dice, but the seeded swap keeps the run
   * deterministic wherever the booted app reaches for Math.random. */
  const diceSeeded = (seed, fn) => {
    const real = Math.random;
    let state = seed >>> 0;
    Math.random = () => {
      state = (Math.imul(state, 1103515245) + 12345) >>> 0;
      return state / 4294967296;
    };
    try { return fn(); } finally { Math.random = real; }
  };
  const measured = {};
  diceSeeded(41027, () => {
    tables.forEach((table) => {
      measured[table.id] = dice.measure(table);
    });
  });

  /* Bands: the shipped summit keeps the measure it shipped with, the deep
   * tier meets the same bar, and the summit tier is held to it too - a best
   * policy clears inside ten turns for at least 45% of runs, and the
   * three-star line (clear inside seven) is rare but real. */
  const shippedSummit = tables.filter((table) =>
    ["t17", "t18", "t19", "t20"].includes(table.id));
  const deepTier = tables.filter((table) =>
    ["t21", "t22", "t23", "t24"].includes(table.id));
  const summitTier = tables.filter((table) => summitIds.includes(table.id));
  const banded = (table) => {
    const m = measured[table.id];
    check("game-ember-dice", `${table.id} clears inside ten turns for a best policy`,
      m.clear >= 0.45, (m.clear * 100).toFixed(1) + "%");
    check("game-ember-dice", `${table.id} the three-star line is rare but real`,
      m.three >= 0.15 && m.three <= 0.5, (m.three * 100).toFixed(1) + "%");
  };
  shippedSummit.forEach(banded);
  deepTier.forEach(banded);
  summitTier.forEach(banded);

  /* The deep tier is the hard tier in the forge's own terms: each rung asks
   * more than the one it climbs from, and no shipped table pairs three burn
   * faces before the Last Ember - that felt is its own. */
  const byId = {};
  tables.forEach((table) => { byId[table.id] = table; });
  check("game-ember-dice", "the summit tier asks deeper than the rungs it climbs from",
    deepTier.length === 4 &&
    byId.t21.target > byId.t17.target &&
    byId.t22.target > byId.t20.target &&
    byId.t23.target > byId.t19.target,
    deepTier.map((t) => t.id + ":" + t.target).join(" "));
  check("game-ember-dice", "no shipped table pairs three burn faces - the last gate's felt is new",
    byId.t24.pairs === true && byId.t24.burn.length === 3 &&
    shippedSummit.every((table) => !(table.pairs && table.burn.length >= 3)),
    "t24 burn [" + byId.t24.burn.join(",") + "] dice 2");

  /* Every deep bounty is the smallest one the solver still measures inside
   * the shipped bands, so the edge is provable: one bounty stingier and the
   * table falls out - a starved three-star line or a sub-45% clear. */
  deepTier.forEach((table) => {
    const starved = dice.measure(Object.assign({}, table, { tax: table.tax + 2 }));
    check("game-ember-dice", `${table.id}: one bounty stingier and the table falls out of the bands`,
      starved.clear < 0.45 || starved.three < 0.15,
      "tax " + (table.tax + 2) + " clears " + (starved.clear * 100).toFixed(1) +
        "%, three-star " + (starved.three * 100).toFixed(1) + "%");
  });

  /* ---- the summit tier t25-t30: the felt is the dial ---- */
  /* Monotone in the solver's own currency: the three-star line falls rung
   * over rung down the summit tier, every rung under the Last Ember's, and
   * no rung's clear share dips under the shipped floor. */
  const summitProblems = [];
  let prevThree = measured.t24.three;
  summitTier.forEach((table) => {
    const m = measured[table.id];
    if (!(m.three < prevThree)) {
      summitProblems.push(table.id + " three-star line " + (m.three * 100).toFixed(1) +
        "% does not beat the rung before it (" + (prevThree * 100).toFixed(1) + "%)");
    }
    prevThree = m.three;
  });
  check("game-ember-dice",
    "the summit tier's three-star line falls rung over rung from the Last Ember's (" +
      summitTier.map((table) => table.id + " " + (measured[table.id].three * 100).toFixed(1) + "%")
        .join(", ") + " vs t24 " + (measured.t24.three * 100).toFixed(1) + "%)",
    summitProblems.length === 0, summitProblems.join(" | "));
  check("game-ember-dice", "Pyre Summit carries the deepest target in the room",
    byId.t27.target === 320 &&
    tables.every((table) => table.id === "t27" || table.target < byId.t27.target),
    tables.map((t) => t.target).sort((a, b) => b - a).slice(0, 3).join("/"));

  /* The first ladder never burned a felt without the 1; five of the six
   * summit rungs light exactly that - burn sets no shipped table combined. */
  const shallow = tables.filter((table) => !summitIds.includes(table.id));
  const skipsOne = summitTier.filter((table) => table.burn.indexOf(1) === -1).map((t) => t.id);
  check("game-ember-dice",
    "the first ladder never burns a felt without the 1 - the summit's felts are new",
    shallow.every((table) => table.burn.indexOf(1) !== -1) &&
      skipsOne.join(",") === "t25,t26,t28,t29,t30",
    "felts without a 1: " + skipsOne.join(","));

  /* Every summit bounty again sits on the starvation edge: one bounty
   * stingier and the table falls out of the bands. */
  summitTier.forEach((table) => {
    const starved = dice.measure(Object.assign({}, table, { tax: table.tax + 2 }));
    check("game-ember-dice", `${table.id}: one bounty stingier and the table falls out of the bands`,
      starved.clear < 0.45 || starved.three < 0.15,
      "tax " + (table.tax + 2) + " clears " + (starved.clear * 100).toFixed(1) +
        "%, three-star " + (starved.three * 100).toFixed(1) + "%");
  });

  /* The felt, not the bounty, is what the tier prices - the twins: the same
   * target and bounty on the classic felt the rung's family grew from, and
   * the solver measures the rung easier on both lines. t25's twin is the
   * Last Ember itself, t27's felt is the classic twin-ember pairs, so the
   * probe runs t28, t29 and t30. */
  const twinProblems = [];
  const feltTwin = (id, burn, pairs) =>
    dice.measure({ id: id + "-twin", target: byId[id].target, burn: burn, tax: byId[id].tax, pairs: pairs });
  [["t28", [1, 6]], ["t29", [1, 6]], ["t30", [1, 2, 6]]].forEach((pair) => {
    const id = pair[0];
    const twin = feltTwin(id, pair[1], byId[id].pairs);
    const m = measured[id];
    if (!(twin.clear > m.clear && twin.three > m.three)) {
      twinProblems.push(id + ": the classic felt measures " +
        (twin.clear * 100).toFixed(1) + "/" + (twin.three * 100).toFixed(1) +
        " against the rung's " + (m.clear * 100).toFixed(1) + "/" + (m.three * 100).toFixed(1));
    }
  });
  if (!(measured.t24.clear > measured.t25.clear && measured.t24.three > measured.t25.three)) {
    twinProblems.push("t25: the Last Ember's own felt measures " +
      (measured.t24.clear * 100).toFixed(1) + "/" + (measured.t24.three * 100).toFixed(1) +
      " against the Quiet One's " + (measured.t25.clear * 100).toFixed(1) + "/" +
      (measured.t25.three * 100).toFixed(1));
  }
  check("game-ember-dice",
    "the summit's burn sets are priced by twins: the classic felt at the same economy measures easier on both lines",
    twinProblems.length === 0, twinProblems.join(" | "));

  /* The tier's names travel with the module: both languages hold a real
   * string, t() never falls back to the raw key, and each rule line names
   * the target and bounty its table's fields carry. */
  deepTier.concat(summitTier).forEach((table) => {
    [table.labelKey, table.ruleKey].forEach((key) => {
      check("game-ember-dice", `${key} resolves in both languages`,
        App.I18N && App.I18N.en && App.I18N.en[key] && App.I18N.zh && App.I18N.zh[key] &&
        App.t(key) !== key, "a tier label fell back to its key");
    });
    /* the rule line renders exactly the way loadTable() renders it */
    const rule = App.t(table.ruleKey, { t: table.target });
    check("game-ember-dice", `${table.id}: the rule text names its own bounty and target`,
      rule.indexOf(String(table.target)) !== -1 && rule.indexOf(String(-table.tax)) !== -1,
      rule);
  });

  /* The unlock chain is derived, never stored, so it scales with the ladder:
   * clearing each table in order must hand the player exactly the next one,
   * all thirty times, with nothing left locked behind the last. */
  const chain = App.createCampaign({
    key: "ember-dice-gate-chain",
    levels: tables.map((table) => ({ id: table.id, labelKey: table.labelKey })),
  });
  let walked = 0;
  let chained = true;
  tables.forEach((table, index) => {
    const outcome = chain.record(table.id, { stars: 3, best: table.target, better: "high" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < tables.length ? tables[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-ember-dice", "the unlock chain walks all thirty tables in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
