"use strict";

/* game-paradox-post: the deep and overnight tiers are proved by the game's
 * own solvers, and their lessons - two hands, then the long walk - are
 * structural, not decorative.
 *
 * Paradox Post ships one paradox-post-campaign ladder (the campaign key is
 * shared by both createCampaign call sites in the module). Rungs 21-24 give
 * the courier a capacity of two: a map with a capacity leaves the third
 * parcel on the floor until a delivery frees a hand, and the same rule runs
 * in the panel (pdxSweep) and in the pure engine (pdxCollect), so a proved
 * plan is a playable plan. Rungs 25-30, the overnight tier, walk the last
 * rounds of the night: buildings the day shift left unlocked, grown a wing
 * a rung deeper, ending at a capstone the search measures at twenty-five
 * steps where the old summit did nineteen.
 *
 * The gate proves five things. First, the ladder holds thirty runs,
 * distinct and dealt in order. Second, every rung is walkable -
 * App.paradoxShortestPlan returns a plan for all thirty, and the deep and
 * night plans replay clean through App.paradoxResolve. Third, the tiers are
 * measurably harder in the solver's own currency: every deep and night par
 * is a longer plan than m20's, the night pars climb rung over rung past
 * m24's, every star band sits on the measured par rather than a typed
 * number, and every band line stays reachable. Fourth, the lessons are
 * load-bearing: lift the capacity from a deep rung - or from the first
 * three night rungs, where the design still claims it - and the same
 * search proves a strictly shorter round, so the two-hands rule is what
 * those rungs cost; the last three nights give up the strand (two deep
 * wings can always interleave) and charge for length instead, which their
 * pars certify. Fifth, the copy travels: the tiers' names, briefs, hints
 * and guide lines resolve in both languages. */

module.exports = function gate(ctx) {
  const { App, check, fs, path, root } = ctx;
  const maps = App.paradoxMaps;
  const deepIds = ["m21", "m22", "m23", "m24"];
  const nightIds = ["m25", "m26", "m27", "m28", "m29", "m30"];
  const cappedIds = deepIds.concat(nightIds);
  const problems = [];

  check("game-paradox-post", "the ladder holds thirty runs",
    maps.length === 30, String(maps.length));
  check("game-paradox-post", "every run id is distinct",
    new Set(maps.map((map) => map.id)).size === maps.length,
    maps.map((map) => map.id).join(","));
  const dealtLast = maps.slice(-6).map((map) => map.id).join(",");
  const missing = nightIds.filter((id) => !maps.some((map) => map.id === id));
  check("game-paradox-post", "the overnight tier m25-m30 is present and dealt last",
    missing.length === 0 && dealtLast === nightIds.join(","),
    missing.length ? missing.join(",") : dealtLast);

  /* Every rung the campaign deals must be walkable: the shipped search
   * (iterative deepening under its own step and node caps) returns a plan
   * for each, and each tier plan replays clean through the resolver. */
  const shortest = {};
  for (const map of maps) {
    const plan = App.paradoxShortestPlan(map);
    if (!plan) { problems.push(`${map.id}: the shipped search proves no plan`); continue; }
    if (plan.plan.length !== plan.steps) {
      problems.push(`${map.id}: plan length ${plan.plan.length} off the measured ${plan.steps}`);
    }
    shortest[map.id] = plan.steps;
  }
  check("game-paradox-post", "every run of thirty is proved walkable by the shipped solver",
    problems.length === 0, problems.slice(0, 4).join(" | "));

  const byId = {};
  maps.forEach((map) => { byId[map.id] = map; });
  const deep = deepIds.map((id) => byId[id]);
  const night = nightIds.map((id) => byId[id]);

  const replayProblems = [];
  for (const map of deep.concat(night)) {
    const plan = App.paradoxShortestPlan(map);
    const replay = App.paradoxResolve(map, plan.plan);
    if (!replay.ok || replay.deliveries !== map.parcels.length) {
      replayProblems.push(`${map.id}: the proved plan does not deliver through the resolver`);
    }
  }
  check("game-paradox-post", "every deep and night plan delivers through App.paradoxResolve",
    replayProblems.length === 0, replayProblems.join(" | "));

  /* The solver's own currency is plan length: rung twenty is the peak the
   * deep tier has to beat, rung twenty-four the peak the overnight tier
   * has to beat, and every night rung beats the last, up to the capstone. */
  const par20 = shortest.m20;
  const shallow = deepIds.filter((id) => !(shortest[id] > par20));
  check("game-paradox-post",
    `every deep rung outruns rung twenty in plan length (m20 par ${par20})`,
    typeof par20 === "number" && shallow.length === 0,
    shallow.map((id) => `${id}=${shortest[id]}`).join(","));
  const par24 = shortest.m24;
  const shortNight = nightIds.filter((id) => !(shortest[id] > par24));
  check("game-paradox-post",
    `every overnight rung outruns the old summit (m24 par ${par24})`,
    typeof par24 === "number" && shortNight.length === 0,
    shortNight.map((id) => `${id}=${shortest[id]}`).join(","));
  const flatNight = nightIds.filter((id, index) =>
    index > 0 && !(shortest[id] > shortest[nightIds[index - 1]]));
  check("game-paradox-post", "the overnight pars climb rung over rung to the capstone",
    flatNight.length === 0,
    nightIds.map((id) => `${id}=${shortest[id]}`).join(","));

  /* Bands are measured, not typed: the three-star line is the proved
   * shortest run, the two-star line gives two steps, the one-star line is
   * the rung's own budget - and no line sits below the par it is measured
   * from, so every band stays reachable without being free. */
  const bandProblems = [];
  for (const map of deep.concat(night)) {
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
  check("game-paradox-post", "the deep and night bands sit on measured lines and stay reachable",
    bandProblems.length === 0, bandProblems.slice(0, 4).join(" | "));

  /* The two-hands rule is load-bearing where the design claims it: lift
   * the capacity and the same search proves a strictly shorter round for
   * the deep rungs and the first three night rungs. The last three nights
   * give the strand up on purpose - two deep wings can always interleave -
   * so there the gate only requires that the building still walks, and
   * lets the measured par carry the difficulty. */
  const liftProblems = [];
  for (const map of deep.concat(night.slice(0, 3))) {
    const lifted = JSON.parse(JSON.stringify(map));
    lifted.capacity = 0;
    const free = App.paradoxShortestPlan(lifted);
    if (!free) { liftProblems.push(`${map.id}: the lifted building does not walk`); continue; }
    if (free.steps >= shortest[map.id]) {
      liftProblems.push(`${map.id}: free hands match the two-hand par (${free.steps})`);
    }
  }
  const strandFree = [];
  for (const map of night.slice(3)) {
    const lifted = JSON.parse(JSON.stringify(map));
    lifted.capacity = 0;
    const free = App.paradoxShortestPlan(lifted);
    if (!free) { strandFree.push(`${map.id}: the lifted building does not walk`); }
  }
  check("game-paradox-post",
    "lifting the capacity provably shortens the deep rungs and the first night rungs (the two-hands rule is load-bearing)",
    liftProblems.length === 0, liftProblems.slice(0, 4).join(" | "));
  check("game-paradox-post",
    "the length-exam nights m28-m30 still walk without the capacity",
    strandFree.length === 0, strandFree.join(" | "));

  /* The tiers own the rule: capacity two on the deep and overnight rungs,
   * none below. */
  const caps = maps.filter((map) => (cappedIds.includes(map.id)) !== (map.capacity === 2));
  check("game-paradox-post", "capacity two belongs to the deep and overnight tiers alone",
    caps.length === 0, caps.map((map) => map.id + "=" + map.capacity).join(","));

  /* The tiers' copy resolves in both languages, and the log line the panel
   * pushes when a parcel is left waiting exists in both. */
  const copyProblems = [];
  for (const map of deep.concat(night)) {
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
  check("game-paradox-post", "the deep and overnight copy and the hands-full line resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The guide carries both tiers in both languages. */
  const src = fs.readFileSync(path.join(root, "assets", "app", "game-paradox-post.js"), "utf8");
  check("game-paradox-post", "the guide announces the two-hands tier in English and Chinese",
    src.indexOf("New tier: from map 21 the courier has only two hands") >= 0 &&
    src.indexOf("新层级：从第21张图起，邮差只有一双手") >= 0);
  check("game-paradox-post", "the guide announces the overnight tier in English and Chinese",
    src.indexOf("The overnight tier: maps 25-30") >= 0 &&
    src.indexOf("夜班层级：第25到30张图") >= 0);

  /* One campaign, one key, both call sites: the module creates its picker
   * campaign at two places and they must share the key, and the unlock
   * chain derived from it walks all thirty runs in order. */
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
  check("game-paradox-post", "the unlock chain walks all thirty runs in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
