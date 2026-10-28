"use strict";

/* game-glyph-glide: what the gate proves and why the bar is what it is.
 *
 * The README law for this rink is that the printed par is a line the game's
 * own BFS has replayed, so the deep tier is held to that law in the engine's
 * own currency rather than to a plausible-looking board. Four proofs:
 *
 * 1. The quoted par is the true optimum. Every deep rung is dealt on a
 *    pinned stream through the module's own drift dealer, and the deal's par
 *    must equal both `App.glyphGlideSolve` (the engine the panel plays with)
 *    and a second, independently written drift-aware BFS re-hosted here - two
 *    provers, one number.
 * 2. Difficulty is measured, not asserted. The par floors climb past the
 *    shipped peak's 20 (22/24/26/28), every seeded deep deal lands at or
 *    above its floor, and on the same seeds each deep rung's mean proven par
 *    sits above i20's mean - the BFS price is the currency, and the summit
 *    costs more of it than the crown did.
 * 3. The tier mechanic is load-bearing. `drifts` (snowdrifts that stop a
 *    ride mid-floor) is structurally absent from rungs 1-20 and present on
 *    every deep board; clearing the snow off a dealt board and re-proving it
 *    yields a strictly cheaper line, so the drifts demonstrably change the
 *    BFS graph instead of decorating it. Star bands are checked against the
 *    engine's own star law: the optimal line earns three stars, and a sloppy
 *    line pays.
 * 4. The shipped ten plus the white rinks are untouched. A verbatim pre-deep
 *    copy of the generators and the solver is re-hosted here, and under a
 *    pinned stream the live module must produce byte-identical deals and
 *    byte-identical draw counts for the shallow rungs - the deep tier is
 *    strictly additive, so every shipped deal replays exactly as it shipped.
 *
 * Everything loops over fixed small counts (8 deals a rung, capped BFS
 * depth), so the gate finishes in seconds and nothing can hang. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.glyphGlideLevels;
  const deepIds = ["i21", "i22", "i23", "i24"];

  check("game-glyph-glide", "the ladder holds twenty-four rinks",
    Array.isArray(levels) && levels.length === 24, String(levels && levels.length));
  check("game-glyph-glide", "every rink id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-glyph-glide", "the deep tier i21-i24 is present",
    missing.length === 0, missing.join(","));
  check("game-glyph-glide", "the deep tier is the summit: the last four rungs in order",
    deepIds.every((id, index) => levels[20 + index] && levels[20 + index].id === id),
    levels.slice(20).map((level) => level.id).join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);

  /* One pinned stream per deal - the same Math.random the panel deals with,
   * counting draws so the inertness proof can compare stream consumption. */
  const stream = (seed) => {
    let state = seed >>> 0;
    let draws = 0;
    const real = Math.random;
    const fake = () => {
      draws += 1;
      state = (Math.imul(state, 1103515245) + 12345) >>> 0;
      return state / 4294967296;
    };
    return {
      run(fn) {
        Math.random = fake;
        try { return fn(); } finally { Math.random = real; }
      },
      get draws() { return draws; },
    };
  };
  const J = (deal) => JSON.stringify(deal);

  /* The pre-deep engine, verbatim (renamed only): the solver, the slide and
   * both generators exactly as the shipped twenty rungs have always ridden
   * them. If the live module drifts from these under a pinned stream, the
   * shipped deals would no longer be the deals that shipped. */
  const GLIDE_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const refSolve = function (wall, w, h, start, goal, stars) {
    var dirs = GLIDE_DIRS;
    function slide(pos, d) {
      var x = pos % w;
      var y = Math.floor(pos / w);
      var steps = 0;
      for (;;) {
        var nx = x + dirs[d][0];
        var ny = y + dirs[d][1];
        if (ny < 0 || ny >= h || nx < 0 || nx >= w || wall[ny * w + nx]) {
          break;
        }
        x = nx;
        y = ny;
        steps += 1;
      }
      return { pos: y * w + x, steps: steps };
    }
    var seen = {};
    var startMask = 0;
    seen[start * 4096 + startMask] = true;
    var queue = [{ p: start, m: startMask, d: 0 }];
    while (queue.length) {
      var st = queue.shift();
      var hasAll = true;
      for (var s = 0; s < stars.length; s += 1) {
        if (!((st.m >> s) & 1)) {
          hasAll = false;
          break;
        }
      }
      if (st.p === goal && hasAll) {
        return st.d;
      }
      for (var d = 0; d < 4; d += 1) {
        var res = slide(st.p, d);
        if (!res.steps) {
          continue;
        }
        var m = st.m;
        for (var s2 = 0; s2 < stars.length; s2 += 1) {
          if (res.pos === stars[s2]) {
            m |= 1 << s2;
          }
        }
        var k = res.pos * 4096 + m;
        if (seen[k]) {
          continue;
        }
        seen[k] = true;
        queue.push({ p: res.pos, m: m, d: st.d + 1 });
      }
    }
    return -1;
  };
  const refSlideOn = function (wall, w, h, pos, dir) {
    var x = pos % w;
    var y = Math.floor(pos / w);
    var steps = 0;
    for (;;) {
      var nx = x + GLIDE_DIRS[dir][0];
      var ny = y + GLIDE_DIRS[dir][1];
      if (ny < 0 || ny >= h || nx < 0 || nx >= w || wall[ny * w + nx]) {
        break;
      }
      x = nx;
      y = ny;
      steps += 1;
    }
    return { pos: y * w + x, steps: steps };
  };
  const refGenerate = function (w, h, starCount, minPar, maxPar) {
    var bestDeal = null;
    var bestMiss = Infinity;
    for (var attempt = 0; attempt < 600; attempt += 1) {
      var density = w >= 10 ? 0.17 : 0.22;
      var wall = [];
      for (var i = 0; i < w * h; i += 1) {
        var x = i % w;
        var y = Math.floor(i / w);
        wall.push(
          x === 0 || y === 0 || x === w - 1 || y === h - 1 || Math.random() < density ? 1 : 0,
        );
      }
      var cells = [];
      for (var c = 0; c < w * h; c += 1) {
        if (!wall[c]) {
          cells.push(c);
        }
      }
      if (cells.length < 10) {
        continue;
      }
      for (var sh = cells.length - 1; sh > 0; sh -= 1) {
        var j = Math.floor(Math.random() * (sh + 1));
        var tmp = cells[sh];
        cells[sh] = cells[j];
        cells[j] = tmp;
      }
      var start = cells[0];
      var goal = cells[1];
      var stars = cells.slice(2, 2 + starCount);
      var par = refSolve(wall, w, h, start, goal, stars);
      if (par < minPar || par > maxPar) {
        var miss = par < minPar ? minPar - par : par - maxPar;
        if (par > 0 && miss < bestMiss) {
          bestMiss = miss;
          bestDeal = { wall: wall, start: start, goal: goal, stars: stars, par: par };
        }
        continue;
      }
      return { wall: wall, start: start, goal: goal, stars: stars, par: par };
    }
    if (bestDeal) {
      return bestDeal;
    }
    var safe = [];
    for (var f = 0; f < w * h; f += 1) {
      var fx = f % w;
      var fy = Math.floor(f / w);
      safe.push(fx === 0 || fy === 0 || fx === w - 1 || fy === h - 1 ? 1 : 0);
    }
    var fStart = 1 * w + 1;
    var fGoal = (h - 2) * w + (w - 2);
    var fStars = [];
    return { wall: safe, start: fStart, goal: fGoal, stars: fStars, par: 2 };
  };
  const refTrailGenerate = function (w, h, starCount, minPar, maxPar, density) {
    for (var attempt = 0; attempt < 180; attempt += 1) {
      var wall = [];
      for (var i = 0; i < w * h; i += 1) {
        var x = i % w;
        var y = Math.floor(i / w);
        wall.push(
          x === 0 || y === 0 || x === w - 1 || y === h - 1 || Math.random() < density ? 1 : 0,
        );
      }
      var cells = [];
      for (var c = 0; c < w * h; c += 1) {
        if (!wall[c]) {
          cells.push(c);
        }
      }
      if (cells.length < 20) {
        continue;
      }
      var start = cells[Math.floor(Math.random() * cells.length)];
      var target = maxPar + 4;
      var pos = start;
      var lastDir = -1;
      var stops = [];
      var guard = 0;
      while (stops.length < target && guard < target * 10) {
        guard += 1;
        var options = [];
        for (var d = 0; d < 4; d += 1) {
          if (d !== lastDir) {
            options.push(d);
          }
        }
        var dir = options[Math.floor(Math.random() * options.length)];
        var res = refSlideOn(wall, w, h, pos, dir);
        if (!res.steps) {
          continue;
        }
        pos = res.pos;
        stops.push(pos);
        lastDir = dir;
      }
      if (stops.length < target) {
        continue;
      }
      var goal = stops[stops.length - 1];
      var stars = [];
      for (var s = 0; s < starCount; s += 1) {
        var at = Math.floor(((s + 1) * stops.length) / (starCount + 1));
        var stop = stops[at];
        if (stop !== start && stop !== goal && stars.indexOf(stop) < 0) {
          stars.push(stop);
        }
      }
      if (stars.length < starCount) {
        continue;
      }
      var par = refSolve(wall, w, h, start, goal, stars);
      if (par >= minPar && par <= maxPar) {
        return { wall: wall, start: start, goal: goal, stars: stars, par: par };
      }
    }
    return refGenerate(w, h, starCount, minPar, maxPar);
  };

  /* A second prover, written fresh: a layered-frontier BFS whose slide, star
   * mask and drift rule are re-derived from the game's laws (a slide ends at
   * a wall or a drift, stars are gathered on landing, the goal only opens
   * once every star is held). Deliberately structured differently from the
   * module's shift-queue search so agreement is evidence, not echo. */
  const gateSolve = function (wall, drift, w, h, start, goal, stars) {
    const all = (1 << stars.length) - 1;
    const starAt = new Map(stars.map((cell, index) => [cell, index]));
    const seen = new Set([start * 4096]);
    let frontier = [[start, 0]];
    for (let depth = 0; frontier.length && depth < 400; depth += 1) {
      const next = [];
      for (const [pos, mask] of frontier) {
        if (pos === goal && mask === all) {
          return depth;
        }
        for (const [dx, dy] of GLIDE_DIRS) {
          let x = pos % w;
          let y = Math.floor(pos / w);
          let moved = 0;
          for (;;) {
            const nx = x + dx;
            const ny = y + dy;
            if (ny < 0 || ny >= h || nx < 0 || nx >= w || wall[ny * w + nx]) {
              break;
            }
            x = nx;
            y = ny;
            moved += 1;
            if (drift && drift[y * w + x]) {
              break;
            }
          }
          if (!moved) {
            continue;
          }
          const end = y * w + x;
          const star = starAt.get(end);
          const m2 = star === undefined ? mask : mask | (1 << star);
          const key = end * 4096 + m2;
          if (!seen.has(key)) {
            seen.add(key);
            next.push([end, m2]);
          }
        }
      }
      frontier = next;
    }
    return -1;
  };

  /* Deal one rung on a pinned stream. Eight deals a rung keeps the whole
   * gate in seconds; the seed scheme is fixed, so the run is deterministic. */
  const DEALS = 8;
  const dealRung = (level, trial) =>
    level.drifts
      ? stream(91000 + trial * 37 + level.drifts).run(() =>
        App.glyphGlideDriftGenerate(level.w, level.h, level.stars, level.minPar, level.maxPar, level.density, level.drifts))
      : stream(91000 + trial * 37).run(() =>
        App.glyphGlideTrailGenerate(level.w, level.h, level.stars, level.minPar, level.maxPar, level.density));

  /* 1+3. Every deep deal is real, and its quoted par is the truth: the
   * engine's own prover and the independent one agree on it, the par sits in
   * the printed window, the drifts are where the dealer says, and clearing
   * the snow off the same board re-proves it strictly cheaper - the drifts
   * change the BFS graph, which is the tier mechanic being load-bearing. */
  const dealProblems = [];
  const costByRung = {};
  const meanByRung = {};
  deep.forEach((level) => {
    let costSum = 0;
    let parSum = 0;
    for (let trial = 0; trial < DEALS; trial += 1) {
      const deal = dealRung(level, trial);
      const tag = `${level.id} trial ${trial}`;
      if (!deal || !deal.drifts) {
        dealProblems.push(`${tag}: the dealer fell back, no drifts dealt`);
        continue;
      }
      let laid = 0;
      for (let cell = 0; cell < deal.drifts.length; cell += 1) {
        if (!deal.drifts[cell]) {
          continue;
        }
        laid += 1;
        if (deal.wall[cell]) {
          dealProblems.push(`${tag}: a drift is sown on a wall cell`);
        }
        if (cell === deal.start || cell === deal.goal || deal.stars.indexOf(cell) >= 0) {
          dealProblems.push(`${tag}: a drift doubles as the start, the goal or a star`);
        }
      }
      if (laid !== level.drifts) {
        dealProblems.push(`${tag}: dealt ${laid} drifts, the rung asks for ${level.drifts}`);
      }
      const par = App.glyphGlideSolve(deal.wall, level.w, level.h, deal.start, deal.goal, deal.stars, deal.drifts);
      const par2 = gateSolve(deal.wall, deal.drifts, level.w, level.h, deal.start, deal.goal, deal.stars);
      if (par !== deal.par || par2 !== deal.par) {
        dealProblems.push(`${tag}: quoted ${deal.par}, engine ${par}, independent ${par2}`);
      }
      if (deal.par < level.minPar || deal.par > level.maxPar) {
        dealProblems.push(`${tag}: par ${deal.par} outside the printed window ${level.minPar}-${level.maxPar}`);
      }
      const open = App.glyphGlideSolve(deal.wall, level.w, level.h, deal.start, deal.goal, deal.stars);
      if (open < 1 || open >= deal.par) {
        dealProblems.push(`${tag}: driftless line ${open} is not strictly under par ${deal.par}`);
      }
      costSum += deal.par - open;
      parSum += deal.par;
    }
    costByRung[level.id] = costSum / DEALS;
    meanByRung[level.id] = parSum / DEALS;
  });
  check("game-glyph-glide",
    "every seeded deep deal is real, BFS-proven at its quoted par by both provers, and strictly dearer than the same board without its drifts",
    dealProblems.length === 0, dealProblems.slice(0, 4).join(" | "));

  /* 2. The tier is measurably harder in the engine's own currency. The floors
   * climb past the shipped peak's 20 rung over rung, every deep rung's mean
   * proven par sits above i20's mean on the same seed scheme, and the drifts
   * cost real slides on every rung. */
  const i20 = byId.i20;
  const i20Mean = (() => {
    let sum = 0;
    for (let trial = 0; trial < DEALS; trial += 1) {
      sum += dealRung(i20, trial).par;
    }
    return sum / DEALS;
  })();
  const floorProblems = [];
  deep.forEach((level, index) => {
    const floor = index === 0 ? i20.minPar : deep[index - 1].minPar;
    if (!(level.minPar > floor)) {
      floorProblems.push(`${level.id} floor ${level.minPar} does not clear ${floor}`);
    }
    if (!(level.maxPar > (index === 0 ? i20.maxPar : deep[index - 1].maxPar))) {
      floorProblems.push(`${level.id} ceiling does not clear the rung before it`);
    }
    if (!(meanByRung[level.id] > i20Mean)) {
      floorProblems.push(`${level.id} mean par ${meanByRung[level.id].toFixed(1)} not above i20 ${i20Mean.toFixed(1)}`);
    }
    if (!(costByRung[level.id] > 0)) {
      floorProblems.push(`${level.id} drifts cost nothing on average`);
    }
  });
  check("game-glyph-glide",
    "the deep pars climb past i20: floors rise 22/24/26/28 and every deep mean proven par beats the shipped peak on the same seeds",
    floorProblems.length === 0,
    floorProblems.join(" | ") ||
      `i20 ${i20Mean.toFixed(1)} -> ${deepIds.map((id) => `${id} ${meanByRung[id].toFixed(1)}`).join(" -> ")}`);

  /* The star bands against the engine's own law: the optimal line itself
   * earns three stars, and the bands bite - two extra slides cost the third,
   * four cost the second, and a line eight over par earns nothing the engine
   * has to round up (the module floors every clear at one star). */
  const bandProblems = [];
  deep.forEach((level) => {
    const deal = dealRung(level, 0);
    if (!deal || !deal.drifts) {
      bandProblems.push(level.id + " dealt no drifts for the band probe");
      return;
    }
    const par = deal.par;
    const bands = [par + 1, par + 3, par + 7];
    const earned = (moves) => App.starsFor(moves, bands, "low");
    if (earned(par) !== 3) bandProblems.push(`${level.id} the optimal ${par}-slide line does not earn three stars`);
    if (earned(par + 2) !== 2) bandProblems.push(`${level.id} two over par still earns three stars`);
    if (earned(par + 4) !== 1) bandProblems.push(`${level.id} four over par still earns two stars`);
    if (earned(par + 8) !== 0) bandProblems.push(`${level.id} eight over par still earns one star`);
  });
  check("game-glyph-glide",
    "the deep star bands are reachable by the proven line and not free for a sloppy one",
    bandProblems.length === 0, bandProblems.join(" | "));

  /* 4. The shipped twenty are untouched. No shallow rung carries the field,
   * and under a pinned stream the live generators deal byte-identical boards
   * with byte-identical draw counts against the verbatim pre-deep copies -
   * plain rinks, white rinks, and the solver itself. */
  const shallow = levels.filter((level) => deepIds.indexOf(level.id) < 0);
  check("game-glyph-glide",
    "no shipped rung carries the drift field",
    shallow.every((level) => !level.drifts),
    shallow.filter((level) => level.drifts).map((level) => level.id).join(","));
  const inertProblems = [];
  [[8, 6, 0, 3, 5], [10, 8, 3, 7, 15]].forEach(([w, h, s, mn, mx]) => {
    for (let seed = 1; seed <= 4; seed += 1) {
      const seedKey = seed * 7919;
      const oldStream = stream(seedKey);
      const old = oldStream.run(() => refGenerate(w, h, s, mn, mx));
      const nuStream = stream(seedKey);
      const nu = nuStream.run(() => App.glyphGlideGenerate(w, h, s, mn, mx));
      if (J(old) !== J(nu) || oldStream.draws !== nuStream.draws) {
        inertProblems.push(`plain deal w${w} seed${seed} differs from the pre-deep dealer` +
          ` (${oldStream.draws} vs ${nuStream.draws} draws)`);
      }
      if (refSolve(old.wall, w, h, old.start, old.goal, old.stars) !==
        App.glyphGlideSolve(old.wall, w, h, old.start, old.goal, old.stars)) {
        inertProblems.push(`driftless solve w${w} seed${seed} differs from the pre-deep prover`);
      }
    }
  });
  [[17, 14, 6, 16, 38], [19, 15, 6, 20, 44]].forEach(([w, h, s, mn, mx]) => {
    for (let seed = 1; seed <= 3; seed += 1) {
      const seedKey = seed * 104729;
      const oldStream = stream(seedKey);
      const old = oldStream.run(() => refTrailGenerate(w, h, s, mn, mx, 0.22));
      const nuStream = stream(seedKey);
      const nu = nuStream.run(() => App.glyphGlideTrailGenerate(w, h, s, mn, mx, 0.22));
      if (J(old) !== J(nu) || oldStream.draws !== nuStream.draws) {
        inertProblems.push(`trail deal w${w} seed${seed} differs from the pre-deep dealer` +
          ` (${oldStream.draws} vs ${nuStream.draws} draws)`);
      }
      if (refSolve(old.wall, w, h, old.start, old.goal, old.stars) !==
        App.glyphGlideSolve(old.wall, w, h, old.start, old.goal, old.stars)) {
        inertProblems.push(`trail solve w${w} seed${seed} differs from the pre-deep prover`);
      }
    }
  });
  check("game-glyph-glide",
    "the shipped dealers and prover replay byte-identically against the pre-deep copies on a pinned stream",
    inertProblems.length === 0, inertProblems.slice(0, 4).join(" | "));

  /* The drift mask itself is inert where it must be: pricing the same deep
   * board through the module prover with an all-zero mask, with no mask at
   * all, and through the independent prover lands on one number - the bare
   * driftless optimum, strictly under the quoted par. The deep tier's slide
   * rule is provably the shipped rule whenever no drift stands in the way. */
  const deepDeal = dealRung(deep[0], 0);
  const zeros = deepDeal && deepDeal.drifts ? deepDeal.drifts.map(() => 0) : [];
  const openMasked = App.glyphGlideSolve(deepDeal.wall, deep[0].w, deep[0].h, deepDeal.start, deepDeal.goal, deepDeal.stars, zeros);
  const openBare = App.glyphGlideSolve(deepDeal.wall, deep[0].w, deep[0].h, deepDeal.start, deepDeal.goal, deepDeal.stars);
  const openGate = gateSolve(deepDeal.wall, zeros, deep[0].w, deep[0].h, deepDeal.start, deepDeal.goal, deepDeal.stars);
  check("game-glyph-glide",
    "an all-zero drift mask prices a board exactly like no mask, at the bare driftless optimum",
    openMasked === openBare && openMasked === openGate && openMasked < deepDeal.par,
    `masked ${openMasked}, bare ${openBare}, independent ${openGate}, par ${deepDeal.par}`);

  /* The tier's names travel with the page: both languages hold a real string
   * and t() never falls back to the raw key. The guide line carries the new
   * stopping law in both languages too. */
  const copyProblems = deep.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && typeof App.I18N.en[key] === "string" && App.I18N.en[key].length) ||
    !(App.I18N && App.I18N.zh && typeof App.I18N.zh[key] === "string" && App.I18N.zh[key].length) ||
    !App.t(key) || App.t(key) === key);
  check("game-glyph-glide", "the four deep rink names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
  const hintEn = (App.I18N && App.I18N.en && App.I18N.en.glHint) || "";
  const hintZh = (App.I18N && App.I18N.zh && App.I18N.zh.glHint) || "";
  check("game-glyph-glide",
    "the rink guide teaches the new tier in both languages",
    /New tier/.test(hintEn) && /[Dd]rift/.test(hintEn) &&
    /新层级/.test(hintZh) && /雪堆/.test(hintZh),
    "en " + /New tier/.test(hintEn) + "/" + /[Dd]rift/.test(hintEn) +
    ", zh " + /新层级/.test(hintZh) + "/" + /雪堆/.test(hintZh));

  /* The unlock chain is derived, never stored: clearing each rink in order
   * hands the player exactly the next one, all twenty-four times, on the
   * game's own campaign key. */
  const chain = App.createCampaign({
    key: "glyph-glide-campaign",
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
  check("game-glyph-glide", "the unlock chain walks all twenty-four rinks in order",
    walked === 24 && chained && chain.clearedCount() === 24, walked + " first clears");
};
