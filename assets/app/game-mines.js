/* Glyph Mines - The minesweeper mini-game in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var mnBestKey = "glyph-mines-best";
  var mnSize = 9;
  var mnMines = 12;
  var mnMineGlyph = "\u96F7";
  var mnFlagGlyph = "\u2691";
  var mnNumberColors = [
    "",
    "#22d3ee",
    "#a3e635",
    "#fbbf24",
    "#f472b6",
    "#a78bfa",
    "#67e8f9",
    "#f87171",
    "#e2e8f0",
  ];

  function initMinesGame() {
    var gridEl = getElement("mnGrid");
    var minesEl = getElement("mnMineStat");
    var flagsEl = getElement("mnFlagStat");
    var timeEl = getElement("mnTime");
    var resultEl = getElement("mnResult");
    var startBtn = getElement("mnStartBtn");
    var flagBtn = getElement("mnFlagBtn");
    var bestEl = getElement("mnBest");
    if (
      !gridEl ||
      !minesEl ||
      !flagsEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !flagBtn ||
      !bestEl
    ) {
      return;
    }

    var cells = [];
    var buttons = [];
    var started = false;
    var over = false;
    var flagMode = false;
    var startedAt = 0;
    var timerId = null;
    var revealedCount = 0;
    var flagCount = 0;

    function readBest() {
      var value = parseInt(localStorage.getItem(mnBestKey), 10);
      return isNaN(value) ? 0 : value;
    }

    function renderBest() {
      var best = readBest();
      bestEl.textContent = best
        ? t("bestTime", { s: (best / 1000).toFixed(1) })
        : t("noBest");
    }

    function indexAt(x, y) {
      return y * mnSize + x;
    }

    function neighbours(index) {
      var x = index % mnSize;
      var y = Math.floor(index / mnSize);
      var list = [];
      for (var dy = -1; dy <= 1; dy += 1) {
        for (var dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) {
            continue;
          }
          var nx = x + dx;
          var ny = y + dy;
          if (nx >= 0 && nx < mnSize && ny >= 0 && ny < mnSize) {
            list.push(indexAt(nx, ny));
          }
        }
      }
      return list;
    }

    /* Mines move after the first dig so the opening cut is always safe -
     * the classic courtesy that keeps a 9x9 from feeling like a coin flip. */
    function placeMines(safeIndex) {
      var banned = [safeIndex].concat(neighbours(safeIndex));
      var placed = 0;
      while (placed < mnMines) {
        var spot = Math.floor(Math.random() * cells.length);
        if (
          !cells[spot].mine &&
          banned.indexOf(spot) === -1
        ) {
          cells[spot].mine = true;
          placed += 1;
        }
      }
      cells.forEach(function (cell, index) {
        cell.adj = neighbours(index).filter(function (n) {
          return cells[n].mine;
        }).length;
      });
    }

    function renderCell(index) {
      var cell = cells[index];
      var button = buttons[index];
      button.textContent = "";
      button.className = "mn-cell";
      button.style.color = "";
      if (cell.flagged) {
        button.classList.add("is-flagged");
        button.textContent = mnFlagGlyph;
      }
      if (cell.revealed) {
        button.classList.add("is-open");
        if (cell.mine) {
          button.classList.add("is-mine");
          button.textContent = mnMineGlyph;
        } else if (cell.adj > 0) {
          button.textContent = String(cell.adj);
          button.style.color = mnNumberColors[cell.adj];
        }
      }
      button.setAttribute(
        "aria-label",
        t("mnCell", { n: index + 1 }) +
          (cell.revealed
            ? ", " + (cell.mine ? t("mnMine") : String(cell.adj || ""))
            : cell.flagged
              ? ", " + t("mnFlagged")
              : ""),
      );
    }

    function renderAll() {
      for (var index = 0; index < cells.length; index += 1) {
        renderCell(index);
      }
      minesEl.textContent = String(mnMines - flagCount);
      flagsEl.textContent = String(flagCount);
    }

    function tick() {
      if (!started || over) {
        return;
      }
      timeEl.textContent = ((Date.now() - startedAt) / 1000).toFixed(1) + "s";
    }

    function startTimer() {
      startedAt = Date.now();
      timerId = window.setInterval(tick, 100);
    }

    function buildIdle() {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
      cells = [];
      for (var index = 0; index < mnSize * mnSize; index += 1) {
        cells.push({ mine: false, adj: 0, revealed: false, flagged: false });
      }
      started = false;
      over = false;
      revealedCount = 0;
      flagCount = 0;
      timeEl.textContent = "0.0s";
      renderAll();
      renderBest();
      resultEl.textContent = t("mnPrompt");
    }

    function boom(index) {
      over = true;
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
      cells.forEach(function (cell) {
        if (cell.mine) {
          cell.revealed = true;
        }
      });
      buttons[index].classList.add("is-boom");
      renderAll();
      resultEl.textContent = t("mnBoom");
      logAction(t("logMines", { s: "\u2014" }));
      petNotifyGame(false);
    }

    function checkCleared() {
      if (revealedCount !== mnSize * mnSize - mnMines) {
        return;
      }
      over = true;
      var elapsedMs = Math.max(1, Date.now() - startedAt);
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
      var previousBest = readBest();
      var isBest = !previousBest || elapsedMs < previousBest;
      if (isBest) {
        localStorage.setItem(mnBestKey, String(elapsedMs));
      }
      resultEl.textContent =
        t("mnCleared", { s: (elapsedMs / 1000).toFixed(1) }) +
        (isBest ? " " + t("newBest") : "");
      renderBest();
      logAction(t("logMines", { s: (elapsedMs / 1000).toFixed(1) }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(isBest);
    }

    function reveal(index) {
      var stack = [index];
      while (stack.length) {
        var current = stack.pop();
        var cell = cells[current];
        if (cell.revealed || cell.flagged) {
          continue;
        }
        cell.revealed = true;
        revealedCount += 1;
        if (cell.mine) {
          boom(current);
          return;
        }
        if (cell.adj === 0) {
          neighbours(current).forEach(function (n) {
            if (!cells[n].revealed) {
              stack.push(n);
            }
          });
        }
      }
      checkCleared();
    }

    function toggleFlag(index) {
      if (over || cells[index].revealed) {
        return;
      }
      cells[index].flagged = !cells[index].flagged;
      flagCount += cells[index].flagged ? 1 : -1;
      renderAll();
    }

    function dig(index) {
      if (over || cells[index].revealed) {
        return;
      }
      if (!started) {
        placeMines(index);
        started = true;
        startTimer();
        resultEl.textContent = t("mnGo");
      }
      if (flagMode) {
        toggleFlag(index);
        return;
      }
      reveal(index);
      renderAll();
    }

    function buildGrid() {
      gridEl.textContent = "";
      buttons = [];
      for (var index = 0; index < mnSize * mnSize; index += 1) {
        (function (cellIndex) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "mn-cell";
          button.addEventListener("click", function () {
            dig(cellIndex);
          });
          button.addEventListener("contextmenu", function (event) {
            event.preventDefault();
            toggleFlag(cellIndex);
          });
          gridEl.appendChild(button);
          buttons.push(button);
        })(index);
      }
    }

    flagBtn.addEventListener("click", function () {
      flagMode = !flagMode;
      flagBtn.setAttribute("aria-pressed", String(flagMode));
      flagBtn.classList.toggle("is-active", flagMode);
      resultEl.textContent = t(flagMode ? "mnFlagOn" : "mnFlagOff");
    });

    startBtn.addEventListener("click", function () {
      buildIdle();
    });

    App.quietResetMines = function () {
      if (timerId !== null || (!over && revealedCount > 0)) {
        buildIdle();
      }
    };

    buildGrid();
    buildIdle();
  }


  /* Exported for the other modules. */
  App.initMinesGame = initMinesGame;
})(window.CapitalConvert = window.CapitalConvert || {});
