/* Glyph Net - The pipe-rotation network campaign in the shared game drawer.
 * Boards are built from a spanning tree and scrambled by rotation, so every
 * deal is solvable by construction; the checks replay the rotations. */
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
  var netSize = 320;
  /* dir: 0 north, 1 east, 2 south, 3 west. */
  var NET_DX = [0, 1, 0, -1];
  var NET_DY = [-1, 0, 1, 0];
  /* Grids: `size` per side. The source sits at the top-left tile; every
   * other leaf of the spanning tree is a glowing bulb. Star pads are added
   * to the scramble's optimum rotation count: [3-star, 2-star, 1-star]. */
  var netLevels = [
    { id: "n1", labelKey: "netL1", size: 4, starPad: [0, 2, 5] },
    { id: "n2", labelKey: "netL2", size: 4, starPad: [0, 2, 5] },
    { id: "n3", labelKey: "netL3", size: 5, starPad: [0, 3, 6] },
    { id: "n4", labelKey: "netL4", size: 5, starPad: [0, 3, 6] },
    { id: "n5", labelKey: "netL5", size: 6, starPad: [0, 4, 8] },
    { id: "n6", labelKey: "netL6", size: 7, starPad: [0, 5, 10] },
    { id: "n7", labelKey: "netL7", size: 8, starPad: [0, 5, 10] },
    { id: "n8", labelKey: "netL8", size: 8, starPad: [0, 6, 11] },
    { id: "n9", labelKey: "lvlNum9", size: 8, starPad: [0, 5, 9] },
    { id: "n10", labelKey: "lvlNum10", size: 8, starPad: [0, 4, 8] },
    { id: "n11", labelKey: "lvlNum11", size: 8, starPad: [0, 3, 7] },
    { id: "n12", labelKey: "lvlNum12", size: 8, starPad: [0, 2, 6] },
  ];

  /* Pure generator + checker, exported for the static checks. Returns
   * { size, conns, rot, terminals, opt } where rotating tile i by rot[i]
   * steps away from the solved conns is the scrambled deal. */
  function netRotate(conn, steps) {
    var out = [false, false, false, false];
    for (var d = 0; d < 4; d += 1) {
      if (conn[d]) {
        out[(d + steps) % 4] = true;
      }
    }
    return out;
  }

  function netWin(size, conns, rot) {
    var DX = [0, 1, 0, -1];
    var DY = [-1, 0, 1, 0];
    var turned = conns.map(function (conn, i) {
      return netRotate(conn, rot[i]);
    });
    /* No open ends: every arm must meet a matching arm of a neighbour. */
    for (var i = 0; i < size * size; i += 1) {
      var x = i % size;
      var y = Math.floor(i / size);
      for (var d = 0; d < 4; d += 1) {
        if (!turned[i][d]) {
          continue;
        }
        var mx = x + DX[d];
        var my = y + DY[d];
        if (mx < 0 || my < 0 || mx >= size || my >= size) {
          return false;
        }
        if (!turned[my * size + mx][(d + 2) % 4]) {
          return false;
        }
      }
    }
    /* Every bulb reachable from the source tile 0. */
    var seen = {};
    seen[0] = true;
    var queue = [0];
    while (queue.length) {
      var cur = queue.shift();
      var cx = cur % size;
      var cy = Math.floor(cur / size);
      for (var d2 = 0; d2 < 4; d2 += 1) {
        if (!turned[cur][d2]) {
          continue;
        }
        var next = (cy + DY[d2]) * size + (cx + DX[d2]);
        if (!seen[next]) {
          seen[next] = true;
          queue.push(next);
        }
      }
    }
    /* Every armed tile has to hang off the source. Pairwise-matched arms
     * alone are not a network: two leaf tiles can face each other and close
     * a loop the bulbs never see. */
    for (var tile = 0; tile < size * size; tile += 1) {
      var armed = false;
      for (var arm = 0; arm < 4; arm += 1) {
        if (turned[tile][arm]) {
          armed = true;
          break;
        }
      }
      if (armed && !seen[tile]) {
        return false;
      }
    }
    return true;
  }

  function netGenerate(size) {
    function degree(conns, i) {
      var count = 0;
      for (var d = 0; d < 4; d += 1) {
        if (conns[i][d]) {
          count += 1;
        }
      }
      return count;
    }
    for (var attempt = 0; attempt < 80; attempt += 1) {
      var conns = [];
      var inTree = [];
      for (var i = 0; i < size * size; i += 1) {
        conns.push([false, false, false, false]);
        inTree.push(i === 0);
      }
      var guard = 0;
      while (inTree.indexOf(false) !== -1 && guard < 600) {
        guard += 1;
        var frontier = [];
        for (var n = 0; n < size * size; n += 1) {
          if (inTree[n]) {
            frontier.push(n);
          }
        }
        var node = frontier[Math.floor(Math.random() * frontier.length)];
        var nx = node % size;
        var ny = Math.floor(node / size);
        var options = [];
        for (var d = 0; d < 4; d += 1) {
          var mx = nx + NET_DX[d];
          var my = ny + NET_DY[d];
          if (mx < 0 || my < 0 || mx >= size || my >= size) {
            continue;
          }
          if (!inTree[my * size + mx]) {
            options.push(d);
          }
        }
        if (!options.length) {
          continue;
        }
        var pick = options[Math.floor(Math.random() * options.length)];
        var other = (ny + NET_DY[pick]) * size + (nx + NET_DX[pick]);
        conns[node][pick] = true;
        conns[other][(pick + 2) % 4] = true;
        inTree[other] = true;
      }
      if (inTree.indexOf(false) !== -1) {
        continue;
      }
      var terminals = [];
      for (var t = 0; t < size * size; t += 1) {
        if (degree(conns, t) === 1 && t !== 0) {
          terminals.push(t);
        }
      }
      if (terminals.length < 3 || degree(conns, 0) < 2) {
        continue;
      }
      /* Scramble a fixed share of tiles by full rotations; the untouched
       * tiles rotate by zero. Retry while the scramble solves itself. */
      var tiles = [];
      for (var s = 1; s < size * size; s += 1) {
        tiles.push(s);
      }
      for (var shuf = tiles.length - 1; shuf > 0; shuf -= 1) {
        var j = Math.floor(Math.random() * (shuf + 1));
        var tmp = tiles[shuf];
        tiles[shuf] = tiles[j];
        tiles[j] = tmp;
      }
      var rot = [];
      for (var r = 0; r < size * size; r += 1) {
        rot.push(0);
      }
      var scrambleCount = Math.max(3, Math.floor(tiles.length * 0.6));
      for (var sc = 0; sc < scrambleCount; sc += 1) {
        rot[tiles[sc]] = 1 + Math.floor(Math.random() * 3);
      }
      var opt = 0;
      for (var o = 1; o < rot.length; o += 1) {
        opt += Math.min(rot[o], 4 - rot[o]);
      }
      if (opt < 3 || netWin(size, conns, rot)) {
        continue;
      }
      return { size: size, conns: conns, rot: rot, terminals: terminals, opt: opt };
    }
    /* Fallback: the solved board itself, trivially one rotation from done. */
    var fallbackConns = [];
    for (var f = 0; f < size * size; f += 1) {
      fallbackConns.push([f === 0, (f % size) < size - 1, false, (f % size) > 0]);
    }
    return { size: size, conns: fallbackConns, rot: [0, 1].concat([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0].slice(0, size*size-2)), terminals: [size-1, size*(size-1)], opt: 1 };
  }
  App.glyphNetGenerate = netGenerate;
  App.glyphNetWin = netWin;

  function initGlyphNetGame() {
    var canvas = getElement("netCanvas");
    var movesEl = getElement("netMoves");
    var bulbsEl = getElement("netBulbs");
    var timeEl = getElement("netTime");
    var resultEl = getElement("netResult");
    var startBtn = getElement("netNewBtn");
    var bestEl = getElement("netBest");
    var selectEl = getElement("netLevelSel");
    if (
      !canvas ||
      !movesEl ||
      !bulbsEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "glyph-net-campaign", levels: netLevels });
    var level = netLevels[0];
    var size = 4;
    var conns = [];
    var rot = [];
    var terminals = [];
    var optimal = 0;
    var moves = 0;
    var solved = false;
    var cursor = 0;
    var rafId = null;
    var startedAt = 0;
    var clockRunning = false;

    function turnedConn(i) {
      return netRotate(conns[i], rot[i]);
    }

    function powered() {
      var lit = {};
      lit[0] = true;
      var queue = [0];
      while (queue.length) {
        var cur = queue.shift();
        var cx = cur % size;
        var cy = Math.floor(cur / size);
        var conn = turnedConn(cur);
        for (var d = 0; d < 4; d += 1) {
          if (!conn[d]) {
            continue;
          }
          var mx = cx + NET_DX[d];
          var my = cy + NET_DY[d];
          /* Scrambled arms may point off the board; they simply power
           * nothing until the tile is rotated into place. */
          if (mx < 0 || my < 0 || mx >= size || my >= size) {
            continue;
          }
          var next = my * size + mx;
          if (!lit[next]) {
            lit[next] = true;
            queue.push(next);
          }
        }
      }
      return lit;
    }

    function litBulbs() {
      var lit = powered();
      return terminals.filter(function (tile) {
        return lit[tile];
      }).length;
    }

    function renderHud() {
      movesEl.textContent = String(moves);
      bulbsEl.textContent = litBulbs() + "/" + terminals.length;
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
      var deal = netGenerate(level.size);
      size = deal.size;
      conns = deal.conns;
      rot = deal.rot.slice();
      terminals = deal.terminals;
      optimal = deal.opt;
      moves = 0;
      solved = false;
      cursor = 0;
      clockRunning = false;
      startedAt = Date.now();
      renderHud();
      refreshPicker();
      startLoop();
      draw();
      resultEl.textContent = t("netReady", { n: terminals.length });
    }

    function rotateTile(i) {
      if (solved) {
        return;
      }
      rot[i] = (rot[i] + 1) % 4;
      moves += 1;
      if (!clockRunning) {
        clockRunning = true;
        startedAt = Date.now();
      }
      renderHud();
      draw();
      checkCleared();
    }

    function checkCleared() {
      if (solved || !netWin(size, conns, rot)) {
        return;
      }
      solved = true;
      clockRunning = false;
      var starsWon = starsFor(moves, [optimal + level.starPad[0], optimal + level.starPad[1], optimal + level.starPad[2]], "low");
      if (starsWon <= 0) {
        starsWon = 1;
      }
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: moves,
        better: "low",
      });
      var message = t("netCleared", { n: moves, stars: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("netNextGrid");
      } else if (campaign.clearedCount() === netLevels.length) {
        message += " " + t("netCampaignDone");
      }
      logAction(t("logGlyphNet", { n: terminals.length }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(netLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function geometry() {
      var cell = Math.floor((netSize - 20) / size);
      return {
        cell: cell,
        x0: Math.floor((netSize - cell * size) / 2),
        y0: Math.floor((netSize - cell * size) / 2),
      };
    }

    function draw() {
      var time = Date.now();
      var geo = geometry();
      var lit = powered();
      ctx.clearRect(0, 0, netSize, netSize);
      for (var i = 0; i < size * size; i += 1) {
        var x = i % size;
        var y = Math.floor(i / size);
        var gx = geo.x0 + x * geo.cell;
        var gy = geo.y0 + y * geo.cell;
        var cx = gx + geo.cell / 2;
        var cy = gy + geo.cell / 2;
        var isLit = !!lit[i];
        var isCursor = i === cursor;
        /* Tile plate */
        ctx.fillStyle = isLit ? "rgba(34, 211, 238, 0.10)" : "rgba(30, 41, 59, 0.55)";
        ctx.fillRect(gx + 2, gy + 2, geo.cell - 4, geo.cell - 4);
        if (isCursor) {
          ctx.strokeStyle = "rgba(0, 242, 255, 0.9)";
          ctx.lineWidth = 2;
          ctx.strokeRect(gx + 2, gy + 2, geo.cell - 4, geo.cell - 4);
        }
        /* Pipes */
        var conn = turnedConn(i);
        ctx.lineCap = "round";
        for (var pass = 0; pass < 2; pass += 1) {
          ctx.beginPath();
          for (var d = 0; d < 4; d += 1) {
            if (!conn[d]) {
              continue;
            }
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + NET_DX[d] * (geo.cell / 2), cy + NET_DY[d] * (geo.cell / 2));
          }
          if (pass === 0) {
            ctx.strokeStyle = isLit ? "rgba(0, 242, 255, 0.35)" : "rgba(100, 116, 139, 0.35)";
            ctx.lineWidth = Math.max(8, geo.cell * 0.34);
          } else {
            ctx.strokeStyle = isLit ? "#22d3ee" : "rgba(100, 116, 139, 0.8)";
            ctx.lineWidth = Math.max(3, geo.cell * 0.14);
            ctx.shadowColor = "#22d3ee";
            ctx.shadowBlur = isLit ? 10 : 0;
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        /* Source or bulb marker */
        if (i === 0) {
          ctx.beginPath();
          ctx.arc(cx, cy, geo.cell * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = "#ff6b35";
          ctx.shadowColor = "#ff6b35";
          ctx.shadowBlur = 12 + Math.sin(time / 240) * 5;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (terminals.indexOf(i) !== -1) {
          ctx.beginPath();
          ctx.arc(cx, cy, geo.cell * 0.16, 0, Math.PI * 2);
          if (isLit) {
            ctx.fillStyle = "#a3e635";
            ctx.shadowColor = "#a3e635";
            ctx.shadowBlur = 12 + Math.sin(time / 220 + x) * 4;
          } else {
            ctx.fillStyle = "rgba(100, 116, 139, 0.7)";
            ctx.shadowBlur = 0;
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      if (
        document.getElementById("gamePanelGlyphNet").hidden ||
        document.hidden
      ) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      if (clockRunning) {
        renderHud();
      }
      draw();
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    function tileFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var px = (event.clientX - rect.left) * scaleX;
      var py = (event.clientY - rect.top) * scaleY;
      var geo = geometry();
      var x = Math.floor((px - geo.x0) / geo.cell);
      var y = Math.floor((py - geo.y0) / geo.cell);
      if (x < 0 || y < 0 || x >= size || y >= size) {
        return -1;
      }
      return y * size + x;
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var tile = tileFromEvent(event);
      if (tile !== -1) {
        cursor = tile;
        rotateTile(tile);
      }
    });

    canvas.addEventListener("keydown", function (event) {
      var move2 = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -size, ArrowDown: size }[event.key];
      if (move2 !== undefined) {
        event.preventDefault();
        var x = cursor % size;
        var y = Math.floor(cursor / size);
        if (event.key === "ArrowLeft") {
          x = Math.max(0, x - 1);
        } else if (event.key === "ArrowRight") {
          x = Math.min(size - 1, x + 1);
        } else if (event.key === "ArrowUp") {
          y = Math.max(0, y - 1);
        } else {
          y = Math.min(size - 1, y + 1);
        }
        cursor = y * size + x;
        draw();
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        rotateTile(cursor);
      }
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(netLevels[index]);
      }
    });

    startBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    App.quietResetGlyphNet = function () {
      clockRunning = false;
      resultEl.textContent = t("netPaused");
    };

    loadLevel(netLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initGlyphNetGame = initGlyphNetGame;
})(window.CapitalConvert = window.CapitalConvert || {});
