/* Glyph Dots - The dots-and-boxes mini-game in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;
  var dotsYou = 1;
  var dotsAi = 2;
  /* `boxes` per side; the rank may blunder on purpose so the first board is
   * beatable and the last one is not. Margin bands are boxes won over the AI. */
  var dotRanks = [
    { id: "d1", labelKey: "dotsL1", boxes: 3, blunder: 0.4, margin: [3, 2, 1] },
    { id: "d2", labelKey: "dotsL2", boxes: 3, blunder: 0.15, margin: [4, 2, 1] },
    { id: "d3", labelKey: "dotsL3", boxes: 4, blunder: 0.05, margin: [5, 3, 1] },
    { id: "d4", labelKey: "dotsL4", boxes: 4, blunder: 0, margin: [6, 4, 2] },
    { id: "d5", labelKey: "dotsL5", boxes: 5, blunder: 0, margin: [8, 5, 2] },
    { id: "d6", labelKey: "dotsL6", boxes: 5, blunder: 0, margin: [9, 6, 3] },
    { id: "d7", labelKey: "dotsL7", boxes: 3, blunder: 0, margin: [5, 3, 1] },
    { id: "d8", labelKey: "dotsL8", boxes: 4, blunder: 0, margin: [8, 6, 3] },
  ];

  function dotsIndex(y, x, width) {
    return y * width + x;
  }

  function dotsClone(state) {
    return {
      boxes: state.boxes,
      h: state.h.slice(),
      v: state.v.slice(),
      owner: state.owner.slice(),
    };
  }

  /* The boxes an edge borders, by index. */
  function dotsBoxsBeside(state, kind, index) {
    var boxes = state.boxes;
    if (kind === "h") {
      var hy = Math.floor(index / boxes);
      var hx = index % boxes;
      var side = [];
      if (hy > 0) {
        side.push(dotsIndex(hy - 1, hx, boxes));
      }
      if (hy < boxes) {
        side.push(dotsIndex(hy, hx, boxes));
      }
      return side;
    }
    var vy = Math.floor(index / (boxes + 1));
    var vx = index % (boxes + 1);
    var vs = [];
    if (vx > 0) {
      vs.push(dotsIndex(vy, vx - 1, boxes));
    }
    if (vx < boxes) {
      vs.push(dotsIndex(vy, vx, boxes));
    }
    return vs;
  }

  function dotsSides(state, box) {
    var boxes = state.boxes;
    var y = Math.floor(box / boxes);
    var x = box % boxes;
    var count = 0;
    if (state.h[dotsIndex(y, x, boxes)]) {
      count += 1;
    }
    if (state.h[dotsIndex(y + 1, x, boxes)]) {
      count += 1;
    }
    if (state.v[dotsIndex(y, x, boxes + 1)]) {
      count += 1;
    }
    if (state.v[dotsIndex(y, x + 1, boxes + 1)]) {
      count += 1;
    }
    return count;
  }

  function dotsLegal(state) {
    var moves = [];
    var i;
    for (i = 0; i < state.h.length; i += 1) {
      if (!state.h[i]) {
        moves.push({ kind: "h", index: i });
      }
    }
    for (i = 0; i < state.v.length; i += 1) {
      if (!state.v[i]) {
        moves.push({ kind: "v", index: i });
      }
    }
    return moves;
  }

  /* Claim an edge and report the boxes it closed. */
  function dotsApply(state, move, who) {
    var closed = [];
    state[move.kind][move.index] = who;
    dotsBoxsBeside(state, move.kind, move.index).forEach(function (box) {
      if (dotsSides(state, box) === 4 && !state.owner[box]) {
        state.owner[box] = who;
        closed.push(box);
      }
    });
    return closed;
  }

  function dotsCount(state, who) {
    var total = 0;
    state.owner.forEach(function (owner) {
      if (owner === who) {
        total += 1;
      }
    });
    return total;
  }

  /* An edge is safe while neither neighbour is already three-sided: handing
   * over the fourth stick of a box is the only real mistake in the game. */
  function dotsSafe(state, move) {
    var risky = dotsBoxsBeside(state, move.kind, move.index).some(function (box) {
      return dotsSides(state, box) >= 3;
    });
    return !risky;
  }

  /* How many boxes the opponent collects if we open here and they grab
   * everything that closes, walking the chain to its end. */
  function dotsChainCost(state, move, who) {
    var board = dotsClone(state);
    var foe = who === dotsYou ? dotsAi : dotsYou;
    dotsApply(board, move, who);
    var taken = 0;
    var guard = 0;
    var found = true;
    while (found && guard < 200) {
      found = false;
      var legal = dotsLegal(board);
      for (var i = 0; i < legal.length && !found; i += 1) {
        var probe = dotsClone(board);
        if (dotsApply(probe, legal[i], foe).length) {
          dotsApply(board, legal[i], foe);
          taken += 1;
          found = true;
        }
      }
      guard += 1;
    }
    return taken;
  }

  function dotsAiMove(state, who, blunder) {
    var legal = dotsLegal(state);
    if (!legal.length) {
      return null;
    }
    if (blunder > 0 && Math.random() < blunder) {
      return legal[Math.floor(Math.random() * legal.length)];
    }
    var i;
    /* 1. take any box on the table. */
    for (i = 0; i < legal.length; i += 1) {
      var probe = dotsClone(state);
      if (dotsApply(probe, legal[i], who).length) {
        return legal[i];
      }
    }
    /* 2. otherwise play without handing a box over. */
    var safe = legal.filter(function (move) {
      return dotsSafe(state, move);
    });
    if (safe.length) {
      return safe[Math.floor(Math.random() * safe.length)];
    }
    /* 3. forced to open something: give away the shortest chain. */
    var cheapest = null;
    var cheapestCost = Infinity;
    for (i = 0; i < legal.length; i += 1) {
      var cost = dotsChainCost(state, legal[i], who);
      if (cost < cheapestCost) {
        cheapestCost = cost;
        cheapest = legal[i];
      }
    }
    return cheapest || legal[0];
  }

  function initDotsGame() {
    var boardEl = getElement("dotsBoard");
    var youEl = getElement("dotsYouStat");
    var aiEl = getElement("dotsAiStat");
    var turnEl = getElement("dotsTurnStat");
    var resultEl = getElement("dotsResult");
    var newBtn = getElement("dotsNewBtn");
    var bestEl = getElement("dotsBest");
    var rankEl = getElement("dotsRankSel");
    if (
      !boardEl ||
      !youEl ||
      !aiEl ||
      !turnEl ||
      !resultEl ||
      !newBtn ||
      !bestEl ||
      !rankEl
    ) {
      return;
    }

    var campaign = createCampaign({ key: "dots-campaign", levels: dotRanks });
    var rank = dotRanks[campaign.indexOf(campaign.nextLevelId())];
    var state = null;
    var cells = { h: [], v: [], box: [], dot: [] };
    var over = false;
    var yourTurn = true;

    /* The feel layer is optional: some harnesses boot this module without
     * game-fx / game-art, and a missing effect must never eat a turn. */
    var fx = App.fx || {};
    var art = App.art || {};
    var sfx = App.playSfx || function () {};
    var panelEl = panelOf(boardEl);
    var turnChip = turnEl ? turnEl.parentNode : null;
    var youHue = tokenHue("--dots-you-hue", 176);
    var aiHue = tokenHue("--dots-ai-hue", 26);

    /* ------------------------------------------------------------- utilities */

    function panelOf(node) {
      var walk = node;
      while (walk && walk.parentNode) {
        if (String(walk.className || "").indexOf("game-panel") >= 0) {
          return walk;
        }
        walk = walk.parentNode;
      }
      return null;
    }

    function tokenHue(name, fallback) {
      try {
        var value = parseInt(getComputedStyle(boardEl).getPropertyValue(name), 10);
        return isNaN(value) ? fallback : value;
      } catch (error) {
        return fallback;
      }
    }

    function fxCall(name) {
      var fn = fx[name];
      if (typeof fn !== "function") {
        return;
      }
      try {
        fn.apply(fx, Array.prototype.slice.call(arguments, 1));
      } catch (error) {
        /* decoration never breaks a turn */
      }
    }

    function calm() {
      try {
        return (App.isMotionOff && App.isMotionOff()) ||
          document.documentElement.getAttribute("data-motion") === "off";
      } catch (error) {
        return false;
      }
    }

    /* A beat is armed on the node that owns it, not through a class: paintEdges
     * rewrites every edge's class list after each move, and a class that is
     * already applied cannot restart its own animation. */
    function arm(node, spec, delay) {
      if (!node || !node.style || calm()) {
        return;
      }
      node.style.animation = "";
      void node.offsetWidth;
      node.style.animation = spec + " " + (delay || 0) + "ms both";
    }

    function ownerClass(who) {
      return who === dotsYou ? " is-you" : who === dotsAi ? " is-ai" : "";
    }

    function countTo(el, value) {
      if (!el) {
        return;
      }
      var from = parseInt(el.textContent, 10);
      if (isNaN(from)) {
        from = 0;
      }
      if (typeof fx.countUp === "function") {
        fxCall("countUp", el, from, value);
      } else {
        el.textContent = String(value);
      }
    }

    /* --------------------------------------------------------- board geometry */

    function dotAt(y, x) {
      return cells.dot[dotsIndex(y, x, state.boxes + 1)];
    }

    /* The two studs a stick runs between - the joints that react when it lands. */
    function endpoints(kind, index) {
      var boxes = state.boxes;
      if (kind === "h") {
        var hy = Math.floor(index / boxes);
        var hx = index % boxes;
        return [dotAt(hy, hx), dotAt(hy, hx + 1)];
      }
      var vy = Math.floor(index / (boxes + 1));
      var vx = index % (boxes + 1);
      return [dotAt(vy, vx), dotAt(vy + 1, vx)];
    }

    function dotDegree(y, x) {
      var boxes = state.boxes;
      var count = 0;
      if (x < boxes && state.h[dotsIndex(y, x, boxes)]) {
        count += 1;
      }
      if (x > 0 && state.h[dotsIndex(y, x - 1, boxes)]) {
        count += 1;
      }
      if (y < boxes && state.v[dotsIndex(y, x, boxes + 1)]) {
        count += 1;
      }
      if (y > 0 && state.v[dotsIndex(y - 1, x, boxes + 1)]) {
        count += 1;
      }
      return count;
    }

    /* An unclaimed stick beside a three-sided box is a gift; one that would
     * bring a box to three sides is an opening. Both are read from the state,
     * never from the player's guess. */
    function isGift(kind, index) {
      return !dotsSafe(state, { kind: kind, index: index });
    }

    function isOpening(kind, index) {
      var beside = dotsBoxsBeside(state, kind, index);
      for (var i = 0; i < beside.length; i += 1) {
        if (dotsSides(state, beside[i]) === 2) {
          return true;
        }
      }
      return false;
    }

    // -------------------------------------------------------------- painters

    function paintStick(kind, index) {
      var node = cells[kind][index];
      if (!node) {
        return;
      }
      var claimed = state[kind][index];
      var flags = "";
      if (!claimed && !over) {
        flags = isGift(kind, index) ? " is-gift" : isOpening(kind, index) ? " is-risk" : "";
      }
      node.className =
        "dots-edge is-" + (kind === "v" ? "v" : "h") + ownerClass(claimed) + flags;
      /* A taken stick stays clickable: the refusal is the only place the game
       * can show its "no" gesture, and aria-disabled still says it plainly. */
      node.disabled = over;
      node.setAttribute("aria-disabled", claimed ? "true" : "false");
    }

    function paintBox(box, stamp) {
      var node = cells.box[box];
      if (!node) {
        return;
      }
      var owner = state.owner[box];
      var open = !owner && dotsSides(state, box) === 3;
      node.className = "dots-box" + ownerClass(owner) + (open ? " is-open" : "");
      node.setAttribute(
        "role",
        owner ? "img" : "presentation",
      );
      node.setAttribute(
        "aria-label",
        owner ? t(owner === dotsYou ? "dotsYou" : "dotsFoe") : "",
      );
      var mark = node.lastChild;
      var want = owner ? (owner === dotsYou ? "gem" : "flame") : open ? "sparkle" : "";
      if (mark._glyph !== want) {
        mark.textContent = "";
        mark._glyph = want;
        if (want && art.icon) {
          mark.appendChild(
            art.icon(want, { hue: owner === dotsAi ? aiHue : owner ? youHue : 46 }),
          );
        } else if (want) {
          /* No art layer: keep the state legible through shapes, not colour. */
          mark.textContent = owner === dotsYou ? "\u25C6" : "\u2726";
        }
      }
      if (owner && stamp) {
        arm(node.firstChild, "dots-flood 340ms cubic-bezier(0.2,0.9,0.3,1)", stamp);
        arm(mark, "dots-stamp 300ms cubic-bezier(0.34,1.6,0.64,1)", stamp + 90);
      }
    }

    function paintStuds() {
      var boxes = state.boxes;
      for (var y = 0; y <= boxes; y += 1) {
        for (var x = 0; x <= boxes; x += 1) {
          var node = dotAt(y, x);
          if (node) {
            node.setAttribute("data-deg", String(dotDegree(y, x)));
          }
        }
      }
    }

    function paintEdges() {
      var index;
      for (index = 0; index < state.h.length; index += 1) {
        paintStick("h", index);
      }
      for (index = 0; index < state.v.length; index += 1) {
        paintStick("v", index);
      }
    }

    function chipState(node, name) {
      if (!node || !node.classList) {
        return;
      }
      node.classList.remove("is-good");
      node.classList.remove("is-warn");
      if (name) {
        node.classList.add(name);
      }
    }

    function renderHud() {
      countTo(youEl, dotsCount(state, dotsYou));
      countTo(aiEl, dotsCount(state, dotsAi));
      turnEl.textContent = t(yourTurn ? "dotsYourTurn" : "dotsAiTurn");
      chipState(turnChip, over ? "" : yourTurn ? "is-good" : "is-warn");
    }

    function renderAll() {
      var index;
      paintEdges();
      for (index = 0; index < state.owner.length; index += 1) {
        paintBox(index, 0);
      }
      paintStuds();
      renderHud();
    }

    // ---------------------------------------------------------------- build

    function buildBoard(boxes) {
      boardEl.textContent = "";
      cells = { h: [], v: [], box: [], dot: [] };
      boardEl.className = "dots-board";
      boardEl.style.setProperty("--dots-cell", dotsCellSize(boxes) + "px");
      boardEl.style.gridTemplateColumns = new Array(2 * boxes + 1)
        .fill("var(--dots-cell)")
        .join(" ");

      var plate = document.createElement("div");
      plate.className = "dots-plate";
      plate.setAttribute("aria-hidden", "true");
      boardEl.appendChild(plate);

      var side = 2 * boxes + 1;
      for (var r = 0; r < side; r += 1) {
        for (var c = 0; c < side; c += 1) {
          if (r % 2 === 0 && c % 2 === 0) {
            var dot = document.createElement("span");
            dot.className = "dots-dot";
            dot.setAttribute("aria-hidden", "true");
            var body = document.createElement("i");
            body.className = "dots-stud";
            dot.appendChild(body);
            var spark = document.createElement("i");
            spark.className = "dots-spark";
            dot.appendChild(spark);
            cells.dot[dotsIndex(r / 2, c / 2, boxes + 1)] = dot;
            boardEl.appendChild(dot);
          } else if (r % 2 === 0) {
            var hIndex = dotsIndex(r / 2, (c - 1) / 2, boxes);
            var hEdge = makeEdge("h", hIndex, t("dotsEdgeH", { x: (c - 1) / 2 + 1, y: r / 2 + 1 }));
            cells.h[hIndex] = hEdge;
            boardEl.appendChild(hEdge);
          } else if (c % 2 === 0) {
            var vIndex = dotsIndex((r - 1) / 2, c / 2, boxes + 1);
            var vEdge = makeEdge("v", vIndex, t("dotsEdgeV", { x: c / 2 + 1, y: (r - 1) / 2 + 1 }));
            cells.v[vIndex] = vEdge;
            boardEl.appendChild(vEdge);
          } else {
            var boxIndex = dotsIndex((r - 1) / 2, (c - 1) / 2, boxes);
            var boxCell = document.createElement("span");
            boxCell.className = "dots-box";
            var wash = document.createElement("i");
            wash.className = "dots-wash";
            boxCell.appendChild(wash);
            var mark = document.createElement("i");
            mark.className = "dots-mark";
            boxCell.appendChild(mark);
            cells.box[boxIndex] = boxCell;
            boardEl.appendChild(boxCell);
          }
        }
      }
    }

    function makeEdge(axis, index, label) {
      var edge = document.createElement("button");
      var stick = document.createElement("i");
      edge.type = "button";
      edge.className = "dots-edge is-" + axis;
      edge.setAttribute("data-axis", axis);
      edge.setAttribute("aria-label", label);
      stick.className = "dots-stick";
      edge.appendChild(stick);
      (function (cell, axis, index) {
        cell.addEventListener("click", function () {
          play(axis, index, cell);
        });
      })(edge, axis, index);
      return edge;
    }

    function dotsCellSize(boxes) {
      if (boxes <= 3) {
        return 40;
      }
      return boxes === 4 ? 36 : 30;
    }

    /* One move, made visible: the stick draws out of its first stud, the joints
     * it lands on flash, and any box it closes floods and stamps its glyph. The
     * rival's whole turn is painted in one pass, so each beat is armed with a
     * rising delay instead of a timer - the chain unrolls after the click. */
    function commit(kind, index, who, closed, step) {
      var mine = who === dotsYou;
      var audible = mine || step < 3;
      var delay = step * 100;
      var hue = mine ? youHue : aiHue;
      var node = cells[kind][index];
      var i;

      paintStick(kind, index);
      if (node) {
        arm(
          node.firstChild,
          "dots-draw-" + (kind === "v" ? "y" : "x") +
            " 240ms cubic-bezier(0.2,0.85,0.25,1)",
          delay,
        );
      }
      var ends = endpoints(kind, index);
      for (i = 0; i < ends.length; i += 1) {
        if (ends[i]) {
          arm(
            ends[i].lastChild,
            "dots-spark 380ms ease-out",
            delay + (i ? 70 : 0),
          );
        }
      }
      for (i = 0; i < closed.length; i += 1) {
        paintBox(closed[i], delay + 150);
      }
      paintEdges();
      paintStuds();
      renderHud();

      if (audible) {
        sfx(closed.length ? (mine ? "coin" : "score") : mine ? "place" : "tick");
      }
      if (mine) {
        fxCall("ring", node, { hue: hue });
      }
      for (i = 0; i < closed.length; i += 1) {
        var boxNode = cells.box[closed[i]];
        if (mine && boxNode) {
          fxCall("burst", boxNode, {
            kind: closed.length > 1 ? "confetti" : "star",
            count: closed.length > 1 ? 16 : 9,
            hue: hue,
          });
          fxCall("floatText", boxNode, "+1", { kind: "good", hue: hue });
        }
      }
      if (mine && closed.length) {
        /* Closing a box buys another stick, so the reward gets its own beat. */
        sfx("star");
        fxCall("pop", youEl, { scale: 1.22, ms: 220 });
      }
    }

    function refreshRank() {
      fillCampaignPicker(
        rankEl,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      rankEl.value = rank.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function finish() {
      over = true;
      var you = dotsCount(state, dotsYou);
      var ai = dotsCount(state, dotsAi);
      var margin = you - ai;
      if (margin <= 0) {
        resultEl.textContent = t(
          margin === 0 ? "dotsDraw" : "dotsLoss",
          { you: you, ai: ai },
        );
        if (margin < 0) {
          logAction(t("logDots", { n: "\u2014" }));
        }
        renderHud();
        refreshRank();
        petNotifyGame(false);
        return;
      }
      var starsWon = starsFor(margin, rank.margin, "high");
      var outcome = campaign.record(rank.id, {
        stars: starsWon,
        best: margin,
        better: "high",
      });
      var message =
        t("dotsWin", { you: you, ai: ai, s: starsWon }) +
        (outcome.isBest ? " " + t("newBest") : "");
      if (outcome.unlockedNext) {
        message += " " + t("dotsNextRank");
      } else if (campaign.clearedCount() === dotRanks.length) {
        message += " " + t("dotsAllRanks");
      }
      resultEl.textContent = message;
      logAction(t("logDots", { n: you + "-" + ai }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      renderHud();
      refreshRank();
    }

    /* Both sides loop here: closing a box earns another stick, so a turn can
     * run on until someone is forced to open a chain. */
    function aiTurn() {
      var guard = 0;
      while (dotsLegal(state).length && guard < 200) {
        var move = dotsAiMove(state, dotsAi, rank.blunder);
        if (!move) {
          break;
        }
        var closed = dotsApply(state, move, dotsAi);
        renderAll();
        if (!closed.length) {
          break;
        }
        if (!dotsLegal(state).length) {
          finish();
          return;
        }
        guard += 1;
      }
      yourTurn = true;
      renderHud();
    }

    function play(index, kind) {
      if (over || !yourTurn || state[kind][index]) {
        return;
      }
      var closed = dotsApply(state, { kind: kind, index: index }, dotsYou);
      renderAll();
      if (!dotsLegal(state).length) {
        finish();
        return;
      }
      if (closed.length) {
        return;
      }
      yourTurn = false;
      renderHud();
      aiTurn();
    }

    function newRound(rankDef) {
      rank = rankDef || rank;
      var boxes = rank.boxes;
      state = {
        boxes: boxes,
        h: new Array(boxes * (boxes + 1)).fill(0),
        v: new Array(boxes * (boxes + 1)).fill(0),
        owner: new Array(boxes * boxes).fill(0),
      };
      yourTurn = true;
      over = false;
      buildBoard(boxes);
      renderAll();
      refreshRank();
      resultEl.textContent = t("dotsPrompt", {
        name: t(rank.labelKey),
        n: boxes * boxes,
      });
    }

    newBtn.addEventListener("click", function () {
      newRound();
    });

    rankEl.addEventListener("change", function () {
      var index = campaign.indexOf(rankEl.value);
      if (index >= 0 && campaign.isUnlocked(rankEl.value)) {
        newRound(dotRanks[index]);
      }
    });

    newRound(rank);
  }


  /* Exported for the other modules. */
  App.dotsAiMove = dotsAiMove;
  App.dotsLegal = dotsLegal;
  App.dotsApply = dotsApply;
  App.dotsNewState = function (boxes) {
    return {
      boxes: boxes,
      h: new Array(boxes * (boxes + 1)).fill(0),
      v: new Array(boxes * (boxes + 1)).fill(0),
      owner: new Array(boxes * boxes).fill(0),
    };
  };
  App.initDotsGame = initDotsGame;
})(window.CapitalConvert = window.CapitalConvert || {});
