/* Glyph Match - The memory-pair mini-game in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var memoryBestKey = "glyph-match-best";
  var memoryStoreVersion = 2;
  var memoryMaxSeconds = 3600;
  /* The ladder replaces the old fixed 6-pair board: each rung is a pair count
   * plus the column count that keeps its cards legible inside the ~390px
   * drawer panel. Rung 3 (6 pairs) is the original board. */
  var memoryLegacyPairs = 6;
  var memoryLevels = [
    { pairs: 3, cols: 3 },
    { pairs: 4, cols: 4 },
    { pairs: 6, cols: 4 },
    { pairs: 8, cols: 4 },
    { pairs: 10, cols: 5 },
  ];
  /* Glyph pool: the first six are the original board's glyphs, the rest widen
   * the pool so the largest rung has enough distinct faces. */
  var memoryGlyphs = [
    "\u5929",
    "\u4e3b",
    "\u795e",
    "\u5149",
    "\u5723",
    "\u7075",
    "\u661f",
    "\u6708",
    "\u4e91",
    "\u96f7",
    "\u7389",
    "\u7384",
  ];

  function initMemoryGame() {
    var grid = getElement("memoryGrid");
    var movesEl = getElement("memoryMoves");
    var timeEl = getElement("memoryTime");
    var pairsEl = getElement("memoryPairs");
    var resultEl = getElement("memoryResult");
    var startBtn = getElement("memoryStartBtn");
    var bestEl = getElement("memoryBest");
    if (
      !grid ||
      !movesEl ||
      !timeEl ||
      !pairsEl ||
      !resultEl ||
      !startBtn ||
      !bestEl
    ) {
      return;
    }

    var totalLevels = memoryLevels.length;
    var legacyLevel = 1;
    memoryLevels.forEach(function (info, index) {
      if (info.pairs === memoryLegacyPairs) {
        legacyLevel = index + 1;
      }
    });

    var progress = readProgress();
    var level = progress.level; // rung whose board is on screen
    var nextLevel = progress.level; // rung a "next level" click / reload resumes on
    var bests = progress.bests;
    var levelCleared = false;

    var firstCard = null;
    var lockBoard = false;
    var moves = 0;
    var matchedPairs = 0;
    var roundStarted = false;
    var startedAt = 0;
    var timerId = null;

    var primaryLabel = startBtn.querySelector("[data-i18n]");
    var levelStat = buildLevelStat();

    function clampLevel(value) {
      var parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 1) {
        return 1;
      }
      return parsed > totalLevels ? totalLevels : parsed;
    }

    /* Reads the ladder progress. Version 1 of the key held one scalar best
     * time for the fixed 6-pair board: that value migrates to the best of the
     * rung that reproduces that board. Corrupt or out-of-range data falls back
     * to the defaults instead of throwing. `stale` means the stored text is not
     * in the current shape yet, so it is rewritten once on init. */
    function readProgress() {
      var blank = function (stale) {
        return { level: 1, bests: {}, stale: stale };
      };
      var raw = null;
      try {
        raw = localStorage.getItem(memoryBestKey);
      } catch (error) {
        return blank(false);
      }
      if (raw === null || raw === undefined) {
        return blank(false);
      }

      var text = String(raw).trim();
      if (!text) {
        return blank(true);
      }

      if (/^\d+(\.\d+)?$/.test(text)) {
        var legacy = parseFloat(text);
        var migrated = blank(true);
        if (legacy > 0 && legacy <= memoryMaxSeconds) {
          migrated.bests[String(legacyLevel)] = legacy;
        }
        return migrated;
      }

      var parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        return blank(true);
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return blank(true);
      }

      var storedBests = {};
      var source = parsed.bests;
      if (source && typeof source === "object" && !Array.isArray(source)) {
        Object.keys(source).forEach(function (key) {
          if (!/^\d+$/.test(key)) {
            return;
          }
          var index = parseInt(key, 10);
          var value = parseFloat(source[key]);
          if (index < 1 || index > totalLevels) {
            return;
          }
          if (!isFinite(value) || value <= 0 || value > memoryMaxSeconds) {
            return;
          }
          storedBests[key] = value;
        });
      }

      return {
        level: clampLevel(parsed.level),
        bests: storedBests,
        stale: parsed.v !== memoryStoreVersion,
      };
    }

    function writeProgress() {
      try {
        localStorage.setItem(
          memoryBestKey,
          JSON.stringify({
            v: memoryStoreVersion,
            level: nextLevel,
            bests: bests,
          }),
        );
      } catch (error) {
        /* no-op: progress stays in memory for this page view */
      }
    }

    function levelBest(index) {
      var value = bests[String(index)];
      return isFinite(value) && value > 0 ? value : 0;
    }

    function currentLevel() {
      return memoryLevels[level - 1];
    }

    function renderBest() {
      var best = levelBest(level);
      bestEl.textContent = best
        ? t("bestTime", { s: best.toFixed(1) })
        : t("noBest");
    }

    function levelLabel() {
      return t("memoryLevelAria", { n: level, total: totalLevels });
    }

    function renderLevel() {
      var info = currentLevel();
      if (levelStat) {
        levelStat.value.textContent = level + "/" + totalLevels;
        levelStat.stat.setAttribute("aria-label", levelLabel());
      }
      grid.setAttribute("data-cols", String(info.cols));
      grid.setAttribute(
        "aria-label",
        t("memoryGridLevelLabel", { aria: levelLabel() }),
      );
    }

    /* The level HUD cell is injected here rather than hard-coded in the four
     * pages, so their game drawer markup stays byte-identical. */
    function buildLevelStat() {
      var panel = grid.closest ? grid.closest(".game-panel") : null;
      var hud = panel ? panel.querySelector(".game-hud") : null;
      if (!hud) {
        return null;
      }

      var stat = document.createElement("div");
      stat.className = "game-stat memory-level-stat";
      stat.setAttribute("role", "group");
      stat.setAttribute("aria-label", t("hudLevel"));

      var label = document.createElement("span");
      label.setAttribute("data-i18n", "hudLevel");
      label.textContent = t("hudLevel");

      var value = document.createElement("strong");
      value.id = "memoryLevel";

      stat.appendChild(label);
      stat.appendChild(value);
      hud.insertBefore(stat, hud.firstChild);
      return { stat: stat, value: value };
    }

    function setPrimaryLabel(key) {
      if (primaryLabel) {
        primaryLabel.setAttribute("data-i18n", key);
        primaryLabel.textContent = t(key);
      } else {
        startBtn.setAttribute("aria-label", t(key));
      }
    }

    function elapsed() {
      return roundStarted ? (Date.now() - startedAt) / 1000 : 0;
    }

    function tick() {
      timeEl.textContent = elapsed().toFixed(1) + "s";
    }

    function setCardFace(card, revealed) {
      var face = card.firstChild;
      var glyph = card.getAttribute("data-glyph");
      face.textContent = revealed ? glyph : "?";

      var state = t("cardDown", { n: card.getAttribute("data-position") });
      if (card.classList.contains("matched")) {
        state = t("cardMatched", {
          n: card.getAttribute("data-position"),
          glyph: glyph,
        });
      } else if (revealed) {
        state = t("cardGlyph", {
          n: card.getAttribute("data-position"),
          glyph: glyph,
        });
      }
      card.setAttribute("aria-label", state);
    }

    /* A random subset of distinct glyphs: the same glyph never appears twice
     * on one board except as the pair it is there to make. */
    function pickGlyphs(count) {
      var pool = memoryGlyphs.slice();
      for (var i = pool.length - 1; i > 0; i -= 1) {
        var j = Math.floor(Math.random() * (i + 1));
        var swap = pool[i];
        pool[i] = pool[j];
        pool[j] = swap;
      }
      return pool.slice(0, count);
    }

    function buildBoard() {
      var info = currentLevel();
      var glyphs = pickGlyphs(info.pairs);
      var deck = glyphs.concat(glyphs);
      for (var i = deck.length - 1; i > 0; i -= 1) {
        var j = Math.floor(Math.random() * (i + 1));
        var swap = deck[i];
        deck[i] = deck[j];
        deck[j] = swap;
      }

      grid.innerHTML = "";
      deck.forEach(function (glyph, index) {
        var card = document.createElement("button");
        card.type = "button";
        card.className = "memory-card";
        card.setAttribute("data-glyph", glyph);
        card.setAttribute("data-position", String(index + 1));
        card.setAttribute(
          "aria-label",
          t("cardDown", { n: String(index + 1) }),
        );

        var face = document.createElement("span");
        face.setAttribute("aria-hidden", "true");
        face.textContent = "?";
        card.appendChild(face);

        card.addEventListener("click", function () {
          flipCard(card);
        });
        grid.appendChild(card);
      });

      firstCard = null;
      lockBoard = false;
      moves = 0;
      matchedPairs = 0;
      movesEl.textContent = "0";
      pairsEl.textContent = "0/" + info.pairs;
      timeEl.textContent = "0.0s";
      renderLevel();
      renderBest();
    }

    function flipCard(card) {
      var info = currentLevel();

      if (
        lockBoard ||
        card.classList.contains("flipped") ||
        card.classList.contains("matched")
      ) {
        return;
      }

      if (!roundStarted) {
        roundStarted = true;
        startedAt = Date.now();
        timerId = window.setInterval(tick, 100);
      }

      card.classList.add("flipped");
      setCardFace(card, true);

      if (!firstCard) {
        firstCard = card;
        return;
      }

      var pair = firstCard;
      firstCard = null;
      moves += 1;
      movesEl.textContent = String(moves);

      if (pair.getAttribute("data-glyph") === card.getAttribute("data-glyph")) {
        pair.classList.remove("flipped");
        card.classList.remove("flipped");
        pair.classList.add("matched");
        card.classList.add("matched");
        setCardFace(pair, true);
        setCardFace(card, true);
        matchedPairs += 1;
        pairsEl.textContent = matchedPairs + "/" + info.pairs;

        if (matchedPairs === info.pairs) {
          endRound(true);
        }
        return;
      }

      lockBoard = true;
      window.setTimeout(function () {
        pair.classList.remove("flipped");
        card.classList.remove("flipped");
        setCardFace(pair, false);
        setCardFace(card, false);
        lockBoard = false;
      }, 700);
    }

    function endRound(finished) {
      if (!roundStarted) {
        return;
      }

      var seconds = elapsed();
      roundStarted = false;
      window.clearInterval(timerId);
      timerId = null;
      timeEl.textContent = seconds.toFixed(1) + "s";

      var finalLevel = level >= totalLevels;
      var best = levelBest(level);
      var isBest = finished && seconds > 0 && (best === 0 || seconds < best);
      var message =
        t("memoryLevelCleared", { n: level, total: totalLevels }) +
        " " +
        t("memoryCleared", {
          s: seconds.toFixed(1),
          n: moves,
          unit: moves === 1 ? t("unitMove") : t("unitMoves"),
        });

      if (isBest) {
        bests[String(level)] = seconds;
        message += " " + t("newBest");
        var rect = startBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }

      if (finalLevel) {
        message += " " + t("memoryAllComplete", { total: totalLevels });
      } else {
        message +=
          " " +
          t("memoryNextUp", { n: level + 1, total: totalLevels });
      }

      /* The cleared board stays on screen until the player advances, but the
       * rung after it is already the resume point, so a reload lands there. */
      levelCleared = true;
      nextLevel = finalLevel ? 1 : level + 1;
      writeProgress();
      setPrimaryLabel(finalLevel ? "btnReplayLevels" : "btnNextLevel");

      petNotifyGame(isBest);

      resultEl.textContent = message;
      renderBest();
      logAction(t("logMemory", { s: seconds.toFixed(1) }));
      startBtn.focus();
    }

    /* Moves the player onto the rung the finished round unlocked (or back to
     * the first rung after the last one). */
    function advanceLevel() {
      level = nextLevel;
      resetBoard();
    }

    function resetBoard() {
      window.clearInterval(timerId);
      timerId = null;
      roundStarted = false;
      startedAt = 0;
      levelCleared = false;
      setPrimaryLabel("btnNewShuffle");
      buildBoard();
      resultEl.textContent = t("memoryPrompt");
    }

    startBtn.addEventListener("click", function () {
      if (levelCleared) {
        advanceLevel();
      } else {
        resetBoard();
      }
      startBtn.focus();
    });

    App.quietResetMemory = function () {
      if (!roundStarted) {
        return;
      }

      resetBoard();
    };

    buildBoard();
    resultEl.textContent = t("memoryPrompt");
    if (progress.stale) {
      writeProgress();
    }
  }

  /* Exported for the other modules. */
  App.initMemoryGame = initMemoryGame;
})(window.CapitalConvert = window.CapitalConvert || {});
