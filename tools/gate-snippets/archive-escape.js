"use strict";

/* game-archive-escape: the deep tier's satchel law is proved by the same
 * breadth-first search that proves the shipped nights, and its tools are
 * proved load-bearing by taking them away.
 *
 * The module's own arcSolve floods the whole building over full states and
 * prices every case the ladder names, so the gate reads the shipped proof
 * directly: every deep case must price at a finite turn count, the shipped
 * thirty must still price exactly as measured, and each deep case's
 * requirement set must strictly contain a shipped case's - the same door,
 * asked for with more in the satchel. Then the gate re-hosts the search,
 * bans the satchel's tools from the full yard case one at a time, and proves
 * the lamp and the rope essential: with either gone, the flood finds no route
 * at all. A loadout whose loss ends the walk is a loadout that matters.
 *
 * The water tier a25-a30 hangs off six dead-end rooms the original plans
 * forgot. The gate proves they are what the module claims they are: each
 * grants exactly one flag and has exactly one way back out; no shipped case
 * names a water flag; the flood re-hosted with the water rooms spliced out
 * prices every shipped night identically - the detours pay rent on no
 * shipped route - while every water case prices strictly above the shipped
 * maximum for its own ending and the tier's minimums climb rung by rung to
 * the summit. a25's dead backup power has to cost real turns: the same
 * full loadout with the breaker allowed prices cheaper.
 *
 * The sealed wing a31-a40 lies behind the secret ending: ten passage rooms
 * down to a round room, and three one-way charter rooms that each set one
 * flag. The gate proves the ladder reaches forty, every one of the forty
 * cases prices, the first thirty prices exactly as they shipped, and the
 * wing's minima climb from above a30 to a summit inside 60-80 turns. Three
 * checks carry the new architecture: each wing flag is granted by exactly
 * one dead-end room with one choice back; no earlier case names a wing flag;
 * and splicing the wing out leaves all thirty earlier prices untouched while
 * every wing night loses its price. Each new rung also gets its own cut: a
 * distinct passage room removed from the re-hosted graph. Finally the three
 * flags themselves are deleted one at a time, each unpricing a witness night. */

module.exports = function gate(ctx) {
  const { App, check, fs, path, root } = ctx;
  const levels = App.archiveLevels;
  const deepIds = ["a21", "a22", "a23", "a24"];
  const waterIds = ["a25", "a26", "a27", "a28", "a29", "a30"];
  const wingIds = ["a31", "a32", "a33", "a34", "a35", "a36", "a37", "a38", "a39", "a40"];
  const wingRoomIds = [
    "sealDoor", "deedStair", "deedPassage", "deedVault", "plumbAlcove",
    "sealGallery", "charterCloset", "oathLanding", "munimentRoom", "wingHub",
    "sealRoom", "charterRoom", "oathRoom",
  ];
  const wingFlags = ["sealed", "chartered", "sworn"];
  const oldFlags = ["power", "flue", "wet", "caged", "manifest", "pressed"];

  check("game-archive-escape", "the ladder holds at least forty nights",
    levels.length >= 40, String(levels.length));
  check("game-archive-escape", "every night id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-archive-escape", "the deep tier a21-a24 is present",
    missing.length === 0, missing.join(","));
  const waterMissing = waterIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-archive-escape", "the water tier a25-a30 is present in order",
    waterMissing.length === 0 &&
      waterIds.every((id, index) => levels.findIndex((level) => level.id === id) >
        (index === 0 ? -1 : levels.findIndex((level) => level.id === waterIds[index - 1]))),
    waterMissing.join(",") || "ordered");
  const wingMissing = wingIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-archive-escape", "the sealed wing a31-a40 is present in order",
    wingMissing.length === 0 &&
      wingIds.every((id, index) => levels.findIndex((level) => level.id === id) >
        (index === 0 ? -1 : levels.findIndex((level) => level.id === wingIds[index - 1]))),
    wingMissing.join(",") || "ordered");

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);
  const water = waterIds.map((id) => byId[id]);
  const wing = wingIds.map((id) => byId[id]);
  const proof = App.archiveSolve();
  /* The twenty nights that predate the case-file tiers. */
  const shipped = levels.filter((level) =>
    !deepIds.includes(level.id) && !waterIds.includes(level.id) && !wingIds.includes(level.id));
  /* Everything before the sealed wing, which is what its splice must leave
   * alone: the shipped twenty, the deep four and the water six. */
  const prior = levels.filter((level) => !wingIds.includes(level.id));

  /* The thirty nights measured before the sealed wing was appended. The
   * wing must not move any of them. */
  const SHIPPED_PRICES = {
    a1: 7, a2: 17, a3: 7, a4: 20, a5: 20, a6: 10, a7: 22, a8: 22, a9: 15, a10: 24,
    a11: 8, a12: 16, a13: 18, a14: 21, a15: 21, a16: 22, a17: 23, a18: 25, a19: 27,
    a20: 28, a21: 23, a22: 23, a23: 22, a24: 27, a25: 29, a26: 31, a27: 33,
    a28: 35, a29: 39, a30: 43,
  };
  const baselineProblems = [];
  Object.keys(SHIPPED_PRICES).forEach((id) => {
    const level = byId[id];
    if (!level) {
      baselineProblems.push(`${id}: missing from the ladder`);
      return;
    }
    const turns = proof.turns[level.goal];
    if (turns !== SHIPPED_PRICES[id]) {
      baselineProblems.push(`${id}: ${SHIPPED_PRICES[id]} -> ${turns}`);
    }
  });
  check("game-archive-escape",
    "the thirty nights before the wing still price exactly as they shipped",
    baselineProblems.length === 0, baselineProblems.join(" | "));

  /* Every case the ladder ships prices at a finite turn count, shipped, deep,
   * water and wing alike - the extended goal list changed nothing behind the
   * shipped thirty. */
  const priceProblems = [];
  levels.forEach((level) => {
    const turns = proof.turns[level.goal];
    if (turns === null || turns === undefined) {
      priceProblems.push(`${level.id} (${level.goal}) prices at nothing`);
    }
  });
  check("game-archive-escape",
    "every case in the ladder prices through the shipped flood",
    priceProblems.length === 0, priceProblems.join(" | "));

  /* The deep cases' derived bands: the game bands a case night off its own
   * minimum turns, so the minimum has to be a real number the bands can
   * hang from, and the rung's constraint set must strictly contain a
   * shipped case's - the same door, asked for with more in the satchel. */
  const CASES = deepCases();
  const shippedCases = shippedCasesByName();
  const subsumes = (big, small) => {
    if (small.ending && big.ending !== small.ending) return false;
    if ((small.items || []).some((item) => !(big.items || []).includes(item))) return false;
    if ((small.clues || []).some((clue) => !(big.clues || []).includes(clue))) return false;
    if (small.items && small.items.length &&
        big.items && big.items.length &&
        big.items.length < small.items.length) return false;
    return true;
  };
  const dominanceProblems = [];
  deep.concat(water, wing).forEach((level) => {
    const mine = CASES[level.goal];
    if (!mine) {
      dominanceProblems.push(`${level.goal}: no case file`);
      return;
    }
    if (mine.ban && (mine.ban.items || []).length) {
      /* A dry case forecloses a tool: some shipped case at the same door
       * must have REQUIRED the banned item, and the dry walk still hauls
       * the full clue set. */
      const banned = mine.ban.items;
      const foreclosed = shippedCases.some((entry) =>
        entry.caseFile.ending === mine.ending &&
        (entry.caseFile.items || []).some((item) => banned.includes(item)));
      if (!foreclosed) {
        dominanceProblems.push(`${level.goal}: bans nothing the shipped nights leaned on`);
      }
      if ((mine.clues || []).length !== 5) {
        dominanceProblems.push(`${level.goal}: the dry walk does not carry the full clue set`);
      }
      return;
    }
    const covered = shippedCases.filter((entry) => subsumes(mine, entry.caseFile));
    if (!covered.length) {
      dominanceProblems.push(`${level.goal}: strictly contains no shipped case`);
    }
  });
  check("game-archive-escape",
    "every deep, water and wing case dominates a shipped case: full loadouts contain one, dry walks foreclose one",
    dominanceProblems.length === 0, dominanceProblems.join(" | "));

  /* The water tier climbs and overpays: each rung's minimum strictly beats
   * the previous rung's, every rung prices strictly above the shipped
   * maximum for its own ending, and a30 is the dearest of the first thirty. */
  const shippedMaxByEnding = {};
  shipped.forEach((level) => {
    const ending = CASES[level.goal] ? CASES[level.goal].ending : level.goal;
    const turns = proof.turns[level.goal];
    if (typeof turns === "number" && turns > (shippedMaxByEnding[ending] || 0)) {
      shippedMaxByEnding[ending] = turns;
    }
  });
  const climbProblems = [];
  water.forEach((level, index) => {
    const turns = proof.turns[level.goal];
    const ending = CASES[level.goal].ending;
    if (!(turns > (shippedMaxByEnding[ending] || 0))) {
      climbProblems.push(`${level.id} (${turns}) does not beat the shipped ${ending} max ` +
        `${shippedMaxByEnding[ending] || 0}`);
    }
    if (index > 0 && !(turns > proof.turns[water[index - 1].goal])) {
      climbProblems.push(`${level.id} (${turns}) does not beat ${water[index - 1].id} ` +
        `(${proof.turns[water[index - 1].goal]})`);
    }
  });
  const summitTurns = proof.turns[byId.a30.goal];
  const dearestElsewhere = Math.max.apply(null,
    levels.filter((level) => level.id !== "a30" && !wingIds.includes(level.id))
      .map((level) => proof.turns[level.goal] || 0));
  check("game-archive-escape",
    "the water tier climbs above every shipped route and a30 is dearest of the first thirty",
    climbProblems.length === 0 && summitTurns > dearestElsewhere,
    climbProblems.join(" | ") || `summit ${summitTurns} vs ${dearestElsewhere}`);

  /* The sealed wing starts above a30 and climbs rung by rung to a summit
   * between 60 and 80 turns, the dearest night in the building. */
  const wingClimbProblems = [];
  wing.forEach((level, index) => {
    const turns = proof.turns[level.goal];
    if (index === 0) {
      if (!(turns > proof.turns[byId.a30.goal])) {
        wingClimbProblems.push(`${level.id} (${turns}) does not start above a30 ` +
          `(${proof.turns[byId.a30.goal]})`);
      }
    } else if (!(turns > proof.turns[wing[index - 1].goal])) {
      wingClimbProblems.push(`${level.id} (${turns}) does not beat ${wing[index - 1].id} ` +
        `(${proof.turns[wing[index - 1].goal]})`);
    }
  });
  const wingSummit = proof.turns[byId.a40.goal];
  const dearestOfAll = Math.max.apply(null,
    levels.filter((level) => level.id !== "a40").map((level) => proof.turns[level.goal] || 0));
  check("game-archive-escape",
    "the sealed wing climbs from above a30 to a 60-80 turn summit dearest in the building",
    wingClimbProblems.length === 0 && wingSummit >= 60 && wingSummit <= 80 &&
      wingSummit > dearestOfAll,
    wingClimbProblems.join(" | ") ||
      `summit ${wingSummit} vs ${dearestOfAll} (${wingSummit >= 60 && wingSummit <= 80 ? "in" : "out of"} 60-80)`);

  /* Bands hang off the measured minimum, never a guess: every deep, water
   * and wing night derives [min+3, min+7, min+13] from the flood's price. */
  const bandProblems = [];
  deep.concat(water, wing).forEach((level) => {
    const min = proof.turns[level.goal];
    const bands = App.archiveBands(level);
    if (level.starTurns || bands.length !== 3 ||
        bands[0] !== min + 3 || bands[1] !== min + 7 || bands[2] !== min + 13) {
      bandProblems.push(`${level.id}: ${bands.join("/")} off ${min}`);
    }
  });
  check("game-archive-escape",
    "every deep, water and wing night bands off its measured minimum",
    bandProblems.length === 0, bandProblems.join(" | "));

  /* a25's dead backup power has to cost a real detour: the identical
   * loadout with the breaker allowed prices cheaper. */
  check("game-archive-escape",
    "a25's power ban is load-bearing: the same full loadout with power allowed prices cheaper",
    proof.turns.yardNoPowerFull > proof.turns.yardEveryItemFull,
    `no-power ${proof.turns.yardNoPowerFull} vs ${proof.turns.yardEveryItemFull}`);

  /* The water flags are one-way detours: each flag room grants exactly one
   * flag and offers exactly one way back, and no shipped case file names a
   * water flag - the detours cannot be load-bearing on a shipped route. */
  const waterFlags = ["wet", "caged", "manifest", "pressed"];
  const shapeProblems = [];
  const flagNodes = {};
  graphNodes().forEach((node) => {
    waterFlags.forEach((flag) => {
      if (node.set === flag) {
        flagNodes[flag] = node;
        if (node.choices.length !== 1) {
          shapeProblems.push(`${node.id}: a water detour offers ${node.choices.length} ways on`);
        }
      }
    });
  });
  waterFlags.forEach((flag) => {
    if (!flagNodes[flag]) {
      shapeProblems.push(`${flag}: no room grants it`);
    }
  });
  shippedCases.forEach((entry) => {
    const names = (entry.caseFile.flags || [])
      .concat(entry.caseFile.ban && entry.caseFile.ban.flags ? entry.caseFile.ban.flags : []);
    names.forEach((flag) => {
      if (waterFlags.includes(flag)) {
        shapeProblems.push(`${entry.name}: a shipped case names the water flag ${flag}`);
      }
    });
  });
  check("game-archive-escape",
    "every water flag is granted by a one-way dead-end room no shipped case names",
    shapeProblems.length === 0, shapeProblems.join(" | "));

  /* The sealed wing's three flags obey the same law: one granting room each,
   * one choice back to its only inbound neighbour, and no earlier case names
   * any of them. The wing's ten cases must also each combine a wing flag with
   * a flag the earlier tiers already used, and no two may name the same set. */
  const nodes = graphNodes();
  const wingShapeProblems = [];
  const wingGrantNodes = {};
  nodes.forEach((node) => {
    wingFlags.forEach((flag) => {
      if (node.set === flag) {
        if (wingGrantNodes[flag]) {
          wingShapeProblems.push(`${flag}: granted by more than one room`);
        }
        wingGrantNodes[flag] = node;
        if (node.choices.length !== 1) {
          wingShapeProblems.push(`${node.id}: a wing branch offers ${node.choices.length} ways on`);
        }
        if (node.ending) {
          wingShapeProblems.push(`${node.id}: a wing branch is also an ending`);
        }
        if (node.give || node.clue) {
          wingShapeProblems.push(`${node.id}: a wing branch grants more than its flag`);
        }
      }
    });
  });
  wingFlags.forEach((flag) => {
    const node = wingGrantNodes[flag];
    if (!node) {
      wingShapeProblems.push(`${flag}: no room grants it`);
      return;
    }
    const inbound = nodes.filter((other) =>
      (other.choices || []).some((choice) => choice.to === node.id));
    if (inbound.length !== 1) {
      wingShapeProblems.push(`${node.id}: ${inbound.length} ways in`);
      return;
    }
    if (node.choices[0].to !== inbound[0].id) {
      wingShapeProblems.push(`${node.id}: its one choice does not return to ${inbound[0].id}`);
    }
  });
  const wingCombos = [];
  const comboProblems = [];
  wing.forEach((level) => {
    const mine = CASES[level.goal];
    if (!mine) {
      comboProblems.push(`${level.goal}: no case file`);
      return;
    }
    const flags = (mine.flags || []).slice().sort();
    if (!flags.some((flag) => wingFlags.includes(flag))) {
      comboProblems.push(`${level.goal}: names no sealed-wing flag`);
    }
    if (!flags.some((flag) => oldFlags.includes(flag))) {
      comboProblems.push(`${level.goal}: names no earlier flag`);
    }
    const key = flags.join("+");
    if (wingCombos.includes(key)) {
      comboProblems.push(`${level.goal}: repeats the flag set ${key}`);
    }
    wingCombos.push(key);
  });
  prior.forEach((level) => {
    const mine = CASES[level.goal];
    if (!mine) {
      return;
    }
    const named = (mine.flags || [])
      .concat(mine.ban && mine.ban.flags ? mine.ban.flags : []);
    named.forEach((flag) => {
      if (wingFlags.includes(flag)) {
        wingShapeProblems.push(`${level.id}: an earlier case names the wing flag ${flag}`);
      }
    });
  });
  check("game-archive-escape",
    "every wing flag is a one-way dead end no earlier case names, and the ten flag sets are unique",
    wingShapeProblems.length === 0 && comboProblems.length === 0,
    wingShapeProblems.concat(comboProblems).join(" | "));

  /* Every new room and every new choice carries both languages. */
  const wingCopyProblems = [];
  wingRoomIds.forEach((id) => {
    const node = nodes.find((entry) => entry.id === id);
    if (!node) {
      wingCopyProblems.push(`${id}: missing from the graph`);
      return;
    }
    if (!node.en || !node.zh) {
      wingCopyProblems.push(`${id}: room prose is not bilingual`);
    }
    node.choices.forEach((choice, index) => {
      if (!choice.en || !choice.zh) {
        wingCopyProblems.push(`${id}: choice ${index + 1} is not bilingual`);
      }
    });
  });
  check("game-archive-escape",
    "every sealed-wing room and choice is bilingual",
    wingCopyProblems.length === 0, wingCopyProblems.join(" | "));

  /* Behaviourally: re-host the flood with the sealed wing spliced out and
   * prove all thirty earlier nights price identically while every wing night
   * loses its price. The wing pays rent on no earlier route. */
  const wingSpliced = wingSplicedFlood();
  const wingSpliceProblems = [];
  prior.forEach((level) => {
    if (wingSpliced.turns[level.goal] !== proof.turns[level.goal]) {
      wingSpliceProblems.push(`${level.id}: ${proof.turns[level.goal]} -> ${wingSpliced.turns[level.goal]}`);
    }
  });
  const wingStillPriced = wing.filter((level) => wingSpliced.turns[level.goal] !== null);
  check("game-archive-escape",
    "splicing the sealed wing out leaves all thirty earlier prices where they were and unprices every wing night",
    wingSpliceProblems.length === 0 && wingStillPriced.length === 0 && wingSpliced.ok,
    wingSpliceProblems.concat(wingStillPriced.map((level) =>
      `${level.id} still ${wingSpliced.turns[level.goal]}`)).join(" | ") || `all unpriced, ok ${wingSpliced.ok}`);

  /* And behaviourally for the water rooms too: re-host the flood with both
   * the water rooms and the sealed wing spliced out and prove every shipped
   * night prices identically. The detours pay rent on no shipped route. */
  const spliced = splicedFlood();
  const waterSpliceProblems = [];
  shipped.forEach((level) => {
    if (spliced.turns[level.goal] !== proof.turns[level.goal]) {
      waterSpliceProblems.push(`${level.id}: ${proof.turns[level.goal]} -> ${spliced.turns[level.goal]}`);
    }
  });
  check("game-archive-escape",
    "splicing the water rooms and the sealed wing out leaves every shipped price where it was",
    waterSpliceProblems.length === 0 && spliced.ok,
    waterSpliceProblems.join(" | ") || `ok ${spliced.ok}`);

  /* A cut per wing rung: each new night loses its price when its own passage
   * room is removed from the re-hosted graph. */
  const cutRooms = [
    "sealDoor", "deedStair", "deedPassage", "deedVault", "plumbAlcove",
    "sealGallery", "charterCloset", "oathLanding", "munimentRoom", "wingHub",
  ];
  const cutProblems = [];
  wing.forEach((level, index) => {
    const room = cutRooms[index];
    if (!room) {
      cutProblems.push(`${level.id}: no cut room mapped`);
      return;
    }
    const host = moduleSlice(null, null, [room]);
    const turns = host.arcSolve().turns[level.goal];
    if (turns !== null) {
      cutProblems.push(`${level.id}: ${room} still prices at ${turns}`);
    }
  });
  check("game-archive-escape",
    "every wing night loses its price when its own passage room is spliced out",
    cutProblems.length === 0,
    cutProblems.join(" | ") || `${wing.length} rooms, ${wing.length} unpriced nights`);

  /* The three wing flags are load-bearing: deleting the grant unprices a
   * witness night that asks for it. */
  const flagWitnesses = [
    { flag: "sealed", goal: "sealedFlueFull" },
    { flag: "chartered", goal: "charteredPlantFull" },
    { flag: "sworn", goal: "swornCageFull" },
  ];
  const flagCutProblems = [];
  flagWitnesses.forEach((entry) => {
    const host = moduleSlice(null, null, null, [entry.flag]);
    const turns = host.arcSolve().turns[entry.goal];
    if (turns !== null) {
      flagCutProblems.push(`${entry.flag}: ${entry.goal} still prices at ${turns}`);
    }
  });
  check("game-archive-escape",
    "each sealed-wing flag is load-bearing: deleting its grant unprices its witness night",
    flagCutProblems.length === 0, flagCutProblems.join(" | ") || "sealed, chartered, sworn");

  /* The three branch rooms themselves are load-bearing too: splicing each
   * one out unprices a witness night that needs its flag. Together with the
   * per-rung passage cuts this removes all thirteen new rooms once. */
  const branchCutProblems = [];
  flagWitnesses.forEach((entry) => {
    const room = entry.flag === "sealed" ? "sealRoom" :
      entry.flag === "chartered" ? "charterRoom" : "oathRoom";
    const host = moduleSlice(null, null, [room]);
    const turns = host.arcSolve().turns[entry.goal];
    if (turns !== null) {
      branchCutProblems.push(`${room}: ${entry.goal} still prices at ${turns}`);
    }
  });
  check("game-archive-escape",
    "every wing branch room is load-bearing: splicing it out unprices its witness night",
    branchCutProblems.length === 0, branchCutProblems.join(" | ") || "sealRoom, charterRoom, oathRoom");

  /* The tools are load-bearing: the full yard case without the lamp, or
   * without the rope, prices at nothing. Re-hosted search, same flood. */
  const probes = probeBans();
  check("game-archive-escape",
    "the full yard case without the lamp prices at nothing - the lamp is load-bearing",
    probes.lamp === null, "turned " + (probes.lamp === null ? "nothing" : probes.lamp));
  check("game-archive-escape",
    "the full yard case without the rope prices at nothing - the rope is load-bearing",
    probes.rope === null, "turned " + (probes.rope === null ? "nothing" : probes.rope));

  /* The tiers' names resolve in both languages. */
  const copyProblems = deep.concat(water, wing).map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-archive-escape", "every deep, water and wing night name resolves in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The HUD resolves each rung's target through `arcGoal` + the capitalised
   * goal name; a missing key paints the raw identifier at the player. */
  const goalCopy = levels.map((level) =>
    "arcGoal" + level.goal.charAt(0).toUpperCase() + level.goal.slice(1)).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-archive-escape", "every night's target line resolves in both languages",
    goalCopy.length === 0, goalCopy.join(","));

  /* Every new flag also has a satchel name in both languages. */
  const flagCopy = wingFlags.map((flag) =>
    "arcFlag" + flag.charAt(0).toUpperCase() + flag.slice(1)).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-archive-escape", "every sealed-wing flag name resolves in both languages",
    flagCopy.length === 0, flagCopy.join(","));

  /* The unlock chain is derived, never stored: clearing each night in order
   * hands the player exactly the next one, for every rung the ladder holds. */
  const chain = App.createCampaign({
    key: "archive-escape-gate-chain",
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
  check("game-archive-escape", "the unlock chain walks every night in order",
    walked === levels.length && chained && chain.clearedCount() === levels.length,
    walked + " first clears");

  /* ---- helpers: re-hosted module core ------------------------------------ */

  function deepCases() {
    const slice = moduleSlice();
    return slice.arcCases;
  }

  function shippedCasesByName() {
    const shippedGoals = shipped.map((level) => level.goal);
    const all = deepCases();
    return Object.keys(all)
      .filter((name) => shippedGoals.includes(name))
      .map((name) => ({ name, caseFile: all[name] }));
  }

  /* The booted graph, read through the module's own export. */
  function graphNodes() {
    return App.archiveGraph();
  }

  /* Re-host the module's graph, case table and flood, with extra cases and
   * goal names injected - or with named rooms spliced out of the graph
   * entirely, or named flags deleted from every grant, which is how the
   * water and sealed-wing detours are proved to pay no rent. */
  function moduleSlice(extraCases, extraGoals, spliceIds, flagSplices) {
    const src = fs.readFileSync(
      path.join(root, "assets", "app", "game-archive-escape.js"), "utf8");
    const start = src.indexOf("var arcClueTotal = 5;");
    const end = src.indexOf("App.archiveSolve");
    let body = src.slice(start, end);
    if (extraGoals && extraGoals.length) {
      body = body.replace(
        '"roofEveryItemFull", "secretEveryItemFull", "ledgerDryFull", "yardDryFull",',
        '"roofEveryItemFull", "secretEveryItemFull", "ledgerDryFull", "yardDryFull",\n' +
          "      " + extraGoals.map((goal) => JSON.stringify(goal)).join(", ") + ",",
      );
    }
    const injections = extraCases
      ? Object.keys(extraCases).map((name) =>
          `arcCases[${JSON.stringify(name)}] = ${JSON.stringify(extraCases[name])};`).join("\n")
      : "";
    const splices = spliceIds && spliceIds.length
      ? "arcNodes = arcNodes.filter(function (n) { return " +
        spliceIds.map((id) => `n.id !== ${JSON.stringify(id)}`).join(" && ") + "; });\n" +
        "arcNodes.forEach(function (n) { " +
        "n.choices = n.choices.filter(function (c) { return " +
        spliceIds.map((id) => `c.to !== ${JSON.stringify(id)}`).join(" && ") + "; }); });\n"
      : "";
    const flagCuts = flagSplices && flagSplices.length
      ? "arcNodes.forEach(function (n) { if (" +
        flagSplices.map((flag) => `n.set === ${JSON.stringify(flag)}`).join(" || ") +
        ") { delete n.set; } (n.choices || []).forEach(function (c) { if (" +
        flagSplices.map((flag) => `c.set === ${JSON.stringify(flag)}`).join(" || ") +
        ") { delete c.set; } }); });\n"
      : "";
    const factory = new Function(
      "var App = { currentLang: 'en', t: function (k) { return k; } };\n" +
        body + "\n" + injections + "\n" + splices + "\n" + flagCuts +
        "\nreturn { arcSolve: arcSolve, arcCases: arcCases };");
    return factory();
  }

  function splicedFlood() {
    const host = moduleSlice(null, null,
      ["pumpRoom", "cistern", "wetStack", "survey", "cage",
        "weighHouse", "dispatch", "copyRoom", "press"].concat(wingRoomIds));
    return host.arcSolve();
  }

  function wingSplicedFlood() {
    const host = moduleSlice(null, null, wingRoomIds);
    return host.arcSolve();
  }

  function probeBans() {
    const full = {
      ending: "yard",
      items: ["key", "card", "rope", "chit", "tea", "ledger"],
      clues: ["c1", "c2", "c3", "c4", "c5"],
    };
    const lampless = JSON.parse(JSON.stringify(full));
    lampless.ban = { items: ["lamp"] };
    const ropeless = JSON.parse(JSON.stringify(full));
    ropeless.ban = { items: ["rope"] };
    /* The lamp and rope probes never ask for a wing flag, so the wing is
     * spliced out to keep the re-hosted flood at the shipped state count. */
    const host = moduleSlice(
      { probeNoLamp: lampless, probeNoRope: ropeless },
      ["probeNoLamp", "probeNoRope"],
      wingRoomIds,
    );
    const turns = host.arcSolve().turns;
    return { lamp: turns.probeNoLamp, rope: turns.probeNoRope };
  }
};
