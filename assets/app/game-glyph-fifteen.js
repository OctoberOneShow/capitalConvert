/* Glyph Fifteen - The sliding-tile campaign in the shared game drawer.
 * Deals are shuffled by legal walks from the solved grid, so every board
 * is solvable by construction; the checks replay the walks.
 *
 * Presentation contract for this board, in words: a slide is a transform, not a
 * repaint. Every plate is a view that eases along its own row or column into the
 * gap, and a run of plates leaves the gap outward like a train. The three states
 * a player reads are shapes rather than hues - chevrons point at the gap from a
 * plate that can travel, a plate at home sits seated with a lit rim and a check
 * notch, and a plate that cannot move any more is sunk below the tray line under
 * four rivets. One or two plates short of the end the board teases: dashed rails
 * run from each stray plate to its socket. The final slide cascades every plate
 * home in turn, and only then does the ceremony land. */
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
  var art = App.art;
  var playSfx = typeof App.playSfx === "function" ? App.playSfx : function () {};
  var rootEl = document.documentElement;

  /* The feel layer is loaded ahead of this module on every page, but a game can
   * still be booted alone in the stub harness, so a missing voice must never
   * cost a turn. */
  var fx = (function (src) {
    var names = [
      "pop", "shake", "ring", "burst", "floatText", "stagger", "countUp",
      "sweep", "jolt", "flash", "ceremony", "callout",
    ];
    var out = {};
    for (var i = 0; i < names.length; i += 1) {
      out[names[i]] =
        src && typeof src[names[i]] === "function"
          ? src[names[i]]
          : function () {};
    }
    return out;
  })(App.fx);

  var ftSize = 320;
  var FT_GRID = 4;
  /* Tray margin in canvas units - the room the rim, the bolts and the groove
   * ticks live in. The playfield stays centred inside it. */
  var TRAY = 20;
  var DEAL_MS = 330;
  var DEAL_STEP = 26;
  var DEAL_HOLD = 260;
  var SLIDE_MS = 205;
  var RUN_STEP = 40;
  var SETTLE_MS = 260;
  var WAVE_MS = 320;
  var WAVE_STEP = 62;
  var WAVE_TAIL = 340;
  var DENY_MS = 460;
  var MARK_MS = 620;
  var TEASE_AT = 3;
  var AMBER = "38";
  var HOME_HUE = "142";

  /* Star thresholds are slide counts [3-star, 2-star, 1-star]. */
  var ftLevels = [
    { id: "t1", labelKey: "ftL1", grid: 3, walk: 60, starMoves: [24, 40, 70] },
    { id: "t2", labelKey: "ftL2", grid: 3, walk: 130, starMoves: [28, 46, 80] },
    { id: "t3", labelKey: "ftL3", grid: 3, walk: 220, starMoves: [32, 52, 90] },
    { id: "t4", labelKey: "ftL4", grid: 4, walk: 300, starMoves: [80, 140, 220] },
    { id: "t5", labelKey: "ftL5", grid: 4, walk: 440, starMoves: [95, 160, 260] },
    { id: "t6", labelKey: "ftL6", grid: 4, walk: 600, starMoves: [110, 180, 300] },
    { id: "t7", labelKey: "ftL7", grid: 4, walk: 800, starMoves: [130, 215, 340] },
    { id: "t8", labelKey: "ftL8", grid: 4, walk: 1000, starMoves: [150, 250, 400] },
  ];

  function easeOut(k) {
    return 1 - Math.pow(1 - k, 3);
  }

  function calmMotion() {
    return App.isMotionOff
      ? !!App.isMotionOff()
      : rootEl.getAttribute("data-motion") === "off";
  }

  function makeView(value) {
    return {
      value: value,
      x: 0,
      y: 0,
      /* tw: the in-flight tween {fx, fy, tx, ty, at, ms}; null once landed. */
      tw: null,
      toX: 0,
      toY: 0,
      land: -1e9,
      punch: -1e9,
      jolt: -1e9,
      wave: -1e9,
      waved: true,
      intro: 1,
      atHome: false,
      voice: "",
      train: null,
    };
  }

  function initGlyphFifteenGame() {
    var canvas = getElement("ftCanvas");
    var movesEl = getElement("ftMoves");
    var placedEl = getElement("ftPlaced");
    var timeEl = getElement("ftTime");
    var resultEl = getElement("ftResult");
    var startBtn = getElement("ftNewBtn");
    var bestEl = getElement("ftBest");
    var selectEl = getElement("ftLevelSel");
    if (
      !canvas ||
      !movesEl ||
      !placedEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var ctx = canvas.getContext("2d");
    var panelEl = getElement("gamePanelGlyphFifteen") || canvas.parentNode;
    var campaign = createCampaign({ key: "glyph-fifteen-campaign", levels: ftLevels });
    var level = ftLevels[0];
    var gridN = 3;
    var tiles = [];
    var blank = 0;
    var moves = 0;
    var solved = false;
    var rafId = null;
    var startedAt = 0;
    var clockRunning = false;

    /* ---- drawn state (presentation only; the board above stays the truth) ---- */
    var views = [];
    var cues = [];
    var denies = [];
    var marks = [];
    var cells = [];
    var hover = -1;
    var teasing = false;
    var celebrating = null;
    var pendingFinish = null;
    var dismissCeremony = null;
    var lastStars = -1;
    var lastPlaced = 0;
    var lastMoves = 0;
    var hue = 196;
    var lightTheme = false;
    var still = false;

    var stage = document.createElement("div");
    stage.className = "ft-stage";
    var bezel = document.createElement("div");
    bezel.className = "ft-bezel";
    var anchorLayer = document.createElement("div");
    anchorLayer.className = "ft-anchors";

    /* ---- mount: the canvas gets a stage to sit on so per-cell fx have a
     * coordinate space. The woven mat lives in the bezel ring, because the
     * canvas paints its tray edge to edge and would hide anything behind it. */
    function mount() {
      var parent = canvas.parentNode;
      if (parent) {
        parent.insertBefore(stage, canvas);
      }
      if (art && art.pattern) {
        try {
          bezel.appendChild(art.pattern("weave", { hue: hue, tile: 12 }));
        } catch (error) {
          /* A missing illustration layer must not cost the board. */
        }
      }
      stage.appendChild(bezel);
      stage.appendChild(canvas);
      stage.appendChild(anchorLayer);
      labelChips();
    }

    /* The three chips read as words only; a mark per chip says which number is
     * which at a glance and keeps the read-out legible without colour. */
    function labelChips() {
      if (!art || !art.icon) {
        return;
      }
      var hud = movesEl.parentNode ? movesEl.parentNode.parentNode : null;
      if (!hud || !hud.children) {
        return;
      }
      var names = ["arrow", "target", "hourglass"];
      for (var i = 0; i < hud.children.length && i < names.length; i += 1) {
        var chip = hud.children[i];
        if (!chip || !chip.appendChild || !chip.ownerDocument) {
          continue;
        }
        if (chip.querySelector && chip.querySelector(".ft-chip-mark")) {
          continue;
        }
        var svg = art.icon(names[i], { hue: hue, size: 15, cls: "ft-chip-mark" });
        if (svg.setAttribute) {
          svg.setAttribute("class", "art-icon ft-chip-mark");
        }
        chip.appendChild(svg);
      }
    }

    /* Pure deal generator, exported for the checks: walk the blank legally
     * from the solved grid. Returns the tile layout as a flat array where
     * 0 marks the blank. */
    function ftShuffle(n, walk) {
      var board = [];
      var total = n * n;
      for (var i = 0; i < total; i += 1) {
        board.push((i + 1) % total);
      }
      var pos = total - 1;
      var lastDir = -1;
      var DX = [1, 0, -1, 0];
      var DY = [0, 1, 0, -1];
      var steps = 0;
      var guard = 0;
      while (steps < walk && guard < walk * 40) {
        guard += 1;
        var dir = Math.floor(Math.random() * 4);
        if (dir === lastDir) {
          continue;
        }
        var x = pos % n;
        var y = Math.floor(pos / n);
        var mx = x + DX[dir];
        var my = y + DY[dir];
        if (mx < 0 || my < 0 || mx >= n || my >= n) {
          continue;
        }
        var src = my * n + mx;
        board[pos] = board[src];
        board[src] = 0;
        pos = src;
        lastDir = (dir + 2) % 4;
        steps += 1;
      }
      var done = true;
      for (var k = 0; k < total; k += 1) {
        if (board[k] !== (k + 1) % total) {
          done = false;
          break;
        }
      }
      if (done) {
        return ftShuffle(n, walk);
      }
      return { board: board, blank: pos, walk: steps };
    }
    App.glyphFifteenShuffle = ftShuffle;

    function homeIndexOf(value) {
      return value === 0 ? gridN * gridN - 1 : value - 1;
    }

    function placedCount() {
      var placed = 0;
      for (var i = 0; i < tiles.length; i += 1) {
        if (i !== blank && tiles[i] === (i + 1) % tiles.length) {
          placed += 1;
        }
      }
      return placed;
    }

    /* ---------------------------------------------------------------- HUD */

    function renderChips() {
      var placed = placedCount();
      if (moves !== lastMoves) {
        fx.countUp(movesEl, lastMoves, moves, { ms: 260 });
        lastMoves = moves;
      } else {
        movesEl.textContent = String(moves);
      }
      placedEl.textContent = placed + "/" + (tiles.length - 1);
      if (placed > lastPlaced) {
        fx.pop(placedEl, { scale: 1.2, ms: 240 });
        mark(placedEl.parentNode, "is-bump", MARK_MS);
      }
      lastPlaced = placed;
      watchTease(placed);
    }

    function renderClock() {
      timeEl.textContent = clockRunning
        ? ((Date.now() - startedAt) / 1000).toFixed(1) + "s"
        : timeEl.textContent;
    }

    function renderHud() {
      renderChips();
      renderClock();
    }

    /* A chip class that clears itself on the frame loop, so the module keeps no
     * timer of its own behind a hidden panel. */
    function mark(node, cls, ms) {
      if (!node || !node.classList) {
        return;
      }
      node.classList.add(cls);
      marks.push({ node: node, cls: cls, until: Date.now() + (ms || MARK_MS) });
    }

    function clearMarks() {
      for (var i = 0; i < marks.length; i += 1) {
        if (marks[i].node.classList) {
          marks[i].node.classList.remove(marks[i].cls);
        }
      }
      marks = [];
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
      if (lastStars >= 0 && campaign.totalStars() > lastStars) {
        fx.pop(bestEl, { scale: 1.14, ms: 240 });
      }
      lastStars = campaign.totalStars();
    }

    /* ---------------------------------------------------------------- theme */

    function readTheme() {
      lightTheme = rootEl.getAttribute("data-theme") === "light";
      var value = "";
      try {
        if (window.getComputedStyle && panelEl) {
          value = window.getComputedStyle(panelEl).getPropertyValue("--gp-hue");
        }
      } catch (error) {
        value = "";
      }
      hue = parseInt(value, 10);
      if (!(hue >= 0 && hue < 360)) {
        hue = 196;
      }
    }

    function tint(h, s, l, a) {
      return "hsla(" + h + ", " + s + "%, " + l + "%, " + a + ")";
    }

    function palette() {
      var floorL = lightTheme ? 30 : 13;
      return {
        trayTop: tint(hue, 28, floorL + 11, 1),
        trayBottom: tint(hue, 32, floorL - 5, 1),
        rim: tint(hue, 80, lightTheme ? 82 : 74, 0.26),
        groove: tint(hue, 60, lightTheme ? 88 : 80, 0.07),
        socket: lightTheme ? "rgba(9, 14, 24, 0.5)" : "rgba(5, 9, 16, 0.6)",
        socketLip: tint(hue, 70, 84, lightTheme ? 0.1 : 0.08),
        bolt: tint(hue, 22, floorL + 26, 1),
        strayTop: tint(hue, 76, lightTheme ? 66 : 60, 1),
        strayFace: tint(hue, 72, lightTheme ? 52 : 46, 1),
        strayEdge: tint(hue, 80, 14, 0.9),
        homeTop: tint(HOME_HUE, 58, lightTheme ? 66 : 62, 1),
        homeFace: tint(HOME_HUE, 50, lightTheme ? 50 : 44, 1),
        homeEdge: tint(HOME_HUE, 60, 14, 0.85),
        lockTop: tint(hue, 24, lightTheme ? 44 : 38, 1),
        lockFace: tint(hue, 26, lightTheme ? 30 : 25, 1),
        lockEdge: "rgba(0, 0, 0, 0.55)",
        inkDark: "rgba(7, 13, 22, 0.92)",
        inkLight: tint(hue, 30, 94, 0.9),
      };
    }

    /* ---------------------------------------------------------------- board */

    function loadLevel(levelDef) {
      level = levelDef;
      gridN = level.grid;
      var deal = ftShuffle(gridN, level.walk);
      tiles = deal.board;
      blank = deal.blank;
      moves = 0;
      solved = false;
      clockRunning = false;
      startedAt = Date.now();
      celebrating = null;
      pendingFinish = null;
      denies = [];
      hover = -1;
      closeCeremony();
      readTheme();
      buildCells();
      buildViews(true);
      lastPlaced = placedCount();
      lastMoves = 0;
      renderChips();
      refreshPicker();
      setTease(false);
      startLoop();
      draw(Date.now());
      resultEl.textContent = t("ftReady", { n: gridN * gridN - 1 });
      if (resultEl.classList) {
        resultEl.classList.remove("is-win");
        resultEl.classList.remove("is-almost");
      }
      playSfx("flip");
    }

    /* One anchor box per cell: the fx layer needs real elements to hang rings,
     * sparks and floating numbers off, and the board is a canvas. Percentages
     * keep them honest at any rendered width. */
    function buildCells() {
      if (anchorLayer.parentNode !== stage) {
        stage.appendChild(anchorLayer);
      }
      while (anchorLayer.firstChild) {
        anchorLayer.removeChild(anchorLayer.firstChild);
      }
      cells = [];
      var geo = geometry();
      var pct = 100 / ftSize;
      for (var i = 0; i < gridN * gridN; i += 1) {
        var node = document.createElement("span");
        node.className = "ft-anchor";
        node.style.left = (geo.x0 + (i % gridN) * geo.cell) * pct + "%";
        node.style.top = (geo.y0 + Math.floor(i / gridN) * geo.cell) * pct + "%";
        node.style.width = geo.cell * pct + "%";
        node.style.height = geo.cell * pct + "%";
        anchorLayer.appendChild(node);
        cells.push(node);
      }
    }

    function anchorAt(index) {
      return cells[index] || anchorLayer;
    }

    /* Views are keyed by tile value so a plate keeps its identity - and its
     * drawn position - across every slide. */
    function buildViews(dealt) {
      var total = gridN * gridN;
      var now = Date.now();
      views = [];
      for (var v = 0; v < total; v += 1) {
        views.push(makeView(v));
      }
      for (var i = 0; i < tiles.length; i += 1) {
        var value = tiles[i];
        if (!value) {
          continue;
        }
        var view = views[value];
        var x = i % gridN;
        var y = Math.floor(i / gridN);
        view.toX = x;
        view.toY = y;
        if (dealt && !calmMotion()) {
          /* The deal: plates drop in from the tray lip, gap first. */
          view.x = x - 0.18;
          view.y = y - 1.35;
          view.intro = 0;
          view.tw = { fx: view.x, fy: view.y, tx: x, ty: y, at: now + i * DEAL_STEP, ms: DEAL_MS };
          view.voice = i % 3 === 0 ? "step" : "";
        } else {
          view.x = x;
          view.y = y;
          view.intro = 1;
        }
      }
      if (dealt && !calmMotion()) {
        var span = (total - 1) * DEAL_STEP + DEAL_MS + DEAL_HOLD;
        dealDoneAt = now + span;
        cue(now + span, "deal", null);
      }
    }

    function isSolved() {
      for (var i = 0; i < tiles.length; i += 1) {
        if (tiles[i] !== (i + 1) % tiles.length) {
          return false;
        }
      }
      return true;
    }

    function canTravel(index) {
      var tx = index % gridN;
      var ty = Math.floor(index / gridN);
      var bx = blank % gridN;
      var by = Math.floor(blank / gridN);
      return tx === bx || ty === by;
    }

    /* ---- near solve: the board starts pointing at the end ---- */

    function strayList() {
      var out = [];
      for (var i = 0; i < tiles.length; i += 1) {
        if (i === blank) {
          continue;
        }
        if (tiles[i] !== (i + 1) % tiles.length) {
          out.push({ index: i, value: tiles[i], target: homeIndexOf(tiles[i]) });
        }
      }
      return out;
    }

    function setTease(on) {
      if (teasing === on) {
        return;
      }
      teasing = on;
      if (stage.classList) {
        if (on) {
          stage.classList.add("is-near");
        } else {
          stage.classList.remove("is-near");
        }
      }
      if (resultEl.classList) {
        if (on) {
          resultEl.classList.add("is-almost");
        } else {
          resultEl.classList.remove("is-almost");
        }
      }
      if (placedEl.parentNode && placedEl.parentNode.classList) {
        if (on) {
          placedEl.parentNode.classList.add("is-near");
        } else {
          placedEl.parentNode.classList.remove("is-near");
        }
      }
    }

    function watchTease(placed) {
      if (solved) {
        return;
      }
      var stray = tiles.length - 1 - placed;
      var next = stray > 0 && stray <= TEASE_AT;
      if (next && !teasing) {
        setTease(true);
        playSfx("tick");
        var strays = strayList();
        for (var i = 0; i < strays.length && i < 3; i += 1) {
          fx.ring(anchorAt(strays[i].target), { hue: 38 });
        }
        fx.pop(placedEl, { scale: 1.16, ms: 260 });
      } else if (!next && teasing) {
        setTease(false);
      }
    }

    /* ---------------------------------------------------------------- turn */

    function checkCleared() {
      if (solved || !isSolved()) {
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
      var message = t("ftCleared", { n: moves, stars: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("ftNextBoard");
      } else if (campaign.clearedCount() === ftLevels.length) {
        message += " " + t("ftCampaignDone");
      }
      setTease(false);
      logAction(t("logGlyphFifteen", { n: moves }));
      petNotifyGame(outcome.isBest || outcome.firstClear);
      pendingFinish = {
        message: message,
        stars: starsWon,
        title: t(level.labelKey),
        lines: [t("ftCleared", { n: moves, stars: starsWon })].concat(
          outcome.isBest ? [t("newBest")] : [],
        ),
        nextId: outcome.unlockedNext || level.id,
        isBest: !!outcome.isBest,
        firstClear: !!outcome.firstClear,
        confetti: true,
      };
      cascadeHome(Date.now());
    }

    /* The plates do not simply stop - they are called home one after the next
     * along the reading order, and the ceremony waits for the last one. */
    function cascadeHome(now) {
      var tail = 0;
      for (var i = 0; i < tiles.length; i += 1) {
        var value = tiles[i];
        if (!value) {
          continue;
        }
        var view = views[value];
        if (!view) {
          continue;
        }
        var lead = 140 + i * WAVE_STEP;
        if (view.tw) {
          lead += (view.tw.at - now > 0 ? view.tw.at - now : 0) + view.tw.ms;
        }
        view.wave = now + lead;
        view.waved = false;
        tail = Math.max(tail, lead + WAVE_MS);
      }
      celebrating = { at: now, end: now + tail + WAVE_TAIL };
      playSfx("merge");
      cue(now + tail + WAVE_TAIL, "finish", null);
    }

    function finishSolve(quiet) {
      var plan = pendingFinish;
      pendingFinish = null;
      celebrating = null;
      if (!plan) {
        return;
      }
      if (plan.confetti) {
        var rect = startBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
      loadLevel(ftLevels[campaign.indexOf(plan.nextId)]);
      resultEl.textContent = plan.message;
      if (resultEl.classList) {
        resultEl.classList.add("is-win");
      }
      if (quiet) {
        return;
      }
      fx.sweep(startBtn);
      dismissCeremony = fx.ceremony(panelEl, {
        tone: "win",
        stars: plan.stars,
        title: plan.title,
        lines: plan.lines,
      });
    }

    /* A slide moves exactly one plate into the gap; `beat` staggers the plates
     * of a run so the row leaves the gap outward instead of snapping. */
    function slide(tileIndex, beat) {
      if (solved || tileIndex < 0 || tileIndex >= tiles.length) {
        return false;
      }
      var tx = tileIndex % gridN;
      var ty = Math.floor(tileIndex / gridN);
      var bx = blank % gridN;
      var by = Math.floor(blank / gridN);
      if (Math.abs(tx - bx) + Math.abs(ty - by) !== 1) {
        return false;
      }
      var value = tiles[tileIndex];
      var from = blankOf(tileIndex);
      var target = views[value];
      tiles[blank] = tiles[tileIndex];
      tiles[tileIndex] = 0;
      var landed = blank;
      blank = tileIndex;
      moves += 1;
      if (target) {
        var now = Date.now();
        var ms = calmMotion() ? 0 : SLIDE_MS;
        target.x = from.x;
        target.y = from.y;
        target.toX = landed % gridN;
        target.toY = Math.floor(landed / gridN);
        target.tw = {
          fx: from.x,
          fy: from.y,
          tx: target.toX,
          ty: target.toY,
          at: now + (calmMotion() ? 0 : (beat || 0) * RUN_STEP),
          ms: ms,
        };
        target.voice = beat ? "step" : "tap";
        target.train = runTracker;
        still = false;
      }
      if (!clockRunning) {
        clockRunning = true;
        startedAt = Date.now();
      }
      renderHud();
      checkCleared();
      return true;
    }

    function blankOf(index) {
      return { x: index % gridN, y: Math.floor(index / gridN) };
    }

    var runTracker = null;

    /* Click a tile in the blank's row or column: the whole run slides. */
    function slideRun(tileIndex) {
      if (solved) {
        return;
      }
      var tx = tileIndex % gridN;
      var ty = Math.floor(tileIndex / gridN);
      var bx = blank % gridN;
      var by = Math.floor(blank / gridN);
      if (tx !== bx && ty !== by) {
        denyTile(tileIndex);
        return;
      }
      var step = tx === bx ? (ty < by ? -gridN : gridN) : tx < bx ? -1 : 1;
      runTracker = { landed: 0, total: 0, gain: placedCount(), closed: false };
      var cur = blank;
      var beat = 0;
      while (cur !== tileIndex) {
        var next = cur - step;
        if (!slide(next, beat)) {
          break;
        }
        cur = next;
        beat += 1;
        runTracker.total = beat;
      }
      runTracker.closed = true;
      /* The plates keep their own reference to the train; the module-level one
       * is released so a later single slide cannot join a finished run. */
      runTracker = null;
    }

    /* The "no" gesture for a plate that cannot move: it rattles in its socket,
     * throws a cross, and the gap answers with a ring so the eye is redirected. */
    function denyTile(index) {
      var value = tiles[index];
      var view = value ? views[value] : null;
      var now = Date.now();
      if (view) {
        view.jolt = now;
      }
      denies.push({ index: index, at: now });
      playSfx("wrong");
      fx.floatText(anchorAt(index), "\u2715", { kind: "bad" });
      still = false;
    }

    /* ---------------------------------------------------------------- draw */

    function geometry() {
      var cell = Math.floor((ftSize - TRAY * 2) / gridN);
      return {
        cell: cell,
        x0: Math.round((ftSize - cell * gridN) / 2),
        y0: Math.round((ftSize - cell * gridN) / 2),
      };
    }

    function path(x, y, w, h, r) {
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, r);
        return;
      }
      ctx.rect(x, y, w, h);
    }

    function bolt(x, y, r, face) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y - r * 0.14, r * 0.76, 0, Math.PI * 2);
      ctx.fillStyle = face;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - r * 0.45, y);
      ctx.lineTo(x + r * 0.45, y);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = Math.max(1, r * 0.34);
      ctx.stroke();
    }

    function checkNotch(x, y, r, color) {
      ctx.beginPath();
      ctx.moveTo(x - r, y);
      ctx.lineTo(x - r * 0.25, y + r * 0.72);
      ctx.lineTo(x + r, y - r * 0.8);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.4, r * 0.45);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    function chevron(x, y, size, dx, dy, color) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(dy, dx));
      ctx.beginPath();
      ctx.moveTo(-size * 0.45, -size);
      ctx.lineTo(size * 0.5, 0);
      ctx.lineTo(-size * 0.45, size);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.3, size * 0.4);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.restore();
    }

    function drawTray(geo, now) {
      var p = palette();
      var g = ctx.createLinearGradient(0, 0, 0, ftSize);
      g.addColorStop(0, p.trayTop);
      g.addColorStop(1, p.trayBottom);
      path(1.5, 1.5, ftSize - 3, ftSize - 3, 16);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = p.rim;
      ctx.stroke();
      path(6, 6, ftSize - 12, ftSize - 12, 12);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
      ctx.stroke();

      /* Groove ticks along the tray edge: the marks a cut board would have. */
      ctx.strokeStyle = p.groove;
      ctx.lineWidth = 1;
      for (var i = 0; i <= gridN; i += 1) {
        var gx = geo.x0 + i * geo.cell;
        var gy = geo.y0 + i * geo.cell;
        ctx.beginPath();
        ctx.moveTo(gx, geo.y0 - 7);
        ctx.lineTo(gx, geo.y0 - 3);
        ctx.moveTo(gx, geo.y0 + geo.cell * gridN + 3);
        ctx.lineTo(gx, geo.y0 + geo.cell * gridN + 7);
        ctx.moveTo(geo.x0 - 7, gy);
        ctx.lineTo(geo.x0 - 3, gy);
        ctx.moveTo(geo.x0 + geo.cell * gridN + 3, gy);
        ctx.lineTo(geo.x0 + geo.cell * gridN + 7, gy);
        ctx.stroke();
      }
      var inset = TRAY * 0.52;
      bolt(inset, inset, geo.cell * 0.05, p.bolt);
      bolt(ftSize - inset, inset, geo.cell * 0.05, p.bolt);
      bolt(inset, ftSize - inset, geo.cell * 0.05, p.bolt);
      bolt(ftSize - inset, ftSize - inset, geo.cell * 0.05, p.bolt);

      if (celebrating && !calmMotion()) {
        /* A sheen crosses the tray while the plates are called home. */
        var k = (now - celebrating.at) / (celebrating.end - celebrating.at);
        if (k > 0 && k < 1) {
          var sweep = ctx.createLinearGradient(0, ftSize * (k * 2.4 - 1.2), ftSize, ftSize * (k * 2.4 - 0.2));
          sweep.addColorStop(0, "rgba(255, 255, 255, 0)");
          sweep.addColorStop(0.5, "rgba(255, 255, 255, 0.16)");
          sweep.addColorStop(1, "rgba(255, 255, 255, 0)");
          path(1.5, 1.5, ftSize - 3, ftSize - 3, 16);
          ctx.fillStyle = sweep;
          ctx.fill();
        }
      }
    }

    function drawSockets(geo, now) {
      var p = palette();
      var gap = geo.cell * 0.055;
      for (var i = 0; i < gridN * gridN; i += 1) {
        var x = geo.x0 + (i % gridN) * geo.cell + gap;
        var y = geo.y0 + Math.floor(i / gridN) * geo.cell + gap;
        var w = geo.cell - gap * 2;
        path(x, y, w, w, w * 0.16);
        ctx.fillStyle = p.socket;
        ctx.fill();
        /* one lit lip at the bottom: the socket has depth, not just a fill */
        ctx.beginPath();
        ctx.moveTo(x + w * 0.16, y + w - 1);
        ctx.lineTo(x + w * 0.84, y + w - 1);
        ctx.strokeStyle = p.socketLip;
        ctx.lineWidth = 1;
        ctx.stroke();
        if (i === blank && !solved) {
          var pulse = calmMotion() ? 0.5 : 0.5 + Math.sin(now / 420) * 0.18;
          path(x + 4, y + 4, w - 8, w - 8, (w - 8) * 0.16);
          ctx.strokeStyle = tint(hue, 90, 72, 0.16 + pulse * 0.22);
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }
    }

    function drawGuides(geo, now) {
      var strays = strayList();
      var cell = geo.cell;
      for (var i = 0; i < strays.length && i < 3; i += 1) {
        var view = views[strays[i].value];
        if (!view) {
          continue;
        }
        var fromX = geo.x0 + (view.x + 0.5) * cell;
        var fromY = geo.y0 + (view.y + 0.5) * cell;
        var toX = geo.x0 + (strays[i].target % gridN + 0.5) * cell;
        var toY = geo.y0 + (Math.floor(strays[i].target / gridN) + 0.5) * cell;
        ctx.save();
        if (ctx.setLineDash) {
          ctx.setLineDash([5, 6]);
          ctx.lineDashOffset = calmMotion() ? 0 : -((now / 26) % 11);
        }
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.strokeStyle = tint(AMBER, 96, 62, 0.7);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        /* the socket that is wanted, ringed and numbered - a shape cue as much
         * as a colour one */
        var breathe = calmMotion() ? 0 : Math.sin(now / 300 + i) * 0.06;
        ctx.beginPath();
        ctx.arc(toX, toY, cell * (0.44 + breathe), 0, Math.PI * 2);
        ctx.strokeStyle = tint(AMBER, 96, 66, 0.55);
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.font = "bold " + Math.floor(cell * 0.26) + "px 'JetBrains Mono', ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = tint(AMBER, 96, 70, 0.85);
        ctx.fillText(String(strays[i].value), toX, toY + cell * 0.34);
      }
    }

    function drawTile(geo, value, now) {
      var view = views[value];
      if (!view || view.intro <= 0) {
        return;
      }
      var p = palette();
      var cell = geo.cell;
      var total = gridN * gridN;
      var cellIndex = tiles.indexOf(value);
      var atHome = cellIndex >= 0 && value === (cellIndex + 1) % total;
      var inFlight = !!view.tw;
      var travel = cellIndex >= 0 && !inFlight && canTravel(cellIndex);
      /* Two separate readings: rivets mean "this one cannot move", the seated
       * green rim means "this one is where it belongs". A finished row is both. */
      var locked = !inFlight && !travel;
      var sunk = locked && !atHome;
      var lit = atHome || travel || inFlight;
      var size = cell * (1 - 0.11);
      var lift = 0;
      var sx = view.x;
      var punch = (now - view.punch) / SETTLE_MS;
      var wave = (now - view.wave) / WAVE_MS;
      if (punch >= 0 && punch < 1 && !calmMotion()) {
        size *= 1 + Math.sin(Math.PI * punch) * 0.07;
      }
      if (celebrating && wave >= 0 && wave < 1 && !calmMotion()) {
        size *= 1 + Math.sin(Math.PI * wave) * 0.1;
      }
      if (hover >= 0 && tiles[hover] === value && travel && !calmMotion()) {
        lift = -cell * 0.022;
        size *= 1.012;
      }
      var jolt = (now - view.jolt) / DENY_MS;
      if (jolt >= 0 && jolt < 1 && !calmMotion()) {
        sx += Math.sin(jolt * Math.PI * 5) * 0.06 * (1 - jolt);
      }
      var px = geo.x0 + sx * cell + (cell - size) / 2;
      var py = geo.y0 + view.y * cell + (cell - size) / 2 + lift;
      var r = size * 0.17;

      ctx.save();
      ctx.globalAlpha = view.intro;

      if (lit) {
        /* the plate sits above the tray: a cast shadow under the front lip */
        path(px, py + size * 0.09, size, size, r);
        ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
        ctx.fill();
      } else {
        path(px, py, size, size, r);
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fill();
      }

      var top = atHome ? p.homeTop : lit ? p.strayTop : p.lockTop;
      var face = atHome ? p.homeFace : lit ? p.strayFace : p.lockFace;
      var edge = atHome ? p.homeEdge : lit ? p.strayEdge : p.lockEdge;
      var g = ctx.createLinearGradient(0, py, 0, py + size);
      g.addColorStop(0, top);
      g.addColorStop(1, face);
      path(px, py, size, size, r);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = edge;
      ctx.stroke();

      /* Bevel: the lit face, the shaded lip and an inner rim, as art.tile paints. */
      path(px + size * 0.1, py + size * 0.075, size * 0.8, size * 0.21, size * 0.09);
      ctx.fillStyle = lit ? "rgba(255, 255, 255, 0.26)" : "rgba(255, 255, 255, 0.08)";
      ctx.fill();
      path(px + size * 0.1, py + size * 0.7, size * 0.8, size * 0.19, size * 0.08);
      ctx.fillStyle = lit ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.3)";
      ctx.fill();
      path(px + 2.5, py + 2.5, size - 5, size - 5, r * 0.8);
      ctx.lineWidth = 1;
      ctx.strokeStyle = lit ? "rgba(255, 255, 255, 0.13)" : "rgba(255, 255, 255, 0.05)";
      ctx.stroke();

      /* The digit, engraved: a light emboss above a dark face. */
      var cx = px + size / 2;
      var cy = py + size / 2 + size * 0.01;
      ctx.font = "800 " + Math.floor(size * 0.44) + "px 'JetBrains Mono', ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = lit ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.12)";
      ctx.fillText(String(value), cx, cy - size * 0.022);
      ctx.fillStyle = lit ? p.inkDark : p.inkLight;
      ctx.fillText(String(value), cx, cy + size * 0.014);

      if (travel) {
        /* Chevrons point at the gap; a plate one step away shows two. */
        var bx = blank % gridN;
        var by = Math.floor(blank / gridN);
        var tx = cellIndex % gridN;
        var ty = Math.floor(cellIndex / gridN);
        var dx = tx === bx ? 0 : bx > tx ? 1 : -1;
        var dy = ty === by ? 0 : by > ty ? 1 : -1;
        var reach = Math.abs(bx - tx) + Math.abs(by - ty);
        var chev = hover === cellIndex ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.42)";
        var edgeX = cx + dx * size * 0.33;
        var edgeY = cy + dy * size * 0.33;
        chevron(edgeX, edgeY, size * 0.09, dx, dy, chev);
        if (reach === 1) {
          chevron(
            edgeX - dx * size * 0.11,
            edgeY - dy * size * 0.11,
            size * 0.09,
            dx,
            dy,
            "rgba(255, 255, 255, 0.24)",
          );
        }
      }
      if (atHome) {
        path(px + 1.5, py + 1.5, size - 3, size - 3, r);
        ctx.strokeStyle = tint(HOME_HUE, 92, 76, sunk ? 0.34 : 0.6);
        ctx.lineWidth = 1.8;
        ctx.stroke();
        checkNotch(px + size * 0.78, py + size * 0.24, size * 0.085, "rgba(255, 255, 255, 0.72)");
      }
      if (locked) {
        var rr = size * 0.038;
        bolt(px + size * 0.16, py + size * 0.16, rr, "rgba(255, 255, 255, 0.2)");
        bolt(px + size * 0.84, py + size * 0.16, rr, "rgba(255, 255, 255, 0.2)");
        bolt(px + size * 0.16, py + size * 0.84, rr, "rgba(255, 255, 255, 0.2)");
        bolt(px + size * 0.84, py + size * 0.84, rr, "rgba(255, 255, 255, 0.2)");
      }

      if (punch >= 0 && punch < 1 && !calmMotion()) {
        ctx.beginPath();
        ctx.arc(cx, cy, size * (0.52 + punch * 0.2), 0, Math.PI * 2);
        ctx.strokeStyle = atHome
          ? tint(HOME_HUE, 92, 72, (1 - punch) * 0.5)
          : tint(hue, 92, 74, (1 - punch) * 0.35);
        ctx.lineWidth = 2 * (1 - punch) + 0.4;
        ctx.stroke();
      }
      if (celebrating && wave >= 0 && wave < 1 && !calmMotion()) {
        ctx.beginPath();
        ctx.arc(cx, cy, size * (0.5 + wave * 0.42), 0, Math.PI * 2);
        ctx.strokeStyle = tint(46, 96, 66, (1 - wave) * 0.8);
        ctx.lineWidth = 2.4 * (1 - wave) + 0.4;
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawDenies(geo, now) {
      for (var i = denies.length - 1; i >= 0; i -= 1) {
        var d = denies[i];
        var k = (now - d.at) / DENY_MS;
        if (k >= 1) {
          denies.splice(i, 1);
          continue;
        }
        if (calmMotion()) {
          continue;
        }
        var cx = geo.x0 + ((d.index % gridN) + 0.5) * geo.cell;
        var cy = geo.y0 + (Math.floor(d.index / gridN) + 0.5) * geo.cell;
        var r = geo.cell * (0.4 + k * 0.2);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 138, 128, " + (1 - k) * 0.8 + ")";
        ctx.lineWidth = 2;
        ctx.stroke();
        var s = geo.cell * 0.13;
        ctx.beginPath();
        ctx.moveTo(cx - s, cy - s);
        ctx.lineTo(cx + s, cy + s);
        ctx.moveTo(cx + s, cy - s);
        ctx.lineTo(cx - s, cy + s);
        ctx.strokeStyle = "rgba(255, 168, 158, " + (1 - k) + ")";
        ctx.lineWidth = 2.4;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }

    function draw(now) {
      if (!tiles.length) {
        return;
      }
      var geo = geometry();
      ctx.clearRect(0, 0, ftSize, ftSize);
      drawTray(geo, now);
      drawSockets(geo, now);
      if (teasing && !solved) {
        drawGuides(geo, now);
      }
      for (var value = 1; value < views.length; value += 1) {
        if (views[value] && !views[value].tw) {
          drawTile(geo, value, now);
        }
      }
      /* plates in flight ride above the settled ones */
      for (var moving = 1; moving < views.length; moving += 1) {
        if (views[moving] && views[moving].tw) {
          drawTile(geo, moving, now);
        }
      }
      drawDenies(geo, now);
    }

    /* ---------------------------------------------------------------- loop */

    function cue(at, kind, payload) {
      cues.push({ at: at, kind: kind, payload: payload });
    }

    function fireCues(now, quiet) {
      for (var i = cues.length - 1; i >= 0; i -= 1) {
        if (now < cues[i].at) {
          continue;
        }
        var item = cues.splice(i, 1)[0];
        if (item.kind === "deal") {
          playSfx("select");
          fx.callout(canvas, t("ftGo"), { hue: hue });
          fx.sweep(startBtn);
        } else if (item.kind === "finish") {
          finishSolve(quiet);
        }
      }
    }

    /* Advance every tween, then ring the bell for the plates that landed. */
    function advance(now) {
      var moving = false;
      for (var i = 1; i < views.length; i += 1) {
        var view = views[i];
        if (!view) {
          continue;
        }
        if (view.intro < 1) {
          view.intro = Math.min(1, view.intro + 0.08);
        }
        if (view.wave > -1e8 && !view.waved && now >= view.wave) {
          view.waved = true;
          onWave(view, now);
        }
        var tw = view.tw;
        if (!tw) {
          continue;
        }
        if (now < tw.at) {
          moving = true;
          continue;
        }
        var k = tw.ms > 0 ? (now - tw.at) / tw.ms : 1;
        if (k >= 1) {
          view.x = tw.tx;
          view.y = tw.ty;
          view.toX = tw.tx;
          view.toY = tw.ty;
          view.tw = null;
          view.punch = now;
          onLand(view, now);
        } else {
          var e = easeOut(k);
          view.x = tw.fx + (tw.tx - tw.fx) * e;
          view.y = tw.fy + (tw.ty - tw.fy) * e;
          moving = true;
        }
      }
      return moving;
    }

    function onLand(view, now) {
      if (view.voice) {
        playSfx(view.voice);
        view.voice = "";
      }
      var index = view.toY * gridN + view.toX;
      var home = view.value === (index + 1) % (gridN * gridN);
      if (home && !calmMotion()) {
        fx.burst(anchorAt(index), { kind: "spark", count: 7, hue: HOME_HUE });
      }
      var train = view.train;
      view.train = null;
      if (train) {
        train.landed += 1;
        if (train.total > 1 && train.closed && train.landed >= train.total) {
          playSfx("place");
          if (placedCount() > train.gain) {
            fx.floatText(anchorAt(index), "+1", { kind: "good" });
            mark(placedEl.parentNode, "is-good", MARK_MS);
          }
        }
      }
      still = false;
    }

    function onWave(view, now) {
      var index = view.toY * gridN + view.toX;
      playSfx(index % 3 === 0 ? "star" : "tick");
      if (!calmMotion()) {
        fx.burst(anchorAt(index), { kind: "star", count: 5, hue: 46 });
      }
    }

    /* Snap the drawn board to the logical one without spending a sound - used
     * when the shell pauses the game mid-slide. */
    function settleViews() {
      for (var i = 1; i < views.length; i += 1) {
        var view = views[i];
        if (!view) {
          continue;
        }
        if (view.tw) {
          view.x = view.toX;
          view.y = view.toY;
          view.tw = null;
        }
        view.voice = "";
        view.train = null;
        view.intro = 1;
        view.punch = -1e9;
        view.jolt = -1e9;
      }
      denies = [];
    }

    function closeCeremony() {
      if (typeof dismissCeremony === "function") {
        dismissCeremony();
      }
      dismissCeremony = null;
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      if (
        document.getElementById("gamePanelGlyphFifteen").hidden ||
        document.hidden
      ) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      var now = Date.now();
      var moving = advance(now);
      fireCues(now, false);
      for (var m = marks.length - 1; m >= 0; m -= 1) {
        if (now >= marks[m].until) {
          if (marks[m].node.classList) {
            marks[m].node.classList.remove(marks[m].cls);
          }
          marks.splice(m, 1);
        }
      }
      if (clockRunning) {
        renderClock();
      }
      /* Redraw while anything is in motion; a settled board holds its last frame
       * unless something asked for a repaint. The pulse keeps the plate sockets
       * and the tease rails alive, so the board never freezes mid-gesture. */
      if (moving || !still || celebrating || teasing || denies.length) {
        draw(now);
        still = !moving && !celebrating && !teasing && !denies.length;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    /* ---------------------------------------------------------------- input */

    function tileFromEvent(event) {
      var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
      var wide = (rect && rect.width) || canvas.clientWidth || ftSize;
      var tall = (rect && rect.height) || canvas.clientHeight || wide;
      var left = rect ? rect.left : 0;
      var top = rect ? rect.top : 0;
      var geo = geometry();
      var x = Math.floor((((event.clientX || 0) - left) * ftSize) / wide - (geo.x0 * ftSize) / wide + geo.x0 / geo.cell * 0);
      /* Solve in canvas units, then in cells: the tray offset is in the same
       * space as the pointer once both are scaled by ftSize / wide. */
      var px = ((event.clientX || 0) - left) * ftSize / wide;
      var py = ((event.clientY || 0) - top) * ftSize / tall;
      var col = Math.floor((px - geo.x0) / geo.cell);
      var row = Math.floor((py - geo.y0) / geo.cell);
      if (col < 0 || row < 0 || col >= gridN || row >= gridN) {
        return -1;
      }
      void x;
      return row * gridN + col;
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var tile = tileFromEvent(event);
      if (tile !== -1) {
        slideRun(tile);
      }
    });

    canvas.addEventListener("pointermove", function (event) {
      var tile = tileFromEvent(event);
      if (tile === hover) {
        return;
      }
      hover = tile;
      var movable = tile >= 0 && tiles[tile] && canTravel(tile);
      if (canvas.style) {
        canvas.style.cursor = tile >= 0 && !tiles[tile] ? "default" : movable ? "pointer" : "not-allowed";
      }
      still = false;
    });

    canvas.addEventListener("pointerleave", function () {
      if (hover !== -1) {
        hover = -1;
        still = false;
      }
    });

    canvas.addEventListener("keydown", function (event) {
      /* Arrows slide the tile that sits opposite the blank. */
      var target = null;
      var bx = blank % gridN;
      var by = Math.floor(blank / gridN);
      if (event.key === "ArrowUp" && by < gridN - 1) {
        target = blank + gridN;
      } else if (event.key === "ArrowDown" && by > 0) {
        target = blank - gridN;
      } else if (event.key === "ArrowLeft" && bx < gridN - 1) {
        target = blank + 1;
      } else if (event.key === "ArrowRight" && bx > 0) {
        target = blank - 1;
      }
      if (target !== null) {
        event.preventDefault();
        slide(target, 0);
      }
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        fx.sweep(selectEl);
        loadLevel(ftLevels[index]);
      }
    });

    startBtn.addEventListener("click", function () {
      fx.pop(startBtn, { scale: 1.05, ms: 220 });
      loadLevel(level);
    });

    App.quietResetGlyphFifteen = function () {
      clockRunning = false;
      settleViews();
      clearMarks();
      closeCeremony();
      /* A solve that was mid-cascade still owes its round end: pay it now,
       * quietly, so no level advance is lost behind a hidden panel. */
      for (var i = cues.length - 1; i >= 0; i -= 1) {
        var item = cues.splice(i, 1)[0];
        if (item.kind === "finish") {
          finishSolve(true);
        }
      }
      celebrating = null;
      renderClock();
      draw(Date.now());
      resultEl.textContent = t("ftPaused");
    };

    mount();
    loadLevel(ftLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initGlyphFifteenGame = initGlyphFifteenGame;
})(window.CapitalConvert = window.CapitalConvert || {});
