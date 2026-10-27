/* Comet Golf - The gravity-slingshot course campaign in the shared game drawer. */
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
  var cgfWidth = 320;
  var cgfHeight = 360;
  var cgfGravity = 5200;
  var cgfMaxAccel = 950;
  var cgfMaxSpeed = 470;
  var cgfCometR = 5;
  var cgfMaxShotSeconds = 9;
  /* Courses: launch the comet from the tee and let the wells bend the
   * flight into the target ring. Star thresholds are launch counts
   * [3-star, 2-star, 1-star]. */
  var cgfLevels = [
    {
      id: "g1", labelKey: "cgfL1",
      tee: { x: 36, y: 300 }, target: { x: 272, y: 84, r: 15 },
      wells: [{ x: 170, y: 190, m: 1.3, r: 14 }],
      starShots: [1, 2, 3],
    },
    {
      id: "g2", labelKey: "cgfL2",
      tee: { x: 30, y: 80 }, target: { x: 284, y: 300, r: 15 },
      wells: [
        { x: 150, y: 150, m: 1.0, r: 12 },
        { x: 230, y: 230, m: 1.2, r: 13 },
      ],
      starShots: [1, 2, 4],
    },
    {
      id: "g3", labelKey: "cgfL3",
      tee: { x: 36, y: 180 }, target: { x: 284, y: 180, r: 15 },
      wells: [
        { x: 150, y: 110, m: 1.1, r: 12 },
        { x: 150, y: 250, m: 1.1, r: 12 },
      ],
      starShots: [1, 2, 3],
    },
    {
      id: "g4", labelKey: "cgfL4",
      tee: { x: 36, y: 300 }, target: { x: 286, y: 56, r: 16 },
      wells: [
        { x: 170, y: 180, m: 1.8, r: 16 },
        { x: 260, y: 150, m: 0.6, r: 10 },
      ],
      starShots: [1, 2, 4],
    },
    {
      id: "g5", labelKey: "cgfL5",
      tee: { x: 36, y: 60 }, target: { x: 160, y: 300, r: 14 },
      wells: [
        { x: 110, y: 150, m: 1.2, r: 12 },
        { x: 210, y: 120, m: 1.0, r: 11 },
        { x: 260, y: 240, m: 1.3, r: 13 },
      ],
      starShots: [1, 3, 5],
    },
    {
      id: "g6", labelKey: "cgfL6",
      tee: { x: 36, y: 300 }, target: { x: 284, y: 180, r: 13 },
      wells: [
        { x: 120, y: 180, m: 1.4, r: 13 },
        { x: 200, y: 120, m: 1.0, r: 11 },
        { x: 250, y: 210, m: 1.5, r: 14 },
      ],
      starShots: [2, 3, 6],
    },
    {
      id: "g7", labelKey: "cgfL7",
      tee: { x: 284, y: 300 }, target: { x: 36, y: 84, r: 14 },
      wells: [
        { x: 150, y: 200, m: 1.3, r: 13 },
        { x: 230, y: 120, m: 1.0, r: 11 },
      ],
      starShots: [2, 3, 5],
    },
    {
      id: "g8", labelKey: "cgfL8",
      tee: { x: 36, y: 300 }, target: { x: 160, y: 60, r: 14 },
      wells: [
        { x: 120, y: 160, m: 1.4, r: 13 },
        { x: 220, y: 200, m: 1.2, r: 12 },
        { x: 260, y: 80, m: 0.8, r: 10 },
      ],
      starShots: [2, 3, 4],
    },
    {
      /* Re-forged under the keyboard bar the deep tier ships against: the
       * guardians mass on the low left with the heaviest at the pack's
       * heart, so the honest flight is the slow lob that clears the whole
       * pack and glides in high to the ring (basin 15/25). */
      id: "g9", labelKey: "cgfL9",
      tee: { x: 36, y: 193 }, target: { x: 284, y: 116, r: 14 },
      wells: [
        { x: 67, y: 281, m: 1, r: 11 },
        { x: 65, y: 209, m: 1.5, r: 12 },
        { x: 88, y: 228, m: 1.8, r: 13 },
      ],
      starShots: [2, 4, 6],
    },
    {
      /* Same bar from the far tee: the mid stack caps the ring's approach so
       * the straight lane burns at every power, and the one-shot rides the
       * thin lane between the high guardian and the stack before dropping
       * into the ring (basin 12/25). */
      id: "g10", labelKey: "cgfL10",
      tee: { x: 284, y: 115 }, target: { x: 36, y: 160, r: 13 },
      wells: [
        { x: 108, y: 163, m: 1.2, r: 13 },
        { x: 92, y: 191, m: 1.1, r: 12 },
        { x: 74, y: 75, m: 1.5, r: 9 },
      ],
      starShots: [2, 4, 7],
    },
    /* ------------------------------------------------------------------
     * The crowded tier (g11-g20). The first ten courses are one to three
     * wells; these run four and five, so a comet that survives one guardian
     * still has to be threaded past the next, and the star lines climb with
     * them. Every hole was flown before it shipped - tools/golf-forge.js
     * replicates this module's step exactly, finds the one-shot answer in the
     * aim space, and weighs the basin around it so the shot is a window a
     * hand can find rather than a pixel. */
    {
      id: "g11", labelKey: "cgfL11",
      tee: { x: 36, y: 95 }, target: { x: 284, y: 175, r: 14 },
      wells: [
        { x: 201, y: 75, m: 1.5, r: 12 },
        { x: 214, y: 60, m: 1.1, r: 13 },
        { x: 237, y: 288, m: 0.9, r: 14 },
      ],
      starShots: [1, 2, 3],
    },
    {
      id: "g12", labelKey: "cgfL12",
      tee: { x: 36, y: 270 }, target: { x: 284, y: 283, r: 14 },
      wells: [
        { x: 179, y: 85, m: 1.1, r: 12 },
        { x: 216, y: 274, m: 1.3, r: 11 },
        { x: 78, y: 72, m: 0.9, r: 12 },
      ],
      starShots: [1, 2, 3],
    },
    {
      id: "g13", labelKey: "cgfL13",
      tee: { x: 36, y: 62 }, target: { x: 284, y: 88, r: 14 },
      wells: [
        { x: 116, y: 299, m: 1.7, r: 10 },
        { x: 249, y: 217, m: 1.4, r: 10 },
        { x: 207, y: 130, m: 1.1, r: 13 },
        { x: 206, y: 149, m: 0.7, r: 12 },
      ],
      starShots: [1, 2, 4],
    },
    {
      id: "g14", labelKey: "cgfL14",
      tee: { x: 284, y: 68 }, target: { x: 36, y: 233, r: 13 },
      wells: [
        { x: 101, y: 296, m: 1.4, r: 14 },
        { x: 109, y: 260, m: 0.7, r: 11 },
        { x: 241, y: 287, m: 1.2, r: 9 },
        { x: 216, y: 150, m: 1.4, r: 11 },
      ],
      starShots: [2, 3, 4],
    },
    {
      id: "g15", labelKey: "cgfL15",
      tee: { x: 36, y: 82 }, target: { x: 284, y: 187, r: 13 },
      wells: [
        { x: 249, y: 285, m: 1.5, r: 12 },
        { x: 151, y: 188, m: 0.8, r: 12 },
        { x: 212, y: 264, m: 0.9, r: 13 },
        { x: 159, y: 244, m: 1.4, r: 12 },
      ],
      starShots: [2, 3, 5],
    },
    {
      id: "g16", labelKey: "cgfL16",
      tee: { x: 284, y: 255 }, target: { x: 36, y: 131, r: 13 },
      wells: [
        { x: 113, y: 109, m: 0.7, r: 9 },
        { x: 76, y: 129, m: 1.7, r: 10 },
        { x: 172, y: 180, m: 1.7, r: 12 },
        { x: 96, y: 260, m: 0.7, r: 12 },
      ],
      starShots: [2, 4, 6],
    },
    {
      id: "g17", labelKey: "cgfL17",
      tee: { x: 36, y: 258 }, target: { x: 284, y: 146, r: 13 },
      wells: [
        { x: 180, y: 260, m: 1.8, r: 11 },
        { x: 118, y: 206, m: 0.8, r: 10 },
        { x: 232, y: 228, m: 1.1, r: 9 },
        { x: 147, y: 150, m: 1.7, r: 14 },
        { x: 230, y: 57, m: 1.1, r: 12 },
      ],
      starShots: [2, 4, 6],
    },
    {
      id: "g18", labelKey: "cgfL18",
      tee: { x: 284, y: 238 }, target: { x: 36, y: 147, r: 12 },
      wells: [
        { x: 193, y: 230, m: 0.8, r: 14 },
        { x: 256, y: 174, m: 1.7, r: 13 },
        { x: 245, y: 267, m: 1.7, r: 13 },
        { x: 251, y: 294, m: 1.3, r: 11 },
        { x: 86, y: 209, m: 0.7, r: 13 },
      ],
      starShots: [2, 4, 7],
    },
    {
      id: "g19", labelKey: "cgfL19",
      tee: { x: 36, y: 131 }, target: { x: 284, y: 284, r: 12 },
      wells: [
        { x: 253, y: 304, m: 1.6, r: 11 },
        { x: 111, y: 267, m: 1.8, r: 10 },
        { x: 186, y: 185, m: 1.1, r: 13 },
        { x: 217, y: 101, m: 1, r: 13 },
        { x: 154, y: 132, m: 0.9, r: 10 },
      ],
      starShots: [2, 4, 7],
    },
    {
      id: "g20", labelKey: "cgfL20",
      tee: { x: 36, y: 130 }, target: { x: 284, y: 201, r: 12 },
      wells: [
        { x: 202, y: 72, m: 1.1, r: 12 },
        { x: 200, y: 302, m: 0.7, r: 13 },
        { x: 157, y: 282, m: 1.2, r: 13 },
        { x: 142, y: 97, m: 1.4, r: 11 },
        { x: 153, y: 256, m: 1.8, r: 12 },
      ],
      starShots: [2, 4, 8],
    },

    /* Courses 21-24: the deep sky. The forge laid every one of these - more
     * wells packed into the same sky and a ring that keeps shrinking - and
     * each ships only because a one-shot survives the aim space with a basin
     * a keyboard player can re-find (golf-forge: basin >= 6 of 25). */
    {
      id: "g21", labelKey: "cgfL21",
      tee: { x: 284, y: 227 }, target: { x: 36, y: 93, r: 12 },
      wells: [
        { x: 253, y: 180, m: 0.9, r: 12 },
        { x: 214, y: 251, m: 1.3, r: 10 },
        { x: 228, y: 74, m: 0.9, r: 10 },
        { x: 205, y: 52, m: 0.8, r: 9 },
        { x: 102, y: 75, m: 1.2, r: 12 },
        { x: 113, y: 247, m: 1.3, r: 11 },
      ],
      starShots: [2, 4, 8],
    },
    {
      id: "g22", labelKey: "cgfL22",
      tee: { x: 284, y: 160 }, target: { x: 36, y: 189, r: 11 },
      wells: [
        { x: 200, y: 118, m: 1.3, r: 13 },
        { x: 196, y: 159, m: 1.5, r: 13 },
        { x: 175, y: 285, m: 1.5, r: 12 },
        { x: 254, y: 52, m: 0.9, r: 13 },
        { x: 61, y: 289, m: 1.5, r: 11 },
        { x: 217, y: 84, m: 0.8, r: 13 },
      ],
      starShots: [2, 5, 8],
    },
    {
      id: "g23", labelKey: "cgfL23",
      tee: { x: 36, y: 269 }, target: { x: 284, y: 147, r: 11 },
      wells: [
        { x: 134, y: 268, m: 0.9, r: 13 },
        { x: 190, y: 212, m: 1.2, r: 11 },
        { x: 182, y: 211, m: 1.1, r: 12 },
        { x: 104, y: 70, m: 1.1, r: 11 },
        { x: 103, y: 306, m: 1, r: 12 },
        { x: 159, y: 228, m: 1.2, r: 10 },
        { x: 155, y: 172, m: 1.2, r: 14 },
      ],
      starShots: [2, 5, 9],
    },
    {
      id: "g24", labelKey: "cgfL24",
      tee: { x: 284, y: 225 }, target: { x: 36, y: 134, r: 10 },
      wells: [
        { x: 85, y: 63, m: 0.8, r: 10 },
        { x: 67, y: 179, m: 1.7, r: 10 },
        { x: 125, y: 108, m: 1.6, r: 13 },
        { x: 94, y: 223, m: 1.3, r: 11 },
        { x: 124, y: 73, m: 0.7, r: 9 },
        { x: 207, y: 65, m: 1.1, r: 10 },
        { x: 167, y: 214, m: 0.8, r: 10 },
      ],
      starShots: [2, 5, 10],
    },
  ];
  /* A fixed starfield so the sky does not flicker between frames. */
  var cgfStars = [];
  for (var starSeed = 0; starSeed < 46; starSeed += 1) {
    cgfStars.push({
      x: (starSeed * 97) % cgfWidth,
      y: (starSeed * 131) % cgfHeight,
      s: (starSeed % 3) * 0.5 + 0.6,
      p: (starSeed % 7) * 0.9,
    });
  }

  function initCometGolfGame() {
    var canvas = getElement("cgfCanvas");
    var shotsEl = getElement("cgfShots");
    var parEl = getElement("cgfPar");
    var timeEl = getElement("cgfTime");
    var resultEl = getElement("cgfResult");
    var startBtn = getElement("cgfStartBtn");
    var bestEl = getElement("cgfBest");
    var selectEl = getElement("cgfLevelSel");
    var panelEl = getElement("gamePanelCometGolf");
    if (
      !canvas ||
      !shotsEl ||
      !parEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "comet-golf-campaign", levels: cgfLevels });
    var level = cgfLevels[0];
    var comet = { x: 0, y: 0, vx: 0, vy: 0, live: false, age: 0 };
    var trail = [];
    var launches = 0;
    var cleared = false;
    var aimAngle = -Math.PI / 3;
    var aimPower = 0.7;
    var aiming = false;
    var rafId = null;
    var lastFrame = 0;
    var startedAt = 0;
    var clockRunning = false;

    function renderHud() {
      shotsEl.textContent = String(launches);
      parEl.textContent = String(level.starShots[2]);
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

    function resetComet() {
      comet = {
        x: level.tee.x,
        y: level.tee.y,
        vx: 0,
        vy: 0,
        live: false,
        age: 0,
      };
      trail = [];
    }

    function loadLevel(levelDef) {
      stopLoop();
      level = levelDef;
      cleared = false;
      launches = 0;
      clockRunning = false;
      startedAt = Date.now();
      aimAngle = Math.atan2(level.target.y - level.tee.y, level.target.x - level.tee.x);
      aimPower = 0.7;
      aiming = false;
      resetComet();
      renderHud();
      refreshPicker();
      draw();
      resultEl.textContent = t("cgfReady", { n: level.starShots[2] });
    }

    function launch() {
      if (cleared || comet.live) {
        return;
      }
      var speed = cgfMaxSpeed * aimPower;
      comet = {
        x: level.tee.x,
        y: level.tee.y,
        vx: Math.cos(aimAngle) * speed,
        vy: Math.sin(aimAngle) * speed,
        live: true,
        age: 0,
      };
      trail = [];
      launches += 1;
      if (!clockRunning) {
        clockRunning = true;
        startedAt = Date.now();
      }
      renderHud();
      startLoop();
    }

    function courseCleared() {
      cleared = true;
      comet.live = false;
      clockRunning = false;
      var starsWon = starsFor(launches, level.starShots, "low");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: launches,
        better: "low",
      });
      var message = t("cgfCleared", { n: launches, stars: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("cgfNextCourse");
      } else if (campaign.clearedCount() === cgfLevels.length) {
        message += " " + t("cgfCampaignDone");
      }
      logAction(t("logCometGolf", { n: launches }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(cgfLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function splash(x, y, color) {
      for (var index = 0; index < 12; index += 1) {
        trail.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 180,
          vy: (Math.random() - 0.5) * 180,
          life: 1,
          color: color,
        });
      }
    }

    function update(dt) {
      if (comet.live) {
        var ax = 0;
        var ay = 0;
        level.wells.forEach(function (well) {
          var dx = well.x - comet.x;
          var dy = well.y - comet.y;
          var d2 = Math.max(dx * dx + dy * dy, 64);
          var d = Math.sqrt(d2);
          var pull = Math.min(cgfMaxAccel, (cgfGravity * well.m) / d2);
          ax += (dx / d) * pull;
          ay += (dy / d) * pull;
        });
        comet.vx += ax * dt;
        comet.vy += ay * dt;
        comet.x += comet.vx * dt;
        comet.y += comet.vy * dt;
        comet.age += dt;
        trail.push({ x: comet.x, y: comet.y, vx: 0, vy: 0, life: 1, color: "#22d3ee" });

        var dxT = comet.x - level.target.x;
        var dyT = comet.y - level.target.y;
        if (Math.hypot(dxT, dyT) < level.target.r + cgfCometR) {
          splash(level.target.x, level.target.y, "#a3e635");
          courseCleared();
          return;
        }
        var crashed = false;
        level.wells.forEach(function (well) {
          if (Math.hypot(comet.x - well.x, comet.y - well.y) < well.r + cgfCometR) {
            crashed = true;
          }
        });
        if (
          crashed ||
          comet.x < -50 ||
          comet.y < -50 ||
          comet.x > cgfWidth + 50 ||
          comet.y > cgfHeight + 50 ||
          comet.age > cgfMaxShotSeconds
        ) {
          if (crashed) {
            splash(comet.x, comet.y, "#fb7185");
            resultEl.textContent = t("cgfCrash") + " " + t("cgfAgain");
          } else {
            resultEl.textContent = t("cgfLost") + " " + t("cgfAgain");
          }
          resetComet();
        }
      }
      var aliveTrail = [];
      for (var index = 0; index < trail.length; index += 1) {
        var spark = trail[index];
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.life -= dt * 1.8;
        if (spark.life > 0) {
          aliveTrail.push(spark);
        }
      }
      trail = aliveTrail;
      renderHud();
    }

    function draw() {
      var time = Date.now();
      ctx.clearRect(0, 0, cgfWidth, cgfHeight);
      if (App.world) { App.world.backdrop(ctx, cgfWidth, cgfHeight, "space"); }
      /* Starfield */
      cgfStars.forEach(function (star) {
        ctx.globalAlpha = 0.25 + 0.25 * Math.sin(time / 700 + star.p);
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(star.x, star.y, star.s, star.s);
      });
      ctx.globalAlpha = 1;
      /* Target ring */
      var pulse = 1 + Math.sin(time / 260) * 0.12;
      ctx.beginPath();
      ctx.arc(level.target.x, level.target.y, level.target.r * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = "#a3e635";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#a3e635";
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(level.target.x, level.target.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#a3e635";
      ctx.fill();
      ctx.shadowBlur = 0;
      /* Wells: glowing embers with a dark heart */
      level.wells.forEach(function (well) {
        var glow = ctx.createRadialGradient(well.x, well.y, 2, well.x, well.y, well.r * 2.6);
        glow.addColorStop(0, "rgba(255, 107, 53, 0.85)");
        glow.addColorStop(0.5, "rgba(255, 107, 53, 0.25)");
        glow.addColorStop(1, "rgba(255, 107, 53, 0)");
        ctx.beginPath();
        ctx.arc(well.x, well.y, well.r * 2.6, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(well.x, well.y, well.r, 0, Math.PI * 2);
        ctx.fillStyle = "#1a1026";
        ctx.fill();
        ctx.strokeStyle = "#ff6b35";
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      /* Trail */
      trail.forEach(function (spark) {
        ctx.globalAlpha = Math.max(0, spark.life) * 0.9;
        ctx.fillStyle = spark.color;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, 2.2 * spark.life + 0.6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      /* Tee pad */
      ctx.beginPath();
      ctx.arc(level.tee.x, level.tee.y, 9, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.8)";
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      /* Aim line */
      if (!comet.live && !cleared) {
        var reach = 26 + aimPower * 60;
        ctx.beginPath();
        ctx.moveTo(level.tee.x + Math.cos(aimAngle) * 10, level.tee.y + Math.sin(aimAngle) * 10);
        ctx.lineTo(
          level.tee.x + Math.cos(aimAngle) * reach,
          level.tee.y + Math.sin(aimAngle) * reach,
        );
        ctx.strokeStyle = "rgba(0, 242, 255, 0.85)";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#00f2ff";
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      /* Comet */
      var cx = comet.live ? comet.x : level.tee.x;
      var cy = comet.live ? comet.y : level.tee.y;
      ctx.beginPath();
      ctx.arc(cx, cy, cgfCometR, 0, Math.PI * 2);
      ctx.fillStyle = "#22d3ee";
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = comet.live ? 14 : 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function frame(now) {
      if (rafId === null) {
        return;
      }
      rafId = null;
      var dt = Math.min(0.032, (now - lastFrame) / 1000 || 0.016);
      lastFrame = now;
      /* The comet only flies on its own panel; hidden panels skip the work
       * but keep the loop slot so the sky resumes when the tab returns. */
      if (!panelEl || panelEl.hidden || document.hidden) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      update(dt);
      draw();
      if (comet.live || clockRunning || trail.length) {
        rafId = window.requestAnimationFrame(frame);
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

    canvas.addEventListener("pointerdown", function (event) {
      if (cleared || comet.live) {
        return;
      }
      event.preventDefault();
      aiming = true;
      aimFromEvent(event);
      /* Capture merely keeps the aim alive past the canvas edge; a stale
       * pointer id must not abort the whole pointerdown handler. */
      if (canvas.setPointerCapture && event.pointerId !== undefined) {
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch (error) {
          /* no capture this time; the canvas listeners still fire */
        }
      }
    });

    function aimFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var px = (event.clientX - rect.left) * scaleX;
      var py = (event.clientY - rect.top) * scaleY;
      var dx = px - level.tee.x;
      var dy = py - level.tee.y;
      if (Math.hypot(dx, dy) < 8) {
        return;
      }
      aimAngle = Math.atan2(dy, dx);
      aimPower = Math.min(1, Math.max(0.15, Math.hypot(dx, dy) / 150));
    }

    canvas.addEventListener("pointermove", function (event) {
      if (!aiming) {
        return;
      }
      aimFromEvent(event);
    });

    function releaseAim() {
      if (!aiming) {
        return;
      }
      aiming = false;
      launch();
    }

    canvas.addEventListener("pointerup", releaseAim);
    canvas.addEventListener("pointercancel", function () {
      aiming = false;
    });

    canvas.addEventListener("keydown", function (event) {
      if (cleared) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        aimAngle -= 0.05;
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        aimAngle += 0.05;
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        aimPower = Math.min(1, aimPower + 0.05);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        aimPower = Math.max(0.15, aimPower - 0.05);
      } else if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        launch();
      }
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(cgfLevels[index]);
      }
    });

    startBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    App.quietResetCometGolf = function () {
      stopLoop();
      if (comet.live || aiming) {
        aiming = false;
        resetComet();
      }
      clockRunning = false;
      resultEl.textContent = t("cgfPaused");
    };

    loadLevel(cgfLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already hold, so the picker never prints a raw key. */
  App.addStrings({
    en: {
      "cgfL7": "Reverse Cut",
      "cgfL8": "Sky Ladder",
      "cgfL9": "Guarded Ring",
      "cgfL10": "Two Sentinels",
      "cgfL11": "Crowded Reef",
      "cgfL12": "Low Road",
      "cgfL13": "Deep Gate",
      "cgfL14": "Round Trip",
      "cgfL15": "Four Crossings",
      "cgfL16": "Wall of Wells",
      "cgfL17": "The Gauntlet",
      "cgfL18": "Five Crowns",
      "cgfL19": "Anchor Chain",
      "cgfL20": "Deep Space Ring",
      "cgfL21": "Sixth Well",
      "cgfL22": "Tight Orbit",
      "cgfL23": "Seven Stones",
      "cgfL24": "Needle's Eye",
    },
    zh: {
      "cgfL7": "逆向切",
      "cgfL8": "登高梯",
      "cgfL9": "守环口",
      "cgfL10": "双岗哨",
      "cgfL11": "密礁",
      "cgfL12": "低路",
      "cgfL13": "深门",
      "cgfL14": "往返",
      "cgfL15": "四渡",
      "cgfL16": "井墙",
      "cgfL17": "铁栅",
      "cgfL18": "五冠",
      "cgfL19": "锚链",
      "cgfL20": "深空环",
      "cgfL21": "第六井",
      "cgfL22": "窄轨",
      "cgfL23": "七石阵",
      "cgfL24": "针眼",
    },
  });


  /* Exported for the other modules. */
  App.initCometGolfGame = initCometGolfGame;
})(window.CapitalConvert = window.CapitalConvert || {});
