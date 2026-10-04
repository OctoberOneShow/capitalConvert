/* Kalah Row - the mancala sowing mini-game in the shared game drawer. */
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
  var malPits = 6;
  var malSeed = 4;
  /* Cells 0 is the player's store, 1-6 the player's pits, 7 the rival's
   * store and 8-13 the rival's pits; sowing walks the index up and wraps. */
  var malYouStore = 0;
  var malAiStore = 7;
  /* starsFor() stops at the band it first clears, so a margin ladder runs from
   * the rout down to any win: three stars needs the measured top of the bench's
   * beaten margins, one star only asks that you won at all. */
  var malRanks = [
    { id: "m1", labelKey: "malR1", depth: 1, noise: 4, margin: [14, 8, 1] },
    { id: "m2", labelKey: "malR2", depth: 1, noise: 0, margin: [16, 10, 1] },
    { id: "m3", labelKey: "malR3", depth: 2, noise: 0, margin: [18, 12, 1] },
    { id: "m4", labelKey: "malR4", depth: 3, noise: 0, margin: [20, 14, 1] },
  ];

  function malFresh() {
    var cells = [0];
    var index;
    for (index = 0; index < malPits; index += 1) {
      cells.push(malSeed);
    }
    cells.push(0);
    for (index = 0; index < malPits; index += 1) {
      cells.push(malSeed);
    }
    return cells;
  }

  function malIsPit(index, who) {
    if (index === malYouStore || index === malAiStore) {
      return false;
    }
    return who === "you" ? index > malYouStore && index < malAiStore : index > malAiStore;
  }

  function malHome(who) {
    return who === "you" ? malYouStore : malAiStore;
  }

  /* Sow one hand. The rival's store is skipped, and a last stone in your own
   * store both banks a point and earns another go; a last stone in an empty
   * home-side pit captures the stones sitting opposite it. */
  function malSow(cells, index, who) {
    var next = cells.slice();
    var rival = who === "you" ? "ai" : "you";
    var stones = next[index];
    var extra = false;
    var captured = 0;
    next[index] = 0;
    var cell = index;
    while (stones > 0) {
      cell = (cell + 1) % (malPits * 2 + 2);
      if (cell === malHome(rival)) {
        continue;
      }
      next[cell] += 1;
      stones -= 1;
    }
    if (cell === malHome(who)) {
      extra = true;
    } else if (malIsPit(cell, who) && next[cell] === 1) {
      /* The rows run in opposite directions, so facing pairs mirror around
       * the middle of the ring. */
      var opposite = next.length - cell;
      if (malIsPit(opposite, rival) && next[opposite] > 0) {
        captured = next[opposite];
        /* the pairing stone is banked along with the opponent's */
        next[malHome(who)] += captured + 1;
        next[opposite] = 0;
        next[cell] = 0;
      }
    }
    return { cells: next, extra: extra, captured: captured };
  }

  function malLegal(cells, who) {
    var moves = [];
    var index;
    for (index = 0; index < cells.length; index += 1) {
      if (malIsPit(index, who) && cells[index] > 0) {
        moves.push(index);
      }
    }
    return moves;
  }

  function malSideCount(cells, who) {
    var total = 0;
    var index;
    for (index = 0; index < cells.length; index += 1) {
      if (malIsPit(index, who)) {
        total += cells[index];
      }
    }
    return total;
  }

  function malOver(cells) {
    return malSideCount(cells, "you") === 0 || malSideCount(cells, "ai") === 0;
  }

  /* Finish a round: whatever is left on a side belongs to that side. */
  function malTally(cells) {
    var out = cells.slice();
    var index;
    for (index = 0; index < out.length; index += 1) {
      if (malIsPit(index, "you")) {
        out[malYouStore] += out[index];
      } else if (malIsPit(index, "ai")) {
        out[malAiStore] += out[index];
      }
    }
    return { you: out[malYouStore], ai: out[malAiStore] };
  }

  function malScore(cells, who) {
    var tally = malTally(cells);
    return (who === "you" ? tally.you - tally.ai : tally.ai - tally.you);
  }

  function malBestMove(cells, who, depth, noise) {
    var moves = malLegal(cells, who);
    if (!moves.length) {
      return null;
    }
    var rival = who === "you" ? "ai" : "you";
    var best = -Infinity;
    var pick = moves[0];
    moves.forEach(function (index) {
      var step = malSow(cells, index, who);
      var value;
      if (depth > 1 && !malOver(step.cells) && !step.extra) {
        var worst = Infinity;
        malLegal(step.cells, rival).forEach(function (reply) {
          var after = malSow(step.cells, reply, rival);
          worst = Math.min(worst, malScore(after.cells, who));
        });
        value = worst === Infinity ? malScore(step.cells, who) : worst;
      } else {
        value = malScore(step.cells, who);
      }
      /* A spare turn is worth more than the raw count it banks. */
      if (step.extra) {
        value += 1.5;
      }
      value += Math.random() * noise;
      if (value > best) {
        best = value;
        pick = index;
      }
    });
    return pick;
  }

  function initMancalaGame() {
    var boardEl = getElement("malBoard");
    var youEl = getElement("malYouStat");
    var aiEl = getElement("malAiStat");
    var turnEl = getElement("malTurnStat");
    var resultEl = getElement("malResult");
    var newBtn = getElement("malNewBtn");
    var undoBtn = getElement("malUndoBtn");
    var bestEl = getElement("malBest");
    var rankEl = getElement("malRankSel");
    if (
      !boardEl ||
      !youEl ||
      !aiEl ||
      !turnEl ||
      !resultEl ||
      !newBtn ||
      !undoBtn ||
      !bestEl ||
      !rankEl
    ) {
      return;
    }

    var campaign = createCampaign({ key: "kalah-row-campaign", levels: malRanks });
    var rank = malRanks[campaign.indexOf(campaign.nextLevelId())];
    var cells = malFresh();
    var history = [];
    var yourTurn = true;
    var over = false;
    var nodes = [];

    function renderHud() {
      var tally = malTally(cells);
      /* a finished round banks the stones still on each side, and the result
       * line already counts them - the HUD has to agree with it */
      youEl.textContent = String(over ? tally.you : cells[malYouStore]);
      aiEl.textContent = String(over ? tally.ai : cells[malAiStore]);
      turnEl.textContent = over
        ? t("malOverTurn")
        : t(yourTurn ? "malYourTurn" : "malAiTurn");
      return tally;
    }

    function renderBoard() {
      nodes.forEach(function (node, index) {
        node.querySelector(".mal-count").textContent = String(cells[index]);
        node.disabled =
          over || !yourTurn || !malIsPit(index, "you") || cells[index] === 0;
        node.classList.toggle("is-store", index === malYouStore || index === malAiStore);
        node.classList.toggle("is-rival", index === malAiStore);
      });
      renderHud();
    }

    function buildBoard() {
      boardEl.textContent = "";
      nodes = [];
      cells.forEach(function (count, index) {
        var pit = document.createElement("button");
        pit.type = "button";
        pit.className = "mal-pit";
        var label = document.createElement("span");
        label.className = "mal-label";
        label.textContent =
          index === malYouStore
            ? t("malYouStore")
            : index === malAiStore
              ? t("malAiStore")
              : t("malPit", { n: index < malAiStore ? index : index - malAiStore });
        var value = document.createElement("span");
        value.className = "mal-count";
        value.textContent = String(count);
        pit.appendChild(label);
        pit.appendChild(value);
        (function (cell) {
          pit.addEventListener("click", function () {
            play(cell);
          });
        })(index);
        boardEl.appendChild(pit);
        nodes.push(pit);
      });
      renderBoard();
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
      var tally = malTally(cells);
      var margin = tally.you - tally.ai;
      if (margin <= 0) {
        resultEl.textContent = t(margin === 0 ? "malDraw" : "malLoss", {
          you: tally.you,
          ai: tally.ai,
        });
        if (margin < 0) {
          logAction(t("logKalah", { n: "\u2014" }));
        }
        renderBoard();
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
        t("malWin", { you: tally.you, ai: tally.ai, s: starsWon }) +
        (outcome.isBest ? " " + t("newBest") : "");
      if (outcome.unlockedNext) {
        message += " " + t("malNextRank");
      } else if (campaign.clearedCount() === malRanks.length) {
        message += " " + t("malAllRanks");
      }
      resultEl.textContent = message;
      logAction(t("logKalah", { n: tally.you + "-" + tally.ai }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      renderBoard();
      refreshRank();
    }

    function aiMove() {
      var guard = 0;
      while (!over) {
        var index = malBestMove(cells, "ai", rank.depth, rank.noise);
        if (index === null) {
          if (malOver(cells)) {
            finish();
          }
          return;
        }
        var step = malSow(cells, index, "ai");
        cells = step.cells;
        renderBoard();
        if (malOver(cells)) {
          finish();
          return;
        }
        if (!step.extra) {
          yourTurn = true;
          renderBoard();
          return;
        }
        if (guard++ > malPits * 4) {
          /* bail out with the move handed back, or the board locks up */
          yourTurn = true;
          renderBoard();
          return;
        }
      }
    }

    function play(index) {
      if (over || !yourTurn || !malIsPit(index, "you") || cells[index] === 0) {
        return;
      }
      history.push({ cells: cells.slice(), yourTurn: true });
      var step = malSow(cells, index, "you");
      cells = step.cells;
      undoBtn.disabled = false;
      renderBoard();
      if (malOver(cells)) {
        finish();
        return;
      }
      if (step.extra) {
        resultEl.textContent = t("malExtraTurn");
        return;
      }
      yourTurn = false;
      renderBoard();
      aiMove();
    }

    function newRound(rankDef) {
      rank = rankDef || rank;
      cells = malFresh();
      history = [];
      yourTurn = true;
      over = false;
      undoBtn.disabled = true;
      buildBoard();
      refreshRank();
      resultEl.textContent = t("malPrompt", { name: t(rank.labelKey) });
    }

    undoBtn.addEventListener("click", function () {
      if (!history.length || over) {
        return;
      }
      /* Walk back to the start of one of your own turns, replies included. */
      var step = history.pop();
      cells = step.cells;
      yourTurn = true;
      undoBtn.disabled = history.length === 0;
      renderBoard();
      resultEl.textContent = t("malUndid");
    });

    newBtn.addEventListener("click", function () {
      newRound();
    });

    rankEl.addEventListener("change", function () {
      var index = campaign.indexOf(rankEl.value);
      if (index >= 0 && campaign.isUnlocked(rankEl.value)) {
        newRound(malRanks[index]);
      }
    });

    newRound(rank);
  }


  /* Exported for the other modules. */
  App.kalahSow = malSow;
  App.kalahFresh = malFresh;
  App.kalahLegal = malLegal;
  App.kalahTally = malTally;
  App.initMancalaGame = initMancalaGame;
})(window.CapitalConvert = window.CapitalConvert || {});
