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
  /* Three ranks, three campaigns: the novice blinks, the reader
   * defends, the fortune does both and counts your tempo. */
  var gmRanks = [
    { id: "r1", labelKey: "gomokuRank1", noise: 260, defense: 0.55, starMoves: [14, 20, 30] },
    { id: "r2", labelKey: "gomokuRank2", noise: 60, defense: 0.95, starMoves: [18, 26, 38] },
    { id: "r3", labelKey: "gomokuRank3", noise: 0, defense: 1.1, starMoves: [24, 34, 48] },
    { id: "r4", labelKey: "gomokuRank4", noise: 0, defense: 1.7, starMoves: [26, 38, 54] },
    { id: "r5", labelKey: "gomokuRank5", noise: 0, defense: 2.6, starMoves: [30, 44, 62] },
    { id: "r6", labelKey: "gomokuRank6", noise: 0, defense: 4, starMoves: [34, 50, 70] },
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
   * plays there: run length plus how many ends of it stay open. */
  function gmAxisScore(board, x, y, dx, dy, who) {
    var run = 1;
    var openEnds = 0;
    var step;
    var nx;
    var ny;
    for (step = 1; step < 6; step += 1) {
      nx = x + dx * step;
      ny = y + dy * step;
      if (!gmInBounds(nx, ny)) {
        break;
      }
      if (board[nx + ny * gmSize] === who) {
        run += 1;
      } else {
        if (board[nx + ny * gmSize] === gmEmpty) {
          openEnds += 1;
        }
        break;
      }
    }
    for (step = 1; step < 6; step += 1) {
      nx = x - dx * step;
      ny = y - dy * step;
      if (!gmInBounds(nx, ny)) {
        break;
      }
      if (board[nx + ny * gmSize] === who) {
        run += 1;
      } else {
        if (board[nx + ny * gmSize] === gmEmpty) {
          openEnds += 1;
        }
        break;
      }
    }
    if (run >= 5) {
      return 10000000;
    }
    if (run === 4) {
      return openEnds === 2 ? 1000000 : openEnds === 1 ? 100000 : 0;
    }
    if (run === 3) {
      return openEnds === 2 ? 10000 : openEnds === 1 ? 1000 : 0;
    }
    if (run === 2) {
      return openEnds === 2 ? 100 : openEnds === 1 ? 10 : 0;
    }
    return openEnds ? 1 : 0;
  }

  function gmCellScore(board, x, y, who) {
    var total = 0;
    gmDirs.forEach(function (axis) {
      total += gmAxisScore(board, x, y, axis[0], axis[1], who);
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
      board = [];
      for (var index = 0; index < gmSize * gmSize; index += 1) {
        board.push(gmEmpty);
      }
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

    function aiPick() {
      var bestScore = -1;
      var best = -1;
      for (var index = 0; index < board.length; index += 1) {
        if (board[index] !== gmEmpty) {
          continue;
        }
        var x = index % gmSize;
        var y = Math.floor(index / gmSize);
        /* Only fight near the action; the far empty board is noise. */
        var nearStone = false;
        for (var dy = -2; dy <= 2 && !nearStone; dy += 1) {
          for (var dx = -2; dx <= 2; dx += 1) {
            var nx = x + dx;
            var ny = y + dy;
            if (
              gmInBounds(nx, ny) &&
              board[nx + ny * gmSize] !== gmEmpty
            ) {
              nearStone = true;
              break;
            }
          }
        }
        if (!nearStone) {
          continue;
        }
        var attack = gmCellScore(board, x, y, gmAi);
        var defense = gmCellScore(board, x, y, gmHuman);
        var centerBias =
          6 - Math.max(Math.abs(x - gmSize / 2), Math.abs(y - gmSize / 2));
        var value =
          attack + defense * rank.defense + centerBias + Math.random() * rank.noise;
        if (value > bestScore) {
          bestScore = value;
          best = index;
        }
      }
      if (best === -1) {
        for (var free = 0; free < board.length; free += 1) {
          if (board[free] === gmEmpty) {
            return free;
          }
        }
      }
      return best;
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


  /* Exported for the other modules. */
  App.initGomokuGame = initGomokuGame;
})(window.CapitalConvert = window.CapitalConvert || {});
