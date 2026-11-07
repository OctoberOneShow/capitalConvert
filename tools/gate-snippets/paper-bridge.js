"use strict";

/* game-paper-bridge: the master works and the viaduct tier are proven by the
 * yard's own checker.
 *
 * The gate replays all forty authored plans through bridgeCheck - the exact
 * call the build button and the span loader answer to - so a plan that cannot
 * carry the cart fails here, not on the drawing. The master term b25-b30 is
 * held to the shipped summit's own bar and one line stricter: every plan
 * stands, cannot spare a single beam (lifting any one makes the span fall),
 * and the yard hands out exact change - the limit sits exactly on the proven
 * plan. Every beam of every plan is also shown buildable: aligned along the
 * eight lattice directions, within the four-node reach, and not a duplicate
 * of its own plan, so what ships is what a player could really lay.
 *
 * The viaduct tier b31-b40 is the shape the first thirty never deal: every
 * span chains open air into three or more stretches and the cart itself
 * stands on at least two stones between the banks - the first thirty never
 * stand on more than one. The stones stagger across rows from b34 on, the
 * purse tightens rung over rung (two spare beams, then one, then exact
 * change at b39-b40), and a wasting build that lays one beam over par still
 * crosses but takes two stars, never three. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.bridgeLevels;
  const masterIds = ["b25", "b26", "b27", "b28", "b29", "b30"];
  const viaductIds = ["b31", "b32", "b33", "b34", "b35", "b36", "b37", "b38", "b39", "b40"];

  check("game-paper-bridge", "the ladder holds forty spans",
    levels.length === 40, String(levels.length));
  check("game-paper-bridge", "every span id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  check("game-paper-bridge", "the ids run b1 through b40 in order",
    levels.map((level) => level.id).join(",") ===
      Array.from({ length: 40 }, (_, index) => "b" + (index + 1)).join(","),
    levels.map((level) => level.id).join(","));
  const missing = masterIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-paper-bridge", "the master term b25-b30 is present",
    missing.length === 0, missing.join(","));
  const missingViaduct = viaductIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-paper-bridge", "the viaduct tier b31-b40 is present",
    missingViaduct.length === 0, missingViaduct.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });

  /* Ground the plan in node ids the way the build button does. */
  const planOf = (level) =>
    level.solution.map((pair) => [pair[0] + pair[1] * 12, pair[2] + pair[3] * 12]);

  /* Stones are the ground masses strictly between the banks; a proven route
   * stands on one when one of its nodes lands on the mass. */
  const stonesOf = (level) => {
    const sx = level.startAt[0];
    const tx = level.targetAt[0];
    return (level.ground || []).filter((s) => s[0] > sx && s[1] < tx);
  };
  const steppedStones = (level, proof, nodes) =>
    stonesOf(level).filter((s) =>
      proof.path.some((n) =>
        nodes[n].y === s[2] && nodes[n].x >= s[0] && nodes[n].x <= s[1]));

  /* Whole-ladder regression: every authored plan, shipped or new, carries the
   * cart through the real checker, and every route is audited for stone. */
  const falls = [];
  const proofs = {};
  levels.forEach((level) => {
    const nodes = App.bridgeNodes(level);
    const proof = App.bridgeCheck(nodes, planOf(level), App.bridgeSpan(level));
    proofs[level.id] = { proof: proof, nodes: nodes };
    if (!proof.ok) falls.push(`${level.id} falls (${proof.fail})`);
  });
  check("game-paper-bridge",
    "all forty authored plans stand through bridgeCheck",
    falls.length === 0, falls.join(" | "));

  /* Buildability: every beam of every plan is one a player could really lay. */
  const unbuildable = [];
  levels.forEach((level) => {
    const nodes = App.bridgeNodes(level);
    const plan = planOf(level);
    plan.forEach((pair, i) => {
      const others = plan.filter((_, j) => j !== i);
      const why = App.bridgeBeamOk(nodes, others, pair[0], pair[1]);
      if (why !== "ok") unbuildable.push(`${level.id} beam ${i}: ${why}`);
    });
  });
  check("game-paper-bridge",
    "every beam of every plan is buildable on the lattice",
    unbuildable.length === 0, unbuildable.join(" | "));

  /* The master term: exact change only. Each plan stands, cannot spare one,
   * and the limit sits on the plan - one wasted beam fails the purse. */
  const masterProblems = [];
  masterIds.forEach((id) => {
    const level = byId[id];
    const nodes = App.bridgeNodes(level);
    const plan = planOf(level);
    const spares = [];
    plan.forEach((_, i) => {
      const reduced = plan.filter((_, j) => j !== i);
      if (App.bridgeCheck(nodes, reduced, App.bridgeSpan(level)).ok) spares.push(i);
    });
    if (spares.length) masterProblems.push(`${id} carries ${spares.length} spare beam(s)`);
    if (level.limit !== level.solution.length) {
      masterProblems.push(`${id} limit ${level.limit} is not the proven plan (${level.solution.length})`);
    }
    if (level.par !== level.solution.length) {
      masterProblems.push(`${id} par ${level.par} is not the proven plan (${level.solution.length})`);
    }
  });
  check("game-paper-bridge",
    "every master span cannot spare a beam and ships at exact change",
    masterProblems.length === 0, masterProblems.join(" | "));

  /* The master term is the wide term: the grand truss crosses the tour's
   * widest barren gap - no island, no pier, ten beams of pure lattice. */
  const grand = byId.b30;
  check("game-paper-bridge",
    "b30 is the widest barren crossing of the tour (two ledges, no islands)",
    grand.ground.length === 2 &&
      grand.solution.length >= Math.max.apply(null, masterIds.map((id) => byId[id].solution.length)),
    `ledges ${grand.ground.length}, beams ${grand.solution.length}`);

  /* The viaduct tier's never-facts, measured live on the shipped thirty: no
   * earlier route stands on more than one stone between the banks, no earlier
   * span chains more than two islands, and no multi-island span staggers its
   * islands across rows. */
  const staleProblems = [];
  levels.filter((level) => !viaductIds.includes(level.id)).forEach((level) => {
    const record = proofs[level.id];
    const stepped = steppedStones(level, record.proof, record.nodes);
    if (stepped.length > 1) {
      staleProblems.push(`${level.id} already stands on ${stepped.length} stones`);
    }
    const stones = stonesOf(level);
    if (stones.length > 2) {
      staleProblems.push(`${level.id} already chains ${stones.length} islands`);
    }
    if (stones.length >= 2 && new Set(stones.map((s) => s[2])).size >= 2) {
      staleProblems.push(`${level.id} already staggers island rows`);
    }
  });
  check("game-paper-bridge",
    "the first thirty never stand on two stones, chain three islands, or stagger rows",
    staleProblems.length === 0, staleProblems.join(" | "));

  /* The viaduct bar: each plan is irreducible, the purse runs the tier's
   * tightening line (two spare beams, then one, then exact change), the pars
   * never fall, and the cart itself stands on at least two stones - straddling
   * at least two rows from b34 on. */
  const slackLine = [2, 2, 2, 2, 1, 1, 1, 1, 0, 0];
  const viaductProblems = [];
  let lastPar = 0;
  let lastSlack = Infinity;
  viaductIds.forEach((id, index) => {
    const level = byId[id];
    const nodes = App.bridgeNodes(level);
    const plan = planOf(level);
    const spares = [];
    plan.forEach((_, i) => {
      const reduced = plan.filter((_, j) => j !== i);
      if (App.bridgeCheck(nodes, reduced, App.bridgeSpan(level)).ok) spares.push(i);
    });
    if (spares.length) viaductProblems.push(`${id} carries ${spares.length} spare beam(s)`);
    const slack = level.limit - level.solution.length;
    if (slack !== slackLine[index]) {
      viaductProblems.push(`${id} slack ${slack} is off the tier line (${slackLine[index]})`);
    }
    if (level.solution.length < lastPar) {
      viaductProblems.push(`${id} par ${level.solution.length} falls under the rung before it (${lastPar})`);
    }
    if (slack > lastSlack) {
      viaductProblems.push(`${id} purse slackens to ${slack} after ${lastSlack}`);
    }
    lastPar = level.solution.length;
    lastSlack = slack;
    const record = proofs[id];
    const stepped = steppedStones(level, record.proof, record.nodes);
    if (stepped.length < 2) {
      viaductProblems.push(`${id} stands on ${stepped.length} stone(s)`);
    } else if (index >= 3 && new Set(stepped.map((s) => s[2])).size < 2) {
      viaductProblems.push(`${id} stones sit on one row`);
    }
  });
  check("game-paper-bridge",
    "every viaduct span is irreducible, climbs the purse line, and stands on staggered stone",
    viaductProblems.length === 0, viaductProblems.join(" | "));

  /* The last two rungs hand out exact change, the first spans to do it since
   * the master term: the purse refuses a wasted beam outright. */
  const exactProblems = ["b39", "b40"].filter((id) =>
    byId[id].limit !== byId[id].solution.length || byId[id].par !== byId[id].solution.length);
  check("game-paper-bridge",
    "b39 and b40 hand out exact change (limit and par on the proven plan)",
    exactProblems.length === 0, exactProblems.join(","));

  /* A wasting build misses the three-star bar: one legal beam over par still
   * carries the cart, and starsFor pays two stars for it - wherever the purse
   * has a spare slot to lay it in. */
  const wasteProblems = [];
  viaductIds.forEach((id) => {
    const level = byId[id];
    if (level.limit <= level.solution.length) return;
    const nodes = App.bridgeNodes(level);
    const plan = planOf(level);
    let wasted = false;
    for (let y = 0; y < 6 && !wasted; y += 1) {
      for (let x = 0; x < 12 && !wasted; x += 1) {
        for (let dy = -4; dy <= 4 && !wasted; dy += 1) {
          for (let dx = 1; dx <= 4 && !wasted; dx += 1) {
            if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx > 11 || ny < 0 || ny > 5) continue;
            const a = y * 12 + x;
            const b = ny * 12 + nx;
            if (App.bridgeBeamOk(nodes, plan, a, b) !== "ok") continue;
            if (!App.bridgeCheck(nodes, plan.concat([[a, b]]), App.bridgeSpan(level)).ok) continue;
            wasted = true;
            const par = level.solution.length;
            const stars = App.starsFor(par + 1, [par, par + 1, par + 3], "low");
            if (stars !== 2) wasteProblems.push(`${id} a par+1 build pays ${stars} stars`);
          }
        }
      }
    }
    if (!wasted) wasteProblems.push(`${id} has no legal wasting build to test`);
  });
  check("game-paper-bridge",
    "a beam over par still crosses but takes two stars, never three",
    wasteProblems.length === 0, wasteProblems.join(" | "));

  /* The tier's names travel with the page: both languages hold a real string,
   * t() never falls back to the raw key, and the two wordings differ. */
  const copyProblems = viaductIds.map((id) => byId[id].labelKey).filter((key) => {
    const en = App.I18N && App.I18N.en && App.I18N.en[key];
    const zh = App.I18N && App.I18N.zh && App.I18N.zh[key];
    return !en || !zh || !App.t(key) || App.t(key) === key || en === zh;
  });
  check("game-paper-bridge", "the ten viaduct span names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each span in order
   * hands the player exactly the next one, all forty times. */
  const chain = App.createCampaign({
    key: "paper-bridge-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-paper-bridge", "the unlock chain walks all forty spans in order",
    walked === 40 && chained && chain.clearedCount() === 40, walked + " first clears");
};
