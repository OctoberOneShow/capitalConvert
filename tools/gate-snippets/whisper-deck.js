"use strict";

/* game-whisper-deck: the deep tier is the long night, and the game's own
 * scripted best-play hand is the witness.
 *
 * The engine ships a full headless line: wsdAutoRun plays a rung's duels
 * with the greedy one-turn planner the tests already trust, over seeded
 * attempts. The gate runs that hand across the deep tier and proves three
 * things. First, the run is really longer: shipped rungs deal four duels,
 * the deep rungs deal five and six, and every winning run the hand plays
 * ends on exactly the duel count the rung advertises. Second, the bands sit
 * on measured lines: three stars are reachable but never free, the bands
 * run downwards, and every winning run still pays at least a star. Third,
 * the lesson is structural: no shipped rung asks for a fifth duel, the
 * thin-breath rung is the first to pair two breath with more than four
 * duels, and the capstone faces more foe resolve in one night than any
 * shipped rung ever put on the table.
 *
 * The summit w25-w30 is the long watch: the run walks to the engine's own
 * ceiling - seven, then eight duels - and the thin-breath lesson pairs with
 * both. The same scripted hand is the witness: it plays every summit night
 * ten times, wins a realistic share, ends every win on exactly the duels
 * the rung advertises, and the bands sit on its measured lines - reachable,
 * never free, ordered, every win paying a star. The tier climbs past the
 * deep tier on the pressure table (w30's thunder court outweighs w24's
 * night) and no summit rung is a re-deal of a shipped deck's fight. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.whisperLevels;
  const deepIds = ["w21", "w22", "w23", "w24"];
  const summitIds = ["w25", "w26", "w27", "w28", "w29", "w30"];

  check("game-whisper-deck", "the ladder holds thirty chambers",
    levels.length === 30, String(levels.length));
  check("game-whisper-deck", "every chamber id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-whisper-deck", "the deep tier w21-w24 is present",
    missing.length === 0, missing.join(","));
  const summitMissing = summitIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-whisper-deck", "the summit tier w25-w30 is present in order",
    summitMissing.length === 0 &&
      summitIds.every((id, index) => levels.findIndex((level) => level.id === id) >
        (index === 0 ? -1 : levels.findIndex((level) => level.id === summitIds[index - 1]))),
    summitMissing.join(",") || "ordered");

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);
  const summit = summitIds.map((id) => byId[id]);
  const shallow = levels.filter((level) =>
    !deepIds.includes(level.id) && !summitIds.includes(level.id));

  /* The scripted hand over ten seeded attempts per rung. */
  const ATTEMPTS = 10;
  const bench = (level) => {
    const runs = [];
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      runs.push(App.whisperAutoRun(level, attempt));
    }
    return runs;
  };

  /* Foe pressure from the module's own table: the rung's foes are level
   * data, and the engine keeps the table closure-bound, so the pressure is
   * re-hosted here verbatim. */
  const FOES = {
    murmur: 20, caller: 24, antiphon: 26, choir: 28,
    deacon: 33, hollow: 28, wraith: 34, thunder: 40,
  };
  const pressure = (level) =>
    (level.foes || []).reduce((sum, key) => sum + (FOES[key] || 0), 0);

  const runProblems = [];
  [byId.w20].concat(deep, summit).forEach((level) => {
    const runs = bench(level);
    const wins = runs.filter((run) => run.won);
    const isExtended = deepIds.includes(level.id) || summitIds.includes(level.id);
    /* The hand wins in a realistic share - the shipped peak calibrates. */
    if (wins.length < ATTEMPTS - 2) {
      runProblems.push(`${level.id}: the scripted hand wins only ${wins.length}/${ATTEMPTS}`);
      return;
    }
    /* Every winning run ends on exactly the duels the rung asks for. */
    const wantDuels = isExtended ? level.duels : 4;
    if (!wins.every((run) => run.duels === wantDuels)) {
      runProblems.push(`${level.id}: a winning run ended after ` +
        `${wins.map((run) => run.duels).join(",")} duels, wanted ${wantDuels}`);
    }
    const resolves = wins.map((run) => run.resolve).sort((a, b) => b - a);
    /* Bands: reachable, never free, ordered, and every win pays a star. */
    const bands = level.starResolve;
    if (!(bands[0] > bands[1] && bands[1] > bands[2])) {
      runProblems.push(`${level.id}: bands do not run downwards ${bands.join("/")}`);
    }
    if (resolves[0] < bands[0]) {
      runProblems.push(`${level.id}: three stars are out of reach (best ${resolves[0]} vs ${bands[0]})`);
    }
    if (resolves[0] === bands[0] || resolves.every((value) => value >= bands[0])) {
      /* a full sweep at three stars means the top band is free */
      if (resolves.every((value) => value >= bands[0])) {
        runProblems.push(`${level.id}: every winning run lands three stars - the top band is free`);
      }
    }
    if (resolves[resolves.length - 1] < bands[2]) {
      runProblems.push(`${level.id}: a winning run pays no star ` +
        `(${resolves[resolves.length - 1]} vs ${bands[2]})`);
    }
    /* Deep bands never sit above the shipped peak's one-star line - the
     * deep rungs deal more duels than shipped, so attrition pushes the
     * whole band ladder down. The summit's defense decks legitimately bank
     * more resolve, so its bands hang off their own measured lines only. */
    if (deepIds.includes(level.id) && bands[2] > byId.w20.starResolve[2]) {
      runProblems.push(`${level.id}: one-star band ${bands[2]} above the shipped peak's`);
    }
  });
  check("game-whisper-deck",
    `the scripted hand plays every extended night and the bands sit on its lines (${ATTEMPTS} runs x 11 rungs)`,
    runProblems.length === 0, runProblems.slice(0, 4).join(" | "));

  /* The lesson is structural. */
  check("game-whisper-deck",
    "no shipped rung asks for a fifth duel; the deep tier deals five and six",
    shallow.every((level) => !level.duels) &&
    deep[0].duels === 5 && deep[1].duels === 5 &&
    deep[2].duels === 6 && deep[3].duels === 6,
    "deep duels " + deep.map((level) => level.duels).join("/"));
  check("game-whisper-deck",
    "the thin-breath rung is the first to pair two breath with more than four duels",
    byId.w22.breath === 2 && byId.w22.duels === 5 &&
    shallow.every((level) => level.breath > 2 || level.duels === undefined),
    "w22 breath 2 / duels 5");
  check("game-whisper-deck",
    "the capstone faces more foe resolve in one night than any shipped rung",
    pressure(byId.w24) > pressure(byId.w20) &&
    shallow.every((level) => pressure(byId.w24) > pressure(level)),
    `w24 ${pressure(byId.w24)} vs shipped max ` +
      Math.max.apply(null, shallow.map((level) => pressure(level))));

  /* The summit's structure: seven and eight duels, the thin-breath lesson
   * paired with both, and a pressure table that climbs past the deep
   * tier's own capstone. */
  check("game-whisper-deck",
    "no shipped rung asks for a seventh duel; the summit deals seven and eight",
    shallow.every((level) => !level.duels || level.duels <= 4) &&
      deep.every((level) => level.duels <= 6) &&
      summit.map((level) => level.duels).join("/") === "7/7/7/8/8/8",
    "summit duels " + summit.map((level) => level.duels).join("/"));
  check("game-whisper-deck",
    "the summit pairs two breath with both long nights, past w22's five",
    byId.w26.breath === 2 && byId.w26.duels === 7 &&
      byId.w29.breath === 2 && byId.w29.duels === 8 &&
      deep.every((level) => level.breath > 2 || level.duels <= 5),
    "w26 breath " + byId.w26.breath + "/" + byId.w26.duels +
      ", w29 breath " + byId.w29.breath + "/" + byId.w29.duels);
  check("game-whisper-deck",
    "the thunder court out-pressures every night the deep tier dealt",
    pressure(byId.w30) > pressure(byId.w24) &&
      deep.every((level) => pressure(byId.w30) > pressure(level)) &&
      summit.every((level, index) => index === 0 ||
        pressure(level) !== pressure(summit[index - 1])),
    `w30 ${pressure(byId.w30)} vs deep max ` +
      Math.max.apply(null, deep.map((level) => pressure(level))));

  /* The tier's names and twists resolve in both languages. */
  const copyProblems = deep.concat(summit).reduce((bad, level) => bad.concat([level.labelKey, level.twistKey]), [])
    .filter((key) =>
      !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
      !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
      !App.t(key) || App.t(key) === key);
  check("game-whisper-deck", "the ten deep and summit chamber names and twists resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each chamber in
   * order hands the player exactly the next one, all twenty-four times. */
  const chain = App.createCampaign({
    key: "whisper-deck-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 30, better: "high" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-whisper-deck", "the unlock chain walks all thirty chambers in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");
};
