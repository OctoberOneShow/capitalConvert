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
  /* Ranks. Three fields change what the rival can do. depth 0 is the static
   * positional read (it values the corners from REV_WEIGHTS only); depth 1
   * switches on the one reply/denial search the engine has always had - it
   * rewards owning the last square of a line, +40 for leaving you no legal
   * reply and +60 for answering your reply; depth >= 2 is a real alpha-beta
   * search (revDeepPick below), iterative-deepened under a node budget, so
   * the deep rungs genuinely see more plies than the plateau rival. noise is
   * the other lever: the chance of trading its best pick for a 2nd-to-4th
   * one. starMargin is [3-star, 2-star, 1-star] on the margin, measured by
   * seeded self-play. */
  var revLevels = [
    { id: "r1", labelKey: "revL1", noise: 0.5, depth: 0, starMargin: [18, 10, 4] },
    { id: "r2", labelKey: "revL2", noise: 0.3, depth: 0, starMargin: [16, 9, 3] },
    { id: "r3", labelKey: "revL3", noise: 0.15, depth: 1, starMargin: [14, 8, 3] },
    { id: "r4", labelKey: "revL4", noise: 0.05, depth: 1, starMargin: [12, 6, 2] },
    { id: "r5", labelKey: "revL5", noise: 0, depth: 2, starMargin: [10, 5, 2] },
    { id: "r6", labelKey: "revL6", noise: 0, depth: 3, starMargin: [8, 4, 2] },
    { id: "r7", labelKey: "revL7", noise: 0, depth: 4, starMargin: [8, 4, 2] },
    { id: "r8", labelKey: "revL8", noise: 0, depth: 4, starMargin: [8, 4, 2] },
    { id: "r9", labelKey: "revL9", noise: 0, depth: 1, starMargin: [11, 6, 2] },
    { id: "r10", labelKey: "revL10", noise: 0, depth: 1, starMargin: [12, 7, 3] },
    /* Ranks 11-15: the ladder's search becomes real past the plateau - two to
     * four plies of alpha-beta (revDeepPick below), which the one-reply read
     * above cannot answer - and the margin the player is allowed to lose by
     * narrows with it. The last rank keeps a flicker of noise, so a rival that
     * deep still hands the board back now and then. */
    { id: "r11", labelKey: "revL11", noise: 0, depth: 2, starMargin: [7, 4, 2] },
    { id: "r12", labelKey: "revL12", noise: 0, depth: 3, starMargin: [7, 4, 2] },
    { id: "r13", labelKey: "revL13", noise: 0, depth: 3, starMargin: [6, 3, 2] },
    { id: "r14", labelKey: "revL14", noise: 0, depth: 4, starMargin: [6, 3, 1] },
    { id: "r15", labelKey: "revL15", noise: 0.05, depth: 4, starMargin: [5, 3, 1] },
    /* Ranks 16-20: the deep brain is the ceiling a person can answer to, so
     * the tier buys its climb in arrangements, not plies. r16 opens the tier
     * a shade looser than the rank below it; r17 asks the same brain for a
     * tighter final lead; r18 hands it a shaking hand - noise at depth - the
     * fresh-but-fair breather; r19 gives the rival the opening move, but the
     * hand that opens shakes - the tempo comes wrapped in noise, and the
     * seeded bench says the player breaks even across six duels; r20 is the
     * capstone: the deep brain with a flicker of noise and the tightest
     * lead of the tier. */
    { id: "r16", labelKey: "revL16", noise: 0, depth: 4, starMargin: [7, 4, 2] },
    { id: "r17", labelKey: "revL17", noise: 0, depth: 4, starMargin: [6, 3, 1] },
    { id: "r18", labelKey: "revL18", noise: 0.12, depth: 4, starMargin: [10, 5, 2] },
    { id: "r19", labelKey: "revL19", noise: 0.15, depth: 4, aiFirst: true, starMargin: [7, 4, 1] },
    { id: "r20", labelKey: "revL20", noise: 0.05, depth: 4, starMargin: [6, 3, 1] },
    /* Ranks 21-24: the summit rungs. Precision endgames, tempo reversals,
     * and zero-noise deep search cap the Reversi campaign. */
    { id: "r21", labelKey: "revL21", noise: 0.04, depth: 4, starMargin: [6, 3, 1] },
    { id: "r22", labelKey: "revL22", noise: 0.03, depth: 4, starMargin: [6, 3, 1] },
    { id: "r23", labelKey: "revL23", noise: 0.02, depth: 4, starMargin: [5, 3, 1] },
    { id: "r24", labelKey: "revL24", noise: 0, depth: 4, starMargin: [5, 3, 1] },
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
    /* From rank 11 the depth field is real: revDeepPick returns the alpha-beta
     * choice, which owns the top slot, while the ordered read above keeps
     * feeding the noise roll its 2nd-to-4th picks. */
    if (depth >= 2) {
      var deep = revDeepPick(board, rank);
      if (deep.index >= 0) {
        ranked = ranked.filter(function (entry) {
          return entry.index !== deep.index;
        });
        ranked.unshift({ index: deep.index, value: deep.value });
      }
    }
    if (rank.noise && ranked.length > 1 && Math.random() < rank.noise) {
      var pickFrom = 1 + Math.floor(Math.random() * Math.min(3, ranked.length - 1));
      return ranked[pickFrom].index;
    }
    return ranked[0].index;
  }

  /* The deep ranks' search. Alpha-beta negamax from the rival's seat, with
   * leaves read off the positional weights and iterative deepening under a
   * node budget, so a depth-10 think costs about as long as a depth-6 one on
   * a wild tree and every rank's move still lands inside the move timer. */
  var REV_SEARCH_NODES = 120000;

  function revRead(board, player) {
    var total = 0;
    for (var i = 0; i < board.length; i += 1) {
      if (board[i] === player) {
        total += REV_WEIGHTS[i];
      } else if (board[i] !== REV_EMPTY) {
        total -= REV_WEIGHTS[i];
      }
    }
    return total;
  }

  function revNegamax(board, player, depth, alpha, beta, budget) {
    budget.used += 1;
    var moves = revMoves(board, player);
    if (!moves.length) {
      var foe = player === REV_PLAYER ? REV_AI : REV_PLAYER;
      if (!revMoves(board, foe).length) {
        /* Terminal: the final disc lead, read from this player's side and
         * scaled above any positional read so a won tree always wins. */
        var score = revScore(board);
        var mine = player === REV_PLAYER ? score.player : score.ai;
        var theirs = player === REV_PLAYER ? score.ai : score.player;
        return mine > theirs ? 10000 + mine - theirs
          : mine === theirs ? 0 : -10000 + mine - theirs;
      }
      /* A pass stays at the same ply; the budget still ticks. */
      return revNegamax(board, foe, depth, alpha, beta, budget);
    }
    if (depth <= 0 || budget.used > REV_SEARCH_NODES) {
      return revRead(board, player);
    }
    moves.sort(function (a, b) {
      return REV_WEIGHTS[b] - REV_WEIGHTS[a];
    });
    var best = -Infinity;
    for (var m = 0; m < moves.length; m += 1) {
      var applied = revApply(board, player, moves[m]);
      var value = -revNegamax(
        applied.board,
        player === REV_PLAYER ? REV_AI : REV_PLAYER,
        depth - 1,
        -beta,
        -alpha,
        budget,
      );
      if (value > best) {
        best = value;
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

  function revDeepPick(board, rank) {
    var moves = revMoves(board, REV_AI);
    if (!moves.length) {
      return { index: -1, value: 0 };
    }
    var budget = { used: 0 };
    var ordered = moves.slice().sort(function (a, b) {
      return REV_WEIGHTS[b] - REV_WEIGHTS[a];
    });
    var best = ordered[0];
    for (var depth = 2; depth <= rank.depth; depth += 1) {
      var alpha = -Infinity;
      var depthBest = -1;
      var depthValue = -Infinity;
      for (var m = 0; m < ordered.length; m += 1) {
        var applied = revApply(board, REV_AI, ordered[m]);
        var value = -revNegamax(
          applied.board,
          REV_PLAYER,
          depth - 1,
          -Infinity,
          -alpha,
          budget,
        );
        if (value > depthValue) {
          depthValue = value;
          depthBest = ordered[m];
        }
        if (depthValue > alpha) {
          alpha = depthValue;
        }
        if (budget.used > REV_SEARCH_NODES) {
          break;
        }
      }
      /* Only a depth that finished inside the budget is allowed to move the
       * pick; a cut-off pass keeps the previous depth's answer. */
      if (depthBest >= 0 && budget.used <= REV_SEARCH_NODES) {
        best = depthBest;
      }
      if (budget.used > REV_SEARCH_NODES) {
        break;
      }
    }
    return { index: best, value: 0 };
  }
  App.glyphReversiMoves = revMoves;
  App.glyphReversiFlips = revFlipsFor;
  App.glyphReversiApply = revApply;
  App.glyphReversiPick = revPick;
  App.glyphReversiScore = revScore;

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js does
   * not already own, so the eight shipped rung names stay in the shared
   * dictionary and only the deep ranks ride here. */
  App.addStrings({
    en: {
      "revL9": "Immortal",
      "revL10": "Ascendant",
      "revL11": "Deepwell",
      "revL12": "The Long Count",
      "revL13": "Iron Disc",
      "revL14": "Mirror Master",
      "revL15": "The Full Board",
      "revL16": "The Long Sight",
      "revL17": "Deeper Still",
      "revL18": "The Shaking Hand",
      "revL19": "First Strike",
      "revL20": "The Deep End",
      "revL21": "The Flank Press",
      "revL22": "The Rival's Gambit",
      "revL23": "Corner Bastion",
      "revL24": "Grandmaster Zenith",
    },
    zh: {
      "revL9": "不朽者",
      "revL10": "登峰者",
      "revL11": "深井者",
      "revL12": "长算者",
      "revL13": "铁盘",
      "revL14": "镜中主",
      "revL15": "满盘者",
      "revL16": "远望者",
      "revL17": "更深一层",
      "revL18": "颤之手",
      "revL19": "先手",
      "revL20": "深渊之底",
      "revL21": "侧翼压迫",
      "revL22": "弃子博弈",
      "revL23": "角隅要塞",
      "revL24": "大师黑白顶",
    },
  });

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
    var aiTimer = null;
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
      window.clearTimeout(aiTimer);
      aiTimer = null;
      level = levelDef;
      newBoard();
      cleared = false;
      busy = false;
      ripple = [];
      passCount = 0;
      clockRunning = false;
      startedAt = Date.now();
      renderHud();
      refreshPicker();
      startLoop();
      draw();
      resultEl.textContent = t("revReady");
      /* The deep ranks' twist: a rival that owns the opening move. The pads
       * stay locked (busy) until its answer lands, so the player reads the
       * same board they must now answer to. */
      if (levelDef.aiFirst) {
        busy = true;
        aiTimer = window.setTimeout(function () {
          aiTimer = null;
          busy = false;
          if (cleared) {
            return;
          }
          aiTurn();
          playTurn();
          draw();
        }, 420);
      }
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
        message = t("revDraw", { n: score.player }) + " " + t("revRetry");
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
      /* Resolve consecutive forced passes until the player can act. */
      while (!cleared && !revMoves(board, REV_PLAYER).length) {
        passCount += 1;
        if (passCount >= 2) {
          finish();
          return;
        }
        resultEl.textContent = t("revYouPassed");
        aiTurn();
      }
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
      aiTimer = window.setTimeout(function () {
        aiTimer = null;
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
      if (App.world) { App.world.backdrop(ctx, revSize, revSize, "tabletop"); }
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
          if (App.world) { App.world.piece(ctx, "disc", gx + geo.cell / 2, gy + geo.cell / 2, geo.cell * .85, null, !isPlayer); }
          else {
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
      clockRunning = false;
      resultEl.textContent = t("revPaused");
    };

    loadLevel(revLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initGlyphReversiGame = initGlyphReversiGame;
})(window.CapitalConvert = window.CapitalConvert || {});
