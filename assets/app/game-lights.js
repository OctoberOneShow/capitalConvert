/* Lights Out - The flip-the-cross logic mini-game in the shared game drawer.
 *
 * The whole game is one wall of lamps, so the panel is built as a fixture rather
 * than a grid of squares. Each cell carries a drawn bulb (cold glass, a visible
 * filament, a screw cap); the dark state is unlit glass you can still read as a
 * lamp, and the lit state is a bulb that lights its own glass, throws a bloom
 * past its own bezel onto the wall, warms the glass of the lamps beside it and
 * breathes. One tap is a switch throw: the plate sinks, a ring marks the source,
 * and the four arms of the cross catch or lose their light in a clockwise sweep
 * instead of re-painting five cells at once. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var localStorage = App.storage;
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var litBestKey = "lights-out-best";
  var litSize = 5;
  var litSvgNs = "http://www.w3.org/2000/svg";
  /* The art-direction layer skins this panel cool (hue 196), so the lamps are
   * deliberately warm: complementary light reads as glow rather than as a second
   * accent of the same hue, and it keeps the two states apart in the colour-blind
   * simulation the shared layer worries about. */
  var litBulbHue = 42;
  /* The arms of the cross catch the light after the switch, in a sweep. */
  var litArmLead = 60;
  var litArmStep = 46;
  /* Arrow keys steer a roving focus around the fixture: one cell sideways, a
   * whole row up or down on a grid this wide. */
  var litStrides = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -litSize, ArrowDown: litSize };
  /* Same ladder deal as the other games: each board starts from a fully
   * dark grid and this many random taps, so every board is solvable and
   * just a little messier than the last. */
  var litLevels = [
    { presses: 4 },
    { presses: 6 },
    { presses: 8 },
    { presses: 11 },
    { presses: 14 },
    { presses: 16 },
    { presses: 19 },
  ];

  /* Presentation rides on the shared feel layer, but this module also boots
   * inside the puzzle harness, where App.fx / App.art / App.playSfx are never
   * loaded. Every call goes through one of these three guards, and the
   * stylesheet alone carries the whole board when the art layer is absent. */
  function fxCall(name, args) {
    var lib = App.fx;
    var beat = lib && lib[name];
    if (typeof beat !== "function") {
      return;
    }
    beat.apply(lib, args);
  }

  function fxOn(name, el, opts) {
    fxCall(name, [el, opts]);
  }

  function sfx(name) {
    if (typeof App.playSfx === "function") {
      App.playSfx(name);
    }
  }

  function draw(name, first, second) {
    var lib = App.art;
    var make = lib && lib[name];
    if (typeof make !== "function") {
      return null;
    }
    return make.call(lib, first, second);
  }

  function svgNode(tag, attrs, cls) {
    var node = document.createElementNS(litSvgNs, tag);
    if (cls) {
      node.setAttribute("class", cls);
    }
    for (var key in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, key)) {
        node.setAttribute(key, String(attrs[key]));
      }
    }
    return node;
  }

  function at(coord) {
    return Math.round(coord * 10) / 10;
  }

  /* One bulb, drawn on a 24-unit grid. Shape only: every fill, stroke and
   * opacity is a class in the stylesheet, so a flip is a state change the CSS
   * can animate rather than a re-paint the JS would have to redraw. */
  function buildLamp() {
    var svg = svgNode(
      "svg",
      { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" },
      "lit-lamp",
    );
    svg.appendChild(svgNode("circle", { cx: 12, cy: 9.6, r: 9.4 }, "lit-bloom"));

    var rays = svgNode("g", { "stroke-linecap": "round" }, "lit-rays");
    for (var spoke = 0; spoke < 8; spoke += 1) {
      var angle = (Math.PI / 4) * spoke - Math.PI / 2;
      rays.appendChild(
        svgNode("line", {
          x1: at(12 + Math.cos(angle) * 8.6),
          y1: at(9.6 + Math.sin(angle) * 8.6),
          x2: at(12 + Math.cos(angle) * 11.2),
          y2: at(9.6 + Math.sin(angle) * 11.2),
        }, "lit-ray"),
      );
    }
    svg.appendChild(rays);

    svg.appendChild(
      svgNode("path", {
        d: "M12 2.6a6.9 6.9 0 0 1 4.3 12.3c-.6.7-1 1.5-1.1 2.4H8.8c-.1-.9-.5-1.7-1.1-2.4A6.9 6.9 0 0 1 12 2.6z",
      }, "lit-glass"),
    );
    svg.appendChild(
      svgNode("path", { d: "M8.5 8.4a4.8 4.8 0 0 1 2.3-2.3" }, "lit-shine"),
    );
    svg.appendChild(
      svgNode("path", { d: "M10.6 12.4v3.2M13.4 12.4v3.2" }, "lit-stem"),
    );
    svg.appendChild(
      svgNode("path", { d: "M9.7 12.6l1-2.5 1.3 1.9 1.3-1.9 1 2.5" }, "lit-filament"),
    );
    svg.appendChild(
      svgNode("rect", { x: 8.6, y: 17.3, width: 6.8, height: 3.4, rx: 1.3 }, "lit-cap"),
    );
    svg.appendChild(
      svgNode("path", { d: "M9.3 18.6h5.4M9.3 19.8h5.4" }, "lit-thread"),
    );
    svg.appendChild(
      svgNode("rect", { x: 10.5, y: 20.7, width: 3, height: 1.4, rx: 0.6 }, "lit-contact"),
    );
    return svg;
  }

  /* The guide already promises "fewer moves earn more stars", so the ceremony
   * grades a clear against the shuffle depth that made the board - a board built
   * from N random taps is always solvable in N, so N is par. Presentation only:
   * nothing here touches the stored bests. */
  function starsFor(presses, moves) {
    if (moves <= presses) {
      return 3;
    }
    if (moves <= presses + Math.ceil(presses * 0.6)) {
      return 2;
    }
    return 1;
  }

  function initLightsGame() {
    var gridEl = getElement("litGrid");
    var movesEl = getElement("litMoves");
    var levelEl = getElement("litLevel");
    var bestStatEl = getElement("litBestStat");
    var resultEl = getElement("litResult");
    var newBtn = getElement("litNewBtn");
    var bestEl = getElement("litBest");
    if (
      !gridEl ||
      !movesEl ||
      !levelEl ||
      !bestStatEl ||
      !resultEl ||
      !newBtn ||
      !bestEl
    ) {
      return;
    }
    /* The ceremony scrim mounts on the panel so it covers the whole fixture,
     * not just the grid. */
    var hostEl = getElement("gamePanelLights") || gridEl.parentNode;

    var totalLevels = litLevels.length;
    var progress = readProgress();
    var level = clampLevel(progress.level);
    var cells = [];
    var moves = 0;
    var solved = false;
    var buttons = [];
    var stageEl = null;
    var litNow = 0;

    function clampLevel(value) {
      var parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 1) {
        return 1;
      }
      return Math.min(parsed, totalLevels);
    }

    function readProgress() {
      var raw = "";
      try {
        raw = localStorage.getItem(litBestKey) || "";
      } catch (error) {
        raw = "";
      }
      try {
        var parsed = JSON.parse(String(raw));
        if (parsed && typeof parsed === "object" && parsed.bests) {
          return { level: parsed.level, bests: parsed.bests };
        }
      } catch (error) {
        /* a fresh board beats a corrupted record */
      }
      return { level: 1, bests: {} };
    }

    function saveProgress() {
      try {
        localStorage.setItem(
          litBestKey,
          JSON.stringify({ level: clampLevel(progress.level), bests: progress.bests }),
        );
      } catch (error) {
        /* unrecorded but still playable */
      }
    }

    function levelBest() {
      var value = parseInt(progress.bests[String(level)], 10);
      return isNaN(value) ? 0 : value;
    }

    function indexAt(x, y) {
      return y * litSize + x;
    }

    function flipCell(index) {
      cells[index] = !cells[index];
    }

    /* Self first, then the four arms clockwise from the top, so a tap can sweep
     * outward in one direction instead of flashing in listing order. The flip
     * itself stays an exclusive-or over the same five cells, so order is free. */
    function crossOf(index) {
      var x = index % litSize;
      var y = Math.floor(index / litSize);
      var cross = [index];
      if (y > 0) {
        cross.push(indexAt(x, y - 1));
      }
      if (x < litSize - 1) {
        cross.push(indexAt(x + 1, y));
      }
      if (y < litSize - 1) {
        cross.push(indexAt(x, y + 1));
      }
      if (x > 0) {
        cross.push(indexAt(x - 1, y));
      }
      return cross;
    }

    function flipCross(index) {
      var cross = crossOf(index);
      for (var step = 0; step < cross.length; step += 1) {
        flipCell(cross[step]);
      }
    }

    /* Paint the state, then report how many lamps are still burning. Spill is
     * the one piece of the light model that has to be arithmetic: a lamp is
     * measured against its neighbours, so an unlit cell beside three lit ones
     * visibly glows from their light without being lit itself. */
    function renderCells() {
      var lit = 0;
      for (var index = 0; index < cells.length; index += 1) {
        var on = cells[index];
        if (on) {
          lit += 1;
        }
        buttons[index].classList.toggle("is-on", on);
        buttons[index].setAttribute("aria-pressed", String(on));
        buttons[index].setAttribute(
          "aria-label",
          t("litCell", { n: index + 1 }) +
            ", " +
            t(on ? "litOn" : "litOff"),
        );
      }
      for (var cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
        var cross = crossOf(cellIndex);
        var near = 0;
        for (var arm = 1; arm < cross.length; arm += 1) {
          if (cells[cross[arm]]) {
            near += 1;
          }
        }
        buttons[cellIndex].style.setProperty("--lit-spill", String(near));
      }
      if (stageEl) {
        stageEl.style.setProperty(
          "--lit-load",
          String(Math.round((lit / cells.length) * 100) / 100),
        );
      }
      return lit;
    }

    /* A flip is armed in two passes: the class leaves and the delay is chosen
     * before the state repaints, then one forced recalc lets the same animation
     * run again on the very next tap of the same cell. */
    function armFlip(index, delay) {
      var cell = buttons[index];
      cell.classList.remove("is-flip-up", "is-flip-down", "is-struck");
      cell.style.setProperty("--lit-delay", delay + "ms");
    }

    function playFlip(index, goingOn, struck) {
      var cell = buttons[index];
      cell.classList.add(goingOn ? "is-flip-up" : "is-flip-down");
      if (struck) {
        cell.classList.add("is-struck");
      }
    }

    function clearFlips() {
      for (var index = 0; index < buttons.length; index += 1) {
        buttons[index].classList.remove("is-flip-up", "is-flip-down", "is-struck");
        buttons[index].style.setProperty("--lit-delay", "0ms");
      }
    }

    function renderStats() {
      movesEl.textContent = String(moves);
      levelEl.textContent = level + "/" + totalLevels;
      var best = levelBest();
      bestStatEl.textContent = best ? String(best) : "\u2014";
      bestEl.textContent = best
        ? t("litBestLine", { n: best })
        : t("noBest");
    }

    function newBoard(playedLevel) {
      level = clampLevel(playedLevel);
      cells = [];
      for (var index = 0; index < litSize * litSize; index += 1) {
        cells.push(false);
      }
      var presses = litLevels[level - 1].presses;
      for (var press = 0; press < presses; press += 1) {
        flipCross(Math.floor(Math.random() * cells.length));
      }
      /* A shuffle may land on a solved board by chance; one extra cross
       * guarantees there is always something to do. */
      var dark = cells.every(function (on) {
        return !on;
      });
      if (dark) {
        flipCross(Math.floor(Math.random() * cells.length));
      }
      moves = 0;
      solved = false;
      clearFlips();
      litNow = renderCells();
      renderStats();
      resultEl.textContent = t("litPrompt");
      resultEl.classList.remove("is-win");
      igniteBoard();
    }

    /* The board deals itself in and the surviving lamps strike on along a
     * diagonal, so the panel opens on a wall that is powering up rather than on
     * twenty-five squares that were simply always there. */
    function igniteBoard() {
      fxCall("stagger", [buttons, { step: 13, kind: "drop", ms: 300 }]);
      var burning = [];
      for (var index = 0; index < cells.length; index += 1) {
        if (cells[index]) {
          burning.push(index);
        }
      }
      for (var spark = 0; spark < burning.length; spark += 1) {
        var spot = burning[spark];
        armFlip(
          spot,
          170 + (Math.floor(spot / litSize) + (spot % litSize)) * 42,
        );
      }
      if (burning.length) {
        void gridEl.offsetWidth;
        for (var flare = 0; flare < burning.length; flare += 1) {
          playFlip(burning[flare], true, false);
        }
        sfx("flip");
      }
    }

    /* The recessed plate the lamps are mounted on, with the wiring showing
     * through it. Built here because the four pages own the panel markup. */
    function buildStage() {
      var parent = gridEl.parentNode;
      if (!parent) {
        return;
      }
      stageEl = document.createElement("div");
      stageEl.className = "lit-stage";
      var backer = draw("pattern", "circuit", {
        hue: litBulbHue,
        tile: 24,
        cls: "lit-backer",
      });
      if (backer) {
        stageEl.appendChild(backer);
      }
      parent.insertBefore(stageEl, gridEl);
      stageEl.appendChild(gridEl);
    }

    function buildGrid() {
      gridEl.textContent = "";
      buttons = [];
      for (var index = 0; index < litSize * litSize; index += 1) {
        (function (cellIndex) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "lit-cell";
          /* A fixed per-cell phase keeps the breathing lamps out of lockstep
           * without making the board unpredictable between visits. */
          button.style.setProperty("--lit-phase", String(((cellIndex * 7) % 5) * 0.6));
          button.tabIndex = cellIndex === 0 ? 0 : -1;
          var glow = document.createElement("span");
          glow.className = "lit-glow";
          button.appendChild(glow);
          button.appendChild(buildLamp());
          button.addEventListener("click", function () {
            tapCell(cellIndex);
          });
          gridEl.appendChild(button);
          buttons.push(button);
        })(index);
      }
    }

    function isSolved() {
      return cells.every(function (on) {
        return !on;
      });
    }

    /* Twenty-five buttons is too many to walk with Tab: the arrows steer a
     * roving focus around the fixture and Enter or Space throws the switch. */
    function focusCell(index) {
      for (var step = 0; step < buttons.length; step += 1) {
        buttons[step].tabIndex = step === index ? 0 : -1;
      }
      if (buttons[index] && buttons[index].focus) {
        buttons[index].focus();
      }
    }

    function steerGrid(event) {
      var stride = litStrides[event.key];
      if (typeof stride !== "number") {
        return;
      }
      var from = buttons.indexOf(document.activeElement);
      if (from < 0) {
        return;
      }
      var x = from % litSize;
      if ((stride === -1 && x === 0) || (stride === 1 && x === litSize - 1)) {
        return;
      }
      var to = from + stride;
      if (to < 0 || to >= buttons.length) {
        return;
      }
      event.preventDefault();
      focusCell(to);
    }

    function tapCell(index) {
      if (solved) {
        /* The wall is already dark; a poke still deserves an answer. */
        fxOn("shake", buttons[index], { kind: "y", dist: 5 });
        sfx("wrong");
        return;
      }

      var cross = crossOf(index);
      var arm;
      for (arm = 0; arm < cross.length; arm += 1) {
        armFlip(cross[arm], arm === 0 ? 0 : litArmLead + (arm - 1) * litArmStep);
      }

      flipCross(index);
      moves += 1;
      var lit = renderCells();

      void gridEl.offsetWidth;
      for (arm = 0; arm < cross.length; arm += 1) {
        playFlip(cross[arm], cells[cross[arm]], arm === 0);
      }

      sfx("tap");
      fxOn("ring", buttons[index], { hue: litBulbHue });
      fxOn("pop", movesEl, { scale: 1.16, ms: 220 });
      renderStats();

      if (isSolved()) {
        solved = true;
        var previousBest = levelBest();
        var isBest = !previousBest || moves < previousBest;
        if (isBest) {
          progress.bests[String(level)] = moves;
        }
        var bestLine = isBest
          ? t("newBest")
          : t("litBestLine", { n: previousBest });
        var nextLine;
        if (level < totalLevels) {
          progress.level = level + 1;
          nextLine = t("litLevelUp", { n: level + 1, total: totalLevels });
        } else {
          nextLine = t("litDone", { total: totalLevels });
        }
        var message = t("litSolved", { n: moves }) + " " + bestLine;
        message += " " + nextLine;
        saveProgress();
        resultEl.textContent = message;
        resultEl.classList.add("is-win");
        logAction(t("logLit", { n: moves }));
        var rect = newBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        petNotifyGame(isBest);
        renderStats();
        /* A round that ends should arrive as an event, and the verb that
         * unlocks next is the one on the button it sweeps. */
        fxCall("ceremony", [
          hostEl,
          {
            tone: "win",
            stars: starsFor(litLevels[level - 1].presses, moves),
            title: t("litSolved", { n: moves }),
            lines: [bestLine, nextLine],
          },
        ]);
        fxOn("sweep", newBtn);
        return;
      }

      /* How many lamps are left is the only number a player is actually
       * hunting, and it belongs at the switch they just threw. */
      var delta = lit - litNow;
      litNow = lit;
      fxCall("floatText", [
        buttons[index],
        String(lit),
        delta < 0
          ? { kind: "good" }
          : { kind: "callout", hue: litBulbHue },
      ]);
    }

    newBtn.addEventListener("click", function () {
      newBoard(solved ? clampLevel(progress.level) : level);
    });
    gridEl.addEventListener("keydown", steerGrid);

    buildGrid();
    buildStage();
    newBoard(level);
  }


  /* Exported for the other modules. */
  App.initLightsGame = initLightsGame;
})(window.CapitalConvert = window.CapitalConvert || {});
