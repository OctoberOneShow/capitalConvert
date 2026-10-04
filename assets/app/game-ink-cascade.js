/* Ink Cascade - The match-three chain-reaction campaign in the shared game drawer. */
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
  var inkSize = 8;
  var inkColors = 6;
  /* One glyph per ink colour, kept as escapes so the source stays ASCII. */
  var inkGlyphs = ["\u25c6", "\u25cf", "\u25b2", "\u25a0", "\u2605", "\u25cb"];
  /* Every pool asks for a score inside a move budget. Star thresholds
   * scale off the target: [3-star, 2-star, 1-star] as "high" values. */
  var inkLevels = [
    { id: "p1", labelKey: "inkL1", target: 800, moves: 20 },
    { id: "p2", labelKey: "inkL2", target: 1000, moves: 20 },
    { id: "p3", labelKey: "inkL3", target: 1200, moves: 18 },
    { id: "p4", labelKey: "inkL4", target: 1400, moves: 18 },
    { id: "p5", labelKey: "inkL5", target: 1600, moves: 16 },
    { id: "p6", labelKey: "inkL6", target: 1750, moves: 16 },
    { id: "p7", labelKey: "inkL7", target: 1900, moves: 15 },
    { id: "p8", labelKey: "inkL8", target: 2050, moves: 15 },
    { id: "p9", labelKey: "inkL9", target: 2150, moves: 14 },
    { id: "p10", labelKey: "inkL10", target: 2300, moves: 14 },
    { id: "p11", labelKey: "inkL11", target: 2450, moves: 13 },
    { id: "p12", labelKey: "inkL12", target: 2600, moves: 13 },
    { id: "p13", labelKey: "lvlNum13", target: 3000, moves: 15 },
    { id: "p14", labelKey: "lvlNum14", target: 3400, moves: 17 },
    { id: "p15", labelKey: "lvlNum15", target: 3800, moves: 19 },
    { id: "p16", labelKey: "lvlNum16", target: 4200, moves: 21 },
  ];

  function indexAt(x, y) {
    return y * inkSize + x;
  }

  function neighbours(a, b) {
    var ax = a % inkSize;
    var ay = Math.floor(a / inkSize);
    var bx = b % inkSize;
    var by = Math.floor(b / inkSize);
    return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
  }

  function initInkCascadeGame() {
    var boardEl = getElement("inkBoard");
    var scoreEl = getElement("inkScore");
    var movesEl = getElement("inkMoves");
    var comboEl = getElement("inkCombo");
    var resultEl = getElement("inkResult");
    var newBtn = getElement("inkNewBtn");
    var bestEl = getElement("inkBest");
    var selectEl = getElement("inkLevelSel");
    if (
      !boardEl ||
      !scoreEl ||
      !movesEl ||
      !comboEl ||
      !resultEl ||
      !newBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var campaign = createCampaign({ key: "ink-cascade-campaign", levels: inkLevels });
    var level = inkLevels[0];
    var board = [];
    var tiles = [];
    var selected = -1;
    var busy = false;
    var score = 0;
    var movesLeft = 0;
    var combo = 0;
    var cascadeId = null;
    var pendingMatches = [];
    var shakeTimers = [];

    function colorAt(index) {
      return board[index];
    }

    /* One line of board positions, scanned for runs of three or more. */
    function lineMatches(line) {
      var matches = [];
      var run = 1;
      for (var i = 1; i <= line.length; i += 1) {
        if (
          i < line.length &&
          colorAt(line[i]) >= 0 &&
          colorAt(line[i]) === colorAt(line[i - 1])
        ) {
          run += 1;
          continue;
        }
        if (run >= 3 && colorAt(line[i - 1]) >= 0) {
          for (var j = i - run; j < i; j += 1) {
            matches.push(line[j]);
          }
        }
        run = 1;
      }
      return matches;
    }

    function findMatches() {
      var found = {};
      for (var y = 0; y < inkSize; y += 1) {
        var row = [];
        for (var x = 0; x < inkSize; x += 1) {
          row.push(indexAt(x, y));
        }
        lineMatches(row).forEach(function (index) {
          found[index] = true;
        });
      }
      for (var col = 0; col < inkSize; col += 1) {
        var column = [];
        for (var y2 = 0; y2 < inkSize; y2 += 1) {
          column.push(indexAt(col, y2));
        }
        lineMatches(column).forEach(function (index) {
          found[index] = true;
        });
      }
      return Object.keys(found).map(Number);
    }

    function swapColors(a, b) {
      var swap = board[a];
      board[a] = board[b];
      board[b] = swap;
    }

    function wouldMatchAfterSwap(a, b) {
      swapColors(a, b);
      var matches = findMatches();
      swapColors(a, b);
      return matches.length > 0;
    }

    function availableMoveExists() {
      for (var y = 0; y < inkSize; y += 1) {
        for (var x = 0; x < inkSize; x += 1) {
          var index = indexAt(x, y);
          if (x + 1 < inkSize && wouldMatchAfterSwap(index, index + 1)) {
            return true;
          }
          if (y + 1 < inkSize && wouldMatchAfterSwap(index, index + inkSize)) {
            return true;
          }
        }
      }
      return false;
    }

    function randomColor() {
      return Math.floor(Math.random() * inkColors);
    }

    function fillBoard() {
      board = [];
      for (var index = 0; index < inkSize * inkSize; index += 1) {
        board.push(randomColor());
      }
      var guard = 0;
      while (findMatches().length && guard < 500) {
        findMatches().forEach(function (index) {
          board[index] = randomColor();
        });
        guard += 1;
      }
      guard = 0;
      while (!availableMoveExists() && guard < 500) {
        for (var cell = 0; cell < board.length; cell += 1) {
          board[cell] = randomColor();
        }
        guard += 1;
        var matchGuard = 0;
        while (findMatches().length && matchGuard < 500) {
          findMatches().forEach(function (index) {
            board[index] = randomColor();
          });
          matchGuard += 1;
        }
      }
    }

    function render() {
      for (var index = 0; index < tiles.length; index += 1) {
        var tile = tiles[index];
        var color = colorAt(index);
        tile.className = "ink-tile ink-c" + color;
        tile.textContent = inkGlyphs[color];
        tile.setAttribute(
          "aria-label",
          t("inkCell", { n: index + 1 }) + ", " + t("inkColor" + color),
        );
        tile.setAttribute("aria-pressed", String(selected === index));
        tile.classList.toggle("is-selected", selected === index);
      }
    }

    function renderHud() {
      scoreEl.textContent = score + "/" + level.target;
      movesEl.textContent = String(Math.max(0, movesLeft));
      comboEl.textContent = String(combo);
    }

    function collapseAndRefill() {
      for (var x = 0; x < inkSize; x += 1) {
        var column = [];
        for (var y = inkSize - 1; y >= 0; y -= 1) {
          var color = colorAt(indexAt(x, y));
          if (color >= 0) {
            column.push(color);
          }
        }
        for (var y2 = inkSize - 1; y2 >= 0; y2 -= 1) {
          var fromBottom = inkSize - 1 - y2;
          board[indexAt(x, y2)] =
            fromBottom < column.length ? column[fromBottom] : randomColor();
        }
      }
    }

    function resolveCascades() {
      cascadeId = null;
      var matches = findMatches();
      if (!matches.length) {
        finishCascade();
        return;
      }
      combo += 1;
      score += matches.length * 10 * combo;
      renderHud();
      matches.forEach(function (index) {
        tiles[index].classList.add("is-popping");
      });
      pendingMatches = matches;
      cascadeId = window.setTimeout(function () {
        cascadeId = null;
        popPendingMatches();
        render();
        cascadeId = window.setTimeout(resolveCascades, 230);
      }, 190);
    }

    function popPendingMatches() {
      pendingMatches.forEach(function (index) {
        board[index] = -1;
      });
      pendingMatches = [];
      collapseAndRefill();
    }

    function stopAnimations() {
      window.clearTimeout(cascadeId);
      cascadeId = null;
      shakeTimers.forEach(function (id) {
        window.clearTimeout(id);
      });
      shakeTimers = [];
    }

    function finishCascade() {
      comboEl.textContent = String(combo);
      var guard = 0;
      while (!availableMoveExists() && guard < 200) {
        fillBoard();
        guard += 1;
      }
      render();
      busy = false;
      if (score >= level.target) {
        levelCleared();
      } else if (movesLeft <= 0) {
        resultEl.textContent =
          t("inkOut", { n: score, t: level.target }) + " " + t("inkRetry");
      }
    }

    function attemptSwap(a, b) {
      swapColors(a, b);
      if (!findMatches().length) {
        swapColors(a, b);
        tiles[a].classList.add("is-shake");
        tiles[b].classList.add("is-shake");
        shakeTimers.push(window.setTimeout(function () {
          tiles[a].classList.remove("is-shake");
          tiles[b].classList.remove("is-shake");
          render();
        }, 280));
        return;
      }
      movesLeft -= 1;
      combo = 0;
      busy = true;
      renderHud();
      render();
      cascadeId = window.setTimeout(resolveCascades, 190);
    }

    function tapTile(index) {
      if (busy || movesLeft <= 0) {
        return;
      }
      if (selected === -1) {
        selected = index;
        render();
        return;
      }
      if (selected === index) {
        selected = -1;
        render();
        return;
      }
      if (neighbours(selected, index)) {
        var from = selected;
        selected = -1;
        attemptSwap(from, index);
        return;
      }
      selected = index;
      render();
    }

    function buildBoard() {
      boardEl.textContent = "";
      tiles = [];
      for (var index = 0; index < inkSize * inkSize; index += 1) {
        (function (cellIndex) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "ink-tile";
          button.addEventListener("click", function () {
            tapTile(cellIndex);
          });
          boardEl.appendChild(button);
          tiles.push(button);
        })(index);
      }
    }

    function refreshPicker() {
      fillCampaignPicker(
        selectEl,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      selectEl.value = level.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function loadLevel(levelDef) {
      stopAnimations();
      pendingMatches = [];
      busy = false;
      level = levelDef;
      selected = -1;
      score = 0;
      combo = 0;
      movesLeft = level.moves;
      fillBoard();
      renderHud();
      refreshPicker();
      render();
      resultEl.textContent = t("inkReady", { n: level.target, m: level.moves });
    }

    function starThresholds(def) {
      return [
        Math.round(def.target * 1.4),
        Math.round(def.target * 1.2),
        def.target,
      ];
    }

    function levelCleared() {
      busy = true;
      var spare = Math.max(0, movesLeft);
      var starsWon = starsFor(score, starThresholds(level), "high");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: score,
      });
      var message = t("inkCleared", {
        name: t(level.labelKey),
        n: score,
        m: spare,
        stars: starsWon,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("inkNextPool");
      } else if (campaign.clearedCount() === inkLevels.length) {
        message += " " + t("inkCampaignDone");
      }
      logAction(t("logInk", { name: t(level.labelKey), n: score }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(inkLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(inkLevels[index]);
      }
    });

    newBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    /* The drawer calls this on tab switch and on close: no timer may outlive
     * the panel, and the tiles have to come back whole rather than frozen
     * mid-pop. The swap was already spent, so its matches are resolved here
     * without the animation delays rather than dropped. */
    App.quietResetInkCascade = function () {
      stopAnimations();
      if (!busy) {
        render();
        return;
      }
      /* A popping match has already earned its points; finish its removal
       * before looking for the next chain reaction. */
      if (pendingMatches.length) {
        popPendingMatches();
      }
      var guard = 0;
      var matches = findMatches();
      while (matches.length && guard < 200) {
        combo += 1;
        score += matches.length * 10 * combo;
        matches.forEach(function (index) {
          board[index] = -1;
        });
        collapseAndRefill();
        matches = findMatches();
        guard += 1;
      }
      render();
      renderHud();
      finishCascade();
    };

    buildBoard();
    loadLevel(inkLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initInkCascadeGame = initInkCascadeGame;
})(window.CapitalConvert = window.CapitalConvert || {});
