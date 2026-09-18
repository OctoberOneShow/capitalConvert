/* Ember Dice - The push-your-luck campaign in the shared game drawer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var getElement = App.getElement;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var diceTurns = 10;
  /* Unicode die faces, index 0 unused. */
  var diceFaces = [
    "",
    "\u2680",
    "\u2681",
    "\u2682",
    "\u2683",
    "\u2684",
    "\u2685",
  ];
  /* Each table is a house rule, not a bigger number: more burn faces,
   * a banking tax, or two dice whose risk you share. */
  var diceTables = [
    { id: "t1", labelKey: "diceTable1", ruleKey: "diceRule1", target: 40, burn: [1], tax: 0, pairs: false },
    { id: "t2", labelKey: "diceTable2", ruleKey: "diceRule2", target: 55, burn: [1, 6], tax: 0, pairs: false },
    { id: "t3", labelKey: "diceTable3", ruleKey: "diceRule3", target: 70, burn: [1], tax: 5, pairs: false },
    { id: "t4", labelKey: "diceTable4", ruleKey: "diceRule4", target: 90, burn: [1], tax: 0, pairs: true },
    { id: "t5", labelKey: "diceTable5", ruleKey: "diceRule5", target: 120, burn: [1, 6], tax: 5, pairs: true },
  ];

  function initEmberDiceGame() {
    var turnEl = getElement("diceTurn");
    var stakeEl = getElement("diceStake");
    var bankEl = getElement("diceBank");
    var pad = getElement("dicePad");
    var faceEl = getElement("diceFace");
    var rollBtn = getElement("diceRollBtn");
    var bankBtn = getElement("diceBankBtn");
    var resultEl = getElement("diceResult");
    var startBtn = getElement("diceStartBtn");
    var bestEl = getElement("diceBest");
    var selectEl = getElement("diceTableSel");
    if (
      !turnEl ||
      !stakeEl ||
      !bankEl ||
      !pad ||
      !faceEl ||
      !rollBtn ||
      !bankBtn ||
      !resultEl ||
      !startBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var campaign = createCampaign({ key: "ember-campaign", levels: diceTables });
    var table = diceTables[0];
    var running = false;
    var turn = 1;
    var stake = 0;
    var bank = 0;

    function refreshPicker() {
      fillCampaignPicker(
        selectEl,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      selectEl.value = table.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function renderHud() {
      turnEl.textContent = Math.min(turn, diceTurns) + "/" + diceTurns;
      stakeEl.textContent = String(stake);
      bankEl.textContent = bank + "/" + table.target;
      rollBtn.disabled = !running;
      bankBtn.disabled = !running || stake <= 0;
    }

    function rollFace() {
      return 1 + Math.floor(Math.random() * 6);
    }

    function tableCleared() {
      running = false;
      var spare = diceTurns - turn;
      var starsWon = spare >= 3 ? 3 : spare >= 1 ? 2 : 1;
      var outcome = campaign.record(table.id, {
        stars: starsWon,
        best: bank,
        better: "high",
      });
      var message = t("diceCleared", {
        name: t(table.labelKey),
        s: starsWon,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("diceNextTable");
      } else if (campaign.clearedCount() === diceTables.length) {
        message += " " + t("diceCampaignDone");
      }
      resultEl.textContent = message;
      logAction(t("logDice", { n: bank }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || table.id;
      loadTable(diceTables[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
      renderHud();
    }

    function endRun() {
      running = false;
      resultEl.textContent = t("diceMissed", { n: bank, t: table.target });
      logAction(t("logDice", { n: bank }));
      petNotifyGame(false);
      renderHud();
    }

    function nextTurn() {
      turn += 1;
      if (turn > diceTurns) {
        endRun();
        return;
      }
      renderHud();
    }

    function roll() {
      if (!running) {
        return;
      }
      var faces = table.pairs ? [rollFace(), rollFace()] : [rollFace()];
      var burned = faces.some(function (face) {
        return table.burn.indexOf(face) !== -1;
      });
      faceEl.textContent = diceFaces[faces[0]];
      pad.classList.toggle("is-ember", burned);

      if (burned) {
        stake = 0;
        resultEl.textContent = t("diceBurn");
        renderHud();
        nextTurn();
        return;
      }

      var gained = faces.reduce(function (sum, face) {
        return sum + face;
      }, 0);
      stake += gained;
      resultEl.textContent = t("diceRolled", {
        face: faces.join(" + "),
        s: stake,
      });
      renderHud();
    }

    function bankStake() {
      if (!running || stake <= 0) {
        return;
      }
      var net = Math.max(0, stake - table.tax);
      bank += net;
      resultEl.textContent =
        t("diceBanked", { n: net }) +
        (table.tax > 0 && stake > net ? " " + t("diceTaxed", { t: table.tax }) : "");
      stake = 0;
      renderHud();
      if (bank >= table.target) {
        tableCleared();
        return;
      }
      nextTurn();
    }

    function loadTable(tableDef) {
      running = false;
      table = tableDef;
      turn = 1;
      stake = 0;
      bank = 0;
      faceEl.textContent = diceFaces[1];
      pad.classList.remove("is-ember");
      renderHud();
      refreshPicker();
      resultEl.textContent = t(table.ruleKey, { t: table.target });
    }

    function startRun() {
      loadTable(table);
      running = true;
      renderHud();
      rollBtn.focus();
    }

    pad.addEventListener("click", roll);
    rollBtn.addEventListener("click", roll);
    bankBtn.addEventListener("click", bankStake);
    startBtn.addEventListener("click", startRun);

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadTable(diceTables[index]);
      }
    });

    loadTable(diceTables[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initEmberDiceGame = initEmberDiceGame;
})(window.CapitalConvert = window.CapitalConvert || {});
