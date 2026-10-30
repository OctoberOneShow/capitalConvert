/* Glyph Sudoku - The mini-sudoku campaign in the shared game drawer.
 * Puzzles are carved from a generated solution while the answer stays
 * unique, so every board is solvable by logic alone; the checks verify
 * validity and uniqueness headless. */
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
  var sudSize = 320;
  /* Sizes: 4x4 (2x2 boxes), 6x6 (2x3 boxes), 9x9 (3x3 boxes), 10x10
   * (2x5 or 5x2 boxes), 12x12 (3x4 boxes). A rung may also carry a seed,
   * which pins the deal to one carved grid. `clues` is the target number of
   * givens; carving stops as soon as the answer would no longer be unique.
   * Star times are [3-star, 2-star, 1-star] seconds. */
  var sudLevels = [
    { id: "u1", labelKey: "sudL1", size: 4, bw: 2, bh: 2, clues: 8, starTimes: [20, 40, 70] },
    { id: "u2", labelKey: "sudL2", size: 4, bw: 2, bh: 2, clues: 6, starTimes: [25, 45, 80] },
    { id: "u3", labelKey: "sudL3", size: 6, bw: 2, bh: 3, clues: 14, starTimes: [50, 90, 150] },
    { id: "u4", labelKey: "sudL4", size: 6, bw: 2, bh: 3, clues: 12, starTimes: [60, 105, 170] },
    { id: "u5", labelKey: "sudL5", size: 9, bw: 3, bh: 3, clues: 34, starTimes: [180, 300, 480] },
    { id: "u6", labelKey: "sudL6", size: 9, bw: 3, bh: 3, clues: 30, starTimes: [210, 340, 540] },
    { id: "u7", labelKey: "sudL7", size: 9, bw: 3, bh: 3, clues: 26, starTimes: [240, 380, 600] },
    { id: "u8", labelKey: "sudL8", size: 9, bw: 3, bh: 3, clues: 24, starTimes: [270, 420, 660] },
    { id: "u9", labelKey: "lvlNum9", size: 9, bw: 3, bh: 3, clues: 22, starTimes: [324, 504, 792] },
    { id: "u10", labelKey: "lvlNum10", size: 9, bw: 3, bh: 3, clues: 21, starTimes: [389, 605, 950] },
    { id: "u11", labelKey: "lvlNum11", size: 9, bw: 3, bh: 3, clues: 21, starTimes: [467, 726, 1140] },
    /* Grids 12-20. The engine carves a board down to `clues` givens and stops
     * the moment another removal would leave two answers, so every board here
     * still has exactly one solution and can be finished by logic alone.
     * These nine are the first rungs to ask for fewer than 21 givens: the
     * ladder walks 21 -> 20 -> 19 -> 18 -> 17, and each step down is worth
     * noticeably more scanning, because a sparser grid has fewer immediate
     * singles to start from. The clock keeps its own 1.2x ramp so the extra
     * search never turns into a time trial. */
    { id: "u12", labelKey: "lvlNum12", size: 9, bw: 3, bh: 3, clues: 20, starTimes: [560, 871, 1368] },
    { id: "u13", labelKey: "lvlNum13", size: 9, bw: 3, bh: 3, clues: 20, starTimes: [672, 1045, 1642] },
    { id: "u14", labelKey: "lvlNum14", size: 9, bw: 3, bh: 3, clues: 19, starTimes: [807, 1254, 1970] },
    { id: "u15", labelKey: "lvlNum15", size: 9, bw: 3, bh: 3, clues: 19, starTimes: [968, 1505, 2364] },
    { id: "u16", labelKey: "lvlNum16", size: 9, bw: 3, bh: 3, clues: 18, starTimes: [1162, 1806, 2837] },
    { id: "u17", labelKey: "lvlNum17", size: 9, bw: 3, bh: 3, clues: 18, starTimes: [1394, 2167, 3404] },
    { id: "u18", labelKey: "lvlNum18", size: 9, bw: 3, bh: 3, clues: 18, starTimes: [1673, 2600, 4085] },
    { id: "u19", labelKey: "lvlNum19", size: 9, bw: 3, bh: 3, clues: 17, starTimes: [2008, 3120, 4902] },
    { id: "u20", labelKey: "lvlNum20", size: 9, bw: 3, bh: 3, clues: 17, starTimes: [2409, 3744, 5882] },
    /* Grids 21-24. The summit seals its boards: each rung carries a seed and
     * the generator drives its shuffles from that seed alone, so a rung deals
     * one proven grid on every visit, and the clues line can hold the carve to
     * an exact count instead of a hope - the classic sweep bottoms out
     * wherever it stalls (23-27 givens in practice, whatever the ask). So u21
     * holds the classic to 23, the floor of every random deal's spread, its
     * seed swept until the board needed about twice the branch work a random
     * deal measures. The vault then opens the first double-digit grid, 10x10
     * with boxes five tall at 31 givens; the cross lays the same room the
     * other way, boxes five wide, sealed deeper than the vault; and the hall
     * opens the 12x12, 144 cells and twelve glyphs at 52, the density paying
     * for the scale. The clock prices the size steps 1.5x and 1.7x, the
     * shipped ramp's own way of charging for a bigger room. */
    { id: "u21", labelKey: "lvlNum21", size: 9, bw: 3, bh: 3, clues: 23, seed: 216, starTimes: [2891, 4493, 7058] },
    { id: "u22", labelKey: "lvlNum22", size: 10, bw: 2, bh: 5, clues: 31, seed: 128, starTimes: [4337, 6740, 10593] },
    { id: "u23", labelKey: "lvlNum23", size: 10, bw: 5, bh: 2, clues: 31, seed: 5, starTimes: [5204, 8088, 12712] },
    { id: "u24", labelKey: "lvlNum24", size: 12, bw: 3, bh: 4, clues: 52, seed: 20, starTimes: [8847, 13747, 21609] },
    /* Grids 25-30, the deep hall. The vault opened the 12x12 with its boxes
     * three wide and four tall; these six turn that room every way it
     * turns - boxes four wide (the hall transposed, then dug two deeper),
     * boxes six tall, boxes six wide - and each shape is dug as deep as its
     * geometry allows: the six-wide boxes surrender nothing past fifty
     * givens, the floor every sweep of that shape bottoms out at. The
     * capstone returns to the hall's own geometry and digs it four past the
     * summit's depth. Every rung is sealed to a seed and deals the same
     * proven grid on every visit, and the clock keeps the shipped 1.2x
     * ramp, so the hardest room in the game is also the longest. */
    { id: "u25", labelKey: "lvlNum25", size: 12, bw: 4, bh: 3, clues: 50, seed: 2, starTimes: [10616, 16496, 25931] },
    { id: "u26", labelKey: "lvlNum26", size: 12, bw: 4, bh: 3, clues: 48, seed: 5, starTimes: [12739, 19795, 31117] },
    { id: "u27", labelKey: "lvlNum27", size: 12, bw: 2, bh: 6, clues: 50, seed: 5, starTimes: [15287, 23754, 37340] },
    { id: "u28", labelKey: "lvlNum28", size: 12, bw: 2, bh: 6, clues: 48, seed: 5, starTimes: [18344, 28505, 44808] },
    { id: "u29", labelKey: "lvlNum29", size: 12, bw: 6, bh: 2, clues: 50, seed: 57, starTimes: [22013, 34206, 53770] },
    { id: "u30", labelKey: "lvlNum30", size: 12, bw: 3, bh: 4, clues: 48, seed: 5, starTimes: [26416, 41047, 64524] },
  ];

  /* Pure generator + checker, exported for the static checks. */
  function sudValid(grid, size, bw, bh) {
    var want = [];
    for (var v = 1; v <= size; v += 1) {
      want.push(v);
    }
    function lineOk(values) {
      var seen = {};
      for (var i = 0; i < values.length; i += 1) {
        var v = values[i];
        if (v < 1 || v > size || seen[v]) {
          return false;
        }
        seen[v] = true;
      }
      return true;
    }
    for (var r = 0; r < size; r += 1) {
      if (!lineOk(grid[r])) {
        return false;
      }
    }
    for (var c = 0; c < size; c += 1) {
      var col = [];
      for (var r2 = 0; r2 < size; r2 += 1) {
        col.push(grid[r2][c]);
      }
      if (!lineOk(col)) {
        return false;
      }
    }
    for (var by = 0; by < size / bh; by += 1) {
      for (var bx = 0; bx < size / bw; bx += 1) {
        var box = [];
        for (var y = 0; y < bh; y += 1) {
          for (var x = 0; x < bw; x += 1) {
            box.push(grid[by * bh + y][bx * bw + x]);
          }
        }
        if (!lineOk(box)) {
          return false;
        }
      }
    }
    return true;
  }

  /* Count solutions up to `limit` with backtracking over the empties. */
  function sudCountSolutions(puzzle, size, bw, bh, limit) {
    var empties = [];
    for (var i = 0; i < size * size; i += 1) {
      if (!puzzle[i]) {
        empties.push(i);
      }
    }
    var count = 0;
    function cellOk(index, value) {
      var r = Math.floor(index / size);
      var c = index % size;
      for (var k = 0; k < size; k += 1) {
        if (puzzle[r * size + k] === value || puzzle[k * size + c] === value) {
          return false;
        }
      }
      var br = Math.floor(r / bh) * bh;
      var bc = Math.floor(c / bw) * bw;
      for (var y = 0; y < bh; y += 1) {
        for (var x = 0; x < bw; x += 1) {
          if (puzzle[(br + y) * size + bc + x] === value) {
            return false;
          }
        }
      }
      return true;
    }
    function dfs(depth) {
      if (count >= limit) {
        return;
      }
      if (depth === empties.length) {
        count += 1;
        return;
      }
      /* Pick the emptiest remaining cell for speed. */
      var best = -1;
      var bestOpts = null;
      for (var e = depth; e < empties.length; e += 1) {
        var opts = [];
        for (var v = 1; v <= size; v += 1) {
          if (cellOk(empties[e], v)) {
            opts.push(v);
          }
        }
        if (opts.length === 0) {
          return;
        }
        if (!bestOpts || opts.length < bestOpts.length) {
          best = e;
          bestOpts = opts;
          if (opts.length === 1) {
            break;
          }
        }
      }
      var swap = empties[depth];
      empties[depth] = empties[best];
      empties[best] = swap;
      var cellIndex = empties[depth];
      for (var v2 = 0; v2 < bestOpts.length; v2 += 1) {
        puzzle[cellIndex] = bestOpts[v2];
        dfs(depth + 1);
        puzzle[cellIndex] = 0;
        if (count >= limit) {
          break;
        }
      }
      var swapBack = empties[depth];
      empties[depth] = empties[best];
      empties[best] = swapBack;
    }
    dfs(0);
    return count;
  }

  /* Sealed rungs pass { seed: n }: the stream below is then driven by the
   * seed alone (the LCG the static checks seed Math.random with), so the
   * deal never reaches for Math.random and every visit carves the same
   * board. Without a seed the stream is Math.random itself and the deal
   * stays fresh, exactly as the shipped rungs behave. */
  function sudGenerate(size, bw, bh, clues, opts) {
    var rand = Math.random;
    if (opts && typeof opts.seed === "number") {
      var seedState = opts.seed >>> 0;
      rand = function () {
        seedState = (Math.imul(seedState, 1103515245) + 12345) >>> 0;
        return seedState / 4294967296;
      };
    }
    var total = size * size;
    for (var attempt = 0; attempt < 40; attempt += 1) {
      /* Build a full valid grid with randomized backtracking. */
      var grid = [];
      for (var i = 0; i < total; i += 1) {
        grid.push(0);
      }
      var values = [];
      for (var v = 1; v <= size; v += 1) {
        values.push(v);
      }
      function fillCell(index) {
        if (index === total) {
          return true;
        }
        var order = values.slice();
        for (var s = order.length - 1; s > 0; s -= 1) {
          var j = Math.floor(rand() * (s + 1));
          var tmp = order[s];
          order[s] = order[j];
          order[j] = tmp;
        }
        for (var v2 = 0; v2 < order.length; v2 += 1) {
          grid[index] = order[v2];
          /* validity of the partial grid: reuse the checker on rows/cols/box */
          var r = Math.floor(index / size);
          var c = index % size;
          var ok = true;
          for (var k = 0; k < size; k += 1) {
            if ((k !== c && grid[r * size + k] === grid[r * size + c]) ||
                (k !== r && grid[k * size + c] === grid[r * size + c])) {
              ok = false;
              break;
            }
          }
          if (ok) {
            var br = Math.floor(r / bh) * bh;
            var bc = Math.floor(c / bw) * bw;
            for (var y = 0; y < bh && ok; y += 1) {
              for (var x = 0; x < bw && ok; x += 1) {
                var ii = (br + y) * size + bc + x;
                if (ii !== index && grid[ii] === grid[index]) {
                  ok = false;
                }
              }
            }
          }
          if (ok && fillCell(index + 1)) {
            return true;
          }
          grid[index] = 0;
        }
        return false;
      }
      fillCell(0);
      var twoD = [];
      for (var rr = 0; rr < size; rr += 1) {
        twoD.push(grid.slice(rr * size, rr * size + size));
      }
      if (!sudValid(twoD, size, bw, bh)) {
        continue;
      }
      /* Carve cells away while the solution stays unique. */
      var puzzle = grid.slice();
      var positions = [];
      for (var p = 0; p < total; p += 1) {
        positions.push(p);
      }
      for (var sh = positions.length - 1; sh > 0; sh -= 1) {
        var sj = Math.floor(rand() * (sh + 1));
        var sp = positions[sh];
        positions[sh] = positions[sj];
        positions[sj] = sp;
      }
      var given = total;
      for (var pi = 0; pi < positions.length && given > clues; pi += 1) {
        var cell = positions[pi];
        var keep = puzzle[cell];
        puzzle[cell] = 0;
        if (sudCountSolutions(puzzle, size, bw, bh, 2) === 1) {
          given -= 1;
        } else {
          puzzle[cell] = keep;
        }
      }
      return { solution: grid, puzzle: puzzle, givens: given };
    }
    /* Fallback: the cyclic pattern, which stays valid for any box shape. */
    var fallback = [];
    for (var fr = 0; fr < size; fr += 1) {
      for (var fc = 0; fc < size; fc += 1) {
        fallback.push(
          (bw * (fr % bh) + Math.floor(fr / bh) + fc) % size + 1,
        );
      }
    }
    return { solution: fallback.slice(), puzzle: fallback.slice(), givens: total };
  }
  App.glyphSudokuGenerate = sudGenerate;
  App.glyphSudokuValid = sudValid;
  App.glyphSudokuCountSolutions = sudCountSolutions;

  function initGlyphSudokuGame() {
    var canvas = getElement("sudCanvas");
    var filledEl = getElement("sudFilled");
    var missesEl = getElement("sudMisses");
    var timeEl = getElement("sudTime");
    var resultEl = getElement("sudResult");
    var startBtn = getElement("sudNewBtn");
    var bestEl = getElement("sudBest");
    var selectEl = getElement("sudLevelSel");
    var padEl = getElement("sudPad");
    if (
      !canvas ||
      !filledEl ||
      !missesEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl ||
      !padEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "glyph-sudoku-campaign", levels: sudLevels });
    var level = sudLevels[0];
    var size = 4;
    var bw = 2;
    var bh = 2;
    var solution = [];
    var board = [];
    var given = [];
    var selected = -1;
    var misses = 0;
    var solved = false;
    var wrong = {};
    var rafId = null;
    var startedAt = 0;
    var clockRunning = false;

    function renderHud() {
      var filled = 0;
      for (var i = 0; i < board.length; i += 1) {
        if (board[i]) {
          filled += 1;
        }
      }
      filledEl.textContent = filled + "/" + board.length;
      missesEl.textContent = String(misses);
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

    function buildPad() {
      padEl.textContent = "";
      for (var v = 1; v <= size; v += 1) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "sud-num";
        button.textContent = String(v);
        (function (value) {
          button.addEventListener("click", function () {
            placeDigit(value);
          });
        })(v);
        padEl.appendChild(button);
      }
      var erase = document.createElement("button");
      erase.type = "button";
      erase.className = "sud-num sud-num-erase";
      erase.textContent = "\u232b";
      erase.addEventListener("click", function () {
        placeDigit(0);
      });
      padEl.appendChild(erase);
    }

    function conflictsAt(index) {
      var r = Math.floor(index / size);
      var c = index % size;
      var hits = {};
      for (var k = 0; k < size; k += 1) {
        if (k !== c && board[r * size + k] === board[index]) {
          hits[r * size + k] = true;
        }
        if (k !== r && board[k * size + c] === board[index]) {
          hits[k * size + c] = true;
        }
      }
      var br = Math.floor(r / bh) * bh;
      var bc = Math.floor(c / bw) * bw;
      for (var y = 0; y < bh; y += 1) {
        for (var x = 0; x < bw; x += 1) {
          var ii = (br + y) * size + bc + x;
          if (ii !== index && board[ii] === board[index]) {
            hits[ii] = true;
          }
        }
      }
      return hits;
    }

    function placeDigit(value) {
      if (solved || selected === -1 || given[selected]) {
        return;
      }
      if (!clockRunning) {
        clockRunning = true;
        startedAt = Date.now();
      }
      if (value === board[selected]) {
        board[selected] = 0;
        delete wrong[selected];
      } else if (value === 0) {
        board[selected] = 0;
        delete wrong[selected];
      } else {
        board[selected] = value;
        if (value !== solution[selected]) {
          misses += 1;
          wrong[selected] = true;
        } else {
          delete wrong[selected];
        }
      }
      renderHud();
      draw();
      checkCleared();
    }

    function checkCleared() {
      if (solved) {
        return;
      }
      for (var i = 0; i < board.length; i += 1) {
        /* Filling the grid is not solving it: placeDigit flags any digit
         * that disagrees with the solution. */
        if (!board[i] || wrong[i]) {
          return;
        }
      }
      solved = true;
      clockRunning = false;
      var seconds = Math.max(0.1, (Date.now() - startedAt) / 1000);
      var starsWon = starsFor(Math.round(seconds * 10) / 10, level.starTimes, "low");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: Math.round(seconds * 10) / 10,
        better: "low",
      });
      var message = t("sudCleared", { s: seconds.toFixed(1), stars: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("sudNextGrid");
      } else if (campaign.clearedCount() === sudLevels.length) {
        message += " " + t("sudCampaignDone");
      }
      logAction(t("logGlyphSudoku", { n: size * size }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(sudLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    function loadLevel(levelDef) {
      level = levelDef;
      size = level.size;
      bw = level.bw;
      bh = level.bh;
      var deal = sudGenerate(size, bw, bh, level.clues, { seed: level.seed });
      solution = deal.solution;
      board = deal.puzzle.slice();
      given = deal.puzzle.map(function (v) {
        return v !== 0;
      });
      selected = -1;
      misses = 0;
      solved = false;
      wrong = {};
      clockRunning = false;
      startedAt = Date.now();
      buildPad();
      renderHud();
      refreshPicker();
      startLoop();
      draw();
      resultEl.textContent = t("sudReady", { n: deal.givens });
    }

    function geometry() {
      var cell = Math.floor((sudSize - 12) / size);
      return {
        cell: cell,
        x0: Math.floor((sudSize - cell * size) / 2),
        y0: Math.floor((sudSize - cell * size) / 2),
      };
    }

    function draw() {
      var time = Date.now();
      var geo = geometry();
      var conflicts = {};
      for (var i = 0; i < board.length; i += 1) {
        if (board[i] && wrong[i]) {
          var hits = conflictsAt(i);
          Object.keys(hits).forEach(function (k) {
            conflicts[k] = true;
          });
          conflicts[i] = true;
        }
      }
      ctx.clearRect(0, 0, sudSize, sudSize);
      if (App.world) { App.world.backdrop(ctx, sudSize, sudSize, "archive"); }
      for (var r = 0; r < size; r += 1) {
        for (var c = 0; c < size; c += 1) {
          var index = r * size + c;
          var gx = geo.x0 + c * geo.cell;
          var gy = geo.y0 + r * geo.cell;
          ctx.fillStyle = "rgba(30, 41, 59, 0.55)";
          ctx.fillRect(gx + 1, gy + 1, geo.cell - 2, geo.cell - 2);
          if (selected === index) {
            ctx.fillStyle = "rgba(0, 242, 255, 0.16)";
            ctx.fillRect(gx + 1, gy + 1, geo.cell - 2, geo.cell - 2);
            ctx.strokeStyle = "rgba(0, 242, 255, 0.9)";
            ctx.lineWidth = 2;
            ctx.strokeRect(gx + 2, gy + 2, geo.cell - 4, geo.cell - 4);
          }
          if (conflicts[index]) {
            ctx.fillStyle = "rgba(251, 113, 133, 0.25)";
            ctx.fillRect(gx + 1, gy + 1, geo.cell - 2, geo.cell - 2);
          }
          if (board[index]) {
            var isGiven = given[index];
            var isWrong = wrong[index];
            ctx.fillStyle = isWrong
              ? "#fb7185"
              : isGiven
                ? "rgba(226, 232, 240, 0.95)"
                : "#22d3ee";
            if (!isGiven && !isWrong) {
              ctx.shadowColor = "#22d3ee";
              ctx.shadowBlur = 6;
            }
            ctx.font = "bold " + Math.floor(geo.cell * 0.52) + "px 'JetBrains Mono', monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(
              String(board[index]),
              gx + geo.cell / 2,
              gy + geo.cell / 2 + 1,
            );
            ctx.shadowBlur = 0;
          }
        }
      }
      /* Box and border lines */
      ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
      ctx.lineWidth = 1;
      for (var k = 0; k <= size; k += 1) {
        var thick = k % bw === 0;
        ctx.lineWidth = thick ? 2.5 : 1;
        ctx.beginPath();
        ctx.moveTo(geo.x0 + k * geo.cell, geo.y0);
        ctx.lineTo(geo.x0 + k * geo.cell, geo.y0 + size * geo.cell);
        ctx.stroke();
        var thickY = k % bh === 0;
        ctx.lineWidth = thickY ? 2.5 : 1;
        ctx.beginPath();
        ctx.moveTo(geo.x0, geo.y0 + k * geo.cell);
        ctx.lineTo(geo.x0 + size * geo.cell, geo.y0 + k * geo.cell);
        ctx.stroke();
      }
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      if (
        document.getElementById("gamePanelGlyphSudoku").hidden ||
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

    function cellFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var px = (event.clientX - rect.left) * scaleX;
      var py = (event.clientY - rect.top) * scaleY;
      var geo = geometry();
      var c = Math.floor((px - geo.x0) / geo.cell);
      var r = Math.floor((py - geo.y0) / geo.cell);
      if (c < 0 || r < 0 || c >= size || r >= size) {
        return -1;
      }
      return r * size + c;
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var cell = cellFromEvent(event);
      if (cell !== -1) {
        selected = cell;
        draw();
      }
    });

    canvas.addEventListener("keydown", function (event) {
      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault();
        placeDigit(parseInt(event.key, 10));
        return;
      }
      if (event.key === "Backspace" || event.key === "0") {
        event.preventDefault();
        placeDigit(0);
        return;
      }
      var move = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -size, ArrowDown: size };
      if (move[event.key] !== undefined) {
        event.preventDefault();
        selected = Math.max(0, Math.min(size * size - 1, (selected === -1 ? 0 : selected) + move[event.key]));
        draw();
      }
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(sudLevels[index]);
      }
    });

    startBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    App.quietResetGlyphSudoku = function () {
      clockRunning = false;
      resultEl.textContent = t("sudPaused");
    };

    loadLevel(sudLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initGlyphSudokuGame = initGlyphSudokuGame;
})(window.CapitalConvert = window.CapitalConvert || {});
