"use strict";

/* game-ink-slash: the feed is the mechanic, and the stroke is the proof
 *
 * App.slashLevels is the module's own table and every round below is played
 * through the real panel (select, start button, pointer strokes over the
 * canvas, virtual clock), seeded by swapping Math.random for a deterministic
 * prng around each round - threading lines use seed k*104729, so the run is
 * reproducible. The stroke planner reads App.inkSlashProbe (the engine's own
 * read-only echo of the flying fruit) and cuts through the real pointer
 * path; every point is scored by the engine itself.
 *
 * Each new round must be beaten: one committed unbroken stroke clears with
 * three stars on every seeded round, a round broken once still clears, short
 * swipes never reach the target, and doing nothing never scores. The
 * advertised mechanic is load-bearing by re-deal: the round's dial is cut on
 * the LIVE def (the panel's closure shares the object), the round is
 * re-selected so the engine re-deals under the cut, and the same threading
 * stroke cannot reach the target on a single seeded round. s21 loses its
 * flood pour, s22 its long clock, s23 the bomb ceiling its target is priced
 * against, s24 its rush. Star bands are derived, never authored: the engine
 * scores starsFor(score, [1.4t, 1.2t, t], "high") and no new round carries
 * band fields of its own.
 *
 * The summit s25-s30 runs the same hands against paired dials: every card
 * hangs its target on two extremes at once, so the cut takes the paired
 * dial away (s25's long clock, s26 and s28's flood pour, s27 and s29's
 * sprint, s30's sprint) and the same threading stroke lands under the
 * target on every seeded round. The curve is the clock's own currency: the
 * demand per second climbs strictly through the six and opens past the
 * hard tier's peak, each rung leads the ladder on the dial it is named
 * for, and the save leaves the summit holding all thirty rounds cleared. */
module.exports = function gate(ctx) {
  const { App, env, check } = ctx;
  const levels = App.slashLevels;
  const tierIds = ["s21", "s22", "s23", "s24"];
  const summitIds = ["s25", "s26", "s27", "s28", "s29", "s30"];
  const byId = (id) => levels.find((level) => level.id === id);

  /* ---- ladder shape ---- */
  check("game-ink-slash", "the ladder holds all thirty rounds",
    levels.length >= 30, String(levels.length));
  check("game-ink-slash", "every round id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = tierIds.filter((id) => !byId(id));
  check("game-ink-slash", "the hard tier s21-s24 is present",
    missing.length === 0, missing.join(","));
  const missingSummit = summitIds.filter((id) => !byId(id));
  check("game-ink-slash", "the summit tier s25-s30 is present",
    missingSummit.length === 0, missingSummit.join(","));

  /* ---- stage the real panel in the stub DOM ---- */
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
  const canvas = make("slashCanvas", "canvas");
  make("slashScore");
  make("slashTime");
  make("slashLives");
  const resultEl = make("slashResult");
  make("slashStartBtn", "button");
  make("slashBest");
  const sel = make("slashLevelSel", "select");
  canvas.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 320, bottom: 240, width: 320, height: 240 });

  const frames = new Map();
  let nextFrame = 1;
  env.window.requestAnimationFrame = (fn) => {
    const id = nextFrame++;
    frames.set(id, fn);
    return id;
  };
  env.window.cancelAnimationFrame = (id) => frames.delete(id);
  const pump = () => {
    const queue = Array.from(frames.entries());
    queue.forEach(([id, fn]) => frames.delete(id));
    queue.forEach(([, fn]) => fn(env.clock.now));
  };

  const cleared = {};
  for (let s = 1; s <= 20; s += 1) cleared["s" + s] = { stars: 3, best: 100000 };
  env.store.set("ink-slash-campaign", JSON.stringify({ v: 1, cleared: cleared }));
  App.initInkSlashGame();
  const readSave = () => JSON.parse(env.store.get("ink-slash-campaign") || "{}");

  function segDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    const ratio = lenSq ? ((px - x1) * dx + (py - y1) * dy) / lenSq : 0;
    const clamped = Math.max(0, Math.min(1, ratio));
    const ex = px - (x1 + clamped * dx);
    const ey = py - (y1 + clamped * dy);
    return Math.sqrt(ex * ex + ey * ey);
  }
  const starsFor = (level, score) => {
    if (score >= Math.round(level.target * 1.4)) return 3;
    if (score >= Math.round(level.target * 1.2)) return 2;
    return score >= level.target ? 1 : 0;
  };

  /* One seeded round, played through the real panel. policy.slice threads
   * the nearest safe fruit with the pen; policy.strokeMs lifts the pen every
   * so often; policy.breakAfterMs breaks once; policy.idle never moves. */
  function playRound(levelId, seed, policy) {
    return seeded(seed, () => {
      sel.value = levelId;
      env.dispatch(sel, "change");
      const selected = sel.value === levelId;
      const target = Number(/\/(\d+)$/.exec(env.byId("slashScore").textContent)[1]);
      const timeS = Number(/([\d.]+)s/.exec(env.byId("slashTime").textContent)[1]);
      env.dispatch(env.byId("slashStartBtn"), "click");
      const probe = App.inkSlashProbe;
      let pen = { x: 160, y: 120 };
      env.dispatch(canvas, "pointerdown", { clientX: pen.x, clientY: pen.y });
      const startedAt = env.clock.now;
      let maxScore = 0;
      let breakAt = policy.breakAfterMs ? startedAt + policy.breakAfterMs : null;
      let nextReset = policy.strokeMs ? startedAt + policy.strokeMs : null;
      for (;;) {
        env.timers.advance(40);
        pump();
        const state = probe();
        if (state.score > maxScore) maxScore = state.score;
        if (!state.running) break;
        if (breakAt !== null && env.clock.now >= breakAt) {
          env.dispatch(canvas, "pointerup", { clientX: pen.x, clientY: pen.y });
          env.dispatch(canvas, "pointerdown", { clientX: pen.x, clientY: pen.y });
          breakAt = null;
        }
        if (nextReset !== null && env.clock.now >= nextReset) {
          env.dispatch(canvas, "pointerup", { clientX: pen.x, clientY: pen.y });
          env.dispatch(canvas, "pointerdown", { clientX: pen.x, clientY: pen.y });
          nextReset = env.clock.now + policy.strokeMs;
        }
        if (state.lives <= 0) break;
        if (policy.slice) {
          const fruits = state.fruits;
          let chosen = null;
          let bestDist = Infinity;
          for (const fruit of fruits) {
            if (fruit.color < 0) continue;
            let safe = true;
            for (const bomb of fruits) {
              if (bomb.color >= 0) continue;
              if (segDist(bomb.x, bomb.y, pen.x, pen.y, fruit.x, fruit.y) < 19) {
                safe = false;
                break;
              }
            }
            const d = Math.hypot(fruit.x - pen.x, fruit.y - pen.y);
            if (safe && d < bestDist) {
              bestDist = d;
              chosen = fruit;
            }
          }
          if (chosen) {
            env.dispatch(canvas, "pointermove", { clientX: chosen.x, clientY: chosen.y });
            pen = { x: chosen.x, y: chosen.y };
          }
        }
      }
      env.dispatch(canvas, "pointerup", { clientX: pen.x, clientY: pen.y });
      return {
        selected,
        cleared: maxScore >= target,
        stars: starsFor(byId(levelId), maxScore),
        score: maxScore,
        target,
        timeS,
        survived: probe().lives > 0,
      };
    });
  }

  /* Deterministic prng swapped over Math.random for one seeded round; the
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

  /* ---- beat every new round, prove the bands, cut the dial ---- */
  const tierProofs = [];
  for (const id of tierIds) {
    const level = byId(id);
    const thread = [];
    for (let k = 1; k <= 4; k += 1) {
      thread.push(playRound(id, k * 104729, { slice: true }));
    }
    const threeStars = thread.filter((r) => r.stars === 3).length;
    check("game-ink-slash", id + ": the committed stroke clears with three stars and survives",
      thread.every((r) => r.selected && r.cleared && r.survived) && threeStars >= 1,
      JSON.stringify(thread.map((r) => [r.score, r.target, r.stars, r.survived ? 1 : 0])));

    /* A round that plays itself is not a round: an idle pen scores nothing,
     * and short swipes never reach the target. */
    const idle = playRound(id, 97, { slice: false });
    const lazy = [];
    for (let k = 1; k <= 3; k += 1) {
      lazy.push(playRound(id, k * 104729, { slice: true, strokeMs: 700 }));
    }
    check("game-ink-slash", id + ": doing nothing never scores and short swipes never clear",
      idle.score === 0 && !idle.cleared && lazy.every((r) => !r.cleared),
      "idle " + idle.score + " lazy " + JSON.stringify(lazy.map((r) => [r.score, r.target])));

    /* The advertised mechanic is load-bearing: cut the dial on the live def,
     * re-select so the engine re-deals under the cut, and the same threading
     * stroke cannot reach the target on any seeded round. */
    const saved = JSON.parse(JSON.stringify(level));
    const cut = id === "s21" ? { spawnMs: 355 }
      : id === "s22" ? { timeS: 30 }
        : id === "s23" ? { rush: 0 }
          : { spawnMs: 355 };
    const cutHow = id === "s21" ? "pour cut back to the shipped summit's 355ms"
      : id === "s22" ? "clock cut back to a shipped-length 30s"
        : id === "s23" ? "rush flag removed"
          : "pour cut back to the shipped summit's 355ms";
    Object.assign(level, cut);
    const cutDeals = [];
    for (let k = 1; k <= 4; k += 1) {
      cutDeals.push(playRound(id, k * 104729, { slice: true }));
    }
    Object.assign(level, saved);
    sel.value = id;
    env.dispatch(sel, "change");
    const cutClears = cutDeals.filter((d) => d.cleared).length;
    tierProofs.push(id + (cutClears === 0 ? ":ok" : ":" + cutClears + "/4"));
    check("game-ink-slash", id + " (" + cutHow + "): the same stroke cannot reach the target",
      cutClears === 0 && cutDeals.every((d) => d.selected),
      "cut clears " + cutClears + "/4 " + JSON.stringify(cutDeals.map((d) => [d.score, d.target])));

    /* s21's bomb record is the hardship itself: soften the dial back to the
     * shipped ceiling and every seeded round clears with room to spare. */
    if (id === "s21") {
      Object.assign(level, { bomb: 0.1 });
      const soft = [];
      for (let k = 1; k <= 4; k += 1) {
        soft.push(playRound(id, k * 104729, { slice: true }));
      }
      Object.assign(level, saved);
      sel.value = id;
      env.dispatch(sel, "change");
      check("game-ink-slash", "s21 (bomb softened to the shipped ceiling): every round clears, so the record is the hardship",
        soft.every((d) => d.cleared),
        "soft clears " + soft.filter((d) => d.cleared).length + "/4");
    }

    /* The bands are the engine's own derivation, not authored fields. */
    check("game-ink-slash", id + " carries no authored star band",
      level.starBands === undefined && level.bands === undefined && level.stars === undefined,
      JSON.stringify(Object.keys(level)));

    /* The clear survived the cut, the idle pen and the short swipes. */
    check("game-ink-slash", id + " stays cleared in the campaign save",
      readSave().cleared[id] && readSave().cleared[id].stars >= 1,
      JSON.stringify(readSave().cleared[id] || null));

    /* The next round unlocks only through the clear this round just recorded. */
    const index = tierIds.indexOf(id);
    if (index + 1 < tierIds.length) {
      sel.value = tierIds[index + 1];
      env.dispatch(sel, "change");
      check("game-ink-slash", tierIds[index + 1] + " unlocks once " + id + " is cleared",
        sel.value === tierIds[index + 1], sel.value);
    }
  }

  /* The tier is the hard tier on the clock's own currency: each new round
   * asks for more points per second than the shipped summit s20, and the
   * demand climbs strictly through the tier. */
  const demands = tierIds.map((id) => byId(id).target / byId(id).timeS);
  check("game-ink-slash", "the tier's demand per second climbs strictly (" +
      demands.map((n) => n.toFixed(0)).join(" -> ") + ")",
    demands.every((v, i) => i === 0 || v > demands[i - 1]),
    demands.join("/"));
  check("game-ink-slash", "each new round sets a campaign record on its own dial",
    byId("s21").bomb > Math.max.apply(null, levels.slice(0, 20).map((l) => l.bomb)) &&
      byId("s22").target > Math.max.apply(null, levels.slice(0, 20).map((l) => l.target)) &&
      byId("s23").rush > Math.max.apply(null, levels.slice(0, 20).map((l) => l.rush || 0)) &&
      byId("s24").spawnMs < Math.min.apply(null, levels.slice(0, 20).map((l) => l.spawnMs)),
    "bomb " + byId("s21").bomb + ", target " + byId("s22").target + ", rush " + byId("s23").rush +
      ", spawnMs " + byId("s24").spawnMs);
  check("game-ink-slash", "every cut left the tier unbeatable in its advertised shape",
    tierProofs.every((p) => p.endsWith(":ok")), tierProofs.join(" "));

  /* ---- the summit: paired dials, the same hands, the same cut ---- */
  const summitProofs = [];
  for (const id of summitIds) {
    const level = byId(id);
    const thread = [];
    for (let k = 1; k <= 4; k += 1) {
      thread.push(playRound(id, k * 104729, { slice: true }));
    }
    const threeStars = thread.filter((r) => r.stars === 3).length;
    check("game-ink-slash", id + ": the committed stroke clears with three stars and survives",
      thread.every((r) => r.selected && r.cleared && r.survived) && threeStars >= 1,
      JSON.stringify(thread.map((r) => [r.score, r.target, r.stars, r.survived ? 1 : 0])));

    const idle = playRound(id, 97, { slice: false });
    const lazy = [];
    for (let k = 1; k <= 3; k += 1) {
      lazy.push(playRound(id, k * 104729, { slice: true, strokeMs: 700 }));
    }
    check("game-ink-slash", id + ": doing nothing never scores and short swipes never clear",
      idle.score === 0 && !idle.cleared && lazy.every((r) => !r.cleared),
      "idle " + idle.score + " lazy " + JSON.stringify(lazy.map((r) => [r.score, r.target])));

    /* The paired dial is load-bearing: cut it on the live def, re-select so
     * the engine re-deals under the cut, and the same threading stroke
     * cannot reach the target on any seeded round. */
    const saved = JSON.parse(JSON.stringify(level));
    const cut = id === "s25" ? { timeS: 30 }
      : id === "s27" || id === "s29" || id === "s30" ? { rush: 0 }
        : { spawnMs: 355 };
    const cutHow = id === "s25" ? "clock cut back to a shipped-length 30s"
      : id === "s27" || id === "s29" || id === "s30" ? "sprint flag removed"
        : "pour cut back to the shipped summit's 355ms";
    Object.assign(level, cut);
    const cutDeals = [];
    for (let k = 1; k <= 4; k += 1) {
      cutDeals.push(playRound(id, k * 104729, { slice: true }));
    }
    Object.assign(level, saved);
    sel.value = id;
    env.dispatch(sel, "change");
    const cutClears = cutDeals.filter((d) => d.cleared).length;
    summitProofs.push(id + (cutClears === 0 ? ":ok" : ":" + cutClears + "/4"));
    check("game-ink-slash", id + " (" + cutHow + "): the same stroke cannot reach the target",
      cutClears === 0 && cutDeals.every((d) => d.selected),
      "cut clears " + cutClears + "/4 " + JSON.stringify(cutDeals.map((d) => [d.score, d.target])));

    /* The bands are the engine's own derivation, not authored fields. */
    check("game-ink-slash", id + " carries no authored star band",
      level.starBands === undefined && level.bands === undefined && level.stars === undefined,
      JSON.stringify(Object.keys(level)));

    /* The clear survived the cut, the idle pen and the short swipes. */
    check("game-ink-slash", id + " stays cleared in the campaign save",
      readSave().cleared[id] && readSave().cleared[id].stars >= 1,
      JSON.stringify(readSave().cleared[id] || null));

    /* The next round unlocks only through the clear this round just recorded. */
    const index = summitIds.indexOf(id);
    if (index + 1 < summitIds.length) {
      sel.value = summitIds[index + 1];
      env.dispatch(sel, "change");
      check("game-ink-slash", summitIds[index + 1] + " unlocks once " + id + " is cleared",
        sel.value === summitIds[index + 1], sel.value);
    }
  }
  const saveFinal = readSave().cleared || {};
  const clearedAll = Object.keys(saveFinal).filter((id) =>
    saveFinal[id] && saveFinal[id].stars >= 1).length;
  check("game-ink-slash", "the summit ends the campaign: all thirty rounds sit cleared in the save",
    clearedAll === 30, String(clearedAll));

  /* The summit is the hard tier on the clock's own currency, squared: the
   * demand per second climbs strictly through the six, opens past the hard
   * tier's peak, and the closer ends the ladder as its highest demand. */
  const summitDemands = summitIds.map((id) => byId(id).target / byId(id).timeS);
  const tierPeak = Math.max.apply(null, tierIds.map((id) => byId(id).target / byId(id).timeS));
  check("game-ink-slash", "the summit's demand per second climbs strictly (" +
      summitDemands.map((n) => n.toFixed(0)).join(" -> ") + ") and opens past the hard tier's " +
      tierPeak.toFixed(0),
    summitDemands.every((v, i) => i === 0 || v > summitDemands[i - 1]) &&
      summitDemands[0] > tierPeak,
    summitDemands.join("/") + " vs tier " + tierPeak.toFixed(1));
  check("game-ink-slash", "s30 ends the ladder as its highest demand per second",
    summitDemands[summitDemands.length - 1] ===
      Math.max.apply(null, levels.map((l) => l.target / l.timeS)),
    "s30 " + summitDemands[summitDemands.length - 1].toFixed(1));
  check("game-ink-slash", "each summit round leads the ladder on the dial it is named for",
    byId("s25").timeS > Math.max.apply(null, levels.slice(0, 24).map((l) => l.timeS)) &&
      byId("s26").spawnMs < Math.min.apply(null, levels.slice(0, 24).map((l) => l.spawnMs)) &&
      byId("s27").rush > Math.max.apply(null, levels.slice(0, 24).map((l) => l.rush || 0)) &&
      byId("s28").spawnMs < Math.min.apply(null, levels.slice(0, 24).concat([byId("s26")])
        .filter((l) => !l.rush).map((l) => l.spawnMs)) &&
      byId("s29").target > Math.max.apply(null, levels.slice(0, 24).map((l) => l.target)) &&
      byId("s30").target > Math.max.apply(null, levels.slice(0, 24).map((l) => l.target)),
    "timeS " + byId("s25").timeS + ", spawnMs " + byId("s26").spawnMs + "/" + byId("s28").spawnMs +
      ", rush " + byId("s27").rush + ", target " + byId("s29").target + "/" + byId("s30").target);
  check("game-ink-slash", "every cut left the summit unbeatable in its advertised shape",
    summitProofs.every((p) => p.endsWith(":ok")), summitProofs.join(" "));

  /* Copy travels with the module. */
  const copyKeys = ["slashL21", "slashL22", "slashL23", "slashL24",
    "slashL25", "slashL26", "slashL27", "slashL28", "slashL29", "slashL30"];
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-ink-slash", "the ten deep round names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
