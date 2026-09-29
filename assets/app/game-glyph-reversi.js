/* Glyph Reversi - The disc-flipping duel campaign in the shared game drawer.
 * Move generation, flipping and the ranked AI are pure and exported; the
 * checks replay full AI-vs-AI games so no rank ever plays an illegal move. */
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
  var revSize = 320;
  var REV_N = 8;
  var REV_EMPTY = 0;
  var REV_PLAYER = 1;
  var REV_AI = 2;
  var REV_DIRS = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];
  /* Ranks: noise = chance the AI ignores its judgement for a lower pick;
   * depth 2+ searches opponent replies. Stars are margins
   * [3-star, 2-star, 1-star] on the final disc lead. */
  var revLevels = [
    { id: "r1", labelKey: "revL1", noise: 0.5, depth: 0, starMargin: [18, 10, 4] },
    { id: "r2", labelKey: "revL2", noise: 0.3, depth: 0, starMargin: [16, 9, 3] },
    { id: "r3", labelKey: "revL3", noise: 0.15, depth: 1, starMargin: [14, 8, 3] },
    { id: "r4", labelKey: "revL4", noise: 0.05, depth: 1, starMargin: [12, 6, 2] },
    { id: "r5", labelKey: "revL5", noise: 0, depth: 2, starMargin: [10, 5, 2] },
    { id: "r6", labelKey: "revL6", noise: 0, depth: 3, starMargin: [8, 4, 2] },
    { id: "r7", labelKey: "revL7", noise: 0, depth: 4, starMargin: [8, 4, 2] },
    { id: "r8", labelKey: "revL8", noise: 0, depth: 5, starMargin: [8, 4, 2] },
  ];
  var REV_WEIGHTS = [
    120, -20, 10, 5, 5, 10, -20, 120,
    -20, -40, -5, -5, -5, -5, -40, -20,
    10, -5, 3, 1, 1, 3, -5, 10,
    5, -5, 1, 1, 1, 1, -5, 5,
    5, -5, 1, 1, 1, 1, -5, 5,
    10, -5, 3, 1, 1, 3, -5, 10,
    -20, -40, -5, -5, -5, -5, -40, -20,
    120, -20, 10, 5, 5, 10, -20, 120,
  ];

  /* Pure rules, exported for the static checks. */
  function revFlipsFor(board, player, index) {
    if (board[index] !== REV_EMPTY) {
      return [];
    }
    var x = index % REV_N;
    var y = Math.floor(index / REV_N);
    var foe = player === REV_PLAYER ? REV_AI : REV_PLAYER;
    var all = [];
    for (var d = 0; d < REV_DIRS.length; d += 1) {
      var line = [];
      var cx = x + REV_DIRS[d][0];
      var cy = y + REV_DIRS[d][1];
      while (cx >= 0 && cy >= 0 && cx < REV_N && cy < REV_N) {
        var cell = board[cy * REV_N + cx];
        if (cell === foe) {
          line.push(cy * REV_N + cx);
        } else if (cell === player) {
          for (var f = 0; f < line.length; f += 1) {
            all.push(line[f]);
          }
          break;
        } else {
          break;
        }
        cx += REV_DIRS[d][0];
        cy += REV_DIRS[d][1];
      }
    }
    return all;
  }

  function revMoves(board, player) {
    var moves = [];
    for (var i = 0; i < board.length; i += 1) {
      if (board[i] === REV_EMPTY && revFlipsFor(board, player, i).length) {
        moves.push(i);
      }
    }
    return moves;
  }

  function revApply(board, player, index) {
    var flips = revFlipsFor(board, player, index);
    if (!flips.length) {
      return null;
    }
    var next = board.slice();
    next[index] = player;
    for (var f = 0; f < flips.length; f += 1) {
      next[flips[f]] = player;
    }
    return { board: next, flipped: [index].concat(flips) };
  }

  function revScore(board) {
    var player = 0;
    var ai = 0;
    for (var i = 0; i < board.length; i += 1) {
      if (board[i] === REV_PLAYER) {
        player += 1;
      } else if (board[i] === REV_AI) {
        ai += 1;
      }
    }
    return { player: player, ai: ai };
  }

  function revEvaluate(board) {
    var total = 0;
    for (var i = 0; i < board.length; i += 1) {
      if (board[i] === REV_AI) {
        total += REV_WEIGHTS[i];
      } else if (board[i] === REV_PLAYER) {
        total -= REV_WEIGHTS[i];
      }
    }
    return total;
  }

  function revPick(board, rank) {
    var moves = revMoves(board, REV_AI);
    if (!moves.length) {
      return -1;
    }
    function orderValue(state, moveIndex, depth) {
      var applied = revApply(state, REV_AI, moveIndex);
      var value = revEvaluate(applied.board);
      if (depth <= 0) {
        return value;
      }
      var replies = revMoves(applied.board, REV_PLAYER);
      if (!replies.length) {
        return value + 40;
      }
      var worst = Infinity;
      for (var r = 0; r < replies.length; r += 1) {
        var reply = revApply(applied.board, REV_PLAYER, replies[r]);
        var answers = revMoves(reply.board, REV_AI);
        var best = -Infinity;
        if (!answers.length) {
          best = revEvaluate(reply.board) + 60;
        } else {
          for (var a = 0; a < answers.length; a += 1) {
            var deeper = revEvaluate(revApply(reply.board, REV_AI, answers[a]).board);
            if (deeper > best) {
              best = deeper;
            }
          }
        }
        if (best < worst) {
          worst = best;
        }
      }
      return worst;
    }
    var depth = rank.depth;
    var ranked = moves.map(function (m) {
      return { index: m, value: orderValue(board, m, depth) };
    });
    ranked.sort(function (a, b) {
      return b.value - a.value;
    });
    if (rank.noise && ranked.length > 1 && Math.random() < rank.noise) {
      var pickFrom = 1 + Math.floor(Math.random() * Math.min(3, ranked.length - 1));
      return ranked[pickFrom].index;
    }
    return ranked[0].index;
  }
  App.glyphReversiMoves = revMoves;
  App.glyphReversiFlips = revFlipsFor;
  App.glyphReversiApply = revApply;
  App.glyphReversiPick = revPick;
  App.glyphReversiScore = revScore;

  function initGlyphReversiGame() {
    var canvas = getElement("revCanvas");
    var youEl = getElement("revYou");
    var aiEl = getElement("revAi");
    var timeEl = getElement("revTime");
    var resultEl = getElement("revResult");
    var startBtn = getElement("revNewBtn");
    var bestEl = getElement("revBest");
    var selectEl = getElement("revLevelSel");
    if (
      !canvas ||
      !youEl ||
      !aiEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var campaign = createCampaign({ key: "glyph-reversi-campaign", levels: revLevels });
    var level = revLevels[0];
    var board = [];
    var cleared = false;
    var busy = false;
    var ripple = [];
    var rafId = null;
    var startedAt = 0;
    var clockRunning = false;
    var passCount = 0;

    function newBoard() {
      board = [];
      for (var i = 0; i < REV_N * REV_N; i += 1) {
        board.push(REV_EMPTY);
      }
      board[27] = REV_AI;
      board[28] = REV_PLAYER;
      board[35] = REV_PLAYER;
      board[36] = REV_AI;
    }

    function renderHud() {
      var score = revScore(board);
      youEl.textContent = String(score.player);
      aiEl.textContent = String(score.ai);
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
      newBoard();
      cleared = false;
      busy = false;
      ripple = [];
      clockRunning = false;
      startedAt = Date.now();
      renderHud();
      refreshPicker();
      startLoop();
      draw();
      resultEl.textContent = t("revReady");
    }

    function finish() {
      cleared = true;
      clockRunning = false;
      var score = revScore(board);
      var margin = score.player - score.ai;
      var message;
      if (margin > 0) {
        var starsWon = starsFor(margin, level.starMargin, "high");
        if (starsWon <= 0) {
          starsWon = 1;
        }
        var outcome = campaign.record(level.id, {
          stars: starsWon,
          best: margin,
          better: "high",
        });
        message = t("revWin", { n: score.player, m: score.ai, stars: starsWon });
        if (outcome.isBest) {
          message += " " + t("newBest");
        }
        if (outcome.unlockedNext) {
          message += " " + t("revNextRank");
        } else if (campaign.clearedCount() === revLevels.length) {
          message += " " + t("revCampaignDone");
        }
        logAction(t("logGlyphReversi", { n: margin }));
        var rect = startBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        petNotifyGame(outcome.isBest || outcome.firstClear);
        var nextId = outcome.unlockedNext || level.id;
        loadLevel(revLevels[campaign.indexOf(nextId)]);
      } else if (margin === 0) {
        message = t("revDraw") + " " + t("revRetry");
      } else {
        message = t("revLoss", { n: score.player, m: score.ai }) + " " + t("revRetry");
      }
      resultEl.textContent = message;
    }

    function aiTurn() {
      if (cleared) {
        return;
      }
      var move = revPick(board, level);
      if (move === -1) {
        passCount += 1;
        if (passCount >= 2) {
          finish();
          return;
        }
        resultEl.textContent = t("revAiPassed");
        return;
      }
      var applied = revApply(board, REV_AI, move);
      board = applied.board;
      applied.flipped.forEach(function (index) {
        ripple.push({ i: index, life: 1, color: "#ff6b35" });
      });
      passCount = 0;
      renderHud();
      draw();
    }

    function playTurn() {
      if (revMoves(board, REV_PLAYER).length) {
        return;
      }
      /* Player must pass; hand the turn to the AI. */
      passCount += 1;
      if (passCount >= 2) {
        finish();
        return;
      }
      resultEl.textContent = t("revYouPassed");
      aiTurn();
    }

    function playerMove(index) {
      if (cleared || busy) {
        return;
      }
      var applied = revApply(board, REV_PLAYER, index);
      if (!applied) {
        return;
      }
      if (!clockRunning) {
        clockRunning = true;
        startedAt = Date.now();
      }
      board = applied.board;
      applied.flipped.forEach(function (cell) {
        ripple.push({ i: cell, life: 1, color: "#22d3ee" });
      });
      passCount = 0;
      renderHud();
      draw();
      if (revScore(board).player + revScore(board).ai === REV_N * REV_N) {
        finish();
        return;
      }
      busy = true;
      window.setTimeout(function () {
        busy = false;
        if (cleared) {
          return;
        }
        aiTurn();
        if (revScore(board).player + revScore(board).ai === REV_N * REV_N) {
          finish();
          return;
        }
        playTurn();
      }, 420);
    }

    function geometry() {
      var cell = Math.floor((revSize - 12) / REV_N);
      return {
        cell: cell,
        x0: Math.floor((revSize - cell * REV_N) / 2),
        y0: Math.floor((revSize - cell * REV_N) / 2),
      };
    }

    function draw() {
      var time = Date.now();
      var geo = geometry();
      ctx.clearRect(0, 0, revSize, revSize);
      for (var i = 0; i < REV_N * REV_N; i += 1) {
        var x = i % REV_N;
        var y = Math.floor(i / REV_N);
        var gx = geo.x0 + x * geo.cell;
        var gy = geo.y0 + y * geo.cell;
        ctx.fillStyle = "rgba(30, 41, 59, 0.6)";
        ctx.fillRect(gx + 1, gy + 1, geo.cell - 2, geo.cell - 2);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
        ctx.lineWidth = 1;
        ctx.strokeRect(gx + 1, gy + 1, geo.cell - 2, geo.cell - 2);
        if (board[i] !== REV_EMPTY) {
          var isPlayer = board[i] === REV_PLAYER;
          ctx.beginPath();
          ctx.arc(
            gx + geo.cell / 2,
            gy + geo.cell / 2,
            geo.cell * 0.34,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = isPlayer ? "#22d3ee" : "#ff6b35";
          ctx.shadowColor = isPlayer ? "#22d3ee" : "#ff6b35";
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      /* Legal moves for the player */
      if (!cleared && !busy) {
        revMoves(board, REV_PLAYER).forEach(function (m) {
          var x = m % REV_N;
          var y = Math.floor(m / REV_N);
          ctx.beginPath();
          ctx.arc(
            geo.x0 + x * geo.cell + geo.cell / 2,
            geo.y0 + y * geo.cell + geo.cell / 2,
            geo.cell * 0.12,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = "rgba(0, 242, 255, " + (0.4 + 0.25 * Math.sin(time / 260 + m)) + ")";
          ctx.fill();
        });
      }
      ripple.forEach(function (r) {
        var x = r.i % REV_N;
        var y = Math.floor(r.i / REV_N);
        ctx.globalAlpha = Math.max(0, r.life);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          geo.x0 + x * geo.cell + geo.cell / 2,
          geo.y0 + y * geo.cell + geo.cell / 2,
          geo.cell * 0.5 * (1.2 - r.life),
          0,
          Math.PI * 2,
        );
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      if (
        document.getElementById("gamePanelGlyphReversi").hidden ||
        document.hidden
      ) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      if (clockRunning) {
        renderHud();
      }
      var alive = [];
      ripple.forEach(function (r) {
        r.life -= 0.05;
        if (r.life > 0) {
          alive.push(r);
        }
      });
      ripple = alive;
      draw();
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

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
      if (c < 0 || r < 0 || c >= REV_N || r >= REV_N) {
        return;
      }
      playerMove(r * REV_N + c);
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(revLevels[index]);
      }
    });

    startBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    App.quietResetGlyphReversi = function () {
      if (!cleared && busy) {
        busy = false;
      }
      clockRunning = false;
      resultEl.textContent = t("revPaused");
    };

    loadLevel(revLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initGlyphReversiGame = initGlyphReversiGame;
})(window.CapitalConvert = window.CapitalConvert || {});
