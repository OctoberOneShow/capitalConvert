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
 * so the fourth ember lives on the small felt alone. (Correction, sixth
 * tier: the two probes were honest but the gap between them was not empty
 * - the knife-edge at the 48 felt ships all three four-ember pairs felts
 * in a bounty one window wide. The gate below now pins the window.)
 *
 * The fifth tier t41-t44 is the famine walk. The old dial is spent - the
 * bands have no room under their own 15% floor - so the famine spends the
 * solver's OTHER line: the share of best-policy runs that clear at all.
 * Every rung takes paying pips away from the felt rung over rung (survival
 * 18, 12, 9, 6 in thirty-six - the last gate leaves the die one live pip,
 * the ace, the loneliest felt the room has run), and the clear share
 * descends strictly rung over rung under the Even Embers' capstone: 53.10,
 * 50.61, 47.05, 45.73 against t40's 53.84, the first tier past the capstone
 * on the clear share. The gate holds the walk structurally (no earlier
 * table ever ran these felts), measured (the pinned descent, the climbing
 * three-star lines, the Ash Vault still owning the deepest line), at the
 * edge (one bounty stingier - a single point - and every rung falls out),
 * by mutation (give each famine felt its pips back at the same economy and
 * the descent collapses above the capstone - the walk, not the economy, is
 * what the difficulty is made of), and at the stars (the solver's line
 * three-stars every rung, and a dawdling hand that banks every live roll
 * still lands the clear exactly on the tenth turn - the engine's one-star
 * run - on every one of them).
 *
 * The sixth tier t45-t50 is the last deal. It opens by breaking the wall:
 * the four-ember pairs felt the fourth tier measured and rejected ships in
 * a bounty one window wide at the 48 felt, where the first bank needs the
 * felt's top two sums - 55.94% clear and a 41.89% line at the 39 bounty,
 * with 38 under the floor and 40 over the ceiling, the only two-sided edge
 * in the ladder. All three four-ember felts land that same table in their
 * own windows, so the gate pins the window three ways. The rest of the
 * deal is the unlit pairs at the 200 felt, each on the smallest bounty
 * that holds it in band, and the tier's line is the descent: 22.70, 19.37,
 * 17.20, 16.22, 15.20, strictly rung over rung, the closing rung a fifth
 * of a point over the Ash Vault's floor and the deepest line the ladder
 * has printed since. The gate holds the records (the mirror twins, the
 * highest paying pip, the parity split, the spared five, the ace-to-six
 * spread), the edges (one stingier falls out on every rung), the pins
 * (the mirror's invariance across the 120, 200 and 240 felts, the Last
 * Deal's bank-quantum sawtooth), and the dial (at each rung's economy a
 * shipped cousin measures a different table on both lines - the felt, not
 * the target, is what the tier prices). */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const dice = require(path.join(root, "tools", "dice-forge.js"));
  const tables = dice.loadTables();
  const summitIds = ["t25", "t26", "t27", "t28", "t29", "t30"];
  const fourthIds = ["t31", "t32", "t33", "t34", "t35", "t36", "t37", "t38", "t39", "t40"];
  const famineIds = ["t41", "t42", "t43", "t44"];
  const dealIds = ["t45", "t46", "t47", "t48", "t49", "t50"];

  check("game-ember-dice", "the dice ladder holds fifty tables",
    tables.length === 50, String(tables.length));
  check("game-ember-dice", "every table id is distinct",
    new Set(tables.map((table) => table.id)).size === tables.length);
  check("game-ember-dice", "the ids run t1 through t50 in order",
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
  const famineMissing = famineIds.filter((id) => !tables.some((table) => table.id === id));
  check("game-ember-dice", "the famine tier t41-t44 is present in order",
    famineMissing.length === 0 &&
      famineIds.every((id, index) => tables.findIndex((table) => table.id === id) >
        (index === 0 ? -1 : tables.findIndex((table) => table.id === famineIds[index - 1]))),
    famineMissing.join(",") || "ordered");
  const dealMissing = dealIds.filter((id) => !tables.some((table) => table.id === id));
  check("game-ember-dice", "the last-deal tier t45-t50 is present in order",
    dealMissing.length === 0 &&
      dealIds.every((id, index) => tables.findIndex((table) => table.id === id) >
        (index === 0 ? -1 : tables.findIndex((table) => table.id === dealIds[index - 1]))),
    dealMissing.join(",") || "ordered");
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
  const famineTier = tables.filter((table) => famineIds.includes(table.id));
  const dealTier = tables.filter((table) => dealIds.includes(table.id));
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
  famineTier.forEach(banded);
  dealTier.forEach(banded);

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

  /* The first ladder never burned a felt without the 1; the summit, the
   * fourth tier, the famine and the last deal light exactly those - burn
   * sets no earlier rung combined. The famine never lights the 1 either:
   * the 1 is the pip its felts pay. The last deal splits - the Broken Wall
   * and the Odd Twins light the 1 again, the rest of the deal keeps it
   * paying. */
  const shallow = tables.filter((table) =>
    !summitIds.includes(table.id) && !fourthIds.includes(table.id) &&
    !famineIds.includes(table.id) && !dealIds.includes(table.id));
  const skipsOne = summitTier.concat(fourthTier, famineTier, dealTier)
    .filter((table) => table.burn.indexOf(1) === -1).map((t) => t.id);
  check("game-ember-dice",
    "the first ladder never burns a felt without the 1 - the later tiers' felts are new",
    shallow.every((table) => table.burn.indexOf(1) !== -1) &&
      skipsOne.join(",") === "t25,t26,t28,t29,t30,t34,t36,t40,t41,t42,t43,t44,t46,t47,t49,t50",
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
  /* The fourth tier's wall, corrected by the sixth: the two probes here
   * were honest - the one-bank target rides the ceiling, the two-bank
   * target busts the floor - but the knife-edge between them ships the
   * felt. The sixth tier deals it as t45, and the block below pins the
   * window three ways. */
  check("game-ember-dice",
    "the fourth tier's wall probes were honest: a one-bank target rides the three-star ceiling, a two-bank target busts the clear floor",
    dice.measure({ id: "probe-1bank", target: 40, burn: [1, 2, 3, 6], tax: -35, pairs: true }).three > 0.5 &&
    dice.measure({ id: "probe-2bank", target: 60, burn: [1, 2, 3, 6], tax: -45, pairs: true }).clear < 0.45,
    "one bank " + (dice.measure({ id: "probe-1bank", target: 40, burn: [1, 2, 3, 6], tax: -35, pairs: true }).three * 100).toFixed(1) +
      "% three-star, two banks " +
      (dice.measure({ id: "probe-2bank", target: 60, burn: [1, 2, 3, 6], tax: -45, pairs: true }).clear * 100).toFixed(1) + "% clear");

  /* ---- the famine tier t41-t44: the walk that takes the paying pips away ---- */
  /* The summit and the fourth tier walked the three-star line down to the
   * Ash Vault's 15.0 and the bands have no room under their own floor, so
   * the famine spends the solver's other line - the share of best-policy
   * runs that clear at all - and it descends strictly rung over rung under
   * the Even Embers' capstone while the three-star lines climb in band.
   * Both lines are pinned: the solver is exact, so a famine rung cannot
   * quietly change without re-proving the walk. */
  const famineLadder = famineIds.map((id) => (measured[id].clear * 100).toFixed(2));
  check("game-ember-dice",
    "the famine's clear share falls strictly rung over rung under the Even Embers' capstone" +
      " (53.10 -> 50.61 -> 47.05 -> 45.73 against t40's " +
      (measured.t40.clear * 100).toFixed(2) + ") - the first tier past the capstone on the clear share",
    JSON.stringify(famineLadder) === JSON.stringify(["53.10", "50.61", "47.05", "45.73"]) &&
      famineIds.every((id) => measured[id].clear < measured.t40.clear),
    famineLadder.join(" -> ") + " vs t40 " + (measured.t40.clear * 100).toFixed(2));
  const famineThrees = famineIds.map((id) => (measured[id].three * 100).toFixed(2));
  check("game-ember-dice",
    "the famine does not spend the three-star line: the threes climb in band as the clear share falls" +
      " (15.26 -> 23.23 -> 24.70 -> 26.32)",
    JSON.stringify(famineThrees) === JSON.stringify(["15.26", "23.23", "24.70", "26.32"]) &&
      famineThrees.every((value, index) => index === 0 || Number(value) > Number(famineThrees[index - 1])),
    famineThrees.join(" -> "));

  /* The walk, held structurally: the felt survives a roll 18, 12, 9, 6
   * times in thirty-six - strictly scarcer every rung - and no table before
   * the famine ever ran a felt this scarce (the Last Ember and the Quiet
   * One, at nine, were the floor until now). */
  const survival36 = (table) =>
    table.pairs ? Math.pow(6 - table.burn.length, 2) : (6 - table.burn.length) * 6;
  const famineSurvival = famineIds.map((id) => survival36(byId[id]));
  const beforeFamine = tables.filter((table) =>
    !famineIds.includes(table.id) && !dealIds.includes(table.id));
  check("game-ember-dice",
    "the famine walk survives strictly scarcer rungs: 18 -> 12 -> 9 -> 6 surviving rolls in thirty-six," +
      " and no earlier table ever ran a felt that scarce",
    JSON.stringify(famineSurvival) === JSON.stringify([18, 12, 9, 6]) &&
      beforeFamine.every((table) => survival36(table) > 6),
    famineSurvival.join(" -> ") + ", earlier min " +
      Math.min.apply(null, beforeFamine.map((table) => survival36(table))));

  /* The records, one per rung against every table before it. */
  const payFaces = (table) =>
    [1, 2, 3, 4, 5, 6].filter((face) => table.burn.indexOf(face) === -1);
  const splitAgainst = (table) =>
    payFaces(table).length > 0 &&
      Math.min.apply(null, table.burn) > Math.max.apply(null, payFaces(table));
  check("game-ember-dice",
    "t41 splits the small felt down the half - every face that burns (4, 5, 6) outrolls every face that pays (1, 2, 3)," +
      " the Low Embers' law run the other way - and no earlier table split a felt that direction",
    splitAgainst(byId.t41) && byId.t41.pairs === false &&
      beforeFamine.every((table) => !splitAgainst(table)),
    "earlier splits: " + beforeFamine.filter((table) => splitAgainst(table))
      .map((table) => table.id).join(","));
  check("game-ember-dice",
    "t42 burns every face above the deuce - the lowest-paying purse any felt has carried -" +
      " and no earlier table lit the 3, the 4, the 5 and the 6 together",
    [3, 4, 5, 6].every((face) => byId.t42.burn.indexOf(face) !== -1) &&
      beforeFamine.every((table) =>
        [3, 4, 5, 6].some((face) => table.burn.indexOf(face) === -1)),
    "earlier high-half felts: " + beforeFamine.filter((table) =>
      [3, 4, 5, 6].every((face) => table.burn.indexOf(face) !== -1))
      .map((table) => table.id).join(","));
  check("game-ember-dice",
    "t43 carries the split to the twins - the first pairs felt where both dice must land under 4",
    byId.t43.pairs === true && splitAgainst(byId.t43) &&
      beforeFamine.every((table) => !(table.pairs && splitAgainst(table))),
    "earlier pairs splits: " + beforeFamine.filter((table) =>
      table.pairs && splitAgainst(table)).map((table) => table.id).join(","));
  check("game-ember-dice",
    "t44 leaves the die one live pip - five of the six faces burn, past the Fourth Ember's four -" +
      " on the smallest target the room has printed, under the Long Table's 40",
    byId.t44.burn.length === 5 &&
      beforeFamine.every((table) => table.burn.length < 5) &&
      beforeFamine.every((table) => table.target > byId.t44.target),
    "earlier peaks: burn " + Math.max.apply(null, beforeFamine.map((table) => table.burn.length)) +
      " faces, target " + Math.min.apply(null, beforeFamine.map((table) => table.target)));

  /* The edge, tighter than the shipped tiers': one bounty stingier - a
   * single point - and every famine rung falls out of the bands; two points
   * and it is buried. */
  const famineEdge = {};
  const famineBuried = {};
  const famineMutants = {};
  diceSeeded(41027, () => {
    famineIds.forEach((id) => {
      famineEdge[id] = dice.measure(Object.assign({}, byId[id], { tax: byId[id].tax + 1 }));
      famineBuried[id] = dice.measure(Object.assign({}, byId[id], { tax: byId[id].tax + 2 }));
      famineMutants[id] = dice.measure(Object.assign({}, byId[id], { burn: [6] }));
    });
  });
  famineIds.forEach((id) => {
    const edge = famineEdge[id];
    const buried = famineBuried[id];
    check("game-ember-dice",
      `${id}: one bounty stingier - a single point - and the rung falls out of the bands` +
        ` (${(edge.clear * 100).toFixed(1)} clear / ${(edge.three * 100).toFixed(1)} line),` +
        " two points and it is buried",
      (edge.clear < 0.45 || edge.three < 0.15) &&
        (buried.clear < 0.45 || buried.three < 0.15),
      "tax " + (byId[id].tax + 1) + ": " + (edge.clear * 100).toFixed(1) + "/" +
        (edge.three * 100).toFixed(1) + ", tax " + (byId[id].tax + 2) + ": " +
        (buried.clear * 100).toFixed(1) + "/" + (buried.three * 100).toFixed(1));
  });

  /* The walk is what the difficulty is made of, not the economy: cut the
   * famine out of a mutated copy - give each felt its pips back, one burn
   * face (the 6) at the same target and bounty - and every rung's clear
   * share jumps back over the capstone. The tier's own law, applied to the
   * mutants, fails on both counts: no rung under the capstone, no descent. */
  const mutantMeasures = famineIds.map((id) => famineMutants[id]);
  const underCapstone = mutantMeasures.every((m) => m.clear < measured.t40.clear);
  const stillDescends = mutantMeasures.every((m, index) =>
    index === 0 || m.clear < mutantMeasures[index - 1].clear);
  check("game-ember-dice",
    "not decorative: give every famine felt its pips back - one burn face, the 6, at the same economy -" +
      " and every rung's clear share jumps back over the capstone (" +
      mutantMeasures.map((m) => (m.clear * 100).toFixed(1)).join(", ") +
      " against t40's " + (measured.t40.clear * 100).toFixed(1) + "), the walk's descent collapsed",
    !underCapstone && !stillDescends,
    JSON.stringify(mutantMeasures.map((m) => m.clear.toFixed(2))));

  /* The one-star line is real the honest way. The solver prices round zero
   * flat, so its lines never see a clear that lands on the tenth turn - the
   * run the engine stars at one - and a famine clear is so scarce that the
   * bands alone cannot swear the last star exists. This walk prices it
   * exactly: a dawdling hand that banks every live roll, and its cousins at
   * every lazier bank threshold, one roll a turn; some dawdling line clears
   * exactly on the tenth turn on every famine rung. */
  const dawdleTurn10 = (spec) => {
    const bounty = -spec.tax;
    const denom = spec.pairs ? 36 : 6;
    const rolls = [];
    if (spec.pairs) {
      for (let a = 1; a <= 6; a += 1) {
        for (let b = 1; b <= 6; b += 1) {
          if (spec.burn.indexOf(a) === -1 && spec.burn.indexOf(b) === -1) {
            rolls.push([a + b, 1 / 36]);
          }
        }
      }
    } else {
      for (let a = 1; a <= 6; a += 1) {
        if (spec.burn.indexOf(a) === -1) rolls.push([a, 1 / 6]);
      }
    }
    if (!rolls.length) return 0;
    const pBurn = 1 - rolls.reduce((sum, roll) => sum + roll[1], 0);
    let best = 0;
    for (let theta = 1; theta <= spec.target; theta += 1) {
      const memo = new Map();
      const clear10 = (turn, stake, bank) => {
        if (turn > 10) return 0;
        const key = turn * 100000 + stake * 1000 + bank;
        const hit = memo.get(key);
        if (hit !== undefined) return hit;
        let p = pBurn * clear10(turn + 1, 0, bank);
        rolls.forEach((roll) => {
          const ns = stake + roll[0];
          if (ns >= theta) {
            const nb = bank + ns + bounty;
            if (nb >= spec.target) {
              if (turn === 10) p += roll[1];
            } else {
              p += roll[1] * clear10(turn + 1, 0, nb);
            }
          } else {
            p += roll[1] * clear10(turn + 1, ns, bank);
          }
        });
        memo.set(key, p);
        return p;
      };
      const p = clear10(1, 0, 0);
      if (p > best) best = p;
    }
    return best;
  };
  const dawdleShare = {};
  const dawdleProblems = [];
  famineIds.forEach((id) => {
    const share = dawdleTurn10(byId[id]);
    dawdleShare[id] = share;
    if (!(share > 0)) {
      dawdleProblems.push(id + ": no dawdling line lands the clear on the tenth turn");
    }
  });
  check("game-ember-dice",
    "the one-star line is real: a dawdling hand that banks every live roll still clears exactly on the tenth turn" +
      " on every famine rung (" +
      famineIds.map((id) => id + " " + (dawdleShare[id] * 100).toFixed(1) + "%").join(", ") + ")," +
      " while the solver's own line three-stars every rung",
    dawdleProblems.length === 0,
    dawdleProblems.join(" | "));

  /* ---- the last deal t45-t50: the wall falls, then the unlit pairs ---- */
  /* The opener is the four-ember pairs felt the fourth tier measured and
   * rejected, landed in its one-bounty window at the 48 felt. The rest of
   * the deal is the unlit pairs at the 200 felt. The line descends 41.89,
   * 22.70, 19.37, 17.20, 16.22, 15.20 - strictly, the closing rung the
   * deepest since the Ash Vault - and the famine's records keep: no rung
   * here runs a felt scarcer than six surviving rolls in thirty-six. */
  const dealLadder = dealIds.map((id) => (measured[id].three * 100).toFixed(2));
  check("game-ember-dice",
    "the last deal's three-star line falls strictly rung over rung (41.89 -> 22.70 -> 19.37 -> 17.20 -> 16.22 -> 15.20)," +
      " the closing rung a fifth of a point over the Ash Vault's " +
      (measured.t30.three * 100).toFixed(2),
    JSON.stringify(dealLadder) === JSON.stringify(["41.89", "22.70", "19.37", "17.20", "16.22", "15.20"]) &&
      dealIds.every((id) => measured[id].three > measured.t30.three),
    dealLadder.join(" -> ") + " vs t30 " + (measured.t30.three * 100).toFixed(2));
  const dealSurvival = dealIds.map((id) => survival36(byId[id]));
  check("game-ember-dice",
    "the last deal runs the scarce end too: the Broken Wall's felt survives 4 rolls in thirty-six - the scarcity the fourth tier measured - and every other rung keeps nine or more",
    dealSurvival[0] === 4 && dealSurvival.slice(1).every((survivors) => survivors >= 9),
    dealSurvival.join(", "));
  check("game-ember-dice",
    "t45 breaks the wall - the first four-ember pairs felt, the felt the fourth tier measured and rejected",
    byId.t45.pairs === true && byId.t45.burn.length === 4 &&
      before("t45").every((table) => !(table.pairs && table.burn.length >= 4)),
    "pairs felts before with four embers: " +
      before("t45").filter((table) => table.pairs && table.burn.length >= 4).length);
  /* The window is the record: at the 48 felt the first bank needs the
   * felt's top two sums, and every four-ember felt lands the same table
   * there - 55.94% clear, a 41.89% line - in a bounty one window wide,
   * under the floor on the stingier side and over the ceiling on the
   * richer side. One bounty either side and the rung falls out both ways:
   * the only two-sided edge in the ladder. */
  const windowProbe = (burn, tax) =>
    dice.measure({ id: "probe-window", target: 48, burn: burn, tax: tax, pairs: true });
  const windows = [
    { id: "t45", burn: [1, 2, 3, 6], bounty: 39 },
    { id: "gilded", burn: [1, 2, 5, 6], bounty: 41 },
    { id: "lean", burn: [3, 4, 5, 6], bounty: 45 },
  ];
  windows.forEach((spec) => {
    const inWindow = windowProbe(spec.burn, -spec.bounty);
    const stingier = windowProbe(spec.burn, -(spec.bounty - 1));
    const richer = windowProbe(spec.burn, -(spec.bounty + 1));
    check("game-ember-dice",
      `${spec.id}: the 48 felt ships the four-ember pairs in a bounty one window wide - ` +
        `${spec.bounty} lands 55.94/41.89, ${spec.bounty - 1} busts the floor, ${spec.bounty + 1} rides the ceiling`,
      (inWindow.clear * 100).toFixed(2) === "55.94" && (inWindow.three * 100).toFixed(2) === "41.89" &&
        (stingier.clear < 0.45 || stingier.three < 0.15) &&
        richer.three > 0.5,
      spec.bounty - 1 + ": " + (stingier.clear * 100).toFixed(1) + "/" + (stingier.three * 100).toFixed(1) +
        ", " + spec.bounty + ": " + (inWindow.clear * 100).toFixed(1) + "/" + (inWindow.three * 100).toFixed(1) +
        ", " + (spec.bounty + 1) + ": " + (richer.clear * 100).toFixed(1) + "/" + (richer.three * 100).toFixed(1));
  });
  const payFacesOf = (table) =>
    [1, 2, 3, 4, 5, 6].filter((face) => table.burn.indexOf(face) === -1);
  check("game-ember-dice",
    "t46 mirrors the famine twins - the first pairs felt that spares exactly the ace and the two highest pips",
    byId.t46.pairs === true &&
      JSON.stringify(payFacesOf(byId.t46)) === JSON.stringify([1, 5, 6]) &&
      before("t46").every((table) =>
        !(table.pairs && JSON.stringify(payFacesOf(table)) === JSON.stringify([1, 5, 6]))),
    "earlier pairs mirrors: " + before("t46").filter((table) =>
      table.pairs && JSON.stringify(payFacesOf(table)) === JSON.stringify([1, 5, 6])).length);
  const mirrorTargets = [120, 200, 240];
  const mirrorEdges = [49, 89, 109];
  const mirrorLines = mirrorTargets.map((target, index) =>
    (dice.measure({ id: "probe-invariance", target: target, burn: [2, 3, 4], tax: -mirrorEdges[index], pairs: true }).three * 100).toFixed(2));
  check("game-ember-dice",
    "the mirror pins the invariance: its three-star line prints 22.70 at the 120, 200 and 240 felts to the decimal - the target is not the dial",
    JSON.stringify(mirrorLines) === JSON.stringify(["22.70", "22.70", "22.70"]),
    mirrorLines.join(" / "));
  check("game-ember-dice",
    "t47 is the first pairs felt whose highest paying pip is the four - one pip looser than the famine twins",
    byId.t47.pairs === true && Math.max.apply(null, payFacesOf(byId.t47)) === 4 &&
      before("t47").every((table) =>
        !(table.pairs && Math.max.apply(null, payFacesOf(table)) === 4)),
    "earlier pairs tops: " + before("t47").filter((table) =>
      table.pairs && Math.max.apply(null, payFacesOf(table)) === 4).length);
  check("game-ember-dice",
    "t48 is the first pairs parity split - two odd faces burning and nothing else, past the single-ace felts",
    byId.t48.pairs === true && byId.t48.burn.length >= 2 &&
      byId.t48.burn.every((face) => face % 2 === 1) &&
      before("t48").every((table) =>
        !(table.pairs && table.burn.length >= 2 && table.burn.every((face) => face % 2 === 1))),
    "earlier multi-face odd-only pairs felts: " + before("t48").filter((table) =>
      table.pairs && table.burn.length >= 2 && table.burn.every((face) => face % 2 === 1)).length);
  check("game-ember-dice",
    "t49 burns the four and the six and nothing else - the first pairs felt that spares the five beside them",
    byId.t49.pairs === true &&
      JSON.stringify(byId.t49.burn.slice().sort()) === JSON.stringify([4, 6]) &&
      before("t49").every((table) =>
        !(table.pairs && JSON.stringify(table.burn.slice().sort()) === JSON.stringify([4, 6]))),
    "earlier 4/6 pairs felts: " + before("t49").filter((table) =>
      table.pairs && JSON.stringify(table.burn.slice().sort()) === JSON.stringify([4, 6])).length);
  check("game-ember-dice",
    "t50 closes the deal with the widest survivors the twins have run - four wide from the ace to the six, past the mirror's three",
    byId.t50.pairs === true &&
      JSON.stringify(payFacesOf(byId.t50)) === JSON.stringify([1, 4, 5, 6]) &&
      before("t50").every((table) =>
        !(table.pairs && payFacesOf(table).length >= 4 &&
          payFacesOf(table).indexOf(1) !== -1 && payFacesOf(table).indexOf(6) !== -1)),
    "earlier four-wide ace-to-six pairs survivors: " + before("t50").filter((table) =>
      table.pairs && payFacesOf(table).length >= 4 &&
      payFacesOf(table).indexOf(1) !== -1 && payFacesOf(table).indexOf(6) !== -1).length);
  /* The closing rung rides the bank quantum down: the line at the edge is
   * sawtoothed in the five-pip banks, and the 200 felt is the deepest dip
   * the walk ran. */
  const sawTeeth = [[195, 40], [200, 41], [205, 43]].map(([target, bounty]) =>
    (dice.measure({ id: "probe-saw", target: target, burn: [2, 3], tax: -bounty, pairs: true }).three * 100).toFixed(2));
  check("game-ember-dice",
    "the Last Deal rides the bank quantum: the line at the edge is sawtoothed in the five-pip banks (16.23 at the 195 felt, 15.20 at the 200, 18.28 at the 205)",
    JSON.stringify(sawTeeth) === JSON.stringify(["16.23", "15.20", "18.28"]),
    sawTeeth.join(" -> "));
  /* One stingier falls out on every rung - and on the opener one richer
   * falls out too, the two-sided edge the window makes. */
  const dealEdges = {};
  diceSeeded(41028, () => {
    dealIds.forEach((id) => {
      dealEdges[id] = dice.measure(Object.assign({}, byId[id], { tax: byId[id].tax + 1 }));
    });
  });
  dealIds.forEach((id) => {
    const edge = dealEdges[id];
    check("game-ember-dice",
      `${id}: one bounty stingier and the rung falls out of the bands` +
        ` (${(edge.clear * 100).toFixed(1)} clear / ${(edge.three * 100).toFixed(1)} line)`,
      edge.clear < 0.45 || edge.three < 0.15,
      "tax " + (byId[id].tax + 1) + ": " + (edge.clear * 100).toFixed(1) + "/" +
        (edge.three * 100).toFixed(1));
  });
  const openerRicher = dice.measure(Object.assign({}, byId.t45, { tax: byId.t45.tax - 1 }));
  check("game-ember-dice",
    "t45's edge is two-sided: one bounty richer and the line rides over the ceiling",
    openerRicher.three > 0.5,
    "tax " + (byId.t45.tax - 1) + ": " + (openerRicher.clear * 100).toFixed(1) + "/" +
      (openerRicher.three * 100).toFixed(1));
  /* The dial, held one last time: at each rung's own economy a shipped
   * cousin measures a different table on both lines - the felt, not the
   * target, is what the tier prices. */
  const cousins = [
    { id: "t46", burn: [4, 5, 6], bounty: 89 },
    { id: "t47", burn: [2, 6], bounty: 45 },
    { id: "t48", burn: [1, 2], bounty: 41 },
    { id: "t49", burn: [2, 6], bounty: 44 },
    { id: "t50", burn: [1, 2], bounty: 41 },
  ];
  cousins.forEach((spec) => {
    const cousin = dice.measure({ id: "probe-cousin", target: 200, burn: spec.burn, tax: -spec.bounty, pairs: true });
    check("game-ember-dice",
      `${spec.id}: the cousin felt at the same economy measures a different table on both lines` +
        ` (${(cousin.clear * 100).toFixed(1)}/${(cousin.three * 100).toFixed(1)} against ` +
        `${(measured[spec.id].clear * 100).toFixed(1)}/${(measured[spec.id].three * 100).toFixed(1)})`,
      Math.abs(cousin.clear - measured[spec.id].clear) > 0.001 &&
        Math.abs(cousin.three - measured[spec.id].three) > 0.001,
      "cousin [" + spec.burn.join(",") + "] at 200/-" + spec.bounty);
  });

  /* The tier's names travel with the module: both languages hold a real
   * string, t() never falls back to the raw key, and each rule line names
   * the target and bounty its table's fields carry. */
  deepTier.concat(summitTier, fourthTier, famineTier, dealTier).forEach((table) => {
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
   * all fifty times, with nothing left locked behind the last. */
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
  check("game-ember-dice", "the unlock chain walks all fifty tables in order",
    walked === 50 && chained && chain.clearedCount() === 50, walked + " first clears");
};
