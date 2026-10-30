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
  /* Every chime sets a chain length goal and how fast the pads sing. Ranks
   * 17-20 add two dials the ladder has never shipped: `reverse` makes the
   * player echo the chain backwards, and `flashMs` shortens the light each
   * pad holds (the tone rides the same length), so a chime can sing faster
   * than it glows. */
  var echoLevels = [
    { id: "c1", labelKey: "echoL1", goal: 4, stepMs: 620 },
    { id: "c2", labelKey: "echoL2", goal: 5, stepMs: 560 },
    { id: "c3", labelKey: "echoL3", goal: 6, stepMs: 500 },
    { id: "c4", labelKey: "echoL4", goal: 7, stepMs: 440 },
    { id: "c5", labelKey: "echoL5", goal: 8, stepMs: 380 },
    { id: "c6", labelKey: "echoL6", goal: 9, stepMs: 320 },
    { id: "c7", labelKey: "echoL7", goal: 10, stepMs: 280 },
    { id: "c8", labelKey: "echoL8", goal: 11, stepMs: 250 },
    { id: "c9", labelKey: "echoL9", goal: 13, stepMs: 235 },
    { id: "c10", labelKey: "echoL10", goal: 15, stepMs: 220 },
    { id: "c11", labelKey: "echoL11", goal: 17, stepMs: 205 },
    { id: "c12", labelKey: "echoL12", goal: 19, stepMs: 195 },
    { id: "c13", labelKey: "echoL13", goal: 21, stepMs: 185 },
    { id: "c14", labelKey: "echoL14", goal: 23, stepMs: 175 },
    { id: "c15", labelKey: "echoL15", goal: 25, stepMs: 165 },
    { id: "c16", labelKey: "echoL16", goal: 27, stepMs: 155 },
    /* c17 debuts the backwards echo at a generous pace; c18 revisits the
     * speed ladder with a shorter glow instead of a longer chain; c19 is
     * the plain-memory peak; c20 combines the backwards echo with the
     * short-glow pressure at a length any chain-runner can read. */
    { id: "c17", labelKey: "echoL17", goal: 13, stepMs: 300, reverse: true },
    { id: "c18", labelKey: "echoL18", goal: 29, stepMs: 150, flashMs: 230 },
    { id: "c19", labelKey: "echoL19", goal: 31, stepMs: 140 },
    { id: "c20", labelKey: "echoL20", goal: 16, stepMs: 180, reverse: true, flashMs: 210 },
    /* c21-c24 are the hard tier, and each one pushes one dial past every
     * shipped chime. c21 is the longest chain the game has ever asked for:
     * 33 links against the shipped 31 of c19. c22 holds that summit length
     * at the fastest plain pace, 135 ms a link under the 140 ms c19 set.
     * c23 is the backwards marathon - 29 mirrored links against the 16 of
     * c20. c24 sprints: backwards again, at 105 ms a link with a 160 ms
     * glow, the fastest chime in the campaign on every clock it carries.
     * Measured effort - links per engaged second, counting shows and the
     * pauses between rounds - climbs 5.1 -> 5.5 -> 5.8 -> 6.1 across the
     * tier against 3.7 for the shipped peak, and a winning echo taps
     * 561 links on c21 alone against 136 on c20. */
    { id: "c21", labelKey: "echoL21", goal: 33, stepMs: 150 },
    { id: "c22", labelKey: "echoL22", goal: 31, stepMs: 135 },
    { id: "c23", labelKey: "echoL23", goal: 29, stepMs: 120, reverse: true },
    { id: "c24", labelKey: "echoL24", goal: 25, stepMs: 105, reverse: true, flashMs: 160 },
    /* c25-c30 are the summit tier, and its identity is the pair: every
     * summit chime is a backwards chime under a shortened glow, and the
     * ladder climbs length and tempo together on top of c24's sprint. All
     * numbers were re-measured through the real panel with the gate's
     * scripted hands on the stub DOM's clock: a perfect-memory hand rings
     * three stars on every rung, one and two deliberate slips land two
     * and one, three end the chime, and a hand that stops one link short
     * of the goal never clears. Measured effort - links per engaged
     * second, shows and pauses included - climbs 6.3 -> 6.4 -> 6.9 -> 7.3
     * -> 7.6 -> 8.0 across the tier against 6.1 for c24, and a winning
     * echo taps 465 links on c25 and 820 on c30 against the 561 of c21.
     * The backwards echo is load-bearing: relax `reverse` on the live
     * chime and the same mirrored hand loses all three lives on the first
     * non-palindromic chain (seeded deals, first killing seed per rung:
     * c25 seed 1, c26 seed 1, c27 seed 1, c28 seed 1, c29 seed 1, c30
     * seed 1). c25 opens with the longest backwards chain ever shipped -
     * 30 links against c23's 29 - at a 160 ms glow; c26 stretches to 32
     * and tightens the glow past c24's 160 ms; c27 is the first backwards
     * chime under the 105 ms pace record at 100 ms a link; c28 and c29
     * push the mirrored marathon to 36 and 38 links at 95 and 92 ms; and
     * c30 closes the campaign with 40 links at 88 ms under a 135 ms glow,
     * every clock on the card a campaign record. The glow never outruns
     * the step by more than the 55 ms c24 already ships, so a summit
     * chain still reads as a rolling wave, not a smear. */
    { id: "c25", labelKey: "echoL25", goal: 30, stepMs: 110, reverse: true, flashMs: 160 },
    { id: "c26", labelKey: "echoL26", goal: 32, stepMs: 110, reverse: true, flashMs: 155 },
    { id: "c27", labelKey: "echoL27", goal: 34, stepMs: 100, reverse: true, flashMs: 150 },
    { id: "c28", labelKey: "echoL28", goal: 36, stepMs: 95, reverse: true, flashMs: 145 },
    { id: "c29", labelKey: "echoL29", goal: 38, stepMs: 92, reverse: true, flashMs: 140 },
    { id: "c30", labelKey: "echoL30", goal: 40, stepMs: 88, reverse: true, flashMs: 135 },
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

    /* How long a pad holds its light this rung: the tone rides the same
     * length, so a short-glow chime sings shorter notes too. */
    function flashLen() {
      return level.flashMs || echoFlashMs;
    }

    function flash(padIndex, wrong) {
      var pad = pads[padIndex];
      pad.classList.add(wrong ? "is-wrong" : "is-lit");
      schedule(function () {
        pad.classList.remove(wrong ? "is-wrong" : "is-lit");
      }, flashLen());
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
          playTone(padIndex, flashLen() / 1000);
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
      playTone(padIndex, flashLen() / 1000);
      /* The backwards chime wants the chain mirrored: the pad it waits for
       * is counted from the far end. The forward chime is untouched. */
      var want = level.reverse
        ? chain[chain.length - 1 - progress]
        : chain[progress];
      if (padIndex !== want) {
        mistakes += 1;
        lives -= 1;
        state = "between";
        lockPads(true);
        flash(want, true);
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
  /* The chime table travels too, so the gate can check the ladder's shape
   * without regex-scraping this source. (Echo Cartographer ships its own
   * App.echoLevels, so this one carries the campaign key's name.) */
  App.glyphEchoLevels = echoLevels;

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. The
   * hard tier keeps the cosmic register the shared dictionary carries, and
   * the summit names the mirrored sky it plays under. */
  App.addStrings({
    en: {
      "echoL21": "The Longest Night",
      "echoL22": "Swift Summit",
      "echoL23": "Mirror Labyrinth",
      "echoL24": "Prestissimo",
      "echoL25": "The Inverted Sky",
      "echoL26": "The Mirror Abyss",
      "echoL27": "Comet Echo",
      "echoL28": "The Eternal Eclipse",
      "echoL29": "Starlight Reversed",
      "echoL30": "The Last Reflection",
    },
    zh: {
      "echoL21": "漫漫长夜",
      "echoL22": "疾峰快板",
      "echoL23": "镜中迷宫",
      "echoL24": "最急板",
      "echoL25": "倒悬星空",
      "echoL26": "镜渊",
      "echoL27": "彗星回声",
      "echoL28": "永夜之蚀",
      "echoL29": "星光倒流",
      "echoL30": "终镜回响",
    },
  });
})(window.CapitalConvert = window.CapitalConvert || {});
