/* Aurora Flow - The glowing ribbon numberlink campaign in the shared game drawer. */
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
  var auroraSize = 320;
  /* Each board lists its pairs by cell. Every board was designed around a
   * full disjoint path set, so a ribbon solution always exists. Star times
   * are [3-star, 2-star, 1-star] seconds. */
  var auroraLevels = [
    {
      id: "f1", labelKey: "auroL1", size: 5,
      pairs: [[0, 0, 4, 1], [0, 3, 4, 3], [2, 2, 4, 2], [0, 4, 4, 4]],
      starTimes: [15, 25, 40],
    },
    {
      id: "f2", labelKey: "auroL2", size: 5,
      pairs: [[0, 0, 4, 2], [0, 2, 2, 4], [3, 0, 4, 4], [0, 1, 1, 1], [0, 3, 0, 4]],
      starTimes: [20, 32, 48],
    },
    {
      id: "f3", labelKey: "auroL3", size: 6,
      pairs: [[0, 0, 5, 0], [0, 5, 5, 3], [2, 0, 1, 0], [3, 0, 4, 0], [2, 3, 4, 4]],
      starTimes: [24, 38, 55],
    },
    {
      id: "f4", labelKey: "auroL4", size: 6,
      pairs: [[0, 0, 3, 3], [0, 5, 5, 4], [1, 0, 5, 2], [1, 1, 2, 1], [5, 0, 5, 1], [5, 3, 3, 4]],
      starTimes: [30, 45, 65],
    },
    {
      id: "f5", labelKey: "auroL5", size: 7,
      pairs: [[0, 0, 1, 6], [6, 0, 5, 6], [1, 0, 5, 0], [2, 2, 4, 2], [1, 2, 1, 4], [2, 5, 4, 5], [3, 1, 3, 3]],
      starTimes: [38, 56, 80],
    },
    {
      id: "f6", labelKey: "auroL6", size: 7,
      pairs: [[0, 0, 6, 1], [0, 6, 6, 5], [0, 1, 2, 1], [0, 4, 2, 4], [1, 3, 3, 3], [3, 1, 4, 1], [5, 2, 3, 4], [6, 2, 3, 5]],
      starTimes: [46, 68, 95],
    },
    {
      id: "f7", labelKey: "auroL7", size: 6,
      pairs: [[0, 0, 5, 0], [0, 5, 5, 5], [0, 2, 0, 3], [5, 2, 5, 3]],
      starTimes: [30, 45, 65],
    },
    {
      id: "f8", labelKey: "auroL8", size: 7,
      pairs: [[0, 0, 2, 0], [6, 0, 4, 0], [0, 6, 2, 6], [6, 6, 6, 5], [3, 0, 3, 6]],
      starTimes: [36, 54, 78],
    },
  ];
  var auroraColors = [
    "#22d3ee", "#f472b6", "#a3e635", "#fbbf24",
    "#a78bfa", "#fb7185", "#38bdf8", "#4ade80",
  ];

  function initAuroraFlowGame() {
    var canvas = getElement("auroCanvas");
    var movesEl = getElement("auroMoves");
    var timeEl = getElement("auroTime");
    var pipesEl = getElement("auroPipes");
    var resultEl = getElement("auroResult");
    var startBtn = getElement("auroNewBtn");
    var bestEl = getElement("auroBest");
    var selectEl = getElement("auroLevelSel");
    var panelEl = getElement("gamePanelAuroraFlow");
    if (
      !canvas ||
      !movesEl ||
      !timeEl ||
      !pipesEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "aurora-flow-campaign", levels: auroraLevels });
    var level = auroraLevels[0];
    var gridSize = level.size;
    var cellSize = 0;
    var boardOrigin = 0;
    /* One ribbon per pair: an ordered list of cell indices from endpoint A
     * toward endpoint B, plus a completion flag. */
    var ribbons = [];
    var endpoints = [];
    var moves = 0;
    var solved = false;
    var dragPair = -1;
    var keyPair = -1;
    var cursor = { x: 0, y: 0 };
    var rafId = null;
    var startedAt = 0;
    var clockRunning = false;

    function cellIndex(x, y) {
      return y * gridSize + x;
    }

    function cellXy(index) {
      return { x: index % gridSize, y: Math.floor(index / gridSize) };
    }

    function centerOf(index) {
      var xy = cellXy(index);
      return {
        x: boardOrigin + xy.x * cellSize + cellSize / 2,
        y: boardOrigin + xy.y * cellSize + cellSize / 2,
      };
    }

    function paintMap() {
      /* cell -> pair index, so a drag knows which ribbons it may cross. */
      var map = {};
      ribbons.forEach(function (ribbon, pairIndex) {
        ribbon.cells.forEach(function (cell) {
          map[cell] = pairIndex;
        });
      });
      return map;
    }

    function ribbonAtCell(cell) {
      for (var index = 0; index < ribbons.length; index += 1) {
        if (ribbons[index].cells.indexOf(cell) !== -1) {
          return index;
        }
      }
      return -1;
    }

    function endpointAtCell(cell) {
      for (var index = 0; index < endpoints.length; index += 1) {
        if (endpoints[index].cell === cell) {
          return endpoints[index];
        }
      }
      return null;
    }

    function areNeighbours(a, b) {
      var ax = a % gridSize;
      var ay = Math.floor(a / gridSize);
      var bx = b % gridSize;
      var by = Math.floor(b / gridSize);
      return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
    }

    function renderHud() {
      movesEl.textContent = String(moves);
      pipesEl.textContent =
        ribbons.filter(function (ribbon) { return ribbon.done; }).length +
        "/" +
        ribbons.length;
      timeEl.textContent = clockRunning
        ? ((Date.now() - startedAt) / 1000).toFixed(1) + "s"
        : timeEl.textContent;
    }

    function allDone() {
      return ribbons.every(function (ribbon) {
        return ribbon.done;
      });
    }

    function loadLevel(levelDef) {
      level = levelDef;
      gridSize = level.size;
      cellSize = Math.floor((auroraSize - 16) / gridSize);
      boardOrigin = Math.floor((auroraSize - cellSize * gridSize) / 2);
      endpoints = [];
      ribbons = level.pairs.map(function (pair, pairIndex) {
        var a = cellIndex(pair[0], pair[1]);
        var b = cellIndex(pair[2], pair[3]);
        endpoints.push({ cell: a, pair: pairIndex });
        endpoints.push({ cell: b, pair: pairIndex });
        return { cells: [a], end: b, done: false };
      });
      moves = 0;
      solved = false;
      dragPair = -1;
      keyPair = -1;
      cursor = cellXy(endpoints[0].cell);
      clockRunning = false;
      startedAt = Date.now();
      renderHud();
      refreshPicker();
      startLoop();
      draw();
      resultEl.textContent = t("auroReady", { n: ribbons.length });
    }

    function extendRibbon(pairIndex, cell) {
      if (solved || pairIndex < 0) {
        return;
      }
      var ribbon = ribbons[pairIndex];
      var last = ribbon.cells[ribbon.cells.length - 1];
      if (cell === last) {
        return;
      }
      if (!areNeighbours(last, cell)) {
        return;
      }
      /* Stepping back onto the previous cell rewinds the ribbon. */
      var penultimate = ribbon.cells[ribbon.cells.length - 2];
      if (cell === penultimate) {
        ribbon.cells.pop();
        ribbon.done = false;
        renderHud();
        draw();
        return;
      }
      var owner = ribbonAtCell(cell);
      var isOwnEnd = cell === ribbon.end;
      var endpoint = endpointAtCell(cell);
      if ((owner !== -1 && owner !== pairIndex) ||
          (endpoint && endpoint.pair !== pairIndex)) {
        return;
      }
      if (isOwnEnd) {
        /* Trim any tail beyond the twin, then close the loop. */
        ribbon.cells = ribbon.cells.slice(0, ribbon.cells.indexOf(last) + 1);
        ribbon.cells.push(cell);
        ribbon.done = true;
        moves += 1;
        renderHud();
        draw();
        checkCleared();
        return;
      }
      if (owner === pairIndex) {
        return;
      }
      ribbon.cells.push(cell);
      ribbon.done = false;
      moves += 1;
      renderHud();
      draw();
      checkCleared();
    }

    function checkCleared() {
      if (solved || !allDone()) {
        return;
      }
      solved = true;
      clockRunning = false;
      var seconds = Math.max(0.1, (Date.now() - startedAt) / 1000);
      var starsWon = starsFor(Math.round(seconds * 10) / 10, level.starTimes, "low");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: Math.round(seconds * 10) / 10,
        better: "low",
      });
      var message = t("auroCleared", { s: seconds.toFixed(1), stars: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("auroNextBoard");
      } else if (campaign.clearedCount() === auroraLevels.length) {
        message += " " + t("auroCampaignDone");
      }
      logAction(t("logAuroraFlow", { n: level.labelKey ? t(level.labelKey) : level.id }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(auroraLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function drawRibbon(ribbon, color, time) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ribbon.cells.forEach(function (cell, index) {
        var point = centerOf(cell);
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      /* The last segment stretches toward the twin only when done, so an
       * unfinished ribbon visibly dangles short of its goal. */
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(6, cellSize * 0.32);
      ctx.globalAlpha = 0.28;
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.lineWidth = Math.max(4, cellSize * 0.22);
      ctx.globalAlpha = 0.95;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      /* A slow light pulse rides the ribbon so the board feels alive. */
      var dash = (time / 22) % (cellSize * 2.4);
      ctx.setLineDash([cellSize * 0.5, cellSize * 2.4]);
      ctx.lineDashOffset = -dash;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(2, cellSize * 0.1);
      ctx.globalAlpha = 0.55;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    function drawCursorRing() {
      var point = centerOf(cellIndex(cursor.x, cursor.y));
      ctx.beginPath();
      ctx.arc(point.x, point.y, cellSize * 0.34, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function draw() {
      var time = Date.now();
      ctx.clearRect(0, 0, auroraSize, auroraSize);
      /* Dot lattice */
      ctx.fillStyle = "rgba(148, 163, 184, 0.28)";
      for (var y = 0; y < gridSize; y += 1) {
        for (var x = 0; x < gridSize; x += 1) {
          var point = centerOf(cellIndex(x, y));
          ctx.fillRect(point.x - 1, point.y - 1, 2, 2);
        }
      }
      ribbons.forEach(function (ribbon, pairIndex) {
        drawRibbon(ribbon, auroraColors[pairIndex % auroraColors.length], time);
      });
      endpoints.forEach(function (endpoint) {
        var point = centerOf(endpoint.cell);
        var color = auroraColors[endpoint.pair % auroraColors.length];
        ctx.beginPath();
        ctx.arc(point.x, point.y, cellSize * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10 + Math.sin(time / 300 + endpoint.pair) * 4;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(point.x, point.y, cellSize * 0.34, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
      drawCursorRing();
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      /* The shimmer is decoration: while the panel is hidden the loop
       * keeps its rAF slot but skips all work. */
      if (!panelEl || panelEl.hidden || document.hidden) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      if (clockRunning) {
        renderHud();
      }
      draw();
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function cellFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var x = Math.floor(((event.clientX - rect.left) * scaleX - boardOrigin) / cellSize);
      var y = Math.floor(((event.clientY - rect.top) * scaleY - boardOrigin) / cellSize);
      if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) {
        return -1;
      }
      return cellIndex(x, y);
    }

    function partnerCell(pairIndex, cell) {
      var pair = level.pairs[pairIndex];
      var a = cellIndex(pair[0], pair[1]);
      var b = cellIndex(pair[2], pair[3]);
      return cell === a ? b : a;
    }

    function beginDrag(cell) {
      var endpoint = endpointAtCell(cell);
      if (!endpoint) {
        return;
      }
      dragPair = endpoint.pair;
      var ribbon = ribbons[dragPair];
      var tail = ribbon.cells[ribbon.cells.length - 1];
      /* Grabbing either twin starts the ribbon fresh from that dot; the
       * far twin becomes the goal. */
      if (ribbon.done || cell !== tail) {
        ribbon.cells = [cell];
        ribbon.end = partnerCell(dragPair, cell);
        ribbon.done = false;
      }
      if (!clockRunning && !solved) {
        clockRunning = true;
        startedAt = Date.now();
      }
      draw();
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var cell = cellFromEvent(event);
      if (cell === -1) {
        return;
      }
      beginDrag(cell);
      /* Capture merely keeps a drag alive past the canvas edge, so a pointer id
       * the browser no longer tracks must not cost the player the whole drag. */
      if (canvas.setPointerCapture && event.pointerId !== undefined) {
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch (error) {
          /* no capture this time; the canvas listeners still fire */
        }
      }
    });

    canvas.addEventListener("pointermove", function (event) {
      if (dragPair === -1) {
        return;
      }
      var cell = cellFromEvent(event);
      if (cell !== -1) {
        extendRibbon(dragPair, cell);
      }
    });

    function endDrag() {
      if (dragPair === -1) {
        return;
      }
      dragPair = -1;
      checkCleared();
      draw();
    }

    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    canvas.addEventListener("keydown", function (event) {
      var step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (step) {
        event.preventDefault();
        cursor.x = Math.min(gridSize - 1, Math.max(0, cursor.x + step[0]));
        cursor.y = Math.min(gridSize - 1, Math.max(0, cursor.y + step[1]));
        if (keyPair !== -1) {
          if (!clockRunning && !solved) {
            clockRunning = true;
            startedAt = Date.now();
          }
          extendRibbon(keyPair, cellIndex(cursor.x, cursor.y));
        }
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (keyPair !== -1) {
          keyPair = -1;
          checkCleared();
          return;
        }
        var cell = cellIndex(cursor.x, cursor.y);
        var endpoint = endpointAtCell(cell);
        if (endpoint) {
          keyPair = endpoint.pair;
          beginDrag(cell);
        }
      }
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(auroraLevels[index]);
      }
    });

    startBtn.addEventListener("click", function () {
      loadLevel(level);
    });

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

    App.quietResetAuroraFlow = function () {
      clockRunning = false;
      resultEl.textContent = t("auroPaused");
    };

    loadLevel(auroraLevels[campaign.indexOf(campaign.nextLevelId())]);
    startLoop();
  }


  /* Exported for the other modules. */
  App.initAuroraFlowGame = initAuroraFlowGame;
})(window.CapitalConvert = window.CapitalConvert || {});
