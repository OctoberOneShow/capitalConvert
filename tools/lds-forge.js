#!/usr/bin/env node
/* Love and Deepspace route forge + verifier.
 *
 * A route is a turn budget, a resonance target and three star bands measured in
 * turns used. The board is not hidden: each encounter names the move that
 * answers it, so a route is proved by driving it - draws the encounter, answer
 * it or spend the turn on energy, bank the Evol skill when the gauge is full -
 * and asking how often a mission wins, and how often it wins inside the
 * three-star band. The engine's own numbers are copied here: the mission's
 * starting strength (72 energy, 56 trust - startRoute's own values), the move
 * stats, the match bonus and its chain, the pressure penalty, each partner's
 * boost, and the gates (energy above zero, trust at 24 or more, resonance at
 * the target).
 *
 * Usage:
 *   node tools/lds-forge.js list     measure every shipped route
 *   node tools/lds-forge.js forge    print the tier rows the ladder shipped
 *   node tools/lds-forge.js summit   the sweep that chose the summit economy
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
 * the gauge is full - the three choices the module itself shows the player.
 * The mission starts at the strength startRoute deals: 72 energy, 56 trust. */
function playRoute(api, route, partner, rng, policy) {
  let state = {
    energy: 72,
    trust: 56,
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

/* The cut-bench hand: a rest-heavy crew that refills energy long before the
 * expert floors ask for it. On a six-turn clock the spare turn forgives every
 * extra recover; on the summit's five it does not - which is what makes the
 * clock the load-bearing lever. */
const NERVOUS = [{ energyFloor: 54, trustFloor: 44 }];

/* Measure a route across every partner and every policy, over seeded draws.
 * Reports the best win line and, separately, the best three-star line - the
 * summit bands are rare enough that they no longer ride the win-best hand. */
function measure(api, route, trials, policies) {
  let best = null;
  let bestThree = null;
  (policies || POLICIES).forEach(function (policy) {
    api.partners.forEach(function (partner) {
      let wins = 0;
      let three = 0;
      let two = 0;
      const total = trials || 400;
      for (let trial = 0; trial < total; trial += 1) {
        const rng = mulberry(trial * 7919 + route.target * 31 + partner.id.length);
        const state = playRoute(api, route, partner, rng, policy);
        if (state.outcome !== "win") continue;
        wins += 1;
        if (state.turn <= route.stars[0]) three += 1;
        if (state.turn <= route.stars[1]) two += 1;
      }
      const score = { wins: (100 * wins) / total, three: (100 * three) / total, two: (100 * two) / total };
      if (!best || score.wins > best.score.wins || (score.wins === best.score.wins && score.three > best.score.three)) {
        best = { partner: partner.id, policy: policy, score: score };
      }
      if (
        !bestThree || score.three > bestThree.score.three ||
        (score.three === bestThree.score.three && score.wins > bestThree.score.wins)
      ) {
        bestThree = { partner: partner.id, policy: policy, score: score };
      }
    });
  });
  best.bestThree = bestThree;
  return best;
}

/* The nervous hand's best win share over partners - the cut test's bench. */
function nervousShare(api, route, trials) {
  let best = 0;
  api.partners.forEach(function (partner) {
    NERVOUS.forEach(function (policy) {
      let wins = 0;
      const total = trials || 400;
      for (let trial = 0; trial < total; trial += 1) {
        const rng = mulberry(trial * 7919 + route.target * 31 + partner.id.length + policy.energyFloor * 131);
        const state = playRoute(api, route, partner, rng, policy);
        if (state.outcome === "win") wins += 1;
      }
      best = Math.max(best, (100 * wins) / total);
    });
  });
  return best;
}

function isSummit(route) {
  return Number(route.id.slice(3)) >= 25;
}

/* The shipped bar: clear almost always, three-star line at least sometimes.
 * The summit bar: the five-turn clock is allowed to bite the win share, but
 * every rung must stay winnable, its three-star band reachable and rare, and
 * the nervous cut hand must lose to its own six-turn twin. */
function verdict(route, best, cut) {
  if (isSummit(route)) {
    const rare = best.bestThree.score.three > 0 && best.bestThree.score.three <= 30;
    const ok = best.score.wins >= 60 && rare && (!cut || cut.six > cut.five);
    return (ok ? "ok  " : "FAIL");
  }
  return best.score.wins >= 60 && best.score.three >= 8 ? "ok  " : "FAIL";
}

function measureLine(route, best) {
  return (
    "turns " + route.turns +
    "  target " + route.target +
    "  bands " + route.stars.join("/") +
    "  wins " + best.score.wins.toFixed(0) + "%" +
    "  3-star " + best.score.three.toFixed(0) + "%" +
    "  2-star " + best.score.two.toFixed(0) + "%" +
    "  (" + best.partner + ")"
  );
}

function main() {
  const mode = process.argv[2] || "list";
  const api = loadAll();

  if (mode === "list") {
    const t0 = Date.now();
    api.routes.forEach(function (route) {
      const best = measure(api, route, 400);
      const cut = isSummit(route)
        ? { five: nervousShare(api, route, 400), six: nervousShare(api, Object.assign({}, route, { turns: 6 }), 400) }
        : null;
      const cutLine = cut
        ? "  cut " + cut.five.toFixed(0) + "%->" + cut.six.toFixed(0) + "%"
        : "";
      console.log(verdict(route, best, cut) + "  " + route.id + "  " + measureLine(route, best) + cutLine);
      if (isSummit(route)) {
        console.log(
          "     best 3-star line: " + best.bestThree.score.three.toFixed(1) + "% of wins" +
            " (" + best.bestThree.partner + ", wins " + best.bestThree.score.wins.toFixed(0) + "%)",
        );
      }
    });
    console.log("measured in " + (Date.now() - t0) + "ms");
    return;
  }

  if (mode === "forge") {
    /* The ladder continues the shipped shape: one more turn per route, ten more
     * resonance, and the bands sitting three, two and one turn under the budget
     * - the same offset every shipped route uses. 120 is the resonance ceiling,
     * so the last route asks for nearly all of it. The summit rows (25-30) are
     * the five-turn economy the summit sweep chose. */
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
      { id: "lds25", labelKey: "ldsRoute25", turns: 5, target: 84, stars: [3, 4, 5] },
      { id: "lds26", labelKey: "ldsRoute26", turns: 5, target: 88, stars: [3, 4, 5] },
      { id: "lds27", labelKey: "ldsRoute27", turns: 5, target: 96, stars: [3, 4, 5] },
      { id: "lds28", labelKey: "ldsRoute28", turns: 5, target: 112, stars: [4, 5, 6] },
      { id: "lds29", labelKey: "ldsRoute29", turns: 5, target: 116, stars: [4, 5, 6] },
      { id: "lds30", labelKey: "ldsRoute30", turns: 5, target: 120, stars: [4, 5, 6] },
    ];
    brief.forEach(function (route) {
      const best = measure(api, route, 400);
      console.log(
        route.id +
          ": " + measureLine(route, best),
      );
      console.log(
        '    { id: "' + route.id + '", labelKey: "' + route.labelKey +
          '", turns: ' + route.turns + ", target: " + route.target +
          ", stars: [" + route.stars.join(", ") + "] },",
      );
    });
  }

  if (mode === "summit") {
    /* The sweep that chose routes 25-30. The lever is the clock: every shipped
     * route kept a sixth turn in reserve, and the summit spends it - five-turn
     * missions with the gauge bought back up the marks 22-24 sold off (82, 88,
     * 94) to the full 120 ceiling. The bands leave the shipped three/two/one
     * offsets because a five-turn mission has no slack turn to price them
     * under; the three-star line rides the three-turn chain while it pays
     * (105 is the most three matched turns can bank) and walks to the fourth
     * turn past 105. The grid below is what the sweep measured; the cut test
     * restores the sixth turn on every rung and the nervous hand does strictly
     * better each time, which is the proof the clock is the load-bearing lever. */
    console.log("-- the sweep: five-turn candidates, expert bench (module start: 72 energy, 56 trust) --");
    [82, 84, 88, 90, 94, 96, 100, 104, 105].forEach(function (target) {
      const route = { id: "cand", labelKey: "x", turns: 5, target: target, stars: [3, 4, 5] };
      const best = measure(api, route, 400);
      console.log(
        "  5t T" + target + " [3/4/5]: " + measureLine(route, best) +
          " | best 3-star " + best.bestThree.score.three.toFixed(1) + "% (" + best.bestThree.partner + ")",
      );
    });
    [104, 108, 110, 112, 114, 116, 118, 120].forEach(function (target) {
      const route = { id: "cand", labelKey: "x", turns: 5, target: target, stars: [4, 5, 6] };
      const best = measure(api, route, 400);
      console.log(
        "  5t T" + target + " [4/5/6]: " + measureLine(route, best) +
          " | best 3-star " + best.bestThree.score.three.toFixed(1) + "% (" + best.bestThree.partner + ")",
      );
    });
    console.log("-- the chosen six, with the cut test: nervous hand on five turns vs its six-turn twin --");
    [
      { id: "lds25", labelKey: "ldsRoute25", turns: 5, target: 84, stars: [3, 4, 5] },
      { id: "lds26", labelKey: "ldsRoute26", turns: 5, target: 88, stars: [3, 4, 5] },
      { id: "lds27", labelKey: "ldsRoute27", turns: 5, target: 96, stars: [3, 4, 5] },
      { id: "lds28", labelKey: "ldsRoute28", turns: 5, target: 112, stars: [4, 5, 6] },
      { id: "lds29", labelKey: "ldsRoute29", turns: 5, target: 116, stars: [4, 5, 6] },
      { id: "lds30", labelKey: "ldsRoute30", turns: 5, target: 120, stars: [4, 5, 6] },
    ].forEach(function (route) {
      const best = measure(api, route, 400);
      const five = nervousShare(api, route, 400);
      const six = nervousShare(api, Object.assign({}, route, { turns: 6 }), 400);
      console.log(
        "  " + route.id + ": " + measureLine(route, best) +
          " | best 3-star " + best.bestThree.score.three.toFixed(1) + "%" +
          " | nervous " + five.toFixed(0) + "% on five turns, " + six.toFixed(0) + "% with the sixth back" +
          (six > five ? "  cut-ok" : "  CUT FAILED"),
      );
    });
  }
}

module.exports = { loadAll, measure, playRoute, nervousShare, POLICIES, NERVOUS };

if (require.main === module) {
  main();
}
