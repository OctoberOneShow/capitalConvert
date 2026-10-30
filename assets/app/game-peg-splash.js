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
    /* Boards 15-20. The field is a fixed 84 pegs (eight staggered rows of
     * eleven and ten), so the ladder keeps buying difficulty the way it has
     * since b11: two more orange targets out of the same 84-peg field and a
     * thirty-faster bucket sweep. By b20 a little under half the field is
     * orange, which is the real change - a ball can no longer be spent
     * clearing blue, and the refund bucket has to be caught while it is
     * travelling at five times the speed it opened the campaign at. Six balls
     * still has to do the whole board, so the three-star line (three balls
     * left) is a genuine ask rather than a formality. */
    { id: "b15", labelKey: "lvlNum15", balls: 6, orange: 30, bucketSpeed: 350, seed: 251 },
    { id: "b16", labelKey: "lvlNum16", balls: 6, orange: 32, bucketSpeed: 380, seed: 257 },
    { id: "b17", labelKey: "lvlNum17", balls: 6, orange: 34, bucketSpeed: 410, seed: 263 },
    { id: "b18", labelKey: "lvlNum18", balls: 6, orange: 36, bucketSpeed: 440, seed: 269 },
    { id: "b19", labelKey: "lvlNum19", balls: 6, orange: 38, bucketSpeed: 470, seed: 271 },
    { id: "b20", labelKey: "lvlNum20", balls: 6, orange: 40, bucketSpeed: 500, seed: 277 },
    /* Boards 21-24, the deep tier. Everything b20 fixed stays fixed - six
     * balls, forty oranges out of the same 84-peg field, the bucket sweeping
     * at five times its opening speed - and the whole lesson is spent on the
     * one lever the calm ladder never touched: crosswind. From b21 the ball
     * is shoved sideways in flight, the gust climbing twenty a rung and
     * switching banks, so the vertical drop the first twenty boards drilled
     * is now a compensation problem: every shot has to be led upwind, the
     * bucket catch has to be led twice, and the gust chevrons by the cannon
     * are the only warning. Six balls still has to do the whole board, so
     * the three-star lines below (bands over balls left) ask for banked
     * bucket catches on top of reading the drift. The bench that measured
     * the boards (seeds 322/342/337/314) and the bands lives in
     * tools/gate-snippets/peg-splash.js. */
    { id: "b21", labelKey: "lvlNum21", balls: 6, orange: 40, bucketSpeed: 500, wind: 40, starBands: [3, 2, 1], seed: 322 },
    { id: "b22", labelKey: "lvlNum22", balls: 6, orange: 40, bucketSpeed: 500, wind: -60, starBands: [3, 2, 1], seed: 342 },
    { id: "b23", labelKey: "lvlNum23", balls: 6, orange: 40, bucketSpeed: 500, wind: 80, starBands: [3, 2, 1], seed: 337 },
    { id: "b24", labelKey: "lvlNum24", balls: 6, orange: 40, bucketSpeed: 500, wind: -100, starBands: [3, 2, 1], seed: 314 },
    /* Boards 25-30, the summit tier: the narrow mouth. Everything the deep
     * tier held fixed stays fixed - six balls, the 84-peg field, the bucket
     * at five times its opening speed - and the gust keeps climbing twenty a
     * rung, switching banks every rung the way b21-24 taught. The new lever
     * is the one the flight law always named: the bucket's mouth. From b25
     * every rung carries a bucketHalf, tightening from 22 to 12 - less than
     * half the mouth the whole ladder learned on - so the refund that funded
     * every three-star line gets scarce exactly while the drift gets worse:
     * a catch has to be led twice through a slot a third as wide. b28 asks
     * the most of the field (forty-four oranges) under the narrowest gust
     * pair and pays out a two-ball three-star band, the only one on the
     * ladder; b30 is the summit - the strongest gust of the campaign, the
     * tightest mouth, and the same six balls. The bench that measured the
     * rungs and the rim lives in tools/gate-snippets/peg-splash.js. */
    { id: "b25", labelKey: "lvlNum25", balls: 6, orange: 40, bucketSpeed: 500, wind: 120, bucketHalf: 22, starBands: [3, 2, 1], seed: 331 },
    { id: "b26", labelKey: "lvlNum26", balls: 6, orange: 42, bucketSpeed: 500, wind: -140, bucketHalf: 20, starBands: [3, 2, 1], seed: 347 },
    { id: "b27", labelKey: "lvlNum27", balls: 6, orange: 42, bucketSpeed: 500, wind: 160, bucketHalf: 18, starBands: [3, 2, 1], seed: 349 },
    { id: "b28", labelKey: "lvlNum28", balls: 6, orange: 44, bucketSpeed: 500, wind: -180, bucketHalf: 16, starBands: [2, 1, 0], seed: 353 },
    { id: "b29", labelKey: "lvlNum29", balls: 6, orange: 42, bucketSpeed: 500, wind: 200, bucketHalf: 14, starBands: [3, 2, 1], seed: 333 },
    { id: "b30", labelKey: "lvlNum30", balls: 6, orange: 44, bucketSpeed: 500, wind: -220, bucketHalf: 12, starBands: [3, 2, 1], seed: 335 },
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

  /* The bucket's sweep: shared by the panel's draw and the flight law. */
  function pegBucketX(phase) {
    return 160 + Math.sin(phase) * 118;
  }

  function pegOrangesLeft(field) {
    var n = 0;
    for (var i = 0; i < field.length; i += 1) {
      if (field[i].alive && field[i].orange) {
        n += 1;
      }
    }
    return n;
  }

  /* The field deal: every board builds its pegs from its seed through this
   * one deal - the panel plays it and the gate replays it, so a benched
   * board is the board the player sees. */
  function pegBuildField(level) {
    var rng = mulberry32(level.seed);
    var pegs = [];
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
    return pegs;
  }

  /* One integration step of the ball: the flight law the panel plays and
   * the bench replays. Gravity pulls, the rung's crosswind (boards 21 up -
   * no rung before b21 carries a wind) shoves, walls and pegs bounce, the
   * first peg touched dies, and the bucket or the floor ends the flight.
   * The bucket's mouth is the rung's bucketHalf (26 until the summit tiers
   * name something tighter). Returns what happened this step. */
  function pegStepBall(level, field, ball, phase, dt) {
    ball.vy += pegGravity * dt;
    if (level.wind) {
      ball.vx += level.wind * dt;
    }
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    if (ball.x < pegBallR) {
      ball.x = pegBallR;
      ball.vx = Math.abs(ball.vx) * 0.95;
    } else if (ball.x > pegWidth - pegBallR) {
      ball.x = pegWidth - pegBallR;
      ball.vx = -Math.abs(ball.vx) * 0.95;
    }
    var hit = null;
    for (var p = 0; p < field.length; p += 1) {
      var peg = field[p];
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
        hit = peg;
        break;
      }
    }
    var caught = false;
    var lost = false;
    if (
      ball.y > pegHeight - 16 &&
      ball.vy > 0 &&
      Math.abs(ball.x - pegBucketX(phase)) < (level.bucketHalf || 26)
    ) {
      caught = true;
    } else if (ball.y > pegHeight + 12) {
      lost = true;
    }
    return { hit: hit, caught: caught, lost: lost };
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
      pegs = pegBuildField(level);
    }

    function bucketX() {
      return pegBucketX(phase);
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
      return pegOrangesLeft(pegs);
    }

    function gameOver() {
      alive = false;
      draw();
      resultEl.textContent =
        t("pegOut", { n: score }) + " " + t("pegRetry");
    }

    function levelCleared() {
      alive = false;
      var starsWon = Math.max(
        1,
        starsFor(ballsLeft, level.starBands || [3, 2, 1], "high"),
      );
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
      var step = pegStepBall(level, pegs, ball, phase, dt);
      if (step.hit) {
        score += step.hit.orange ? pegOrangeScore : pegBlueScore;
        burst(step.hit.x, step.hit.y, step.hit.orange ? pegOrangeColor : pegBlueColor, 8);
        renderHud();
        if (orangeLeft() === 0) {
          levelCleared();
          return;
        }
      }
      if (step.caught) {
        ball = null;
        ballsLeft += 1;
        caughtFlash = 1;
        renderHud();
        return;
      }
      if (step.lost) {
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
      /* Crosswind chevrons: the deep tier's only warning. One growing gust
       * line per twenty of wind, drawn downwind of the cannon. */
      if (level.wind) {
        var windDir = level.wind > 0 ? 1 : -1;
        var gusts = Math.min(5, Math.max(1, Math.round(Math.abs(level.wind) / 20)));
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 2;
        for (var gust = 0; gust < gusts; gust += 1) {
          var gustY = 46 + gust * 9;
          ctx.beginPath();
          ctx.moveTo(pegCannonX - windDir * 24, gustY);
          ctx.lineTo(pegCannonX + windDir * (24 + gust * 9), gustY);
          ctx.stroke();
        }
        ctx.lineWidth = 1;
      }
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
      var mouth = level.bucketHalf || 26;
      ctx.fillStyle = caughtFlash > 0
        ? "rgba(163, 230, 53, " + (0.5 + caughtFlash * 0.5).toFixed(2) + ")"
        : "rgba(163, 230, 53, 0.55)";
      ctx.beginPath();
      ctx.moveTo(bx - mouth, pegHeight - 18);
      ctx.lineTo(bx + mouth, pegHeight - 18);
      ctx.lineTo(bx + mouth - 8, pegHeight - 2);
      ctx.lineTo(bx - mouth + 8, pegHeight - 2);
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


  /* The bench: replays a board through the panel's own field deal and
   * flight law on a fixed headless clock (1/120s steps, no die of its own -
   * rand only flows to the hand). policy(shotIndex, view) returns the next
   * shot { angle, hold }; hold idles the board clock before firing so a
   * hand can wait the bucket around. view.probe flies a candidate shot
   * against a throwaway copy of the field without spending the board, the
   * way a player reads a line before shooting it. Returns the record the
   * campaign pays stars on, stars computed by the same bands levelCleared
   * pays. */
  function pegSimulate(level, policy, rand) {
    var field = pegBuildField(level);
    var ballsLeft = level.balls;
    var score = 0;
    var phase = 0;
    var fired = 0;
    var catches = 0;
    var cleared = false;
    var STEP = 1 / 120;
    var GUARD = 60 * 60 * 2; /* two board-minutes of steps, a never-in-practice stop */

    function orangesLeft() {
      return pegOrangesLeft(field);
    }

    /* One ball from cannon to catch, loss or last orange. Returns the
     * flight record and the board clock it ended on; safe to run against a
     * throwaway field copy (the probe does exactly that). */
    function flyBall(fieldArg, shot, startClock) {
      var ball = {
        x: pegCannonX,
        y: pegCannonY,
        vx: Math.cos(shot.angle) * pegSpeed,
        vy: Math.sin(shot.angle) * pegSpeed,
      };
      var clock = startClock + (shot.hold || 0) * (level.bucketSpeed / 118);
      var gained = 0;
      var orangeKilled = 0;
      for (var step = 0; step < GUARD; step += 1) {
        clock += STEP * (level.bucketSpeed / 118);
        var outcome = pegStepBall(level, fieldArg, ball, clock, STEP);
        if (outcome.hit) {
          gained += outcome.hit.orange ? pegOrangeScore : pegBlueScore;
          if (outcome.hit.orange) {
            orangeKilled += 1;
          }
          if (pegOrangesLeft(fieldArg) === 0) {
            return { end: "cleared", gained: gained, orangeKilled: orangeKilled, clock: clock };
          }
        }
        if (outcome.caught) {
          return { end: "caught", gained: gained, orangeKilled: orangeKilled, clock: clock };
        }
        if (outcome.lost) {
          return { end: "lost", gained: gained, orangeKilled: orangeKilled, clock: clock };
        }
      }
      return { end: "lost", gained: gained, orangeKilled: orangeKilled, clock: clock };
    }

    var guard = 4 * level.balls + 16; /* a hand that farms the bucket past this is not clearing */
    while (guard > 0) {
      guard -= 1;
      if (orangesLeft() === 0) {
        cleared = true;
        break;
      }
      if (ballsLeft <= 0) {
        break;
      }
      var view = {
        ballsLeft: ballsLeft,
        score: score,
        shots: fired,
        orangeLeft: orangesLeft,
        /* Where the surviving targets sit, so a hand can aim at them. */
        targets: function () {
          return field.map(function (peg) {
            return peg.alive && peg.orange ? { x: peg.x, y: peg.y } : null;
          }).filter(function (spot) {
            return spot !== null;
          });
        },
        rand: rand,
        probe: function (shot) {
          var copy = field.map(function (peg) {
            return { x: peg.x, y: peg.y, orange: peg.orange, alive: peg.alive };
          });
          var record = flyBall(copy, shot, phase);
          return {
            end: record.end,
            gained: record.gained,
            orangeKilled: record.orangeKilled,
          };
        },
      };
      var shot = policy(fired, view);
      if (!shot) {
        break;
      }
      fired += 1;
      ballsLeft -= 1;
      var flight = flyBall(field, shot, phase);
      phase = flight.clock;
      score += flight.gained;
      if (flight.end === "caught") {
        ballsLeft += 1;
        catches += 1;
      }
      if (flight.end === "cleared") {
        cleared = true;
        break;
      }
    }
    return {
      cleared: cleared,
      ballsLeft: ballsLeft,
      score: score,
      shots: fired,
      catches: catches,
      stars: Math.max(1, starsFor(ballsLeft, level.starBands || [3, 2, 1], "high")),
    };
  }


  /* Exported for the other modules. */
  App.initPegSplashGame = initPegSplashGame;
  /* The ladder, the field deal and the bench, for the verify-levels gate. */
  App.pegSplashLevels = pegLevels;
  App.pegSplashField = pegBuildField;
  App.pegSplashSimulate = pegSimulate;
})(window.CapitalConvert = window.CapitalConvert || {});
