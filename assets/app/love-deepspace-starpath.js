/* Original constellation puzzles: a quiet, untimed activity for two. */
(function (App) {
  "use strict";
  var partnerIds = ["xavier", "zayne", "rafayel", "sylus", "caleb"];
  var storageKey = "love-deepspace-starpath-v1";
  var vectors = [[-1, 0], [0, 1], [1, 0], [0, -1]];
  var routePlans = [
    { size: 3, path: "10 11 12" },
    { size: 3, path: "00 01 11 12 22" },
    { size: 3, path: "00 01 02 12 22 21 20", beacons: [3] },
    { size: 4, path: "00 01 11 12 22 23 33", beacons: [2, 4], decoys: ["02", "21"] },
    { size: 4, path: "00 01 02 03 13 23 22 21 20 30", beacons: [3, 6], decoys: ["11"] },
    { size: 4, path: "00 10 20 30 31 32 22 12 02 03", beacons: [3, 7], locks: [4], decoys: ["11", "23"] },
    { size: 4, path: "00 01 02 03 13 23 33 32 31 30 20 21", beacons: [3, 7, 10], locks: [6], decoys: ["12"] },
    { size: 5, path: "00 01 02 03 04 14 24 23 22 21 20 30 40 41 42 43 44", beacons: [4, 8, 12], locks: [6], decoys: ["12", "32"] },
    { size: 5, path: "00 10 20 30 40 41 42 32 22 12 02 03 04 14 24 34 44", beacons: [4, 8, 12], locks: [6, 10], decoys: ["21", "23"] },
    { size: 5, path: "00 01 02 03 04 14 24 34 44 43 42 41 40 30 20 21 22 23", beacons: [4, 9, 14], locks: [8], decoys: ["12", "32", "33"] },
    { size: 5, path: "00 10 11 12 02 03 04 14 24 23 22 32 42 43 44", beacons: [3, 8, 11], locks: [5, 9], decoys: ["21", "31", "33"] },
    { size: 5, path: "00 01 11 21 20 30 40 41 42 32 22 23 13 03 04 14 24 34 44", beacons: [5, 10, 15], locks: [6, 13], decoys: ["12", "23", "43"] }
  ];
  function rotateMask(mask, turns) {
    turns = ((turns || 0) % 4 + 4) % 4;
    while (turns--) { mask = ((mask << 1) & 15) | (mask >> 3); }
    return mask;
  }
  function direction(a, b, size) {
    var dr = Math.floor(b / size) - Math.floor(a / size), dc = b % size - a % size;
    for (var d = 0; d < 4; d++) { if (vectors[d][0] === dr && vectors[d][1] === dc) { return d; } }
    return -1;
  }
  function neighbour(index, d, size) {
    var r = Math.floor(index / size) + vectors[d][0], c = index % size + vectors[d][1];
    return r >= 0 && r < size && c >= 0 && c < size ? r * size + c : -1;
  }
  function distance(from, to) {
    for (var n = 0; n < 4; n++) { if (rotateMask(from, n) === to) { return n; } }
    return Infinity;
  }
  function makeStage(plan, number) {
    var path = plan.path.split(" ").map(function (xy) { return Number(xy[0]) * plan.size + Number(xy[1]); });
    var cells = [], canonical = [];
    for (var i = 0; i < plan.size * plan.size; i++) { cells.push({ mask: 0, locked: true, beacon: false, kind: "empty" }); canonical.push(0); }
    path.forEach(function (index, p) {
      var mask = 0;
      if (p) { mask |= 1 << direction(index, path[p - 1], plan.size); }
      if (p + 1 < path.length) { mask |= 1 << direction(index, path[p + 1], plan.size); }
      var endpoint = p === 0 || p === path.length - 1;
      var locked = endpoint || (plan.locks || []).indexOf(p) >= 0;
      var scramble = locked ? 0 : number === 0 ? 1 : 1 + ((p * 7 + number * 3) % (number < 3 ? 2 : 3));
      cells[index] = { mask: rotateMask(mask, scramble), locked: locked, beacon: (plan.beacons || []).indexOf(p) >= 0, kind: p === 0 ? "source" : p === path.length - 1 ? "destination" : "star" };
      canonical[index] = mask;
    });
    (plan.decoys || []).forEach(function (xy, p) {
      var index = Number(xy[0]) * plan.size + Number(xy[1]);
      if (cells[index].mask) { return; }
      cells[index] = { mask: rotateMask(p % 2 ? 5 : 3, number + p), locked: false, beacon: false, kind: "star" };
      canonical[index] = cells[index].mask;
    });
    var stage = { id: number, size: plan.size, source: path[0], destination: path[path.length - 1], cells: cells, solution: canonical, beacons: path.filter(function (index) { return cells[index].beacon; }) };
    var solved = solve(stage, cells.map(function (cell) { return cell.mask; }));
    stage.par = solved ? solved.moves : 0;
    return stage;
  }
  /* A solution is a simple source-to-destination route. Degree-two star tiles
   * cannot branch. Enumerating routes therefore yields the true least number
   * of clockwise rotations, including alternatives through decoy stars. */
  function solve(stage, masks) {
    masks = masks || stage.cells.map(function (cell) { return cell.mask; });
    var seen = {}, best = null, route = [], desired = {};
    function walk(index, incoming, cost) {
      if (best && cost >= best.moves) { return; }
      var cell = stage.cells[index];
      if (!cell || !cell.mask || seen[index]) { return; }
      seen[index] = true; route.push(index);
      if (index === stage.destination) {
        if (cell.mask === (1 << incoming) && stage.beacons.every(function (b) { return seen[b]; })) {
          desired[index] = cell.mask;
          best = { moves: cost, route: route.slice(), masks: Object.assign({}, desired) };
          delete desired[index];
        }
      } else {
        for (var d = 0; d < 4; d++) {
          if (d === incoming) { continue; }
          var mask = index === stage.source ? 1 << d : (1 << incoming) | (1 << d);
          var turns = cell.locked ? cell.mask === mask ? 0 : Infinity : distance(masks[index], mask);
          var next = neighbour(index, d, stage.size);
          if (!Number.isFinite(turns) || next < 0) { continue; }
          desired[index] = mask;
          walk(next, (d + 2) % 4, cost + turns);
          delete desired[index];
        }
      }
      route.pop(); delete seen[index];
    }
    walk(stage.source, -1, 0);
    return best;
  }
  var stages = routePlans.map(makeStage);
  function trace(stage, masks) {
    var lit = [], seen = {}, pending = [stage.source];
    while (pending.length) {
      var index = pending.shift();
      if (seen[index]) { continue; }
      seen[index] = true; lit.push(index);
      for (var d = 0; d < 4; d++) {
        if (!(masks[index] & (1 << d))) { continue; }
        var next = neighbour(index, d, stage.size);
        if (next >= 0 && masks[next] & (1 << ((d + 2) % 4))) { pending.push(next); }
      }
    }
    var beacons = stage.beacons.filter(function (index) { return seen[index]; }).length;
    return { lit: lit, beacons: beacons, connected: !!seen[stage.destination], solved: !!seen[stage.destination] && beacons === stage.beacons.length };
  }
  function createState(index) {
    if (!Number.isInteger(index) || index < 0 || index >= stages.length) { index = 0; }
    return { stage: index, masks: stages[index].cells.map(function (cell) { return cell.mask; }), moves: 0, hints: 0, history: [], done: false };
  }
  function rotate(state, index) {
    var stage = stages[state.stage], cell = stage && stage.cells[index];
    if (!Number.isInteger(index) || !cell || !cell.mask || cell.locked || state.done) { return false; }
    state.history.push({ index: index, mask: state.masks[index] });
    state.masks[index] = rotateMask(state.masks[index], 1); state.moves++;
    state.done = trace(stage, state.masks).solved;
    return true;
  }
  function undo(state) {
    if (state.done || !state.history.length) { return false; }
    var last = state.history.pop(); state.masks[last.index] = last.mask;
    /* Undo restores position, but rotations still count toward efficiency. */
    return true;
  }
  function hint(state) {
    if (state.done) { return null; }
    var answer = solve(stages[state.stage], state.masks);
    if (!answer) { return null; }
    for (var p = 0; p < answer.route.length; p++) {
      var index = answer.route[p];
      if (state.masks[index] !== answer.masks[index]) { state.hints++; return { index: index, turns: distance(state.masks[index], answer.masks[index]) }; }
    }
    return null;
  }
  function starsFor(state) {
    if (!state.done) { return 0; }
    var par = stages[state.stage].par;
    return state.hints ? 1 : state.moves <= par ? 3 : state.moves <= par + Math.max(2, Math.ceil(par / 3)) ? 2 : 1;
  }
  function readProgress(raw) {
    var out = { version: 1, partners: {} }, saved;
    try { saved = JSON.parse(raw || "null"); } catch (_) {}
    partnerIds.forEach(function (id) {
      var values = saved && saved.version === 1 && saved.partners && saved.partners[id];
      var blocked = false;
      out.partners[id] = stages.map(function (_, i) {
        var value = Array.isArray(values) ? values[i] : 0;
        value = !blocked && Number.isInteger(value) && value >= 0 && value <= 3 ? value : 0;
        if (!value) { blocked = true; }
        return value;
      });
    });
    return out;
  }
  function progressFor(progress, partner) {
    var values = progress.partners[partner] || progress.partners.xavier;
    var cleared = values.filter(function (n) { return n > 0; }).length;
    return { partner: partner, stars: values.slice(), cleared: cleared, totalStars: values.reduce(function (sum, n) { return sum + n; }, 0), unlocked: Math.min(stages.length, cleared + 1) };
  }
  function recordClear(progress, partner, state) {
    var stage = state && stages[state.stage];
    if (partnerIds.indexOf(partner) < 0 || !stage || !Number.isInteger(state.stage) || !state.done || !Array.isArray(state.masks) || state.masks.length !== stage.cells.length || !Number.isInteger(state.moves) || state.moves < stage.par || !Number.isInteger(state.hints) || state.hints < 0 || !state.masks.every(function (mask, i) { return Number.isInteger(mask) && mask >= 0 && mask <= 15 && (stage.cells[i].locked ? mask === stage.cells[i].mask : Number.isFinite(distance(stage.cells[i].mask, mask))); }) || !trace(stage, state.masks).solved) { return false; }
    var info = progressFor(progress, partner);
    if (state.stage >= info.unlocked) { return false; }
    var first = progress.partners[partner][state.stage] === 0;
    progress.partners[partner][state.stage] = Math.max(progress.partners[partner][state.stage], starsFor(state));
    return first;
  }
  function mount(host, options) {
    options = options || {};
    var t = App.t, raw;
    try { raw = App.storage.getItem(storageKey); } catch (_) {}
    var progress = readProgress(raw), partner = { id: "xavier", nameKey: "ldsPartnerXavier" }, state = createState(0), paused = false, selected = 0, hintIndex = -1, settled = false, message = "lspReady", messageVars;
    function el(tag, cls, key, parent) { var n = document.createElement(tag); if (cls) { n.className = cls; } if (key) { n.setAttribute("data-i18n", key); n.textContent = t(key); } if (parent) { parent.appendChild(n); } return n; }
    function btn(cls, key, parent, handler) { var b = el("button", cls, key, parent); b.type = "button"; b.addEventListener("click", handler); return b; }
    function isHidden() { return document.hidden || root.hidden || host.hidden || (options.isHidden && options.isHidden()); }
    function canAct() { return !paused && !isHidden(); }
    function save() { try { App.storage.setItem(storageKey, JSON.stringify(progress)); } catch (_) {} }
    var root = el("section", "lsp-game", null, host); root.setAttribute("data-partner", partner.id);
    var header = el("div", "lsp-heading", null, root);
    var eyebrow = el("span", "lsp-eyebrow", "lspEyebrow", header);
    el("h4", "lsp-title", "lspTitle", header); el("p", "lsp-intro", "lspIntro", header);
    var stageNav = el("div", "lsp-stage-nav", null, root); stageNav.setAttribute("role", "group"); stageNav.setAttribute("data-i18n-aria", "lspChooseStage");
    var stageButtons = stages.map(function (stage, index) {
      var b = btn("lsp-stage-button", null, stageNav, function () { if (canAct()) { selectStage(index); } });
      b.setAttribute("data-starpath-stage", String(index));
      var number = el("span", "lsp-stage-number", null, b); number.textContent = String(index + 1).padStart(2, "0");
      var score = el("span", "lsp-stage-stars", null, b); return { button: b, score: score };
    });
    var panel = el("div", "lsp-observatory", null, root);
    var stageHeading = el("div", "lsp-stage-heading", null, panel), stageName = el("strong", "", null, stageHeading), difficulty = el("span", "", null, stageHeading);
    var hud = el("div", "lsp-hud", null, panel), movesReadout = el("span", "", null, hud), parReadout = el("span", "", null, hud), beaconReadout = el("span", "", null, hud);
    var grid = el("div", "lsp-board", null, panel); grid.setAttribute("role", "group"); grid.setAttribute("data-i18n-aria", "lspBoard");
    var tiles = [], flow = el("p", "lsp-flow", null, panel); flow.setAttribute("aria-hidden", "true");
    var dialogue = el("p", "lsp-dialogue", null, root);
    var controls = el("div", "lsp-controls", null, root);
    var undoButton = btn("lds-small-button", "lspUndo", controls, function () { if (canAct() && undo(state)) { hintIndex = -1; message = "lspUndone"; render(); } });
    var resetButton = btn("lds-small-button", "lspReset", controls, function () { if (canAct()) { state = createState(state.stage); settled = false; hintIndex = -1; message = "lspResetDone"; render(); } });
    var hintButton = btn("lds-small-button", "lspHint", controls, function () { if (!canAct()) { return; } var tip = hint(state); if (tip) { hintIndex = tip.index; selected = tip.index; message = "lspHintGiven"; messageVars = { r: Math.floor(tip.index / stages[state.stage].size) + 1, c: tip.index % stages[state.stage].size + 1, n: tip.turns }; render(); tiles[selected].button.focus({ preventScroll: true }); } });
    var nextButton = btn("lds-small-button lsp-next", "lspNext", controls, function () { if (canAct()) { selectStage(state.stage + 1); } });
    var status = el("p", "lsp-status", null, root); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    el("p", "lsp-help", "lspKeyboard", root); el("p", "lsp-rating-help", "lspRating", root);
    function openDirections(mask) { return vectors.map(function (_, d) { return mask & (1 << d) ? t("lspDirection" + d) : ""; }).filter(Boolean).join(" · "); }
    function turn(index) {
      if (!canAct() || !rotate(state, index)) { return; }
      selected = index; hintIndex = -1; message = "lspProgress";
      var light = trace(stages[state.stage], state.masks);
      messageVars = { moves: state.moves, lit: light.lit.length, beacons: light.beacons, total: stages[state.stage].beacons.length };
      if (state.done && !settled) {
        settled = true;
        var fresh = recordClear(progress, partner.id, state);
        save(); message = fresh ? "lspClearFirst" : "lspClearAgain"; messageVars = { n: starsFor(state), m: state.moves };
        if (fresh && options.onReward) { options.onReward("starpath", "stage-" + (state.stage + 1)); }
        if (options.onMoment) { options.onMoment("Win"); }
      }
      render();
    }
    function buildGrid() {
      while (grid.firstChild) { grid.removeChild(grid.firstChild); }
      var stage = stages[state.stage]; tiles = [];
      grid.style.setProperty("--lsp-size", String(stage.size));
      stage.cells.forEach(function (cell, index) {
        if (!cell.mask) { var empty = el("span", "lsp-void", null, grid); empty.setAttribute("aria-hidden", "true"); tiles.push({ button: null }); return; }
        var b = btn("lsp-star-tile", null, grid, function () { turn(index); });
        b.setAttribute("data-starpath-tile", String(index)); b.setAttribute("data-kind", cell.kind);
        var rays = vectors.map(function (_, d) { var ray = el("i", "lsp-ray lsp-ray-" + d, null, b); ray.setAttribute("aria-hidden", "true"); return ray; });
        var star = el("span", "lsp-star", null, b); star.setAttribute("aria-hidden", "true"); star.textContent = cell.kind === "source" ? "✦" : cell.kind === "destination" ? "◇" : cell.beacon ? "✧" : "·";
        if (cell.beacon) { b.classList.add("has-beacon"); }
        if (cell.locked) { b.classList.add("is-fixed"); }
        b.addEventListener("focus", function () { selected = index; });
        b.addEventListener("keydown", function (event) {
          if (!canAct()) { if ([" ", "Enter"].indexOf(event.key) >= 0) { event.preventDefault(); } return; }
          var arrow = ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].indexOf(event.key);
          if (arrow >= 0) {
            event.preventDefault(); var next = neighbour(index, arrow, stage.size);
            while (next >= 0 && !tiles[next].button) { next = neighbour(next, arrow, stage.size); }
            if (next >= 0) { selected = next; renderTiles(); tiles[next].button.focus({ preventScroll: true }); }
          }
          if ((event.key === " " || event.key === "Enter") && !event.repeat) { event.preventDefault(); turn(index); }
        });
        tiles.push({ button: b, rays: rays });
      });
    }
    function renderTiles() {
      var stage = stages[state.stage], light = trace(stage, state.masks);
      tiles.forEach(function (tile, index) {
        if (!tile.button) { return; }
        var cell = stage.cells[index], b = tile.button;
        tile.rays.forEach(function (ray, d) { ray.hidden = !(state.masks[index] & (1 << d)); });
        b.classList.toggle("is-lit", light.lit.indexOf(index) >= 0); b.classList.toggle("is-hint", hintIndex === index);
        b.setAttribute("aria-disabled", String(cell.locked || state.done || paused || isHidden()));
        b.tabIndex = index === selected ? 0 : -1;
        b.setAttribute("aria-label", t("lspTileLabel", { r: Math.floor(index / stage.size) + 1, c: index % stage.size + 1, kind: t("lspKind" + (cell.kind === "star" && cell.beacon ? "Beacon" : cell.kind.charAt(0).toUpperCase() + cell.kind.slice(1))), directions: openDirections(state.masks[index]), light: t(light.lit.indexOf(index) >= 0 ? "lspLit" : "lspDark"), action: t(cell.locked ? "lspFixed" : "lspRotate") }));
      });
      return light;
    }
    function render() {
      var stage = stages[state.stage], info = getProgress(), light = renderTiles();
      root.setAttribute("data-partner", partner.id); panel.setAttribute("data-complete", String(state.done));
      stageNav.setAttribute("aria-label", t("lspChooseStage")); grid.setAttribute("aria-label", t("lspBoard"));
      stageName.textContent = t("lspStageName" + state.stage);
      difficulty.textContent = t("lspStageMeta", { n: state.stage + 1, total: stages.length, size: stage.size });
      movesReadout.textContent = t("lspMoves", { n: state.moves }); parReadout.textContent = t("lspPar", { n: stage.par });
      beaconReadout.textContent = t("lspBeacons", { n: light.beacons, total: stage.beacons.length }); beaconReadout.hidden = !stage.beacons.length;
      flow.textContent = t(state.done ? "lspFlowDone" : "lspFlow", { n: light.lit.length });
      dialogue.textContent = "“" + t("lspVoice" + partner.id.charAt(0).toUpperCase() + partner.id.slice(1) + (state.done ? "Done" : "Begin")) + "”";
      stageButtons.forEach(function (entry, i) {
        entry.button.disabled = i >= info.unlocked || !canAct(); entry.button.setAttribute("aria-pressed", String(i === state.stage));
        entry.button.setAttribute("aria-label", t(i >= info.unlocked ? "lspStageLocked" : "lspStageAccessible", { n: i + 1, title: t("lspStageName" + i), stars: info.stars[i] }));
        entry.score.textContent = i >= info.unlocked ? "◇" : "★".repeat(info.stars[i]) + "☆".repeat(3 - info.stars[i]);
      });
      undoButton.disabled = state.done || !state.history.length || !canAct(); resetButton.disabled = !canAct(); hintButton.disabled = state.done || !canAct();
      nextButton.hidden = !state.done || state.stage === stages.length - 1; nextButton.disabled = !canAct();
      status.textContent = t(paused ? "lspPaused" : message, messageVars);
      root.querySelectorAll("[data-i18n]").forEach(function (node) { node.textContent = t(node.getAttribute("data-i18n")); });
    }
    function selectStage(index) {
      if (!Number.isInteger(index) || index < 0 || index >= getProgress().unlocked) { return false; }
      state = createState(index); settled = false; hintIndex = -1; selected = stages[index].source; message = "lspReady"; messageVars = undefined;
      buildGrid(); render(); return true;
    }
    function getProgress() { return progressFor(progress, partner.id); }
    function pause() { paused = true; render(); }
    function refresh() { if (!isHidden()) { paused = false; } render(); }
    selectStage(0);
    return {
      element: root, pause: pause, refresh: refresh, getProgress: getProgress, selectStage: selectStage,
      setPartner: function (next) {
        if (!next || partnerIds.indexOf(next.id) < 0) { return; }
        partner = next; paused = false; var info = getProgress(); selectStage(Math.min(info.cleared, stages.length - 1));
      },
      inspect: function () { return { state: JSON.parse(JSON.stringify(state)), progress: getProgress(), paused: paused }; }
    };
  }
  var copy = {
    ldsDateStarpath: ["✧ Starpath", "✧ 星轨共鸣"],
    lspEyebrow: ["A CONSTELLATION FOR TWO", "属于两个人的星图"], lspTitle: ["Starpath resonance", "星轨共鸣"],
    lspIntro: ["Turn the stars clockwise. Carry the warm light from ✦ to ◇, visiting every diamond beacon along the way. Take your time; the sky will wait.", "顺时针转动星点，让暖光从 ✦ 抵达 ◇，沿途点亮每一颗菱形信标。慢慢来，星空会等你。"],
    lspChooseStage: ["Choose a constellation", "选择星图"], lspBoard: ["Constellation puzzle; rotate stars to connect the light", "星图谜题：转动星点，连接光路"],
    lspStageMeta: ["{n} / {total} · {size} × {size}", "{n} / {total} · {size} × {size}"],
    lspMoves: ["{n} rotations", "转动 {n} 次"], lspPar: ["Perfect route: {n}", "三星目标：{n} 次"], lspBeacons: ["Beacons {n} / {total}", "信标 {n} / {total}"],
    lspFlow: ["{n} stars carry your light", "你的光已抵达 {n} 颗星"], lspFlowDone: ["One sky. Two heartbeats.", "同一片星空，两个人的心跳。"],
    lspUndo: ["↶ Undo", "↶ 撤回"], lspReset: ["↻ Begin again", "↻ 重新开始"], lspHint: ["✧ Show a hint", "✧ 星光提示"], lspNext: ["Next constellation →", "下一幅星图 →"],
    lspReady: ["Follow the glowing path. Click or tap a star to turn it clockwise.", "沿着发光的路线，点击星点将它顺时针转动。"],
    lspProgress: ["{moves} rotations · {lit} stars lit · beacons {beacons} / {total}.", "已转动 {moves} 次 · 点亮 {lit} 颗星 · 信标 {beacons} / {total}。"],
    lspUndone: ["Last rotation undone. It still counts toward your rotation total.", "已撤回上一次转动；这一步仍计入转动总数。"],
    lspResetDone: ["A fresh sky. Your best stars are safely kept.", "星图重新展开。已获得的最佳星数会保留。"],
    lspHintGiven: ["Turn row {r}, column {c} clockwise {n} time(s). Hints earn one star for this attempt.", "将第 {r} 行、第 {c} 列顺时针转动 {n} 次。本次使用提示，通关可得一星。"],
    lspClearFirst: ["Connected · {n} stars in {m} rotations. A constellation memory is yours, and the next sky is open.", "星轨连通 · {m} 次转动，获得 {n} 星。星图纪念已收好，下一片星空为你展开。"],
    lspClearAgain: ["Connected · {n} stars in {m} rotations. Your best result is kept. This memory has already been collected.", "星轨连通 · {m} 次转动，获得 {n} 星。最佳成绩已保留，这份星图纪念已经收藏。"],
    lspPaused: ["Your constellation is resting. Return to Starpath to continue.", "星图暂时停驻。回到星轨共鸣即可继续。"],
    lspKeyboard: ["Keyboard: Tab to the board, arrows to move, Enter or Space to rotate. ✦ and ◇ stay fixed; ringed stars are fixed anchors.", "键盘：Tab 进入星图，方向键移动，Enter 或空格转动。✦ 和 ◇ 保持固定，带圆环的星点是固定锚点。"],
    lspRating: ["★★★ Match the perfect rotation count without hints. ★★ A few extra turns. ★ All other clears, including hints. Undo counts; restarting gives a fresh attempt.", "★★★ 不用提示，在三星目标次数内完成。★★ 少量额外转动。★ 其他通关（包含使用提示）。撤回仍计数，重新开始可开启新的尝试。"],
    lspStageLocked: ["Constellation {n}, {title}: clear the previous sky to unlock", "星图 {n}，{title}：完成上一幅星图后解锁"],
    lspStageAccessible: ["Constellation {n}, {title}: best {stars} stars", "星图 {n}，{title}：最佳 {stars} 星"],
    lspTileLabel: ["Row {r}, column {c}; {kind}; {light}; connected directions {directions}; {action}", "第 {r} 行第 {c} 列；{kind}；{light}；连线方向：{directions}；{action}"],
    lspLit: ["lit", "已点亮"], lspDark: ["unlit", "尚未点亮"],
    lspKindSource: ["light source", "光源"], lspKindDestination: ["destination", "终点"], lspKindStar: ["star", "星点"], lspKindBeacon: ["beacon", "信标"], lspFixed: ["fixed", "固定"], lspRotate: ["rotate clockwise", "顺时针转动"],
    lspDirection0: ["north", "上"], lspDirection1: ["east", "右"], lspDirection2: ["south", "下"], lspDirection3: ["west", "左"],
    lspStageName0: ["First light", "初遇微光"], lspStageName1: ["A gentle turn", "轻轻转弯"], lspStageName2: ["Across the dusk", "穿过暮色"], lspStageName3: ["Two promises", "两颗约定"],
    lspStageName4: ["The long way home", "归途星光"], lspStageName5: ["A steady heart", "坚定的心"], lspStageName6: ["A sky to remember", "铭记的星空"], lspStageName7: ["Between the tides", "潮汐之间"],
    lspStageName8: ["Unspoken orbit", "未言的轨道"], lspStageName9: ["Into the quiet", "深入静夜"], lspStageName10: ["Where we meet", "相逢之处"], lspStageName11: ["Our constellation", "属于我们的星图"],
    lspVoiceXavierBegin: ["There's no hurry. I'll stay until every star finds its place.", "不用急。我会等到每一颗星找到它的位置。"], lspVoiceXavierDone: ["I think this part of the sky belongs to us now.", "这片星空，现在好像属于我们了。"],
    lspVoiceZayneBegin: ["Start with the light. We can work through the rest together.", "先看光源。剩下的，我们一起梳理。"], lspVoiceZayneDone: ["A precise connection. Come closer; the view is better from here.", "连接得很准确。靠近一点，这里的视野更好。"],
    lspVoiceRafayelBegin: ["A line is a little like a brushstroke. Let's give this sky some character.", "星轨也像笔触。一起给这片星空添一点个性吧。"], lspVoiceRafayelDone: ["That glow? I couldn't have painted it better myself.", "这种光，连我都未必画得更好。"],
    lspVoiceSylusBegin: ["A few wrong turns won't stop us. Choose your next one.", "绕几次路，也拦不住我们。选好下一步。"], lspVoiceSylusDone: ["Well played. I rather like the route you chose.", "做得不错。你选的这条路，我很喜欢。"],
    lspVoiceCalebBegin: ["You steer the stars. I'll keep you company on the way.", "你来指挥星星，我陪你走这一程。"], lspVoiceCalebDone: ["Found our way back. See? I knew we'd make a good team.", "找到归途了。看吧，我就知道我们很有默契。"]
  };
  var strings = { en: {}, zh: {} }; Object.keys(copy).forEach(function (key) { strings.en[key] = copy[key][0]; strings.zh[key] = copy[key][1]; }); App.addStrings(strings);
  App.ldsStarpathStages = stages; App.ldsStarpathRotateMask = rotateMask; App.ldsSolveStarpath = solve; App.ldsTraceStarpath = trace;
  App.ldsCreateStarpath = createState; App.ldsStarpathRotate = rotate; App.ldsStarpathUndo = undo; App.ldsStarpathHint = hint; App.ldsStarpathStars = starsFor;
  App.ldsReadStarpath = readProgress; App.ldsStarpathProgress = progressFor; App.ldsRecordStarpath = recordClear; App.mountLdsStarpath = mount;
})(window.CapitalConvert = window.CapitalConvert || {});
