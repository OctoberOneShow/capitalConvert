/* Glyph Glide - The ice-slide maze campaign in the shared game drawer.
 * Boards come from a generator that only returns deals its BFS has solved
 * inside the level's par window, so every board is provably passable; the
 * checks replay the solver headless. */
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
  var glideSize = 320;
  var GLIDE_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  /* Levels: width, height, star count, and the par window the generator
   * must hit. Star thresholds are moves [3-star, 2-star, 1-star] derived
   * from the deal's par. */
  var glideLevels = [
    { id: "i1", labelKey: "glL1", w: 8, h: 6, stars: 0, minPar: 3, maxPar: 5 },
    { id: "i2", labelKey: "glL2", w: 8, h: 6, stars: 1, minPar: 4, maxPar: 7 },
    { id: "i3", labelKey: "glL3", w: 9, h: 7, stars: 2, minPar: 5, maxPar: 9 },
    { id: "i4", labelKey: "glL4", w: 9, h: 7, stars: 2, minPar: 7, maxPar: 11 },
    { id: "i5", labelKey: "glL5", w: 10, h: 8, stars: 3, minPar: 7, maxPar: 15 },
    { id: "i6", labelKey: "glL6", w: 10, h: 8, stars: 3, minPar: 8, maxPar: 18 },
    { id: "i7", labelKey: "glL7", w: 11, h: 9, stars: 4, minPar: 9, maxPar: 19 },
    { id: "i8", labelKey: "glL8", w: 12, h: 9, stars: 5, minPar: 10, maxPar: 21 },
  ];

  /* Pure generator + solver, exported for the static checks. Board walls
   * are a flat 0/1 array; the solver returns the minimal slide count. */
  function glideSolve(wall, w, h, start, goal, stars) {
    var dirs = GLIDE_DIRS;
    function slide(pos, d) {
      var x = pos % w;
      var y = Math.floor(pos / w);
      var steps = 0;
      for (;;) {
        var nx = x + dirs[d][0];
        var ny = y + dirs[d][1];
        if (ny < 0 || ny >= h || nx < 0 || nx >= w || wall[ny * w + nx]) {
          break;
        }
        x = nx;
        y = ny;
        steps += 1;
      }
      return { pos: y * w + x, steps: steps };
    }
    var seen = {};
    var startMask = 0;
    seen[start * 4096 + startMask] = true;
    var queue = [{ p: start, m: startMask, d: 0 }];
    while (queue.length) {
      var st = queue.shift();
      var hasAll = true;
      for (var s = 0; s < stars.length; s += 1) {
        if (!((st.m >> s) & 1)) {
          hasAll = false;
          break;
        }
      }
      if (st.p === goal && hasAll) {
        return st.d;
      }
      for (var d = 0; d < 4; d += 1) {
        var res = slide(st.p, d);
        if (!res.steps) {
          continue;
        }
        var m = st.m;
        for (var s2 = 0; s2 < stars.length; s2 += 1) {
          if (res.pos === stars[s2]) {
            m |= 1 << s2;
          }
        }
        var k = res.pos * 4096 + m;
        if (seen[k]) {
          continue;
        }
        seen[k] = true;
        queue.push({ p: res.pos, m: m, d: st.d + 1 });
      }
    }
    return -1;
  }

  function glideGenerate(w, h, starCount, minPar, maxPar) {
    var bestDeal = null;
    var bestMiss = Infinity;
    for (var attempt = 0; attempt < 600; attempt += 1) {
      var density = w >= 10 ? 0.17 : 0.22;
      var wall = [];
      for (var i = 0; i < w * h; i += 1) {
        var x = i % w;
        var y = Math.floor(i / w);
        wall.push(
          x === 0 || y === 0 || x === w - 1 || y === h - 1 || Math.random() < density ? 1 : 0,
        );
      }
      var cells = [];
      for (var c = 0; c < w * h; c += 1) {
        if (!wall[c]) {
          cells.push(c);
        }
      }
      if (cells.length < 10) {
        continue;
      }
      for (var sh = cells.length - 1; sh > 0; sh -= 1) {
        var j = Math.floor(Math.random() * (sh + 1));
        var tmp = cells[sh];
        cells[sh] = cells[j];
        cells[j] = tmp;
      }
      var start = cells[0];
      var goal = cells[1];
      var stars = cells.slice(2, 2 + starCount);
      var par = glideSolve(wall, w, h, start, goal, stars);
      if (par < minPar || par > maxPar) {
        /* Keep the closest solvable deal as a graceful fallback. */
        var miss = par < minPar ? minPar - par : par - maxPar;
        if (par > 0 && miss < bestMiss) {
          bestMiss = miss;
          bestDeal = { wall: wall, start: start, goal: goal, stars: stars, par: par };
        }
        continue;
      }
      return { wall: wall, start: start, goal: goal, stars: stars, par: par };
    }
    if (bestDeal) {
      return bestDeal;
    }
    /* Fallback: an open ring board, one slide from any wall cell. */
    var safe = [];
    for (var f = 0; f < w * h; f += 1) {
      var fx = f % w;
      var fy = Math.floor(f / w);
      safe.push(fx === 0 || fy === 0 || fx === w - 1 || fy === h - 1 ? 1 : 0);
    }
    var fStart = 1 * w + 1;
    var fGoal = (h - 2) * w + (w - 2);
    var fStars = [];
    return { wall: safe, start: fStart, goal: fGoal, stars: fStars, par: 2 };
  }
  App.glyphGlideGenerate = glideGenerate;
  App.glyphGlideSolve = glideSolve;

  function initGlyphGlideGame() {
    var canvas = getElement("glCanvas");
    var movesEl = getElement("glMoves");
    var starsEl = getElement("glStars");
    var timeEl = getElement("glTime");
    var resultEl = getElement("glResult");
    var startBtn = getElement("glNewBtn");
    var bestEl = getElement("glBest");
    var selectEl = getElement("glLevelSel");
    if (
      !canvas ||
      !movesEl ||
      !starsEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "glyph-glide-campaign", levels: glideLevels });
    var level = glideLevels[0];
    var w = 8;
    var h = 6;
    var wall = [];
    var player = 0;
    var goal = 0;
    var stars = [];
    var collected = {};
    var par = 3;
    var trail = [];
    var moves = 0;
    var solved = false;
    var facing = [1, 0];
    var rafId = null;
    var startedAt = 0;
    var clockRunning = false;

    function renderHud() {
      movesEl.textContent = String(moves);
      var got = stars.filter(function (s) {
        return collected[s];
      }).length;
      starsEl.textContent = got + "/" + stars.length;
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
      var deal = glideGenerate(level.w, level.h, level.stars, level.minPar, level.maxPar);
      w = level.w;
      h = level.h;
      wall = deal.wall;
      player = deal.start;
      goal = deal.goal;
      stars = deal.stars;
      collected = {};
      par = deal.par;
      trail = [];
      moves = 0;
      solved = false;
      facing = [1, 0];
      clockRunning = false;
      startedAt = Date.now();
      renderHud();
      refreshPicker();
      startLoop();
      draw();
      resultEl.textContent = t("glReady", { n: par });
    }

    function slide(dirIndex) {
      if (solved) {
        return;
      }
      var d = GLIDE_DIRS[dirIndex];
      var x = player % w;
      var y = Math.floor(player / w);
      var steps = 0;
      for (;;) {
        var nx = x + d[0];
        var ny = y + d[1];
        if (ny < 0 || ny >= h || nx < 0 || nx >= w || wall[ny * w + nx]) {
          break;
        }
        x = nx;
        y = ny;
        steps += 1;
        trail.push({ x: x, y: y, life: 1 });
      }
      if (!steps) {
        return;
      }
      player = y * w + x;
      facing = d;
      moves += 1;
      if (stars.indexOf(player) !== -1) {
        collected[player] = true;
      }
      if (!clockRunning) {
        clockRunning = true;
        startedAt = Date.now();
      }
      renderHud();
      draw();
      checkCleared();
    }

    function allCollected() {
      return stars.every(function (s) {
        return collected[s];
      });
    }

    function checkCleared() {
      if (solved || player !== goal || !allCollected()) {
        return;
      }
      solved = true;
      clockRunning = false;
      var starsWon = starsFor(moves, [par + 1, par + 3, par + 7], "low");
      if (starsWon <= 0) {
        starsWon = 1;
      }
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: moves,
        better: "low",
      });
      var message = t("glCleared", { n: moves, stars: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("glNextRink");
      } else if (campaign.clearedCount() === glideLevels.length) {
        message += " " + t("glCampaignDone");
      }
      logAction(t("logGlyphGlide", { n: moves }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(glideLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function geometry() {
      var cell = Math.floor(Math.min((glideSize - 12) / w, (glideSize - 12) / h));
      return {
        cell: cell,
        x0: Math.floor((glideSize - cell * w) / 2),
        y0: Math.floor((glideSize - cell * h) / 2),
      };
    }

    function draw() {
      var time = Date.now();
      var geo = geometry();
      ctx.clearRect(0, 0, glideSize, glideSize);
      for (var i = 0; i < w * h; i += 1) {
        var x = i % w;
        var y = Math.floor(i / w);
        var gx = geo.x0 + x * geo.cell;
        var gy = geo.y0 + y * geo.cell;
        if (wall[i]) {
          ctx.fillStyle = "rgba(71, 85, 105, 0.9)";
          ctx.fillRect(gx, gy, geo.cell, geo.cell);
          ctx.fillStyle = "rgba(148, 163, 184, 0.25)";
          ctx.fillRect(gx, gy, geo.cell, 3);
        } else {
          ctx.fillStyle = "rgba(30, 41, 59, 0.5)";
          ctx.fillRect(gx + 1, gy + 1, geo.cell - 2, geo.cell - 2);
        }
      }
      /* Ice trail */
      trail.forEach(function (t) {
        ctx.globalAlpha = Math.max(0, t.life) * 0.5;
        ctx.fillStyle = "#22d3ee";
        var tx = geo.x0 + t.x * geo.cell + geo.cell / 2;
        var ty = geo.y0 + t.y * geo.cell + geo.cell / 2;
        ctx.beginPath();
        ctx.arc(tx, ty, geo.cell * 0.12, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      /* Goal */
      if (allCollected() || !stars.length) {
        var pulse = 0.6 + Math.sin(time / 240) * 0.25;
        ctx.strokeStyle = "rgba(163, 230, 53, " + pulse + ")";
        ctx.lineWidth = 2.5;
        var gox = geo.x0 + (goal % w) * geo.cell + geo.cell / 2;
        var goy = geo.y0 + Math.floor(goal / w) * geo.cell + geo.cell / 2;
        ctx.beginPath();
        ctx.arc(gox, goy, geo.cell * 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
      /* Stars */
      stars.forEach(function (s, index) {
        if (collected[s]) {
          return;
        }
        var sx = geo.x0 + (s % w) * geo.cell + geo.cell / 2;
        var sy = geo.y0 + Math.floor(s / w) * geo.cell + geo.cell / 2;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(time / 700 + index);
        ctx.fillStyle = "#fbbf24";
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 10;
        ctx.fillRect(-geo.cell * 0.12, -geo.cell * 0.12, geo.cell * 0.24, geo.cell * 0.24);
        ctx.restore();
        ctx.shadowBlur = 0;
      });
      /* Player */
      var px = geo.x0 + (player % w) * geo.cell + geo.cell / 2;
      var py = geo.y0 + Math.floor(player / w) * geo.cell + geo.cell / 2;
      var lean = facing[0] !== 0 ? 0.28 : -0.28;
      ctx.save();
      ctx.translate(px, py);
      if (facing[0] !== 0) {
        ctx.scale(1 + Math.abs(lean) * 0.2, 1 - Math.abs(lean) * 0.2);
      } else {
        ctx.scale(1 - Math.abs(lean) * 0.2, 1 + Math.abs(lean) * 0.2);
      }
      ctx.beginPath();
      ctx.arc(0, 0, geo.cell * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = "#22d3ee";
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#101426";
      ctx.beginPath();
      ctx.arc(facing[0] * 4 - 3, facing[1] * 4 - 2, 1.8, 0, Math.PI * 2);
      ctx.arc(facing[0] * 4 + 3, facing[1] * 4 - 2, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      if (
        document.getElementById("gamePanelGlyphGlide").hidden ||
        document.hidden
      ) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      if (clockRunning) {
        renderHud();
      }
      var alive = [];
      trail.forEach(function (t) {
        t.life -= 0.02;
        if (t.life > 0) {
          alive.push(t);
        }
      });
      trail = alive;
      draw();
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    var KEYMAP = { ArrowUp: 2, ArrowDown: 3, ArrowLeft: 1, ArrowRight: 0, w: 2, s: 3, a: 1, d: 0 };

    canvas.addEventListener("keydown", function (event) {
      var dir = KEYMAP[event.key];
      if (dir !== undefined) {
        event.preventDefault();
        slide(dir);
      }
    });

    /* Tap a cell in line with the player to slide that way. */
    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var px = (event.clientX - rect.left) * scaleX;
      var py = (event.clientY - rect.top) * scaleY;
      var geo = geometry();
      var c = Math.floor((px - geo.x0) / geo.cell);
      var r = Math.floor((py - geo.y0) / geo.cell);
      if (c < 0 || r < 0 || c >= w || r >= h) {
        return;
      }
      var px2 = player % w;
      var py2 = Math.floor(player / w);
      if (r === py2 && c !== px2) {
        slide(c > px2 ? 0 : 1);
      } else if (c === px2 && r !== py2) {
        slide(r > py2 ? 3 : 2);
      }
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(glideLevels[index]);
      }
    });

    startBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    App.quietResetGlyphGlide = function () {
      clockRunning = false;
      resultEl.textContent = t("glPaused");
    };

    loadLevel(glideLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initGlyphGlideGame = initGlyphGlideGame;
})(window.CapitalConvert = window.CapitalConvert || {});
