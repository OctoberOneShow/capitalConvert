/* Typing Sprint - The timed typing mini-game in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var setStatus = App.setStatus;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var typingRoundSeconds = 10;
  var typingBestKey = "typing-sprint-best";
  var typingPhrases = [
    "Paste your messy notes and let the formatter sweep every bracket away.",
    "Neon lights, clean text, and a caret blinking through the dark.",
    "Convert the punctuation, filter the noise, copy the result, move on.",
    "Small sharp tools beat heavy suites when the queue keeps growing.",
    "Type fast, fix nothing later, and let the regex do the heavy lifting.",
    "A tidy sentence is a gift to whoever reads it next in the pipeline.",
    "Every stray fullwidth comma becomes a space before you can blink.",
    "Keep the best words, drop the clutter, and ship the clean version.",
  ];

  function initTypingGame() {
    var targetEl = getElement("typingTarget");
    var targetTextEl = getElement("typingTargetText");
    var input = getElement("typingInput");
    var startBtn = getElement("gameStartBtn");
    var timeEl = getElement("gameTime");
    var wpmEl = getElement("gameWpm");
    var accEl = getElement("gameAcc");
    var trackFill = getElement("gameTrackFill");
    var resultEl = getElement("gameResult");
    var bestEl = getElement("gameBest");
    var modal = getElement("gameModal");
    var openBtn = getElement("gameToggleBtn");
    if (!targetEl || !targetTextEl || !input || !startBtn || !timeEl) {
      return;
    }

    if (!modal || !openBtn) {
      return;
    }

    var dialog = modal.querySelector(".game-dialog");
    var backdrop = getElement("gameBackdrop");
    var closeBtn = getElement("gameCloseBtn");
    openBtn.setAttribute("aria-label", t("openGames"));
    var tabTyping = getElement("gameTabTyping");
    var tabMemory = getElement("gameTabMemory");
    var tab2048 = getElement("gameTab2048");
    var tabReflex = getElement("gameTabReflex");
    var tabCaretDash = getElement("gameTabCaretDash");
    var tabElements = getElement("gameTabElements");
    var tabSpotDiff = getElement("gameTabSpotDiff");
    var tabPlumber = getElement("gameTabPlumber");
    var tabStack = getElement("gameTabStack");
    var tabColorCode = getElement("gameTabColorCode");
    var tabBreakout = getElement("gameTabBreakout");
    var tabEmberDice = getElement("gameTabEmberDice");
    var tabSnake = getElement("gameTabSnake");
    var tabLights = getElement("gameTabLights");
    var tabMines = getElement("gameTabMines");
    var tabGomoku = getElement("gameTabGomoku");
    var tabTraffic = getElement("gameTabTraffic");
    var tabVault = getElement("gameTabVault");
    var panelTyping = getElement("gamePanelTyping");
    var panelMemory = getElement("gamePanelMemory");
    var panel2048 = getElement("gamePanel2048");
    var panelReflex = getElement("gamePanelReflex");
    var panelCaretDash = getElement("gamePanelCaretDash");
    var panelElements = getElement("gamePanelElements");
    var panelSpotDiff = getElement("gamePanelSpotDiff");
    var panelPlumber = getElement("gamePanelPlumber");
    var panelStack = getElement("gamePanelStack");
    var panelColorCode = getElement("gamePanelColorCode");
    var panelBreakout = getElement("gamePanelBreakout");
    var panelEmberDice = getElement("gamePanelEmberDice");
    var panelSnake = getElement("gamePanelSnake");
    var panelLights = getElement("gamePanelLights");
    var panelMines = getElement("gamePanelMines");
    var panelGomoku = getElement("gamePanelGomoku");
    var panelTraffic = getElement("gamePanelTraffic");
    var panelVault = getElement("gamePanelVault");
    var tabsGrid = getElement("gameTabs");
    var pickerToggle = getElement("gameTabsToggle");
    var pickerLabel = getElement("gameTabsLabel");
    var pickerCount = getElement("gameTabsCount");
    if (
      !dialog ||
      !backdrop ||
      !closeBtn ||
      !tabsGrid ||
      !pickerToggle ||
      !pickerLabel ||
      !pickerCount ||
      !tabTyping ||
      !tabMemory ||
      !tab2048 ||
      !tabReflex ||
      !tabCaretDash ||
      !tabElements ||
      !tabSpotDiff ||
      !tabPlumber ||
      !tabStack ||
      !tabColorCode ||
      !tabBreakout ||
      !tabEmberDice ||
      !tabSnake ||
      !tabLights ||
      !tabMines ||
      !tabGomoku ||
      !tabTraffic ||
      !tabVault ||
      !panelTyping ||
      !panelMemory ||
      !panel2048 ||
      !panelReflex ||
      !panelCaretDash ||
      !panelElements ||
      !panelSpotDiff ||
      !panelPlumber ||
      !panelStack ||
      !panelColorCode ||
      !panelBreakout ||
      !panelEmberDice ||
      !panelSnake ||
      !panelLights ||
      !panelMines ||
      !panelGomoku ||
      !panelTraffic ||
      !panelVault
    ) {
      return;
    }

    var phrase = "";
    var roundActive = false;
    var roundStarted = false;
    var startedAt = 0;
    var timerId = null;

    function readBest() {
      var value = parseInt(localStorage.getItem(typingBestKey), 10);
      return isNaN(value) ? 0 : value;
    }

    function renderBest() {
      var best = readBest();
      bestEl.textContent = best ? t("bestWpm", { n: best }) : t("noBest");
    }

    function buildTarget() {
      phrase = typingPhrases[Math.floor(Math.random() * typingPhrases.length)];
      targetEl.textContent = "";
      for (var index = 0; index < phrase.length; index += 1) {
        var span = document.createElement("span");
        span.className = "char-pending";
        span.textContent = phrase[index];
        targetEl.appendChild(span);
      }
      targetTextEl.textContent = phrase;
      input.maxLength = phrase.length;
    }

    function roundStats() {
      var typed = input.value;
      var correct = 0;
      for (var index = 0; index < typed.length; index += 1) {
        if (typed[index] === phrase[index]) {
          correct += 1;
        }
      }
      var elapsed = roundStarted ? (Date.now() - startedAt) / 1000 : 0;
      var wpm = 0;
      if (roundStarted && elapsed > 0) {
        wpm = Math.round(correct / 5 / (elapsed / 60));
      }
      var accuracy = typed.length
        ? Math.round((correct / typed.length) * 100)
        : 100;
      return {
        correct: correct,
        typed: typed.length,
        elapsed: elapsed,
        wpm: wpm,
        accuracy: accuracy,
      };
    }

    function updateHud() {
      var stats = roundStats();
      var remaining = Math.max(typingRoundSeconds - stats.elapsed, 0);
      timeEl.textContent = remaining.toFixed(1) + "s";
      wpmEl.textContent = String(stats.wpm);
      accEl.textContent = stats.accuracy + "%";
      trackFill.style.width =
        Math.min((stats.elapsed / typingRoundSeconds) * 100, 100) + "%";
      return stats;
    }

    function setCharClasses() {
      var typed = input.value;
      var spans = targetEl.children;
      for (var index = 0; index < spans.length; index += 1) {
        var nextClass = "char-pending";
        if (index < typed.length) {
          nextClass =
            typed[index] === phrase[index] ? "char-correct" : "char-wrong";
        } else if (index === typed.length) {
          nextClass = "char-pending char-current";
        }
        if (spans[index].className !== nextClass) {
          spans[index].className = nextClass;
        }
      }
    }

    function endRound(finished) {
      if (!roundActive) {
        return;
      }

      roundActive = false;
      window.clearInterval(timerId);
      timerId = null;
      input.disabled = true;

      var stats = updateHud();
      var isBest = finished && stats.wpm > 0 && stats.wpm > readBest();
      var message = finished
        ? t("typingFinished", {
            s: stats.elapsed.toFixed(1),
            wpm: stats.wpm,
            acc: stats.accuracy,
          })
        : t("typingTimeUp", { wpm: stats.wpm, acc: stats.accuracy });

      if (isBest) {
        localStorage.setItem(typingBestKey, String(stats.wpm));
        message += " " + t("newBest");
        var rect = startBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
      petNotifyGame(isBest);

      resultEl.textContent = message;
      renderBest();
      logAction(t("logTyping", { n: stats.wpm }));
      startBtn.focus();
    }

    function tick() {
      var stats = updateHud();
      if (stats.elapsed >= typingRoundSeconds) {
        endRound(false);
      }
    }

    function startRound(shouldFocus) {
      window.clearInterval(timerId);
      timerId = null;
      buildTarget();
      input.disabled = false;
      input.value = "";
      roundActive = true;
      roundStarted = false;
      startedAt = 0;
      timeEl.textContent = typingRoundSeconds.toFixed(1) + "s";
      wpmEl.textContent = "0";
      accEl.textContent = "100%";
      trackFill.style.width = "0%";
      resultEl.textContent = t("typingPrompt");
      setCharClasses();

      if (shouldFocus !== false) {
        input.focus();
      }
    }

    startBtn.addEventListener("click", function () {
      startRound(true);
    });

    input.addEventListener("input", function () {
      if (!roundActive) {
        return;
      }

      if (!roundStarted && input.value.length > 0) {
        roundStarted = true;
        startedAt = Date.now();
        timerId = window.setInterval(tick, 100);
      }

      setCharClasses();
      var stats = updateHud();

      if (input.value.length >= phrase.length) {
        endRound(true);
      } else if (roundStarted && stats.elapsed >= typingRoundSeconds) {
        endRound(false);
      }
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
          if (!roundActive) {
            startRound(true);
          }
      }
    });

    input.addEventListener("paste", function (event) {
      event.preventDefault();
      setStatus(t("statusNoPasteGame"), "error");
    });

    var gameTabEntries = [
      { name: "typing", tab: tabTyping, panel: panelTyping },
      { name: "memory", tab: tabMemory, panel: panelMemory },
      { name: "2048", tab: tab2048, panel: panel2048 },
      { name: "reflex", tab: tabReflex, panel: panelReflex },
      { name: "caretDash", tab: tabCaretDash, panel: panelCaretDash },
      { name: "elements", tab: tabElements, panel: panelElements },
      { name: "spotDiff", tab: tabSpotDiff, panel: panelSpotDiff },
      { name: "plumber", tab: tabPlumber, panel: panelPlumber },
      { name: "stack", tab: tabStack, panel: panelStack },
      { name: "colorCode", tab: tabColorCode, panel: panelColorCode },
      { name: "breakout", tab: tabBreakout, panel: panelBreakout },
      { name: "emberDice", tab: tabEmberDice, panel: panelEmberDice },
      { name: "snake", tab: tabSnake, panel: panelSnake },
      { name: "lights", tab: tabLights, panel: panelLights },
      { name: "mines", tab: tabMines, panel: panelMines },
      { name: "gomoku", tab: tabGomoku, panel: panelGomoku },
      { name: "traffic", tab: tabTraffic, panel: panelTraffic },
      { name: "vault", tab: tabVault, panel: panelVault },
    ];
    var activeTabName = "typing";
    var pickerVisibleCount = 6;
    var pickerExpanded = readPickerExpanded();

    function readPickerExpanded() {
      try {
        return localStorage.getItem("game-tabs-expanded") === "1";
      } catch (error) {
        return false;
      }
    }

    /* The collapsed grid hides its overflow behind a named count, not a
     * scroll gesture: "More games +9" says exactly what is missing. The
     * label carries its own data-i18n key so a language switch re-translates
     * it in whichever mode the picker sits. */
    function applyPickerMode() {
      tabsGrid.classList.toggle("is-collapsed", !pickerExpanded);
      pickerToggle.setAttribute("aria-expanded", String(pickerExpanded));
      var labelKey = pickerExpanded ? "tabsShowLess" : "tabsShowMore";
      pickerLabel.setAttribute("data-i18n", labelKey);
      pickerLabel.textContent = t(labelKey);
      pickerCount.textContent = pickerExpanded
        ? ""
        : "+" + Math.max(0, gameTabEntries.length - pickerVisibleCount);
      try {
        localStorage.setItem("game-tabs-expanded", pickerExpanded ? "1" : "0");
      } catch (error) {
        /* the mode simply starts fresh next time */
      }
    }

    pickerToggle.addEventListener("click", function () {
      pickerExpanded = !pickerExpanded;
      applyPickerMode();
    });

    function selectTab(selected, shouldFocus) {
      activeTabName = selected;

      gameTabEntries.forEach(function (entry) {
        var isSelected = entry.name === selected;
        entry.tab.setAttribute("aria-selected", String(isSelected));
        entry.tab.tabIndex = isSelected ? 0 : -1;
        entry.panel.hidden = !isSelected;
      });

      if (App.quietResetTyping) {
        App.quietResetTyping();
      }

      if (App.quietResetMemory) {
        App.quietResetMemory();
      }

      if (App.quietReset2048) {
        App.quietReset2048();
      }

      if (App.quietResetReflex) {
        App.quietResetReflex();
      }

      if (App.quietResetCaretDash) {
        App.quietResetCaretDash();
      }

      if (App.quietResetElements) {
        App.quietResetElements();
      }

      if (App.quietResetSpotDiff) {
        App.quietResetSpotDiff();
      }

      if (App.quietResetPlumber) {
        App.quietResetPlumber();
      }

      if (App.quietResetStack) {
        App.quietResetStack();
      }

      if (App.quietResetBreakout) {
        App.quietResetBreakout();
      }

      if (App.quietResetSnake) {
        App.quietResetSnake();
      }

      if (App.quietResetMines) {
        App.quietResetMines();
      }

      if (shouldFocus) {
        gameTabEntries.forEach(function (entry) {
          if (entry.name === selected) {
            entry.tab.focus();
          }
        });
      }
    }

    tabTyping.addEventListener("click", function () {
      selectTab("typing");
    });

    tabMemory.addEventListener("click", function () {
      selectTab("memory");
    });

    tab2048.addEventListener("click", function () {
      selectTab("2048");
    });

    tabReflex.addEventListener("click", function () {
      selectTab("reflex");
    });

    tabCaretDash.addEventListener("click", function () {
      selectTab("caretDash");
    });

    tabElements.addEventListener("click", function () {
      selectTab("elements");
    });

    tabSpotDiff.addEventListener("click", function () {
      selectTab("spotDiff");
    });

    tabPlumber.addEventListener("click", function () {
      selectTab("plumber");
    });

    tabStack.addEventListener("click", function () {
      selectTab("stack");
    });

    tabColorCode.addEventListener("click", function () {
      selectTab("colorCode");
    });

    tabBreakout.addEventListener("click", function () {
      selectTab("breakout");
    });

    tabEmberDice.addEventListener("click", function () {
      selectTab("emberDice");
    });

    tabSnake.addEventListener("click", function () {
      selectTab("snake");
    });

    tabLights.addEventListener("click", function () {
      selectTab("lights");
    });

    tabMines.addEventListener("click", function () {
      selectTab("mines");
    });

    tabGomoku.addEventListener("click", function () {
      selectTab("gomoku");
    });

    tabTraffic.addEventListener("click", function () {
      selectTab("traffic");
    });

    tabVault.addEventListener("click", function () {
      selectTab("vault");
    });

    tabTyping.parentElement.addEventListener("keydown", function (event) {
      var nextName = null;
      var count = gameTabEntries.length;
      var index = 0;

      for (var i = 0; i < count; i += 1) {
        if (gameTabEntries[i].name === activeTabName) {
          index = i;
          break;
        }
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextName = gameTabEntries[(index + 1) % count].name;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextName = gameTabEntries[(index + count - 1) % count].name;
      } else if (event.key === "Home") {
        nextName = gameTabEntries[0].name;
      } else if (event.key === "End") {
        nextName = gameTabEntries[count - 1].name;
      }

      if (nextName) {
        event.preventDefault();
        selectTab(nextName, true);
      }
    });

    App.quietResetTyping = function () {
      if (!roundActive || !roundStarted) {
        return;
      }

      window.clearInterval(timerId);
      timerId = null;
      roundStarted = false;
      startedAt = 0;
      input.value = "";
      timeEl.textContent = typingRoundSeconds.toFixed(1) + "s";
      wpmEl.textContent = "0";
      accEl.textContent = "100%";
      trackFill.style.width = "0%";
      resultEl.textContent = t("typingPrompt");
      setCharClasses();
    };

    function openModal() {
      if (!modal.hidden) {
        return;
      }

      modal.hidden = false;
      document.body.classList.add("game-modal-open");
      openBtn.setAttribute("aria-expanded", "true");

      if (input.disabled) {
        startBtn.focus();
      } else {
        input.focus();
      }
    }

    function closeModal() {
      if (modal.hidden) {
        return;
      }

      modal.hidden = true;
      document.body.classList.remove("game-modal-open");
      openBtn.setAttribute("aria-expanded", "false");

      if (App.quietResetTyping) {
        App.quietResetTyping();
      }

      if (App.quietResetMemory) {
        App.quietResetMemory();
      }

      if (App.quietResetReflex) {
        App.quietResetReflex();
      }

      if (App.quietResetCaretDash) {
        App.quietResetCaretDash();
      }

      if (App.quietResetElements) {
        App.quietResetElements();
      }

      if (App.quietResetSpotDiff) {
        App.quietResetSpotDiff();
      }

      if (App.quietResetPlumber) {
        App.quietResetPlumber();
      }

      if (App.quietResetStack) {
        App.quietResetStack();
      }

      if (App.quietResetBreakout) {
        App.quietResetBreakout();
      }

      if (App.quietResetSnake) {
        App.quietResetSnake();
      }

      if (App.quietResetMines) {
        App.quietResetMines();
      }

      openBtn.focus();
    }

    openBtn.addEventListener("click", openModal);
    closeBtn.addEventListener("click", closeModal);
    backdrop.addEventListener("click", closeModal);

    dialog.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeModal();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      var focusables = Array.prototype.filter.call(
        dialog.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
        function (element) {
          return element.offsetParent !== null;
        },
      );
      if (!focusables.length) {
        return;
      }

      var first = focusables[0];
      var last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    buildTarget();
    renderBest();
    roundActive = true;

    applyPickerMode();
  }


  /* Exported for the other modules. */
  App.initTypingGame = initTypingGame;
})(window.CapitalConvert = window.CapitalConvert || {});
