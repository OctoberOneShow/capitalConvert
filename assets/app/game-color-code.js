/* Color Code - The Mastermind-style deduction mini-game in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var ccBestKey = "color-code-best";
  var ccStreakKey = "color-code-streak";
  var ccSlots = 4;
  var ccMaxTries = 10;
  var ccColorKeys = [
    "ccColor0",
    "ccColor1",
    "ccColor2",
    "ccColor3",
    "ccColor4",
    "ccColor5",
  ];
  var ccColors = ["#22d3ee", "#fbbf24", "#f472b6", "#a3e635", "#a78bfa", "#e2e8f0"];

  function ccScore(guess, secret) {
    var exact = 0;
    var white = 0;
    var usedSecret = [];
    var usedGuess = [];
    var index;
    for (index = 0; index < ccSlots; index += 1) {
      if (guess[index] === secret[index]) {
        exact += 1;
        usedSecret[index] = true;
        usedGuess[index] = true;
      }
    }
    for (index = 0; index < ccSlots; index += 1) {
      if (usedGuess[index]) {
        continue;
      }
      for (var other = 0; other < ccSlots; other += 1) {
        if (!usedSecret[other] && guess[index] === secret[other]) {
          white += 1;
          usedSecret[other] = true;
          break;
        }
      }
    }
    return { exact: exact, white: white };
  }

  function initColorCodeGame() {
    var paletteEl = getElement("ccPalette");
    var boardEl = getElement("ccBoard");
    var tryEl = getElement("ccTryStat");
    var streakEl = getElement("ccStreakStat");
    var bestStatEl = getElement("ccBestStat");
    var resultEl = getElement("ccResult");
    var checkBtn = getElement("ccCheckBtn");
    var newBtn = getElement("ccNewBtn");
    if (
      !paletteEl ||
      !boardEl ||
      !tryEl ||
      !streakEl ||
      !bestStatEl ||
      !resultEl ||
      !checkBtn ||
      !newBtn
    ) {
      return;
    }

    var secret = [];
    var guesses = [];
    var current = [null, null, null, null];
    var selectedColor = 0;
    var over = false;
    var swatches = Array.prototype.slice.call(paletteEl.children);

    function readIntKey(key) {
      var value = parseInt(localStorage.getItem(key), 10);
      return isNaN(value) ? 0 : value;
    }

    function newSecret() {
      secret = [];
      for (var index = 0; index < ccSlots; index += 1) {
        secret.push(Math.floor(Math.random() * ccColors.length));
      }
    }

    function codeText(code) {
      return code
        .map(function (color) {
          return t(ccColorKeys[color]);
        })
        .join(" \u00b7 ");
    }

    function renderStats() {
      tryEl.textContent =
        Math.min(guesses.length + 1, ccMaxTries) + "/" + ccMaxTries;
      streakEl.textContent = String(readIntKey(ccStreakKey));
      var best = readIntKey(ccBestKey);
      bestStatEl.textContent = best
        ? t("ccBestLine", { n: best })
        : t("noBest");
    }

    function makeSlot(index, color) {
      var slot = document.createElement("button");
      slot.type = "button";
      slot.className = "cc-slot";
      slot.setAttribute("data-slot", String(index));
      slot.style.background = color === null ? "transparent" : ccColors[color];
      slot.setAttribute(
        "aria-label",
        t("ccSlotLabel", {
          n: index + 1,
          color: color === null ? t("ccEmpty") : t(ccColorKeys[color]),
        }),
      );
      return slot;
    }

    function makePegs(feedback) {
      var wrap = document.createElement("span");
      wrap.className = "cc-pegs";
      var pegIndex;
      for (pegIndex = 0; pegIndex < feedback.exact; pegIndex += 1) {
        var solid = document.createElement("span");
        solid.className = "cc-peg is-exact";
        wrap.appendChild(solid);
      }
      for (pegIndex = 0; pegIndex < feedback.white; pegIndex += 1) {
        var hollow = document.createElement("span");
        hollow.className = "cc-peg is-white";
        wrap.appendChild(hollow);
      }
      return wrap;
    }

    function renderBoard() {
      boardEl.textContent = "";
      guesses.forEach(function (entry) {
        var row = document.createElement("div");
        row.className = "cc-row is-locked";
        entry.guess.forEach(function (color, index) {
          var slot = makeSlot(index, color);
          slot.disabled = true;
          row.appendChild(slot);
        });
        row.appendChild(makePegs(entry.feedback));
        boardEl.appendChild(row);
      });
      if (!over) {
        var live = document.createElement("div");
        live.className = "cc-row is-current";
        current.forEach(function (color, index) {
          var slot = makeSlot(index, color);
          slot.addEventListener("click", function () {
            current[index] = selectedColor;
            renderBoard();
          });
          live.appendChild(slot);
        });
        boardEl.appendChild(live);
      } else {
        var reveal = document.createElement("div");
        reveal.className = "cc-row is-secret";
        var label = document.createElement("span");
        label.className = "cc-secret-label";
        label.textContent = t("ccSecretLabel");
        reveal.appendChild(label);
        secret.forEach(function (color, index) {
          var slot = makeSlot(index, color);
          slot.disabled = true;
          reveal.appendChild(slot);
        });
        boardEl.appendChild(reveal);
      }
    }

    function win() {
      over = true;
      var tries = guesses.length;
      var previousBest = readIntKey(ccBestKey);
      var isBest = !previousBest || tries < previousBest;
      if (isBest) {
        localStorage.setItem(ccBestKey, String(tries));
      }
      localStorage.setItem(ccStreakKey, String(readIntKey(ccStreakKey) + 1));
      resultEl.textContent =
        t("ccWin", { n: tries }) + (isBest ? " " + t("newBest") : "");
      logAction(t("logCC", { n: tries }));
      var rect = checkBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(isBest);
      renderBoard();
      renderStats();
    }

    function lose() {
      over = true;
      localStorage.setItem(ccStreakKey, "0");
      resultEl.textContent = t("ccLost", { code: codeText(secret) });
      logAction(t("logCC", { n: "—" }));
      petNotifyGame(false);
      renderBoard();
      renderStats();
    }

    function check() {
      if (over) {
        return;
      }
      for (var index = 0; index < ccSlots; index += 1) {
        if (current[index] === null) {
          resultEl.textContent = t("ccNoFill");
          return;
        }
      }
      var feedback = ccScore(current, secret);
      guesses.push({ guess: current.slice(), feedback: feedback });
      current = [null, null, null, null];
      renderStats();

      if (feedback.exact === ccSlots) {
        win();
        return;
      }
      if (guesses.length >= ccMaxTries) {
        lose();
        return;
      }
      resultEl.textContent = t("ccFeedback", {
        e: feedback.exact,
        w: feedback.white,
      });
      renderBoard();
    }

    function newRound() {
      over = false;
      guesses = [];
      current = [null, null, null, null];
      newSecret();
      renderBoard();
      renderStats();
      resultEl.textContent = t("ccPrompt");
      checkBtn.focus();
    }

    swatches.forEach(function (swatch, index) {
      swatch.addEventListener("click", function () {
        selectedColor = index;
        swatches.forEach(function (other, otherIndex) {
          other.setAttribute("aria-pressed", String(otherIndex === index));
          other.classList.toggle("is-selected", otherIndex === index);
        });
      });
    });

    checkBtn.addEventListener("click", check);
    newBtn.addEventListener("click", newRound);

    newRound();
  }


  /* Exported for the other modules. */
  App.initColorCodeGame = initColorCodeGame;
})(window.CapitalConvert = window.CapitalConvert || {});
