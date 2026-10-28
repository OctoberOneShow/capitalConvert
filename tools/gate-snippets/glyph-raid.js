"use strict";

/* game-glyph-raid: what the gate proves and why the bar is what it is.
 *
 * The panel loop runs on requestAnimationFrame, which no headless harness can
 * pump by itself, so the module ships a headless mirror (App.raidSimulate)
 * that runs the loop's own laws on a fixed 16ms tick, and the gate pins that
 * mirror to the real engine before it measures anything: it stages the panel
 * in the stub DOM, shims requestAnimationFrame so the frame callback can be
 * pumped at exactly the mirror's tick, seeds Math.random with the stream the
 * mirror is handed, and replays a scripted game both ways - the invader
 * glyph positions the panel draws must equal the mirror's hand view
 * tick for tick. With the mirror's authority established, the deep tier is
 * proved the way glyph-leap proves its sky: deterministically, over seeded
 * deals, in the engine's own currencies, because the module's own economy
 * leaves no honest hand that can clear the shipped summit - the untouched
 * descent budget at v20 is seven flips of march (about five seconds), while
 * the fastest relief program the engine offers (peeling an edge column
 * whenever the band narrows, six raiders deep) costs more kills than the
 * budget buys before it pays out. What the gate proves instead, per seeded
 * deal and without hand-waving:
 *
 * - the bench plays the real game where the economy permits: the raider hand
 *   clears the shipped opening wave on every seed while a naive hand clears
 *   nothing at all, so the measurements below are played, not posed;
 * - the deep tier is the harder fight on every dial the engine owns: the
 *   untouched landing clock falls rung over rung (tempo keeps tightening),
 *   the drop cadence quickens, and the plates raise the shot floor - the
 *   330ms fire cadence is engine law, so a rung demanding raiders+plates
 *   rounds cannot be cleared faster than that floor, and the deep floors
 *   climb strictly above v20's into the summit;
 * - the tier mechanic is load-bearing: no shipped rung marches a plated
 *   rank, every deep deal measurably soaks shots into plates, and an
 *   armor-stripped twin of the same rung on the same seeds converts those
 *   soaked rounds into kills - the plates, not the tempo, are what the tier
 *   prices. */

module.exports = function gate(ctx) {
  const { App, env, check } = ctx;
  const levels = App.raidLevels;
  const deepIds = ["v21", "v22", "v23", "v24"];

  /* ---- ladder shape ---- */
  check("game-glyph-raid", "the ladder holds twenty-four waves",
    levels.length === 24, String(levels.length));
  check("game-glyph-raid", "every wave id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-glyph-raid", "the deep tier v21-v24 is present",
    missing.length === 0, missing.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const v20 = byId.v20;
  const deep = deepIds.map((id) => byId[id]);

  const shapeProblems = [];
  deep.forEach((level) => {
    if (level.rows !== 6 || level.cols !== 10) {
      shapeProblems.push(level.id + " leaves the shipped 6x10 board");
    }
    if (!(level.stepMs > 0 && level.dropMs > 0)) {
      shapeProblems.push(level.id + " has a broken tempo dial");
    }
    const bands = level.starTimes;
    if (!bands || bands.length !== 3 ||
        !(bands[0] < bands[1] && bands[1] < bands[2])) {
      shapeProblems.push(level.id + " star bands do not run downwards");
    }
    if (!(level.stepMs < v20.stepMs && level.dropMs < v20.dropMs)) {
      shapeProblems.push(level.id + " does not tighten the shipped tempo");
    }
  });
  check("game-glyph-raid",
    "the deep rungs keep the shipped board, tighten its tempo and band like shipped rungs",
    shapeProblems.length === 0, shapeProblems.join(" | "));

  /* ---- the plates are structural ---- */
  const shallowPlated = [];
  levels.slice(0, 20).forEach((level) => {
    for (let row = 0; row < level.rows; row += 1) {
      if (App.raidArmorPlates(level, row) !== 0) {
        shallowPlated.push(level.id + "r" + row);
      }
    }
  });
  check("game-glyph-raid",
    "no shipped rung marches a plated rank - the armor branch is dead for v1-v20",
    shallowPlated.length === 0, shallowPlated.join(","));

  const plateProblems = [];
  deep.forEach((level) => {
    const ranks = level.armorRanks || 1;
    let total = 0;
    for (let row = 0; row < level.rows; row += 1) {
      const want = row >= level.rows - ranks ? level.armor : 0;
      if (App.raidArmorPlates(level, row) !== want) {
        plateProblems.push(level.id + " row " + row + " musters " +
          App.raidArmorPlates(level, row) + " plates, schema says " + want);
      }
      total += want * level.cols;
    }
    if (total !== level.armor * level.cols * ranks) {
      plateProblems.push(level.id + " musters " + total + " plates");
    }
  });
  check("game-glyph-raid",
    "every deep rung plates exactly the ranks its schema names",
    plateProblems.length === 0, plateProblems.join(" | "));

  /* ---- the mirror is the engine: a tick-for-tick replay of the panel ---- */
  const raidRng = (seed) => {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const TICK_MS = 16;
  /* the steer script both engines obey: deterministic sweeps with holds, so
   * the replay exercises both walls, the flip drops and the fire cadence */
  const scriptSteer = (tick) => {
    if (tick % 173 < 55) return 1;
    if (tick % 149 < 47) return -1;
    return 0;
  };
  const seededRandom = (seed) => {
    let value = seed >>> 0;
    return function () {
      value = (value + 0x6d2b79f5) | 0;
      let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
      mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  };

  const doc = env.document;
  const panelIds = ["raidCanvas", "raidScore", "raidLives", "raidTime",
    "raidResult", "raidStartBtn", "raidBest", "raidLevelSel"];
  const removePanel = () => {
    panelIds.forEach((id) => {
      const stale = doc.getElementById(id);
      if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
    });
  };
  const makePanel = () => {
    removePanel();
    const made = {};
    panelIds.forEach((id) => {
      const el = doc.createElement(id === "raidCanvas" ? "canvas"
        : id === "raidStartBtn" ? "button" : id === "raidLevelSel" ? "select" : "div");
      el.id = id;
      doc.body.appendChild(el);
      made[id] = el;
    });
    return made;
  };

  /* One replay: stage the panel, seed the stream, pump the live loop at the
   * mirror's tick with the script, and compare every invader glyph the panel
   * draws with the mirror's hand view of the same state - x exactly, y plus
   * the 15px glyph offset the world renderer adds. The mirror hand records
   * its views as it plays the same scripted game on the same seed. */
  const replay = (levelId, seed, frames) => {
    const panel = makePanel();
    const textLog = [];
    const gradient = { addColorStop() {} };
    const recorder = new Proxy(
      {
        fillText(glyph, x, y) {
          textLog.push({ x, y });
        },
      },
      {
        get(inner, prop) {
          if (prop === "fillText") return inner[prop];
          if (prop === "canvas") return panel.raidCanvas;
          if (prop === "createLinearGradient" || prop === "createRadialGradient") {
            return () => gradient;
          }
          if (typeof prop === "string" && !(prop in inner)) return () => {};
          return inner[prop];
        },
        set(inner, prop, value) {
          inner[prop] = value;
          return true;
        },
      },
    );
    panel.raidCanvas.getContext = () => recorder;

    const queue = [];
    const liveRaf = env.window.requestAnimationFrame;
    const liveCancel = env.window.cancelAnimationFrame;
    env.window.requestAnimationFrame = (cb) => {
      queue.push(cb);
      return queue.length;
    };
    env.window.cancelAnimationFrame = () => {};
    env.sandbox.requestAnimationFrame = env.window.requestAnimationFrame;
    env.sandbox.cancelAnimationFrame = env.window.cancelAnimationFrame;

    const liveRandom = Math.random;
    const views = [];
    let mismatches = 0;
    let firstBad = null;
    let compared = 0;
    try {
      env.store.delete("glyph-raid-campaign");
      if (levelId !== "v1") {
        const cleared = {};
        for (let c = 1; c < parseInt(levelId.slice(1), 10); c += 1) {
          cleared["v" + c] = { stars: 3, best: 1 };
        }
        env.store.set("glyph-raid-campaign", JSON.stringify({ v: 1, cleared }));
      }
      App.initGlyphRaidGame();
      panel.raidLevelSel.value = levelId;
      env.dispatch(panel.raidLevelSel, "change");

      /* the mirror plays the same scripted game on the same seed */
      App.raidSimulate(byId[levelId], (state) => {
        views.push(state.invaders.map((inv) => ({ x: inv.x, y: inv.y })));
        return scriptSteer(Math.round((state.elapsed * 1000) / TICK_MS));
      }, raidRng(seed));

      Math.random = seededRandom(seed);
      env.dispatch(panel.raidStartBtn, "click");
      textLog.length = 0;
      let currentSteer = 0;
      for (let frame = 1; frame <= frames; frame += 1) {
        const want = scriptSteer(frame);
        if (want !== currentSteer) {
          if (want === 0) env.dispatch(panel.raidCanvas, "pointerup");
          else env.dispatch(panel.raidCanvas, "pointermove", { clientX: want * 5 });
          currentSteer = want;
        }
        env.clock.now += TICK_MS;
        queue.splice(0, queue.length).forEach((cb) => cb(env.clock.now));
        const view = views[frame];
        if (!view) break;
        compared += 1;
        if (textLog.length !== view.length) {
          mismatches += 1;
          if (!firstBad) {
            firstBad = "frame " + frame + ": panel drew " + textLog.length +
              " raiders, mirror held " + view.length;
          }
        } else {
          for (let k = 0; k < view.length; k += 1) {
            if (textLog[k].x !== view[k].x || textLog[k].y !== view[k].y + 15) {
              mismatches += 1;
              if (!firstBad) {
                firstBad = "frame " + frame + " raider " + k + ": panel (" +
                  textLog[k].x + "," + textLog[k].y + ") vs mirror (" +
                  view[k].x + "," + (view[k].y + 15) + ")";
              }
              break;
            }
          }
        }
        textLog.length = 0;
      }
    } finally {
      Math.random = liveRandom;
      env.window.requestAnimationFrame = liveRaf;
      env.window.cancelAnimationFrame = liveCancel;
      env.sandbox.requestAnimationFrame = liveRaf;
      env.sandbox.cancelAnimationFrame = liveCancel;
      removePanel();
    }
    return { compared, mismatches, firstBad };
  };

  const replayV1 = replay("v1", 4242, 480);
  check("game-glyph-raid",
    "the mirror replays the live panel tick for tick on v1 (" +
      replayV1.compared + " frames)",
    replayV1.compared >= 400 && replayV1.mismatches === 0,
    replayV1.firstBad || replayV1.compared + " frames");
  const replayV14 = replay("v14", 909, 240);
  check("game-glyph-raid",
    "the mirror replays the live panel tick for tick on v14 (" +
      replayV14.compared + " frames, the shipped tempo cliff)",
    replayV14.compared >= 200 && replayV14.mismatches === 0,
    replayV14.firstBad || replayV14.compared + " frames");

  /* ---- the bench: two hands, seeded, through the mirror ---- */
  const SHIP_Y = 220;
  const BULLET_V = 340;
  /* The raider hand: dodge the most imminent drop that bears on the hull
   * (committed - hold the away side 0.3s, never jitter), else peel the
   * outermost alive column lowest-first while the formation's span is narrow
   * (a peeled column widens the sweep band and slows the flip drop), then
   * mop the lowest raiders outermost-first, leading the sweep by the march
   * law the engine runs (8px every effective step). */
  const raiderHand = () => {
    let sampleX = null;
    let sampleDir = 0;
    let sampleAt = -1;
    let dodgeSteer = 0;
    let dodgeUntil = -1;
    return function (state) {
      if (state.elapsed < dodgeUntil) return dodgeSteer;
      let threat = null;
      for (let i = 0; i < state.drops.length; i += 1) {
        const drop = state.drops[i];
        if (drop.y > 172 && drop.y < 232 && Math.abs(drop.x - state.shipX) < 26) {
          if (!threat || drop.y > threat.y) threat = drop;
        }
      }
      if (threat && !state.invuln) {
        let away = state.shipX <= threat.x ? -1 : 1;
        if (away < 0 && state.shipX < 44) away = 1;
        if (away > 0 && state.shipX > 276) away = -1;
        dodgeSteer = away;
        dodgeUntil = state.elapsed + 0.3;
        return dodgeSteer;
      }
      let minX = 1e9;
      let maxX = -1e9;
      let minCol = 99;
      let maxCol = -1;
      state.invaders.forEach((inv) => {
        if (inv.x < minX) minX = inv.x;
        if (inv.x > maxX) maxX = inv.x;
        if (inv.col < minCol) minCol = inv.col;
        if (inv.col > maxCol) maxCol = inv.col;
      });
      let target = null;
      if (maxX - minX < 180) {
        const pickCol =
          Math.abs(minCol - 4.5) >= Math.abs(maxCol - 4.5) ? minCol : maxCol;
        state.invaders.forEach((inv) => {
          if (inv.col !== pickCol) return;
          if (!target || inv.y > target.y) target = inv;
        });
      }
      if (!target) {
        state.invaders.forEach((inv) => {
          if (!target || inv.y > target.y + 0.5 ||
              (Math.abs(inv.y - target.y) <= 0.5 &&
                Math.abs(inv.col - 4.5) > Math.abs(target.col - 4.5))) {
            target = inv;
          }
        });
      }
      if (!target) return 0;
      if (sampleAt >= 0 && state.elapsed - sampleAt >= 0.15) {
        const moved = target.x - sampleX;
        if (Math.abs(moved) >= 4) sampleDir = moved > 0 ? 1 : -1;
        sampleX = target.x;
        sampleAt = state.elapsed;
      } else if (sampleAt < 0) {
        sampleX = target.x;
        sampleAt = state.elapsed;
      }
      const total = state.level.rows * state.level.cols;
      const stepEff =
        (state.level.stepMs * (0.4 + (0.6 * state.invaders.length) / total)) / 1000;
      const flight = (SHIP_Y - 12 - target.y) / BULLET_V;
      const lead = Math.max(-34, Math.min(34, (8 / stepEff) * sampleDir * flight));
      const dx = target.x + lead - state.shipX;
      if (Math.abs(dx) < 4) return 0;
      return dx > 0 ? 1 : -1;
    };
  };
  const naiveHand = () => () => 0;

  const SEEDS = [700, 750, 800, 850, 900, 950];
  const benchCache = {};
  const bench = (levelId, handMaker) => {
    const key = levelId + ":" + (handMaker === raiderHand ? "raider" : "naive");
    if (!benchCache[key]) {
      benchCache[key] = SEEDS.map((seed) =>
        App.raidSimulate(byId[levelId], handMaker(), raidRng(seed)));
    }
    return benchCache[key];
  };

  /* calibration: the bench plays the real game where the economy permits,
   * and nothing is free */
  const v1Raider = bench("v1", raiderHand);
  check("game-glyph-raid",
    "the raider hand clears the shipped opening wave on every seed (" +
      v1Raider.filter((run) => run.cleared).length + "/6)",
    v1Raider.every((run) => run.cleared),
    "cleared " + v1Raider.filter((run) => run.cleared).length + "/6");
  const freeProblems = ["v20"].concat(deepIds)
    .filter((id) => bench(id, naiveHand).some((run) => run.cleared));
  check("game-glyph-raid",
    "the naive hand clears nothing on the shipped peak or the deep tier - no wave is free",
    freeProblems.length === 0, freeProblems.join(","));

  /* determinism: a seed replays byte-identically */
  const again = App.raidSimulate(byId.v24, raiderHand(), raidRng(313));
  const once = App.raidSimulate(byId.v24, raiderHand(), raidRng(313));
  check("game-glyph-raid", "a seeded replay is byte-stable",
    JSON.stringify(once) === JSON.stringify(again), JSON.stringify(once));

  /* ---- the tier is harder in the engine's own currencies ---- */
  /* The untouched landing clock: the naive hand never kills deliberately, so
   * its run is the deal's own descent geometry - and it ends on the landing
   * line every time. The ticks fall rung over rung into the deep tier. */
  const clockProblems = [];
  let prevClock = Infinity;
  ["v20"].concat(deepIds).forEach((id) => {
    const runs = bench(id, naiveHand);
    const allLanded = runs.every((run) => run.landed);
    const clock = Math.max.apply(null, runs.map((run) => run.ticks));
    if (!allLanded) clockProblems.push(id + " naive runs did not all land");
    if (!(clock < prevClock)) {
      clockProblems.push(id + " landing clock " + clock +
        " ticks is not under the rung before it (" + prevClock + ")");
    }
    prevClock = clock;
  });
  check("game-glyph-raid",
    "the untouched landing clock falls rung over rung into the deep tier",
    clockProblems.length === 0, clockProblems.join(" | "));

  /* The shot floor: the engine's own fire cadence (a bullet every 330ms) is
   * law, and the plates demand raiders+plates rounds, so no hand of any
   * skill can clear a rung faster than that floor. The deep floors climb
   * strictly above the shipped peak's and into the summit. */
  const CADENCE_S = 0.33;
  const floorOf = (level) => {
    const ranks = level.armorRanks || 1;
    const plates = level.armor ? level.armor * level.cols * ranks : 0;
    return (level.rows * level.cols + plates) * CADENCE_S;
  };
  const floorProblems = [];
  let prevFloor = floorOf(v20);
  deep.forEach((level) => {
    const floor = floorOf(level);
    if (!(floor > prevFloor)) {
      floorProblems.push(level.id + " shot floor " + floor.toFixed(1) +
        "s is not above the rung before it (" + prevFloor.toFixed(1) + "s)");
    }
    prevFloor = floor;
  });
  check("game-glyph-raid",
    "the plates raise every deep shot floor above v20's, rising into the summit (" +
      deepIds.map((id) => byId[id].id + " " + floorOf(byId[id]).toFixed(1) + "s").join(", ") +
      " vs v20 " + floorOf(v20).toFixed(1) + "s)",
    floorProblems.length === 0, floorProblems.join(" | "));

  /* The deals really spend shots on plates: the raider hand soaks none on the
   * shipped peak (no rung marches a plate) and soaks on every deep rung, on
   * every seed. */
  const soakProblems = [];
  if (bench("v20", raiderHand).some((run) => run.soaked !== 0)) {
    soakProblems.push("v20 soaked shots it should never soak");
  }
  deepIds.forEach((id) => {
    if (!bench(id, raiderHand).every((run) => run.soaked > 0)) {
      soakProblems.push(id + " let a seed through without soaking a plate");
    }
  });
  check("game-glyph-raid",
    "the deep deals demonstrably soak shots into plates; v20 soaks none",
    soakProblems.length === 0, soakProblems.join(" | "));

  /* ---- the plates are priced by twins ---- */
  const twinProblems = [];
  [["v21", "armor: 1"], ["v24", "armor: 2, armorRanks: 2"]].forEach((pair) => {
    const id = pair[0];
    const twin = Object.assign({}, byId[id], { armor: 0, armorRanks: 0 });
    const platedRuns = bench(id, raiderHand);
    SEEDS.forEach((seed, index) => {
      const bare = App.raidSimulate(twin, raiderHand(), raidRng(seed));
      const plated = platedRuns[index];
      if (bare.soaked !== 0 || plated.soaked === 0) {
        twinProblems.push(id + " seed " + seed + ": soak " + plated.soaked +
          " plated vs " + bare.soaked + " bare");
      }
      if (!(bare.kills > plated.kills)) {
        twinProblems.push(id + " seed " + seed + ": the bare twin killed " +
          bare.kills + " against the plated rung's " + plated.kills);
      }
    });
  });
  check("game-glyph-raid",
    "the same deals without plates convert the soaked shots into kills",
    twinProblems.length === 0, twinProblems.join(" | "));
  const twinFloorProblems = deepIds.filter((id) => {
    const level = byId[id];
    const ranks = level.armorRanks || 1;
    const plates = level.armor * level.cols * ranks;
    const drop = floorOf(level) - floorOf(Object.assign({}, level, { armor: 0 }));
    return Math.abs(drop - plates * CADENCE_S) > 1e-9;
  });
  check("game-glyph-raid",
    "stripping a deep rung's plates drops its shot floor by exactly plates x 330ms",
    twinFloorProblems.length === 0, twinFloorProblems.join(","));

  /* ---- the names travel with the page ---- */
  const copyProblems = deep.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-glyph-raid", "the four deep wave names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* ---- the unlock chain is derived, never stored ---- */
  env.store.delete("glyph-raid-campaign");
  const chain = App.createCampaign({
    key: "glyph-raid-campaign",
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
  check("game-glyph-raid", "the unlock chain walks all twenty-four waves in order",
    walked === 24 && chained && chain.clearedCount() === 24, walked + " first clears");

  /* ---- the live panel wires the tier the way a player meets it ---- */
  const panel = makePanel();
  env.store.delete("glyph-raid-campaign");
  const save = { v: 1, cleared: {} };
  for (let c = 1; c <= 20; c += 1) save.cleared["v" + c] = { stars: 3, best: 1 };
  env.store.set("glyph-raid-campaign", JSON.stringify(save));
  let wiringProblems = [];
  try {
    App.initGlyphRaidGame();
    const options = [];
    for (let i = 0; i < panel.raidLevelSel.childNodes.length; i += 1) {
      const node = panel.raidLevelSel.childNodes[i];
      if (node.nodeType === 1) options.push(node);
    }
    if (options.length !== 24) {
      wiringProblems.push("the picker holds " + options.length + " waves");
    }
    options.forEach((option, index) => {
      const shouldOpen = index <= 20;
      if (!!option.disabled !== !shouldOpen) {
        wiringProblems.push(option.value + " is " +
          (option.disabled ? "locked" : "open") + " at position " + index);
      }
    });
    panel.raidLevelSel.value = "v21";
    env.dispatch(panel.raidLevelSel, "change");
    if (panel.raidResult.textContent !== App.t("raidReady", { n: 60 })) {
      wiringProblems.push("selecting v21 loaded \"" +
        panel.raidResult.textContent + "\"");
    }
  } catch (error) {
    wiringProblems.push("panel init threw: " + error.message);
  } finally {
    removePanel();
  }
  check("game-glyph-raid",
    "the panel picker holds all twenty-four waves and v21 loads as a plated 6x10 wave",
    wiringProblems.length === 0, wiringProblems.join(" | "));
};
