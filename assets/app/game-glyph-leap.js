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
    /* Ascents 15-20. The first fourteen only ever raised the summit; the
     * spacing and the platform mix had been frozen since h10. These six open
     * those two levers instead: the window narrows from the bottom (gapMin
     * 78 -> 84) so a short hop is no longer on offer, drifting ledges take
     * over half the rolls (moving 0.44 -> 0.56) and springs get rarer
     * (spring 0.16 -> 0.12), so a long climb has to be carried on ordinary
     * static ledges. 92 stays the ceiling because it is what a normal bounce
     * can still clear: 460 px/s against 1100 px/s^2 tops out near 96. The
     * summit keeps its +900 and the bands their ~7%, so the last ascent is a
     * taller tower built out of worse parts rather than a longer grind. */
    { id: "h15", labelKey: "lvlNum15", goal: 11300, gapMin: 78, gapMax: 92, moving: 0.46, spring: 0.15, starTimes: [115, 160, 210] },
    { id: "h16", labelKey: "lvlNum16", goal: 12200, gapMin: 80, gapMax: 92, moving: 0.48, spring: 0.15, starTimes: [122, 170, 223] },
    { id: "h17", labelKey: "lvlNum17", goal: 13100, gapMin: 80, gapMax: 92, moving: 0.5, spring: 0.14, starTimes: [129, 180, 236] },
    { id: "h18", labelKey: "lvlNum18", goal: 14000, gapMin: 82, gapMax: 92, moving: 0.52, spring: 0.14, starTimes: [136, 190, 250] },
    { id: "h19", labelKey: "lvlNum19", goal: 14900, gapMin: 82, gapMax: 92, moving: 0.54, spring: 0.13, starTimes: [143, 201, 265] },
    { id: "h20", labelKey: "lvlNum20", goal: 15800, gapMin: 84, gapMax: 92, moving: 0.56, spring: 0.12, starTimes: [151, 212, 281] },
    /* Ascents 21-24. The tiers below kept the ledge fat and tightened
     * everything around it; the deep tier's lesson is the ledge itself.
     * `ledge` scales every platform the ascent spawns - springs included -
     * so the landing window a normal bounce can hit closes rung by rung
     * (0.8 -> 0.65 of the shipped width) while the springs fade with it
     * (0.12 -> 0.09) and the drifting share keeps climbing (0.56 -> 0.62).
     * The gaps hold at the shipped ceiling because 92 is what a normal
     * bounce still clears, and the summit keeps its +900 a rung, so each
     * ascent is the same tower built on less standing room. */
    { id: "h21", labelKey: "lvlNum21", goal: 16700, gapMin: 84, gapMax: 92, moving: 0.58, spring: 0.11, ledge: 0.8, starTimes: [159, 224, 297] },
    { id: "h22", labelKey: "lvlNum22", goal: 17600, gapMin: 84, gapMax: 92, moving: 0.6, spring: 0.1, ledge: 0.75, starTimes: [169, 237, 315] },
    { id: "h23", labelKey: "lvlNum23", goal: 18500, gapMin: 86, gapMax: 92, moving: 0.62, spring: 0.09, ledge: 0.7, starTimes: [180, 252, 335] },
    { id: "h24", labelKey: "lvlNum24", goal: 19400, gapMin: 86, gapMax: 92, moving: 0.64, spring: 0.08, ledge: 0.65, starTimes: [192, 269, 358] },
  ];

  /* One more ledge above topY, drawn from the level's mix: gap, kind, width
   * and drift all come from the level's own numbers, and `ledge` narrows the
   * board every kind stands on. The live loop and the headless prover share
   * this one spawn law, so a rung proven winnable is winnable on the exact
   * ledges the player faces. */
  function leapSpawn(level, topY, rng) {
    var gap = level.gapMin + rng() * (level.gapMax - level.gapMin);
    var y = topY - gap;
    var roll = rng();
    var kind = roll < level.spring ? "spring" : roll < level.spring + level.moving ? "move" : "static";
    var w = Math.round((kind === "spring" ? 52 : 64) * (level.ledge || 1));
    var baseX = 10 + rng() * (leapWidth - 20 - w);
    return {
      baseX: baseX,
      x: baseX,
      y: y,
      w: w,
      kind: kind,
      phase: rng() * Math.PI * 2,
      amp: kind === "move" ? 34 + rng() * 36 : 0,
      speed: 0.8 + rng() * 0.6,
    };
  }

  /* The headless ascent: the shared spawn law, the live loop's platform
   * motion, bounce physics and screen wrap, integrated at a fixed tick with
   * a steering hand instead of keys. `hand(probe)` returns -1, 0 or 1 each
   * tick - the same choice a player's arrow key makes - and the probe
   * carries the player, the climb and the ledges currently on screen, so a
   * rung proven winnable here is winnable on the physics the player faces.
   * No rendering and no fx; the clock is the sim's own integrated seconds. */
  function leapSimulate(level, hand, rng) {
    var platforms = [
      { baseX: 120, x: 120, y: leapGroundY, w: 80, kind: "static", phase: 0, amp: 0, speed: 0 },
    ];
    var player = { x: 160, y: leapGroundY - 9, vx: 0, vy: 0, r: 9 };
    var camY = 0;
    var height = 0;
    var seconds = 0;
    var jumps = 0;
    var topY = leapGroundY;
    var dt = 1 / 60;
    var guard = 0;
    function spawnAbove() {
      while (topY > camY - 120) {
        var platform = leapSpawn(level, topY, rng);
        platforms.push(platform);
        topY = platform.y;
      }
    }
    spawnAbove();
    while (guard < 432000) {
      guard += 1;
      var now = seconds * 1000;
      platforms.forEach(function (p) {
        if (p.kind === "move") {
          var prevX = p.x;
          p.x = p.baseX + Math.sin(p.phase + now / 1000 * p.speed) * p.amp;
          p.drift = p.x - prevX;
        } else {
          p.drift = 0;
        }
      });
      var probe = {
        levelId: level.id,
        height: height,
        seconds: seconds,
        jumps: jumps,
        player: { x: player.x, y: player.y, vx: player.vx, vy: player.vy },
        camY: camY,
        platforms: platforms.map(function (p) {
          return { x: p.x, y: p.y, w: p.w, kind: p.kind, drift: p.drift || 0 };
        }),
      };
      var steer = hand(probe) || 0;
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
            break;
          }
        }
      }
      if (player.y - camY < leapHeight * 0.42) {
        camY = player.y - leapHeight * 0.42;
      }
      spawnAbove();
      platforms = platforms.filter(function (platform) {
        return platform.y <= camY + leapHeight + 40;
      });
      var climbed = Math.floor(leapGroundY - player.y);
      if (climbed > height) {
        height = climbed;
      }
      seconds += dt;
      if (height >= level.goal) {
        return { cleared: true, seconds: Math.round(seconds * 10) / 10, jumps: jumps, height: height };
      }
      if (player.y - camY > leapHeight + 40) {
        return { cleared: false, seconds: Math.round(seconds * 10) / 10, jumps: jumps, height: height };
      }
    }
    return { cleared: false, seconds: Math.round(seconds * 10) / 10, jumps: jumps, height: height, stalled: true };
  }

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
        var platform = leapSpawn(level, topY, Math.random);
        platforms.push(platform);
        topY = platform.y;
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
      if (App.world) { App.world.backdrop(ctx, leapWidth, leapHeight, "forest"); }
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


  /* Exported for the other modules and the headless checks. */
  App.initGlyphLeapGame = initGlyphLeapGame;
  App.leapLevels = leapLevels;
  App.leapSimulate = leapSimulate;
  App.leapSpawn = leapSpawn;
  App.leapBounce = leapBounce;
  App.leapGravity = leapGravity;
  App.leapWidth = leapWidth;
  App.leapHeight = leapHeight;
})(window.CapitalConvert = window.CapitalConvert || {});
