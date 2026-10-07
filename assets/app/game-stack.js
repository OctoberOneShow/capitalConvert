/* Stack! - The drop-and-trim tower mini-game in the shared game drawer. */
(function (App) {
  var localStorage = App.storage;
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var stackBestKey = "stack-tower-best";
  var stackBlockH = 18;
  var stackBaseW = 96;
  var stackMinW = 14;
  var stackPerfectTol = 5;
  var stackBaseSpeed = 88;
  var stackSpeedGain = 3.2;
  var stackMaxSpeed = 260;
  var stackVisible = 9;
  var stackTickMs = 16;
  var stackPalette = [
    "#22d3ee",
    "#fbbf24",
    "#f472b6",
    "#a3e635",
    "#a78bfa",
    "#e2e8f0",
  ];

  function initStackGame() {
    var field = getElement("stackField");
    var towerEl = getElement("stackTower");
    var blockEl = getElement("stackBlock");
    var heightEl = getElement("stackHeight");
    var streakEl = getElement("stackStreak");
    var bestStatEl = getElement("stackBestStat");
    var resultEl = getElement("stackResult");
    var startBtn = getElement("stackStartBtn");
    var bestEl = getElement("stackBest");
    if (
      !field ||
      !towerEl ||
      !blockEl ||
      !heightEl ||
      !streakEl ||
      !bestStatEl ||
      !resultEl ||
      !startBtn ||
      !bestEl
    ) {
      return;
    }

    var panelEl = getElement("gamePanelStack") || field.parentNode;
    var blocks = [];
    var running = false;
    var intervalId = null;
    var sliderX = 0;
    var sliderW = stackBaseW;
    var dir = 1;
    var streak = 0;
    /* The presentation half of the round: one drawn node per landed block, the
     * timeouts the beats arm, and the ceremony still holding this round open. */
    var tiles = [];
    var timers = [];
    var dismissCeremony = null;
    var restartLock = false;
    var skyEl = null;
    var floorEl = null;
    var shakeEl = null;
    var swayEl = null;
    var guideEl = null;
    var cutEl = null;
    var readyEl = null;
    var comboEl = null;

    /* Hue read off the block colour, so every spark, shear flash and ring is lit
     * by the block it came from rather than a second palette that can drift out
     * of sync with stackPalette. */
    var tintHue = [];

    function hueOf(color) {
      var r = parseInt(color.substr(1, 2), 16) / 255;
      var g = parseInt(color.substr(3, 2), 16) / 255;
      var b = parseInt(color.substr(5, 2), 16) / 255;
      var max = Math.max(r, g, b);
      var min = Math.min(r, g, b);
      var span = max - min;
      var hue;
      if (!span) {
        return 196;
      }
      if (max === r) {
        hue = (g - b) / span + (g < b ? 6 : 0);
      } else if (max === g) {
        hue = (b - r) / span + 2;
      } else {
        hue = (r - g) / span + 4;
      }
      return Math.round(hue * 60);
    }

    function colorAt(index) {
      var wrapped = ((index % stackPalette.length) + stackPalette.length) %
        stackPalette.length;
      return stackPalette[wrapped];
    }

    function hueAt(index) {
      var wrapped = ((index % tintHue.length) + tintHue.length) %
        tintHue.length;
      return tintHue[wrapped];
    }

    for (var seed = 0; seed < stackPalette.length; seed += 1) {
      tintHue.push(hueOf(stackPalette[seed]));
    }

    function motionOff() {
      return App.isMotionOff ? App.isMotionOff() : false;
    }

    function calm() {
      return App.isMotionCalm ? App.isMotionCalm() : false;
    }

    /* Both wrappers exist so a harness that boots this module without
     * game-fx.js still plays the game. */
    function fx(name, el, opts) {
      if (App.fx && typeof App.fx[name] === "function") {
        App.fx[name](el, opts);
      }
    }

    function sfx(name) {
      if (App.playSfx) {
        App.playSfx(name);
      }
    }

    /* floatText takes (el, text, opts), which the generic wrapper above cannot
     * forward, so the one call site that needs it gets its own guard. */
    function floatAt(el, text, hue) {
      if (App.fx && typeof App.fx.floatText === "function") {
        App.fx.floatText(el, text, { kind: "good", hue: hue });
      }
    }

    function later(ms, fn) {
      var id = window.setTimeout(function () {
        for (var index = timers.length - 1; index >= 0; index -= 1) {
          if (timers[index] === id) {
            timers.splice(index, 1);
            break;
          }
        }
        fn();
      }, ms);
      timers.push(id);
      return id;
    }

    function clearTimers() {
      while (timers.length) {
        window.clearTimeout(timers.pop());
      }
    }

    function fieldW() {
      return field.clientWidth || 360;
    }

    function readBest() {
      var value = parseInt(localStorage.getItem(stackBestKey), 10);
      return isNaN(value) ? 0 : value;
    }

    function renderBest() {
      var best = readBest();
      bestStatEl.textContent = String(best);
      bestEl.textContent = best ? String(best) : t("noBest");
    }

    /* A chip that just changed says so, per the shared .is-bump hook. */
    function bumpChip(el) {
      var chip = el.parentNode;
      if (!chip || !chip.classList) {
        return;
      }
      chip.classList.add("is-bump");
      later(640, function () {
        chip.classList.remove("is-bump");
      });
    }

    /* ------------------------------------------------------------ the stage */
    /* Three nested layers, one transform each, so the camera scroll, the landing
     * kick and the sway can never overwrite one another's transform. */
    function buildStage() {
      skyEl = document.createElement("div");
      skyEl.className = "stack-sky";
      skyEl.setAttribute("aria-hidden", "true");
      if (App.art) {
        skyEl.appendChild(
          App.art.pattern("grid", { hue: 198, tile: 24, cls: "stack-grid" }),
        );
        skyEl.appendChild(
          App.art.pattern("stars", { hue: 205, tile: 36, cls: "stack-stars" }),
        );
      }
      var glow = document.createElement("div");
      glow.className = "stack-glow";
      skyEl.appendChild(glow);
      field.appendChild(skyEl);

      towerEl.className = "stack-tower";
      shakeEl = document.createElement("div");
      shakeEl.className = "stack-shake";
      swayEl = document.createElement("div");
      swayEl.className = "stack-sway";
      shakeEl.appendChild(swayEl);
      towerEl.appendChild(shakeEl);
      /* The sliding block joins the course, so it scrolls, kicks and sways with
       * the tower it is about to land on. */
      swayEl.appendChild(blockEl);

      guideEl = document.createElement("div");
      guideEl.className = "stack-aim";
      guideEl.setAttribute("aria-hidden", "true");
      var guideMark = document.createElement("span");
      guideMark.className = "stack-aim-mark";
      if (App.art) {
        guideMark.appendChild(App.art.icon("sparkle", { hue: 48, size: 13 }));
      }
      guideEl.appendChild(guideMark);
      swayEl.appendChild(guideEl);

      cutEl = document.createElement("div");
      cutEl.className = "stack-cut";
      cutEl.setAttribute("aria-hidden", "true");
      swayEl.appendChild(cutEl);

      floorEl = document.createElement("div");
      floorEl.className = "stack-floor";
      floorEl.setAttribute("aria-hidden", "true");
      field.appendChild(floorEl);

      readyEl = document.createElement("div");
      readyEl.className = "stack-ready";
      readyEl.setAttribute("aria-hidden", "true");
      if (App.art) {
        readyEl.appendChild(
          App.art.icon("hand", { hue: 196, size: 19, tone: "soft" }),
        );
      }
      var readyRing = document.createElement("span");
      readyRing.className = "stack-ready-ring";
      readyEl.appendChild(readyRing);
      field.appendChild(readyEl);
    }

    function setMode(mode) {
      field.classList.remove("is-idle");
      field.classList.remove("is-play");
      field.classList.remove("is-over");
      field.classList.add("is-" + mode);
    }

    function cameraShift() {
      return Math.max(0, blocks.length - stackVisible) * stackBlockH;
    }

    /* A taller tower leans further and sways sooner; calm mode halves the
     * amplitude and the sheet pins the animation off under data-motion="off". */
    function syncCamera(smooth) {
      var lean = Math.max(0, blocks.length - 2) * 0.075;
      lean = Math.min(calm() ? 0.5 : 1.15, lean);
      if (!smooth) {
        towerEl.classList.add("is-instant");
      }
      towerEl.style.setProperty("--stack-shift", cameraShift() + "px");
      towerEl.style.setProperty("--stack-lean", lean.toFixed(2) + "deg");
      towerEl.style.setProperty(
        "--stack-sway-ms",
        Math.max(2.6, 5.4 - blocks.length * 0.07).toFixed(2) + "s",
      );
      if (!smooth) {
        void towerEl.offsetWidth;
        towerEl.classList.remove("is-instant");
      }
    }

    function rowBottom(index) {
      return index * stackBlockH;
    }

    function paintBlock(node, block, index) {
      node.style.left = block.x + "px";
      node.style.width = Math.max(4, block.w) + "px";
      node.style.bottom = rowBottom(index) + "px";
      node.style.setProperty("--stack-c", colorAt(block.tint));
    }

    /* Rows never move inside the course, so a landed block only ever needs its
     * own node; the camera is a layer transform, not a re-paint. */
    function syncTiles() {
      while (tiles.length > blocks.length) {
        var extra = tiles.pop();
        if (extra.parentNode) {
          extra.parentNode.removeChild(extra);
        }
      }
      for (var index = tiles.length; index < blocks.length; index += 1) {
        var node = document.createElement("span");
        node.className = "stack-tile";
        node.setAttribute("aria-hidden", "true");
        paintBlock(node, blocks[index], index);
        tiles.push(node);
        swayEl.insertBefore(node, blockEl);
      }
    }

    function renderTower(smooth) {
      syncTiles();
      var top = blocks[blocks.length - 1];
      blockEl.hidden = false;
      blockEl.style.setProperty("--stack-c", colorAt(top.tint + 1));
      syncCamera(smooth);
    }

    function detach(node) {
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }

    function clearTransient() {
      var names = [
        "stack-chip",
        "stack-dust",
        "stack-shear",
        "stack-lost",
        "stack-flare",
        "stack-seam",
        "stack-drop-shadow",
        "stack-cut-face",
      ];
      for (var s = 0; s < names.length; s += 1) {
        var found = swayEl.querySelectorAll("." + names[s]);
        for (var i = found.length - 1; i >= 0; i -= 1) {
          detach(found[i]);
        }
      }
      detach(comboEl);
    }

    /* ------------------------------------------------------------- the beats */
    function play(node, frames, opts) {
      if (
        motionOff() ||
        !node ||
        typeof node.animate !== "function" ||
        !frames ||
        !frames.length
      ) {
        return null;
      }
      try {
        return node.animate(frames, opts);
      } catch (error) {
        /* A rejected frame set must never cost a turn. */
        return null;
      }
    }

    /* A node that has to leave the course whether or not its animation ever
     * reports finishing - a hidden tab parks both rAF and finish events. */
    function playOnce(node, frames, opts) {
      var ms = (opts && opts.duration) || 320;
      var delay = (opts && opts.delay) || 0;
      var anim = play(node, frames, opts);
      var done = false;
      var wipe = function () {
        if (done) {
          return;
        }
        done = true;
        detach(node);
      };
      if (anim && anim.finished) {
        anim.finished.then(wipe, wipe);
      }
      later(ms + delay + 220, wipe);
    }

    /* The block's own cast shadow: a soft bed as wide as the block, sitting on
     * the row it lands on, so the slab reads as held above the tower. `quiet`
     * stands in for a perfect drop, whose own beat already lights the rows below
     * and would otherwise be running two pulses on the same slabs. */
    function blockShadow(node, rowIndex, quiet) {
      var shadow = null;
      if (!motionOff()) {
        shadow = document.createElement("span");
        shadow.className = "stack-drop-shadow";
        shadow.style.left = node.style.left;
        shadow.style.width = node.style.width;
        shadow.style.bottom = rowBottom(rowIndex) - 3 + "px";
        swayEl.insertBefore(shadow, blockEl);
      }
      play(
        node,
        [
          { transform: "translateY(-11px) scaleY(1.05)" },
          { transform: "translateY(2px) scaleY(0.86)", offset: 0.46 },
          { transform: "translateY(-3px) scaleY(0.99)", offset: 0.72 },
          { transform: "translateY(0) scaleY(1)" },
        ],
        { duration: 340, easing: "cubic-bezier(0.22,0.8,0.3,1)" },
      );
      /* Mass: the footing takes the hit too. A flicker travels into the row
       * below and, on a tall tower, one further down, so the impact is felt by
       * the column rather than only by the slab that moved. */
      if (!quiet) {
        for (var depth = 1; depth <= 2; depth += 1) {
          var under = tiles[rowIndex - depth];
          if (!under) {
            break;
          }
          play(
            under,
            [
              { filter: "brightness(1)" },
              { filter: "brightness(" + (1.16 - depth * 0.05) + ")" },
              { filter: "brightness(1)" },
            ],
            { duration: 300, delay: depth * 40, easing: "ease-out" },
          );
        }
      }
      if (!shadow) {
        return;
      }
      play(
        shadow,
        [
          {
            transform: "translateY(-11px) scaleX(0.74) scaleY(1.7)",
            opacity: 0.18,
          },
          {
            transform: "translateY(2px) scaleX(1.07) scaleY(1)",
            opacity: 0.6,
            offset: 0.46,
          },
          { transform: "translateY(0) scaleX(1) scaleY(1)", opacity: 0 },
        ],
        { duration: 340, easing: "cubic-bezier(0.22,0.8,0.3,1)" },
      );
      playOnce(
        shadow,
        [{ opacity: 1 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }],
        { duration: 520 },
      );
    }

    /* The defining animation: the overhang breaks off along the shear line and
     * falls as its own chip, and the block it came from dips and shows the
     * freshly cut face. */
    function shear(target, node, rowIndex, x, w, side, hue) {
      if (motionOff()) {
        return;
      }
      var chip = document.createElement("span");
      chip.className = "stack-tile stack-chip";
      chip.setAttribute("aria-hidden", "true");
      chip.style.left = x + "px";
      chip.style.width = Math.max(2, w) + "px";
      chip.style.bottom = rowBottom(rowIndex) + "px";
      /* The overhang broke off the block that just landed, not the one under it,
       * so the chip wears this row's tint or it reads as a piece of the tower. */
      chip.style.setProperty("--stack-c", colorAt(target.tint + 1));
      swayEl.appendChild(chip);
      playOnce(
        chip,
        [
          {
            transform: "translate(0, 0) rotate(0deg)",
            opacity: 1,
            filter: "brightness(1.3)",
          },
          {
            transform:
              "translate(" +
              side * (3 + w * 0.1) +
              "px, -4px) rotate(" +
              side * 7 +
              "deg)",
            opacity: 1,
            filter: "brightness(1.16)",
            offset: 0.16,
          },
          {
            transform:
              "translate(" +
              side * (19 + w * 0.45) +
              "px, 150px) rotate(" +
              side * (96 + w * 2.4) +
              "deg)",
            opacity: 0,
            filter: "brightness(0.72)",
          },
        ],
        { duration: 540, easing: "cubic-bezier(0.36,0,0.78,0.5)" },
      );

      var edge = side < 0 ? x : x + w;
      var dustCount = Math.min(5, 2 + Math.round(w / 9));
      for (var i = 0; i < dustCount; i += 1) {
        var dust = document.createElement("span");
        dust.className = "stack-dust";
        dust.style.left = edge + "px";
        dust.style.bottom = rowBottom(rowIndex) + stackBlockH - 5 + "px";
        swayEl.appendChild(dust);
        playOnce(
          dust,
          [
            { transform: "translate(0, 0) scale(1)", opacity: 0.9 },
            {
              transform:
                "translate(" +
                side * (10 + i * 8) +
                "px, " +
                (12 + i * 8) +
                "px) scale(0.15)",
              opacity: 0,
            },
          ],
          { duration: 420 + i * 60 },
        );
      }

      var shearFlash = document.createElement("span");
      shearFlash.className = "stack-shear";
      shearFlash.style.left = edge - 1 + "px";
      shearFlash.style.bottom = rowBottom(rowIndex) - 3 + "px";
      shearFlash.style.height = stackBlockH + 8 + "px";
      shearFlash.style.setProperty("--stack-h", hue);
      swayEl.appendChild(shearFlash);
      playOnce(
        shearFlash,
        [
          { transform: "scaleY(0.3)", opacity: 0 },
          { transform: "scaleY(1.12)", opacity: 1, offset: 0.28 },
          { transform: "scaleY(1)", opacity: 0 },
        ],
        { duration: 380 },
      );

      var face = document.createElement("span");
      face.className = "stack-cut-face " + (side > 0 ? "is-right" : "is-left");
      node.appendChild(face);
      playOnce(
        face,
        [{ opacity: 0.95 }, { opacity: 0.4, offset: 0.4 }, { opacity: 0 }],
        { duration: 720 },
      );
      play(
        node,
        [
          { transform: "scaleY(1)" },
          { transform: "scaleY(0.9)", offset: 0.28 },
          { transform: "scaleY(1.03)", offset: 0.6 },
          { transform: "scaleY(1)" },
        ],
        { duration: 420, easing: "ease-out" },
      );
    }

    /* A perfect drop spells the streak out beside the tower: a star glyph plus
     * the number, so the beat never rests on colour alone. */
    function comboBadge(count, hue) {
      if (!comboEl) {
        comboEl = document.createElement("div");
        comboEl.className = "stack-combo";
        comboEl.setAttribute("aria-hidden", "true");
        if (App.art) {
          comboEl.appendChild(
            App.art.icon("star", { hue: 48, size: 15, tone: "soft" }),
          );
        }
        var value = document.createElement("span");
        value.className = "stack-combo-value";
        comboEl.appendChild(value);
      }
      var label = comboEl.querySelector(".stack-combo-value");
      if (label) {
        label.textContent = "x" + count;
      }
      comboEl.style.setProperty("--stack-h", hue);
      if (!comboEl.parentNode) {
        field.appendChild(comboEl);
      }
      play(
        comboEl,
        [
          { transform: "translateY(10px) scale(0.5)", opacity: 0 },
          { transform: "translateY(0) scale(1.22)", opacity: 1, offset: 0.28 },
          { transform: "translateY(-2px) scale(1)", opacity: 1, offset: 0.66 },
          { transform: "translateY(-16px) scale(0.94)", opacity: 0 },
        ],
        { duration: 1000, easing: "cubic-bezier(0.2,0.8,0.3,1)" },
      );
      later(1240, function () {
        detach(comboEl);
      });
    }

    /* A clean drop is the loudest beat the game has, and it has to escalate:
     * the fifth perfect in a row should not look like the first. Everything it
     * draws is classed so clearTransient can wipe it on a reset or a tab switch. */
    function perfectBeat(node, rowIndex, count) {
      /* 0 on the first perfect, 1 by the seventh - the dial every amplitude
       * below is read from, so calm and short streaks stay restrained. */
      var heat = Math.min(1, Math.max(0, (count - 1) / 6));
      var x = parseFloat(node.style.left) || 0;
      var w = parseFloat(node.style.width) || stackBaseW;
      var row = rowBottom(rowIndex);
      /* Without motion the drawn nodes would sit there as two static gold bars
       * for the length of an animation that never ran, so they are not built. */
      var loud = !motionOff();

      if (loud) {
        var flare = document.createElement("span");
        flare.className = "stack-flare";
        flare.style.left = x - 8 + "px";
        flare.style.width = w + 16 + "px";
        flare.style.bottom = row - 6 + "px";
        swayEl.appendChild(flare);
        playOnce(
          flare,
          [
            { transform: "scale(0.5)", opacity: 0 },
            { transform: "scale(1.05)", opacity: 0.95, offset: 0.24 },
            { transform: "scale(" + (1.5 + heat * 0.5) + ")", opacity: 0 },
          ],
          { duration: 560 + heat * 180, easing: "cubic-bezier(0.2,0.7,0.3,1)" },
        );

        var seam = document.createElement("span");
        seam.className = "stack-seam";
        seam.style.left = x - 16 + "px";
        seam.style.width = w + 32 + "px";
        seam.style.bottom = row - 1 + "px";
        swayEl.appendChild(seam);
        playOnce(
          seam,
          [
            { transform: "scaleX(0.18)", opacity: 0 },
            { transform: "scaleX(1)", opacity: 1, offset: 0.2 },
            { transform: "scaleX(1.5)", opacity: 0 },
          ],
          { duration: 500, easing: "cubic-bezier(0.2,0.7,0.3,1)" },
        );
      }

      /* The tower rings from the strike: the pulse climbs from the row that took
       * it, so the column reads as one object rather than a pile of rectangles.
       * The landed slab keeps its own .is-perfect outline, so it starts below. */
      var rung = Math.min(5, rowIndex);
      for (var i = 0; i < rung; i += 1) {
        play(
          tiles[rowIndex - 1 - i],
          [
            { filter: "brightness(1)" },
            { filter: "brightness(" + (1.6 - i * 0.09 - heat * 0.06) + ")" },
            { filter: "brightness(1)" },
          ],
          { duration: 380, delay: 40 + i * 46, easing: "ease-out" },
        );
      }

      fx("ring", node, { hue: 48 });
      fx("burst", node, {
        kind: "spark",
        count: 12 + Math.round(heat * 14),
        hue: 48,
      });
      if (count >= 3) {
        fx("burst", node, {
          kind: "star",
          count: 5 + Math.round(heat * 7),
          hue: 48,
        });
      }
      fx("sweep", node);
      fx("flash", field, { hue: 48, ms: 360 + heat * 140 });
      node.classList.add("is-perfect");
      later(760, function () {
        node.classList.remove("is-perfect");
      });
      comboBadge(count, 48);
      sfx(count >= 4 ? "levelup" : "star");
      fx("jolt", shakeEl, { dist: 3 + heat * 2.6, ms: 200 });
    }

    function landBlock(shot, top, node, rowIndex, perfect) {
      var hue = hueAt(top.tint + 1);
      blockShadow(node, rowIndex, perfect);
      if (perfect) {
        /* A clean drop gets its own, louder beat. */
        perfectBeat(node, rowIndex, streak);
        return;
      }
      var trimLeft = top.x - shot.x;
      var trimRight = shot.x + shot.w - (top.x + top.w);
      if (trimLeft > 1) {
        shear(top, node, rowIndex, shot.x, trimLeft, -1, hue);
      }
      if (trimRight > 1) {
        shear(top, node, rowIndex, top.x + top.w, trimRight, 1, hue);
      }
      floatAt(node, "+1", hue);
      sfx("land");
      fx("jolt", shakeEl, {
        dist: 1.8 + Math.min(3, blocks.length / 6) + (trimLeft + trimRight > 20 ? 1 : 0),
        ms: 200,
      });
    }

    /* -------------------------------------------------------------- the aim */
    function hideAim() {
      guideEl.classList.add("is-off");
      cutEl.classList.add("is-off");
    }

    /* The reason the stage is readable: the survivor's footprint and the edge the
     * overhang breaks on, live, while the block is still moving. */
    function updateAim() {
      if (!blocks.length) {
        hideAim();
        return;
      }
      var top = blocks[blocks.length - 1];
      var left = Math.max(sliderX, top.x);
      var right = Math.min(sliderX + sliderW, top.x + top.w);
      var overlap = right - left;
      /* The footprint sits on the top block's own face - the row above it is
       * where the opaque sliding block is standing, so a shadow there would
       * never be seen. */
      var row = rowBottom(blocks.length - 1);
      if (overlap <= 0) {
        hideAim();
        return;
      }
      guideEl.classList.remove("is-off");
      guideEl.style.left = left + "px";
      guideEl.style.width = Math.max(2, overlap) + "px";
      guideEl.style.bottom = row + "px";
      guideEl.classList.toggle(
        "is-perfect",
        Math.abs(sliderX - top.x) <= stackPerfectTol,
      );

      var trimLeft = top.x - sliderX;
      var trimRight = sliderX + sliderW - (top.x + top.w);
      var side = trimRight > 1 ? 1 : trimLeft > 1 ? -1 : 0;
      if (!side) {
        cutEl.classList.add("is-off");
        return;
      }
      cutEl.classList.remove("is-off");
      cutEl.classList.toggle("is-left", side < 0);
      cutEl.style.left = (side > 0 ? top.x + top.w : top.x) - 1 + "px";
      cutEl.style.bottom = row - 2 + "px";
      cutEl.style.height = stackBlockH * 2 + 6 + "px";
    }

    function currentSpeed() {
      return Math.min(
        stackMaxSpeed,
        stackBaseSpeed + blocks.length * stackSpeedGain,
      );
    }

    function spawnSlider() {
      var top = blocks[blocks.length - 1];
      sliderW = top.w;
      dir = blocks.length % 2 === 0 ? 1 : -1;
      sliderX = dir === 1 ? -sliderW : fieldW();
      blockEl.hidden = false;
      blockEl.style.width = sliderW + "px";
      blockEl.style.left = sliderX + "px";
      blockEl.style.bottom = rowBottom(blocks.length) + "px";
      blockEl.style.setProperty("--stack-c", colorAt(top.tint + 1));
      blockEl.classList.remove("is-idle");
      setMode("play");
      fx("pop", blockEl, { scale: 1.1, ms: 200 });
    }

    /* The waiting state: the base block on the ledge with its partner drifting
     * above it, so the board arrives composed instead of empty. The drift is a
     * CSS transform, so no timer survives a hidden panel. */
    function idleSlider() {
      var base = blocks[0];
      var reach = Math.max(18, (fieldW() - base.w) / 2 - 12);
      blockEl.hidden = false;
      blockEl.classList.add("is-idle");
      blockEl.style.width = base.w + "px";
      blockEl.style.left = base.x + "px";
      blockEl.style.bottom = rowBottom(1) + "px";
      blockEl.style.setProperty("--stack-c", colorAt(base.tint + 1));
      /* The drift is a CSS transform, so the travel is handed over as extents
       * measured against the field this paint sees. */
      blockEl.style.setProperty("--stack-drift-a", -reach + "px");
      blockEl.style.setProperty("--stack-drift-b", reach + "px");
      setMode("idle");
      hideAim();
    }

    function stopLoop() {
      window.clearInterval(intervalId);
      intervalId = null;
    }

    function resetBoard() {
      stopLoop();
      clearTimers();
      closeCeremony();
      running = false;
      restartLock = false;
      streak = 0;
      blocks = [
        {
          x: (fieldW() - stackBaseW) / 2,
          w: stackBaseW,
          tint: Math.floor(Math.random() * stackPalette.length),
        },
      ];
      clearTransient();
      renderTower(false);
      idleSlider();
      heightEl.textContent = "0";
      streakEl.textContent = "0";
      renderBest();
      resultEl.textContent = t("stackPrompt");
      resultEl.classList.remove("is-lose");
      resultEl.classList.remove("is-win");
    }

    function startRound() {
      resetBoard();
      running = true;
      spawnSlider();
      updateAim();
      resultEl.textContent = t("stackGo");
      resultEl.classList.remove("is-lose");
      sfx("select");
      intervalId = window.setInterval(tick, stackTickMs);
      field.focus();
    }

    /* The miss: the block rides its own momentum off the tower and the top rows
     * come down after it, leaning to the side that lost the footing. */
    function topple(top) {
      if (motionOff()) {
        return;
      }
      var side = sliderX + sliderW / 2 >= top.x + top.w / 2 ? 1 : -1;
      var lost = document.createElement("span");
      lost.className = "stack-tile stack-lost";
      lost.setAttribute("aria-hidden", "true");
      lost.style.left = sliderX + "px";
      lost.style.width = Math.max(4, sliderW) + "px";
      lost.style.bottom = rowBottom(blocks.length) + "px";
      lost.style.setProperty("--stack-c", colorAt(top.tint + 1));
      swayEl.appendChild(lost);
      playOnce(
        lost,
        [
          { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
          {
            transform:
              "translate(" + side * 26 + "px, 62px) rotate(" + side * 42 + "deg)",
            opacity: 1,
            offset: 0.5,
          },
          {
            transform:
              "translate(" +
              side * 64 +
              "px, 240px) rotate(" +
              side * 154 +
              "deg)",
            opacity: 0,
          },
        ],
        { duration: 780, easing: "cubic-bezier(0.4,0,0.9,0.5)" },
      );

      var count = Math.min(7, tiles.length);
      for (var i = 0; i < count; i += 1) {
        play(
          tiles[tiles.length - 1 - i],
          [
            { transform: "rotate(0deg) translate(0, 0)", opacity: 1 },
            {
              transform:
                "rotate(" +
                side * (5 + i * 2) +
                "deg) translate(" +
                side * (4 + i * 3) +
                "px, " +
                (6 + i * 4) +
                "px)",
              opacity: 1,
              offset: 0.3,
            },
            {
              transform:
                "rotate(" +
                side * (34 + i * 9) +
                "deg) translate(" +
                side * (30 + i * 12) +
                "px, " +
                (196 + i * 16) +
                "px)",
              opacity: 0,
            },
          ],
          {
            duration: 660 + i * 40,
            delay: 90 + i * 55,
            easing: "cubic-bezier(0.45,0,0.85,0.5)",
            fill: "forwards",
          },
        );
      }
      fx("jolt", field, { dist: 5, ms: 260 });
      sfx("explode");
    }

    function closeCeremony() {
      if (dismissCeremony) {
        dismissCeremony();
        dismissCeremony = null;
      }
    }

    function gameOver() {
      stopLoop();
      running = false;
      hideAim();
      setMode("over");
      blockEl.hidden = true;
      blockEl.classList.remove("is-idle");

      var height = blocks.length - 1;
      var previousBest = readBest();
      var isBest = height > 0 && height > previousBest;
      if (isBest) {
        localStorage.setItem(stackBestKey, String(height));
      }
      var top = blocks[blocks.length - 1];
      resultEl.textContent =
        t("stackOver", { n: height }) + (isBest ? " " + t("newBest") : "");
      resultEl.classList.add("is-lose");
      renderBest();
      logAction(t("logStack", { n: height }));
      sfx("miss");
      topple(top);

      var lines = [
        t("hudHeight") + ": " + height,
        t("hudBest") + ": " + readBest(),
      ];
      if (isBest) {
        lines.push(t("newBest"));
        var rect = startBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
      petNotifyGame(isBest);

      /* A tap on the field means "start", so hold it off until this round's
       * ceremony has had time to be dismissed. */
      restartLock = true;
      later(1500, function () {
        restartLock = false;
      });
      later(motionOff() ? 60 : 660, function () {
        if (App.fx && typeof App.fx.ceremony === "function") {
          dismissCeremony = App.fx.ceremony(panelEl, {
            tone: "lose",
            stars: height > 0 ? (isBest ? 3 : 1) : 0,
            title: t("stackOver", { n: height }),
            lines: lines,
          });
        }
      });
    }

    function tick() {
      if (!running) {
        return;
      }
      sliderX += dir * (currentSpeed() * stackTickMs) / 1000;
      var maxX = fieldW() - sliderW;
      if (sliderX <= -sliderW * 0.4 && dir < 0) {
        dir = 1;
      } else if (sliderX >= maxX + sliderW * 0.4 && dir > 0) {
        dir = -1;
      }
      blockEl.style.left = sliderX + "px";
      updateAim();
    }

    function drop() {
      if (!running) {
        beginFromField();
        return;
      }
      var shot = { x: sliderX, w: sliderW };
      var top = blocks[blocks.length - 1];
      var left = Math.max(shot.x, top.x);
      var right = Math.min(shot.x + shot.w, top.x + top.w);
      var overlap = right - left;

      if (overlap < stackMinW) {
        gameOver();
        return;
      }

      var rowIndex = blocks.length;
      var perfect = Math.abs(shot.x - top.x) <= stackPerfectTol;
      var nextStreak = perfect ? streak + 1 : 0;
      if (perfect) {
        streak = nextStreak;
        blocks.push({ x: top.x, w: top.w, tint: top.tint + 1 });
        resultEl.textContent = t("stackPerfect", { n: streak });
        resultEl.classList.remove("is-lose");
        resultEl.classList.add("is-win");
      } else {
        streak = 0;
        blocks.push({ x: left, w: overlap, tint: top.tint + 1 });
        resultEl.classList.remove("is-win");
      }

      if (App.fx && typeof App.fx.countUp === "function") {
        App.fx.countUp(heightEl, heightEl.textContent, rowIndex, { ms: 260 });
        App.fx.countUp(streakEl, streakEl.textContent, nextStreak, { ms: 220 });
      } else {
        heightEl.textContent = String(rowIndex);
        streakEl.textContent = String(nextStreak);
      }
      bumpChip(heightEl);
      if (perfect) {
        bumpChip(streakEl);
      }
      renderTower(true);
      landBlock(shot, top, tiles[rowIndex], rowIndex, perfect);
      spawnSlider();
      updateAim();
    }

    /* The stage plays itself while the panel waits, so a tap on it means
     * "start" - a board that swallows the first click feels broken. */
    function beginFromField() {
      if (restartLock) {
        return;
      }
      startRound();
    }

    buildStage();
    startBtn.addEventListener("click", startRound);
    field.addEventListener("click", drop);
    field.addEventListener("keydown", function (event) {
      if (event.key === " " || event.key === "Enter" || event.key === "ArrowDown") {
        event.preventDefault();
        drop();
      }
    });

    App.quietResetStack = function () {
      clearTimers();
      closeCeremony();
      if (running) {
        resetBoard();
      }
    };

    resetBoard();
  }


  /* Exported for the other modules. */
  App.initStackGame = initStackGame;
})(window.CapitalConvert = window.CapitalConvert || {});
