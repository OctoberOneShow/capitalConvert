/* Twenty-One Parlor - the blackjack mini-game in the shared game drawer. */
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
  var bjSuits = ["\u2660", "\u2665", "\u2666", "\u2663"];
  var bjFaces = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  /* Every table keeps the same shape - a top bet a quarter of the bankroll and
   * a target half again above it - so one sits at the table for about the same
   * number of hands whatever the stakes. Deeper shoes take the counting edge
   * away, so their star bands tighten instead of the session growing. */
  var bjTables = [
    { id: "b1", labelKey: "bjT1", decks: 1, start: 100, bets: [5, 10, 25], target: 150, starHands: [8, 16, 32] },
    { id: "b2", labelKey: "bjT2", decks: 2, start: 200, bets: [10, 20, 50], target: 300, starHands: [9, 18, 36] },
    { id: "b3", labelKey: "bjT3", decks: 4, start: 400, bets: [25, 50, 100], target: 600, starHands: [10, 20, 40] },
    { id: "b4", labelKey: "bjT4", decks: 6, start: 800, bets: [50, 100, 200], target: 1200, starHands: [11, 22, 44] },
    { id: "b5", labelKey: "bjT5", decks: 8, start: 1600, bets: [100, 200, 400], target: 2400, starHands: [12, 24, 48] },
  ];

  function bjShoe(decks) {
    var cards = [];
    var deck;
    for (deck = 0; deck < decks; deck += 1) {
      bjSuits.forEach(function (suit) {
        bjFaces.forEach(function (face) {
          cards.push({ suit: suit, face: face });
        });
      });
    }
    for (var index = cards.length - 1; index > 0; index -= 1) {
      var swap = Math.floor(Math.random() * (index + 1));
      var held = cards[index];
      cards[index] = cards[swap];
      cards[swap] = held;
    }
    return cards;
  }

  function bjValue(face) {
    if (face === "A") {
      return 11;
    }
    if (face === "K" || face === "Q" || face === "J" || face === "10") {
      return 10;
    }
    return parseInt(face, 10);
  }

  /* Aces drop to one until the hand survives, which is what makes a soft
   * total. Nothing else about the hand changes. */
  function bjCount(cards) {
    var total = 0;
    var aces = 0;
    cards.forEach(function (card) {
      total += bjValue(card.face);
      if (card.face === "A") {
        aces += 1;
      }
    });
    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }
    return { total: total, soft: aces > 0 };
  }

  function bjNatural(cards) {
    return cards.length === 2 && bjCount(cards).total === 21;
  }

  function initBlackjackGame() {
    var boardEl = getElement("bjBoard");
    var chipsEl = getElement("bjChipsStat");
    var handEl = getElement("bjHandStat");
    var betEl = getElement("bjBetStat");
    var resultEl = getElement("bjResult");
    var dealBtn = getElement("bjDealBtn");
    var hitBtn = getElement("bjHitBtn");
    var standBtn = getElement("bjStandBtn");
    var doubleBtn = getElement("bjDoubleBtn");
    var bestEl = getElement("bjBest");
    var tableEl = getElement("bjTableSel");
    var betEl2 = getElement("bjBetSel");
    if (
      !boardEl ||
      !chipsEl ||
      !handEl ||
      !betEl ||
      !resultEl ||
      !dealBtn ||
      !hitBtn ||
      !standBtn ||
      !doubleBtn ||
      !bestEl ||
      !tableEl ||
      !betEl2
    ) {
      return;
    }

    var campaign = createCampaign({ key: "blackjack-campaign", levels: bjTables });
    var table = bjTables[campaign.indexOf(campaign.nextLevelId())];
    var shoe = [];
    var player = [];
    var dealer = [];
    var chips = table.start;
    var bet = 10;
    var hands = 0;
    var stage = "idle";

    function draw() {
      if (!shoe.length) {
        shoe = bjShoe(table.decks);
      }
      return shoe.pop();
    }

    function renderCounts() {
      chipsEl.textContent = String(chips);
      handEl.textContent = player.length ? String(bjCount(player).total) : "0";
      betEl.textContent = String(bet);
    }

    function cardNode(card, hidden) {
      var node = document.createElement("span");
      node.className =
        "bj-card" + (card && (card.suit === "\u2665" || card.suit === "\u2666") ? " is-red" : "");
      node.textContent = hidden ? "\u25A0" : card.face + card.suit;
      node.setAttribute(
        "aria-label",
        hidden ? t("bjHiddenCard") : t("bjCard", { face: card.face, suit: card.suit }),
      );
      return node;
    }

    function renderBoard() {
      boardEl.textContent = "";
      var rowYou = document.createElement("div");
      rowYou.className = "bj-row";
      var youLabel = document.createElement("span");
      youLabel.className = "bj-row-label";
      youLabel.textContent = t("bjYouRow");
      rowYou.appendChild(youLabel);
      player.forEach(function (card) {
        rowYou.appendChild(cardNode(card, false));
      });
      var rowHouse = document.createElement("div");
      rowHouse.className = "bj-row";
      var houseLabel = document.createElement("span");
      houseLabel.className = "bj-row-label";
      houseLabel.textContent = t("bjHouseRow");
      rowHouse.appendChild(houseLabel);
      dealer.forEach(function (card, index) {
        /* the house's second card stays face down until the hand settles */
        rowHouse.appendChild(cardNode(card, index === 1 && stage === "player"));
      });
      boardEl.appendChild(rowYou);
      boardEl.appendChild(rowHouse);
      renderCounts();
    }

    function setButtons() {
      dealBtn.disabled = stage === "player";
      hitBtn.disabled = stage !== "player";
      standBtn.disabled = stage !== "player";
      doubleBtn.disabled = stage !== "player" || player.length !== 2 || chips < bet * 2;
    }

    function refreshTable() {
      fillCampaignPicker(
        tableEl,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      tableEl.value = table.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function settle() {
      stage = "settled";
      var you = bjCount(player).total;
      var house = bjCount(dealer).total;
      var youNatural = bjNatural(player);
      var houseNatural = bjNatural(dealer);
      var won = 0;
      var line;
      if (you > 21) {
        won = -bet;
        line = t("bjBust", { n: bet });
      } else if (youNatural && !houseNatural) {
        won = Math.round(bet * 1.5);
        line = t("bjBlackjack", { n: won });
      } else if (houseNatural && !youNatural) {
        won = -bet;
        line = t("bjHouseBlackjack", { n: bet });
      } else if (house > 21) {
        won = bet;
        line = t("bjHouseBust", { n: bet });
      } else if (you > house) {
        won = bet;
        line = t("bjYouWin", { you: you, house: house, n: bet });
      } else if (you < house) {
        won = -bet;
        line = t("bjYouLose", { you: you, house: house, n: bet });
      } else {
        line = t("bjPush");
      }
      chips += won;
      renderBoard();
      if (chips >= table.target) {
        clearTable(line);
        return;
      }
      if (chips < table.bets[0]) {
        /* Without a restake the table would sit there with no bet the player is
         * still allowed to cover. */
        chips = table.start;
        stage = "idle";
        renderBoard();
        resultEl.textContent =
          line + " " + t("bjBroke", { name: t(table.labelKey), n: table.start });
        logAction(t("logBlackjack", { n: "\u2014" }));
        petNotifyGame(false);
        setButtons();
        return;
      }
      resultEl.textContent = line;
      logAction(t("logBlackjack", { n: chips }));
      setButtons();
    }

    function clearTable(line) {
      var starsWon = starsFor(hands, table.starHands, "low");
      var outcome = campaign.record(table.id, {
        stars: starsWon,
        best: hands,
        better: "low",
      });
      var message =
        (line ? line + " " : "") +
        t("bjTableCleared", { n: hands, target: table.target, s: starsWon }) +
        (outcome.isBest ? " " + t("newBest") : "");
      if (outcome.unlockedNext) {
        message += " " + t("bjNextTable");
      } else if (campaign.clearedCount() === bjTables.length) {
        message += " " + t("bjAllTables");
      }
      resultEl.textContent = message;
      logAction(t("logBlackjack", { n: chips }));
      var rect = dealBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      stage = "idle";
      setButtons();
      refreshTable();
      /* the banked stack has to leave the table, or the next hand clears it
       * again on the spot */
      var advance = bjTables[campaign.indexOf(campaign.nextLevelId())];
      loadTable(advance || table);
      resultEl.textContent = message;
    }

    /* The house plays out in one go: no timers, so nothing can outlive the
     * panel. */
    function housePlay() {
      while (bjCount(dealer).total < 17) {
        dealer.push(draw());
      }
      settle();
    }

    function deal() {
      var chosen = parseInt(betEl2.value, 10);
      if (!(chosen > 0) || chosen > chips) {
        resultEl.textContent = t("bjBadBet");
        return;
      }
      bet = chosen;
      player = [draw(), draw()];
      dealer = [draw(), draw()];
      hands += 1;
      stage = "player";
      renderBoard();
      if (bjNatural(player) || bjNatural(dealer)) {
        settle();
        return;
      }
      resultEl.textContent = t("bjYourMove", { total: bjCount(player).total });
      setButtons();
    }

    function hit() {
      if (stage !== "player") {
        return;
      }
      player.push(draw());
      renderBoard();
      if (bjCount(player).total > 21) {
        settle();
        return;
      }
      resultEl.textContent = t("bjYourMove", { total: bjCount(player).total });
      setButtons();
    }

    function stand() {
      if (stage !== "player") {
        return;
      }
      renderBoard();
      housePlay();
    }

    function doubleDown() {
      if (stage !== "player" || player.length !== 2 || chips < bet * 2) {
        return;
      }
      bet *= 2;
      player.push(draw());
      renderBoard();
      if (bjCount(player).total > 21) {
        settle();
        return;
      }
      housePlay();
    }

    function loadTable(tableDef) {
      table = tableDef || table;
      shoe = bjShoe(table.decks);
      player = [];
      dealer = [];
      chips = table.start;
      hands = 0;
      bet = table.bets[1];
      stage = "idle";
      betEl2.textContent = "";
      table.bets.forEach(function (amount) {
        var option = document.createElement("option");
        option.value = String(amount);
        option.textContent = String(amount);
        betEl2.appendChild(option);
      });
      betEl2.value = String(bet);
      renderBoard();
      refreshTable();
      setButtons();
      resultEl.textContent = t("bjPrompt", {
        name: t(table.labelKey),
        target: table.target,
        decks: table.decks,
        start: table.start,
      });
    }

    dealBtn.addEventListener("click", deal);
    hitBtn.addEventListener("click", hit);
    standBtn.addEventListener("click", stand);
    doubleBtn.addEventListener("click", doubleDown);
    tableEl.addEventListener("change", function () {
      var index = campaign.indexOf(tableEl.value);
      if (index >= 0 && campaign.isUnlocked(tableEl.value)) {
        loadTable(bjTables[index]);
      }
    });

    loadTable(table);
  }


  /* Exported for the other modules. */
  App.blackjackCount = bjCount;
  App.blackjackNatural = bjNatural;
  App.initBlackjackGame = initBlackjackGame;
})(window.CapitalConvert = window.CapitalConvert || {});
