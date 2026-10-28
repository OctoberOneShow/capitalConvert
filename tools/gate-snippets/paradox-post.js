"use strict";

/* game-paradox-post: the deep tier is proved by the game's own solvers, and
 * its lesson - two hands - is structural, not decorative.
 *
 * Paradox Post ships one paradox-post-campaign ladder (the campaign key is
 * shared by both createCampaign call sites in the module). Rungs 21-24 give
 * the courier a capacity of two: a map with a capacity leaves the third
 * parcel on the floor until a delivery frees a hand, and the same rule runs
 * in the panel (pdxSweep) and in the pure engine (pdxCollect), so a proved
 * plan is a playable plan. The gate proves four things. First, the ladder
 * holds twenty-four runs, distinct and dealt in order. Second, every rung
 * is walkable - App.paradoxShortestPlan returns a plan for all twenty-four,
 * and the deep plans replay clean through App.paradoxResolve. Third, the
 * deep tier is measurably harder than rung twenty in the solver's own
 * currency: every deep par is a longer plan than m20's, every star band
 * sits on the measured par rather than a typed number, and every band line
 * stays reachable. Fourth, the lesson is load-bearing: lift the capacity
 * from a deep rung and the same search proves a strictly shorter round, so
 * the two-hands rule - not the geometry alone - is what the rung costs. */

module.exports = function gate(ctx) {
  const { App, check, fs, path, root } = ctx;
  const maps = App.paradoxMaps;
  const deepIds = ["m21", "m22", "m23", "m24"];
  const problems = [];

  check("game-paradox-post", "the ladder holds twenty-four runs",
    maps.length === 24, String(maps.length));
  check("game-paradox-post", "every run id is distinct",
    new Set(maps.map((map) => map.id)).size === maps.length,
    maps.map((map) => map.id).join(","));
  const dealtLast = maps.slice(-4).map((map) => map.id).join(",");
  const missing = deepIds.filter((id) => !maps.some((map) => map.id === id));
  check("game-paradox-post", "the deep tier m21-m24 is present and dealt last",
    missing.length === 0 && dealtLast === deepIds.join(","),
    missing.length ? missing.join(",") : dealtLast);

  /* Every rung the campaign deals must be walkable: the shipped search
   * (iterative deepening under its own step and node caps) returns a plan
   * for each, and each deep plan replays clean through the resolver. */
  const shortest = {};
  for (const map of maps) {
    const plan = App.paradoxShortestPlan(map);
    if (!plan) { problems.push(`${map.id}: the shipped search proves no plan`); continue; }
    if (plan.plan.length !== plan.steps) {
      problems.push(`${map.id}: plan length ${plan.plan.length} off the measured ${plan.steps}`);
    }
    shortest[map.id] = plan.steps;
  }
  check("game-paradox-post", "every run of twenty-four is proved walkable by the shipped solver",
    problems.length === 0, problems.slice(0, 4).join(" | "));

  const byId = {};
  maps.forEach((map) => { byId[map.id] = map; });
  const deep = deepIds.map((id) => byId[id]);

  const replayProblems = [];
  for (const map of deep) {
    const plan = App.paradoxShortestPlan(map);
    const replay = App.paradoxResolve(map, plan.plan);
    if (!replay.ok || replay.deliveries !== map.parcels.length) {
      replayProblems.push(`${map.id}: the proved plan does not deliver through the resolver`);
    }
  }
  check("game-paradox-post", "every deep plan delivers through App.paradoxResolve",
    replayProblems.length === 0, replayProblems.join(" | "));

  /* The solver's own currency is plan length: rung twenty is the shipped
   * peak the deep tier has to beat, and every deep rung beats it. */
  const par20 = shortest.m20;
  const shallow = deepIds.filter((id) => !(shortest[id] > par20));
  check("game-paradox-post",
    `every deep rung outruns rung twenty in plan length (m20 par ${par20})`,
    typeof par20 === "number" && shallow.length === 0,
    shallow.map((id) => `${id}=${shortest[id]}`).join(","));

  /* Bands are measured, not typed: the three-star line is the proved
   * shortest run, the two-star line gives two steps, the one-star line is
   * the rung's own budget - and no line sits below the par it is measured
   * from, so every band stays reachable without being free. */
  const bandProblems = [];
  for (const map of deep) {
    const bands = App.paradoxBands(map.id);
    const par = shortest[map.id];
    if (bands[0] !== par) {
      bandProblems.push(`${map.id}: the low band ${bands[0]} is not the measured par ${par}`);
    }
    if (bands[1] !== bands[0] + 2) {
      bandProblems.push(`${map.id}: the mid band ${bands[1]} is not par plus two`);
    }
    if (!(bands[2] >= bands[1] && bands[1] > bands[0])) {
      bandProblems.push(`${map.id}: bands do not rise ${bands.join("/")}`);
    }
    if (map.budget < par) {
      bandProblems.push(`${map.id}: budget ${map.budget} sits under the par ${par}`);
    }
    if (bands[2] > par + 8) {
      bandProblems.push(`${map.id}: the one-star line ${bands[2]} wanders too far from par ${par}`);
    }
  }
  check("game-paradox-post", "the deep bands sit on measured lines and stay reachable",
    bandProblems.length === 0, bandProblems.slice(0, 4).join(" | "));

  /* The lesson is load-bearing: lift the capacity and the same search
   * proves a strictly shorter round, so the two-hands rule is what the
   * deep rungs cost - not their geometry alone. */
  const liftProblems = [];
  for (const map of deep) {
    const lifted = JSON.parse(JSON.stringify(map));
    lifted.capacity = 0;
    const free = App.paradoxShortestPlan(lifted);
    if (!free) { liftProblems.push(`${map.id}: the lifted building does not walk`); continue; }
    if (free.steps >= shortest[map.id]) {
      liftProblems.push(`${map.id}: free hands match the two-hand par (${free.steps})`);
    }
  }
  check("game-paradox-post",
    "lifting the capacity provably shortens every deep rung (the two-hands rule is load-bearing)",
    liftProblems.length === 0, liftProblems.slice(0, 4).join(" | "));

  /* The tier owns the rule: capacity two on the deep rungs, none below. */
  const caps = maps.filter((map) => (deepIds.includes(map.id)) !== (map.capacity === 2));
  check("game-paradox-post", "capacity two belongs to the deep tier alone",
    caps.length === 0, caps.map((map) => map.id + "=" + map.capacity).join(","));

  /* The tier's copy resolves in both languages, and the new log line - the
   * one the panel pushes when a parcel is left waiting - exists in both. */
  const copyProblems = [];
  for (const map of deep) {
    for (const field of ["name", "brief", "hint"]) {
      const pair = map[field];
      if (!pair || !pair.en || !pair.zh) { copyProblems.push(`${map.id}.${field}`); }
    }
  }
  for (const key of ["pdxHandsFull"]) {
    if (!App.I18N || !App.I18N.en || !App.I18N.en[key] ||
        !App.I18N.zh || !App.I18N.zh[key]) {
      copyProblems.push(key);
    }
  }
  check("game-paradox-post", "the deep copy and the hands-full line resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The guide carries the new tier in both languages. */
  const src = fs.readFileSync(path.join(root, "assets", "app", "game-paradox-post.js"), "utf8");
  check("game-paradox-post", "the guide announces the two-hands tier in English and Chinese",
    src.indexOf("New tier: from map 21 the courier has only two hands") >= 0 &&
    src.indexOf("新层级：从第21张图起，邮差只有一双手") >= 0);

  /* One campaign, one key, both call sites: the module creates its picker
   * campaign at two places and they must share the key, and the unlock
   * chain derived from it walks all twenty-four runs in order. */
  const keyCount = src.split('key: "paradox-post-campaign"').length - 1;
  check("game-paradox-post", "both createCampaign call sites share the paradox-post-campaign key",
    keyCount === 2, String(keyCount));
  const chain = App.createCampaign({
    key: "paradox-post-campaign",
    levels: maps.map((map) => ({ id: map.id })),
  });
  let walked = 0;
  let chained = true;
  maps.forEach((map, index) => {
    const outcome = chain.record(map.id, { stars: 3, best: shortest[map.id], better: "low" });
    if (outcome.firstClear) { walked += 1; }
    const expected = index + 1 < maps.length ? maps[index + 1].id : null;
    if (outcome.unlockedNext !== expected) { chained = false; }
  });
  check("game-paradox-post", "the unlock chain walks all twenty-four runs in order",
    walked === 24 && chained && chain.clearedCount() === 24, walked + " first clears");
};
