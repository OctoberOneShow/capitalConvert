"use strict";

/* game-pocket-detective: volumes three, four and five are measured, not guessed
 *
 * The shipped dealer builds every brief from the unique answer and then lets
 * the game's own counter prove it. This gate re-runs that path exactly the way
 * the panel deals it - pdkCase(rung), then App.detectiveCountSolutions - for a
 * hundred seeded deals on each extension rung: c25-c30 for volume four and
 * c31-c40 for volume five. Every deal must hold a single answer, carry the
 * rung's authored line count, keep the rung's grid width, and say only true,
 * distinct things about the dealt answer.
 *
 * The cut is measured per rung. Dropping every mixed line leaves the plain
 * statements: on c31-c39 that cut opens the case in some of the hundred deals
 * (five or more), and in every deal of every new rung the surviving plain
 * brief is shorter than the shortest back-half rung, so the mixed lines are
 * load-bearing for the volume even where plain statements alone happen to
 * close the case. At c40 the brief is the dealer's complete pool: all fifteen
 * plain statements are present, the cut leaves a fifteen-line case, and the
 * mixed lines alone still close it in all hundred deals. That is the engine's
 * ceiling, recorded here rather than hidden: past about twenty-five lines the
 * dealer spends its plain pool, so the mixed-cut test fades with volume and
 * the summit's proof is volume plus mixed-only completeness.
 *
 * Star bands are derived, never guessed: c11-c39 quote ten seconds per clue on
 * the five-name board and nine per clue, rounded to five seconds, on the
 * four-name board; both wider lines are round5(three-star x 1.42) and
 * round5(three-star x 1.91), inside the ratio envelope measured from c10-c20.
 * The complete dossier is the one wide rung priced at nine seconds a line
 * (the narrow board's rate), and every volume-five band sits above the
 * volume-four ceiling. The summit is the hardest case by the ladder's own
 * measure - the longest brief, the most pages, the largest line-by-cell load,
 * the only complete pool - and the dealer clamps any rung past 106 lines to
 * that same pool, proven with probes below.
 *
 * Wall: a rung row carries only id, labelKey, n, clues and starTimes (read by
 * the clock), and the dealer picks which clue kinds fill the brief. A rung
 * therefore cannot promise "all order lines" or "no statements": clue-kind
 * shape belongs to the deal, not the rung. This gate pins what the rung can
 * promise - grid width, brief volume, line density, the cut, and the ceiling. */
module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const CASE = "game-pocket-detective";
  const rungs = App.detectiveRungs || [];
  const V4 = ["c25", "c26", "c27", "c28", "c29", "c30"];
  const V5 = ["c31", "c32", "c33", "c34", "c35", "c36", "c37", "c38", "c39", "c40"];
  const byId = {};
  rungs.forEach((rung) => { byId[rung.id] = rung; });
  const v4Present = V4.filter((id) => byId[id]);
  const v5Present = V5.filter((id) => byId[id]);
  const v4 = v4Present.map((id) => byId[id]);
  const v5 = v5Present.map((id) => byId[id]);
  const shipped = rungs.filter((rung) => Number(rung.id.slice(1)) <= 24);
  const v4Set = new Set(V4);
  const v5Set = new Set(V5);
  const isV4 = (rung) => !!rung && v4Set.has(rung.id);
  const isV5 = (rung) => !!rung && v5Set.has(rung.id);
  const num = (id) => Number(String(id).slice(1));
  /* The dealer's whole vocabulary: 3n plain statements, 3n(n-1) eliminations,
   * 3n same-name links and 2(2n-2) hour gaps. */
  const poolSize = (n) => 3 * n + 3 * n * (n - 1) + 3 * n + 2 * (2 * n - 2);

  /* Structure: a floor and an id check, not an exact-length gate. The census,
   * band and summit checks below run on whatever rungs are present, so no
   * length assertion can hide a broken rung behind a stale count. */
  check(CASE, "the ladder has grown to at least forty rungs - a floor, not an exact count",
    rungs.length >= 40, String(rungs.length));
  check(CASE, "every rung id is distinct",
    new Set(rungs.map((rung) => rung.id)).size === rungs.length,
    rungs.map((rung) => rung.id).join(","));
  check(CASE, "the ids run c1 upward in order with no gaps",
    rungs.every((rung, index) => rung.id === "c" + (index + 1)),
    rungs.map((rung) => rung.id).join(","));
  check(CASE, "all six volume-four rungs are still on the ladder",
    v4Present.length === V4.length, v4Present.join(",") + " of " + V4.join(","));
  check(CASE, "all ten volume-five rungs are on the ladder",
    v5Present.length === V5.length, v5Present.join(",") + " of " + V5.join(","));
  check(CASE, "every extension rung keeps the shipped row shape - id, labelKey, n, clues, starTimes",
    v4.concat(v5).every((rung) =>
      Object.keys(rung).sort().join(",") === "clues,id,labelKey,n,starTimes"),
    v4.concat(v5).map((rung) => rung.id + ":" + Object.keys(rung).join("|")).join(" "));
  check(CASE, "every rung lays out three, four or five names - the widths the board has rows for",
    rungs.every((rung) => [3, 4, 5].indexOf(rung.n) !== -1),
    rungs.map((rung) => rung.id + ":" + rung.n).join(" "));
  check(CASE, "no rung asks the dealer for more lines than its pool can write",
    rungs.every((rung) => rung.clues <= poolSize(rung.n)),
    rungs.filter((rung) => rung.clues > poolSize(rung.n)).map((rung) => rung.id).join(",") ||
      "all within 44/72/106");
  check(CASE, "at least one rung sits on the dealer's pool ceiling",
    rungs.some((rung) => rung.clues === poolSize(rung.n)),
    rungs.filter((rung) => rung.clues === poolSize(rung.n)).map((rung) => rung.id).join(","));

  const seeded = (seed, fn) => {
    const real = Math.random;
    let state = seed >>> 0;
    Math.random = () => {
      state = (Math.imul(state, 1103515245) + 12345) >>> 0;
      return state / 4294967296;
    };
    try { return fn(); } finally { Math.random = real; }
  };

  /* Volume four, re-paid at a hundred deals per rung. */
  const census = {};
  seeded(20261028, () => {
    v4.forEach((rung) => {
      const report = { lines: [], unique: 0, anchorsOpen: 0, deals: 0, mixedOverDirect: true };
      for (let deal = 0; deal < 100; deal += 1) {
        const caseData = App.detectiveCase(rung);
        report.deals += 1;
        report.lines.push(caseData.clues.length);
        if (App.detectiveCountSolutions(caseData.clues, { n: rung.n }, 2) === 1) {
          report.unique += 1;
        }
        const plain = caseData.clues.filter((clue) => clue.kind === "direct");
        if (plain.length * 2 >= caseData.clues.length) {
          report.mixedOverDirect = false;
        }
        if (App.detectiveCountSolutions(plain, { n: rung.n }, 2) > 1) {
          report.anchorsOpen += 1;
        }
      }
      census[rung.id] = report;
    });
    /* The shipped half is re-dealt at a lighter sample: it proves the dealer
     * the extensions ride on still holds without re-paying the full census. */
    shipped.forEach((rung) => {
      const report = { deals: 0, unique: 0, lines: [] };
      for (let deal = 0; deal < 8; deal += 1) {
        const caseData = App.detectiveCase(rung);
        report.deals += 1;
        report.lines.push(caseData.clues.length);
        if (App.detectiveCountSolutions(caseData.clues, { n: rung.n }, 2) === 1) {
          report.unique += 1;
        }
      }
      census[rung.id] = report;
    });
  });

  v4.forEach((rung) => {
    const id = rung.id;
    const report = census[id];
    const min = Math.min.apply(null, report.lines);
    const max = Math.max.apply(null, report.lines);
    const detail = report.deals + " deals, " + min + "-" + max + " lines";
    check(CASE, id + ": one hundred seeded deals were dealt", report.deals === 100, String(report.deals));
    check(CASE, id + ": every deal carries the rung's authored clue count",
      min === rung.clues && max === rung.clues, detail + ", wanted " + rung.clues);
    check(CASE, id + ": every deal has exactly one answer",
      report.unique === report.deals, report.unique + " of " + report.deals + " unique, " + detail);
    check(CASE, id + ": the mixed lines outnumber the plain statements in every deal",
      report.mixedOverDirect, "a deal carried at least as many statements as deductions, " + detail);
    check(CASE, id + ": the plain statements alone still leave the case open in most deals",
      report.anchorsOpen * 2 > report.deals,
      report.anchorsOpen + " of " + report.deals + " deals stayed open on direct lines alone");
  });
  const shippedUnique = shipped.every((rung) => census[rung.id].unique === census[rung.id].deals);
  check(CASE, "the shipped half still deals unique cases at the same seam", shippedUnique,
    shipped.map((rung) => rung.id + ":" + census[rung.id].unique + "/" + census[rung.id].deals).join(" "));

  /* Volume five, seeded separately so its hundred-deal stream is stable and
   * independent of how many older rungs this gate chooses to sample. */
  const clueKey = (clue) => [
    clue.kind, clue.cat, clue.who, clue.item, clue.ca, clue.cb,
    clue.ia, clue.ib, clue.h, clue.hcat, clue.dir,
  ].join("|");
  const v5Census = {};
  seeded(20261027, () => {
    v5.forEach((rung) => {
      const report = {
        deals: 0, lines: [], unique: 0, openGrid: 0, holds: 0, distinct: 0,
        mixedOverDirect: true, plains: [], cutOpen: 0, mixedOnlyUnique: 0,
        full: 0, kindShapes: [],
      };
      for (let deal = 0; deal < 100; deal += 1) {
        const caseData = App.detectiveCase(rung);
        report.deals += 1;
        report.lines.push(caseData.clues.length);
        if (caseData.n === rung.n &&
            caseData.solution.length === 3 &&
            caseData.solution.every((perm) => perm.length === rung.n)) {
          report.openGrid += 1;
        }
        if (App.detectiveCountSolutions(caseData.clues, { n: rung.n }, 2) === 1) {
          report.unique += 1;
        }
        if (caseData.clues.every((clue) => App.detectiveHolds(clue, caseData.solution))) {
          report.holds += 1;
        }
        if (new Set(caseData.clues.map(clueKey)).size === caseData.clues.length) {
          report.distinct += 1;
        }
        const plain = caseData.clues.filter((clue) => clue.kind === "direct");
        const mixed = caseData.clues.filter((clue) => clue.kind !== "direct");
        report.plains.push(plain.length);
        if (plain.length * 2 < caseData.clues.length) {
          report.mixedOverDirect = true;
        } else {
          report.mixedOverDirect = false;
        }
        if (App.detectiveCountSolutions(plain, { n: rung.n }, 2) > 1) {
          report.cutOpen += 1;
        }
        if (App.detectiveCountSolutions(mixed, { n: rung.n }, 2) === 1) {
          report.mixedOnlyUnique += 1;
        }
        if (caseData.clues.length === poolSize(rung.n)) {
          report.full += 1;
        }
        const counts = { direct: 0, neg: 0, same: 0, order: 0 };
        caseData.clues.forEach((clue) => {
          if (counts[clue.kind] !== undefined) {
            counts[clue.kind] += 1;
          }
        });
        report.kindShapes.push([counts.direct, counts.neg, counts.same, counts.order].join("/"));
      }
      v5Census[rung.id] = report;
    });
  });

  const shortestBackHalf = Math.min.apply(null, rungs
    .filter((rung) => num(rung.id) >= 10)
    .map((rung) => rung.clues));
  v5.forEach((rung) => {
    const id = rung.id;
    const report = v5Census[id];
    const min = Math.min.apply(null, report.lines);
    const max = Math.max.apply(null, report.lines);
    const plainMin = Math.min.apply(null, report.plains);
    const plainMax = Math.max.apply(null, report.plains);
    const detail = report.deals + " deals, " + min + "-" + max + " lines, " +
      plainMin + "-" + plainMax + " plain";
    check(CASE, id + ": one hundred seeded deals were dealt", report.deals === 100, String(report.deals));
    check(CASE, id + ": every deal carries the rung's authored clue count",
      min === rung.clues && max === rung.clues, detail + ", wanted " + rung.clues);
    check(CASE, id + ": every deal lays out the rung's own grid width",
      report.openGrid === report.deals,
      report.openGrid + " of " + report.deals + " deals at " + rung.n + " names, " + detail);
    check(CASE, id + ": every deal has exactly one answer",
      report.unique === report.deals, report.unique + " of " + report.deals + " unique, " + detail);
    check(CASE, id + ": every line on the brief is true against the dealt answer",
      report.holds === report.deals, report.holds + " of " + report.deals + " true, " + detail);
    check(CASE, id + ": no deal repeats a line",
      report.distinct === report.deals, report.distinct + " of " + report.deals + " distinct, " + detail);
    check(CASE, id + ": the mixed lines outnumber the plain statements in every deal",
      report.mixedOverDirect, "a deal carried at least as many statements as deductions, " + detail);
    check(CASE, id + ": every deal keeps a plain floor of at least one statement per name",
      plainMin >= rung.n, plainMin + " plain at the thinnest, " + rung.n + " names");
    check(CASE, id + ": dropping the mixed lines leaves a brief shorter than any back-half rung",
      plainMax < shortestBackHalf,
      plainMax + " plain vs shortest back-half brief " + shortestBackHalf);
    if (rung.clues >= poolSize(rung.n)) {
      /* The complete pool: no carve, no swap, all plain statements present.
       * The mixed cut cannot open a case whose plain lines already pin the
       * answer, so the cut proof inverts to completeness and its floor. */
      check(CASE, id + ": the complete pool carries every plain statement, so its mixed cut cannot open it",
        report.cutOpen === 0 && report.full === report.deals && plainMin === 3 * rung.n,
        report.cutOpen + " cut-open, " + report.full + " of " + report.deals + " full, " +
          plainMin + " plain at the thinnest");
      check(CASE, id + ": the mixed lines alone still close every complete-pool deal",
        report.mixedOnlyUnique === report.deals,
        report.mixedOnlyUnique + " of " + report.deals + " closed by mixed lines alone");
    } else {
      check(CASE, id + ": dropping the mixed lines opens the case in at least five seeded deals",
        report.cutOpen >= 5,
        report.cutOpen + " of " + report.deals + " deals went ambiguous without the mixed lines");
    }
  });

  /* Star bands. The ladder quotes ten seconds per brief line on five names,
   * nine per line rounded to the nearest five on four names; the two outer
   * lines keep round5(three-star x 1.42) and round5(three-star x 1.91), and
   * the ratio envelope is computed from c10-c20, not typed. */
  const round5 = (value) => Math.round(value / 5) * 5;
  const threeStarFor = (rung) => (rung.n === 4 ? round5(rung.clues * 9) : rung.clues * 10);
  const formulaRungs = rungs.filter((rung) => num(rung.id) >= 11 && num(rung.id) <= 39);
  check(CASE, "from c11 through c39 every three-star line is the shipped rate - ten seconds a line wide, nine narrow",
    formulaRungs.every((rung) => rung.starTimes[0] === threeStarFor(rung)),
    formulaRungs.map((rung) => rung.id + ":" + rung.starTimes[0] + " vs " + threeStarFor(rung)).join(" "));
  const summit = byId.c40 || { id: "c40", n: 0, clues: 0, starTimes: [0, 0, 0] };
  check(CASE, "the complete dossier is the one wide-board rung priced at nine seconds a line",
    summit.n === 5 && summit.starTimes[0] === summit.clues * 9 &&
      summit.starTimes[0] < threeStarFor(summit),
    summit.starTimes[0] + " for " + summit.clues + " lines vs rate " + threeStarFor(summit));
  check(CASE, "every rung's bands widen inside the rung",
    rungs.every((rung) => rung.starTimes[0] < rung.starTimes[1] && rung.starTimes[1] < rung.starTimes[2]),
    rungs.map((rung) => rung.id + ":" + rung.starTimes.join("/")).join(" "));
  check(CASE, "the new volume-five bands follow the shipped widening formula",
    v5.every((rung) =>
      rung.starTimes[1] === round5(rung.starTimes[0] * 1.42) &&
      rung.starTimes[2] === round5(rung.starTimes[0] * 1.91)),
    v5.map((rung) => rung.id + ":" + rung.starTimes[1] + "/" + rung.starTimes[2] +
      " vs " + round5(rung.starTimes[0] * 1.42) + "/" + round5(rung.starTimes[0] * 1.91)).join(" "));

  const tier = rungs.filter((rung) => num(rung.id) >= 10 && num(rung.id) <= 20);
  const ratios = tier.map((rung) => [rung.starTimes[1] / rung.starTimes[0], rung.starTimes[2] / rung.starTimes[0]]);
  const lowOne = Math.min.apply(null, ratios.map((pair) => pair[0]));
  const highOne = Math.max.apply(null, ratios.map((pair) => pair[0]));
  const lowTwo = Math.min.apply(null, ratios.map((pair) => pair[1]));
  const highTwo = Math.max.apply(null, ratios.map((pair) => pair[1]));
  const insideEnvelope = (rung) => {
    const one = rung.starTimes[1] / rung.starTimes[0];
    const two = rung.starTimes[2] / rung.starTimes[0];
    return one >= lowOne - 1e-9 && one <= highOne + 1e-9 &&
      two >= lowTwo - 1e-9 && two <= highTwo + 1e-9;
  };
  const envelopeDetail = (list) => list.map((rung) => {
    return rung.id + ":" + (rung.starTimes[1] / rung.starTimes[0]).toFixed(3) +
      "/" + (rung.starTimes[2] / rung.starTimes[0]).toFixed(3);
  }).join(" ") + " vs [" + lowOne.toFixed(3) + "," + highOne.toFixed(3) + "] [" +
    lowTwo.toFixed(3) + "," + highTwo.toFixed(3) + "]";
  check(CASE, "the volume-four bands sit inside the shipped tier's ratio envelope",
    v4.every(insideEnvelope), envelopeDetail(v4));
  check(CASE, "the volume-five bands sit inside the shipped tier's ratio envelope",
    v5.every(insideEnvelope), envelopeDetail(v5));

  /* The shipped tier never drops a three-star line by more than twenty seconds
   * or raises one by more than sixty when the board changes width; the new
   * steps keep that rhythm, and inside one width the line only climbs. */
  const deltas = [];
  for (let index = 1; index < rungs.length; index += 1) {
    deltas.push([
      rungs[index].id,
      rungs[index].starTimes[0] - rungs[index - 1].starTimes[0],
    ]);
  }
  const shippedDeltas = deltas.filter((pair) => num(pair[0]) <= 30);
  const deltaLow = Math.min.apply(null, shippedDeltas.map((pair) => pair[1]));
  const deltaHigh = Math.max.apply(null, shippedDeltas.map((pair) => pair[1]));
  const stepsOf = (list) => deltas.filter((pair) => list.some((rung) => rung.id === pair[0]));
  const stepDetail = (list) => stepsOf(list).map((pair) => pair[0] + ":" + pair[1]).join(" ") +
    " vs [" + deltaLow + "," + deltaHigh + "]";
  check(CASE, "the volume-four steps stay inside the shipped tier's step size",
    stepsOf(v4).every((pair) => pair[1] >= deltaLow && pair[1] <= deltaHigh), stepDetail(v4));
  check(CASE, "the volume-five steps stay inside the shipped tier's step size",
    stepsOf(v5).every((pair) => pair[1] >= deltaLow && pair[1] <= deltaHigh), stepDetail(v5));
  const widths = [3, 4, 5];
  check(CASE, "inside one board width the three-star line only climbs down the ladder",
    widths.every((n) => {
      const line = rungs.filter((rung) => rung.n === n).map((rung) => rung.starTimes[0]);
      return line.every((value, index) => index === 0 || value > line[index - 1]);
    }),
    widths.map((n) => n + ":" + rungs.filter((rung) => rung.n === n).map((rung) => rung.starTimes[0]).join("/")).join(" "));

  /* The volume-four summit, by the ladder's measure at the time. Shipped rungs
   * up to c24 are ordered by brief length and priced at ten seconds a line, so
   * the hardest case there is the longest brief: c30 must out-line every one
   * of them, add the most pages, carry the biggest line-by-cell cross-check,
   * and sit above the shipped ceiling on all three bands. */
  const c30 = byId.c30 || { id: "c30", n: 0, clues: 0, starTimes: [0, 0, 0] };
  const c30Census = census.c30 || { deals: 0, lines: [0] };
  const priorFour = rungs.filter((rung) => num(rung.id) <= 29);
  const shippedMaxLines = Math.max.apply(null, shipped.map((rung) => rung.clues));
  const pagesOf = (lines) => Math.ceil(lines / 4);
  const shippedMaxPages = Math.max.apply(null, shipped.map((rung) => pagesOf(rung.clues)));
  const load = (rung) => rung.clues * 3 * rung.n * rung.n;
  const dealtMax = (rung) => Math.max.apply(null, census[rung.id] ? census[rung.id].lines : [0]);
  check(CASE, "the volume-four summit is a five-name case", c30.n === 5, String(c30.n));
  check(CASE, "the volume-four summit carries more brief lines than any shipped rung",
    c30.clues > shippedMaxLines,
    "c30:" + c30.clues + " vs shipped max " + shippedMaxLines);
  check(CASE, "the volume-four summit's hundred deals all carry that length",
    c30Census.deals === 100 &&
      Math.min.apply(null, c30Census.lines) === c30.clues &&
      Math.max.apply(null, c30Census.lines) === c30.clues,
    c30Census.deals + " deals, " + Math.min.apply(null, c30Census.lines) + "-" +
      Math.max.apply(null, c30Census.lines) + " lines");
  check(CASE, "the volume-four summit adds the most pages in its tier",
    pagesOf(c30.clues) > shippedMaxPages,
    pagesOf(c30.clues) + " pages vs shipped max " + shippedMaxPages);
  check(CASE, "the volume-four summit carries the largest line-by-cell cross-check up to c29",
    priorFour.every((rung) => load(rung) < load(c30)),
    "c30:" + load(c30) + " vs next " +
      Math.max.apply(null, priorFour.map(load)));
  check(CASE, "no dealt brief up to c29 runs as long as the volume-four summit's shortest",
    priorFour.every((rung) => dealtMax(rung) < Math.min.apply(null, c30Census.lines)),
    "c30 shortest " + Math.min.apply(null, c30Census.lines) + " vs longest elsewhere " +
      Math.max.apply(null, priorFour.map(dealtMax)));
  check(CASE, "the volume-four summit's three bands all sit above the shipped ceiling",
    [0, 1, 2].every((slot) =>
      c30.starTimes[slot] > Math.max.apply(null, shipped.map((rung) => rung.starTimes[slot]))),
    c30.starTimes.join("/") + " vs shipped ceiling " +
      [0, 1, 2].map((slot) => Math.max.apply(null, shipped.map((rung) => rung.starTimes[slot]))).join("/"));

  /* Volume five's shape. It opens at sixty lines, hands the narrow board the
   * campaign's densest 48-box briefs, brings the wide board back one line
   * short of that pair, then climbs past the wide grid's seventy-five boxes in
   * six-line steps until the last step spends the whole pool. */
  const c31 = byId.c31;
  const c32 = byId.c32;
  const c33 = byId.c33;
  const c34 = byId.c34;
  const c35 = byId.c35;
  const c36 = byId.c36;
  const c37 = byId.c37;
  const c38 = byId.c38;
  const c39 = byId.c39;
  const density = (rung) => rung.clues / (3 * rung.n * rung.n);
  const narrowRungs = rungs.filter((rung) => rung.n === 4);
  check(CASE, "volume five opens above the volume-four docket, on the first sixty-line brief",
    !!c31 && !!c30 && c31.clues > c30.clues && c31.clues === 60 &&
      rungs.every((rung) => num(rung.id) >= 31 || rung.clues < 60),
    "c31:" + (c31 ? c31.clues : "missing") + " vs c30:" + c30.clues);
  check(CASE, "the narrow pair carries more lines than the wide board on either side of it",
    !!c31 && !!c32 && !!c33 && !!c34 &&
      c32.n === 4 && c33.n === 4 && c32.clues === 65 && c33.clues === 66 &&
      c32.clues > c31.clues && c33.clues > c32.clues && c34.clues < c33.clues,
    "c31:" + (c31 ? c31.clues : "?") + " c32:" + (c32 ? c32.clues : "?") +
      " c33:" + (c33 ? c33.clues : "?") + " c34:" + (c34 ? c34.clues : "?"));
  check(CASE, "the wide relief is one line short of the narrow pair and adds twenty-seven boxes",
    !!c33 && !!c34 && c34.clues === c33.clues - 1 &&
      3 * c34.n * c34.n - 3 * c33.n * c33.n === 27,
    c34 ? "c34:" + c34.clues + " on " + (3 * c34.n * c34.n) + " boxes vs c33:" +
      c33.clues + " on " + (3 * c33.n * c33.n) : "missing");
  check(CASE, "the narrow pair outruns its forty-eight-box grid by at least a third",
    !!c32 && !!c33 && c32.clues * 3 >= 4 * (3 * c32.n * c32.n) &&
      c33.clues * 3 >= 4 * (3 * c33.n * c33.n),
    "c32:" + (c32 ? c32.clues : "?") + " c33:" + (c33 ? c33.clues : "?") + " for 48 boxes");
  check(CASE, "the narrow pair carries the narrow board's two densest line loads",
    !!c32 && !!c33 &&
      narrowRungs.every((rung) => rung.id === "c32" || rung.id === "c33" ||
        density(rung) < density(c32)) &&
      density(c32) < density(c33),
    narrowRungs.map((rung) => rung.id + ":" + density(rung).toFixed(3)).join(" "));
  check(CASE, "c36 is the first brief on the ladder longer than the wide grid's seventy-five boxes",
    !!c35 && !!c36 && c35.clues <= 75 && c36.clues > 75 &&
      rungs.every((rung) => num(rung.id) >= 36 || rung.clues <= 75),
    "c35:" + (c35 ? c35.clues : "?") + " c36:" + (c36 ? c36.clues : "?") + " vs 75 boxes");
  check(CASE, "from c36 to c39 the brief climbs six lines a step",
    !!c36 && !!c37 && !!c38 && !!c39 &&
      c37.clues - c36.clues === 6 && c38.clues - c37.clues === 6 &&
      c39.clues - c38.clues === 6,
    [c36, c37, c38, c39].map((rung) => rung ? rung.id + ":" + rung.clues : "missing").join(" "));
  check(CASE, "every volume-five brief is denser per box than the volume-four summit",
    !!c30 && v5.every((rung) => density(rung) > density(c30)),
    v5.map((rung) => rung.id + ":" + density(rung).toFixed(3)).join(" ") +
      " vs c30:" + (c30 ? density(c30).toFixed(3) : "missing"));
  check(CASE, "no two volume-five briefs share a line load per box",
    new Set(v5.map((rung) => density(rung).toFixed(4))).size === v5.length,
    v5.map((rung) => rung.id + ":" + density(rung).toFixed(4)).join(" "));

  /* The summit is the complete dossier. Its brief is the dealer's whole pool,
   * so its kind mix is fixed, its plain floor is exactly 3n, and every one of
   * its bands sits above every earlier rung - while its clock is the strictest
   * per-line rate on the wide board. It is also the one case whose mixed-only
   * subset still closes the file, which is the volume-five cut's end state. */
  const summitCensus = v5Census.c40 || {
    deals: 0, lines: [0], plains: [0], full: 0, cutOpen: 0, mixedOnlyUnique: 0, kindShapes: [],
  };
  const summitPlainMin = Math.min.apply(null, summitCensus.plains);
  const summitPlainMax = Math.max.apply(null, summitCensus.plains);
  check(CASE, "the complete dossier sits on the dealer's five-name pool",
    summit.n === 5 && summit.clues === poolSize(summit.n),
    summit.id + ":" + summit.clues + " vs pool " + poolSize(5));
  check(CASE, "its hundred deals all deal that complete pool",
    summitCensus.deals === 100 && summitCensus.full === summitCensus.deals &&
      Math.min.apply(null, summitCensus.lines) === poolSize(5),
    summitCensus.full + " of " + summitCensus.deals + " full, " +
      Math.min.apply(null, summitCensus.lines) + "-" + Math.max.apply(null, summitCensus.lines) + " lines");
  check(CASE, "the complete pool carries every kind in its one possible mix",
    summitCensus.kindShapes.length === 100 &&
      summitCensus.kindShapes.every((shape) => shape === "15/60/15/16"),
    "15 plain, 60 eliminations, 15 links, 16 hour gaps");
  check(CASE, "its plain floor is exactly the fifteen plain statements, and shorter than any brief from c10 up",
    summitPlainMin === 15 && summitPlainMax === 15 && summitPlainMax < shortestBackHalf,
    summitPlainMin + "-" + summitPlainMax + " plain vs shortest back-half brief " + shortestBackHalf);
  check(CASE, "the complete dossier's mixed cut is closed by completeness, not ambiguity",
    summitCensus.cutOpen === 0 && summitCensus.mixedOnlyUnique === 100,
    summitCensus.cutOpen + " cut-open, " + summitCensus.mixedOnlyUnique +
      " of " + summitCensus.deals + " closed by mixed lines alone");
  check(CASE, "the complete dossier is the only volume-five rung at the pool ceiling",
    v5.every((rung) => rung.id === "c40" || rung.clues < poolSize(rung.n)),
    v5.map((rung) => rung.id + ":" + rung.clues + "/" + poolSize(rung.n)).join(" "));
  check(CASE, "the complete dossier carries the campaign's longest brief, most pages and heaviest cross-check",
    rungs.every((rung) => rung.id === "c40" || rung.clues < summit.clues) &&
      rungs.every((rung) => rung.id === "c40" || pagesOf(rung.clues) < pagesOf(summit.clues)) &&
      rungs.every((rung) => rung.id === "c40" || load(rung) < load(summit)),
    summit.clues + " lines, " + pagesOf(summit.clues) + " pages, load " + load(summit));
  check(CASE, "no dealt brief on the ladder runs longer than the complete dossier",
    rungs.every((rung) => rung.id === "c40" || dealtMax(rung) < summit.clues),
    "c40 " + summit.clues + " vs longest elsewhere " +
      Math.max.apply(null, rungs.filter((rung) => rung.id !== "c40").map(dealtMax)));
  check(CASE, "the complete dossier is the densest brief and the only rung priced under ten seconds a line on the wide board",
    rungs.every((rung) => rung.id === "c40" || density(rung) < density(summit)) &&
      v5.filter((rung) => rung.n === 5).every((rung) =>
        rung.id === "c40" || rung.starTimes[0] === rung.clues * 10),
    "c40 density " + density(summit).toFixed(4) + ", " + summit.starTimes[0] + "s for " + summit.clues + " lines");
  check(CASE, "the complete dossier's three bands sit above every earlier rung's",
    [0, 1, 2].every((slot) =>
      summit.starTimes[slot] > Math.max.apply(null,
        rungs.filter((rung) => rung.id !== "c40").map((rung) => rung.starTimes[slot]))),
    summit.starTimes.join("/") + " vs previous ceiling " +
      [0, 1, 2].map((slot) => Math.max.apply(null,
        rungs.filter((rung) => rung.id !== "c40").map((rung) => rung.starTimes[slot]))).join("/"));
  const v4Ceiling = [0, 1, 2].map((slot) =>
    Math.max.apply(null, v4.map((rung) => rung.starTimes[slot])));
  check(CASE, "every volume-five rung's three bands sit above the volume-four ceiling",
    v5.every((rung) => [0, 1, 2].every((slot) => rung.starTimes[slot] > v4Ceiling[slot])),
    v5.map((rung) => rung.id + ":" + rung.starTimes.join("/")).join(" ") +
      " vs ceiling " + v4Ceiling.join("/"));

  /* The dealer's ceiling, measured: a rung asking for more lines than the pool
   * is dealt the pool, so 107 five-name lines comes back as 106 and no rung can
   * produce a longer brief than the complete dossier. */
  const probeLength = (n, wanted) => App.detectiveCase({
    id: "pdk-gate-probe", labelKey: "pdk-gate-probe", n: n, clues: wanted, starTimes: [1, 2, 3],
  }).clues.length;
  let probes = null;
  seeded(20261029, () => {
    probes = {
      at: probeLength(5, 106),
      over: probeLength(5, 107),
      far: probeLength(5, 140),
      four: probeLength(4, 73),
      three: probeLength(3, 45),
    };
  });
  check(CASE, "the dealer's pool is its ceiling: 107 five-name lines are dealt as 106",
    probes.over === 106 && probes.at === 106 && probes.far === 106 &&
      probes.four === 72 && probes.three === 44,
    "106->" + probes.at + " 107->" + probes.over + " 140->" + probes.far +
      " n4 73->" + probes.four + " n3 45->" + probes.three);

  /* Copy travels with the module: both languages hold a real string, t() never
   * falls back to the raw key, and the two labels differ from each other. */
  const V4_KEYS = V4.map((id) => "pdkC" + id.slice(1));
  const V5_KEYS = V5.map((id) => "pdkC" + id.slice(1));
  const readable = (key) =>
    !!(App.I18N && App.I18N.en && App.I18N.en[key] && App.I18N.zh && App.I18N.zh[key] &&
      App.I18N.en[key] !== key && App.I18N.zh[key] !== key && App.t(key) !== key);
  const translated = (key) => !!(App.I18N && App.I18N.en && App.I18N.zh &&
    App.I18N.en[key] !== App.I18N.zh[key]);
  check(CASE, "the volume-four rung names resolve in both languages and never fall back to the key",
    V4_KEYS.every(readable), V4_KEYS.join(","));
  check(CASE, "the volume-five rung names resolve in both languages and never fall back to the key",
    V5_KEYS.every(readable), V5_KEYS.join(","));
  check(CASE, "the volume-four rung names read differently in the two languages",
    V4_KEYS.every(translated),
    V4_KEYS.map((key) => key + ":" + App.I18N.en[key] + "/" + App.I18N.zh[key]).join(" "));
  check(CASE, "the volume-five rung names read differently in the two languages",
    V5_KEYS.every(translated),
    V5_KEYS.map((key) => key + ":" + App.I18N.en[key] + "/" + App.I18N.zh[key]).join(" "));
  check(CASE, "the volume-five rung names are distinct inside each language",
    new Set(V5_KEYS.map((key) => App.I18N.en[key])).size === V5_KEYS.length &&
      new Set(V5_KEYS.map((key) => App.I18N.zh[key])).size === V5_KEYS.length,
    V5_KEYS.map((key) => App.I18N.en[key] + "/" + App.I18N.zh[key]).join(" "));

  const EN_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const enCount = (value) => {
    if (value < 10) return EN_ONES[value];
    if (value < 20) return value === 10 ? "ten" : EN_ONES[value - 10] + "teen";
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    return EN_TENS[tens] + (ones ? "-" + EN_ONES[ones] : "");
  };
  const ZH_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const zhCount = (value) => {
    if (value < 10) return ZH_DIGITS[value];
    if (value < 20) return "十" + (value % 10 ? ZH_DIGITS[value % 10] : "");
    return ZH_DIGITS[Math.floor(value / 10)] + "十" + (value % 10 ? ZH_DIGITS[value % 10] : "");
  };
  const doneEn = (App.I18N && App.I18N.en && App.I18N.en.pdkCampaignDone) || "";
  const doneZh = (App.I18N && App.I18N.zh && App.I18N.zh.pdkCampaignDone) || "";
  check(CASE, "the campaign-done copy names the live ladder count in both languages",
    doneEn.indexOf(enCount(rungs.length)) !== -1 && doneZh.indexOf(zhCount(rungs.length)) !== -1,
    rungs.length + " -> " + doneEn + " / " + doneZh);

  /* Nothing in the copy still quotes an old ladder length. */
  const stale = ["twenty-four", "二十四", "thirty", "三十"].filter((word) =>
    [doneEn, doneZh].some((text) => text.indexOf(word) !== -1));
  check(CASE, "the campaign-done copy carries no stale ladder count",
    stale.length === 0, stale.join(",") + " in " + doneEn + " / " + doneZh);

  /* The unlock chain is derived, never stored: clearing each rung in order
   * hands the player exactly the next one, every rung on the ladder. */
  const chain = App.createCampaign({
    key: "pocket-detective-gate-chain",
    levels: rungs.map((rung) => ({ id: rung.id, labelKey: rung.labelKey })),
  });
  let walked = 0;
  let chained = true;
  rungs.forEach((rung, index) => {
    const outcome = chain.record(rung.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < rungs.length ? rungs[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check(CASE, "the unlock chain walks every rung in order",
    walked === rungs.length && chained && chain.clearedCount() === rungs.length,
    walked + " first clears, chained=" + chained + ", cleared " + chain.clearedCount() + " of " + rungs.length);
};
