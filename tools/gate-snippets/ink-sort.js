"use strict";

/* game-ink-sort: the deep tier is drained, not widened, and the dealer's
 * own solver sits witness on every deal.
 *
 * The palette tops out at fifteen tints, so the tier's lever is the spare
 * glass: rungs 21-24 drain the rack from four spares to two, and the floor
 * is proved here rather than assumed - a single spare starves the dealer's
 * DFS into the one-pour fallback, and the gate catches that fallback on
 * every rung it can reach. Each seeded deal is replayed pour by pour
 * through the game's own rules to a uniform rack, inside the walk budget
 * the rung advertises, and the printed three-star band is held to the
 * solver's own line: starMoves[0] is maxPath, the shipped law that the
 * band a player sees is a line the dealer has actually replayed.
 *
 * The summit q25-q30 spends what the deep tier hoarded: the rack stays at
 * its floor (fifteen tints over two spares) and the band gives back its
 * slack. Every summit number is dealt by the module's own dealer under
 * the pinned prng and replayed through the hosted pour rules: eight
 * selected deals per rung all sort clean inside the advertised band, a
 * pinned line deal per rung lands the solver's own walk exactly on the
 * three-star line, and the cut relaxes the rung's acceptance back to the
 * deep tier's loosest - the engine's unfiltered racks then carry walks
 * past every summit band, so the selection is what keeps the printed line
 * a line the dealer has actually replayed. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.inkSortLevels || null;
  const deepIds = ["q21", "q22", "q23", "q24"];
  const summitIds = ["q25", "q26", "q27", "q28", "q29", "q30"];

  /* The ladder lives in the module; the booted App exposes it through the
   * campaign picker only, so the slice is re-hosted the way
   * tools/static-checks.js hosts the dealer. */
  const fsMod = require("fs");
  const pathMod = require("path");
  const rootDir = pathMod.join(__dirname, "..", "..");
  const src = fsMod.readFileSync(
    pathMod.join(rootDir, "assets", "app", "game-ink-sort.js"), "utf8");
  const tableStart = src.indexOf("var sortLevels = [");
  const tableEnd = src.indexOf("/* Bilingual copy");
  const table = new Function(tableStart === -1
    ? "return [];"
    : src.slice(tableStart, tableEnd) + "\nreturn sortLevels;")();

  check("game-ink-sort", "the ladder holds thirty racks",
    table.length === 30, String(table.length));
  check("game-ink-sort", "every rack id is distinct",
    new Set(table.map((level) => level.id)).size === table.length,
    table.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !table.some((level) => level.id === id));
  check("game-ink-sort", "the deep tier q21-q24 is present",
    missing.length === 0, missing.join(","));
  const missingSummit = summitIds.filter((id) => !table.some((level) => level.id === id));
  check("game-ink-sort", "the summit tier q25-q30 is present",
    missingSummit.length === 0, missingSummit.join(","));

  const byId = {};
  table.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);
  const summit = summitIds.map((id) => byId[id]);

  /* The pour rules, re-hosted verbatim from the module so a replay here is
   * the replay the panel performs. */
  const CAP = 4;
  const topRun = (tubes, index) => {
    const tube = tubes[index];
    if (!tube.length) return null;
    const color = tube[tube.length - 1];
    let count = 1;
    for (let i = tube.length - 2; i >= 0; i -= 1) {
      if (tube[i] !== color) break;
      count += 1;
    }
    return { color, count };
  };
  const uniform = (tubes) => tubes.every((tube) =>
    !tube.length ||
    (tube.length === CAP && tube.every((c) => c === tube[0])));
  const replay = (deal) => {
    const tubes = deal.tubes.map((tube) => tube.slice());
    for (const [from, to] of deal.solution) {
      if (from === to || !tubes[from].length || tubes[to].length >= CAP) {
        return false;
      }
      const run = topRun(tubes, from);
      if (tubes[to].length && tubes[to][tubes[to].length - 1] !== run.color) {
        return false;
      }
      const amount = Math.min(run.count, CAP - tubes[to].length);
      for (let u = 0; u < amount; u += 1) {
        tubes[to].push(tubes[from].pop());
      }
    }
    return uniform(tubes);
  };

  /* One seeded deal per trial through the module's own dealer - the same
   * Math.random the panel deals with, pinned to a stream so the run never
   * flakes. */
  const seeded = (seed, fn) => {
    const real = Math.random;
    let state = seed >>> 0;
    Math.random = () => {
      state = (Math.imul(state, 1103515245) + 12345) >>> 0;
      return state / 4294967296;
    };
    try { return fn(); } finally { Math.random = real; }
  };
  const dealFor = (level, seed) =>
    seeded(seed, () => App.inkSortGenerate(level.colors, level.tubes, level.shuffle, level.maxPath));

  /* Every deep rung deals real racks: eight seeded deals each, all replaying
   * to uniform inside the advertised budget, none of them the one-pour
   * fallback. q20 calibrates the bench on the shipped peak, and q24's walks
   * are kept for the slack the summit spends. */
  const dealProblems = [];
  const deepWalks = {};
  [byId.q20].concat(deep).forEach((level) => {
    deepWalks[level.id] = [];
    for (let trial = 0; trial < 8; trial += 1) {
      const deal = dealFor(level, 47100 + trial * 17);
      deepWalks[level.id].push(deal.solution.length);
      if (deal.solution.length <= 1) {
        dealProblems.push(`${level.id} trial ${trial}: the dealer fell back`);
        continue;
      }
      if (deal.solution.length > level.maxPath) {
        dealProblems.push(`${level.id} trial ${trial}: walk ${deal.solution.length}` +
          ` over maxPath ${level.maxPath}`);
        continue;
      }
      if (!replay(deal)) {
        dealProblems.push(`${level.id} trial ${trial}: the recorded walk does not sort the rack`);
      }
    }
  });
  check("game-ink-sort",
    "every seeded deep deal sorts clean inside its advertised budget",
    dealProblems.length === 0, dealProblems.slice(0, 4).join(" | "));
  const q24Slack = byId.q24.maxPath - Math.max.apply(null, deepWalks.q24);
  check("game-ink-sort",
    "the deep close's own replays sit tens of moves under its band",
    Math.min.apply(null, deepWalks.q24) >= 59 && q24Slack >= 33,
    "walks " + deepWalks.q24.join("/") + ", slack from " + q24Slack);

  /* The bands are the solver's own line: three stars at maxPath, bands
   * ordered, and the two-spare floor named in the module comment is the
   * one the dealer can still deal - the gate proves the floor by starving
   * it: one spare and the dealer collapses. */
  const bandProblems = [];
  deep.forEach((level) => {
    if (level.starMoves[0] !== level.maxPath) {
      bandProblems.push(`${level.id} three-star band ${level.starMoves[0]}` +
        ` != maxPath ${level.maxPath}`);
    }
    if (!(level.starMoves[0] < level.starMoves[1] &&
        level.starMoves[1] < level.starMoves[2])) {
      bandProblems.push(`${level.id} bands do not rise ${level.starMoves.join("/")}`);
    }
  });
  check("game-ink-sort",
    "the deep bands are the dealer's own line and rise for the low scorer",
    bandProblems.length === 0, bandProblems.join(" | "));
  const starved = dealFor(Object.assign({}, byId.q23, { tubes: 16 }), 47100);
  check("game-ink-sort",
    "one spare fewer and the dealer starves: the two-spare floor is real",
    starved.solution.length <= 1, "walk " + starved.solution.length);

  /* The tier drains: no shipped rung's spare ratio sits as low as the deep
   * tier's, the ratio falls rung over rung until it lands on the two-spare
   * floor, and the floor rung holds the floor while scrambling deeper than
   * anything before it. */
  const ratio = (level) => (level.tubes - level.colors) / level.colors;
  const shallow = table.filter((level) => !deepIds.includes(level.id) &&
    !summitIds.includes(level.id));
  const drainProblems = [];
  deep.forEach((level, index) => {
    if (index === 0) return;
    const prev = deep[index - 1];
    const falls = ratio(level) < ratio(prev);
    const holdsFloor = level.tubes === prev.tubes &&
      level.colors === prev.colors && level.shuffle > prev.shuffle;
    if (!falls && !holdsFloor) {
      drainProblems.push(`${level.id} neither drains the glass nor holds a deeper floor`);
    }
  });
  if (!deep.every((level) =>
    shallow.every((shipped) => ratio(level) < ratio(shipped)))) {
    drainProblems.push("a deep rung's spare ratio matches or beats a shipped rung's");
  }
  check("game-ink-sort",
    "the spare glass drains rung over rung below anything shipped",
    drainProblems.length === 0, drainProblems.join(" | "));
  check("game-ink-sort",
    "the final palette scrambles deeper than every deal before it",
    deep[3].shuffle > byId.q20.shuffle &&
    deep[3].maxPath > byId.q20.maxPath,
    `q24 shuffle ${deep[3].shuffle}/maxPath ${deep[3].maxPath}` +
      ` vs q20 ${byId.q20.shuffle}/${byId.q20.maxPath}`);

  /* The tier's names resolve in both languages. */
  const copyProblems = deep.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-ink-sort", "the four deep rack names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* ---- the summit: the floor rack held, the band's slack given back ----
   *
   * Stars off the solver's own walks: three stars needs a walk at or under
   * the band, two at or under band + 20, one at or under band + 40. */
  const stars = (moves, band) =>
    moves <= band ? 3 : moves <= band + 20 ? 2 : moves <= band + 40 ? 1 : 0;

  /* Eight selected deals per rung (seeds 91500 + k*23): all real racks, all
   * replaying to uniform inside the advertised band, and the bench's
   * longest replay shortens rung over rung from 66 at the open to 57 at
   * the close - the selection bites deeper as the band tightens. */
  const benchProblems = [];
  const benchTops = [];
  summit.forEach((level) => {
    const walks = [];
    for (let trial = 0; trial < 8; trial += 1) {
      const deal = dealFor(level, 91500 + trial * 23);
      walks.push(deal.solution.length);
      if (deal.solution.length <= 1) {
        benchProblems.push(level.id + " trial " + trial + ": the dealer fell back");
      } else if (deal.solution.length > level.maxPath) {
        benchProblems.push(level.id + " trial " + trial + ": walk " +
          deal.solution.length + " over maxPath " + level.maxPath);
      } else if (!replay(deal)) {
        benchProblems.push(level.id + " trial " + trial + ": the recorded walk does not sort the rack");
      }
    }
    benchTops.push(Math.max.apply(null, walks));
  });
  check("game-ink-sort",
    "every seeded summit deal sorts clean inside its tight band",
    benchProblems.length === 0, benchProblems.slice(0, 4).join(" | "));
  check("game-ink-sort",
    "the bench's longest replay shortens from 66 at the open to 57 at the close",
    benchTops[0] === 66 && benchTops[5] === 57 &&
      benchTops[5] === summit[5].maxPath &&
      benchTops.every((top, index) =>
        top <= summit[index].maxPath &&
        (index === 0 || top <= benchTops[index - 1])),
    benchTops.join("/"));

  /* The line deals: one pinned seed per rung (92811, 95019, 91546, 91615,
   * 91569, 91500) where the solver's own replay lands exactly on the band,
   * so three stars costs the solver's line and a single wasted pour costs
   * the top band. */
  const lineSeeds = { q25: 92811, q26: 95019, q27: 91546, q28: 91615, q29: 91569, q30: 91500 };
  const lineProblems = [];
  summit.forEach((level) => {
    const deal = dealFor(level, lineSeeds[level.id]);
    const walk = deal.solution.length;
    if (deal.solution.length <= 1) {
      lineProblems.push(level.id + ": the dealer fell back");
    } else if (walk !== level.maxPath) {
      lineProblems.push(level.id + ": walk " + walk + " misses the band " + level.maxPath);
    } else if (!replay(deal)) {
      lineProblems.push(level.id + ": the recorded walk does not sort the rack");
    } else if (stars(walk, level.maxPath) !== 3) {
      lineProblems.push(level.id + ": the solver's own line misses three stars");
    }
  });
  check("game-ink-sort",
    "each pinned line deal lands the solver's own walk exactly on the band",
    lineProblems.length === 0, lineProblems.join(" | "));

  /* The cut: relax the rung's acceptance back to the deep tier's loosest
   * (maxPath 105) and re-deal on the pinned cut seeds (92700 + k*31, k =
   * 5/7/10/29) - the engine's unfiltered racks carry walks of 72, 72, 74,
   * 73, every one past every summit band, so the printed three-star line
   * stops being a line the dealer has replayed and the solver's own cut
   * line lands two stars, not three. */
  const cutSeeds = [5, 7, 10, 29].map((k) => 92700 + k * 31);
  const cutProblems = [];
  const cutMaxima = [];
  summit.forEach((level) => {
    const loose = Object.assign({}, level, { maxPath: 105 });
    const deals = cutSeeds.map((seed) => dealFor(loose, seed));
    const cutMax = Math.max.apply(null, deals.map((deal) => deal.solution.length));
    cutMaxima.push(cutMax);
    deals.forEach((deal, index) => {
      if (deal.solution.length <= 1) {
        cutProblems.push(level.id + " cut " + index + ": the dealer fell back");
      } else if (deal.solution.length <= level.maxPath) {
        cutProblems.push(level.id + " cut " + index + ": walk " +
          deal.solution.length + " still fits the band " + level.maxPath);
      } else if (!replay(deal)) {
        cutProblems.push(level.id + " cut " + index + ": the recorded walk does not sort the rack");
      }
    });
    if (stars(cutMax, level.maxPath) !== 2) {
      cutProblems.push(level.id + ": best cut walk " + cutMax + " does not land two stars");
    }
  });
  check("game-ink-sort",
    "with the selection relaxed, the engine's own racks carry walks past every summit band",
    cutProblems.length === 0, cutProblems.slice(0, 4).join(" | "));
  check("game-ink-sort",
    "every cut maximum lands two stars, not three (" +
      cutMaxima.join("/") + " against bands " +
      summit.map((level) => level.maxPath).join("/") + ")",
    cutMaxima.every((max, index) => max === 74 && max > summit[index].maxPath),
    cutMaxima.join("/"));

  /* The tier's shape: the rack holds the deep tier's floor, the bands stay
   * the solver's own law, and the three-star line descends strictly under
   * the deep close's loose 105. */
  const shapeProblems = [];
  summit.forEach((level, index) => {
    if (level.tubes !== 17 || level.colors !== 15) {
      shapeProblems.push(level.id + " leaves the floor rack");
    }
    if (level.starMoves[0] !== level.maxPath) {
      shapeProblems.push(level.id + " three-star band " + level.starMoves[0] +
        " != maxPath " + level.maxPath);
    }
    if (!(level.starMoves[0] < level.starMoves[1] &&
        level.starMoves[1] < level.starMoves[2])) {
      shapeProblems.push(level.id + " bands do not rise " + level.starMoves.join("/"));
    }
    if (index > 0 && level.maxPath >= summit[index - 1].maxPath) {
      shapeProblems.push(level.id + " does not tighten on " + summit[index - 1].id);
    }
    if (level.maxPath >= byId.q24.maxPath) {
      shapeProblems.push(level.id + " does not open under the deep close");
    }
  });
  check("game-ink-sort",
    "the summit holds the floor rack and tightens the band rung over rung under the deep close",
    shapeProblems.length === 0, shapeProblems.join(" | "));

  /* Below the close the dealer's edge is measured, not assumed: maxPath 52
   * already starves seven of ten pinned deals and 48 starves every deal
   * the gate pins, so the close at 57 shuts the ladder a hair above the
   * tightest acceptance the dealer still meets. */
  const starved52 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    .map((k) => dealFor({ colors: 15, tubes: 17, shuffle: 150, maxPath: 52 }, 61000 + k * 11).solution.length)
    .filter((walk) => walk <= 1).length;
  const starved48 = [0, 1, 2, 3]
    .map((k) => dealFor({ colors: 15, tubes: 17, shuffle: 150, maxPath: 48 }, 61000 + k * 11).solution.length)
    .filter((walk) => walk <= 1).length;
  check("game-ink-sort",
    "below the close the dealer starves: the collapse line is real",
    starved52 === 7 && starved48 === 4,
    "maxPath 52 starves " + starved52 + "/10, maxPath 48 starves " + starved48 + "/4");

  /* The summit's names resolve in both languages. */
  const summitCopyProblems = summit.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-ink-sort", "the six summit rack names resolve in both languages",
    summitCopyProblems.length === 0, summitCopyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each rack in order
   * hands the player exactly the next one, all thirty times. */
  const chain = App.createCampaign({
    key: "ink-sort-gate-chain",
    levels: table.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  table.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < table.length ? table[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-ink-sort", "the unlock chain walks all thirty racks in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
