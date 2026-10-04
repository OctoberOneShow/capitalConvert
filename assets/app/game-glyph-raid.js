/* Glyph Raid - The marching-formation shooter campaign in the shared game drawer. */
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
  var raidWidth = 320;
  var raidHeight = 240;
  var raidShipY = 220;
  var raidCellW = 28;
  var raidCellH = 22;
  var raidEdgeL = 14;
  var raidEdgeR = 306;
  var raidReachY = 206;
  var raidColors = ["#22d3ee", "#fbbf24", "#f472b6", "#a3e635", "#a78bfa"];
  var raidGlyphs = ["\u25c6", "\u25cf", "\u25b2", "\u2605", "\u25a0"];
  /* Waves: a bigger formation that marches faster and fires more often.
   * Clear every raider; star times are [3-star, 2-star, 1-star] seconds. */
  var raidLevels = [
    { id: "v1", labelKey: "raidL1", rows: 3, cols: 6, stepMs: 700, dropMs: 1700, starTimes: [40, 55, 75] },
    { id: "v2", labelKey: "raidL2", rows: 4, cols: 7, stepMs: 640, dropMs: 1500, starTimes: [48, 66, 88] },
    { id: "v3", labelKey: "raidL3", rows: 4, cols: 8, stepMs: 580, dropMs: 1350, starTimes: [56, 76, 100] },
    { id: "v4", labelKey: "raidL4", rows: 5, cols: 8, stepMs: 520, dropMs: 1200, starTimes: [64, 86, 112] },
    { id: "v5", labelKey: "raidL5", rows: 5, cols: 9, stepMs: 470, dropMs: 1050, starTimes: [72, 96, 124] },
    { id: "v6", labelKey: "raidL6", rows: 5, cols: 10, stepMs: 430, dropMs: 900, starTimes: [80, 106, 136] },
    { id: "v7", labelKey: "raidL7", rows: 6, cols: 10, stepMs: 390, dropMs: 820, starTimes: [88, 116, 148] },
    { id: "v8", labelKey: "raidL8", rows: 6, cols: 10, stepMs: 350, dropMs: 720, starTimes: [96, 126, 160] },
    { id: "v9", labelKey: "raidL9", rows: 6, cols: 10, stepMs: 320, dropMs: 650, starTimes: [104, 136, 172] },
    { id: "v10", labelKey: "raidL10", rows: 6, cols: 10, stepMs: 290, dropMs: 580, starTimes: [112, 146, 184] },
    { id: "v11", labelKey: "lvlNum11", rows: 6, cols: 10, stepMs: 272, dropMs: 555, starTimes: [119, 155, 195] },
    { id: "v12", labelKey: "lvlNum12", rows: 6, cols: 10, stepMs: 254, dropMs: 530, starTimes: [126, 164, 207] },
    { id: "v13", labelKey: "lvlNum13", rows: 6, cols: 10, stepMs: 236, dropMs: 505, starTimes: [134, 174, 219] },
  ];

  function initGlyphRaidGame() {
    var canvas = getElement("raidCanvas");
    var scoreEl = getElement("raidScore");
    var livesEl = getElement("raidLives");
    var timeEl = getElement("raidTime");
    var resultEl = getElement("raidResult");
    var startBtn = getElement("raidStartBtn");
    var bestEl = getElement("raidBest");
    var selectEl = getElement("raidLevelSel");
    if (
      !canvas ||
      !scoreEl ||
      !livesEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "glyph-raid-campaign", levels: raidLevels });
    var level = raidLevels[0];
    var invaders = [];
    var shiftX = 0;
    var shiftY = 0;
    var dir = 1;
    var marchAcc = 0;
    var dropAcc = 0;
    var bullets = [];
    var drops = [];
    var particles = [];
    var shipX = 160;
    var keyDir = 0;
    var pointerDir = 0;
    var fireAcc = 0;
    var lives = 3;
    var invulnUntil = 0;
    var score = 0;
    var alive = false;
    var rafId = null;
    var lastFrame = 0;
    var startedAt = 0;

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
      scoreEl.textContent = String(score);
      livesEl.textContent = String(lives);
      timeEl.textContent = alive
        ? ((Date.now() - startedAt) / 1000).toFixed(1) + "s"
        : timeEl.textContent;
    }

    function buildFormation() {
      invaders = [];
      for (var row = 0; row < level.rows; row += 1) {
        for (var col = 0; col < level.cols; col += 1) {
          invaders.push({
            row: row,
            col: col,
            alive: true,
          });
        }
      }
      shiftX = 0;
      shiftY = 0;
      dir = 1;
      marchAcc = 0;
      dropAcc = 0;
    }

    function invaderX(inv) {
      return 26 + inv.col * raidCellW + shiftX;
    }

    function invaderY(inv) {
      return 30 + inv.row * raidCellH + shiftY;
    }

    function aliveInvaders() {
      return invaders.filter(function (inv) {
        return inv.alive;
      });
    }

    function burst(x, y, color, count) {
      for (var index = 0; index < count; index += 1) {
        particles.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 170,
          vy: (Math.random() - 0.5) * 170 - 40,
          life: 1,
          color: color,
        });
      }
    }

    function gameOver() {
      alive = false;
      draw();
      resultEl.textContent =
        t("raidOver", { n: score }) + " " + t("raidRetry");
    }

    function levelCleared() {
      alive = false;
      var seconds = Math.max(0.1, (Date.now() - startedAt) / 1000);
      var starsWon = starsFor(Math.round(seconds * 10) / 10, level.starTimes, "low");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: Math.round(seconds * 10) / 10,
        better: "low",
      });
      var message = t("raidCleared", {
        name: t(level.labelKey),
        s: seconds.toFixed(1),
        stars: starsWon,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("raidNextWave");
      } else if (campaign.clearedCount() === raidLevels.length) {
        message += " " + t("raidCampaignDone");
      }
      logAction(t("logGlyphRaid", { name: t(level.labelKey) }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(raidLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function march() {
      var aliveList = aliveInvaders();
      if (!aliveList.length) {
        return;
      }
      var minX = Infinity;
      var maxX = -Infinity;
      aliveList.forEach(function (inv) {
        var x = invaderX(inv);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      });
      if (
        (dir > 0 && maxX + 8 > raidEdgeR) ||
        (dir < 0 && minX - 8 < raidEdgeL)
      ) {
        dir = -dir;
        shiftY += 10;
      } else {
        shiftX += dir * 8;
      }
      var landed = aliveList.some(function (inv) {
        return invaderY(inv) >= raidReachY;
      });
      if (landed) {
        gameOver();
      }
    }

    function update(dt) {
      var now = Date.now();
      var total = invaders.length;
      var aliveCount = aliveInvaders().length;
      if (!aliveCount) {
        levelCleared();
        return;
      }
      marchAcc += dt * 1000;
      var stepMs = level.stepMs * (0.4 + 0.6 * (aliveCount / total));
      while (marchAcc >= stepMs) {
        marchAcc -= stepMs;
        march();
        if (!alive) {
          return;
        }
      }
      dropAcc += dt * 1000;
      if (dropAcc >= level.dropMs) {
        dropAcc = 0;
        var list = aliveInvaders();
        var shooter = list[Math.floor(Math.random() * list.length)];
        drops.push({ x: invaderX(shooter), y: invaderY(shooter) + 8, vy: 175 });
      }
      var move = (keyDir || pointerDir) * 240;
      shipX = Math.max(16, Math.min(raidWidth - 16, shipX + move * dt));
      fireAcc += dt * 1000;
      if (fireAcc >= 330) {
        fireAcc = 0;
        bullets.push({ x: shipX, y: raidShipY - 12 });
      }
      for (var b = bullets.length - 1; b >= 0; b -= 1) {
        var bullet = bullets[b];
        bullet.y -= 340 * dt;
        if (bullet.y < -8) {
          bullets.splice(b, 1);
          continue;
        }
        for (var i = 0; i < invaders.length; i += 1) {
          var inv = invaders[i];
          if (!inv.alive) {
            continue;
          }
          var dx = bullet.x - invaderX(inv);
          var dy = bullet.y - invaderY(inv);
          if (dx * dx + dy * dy < 144) {
            inv.alive = false;
            bullets.splice(b, 1);
            score += 10;
            renderHud();
            burst(invaderX(inv), invaderY(inv), raidColors[inv.row % raidColors.length], 9);
            if (!aliveInvaders().length) {
              levelCleared();
              return;
            }
            break;
          }
        }
      }
      for (var d = drops.length - 1; d >= 0; d -= 1) {
        var drop = drops[d];
        drop.y += drop.vy * dt;
        if (drop.y > raidHeight + 8) {
          drops.splice(d, 1);
          continue;
        }
        var sx = drop.x - shipX;
        var sy = drop.y - raidShipY;
        if (
          now > invulnUntil &&
          sx * sx + sy * sy < 196
        ) {
          drops.splice(d, 1);
          lives -= 1;
          invulnUntil = now + 1200;
          renderHud();
          burst(shipX, raidShipY, "#f87171", 12);
          if (lives <= 0) {
            gameOver();
            return;
          }
        }
      }
      var aliveParticles = [];
      for (var p = 0; p < particles.length; p += 1) {
        var spark = particles[p];
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.vy += 220 * dt;
        spark.life -= dt * 2;
        if (spark.life > 0) {
          aliveParticles.push(spark);
        }
      }
      particles = aliveParticles;
    }

    function draw() {
      ctx.clearRect(0, 0, raidWidth, raidHeight);
      ctx.strokeStyle = "rgba(248, 113, 113, 0.35)";
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, raidReachY + 0.5);
      ctx.lineTo(raidWidth, raidReachY + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      for (var i = 0; i < invaders.length; i += 1) {
        var inv = invaders[i];
        if (!inv.alive) {
          continue;
        }
        var x = invaderX(inv);
        var y = invaderY(inv);
        ctx.fillStyle = raidColors[inv.row % raidColors.length];
        ctx.fillRect(x - 8, y - 8, 16, 16);
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(raidGlyphs[inv.row % raidGlyphs.length], x, y);
      }
      ctx.fillStyle = "#f87171";
      for (var d = 0; d < drops.length; d += 1) {
        ctx.fillRect(drops[d].x - 2, drops[d].y - 5, 4, 10);
      }
      ctx.fillStyle = "#ffffff";
      for (var b = 0; b < bullets.length; b += 1) {
        ctx.fillRect(bullets[b].x - 1.5, bullets[b].y - 5, 3, 10);
      }
      var blink = Date.now() < invulnUntil && Math.floor(Date.now() / 100) % 2 === 0;
      if (!blink) {
        ctx.fillStyle = "#22d3ee";
        ctx.beginPath();
        ctx.moveTo(shipX, raidShipY - 10);
        ctx.lineTo(shipX - 12, raidShipY + 8);
        ctx.lineTo(shipX + 12, raidShipY + 8);
        ctx.closePath();
        ctx.fill();
      }
      for (var p = 0; p < particles.length; p += 1) {
        var spark = particles[p];
        ctx.globalAlpha = Math.max(0, spark.life);
        ctx.fillStyle = spark.color;
        ctx.fillRect(spark.x - 2, spark.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      if (rafId === null) {
        return;
      }
      var dt = Math.min(0.032, (now - lastFrame) / 1000 || 0.016);
      lastFrame = now;
      update(dt);
      draw();
      if (alive) {
        renderHud();
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
      alive = false;
      level = levelDef;
      buildFormation();
      bullets = [];
      drops = [];
      particles = [];
      shipX = 160;
      keyDir = 0;
      pointerDir = 0;
      lives = 3;
      score = 0;
      invulnUntil = 0;
      renderHud();
      refreshPicker();
      draw();
      resultEl.textContent = t("raidReady", { n: invaders.length });
    }

    function startGame() {
      loadLevel(level);
      alive = true;
      startedAt = Date.now();
      resultEl.textContent = t("raidGo");
      startLoop();
      canvas.focus();
    }

    canvas.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft" || event.key === "a") {
        event.preventDefault();
        keyDir = -1;
      } else if (event.key === "ArrowRight" || event.key === "d") {
        event.preventDefault();
        keyDir = 1;
      }
    });

    canvas.addEventListener("keyup", function (event) {
      if (event.key === "ArrowLeft" || event.key === "a") {
        keyDir = keyDir === -1 ? 0 : keyDir;
      } else if (event.key === "ArrowRight" || event.key === "d") {
        keyDir = keyDir === 1 ? 0 : keyDir;
      }
    });

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      steerFromPointer(event);
    });

    canvas.addEventListener("pointermove", function (event) {
      steerFromPointer(event);
    });

    function steerFromPointer(event) {
      if (!alive) {
        return;
      }
      var rect = canvas.getBoundingClientRect();
      var x = event.clientX - rect.left;
      pointerDir = x < rect.width / 2 ? -1 : 1;
    }

    canvas.addEventListener("pointerup", function () {
      pointerDir = 0;
    });

    canvas.addEventListener("pointercancel", function () {
      pointerDir = 0;
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(raidLevels[index]);
      }
    });

    startBtn.addEventListener("click", startGame);

    App.quietResetGlyphRaid = function () {
      if (alive) {
        stopLoop();
        alive = false;
        resultEl.textContent = t("raidPaused");
      }
    };

    loadLevel(raidLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initGlyphRaidGame = initGlyphRaidGame;
})(window.CapitalConvert = window.CapitalConvert || {});
