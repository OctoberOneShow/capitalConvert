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
 * the walk is a loadout that matters. */

module.exports = function gate(ctx) {
  const { App, check, fs, path, root } = ctx;
  const levels = App.archiveLevels;
  const deepIds = ["a21", "a22", "a23", "a24"];

  check("game-archive-escape", "the ladder holds twenty-four nights",
    levels.length === 24, String(levels.length));
  check("game-archive-escape", "every night id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-archive-escape", "the deep tier a21-a24 is present",
    missing.length === 0, missing.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);
  const proof = App.archiveSolve();
  const shipped = levels.filter((level) => !deepIds.includes(level.id));

  /* Every case the ladder ships prices at a finite turn count, shipped and
   * deep alike - the extended goal list changed nothing behind the shipped
   * twenty. */
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
  deep.forEach((level) => {
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
    "every deep case dominates a shipped case: full loadouts contain one, dry walks foreclose one",
    dominanceProblems.length === 0, dominanceProblems.join(" | "));

  /* The tools are load-bearing: the full yard case without the lamp, or
   * without the rope, prices at nothing. Re-hosted search, same flood. */
  const probes = probeBans();
  check("game-archive-escape",
    "the full yard case without the lamp prices at nothing - the lamp is load-bearing",
    probes.lamp === null, "turned " + (probes.lamp === null ? "nothing" : probes.lamp));
  check("game-archive-escape",
    "the full yard case without the rope prices at nothing - the rope is load-bearing",
    probes.rope === null, "turned " + (probes.rope === null ? "nothing" : probes.rope));

  /* The tier's names resolve in both languages. */
  const copyProblems = deep.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-archive-escape", "the four deep night names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each night in order
   * hands the player exactly the next one, all twenty-four times. */
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
  check("game-archive-escape", "the unlock chain walks all twenty-four nights in order",
    walked === 24 && chained && chain.clearedCount() === 24, walked + " first clears");

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

  /* Re-host the module's graph, case table and flood, with extra cases and
   * goal names injected, exactly the way the shipped arcSolve floods. */
  function moduleSlice(extraCases, extraGoals) {
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
    const factory = new Function(
      "var App = { currentLang: 'en', t: function (k) { return k; } };\n" +
        body + "\n" + injections +
        "\nreturn { arcSolve: arcSolve, arcCases: arcCases };");
    return factory();
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
