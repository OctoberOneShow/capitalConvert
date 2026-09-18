/* Reflex Tap - The reaction-time mini-game in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var reflexBestKey = "reflex-tap-best";
  function initReflexGame() {
    var pad = getElement("reflexPad");
    var padText = getElement("reflexPadText");
    var lastEl = getElement("reflexLast");
    var bestEl = getElement("reflexBest");
    var resultEl = getElement("reflexResult");
    var startBtn = getElement("reflexStartBtn");
    if (!pad || !padText || !lastEl || !bestEl || !resultEl || !startBtn) {
      return;
    }

    var state = "idle";
    var readyAt = 0;
    var waitId = null;

    function readBest() {
      var value = parseInt(localStorage.getItem(reflexBestKey), 10);
      return isNaN(value) ? 0 : value;
    }

    function renderBest() {
      var best = readBest();
      bestEl.textContent = best ? best + " ms" : "—";
    }

    function setPad(nextState, labelKey) {
      state = nextState;
      pad.classList.remove("is-waiting", "is-ready", "is-early");
      if (nextState === "waiting") {
        pad.classList.add("is-waiting");
      } else if (nextState === "ready") {
        pad.classList.add("is-ready");
      } else if (nextState === "early") {
        pad.classList.add("is-early");
      }
      padText.textContent = t(labelKey);
    }

    function resetRound() {
      window.clearTimeout(waitId);
      waitId = null;
      readyAt = 0;
      setPad("idle", "reflexPadIdle");
    }

    function startRound() {
      window.clearTimeout(waitId);
      lastEl.textContent = "—";
      resultEl.textContent = t("reflexWaiting");
      setPad("waiting", "reflexPadWaiting");

      var delay = 1200 + Math.floor(Math.random() * 2200);
      waitId = window.setTimeout(function () {
        waitId = null;
        readyAt = performance.now();
        setPad("ready", "reflexPadReady");
        resultEl.textContent = t("reflexPadReady");
      }, delay);
      pad.focus();
    }

    function tapPad() {
      if (state === "waiting") {
        window.clearTimeout(waitId);
        waitId = null;
        readyAt = 0;
        setPad("early", "reflexPadIdle");
        resultEl.textContent = t("reflexTooSoon");
        return;
      }

      if (state !== "ready") {
        startRound();
        return;
      }

      var reaction = Math.max(1, Math.round(performance.now() - readyAt));
      var previousBest = readBest();
      var isBest = !previousBest || reaction < previousBest;
      if (isBest) {
        localStorage.setItem(reflexBestKey, String(reaction));
      }

      lastEl.textContent = reaction + " ms";
      resultEl.textContent =
        t("reflexResult", { n: reaction }) + (isBest ? " " + t("newBest") : "");
      setPad("idle", "reflexPadIdle");
      renderBest();
      logAction(t("logReflex", { n: reaction }));

      if (isBest) {
        var rect = pad.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
      petNotifyGame(isBest);
    }

    startBtn.addEventListener("click", startRound);
    pad.addEventListener("click", tapPad);

    App.quietResetReflex = function () {
      if (state === "waiting" || state === "ready") {
        resetRound();
        resultEl.textContent = t("reflexPrompt");
      }
    };

    renderBest();
    resetRound();
  }


  /* Exported for the other modules. */
  App.initReflexGame = initReflexGame;
})(window.CapitalConvert = window.CapitalConvert || {});
