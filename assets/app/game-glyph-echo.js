/* Glyph Echo - The listen-and-repeat chain campaign in the shared game drawer. */
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
  /* One tone per pad; the pads also flash, so the chain is seen and heard. */
  var echoTones = [261.63, 329.63, 392.0, 523.25];
  var echoFlashMs = 300;
  /* Every chime sets a chain length goal and how fast the pads sing. */
  var echoLevels = [
    { id: "c1", labelKey: "echoL1", goal: 4, stepMs: 620 },
    { id: "c2", labelKey: "echoL2", goal: 5, stepMs: 560 },
    { id: "c3", labelKey: "echoL3", goal: 6, stepMs: 500 },
    { id: "c4", labelKey: "echoL4", goal: 7, stepMs: 440 },
    { id: "c5", labelKey: "echoL5", goal: 8, stepMs: 380 },
    { id: "c6", labelKey: "echoL6", goal: 9, stepMs: 320 },
    { id: "c7", labelKey: "echoL7", goal: 10, stepMs: 280 },
    { id: "c8", labelKey: "echoL8", goal: 11, stepMs: 250 },
    { id: "c9", labelKey: "lvlNum9", goal: 13, stepMs: 240 },
    { id: "c10", labelKey: "lvlNum10", goal: 15, stepMs: 230 },
    { id: "c11", labelKey: "lvlNum11", goal: 17, stepMs: 220 },
    { id: "c12", labelKey: "lvlNum12", goal: 19, stepMs: 210 },
  ];

  function initGlyphEchoGame() {
    var boardEl = getElement("echoBoard");
    var roundEl = getElement("echoRound");
    var livesEl = getElement("echoLives");
    var longestEl = getElement("echoLongest");
    var resultEl = getElement("echoResult");
    var startBtn = getElement("echoStartBtn");
    var bestEl = getElement("echoBest");
    var selectEl = getElement("echoLevelSel");
    if (
      !boardEl ||
      !roundEl ||
      !livesEl ||
      !longestEl ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var pads = [];
    for (var padIndex = 0; padIndex < 4; padIndex += 1) {
      var pad = getElement("echoPad" + padIndex);
      if (!pad) {
        return;
      }
      pads.push(pad);
    }

    var campaign = createCampaign({ key: "glyph-echo-campaign", levels: echoLevels });
    var level = echoLevels[0];
    var audio = null;
    var chain = [];
    var progress = 0;
    var lives = 3;
    var longest = 0;
    var mistakes = 0;
    var state = "idle";
    var timers = [];

    function schedule(fn, ms) {
      timers.push(window.setTimeout(fn, ms));
    }

    function clearTimers() {
      timers.forEach(function (id) {
        window.clearTimeout(id);
      });
      timers = [];
    }

    function ensureAudio() {
      if (audio) {
        return;
      }
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) {
        return;
      }
      audio = new Ctor();
    }

    function playTone(index, duration) {
      if (!audio) {
        return;
      }
      if (audio.state !== "running") {
        audio.resume();
      }
      var osc = audio.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = echoTones[index];
      var gain = audio.createGain();
      gain.gain.setValueAtTime(0.25, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audio.currentTime + duration,
      );
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + duration);
    }

    function flash(padIndex, wrong) {
      var pad = pads[padIndex];
      pad.classList.add(wrong ? "is-wrong" : "is-lit");
      schedule(function () {
        pad.classList.remove(wrong ? "is-wrong" : "is-lit");
      }, echoFlashMs);
    }

    function renderHud() {
      roundEl.textContent = chain.length + "/" + level.goal;
      livesEl.textContent = String(lives);
      longestEl.textContent = String(longest);
    }

    function lockPads(locked) {
      pads.forEach(function (pad) {
        pad.disabled = locked;
      });
    }

    function showChain() {
      state = "showing";
      lockPads(true);
      resultEl.textContent = t("echoWatch");
      chain.forEach(function (padIndex, step) {
        schedule(function () {
          flash(padIndex, false);
          playTone(padIndex, echoFlashMs / 1000);
        }, step * level.stepMs);
      });
      schedule(function () {
        state = "input";
        progress = 0;
        lockPads(false);
        resultEl.textContent = t("echoYourTurn");
      }, chain.length * level.stepMs + 220);
    }

    function extendChain() {
      chain.push(Math.floor(Math.random() * 4));
      renderHud();
    }

    function startGame() {
      clearTimers();
      pads.forEach(function (pad) {
        pad.classList.remove("is-lit", "is-wrong");
      });
      ensureAudio();
      lives = 3;
      mistakes = 0;
      longest = 0;
      chain = [];
      extendChain();
      renderHud();
      refreshPicker();
      showChain();
    }

    function loadLevel(levelDef) {
      clearTimers();
      state = "idle";
      level = levelDef;
      chain = [];
      progress = 0;
      lives = 3;
      longest = 0;
      mistakes = 0;
      lockPads(true);
      renderHud();
      refreshPicker();
      resultEl.textContent = t("echoReady", { n: level.goal });
    }

    function tapPad(padIndex) {
      if (state !== "input") {
        return;
      }
      flash(padIndex, false);
      playTone(padIndex, echoFlashMs / 1000);
      if (padIndex !== chain[progress]) {
        mistakes += 1;
        lives -= 1;
        state = "between";
        lockPads(true);
        flash(chain[progress], true);
        if (lives <= 0) {
          lives = 0;
          renderHud();
          resultEl.textContent =
            t("echoOut", { n: chain.length }) + " " + t("echoRetry");
          return;
        }
        renderHud();
        resultEl.textContent = t("echoMistake", { n: lives });
        schedule(showChain, 800);
        return;
      }
      progress += 1;
      if (progress < chain.length) {
        return;
      }
      longest = Math.max(longest, chain.length);
      renderHud();
      if (chain.length >= level.goal) {
        chainCleared();
        return;
      }
      state = "between";
      lockPads(true);
      schedule(function () {
        extendChain();
        showChain();
      }, 550);
    }

    function chainCleared() {
      state = "between";
      lockPads(true);
      var starsWon = starsFor(lives, [3, 2, 1], "high");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: mistakes,
        better: "low",
      });
      var message = t("echoCleared", {
        name: t(level.labelKey),
        n: level.goal,
        m: lives,
        stars: starsWon,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("echoNextChime");
      } else if (campaign.clearedCount() === echoLevels.length) {
        message += " " + t("echoCampaignDone");
      }
      logAction(t("logGlyphEcho", { name: t(level.labelKey) }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(echoLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
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
    }

    pads.forEach(function (pad, padIndex) {
      pad.addEventListener("click", function () {
        tapPad(padIndex);
      });
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(echoLevels[index]);
      }
    });

    startBtn.addEventListener("click", startGame);

    App.quietResetGlyphEcho = function () {
      if (state !== "idle") {
        clearTimers();
        state = "idle";
        lockPads(true);
        resultEl.textContent = t("echoPaused");
      }
    };

    loadLevel(echoLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initGlyphEchoGame = initGlyphEchoGame;
})(window.CapitalConvert = window.CapitalConvert || {});
