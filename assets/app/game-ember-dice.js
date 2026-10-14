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
   * a banking tax, a bank that pays you instead, or two dice whose risk
   * you share. Rows are DP-measured over (turns left, bank, stake) with
   * optimal stopping: the three-star line is clearing inside seven of the
   * ten turns, and every rung from the second upward is tuned to land that
   * line between 15% and 50% while staying clearable inside ten. Rung 1 is
   * deliberately outside that window: measured with a naive bank-when-ahead
   * player it clears for 90% and three-stars for 62-76%, which is what the
   * rung that teaches the bank is for. Two burn faces on two dice
   * only ever pays at all once a bank also carries a bounty, because a burn
   * lands on 5 of 9 rolls; so the bounties, not the targets, do the lifting.
   * ruleKey travels with the rule: diceRule2b..7b ship here because i18n.js
   * owns diceRule1..7 and addStrings never overrides a shared key. */
  var diceTables = [
    { id: "t1", labelKey: "diceTable1", ruleKey: "diceRule1", target: 40, burn: [1], tax: 0, pairs: false },
    { id: "t2", labelKey: "diceTable2", ruleKey: "diceRule2b", target: 65, burn: [1, 6], tax: -8, pairs: false },
    { id: "t3", labelKey: "diceTable3", ruleKey: "diceRule3", target: 70, burn: [1], tax: 5, pairs: false },
    { id: "t4", labelKey: "diceTable4", ruleKey: "diceRule4", target: 90, burn: [1], tax: 0, pairs: true },
    { id: "t5", labelKey: "diceTable5", ruleKey: "diceRule5b", target: 100, burn: [1, 6], tax: -20, pairs: true },
    { id: "t6", labelKey: "diceTable6", ruleKey: "diceRule6b", target: 108, burn: [1], tax: -8, pairs: true },
    { id: "t7", labelKey: "diceTable7", ruleKey: "diceRule7b", target: 120, burn: [1, 6], tax: -30, pairs: true },
    /* A negative tax is the same bank maths paying you instead of the house:
     * the bounty only lands on a bank, so it is unbankable points. Raising the
     * bounty is also the only way this engine can lift a target and keep the
     * three-star line (clear with three turns spare) reachable: a bigger
     * bounty needs fewer banks, so fewer rolls have to survive. */
    { id: "t8", labelKey: "diceTable8", ruleKey: "diceRule8", target: 125, burn: [1], tax: -12, pairs: false },
    { id: "t9", labelKey: "diceTable9", ruleKey: "diceRule9", target: 130, burn: [1, 2], tax: -20, pairs: false },
    { id: "t10", labelKey: "diceTable10", ruleKey: "diceRule10", target: 170, burn: [1], tax: -24, pairs: true },
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
        message += " " + t("diceAllTables", { n: diceTables.length });
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
      var burnedBy;
      faces.forEach(function (face) {
        if (burnedBy === undefined && table.burn.indexOf(face) !== -1) {
          burnedBy = face;
        }
      });
      faceEl.textContent = diceFaces[faces[0]];
      pad.classList.toggle("is-ember", burnedBy !== undefined);

      if (burnedBy !== undefined) {
        stake = 0;
        resultEl.textContent =
          burnedBy === 1 ? t("diceBurn") : t("diceBurns", { f: burnedBy });
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


  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so a rung that is re-tuned ships its own b-suffixed
   * rule line here instead of leaving the shared one describing a hazard it no
   * longer has. Rungs 3, 4 and 8-10 still read the shared/matched wording.
   * diceAllTables replaces the stale hard-coded "five tables" line with one
   * that reads the ladder length. */
  App.addStrings({
    en: {
      /* The four retuned rungs, in ladder order: each line states the faces
       * that burn, the dice it rolls and what a bank costs or pays, because
       * the ladder's shares are only honest if the rule text matches fields. */
      "diceRule2b": "Twin Embers: 1 AND 6 burn the stake, and every bank pays you an extra 8. Target {t}.",
      "diceRule5b": "Gambler's Table: two dice add together, a 1 or a 6 on either die burns the stake, and every bank pays you an extra 20. Target {t}.",
      "diceRule6b": "High Stakes: two dice add together, any 1 burns the stake, and every bank pays you an extra 8. Target {t}.",
      "diceRule7b": "The Abyss: two dice add together, a 1 or a 6 on either die burns the stake, and every bank pays you an extra 30. Target {t}.",
      "diceTable8": "The Bounty Board",
      "diceTable9": "Cold Deuce",
      "diceTable10": "Ashfall Twins",
      "diceRule8": "The Bounty Board: a bank pays 12 bounty embers, but only a bank collects. Target {t}.",
      "diceRule9": "Cold Deuce: 2 burns right alongside 1, and the bounty climbs to 20. Target {t}.",
      "diceRule10": "Ashfall Twins: two dice, any 1 burns them both, and each bank pays a 24 bounty. Target {t}.",
      "diceBurns": "A {f}! The stake burns to ash.",
      "diceAllTables": " All {n} tables are yours!",
    },
    zh: {
      "diceRule2b": "双火桌：1 和 6 都会烧光赌注，每次「收下」额外给 8。目标 {t}。",
      "diceRule5b": "赌徒桌：两颗骰子相加，任何一颗掷出 1 或 6 就烧光赌注，每次「收下」额外给 20。目标 {t}。",
      "diceRule6b": "豪赌局：两颗骰子相加，任何 1 点都会烧光赌注，每次「收下」额外给 8。目标 {t}。",
      "diceRule7b": "深渊局：两颗骰子相加，任何一颗掷出 1 或 6 就烧光赌注，每次「收下」额外给 30。目标 {t}。",
      "diceTable8": "赏金桌",
      "diceTable9": "冷二桌",
      "diceTable10": "灰烬双骰",
      "diceRule8": "赏金桌：「收下」额外给 12 簇赏金，只有收下才拿得到。目标 {t}。",
      "diceRule9": "冷二桌：2 点和 1 点一样烧注，赏金涨到 20。目标 {t}。",
      "diceRule10": "灰烬双骰：两颗骰子，任何 1 点全烧，每次收下赏 24。目标 {t}。",
      "diceBurns": "掷出 {f}！赌注化为灰烬。",
      "diceAllTables": " {n} 张牌桌都是你的了！",
    },
  });

  /* Exported for the other modules. */
  App.initEmberDiceGame = initEmberDiceGame;
})(window.CapitalConvert = window.CapitalConvert || {});
