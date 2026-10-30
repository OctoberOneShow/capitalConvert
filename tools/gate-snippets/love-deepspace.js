"use strict";

/* game-love-deepspace: the summit tier teaches the one lever every shipped
 * route left unspent - the sixth turn. Routes 1-24 all kept it: the deep tier
 * squeezed the clock to six (22-24) but never through it, and every shipped
 * rung priced its star bands three, two and one turns under the budget, which
 * a five-turn mission has no slack turn to do. So the summit spends both
 * reserves at once: routes 25-30 are five-turn missions, and the gauge routes
 * 22-24 sold off (82, 88, 94) is bought back - 84 past 82, 88 level with
 * route 23, 96 past 94 - up to the full 120 ceiling on the last rung, which
 * no earlier route asked of fewer than ten turns.
 *
 * The bench is the module's own engine. The forge slices ldsAdvance out of
 * the module source verbatim and drives it at the mission's own starting
 * strength (72 energy, 56 trust - startRoute's values), and this gate drives
 * the live exports (App.ldsAdvance, App.ldsEvents under pickEvent's own law)
 * to the same effect; both benches see the same shares because a turn's
 * encounter is uniform over the six events under either law. The expert bench
 * is the forge's four policies across all five partners, 400 seeded missions
 * a cell: it clears every summit rung (wins 100/100/100/94/89/78% - the
 * first routes in this ladder whose win share ever moves) and finds a real
 * three-star line on every rung (27.3/24.5/2.3/23.8/18.8/9.8%), each rarer
 * than shipped route 24's 35.3. The bands are forced, not chosen: three
 * matched turns bank at most 105 (Xavier's 33 + 35 + 37), so the first three
 * rungs price the three-turn line and past 105 the line is dead - measured,
 * not assumed, at T=106 - and the band walks to the fourth turn.
 *
 * The cut test holds the lever down: a rest-heavy policy (energy floor 54)
 * that clears these rungs' six-turn twins 100/99/87/49/36/21% of the time
 * manages 97/93/73/5/0/0% on five - strictly worse on every rung - which is
 * the proof that the clock, not the target, is what the summit teaches.
 */

module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const forge = require(path.join(root, "tools", "lds-forge.js"));
  const routes = App.ldsRoutes || [];
  const summitIds = ["lds25", "lds26", "lds27", "lds28", "lds29", "lds30"];
  const expectedTargets = [84, 88, 96, 112, 116, 120];
  const expectedBands = [
    [3, 4, 5], [3, 4, 5], [3, 4, 5], [4, 5, 6], [4, 5, 6], [4, 5, 6],
  ];

  /* Structure: thirty rungs, distinct, lds1..lds30 in ladder order. */
  check("love-deepspace", "the ladder holds thirty routes",
    routes.length === 30, String(routes.length));
  check("love-deepspace", "every route id is distinct",
    new Set(routes.map((r) => r.id)).size === routes.length,
    routes.map((r) => r.id).join(","));
  const ordered = routes.every((r, i) => r.id === "lds" + (i + 1));
  check("love-deepspace", "the ids run lds1..lds30 in order", ordered,
    routes.map((r) => r.id).join(","));
  const shaped = routes.every((r) =>
    Number.isInteger(r.turns) && r.turns > 0 &&
    Number.isInteger(r.target) && r.target > 0 && r.target <= 120 &&
    Array.isArray(r.stars) && r.stars.length === 3 &&
    r.stars[0] < r.stars[1] && r.stars[1] < r.stars[2]);
  check("love-deepspace", "every route carries a target within the 120 gauge and rising star bands",
    shaped, routes.filter((r) => !shaped).length + " malformed");

  const summit = summitIds.map((id) => routes.find((r) => r.id === id));
  const shipped = routes.slice(0, 24);

  /* The lesson, structurally: the shipped ladder never spent the sixth turn
   * and never priced bands any way but three/two/one under the budget, while
   * the summit holds every mission to five turns. The 120 gauge was only ever
   * asked of clocks of ten turns or more; the summit pairs it with five. */
  const shippedClock = shipped.every((r) => r.turns >= 6);
  const shippedBands = shipped.every((r) =>
    r.stars[0] === r.turns - 3 && r.stars[1] === r.turns - 2 && r.stars[2] === r.turns - 1);
  const shippedFullGauge = shipped.filter((r) => r.target === 120).every((r) => r.turns >= 10);
  check("love-deepspace",
    "rungs 1-24 all keep at least six turns, bands three/two/one under budget, and never ask the full gauge of fewer than ten turns",
    shippedClock && shippedBands && shippedFullGauge,
    "min turns " + Math.min.apply(null, shipped.map((r) => r.turns)));
  const summitClock = summit.every((r) => r.turns === 5);
  const summitTargets = summit.every((r, i) => r.target === expectedTargets[i]) &&
    expectedTargets.every((t, i) => i === 0 || t > expectedTargets[i - 1]);
  const summitBands = summit.every((r, i) =>
    r.stars[0] === expectedBands[i][0] && r.stars[1] === expectedBands[i][1] &&
    r.stars[2] === expectedBands[i][2]);
  const gaugeBoughtBack = routes[23].target === 82 && summit[0].target > routes[23].target;
  check("love-deepspace",
    "the summit holds five turns, climbs the gauge 84<88<96<112<116<120 past route 24's 82, and ends at the 120 ceiling",
    summitClock && summitTargets && summitBands && gaugeBoughtBack,
    "targets " + summit.map((r) => r.target).join(","));
  /* The band walk is forced by the engine's own ceiling: three matched turns
   * bank at most 105, so the three-turn line prices every rung up to 105 and
   * no rung past it. */
  const walk = summit.every((r, i) =>
    (r.target <= 105) === (expectedBands[i][0] === 3));
  check("love-deepspace",
    "the three-star line rides the three-turn chain while it pays (target <= 105) and walks to the fourth turn past it",
    walk, summit.map((r) => r.target + ":" + r.stars.join("/")).join(" "));

  /* The forge reads the module source through its markers; the booted app
   * must agree with what it slices, or the design instrument and the game
   * have drifted apart. */
  const parsed = forge.loadAll();
  const sameData = JSON.stringify(parsed.routes) === JSON.stringify(routes) &&
    parsed.partners.length === App.ldsPartners.length &&
    parsed.moves.length === App.ldsMoves.length &&
    parsed.events.length === App.ldsEvents.length;
  check("love-deepspace", "the forge's sliced routes, partners, moves and events match the booted module",
    sameData, "routes " + (JSON.stringify(parsed.routes) === JSON.stringify(routes)));

  /* The engine bench, on the forge's drive of the module's own ldsAdvance.
     Start strength is the mission's own: 72 energy, 56 trust. */
  const baseline = forge.measure(parsed, routes[23], 400);
  check("love-deepspace",
    "the bench calibrates on shipped route 24: near-always won, three-star line about a third of runs",
    baseline.score.wins >= 99 && baseline.score.three > 30 && baseline.score.three < 40,
    "wins " + baseline.score.wins.toFixed(0) + "% 3-star " + baseline.score.three.toFixed(1) + "%");

  const expectedWins = [100, 100, 100, 94, 89, 78];
  const expectedThree = [27.3, 24.5, 2.3, 23.8, 18.8, 9.8];
  const rows = summit.map((route) => {
    const best = forge.measure(parsed, route, 400);
    return { route: route, best: best };
  });
  const winProblems = [];
  rows.forEach((row, i) => {
    if (Math.abs(row.best.score.wins - expectedWins[i]) > 0.5) {
      winProblems.push(row.route.id + " wins " + row.best.score.wins.toFixed(1) + " vs " + expectedWins[i]);
    }
    if (Math.abs(row.best.bestThree.score.three - expectedThree[i]) > 0.6) {
      winProblems.push(row.route.id + " 3-star " + row.best.bestThree.score.three.toFixed(1) + " vs " + expectedThree[i]);
    }
  });
  check("love-deepspace",
    "the expert bench clears every summit rung at the measured shares (wins 100/100/100/94/89/78%) and finds the measured three-star lines (27.3/24.5/2.3/23.8/18.8/9.8%)",
    winProblems.length === 0, winProblems.slice(0, 4).join(" | "));
  check("love-deepspace",
    "every summit rung stays winnable in a realistic share of runs",
    rows.every((row) => row.best.score.wins >= 60),
    rows.map((row) => row.route.id + " " + row.best.score.wins.toFixed(0) + "%").join(","));
  check("love-deepspace",
    "every summit three-star band is reachable but not free: real on some line, at most a quarter of runs, always rarer than route 24's 35.3",
    rows.every((row) => row.best.bestThree.score.three > 0 &&
      row.best.bestThree.score.three <= 30 &&
      row.best.bestThree.score.three < baseline.bestThree.score.three),
    rows.map((row) => row.route.id + " " + row.best.bestThree.score.three.toFixed(1) + "%").join(","));

  /* Monotone: wins never rise rung over rung, the three-star lines descend
     inside each band regime, and every rung is at or past route 24. */
  const winsSeries = rows.map((row) => row.best.score.wins);
  const winsMonotone = winsSeries.every((w, i) => i === 0 || w <= winsSeries[i - 1] + 1e-9);
  const regimeADescends = rows[0].best.bestThree.score.three > rows[1].best.bestThree.score.three &&
    rows[1].best.bestThree.score.three > rows[2].best.bestThree.score.three;
  const regimeBDescends = rows[3].best.bestThree.score.three > rows[4].best.bestThree.score.three &&
    rows[4].best.bestThree.score.three > rows[5].best.bestThree.score.three;
  check("love-deepspace",
    "the tier trends harder: wins never rise, the three-star line descends inside each band regime (27.3>24.5>2.3 and 23.8>18.8>9.8)",
    winsMonotone && regimeADescends && regimeBDescends,
    "wins " + winsSeries.map((w) => w.toFixed(0)).join("/") +
      " 3s " + rows.map((row) => row.best.bestThree.score.three.toFixed(1)).join("/"));
  check("love-deepspace",
    "every summit rung is at or past route 24: no more wins, a rarer three-star line, one turn less clock, a higher gauge",
    rows.every((row) => row.best.score.wins <= baseline.score.wins + 1e-9 &&
      row.best.bestThree.score.three < baseline.bestThree.score.three) &&
      summit.every((r) => r.turns < routes[23].turns && r.target > routes[23].target),
    "route 24: wins " + baseline.score.wins.toFixed(0) + "% 3-star " +
      baseline.bestThree.score.three.toFixed(1) + "%");

  /* The band walk is not a choice: at 106 the three-turn line is dead in the
     engine itself - the same five-turn economy, one point past the 105
     ceiling, finds no three-star line at all. */
  const deadLine = forge.measure(parsed,
    { id: "probe", labelKey: "x", turns: 5, target: 106, stars: [3, 4, 5] }, 400);
  check("love-deepspace",
    "past 105 the three-turn line is physically dead (no three-star line at T=106), which forces the walk to the fourth turn",
    deadLine.bestThree.score.three === 0,
    "T=106 best 3-star " + deadLine.bestThree.score.three.toFixed(1) + "%");

  /* The cut test: the nervous hand (energy floor 54) on the six-turn twins
     versus the same hand on the summit's five turns - strictly better on
     every rung with the sixth turn back. */
  const nervousFive = summit.map((route) => forge.nervousShare(parsed, route, 400));
  const nervousSix = summit.map((route) =>
    forge.nervousShare(parsed, Object.assign({}, route, { turns: 6 }), 400));
  const cutStrict = nervousFive.every((share, i) => nervousSix[i] > share);
  check("love-deepspace",
    "the clock is load-bearing: restoring the sixth turn lifts the nervous hand strictly on every rung (97/93/73/5/0/0 -> 100/99/87/49/36/21)",
    cutStrict && nervousSix[0] >= 99 && nervousFive[4] === 0 && nervousFive[5] === 0,
    "five " + nervousFive.map((s) => s.toFixed(0)).join("/") +
      " -> six " + nervousSix.map((s) => s.toFixed(0)).join("/"));

  /* The same bench through the booted module's own exports - App.ldsAdvance
     under pickEvent's own law, (floor(rand*len) + turn) % len - must agree
     with the forge's sliced engine: the game the player boots is the game
     the forge measured. */
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function playLive(route, partner, rng, policy) {
    let state = { energy: 72, trust: 56, resonance: 0, turn: 0, charge: 0, chain: 0, done: false, outcome: "" };
    for (let guard = 0; guard < route.turns + 2 && !state.done; guard += 1) {
      const encounter = App.ldsEvents[(Math.floor(rng() * App.ldsEvents.length) + state.turn) % App.ldsEvents.length];
      let move = App.ldsMoves.find((m) => m.id === encounter.ideal);
      const ideal = move;
      const idealGain = ideal.stats.resonance + 8 + Math.min(state.chain, 3) * 2;
      const need = route.target - state.resonance;
      if (state.charge >= 3 && partner.skill.resonance >= idealGain - 4) {
        move = { id: "skill" };
      } else if (state.energy <= policy.energyFloor + ideal.stats.energy * -1) {
        move = App.ldsMoves.find((m) => m.id === "recover");
      } else if (state.trust <= policy.trustFloor && need > 0) {
        const heart = App.ldsMoves.find((m) => m.id === "heart");
        if (state.energy + heart.stats.energy > 0) move = heart;
      }
      const next = App.ldsAdvance(state, move, partner, encounter, route);
      state = next === state ? App.ldsAdvance(state, ideal, partner, encounter, route) : next;
    }
    return state;
  }
  const liveProblems = [];
  rows.forEach((row, i) => {
    let bestWins = 0;
    let bestThree = 0;
    forge.POLICIES.forEach((policy) => {
      App.ldsPartners.forEach((partner) => {
        let wins = 0;
        let three = 0;
        const total = 300;
        for (let trial = 0; trial < total; trial += 1) {
          const rng = mulberry(trial * 7919 + row.route.target * 31 + partner.id.length);
          const s = playLive(row.route, partner, rng, policy);
          if (s.outcome !== "win") continue;
          wins += 1;
          if (s.turn <= row.route.stars[0]) three += 1;
        }
        bestWins = Math.max(bestWins, (100 * wins) / total);
        bestThree = Math.max(bestThree, (100 * three) / total);
      });
    });
    if (Math.abs(bestWins - row.best.score.wins) > 6) {
      liveProblems.push(row.route.id + " live wins " + bestWins.toFixed(0) +
        " vs forge " + row.best.score.wins.toFixed(0));
    }
    if (bestThree === 0) {
      liveProblems.push(row.route.id + " live bench finds no three-star line");
    }
  });
  check("love-deepspace",
    "the booted module's own ldsAdvance and encounter law reproduce the measured shares (within sampling noise) and a live three-star line on every rung",
    liveProblems.length === 0, liveProblems.slice(0, 4).join(" | "));

  /* The copy travels with the module in both languages: the six route names,
     the six memory lines, the hint's summit sentence and the guide's new-tier
     step. */
  const copyKeys = [];
  summitIds.forEach((id, i) => {
    copyKeys.push("ldsRoute" + (25 + i), "ldsMemory" + (25 + i));
  });
  const copyProblems = copyKeys.filter((key) =>
    !App.I18N || !App.I18N.en || !App.I18N.en[key] ||
    !App.I18N.zh || !App.I18N.zh[key] ||
    !App.t(key) || App.t(key) === key);
  check("love-deepspace", "the twelve summit route and memory strings resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
  const hintEn = (App.I18N && App.I18N.en && App.I18N.en.ldsHint) || "";
  const hintZh = (App.I18N && App.I18N.zh && App.I18N.zh.ldsHint) || "";
  check("love-deepspace",
    "the hint teaches the summit in both languages: five turns, the bought-back gauge, and the 105 three-turn ceiling",
    hintEn.indexOf("Summit: routes 25-30") !== -1 && hintEn.indexOf("105") !== -1 &&
      hintEn.indexOf("five turns") !== -1 &&
      hintZh.indexOf("巅峰段") !== -1 && hintZh.indexOf("105") !== -1 &&
      hintZh.indexOf("五个回合") !== -1,
    "en " + (hintEn.indexOf("Summit: routes 25-30") !== -1) +
      ", zh " + (hintZh.indexOf("巅峰段") !== -1));
  const guides = (App.getRegistryGuides ? App.getRegistryGuides() : [])
    .filter((entry) => entry.id === "loveDeepspace");
  const guideEn = guides.length && guides[0].en ? guides[0].en.join("\n") : "";
  const guideZh = guides.length && guides[0].zh ? guides[0].zh.join("\n") : "";
  check("love-deepspace",
    "the guide's new-tier step names the five-turn summit in both languages",
    guideEn.indexOf("New tier:") !== -1 && guideEn.indexOf("five turns") !== -1 &&
      guideEn.indexOf("120") !== -1 &&
      guideZh.indexOf("新层级") !== -1 && guideZh.indexOf("五个回合") !== -1 &&
      guideZh.indexOf("120") !== -1,
    "en " + (guideEn.indexOf("New tier:") !== -1) +
      ", zh " + (guideZh.indexOf("新层级") !== -1));

  /* The album keeps summit memories: the reader walks ldsRoutes, so a saved
     three-star on lds25 must survive the round trip. */
  const album = App.ldsReadAlbum(JSON.stringify({
    version: 1, selected: "xavier", bonds: {}, memories: { "xavier:lds25": 3, "caleb:lds30": 2 },
  }));
  check("love-deepspace",
    "the memory album persists summit clears per partner",
    album.memories["xavier:lds25"] === 3 && album.memories["caleb:lds30"] === 2,
    JSON.stringify(album.memories));

  /* The unlock chain is derived, never stored: clearing each route in order
     hands the player exactly the next one, all thirty times. */
  const chain = App.createCampaign({
    key: "love-deepspace-gate-chain",
    levels: routes.map((r) => ({ id: r.id, labelKey: r.labelKey })),
  });
  let walked = 0;
  let chained = true;
  routes.forEach((route, index) => {
    const outcome = chain.record(route.id, { stars: 3, best: 3, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < routes.length ? routes[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("love-deepspace", "the unlock chain walks all thirty routes in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
