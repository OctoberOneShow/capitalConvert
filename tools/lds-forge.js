#!/usr/bin/env node
/* Love and Deepspace route forge + verifier.
 *
 * A route is a turn budget, a resonance target and three star bands measured in
 * turns used. The board is not hidden: each encounter names the move that
 * answers it, so a route is proved by driving it - draws the encounter, answer
 * it or spend the turn on energy, bank the Evol skill when the gauge is full -
 * and asking how often a mission wins, and how often it wins inside the
 * three-star band. The engine's own numbers are copied here: move stats, the
 * match bonus and its chain, the pressure penalty, each partner's boost, and
 * the gates (energy above zero, trust at 24 or more, resonance at the target).
 *
 * Usage:
 *   node tools/lds-forge.js list
 *   node tools/lds-forge.js forge
 */
"use strict";

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "assets", "app", "game-love-deepspace.js");

function loadAll() {
  const src = fs.readFileSync(FILE, "utf8").replace(/^﻿/, "");
  const slice = src.slice(src.indexOf("var ldsRoutes = ["), src.indexOf("var ldsPartners = ["));
  const partnerSlice = src.slice(src.indexOf("var ldsPartners = ["), src.indexOf("  var ldsMoves = ["));
  const movesSlice = src.slice(src.indexOf("var ldsMoves = ["), src.indexOf("  var ldsEvents = ["));
  const eventSlice = src.slice(src.indexOf("var ldsEvents = ["), src.indexOf("  function clamp("));
  /* eslint-disable-next-line no-new-func */
  const routes = new Function("return " + slice.replace("var ldsRoutes = ", "").replace(/;\s*$/, ""))();
  /* eslint-disable-next-line no-new-func */
  const partners = new Function("return " + partnerSlice.replace("var ldsPartners = ", "").replace(/;\s*$/, ""))();
  /* eslint-disable-next-line no-new-func */
  const moves = new Function("return " + movesSlice.replace("var ldsMoves = ", "").replace(/;\s*$/, ""))();
  /* eslint-disable-next-line no-new-func */
  const events = new Function("return " + eventSlice.replace("var ldsEvents = ", "").replace(/;\s*$/, ""))();
  /* ldsAdvance calls the module's clamp, so that helper has to travel with it. */
  const clampSrc = src.slice(src.indexOf("  function clamp("), src.indexOf("  function byId("));
  /* eslint-disable-next-line no-new-func */
  const advance = new Function(
    clampSrc +
      "\nreturn " +
      src.slice(src.indexOf("function ldsAdvance("), src.indexOf("function ldsReadAlbum(")).replace(/\}\s*$/, "}"),
  )();
  return { routes: routes, partners: partners, moves: moves, events: events, advance: advance };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/* One mission. The policy: answer the encounter while the team can afford it,
 * spend a turn on energy when energy is running thin, and fire Evol whenever
 * the gauge is full - the three choices the module itself shows the player. */
function playRoute(api, route, partner, rng, policy) {
  let state = {
    energy: 100,
    trust: 100,
    resonance: 0,
    turn: 0,
    charge: 0,
    chain: 0,
    done: false,
    outcome: "",
  };
  for (let guard = 0; guard < route.turns + 2 && !state.done; guard += 1) {
    const encounter = api.events[Math.floor(rng() * api.events.length)];
    let move = api.moves.find((entry) => entry.id === encounter.ideal);
    const ideal = api.moves.find((entry) => entry.id === encounter.ideal);
    const idealGain = ideal.stats.resonance + 8 + Math.min(state.chain, 3) * 2;
    const need = route.target - state.resonance;
    /* Evol first: it costs a turn either way and it pays the most resonance. */
    if (state.charge >= 3 && partner.skill.resonance >= idealGain - 4) {
      move = { id: "skill" };
    } else if (state.energy <= policy.energyFloor + ideal.stats.energy * -1) {
      move = api.moves.find((entry) => entry.id === "recover");
    } else if (state.trust <= policy.trustFloor && need > 0) {
      const heart = api.moves.find((entry) => entry.id === "heart");
      if (state.energy + heart.stats.energy > 0) move = heart;
    }
    const next = api.advance(state, move, partner, encounter, route);
    if (next === state) {
      /* Skill with an empty gauge: fall back to answering the encounter. */
      const fallback = api.advance(state, ideal, partner, encounter, route);
      state = fallback;
    } else {
      state = next;
    }
  }
  return state;
}

function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POLICIES = [
  { energyFloor: 18, trustFloor: 30 },
  { energyFloor: 26, trustFloor: 34 },
  { energyFloor: 34, trustFloor: 38 },
  { energyFloor: 42, trustFloor: 42 },
];

/* Measure a route across every partner and every policy, over seeded draws. */
function measure(api, route, trials) {
  let best = null;
  api.partners.forEach(function (partner) {
    POLICIES.forEach(function (policy) {
      let wins = 0;
      let three = 0;
      let two = 0;
      for (let trial = 0; trial < (trials || 400); trial += 1) {
        const rng = mulberry(trial * 7919 + route.target * 31 + partner.id.length);
        const state = playRoute(api, route, partner, rng, policy);
        if (state.outcome !== "win") continue;
        wins += 1;
        if (state.turn <= route.stars[0]) three += 1;
        if (state.turn <= route.stars[1]) two += 1;
      }
      const total = trials || 400;
      const score = { wins: (100 * wins) / total, three: (100 * three) / total, two: (100 * two) / total };
      if (!best || score.wins > best.score.wins || (score.wins === best.score.wins && score.three > best.score.three)) {
        best = { partner: partner.id, policy: policy, score: score };
      }
    });
  });
  return best;
}

function main() {
  const mode = process.argv[2] || "list";
  const api = loadAll();

  if (mode === "list") {
    const t0 = Date.now();
    api.routes.forEach(function (route) {
      const best = measure(api, route, 400);
      console.log(
        (best.score.wins >= 60 && best.score.three >= 8 ? "ok  " : "FAIL") +
          "  " + route.id +
          "  turns " + route.turns +
          "  target " + route.target +
          "  bands " + route.stars.join("/") +
          "  wins " + best.score.wins.toFixed(0) + "%" +
          "  3-star " + best.score.three.toFixed(0) + "%" +
          "  2-star " + best.score.two.toFixed(0) + "%" +
          "  (" + best.partner + ")",
      );
    });
    console.log("measured in " + (Date.now() - t0) + "ms");
    return;
  }

  if (mode === "forge") {
    /* The ladder continues the shipped shape: one more turn per route, ten more
     * resonance, and the bands sitting three, two and one turn under the budget
     * - the same offset every shipped route uses. 120 is the resonance ceiling,
     * so the last route asks for nearly all of it. */
    const brief = [
      { id: "lds9", labelKey: "ldsRoute9", turns: 12, target: 120, stars: [9, 10, 11] },
      { id: "lds10", labelKey: "ldsRoute10", turns: 12, target: 116, stars: [9, 10, 11] },
      { id: "lds11", labelKey: "ldsRoute11", turns: 11, target: 120, stars: [8, 9, 10] },
      { id: "lds12", labelKey: "ldsRoute12", turns: 11, target: 114, stars: [8, 9, 10] },
      { id: "lds13", labelKey: "ldsRoute13", turns: 10, target: 120, stars: [7, 8, 9] },
      { id: "lds14", labelKey: "ldsRoute14", turns: 10, target: 112, stars: [7, 8, 9] },
      { id: "lds15", labelKey: "ldsRoute15", turns: 9, target: 118, stars: [6, 7, 8] },
      { id: "lds16", labelKey: "ldsRoute16", turns: 9, target: 110, stars: [6, 7, 8] },
      { id: "lds17", labelKey: "ldsRoute17", turns: 8, target: 116, stars: [5, 6, 7] },
      { id: "lds18", labelKey: "ldsRoute18", turns: 8, target: 108, stars: [5, 6, 7] },
      { id: "lds19", labelKey: "ldsRoute19", turns: 7, target: 112, stars: [4, 5, 6] },
      { id: "lds20", labelKey: "ldsRoute20", turns: 7, target: 104, stars: [4, 5, 6] },
      { id: "lds21", labelKey: "ldsRoute21", turns: 7, target: 108, stars: [4, 5, 6] },
      { id: "lds22", labelKey: "ldsRoute22", turns: 6, target: 94, stars: [3, 4, 5] },
      { id: "lds23", labelKey: "ldsRoute23", turns: 6, target: 88, stars: [3, 4, 5] },
      { id: "lds24", labelKey: "ldsRoute24", turns: 6, target: 82, stars: [3, 4, 5] },
    ];
    brief.forEach(function (route) {
      const best = measure(api, route, 400);
      console.log(
        route.id +
          ": turns " + route.turns +
          ", target " + route.target +
          ", bands " + route.stars.join("/") +
          "  wins " + best.score.wins.toFixed(0) + "%" +
          "  3-star " + best.score.three.toFixed(0) + "%" +
          "  2-star " + best.score.two.toFixed(0) + "%" +
          "  (" + best.partner + ")",
      );
      console.log(
        '    { id: "' + route.id + '", labelKey: "' + route.labelKey +
          '", turns: ' + route.turns + ", target: " + route.target +
          ", stars: [" + route.stars.join(", ") + "] },",
      );
    });
  }
}

module.exports = { loadAll, measure, playRoute };

if (require.main === module) {
  main();
}
