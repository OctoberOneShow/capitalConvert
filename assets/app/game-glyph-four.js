/* Glyph Four - The column-drop duel campaign in the shared game drawer.
 * Drop generation, win detection and the minimax ranks are pure and
 * exported; the checks replay full AI-vs-AI games so no rank ever drops
 * into a full column or misses a legal reply. */
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
  var c4Size = 320;
  var C4_W = 7;
  var C4_H = 6;
  var C4_EMPTY = 0;
  var C4_PLAYER = 1;
  var C4_AI = 2;
  /* Ranks: depth of alpha-beta search plus noise. Star thresholds are
   * your disc counts on the board when you win - sharper wins shine. */
  var c4Levels = [
    { id: "f1", labelKey: "c4L1", depth: 0, noise: 0.55, starMoves: [8, 10, 13] },
    { id: "f2", labelKey: "c4L2", depth: 1, noise: 0.3, starMoves: [8, 10, 13] },
    { id: "f3", labelKey: "c4L3", depth: 2, noise: 0.15, starMoves: [8, 10, 12] },
    { id: "f4", labelKey: "c4L4", depth: 3, noise: 0.05, starMoves: [7, 9, 12] },
    { id: "f5", labelKey: "c4L5", depth: 4, noise: 0, starMoves: [7, 9, 11] },
    { id: "f6", labelKey: "c4L6", depth: 5, noise: 0, starMoves: [6, 8, 11] },
    { id: "f7", labelKey: "c4L7", depth: 6, noise: 0, starMoves: [6, 8, 10] },
    { id: "f8", labelKey: "c4L8", depth: 7, noise: 0, starMoves: [6, 8, 10] },
  ];

  /* Pure rules, exported for the static checks. */
  function c4DropRow(board, col) {
    for (var row = C4_H - 1; row >= 0; row -= 1) {
      if (board[row * C4_W + col] === C4_EMPTY) {
        return row;
      }
    }
    return -1;
  }

  function c4WinLine(board, player) {
    var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (var y = 0; y < C4_H; y += 1) {
      for (var x = 0; x < C4_W; x += 1) {
        for (var d = 0; d < dirs.length; d += 1) {
          var line = [];
          for (var k = 0; k < 4; k += 1) {
            var nx = x + dirs[d][0] * k;
            var ny = y + dirs[d][1] * k;
            if (nx < 0 || ny < 0 || nx >= C4_W || ny >= C4_H) {
              line = null;
              break;
            }
            var index = ny * C4_W + nx;
            if (board[index] !== player) {
              line = null;
              break;
            }
            line.push(index);
          }
          if (line && line.length === 4) {
            return line;
          }
        }
      }
    }
    return null;
  }

  function c4Full(board) {
    for (var c = 0; c < C4_W; c += 1) {
      if (board[c] === C4_EMPTY) {
        return false;
      }
    }
    return true;
  }

  function c4Evaluate(board) {
    function windowScore(a, b, c, d) {
      var ai = 0;
      var human = 0;
      var cells = [a, b, c, d];
      for (var i = 0; i < 4; i += 1) {
        if (cells[i] === C4_AI) {
          ai += 1;
        } else if (cells[i] === C4_PLAYER) {
          human += 1;
        }
      }
      if (ai && human) {
        return 0;
      }
      if (ai === 4) {
        return 100000;
      }
      if (human === 4) {
        return -100000;
      }
      if (ai === 3) {
        return 60;
      }
      if (human === 3) {
        return -80;
      }
      if (ai === 2) {
        return 8;
      }
      if (human === 2) {
        return -10;
      }
      return 0;
    }
    var score = 0;
    for (var y = 0; y < C4_H; y += 1) {
      for (var x = 0; x < C4_W; x += 1) {
        if (x + 3 < C4_W) {
          score += windowScore(
            board[y * C4_W + x],
            board[y * C4_W + x + 1],
            board[y * C4_W + x + 2],
            board[y * C4_W + x + 3],
          );
        }
        if (y + 3 < C4_H) {
          score += windowScore(
            board[y * C4_W + x],
            board[(y + 1) * C4_W + x],
            board[(y + 2) * C4_W + x],
            board[(y + 3) * C4_W + x],
          );
        }
        if (x + 3 < C4_W && y + 3 < C4_H) {
          score += windowScore(
            board[y * C4_W + x],
            board[(y + 1) * C4_W + x + 1],
            board[(y + 2) * C4_W + x + 2],
            board[(y + 3) * C4_W + x + 3],
          );
        }
        if (x + 3 < C4_W && y - 3 >= 0) {
          score += windowScore(
            board[y * C4_W + x],
            board[(y - 1) * C4_W + x + 1],
            board[(y - 2) * C4_W + x + 2],
            board[(y - 3) * C4_W + x + 3],
          );
        }
      }
    }
    /* Slight centre preference. */
    for (var r = 0; r < C4_H; r += 1) {
      for (var cc = 0; cc < C4_W; cc += 1) {
        if (board[r * C4_W + cc] === C4_AI) {
          score += 3 - Math.abs(3 - cc);
        } else if (board[r * C4_W + cc] === C4_PLAYER) {
          score -= 3 - Math.abs(3 - cc);
        }
      }
    }
    return score;
  }

  function c4Pick(board, rank) {
    var order = [3, 2, 4, 1, 5, 0, 6];
    var columns = order.filter(function (col) {
      return c4DropRow(board, col) !== -1;
    });
    if (!columns.length) {
      return -1;
    }
    if (rank.depth === 0) {
      /* Greedy: win now, block now, otherwise a noisy centre bias. */
      for (var p = 0; p < columns.length; p += 1) {
        var col = columns[p];
        var row = c4DropRow(board, col);
        board[row * C4_W + col] = C4_AI;
        var winning = c4WinLine(board, C4_AI);
        board[row * C4_W + col] = C4_EMPTY;
        if (winning) {
          return col;
        }
      }
      for (var q = 0; q < columns.length; q += 1) {
        var col2 = columns[q];
        var row2 = c4DropRow(board, col2);
        board[row2 * C4_W + col2] = C4_PLAYER;
        var threat = c4WinLine(board, C4_PLAYER);
        board[row2 * C4_W + col2] = C4_EMPTY;
        if (threat) {
          return col2;
        }
      }
      if (rank.noise && Math.random() < rank.noise) {
        return columns[Math.floor(Math.random() * columns.length)];
      }
      return columns[0];
    }
    function search(state, depth, alpha, beta, maximising) {
      if (c4WinLine(state, C4_AI)) {
        return 100000 - (rank.depth - depth) * 100;
      }
      if (c4WinLine(state, C4_PLAYER)) {
        return -100000 + (rank.depth - depth) * 100;
      }
      if (c4Full(state) || depth === 0) {
        return c4Evaluate(state);
      }
      var cols = order.filter(function (col) {
        return c4DropRow(state, col) !== -1;
      });
      if (maximising) {
        var best = -Infinity;
        for (var i = 0; i < cols.length; i += 1) {
          var row3 = c4DropRow(state, cols[i]);
          state[row3 * C4_W + cols[i]] = C4_AI;
          var v = search(state, depth - 1, alpha, beta, false);
          state[row3 * C4_W + cols[i]] = C4_EMPTY;
          if (v > best) {
            best = v;
          }
          if (best > alpha) {
            alpha = best;
          }
          if (alpha >= beta) {
            break;
          }
        }
        return best;
      }
      var worst = Infinity;
      for (var j = 0; j < cols.length; j += 1) {
        var row4 = c4DropRow(state, cols[j]);
        state[row4 * C4_W + cols[j]] = C4_PLAYER;
        var v2 = search(state, depth - 1, alpha, beta, true);
        state[row4 * C4_W + cols[j]] = C4_EMPTY;
        if (v2 < worst) {
          worst = v2;
        }
        if (worst < beta) {
          beta = worst;
        }
        if (alpha >= beta) {
          break;
        }
      }
      return worst;
    }
    var bestCol = columns[0];
    var bestValue = -Infinity;
    var ranked = [];
    for (var k = 0; k < columns.length; k += 1) {
      var col3 = columns[k];
      var row5 = c4DropRow(board, col3);
      board[row5 * C4_W + col3] = C4_AI;
      var value = search(board, rank.depth - 1, -Infinity, Infinity, false);
      board[row5 * C4_W + col3] = C4_EMPTY;
      ranked.push({ col: col3, value: value });
      if (value > bestValue) {
        bestValue = value;
        bestCol = col3;
      }
    }
    if (rank.noise && ranked.length > 1 && Math.random() < rank.noise) {
      var pickFrom = 1 + Math.floor(Math.random() * Math.min(2, ranked.length - 1));
      return ranked[pickFrom].col;
    }
    return bestCol;
  }
  App.glyphFourDropRow = c4DropRow;
  App.glyphFourWinLine = c4WinLine;
  App.glyphFourPick = c4Pick;
  App.glyphFourFull = c4Full;

  function initGlyphFourGame() {
    var canvas = getElement("c4Canvas");
    var youEl = getElement("c4You");
    var aiEl = getElement("c4Ai");
    var movesEl = getElement("c4Moves");
    var resultEl = getElement("c4Result");
    var startBtn = getElement("c4NewBtn");
    var bestEl = getElement("c4Best");
    var selectEl = getElement("c4LevelSel");
    if (
      !canvas ||
      !youEl ||
      !aiEl ||
      !movesEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "glyph-four-campaign", levels: c4Levels });
    var level = c4Levels[0];
    var board = [];
    var falling = null;
    var cleared = false;
    var busy = false;
    var aiTimer = null;
    var winLine = null;
    var hoverCol = -1;
    var playerMoves = 0;
    var rafId = null;
    var startedAt = 0;
    var clockRunning = false;

    function newBoard() {
      board = [];
      for (var i = 0; i < C4_W * C4_H; i += 1) {
        board.push(C4_EMPTY);
      }
      winLine = null;
      falling = null;
      playerMoves = 0;
    }

    function renderHud() {
      var you = 0;
      var ai = 0;
      for (var i = 0; i < board.length; i += 1) {
        if (board[i] === C4_PLAYER) {
          you += 1;
        } else if (board[i] === C4_AI) {
          ai += 1;
        }
      }
      youEl.textContent = String(you);
      aiEl.textContent = String(ai);
      movesEl.textContent = String(playerMoves);
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
      window.clearTimeout(aiTimer);
      aiTimer = null;
      level = levelDef;
      newBoard();
      cleared = false;
      busy = false;
      clockRunning = false;
      startedAt = Date.now();
      renderHud();
      refreshPicker();
      startLoop();
      draw();
      resultEl.textContent = t("c4Ready");
    }

    function finish() {
      cleared = true;
      clockRunning = false;
      winLine = c4WinLine(board, C4_PLAYER);
      if (winLine) {
        var you = 0;
        for (var i = 0; i < board.length; i += 1) {
          if (board[i] === C4_PLAYER) {
            you += 1;
          }
        }
        var starsWon = starsFor(you, level.starMoves, "low");
        if (starsWon <= 0) {
          starsWon = 1;
        }
        var outcome = campaign.record(level.id, {
          stars: starsWon,
          best: you,
          better: "low",
        });
        var message = t("c4Win", { n: you, stars: starsWon });
        if (outcome.isBest) {
          message += " " + t("newBest");
        }
        if (outcome.unlockedNext) {
          message += " " + t("c4NextBoard");
        } else if (campaign.clearedCount() === c4Levels.length) {
          message += " " + t("c4CampaignDone");
        }
        logAction(t("logGlyphFour", { n: you }));
        var rect = startBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        petNotifyGame(outcome.isBest || outcome.firstClear);
        var nextId = outcome.unlockedNext || level.id;
        loadLevel(c4Levels[campaign.indexOf(nextId)]);
        resultEl.textContent = message;
      } else if (c4Full(board)) {
        resultEl.textContent = t("c4Draw") + " " + t("c4Retry");
      } else {
        resultEl.textContent = t("c4Loss") + " " + t("c4Retry");
      }
    }

    function aiMove() {
      if (cleared) {
        return;
      }
      var col = c4Pick(board, level);
      if (col === -1) {
        finish();
        return;
      }
      var row = c4DropRow(board, col);
      falling = { col: col, row: row, y: -1, player: C4_AI };
      busy = true;
    }

    function playerMove(col) {
      if (cleared || busy || falling) {
        return;
      }
      var row = c4DropRow(board, col);
      if (row === -1) {
        return;
      }
      if (!clockRunning) {
        clockRunning = true;
        startedAt = Date.now();
      }
      playerMoves += 1;
      falling = { col: col, row: row, y: -1, player: C4_PLAYER };
      busy = true;
    }

    function update() {
      if (falling) {
        falling.y += 0.3;
        if (falling.y >= falling.row) {
          var playerJustMoved = falling.player === C4_PLAYER;
          board[falling.row * C4_W + falling.col] = falling.player;
          falling = null;
          busy = false;
          renderHud();
          if (c4WinLine(board, C4_PLAYER) || c4WinLine(board, C4_AI)) {
            finish();
            return;
          }
          if (c4Full(board)) {
            finish();
            return;
          }
          if (playerJustMoved && !cleared) {
            busy = true;
            aiTimer = window.setTimeout(function () {
              aiTimer = null;
              busy = false;
              if (cleared) {
                return;
              }
              aiMove();
            }, 380);
          }
        }
      }
    }

    function geometry() {
      var cell = Math.floor((c4Size - 12) / C4_W);
      return {
        cell: cell,
        x0: Math.floor((c4Size - cell * C4_W) / 2),
        y0: Math.floor((c4Size - cell * C4_H) / 2),
      };
    }

    function draw() {
      var time = Date.now();
      var geo = geometry();
      ctx.clearRect(0, 0, c4Size, c4Size);
      for (var y = 0; y < C4_H; y += 1) {
        for (var x = 0; x < C4_W; x += 1) {
          var gx = geo.x0 + x * geo.cell;
          var gy = geo.y0 + y * geo.cell;
          ctx.fillStyle = "rgba(30, 41, 59, 0.55)";
          ctx.fillRect(gx + 1, gy + 1, geo.cell - 2, geo.cell - 2);
        }
      }
      if (hoverCol !== -1 && !cleared && !busy) {
        ctx.fillStyle = "rgba(0, 242, 255, 0.12)";
        ctx.fillRect(
          geo.x0 + hoverCol * geo.cell,
          geo.y0,
          geo.cell,
          geo.cell * C4_H,
        );
      }
      for (var i = 0; i < board.length; i += 1) {
        if (!board[i]) {
          continue;
        }
        var cx = geo.x0 + (i % C4_W) * geo.cell + geo.cell / 2;
        var cy = geo.y0 + Math.floor(i / C4_W) * geo.cell + geo.cell / 2;
        drawDisc(cx, cy, board[i], 1);
      }
      if (falling) {
        var fx = geo.x0 + falling.col * geo.cell + geo.cell / 2;
        var fy = geo.y0 + falling.y * geo.cell + geo.cell / 2;
        drawDisc(fx, fy, falling.player, 1);
      }
      if (winLine) {
        var geo2 = geometry();
        ctx.strokeStyle = "rgba(163, 230, 53, " + (0.6 + 0.3 * Math.sin(time / 200)) + ")";
        ctx.lineWidth = 4;
        ctx.beginPath();
        var first = winLine[0];
        var last = winLine[winLine.length - 1];
        ctx.moveTo(
          geo2.x0 + (first % C4_W) * geo2.cell + geo2.cell / 2,
          geo2.y0 + Math.floor(first / C4_W) * geo2.cell + geo2.cell / 2,
        );
        ctx.lineTo(
          geo2.x0 + (last % C4_W) * geo2.cell + geo2.cell / 2,
          geo2.y0 + Math.floor(last / C4_W) * geo2.cell + geo2.cell / 2,
        );
        ctx.stroke();
      }
    }

    function drawDisc(cx, cy, player, alpha) {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, Math.PI * 2);
      ctx.fillStyle = player === C4_PLAYER ? "#22d3ee" : "#ff6b35";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 9;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      if (
        document.getElementById("gamePanelGlyphFour").hidden ||
        document.hidden
      ) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      update();
      draw();
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    canvas.addEventListener("pointermove", function (event) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var px = (event.clientX - rect.left) * scaleX;
      var geo = geometry();
      hoverCol = Math.floor((px - geo.x0) / geo.cell);
      if (hoverCol < 0 || hoverCol >= C4_W) {
        hoverCol = -1;
      }
    });

    canvas.addEventListener("pointerleave", function () {
      hoverCol = -1;
    });

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var px = (event.clientX - rect.left) * scaleX;
      var geo = geometry();
      var col = Math.floor((px - geo.x0) / geo.cell);
      if (col >= 0 && col < C4_W) {
        playerMove(col);
      }
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(c4Levels[index]);
      }
    });

    startBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    App.quietResetGlyphFour = function () {
      clockRunning = false;
      resultEl.textContent = t("c4Paused");
    };

    loadLevel(c4Levels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initGlyphFourGame = initGlyphFourGame;
})(window.CapitalConvert = window.CapitalConvert || {});
