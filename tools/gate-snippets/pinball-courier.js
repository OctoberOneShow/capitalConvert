"use strict";

/* game-pinball-courier: every table is proved by its own stored line, and the
 * deep tier is the tier no other route can serve
 *
 * App.courierReplay drives the same pbcStep the flippers use, so a published
 * par is a measured launch count rather than a guess, and App.courierBands
 * derives [par, par+1, par+2] from that replay - the module's other branch
 * (par = manifest + 1) is the "this table has no proven line" flag, so the gate
 * rejects any band that is not the replay's own launch count. The deep tier is
 * then held to its brief three ways: each of pbcT21-pbcT24 moves a ratchet
 * window the shipped summit does not move, none of them can be cleared by any
 * shipped line or by a sibling's line, and each one's tolerance to a one-tick
 * slip is far narrower than the summit's. */
module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const tables = App.courierTables;
  const byId = (id) => tables.find((table) => table.id === id);
  const deepIds = ["pbcT21", "pbcT22", "pbcT23", "pbcT24"];

  check("game-pinball-courier", "the ladder holds at least twenty-four tables",
    tables.length >= 24, String(tables.length));
  check("game-pinball-courier", "every table id is distinct",
    new Set(tables.map((table) => table.id)).size === tables.length,
    tables.map((table) => table.id).join(","));
  const missing = deepIds.filter((id) => !byId(id));
  check("game-pinball-courier", "the deep tier pbcT21-pbcT24 is present",
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

  /* The deep tier moves windows, not numbers: each table's zone layout must
   * differ from the shipped summit's, and the four must differ from each other,
   * so one fixer cannot be re-skinned four times. */
  const summit = byId("pbcT20");
  const zoneKey = (table) => JSON.stringify(table.zones);
  const sameAsSummit = deepIds.filter((id) => zoneKey(byId(id)) === zoneKey(summit));
  check("game-pinball-courier", "each deep table moves a ratchet window the summit does not",
    sameAsSummit.length === 0, sameAsSummit.join(","));
  const zoneKeys = deepIds.map((id) => zoneKey(byId(id)));
  check("game-pinball-courier", "the four deep tables are four different window layouts",
    new Set(zoneKeys).size === 4,
    deepIds.map((id, index) => id + "=" +
      byId(id).zones.map((z) => z.ax + "/" + z.ay + "-" + z.bx + "/" + z.by).join(",")).join(" | "));

  /* Difficulty witness: no other route on the ladder serves a deep table. Any
   * shipped line, or a sibling deep line, that cleared one would mean the new
   * window does not actually bind. */
  const foreignProblems = [];
  deepIds.forEach((id) => {
    const table = byId(id);
    const servedBy = tables.filter((other) => other.id !== id).filter((other) => {
      const run = App.courierReplay(table, other.program);
      return run.won && run.deliveries >= table.manifest.length;
    }).map((other) => other.id);
    if (servedBy.length) {
      foreignProblems.push(id + " served by " + servedBy.join(","));
    }
  });
  check("game-pinball-courier", "no other table's line clears a deep table",
    foreignProblems.length === 0, foreignProblems.join(" | "));

  /* Tolerance: the share of one-tick slips a stored line survives. Sampled
   * every third step in both directions to keep the gate cheap; the claim is
   * only that each deep line is looser-proof than the summit's. */
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

  /* The summit is the summit on the ladder's own currency: most parcels and
   * most launches of any table, with one launch per parcel. */
  const parcelMax = Math.max.apply(null, tables.map((table) => table.manifest.length));
  const launchMax = Math.max.apply(null, tables.map((table) => launches[table.id]));
  const t24 = byId("pbcT24");
  check("game-pinball-courier", "pbcT24 carries more parcels than any shipped table",
    t24.manifest.length === parcelMax && parcelMax > summit.manifest.length,
    t24.manifest.length + " vs shipped " + summit.manifest.length);
  check("game-pinball-courier", "pbcT24's par is the longest on the ladder at one launch per parcel",
    launches["pbcT24"] === launchMax && launches["pbcT24"] === t24.manifest.length,
    launches["pbcT24"] + "/" + launchMax);

  /* Random-input fuzzing over the new layouts: no escape, no stall, no trap. */
  const fuzzProblems = [];
  deepIds.forEach((id) => {
    const report = App.courierFuzz(byId(id), 7, 6, 900);
    if (!report || report.bad || report.escape || report.stall || report.trap) {
      fuzzProblems.push(id + ":" + JSON.stringify(report));
    }
  });
  check("game-pinball-courier", "random input stays inside the table on every deep layout",
    fuzzProblems.length === 0, fuzzProblems.join(" | "));

  /* Copy travels with the module. */
  const copyKeys = ["pbcTbl21", "pbcTbl22", "pbcTbl23", "pbcTbl24"];
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-pinball-courier", "the four table names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
