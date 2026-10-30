"use strict";

/* game-tiny-blacksmith: the legend summit is proved by the forge's own
 * replay - the same measured run the panel trusts, frame for frame.
 *
 * The grand-anvil rungs f21-f24 had taken the shared dials to their ceiling:
 * the same 22-wide band at speed 94, drift 13 every blow, the ten-wide quench
 * window, two spare blows. At that ceiling the honesty floor bites - the
 * bright core is 9.68 units wide, the needle crosses it in about six frames,
 * and six frames at 1/60 is exactly the 100ms a blow or a quench may demand -
 * so the summit escalates the dials the ladder had never turned instead of
 * squeezing the window the physics cannot give back: deeper stock out of the
 * fire (start 16 first at f26, 17 first at f29), the lean hammer (slack 1
 * first at f28), a band that walks farther every blow (drift 14 first at
 * f26, then 15, then 16 at the capstone), and quench windows tighter than
 * any earlier pattern (8, 7, 6, 5 and finally 2 units wide, always
 * narrowing). Harder patterns ride along: the proven lines land 24, 26, 27,
 * 28, 29 and 30 blows against the grand-anvil peak of 23.
 *
 * The playability bar is the engine's own: each rung ships a stored line of
 * {rest frames, position} moves, and App.forgeReplay walks it through the
 * very functions the panel runs - forgeSwing for the needle, forgeZone and
 * forgeBite for the blow, forgeShape for the steel, forgeSlide for the drift
 * - and demands no stray blows, no blow inside the hammer's cooldown, every
 * section exactly on its mark, a quench inside the window, a serviceable
 * blade, three stars, and no window tighter than the 100ms honesty floor.
 * The replay touches no DOM and rolls no die, so a line that proves is a
 * line a hand at 60fps can play - the panel and the proof watch the same
 * needle. Every rung with a stored line is replayed here, the summit's pars
 * are pinned as strictly climbing, and the star bands are checked against
 * the module's own forgeBands arithmetic (three stars = one stray blow off
 * a perfect shape) rather than invented numbers. The panel is booted through
 * its real init path in the stub DOM, the unlock chain walks all thirty
 * patterns in order, and the six summit names resolve in both languages. */

module.exports = function gate(ctx) {
  const { App, env, check } = ctx;
  const levels = App.forgeLevels || [];
  const summitIds = ["f25", "f26", "f27", "f28", "f29", "f30"];

  /* ---- the ladder holds thirty distinct patterns ---- */
  check("game-tiny-blacksmith", "the forge ladder holds thirty patterns",
    levels.length === 30, String(levels.length));
  check("game-tiny-blacksmith", "every pattern id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missingSummit = summitIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-tiny-blacksmith", "the legend summit f25-f30 is present",
    missingSummit.length === 0, missingSummit.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const summit = summitIds.map((id) => byId[id]);

  /* ---- the playability proof: the forge's own replay ---- */
  /* Every rung that ships a line proves it: no strays, no blocked blows,
   * error 0, quenched inside the window, serviceable, three stars, and no
   * window under the honesty floor - all measured, none asserted. The early
   * rungs f1-f12 shipped without lines and keep falling back to the exact
   * plan, so only line-bearing rungs are replay-proved here. */
  const lineProblems = [];
  levels.forEach((level) => {
    if (!level.line || !level.line.length) return;
    const report = App.forgeMeasure(level);
    if (!report.ok) {
      lineProblems.push(`${level.id}: ${report.why}`);
    }
  });
  check("game-tiny-blacksmith",
    "every stored line forges its pattern in the engine's own replay" +
    " (no strays, no blocked blows, exact marks, clean quench, three stars," +
    " 100ms floor)",
    lineProblems.length === 0, lineProblems.join(" | "));

  /* ---- the summit's mechanic: dials the ladder never turned before ---- */
  const firstProblems = [];
  const deepStock = levels.filter((level) => level.start >= 16).map((level) => level.id);
  if (deepStock[0] !== "f26" || deepStock.length !== 5) {
    firstProblems.push("start 16+ first appears at " + deepStock.join(","));
  }
  const deeperStock = levels.filter((level) => level.start >= 17).map((level) => level.id);
  if (deeperStock[0] !== "f29" || deeperStock.length !== 2) {
    firstProblems.push("start 17 first appears at " + deeperStock.join(","));
  }
  const leanHammer = levels.filter((level) => level.slack <= 1).map((level) => level.id);
  if (leanHammer[0] !== "f28" || leanHammer.length !== 3) {
    firstProblems.push("slack 1 first appears at " + leanHammer.join(","));
  }
  const farDrift = levels.filter((level) => level.drift >= 14).map((level) => level.id);
  if (farDrift[0] !== "f26" || farDrift.length !== 5) {
    firstProblems.push("drift 14+ first appears at " + farDrift.join(","));
  }
  /* the quench window: f25 keeps the grand-anvil ten, then the summit
   * tightens rung by rung below anything earlier, down to the capstone */
  const width = (level) => level.quench[1] - level.quench[0];
  const preSummit = levels.filter((level) => !summitIds.includes(level.id));
  const narrowestBefore = Math.min.apply(null, preSummit.map(width));
  const quenchWidths = summit.map(width);
  const quenchOk = quenchWidths[0] === narrowestBefore &&
    quenchWidths.slice(1).every((w) => w < narrowestBefore) &&
    quenchWidths.every((w, i) => i === 0 || w < quenchWidths[i - 1]) &&
    width(byId.f30) === Math.min.apply(null, levels.map(width));
  if (!quenchOk) {
    firstProblems.push(`quench widths ${quenchWidths.join("/")} vs narrowest before ${narrowestBefore}`);
  }
  check("game-tiny-blacksmith",
    "each summit rung turns a dial no earlier rung turned (deeper stock," +
    " lean hammer, farther drift) and every summit quench window is tighter" +
    " than any earlier pattern's, narrowing to the capstone",
    firstProblems.length === 0, firstProblems.join(" | "));

  /* The honesty floor is preserved, not squeezed: the summit keeps the
   * grand-anvil band, core share and needle speed - the dials whose windows
   * already sit exactly on the 100ms floor - and takes its difficulty from
   * the untouched dials instead. */
  const floorProblems = [];
  summit.forEach((level) => {
    if (level.band[1] - level.band[0] !== 22 ||
        level.speed > 94 ||
        level.core[0] !== 0.46 || level.core[1] !== 0.9) {
      floorProblems.push(`${level.id} moved the floor dials: band ${level.band.join("-")},` +
        ` speed ${level.speed}, core ${level.core.join("-")}`);
    }
  });
  check("game-tiny-blacksmith",
    "no summit rung narrows the band, raises the needle or thins the core" +
    " - the windows stay on the honesty floor the engine measures",
    floorProblems.length === 0, floorProblems.join(" | "));

  /* ---- difficulty is measured: the proven lines' blow counts climb ---- */
  const pars = summit.map((level) => App.forgePar(level));
  const f24Par = App.forgePar(byId.f24);
  let falls = false;
  for (let i = 1; i < pars.length; i += 1) {
    if (pars[i] <= pars[i - 1]) falls = true;
  }
  check("game-tiny-blacksmith",
    `the summit's proven blow counts climb strictly and start above the` +
    ` grand-anvil peak (${f24Par} -> ${pars.join(" -> ")})`,
    !falls && pars[0] > f24Par,
    `f24 ${f24Par}, summit ${pars.join("/")}`);

  /* ---- star bands are cut, not invented ---- */
  /* forgeBands cuts [3, 2, 1] from the pattern's own arithmetic: 3 stars is
   * one stray blow off a perfect shape (100 - 8), 2 is half the serviceable
   * allowance plus a flaw, 1 is the serviceable boundary itself. */
  const bandProblems = [];
  summit.forEach((level) => {
    const measured = App.forgeBands(level);
    if (JSON.stringify(measured) !== JSON.stringify(level.stars)) {
      bandProblems.push(`${level.id} stored ${level.stars.join("/")} vs measured` +
        ` ${measured.join("/")}`);
    }
    if (level.stars[0] !== 100 - 8) {
      bandProblems.push(`${level.id} top band ${level.stars[0]} is not one stray blow`);
    }
    const report = App.forgeMeasure(level);
    if (report.stars < 3) {
      bandProblems.push(`${level.id} its own proven line earns only ${report.stars} stars`);
    }
  });
  check("game-tiny-blacksmith",
    "every summit rung's star bands are the module's own measured bands," +
    " three stars sits one stray blow from perfect, and the proof run earns" +
    " the three stars",
    bandProblems.length === 0, bandProblems.join(" | "));

  /* ---- the panel boots through its real init path in the stub DOM ---- */
  const doc = env.document;
  const panel = doc.createElement("div");
  doc.body.appendChild(panel);
  let bootError = null;
  try {
    App.initTinyBlacksmithGame(panel);
  } catch (error) {
    bootError = error;
  }
  check("game-tiny-blacksmith",
    "the panel boots through initTinyBlacksmithGame without error",
    bootError === null, bootError ? String(bootError && bootError.stack || bootError) : "");
  const picker = env.byId("tbsBenchSel");
  const optionCount = picker ? picker.querySelectorAll("option").length : 0;
  const pickerOk = !!picker && optionCount === 30 && picker.value === "f1";
  check("game-tiny-blacksmith",
    "the booted bench picker holds all thirty patterns and opens on f1",
    pickerOk, picker ? `options ${optionCount}, value ${picker.value}` : "no picker");
  const result = panel.querySelector(".game-result");
  const orderOk = !!result && result.textContent.indexOf("12") !== -1 &&
    result.textContent.indexOf("17") !== -1;
  check("game-tiny-blacksmith",
    "the booted order line quotes the exact plan (17 blows) and the proven" +
    " par (12) for f1",
    orderOk, result ? result.textContent : "no result line");

  /* ---- the unlock chain is derived, never stored ---- */
  const chain = App.createCampaign({
    key: "tiny-blacksmith-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 100, better: "high" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-tiny-blacksmith", "the unlock chain walks all thirty patterns in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");

  /* ---- the six summit names travel with the page in both languages ---- */
  const labelKeys = summit.map((level) => level.labelKey);
  const labelProblems = labelKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-tiny-blacksmith", "the six summit pattern names resolve in both languages",
    labelProblems.length === 0, labelProblems.join(","));
};
