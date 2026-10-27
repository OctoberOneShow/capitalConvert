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
 * the forge can re-measure one bounty stingier. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const dice = require(path.join(root, "tools", "dice-forge.js"));
  const tables = dice.loadTables();

  check("game-ember-dice", "the dice ladder holds twenty-four tables",
    tables.length === 24, String(tables.length));
  check("game-ember-dice", "every table id is distinct",
    new Set(tables.map((table) => table.id)).size === tables.length);
  check("game-ember-dice", "the ids run t1 through t24 in order",
    tables.every((table, index) => table.id === "t" + (index + 1)),
    tables.map((table) => table.id).join(","));
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

  /* Bands: the shipped summit keeps the measure it shipped with, and the
   * summit tier meets the same bar - a best policy clears inside ten turns
   * for at least 45% of runs, and the three-star line (clear inside seven)
   * is rare but real. */
  const shippedSummit = tables.filter((table) =>
    ["t17", "t18", "t19", "t20"].includes(table.id));
  const deepTier = tables.filter((table) =>
    ["t21", "t22", "t23", "t24"].includes(table.id));
  const banded = (table) => {
    const m = measured[table.id];
    check("game-ember-dice", `${table.id} clears inside ten turns for a best policy`,
      m.clear >= 0.45, (m.clear * 100).toFixed(1) + "%");
    check("game-ember-dice", `${table.id} the three-star line is rare but real`,
      m.three >= 0.15 && m.three <= 0.5, (m.three * 100).toFixed(1) + "%");
  };
  shippedSummit.forEach(banded);
  deepTier.forEach(banded);

  /* The tier is the hard tier in the forge's own terms: each rung asks more
   * than the one it climbs from, the cold pairs rung carries the deepest
   * target in the room, and no shipped table pairs three burn faces - the
   * last gate's felt, where three of every four rolls burn. */
  const byId = {};
  tables.forEach((table) => { byId[table.id] = table; });
  check("game-ember-dice", "the summit tier asks deeper than the rungs it climbs from",
    deepTier.length === 4 &&
    byId.t21.target > byId.t17.target &&
    byId.t22.target > byId.t20.target &&
    byId.t23.target > byId.t19.target,
    deepTier.map((t) => t.id + ":" + t.target).join(" "));
  check("game-ember-dice", "the cold pairs rung carries the deepest target in the room",
    byId.t22.target === 300 &&
    tables.every((table) => table.id === "t22" || table.target < byId.t22.target),
    tables.map((t) => t.target).sort((a, b) => b - a).slice(0, 3).join("/"));
  check("game-ember-dice", "no shipped table pairs three burn faces - the last gate's felt is new",
    byId.t24.pairs === true && byId.t24.burn.length === 3 &&
    shippedSummit.every((table) => !(table.pairs && table.burn.length >= 3)),
    "t24 burn [" + byId.t24.burn.join(",") + "] dice 2");

  /* Every summit bounty is the smallest one the solver still measures inside
   * the shipped bands, so the edge is provable: one bounty stingier and the
   * table falls out - a starved three-star line or a sub-45% clear. */
  deepTier.forEach((table) => {
    const starved = dice.measure(Object.assign({}, table, { tax: table.tax + 2 }));
    check("game-ember-dice", `${table.id}: one bounty stingier and the table falls out of the bands`,
      starved.clear < 0.45 || starved.three < 0.15,
      "tax " + (table.tax + 2) + " clears " + (starved.clear * 100).toFixed(1) +
        "%, three-star " + (starved.three * 100).toFixed(1) + "%");
  });

  /* The tier's names travel with the module: both languages hold a real
   * string, t() never falls back to the raw key, and each rule line names
   * the target and bounty its table's fields carry. */
  deepTier.forEach((table) => {
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
   * all twenty-four times, with nothing left locked behind the last. */
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
  check("game-ember-dice", "the unlock chain walks all twenty-four tables in order",
    walked === 24 && chained && chain.clearedCount() === 24, walked + " first clears");
};
