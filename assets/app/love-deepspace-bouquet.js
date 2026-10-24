/* Original, untimed flower drafting and arrangement game. */
(function (App) {
  "use strict";
  var ids = ["xavier", "zayne", "rafayel", "sylus", "caleb"];
  var colors = ["ivory", "rose", "sky", "violet"], petals = [3, 5, 8];
  var preferences = {
    xavier: { color: "ivory", petals: 3, request: "borderPetals", targets: [2, 3, 3, 4, 5, 6] },
    zayne: { color: "sky", petals: 5, request: "squares", targets: [1, 2, 3, 4, 5, 6] },
    rafayel: { color: "rose", petals: 8, request: "spectrum", targets: [1, 1, 1, 1, 2, 2] },
    sylus: { color: "violet", petals: 5, request: "centerColor", targets: [1, 2, 2, 3, 3, 4] },
    caleb: { color: "ivory", petals: 8, request: "rhythm", targets: [2, 3, 3, 4, 5, 6] }
  };
  var plans = [
    { bands: [44, 52, 60], color: 3, petals: 2, spectrum: 5, center: 0 },
    { bands: [50, 58, 66], color: 3, petals: 2, spectrum: 5, center: 1 },
    { bands: [56, 64, 72], color: 3, petals: 3, spectrum: 5, center: 0 },
    { bands: [60, 68, 76], color: 3, petals: 2, spectrum: 8, center: 0 },
    { bands: [64, 72, 80], color: 4, petals: 2, spectrum: 5, center: 0 },
    { bands: [68, 74, 80], color: 3, petals: 2, spectrum: 5, center: 0 }
  ];
  var bag = [[1, 0], [2, 0], [1, 0], [2, 0], [3, 1], [0, 1], [0, 2], [3, 0], [1, 0], [0, 1], [0, 2], [2, 0]];
  var storageKey = "love-deepspace-bouquet-v1";
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function commission(partner, index) {
    partner = ids.indexOf(partner) >= 0 ? partner : "xavier";
    index = Number.isInteger(index) && index >= 0 && index < plans.length ? index : 0;
    var pref = preferences[partner], colorOffset = colors.indexOf(pref.color), petalOffset = petals.indexOf(pref.petals), plan = plans[index];
    var deck = bag.map(function (pair, n) { return { id: n, color: colors[(pair[0] + colorOffset) % colors.length], petals: petals[(pair[1] + petalOffset) % petals.length] }; });
    var seed = ((index + 1) * 2654435761 + ids.indexOf(partner) * 101) >>> 0;
    for (var i = deck.length - 1; i > 0; i--) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; var j = (seed >>> 0) % (i + 1), temp = deck[i]; deck[i] = deck[j]; deck[j] = temp; }
    return { id: index, partner: partner, favorite: pref.color, preferredPetals: pref.petals, deck: deck, bands: plan.bands.slice(),
      weights: { color: plan.color, petals: plan.petals, spectrum: plan.spectrum, center: plan.center },
      requests: [{ kind: "favoriteEdges", target: [1, 1, 2, 2, 3, 4][index], bonus: 10 }, { kind: pref.request, target: pref.targets[index], bonus: 12 }] };
  }
  function evaluate(board, order) {
    var metrics = { flowers: 0, harmony: 0, favoriteEdges: 0, rhythm: 0, spectrum: 0, squares: 0, center: 0, centerColor: 0, borderPetals: 0 };
    board.forEach(function (flower, index) {
      if (!flower) { return; }
      metrics.flowers++;
      var row = Math.floor(index / 4), col = index % 4, center = (row === 1 || row === 2) && (col === 1 || col === 2);
      if (center) { metrics.center++; if (flower.color === order.favorite) { metrics.centerColor++; } }
      if ((row === 0 || row === 3 || col === 0 || col === 3) && flower.petals === order.preferredPetals) { metrics.borderPetals++; }
      [col < 3 ? index + 1 : -1, row < 3 ? index + 4 : -1].forEach(function (otherIndex) {
        var other = otherIndex >= 0 && board[otherIndex];
        if (!other) { return; }
        if (flower.color === other.color) { metrics.harmony++; if (flower.color === order.favorite) { metrics.favoriteEdges++; } }
        else if (flower.petals === other.petals) { metrics.rhythm++; }
      });
      if (row < 3 && col < 3) {
        var square = [flower, board[index + 1], board[index + 4], board[index + 5]];
        if (square.every(Boolean)) { metrics.squares++; if (new Set(square.map(function (f) { return f.color; })).size === 4) { metrics.spectrum++; } }
      }
    });
    var parts = { flowers: metrics.flowers * 2, harmony: metrics.harmony * order.weights.color, rhythm: metrics.rhythm * order.weights.petals, spectrum: metrics.spectrum * order.weights.spectrum, center: metrics.center * order.weights.center, requests: 0 };
    var requests = order.requests.map(function (request) {
      var current = metrics[request.kind], met = current >= request.target;
      if (met) { parts.requests += request.bonus; }
      return { kind: request.kind, target: request.target, bonus: request.bonus, current: current, met: met };
    });
    return { score: Object.keys(parts).reduce(function (sum, key) { return sum + parts[key]; }, 0), parts: parts, metrics: metrics, requests: requests, contractsMet: requests.every(function (r) { return r.met; }) };
  }
  function create(partner, index) {
    var order = commission(partner, index);
    return { partner: order.partner, commission: order.id, board: Array(16).fill(null), hand: order.deck.slice(0, 3), cursor: 3, placements: 0, selectedHand: 0, selectedCell: 0, done: false, history: [] };
  }
  function validPlacement(state, handIndex, cell) {
    return !state.done && Number.isInteger(handIndex) && handIndex >= 0 && handIndex < state.hand.length && Number.isInteger(cell) && cell >= 0 && cell < 16 && !state.board[cell];
  }
  function preview(state, handIndex, cell) {
    if (!validPlacement(state, handIndex, cell)) { return null; }
    var order = commission(state.partner, state.commission), before = evaluate(state.board, order), board = state.board.slice(); board[cell] = state.hand[handIndex];
    var after = evaluate(board, order);
    return { delta: after.score - before.score, score: after.score, requests: after.requests, metrics: after.metrics };
  }
  function place(state, handIndex, cell) {
    if (!validPlacement(state, handIndex, cell)) { return false; }
    state.history.push({ board: state.board.slice(), hand: state.hand.slice(), cursor: state.cursor, placements: state.placements, selectedHand: handIndex, selectedCell: cell });
    state.board[cell] = state.hand.splice(handIndex, 1)[0];
    var order = commission(state.partner, state.commission);
    if (state.cursor < order.deck.length) { state.hand.push(order.deck[state.cursor++]); }
    state.placements++; state.done = state.placements === 12;
    state.selectedHand = Math.min(handIndex, Math.max(0, state.hand.length - 1));
    state.selectedCell = cell;
    return true;
  }
  function undo(state) {
    if (!state.history.length) { return false; }
    var previous = state.history.pop();
    Object.keys(previous).forEach(function (key) { state[key] = previous[key]; }); state.done = false;
    return true;
  }
  function starsFor(state) {
    if (!state.done) { return 0; }
    var order = commission(state.partner, state.commission), result = evaluate(state.board, order);
    if (result.metrics.flowers !== 12 || !result.contractsMet || result.score < order.bands[0]) { return 0; }
    return result.score >= order.bands[2] ? 3 : result.score >= order.bands[1] ? 2 : 1;
  }
  function readProgress(raw) {
    var saved, out = { version: 1, partners: {} };
    try { saved = JSON.parse(raw || "null"); } catch (_) {}
    ids.forEach(function (id) {
      var values = saved && saved.version === 1 && saved.partners && saved.partners[id], blocked = false;
      out.partners[id] = plans.map(function (_, i) {
        var n = Array.isArray(values) ? values[i] : 0;
        n = !blocked && Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0;
        if (!n) { blocked = true; } return n;
      });
    }); return out;
  }
  function progressFor(progress, partner) {
    var values = progress.partners[partner] || progress.partners.xavier, cleared = values.filter(function (n) { return n > 0; }).length;
    return { partner: partner, stars: values.slice(), cleared: cleared, totalStars: values.reduce(function (sum, n) { return sum + n; }, 0), unlocked: Math.min(plans.length, cleared + 1) };
  }
  function record(progress, state) {
    if (!state || ids.indexOf(state.partner) < 0 || !Number.isInteger(state.commission) || state.commission < 0 || state.commission >= plans.length || state.commission >= progressFor(progress, state.partner).unlocked || !Array.isArray(state.board) || state.board.length !== 16 || state.placements !== 12 || !state.done) { return false; }
    var order = commission(state.partner, state.commission), seen = {}, valid = state.board.every(function (flower) {
      if (!flower) { return true; }
      var original = order.deck.find(function (card) { return card.id === flower.id; });
      if (!original || seen[flower.id] || flower.color !== original.color || flower.petals !== original.petals) { return false; }
      seen[flower.id] = true; return true;
    });
    var stars = valid && Object.keys(seen).length === 12 ? starsFor(state) : 0;
    if (!stars) { return false; }
    var first = progress.partners[state.partner][state.commission] === 0;
    progress.partners[state.partner][state.commission] = Math.max(progress.partners[state.partner][state.commission], stars);
    return first;
  }
  function mount(host, options) {
    options = options || {}; var raw;
    try { raw = App.storage.getItem(storageKey); } catch (_) {}
    var progress = readProgress(raw), partner = { id: "xavier", nameKey: "ldsPartnerXavier" }, state = create("xavier", 0), paused = false;
    var message = "ldbReady", messageVars, aimed = false;
    function el(tag, cls, key, parent) { var n = document.createElement(tag); if (cls) { n.className = cls; } if (key) { n.setAttribute("data-i18n", key); n.textContent = App.t(key); } if (parent) { parent.appendChild(n); } return n; }
    function btn(cls, key, parent, handler) { var b = el("button", cls, key, parent); b.type = "button"; b.addEventListener("click", handler); return b; }
    function isHidden() { return document.hidden || host.hidden || root.hidden || (options.isHidden && options.isHidden()); }
    function canAct() { return !paused && !isHidden(); }
    function save() { try { App.storage.setItem(storageKey, JSON.stringify(progress)); } catch (_) {} }
    function flowerName(flower) { return App.t("ldbFlowerName", { color: App.t("ldbColor" + flower.color), petals: flower.petals }); }
    function drawFlower(parent, flower, mini) {
      var icon = el("span", "ldb-flower" + (mini ? " ldb-flower-mini" : ""), null, parent); icon.setAttribute("data-color", flower.color); icon.setAttribute("data-petals", String(flower.petals)); icon.setAttribute("aria-hidden", "true");
      for (var p = 0; p < flower.petals; p++) { var petal = el("i", "ldb-petal", null, icon); petal.style.setProperty("--ldb-angle", p * 360 / flower.petals + "deg"); }
      el("i", "ldb-flower-center", null, icon); return icon;
    }
    function requestText(request, order) { return App.t("ldbRequest" + request.kind, { n: request.target, color: App.t("ldbColor" + order.favorite), petals: order.preferredPetals }); }
    var root = el("section", "ldb-game", null, host); root.setAttribute("data-partner", partner.id);
    var heading = el("div", "ldb-heading", null, root); el("span", "ldb-eyebrow", "ldbEyebrow", heading); el("h4", "", "ldbTitle", heading); el("p", "", "ldbIntro", heading);
    var nav = el("div", "ldb-commissions", null, root); nav.setAttribute("role", "group"); nav.setAttribute("data-i18n-aria", "ldbCommissions");
    var commissionButtons = plans.map(function (_, i) { var b = btn("ldb-commission", null, nav, function () { if (canAct()) { selectCommission(i); } }); b.setAttribute("data-bouquet-commission", String(i)); var label = el("span", "", null, b), stars = el("span", "ldb-commission-stars", null, b); return { button: b, label: label, stars: stars }; });
    var brief = el("div", "ldb-brief", null, root), orderTitle = el("strong", "", null, brief), orderRule = el("p", "", null, brief);
    var contracts = el("div", "ldb-contracts", null, root), contractNodes = [0, 1].map(function () { var row = el("div", "ldb-contract", null, contracts), mark = el("span", "ldb-contract-mark", null, row), copy = el("span", "", null, row), count = el("strong", "", null, row); return { row: row, mark: mark, copy: copy, count: count }; });
    var atelier = el("div", "ldb-atelier", null, root), hud = el("div", "ldb-hud", null, atelier), score = el("strong", "", null, hud), turns = el("span", "", null, hud);
    var bands = el("div", "ldb-bands", null, atelier), tierNodes = [1, 2, 3].map(function () { return el("span", "", null, bands); });
    var board = el("div", "ldb-board", null, atelier); board.setAttribute("role", "group"); board.setAttribute("data-i18n-aria", "ldbBoard");
    var cells = [];
    for (var i = 0; i < 16; i++) { (function (index) {
      var b = btn("ldb-cell", null, board, function () { if (canAct() && !state.done && !state.board[index]) { state.selectedCell = index; aimed = true; renderBoard(); renderPreview(); } });
      b.setAttribute("data-bouquet-cell", String(index));
      b.addEventListener("focus", function () { state.selectedCell = index; if (!state.board[index]) { aimed = true; } renderBoard(); renderPreview(); });
      b.addEventListener("keydown", function (event) {
        if (!canAct()) { if (event.key === " " || event.key === "Enter") { event.preventDefault(); } return; }
        var r = Math.floor(index / 4), c = index % 4, next = event.key === "ArrowUp" && r > 0 ? index - 4 : event.key === "ArrowDown" && r < 3 ? index + 4 : event.key === "ArrowLeft" && c > 0 ? index - 1 : event.key === "ArrowRight" && c < 3 ? index + 1 : -1;
        if (event.key.indexOf("Arrow") === 0) { event.preventDefault(); if (next >= 0) { state.selectedCell = next; aimed = true; cells[next].focus({ preventScroll: true }); } }
        if ((event.key === "Enter" || event.key === " ") && !event.repeat) { event.preventDefault(); plant(); }
      }); cells.push(b);
    })(i); }
    var previewLine = el("p", "ldb-preview", null, atelier); previewLine.setAttribute("role", "status"); previewLine.setAttribute("aria-live", "polite");
    var draft = el("div", "ldb-draft", null, root); el("span", "ldb-draft-label", "ldbDraft", draft);
    var hand = el("div", "ldb-hand", null, draft), handButtons = [0, 1, 2].map(function (index) { var b = btn("ldb-hand-card", null, hand, function () { if (canAct() && !state.done && state.hand[index]) { state.selectedHand = index; render(); } }); b.setAttribute("data-bouquet-hand", String(index)); return b; });
    var controls = el("div", "ldb-controls", null, root);
    var plantButton = btn("lds-small-button ldb-plant", "ldbPlant", controls, plant);
    var undoButton = btn("lds-small-button", "ldbUndo", controls, function () { if (canAct() && undo(state)) { aimed = true; message = "ldbUndone"; messageVars = undefined; render(); } });
    btn("lds-small-button", "ldbReset", controls, function () { if (canAct()) { state = create(partner.id, state.commission); aimed = false; message = "ldbResetDone"; messageVars = undefined; render(); } });
    var nextButton = btn("lds-small-button", "ldbNext", controls, function () { if (canAct()) { selectCommission(state.commission + 1); } });
    atelier.insertBefore(draft, board);
    atelier.appendChild(controls);
    var status = el("p", "ldb-status", null, root); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    var voice = el("p", "ldb-voice", null, root);
    var sequence = el("details", "ldb-sequence", null, root); el("summary", "", "ldbSequence", sequence); var queue = el("div", "ldb-queue", null, sequence);
    var rules = el("details", "ldb-rules", null, root); el("summary", "", "ldbRules", rules); var rulesCopy = el("p", "", null, rules); el("p", "", "ldbKeyboard", rules);
    function renderBoard() {
      cells.forEach(function (cell, index) {
        while (cell.firstChild) { cell.removeChild(cell.firstChild); }
        var flower = state.board[index], selected = index === state.selectedCell;
        cell.classList.toggle("is-selected", selected && aimed); cell.classList.toggle("is-filled", !!flower); cell.tabIndex = selected ? 0 : -1;
        cell.setAttribute("aria-disabled", String(!!flower || state.done || !canAct()));
        if (flower) { drawFlower(cell, flower); }
        else if (selected && aimed && state.hand[state.selectedHand] && !state.done) { drawFlower(cell, state.hand[state.selectedHand]); cell.classList.add("is-ghost"); }
        else { cell.classList.remove("is-ghost"); el("span", "ldb-empty-dot", null, cell).setAttribute("aria-hidden", "true"); }
        if (flower) { cell.classList.remove("is-ghost"); }
        if (flower) { var code = el("span", "ldb-cell-code", null, cell); code.textContent = App.t("ldbMark" + flower.color) + " · " + flower.petals; code.setAttribute("aria-hidden", "true"); }
        var candidate = !flower && preview(state, state.selectedHand, index);
        cell.setAttribute("aria-label", App.t(flower ? "ldbCellFilled" : "ldbCellEmpty", { r: Math.floor(index / 4) + 1, c: index % 4 + 1, flower: flower ? flowerName(flower) : "", n: candidate ? candidate.delta : 0 }));
      });
    }
    function renderPreview() {
      var candidate = aimed && preview(state, state.selectedHand, state.selectedCell);
      previewLine.textContent = App.t(state.done ? "ldbPreviewDone" : candidate ? "ldbPreview" : "ldbChooseSpace", candidate ? { n: candidate.delta, score: candidate.score, r: Math.floor(state.selectedCell / 4) + 1, c: state.selectedCell % 4 + 1 } : undefined);
      plantButton.disabled = !canAct() || !candidate;
    }
    function render() {
      var order = commission(partner.id, state.commission), result = evaluate(state.board, order), info = getProgress(), stars = starsFor(state);
      root.setAttribute("data-partner", partner.id); root.setAttribute("data-complete", String(state.done)); root.setAttribute("data-clear", String(stars > 0));
      nav.setAttribute("aria-label", App.t("ldbCommissions")); board.setAttribute("aria-label", App.t("ldbBoard"));
      commissionButtons.forEach(function (entry, index) { entry.button.disabled = index >= info.unlocked || !canAct(); entry.button.setAttribute("aria-pressed", String(index === state.commission)); entry.button.setAttribute("aria-label", App.t(index < info.unlocked ? "ldbCommissionOpen" : "ldbCommissionLocked", { n: index + 1, title: App.t("ldbCommissionName" + index), stars: info.stars[index] })); entry.label.textContent = String(index + 1).padStart(2, "0"); entry.stars.textContent = index < info.unlocked ? "★".repeat(info.stars[index]) + "☆".repeat(3 - info.stars[index]) : "◇"; });
      orderTitle.textContent = App.t("ldbCommissionName" + state.commission); orderRule.textContent = App.t("ldbCommissionBrief" + state.commission);
      contractNodes.forEach(function (entry, index) { var request = result.requests[index]; entry.row.setAttribute("data-met", String(request.met)); entry.mark.textContent = request.met ? "✓" : "◇"; entry.copy.textContent = requestText(request, order) + " · +" + request.bonus; entry.count.textContent = request.current + "/" + request.target; entry.row.setAttribute("aria-label", entry.copy.textContent + " · " + entry.count.textContent + " · " + App.t(request.met ? "ldbMet" : "ldbPending")); });
      score.textContent = App.t("ldbScore", { n: result.score }); turns.textContent = App.t("ldbPlaced", { n: state.placements });
      tierNodes.forEach(function (node, index) { node.textContent = "★".repeat(index + 1) + " " + order.bands[index]; node.setAttribute("data-reached", String(result.score >= order.bands[index])); });
      handButtons.forEach(function (button, index) { while (button.firstChild) { button.removeChild(button.firstChild); } var flower = state.hand[index]; button.hidden = !flower; button.disabled = !canAct() || state.done || !flower; button.setAttribute("aria-pressed", String(index === state.selectedHand)); if (flower) { drawFlower(button, flower); el("span", "ldb-hand-name", null, button).textContent = App.t("ldbColor" + flower.color); el("span", "ldb-hand-petals", null, button).textContent = App.t("ldbPetals", { n: flower.petals }); button.setAttribute("aria-label", flowerName(flower)); } });
      undoButton.disabled = !canAct() || !state.history.length;
      nextButton.hidden = !stars || state.commission === plans.length - 1; nextButton.disabled = !canAct();
      status.textContent = App.t(paused ? "ldbPaused" : message, messageVars);
      voice.textContent = "“" + App.t("ldbVoice" + partner.id.charAt(0).toUpperCase() + partner.id.slice(1) + (stars ? "Done" : "Begin")) + "”";
      rulesCopy.textContent = App.t("ldbScoring", { color: order.weights.color, petals: order.weights.petals, spectrum: order.weights.spectrum, center: order.weights.center });
      while (queue.firstChild) { queue.removeChild(queue.firstChild); }
      order.deck.slice(state.cursor).forEach(function (flower) { var card = el("span", "ldb-queue-card", null, queue); drawFlower(card, flower, true); card.setAttribute("role", "img"); card.setAttribute("aria-label", flowerName(flower)); });
      if (state.cursor === 12) { el("p", "", "ldbQueueEmpty", queue); }
      renderBoard(); renderPreview();
      root.querySelectorAll("[data-i18n]").forEach(function (node) { node.textContent = App.t(node.getAttribute("data-i18n")); });
    }
    function plant() {
      if (!canAct() || !aimed) { return; }
      var candidate = preview(state, state.selectedHand, state.selectedCell);
      if (!candidate || !place(state, state.selectedHand, state.selectedCell)) { return; }
      /* Reward handlers may refresh the host synchronously. Move native focus
       * before either that refresh or our own render disables confirmation. */
      if (document.activeElement === plantButton || document.activeElement && hand.contains(document.activeElement)) { cells[state.selectedCell].focus({ preventScroll: true }); }
      message = "ldbPlanted"; messageVars = { n: candidate.delta, score: candidate.score }; aimed = false;
      if (state.done) {
        var stars = starsFor(state), fresh = record(progress, state);
        if (stars) { save(); message = fresh ? "ldbClearFirst" : "ldbClearAgain"; messageVars = { n: stars, score: candidate.score }; }
        else { var result = evaluate(state.board, commission(partner.id, state.commission)); message = result.contractsMet ? "ldbScoreMiss" : "ldbRequestMiss"; messageVars = { score: result.score, target: commission(partner.id, state.commission).bands[0] }; }
        if (fresh && options.onReward) { options.onReward("bouquet", "commission-" + (state.commission + 1)); }
        if (options.onMoment) { options.onMoment(stars ? "Win" : "Miss"); }
      }
      render();
    }
    function getProgress() { return progressFor(progress, partner.id); }
    function selectCommission(index) {
      if (!Number.isInteger(index) || index < 0 || index >= getProgress().unlocked) { return false; }
      state = create(partner.id, index); aimed = false; message = "ldbReady"; messageVars = undefined; render(); return true;
    }
    function pause() { paused = true; render(); }
    function refresh() { if (!isHidden()) { paused = false; } render(); }
    render();
    return { element: root, pause: pause, refresh: refresh, getProgress: getProgress, selectCommission: selectCommission,
      setPartner: function (next) { if (!next || ids.indexOf(next.id) < 0) { return; } partner = next; paused = false; selectCommission(Math.min(getProgress().cleared, plans.length - 1)); },
      inspect: function () { return { state: clone(state), commission: commission(partner.id, state.commission), evaluation: evaluate(state.board, commission(partner.id, state.commission)), progress: getProgress(), paused: paused, aimed: aimed }; }
    };
  }
  var copy = {
    ldsDateBouquet: ["❀ Bouquet atelier", "❀ 花语工坊"], ldbEyebrow: ["SOMETHING MADE BY YOUR HANDS", "把心意，亲手编成一束花"], ldbTitle: ["The bouquet atelier", "花语工坊"],
    ldbIntro: ["Twelve flowers. A little space for your own ideas. Draft a bloom, choose its place, then plant when the preview feels right.", "十二朵花，留一点空白给自己的想法。选一朵花、选一个位置，看看预估得分，再将心意种下。"],
    ldbCommissions: ["Bouquet commissions", "花束委托"], ldbBoard: ["Four by four bouquet arrangement. Arrows choose a space; Enter plants the selected flower.", "四行四列花束。方向键选择位置，Enter 种下已选花朵。"],
    ldbCommissionName0: ["A first hello", "初见的花束"], ldbCommissionName1: ["The window seat", "窗边晨光"], ldbCommissionName2: ["After the rain", "雨后回音"], ldbCommissionName3: ["Four seasons", "四季同框"], ldbCommissionName4: ["An evening invitation", "暮色庆典"], ldbCommissionName5: ["A promise in bloom", "花间约定"],
    ldbCommissionBrief0: ["Begin with colour and shape. Meet both requests, then reach the first star's score.", "从颜色与花形开始。满足两项心愿，再达到一星分数即可完成委托。"],
    ldbCommissionBrief1: ["Let the light in. Each flower in the four centre spaces earns one extra point.", "让晨光落进花间。四个中央位置，每朵花额外加 1 分。"],
    ldbCommissionBrief2: ["A gentle rhythm. Adjacent flowers with different colours and equal petals now earn 3 points.", "雨声轻轻相和。相邻、异色且花瓣数相同的花朵，现在每对加 3 分。"],
    ldbCommissionBrief3: ["Gather the seasons. A full 2 × 2 square of four colours now earns 8 points.", "把四季收进掌心。由四种颜色组成的完整 2 × 2 方块，现在每块加 8 分。"],
    ldbCommissionBrief4: ["Choose a bolder palette. Every adjacent pair of the same colour now earns 4 points.", "让色彩更鲜明。每对相邻同色花朵，现在加 4 分。"],
    ldbCommissionBrief5: ["One last arrangement. The original rules return, with your most exacting requests yet.", "最后一束花。回到最初的计分规则，完成彼此更认真的心愿。"],
    ldbRequestfavoriteEdges: ["Connect {n} pairs of {color} flowers", "连成 {n} 对相邻的{color}花朵"],
    ldbRequestborderPetals: ["Place {n} flowers with {petals} petals on the outer border", "在最外圈摆放 {n} 朵 {petals} 瓣花"],
    ldbRequestsquares: ["Fill {n} complete 2 × 2 squares", "摆满 {n} 个完整的 2 × 2 方块"],
    ldbRequestspectrum: ["Make {n} four-colour 2 × 2 squares", "组成 {n} 个四色 2 × 2 方块"],
    ldbRequestcenterColor: ["Place {n} {color} flowers in the four centre spaces", "在四个中央位置摆放 {n} 朵{color}花"],
    ldbRequestrhythm: ["Connect {n} pairs with different colours and equal petals", "连成 {n} 对异色、相同花瓣数的花朵"],
    ldbScore: ["{n} points", "{n} 分"], ldbPlaced: ["{n} / 12 planted", "已种下 {n} / 12 朵"], ldbMet: ["Request fulfilled", "心愿已满足"], ldbPending: ["Request in progress", "心愿进行中"],
    ldbDraft: ["CHOOSE A BLOOM", "挑选一朵花"], ldbColorivory: ["Ivory", "月白"], ldbColorrose: ["Rose", "蔷薇粉"], ldbColorsky: ["Sky", "晴空蓝"], ldbColorviolet: ["Violet", "鸢尾紫"], ldbPetals: ["{n} petals", "{n} 瓣"], ldbFlowerName: ["{color} flower, {petals} petals", "{color}花，{petals} 瓣"],
    ldbMarkivory: ["I", "白"], ldbMarkrose: ["R", "粉"], ldbMarksky: ["S", "蓝"], ldbMarkviolet: ["V", "紫"],
    ldbPlant: ["Plant flower", "种下这朵花"], ldbUndo: ["↶ Undo", "↶ 撤回"], ldbReset: ["↻ Begin again", "↻ 重新开始"], ldbNext: ["Next commission →", "下一份委托 →"],
    ldbReady: ["Choose a bloom and an empty space. Preview first; Plant flower commits the placement.", "选一朵花，再选一个空位。先看预估得分，点击「种下这朵花」确认摆放。"],
    ldbChooseSpace: ["Choose an empty space to preview your next flower.", "选择一个空位，预览下一朵花的得分。"],
    ldbPreview: ["Row {r}, column {c} · +{n} points → {score} total", "第 {r} 行第 {c} 列 · +{n} 分 → 共 {score} 分"],
    ldbPreviewDone: ["Your arrangement is complete. Undo can refine it without losing saved stars.", "花束已完成。可以撤回继续调整，已有的星数会保留。"],
    ldbPlanted: ["A bloom finds its place · +{n} points · {score} total.", "一朵心意，找到位置 · +{n} 分 · 共 {score} 分。"],
    ldbUndone: ["The last flower and draft hand are restored. Take another look.", "已还原上一朵花和手牌。再想一个喜欢的位置吧。"],
    ldbResetDone: ["A fresh ribbon, the same flowers. Your best commission stars are kept.", "换一条新缎带，花朵顺序不变。已获得的最佳星数会保留。"],
    ldbClearFirst: ["{score} points · {n} stars. A bouquet memory is yours. The next commission is open.", "{score} 分 · {n} 星。花束纪念已收藏，新的委托为你展开。"],
    ldbClearAgain: ["{score} points · {n} stars. Your best result is saved; this bouquet memory is already collected.", "{score} 分 · {n} 星。最佳成绩已保留，这份花束纪念已经收藏。"],
    ldbRequestMiss: ["{score} points. A request still needs care. Undo to adjust the arrangement, or begin again.", "获得 {score} 分。还有心愿未完成。撤回调整花束，或重新开始吧。"],
    ldbScoreMiss: ["Both requests are met. You have {score} points; reach {target} to clear. Undo can improve the arrangement.", "两项心愿已满足。当前 {score} 分，达到 {target} 分即可完成。撤回一步，继续调整吧。"],
    ldbPaused: ["The atelier is resting. Return to continue your arrangement.", "花坊暂时歇息。回来后继续编织这束花。"],
    ldbCellFilled: ["Row {r}, column {c}: {flower}; occupied", "第 {r} 行第 {c} 列：{flower}；已有花朵"], ldbCellEmpty: ["Row {r}, column {c}: empty; selected flower adds {n} points", "第 {r} 行第 {c} 列：空位；已选花朵可加 {n} 分"],
    ldbCommissionOpen: ["Commission {n}, {title}; best {stars} stars", "委托 {n}，{title}；最佳 {stars} 星"], ldbCommissionLocked: ["Commission {n}, {title}; finish the previous commission to unlock", "委托 {n}，{title}；完成上一份后解锁"],
    ldbSequence: ["Look along the ribbon · upcoming flowers", "展开缎带 · 看看后续花朵"], ldbQueueEmpty: ["Every remaining bloom is in your hand.", "剩下的花朵都已在手中。"], ldbRules: ["The language of flowers · scoring & controls", "花语手册 · 计分与操作"],
    ldbScoring: ["Each flower: 2 points. Each touching same-colour pair: +{color}. Different colours with equal petals: +{petals} per touching pair. Every full 2 × 2 square of four colours: +{spectrum}. Centre spaces: +{center} per flower. Only horizontal and vertical neighbours touch. Both requests add their shown bonuses and are required to clear. Stars use the three score targets; undo is free. Twelve flowers, four spaces left for air.", "每朵花 2 分。相邻同色花每对 +{color} 分；异色且花瓣数相同，每对 +{petals} 分；每个完整的四色 2 × 2 方块 +{spectrum} 分；中央位置每朵额外 +{center} 分。只计算上下左右相邻。两项心愿会分别加上标注分数，且都需满足才能完成委托。星数依据三档目标分数，撤回不扣分。十二朵花，留下四格呼吸的空间。"],
    ldbKeyboard: ["Keyboard: Tab to a draft bloom, Enter to select it. Tab to the board, arrows to preview a space, Enter or Space to plant. There is no clock and the upcoming flowers never change by chance.", "键盘：Tab 到花朵，Enter 选中；Tab 进入花盘，方向键预览位置，Enter 或空格种下。没有倒计时，后续花朵顺序固定。"],
    ldbVoiceXavierBegin: ["Leave a little room for the light. I'll hold the ribbon for you.", "给光留一点位置。我来替你拿着缎带。"], ldbVoiceXavierDone: ["Can we keep these by the window? I want to see them when I wake up.", "把它们放在窗边吧？醒来的时候，我想看到。"],
    ldbVoiceZayneBegin: ["A little order can make room for something beautiful. Shall we begin?", "安排得当，也能留出美好的余地。开始吧？"], ldbVoiceZayneDone: ["A thoughtful arrangement. I'll find a vase worthy of your work.", "很用心的花束。我会找一只配得上它的花瓶。"],
    ldbVoiceRafayelBegin: ["Colour first, rules second—although I do have one small request.", "先看颜色，再看规则——不过，我确实有一个小小的心愿。"], ldbVoiceRafayelDone: ["Don't wrap it just yet. I need to sketch the way you put this together.", "先别包装。我想画下你把它们放在一起的样子。"],
    ldbVoiceSylusBegin: ["Choose your colours. A bold centre can hold the whole arrangement together.", "选好颜色。鲜明的中心，能撑起整束花。"], ldbVoiceSylusDone: ["I'd recognise this anywhere. It has your touch.", "无论放在哪里，我都认得。这是你的心意。"],
    ldbVoiceCalebBegin: ["I'll sort the ribbon. You make the flowers get along with each other.", "缎带交给我。让这些花好好相处，就交给你了。"], ldbVoiceCalebDone: ["Looks like we make a pretty good team. Let's bring this one home.", "看来我们配合得不错。把这一束带回家吧。"]
  };
  var strings = { en: {}, zh: {} }; Object.keys(copy).forEach(function (key) { strings.en[key] = copy[key][0]; strings.zh[key] = copy[key][1]; }); App.addStrings(strings);
  App.ldsBouquetCommission = commission; App.ldsCreateBouquet = create; App.ldsEvaluateBouquet = evaluate; App.ldsBouquetPreview = preview; App.ldsBouquetPlace = place; App.ldsBouquetUndo = undo; App.ldsBouquetStars = starsFor;
  App.ldsReadBouquet = readProgress; App.ldsBouquetProgress = progressFor; App.ldsRecordBouquet = record; App.mountLdsBouquet = mount;
})(window.CapitalConvert = window.CapitalConvert || {});
