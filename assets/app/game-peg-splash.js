/* Peg Splash - The peg-clearing campaign in the shared game drawer. */
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
  var pegR = 6;
  var pegBallR = 6;
  var pegWidth = 320;
  var pegHeight = 300;
  var pegCannonX = 160;
  var pegCannonY = 18;
  var pegGravity = 820;
  var pegSpeed = 340;
  var pegBlueScore = 10;
  var pegOrangeScore = 50;
  var pegOrangeColor = "#fb923c";
  var pegBlueColor = "rgba(56, 189, 248, 0.8)";
  /* Staggered peg field: even rows hold 11 pegs, odd rows 10. */
  var pegFieldRows = 8;
  /* Every board deals a peg field from its seed, hides orange targets
   * inside it and hands out a ball budget; the bucket refunds catches. */
  var pegLevels = [
    { id: "b1", labelKey: "pegL1", balls: 10, orange: 6, bucketSpeed: 70, seed: 5 },
    { id: "b2", labelKey: "pegL2", balls: 10, orange: 8, bucketSpeed: 85, seed: 13 },
    { id: "b3", labelKey: "pegL3", balls: 9, orange: 10, bucketSpeed: 100, seed: 29 },
    { id: "b4", labelKey: "pegL4", balls: 9, orange: 12, bucketSpeed: 115, seed: 47 },
    { id: "b5", labelKey: "pegL5", balls: 8, orange: 14, bucketSpeed: 130, seed: 73 },
    { id: "b6", labelKey: "pegL6", balls: 8, orange: 16, bucketSpeed: 150, seed: 101 },
    { id: "b7", labelKey: "pegL7", balls: 8, orange: 17, bucketSpeed: 165, seed: 137 },
    { id: "b8", labelKey: "pegL8", balls: 7, orange: 18, bucketSpeed: 180, seed: 173 },
    { id: "b9", labelKey: "pegL9", balls: 7, orange: 19, bucketSpeed: 190, seed: 191 },
    { id: "b10", labelKey: "pegL10", balls: 6, orange: 20, bucketSpeed: 200, seed: 197 },
    { id: "b11", labelKey: "lvlNum11", balls: 6, orange: 22, bucketSpeed: 230, seed: 211 },
    { id: "b12", labelKey: "lvlNum12", balls: 6, orange: 24, bucketSpeed: 260, seed: 223 },
    { id: "b13", labelKey: "lvlNum13", balls: 6, orange: 26, bucketSpeed: 290, seed: 233 },
    { id: "b14", labelKey: "lvlNum14", balls: 6, orange: 28, bucketSpeed: 320, seed: 241 },
  ];

  function mulberry32(seed) {
    var value = seed >>> 0;
    return function () {
      value = (value + 0x6d2b79f5) >>> 0;
      var mixed = Math.imul(value ^ (value >>> 15), 1 | value);
      mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  }

  function initPegSplashGame() {
    var canvas = getElement("pegCanvas");
    var scoreEl = getElement("pegScore");
    var targetsEl = getElement("pegTargets");
    var ballsEl = getElement("pegBalls");
    var resultEl = getElement("pegResult");
    var startBtn = getElement("pegStartBtn");
    var bestEl = getElement("pegBest");
    var selectEl = getElement("pegLevelSel");
    if (
      !canvas ||
      !scoreEl ||
      !targetsEl ||
      !ballsEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "peg-splash-campaign", levels: pegLevels });
    var level = pegLevels[0];
    var pegs = [];
    var ball = null;
    var aim = Math.PI / 2;
    var ballsLeft = 0;
    var score = 0;
    var phase = 0;
    var alive = false;
    var rafId = null;
    var lastFrame = 0;
    var particles = [];
    var caughtFlash = 0;

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
      targetsEl.textContent = String(pegs.filter(function (peg) {
        return peg.alive && peg.orange;
      }).length);
      ballsEl.textContent = String(ballsLeft);
    }

    function buildField() {
      var rng = mulberry32(level.seed);
      pegs = [];
      for (var row = 0; row < pegFieldRows; row += 1) {
        var cols = row % 2 === 0 ? 11 : 10;
        for (var col = 0; col < cols; col += 1) {
          if (rng() < 0.12) {
            continue;
          }
          pegs.push({
            x: 20 + col * 28 + (row % 2 ? 14 : 0),
            y: 60 + row * 26,
            orange: false,
            alive: true,
          });
        }
      }
      var shuffled = pegs.slice();
      for (var i = shuffled.length - 1; i > 0; i -= 1) {
        var j = Math.floor(rng() * (i + 1));
        var swap = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = swap;
      }
      for (var o = 0; o < level.orange && o < shuffled.length; o += 1) {
        shuffled[o].orange = true;
      }
    }

    function bucketX() {
      return 160 + Math.sin(phase) * 118;
    }

    function burst(x, y, color, count) {
      for (var index = 0; index < count; index += 1) {
        particles.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 180,
          vy: (Math.random() - 0.5) * 180 - 60,
          life: 1,
          color: color,
        });
      }
    }

    function fire() {
      if (!alive || ball) {
        return;
      }
      ball = {
        x: pegCannonX,
        y: pegCannonY,
        vx: Math.cos(aim) * pegSpeed,
        vy: Math.sin(aim) * pegSpeed,
        trail: [],
      };
      ballsLeft -= 1;
      renderHud();
    }

    function orangeLeft() {
      return pegs.filter(function (peg) {
        return peg.alive && peg.orange;
      }).length;
    }

    function gameOver() {
      alive = false;
      draw();
      resultEl.textContent =
        t("pegOut", { n: score }) + " " + t("pegRetry");
    }

    function levelCleared() {
      alive = false;
      var starsWon = Math.max(1, starsFor(ballsLeft, [3, 2, 1], "high"));
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: level.balls - ballsLeft,
        better: "low",
      });
      var message = t("pegCleared", {
        name: t(level.labelKey),
        n: score,
        m: ballsLeft,
        stars: starsWon,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("pegNextBoard");
      } else if (campaign.clearedCount() === pegLevels.length) {
        message += " " + t("pegCampaignDone");
      }
      logAction(t("logPegSplash", { name: t(level.labelKey), n: score }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(pegLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function update(dt) {
      phase += dt * (level.bucketSpeed / 118);
      var aliveParticles = [];
      for (var index = 0; index < particles.length; index += 1) {
        var spark = particles[index];
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.vy += 260 * dt;
        spark.life -= dt * 2;
        if (spark.life > 0) {
          aliveParticles.push(spark);
        }
      }
      particles = aliveParticles;
      if (caughtFlash > 0) {
        caughtFlash = Math.max(0, caughtFlash - dt * 2.5);
      }
      if (!ball) {
        return;
      }
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 9) {
        ball.trail.shift();
      }
      ball.vy += pegGravity * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.x < pegBallR) {
        ball.x = pegBallR;
        ball.vx = Math.abs(ball.vx) * 0.95;
      } else if (ball.x > pegWidth - pegBallR) {
        ball.x = pegWidth - pegBallR;
        ball.vx = -Math.abs(ball.vx) * 0.95;
      }
      for (var p = 0; p < pegs.length; p += 1) {
        var peg = pegs[p];
        if (!peg.alive) {
          continue;
        }
        var dx = ball.x - peg.x;
        var dy = ball.y - peg.y;
        var distSq = dx * dx + dy * dy;
        var minDist = pegR + pegBallR + 1;
        if (distSq < minDist * minDist && distSq > 0.0001) {
          var dist = Math.sqrt(distSq);
          var nx = dx / dist;
          var ny = dy / dist;
          var dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 2 * dot * nx) * 0.82;
          ball.vy = (ball.vy - 2 * dot * ny) * 0.82;
          ball.x = peg.x + nx * minDist;
          ball.y = peg.y + ny * minDist;
          peg.alive = false;
          score += peg.orange ? pegOrangeScore : pegBlueScore;
          burst(peg.x, peg.y, peg.orange ? pegOrangeColor : pegBlueColor, 8);
          renderHud();
          if (orangeLeft() === 0) {
            levelCleared();
            return;
          }
          break;
        }
      }
      if (ball.y > pegHeight - 16 && ball.vy > 0 && Math.abs(ball.x - bucketX()) < 26) {
        ball = null;
        ballsLeft += 1;
        caughtFlash = 1;
        renderHud();
        return;
      }
      if (ball.y > pegHeight + 12) {
        ball = null;
        if (ballsLeft <= 0) {
          gameOver();
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, pegWidth, pegHeight);
      if (App.world) { App.world.backdrop(ctx, pegWidth, pegHeight, "ocean"); }
      for (var index = 0; index < pegs.length; index += 1) {
        var peg = pegs[index];
        if (!peg.alive) {
          continue;
        }
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, pegR, 0, Math.PI * 2);
        ctx.fillStyle = peg.orange ? pegOrangeColor : pegBlueColor;
        ctx.fill();
      }
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      for (var dot = 1; dot <= 5; dot += 1) {
        ctx.beginPath();
        ctx.arc(
          pegCannonX + Math.cos(aim) * dot * 14,
          pegCannonY + Math.sin(aim) * dot * 14,
          2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(pegCannonX, pegCannonY, 9, 0, Math.PI * 2);
      ctx.fillStyle = "#e2e8f0";
      ctx.fill();
      if (ball) {
        for (var t2 = 0; t2 < ball.trail.length; t2 += 1) {
          ctx.globalAlpha = (t2 / ball.trail.length) * 0.5;
          ctx.beginPath();
          ctx.arc(ball.trail[t2].x, ball.trail[t2].y, pegBallR * 0.7, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, pegBallR, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }
      var bx = bucketX();
      ctx.fillStyle = caughtFlash > 0
        ? "rgba(163, 230, 53, " + (0.5 + caughtFlash * 0.5).toFixed(2) + ")"
        : "rgba(163, 230, 53, 0.55)";
      ctx.beginPath();
      ctx.moveTo(bx - 26, pegHeight - 18);
      ctx.lineTo(bx + 26, pegHeight - 18);
      ctx.lineTo(bx + 18, pegHeight - 2);
      ctx.lineTo(bx - 18, pegHeight - 2);
      ctx.closePath();
      ctx.fill();
      for (var p2 = 0; p2 < particles.length; p2 += 1) {
        var spark = particles[p2];
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

    function setAimFromPointer(clientX, clientY) {
      if (!alive || ball) {
        return;
      }
      var rect = canvas.getBoundingClientRect();
      var x = (clientX - rect.left) * pegWidth / (rect.width || pegWidth);
      var y = (clientY - rect.top) * pegHeight / (rect.height || pegHeight);
      var angle = Math.atan2(y - pegCannonY, x - pegCannonX);
      aim = Math.max(0.26, Math.min(Math.PI - 0.26, angle));
    }

    function loadLevel(levelDef) {
      stopLoop();
      alive = false;
      level = levelDef;
      buildField();
      ball = null;
      particles = [];
      ballsLeft = level.balls;
      score = 0;
      phase = 0;
      aim = Math.PI / 2;
      renderHud();
      refreshPicker();
      draw();
      resultEl.textContent = t("pegReady", { n: level.orange, m: level.balls });
    }

    function startGame() {
      loadLevel(level);
      alive = true;
      resultEl.textContent = t("pegGo");
      startLoop();
      canvas.focus();
    }

    canvas.addEventListener("pointermove", function (event) {
      setAimFromPointer(event.clientX, event.clientY);
    });

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      setAimFromPointer(event.clientX, event.clientY);
      fire();
    });

    canvas.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        aim = Math.max(0.26, aim - 0.05);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        aim = Math.min(Math.PI - 0.26, aim + 0.05);
      } else if (event.key === " ") {
        event.preventDefault();
        fire();
      }
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(pegLevels[index]);
      }
    });

    startBtn.addEventListener("click", startGame);

    App.quietResetPegSplash = function () {
      if (alive) {
        stopLoop();
        alive = false;
        ball = null;
        resultEl.textContent = t("pegPaused");
      }
    };

    loadLevel(pegLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initPegSplashGame = initPegSplashGame;
})(window.CapitalConvert = window.CapitalConvert || {});
