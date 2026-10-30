"use strict";

/* game-breakout: the living summit is proved on the real panel by the same
 * kind of scripted paddle that clears the shipped tier.
 *
 * The summit x25-x30 carries one new mechanic, the living law: every course
 * of all six walls keeps a seed, so wherever the breach opens, the wall grows
 * shut again behind the rally. No shipped wall ever kept seeds in all five
 * courses at once, so the law is what differs the summit from every earlier
 * wall, and the gate holds it two ways - structurally, against the table
 * itself, and live, by counting the sprouts the engine deals while the bench
 * plays.
 *
 * The bench plays through the game's own simulation only: the panel is booted
 * on a save a player actually brings into the wall, the picker selects, the
 * seeded stream drives the launch angles, and a tracking hand (cap 4.4, the
 * keyboard pace) walks the bar while the engine's tick runs. Every run
 * squares up to centre and lets the deal finish before serving, so no run
 * inherits the previous run's leftover shake or bar position and the seeded
 * streams stay per-run end to end.
 *
 * Difficulty is measured, not asserted: the metric is the median paddle
 * saves (rally length) over five seeded runs, and it must climb strictly
 * from the shipped peak x24 through all six summit walls. Stars in Inkball
 * come from the lives ladder the engine scores (three pearls at the clear is
 * three stars), so the bands are honest when the tracking hand clears every
 * run and lands a full-pearl three-star on every wall, while a hand that
 * reads the ball half as fast still clears but pays pearls for it, and an
 * amateur hand (a full second of reaction time) cannot clear the opener at
 * all. */

module.exports = function gate(ctx) {
  const { App, env, check, fs, path, root } = ctx;
  const levels = App.brkLevels;
  const summitIds = ["x25", "x26", "x27", "x28", "x29", "x30"];
  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });

  /* ---- the ladder holds thirty distinct walls and the summit is present ---- */
  check("game-breakout", "the inkball ladder holds thirty walls",
    levels.length === 30, String(levels.length));
  check("game-breakout", "every wall id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missingSummit = summitIds.filter((id) => !byId[id]);
  check("game-breakout", "the summit tier x25-x30 is present",
    missingSummit.length === 0, missingSummit.join(","));
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

  /* ---- the living law: every course carries a seed, no earlier wall does ---- */
  const living = (wall) => wall.rows.every((row) => row.includes("s"));
  const earlier = levels.filter((level) => !summitIds.includes(level.id));
  check("game-breakout",
    "every summit wall keeps a seed course on all five rows (the living law)",
    summitIds.every((id) => living(byId[id])),
    JSON.stringify(summitIds.map((id) => byId[id].rows)));
  check("game-breakout",
    "no shipped wall ever kept seeds in all five courses",
    !earlier.some((wall) => living(wall)),
    earlier.filter((wall) => living(wall)).map((wall) => wall.id).join(","));

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

  /* ---- the unlock chain is derived, never stored: clearing each wall in
   * order hands the player exactly the next one, all thirty times ---- */
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
  check("game-breakout", "the unlock chain walks all thirty walls in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");

  /* ---- the six summit names travel with the page in both languages ---- */
  const labelKeys = summitIds.map((id) => byId[id].labelKey);
  const labelProblems = labelKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-breakout", "the six summit wall names resolve in both languages",
    labelProblems.length === 0, labelProblems.join(","));
};
