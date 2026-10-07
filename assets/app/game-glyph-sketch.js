/* Glyph Sketch - The nonogram campaign in the shared game drawer. Every
 * picture is verified uniquely solvable by row/column logic alone; see
 * tools/static-checks.js. */
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
  var sketchSize = 320;
  var sketchClueSpace = 46;
  /* "#" cells form the picture; clues derive from the art itself.
   * Star times are [3-star, 2-star, 1-star] seconds. */
  var sketchLevels = [
    {
      id: "e1", labelKey: "skL1", starTimes: [25, 45, 75],
      art: [
        ".#.#.",
        "#####",
        "#####",
        ".###.",
        "..#..",
      ],
    },
    {
      id: "e2", labelKey: "skL2", starTimes: [30, 50, 80],
      art: [
        "#####",
        "#...#",
        "#...#",
        ".###.",
        "..#..",
      ],
    },
    {
      id: "e3", labelKey: "skL3", starTimes: [35, 60, 95],
      art: [
        "..#...",
        "..#...",
        ".###..",
        "######",
        "..#...",
        "..#...",
      ],
    },
    {
      id: "e4", labelKey: "skL4", starTimes: [40, 65, 100],
      art: [
        "####..",
        "...##.",
        "..##..",
        ".###..",
        ".##...",
        "##....",
      ],
    },
    {
      id: "e5", labelKey: "skL5", starTimes: [45, 75, 115],
      art: [
        "..###..",
        ".#####.",
        "#######",
        "##.#.##",
        "#######",
        "#######",
        "#.#.#.#",
      ],
    },
    {
      id: "e6", labelKey: "skL6", starTimes: [50, 80, 120],
      art: [
        ".#####.",
        "#######",
        "##.#.##",
        "#######",
        "...#...",
        "..###..",
        "..###..",
      ],
    },
  ];

  function initGlyphSketchGame() {
    var canvas = getElement("skCanvas");
    var filledEl = getElement("skFilled");
    var timeEl = getElement("skTime");
    var resultEl = getElement("skResult");
    var startBtn = getElement("skNewBtn");
    var bestEl = getElement("skBest");
    var selectEl = getElement("skLevelSel");
    if (
      !canvas ||
      !filledEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "glyph-sketch-campaign", levels: sketchLevels });
    var level = sketchLevels[0];
    var rows = 5;
    var cols = 5;
    var cell = 0;
    var boardX0 = 0;
    var boardY0 = 0;
    var solution = [];
    var state = [];
    var filledCount = 0;
    var targetCount = 0;
    var solved = false;
    var cursor = [0, 0];
    var rafId = null;
    var startedAt = 0;
    var clockRunning = false;

    function clueOf(line) {
      var runs = [];
      var run = 0;
      for (var i = 0; i < line.length; i += 1) {
        if (line[i]) {
          run += 1;
        } else if (run) {
          runs.push(run);
          run = 0;
        }
      }
      if (run) {
        runs.push(run);
      }
      return runs.length ? runs : [0];
    }

    function rowClue(r) {
      return clueOf(solution[r]);
    }

    function colClue(c) {
      return clueOf(solution.map(function (row) {
        return row[c];
      }));
    }

    function renderHud() {
      filledEl.textContent = filledCount + "/" + targetCount;
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
      rows = level.art.length;
      cols = level.art[0].length;
      cell = Math.floor((sketchSize - sketchClueSpace - 10) / Math.max(rows, cols));
      boardX0 = sketchClueSpace + Math.floor((sketchSize - sketchClueSpace - cell * cols) / 2);
      boardY0 = sketchClueSpace + Math.floor((sketchSize - sketchClueSpace - cell * rows) / 2);
      solution = level.art.map(function (row) {
        return row.split("").map(function (ch) {
          return ch === "#";
        });
      });
      state = solution.map(function (row) {
        return row.map(function () {
          return 0;
        });
      });
      targetCount = solution.reduce(function (sum, row) {
        return sum + row.filter(Boolean).length;
      }, 0);
      filledCount = 0;
      solved = false;
      cursor = [0, 0];
      clockRunning = false;
      startedAt = Date.now();
      renderHud();
      refreshPicker();
      startLoop();
      draw();
      resultEl.textContent = t("skReady", { n: targetCount });
    }

    function cycle(r, c) {
      if (solved) {
        return;
      }
      var next = (state[r][c] + 1) % 3;
      if (state[r][c] === 1 && next !== 1) {
        filledCount -= 1;
      }
      if (next === 1) {
        filledCount += 1;
      }
      state[r][c] = next;
      if (!clockRunning) {
        clockRunning = true;
        startedAt = Date.now();
      }
      renderHud();
      draw();
      checkCleared();
    }

    function checkCleared() {
      if (solved) {
        return;
      }
      for (var r = 0; r < rows; r += 1) {
        for (var c = 0; c < cols; c += 1) {
          if (solution[r][c] !== (state[r][c] === 1)) {
            return;
          }
        }
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
      var message = t("skCleared", { s: seconds.toFixed(1), stars: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("skNextBoard");
      } else if (campaign.clearedCount() === sketchLevels.length) {
        message += " " + t("skCampaignDone");
      }
      logAction(t("logGlyphSketch", { n: targetCount }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(sketchLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function draw() {
      var time = Date.now();
      ctx.clearRect(0, 0, sketchSize, sketchSize);
      if (App.world) { App.world.backdrop(ctx, sketchSize, sketchSize, "archive"); }
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
      /* Row clues */
      for (var r = 0; r < rows; r += 1) {
        var runs = rowClue(r);
        var y = boardY0 + r * cell + cell / 2;
        ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
        ctx.fillText(
          runs.join(" "),
          boardX0 - 6,
          y,
        );
      }
      /* Column clues */
      ctx.textAlign = "center";
      for (var c = 0; c < cols; c += 1) {
        var cruns = colClue(c);
        var x = boardX0 + c * cell + cell / 2;
        cruns.forEach(function (n, index) {
          ctx.fillText(
            String(n),
            x,
            boardY0 - (cruns.length - index) * 11 + 4,
          );
        });
      }
      /* Cells */
      for (var ry = 0; ry < rows; ry += 1) {
        for (var rx = 0; rx < cols; rx += 1) {
          var gx = boardX0 + rx * cell;
          var gy = boardY0 + ry * cell;
          var v = state[ry][rx];
          ctx.fillStyle = "rgba(30, 41, 59, 0.55)";
          ctx.fillRect(gx + 1, gy + 1, cell - 2, cell - 2);
          if (v === 1) {
            ctx.fillStyle = "#22d3ee";
            ctx.shadowColor = "#22d3ee";
            ctx.shadowBlur = 8;
            ctx.fillRect(gx + 2, gy + 2, cell - 4, cell - 4);
            ctx.shadowBlur = 0;
          } else if (v === 2) {
            ctx.strokeStyle = "rgba(251, 113, 133, 0.8)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            var inset = cell * 0.28;
            ctx.moveTo(gx + inset, gy + inset);
            ctx.lineTo(gx + cell - inset, gy + cell - inset);
            ctx.moveTo(gx + cell - inset, gy + inset);
            ctx.lineTo(gx + inset, gy + cell - inset);
            ctx.stroke();
          }
          if (cursor[0] === rx && cursor[1] === ry) {
            ctx.strokeStyle = "rgba(0, 242, 255, 0.9)";
            ctx.lineWidth = 2;
            ctx.strokeRect(gx + 1, gy + 1, cell - 2, cell - 2);
          }
        }
      }
      /* Victory shimmer */
      if (solved) {
        ctx.fillStyle = "rgba(163, 230, 53, " + (0.1 + 0.08 * Math.sin(time / 200)) + ")";
        ctx.fillRect(boardX0, boardY0, cell * cols, cell * rows);
      }
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      if (
        document.getElementById("gamePanelGlyphSketch").hidden ||
        document.hidden
      ) {
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

    function cellFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var px = (event.clientX - rect.left) * scaleX;
      var py = (event.clientY - rect.top) * scaleY;
      var c = Math.floor((px - boardX0) / cell);
      var r = Math.floor((py - boardY0) / cell);
      if (c < 0 || r < 0 || c >= cols || r >= rows) {
        return null;
      }
      return [r, c];
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var hit = cellFromEvent(event);
      if (hit) {
        cursor = [hit[1], hit[0]];
        cycle(hit[0], hit[1]);
      }
    });

    canvas.addEventListener("keydown", function (event) {
      var move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (move) {
        event.preventDefault();
        cursor[0] = Math.min(cols - 1, Math.max(0, cursor[0] + move[0]));
        cursor[1] = Math.min(rows - 1, Math.max(0, cursor[1] + move[1]));
        draw();
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        cycle(cursor[1], cursor[0]);
      }
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(sketchLevels[index]);
      }
    });

    startBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    App.quietResetGlyphSketch = function () {
      clockRunning = false;
      resultEl.textContent = t("skPaused");
    };

    loadLevel(sketchLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initGlyphSketchGame = initGlyphSketchGame;
})(window.CapitalConvert = window.CapitalConvert || {});
