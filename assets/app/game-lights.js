/* Lights Out - The flip-the-cross logic mini-game in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var litBestKey = "lights-out-best";
  var litSize = 5;
  /* Same ladder deal as the other games: each board starts from a fully
   * dark grid and this many random taps, so every board is solvable and
   * just a little messier than the last. */
  var litLevels = [
    { presses: 4 },
    { presses: 6 },
    { presses: 8 },
    { presses: 11 },
    { presses: 14 },
  ];

  function initLightsGame() {
    var gridEl = getElement("litGrid");
    var movesEl = getElement("litMoves");
    var levelEl = getElement("litLevel");
    var bestStatEl = getElement("litBestStat");
    var resultEl = getElement("litResult");
    var newBtn = getElement("litNewBtn");
    var bestEl = getElement("litBest");
    if (
      !gridEl ||
      !movesEl ||
      !levelEl ||
      !bestStatEl ||
      !resultEl ||
      !newBtn ||
      !bestEl
    ) {
      return;
    }

    var totalLevels = litLevels.length;
    var progress = readProgress();
    var level = clampLevel(progress.level);
    var cells = [];
    var moves = 0;
    var solved = false;
    var buttons = [];

    function clampLevel(value) {
      var parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 1) {
        return 1;
      }
      return Math.min(parsed, totalLevels);
    }

    function readProgress() {
      var raw = "";
      try {
        raw = localStorage.getItem(litBestKey) || "";
      } catch (error) {
        raw = "";
      }
      try {
        var parsed = JSON.parse(String(raw));
        if (parsed && typeof parsed === "object" && parsed.bests) {
          return { level: parsed.level, bests: parsed.bests };
        }
      } catch (error) {
        /* a fresh board beats a corrupted record */
      }
      return { level: 1, bests: {} };
    }

    function saveProgress() {
      try {
        localStorage.setItem(
          litBestKey,
          JSON.stringify({ level: clampLevel(progress.level), bests: progress.bests }),
        );
      } catch (error) {
        /* unrecorded but still playable */
      }
    }

    function levelBest() {
      var value = parseInt(progress.bests[String(level)], 10);
      return isNaN(value) ? 0 : value;
    }

    function indexAt(x, y) {
      return y * litSize + x;
    }

    function flipCell(index) {
      cells[index] = !cells[index];
    }

    function flipCross(index) {
      var x = index % litSize;
      var y = Math.floor(index / litSize);
      flipCell(index);
      if (x > 0) {
        flipCell(indexAt(x - 1, y));
      }
      if (x < litSize - 1) {
        flipCell(indexAt(x + 1, y));
      }
      if (y > 0) {
        flipCell(indexAt(x, y - 1));
      }
      if (y < litSize - 1) {
        flipCell(indexAt(x, y + 1));
      }
    }

    function renderCells() {
      for (var index = 0; index < cells.length; index += 1) {
        var on = cells[index];
        buttons[index].classList.toggle("is-on", on);
        buttons[index].setAttribute("aria-pressed", String(on));
        buttons[index].setAttribute(
          "aria-label",
          t("litCell", { n: index + 1 }) +
            ", " +
            t(on ? "litOn" : "litOff"),
        );
      }
    }

    function renderStats() {
      movesEl.textContent = String(moves);
      levelEl.textContent = level + "/" + totalLevels;
      var best = levelBest();
      bestStatEl.textContent = best ? String(best) : "\u2014";
      bestEl.textContent = best
        ? t("litBestLine", { n: best })
        : t("noBest");
    }

    function newBoard(playedLevel) {
      level = clampLevel(playedLevel);
      cells = [];
      for (var index = 0; index < litSize * litSize; index += 1) {
        cells.push(false);
      }
      var presses = litLevels[level - 1].presses;
      for (var press = 0; press < presses; press += 1) {
        flipCross(Math.floor(Math.random() * cells.length));
      }
      /* A shuffle may land on a solved board by chance; one extra cross
       * guarantees there is always something to do. */
      var dark = cells.every(function (on) {
        return !on;
      });
      if (dark) {
        flipCross(Math.floor(Math.random() * cells.length));
      }
      moves = 0;
      solved = false;
      renderCells();
      renderStats();
      resultEl.textContent = t("litPrompt");
    }

    function buildGrid() {
      gridEl.textContent = "";
      buttons = [];
      for (var index = 0; index < litSize * litSize; index += 1) {
        (function (cellIndex) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "lit-cell";
          button.addEventListener("click", function () {
            tapCell(cellIndex);
          });
          gridEl.appendChild(button);
          buttons.push(button);
        })(index);
      }
    }

    function isSolved() {
      return cells.every(function (on) {
        return !on;
      });
    }

    function tapCell(index) {
      if (solved) {
        return;
      }
      flipCross(index);
      moves += 1;

      if (isSolved()) {
        solved = true;
        var previousBest = levelBest();
        var isBest = !previousBest || moves < previousBest;
        if (isBest) {
          progress.bests[String(level)] = moves;
        }
        var message = t("litSolved", { n: moves });
        if (isBest) {
          message += " " + t("newBest");
        }
        if (level < totalLevels) {
          progress.level = level + 1;
          message +=
            " " +
            t("litLevelUp", { n: level + 1, total: totalLevels });
        } else {
          message += " " + t("litDone", { total: totalLevels });
        }
        saveProgress();
        resultEl.textContent = message;
        logAction(t("logLit", { n: moves }));
        var rect = newBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        petNotifyGame(isBest);
        renderStats();
        return;
      }

      renderCells();
      renderStats();
    }

    newBtn.addEventListener("click", function () {
      newBoard(solved ? clampLevel(progress.level) : level);
    });

    buildGrid();
    newBoard(level);
  }


  /* Exported for the other modules. */
  App.initLightsGame = initLightsGame;
})(window.CapitalConvert = window.CapitalConvert || {});
