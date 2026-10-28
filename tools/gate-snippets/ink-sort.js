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
 * band a player sees is a line the dealer has actually replayed. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.inkSortLevels || null;
  const deepIds = ["q21", "q22", "q23", "q24"];

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

  check("game-ink-sort", "the ladder holds twenty-four racks",
    table.length === 24, String(table.length));
  check("game-ink-sort", "every rack id is distinct",
    new Set(table.map((level) => level.id)).size === table.length,
    table.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !table.some((level) => level.id === id));
  check("game-ink-sort", "the deep tier q21-q24 is present",
    missing.length === 0, missing.join(","));

  const byId = {};
  table.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);

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
   * fallback. q20 calibrates the bench on the shipped peak. */
  const dealProblems = [];
  [byId.q20].concat(deep).forEach((level) => {
    for (let trial = 0; trial < 8; trial += 1) {
      const deal = dealFor(level, 47100 + trial * 17);
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
  const shallow = table.filter((level) => !deepIds.includes(level.id));
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

  /* The unlock chain is derived, never stored: clearing each rack in order
   * hands the player exactly the next one, all twenty-four times. */
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
  check("game-ink-sort", "the unlock chain walks all twenty-four racks in order",
    walked === 24 && chained && chain.clearedCount() === 24, walked + " first clears");
};
