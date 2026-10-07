/* Glyph Mines - The minesweeper mini-game in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var localStorage = App.storage;
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var mnBestKey = "glyph-mines-best";
  var mnSize = 9;
  var mnMines = 12;
  var mnMineGlyph = "\u96F7";
  var mnFlagGlyph = "\u2691";
  var SVG_NS = "http://www.w3.org/2000/svg";
  /* The field borrows the panel hue, falling back to the value the art-direction
   * layer assigns this panel; the hazards have no token of their own. */
  var mnFieldHue = 196;
  var mnDangerHue = 14;
  var mnFlagHue = 4;
  var mnWaveStep = 58;
  var mnWaveStepCalm = 20;
  var mnWaveMax = 11;

  function noop() {}

  function mnMotionOff() {
    return App.isMotionOff
      ? App.isMotionOff()
      : document.documentElement.getAttribute("data-motion") === "off";
  }

  function mnMotionCalm() {
    return App.isMotionCalm
      ? App.isMotionCalm()
      : document.documentElement.getAttribute("data-motion") === "calm";
  }

  function initMinesGame() {
    var gridEl = getElement("mnGrid");
    var minesEl = getElement("mnMineStat");
    var flagsEl = getElement("mnFlagStat");
    var timeEl = getElement("mnTime");
    var resultEl = getElement("mnResult");
    var startBtn = getElement("mnStartBtn");
    var flagBtn = getElement("mnFlagBtn");
    var bestEl = getElement("mnBest");
    if (
      !gridEl ||
      !minesEl ||
      !flagsEl ||
      !timeEl ||
      !resultEl ||
      !startBtn ||
      !flagBtn ||
      !bestEl
    ) {
      return;
    }

    var panelEl = gridEl.parentNode;
    var art = App.art;
    var fx = App.fx || {
      pop: noop,
      shake: noop,
      ring: noop,
      burst: noop,
      floatText: noop,
      stagger: noop,
      countUp: noop,
      sweep: noop,
      jolt: noop,
      flash: noop,
      ceremony: noop,
    };
    var playSfx = App.playSfx || noop;
    /* If the illustration script is ever absent the field still has to be
     * playable, so the cells fall back to glyph text over CSS plates. */
    var canDraw = !!(art && art.tile && art.icon);
    var hue = mnFieldHue;

    var cells = [];
    var buttons = [];
    var started = false;
    var over = false;
    var flagMode = false;
    var startedAt = 0;
    var timerId = null;
    var revealedCount = 0;
    var flagCount = 0;
    var boomIndex = -1;
    var roundId = 0;
    /* waveOf maps a cell index to the flood ring that opened it. It is cleared on
     * every dig and only ever drives presentation - the reveal itself stays
     * synchronous so state, aria and the regression harness see the same board. */
    var waveOf = {};
    var lastRing = 0;
    var fxTimers = [];

    function readBest() {
      var value = parseInt(localStorage.getItem(mnBestKey), 10);
      return isNaN(value) ? 0 : value;
    }

    function renderBest() {
      var best = readBest();
      bestEl.textContent = best
        ? t("bestTime", { s: (best / 1000).toFixed(1) })
        : t("noBest");
    }

    function indexAt(x, y) {
      return y * mnSize + x;
    }

    function neighbours(index) {
      var x = index % mnSize;
      var y = Math.floor(index / mnSize);
      var list = [];
      for (var dy = -1; dy <= 1; dy += 1) {
        for (var dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) {
            continue;
          }
          var nx = x + dx;
          var ny = y + dy;
          if (nx >= 0 && nx < mnSize && ny >= 0 && ny < mnSize) {
            list.push(indexAt(nx, ny));
          }
        }
      }
      return list;
    }

    /* Chebyshev distance: a blast spreads across a square grid in rings the same
     * way a dig does, so mines surface on the same clock as the flood. */
    function ringDistance(from, to) {
      var ax = from % mnSize;
      var ay = Math.floor(from / mnSize);
      var bx = to % mnSize;
      var by = Math.floor(to / mnSize);
      return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
    }

    function stepMs() {
      return mnMotionCalm() ? mnWaveStepCalm : mnWaveStep;
    }

    function settleMs(rings) {
      if (mnMotionOff()) {
        return 0;
      }
      return Math.min(rings, mnWaveMax) * stepMs() + 260;
    }

    function later(fn, ms) {
      var round = roundId;
      var id = window.setTimeout(function () {
        var at = fxTimers.indexOf(id);
        if (at >= 0) {
          fxTimers.splice(at, 1);
        }
        if (round === roundId) {
          fn();
        }
      }, ms);
      fxTimers.push(id);
      return id;
    }

    function clearFxTimers() {
      fxTimers.forEach(function (id) {
        window.clearTimeout(id);
      });
      fxTimers = [];
    }

    /* Mines move after the first dig so the opening cut is always safe -
     * the classic courtesy that keeps a 9x9 from feeling like a coin flip. */
    function placeMines(safeIndex) {
      var banned = [safeIndex].concat(neighbours(safeIndex));
      var placed = 0;
      while (placed < mnMines) {
        var spot = Math.floor(Math.random() * cells.length);
        if (
          !cells[spot].mine &&
          banned.indexOf(spot) === -1
        ) {
          cells[spot].mine = true;
          placed += 1;
        }
      }
      cells.forEach(function (cell, index) {
        cell.adj = neighbours(index).filter(function (n) {
          return cells[n].mine;
        }).length;
      });
    }

    /* ---------------------------------------------------------------- drawing */

    function svgTag(name, attrs) {
      var node = document.createElementNS(SVG_NS, name);
      for (var key in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, key)) {
          node.setAttribute(key, String(attrs[key]));
        }
      }
      return node;
    }

    /* Flecks are derived from the cell index, not Math.random, so a plate keeps
     * its own grain across repaints and the field reads as worked ground rather
     * than 81 identical tiles. */
    function addGrit(tile, index) {
      var seed = (index * 928217 + 34121) % 9973;
      for (var i = 0; i < 3; i += 1) {
        seed = (seed * 73 + 151) % 9973;
        var cx = 10 + (seed % 28);
        seed = (seed * 73 + 151) % 9973;
        var cy = 11 + (seed % 26);
        tile.appendChild(
          svgTag("circle", {
            cx: cx,
            cy: cy,
            r: i === 0 ? 1.7 : 1.1,
            "class": "mn-grit",
          }),
        );
      }
    }

    /* The numeral is the reading, the pips underneath are the confirmation: a
     * player without colour vision, or on a grey theme, still counts the dots. */
    function addCount(tile, value) {
      var text = svgTag("text", {
        x: 24,
        y: 22,
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "class": "mn-digit",
      });
      text.textContent = String(value);
      tile.appendChild(text);
      var gap = value > 5 ? 4.6 : 5.8;
      for (var i = 0; i < value; i += 1) {
        tile.appendChild(
          svgTag("circle", {
            cx: 24 + (i - (value - 1) / 2) * gap,
            cy: 40,
            r: 1.5,
            "class": "mn-pip",
          }),
        );
      }
    }

    function addMark(host, icon, iconHue, cls) {
      var box = document.createElement("div");
      box.className = "mn-mark" + (cls ? " " + cls : "");
      if (canDraw) {
        box.appendChild(art.icon(icon, { hue: iconHue, sat: 86, tone: "soft" }));
      } else {
        box.textContent = icon === "flag" ? mnFlagGlyph : mnMineGlyph;
      }
      host.appendChild(box);
      return box;
    }

    function coverPlate(index) {
      if (!canDraw) {
        return null;
      }
      /* A few degrees of hue drift per cell breaks the uniform-sheet look. */
      var tile = art.tile({
        hue: hue + (((index * 7) % 9) - 4),
        sat: 42,
        state: "up",
        radius: 8,
      });
      addGrit(tile, index);
      return tile;
    }

    function dugPlate(index) {
      var cell = cells[index];
      if (!canDraw) {
        return null;
      }
      if (cell.mine) {
        return art.tile({
          hue: mnDangerHue,
          sat: 74,
          state: index === boomIndex ? "glow" : "up",
          radius: 8,
        });
      }
      return art.tile({ hue: hue, sat: 40, state: "empty", radius: 8 });
    }

    /* ---------------------------------------------------------------- painting */

    function renderCell(index) {
      var cell = cells[index];
      var button = buttons[index];
      var ring = waveOf[index];
      var spreading =
        ring !== undefined && !button.mnWasOpen && !mnMotionOff() && !!cell.revealed;
      var delay = spreading ? Math.min(ring, mnWaveMax) * stepMs() : 0;
      var planting = cell.flagged && !button.mnWasFlagged && !mnMotionOff();

      button.textContent = "";
      button.className = "mn-cell";
      if (index === boomIndex) {
        button.classList.add("is-boom");
      }
      if (cell.flagged) {
        button.classList.add("is-flagged");
      }
      if (cell.revealed) {
        button.classList.add("is-open");
        if (cell.mine) {
          button.classList.add("is-mine");
        } else if (cell.adj > 0) {
          button.classList.add("is-n" + cell.adj);
        }
      }
      if (over && cell.flagged) {
        button.classList.add(cell.mine ? "is-correct" : "is-wrong");
      }

      if (cell.revealed) {
        var dug = document.createElement("div");
        dug.className = "mn-dug";
        var well = dugPlate(index);
        if (well) {
          if (!cell.mine && cell.adj > 0) {
            addCount(well, cell.adj);
          }
          dug.appendChild(well);
        } else if (!cell.mine) {
          /* No illustration layer: the numeral and the plate CSS still carry it. */
          dug.textContent = String(cell.adj || "");
        }
        if (cell.mine) {
          addMark(dug, "mine", mnDangerHue, "mn-mark-mine");
        }
        if (cell.mine && cell.flagged) {
          addMark(dug, "flag", mnFlagHue, "mn-mark-keep");
        }
        if (spreading) {
          dug.classList.add("is-breaking");
          dug.style.animationDelay = delay + "ms";
        }
        button.appendChild(dug);
      }

      if (!cell.revealed || spreading) {
        var plate = document.createElement("div");
        plate.className = "mn-plate";
        var cover = coverPlate(index);
        if (cover) {
          plate.appendChild(cover);
        }
        if (cell.flagged) {
          var flag = addMark(plate, "flag", mnFlagHue, "mn-mark-flag");
          if (planting) {
            flag.classList.add("is-planting");
          }
        }
        if (over && !cell.mine && cell.flagged) {
          addMark(plate, "cross", mnDangerHue, "mn-mark-x");
        }
        if (spreading) {
          plate.classList.add("is-lifting");
          plate.style.animationDelay = delay + "ms";
        }
        button.appendChild(plate);
      }

      button.mnWasOpen = !!cell.revealed;
      button.mnWasFlagged = !!cell.flagged;
      button.setAttribute(
        "aria-label",
        t("mnCell", { n: index + 1 }) +
          (cell.revealed
            ? ", " + (cell.mine ? t("mnMine") : String(cell.adj || ""))
            : cell.flagged
              ? ", " + t("mnFlagged")
              : ""),
      );
    }

    function setStat(node, value) {
      var current = parseInt(node.textContent, 10);
      node.textContent = String(value);
      if (!isNaN(current) && current !== value) {
        fx.countUp(node, current, value);
      }
    }

    function renderAll() {
      for (var index = 0; index < cells.length; index += 1) {
        renderCell(index);
      }
      var remaining = mnMines - flagCount;
      setStat(minesEl, remaining);
      setStat(flagsEl, flagCount);
      /* The chip warns only once every mine is claimed, so the number and the
       * chip agree; the count is the information, the tint is the emphasis. */
      var minesChip = minesEl.parentNode;
      if (minesChip && minesChip.classList) {
        minesChip.classList.toggle("is-warn", remaining === 0 && flagCount > 0 && !over);
      }
    }

    function tick() {
      if (!started || over) {
        return;
      }
      timeEl.textContent = ((Date.now() - startedAt) / 1000).toFixed(1) + "s";
    }

    function startTimer() {
      startedAt = Date.now();
      timerId = window.setInterval(tick, 100);
    }

    /* The panel's hue drives every plate, so the art follows the token instead of
     * a second copy of the palette kept here. */
    function readHue() {
      var raw = "";
      try {
        raw = window
          .getComputedStyle(panelEl)
          .getPropertyValue("--gp-hue");
      } catch (error) {
        raw = "";
      }
      var parsed = parseInt(raw, 10);
      hue = isNaN(parsed) ? mnFieldHue : parsed;
    }

    function mountBackdrop() {
      if (!panelEl || !canDraw || !art.pattern) {
        return;
      }
      var layer = document.createElement("div");
      layer.className = "mn-backdrop";
      layer.setAttribute("aria-hidden", "true");
      layer.appendChild(art.pattern("grid", { hue: hue, sat: 34, tile: 24 }));
      panelEl.insertBefore(layer, panelEl.firstChild);
    }

    function buildIdle() {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
      clearFxTimers();
      roundId += 1;
      cells = [];
      for (var index = 0; index < mnSize * mnSize; index += 1) {
        cells.push({ mine: false, adj: 0, revealed: false, flagged: false });
      }
      started = false;
      over = false;
      revealedCount = 0;
      flagCount = 0;
      boomIndex = -1;
      waveOf = {};
      lastRing = 0;
      timeEl.textContent = "0.0s";
      renderAll();
      renderBest();
      resultEl.className = "game-result";
      resultEl.textContent = t("mnPrompt");
      fx.stagger(buttons, { kind: "drop", step: 7, ms: 320 });
    }

    function ceremony(tone, title, lines, stars) {
      fx.ceremony(panelEl, {
        tone: tone,
        title: title,
        lines: lines,
        stars: stars,
      });
    }

    function bestLine() {
      var best = readBest();
      return best ? [t("bestTime", { s: (best / 1000).toFixed(1) })] : [];
    }

    function boom(index) {
      over = true;
      boomIndex = index;
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
      /* Buried mines surface in rings out of the blast rather than all at once. */
      lastRing = 0;
      cells.forEach(function (cell, i) {
        if (cell.mine && !cell.revealed) {
          cell.revealed = true;
          waveOf[i] = ringDistance(index, i);
          lastRing = Math.max(lastRing, waveOf[i]);
        }
      });
      renderAll();
      resultEl.className = "game-result is-lose";
      resultEl.textContent = t("mnBoom");
      var button = buttons[index];
      fx.jolt(gridEl, { dist: 7 });
      fx.flash(gridEl, { hue: mnDangerHue });
      fx.ring(button, { hue: mnDangerHue });
      fx.burst(button, { kind: "ember", count: 20, hue: mnDangerHue });
      fx.burst(button, { kind: "spark", count: 10, hue: 34 });
      playSfx("explode");
      later(function () {
        ceremony("lose", t("mnBoom"), bestLine(), 0);
      }, settleMs(lastRing));
      logAction(t("logMines", { s: "\u2014" }));
      petNotifyGame(false);
    }

    function checkCleared() {
      if (revealedCount !== mnSize * mnSize - mnMines) {
        return;
      }
      over = true;
      var elapsedMs = Math.max(1, Date.now() - startedAt);
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
      var previousBest = readBest();
      var isBest = !previousBest || elapsedMs < previousBest;
      if (isBest) {
        localStorage.setItem(mnBestKey, String(elapsedMs));
      }
      var seconds = (elapsedMs / 1000).toFixed(1);
      resultEl.className = "game-result is-win";
      resultEl.textContent = t("mnCleared", { s: seconds }) + (isBest ? " " + t("newBest") : "");
      renderBest();
      logAction(t("logMines", { s: seconds }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      playSfx("score");
      later(function () {
        fx.pop(startBtn, { scale: 1.06 });
        ceremony(
          "win",
          t("mnCleared", { s: seconds }),
          isBest ? [t("newBest")] : bestLine(),
          3,
        );
      }, settleMs(lastRing));
      petNotifyGame(isBest);
    }

    /* Breadth-first so each cell learns how far the flood carried it; the reveal
     * set is identical to the old stack walk, only the order of painting changes. */
    function reveal(index) {
      var queue = [{ at: index, ring: 0 }];
      var head = 0;
      lastRing = 0;
      while (head < queue.length) {
        var item = queue[head];
        head += 1;
        var cell = cells[item.at];
        if (cell.revealed || cell.flagged) {
          continue;
        }
        cell.revealed = true;
        revealedCount += 1;
        waveOf[item.at] = item.ring;
        lastRing = Math.max(lastRing, item.ring);
        if (cell.mine) {
          boom(item.at);
          return;
        }
        if (cell.adj === 0) {
          neighbours(item.at).forEach(function (n) {
            if (!cells[n].revealed) {
              queue.push({ at: n, ring: item.ring + 1 });
            }
          });
        }
      }
      checkCleared();
    }

    function toggleFlag(index) {
      if (over || cells[index].revealed) {
        return;
      }
      cells[index].flagged = !cells[index].flagged;
      flagCount += cells[index].flagged ? 1 : -1;
      renderAll();
      var button = buttons[index];
      if (cells[index].flagged) {
        /* Planting: the flag drops in and the soil kicks up around it. */
        fx.burst(button, { kind: "spark", count: 7, hue: 36 });
        playSfx("place");
      } else {
        fx.pop(button, { scale: 0.92, ms: 180 });
        playSfx("tap");
      }
    }

    function dig(index) {
      if (over || cells[index].revealed) {
        return;
      }
      if (flagMode) {
        toggleFlag(index);
        return;
      }
      if (cells[index].flagged) {
        fx.shake(buttons[index], { dist: 5 });
        playSfx("miss");
        return;
      }
      waveOf = {};
      var before = revealedCount;
      if (!started) {
        placeMines(index);
        started = true;
        startTimer();
        resultEl.textContent = t("mnGo");
      }
      reveal(index);
      renderAll();
      var opened = revealedCount - before;
      if (opened > 0) {
        var button = buttons[index];
        fx.ring(button, { hue: hue });
        playSfx("land");
        if (opened >= 4) {
          fx.floatText(button, "+" + opened, { kind: "good" });
        }
      }
    }

    function buildGrid() {
      gridEl.textContent = "";
      buttons = [];
      for (var index = 0; index < mnSize * mnSize; index += 1) {
        (function (cellIndex) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "mn-cell";
          button.addEventListener("click", function () {
            dig(cellIndex);
          });
          button.addEventListener("contextmenu", function (event) {
            event.preventDefault();
            toggleFlag(cellIndex);
          });
          gridEl.appendChild(button);
          buttons.push(button);
        })(index);
      }
    }

    flagBtn.addEventListener("click", function () {
      flagMode = !flagMode;
      flagBtn.setAttribute("aria-pressed", String(flagMode));
      flagBtn.classList.toggle("is-active", flagMode);
      resultEl.className = "game-result";
      resultEl.textContent = t(flagMode ? "mnFlagOn" : "mnFlagOff");
      fx.sweep(flagBtn);
      playSfx("select");
    });

    startBtn.addEventListener("click", function () {
      buildIdle();
      playSfx("flip");
    });

    App.quietResetMines = function () {
      clearFxTimers();
      if (timerId !== null || (!over && revealedCount > 0)) {
        buildIdle();
      }
    };

    buildGrid();
    readHue();
    mountBackdrop();
    buildIdle();
  }


  /* Exported for the other modules. */
  App.initMinesGame = initMinesGame;
})(window.CapitalConvert = window.CapitalConvert || {});
