/* Gomoku - The five-in-a-row duel against the reading AI in the shared game drawer. */
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
  var gmSize = 13;
  var gmEmpty = 0;
  var gmHuman = 1;
  var gmAi = 2;
  /* Three ranks, three campaigns: the novice blinks, the reader
   * defends, the fortune does both and counts your tempo. */
  var gmRanks = [
    { id: "r1", labelKey: "gomokuRank1", noise: 260, defense: 0.55, starMoves: [14, 20, 30] },
    { id: "r2", labelKey: "gomokuRank2", noise: 60, defense: 0.95, starMoves: [18, 26, 38] },
    { id: "r3", labelKey: "gomokuRank3", noise: 0, defense: 1.1, starMoves: [24, 34, 48] },
  ];
  var gmDirs = [[1, 0], [0, 1], [1, 1], [1, -1]];

  function gmInBounds(x, y) {
    return x >= 0 && x < gmSize && y >= 0 && y < gmSize;
  }

  /* One pass over the four axes through (x, y), pretending `who`
   * plays there: run length plus how many ends of it stay open. */
  function gmAxisScore(board, x, y, dx, dy, who) {
    var run = 1;
    var openEnds = 0;
    var step;
    var nx;
    var ny;
    for (step = 1; step < 6; step += 1) {
      nx = x + dx * step;
      ny = y + dy * step;
      if (!gmInBounds(nx, ny)) {
        break;
      }
      if (board[nx + ny * gmSize] === who) {
        run += 1;
      } else {
        if (board[nx + ny * gmSize] === gmEmpty) {
          openEnds += 1;
        }
        break;
      }
    }
    for (step = 1; step < 6; step += 1) {
      nx = x - dx * step;
      ny = y - dy * step;
      if (!gmInBounds(nx, ny)) {
        break;
      }
      if (board[nx + ny * gmSize] === who) {
        run += 1;
      } else {
        if (board[nx + ny * gmSize] === gmEmpty) {
          openEnds += 1;
        }
        break;
      }
    }
    if (run >= 5) {
      return 10000000;
    }
    if (run === 4) {
      return openEnds === 2 ? 1000000 : openEnds === 1 ? 100000 : 0;
    }
    if (run === 3) {
      return openEnds === 2 ? 10000 : openEnds === 1 ? 1000 : 0;
    }
    if (run === 2) {
      return openEnds === 2 ? 100 : openEnds === 1 ? 10 : 0;
    }
    return openEnds ? 1 : 0;
  }

  function gmCellScore(board, x, y, who) {
    var total = 0;
    gmDirs.forEach(function (axis) {
      total += gmAxisScore(board, x, y, axis[0], axis[1], who);
    });
    return total;
  }

  function gmHasWon(board, x, y, who) {
    return gmDirs.some(function (axis) {
      return gmAxisScore(board, x, y, axis[0], axis[1], who) >= 10000000;
    });
  }

  function initGomokuGame() {
    var boardEl = getElement("gomokuBoard");
    var movesEl = getElement("gomokuMoves");
    var streakEl = getElement("gomokuStreak");
    var resultEl = getElement("gomokuResult");
    var newBtn = getElement("gomokuNewBtn");
    var undoBtn = getElement("gomokuUndoBtn");
    var bestEl = getElement("gomokuBest");
    var rankSel = getElement("gomokuRankSel");
    if (
      !boardEl ||
      !movesEl ||
      !streakEl ||
      !resultEl ||
      !newBtn ||
      !undoBtn ||
      !bestEl ||
      !rankSel
    ) {
      return;
    }

    var campaign = createCampaign({ key: "gomoku-campaign", levels: gmRanks });
    var rank = gmRanks[campaign.indexOf(campaign.nextLevelId())];
    var cells = [];
    var board = [];
    var history = [];
    var moves = 0;
    var over = false;
    var aiTimer = null;

    function readInt(key) {
      var value = parseInt(localStorage.getItem(key), 10);
      return isNaN(value) ? 0 : value;
    }

    function buildBoard() {
      boardEl.textContent = "";
      cells = [];
      for (var index = 0; index < gmSize * gmSize; index += 1) {
        (function (cellIndex) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "gm-cell";
          button.addEventListener("click", function () {
            playHuman(cellIndex);
          });
          boardEl.appendChild(button);
          cells.push(button);
        })(index);
      }
    }

    function renderCell(index) {
      var value = board[index];
      cells[index].className =
        "gm-cell" +
        (value === gmHuman ? " is-black" : value === gmAi ? " is-white" : "") +
        (history.length && history[history.length - 1] === index ? " is-last" : "");
      cells[index].disabled = value !== gmEmpty || over;
      cells[index].setAttribute(
        "aria-label",
        t("gomokuCell", {
          n: (index % gmSize) + 1 + "," + (Math.floor(index / gmSize) + 1),
        }) +
          (value === gmHuman
            ? ", " + t("gomokuBlack")
            : value === gmAi
              ? ", " + t("gomokuWhite")
              : ""),
      );
    }

    function renderAll() {
      for (var index = 0; index < board.length; index += 1) {
        renderCell(index);
      }
      movesEl.textContent = String(moves);
      undoBtn.disabled = history.length === 0 || over;
    }

    function refreshRank() {
      fillCampaignPicker(
        rankSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      rankSel.value = rank.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
      streakEl.textContent = String(readInt("gomoku-win-streak"));
    }

    function newGame(rankDef) {
      window.clearTimeout(aiTimer);
      aiTimer = null;
      rank = rankDef || rank;
      board = [];
      for (var index = 0; index < gmSize * gmSize; index += 1) {
        board.push(gmEmpty);
      }
      history = [];
      moves = 0;
      over = false;
      renderAll();
      refreshRank();
      resultEl.textContent = t("gomokuPrompt", { name: t(rank.labelKey) });
    }

    function aiPick() {
      var bestScore = -1;
      var best = -1;
      for (var index = 0; index < board.length; index += 1) {
        if (board[index] !== gmEmpty) {
          continue;
        }
        var x = index % gmSize;
        var y = Math.floor(index / gmSize);
        /* Only fight near the action; the far empty board is noise. */
        var nearStone = false;
        for (var dy = -2; dy <= 2 && !nearStone; dy += 1) {
          for (var dx = -2; dx <= 2; dx += 1) {
            var nx = x + dx;
            var ny = y + dy;
            if (
              gmInBounds(nx, ny) &&
              board[nx + ny * gmSize] !== gmEmpty
            ) {
              nearStone = true;
              break;
            }
          }
        }
        if (!nearStone) {
          continue;
        }
        var attack = gmCellScore(board, x, y, gmAi);
        var defense = gmCellScore(board, x, y, gmHuman);
        var centerBias =
          6 - Math.max(Math.abs(x - gmSize / 2), Math.abs(y - gmSize / 2));
        var value =
          attack + defense * rank.defense + centerBias + Math.random() * rank.noise;
        if (value > bestScore) {
          bestScore = value;
          best = index;
        }
      }
      if (best === -1) {
        for (var free = 0; free < board.length; free += 1) {
          if (board[free] === gmEmpty) {
            return free;
          }
        }
      }
      return best;
    }

    function place(index, who) {
      board[index] = who;
      history.push(index);
      moves += 1;
      renderCell(index);
      movesEl.textContent = String(moves);
      undoBtn.disabled = history.length === 0;
      return gmHasWon(board, index % gmSize, Math.floor(index / gmSize), who);
    }

    function playHuman(index) {
      if (over || board[index] !== gmEmpty) {
        return;
      }
      var won = place(index, gmHuman);
      if (won) {
        win();
        return;
      }
      if (moves >= gmSize * gmSize) {
        draw();
        return;
      }
      resultEl.textContent = t("gomokuAiTurn");
      aiTimer = window.setTimeout(playAi, 260);
    }

    function playAi() {
      aiTimer = null;
      if (over) {
        return;
      }
      var index = aiPick();
      if (index < 0) {
        draw();
        return;
      }
      var won = place(index, gmAi);
      if (won) {
        lose();
        return;
      }
      if (moves >= gmSize * gmSize) {
        draw();
        return;
      }
      resultEl.textContent = t("gomokuYourTurn");
    }

    function win() {
      over = true;
      var seconds = 1;
      var starsWon = starsFor(moves, rank.starMoves, "low");
      var outcome = campaign.record(rank.id, {
        stars: starsWon,
        best: moves,
        better: "low",
      });
      var streakKey = "gomoku-win-streak";
      localStorage.setItem(streakKey, String(readInt(streakKey) + 1));
      var message =
        t("gomokuWin", { name: t(rank.labelKey), n: moves }) +
        (outcome.isBest ? " " + t("newBest") : "");
      if (outcome.unlockedNext) {
        message += " " + t("gomokuNextRank");
      } else if (campaign.clearedCount() === gmRanks.length) {
        message += " " + t("gomokuAllRanks");
      }
      resultEl.textContent = message;
      logAction(t("logGomoku", { n: moves }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      renderAll();
      refreshRank();
    }

    function lose() {
      over = true;
      localStorage.setItem("gomoku-win-streak", "0");
      resultEl.textContent = t("gomokuLoss", { name: t(rank.labelKey) });
      logAction(t("logGomoku", { n: "\u2014" }));
      petNotifyGame(false);
      renderAll();
      refreshRank();
    }

    function draw() {
      over = true;
      resultEl.textContent = t("gomokuDraw");
      renderAll();
    }

    undoBtn.addEventListener("click", function () {
      if (history.length === 0 || over) {
        return;
      }
      window.clearTimeout(aiTimer);
      aiTimer = null;
      /* Undo walks back a full round: the AI's answer and your move. */
      var undoCount = board[history[history.length - 1]] === gmAi ? 2 : 1;
      for (var step = 0; step < undoCount && history.length; step += 1) {
        var index = history.pop();
        board[index] = gmEmpty;
        moves -= 1;
        renderCell(index);
      }
      over = false;
      renderAll();
      resultEl.textContent = t("gomokuYourTurn");
    });

    newBtn.addEventListener("click", function () {
      newGame();
    });

    rankSel.addEventListener("change", function () {
      var index = campaign.indexOf(rankSel.value);
      if (index >= 0 && campaign.isUnlocked(rankSel.value)) {
        newGame(gmRanks[index]);
      }
    });

    buildBoard();
    newGame(rank);
  }


  /* Exported for the other modules. */
  App.initGomokuGame = initGomokuGame;
})(window.CapitalConvert = window.CapitalConvert || {});
