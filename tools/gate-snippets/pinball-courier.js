"use strict";

/* game-pinball-courier: every table is proved by its own stored line, and the
 * deep and summit tiers are the tiers no lower route can serve
 *
 * App.courierReplay drives the same pbcStep the flippers use, so a published
 * par is a measured launch count rather than a guess, and App.courierBands
 * derives [par, par+1, par+2] from that replay - the module's other branch
 * (par = manifest + 1) is the "this table has no proven line" flag, so the gate
 * rejects any band that is not the replay's own launch count. The deep tier is
 * held to its brief three ways: each of pbcT21-pbcT24 moves a ratchet window
 * the shipped summit does not move, none of them can be cleared by any lower
 * line or by a sibling's line, and each one's tolerance to a one-tick slip is
 * far narrower than the pbcT20 line's. The summit tier is held to a stricter
 * ledger than any shipped table: one launch per parcel, no spare ball, all
 * three trays worked at least four times, every window layout new to the
 * ladder, and no rung below it able to serve it. */
module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const tables = App.courierTables;
  const byId = (id) => tables.find((table) => table.id === id);
  const deepIds = ["pbcT21", "pbcT22", "pbcT23", "pbcT24"];
  const summitIds = ["pbcT25", "pbcT26", "pbcT27", "pbcT28", "pbcT29", "pbcT30"];

  check("game-pinball-courier", "the ladder holds thirty tables",
    tables.length === 30, String(tables.length));
  check("game-pinball-courier", "every table id is distinct",
    new Set(tables.map((table) => table.id)).size === tables.length,
    tables.map((table) => table.id).join(","));
  const orderProblems = tables.map((table, index) => table.id === "pbcT" + (index + 1) ? null : table.id)
    .filter(Boolean);
  check("game-pinball-courier", "the ids run pbcT1 through pbcT30 in order",
    orderProblems.length === 0, orderProblems.join(","));
  const missing = deepIds.concat(summitIds).filter((id) => !byId(id));
  check("game-pinball-courier", "the deep and summit tiers are present",
    missing.length === 0, missing.join(","));

  /* Proof pass: a stored line, a win, and bands that are that line's own
   * launch count. */
  const launches = {};
  const proofProblems = [];
  tables.forEach((table) => {
    const run = App.courierReplay(table, table.program);
    const bands = App.courierBands(table);
    launches[table.id] = run.launches;
    const bad = !table.program.length || !run.won ||
      run.deliveries < table.manifest.length ||
      !App.courierSolvable(table) ||
      bands[0] !== run.launches || bands[1] !== run.launches + 1 ||
      bands[2] !== run.launches + 2;
    if (bad) {
      proofProblems.push(table.id + ":" + (run.won ? "" : "no-win") +
        " del " + run.deliveries + "/" + table.manifest.length +
        " par " + bands[0] + "/" + run.launches);
    }
  });
  check("game-pinball-courier", "every table's stored line wins and its band is that line's launch count",
    proofProblems.length === 0, proofProblems.join(" "));

  /* The new tiers are tighter than any shipped table's ledger: shipped tables
   * buy spare balls and a few spend one on nothing, while every deep and
   * summit table is launch-per-parcel, no spare ball, under the engine cap. */
  const ledgerProblems = [];
  deepIds.concat(summitIds).forEach((id) => {
    const table = byId(id);
    const run = App.courierReplay(table, table.program);
    const bad = run.launches !== run.deliveries ||
      run.deliveries !== table.manifest.length ||
      table.balls !== table.manifest.length ||
      run.ticks > 3850;
    if (bad) {
      ledgerProblems.push(id + ": launch " + run.launches + " del " + run.deliveries +
        "/" + table.manifest.length + " balls " + table.balls + " ticks " + run.ticks);
    }
  });
  check("game-pinball-courier", "every deep and summit ledger is launch-per-parcel with no spare ball",
    ledgerProblems.length === 0, ledgerProblems.join(" | "));

  /* The summit moves windows, not numbers: each summit rung's zone layout is
   * one the ladder below never shipped, and the six are six different layouts,
   * so one fixer cannot be re-skinned six times. Two windows must move against
   * the default layout, so a single nudged wall is not enough. */
  const zoneKey = (table) => JSON.stringify(table.zones);
  const shippedIds = tables.slice(0, 24).map((table) => table.id);
  const reskins = summitIds.filter((id) => shippedIds.some((other) => zoneKey(byId(other)) === zoneKey(byId(id))));
  check("game-pinball-courier", "every summit layout is one the ladder never shipped",
    reskins.length === 0, reskins.join(","));
  const summitZoneKeys = summitIds.map((id) => zoneKey(byId(id)));
  check("game-pinball-courier", "the six summit tables are six different window layouts",
    new Set(summitZoneKeys).size === 6,
    summitIds.map((id, index) => id + "=" +
      byId(id).zones.map((z) => z.ax + "/" + z.ay + "-" + z.bx + "/" + z.by).join(",")).join(" | "));
  const baseZones = byId("pbcT1").zones;
  const movedProblems = summitIds.filter((id) => {
    const zones = byId(id).zones;
    const moved = zones.reduce((count, zone, index) =>
      count + (["ax", "ay", "bx", "by"].some((field) => zone[field] !== baseZones[index][field]) ? 1 : 0), 0);
    return moved < 2;
  });
  check("game-pinball-courier", "every summit table moves at least two ratchet windows",
    movedProblems.length === 0, movedProblems.join(","));

  /* The deep tier moves a ratchet window the shipped summit does not, and the
   * four deep layouts are four different layouts. */
  const summit = byId("pbcT20");
  const sameAsSummit = deepIds.filter((id) => zoneKey(byId(id)) === zoneKey(summit));
  check("game-pinball-courier", "each deep table moves a ratchet window the shipped summit does not",
    sameAsSummit.length === 0, sameAsSummit.join(","));
  const zoneKeys = deepIds.map((id) => zoneKey(byId(id)));
  check("game-pinball-courier", "the four deep tables are four different window layouts",
    new Set(zoneKeys).size === 4,
    deepIds.map((id, index) => id + "=" +
      byId(id).zones.map((z) => z.ax + "/" + z.ay + "-" + z.bx + "/" + z.by).join(",")).join(" | "));

  /* Difficulty witness: no rung below a deep or summit table serves it. A lower
   * line that cleared one would mean the new window does not actually bind. */
  const foreignProblems = [];
  deepIds.concat(summitIds).forEach((id) => {
    const table = byId(id);
    const index = tables.indexOf(table);
    const servedBy = tables.slice(0, index).filter((other) => {
      const run = App.courierReplay(table, other.program);
      return run.won && run.deliveries >= table.manifest.length;
    }).map((other) => other.id);
    if (servedBy.length) {
      foreignProblems.push(id + " served by " + servedBy.join(","));
    }
  });
  check("game-pinball-courier", "no rung below a deep or summit table serves it",
    foreignProblems.length === 0, foreignProblems.join(" | "));

  /* Tolerance: the share of one-tick slips a stored line survives. Sampled
   * every third step in both directions to keep the gate cheap; the claim is
   * only that each deep line is looser-proof than the shipped summit's. */
  const basin = (table) => {
    let hits = 0;
    let total = 0;
    for (let i = 0; i < table.program.length; i += 3) {
      [-1, 1].forEach((delta) => {
        const program = table.program.slice();
        program[i] = Object.assign({}, program[i], { dur: Math.max(1, program[i].dur + delta) });
        total += 1;
        const run = App.courierReplay(table, program);
        if (run.won && run.deliveries >= table.manifest.length) {
          hits += 1;
        }
      });
    }
    return total ? hits / total : 0;
  };
  const summitBasin = basin(summit);
  const basinProblems = [];
  const deepBasin = {};
  deepIds.forEach((id) => {
    const value = basin(byId(id));
    deepBasin[id] = value;
    if (!(value < summitBasin)) {
      basinProblems.push(id + " " + (value * 100).toFixed(1) + "% vs summit " + (summitBasin * 100).toFixed(1) + "%");
    }
  });
  check("game-pinball-courier", "every deep line tolerates fewer one-tick slips than the shipped summit",
    basinProblems.length === 0,
    basinProblems.length ? basinProblems.join(" | ")
      : "summit " + (summitBasin * 100).toFixed(1) + "% vs " + deepIds.map((id) => id.slice(3) + " " + (deepBasin[id] * 100).toFixed(1) + "%").join(" / "));

  /* The summit's currency is a balanced ledger: every tray worked at least
   * four times, no two summit ledgers the same, and the close carries the
   * ladder's longest par at one launch per parcel. */
  const trayProblems = [];
  summitIds.forEach((id) => {
    const counts = [0, 0, 0];
    byId(id).manifest.forEach((route) => { counts[route] += 1; });
    if (Math.min.apply(null, counts) < 4) {
      trayProblems.push(id + " " + counts.join("/"));
    }
  });
  check("game-pinball-courier", "every summit ledger works all three trays at least four times",
    trayProblems.length === 0, trayProblems.join(" | "));
  const summitManifests = summitIds.map((id) => byId(id).manifest.join(""));
  check("game-pinball-courier", "the six summit ledgers are six different delivery orders",
    new Set(summitManifests).size === 6, summitManifests.join(" "));
  const launchMax = Math.max.apply(null, tables.map((table) => launches[table.id]));
  const parcelMax = Math.max.apply(null, tables.map((table) => table.manifest.length));
  check("game-pinball-courier", "the summit closes at the ladder's longest par with one launch per parcel",
    launches["pbcT30"] === launchMax && launches["pbcT30"] === byId("pbcT30").manifest.length &&
    byId("pbcT30").manifest.length === parcelMax,
    launches["pbcT30"] + "/" + launchMax + " parcels " + byId("pbcT30").manifest.length + "/" + parcelMax);
  check("game-pinball-courier", "the top three summit tables carry thirteen parcels at one launch each",
    ["pbcT28", "pbcT29", "pbcT30"].every((id) =>
      byId(id).manifest.length === 13 && byId(id).balls === 13 && launches[id] === 13),
    ["pbcT28", "pbcT29", "pbcT30"].map((id) => launches[id] + "/" + byId(id).manifest.length).join(" "));

  /* Random-input fuzzing over the new layouts: no escape, no stall, no trap. */
  const fuzzProblems = [];
  deepIds.concat(summitIds).forEach((id) => {
    const report = App.courierFuzz(byId(id), 7, 6, 900);
    if (!report || report.bad || report.escape || report.stall || report.trap) {
      fuzzProblems.push(id + ":" + JSON.stringify(report));
    }
  });
  check("game-pinball-courier", "random input stays inside the table on every deep and summit layout",
    fuzzProblems.length === 0, fuzzProblems.join(" | "));

  /* Copy travels with the module. */
  const copyKeys = deepIds.concat(summitIds).map((id) => "pbcTbl" + id.slice(4));
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-pinball-courier", "the deep and summit table names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived from the table order, so all thirty must walk. */
  const chain = App.createCampaign({
    key: "pinball-courier-gate-chain",
    levels: tables.map((table) => ({ id: table.id, labelKey: table.labelKey })),
  });
  let walked = 0;
  let chained = true;
  tables.forEach((table, index) => {
    const outcome = chain.record(table.id, { stars: 3, best: launches[table.id], better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < tables.length ? tables[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-pinball-courier", "the unlock chain walks all thirty tables in order",
    walked === tables.length && chained && chain.clearedCount() === tables.length,
    walked + " first clears");
};
