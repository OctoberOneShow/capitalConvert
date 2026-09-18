/* Punctuation Plumber - The fullwidth/halfwidth sorting mini-game in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var plumberBestKey = "plumber-best";
  var plumberTickMs = 60;
  var plumberBaseSpeed = 58;
  var plumberSpeedGain = 0.03;
  var plumberMaxSpeed = 2.6;
  var plumberMaxStrikes = 3;
  var plumberSpawnGapMs = 500;
  /* Clean sorts stack a points multiplier (x2 at 5, x4 from 15); a strike
   * wipes it. Every tenth clean sort also opens a slow drizzle window where
   * the whole lane halves speed. */
  var plumberComboEvery = 5;
  var plumberComboMax = 4;
  var plumberDrizzleEvery = 10;
  var plumberDrizzleMs = 3000;
  /* Marks are written as \uXXXX escapes so the source stays pure ASCII, the
   * same deal the Glyph Match pool makes. */
  var plumberMarks = [
    { glyph: "\uFF0C", full: true },
    { glyph: "\u3001", full: true },
    { glyph: "\uFF1B", full: true },
    { glyph: "\uFF01", full: true },
    { glyph: "\uFF1F", full: true },
    { glyph: "\uFF1A", full: true },
    { glyph: "\uFF08", full: true },
    { glyph: "\uFF09", full: true },
    { glyph: "\u300C", full: true },
    { glyph: "\u300D", full: true },
    { glyph: ",", full: false },
    { glyph: ".", full: false },
    { glyph: ";", full: false },
    { glyph: "!", full: false },
    { glyph: "?", full: false },
    { glyph: ":", full: false },
    { glyph: "(", full: false },
    { glyph: ")", full: false },
    { glyph: "/", full: false },
    { glyph: "\\", full: false },
  ];

  function initPlumberGame() {
    var field = getElement("plumberField");
    var glyphEl = getElement("plumberGlyph");
    var scoreEl = getElement("plumberScore");
    var strikesEl = getElement("plumberStrikes");
    var speedEl = getElement("plumberSpeed");
    var comboEl = getElement("plumberCombo");
    var resultEl = getElement("plumberResult");
    var startBtn = getElement("plumberStartBtn");
    var bestEl = getElement("plumberBest");
    var binFull = getElement("plumberBinFull");
    var binHalf = getElement("plumberBinHalf");
    if (
      !field ||
      !glyphEl ||
      !scoreEl ||
      !strikesEl ||
      !speedEl ||
      !comboEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !binFull ||
      !binHalf
    ) {
      return;
    }

    var roundActive = false;
    var intervalId = null;
    var score = 0;
    var strikes = 0;
    var speedMult = 1;
    var streak = 0;
    var drizzleUntil = 0;
    var falling = null;
    var nextSpawnAt = 0;

    function comboMult() {
      var tier = Math.floor(streak / plumberComboEvery) + 1;
      return Math.min(plumberComboMax, tier);
    }

    function drizzleActive() {
      return Date.now() < drizzleUntil;
    }

    function effectiveSpeed() {
      return speedMult * (drizzleActive() ? 0.5 : 1);
    }

    function readBest() {
      var value = parseInt(localStorage.getItem(plumberBestKey), 10);
      return isNaN(value) ? 0 : value;
    }

    function renderBest() {
      var best = readBest();
      bestEl.textContent = best ? String(best) : t("noBest");
    }

    function renderHud() {
      scoreEl.textContent = String(score);
      strikesEl.textContent = strikes + "/" + plumberMaxStrikes;
      speedEl.textContent = effectiveSpeed().toFixed(1) + "x";
      comboEl.textContent = streak > 0 ? streak + " x" + comboMult() : "—";
    }

    function floorY() {
      var rect = field.getBoundingClientRect();
      return (rect.height || 190) - 46;
    }

    function spawnMark() {
      var mark = plumberMarks[Math.floor(Math.random() * plumberMarks.length)];
      falling = mark;
      glyphEl.textContent = mark.glyph;
      glyphEl.hidden = false;
      glyphEl.style.top = "0px";
    }

    function hideMark() {
      falling = null;
      glyphEl.hidden = true;
    }

    function flashBin(bin) {
      bin.classList.add("is-hit");
      window.setTimeout(function () {
        bin.classList.remove("is-hit");
      }, 260);
    }

    function gameOver() {
      window.clearInterval(intervalId);
      intervalId = null;
      roundActive = false;
      hideMark();

      var previousBest = readBest();
      var isBest = score > 0 && score > previousBest;
      if (isBest) {
        localStorage.setItem(plumberBestKey, String(score));
      }
      resultEl.textContent =
        t("plumberOver", { n: score }) + (isBest ? " " + t("newBest") : "");
      renderBest();
      logAction(t("logPlumber", { n: score }));

      if (isBest) {
        var rect = startBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
      petNotifyGame(isBest);
    }

    /* One decision closes the mark out: correct sorts it, a wrong bin or a
     * fall-through is a strike, and the third strike ends the run. */
    function resolveMark(caughtFull) {
      if (!falling) {
        return;
      }
      var mark = falling;
      var correct = caughtFull === null ? false : mark.full === caughtFull;
      hideMark();
      nextSpawnAt = Date.now() + plumberSpawnGapMs;

      if (correct) {
        var previousMult = comboMult();
        streak += 1;
        var gained = comboMult();
        score += gained;
        speedMult = Math.min(plumberMaxSpeed, speedMult + plumberSpeedGain);
        flashBin(mark.full ? binFull : binHalf);
        if (streak % plumberDrizzleEvery === 0) {
          drizzleUntil = Date.now() + plumberDrizzleMs;
          resultEl.textContent = t("plumberSlow");
        } else if (gained > previousMult) {
          resultEl.textContent = t("plumberStreak", {
            n: streak,
            m: gained,
          });
        }
      } else {
        strikes += 1;
        streak = 0;
        resultEl.textContent = t("plumberMissed", {
          glyph: mark.glyph,
          bin: t(mark.full ? "plumberBinFull" : "plumberBinHalf"),
        });
      }
      renderHud();

      if (!correct && strikes >= plumberMaxStrikes) {
        gameOver();
      }
    }

    function tick() {
      if (!roundActive) {
        return;
      }
      if (!falling) {
        if (Date.now() >= nextSpawnAt) {
          spawnMark();
        }
        return;
      }
      var current = parseFloat(glyphEl.style.top) || 0;
      var next =
        current + (plumberTickMs / 1000) * plumberBaseSpeed * effectiveSpeed();
      speedEl.textContent = effectiveSpeed().toFixed(1) + "x";
      if (next >= floorY()) {
        resolveMark(null);
        return;
      }
      glyphEl.style.top = next + "px";
    }

    function routeMark(caughtFull) {
      if (!roundActive) {
        return;
      }
      resolveMark(caughtFull);
    }

    function resetRound() {
      window.clearInterval(intervalId);
      intervalId = null;
      roundActive = false;
      hideMark();
      score = 0;
      strikes = 0;
      speedMult = 1;
      streak = 0;
      drizzleUntil = 0;
      renderHud();
      resultEl.textContent = t("plumberPrompt");
    }

    function startRound() {
      resetRound();
      roundActive = true;
      nextSpawnAt = Date.now() + 400;
      resultEl.textContent = t("plumberGo");
      intervalId = window.setInterval(tick, plumberTickMs);
      field.focus();
    }

    startBtn.addEventListener("click", startRound);
    binFull.addEventListener("click", function () {
      routeMark(true);
    });
    binHalf.addEventListener("click", function () {
      routeMark(false);
    });

    field.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        routeMark(true);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        routeMark(false);
      }
    });

    App.quietResetPlumber = function () {
      if (roundActive) {
        resetRound();
      }
    };

    renderBest();
    resetRound();
  }


  /* Exported for the other modules. */
  App.initPlumberGame = initPlumberGame;
})(window.CapitalConvert = window.CapitalConvert || {});
