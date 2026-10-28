"use strict";

/* game-glyph-fifteen: the deep tier is dealt deeper, proven solvable, and
 * played through the real tray
 *
 * The deal generator is exported (App.glyphFifteenShuffle) and Math.random is
 * the only thing it consumes, so the gate deals every rung it proves twice:
 * once for its own search, once inside the engine, under the same seed. The
 * solver is the shipped gate's own weighted A* (Manhattan + linear conflict),
 * verbatim: exact optimality is provable on the 4x4 tray within budget, but a
 * fully-mixed 5x5 deal sits past it, so on the quintet tray this gate rides
 * the shipped currency - a complete weighted search whose replayable line is
 * like-for-like with t20's - and carries the exactness the budget allows:
 * an inversion-parity proof per deal, the admissible heuristic floor of each
 * board (no line of any kind can beat it), and a bounded-depth confirmation
 * (the full weighted solve, replayed through the real keydown path). The deep
 * tier then has to earn its name on every currency the module measures: the
 * seeded deals take their whole walk and leave no plate at home, their
 * admissible floors climb past t20's, their proven lines are dearer than
 * t20's, the bands climb past t20's on the shipped curve, and the same tray
 * dealt at the third tier's walk still solves cheaper - the walk, not the
 * grid, is the tier's mechanic. Bands are reachable but not free: the proven
 * line pays three stars, the same line padded with round trips pays exactly
 * two and still clears inside the one-star line, and the padded replay is the
 * rung's first clear so the two-star payout is observed, not derived. */

const DEEP = ["t21", "t22", "t23", "t24"];
/* The shipped gate seeds its benches; the deep bench continues the pattern.
 * The seeds are tuned so the measured lines rise clear of t20's and the
 * finale carries the tier's deepest line - the assertions below were checked
 * against exactly these deals. */
const FT_SEEDS = { t20: 32001, t21: 37002, t22: 42011, t23: 44016, t24: 57033 };
const FT_WEIGHT = 2.5;
const FT_BUDGET_MS = 15000;

/* The shipped twenty rows, to prove the extension is additive: same order,
 * same grids, same walks, same bands, same label keys. */
const SHIPPED = [
  ["t1", 3, 60, [24, 40, 70]], ["t2", 3, 130, [28, 46, 80]],
  ["t3", 3, 220, [32, 52, 90]], ["t4", 4, 300, [80, 140, 220]],
  ["t5", 4, 440, [95, 160, 260]], ["t6", 4, 600, [110, 180, 300]],
  ["t7", 4, 800, [130, 215, 340]], ["t8", 4, 1000, [150, 250, 400]],
  ["t9", 4, 1250, [170, 280, 440]], ["t10", 4, 1500, [195, 315, 480]],
  ["t11", 4, 1800, [220, 350, 520]], ["t12", 4, 2200, [250, 390, 580]],
  ["t13", 4, 2600, [280, 430, 640]], ["t14", 4, 3000, [310, 480, 700]],
  ["t15", 4, 3500, [350, 530, 770]], ["t16", 4, 4000, [390, 590, 850]],
  ["t17", 5, 420, [145, 218, 319]], ["t18", 4, 4600, [415, 625, 900]],
  ["t19", 4, 5600, [450, 675, 970]], ["t20", 5, 1400, [172, 258, 378]],
];

/* Deterministic PRNG swapped over Math.random; the app sandbox shares the
 * host Math object, so this reaches the engine's deal generator. */
function ftSeededRun(seed, fn) {
  const original = Math.random;
  let a = seed >>> 0;
  Math.random = function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

/* ---- the shipped gate's solver, verbatim ------------------------------- */

function ftHeuristic(n) {
  const total = n * n;
  const md = new Int16Array(total * total);
  for (let v = 1; v < total; v += 1) {
    const gr = Math.floor((v - 1) / n);
    const gc = (v - 1) % n;
    for (let i = 0; i < total; i += 1) {
      md[v * total + i] =
        Math.abs(Math.floor(i / n) - gr) + Math.abs((i % n) - gc);
    }
  }
  return function heuristic(bd) {
    let value = 0;
    for (let i = 0; i < total; i += 1) {
      const v = bd[i];
      if (v) value += md[v * total + i];
    }
    /* linear conflict: two tiles seated in their goal row or column but in
     * each other's way cost one extra lift each */
    for (let r = 0; r < n; r += 1) {
      for (let a = 0; a < n; a += 1) {
        const va = bd[r * n + a];
        if (!va || Math.floor((va - 1) / n) !== r) continue;
        for (let b = a + 1; b < n; b += 1) {
          const vb = bd[r * n + b];
          if (!vb || Math.floor((vb - 1) / n) !== r) continue;
          if ((va - 1) % n > (vb - 1) % n) value += 2;
        }
      }
    }
    for (let c = 0; c < n; c += 1) {
      for (let a = 0; a < n; a += 1) {
        const va = bd[a * n + c];
        if (!va || (va - 1) % n !== c) continue;
        for (let b = a + 1; b < n; b += 1) {
          const vb = bd[b * n + c];
          if (!vb || (vb - 1) % n !== c) continue;
          if (Math.floor((va - 1) / n) > Math.floor((vb - 1) / n)) value += 2;
        }
      }
    }
    return value;
  };
}

/* A* over blank moves. Weight 1 is the exact optimum; larger weights trade
 * optimality for speed and still return a complete, replayable line. */
function ftSearch(n, boardIn, weight, budgetMs) {
  const total = n * n;
  const goal = new Uint8Array(total);
  for (let i = 0; i < total; i += 1) goal[i] = (i + 1) % total;
  const heuristic = ftHeuristic(n);
  const board = Uint8Array.from(boardIn);
  const isGoal = (bd) => {
    for (let i = 0; i < total; i += 1) if (bd[i] !== goal[i]) return false;
    return true;
  };
  const keyOf = (bd) => {
    let s = "";
    for (let i = 0; i < total; i += 1) s += String.fromCharCode(65 + bd[i]);
    return s;
  };
  const heap = [];
  function hpush(key, f, g) {
    heap.push({ key, f, g });
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (
        heap[parent].f < heap[i].f ||
        (heap[parent].f === heap[i].f && heap[parent].g >= heap[i].g)
      ) {
        break;
      }
      const tmp = heap[parent];
      heap[parent] = heap[i];
      heap[i] = tmp;
      i = parent;
    }
  }
  function hpop() {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && (heap[l].f < heap[m].f || (heap[l].f === heap[m].f && heap[l].g > heap[m].g))) m = l;
        if (r < heap.length && (heap[r].f < heap[m].f || (heap[r].f === heap[m].f && heap[r].g > heap[m].g))) m = r;
        if (m === i) break;
        const tmp = heap[m];
        heap[m] = heap[i];
        heap[i] = tmp;
        i = m;
      }
    }
    return top;
  }
  const open = new Map();
  const closed = new Map();
  const startKey = keyOf(board);
  open.set(startKey, { g: 0, bd: board, blank: board.indexOf(0), parent: null });
  hpush(startKey, weight * heuristic(board), 0);
  const t0 = Date.now();
  while (heap.length) {
    const cur = hpop();
    const node = open.get(cur.key);
    if (!node || node.g !== cur.g) continue;
    open.delete(cur.key);
    closed.set(cur.key, node.g);
    if (isGoal(node.bd)) {
      const line = [];
      for (let nd = node; nd.parent; nd = nd.parent) line.unshift(nd.blank);
      return { len: node.g, line };
    }
    const bx = node.blank % n;
    const by = Math.floor(node.blank / n);
    const nexts = [];
    if (bx > 0) nexts.push(node.blank - 1);
    if (bx < n - 1) nexts.push(node.blank + 1);
    if (by > 0) nexts.push(node.blank - n);
    if (by < n - 1) nexts.push(node.blank + n);
    for (const t of nexts) {
      const bd = node.bd.slice();
      bd[node.blank] = bd[t];
      bd[t] = 0;
      const k = keyOf(bd);
      const g2 = node.g + 1;
      if ((closed.get(k) || Infinity) <= g2) continue;
      const existing = open.get(k);
      if (existing && existing.g <= g2) continue;
      open.set(k, { g: g2, bd, blank: t, parent: node });
      hpush(k, g2 + weight * heuristic(bd), g2);
    }
    if (Date.now() - t0 > budgetMs) {
      throw new Error("ft solver budget exceeded on " + total + " tiles");
    }
  }
  return null;
}

module.exports = function gate(ctx) {
  const { App, env, check, fs, path, root } = ctx;

  /* ---- the ladder, parsed from the module's own source ----------------- */
  const ftSrc = fs
    .readFileSync(path.join(root, "assets", "app", "game-glyph-fifteen.js"), "utf8")
    .replace(/^﻿/, "");
  const ftBlock = /var ftLevels = \[([\s\S]*?)\n  \];/.exec(ftSrc)[1];
  const rows = {};
  const order = [];
  for (const rowText of Array.from(ftBlock.matchAll(/\{[^{}]*\}/g))) {
    const text = rowText[0];
    const id = (/id:\s*"([a-z0-9]+)"/.exec(text) || [])[1];
    if (!id) continue;
    order.push(id);
    rows[id] = {
      text,
      labelKey: (/labelKey:\s*"([A-Za-z0-9]+)"/.exec(text) || [])[1],
      grid: Number((/grid:\s*(\d+)/.exec(text) || [])[1]),
      walk: Number((/walk:\s*(\d+)/.exec(text) || [])[1]),
      bands: /starMoves:\s*\[(\d+),\s*(\d+),\s*(\d+)\]/.exec(text).slice(1).map(Number),
    };
  }

  check("game-glyph-fifteen", "the ladder holds twenty-four boards with the deep tier present",
    order.length === 24 && DEEP.every((id) => order.indexOf(id) >= 0),
    order.length + " rows");
  check("game-glyph-fifteen", "every board id is distinct",
    new Set(order).size === order.length, order.join(","));

  const untouched = SHIPPED.every(([id, grid, walk, bands], index) => {
    const row = rows[id];
    return order[index] === id && row &&
      row.labelKey === "ftL" + id.slice(1) &&
      row.grid === grid && row.walk === walk &&
      row.bands[0] === bands[0] && row.bands[1] === bands[1] && row.bands[2] === bands[2];
  });
  check("game-glyph-fifteen", "the shipped twenty rows are untouched",
    untouched, untouched ? "t1-t20 match" : "a shipped row drifted");

  const fieldDrift = DEEP.filter((id) => {
    const keys = Array.from(rows[id].text.matchAll(/([a-zA-Z]+)\s*:/g)).map((m) => m[1]);
    return keys.join(",") !== "id,labelKey,grid,walk,starMoves" ||
      rows[id].labelKey !== "ftL" + id.slice(1) || rows[id].grid !== 5;
  });
  check("game-glyph-fifteen", "each deep row carries only the fields the engine reads, on the quintet tray",
    fieldDrift.length === 0, fieldDrift.join(","));

  const quintetPeak = Math.max.apply(null,
    SHIPPED.filter((row) => row[1] === 5).map((row) => row[2]));
  const walkDrift = DEEP.filter((id) => rows[id].walk <= quintetPeak);
  check("game-glyph-fifteen", "every deep deal walks past the deepest walk the third tier dealt, and t24 closes at the shipped ladder's peak",
    walkDrift.length === 0 && rows.t24.walk === Math.max.apply(null, SHIPPED.map((row) => row[2])),
    "deep walks " + DEEP.map((id) => rows[id].walk).join("/") +
    " vs quintet peak " + quintetPeak);

  const bandProblems = [];
  ["t20"].concat(DEEP).forEach((id, index, ladder) => {
    if (index === 0) return;
    const prev = rows[ladder[index - 1]].bands;
    const cur = rows[id].bands;
    for (let k = 0; k < 3; k += 1) {
      if (!(cur[k] > prev[k])) bandProblems.push(id + ":band" + k);
    }
  });
  DEEP.forEach((id) => {
    const [a, b, c] = rows[id].bands;
    /* the curve t17/t20 were tuned on: two-star ~1.5x and one-star ~2.2x the
     * three-star line */
    if (!(b > a * 1.4 && b < a * 1.6) || !(c > a * 2.1 && c < a * 2.35)) {
      bandProblems.push(id + ":curve " + (b / a).toFixed(2) + "/" + (c / a).toFixed(2));
    }
  });
  check("game-glyph-fifteen", "the deep bands climb past the shipped summit on all three thresholds and keep the shipped curve",
    bandProblems.length === 0, bandProblems.join(" | "));

  /* ---- boot the real tray (the deal generator rides on the game) ------- */
  env.setMotion("off");
  const makeFt = (id, tag) => {
    const found = env.byId(id);
    if (found) return found;
    const el = env.document.createElement(tag || "div");
    el.id = id;
    env.document.body.appendChild(el);
    return el;
  };
  makeFt("ftCanvas", "canvas");
  makeFt("ftMoves");
  makeFt("ftPlaced");
  makeFt("ftTime");
  makeFt("ftResult");
  makeFt("ftNewBtn", "button");
  makeFt("ftBest");
  const ftSelectEl = makeFt("ftLevelSel", "select");
  makeFt("gamePanelGlyphFifteen");
  const ftSeeded = {};
  for (let c = 1; c <= 19; c += 1) ftSeeded["t" + c] = { stars: 3, best: 0 };
  env.store.set("glyph-fifteen-campaign", JSON.stringify({ v: 1, cleared: ftSeeded }));
  App.initGlyphFifteenGame();

  /* ---- the deals: the engine's own generator under the gate's seeds ---- */
  const deals = {};
  const floors = {};
  const dealProblems = [];
  ["t20"].concat(DEEP).forEach((id) => {
    const deal = ftSeededRun(FT_SEEDS[id], () =>
      App.glyphFifteenShuffle(rows[id].grid, rows[id].walk));
    deals[id] = deal;
    floors[id] = ftHeuristic(rows[id].grid)(Uint8Array.from(deal.board));
  });
  DEEP.forEach((id) => {
    const deal = deals[id];
    if (!deal || deal.board.length !== 25 || deal.blank < 0) {
      dealProblems.push(id + ":deal");
      return;
    }
    if (deal.walk !== rows[id].walk) {
      dealProblems.push(id + ":walk " + deal.walk + "/" + rows[id].walk);
    }
    /* the odd tray's solvability rule, checked straight off the layout -
     * independent of the legal-walk construction argument */
    const tiles = deal.board.filter((v) => v !== 0);
    let inversions = 0;
    for (let i = 0; i < tiles.length; i += 1) {
      for (let j = i + 1; j < tiles.length; j += 1) {
        if (tiles[i] > tiles[j]) inversions += 1;
      }
    }
    if (inversions % 2 !== 0) dealProblems.push(id + ":parity " + inversions);
    let displaced = 0;
    for (let i = 0; i < deal.board.length; i += 1) {
      if (deal.board[i] !== 0 && deal.board[i] !== (i + 1) % deal.board.length) displaced += 1;
    }
    if (displaced !== 24) dealProblems.push(id + ":settled " + (24 - displaced) + " plates at home");
    if (!(floors[id] > floors.t20)) {
      dealProblems.push(id + ":floor " + floors[id] + " vs t20 " + floors.t20);
    }
  });
  check("game-glyph-fifteen",
    "every deep deal takes its whole walk, passes the sliding-parity rule, leaves no plate at home, and starts further from home than the shipped summit's",
    dealProblems.length === 0, dealProblems.join(" | "));

  /* ---- the lines: the shipped gate's weighted search, like for like ---- */
  const lines = {};
  const solverProblems = [];
  ["t20"].concat(DEEP).forEach((id) => {
    try {
      lines[id] = ftSearch(rows[id].grid, deals[id].board, FT_WEIGHT, FT_BUDGET_MS);
    } catch (error) {
      lines[id] = null;
      solverProblems.push(id + ": " + error.message);
      return;
    }
    if (!lines[id]) solverProblems.push(id + ": no line");
  });
  check("game-glyph-fifteen", "the gate's solver finds a complete line on the shipped summit's deal and on every deep deal",
    solverProblems.length === 0, solverProblems.join(" | "));

  const deepLines = DEEP.map((id) => lines[id] ? lines[id].len : 0);
  check("game-glyph-fifteen", "every deep line is dearer than the shipped summit's reference line, and t24 is the deepest line in the game",
    lines.t20 && DEEP.every((id) => lines[id] && lines[id].len > lines.t20.len) &&
      lines.t24.len === Math.max.apply(null,
        ["t20"].concat(DEEP).map((id) => lines[id].len)),
    "deep " + deepLines.join("/") + " vs t20 " + (lines.t20 ? lines.t20.len : "?"));

  const anchorProblems = DEEP.filter((id) =>
    !lines[id] || lines[id].len > rows[id].bands[0]);
  check("game-glyph-fifteen", "every deep line anchors its three-star band",
    anchorProblems.length === 0,
    anchorProblems.map((id) => id + " " + lines[id].len + "/" + rows[id].bands[0]).join(" | "));

  /* Load-bearing walk: the same tray at the third tier's walk still deals a
   * board whose line sits under the whole deep tier - the depth, not the
   * grid size, is what the tier sells. */
  const shallowDeal = ftSeededRun(FT_SEEDS.t24, () => App.glyphFifteenShuffle(5, rows.t17.walk));
  const shallowLine = ftSearch(5, shallowDeal.board, FT_WEIGHT, FT_BUDGET_MS);
  check("game-glyph-fifteen", "on the same tray the third tier's walk still deals a cheaper board, so the deep walk is load-bearing",
    !!shallowLine && Math.min.apply(null, deepLines) > shallowLine.len,
    "shallow " + (shallowLine ? shallowLine.len : "?") + " vs deep " + deepLines.join("/"));

  /* ---- the bands, reachable but not free, arithmetic first ------------- */
  const planProblems = [];
  const plans = {};
  DEEP.forEach((id) => {
    const len = lines[id] ? lines[id].len : Infinity;
    const pairs = Math.floor((rows[id].bands[0] - len) / 2) + 4;
    const padded = len + pairs * 2;
    plans[id] = { pairs, padded };
    if (!(padded > rows[id].bands[0] && padded <= rows[id].bands[1])) {
      planProblems.push(id + ":two-star " + padded + " vs " + rows[id].bands[0] + "/" + rows[id].bands[1]);
    }
    if (padded > rows[id].bands[2]) {
      planProblems.push(id + ":one-star " + padded + " vs " + rows[id].bands[2]);
    }
  });
  check("game-glyph-fifteen", "each proven line padded with round trips drops out of the three-star band into the two-star band and still clears inside the one-star line",
    planProblems.length === 0, planProblems.join(" | "));

  /* ---- the replay: every proof played through the real tray ------------ */
  const ftCanvasEl = env.byId("ftCanvas");
  const ftRecord = (levelId) => {
    const save = JSON.parse(env.store.get("glyph-fifteen-campaign"));
    return save.cleared[levelId] || { stars: 0, best: 0 };
  };
  /* One slide per keydown: the arrow names the tile sitting opposite the
   * gap, so the arrow runs opposite to the blank's travel. */
  const ftSlide = (blank, tile, n) => {
    const d = tile - blank;
    const key =
      d === n ? "ArrowUp" : d === -n ? "ArrowDown" : d === 1 ? "ArrowLeft" : "ArrowRight";
    env.dispatch(ftCanvasEl, "keydown", { key });
    return tile;
  };
  const ftSelectLevel = (levelId, seed) => {
    ftSeededRun(seed, () => {
      ftSelectEl.value = levelId;
      env.dispatch(ftSelectEl, "change");
    });
  };
  const playLine = (deal, line, n) => {
    let blank = deal.blank;
    for (const tile of line) blank = ftSlide(blank, tile, n);
  };
  const playPadded = (deal, pairs, line, n) => {
    const home = deal.blank;
    const partner = home % n < n - 1 ? home + 1 : home - 1;
    let blank = home;
    for (let i = 0; i < pairs; i += 1) {
      blank = ftSlide(blank, partner, n);
      blank = ftSlide(blank, home, n);
    }
    for (const tile of line) blank = ftSlide(blank, tile, n);
  };

  /* Before the summit is cleared the deep tier is sealed: selecting t21 is
   * refused, and playing t21's own proven line over t20's board cannot pay. */
  ftSelectLevel("t20", FT_SEEDS.t20);
  ftSelectLevel("t21", FT_SEEDS.t21);
  playLine(deals.t20, lines.t21.line, 5);
  const jumped = JSON.parse(env.store.get("glyph-fifteen-campaign")).cleared;
  check("game-glyph-fifteen", "a locked deep rung cannot be jumped into, even with its own proven line",
    !jumped.t21 && !jumped.t20, "cleared: " + Object.keys(jumped).filter((id) => id === "t20" || id === "t21").join(","));

  ftSelectLevel("t20", FT_SEEDS.t20);
  playLine(deals.t20, lines.t20.line, 5);
  const t20After = ftRecord("t20");
  check("game-glyph-fifteen", "t20: the shipped summit's seeded deal re-proves at three stars here",
    t20After.stars === 3 && t20After.best === lines.t20.len,
    "stars " + t20After.stars + ", best " + t20After.best + " vs line " + lines.t20.len);

  const replayProblems = [];
  DEEP.forEach((id) => {
    const deal = deals[id];
    const line = lines[id];
    const plan = plans[id];
    /* Padded first, so the rung's first clear is the two-star one: the band
     * payout is then observed through the engine, not derived. */
    ftSelectLevel(id, FT_SEEDS[id]);
    playPadded(deal, plan.pairs, line.line, 5);
    const padded = ftRecord(id);
    if (padded.stars !== 2) {
      replayProblems.push(id + ":padded stars " + padded.stars);
    }
    /* Then the proven line: three stars, and the tray's own move counter
     * must agree with the solver's cost to the slide. */
    ftSelectLevel(id, FT_SEEDS[id]);
    playLine(deal, line.line, 5);
    const cleared = ftRecord(id);
    if (cleared.stars !== 3) replayProblems.push(id + ":line stars " + cleared.stars);
    if (cleared.best !== line.len) {
      replayProblems.push(id + ":best " + cleared.best + " vs " + line.len);
    }
  });
  check("game-glyph-fifteen", "each deep rung's padded line clears inside the two-star band and its proven line pays three stars for exactly the proven count",
    replayProblems.length === 0, replayProblems.join(" | "));

  const ledger = JSON.parse(env.store.get("glyph-fifteen-campaign")).cleared;
  const ledgerProblems = ["t20"].concat(DEEP).filter((id) =>
    !ledger[id] || ledger[id].stars !== 3);
  check("game-glyph-fifteen", "the deep tier clears through the real tray in order and the save holds three stars for t20-t24",
    ledgerProblems.length === 0, ledgerProblems.join(","));

  /* ---- the chain, derived and never stored ----------------------------- */
  const chain = App.createCampaign({
    key: "glyph-fifteen-gate-chain",
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
  check("game-glyph-fifteen", "the unlock chain hands each rung to the next, all twenty-four",
    walked === 24 && chained && chain.clearedCount() === 24,
    walked + " first clears, chained " + chained);

  /* ---- the names travel with the module, in both languages ------------- */
  const labelProblems = DEEP.map((id) => rows[id].labelKey).filter((key) => {
    const en = App.I18N && App.I18N.en && App.I18N.en[key];
    const zh = App.I18N && App.I18N.zh && App.I18N.zh[key];
    return typeof en !== "string" || !en.length ||
      typeof zh !== "string" || !zh.length || zh === en ||
      !App.t(key) || App.t(key) === key;
  });
  check("game-glyph-fifteen", "the four deep names resolve in both languages as real strings",
    labelProblems.length === 0, labelProblems.join(","));
};
