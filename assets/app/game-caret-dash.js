/* Caret Dash - The falling-obstacle mini-game in the shared game drawer. */
(function (App) {
  var localStorage = App.storage;
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var isMotionOff = App.isMotionOff;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var caretDashBestKey = "caret-dash-best";
  /* Presentation fallbacks: the run itself must never depend on the feel or
   * illustration layers being present. */
  function noop() {}
  var fx = App.fx || {
    pop: noop,
    burst: noop,
    floatText: noop,
    flash: noop,
    stagger: noop,
    ceremony: noop,
  };
  var playSfx = App.playSfx || noop;
  var SVG_NS = "http://www.w3.org/2000/svg";
  /* Hue for the shared feel calls; the runner itself is painted by the sheet. */
  var runnerHue = 322;
  function initCaretDash() {
    var field = getElement("caretField");
    var driftFar = getElement("caretDriftFar");
    var driftNear = getElement("caretDriftNear");
    var obstaclesEl = getElement("caretObstacles");
    var playerEl = getElement("caretPlayer");
    var railFill = getElement("caretRailFill");
    var overlayEl = getElement("caretOverlay");
    var overlayText = getElement("caretOverlayText");
    var retryBtn = getElement("caretRetryBtn");
    var againBtn = getElement("caretAgainBtn");
    var startBtn = getElement("caretStartBtn");
    var jumpBtn = getElement("caretJumpBtn");
    var duckBtn = getElement("caretDuckBtn");
    var scoreEl = getElement("caretScore");
    var bestStatEl = getElement("caretBestStat");
    var speedEl = getElement("caretSpeed");
    var resultEl = getElement("caretResult");
    var bestEl = getElement("caretBest");
    var panel = getElement("gamePanelCaretDash");
    if (
      !field ||
      !driftFar ||
      !driftNear ||
      !obstaclesEl ||
      !playerEl ||
      !railFill ||
      !overlayEl ||
      !overlayText ||
      !retryBtn ||
      !againBtn ||
      !startBtn ||
      !jumpBtn ||
      !duckBtn ||
      !scoreEl ||
      !bestStatEl ||
      !speedEl ||
      !resultEl ||
      !bestEl ||
      !panel
    ) {
      return;
    }

    // Layout is expressed in the same pixel units the CSS uses, so the hit
    // boxes below stay in sync with what the player sees.
    var GROUND_INSET = 28;
    var PLAYER_X_RATIO = 0.15;
    var PLAYER_W = 6;
    var PLAYER_H = 30;
    var DUCK_H = 12;
    var FLOAT_GAP = 22;
    var BASE_SPEED = 168;
    var SPEED_GAIN = 0.09;
    var MAX_SPEED = 430;
    var GRAVITY = 1850;
    var HOLD_GRAVITY = 980;
    var DUCK_GRAVITY = 2700;
    var JUMP_V = -520;
    var CUT_V = -230;
    var PIXELS_PER_METRE = 12;
    var DUCK_HOLD_MS = 170;
    var STEP_CAP = 0.034;

    var groundGlyphs = [
      "\u00b6",
      "\u00a7",
      "\u00bf",
      "\u00a1",
      "\u00a4",
      "\u00ac",
      "\u00a6",
      "\u00d7",
      "\u00f7",
      "\u2020",
      "\u2021",
      "\u2030",
      "\u00b5",
      "\u00b7",
    ];
    var floatGlyphs = [
      "\ufffd",
      "\u2400",
      "\u240a",
      "\u2421",
      "\u2318",
      "\u2301",
      "\u235f",
      "\u238b",
      "\u259a",
      "\u25ca",
    ];

    var state = "idle";
    var obstacles = [];
    var obsSeq = 0;
    var travelled = 0;
    var speedNow = BASE_SPEED;
    var jumpOffset = 0;
    var velY = 0;
    var onGround = true;
    var ducking = false;
    var jumpHeld = false;
    var rafId = null;
    var lastTs = 0;
    var spawnGap = 0;
    var fieldW = 0;
    var fieldH = 0;
    var shakeId = null;
    var holdId = null;
    var holdTimer = null;
    var holdDucked = false;
    var fxTimers = [];
    var roundId = 0;
    var lastScoreBand = 0;
    var lastSpeedRing = 0;

    function fillDrift(element, pattern, repeat) {
      var text = "";
      for (var i = 0; i < repeat; i += 1) {
        text += pattern;
      }
      element.textContent = text;
    }

    fillDrift(driftFar, " . : ; \u00b6 \u00a7 \u00a4 \u00ac \u00b7 \u2020 \u2030 ", 26);
    fillDrift(
      driftNear,
      " const caret = line[i] \u2192 index++ \u2591\u2592\u2593 ",
      18,
    );
    field.style.setProperty("--caret-ground-y", GROUND_INSET + "px");

    function readBest() {
      var value = parseInt(localStorage.getItem(caretDashBestKey), 10);
      return isNaN(value) ? 0 : value;
    }

    function renderBest() {
      var best = readBest();
      bestStatEl.textContent = String(best);
      bestEl.textContent = best ? t("caretBest", { n: best }) : t("noBest");
    }

    /* ------------------------------------------------------------ dressing */

    /* Round-guarded one-shots: quietReset and the next start cancel anything
     * still pending, so no beat outlives its round. */
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

    function svgTag(name, attrs) {
      var node = document.createElementNS(SVG_NS, name);
      for (var key in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, key)) {
          node.setAttribute(key, String(attrs[key]));
        }
      }
      return node;
    }

    /* Panel hue for the shared feel calls. Read per round rather than once at
     * init: the panel's token sheet can land after this module runs. */
    function readHue() {
      var raw = "";
      try {
        raw = window.getComputedStyle(panel).getPropertyValue("--gp-hue");
      } catch (error) {
        raw = "";
      }
      var parsed = parseInt(raw, 10);
      if (!isNaN(parsed)) {
        runnerHue = parsed;
      }
    }

    /* The runner is a drawn character, not a text bar: an I-beam caret with a
     * serif cap for a hat, one watching eye and legs that cycle while the
     * course runs. Geometry only is baked here - every colour comes from the
     * panel's --gp-hue token via the sheet, so the figure follows the theme
     * live instead of freezing in whatever hue was computed at mount time.
     * The container stays the 6px stem the hit boxes are measured against; the
     * figure hangs centred on that stem and overflows it. */
    function drawRunner() {
      if (playerEl.firstChild) {
        return;
      }
      var figure = svgTag("g", { class: "caret-runner-figure" });
      figure.appendChild(
        svgTag("rect", {
          x: 14.8, y: 7, width: 4.4, height: 24, rx: 2.2,
          class: "caret-runner-stem",
        }),
      );
      figure.appendChild(
        svgTag("rect", {
          x: 8.5, y: 2.6, width: 17, height: 4.6, rx: 2.3,
          class: "caret-runner-cap",
        }),
      );
      figure.appendChild(
        svgTag("rect", {
          x: 9.5, y: 28.6, width: 15, height: 4.4, rx: 2.2,
          class: "caret-runner-hips",
        }),
      );
      figure.appendChild(
        svgTag("circle", {
          cx: 17, cy: 15.4, r: 1.9,
          class: "caret-runner-eye",
        }),
      );
      figure.appendChild(
        svgTag("circle", {
          cx: 17.8, cy: 14.6, r: 0.6,
          class: "caret-runner-glint",
        }),
      );
      figure.appendChild(
        svgTag("path", {
          d: "M15.4 32.4 12.2 40.8",
          class: "caret-leg caret-leg-a",
        }),
      );
      figure.appendChild(
        svgTag("path", {
          d: "M18.6 32.4 21.8 40.8",
          class: "caret-leg caret-leg-b",
        }),
      );
      var svg = svgTag("svg", {
        viewBox: "0 0 34 46",
        class: "caret-runner",
        "aria-hidden": "true",
        focusable: "false",
      });
      svg.appendChild(
        svgTag("ellipse", {
          cx: 17, cy: 43.4, rx: 9, ry: 2,
          class: "caret-runner-shadow",
        }),
      );
      svg.appendChild(figure);
      playerEl.appendChild(svg);
    }

    /* A drawn surface behind the course from the shared pattern library, so
     * first paint is a composed room rather than an empty gradient. The slate
     * tint is deliberately hue-free: this mounts before the panel's token
     * sheet is guaranteed to be readable, and a neutral grid suits both. */
    function mountBackdrop() {
      if (!App.art || !App.art.pattern || field.__caretBackdrop) {
        return;
      }
      field.__caretBackdrop = true;
      var layer = document.createElement("div");
      layer.className = "caret-backdrop";
      layer.setAttribute("aria-hidden", "true");
      layer.appendChild(App.art.pattern("grid", { hue: 260, sat: 18, tile: 22 }));
      field.insertBefore(layer, field.firstChild);
    }

    /* Ink splats: a take-off stamps the ground where the jump began and a
     * landing kicks a wider blot. They fade on their own and are swept by the
     * round timers, never outliving a hidden panel. */
    function spawnSplat(kind) {
      if (isMotionOff()) {
        return;
      }
      var node = document.createElement("span");
      node.className = "caret-splat is-" + kind;
      node.style.left = playerX() + 3 + "px";
      field.appendChild(node);
      later(function () {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }, 760);
    }

    function jumpBeat() {
      fx.burst(playerEl, { kind: "spark", count: 4, hue: runnerHue });
      spawnSplat("jump");
      playSfx("select");
    }

    function landBeat() {
      playerEl.classList.add("is-land");
      later(function () {
        playerEl.classList.remove("is-land");
      }, 180);
      spawnSplat("land");
      playSfx("land");
    }

    /* A word cleared: the glyph you got past lifts off the runner as a ghost. */
    function passBeat(obstacle) {
      fx.floatText(playerEl, obstacle.glyph, { kind: "good" });
    }

    function checkMilestones() {
      var score = currentScore();
      var band = Math.floor(score / 50);
      if (band > lastScoreBand) {
        lastScoreBand = band;
        fx.floatText(playerEl, score + "m", { kind: "good", hue: runnerHue });
        fx.pop(scoreEl, { scale: 1.16, ms: 240 });
        playSfx("coin");
      }
      var progress = (speedNow - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);
      var ring = Math.floor(progress * 4);
      if (ring > lastSpeedRing) {
        lastSpeedRing = ring;
        fx.floatText(speedEl, speedEl.textContent, { kind: "good", hue: runnerHue });
        fx.pop(speedEl, { scale: 1.2, ms: 240 });
        playSfx("merge");
      }
    }

    function buildObstacleElement(className, glyph, width, height) {
      var element = document.createElement("span");
      element.className = className;
      /* The glyph lives on its own face so it can pop and glitch without
       * fighting the scroll transform the loop paints on the shard each frame. */
      var face = document.createElement("b");
      face.className = "caret-obstacle-face";
      face.textContent = glyph;
      element.appendChild(face);
      element.style.width = Math.round(width) + "px";
      element.style.height = Math.round(height) + "px";
      return element;
    }

    /* First paint: the course arrives wearing sample hazards while the runner
     * stands on the line, so the panel never opens on an empty road. */
    function buildPreview() {
      var samples = [
        { at: "46%", cls: "is-ground", glyph: groundGlyphs[1] },
        { at: "63%", cls: "is-floating", glyph: floatGlyphs[4] },
        { at: "81%", cls: "is-ground", glyph: groundGlyphs[7] },
      ];
      var dealt = [];
      for (var i = 0; i < samples.length; i += 1) {
        var sample = samples[i];
        var element = buildObstacleElement(
          "caret-obstacle is-preview " + sample.cls,
          sample.glyph,
          sample.cls === "is-floating" ? 26 : 24,
          sample.cls === "is-floating" ? 22 : 26,
        );
        element.style.left = sample.at;
        element.style.bottom =
          GROUND_INSET + (sample.cls === "is-floating" ? FLOAT_GAP : 0) + "px";
        obstaclesEl.appendChild(element);
        dealt.push(element);
      }
      fx.stagger(dealt, { kind: "drop", step: 90, ms: 360 });
    }

    /* ResizeObserver runs only on a real layout change. The old idle rAF
     * watcher kept scheduling after the drawer closed. Quiet reset already
     * measures when selecting this panel, so no fallback polling is needed. */
    if (window.ResizeObserver) {
      var measureObserver = new window.ResizeObserver(function () {
        var panel = document.getElementById("gamePanelCaretDash");
        if (panel && !panel.hidden && field.clientWidth) { measure(); }
      });
      measureObserver.observe(field);
    }

    function playerX() {
      return Math.round(fieldW * PLAYER_X_RATIO);
    }

    function currentScore() {
      return Math.floor(travelled / PIXELS_PER_METRE);
    }

    function resetPlayerVisual() {
      playerEl.style.transform = "translateY(0px)";
      playerEl.classList.remove("is-ducking");
      playerEl.classList.remove("is-wrecked");
      playerEl.classList.remove("is-land");
      playerEl.classList.remove("is-airborne");
    }

    function measure() {
      var previous = fieldW;
      fieldW = field.clientWidth || 396;
      fieldH = field.clientHeight || 150;
      if (previous && previous !== fieldW) {
        var ratio = fieldW / previous;
        obstacles.forEach(function (obstacle) {
          obstacle.x *= ratio;
        });
      }
      playerEl.style.left = playerX() + "px";
      playerEl.style.bottom = GROUND_INSET + "px";
    }

    function hitBox(step) {
      var height = ducking ? DUCK_H : PLAYER_H;
      var bottom = fieldH - GROUND_INSET - jumpOffset;
      return {
        x: playerX(),
        y: bottom - height,
        w: PLAYER_W + step,
        h: height,
      };
    }

    function obstacleBox(obstacle) {
      var bottom =
        fieldH - GROUND_INSET - (obstacle.floating ? FLOAT_GAP : 0);
      return {
        x: obstacle.x,
        y: bottom - obstacle.h,
        w: obstacle.w,
        h: obstacle.h,
      };
    }

    function overlaps(a, b) {
      return (
        a.x < b.x + b.w &&
        b.x < a.x + a.w &&
        a.y < b.y + b.h &&
        b.y < a.y + a.h
      );
    }

    function render() {
      playerEl.style.transform = "translateY(" + -jumpOffset + "px)";
      playerEl.classList.toggle("is-airborne", !onGround);
      playerEl.classList.toggle("is-ducking", ducking);
      obstacles.forEach(function (obstacle) {
        obstacle.el.style.transform = "translateX(" + obstacle.x + "px)";
      });
    }

    function updateHud() {
      scoreEl.textContent = String(currentScore());
      speedEl.textContent = (speedNow / BASE_SPEED).toFixed(1) + "x";
      var progress = (speedNow - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);
      railFill.style.width = Math.round(Math.min(1, Math.max(0, progress)) * 100) + "%";
      /* Velocity leaks into the scene: streaks fade in, the run cycle and the
       * near drift pick up their feet. Purely presentational. */
      field.classList.toggle("is-fast", progress >= 0.42);
      field.classList.toggle("is-blur", progress >= 0.8);
      field.style.setProperty("--caret-run-rate", (BASE_SPEED / speedNow).toFixed(3));
    }

    function clearObstacles() {
      obstacles.forEach(function (obstacle) {
        if (obstacle.el && obstacle.el.parentNode) {
          obstacle.el.parentNode.removeChild(obstacle.el);
        }
      });
      obstacles = [];
      obstaclesEl.textContent = "";
    }

    function clearShake() {
      if (shakeId !== null) {
        window.clearTimeout(shakeId);
        shakeId = null;
      }
      field.classList.remove("is-shaking");
    }

    function stopLoop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastTs = 0;
    }

    function startLoop() {
      if (rafId !== null || state !== "running") {
        return;
      }
      lastTs = 0;
      rafId = window.requestAnimationFrame(frame);
    }

    function spawnObstacle() {
      var floating = Math.random() < 0.34;
      var width;
      var height;
      if (floating) {
        width = 20 + Math.random() * 16;
        height = 20 + Math.random() * 8;
      } else {
        width = 16 + Math.random() * 22;
        height = 20 + Math.random() * 14;
      }

      var glyphs = floating ? floatGlyphs : groundGlyphs;
      var glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
      var element = buildObstacleElement(
        "caret-obstacle " + (floating ? "is-floating" : "is-ground"),
        glyph,
        width,
        height,
      );
      element.style.bottom =
        GROUND_INSET + (floating ? FLOAT_GAP : 0) + "px";
      element.style.transform = "translateX(" + (fieldW + 14) + "px)";

      var obstacle = {
        id: (obsSeq += 1),
        x: fieldW + 14,
        w: Math.round(width),
        h: Math.round(height),
        floating: floating,
        glyph: glyph,
        el: element,
      };
      obstaclesEl.appendChild(element);
      obstacles.push(obstacle);

      var seconds = 1.02 - Math.min(0.34, travelled / 11000);
      spawnGap = speedNow * (seconds + Math.random() * 0.5);
    }

    function endRound() {
      state = "over";
      stopLoop();
      setDuck(false);
      jumpHeld = false;

      var score = currentScore();
      var previousBest = readBest();
      var isBest = score > previousBest;
      if (isBest) {
        localStorage.setItem(caretDashBestKey, String(score));
      }

      overlayText.textContent = t("caretOver", { n: score });
      overlayEl.hidden = false;
      resultEl.textContent =
        t("caretOverResult", { n: score }) +
        (isBest ? " " + t("newBest") : "");
      renderBest();
      logAction(t("logCaretDash", { n: score }));

      if (!isMotionOff()) {
        field.classList.add("is-shaking");
        shakeId = window.setTimeout(function () {
          shakeId = null;
          field.classList.remove("is-shaking");
        }, 300);
      }

      /* The crash is an event: the scene flashes, the caret is knocked flat
       * among its own sparks, and a dull voice lands the impact before the
       * verdict arrives as a ceremony over the panel. */
      field.classList.remove("is-running");
      field.classList.remove("is-fast");
      field.classList.remove("is-blur");
      playerEl.classList.add("is-wrecked");
      fx.flash(field, { hue: 6 });
      fx.burst(playerEl, { kind: "ember", count: 14, hue: runnerHue });
      fx.burst(playerEl, { kind: "spark", count: 8, hue: 34 });
      playSfx("hit");
      later(function () {
        fx.ceremony(panel, {
          tone: isBest ? "win" : "lose",
          title: overlayText.textContent,
          lines: [resultEl.textContent],
          stars: isBest ? 3 : 0,
        });
      }, 640);

      if (isBest) {
        var rect = field.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
      petNotifyGame(isBest);

      retryBtn.focus();
    }

    function step(dt) {
      var wasAirborne = !onGround;
      travelled += speedNow * dt;

      if (!onGround) {
        var gravity = GRAVITY;
        if (ducking) {
          gravity = DUCK_GRAVITY;
        } else if (jumpHeld && velY < 0) {
          gravity = HOLD_GRAVITY;
        }
        velY += gravity * dt;
        jumpOffset -= velY * dt;
        if (jumpOffset <= 0) {
          jumpOffset = 0;
          velY = 0;
          onGround = true;
        }
      }
      if (wasAirborne && onGround) {
        landBeat();
      }

      speedNow = Math.min(MAX_SPEED, BASE_SPEED + travelled * SPEED_GAIN);

      spawnGap -= speedNow * dt;
      if (spawnGap <= 0) {
        spawnObstacle();
      }

      var stepPx = speedNow * dt;
      for (var index = obstacles.length - 1; index >= 0; index -= 1) {
        var obstacle = obstacles[index];
        obstacle.x -= stepPx;
        if (!obstacle.passed && obstacle.x + obstacle.w < playerX() - 6) {
          obstacle.passed = true;
          passBeat(obstacle);
        }
        if (obstacle.x + obstacle.w < -12) {
          if (obstacle.el.parentNode) {
            obstacle.el.parentNode.removeChild(obstacle.el);
          }
          obstacles.splice(index, 1);
        }
      }

      var box = hitBox(stepPx);
      for (var other = 0; other < obstacles.length; other += 1) {
        if (overlaps(box, obstacleBox(obstacles[other]))) {
          endRound();
          return;
        }
      }

      updateHud();
      checkMilestones();
    }

    function frame(timestamp) {
      rafId = null;
      if (state !== "running") {
        return;
      }
      if (document.hidden || panel.hidden) {
        return;
      }
      if (!lastTs) {
        lastTs = timestamp;
      }
      var dt = (timestamp - lastTs) / 1000;
      lastTs = timestamp;
      if (dt < 0) {
        dt = 0;
      }
      if (dt > STEP_CAP) {
        dt = STEP_CAP;
      }
      step(dt);
      render();
      if (state === "running") {
        rafId = window.requestAnimationFrame(frame);
      }
    }

    function doJump() {
      if (state !== "running" || !onGround) {
        return;
      }
      velY = JUMP_V;
      jumpOffset = 0.01;
      onGround = false;
      jumpBeat();
    }

    function cutJump() {
      if (velY < 0) {
        velY = Math.max(velY, CUT_V);
      }
    }

    function setDuck(value) {
      var next = state === "running" ? value : false;
      if (next === ducking) {
        return;
      }
      ducking = next;
      playerEl.classList.toggle("is-ducking", ducking);
      if (next) {
        playSfx("flip");
      }
    }

    function startRound() {
      stopLoop();
      clearShake();
      clearObstacles();
      measure();
      readHue();
      clearFxTimers();
      roundId += 1;

      state = "running";
      travelled = 0;
      speedNow = BASE_SPEED;
      jumpOffset = 0;
      velY = 0;
      onGround = true;
      jumpHeld = false;
      holdDucked = false;
      lastScoreBand = 0;
      lastSpeedRing = 0;
      if (holdTimer !== null) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
      holdId = null;
      spawnGap = fieldW * 0.85;

      overlayEl.hidden = true;
      ducking = false;
      resetPlayerVisual();
      render();
      scoreEl.textContent = "0";
      speedEl.textContent = "1.0x";
      railFill.style.width = "0%";
      field.classList.add("is-running");
      field.classList.remove("is-fast");
      field.classList.remove("is-blur");
      field.style.setProperty("--caret-run-rate", "1");
      resultEl.textContent = t("caretGo");
      playSfx("flip");
      startLoop();
      field.focus();
    }

    function resetQuiet() {
      state = "idle";
      stopLoop();
      clearShake();
      clearFxTimers();
      roundId += 1;
      clearObstacles();
      measure();
      if (holdTimer !== null) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
      holdId = null;
      holdDucked = false;
      travelled = 0;
      speedNow = BASE_SPEED;
      jumpOffset = 0;
      velY = 0;
      onGround = true;
      ducking = false;
      jumpHeld = false;
      lastScoreBand = 0;
      lastSpeedRing = 0;
      field.classList.remove("is-running");
      field.classList.remove("is-fast");
      field.classList.remove("is-blur");
      field.style.setProperty("--caret-run-rate", "1");
      overlayEl.hidden = true;
      resetPlayerVisual();
      scoreEl.textContent = "0";
      speedEl.textContent = "1.0x";
      railFill.style.width = "0%";
      resultEl.textContent = t("caretPrompt");
      renderBest();
      buildPreview();
    }

    function releaseHold(pointerId) {
      if (holdId !== null && pointerId !== undefined && holdId !== pointerId) {
        return;
      }
      if (holdTimer !== null) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
      var wasDucked = holdDucked;
      holdId = null;
      holdDucked = false;
      if (wasDucked) {
        setDuck(false);
      }
      return wasDucked;
    }

    field.addEventListener("pointerdown", function (event) {
      if (state !== "running" || holdId !== null) {
        return;
      }
      holdId = event.pointerId;
      holdDucked = false;
      if (field.setPointerCapture) {
        try {
          field.setPointerCapture(event.pointerId);
        } catch (error) {
          /* no-op: capture is a nicety, the listeners still fire */
        }
      }
      holdTimer = window.setTimeout(function () {
        holdTimer = null;
        if (holdId === event.pointerId && state === "running") {
          holdDucked = true;
          setDuck(true);
        }
      }, DUCK_HOLD_MS);
    });

    field.addEventListener("pointerup", function (event) {
      if (holdId !== event.pointerId) {
        return;
      }
      var wasDucked = releaseHold(event.pointerId);
      if (!wasDucked && state === "running") {
        doJump();
      }
    });

    field.addEventListener("pointercancel", function (event) {
      releaseHold(event.pointerId);
    });

    field.addEventListener("keydown", function (event) {
      if (
        event.key === " " ||
        event.key === "Spacebar" ||
        event.key === "ArrowUp"
      ) {
        event.preventDefault();
        if (event.repeat || state !== "running") {
          return;
        }
        jumpHeld = true;
        doJump();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (state === "running") {
          setDuck(true);
        }
      }
    });

    field.addEventListener("keyup", function (event) {
      if (
        event.key === " " ||
        event.key === "Spacebar" ||
        event.key === "ArrowUp"
      ) {
        jumpHeld = false;
        cutJump();
        return;
      }

      if (event.key === "ArrowDown") {
        setDuck(false);
      }
    });

    field.addEventListener("blur", function () {
      jumpHeld = false;
      setDuck(false);
    });

    function bindJumpButton(button) {
      button.addEventListener("pointerdown", function (event) {
        event.preventDefault();
        if (state !== "running") {
          return;
        }
        jumpHeld = true;
        doJump();
      });
      button.addEventListener("pointerup", function () {
        jumpHeld = false;
        cutJump();
      });
      button.addEventListener("pointercancel", function () {
        jumpHeld = false;
      });
      button.addEventListener("pointerleave", function () {
        if (jumpHeld) {
          jumpHeld = false;
          cutJump();
        }
      });
      button.addEventListener("keydown", function (event) {
        if (
          event.key !== " " &&
          event.key !== "Spacebar" &&
          event.key !== "ArrowUp" &&
          event.key !== "Enter"
        ) {
          return;
        }
        event.preventDefault();
        if (event.repeat || state !== "running") {
          return;
        }
        jumpHeld = true;
        doJump();
      });
      button.addEventListener("keyup", function (event) {
        if (
          event.key !== " " &&
          event.key !== "Spacebar" &&
          event.key !== "ArrowUp" &&
          event.key !== "Enter"
        ) {
          return;
        }
        jumpHeld = false;
        cutJump();
      });
    }

    function bindDuckButton(button) {
      button.addEventListener("pointerdown", function (event) {
        event.preventDefault();
        setDuck(true);
      });
      button.addEventListener("pointerup", function () {
        setDuck(false);
      });
      button.addEventListener("pointercancel", function () {
        setDuck(false);
      });
      button.addEventListener("pointerleave", function () {
        setDuck(false);
      });
      button.addEventListener("keydown", function (event) {
        if (
          event.key !== " " &&
          event.key !== "Spacebar" &&
          event.key !== "ArrowDown"
        ) {
          return;
        }
        event.preventDefault();
        setDuck(true);
      });
      button.addEventListener("keyup", function (event) {
        if (
          event.key !== " " &&
          event.key !== "Spacebar" &&
          event.key !== "ArrowDown"
        ) {
          return;
        }
        event.preventDefault();
        setDuck(false);
      });
    }

    bindJumpButton(jumpBtn);
    bindDuckButton(duckBtn);
    jumpBtn.addEventListener("blur", function () {
      jumpHeld = false;
    });
    duckBtn.addEventListener("blur", function () {
      setDuck(false);
    });

    startBtn.addEventListener("click", startRound);
    retryBtn.addEventListener("click", startRound);
    againBtn.addEventListener("click", function () {
      resetQuiet();
      startBtn.focus();
    });

    function handleVisibility() {
      if (document.hidden) {
        stopLoop();
      } else if (state === "running" && !panel.hidden) {
        startLoop();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    window.addEventListener("resize", function () {
      if (state === "running") {
        measure();
        render();
      }
    });

    App.quietResetCaretDash = resetQuiet;

    readHue();
    drawRunner();
    mountBackdrop();
    measure();
    resetQuiet();
  }


  /* Exported for the other modules. */
  App.initCaretDash = initCaretDash;
})(window.CapitalConvert = window.CapitalConvert || {});
