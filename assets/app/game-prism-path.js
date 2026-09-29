/* Prism Path - The laser-and-mirrors puzzle campaign in the shared game drawer. */
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
  var prismSize = 320;
  /* dir: 0 right, 1 down, 2 left, 3 up. "/" maps right->up, down->right,
   * left->down, up->left; "\" is the transpose. Mirrors start on the given
   * slope and toggle on click; a board clears when every target glows.
   * Star times are [3-star, 2-star, 1-star] seconds. */
  var prismLevels = [
    {
      id: "p1", labelKey: "prismL1", w: 5, h: 5,
      emitter: { x: 0, y: 2, dir: 0 },
      targets: [[1, 2], [2, 4]],
      walls: [],
      mirrors: [{ x: 2, y: 2, slope: 1 }],
      starTimes: [8, 15, 25],
    },
    {
      id: "p2", labelKey: "prismL2", w: 6, h: 6,
      emitter: { x: 0, y: 0, dir: 0 },
      targets: [[3, 2], [5, 3]],
      walls: [[4, 1]],
      mirrors: [
        { x: 3, y: 0, slope: 1 },
        { x: 3, y: 3, slope: 1 },
      ],
      starTimes: [14, 22, 34],
    },
    {
      id: "p3", labelKey: "prismL3", w: 6, h: 6,
      emitter: { x: 0, y: 1, dir: 0 },
      targets: [[2, 2], [3, 3], [5, 1]],
      walls: [],
      mirrors: [
        { x: 2, y: 1, slope: 1 },
        { x: 2, y: 3, slope: 0 },
        { x: 4, y: 3, slope: 0 },
        { x: 4, y: 1, slope: 0 },
      ],
      starTimes: [20, 30, 45],
    },
    {
      id: "p4", labelKey: "prismL4", w: 7, h: 7,
      emitter: { x: 0, y: 3, dir: 0 },
      targets: [[2, 3], [5, 6]],
      walls: [[4, 3], [1, 1]],
      mirrors: [
        { x: 3, y: 3, slope: 1 },
        { x: 3, y: 6, slope: 1 },
      ],
      starTimes: [16, 26, 40],
    },
    {
      id: "p5", labelKey: "prismL5", w: 7, h: 7,
      emitter: { x: 0, y: 0, dir: 0 },
      targets: [[1, 0], [2, 1], [3, 2], [4, 3], [6, 4]],
      walls: [[5, 0]],
      mirrors: [
        { x: 2, y: 0, slope: 0 },
        { x: 2, y: 2, slope: 0 },
        { x: 4, y: 2, slope: 0 },
        { x: 4, y: 4, slope: 0 },
      ],
      starTimes: [22, 34, 50],
    },
    {
      id: "p6", labelKey: "prismL6", w: 7, h: 7,
      emitter: { x: 0, y: 5, dir: 0 },
      targets: [[1, 5], [3, 6], [6, 6]],
      walls: [[4, 5], [6, 2]],
      mirrors: [
        { x: 2, y: 5, slope: 0 },
        { x: 2, y: 6, slope: 0 },
        { x: 5, y: 1, slope: 0 },
      ],
      starTimes: [26, 40, 58],
    },
    {
      id: "p7", labelKey: "prismL7", w: 7, h: 7,
      emitter: { x: 0, y: 0, dir: 0 },
      targets: [[1, 0], [3, 1], [5, 3]],
      walls: [[5, 0], [1, 3]],
      mirrors: [
        { x: 3, y: 0, slope: 1 },
        { x: 3, y: 3, slope: 0 },
        { x: 6, y: 3, slope: 0 },
      ],
      starTimes: [30, 46, 66],
    },
    {
      id: "p8", labelKey: "prismL8", w: 7, h: 7,
      emitter: { x: 0, y: 5, dir: 0 },
      targets: [[1, 5], [4, 6], [6, 6]],
      walls: [[5, 5], [3, 2]],
      mirrors: [
        { x: 2, y: 5, slope: 1 },
        { x: 2, y: 6, slope: 0 },
      ],
      starTimes: [34, 52, 74],
    },
  ];
  /* "/" is slope 1, "\" is slope 0. */
  var SLOPE_SLASH = 1;
  var SLOPE_BACK = 0;
  var REFLECT = {
    0: { 1: 3, 0: 1 },
    1: { 1: 0, 0: 2 },
    2: { 1: 1, 0: 3 },
    3: { 1: 2, 0: 0 },
  };
  var STEP_X = [1, 0, -1, 0];
  var STEP_Y = [0, 1, 0, -1];

  function initPrismPathGame() {
    var canvas = getElement("prisCanvas");
    var goalsEl = getElement("prisGoals");
    var movesEl = getElement("prisMoves");
    var timeEl = getElement("prisTime");
    var resultEl = getElement("prisResult");
    var startBtn = getElement("prisNewBtn");
    var bestEl = getElement("prisBest");
    var selectEl = getElement("prisLevelSel");
    if (
      !canvas ||
      !goalsEl ||
      !movesEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "prism-path-campaign", levels: prismLevels });
    var level = prismLevels[0];
    var cellSize = 0;
    var boardW = 0;
    var boardH = 0;
    var mirrors = [];
    var litTargets = {};
    var beam = [];
    var moves = 0;
    var solved = false;
    var cursor = { x: 0, y: 0 };
    var rafId = null;
    var startedAt = 0;
    var clockRunning = false;

    function keyAt(x, y) {
      return x + "," + y;
    }

    function mirrorAt(x, y) {
      for (var index = 0; index < mirrors.length; index += 1) {
        if (mirrors[index].x === x && mirrors[index].y === y) {
          return mirrors[index];
        }
      }
      return null;
    }

    function isWall(x, y) {
      return level.walls.some(function (wall) {
        return wall[0] === x && wall[1] === y;
      });
    }

    function isTarget(x, y) {
      return level.targets.some(function (target) {
        return target[0] === x && target[1] === y;
      });
    }

    function renderHud() {
      movesEl.textContent = String(moves);
      goalsEl.textContent =
        level.targets.filter(function (target) {
          return litTargets[keyAt(target[0], target[1])];
        }).length + "/" + level.targets.length;
      timeEl.textContent = clockRunning
        ? ((Date.now() - startedAt) / 1000).toFixed(1) + "s"
        : timeEl.textContent;
    }

    /* Trace the beam from the emitter through the current mirror state. */
    function traceBeam() {
      litTargets = {};
      beam = [];
      var x = level.emitter.x;
      var y = level.emitter.y;
      var dir = level.emitter.dir;
      var seen = {};
      for (var step = 0; step < 300; step += 1) {
        x += STEP_X[dir];
        y += STEP_Y[dir];
        if (x < 0 || y < 0 || x >= level.w || y >= level.h) {
          break;
        }
        var stateKey = x + "," + y + "," + dir;
        if (seen[stateKey]) {
          break;
        }
        seen[stateKey] = true;
        beam.push({ x: x, y: y, dir: dir });
        if (isWall(x, y)) {
          break;
        }
        if (isTarget(x, y)) {
          litTargets[keyAt(x, y)] = true;
        }
        var mirror = mirrorAt(x, y);
        if (mirror) {
          dir = REFLECT[dir][mirror.slope];
        }
        if (x === level.emitter.x && y === level.emitter.y) {
          break;
        }
      }
    }

    function allLit() {
      return level.targets.every(function (target) {
        return litTargets[keyAt(target[0], target[1])];
      });
    }

    function checkCleared() {
      if (solved || !allLit()) {
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
      var message = t("prismCleared", { s: seconds.toFixed(1), stars: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("prismNextBoard");
      } else if (campaign.clearedCount() === prismLevels.length) {
        message += " " + t("prismCampaignDone");
      }
      logAction(t("logPrismPath", { n: level.targets.length }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(prismLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function rotateAt(x, y) {
      var mirror = mirrorAt(x, y);
      if (!mirror || solved) {
        return;
      }
      mirror.slope = mirror.slope === SLOPE_SLASH ? SLOPE_BACK : SLOPE_SLASH;
      moves += 1;
      if (!clockRunning) {
        clockRunning = true;
        startedAt = Date.now();
      }
      traceBeam();
      renderHud();
      draw();
      checkCleared();
    }

    function loadLevel(levelDef) {
      level = levelDef;
      cellSize = Math.floor(Math.min(
        (prismSize - 16) / level.w,
        (prismSize - 16) / level.h,
      ));
      boardW = cellSize * level.w;
      boardH = cellSize * level.h;
      mirrors = level.mirrors.map(function (mirror) {
        return { x: mirror.x, y: mirror.y, slope: mirror.slope };
      });
      moves = 0;
      solved = false;
      cursor = { x: level.emitter.x, y: level.emitter.y };
      clockRunning = false;
      startedAt = Date.now();
      traceBeam();
      renderHud();
      refreshPicker();
      startLoop();
      draw();
      resultEl.textContent = t("prismReady", { n: level.targets.length });
    }

    function centerOf(x, y) {
      return {
        x: (prismSize - boardW) / 2 + x * cellSize + cellSize / 2,
        y: (prismSize - boardH) / 2 + y * cellSize + cellSize / 2,
      };
    }

    function draw() {
      var time = Date.now();
      ctx.clearRect(0, 0, prismSize, prismSize);
      /* Emitter */
      var emitterCenter = centerOf(level.emitter.x, level.emitter.y);
      ctx.beginPath();
      ctx.arc(emitterCenter.x, emitterCenter.y, cellSize * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = "#ff6b35";
      ctx.shadowColor = "#ff6b35";
      ctx.shadowBlur = 14 + Math.sin(time / 260) * 4;
      ctx.fill();
      ctx.shadowBlur = 0;
      /* Beam */
      if (beam.length) {
        ctx.lineCap = "round";
        ctx.beginPath();
        var start = centerOf(level.emitter.x, level.emitter.y);
        ctx.moveTo(start.x, start.y);
        beam.forEach(function (point) {
          var center = centerOf(point.x, point.y);
          ctx.lineTo(center.x, center.y);
        });
        ctx.strokeStyle = "rgba(255, 107, 53, 0.35)";
        ctx.lineWidth = Math.max(6, cellSize * 0.34);
        ctx.shadowColor = "#ff6b35";
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.strokeStyle = "rgba(0, 242, 255, 0.95)";
        ctx.lineWidth = Math.max(2, cellSize * 0.12);
        ctx.shadowColor = "#00f2ff";
        ctx.shadowBlur = 10;
        ctx.stroke();
        /* Travelling pulse along the beam */
        ctx.setLineDash([cellSize * 0.6, cellSize * 1.8]);
        ctx.lineDashOffset = -(time / 18) % (cellSize * 2.4);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        ctx.lineWidth = Math.max(1, cellSize * 0.06);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
      }
      /* Walls */
      level.walls.forEach(function (wall) {
        var center = centerOf(wall[0], wall[1]);
        ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
        ctx.fillRect(
          center.x - cellSize * 0.38,
          center.y - cellSize * 0.38,
          cellSize * 0.76,
          cellSize * 0.76,
        );
      });
      /* Mirrors */
      mirrors.forEach(function (mirror) {
        var center = centerOf(mirror.x, mirror.y);
        var angle = mirror.slope === SLOPE_SLASH ? -Math.PI / 4 : Math.PI / 4;
        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate(angle);
        ctx.fillStyle = "rgba(34, 211, 238, 0.28)";
        ctx.fillRect(-cellSize * 0.38, -cellSize * 0.1, cellSize * 0.76, cellSize * 0.2);
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(-cellSize * 0.38, 0);
        ctx.lineTo(cellSize * 0.38, 0);
        ctx.stroke();
        ctx.restore();
        ctx.shadowBlur = 0;
      });
      /* Targets */
      level.targets.forEach(function (target, index) {
        var center = centerOf(target[0], target[1]);
        var lit = litTargets[keyAt(target[0], target[1])];
        ctx.beginPath();
        ctx.arc(center.x, center.y, cellSize * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = lit ? "#a3e635" : "rgba(148, 163, 184, 0.25)";
        ctx.shadowColor = "#a3e635";
        ctx.shadowBlur = lit ? 14 + Math.sin(time / 220 + index) * 5 : 0;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(center.x, center.y, cellSize * 0.33, 0, Math.PI * 2);
        ctx.strokeStyle = lit ? "rgba(163, 230, 53, 0.7)" : "rgba(148, 163, 184, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
      /* Keyboard cursor */
      var cursorCenter = centerOf(cursor.x, cursor.y);
      ctx.beginPath();
      ctx.arc(cursorCenter.x, cursorCenter.y, cellSize * 0.36, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      /* The glow is decoration: hidden panels keep the slot but skip work. */
      if (document.getElementById("gamePanelPrismPath").hidden || document.hidden) {
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
      var px = (event.clientX - rect.left) * scaleX;
      var py = (event.clientY - rect.top) * scaleY;
      var x = Math.floor((px - (prismSize - boardW) / 2) / cellSize);
      var y = Math.floor((py - (prismSize - boardH) / 2) / cellSize);
      if (x < 0 || y < 0 || x >= level.w || y >= level.h) {
        return null;
      }
      return { x: x, y: y };
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var cell = cellFromEvent(event);
      if (!cell) {
        return;
      }
      cursor = cell;
      rotateAt(cell.x, cell.y);
    });

    canvas.addEventListener("keydown", function (event) {
      var step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (step) {
        event.preventDefault();
        cursor.x = Math.min(level.w - 1, Math.max(0, cursor.x + step[0]));
        cursor.y = Math.min(level.h - 1, Math.max(0, cursor.y + step[1]));
        draw();
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        rotateAt(cursor.x, cursor.y);
      }
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(prismLevels[index]);
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

    App.quietResetPrismPath = function () {
      clockRunning = false;
      resultEl.textContent = t("prismPaused");
    };

    loadLevel(prismLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initPrismPathGame = initPrismPathGame;
})(window.CapitalConvert = window.CapitalConvert || {});
