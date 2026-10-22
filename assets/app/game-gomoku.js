/* Gomoku - The five-in-a-row duel against the reading AI in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var localStorage = App.storage;
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;
  var fx = App.fx || {};
  var art = App.art || {};
  var gmSize = 13;
  var gmEmpty = 0;
  var gmHuman = 1;
  var gmAi = 2;
  /* Ten ranks, ten habits. Ranks 1-6 differ only in how much they weight the
   * one-ply read they already have (noise = how often they blink, defense = how
   * much they fear your shape). Ranks 7-10 each learn something the six below
   * cannot see at all:
   *   r7 The Gap Reader  - holes: a line with a hole in it is a shape, not a gap;
   *   r8 The Twin Fork    - fork: it plays for the pile of four-makers a stone
   *                        leaves standing, not for the single longest line;
   *   r9 The Early Block  - sente: it takes the point your fork needs, one turn
   *                        before that fork exists, with nothing to block yet;
   *   r10 The Patient Hand- tempo + four plies: it declines the forcing four whose
   *                        line dies under the answer, keeps only the fork still
   *                        alive three answers later, and chases no loose makers. */
  var gmRanks = [
    { id: "r1", labelKey: "gomokuRank1", noise: 260, defense: 0.55, starMoves: [14, 20, 30] },
    { id: "r2", labelKey: "gomokuRank2", noise: 60, defense: 0.95, starMoves: [18, 26, 38] },
    { id: "r3", labelKey: "gomokuRank3", noise: 0, defense: 1.1, starMoves: [24, 34, 48] },
    { id: "r4", labelKey: "gomokuRank4", noise: 0, defense: 1.7, starMoves: [26, 38, 54] },
    { id: "r5", labelKey: "gomokuRank5", noise: 0, defense: 2.6, starMoves: [30, 44, 62] },
    { id: "r6", labelKey: "gomokuRank6", noise: 0, defense: 4, starMoves: [34, 50, 70] },
    { id: "r7", labelKey: "gomokuRank7", noise: 0, defense: 4, holes: 1, starMoves: [38, 56, 78] },
    { id: "r8", labelKey: "gomokuRank8", noise: 0, defense: 4, holes: 1, fork: 1, starMoves: [42, 62, 86] },
    { id: "r9", labelKey: "gomokuRank9", noise: 0, defense: 4, holes: 1, fork: 1, sente: 1, depth: 2, starMoves: [46, 68, 94] },
    { id: "r10", labelKey: "gomokuRank10", noise: 0, defense: 4, holes: 1, fork: 1, spread: 0, sente: 1, tempo: 1, depth: 4, starMoves: [50, 74, 102] },
    /* Ranks 11-15: the same strength stack as the top of the ladder, with
     * the search taken two plies further per rank. Sight alone would make
     * them unbeatable, so each one also pays for it - the last three take a
     * small random move and spend two turns in five building their own
     * shape instead of answering yours, which is the concession every
     * shipped rank above five makes too. */
    { id: "r11", labelKey: "gomokuRank11", noise: 0, defense: 4, holes: 1, fork: 1, spread: 0, sente: 1, tempo: 1, depth: 5, starMoves: [54, 80, 110] },
    { id: "r12", labelKey: "gomokuRank12", noise: 0, defense: 4, holes: 1, fork: 1, spread: 0, sente: 1, tempo: 1, depth: 6, starMoves: [58, 86, 118] },
    { id: "r13", labelKey: "gomokuRank13", noise: 0.05, defense: 4, holes: 1, fork: 1, spread: 0, sente: 1, tempo: 1, depth: 7, starMoves: [62, 92, 126] },
    { id: "r14", labelKey: "gomokuRank14", noise: 0.08, defense: 4, holes: 1, fork: 1, spread: 0, sente: 1, tempo: 2, depth: 8, starMoves: [66, 98, 134] },
    { id: "r15", labelKey: "gomokuRank15", noise: 0.12, defense: 4, holes: 1, fork: 1, spread: 0, sente: 1, tempo: 2, depth: 9, starMoves: [70, 104, 142] },
  ];
  var gmDirs = [[1, 0], [0, 1], [1, 1], [1, -1]];

  /* Goban geometry, all in one viewBox so the surface, the grid, the stones and
   * the win line scale as a single object. gmPad is the bare wood outside the
   * outer lines - it is what lets a stone on the edge line sit on the board
   * instead of hanging off it. */
  var gmCell = 100;
  var gmPad = 152;
  var gmView = gmPad * 2 + gmCell * (gmSize - 1);
  var gmSpan = gmCell * (gmSize - 1);
  var gmStars = [[3, 3], [9, 3], [3, 9], [9, 9], [6, 6]];
  var gmFiles = "ABCDEFGHJKLMNOPQRST"; /* go files skip "I" */
  var gmOvershoot = 54; /* the win stroke runs a little past the outer stones */
  var SVG_NS = "http://www.w3.org/2000/svg";

  /* Distance along an axis, in viewBox units, of line `index`. */
  function gmAxis(index) {
    return gmPad + gmCell * index;
  }

  function svgNode(tag, attrs, cls) {
    var node = document.createElementNS(SVG_NS, tag);
    node.setAttribute("class", cls);
    for (var key in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, key)) {
        node.setAttribute(key, String(attrs[key]));
      }
    }
    return node;
  }

  function gmInBounds(x, y) {
    return x >= 0 && x < gmSize && y >= 0 && y < gmSize;
  }

  /* One pass over the four axes through (x, y), pretending `who`
   * plays there: run length plus how many ends of it stay open.
   * With `holes`, the run may also be stitched across ONE empty gap on each
   * side - the broken shapes (XX_XX, XXX_X) that read as nothing to the six
   * bottom ranks. A stitched run is never five, only a four waiting on its
   * gap, so it is capped below the win constant and gmHasWon cannot be fooled
   * by it. */
  function gmAxisScore(board, x, y, dx, dy, who, holes) {
    var run = 1;
    var openEnds = 0;
    var stitched = false;
    var side;
    var step;
    var sx;
    var sy;
    var nx;
    var ny;
    var jumped;
    var value;
    var ahead;
    for (side = 0; side < 2; side += 1) {
      sx = side === 0 ? dx : -dx;
      sy = side === 0 ? dy : -dy;
      jumped = false;
      for (step = 1; step < 6; step += 1) {
        nx = x + sx * step;
        ny = y + sy * step;
        if (!gmInBounds(nx, ny)) {
          break;
        }
        value = board[nx + ny * gmSize];
        if (value === who) {
          run += 1;
          if (jumped) {
            stitched = true;
          }
          continue;
        }
        if (value === gmEmpty && holes && !jumped) {
          ahead = gmInBounds(nx + sx, ny + sy)
            ? board[nx + sx + (ny + sy) * gmSize]
            : gmEmpty;
          if (ahead === who) {
            /* the line continues past one hole: hold the walk, spend the gap */
            jumped = true;
            continue;
          }
        }
        if (value === gmEmpty) {
          openEnds += 1;
        }
        break;
      }
    }
    return gmShapeValue(run, openEnds, stitched);
  }

  /* The valuation table, shared by the plain and the stitched walk: five beats
   * open four beats blocked four beats open three, and a stitched line is worth
   * the four it becomes the moment its gap is filled. */
  function gmShapeValue(run, openEnds, stitched) {
    if (run >= 5) {
      return stitched ? 100000 : 10000000;
    }
    if (run === 4) {
      if (stitched) {
        return 100000;
      }
      return openEnds === 2 ? 1000000 : openEnds === 1 ? 100000 : 0;
    }
    if (run === 3) {
      if (stitched) {
        return openEnds === 2 ? 9000 : openEnds === 1 ? 900 : 0;
      }
      return openEnds === 2 ? 10000 : openEnds === 1 ? 1000 : 0;
    }
    if (run === 2) {
      if (stitched) {
        return openEnds === 2 ? 90 : openEnds === 1 ? 9 : 0;
      }
      return openEnds === 2 ? 100 : openEnds === 1 ? 10 : 0;
    }
    return openEnds ? 1 : 0;
  }

  function gmCellScore(board, x, y, who, holes) {
    var total = 0;
    gmDirs.forEach(function (axis) {
      total += gmAxisScore(board, x, y, axis[0], axis[1], who, holes);
    });
    return total;
  }

  function gmHasWon(board, x, y, who) {
    return gmDirs.some(function (axis) {
      return gmAxisScore(board, x, y, axis[0], axis[1], who) >= 10000000;
    });
  }

  /* Presentation only: the stones a winning line runs through, in board order.
   * gmHasWon has already decided the game by the time this runs; this walks the
   * same four axes again purely so the stroke can be drawn through them. */
  function gmWinRun(board, x, y, who) {
    var longest = [];
    var axis;
    var step;
    var nx;
    var ny;
    for (axis = 0; axis < gmDirs.length; axis += 1) {
      var run = [x + y * gmSize];
      for (step = 1; step < gmSize; step += 1) {
        nx = x + gmDirs[axis][0] * step;
        ny = y + gmDirs[axis][1] * step;
        if (!gmInBounds(nx, ny) || board[nx + ny * gmSize] !== who) {
          break;
        }
        run.push(nx + ny * gmSize);
      }
      for (step = 1; step < gmSize; step += 1) {
        nx = x - gmDirs[axis][0] * step;
        ny = y - gmDirs[axis][1] * step;
        if (!gmInBounds(nx, ny) || board[nx + ny * gmSize] !== who) {
          break;
        }
        run.unshift(nx + ny * gmSize);
      }
      if (run.length > longest.length) {
        longest = run;
      }
    }
    return longest.length >= 5 ? longest : [];
  }

  /* ------------------------------------------------------------ the engine */
  /* The reading itself lives above initGomokuGame and touches no node, which is
   * what lets the ladder be measured against itself: a rank is a bundle of
   * capabilities, and the table a probe reads is the one the drawer plays. */

  var gmFourFloor = 100000; /* a point that is one move from five */
  var gmOpenThree = 10000; /* an open three, plain */
  var gmGapThree = 9000; /* an open three stitched across a hole */

  function gmFreshBoard() {
    var flat = [];
    for (var index = 0; index < gmSize * gmSize; index += 1) {
      flat.push(gmEmpty);
    }
    return flat;
  }

  /* The opening stone: the empty crossing nearest tengen, because a rank that
   * has nothing to read yet should still play the middle of the wood. */
  function gmOpenPoint(board) {
    var best = -1;
    var bestGap = Infinity;
    for (var index = 0; index < board.length; index += 1) {
      if (board[index] !== gmEmpty) {
        continue;
      }
      var x = index % gmSize;
      var y = Math.floor(index / gmSize);
      var gap = Math.abs(x - (gmSize - 1) / 2) + Math.abs(y - (gmSize - 1) / 2);
      if (gap < bestGap) {
        bestGap = gap;
        best = index;
      }
    }
    return best;
  }

  function gmCenterBias(x, y) {
    return 6 - Math.max(Math.abs(x - gmSize / 2), Math.abs(y - gmSize / 2));
  }

  /* Only fight near the action; the far empty board is noise. */
  function gmNearAction(board, index, radius) {
    var reach = radius || 2;
    var x = index % gmSize;
    var y = Math.floor(index / gmSize);
    for (var dy = -reach; dy <= reach; dy += 1) {
      for (var dx = -reach; dx <= reach; dx += 1) {
        var nx = x + dx;
        var ny = y + dy;
        if (gmInBounds(nx, ny) && board[nx + ny * gmSize] !== gmEmpty) {
          return true;
        }
      }
    }
    return false;
  }

  /* How many points finish the game for `who` right now: `kills` counts the
   * cells that make five, `open` the cells that make an open four. Counted
   * across the whole board rather than down the axes of one cell, because the
   * shape a player should fear is usually two half-lines on two different
   * lines - a summed one-ply score cannot see it.
   * Note that ONE live three already contributes two `open` cells (each end
   * extends it to an open four), so `open` alone is not a fork: the double
   * threat is two kills, or a kill and an open four to come. */
  function gmKillPoints(board, who, holes, radius) {
    var kills = 0;
    var open = 0;
    var fours = 0;
    for (var index = 0; index < board.length; index += 1) {
      if (board[index] !== gmEmpty || !gmNearAction(board, index, radius)) {
        continue;
      }
      var value = gmCellScore(
        board,
        index % gmSize,
        Math.floor(index / gmSize),
        who,
        holes,
      );
      if (value >= 10000000) {
        kills += 1;
      } else if (value >= 1000000) {
        open += 1;
      } else if (value >= gmFourFloor) {
        fours += 1;
      }
      if (kills >= 2) {
        break;
      }
    }
    return { kills: kills, open: open, fours: fours };
  }

  /* What a stone laid on (x, y) would build, counted per axis rather than summed:
   * how many lines of four it opens and how many live threes. Two fours, a four
   * with a live three, or two live threes on one stone is a fork - the other
   * side gets one block and no more. */
  function gmPointBand(board, x, y, who, holes) {
    var fours = 0;
    var threes = 0;
    for (var axis = 0; axis < gmDirs.length; axis += 1) {
      var value = gmAxisScore(
        board,
        x,
        y,
        gmDirs[axis][0],
        gmDirs[axis][1],
        who,
        holes,
      );
      if (value >= gmFourFloor) {
        fours += 1;
      } else if (value === gmOpenThree || value === gmGapThree) {
        threes += 1;
      }
    }
    return { fours: fours, threes: threes };
  }

  function gmDecisive(band) {
    return band.fours >= 2 || (band.fours >= 1 && band.threes >= 1);
  }

  /* Two live threes out of one stone: it threatens nothing yet, which is exactly
   * why a wall that only answers finished threats waves it through. */
  function gmDoubleThree(band) {
    return band.fours === 0 && band.threes >= 2;
  }

  function gmIsFork(band) {
    return gmDecisive(band) || gmDoubleThree(band);
  }

  /* The best shape `who` can build on its next stone, which is the quantity a
   * deep rank is really buying: an open four scores a million here, a five point
   * ten million, and a blocked line scores nothing worth having. */
  function gmBestShape(board, who, holes, radius) {
    var best = 0;
    for (var index = 0; index < board.length; index += 1) {
      if (board[index] !== gmEmpty || !gmNearAction(board, index, radius)) {
        continue;
      }
      var value = gmCellScore(
        board,
        index % gmSize,
        Math.floor(index / gmSize),
        who,
        holes,
      );
      if (value > best) {
        best = value;
      }
    }
    return best;
  }

  /* Candidate points, richest first. `fears` is how much the side to move
   * weighs the shape the other side would build on the same point. */
  function gmShortList(board, rank, who, rival, fears) {
    var holes = !!rank.holes;
    var list = [];
    for (var index = 0; index < board.length; index += 1) {
      if (board[index] !== gmEmpty || !gmNearAction(board, index, rank.radius)) {
        continue;
      }
      var x = index % gmSize;
      var y = Math.floor(index / gmSize);
      var attack = gmCellScore(board, x, y, who, holes);
      var defense = rival === null ? 0 : gmCellScore(board, x, y, rival, holes);
      list.push({
        index: index,
        attack: attack,
        value:
          attack + defense * fears + gmCenterBias(x, y) + Math.random() * rank.noise,
      });
    }
    list.sort(function (a, b) {
      return b.value - a.value;
    });
    return list;
  }

  /* What the side to move still holds after the rival gets `plies` answers:
   * the rival takes the answer that leaves the least, and between answers the
   * side plays its own richest point. A rank's depth is bought here - an open
   * four survives any single answer (one end is always still a five), a one-eye
   * four does not, and that is the whole difference between a threat and a
   * bluff. The rival's own shape is deliberately not in this term: the root's
   * `defense` weight already pays for it, and asking twice makes a wall of
   * everything. */
  function gmHold(board, rank, who, rival, plies, budget) {
    if (plies <= 0) {
      return gmBestShape(board, who, rank.holes, rank.radius);
    }
    var answers = gmShortList(board, rank, rival, who, rank.defense);
    if (!answers.length) {
      return gmBestShape(board, who, rank.holes, rank.radius);
    }
    var worst = Infinity;
    for (var step = 0; step < answers.length && step < budget; step += 1) {
      board[answers[step].index] = rival;
      var left;
      if (plies >= 2) {
        left = -Infinity;
        var mine = gmShortList(board, rank, who, rival, rank.defense);
        for (var back = 0; back < mine.length && back < budget; back += 1) {
          board[mine[back].index] = who;
          var held = gmHold(board, rank, who, rival, plies - 2, budget);
          board[mine[back].index] = gmEmpty;
          if (held > left) {
            left = held;
          }
        }
        if (left === -Infinity) {
          left = gmBestShape(board, who, rank.holes, rank.radius);
        }
      } else {
        left = gmBestShape(board, who, rank.holes, rank.radius);
      }
      board[answers[step].index] = gmEmpty;
      if (left < worst) {
        worst = left;
      }
    }
    return worst;
  }

  /* THE move chooser. Ranks without the new fields take the identical one-ply
   * walk they always did; ranks 7-10 pay for a capability with the shape they
   * then owns, never with a bigger number. */
  function gmAiPick(board, rank, who) {
    var me = who || gmAi;
    var foe = me === gmAi ? gmHuman : gmAi;
    var holes = !!rank.holes;
    var deep = !!(rank.fork || rank.sente || rank.tempo || rank.depth > 1);
    var bestScore = -1;
    var best = -1;
    if (!deep) {
      for (var index = 0; index < board.length; index += 1) {
        if (board[index] !== gmEmpty || !gmNearAction(board, index, rank.radius)) {
          continue;
        }
        var x = index % gmSize;
        var y = Math.floor(index / gmSize);
        var value =
          gmCellScore(board, x, y, me, holes) +
          gmCellScore(board, x, y, foe, holes) * rank.defense +
          gmCenterBias(x, y) +
          Math.random() * rank.noise;
        if (value > bestScore) {
          bestScore = value;
          best = index;
        }
      }
      if (best === -1) {
        for (var spare = 0; spare < board.length; spare += 1) {
          if (board[spare] === gmEmpty) {
            return spare;
          }
        }
      }
      return best;
    }
    /* The four new capabilities are read at the root, over the ranks' own short
     * list, so the fork logic never has to touch the shipped one-ply path. */
    var roots = gmShortList(board, rank, me, foe, rank.defense);
    var rivalForks = [];
    if (rank.sente) {
      /* Nothing is threatened yet, so nothing raises the alarm a one-ply wall
       * answers: look for the point your double threat would be built on and
       * take it now. Only a five already on the board outranks this. */
      var now = gmKillPoints(board, me, holes, rank.radius);
      if (now.kills === 0) {
        var rivals = gmShortList(board, rank, foe, me, 1);
        for (var scan = 0; scan < rivals.length && scan < (rank.narrow || 4) * 3; scan += 1) {
          var spot = rivals[scan].index;
          if (gmIsFork(gmPointBand(board, spot % gmSize, Math.floor(spot / gmSize), foe, holes))) {
            rivalForks.push(spot);
          }
        }
      }
    }
    var ceiling = rank.width || 8;
    /* A five on the board is played, not contemplated: ranks that weigh the
     * rival's shape above finishing their own line lose games they have won. */
    for (var cash = 0; cash < roots.length; cash += 1) {
      if (roots[cash].attack >= 10000000) {
        return roots[cash].index;
      }
    }
    var makersBefore = rank.tempo
      ? gmKillPoints(board, me, holes, rank.radius)
      : null;
    var fourWasOnOffer = !!(
      makersBefore &&
      makersBefore.kills + makersBefore.fours > 0
    );
    for (var step = 0; step < roots.length && step < ceiling; step += 1) {
      var cell = roots[step].index;
      var cx = cell % gmSize;
      var cy = Math.floor(cell / gmSize);
      var score = roots[step].value;
      var band = gmPointBand(board, cx, cy, me, holes);
      var standing = null;
      var makers = 0;
      var held = 0;
      if (rank.fork || rank.tempo || rank.depth > 1) {
        board[cell] = me;
        if (rank.fork || rank.tempo) {
          standing = gmKillPoints(board, me, holes, rank.radius);
          makers = standing.kills + standing.open + standing.fours;
        }
        if (rank.depth > 1) {
          held = gmHold(board, rank, me, foe, rank.depth - 1, rank.narrow || 3);
        }
        board[cell] = gmEmpty;
      }
      /* fork: it plays the stone that leaves two lines alive, not the one that
       * leaves one line merely long. Board-wide, because the second threat
       * usually sits on a line that does not run through this cell, and paid by
       * how many four-makers stand afterwards - that is the read a player feels
       * as "it has two ways to make a four and I only have one block". */
      if (rank.fork) {
        score += rank.fork * (rank.spread === undefined ? 12000 : rank.spread) * makers;
        if (
          gmIsFork(band) ||
          (standing &&
            (standing.kills >= 2 ||
              (standing.kills >= 1 && standing.open >= 1)))
        ) {
          score += rank.fork * 1200000;
        }
      }
      /* tempo: and it declines the forcing four whose line dies under the
       * answer, keeping the fork that is still alive after the answer. */
      if (
        rank.tempo &&
        fourWasOnOffer &&
        band.fours === 0 &&
        makers >= 2 &&
        held >= gmFourFloor
      ) {
        score += rank.tempo * 300000;
      }
      /* sente: it takes the point your fork would be built on one turn early,
       * while there is nothing yet for a one-ply wall to lean against. */
      if (rank.sente && rivalForks.indexOf(cell) > -1) {
        score += rank.sente * 900000;
      }
      /* depth: the stone is only played if the shape it promises survives the
       * best answer to it, not merely the first answer it looks like. */
      if (rank.depth > 1) {
        score += (rank.hold === undefined ? 1 : rank.hold) * held;
      }
      if (score > bestScore) {
        bestScore = score;
        best = cell;
      }
    }
    if (best === -1 && roots.length) {
      best = roots[0].index;
    }
    if (best === -1) {
      return gmOpenPoint(board);
    }
    return best;
  }

  function initGomokuGame() {
    var boardEl = getElement("gomokuBoard");
    var movesEl = getElement("gomokuMoves");
    var streakEl = getElement("gomokuStreak");
    var resultEl = getElement("gomokuResult");
    var newBtn = getElement("gomokuNewBtn");
    var undoBtn = getElement("gomokuUndoBtn");
    var bestEl = getElement("gomokuBest");
    var rankSel = getElement("gomokuRankSel");
    var panelEl = getElement("gamePanelGomoku");
    if (
      !boardEl ||
      !movesEl ||
      !streakEl ||
      !resultEl ||
      !newBtn ||
      !undoBtn ||
      !bestEl ||
      !rankSel
    ) {
      return;
    }

    var campaign = createCampaign({ key: "gomoku-campaign", levels: gmRanks });
    var rank = gmRanks[campaign.indexOf(campaign.nextLevelId())];
    var cells = [];
    var stones = [];
    var board = [];
    var history = [];
    var moves = 0;
    var over = false;
    var aiTimer = null;
    var gobanEl = null;
    var winEl = null;
    var winLine = null;
    var winGlow = null;
    var winRun = [];
    var turnRow = null;
    var blackChip = null;
    var whiteChip = null;
    var whiteChipLabel = null;
    var dismissRound = null;
    var roundTimer = null;

    /* The feel layer is decoration: a panel has to stay playable when it is
     * absent, so nothing calls into it directly. */
    function sfx(name) {
      if (App.playSfx) {
        App.playSfx(name);
      }
    }

    function beat(name, el, opts) {
      var effect = fx[name];
      if (typeof effect === "function") {
        effect.call(fx, el, opts);
      }
    }

    function rollCount(el, from, to) {
      if (typeof fx.countUp === "function") {
        fx.countUp(el, from, to, { ms: 260 });
      } else {
        el.textContent = String(to);
      }
    }

    function readInt(key) {
      var value = parseInt(localStorage.getItem(key), 10);
      return isNaN(value) ? 0 : value;
    }

    function say(message, tone) {
      resultEl.textContent = message;
      resultEl.className = "game-result" + (tone ? " is-" + tone : "");
    }

    function removeNode(node) {
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }

    /* ------------------------------------------------------------- surface */
    /* The goban is drawn, not implied: 26 hairlines that stroke themselves in
     * from tengen outward, the five star points, and a file/rank rail on the
     * bare wood. A fresh node is what replays the draw on a new game, so there
     * is no timer left running behind a hidden panel. */
    function buildSurface() {
      var svg = svgNode(
        "svg",
        {
          viewBox: "0 0 " + gmView + " " + gmView,
          preserveAspectRatio: "xMidYMid meet",
          "aria-hidden": "true",
          focusable: "false",
        },
        "gm-goban",
      );
      svg.style.setProperty("--gm-dash", String(gmSpan));
      var index;
      var edge;
      var delay;
      for (index = 0; index < gmSize; index += 1) {
        edge = index === 0 || index === gmSize - 1;
        delay = (Math.abs(index - (gmSize - 1) / 2) * 26) | 0;
        svg.appendChild(
          stroke("gm-line" + (edge ? " is-edge" : ""), delay, {
            x1: gmAxis(index),
            y1: gmAxis(0),
            x2: gmAxis(index),
            y2: gmAxis(gmSize - 1),
          }),
        );
        svg.appendChild(
          stroke("gm-line" + (edge ? " is-edge" : ""), delay, {
            x1: gmAxis(0),
            y1: gmAxis(index),
            x2: gmAxis(gmSize - 1),
            y2: gmAxis(index),
          }),
        );
      }
      /* Five star points on a 13x13: the four corners plus tengen. */
      for (index = 0; index < gmStars.length; index += 1) {
        var hoshi = svgNode(
          "circle",
          {
            cx: gmAxis(gmStars[index][0]),
            cy: gmAxis(gmStars[index][1]),
            r: 10,
          },
          "gm-hoshi",
        );
        hoshi.style.setProperty("animation-delay", 210 + index * 45 + "ms");
        svg.appendChild(hoshi);
      }
      for (index = 0; index < gmSize; index += 1) {
        var letter = gmFiles.charAt(index);
        var number = String(index + 1);
        var rail = gmPad / 2;
        svg.appendChild(label(gmAxis(index), rail, letter));
        svg.appendChild(label(gmAxis(index), gmView - rail, letter));
        svg.appendChild(label(rail, gmAxis(index), number));
        svg.appendChild(label(gmView - rail, gmAxis(index), number));
      }
      return svg;
    }

    function stroke(cls, delay, attrs) {
      var line = svgNode("line", attrs, cls);
      line.style.setProperty("animation-delay", delay + "ms");
      return line;
    }

    function label(x, y, text) {
      var node = svgNode(
        "text",
        { x: x, y: y, "text-anchor": "middle", "dominant-baseline": "central" },
        "gm-coord",
      );
      node.textContent = text;
      node.style.setProperty("animation-delay", "240ms");
      return node;
    }

    function buildWinLayer() {
      removeNode(winEl);
      winEl = svgNode(
        "svg",
        {
          viewBox: "0 0 " + gmView + " " + gmView,
          preserveAspectRatio: "xMidYMid meet",
          "aria-hidden": "true",
          focusable: "false",
        },
        "gm-win",
      );
      winGlow = svgNode("line", { x1: 0, y1: 0, x2: 0, y2: 0 }, "gm-win-glow");
      winLine = svgNode("line", { x1: 0, y1: 0, x2: 0, y2: 0 }, "gm-win-line");
      winEl.appendChild(winGlow);
      winEl.appendChild(winLine);
      boardEl.appendChild(winEl);
    }

    function mountSurface() {
      removeNode(gobanEl);
      gobanEl = buildSurface();
      /* After the cells, always: the drawing paints behind them by z-index, and a
       * new game replays the stroke-in without shifting an intersection. */
      boardEl.appendChild(gobanEl);
      if (winEl) {
        boardEl.appendChild(winEl);
      }
    }

    /* The line that says the game is over: it runs through the five stones and
     * draws itself along them, stone by stone of its own length. */
    function drawWinLine() {
      if (!winEl || winRun.length < 2) {
        return;
      }
      var head = winRun[0];
      var tail = winRun[winRun.length - 1];
      var x1 = gmAxis(head % gmSize);
      var y1 = gmAxis(Math.floor(head / gmSize));
      var x2 = gmAxis(tail % gmSize);
      var y2 = gmAxis(Math.floor(tail / gmSize));
      var dx = x2 - x1;
      var dy = y2 - y1;
      var length = Math.sqrt(dx * dx + dy * dy);
      if (!length) {
        return;
      }
      var ux = (dx / length) * gmOvershoot;
      var uy = (dy / length) * gmOvershoot;
      for (var step = 0; step < winRun.length; step += 1) {
        cells[winRun[step]].style.setProperty("--gm-k", String(step));
      }
      var ends = {
        x1: x1 - ux,
        y1: y1 - uy,
        x2: x2 + ux,
        y2: y2 + uy,
      };
      winLine.setAttribute("x1", String(ends.x1));
      winLine.setAttribute("y1", String(ends.y1));
      winLine.setAttribute("x2", String(ends.x2));
      winLine.setAttribute("y2", String(ends.y2));
      winGlow.setAttribute("x1", String(ends.x1));
      winGlow.setAttribute("y1", String(ends.y1));
      winGlow.setAttribute("x2", String(ends.x2));
      winGlow.setAttribute("y2", String(ends.y2));
      winEl.style.setProperty("--gm-dash", String(Math.round(length + gmOvershoot * 2)));
      winEl.setAttribute("class", "gm-win is-on");
    }

    /* --------------------------------------------------------------- cells */

    /* The board IS the grid of intersections: every playable crossing is a direct
     * child of the plate, in reading order, with the drawing and the win stroke
     * mounted after them. Node order is not paint order here - the two overlays
     * sit behind and in front by z-index - so the board stays walkable by a
     * harness that only knows `children`, and a rebuilt surface cannot orphan a
     * stone. */
    function buildBoard() {
      boardEl.textContent = "";
      cells = [];
      stones = [];
      /* Fifteen tracks, not thirteen: the outer pair is the bare wood outside the
       * edge lines, sized in the same proportional units as the cells so the
       * margin holds whatever the drawer is. With the margin at gmPad - gmCell / 2
       * over gmCell, track 2 + half a cell is the intersection gmAxis(0), and so
       * on down the board. */
      var margin = ((gmPad - gmCell / 2) / gmCell).toFixed(4);
      var tracks =
        margin + "fr repeat(" + gmSize + ", minmax(0, 1fr)) " + margin + "fr";
      boardEl.style.gridTemplateColumns = tracks;
      boardEl.style.gridTemplateRows = tracks;
      for (var index = 0; index < gmSize * gmSize; index += 1) {
        (function (cellIndex) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "gm-cell";
          button.style.gridColumn = String((cellIndex % gmSize) + 2);
          button.style.gridRow = String(Math.floor(cellIndex / gmSize) + 2);
          button.addEventListener("click", function () {
            playHuman(cellIndex);
          });
          boardEl.appendChild(button);
          cells.push(button);
        })(index);
      }
      boardEl.addEventListener("keydown", moveFocus);
      mountSurface();
      buildWinLayer();
    }

    /* Sixteen-nine tab stops is not a way to play a board game: arrows walk the
     * intersections and skip the stones you cannot place on. */
    function moveFocus(event) {
      var dirs = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      var dir = dirs[event.key];
      if (!dir) {
        return;
      }
      var from = cells.indexOf(event.target);
      if (from < 0) {
        return;
      }
      var x = from % gmSize;
      var y = Math.floor(from / gmSize);
      for (var step = 1; step < gmSize; step += 1) {
        var nx = x + dir[0] * step;
        var ny = y + dir[1] * step;
        if (!gmInBounds(nx, ny)) {
          break;
        }
        var cell = cells[nx + ny * gmSize];
        if (!cell.disabled) {
          if (cell.focus) {
            cell.focus();
          }
          if (event.preventDefault) {
            event.preventDefault();
          }
          break;
        }
      }
    }

    /* A stone is a node owned by its cell, which is what lets the one that just
     * arrived play the landing while a re-render leaves the others alone. */
    function syncStone(index, value, landed) {
      var cell = cells[index];
      var stone = stones[index];
      var who = value === gmHuman ? "is-black" : value === gmAi ? "is-white" : "";
      if (!who) {
        removeNode(stone);
        stones[index] = null;
        return;
      }
      if (stone && stone.getAttribute("data-stone") === who) {
        return;
      }
      removeNode(stone);
      stone = document.createElement("span");
      stone.className = "gm-stone " + who + (landed ? "" : " is-settled");
      stone.setAttribute("aria-hidden", "true");
      stone.setAttribute("data-stone", who);
      var mark = document.createElement("i");
      mark.className = "gm-mark";
      stone.appendChild(mark);
      cell.appendChild(stone);
      stones[index] = stone;
    }

    function renderCell(index, landed) {
      var value = board[index];
      var last = !!value && history.length > 0 && history[history.length - 1] === index;
      cells[index].className =
        "gm-cell" +
        (value === gmHuman ? " is-black" : value === gmAi ? " is-white" : "") +
        (last ? " is-last" : "") +
        (winRun.indexOf(index) > -1 ? " is-win" : "");
      cells[index].disabled = value !== gmEmpty || over;
      cells[index].setAttribute(
        "aria-label",
        t("gomokuCell", {
          n: (index % gmSize) + 1 + "," + (Math.floor(index / gmSize) + 1),
        }) +
          (value === gmHuman
            ? ", " + t("gomokuBlack")
            : value === gmAi
              ? ", " + t("gomokuWhite")
              : ""),
      );
      syncStone(index, value, landed);
    }

    function renderAll() {
      for (var index = 0; index < board.length; index += 1) {
        renderCell(index);
      }
      movesEl.textContent = String(moves);
      undoBtn.disabled = history.length === 0 || over;
      paintTurn();
    }

    /* ---------------------------------------------------------- whose turn */

    function chip(who) {
      var node = document.createElement("span");
      node.className = "gm-chip " + (who === gmHuman ? "is-black" : "is-white");
      var swatch = document.createElement("span");
      swatch.className = "gm-swatch";
      if (typeof art.icon === "function") {
        swatch.appendChild(art.icon(who === gmHuman ? "stone-dark" : "stone-light"));
      }
      node.appendChild(swatch);
      var labelNode = document.createElement("span");
      labelNode.className = "gm-chip-label";
      labelNode.textContent = t(who === gmHuman ? "gomokuBlack" : "gomokuWhite");
      node.appendChild(labelNode);
      if (who === gmAi) {
        whiteChipLabel = labelNode;
      }
      return node;
    }

    function buildTurnRow() {
      if (turnRow || !boardEl.parentNode) {
        return;
      }
      turnRow = document.createElement("div");
      turnRow.className = "gm-turn";
      blackChip = chip(gmHuman);
      whiteChip = chip(gmAi);
      turnRow.appendChild(blackChip);
      turnRow.appendChild(whiteChip);
      boardEl.parentNode.insertBefore(turnRow, boardEl);
    }

    /* Who is to play, said with a lifted chip, a word and a pulse - never with
     * a tint alone. */
    function paintTurn() {
      if (!turnRow) {
        return;
      }
      var thinking = !over && aiTimer !== null;
      var active = over ? 0 : thinking ? gmAi : gmHuman;
      blackChip.className =
        "gm-chip is-black" + (active === gmHuman ? " is-on" : "");
      whiteChip.className =
        "gm-chip is-white" +
        (active === gmAi ? " is-on" : "") +
        (thinking ? " is-thinking" : "");
      if (whiteChipLabel) {
        whiteChipLabel.textContent =
          t("gomokuWhite") + " · " + t(rank.labelKey);
      }
      turnRow.className = "gm-turn" + (over ? " is-over" : "");
    }

    function refreshRank() {
      fillCampaignPicker(
        rankSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      rankSel.value = rank.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
      streakEl.textContent = String(readInt("gomoku-win-streak"));
    }

    function newGame(rankDef) {
      window.clearTimeout(aiTimer);
      window.clearTimeout(roundTimer);
      aiTimer = null;
      roundTimer = null;
      if (dismissRound) {
        dismissRound();
        dismissRound = null;
      }
      rank = rankDef || rank;
      board = gmFreshBoard();
      history = [];
      moves = 0;
      over = false;
      winRun = [];
      if (winEl) {
        winEl.setAttribute("class", "gm-win");
      }
      mountSurface();
      renderAll();
      refreshRank();
      say(t("gomokuPrompt", { name: t(rank.labelKey) }));
    }

    /* The drawer asks the engine and nothing else, which is what lets the same
     * rank table be measured outside the DOM. */
    function aiPick() {
      return gmAiPick(board, rank);
    }

    function place(index, who) {
      board[index] = who;
      history.push(index);
      moves += 1;
      renderCell(index, true);
      /* One beat per stone: the clack of it meeting the wood, a ring where it
       * struck, and the counter rolled to its new value rather than teleported. */
      sfx("place");
      beat("ring", cells[index], { hue: who === gmHuman ? 214 : 42 });
      rollCount(movesEl, moves - 1, moves);
      undoBtn.disabled = history.length === 0;
      paintTurn();
      return gmHasWon(board, index % gmSize, Math.floor(index / gmSize), who);
    }

    function playHuman(index) {
      if (over || aiTimer !== null || board[index] !== gmEmpty) {
        return;
      }
      var won = place(index, gmHuman);
      if (won) {
        win(index);
        return;
      }
      if (moves >= gmSize * gmSize) {
        draw();
        return;
      }
      say(t("gomokuAiTurn"));
      aiTimer = window.setTimeout(playAi, 260);
      paintTurn();
    }

    function playAi() {
      aiTimer = null;
      if (over) {
        return;
      }
      var index = aiPick();
      if (index < 0) {
        draw();
        return;
      }
      var won = place(index, gmAi);
      if (won) {
        lose(index);
        return;
      }
      if (moves >= gmSize * gmSize) {
        draw();
        return;
      }
      say(t("gomokuYourTurn"));
      paintTurn();
    }

    /* A round ending arrives as a ceremony over the board. Every word in it is
     * copy the game already ships; only the numbers are new. */
    function ceremony(tone, stars, title, lastLine) {
      var host = panelEl || boardEl.parentNode;
      if (typeof fx.ceremony !== "function") {
        return;
      }
      var lines = [
        t("hudMoves") + ": " + moves,
        t("campaignStars", {
          n: campaign.totalStars(),
          max: campaign.maxStars(),
        }),
      ];
      if (lastLine) {
        lines.push(String(lastLine));
      }
      dismissRound = fx.ceremony(host, {
        tone: tone,
        stars: stars,
        title: title,
        lines: lines,
      });
    }

    /* The plate has to land after the stroke, not over it: the win line is the
     * read-out, the ceremony is the applause. One tracked one-shot, cleared by
     * any new round, so nothing is left armed behind a hidden panel. */
    function endRound(tone, stars, title) {
      window.clearTimeout(roundTimer);
      roundTimer = window.setTimeout(
        function () {
          roundTimer = null;
          ceremony(tone, stars, title);
        },
        winRun.length > 1 ? 820 : 140,
      );
    }

    function win(index) {
      over = true;
      var starsWon = starsFor(moves, rank.starMoves, "low");
      var outcome = campaign.record(rank.id, {
        stars: starsWon,
        best: moves,
        better: "low",
      });
      var streakKey = "gomoku-win-streak";
      localStorage.setItem(streakKey, String(readInt(streakKey) + 1));
      var message =
        t("gomokuWin", { name: t(rank.labelKey), n: moves }) +
        (outcome.isBest ? " " + t("newBest") : "");
      if (outcome.unlockedNext) {
        message += " " + t("gomokuNextRank");
      } else if (campaign.clearedCount() === gmRanks.length) {
        message += " " + t("gomokuAllRanks");
      }
      say(message, "win");
      /* Ring the five and draw the stroke through them before the plate lands,
       * so the read is "these stones won", not "a banner appeared". */
      winRun = gmWinRun(board, index % gmSize, Math.floor(index / gmSize), gmHuman);
      renderAll();
      refreshRank();
      drawWinLine();
      logAction(t("logGomoku", { n: moves }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      beat("burst", cells[index], { kind: "star", count: 12, hue: 46 });
      endRound("win", starsWon, t("gomokuWin", { name: t(rank.labelKey), n: moves }));
    }

    function lose(index) {
      over = true;
      localStorage.setItem("gomoku-win-streak", "0");
      say(t("gomokuLoss", { name: t(rank.labelKey) }), "lose");
      /* Show what you missed: the line runs through the rank's five. */
      winRun = gmWinRun(board, index % gmSize, Math.floor(index / gmSize), gmAi);
      renderAll();
      refreshRank();
      drawWinLine();
      logAction(t("logGomoku", { n: "\u2014" }));
      petNotifyGame(false);
      beat("flash", boardEl, { hue: 2 });
      beat("jolt", panelEl || boardEl.parentNode, { dist: 5 });
      endRound("lose", 0, t("gomokuLoss", { name: t(rank.labelKey) }));
    }

    function draw() {
      over = true;
      winRun = [];
      say(t("gomokuDraw"));
      renderAll();
      endRound("clear", 0, t("gomokuDraw"));
    }

    undoBtn.addEventListener("click", function () {
      if (history.length === 0 || over) {
        return;
      }
      window.clearTimeout(aiTimer);
      aiTimer = null;
      /* Undo walks back a full round: the AI's answer and your move. */
      var undoCount = board[history[history.length - 1]] === gmAi ? 2 : 1;
      for (var step = 0; step < undoCount && history.length; step += 1) {
        var index = history.pop();
        board[index] = gmEmpty;
        moves -= 1;
        renderCell(index);
      }
      over = false;
      renderAll();
      say(t("gomokuYourTurn"));
      /* The lifted stones are the feedback; the button confirms it took. */
      sfx("step");
      beat("pop", undoBtn, { scale: 1.08, ms: 200 });
    });

    newBtn.addEventListener("click", function () {
      sfx("flip");
      newGame();
    });

    rankSel.addEventListener("change", function () {
      var index = campaign.indexOf(rankSel.value);
      if (index >= 0 && campaign.isUnlocked(rankSel.value)) {
        sfx("select");
        newGame(gmRanks[index]);
      }
    });

    buildBoard();
    buildTurnRow();
    newGame(rank);
  }


  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so ranks 1-6 keep the shared dictionary's wording and
   * only the four new habits are carried here. */
  App.addStrings({
    en: {
      "gomokuRank7": "The Gap Reader",
      "gomokuRank8": "The Twin Fork",
      "gomokuRank9": "The Early Block",
      "gomokuRank10": "The Patient Hand",
      "gomokuRank11": "深算手",
      "gomokuRank12": "长梯手",
      "gomokuRank13": "耐心织网",
      "gomokuRank14": "静中筑势",
      "gomokuRank15": "无尽棋盘",      "gomokuRank11": "The Deep Reader",
      "gomokuRank12": "The Long Ladder",
      "gomokuRank13": "The Patient Web",
      "gomokuRank14": "The Quiet Build",
      "gomokuRank15": "The Endless Board",    },
    zh: {
      "gomokuRank7": "读断点",
      "gomokuRank8": "双活三",
      "gomokuRank9": "提前堵",
      "gomokuRank10": "弃四留三",
    },
  });

  /* Exported for the other modules. */
  App.initGomokuGame = initGomokuGame;
})(window.CapitalConvert = window.CapitalConvert || {});
