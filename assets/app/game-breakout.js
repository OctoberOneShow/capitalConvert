/* Inkball - The glyph-brick breakout campaign in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var brkW = 320;
  var brkH = 224;
  var brkCols = 8;
  var brkBrickW = 34;
  var brkBrickH = 15;
  var brkGap = 4;
  var brkTop = 20;
  var brkPaddleW = 46;
  var brkPaddleH = 5;
  var brkPaddleY = brkH - 14;
  var brkBallR = 3;
  var brkLives = 3;
  var brkTickMs = 16;
  var brkSubSteps = 4;
  var brkGhostBeats = 90;
  /* Marks are written as \uXXXX escapes so the source stays pure ASCII. */
  var brkGlyphs = [
    "\u706B",
    "\u6C34",
    "\u6728",
    "\u91D1",
    "\u571F",
    "\u98CE",
    "\u96F7",
    "\u7535",
    "\u5149",
    "\u6697",
    "\u661F",
    "\u6708",
  ];
  var brkRowTints = ["#22d3ee", "#fbbf24", "#f472b6", "#a3e635", "#a78bfa"];
  /* Three streets, five boards each. The map chars are the verbs:
   * n normal, t tough (2 hits), d drift (slides on every paddle hit),
   * s seed (re-sprouts when smashed), g ghost (solid on alternating
   * beats), x exploder (takes its neighbours with it). */
  var brkLevels = [
    { id: "p1", world: 0, labelKey: "brkL1", speed: 2.1, rows: ["........", "........", "nnnnnnnn", "nnnnnnnn", "........"] },
    { id: "p2", world: 0, labelKey: "brkL2", speed: 2.15, rows: ["........", "n.n.n.n.", "nnnnnnnn", "n.n.n.n.", "........"] },
    { id: "p3", world: 0, labelKey: "brkL3", speed: 2.2, rows: ["n.n.n.n.", "nnnnnnnn", "n.n.n.n.", "nnnnnnnn", "n.n.n.n."] },
    { id: "p4", world: 0, labelKey: "brkL4", speed: 2.25, rows: ["........", "tt.n.n.tt", "nnnnnnnn", "tt.n.n.tt", "........"] },
    { id: "p5", world: 0, labelKey: "brkL5", speed: 2.3, rows: ["t.t.t.t.", ".n.n.n.n", "tttttttt", ".n.n.n.n", "t.t.t.t."] },
    { id: "g1", world: 1, labelKey: "brkL6", speed: 2.35, rows: ["........", "ddd..ddd", "........", "ddd..ddd", "........"] },
    { id: "g2", world: 1, labelKey: "brkL7", speed: 2.4, rows: ["d.d.d.d.", ".dddddd.", "d.d.d.d.", ".dddddd.", "d.d.d.d."] },
    { id: "g3", world: 1, labelKey: "brkL8", speed: 2.45, rows: ["ss....ss", "........", "nnnnnnnn", "........", "ss....ss"] },
    { id: "g4", world: 1, labelKey: "brkL9", speed: 2.5, rows: ["d.s..s.d", "........", "ts....st", "........", "d.s..s.d"] },
    { id: "g5", world: 1, labelKey: "brkL10", speed: 2.55, rows: ["dddddddd", "s.nnnn.s", "dddddddd", "s.nnnn.s", "........"] },
    { id: "x1", world: 2, labelKey: "brkL11", speed: 2.6, rows: ["g.g.g.g.", "........", "g.g.g.g.", "........", "g.g.g.g."] },
    { id: "x2", world: 2, labelKey: "brkL12", speed: 2.65, rows: ["gggggggg", "........", "nnnnnnnn", "........", "gggggggg"] },
    { id: "x3", world: 2, labelKey: "brkL13", speed: 2.7, rows: ["...x....", "........", "..xxx...", "........", "....x..."] },
    { id: "x4", world: 2, labelKey: "brkL14", speed: 2.75, rows: ["g.x.x.g.", "x.g.g.g.x", "g.x.n.x.g", "x.g.g.g.x", "g.x.x.g."] },
    { id: "x5", world: 2, labelKey: "brkL15", speed: 2.85, rows: ["t.gx.xgt", "g.x..x.g", "gx.nn.xg", "g.x..x.g", "tgx.x.gt"] },
  ];

  function initBreakoutGame() {
    var canvas = getElement("brkCanvas");
    var scoreEl = getElement("brkScore");
    var livesEl = getElement("brkLives");
    var levelEl = getElement("brkLevel");
    var resultEl = getElement("brkResult");
    var startBtn = getElement("brkStartBtn");
    var bestEl = getElement("brkBest");
    var selectEl = getElement("brkLevelSel");
    var panel = getElement("gamePanelBreakout");
    if (
      !canvas ||
      !scoreEl ||
      !livesEl ||
      !levelEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl ||
      !panel
    ) {
      return;
    }

    var campaign = createCampaign({ key: "inkball-campaign", levels: brkLevels });
    var ctx = canvas.getContext("2d");
    var bricks = [];
    var ball = { x: brkW / 2, y: brkPaddleY - 6, vx: 0, vy: 0 };
    var paddleX = brkW / 2 - brkPaddleW / 2;
    var state = "idle";
    var running = false;
    var pausedByHide = false;
    var intervalId = null;
    var score = 0;
    var lives = brkLives;
    var combo = 0;
    var ticks = 0;
    var level = null;
    var keysDown = {};

    function brickX(col) {
      var gridW = brkCols * brkBrickW + (brkCols - 1) * brkGap;
      var left = (brkW - gridW) / 2;
      return left + col * (brkBrickW + brkGap);
    }

    function brickY(row) {
      return brkTop + row * (brkBrickH + brkGap);
    }

    function makeBrick(col, row, kind) {
      return {
        col: col,
        row: row,
        x: brickX(col),
        y: brickY(row),
        kind: kind,
        hp: kind === "t" ? 2 : 1,
        dir: row % 2 === 0 ? 1 : -1,
        glyph: brkGlyphs[(row * brkCols + col) % brkGlyphs.length],
        tint: brkRowTints[row % brkRowTints.length],
      };
    }

    function buildLevel(levelDef) {
      level = levelDef;
      bricks = [];
      for (var row = 0; row < levelDef.rows.length; row += 1) {
        for (var col = 0; col < brkCols; col += 1) {
          var ch = levelDef.rows[row].charAt(col);
          if (ch !== "." && ch !== "") {
            bricks.push(makeBrick(col, row, ch));
          }
        }
      }
      score = 0;
      lives = brkLives;
      combo = 0;
      scoreEl.textContent = "0";
      livesEl.textContent = String(brkLives);
      levelEl.textContent =
        campaign.indexOf(levelDef.id) + 1 + "/" + brkLevels.length;
      placeBallOnPaddle();
      refreshPicker();
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
      selectEl.value = level ? level.id : campaign.nextLevelId();
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function ghostSolid() {
      return Math.floor(ticks / brkGhostBeats) % 2 === 0;
    }

    function placeBallOnPaddle() {
      ball.x = paddleX + brkPaddleW / 2;
      ball.y = brkPaddleY - brkBallR - 1;
      ball.vx = 0;
      ball.vy = 0;
    }

    function launch() {
      if (state !== "ready") {
        return;
      }
      var angle = (-70 - Math.random() * 40) * (Math.PI / 180);
      ball.vx = Math.cos(angle) * level.speed;
      ball.vy = Math.sin(angle) * level.speed;
      state = "live";
      resultEl.textContent = t("brkPlay");
    }

    function draw() {
      ctx.clearRect(0, 0, brkW, brkH);
      for (var index = 0; index < bricks.length; index += 1) {
        var brick = bricks[index];
        var fading = brick.kind === "g" && !ghostSolid();
        ctx.globalAlpha = fading ? 0.22 : brick.hp > 1 ? 0.95 : 1;
        ctx.fillStyle = brick.tint;
        ctx.fillRect(brick.x, brick.y, brkBrickW, brkBrickH);
        ctx.globalAlpha = fading ? 0.3 : 1;
        ctx.font = "12px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          brick.kind === "x" ? "\u2620" : brick.glyph,
          brick.x + brkBrickW / 2,
          brick.y + brkBrickH / 2 + 1,
        );
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(paddleX, brkPaddleY, brkPaddleW, brkPaddleH);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, brkBallR, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
    }

    function stopLoop() {
      window.clearInterval(intervalId);
      intervalId = null;
    }

    function startLoop() {
      if (intervalId === null) {
        intervalId = window.setInterval(tick, brkTickMs);
      }
    }

    function endRun() {
      stopLoop();
      running = false;
      state = "idle";
      resultEl.textContent = t("brkOver", { n: score });
      logAction(t("logBrk", { n: score }));
      petNotifyGame(false);
      draw();
    }

    function levelCleared() {
      var starsWon = lives >= 3 ? 3 : lives === 2 ? 2 : 1;
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: score,
        better: "high",
      });
      var message = t("brkCleared", {
        name: t(level.labelKey),
        s: starsWon,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("brkNextStreet");
      } else if (campaign.clearedCount() === brkLevels.length) {
        message += " " + t("brkCampaignDone");
      }
      resultEl.textContent = message;
      logAction(t("logBrk", { n: score }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      buildLevel(brkLevels[campaign.indexOf(nextId)]);
      state = "ready";
      running = true;
      startLoop();
      draw();
    }

    function brickAt(col, row) {
      return bricks.some(function (brick) {
        return brick.col === col && brick.row === row;
      });
    }

    function smash(brick, chainExploders) {
      var index = bricks.indexOf(brick);
      if (index === -1) {
        return;
      }
      bricks.splice(index, 1);
      score += 10 + combo;
      combo += 1;
      scoreEl.textContent = String(score);
      if (brick.kind === "s") {
        /* the seed re-sprouts one storey up, left and right */
        [-1, 1].forEach(function (offset) {
          var col = brick.col + offset;
          var row = brick.row - 1;
          if (col >= 0 && col < brkCols && row >= 0 && !brickAt(col, row)) {
            bricks.push(makeBrick(col, row, "n"));
          }
        });
      }
      if (brick.kind === "x" && chainExploders) {
        var blast = bricks.filter(function (other) {
          return (
            Math.abs(other.col - brick.col) <= 1 &&
            Math.abs(other.row - brick.row) <= 1
          );
        });
        blast.forEach(function (other) {
          smash(other, other.kind !== "x");
        });
      }
    }

    function loseBall() {
      lives -= 1;
      livesEl.textContent = String(lives);
      combo = 0;
      if (lives <= 0) {
        endRun();
        return;
      }
      state = "ready";
      placeBallOnPaddle();
      resultEl.textContent = t("brkLifeLost", { n: lives });
    }

    function stepBall() {
      ball.x += ball.vx / brkSubSteps;
      ball.y += ball.vy / brkSubSteps;

      if (ball.x - brkBallR <= 0) {
        ball.x = brkBallR;
        ball.vx = Math.abs(ball.vx);
      } else if (ball.x + brkBallR >= brkW) {
        ball.x = brkW - brkBallR;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y - brkBallR <= 0) {
        ball.y = brkBallR;
        ball.vy = Math.abs(ball.vy);
      }

      if (
        ball.vy > 0 &&
        ball.y + brkBallR >= brkPaddleY &&
        ball.y - brkBallR < brkPaddleY + brkPaddleH &&
        ball.x >= paddleX - brkBallR &&
        ball.x <= paddleX + brkPaddleW + brkBallR
      ) {
        var rel = (ball.x - (paddleX + brkPaddleW / 2)) / (brkPaddleW / 2);
        rel = Math.max(-1, Math.min(1, rel));
        var angle = -Math.PI / 2 + rel * 1.05;
        ball.vy = Math.sin(angle) * level.speed;
        ball.vx = Math.cos(angle) * level.speed;
        combo = 0;
        driftBricks();
      }

      for (var index = bricks.length - 1; index >= 0; index -= 1) {
        var brick = bricks[index];
        if (brick.kind === "g" && !ghostSolid()) {
          continue;
        }
        if (
          ball.x + brkBallR > brick.x &&
          ball.x - brkBallR < brick.x + brkBrickW &&
          ball.y + brkBallR > brick.y &&
          ball.y - brkBallR < brick.y + brkBrickH
        ) {
          var pushUp = ball.y + brkBallR - brick.y;
          var pushDown = brick.y + brkBrickH - (ball.y - brkBallR);
          var pushLeft = ball.x + brkBallR - brick.x;
          var pushRight = brick.x + brkBrickW - (ball.x - brkBallR);
          var minPush = Math.min(pushUp, pushDown, pushLeft, pushRight);
          if (minPush === pushUp || minPush === pushDown) {
            ball.vy = -ball.vy;
          } else {
            ball.vx = -ball.vx;
          }
          if (brick.hp > 1) {
            brick.hp -= 1;
          } else {
            smash(brick, true);
          }
          break;
        }
      }

      if (bricks.length === 0) {
        levelCleared();
        return;
      }

      if (ball.y - brkBallR > brkH) {
        loseBall();
      }
    }

    function driftBricks() {
      bricks.forEach(function (brick) {
        if (brick.kind !== "d") {
          return;
        }
        brick.col += brick.dir;
        if (brick.col <= 0 || brick.col >= brkCols - 1) {
          brick.dir = -brick.dir;
        }
        brick.x = brickX(brick.col);
      });
    }

    function tick() {
      if (!running) {
        return;
      }
      ticks += 1;
      if (keysDown.ArrowLeft) {
        paddleX -= 4.4;
      }
      if (keysDown.ArrowRight) {
        paddleX += 4.4;
      }
      paddleX = Math.max(0, Math.min(brkW - brkPaddleW, paddleX));
      if (state === "ready") {
        placeBallOnPaddle();
      } else if (state === "live") {
        for (var step = 0; step < brkSubSteps; step += 1) {
          if (state !== "live") {
            break;
          }
          stepBall();
        }
      }
      draw();
    }

    function startGame(levelDef) {
      stopLoop();
      buildLevel(levelDef || brkLevels[campaign.indexOf(campaign.nextLevelId())]);
      state = "ready";
      running = true;
      pausedByHide = false;
      ticks = 0;
      resultEl.textContent = t("brkLaunch");
      startLoop();
      draw();
      canvas.focus();
    }

    function canvasX(clientX) {
      var rect = canvas.getBoundingClientRect();
      var ratio = brkW / (rect.width || brkW);
      return (clientX - rect.left) * ratio;
    }

    canvas.addEventListener("pointermove", function (event) {
      paddleX = Math.max(
        0,
        Math.min(brkW - brkPaddleW, canvasX(event.clientX) - brkPaddleW / 2),
      );
    });

    canvas.addEventListener("click", function () {
      if (state === "ready") {
        launch();
      }
    });

    canvas.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        keysDown[event.key] = true;
        event.preventDefault();
      } else if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        if (state === "ready") {
          launch();
        }
      }
    });

    canvas.addEventListener("keyup", function (event) {
      keysDown[event.key] = false;
    });

    function handleVisibility() {
      if (!running) {
        return;
      }
      if (document.hidden || panel.hidden) {
        if (intervalId !== null) {
          pausedByHide = true;
          stopLoop();
        }
      } else if (pausedByHide) {
        pausedByHide = false;
        startLoop();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        startGame(brkLevels[index]);
      }
    });

    startBtn.addEventListener("click", function () {
      startGame();
    });

    App.quietResetBreakout = function () {
      if (running) {
        stopLoop();
        running = false;
        pausedByHide = false;
        state = "idle";
        placeBallOnPaddle();
        draw();
        resultEl.textContent = t("brkPrompt");
      }
    };

    buildLevel(brkLevels[campaign.indexOf(campaign.nextLevelId())]);
    draw();
    resultEl.textContent = t("brkPrompt");
  }


  /* Exported for the other modules. */
  App.initBreakoutGame = initBreakoutGame;
})(window.CapitalConvert = window.CapitalConvert || {});
