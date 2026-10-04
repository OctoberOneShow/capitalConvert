/* Glyph Leap - The vertical hopper campaign in the shared game drawer. */
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
  var leapWidth = 320;
  var leapHeight = 360;
  var leapGravity = 1100;
  var leapBounce = 460;
  var leapSpringBounce = 720;
  var leapRunSpeed = 240;
  var leapRunAccel = 950;
  var leapGroundY = 340;
  /* Ascents: climb to a height goal; the ledges spread out and drift more
   * the higher the climb goes. Star times are [3-star, 2-star, 1-star]. */
  var leapLevels = [
    { id: "h1", labelKey: "leapL1", goal: 1400, gapMin: 55, gapMax: 80, moving: 0.1, spring: 0.08, starTimes: [28, 42, 60] },
    { id: "h2", labelKey: "leapL2", goal: 2000, gapMin: 60, gapMax: 88, moving: 0.15, spring: 0.09, starTimes: [34, 50, 70] },
    { id: "h3", labelKey: "leapL3", goal: 2600, gapMin: 64, gapMax: 92, moving: 0.2, spring: 0.1, starTimes: [40, 58, 80] },
    { id: "h4", labelKey: "leapL4", goal: 3200, gapMin: 68, gapMax: 92, moving: 0.25, spring: 0.11, starTimes: [46, 66, 90] },
    { id: "h5", labelKey: "leapL5", goal: 3800, gapMin: 72, gapMax: 92, moving: 0.3, spring: 0.12, starTimes: [52, 74, 100] },
    { id: "h6", labelKey: "leapL6", goal: 4400, gapMin: 76, gapMax: 92, moving: 0.35, spring: 0.13, starTimes: [58, 82, 110] },
    { id: "h7", labelKey: "leapL7", goal: 5000, gapMin: 72, gapMax: 90, moving: 0.38, spring: 0.14, starTimes: [64, 90, 120] },
    { id: "h8", labelKey: "leapL8", goal: 5600, gapMin: 74, gapMax: 92, moving: 0.4, spring: 0.15, starTimes: [70, 98, 130] },
    { id: "h9", labelKey: "leapL9", goal: 6200, gapMin: 76, gapMax: 92, moving: 0.42, spring: 0.15, starTimes: [76, 106, 140] },
    { id: "h10", labelKey: "leapL10", goal: 6800, gapMin: 78, gapMax: 92, moving: 0.44, spring: 0.16, starTimes: [82, 114, 150] },
    { id: "h11", labelKey: "lvlNum11", goal: 7700, gapMin: 78, gapMax: 92, moving: 0.44, spring: 0.16, starTimes: [88, 122, 161] },
    { id: "h12", labelKey: "lvlNum12", goal: 8600, gapMin: 78, gapMax: 92, moving: 0.44, spring: 0.16, starTimes: [94, 131, 172] },
    { id: "h13", labelKey: "lvlNum13", goal: 9500, gapMin: 78, gapMax: 92, moving: 0.44, spring: 0.16, starTimes: [101, 140, 184] },
    { id: "h14", labelKey: "lvlNum14", goal: 10400, gapMin: 78, gapMax: 92, moving: 0.44, spring: 0.16, starTimes: [108, 150, 197] },
  ];

  function initGlyphLeapGame() {
    var canvas = getElement("leapCanvas");
    var heightEl = getElement("leapHeight");
    var timeEl = getElement("leapTime");
    var jumpsEl = getElement("leapJumps");
    var resultEl = getElement("leapResult");
    var startBtn = getElement("leapStartBtn");
    var bestEl = getElement("leapBest");
    var selectEl = getElement("leapLevelSel");
    if (
      !canvas ||
      !heightEl ||
      !timeEl ||
      !jumpsEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "glyph-leap-campaign", levels: leapLevels });
    var level = leapLevels[0];
    var platforms = [];
    var player = { x: 160, y: leapGroundY - 9, vx: 0, vy: 0, r: 9 };
    var camY = 0;
    var height = 0;
    var jumps = 0;
    var squash = 0;
    var keyDir = 0;
    var pointerDir = 0;
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
      heightEl.textContent = height + "/" + level.goal;
      timeEl.textContent = alive
        ? ((Date.now() - startedAt) / 1000).toFixed(1) + "s"
        : timeEl.textContent;
      jumpsEl.textContent = String(jumps);
    }

    function generateAbove(topY) {
      while (topY > camY - 120) {
        var gap = level.gapMin + Math.random() * (level.gapMax - level.gapMin);
        var y = topY - gap;
        var roll = Math.random();
        var kind = roll < level.spring ? "spring" : roll < level.spring + level.moving ? "move" : "static";
        var w = kind === "spring" ? 52 : 64;
        var baseX = 10 + Math.random() * (leapWidth - 20 - w);
        platforms.push({
          baseX: baseX,
          x: baseX,
          y: y,
          w: w,
          kind: kind,
          phase: Math.random() * Math.PI * 2,
          amp: kind === "move" ? 34 + Math.random() * 36 : 0,
          speed: 0.8 + Math.random() * 0.6,
        });
        topY = y;
      }
    }

    function burst(x, y, color, count) {
      for (var index = 0; index < count; index += 1) {
        particlesPool.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 130,
          vy: (Math.random() - 0.5) * 130 - 30,
          life: 1,
          color: color,
        });
      }
    }
    var particlesPool = [];

    function gameOver() {
      alive = false;
      draw();
      resultEl.textContent =
        t("leapOver", { n: height }) + " " + t("leapRetry");
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
      var message = t("leapCleared", {
        n: level.goal,
        s: seconds.toFixed(1),
        stars: starsWon,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("leapNextAscent");
      } else if (campaign.clearedCount() === leapLevels.length) {
        message += " " + t("leapCampaignDone");
      }
      logAction(t("logGlyphLeap", { n: level.goal }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(leapLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function update(dt) {
      var now = Date.now();
      platforms.forEach(function (p) {
        if (p.kind === "move") {
          p.x = p.baseX + Math.sin(p.phase + now / 1000 * p.speed) * p.amp;
        }
      });
      var steer = keyDir || pointerDir;
      if (steer !== 0) {
        player.vx += steer * leapRunAccel * dt;
        player.vx = Math.max(-leapRunSpeed, Math.min(leapRunSpeed, player.vx));
      } else {
        player.vx -= player.vx * Math.min(1, dt * 6);
      }
      player.vy += leapGravity * dt;
      var prevY = player.y;
      player.x += player.vx * dt;
      player.y += player.vy * dt;
      if (player.x < -player.r) {
        player.x = leapWidth + player.r;
      } else if (player.x > leapWidth + player.r) {
        player.x = -player.r;
      }
      if (player.vy > 0) {
        for (var index = 0; index < platforms.length; index += 1) {
          var p = platforms[index];
          if (
            prevY + player.r <= p.y + 4 &&
            player.y + player.r >= p.y &&
            player.x > p.x - player.r &&
            player.x < p.x + p.w + player.r
          ) {
            player.y = p.y - player.r;
            player.vy = p.kind === "spring" ? -leapSpringBounce : -leapBounce;
            jumps += 1;
            squash = 1;
            burst(player.x, p.y, p.kind === "spring" ? "#a3e635" : "rgba(148, 163, 184, 0.9)", p.kind === "spring" ? 10 : 4);
            break;
          }
        }
      }
      if (player.y - camY < leapHeight * 0.42) {
        camY = player.y - leapHeight * 0.42;
      }
      /* Keep building the ascent as the camera climbs, then discard ledges
       * the player can no longer reach below the screen. */
      generateAbove(platforms[platforms.length - 1].y);
      platforms = platforms.filter(function (platform) {
        return platform.y <= camY + leapHeight + 40;
      });
      var climbed = Math.floor(leapGroundY - player.y);
      if (climbed > height) {
        height = climbed;
      }
      if (squash > 0) {
        squash = Math.max(0, squash - dt * 5);
      }
      var aliveParticles = [];
      for (var p2 = 0; p2 < particlesPool.length; p2 += 1) {
        var spark = particlesPool[p2];
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.life -= dt * 2.2;
        if (spark.life > 0) {
          aliveParticles.push(spark);
        }
      }
      particlesPool = aliveParticles;
      if (height >= level.goal) {
        renderHud();
        levelCleared();
        return;
      }
      if (player.y - camY > leapHeight + 40) {
        gameOver();
        return;
      }
      renderHud();
    }

    function draw() {
      ctx.clearRect(0, 0, leapWidth, leapHeight);
      ctx.save();
      ctx.translate(0, -camY);
      /* Height guide lines every 250 units once the climb starts. */
      var guideY = Math.floor(camY / 250) * 250;
      ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
      ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      for (var g = 0; g < 4; g += 1) {
        var y = guideY - g * 250;
        if (y < camY || y < 250) {
          continue;
        }
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(leapWidth, y + 0.5);
        ctx.stroke();
        ctx.fillText(String(Math.round(leapGroundY - y)), 4, y - 3);
      }
      for (var index = 0; index < platforms.length; index += 1) {
        var p = platforms[index];
        if (p.y < camY - 20 || p.y > camY + leapHeight + 20) {
          continue;
        }
        ctx.fillStyle =
          p.kind === "spring"
            ? "#a3e635"
            : p.kind === "move"
              ? "rgba(251, 191, 36, 0.9)"
              : "rgba(148, 163, 184, 0.85)";
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(p.x, p.y, p.w, 7, 4) : ctx.rect(p.x, p.y, p.w, 7);
        ctx.fill();
        if (p.kind === "spring") {
          ctx.strokeStyle = "rgba(15, 23, 42, 0.5)";
          ctx.beginPath();
          ctx.moveTo(p.x + p.w / 2 - 5, p.y - 4);
          ctx.lineTo(p.x + p.w / 2 + 5, p.y - 4);
          ctx.stroke();
        }
      }
      for (var p2 = 0; p2 < particlesPool.length; p2 += 1) {
        var spark = particlesPool[p2];
        ctx.globalAlpha = Math.max(0, spark.life);
        ctx.fillStyle = spark.color;
        ctx.fillRect(spark.x - 2, spark.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;
      var squashScale = 1 + squash * 0.35;
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.scale(1, squashScale);
      ctx.beginPath();
      ctx.arc(0, 0, player.r, 0, Math.PI * 2);
      ctx.fillStyle = "#22d3ee";
      ctx.fill();
      ctx.fillStyle = "#101426";
      ctx.beginPath();
      ctx.arc(-3, -2, 1.6, 0, Math.PI * 2);
      ctx.arc(3, -2, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.restore();
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

    function loadLevel(levelDef) {
      stopLoop();
      alive = false;
      level = levelDef;
      platforms = [
        { baseX: 120, x: 120, y: leapGroundY, w: 80, kind: "static", phase: 0, amp: 0, speed: 0 },
      ];
      particlesPool = [];
      camY = 0;
      height = 0;
      jumps = 0;
      squash = 0;
      keyDir = 0;
      pointerDir = 0;
      player = { x: 160, y: leapGroundY - 9, vx: 0, vy: 0, r: 9 };
      generateAbove(leapGroundY);
      renderHud();
      refreshPicker();
      draw();
      resultEl.textContent = t("leapReady", { n: level.goal });
    }

    function startGame() {
      loadLevel(level);
      alive = true;
      startedAt = Date.now();
      resultEl.textContent = t("leapGo");
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
      var rect = canvas.getBoundingClientRect();
      pointerDir = event.clientX - rect.left < rect.width / 2 ? -1 : 1;
    });

    canvas.addEventListener("pointermove", function (event) {
      if (!alive || pointerDir === 0) {
        return;
      }
      var rect = canvas.getBoundingClientRect();
      pointerDir = event.clientX - rect.left < rect.width / 2 ? -1 : 1;
    });

    canvas.addEventListener("pointerup", function () {
      pointerDir = 0;
    });

    canvas.addEventListener("pointercancel", function () {
      pointerDir = 0;
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(leapLevels[index]);
      }
    });

    startBtn.addEventListener("click", startGame);

    App.quietResetGlyphLeap = function () {
      if (alive) {
        stopLoop();
        alive = false;
        resultEl.textContent = t("leapPaused");
      }
    };

    loadLevel(leapLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initGlyphLeapGame = initGlyphLeapGame;
})(window.CapitalConvert = window.CapitalConvert || {});
