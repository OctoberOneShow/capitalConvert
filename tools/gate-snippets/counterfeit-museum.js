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
 * header's "none of the three can be taken away" claim would be false.
 *
 * The paired wing cfm31-cfm40 carries the east wing's own law two steps
 * further - two frames wider and one forgery heavier per hall - and spends
 * the one structural lever the ladder had never pulled: `twins`, a field no
 * earlier row carries, dealing two to five twin pairs per hall where the
 * whole ladder shipped one or none. Each pair shares record, pigment and
 * ledger lines one wear line apart, so its reading only closes once the two
 * cards have been compared. The gate pins the wing's measured numbers (needs
 * 96 through 132, the east wing's +4-per-hall climb continued; rule-order
 * passes averaging 105.7 through 149.0), re-proves every deal unique,
 * kinds-needed and true, counts the pairs on each dealt sheet, checks each
 * pair really shares its three lines and differs in its wear, and runs the
 * same relax-one-rule cut across the wing. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.counterfeitLevels;
  const kinds = ["wear", "material", "provenance"];
  const wingIds = ["cfm25", "cfm26", "cfm27", "cfm28", "cfm29", "cfm30"];
  const pairedIds = ["cfm31", "cfm32", "cfm33", "cfm34", "cfm35", "cfm36", "cfm37", "cfm38", "cfm39", "cfm40"];
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
  /* The paired wing's measured numbers, pinned the same way over its seed
   * window. */
  const PAIRED_NEED = { cfm31: 96, cfm32: 100, cfm33: 104, cfm34: 108, cfm35: 112,
    cfm36: 116, cfm37: 120, cfm38: 124, cfm39: 128, cfm40: 132 };
  const PAIRED_MEAN = { cfm31: 105.7, cfm32: 110.1, cfm33: 115.5, cfm34: 118.9, cfm35: 124.8,
    cfm36: 129.8, cfm37: 135.2, cfm38: 141.2, cfm39: 144.0, cfm40: 149.0 };
  const PAIRED_TWINS = { cfm31: 2, cfm32: 2, cfm33: 3, cfm34: 3, cfm35: 3,
    cfm36: 4, cfm37: 4, cfm38: 4, cfm39: 5, cfm40: 5 };

  /* ---- ladder shape: forty ordered halls, the paired wing last ---- */
  check("game-counterfeit-museum", "the ladder holds forty halls",
    levels.length === 40, String(levels.length));
  const shapeProblems = levels.map((level, index) =>
    level.id === "cfm" + (index + 1) && level.labelKey === "cfmHall" + (index + 1)
      ? null
      : "slot " + (index + 1) + " carries " + level.id + "/" + level.labelKey
  ).filter(Boolean);
  check("game-counterfeit-museum", "the halls sit in order cfm1-cfm40 with matching labels",
    shapeProblems.length === 0, shapeProblems.join(" | "));
  const missingWing = wingIds.filter((id) => !byId[id]);
  check("game-counterfeit-museum", "the east wing cfm25-cfm30 is present",
    missingWing.length === 0, missingWing.join(","));
  const missingPaired = pairedIds.filter((id) => !byId[id]);
  check("game-counterfeit-museum", "the paired wing cfm31-cfm40 is present",
    missingPaired.length === 0, missingPaired.join(","));

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

  /* The paired wing carries the east wing's own law forward and spends the
   * twins dial: two frames wider and one forgery heavier per hall, twin
   * pairs climbing two to five - a field no earlier row carries - decoy logs
   * everywhere and no lot note. */
  const pairedDesign = [];
  pairedIds.forEach((id, index) => {
    const level = byId[id];
    if (!level) return;
    if (index > 0 && level.count !== byId[pairedIds[index - 1]].count + 2) {
      pairedDesign.push(id + " carries " + level.count + " frames, not two more");
    }
    const census = {};
    let forgery = 0;
    (level.mix || []).forEach((entry) => {
      census[entry.v] = (census[entry.v] || 0) + entry.n;
      if (entry.v === "forgery") forgery += entry.n;
    });
    const total = Object.keys(census).reduce((sum, v) => sum + census[v], 0);
    if (total !== level.count) {
      pairedDesign.push(id + ": census " + total + " over " + level.count + " frames");
    }
    if (index > 0) {
      const prev = byId[pairedIds[index - 1]];
      const prevForgery = (prev.mix || []).filter((e) => e.v === "forgery")
        .reduce((sum, e) => sum + e.n, 0);
      if (forgery !== prevForgery + 1) {
        pairedDesign.push(id + " hides " + forgery + " forgeries after " + prevForgery);
      }
    }
    const needRestored = (level.mix || []).filter((e) => e.v === "restored")
      .reduce((sum, e) => sum + e.n, 0);
    const needGenuine = (level.mix || []).filter((e) => e.v === "genuine")
      .reduce((sum, e) => sum + e.n, 0);
    if (needRestored < PAIRED_TWINS[id] || needGenuine < PAIRED_TWINS[id]) {
      pairedDesign.push(id + ": census cannot carry " + PAIRED_TWINS[id] + " twin pairs");
    }
    if (!level.twin || !level.decoyLog) {
      pairedDesign.push(id + ": twin=" + !!level.twin + " decoyLog=" + !!level.decoyLog);
    }
    if (level.twins !== PAIRED_TWINS[id]) {
      pairedDesign.push(id + " deals " + level.twins + " twin pairs, not " + PAIRED_TWINS[id]);
    }
    if (level.clue !== 0) {
      pairedDesign.push(id + " prints a lot note of " + level.clue);
    }
  });
  const earlyTwins = levels.slice(0, 30).filter((level) => level.twins !== undefined).map((level) => level.id);
  check("game-counterfeit-museum",
    "the paired wing widens two frames and one forgery per hall, deals two to five twin pairs, keeps decoy, prints no note - and no earlier hall carries twins",
    pairedDesign.length === 0 && earlyTwins.length === 0,
    pairedDesign.join(" | ") + (earlyTwins.length ? " | early twins: " + earlyTwins.join(",") : ""));

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

  /* ---- the paired wing, deepest: ten seeds per hall, none blank ---- */
  /* The wing's documented numbers re-measured on the module's own machinery:
   * every seed deals, every sheet is unique and proves to the dealt truth,
   * all three kinds are needed, the forcing minimum is exactly the pinned
   * one, and the hall's twin pairs are on the sheet - exactly `twins` of
   * them, each pair sharing record, pigment and ledger lines one wear line
   * apart. The star bands stay the module's own: opening exactly the
   * deciding lines scores three, one wasted line scores two. */
  const PAIRED_SEEDS = 10;
  const pairedProblems = [];
  const pairedMeasurements = {};
  pairedIds.forEach((id) => {
    const level = byId[id];
    if (!level) return;
    pairedMeasurements[id] = { needs: [], budgets: [], signatures: [] };
    for (let seed = 1; seed <= PAIRED_SEEDS; seed += 1) {
      const dealt = App.counterfeitGenerate(level, seed);
      if (!dealt) {
        pairedProblems.push(id + ": seed " + seed + " deals nothing");
        continue;
      }
      const m = pairedMeasurements[id];
      m.needs.push(dealt.need);
      m.budgets.push(dealt.budget);
      m.signatures.push(dealt.exhibits.map((e) =>
        e.claimed + ":" + e.logYear + ":" + e.name.en + ":" +
        e.rows.map((r) => r.kind + (r.stated ? 1 : 0) + (r.rate || r.matYear || r.entry)).join("|")
      ).join(";"));

      if (App.counterfeitSolutions(dealt, 2) !== 1) {
        pairedProblems.push(id + ": seed " + seed + " admits a second verdict sheet");
      }
      const solved = App.counterfeitFirstSolution(dealt);
      const truth = dealt.exhibits.map((exhibit) => exhibit.truth);
      if (solved.length !== truth.length || solved.some((v, i) => v !== truth[i])) {
        pairedProblems.push(id + ": seed " + seed + " first solution misses the dealt truth");
      }
      kinds.forEach((kind) => {
        if (App.counterfeitSolutionsOneKind(dealt, kind, "only") === 1) {
          pairedProblems.push(id + ": seed " + seed + " closes on " + kind + " alone");
        }
        if (App.counterfeitSolutionsOneKind(dealt, kind, "drop") === 1) {
          pairedProblems.push(id + ": seed " + seed + " survives dropping " + kind);
        }
      });

      /* The twin pairs are really on the sheet: exactly `twins` of them, and
       * each pair shares the record's date, its artist window and its log
       * year while the two wear lines differ - the comparison the pairs are
       * for. Pairs are matched by mutual reference, never by adjacency in
       * the sheet's order. */
      const pairedCards = dealt.exhibits.filter((e) => e.twin >= 0);
      if (pairedCards.length !== PAIRED_TWINS[id] * 2) {
        pairedProblems.push(id + ": seed " + seed + " hangs " + pairedCards.length / 2 +
          " twin pairs, not " + PAIRED_TWINS[id]);
      } else {
        const seen = {};
        pairedCards.forEach((card) => {
          if (seen[card.index] || dealt.exhibits[card.twin].twin !== card.index) {
            return;
          }
          seen[card.index] = true;
          seen[card.twin] = true;
          const other = dealt.exhibits[card.twin];
          const wearA = card.rows.find((r) => r.kind === "wear");
          const wearB = other.rows.find((r) => r.kind === "wear");
          const shared = card.claimed === other.claimed &&
            card.artist === other.artist &&
            card.logYear === other.logYear &&
            wearA && wearB && wearA.rate !== wearB.rate;
          if (!shared) {
            pairedProblems.push(id + ": seed " + seed + " hangs a pair that does not share its three lines one wear apart");
          }
        });
      }

      if (dealt.need !== PAIRED_NEED[id]) {
        pairedProblems.push(id + ": seed " + seed + " forcing minimum " + dealt.need +
          " vs documented " + PAIRED_NEED[id]);
      }
      if (dealt.total !== level.count * 3) {
        pairedProblems.push(id + ": seed " + seed + " prints " + dealt.total +
          " lines, not " + level.count * 3);
      }
      const thresholds = App.counterfeitThresholds(dealt);
      if (thresholds[0] !== dealt.need || thresholds[1] !== dealt.budget ||
          thresholds[2] !== dealt.total) {
        pairedProblems.push(id + ": seed " + seed + " thresholds " + thresholds.join("/") +
          " vs case " + [dealt.need, dealt.budget, dealt.total].join("/"));
      }
      if (!(dealt.need > 0 && dealt.need < dealt.budget && dealt.budget <= dealt.total)) {
        pairedProblems.push(id + ": seed " + seed + " bands do not nest " +
          [dealt.need, dealt.budget, dealt.total].join("/"));
      }
      if (App.starsFor(dealt.need, thresholds, "low") !== 3 ||
          App.starsFor(dealt.need + 1, thresholds, "low") !== 2) {
        pairedProblems.push(id + ": seed " + seed + " star band is not tight at " + dealt.need);
      }
    }
    const m = pairedMeasurements[id];
    if (m.needs.length !== PAIRED_SEEDS) {
      pairedProblems.push(id + ": only " + m.needs.length + " of " + PAIRED_SEEDS + " seeds dealt");
    }
    if (new Set(m.needs).size !== 1 || m.needs[0] !== PAIRED_NEED[id]) {
      pairedProblems.push(id + ": forcing minimum drifts " + m.needs.join(","));
    }
    if (new Set(m.signatures).size !== PAIRED_SEEDS) {
      pairedProblems.push(id + ": deals repeat across seeds (" +
        new Set(m.signatures).size + " distinct)");
    }
    const mean = m.budgets.reduce((sum, b) => sum + b, 0) / m.budgets.length;
    if (Math.abs(mean - PAIRED_MEAN[id]) > 1.5) {
      pairedProblems.push(id + ": rule-order pass averages " + mean.toFixed(1) +
        " vs documented " + PAIRED_MEAN[id]);
    }
  });
  const pairedClimb = pairedIds.every((id, index) =>
    index === 0 || PAIRED_NEED[id] === PAIRED_NEED[pairedIds[index - 1]] + 4);
  check("game-counterfeit-museum",
    "every paired-wing seed deals a unique sheet that proves to the truth at the documented minimum, with the pinned twin pairs hanging shared three-line readings",
    pairedProblems.length === 0, pairedProblems.slice(0, 4).join(" | "));
  check("game-counterfeit-museum",
    "the paired wing's forcing minimums are 96 through 132, climbing four per hall past the east wing's 86, with the passes averaging 105.7 through 149.0",
    pairedClimb && pairedIds.every((id) => pairedMeasurements[id] &&
      pairedMeasurements[id].needs.every((need) => need === PAIRED_NEED[id]) &&
      Math.abs(
        pairedMeasurements[id].budgets.reduce((sum, b) => sum + b, 0) /
          Math.max(1, pairedMeasurements[id].budgets.length) - PAIRED_MEAN[id]
      ) <= 1.5),
    pairedIds.map((id) => id + "=" + (pairedMeasurements[id]
      ? pairedMeasurements[id].needs.join("/") + " mean " +
        (pairedMeasurements[id].budgets.reduce((sum, b) => sum + b, 0) /
          Math.max(1, pairedMeasurements[id].budgets.length)).toFixed(1)
      : "unmeasured")).join(" "));

  /* ---- the cut: relax one evidence rule on a clone and the case reopens ---- */
  /* The carve stripped every line the case did not need, so the sheet that
   * ships is minimal. Taking one kind's lines back off a clone relaxes that
   * rule entirely; the counter must then admit more than one verdict sheet, or
   * the kind was decoration and the hall's difficulty was not real. The same
   * clone printed in full - every redundant line restored - must still admit
   * exactly one sheet, the carve invariant's other face. */
  const cutProblems = [];
  wingIds.concat(pairedIds).forEach((id) => {
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
    "relaxing wear, pigment or ledger on a clone reopens every east-wing and paired-wing case, and full printing never does",
    cutProblems.length === 0, cutProblems.join(" | "));

  /* ---- copy: the six new hall names resolve in both languages ---- */
  const wingKeys = wingIds.map((id) => byId[id] && byId[id].labelKey).filter(Boolean);
  const copyProblems = wingKeys.filter((key) =>
    !(App.I18N && App.I18N.en && typeof App.I18N.en[key] === "string" && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && typeof App.I18N.zh[key] === "string" && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key || App.I18N.zh[key] === App.I18N.en[key]);
  check("game-counterfeit-museum", "the six east-wing hall names resolve in both languages",
    wingKeys.length === 6 && copyProblems.length === 0, copyProblems.join(","));
  const pairedKeys = pairedIds.map((id) => byId[id] && byId[id].labelKey).filter(Boolean);
  const pairedCopyProblems = pairedKeys.filter((key) =>
    !(App.I18N && App.I18N.en && typeof App.I18N.en[key] === "string" && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && typeof App.I18N.zh[key] === "string" && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key || App.I18N.zh[key] === App.I18N.en[key]);
  check("game-counterfeit-museum", "the ten paired-wing hall names resolve in both languages",
    pairedKeys.length === 10 && pairedCopyProblems.length === 0, pairedCopyProblems.join(","));

  /* ---- the guide's claims match the data ---- */
  const desc = (App.getRegisteredGames ? App.getRegisteredGames() : [])
    .filter((game) => game.name === "counterfeitMuseum")[0];
  const guide = desc && desc.guide;
  const guideProblems = [];
  if (!guide || !Array.isArray(guide.en) || !Array.isArray(guide.zh)) {
    guideProblems.push("no bilingual guide registered");
  } else {
    if (!guide.en[0] || !/\b40\b/.test(guide.en[0]) ||
        !/\b4\b/.test(guide.en[0]) || !/\b56\b/.test(guide.en[0])) {
      guideProblems.push("en guide does not claim 40 halls, 4 to 56: " + guide.en[0]);
    }
    if (!guide.zh[0] || guide.zh[0].indexOf("四十") === -1 ||
        guide.zh[0].indexOf("4") === -1 || guide.zh[0].indexOf("56") === -1) {
      guideProblems.push("zh guide does not claim forty halls, 4 to 56: " + guide.zh[0]);
    }
    if (guide.en.some((line) => !line || line.indexOf(" ") === -1) ||
        guide.zh.some((line) => !line || !/\p{Script=Han}/u.test(line))) {
      guideProblems.push("a guide line is missing or untranslated");
    }
    const pairsLine = guide.en.some((line) => line.indexOf("Pairs:") === 0) &&
      guide.zh.some((line) => line.indexOf("成对") === 0);
    if (!pairsLine) {
      guideProblems.push("the guide carries no paired-wing line in both languages");
    }
  }
  const dataMatches = levels.length === 40 && levels[0].count === 4 &&
    levels[levels.length - 1].count === 56;
  check("game-counterfeit-museum",
    "the guide claims forty halls from 4 exhibits to 56 and the ladder is exactly that",
    guideProblems.length === 0 && dataMatches,
    guideProblems.join(" | ") + " data " + levels.length + "/" + levels[0].count +
      "/" + levels[levels.length - 1].count);

  /* ---- the unlock chain walks all forty halls ---- */
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
  check("game-counterfeit-museum", "the unlock chain walks all forty halls in order",
    walked === 40 && chained && chain.clearedCount() === 40, walked + " first clears");
};
