/* Bubble Ink - The bubble-shooter campaign in the shared game drawer. */
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
  var bubR = 11;
  var bubD = 22;
  var bubRowH = 19;
  var bubRows = 12;
  var bubWidth = 320;
  var bubHeight = 270;
  var bubShooterX = 160;
  var bubShooterY = 252;
  var bubSpeed = 430;
  var bubColors = ["#22d3ee", "#fbbf24", "#f472b6", "#a3e635", "#a78bfa", "#e2e8f0"];
  /* Every spring asks for a score from a shot budget. Fewer colours to
   * match early; star thresholds scale off the target, "high". */
  var bubLevels = [
    { id: "w1", labelKey: "bubL1", target: 350, shots: 30, colors: 4, rows: 4, starGain: [1.4, 1.2, 1] },
    { id: "w2", labelKey: "bubL2", target: 430, shots: 30, colors: 4, rows: 5, starGain: [1.4, 1.2, 1] },
    { id: "w3", labelKey: "bubL3", target: 510, shots: 28, colors: 5, rows: 5, starGain: [1.4, 1.2, 1] },
    { id: "w4", labelKey: "bubL4", target: 590, shots: 28, colors: 5, rows: 6, starGain: [1.4, 1.2, 1] },
    { id: "w5", labelKey: "bubL5", target: 670, shots: 26, colors: 6, rows: 6, starGain: [1.4, 1.2, 1] },
    { id: "w6", labelKey: "bubL6", target: 740, shots: 26, colors: 6, rows: 7, starGain: [1.4, 1.2, 1] },
    { id: "w7", labelKey: "bubL7", target: 810, shots: 24, colors: 6, rows: 7, starGain: [1.4, 1.2, 1] },
    { id: "w8", labelKey: "bubL8", target: 860, shots: 24, colors: 6, rows: 8, starGain: [1.4, 1.2, 1] },
    { id: "w9", labelKey: "bubL9", target: 900, shots: 22, colors: 6, rows: 8, starGain: [1.4, 1.2, 1] },
    { id: "w10", labelKey: "bubL10", target: 940, shots: 20, colors: 6, rows: 8, starGain: [1.4, 1.2, 1] },
    { id: "w11", labelKey: "bubL11", target: 950, shots: 18, colors: 6, rows: 8, starGain: [1.4, 1.2, 1] },
    { id: "w12", labelKey: "bubL12", target: 960, shots: 16, colors: 6, rows: 8, starGain: [1.4, 1.2, 1] },
  ];

  function bubX(row, col) {
    return 11 + col * bubD + (row % 2 ? 11 : 0);
  }

  function bubY(row) {
    return 11 + row * bubRowH;
  }

  function initBubbleInkGame() {
    var canvas = getElement("bubCanvas");
    var scoreEl = getElement("bubScore");
    var shotsEl = getElement("bubShots");
    var poppedEl = getElement("bubPopped");
    var resultEl = getElement("bubResult");
    var startBtn = getElement("bubStartBtn");
    var bestEl = getElement("bubBest");
    var selectEl = getElement("bubLevelSel");
    if (
      !canvas ||
      !scoreEl ||
      !shotsEl ||
      !poppedEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "bubble-ink-campaign", levels: bubLevels });
    var level = bubLevels[0];
    var grid = [];
    var current = 0;
    var next = 1;
    var aim = -Math.PI / 2;
    var flying = null;
    var shots = 0;
    var score = 0;
    var popped = 0;
    var alive = false;
    var rafId = null;
    var lastFrame = 0;
    var particles = [];

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
      shotsEl.textContent = String(shots);
      poppedEl.textContent = String(popped);
    }

    function emptyGrid() {
      var rows = [];
      for (var r = 0; r < bubRows; r += 1) {
        rows.push(new Array(r % 2 ? 13 : 14).fill(-1));
      }
      return rows;
    }

    function activeColors() {
      var present = {};
      for (var r = 0; r < bubRows; r += 1) {
        for (var c = 0; c < grid[r].length; c += 1) {
          if (grid[r][c] >= 0) {
            present[grid[r][c]] = true;
          }
        }
      }
      var keys = Object.keys(present).map(Number);
      return keys.length ? keys : level.colors;
    }

    function randomColor() {
      var pool = activeColors();
      return pool[Math.floor(Math.random() * pool.length)];
    }

    function neighbours(row, col) {
      var list = [];
      if (col > 0) {
        list.push([row, col - 1]);
      }
      if (col < grid[row].length - 1) {
        list.push([row, col + 1]);
      }
      if (row % 2 === 0) {
        list.push([row - 1, col - 1], [row - 1, col], [row + 1, col - 1], [row + 1, col]);
      } else {
        list.push([row - 1, col], [row - 1, col + 1], [row + 1, col], [row + 1, col + 1]);
      }
      return list.filter(function (cell) {
        var r = cell[0];
        var c = cell[1];
        return r >= 0 && r < bubRows && c >= 0 && c < grid[r].length;
      });
    }

    function collectCluster(row, col, sameColorOnly) {
      var color = grid[row][col];
      var seen = {};
      var stack = [[row, col]];
      var found = [];
      seen[row + "," + col] = true;
      while (stack.length) {
        var cell = stack.pop();
        found.push(cell);
        var around = neighbours(cell[0], cell[1]);
        for (var index = 0; index < around.length; index += 1) {
          var r = around[index][0];
          var c = around[index][1];
          var key = r + "," + c;
          if (seen[key] || grid[r][c] < 0) {
            continue;
          }
          if (sameColorOnly && grid[r][c] !== color) {
            continue;
          }
          seen[key] = true;
          stack.push([r, c]);
        }
      }
      return found;
    }

    function snapSlot(x, y) {
      var row = Math.round((y - 11) / bubRowH);
      row = Math.max(0, Math.min(row, bubRows - 1));
      var col = Math.round((x - 11 - (row % 2 ? 11 : 0)) / bubD);
      col = Math.max(0, Math.min(col, grid[row].length - 1));
      if (grid[row][col] < 0) {
        return [row, col];
      }
      var seen = {};
      var queue = [[row, col]];
      seen[row + "," + col] = true;
      while (queue.length) {
        var cell = queue.shift();
        var around = neighbours(cell[0], cell[1]);
        for (var index = 0; index < around.length; index += 1) {
          var r = around[index][0];
          var c = around[index][1];
          var key = r + "," + c;
          if (seen[key]) {
            continue;
          }
          seen[key] = true;
          if (grid[r][c] < 0) {
            return [r, c];
          }
          queue.push([r, c]);
        }
      }
      return null;
    }

    function burst(x, y, color, count) {
      for (var index = 0; index < count; index += 1) {
        particles.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 160,
          vy: (Math.random() - 0.5) * 160 - 40,
          life: 1,
          color: color,
        });
      }
    }

    function fire() {
      if (!alive || flying) {
        return;
      }
      flying = {
        color: current,
        x: bubShooterX,
        y: bubShooterY,
        vx: Math.cos(aim) * bubSpeed,
        vy: Math.sin(aim) * bubSpeed,
      };
      shots -= 1;
      renderHud();
    }

    function land(fly) {
      var slot = snapSlot(fly.x, fly.y);
      if (!slot) {
        gameOver(false);
        return;
      }
      grid[slot[0]][slot[1]] = fly.color;
      if (slot[0] >= bubRows - 1) {
        gameOver(true);
        return;
      }
      var cluster = collectCluster(slot[0], slot[1], true);
      if (cluster.length >= 3) {
        cluster.forEach(function (cell) {
          burst(bubX(cell[0], cell[1]), bubY(cell[0]), bubColors[grid[cell[0]][cell[1]]], 6);
          grid[cell[0]][cell[1]] = -1;
        });
        popped += cluster.length;
        score += cluster.length * 10;
        var floating = collectFloating();
        floating.forEach(function (cell) {
          burst(bubX(cell[0], cell[1]), bubY(cell[0]), bubColors[grid[cell[0]][cell[1]]], 5);
          grid[cell[0]][cell[1]] = -1;
        });
        popped += floating.length;
        score += floating.length * 15;
        renderHud();
        if (score >= level.target) {
          levelCleared();
          return;
        }
      }
      current = next;
      next = randomColor();
      if (shots <= 0) {
        gameOver(false);
        return;
      }
    }

    function collectFloating() {
      var anchored = {};
      for (var c = 0; c < grid[0].length; c += 1) {
        if (grid[0][c] >= 0 && !anchored["0," + c]) {
          collectCluster(0, c, false).forEach(function (cell) {
            anchored[cell[0] + "," + cell[1]] = true;
          });
        }
      }
      var loose = [];
      for (var r = 0; r < bubRows; r += 1) {
        for (var c2 = 0; c2 < grid[r].length; c2 += 1) {
          if (grid[r][c2] >= 0 && !anchored[r + "," + c2]) {
            loose.push([r, c2]);
          }
        }
      }
      return loose;
    }

    function gameOver(hitDeadline) {
      alive = false;
      draw();
      resultEl.textContent =
        t(hitDeadline ? "bubOver" : "bubOutShots", { n: score, t: level.target }) +
        " " +
        t("bubRetry");
    }

    function levelCleared() {
      alive = false;
      var starsWon = starsFor(score, level.starGain.map(function (gain) {
        return Math.round(level.target * gain);
      }), "high");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: score,
      });
      var message = t("bubCleared", {
        name: t(level.labelKey),
        n: score,
        m: shots,
        stars: starsWon,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("bubNextSpring");
      } else if (campaign.clearedCount() === bubLevels.length) {
        message += " " + t("bubCampaignDone");
      }
      logAction(t("logBubbleInk", { name: t(level.labelKey), n: score }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(bubLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function update(dt) {
      if (flying) {
        flying.x += flying.vx * dt;
        flying.y += flying.vy * dt;
        if (flying.x < bubR) {
          flying.x = bubR;
          flying.vx = Math.abs(flying.vx);
        } else if (flying.x > bubWidth - bubR) {
          flying.x = bubWidth - bubR;
          flying.vx = -Math.abs(flying.vx);
        }
        var hit = flying.y <= bubR;
        if (!hit) {
          for (var r = 0; r < bubRows && !hit; r += 1) {
            for (var c = 0; c < grid[r].length && !hit; c += 1) {
              if (grid[r][c] < 0) {
                continue;
              }
              var dx = flying.x - bubX(r, c);
              var dy = flying.y - bubY(r);
              if (dx * dx + dy * dy < (bubD - 1) * (bubD - 1)) {
                hit = true;
              }
            }
          }
        }
        if (hit) {
          var fly = flying;
          flying = null;
          land(fly);
        }
      }
      var aliveParticles = [];
      for (var index = 0; index < particles.length; index += 1) {
        var spark = particles[index];
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.vy += 240 * dt;
        spark.life -= dt * 2.2;
        if (spark.life > 0) {
          aliveParticles.push(spark);
        }
      }
      particles = aliveParticles;
    }

    function drawBubble(x, y, color, radius) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = bubColors[color];
      ctx.fill();
      ctx.strokeStyle = "rgba(15, 23, 42, 0.35)";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - radius * 0.3, y - radius * 0.35, radius * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.fill();
    }

    function draw() {
      ctx.clearRect(0, 0, bubWidth, bubHeight);
      ctx.strokeStyle = "rgba(248, 113, 113, 0.4)";
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, 231.5);
      ctx.lineTo(bubWidth, 231.5);
      ctx.stroke();
      ctx.setLineDash([]);
      for (var r = 0; r < bubRows; r += 1) {
        for (var c = 0; c < grid[r].length; c += 1) {
          if (grid[r][c] >= 0) {
            drawBubble(bubX(r, c), bubY(r), grid[r][c], bubR);
          }
        }
      }
      if (alive && !flying) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        for (var dot = 1; dot <= 6; dot += 1) {
          ctx.beginPath();
          ctx.arc(
            bubShooterX + Math.cos(aim) * dot * 13,
            bubShooterY + Math.sin(aim) * dot * 13,
            2,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
      if (flying) {
        drawBubble(flying.x, flying.y, flying.color, bubR);
      }
      drawBubble(bubShooterX, bubShooterY, alive ? current : next, bubR - 1);
      drawBubble(288, bubShooterY, next, bubR - 3);
      for (var index = 0; index < particles.length; index += 1) {
        var spark = particles[index];
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
      if (!alive || flying) {
        return;
      }
      var rect = canvas.getBoundingClientRect();
      var x = (clientX - rect.left) * bubWidth / (rect.width || bubWidth);
      var y = (clientY - rect.top) * bubHeight / (rect.height || bubHeight);
      var angle = Math.atan2(y - bubShooterY, x - bubShooterX);
      /* Keep the aim in the upper half-plane; a pointer below the shooter
       * picks the nearer side wall instead of firing into the floor. */
      if (angle > -0.17) {
        angle = x < bubShooterX ? -Math.PI + 0.17 : -0.17;
      }
      aim = Math.max(-Math.PI + 0.17, Math.min(-0.17, angle));
    }

    function loadLevel(levelDef) {
      level = levelDef;
      grid = emptyGrid();
      for (var r = 0; r < level.rows; r += 1) {
        for (var c = 0; c < grid[r].length; c += 1) {
          grid[r][c] = Math.floor(Math.random() * level.colors);
        }
      }
      current = Math.floor(Math.random() * level.colors);
      next = Math.floor(Math.random() * level.colors);
      flying = null;
      particles = [];
      shots = level.shots;
      score = 0;
      popped = 0;
      alive = false;
      renderHud();
      refreshPicker();
      draw();
      resultEl.textContent = t("bubReady", { n: level.target, m: level.shots });
    }

    function startGame() {
      loadLevel(level);
      alive = true;
      resultEl.textContent = t("bubGo");
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
        aim = Math.max(-Math.PI + 0.17, aim - 0.06);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        aim = Math.min(-0.17, aim + 0.06);
      } else if (event.key === " ") {
        event.preventDefault();
        fire();
      }
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(bubLevels[index]);
      }
    });

    startBtn.addEventListener("click", startGame);

    App.quietResetBubbleInk = function () {
      if (alive) {
        stopLoop();
        alive = false;
        flying = null;
        resultEl.textContent = t("bubPaused");
      }
    };

    loadLevel(bubLevels[campaign.indexOf(campaign.nextLevelId())]);
    startLoop();
  }


  /* Exported for the other modules. */
  App.initBubbleInkGame = initBubbleInkGame;
})(window.CapitalConvert = window.CapitalConvert || {});
