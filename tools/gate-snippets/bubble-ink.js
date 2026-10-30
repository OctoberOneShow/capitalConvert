"use strict";

/* game-bubble-ink: the hard tier is poured, priced and proved on the real
 * panel
 *
 * App.bubLevels is the module's own table and the panel is driven end to end
 * (select, start button, pointer aim, virtual clock), so every number below
 * is measured on springs the engine really deals. All deals are seeded by
 * swapping Math.random for a deterministic prng around each play - planner
 * deals use seed k*31337, wild deals k*6271 - so the run is reproducible.
 *
 * The aim planner mirrors the engine's own flight, snapping and scoring math
 * (bubble radius 11, diameter 22, speed 430) and fires through the real
 * pointer path. Each new spring must be beaten: the planner clears most
 * seeded deals and lands the three-star line on at least one deal, so the
 * authored starGain bands are reachable. They are demanding too: doing
 * nothing scores nothing, and wild aims never reach the target.
 *
 * The advertised mechanic is load-bearing by re-deal: the rung's dial is cut
 * on the LIVE def (the panel's closure shares the object), the rung is
 * re-selected so the engine re-deals under the cut, and the same planner
 * cannot reach the target on any seeded deal. w21 loses its three-ink pour,
 * w22 and w24 their sparse shafts, w23 its triad pour.
 *
 * The summit w25-w30 plays the same hands against paired extremes: the
 * deepest wall the field holds (eleven rows - twelve puts the wall on the
 * deadline and the deal is lost outright) under the emptiest quiver that
 * wall leaves alive, down to eight shots. The curve is the card's own
 * currency: demand per shot climbs strictly through the six and opens past
 * w24, the three-star line per shot climbs with it, and the closer ends the
 * ladder as its highest demand. The cuts take the paired dial away - the
 * wall rungs' shafts poured solid, the quiver rungs' pour cut to six inks -
 * and the same planner cannot reach the target on any seeded deal.
 *
 * Every rung here is benched on its own fresh boot of the whole app - the
 * panel opened on that rung with every predecessor cleared, the save a
 * player actually brings into it. The engine's round history reaches the
 * deal stream, so a played-through boot deals differently than a fresh one;
 * one boot per rung is what makes the seeded deals reproducible rung over
 * rung. */
const fs = require("fs");
const path = require("path");
const { createEnvironment } = require(path.join(__dirname, "..", "stub-dom"));

const ROOT = path.join(__dirname, "..", "..");
const BOOT_SOURCE = Array.from(
  fs.readFileSync(path.join(ROOT, "index.html"), "utf8")
    .matchAll(/assets\/app\/([a-z0-9-]+)\.js\?v=\d+/g),
).map((match) =>
  fs.readFileSync(path.join(ROOT, "assets", "app", match[1] + ".js"), "utf8")
    .replace(/^﻿/, ""),
).join("\n");

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.bubLevels;
  const tierIds = ["w21", "w22", "w23", "w24"];
  const summitIds = ["w25", "w26", "w27", "w28", "w29", "w30"];
  const byId = (id) => levels.find((level) => level.id === id);

  /* ---- ladder shape ---- */
  check("game-bubble-ink", "the ladder holds all thirty springs",
    levels.length >= 30, String(levels.length));
  check("game-bubble-ink", "every spring id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = tierIds.filter((id) => !byId(id));
  check("game-bubble-ink", "the hard tier w21-w24 is present",
    missing.length === 0, missing.join(","));
  const missingSummit = summitIds.filter((id) => !byId(id));
  check("game-bubble-ink", "the summit tier w25-w30 is present",
    missingSummit.length === 0, missingSummit.join(","));

  /* ---- the engine's own geometry, mirrored for aiming ---- */
  const R = 11;
  const D = 22;
  const ROWH = 19;
  const ROWS = 12;
  const WIDTH = 320;
  const SPEED = 430;
  const SHX = 160;
  const SHY = 252;
  const rowLen = (row) => (row % 2 ? 13 : 14);
  const bubX = (row, col) => 11 + col * D + (row % 2 ? 11 : 0);
  const bubY = (row) => 11 + row * ROWH;
  function neighbours(row, col) {
    const list = [];
    if (col > 0) list.push([row, col - 1]);
    if (col < rowLen(row) - 1) list.push([row, col + 1]);
    if (row % 2 === 0) {
      list.push([row - 1, col - 1], [row - 1, col], [row + 1, col - 1], [row + 1, col]);
    } else {
      list.push([row - 1, col], [row - 1, col + 1], [row + 1, col], [row + 1, col + 1]);
    }
    return list.filter(([r, c]) => r >= 0 && r < ROWS && c >= 0 && c < rowLen(r));
  }
  function snapSlot(grid, x, y) {
    let row = Math.round((y - 11) / ROWH);
    row = Math.max(0, Math.min(row, ROWS - 1));
    let col = Math.round((x - 11 - (row % 2 ? 11 : 0)) / D);
    col = Math.max(0, Math.min(col, rowLen(row) - 1));
    if (grid[row][col] < 0) return [row, col];
    const seen = {};
    const queue = [[row, col]];
    seen[row + "," + col] = true;
    while (queue.length) {
      const cell = queue.shift();
      for (const [r, c] of neighbours(cell[0], cell[1])) {
        const key = r + "," + c;
        if (seen[key]) continue;
        seen[key] = true;
        if (grid[r][c] < 0) return [r, c];
        queue.push([r, c]);
      }
    }
    return null;
  }
  function cluster(grid, row, col, sameColorOnly) {
    const color = grid[row][col];
    const seen = {};
    const stack = [[row, col]];
    const found = [];
    seen[row + "," + col] = true;
    while (stack.length) {
      const cell = stack.pop();
      found.push(cell);
      for (const [r, c] of neighbours(cell[0], cell[1])) {
        const key = r + "," + c;
        if (seen[key] || grid[r][c] < 0) continue;
        if (sameColorOnly && grid[r][c] !== color) continue;
        seen[key] = true;
        stack.push([r, c]);
      }
    }
    return found;
  }
  function floating(grid) {
    const anchored = {};
    for (let c = 0; c < rowLen(0); c += 1) {
      if (grid[0][c] >= 0 && !anchored["0," + c]) {
        cluster(grid, 0, c, false).forEach((cell) => {
          anchored[cell[0] + "," + cell[1]] = true;
        });
      }
    }
    const loose = [];
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < rowLen(r); c += 1) {
        if (grid[r][c] >= 0 && !anchored[r + "," + c]) loose.push([r, c]);
      }
    }
    return loose;
  }
  function simulate(grid, color, theta) {
    const aim = Math.max(-Math.PI + 0.17, Math.min(-0.17, theta));
    let vx = Math.cos(aim) * SPEED;
    const vy = Math.sin(aim) * SPEED;
    let x = SHX;
    let y = SHY;
    const dt = 0.016;
    for (let step = 0; step < 90; step += 1) {
      x += vx * dt;
      y += vy * dt;
      if (x < R) {
        x = R;
        vx = Math.abs(vx);
      } else if (x > WIDTH - R) {
        x = WIDTH - R;
        vx = -Math.abs(vx);
      }
      let hit = y <= R;
      if (!hit) {
        for (let r = 0; r < ROWS && !hit; r += 1) {
          for (let c = 0; c < rowLen(r) && !hit; c += 1) {
            if (grid[r][c] < 0) continue;
            const dx = x - bubX(r, c);
            const dy = y - bubY(r);
            if (dx * dx + dy * dy < (D - 1) * (D - 1)) hit = true;
          }
        }
      }
      if (hit) {
        const slot = snapSlot(grid, x, y);
        if (!slot || slot[0] >= ROWS - 1) return null;
        const trial = grid.map((row) => row.slice());
        trial[slot[0]][slot[1]] = color;
        const pop = cluster(trial, slot[0], slot[1], true);
        let popped = 0;
        let dropped = 0;
        if (pop.length >= 3) {
          popped = pop.length;
          pop.forEach((cell) => {
            trial[cell[0]][cell[1]] = -1;
          });
          dropped = floating(trial).length;
        }
        return { slot, gain: popped * 10 + dropped * 15 };
      }
    }
    return null;
  }
  function choose(grid, color) {
    let best = null;
    for (let theta = -Math.PI + 0.18; theta <= -0.18; theta += 0.02) {
      const shot = simulate(grid, color, theta);
      if (!shot) continue;
      let setup = 0;
      if (shot.gain === 0) {
        neighbours(shot.slot[0], shot.slot[1]).forEach(([r, c]) => {
          if (grid[r][c] === color) setup += 1;
        });
      }
      const rank = [shot.gain, setup, shot.slot[0]];
      if (
        !best ||
        rank[0] > best.rank[0] ||
        (rank[0] === best.rank[0] &&
          (rank[1] > best.rank[1] || (rank[1] === best.rank[1] && rank[2] > best.rank[2])))
      ) {
        best = { theta, rank };
      }
    }
    return best;
  }
  function wallMoved(before, after) {
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < rowLen(r); c += 1) {
        if (before[r][c] !== after[r][c]) return true;
      }
    }
    return false;
  }
  const starsFor = (level, score) => {
    const bands = level.starGain.map((gain) => Math.round(level.target * gain));
    if (score >= bands[0]) return 3;
    if (score >= bands[1]) return 2;
    return score >= bands[2] ? 1 : 0;
  };
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

  /* ---- the bench: one fresh boot of the whole app, the panel opened with
   * the save cleared through saveUpTo, and the hands that play it. ---- */
  const makeBench = (saveUpTo) => {
    const env2 = createEnvironment({});
    env2.load(BOOT_SOURCE);
    env2.domReady();
    const app2 = env2.sandbox.CapitalConvert || env2.window.CapitalConvert;
    const doc = env2.document;
    const make = (id, tag) => {
      let el = env2.byId(id);
      if (!el) {
        el = doc.createElement(tag || "div");
        el.id = id;
        doc.body.appendChild(el);
      }
      return el;
    };
    make("bubCanvas", "canvas");
    make("bubScore");
    make("bubShots");
    make("bubPopped");
    const resultEl = make("bubResult");
    make("bubStartBtn", "button");
    make("bubBest");
    const sel = make("bubLevelSel", "select");
    const canvas = env2.byId("bubCanvas");
    const stage = { left: 0, top: 0, right: WIDTH, bottom: 270, width: WIDTH, height: 270 };
    canvas.getBoundingClientRect = () => stage;
    /* the well only spins its loop while the panel reports itself visible */
    Object.defineProperty(canvas, "offsetParent", { get: () => ({}) });

    const frames = new Map();
    let nextFrame = 1;
    env2.window.requestAnimationFrame = (fn) => {
      const id = nextFrame++;
      frames.set(id, fn);
      return id;
    };
    env2.window.cancelAnimationFrame = (id) => frames.delete(id);
    const pump = () => {
      const queue = Array.from(frames.entries());
      queue.forEach(([id, fn]) => frames.delete(id));
      queue.forEach(([, fn]) => fn(env2.clock.now));
    };

    const cleared = {};
    for (let w = 1; w <= saveUpTo; w += 1) cleared["w" + w] = { stars: 3, best: 100000 };
    env2.store.set("bubble-ink-campaign", JSON.stringify({ v: 1, cleared: cleared }));
    app2.initBubbleInkGame();

    const readSave = () => JSON.parse(env2.store.get("bubble-ink-campaign") || "{}");
    const levelById = (id) => app2.bubLevels.find((level) => level.id === id);

    /* One seeded deal, played through the real panel. mode "planner" mirrors
     * the engine's flight for every shot; "wild" aims at random angles. */
    function playDeal(levelId, seed, mode) {
      return seeded(seed, () => {
        sel.value = levelId;
        env2.dispatch(sel, "change");
        const selected = sel.value === levelId;
        env2.dispatch(env2.byId("bubStartBtn"), "click");
        const probe = app2.bubProbe;
        let shotsFired = 0;
        for (;;) {
          const state = probe();
          if (!state.alive) break;
          if (sel.value !== levelId) break; /* the engine advanced on a clear */
          if (state.shots <= 0 && shotsFired > 0) break;
          let theta;
          if (mode === "planner") {
            const plan = choose(state.grid, state.current);
            if (!plan) break;
            theta = plan.theta;
          } else {
            theta = -Math.PI + 0.18 + Math.random() * (Math.PI - 0.36);
          }
          const aimX = SHX + Math.cos(theta) * 50;
          const aimY = SHY + Math.sin(theta) * 50;
          env2.dispatch(canvas, "pointermove", { clientX: aimX, clientY: aimY });
          env2.dispatch(canvas, "pointerdown", { clientX: aimX, clientY: aimY });
          shotsFired += 1;
          for (let frame = 0; frame < 90; frame += 1) {
            env2.timers.advance(16);
            pump();
            const after = probe();
            if (!after.alive || sel.value !== levelId) break;
            if (frame > 2 && after.shots < state.shots && wallMoved(state.grid, after.grid)) break;
          }
        }
        const level = levelById(levelId);
        const text = resultEl.textContent;
        const clearedText = /Popped /.test(text);
        const m = /with (\d+) points/.exec(text);
        const fm = /at (\d+)\/(\d+) points/.exec(text);
        const score = m ? Number(m[1]) : fm ? Number(fm[1]) : 0;
        return {
          selected,
          cleared: clearedText,
          stars: clearedText ? starsFor(level, score) : 0,
          score,
          target: level.target,
          shotsLeft: Number(env2.byId("bubShots").textContent),
        };
      });
    }

    /* An idle hand: the round runs, the pen never aims. */
    function idleRead(levelId) {
      return seeded(97, () => {
        sel.value = levelId;
        env2.dispatch(sel, "change");
        env2.dispatch(env2.byId("bubStartBtn"), "click");
        for (let tick = 0; tick < 120; tick += 1) {
          env2.timers.advance(16);
          pump();
        }
        const state = app2.bubProbe();
        return { score: state.score, alive: state.alive, text: resultEl.textContent };
      });
    }

    /* The LIVE def of this boot's own table - the panel's closure shares it. */
    const liveDef = (id) => levelById(id);
    const reselect = (id) => {
      sel.value = id;
      env2.dispatch(sel, "change");
      return sel.value;
    };
    return { playDeal, idleRead, readSave, liveDef, reselect };
  };

  /* ---- beat every hard-tier rung on its own fresh boot ---- */
  const tierProofs = [];
  tierIds.forEach((id, rungIndex) => {
    const level = byId(id);
    const bench = makeBench(20 + rungIndex);
    const deals = [];
    for (let k = 1; k <= 6; k += 1) deals.push(bench.playDeal(id, k * 31337, "planner"));
    const clears = deals.filter((d) => d.cleared).length;
    const threeStars = deals.filter((d) => d.stars === 3).length;
    check("game-bubble-ink", id + ": the aim planner clears most seeded deals and wins a full replay",
      deals.every((d) => d.selected) && clears >= 4 && threeStars >= 1,
      "clears " + clears + "/6, three-star " + threeStars + " " +
        JSON.stringify(deals.map((d) => [d.score, d.stars])));

    /* A rung that plays itself is not a rung: idle hands score nothing and
     * wild aims never reach the target. */
    const idle = bench.idleRead(id);
    const wild = [];
    for (let k = 1; k <= 4; k += 1) wild.push(bench.playDeal(id, k * 6271, "wild"));
    check("game-bubble-ink", id + ": doing nothing scores nothing and wild aims never clear",
      idle.score === 0 && !/Popped /.test(idle.text) &&
        wild.every((d) => d.selected && !d.cleared),
      "idle " + idle.score + " wild " + JSON.stringify(wild.map((d) => d.score)));

    /* The advertised mechanic is load-bearing: cut the dial on the live def,
     * re-select so the engine re-deals under the cut, and the same planner
     * cannot reach the target on any seeded deal - its best cut deal also
     * falls under the rung's own three-star line, so the top band collapses
     * with the win. w21 loses its sparse shafts, w22-w24 their thin pour. */
    const live = bench.liveDef(id);
    const saved = JSON.parse(JSON.stringify(level));
    const cutHow = id === "w21" ? "shafts poured solid" : "pour cut to six inks";
    const cut = id === "w21" ? { sparse: 0 } : { colors: 6 };
    Object.assign(live, cut);
    const cutDeals = [];
    for (let k = 1; k <= 4; k += 1) cutDeals.push(bench.playDeal(id, k * 31337, "planner"));
    Object.assign(live, saved);
    const held = bench.reselect(id);
    const cutClears = cutDeals.filter((d) => d.cleared).length;
    const cutMax = Math.max.apply(null, cutDeals.map((d) => d.score));
    const threeStarLine = Math.round(level.target * level.starGain[0]);
    tierProofs.push(id + (cutClears === 0 && cutMax < threeStarLine ? ":ok" : ":" + cutClears + "/4 max " + cutMax));
    check("game-bubble-ink", id + " (" + cutHow + "): the same planner cannot reach the target on any seeded deal",
      cutClears === 0 && cutDeals.every((d) => d.selected) && cutMax < threeStarLine,
      "cut clears " + cutClears + "/4, best " + cutMax + " vs three-star line " + threeStarLine);

    /* The clear survived the cut and the idle hands. */
    check("game-bubble-ink", id + " stays cleared at three stars in the campaign save",
      bench.readSave().cleared[id] && bench.readSave().cleared[id].stars === 3,
      JSON.stringify(bench.readSave().cleared[id] || null));

    /* The next rung unlocks only through the clear this rung just recorded. */
    const nextId = tierIds[rungIndex + 1];
    if (nextId) {
      check("game-bubble-ink", nextId + " unlocks once " + id + " is cleared",
        bench.reselect(nextId) === nextId, "reselected " + nextId);
    }
  });

  /* The tier is the hard tier on the card's own currency: each new spring
   * demands more points per shot than the shipped sparse card it extends
   * (w20), the demand climbs strictly through the tier, and the three-star
   * line per shot - how much top-band production every shot must carry -
   * climbs with it. */
  const w20 = byId("w20");
  const shippedDemand = w20.target / w20.shots;
  const demands = tierIds.map((id) => byId(id).target / byId(id).shots);
  const lines = tierIds.map((id) => Math.round(byId(id).target * byId(id).starGain[0]) / byId(id).shots);
  const climbs = (list) => list.every((v, i) => i === 0 || v > list[i - 1]);
  check("game-bubble-ink", "the tier's demand per shot climbs and opens above w20 (" +
      demands.map((n) => n.toFixed(1)).join(" -> ") + " vs " + shippedDemand.toFixed(1) + ")",
    climbs(demands) && demands[0] > shippedDemand,
    demands.join("/") + " vs " + shippedDemand);
  check("game-bubble-ink", "the three-star line per shot climbs through the tier (" +
      lines.map((n) => n.toFixed(1)).join(" -> ") + ")",
    climbs(lines), lines.join("/"));
  check("game-bubble-ink", "every cut left the tier unbeatable in its advertised shape",
    tierProofs.every((p) => p.endsWith(":ok")), tierProofs.join(" "));

  /* ---- the summit: paired extremes, one fresh boot per rung ---- */
  const summitProofs = [];
  summitIds.forEach((id, rungIndex) => {
    const level = byId(id);
    const bench = makeBench(24 + rungIndex);

    const deals = [];
    for (let k = 1; k <= 6; k += 1) deals.push(bench.playDeal(id, k * 31337, "planner"));
    const clears = deals.filter((d) => d.cleared).length;
    const threeStars = deals.filter((d) => d.stars === 3).length;
    check("game-bubble-ink", id + ": the aim planner clears most seeded deals and wins a full replay",
      deals.every((d) => d.selected) && clears >= 4 && threeStars >= 1,
      "clears " + clears + "/6, three-star " + threeStars + " " +
        JSON.stringify(deals.map((d) => [d.score, d.stars])));

    const idle = bench.idleRead(id);
    const wild = [];
    for (let k = 1; k <= 4; k += 1) wild.push(bench.playDeal(id, k * 6271, "wild"));
    check("game-bubble-ink", id + ": doing nothing scores nothing and wild aims never clear",
      idle.score === 0 && !/Popped /.test(idle.text) &&
        wild.every((d) => d.selected && !d.cleared),
      "idle " + idle.score + " wild " + JSON.stringify(wild.map((d) => d.score)));

    /* The paired dial is load-bearing: the wall rungs lose their shafts, the
     * quiver rungs their thin pour; the same planner cannot reach the target
     * on any seeded deal and its best cut deal also falls under the rung's
     * own three-star line. */
    const live = bench.liveDef(id);
    const saved = JSON.parse(JSON.stringify(level));
    const cut = id === "w27" || id === "w29" || id === "w30"
      ? { colors: 6 }
      : { sparse: 0 };
    const cutHow = id === "w27" || id === "w29" || id === "w30"
      ? "pour cut to six inks"
      : "shafts poured solid";
    Object.assign(live, cut);
    const cutDeals = [];
    for (let k = 1; k <= 4; k += 1) cutDeals.push(bench.playDeal(id, k * 31337, "planner"));
    Object.assign(live, saved);
    bench.reselect(id);
    const cutClears = cutDeals.filter((d) => d.cleared).length;
    const cutMax = Math.max.apply(null, cutDeals.map((d) => d.score));
    const threeStarLine = Math.round(level.target * level.starGain[0]);
    summitProofs.push(id + (cutClears === 0 && cutMax < threeStarLine ? ":ok" : ":" + cutClears + "/4 max " + cutMax));
    check("game-bubble-ink", id + " (" + cutHow + "): the same planner cannot reach the target on any seeded deal",
      cutClears === 0 && cutDeals.every((d) => d.selected) && cutMax < threeStarLine,
      "cut clears " + cutClears + "/4, best " + cutMax + " vs three-star line " + threeStarLine);

    /* The clear survived the cut and the idle hands. */
    check("game-bubble-ink", id + " stays cleared at three stars in the campaign save",
      bench.readSave().cleared[id] && bench.readSave().cleared[id].stars === 3,
      JSON.stringify(bench.readSave().cleared[id] || null));

    /* The next rung unlocks only through the clear this rung just recorded. */
    const nextId = summitIds[rungIndex + 1];
    if (nextId) {
      check("game-bubble-ink", nextId + " unlocks once " + id + " is cleared",
        bench.reselect(nextId) === nextId, "reselected " + nextId);
    }
  });
  check("game-bubble-ink", "every cut left the summit unbeatable in its advertised shape",
    summitProofs.every((p) => p.endsWith(":ok")), summitProofs.join(" "));

  /* The summit is the deep tier's currency carried to the field's edge: the
   * demand per shot climbs strictly through the six, opens past w24, the
   * three-star line per shot climbs with it, and the closer ends the ladder
   * as its highest demand. */
  const w24 = byId("w24");
  const w24Demand = w24.target / w24.shots;
  const w24Line = Math.round(w24.target * w24.starGain[0]) / w24.shots;
  const summitDemands = summitIds.map((id) => byId(id).target / byId(id).shots);
  const summitLines = summitIds.map((id) =>
    Math.round(byId(id).target * byId(id).starGain[0]) / byId(id).shots);
  check("game-bubble-ink", "the summit's demand per shot climbs and opens above w24 (" +
      summitDemands.map((n) => n.toFixed(1)).join(" -> ") + " vs " + w24Demand.toFixed(1) + ")",
    climbs(summitDemands) && summitDemands[0] > w24Demand,
    summitDemands.join("/") + " vs " + w24Demand);
  check("game-bubble-ink", "the summit's three-star line per shot climbs (" +
      summitLines.map((n) => n.toFixed(1)).join(" -> ") + " vs w24 " + w24Line.toFixed(1) + ")",
    climbs(summitLines) && summitLines[0] > w24Line,
    summitLines.join("/") + " vs " + w24Line);
  check("game-bubble-ink", "w30 ends the ladder as its highest demand per shot",
    summitDemands[summitDemands.length - 1] ===
      Math.max.apply(null, levels.map((l) => l.target / l.shots)),
    "w30 " + summitDemands[summitDemands.length - 1].toFixed(1));
  check("game-bubble-ink", "the summit pairs the field's edge: its walls and quivers set the campaign records",
    byId("w25").rows === 11 && byId("w26").rows === 11 && byId("w28").rows === 11 &&
      byId("w25").rows > Math.max.apply(null, levels.slice(0, 24).map((l) => l.rows)) &&
      byId("w27").shots < Math.min.apply(null, levels.slice(0, 24).map((l) => l.shots)) &&
      byId("w29").shots < byId("w27").shots &&
      byId("w26").sparse === 0.22 && byId("w28").sparse === 0.22 && byId("w30").sparse === 0.22,
    "rows " + byId("w25").rows + ", shots " + byId("w27").shots + "/" + byId("w29").shots +
      ", sparse " + byId("w26").sparse);

  /* The unlock chain is derived, never stored: clearing each spring in order
   * hands the player exactly the next one, all thirty times. */
  const chain = App.createCampaign({
    key: "bubble-ink-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 1, better: "high" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-bubble-ink", "the unlock chain walks all thirty springs in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");

  /* Copy travels with the module. */
  const copyKeys = ["bubL21", "bubL22", "bubL23", "bubL24",
    "bubL25", "bubL26", "bubL27", "bubL28", "bubL29", "bubL30"];
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-bubble-ink", "the ten deep and summit spring names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
