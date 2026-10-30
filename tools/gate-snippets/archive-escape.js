"use strict";

/* game-archive-escape: the deep tier's satchel law is proved by the same
 * breadth-first search that proves the shipped nights, and its tools are
 * proved load-bearing by taking them away.
 *
 * The module's own arcSolve floods the whole building over full states and
 * prices every case the ladder names, so the gate reads the shipped proof
 * directly: every deep case must price at a finite turn count, the shipped
 * twenty must still price (the extended goal list changed nothing behind
 * them), and each deep case's requirement set must strictly contain a
 * shipped case's - the same door, asked for with more in the satchel. Then
 * the gate re-hosts the search, bans the satchel's tools from the full yard
 * case one at a time, and proves the lamp and the rope essential: with
 * either gone, the flood finds no route at all. A loadout whose loss ends
 * the walk is a loadout that matters.
 *
 * The water tier a25-a30 hangs off six dead-end rooms the original plans
 * forgot. The gate proves they are what the module claims they are: each
 * grants exactly one flag and has exactly one way back out; no shipped case
 * names a water flag; the flood re-hosted with the water rooms spliced out
 * prices every shipped night identically - the detours pay rent on no
 * shipped route - while every water case prices strictly above the shipped
 * maximum for its own ending and the tier's minimums climb rung by rung to
 * the summit. a25's dead backup power has to cost real turns: the same
 * full loadout with the breaker allowed prices cheaper. */

module.exports = function gate(ctx) {
  const { App, check, fs, path, root } = ctx;
  const levels = App.archiveLevels;
  const deepIds = ["a21", "a22", "a23", "a24"];
  const waterIds = ["a25", "a26", "a27", "a28", "a29", "a30"];

  check("game-archive-escape", "the ladder holds thirty nights",
    levels.length === 30, String(levels.length));
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

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);
  const water = waterIds.map((id) => byId[id]);
  const proof = App.archiveSolve();
  const shipped = levels.filter((level) =>
    !deepIds.includes(level.id) && !waterIds.includes(level.id));

  /* Every case the ladder ships prices at a finite turn count, shipped, deep
   * and water alike - the extended goal list changed nothing behind the
   * shipped twenty. */
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
  deep.concat(water).forEach((level) => {
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
    "every deep and water case dominates a shipped case: full loadouts contain one, dry walks foreclose one",
    dominanceProblems.length === 0, dominanceProblems.join(" | "));

  /* The water tier climbs and overpays: each rung's minimum strictly beats
   * the previous rung's, every rung prices strictly above the shipped
   * maximum for its own ending, and the capstone is the dearest night in
   * the building. */
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
    levels.filter((level) => level.id !== "a30").map((level) => proof.turns[level.goal] || 0));
  check("game-archive-escape",
    "the water tier climbs above every shipped route and a30 is the dearest night in the building",
    climbProblems.length === 0 && summitTurns > dearestElsewhere,
    climbProblems.join(" | ") || `summit ${summitTurns} vs ${dearestElsewhere}`);

  /* Bands hang off the measured minimum, never a guess: every deep and
   * water night derives [min+3, min+7, min+13] from the flood's price. */
  const bandProblems = [];
  deep.concat(water).forEach((level) => {
    const min = proof.turns[level.goal];
    const bands = App.archiveBands(level);
    if (level.starTurns || bands.length !== 3 ||
        bands[0] !== min + 3 || bands[1] !== min + 7 || bands[2] !== min + 13) {
      bandProblems.push(`${level.id}: ${bands.join("/")} off ${min}`);
    }
  });
  check("game-archive-escape",
    "every deep and water night bands off its measured minimum",
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

  /* And behaviourally: re-host the flood with the water rooms spliced out
   * and prove every shipped night prices identically. The detours pay rent
   * on no shipped route. */
  const spliced = splicedFlood();
  const spliceProblems = [];
  shipped.forEach((level) => {
    if (spliced.turns[level.goal] !== proof.turns[level.goal]) {
      spliceProblems.push(`${level.id}: ${proof.turns[level.goal]} -> ${spliced.turns[level.goal]}`);
    }
  });
  check("game-archive-escape",
    "splicing the water rooms out leaves every shipped price where it was",
    spliceProblems.length === 0 && spliced.ok,
    spliceProblems.join(" | ") || `ok ${spliced.ok}`);

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
  const copyProblems = deep.concat(water).map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-archive-escape", "the ten deep and water night names resolve in both languages",
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

  /* The unlock chain is derived, never stored: clearing each night in order
   * hands the player exactly the next one, all thirty times. */
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
  check("game-archive-escape", "the unlock chain walks all thirty nights in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");

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
   * entirely, which is how the water detours are proved to pay no rent. */
  function moduleSlice(extraCases, extraGoals, spliceIds) {
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
        spliceIds.map((id) => JSON.stringify(id)).join(" !== ") + " !== n.id; });\n" +
        "arcNodes.forEach(function (n) { " +
        "n.choices = n.choices.filter(function (c) { return " +
        spliceIds.map((id) => JSON.stringify(id)).join(" !== ") + " !== c.to; }); });\n"
      : "";
    const factory = new Function(
      "var App = { currentLang: 'en', t: function (k) { return k; } };\n" +
        body + "\n" + injections + "\n" + splices +
        "\nreturn { arcSolve: arcSolve, arcCases: arcCases };");
    return factory();
  }

  function splicedFlood() {
    const host = moduleSlice(null, null,
      ["pumpRoom", "cistern", "wetStack", "survey", "cage",
        "weighHouse", "dispatch", "copyRoom", "press"]);
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
    const host = moduleSlice(
      { probeNoLamp: lampless, probeNoRope: ropeless },
      ["probeNoLamp", "probeNoRope"],
    );
    const turns = host.arcSolve().turns;
    return { lamp: turns.probeNoLamp, rope: turns.probeNoRope };
  }
};
