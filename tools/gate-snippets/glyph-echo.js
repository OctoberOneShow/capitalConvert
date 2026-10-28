"use strict";

/* game-glyph-echo: the hard tier is rung by a reference hand on the real
 * panel, and each rung's advertised dial is load-bearing
 *
 * The module's table is closure-bound, so the gate stages the panel in the
 * stub DOM, seeds the save with rungs 1-20 cleared (the save a player brings
 * into the tier), and reads the chain the way a player does: every is-lit
 * class add is recorded with the virtual clock. A perfect-memory hand echoes
 * each chain in the order the rung wants - mirrored on the backwards chimes
 * - so c21-c24 must each pay out three stars; one and two deliberate slips
 * must land two stars and one star, so the bands are proven from both
 * directions; three slips must end the chime, so no rung is free.
 *
 * Two mechanic proofs run on the live engine:
 * - goal length: a hand that echoes every chain but stops one link short of
 *   the goal on the final chain never wins - the engine's own chainCleared
 *   fires only at chain.length >= goal, and the stall is observed.
 * - reverse: on c23 and c24 a hand that echoes the chain forwards (seeded
 *   Math.random makes the deal deterministic) loses all three lives, while
 *   the mirrored hand cleared the same rung - the backwards order is the
 *   lesson, not decoration.
 *
 * Pace and glow cannot be cut this way (no input deadline exists, so a
 * faster chime cannot fail a patient hand); for those the gate proves the
 * honest alternative - each rung's measured effort (links per engaged
 * second, shows and pauses included) climbs strictly through the tier, and
 * each rung sets a campaign record on the dial it advertises. */
module.exports = function gate(ctx) {
  const { App, env, check } = ctx;
  /* The module ships its table as glyphEchoLevels - Echo Cartographer owns
   * the shorter App.echoLevels name, so the plain read would silently pick
   * the wrong game's ladder. */
  const levels = App.glyphEchoLevels;
  const tierIds = ["c21", "c22", "c23", "c24"];
  const byId = (id) => levels.find((level) => level.id === id);

  /* ---- ladder shape ---- */
  check("game-glyph-echo", "the ladder holds at least twenty-four chimes",
    levels.length >= 24, String(levels.length));
  check("game-glyph-echo", "every chime id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = tierIds.filter((id) => !byId(id));
  check("game-glyph-echo", "the hard tier c21-c24 is present",
    missing.length === 0, missing.join(","));

  /* ---- measured pressure, off the module's own table ---- */
  /* Effort = mean links per engaged second. A win replays every length from
   * 1 to goal; a round of length L shows for L*stepMs plus 220 ms of handover
   * and 550 ms between rounds, so effort = (G+1)/2 / (stepMs*(G+1)/2 + 770)
   * links per millisecond. */
  const effort = (level) =>
    ((level.goal + 1) / 2) / ((level.stepMs * (level.goal + 1) / 2) + 770) * 1000;
  const shipped = levels.slice(0, 20);
  const shippedMaxGoal = Math.max.apply(null, shipped.map((level) => level.goal));
  const shippedMinStep = Math.min.apply(null, shipped.map((level) => level.stepMs));
  const shippedMaxReverseGoal = Math.max.apply(null,
    shipped.filter((level) => level.reverse).map((level) => level.goal));
  const shippedMaxEffort = Math.max.apply(null, shipped.map(effort));
  const tierEfforts = tierIds.map((id) => effort(byId(id)));
  check("game-glyph-echo", "the tier's measured effort climbs: " +
      tierEfforts.map((e) => e.toFixed(1)).join(" -> ") + " links a second",
    tierEfforts.every((value, index) => index === 0 || value > tierEfforts[index - 1]),
    tierEfforts.map((e) => e.toFixed(3)).join(","));
  check("game-glyph-echo", "c21 is the length record: " + byId("c21").goal +
      " links against the shipped " + shippedMaxGoal,
    byId("c21").goal > shippedMaxGoal, byId("c21").goal + " vs " + shippedMaxGoal);
  check("game-glyph-echo", "c22 holds the summit length at the fastest plain pace: " +
      byId("c22").stepMs + " ms against the shipped " + shippedMinStep,
    byId("c22").goal === shippedMaxGoal && byId("c22").stepMs < shippedMinStep,
    byId("c22").stepMs + " vs " + shippedMinStep);
  check("game-glyph-echo", "c23 is the backwards record: " + byId("c23").goal +
      " mirrored links against the shipped " + shippedMaxReverseGoal,
    byId("c23").reverse && byId("c23").goal > shippedMaxReverseGoal,
    byId("c23").goal + " vs " + shippedMaxReverseGoal);
  check("game-glyph-echo", "c24 is the overall pace record and the sprint finale",
    byId("c24").reverse && byId("c24").stepMs < shippedMinStep &&
      byId("c24").flashMs < Math.min.apply(null, shipped.map((level) => level.flashMs || 300)) &&
      tierEfforts[3] > shippedMaxEffort,
    "stepMs " + byId("c24").stepMs + " vs " + shippedMinStep + ", effort " +
      tierEfforts[3].toFixed(1) + " vs " + shippedMaxEffort.toFixed(1));

  /* ---- stage the real panel in the stub DOM ---- */
  /* Earlier gates in this suite may have booted the shared echo panel, and
   * initGlyphEchoGame adds listeners rather than replacing them - so a
   * second boot on the same pads would run two live engines whose two
   * independent deals interleave in the flash log and whose two campaign
   * snapshots overwrite each other's save records. The staging therefore
   * REMOVES any stale panel elements and builds a fresh set, then boots
   * the module EXACTLY ONCE on the fresh pads, after the classList hook
   * is in place: the earlier gate's engine is left holding detached
   * elements it can never fire again, and this gate's log sees one deal. */
  const doc = env.document;
  ["echoLevelSel", "echoStartBtn", "echoBoard", "echoRound", "echoLives",
    "echoLongest", "echoResult", "echoBest", "echoPad0", "echoPad1",
    "echoPad2", "echoPad3", "echoPanel", "echoStage"].forEach((id) => {
    const stale = doc.getElementById(id);
    if (stale && stale.parentNode) {
      stale.parentNode.removeChild(stale);
    }
  });
  const make = (id, tag) => {
    const el = doc.createElement(tag || "div");
    el.id = id;
    doc.body.appendChild(el);
    return el;
  };
  const panelEl = make("echoPanel", "section");
  const sel = make("echoLevelSel", "select");
  const start = make("echoStartBtn", "button");
  make("echoBoard");
  make("echoRound");
  make("echoLives");
  make("echoLongest");
  const resultEl = make("echoResult");
  make("echoBest");
  const pads = [0, 1, 2, 3].map((n) => make("echoPad" + n, "button"));

  const cleared = {};
  for (let c = 1; c <= 20; c += 1) cleared["c" + c] = { stars: 3, best: 0 };
  env.store.set("glyph-echo-campaign", JSON.stringify({ v: 1, cleared: cleared }));

  /* Every class add is recorded with the virtual clock, so the gate reads
   * the chain exactly the way a player reads the lights. The hook is in
   * place before the one boot; the engine reads pad.classList at flash
   * time, so every is-lit add it will ever make flows through the log. */
  const log = [];
  pads.forEach((pad, index) => {
    const real = pad.classList;
    Object.defineProperty(pad, "classList", {
      get() {
        return {
          add(...names) {
            real.add(...names);
            if (names.includes("is-lit")) {
              log.push({ pad: index, at: env.clock.now });
            }
          },
          remove(...names) {
            real.remove(...names);
          },
          contains(name) {
            return real.contains(name);
          },
          toggle(name, force) {
            return real.toggle(name, force);
          },
        };
      },
    });
  });

  App.initGlyphEchoGame();

  /* hand: { slips } spends deliberate wrong taps on the first chain;
   * { mirror: false } echoes forwards; { stopShort } plays every round
   * perfectly but stops one link before the goal on the final chain. By
   * default the hand echoes in the order the rung itself wants - mirrored
   * exactly when the rung is a backwards chime. */
  function echoRun(levelId, hand) {
    const mirror = hand.mirror !== undefined ? hand.mirror : !!byId(levelId).reverse;
    log.length = 0;
    sel.value = levelId;
    env.dispatch(sel, "change");
    start.click();
    let spent = 0;
    let stars = null;
    let outOfLives = false;
    let stalled = false;
    let stopped = false;
    let turnAt = 0;
    for (let guard = 0; guard < 400000; guard += 1) {
      const text = resultEl.textContent;
      const won = /(\d)\/3 stars/.exec(text);
      if (won && /lives to spare/.test(text)) {
        stars = Number(won[1]);
        break;
      }
      if (/Out of lives/.test(text)) {
        outOfLives = true;
        break;
      }
      if (/Your turn/.test(text)) {
        if (stopped) {
          /* The goal-round hand is frozen one link short: the engine must
           * never clear it. Give it thirty virtual seconds, then stop. */
          if (env.clock.now - turnAt > 30000) {
            stalled = true;
            break;
          }
          env.timers.advance(600);
          continue;
        }
        const chain = log.map((entry) => entry.pad);
        log.length = 0;
        const taps = mirror ? chain.slice().reverse() : chain.slice();
        const goal = byId(levelId).goal;
        const short = hand.stopShort && chain.length >= goal;
        const limit = short ? taps.length - 1 : taps.length;
        if (short) {
          stopped = true;
          turnAt = env.clock.now;
        }
        let tapIndex = 0;
        while (tapIndex < limit || spent < hand.slips) {
          if (spent < hand.slips) {
            /* a deliberate wrong tap: anything but the pad the rung wants
             * (when the log runs dry, any pad but the first will do) */
            const want = taps[tapIndex] === undefined ? 3 : taps[tapIndex];
            pads[(want + 1) % 4].click();
            spent += 1;
            break;
          }
          pads[taps[tapIndex]].click();
          tapIndex += 1;
        }
        /* step over the between-round pause so the stale turn text cannot
         * be read twice; flashes fired inside this step are kept */
        log.length = 0;
        env.timers.advance(600);
        continue;
      }
      /* 50ms steps: the driver reads text transitions, not exact timings. */
      env.timers.advance(50);
    }
    return { stars, outOfLives, stalled };
  }

  const readSave = () => JSON.parse(env.store.get("glyph-echo-campaign") || "{}");

  /* The cleared save a player brings out of the tier - c1..c24, three stars
   * each - re-written immediately before every loss run. The proof is that
   * the LOSS itself leaves the record untouched (the loss path never
   * writes the save), not that earlier noise in the store did. */
  const writeClearedSave = () => {
    const clearedSave = {};
    for (let c = 1; c <= 24; c += 1) clearedSave["c" + c] = { stars: 3, best: 0 };
    env.store.set("glyph-echo-campaign",
      JSON.stringify({ v: 1, cleared: clearedSave }));
  };

  for (const id of tierIds) {
    const perfect = echoRun(id, {});
    check("game-glyph-echo", id + ": a perfect-memory hand rings three stars",
      perfect.stars === 3, JSON.stringify(perfect));
    const steady = echoRun(id, { slips: 1 });
    check("game-glyph-echo", id + ": one slip lands two stars",
      steady.stars === 2, JSON.stringify(steady));
    const shaky = echoRun(id, { slips: 2 });
    check("game-glyph-echo", id + ": two slips land one star",
      shaky.stars === 1, JSON.stringify(shaky));
    const mash = echoRun(id, { slips: 3 });
    check("game-glyph-echo", id + ": three wrong taps end the chime - no rung is free",
      mash.outOfLives, JSON.stringify(mash));
    check("game-glyph-echo", id + " is recorded cleared in the campaign save",
      readSave().cleared[id] && readSave().cleared[id].stars === 3,
      JSON.stringify(readSave().cleared[id] || null));

    /* Goal length is load-bearing: one link short of the goal never wins.
     * The essence is "never clears" - stars stay null and the hand ends
     * stalled OR out of lives (an engine that auto-fails a frozen turn
     * still never cleared the rung). */
    const short = echoRun(id, { stopShort: true });
    check("game-glyph-echo", id + ": a hand that stops one link short of the goal " +
        "never clears", short.stars === null && (short.stalled || short.outOfLives),
      JSON.stringify(short));

    const index = tierIds.indexOf(id);
    if (index + 1 < tierIds.length) {
      const nextId = tierIds[index + 1];
      sel.value = nextId;
      env.dispatch(sel, "change");
      check("game-glyph-echo", nextId + " unlocks once " + id + " is cleared",
        sel.value === nextId, sel.value);
    }
  }

  /* Reverse is load-bearing on c23 and c24: the forwards hand loses. The
   * deal is Math.random-driven, so the seed is swapped for a deterministic
   * one; any chain that is not a palindrome kills the forwards hand within
   * its three lives, and the scan takes the first seed that does. The
   * cleared save is re-written before each seeded run so the "stays
   * cleared" check below reads only what that loss did. */
  for (const id of ["c23", "c24"]) {
    const original = Math.random;
    let found = null;
    for (let seed = 1; seed <= 50 && !found; seed += 1) {
      let value = seed >>> 0;
      Math.random = function () {
        value = (value + 0x6d2b79f5) >>> 0;
        let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
        mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
      };
      try {
        writeClearedSave();
        const run = echoRun(id, { mirror: false });
        if (run.outOfLives) {
          found = { seed, run };
        }
      } finally {
        Math.random = original;
      }
    }
    check("game-glyph-echo", id + ": the forwards hand loses its lives - the backwards " +
        "order is the lesson (seeded deal " + (found ? found.seed : "-") + ")",
      !!found, JSON.stringify(found ? found.run : { outOfLives: false }));
    check("game-glyph-echo", id + " stays cleared after the forwards hand's loss",
      readSave().cleared[id] && readSave().cleared[id].stars === 3,
      JSON.stringify(readSave().cleared[id] || null));
  }

  /* Copy travels with the module. */
  const copyKeys = ["echoL21", "echoL22", "echoL23", "echoL24"];
  const copyProblems = copyKeys.filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-glyph-echo", "the four chime names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
};
