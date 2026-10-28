"use strict";

/* game-lost-language: the second shelf digs clean and digs harder
 *
 * App.tongueGenerate is the dig's whole proof chain - a chamber only yields a
 * deal when the printed rubbings admit exactly ONE analysis (App.tongueAnalyses)
 * and a reader who memorised the word list still cannot pass the test walls
 * (App.tongueGlossOnlyFails). The gate re-deals chambers 21-24 at seeds 1..40,
 * the same 40-seed bar tools/static-checks.js holds the drowned archive to,
 * and then holds the tier to its own brief: the second shelf draws from pools
 * no shipped chamber ever drew from (sixteen nouns, ten verbs), every chamber's
 * measured honest bench cost climbs above the archive's, the star thresholds
 * never fall, and the label copy travels in both languages. */
module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.tongueLevels;
  const deepIds = ["lng21", "lng22", "lng23", "lng24"];
  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });

  check("game-lost-language", "the ladder holds twenty-four chambers",
    levels.length === 24, String(levels.length));
  check("game-lost-language", "every chamber id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !byId[id]);
  check("game-lost-language", "the second shelf lng21-lng24 is present",
    missing.length === 0, missing.join(","));

  /* The shelf is a wider floor, not just a longer ladder: the deep chambers
   * flag it, no earlier chamber draws that deep, and the pools can actually
   * clothe the widest bench. */
  const wide = levels.filter((level) => level.wide && !level.deep);
  const deepestNouns = Math.max.apply(null, wide.map((level) => level.nouns));
  const deepestVerbs = Math.max.apply(null, wide.map((level) => level.verbs));
  const shelfProblems = [];
  deepIds.forEach((id) => {
    const def = byId[id];
    if (!def.deep || !def.wide) shelfProblems.push(id + ":flags");
    if (def.nouns <= deepestNouns) shelfProblems.push(id + ":nouns " + def.nouns);
    if (def.verbs <= deepestVerbs) shelfProblems.push(id + ":verbs " + def.verbs);
  });
  check("game-lost-language",
    "each second-shelf chamber draws from a wider lexicon than the widest archive chamber",
    shelfProblems.length === 0, shelfProblems.join(" | "));

  /* Proof bar: 40 seeds per chamber, the archive's own rigor. A deal ships
   * only when it exists, admits one analysis, defeats the gloss-only reader,
   * and carries the measured budget its own prefix walk proves. */
  const deals = {};
  const failedSeeds = [];
  deepIds.forEach((id) => {
    deals[id] = [];
    for (let seed = 1; seed <= 40; seed += 1) {
      const dig = App.tongueGenerate(id, seed);
      const bad = !dig ||
        App.tongueAnalyses(dig, 2) !== 1 ||
        !App.tongueGlossOnlyFails(dig) ||
        App.tonguePrefixCost(dig) !== dig.budget;
      if (bad) failedSeeds.push(id + "#" + seed);
      else deals[id].push(dig);
    }
  });
  check("game-lost-language",
    "all one hundred and sixty second-shelf deals dig clean",
    failedSeeds.length === 0, failedSeeds.slice(0, 8).join(" "));

  /* The climb is measured, not asserted: each shelf chamber's mean honest
   * bench cost over the same 40 deals sits above the drowned archive's
   * shipped summit, and the shelf rises chamber by chamber. */
  const meanHonest = (id) =>
    deals[id].reduce((sum, dig) => sum + dig.budget, 0) / deals[id].length;
  const archiveMean = 17.7;
  const means = deepIds.map((id) => meanHonest(id));
  const climbProblems = [];
  deepIds.forEach((id, index) => {
    if (!(means[index] > archiveMean)) climbProblems.push(id + " " + means[index].toFixed(1));
    if (index > 0 && !(means[index] > means[index - 1])) {
      climbProblems.push(id + " not above " + deepIds[index - 1]);
    }
  });
  check("game-lost-language",
    "every shelf chamber's honest line climbs above the archive's summit, in order",
    climbProblems.length === 0,
    "means " + means.map((m) => m.toFixed(1)).join("/") + " vs archive " + archiveMean);

  /* The star ladder never falls on any dealt bench: budget <= mid <= total. */
  const ladderProblems = [];
  deepIds.forEach((id) => {
    deals[id].forEach((dig) => {
      const [top, mid, total] = App.tongueThresholds(dig);
      if (!(top <= mid && mid <= total && dig.budget <= total)) {
        ladderProblems.push(id + "#" + dig.seed + " " + top + "/" + mid + "/" + total);
      }
    });
  });
  check("game-lost-language", "the star thresholds hold on every shelf bench",
    ladderProblems.length === 0, ladderProblems.slice(0, 6).join(" | "));

  /* The unlock chain is derived, never stored: clearing each chamber in order
   * hands the player exactly the next one, all twenty-four times. */
  const chain = App.createCampaign({
    key: "lost-language-gate-chain",
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
  check("game-lost-language", "the unlock chain walks all twenty-four chambers in order",
    walked === 24 && chained && chain.clearedCount() === 24, walked + " first clears");

  /* Copy travels with the module. */
  const copyProblems = deepIds.map((id) => byId[id].labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-lost-language", "the four chamber names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
