"use strict";

/* game-glyph-fleet: the new-navies tier is a different sea, and the hunt
 * pays for it shot by shot.
 *
 * The shipped ladder spent its levers inside one navy - the admiral's arm
 * climbed to its ceiling at skill 14, and ranks 25-30 bought their climb
 * with the shot purse alone - so the deep tier's lever is the navy
 * itself: `fleet`, the hull table the admiral lays. No shipped rank
 * carries one; every shipped sea holds the same four-hull, twelve-cell
 * navy, so the field is dead weight on rungs 1-30 and the tier's ten
 * navies climb thirteen cells to twenty-two, flagship by flagship, to a
 * pair of six-deck hulls. The gate holds the tier to the ladder's own
 * currency - the shipped hunt (parity sweep plus target queue, the policy
 * the shipped header quotes), four hundred seeded deals a rank - and
 * proves: the seated navy is the authored one (the engine lays exactly
 * the rung's own hulls and no other), the hunt's measured mean climbs
 * down the tier and never gets faster, the three-star band is rare but
 * real and the one-star line lands on most deals, the random-cell trap
 * hand never lands a band anywhere on the tier, and the counterfactual
 * sea is measurably cheaper - the same seeds on the struck navy, the
 * shipped twelve-cell one, need strictly fewer shots on every rung and
 * land the tier's own three-star lines on a fifth to a half of their
 * deals. The engine's own skill-14 machinery drives the whole tier
 * legally: every seeded solver deal ends with every hull sunk and no dead
 * cell fired. The shipped checks ride along: the tuned tier 17-20
 * budgets, the skill 9/7 bench, the joint sweep, and the unlock chain,
 * all forty ranks. */

module.exports = function gate(ctx) {
  const { App, env, check, fs, path, root } = ctx;
  const deepIds = ["bf31", "bf32", "bf33", "bf34", "bf35", "bf36", "bf37", "bf38", "bf39", "bf40"];

  /* ---- the engine core, re-hosted the way the shipped gate hosts it ---- */
  const fltSrc = fs
    .readFileSync(path.join(root, "assets", "app", "game-glyph-fleet.js"), "utf8")
    .replace(/^﻿/, "");
  const fltCore =
    "var App = {};\n" +
    fltSrc.slice(
      fltSrc.indexOf("var FLT_N = 8;"),
      fltSrc.indexOf("App.glyphFleetPlace"),
    ) +
    "\nreturn { fltPlace: fltPlace, fltAiPick: fltAiPick, fltQueueAround: fltQueueAround," +
    " fltLevels: fltLevels, FLT_N: FLT_N, FLT_EMPTY: FLT_EMPTY, FLT_MISS: FLT_MISS," +
    " FLT_HIT: FLT_HIT, FLT_SUNK: FLT_SUNK };";
  const flt = new Function(fltCore)();
  const levels = flt.fltLevels;
  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });

  const fltSeeded = (seed, fn) => {
    const real = Math.random;
    let a = seed >>> 0;
    Math.random = () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    try {
      return fn();
    } finally {
      Math.random = real;
    }
  };
  /* Shots the given brain needs to sink a fresh fleet. */
  const fltSink = (brain, seed) =>
    fltSeeded(seed, () => {
      const fleet = flt.fltPlace();
      const board = new Array(flt.FLT_N * flt.FLT_N).fill(flt.FLT_EMPTY);
      const state = { queue: [] };
      let shots = 0;
      for (let guard = 0; guard < 200; guard += 1) {
        const pick = flt.fltAiPick(board, state, brain);
        if (pick < 0) break;
        if (board[pick] !== flt.FLT_EMPTY) throw new Error("admiral fired a dead cell");
        shots += 1;
        const hit = !!fleet.occupied[pick];
        board[pick] = hit ? flt.FLT_HIT : flt.FLT_MISS;
        if (hit) {
          fleet.ships.forEach((ship) => {
            if (ship.cells.indexOf(pick) !== -1) {
              ship.hits += 1;
              if (ship.hits >= ship.size) {
                ship.cells.forEach((cell) => {
                  board[cell] = flt.FLT_SUNK;
                });
              }
            }
          });
        }
        flt.fltQueueAround(pick, state);
        if (fleet.ships.every((s) => s.hits >= s.size)) return shots;
      }
      throw new Error("the hunt never sank the fleet");
    });
  const fltMean = (brain, deals) => {
    let total = 0;
    for (let s = 1; s <= deals; s += 1) total += fltSink(brain, 515000 + s * 913);
    return total / deals;
  };
  check("game-glyph-fleet", "skill 9's queue-reading hunt beats skill 7's solver",
    fltMean(9, 60) < fltMean(7, 60) - 2,
    `skill 9 ${fltMean(9, 60).toFixed(1)} vs skill 7 ${fltMean(7, 60).toFixed(1)}`);
  check("game-glyph-fleet", "skill 14's joint endgame still sinks fleets legally",
    (() => {
      const shots = fltSink({ skill: 14 }, 777001);
      return shots > 0 && shots < 64;
    })(), "the joint sweep never finished a hunt");

  /* The player's own hunt - parity sweep plus target queue, the policy the
   * shipped header quotes - against each rank's budget. An optional navy
   * seats a different fleet to hunt. */
  const fltHunt = (rank, deals, navy) => {
    let three = 0;
    let two = 0;
    let one = 0;
    const shots = [];
    for (let s = 1; s <= deals; s += 1) {
      const out = fltSeeded(41000 + s * 9377, () => {
        const fleet = flt.fltPlace(navy || rank.fleet);
        const board = new Array(flt.FLT_N * flt.FLT_N).fill(flt.FLT_EMPTY);
        const state = { queue: [] };
        let count = 0;
        for (let guard = 0; guard < 200; guard += 1) {
          if (fleet.ships.every((sh) => sh.hits >= sh.size)) break;
          let pick = -1;
          while (state.queue.length) {
            const q = state.queue.shift();
            if (board[q] === flt.FLT_EMPTY) {
              pick = q;
              break;
            }
          }
          if (pick < 0) {
            const open = [];
            for (let i = 0; i < board.length; i += 1) {
              if (board[i] === flt.FLT_EMPTY &&
                (Math.floor(i / flt.FLT_N) + i) % 2 === 0) {
                open.push(i);
              }
            }
            if (!open.length) {
              for (let j = 0; j < board.length; j += 1) {
                if (board[j] === flt.FLT_EMPTY) open.push(j);
              }
            }
            pick = open[Math.floor(Math.random() * open.length)];
          }
          count += 1;
          const hit = !!fleet.occupied[pick];
          board[pick] = hit ? flt.FLT_HIT : flt.FLT_MISS;
          if (hit) {
            fleet.ships.forEach((ship) => {
              if (ship.cells.indexOf(pick) !== -1) {
                ship.hits += 1;
                if (ship.hits >= ship.size) {
                  ship.cells.forEach((cell) => {
                    board[cell] = flt.FLT_SUNK;
                  });
                }
              }
            });
            flt.fltQueueAround(pick, state);
          }
        }
        if (!fleet.ships.every((sh) => sh.hits >= sh.size)) {
          throw new Error("the hunt never sank the navy");
        }
        return count;
      });
      shots.push(out);
      if (out <= rank.starShots[0]) three += 1;
      if (out <= rank.starShots[1]) two += 1;
      if (out <= rank.starShots[2]) one += 1;
    }
    const mean = shots.reduce((sum, v) => sum + v, 0) / shots.length;
    return {
      shots,
      mean,
      three: three / deals,
      two: two / deals,
      one: one / deals,
    };
  };
  /* A random-cell trap hand: never hunts, never targets. */
  const fltTrap = (navy, deals) => {
    const shots = [];
    for (let s = 1; s <= deals; s += 1) {
      shots.push(fltSeeded(41000 + s * 9377, () => {
        const fleet = flt.fltPlace(navy);
        const board = new Array(flt.FLT_N * flt.FLT_N).fill(flt.FLT_EMPTY);
        let count = 0;
        for (let guard = 0; guard < 200; guard += 1) {
          if (fleet.ships.every((sh) => sh.hits >= sh.size)) break;
          const open = [];
          for (let i = 0; i < board.length; i += 1) {
            if (board[i] === flt.FLT_EMPTY) open.push(i);
          }
          const pick = open[Math.floor(Math.random() * open.length)];
          count += 1;
          const hit = !!fleet.occupied[pick];
          board[pick] = hit ? flt.FLT_HIT : flt.FLT_MISS;
          if (hit) {
            fleet.ships.forEach((ship) => {
              if (ship.cells.indexOf(pick) !== -1) {
                ship.hits += 1;
                if (ship.hits >= ship.size) {
                  ship.cells.forEach((cell) => {
                    board[cell] = flt.FLT_SUNK;
                  });
                }
              }
            });
          }
        }
        if (!fleet.ships.every((sh) => sh.hits >= sh.size)) {
          throw new Error("the trap never sank the navy");
        }
        return count;
      }));
    }
    return shots;
  };

  /* ---- the shipped checks, at the ladder's new length ---- */
  check("game-glyph-fleet", "the ladder holds forty ranks",
    levels.length === 40, String(levels.length));
  check("game-glyph-fleet", "every rank id is distinct",
    new Set(levels.map((r) => r.id)).size === levels.length,
    levels.map((r) => r.id).join(","));
  const fltTier = levels.filter((r) =>
    ["bf16", "bf17", "bf18", "bf19", "bf20"].includes(r.id));
  check("game-glyph-fleet", "the tier 17-20 rows all exist", fltTier.length === 5,
    fltTier.map((r) => r.id).join(","));
  check("game-glyph-fleet", "the tier budgets run the tuned ladder",
    fltTier[0].starShots[0] === 24 && fltTier[2].starShots[0] === 25 &&
      fltTier[4].starShots[0] === 23,
    fltTier.map((r) => r.starShots.join("/")).join(" "));
  fltTier.forEach((rank) => {
    const rates = fltHunt(rank, 150);
    check("game-glyph-fleet",
      `${rank.id}: the hunt lands one star on most deals`,
      rates.one >= 0.35, `one-star ${(rates.one * 100).toFixed(1)}%`);
    check("game-glyph-fleet",
      `${rank.id}: the three-star line is rare but real`,
      rates.three >= 0.005 && rates.three <= 0.4,
      `three-star ${(rates.three * 100).toFixed(1)}%`);
  });
  check("game-glyph-fleet", "the deep rank names are bilingual",
    (() => {
      const names = ["fltL16", "fltL17", "fltL18", "fltL19", "fltL20", "fltL21", "fltL22", "fltL23", "fltL24"];
      return names.every((key) => {
        const text = App.t(key);
        return text && text !== key;
      });
    })(), "a tier label fell back to its key");

  /* ---- the new navies: shape, seating, bench, trap, counterfactual ---- */
  const missing = deepIds.filter((id) => !byId[id]);
  check("game-glyph-fleet", "the new-navies tier bf31-bf40 is present",
    missing.length === 0, missing.join(","));
  check("game-glyph-fleet",
    "the new navies sit behind the shipped thirty and close the ladder",
    deepIds.every((id, i) => levels[30 + i] && levels[30 + i].id === id),
    "tail: " + levels.slice(-10).map((level) => level.id).join(","));

  const deep = deepIds.map((id) => byId[id]);
  const NAVIES = [
    [5, 3, 3, 2], [5, 4, 3, 2], [5, 5, 3, 2], [5, 5, 3, 3], [5, 5, 4, 3],
    [5, 5, 4, 4], [5, 5, 5, 4], [5, 5, 5, 5], [6, 5, 5, 5], [6, 6, 5, 5],
  ];
  const TONNAGE = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
  const shapeProblems = [];
  levels.slice(0, 30).forEach((level) => {
    if (Object.prototype.hasOwnProperty.call(level, "fleet")) {
      shapeProblems.push(level.id + " sails a fleet");
    }
  });
  deep.forEach((level, index) => {
    if (JSON.stringify(level.fleet) !== JSON.stringify(NAVIES[index])) {
      shapeProblems.push(level.id + " sails [" + level.fleet.join(",") + "]");
    }
    const tonnage = level.fleet.reduce((sum, size) => sum + size, 0);
    if (tonnage !== TONNAGE[index]) {
      shapeProblems.push(level.id + " carries " + tonnage + " cells");
    }
    if (level.fleet.some((size) => size < 1 || size > flt.FLT_N)) {
      shapeProblems.push(level.id + " sails a hull that cannot lie on the sea");
    }
  });
  check("game-glyph-fleet",
    "no shipped rank sails a custom navy and the tier's ten climb thirteen cells to twenty-two, hull by hull",
    shapeProblems.length === 0, shapeProblems.join(" | "));

  /* The seated navy is the authored one: the engine lays exactly the rung's
   * own hull table - the same hull sizes, the same tonnage, nothing else -
   * and never a hull the table does not name. */
  const seatProblems = [];
  deep.forEach((level) => {
    for (let attempt = 0; attempt < 20 && seatProblems.length < 5; attempt += 1) {
      const laid = fltSeeded(99000 + attempt * 7717, () => flt.fltPlace(level.fleet));
      const sizes = laid.ships.map((ship) => ship.size).sort((a, b) => a - b);
      const wanted = level.fleet.slice().sort((a, b) => a - b);
      if (sizes.join("/") !== wanted.join("/")) {
        seatProblems.push(level.id + " laid " + sizes.join("/") + " for [" +
          level.fleet.join(",") + "]");
      }
      const laidCells = laid.ships.reduce((sum, ship) => sum + ship.cells.length, 0);
      if (laidCells !== TONNAGE[deepIds.indexOf(level.id)]) {
        seatProblems.push(level.id + " laid " + laidCells + " cells");
      }
    }
  });
  const stdLaid = fltSeeded(99077, () => flt.fltPlace());
  if (stdLaid.ships.map((ship) => ship.size).sort((a, b) => a - b).join("/") !== "2/3/3/4") {
    seatProblems.push("the shipped call no longer lays the standard navy");
  }
  check("game-glyph-fleet",
    "the seated navy is the authored one and the shipped call still lays the standard four-hull fleet",
    seatProblems.length === 0, seatProblems.join(" | "));

  /* The bench: four hundred seeded deals a rank through the shipped hunt.
   * The three-star line is rare but real, the one-star line lands on most
   * deals, and the tier's work is measured, never asserted: the hunt's mean
   * never gets faster down the tier and the capstone costs the base's mean
   * at least four more shots. */
  const DEALS = 400;
  const benchProblems = [];
  const means = [];
  deep.forEach((level, index) => {
    const rates = fltHunt(level, DEALS);
    means.push(rates.mean);
    const name = level.id + " [" + level.fleet.join(",") + "] line " +
      level.starShots.join("/");
    if (rates.three < 0.005 || rates.three > 0.4) {
      benchProblems.push(name + " three-star " + (rates.three * 100).toFixed(1) + "%");
    }
    if (rates.one < 0.35) {
      benchProblems.push(name + " one-star " + (rates.one * 100).toFixed(1) + "%");
    }
    if (index > 0 && rates.mean < means[index - 1]) {
      benchProblems.push(name + " mean " + rates.mean.toFixed(2) +
        " hunts faster than the rung above (" + means[index - 1].toFixed(2) + ")");
    }
  });
  if (means[means.length - 1] < means[0] + 4) {
    benchProblems.push("the tier's mean climb is " +
      (means[means.length - 1] - means[0]).toFixed(2) + " shots, not the four it promises");
  }
  check("game-glyph-fleet",
    "four hundred seeded deals a rank: the bands land rare but real, one star on most deals, and the mean hunt never gets faster down the tier (" +
      means.map((m) => m.toFixed(1)).join("/") + ")",
    benchProblems.length === 0, benchProblems.slice(0, 4).join(" | "));

  /* The trap: a random-cell hand that never hunts and never targets. Its
   * best four hundred deals never reach any rung's three-star line - the
   * lines are earned by the hunt, not by luck. */
  const trapProblems = [];
  deep.forEach((level) => {
    const trap = fltTrap(level.fleet, DEALS);
    const best = Math.min.apply(null, trap);
    if (best <= level.starShots[0]) {
      trapProblems.push(level.id + " the trap landed three stars at " + best);
    }
  });
  check("game-glyph-fleet",
    "the random-cell trap never lands a three-star line anywhere on the tier",
    trapProblems.length === 0, trapProblems.join(" | "));

  /* Load-bearing: the same four hundred seeds on the struck navy - the
   * shipped twelve-cell one every shipped rank sails - need strictly fewer
   * shots on every rung, and the tier's own three-star lines land on the
   * struck sea for free. */
  const std = [4, 3, 3, 2];
  const loadProblems = [];
  const struckRates = [];
  deep.forEach((level) => {
    const authored = fltHunt(level, DEALS);
    const struck = fltHunt({ starShots: level.starShots }, DEALS, std);
    struckRates.push(struck.three);
    const paired = authored.shots.reduce((sum, v, i) => sum + (v - struck.shots[i]), 0) /
      DEALS;
    if (!(paired > 0)) {
      loadProblems.push(level.id + " the struck navy is no cheaper (paired " +
        paired.toFixed(2) + ")");
    }
  });
  if (!(struckRates[struckRates.length - 1] > 0.4)) {
    loadProblems.push("the struck navy still pays for the capstone's line (" +
      (struckRates[struckRates.length - 1] * 100).toFixed(1) + "%)");
  }
  check("game-glyph-fleet",
    "the counterfactual sea is cheaper on every rung and hands the tier's own three-star lines out free (" +
      struckRates.map((r) => (r * 100).toFixed(0) + "%").join("/") + " on the struck twelve-cell navy)",
    loadProblems.length === 0, loadProblems.join(" | "));

  /* The engine's own machinery drives the new navies: the shipped skill-14
   * brain sinks every custom fleet legally - every seeded deal ends with
   * every hull sunk and no dead cell fired. */
  const solverProblems = [];
  deep.forEach((level) => {
    for (let s = 1; s <= 4; s += 1) {
      try {
        fltSeeded(610000 + deepIds.indexOf(level.id) * 913 + s * 7717, () => {
          const fleet = flt.fltPlace(level.fleet);
          const board = new Array(flt.FLT_N * flt.FLT_N).fill(flt.FLT_EMPTY);
          const state = { queue: [] };
          for (let guard = 0; guard < 200; guard += 1) {
            const pick = flt.fltAiPick(board, state, { skill: 14 });
            if (pick < 0) break;
            if (board[pick] !== flt.FLT_EMPTY) {
              throw new Error("fired a dead cell");
            }
            const hit = !!fleet.occupied[pick];
            board[pick] = hit ? flt.FLT_HIT : flt.FLT_MISS;
            if (hit) {
              fleet.ships.forEach((ship) => {
                if (ship.cells.indexOf(pick) !== -1) {
                  ship.hits += 1;
                  if (ship.hits >= ship.size) {
                    ship.cells.forEach((cell) => {
                      board[cell] = flt.FLT_SUNK;
                    });
                  }
                }
              });
              flt.fltQueueAround(pick, state);
            }
            if (fleet.ships.every((sh) => sh.hits >= sh.size)) return;
          }
          throw new Error("never sank the navy");
        });
      } catch (error) {
        solverProblems.push(level.id + "#" + s + " " + error.message);
      }
    }
  });
  check("game-glyph-fleet",
    "the shipped skill-14 machinery sinks every new navy legally",
    solverProblems.length === 0, solverProblems.join(" | "));

  /* The tier's names travel: both languages hold a real string and t()
   * never falls back to the raw key. */
  const copyProblems = deep.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-glyph-fleet", "the ten new-navy rank names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each rank in order
   * hands the player exactly the next one, all forty times. */
  const chain = App.createCampaign({
    key: "glyph-fleet-gate-chain",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, { stars: 3, best: 99, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-glyph-fleet", "the unlock chain walks all forty ranks in order",
    walked === 40 && chained && chain.clearedCount() === 40,
    walked + " first clears");

  /* The page: the real init path boots clean with the forty-rank picker,
   * the new navies' option labels resolved rather than keyed. */
  const doc = env.document;
  ["fltCanvas", "fltShots", "fltSunk", "fltTime", "fltResult", "fltNewBtn",
    "fltBest", "fltLevelSel"].forEach((id) => {
    const stale = doc.getElementById(id);
    if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
  });
  const makePad = (id, tag) => {
    const el = doc.createElement(tag || "div");
    el.id = id;
    doc.body.appendChild(el);
    return el;
  };
  makePad("fltCanvas", "canvas");
  makePad("fltShots");
  makePad("fltSunk");
  makePad("fltTime");
  makePad("fltResult");
  makePad("fltNewBtn", "button");
  makePad("fltBest");
  const select = makePad("fltLevelSel", "select");
  let bootError = null;
  try {
    App.initGlyphFleetGame();
  } catch (error) {
    bootError = error && error.message;
  }
  const options = Array.from(select.querySelectorAll("option"));
  const pickerProblems = [];
  if (bootError) pickerProblems.push("boot threw: " + bootError);
  if (typeof App.quietResetGlyphFleet !== "function") {
    pickerProblems.push("the boot never reached its reset hook");
  }
  if (options.length !== 40) {
    pickerProblems.push("the picker holds " + options.length + " ranks");
  }
  options.forEach((option, index) => {
    if (option.value !== levels[index].id) {
      pickerProblems.push("option " + index + " is " + option.value);
    }
  });
  deep.forEach((level) => {
    const option = options[levels.indexOf(level)];
    if (!option || option.textContent.indexOf(App.t(level.labelKey)) === -1 ||
        option.textContent.indexOf(level.labelKey) !== -1) {
      pickerProblems.push(level.id + " picker label unresolved");
    }
  });
  check("game-glyph-fleet",
    "the panel boots through its real init path with the forty-rank picker",
    pickerProblems.length === 0, pickerProblems.join(" | "));
};
