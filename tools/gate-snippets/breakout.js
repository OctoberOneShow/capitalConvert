"use strict";

/* game-breakout: the living summit and the sealed tier are proved on the real
 * panel by the same kind of scripted paddle that clears the shipped tier.
 *
 * The summit x25-x30 carries one new mechanic, the living law: every course
 * of all six walls keeps a seed, so wherever the breach opens, the wall grows
 * shut again behind the rally. No shipped wall ever kept seeds in all five
 * courses at once, so the law is what differs the summit from every earlier
 * wall, and the gate holds it two ways - structurally, against the table
 * itself, and live, by counting the sprouts the engine deals while the bench
 * plays.
 *
 * The tier x31-x40 is the sealed grove: every course of all ten walls runs
 * all eight tiles - not one open cell - and every course still keeps a pod,
 * so the wall replants into whatever breach the rally opens. No shipped wall
 * ever filled all five courses at once. The seal's price - every tile, every
 * extra hit the two-hit plate charges, and both sprouts every pod can plant
 * - climbs rung over rung from 66 to 84, the ball runs faster than any wall
 * before it (3.65 up to 4.1, past the evergreen summit's 3.6), the keeps'
 * mirror law rides along, and the last four walls close the alphabet again:
 * all six kinds on one sealed mirrored plate.
 *
 * The tier x41-x44 is the obsidian grove: the seal's closed mirrored plate
 * carried past its capstone, running the census no shipped wall ever ran -
 * every wall carries the full alphabet with exactly a pair of each of the
 * four lesser kinds (two normals, two drift, two ghosts, two exploders),
 * the rest of the plate being armor and pods. The rung gradient inverts the
 * seal's: the pods climb 14 -> 16 -> 18 -> 20 while the tough plate yields
 * 18 -> 16 -> 14 -> 12, so the wall stops being hard and starts being alive;
 * the price climbs 86 -> 92 past the seal's 84, and the ball - already at
 * the keyboard pace - climbs by 0.04 a rung (4.14 up to 4.26), faster than
 * any wall shipped yet still inside the hand's 4.4 cap. The mirror law rides
 * along, and no course is left open.
 *
 * The bench plays through the game's own simulation only: the panel is booted
 * on a save a player actually brings into the wall, the picker selects, the
 * seeded stream drives the launch angles, and a tracking hand (cap 4.4, the
 * keyboard pace) walks the bar while the engine's tick runs. Every run
 * squares up to centre and lets the deal finish before serving, so no run
 * inherits the previous run's leftover shake or bar position and the seeded
 * streams stay per-run end to end.
 *
 * Difficulty is measured, not asserted. The living summit's metric is the
 * median paddle saves (rally length) over five seeded runs, and it must
 * climb strictly from the shipped peak x24 through all six summit walls;
 * the sealed tier's spine is the price counted off its own rows, and the
 * ball speed climbs past every wall the lot shipped. Stars in Inkball come
 * from the lives ladder the engine scores (three pearls at the clear is
 * three stars), so the bands are honest when the tracking hand clears most
 * runs and lands a full-pearl three-star on every wall, while a hand that
 * reads the ball half as fast cannot clear the sealed opener, nor the
 * obsidian one, at all. */

module.exports = function gate(ctx) {
  const { App, env, check, fs, path, root } = ctx;
  const levels = App.brkLevels;
  const summitIds = ["x25", "x26", "x27", "x28", "x29", "x30"];
  const sealIds = ["x31", "x32", "x33", "x34", "x35", "x36", "x37", "x38", "x39", "x40"];
  const obsidianIds = ["x41", "x42", "x43", "x44"];
  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });

  /* ---- the ladder holds forty-four distinct walls, summit, seal and obsidian present ---- */
  check("game-breakout", "the inkball ladder holds forty-four walls",
    levels.length === 44, String(levels.length));
  check("game-breakout", "every wall id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missingSummit = summitIds.filter((id) => !byId[id]);
  check("game-breakout", "the summit tier x25-x30 is present",
    missingSummit.length === 0, missingSummit.join(","));
  const missingSeal = sealIds.filter((id) => !byId[id]);
  check("game-breakout", "the sealed tier x31-x40 is present",
    missingSeal.length === 0, missingSeal.join(","));
  const missingObsidian = obsidianIds.filter((id) => !byId[id]);
  check("game-breakout", "the obsidian tier x41-x44 is present",
    missingObsidian.length === 0, missingObsidian.join(","));
  summitIds.forEach((id) => {
    const wall = byId[id];
    const rows = wall.rows;
    check("game-breakout", `${id}: the wall is authored on the 8x5 plate`,
      rows.length === 5 && rows.every((row) => row.length === 8),
      JSON.stringify(rows));
    check("game-breakout", `${id}: every tile is a kind the engine knows`,
      rows.every((row) => row.split("").every((ch) => ".ntdsgx".includes(ch))),
      JSON.stringify(rows));
    check("game-breakout", `${id}: the ball runs faster than the wall before it`,
      wall.speed > levels[levels.indexOf(wall) - 1].speed, String(wall.speed));
  });
  sealIds.forEach((id) => {
    const wall = byId[id];
    const rows = wall.rows;
    check("game-breakout", `${id}: the wall is authored on the 8x5 plate`,
      rows.length === 5 && rows.every((row) => row.length === 8),
      JSON.stringify(rows));
    check("game-breakout", `${id}: every tile is a kind the engine knows`,
      rows.every((row) => row.split("").every((ch) => ".ntdsgx".includes(ch))),
      JSON.stringify(rows));
    check("game-breakout", `${id}: the ball runs faster than the wall before it`,
      wall.speed > levels[levels.indexOf(wall) - 1].speed, String(wall.speed));
    check("game-breakout", `${id}: every course reads the same from both rails`,
      rows.every((row) => row === row.split("").reverse().join("")),
      JSON.stringify(rows));
  });
  obsidianIds.forEach((id) => {
    const wall = byId[id];
    const rows = wall.rows;
    check("game-breakout", `${id}: the wall is authored on the 8x5 plate`,
      rows.length === 5 && rows.every((row) => row.length === 8),
      JSON.stringify(rows));
    check("game-breakout", `${id}: every tile is a kind the engine knows`,
      rows.every((row) => row.split("").every((ch) => ".ntdsgx".includes(ch))),
      JSON.stringify(rows));
    check("game-breakout", `${id}: the ball runs faster than the wall before it`,
      wall.speed > levels[levels.indexOf(wall) - 1].speed, String(wall.speed));
    check("game-breakout", `${id}: every course reads the same from both rails`,
      rows.every((row) => row === row.split("").reverse().join("")),
      JSON.stringify(rows));
    check("game-breakout", `${id}: the rung stays inside the tracking hand's cap`,
      wall.speed < 4.4, String(wall.speed));
  });

  /* ---- the living law: every course carries a seed, no earlier wall does ---- */
  const living = (wall) => wall.rows.every((row) => row.includes("s"));
  const earlier = levels.filter((level) =>
    !summitIds.includes(level.id) && !sealIds.includes(level.id) &&
    !obsidianIds.includes(level.id));
  check("game-breakout",
    "every summit wall keeps a seed course on all five rows (the living law)",
    summitIds.every((id) => living(byId[id])),
    JSON.stringify(summitIds.map((id) => byId[id].rows)));
  check("game-breakout",
    "no shipped wall ever kept seeds in all five courses",
    !earlier.some((wall) => living(wall)),
    earlier.filter((wall) => living(wall)).map((wall) => wall.id).join(","));

  /* ---- the sealed law: a full plate that keeps a pod, no earlier wall does ---- */
  const sealed = (wall) =>
    wall.rows.every((row) => row.length === 8 && !row.includes(".") && row.includes("s"));
  check("game-breakout",
    "every seal wall runs eight tiles on all five courses and keeps a pod in each (the sealed law)",
    sealIds.every((id) => sealed(byId[id])),
    JSON.stringify(sealIds.map((id) => byId[id].rows)));
  check("game-breakout",
    "no wall before the seal ever filled all five courses",
    !earlier.some((wall) => sealed(wall)) &&
      !summitIds.some((id) => sealed(byId[id])),
    earlier.concat(summitIds.map((id) => byId[id]))
      .filter((wall) => sealed(wall)).map((wall) => wall.id).join(","));

  /* ---- the seal's price: tiles, plate hits and replants climb rung over rung ---- */
  const price = (wall) =>
    wall.rows.join("").replace(/\./g, "").length +
    (wall.rows.join("").match(/t/g) || []).length +
    2 * (wall.rows.join("").match(/s/g) || []).length;
  const sealPrices = sealIds.map((id) => price(byId[id]));
  const priceClimbs = sealPrices.every((value, index) =>
    index === 0 || value > sealPrices[index - 1]);
  check("game-breakout",
    "the seal's price climbs rung over rung " + sealPrices.join(" -> "),
    priceClimbs, JSON.stringify(sealPrices));

  /* ---- the capstone: the seal closes the alphabet on a mirrored plate ---- */
  check("game-breakout",
    "x37-x40 carry every tile kind the engine knows on one sealed plate",
    ["x37", "x38", "x39", "x40"].every((id) => {
      const kinds = new Set(byId[id].rows.join("").replace(/\./g, "").split(""));
      return ["n", "t", "d", "s", "g", "x"].every((kind) => kinds.has(kind));
    }),
    JSON.stringify(["x37", "x38", "x39", "x40"].map((id) => byId[id].rows)));

  /* ---- the obsidian law: the exact pair census, no wall before it runs it.
   * Every obsidian wall carries the full alphabet with exactly a pair of
   * each of the four lesser kinds - two normals, two drift, two ghosts, two
   * exploders - the rest of the sealed plate being armor and pods. The seal's
   * capstone merely carried all six kinds; the census pins their counts. ---- */
  const census = (wall) => {
    const joined = wall.rows.join("");
    const count = (kind) => (joined.match(new RegExp(kind, "g")) || []).length;
    return { n: count("n"), t: count("t"), d: count("d"), s: count("s"),
      g: count("g"), x: count("x") };
  };
  const kindsOf = (wall) => {
    const counted = census(wall);
    return ["n", "t", "d", "s", "g", "x"].every((kind) => counted[kind] >= 2);
  };
  const obsidianCensus = (wall) => {
    const counted = census(wall);
    return counted.n === 2 && counted.d === 2 && counted.g === 2 &&
      counted.x === 2;
  };
  check("game-breakout",
    "every obsidian wall runs the full alphabet on the exact pair census" +
      " - two of each lesser kind on a sealed plate (the obsidian law)",
    obsidianIds.every((id) => obsidianCensus(byId[id]) && sealed(byId[id]) && kindsOf(byId[id])),
    JSON.stringify(obsidianIds.map((id) => byId[id].rows)));
  const censusOwners = levels.filter((wall) => obsidianCensus(wall))
    .map((wall) => wall.id);
  check("game-breakout",
    "the exact pair census belongs to the obsidian tier alone" +
      " - no shipped wall ever ran it",
    censusOwners.length === 4 && obsidianIds.every((id) => censusOwners.includes(id)),
    censusOwners.join(","));

  /* ---- the obsidian gradients: the pods climb while the armor yields ---- */
  const obsidianPods = obsidianIds.map((id) => census(byId[id]).s);
  check("game-breakout",
    "the obsidian pods climb rung over rung " + obsidianPods.join(" -> "),
    obsidianPods.every((value, index) => index === 0 || value > obsidianPods[index - 1]),
    JSON.stringify(obsidianPods));
  const obsidianTough = obsidianIds.map((id) => census(byId[id]).t);
  check("game-breakout",
    "the obsidian armor yields rung over rung " + obsidianTough.join(" -> "),
    obsidianTough.every((value, index) => index === 0 || value < obsidianTough[index - 1]),
    JSON.stringify(obsidianTough));

  /* ---- the obsidian price: past the seal's capstone, climbing rung over rung ---- */
  const obsidianPrices = obsidianIds.map((id) => price(byId[id]));
  check("game-breakout",
    "the obsidian price tops the seal's capstone and climbs rung over rung " +
      obsidianPrices.join(" -> "),
    obsidianPrices[0] > sealPrices[sealPrices.length - 1] &&
      obsidianPrices.every((value, index) => index === 0 || value > obsidianPrices[index - 1]),
    JSON.stringify(obsidianPrices));
  const obsidianSpeeds = obsidianIds.map((id) => byId[id].speed);
  check("game-breakout",
    "the obsidian ball runs past the seal's capstone and under the hand's cap " +
      obsidianSpeeds.join(" -> "),
    obsidianSpeeds[0] > byId.x40.speed &&
      obsidianSpeeds.every((value, index) => index === 0 || value > obsidianSpeeds[index - 1]) &&
      obsidianSpeeds.every((value) => value < 4.4),
    JSON.stringify(obsidianSpeeds));

  const BRK_W = 320;
  const BRK_PADDLE_W = 46;
  const BRK_PADDLE_Y = 224 - 14;

  /* ---- the hands. One tracking hand per bench: read where the ball will
   * come down, walk the bar there at keyboard pace, launch when the table is
   * loaded. The cap keeps the hand honest and the return is angled on
   * purpose, sweeping left and right in turn. Saves are counted at the bar
   * (below y=190 only the paddle flips a descent), sprouts as live increases
   * of the brick count. Every run squares up to centre and lets the deal
   * finish before serving, so the seeded stream never inherits the previous
   * run's leftover shake or bar position. ---- */
  const makeHands = (app, benchEnv, canvas) => {
    const seeded = (seed, fn) => {
      const realRandom = Math.random;
      let state = seed >>> 0;
      Math.random = () => {
        state = (Math.imul(state, 1103515245) + 12345) >>> 0;
        return state / 4294967296;
      };
      try {
        return fn();
      } finally {
        Math.random = realRandom;
      }
    };
    const play = (levelId, cap, seed, reactMs) =>
      seeded(seed, () => {
        const sel = benchEnv.byId("brkLevelSel");
        sel.value = levelId;
        benchEnv.dispatch(sel, "change");
        if (app.brkProbe().levelId !== levelId) {
          throw new Error("breakout gate: the picker refused " + levelId);
        }
        let sawLive = false;
        let plan = null;
        let saves = 0;
        let sprouts = 0;
        let lastLiveLives = 3;
        let prev = app.brkProbe();
        for (let guard = 0; guard < 30000; guard += 1) {
          const probe = app.brkProbe();
          if (probe.levelId !== levelId) {
            return { cleared: true, lives: lastLiveLives, ticks: guard,
              saves, sprouts };
          }
          if (!probe.running) {
            return { cleared: false, lives: lastLiveLives, ticks: guard,
              saves, sprouts };
          }
          if (probe.state === "ready") {
            if (sawLive && probe.lives === 3) {
              return { cleared: true, lives: lastLiveLives, ticks: guard,
                saves, sprouts };
            }
            plan = null;
            if (!sawLive) {
              benchEnv.dispatch(canvas, "pointermove", { clientX: BRK_W / 2 });
              for (let warm = 0; warm < 48; warm += 1) {
                benchEnv.timers.advance(16);
              }
            }
            benchEnv.dispatch(canvas, "keydown", { key: " " });
          } else if (probe.state === "live") {
            sawLive = true;
            lastLiveLives = probe.lives;
            if (prev.state === "live") {
              if (probe.bricks > prev.bricks) {
                sprouts += probe.bricks - prev.bricks;
              }
              if (prev.ball.vy > 0 && probe.ball.vy < 0 && probe.ball.y > 190) {
                saves += 1;
              }
            }
            if (!plan || benchEnv.clock.now >= plan.until) {
              let x = probe.ball.x;
              let y = probe.ball.y;
              let vx = probe.ball.vx;
              const vy = probe.ball.vy;
              if (vy > 0) {
                let hops = 0;
                while (y < BRK_PADDLE_Y && hops < 600) {
                  x += vx;
                  y += vy;
                  hops += 1;
                  if (x - 3 <= 0) {
                    x = 3;
                    vx = Math.abs(vx);
                  } else if (x + 3 >= BRK_W) {
                    x = BRK_W - 3;
                    vx = -Math.abs(vx);
                  }
                }
              }
              const bias = Math.floor(guard / 600) % 2 === 0 ? 9 : -9;
              const want = (vy > 0 ? x : BRK_W / 2) + bias - BRK_PADDLE_W / 2;
              const target = Math.max(0, Math.min(BRK_W - BRK_PADDLE_W, want));
              plan = { until: benchEnv.clock.now + (reactMs || 16), target };
            }
            const next = probe.paddleX +
              Math.max(-cap, Math.min(cap, plan.target - probe.paddleX));
            benchEnv.dispatch(canvas, "pointermove", { clientX: next + BRK_PADDLE_W / 2 });
          }
          prev = probe;
          benchEnv.timers.advance(16);
        }
        throw new Error("breakout gate: " + levelId + " never settled in 30000 ticks");
      });
    const bench = (levelId, seeds, reactMs) =>
      seeds.map((seed) => {
        const played = play(levelId, 4.4, seed, reactMs);
        played.seed = seed;
        return played;
      });
    return { play, bench };
  };

  /* ---- a fresh boot of the whole app per bench: the panel opened on the
   * benched wall with every earlier wall cleared, the save a player actually
   * brings into it ---- */
  const brkBenchSource = (() => {
    const pageHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
    const modules = Array.from(
      pageHtml.matchAll(/assets\/app\/([a-z0-9-]+)\.js\?v=\d+/g),
    ).map((match) => match[1]);
    return modules.map((name) =>
      fs.readFileSync(path.join(root, "assets", "app", name + ".js"), "utf8")
        .replace(/^﻿/, "")).join("\n");
  })();

  const mountPanel = (app, benchEnv, clearedUpTo) => {
    const doc = benchEnv.document;
    const make = (id, tag) => {
      const el = doc.createElement(tag || "div");
      el.id = id;
      doc.body.appendChild(el);
      return el;
    };
    make("brkCanvas", "canvas");
    make("brkScore");
    make("brkLives");
    make("brkLevel");
    make("brkResult");
    make("brkStartBtn", "button");
    make("brkBest");
    make("brkLevelSel", "select");
    make("gamePanelBreakout");
    const clearedSave = {};
    levels.forEach((wall) => {
      if (levels.indexOf(wall) < levels.indexOf(byId[clearedUpTo])) {
        clearedSave[wall.id] = { stars: 3, best: 999 };
      }
    });
    benchEnv.store.set("inkball-campaign", JSON.stringify({ v: 1, cleared: clearedSave }));
    let bootError = null;
    try {
      app.initBreakoutGame();
    } catch (error) {
      bootError = error;
    }
    check("game-breakout",
      `the panel boots through its real init path without error (${clearedUpTo})`,
      bootError === null && typeof app.brkProbe === "function",
      bootError ? String(bootError && bootError.stack || bootError) : "no probe");
    return benchEnv.byId("brkCanvas");
  };

  const makeBench = (clearedUpTo) => {
    const { createEnvironment } = require(path.join(root, "tools", "stub-dom"));
    /* motion off: the fx pools stay empty so the bench runs fast, and the
     * ball physics the proof measures is untouched */
    const benchEnv = createEnvironment({ motion: "off" });
    benchEnv.load(brkBenchSource);
    benchEnv.domReady();
    const app = benchEnv.sandbox.CapitalConvert || benchEnv.window.CapitalConvert;
    const canvas = mountPanel(app, benchEnv, clearedUpTo);
    return {
      app, env: benchEnv, canvas, ...makeHands(app, benchEnv, canvas),
      sel: benchEnv.byId("brkLevelSel"),
    };
  };

  const allSeeds = [11000, 22000, 33000, 44000, 55000];

  /* ---- the panel boots on this snippet's own environment first: the
   * shipped peak calibrates the bench with the save a player brings into
   * x24 (everything through x23 cleared), the next wall still locked ---- */
  env.setMotion("off");
  const brkCanvas = mountPanel(App, env, "x24");
  const bootProbe = App.brkProbe();
  check("game-breakout", "the booted table opens on x24, the shipped peak",
    bootProbe.levelId === "x24" && bootProbe.bricks === 24 && bootProbe.speed === 3.3,
    JSON.stringify(bootProbe));
  env.byId("brkLevelSel").value = "x25";
  env.dispatch(env.byId("brkLevelSel"), "change");
  check("game-breakout", "the picker refuses x25 until x24 is cleared",
    App.brkProbe().levelId === "x24", "x25 opened early");
  const ctxHands = makeHands(App, env, brkCanvas);
  const report = { x24: ctxHands.bench("x24", allSeeds) };

  /* ---- the pearls are at stake: a hand that reads the ball half as fast
   * still clears the opener but never keeps a full pearl row, and an amateur
   * hand (a second of reaction time) cannot clear it at all ---- */
  const openerBoot = makeBench("x25");
  openerBoot.sel.value = "x26";
  openerBoot.env.dispatch(openerBoot.sel, "change");
  check("game-breakout", "the picker refuses x26 until x25 is cleared",
    openerBoot.app.brkProbe().levelId === "x25", "x26 opened early");
  report.x25 = openerBoot.bench("x25", allSeeds);
  const medium = openerBoot.bench("x25", allSeeds.slice(0, 3), 300);
  const amateur = openerBoot.bench("x25", allSeeds.slice(0, 3), 950);

  /* one boot carries the bench up the rest of the ladder: each clear
   * unlocks exactly the next wall, the way the campaign hands them out */
  const ladderBoot = makeBench("x26");
  summitIds.slice(1).forEach((id) => {
    report[id] = ladderBoot.bench(id, allSeeds);
  });

  /* ---- the sealed tier boots on the shipped summit: the save a player
   * brings into x30 arms the panel there, the picker refuses x31 until the
   * summit is cleared, and the calibration hand proves the shipped peak
   * before it walks the seal ---- */
  const sealBoot = makeBench("x30");
  sealBoot.sel.value = "x31";
  sealBoot.env.dispatch(sealBoot.sel, "change");
  check("game-breakout", "the picker refuses x31 until x30 is cleared",
    sealBoot.app.brkProbe().levelId === "x30", "x31 opened early");
  report.x30 = sealBoot.bench("x30", allSeeds);
  sealIds.forEach((id) => {
    report[id] = sealBoot.bench(id, allSeeds);
  });

  /* ---- the obsidian tier boots on the sealed grove: the save a player
   * brings into x40 arms the panel there, the picker refuses x41 until the
   * seal is cleared, and the calibration clear of the shipped capstone is
   * what unlocks the obsidian gate - then one walk carries the bench up the
   * four new walls the way the campaign hands them out ---- */
  const obsidianBoot = makeBench("x40");
  obsidianBoot.sel.value = "x41";
  obsidianBoot.env.dispatch(obsidianBoot.sel, "change");
  check("game-breakout", "the picker refuses x41 until x40 is cleared",
    obsidianBoot.app.brkProbe().levelId === "x40", "x41 opened early");
  report.x40 = obsidianBoot.bench("x40", allSeeds);
  obsidianIds.forEach((id) => {
    report[id] = obsidianBoot.bench(id, allSeeds);
  });

  /* ---- winnability: the tracking hand clears every run inside a bounded
   * clock, every clear lands the lives ladder the engine scores (three
   * pearls is three stars, one pearl still stars), the three-star line is
   * reachable on every wall, and the wall really sprouts ---- */
  const starProblems = [];
  summitIds.forEach((id) => {
    const runs = report[id];
    const clears = runs.filter((run) => run.cleared);
    const perfect = clears.filter((run) => run.lives === 3);
    if (clears.length < 4) {
      starProblems.push(`${id}: cleared ${clears.length}/5`);
    }
    if (perfect.length < 1) {
      starProblems.push(`${id}: no full-pearl (three-star) clear`);
    }
    if (!clears.every((run) => run.lives >= 1 && run.lives <= 3)) {
      starProblems.push(`${id}: a clear landed off the lives ladder`);
    }
    if (!clears.every((run) => run.ticks < 12000)) {
      starProblems.push(`${id}: a clear ran past the bounded clock`);
    }
    if (clears.reduce((sum, run) => sum + run.sprouts, 0) < 2) {
      starProblems.push(`${id}: the wall never sprouted - the living law is dead`);
    }
  });
  check("game-breakout",
    "every summit wall is cleared by the tracking hand in most seeded runs," +
    " stars from the lives ladder, the three-star line reachable," +
    " and the wall really sprouts",
    starProblems.length === 0, starProblems.join(" | "));

  const median = (runs) => {
    const clears = runs.filter((run) => run.cleared);
    const list = clears.map((run) => run.saves).sort((a, b) => a - b);
    if (!list.length) return null;
    return list.length % 2
      ? list[(list.length - 1) / 2]
      : (list[list.length / 2 - 1] + list[list.length / 2]) / 2;
  };

  /* ---- difficulty is measured: the rally the tracking hand needs climbs
   * strictly from the shipped peak through all six summit walls ---- */
  const ladderIds = ["x24"].concat(summitIds);
  const medians = ladderIds.map((id) => median(report[id]));
  const climbs = medians.every((value, index) =>
    index === 0 || (value !== null && medians[index - 1] !== null &&
      value > medians[index - 1]));
  check("game-breakout",
    "the rally climbs strictly from x24 through the summit (" +
      medians.map((value) => value === null ? "none" : String(value)).join(" -> ") + ")",
    climbs, JSON.stringify(medians));
  /* the ladder the bench measured, pinned: the proof is deterministic, so
   * the six summit walls can not quietly change without re-proving it */
  check("game-breakout",
    "the measured rally ladder is the one the summit shipped with",
    JSON.stringify(medians) === JSON.stringify([32, 36, 42, 46, 50, 60, 62]),
    JSON.stringify(medians));

  const mediumClears = medium.filter((run) => run.cleared);
  const mediumStars = mediumClears.reduce((sum, run) =>
    sum + (run.lives >= 3 ? 3 : run.lives === 2 ? 2 : 1), 0);
  const strongStars = report.x25.reduce((sum, run) =>
    sum + (run.cleared ? (run.lives >= 3 ? 3 : run.lives === 2 ? 2 : 1) : 0), 0);
  check("game-breakout",
    "a half-speed hand still clears the opener but pays pearls for it" +
    ` (stars ${mediumStars} vs the tracker's ${strongStars})`,
    mediumClears.length >= 1 && mediumStars < strongStars &&
      mediumClears.every((run) => run.lives < 3),
    JSON.stringify(medium));
  check("game-breakout",
    "an amateur reaction time cannot clear the opener",
    !amateur.some((run) => run.cleared), JSON.stringify(amateur));

  /* ---- the sealed tier's bench: the tracking hand clears most seeded runs
   * inside the bounded clock, stars stay on the lives ladder, the three-star
   * line is reachable on every sealed wall, and a slower hand cannot even
   * clear the opener - the seal is where the keyboard pace runs out ---- */
  const sealBoot2 = makeBench("x31");
  const sealMedium = sealBoot2.bench("x31", allSeeds.slice(0, 3), 300);
  const sealAmateur = sealBoot2.bench("x31", allSeeds.slice(0, 3), 950);
  const sealProblems = [];
  sealIds.forEach((id) => {
    const runs = report[id];
    const clears = runs.filter((run) => run.cleared);
    const perfect = clears.filter((run) => run.lives === 3);
    if (clears.length < 4) {
      sealProblems.push(`${id}: cleared ${clears.length}/5`);
    }
    if (perfect.length < 1) {
      sealProblems.push(`${id}: no full-pearl (three-star) clear`);
    }
    if (!clears.every((run) => run.lives >= 1 && run.lives <= 3)) {
      sealProblems.push(`${id}: a clear landed off the lives ladder`);
    }
    if (!clears.every((run) => run.ticks < 12000)) {
      sealProblems.push(`${id}: a clear ran past the bounded clock`);
    }
  });
  check("game-breakout",
    "every seal wall is cleared by the tracking hand in most seeded runs," +
    " stars from the lives ladder and the three-star line reachable",
    sealProblems.length === 0, sealProblems.join(" | "));
  check("game-breakout",
    "the sealed opener shuts out a half-speed hand and an amateur one",
    !sealMedium.some((run) => run.cleared) && !sealAmateur.some((run) => run.cleared),
    JSON.stringify({ medium: sealMedium, amateur: sealAmateur }));

  /* ---- the obsidian tier's bench: the same bars as the seal - the tracking
   * hand clears most seeded runs inside the bounded clock, stars stay on the
   * lives ladder, the three-star line is reachable on every obsidian wall,
   * and neither a half-speed hand nor an amateur one clears the opener ---- */
  const obsidianBoot2 = makeBench("x41");
  const obsidianMedium = obsidianBoot2.bench("x41", allSeeds.slice(0, 3), 300);
  const obsidianAmateur = obsidianBoot2.bench("x41", allSeeds.slice(0, 3), 950);
  const obsidianProblems = [];
  obsidianIds.forEach((id) => {
    const runs = report[id];
    const clears = runs.filter((run) => run.cleared);
    const perfect = clears.filter((run) => run.lives === 3);
    if (clears.length < 4) {
      obsidianProblems.push(`${id}: cleared ${clears.length}/5`);
    }
    if (perfect.length < 1) {
      obsidianProblems.push(`${id}: no full-pearl (three-star) clear`);
    }
    if (!clears.every((run) => run.lives >= 1 && run.lives <= 3)) {
      obsidianProblems.push(`${id}: a clear landed off the lives ladder`);
    }
    if (!clears.every((run) => run.ticks < 12000)) {
      obsidianProblems.push(`${id}: a clear ran past the bounded clock`);
    }
  });
  check("game-breakout",
    "every obsidian wall is cleared by the tracking hand in most seeded runs," +
    " stars from the lives ladder and the three-star line reachable",
    obsidianProblems.length === 0, obsidianProblems.join(" | "));
  check("game-breakout",
    "the obsidian opener shuts out a half-speed hand and an amateur one",
    !obsidianMedium.some((run) => run.cleared) && !obsidianAmateur.some((run) => run.cleared),
    JSON.stringify({ medium: obsidianMedium, amateur: obsidianAmateur }));

  /* ---- the unlock chain is derived, never stored: clearing each wall in
   * order hands the player exactly the next one, all forty-four times ---- */
  const chain = App.createCampaign({
    key: "breakout-gate-chain",
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
  check("game-breakout", "the unlock chain walks all forty-four walls in order",
    walked === 44 && chained && chain.clearedCount() === 44, walked + " first clears");

  /* ---- the summit, seal and obsidian names travel with the page in both languages ---- */
  const labelKeys = summitIds.concat(sealIds).concat(obsidianIds).map((id) => byId[id].labelKey);
  const labelProblems = labelKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-breakout", "the twenty summit, seal and obsidian wall names resolve in both languages",
    labelProblems.length === 0, labelProblems.join(","));
};
