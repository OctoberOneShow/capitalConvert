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
  var auroTau = Math.PI * 2;
  var auroDangerHue = 4;
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
  /* Numeric twins of auroraColors: the shared fx layer takes hsl() hue
   * numbers, not css colour strings. */
  var auroraHues = [190, 330, 83, 43, 262, 351, 199, 142];

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

    /* ---------------------------------------------------- presentation ---
     * Everything below drives only what the board looks and sounds like; the
     * puzzle rules, level table and campaign record stay untouched. The feel
     * layer and the sound bank are optional (the isolated harness boots a
     * single game without them), so each effect goes through a guarded call. */
    var anchor = auroAnchorNode(document);
    var hue = 18;
    var light = false;
    var boardCache = null;
    var revealAt = 0;
    var solvedAt = 0;
    var blockedMarks = [];
    var lastBlock = { cell: -1, at: 0 };
    var ceremonyDismiss = null;
    var celebrationTimer = null;
    var prevMoves = 0;
    var prevDone = 0;
    var renderGen = 0;

    function motionOff() {
      return App.isMotionOff
        ? App.isMotionOff()
        : document.documentElement.getAttribute("data-motion") === "off";
    }

    function calm() {
      return App.isMotionCalm
        ? App.isMotionCalm()
        : document.documentElement.getAttribute("data-motion") === "calm";
    }

    function hasEff(name) {
      var lib = App.fx;
      return !!(lib && typeof lib[name] === "function");
    }

    function eff(name) {
      if (!hasEff(name)) {
        return null;
      }
      return App.fx[name].apply(App.fx, Array.prototype.slice.call(arguments, 1));
    }

    function sound(name) {
      if (typeof App.playSfx === "function") {
        App.playSfx(name);
      }
    }

    function auroAnchorNode(documentRef) {
      var node = documentRef.createElement("div");
      node.className = "auro-anchor";
      node.setAttribute("aria-hidden", "true");
      if (documentRef.body) {
        documentRef.body.appendChild(node);
      }
      return node;
    }

    /* fx positions its nodes from an element's box, so a canvas game needs a
     * probe it can park on one cell. Fixed positioning keeps the math in
     * viewport pixels, which is what the shared effects write into theirs. */
    function anchorAt(x, y) {
      var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
      var wide = rect && rect.width ? rect.width : auroraSize;
      var scale = wide / auroraSize;
      var left = (rect && rect.left ? rect.left : 0) + (boardOrigin + x * cellSize + cellSize / 2) * scale;
      var top = (rect && rect.top ? rect.top : 0) + (boardOrigin + y * cellSize + cellSize / 2) * scale;
      var side = Math.max(18, cellSize * scale);
      anchor.style.left = left + "px";
      anchor.style.top = top + "px";
      anchor.style.width = side + "px";
      anchor.style.height = side + "px";
      return anchor;
    }

    function anchorCenter() {
      var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
      var wide = rect && rect.width ? rect.width : auroraSize;
      var high = rect && rect.height ? rect.height : auroraSize;
      anchor.style.left = (rect && rect.left ? rect.left : 0) + wide / 2 + "px";
      anchor.style.top = (rect && rect.top ? rect.top : 0) + high / 2 + "px";
      anchor.style.width = Math.max(30, wide * 0.55) + "px";
      anchor.style.height = Math.max(30, high * 0.55) + "px";
      return anchor;
    }

    function readTheme() {
      light = document.documentElement
        ? document.documentElement.getAttribute("data-theme") === "light"
        : false;
      var raw = "";
      try {
        raw = window.getComputedStyle(panelEl).getPropertyValue("--gp-hue");
      } catch (error) {
        raw = "";
      }
      var parsed = parseInt(raw, 10);
      hue = isNaN(parsed) ? 18 : parsed;
    }

    function auroClamp(value, low, high) {
      return value < low ? low : value > high ? high : value;
    }

    function easeOutBack(k) {
      var c1 = 1.70158;
      var c3 = c1 + 1;
      var m = k - 1;
      return 1 + c3 * m * m * m + c1 * m * m;
    }

    /* A rounded rectangle as a path, so the module never depends on the newer
     * ctx.roundRect being present. */
    function auroRoundRect(c, x, y, w, h, r) {
      var rad = Math.min(r, w / 2, h / 2);
      c.beginPath();
      c.moveTo(x + rad, y);
      c.lineTo(x + w - rad, y);
      c.quadraticCurveTo(x + w, y, x + w, y + rad);
      c.lineTo(x + w, y + h - rad);
      c.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
      c.lineTo(x + rad, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - rad);
      c.lineTo(x, y + rad);
      c.quadraticCurveTo(x, y, x + rad, y);
      c.closePath();
    }

    /* The static ground - cell wells plus the dot lattice - is drawn once per
     * level into an offscreen plate; the per-frame draw just blits it. */
    function boardBitmap() {
      if (boardCache) {
        return boardCache;
      }
      boardCache = document.createElement("canvas");
      boardCache.width = auroraSize;
      boardCache.height = auroraSize;
      var b = boardCache.getContext("2d");
      var inset = Math.max(2, cellSize * 0.09);
      for (var y = 0; y < gridSize; y += 1) {
        for (var x = 0; x < gridSize; x += 1) {
          var cx = boardOrigin + x * cellSize;
          var cy = boardOrigin + y * cellSize;
          auroRoundRect(b, cx + inset, cy + inset, cellSize - inset * 2, cellSize - inset * 2, cellSize * 0.2);
          if (light) {
            b.fillStyle = "hsla(" + hue + ", 42%, 30%, 0.06)";
            b.fill();
            b.strokeStyle = "hsla(" + hue + ", 42%, 24%, 0.1)";
          } else {
            b.fillStyle = "hsla(" + hue + ", 34%, 62%, 0.05)";
            b.fill();
            b.strokeStyle = "hsla(" + hue + ", 48%, 82%, 0.08)";
          }
          b.lineWidth = 1;
          b.stroke();
        }
      }
      b.fillStyle = light ? "rgba(30, 41, 59, 0.32)" : "rgba(148, 163, 184, 0.3)";
      for (var yy = 0; yy < gridSize; yy += 1) {
        for (var xx = 0; xx < gridSize; xx += 1) {
          var point = centerOf(cellIndex(xx, yy));
          b.fillRect(point.x - 1, point.y - 1, 2, 2);
        }
      }
      return boardCache;
    }

    /* One starfield layer behind the panel skin, mounted once: the board should
     * arrive as a sky, not a form. Skipped where the art library is absent. */
    function mountBackdrop() {
      var art = App.art;
      if (!panelEl || !art || !art.pattern) {
        return;
      }
      var layer = document.createElement("div");
      layer.className = "auro-backdrop";
      layer.setAttribute("aria-hidden", "true");
      layer.appendChild(art.pattern("stars", { hue: hue, sat: 30, tile: 26 }));
      panelEl.insertBefore(layer, panelEl.firstChild);
    }

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
      if (moves !== prevMoves) {
        movesEl.textContent = String(moves);
        /* The roll belongs to a board that may have been reloaded mid-roll,
         * so a stale generation snaps to whatever the chip already shows. */
        if (hasEff("countUp")) {
          var gen = renderGen;
          eff("countUp", movesEl, prevMoves, moves, {
            ms: 260,
            format: function (value) {
              return gen === renderGen ? String(value) : movesEl.textContent;
            },
          });
        }
        prevMoves = moves;
      }
      var doneCount = ribbons.filter(function (ribbon) {
        return ribbon.done;
      }).length;
      pipesEl.textContent = doneCount + "/" + ribbons.length;
      if (doneCount !== prevDone) {
        if (doneCount > prevDone) {
          eff("pop", pipesEl, { scale: 1.16, ms: 240 });
          var chip = pipesEl.parentNode;
          if (chip && chip.classList) {
            chip.classList.add("is-good");
            var round = renderGen;
            window.setTimeout(function () {
              if (round === renderGen && chip.classList) {
                chip.classList.remove("is-good");
              }
            }, 700);
          }
        }
        prevDone = doneCount;
      }
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
      if (celebrationTimer !== null) {
        window.clearTimeout(celebrationTimer);
        celebrationTimer = null;
      }
      if (ceremonyDismiss) {
        ceremonyDismiss();
        ceremonyDismiss = null;
      }
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
        return { cells: [a], end: b, done: false, grownAt: 0, doneAt: 0 };
      });
      moves = 0;
      solved = false;
      dragPair = -1;
      keyPair = -1;
      cursor = cellXy(endpoints[0].cell);
      clockRunning = false;
      startedAt = Date.now();
      /* Presentation resets for the fresh board. */
      renderGen += 1;
      boardCache = null;
      blockedMarks = [];
      lastBlock.cell = -1;
      solvedAt = 0;
      revealAt = motionOff() ? -1e9 : Date.now();
      prevMoves = 0;
      prevDone = 0;
      timeEl.textContent = "0.0s";
      renderHud();
      refreshPicker();
      startLoop();
      draw();
      resultEl.textContent = t("auroReady", { n: ribbons.length });
    }

    function noteBlocked(cell) {
      var now = Date.now();
      /* pointermove fires continuously while the finger rests on a forbidden
       * cell; one refusal per cell per beat is the whole message. */
      if (lastBlock.cell === cell && now - lastBlock.at < 380) {
        return;
      }
      lastBlock.cell = cell;
      lastBlock.at = now;
      if (!motionOff()) {
        blockedMarks.push({ cell: cell, at: now });
        if (blockedMarks.length > 6) {
          blockedMarks.shift();
        }
        var xy = cellXy(cell);
        var probe = anchorAt(xy.x, xy.y);
        eff("ring", probe, { hue: auroDangerHue });
        eff("burst", probe, { kind: "spark", count: 6, hue: auroDangerHue });
        eff("jolt", canvas, { dist: 3, ms: 200 });
        draw();
      }
      sound("miss");
    }

    function noteComplete(pairIndex, cell) {
      var xy = cellXy(cell);
      var probe = anchorAt(xy.x, xy.y);
      var pairHue = auroraHues[pairIndex % auroraHues.length];
      eff("ring", probe, { hue: pairHue });
      eff("burst", probe, { kind: "spark", count: 8, hue: pairHue });
      sound("match");
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
        ribbon.grownAt = Date.now();
        sound("tick");
        renderHud();
        draw();
        return;
      }
      var owner = ribbonAtCell(cell);
      var isOwnEnd = cell === ribbon.end;
      var endpoint = endpointAtCell(cell);
      if ((owner !== -1 && owner !== pairIndex) ||
          (endpoint && endpoint.pair !== pairIndex)) {
        noteBlocked(cell);
        return;
      }
      if (isOwnEnd) {
        /* Trim any tail beyond the twin, then close the loop. */
        ribbon.cells = ribbon.cells.slice(0, ribbon.cells.indexOf(last) + 1);
        ribbon.cells.push(cell);
        ribbon.done = true;
        ribbon.doneAt = Date.now();
        ribbon.grownAt = ribbon.doneAt;
        moves += 1;
        noteComplete(pairIndex, cell);
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
      ribbon.grownAt = Date.now();
      moves += 1;
      sound("step");
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
      var clearedLabel = t(level.labelKey);
      resultEl.textContent = message;
      startCelebration(message, starsWon, clearedLabel, nextId);
    }

    /* The solved weave blooms before the next board replaces it: a flash and a
     * star lift now, then one shot advances the campaign and the round ends as
     * a ceremony over the fresh board. */
    function startCelebration(message, starsWon, clearedLabel, nextId) {
      solvedAt = Date.now();
      eff("flash", canvas, { hue: hue, ms: 640 });
      eff("burst", anchorCenter(), { kind: "star", count: 18, hue: hue });
      sound("clear");
      if (celebrationTimer !== null) {
        window.clearTimeout(celebrationTimer);
      }
      celebrationTimer = window.setTimeout(function () {
        celebrationTimer = null;
        loadLevel(auroraLevels[campaign.indexOf(nextId)]);
        resultEl.textContent = message;
        ceremonyDismiss = eff("ceremony", panelEl, {
          tone: starsWon === 3 ? "win" : "clear",
          stars: starsWon,
          title: clearedLabel,
          lines: [message],
        });
      }, 1050);
    }

    /* ------------------------------------------------------------- drawing */

    function tracePath(cells) {
      ctx.beginPath();
      cells.forEach(function (cell, index) {
        var point = centerOf(cell);
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
    }

    function drawGround(now) {
      var alpha = motionOff() ? 1 : auroClamp((now - revealAt) / 420, 0, 1);
      if (alpha <= 0) {
        return;
      }
      ctx.globalAlpha = alpha;
      ctx.drawImage(boardBitmap(), 0, 0);
      ctx.globalAlpha = 1;
    }

    function drawRibbon(ribbon, pairIndex, now) {
      var color = auroraColors[pairIndex % auroraColors.length];
      var active = dragPair === pairIndex || keyPair === pairIndex;
      var last = ribbon.cells[ribbon.cells.length - 1];
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      tracePath(ribbon.cells);
      /* Outer haze, then the core: two strokes give the ribbon its volume. */
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(7, cellSize * 0.42);
      ctx.globalAlpha = ribbon.done ? (solved ? 0.34 : 0.3) : 0.2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.lineWidth = Math.max(4, cellSize * 0.24);
      ctx.globalAlpha = ribbon.done ? 0.95 : 0.8;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
      /* The white filament reads on top of the colour in both themes. */
      ctx.strokeStyle = "#ffffff";
      if (motionOff()) {
        ctx.lineWidth = Math.max(1.5, cellSize * 0.08);
        ctx.globalAlpha = ribbon.done ? 0.34 : 0.16;
        ctx.stroke();
      } else if (ribbon.done) {
        var age = now - ribbon.doneAt;
        if (age >= 0 && age < 1100) {
          /* A spark rides the finished ribbon end to end: the settle. */
          var k = age / 1100;
          var pathLen = (ribbon.cells.length - 1) * cellSize;
          ctx.setLineDash([cellSize * 0.85, pathLen + cellSize * 2]);
          ctx.lineDashOffset = -(k * pathLen * 1.15);
          ctx.lineWidth = Math.max(2, cellSize * 0.11);
          ctx.globalAlpha = (1 - k) * 0.9;
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.lineWidth = Math.max(1.5, cellSize * 0.08);
        ctx.globalAlpha = 0.34;
        ctx.stroke();
      } else if (active) {
        /* While drawing, a light pulse rides the open ribbon. */
        var dash = (now / 22) % (cellSize * 2.4);
        ctx.setLineDash([cellSize * 0.5, cellSize * 2.4]);
        ctx.lineDashOffset = -dash;
        ctx.lineWidth = Math.max(2, cellSize * 0.1);
        ctx.globalAlpha = 0.55;
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.lineWidth = Math.max(1.5, cellSize * 0.08);
        ctx.globalAlpha = 0.16;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      /* The head of the ribbon being drawn glows, and the newest cell blooms
       * in over a beat so growth reads segment by segment. */
      if (active && !ribbon.done && !motionOff()) {
        var head = centerOf(last);
        var g = auroClamp((now - ribbon.grownAt) / 240, 0, 1);
        var pool = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, cellSize * (0.5 + 0.1 * Math.sin(now / 170)));
        pool.addColorStop(0, "rgba(255,255,255,0.5)");
        pool.addColorStop(0.55, color);
        pool.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = pool;
        ctx.beginPath();
        ctx.arc(head.x, head.y, cellSize * 0.6, 0, auroTau);
        ctx.fill();
        if (g < 1) {
          ctx.beginPath();
          ctx.arc(head.x, head.y, cellSize * (0.16 + 0.22 * (1 - g)), 0, auroTau);
          ctx.fillStyle = "rgba(255,255,255," + (0.85 * (1 - g)).toFixed(3) + ")";
          ctx.fill();
        }
      }
    }

    function drawEndpoint(endpoint, index, now) {
      var color = auroraColors[endpoint.pair % auroraColors.length];
      var ribbon = ribbons[endpoint.pair];
      var point = centerOf(endpoint.cell);
      /* Endpoints deal in one by one on load instead of appearing as a set. */
      var k = 1;
      if (!motionOff()) {
        k = auroClamp((now - revealAt - index * (calm() ? 34 : 68)) / 300, 0, 1);
        if (k <= 0) {
          return;
        }
      }
      var pop = easeOutBack(k);
      var done = ribbon && ribbon.done;
      var wellR = cellSize * 0.44 * pop;
      var pool = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, Math.max(1, wellR));
      if (light) {
        pool.addColorStop(0, "rgba(15, 23, 42, 0.18)");
        pool.addColorStop(1, "rgba(15, 23, 42, 0)");
      } else {
        pool.addColorStop(0, "rgba(0, 0, 0, 0.55)");
        pool.addColorStop(1, "rgba(0, 0, 0, 0)");
      }
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(0.1, wellR), 0, auroTau);
      ctx.fill();
      /* Socket ring, twin dot, specular: a drawn terminal, not a plain dot. */
      ctx.beginPath();
      ctx.arc(point.x, point.y, cellSize * 0.3 * pop, 0, auroTau);
      ctx.strokeStyle = color;
      ctx.globalAlpha = done ? 0.95 : 0.55;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
      var dotR = cellSize * (done ? 0.2 : 0.17) * pop;
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(0.1, dotR), 0, auroTau);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = motionOff() ? 9 : 9 + Math.sin(now / 300 + endpoint.pair) * 4;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(point.x - dotR * 0.3, point.y - dotR * 0.34, dotR * 0.26, 0, auroTau);
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.fill();
      if (done) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, cellSize * 0.38, 0, auroTau);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    /* A refused move leaves a fading cross on the cell: shape, not just tint. */
    function drawBlocked(now) {
      if (motionOff()) {
        return;
      }
      ctx.lineCap = "round";
      for (var i = 0; i < blockedMarks.length; i += 1) {
        var mark = blockedMarks[i];
        var age = now - mark.at;
        if (age < 0 || age > 460) {
          continue;
        }
        var k = age / 460;
        var point = centerOf(mark.cell);
        var reach = cellSize * 0.28;
        ctx.strokeStyle = "hsl(" + auroDangerHue + ", 90%, 62%)";
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(point.x - reach, point.y - reach);
        ctx.lineTo(point.x + reach, point.y + reach);
        ctx.moveTo(point.x + reach, point.y - reach);
        ctx.lineTo(point.x - reach, point.y + reach);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(point.x, point.y, cellSize * (0.3 + k * 1.1), 0, auroTau);
        ctx.globalAlpha = (1 - k) * 0.7;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    /* Rings race outward from every terminal while the solved board holds. */
    function drawBloom(now) {
      if (motionOff() || !solvedAt) {
        return;
      }
      var k = (now - solvedAt) / 1150;
      if (k < 0 || k >= 1) {
        return;
      }
      for (var i = 0; i < endpoints.length; i += 1) {
        var endpoint = endpoints[i];
        var color = auroraColors[endpoint.pair % auroraColors.length];
        var point = centerOf(endpoint.cell);
        ctx.beginPath();
        ctx.arc(point.x, point.y, cellSize * (0.34 + easeOutBack(Math.min(1, k * 1.2)) * 2.1), 0, auroTau);
        ctx.strokeStyle = color;
        ctx.globalAlpha = (1 - k) * 0.75;
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }
      var mid = centerOf(cellIndex(Math.floor(gridSize / 2), Math.floor(gridSize / 2)));
      ctx.beginPath();
      ctx.arc(mid.x, mid.y, auroraSize * (0.1 + k * 0.55), 0, auroTau);
      ctx.strokeStyle = "#ffffff";
      ctx.globalAlpha = (1 - k) * 0.22;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function drawCursorRing(now) {
      var point = centerOf(cellIndex(cursor.x, cursor.y));
      var wobble = motionOff() ? 0 : 0.03 * Math.sin(now / 260);
      ctx.beginPath();
      ctx.arc(point.x, point.y, cellSize * (0.32 + wobble), 0, Math.PI * 2);
      ctx.strokeStyle = keyPair >= 0
        ? auroraColors[keyPair % auroraColors.length]
        : "rgba(255, 255, 255, 0.8)";
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    function draw() {
      var now = Date.now();
      ctx.clearRect(0, 0, auroraSize, auroraSize);
      drawGround(now);
      ribbons.forEach(function (ribbon, pairIndex) {
        drawRibbon(ribbon, pairIndex, now);
      });
      endpoints.forEach(function (endpoint, index) {
        drawEndpoint(endpoint, index, now);
      });
      drawBlocked(now);
      drawBloom(now);
      drawCursorRing(now);
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
      /* The board between "solved" and the next load is already finished; no
       * grab may unpick it during the bloom. */
      if (solved) {
        return;
      }
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
      ribbon.grownAt = Date.now();
      sound("select");
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
        sound("click");
      }
    });

    startBtn.addEventListener("click", function () {
      loadLevel(level);
      eff("sweep", startBtn);
      sound("click");
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

    /* The drawer hides this panel on every tab switch: stop the clock, fold any
     * ceremony and stay quiet. The pending advance shot (if one is mid-bloom)
     * still fires - the clear is already recorded, so cancelling it would
     * desync the saved campaign from the board. */
    App.quietResetAuroraFlow = function () {
      clockRunning = false;
      if (ceremonyDismiss) {
        ceremonyDismiss();
        ceremonyDismiss = null;
      }
      resultEl.textContent = t("auroPaused");
    };

    if (window.MutationObserver && document.documentElement) {
      /* Theme and motion live on attributes; re-read the tokens and redraw the
       * ground plate once when the shell flips either. No timer. */
      var watcher = new window.MutationObserver(function () {
        readTheme();
        boardCache = null;
        draw();
      });
      watcher.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme", "data-motion"],
      });
    }

    readTheme();
    mountBackdrop();
    loadLevel(auroraLevels[campaign.indexOf(campaign.nextLevelId())]);
    startLoop();
  }


  /* Exported for the other modules. */
  App.initAuroraFlowGame = initAuroraFlowGame;
})(window.CapitalConvert = window.CapitalConvert || {});
