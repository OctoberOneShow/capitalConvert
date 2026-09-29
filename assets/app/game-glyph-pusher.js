/* Glyph Pusher - The sokoban campaign in the shared game drawer. Every
 * board ships BFS-verified solvable; see tools/static-checks.js. */
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
  var pushSize = 320;
  /* Map legend: "#" wall, " " floor, "$" box, "o" goal, "@" player.
   * starMoves thresholds are push counts [3-star, 2-star, 1-star]. */
  var pushLevels = [
    {
      id: "k1", labelKey: "sokL1", starMoves: [4, 7, 11],
      map: [
        "#######",
        "#     #",
        "# @$o #",
        "#     #",
        "#######",
      ],
    },
    {
      id: "k2", labelKey: "sokL2", starMoves: [6, 9, 13],
      map: [
        "########",
        "#      #",
        "# @$. #",
        "# $    #",
        "# oo   #",
        "#      #",
        "########",
      ],
    },
    {
      id: "k3", labelKey: "sokL3", starMoves: [9, 12, 16],
      map: [
        "########",
        "#   #  #",
        "# $ $  #",
        "#  @   #",
        "# o.o  #",
        "#   #  #",
        "########",
      ],
    },
    {
      id: "k4", labelKey: "sokL4", starMoves: [9, 12, 16],
      map: [
        "########",
        "#  #   #",
        "# $  o #",
        "#@#####",
        "# $  o #",
        "#      #",
        "########",
      ],
    },
    {
      id: "k5", labelKey: "sokL5", starMoves: [11, 14, 18],
      map: [
        "#########",
        "#       #",
        "# $ $ $ #",
        "#   @   #",
        "# o o o #",
        "#  $ o  #",
        "#       #",
        "#########",
      ],
    },
    {
      id: "k6", labelKey: "sokL6", starMoves: [7, 10, 14],
      map: [
        "########",
        "#      #",
        "# #oo# #",
        "# $  $ #",
        "#   @  #",
        "#      #",
        "########",
      ],
    },
    {
      id: "k7", labelKey: "sokL7", starMoves: [9, 13, 18],
      map: [
        "########",
        "#      #",
        "# $  $ #",
        "#  @   #",
        "# oo   #",
        "#      #",
        "########",
      ],
    },
    {
      id: "k8", labelKey: "sokL8", starMoves: [9, 13, 18],
      map: [
        "#########",
        "#   #   #",
        "# $ # o #",
        "#   # $ #",
        "#  @    #",
        "#  oo$  #",
        "#########",
      ],
    },
  ];

  function initGlyphPusherGame() {
    var canvas = getElement("sokCanvas");
    var movesEl = getElement("sokMoves");
    var goalsEl = getElement("sokGoals");
    var timeEl = getElement("sokTime");
    var resultEl = getElement("sokResult");
    var startBtn = getElement("sokNewBtn");
    var undoBtn = getElement("sokUndoBtn");
    var bestEl = getElement("sokBest");
    var selectEl = getElement("sokLevelSel");
    if (
      !canvas ||
      !movesEl ||
      !goalsEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !undoBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "glyph-pusher-campaign", levels: pushLevels });
    var level = pushLevels[0];
    var gridW = 0;
    var gridH = 0;
    var walls = [];
    var goals = {};
    var boxes = [];
    var player = [0, 0];
    var history = [];
    var pushes = 0;
    var solved = false;
    var squash = 0;
    var puffs = [];
    var rafId = null;
    var startedAt = 0;
    var clockRunning = false;

    function idx(x, y) {
      return y + "," + x;
    }

    function isWall(x, y) {
      return !walls[y] || walls[y][x];
    }

    function renderHud() {
      movesEl.textContent = String(pushes);
      goalsEl.textContent =
        boxes.filter(function (box) {
          return goals[idx(box[0], box[1])];
        }).length + "/" + boxes.length;
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
      gridH = level.map.length;
      gridW = 0;
      walls = [];
      goals = {};
      boxes = [];
      for (var y = 0; y < gridH; y += 1) {
        var row = level.map[y];
        gridW = Math.max(gridW, row.length);
        walls[y] = [];
        for (var x = 0; x < row.length; x += 1) {
          var ch = row.charAt(x);
          walls[y][x] = ch === "#";
          if (ch === "o") {
            goals[idx(x, y)] = true;
          }
          if (ch === "$") {
            boxes.push([x, y]);
          }
          if (ch === "@") {
            player = [x, y];
          }
        }
      }
      history = [];
      pushes = 0;
      solved = false;
      squash = 0;
      puffs = [];
      clockRunning = false;
      undoBtn.disabled = true;
      renderHud();
      refreshPicker();
      startLoop();
      draw();
      resultEl.textContent = t("sokReady", { n: boxes.length });
    }

    function puff(x, y, color) {
      for (var index = 0; index < 6; index += 1) {
        puffs.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 70,
          vy: (Math.random() - 0.5) * 70,
          life: 1,
          color: color,
        });
      }
    }

    function allHome() {
      return boxes.every(function (box) {
        return goals[idx(box[0], box[1])];
      });
    }

    function checkCleared() {
      if (solved || !allHome()) {
        return;
      }
      solved = true;
      clockRunning = false;
      var starsWon = starsFor(pushes, level.starMoves, "low");
      if (starsWon <= 0) {
        starsWon = 1;
      }
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: pushes,
        better: "low",
      });
      var message = t("sokCleared", { n: pushes, stars: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("sokNextRoom");
      } else if (campaign.clearedCount() === pushLevels.length) {
        message += " " + t("sokCampaignDone");
      }
      logAction(t("logGlyphPusher", { n: pushes }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(pushLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function move(dx, dy) {
      if (solved) {
        return;
      }
      var tx = player[0] + dx;
      var ty = player[1] + dy;
      if (isWall(tx, ty)) {
        return;
      }
      var boxIndex = -1;
      for (var index = 0; index < boxes.length; index += 1) {
        if (boxes[index][0] === tx && boxes[index][1] === ty) {
          boxIndex = index;
          break;
        }
      }
      if (boxIndex !== -1) {
        var bx = tx + dx;
        var by = ty + dy;
        if (isWall(bx, by)) {
          return;
        }
        for (var other = 0; other < boxes.length; other += 1) {
          if (boxes[other][0] === bx && boxes[other][1] === by) {
            return;
          }
        }
        history.push({
          player: player.slice(),
          boxes: boxes.map(function (box) {
            return box.slice();
          }),
          pushes: pushes,
        });
        boxes[boxIndex] = [bx, by];
        pushes += 1;
        squash = 1;
        puff(bx, by, goals[idx(bx, by)] ? "#a3e635" : "#fbbf24");
        if (!clockRunning) {
          clockRunning = true;
          startedAt = Date.now();
        }
        renderHud();
        checkCleared();
      } else {
        history.push({
          player: player.slice(),
          boxes: boxes.map(function (box) {
            return box.slice();
          }),
          pushes: pushes,
        });
      }
      player = [tx, ty];
      undoBtn.disabled = !history.length;
      draw();
    }

    function undo() {
      if (!history.length || solved) {
        return;
      }
      var snap = history.pop();
      player = snap.player;
      boxes = snap.boxes;
      pushes = snap.pushes;
      undoBtn.disabled = !history.length;
      renderHud();
      draw();
    }

    function geometry() {
      var cell = Math.min(
        Math.floor((pushSize - 20) / gridW),
        Math.floor((pushSize - 20) / gridH),
      );
      return {
        cell: cell,
        x0: Math.floor((pushSize - cell * gridW) / 2),
        y0: Math.floor((pushSize - cell * gridH) / 2),
      };
    }

    function draw() {
      var time = Date.now();
      var geo = geometry();
      ctx.clearRect(0, 0, pushSize, pushSize);
      /* Floor */
      for (var y = 0; y < gridH; y += 1) {
        for (var x = 0; x < gridW; x += 1) {
          if (isWall(x, y)) {
            continue;
          }
          ctx.fillStyle = "rgba(30, 41, 59, 0.55)";
          ctx.fillRect(
            geo.x0 + x * geo.cell + 2,
            geo.y0 + y * geo.cell + 2,
            geo.cell - 4,
            geo.cell - 4,
          );
        }
      }
      /* Walls */
      for (var wy = 0; wy < gridH; wy += 1) {
        for (var wx = 0; wx < gridW; wx += 1) {
          if (!isWall(wx, wy)) {
            continue;
          }
          ctx.fillStyle = "rgba(71, 85, 105, 0.9)";
          ctx.fillRect(
            geo.x0 + wx * geo.cell + 1,
            geo.y0 + wy * geo.cell + 1,
            geo.cell - 2,
            geo.cell - 2,
          );
          ctx.fillStyle = "rgba(148, 163, 184, 0.25)";
          ctx.fillRect(
            geo.x0 + wx * geo.cell + 1,
            geo.y0 + wy * geo.cell + 1,
            geo.cell - 2,
            3,
          );
        }
      }
      /* Goals */
      Object.keys(goals).forEach(function (key) {
        var parts = key.split(",");
        var gx = parseInt(parts[1], 10);
        var gy = parseInt(parts[0], 10);
        var cx = geo.x0 + gx * geo.cell + geo.cell / 2;
        var cy = geo.y0 + gy * geo.cell + geo.cell / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI / 4);
        var pulse = 4 + Math.sin(time / 280 + gx) * 1.5;
        ctx.strokeStyle = "rgba(163, 230, 53, 0.75)";
        ctx.lineWidth = 2;
        ctx.strokeRect(-pulse, -pulse, pulse * 2, pulse * 2);
        ctx.restore();
      });
      /* Boxes */
      boxes.forEach(function (box) {
        var home = !!goals[idx(box[0], box[1])];
        var cx = geo.x0 + box[0] * geo.cell;
        var cy = geo.y0 + box[1] * geo.cell;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(cx + 5, cy + 5, geo.cell - 10, geo.cell - 10, 6);
        } else {
          ctx.rect(cx + 5, cy + 5, geo.cell - 10, geo.cell - 10);
        }
        ctx.fillStyle = home ? "rgba(163, 230, 53, 0.85)" : "rgba(251, 191, 36, 0.85)";
        ctx.shadowColor = home ? "#a3e635" : "#fbbf24";
        ctx.shadowBlur = home ? 16 : 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(15, 23, 42, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx + 10, cy + 10, geo.cell - 20, geo.cell - 20);
      });
      /* Puffs */
      puffs.forEach(function (bit) {
        ctx.globalAlpha = Math.max(0, bit.life);
        ctx.fillStyle = bit.color;
        ctx.fillRect(bit.x - 2, bit.y - 2, 4, 4);
      });
      ctx.globalAlpha = 1;
      /* Player */
      var px = geo.x0 + player[0] * geo.cell + geo.cell / 2;
      var py = geo.y0 + player[1] * geo.cell + geo.cell / 2;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(1, 1 + squash * 0.2);
      ctx.beginPath();
      ctx.arc(0, 0, geo.cell * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = "#22d3ee";
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#101426";
      ctx.beginPath();
      ctx.arc(-4, -3, 2.2, 0, Math.PI * 2);
      ctx.arc(4, -3, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      if (
        document.getElementById("gamePanelGlyphPusher").hidden ||
        document.hidden
      ) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      if (clockRunning) {
        renderHud();
      }
      if (squash > 0) {
        squash = Math.max(0, squash - 0.08);
      }
      var alive = [];
      for (var index = 0; index < puffs.length; index += 1) {
        var bit = puffs[index];
        bit.x += bit.vx * 0.016;
        bit.y += bit.vy * 0.016;
        bit.life -= 0.04;
        if (bit.life > 0) {
          alive.push(bit);
        }
      }
      puffs = alive;
      draw();
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    var KEYMAP = {
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
    };

    canvas.addEventListener("keydown", function (event) {
      var move2 = KEYMAP[event.key];
      if (move2) {
        event.preventDefault();
        move(move2[0], move2[1]);
        return;
      }
      if (event.key === "Backspace" || event.key === "u") {
        event.preventDefault();
        undo();
      }
    });

    /* Swipe support: a drag from one cell toward another steps once. */
    var swipe = null;
    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      swipe = { x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener("pointerup", function (event) {
      if (!swipe) {
        return;
      }
      var dx = event.clientX - swipe.x;
      var dy = event.clientY - swipe.y;
      swipe = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) {
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        move(dx > 0 ? 1 : -1, 0);
      } else {
        move(0, dy > 0 ? 1 : -1);
      }
    });

    undoBtn.addEventListener("click", undo);
    startBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(pushLevels[index]);
      }
    });

    App.quietResetGlyphPusher = function () {
      clockRunning = false;
      resultEl.textContent = t("sokPaused");
    };

    loadLevel(pushLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initGlyphPusherGame = initGlyphPusherGame;
})(window.CapitalConvert = window.CapitalConvert || {});
