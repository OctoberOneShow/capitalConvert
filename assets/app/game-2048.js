/* 2048 - The sliding-tile mini-game in the shared game drawer.

 * Presentation notes: the whole genre is the slide, so a tile never changes
 * element while it travels - the board keeps one node per tile and moves it with
 * a transform transition between two cells. A merge is the same beat doubled up:
 * both parents slide into the destination cell, and the new plate is held back
 * for exactly one slide before it pops in their place. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var localStorage = App.storage;
  var t = App.t;
  var getElement = App.getElement;
  var petNotifyGame = App.petNotifyGame;
  var g2048BestKey = "g2048-best";
  var g2048StateKey = "g2048-state";
  var g2048SvgNs = "http://www.w3.org/2000/svg";
  var g2048Size = 4;
  /* One slide, and the lifetime of a tile that has just been swallowed: it has to
   * survive the journey and is cut as its replacement lands. */
  var g2048SlideMs = 130;
  var g2048DeadMs = 175;
  /* Plate radius by digit count, in the plate's own 100-unit box, so the value
   * fills the tile at every size instead of a fixed rem. */
  var g2048GlyphSize = [0, 44, 40, 32, 24, 19, 16];
  /* The value ramp, indexed by log2(value) - 1: 2 is a pale ice plate and each
   * doubling walks it through teal, leaf, amber and ember to gold, so the tile
   * itself tells you how far it has been merged. ink 1 = light numerals. */
  var g2048Ramp = [
    { h: 196, s: 26, l: 86, ink: 0 },
    { h: 194, s: 44, l: 76, ink: 0 },
    { h: 186, s: 60, l: 64, ink: 0 },
    { h: 170, s: 56, l: 50, ink: 1 },
    { h: 148, s: 50, l: 44, ink: 1 },
    { h: 96, s: 52, l: 50, ink: 0 },
    { h: 62, s: 66, l: 52, ink: 0 },
    { h: 40, s: 82, l: 55, ink: 0 },
    { h: 22, s: 88, l: 54, ink: 0 },
    { h: 352, s: 70, l: 52, ink: 1 },
    { h: 46, s: 92, l: 60, ink: 0 },
    { h: 280, s: 62, l: 56, ink: 1 },
    { h: 318, s: 74, l: 58, ink: 1 },
    { h: 210, s: 72, l: 54, ink: 1 },
  ];

  function initG2048() {
    var boardEl = getElement("g2048Board");
    var cellsEl = getElement("g2048Cells");
    var tilesEl = getElement("g2048Tiles");
    var overlayEl = getElement("g2048Overlay");
    var overlayText = getElement("g2048OverlayText");
    var retryBtn = getElement("g2048RetryBtn");
    var keepBtn = getElement("g2048KeepBtn");
    var scoreEl = getElement("g2048Score");
    var bestStatEl = getElement("g2048BestStat");
    var resultEl = getElement("g2048Result");
    var newBtn = getElement("g2048NewBtn");
    if (
      !boardEl ||
      !cellsEl ||
      !tilesEl ||
      !overlayEl ||
      !overlayText ||
      !retryBtn ||
      !keepBtn ||
      !scoreEl ||
      !bestStatEl ||
      !resultEl ||
      !newBtn
    ) {
      return;
    }

    var grid = emptyGrid();
    var score = 0;
    var won = false;
    var over = false;
    var tileSeq = 0;
    var plateSeq = 0;
    var bestAtStart = 0;
    var queue = [];
    var bestBeatDone = false;
    var winBeatDone = false;

    function emptyGrid() {
      var rows = [];
      for (var r = 0; r < g2048Size; r += 1) {
        rows.push([null, null, null, null]);
      }
      return rows;
    }

    /* ------------------------------------------------- the feel layer hooks
     * App.fx and App.art are loaded before this module in the page, but the
     * per-module harness boots 2048 alone, so every call is optional. */
    function fxLib() {
      return App.fx || null;
    }

    function beat(name) {
      if (App.playSfx) {
        App.playSfx(name);
      }
    }

    function calm() {
      return !!(App.isMotionOff && App.isMotionOff());
    }

    function punch(el, scale, ms) {
      var f = fxLib();
      if (f && f.pop && el) {
        f.pop(el, { scale: scale, ms: ms });
      }
    }

    function ring(el, hue) {
      var f = fxLib();
      if (f && f.ring && el) {
        f.ring(el, { hue: hue });
      }
    }

    function sprinkle(el, kind, count, hue) {
      var f = fxLib();
      if (f && f.burst && el) {
        f.burst(el, { kind: kind, count: count, hue: hue });
      }
    }

    function floatUp(el, text, kind, hue) {
      var f = fxLib();
      if (f && f.floatText && el) {
        f.floatText(el, text, { kind: kind, hue: hue });
      }
    }

    function shake(el, dist) {
      var f = fxLib();
      if (f && f.shake && el) {
        f.shake(el, { dist: dist });
      }
    }

    function jolt(el, dist) {
      var f = fxLib();
      if (f && f.jolt && el) {
        f.jolt(el, { dist: dist });
      }
    }

    function cascade(list, step, kind) {
      var f = fxLib();
      if (f && f.stagger) {
        f.stagger(list, { step: step, kind: kind });
      }
    }

    function rollNumber(el, from, to) {
      var f = fxLib();
      if (f && f.countUp) {
        f.countUp(el, from, to, { ms: 380 });
      } else {
        el.textContent = String(to);
      }
    }

    function ceremony(opts) {
      var f = fxLib();
      if (f && f.ceremony) {
        f.ceremony(boardEl, opts);
      }
    }

    /* One-shot beats only. They are armed by a move, never at boot, and flush()
     * can run them early - which is how a fast key repeat and the drawer's tab
     * switch finish a slide instead of leaving a plate waiting unseen. */
    function later(ms, fn) {
      if (ms <= 0) {
        fn();
        return;
      }
      var entry = { fn: fn, id: 0 };
      entry.id = window.setTimeout(function () {
        for (var i = 0; i < queue.length; i += 1) {
          if (queue[i] === entry) {
            queue.splice(i, 1);
            break;
          }
        }
        fn();
      }, ms);
      queue.push(entry);
    }

    function flush() {
      var list = queue.slice();
      queue.length = 0;
      for (var i = 0; i < list.length; i += 1) {
        window.clearTimeout(list[i].id);
        list[i].fn();
      }
    }

    function readBest() {
      var value = parseInt(localStorage.getItem(g2048BestKey), 10);
      return isNaN(value) ? 0 : value;
    }

    function renderBest() {
      bestStatEl.textContent = String(readBest());
    }

    function stepFor(value) {
      var step = 0;
      var walked = value;
      while (walked > 2) {
        walked /= 2;
        step += 1;
      }
      return step;
    }

    function rampFor(step) {
      return g2048Ramp[Math.min(step, g2048Ramp.length - 1)];
    }

    /* Ceremony stars only - how far the board got, never a scoring change. */
    function boardStars() {
      var top = 0;
      grid.forEach(function (row) {
        row.forEach(function (tile) {
          if (tile) {
            top = Math.max(top, stepFor(tile.value));
          }
        });
      });
      return top >= 9 ? 3 : top >= 6 ? 2 : top >= 3 ? 1 : 0;
    }

    /* ---------------------------------------------------------------- drawing
     * A tile is a drawn plate, not a coloured square: a bevelled body with a
     * shoulder under it, a sheen across the top, an inlaid groove from 32 up and
     * corner pips from 512 up, so the tier is readable without its colour. */
    function svgNode(tag, attrs) {
      var node = document.createElementNS(g2048SvgNs, tag);
      if (attrs) {
        for (var key in attrs) {
          if (Object.prototype.hasOwnProperty.call(attrs, key)) {
            node.setAttribute(key, String(attrs[key]));
          }
        }
      }
      return node;
    }

    function plateFor(value, step, ramp) {
      var uid = "g2048p" + (plateSeq += 1);
      var hueSat = ramp.h + "," + ramp.s + "%,";
      var svg = svgNode("svg", {
        viewBox: "0 0 100 100",
        "aria-hidden": "true",
        focusable: "false",
        class: "g2048-plate",
      });
      var defs = svgNode("defs");
      var grad = svgNode("linearGradient", { id: uid, x1: "0", y1: "0", x2: "0.3", y2: "1" });
      grad.appendChild(svgNode("stop", { offset: "0", "stop-color": "hsl(" + hueSat + Math.min(97, ramp.l + 12) + "%)" }));
      grad.appendChild(svgNode("stop", { offset: "1", "stop-color": "hsl(" + hueSat + Math.max(12, ramp.l - 14) + "%)" }));
      defs.appendChild(grad);
      svg.appendChild(defs);
      svg.appendChild(
        svgNode("rect", {
          x: 5,
          y: 8,
          width: 90,
          height: 87,
          rx: 19,
          fill: "hsl(" + ramp.h + "," + Math.round(ramp.s * 0.6) + "%," + Math.max(8, ramp.l - 32) + "%)",
          opacity: ramp.ink ? 0.5 : 0.72,
        }),
      );
      svg.appendChild(
        svgNode("rect", {
          x: 4,
          y: 4,
          width: 92,
          height: 89,
          rx: 18,
          fill: "url(#" + uid + ")",
          /* A rim in the plate's own hue, always deeper than the gradient's floor,
           * so the tile keeps an edge against both boards. */
          stroke: "hsl(" + hueSat + Math.max(10, ramp.l - 26) + "%)",
          "stroke-width": 1.8,
        }),
      );
      /* The sheen and the shade trace the plate's own silhouette instead of being
       * inset rects, or the tile reads as two stacked pills. */
      svg.appendChild(
        svgNode("path", {
          d: "M4 22A18 18 0 0 1 22 4H78A18 18 0 0 1 96 22V33H4Z",
          fill: "rgba(255,255,255,0.26)",
        }),
      );
      svg.appendChild(
        svgNode("path", {
          d: "M4 63H96V75A18 18 0 0 1 78 93H22A18 18 0 0 1 4 75Z",
          fill: "rgba(0,0,0,0.16)",
        }),
      );
      if (step >= 4) {
        svg.appendChild(
          svgNode("rect", {
            x: 13,
            y: 13,
            width: 74,
            height: 71,
            rx: 14,
            fill: "none",
            stroke: ramp.ink ? "rgba(255,255,255,0.34)" : "rgba(6,22,32,0.24)",
            "stroke-width": 1.5,
          }),
        );
      }
      if (step >= 8) {
        var pips = [
          [21, 22],
          [79, 22],
          [21, 76],
          [79, 76],
        ];
        for (var i = 0; i < pips.length; i += 1) {
          svg.appendChild(
            svgNode("circle", {
              cx: pips[i][0],
              cy: pips[i][1],
              r: 2.6,
              fill: ramp.ink ? "rgba(255,255,255,0.6)" : "rgba(8,20,28,0.34)",
            }),
          );
        }
      }
      var text = svgNode("text", {
        x: 50,
        y: 51,
        "text-anchor": "middle",
        "dominant-baseline": "central",
        fill: ramp.ink ? "#f4fbff" : "#0b1a24",
        "font-size": g2048GlyphSize[Math.min(String(value).length, g2048GlyphSize.length - 1)],
        "font-weight": "800",
      });
      text.textContent = String(value);
      svg.appendChild(text);
      return svg;
    }

    /* A milestone tile also carries a mark: sparkle from 128, flame from 512,
     * a crown from 2048 up. */
    function crestFor(step, ramp) {
      var art = App.art;
      if (!art || !art.icon) {
        return null;
      }
      var name = step >= 10 ? "crown" : step >= 8 ? "flame" : step >= 6 ? "sparkle" : "";
      if (!name) {
        return null;
      }
      var tone =
        step >= 10
          ? { hue: ramp.h, sat: 62, tone: "soft" }
          : { hue: ramp.h, sat: ramp.ink ? 72 : 34, tone: ramp.ink ? "soft" : "deep" };
      tone.size = 22;
      tone.cls = "g2048-crest";
      return art.icon(name, tone);
    }

    function positionAt(el, r, c) {
      if (!el) {
        return;
      }
      el.style.setProperty("--x", String(c));
      el.style.setProperty("--y", String(r));
    }

    function positionTile(tile) {
      positionAt(tile.el, tile.r, tile.c);
    }

    /* mode: "" lands the plate as it is, "waiting" holds it invisible until the
     * slide it is part of has finished, then revealTile() gives it its pop. */
    function createTile(tile, mode) {
      var step = stepFor(tile.value);
      var ramp = rampFor(step);
      var el = document.createElement("div");
      el.className = "g2048-tile" + (mode === "waiting" ? " is-waiting" : "");
      el.setAttribute("data-v", String(tile.value));
      el.setAttribute("data-step", String(step));
      /* The sheet wants a bucket, not fourteen step selectors. */
      el.setAttribute(
        "data-heat",
        step >= 10 ? "blaze" : step >= 8 ? "hot" : step >= 4 ? "warm" : "cold",
      );
      el.setAttribute("data-ink", ramp.ink ? "light" : "dark");
      el.style.setProperty("--v-hue", String(ramp.h));
      var body = document.createElement("div");
      body.className = "g2048-tile-body";
      body.appendChild(plateFor(tile.value, step, ramp));
      var crest = crestFor(step, ramp);
      if (crest) {
        body.appendChild(crest);
      }
      el.appendChild(body);
      tile.el = el;
      tile.body = body;
      tile.step = step;
      positionTile(tile);
      tilesEl.appendChild(el);
      return el;
    }

    function revealTile(tile, anim) {
      if (!tile || !tile.el) {
        return;
      }
      tile.el.classList.remove("is-waiting");
      /* The plate is already in the DOM; the class arrives with the beat, so the
       * pop cannot run while the tile that earns it is still invisible. */
      if (anim && tile.body) {
        tile.body.classList.add("is-" + anim);
      }
    }

    function removeTileLater(el) {
      later(calm() ? 0 : g2048DeadMs, function () {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    }

    function clearTiles() {
      flush();
      while (tilesEl.firstChild) {
        tilesEl.removeChild(tilesEl.firstChild);
      }
    }

    function bodiesOf(list) {
      var out = [];
      for (var i = 0; i < list.length; i += 1) {
        if (list[i] && list[i].body) {
          out.push(list[i].body);
        }
      }
      return out;
    }

    function spawnTile(mode) {
      var spots = [];
      for (var r = 0; r < g2048Size; r += 1) {
        for (var c = 0; c < g2048Size; c += 1) {
          if (!grid[r][c]) {
            spots.push({ r: r, c: c });
          }
        }
      }
      if (!spots.length) {
        return null;
      }

      var spot = spots[Math.floor(Math.random() * spots.length)];
      var tile = {
        id: (tileSeq += 1),
        value: Math.random() < 0.9 ? 2 : 4,
        r: spot.r,
        c: spot.c,
        el: null,
      };
      grid[spot.r][spot.c] = tile;
      createTile(tile, mode);
      return tile;
    }

    function canMove() {
      for (var r = 0; r < g2048Size; r += 1) {
        for (var c = 0; c < g2048Size; c += 1) {
          var tile = grid[r][c];
          if (!tile) {
            return true;
          }
          if (c < 3 && grid[r][c + 1] && grid[r][c + 1].value === tile.value) {
            return true;
          }
          if (r < 3 && grid[r + 1][c] && grid[r + 1][c].value === tile.value) {
            return true;
          }
        }
      }
      return false;
    }

    function hasValue(value) {
      for (var r = 0; r < g2048Size; r += 1) {
        for (var c = 0; c < g2048Size; c += 1) {
          if (grid[r][c] && grid[r][c].value === value) {
            return true;
          }
        }
      }
      return false;
    }

    function showOverlay(text, winMode) {
      overlayText.textContent = text;
      keepBtn.hidden = !winMode;
      overlayEl.hidden = false;
      retryBtn.focus();
    }

    function saveState() {
      var values = grid.map(function (row) {
        return row.map(function (tile) {
          return tile ? tile.value : 0;
        });
      });
      localStorage.setItem(
        g2048StateKey,
        JSON.stringify({ grid: values, score: score, won: won, over: over }),
      );
    }

    function restoreState() {
      var data = null;
      try {
        data = JSON.parse(localStorage.getItem(g2048StateKey) || "null");
      } catch (error) {
        data = null;
      }

      if (!data || data.over || !Array.isArray(data.grid)) {
        return false;
      }

      grid = emptyGrid();
      var hasTile = false;
      var dealt = [];
      for (var r = 0; r < g2048Size && r < data.grid.length; r += 1) {
        var row = data.grid[r] || [];
        for (var c = 0; c < g2048Size && c < row.length; c += 1) {
          var value = row[c];
          if (value > 0) {
            var tile = {
              id: (tileSeq += 1),
              value: value,
              r: r,
              c: c,
              el: null,
            };
            grid[r][c] = tile;
            createTile(tile, "");
            dealt.push(tile);
            hasTile = true;
          }
        }
      }

      if (!hasTile) {
        return false;
      }

      score = data.score || 0;
      won = !!data.won;
      over = false;
      scoreEl.textContent = String(score);
      bestBeatDone = score > 0 && score >= readBest();
      /* A board that already holds a 2048 is not reopened with a win ceremony. */
      winBeatDone = won;
      cascade(bodiesOf(dealt), 26, "drop");
      return true;
    }

    function newGame() {
      clearTiles();
      grid = emptyGrid();
      score = 0;
      won = false;
      over = false;
      bestBeatDone = false;
      winBeatDone = false;
      bestAtStart = readBest();
      overlayEl.hidden = true;
      scoreEl.textContent = "0";
      resultEl.textContent = t("g2048Prompt");
      /* The drawer opens on a dealt board, never an empty one. */
      cascade(bodiesOf([spawnTile(""), spawnTile("")]), 90, "drop");
      saveState();
    }

    function endGame() {
      over = true;
      var best = score > 0 && score > bestAtStart;
      resultEl.textContent =
        t("g2048OverResult", { n: score }) + (best ? " " + t("newBest") : "");
      showOverlay(t("g2048Over", { n: score }), false);
      petNotifyGame(best);
      saveState();
      shake(boardEl, 5);
      later(calm() ? 0 : 220, function () {
        ceremony({
          tone: "lose",
          title: t("g2048Over", { n: score }),
          stars: boardStars(),
          lines: [t("hudScore") + ": " + score, t("hudBest") + ": " + readBest()],
        });
      });
    }

    /* A direction with nothing in it is still an answer: the board refuses. */
    function refuse() {
      shake(boardEl, 4);
      beat("miss");
    }

    function winBeat(tile) {
      if (winBeatDone || !tile || !tile.el) {
        return;
      }
      winBeatDone = true;
      var hue = rampFor(tile.step).h;
      ring(tile.el, hue);
      sprinkle(tile.el, "star", 14, hue);
      ceremony({
        tone: "win",
        title: t("g2048Win"),
        stars: 3,
        lines: [t("g2048WinContinue"), t("hudScore") + ": " + score],
      });
    }

    function move(direction) {
      if (over) {
        return;
      }
      /* Land the previous beat before starting this one, so a held arrow key can
       * never stack a second slide on top of an unfinished one. */
      flush();

      var lines = [];
      for (var i = 0; i < g2048Size; i += 1) {
        var line = [];
        for (var j = 0; j < g2048Size; j += 1) {
          if (direction === "left") {
            line.push({ r: i, c: j });
          } else if (direction === "right") {
            line.push({ r: i, c: 3 - j });
          } else if (direction === "up") {
            line.push({ r: j, c: i });
          } else {
            line.push({ r: 3 - j, c: i });
          }
        }
        lines.push(line);
      }

      var moved = false;
      var gained = 0;
      var merged = [];

      lines.forEach(function (line) {
        var tiles = [];
        line.forEach(function (pos) {
          if (grid[pos.r][pos.c]) {
            tiles.push(grid[pos.r][pos.c]);
          }
        });

        var mergedLine = [];
        for (var k = 0; k < tiles.length; k += 1) {
          if (
            k + 1 < tiles.length &&
            tiles[k].value === tiles[k + 1].value
          ) {
            var combined = {
              id: (tileSeq += 1),
              value: tiles[k].value * 2,
              r: 0,
              c: 0,
              el: null,
            };
            gained += combined.value;
            merged.push({
              tile: combined,
              sources: [tiles[k], tiles[k + 1]],
            });
            mergedLine.push(combined);
            k += 1;
          } else {
            mergedLine.push(tiles[k]);
          }
        }

        line.forEach(function (pos, index) {
          var nextTile = mergedLine[index] || null;
          if (grid[pos.r][pos.c] !== nextTile) {
            moved = true;
          }
          grid[pos.r][pos.c] = nextTile;
          if (nextTile) {
            nextTile.r = pos.r;
            nextTile.c = pos.c;
          }
        });
      });

      if (!moved) {
        if (!canMove()) {
          endGame();
        } else {
          refuse();
        }
        return;
      }

      var previousScore = score;
      score += gained;
      if (gained > 0) {
        rollNumber(scoreEl, previousScore, score);
      }
      if (score > readBest()) {
        localStorage.setItem(g2048BestKey, String(score));
        renderBest();
        if (!bestBeatDone) {
          bestBeatDone = true;
          punch(bestStatEl, 1.16, 260);
          floatUp(bestStatEl, t("newBest"), "good");
          beat("coin");
        }
      }

      /* Survivors: same element, new cell. The transform transition is what
       * travels, so nothing is re-rendered in place. */
      grid.forEach(function (row) {
        row.forEach(function (tile) {
          if (tile && tile.el) {
            positionTile(tile);
          }
        });
      });

      var biggest = null;
      var waiting = [];
      merged.forEach(function (entry) {
        entry.sources.forEach(function (source) {
          if (!source.el) {
            return;
          }
          /* Both parents go to the destination cell: the merge is seen to happen
           * where the tiles arrive, not where the new plate is written. */
          positionAt(source.el, entry.tile.r, entry.tile.c);
          removeTileLater(source.el);
          source.el = null;
        });
        createTile(entry.tile, "waiting");
        waiting.push({ tile: entry.tile, anim: "merge" });
        if (!biggest || entry.tile.value > biggest.value) {
          biggest = entry.tile;
        }
      });

      var born = spawnTile("waiting");
      if (born) {
        waiting.push({ tile: born, anim: "spawn" });
      }

      if (!won && hasValue(2048)) {
        won = true;
        resultEl.textContent = t("g2048WinContinue");
        showOverlay(t("g2048Win"), true);
      } else if (!canMove()) {
        endGame();
      }

      saveState();

      later(calm() ? 0 : g2048SlideMs, function () {
        for (var n = 0; n < waiting.length; n += 1) {
          revealTile(waiting[n].tile, waiting[n].anim);
        }
        if (biggest) {
          var hue = rampFor(biggest.step).h;
          if (biggest.step >= 7) {
            jolt(boardEl, 4);
          }
          sprinkle(biggest.el, biggest.step >= 6 ? "star" : "spark", biggest.step >= 6 ? 12 : 7, hue);
          floatUp(biggest.el, "+" + gained, "good");
          beat("merge");
        } else {
          beat("place");
        }
        if (won) {
          winBeat(biggest);
        }
      });
    }

    for (var cellIndex = 0; cellIndex < 16; cellIndex += 1) {
      var cell = document.createElement("span");
      cell.className = "g2048-cell";
      cellsEl.appendChild(cell);
    }

    boardEl.addEventListener("keydown", function (event) {
      var directions = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      var direction = directions[event.key];
      if (!direction) {
        return;
      }
      event.preventDefault();
      move(direction);
    });

    var swipeStart = null;
    boardEl.addEventListener("pointerdown", function (event) {
      swipeStart = { x: event.clientX, y: event.clientY };
      /* The arrows only work from the board, so a touch has to hand it focus. */
      if (boardEl.focus) {
        boardEl.focus();
      }
    });
    boardEl.addEventListener("pointerup", function (event) {
      if (!swipeStart) {
        return;
      }
      var dx = event.clientX - swipeStart.x;
      var dy = event.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        move(dx > 0 ? "right" : "left");
      } else {
        move(dy > 0 ? "down" : "up");
      }
    });

    retryBtn.addEventListener("click", function () {
      newGame();
      beat("select");
    });
    keepBtn.addEventListener("click", function () {
      overlayEl.hidden = true;
      beat("select");
      if (!canMove()) {
        endGame();
        return;
      }
      boardEl.focus();
    });
    newBtn.addEventListener("click", function () {
      newGame();
      beat("select");
      boardEl.focus();
    });

    App.quietReset2048 = function () {
      /* Finish anything still in the air - which also drops its timers - and
       * leave the board exactly as the player left it. */
      flush();
      saveState();
    };

    renderBest();
    if (!restoreState()) {
      newGame();
    } else {
      bestAtStart = readBest();
    }
  }


  /* Exported for the other modules. */
  App.initG2048 = initG2048;
})(window.CapitalConvert = window.CapitalConvert || {});
