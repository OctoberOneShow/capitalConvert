/* Glyph Fifteen - The sliding-tile campaign in the shared game drawer.
 * Deals are shuffled by legal walks from the solved grid, so every board
 * is solvable by construction; the checks replay the walks. */
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
  var ftSize = 320;
  var FT_GRID = 4;
  /* Star thresholds are slide counts [3-star, 2-star, 1-star]. */
  var ftLevels = [
    { id: "t1", labelKey: "ftL1", grid: 3, walk: 60, starMoves: [24, 40, 70] },
    { id: "t2", labelKey: "ftL2", grid: 3, walk: 130, starMoves: [28, 46, 80] },
    { id: "t3", labelKey: "ftL3", grid: 3, walk: 220, starMoves: [32, 52, 90] },
    { id: "t4", labelKey: "ftL4", grid: 4, walk: 300, starMoves: [80, 140, 220] },
    { id: "t5", labelKey: "ftL5", grid: 4, walk: 440, starMoves: [95, 160, 260] },
    { id: "t6", labelKey: "ftL6", grid: 4, walk: 600, starMoves: [110, 180, 300] },
    { id: "t7", labelKey: "ftL7", grid: 4, walk: 800, starMoves: [130, 215, 340] },
    { id: "t8", labelKey: "ftL8", grid: 4, walk: 1000, starMoves: [150, 250, 400] },
  ];

  function initGlyphFifteenGame() {
    var canvas = getElement("ftCanvas");
    var movesEl = getElement("ftMoves");
    var placedEl = getElement("ftPlaced");
    var timeEl = getElement("ftTime");
    var resultEl = getElement("ftResult");
    var startBtn = getElement("ftNewBtn");
    var bestEl = getElement("ftBest");
    var selectEl = getElement("ftLevelSel");
    if (
      !canvas ||
      !movesEl ||
      !placedEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "glyph-fifteen-campaign", levels: ftLevels });
    var level = ftLevels[0];
    var gridN = 3;
    var tiles = [];
    var blank = 0;
    var moves = 0;
    var solved = false;
    var rafId = null;
    var startedAt = 0;
    var clockRunning = false;
    var flash = [];

    /* Pure deal generator, exported for the checks: walk the blank legally
     * from the solved grid. Returns the tile layout as a flat array where
     * 0 marks the blank. */
    function ftShuffle(n, walk) {
      var board = [];
      var total = n * n;
      for (var i = 0; i < total; i += 1) {
        board.push((i + 1) % total);
      }
      var pos = total - 1;
      var lastDir = -1;
      var DX = [1, 0, -1, 0];
      var DY = [0, 1, 0, -1];
      var steps = 0;
      var guard = 0;
      while (steps < walk && guard < walk * 40) {
        guard += 1;
        var dir = Math.floor(Math.random() * 4);
        if (dir === lastDir) {
          continue;
        }
        var x = pos % n;
        var y = Math.floor(pos / n);
        var mx = x + DX[dir];
        var my = y + DY[dir];
        if (mx < 0 || my < 0 || mx >= n || my >= n) {
          continue;
        }
        var src = my * n + mx;
        board[pos] = board[src];
        board[src] = 0;
        pos = src;
        lastDir = (dir + 2) % 4;
        steps += 1;
      }
      var done = true;
      for (var k = 0; k < total; k += 1) {
        if (board[k] !== (k + 1) % total) {
          done = false;
          break;
        }
      }
      if (done) {
        return ftShuffle(n, walk);
      }
      return { board: board, blank: pos, walk: steps };
    }
    App.glyphFifteenShuffle = ftShuffle;

    function renderHud() {
      movesEl.textContent = String(moves);
      var placed = 0;
      for (var i = 0; i < tiles.length; i += 1) {
        if (i !== blank && tiles[i] === (i + 1) % tiles.length) {
          placed += 1;
        }
      }
      placedEl.textContent = placed + "/" + (tiles.length - 1);
      timeEl.textContent = clockRunning
        ? ((Date.now() - startedAt) / 1000).toFixed(1) + "s"
        : timeEl.textContent;
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
      level = levelDef;
      gridN = level.grid;
      var deal = ftShuffle(gridN, level.walk);
      tiles = deal.board;
      blank = deal.blank;
      moves = 0;
      solved = false;
      clockRunning = false;
      flash = [];
      startedAt = Date.now();
      renderHud();
      refreshPicker();
      startLoop();
      draw();
      resultEl.textContent = t("ftReady", { n: gridN * gridN - 1 });
    }

    function isSolved() {
      for (var i = 0; i < tiles.length; i += 1) {
        if (tiles[i] !== (i + 1) % tiles.length) {
          return false;
        }
      }
      return true;
    }

    function checkCleared() {
      if (solved || !isSolved()) {
        return;
      }
      solved = true;
      clockRunning = false;
      var starsWon = starsFor(moves, level.starMoves, "low");
      if (starsWon <= 0) {
        starsWon = 1;
      }
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: moves,
        better: "low",
      });
      var message = t("ftCleared", { n: moves, stars: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("ftNextBoard");
      } else if (campaign.clearedCount() === ftLevels.length) {
        message += " " + t("ftCampaignDone");
      }
      logAction(t("logGlyphFifteen", { n: moves }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(ftLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function slide(tileIndex) {
      if (solved || tileIndex < 0 || tileIndex >= tiles.length) {
        return false;
      }
      var tx = tileIndex % gridN;
      var ty = Math.floor(tileIndex / gridN);
      var bx = blank % gridN;
      var by = Math.floor(blank / gridN);
      if (Math.abs(tx - bx) + Math.abs(ty - by) !== 1) {
        return false;
      }
      tiles[blank] = tiles[tileIndex];
      tiles[tileIndex] = 0;
      blank = tileIndex;
      moves += 1;
      flash.push({ i: tileIndex, life: 1 });
      if (!clockRunning) {
        clockRunning = true;
        startedAt = Date.now();
      }
      renderHud();
      draw();
      checkCleared();
      return true;
    }

    /* Click a tile in the blank's row or column: the whole run slides. */
    function slideRun(tileIndex) {
      if (solved) {
        return;
      }
      var tx = tileIndex % gridN;
      var ty = Math.floor(tileIndex / gridN);
      var bx = blank % gridN;
      var by = Math.floor(blank / gridN);
      if (tx !== bx && ty !== by) {
        return;
      }
      var step = tx === bx ? (ty < by ? -gridN : gridN) : tx < bx ? -1 : 1;
      var cur = blank;
      while (cur !== tileIndex) {
        var next = cur - step;
        if (!slide(next)) {
          break;
        }
        cur = next;
      }
    }

    function geometry() {
      var cell = Math.floor((ftSize - 16) / gridN);
      return {
        cell: cell,
        x0: Math.floor((ftSize - cell * gridN) / 2),
        y0: Math.floor((ftSize - cell * gridN) / 2),
      };
    }

    function draw() {
      var time = Date.now();
      var geo = geometry();
      ctx.clearRect(0, 0, ftSize, ftSize);
      for (var i = 0; i < tiles.length; i += 1) {
        var x = i % gridN;
        var y = Math.floor(i / gridN);
        var gx = geo.x0 + x * geo.cell;
        var gy = geo.y0 + y * geo.cell;
        ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
        ctx.fillRect(gx + 2, gy + 2, geo.cell - 4, geo.cell - 4);
        var value = tiles[i];
        if (!value) {
          continue;
        }
        var home = value === (i + 1) % tiles.length;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(gx + 4, gy + 4, geo.cell - 8, geo.cell - 8, 8);
        } else {
          ctx.rect(gx + 4, gy + 4, geo.cell - 8, geo.cell - 8);
        }
        ctx.fillStyle = home ? "rgba(163, 230, 53, 0.85)" : "rgba(34, 211, 238, 0.85)";
        ctx.shadowColor = home ? "#a3e635" : "#22d3ee";
        ctx.shadowBlur = home ? 10 + Math.sin(time / 240 + i) * 3 : 6;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#101426";
        ctx.font = "bold " + Math.floor(geo.cell * 0.4) + "px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(value), gx + geo.cell / 2, gy + geo.cell / 2 + 1);
      }
      flash.forEach(function (f) {
        var x = f.i % gridN;
        var y = Math.floor(f.i / gridN);
        ctx.globalAlpha = Math.max(0, f.life) * 0.8;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          geo.x0 + x * geo.cell + 3,
          geo.y0 + y * geo.cell + 3,
          geo.cell - 6,
          geo.cell - 6,
        );
        ctx.globalAlpha = 1;
      });
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      if (
        document.getElementById("gamePanelGlyphFifteen").hidden ||
        document.hidden
      ) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      if (clockRunning) {
        renderHud();
      }
      var alive = [];
      flash.forEach(function (f) {
        f.life -= 0.05;
        if (f.life > 0) {
          alive.push(f);
        }
      });
      flash = alive;
      draw();
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    function tileFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var px = (event.clientX - rect.left) * scaleX;
      var py = (event.clientY - rect.top) * scaleY;
      var geo = geometry();
      var x = Math.floor((px - geo.x0) / geo.cell);
      var y = Math.floor((py - geo.y0) / geo.cell);
      if (x < 0 || y < 0 || x >= gridN || y >= gridN) {
        return -1;
      }
      return y * gridN + x;
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var tile = tileFromEvent(event);
      if (tile !== -1) {
        slideRun(tile);
      }
    });

    canvas.addEventListener("keydown", function (event) {
      /* Arrows slide the tile that sits opposite the blank. */
      var target = null;
      var bx = blank % gridN;
      var by = Math.floor(blank / gridN);
      if (event.key === "ArrowUp" && by < gridN - 1) {
        target = blank + gridN;
      } else if (event.key === "ArrowDown" && by > 0) {
        target = blank - gridN;
      } else if (event.key === "ArrowLeft" && bx < gridN - 1) {
        target = blank + 1;
      } else if (event.key === "ArrowRight" && bx > 0) {
        target = blank - 1;
      }
      if (target !== null) {
        event.preventDefault();
        slide(target);
      }
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(ftLevels[index]);
      }
    });

    startBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    App.quietResetGlyphFifteen = function () {
      clockRunning = false;
      resultEl.textContent = t("ftPaused");
    };

    loadLevel(ftLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initGlyphFifteenGame = initGlyphFifteenGame;
})(window.CapitalConvert = window.CapitalConvert || {});
