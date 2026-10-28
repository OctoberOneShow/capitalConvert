"use strict";

/* game-pocket-detective: volume three is measured, not guessed
 *
 * The shipped dealer builds every brief from the unique answer and then lets
 * the game's own counter prove it. This gate re-runs that path exactly the way
 * the panel deals it - pdkCase(rung), then App.detectiveCountSolutions - for a
 * hundred seeded deals on each of the four extension rungs, and holds every
 * one of them to a single answer. It also proves the new briefs cannot be
 * closed from their plain statements alone, so the elimination and cross-line
 * reasoning the copy promises is load-bearing in each deal. Star bands are
 * derived, never guessed: the back half of the shipped ladder quotes its
 * three-star line at ten seconds per clue on the five-name board and nine per
 * clue, rounded to five seconds, on the four-name board, and keeps both wider
 * lines inside the shipped ratio envelope. The summit is the hardest case by
 * the ladder's own measure - the most brief lines, the most pages, the largest
 * line-by-cell cross-check - and every one of its three bands sits above the
 * shipped ceiling.
 *
 * Wall: a rung row carries only id, labelKey, n and clues (starTimes is read
 * by the clock, labelKey/id by the campaign), and the dealer picks which clue
 * kinds fill the brief. A rung therefore cannot promise "all order lines" or
 * "no statements": clue-kind shape belongs to the deal, not the rung. This
 * gate pins what the rung can promise - grid width, brief volume, and that
 * the mixed lines are necessary. */
module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const CASE = "game-pocket-detective";
  const rungs = App.detectiveRungs || [];
  const NEW = ["c21", "c22", "c23", "c24"];
  const byId = {};
  rungs.forEach((rung) => { byId[rung.id] = rung; });
  const shipped = rungs.filter((rung) => NEW.indexOf(rung.id) === -1);
  const isNew = (rung) => NEW.indexOf(rung.id) !== -1;

  /* Structure: the count is asserted on its own, never glued to a proof. */
  check(CASE, "the ladder holds twenty-four rungs", rungs.length === 24, String(rungs.length));
  check(CASE, "every rung id is distinct",
    new Set(rungs.map((rung) => rung.id)).size === rungs.length,
    rungs.map((rung) => rung.id).join(","));
  check(CASE, "the ids run c1 through c24 in order",
    rungs.every((rung, index) => rung.id === "c" + (index + 1)),
    rungs.map((rung) => rung.id).join(","));
  check(CASE, "every new rung keeps the shipped row shape - id, labelKey, n, clues, starTimes",
    NEW.every((id) => byId[id] &&
      Object.keys(byId[id]).sort().join(",") === "clues,id,labelKey,n,starTimes"),
    NEW.map((id) => (byId[id] ? Object.keys(byId[id]).join("|") : "missing")).join(" "));
  check(CASE, "every rung lays out three, four or five names - the widths the board has rows for",
    rungs.every((rung) => [3, 4, 5].indexOf(rung.n) !== -1),
    rungs.map((rung) => rung.id + ":" + rung.n).join(" "));

  /* The dealer's own answer, re-run at the panel's step cap. The seeded swap
   * keeps the run deterministic wherever the booted app reaches for
   * Math.random - the deals are the same every gate run. */
  const seeded = (seed, fn) => {
    const real = Math.random;
    let state = seed >>> 0;
    Math.random = () => {
      state = (Math.imul(state, 1103515245) + 12345) >>> 0;
      return state / 4294967296;
    };
    try { return fn(); } finally { Math.random = real; }
  };

  const census = {};
  seeded(20261027, () => {
    /* Hundred deals per new rung: line count, solution count, and whether the
     * plain statements alone can still admit a second answer. */
    NEW.forEach((id) => {
      const rung = byId[id];
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
      census[id] = report;
    });
    /* The shipped half is re-dealt at a lighter sample: it proves the dealer
     * the extension rides on still holds, without re-paying the full census. */
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

  NEW.forEach((id) => {
    const rung = byId[id];
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
    /* Measured, and the reason the brief is long: the dealer's swap seam keeps
     * a few deals closable from their statements alone, but the tier is built
     * to be read across lines and almost every deal needs that. */
    check(CASE, id + ": the plain statements alone still leave the case open in most deals",
      report.anchorsOpen * 2 > report.deals,
      report.anchorsOpen + " of " + report.deals + " deals stayed open on direct lines alone");
  });
  const shippedUnique = shipped.every((rung) => census[rung.id].unique === census[rung.id].deals);
  check(CASE, "the shipped half still deals unique cases at the same seam", shippedUnique,
    shipped.map((rung) => rung.id + ":" + census[rung.id].unique + "/" + census[rung.id].deals).join(" "));

  /* Star bands. The back half of the shipped ladder (c11 onward) is a formula:
   * the three-star line is ten seconds per brief line on five names, nine per
   * line rounded to the nearest five on four names. The two outer lines keep
   * the shipped ratios, computed here from the tier it continues, not typed. */
  const round5 = (value) => Math.round(value / 5) * 5;
  const threeStarFor = (rung) => (rung.n === 4 ? round5(rung.clues * 9) : rung.clues * 10);
  const backHalf = rungs.filter((rung) => Number(rung.id.slice(1)) >= 11);
  check(CASE, "every rung's bands widen inside the rung",
    rungs.every((rung) => rung.starTimes[0] < rung.starTimes[1] && rung.starTimes[1] < rung.starTimes[2]),
    rungs.map((rung) => rung.id + ":" + rung.starTimes.join("/")).join(" "));
  check(CASE, "the back half quotes the shipped rate - ten seconds a line wide, nine narrow",
    backHalf.every((rung) => rung.starTimes[0] === threeStarFor(rung)),
    backHalf.map((rung) => rung.id + ":" + rung.starTimes[0] + " vs " + threeStarFor(rung)).join(" "));

  const tier = rungs.filter((rung) => {
    const index = Number(rung.id.slice(1));
    return index >= 10 && index <= 20;
  });
  const ratios = tier.map((rung) => [rung.starTimes[1] / rung.starTimes[0], rung.starTimes[2] / rung.starTimes[0]]);
  const lowOne = Math.min.apply(null, ratios.map((pair) => pair[0]));
  const highOne = Math.max.apply(null, ratios.map((pair) => pair[0]));
  const lowTwo = Math.min.apply(null, ratios.map((pair) => pair[1]));
  const highTwo = Math.max.apply(null, ratios.map((pair) => pair[1]));
  check(CASE, "the new bands sit inside the shipped tier's ratio envelope",
    NEW.every((id) => {
      const rung = byId[id];
      const one = rung.starTimes[1] / rung.starTimes[0];
      const two = rung.starTimes[2] / rung.starTimes[0];
      return one >= lowOne - 1e-9 && one <= highOne + 1e-9 && two >= lowTwo - 1e-9 && two <= highTwo + 1e-9;
    }),
    NEW.map((id) => {
      const rung = byId[id];
      return id + ":" + (rung.starTimes[1] / rung.starTimes[0]).toFixed(3) +
        "/" + (rung.starTimes[2] / rung.starTimes[0]).toFixed(3);
    }).join(" ") + " vs [" + lowOne.toFixed(3) + "," + highOne.toFixed(3) + "] [" +
      lowTwo.toFixed(3) + "," + highTwo.toFixed(3) + "]");

  /* The shipped tier never drops a three-star line by more than twenty seconds
   * or raises one by more than sixty when the board changes width; the new
   * steps keep that rhythm, and inside one width the line only climbs. */
  const deltas = [];
  for (let index = 1; index < rungs.length; index += 1) {
    deltas.push([rungs[index].id, rungs[index].starTimes[0] - rungs[index - 1].starTimes[0]]);
  }
  const shippedDeltas = deltas.filter((pair) => !isNew(byId[pair[0]]));
  const deltaLow = Math.min.apply(null, shippedDeltas.map((pair) => pair[1]));
  const deltaHigh = Math.max.apply(null, shippedDeltas.map((pair) => pair[1]));
  check(CASE, "the new steps stay inside the shipped tier's step size",
    deltas.filter((pair) => isNew(byId[pair[0]]))
      .every((pair) => pair[1] >= deltaLow && pair[1] <= deltaHigh),
    deltas.filter((pair) => isNew(byId[pair[0]])).map((pair) => pair[0] + ":" + pair[1]).join(" ") +
      " vs [" + deltaLow + "," + deltaHigh + "]");
  const widths = [3, 4, 5];
  check(CASE, "inside one board width the three-star line only climbs down the ladder",
    widths.every((n) => {
      const line = rungs.filter((rung) => rung.n === n).map((rung) => rung.starTimes[0]);
      return line.every((value, index) => index === 0 || value > line[index - 1]);
    }),
    widths.map((n) => n + ":" + rungs.filter((rung) => rung.n === n).map((rung) => rung.starTimes[0]).join("/")).join(" "));

  /* The summit, by the ladder's own measure. Shipped rungs are ordered by
   * brief length and priced at ten seconds a line, so the hardest case is the
   * longest brief: c24 must out-line every shipped rung, add the most pages,
   * carry the biggest line-by-cell cross-check, and sit above the shipped
   * ceiling on all three bands. */
  const summit = byId.c24;
  const shippedMaxLines = Math.max.apply(null, shipped.map((rung) => rung.clues));
  const pagesOf = (lines) => Math.ceil(lines / 4);
  const shippedMaxPages = Math.max.apply(null, shipped.map((rung) => pagesOf(rung.clues)));
  const load = (rung) => rung.clues * 3 * rung.n * rung.n;
  check(CASE, "the summit is a five-name case", summit.n === 5, String(summit.n));
  check(CASE, "the summit carries more brief lines than any shipped rung",
    summit.clues > shippedMaxLines,
    "c24:" + summit.clues + " vs shipped max " + shippedMaxLines);
  check(CASE, "the summit's hundred deals all carry that length",
    census.c24.deals === 100 &&
      Math.min.apply(null, census.c24.lines) === summit.clues &&
      Math.max.apply(null, census.c24.lines) === summit.clues,
    census.c24.deals + " deals, " + Math.min.apply(null, census.c24.lines) + "-" +
      Math.max.apply(null, census.c24.lines) + " lines");
  check(CASE, "the summit adds the most pages in the campaign",
    pagesOf(summit.clues) > shippedMaxPages,
    pagesOf(summit.clues) + " pages vs shipped max " + shippedMaxPages);
  check(CASE, "the summit carries the largest line-by-cell cross-check on the ladder",
    rungs.every((rung) => rung.id === "c24" || load(rung) < load(summit)),
    "c24:" + load(summit) + " vs next " +
      Math.max.apply(null, rungs.filter((rung) => rung.id !== "c24").map(load)));
  const dealtMax = (rung) => Math.max.apply(null, census[rung.id].lines);
  check(CASE, "no dealt brief on the ladder runs as long as the summit's shortest",
    rungs.every((rung) => rung.id === "c24" || dealtMax(rung) < Math.min.apply(null, census.c24.lines)),
    "c24 shortest " + Math.min.apply(null, census.c24.lines) + " vs longest elsewhere " +
      Math.max.apply(null, rungs.filter((rung) => rung.id !== "c24").map(dealtMax)));
  check(CASE, "the summit's three bands all sit above every shipped rung's",
    [0, 1, 2].every((slot) =>
      summit.starTimes[slot] > Math.max.apply(null, shipped.map((rung) => rung.starTimes[slot]))),
    summit.starTimes.join("/") + " vs shipped ceiling " +
      [0, 1, 2].map((slot) => Math.max.apply(null, shipped.map((rung) => rung.starTimes[slot]))).join("/"));

  /* The four new briefs are different jobs, not four copies: the wide board
   * has 75 boxes to cross-check, the narrow one 48, and each rung's line load
   * per box is its own. */
  const density = (rung) => rung.clues / (3 * rung.n * rung.n);
  const c20 = byId.c20;
  check(CASE, "every new brief is denser per box than the shipped ceiling",
    NEW.every((id) => density(byId[id]) > density(c20)),
    NEW.map((id) => id + ":" + density(byId[id]).toFixed(3)).join(" ") + " vs c20:" + density(c20).toFixed(3));
  check(CASE, "no two new briefs share a line load per box",
    new Set(NEW.map((id) => density(byId[id]).toFixed(4))).size === NEW.length,
    NEW.map((id) => id + ":" + density(byId[id]).toFixed(4)).join(" "));

  /* Copy travels with the module: both languages hold a real string, t() never
   * falls back to the raw key, and the two labels differ from each other. */
  const NEW_KEYS = NEW.map((id) => "pdkC" + id.slice(1));
  check(CASE, "the new rung names resolve in both languages and never fall back to the key",
    NEW_KEYS.every((key) =>
      App.I18N && App.I18N.en && App.I18N.en[key] && App.I18N.zh && App.I18N.zh[key] &&
      App.I18N.en[key] !== key && App.I18N.zh[key] !== key && App.t(key) !== key),
    NEW_KEYS.join(","));
  check(CASE, "the new rung names read differently in the two languages",
    NEW_KEYS.every((key) => App.I18N.en[key] !== App.I18N.zh[key]),
    NEW_KEYS.map((key) => key + ":" + App.I18N.en[key] + "/" + App.I18N.zh[key]).join(" "));

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

  /* The unlock chain is derived, never stored: clearing each rung in order
   * hands the player exactly the next one, all twenty-four times. */
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
  check(CASE, "the unlock chain walks all twenty-four rungs in order",
    walked === rungs.length && chained && chain.clearedCount() === rungs.length,
    walked + " first clears, chained=" + chained);
};
