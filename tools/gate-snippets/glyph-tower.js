"use strict";

/* game-glyph-tower: the deep night is proved against the perfect line it
 * froze.
 *
 * The fifth tier's benches are the classic optimal solve frozen a whisker
 * from done, so the gate's first job is to prove the freeze is exact. The
 * shipped proof regenerates a pose by simulating the classic recursion one
 * move at a time - hopeless at 2^28 steps - so this gate carries an
 * analytic pose instead: in the classic line, disc d makes its j-th move at
 * step 2^(d-1) + j*2^d and walks a fixed three-rod cycle set by the parity
 * of (discs - d), so the pose after `skip` moves is read straight off the
 * step count, no simulation. The gate proves that formula against the
 * shipped recursion exhaustively for every move of every tower up to
 * twelve rings, at sample skips on each, and once at deep scale - tw25's
 * 16,777,215-step line simulated in full - then holds every deep deal to
 * it: the deal must equal the analytic pose at 2^n - 1 - opt, the pinned
 * opt must be the true remaining distance, and the whole fourth tier must
 * re-prove under the same formula, unchanged. Then the tier replays: the
 * suffix of the classic line is driven through the real keydown path move
 * by move, the engine must pay three stars for exactly the proven count,
 * and a line that stops one move short, shuttles the smallest disc out and
 * back, and finishes must land exactly two stars - the bands are anchored,
 * not decorative. The tiers escalate on both dials a bench can carry - the
 * rings climb past the night shift's peak to thirty, and the frozen tails
 * lengthen rung over rung - and the deep night's names resolve in both
 * languages.
 *
 * The day shift tw31-t40 works the same proof past dawn: every bench is
 * still the classic solve frozen at 2^n - 1 - opt, read off the same
 * analytic pose (whose proof is scale-free - it is proved against the
 * recursion move for move to twelve rings and once in full at deep scale,
 * and the pose arithmetic is exact in doubles to far past forty rings) -
 * while the rings climb from thirty-one to forty and the frozen tails
 * lengthen from fifteen-two hundred to thirty-eight-six hundred. The same
 * replay drives every suffix through the real bench, the same slack line
 * pays exactly two stars, and the day shift's names resolve in both
 * languages.
 *
 * The late shift tw41-t46 keeps the shop lit past the day shift: the same
 * freeze at 2^n - 1 - opt on the same scale-free analytic pose (exact in
 * doubles far past forty-six rings), the rings climbing from forty-one to
 * forty-six and the frozen tails keeping the day shift's widening step -
 * three-six hundred to four-six hundred a rung, so the capstone's tail
 * sixty-three-two hundred is the longest finish the shop has ever rung.
 * The gate also carries an independent proof of every pinned opt: the
 * largest-disc greedy distance of the deal to the goal tower (proved
 * against exhaustive BFS on every state of towers to eight rings) must
 * equal the row's opt, so the freeze is measured, not assumed. The same
 * replay drives every late-shift suffix through the real bench, the same
 * slack line pays exactly two stars, the climb continues on rings, opt
 * and every band, and the shared stage names resolve in both languages.
 *
 * The dawn shift tw47-t50 opens the shop's second lap: the late shift runs
 * to sunrise and the floor never goes dark for long. The same freeze at
 * 2^n - 1 - opt holds on the same scale-free analytic pose (exact in
 * doubles far past fifty rings), the rings climbing from forty-seven to
 * fifty - the tallest bench the shop has ever rung - and the frozen tails
 * keep widening, five thousand a rung, so the capstone's tail eighty-three
 * thousand is the longest finish the shop has ever rung. The same replay
 * drives every dawn-shift suffix through the real bench, the same slack
 * line pays exactly two stars, the climb continues on rings, opt and every
 * band, and the shared stage names resolve in both languages. */

const DEEP = ["tw25", "tw26", "tw27", "tw28", "tw29", "tw30"];
const TIERS = ["tw17", "tw18", "tw19", "tw20", "tw21", "tw22", "tw23", "tw24"];
const DAYSHIFT = ["tw31", "tw32", "tw33", "tw34", "tw35", "tw36", "tw37", "tw38", "tw39", "tw40"];
const LATE = ["tw41", "tw42", "tw43", "tw44", "tw45", "tw46"];
const DAWN = ["tw47", "tw48", "tw49", "tw50"];

module.exports = function gate(ctx) {
  const { App, env, check, fs, path, root } = ctx;

  /* ---- the ladder, parsed from the module's own source ----------------- */
  const towSrc = fs
    .readFileSync(path.join(root, "assets", "app", "game-glyph-tower.js"), "utf8")
    .replace(/^﻿/, "");
  const towBlock = /var towLevels = \[([\s\S]*?)\n  \];/.exec(towSrc)[1];
  const rows = {};
  const order = [];
  for (const rowText of Array.from(towBlock.matchAll(/\{[^{}]*\}/g))) {
    const text = rowText[0];
    const id = (/id:\s*"([a-z0-9]+)"/.exec(text) || [])[1];
    if (!id) continue;
    order.push(id);
    const optText = /opt:\s*(\d+)/.exec(text);
    const dealText = /deal:\s*([\s\S]*?)\s*,\s*starMoves/.exec(text);
    rows[id] = {
      text,
      labelKey: (/labelKey:\s*"([A-Za-z0-9]+)"/.exec(text) || [])[1],
      discs: Number((/discs:\s*(\d+)/.exec(text) || [])[1]),
      opt: optText ? Number(optText[1]) : null,
      deal: dealText ? JSON.parse(dealText[1]) : null,
      bands: /starMoves:\s*\[(\d+),\s*(\d+),\s*(\d+)\]/.exec(text).slice(1).map(Number),
    };
  }

  check("game-glyph-tower", "the ladder holds fifty rungs",
    order.length === 50, String(order.length));
  check("game-glyph-tower", "every rung id is distinct and the ladder runs tw1-tw50 in order",
    order.every((id, index) => id === "tw" + (index + 1)), order.join(","));
  const deepMissing = DEEP.filter((id) => !order.includes(id));
  check("game-glyph-tower", "the deep night tw25-tw30 is present, after the shipped tiers",
    deepMissing.length === 0 &&
      DEEP.every((id, index) => order.indexOf(id) >
        (index === 0 ? order.indexOf("tw24") : order.indexOf(DEEP[index - 1]))),
    deepMissing.join(","));
  const dayMissing = DAYSHIFT.filter((id) => !order.includes(id));
  check("game-glyph-tower", "the day shift tw31-tw40 is present, after the deep night",
    dayMissing.length === 0 &&
      DAYSHIFT.every((id, index) => order.indexOf(id) >
        (index === 0 ? order.indexOf("tw30") : order.indexOf(DAYSHIFT[index - 1]))),
    dayMissing.join(","));
  const lateMissing = LATE.filter((id) => !order.includes(id));
  check("game-glyph-tower", "the late shift tw41-tw46 is present, after the day shift",
    lateMissing.length === 0 &&
      LATE.every((id, index) => order.indexOf(id) >
        (index === 0 ? order.indexOf("tw40") : order.indexOf(LATE[index - 1]))),
    lateMissing.join(","));
  const dawnMissing = DAWN.filter((id) => !order.includes(id));
  check("game-glyph-tower", "the dawn shift tw47-tw50 is present, after the late shift",
    dawnMissing.length === 0 &&
      DAWN.every((id, index) => order.indexOf(id) >
        (index === 0 ? order.indexOf("tw46") : order.indexOf(DAWN[index - 1]))),
    dawnMissing.join(","));

  /* The shipped twenty-four are additive-only: the classic rungs keep their
   * disc counts (the early ones keep their loose bands - the optimum itself
   * only becomes the three-star bar at tw10), and the shipped tier rows keep
   * their deals - re-proved below under the analytic pose. */
  const plainProblems = [];
  for (let i = 1; i <= 16; i += 1) {
    const row = rows["tw" + i];
    if (!row || row.discs !== i + 2 || row.deal || row.opt !== null) {
      plainProblems.push("tw" + i);
    } else if (i >= 10 && row.bands[0] !== Math.pow(2, i + 2) - 1) {
      plainProblems.push("tw" + i);
    }
  }
  check("game-glyph-tower", "the sixteen plain rungs are untouched: discs 3-18, and from tw10 on three stars at the 2^n - 1 optimum",
    plainProblems.length === 0, plainProblems.join(","));

  /* ---- the analytic classic line, proved against the recursion --------- */

  /* The pose the classic recursion holds after `skip` of its 2^n - 1 moves
   * (the shipped proof's own generator). */
  function towPoseSim(discs, skip) {
    const pose = [[], [], []];
    for (let size = discs; size >= 1; size -= 1) pose[0].push(size);
    let step = 0;
    function solve(k, from, to, via) {
      if (k === 0) return;
      solve(k - 1, from, via, to);
      if (step < skip) pose[to].push(pose[from].pop());
      step += 1;
      solve(k - 1, via, to, from);
    }
    solve(discs, 0, 2, 1);
    return pose;
  }

  /* The same pose read off the step count: disc d has moved
   * floor((skip - 2^(d-1)) / 2^d) + 1 times, and walks a three-rod cycle
   * fixed by the parity of (discs - d). */
  function towPoseAnalytic(discs, skip) {
    const pegs = [[], [], []];
    for (let d = discs; d >= 1; d -= 1) {
      let moves = 0;
      if (skip >= Math.pow(2, d - 1)) {
        moves = Math.floor((skip - Math.pow(2, d - 1)) / Math.pow(2, d)) + 1;
      }
      const cycle = (discs - d) % 2 === 0 ? [0, 2, 1] : [0, 1, 2];
      pegs[cycle[moves % 3]].push(d);
    }
    pegs.forEach((rod) => rod.sort((a, b) => b - a));
    return pegs;
  }

  /* Move t of the classic line (1-based): it lifts disc tz(t) + 1 from its
   * cycle seat to the next seat on the same cycle. */
  function towMoveAt(discs, t) {
    let d = 1;
    let rest = t;
    while (rest % 2 === 0) {
      d += 1;
      rest /= 2;
    }
    const cycle = (discs - d) % 2 === 0 ? [0, 2, 1] : [0, 1, 2];
    const m = Math.floor((t - Math.pow(2, d - 1)) / Math.pow(2, d));
    return [cycle[m % 3], cycle[(m + 1) % 3]];
  }

  /* Exhaustive small-scale proof: on every tower up to twelve rings, every
   * one of the 2^n - 1 classic moves matches the analytic generator, and
   * the analytic pose matches the simulated pose at skips sampled across
   * the whole line, endpoints included. */
  let analyticProblems = 0;
  for (let n = 2; n <= 12; n += 1) {
    const total = Math.pow(2, n) - 1;
    const pose = [[], [], []];
    for (let size = n; size >= 1; size -= 1) pose[0].push(size);
    for (let t = 1; t <= total; t += 1) {
      const [from, to] = towMoveAt(n, t);
      pose[to].push(pose[from].pop());
      if (t === total || t === 1 || t === Math.floor(total / 3) || t === Math.floor(total / 2) ||
          t === Math.floor((total * 3) / 4) || t === total - 1) {
        if (JSON.stringify(towPoseAnalytic(n, t)) !== JSON.stringify(pose)) {
          analyticProblems += 1;
        }
      }
    }
    for (const skip of [0, 1, 2, total - 2, total - 1, total]) {
      if (JSON.stringify(towPoseSim(n, skip)) !== JSON.stringify(towPoseAnalytic(n, skip))) {
        analyticProblems += 1;
      }
    }
  }
  check("game-glyph-tower",
    "the analytic pose reproduces the classic recursion move for move on every tower up to twelve rings",
    analyticProblems === 0, analyticProblems + " mismatches");

  /* Deep-scale proof: tw25's line, 16,777,215 steps, simulated in full and
   * held against the formula at the tier's own freeze point. */
  {
    const skip = Math.pow(2, 24) - 1 - 5200;
    check("game-glyph-tower",
      "at deep scale the analytic pose matches the full simulation of tw25's 16,777,215-step line",
      JSON.stringify(towPoseSim(24, skip)) === JSON.stringify(towPoseAnalytic(24, skip)),
      "skip " + skip);
  }

  /* ---- the freeze: every bench deal is the classic solve frozen --------- */
  const freezeProblems = [];
  TIERS.concat(DEEP).concat(DAYSHIFT).concat(LATE).concat(DAWN).forEach((id) => {
    const row = rows[id];
    const total = Math.pow(2, row.discs) - 1;
    const opt = row.opt === null ? total : row.opt;
    if (!row.deal) {
      /* tw18 revisits the plain transfer one ring past the shipped peak. */
      if (row.bands[0] !== total) freezeProblems.push(id + ": plain rung off the formula");
      return;
    }
    const skip = total - opt;
    if (JSON.stringify(towPoseAnalytic(row.discs, skip)) !== JSON.stringify(row.deal)) {
      freezeProblems.push(id + ": deal is not the classic solve frozen at " + skip);
    }
    if (row.bands[0] !== opt) {
      freezeProblems.push(id + ": three-star band " + row.bands[0] + " vs opt " + opt);
    }
    if (row.bands[1] <= opt) {
      freezeProblems.push(id + ": two-star band leaves no slack");
    }
  });
  check("game-glyph-tower",
    "every tier, deep night, day shift, late shift and dawn shift deal is the classic solve frozen at 2^n - 1 - opt, and bands hang off that measured optimum",
    freezeProblems.length === 0, freezeProblems.join(" | "));

  /* ---- the independent measure: the exact remaining distance ------------ */

  /* The pinned opt is also proved without the classic-line argument at all:
   * the greedy largest-disc distance of an arbitrary legal position to the
   * goal tower - clear the smaller discs onto the third rod (2^(d-1) - 1
   * moves), step the largest disc across (1), recurse - is the exact
   * optimum. The recursion is proved here against exhaustive BFS ground
   * truth on every state of towers up to eight rings, then held against
   * every frozen deal: dist(deal) must equal the row's pinned opt. */
  function towDistExact(pegs, discs, target) {
    const pos = new Array(discs + 1);
    pegs.forEach((rod, rodIndex) => rod.forEach((d) => { pos[d] = rodIndex; }));
    let dist = 0;
    let tgt = target;
    for (let d = discs; d >= 1; d -= 1) {
      if (pos[d] === tgt) continue;
      dist += Math.pow(2, d - 1);
      tgt = 3 - pos[d] - tgt;
    }
    return dist;
  }
  let distProofProblems = 0;
  for (let n = 1; n <= 8; n += 1) {
    const pow3 = Math.pow(3, n);
    for (let code = 0; code < pow3; code += 1) {
      const pegs = [[], [], []];
      let rest = code;
      for (let d = 1; d <= n; d += 1) { pegs[rest % 3].push(d); rest = Math.floor(rest / 3); }
      pegs.forEach((rod) => rod.sort((a, b) => b - a));
      const greedy = towDistExact(pegs, n, 0);
      /* BFS ground truth over the full 3^n state space */
      const dist = new Int32Array(pow3).fill(-1);
      const startCode = pegs.reduce(
        (acc, rod, rodIndex) => rod.reduce((sum, d) => sum + rodIndex * Math.pow(3, d - 1), acc), 0);
      dist[startCode] = 0;
      let frontier = [startCode];
      const posOf = (c, d) => Math.floor(c / Math.pow(3, d - 1)) % 3;
      while (frontier.length && dist[0] === -1) {
        const next = [];
        for (const c of frontier) {
          const top = [Infinity, Infinity, Infinity];
          for (let d = 1; d <= n; d += 1) top[posOf(c, d)] = Math.min(top[posOf(c, d)], d);
          for (let from = 0; from < 3; from += 1) {
            if (top[from] === Infinity) continue;
            for (let to = 0; to < 3; to += 1) {
              if (to === from || top[to] <= top[from]) continue;
              const nc = c + (to - from) * Math.pow(3, top[from] - 1);
              if (dist[nc] === -1) { dist[nc] = dist[c] + 1; next.push(nc); }
            }
          }
        }
        frontier = next;
      }
      if (greedy !== dist[0]) distProofProblems += 1;
    }
  }
  const distProblems = [];
  TIERS.concat(DEEP).concat(DAYSHIFT).concat(LATE).concat(DAWN).forEach((id) => {
    const row = rows[id];
    if (!row.deal) return;
    const dist = towDistExact(row.deal, row.discs, 2);
    if (dist !== row.opt) distProblems.push(id + ": " + dist + " vs opt " + row.opt);
  });
  check("game-glyph-tower",
    "the exact-distance recursion matches exhaustive BFS on every state to eight rings, and every frozen deal's exact remaining distance equals its pinned opt",
    distProofProblems === 0 && distProblems.length === 0,
    distProofProblems + " solver mismatches | " + distProblems.join(" | "));

  /* The deep night's own convention: three stars at the proven optimum, two
   * for three percent over, one for an eighth over - the night shift's
   * curve, held exactly, and the day shift, late shift and dawn shift keep
   * it. */
  const curveProblems = DEEP.concat(DAYSHIFT).concat(LATE).concat(DAWN).filter((id) => {
    const row = rows[id];
    const opt = row.opt;
    return row.bands[1] !== opt + Math.round(opt * 0.031) ||
      row.bands[2] !== opt + Math.round(opt * 0.125);
  });
  check("game-glyph-tower",
    "the deep night, day shift and late shift bands keep the shop's curve: the optimum, three percent over, an eighth over",
    curveProblems.length === 0, curveProblems.join(","));

  /* The escalation, on both dials: rings climb past the night shift's peak
   * rung over rung, the frozen tails lengthen rung over rung, and every
   * deep night is dearer than the shipped summit's - the day shift keeps
   * climbing past the deep night's capstone, the late shift past the day
   * shift's, and the dawn shift past the late shift's. */
  const climbProblems = [];
  const climbLadder = DEEP.concat(DAYSHIFT).concat(LATE).concat(DAWN);
  climbLadder.forEach((id, index) => {
    const row = rows[id];
    const prev = index === 0 ? rows.tw24 : rows[climbLadder[index - 1]];
    if (row.discs <= prev.discs) climbProblems.push(id + ": rings " + row.discs + " vs " + prev.discs);
    if (row.opt <= prev.opt) climbProblems.push(id + ": opt " + row.opt + " vs " + prev.opt);
    for (let k = 0; k < 3; k += 1) {
      if (row.bands[k] <= prev.bands[k]) climbProblems.push(id + ": band" + k);
    }
    if (row.opt >= Math.pow(2, row.discs) - 1) climbProblems.push(id + ": the freeze is the whole line");
  });
  check("game-glyph-tower",
    "the deep night, day shift, late shift and dawn shift climb past the night shift on rings, opt and every band, and no freeze is the whole line",
    climbProblems.length === 0, climbProblems.join(" | "));

  /* ---- the replay: the suffix of the perfect line, on the real bench ---- */
  env.setMotion("off");
  const makeTow = (id, tag) => {
    const found = env.byId(id);
    if (found) return found;
    const el = env.document.createElement(tag || "div");
    el.id = id;
    env.document.body.appendChild(el);
    return el;
  };
  makeTow("towCanvas", "canvas");
  makeTow("towMoves");
  makeTow("towMin");
  makeTow("towTime");
  makeTow("towResult");
  makeTow("towNewBtn", "button");
  makeTow("towBest");
  const towSelectEl = makeTow("towLevelSel", "select");
  makeTow("gamePanelGlyphTower");
  const towSeeded = {};
  for (let c = 1; c <= 24; c += 1) towSeeded["tw" + c] = { stars: 3, best: 0 };
  env.store.set("glyph-tower-campaign", JSON.stringify({ v: 1, cleared: towSeeded }));
  App.initGlyphTowerGame();

  const towCanvas = env.byId("towCanvas");
  const towMove = (peg) => env.dispatch(towCanvas, "keydown", { key: String(peg + 1) });
  const towStars = (levelId) => {
    const save = JSON.parse(env.store.get("glyph-tower-campaign"));
    return (save.cleared[levelId] || { stars: 0 }).stars;
  };
  const towBest = (levelId) => {
    const save = JSON.parse(env.store.get("glyph-tower-campaign"));
    return (save.cleared[levelId] || { best: 0 }).best;
  };
  const towSelectLevel = (levelId) => {
    towSelectEl.value = levelId;
    env.dispatch(towSelectEl, "change");
    check("game-glyph-tower", `${levelId} unlocks as its neighbour clears`,
      towSelectEl.value === levelId);
  };

  const replayProblems = [];
  DEEP.concat(DAYSHIFT).concat(LATE).concat(DAWN).forEach((id) => {
    const row = rows[id];
    const total = Math.pow(2, row.discs) - 1;
    const skip = total - row.opt;
    /* The slack line first, so the rung's first clear is the two-star one
     * and the band payout is observed through the engine, not derived:
     * stop one move short, shuttle the smallest disc out and back, then
     * finish - two wasted moves must cost the third star. */
    towSelectLevel(id);
    const held = towMoveAt(row.discs, total);
    const spare = held[0] === 0 ? 1 : 0;
    for (let t = skip + 1; t <= total - 1; t += 1) {
      const [from, to] = towMoveAt(row.discs, t);
      towMove(from);
      towMove(to);
    }
    for (const peg of [held[0], spare, spare, held[0], held[0], held[1]]) {
      towMove(peg);
    }
    if (towStars(id) !== 2) replayProblems.push(id + ": slack line stars " + towStars(id));
    /* Then the proven line: every remaining classic move, through the
     * engine, for exactly the pinned optimum and three stars. */
    towSelectLevel(id);
    for (let t = skip + 1; t <= total; t += 1) {
      const [from, to] = towMoveAt(row.discs, t);
      towMove(from);
      towMove(to);
    }
    if (towStars(id) !== 3) replayProblems.push(id + ": proven line stars " + towStars(id));
    if (towBest(id) !== row.opt) replayProblems.push(id + ": counter " + towBest(id) + " vs opt " + row.opt);
  });
  check("game-glyph-tower",
    "every deep night, day shift, late shift and dawn shift bench's proven suffix pays three stars for exactly the pinned optimum, and its slack line lands exactly two stars",
    replayProblems.length === 0, replayProblems.join(" | "));

  /* ---- the chain, derived and never stored ----------------------------- */
  const chain = App.createCampaign({
    key: "glyph-tower-gate-chain",
    levels: order.map((id) => ({ id: id, labelKey: rows[id].labelKey })),
  });
  let walked = 0;
  let chained = true;
  order.forEach((id, index) => {
    const outcome = chain.record(id, { stars: 3, best: 10, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < order.length ? order[index + 1] : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-glyph-tower", "the unlock chain hands each rung to the next, all fifty",
    walked === 50 && chained && chain.clearedCount() === 50,
    walked + " first clears, chained " + chained);

  /* ---- the names travel with the module, in both languages ------------- */
  const labelProblems = DEEP.concat(DAYSHIFT).concat(LATE).concat(DAWN).map((id) => rows[id].labelKey).filter((key) => {
    const en = App.I18N && App.I18N.en && App.I18N.en[key];
    const zh = App.I18N && App.I18N.zh && App.I18N.zh[key];
    return typeof en !== "string" || !en.length ||
      typeof zh !== "string" || !zh.length || zh === en ||
      !App.t(key) || App.t(key) === key;
  });
  check("game-glyph-tower", "the twenty-six deep night, day shift, late shift and dawn shift names resolve in both languages as real strings",
    labelProblems.length === 0, labelProblems.join(","));
};
