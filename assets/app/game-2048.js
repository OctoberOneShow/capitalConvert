/* 2048 - The sliding-tile mini-game in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var petNotifyGame = App.petNotifyGame;
  var g2048BestKey = "g2048-best";
  var g2048StateKey = "g2048-state";
  function initG2048() {
    var boardEl = getElement("g2048Board");
    var cellsEl = getElement("g2048Cells");
    var tilesEl = getElement("g2048Tiles");
    var overlayEl = getElement("g2048Overlay");
    var overlayText = getElement("g2048OverlayText");
    var retryBtn = getElement("g2048RetryBtn");
    var keepBtn = getElement("g2048KeepBtn");
    var scoreEl = getElement("g2048Score");
    var bestStatEl = getElement("g2048BestStat");
    var resultEl = getElement("g2048Result");
    var newBtn = getElement("g2048NewBtn");
    if (
      !boardEl ||
      !cellsEl ||
      !tilesEl ||
      !overlayEl ||
      !overlayText ||
      !retryBtn ||
      !keepBtn ||
      !scoreEl ||
      !bestStatEl ||
      !resultEl ||
      !newBtn
    ) {
      return;
    }

    var grid = emptyGrid();
    var score = 0;
    var won = false;
    var over = false;
    var tileSeq = 0;
    var bestAtStart = 0;

    function emptyGrid() {
      var rows = [];
      for (var r = 0; r < 4; r += 1) {
        rows.push([null, null, null, null]);
      }
      return rows;
    }

    function readBest() {
      var value = parseInt(localStorage.getItem(g2048BestKey), 10);
      return isNaN(value) ? 0 : value;
    }

    function renderBest() {
      bestStatEl.textContent = String(readBest());
    }

    function positionTile(tile) {
      tile.el.style.setProperty("--x", String(tile.c));
      tile.el.style.setProperty("--y", String(tile.r));
    }

    function createTile(tile, animate) {
      var el = document.createElement("div");
      el.className = "g2048-tile" + (animate ? " g2048-tile-new" : "");
      el.setAttribute("data-v", String(tile.value));
      el.textContent = String(tile.value);
      tile.el = el;
      positionTile(tile);
      tilesEl.appendChild(el);
    }

    function removeTileLater(el) {
      window.setTimeout(function () {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      }, 150);
    }

    function spawnTile() {
      var spots = [];
      for (var r = 0; r < 4; r += 1) {
        for (var c = 0; c < 4; c += 1) {
          if (!grid[r][c]) {
            spots.push({ r: r, c: c });
          }
        }
      }
      if (!spots.length) {
        return;
      }

      var spot = spots[Math.floor(Math.random() * spots.length)];
      var tile = {
        id: (tileSeq += 1),
        value: Math.random() < 0.9 ? 2 : 4,
        r: spot.r,
        c: spot.c,
        el: null,
      };
      grid[spot.r][spot.c] = tile;
      createTile(tile, true);
    }

    function canMove() {
      for (var r = 0; r < 4; r += 1) {
        for (var c = 0; c < 4; c += 1) {
          var tile = grid[r][c];
          if (!tile) {
            return true;
          }
          if (c < 3 && grid[r][c + 1] && grid[r][c + 1].value === tile.value) {
            return true;
          }
          if (r < 3 && grid[r + 1][c] && grid[r + 1][c].value === tile.value) {
            return true;
          }
        }
      }
      return false;
    }

    function hasValue(value) {
      for (var r = 0; r < 4; r += 1) {
        for (var c = 0; c < 4; c += 1) {
          if (grid[r][c] && grid[r][c].value === value) {
            return true;
          }
        }
      }
      return false;
    }

    function showOverlay(text, winMode) {
      overlayText.textContent = text;
      keepBtn.hidden = !winMode;
      overlayEl.hidden = false;
      retryBtn.focus();
    }

    function saveState() {
      var values = grid.map(function (row) {
        return row.map(function (tile) {
          return tile ? tile.value : 0;
        });
      });
      localStorage.setItem(
        g2048StateKey,
        JSON.stringify({ grid: values, score: score, won: won, over: over }),
      );
    }

    function restoreState() {
      var data = null;
      try {
        data = JSON.parse(localStorage.getItem(g2048StateKey) || "null");
      } catch (error) {
        data = null;
      }

      if (!data || data.over || !Array.isArray(data.grid)) {
        return false;
      }

      grid = emptyGrid();
      var hasTile = false;
      for (var r = 0; r < 4 && r < data.grid.length; r += 1) {
        var row = data.grid[r] || [];
        for (var c = 0; c < 4 && c < row.length; c += 1) {
          var value = row[c];
          if (value > 0) {
            var tile = {
              id: (tileSeq += 1),
              value: value,
              r: r,
              c: c,
              el: null,
            };
            grid[r][c] = tile;
            createTile(tile, true);
            hasTile = true;
          }
        }
      }

      if (!hasTile) {
        return false;
      }

      score = data.score || 0;
      won = !!data.won;
      over = false;
      scoreEl.textContent = String(score);
      return true;
    }

    function newGame() {
      tilesEl.innerHTML = "";
      grid = emptyGrid();
      score = 0;
      won = false;
      over = false;
      bestAtStart = readBest();
      overlayEl.hidden = true;
      scoreEl.textContent = "0";
      resultEl.textContent = t("g2048Prompt");
      spawnTile();
      spawnTile();
      saveState();
    }

    function move(direction) {
      if (over) {
        return;
      }

      var lines = [];
      for (var i = 0; i < 4; i += 1) {
        var line = [];
        for (var j = 0; j < 4; j += 1) {
          if (direction === "left") {
            line.push({ r: i, c: j });
          } else if (direction === "right") {
            line.push({ r: i, c: 3 - j });
          } else if (direction === "up") {
            line.push({ r: j, c: i });
          } else {
            line.push({ r: 3 - j, c: i });
          }
        }
        lines.push(line);
      }

      var moved = false;
      var gained = 0;
      var merged = [];

      lines.forEach(function (line) {
        var tiles = [];
        line.forEach(function (pos) {
          if (grid[pos.r][pos.c]) {
            tiles.push(grid[pos.r][pos.c]);
          }
        });

        var mergedLine = [];
        for (var k = 0; k < tiles.length; k += 1) {
          if (
            k + 1 < tiles.length &&
            tiles[k].value === tiles[k + 1].value
          ) {
            var combined = {
              id: (tileSeq += 1),
              value: tiles[k].value * 2,
              r: 0,
              c: 0,
              el: null,
            };
            gained += combined.value;
            merged.push({
              tile: combined,
              sources: [tiles[k], tiles[k + 1]],
            });
            mergedLine.push(combined);
            k += 1;
          } else {
            mergedLine.push(tiles[k]);
          }
        }

        line.forEach(function (pos, index) {
          var nextTile = mergedLine[index] || null;
          if (grid[pos.r][pos.c] !== nextTile) {
            moved = true;
          }
          grid[pos.r][pos.c] = nextTile;
          if (nextTile) {
            nextTile.r = pos.r;
            nextTile.c = pos.c;
          }
        });
      });

      if (!moved) {
        return;
      }

      score += gained;
      scoreEl.textContent = String(score);
      if (score > readBest()) {
        localStorage.setItem(g2048BestKey, String(score));
        renderBest();
      }

      grid.forEach(function (row) {
        row.forEach(function (tile) {
          if (tile && tile.el) {
            positionTile(tile);
          }
        });
      });

      merged.forEach(function (entry) {
        entry.sources.forEach(function (source) {
          if (source.el) {
            positionTile(source);
            removeTileLater(source.el);
            source.el = null;
          }
        });
        createTile(entry.tile, true);
      });

      spawnTile();

      if (!won && hasValue(2048)) {
        won = true;
        resultEl.textContent = t("g2048WinContinue");
        showOverlay(t("g2048Win"), true);
      } else if (!canMove()) {
        over = true;
        resultEl.textContent =
          t("g2048OverResult", { n: score }) +
          (score > 0 && score > bestAtStart ? " " + t("newBest") : "");
        showOverlay(t("g2048Over", { n: score }), false);
        petNotifyGame(score > 0 && score > bestAtStart);
      }

      saveState();
    }

    for (var cellIndex = 0; cellIndex < 16; cellIndex += 1) {
      cellsEl.appendChild(document.createElement("span"));
    }

    boardEl.addEventListener("keydown", function (event) {
      var directions = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      var direction = directions[event.key];
      if (!direction) {
        return;
      }
      event.preventDefault();
      move(direction);
    });

    var swipeStart = null;
    boardEl.addEventListener("pointerdown", function (event) {
      swipeStart = { x: event.clientX, y: event.clientY };
    });
    boardEl.addEventListener("pointerup", function (event) {
      if (!swipeStart) {
        return;
      }
      var dx = event.clientX - swipeStart.x;
      var dy = event.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        move(dx > 0 ? "right" : "left");
      } else {
        move(dy > 0 ? "down" : "up");
      }
    });

    retryBtn.addEventListener("click", newGame);
    keepBtn.addEventListener("click", function () {
      overlayEl.hidden = true;
      boardEl.focus();
    });
    newBtn.addEventListener("click", function () {
      newGame();
      boardEl.focus();
    });

    App.quietReset2048 = function () {
      saveState();
    };

    renderBest();
    if (!restoreState()) {
      newGame();
    } else {
      bestAtStart = readBest();
    }
  }


  /* Exported for the other modules. */
  App.initG2048 = initG2048;
})(window.CapitalConvert = window.CapitalConvert || {});
