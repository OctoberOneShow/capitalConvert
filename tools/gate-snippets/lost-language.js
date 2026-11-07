"use strict";

/* game-lost-language: the summit shelf digs clean and digs harder, and the
 * bedrock shelf digs below the whole tongue
 *
 * App.tongueGenerate is the dig's whole proof chain - a chamber only yields a
 * deal when the printed rubbings admit exactly ONE analysis (App.tongueAnalyses)
 * and a reader who memorised the word list still cannot pass the test walls
 * (App.tongueGlossOnlyFails). The gate re-deals chambers 21-30 at seeds 1..40,
 * the same 40-seed bar tools/static-checks.js holds the drowned archive to,
 * and then holds both deep tiers to their brief: the second shelf draws from
 * pools no shipped chamber ever drew from (sixteen nouns, ten verbs), the
 * summit reads the whole tongue the module ships (eighteen nouns, eleven
 * verbs) on the longest benches and the fullest test, every chamber's measured
 * honest bench cost climbs above its predecessor's, the star thresholds never
 * fall and the top band is earned rather than free, the cut chambers lose
 * their height with their stacked floors, and the label copy travels in both
 * languages.
 *
 * The bedrock shelf lng31-lng40 digs below the whole tongue: a `bedrock`
 * chamber stacks one more floor of words onto the peak pools - twenty nouns,
 * twelve verbs, a lexicon no shipped chamber ever drew from - on the longest
 * benches the panel has shown (thirty-one to forty rubbings, one more per
 * chamber). The gate re-deals all ten at seeds 1..40 (four hundred deals,
 * none refused), then holds the shelf to its measured brief: every chamber's
 * mean honest cost sits above the summit's own record chamber, the second
 * half of the shelf never dips to the first half's best, the capstone holds
 * the campaign's record honest line, every carve out-costs the summit's,
 * and the floor is load-bearing both ways - strip the bedrock pools off a
 * live chamber and the engine refuses every deal outright (the peak pools
 * cannot clothe twenty nouns and twelve verbs), relax the dials to what
 * those pools hold and the same deals dig clean with the honest line fallen
 * below the chamber's own bedrock mean. */
module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.tongueLevels;
  const deepIds = ["lng21", "lng22", "lng23", "lng24"];
  const summitIds = ["lng25", "lng26", "lng27", "lng28", "lng29", "lng30"];
  const bedrockIds = ["lng31", "lng32", "lng33", "lng34", "lng35", "lng36", "lng37", "lng38", "lng39", "lng40"];
  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });

  const expectedIds = Array.from({ length: 40 }, (_, index) => "lng" + (index + 1));
  check("game-lost-language", "the ladder holds forty chambers",
    levels.length === 40, String(levels.length));
  check("game-lost-language", "the ids run lng1 through lng40 in order",
    levels.map((level) => level.id).join(",") === expectedIds.join(","),
    levels.map((level) => level.id).join(","));
  check("game-lost-language", "every chamber id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  check("game-lost-language", "every chamber id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !byId[id]);
  check("game-lost-language", "the second shelf lng21-lng24 is present",
    missing.length === 0, missing.join(","));
  const missingSummit = summitIds.filter((id) => !byId[id]);
  check("game-lost-language", "the summit shelf lng25-lng30 is present",
    missingSummit.length === 0, missingSummit.join(","));
  const missingBedrock = bedrockIds.filter((id) => !byId[id]);
  check("game-lost-language", "the bedrock shelf lng31-lng40 is present",
    missingBedrock.length === 0, missingBedrock.join(","));

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

  /* The summit is the whole tongue on the longest bench: every rung stacks all
   * three pool floors, no earlier chamber touches the peak pools, the lexicon
   * never shrinks rung over rung, the bench climbs chamber by chamber, and the
   * tier's records are the campaign's records. */
  const summitProblems = [];
  summitIds.forEach((id, index) => {
    const def = byId[id];
    if (!def.peak || !def.deep || !def.wide) summitProblems.push(id + ":flags");
    if (def.nouns <= 16 || def.verbs <= 10) summitProblems.push(id + ":pool " + def.nouns + "/" + def.verbs);
    if (def.scenes <= 24) summitProblems.push(id + ":bench " + def.scenes);
    if (index > 0) {
      const prev = byId[summitIds[index - 1]];
      if (def.scenes <= prev.scenes) summitProblems.push(id + ":bench not above " + prev.id);
      if (def.nouns < prev.nouns || def.verbs < prev.verbs) summitProblems.push(id + ":pool shrinks");
    }
  });
  if (levels.slice(0, 24).some((level) => level.peak)) summitProblems.push("chambers 1-24 touch the peak pools");
  const firstThirty = levels.slice(0, 30);
  if (byId.lng30.scenes !== Math.max.apply(null, firstThirty.map((level) => level.scenes))) summitProblems.push("lng30 bench");
  if (byId.lng30.nouns !== Math.max.apply(null, firstThirty.map((level) => level.nouns))) summitProblems.push("lng30 nouns");
  if (byId.lng30.verbs !== Math.max.apply(null, firstThirty.map((level) => level.verbs))) summitProblems.push("lng30 verbs");
  if (byId.lng27.tests !== Math.max.apply(null, levels.map((level) => level.tests))) summitProblems.push("lng27 walls");
  check("game-lost-language",
    "every summit chamber reads the whole tongue on a longer bench, and the records are the first thirty's",
    summitProblems.length === 0, summitProblems.join(" | "));

  /* The bedrock shelf's law, real in the rows: every rung stacks the new
   * floor onto the summit's three, no earlier chamber touches the bedrock
   * pools, the lexicon is the widest the panel has shown and never shrinks
   * rung over rung, and the bench climbs one rubbing per chamber to the
   * longest the game deals. */
  const bedrockProblems = [];
  bedrockIds.forEach((id, index) => {
    const def = byId[id];
    if (!def.bedrock || !def.peak || !def.deep || !def.wide) bedrockProblems.push(id + ":flags");
    if (def.nouns !== 20 || def.verbs !== 12) bedrockProblems.push(id + ":pool " + def.nouns + "/" + def.verbs);
    if (def.scenes !== 31 + index) bedrockProblems.push(id + ":bench " + def.scenes);
    if (def.tests !== 8) bedrockProblems.push(id + ":walls " + def.tests);
    if (index > 0) {
      const prev = byId[bedrockIds[index - 1]];
      if (def.scenes <= prev.scenes) bedrockProblems.push(id + ":bench not above " + prev.id);
    }
  });
  if (levels.slice(0, 30).some((level) => level.bedrock)) bedrockProblems.push("chambers 1-30 touch the bedrock pools");
  if (byId.lng40.scenes !== Math.max.apply(null, levels.map((level) => level.scenes))) bedrockProblems.push("lng40 bench");
  if (byId.lng40.nouns !== Math.max.apply(null, levels.map((level) => level.nouns))) bedrockProblems.push("lng40 nouns");
  if (byId.lng40.verbs !== Math.max.apply(null, levels.map((level) => level.verbs))) bedrockProblems.push("lng40 verbs");
  check("game-lost-language",
    "every bedrock chamber draws from the widest lexicon the panel has shown on a longer bench, and the records are the bedrock's",
    bedrockProblems.length === 0, bedrockProblems.join(" | "));

  /* Proof bar: 40 seeds per chamber, the archive's own rigor. A deal ships
   * only when it exists, admits one analysis, defeats the gloss-only reader,
   * and carries the measured budget its own prefix walk proves. */
  const measureDeal = (dig) => !dig ||
    App.tongueAnalyses(dig, 2) !== 1 ||
    !App.tongueGlossOnlyFails(dig) ||
    App.tonguePrefixCost(dig) !== dig.budget;
  const deals = {};
  const failedSeeds = [];
  deepIds.forEach((id) => {
    deals[id] = [];
    for (let seed = 1; seed <= 40; seed += 1) {
      const dig = App.tongueGenerate(id, seed);
      if (measureDeal(dig)) failedSeeds.push(id + "#" + seed);
      else deals[id].push(dig);
    }
  });
  check("game-lost-language",
    "all one hundred and sixty second-shelf deals dig clean",
    failedSeeds.length === 0, failedSeeds.slice(0, 8).join(" "));

  const summitDeals = {};
  const failedSummitSeeds = [];
  summitIds.forEach((id) => {
    summitDeals[id] = [];
    for (let seed = 1; seed <= 40; seed += 1) {
      const dig = App.tongueGenerate(id, seed);
      if (measureDeal(dig)) failedSummitSeeds.push(id + "#" + seed);
      else summitDeals[id].push(dig);
    }
  });
  check("game-lost-language",
    "all two hundred and forty summit deals dig clean",
    failedSummitSeeds.length === 0, failedSummitSeeds.slice(0, 8).join(" "));

  const bedrockDeals = {};
  const failedBedrockSeeds = [];
  bedrockIds.forEach((id) => {
    bedrockDeals[id] = [];
    for (let seed = 1; seed <= 40; seed += 1) {
      const dig = App.tongueGenerate(id, seed);
      if (measureDeal(dig)) failedBedrockSeeds.push(id + "#" + seed);
      else bedrockDeals[id].push(dig);
    }
  });
  check("game-lost-language",
    "all four hundred bedrock deals dig clean",
    failedBedrockSeeds.length === 0, failedBedrockSeeds.slice(0, 8).join(" "));

  /* The climbs are measured, not asserted: each shelf chamber's mean honest
   * bench cost over the same 40 deals sits above the drowned archive's
   * shipped summit and rises chamber by chamber; each summit chamber's mean
   * then sits above the shelf's own summit - in honest cost and in carve -
   * and rises chamber by chamber again. */
  const meanHonest = (table, id) =>
    table[id].reduce((sum, dig) => sum + dig.budget, 0) / table[id].length;
  const meanCarve = (table, id) =>
    table[id].reduce((sum, dig) => sum + dig.need, 0) / table[id].length;
  const archiveMean = 17.7;
  const means = deepIds.map((id) => meanHonest(deals, id));
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

  const shelfTop = Math.max.apply(null, deepIds.map((id) => meanHonest(deals, id)));
  const shelfCarve = Math.max.apply(null, deepIds.map((id) => meanCarve(deals, id)));
  const summitMeans = summitIds.map((id) => meanHonest(summitDeals, id));
  const summitCarves = summitIds.map((id) => meanCarve(summitDeals, id));
  const summitClimbProblems = [];
  summitIds.forEach((id, index) => {
    if (!(summitMeans[index] > shelfTop)) summitClimbProblems.push(id + " " + summitMeans[index].toFixed(1));
    if (!(summitCarves[index] > shelfCarve)) summitClimbProblems.push(id + " carve " + summitCarves[index].toFixed(1));
    if (index > 0 && !(summitMeans[index] > summitMeans[index - 1])) {
      summitClimbProblems.push(id + " not above " + summitIds[index - 1]);
    }
  });
  check("game-lost-language",
    "every summit chamber's honest line and carve climb above the shelf's summit, in order",
    summitClimbProblems.length === 0,
    "means " + summitMeans.map((m) => m.toFixed(1)).join("/") +
      " vs shelf " + shelfTop.toFixed(1) + ", carves " + summitCarves.map((m) => m.toFixed(1)).join("/") +
      " vs shelf " + shelfCarve.toFixed(1));

  /* The bedrock shelf's climbs are measured, not asserted: every chamber's
   * mean honest cost sits above the summit's own record chamber, the second
   * half of the shelf never dips to the first half's best, the capstone
   * holds the campaign's record honest line, and every carve out-costs the
   * summit's mean carve. */
  const summitTop = Math.max.apply(null, summitMeans);
  const bedrockCarves = bedrockIds.map((id) => meanCarve(bedrockDeals, id));
  const summitCarveTop = Math.max.apply(null, summitCarves);
  const bedrockMeans = bedrockIds.map((id) => meanHonest(bedrockDeals, id));
  const bedrockClimbProblems = [];
  bedrockIds.forEach((id, index) => {
    if (!(bedrockMeans[index] > summitTop)) {
      bedrockClimbProblems.push(id + " " + bedrockMeans[index].toFixed(1) + " vs summit " + summitTop.toFixed(1));
    }
    if (!(bedrockCarves[index] > summitCarveTop)) {
      bedrockClimbProblems.push(id + " carve " + bedrockCarves[index].toFixed(1) + " vs summit " + summitCarveTop.toFixed(1));
    }
  });
  const firstHalf = Math.max.apply(null, bedrockMeans.slice(0, 5));
  const secondHalf = Math.min.apply(null, bedrockMeans.slice(5));
  if (!(secondHalf > firstHalf)) {
    bedrockClimbProblems.push("second half " + secondHalf.toFixed(1) + " does not clear the first half's " + firstHalf.toFixed(1));
  }
  if (!(bedrockMeans[bedrockMeans.length - 1] === Math.max.apply(null, bedrockMeans.concat(summitMeans)))) {
    bedrockClimbProblems.push("lng40 does not hold the campaign's record honest line");
  }
  check("game-lost-language",
    "every bedrock chamber's honest line and carve climb above the summit's, the second half outsits the first, and the capstone holds the campaign's record",
    bedrockClimbProblems.length === 0,
    "means " + bedrockMeans.map((m) => m.toFixed(1)).join("/") + " vs summit " + summitTop.toFixed(1) +
      ", carves " + bedrockCarves.map((m) => m.toFixed(1)).join("/") + " vs summit " + summitCarveTop.toFixed(1) +
      ", halves " + firstHalf.toFixed(1) + "/" + secondHalf.toFixed(1));

  /* The star ladder never falls on any dealt bench: budget <= mid <= total. */
  const ladderProblems = [];
  deepIds.concat(summitIds, bedrockIds).forEach((id) => {
    (deals[id] || []).concat(summitDeals[id] || [], bedrockDeals[id] || []).forEach((dig) => {
      const [top, mid, total] = App.tongueThresholds(dig);
      if (!(top <= mid && mid <= total && dig.budget <= total)) {
        ladderProblems.push(id + "#" + dig.seed + " " + top + "/" + mid + "/" + total);
      }
    });
  });
  check("game-lost-language", "the star thresholds hold on every shelf, summit and bedrock bench",
    ladderProblems.length === 0, ladderProblems.slice(0, 6).join(" | "));

  /* The top band is earned, never free: on every summit deal the honest line
   * the prefix walk proves scores three, no dig ever ships where fewer than
   * two rubbings decide the dialect, and a whole-bench read lands one star
   * whenever the honest line is shorter than the bench - the top band is the
   * honest line's, not the bench's. */
  const bandProblems = [];
  summitIds.forEach((id) => {
    summitDeals[id].forEach((dig) => {
      const th = App.tongueThresholds(dig);
      if (App.starsFor(dig.budget, th, "low") !== 3) bandProblems.push(id + "#" + dig.seed + " unreachable");
      if (dig.need < 2) bandProblems.push(id + "#" + dig.seed + " trivial");
      if (dig.budget < dig.total && App.starsFor(dig.total, th, "low") !== 1) {
        bandProblems.push(id + "#" + dig.seed + " whole bench");
      }
    });
  });
  check("game-lost-language",
    "the summit's three-star line is its measured honest line - earned, not free, on every deal",
    bandProblems.length === 0, bandProblems.slice(0, 6).join(" | "));

  /* The bedrock's top band is earned the same way: on every deal the honest
   * line scores three, no dig ships where fewer than two rubbings decide
   * the dialect, and a whole-bench read lands one star whenever the honest
   * line is shorter than the bench. */
  const bedrockBandProblems = [];
  bedrockIds.forEach((id) => {
    bedrockDeals[id].forEach((dig) => {
      const th = App.tongueThresholds(dig);
      if (App.starsFor(dig.budget, th, "low") !== 3) bedrockBandProblems.push(id + "#" + dig.seed + " unreachable");
      if (dig.need < 2) bedrockBandProblems.push(id + "#" + dig.seed + " trivial");
      if (dig.budget < dig.total && App.starsFor(dig.total, th, "low") !== 1) {
        bedrockBandProblems.push(id + "#" + dig.seed + " whole bench");
      }
    });
  });
  check("game-lost-language",
    "the bedrock's three-star line is its measured honest line - earned, not free, on every deal",
    bedrockBandProblems.length === 0, bedrockBandProblems.slice(0, 6).join(" | "));

  /* The cut: the stacked floors are the load-bearing dial. Strip wide, deep
   * and peak off the live def and the engine refuses every deal outright -
   * the bare base pools cannot clothe seventeen-eighteen nouns and eleven
   * verbs. Relax the dials to what those pools hold and the same deals dig
   * clean, but the honest line collapses below the shelf's summit: the
   * height is the wider floor's, not the longer bench's. */
  const shelfSummit = meanHonest(deals, "lng24");
  const cutProblems = [];
  summitIds.forEach((id) => {
    const def = byId[id];
    const saved = JSON.parse(JSON.stringify(def));
    def.wide = false;
    def.deep = false;
    def.peak = false;
    const dealt = [];
    for (let seed = 1; seed <= 40; seed += 1) {
      if (App.tongueGenerate(id, seed)) dealt.push(seed);
    }
    def.nouns = 12;
    def.verbs = 8;
    const cutBudgets = [];
    const cutFailed = [];
    for (let seed = 1; seed <= 40; seed += 1) {
      const dig = App.tongueGenerate(id, seed);
      if (measureDeal(dig)) { cutFailed.push(seed); continue; }
      cutBudgets.push(dig.budget);
    }
    Object.assign(def, saved);
    const restored = App.tongueGenerate(id, 1);
    if (!restored || restored.budget !== summitDeals[id][0].budget) cutProblems.push(id + ":restore");
    const cutMean = cutBudgets.reduce((sum, b) => sum + b, 0) / Math.max(1, cutBudgets.length);
    if (dealt.length) cutProblems.push(id + " dealt " + dealt.length + " stripped");
    if (cutFailed.length || !(cutMean < shelfSummit)) {
      cutProblems.push(id + " cut mean " + cutMean.toFixed(2) + ", fails " + cutFailed.join(","));
    }
  });
  check("game-lost-language",
    "every summit chamber loses its height with its stacked floors (refused outright, then below the shelf when relaxed)",
    cutProblems.length === 0, cutProblems.join(" | "));

  /* The bedrock cut: strip the bedrock floor off the live def and the engine
   * refuses every deal outright - the peak pools cannot clothe twenty nouns
   * and twelve verbs. Relax the dials to what those pools hold and the same
   * deals dig clean, but the honest line falls below the chamber's own
   * bedrock mean: the height is the wider floor's, not the longer bench's. */
  const bedrockCutProblems = [];
  bedrockIds.forEach((id, index) => {
    const def = byId[id];
    const saved = JSON.parse(JSON.stringify(def));
    def.bedrock = false;
    const dealt = [];
    for (let seed = 1; seed <= 40; seed += 1) {
      if (App.tongueGenerate(id, seed)) dealt.push(seed);
    }
    def.nouns = 18;
    def.verbs = 11;
    const cutBudgets = [];
    const cutFailed = [];
    for (let seed = 1; seed <= 40; seed += 1) {
      const dig = App.tongueGenerate(id, seed);
      if (measureDeal(dig)) { cutFailed.push(seed); continue; }
      cutBudgets.push(dig.budget);
    }
    Object.assign(def, saved);
    const restored = App.tongueGenerate(id, 1);
    if (!restored || restored.budget !== bedrockDeals[id][0].budget) bedrockCutProblems.push(id + ":restore");
    const cutMean = cutBudgets.reduce((sum, b) => sum + b, 0) / Math.max(1, cutBudgets.length);
    if (dealt.length) bedrockCutProblems.push(id + " dealt " + dealt.length + " stripped");
    if (cutFailed.length || !(cutMean < bedrockMeans[index])) {
      bedrockCutProblems.push(id + " cut mean " + cutMean.toFixed(2) + " vs bedrock " +
        bedrockMeans[index].toFixed(2) + ", fails " + cutFailed.join(","));
    }
  });
  check("game-lost-language",
    "every bedrock chamber loses its height with its floor (refused outright, then below its own bedrock line when relaxed)",
    bedrockCutProblems.length === 0, bedrockCutProblems.join(" | "));

  /* The unlock chain is derived, never stored: clearing each chamber in order
   * hands the player exactly the next one, all forty times. */
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
  check("game-lost-language", "the unlock chain walks all forty chambers in order",
    walked === 40 && chained && chain.clearedCount() === 40, walked + " first clears");

  /* Copy travels with the module. */
  const copyKeys = deepIds.concat(summitIds, bedrockIds).map((id) => byId[id].labelKey);
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-lost-language", "the twenty deep, summit and bedrock chamber names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
