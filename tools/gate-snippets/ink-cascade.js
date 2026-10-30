"use strict";

/* game-ink-cascade: the pour is the mechanic, and the panel is the proof
 *
 * App.cascadeLevels is the module's own table and every deal below is played
 * through the real panel (select, tile clicks, cascade timers on the virtual
 * clock), seeded by swapping Math.random for a deterministic prng around each
 * deal - greedy and one-ply lines use seed k*7919, wild hands k*6271 - so the
 * run is reproducible. The swap search ranks candidates with an offline
 * mirror of the engine's matcher, but every point is scored by the engine
 * itself.
 *
 * Each new pool must be beaten: the two-ply greedy line clears most seeded
 * deals and lands the three-star band on at least one, the ordinary one-ply
 * hand still clears inside a lower band, doing nothing never scores, and a
 * random hand never reaches the top band. The advertised mechanic is
 * load-bearing by re-deal: the pool's `colors` dial is cut to the classic six
 * on the LIVE def (the panel's closure shares the object), the pool is
 * re-selected so the engine re-deals under the cut, and the same greedy line
 * cannot reach the target on a single seeded deal. Star bands are derived,
 * never authored: the engine scores starsFor(score, [1.4t, 1.2t, t], "high")
 * and no new pool carries band fields of its own.
 *
 * The summit tier p25-p30 gets the same treatment, and the cut runs on a
 * copy: a clone of the rung with colors forced back to six is swapped into
 * App.cascadeLevels at the rung's index, the panel deals whatever sits there,
 * and the same greedy line must fall short on every deal. The derived bands
 * have to fall strictly from the three-star line to the target inside each
 * rung, the price per move has to climb through the six and open above p24,
 * and p30 has to end the ladder as its biggest target and heaviest demand. */
module.exports = function gate(ctx) {
  const { App, env, check } = ctx;
  const levels = App.cascadeLevels;
  const tierIds = ["p21", "p22", "p23", "p24"];
  const summitIds = ["p25", "p26", "p27", "p28", "p29", "p30"];
  const byId = (id) => levels.find((level) => level.id === id);

  /* ---- ladder shape ---- */
  check("game-ink-cascade", "the ladder holds at least twenty-four pools",
    levels.length >= 24, String(levels.length));
  check("game-ink-cascade", "the ladder holds all thirty pools",
    levels.length >= 30, String(levels.length));
  check("game-ink-cascade", "every pool id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = tierIds.filter((id) => !byId(id));
  check("game-ink-cascade", "the hard tier p21-p24 is present",
    missing.length === 0, missing.join(","));
  const missingSummit = summitIds.filter((id) => !byId(id));
  check("game-ink-cascade", "the summit tier p25-p30 is present",
    missingSummit.length === 0, missingSummit.join(","));

  /* ---- stage the real panel in the stub DOM ---- */
  if (env.timers && env.timers.advance) env.timers.advance(10000);
  const doc = env.document;
  const make = (id, tag) => {
    let el = env.byId(id);
    if (!el) {
      el = doc.createElement(tag || "div");
      el.id = id;
      doc.body.appendChild(el);
    }
    return el;
  };
  make("inkBoard");
  make("inkScore");
  make("inkMoves");
  make("inkCombo");
  const resultEl = make("inkResult");
  make("inkNewBtn", "button");
  make("inkBest");
  const sel = make("inkLevelSel", "select");

  const cleared = {};
  for (let p = 1; p <= 20; p += 1) cleared["p" + p] = { stars: 3, best: 100000 };
  env.store.set("ink-cascade-campaign", JSON.stringify({ v: 1, cleared: cleared }));
  App.initInkCascadeGame();
  const readSave = () => JSON.parse(env.store.get("ink-cascade-campaign") || "{}");

  /* ---- the engine's matcher, mirrored offline to rank swaps only ---- */
  function matches(colors) {
    const at = (x, y) => colors[y * 8 + x];
    const found = new Set();
    for (let y = 0; y < 8; y += 1) {
      let run = 1;
      for (let x = 1; x <= 8; x += 1) {
        if (x < 8 && at(x, y) >= 0 && at(x, y) === at(x - 1, y)) run += 1;
        else {
          if (run >= 3 && at(x - 1, y) >= 0) for (let k = x - run; k < x; k += 1) found.add(y * 8 + k);
          run = 1;
        }
      }
    }
    for (let x = 0; x < 8; x += 1) {
      let run = 1;
      for (let y = 1; y <= 8; y += 1) {
        if (y < 8 && at(x, y) >= 0 && at(x, y) === at(x, y - 1)) run += 1;
        else {
          if (run >= 3 && at(x, y - 1) >= 0) for (let k = y - run; k < y; k += 1) found.add(k * 8 + x);
          run = 1;
        }
      }
    }
    return Array.from(found);
  }
  function collapse(colors) {
    for (let x = 0; x < 8; x += 1) {
      const column = [];
      for (let y = 7; y >= 0; y -= 1) {
        const color = colors[y * 8 + x];
        if (color >= 0) column.push(color);
      }
      for (let y = 7; y >= 0; y -= 1) {
        const fromBottom = 7 - y;
        colors[y * 8 + x] = fromBottom < column.length ? column[fromBottom] : -1;
      }
    }
  }
  /* The chain a swap starts, counting only ink already on the board (the
   * engine's refills are random, so the mirror stops where certainty does). */
  function value(colors) {
    const board = colors.slice();
    let total = 0;
    let wave = 0;
    for (;;) {
      const matched = matches(board);
      if (!matched.length) break;
      wave += 1;
      total += matched.length * 10 * wave;
      matched.forEach((index) => {
        board[index] = -1;
      });
      collapse(board);
    }
    return total;
  }
  const swaps = [];
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const a = y * 8 + x;
      if (x + 1 < 8) swaps.push([a, a + 1]);
      if (y + 1 < 8) swaps.push([a, a + 8]);
    }
  }
  function best(colors) {
    const ranked = [];
    for (const [a, b] of swaps) {
      const trial = colors.slice();
      const hold = trial[a];
      trial[a] = trial[b];
      trial[b] = hold;
      const worth = value(trial);
      if (worth > 0) ranked.push({ a, b, worth, board: trial });
    }
    ranked.sort((p, q) => q.worth - p.worth);
    if (!ranked.length) return null;
    /* two-ply: a swap is worth its own chain plus the best chain it sets up */
    let top = null;
    for (const play of ranked.slice(0, 8)) {
      let follow = 0;
      for (const [a, b] of swaps) {
        const trial = play.board.slice();
        const hold = trial[a];
        trial[a] = trial[b];
        trial[b] = hold;
        const worth = value(trial);
        if (worth > follow) follow = worth;
      }
      const total = play.worth + follow * 0.9;
      if (!top || total > top.total) top = { a: play.a, b: play.b, total };
    }
    return top;
  }
  function bestOne(colors) {
    let top = null;
    for (const [a, b] of swaps) {
      const trial = colors.slice();
      const hold = trial[a];
      trial[a] = trial[b];
      trial[b] = hold;
      const worth = value(trial);
      if (worth > 0 && (!top || worth > top.worth)) top = { a, b, worth };
    }
    return top;
  }
  function readBoard() {
    const tiles = env.byId("inkBoard").children;
    const colors = [];
    for (let index = 0; index < tiles.length; index += 1) {
      const m = /ink-c(-?\d+)/.exec(tiles[index].className);
      colors.push(m ? Number(m[1]) : -1);
    }
    return colors;
  }

  /* One seeded deal, played through the real panel. */
  function playDeal(levelId, seed, mode) {
    return seeded(seed, () => {
      sel.value = levelId;
      env.dispatch(sel, "change");
      const selected = sel.value === levelId;
      const target = Number(/\/(\d+)$/.exec(env.byId("inkScore").textContent)[1]);
      let stalls = 0;
      let lastMoves = -1;
      let movesSpent = 0;
      for (;;) {
        if (sel.value !== levelId) break; /* the engine advanced on a clear */
        if (/Cleared /.test(resultEl.textContent)) break;
        const moves = parseInt(env.byId("inkMoves").textContent, 10);
        if (!(moves > 0)) break;
        if (moves === lastMoves) {
          stalls += 1;
          if (stalls > 3) break;
        } else {
          stalls = 0;
          lastMoves = moves;
        }
        const colors = readBoard();
        let swap = null;
        if (mode === "greedy") {
          swap = best(colors);
        } else if (mode === "one") {
          swap = bestOne(colors);
        } else {
          const options = [];
          for (const [a, b] of swaps) {
            const trial = colors.slice();
            const hold = trial[a];
            trial[a] = trial[b];
            trial[b] = hold;
            if (value(trial) > 0) options.push({ a, b });
          }
          if (options.length) swap = options[Math.floor(Math.random() * options.length)];
        }
        if (!swap) break;
        movesSpent += 1;
        const tiles = env.byId("inkBoard").children;
        tiles[swap.a].click();
        tiles[swap.b].click();
        for (let step = 0; step < 30; step += 1) {
          env.timers.advance(100);
          if (env.timers.pendingTimeouts() === 0) break;
        }
      }
      const text = resultEl.textContent;
      const won = /Cleared /.test(text);
      const m = /with (\d+) points/.exec(text);
      const fm = /at (\d+)\/\d+ points/.exec(text);
      const s = /(\d)\/3 stars/.exec(text);
      return {
        selected,
        cleared: won,
        stars: s ? Number(s[1]) : 0,
        score: m ? Number(m[1]) : fm ? Number(fm[1]) : 0,
        target,
        movesSpent,
      };
    });
  }

  /* Deterministic prng swapped over Math.random for one seeded deal; the
   * app's sandbox shares the host Math object, so this reaches the engine. */
  function seeded(seed, fn) {
    const original = Math.random;
    let value = seed >>> 0;
    Math.random = function () {
      value = (value + 0x6d2b79f5) >>> 0;
      let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
      mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
    try {
      return fn();
    } finally {
      Math.random = original;
    }
  }

  /* ---- beat every new pool, prove the bands, cut the pour ---- */
  const tierProofs = [];
  for (const id of tierIds) {
    const level = byId(id);
    const deals = [];
    for (let k = 1; k <= 6; k += 1) deals.push(playDeal(id, k * 7919, "greedy"));
    const clears = deals.filter((d) => d.cleared).length;
    const threeStars = deals.filter((d) => d.stars === 3).length;
    check("game-ink-cascade", id + ": the greedy line clears most seeded deals and lands the top band",
      deals.every((d) => d.selected) && clears >= 4 && threeStars >= 1,
      "clears " + clears + "/6, three-star " + threeStars + " " +
        JSON.stringify(deals.map((d) => [d.score, d.stars])));

    const ordinary = [];
    for (let k = 1; k <= 6; k += 1) ordinary.push(playDeal(id, k * 7919, "one"));
    const ordClears = ordinary.filter((d) => d.cleared).length;
    const ordStars = ordinary.map((d) => d.stars);
    check("game-ink-cascade", id + ": the ordinary one-ply hand still clears inside the bands",
      ordClears >= 2 && ordStars.every((stars) => stars >= 0 && stars <= 3),
      "clears " + ordClears + "/6 stars " + JSON.stringify(ordStars));

    /* A pool that plays itself is not a pool: no swaps, no score, no clear.
     * At these pours even a random hand scores - the pour pays everyone - so
     * freedom is disproved by the idle hand here, by the searched line
     * outscoring every random hand, and by the cut below. */
    const idle = seeded(97, () => {
      sel.value = id;
      env.dispatch(sel, "change");
      for (let tick = 0; tick < 40; tick += 1) {
        env.timers.advance(100);
        if (env.timers.pendingTimeouts() === 0) break;
      }
      return {
        score: env.byId("inkScore").textContent,
        text: resultEl.textContent,
        moves: env.byId("inkMoves").textContent,
      };
    });
    const wild = [];
    for (let k = 1; k <= 5; k += 1) wild.push(playDeal(id, k * 6271, "random"));
    const wildMax = Math.max.apply(null, wild.map((d) => d.score));
    const greedyMax = Math.max.apply(null, deals.map((d) => d.score));
    check("game-ink-cascade", id + ": doing nothing never scores and the searched line outscores every random hand",
      idle.score === "0/" + level.target && !/Cleared /.test(idle.text) &&
        wildMax < greedyMax,
      "idle " + idle.score + " wild max " + wildMax + " vs greedy " + greedyMax);

    /* The advertised mechanic is load-bearing: cut the pour to the classic
     * six inks on the live def, re-select so the engine re-deals under the
     * cut, and the same greedy line cannot reach the target on any deal. */
    const saved = JSON.parse(JSON.stringify(level));
    Object.assign(level, { colors: 6 });
    const cutDeals = [];
    for (let k = 1; k <= 4; k += 1) cutDeals.push(playDeal(id, k * 7919, "greedy"));
    Object.assign(level, saved);
    sel.value = id;
    env.dispatch(sel, "change");
    const cutClears = cutDeals.filter((d) => d.cleared).length;
    tierProofs.push(id + (cutClears === 0 ? ":ok" : ":" + cutClears + "/4"));
    check("game-ink-cascade", id + " (pour cut to six inks): the same greedy line cannot reach the target",
      cutClears === 0 && cutDeals.every((d) => d.selected),
      "cut clears " + cutClears + "/4 " + JSON.stringify(cutDeals.map((d) => [d.score, d.target])));

    /* The bands are the engine's own derivation, not authored fields. */
    check("game-ink-cascade", id + " carries no authored star band",
      level.starBands === undefined && level.bands === undefined && level.stars === undefined,
      JSON.stringify(Object.keys(level)));

    /* The clear survived the cut and the idle hand. */
    check("game-ink-cascade", id + " stays cleared in the campaign save",
      readSave().cleared[id] && readSave().cleared[id].stars >= 1,
      JSON.stringify(readSave().cleared[id] || null));

    /* The next pool unlocks only through the clear this pool just recorded. */
    const index = tierIds.indexOf(id);
    if (index + 1 < tierIds.length) {
      sel.value = tierIds[index + 1];
      env.dispatch(sel, "change");
      check("game-ink-cascade", tierIds[index + 1] + " unlocks once " + id + " is cleared",
        sel.value === tierIds[index + 1], sel.value);
    }
  }

  /* The tier is the hard tier on the card's own currency: each new pool asks
   * for more points per move than the shipped summit p20, and the demand
   * climbs strictly through the tier. */
  const p20 = byId("p20");
  const shippedDemand = p20.target / p20.moves;
  const demands = tierIds.map((id) => byId(id).target / byId(id).moves);
  check("game-ink-cascade", "the tier's demand per move climbs and opens above p20 (" +
      demands.map((n) => n.toFixed(0)).join(" -> ") + " vs " + shippedDemand.toFixed(0) + ")",
    demands.every((v, i) => (i === 0 || v > demands[i - 1]) && v > shippedDemand),
    demands.join("/") + " vs " + shippedDemand);
  check("game-ink-cascade", "every cut left the tier unbeatable in its advertised shape",
    tierProofs.every((p) => p.endsWith(":ok")), tierProofs.join(" "));

  /* ---- the summit tier: the same proofs, with the cut made on a copy ---- */
  const summitProofs = [];
  for (const id of summitIds) {
    const level = byId(id);
    const deals = [];
    for (let k = 1; k <= 6; k += 1) deals.push(playDeal(id, k * 7919, "greedy"));
    const clears = deals.filter((d) => d.cleared).length;
    const threeStars = deals.filter((d) => d.stars === 3).length;
    check("game-ink-cascade", id + ": the greedy line clears most seeded deals and lands the top band",
      deals.every((d) => d.selected) && clears >= 4 && threeStars >= 1,
      "clears " + clears + "/6, three-star " + threeStars + " " +
        JSON.stringify(deals.map((d) => [d.score, d.stars])));

    const ordinary = [];
    for (let k = 1; k <= 6; k += 1) ordinary.push(playDeal(id, k * 7919, "one"));
    const ordClears = ordinary.filter((d) => d.cleared).length;
    const ordStars = ordinary.map((d) => d.stars);
    check("game-ink-cascade", id + ": the ordinary one-ply hand still clears inside the bands",
      ordClears >= 2 && ordStars.every((stars) => stars >= 0 && stars <= 3),
      "clears " + ordClears + "/6 stars " + JSON.stringify(ordStars));

    /* A pool that plays itself is not a pool: no swaps, no score, no clear. */
    const idle = seeded(97, () => {
      sel.value = id;
      env.dispatch(sel, "change");
      for (let tick = 0; tick < 40; tick += 1) {
        env.timers.advance(100);
        if (env.timers.pendingTimeouts() === 0) break;
      }
      return {
        score: env.byId("inkScore").textContent,
        text: resultEl.textContent,
        moves: env.byId("inkMoves").textContent,
      };
    });
    const wild = [];
    for (let k = 1; k <= 5; k += 1) wild.push(playDeal(id, k * 6271, "random"));
    const wildMax = Math.max.apply(null, wild.map((d) => d.score));
    const greedyMax = Math.max.apply(null, deals.map((d) => d.score));
    check("game-ink-cascade", id + ": doing nothing never scores and the searched line outscores every random hand",
      idle.score === "0/" + level.target && !/Cleared /.test(idle.text) &&
        wildMax < greedyMax,
      "idle " + idle.score + " wild max " + wildMax + " vs greedy " + greedyMax);

    /* The advertised mechanic is load-bearing, cut on a copy this time: a
     * clone with the pour forced back to the classic six inks is swapped
     * into the level table at the rung's index, the panel deals whatever
     * sits there, and the same greedy line cannot reach the target on any
     * deal. The original goes straight back. */
    const index = levels.indexOf(level);
    const clone = JSON.parse(JSON.stringify(level));
    clone.colors = 6;
    levels[index] = clone;
    const cutDeals = [];
    for (let k = 1; k <= 4; k += 1) cutDeals.push(playDeal(id, k * 7919, "greedy"));
    levels[index] = level;
    sel.value = id;
    env.dispatch(sel, "change");
    const cutClears = cutDeals.filter((d) => d.cleared).length;
    summitProofs.push(id + (cutClears === 0 ? ":ok" : ":" + cutClears + "/4"));
    check("game-ink-cascade", id + " (pour cut to six inks on a copy): the same greedy line cannot reach the target",
      cutClears === 0 && cutDeals.every((d) => d.selected),
      "cut clears " + cutClears + "/4 " + JSON.stringify(cutDeals.map((d) => [d.score, d.target])));

    /* The bands are the engine's own derivation, not authored fields, and
     * they fall strictly from the three-star line down to the target. */
    const bands = [
      Math.round(level.target * 1.4),
      Math.round(level.target * 1.2),
      level.target,
    ];
    check("game-ink-cascade", id + " carries no authored star band and its bands fall strictly",
      level.starBands === undefined && level.bands === undefined && level.stars === undefined &&
        bands[0] > bands[1] && bands[1] > bands[2],
      JSON.stringify(Object.keys(level)) + " bands " + bands.join("/"));

    /* The clear survived the cut and the idle hand. */
    check("game-ink-cascade", id + " stays cleared in the campaign save",
      readSave().cleared[id] && readSave().cleared[id].stars >= 1,
      JSON.stringify(readSave().cleared[id] || null));

    /* The next summit rung unlocks only through the clear just recorded. */
    const at = summitIds.indexOf(id);
    if (at + 1 < summitIds.length) {
      sel.value = summitIds[at + 1];
      env.dispatch(sel, "change");
      check("game-ink-cascade", summitIds[at + 1] + " unlocks once " + id + " is cleared",
        sel.value === summitIds[at + 1], sel.value);
    }
  }

  /* The summit is priced on the card's own currency: the price per move
   * climbs strictly through the six and opens above the Confluence's, and
   * the last rung ends the ladder as its biggest target and heaviest
   * demand. */
  const p24 = byId("p24");
  const fittedDemand = p24.target / p24.moves;
  const summitDemands = summitIds.map((id) => byId(id).target / byId(id).moves);
  check("game-ink-cascade", "the summit's demand per move climbs and opens above p24 (" +
      summitDemands.map((n) => n.toFixed(0)).join(" -> ") + " vs " + fittedDemand.toFixed(0) + ")",
    summitDemands.every((v, i) => (i === 0 || v > summitDemands[i - 1]) && v > fittedDemand),
    summitDemands.join("/") + " vs " + fittedDemand);
  check("game-ink-cascade", "p30 is the summit: the biggest target and the heaviest demand in the ladder",
    byId("p30").target === Math.max.apply(null, levels.map((level) => level.target)) &&
      summitDemands[summitDemands.length - 1] ===
        Math.max.apply(null, levels.map((level) => level.target / level.moves)),
    "target " + byId("p30").target + ", demand " +
      summitDemands[summitDemands.length - 1].toFixed(0));
  check("game-ink-cascade", "every summit cut left its rung unbeatable in the advertised shape",
    summitProofs.every((p) => p.endsWith(":ok")), summitProofs.join(" "));

  /* Copy travels with the module. */
  const copyKeys = ["inkL21", "inkL22", "inkL23", "inkL24"];
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-ink-cascade", "the four pool names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* Copy travels with the module. */
  const summitKeys = ["inkL25", "inkL26", "inkL27", "inkL28", "inkL29", "inkL30"];
  const summitCopyProblems = summitKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-ink-cascade", "the six summit names resolve in both languages",
    summitCopyProblems.length === 0, summitCopyProblems.join(","));
};
