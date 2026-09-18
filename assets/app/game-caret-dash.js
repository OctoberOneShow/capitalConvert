/* Caret Dash - The falling-obstacle mini-game in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var isMotionOff = App.isMotionOff;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var caretDashBestKey = "caret-dash-best";
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

    function playerX() {
      return Math.round(fieldW * PLAYER_X_RATIO);
    }

    function currentScore() {
      return Math.floor(travelled / PIXELS_PER_METRE);
    }

    function resetPlayerVisual() {
      playerEl.style.transform = "translateY(0px)";
      playerEl.classList.remove("is-ducking");
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
      var element = document.createElement("span");
      element.className =
        "caret-obstacle " + (floating ? "is-floating" : "is-ground");
      element.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      element.style.width = Math.round(width) + "px";
      element.style.height = Math.round(height) + "px";
      element.style.bottom =
        GROUND_INSET + (floating ? FLOAT_GAP : 0) + "px";
      element.style.transform = "translateX(" + (fieldW + 14) + "px)";

      var obstacle = {
        id: (obsSeq += 1),
        x: fieldW + 14,
        w: Math.round(width),
        h: Math.round(height),
        floating: floating,
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

      if (isBest) {
        var rect = field.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
      petNotifyGame(isBest);

      retryBtn.focus();
    }

    function step(dt) {
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

      speedNow = Math.min(MAX_SPEED, BASE_SPEED + travelled * SPEED_GAIN);

      spawnGap -= speedNow * dt;
      if (spawnGap <= 0) {
        spawnObstacle();
      }

      var stepPx = speedNow * dt;
      for (var index = obstacles.length - 1; index >= 0; index -= 1) {
        var obstacle = obstacles[index];
        obstacle.x -= stepPx;
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
    }

    function startRound() {
      stopLoop();
      clearShake();
      clearObstacles();
      measure();

      state = "running";
      travelled = 0;
      speedNow = BASE_SPEED;
      jumpOffset = 0;
      velY = 0;
      onGround = true;
      jumpHeld = false;
      holdDucked = false;
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
      resultEl.textContent = t("caretGo");
      startLoop();
      field.focus();
    }

    function resetQuiet() {
      state = "idle";
      stopLoop();
      clearShake();
      clearObstacles();
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
      overlayEl.hidden = true;
      resetPlayerVisual();
      scoreEl.textContent = "0";
      speedEl.textContent = "1.0x";
      railFill.style.width = "0%";
      resultEl.textContent = t("caretPrompt");
      renderBest();
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

    measure();
    resetQuiet();
  }


  /* Exported for the other modules. */
  App.initCaretDash = initCaretDash;
})(window.CapitalConvert = window.CapitalConvert || {});
