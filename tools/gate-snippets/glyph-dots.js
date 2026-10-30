"use strict";

/* game-glyph-dots: what the gate proves and why the bar is what it is.
 *
 * The deep tier ships no new habit, so the gate's job is to prove the old
 * ones bite on plates and in pairings the ladder never tried - measured in
 * the engine's own currency, the margin the scripted bench players take off
 * the rival. The bench re-hosted here is the shipped tier bench from
 * tools/verify-levels.js: the same three hands (a greedy line, a competent
 * double-cross line, a plate-reading line), the same seeded Math.random, the
 * same seed ring, the same bar - non-shaky rungs must fall to the strong
 * hands on every seeded run with three stars earned and the greedy hand
 * never three-starring; shaky rungs must clear the fifteen-seed distribution
 * bar d17 ships (nine wins, eight two-star lines, three stars rare but real
 * at two to nine in fifteen). d17 itself re-runs through this gate first as
 * calibration, so the bar the deep tier meets is the shipped bar.
 *
 * The engine is lifted out of the module the same way the shipped bench
 * lifts it - source-sliced and evaluated in this realm, because the booted
 * app runs inside the stub sandbox and its context boundary taxes every
 * global read the tight loops make. The gate then proves the lifted engine
 * is the shipped one: the module's own exported ladder (App.dotsLevels) must
 * match the sliced rows field for field, so what the bench measures is what
 * the page ships.
 *
 * The tier's one lesson - the habits are not plate-proof - is then proved
 * three ways. Structurally: no shipped rung pairs the six-box plate with
 * the rival's opening stick and none pairs a blunder with it; every deep
 * rung carries one of the two pairings, and d22's deals contain the
 * hold-three signature, a rival decline with three boxes standing, which no
 * blunder-free shipped rival can produce. Load-bearing: cutting the pairing
 * habit out of a deep rung breaks or eases it - unflip d21 and the strong
 * hand wins by ten where it won by two, unflip d22 and the rival wins the
 * plate outright, unshake d23 or d24 and the three-star band falls out of
 * reach. Measured: the tail sweep on the flipped six-box plate (holds one
 * through five) lands its narrowest margin and its largest rival share
 * exactly on d21's tail, and the shipped peak's own sheet, seated on the
 * deep plate, concedes ten boxes where the deep sheets concede two and
 * four - the projection of an earlier rung onto the deep plate fails.
 *
 * The summit d25-d30 pairs the two extremes the ladder kept apart: the
 * widest plate it never poured (eight boxes - first past seven) and the
 * heaviest shake it ever handed a flipped full-plate reader (0.035, past
 * the deep tier's 0.015). The wide half rides the deterministic two-seed
 * bar and is proved by narrowing: the strong hand's win steps down
 * twenty-four, fourteen, two, its share of the plate steps up, ending
 * past the deep tier's own narrowest (d21) on a bigger plate, and the
 * tail sweep over holds zero through five lands the narrowest win on
 * d27's tail of two and loses the plate outright at three - untail the
 * five or the one and the strong line drops under its band, so every
 * shipped tail is load-bearing. The shaken half rides the fifteen-seed
 * bar and is proved by the ask: the three-star band climbs twenty-one,
 * twenty-five, twenty-nine, past d24's fifteen, while the unshaken sheet
 * lands nine under every band, and d30 closes the ladder as the
 * campaign's heaviest flipped shake and highest three-star ask. The
 * sweep also measures where the shake must stop: at 0.04 the greedy hand
 * overtakes the strong one. */

module.exports = function gate(ctx) {
  const { App, check, fs, path, root } = ctx;

  /* The ladder as the booted module exports it, and the same ladder lifted
   * out of the module source for the bench - proven identical below. */
  const liveLevels = App.dotsLevels;
  const deepIds = ["d21", "d22", "d23", "d24"];
  const summitIds = ["d25", "d26", "d27", "d28", "d29", "d30"];

  check("game-glyph-dots", "the module exports its ladder for the gate",
    Array.isArray(liveLevels) && liveLevels.length === 30,
    String(liveLevels && liveLevels.length));

  const dotsSource = fs
    .readFileSync(path.join(root, "assets", "app", "game-glyph-dots.js"), "utf8")
    .replace(/^﻿/, "");
  const dotsSlice = dotsSource.slice(
    dotsSource.indexOf("var dotRanks"),
    dotsSource.indexOf("function initDotsGame"),
  );
  const api = new Function(
    "var dotsYou = 1; var dotsAi = 2;\n" +
      dotsSlice +
      "\nreturn { dotRanks, dotsAiMove, dotsLegal, dotsApply, dotsCount, dotsGifts, dotsGiftRun, dotsUnclaimed, dotsSafe, dotsChainCost };",
  )();
  const levels = api.dotRanks;

  /* The lifted engine is the shipped one: row for row, the exported ladder
   * and the sliced ladder agree on every field the game reads. */
  const wiringProblems = [];
  if (liveLevels.length !== levels.length) {
    wiringProblems.push("ladder length differs");
  }
  levels.forEach((level, index) => {
    const live = liveLevels[index];
    ["id", "labelKey", "boxes", "blunder", "hold", "foeFirst", "setup",
      "count", "margin"].forEach((field) => {
      if (JSON.stringify(live[field]) !== JSON.stringify(level[field])) {
        wiringProblems.push(`${level.id}.${field} differs`);
      }
    });
  });
  check("game-glyph-dots",
    "the benched engine and the booted module carry the same ladder",
    wiringProblems.length === 0, wiringProblems.join(" | "));

  check("game-glyph-dots", "the ladder holds thirty rungs",
    levels.length === 30, String(levels.length));
  check("game-glyph-dots", "every rung id is distinct",
    new Set(levels.map((level) => level.id)).size === levels.length,
    levels.map((level) => level.id).join(","));
  const missing = deepIds.filter((id) =>
    !levels.some((level) => level.id === id));
  check("game-glyph-dots", "the deep tier d21-d24 is present",
    missing.length === 0, missing.join(","));
  const missingSummit = summitIds.filter((id) =>
    !levels.some((level) => level.id === id));
  check("game-glyph-dots", "the summit tier d25-d30 is present",
    missingSummit.length === 0, missingSummit.join(","));

  const byId = {};
  levels.forEach((level) => { byId[level.id] = level; });

  /* The bench, re-hosted from tools/verify-levels.js: same hands, same
   * seeded Math.random, same seed ring, every deal driven through the
   * lifted engine. */
  const dotsFirstSafe = (state) => {
    const legal = api.dotsLegal(state);
    for (const move of legal) {
      if (api.dotsSafe(state, move)) return move;
    }
    return null;
  };
  const dotsShortestOpen = (state) => {
    const legal = api.dotsLegal(state);
    let cheapest = null;
    let cost = Infinity;
    for (const move of legal) {
      const c = api.dotsChainCost(state, move, 1);
      if (c < cost) {
        cost = c;
        cheapest = move;
      }
    }
    return cheapest;
  };
  const dotsDcEat = (state) => {
    const gifts = api.dotsGifts(state);
    if (!gifts.length) return null;
    const run = api.dotsGiftRun(state);
    if (run > 2 || api.dotsUnclaimed(state) <= run || !dotsFirstSafe(state)) {
      return gifts[0];
    }
    return null;
  };
  const dotsDcPlayout = (state, first) => {
    const board = {
      boxes: state.boxes,
      h: state.h.slice(),
      v: state.v.slice(),
      owner: state.owner.slice(),
    };
    let turn = 1;
    if (!api.dotsApply(board, first, 1).length) turn = 2;
    let guard = 0;
    while (api.dotsLegal(board).length && guard < 400) {
      guard += 1;
      const move = dotsDcEat(board) || dotsFirstSafe(board) ||
        dotsShortestOpen(board);
      if (!move) break;
      if (!api.dotsApply(board, move, turn).length) {
        turn = turn === 1 ? 2 : 1;
      }
    }
    return api.dotsCount(board, 1) - api.dotsCount(board, 2);
  };
  const dotsCareful = (state) => {
    const gifts = api.dotsGifts(state);
    if (gifts.length) {
      const run = api.dotsGiftRun(state);
      if (run > 2 || api.dotsUnclaimed(state) <= run || !dotsFirstSafe(state)) {
        return gifts[0];
      }
    }
    return dotsFirstSafe(state) || dotsShortestOpen(state);
  };
  const dotsSharp = (state) => {
    const eat = dotsDcEat(state);
    if (eat) return eat;
    const safe = api.dotsLegal(state).filter((m) => api.dotsSafe(state, m));
    if (safe.length) {
      let best = null;
      let bestScore = null;
      for (const move of safe) {
        const score = dotsDcPlayout(state, move);
        if (bestScore === null || score > bestScore) {
          bestScore = score;
          best = move;
        }
      }
      return best;
    }
    return dotsShortestOpen(state);
  };
  const dotsPlain = (state) => {
    const gifts = api.dotsGifts(state);
    if (gifts.length) return gifts[0];
    return dotsFirstSafe(state) || dotsShortestOpen(state);
  };
  /* One full deal: the rank's own rival against one scripted hand, under a
   * seeded stream. Records the final margin, whether the rival laid the
   * opening stick, and every rival decline with the cascade size it left
   * standing - the hold signature the structural checks read. */
  const dotsPlay = (rank, policy, seed) => {
    const realRandom = Math.random;
    Math.random = (() => {
      let s = seed >>> 0;
      return () => {
        s = (Math.imul(s, 1103515245) + 12345) >>> 0;
        return s / 4294967296;
      };
    })();
    try {
      const state = {
        boxes: rank.boxes,
        h: new Array(rank.boxes * (rank.boxes + 1)).fill(0),
        v: new Array(rank.boxes * (rank.boxes + 1)).fill(0),
        owner: new Array(rank.boxes * rank.boxes).fill(0),
      };
      let turn = rank.foeFirst ? 2 : 1;
      let firstByRival = false;
      let guard = 0;
      const declines = [];
      while (api.dotsLegal(state).length && guard < 400) {
        guard += 1;
        let move;
        if (turn === 2) {
          const run = api.dotsGiftRun(state);
          move = api.dotsAiMove(state, 2, rank);
          if (!move) break;
          const pre = {
            boxes: rank.boxes,
            h: state.h.slice(),
            v: state.v.slice(),
            owner: state.owner.slice(),
          };
          const closed = api.dotsApply(state, move, 2);
          if (!closed.length && run > 0 && api.dotsSafe(pre, move)) {
            declines.push(run);
          }
          if (!closed.length) turn = 1;
          firstByRival = true;
        } else {
          move = policy(state);
          if (!move) break;
          if (!api.dotsApply(state, move, 1).length) {
            turn = 2;
          }
        }
      }
      return {
        margin: api.dotsCount(state, 1) - api.dotsCount(state, 2),
        firstByRival,
        declines,
      };
    } finally {
      Math.random = realRandom;
    }
  };
  const seeds = [];
  for (let i = 0; i < 15; i += 1) seeds.push(91000 + i * 733);
  /* Each (hand, seed) pair plays once; the strong line is the better of the
   * two competent hands per seed, exactly the shipped bench's own reading. */
  const bench = (rank, seedCount) => {
    const best = [];
    const naive = [];
    let firstByRival = true;
    const declines = [];
    for (let i = 0; i < seedCount; i += 1) {
      const careful = dotsPlay(rank, dotsCareful, seeds[i]);
      const sharp = dotsPlay(rank, dotsSharp, seeds[i]);
      const plain = dotsPlay(rank, dotsPlain, seeds[i]);
      best.push(Math.max(careful.margin, sharp.margin));
      naive.push(plain.margin);
      declines.push(...careful.declines, ...sharp.declines, ...plain.declines);
      if (!careful.firstByRival || !sharp.firstByRival || !plain.firstByRival) {
        firstByRival = false;
      }
    }
    return { best, naive, firstByRival, declines };
  };
  const rivalShare = (rank, margin) =>
    (rank.boxes * rank.boxes - margin) / (2 * rank.boxes * rank.boxes);

  /* Every deep rung benched once: the deterministic pair on the shipped
   * two-seed bar, the shaky pair on the shipped fifteen-seed bar. */
  const deepRun = {
    d21: bench(byId.d21, 2),
    d22: bench(byId.d22, 2),
    d23: bench(byId.d23, 15),
    d24: bench(byId.d24, 15),
  };

  /* Calibration: the shipped peak and the shipped shaky rung replay through
   * this gate's bench the way the shipped bench reads them, so the deep tier
   * is measured against the shipped bar, not a new one. */
  const d20 = bench(byId.d20, 2);
  check("game-glyph-dots",
    "the shipped peak replays at its own line under the gate bench",
    d20.best.every((m) => m >= byId.d20.margin[0]) &&
      d20.best[0] === d20.best[d20.best.length - 1] &&
      d20.naive.every((m) => m < byId.d20.margin[0]),
    `d20 strong ${d20.best.join(",")}, naive max ${Math.max.apply(null, d20.naive)}`);
  const d17 = bench(byId.d17, 15);
  const d17wins = d17.best.filter((m) => m > 0).length;
  const d17two = d17.best.filter((m) => m >= byId.d17.margin[1]).length;
  const d17three = d17.best.filter((m) => m >= byId.d17.margin[0]).length;
  check("game-glyph-dots",
    "d17 calibrates the shaky bar: nine wins, eight two-star lines, three stars rare but real",
    d17wins >= 9 && d17two >= 8 && d17three >= 2 && d17three <= 9 &&
      d17.naive.every((m) => m < byId.d17.margin[0]),
    `wins ${d17wins}/15, two ${d17two}/15, three ${d17three}/15,` +
      ` naive max ${Math.max.apply(null, d17.naive)}`);

  /* Every deep rung meets the shipped bar for its own kind of rival: the
   * deterministic pair must fall to the strong hands every seeded run with
   * three stars earned, the floor band under every win, the deal replaying
   * identically across seeds; the shaky pair must clear the fifteen-seed
   * distribution bar; all four bands run downwards and the greedy hand
   * never three-stars. */
  const barProblems = [];
  deepIds.forEach((id) => {
    const rank = byId[id];
    const shaky = rank.blunder > 0;
    const run = deepRun[id];
    const wins = run.best.filter((m) => m > 0).length;
    const three = run.best.filter((m) => m >= rank.margin[0]).length;
    const two = run.best.filter((m) => m >= rank.margin[1]).length;
    const name = `${id} boxes=${rank.boxes} hold=${rank.hold}` +
      ` foeFirst=${!!rank.foeFirst} blunder=${rank.blunder}` +
      ` bands=${rank.margin.join("/")}`;
    if (!(rank.margin[0] >= rank.margin[1] && rank.margin[1] >= rank.margin[2])) {
      barProblems.push(`${name} bands do not run downwards`);
    }
    if (!run.naive.every((m) => m < rank.margin[0])) {
      barProblems.push(`${name} the greedy hand three-stars` +
        ` (naive max ${Math.max.apply(null, run.naive)})`);
    }
    if (shaky) {
      if (wins < 9 || two < 8 || three < 2 || three > 9) {
        barProblems.push(`${name} wins ${wins}/15, two ${two}/15,` +
          ` three ${three}/15 against the shaky bar`);
      }
    } else {
      if (wins !== run.best.length) {
        barProblems.push(`${name} the strong hands drop a seeded run` +
          ` (${run.best.join(",")})`);
      }
      if (run.best[0] < rank.margin[0]) {
        barProblems.push(`${name} three stars are not earned` +
          ` (${run.best[0]} vs ${rank.margin[0]})`);
      }
      const worstWin = Math.min.apply(null, run.best.filter((m) => m > 0));
      if (worstWin < rank.margin[2]) {
        barProblems.push(`${name} a win misses the one-star floor`);
      }
      if (run.best[0] !== run.best[run.best.length - 1]) {
        barProblems.push(`${name} the deterministic deal drifts across seeds`);
      }
    }
    if (!run.firstByRival) {
      barProblems.push(`${name} the rival did not lay the opening stick`);
    }
  });
  check("game-glyph-dots",
    "every deep rung clears the shipped bar for its own kind of rival",
    barProblems.length === 0, barProblems.join(" | "));

  /* Difficulty, re-proved in the engine's own currency. The deterministic
   * deep rungs leave the strong hand strictly less than the shipped peak's
   * own line wins on d20, and hold strictly more of the plate; the shaky
   * deep rungs raise the three-star ask past the shipped peak's band while
   * the unshaken sheet lands under it, so the band is reachable only
   * because the shake is there. */
  const d20Share = rivalShare(byId.d20, d20.best[0]);
  const hardProblems = [];
  ["d21", "d22"].forEach((id) => {
    const run = deepRun[id];
    if (!(run.best[0] < d20.best[0])) {
      hardProblems.push(`${id} margin ${run.best[0]} not under d20's ${d20.best[0]}`);
    }
    const share = rivalShare(byId[id], run.best[0]);
    if (!(share > d20Share)) {
      hardProblems.push(`${id} rival share ${share.toFixed(3)} not over d20's ` +
        d20Share.toFixed(3));
    }
  });
  ["d23", "d24"].forEach((id) => {
    const rank = byId[id];
    const unshaken = Object.assign({}, rank, { blunder: 0 });
    const line = bench(unshaken, 1).best[0];
    const three = deepRun[id].best.filter((m) => m >= rank.margin[0]).length;
    if (!(rank.margin[0] > byId.d20.margin[0])) {
      hardProblems.push(`${id} band ${rank.margin[0]} not over d20's ` +
        byId.d20.margin[0]);
    }
    if (!(line < rank.margin[0])) {
      hardProblems.push(`${id} the unshaken sheet reaches the band (${line})`);
    }
    if (!(three >= 2 && three <= 9)) {
      hardProblems.push(`${id} three stars ${three}/15 not rare but real`);
    }
  });
  check("game-glyph-dots",
    "every deep rung is measurably harder than the shipped peak in the engine's own currency",
    hardProblems.length === 0, hardProblems.join(" | "));

  /* The lesson binds structurally: the two deep pairings appear nowhere in
   * the shipped ladder and every deep rung carries one; and d22's deals
   * contain the hold-three decline - a rival that lays a safe stick while
   * three boxes of a cascade stand - which no blunder-free shipped rival can
   * produce, since a blunder-free rival only declines a cascade that measures
   * its own tail. Blunder rows are left out of the replay scan because their
   * noise can decline by accident; the field scan covers them instead. */
  const flippedSmall = levels.filter((level) =>
    level.boxes === 6 && level.foeFirst);
  const shakyFlipped = levels.filter((level) =>
    level.blunder > 0 && level.foeFirst);
  const tierIds = deepIds.concat(summitIds);
  check("game-glyph-dots",
    "no rung outside the deep and summit tiers pairs the six-box plate or a blunder with the opening stick; the deep pairings and the summit's shaken trio all ship",
    flippedSmall.every((level) => deepIds.includes(level.id)) &&
      shakyFlipped.every((level) => tierIds.includes(level.id)) &&
      deepIds.filter((id) => byId[id].boxes === 6 && byId[id].foeFirst).length === 3 &&
      deepIds.filter((id) => byId[id].blunder > 0 && byId[id].foeFirst).length === 2 &&
      summitIds.filter((id) => byId[id].blunder > 0 && byId[id].foeFirst).length === 3,
    `six-box flipped: ${flippedSmall.map((l) => l.id).join(",") || "none"}; ` +
      `shaky flipped: ${shakyFlipped.map((l) => l.id).join(",") || "none"}`);
  const scanned = levels.filter((level) =>
    level.blunder === 0 && !tierIds.includes(level.id));
  const scanProblems = [];
  scanned.forEach((rank) => {
    /* one canonical line per deterministic row: its whole decline record */
    const run = dotsPlay(rank, dotsCareful, seeds[0]);
    if (run.declines.some((size) => size === 3)) {
      scanProblems.push(rank.id + " declines a three-box cascade");
    }
  });
  if (!deepRun.d22.declines.some((size) => size === 3)) {
    scanProblems.push("d22 never declines a three-box cascade");
  }
  check("game-glyph-dots",
    "the hold-three decline is d22's alone: present in its deals, absent from every blunder-free rival outside the summit",
    scanProblems.length === 0, scanProblems.join(" | "));

  /* Load-bearing: cut the pairing habit out of a deep rung and the rung
   * breaks or eases. Unflip d21 and the strong hand wins by ten; cut d21's
   * tail and the plate can no longer be won at all; unflip d22 and the rival
   * wins outright; unshake d23 or d24 and the three-star band falls out of
   * reach, because the unshaken sheet lands under it. */
  const twinProblems = [];
  const d21unflippedRun = bench(
    Object.assign({}, byId.d21, { foeFirst: false }), 1);
  if (!(d21unflippedRun.best[0] > deepRun.d21.best[0])) {
    twinProblems.push("d21 without the flip is not easier");
  }
  const d21untailedRun = bench(
    Object.assign({}, byId.d21, { hold: 0 }), 1);
  if (d21untailedRun.best[0] > 0) {
    twinProblems.push("d21 without the tail is still won outright");
  }
  const d22unflippedRun = bench(
    Object.assign({}, byId.d22, { foeFirst: false }), 1);
  if (d22unflippedRun.best[0] >= 0) {
    twinProblems.push("d22 without the flip does not hand the rival the plate");
  }
  ["d23", "d24"].forEach((id) => {
    const unshaken = Object.assign({}, byId[id], { blunder: 0 });
    if (!(bench(unshaken, 1).best[0] < byId[id].margin[0])) {
      twinProblems.push(`${id} without the shake still reaches its band`);
    }
  });
  check("game-glyph-dots",
    "cutting the deep pairing habit out of any deep rung breaks or eases it",
    twinProblems.length === 0, twinProblems.join(" | "));

  /* Projection: the shipped peak's sheet, seated on the deep six-box plate,
   * concedes more boxes than either deep sheet does on the same plate - an
   * earlier rung's habits do not carry the deep plate. */
  const d20SheetRun = bench(
    Object.assign({}, byId.d20, { boxes: 6 }), 1);
  check("game-glyph-dots",
    "the shipped peak's sheet projected onto the deep plate concedes more than either deep sheet",
    d20SheetRun.best[0] > deepRun.d21.best[0] &&
      d20SheetRun.best[0] > deepRun.d22.best[0],
    `d20 sheet on six: ${d20SheetRun.best[0]} vs d21 ${deepRun.d21.best[0]}` +
      ` and d22 ${deepRun.d22.best[0]}`);

  /* Minimality, bounded: on the flipped six-box plate the tail sweep holds
   * one through five, and hold one - d21's tail - is the narrowest margin
   * and the largest rival share of the five; hold three - d22's tail - beats
   * every other tail except hold one on both currencies; and the wide
   * plate's own tail of two measures easiest of all five, which is why the
   * deep rungs re-tune it. */
  const sweepProblems = [];
  const sweep = [1, 2, 3, 4, 5].map((hold) => {
    const row = Object.assign({}, byId.d21, { hold });
    const run = bench(row, 1);
    return { hold, margin: run.best[0], share: rivalShare(row, run.best[0]) };
  });
  const hold1 = sweep.find((row) => row.hold === 1);
  const hold2 = sweep.find((row) => row.hold === 2);
  const hold3 = sweep.find((row) => row.hold === 3);
  const narrowest = Math.min.apply(null, sweep.map((row) => row.margin));
  const widest = Math.max.apply(null, sweep.map((row) => row.share));
  if (hold1.margin !== narrowest || hold1.share !== widest) {
    sweepProblems.push(`hold one is not the strongest tail` +
      ` (min margin ${narrowest}, max share ${widest.toFixed(3)})`);
  }
  [2, 4, 5].forEach((hold) => {
    const row = sweep.find((r) => r.hold === hold);
    if (!(hold3.margin < row.margin && hold3.share > row.share)) {
      sweepProblems.push(`hold three does not beat hold ${hold}` +
        ` (${hold3.margin}/${hold3.share.toFixed(3)} vs` +
        ` ${row.margin}/${row.share.toFixed(3)})`);
    }
  });
  if (!(hold2.margin > hold1.margin && hold2.margin > hold3.margin)) {
    sweepProblems.push("the wide plate's tail of two is not the easiest of the five");
  }
  check("game-glyph-dots",
    "the tail sweep lands the deep tails on top: hold one strongest, hold three next, the wide plate's tail of two easiest",
    sweepProblems.length === 0,
    sweep.map((row) => `h${row.hold}:${row.margin}/${row.share.toFixed(3)}`).join(" "));

  /* ---- the summit d25-d30: the widest plate and the heaviest shake ---- */

  /* Every summit rung benched once: the wide half is blunder-free and
   * rides the deterministic two-seed bar, the shaken half rides the
   * shipped fifteen-seed bar - same hands, same seed ring as the deep
   * tier, every deal driven through the lifted engine. */
  const summitRun = {
    d25: bench(byId.d25, 2),
    d26: bench(byId.d26, 2),
    d27: bench(byId.d27, 2),
    d28: bench(byId.d28, 15),
    d29: bench(byId.d29, 15),
    d30: bench(byId.d30, 15),
  };

  const summitBarProblems = [];
  summitIds.forEach((id) => {
    const rank = byId[id];
    const shaky = rank.blunder > 0;
    const run = summitRun[id];
    const wins = run.best.filter((m) => m > 0).length;
    const three = run.best.filter((m) => m >= rank.margin[0]).length;
    const two = run.best.filter((m) => m >= rank.margin[1]).length;
    const name = `${id} boxes=${rank.boxes} hold=${rank.hold}` +
      ` foeFirst=${!!rank.foeFirst} blunder=${rank.blunder}` +
      ` bands=${rank.margin.join("/")}`;
    if (!(rank.margin[0] >= rank.margin[1] && rank.margin[1] >= rank.margin[2])) {
      summitBarProblems.push(`${name} bands do not run downwards`);
    }
    if (!run.naive.every((m) => m < rank.margin[0])) {
      summitBarProblems.push(`${name} the greedy hand three-stars` +
        ` (naive max ${Math.max.apply(null, run.naive)})`);
    }
    if (shaky) {
      if (wins < 9 || two < 8 || three < 2 || three > 9) {
        summitBarProblems.push(`${name} wins ${wins}/15, two ${two}/15,` +
          ` three ${three}/15 against the shaky bar`);
      }
    } else {
      if (wins !== run.best.length) {
        summitBarProblems.push(`${name} the strong hands drop a seeded run` +
          ` (${run.best.join(",")})`);
      }
      if (run.best[0] < rank.margin[0]) {
        summitBarProblems.push(`${name} three stars are not earned` +
          ` (${run.best[0]} vs ${rank.margin[0]})`);
      }
      const worstWin = Math.min.apply(null, run.best.filter((m) => m > 0));
      if (worstWin < rank.margin[2]) {
        summitBarProblems.push(`${name} a win misses the one-star floor`);
      }
      if (run.best[0] !== run.best[run.best.length - 1]) {
        summitBarProblems.push(`${name} the deterministic deal drifts across seeds`);
      }
    }
    if (!run.firstByRival) {
      summitBarProblems.push(`${name} the rival did not lay the opening stick`);
    }
  });
  check("game-glyph-dots",
    "every summit rung clears the shipped bar for its own kind of rival",
    summitBarProblems.length === 0, summitBarProblems.join(" | "));

  /* The wide half climbs in the engine's own currency: the strong hand's
   * win narrows at every rung and its share of the plate widens with it,
   * and the two-box win at d27 is the narrowest in the campaign - a larger
   * share than the deep tier's own narrowest (d21) on its smaller plate. */
  const wideIds = ["d25", "d26", "d27"];
  const shakyIds = ["d28", "d29", "d30"];
  const wideMargins = wideIds.map((id) => summitRun[id].best[0]);
  const wideShares = wideIds.map((id) =>
    rivalShare(byId[id], summitRun[id].best[0]));
  const narrows = (list) => list.every((v, i) => i === 0 || v < list[i - 1]);
  const climbs = (list) => list.every((v, i) => i === 0 || v > list[i - 1]);
  check("game-glyph-dots",
    "the wide rungs narrow the strong hand's win at every step and widen its rival share with it, past the deep tier's narrowest",
    narrows(wideMargins) && climbs(wideShares) &&
      wideShares[2] > rivalShare(byId.d21, deepRun.d21.best[0]),
    `${wideMargins.join(" -> ")} / ` +
      wideShares.map((s) => s.toFixed(3)).join(" -> "));

  /* The shaken half climbs the three-star ask past the shipped shaky peak:
   * each band opens above d24's fifteen and the bands climb through the
   * three, d30 ends the ladder at the campaign's highest ask and heaviest
   * flipped shake, and the wide half pours the widest plate the campaign
   * has held with d25's tail of five - and its five-box decline - shipping
   * nowhere else. No wide summit deal declines a three-box cascade - the
   * shaken rows blunder into accidental declines of every size - so d22's
   * signature stays unique. */
  const shakyBands = shakyIds.map((id) => byId[id].margin[0]);
  check("game-glyph-dots",
    "the shaken rungs raise the three-star ask past the deep tier and climb through the three",
    climbs(shakyBands) && shakyBands[0] > byId.d24.margin[0] &&
      byId.d30.margin[0] ===
        Math.max.apply(null, levels.map((l) => l.margin[0])),
    `${shakyBands.join(" -> ")} vs d24 ${byId.d24.margin[0]}`);
  check("game-glyph-dots",
    "d30 ends the ladder as the heaviest shake any flipped rank carries, and the wide half pours the first eight-box plates",
    byId.d30.blunder === Math.max.apply(null,
        levels.filter((l) => l.foeFirst).map((l) => l.blunder || 0)) &&
      levels.slice(0, 24).every((l) => l.boxes < byId.d25.boxes) &&
      wideIds.every((id) => byId[id].boxes === 8) &&
      levels.filter((l) => (l.hold || 0) === 5).length === 1 &&
      summitRun.d25.declines.some((size) => size === 5) &&
      wideIds.every((id) =>
        !summitRun[id].declines.some((size) => size === 3)),
    `d30 shakes at ${byId.d30.blunder}; eight boxes first at d25`);

  /* Load-bearing, cut both ways the plate allows: remove the tail from the
   * five or the one and the strong line drops under its band (the untailed
   * great plate lands twelve); relax the two to three and the plate is
   * lost outright; unshake any shaken rung and the strong line lands nine,
   * under every band - the shake is what the bands are made of. */
  const cutProblems = [];
  const untailed = bench(Object.assign({}, byId.d25, { hold: 0 }), 1);
  ["d25", "d26"].forEach((id) => {
    if (!(untailed.best[0] < byId[id].margin[0])) {
      cutProblems.push(`${id} without the tail still reaches its band`);
    }
  });
  const widened = bench(Object.assign({}, byId.d27, { hold: 3 }), 1);
  if (!(widened.best[0] < 0)) {
    cutProblems.push("d27 with the tail widened is still won outright");
  }
  shakyIds.forEach((id) => {
    const unshaken = Object.assign({}, byId[id], { blunder: 0 });
    if (!(bench(unshaken, 1).best[0] < byId[id].margin[0])) {
      cutProblems.push(`${id} without the shake still reaches its band`);
    }
  });
  check("game-glyph-dots",
    "cutting or relaxing the summit's dial breaks or eases every rung it is cut from",
    cutProblems.length === 0, cutProblems.join(" | "));

  /* Minimality, bounded: on the flipped eight-box plate the tail sweep
   * holds zero through five, lands its narrowest win exactly on d27's tail
   * of two and loses the plate outright at the tail of three - the two
   * tails the sweep rules out are the two the ladder does not ship. The
   * sweep reuses the benches above: hold zero is the untailed plate, hold
   * one, two and five are d26, d27 and d25, hold three is the widening. */
  const hold4 = bench(Object.assign({}, byId.d27, { hold: 4 }), 1);
  const wideSweep = [
    untailed.best[0], summitRun.d26.best[0], summitRun.d27.best[0],
    widened.best[0], hold4.best[0], summitRun.d25.best[0],
  ];
  const wideWins = wideSweep.filter((m) => m > 0);
  const narrowestWide = Math.min.apply(null, wideWins);
  check("game-glyph-dots",
    "the great plate's tail sweep lands its narrowest win on the shipped tail of two and loses outright at three",
    wideSweep[2] === narrowestWide && wideSweep[3] < 0 &&
      wideSweep[0] !== narrowestWide && wideSweep[1] !== narrowestWide &&
      wideSweep[4] !== narrowestWide && wideSweep[5] !== narrowestWide,
    `holds zero through five: ${wideSweep.join(", ")}`);

  /* The tier's names travel with the page: both languages hold a real string
   * and t() never falls back to the raw key - read from the booted module's
   * own strings, which addStrings fills at boot. */
  const copyProblems = tierIds.map((id) => byId[id].labelKey).filter((key) =>
    !(App.I18N && App.I18N.en && App.I18N.en[key]) ||
    !(App.I18N && App.I18N.zh && App.I18N.zh[key]) ||
    !App.t(key) || App.t(key) === key);
  check("game-glyph-dots", "the ten deep and summit rung names resolve in both languages",
    copyProblems.length === 0, copyProblems.join(","));

  /* The unlock chain is derived, never stored: clearing each rung in order
   * hands the player exactly the next one, all thirty times, under the
   * campaign key the game itself ships. */
  const chain = App.createCampaign({
    key: "dots-campaign",
    levels: levels.map((level) => ({ id: level.id, labelKey: level.labelKey })),
  });
  let walked = 0;
  let chained = true;
  levels.forEach((level, index) => {
    const outcome = chain.record(level.id, {
      stars: 3,
      best: 1,
      better: "high",
    });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < levels.length ? levels[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-glyph-dots", "the unlock chain walks all thirty rungs in order",
    walked === 30 && chained && chain.clearedCount() === 30,
    walked + " first clears");
};
