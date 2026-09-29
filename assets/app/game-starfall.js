/* Starfall Lander - The thrust-and-touchdown campaign in the shared game drawer. */
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
  var lantWidth = 320;
  var lantHeight = 360;
  var lantThrust = 235;
  var lantTurn = 2.6;
  var lantSafeVy = 36;
  var lantSafeVx = 28;
  var lantSafeAngle = 0.5;
  var lantBurnPerSecond = 16;
  /* Terrain is a polyline over fixed control points (fractions of the
   * width, ground heights in px); the pad is a flat span between them.
   * Star thresholds are fuel left on touchdown [3-star, 2-star, 1-star]. */
  var lantLevels = [
    {
      id: "s1", labelKey: "lantL1", gravity: 56, fuel: 100,
      terrain: [[0, 300], [0.3, 310], [0.62, 310], [1, 300]],
      pad: { x0: 0.36, x1: 0.64, y: 310 },
      starFuel: [55, 38, 20],
    },
    {
      id: "s2", labelKey: "lantL2", gravity: 64, fuel: 94,
      terrain: [[0, 280], [0.22, 320], [0.5, 250], [0.8, 320], [1, 290]],
      pad: { x0: 0.4, x1: 0.62, y: 320 },
      starFuel: [50, 34, 18],
    },
    {
      id: "s3", labelKey: "lantL3", gravity: 72, fuel: 90,
      terrain: [[0, 320], [0.25, 250], [0.55, 330], [0.78, 260], [1, 320]],
      pad: { x0: 0.62, x1: 0.84, y: 260 },
      starFuel: [45, 30, 16],
    },
    {
      id: "s4", labelKey: "lantL4", gravity: 80, fuel: 86,
      terrain: [[0, 260], [0.18, 330], [0.42, 240], [0.66, 330], [0.88, 250], [1, 300]],
      pad: { x0: 0.46, x1: 0.62, y: 240 },
      starFuel: [36, 24, 12],
    },
    {
      id: "s5", labelKey: "lantL5", gravity: 88, fuel: 86,
      terrain: [[0, 300], [0.2, 240], [0.45, 330], [0.7, 250], [1, 330]],
      pad: { x0: 0.3, x1: 0.44, y: 240 },
      starFuel: [30, 20, 10],
    },
    {
      id: "s6", labelKey: "lantL6", gravity: 96, fuel: 84,
      terrain: [[0, 330], [0.16, 250], [0.38, 330], [0.6, 246], [0.82, 330], [1, 260]],
      pad: { x0: 0.53, x1: 0.65, y: 246 },
      starFuel: [26, 17, 9],
    },
    {
      id: "s7", labelKey: "lantL7", gravity: 100, fuel: 82,
      terrain: [[0, 320], [0.2, 250], [0.45, 330], [0.68, 246], [0.9, 330], [1, 270]],
      pad: { x0: 0.62, x1: 0.74, y: 246 },
      starFuel: [30, 20, 10],
    },
    {
      id: "s8", labelKey: "lantL8", gravity: 108, fuel: 80,
      terrain: [[0, 330], [0.18, 246], [0.4, 330], [0.62, 250], [0.84, 330], [1, 270]],
      pad: { x0: 0.12, x1: 0.26, y: 246 },
      starFuel: [26, 17, 9],
    },
  ];

  function initStarfallGame() {
    var canvas = getElement("lantCanvas");
    var fuelEl = getElement("lantFuel");
    var speedEl = getElement("lantSpeed");
    var timeEl = getElement("lantTime");
    var resultEl = getElement("lantResult");
    var startBtn = getElement("lantStartBtn");
    var bestEl = getElement("lantBest");
    var selectEl = getElement("lantLevelSel");
    var thrustBtn = getElement("lantThrust");
    var leftBtn = getElement("lantLeft");
    var rightBtn = getElement("lantRight");
    if (
      !canvas ||
      !fuelEl ||
      !speedEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl ||
      !thrustBtn ||
      !leftBtn ||
      !rightBtn
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "starfall-campaign", levels: lantLevels });
    var level = lantLevels[0];
    var lander = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, fuel: 0 };
    var flying = false;
    var landed = false;
    var thrusting = false;
    var keyThrust = false;
    var keyTurn = 0;
    var padTurn = 0;
    var flame = [];
    var explosion = [];
    var rafId = null;
    var lastFrame = 0;
    var startedAt = 0;
    var attempts = 0;

    /* Fixed starfield */
    var stars = [];
    for (var seed = 0; seed < 42; seed += 1) {
      stars.push({
        x: (seed * 89) % lantWidth,
        y: (seed * 127) % (lantHeight - 60),
        s: (seed % 3) * 0.5 + 0.6,
        p: (seed % 5),
      });
    }

    function terrainY(x) {
      var points = level.terrain;
      if (x <= 0) {
        return points[0][1];
      }
      if (x >= lantWidth) {
        return points[points.length - 1][1];
      }
      for (var index = 1; index < points.length; index += 1) {
        if (x <= points[index][0] * lantWidth) {
          var x0 = points[index - 1][0] * lantWidth;
          var x1 = points[index][0] * lantWidth;
          var y0 = points[index - 1][1];
          var y1 = points[index][1];
          var f = (x - x0) / Math.max(x1 - x0, 1);
          return y0 + (y1 - y0) * f;
        }
      }
      return points[points.length - 1][1];
    }

    function padX0() {
      return level.pad.x0 * lantWidth;
    }
    function padX1() {
      return level.pad.x1 * lantWidth;
    }

    function onPad(x) {
      return x >= padX0() && x <= padX1();
    }

    function renderHud() {
      fuelEl.textContent = Math.max(0, Math.round(lander.fuel)) + "%";
      speedEl.textContent = flying
        ? Math.round(Math.hypot(lander.vx, lander.vy)) + " u/s"
        : speedEl.textContent;
      timeEl.textContent = flying
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

    function spawn() {
      lander = {
        x: 34,
        y: 44,
        vx: 14,
        vy: 0,
        angle: 0,
        fuel: level.fuel,
      };
      flame = [];
      thrusting = false;
    }

    function loadLevel(levelDef) {
      level = levelDef;
      landed = false;
      flying = false;
      attempts = 0;
      explosion = [];
      spawn();
      renderHud();
      refreshPicker();
      startLoop();
      draw();
      resultEl.textContent = t("lantReady", { n: level.fuel });
    }

    function startRun() {
      if (flying || landed) {
        return;
      }
      spawn();
      attempts += 1;
      flying = true;
      startedAt = Date.now();
      resultEl.textContent = t("lantGo");
      canvas.focus();
    }

    function touchdown() {
      flying = false;
      landed = true;
      var fuelLeft = Math.max(0, Math.round(lander.fuel));
      var starsWon = starsFor(fuelLeft, level.starFuel, "high");
      if (starsWon <= 0) {
        starsWon = 1;
      }
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: fuelLeft,
        better: "high",
      });
      var message = t("lantCleared", { n: fuelLeft, stars: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("lantNextSector");
      } else if (campaign.clearedCount() === lantLevels.length) {
        message += " " + t("lantCampaignDone");
      }
      logAction(t("logStarfall", { n: fuelLeft }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(lantLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function crash() {
      flying = false;
      for (var index = 0; index < 26; index += 1) {
        explosion.push({
          x: lander.x,
          y: lander.y,
          vx: (Math.random() - 0.5) * 240,
          vy: (Math.random() - 0.5) * 240 - 40,
          life: 1,
          color: Math.random() > 0.5 ? "#ff6b35" : "#fb7185",
        });
      }
      resultEl.textContent = t("lantCrash") + " " + t("lantAgain");
      window.setTimeout(function () {
        if (!flying && !landed && explosion.length) {
          spawn();
        }
      }, 700);
    }

    function update(dt) {
      if (flying) {
        var turn = keyTurn || padTurn;
        lander.angle += turn * lantTurn * dt;
        lander.angle = Math.max(-Math.PI, Math.min(Math.PI, lander.angle));
        var burning = (thrusting || keyThrust) && lander.fuel > 0;
        if (burning) {
          lander.vx += Math.sin(lander.angle) * lantThrust * dt;
          lander.vy -= Math.cos(lander.angle) * lantThrust * dt;
          lander.fuel = Math.max(0, lander.fuel - lantBurnPerSecond * dt);
          flame.push({
            x: lander.x - Math.sin(lander.angle) * 10,
            y: lander.y + Math.cos(lander.angle) * 10,
            vx: -Math.sin(lander.angle) * 90 + (Math.random() - 0.5) * 40,
            vy: Math.cos(lander.angle) * 90 + (Math.random() - 0.5) * 40,
            life: 1,
          });
        }
        lander.vy += level.gravity * dt;
        lander.x += lander.vx * dt;
        lander.y += lander.vy * dt;
        if (lander.x < 6) {
          lander.x = 6;
          lander.vx = Math.abs(lander.vx) * 0.4;
        } else if (lander.x > lantWidth - 6) {
          lander.x = lantWidth - 6;
          lander.vx = -Math.abs(lander.vx) * 0.4;
        }
        if (lander.y < 8) {
          lander.y = 8;
          lander.vy = Math.abs(lander.vy) * 0.3;
        }
        var ground = terrainY(lander.x);
        if (lander.y + 10 >= ground) {
          lander.y = ground - 10;
          if (
            onPad(lander.x) &&
            lander.vy < lantSafeVy &&
            lander.vy > -lantSafeVy &&
            Math.abs(lander.vx) < lantSafeVx &&
            Math.abs(lander.angle) < lantSafeAngle
          ) {
            touchdown();
            return;
          }
          crash();
          return;
        }
      }
      var aliveFlame = [];
      for (var f = 0; f < flame.length; f += 1) {
        var spark = flame[f];
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.vy += 60 * dt;
        spark.life -= dt * 3;
        if (spark.life > 0) {
          aliveFlame.push(spark);
        }
      }
      flame = aliveFlame;
      var aliveBoom = [];
      for (var b = 0; b < explosion.length; b += 1) {
        var bit = explosion[b];
        bit.x += bit.vx * dt;
        bit.y += bit.vy * dt;
        bit.vy += 220 * dt;
        bit.life -= dt * 1.4;
        if (bit.life > 0) {
          aliveBoom.push(bit);
        }
      }
      explosion = aliveBoom;
      if (flying) {
        renderHud();
      }
    }

    function drawLander(x, y, angle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(7, 2);
      ctx.lineTo(10, 8);
      ctx.lineTo(-10, 8);
      ctx.lineTo(-7, 2);
      ctx.closePath();
      ctx.fillStyle = "#22d3ee";
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = "#101426";
      ctx.fill();
      ctx.strokeStyle = "rgba(148, 163, 184, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-6, 8);
      ctx.lineTo(-9, 12);
      ctx.moveTo(6, 8);
      ctx.lineTo(9, 12);
      ctx.stroke();
      ctx.restore();
    }

    function draw() {
      var time = Date.now();
      ctx.clearRect(0, 0, lantWidth, lantHeight);
      stars.forEach(function (star) {
        ctx.globalAlpha = 0.2 + 0.25 * Math.sin(time / 650 + star.p);
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(star.x, star.y, star.s, star.s);
      });
      ctx.globalAlpha = 1;
      /* Terrain */
      ctx.beginPath();
      ctx.moveTo(0, level.terrain[0][1]);
      level.terrain.forEach(function (point) {
        ctx.lineTo(point[0] * lantWidth, point[1]);
      });
      ctx.lineTo(lantWidth, lantHeight);
      ctx.lineTo(0, lantHeight);
      ctx.closePath();
      ctx.fillStyle = "rgba(30, 41, 59, 0.85)";
      ctx.fill();
      /* Landing pad */
      ctx.beginPath();
      ctx.moveTo(padX0(), level.pad.y);
      ctx.lineTo(padX1(), level.pad.y);
      ctx.strokeStyle = "#a3e635";
      ctx.lineWidth = 4;
      ctx.shadowColor = "#a3e635";
      ctx.shadowBlur = 12 + Math.sin(time / 240) * 5;
      ctx.stroke();
      ctx.shadowBlur = 0;
      /* Flame */
      flame.forEach(function (spark) {
        ctx.globalAlpha = Math.max(0, spark.life) * 0.9;
        ctx.fillStyle = Math.random() > 0.5 ? "#ff6b35" : "#fbbf24";
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, 2.4 * spark.life + 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      /* Explosion */
      explosion.forEach(function (bit) {
        ctx.globalAlpha = Math.max(0, bit.life);
        ctx.fillStyle = bit.color;
        ctx.fillRect(bit.x - 2, bit.y - 2, 4, 4);
      });
      ctx.globalAlpha = 1;
      drawLander(lander.x, lander.y, lander.angle);
    }

    function frame(now) {
      if (rafId === null) {
        return;
      }
      var dt = Math.min(0.032, (now - lastFrame) / 1000 || 0.016);
      lastFrame = now;
      /* The lander only flies on its own panel. */
      if (document.getElementById("gamePanelStarfall").hidden || document.hidden) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      update(dt);
      draw();
      rafId = window.requestAnimationFrame(frame);
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

    canvas.addEventListener("keydown", function (event) {
      if (event.key === "ArrowUp" || event.key === "w") {
        event.preventDefault();
        keyThrust = true;
      } else if (event.key === "ArrowLeft" || event.key === "a") {
        event.preventDefault();
        keyTurn = -1;
      } else if (event.key === "ArrowRight" || event.key === "d") {
        event.preventDefault();
        keyTurn = 1;
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        startRun();
      }
    });

    canvas.addEventListener("keyup", function (event) {
      if (event.key === "ArrowUp" || event.key === "w") {
        keyThrust = false;
      } else if (event.key === "ArrowLeft" || event.key === "a") {
        keyTurn = keyTurn === -1 ? 0 : keyTurn;
      } else if (event.key === "ArrowRight" || event.key === "d") {
        keyTurn = keyTurn === 1 ? 0 : keyTurn;
      }
    });

    function bindHold(button, onDown, onUp) {
      button.addEventListener("pointerdown", function (event) {
        event.preventDefault();
        onDown();
      });
      ["pointerup", "pointerleave", "pointercancel"].forEach(function (type) {
        button.addEventListener(type, onUp);
      });
    }

    bindHold(thrustBtn, function () {
      padTurn = 0;
      thrusting = true;
    }, function () {
      thrusting = false;
    });
    bindHold(leftBtn, function () {
      padTurn = -1;
    }, function () {
      padTurn = 0;
    });
    bindHold(rightBtn, function () {
      padTurn = 1;
    }, function () {
      padTurn = 0;
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(lantLevels[index]);
      }
    });

    startBtn.addEventListener("click", startRun);

    App.quietResetStarfall = function () {
      if (flying) {
        flying = false;
        spawn();
        resultEl.textContent = t("lantPaused");
      }
    };

    loadLevel(lantLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initStarfallGame = initStarfallGame;
})(window.CapitalConvert = window.CapitalConvert || {});
