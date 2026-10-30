"use strict";

/* game-counterfeit-museum: every hall's dealt case is a unique verdict sheet,
 * and the east wing's difficulty is measured, not asserted.
 *
 * The module deals a case from a ground-truth census, then carves printed rows
 * away while App.counterfeitSolutions still reports exactly ONE satisfying
 * assignment - the discipline game-glyph-sudoku applies to givens. A deal only
 * ships when the three kinds of evidence still need each other, so this gate
 * holds every hall to that contract through the module's own machinery:
 * counterfeitGenerate over seeded streams, counterfeitSolutions for the carve
 * invariant, counterfeitFirstSolution against the dealt truth,
 * counterfeitKindsNeeded for the three-way interlock, and counterfeitThresholds
 * for the star bands the ledger prints.
 *
 * The header documents the forcing minimum - the lines left standing after the
 * carve - as 8, 14, 14, 14, 15, 20, 21, 24, 25, 28, 29, 30, 31, 36, 39, 42,
 * 36, 21, 45, 50 across the first twenty halls and 66, 70, 74, 78, 82, 86
 * across the east wing (halls 25-30), with the wing's rule-order passes
 * averaging 72, 77, 82, 87, 92, 97 of 78, 84, 90, 96, 102, 108 printed lines.
 * The gate re-measures those numbers on every run, so the comments cannot rot:
 * a hall whose minimum drifts from the documented one fails. Three stars means
 * closing inside the minimum, so the wing also has to prove the band reachable
 * (the stated lines alone decide the case, so opening exactly them closes it)
 * and tight (one wasted line drops a star, because the taught rule-order pass
 * costs strictly more than the minimum on every deal).
 *
 * The cut at the bottom is the load-bearing proof: a clone of an east-wing
 * deal with one evidence rule relaxed - every wear, pigment or ledger line
 * taken back off the sheet - must reopen the case the carve had closed. A kind
 * whose removal still leaves a single answer would be decoration, and the
 * header's "none of the three can be taken away" claim would be false. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.counterfeitLevels;
  const kinds = ["wear", "material", "provenance"];
  const wingIds = ["cfm25", "cfm26", "cfm27", "cfm28", "cfm29", "cfm30"];
  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });

  /* The shipped forcing minimums, hall by hall. The first twenty are the ones
   * the module header prints; 21-24 are re-measured constants this gate pins
   * so the ladder cannot drift between the documented rungs and the wing. */
  const SHIPPED_NEED = [8, 14, 14, 14, 15, 20, 21, 24, 25, 28, 29, 30, 31, 36,
    39, 42, 36, 21, 45, 50, 48, 39, 57, 60];
  /* The east wing's documented numbers: the forcing minimum and the average
   * cost of the taught rule-order pass, per hall. */
  const WING_NEED = { cfm25: 66, cfm26: 70, cfm27: 74, cfm28: 78, cfm29: 82, cfm30: 86 };
  const WING_MEAN = { cfm25: 72, cfm26: 77, cfm27: 82, cfm28: 87, cfm29: 92, cfm30: 97 };

  /* ---- ladder shape: thirty ordered halls, the east wing last ---- */
  check("game-counterfeit-museum", "the ladder holds thirty halls",
    levels.length === 30, String(levels.length));
  const shapeProblems = levels.map((level, index) =>
    level.id === "cfm" + (index + 1) && level.labelKey === "cfmHall" + (index + 1)
      ? null
      : "slot " + (index + 1) + " carries " + level.id + "/" + level.labelKey
  ).filter(Boolean);
  check("game-counterfeit-museum", "the halls sit in order cfm1-cfm30 with matching labels",
    shapeProblems.length === 0, shapeProblems.join(" | "));
  const missingWing = wingIds.filter((id) => !byId[id]);
  check("game-counterfeit-museum", "the east wing cfm25-cfm30 is present",
    missingWing.length === 0, missingWing.join(","));

  /* The wing the comments advertise: two frames wider each rung, one forgery
   * heavier, all six keeping the twin pairing and the decoy logs and printing
   * no lot note - the census has to be earned card by card. */
  const wingDesign = [];
  wingIds.forEach((id, index) => {
    const level = byId[id];
    if (!level) return;
    if (index > 0 && level.count !== byId[wingIds[index - 1]].count + 2) {
      wingDesign.push(id + " carries " + level.count + " frames, not two more");
    }
    const census = {};
    let forgery = 0;
    (level.mix || []).forEach((entry) => {
      census[entry.v] = (census[entry.v] || 0) + entry.n;
      if (entry.v === "forgery") forgery += entry.n;
    });
    const total = Object.keys(census).reduce((sum, v) => sum + census[v], 0);
    if (total !== level.count) {
      wingDesign.push(id + ": census " + total + " over " + level.count + " frames");
    }
    if (index > 0) {
      const prev = byId[wingIds[index - 1]];
      const prevForgery = (prev.mix || []).filter((e) => e.v === "forgery")
        .reduce((sum, e) => sum + e.n, 0);
      if (forgery !== prevForgery + 1) {
        wingDesign.push(id + " hides " + forgery + " forgeries after " + prevForgery);
      }
    }
    if (!level.twin || !level.decoyLog) {
      wingDesign.push(id + ": twin=" + !!level.twin + " decoyLog=" + !!level.decoyLog);
    }
    if (level.clue !== 0) {
      wingDesign.push(id + " prints a lot note of " + level.clue);
    }
  });
  check("game-counterfeit-museum",
    "the east wing widens two frames and one forgery per hall, keeps twin and decoy, prints no note",
    wingDesign.length === 0, wingDesign.join(" | "));

  /* ---- every hall deals provable cases, through the module's machinery ---- */
  /* The shipped halls: the first six deals from the seeded stream (the
   * registrar retries a blank deal in-game, so a seed that deals nothing is
   * skipped, but forty attempts must yield the six). Each deal must satisfy
   * the carve invariant, need all three kinds, prove to the dealt truth, and
   * measure the forcing minimum the header printed for it. */
  const dealProblems = [];
  const measured = {};
  levels.slice(0, 24).forEach((level, hallIndex) => {
    const documented = SHIPPED_NEED[hallIndex];
    const deals = [];
    for (let seed = 1; deals.length < 6 && seed <= 40; seed += 1) {
      const dealt = App.counterfeitGenerate(level, seed);
      if (dealt) deals.push({ seed, dealt });
    }
    if (deals.length < 6) {
      dealProblems.push(level.id + ": only " + deals.length + " deals in 40 seeds");
      return;
    }
    measured[level.id] = [];
    deals.forEach(({ seed, dealt }) => {
      if (App.counterfeitSolutions(dealt, 2) !== 1) {
        dealProblems.push(level.id + ": seed " + seed + " admits a second verdict sheet");
      }
      if (!App.counterfeitKindsNeeded(dealt)) {
        dealProblems.push(level.id + ": seed " + seed + " closes on one evidence kind");
      }
      const solved = App.counterfeitFirstSolution(dealt);
      const truth = dealt.exhibits.map((exhibit) => exhibit.truth);
      if (solved.length !== truth.length || solved.some((v, i) => v !== truth[i])) {
        dealProblems.push(level.id + ": seed " + seed + " first solution misses the dealt truth");
      }
      measured[level.id].push(dealt.need);
    });
    if (measured[level.id].some((need) => need !== documented)) {
      dealProblems.push(level.id + ": forcing minimum " +
        measured[level.id].join("/") + " vs documented " + documented);
    }
  });
  check("game-counterfeit-museum",
    "every shipped hall deals unique sheets that prove to the dealt truth at the documented minimum",
    dealProblems.length === 0, dealProblems.slice(0, 4).join(" | "));

  /* ---- the east wing, deepest: thirty seeds per hall, none blank ---- */
  /* The header claims one hundred seeds per hall, all unique and all dealing.
   * Thirty consecutive seeds must all deal, all stay unique verdict sheets,
   * all need the three kinds together, and all measure exactly the documented
   * forcing minimum - the wing's difficulty is a constant, not a hope. */
  const WING_SEEDS = 30;
  const wingProblems = [];
  const wingMeasurements = {};
  wingIds.forEach((id) => {
    const level = byId[id];
    if (!level) return;
    wingMeasurements[id] = { needs: [], budgets: [], signatures: [] };
    for (let seed = 1; seed <= WING_SEEDS; seed += 1) {
      const dealt = App.counterfeitGenerate(level, seed);
      if (!dealt) {
        wingProblems.push(id + ": seed " + seed + " deals nothing");
        continue;
      }
      const m = wingMeasurements[id];
      m.needs.push(dealt.need);
      m.budgets.push(dealt.budget);
      m.signatures.push(dealt.exhibits.map((e) =>
        e.claimed + ":" + e.logYear + ":" + e.name.en + ":" +
        e.rows.map((r) => r.kind + (r.stated ? 1 : 0) + (r.rate || r.matYear || r.entry)).join("|")
      ).join(";"));

      if (App.counterfeitSolutions(dealt, 2) !== 1) {
        wingProblems.push(id + ": seed " + seed + " admits a second verdict sheet");
      }
      const solved = App.counterfeitFirstSolution(dealt);
      const truth = dealt.exhibits.map((exhibit) => exhibit.truth);
      if (solved.length !== truth.length || solved.some((v, i) => v !== truth[i])) {
        wingProblems.push(id + ": seed " + seed + " first solution misses the dealt truth");
      }
      /* No hall closes on wear alone, pigment alone or ledger alone, and no
       * kind can be taken away: both readings of the header's interlock,
       * checked kind by kind on the module's own counter. */
      kinds.forEach((kind) => {
        if (App.counterfeitSolutionsOneKind(dealt, kind, "only") === 1) {
          wingProblems.push(id + ": seed " + seed + " closes on " + kind + " alone");
        }
        if (App.counterfeitSolutionsOneKind(dealt, kind, "drop") === 1) {
          wingProblems.push(id + ": seed " + seed + " survives dropping " + kind);
        }
      });

      /* The measured numbers against the documented ones. */
      if (dealt.need !== WING_NEED[id]) {
        wingProblems.push(id + ": seed " + seed + " forcing minimum " + dealt.need +
          " vs documented " + WING_NEED[id]);
      }
      if (dealt.total !== level.count * 3) {
        wingProblems.push(id + ": seed " + seed + " prints " + dealt.total +
          " lines, not " + level.count * 3);
      }

      /* Three stars is closing inside the minimum, so the band has to be
       * reachable and tight: opening exactly the deciding lines scores three,
       * one wasted line scores two, and the taught rule-order pass costs
       * strictly more than the minimum but never more than the sheet. */
      const thresholds = App.counterfeitThresholds(dealt);
      if (thresholds[0] !== dealt.need || thresholds[1] !== dealt.budget ||
          thresholds[2] !== dealt.total) {
        wingProblems.push(id + ": seed " + seed + " thresholds " + thresholds.join("/") +
          " vs case " + [dealt.need, dealt.budget, dealt.total].join("/"));
      }
      if (!(dealt.need > 0 && dealt.need < dealt.budget && dealt.budget <= dealt.total)) {
        wingProblems.push(id + ": seed " + seed + " bands do not nest " +
          [dealt.need, dealt.budget, dealt.total].join("/"));
      }
      if (App.starsFor(dealt.need, thresholds, "low") !== 3 ||
          App.starsFor(dealt.need + 1, thresholds, "low") !== 2) {
        wingProblems.push(id + ": seed " + seed + " star band is not tight at " + dealt.need);
      }
    }
    const m = wingMeasurements[id];
    if (m.needs.length !== WING_SEEDS) {
      wingProblems.push(id + ": only " + m.needs.length + " of " + WING_SEEDS + " seeds dealt");
    }
    if (new Set(m.needs).size !== 1 || m.needs[0] !== WING_NEED[id]) {
      wingProblems.push(id + ": forcing minimum drifts " + m.needs.join(","));
    }
    if (new Set(m.signatures).size !== WING_SEEDS) {
      wingProblems.push(id + ": deals repeat across seeds (" +
        new Set(m.signatures).size + " distinct)");
    }
    const mean = m.budgets.reduce((sum, b) => sum + b, 0) / m.budgets.length;
    if (Math.abs(mean - WING_MEAN[id]) > 1.5) {
      wingProblems.push(id + ": rule-order pass averages " + mean.toFixed(1) +
        " vs documented " + WING_MEAN[id]);
    }
  });
  check("game-counterfeit-museum",
    "every east-wing seed deals a unique sheet that proves to the truth at the documented minimum",
    wingProblems.length === 0, wingProblems.slice(0, 4).join(" | "));
  check("game-counterfeit-museum",
    "the wing's measured forcing minimums are 66, 70, 74, 78, 82, 86 and its passes average 72, 77, 82, 87, 92, 97",
    wingIds.every((id) => wingMeasurements[id] &&
      wingMeasurements[id].needs.every((need) => need === WING_NEED[id]) &&
      Math.abs(
        wingMeasurements[id].budgets.reduce((sum, b) => sum + b, 0) /
          Math.max(1, wingMeasurements[id].budgets.length) - WING_MEAN[id]
      ) <= 1.5),
    wingIds.map((id) => id + "=" + (wingMeasurements[id]
      ? wingMeasurements[id].needs.join("/") + " mean " +
        (wingMeasurements[id].budgets.reduce((sum, b) => sum + b, 0) /
          Math.max(1, wingMeasurements[id].budgets.length)).toFixed(1)
      : "unmeasured")).join(" "));

  /* ---- the cut: relax one evidence rule on a clone and the case reopens ---- */
  /* The carve stripped every line the case did not need, so the sheet that
   * ships is minimal. Taking one kind's lines back off a clone relaxes that
   * rule entirely; the counter must then admit more than one verdict sheet, or
   * the kind was decoration and the hall's difficulty was not real. The same
   * clone printed in full - every redundant line restored - must still admit
   * exactly one sheet, the carve invariant's other face. */
  const cutProblems = [];
  wingIds.forEach((id) => {
    const level = byId[id];
    const dealt = App.counterfeitGenerate(level, 41001);
    if (!dealt) {
      cutProblems.push(id + ": nothing dealt to cut");
      return;
    }
    kinds.forEach((kind) => {
      const relaxed = JSON.parse(JSON.stringify(dealt));
      relaxed.exhibits.forEach((exhibit) => {
        exhibit.rows.forEach((row) => {
          if (row.kind === kind) row.stated = false;
        });
      });
      const reopened = App.counterfeitSolutions(relaxed, 3);
      if (!(reopened > 1)) {
        cutProblems.push(id + ": relaxing " + kind + " leaves " + reopened + " answers");
      }
    });
    const printed = JSON.parse(JSON.stringify(dealt));
    printed.exhibits.forEach((exhibit) => {
      exhibit.rows.forEach((row) => { row.stated = true; });
    });
    if (App.counterfeitSolutions(printed, 2) !== 1) {
      cutProblems.push(id + ": printing every line opens a second answer");
    }
  });
  check("game-counterfeit-museum",
    "relaxing wear, pigment or ledger on a clone reopens every east-wing case, and full printing never does",
    cutProblems.length === 0, cutProblems.join(" | "));

  /* ---- copy: the six new hall names resolve in both languages ---- */
  const wingKeys = wingIds.map((id) => byId[id] && byId[id].labelKey).filter(Boolean);
  const copyProblems = wingKeys.filter((key) =>
    !(App.I18N && App.I18N.en && typeof App.I18N.en[key] === "string" && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && typeof App.I18N.zh[key] === "string" && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key || App.I18N.zh[key] === App.I18N.en[key]);
  check("game-counterfeit-museum", "the six east-wing hall names resolve in both languages",
    wingKeys.length === 6 && copyProblems.length === 0, copyProblems.join(","));

  /* ---- the guide's claims match the data ---- */
  const desc = (App.getRegisteredGames ? App.getRegisteredGames() : [])
    .filter((game) => game.name === "counterfeitMuseum")[0];
  const guide = desc && desc.guide;
  const guideProblems = [];
  if (!guide || !Array.isArray(guide.en) || !Array.isArray(guide.zh)) {
    guideProblems.push("no bilingual guide registered");
  } else {
    if (!guide.en[0] || !/\b30\b/.test(guide.en[0]) ||
        !/\b4\b/.test(guide.en[0]) || !/\b36\b/.test(guide.en[0])) {
      guideProblems.push("en guide does not claim 30 halls, 4 to 36: " + guide.en[0]);
    }
    if (!guide.zh[0] || guide.zh[0].indexOf("三十") === -1 ||
        guide.zh[0].indexOf("4") === -1 || guide.zh[0].indexOf("36") === -1) {
      guideProblems.push("zh guide does not claim thirty halls, 4 to 36: " + guide.zh[0]);
    }
    if (guide.en.some((line) => !line || line.indexOf(" ") === -1) ||
        guide.zh.some((line) => !line || !/\p{Script=Han}/u.test(line))) {
      guideProblems.push("a guide line is missing or untranslated");
    }
  }
  const dataMatches = levels.length === 30 && levels[0].count === 4 &&
    levels[levels.length - 1].count === 36;
  check("game-counterfeit-museum",
    "the guide claims thirty halls from 4 exhibits to 36 and the ladder is exactly that",
    guideProblems.length === 0 && dataMatches,
    guideProblems.join(" | ") + " data " + levels.length + "/" + levels[0].count +
      "/" + levels[levels.length - 1].count);

  /* ---- the unlock chain walks all thirty halls ---- */
  const chain = App.createCampaign({
    key: "counterfeit-museum-gate-chain",
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
  check("game-counterfeit-museum", "the unlock chain walks all thirty halls in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
