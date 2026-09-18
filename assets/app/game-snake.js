/* Serpent - The walled-house snake campaign in the shared game drawer. */
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
  var snkCols = 16;
  var snkRows = 16;
  var snkCell = 15;
  var snkStartMs = 150;
  var snkMinMs = 70;
  var snkStepMs = 4;
  /* Each house is a wall plan plus a length goal and star times
   * [3-star, 2-star, 1-star]. wrap = the side edges are open. */
  var snkLevels = [
    { id: "h1", labelKey: "snkL1", goal: 6, starTimes: [20, 32, 45], wrap: false, walls: [] },
    { id: "h2", labelKey: "snkL2", goal: 7, starTimes: [24, 36, 50], wrap: false, walls: [[6, 0, 6, 12], [10, 3, 10, 15]] },
    { id: "h3", labelKey: "snkL3", goal: 8, starTimes: [26, 40, 55], wrap: false, walls: [[7, 8, 15, 8], [8, 0, 8, 6]] },
    { id: "h4", labelKey: "snkL4", goal: 9, starTimes: [30, 45, 60], wrap: false, walls: [[4, 4, 11, 4], [4, 12, 6, 12], [8, 12, 11, 12], [4, 4, 4, 7], [4, 9, 4, 12], [11, 4, 11, 12]] },
    { id: "h5", labelKey: "snkL5", goal: 8, starTimes: [22, 34, 48], wrap: true, walls: [] },
    { id: "h6", labelKey: "snkL6", goal: 10, starTimes: [34, 48, 65], wrap: false, walls: [[8, 0, 8, 2], [8, 4, 8, 11], [8, 13, 8, 15]] },
    { id: "h7", labelKey: "snkL7", goal: 10, starTimes: [36, 52, 70], wrap: false, start: { x: 4, y: 1, dx: 1 }, walls: [[3, 3, 3, 15], [7, 0, 7, 12], [11, 3, 11, 15], [14, 0, 14, 12]] },
    { id: "h8", labelKey: "snkL8", goal: 11, starTimes: [40, 56, 75], wrap: false, walls: [[0, 4, 5, 4], [10, 4, 15, 4], [0, 11, 5, 11], [10, 11, 15, 11]] },
    { id: "h9", labelKey: "snkL9", goal: 12, starTimes: [44, 62, 85], wrap: false, start: { x: 4, y: 7, dx: 1 }, walls: [[2, 4, 2, 4], [4, 4, 4, 4], [6, 4, 6, 4], [8, 4, 8, 4], [10, 4, 10, 4], [12, 4, 12, 4], [14, 4, 14, 4], [1, 8, 1, 8], [3, 8, 3, 8], [5, 8, 5, 8], [7, 8, 7, 8], [9, 8, 9, 8], [11, 8, 11, 8], [13, 8, 13, 8], [15, 8, 15, 8], [2, 12, 2, 12], [4, 12, 4, 12], [6, 12, 6, 12], [8, 12, 8, 12], [10, 12, 10, 12], [12, 12, 12, 12], [14, 12, 14, 12]] },
    { id: "h10", labelKey: "snkL10", goal: 13, starTimes: [48, 66, 90], wrap: true, walls: [[7, 7, 8, 8], [2, 2, 2, 2], [13, 2, 13, 2], [2, 13, 2, 13], [13, 13, 13, 13]] },
  ];
  var snkWallTint = "rgba(148, 163, 184, 0.35)";

  function initSnakeGame() {
    var canvas = getElement("snkCanvas");
    var lengthEl = getElement("snkLength");
    var goalEl = getElement("snkGoalStat");
    var timeEl = getElement("snkTime");
    var resultEl = getElement("snkResult");
    var startBtn = getElement("snkStartBtn");
    var bestEl = getElement("snkBest");
    var selectEl = getElement("snkLevelSel");
    if (
      !canvas ||
      !lengthEl ||
      !goalEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "serpent-campaign", levels: snkLevels });
    var level = snkLevels[0];
    var wallSet = {};
    var snake = [];
    var dir = { x: 1, y: 0 };
    var nextDir = { x: 1, y: 0 };
    var food = { x: 8, y: 8 };
    var running = false;
    var intervalId = null;
    var tickMs = snkStartMs;
    var startedAt = 0;

    function wallKey(x, y) {
      return x + "," + y;
    }

    function isWall(x, y) {
      return wallSet[wallKey(x, y)] === true;
    }

    function buildWalls(levelDef) {
      wallSet = {};
      levelDef.walls.forEach(function (rect) {
        for (var x = rect[0]; x <= rect[2]; x += 1) {
          for (var y = rect[1]; y <= rect[3]; y += 1) {
            wallSet[wallKey(x, y)] = true;
          }
        }
      });
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

    function renderHud() {
      lengthEl.textContent = String(snake.length);
      goalEl.textContent = snake.length + "/" + level.goal;
    }

    function emptyCell(occupied) {
      var spot;
      var guard = 0;
      do {
        spot = {
          x: Math.floor(Math.random() * snkCols),
          y: Math.floor(Math.random() * snkRows),
        };
        guard += 1;
      } while (
        guard < 500 &&
        (isWall(spot.x, spot.y) ||
          occupied.some(function (part) {
            return part.x === spot.x && part.y === spot.y;
          }))
      );
      return spot;
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      Object.keys(wallSet).forEach(function (key) {
        var parts = key.split(",");
        ctx.fillStyle = snkWallTint;
        ctx.fillRect(
          Number(parts[0]) * snkCell + 1,
          Number(parts[1]) * snkCell + 1,
          snkCell - 2,
          snkCell - 2,
        );
      });
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(food.x * snkCell + 2, food.y * snkCell + 2, snkCell - 4, snkCell - 4);
      for (var index = 0; index < snake.length; index += 1) {
        var part = snake[index];
        ctx.fillStyle = index === 0 ? "#22d3ee" : "rgba(34, 211, 238, 0.55)";
        ctx.fillRect(part.x * snkCell + 1, part.y * snkCell + 1, snkCell - 2, snkCell - 2);
      }
    }

    function stopLoop() {
      window.clearInterval(intervalId);
      intervalId = null;
    }

    function startLoop() {
      stopLoop();
      intervalId = window.setInterval(tick, tickMs);
    }

    function loadLevel(levelDef) {
      stopLoop();
      running = false;
      level = levelDef;
      buildWalls(levelDef);
      var start = levelDef.start || { x: 4, y: 8, dx: 1 };
      dir = { x: start.dx, y: 0 };
      nextDir = { x: start.dx, y: 0 };
      snake = [
        { x: start.x, y: start.y },
        { x: start.x - start.dx, y: start.y },
        { x: start.x - start.dx * 2, y: start.y },
      ];
      tickMs = snkStartMs;
      food = emptyCell(snake);
      timeEl.textContent = "0.0s";
      renderHud();
      refreshPicker();
      draw();
      resultEl.textContent = t("snkGoal", {
        name: t(level.labelKey),
        n: level.goal,
      });
    }

    function startGame() {
      loadLevel(level);
      running = true;
      startedAt = Date.now();
      resultEl.textContent = t("snkGo");
      startLoop();
      canvas.focus();
    }

    function gameOver() {
      stopLoop();
      running = false;
      resultEl.textContent = t("snkOver", { n: snake.length }) + " " + t("snkRetry");
      draw();
    }

    function levelCleared() {
      stopLoop();
      running = false;
      var seconds = Math.max(0.1, (Date.now() - startedAt) / 1000);
      var starsWon = starsFor(Math.round(seconds * 10) / 10, level.starTimes, "low");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: Math.round(seconds * 10) / 10,
        better: "low",
      });
      var message = t("snkCleared", {
        name: t(level.labelKey),
        s: seconds.toFixed(1),
        stars: starsWon,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("snkNextHouse");
      } else if (campaign.clearedCount() === snkLevels.length) {
        message += " " + t("snkCampaignDone");
      }
      logAction(t("logSnk", { n: snake.length }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(snkLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function tick() {
      if (!running) {
        return;
      }
      timeEl.textContent = ((Date.now() - startedAt) / 1000).toFixed(1) + "s";
      if (nextDir.x !== -dir.x || nextDir.y !== -dir.y) {
        dir = nextDir;
      }
      var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (level.wrap) {
        head.x = (head.x + snkCols) % snkCols;
        head.y = (head.y + snkRows) % snkRows;
      } else if (head.x < 0 || head.x >= snkCols || head.y < 0 || head.y >= snkRows) {
        gameOver();
        return;
      }
      if (isWall(head.x, head.y)) {
        gameOver();
        return;
      }

      var ate = head.x === food.x && head.y === food.y;
      var body = ate ? snake : snake.slice(0, snake.length - 1);
      if (
        body.some(function (part) {
          return part.x === head.x && part.y === head.y;
        })
      ) {
        gameOver();
        return;
      }

      snake.unshift(head);
      if (ate) {
        if (snake.length >= level.goal) {
          renderHud();
          draw();
          levelCleared();
          return;
        }
        food = emptyCell(snake);
        if (tickMs > snkMinMs) {
          tickMs = Math.max(snkMinMs, tickMs - snkStepMs);
          startLoop();
        }
      } else {
        snake.pop();
      }

      renderHud();
      draw();
    }

    function steer(key) {
      if (key === "ArrowUp" || key === "w") {
        nextDir = { x: 0, y: -1 };
      } else if (key === "ArrowDown" || key === "s") {
        nextDir = { x: 0, y: 1 };
      } else if (key === "ArrowLeft" || key === "a") {
        nextDir = { x: -1, y: 0 };
      } else if (key === "ArrowRight" || key === "d") {
        nextDir = { x: 1, y: 0 };
      }
    }

    canvas.addEventListener("keydown", function (event) {
      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight"
      ) {
        event.preventDefault();
      }
      steer(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(snkLevels[index]);
      }
    });

    startBtn.addEventListener("click", startGame);

    App.quietResetSnake = function () {
      if (running) {
        loadLevel(level);
      }
    };

    loadLevel(snkLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initSnakeGame = initSnakeGame;
})(window.CapitalConvert = window.CapitalConvert || {});
