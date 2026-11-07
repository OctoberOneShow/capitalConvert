"use strict";

/* game-kalah-row: the whole ladder replays the forge's seeded bench, and
 * the audit tier is held to its own design brief
 *
 * The forge (tools/kalah-forge.js) transcribes the panel's own sowing
 * arithmetic (malSow / malOver / malScore / malBestMove) and asks the row
 * the four questions the static check has always asked: the fixed reference
 * player (3-4 plies, the habits a teaching rank assumes) beats each rank
 * outright in at least 5% of forty seeded games and by its own three-star
 * band in at least 15%, the bands cut where starsFor says they cut, the
 * sowing walk conserves its stones, and the unlock chain is derived. This
 * gate re-judges the whole shipped ladder through that bench, then reads
 * the audit tier 31-40 the way its comment advertises: the ring's own
 * search and prices carry (depth eight, keep sixteen, threat four and a
 * half, tempo five, count twenty-eight, budget three thousand), the
 * refusal steps to seven stones, the blind sow drains to zero, and the
 * toll climbs past the gilded ring - 27, 29, 31, 33, 35, 37, 39 - on
 * tells of eighteen, twenty-four and thirty-three in a hundred. Every
 * record is a number the engine printed, scoped by position: the first
 * seven-stone refusal, the first flub under four percent among ranks that
 * err at all, the first erring rank to stop blundering outright, the toll
 * and tell steps, and the capstone's dearest two-star band. Each record is
 * also proved load-bearing by cutting it out of a copy of its own rank and
 * re-benching the cut on the same stream - the measured share moves, and
 * the exact numbers are asserted below. The audit's dead levers are
 * asserted dead too: the ring with a wider count and a deeper budget
 * benches game for game with the seamless ring, which is why the tier
 * rides the four levers that bite.
 *
 * The breach tier 41-44 is read the way its comment advertises: the Clear
 * Eye's clean play carries (the audit's ring, flub zero, refusal seven),
 * the tell opens past the audit's widest - 48, 53, 57 and 63 in a hundred -
 * and pays the first asks past the wall of forty, where a rout's margin
 * pays in pairs of stones: forty-one leaves the rival three, forty-three
 * leaves him two. The (toll, two-star) pair climbs strictly rung over
 * rung - 41/28, 41/30, 43/30, 43/32 - both lines past the capstone's own
 * 39 and 25, the tell climbs with it, and the bench holds every rung to
 * the fairness floor. The tier's records are cut two ways: the tell closed
 * back to the audit's 0.33 drops both breach bands off the floor (12.5%
 * and 7.5% - the audit's own play cannot pay the wall), and each rung's
 * ask cut moves the measured share the moment it lands. The shutout tolls
 * 45 and 47 are asserted unreachable: benched across the tell range they
 * never clear the floor, so the purse has no more stones to give.
 *
 * The last stones 45-50 close the ladder. The audit capped the breach by
 * benching the shutout asks and stepping over the forty-four; the
 * forty-four ships on the Confession's own tell at exactly the floor's
 * share, and the tier's hand never changes - every rung keeps the
 * Confession's search, prices, refusal, blind sow, tell and flub, and
 * deepens only the asks: the toll takes the forty-four and holds it, the
 * two-star line climbs 33, 35, 37, 39, 41, 42 beneath it, and the gap
 * between the stars closes 11, 9, 7, 5, 3, 2. The gate re-benches every
 * rung (the toll at the floor, the bench winning three games in four
 * outright, the two-star line thinning 32.5 -> 20 -> 20 -> 17.5 -> 17.5
 * -> 17.5), holds the hand unchanged, and the shutout tolls stay dead
 * beside it. */
module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const kalahForge = require(path.join(root, "tools", "kalah-forge.js"));
  const kalah = kalahForge.loadApi();
  const ranks = kalah.malRanks;
  const byId = {};
  ranks.forEach((rank) => { byId[rank.id] = rank; });
  const posOf = (id) => ranks.findIndex((rank) => rank.id === id);
  const before = (id) => ranks.slice(0, posOf(id));

  check("game-kalah-row", "the bench ladder holds fifty ranks",
    ranks.length === 50, String(ranks.length));
  check("game-kalah-row", "every rank id is distinct",
    new Set(ranks.map((rank) => rank.id)).size === ranks.length);
  check("game-kalah-row", "the ids run m1 through m50 in order",
    ranks.every((rank, index) => rank.id === "m" + (index + 1)),
    ranks.map((rank) => rank.id).join(","));

  /* The forge's bench rolls its own deterministic stream, but the seeded
   * swap keeps the run deterministic wherever the booted app reaches for
   * Math.random - the flip probe below is one of those places. */
  const seeded = (seed, fn) => {
    const real = Math.random;
    let a = seed >>> 0;
    Math.random = () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    try { return fn(); } finally { Math.random = real; }
  };

  /* The reference bench, re-run over the whole shipped ladder - the audit
   * tier included, so the new rungs cannot ship with a quietly broken
   * elder: beaten outright in at least 5% of the forty games and by the
   * rank's own three-star band in at least 15%. */
  ranks.forEach((rank) => {
    const verdict = kalahForge.fairness(kalah, rank);
    check("game-kalah-row", `${rank.id} survives the reference bench`,
      verdict.wins >= 5 && verdict.top >= 15,
      `band ${rank.margin[0]} at ${verdict.top.toFixed(1)}% (wins ${verdict.wins.toFixed(1)}%)`);
  });

  /* The sowing walk, through the engine: the rival store stays shut, a lap
   * banks and earns another go, a last stone in a vacant home pit takes the
   * facing stack with the pairing stone, the mirror shape pays the rival,
   * and forty seeded rounds conserve their forty-eight stones to the end. */
  const total = (cells) => cells.reduce((sum, n) => sum + n, 0);
  const lone = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];
  const skip = kalah.malSow(lone, 6, "you");
  check("game-kalah-row", "a sow steps over the shut rival store",
    skip.extra === false && skip.cells[7] === 0 && skip.cells[8] === 1 &&
      total(skip.cells) === 1,
    JSON.stringify(skip.cells));
  const lap = kalah.malSow([0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0], 6, "you");
  check("game-kalah-row", "a seven-stone lap banks in the own store and frees another sow",
    lap.extra === true && lap.cells[0] === 1 && lap.cells[7] === 0 &&
      total(lap.cells) === 7,
    JSON.stringify(lap.cells));
  const capture = kalah.malSow([0, 0, 0, 3, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0], 3, "you");
  check("game-kalah-row", "a last stone in a vacant home pit takes the facing stack, pairing stone banked",
    capture.captured === 2 && capture.cells[0] === 3 && capture.cells[6] === 0 &&
      capture.cells[8] === 0 && total(capture.cells) === 5,
    JSON.stringify(capture.cells));
  const mirror = kalah.malSow([0, 0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0], 9, "ai");
  check("game-kalah-row", "the mirror shape played by the rival feeds their store, not ours",
    mirror.captured === 2 && mirror.cells[7] === 3 && mirror.cells[0] === 0,
    JSON.stringify(mirror.cells));
  let conserved = true;
  seeded(20261031, () => {
    for (let game = 0; game < 40 && conserved; game += 1) {
      let cells = kalah.malFresh();
      let who = "you";
      for (let sows = 0; sows < 400 && !kalah.malOver(cells); sows += 1) {
        const moves = kalah.malLegal(cells, who);
        if (!moves.length) break;
        const index = moves[Math.floor(Math.random() * moves.length)];
        const step = kalah.malSow(cells, index, who);
        cells = step.cells;
        if (total(cells) !== 48) conserved = false;
        if (!step.extra) who = who === "you" ? "ai" : "you";
      }
      if (!kalah.malOver(cells)) conserved = false;
    }
  });
  check("game-kalah-row", "forty seeded rounds conserve their stones and always end",
    conserved);

  /* The star bands: App.starsFor must cut 3/2/1/0 exactly on every rank's
   * own margin ladder - the bench's "band" numbers are meaningless if the
   * bands do not cut where the table says. */
  check("game-kalah-row", "every rank's star bands cut at its own margin ladder",
    ranks.every((rank) =>
      App.starsFor(rank.margin[0], rank.margin, "high") === 3 &&
      App.starsFor(rank.margin[0] - 1, rank.margin, "high") === 2 &&
      App.starsFor(rank.margin[1], rank.margin, "high") === 2 &&
      App.starsFor(rank.margin[1] - 1, rank.margin, "high") === 1 &&
      App.starsFor(rank.margin[2], rank.margin, "high") === 1 &&
      App.starsFor(rank.margin[2] - 1, rank.margin, "high") === 0),
    ranks.filter((rank) =>
      App.starsFor(rank.margin[0], rank.margin, "high") !== 3 ||
      App.starsFor(rank.margin[2] - 1, rank.margin, "high") !== 0)
      .map((rank) => rank.id).join(","));

  /* The shape the tiers advertise. The ransom tier keeps the seamless
   * ring's play and its climb; the audit tier carries the ring's search
   * and prices, steps the refusal to seven, drains the blind sow, and
   * never lets the toll, tell or two-star line fall - while every rank's
   * own margin ladder still falls strictly. */
  const ransom = ["m25", "m26", "m27", "m28", "m29", "m30"].map((id) => byId[id]);
  check("game-kalah-row", "the ransom tier keeps the seamless ring's play",
    ransom.every((rank) =>
      rank.depth === 8 && rank.noise === 0 && rank.keep === 16 && rank.threat === 4.5 &&
      rank.deny === 6 && rank.tempo === 5 && rank.count === 28 && rank.nodes === 3000 &&
      rank.flub === 0.04),
    JSON.stringify(ransom));
  check("game-kalah-row", "the ransom climbs - five, nine, thirteen, seventeen, nineteen, twenty-five",
    ransom.map((rank) => rank.margin[0]).join(",") === "5,9,13,17,19,25",
    ransom.map((rank) => rank.margin[0]).join(","));
  const audit = ranks.slice(30, 40);
  const breach = ranks.slice(40, 44);
  const stones = ranks.slice(44);
  check("game-kalah-row", "the audit tier is present",
    audit.length === 10 && audit.every((rank, index) => rank.id === "m" + (31 + index)),
    audit.map((rank) => rank.id).join(","));
  check("game-kalah-row", "the audit tier carries the ring's search and prices",
    audit.every((rank) =>
      rank.depth === 8 && rank.noise === 0 && rank.keep === 16 && rank.threat === 4.5 &&
      rank.tempo === 5 && rank.count === 28 && rank.nodes === 3000),
    audit.map((rank) => rank.id + ":d" + rank.depth + "/k" + rank.keep).join(" "));
  check("game-kalah-row", "the audit tier's toll line never falls - 25 up to 39",
    audit.map((rank) => rank.margin[0]).join(",") === "25,25,25,27,29,31,33,35,37,39",
    audit.map((rank) => rank.margin[0]).join(","));
  check("game-kalah-row", "the audit tier's tell line never falls - 12 to 18, 24, 33 in a hundred",
    audit.map((rank) => rank.slip).join(",") === "0.12,0.12,0.12,0.18,0.18,0.18,0.24,0.33,0.33,0.33",
    audit.map((rank) => rank.slip).join(","));
  check("game-kalah-row", "the audit tier's two-star line never falls - 15 up to 25",
    audit.map((rank) => rank.margin[1]).join(",") === "15,15,15,16,17,19,20,21,22,25",
    audit.map((rank) => rank.margin[1]).join(","));
  check("game-kalah-row", "the audit tier's blind sow drains - four percent to zero",
    audit.map((rank) => rank.flub).join(",") === "0.04,0.02,0,0,0,0,0,0,0,0" &&
      audit.every((rank) => rank.deny === 7),
    audit.map((rank) => rank.flub + "/" + rank.deny).join(" "));
  check("game-kalah-row", "the ladder's search never steps back and every margin ladder falls",
    ranks.every((rank, index) => index === 0 || rank.depth >= ranks[index - 1].depth) &&
      ranks.every((rank) =>
        rank.margin[0] > rank.margin[1] && rank.margin[1] > rank.margin[2]),
    "depths " + ranks.map((rank) => rank.depth).join(",") );

  /* The tier census: the forge's own stream, benched live, pinned exactly -
   * these are the numbers the shipped comments advertise. */
  const census = {};
  audit.forEach((rank) => {
    const verdict = kalahForge.shares(kalah, rank);
    census[rank.id] = verdict;
  });
  const wantCensus = {
    m31: [25, 35, 45], m32: [32.5, 42.5, 47.5], m33: [17.5, 20, 30],
    m34: [32.5, 40, 52.5], m35: [27.5, 37.5, 52.5], m36: [20, 35, 52.5],
    m37: [17.5, 30, 50], m38: [20, 25, 52.5], m39: [20, 25, 52.5],
    m40: [15, 22.5, 52.5],
  };
  audit.forEach((rank) => {
    const want = wantCensus[rank.id];
    const got = census[rank.id];
    check("game-kalah-row",
      `${rank.id} benches on the shipped numbers: band ${want[0]}%, two-star ${want[1]}%, wins ${want[2]}%`,
      got.top === want[0] && got.mid === want[1] && got.win === want[2],
      `measured ${got.top}/${got.mid}/${got.win}`);
  });

  /* The records, each held against every rung shipped before it - scoped
   * by position, since later tiers legitimately overtake earlier ones. */
  check("game-kalah-row",
    "m31 prices the refusal at seven stones, one past every earlier rank",
    byId.m31.deny === 7 && before("m31").every((rank) => (rank.deny || 0) < 7),
    "previous peak " + Math.max.apply(null, before("m31").map((rank) => rank.deny || 0)));
  check("game-kalah-row",
    "m32 halves the blind sow, under any earlier rank that errs at all",
    byId.m32.flub === 0.02 && before("m32").filter((rank) => rank.flub !== undefined)
      .every((rank) => rank.flub > 0.02),
    "previous floor " + Math.min.apply(null, before("m32")
        .filter((rank) => rank.flub !== undefined).map((rank) => rank.flub)));
  check("game-kalah-row",
    "m33 is the first erring rank of the forty to stop blundering outright",
    byId.m33.flub === 0 && before("m33").filter((rank) => rank.flub !== undefined)
      .every((rank) => rank.flub > 0),
    "previous floor " + Math.min.apply(null, before("m33")
        .filter((rank) => rank.flub !== undefined).map((rank) => rank.flub)));
  check("game-kalah-row",
    "m34 steps the toll past the gilded ring and widens the tell past the ransom's",
    byId.m34.margin[0] === 27 && before("m34").every((rank) => rank.margin[0] < 27) &&
      byId.m34.slip === 0.18 && before("m34").every((rank) => (rank.slip || 0) < 0.18),
    "previous peaks toll " + Math.max.apply(null, before("m34").map((rank) => rank.margin[0])) +
      ", tell " + Math.max.apply(null, before("m34").map((rank) => rank.slip || 0)));
  check("game-kalah-row",
    "m35 asks twenty-nine, past every rank before it",
    byId.m35.margin[0] === 29 && before("m35").every((rank) => rank.margin[0] < 29),
    "previous peak " + Math.max.apply(null, before("m35").map((rank) => rank.margin[0])));
  check("game-kalah-row",
    "m36 asks thirty-one, past every rank before it",
    byId.m36.margin[0] === 31 && before("m36").every((rank) => rank.margin[0] < 31),
    "previous peak " + Math.max.apply(null, before("m36").map((rank) => rank.margin[0])));
  check("game-kalah-row",
    "m37 asks thirty-three on a twenty-four-in-a-hundred tell, both past every rank before it",
    byId.m37.margin[0] === 33 && before("m37").every((rank) => rank.margin[0] < 33) &&
      byId.m37.slip === 0.24 && before("m37").every((rank) => (rank.slip || 0) < 0.24),
    "previous peaks toll " + Math.max.apply(null, before("m37").map((rank) => rank.margin[0])) +
      ", tell " + Math.max.apply(null, before("m37").map((rank) => rank.slip || 0)));
  check("game-kalah-row",
    "m38 asks thirty-five on the widest tell the row has dealt, both past every rank before it",
    byId.m38.margin[0] === 35 && before("m38").every((rank) => rank.margin[0] < 35) &&
      byId.m38.slip === 0.33 && before("m38").every((rank) => (rank.slip || 0) < 0.33),
    "previous peaks toll " + Math.max.apply(null, before("m38").map((rank) => rank.margin[0])) +
      ", tell " + Math.max.apply(null, before("m38").map((rank) => rank.slip || 0)));
  check("game-kalah-row",
    "m39 asks thirty-seven, past every rank before it",
    byId.m39.margin[0] === 37 && before("m39").every((rank) => rank.margin[0] < 37),
    "previous peak " + Math.max.apply(null, before("m39").map((rank) => rank.margin[0])));
  check("game-kalah-row",
    "m40 pairs the records: the largest toll in the row and the dearest two-star band",
    byId.m40.margin[0] === 39 && before("m40").every((rank) => rank.margin[0] < 39) &&
      byId.m40.margin[1] === 25 && before("m40").every((rank) => rank.margin[1] < 25),
    "previous peaks toll " + Math.max.apply(null, before("m40").map((rank) => rank.margin[0])) +
      ", two-star " + Math.max.apply(null, before("m40").map((rank) => rank.margin[1])));

  /* The audit's dead levers, asserted dead: give the seamless ring a
   * thirty-stone read and a thirty-six-hundred budget - the two ceilings
   * the tier was tempted by - and the forty bench games come back
   * game for game identical, which is why the tier rides the four levers
   * that bite instead. */
  const deadLevers = Object.assign({}, ransom[5], {
    count: 30, nodes: 3600, id: "m30-dead",
  });
  const ringBench = kalahForge.bench(kalah, ransom[5]);
  const deadBench = kalahForge.bench(kalah, deadLevers);
  check("game-kalah-row",
    "a wider count and budget bench dead: game for game with the seamless ring",
    ringBench.length === deadBench.length &&
      ringBench.every((margin, index) => margin === deadBench[index]),
    "first divergence at game " +
      ringBench.findIndex((margin, index) => margin !== deadBench[index]));

  /* The refusal's flip, on a live board through the engine's own search:
   * at six stones on the price the hand sows pit ten and leaves the rival
   * a star pit; at seven it refuses. Both probe hands run stilled (no
   * flub, no tell) so the flip is the price's own doing, on the stubbed
   * stream. */
  const flipBoard = [11, 2, 1, 0, 1, 3, 3, 6, 5, 3, 0, 11, 0, 2];
  const still = (rank) => Object.assign({}, rank, { slip: 0, flub: 0 });
  const flip = seeded(41027, () => ({
    old: kalah.malBestMove(flipBoard, "ai", 8, 0, still(Object.assign({}, byId.m31, { deny: 6 }))),
    yes: kalah.malBestMove(flipBoard, "ai", 8, 0, still(byId.m31)),
  }));
  const afterOld = kalah.malSow(flipBoard, flip.old, "ai");
  const afterYes = kalah.malSow(flipBoard, flip.yes, "ai");
  check("game-kalah-row",
    "the refusal flips a live board: six stones sows and leaves a star pit, seven refuses",
    flip.old === 9 && flip.yes === 13 &&
      kalah.malThreats(afterOld.cells, "you") === 1 &&
      kalah.malThreats(afterYes.cells, "you") === 0,
    `old ${flip.old} -> ${kalah.malThreats(afterOld.cells, "you")} rival stars, ` +
      `new ${flip.yes} -> ${kalah.malThreats(afterYes.cells, "you")}`);
  /* The exact solver, on boards whose rounds are forced by hand: the AI's
   * only sow empties its own row onto the human's side, so the solved
   * outcome is knowable without the search - a loss from the bare board,
   * a win from the banked board - and the solver must answer both through
   * the engine's own arithmetic. */
  const bareBoard = [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
  const bankedBoard = [0, 1, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 1];
  const solvedBare = seeded(41028, () => kalahForge.solveRound(kalah, bareBoard, "ai", 200000));
  const solvedBanked = seeded(41029, () => kalahForge.solveRound(kalah, bankedBoard, "ai", 200000));
  const bareStep = kalah.malSow(bareBoard, 13, "ai");
  const bankedStep = kalah.malSow(bankedBoard, 13, "ai");
  check("game-kalah-row",
    "the exact solver reads the forced boards through the engine's own arithmetic",
    solvedBare.value === -1 && solvedBanked.value === 1 &&
      kalah.malOver(bareStep.cells) && kalah.malOver(bankedStep.cells) &&
      kalah.malScore(bareStep.cells, "ai") < 0 &&
      kalah.malScore(bankedStep.cells, "ai") > 0,
    `bare ${solvedBare.value}, banked ${solvedBanked.value}`);

  /* The cut benches: each record reverted in a copy of its own rank and
   * re-benched on the same stream - the measured share must move, and the
   * exact numbers below are the ones the shipped comments pin. */
  const cutCensus = {
    m31: [20, 37.5, 47.5], m32: [25, 35, 45], m33: [32.5, 42.5, 47.5],
    m34: [15, 20, 30], m35: [32.5, 40, 52.5], m36: [27.5, 37.5, 52.5],
    m37: [10, 20, 30], m38: [5, 20, 30], m39: [2.5, 20, 30],
    m40: [20, 25, 52.5],
  };
  audit.forEach((rank) => {
    const cut = kalahForge.TIER_CUTS[rank.id];
    const verdict = kalahForge.shares(kalah, Object.assign({}, rank, cut.patch));
    const want = cutCensus[rank.id];
    check("game-kalah-row",
      `${rank.id} cut (${cut.label}) moves the bench off its shipped numbers`,
      verdict.top === want[0] && verdict.mid === want[1] && verdict.win === want[2] &&
        (verdict.top !== census[rank.id].top || verdict.mid !== census[rank.id].mid),
      `cut measured ${verdict.top}/${verdict.mid}/${verdict.win}, want ${want.join("/")}`);
  });

  /* The breach tier 41-44: the shape its comment advertises. The Clear
   * Eye's clean play carries - the audit's ring, flub zero, refusal seven -
   * the tell opens past the audit's widest to pay the first asks past the
   * wall of forty, and the (toll, two-star) pair climbs strictly rung over
   * rung, both lines past the capstone's own 39 and 25. */
  check("game-kalah-row", "the breach tier is present",
    breach.length === 4 && breach.every((rank, index) => rank.id === "m" + (41 + index)),
    breach.map((rank) => rank.id).join(","));
  check("game-kalah-row", "the breach tier carries the Clear Eye's clean play",
    breach.every((rank) =>
      rank.depth === 8 && rank.noise === 0 && rank.keep === 16 && rank.threat === 4.5 &&
      rank.deny === 7 && rank.tempo === 5 && rank.count === 28 && rank.nodes === 3000 &&
      rank.flub === 0),
    JSON.stringify(breach));
  check("game-kalah-row",
    "the breach tier's pair climbs strictly - 41/28, 41/30, 43/30, 43/32",
    breach.every((rank, index) => index === 0 ||
      rank.margin[0] > breach[index - 1].margin[0] ||
      (rank.margin[0] === breach[index - 1].margin[0] &&
        rank.margin[1] > breach[index - 1].margin[1])) &&
      breach.map((rank) => rank.margin[0]).join(",") === "41,41,43,43" &&
      breach.map((rank) => rank.margin[1]).join(",") === "28,30,30,32",
    breach.map((rank) => rank.margin[0] + "/" + rank.margin[1]).join(" "));
  check("game-kalah-row",
    "the breach tier's tell opens past the audit's widest and climbs rung over rung",
    breach.map((rank) => rank.slip).join(",") === "0.48,0.53,0.57,0.63" &&
      breach.every((rank) => rank.slip > 0.33),
    breach.map((rank) => rank.slip).join(","));
  check("game-kalah-row",
    "m41 is the first rank past the wall of forty: toll and two-star both past every earlier rank",
    byId.m41.margin[0] === 41 && before("m41").every((rank) => rank.margin[0] < 41) &&
      byId.m41.margin[1] === 28 && before("m41").every((rank) => rank.margin[1] < 28),
    "previous peaks toll " + Math.max.apply(null, before("m41").map((rank) => rank.margin[0])) +
      ", two-star " + Math.max.apply(null, before("m41").map((rank) => rank.margin[1])));
  check("game-kalah-row",
    "m43 is the second breach: the toll steps to forty-three, past every rank before it",
    byId.m43.margin[0] === 43 && before("m43").every((rank) => rank.margin[0] < 43),
    "previous peak " + Math.max.apply(null, before("m43").map((rank) => rank.margin[0])));
  check("game-kalah-row",
    "m44 is the Full Confession: the dearest two-star in the row on the widest tell",
    byId.m44.margin[1] === 32 && before("m44").every((rank) => rank.margin[1] < 32) &&
      byId.m44.slip === 0.63 && before("m44").every((rank) => (rank.slip || 0) < 0.63),
    "previous peaks two-star " + Math.max.apply(null, before("m44").map((rank) => rank.margin[1])) +
      ", tell " + Math.max.apply(null, before("m44").map((rank) => rank.slip || 0)));

  /* The breach census: the forge's own stream, benched live, pinned exactly
   * - the three-star band holds the fairness floor on three of the four
   * rungs while the wins climb as the tell widens, and the middle of the
   * distribution fattens with it. */
  const breachCensus = {};
  breach.forEach((rank) => {
    breachCensus[rank.id] = kalahForge.shares(kalah, rank);
  });
  const wantBreachCensus = {
    m41: [15, 20, 55], m42: [22.5, 25, 65], m43: [15, 32.5, 62.5], m44: [15, 37.5, 75],
  };
  breach.forEach((rank) => {
    const want = wantBreachCensus[rank.id];
    const got = breachCensus[rank.id];
    check("game-kalah-row",
      `${rank.id} benches on the shipped numbers: band ${want[0]}%, two-star ${want[1]}%, wins ${want[2]}%`,
      got.top === want[0] && got.mid === want[1] && got.win === want[2],
      `measured ${got.top}/${got.mid}/${got.win}`);
  });

  /* The star bands are honest on the bench's own line: the three-star band
   * lands in at least six of the forty games (the fairness floor's share,
   * the same standard the whole ladder rides), the two-star band has games
   * of its own, and a dawdling win - a game won by less than the two-star
   * ask - lands in a quarter or more of them, so the one-star line is a
   * real road and not a lottery ticket. */
  breach.forEach((rank) => {
    const margins = kalahForge.bench(kalah, rank);
    const threeStar = margins.filter((m) => m >= rank.margin[0]).length;
    const twoStarOnly = margins.filter((m) =>
      m >= rank.margin[1] && m < rank.margin[0]).length;
    const dawdlers = margins.filter((m) => m >= 1 && m < rank.margin[1]).length;
    check("game-kalah-row",
      `${rank.id} stars off the bench's own line: three-star ${threeStar}/40, ` +
        `two-star ${twoStarOnly}/40, dawdling wins ${dawdlers}/40`,
      threeStar === { m41: 6, m42: 9, m43: 6, m44: 6 }[rank.id] &&
        twoStarOnly === { m41: 2, m42: 1, m43: 7, m44: 9 }[rank.id] &&
        dawdlers === { m41: 14, m42: 16, m43: 12, m44: 15 }[rank.id] &&
        threeStar >= 6 && dawdlers >= 10,
      `measured ${threeStar}/${twoStarOnly}/${dawdlers}`);
  });

  /* The breach cuts: the tier's records reverted in copies of their own
   * ranks and re-benched on the same stream. Close the tell to the audit's
   * 0.33 and both breach bands fall off the fairness floor - the audit's
   * own play cannot pay the wall, so the tell is what pays it. Cut the ask
   * and the share moves the moment it lands: the capstone's toll back under
   * each breach, the capstone's two-star back under the first and the
   * last. */
  const breachTellCuts = {
    m41: [12.5, 22.5, 52.5], m42: [12.5, 22.5, 52.5],
    m43: [7.5, 22.5, 52.5], m44: [7.5, 22.5, 52.5],
  };
  breach.forEach((rank) => {
    const cut = kalahForge.TIER_CUTS[rank.id];
    const verdict = kalahForge.shares(kalah, Object.assign({}, rank, cut.patch));
    const want = breachTellCuts[rank.id];
    check("game-kalah-row",
      `${rank.id} cut (${cut.label}) drops the breach band off the floor`,
      verdict.top === want[0] && verdict.mid === want[1] && verdict.win === want[2] &&
        verdict.top < 15 && verdict.top !== breachCensus[rank.id].top,
      `cut measured ${verdict.top}/${verdict.mid}/${verdict.win}, want ${want.join("/")}`);
  });
  const breachAskCuts = [
    ["m41", { margin: [39, 28, 1] }, [17.5, 20, 55]],
    ["m42", { margin: [39, 30, 1] }, [25, 25, 65]],
    ["m43", { margin: [39, 30, 1] }, [22.5, 32.5, 62.5]],
    ["m44", { margin: [39, 32, 1] }, [17.5, 37.5, 75]],
    ["m41", { margin: [41, 25, 1] }, [15, 22.5, 55]],
    ["m44", { margin: [43, 25, 1] }, [15, 50, 75]],
  ];
  breachAskCuts.forEach((entry) => {
    const rank = byId[entry[0]];
    const verdict = kalahForge.shares(kalah, Object.assign({}, rank, entry[1]));
    const want = entry[2];
    const base = breachCensus[rank.id];
    check("game-kalah-row",
      `${rank.id} ask cut (${JSON.stringify(entry[1])}) moves the measured share`,
      verdict.top === want[0] && verdict.mid === want[1] && verdict.win === want[2] &&
        (verdict.top !== base.top || verdict.mid !== base.mid),
      `cut measured ${verdict.top}/${verdict.mid}/${verdict.win}, want ${want.join("/")}`);
  });

  /* The shutout tolls, asserted unreachable: a rout's margin pays in pairs
   * of stones, so forty-five asks the rival keep one and forty-seven asks
   * a shutout - and across the tell range, from the audit's own 0.33
   * through the widest the tier ships to the runner-up sow on every hand,
   * neither band ever clears the fairness floor. The purse has no more
   * stones to give. */
  const shutoutShares = [0.33, 0.44, 0.63, 1].map((slip) => {
    const margins = kalahForge.bench(kalah,
      Object.assign({}, byId.m44, { slip: slip, margin: [45, 30, 1] }));
    const share = (need) =>
      (100 * margins.filter((m) => m >= need).length) / margins.length;
    return [share(45), share(47)];
  });
  check("game-kalah-row",
    "the shutout tolls never clear the floor on any tell - " +
      shutoutShares.map((s) => s.join("/")).join(", "),
    JSON.stringify(shutoutShares) === JSON.stringify([[5, 2.5], [12.5, 12.5], [10, 10], [0, 0]]) &&
      shutoutShares.every((s) => s[0] < 15 && s[1] < 15),
    JSON.stringify(shutoutShares));

  /* ---- the last stones 45-50: the tier that closes the gap ---- */
  /* The audit stepped over a stone to cap the ladder: it benched the
   * shutout asks forty-five and forty-seven and never benched the
   * forty-four. The forty-four ships - on the Confession's own tell the
   * reference player beats it by exactly the floor's share - and the
   * tier's hand never changes: every rung keeps the Confession's depth,
   * prices, refusal, blind sow, tell and flub, and deepens only the asks.
   * The three-star toll takes the forty-four and holds it; the two-star
   * line climbs beneath it - 33, 35, 37, 39, 41, 42 - and the gap between
   * the stars closes 11, 9, 7, 5, 3, 2. */
  check("game-kalah-row", "the last-stones tier is present",
    stones.length === 6 && stones.every((rank, index) => rank.id === "m" + (45 + index)),
    stones.map((rank) => rank.id).join(","));
  check("game-kalah-row", "the last stones carry the Confession's unchanged hand",
    stones.every((rank) =>
      rank.depth === byId.m44.depth && rank.noise === byId.m44.noise &&
      rank.keep === byId.m44.keep && rank.threat === byId.m44.threat &&
      rank.deny === byId.m44.deny && rank.tempo === byId.m44.tempo &&
      rank.count === byId.m44.count && rank.nodes === byId.m44.nodes &&
      rank.slip === byId.m44.slip && rank.flub === byId.m44.flub),
    JSON.stringify(stones.map((rank) => [rank.depth, rank.slip, rank.deny])));
  check("game-kalah-row",
    "the three-star toll takes the forty-four and holds it - the stone the shutout audit stepped over",
    stones.every((rank) => rank.margin[0] === 44) &&
      ranks.slice(0, 44).every((rank) => rank.margin[0] < 44),
    stones.map((rank) => rank.margin[0]).join(","));
  check("game-kalah-row",
    "the two-star line climbs where the ladder never walked - past the Confession's thirty-two",
    stones.map((rank) => rank.margin[1]).join(",") === "33,35,37,39,41,42" &&
      stones.every((rank, index) => index === 0 || rank.margin[1] > stones[index - 1].margin[1]) &&
      ranks.slice(0, 44).every((rank) => rank.margin[1] < 33),
    stones.map((rank) => rank.margin[1]).join(","));
  check("game-kalah-row",
    "the gap between the stars closes - 11, 9, 7, 5, 3, 2 - and no earlier rank at the wall ever carried a pair this tight",
    stones.map((rank) => rank.margin[0] - rank.margin[1]).join(",") === "11,9,7,5,3,2" &&
      ranks.slice(0, 44).every((rank) => rank.margin[0] < 40 || rank.margin[0] - rank.margin[1] > 2),
    stones.map((rank) => rank.margin[0] - rank.margin[1]).join(","));
  /* The shares, re-benched here: the breach band holds the floor share it
   * opened at, the bench wins three games in four outright on every rung,
   * and the two-star line thins as the toll climbs - quantized the way
   * forty games are. */
  const stonesCensus = {};
  stones.forEach((rank) => {
    stonesCensus[rank.id] = kalahForge.shares(kalah, rank);
  });
  check("game-kalah-row",
    "the last stones' measured shares: the toll holds 15.0 at the floor, the bench wins 75 outright," +
      " and the two-star line thins 32.5 -> 20 -> 20 -> 17.5 -> 17.5 -> 17.5",
    stones.every((rank) => stonesCensus[rank.id].top === 15 && stonesCensus[rank.id].win === 75) &&
      JSON.stringify(stones.map((rank) => stonesCensus[rank.id].mid)) ===
        JSON.stringify([32.5, 20, 20, 17.5, 17.5, 17.5]),
    stones.map((rank) => rank.id + " " + stonesCensus[rank.id].top + "/" +
      stonesCensus[rank.id].mid + "/" + stonesCensus[rank.id].win).join(", "));

  /* The breach tier's names travel with the module: both languages hold a
   * real string for every new rank, and t() never falls back to the key. */
  check("game-kalah-row", "the audit tier's ten rank names resolve in both languages",
    audit.every((rank) => {
      const en = App.I18N && App.I18N.en ? App.I18N.en[rank.labelKey] : null;
      const zh = App.I18N && App.I18N.zh ? App.I18N.zh[rank.labelKey] : null;
      return !!en && en !== rank.labelKey && !!zh && zh !== rank.labelKey &&
        en !== zh && App.t(rank.labelKey) !== rank.labelKey;
    }), "an audit rank label fell back to its key");
  check("game-kalah-row", "the breach tier's four rank names resolve in both languages",
    breach.every((rank) => {
      const en = App.I18N && App.I18N.en ? App.I18N.en[rank.labelKey] : null;
      const zh = App.I18N && App.I18N.zh ? App.I18N.zh[rank.labelKey] : null;
      return !!en && en !== rank.labelKey && !!zh && zh !== rank.labelKey &&
        en !== zh && App.t(rank.labelKey) !== rank.labelKey;
    }), "a breach rank label fell back to its key");
  check("game-kalah-row", "the last stones' six rank names resolve in both languages",
    stones.every((rank) => {
      const en = App.I18N && App.I18N.en ? App.I18N.en[rank.labelKey] : null;
      const zh = App.I18N && App.I18N.zh ? App.I18N.zh[rank.labelKey] : null;
      return !!en && en !== rank.labelKey && !!zh && zh !== rank.labelKey &&
        en !== zh && App.t(rank.labelKey) !== rank.labelKey;
    }), "a last-stones rank label fell back to its key");

  /* The unlock chain is derived, never stored: clearing each rank in order
   * must hand the player exactly the next one, all fifty times. */
  const chain = App.createCampaign({
    key: "kalah-row-gate-chain",
    levels: ranks.map((rank) => ({ id: rank.id, labelKey: rank.labelKey })),
  });
  let walked = 0;
  let chained = true;
  ranks.forEach((rank, index) => {
    const outcome = chain.record(rank.id, { stars: 3, best: rank.margin[0], better: "high" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < ranks.length ? ranks[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-kalah-row", "the unlock chain walks all fifty ranks in order",
    walked === 50 && chained && chain.clearedCount() === 50,
    walked + " first clears");
};
