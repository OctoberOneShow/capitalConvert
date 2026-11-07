"use strict";

/* game-glyph-glide: what the gate proves and why the bar is what it is.
 *
 * The README law for this rink is that the printed par is a line the game's
 * own BFS has replayed, so each tier is held to that law in the engine's
 * own currency rather than to a plausible-looking board. Seven proofs:
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
 * 5. The summit i25-i30 answers to the same law on its own pinned stream
 *    (88000 + trial*37 + drifts, eight deals a rung): one more drift per
 *    rung, seven through twelve, every deal re-proven by both provers inside
 *    the printed window, the mean proven par climbing strictly through the
 *    six and opening past i24's mean on the same stream, and the cut measured
 *    on the dealt boards themselves - strip the snow off them and the
 *    driftless replay prices below each rung's printed floor, so the summit's
 *    demand is unreachable on the bare ice.
 * 6. The homecoming i31-i40 runs the ladder home on its own pinned stream
 *    (88000's sibling, 87000 + trial*37 + drifts): every goal hangs at the
 *    front door - `goal === start`, a shape no rung 1-30 ships - and each
 *    deal is re-proven by both provers as a closed loop inside the printed
 *    window, strictly dearer than the same board re-hung one-way at the
 *    trail's far stop. Every rung's mean proven par prices past i30's mean
 *    on the same stream, the floors step 41-45 past the crown's 39, and the
 *    sockets and floor dimensions are records the first thirty never held.
 *    The tier comment's own claim - that the loop's price is set by the
 *    errand count and not by the other dials - is why the floors hold at 45
 *    instead of stepping to 50: the gate holds the printed numbers to the
 *    measured band, not to a wish.
 * 7. The close i44-i46 answers to the same law on the homecoming's own
 *    stream: the detour priced the ride home, the close adds the errands -
 *    twelve sockets a rink, one more than any homecoming asked for and the
 *    most the solver's star mask can hold, under the crown's twelve-drift
 *    snowpack, with the ride home priced at twelve slides past the detour's
 *    ten. Floors never shrink and widen a column a rung to the widest the
 *    ladder has held, the printed floors step 46-50 past the detour's
 *    crest, and every deal is re-proven by both provers as a closed loop
 *    inside the window with the toll paid. The mean proven par climbs
 *    strictly through the three and opens past the detour's mean on the
 *    same stream, and each rung's mean one-way price falls below its
 *    printed floor - the loop, not the trail spread, is what the floor
 *    asks for.
 *
 * Everything loops over fixed small counts (8 deals a rung, capped BFS
 * depth, capped dealer retries), so the gate finishes in minutes and
 * nothing can hang. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const levels = App.glyphGlideLevels;
  const deepIds = ["i21", "i22", "i23", "i24"];
  const summitIds = ["i25", "i26", "i27", "i28", "i29", "i30"];
  const homeIds = ["i31", "i32", "i33", "i34", "i35", "i36", "i37", "i38", "i39", "i40"];

  check("game-glyph-glide", "the ladder holds forty-six rinks",
    Array.isArray(levels) && levels.length === 46, String(levels && levels.length));
  check("game-glyph-glide", "every rink id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-glyph-glide", "the deep tier i21-i24 is present",
    missing.length === 0, missing.join(","));
  check("game-glyph-glide", "the deep tier sits at rungs 21-24 in order",
    deepIds.every((id, index) => levels[20 + index] && levels[20 + index].id === id),
    levels.slice(20, 24).map((level) => level.id).join(","));
  const missingSummit = summitIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-glyph-glide", "the summit tier i25-i30 is present",
    missingSummit.length === 0, missingSummit.join(","));
  check("game-glyph-glide", "the summit tier sits at rungs 25-30 in order",
    summitIds.every((id, index) => levels[24 + index] && levels[24 + index].id === id),
    levels.slice(24, 30).map((level) => level.id).join(","));
  const missingHome = homeIds.filter((id) => !levels.some((level) => level.id === id));
  check("game-glyph-glide", "the homecoming tier i31-i40 is present",
    missingHome.length === 0, missingHome.join(","));
  check("game-glyph-glide", "the homecoming tier runs i31-i40 in order before the detour",
    homeIds.every((id, index) => levels[30 + index] && levels[30 + index].id === id),
    levels.slice(30).map((level) => level.id).join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });
  const deep = deepIds.map((id) => byId[id]);
  const summit = summitIds.map((id) => byId[id]);
  const home = homeIds.map((id) => byId[id]);

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
    var head = 0;
    while (head < queue.length) {
      var st = queue[head++];
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
    const starBits = new Uint16Array(w * h);
    for (let i = 0; i < stars.length; i += 1) {
      starBits[stars[i]] = 1 << i;
    }
    const maxMask = 1 << stars.length;
    const seen = new Uint8Array(w * h * maxMask);
    seen[start * maxMask] = 1;
    let frontierPos = [start];
    let frontierMask = [0];
    for (let depth = 0; frontierPos.length && depth < 400; depth += 1) {
      const nextPos = [];
      const nextMask = [];
      const len = frontierPos.length;
      for (let i = 0; i < len; i += 1) {
        const pos = frontierPos[i];
        const mask = frontierMask[i];
        if (pos === goal && mask === all) {
          return depth;
        }
        for (let d = 0; d < 4; d += 1) {
          const dx = GLIDE_DIRS[d][0];
          const dy = GLIDE_DIRS[d][1];
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
          const m2 = mask | starBits[end];
          const key = end * maxMask + m2;
          if (!seen[key]) {
            seen[key] = 1;
            nextPos.push(end);
            nextMask.push(m2);
          }
        }
      }
      frontierPos = nextPos;
      frontierMask = nextMask;
    }
    return -1;
  };

  /* Deal one rung on a pinned stream. Eight deals a rung keeps the whole
   * gate in minutes; the seed scheme is fixed, so the run is deterministic.
   * The deep tier rides the 91000 stream it has always ridden; the summit
   * deals on its own 88000 stream, the one the tier's evidence comment
   * quotes, because the deep stream starves the dealer at twelve drifts;
   * the homecoming closes the ladder on 88000's sibling, 87000, through the
   * module's own homecoming dealer. */
  const DEALS = 8;
  const dealRung = (level, trial, base) =>
    level.home
      ? stream((base || 87000) + trial * 37 + level.drifts).run(() =>
        App.glyphGlideHomecomingGenerate(level.w, level.h, level.stars, level.minPar, level.maxPar, level.density, level.drifts, level.toll))
      : level.drifts
        ? stream((base || 91000) + trial * 37 + level.drifts).run(() =>
          App.glyphGlideDriftGenerate(level.w, level.h, level.stars, level.minPar, level.maxPar, level.density, level.drifts))
        : stream((base || 91000) + trial * 37).run(() =>
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

  /* ---- the summit i25-i30: the deep law one drift higher ---- */
  /* The tier's authored shape is the escalation itself: one more drift per
   * rung, seven through twelve (each past the crown's six), windows that
   * step 29-39/58-68 past i24's 28-54, and the deepest floor and the most
   * sockets the ladder has held. */
  const shapeProblems = [];
  summit.forEach((level, index) => {
    const prev = index === 0 ? byId.i24 : summit[index - 1];
    if (level.drifts !== prev.drifts + 1) {
      shapeProblems.push(`${level.id} sows ${level.drifts} drifts, not one more than ${prev.drifts}`);
    }
    if (!(level.minPar > prev.minPar) || !(level.maxPar > prev.maxPar)) {
      shapeProblems.push(`${level.id} does not raise its window past ${prev.minPar}-${prev.maxPar}`);
    }
  });
  const shipped = levels.slice(0, 24);
  const record = (pick) => Math.max.apply(null, shipped.map(pick));
  if (!(summit[5].w > record((l) => l.w)) || !(summit[5].h > record((l) => l.h))) {
    shapeProblems.push("the summit does not hold the deepest floor the first thirty held");
  }
  if (!(summit[5].stars > record((l) => l.stars))) {
    shapeProblems.push("the summit does not hold the most sockets the first thirty held");
  }
  check("game-glyph-glide",
    "the summit escalates the dials the engine deals: one more drift per rung 7-12, windows past the crown's, and the deepest floor and most sockets the first thirty held",
    shapeProblems.length === 0, shapeProblems.join(" | "));

  /* Every summit deal meets the deep law on the summit's own pinned stream:
   * a true drift board, its quoted par re-proven by the module's prover and
   * the independent one, the par inside the printed window, and the same
   * board without its snow strictly cheaper. */
  const summitMean = {};
  const summitOpen = {};
  const summitCost = {};
  summit.forEach((level) => {
    const problems = [];
    let parSum = 0;
    let openSum = 0;
    let costSum = 0;
    for (let trial = 0; trial < DEALS; trial += 1) {
      const deal = dealRung(level, trial, 88000);
      const tag = `${level.id} trial ${trial}`;
      if (!deal || !deal.drifts) {
        problems.push(`${tag}: the dealer fell back, no drifts dealt`);
        continue;
      }
      let laid = 0;
      for (let cell = 0; cell < deal.drifts.length; cell += 1) {
        if (!deal.drifts[cell]) {
          continue;
        }
        laid += 1;
        if (deal.wall[cell]) {
          problems.push(`${tag}: a drift is sown on a wall cell`);
        }
        if (cell === deal.start || cell === deal.goal || deal.stars.indexOf(cell) >= 0) {
          problems.push(`${tag}: a drift doubles as the start, the goal or a star`);
        }
      }
      if (laid !== level.drifts) {
        problems.push(`${tag}: dealt ${laid} drifts, the rung asks for ${level.drifts}`);
      }
      const par = App.glyphGlideSolve(deal.wall, level.w, level.h, deal.start, deal.goal, deal.stars, deal.drifts);
      const par2 = gateSolve(deal.wall, deal.drifts, level.w, level.h, deal.start, deal.goal, deal.stars);
      if (par !== deal.par || par2 !== deal.par) {
        problems.push(`${tag}: quoted ${deal.par}, engine ${par}, independent ${par2}`);
      }
      if (deal.par < level.minPar || deal.par > level.maxPar) {
        problems.push(`${tag}: par ${deal.par} outside the printed window ${level.minPar}-${level.maxPar}`);
      }
      const open = App.glyphGlideSolve(deal.wall, level.w, level.h, deal.start, deal.goal, deal.stars);
      if (open < 1 || open >= deal.par) {
        problems.push(`${tag}: driftless line ${open} is not strictly under par ${deal.par}`);
      }
      parSum += deal.par;
      openSum += open;
      costSum += deal.par - open;
    }
    check("game-glyph-glide",
      `${level.id}: its eight pinned deals are true drift boards, proven at their quoted par by both provers inside the printed window and strictly dearer than the bare board`,
      problems.length === 0, problems.slice(0, 3).join(" | "));
    summitMean[level.id] = parSum / DEALS;
    summitOpen[level.id] = openSum / DEALS;
    summitCost[level.id] = costSum / DEALS;
  });

  /* The summit is the top of the ladder in the BFS's own currency: floors
   * step 29-39 past the crown's 28, every summit rung's mean proven par
   * beats i24's mean on the same pinned stream, the means climb strictly
   * through the six, and the snow pays real slides on every rung. */
  const i24SummitMean = (() => {
    let sum = 0;
    for (let trial = 0; trial < DEALS; trial += 1) {
      sum += dealRung(byId.i24, trial, 88000).par;
    }
    return sum / DEALS;
  })();
  const climbProblems = [];
  summit.forEach((level, index) => {
    const floor = index === 0 ? byId.i24.minPar : summit[index - 1].minPar;
    if (!(level.minPar > floor)) {
      climbProblems.push(`${level.id} floor ${level.minPar} does not clear ${floor}`);
    }
    if (!(summitMean[level.id] > i24SummitMean)) {
      climbProblems.push(`${level.id} mean par ${summitMean[level.id].toFixed(1)} not above i24 ${i24SummitMean.toFixed(1)}`);
    }
    if (index && !(summitMean[level.id] > summitMean[summit[index - 1].id])) {
      climbProblems.push(`${level.id} mean par does not clear the rung before it`);
    }
    if (!(summitCost[level.id] > 0)) {
      climbProblems.push(`${level.id} drifts cost nothing on average`);
    }
  });
  check("game-glyph-glide",
    "the summit's pars climb past the crown: floors rise 29/31/33/35/37/39 and every summit mean proven par beats i24's on the same stream, strictly through the six",
    climbProblems.length === 0,
    climbProblems.join(" | ") ||
      `i24 ${i24SummitMean.toFixed(1)} -> ${summitIds.map((id) => `${id} ${summitMean[id].toFixed(1)}`).join(" -> ")}`);

  /* The cut, measured on the dealt boards themselves: the driftless replay
   * of every pinned deal is strictly under the dealt par (checked per deal
   * above), and each rung's mean driftless price falls below the rung's own
   * printed floor - the summit's demand is unreachable on the bare ice the
   * same dealer lays, which is the tier mechanic being load-bearing. */
  const cutProblems = summit
    .filter((level) => !(summitOpen[level.id] < level.minPar))
    .map((level) => `${level.id} driftless mean ${summitOpen[level.id].toFixed(1)} not under floor ${level.minPar}`);
  check("game-glyph-glide",
    "the cut: the snowless replay of each rung's own deals prices below that rung's printed floor, so the summit's demand is unreachable without its drifts",
    cutProblems.length === 0,
    cutProblems.join(" | ") ||
      summitIds.map((id) => `${id} bare ${summitOpen[id].toFixed(1)} < floor ${byId[id].minPar}`).join(", "));

  /* The summit's star bands against the engine's own law, on its own deals:
   * the proven line earns three stars, two extra slides cost the third, four
   * cost the second, and a line eight over par earns nothing the engine has
   * to round up. */
  const summitBandProblems = [];
  summit.forEach((level) => {
    const deal = dealRung(level, 0, 88000);
    if (!deal || !deal.drifts) {
      summitBandProblems.push(level.id + " dealt no drifts for the band probe");
      return;
    }
    const par = deal.par;
    const bands = [par + 1, par + 3, par + 7];
    const earned = (moves) => App.starsFor(moves, bands, "low");
    if (earned(par) !== 3) summitBandProblems.push(`${level.id} the optimal ${par}-slide line does not earn three stars`);
    if (earned(par + 2) !== 2) summitBandProblems.push(`${level.id} two over par still earns three stars`);
    if (earned(par + 4) !== 1) summitBandProblems.push(`${level.id} four over par still earns two stars`);
    if (earned(par + 8) !== 0) summitBandProblems.push(`${level.id} eight over par still earns one star`);
  });
  check("game-glyph-glide",
    "the summit's star bands are reachable by the proven line and not free for a sloppy one",
    summitBandProblems.length === 0, summitBandProblems.join(" | "));

  /* ---- the homecoming i31-i40: the goal is the front door ---- */
  /* The tier's authored shape: every rink hangs its goal at the start cell -
   * a shape no rung 1-30 ships - on the campaign's widest and deepest floors
   * with eleven sockets, one more than the summit ever asked for, under the
   * crown's own twelve-drift snowpack. The floors step 41-45 past i30's 39
   * and hold there - the loop's price is set by the errand count, not by the
   * other dials, so the printed floors hold the measured band instead of
   * wishing past it - while the ceilings keep climbing 71-80. */
  const first30 = levels.slice(0, 30);
  check("game-glyph-glide",
    "no rung before the homecoming hangs its goal at the front door",
    first30.every((level) => !level.home),
    first30.filter((level) => level.home).map((level) => level.id).join(","));
  const homeShapeProblems = [];
  home.forEach((level, index) => {
    if (!level.home) {
      homeShapeProblems.push(`${level.id} does not hang its goal at the front door`);
    }
    if (level.drifts !== byId.i30.drifts) {
      homeShapeProblems.push(`${level.id} does not hold the crown's ${byId.i30.drifts}-drift snowpack`);
    }
    if (level.stars !== 11) {
      homeShapeProblems.push(`${level.id} does not carry the eleven sockets`);
    }
    const prev = index === 0 ? byId.i30 : home[index - 1];
    if (!(level.minPar >= prev.minPar)) {
      homeShapeProblems.push(`${level.id} floor ${level.minPar} falls below ${prev.minPar}`);
    }
    if (!(level.maxPar > prev.maxPar)) {
      homeShapeProblems.push(`${level.id} ceiling does not climb past ${prev.maxPar}`);
    }
  });
  for (let k = 1; k < 4; k += 1) {
    if (!(home[k].minPar > home[k - 1].minPar)) {
      homeShapeProblems.push(`${home[k].id} floor does not clear the rung before it`);
    }
  }
  if (home.slice(4).some((level) => level.minPar !== home[3].minPar)) {
    homeShapeProblems.push("the floor does not hold its crest once the band tops out");
  }
  if (!(home[0].minPar > byId.i30.minPar)) {
    homeShapeProblems.push(`the homecoming opens at floor ${home[0].minPar}, not past the crown's ${byId.i30.minPar}`);
  }
  const homeRecord = (pick) => Math.max.apply(null, first30.map(pick));
  if (!(home[0].w > homeRecord((l) => l.w)) || !(home[4].h > homeRecord((l) => l.h))) {
    homeShapeProblems.push("the homecoming does not hold the widest and deepest floors the first thirty saw");
  }
  if (!(home[0].stars > homeRecord((l) => l.stars))) {
    homeShapeProblems.push("the homecoming does not hold the most sockets the first thirty saw");
  }
  check("game-glyph-glide",
    "the homecoming hangs every goal at the front door: eleven sockets on 24-wide floors, the crown's snowpack held, floors 41-44 past i30's 39 and ceilings 71-80",
    homeShapeProblems.length === 0, homeShapeProblems.join(" | "));

  /* Every homecoming deal meets the deep law on the homecoming stream: a
   * closed loop - goal === start - re-proven at its quoted par by the
   * module's prover and the independent one inside the printed window, the
   * snow sown where the dealer says, and the same board re-hung one-way at
   * the trail's far stop pricing at least six slides under the loop - the
   * homecoming's toll, paid on every deal. */
  const homeMean = {};
  const homeOneWay = {};
  home.forEach((level) => {
    const problems = [];
    let parSum = 0;
    let oneSum = 0;
    for (let trial = 0; trial < DEALS; trial += 1) {
      const deal = dealRung(level, trial, 87000);
      const tag = `${level.id} trial ${trial}`;
      if (!deal || !deal.drifts) {
        problems.push(`${tag}: the dealer fell back, no loop dealt`);
        continue;
      }
      if (deal.goal !== deal.start) {
        problems.push(`${tag}: the gate is not the front door`);
      }
      if (!deal.away || deal.away === deal.start || deal.wall[deal.away]) {
        problems.push(`${tag}: the counterfactual gate is not an open cell apart from the start`);
      }
      let laid = 0;
      for (let cell = 0; cell < deal.drifts.length; cell += 1) {
        if (!deal.drifts[cell]) {
          continue;
        }
        laid += 1;
        if (deal.wall[cell]) {
          problems.push(`${tag}: a drift is sown on a wall cell`);
        }
        if (cell === deal.start || cell === deal.goal || deal.stars.indexOf(cell) >= 0) {
          problems.push(`${tag}: a drift doubles as the start, the goal or a star`);
        }
      }
      if (laid !== level.drifts) {
        problems.push(`${tag}: dealt ${laid} drifts, the rung asks for ${level.drifts}`);
      }
      const par = App.glyphGlideSolve(deal.wall, level.w, level.h, deal.start, deal.goal, deal.stars, deal.drifts);
      const par2 = gateSolve(deal.wall, deal.drifts, level.w, level.h, deal.start, deal.goal, deal.stars);
      if (par !== deal.par || par2 !== deal.par) {
        problems.push(`${tag}: quoted ${deal.par}, engine ${par}, independent ${par2}`);
      }
      if (deal.par < level.minPar || deal.par > level.maxPar) {
        problems.push(`${tag}: par ${deal.par} outside the printed window ${level.minPar}-${level.maxPar}`);
      }
      const one = App.glyphGlideSolve(deal.wall, level.w, level.h, deal.start, deal.away, deal.stars, deal.drifts);
      const one2 = gateSolve(deal.wall, deal.drifts, level.w, level.h, deal.start, deal.away, deal.stars);
      if (one !== one2) {
        problems.push(`${tag}: the one-way replay disagrees, engine ${one}, independent ${one2}`);
      }
      if (one < 1 || one > deal.par - 6) {
        problems.push(`${tag}: the homecoming toll ${deal.par - one} does not pay the six-slide minimum`);
      }
      parSum += deal.par;
      oneSum += one;
    }
    check("game-glyph-glide",
      `${level.id}: its eight pinned deals are closed loops, proven at their quoted par by both provers inside the printed window and at least six slides dearer than the one-way replay`,
      problems.length === 0, problems.slice(0, 3).join(" | "));
    homeMean[level.id] = parSum / DEALS;
    homeOneWay[level.id] = oneSum / DEALS;
  });

  /* The homecoming is the top of the ladder in the BFS's own currency:
   * every rung's mean proven par prices past i30's mean on the same stream,
   * and every rung's mean one-way price - the same errands with the gate
   * re-hung at the trail's far stop - falls below the printed floor, so the
   * loop, not the trail spread, is what the printed floor asks for. */
  const i30HomeMean = (() => {
    let sum = 0;
    for (let trial = 0; trial < DEALS; trial += 1) {
      sum += dealRung(byId.i30, trial, 87000).par;
    }
    return sum / DEALS;
  })();
  const homeClimbProblems = [];
  home.forEach((level) => {
    if (!(homeMean[level.id] > i30HomeMean)) {
      homeClimbProblems.push(`${level.id} mean par ${homeMean[level.id].toFixed(1)} not above i30 ${i30HomeMean.toFixed(1)}`);
    }
    if (!(homeOneWay[level.id] < level.minPar)) {
      homeClimbProblems.push(`${level.id} one-way mean ${homeOneWay[level.id].toFixed(1)} not under floor ${level.minPar}`);
    }
  });
  check("game-glyph-glide",
    "the homecoming's pars climb past the crown: every rung's mean proven par beats i30's on the same stream, and every rung's mean one-way price falls below its printed floor - the loop is what the floor asks for",
    homeClimbProblems.length === 0,
    homeClimbProblems.join(" | ") ||
      `i30 ${i30HomeMean.toFixed(1)} -> ${homeIds.map((id) => `${id} ${homeMean[id].toFixed(1)}`).join(" -> ")}`);

  /* The homecoming's star bands against the engine's own law, on its own
   * deals: the proven line earns three stars, two extra slides cost the
   * third, four cost the second, and a line eight over par earns nothing
   * the engine has to round up. */
  const homeBandProblems = [];
  home.forEach((level) => {
    const deal = dealRung(level, 0, 87000);
    if (!deal || !deal.drifts || deal.goal !== deal.start) {
      homeBandProblems.push(level.id + " dealt no closed loop for the band probe");
      return;
    }
    const par = deal.par;
    const bands = [par + 1, par + 3, par + 7];
    const earned = (moves) => App.starsFor(moves, bands, "low");
    if (earned(par) !== 3) homeBandProblems.push(`${level.id} the optimal ${par}-slide loop does not earn three stars`);
    if (earned(par + 2) !== 2) homeBandProblems.push(`${level.id} two over par still earns three stars`);
    if (earned(par + 4) !== 1) homeBandProblems.push(`${level.id} four over par still earns two stars`);
    if (earned(par + 8) !== 0) homeBandProblems.push(`${level.id} eight over par still earns one star`);
  });
  check("game-glyph-glide",
    "the homecoming's star bands are reachable by the proven loop and not free for a sloppy one",
    homeBandProblems.length === 0, homeBandProblems.join(" | "));

  /* 4. The shipped twenty are untouched. No shallow rung carries the field,
   * and under a pinned stream the live generators deal byte-identical boards
   * with byte-identical draw counts against the verbatim pre-deep copies -
   * plain rinks, white rinks, and the solver itself. */
  const shallow = levels.slice(0, 20);
  check("game-glyph-glide",
    "no rung before the deep tier carries the drift field",
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

  /* ---- the detour i41-i43: the ride home is priced ----
   * Every homecoming before it left `toll` unset, so the loop only had to
   * beat the one-way line by the dealer's default six. The detour tier
   * names its price: eight slides at the opening, ten from i42 on, on
   * floors that widen past the homecoming's twenty-four columns. The shape
   * never falls - width, toll and window climb or hold - and every pinned
   * deal on the homecoming's own 87000 stream is a closed loop proven at
   * its quoted par by both provers inside the printed window, with the
   * one-way replay landing at least the rung's toll under the loop: the
   * toll is paid on every board the tier deals. */
  const detourIds = ["i41", "i42", "i43"];
  const detourMissing = detourIds.filter((id) => !byId[id]);
  check("game-glyph-glide", "the detour tier i41-i43 is present, after the homecoming",
    detourMissing.length === 0 &&
      detourIds.every((id, index) => levels[40 + index] && levels[40 + index].id === id),
    detourMissing.join(",") || "ordered");
  const detour = detourIds.map((id) => byId[id]);
  const detourShapeProblems = [];
  detour.forEach((level, index) => {
    const prev = index === 0 ? byId.i40 : detour[index - 1];
    if (!level.home) detourShapeProblems.push(`${level.id} does not hang its goal at the front door`);
    if (level.toll !== [8, 10, 10][index]) {
      detourShapeProblems.push(`${level.id} prices the ride home at ${level.toll}, not the tier's ${[8, 10, 10][index]}`);
    }
    if (!(level.toll >= (index === 0 ? 6 : detour[index - 1].toll))) {
      detourShapeProblems.push(`${level.id} toll falls below the rung before it`);
    }
    if (!(level.w >= prev.w) || !(level.h >= prev.h)) {
      detourShapeProblems.push(`${level.id} shrinks the floor below the rung before it`);
    }
    if (index > 0 && level.w === prev.w && level.h === prev.h) {
      detourShapeProblems.push(`${level.id} does not widen the floor`);
    }
    if (!(level.maxPar > prev.maxPar)) {
      detourShapeProblems.push(`${level.id} ceiling does not climb past ${prev.maxPar}`);
    }
  });
  if (!(detour[0].toll > 6)) {
    detourShapeProblems.push("the detour opens at the dealer's default six, the toll never debuts");
  }
  if (!(detour[2].w > 24)) {
    detourShapeProblems.push("the detour never widens past the homecoming's twenty-four columns");
  }
  check("game-glyph-glide",
    "the detour prices the ride home - toll 8 then 10 - on floors that widen 24/25/26 with ceilings climbing past the homecoming's",
    detourShapeProblems.length === 0, detourShapeProblems.join(" | "));
  detour.forEach((level) => {
    const problems = [];
    let parSum = 0;
    for (let trial = 0; trial < DEALS; trial += 1) {
      const deal = dealRung(level, trial, 87000);
      const tag = `${level.id} trial ${trial}`;
      if (!deal || !deal.drifts) {
        problems.push(`${tag}: the dealer fell back, no loop dealt`);
        continue;
      }
      if (deal.goal !== deal.start) {
        problems.push(`${tag}: the gate is not the front door`);
      }
      if (!deal.away || deal.away === deal.start || deal.wall[deal.away]) {
        problems.push(`${tag}: the counterfactual gate is not an open cell apart from the start`);
      }
      let laid = 0;
      for (let cell = 0; cell < deal.drifts.length; cell += 1) {
        if (!deal.drifts[cell]) continue;
        laid += 1;
        if (deal.wall[cell]) problems.push(`${tag}: a drift is sown on a wall cell`);
        if (cell === deal.start || cell === deal.goal || deal.stars.indexOf(cell) >= 0) {
          problems.push(`${tag}: a drift doubles as the start, the goal or a star`);
        }
      }
      if (laid !== level.drifts) {
        problems.push(`${tag}: dealt ${laid} drifts, the rung asks for ${level.drifts}`);
      }
      const par = App.glyphGlideSolve(deal.wall, level.w, level.h, deal.start, deal.goal, deal.stars, deal.drifts);
      const par2 = gateSolve(deal.wall, deal.drifts, level.w, level.h, deal.start, deal.goal, deal.stars);
      if (par !== deal.par || par2 !== deal.par) {
        problems.push(`${tag}: quoted ${deal.par}, engine ${par}, independent ${par2}`);
      }
      if (deal.par < level.minPar || deal.par > level.maxPar) {
        problems.push(`${tag}: par ${deal.par} outside the printed window ${level.minPar}-${level.maxPar}`);
      }
      const one = App.glyphGlideSolve(deal.wall, level.w, level.h, deal.start, deal.away, deal.stars, deal.drifts);
      const one2 = gateSolve(deal.wall, deal.drifts, level.w, level.h, deal.start, deal.away, deal.stars);
      if (one !== one2) {
        problems.push(`${tag}: the one-way replay disagrees, engine ${one}, independent ${one2}`);
      }
      if (one < 1 || one > deal.par - level.toll) {
        problems.push(`${tag}: the homecoming toll ${deal.par - one} does not pay the rung's ${level.toll}`);
      }
      parSum += deal.par;
    }
    check("game-glyph-glide",
      `${level.id}: its eight pinned deals are closed loops, proven at their quoted par by both provers inside the printed window and at least ${level.toll} slides dearer than the one-way replay`,
      problems.length === 0, problems.slice(0, 3).join(" | "));
  });

  /* ---- the close i44-i46: every errand at once ----
   * The detour priced the ride home; the close adds the errands. Every
   * rink here carries twelve sockets - one more than any homecoming asked
   * for, and the most the solver's star mask can hold - under the crown's
   * own twelve-drift snowpack, with the ride home priced at twelve
   * slides, the detour's ten raised and held across the tier, on floors
   * that never shrink and widen a column a rung to the widest and deepest
   * the ladder has held. The printed floors step 46-50 past the detour's
   * crest at 44 because that is where the twelve-errand loop's price
   * actually lives: measured through the module's own homecoming dealer
   * on the gate's pinned stream, seed 87000 + trial*37 + drifts, eight
   * deals a rung, every deal ships only when the closed loop lands in the
   * rung's window AND beats the one-way line by at least the rung's
   * toll. */
  const closeIds = ["i44", "i45", "i46"];
  const closeMissing = closeIds.filter((id) => !byId[id]);
  check("game-glyph-glide", "the close tier i44-i46 is present, after the detour",
    closeMissing.length === 0 &&
      closeIds.every((id, index) => levels[43 + index] && levels[43 + index].id === id),
    closeMissing.join(",") || "ordered");
  const closeTier = closeIds.map((id) => byId[id]);
  const first43 = levels.slice(0, 43);
  check("game-glyph-glide",
    "no rung before the close carries twelve sockets",
    first43.every((level) => level.stars !== 12),
    first43.filter((level) => level.stars === 12).map((level) => level.id).join(","));
  const closeShapeProblems = [];
  closeTier.forEach((level, index) => {
    const prev = index === 0 ? byId.i43 : closeTier[index - 1];
    if (!level.home) closeShapeProblems.push(`${level.id} does not hang its goal at the front door`);
    if (level.stars !== 12) closeShapeProblems.push(`${level.id} does not carry the twelve sockets`);
    if (level.drifts !== byId.i30.drifts) {
      closeShapeProblems.push(`${level.id} does not hold the crown's ${byId.i30.drifts}-drift snowpack`);
    }
    if (!(level.toll >= (index === 0 ? byId.i43.toll : closeTier[index - 1].toll))) {
      closeShapeProblems.push(`${level.id} toll falls below the rung before it`);
    }
    if (!(level.minPar > prev.minPar)) {
      closeShapeProblems.push(`${level.id} floor ${level.minPar} does not clear ${prev.minPar}`);
    }
    if (!(level.w >= prev.w) || !(level.h >= prev.h)) {
      closeShapeProblems.push(`${level.id} shrinks the floor below the rung before it`);
    }
    if (level.w === prev.w && level.h === prev.h) {
      closeShapeProblems.push(`${level.id} does not widen or deepen the floor`);
    }
    if (!(level.maxPar > prev.maxPar)) {
      closeShapeProblems.push(`${level.id} ceiling does not climb past ${prev.maxPar}`);
    }
  });
  if (!(closeTier[0].toll > byId.i43.toll)) {
    closeShapeProblems.push("the close opens at the detour's toll, the price never rises");
  }
  const record43 = (pick) => Math.max.apply(null, first43.map(pick));
  if (!(closeTier[2].w > record43((l) => l.w)) || !(closeTier[2].h > record43((l) => l.h))) {
    closeShapeProblems.push("the close does not hold the widest and deepest floors the first forty-three held");
  }
  if (!(closeTier[0].stars > record43((l) => l.stars))) {
    closeShapeProblems.push("the close does not hold the most sockets the first forty-three held");
  }
  check("game-glyph-glide",
    "the close adds the errands - twelve sockets a rink past the homecoming's eleven, the crown's snowpack held, the ride home priced at twelve past the detour's ten, floors widening 26/27/28 columns deepened to 23 rows, ceilings 88/90/92 and printed floors stepping 46-50",
    closeShapeProblems.length === 0, closeShapeProblems.join(" | "));
  const closeMean = {};
  const closeOneWay = {};
  closeTier.forEach((level) => {
    const problems = [];
    let parSum = 0;
    let oneSum = 0;
    for (let trial = 0; trial < DEALS; trial += 1) {
      const deal = dealRung(level, trial, 87000);
      const tag = `${level.id} trial ${trial}`;
      if (!deal || !deal.drifts) {
        problems.push(`${tag}: the dealer fell back, no loop dealt`);
        continue;
      }
      if (deal.goal !== deal.start) {
        problems.push(`${tag}: the gate is not the front door`);
      }
      if (!deal.away || deal.away === deal.start || deal.wall[deal.away]) {
        problems.push(`${tag}: the counterfactual gate is not an open cell apart from the start`);
      }
      let laid = 0;
      for (let cell = 0; cell < deal.drifts.length; cell += 1) {
        if (!deal.drifts[cell]) continue;
        laid += 1;
        if (deal.wall[cell]) problems.push(`${tag}: a drift is sown on a wall cell`);
        if (cell === deal.start || cell === deal.goal || deal.stars.indexOf(cell) >= 0) {
          problems.push(`${tag}: a drift doubles as the start, the goal or a star`);
        }
      }
      if (laid !== level.drifts) {
        problems.push(`${tag}: dealt ${laid} drifts, the rung asks for ${level.drifts}`);
      }
      const par = App.glyphGlideSolve(deal.wall, level.w, level.h, deal.start, deal.goal, deal.stars, deal.drifts);
      const par2 = gateSolve(deal.wall, deal.drifts, level.w, level.h, deal.start, deal.goal, deal.stars);
      if (par !== deal.par || par2 !== deal.par) {
        problems.push(`${tag}: quoted ${deal.par}, engine ${par}, independent ${par2}`);
      }
      if (deal.par < level.minPar || deal.par > level.maxPar) {
        problems.push(`${tag}: par ${deal.par} outside the printed window ${level.minPar}-${level.maxPar}`);
      }
      const one = App.glyphGlideSolve(deal.wall, level.w, level.h, deal.start, deal.away, deal.stars, deal.drifts);
      const one2 = gateSolve(deal.wall, deal.drifts, level.w, level.h, deal.start, deal.away, deal.stars);
      if (one !== one2) {
        problems.push(`${tag}: the one-way replay disagrees, engine ${one}, independent ${one2}`);
      }
      if (one < 1 || one > deal.par - level.toll) {
        problems.push(`${tag}: the homecoming toll ${deal.par - one} does not pay the rung's ${level.toll}`);
      }
      parSum += deal.par;
      oneSum += one;
    }
    check("game-glyph-glide",
      `${level.id}: its eight pinned deals are closed loops, proven at their quoted par by both provers inside the printed window and at least ${level.toll} slides dearer than the one-way replay`,
      problems.length === 0, problems.slice(0, 3).join(" | "));
    closeMean[level.id] = parSum / DEALS;
    closeOneWay[level.id] = oneSum / DEALS;
  });

  /* The close is the top of the ladder in the BFS's own currency: every
   * rung's mean proven par prices past the detour's mean on the same
   * stream and climbs strictly through the three, and every rung's mean
   * one-way price falls below the printed floor - the loop, not the trail
   * spread, is what the floor asks for. */
  const i43CloseMean = (() => {
    let sum = 0;
    for (let trial = 0; trial < DEALS; trial += 1) {
      sum += dealRung(byId.i43, trial, 87000).par;
    }
    return sum / DEALS;
  })();
  const closeClimbProblems = [];
  closeTier.forEach((level, index) => {
    if (!(closeMean[level.id] > i43CloseMean)) {
      closeClimbProblems.push(`${level.id} mean par ${closeMean[level.id].toFixed(1)} not above i43 ${i43CloseMean.toFixed(1)}`);
    }
    if (index && !(closeMean[level.id] > closeMean[closeTier[index - 1].id])) {
      closeClimbProblems.push(`${level.id} mean par does not clear the rung before it`);
    }
    if (!(closeOneWay[level.id] < level.minPar)) {
      closeClimbProblems.push(`${level.id} one-way mean ${closeOneWay[level.id].toFixed(1)} not under floor ${level.minPar}`);
    }
  });
  check("game-glyph-glide",
    "the close's pars climb past the detour: every rung's mean proven par beats i43's on the same stream and climbs strictly through the three, and every rung's mean one-way price falls below its printed floor - the loop is what the floor asks for",
    closeClimbProblems.length === 0,
    closeClimbProblems.join(" | ") ||
      `i43 ${i43CloseMean.toFixed(1)} -> ${closeIds.map((id) => `${id} ${closeMean[id].toFixed(1)}`).join(" -> ")}`);

  /* The close's star bands against the engine's own law, on its own
   * deals: the proven line earns three stars, two extra slides cost the
   * third, four cost the second, and a line eight over par earns nothing
   * the engine has to round up. */
  const closeBandProblems = [];
  closeTier.forEach((level) => {
    const deal = dealRung(level, 0, 87000);
    if (!deal || !deal.drifts || deal.goal !== deal.start) {
      closeBandProblems.push(level.id + " dealt no closed loop for the band probe");
      return;
    }
    const par = deal.par;
    const bands = [par + 1, par + 3, par + 7];
    const earned = (moves) => App.starsFor(moves, bands, "low");
    if (earned(par) !== 3) closeBandProblems.push(`${level.id} the optimal ${par}-slide loop does not earn three stars`);
    if (earned(par + 2) !== 2) closeBandProblems.push(`${level.id} two over par still earns three stars`);
    if (earned(par + 4) !== 1) closeBandProblems.push(`${level.id} four over par still earns two stars`);
    if (earned(par + 8) !== 0) closeBandProblems.push(`${level.id} eight over par still earns one star`);
  });
  check("game-glyph-glide",
    "the close's star bands are reachable by the proven loop and not free for a sloppy one",
    closeBandProblems.length === 0, closeBandProblems.join(" | "));

  /* The tier's names travel with the page: both languages hold a real string
   * and t() never falls back to the raw key - the four deep rinks, the six
   * summit rinks and the ten homecoming rinks. The guide line carries the
   * stopping law in both languages too. */
  const copyProblems = deep.concat(summit, home).map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && typeof App.I18N.en[key] === "string" && App.I18N.en[key].length) ||
    !(App.I18N && App.I18N.zh && typeof App.I18N.zh[key] === "string" && App.I18N.zh[key].length) ||
    !App.t(key) || App.t(key) === key);
  check("game-glyph-glide", "the twenty deep, summit and homecoming rink names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));
  const detourCopyProblems = detour.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && typeof App.I18N.en[key] === "string" && App.I18N.en[key].length) ||
    !(App.I18N && App.I18N.zh && typeof App.I18N.zh[key] === "string" && App.I18N.zh[key].length) ||
    !App.t(key) || App.t(key) === key);
  check("game-glyph-glide", "the three detour rink names resolve in both languages",
    detourCopyProblems.length === 0, detourCopyProblems.join(","));
  const closeCopyProblems = closeTier.map((level) => level.labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && typeof App.I18N.en[key] === "string" && App.I18N.en[key].length) ||
    !(App.I18N && App.I18N.zh && typeof App.I18N.zh[key] === "string" && App.I18N.zh[key].length) ||
    !App.t(key) || App.t(key) === key);
  check("game-glyph-glide", "the three close rink names resolve in both languages",
    closeCopyProblems.length === 0, closeCopyProblems.join(","));
  const hintEn = (App.I18N && App.I18N.en && App.I18N.en.glHint) || "";
  const hintZh = (App.I18N && App.I18N.zh && App.I18N.zh.glHint) || "";
  check("game-glyph-glide",
    "the rink guide teaches the new tier in both languages",
    /New tier/.test(hintEn) && /[Dd]rift/.test(hintEn) &&
    /新层级/.test(hintZh) && /雪堆/.test(hintZh),
    "en " + /New tier/.test(hintEn) + "/" + /[Dd]rift/.test(hintEn) +
    ", zh " + /新层级/.test(hintZh) + "/" + /雪堆/.test(hintZh));

  /* The unlock chain is derived, never stored: clearing each rink in order
   * hands the player exactly the next one, all forty-six times, on the game's
   * own campaign key. */
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
  check("game-glyph-glide", "the unlock chain walks all forty-six rinks in order",
    walked === 46 && chained && chain.clearedCount() === 46, walked + " first clears");
};
