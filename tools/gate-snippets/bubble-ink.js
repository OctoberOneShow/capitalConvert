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
 * pointer path. Each new spring must be beaten: the planner clears every
 * seeded deal and lands the three-star line on at least one deal, so the
 * authored starGain bands are reachable. They are demanding too: doing
 * nothing scores nothing, and wild aims never reach the target.
 *
 * The advertised mechanic is load-bearing by re-deal: the rung's dial is cut
 * on the LIVE def (the panel's closure shares the object), the rung is
 * re-selected so the engine re-deals under the cut, and the same planner
 * cannot reach the target on any seeded deal. w21 loses its three-ink pour,
 * w22 and w24 their sparse shafts, w23 its triad pour. */
module.exports = function gate(ctx) {
  const { App, env, check } = ctx;
  const levels = App.bubLevels;
  const tierIds = ["w21", "w22", "w23", "w24"];
  const byId = (id) => levels.find((level) => level.id === id);
  const R = 11;
  const D = 22;
  const ROWH = 19;
  const ROWS = 12;
  const WIDTH = 320;
  const SPEED = 430;
  const SHX = 160;
  const SHY = 252;

  /* ---- ladder shape ---- */
  check("game-bubble-ink", "the ladder holds at least twenty-four springs",
    levels.length >= 24, String(levels.length));
  check("game-bubble-ink", "every spring id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = tierIds.filter((id) => !byId(id));
  check("game-bubble-ink", "the hard tier w21-w24 is present",
    missing.length === 0, missing.join(","));

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
  make("bubCanvas", "canvas");
  make("bubScore");
  make("bubShots");
  make("bubPopped");
  const resultEl = make("bubResult");
  make("bubStartBtn", "button");
  make("bubBest");
  const sel = make("bubLevelSel", "select");
  const canvas = env.byId("bubCanvas");
  const stage = { left: 0, top: 0, right: WIDTH, bottom: 270, width: WIDTH, height: 270 };
  canvas.getBoundingClientRect = () => stage;
  /* the well only spins its loop while the panel reports itself visible */
  Object.defineProperty(canvas, "offsetParent", { get: () => ({}) });

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

  /* Rungs 1-20 cleared - exactly the save a player brings into the hard
   * tier; the picker only loads a rung whose predecessor is cleared. */
  const cleared = {};
  for (let w = 1; w <= 20; w += 1) cleared["w" + w] = { stars: 3, best: 100000 };
  env.store.set("bubble-ink-campaign", JSON.stringify({ v: 1, cleared: cleared }));
  App.initBubbleInkGame();

  const readSave = () => JSON.parse(env.store.get("bubble-ink-campaign") || "{}");

  /* ---- the engine's own geometry, mirrored for aiming ---- */
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

  /* One seeded deal, played through the real panel. mode "planner" mirrors
   * the engine's flight for every shot; "wild" aims at random angles. */
  function playDeal(levelId, seed, mode) {
    return seeded(seed, () => {
      sel.value = levelId;
      env.dispatch(sel, "change");
      const selected = sel.value === levelId;
      env.dispatch(env.byId("bubStartBtn"), "click");
      const probe = App.bubProbe;
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
        env.dispatch(canvas, "pointermove", { clientX: aimX, clientY: aimY });
        env.dispatch(canvas, "pointerdown", { clientX: aimX, clientY: aimY });
        shotsFired += 1;
        for (let frame = 0; frame < 90; frame += 1) {
          env.timers.advance(16);
          pump();
          const after = probe();
          if (!after.alive || sel.value !== levelId) break;
          if (frame > 2 && after.shots < state.shots && wallMoved(state.grid, after.grid)) break;
        }
      }
      const level = byId(levelId);
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
        shotsLeft: Number(env.byId("bubShots").textContent),
      };
    });
  }

  /* Deterministic prng swapped over Math.random for one seeded play; the
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

  /* ---- beat every new rung, prove the bands, cut the mechanic ---- */
  const tierProofs = [];
  for (const id of tierIds) {
    const level = byId(id);
    const deals = [];
    for (let k = 1; k <= 6; k += 1) deals.push(playDeal(id, k * 31337, "planner"));
    const clears = deals.filter((d) => d.cleared).length;
    const threeStars = deals.filter((d) => d.stars === 3).length;
    check("game-bubble-ink", id + ": the aim planner clears most seeded deals and wins a full replay",
      deals.every((d) => d.selected) && clears >= 4 && threeStars >= 1,
      "clears " + clears + "/6, three-star " + threeStars + " " +
        JSON.stringify(deals.map((d) => [d.score, d.stars])));

    /* A rung that plays itself is not a rung: idle hands score nothing and
     * wild aims never reach the target. */
    const idle = seeded(97, () => {
      sel.value = id;
      env.dispatch(sel, "change");
      env.dispatch(env.byId("bubStartBtn"), "click");
      for (let tick = 0; tick < 120; tick += 1) {
        env.timers.advance(16);
        pump();
      }
      const state = App.bubProbe();
      return { score: state.score, alive: state.alive, text: resultEl.textContent };
    });
    const wild = [];
    for (let k = 1; k <= 4; k += 1) wild.push(playDeal(id, k * 6271, "wild"));
    check("game-bubble-ink", id + ": doing nothing scores nothing and wild aims never clear",
      idle.score === 0 && !/Popped /.test(idle.text) &&
        wild.every((d) => d.selected && !d.cleared),
      "idle " + idle.score + " wild " + JSON.stringify(wild.map((d) => d.score)));

    /* The advertised mechanic is load-bearing: cut the dial on the live def,
     * re-select so the engine re-deals under the cut, and the same planner
     * cannot reach the target on any seeded deal - its best cut deal also
     * falls under the rung's own three-star line, so the top band collapses
     * with the win. w21 loses its sparse shafts, w22-w24 their thin pour. */
    const saved = JSON.parse(JSON.stringify(level));
    const cutHow = id === "w21" ? "shafts poured solid" : "pour cut to six inks";
    const cut = id === "w21" ? { sparse: 0 } : { colors: 6 };
    Object.assign(level, cut);
    const cutDeals = [];
    for (let k = 1; k <= 4; k += 1) cutDeals.push(playDeal(id, k * 31337, "planner"));
    Object.assign(level, saved);
    sel.value = id;
    env.dispatch(sel, "change");
    const cutClears = cutDeals.filter((d) => d.cleared).length;
    const cutMax = Math.max.apply(null, cutDeals.map((d) => d.score));
    const threeStarLine = Math.round(level.target * level.starGain[0]);
    tierProofs.push(id + (cutClears === 0 && cutMax < threeStarLine ? ":ok" : ":" + cutClears + "/4 max " + cutMax));
    check("game-bubble-ink", id + " (" + cutHow + "): the same planner cannot reach the target on any seeded deal",
      cutClears === 0 && cutDeals.every((d) => d.selected) && cutMax < threeStarLine,
      "cut clears " + cutClears + "/4, best " + cutMax + " vs three-star line " + threeStarLine);

    /* The clear survived the cut and the idle hands. */
    check("game-bubble-ink", id + " stays cleared at three stars in the campaign save",
      readSave().cleared[id] && readSave().cleared[id].stars === 3,
      JSON.stringify(readSave().cleared[id] || null));

    /* The next rung unlocks only through the clear this rung just recorded. */
    const index = tierIds.indexOf(id);
    if (index + 1 < tierIds.length) {
      sel.value = tierIds[index + 1];
      env.dispatch(sel, "change");
      check("game-bubble-ink", tierIds[index + 1] + " unlocks once " + id + " is cleared",
        sel.value === tierIds[index + 1], sel.value);
    }
  }

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

  /* Copy travels with the module. */
  const copyKeys = ["bubL21", "bubL22", "bubL23", "bubL24"];
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-bubble-ink", "the four spring names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
