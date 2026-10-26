/* Glyph Blocks - The line-clearing stacker campaign in the shared game drawer. */
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
  var blkCols = 10;
  var blkRows = 18;
  var blkCell = 16;
  var blkMinMs = 170;
  var blkClearScore = [0, 100, 300, 500, 800];
  var blkGarbageTint = "#64748b";
  /* One colour per piece, pulled from the suite palette. */
  var blkColors = {
    I: "#22d3ee",
    O: "#fbbf24",
    T: "#c084fc",
    S: "#a3e635",
    Z: "#f472b6",
    J: "#60a5fa",
    L: "#fb923c",
    X: blkGarbageTint,
  };
  /* Each shape is its spawn matrix; rotation walks the matrix clockwise. */
  var blkShapes = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
  };
  /* Every floor asks for a line count out of a messier heap at a faster
   * pace. starTimes are [3-star, 2-star, 1-star] clear times in seconds. */
  var blkLevels = [
    { id: "f1", labelKey: "blkL1", goal: 5, garbage: 0, startMs: 800, starTimes: [30, 50, 75] },
    { id: "f2", labelKey: "blkL2", goal: 6, garbage: 2, startMs: 750, starTimes: [36, 58, 85] },
    { id: "f3", labelKey: "blkL3", goal: 7, garbage: 3, startMs: 700, starTimes: [42, 66, 95] },
    { id: "f4", labelKey: "blkL4", goal: 8, garbage: 4, startMs: 640, starTimes: [48, 75, 110] },
    { id: "f5", labelKey: "blkL5", goal: 9, garbage: 5, startMs: 580, starTimes: [55, 85, 125] },
    { id: "f6", labelKey: "blkL6", goal: 10, garbage: 6, startMs: 520, starTimes: [62, 95, 140] },
    { id: "f7", labelKey: "blkL7", goal: 12, garbage: 7, startMs: 460, starTimes: [72, 110, 160] },
    { id: "f8", labelKey: "blkL8", goal: 14, garbage: 8, startMs: 400, starTimes: [85, 130, 190] },
    { id: "f9", labelKey: "blkL9", goal: 16, garbage: 8, startMs: 380, starTimes: [90, 135, 195] },
    { id: "f10", labelKey: "blkL10", goal: 18, garbage: 9, startMs: 350, starTimes: [100, 150, 215] },
    { id: "f11", labelKey: "blkL11", goal: 20, garbage: 9, startMs: 330, starTimes: [110, 165, 235] },
    { id: "f12", labelKey: "blkL12", goal: 22, garbage: 10, startMs: 310, starTimes: [120, 180, 255] },
    { id: "f13", labelKey: "blkL13", goal: 24, garbage: 10, startMs: 290, starTimes: [130, 195, 275] },
    { id: "f14", labelKey: "blkL14", goal: 26, garbage: 11, startMs: 270, starTimes: [140, 210, 295] },
    { id: "f15", labelKey: "blkL15", goal: 28, garbage: 11, startMs: 250, starTimes: [150, 225, 315] },
    { id: "f16", labelKey: "blkL16", goal: 30, garbage: 12, startMs: 230, starTimes: [160, 240, 335] },
    /* Ranks 17-20: two twists the ladder has never shipped, both riding data
     * the well already reads. `pieces: "noI"` stops shipping I-beams, so no
     * four-row delete exists and every clear has to be assembled from the
     * L/T/S/Z families. `rise` pours one more rubble row from the floor
     * every time that many lines are cleared, so the heap the level starts
     * with is a floor that grows while you dig it - f18 and f20 open with a
     * thinner heap to pay for the rows the rise adds mid-run. f19 is the
     * raw-speed peak with the familiar bag; f20 combines both twists. */
    { id: "f17", labelKey: "blkL17", goal: 32, garbage: 12, startMs: 225, pieces: "noI", starTimes: [175, 260, 365] },
    { id: "f18", labelKey: "blkL18", goal: 34, garbage: 6, startMs: 215, rise: 7, starTimes: [205, 310, 430] },
    { id: "f19", labelKey: "blkL19", goal: 36, garbage: 12, startMs: 200, starTimes: [195, 295, 410] },
    { id: "f20", labelKey: "blkL20", goal: 38, garbage: 7, startMs: 205, pieces: "noI", rise: 8, starTimes: [205, 310, 430] },
  ];

  function rotateMatrix(matrix) {
    var size = matrix.length;
    var out = [];
    for (var x = 0; x < size; x += 1) {
      var row = [];
      for (var y = size - 1; y >= 0; y -= 1) {
        row.push(matrix[y][x]);
      }
      out.push(row);
    }
    return out;
  }

  /* The bag a level draws from: `pieces: "noI"` stops shipping I-beams, so
   * no four-row delete exists and every clear has to be assembled out of the
   * L/T/S/Z families. */
  function blkBagLetters(level) {
    return level && level.pieces === "noI"
      ? ["O", "T", "S", "Z", "J", "L"]
      : ["I", "O", "T", "S", "Z", "J", "L"];
  }

  /* A rubble row with one hole to dig for. */
  function blkGarbageRow(hole) {
    var line = [];
    for (var x = 0; x < blkCols; x += 1) {
      line.push(x === hole ? "" : "X");
    }
    return line;
  }

  /* Pure board rules, shared by the game loop below and the headless prover
   * in tools/verify-levels.js, so a rung proven winnable is winnable on the
   * same physics the player faces. */
  function blkCollides(grid, matrix, px, py) {
    for (var y = 0; y < matrix.length; y += 1) {
      for (var x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) {
          continue;
        }
        var gx = px + x;
        var gy = py + y;
        if (gx < 0 || gx >= blkCols || gy >= blkRows) {
          return true;
        }
        if (gy >= 0 && grid[gy][gx]) {
          return true;
        }
      }
    }
    return false;
  }

  function blkFullRows(grid) {
    var rows = [];
    for (var y = 0; y < blkRows; y += 1) {
      var full = true;
      for (var x = 0; x < blkCols; x += 1) {
        if (!grid[y][x]) {
          full = false;
          break;
        }
      }
      if (full) {
        rows.push(y);
      }
    }
    return rows;
  }

  /* One landing, resolved the way lockPiece resolves it: merge, clear, pour
   * any rise the cleared count has earned, retime. Returns the rows cleared.
   * Used by the headless prover; the live loop below keeps its own fx-rich
   * copy of the same rules. */
  function blkLand(grid, level, matrix, px, landed, tally, rng) {
    for (var y = 0; y < matrix.length; y += 1) {
      for (var x = 0; x < matrix[y].length; x += 1) {
        if (matrix[y][x] && landed + y >= 0) {
          grid[landed + y][px + x] = "#";
        }
      }
    }
    var rows = blkFullRows(grid);
    rows.forEach(function (row) {
      grid.splice(row, 1);
      var fresh = [];
      for (var x = 0; x < blkCols; x += 1) {
        fresh.push("");
      }
      grid.unshift(fresh);
    });
    tally.cleared += rows.length;
    if (level.rise) {
      var due = Math.floor(tally.cleared / level.rise) - tally.risen;
      while (due > 0) {
        due -= 1;
        tally.risen += 1;
        grid.shift();
        grid.push(blkGarbageRow(Math.floor(rng() * blkCols)));
      }
    }
    return rows.length;
  }

  /* The piece after `turns` quarter-turns from its spawn matrix, applied the
   * way rotate() applies them: one step at a time with the same kick table,
   * at the spawn row. A turn that cannot land is skipped, exactly as a
   * failed rotate is ignored in play. */
  function blkOrient(shape, turns, grid) {
    var matrix = [];
    for (var y = 0; y < shape.length; y += 1) {
      matrix.push(shape[y].slice());
    }
    var px = Math.floor((blkCols - matrix.length) / 2);
    var kicks = [0, -1, 1, -2, 2];
    for (var turn = 0; turn < turns; turn += 1) {
      var turned = rotateMatrix(matrix);
      for (var k = 0; k < kicks.length; k += 1) {
        if (!blkCollides(grid, turned, px + kicks[k], 0)) {
          matrix = turned;
          px += kicks[k];
          break;
        }
      }
    }
    return { matrix: matrix, px: px };
  }

  /* Every spot the piece can come to rest, given the engine's real movement:
   * between ticks the player may slide the piece along its row, turn it with
   * the same kick table rotate() uses, or let it fall one row - so the state
   * space is (orientation, column, row) and breadth-first from the spawn
   * collects every state that cannot descend. Used by the headless prover;
   * the live loop plays the same affordances one input at a time. */
  function blkReachable(grid, shape) {
    var start = blkOrient(shape, 0, grid);
    if (blkCollides(grid, start.matrix, start.px, 0)) {
      return [];
    }
    var seen = {};
    var landings = [];
    function visit(matrix, x, y) {
      var key = matrix.map(function (row) {
        return row.join("");
      }).join("/") + "@" + x + "," + y;
      if (seen[key]) {
        return;
      }
      seen[key] = true;
      if (blkCollides(grid, matrix, x, y + 1)) {
        landings.push({
          x: x,
          y: y,
          matrix: matrix,
          key: key,
        });
      }
      var steps = [[1, 0], [-1, 0], [0, 1]];
      for (var m = 0; m < steps.length; m += 1) {
        var nx = x + steps[m][0];
        var ny = y + steps[m][1];
        if (nx < 0 || nx + matrix[0].length > blkCols || ny >= blkRows) {
          continue;
        }
        if (blkCollides(grid, matrix, nx, ny)) {
          continue;
        }
        visit(matrix, nx, ny);
      }
      var turned = rotateMatrix(matrix);
      var kicks = [0, -1, 1, -2, 2];
      for (var k = 0; k < kicks.length; k += 1) {
        if (!blkCollides(grid, turned, x + kicks[k], y)) {
          visit(turned, x + kicks[k], y);
          break;
        }
      }
    }
    visit(start.matrix, start.px, 0);
    return landings;
  }

  /* The headless run: seed the rubble, draw from the level's bag, commit a
   * policy move per piece, and keep the engine's own clock - every piece
   * spends one interval per row it falls through, retimed after each clear
   * exactly as speedForLines retimes it. `ms` is therefore the engine math
   * for a player who plays at gravity pace and never wastes a beat. */
  function blkSimulate(level, policy, rng) {
    var grid = [];
    for (var y = 0; y < blkRows; y += 1) {
      var row = [];
      for (var x = 0; x < blkCols; x += 1) {
        row.push("");
      }
      grid.push(row);
    }
    for (var g = 0; g < level.garbage; g += 1) {
      grid[blkRows - 1 - g] = blkGarbageRow(Math.floor(rng() * blkCols));
    }
    var letters = blkBagLetters(level).slice();
    var bag = [];
    var tally = { cleared: 0, risen: 0, pieces: 0, ms: 0, topout: false };
    function drawLetter() {
      if (bag.length < 2) {
        for (var i = letters.length - 1; i > 0; i -= 1) {
          var j = Math.floor(rng() * (i + 1));
          var swap = letters[i];
          letters[i] = letters[j];
          letters[j] = swap;
        }
        bag = bag.concat(letters);
      }
      return bag.shift();
    }
    var tickMs = level.startMs;
    var nextLetter = drawLetter();
    var guard = 0;
    while (!tally.topout && tally.cleared < level.goal && guard < 5000) {
      guard += 1;
      var letter = nextLetter;
      nextLetter = drawLetter();
      tally.pieces += 1;
      var spots = blkReachable(grid, blkShapes[letter]);
      if (!spots.length) {
        tally.topout = true;
        break;
      }
      var pick = policy(letter, nextLetter, grid, level, spots);
      var spot = spots[pick] || spots[0];
      tally.ms += spot.y * tickMs;
      blkLand(grid, level, spot.matrix, spot.x, spot.y, tally, rng);
      tickMs = Math.max(blkMinMs, level.startMs - tally.cleared * 18);
    }
    tally.won = !tally.topout && tally.cleared >= level.goal;
    tally.seconds = Math.round((tally.ms / 1000) * 10) / 10;
    return tally;
  }

  function initGlyphBlocksGame() {
    var canvas = getElement("blkCanvas");
    var nextCanvas = getElement("blkNext");
    var scoreEl = getElement("blkScore");
    var linesEl = getElement("blkLines");
    var timeEl = getElement("blkTime");
    var resultEl = getElement("blkResult");
    var startBtn = getElement("blkStartBtn");
    var bestEl = getElement("blkBest");
    var selectEl = getElement("blkLevelSel");
    var leftBtn = getElement("blkLeft");
    var turnBtn = getElement("blkTurn");
    var rightBtn = getElement("blkRight");
    var dropBtn = getElement("blkDrop");
    if (
      !canvas ||
      !nextCanvas ||
      !scoreEl ||
      !linesEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl ||
      !leftBtn ||
      !turnBtn ||
      !rightBtn ||
      !dropBtn
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var nextCtx = nextCanvas.getContext("2d");
    var campaign = createCampaign({ key: "glyph-blocks-campaign", levels: blkLevels });
    var level = blkLevels[0];
    var grid = [];
    var bag = [];
    var piece = null;
    var nextLetter = null;
    var score = 0;
    var clearedLines = 0;
    var risen = 0;
    var running = false;
    var intervalId = null;
    var tickMs = 800;
    var startedAt = 0;
    var particles = [];
    var fxFrame = null;

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
      linesEl.textContent = clearedLines + "/" + level.goal;
    }

    function emptyGrid() {
      var rows = [];
      for (var y = 0; y < blkRows; y += 1) {
        var row = [];
        for (var x = 0; x < blkCols; x += 1) {
          row.push("");
        }
        rows.push(row);
      }
      return rows;
    }

    function pourGarbage(count) {
      for (var row = 0; row < count; row += 1) {
        grid[blkRows - 1 - row] = blkGarbageRow(Math.floor(Math.random() * blkCols));
      }
    }

    /* The rubble floor grows while you dig: one fresh row climbs in from
     * the bottom for every `rise` lines cleared. The whole stack shifts up,
     * so the rise never crushes anything outright - the spawn row just gets
     * that much closer. */
    function riseGarbage(count) {
      for (var row = 0; row < count; row += 1) {
        grid.shift();
        grid.push(blkGarbageRow(Math.floor(Math.random() * blkCols)));
      }
    }

    function refillBag() {
      var letters = blkBagLetters(level);
      for (var i = letters.length - 1; i > 0; i -= 1) {
        var j = Math.floor(Math.random() * (i + 1));
        var swap = letters[i];
        letters[i] = letters[j];
        letters[j] = swap;
      }
      bag = bag.concat(letters);
    }

    function drawLetter() {
      if (bag.length < 2) {
        refillBag();
      }
      return bag.shift();
    }

    function collides(matrix, px, py) {
      return blkCollides(grid, matrix, px, py);
    }

    function spawnPiece(letter) {
      var shape = blkShapes[letter];
      var fresh = [];
      for (var y = 0; y < shape.length; y += 1) {
        fresh.push(shape[y].slice());
      }
      var spawned = {
        letter: letter,
        matrix: fresh,
        x: Math.floor((blkCols - fresh.length) / 2),
        y: 0,
      };
      if (collides(spawned.matrix, spawned.x, spawned.y)) {
        piece = spawned;
        gameOver();
        return null;
      }
      return spawned;
    }

    function ghostY() {
      var offset = 0;
      while (!collides(piece.matrix, piece.x, piece.y + offset + 1)) {
        offset += 1;
      }
      return piece.y + offset;
    }

    function stopLoop() {
      window.clearInterval(intervalId);
      intervalId = null;
    }

    function startLoop() {
      stopLoop();
      intervalId = window.setInterval(tick, tickMs);
    }

    function speedForLines(lines) {
      return Math.max(blkMinMs, level.startMs - lines * 18);
    }

    function mergePiece() {
      for (var y = 0; y < piece.matrix.length; y += 1) {
        for (var x = 0; x < piece.matrix[y].length; x += 1) {
          if (piece.matrix[y][x] && piece.y + y >= 0) {
            grid[piece.y + y][piece.x + x] = piece.letter;
          }
        }
      }
    }

    function fullRows() {
      return blkFullRows(grid);
    }

    function burstRow(row) {
      for (var x = 0; x < blkCols; x += 1) {
        particles.push({
          x: (x + 0.5) * blkCell,
          y: (row + 0.5) * blkCell,
          vx: (Math.random() - 0.5) * 90,
          vy: -40 - Math.random() * 80,
          life: 1,
          color: blkColors[grid[row][x]] || blkGarbageTint,
        });
      }
    }

    function playClearFx() {
      if (fxFrame !== null) {
        return;
      }
      var fxStart = Date.now();
      var step = function () {
        draw();
        var elapsed = Date.now() - fxStart;
        if (elapsed < 340 && particles.length) {
          fxFrame = window.requestAnimationFrame(step);
        } else {
          particles = [];
          fxFrame = null;
          draw();
        }
      };
      fxFrame = window.requestAnimationFrame(step);
    }

    function lockPiece() {
      mergePiece();
      var rows = fullRows();
      if (rows.length) {
        rows.forEach(burstRow);
        rows.forEach(function (row) {
          grid.splice(row, 1);
          var fresh = [];
          for (var x = 0; x < blkCols; x += 1) {
            fresh.push("");
          }
          grid.unshift(fresh);
        });
        score += blkClearScore[rows.length] * (campaign.indexOf(level.id) + 1);
        clearedLines += rows.length;
        renderHud();
        playClearFx();
        if (clearedLines >= level.goal) {
          levelCleared();
          return;
        }
        tickMs = speedForLines(clearedLines);
        if (running) {
          startLoop();
        }
        if (level.rise) {
          var due = Math.floor(clearedLines / level.rise) - risen;
          if (due > 0) {
            risen += due;
            riseGarbage(due);
          }
        }
      }
      piece = spawnPiece(nextLetter || drawLetter());
      if (piece) {
        nextLetter = drawLetter();
        drawNext();
      }
    }

    function move(dx) {
      if (!running || !piece) {
        return;
      }
      if (!collides(piece.matrix, piece.x + dx, piece.y)) {
        piece.x += dx;
        draw();
      }
    }

    function rotate() {
      if (!running || !piece) {
        return;
      }
      var turned = rotateMatrix(piece.matrix);
      var kicks = [0, -1, 1, -2, 2];
      for (var index = 0; index < kicks.length; index += 1) {
        if (!collides(turned, piece.x + kicks[index], piece.y)) {
          piece.matrix = turned;
          piece.x += kicks[index];
          draw();
          return;
        }
      }
    }

    function softDrop() {
      if (!running || !piece) {
        return;
      }
      if (!collides(piece.matrix, piece.x, piece.y + 1)) {
        piece.y += 1;
        score += 1;
        renderHud();
        draw();
        return;
      }
      lockPiece();
    }

    function hardDrop() {
      if (!running || !piece) {
        return;
      }
      var drop = ghostY() - piece.y;
      piece.y += drop;
      score += drop * 2;
      renderHud();
      lockPiece();
      draw();
    }

    function drawCell(gx, gy, letter, alpha) {
      ctx.globalAlpha = alpha || 1;
      ctx.fillStyle = blkColors[letter] || blkGarbageTint;
      ctx.fillRect(gx * blkCell + 1, gy * blkCell + 1, blkCell - 2, blkCell - 2);
      ctx.fillStyle = "rgba(255,255,255,.38)";
      ctx.fillRect(gx * blkCell + 3, gy * blkCell + 3, blkCell - 6, 3);
      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.fillRect(gx * blkCell + 2, gy * blkCell + blkCell - 5, blkCell - 4, 3);
      ctx.fillStyle = "rgba(255,255,255,.1)";
      ctx.fillRect(gx * blkCell + 5, gy * blkCell + 8, blkCell - 10, blkCell - 16);
      if (alpha === undefined) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
        ctx.strokeRect(gx * blkCell + 1.5, gy * blkCell + 1.5, blkCell - 3, blkCell - 3);
      }
      ctx.globalAlpha = 1;
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (App.world) { App.world.backdrop(ctx, canvas.width, canvas.height, "neon"); }
      for (var y = 0; y < blkRows; y += 1) {
        for (var x = 0; x < blkCols; x += 1) {
          if (grid[y][x]) {
            drawCell(x, y, grid[y][x], 0.82);
          }
        }
      }
      if (piece && running) {
        var ghost = ghostY();
        if (ghost > piece.y) {
          for (var py = 0; py < piece.matrix.length; py += 1) {
            for (var px = 0; px < piece.matrix[py].length; px += 1) {
              if (piece.matrix[py][px] && ghost + py >= 0) {
                ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
                ctx.strokeRect(
                  (piece.x + px) * blkCell + 2.5,
                  (ghost + py) * blkCell + 2.5,
                  blkCell - 5,
                  blkCell - 5,
                );
              }
            }
          }
        }
        for (var my = 0; my < piece.matrix.length; my += 1) {
          for (var mx = 0; mx < piece.matrix[my].length; mx += 1) {
            if (piece.matrix[my][mx] && piece.y + my >= 0) {
              drawCell(piece.x + mx, piece.y + my, piece.letter);
            }
          }
        }
      }
      var alive = [];
      for (var index = 0; index < particles.length; index += 1) {
        var spark = particles[index];
        spark.x += spark.vx * 0.05;
        spark.y += spark.vy * 0.05;
        spark.vy += 12;
        spark.life -= 0.06;
        if (spark.life > 0) {
          ctx.globalAlpha = Math.max(0, spark.life);
          ctx.fillStyle = spark.color;
          ctx.fillRect(spark.x - 2, spark.y - 2, 4, 4);
          alive.push(spark);
        }
      }
      ctx.globalAlpha = 1;
      particles = alive;
    }

    function drawNext() {
      nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
      if (!nextLetter) {
        return;
      }
      var shape = blkShapes[nextLetter];
      var cell = 16;
      var offsetX = (nextCanvas.width - shape.length * cell) / 2;
      var offsetY = (nextCanvas.height - shape.length * cell) / 2;
      nextCtx.fillStyle = blkColors[nextLetter];
      for (var y = 0; y < shape.length; y += 1) {
        for (var x = 0; x < shape[y].length; x += 1) {
          if (shape[y][x]) {
            nextCtx.fillRect(
              offsetX + x * cell + 1,
              offsetY + y * cell + 1,
              cell - 2,
              cell - 2,
            );
          }
        }
      }
    }

    function tick() {
      if (!running || !piece) {
        return;
      }
      timeEl.textContent = ((Date.now() - startedAt) / 1000).toFixed(1) + "s";
      if (collides(piece.matrix, piece.x, piece.y + 1)) {
        lockPiece();
      } else {
        piece.y += 1;
      }
      draw();
    }

    function loadLevel(levelDef) {
      stopLoop();
      running = false;
      if (fxFrame !== null) {
        window.cancelAnimationFrame(fxFrame);
        fxFrame = null;
        particles = [];
      }
      level = levelDef;
      grid = emptyGrid();
      pourGarbage(level.garbage);
      bag = [];
      nextLetter = drawLetter();
      piece = null;
      score = 0;
      clearedLines = 0;
      risen = 0;
      tickMs = level.startMs;
      timeEl.textContent = "0.0s";
      renderHud();
      refreshPicker();
      drawNext();
      draw();
      resultEl.textContent = t("blkGoal", {
        name: t(level.labelKey),
        n: level.goal,
      });
    }

    function startGame() {
      loadLevel(level);
      running = true;
      startedAt = Date.now();
      piece = spawnPiece(nextLetter);
      if (piece) {
        nextLetter = drawLetter();
      }
      drawNext();
      draw();
      resultEl.textContent = t("blkGo");
      startLoop();
      canvas.focus();
    }

    function gameOver() {
      stopLoop();
      running = false;
      draw();
      resultEl.textContent = t("blkOver", { n: clearedLines }) + " " + t("blkRetry");
    }

    function levelCleared() {
      stopLoop();
      running = false;
      var seconds = Math.max(0.1, (Date.now() - startedAt) / 1000);
      var starsWon = starsFor(Math.round(seconds * 10) / 10, level.starTimes, "low");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: Math.round(seconds * 10) / 10,
        better: "low",
      });
      var message = t("blkCleared", {
        name: t(level.labelKey),
        s: seconds.toFixed(1),
        stars: starsWon,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("blkNextFloor");
      } else if (campaign.clearedCount() === blkLevels.length) {
        message += " " + t("blkCampaignDone");
      }
      logAction(t("logBlk", { name: t(level.labelKey) }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(blkLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function steer(key) {
      if (key === "ArrowLeft") {
        move(-1);
      } else if (key === "ArrowRight") {
        move(1);
      } else if (key === "ArrowUp") {
        rotate();
      } else if (key === "ArrowDown") {
        softDrop();
      } else if (key === " " || key === "Spacebar") {
        hardDrop();
      }
    }

    canvas.addEventListener("keydown", function (event) {
      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === " "
      ) {
        event.preventDefault();
      }
      steer(event.key === " " ? " " : event.key);
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(blkLevels[index]);
      }
    });

    startBtn.addEventListener("click", startGame);
    leftBtn.addEventListener("click", function () {
      move(-1);
    });
    turnBtn.addEventListener("click", rotate);
    rightBtn.addEventListener("click", function () {
      move(1);
    });
    dropBtn.addEventListener("click", hardDrop);

    App.quietResetGlyphBlocks = function () {
      if (running) {
        stopLoop();
        running = false;
        resultEl.textContent = t("blkPaused");
      }
    };

    loadLevel(blkLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules and the headless checks. */
  App.initGlyphBlocksGame = initGlyphBlocksGame;
  App.blkLevels = blkLevels;
  App.blkSimulate = blkSimulate;
  App.blkShapes = blkShapes;
  App.blkCollides = blkCollides;
  App.blkReachable = blkReachable;
  App.blkRotate = rotateMatrix;
  App.blkRows = blkRows;
  App.blkCols = blkCols;
})(window.CapitalConvert = window.CapitalConvert || {});
