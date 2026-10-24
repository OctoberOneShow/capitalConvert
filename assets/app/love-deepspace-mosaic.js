/* Original photo puzzles. Minimum swaps come from permutation cycles; clockwise
 * rotations are independent, so the displayed perfect target is attainable. */
(function (App) {
  "use strict";
  var ids = ["xavier", "zayne", "rafayel", "sylus", "caleb"], key = "love-deepspace-mosaic-v1";
  var stages = Array.from({ length: 9 }, function (_, i) { return { id: i, size: i < 6 ? 3 : 4, rotate: i >= 3, art: i }; });
  function random(seed) { return function () { seed = Math.imul(seed ^ seed >>> 15, 1 | seed); seed ^= seed + Math.imul(seed ^ seed >>> 7, 61 | seed); return ((seed ^ seed >>> 14) >>> 0) / 4294967296; }; }
  function minimum(tiles) {
    var seen = {}, swaps = 0, turns = 0;
    tiles.forEach(function (piece, i) {
      turns += (4 - piece.turn) % 4;
      if (seen[i]) { return; } var p = i, length = 0;
      while (!seen[p]) { seen[p] = true; length++; p = tiles[p].id; }
      swaps += Math.max(0, length - 1);
    }); return swaps + turns;
  }
  function solved(s) {
    if (!s || !Array.isArray(s.tiles) || !s.tiles.length) { return false; }
    for (var i = 0; i < s.tiles.length; i++) { if (!s.tiles[i] || s.tiles[i].id !== i || s.tiles[i].turn !== 0) { return false; } }
    return true;
  }
  function create(stageId, partner) {
    var stage = stages[Number.isInteger(stageId) && stages[stageId] ? stageId : 0];
    var rng = random(41719 + stage.id * 7919 + Math.max(0, ids.indexOf(partner)) * 104729);
    var tiles = Array.from({ length: stage.size * stage.size }, function (_, i) { return { id: i, turn: stage.rotate && i % 3 !== 0 ? Math.floor(rng() * 4) : 0 }; });
    for (var i = tiles.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), tile = tiles[i]; tiles[i] = tiles[j]; tiles[j] = tile; }
    if (tiles.every(function (tile, i) { return tile.id === i; })) { var first = tiles[0]; tiles[0] = tiles[1]; tiles[1] = first; }
    return { partner: ids.indexOf(partner) >= 0 ? partner : "xavier", stage: stage.id, tiles: tiles, moves: 0, par: minimum(tiles), hints: 0, history: [], done: false };
  }
  function remember(s) { s.history.push(s.tiles.map(function (piece) { return { id: piece.id, turn: piece.turn }; })); if (s.history.length > 100) { s.history.shift(); } }
  function swap(s, a, b) {
    if (s.done || !Number.isInteger(a) || !Number.isInteger(b) || a === b || !s.tiles[a] || !s.tiles[b]) { return false; }
    remember(s); var tile = s.tiles[a]; s.tiles[a] = s.tiles[b]; s.tiles[b] = tile; s.moves++; s.done = solved(s); return true;
  }
  function rotate(s, index) {
    if (s.done || !stages[s.stage].rotate || !Number.isInteger(index) || !s.tiles[index]) { return false; }
    remember(s); s.tiles[index].turn = (s.tiles[index].turn + 1) % 4; s.moves++; s.done = solved(s); return true;
  }
  function assist(s) {
    if (s.done) { return false; }
    var wrong = s.tiles.findIndex(function (piece, i) { return piece.id !== i; });
    if (wrong >= 0) { var origin = s.tiles.findIndex(function (piece) { return piece.id === wrong; }); swap(s, wrong, origin); }
    else { rotate(s, s.tiles.findIndex(function (piece) { return piece.turn !== 0; })); }
    s.hints++; return true;
  }
  function undo(s) { if (s.done || !s.history.length) { return false; } s.tiles = s.history.pop(); return true; }
  function stars(s) { return !s.done ? 0 : s.hints ? 1 : s.moves <= s.par ? 3 : s.moves <= s.par + Math.max(3, Math.ceil(s.par * .25)) ? 2 : 1; }
  function read(raw) {
    var saved, out = { version: 1, partners: {} }; try { saved = JSON.parse(raw || "null"); } catch (_) {}
    ids.forEach(function (id) {
      var list = saved && saved.version === 1 && saved.partners && saved.partners[id], gap = false;
      if (!Array.isArray(list)) { list = []; }
      out.partners[id] = stages.map(function (_, i) { var n = list && list[i]; if (gap || !Number.isInteger(n) || n < 1 || n > 3) { gap = true; return 0; } return n; });
    }); return out;
  }
  function progressFor(p, id) {
    var list = p.partners[ids.indexOf(id) >= 0 ? id : "xavier"].slice(), cleared = list.filter(Boolean).length;
    return { partner: id, stars: list, cleared: cleared, totalStars: list.reduce(function (a, b) { return a + b; }, 0), unlocked: Math.min(stages.length, cleared + 1) };
  }
  function record(p, id, s) {
    var stage = s && stages[s.stage];
    if (!stage || !Number.isInteger(s.stage) || ids.indexOf(id) < 0 || s.partner !== id || !s.done || !Array.isArray(s.tiles) || s.tiles.length !== stage.size * stage.size || !solved(s) || !Number.isInteger(s.moves) || !Number.isInteger(s.par) || s.par !== create(s.stage, id).par || s.moves < s.par || !Number.isInteger(s.hints) || s.hints < 0 || s.stage >= progressFor(p, id).unlocked) { return false; }
    var first = !p.partners[id][s.stage]; p.partners[id][s.stage] = Math.max(p.partners[id][s.stage], stars(s)); return first;
  }
  function el(tag, cls, textKey, parent) { var n = document.createElement(tag); if (cls) { n.className = cls; } if (textKey) { n.setAttribute("data-i18n", textKey); n.textContent = App.t(textKey); } if (parent) { parent.appendChild(n); } return n; }
  function button(cls, textKey, parent, action) { var n = el("button", cls, textKey, parent); n.type = "button"; n.addEventListener("click", action); return n; }
  function mount(host, options) {
    options = options || {}; var p = read(App.storage.getItem(key)), partner = { id: "xavier", nameKey: "ldsPartnerXavier" }, state, selected = -1, focusIndex = 0, reference = false, settled = false, message = "ldmReady", tileButtons = [];
    var root = el("section", "ldm-game", null, host);
    function hidden() { return document.hidden || root.hidden || host.hidden || options.isHidden && options.isHidden(); }
    function act() { return !hidden(); }
    var header = el("div", "ldm-heading", null, root); el("span", "ldm-overline", "ldmTag", header); el("h4", "", "ldmTitle", header); el("p", "", "ldmIntro", header);
    var nav = el("div", "ldm-stages", null, root); nav.setAttribute("role", "group"); nav.setAttribute("aria-label", App.t("ldmStages"));
    var stageButtons = stages.map(function (stage) {
      var b = button("ldm-stage", null, nav, function () { if (act()) { selectStage(stage.id); } }); b.setAttribute("data-mosaic-stage", String(stage.id));
      var title = el("span", "", null, b); title.textContent = String(stage.id + 1).padStart(2, "0"); var rating = el("span", "", null, b); return { button: b, rating: rating };
    });
    var info = el("div", "ldm-info", null, root), artName = el("strong", "", null, info), meta = el("span", "", null, info);
    var hud = el("div", "ldm-hud", null, root), moves = el("span", "", null, hud), target = el("span", "", null, hud), best = el("span", "", null, hud);
    var board = el("div", "ldm-board", null, root); board.setAttribute("role", "group"); board.setAttribute("aria-label", App.t("ldmBoard"));
    var referenceBox = el("figure", "ldm-reference", null, root); referenceBox.hidden = true;
    var referenceImage = el("img", "", null, referenceBox); referenceImage.decoding = "async"; el("figcaption", "", "ldmReferenceHint", referenceBox);
    var controls = el("div", "ldm-controls", null, root);
    var rotateButton = button("lds-small-button", "ldmRotate", controls, function () { if (act() && rotate(state, selected)) { if (state.tiles[selected].turn === 0) { selected = -1; if (document.activeElement === rotateButton) { tileButtons[focusIndex].button.focus({ preventScroll: true }); } } finish(); } });
    var undoButton = button("lds-small-button", "ldmUndo", controls, function () { if (act() && undo(state)) { selected = -1; message = "ldmUndone"; if (!state.history.length && document.activeElement === undoButton) { tileButtons[focusIndex].button.focus({ preventScroll: true }); } render(); } });
    button("lds-small-button", "ldmReset", controls, function () { if (act()) { load(state.stage); } });
    var hintButton = button("lds-small-button", "ldmHint", controls, function () { if (act() && assist(state)) { selected = -1; message = "ldmAssisted"; if (state.done && document.activeElement === hintButton) { tileButtons[focusIndex].button.focus({ preventScroll: true }); } finish(true); } });
    var referenceButton = button("lds-small-button", "ldmReference", controls, function () { if (act()) { reference = !reference; render(); } });
    referenceButton.setAttribute("aria-pressed", "false");
    var nextButton = button("lds-small-button ldm-next", "ldmNext", controls, function () { if (act() && selectStage(state.stage + 1)) { tileButtons[focusIndex].button.focus({ preventScroll: true }); } });
    var original = button("lds-small-button ldm-original", "ldmOriginal", controls, function () { if (act() && options.onOriginal) { options.onOriginal(stages[state.stage].art); } });
    original.hidden = !options.onOriginal;
    var status = el("p", "ldm-status", null, root); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    el("p", "ldm-help", "ldmScoring", root); el("p", "ldm-help", "ldmKeyboard", root);
    var imageStatus = el("p", "ldm-help ldm-image-status", null, root); imageStatus.setAttribute("role", "status");
    referenceImage.addEventListener("error", function () { imageStatus.textContent = App.t("ldmImageError"); });
    function finish(assisted) {
      if (state.done && !settled) {
        settled = true; var fresh = record(p, partner.id, state); App.storage.setItem(key, JSON.stringify(p)); message = fresh ? "ldmFirstClear" : "ldmClear";
        if (fresh && options.onReward) { options.onReward("mosaic", "stage-" + (state.stage + 1)); }
        if (options.onMoment) { options.onMoment("Win"); }
      } else if (!assisted) { message = "ldmMoved"; }
      render();
    }
    function choose(index) {
      if (!act() || state.done) { return; }
      focusIndex = index;
      if (selected < 0) { selected = index; message = "ldmSelected"; render(); }
      else if (selected === index) { selected = -1; message = "ldmReady"; render(); }
      else { var from = selected; selected = -1; if (swap(state, from, index)) { finish(); } }
    }
    function buildBoard() {
      while (board.firstChild) { board.removeChild(board.firstChild); } tileButtons = [];
      var stage = stages[state.stage], art = App.ldsSceneArt(partner.id, stage.art);
      board.style.setProperty("--ldm-side", String(stage.size)); referenceImage.src = art.src; referenceImage.alt = App.t(partner.nameKey) + " · " + art.title;
      referenceImage.style.objectPosition = art.x * 100 + "% " + art.y * 100 + "%";
      imageStatus.textContent = "";
      state.tiles.forEach(function (_, index) {
        var b = button("ldm-tile", null, board, function () { choose(index); }); b.setAttribute("data-mosaic-tile", String(index));
        var fragment = el("span", "ldm-fragment", null, b), image = el("img", "", null, fragment); image.src = art.src; image.alt = ""; image.draggable = false; image.decoding = "async";
        image.style.width = stage.size * 100 + "%"; image.style.height = stage.size * 100 + "%"; image.style.objectPosition = art.x * 100 + "% " + art.y * 100 + "%";
        image.addEventListener("error", function () { imageStatus.textContent = App.t("ldmImageError"); });
        var indicator = el("span", "ldm-correct-mark", null, b); indicator.textContent = "✓"; indicator.setAttribute("aria-hidden", "true");
        b.addEventListener("focus", function () { focusIndex = index; });
        b.addEventListener("keydown", function (event) {
          if (event.key === "Escape" && selected >= 0 && act()) { event.preventDefault(); event.stopPropagation(); selected = -1; message = "ldmReady"; render(); return; }
          var directions = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }, d = directions[event.key];
          if (!d || !act()) { return; } event.preventDefault(); event.stopPropagation();
          var row = Math.max(0, Math.min(stage.size - 1, Math.floor(index / stage.size) + d[0])), col = Math.max(0, Math.min(stage.size - 1, index % stage.size + d[1]));
          focusIndex = row * stage.size + col; renderTiles(); tileButtons[focusIndex].button.focus({ preventScroll: true });
        }); tileButtons.push({ button: b, image: image, fragment: fragment, indicator: indicator });
      });
    }
    function renderTiles() {
      var side = stages[state.stage].size;
      tileButtons.forEach(function (entry, i) {
        var tile = state.tiles[i], correct = tile.id === i && tile.turn === 0;
        entry.image.style.left = -(tile.id % side) * 100 + "%"; entry.image.style.top = -Math.floor(tile.id / side) * 100 + "%";
        entry.fragment.style.transform = "rotate(" + tile.turn * 90 + "deg)";
        entry.button.setAttribute("data-piece", String(tile.id)); entry.button.setAttribute("data-turn", String(tile.turn));
        entry.button.setAttribute("aria-pressed", String(i === selected)); entry.button.setAttribute("aria-disabled", String(state.done));
        entry.button.setAttribute("aria-label", App.t("ldmTileLabel", { r: Math.floor(i / side) + 1, c: i % side + 1, tr: Math.floor(tile.id / side) + 1, tc: tile.id % side + 1, degrees: tile.turn * 90 }));
        entry.button.tabIndex = i === focusIndex ? 0 : -1; entry.button.classList.toggle("is-correct", correct); entry.indicator.hidden = !correct;
      });
    }
    function render() {
      var stage = stages[state.stage], info = progressFor(p, partner.id), art = App.ldsSceneArt(partner.id, stage.art);
      root.setAttribute("data-partner", partner.id); root.setAttribute("data-complete", String(state.done));
      artName.textContent = art.title; meta.textContent = stage.size + " × " + stage.size + " · " + App.t(stage.rotate ? "ldmWithRotation" : "ldmSwapOnly");
      moves.textContent = App.t("ldmMoves", { n: state.moves }); target.textContent = App.t("ldmPar", { n: state.par });
      best.textContent = App.t("ldmBest", { n: info.stars[state.stage] });
      stageButtons.forEach(function (entry, i) { entry.button.disabled = i >= info.unlocked; entry.button.setAttribute("aria-pressed", String(i === state.stage)); entry.button.setAttribute("aria-label", App.t(i < info.unlocked ? "ldmStageLabel" : "ldmStageLocked", { n: i + 1, s: info.stars[i] })); entry.rating.textContent = i >= info.unlocked ? "◇" : "★".repeat(info.stars[i]) + "☆".repeat(3 - info.stars[i]); });
      rotateButton.hidden = !stage.rotate; rotateButton.disabled = selected < 0 || state.done; undoButton.disabled = state.done || !state.history.length; hintButton.disabled = state.done;
      referenceBox.hidden = !reference; referenceButton.setAttribute("aria-pressed", String(reference)); nextButton.hidden = !state.done || state.stage === stages.length - 1;
      status.textContent = App.t(message, { n: state.moves, s: stars(state), correct: state.tiles.filter(function (piece, i) { return piece.id === i && !piece.turn; }).length, total: state.tiles.length });
      root.querySelectorAll("[data-i18n]").forEach(function (n) { n.textContent = App.t(n.getAttribute("data-i18n")); }); renderTiles();
    }
    function load(index) { state = create(index, partner.id); selected = -1; focusIndex = 0; settled = false; reference = false; message = "ldmReady"; buildBoard(); render(); }
    function selectStage(index) { if (!act() || !Number.isInteger(index) || index < 0 || index >= progressFor(p, partner.id).unlocked) { return false; } load(index); return true; }
    load(0);
    return { element: root, refresh: render, pause: function () { selected = -1; render(); }, getProgress: function () { return progressFor(p, partner.id); },
      setPartner: function (next) { if (next && ids.indexOf(next.id) >= 0) { partner = next; load(Math.min(progressFor(p, partner.id).cleared, stages.length - 1)); } },
      selectStage: selectStage, inspect: function () { return { state: JSON.parse(JSON.stringify(state)), progress: progressFor(p, partner.id) }; } };
  }
  function mountPassport(host, options) {
    var root = el("details", "ldx-passport", null, host), summary = el("summary", "", null, root);
    var cards = el("div", "ldx-passport-cards", null, root);
    var definitions = [["mosaic", "ldsDateMosaic", 9], ["bouquet", "ldsDateBouquet", 6], ["expedition", "ldsDateExpedition", 3]], entries = [];
    definitions.forEach(function (def) { var b = button("ldx-passport-card", null, cards, function () { options.go(def[0]); }); b.setAttribute("data-passport", def[0]); var title = el("strong", "", def[1], b), value = el("span", "", null, b); entries.push({ def: def, title: title, value: value }); });
    function refresh() {
      var state = options.getProgress(), completed = 0, total = 0;
      entries.forEach(function (entry) { var p = state[entry.def[0]] || {cleared:0,totalStars:0}; completed += p.cleared; total += entry.def[2]; entry.title.textContent = App.t(entry.def[1]); entry.value.textContent = App.t("ldxPassportRecord", { n:p.cleared, max:entry.def[2], stars:p.totalStars }); entry.value.parentNode.setAttribute("data-stars", String(p.totalStars)); entry.value.parentNode.setAttribute("data-cleared", String(p.cleared)); });
      summary.textContent = App.t("ldxPassportTitle", { n:completed, max:total });
    } return { element:root, refresh:refresh };
  }
  var copy = {
    ldsDateMosaic: ["▧ Memory mosaic", "▧ 心动拼图"], ldmTag: ["A MOMENT, PIECE BY PIECE", "一片一片，拼回心动"], ldmTitle: ["Memory mosaic", "心动拼图"],
    ldmIntro: ["Choose two fragments to swap them. Later memories also need clockwise turns. Bring the whole photograph back, one small choice at a time.", "选中两块碎片即可交换位置。后面的回忆还需要顺时针旋转。一点一点，拼回完整的照片。"],
    ldmStages: ["Choose a photograph puzzle", "选择照片拼图"], ldmBoard: ["Photo mosaic; select two pieces to swap", "照片拼图：选中两块碎片交换"],
    ldmReady: ["Select a fragment, then choose where to place it. The reference photograph is always available.", "先选一块碎片，再选它要去的位置。可以随时查看原图参考。"],
    ldmSelected: ["Fragment selected. Choose another to swap, or turn this fragment. Tap the selected fragment again to cancel.", "已选中碎片。选择另一块即可交换，也可旋转当前碎片。再次点击选中的碎片可取消。"],
    ldmMoved: ["{correct}/{total} fragments restored · {n} actions.", "已还原 {correct}/{total} 块 · 操作 {n} 次。"],
    ldmFirstClear: ["A memory restored · {s} stars in {n} actions. Your first-clear keepsake is saved.", "回忆已完整 · {n} 次操作，获得 {s} 星。首次通关纪念已收藏。"],
    ldmClear: ["Restored again · {s} stars in {n} actions. Your best result is kept; this keepsake is already collected.", "再次拼回回忆 · {n} 次操作，获得 {s} 星。最佳成绩已保留，这份纪念已经收藏。"],
    ldmUndo: ["↶ Undo", "↶ 撤回"], ldmReset: ["↻ Begin again", "↻ 重新开始"], ldmRotate: ["↻ Turn selected 90°", "↻ 选中碎片转 90°"], ldmHint: ["✧ Place one fragment", "✧ 帮放一块"],
    ldmReference: ["▣ Reference", "▣ 原图参考"], ldmReferenceHint: ["The original photograph. Looking is free; no stars are lost.", "完整照片参考。查看不扣星。"], ldmNext: ["Next memory →", "下一个回忆 →"], ldmOriginal: ["Open HD original ↗", "查看高清原图 ↗"],
    ldmUndone: ["Last action undone. It still counts toward the action total.", "已撤回上一步；这次操作仍计入总数。"], ldmAssisted: ["One fragment moved toward home. This attempt can earn one star; restart to try without assistance.", "一块碎片向正确位置靠近了。本次通关可得一星；重开可尝试不用帮助。"],
    ldmMoves: ["{n} actions", "操作 {n} 次"], ldmPar: ["Perfect target: {n}", "三星目标：{n} 次"], ldmBest: ["Best: {n} stars", "最佳：{n} 星"],
    ldmWithRotation: ["Swap + rotate", "交换与旋转"], ldmSwapOnly: ["Swap fragments", "交换碎片"], ldmStageLabel: ["Memory {n}, best {s} stars", "回忆 {n}，最佳 {s} 星"], ldmStageLocked: ["Memory {n}; restore the previous photograph to unlock", "回忆 {n}：拼回上一张照片后解锁"],
    ldmTileLabel: ["Row {r}, column {c}. Fragment belongs at row {tr}, column {tc}; rotated {degrees} degrees clockwise.", "第 {r} 行第 {c} 列。碎片应位于第 {tr} 行第 {tc} 列，已顺时针旋转 {degrees} 度。"],
    ldmScoring: ["★★★ Reach the exact minimum without assistance. ★★ A few extra actions. ★ Every other clear. Reference is free; assistance earns one star. Undo keeps the action count, and restart gives a fresh attempt.", "★★★ 不用帮助，在最少操作次数内完成。★★ 少量额外操作。★ 其他通关。参考原图不扣星，帮放碎片则为一星。撤回仍计数，重开可重新挑战。"],
    ldmKeyboard: ["Keyboard: Tab to the board, arrows to choose a fragment, Enter or Space to select and swap. Use the Turn button for rotated fragments.", "键盘：Tab 进入拼图，方向键移动，Enter 或空格选中与交换。旋转碎片请用“转 90°”按钮。"],
    ldmImageError: ["The photograph could not load. Try another memory or check the bundled image files.", "照片暂时无法加载，可切换回忆或检查本地图片文件。"],
    ldxPassportTitle: ["Adventure passport · {n}/{max} keepsakes", "心动游记 · 纪念 {n}/{max}"], ldxPassportRecord: ["{n}/{max} completed · {stars} stars", "已完成 {n}/{max} · {stars} 星"],
    ldxReady: ["Your next keepsake is waiting. Choose a challenge and take your time.", "下一份纪念正在等你。选一个挑战，慢慢游玩。"]
  };
  var pack = { en: {}, zh: {} }; Object.keys(copy).forEach(function (k) { pack.en[k] = copy[k][0]; pack.zh[k] = copy[k][1]; }); App.addStrings(pack);
  App.ldsMosaicRules = { stages: stages, create: create, minimum: minimum, swap: swap, rotate: rotate, assist: assist, undo: undo, stars: stars, solved: solved, read: read, progress: progressFor, record: record };
  App.mountLdsMosaic = mount; App.mountLdsPassport = mountPassport;
})(window.CapitalConvert = window.CapitalConvert || {});
