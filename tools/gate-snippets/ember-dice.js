"use strict";

/* game-ember-dice: the summit tables are solved, not guessed, and the summit
 * tier is the hard tier
 *
 * The forge module carries the table's own rules in an exact solver: value
 * iteration over (turns left, bank, stake) under the best stopping policy,
 * so a table ships only when the solver measures it - a comfortable share of
 * runs clears inside the ten turns, and the three-star line (clear with
 * three turns spare) lands in the band the shipped tables occupy. This gate
 * re-measures the whole ladder through that same solver, then holds the
 * tiers to their design briefs: targets no earlier rung asked for, a burn
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
 * every rung probed.
 *
 * The fourth tier t31-t40 is the tier the felt built: the first thirty lit
 * every ember the room had (1, 2, 3 and 6, on one die and on two), so this
 * tier burns the faces the room never burned - the 4, the 5, the parity
 * splits, and the first four-ember felt - and charges the economy it never
 * charged, the house's tax at double the Tax Table's rate. Every rung takes
 * one structural record against every table before it, sits on its measured
 * starvation edge, and the tier's difficulty line is the descent: the
 * three-star share falls strictly rung over rung, 32.0 down to 15.7, one
 * point over the band floor the Ash Vault already reached - the floor is
 * why the tier cannot continue the summit's fall, and the gate pins that
 * boundary by holding the Ash Vault's line as the deepest in the ladder.
 * The four-ember pairs felt is measured too and cannot ship at any bounty,
 * so the fourth ember lives on the small felt alone. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const dice = require(path.join(root, "tools", "dice-forge.js"));
  const tables = dice.loadTables();
  const summitIds = ["t25", "t26", "t27", "t28", "t29", "t30"];
  const fourthIds = ["t31", "t32", "t33", "t34", "t35", "t36", "t37", "t38", "t39", "t40"];

  check("game-ember-dice", "the dice ladder holds forty tables",
    tables.length === 40, String(tables.length));
  check("game-ember-dice", "every table id is distinct",
    new Set(tables.map((table) => table.id)).size === tables.length);
  check("game-ember-dice", "the ids run t1 through t40 in order",
    tables.every((table, index) => table.id === "t" + (index + 1)),
    tables.map((table) => table.id).join(","));
  const summitMissing = summitIds.filter((id) => !tables.some((table) => table.id === id));
  check("game-ember-dice", "the summit tier t25-t30 is present in order",
    summitMissing.length === 0 &&
      summitIds.every((id, index) => tables.findIndex((table) => table.id === id) >
        (index === 0 ? -1 : tables.findIndex((table) => table.id === summitIds[index - 1]))),
    summitMissing.join(",") || "ordered");
  const fourthMissing = fourthIds.filter((id) => !tables.some((table) => table.id === id));
  check("game-ember-dice", "the fourth tier t31-t40 is present in order",
    fourthMissing.length === 0 &&
      fourthIds.every((id, index) => tables.findIndex((table) => table.id === id) >
        (index === 0 ? -1 : tables.findIndex((table) => table.id === fourthIds[index - 1]))),
    fourthMissing.join(",") || "ordered");
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
   * tier meets the same bar, and the summit and fourth tiers are held to it
   * too - a best policy clears inside ten turns for at least 45% of runs,
   * and the three-star line (clear inside seven) is rare but real. */
  const shippedSummit = tables.filter((table) =>
    ["t17", "t18", "t19", "t20"].includes(table.id));
  const deepTier = tables.filter((table) =>
    ["t21", "t22", "t23", "t24"].includes(table.id));
  const summitTier = tables.filter((table) => summitIds.includes(table.id));
  const fourthTier = tables.filter((table) => fourthIds.includes(table.id));
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
  fourthTier.forEach(banded);

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
  const starved = (table) => {
    const m = dice.measure(Object.assign({}, table, { tax: table.tax + 2 }));
    check("game-ember-dice", `${table.id}: one bounty stingier and the table falls out of the bands`,
      m.clear < 0.45 || m.three < 0.15,
      "tax " + (table.tax + 2) + " clears " + (m.clear * 100).toFixed(1) +
        "%, three-star " + (m.three * 100).toFixed(1) + "%");
  };
  deepTier.forEach(starved);

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
  /* The claim belongs to the thirty-rung corner it was measured against:
   * the fourth tier legitimately asks a deeper target (t35), so the law is
   * scoped to the ladder the summit tier shipped into. */
  const first30 = tables.slice(0, 30);
  check("game-ember-dice", "Pyre Summit carries the deepest target of the first thirty tables",
    byId.t27.target === 320 &&
    first30.every((table) => table.id === "t27" || table.target < byId.t27.target),
    first30.map((t) => t.target).sort((a, b) => b - a).slice(0, 3).join("/"));

  /* The first ladder never burned a felt without the 1; the summit and the
   * fourth tier light exactly those - burn sets no earlier rung combined. */
  const shallow = tables.filter((table) =>
    !summitIds.includes(table.id) && !fourthIds.includes(table.id));
  const skipsOne = summitTier.concat(fourthTier)
    .filter((table) => table.burn.indexOf(1) === -1).map((t) => t.id);
  check("game-ember-dice",
    "the first ladder never burns a felt without the 1 - the later tiers' felts are new",
    shallow.every((table) => table.burn.indexOf(1) !== -1) &&
      skipsOne.join(",") === "t25,t26,t28,t29,t30,t34,t36,t40",
    "felts without a 1: " + skipsOne.join(","));

  /* Every summit bounty again sits on the starvation edge: one bounty
   * stingier and the table falls out of the bands. */
  summitTier.forEach(starved);

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

  /* ---- the fourth tier t31-t40: the tier the felt built ---- */
  /* One record per rung against every table before it, every rung on its
   * measured starvation edge, and the tier's difficulty line is the
   * descent - the three-star share falls strictly rung over rung. The
   * records are scoped by position: later tiers legitimately overtake
   * earlier ones. */
  const posOf = (id) => tables.findIndex((table) => table.id === id);
  const before = (id) => tables.slice(0, posOf(id));
  const peak = (list, read) => Math.max.apply(null, list.map(read));

  check("game-ember-dice", "the fourth tier is present",
    fourthTier.length === 10, fourthTier.map((table) => table.id).join(","));
  check("game-ember-dice",
    "no two rungs of the ladder share a felt at the same economy",
    new Set(tables.map((table) =>
      JSON.stringify([table.target, table.burn, table.tax, table.pairs]))).size === tables.length,
    "duplicate specs: " + tables.filter((table, index) =>
      tables.findIndex((other) =>
        JSON.stringify([other.target, other.burn, other.tax, other.pairs]) ===
        JSON.stringify([table.target, table.burn, table.tax, table.pairs])) !== index)
      .map((table) => table.id).join(","));
  fourthTier.forEach(starved);

  /* The descent: 32.0, 27.5, 25.1, 24.3, 19.6, 19.4, 17.4, 17.3, 16.9,
   * 15.7 - and the boundary pin. The summit tier walked its line down to
   * the 15% band floor and The Ash Vault shipped on it, so the fourth tier
   * cannot continue the fall; it opens at the top of its own descent
   * instead, and the Ash Vault's line stays the deepest in the ladder. */
  const fourthProblems = [];
  let tierPrev = Infinity;
  fourthTier.forEach((table) => {
    const m = measured[table.id];
    if (!(m.three < tierPrev)) {
      fourthProblems.push(table.id + " three-star line " + (m.three * 100).toFixed(1) +
        "% does not beat the rung before it (" + (tierPrev * 100).toFixed(1) + "%)");
    }
    tierPrev = m.three;
  });
  check("game-ember-dice",
    "the fourth tier's three-star line falls rung over rung (" +
      fourthTier.map((table) => table.id + " " + (measured[table.id].three * 100).toFixed(1) + "%")
        .join(", ") + ")",
    fourthProblems.length === 0, fourthProblems.join(" | "));
  const ladderMinThree = Math.min.apply(null, tables.map((table) => measured[table.id].three));
  check("game-ember-dice",
    "the boundary pin: the Ash Vault owns the deepest line in the ladder, so the fourth tier opens at the top of its own descent",
    ladderMinThree === measured.t30.three && measured.t31.three > measured.t30.three,
    "t30 " + (measured.t30.three * 100).toFixed(1) + "% vs t31 " +
      (measured.t31.three * 100).toFixed(1) + "%, ladder min " +
      (ladderMinThree * 100).toFixed(1) + "%");

  /* The records, measured through the forge and scoped by position. */
  check("game-ember-dice",
    "t31 lights the first four-ember felt - half the die burns, past every three-face felt before it",
    byId.t31.burn.length === 4 && before("t31").every((table) => table.burn.length < 4),
    "previous peak " + peak(before("t31"), (table) => table.burn.length) + " burn faces");
  check("game-ember-dice",
    "t32 brings the house's tax back for the first time since the Tax Table, at double its rate",
    byId.t32.tax === 10 &&
    before("t32").every((table) => table.tax <= 0 || table.id === "t3") &&
    before("t32").every((table) => table.id === "t3" || table.tax < byId.t32.tax),
    "positive taxes before: " + before("t32").filter((table) => table.tax > 0)
      .map((table) => table.id + ":" + table.tax).join(","));
  check("game-ember-dice",
    "t32's tithe lands on a target no taxed table has carried",
    before("t32").every((table) => table.tax <= 0 || table.target !== byId.t32.target),
    "taxed targets before: " + before("t32").filter((table) => table.tax > 0)
      .map((table) => table.target).join(","));
  check("game-ember-dice",
    "t33 pairs the low embers - the first three-ember pairs felt that never lights the 6",
    byId.t33.pairs && byId.t33.burn.length === 3 && byId.t33.burn.indexOf(6) === -1 &&
    before("t33").every((table) =>
      !(table.pairs && table.burn.length >= 3 && table.burn.indexOf(6) === -1)),
    "three-ember pairs before: " + before("t33").filter((table) =>
      table.pairs && table.burn.length >= 3)
      .map((table) => table.id + "[" + table.burn.join(",") + "]").join(" "));
  check("game-ember-dice",
    "t34 burns the first 4 anywhere in the room and pays the deepest bounty the ladder has printed, 132 past the Last Ember's 111",
    byId.t34.burn.indexOf(4) !== -1 &&
    before("t34").every((table) => table.burn.indexOf(4) === -1) &&
    -byId.t34.tax === 132 && before("t34").every((table) => -table.tax < 132),
    "previous peaks: bounty " + peak(before("t34"), (table) => -table.tax));
  check("game-ember-dice",
    "t35 takes the twin-ember pairs to 340, the deepest target the room has carried",
    byId.t35.target === 340 && before("t35").every((table) => table.target < 340),
    "previous peak " + peak(before("t35"), (table) => table.target));
  check("game-ember-dice",
    "t35's invariance pin: at the starvation edge 340 prints Pyre Summit's own two lines, so the target is still not the dial",
    measured.t35.clear.toFixed(1) === measured.t27.clear.toFixed(1) &&
    measured.t35.three.toFixed(1) === measured.t27.three.toFixed(1),
    "t27 " + (measured.t27.clear * 100).toFixed(1) + "/" + (measured.t27.three * 100).toFixed(1) +
      " vs t35 " + (measured.t35.clear * 100).toFixed(1) + "/" + (measured.t35.three * 100).toFixed(1));
  check("game-ember-dice",
    "t36 burns the first 5 the room has ever lit, on a felt whose embers hold neither the 1 nor the 6",
    byId.t36.burn.indexOf(5) !== -1 &&
    before("t36").every((table) => table.burn.indexOf(5) === -1) &&
    byId.t36.burn.indexOf(1) === -1 && byId.t36.burn.indexOf(6) === -1 &&
    before("t36").every((table) =>
      table.burn.indexOf(1) !== -1 || table.burn.indexOf(6) !== -1),
    "previous felts with a 5: " + before("t36").filter((table) =>
      table.burn.indexOf(5) !== -1).length);
  check("game-ember-dice",
    "t37 is the thinnest bounty past the calibration tier - 5 embers where every earlier bounty rung asked at least 12",
    -byId.t37.tax === 5 &&
    before("t37").every((table) => table.tax >= 0 || -table.tax > 5),
    "previous peak bounty " + peak(before("t37").filter((table) => table.tax < 0),
      (table) => -table.tax));
  check("game-ember-dice",
    "t38 burns every odd face on the die - the first felt split down parity, only the evens paying",
    [1, 3, 5].every((face) => byId.t38.burn.indexOf(face) !== -1) &&
    before("t38").every((table) =>
      [1, 3, 5].some((face) => table.burn.indexOf(face) === -1)),
    "previous all-odd felts: " + before("t38").filter((table) =>
      [1, 3, 5].every((face) => table.burn.indexOf(face) !== -1)).length);
  check("game-ember-dice",
    "t39 burns the low half and pays the high half - on the small felt, the first three-ember felt where every face that pays outrolls every face that burns",
    byId.t39.pairs === false && byId.t39.burn.length === 3 &&
    Math.min.apply(null, [1, 2, 3, 4, 5, 6].filter((face) =>
      byId.t39.burn.indexOf(face) === -1)) > Math.max.apply(null, byId.t39.burn) &&
    before("t39").filter((table) => table.pairs === false && table.burn.length >= 3)
      .every((table) =>
        Math.min.apply(null, [1, 2, 3, 4, 5, 6].filter((face) =>
          table.burn.indexOf(face) === -1)) <= Math.max.apply(null, table.burn)),
    "one-die three-ember felts before: " + before("t39")
      .filter((table) => table.pairs === false && table.burn.length >= 3)
      .map((table) => {
        const pay = [1, 2, 3, 4, 5, 6].filter((face) => table.burn.indexOf(face) === -1);
        return table.id + ":pay" + Math.min.apply(null, pay) + "/burn" +
          Math.max.apply(null, table.burn);
      }).join(" "));
  check("game-ember-dice",
    "t40 mirrors the parity split on the small felt - the first one-die felt that burns every even face, only the odds paying",
    byId.t40.pairs === false &&
    [2, 4, 6].every((face) => byId.t40.burn.indexOf(face) !== -1) &&
    before("t40").filter((table) => table.pairs === false)
      .every((table) => [2, 4, 6].some((face) => table.burn.indexOf(face) === -1)),
    "one-die all-even felts before: " + before("t40")
      .filter((table) => table.pairs === false &&
        [2, 4, 6].every((face) => table.burn.indexOf(face) !== -1)).length);
  check("game-ember-dice",
    "the four-ember pairs felt cannot ship at any bounty: one bank busts the three-star ceiling, two banks bust the clear floor",
    dice.measure({ id: "probe-1bank", target: 40, burn: [1, 2, 3, 6], tax: -35, pairs: true }).three > 0.5 &&
    dice.measure({ id: "probe-2bank", target: 60, burn: [1, 2, 3, 6], tax: -45, pairs: true }).clear < 0.45,
    "one bank " + (dice.measure({ id: "probe-1bank", target: 40, burn: [1, 2, 3, 6], tax: -35, pairs: true }).three * 100).toFixed(1) +
      "% three-star, two banks " +
      (dice.measure({ id: "probe-2bank", target: 60, burn: [1, 2, 3, 6], tax: -45, pairs: true }).clear * 100).toFixed(1) + "% clear");

  /* The tier's names travel with the module: both languages hold a real
   * string, t() never falls back to the raw key, and each rule line names
   * the target and bounty its table's fields carry. */
  deepTier.concat(summitTier, fourthTier).forEach((table) => {
    [table.labelKey, table.ruleKey].forEach((key) => {
      check("game-ember-dice", `${key} resolves in both languages`,
        App.I18N && App.I18N.en && App.I18N.en[key] && App.I18N.zh && App.I18N.zh[key] &&
        App.t(key) !== key, "a tier label fell back to its key");
    });
    /* the rule line renders exactly the way loadTable() renders it */
    const rule = App.t(table.ruleKey, { t: table.target });
    check("game-ember-dice", `${table.id}: the rule text names its own bounty and target`,
      rule.indexOf(String(table.target)) !== -1 &&
      rule.indexOf(String(Math.abs(table.tax))) !== -1,
      rule);
  });

  /* The unlock chain is derived, never stored, so it scales with the ladder:
   * clearing each table in order must hand the player exactly the next one,
   * all forty times, with nothing left locked behind the last. */
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
  check("game-ember-dice", "the unlock chain walks all forty tables in order",
    walked === 40 && chained && chain.clearedCount() === 40, walked + " first clears");
};
