"use strict";

/* game-glyph-net: every deal on every rung is solved by the honest optimum
 * line, the summit is priced by measured deals, and the storm is load-bearing
 *
 * The loom deals a spanning tree and scrambles a share of it (`tangle`), so
 * every deal is solvable by construction and the dealt optimum - the fewest
 * clockwise clicks any line can spend - is computable from the deal itself.
 * The checker's own optimum line (every tile back to its solved pose, straights
 * at half a turn, crosses free) is replayed here against all thirty rungs on
 * twenty-four seeds apiece (7000 + s*131, the checker's own sweep): each deal
 * must be a real tangle with three bulbs to spare, the honest line must solve
 * it at exactly the dealt optimum, and a blind one-more-turn sweep must never
 * power the grid.
 *
 * The summit n25-n30 opens the loom's last two frames (fifteen and sixteen
 * wide) and storms them past every shipped deal - the tangle climbs to 0.9 on
 * the fifteen-wide plate and 0.95 on the sixteen-wide, about a dozen true
 * tiles on a 255-tile frame. The gate prices the tier the only honest way, in
 * the engine's own currency: the mean dealt optimum over the same seeds climbs
 * strictly rung over rung from n24's 233.1 clicks to 386.6 on n30. The star
 * pads are quoted, not guessed - n24's own two- and one-star pads sit at 1.7%
 * and 3.9% of its measured optimum, and every summit rung prices its own mean
 * at those same ratios (three stars stay the optimum itself, pad zero). The
 * tangle is the load-bearing dial by twins: the same rung at the shipped
 * three-fifths storm measures a strictly cheaper optimum on the same seeds.
 * A fresh forty-seed sweep of every summit rung re-runs the full bar - the
 * loom never falls back to its trivial deal, never lays a self-solved grid,
 * and never deals a blind win, at any width or storm. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.netLevels;
  const deepIds = ["n21", "n22", "n23", "n24"];
  const summitIds = ["n25", "n26", "n27", "n28", "n29", "n30"];

  /* ---- ladder shape ---- */
  check("game-glyph-net", "the ladder holds thirty plates",
    levels.length === 30, String(levels.length));
  check("game-glyph-net", "every plate id is distinct and in ladder order",
    new Set(levels.map((level) => level.id)).size === levels.length &&
      levels.every((level, index) => level.id === "n" + (index + 1)),
    levels.map((level) => level.id).join(","));
  const missing = deepIds.concat(summitIds).filter((id) =>
    !levels.some((level) => level.id === id));
  check("game-glyph-net", "the deep tier n21-n24 and the summit n25-n30 are present",
    missing.length === 0, missing.join(","));

  /* ---- the checker's own harness: seeded deals, honest optimum line ---- */
  const netRng = (seed) => {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const withSeed = (seed, fn) => {
    const real = Math.random;
    Math.random = netRng(seed);
    try {
      return fn();
    } finally {
      Math.random = real;
    }
  };
  /* The honest optimum line: every tile back to a solved pose - the dealt
   * conns unrotated - except straight pipes, which also solve at half a
   * turn, and crosses, which solve at any angle. */
  const optimumLine = (deal) => {
    const target = deal.rot.map((r, i) => {
      if (i === 0) return 0;
      let arms = 0;
      let straight = false;
      for (let d = 0; d < 4; d += 1) {
        if (!deal.conns[i][d]) continue;
        arms += 1;
        if (deal.conns[i][(d + 2) % 4]) straight = true;
      }
      if (arms === 4) return r;
      if (arms === 2 && straight) return (4 - r) % 4 <= (6 - r) % 4 ? 0 : 2;
      return 0;
    });
    let clicks = 0;
    for (let i = 0; i < deal.rot.length; i += 1) {
      clicks += (((target[i] - deal.rot[i]) % 4) + 4) % 4;
    }
    return { clicks, won: App.glyphNetWin(deal.size, deal.conns, target) };
  };

  const CHECKER_SEEDS = [];
  for (let s = 0; s < 24; s += 1) CHECKER_SEEDS.push(7000 + s * 131);
  const FRESH_SEEDS = [];
  for (let s = 0; s < 40; s += 1) FRESH_SEEDS.push(910000 + s * 17);

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });

  /* One rung, one seed set, the full bar. Returns the per-deal verdicts plus
   * the rung's measured optimum distribution. */
  const measure = (level, seeds) => {
    const opts = [];
    let fallbacks = 0;
    let blindWins = 0;
    let badLine = 0;
    let shallow = 0;
    seeds.forEach((seed) => {
      const out = withSeed(seed, () => {
        const deal = App.glyphNetGenerate(level.size, level.tangle);
        const line = optimumLine(deal);
        const blindRot = deal.rot.map((r) => (r > 0 ? (r + 1) % 4 : 0));
        return {
          opt: deal.opt,
          clicks: line.clicks,
          won: line.won,
          dealt: App.glyphNetWin(deal.size, deal.conns, deal.rot),
          blind: App.glyphNetWin(deal.size, deal.conns, blindRot),
          terminals: deal.terminals.length,
        };
      });
      if (out.opt < 3 || out.terminals < 3 || out.dealt) shallow += 1;
      if (!(out.won && out.clicks === out.opt)) badLine += 1;
      if (out.blind) blindWins += 1;
      opts.push(out.opt);
    });
    opts.sort((a, b) => a - b);
    const mean = opts.reduce((sum, value) => sum + value, 0) / opts.length;
    return { opts, mean, min: opts[0], max: opts[opts.length - 1],
      fallbacks, blindWins, badLine, shallow };
  };

  /* ---- the checker's bar, re-run on all thirty rungs ---- */
  const measured = {};
  const problems = [];
  levels.forEach((level) => {
    const out = measure(level, CHECKER_SEEDS);
    measured[level.id] = out;
    if (out.shallow) problems.push(level.id + ": " + out.shallow + " deals were not a real tangle");
    if (out.badLine) problems.push(level.id + ": the optimum line missed on " + out.badLine + " deals");
    if (out.blindWins) problems.push(level.id + ": the blind sweep powered " + out.blindWins + " deals");
  });
  check("game-glyph-net",
    "every deal on every rung is a real tangle, solved exactly by the honest optimum line and never by the blind sweep (" +
      summitIds.map((id) => byId[id].id + " mean " + measured[id].mean.toFixed(1)).join(", ") +
      " against n24 " + measured.n24.mean.toFixed(1) + ")",
    problems.length === 0, problems.join(" | ") || "all 720 deals replayed clean");

  /* ---- the summit's pads are quoted, not guessed ---- */
  /* n24's own ratios: pad 4 over a mean of 233.1 is 1.7%, pad 9 is 3.9%.
   * Every summit rung prices its own measured mean at the same ratios; the
   * first pad stays 0 - three stars ask for the optimum itself. */
  const padProblems = [];
  summitIds.forEach((id) => {
    const level = byId[id];
    const mean = measured[id].mean;
    const wantTwo = Math.max(4, Math.round(mean * 0.017));
    const wantOne = Math.max(9, Math.round(mean * 0.039));
    if (level.starPad[0] !== 0) padProblems.push(id + " pads the optimum itself");
    if (level.starPad[1] !== wantTwo) {
      padProblems.push(id + " two-star pad " + level.starPad[1] + " vs quoted " + wantTwo);
    }
    if (level.starPad[2] !== wantOne) {
      padProblems.push(id + " one-star pad " + level.starPad[2] + " vs quoted " + wantOne);
    }
  });
  check("game-glyph-net",
    "the summit pads quote the deep summit's own ratios off each rung's measured optimum: " +
      summitIds.map((id) => id + " " + byId[id].starPad.join("/")).join(", "),
    padProblems.length === 0, padProblems.join(" | "));
  check("game-glyph-net", "the summit pads rise inside every rung and never dip below the rung before",
    summitIds.every((id) => {
      const pads = byId[id].starPad;
      return pads[0] <= pads[1] && pads[1] <= pads[2];
    }) && summitIds.every((id, index) => index === 0 ||
      (byId[id].starPad[1] >= byId[summitIds[index - 1]].starPad[1] &&
        byId[id].starPad[2] >= byId[summitIds[index - 1]].starPad[2])),
    summitIds.map((id) => byId[id].starPad.join("/")).join(" "));

  /* ---- the tier climbs in the engine's own currency ---- */
  const climbProblems = [];
  summitIds.forEach((id, index) => {
    const prev = index === 0 ? measured.n24 : measured[summitIds[index - 1]];
    if (!(measured[id].mean > prev.mean)) {
      climbProblems.push(id + " mean " + measured[id].mean.toFixed(1) +
        " vs prev " + prev.mean.toFixed(1));
    }
  });
  check("game-glyph-net",
    "the mean dealt optimum climbs strictly from the deep summit into and across the summit tier: " +
      ["n24"].concat(summitIds).map((id) => id + " " + measured[id].mean.toFixed(1)).join(" -> "),
    climbProblems.length === 0, climbProblems.join(" | "));

  /* ---- the storm is the load-bearing dial, by twins ---- */
  /* The same rung at the shipped three-fifths storm - same frame, same
   * seeds - measures a strictly cheaper optimum on every summit rung. */
  const twinProblems = [];
  const twinLines = [];
  summitIds.forEach((id) => {
    const level = byId[id];
    const twin = measure({ size: level.size, tangle: 0.6 }, CHECKER_SEEDS);
    twinLines.push(id + " " + measured[id].mean.toFixed(1) + " vs calm " + twin.mean.toFixed(1));
    if (!(twin.mean < measured[id].mean)) {
      twinProblems.push(id + ": the calm twin measured " + twin.mean.toFixed(1) +
        " against the storm's " + measured[id].mean.toFixed(1));
    }
  });
  check("game-glyph-net",
    "relaxing the tangle to the shipped three-fifths storm cuts the measured optimum on every summit rung: " +
      twinLines.join(", "),
    twinProblems.length === 0, twinProblems.join(" | "));

  /* ---- fresh deals, full bar: the loom never falls back ---- */
  const freshProblems = [];
  summitIds.forEach((id) => {
    const out = measure(byId[id], FRESH_SEEDS);
    if (out.shallow || out.badLine || out.blindWins) {
      freshProblems.push(id + ": " + out.shallow + " shallow, " + out.badLine +
        " line misses, " + out.blindWins + " blind wins over 40 fresh seeds");
    }
  });
  check("game-glyph-net",
    "forty fresh deals on every summit rung replay the full bar - no fallback, no blind win, no line miss",
    freshProblems.length === 0, freshProblems.join(" | "));

  /* ---- the unlock chain is derived, never stored ---- */
  const chain = App.createCampaign({
    key: "glyph-net-gate-chain",
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
  check("game-glyph-net", "the unlock chain walks all thirty plates in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");

  /* ---- the summit's names travel with the module ---- */
  const copyProblems = summitIds.map((id) => byId[id].labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-glyph-net", "the six summit plate names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
