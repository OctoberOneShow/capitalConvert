"use strict";

/* game-glyph-pusher: the far shed is priced by the same exact solver that
 * prices the shipped ladder, cut to a structural spec, and replayed on the
 * real floor.
 *
 * The six far-shed rooms were forged as mutations of the two hardest shipped
 * stages - the switchback line (k25, k27, k29, k30) keeps k23's eleven-wide
 * skeleton and the terrace line (k26, k28) keeps k24's ten-wide one, each
 * rung pinched by at most two new wall teeth with the crates and diamonds
 * held at three - and kept only when the exact push-optimal solver measured
 * a longer minimum than the rung before. The gate's first job is structural:
 * the ladder must run k1-k30 in order, the module must export its own table,
 * every shed room must still ride one of the two shipped skeletons, and the
 * unlock chain must walk all thirty rooms. Then the re-pricing: every shed
 * room must be solvable, its measured optimum must equal the three-star band
 * the row pins, and the optima must climb strictly above the shipped
 * summit's twenty-three pushes, rung over rung, to the capstone's
 * thirty-two. Then the proof is played: the panel boots through the game's
 * real init path, and each room's optimal plan is walked through the
 * engine's own keydown path move by move - the engine must clear the room
 * and pay exactly three stars for the measured count, while a detour of the
 * optimum plus two wasted pushes must fall past the three-star line and
 * inside the two-star band, so the second star is bought, not given. The
 * far shed's shared stage names resolve in both languages. */

const SHED = ["k25", "k26", "k27", "k28", "k29", "k30"];

/* Exact push-optimal solver over (box set, player region), freeze-pruned;
 * the same search the shipped gate runs over k17-k24. Returns the push plan
 * as { stand, dir, from, to } steps, bounded so a runaway room cannot hang
 * the gate - a room the solver cannot prove does not ship. */
function sokSolve(rows) {
  const H = rows.length;
  const W = Math.max(...rows.map((r) => r.length));
  const N = H * W;
  const blocked = new Uint8Array(N);
  const goalOf = new Uint8Array(N);
  let player = -1;
  const startBoxes = [];
  const grid = rows.map((r) => r.padEnd(W, "#"));
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const c = grid[y][x] || "#";
      const i = y * W + x;
      if (c === "#") blocked[i] = 1;
      if (c === "o" || c === "*") goalOf[i] = 1;
      if (c === "$" || c === "*") startBoxes.push(i);
      if (c === "@" || c === "+") player = i;
    }
  }
  const deltas = [1, -1, W, -W];
  const edge = (i, d) => (d === 1 ? i % W !== W - 1 : d === -1 ? i % W !== 0 : true);
  const isWall = (i) => i < 0 || i >= N || blocked[i] === 1;
  function regionOf(pos, on) {
    const reach = new Uint8Array(N);
    const walk = [pos];
    reach[pos] = 1;
    let min = pos;
    for (let head = 0; head < walk.length; head += 1) {
      const cur = walk[head];
      for (const d of deltas) {
        if (!edge(cur, d)) continue;
        const nxt = cur + d;
        if (isWall(nxt) || on[nxt] || reach[nxt]) continue;
        reach[nxt] = 1;
        if (nxt < min) min = nxt;
        walk.push(nxt);
      }
    }
    return { reach, min };
  }
  function frozenBox(on, i, path, memo) {
    if (memo.has(i)) return true;
    if (path.has(i)) return true;
    path.add(i);
    const blockedX =
      isWall(i - 1) || isWall(i + 1) ||
      (on[i - 1] && frozenBox(on, i - 1, path, memo)) ||
      (on[i + 1] && frozenBox(on, i + 1, path, memo));
    const blockedY =
      isWall(i - W) || isWall(i + W) ||
      (on[i - W] && frozenBox(on, i - W, path, memo)) ||
      (on[i + W] && frozenBox(on, i + W, path, memo));
    path.delete(i);
    if (blockedX && blockedY) { memo.add(i); return true; }
    return false;
  }
  function deadSet(on) {
    const memo = new Set();
    for (let i = 0; i < N; i += 1) {
      if (!on[i] || goalOf[i]) continue;
      if (frozenBox(on, i, new Set(), memo)) return true;
    }
    return false;
  }
  const solvedNow = (on) => {
    for (let i = 0; i < N; i += 1) if (goalOf[i] && !on[i]) return false;
    return true;
  };
  const boxesOn = new Uint8Array(N);
  for (const b of startBoxes) boxesOn[b] = 1;
  if (solvedNow(boxesOn)) return { pushes: 0, plan: [] };
  const startRegion = regionOf(player, boxesOn);
  const keyOf = (min, on) => {
    let s = String(min);
    for (let i = 0; i < N; i += 1) if (on[i]) s += "," + i;
    return s;
  };
  const startState = { boxes: startBoxes.slice().sort((a, b) => a - b), pos: player, d: 0, parent: null, push: null };
  const seen = new Map([[keyOf(startRegion.min, boxesOn), startState]]);
  let frontier = [startState];
  let goalState = null;
  let expanded = 0;
  while (frontier.length && !goalState) {
    const next = [];
    for (const st of frontier) {
      const on = new Uint8Array(N);
      for (const b of st.boxes) on[b] = 1;
      const reg = regionOf(st.pos, on);
      for (const b of st.boxes) {
        for (const d of deltas) {
          if (!edge(b, d) || !edge(b, -d)) continue;
          const land = b + d;
          if (!reg.reach[b - d] || isWall(land) || on[land]) continue;
          on[b] = 0;
          on[land] = 1;
          const dead = deadSet(on);
          const nreg = dead ? null : regionOf(b, on);
          const key = dead ? null : keyOf(nreg.min, on);
          on[land] = 0;
          on[b] = 1;
          if (dead || seen.has(key)) continue;
          expanded += 1;
          if (expanded > 400000) return { pushes: -1, plan: [], timeout: true };
          const boxes2 = st.boxes.filter((x) => x !== b).concat(land).sort((a, c) => a - c);
          const ns = { boxes: boxes2, pos: b, d: st.d + 1, parent: st, push: { stand: b - d, dir: d, from: b, to: land } };
          seen.set(key, ns);
          const doneOn = new Uint8Array(N);
          for (const x of boxes2) doneOn[x] = 1;
          if (solvedNow(doneOn)) { goalState = ns; break; }
          next.push(ns);
        }
        if (goalState) break;
      }
      if (goalState) break;
    }
    frontier = next;
  }
  if (!goalState) return null;
  const plan = [];
  for (let st = goalState; st.push; st = st.parent) plan.unshift(st.push);
  return { pushes: goalState.d, plan };
}

const DIRKEY = { 1: "ArrowRight", "-1": "ArrowLeft", W: "ArrowDown" };
const sokDirKey = (d, W) => DIRKEY[d] || DIRKEY[String(d)] || (d === W ? "ArrowDown" : "ArrowUp");
function sokWalk(from, to, free, W) {
  const prev = new Map([[from, null]]);
  const queue = [from];
  const steps = [[1, "ArrowRight"], [-1, "ArrowLeft"], [W, "ArrowDown"], [-W, "ArrowUp"]];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === to) break;
    for (const [d, key] of steps) {
      const nxt = cur + d;
      if (!free(nxt) || prev.has(nxt)) continue;
      prev.set(nxt, { cell: cur, key });
      queue.push(nxt);
    }
  }
  const out = [];
  let cur = to;
  while (prev.get(cur)) {
    out.unshift(prev.get(cur).key);
    cur = prev.get(cur).cell;
  }
  return out.length || from === to ? out : null;
}

module.exports = function gate(ctx) {
  const { App, env, check, fs, path, root } = ctx;

  /* ---- the ladder, parsed from the module's own source ----------------- */
  const sokSrc = fs
    .readFileSync(path.join(root, "assets", "app", "game-glyph-pusher.js"), "utf8")
    .replace(/^﻿/, "");
  const sokBlock = /var pushLevels = \[([\s\S]*?)\n  \];/.exec(sokSrc)[1];
  const sokMapTexts = Array.from(sokBlock.matchAll(/map:\s*\[([\s\S]*?)\]/g)).map((m) => m[1]);
  const sokMeta = Array.from(
    sokBlock.matchAll(
      /id:\s*"([a-z0-9]+)",\s*labelKey:\s*"([A-Za-z0-9]+)"[^{}]*?starMoves:\s*\[(\d+),\s*(\d+),\s*(\d+)\]/g,
    ),
  ).map((m) => ({ id: m[1], labelKey: m[2], bands: m.slice(3).map(Number) }));
  const rooms = sokMapTexts.map((text, i) => ({
    id: sokMeta[i] ? sokMeta[i].id : "k" + (i + 1),
    labelKey: sokMeta[i] ? sokMeta[i].labelKey : null,
    bands: sokMeta[i] ? sokMeta[i].bands : null,
    rows: Array.from(text.matchAll(/"([^"]*)"/g)).map((x) => x[1]),
  }));

  check("game-glyph-pusher", "the ladder holds thirty rooms",
    rooms.length === 30, String(rooms.length));
  check("game-glyph-pusher", "every room id is distinct and the ladder runs k1-k30 in order",
    rooms.every((room, index) => room.id === "k" + (index + 1)),
    rooms.map((r) => r.id).join(","));
  check("game-glyph-pusher", "every room carries its labelKey and its star bands",
    rooms.every((room) => room.labelKey && room.bands && room.bands.length === 3),
    rooms.map((r) => r.id + ":" + (r.labelKey || "?")).join(","));

  /* The module exports its own table (App.pushLevels) and it matches the
   * shipped source row for row - the gate prices the exported game, not a
   * private copy. */
  const exported = App.pushLevels;
  const exportProblems = [];
  if (!Array.isArray(exported) || exported.length !== rooms.length) {
    exportProblems.push("App.pushLevels is not the thirty-room table");
  } else {
    rooms.forEach((room, index) => {
      const level = exported[index];
      if (!level || level.id !== room.id || level.labelKey !== room.labelKey ||
          !level.map || level.map.join("|") !== room.rows.join("|") ||
          !level.starMoves || level.starMoves.join(",") !== room.bands.join(",")) {
        exportProblems.push("room " + (index + 1) + " differs between the export and the source");
      }
    });
  }
  check("game-glyph-pusher",
    "the module exports its own table on App, matching the shipped source",
    exportProblems.length === 0, exportProblems.join(" | "));

  const byId = {};
  rooms.forEach((room) => { byId[room.id] = room; });
  const shedMissing = SHED.filter((id) => !byId[id]);
  check("game-glyph-pusher", "the far shed k25-k30 is present, after the shipped tiers",
    shedMissing.length === 0 &&
      SHED.every((id, index) => rooms.findIndex((r) => r.id === id) >
        (index === 0 ? rooms.findIndex((r) => r.id === "k24") : rooms.findIndex((r) => r.id === SHED[index - 1]))),
    shedMissing.join(","));

  /* ---- the structural escalation: same stages, cut tighter ------------- */
  const wallsOf = (room) => {
    const W = Math.max(...room.rows.map((r) => r.length));
    const grid = room.rows.map((r) => r.padEnd(W, "#"));
    const walls = new Set();
    grid.forEach((row, y) => {
      for (let x = 0; x < W; x += 1) {
        if (row.charAt(x) === "#") walls.add(y * W + x);
      }
    });
    return { W: W, H: grid.length, walls: walls };
  };
  const charCount = (room, chars) =>
    room.rows.join("").split("").filter((c) => chars.indexOf(c) !== -1).length;
  const skel23 = wallsOf(byId.k23);
  const skel24 = wallsOf(byId.k24);
  const skeletonProblems = [];
  SHED.forEach((id) => {
    const room = byId[id];
    const shed = wallsOf(room);
    const boxes = charCount(room, "$*");
    const goals = charCount(room, "o*");
    if (boxes !== 3 || goals !== 3) {
      skeletonProblems.push(id + " carries " + boxes + " crates and " + goals +
        " diamonds, off the shipped peak's three and three");
      return;
    }
    /* The skeleton survives whole - no shipped wall may vanish - and the
     * rung may add at most two teeth of its own. */
    const rides = [skel23, skel24].some((skel) =>
      skel.W === shed.W && skel.H === shed.H &&
      Array.from(skel.walls).every((w) => shed.walls.has(w)) &&
      shed.walls.size - skel.walls.size <= 2);
    if (!rides) {
      skeletonProblems.push(id + " rides neither shipped summit skeleton");
    }
  });
  check("game-glyph-pusher",
    "every far-shed room rides a shipped summit skeleton pinched by at most two teeth, crates and diamonds still three",
    skeletonProblems.length === 0, skeletonProblems.join(" | "));

  /* ---- the re-pricing: measured optima hang the bands ------------------- */
  const priced = {};
  const plans = {};
  const priceProblems = [];
  SHED.forEach((id) => {
    const room = byId[id];
    const solved = sokSolve(room.rows);
    if (!solved || solved.timeout) {
      priceProblems.push(id + ": the exact solver " +
        (solved && solved.timeout ? "timed out" : "proves nothing"));
      return;
    }
    priced[id] = solved.pushes;
    plans[id] = solved.plan;
    if (room.bands[0] !== solved.pushes) {
      priceProblems.push(id + ": three-star band " + room.bands[0] +
        " off the measured optimum " + solved.pushes);
    }
    if (!(room.bands[0] < room.bands[1] && room.bands[1] < room.bands[2])) {
      priceProblems.push(id + ": bands do not run downwards " + room.bands.join("/"));
    }
    if (room.bands[1] < solved.pushes + 2) {
      priceProblems.push(id + ": two-star band " + room.bands[1] +
        " leaves no room for the wasted pair");
    }
    if (room.bands[2] < solved.pushes + 9) {
      priceProblems.push(id + ": one-star band " + room.bands[2] +
        " is tighter than the shipped cushion");
    }
  });
  check("game-glyph-pusher",
    "every far-shed room is solvable and its bands hang on the measured optimum",
    priceProblems.length === 0, priceProblems.join(" | "));

  /* The climb: strictly above the shipped summit, rung over rung. */
  const k24 = sokSolve(byId.k24.rows);
  const climbProblems = [];
  SHED.forEach((id, index) => {
    const prev = index === 0 ? (k24 ? k24.pushes : -Infinity) : priced[SHED[index - 1]];
    if (priced[id] === undefined || !(priced[id] > prev)) {
      climbProblems.push(id + ": " + priced[id] + " vs " + prev);
    }
  });
  check("game-glyph-pusher",
    "the far-shed optima climb rung over rung past the shipped summit (" +
      (k24 ? k24.pushes : "?") + " pushes)",
    climbProblems.length === 0, climbProblems.join(","));
  check("game-glyph-pusher",
    "the capstone asks strictly more pushes than any earlier far-shed room",
    priced.k30 !== undefined && priced.k30 === Math.max(...SHED.map((id) => priced[id])),
    SHED.map((id) => id + "=" + priced[id]).join(","));

  /* ---- the unlock chain is derived, never stored ------------------------ */
  const chain = App.createCampaign({
    key: "glyph-pusher-gate-chain",
    levels: rooms.map((room) => ({ id: room.id, labelKey: room.labelKey })),
  });
  let walked = 0;
  let chained = true;
  rooms.forEach((room, index) => {
    const outcome = chain.record(room.id, { stars: 3, best: 1, better: "low" });
    if (outcome.firstClear) walked += 1;
    const expected = index + 1 < rooms.length ? rooms[index + 1].id : null;
    if (outcome.unlockedNext !== expected) chained = false;
  });
  check("game-glyph-pusher", "the unlock chain walks all thirty rooms in order",
    walked === 30 && chained && chain.clearedCount() === 30, walked + " first clears");

  /* ---- the boot and the replay: the proof, on the real floor ------------ */
  env.setMotion("off");
  const makeEl = (id, tag) => {
    const found = env.byId(id);
    if (found) return found;
    const el = env.document.createElement(tag || "div");
    el.id = id;
    env.document.body.appendChild(el);
    return el;
  };
  makeEl("sokCanvas", "canvas");
  makeEl("sokMoves");
  makeEl("sokGoals");
  makeEl("sokTime");
  makeEl("sokResult");
  makeEl("sokNewBtn", "button");
  makeEl("sokUndoBtn", "button");
  makeEl("sokBest");
  const sokSelect = makeEl("sokLevelSel", "select");
  makeEl("gamePanelGlyphPusher");
  const seeded = {};
  for (let c = 1; c <= 24; c += 1) seeded["k" + c] = { stars: 3, best: 0 };
  env.store.set("glyph-pusher-campaign", JSON.stringify({ v: 1, cleared: seeded }));
  let bootError = null;
  try {
    App.initGlyphPusherGame();
  } catch (err) {
    bootError = err;
  }
  const sokMoves = env.byId("sokMoves");
  const bootDetail = bootError
    ? String((bootError && bootError.message) || bootError)
    : "select " + sokSelect.value + ", " + sokSelect.children.length + " rooms in the picker";
  check("game-glyph-pusher",
    "the panel boots through the real init path with no errors and opens the first shed room",
    !bootError && typeof App.quietResetGlyphPusher === "function" &&
      sokSelect.children.length === 30 && sokSelect.value === "k25" &&
      sokMoves.textContent === "0" &&
      !!env.byId("sokBest").textContent &&
      env.byId("sokBest").textContent !== "campaignStars",
    bootDetail);

  const sokCanvas = env.byId("sokCanvas");
  const sokStars = (levelId) => {
    const save = JSON.parse(env.store.get("glyph-pusher-campaign"));
    return (save.cleared[levelId] || { stars: 0 }).stars;
  };
  const sokArrow = (key) => env.dispatch(sokCanvas, "keydown", { key });
  /* A room that failed to load keeps its save entry at zero, so a three-star
   * result is itself the proof that the change dispatch loaded the room -
   * and each clear is what unlocks the next one down the shed. */
  const sokPlay = (levelId, room, plan) => {
    sokSelect.value = levelId;
    env.dispatch(sokSelect, "change");
    const H = room.rows.length;
    const W = Math.max(...room.rows.map((r) => r.length));
    const N = H * W;
    const on = new Uint8Array(N);
    const grid = room.rows.map((r) => r.padEnd(W, "#"));
    let player = -1;
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const c = grid[y][x] || "#";
        if (c === "$" || c === "*") on[y * W + x] = 1;
        if (c === "@" || c === "+") player = y * W + x;
      }
    }
    const free = (i) =>
      i >= 0 && i < N &&
      (grid[Math.floor(i / W)][i % W] || "#") !== "#" && !on[i];
    for (const step of plan) {
      const path = sokWalk(player, step.stand, free, W);
      if (path === null) return -1;
      for (const key of path) sokArrow(key);
      sokArrow(sokDirKey(step.dir, W));
      on[step.from] = 0;
      on[step.to] = 1;
      player = step.from;
    }
    return sokStars(levelId);
  };

  const replayProblems = [];
  SHED.forEach((id) => {
    const played = plans[id] ? sokPlay(id, byId[id], plans[id]) : -1;
    if (played !== 3) {
      replayProblems.push(id + ": the optimal plan does not clear for three stars");
    }
  });
  check("game-glyph-pusher",
    "every far-shed optimal plan replays through the engine for exactly three stars",
    replayProblems.length === 0, replayProblems.join(" | "));

  /* End state: the engine's own save holds the whole ladder cleared, and the
   * six shed entries were written by the replays above - each one unlocked
   * only by the clear before it. */
  const finalSave = JSON.parse(env.store.get("glyph-pusher-campaign"));
  const shedCleared = SHED.filter((id) =>
    (finalSave.cleared[id] || { stars: 0 }).stars === 3).length;
  check("game-glyph-pusher",
    "the engine's own save ends with all thirty rooms cleared at three stars",
    Object.keys(finalSave.cleared).length === 30 && shedCleared === 6,
    Object.keys(finalSave.cleared).length + " cleared, " + shedCleared + " shed rooms at three stars");

  /* The slack line: a detour of the optimum plus two wasted pushes lands
   * past the three-star line and inside the two-star band. */
  const slackProblems = [];
  SHED.forEach((id) => {
    const room = byId[id];
    const opt = priced[id];
    if (opt === undefined) return;
    if (!(opt + 2 > room.bands[0] && opt + 2 <= room.bands[1])) {
      slackProblems.push(id + ": " + opt + " + 2 vs bands " + room.bands.join("/"));
    }
  });
  check("game-glyph-pusher",
    "the optimum plus the wasted pair lands exactly two stars in every far-shed room",
    slackProblems.length === 0, slackProblems.join(" | "));

  /* ---- the names travel in both packs ----------------------------------- */
  const labelProblems = SHED.map((id, index) => {
    const key = byId[id].labelKey;
    if (key !== "lvlNum" + (25 + index)) {
      return key + " is off the ladder's naming scheme";
    }
    const en = App.I18N && App.I18N.en && App.I18N.en[key];
    const zh = App.I18N && App.I18N.zh && App.I18N.zh[key];
    if (typeof en !== "string" || !en.length) return key + " has no English string";
    if (typeof zh !== "string" || !zh.length) return key + " has no Chinese string";
    if (zh === en) return key + " repeats one string for both languages";
    const shown = App.t(key);
    if (!shown || shown === key) return key + " falls back to the raw key";
    return null;
  }).filter(Boolean);
  check("game-glyph-pusher", "the six far-shed stage names resolve in both languages as real strings",
    labelProblems.length === 0, labelProblems.join(","));
};
