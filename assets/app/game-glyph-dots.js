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
    var cells = { h: [], v: [], box: [] };
    var over = false;
    var yourTurn = true;

    function renderHud() {
      youEl.textContent = String(dotsCount(state, dotsYou));
      aiEl.textContent = String(dotsCount(state, dotsAi));
      turnEl.textContent = t(yourTurn ? "dotsYourTurn" : "dotsAiTurn");
    }

    function renderCell(kind, index) {
      var claimed = state[kind][index];
      var node = cells[kind][index];
      node.className =
        "dots-edge is-" +
        (node.getAttribute("data-axis") === "v" ? "v" : "h") +
        (claimed === dotsYou ? " is-you" : claimed === dotsAi ? " is-ai" : "");
      node.disabled = !!claimed || over;
    }

    function renderBox(box) {
      var owner = state.owner[box];
      cells.box[box].className =
        "dots-box" + (owner === dotsYou ? " is-you" : owner === dotsAi ? " is-ai" : "");
      cells.box[box].textContent = owner ? "\u25CF" : "";
    }

    function buildBoard(boxes) {
      boardEl.textContent = "";
      cells = { h: [], v: [], box: [] };
      boardEl.style.gridTemplateColumns = new Array(2 * boxes + 1)
        .fill("var(--dots-cell)")
        .join(" ");
      var side = 2 * boxes + 1;
      for (var r = 0; r < side; r += 1) {
        for (var c = 0; c < side; c += 1) {
          if (r % 2 === 0 && c % 2 === 0) {
            var dot = document.createElement("span");
            dot.className = "dots-dot";
            boardEl.appendChild(dot);
          } else if (r % 2 === 0) {
            var hIndex = dotsIndex(r / 2, (c - 1) / 2, boxes);
            var hEdge = document.createElement("button");
            hEdge.type = "button";
            hEdge.className = "dots-edge is-h";
            hEdge.setAttribute("data-axis", "h");
            hEdge.setAttribute(
              "aria-label",
              t("dotsEdgeH", { x: (c - 1) / 2 + 1, y: r / 2 + 1 }),
            );
            (function (index) {
              hEdge.addEventListener("click", function () {
                play(index, "h");
              });
            })(hIndex);
            cells.h[hIndex] = hEdge;
            boardEl.appendChild(hEdge);
          } else if (c % 2 === 0) {
            var vIndex = dotsIndex((r - 1) / 2, c / 2, boxes + 1);
            var vEdge = document.createElement("button");
            vEdge.type = "button";
            vEdge.className = "dots-edge is-v";
            vEdge.setAttribute("data-axis", "v");
            vEdge.setAttribute(
              "aria-label",
              t("dotsEdgeV", { x: c / 2 + 1, y: (r - 1) / 2 + 1 }),
            );
            (function (index) {
              vEdge.addEventListener("click", function () {
                play(index, "v");
              });
            })(vIndex);
            cells.v[vIndex] = vEdge;
            boardEl.appendChild(vEdge);
          } else {
            var boxIndex = dotsIndex((r - 1) / 2, (c - 1) / 2, boxes);
            var boxCell = document.createElement("span");
            boxCell.className = "dots-box";
            cells.box[boxIndex] = boxCell;
            boardEl.appendChild(boxCell);
          }
        }
      }
    }

    function renderAll() {
      var index;
      for (index = 0; index < state.h.length; index += 1) {
        renderCell("h", index);
      }
      for (index = 0; index < state.v.length; index += 1) {
        renderCell("v", index);
      }
      for (index = 0; index < state.owner.length; index += 1) {
        renderBox(index);
      }
      renderHud();
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
