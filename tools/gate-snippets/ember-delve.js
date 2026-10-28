"use strict";

/* game-ember-delve: the deep tier's bands are measured by seeded hands, and
 * its one new lesson - the drain - is proved three ways.
 *
 * The four new rungs (d21-d24) carry `vitals` and open the delve already
 * wounded - 24, 22, 20, 18 against the shipped 30 - so rest stops being a
 * luxury a clean route can skip and becomes a budget the climb spends. The
 * gate replays whole delves through the game's own exported engine
 * (delveFloor deals every floor, delveCombat resolves every round,
 * delveIntent reads the telegraph) with three hands: a strong turtle that
 * guards the telegraphed hits and budgets its rests, a mid hand with capable
 * combat but no rest budget, and a naive hand that only ever strikes. The
 * engine's own xorshift (delveRandom) makes every replay deterministic from
 * the seed the panel prints, so nothing here needs a pinned Math.random.
 * The strong hand clears every seed of every rung and its lines fix the
 * bands; the naive hand three-stars nothing; and the mid hand clears the
 * shipped peak but bleeds real wins on the deep tier - wins the bench hands
 * straight back when the drain is cut out of a copy of the same rows, so the
 * lesson costs the bench something rather than decorating it. The engine
 * itself is then booted on the real panel with the campaign progressed past
 * d20, and the vitals gauge reads 24/24 where a shipped rung reads 30/30. */

module.exports = function gate(ctx) {
  const { App, env, check } = ctx;
  const levels = App.delveLevels;
  const deepIds = ["d21", "d22", "d23", "d24"];

  check("game-ember-delve", "the ladder holds twenty-four floors",
    levels.length === 24, String(levels.length));
  check("game-ember-delve", "every floor id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-ember-delve", "the deep tier d21-d24 is present",
    missing.length === 0, missing.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);
  const shallow = levels.filter((level) => !deepIds.includes(level.id));

  /* The lesson is structural: no shipped rung carries the field, every deep
   * rung does, and the drain ratchets strictly downwards below the shipped
   * 30. The anti-stall law survives untouched - the deep tier still delves
   * to depth 8, so the route bound still clears the turn cap. */
  const leaky = shallow.filter((level) => level.vitals !== undefined);
  check("game-ember-delve", "no shipped rung opens the delve drained",
    leaky.length === 0, leaky.map((level) => level.id).join(","));
  const drained = deep.map((level) => level.vitals);
  check("game-ember-delve",
    "every deep rung opens drained, ratcheting 24-22-20-18 below the shipped 30",
    drained.join(",") === "24,22,20,18" &&
    drained.every((v) => v > 0 && v < 30),
    drained.join(","));

  /* --- the bench: whole delves replayed through the exported engine ---
   * Constants, species table, spawn/pack and the rest draw are re-hosted
   * verbatim from the module so a replay here is the replay the panel
   * performs; floors, combat and intents come from the App itself. */
  const SIDE = 4;
  const ROOMS = SIDE * SIDE;
  const DEPTH_GOAL = 8;
  const TURN_CAP = 60;
  const FIGHT_CAP = 14;
  const STRIKE_DAMAGE = 5;
  const BITE_VALUE = 3;
  const REST_HEAL = 5;
  const HERO_VITALS = 30;
  const REST_TWISTS = {
    edlTwist4: true, edlTwist5: true, edlTwist11: true,
    edlTwist15: true, edlTwist20: true, edlTwist24: true,
  };
  const edlBeasts = {
    imp: { glyph: "\u25b2", hp: 10, armor: 0, pattern: [{ k: "strike", v: 4 }, { k: "strike", v: 3 }, { k: "bite" }] },
    adder: { glyph: "\u2248", hp: 13, armor: 0, pattern: [{ k: "bite" }, { k: "strike", v: 2 }, { k: "strike", v: 4 }] },
    husk: { glyph: "\u25c8", hp: 17, armor: 2, pattern: [{ k: "guard" }, { k: "strike", v: 5 }, { k: "strike", v: 3 }] },
    warden: { glyph: "\u271a", hp: 22, armor: 1, pattern: [{ k: "strike", v: 4 }, { k: "summon" }, { k: "guard" }] },
  };

  function edlNeighbours(index) {
    const out = [];
    const x = index % SIDE;
    const y = Math.floor(index / SIDE);
    if (x > 0) out.push(index - 1);
    if (x < SIDE - 1) out.push(index + 1);
    if (y > 0) out.push(index - SIDE);
    if (y < SIDE - 1) out.push(index + SIDE);
    return out;
  }

  function edlSpawn(levelDef, kind, depth, buffed) {
    const spec = edlBeasts[kind] || edlBeasts.imp;
    const hp = spec.hp + Math.floor(Math.max(0, depth) / 2) + (buffed ? 4 : 0);
    return {
      kind: edlBeasts[kind] ? kind : "imp",
      glyph: spec.glyph,
      hp: hp,
      maxHp: hp,
      armor: Math.max(Math.max(0, spec.armor), Math.max(0, levelDef && levelDef.armor || 0)),
      guard: 0,
      regen: Math.max(0, levelDef && levelDef.regen || 0),
      step: 0,
    };
  }

  function edlPack(levelDef, depth, rand) {
    const kinds = levelDef.kinds && levelDef.kinds.length ? levelDef.kinds : ["imp"];
    const pack = [edlSpawn(levelDef, kinds[Math.floor(rand() * kinds.length) % kinds.length], depth, false)];
    if (depth >= 3 && rand() < 0.45) {
      pack.push(edlSpawn(levelDef, kinds[Math.floor(rand() * kinds.length) % kinds.length], depth, false));
    }
    return pack;
  }

  /* rest()'s random half, verbatim: the pool walk, one draw for the spot,
   * then the pack draws, with the warden twist hardening its first beast. */
  function edlRestWake(levelDef, floor, at, depth, rand) {
    const rooms = floor.rooms;
    const warden = !!REST_TWISTS[levelDef.twistKey];
    const near = edlNeighbours(at);
    const living = (i) => rooms[i].beasts.some((b) => b.hp > 0);
    let pool = [];
    for (let i = 0; i < ROOMS; i += 1) {
      if (rooms[i].open && !living(i) && i !== at && (!warden || near.indexOf(i) !== -1)) pool.push(i);
    }
    if (warden && !pool.length) {
      for (let i = 0; i < ROOMS; i += 1) {
        if (rooms[i].open && !living(i) && i !== at) pool.push(i);
      }
    }
    if (pool.length) {
      const spot = pool[Math.floor(rand() * pool.length) % pool.length];
      rooms[spot].beasts = edlPack(levelDef, depth, rand);
      if (warden) {
        rooms[spot].beasts[0].hp += 4;
        rooms[spot].beasts[0].maxHp = rooms[spot].beasts[0].hp;
        rooms[spot].seen = true;
      }
    }
  }

  /* Shortest open walk to the stair; `avoid` marks beast rooms to route
   * around while a route around them still exists. */
  function edlNextToward(floor, at, avoid) {
    const stair = floor.stair;
    if (at === stair) return null;
    const blocked = (i) => avoid && i !== at && i !== stair && avoid(floor, i);
    const prev = new Array(ROOMS).fill(-1);
    prev[at] = at;
    const queue = [at];
    let head = 0;
    while (head < queue.length) {
      const cell = queue[head];
      head += 1;
      for (const n of edlNeighbours(cell)) {
        if (floor.rooms[n].open && prev[n] < 0 && !blocked(n)) {
          prev[n] = cell;
          queue.push(n);
        }
      }
    }
    if (prev[stair] < 0) return null;
    let cur = stair;
    while (prev[cur] !== at) cur = prev[cur];
    return cur;
  }

  /* One full delve on one seed, played the way the panel plays it: steps,
   * rests and descents spend turns, rounds are free, a broken fight costs
   * the step out and back, and the wounds dealt stay on the foe. */
  function delveRun(level, attempt, hand) {
    const seed = (level.seed + attempt * 977) >>> 0;
    const rand = App.delveRandom(seed);
    const vitals = level.vitals > 0 ? level.vitals : HERO_VITALS;
    let hero = { hp: vitals, maxHp: vitals, focus: 0, guard: 0, dodge: 0 };
    let depth = 1;
    let turns = 0;
    let floor = App.delveFloor(level, 1, rand);
    let at = floor.start;
    let mode = "roam";
    let fightBeasts = [];
    let round = 0;
    let rests = 0;
    for (let guard = 0; guard < 4000; guard += 1) {
      if (turns >= TURN_CAP) {
        return { won: false, turns, why: "stall", depth, hp: hero.hp, start: vitals };
      }
      if (mode === "fight") {
        const out = App.delveCombat(hero, fightBeasts, hand.plan(hero, fightBeasts));
        hero = out.hero;
        round += 1;
        const live = out.enemies.filter((b) => b.hp > 0);
        floor.rooms[at].beasts = live;
        if (out.fallen) {
          return { won: false, turns, why: "fell", depth, hp: 0, start: vitals };
        }
        if (!live.length) {
          mode = "roam";
          fightBeasts = [];
          round = 0;
          hero.hp = Math.min(hero.maxHp, hero.hp + 3);
          hero.focus = Math.min(2, hero.focus + 1);
          if (floor.rooms[at].stair && depth >= DEPTH_GOAL) {
            return { won: true, turns, why: "won", depth, hp: hero.hp, start: vitals };
          }
        } else if (round >= FIGHT_CAP) {
          mode = "roam";
          fightBeasts = [];
          round = 0;
          turns += 2;
        } else {
          fightBeasts = live;
        }
        continue;
      }
      const room = floor.rooms[at];
      const livingHere = room.beasts.filter((b) => b.hp > 0);
      if (livingHere.length) {
        mode = "fight";
        fightBeasts = livingHere.slice();
        round = 0;
        continue;
      }
      if (room.stair) {
        if (depth >= DEPTH_GOAL) {
          return { won: true, turns, why: "won", depth, hp: hero.hp, start: vitals };
        }
        depth += 1;
        turns += 1;
        floor = App.delveFloor(level, depth, rand);
        at = floor.start;
        hero.dodge = 0;
        continue;
      }
      if (hand.rest(hero, depth, floor, at, rests)) {
        hero.hp = Math.min(hero.maxHp, hero.hp + REST_HEAL);
        turns += 1;
        rests += 1;
        edlRestWake(level, floor, at, depth, rand);
        continue;
      }
      const next = edlNextToward(floor, at, hand.avoid || null);
      const step = next == null ? edlNextToward(floor, at, null) : next;
      if (step == null) {
        return { won: false, turns, why: "lost", depth, hp: hero.hp, start: vitals };
      }
      at = step;
      turns += 1;
    }
    return { won: false, turns, why: "loop", depth, hp: hero.hp, start: vitals };
  }

  /* --- the hands --- */
  const incomingOf = (beasts) => beasts.filter((b) => b.hp > 0).reduce((sum, b) => {
    const it = App.delveIntent(b);
    if (it.k === "strike") return sum + it.v;
    if (it.k === "bite") return sum + 2 * BITE_VALUE;
    return sum;
  }, 0);

  /* The strong hand: rounds are free, so the turtle is the strong line -
   * soak the telegraphed hits, spend spare slots on the heavy, top up before
   * the drain bites, and route around packs it does not have to fight. */
  function strongPlan(hero, beasts) {
    const live = beasts.filter((b) => b.hp > 0);
    const incoming = incomingOf(beasts);
    const actions = [];
    if (incoming >= 4) actions.push("guard");
    if (incoming >= 8 && actions.length < 2) actions.push("guard");
    while (actions.length < 3) {
      if (hero.focus >= 1) actions.push("focus");
      else if (live.some((b) => b.armor + b.guard >= STRIKE_DAMAGE - 1)) actions.push("focus");
      else actions.push("strike");
    }
    return actions;
  }
  const strong = {
    plan: strongPlan,
    avoid: (floor, i) => floor.rooms[i].beasts.some((b) => b.hp > 0),
    rest: (hero, depth, floor, at, restsSoFar) =>
      restsSoFar < 14 && hero.hp <= hero.maxHp - 4,
  };

  /* The mid hand: capable combat - guards the big telegraphs, cycles the
   * heavy - but it never budgets for the climb, resting only once it is
   * nearly dead. On the shipped 30-vital rungs the buffer carries it; the
   * deep tier's drain is what kills it. */
  function midPlan(hero, beasts) {
    const live = beasts.filter((b) => b.hp > 0);
    const incoming = incomingOf(beasts);
    const actions = [];
    if (incoming >= 5) actions.push("guard");
    while (actions.length < 3) {
      if (hero.focus >= 1) actions.push("focus");
      else if (live.some((b) => b.armor + b.guard >= STRIKE_DAMAGE - 1)) actions.push("focus");
      else actions.push("strike");
    }
    return actions;
  }
  const mid = {
    plan: midPlan,
    avoid: strong.avoid,
    rest: (hero) => hero.hp <= 8,
  };

  /* The naive hand: three strikes and pray. It never guards, never focuses,
   * never rests in time - the floor the bands are not allowed to promise. */
  const naive = {
    plan: () => ["strike", "strike", "strike"],
    avoid: null,
    rest: (hero) => hero.hp <= 8,
  };

  /* Six seeds per rung: attempts 1-6, the exact seeds the panel deals on the
   * first six New Round presses (seed + attempt * 977). Deterministic end to
   * end - the engine rolls no die outside its own xorshift stream. */
  const SEEDS = [1, 2, 3, 4, 5, 6];
  const bench = (level, hand) => {
    const runs = SEEDS.map((attempt) => delveRun(level, attempt, hand));
    const wins = runs.filter((run) => run.won);
    return {
      won: wins.length,
      total: runs.length,
      best: wins.length ? Math.min.apply(null, wins.map((run) => run.turns)) : null,
      worst: wins.length ? Math.max.apply(null, wins.map((run) => run.turns)) : null,
    };
  };

  /* Calibration: the bench is real. The strong hand clears the shipped peak
   * on every seed, so the bar the deep tier meets is a bar that binds. */
  const d20 = bench(byId.d20, strong);
  check("game-ember-delve",
    `the strong hand clears the shipped peak d20 (${d20.won}/6 seeds)`,
    d20.won === 6, `${d20.won}/6`);

  /* Every deep rung: the strong hand's authored line clears all six seeds,
   * its worst winning line lands inside the two-star band, its best plays
   * for the three-star line, and the bands run in order under the cap. */
  const runProblems = [];
  deep.forEach((level) => {
    const run = bench(level, strong);
    const name = `${level.id} vitals=${level.vitals} bands=${level.starTurns.join("/")}`;
    if (run.won !== 6) {
      runProblems.push(`${name} the strong hand cleared ${run.won}/6`);
    }
    if (run.worst === null || run.worst > level.starTurns[1]) {
      runProblems.push(`${name} a winning line missed the two-star band` +
        ` (worst ${run.worst})`);
    }
    if (run.best === null || run.best > level.starTurns[0]) {
      runProblems.push(`${name} the three-star line is not played for` +
        ` (best ${run.best})`);
    }
    if (!(level.starTurns[0] < level.starTurns[1] &&
        level.starTurns[1] < level.starTurns[2] &&
        level.starTurns[2] < TURN_CAP)) {
      runProblems.push(`${name} bands do not run downwards under the cap` +
        ` ${level.starTurns.join("/")}`);
    }
  });
  check("game-ember-delve",
    "the strong hand clears every deep seed and its lines fix the bands",
    runProblems.length === 0, runProblems.join(" | "));

  /* Not free: the naive hand three-stars nothing on the deep tier - it does
   * not even survive it - so the bands promise nothing to a hand that does
   * not engage the telegraph. */
  const naiveDeep = deep.reduce((sum, level) => sum + bench(level, naive).won, 0);
  check("game-ember-delve",
    "a naive hand three-stars nothing on the deep tier",
    naiveDeep === 0, `${naiveDeep} naive wins`);

  /* The drain is load-bearing. The mid hand clears the shipped peak in a
   * realistic share, then wins strictly less often on the deep tier seed
   * for seed - and cutting the drain out of copies of the same rows hands
   * the wins straight back, so it is the vitals, not the mixes, that bleeds
   * them. */
  const midPeak = bench(byId.d20, mid);
  const midDrained = deep.map((level) => bench(level, mid));
  const midDeep = midDrained.reduce((sum, run) => sum + run.won, 0);
  const midUndrained = deep.map((level) =>
    bench(Object.assign({}, level, { vitals: 0 }), mid));
  const midUndrainedTotal = midUndrained.reduce((sum, run) => sum + run.won, 0);
  check("game-ember-delve",
    `the mid hand clears the shipped peak (${midPeak.won}/6) but bleeds on the drained tier (${midDeep}/24)`,
    midPeak.won >= 3 && midDeep < midPeak.won * 4,
    `peak ${midPeak.won}/6, tier ${midDeep}/24`);
  const ablationProblems = [];
  deep.forEach((level, index) => {
    if (midUndrained[index].won < midDrained[index].won) {
      ablationProblems.push(`${level.id} got harder without the drain` +
        ` (${midUndrained[index].won} vs ${midDrained[index].won})`);
    }
  });
  check("game-ember-delve",
    `cutting the drain out of the deep rows hands the mid hand its wins back (${midUndrainedTotal}/24)`,
    midUndrainedTotal > midDeep && ablationProblems.length === 0,
    `undrained ${midUndrainedTotal}/24 vs drained ${midDeep}/24` +
      (ablationProblems.length ? " | " + ablationProblems.join(" | ") : ""));

  /* The engine itself opens the deep tier drained: boot the real panel with
   * the campaign progressed past d20 and the vitals gauge reads the drain;
   * boot it fresh and it reads the shipped 30. The store is left clean. */
  const store = env.localStorage;
  const campaignKey = "ember-delve-campaign";
  const cleared = {};
  shallow.forEach((level) => { cleared[level.id] = { stars: 3, best: 30 }; });
  const panelVitals = (record) => {
    if (record) {
      store.setItem(campaignKey, record);
    } else {
      store.removeItem(campaignKey);
    }
    const panel = env.document.createElement("div");
    App.initEmberDelveGame(panel);
    const gauge = panel.childNodes[0].childNodes[1].childNodes[1].textContent;
    store.removeItem(campaignKey);
    return gauge;
  };
  const drainedGauge = panelVitals(JSON.stringify({ v: 1, cleared }));
  const freshGauge = panelVitals(null);
  check("game-ember-delve",
    "the engine boots d21 with the gauge at 24/24 where a shipped rung reads 30/30",
    drainedGauge === "24/24" && freshGauge === "30/30",
    `deep boot ${drainedGauge}, fresh boot ${freshGauge}`);

  /* The tier's names and twists travel with the game: both languages hold a
   * real string and t() never falls back to the raw key. */
  const copyKeys = deep.reduce((keys, level) =>
    keys.concat([level.labelKey, level.twistKey]), []);
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-ember-delve", "the four deep floor names and twists resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each floor in order
   * hands the player exactly the next one, all twenty-four times. */
  const chain = App.createCampaign({
    key: "ember-delve-gate-chain",
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
  check("game-ember-delve", "the unlock chain walks all twenty-four floors in order",
    walked === 24 && chained && chain.clearedCount() === 24, walked + " first clears");
};
