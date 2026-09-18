/* Spot the Diff - The find-the-broken-edit mini-game in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var spotBestKey = "spot-diff-best";
  /* v2 replaces the v1 scalar best (ms, old 3-diff board) with the
   * { level, bests } ladder record; a v1 read migrates onto rung 1. */
  var spotStoreVersion = 2;
  var spotPenaltyMs = 2000;
  /* The ladder: more planted damage per rung, and the mutation pool grows
   * sneakier - case flips join on rung 2, look-alike homoglyphs on rung 3. */
  var spotLevels = [
    { diffs: 3, caseFlips: false, homoglyphs: false },
    { diffs: 4, caseFlips: true, homoglyphs: false },
    { diffs: 5, caseFlips: true, homoglyphs: true },
  ];
  /* Every mutation is one the site's own tools know how to undo, so the
   * planted damage is exactly the kind of noise the toolkit hunts. */
  var spotFullwidth = {
    ",": "\uFF0C",
    ".": "\u3002",
    "!": "\uFF01",
    "?": "\uFF1F",
    ";": "\uFF1B",
    ":": "\uFF1A",
    "(": "\uFF08",
    ")": "\uFF09",
  };
  var spotCurly = {
    '"': "\u201C",
    "'": "\u2019",
  };
  /* Same-codepoint-looking swaps: the edit survives a skim, only a careful
   * read catches them - the top rung's bread and butter. */
  var spotHomoglyphs = {
    o: "0",
    l: "1",
    s: "5",
    z: "2",
    g: "9",
    I: "l",
    O: "0",
  };
  var spotSentences = [
    "Paste your messy notes and let the formatter sweep every bracket away.",
    "Neon lights, clean text, and a caret blinking through the dark.",
    "Convert the punctuation; filter the noise; copy the result; move on.",
    "Small sharp tools beat heavy suites when the queue keeps growing.",
    "Type fast, fix nothing later, and let the regex do the heavy lifting.",
    "A tidy sentence is a gift to whoever reads it next in the pipeline.",
    "Every stray fullwidth comma becomes a space before you can blink.",
    "Keep the best words, drop the clutter, and ship the clean version.",
    'The reviewer said "ship the clean version" and then left.',
    "Brackets (square or round) are fair game for the sweep.",
    "Don't let a stray quote or a doubled space survive the pass.",
    "Lisp-like tools slice the ISO blobs into clean, closed lines.",
    "Zero bugs slip past the sieve when the batch looks twice.",
  ];

  function spotShuffle(list) {
    for (var index = list.length - 1; index > 0; index -= 1) {
      var swap = Math.floor(Math.random() * (index + 1));
      var held = list[index];
      list[index] = list[swap];
      list[swap] = held;
    }
    return list;
  }

  function spotBuildPair(level) {
    var base =
      spotSentences[Math.floor(Math.random() * spotSentences.length)];
    var chars = base.split("");
    var candidates = [];
    chars.forEach(function (ch, index) {
      if (spotFullwidth[ch]) {
        candidates.push({ index: index, to: spotFullwidth[ch] });
      } else if (spotCurly[ch]) {
        candidates.push({ index: index, to: spotCurly[ch] });
      } else if (ch === " " && index > 0) {
        candidates.push({ index: index, to: "  " });
      } else if (
        level.caseFlips &&
        /[a-z]/.test(ch) &&
        index > 0 &&
        /[a-z]/i.test(chars[index - 1])
      ) {
        candidates.push({ index: index, to: ch.toUpperCase() });
      } else if (level.homoglyphs && spotHomoglyphs[ch]) {
        candidates.push({ index: index, to: spotHomoglyphs[ch] });
      }
    });
    spotShuffle(candidates);
    var diffs = [];
    candidates.forEach(function (candidate) {
      if (diffs.length >= level.diffs) {
        return;
      }
      var tooClose = diffs.some(function (picked) {
        return Math.abs(picked.index - candidate.index) < 2;
      });
      if (!tooClose) {
        diffs.push(candidate);
      }
    });
    /* A short on candidates is a solvable-but-thin board, not a broken one:
     * fill the remaining slots while still keeping the indexes distinct. */
    if (diffs.length < level.diffs) {
      candidates.forEach(function (candidate) {
        if (diffs.length >= level.diffs) {
          return;
        }
        var taken = diffs.some(function (picked) {
          return picked.index === candidate.index;
        });
        if (!taken) {
          diffs.push(candidate);
        }
      });
    }
    var edited = chars.slice();
    diffs.forEach(function (diff) {
      edited[diff.index] = diff.to;
    });
    return {
      base: chars,
      edited: edited,
      diffIndexes: diffs.map(function (diff) {
        return diff.index;
      }),
    };
  }

  function spotFillLine(container, chars) {
    container.textContent = "";
    for (var index = 0; index < chars.length; index += 1) {
      var span = document.createElement("span");
      span.className = "spot-char";
      span.setAttribute("data-index", String(index));
      span.textContent = chars[index];
      container.appendChild(span);
    }
  }

  function initSpotDiff() {
    var baseEl = getElement("spotBase");
    var editEl = getElement("spotEdit");
    var foundEl = getElement("spotFoundStat");
    var timeEl = getElement("spotTime");
    var missesEl = getElement("spotMisses");
    var levelEl = getElement("spotLevel");
    var resultEl = getElement("spotResult");
    var startBtn = getElement("spotStartBtn");
    var bestEl = getElement("spotBest");
    if (
      !baseEl ||
      !editEl ||
      !foundEl ||
      !timeEl ||
      !missesEl ||
      !levelEl ||
      !resultEl ||
      !startBtn ||
      !bestEl
    ) {
      return;
    }

    var totalLevels = spotLevels.length;
    var progress = readProgress();
    var nextLevel = clampLevel(progress.level);
    var level = nextLevel; // rung whose board is on screen
    var pair = null;
    var roundActive = false;
    var startedAt = 0;
    var penaltyMs = 0;
    var timerId = null;
    var flashId = null;
    var foundSet = [];
    var misses = 0;
    var cursorIndex = 0;

    function clampLevel(value) {
      var parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 1) {
        return 1;
      }
      return Math.min(parsed, totalLevels);
    }

    /* v1 stored a bare milliseconds scalar; it becomes the rung-1 best so a
     * returning player keeps their record instead of losing it. */
    function readProgress() {
      var raw = "";
      try {
        raw = localStorage.getItem(spotBestKey) || "";
      } catch (error) {
        raw = "";
      }
      if (!raw) {
        return { v: spotStoreVersion, level: 1, bests: {} };
      }
      if (/^\d+$/.test(String(raw))) {
        return {
          v: spotStoreVersion,
          level: 1,
          bests: { "1": parseInt(raw, 10) },
        };
      }
      try {
        var parsed = JSON.parse(String(raw));
        if (
          parsed &&
          typeof parsed === "object" &&
          parsed.bests &&
          typeof parsed.bests === "object"
        ) {
          return {
            v: spotStoreVersion,
            level: parsed.level,
            bests: parsed.bests,
          };
        }
      } catch (error) {
        /* fall through to the fresh record */
      }
      return { v: spotStoreVersion, level: 1, bests: {} };
    }

    function saveProgress() {
      progress.level = clampLevel(nextLevel);
      try {
        localStorage.setItem(spotBestKey, JSON.stringify(progress));
      } catch (error) {
        /* a blocked storage leaves the run playable, just unrecorded */
      }
    }

    function levelBest(playedLevel) {
      var value = progress.bests[String(playedLevel)];
      var parsed = parseInt(value, 10);
      return isNaN(parsed) ? 0 : parsed;
    }

    function renderBest() {
      var best = levelBest(level);
      bestEl.textContent = best
        ? t("bestTime", { s: (best / 1000).toFixed(1) })
        : t("noBest");
    }

    function renderLevel() {
      levelEl.textContent = level + "/" + totalLevels;
    }

    function updateFound() {
      foundEl.textContent =
        foundSet.length + "/" + (pair ? pair.diffIndexes.length : 0);
    }

    function setCursorClass() {
      var spans = editEl.children;
      for (var index = 0; index < spans.length; index += 1) {
        spans[index].classList.toggle("is-cursor", index === cursorIndex);
      }
    }

    function moveCursor(step) {
      if (!pair) {
        return;
      }
      cursorIndex = Math.min(
        Math.max(cursorIndex + step, 0),
        pair.edited.length - 1,
      );
      setCursorClass();
    }

    function buildIdleRound(playedLevel) {
      window.clearInterval(timerId);
      timerId = null;
      roundActive = false;
      level = clampLevel(playedLevel);
      pair = spotBuildPair(spotLevels[level - 1]);
      foundSet = [];
      misses = 0;
      penaltyMs = 0;
      cursorIndex = 0;
      spotFillLine(baseEl, pair.base);
      spotFillLine(editEl, pair.edited);
      setCursorClass();
      updateFound();
      renderLevel();
      renderBest();
      timeEl.textContent = "0.0s";
      missesEl.textContent = "0";
      resultEl.textContent = t("spotPrompt");
    }

    function startRound() {
      buildIdleRound(nextLevel);
      roundActive = true;
      startedAt = Date.now();
      resultEl.textContent = t("spotGo");
      timerId = window.setInterval(tick, 100);
      editEl.focus();
    }

    function elapsedMs() {
      return Date.now() - startedAt + penaltyMs;
    }

    function tick() {
      if (!roundActive) {
        return;
      }
      timeEl.textContent = (elapsedMs() / 1000).toFixed(1) + "s";
    }

    function win() {
      window.clearInterval(timerId);
      timerId = null;
      roundActive = false;

      var finishMs = Math.max(1, elapsedMs());
      var previousBest = levelBest(level);
      var isBest = !previousBest || finishMs < previousBest;
      if (isBest) {
        progress.bests[String(level)] = finishMs;
        nextLevel = clampLevel(level + 1);
        saveProgress();
      }

      var cleared = t("spotFound", {
        n: pair.diffIndexes.length,
        s: (finishMs / 1000).toFixed(1),
      });
      if (isBest) {
        cleared += " " + t("newBest");
      }
      if (level < totalLevels) {
        cleared +=
          " " +
          t("spotLevelCleared", { n: level, total: totalLevels }) +
          " " +
          t("spotNextLevel", { n: clampLevel(level + 1), total: totalLevels });
      } else {
        cleared += " " + t("spotAllLevels", { total: totalLevels });
      }
      resultEl.textContent = cleared;
      renderBest();
      logAction(t("logSpot", { s: (finishMs / 1000).toFixed(1) }));

      if (isBest) {
        var rect = startBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
      petNotifyGame(isBest);
    }

    function markIndex(index) {
      if (!roundActive || !pair || index < 0) {
        return;
      }
      if (foundSet.indexOf(index) !== -1) {
        return;
      }
      if (pair.diffIndexes.indexOf(index) !== -1) {
        foundSet.push(index);
        editEl.children[index].classList.add("is-found");
        updateFound();
        if (foundSet.length === pair.diffIndexes.length) {
          win();
        }
        return;
      }

      misses += 1;
      penaltyMs += spotPenaltyMs;
      missesEl.textContent = String(misses);
      timeEl.textContent = (elapsedMs() / 1000).toFixed(1) + "s";
      window.clearTimeout(flashId);
      editEl.children[index].classList.add("is-wrong");
      flashId = window.setTimeout(function () {
        editEl.children[index].classList.remove("is-wrong");
      }, 450);
      resultEl.textContent =
        t("spotWrong") + " " + t("spotPenalty", { s: spotPenaltyMs / 1000 });
    }

    function indexFromNode(node) {
      while (node && node !== editEl) {
        var raw = node.getAttribute ? node.getAttribute("data-index") : null;
        if (raw !== null) {
          return Number(raw);
        }
        node = node.parentNode;
      }
      return -1;
    }

    startBtn.addEventListener("click", startRound);

    editEl.addEventListener("click", function (event) {
      markIndex(indexFromNode(event.target));
    });

    editEl.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveCursor(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveCursor(-1);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        markIndex(cursorIndex);
      }
    });

    App.quietResetSpotDiff = function () {
      if (roundActive) {
        buildIdleRound(level);
      }
    };

    buildIdleRound(nextLevel);
  }


  /* Exported for the other modules. */
  App.initSpotDiffGame = initSpotDiff;
})(window.CapitalConvert = window.CapitalConvert || {});
