/* Ink Sort - The pouring puzzle campaign in the shared game drawer. */
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
  var sortSize = 320;
  var sortCap = 4;
  var sortColors = [
    "#22d3ee", "#f472b6", "#a3e635", "#fbbf24",
    "#a78bfa", "#fb7185", "#38bdf8", "#4ade80",
  ];
  /* Boards: `tubes` vessels, `colors` of them start filled with four units.
   * `shuffle` reverse-pours scramble the solved state, so every deal is
   * provably winnable by replaying the walk. Star moves are
   * [3-star, 2-star, 1-star]. */
  var sortLevels = [
    { id: "q1", labelKey: "sorL1", tubes: 5, colors: 3, shuffle: 8, starMoves: [8, 12, 18] },
    { id: "q2", labelKey: "sorL2", tubes: 6, colors: 4, shuffle: 14, starMoves: [12, 18, 26] },
    { id: "q3", labelKey: "sorL3", tubes: 7, colors: 4, shuffle: 20, starMoves: [13, 19, 27] },
    { id: "q4", labelKey: "sorL4", tubes: 8, colors: 5, shuffle: 28, starMoves: [16, 24, 34] },
    { id: "q5", labelKey: "sorL5", tubes: 9, colors: 6, shuffle: 38, starMoves: [20, 30, 42] },
    { id: "q6", labelKey: "sorL6", tubes: 10, colors: 7, shuffle: 50, starMoves: [24, 36, 50] },
    { id: "q7", labelKey: "sorL7", tubes: 11, colors: 8, shuffle: 56, starMoves: [28, 42, 58] },
    { id: "q8", labelKey: "sorL8", tubes: 12, colors: 8, shuffle: 62, starMoves: [32, 46, 62] },
  ];

  /* Pure deal generator with a built-in solver: shuffle the colour units
   * into a random permutation, then DFS-verify the deal can actually be
   * finished before offering it. Exported for the checks. The helpers
   * below deliberately re-declare the capacity so the slice is
   * self-contained and runnable headless. */
  var SORT_CAP = 4;

  function sortTopRun(tubes, index) {
    var tube = tubes[index];
    if (!tube.length) {
      return null;
    }
    var color = tube[tube.length - 1];
    var count = 1;
    for (var i = tube.length - 2; i >= 0; i -= 1) {
      if (tube[i] !== color) {
        break;
      }
      count += 1;
    }
    return { color: color, count: count };
  }

  function sortCanPour(tubes, from, to) {
    if (from === to || !tubes[from].length || tubes[to].length >= SORT_CAP) {
      return false;
    }
    var run = sortTopRun(tubes, from);
    var dest = tubes[to];
    return !dest.length || dest[dest.length - 1] === run.color;
  }

  function sortPour(tubes, from, to) {
    var run = sortTopRun(tubes, from);
    var amount = Math.min(run.count, SORT_CAP - tubes[to].length);
    for (var u = 0; u < amount; u += 1) {
      tubes[to].push(tubes[from].pop());
    }
    return amount;
  }

  function sortIsUniform(tubes) {
    return tubes.every(function (tube) {
      return (
        !tube.length ||
        (tube.length === SORT_CAP &&
          tube.every(function (c) {
            return c === tube[0];
          }))
      );
    });
  }

  /* Depth-first search with a visited set; returns one winning pour
   * sequence or null when the node budget runs out. */
  function sortSolve(start, maxNodes) {
    var seen = {};
    var nodes = 0;
    var path = [];
    function key(tubes) {
      var parts = [];
      for (var i = 0; i < tubes.length; i += 1) {
        parts.push(tubes[i].join(","));
      }
      return parts.join("|");
    }
    function dfs(tubes) {
      nodes += 1;
      if (nodes > maxNodes) {
        return false;
      }
      var k = key(tubes);
      if (seen[k]) {
        return false;
      }
      seen[k] = 1;
      if (sortIsUniform(tubes)) {
        return true;
      }
      for (var a = 0; a < tubes.length; a += 1) {
        if (!tubes[a].length) {
          continue;
        }
        var run = sortTopRun(tubes, a);
        if (run.count === SORT_CAP) {
          continue;
        }
        for (var b = 0; b < tubes.length; b += 1) {
          if (a === b || tubes[b].length >= SORT_CAP) {
            continue;
          }
          if (tubes[b].length && tubes[b][tubes[b].length - 1] !== run.color) {
            continue;
          }
          if (!tubes[b].length && run.count === tubes[a].length) {
            continue;
          }
          var next = tubes.map(function (tube) {
            return tube.slice();
          });
          var amount = Math.min(run.count, SORT_CAP - next[b].length);
          for (var u = 0; u < amount; u += 1) {
            next[b].push(next[a].pop());
          }
          path.push([a, b]);
          if (dfs(next)) {
            return true;
          }
          path.pop();
        }
      }
      return false;
    }
    return dfs(start.map(function (tube) {
      return tube.slice();
    }))
      ? path.slice()
      : null;
  }

  function sortGenerate(colors, tubeCount, depth) {
    var attempt;
    for (attempt = 0; attempt < 60; attempt += 1) {
      var units = [];
      for (var c = 0; c < colors; c += 1) {
        for (var u = 0; u < SORT_CAP; u += 1) {
          units.push(c);
        }
      }
      for (var s = units.length - 1; s > 0; s -= 1) {
        var j = Math.floor(Math.random() * (s + 1));
        var tmp = units[s];
        units[s] = units[j];
        units[j] = tmp;
      }
      var tubes = [];
      var cursor = 0;
      for (var index = 0; index < tubeCount; index += 1) {
        if (index < colors) {
          tubes.push(units.slice(cursor, cursor + SORT_CAP));
          cursor += SORT_CAP;
        } else {
          tubes.push([]);
        }
      }
      if (sortIsUniform(tubes)) {
        continue;
      }
      var solution = sortSolve(tubes, 30000);
      if (solution && solution.length) {
        return { tubes: tubes, solution: solution };
      }
    }
    /* Deterministic fallback: one unit parked in the spare tube, so the
     * deal is always exactly one legal pour from done. */
    var safe = [];
    for (var i2 = 0; i2 < tubeCount; i2 += 1) {
      safe.push(i2 < colors ? [i2, i2, i2, i2] : []);
    }
    if (tubeCount > colors) {
      safe[colors].push(safe[0].pop());
    }
    return { tubes: safe, solution: tubeCount > colors ? [[0, colors]] : [] };
  }
  App.inkSortGenerate = sortGenerate;

  function initInkSortGame() {
    var canvas = getElement("sorCanvas");
    var movesEl = getElement("sorMoves");
    var tubesEl = getElement("sorTubes");
    var timeEl = getElement("sorTime");
    var resultEl = getElement("sorResult");
    var startBtn = getElement("sorNewBtn");
    var bestEl = getElement("sorBest");
    var selectEl = getElement("sorLevelSel");
    if (
      !canvas ||
      !movesEl ||
      !tubesEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "ink-sort-campaign", levels: sortLevels });
    var level = sortLevels[0];
    var tubes = [];
    var moves = 0;
    var solved = false;
    var selected = -1;
    var keyIndex = 0;
    var droplets = [];
    var rafId = null;
    var startedAt = 0;
    var clockRunning = false;

    function tubeLayout() {
      var rows = tubes.length > 5 ? 2 : 1;
      var perRow = Math.ceil(tubes.length / rows);
      var gap = Math.min(18, (sortSize - 24) / perRow - 46);
      var tubeW = 46;
      var rowH = Math.floor((sortSize - 36 - (rows - 1) * 14) / rows);
      var x0 = (sortSize - (perRow * tubeW + (perRow - 1) * gap)) / 2;
      var y0 = (sortSize - (rows * rowH + (rows - 1) * 14)) / 2;
      return { rows: rows, perRow: perRow, tubeW: tubeW, gap: gap, rowH: rowH, x0: x0, y0: y0 };
    }

    function tubeRect(index) {
      var lay = tubeLayout();
      var row = Math.floor(index / lay.perRow);
      var col = index % lay.perRow;
      return {
        x: lay.x0 + col * (lay.tubeW + lay.gap),
        y: lay.y0 + row * (lay.rowH + 14),
        w: lay.tubeW,
        h: lay.rowH,
      };
    }

    function isDone(tube) {
      return tube.length === sortCap && tube.every(function (c) {
        return c === tube[0];
      });
    }

    function allDone() {
      return tubes.every(function (tube) {
        return !tube.length || isDone(tube);
      });
    }

    function renderHud() {
      movesEl.textContent = String(moves);
      tubesEl.textContent =
        tubes.filter(function (tube) {
          return isDone(tube);
        }).length + "/" + level.colors;
      timeEl.textContent = clockRunning
        ? ((Date.now() - startedAt) / 1000).toFixed(1) + "s"
        : timeEl.textContent;
    }

    function splash(x, y, color) {
      for (var index = 0; index < 8; index += 1) {
        droplets.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 90,
          vy: -40 - Math.random() * 60,
          life: 1,
          color: color,
        });
      }
    }

    function checkCleared() {
      if (solved || !allDone()) {
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
      var message = t("sorCleared", { n: moves, stars: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("sorNextVial");
      } else if (campaign.clearedCount() === sortLevels.length) {
        message += " " + t("sorCampaignDone");
      }
      logAction(t("logInkSort", { n: moves }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(sortLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function tryPour(from, to) {
      if (solved || from === to) {
        return false;
      }
      if (!tubes[from].length || tubes[to].length >= sortCap) {
        return false;
      }
      if (isDone(tubes[from])) {
        return false;
      }
      var run = sortTopRun(tubes, from);
      var dest = tubes[to];
      if (dest.length && dest[dest.length - 1] !== run.color) {
        return false;
      }
      var rect = tubeRect(to);
      var amount = sortPour(tubes, from, to);
      moves += 1;
      if (!clockRunning) {
        clockRunning = true;
        startedAt = Date.now();
      }
      splash(
        rect.x + rect.w / 2,
        rect.y + rect.h - (tubes[to].length * (rect.h - 16)) / sortCap - 8,
        sortColors[run.color % sortColors.length],
      );
      renderHud();
      draw();
      checkCleared();
      return true;
    }

    function selectTube(index) {
      if (solved) {
        return;
      }
      if (selected === -1) {
        if (tubes[index].length && !isDone(tubes[index])) {
          selected = index;
        }
        draw();
        return;
      }
      if (selected === index) {
        selected = -1;
        draw();
        return;
      }
      var poured = tryPour(selected, index);
      selected = poured ? -1 : index;
      if (!poured && (isDone(tubes[index]) || !tubes[index].length)) {
        /* an unusable target just becomes the new pick if it can pour later */
        selected = isDone(tubes[index]) ? -1 : index;
      }
      draw();
    }

    function tubeFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var px = (event.clientX - rect.left) * scaleX;
      var py = (event.clientY - rect.top) * scaleY;
      for (var index = 0; index < tubes.length; index += 1) {
        var r = tubeRect(index);
        if (px >= r.x - 4 && px <= r.x + r.w + 4 && py >= r.y - 10 && py <= r.y + r.h + 10) {
          return index;
        }
      }
      return -1;
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var index = tubeFromEvent(event);
      if (index !== -1) {
        keyIndex = index;
        selectTube(index);
      }
    });

    canvas.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        var dir = event.key === "ArrowLeft" ? -1 : 1;
        keyIndex = (keyIndex + dir + tubes.length) % tubes.length;
        draw();
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectTube(keyIndex);
      }
    });

    function loadLevel(levelDef) {
      level = levelDef;
      var deal = sortGenerate(level.colors, level.tubes, level.shuffle);
      tubes = deal.tubes;
      moves = 0;
      solved = false;
      selected = -1;
      keyIndex = 0;
      clockRunning = false;
      startedAt = Date.now();
      renderHud();
      refreshPicker();
      startLoop();
      draw();
      resultEl.textContent = t("sorReady", { n: level.colors });
    }

    function draw() {
      var time = Date.now();
      ctx.clearRect(0, 0, sortSize, sortSize);
      if (App.world) { App.world.backdrop(ctx, sortSize, sortSize, "laboratory"); }
      tubes.forEach(function (tube, index) {
        var r = tubeRect(index);
        var isSel = index === selected || (selected === -1 && index === keyIndex);
        /* Vessel glass */
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(r.x, r.y, r.w, r.h, [6, 6, 18, 18]);
        } else {
          ctx.rect(r.x, r.y, r.w, r.h);
        }
        ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
        ctx.fill();
        ctx.strokeStyle = isSel ? "rgba(0, 242, 255, 0.95)" : "rgba(148, 163, 184, 0.5)";
        ctx.lineWidth = isSel ? 2.5 : 1.5;
        if (isSel) {
          ctx.shadowColor = "#00f2ff";
          ctx.shadowBlur = 10 + Math.sin(time / 200) * 4;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        /* Liquid units, bottom-up */
        var unitH = (r.h - 14) / sortCap;
        tube.forEach(function (color, unit) {
          var y = r.y + r.h - 7 - (unit + 1) * unitH;
          var wave = Math.sin(time / 300 + unit * 0.9 + index) * 1.2;
          ctx.fillStyle = sortColors[color % sortColors.length];
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 8;
          ctx.fillRect(r.x + 4, y + wave, r.w - 8, unitH - 1.5);
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
          ctx.fillRect(r.x + 4, y + wave, r.w - 8, 2);
        });
        if (isDone(tube)) {
          /* Finished vials sparkle */
          ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
          var tw = (time / 120 + index * 13) % 20;
          ctx.globalAlpha = 0.4 + 0.4 * Math.sin(time / 180 + index);
          ctx.fillRect(r.x + 4 + (tw % (r.w - 10)), r.y + 6, 2, 2);
          ctx.globalAlpha = 1;
        }
      });
      /* Droplets */
      droplets.forEach(function (drop) {
        ctx.globalAlpha = Math.max(0, drop.life);
        ctx.fillStyle = drop.color;
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      if (
        document.getElementById("gamePanelInkSort").hidden ||
        document.hidden
      ) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      if (clockRunning) {
        renderHud();
      }
      var alive = [];
      for (var index = 0; index < droplets.length; index += 1) {
        var drop = droplets[index];
        drop.x += drop.vx * 0.016;
        drop.y += drop.vy * 0.016;
        drop.vy += 190 * 0.016;
        drop.life -= 0.028;
        if (drop.life > 0) {
          alive.push(drop);
        }
      }
      droplets = alive;
      draw();
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(frame);
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

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(sortLevels[index]);
      }
    });

    startBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    App.quietResetInkSort = function () {
      clockRunning = false;
      resultEl.textContent = t("sorPaused");
    };

    loadLevel(sortLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initInkSortGame = initInkSortGame;
})(window.CapitalConvert = window.CapitalConvert || {});
