/* Ink Slash - The swipe-to-cut campaign in the shared game drawer. */
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
  var slashWidth = 320;
  var slashHeight = 240;
  var slashGravity = 760;
  var slashFruitR = 13;
  var slashBombR = 12;
  var slashColors = ["#22d3ee", "#fbbf24", "#f472b6", "#a3e635", "#a78bfa"];
  /* Every stroke is a timed round: reach the score before the clock, and
   * remember that a sliced bomb costs a life just like a dropped drop. */
  var slashLevels = [
    { id: "s1", labelKey: "slashL1", target: 250, timeS: 45, spawnMs: 1400, bomb: 0.1 },
    { id: "s2", labelKey: "slashL2", target: 450, timeS: 45, spawnMs: 1300, bomb: 0.12 },
    { id: "s3", labelKey: "slashL3", target: 750, timeS: 40, spawnMs: 900, bomb: 0.14 },
    { id: "s4", labelKey: "slashL4", target: 1050, timeS: 40, spawnMs: 800, bomb: 0.16 },
    { id: "s5", labelKey: "slashL5", target: 1400, timeS: 35, spawnMs: 700, bomb: 0.18 },
    { id: "s6", labelKey: "slashL6", target: 1800, timeS: 35, spawnMs: 600, bomb: 0.2 },
    { id: "s7", labelKey: "slashL7", target: 2200, timeS: 32, spawnMs: 540, bomb: 0.22 },
    { id: "s8", labelKey: "slashL8", target: 2600, timeS: 30, spawnMs: 500, bomb: 0.24 },
    { id: "s9", labelKey: "lvlNum9", target: 3100, timeS: 30, spawnMs: 470, bomb: 0.26 },
    { id: "s10", labelKey: "lvlNum10", target: 3600, timeS: 30, spawnMs: 440, bomb: 0.28 },
    { id: "s11", labelKey: "lvlNum11", target: 4100, timeS: 30, spawnMs: 410, bomb: 0.3 },
    { id: "s12", labelKey: "lvlNum12", target: 4600, timeS: 30, spawnMs: 400, bomb: 0.32 },
  ];

  function initInkSlashGame() {
    var canvas = getElement("slashCanvas");
    var scoreEl = getElement("slashScore");
    var timeEl = getElement("slashTime");
    var livesEl = getElement("slashLives");
    var resultEl = getElement("slashResult");
    var startBtn = getElement("slashStartBtn");
    var bestEl = getElement("slashBest");
    var selectEl = getElement("slashLevelSel");
    if (
      !canvas ||
      !scoreEl ||
      !timeEl ||
      !livesEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "ink-slash-campaign", levels: slashLevels });
    var level = slashLevels[0];
    var fruits = [];
    var halves = [];
    var particles = [];
    var trail = [];
    var flying = false;
    var running = false;
    var rafId = null;
    var lastFrame = 0;
    var spawnAcc = 0;
    var timeLeft = 0;
    var lives = 3;
    var score = 0;
    var chain = 0;
    var flashRed = 0;

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
      scoreEl.textContent = score + "/" + level.target;
      timeEl.textContent = Math.max(0, timeLeft).toFixed(1) + "s";
      livesEl.textContent = String(lives);
    }

    function spawnFruit() {
      var isBomb = Math.random() < level.bomb;
      var x = 50 + Math.random() * (slashWidth - 100);
      fruits.push({
        x: x,
        y: slashHeight + 14,
        vx: ((slashWidth / 2 - x) / 1.45) * (0.75 + Math.random() * 0.5),
        vy: -(560 + Math.random() * 60),
        color: isBomb ? -1 : Math.floor(Math.random() * slashColors.length),
        sliced: false,
      });
    }

    function burst(x, y, color, count) {
      for (var index = 0; index < count; index += 1) {
        particles.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 220,
          vy: (Math.random() - 0.5) * 220 - 60,
          life: 1,
          color: color,
        });
      }
    }

    function sliceFruit(fruit, index) {
      fruit.sliced = true;
      fruits.splice(index, 1);
      if (fruit.color < 0) {
        lives -= 1;
        flashRed = 1;
        renderHud();
        burst(fruit.x, fruit.y, "#64748b", 14);
        if (lives <= 0) {
          gameOver();
        }
        return;
      }
      chain += 1;
      score += 10 + (chain - 1) * 5;
      renderHud();
      burst(fruit.x, fruit.y, slashColors[fruit.color], 10);
      var side = Math.random() < 0.5 ? 1 : -1;
      for (var half = 0; half < 2; half += 1) {
        halves.push({
          x: fruit.x,
          y: fruit.y,
          vx: fruit.vx * 0.5 + side * (half === 0 ? 90 : -90),
          vy: fruit.vy * 0.4 - 60,
          rot: 0,
          spin: side * 6,
          color: fruit.color,
          life: 1,
        });
      }
    }

    function distanceToSegment(px, py, x1, y1, x2, y2) {
      var dx = x2 - x1;
      var dy = y2 - y1;
      var lengthSq = dx * dx + dy * dy;
      var ratio = lengthSq ? ((px - x1) * dx + (py - y1) * dy) / lengthSq : 0;
      var clamped = Math.max(0, Math.min(1, ratio));
      var nearX = x1 + clamped * dx;
      var nearY = y1 + clamped * dy;
      var ex = px - nearX;
      var ey = py - nearY;
      return Math.sqrt(ex * ex + ey * ey);
    }

    function canvasPos(event) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * (slashWidth / rect.width),
        y: (event.clientY - rect.top) * (slashHeight / rect.height),
      };
    }

    function update(dt) {
      spawnAcc += dt * 1000;
      while (spawnAcc >= level.spawnMs) {
        spawnAcc -= level.spawnMs;
        spawnFruit();
      }
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        renderHud();
        timeUp();
        return;
      }
      for (var index = fruits.length - 1; index >= 0; index -= 1) {
        var fruit = fruits[index];
        fruit.vy += slashGravity * dt;
        fruit.x += fruit.vx * dt;
        fruit.y += fruit.vy * dt;
        if (fruit.y > slashHeight + 30 && fruit.vy > 0) {
          fruits.splice(index, 1);
          if (fruit.color >= 0) {
            lives -= 1;
            renderHud();
            if (lives <= 0) {
              gameOver();
              return;
            }
          }
        }
      }
      for (var h = halves.length - 1; h >= 0; h -= 1) {
        var piece = halves[h];
        piece.vy += slashGravity * dt;
        piece.x += piece.vx * dt;
        piece.y += piece.vy * dt;
        piece.rot += piece.spin * dt;
        piece.life -= dt * 1.8;
        if (piece.life <= 0 || piece.y > slashHeight + 40) {
          halves.splice(h, 1);
        }
      }
      var aliveParticles = [];
      for (var p = 0; p < particles.length; p += 1) {
        var spark = particles[p];
        spark.vy += slashGravity * 0.6 * dt;
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.life -= dt * 2;
        if (spark.life > 0) {
          aliveParticles.push(spark);
        }
      }
      particles = aliveParticles;
      var freshTrail = [];
      var now = performance.now();
      for (var t2 = 0; t2 < trail.length; t2 += 1) {
        if (now - trail[t2].at < 130) {
          freshTrail.push(trail[t2]);
        }
      }
      trail = freshTrail;
      if (flashRed > 0) {
        flashRed = Math.max(0, flashRed - dt * 3);
      }
      renderHud();
    }

    function draw() {
      ctx.clearRect(0, 0, slashWidth, slashHeight);
      if (App.world) { App.world.backdrop(ctx, slashWidth, slashHeight, "neon"); }
      for (var index = 0; index < fruits.length; index += 1) {
        var fruit = fruits[index];
        if (fruit.color < 0) {
          ctx.beginPath();
          ctx.arc(fruit.x, fruit.y, slashBombR, 0, Math.PI * 2);
          ctx.fillStyle = "#334155";
          ctx.fill();
          ctx.strokeStyle = "rgba(248, 113, 113, 0.8)";
          ctx.stroke();
          ctx.fillStyle = "#fca5a5";
          ctx.font = "bold 11px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("\u2726", fruit.x, fruit.y);
        } else {
          ctx.beginPath();
          ctx.arc(fruit.x, fruit.y, slashFruitR, 0, Math.PI * 2);
          ctx.fillStyle = slashColors[fruit.color];
          ctx.fill();
          ctx.strokeStyle = "rgba(15, 23, 42, 0.35)";
          ctx.stroke();
        }
      }
      for (var h = 0; h < halves.length; h += 1) {
        var piece = halves[h];
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rot);
        ctx.globalAlpha = Math.max(0, piece.life);
        ctx.beginPath();
        ctx.arc(0, 0, slashFruitR * 0.9, 0, Math.PI);
        ctx.fillStyle = slashColors[piece.color];
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      for (var p = 0; p < particles.length; p += 1) {
        var spark = particles[p];
        ctx.globalAlpha = Math.max(0, spark.life);
        ctx.fillStyle = spark.color;
        ctx.fillRect(spark.x - 2, spark.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;
      if (trail.length > 1) {
        ctx.lineCap = "round";
        for (var s = 1; s < trail.length; s += 1) {
          var age = (performance.now() - trail[s].at) / 130;
          ctx.strokeStyle = "rgba(255, 255, 255, " + (0.9 * (1 - age)).toFixed(3) + ")";
          ctx.lineWidth = 4 * (1 - age) + 1;
          ctx.beginPath();
          ctx.moveTo(trail[s - 1].x, trail[s - 1].y);
          ctx.lineTo(trail[s].x, trail[s].y);
          ctx.stroke();
        }
      }
      if (flashRed > 0) {
        ctx.fillStyle = "rgba(248, 113, 113, " + (0.35 * flashRed).toFixed(3) + ")";
        ctx.fillRect(0, 0, slashWidth, slashHeight);
      }
    }

    function frame(now) {
      if (rafId === null) {
        return;
      }
      var dt = Math.min(0.032, (now - lastFrame) / 1000 || 0.016);
      lastFrame = now;
      update(dt);
      draw();
      if (running) {
        rafId = window.requestAnimationFrame(frame);
      } else {
        rafId = null;
      }
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      lastFrame = performance.now();
      rafId = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function loadLevel(levelDef) {
      stopLoop();
      running = false;
      level = levelDef;
      fruits = [];
      halves = [];
      particles = [];
      trail = [];
      flying = false;
      spawnAcc = 0;
      timeLeft = level.timeS;
      lives = 3;
      score = 0;
      chain = 0;
      flashRed = 0;
      renderHud();
      refreshPicker();
      draw();
      resultEl.textContent = t("slashReady", { n: level.target, s: level.timeS });
    }

    function startGame() {
      loadLevel(level);
      running = true;
      resultEl.textContent = t("slashGo");
      startLoop();
      canvas.focus();
    }

    function gameOver() {
      running = false;
      draw();
      resultEl.textContent =
        t("slashOver", { n: score, t: level.target }) + " " + t("slashRetry");
    }

    function timeUp() {
      running = false;
      if (score >= level.target) {
        levelCleared();
        return;
      }
      draw();
      resultEl.textContent =
        t("slashTimeUp", { n: score, t: level.target }) + " " + t("slashRetry");
    }

    function levelCleared() {
      var gains = [1.4, 1.2, 1];
      var starsWon = starsFor(score, gains.map(function (gain) {
        return Math.round(level.target * gain);
      }), "high");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: score,
      });
      var message = t("slashCleared", {
        name: t(level.labelKey),
        n: score,
        stars: starsWon,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("slashNextStroke");
      } else if (campaign.clearedCount() === slashLevels.length) {
        message += " " + t("slashCampaignDone");
      }
      logAction(t("logInkSlash", { name: t(level.labelKey), n: score }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(slashLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function slashSegment(x1, y1, x2, y2) {
      for (var index = fruits.length - 1; index >= 0; index -= 1) {
        var fruit = fruits[index];
        var radius = fruit.color < 0 ? slashBombR : slashFruitR;
        if (
          distanceToSegment(fruit.x, fruit.y, x1, y1, x2, y2) <
          radius + 4
        ) {
          sliceFruit(fruit, index);
          if (!running) {
            return;
          }
        }
      }
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var pos = canvasPos(event);
      flying = true;
      chain = 0;
      trail.push({ x: pos.x, y: pos.y, at: performance.now() });
    });

    canvas.addEventListener("pointermove", function (event) {
      if (!flying || !running) {
        return;
      }
      var pos = canvasPos(event);
      var last = trail[trail.length - 1];
      trail.push({ x: pos.x, y: pos.y, at: performance.now() });
      if (last) {
        slashSegment(last.x, last.y, pos.x, pos.y);
      }
    });

    function endStroke() {
      flying = false;
      chain = 0;
    }

    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointercancel", endStroke);
    canvas.addEventListener("pointerleave", endStroke);

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(slashLevels[index]);
      }
    });

    startBtn.addEventListener("click", startGame);

    App.quietResetInkSlash = function () {
      if (running) {
        stopLoop();
        running = false;
        resultEl.textContent = t("slashPaused");
      }
    };

    loadLevel(slashLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initInkSlashGame = initInkSlashGame;
})(window.CapitalConvert = window.CapitalConvert || {});
