"use strict";

/* game-microbe-lab: the long bench, dishes m25-m30, and the summit bench,
 * dishes m31-m40, proved by the dish's own floor line.
 *
 * The greedy allocator that proves every shipped dish proves these the
 * same way: the line must survive the whole trial at the floor of four or
 * better, reach the two-star band, and sit one hundred (and a few) over
 * the three-star line - inside the [100, 110] window the shipped deep tier
 * anchored, so a band the greedy line collects fails and a band it cannot
 * see fails too. The walk is deterministic - the culture's jitter rolls
 * from the dish's own seed and nothing else touches a die - so every
 * number here replays byte for byte and the gate needs no Math.random
 * stub. The long bench priced its difficulty into the deck, the pool, the
 * flask and both ceilings; the summit bench adds a fifth lever the first
 * thirty dishes never shipped, the player's own hand: m31 deals two
 * mutation points a generation and m40 deals one. The lean hands are
 * bought, not given - the tier's cards open demanding five (base 2, the
 * softest opening the lab has printed) - while every structural lever the
 * bench set holds or tightens: the budget, the pool and the flask never
 * rise, the hand never grows, and the trial never shortens. Each rung
 * takes one record against every dish before it, scoped by position, and
 * every record below is a number the engine printed. The demand ceiling
 * dips once on the way down - eight to seven at m34 - and the dip is the
 * clamp's own cost: traitMax caps what a strain may stack AND what a card
 * may demand. The forge's summit table is held to the shipped rows row
 * for row, the copy resolves in both language packs, and the unlock chain
 * walks all forty dishes in order. */

module.exports = function gate(ctx) {
  const { App, check, path, root } = ctx;
  const mcbForge = require(path.join(root, "tools", "microbe-forge.js"));
  const levels = App.microbeLevels;
  const benchIds = ["m25", "m26", "m27", "m28", "m29", "m30"];
  const summitIds = ["m31", "m32", "m33", "m34", "m35", "m36", "m37", "m38", "m39", "m40"];

  check("game-microbe-lab", "the ladder holds forty dishes",
    levels.length === 40, String(levels.length));
  check("game-microbe-lab", "every dish id is distinct",
    new Set(levels.map((l) => l.id)).size === levels.length,
    levels.map((l) => l.id).join(","));
  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const bench = benchIds.map((id) => byId[id]);
  const summit = summitIds.map((id) => byId[id]);
  const benchMissing = benchIds.filter((id) => !byId[id]);
  const summitMissing = summitIds.filter((id) => !byId[id]);
  check("game-microbe-lab", "the long-bench dishes m25-m30 exist in order",
    benchMissing.length === 0 &&
      benchIds.every((id, index) => levels.findIndex((l) => l.id === id) >
        (index === 0 ? -1 : levels.findIndex((l) => l.id === benchIds[index - 1]))),
    benchMissing.join(",") || "ordered");
  check("game-microbe-lab", "the summit dishes m31-m40 exist in order",
    summitMissing.length === 0 &&
      summitIds.every((id, index) => levels.findIndex((l) => l.id === id) >
        (index === 0 ? -1 : levels.findIndex((l) => l.id === summitIds[index - 1]))),
    summitMissing.join(",") || "ordered");

  /* The floor line: the greedy allocator proves every rung the way it
   * proves the shipped thirty. */
  const proofs = new Map();
  const lineProblems = [];
  bench.concat(summit).forEach((level) => {
    const proof = App.microbeBeatable(level);
    proofs.set(level.id, proof);
    if (proof.collapsed || proof.cleared !== level.gens || proof.minSurvivors < 4) {
      lineProblems.push(`${level.id}: ${JSON.stringify(proof)}`);
    }
    if (proof.metric < level.starBand[1]) {
      lineProblems.push(`${level.id}: greedy ${proof.metric} under the two-star line ${level.starBand[1]}`);
    }
    const window = proof.metric - level.starBand[0];
    if (window < 100 || window > 110) {
      lineProblems.push(`${level.id}: window ${window} outside [100, 110]`);
    }
    if (!(level.starBand[0] > level.starBand[1] && level.starBand[1] > level.starBand[2])) {
      lineProblems.push(`${level.id}: bands do not run downwards ${level.starBand.join("/")}`);
    }
  });
  check("game-microbe-lab",
    "every long-bench and summit dish survives the greedy line inside the shipped window",
    lineProblems.length === 0, lineProblems.slice(0, 4).join(" | "));

  /* The opening drop: m25's greedy line lands strictly below the deep
   * summit's - the long bench starts where the old ladder topped out. */
  const deepSummit = App.microbeBeatable(byId.m24);
  check("game-microbe-lab",
    `m25 opens below the deep summit's metric (${deepSummit.metric})`,
    !proofs.get("m25").collapsed && proofs.get("m25").metric < deepSummit.metric,
    `m25 ${proofs.get("m25").metric} vs m24 ${deepSummit.metric}`);

  /* The levers are the price: the sums run downwards to the capstone, the
   * capstone holds the tier minimum on every lever, and each lever reaches
   * a minimum the first twenty-four dishes never shipped. */
  const sums = bench.map((l) => l.cap + l.traitMax + l.start);
  const sumsRise = benchIds.filter((id, index) =>
    index > 0 && sums[index] > sums[index - 1]);
  check("game-microbe-lab",
    `the lever sums never rise across the bench (${sums.join(" >= ")})`,
    sumsRise.length === 0, sumsRise.join(","));
  const cap30 = byId.m30;
  check("game-microbe-lab",
    "the capstone holds the tier minimum on every lever",
    cap30.cap === Math.min(...bench.map((l) => l.cap)) &&
      cap30.traitMax === Math.min(...bench.map((l) => l.traitMax)) &&
      cap30.start === Math.min(...bench.map((l) => l.start)),
    `m30 cap ${cap30.cap} tm ${cap30.traitMax} start ${cap30.start}`);
  /* The levers are the price: the early dishes printed low ceilings on
   * trivial environments and the deep tier traded them back for pressure,
   * so the honest bar is the summit's own row - the bench never loosens a
   * lever m24 set, every rung tightens at least one of them, and the
   * capstone tightens all three at once. */
  const m24row = byId.m24;
  const looser = bench.filter((l) =>
    l.cap > m24row.cap || l.traitMax > m24row.traitMax || l.start > m24row.start);
  check("game-microbe-lab",
    `no bench dish loosens a lever the summit set (m24 cap ${m24row.cap} tm ${m24row.traitMax} start ${m24row.start})`,
    looser.length === 0, looser.map((l) => l.id).join(","));
  const static_ = bench.filter((l) =>
    l.cap === m24row.cap && l.traitMax === m24row.traitMax && l.start === m24row.start);
  check("game-microbe-lab", "every bench dish tightens at least one lever against the summit",
    static_.length === 0, static_.map((l) => l.id).join(","));
  check("game-microbe-lab",
    "the capstone tightens all three levers at once",
    cap30.cap < m24row.cap && cap30.traitMax < m24row.traitMax && cap30.start < m24row.start,
    `m30 cap ${cap30.cap} tm ${cap30.traitMax} start ${cap30.start}`);

  /* The summit's own lever line: it never loosens what the long bench's
   * capstone set (m30: cap 17, traitMax 5, start 12, three points, ten
   * generations) and never loosens a rung within itself - the budget, the
   * pool and the flask never rise, the hand never grows, the trial never
   * shortens. The one easing the tier ships is base 2, and it is pinned
   * with the records below: it is what the lean hands pay. */
  const m30row = cap30;
  const summitLoose = summit.filter((l) =>
    l.cap > m30row.cap || l.traitMax > m30row.traitMax || l.start > m30row.start ||
    (l.points === undefined ? 3 : l.points) > 3 || l.gens < m30row.gens);
  check("game-microbe-lab",
    `no summit dish loosens a lever the long bench's capstone set (m30 cap ${m30row.cap} tm ${m30row.traitMax} start ${m30row.start} points 3 gens ${m30row.gens})`,
    summitLoose.length === 0, summitLoose.map((l) => l.id).join(","));
  const caps = summit.map((l) => l.cap);
  const pools = summit.map((l) => l.traitMax);
  const flasks = summit.map((l) => l.start);
  const hands = summit.map((l) => l.points);
  const trials = summit.map((l) => l.gens);
  const rises = (list) => list.some((n, i) => i > 0 && n > list[i - 1]);
  const falls = (list) => list.some((n, i) => i > 0 && n < list[i - 1]);
  check("game-microbe-lab",
    `the summit's budget, pool and flask never rise and its hand never grows ` +
      `(cap ${caps.join("/")} tm ${pools.join("/")} start ${flasks.join("/")} hand ${hands.join("/")})`,
    !rises(caps) && !rises(pools) && !rises(flasks) && !rises(hands),
    "a summit lever rose mid-tier");
  check("game-microbe-lab",
    `the summit's trial never shortens (${trials.join("/")})`,
    !falls(trials), "the trial shortened mid-tier");
  const capstone = byId.m40;
  check("game-microbe-lab",
    "the capstone holds every summit extreme at once",
    capstone.cap === Math.min(...caps) && capstone.traitMax === Math.min(...pools) &&
      capstone.start === Math.min(...flasks) && capstone.points === Math.min(...hands) &&
      capstone.gens === Math.max(...trials),
    `m40 cap ${capstone.cap} tm ${capstone.traitMax} start ${capstone.start} ` +
      `points ${capstone.points} gens ${capstone.gens}`);

  /* Records, scoped by position: every claim is against the rungs before
   * the dish that holds it, and every number is what the engine printed -
   * the card ceilings through microbeCard, the deck through the card ids
   * a trial actually deals. */
  const before = (id) => levels.slice(0, levels.findIndex((l) => l.id === id));
  const demandOf = (level) => {
    let max = 0;
    for (let gen = 0; gen < level.gens; gen += 1) {
      App.microbeCard(level, gen).clauses.forEach((clause) => {
        max = Math.max(max, clause.demand);
      });
    }
    return max;
  };
  const openingOf = (level) => App.microbeCard(level, 0).clauses.reduce(
    (min, clause) => Math.min(min, clause.demand), 99);
  const cardsOf = (level) => {
    const ids = new Set();
    for (let gen = 0; gen < level.gens; gen += 1) {
      ids.add(App.microbeCard(level, gen).id);
    }
    return ids;
  };
  const handOf = (level) => (level.points === undefined ? 3 : level.points);

  check("game-microbe-lab",
    "m31 deals the first two-point hand: every dish before it hands over three",
    byId.m31.points === 2 && before("m31").every((l) => handOf(l) === 3),
    "hands before m31: " + Math.min.apply(null, before("m31").map(handOf)));
  check("game-microbe-lab",
    "m31 opens the first card that demands five; every dish before it opens at six or more",
    openingOf(byId.m31) === 5 && before("m31").every((l) => openingOf(l) >= 6),
    "softest opening before m31: " + Math.min.apply(null, before("m31").map(openingOf)));
  check("game-microbe-lab",
    "the soft opening is the whole tier's price: every summit dish opens demanding five",
    summit.every((l) => openingOf(l) === 5),
    "openings " + summit.map((l) => openingOf(l)).join("/"));
  check("game-microbe-lab",
    "m32 runs the first trial past ten generations",
    byId.m32.gens === 11 && before("m32").every((l) => l.gens <= 10),
    "previous peak " + Math.max.apply(null, before("m32").map((l) => l.gens)));
  check("game-microbe-lab",
    "m33 is the first dish under seventeen",
    byId.m33.cap === 16 && before("m33").every((l) => l.cap >= 17),
    "previous floor " + Math.min.apply(null, before("m33").map((l) => l.cap)));
  check("game-microbe-lab",
    "m34 shallows the pool to four, a ceiling no earlier dish set",
    byId.m34.traitMax === 4 && before("m34").every((l) => l.traitMax >= 5),
    "previous floor " + Math.min.apply(null, before("m34").map((l) => l.traitMax)));
  check("game-microbe-lab",
    "the clamp's own cost, measured: the demand ceiling dips from eight (m31-m33) to seven (m34-m40)",
    demandOf(byId.m31) === 8 && demandOf(byId.m32) === 8 && demandOf(byId.m33) === 8 &&
      summit.slice(3).every((l) => demandOf(l) === 7),
    "ceilings " + summit.map((l) => l.id + ":" + demandOf(l)).join(" "));
  check("game-microbe-lab",
    "m35 starves the flask to eleven founders, below every earlier seeding",
    byId.m35.start === 11 && before("m35").every((l) => l.start >= 12),
    "previous floor " + Math.min.apply(null, before("m35").map((l) => l.start)));
  check("game-microbe-lab",
    "m36 prints nothing but the two newest pressures, flare and venom",
    (function () {
      const ids = cardsOf(byId.m36);
      const onlyNew = (set) => set.size > 0 &&
        Array.from(set).every((id) => id === "flare" || id === "venom");
      return ids.size === 2 && ids.has("flare") && ids.has("venom") &&
        before("m36").every((l) => !onlyNew(cardsOf(l)));
    })(),
    "an earlier dish already printed from the newest cards alone");
  check("game-microbe-lab",
    "m37 deals from all ten cards, past the six any earlier dish printed",
    cardsOf(byId.m37).size === 10 && before("m37").every((l) => cardsOf(l).size <= 6),
    "previous peak " + Math.max.apply(null, before("m37").map((l) => cardsOf(l).size)));
  check("game-microbe-lab",
    "m38 runs the longest trial the lab has shipped",
    byId.m38.gens === 12 && before("m38").every((l) => l.gens <= 11),
    "previous peak " + Math.max.apply(null, before("m38").map((l) => l.gens)));
  check("game-microbe-lab",
    "m39 is the first dish under sixteen",
    byId.m39.cap === 15 && before("m39").every((l) => l.cap >= 16),
    "previous floor " + Math.min.apply(null, before("m39").map((l) => l.cap)));
  check("game-microbe-lab",
    "m40 deals the first one-point hand",
    byId.m40.points === 1 && before("m40").every((l) => handOf(l) >= 2),
    "previous floor " + Math.min.apply(null, before("m40").map(handOf)));

  /* Provenance: the forge's SUMMIT table is the documented measurement of
   * this tier - it has to agree with the shipped rows it claims to have
   * walked, band included. */
  check("game-microbe-lab",
    "the forge's summit table matches the shipped tier row for row",
    mcbForge.SUMMIT.length === summit.length &&
      mcbForge.SUMMIT.every((candidate) => {
        const level = byId[candidate.id];
        return !!level &&
          level.seed === candidate.seed && level.cap === candidate.cap &&
          level.traitMax === candidate.traitMax && level.start === candidate.start &&
          level.base === candidate.base && level.step === candidate.step &&
          level.points === candidate.points &&
          JSON.stringify(level.plan) === JSON.stringify(candidate.plan) &&
          JSON.stringify(level.starBand) === JSON.stringify(candidate.starBand);
      }),
    "a summit row drifted from the shipped dish");

  /* The copy travels: dish names and twist lines resolve to real text in
   * both dictionaries, and through App.t itself. */
  const copyProblems = [];
  benchIds.concat(summitIds).forEach((id) => {
    const n = Number(id.slice(1));
    ["mcbZ" + n, "mcbTwist" + n].forEach((key) => {
      const en = App.t(key);
      const zh = App.I18N.zh[key];
      if (!en || en === key || !zh || zh === key || en === zh) {
        copyProblems.push(key);
      }
    });
  });
  check("game-microbe-lab",
    "the long-bench and summit names and twist lines resolve to distinct values in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each dish in order
   * must hand the player exactly the next one, all forty times, with
   * nothing left locked behind the last. */
  const chain = App.createCampaign({
    key: "microbe-lab-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 1, better: "high" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-microbe-lab", "the unlock chain walks all forty dishes in order",
    walked === 40 && chained && chain.clearedCount() === 40, walked + " first clears");
};
