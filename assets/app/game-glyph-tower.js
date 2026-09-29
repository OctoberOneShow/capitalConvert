/* Glyph Tower - The disc-stacking campaign in the shared game drawer.
 * Classic tower transfer: the optimum is 2^n - 1 moves, so every level's
 * star thresholds sit above a provably reachable bar; the checks pin the
 * formula and the thresholds. */
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
  var towSize = 320;
  /* Levels: disc count per tower. Star thresholds are move counts
   * [3-star, 2-star, 1-star], always above the 2^n - 1 optimum. */
  var towLevels = [
    { id: "tw1", labelKey: "towL1", discs: 3, starMoves: [8, 10, 14] },
    { id: "tw2", labelKey: "towL2", discs: 4, starMoves: [16, 19, 25] },
    { id: "tw3", labelKey: "towL3", discs: 5, starMoves: [32, 36, 45] },
    { id: "tw4", labelKey: "towL4", discs: 6, starMoves: [63, 68, 80] },
    { id: "tw5", labelKey: "towL5", discs: 7, starMoves: [128, 135, 155] },
  ];

  /* Pure optimum, exported for the static checks. */
  function towMinMoves(discs) {
    var moves = 1;
    for (var i = 1; i < discs; i += 1) {
      moves = moves * 2 + 1;
    }
    return moves;
  }
  App.glyphTowerMinMoves = towMinMoves;

  function initGlyphTowerGame() {
    var canvas = getElement("towCanvas");
    var movesEl = getElement("towMoves");
    var minEl = getElement("towMin");
    var timeEl = getElement("towTime");
    var resultEl = getElement("towResult");
    var startBtn = getElement("towNewBtn");
    var bestEl = getElement("towBest");
    var selectEl = getElement("towLevelSel");
    if (
      !canvas ||
      !movesEl ||
      !minEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "glyph-tower-campaign", levels: towLevels });
    var level = towLevels[0];
    var pegs = [[], [], []];
    var lifted = null;
    var liftedFrom = 0;
    var moves = 0;
    var solved = false;
    var shake = 0;
    var liftedPeg = 0;
    var ripples = [];
    var rafId = null;
    var startedAt = 0;
    var clockRunning = false;

    function renderHud() {
      movesEl.textContent = String(moves);
      minEl.textContent = String(towMinMoves(level.discs));
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

    function loadLevel(levelDef) {
      level = levelDef;
      pegs = [[], [], []];
      for (var size = level.discs; size >= 1; size -= 1) {
        pegs[0].push(size);
      }
      lifted = null;
      moves = 0;
      solved = false;
      shake = 0;
      ripples = [];
      clockRunning = false;
      startedAt = Date.now();
      renderHud();
      refreshPicker();
      startLoop();
      draw();
      resultEl.textContent = t("towReady", { n: level.discs, m: towMinMoves(level.discs) });
    }

    function splash(x, y, color) {
      for (var index = 0; index < 8; index += 1) {
        ripples.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 90,
          vy: (Math.random() - 0.5) * 60 - 20,
          life: 1,
          color: color,
        });
      }
    }

    function checkCleared() {
      if (solved || pegs[2].length !== level.discs) {
        return;
      }
      solved = true;
      clockRunning = false;
      var starsWon = starsFor(moves, level.starMoves, "low");
      if (starsWon <= 0) {
        starsWon = 1;
      }
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: moves,
        better: "low",
      });
      var message = t("towCleared", { n: moves, m: towMinMoves(level.discs), stars: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("towNextTower");
      } else if (campaign.clearedCount() === towLevels.length) {
        message += " " + t("towCampaignDone");
      }
      logAction(t("logGlyphTower", { n: moves }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(towLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function tapPeg(peg) {
      if (solved || peg < 0 || peg > 2) {
        return;
      }
      if (lifted === null) {
        if (!pegs[peg].length) {
          return;
        }
        lifted = pegs[peg].pop();
        liftedFrom = peg;
        liftedPeg = peg;
        if (!clockRunning) {
          clockRunning = true;
          startedAt = Date.now();
        }
        draw();
        return;
      }
      if (peg === liftedFrom) {
        /* put it back */
        pegs[peg].push(lifted);
        lifted = null;
        draw();
        return;
      }
      var top = pegs[peg][pegs[peg].length - 1];
      if (top !== undefined && top < lifted) {
        /* illegal: bigger on smaller */
        shake = 1;
        var geo = geometry();
        splash(
          geo.x0 + geo.pegX[peg] + geo.pegW / 2,
          geo.y0 + 60,
          "#fb7185",
        );
        draw();
        return;
      }
      pegs[peg].push(lifted);
      lifted = null;
      moves += 1;
      var geo2 = geometry();
      splash(
        geo2.x0 + geo2.pegX[peg] + geo2.pegW / 2,
        geo2.y0 + 96 - pegs[peg].length * geo2.discH,
        "#a3e635",
      );
      renderHud();
      draw();
      checkCleared();
    }

    function geometry() {
      var pegW = 78;
      var gap = (towSize - 24 - pegW * 3) / 2;
      var discH = Math.min(16, Math.floor(150 / level.discs));
      return {
        pegW: pegW,
        gap: gap,
        discH: discH,
        baseY: towSize - 40,
        pegX: [12, 12 + pegW + gap, 12 + (pegW + gap) * 2],
        y0: 12,
      };
    }

    function discColor(size) {
      var hue = 190 - (size - 1) * 18;
      return "hsl(" + hue + ", 85%, 60%)";
    }

    function draw() {
      var time = Date.now();
      var geo = geometry();
      ctx.clearRect(0, 0, towSize, towSize);
      var offsetX = 0;
      if (shake > 0) {
        offsetX = (Math.random() - 0.5) * 8 * shake;
        shake = Math.max(0, shake - 0.08);
      }
      ctx.save();
      ctx.translate(offsetX, 0);
      /* Base and pegs */
      ctx.fillStyle = "rgba(71, 85, 105, 0.9)";
      ctx.fillRect(10, geo.baseY, towSize - 20, 10);
      for (var p = 0; p < 3; p += 1) {
        var px = geo.pegX[p] + geo.pegW / 2;
        var liftedHere = lifted !== null && liftedPeg === p;
        var pegTop = geo.baseY - geo.discH * Math.max(level.discs, 6) - 14;
        ctx.fillStyle = liftedHere
          ? "rgba(0, 242, 255, " + (0.5 + 0.3 * Math.sin(time / 180)) + ")"
          : "rgba(100, 116, 139, 0.85)";
        ctx.fillRect(px - 3, pegTop, 6, geo.baseY - pegTop);
        /* Peg number */
        ctx.fillStyle = "rgba(226, 232, 240, 0.7)";
        ctx.font = "bold 13px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(p + 1), px, geo.baseY + 28);
      }
      /* Discs */
      for (var p2 = 0; p2 < 3; p2 += 1) {
        var stack = pegs[p2];
        for (var d = 0; d < stack.length; d += 1) {
          var size = stack[d];
          var w = 20 + size * 8;
          var dx = geo.pegX[p2] + geo.pegW / 2 - w / 2;
          var dy = geo.baseY - (d + 1) * geo.discH;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(dx, dy + 2, w, geo.discH - 4, 4);
          } else {
            ctx.rect(dx, dy + 2, w, geo.discH - 4);
          }
          ctx.fillStyle = discColor(size);
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      /* Lifted disc hovers above its peg */
      if (lifted !== null) {
        var lw = 20 + lifted * 8;
        var lx = geo.pegX[liftedPeg] + geo.pegW / 2 - lw / 2;
        var ly = geo.y0 + 18 + Math.sin(time / 200) * 3;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(lx, ly, lw, geo.discH - 4, 4);
        } else {
          ctx.rect(lx, ly, lw, geo.discH - 4);
        }
        ctx.fillStyle = discColor(lifted);
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      /* Ripples */
      ripples.forEach(function (r) {
        ctx.globalAlpha = Math.max(0, r.life);
        ctx.fillStyle = r.color;
        ctx.fillRect(r.x - 2, r.y - 2, 4, 4);
      });
      ctx.globalAlpha = 1;
      /* Goal marker on peg 3 */
      ctx.fillStyle = "rgba(163, 230, 53, " + (0.45 + 0.3 * Math.sin(time / 260)) + ")";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillText("\u25b2", geo.pegX[2] + geo.pegW / 2, geo.baseY - geo.discH * level.discs - 22);
      ctx.restore();
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      if (
        document.getElementById("gamePanelGlyphTower").hidden ||
        document.hidden
      ) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      if (clockRunning) {
        renderHud();
      }
      var alive = [];
      for (var index = 0; index < ripples.length; index += 1) {
        var r = ripples[index];
        r.x += r.vx * 0.016;
        r.y += r.vy * 0.016;
        r.vy += 150 * 0.016;
        r.life -= 0.03;
        if (r.life > 0) {
          alive.push(r);
        }
      }
      ripples = alive;
      draw();
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    function pegFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var px = (event.clientX - rect.left) * scaleX;
      var geo = geometry();
      for (var p = 0; p < 3; p += 1) {
        if (px >= geo.pegX[p] - 4 && px <= geo.pegX[p] + geo.pegW + 4) {
          return p;
        }
      }
      return -1;
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      tapPeg(pegFromEvent(event));
    });

    canvas.addEventListener("keydown", function (event) {
      if (event.key === "1" || event.key === "2" || event.key === "3") {
        event.preventDefault();
        tapPeg(parseInt(event.key, 10) - 1);
      }
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(towLevels[index]);
      }
    });

    startBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    App.quietResetGlyphTower = function () {
      clockRunning = false;
      resultEl.textContent = t("towPaused");
    };

    loadLevel(towLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initGlyphTowerGame = initGlyphTowerGame;
})(window.CapitalConvert = window.CapitalConvert || {});
