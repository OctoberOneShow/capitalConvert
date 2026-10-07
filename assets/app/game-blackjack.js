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

  /* Presentation beats, in milliseconds: the hole card turns after the deal has
   * landed, the house answer follows the turn, and a settled hand is applauded
   * once the reveal has had its moment. All of it is skipped by motion-off. */
  var BJ_DEAL_REVEAL_MS = 700;
  var BJ_REVEAL_MS = 380;
  var BJ_HOUSE_MS = 640;
  var BJ_SETTLE_BEAT_MS = 1250;
  var BJ_FELT_HUE = 42;

  function noop() {}

  function bjMotionOff() {
    return App.isMotionOff
      ? App.isMotionOff()
      : document.documentElement.getAttribute("data-motion") === "off";
  }

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

    var panelEl = boardEl.parentNode;
    var art = App.art;
    var fx = App.fx || {
      pop: noop, shake: noop, ring: noop, burst: noop, floatText: noop,
      stagger: noop, countUp: noop, sweep: noop, jolt: noop, flash: noop,
      ceremony: noop, flipCard: noop, cardEl: null,
    };
    var playSfx = App.playSfx || noop;
    /* Cards need the two-face flip host; without the art layer the module
     * falls back to glyph text so the table stays playable. */
    var canArt = !!(art && art.icon && art.pattern);
    var canDraw = !!(canArt && fx.cardEl && fx.flipCard);

    var campaign = createCampaign({ key: "blackjack-campaign", levels: bjTables });
    var table = bjTables[campaign.indexOf(campaign.nextLevelId())];
    var shoe = [];
    var player = [];
    var dealer = [];
    var chips = table.start;
    var bet = 10;
    var hands = 0;
    var stage = "idle";
    /* busy locks the buttons while the house reveal is on stage; the hand's
     * math still runs on the exact same code, only later. */
    var busy = false;
    var pendingFn = null;
    var fxTimers = [];
    var roundId = 0;
    /* Cards already painted, so a repaint never replays a turn: face-up history
     * in `seen`, face-down history in `downSeen` (that is the hole card). */
    var seen = [];
    var downSeen = [];
    var holeFlipEl = null;
    var potRowEl = null;
    var lastPotBet = 0;
    var shownChips = 0;
    var shownHand = 0;
    var shownBet = 0;
    var lastYouTotal = -1;
    var lastHouseTotal = -1;
    var revealDelay = BJ_REVEAL_MS;
    var feltLayer = null;
    var shoeEl = null;
    var hue = BJ_FELT_HUE;

    function later(fn, ms) {
      var round = roundId;
      var id = window.setTimeout(function () {
        var at = fxTimers.indexOf(id);
        if (at >= 0) {
          fxTimers.splice(at, 1);
        }
        if (round === roundId) {
          fn();
        }
      }, ms);
      fxTimers.push(id);
      return id;
    }

    /* Some delayed work mutates state (the house answer, the table advance).
     * Visual timers may be dropped; these may not - the quiet-reset hook runs
     * them synchronously so a hidden panel can never strand a half hand. */
    function laterCritical(fn, ms) {
      pendingFn = fn;
      later(function () {
        if (pendingFn === fn) {
          pendingFn = null;
          fn();
        }
      }, ms);
    }

    function clearFxTimers() {
      fxTimers.forEach(function (id) {
        window.clearTimeout(id);
      });
      fxTimers = [];
      pendingFn = null;
    }

    function draw() {
      if (!shoe.length) {
        shoe = bjShoe(table.decks);
      }
      return shoe.pop();
    }

    function renderCounts() {
      fx.countUp(chipsEl, shownChips, chips);
      shownChips = chips;
      var total = player.length ? bjCount(player).total : 0;
      fx.countUp(handEl, shownHand, total);
      shownHand = total;
      fx.countUp(betEl, shownBet, bet);
      shownBet = bet;
    }

    /* ------------------------------------------------------------ drawing */

    function suitClass(card) {
      return card.suit === "\u2665" || card.suit === "\u2666" ? " is-red" : "";
    }

    /* A paper face from corners and a centre pip. The ink colours are fixed
     * because a playing card is the same object under both themes. */
    function cardFaceEl(card) {
      var face = document.createElement("span");
      face.className = "bj-face" + suitClass(card);
      var court = card.face === "J" || card.face === "Q" || card.face === "K";
      var mid = document.createElement("span");
      mid.className = "bj-face-mid";
      mid.textContent = court ? card.face : card.suit;
      face.appendChild(mid);
      if (court) {
        var under = document.createElement("span");
        under.className = "bj-face-under";
        under.textContent = card.suit;
        face.appendChild(under);
      }
      var corner = document.createElement("span");
      corner.className = "bj-corner";
      var rank = document.createElement("b");
      rank.textContent = card.face;
      var suit = document.createElement("i");
      suit.textContent = card.suit;
      corner.appendChild(rank);
      corner.appendChild(suit);
      face.appendChild(corner);
      var low = corner.cloneNode(true);
      low.className = "bj-corner is-low";
      face.appendChild(low);
      return face;
    }

    function cardNode(card, hidden) {
      var node = document.createElement("span");
      node.className = "bj-card";
      node.setAttribute(
        "aria-label",
        hidden ? t("bjHiddenCard") : t("bjCard", { face: card.face, suit: card.suit }),
      );
      if (!canDraw) {
        node.className += suitClass(card);
        node.textContent = hidden ? "\u25A0" : card.face + card.suit;
        return { el: node, flip: null };
      }
      var back = document.createElement("span");
      back.className = "bj-card-back";
      var crest = document.createElement("span");
      crest.className = "bj-back-crest";
      crest.appendChild(art.icon("card-back", { hue: hue, sat: 56, tone: "deep" }));
      back.appendChild(crest);
      var flip = fx.cardEl(back, cardFaceEl(card));
      flip.className = flip.className + " bj-flip";
      node.appendChild(flip);
      return { el: node, flip: flip };
    }

    /* Paint one card. A card the table has not shown yet slides in from the
     * shoe and turns over in 3D; the hole card, already lying face down, turns
     * in place when the hand settles. The delay is the stagger offset for a
     * fresh deal and the absolute beat for a reveal. */
    function paintCard(card, hidden, delay, isHole) {
      var parts = cardNode(card, hidden);
      if (hidden) {
        if (isHole && canDraw) {
          holeFlipEl = parts.flip;
        }
        if (downSeen.indexOf(card) === -1) {
          downSeen.push(card);
        }
        return parts.el;
      }
      if (!canDraw || seen.indexOf(card) >= 0) {
        if (canDraw) {
          fx.flipCard(parts.flip, true);
        }
        if (seen.indexOf(card) === -1) {
          seen.push(card);
        }
        return parts.el;
      }
      var at = downSeen.indexOf(card);
      if (at >= 0) {
        downSeen.splice(at, 1);
        seen.push(card);
        if (bjMotionOff()) {
          fx.flipCard(parts.flip, true);
        } else {
          later(function () {
            fx.flipCard(parts.flip);
            playSfx("flip");
          }, delay);
        }
        return parts.el;
      }
      seen.push(card);
      if (bjMotionOff()) {
        fx.flipCard(parts.flip, true);
        return parts.el;
      }
      parts.el.classList.add("is-dealing");
      if (delay) {
        parts.el.style.animationDelay = delay + "ms";
      }
      later(function () {
        fx.flipCard(parts.flip);
      }, 300 + (delay || 0));
      return parts.el;
    }

    function rowLabel(text) {
      var label = document.createElement("span");
      label.className = "bj-row-label";
      label.textContent = text;
      return label;
    }

    function buildRow(cards, isHouse, slots, pops) {
      var row = document.createElement("div");
      row.className = "bj-row";
      row.appendChild(rowLabel(isHouse ? t("bjHouseRow") : t("bjYouRow")));
      var fresh = 0;
      cards.forEach(function (card, index) {
        /* the house's second card stays face down until the hand settles */
        var hidden = isHouse && index === 1 && stage === "player";
        var delay = 0;
        if (!hidden && canDraw && !bjMotionOff()) {
          if (seen.indexOf(card) === -1 && downSeen.indexOf(card) === -1) {
            delay = fresh * (isHouse ? 140 : 110);
            fresh += 1;
          } else if (downSeen.indexOf(card) >= 0) {
            /* the hole card turns only after the deal has had its beat */
            delay = revealDelay;
          }
        }
        row.appendChild(paintCard(card, hidden, delay, isHouse && index === 1));
      });
      if (!cards.length) {
        for (var i = 0; i < 2; i += 1) {
          var slot = document.createElement("span");
          slot.className = "bj-slot";
          slot.setAttribute("aria-hidden", "true");
          row.appendChild(slot);
          slots.push(slot);
        }
      }
      if (cards.length && (!isHouse || stage !== "player")) {
        var total = bjCount(cards).total;
        var badge = document.createElement("span");
        badge.className =
          "bj-total" + (total > 21 ? " is-bust" : "") + (bjNatural(cards) ? " is-nat" : "");
        badge.textContent = String(total);
        var previous = isHouse ? lastHouseTotal : lastYouTotal;
        if (previous >= 0 && previous !== total) {
          pops.push(badge);
        }
        if (isHouse) {
          lastHouseTotal = total;
        } else {
          lastYouTotal = total;
        }
        row.appendChild(badge);
      }
      return row;
    }

    function buildPot() {
      var row = document.createElement("div");
      row.className = "bj-pot-row";
      var spot = document.createElement("span");
      spot.className = "bj-spot";
      spot.setAttribute("aria-hidden", "true");
      row.appendChild(spot);
      var pot = document.createElement("span");
      pot.className = "bj-pot";
      pot.setAttribute("aria-hidden", "true");
      var potBet =
        stage === "idle" && !player.length ? parseInt(betEl2.value, 10) || bet : bet;
      var count = Math.max(1, Math.min(5, Math.round(potBet / (table.bets[0] * 2))));
      for (var i = 0; i < count; i += 1) {
        var chip = document.createElement("span");
        chip.className = "bj-chip";
        chip.style.setProperty("--i", String(i));
        pot.appendChild(chip);
      }
      if (potBet !== lastPotBet) {
        pot.classList.add("is-new");
        lastPotBet = potBet;
      }
      row.appendChild(pot);
      potRowEl = row;
      return row;
    }

    function renderBoard(opts) {
      boardEl.textContent = "";
      holeFlipEl = null;
      potRowEl = null;
      if (feltLayer) {
        boardEl.appendChild(feltLayer);
      }
      if (shoeEl) {
        boardEl.appendChild(shoeEl);
      }
      var slots = [];
      var pops = [];
      var rowHouse = buildRow(dealer, true, slots, pops);
      var rowYou = buildRow(player, false, slots, pops);
      boardEl.appendChild(rowHouse);
      boardEl.appendChild(buildPot());
      boardEl.appendChild(rowYou);
      if (opts && opts.staggerSlots && slots.length && !bjMotionOff()) {
        fx.stagger(slots, { kind: "drop", step: 90, ms: 340 });
      }
      pops.forEach(function (badge) {
        fx.pop(badge, { scale: 1.22, ms: 260 });
      });
      renderCounts();
    }

    function setButtons() {
      dealBtn.disabled = stage === "player" || busy;
      hitBtn.disabled = stage !== "player" || busy;
      standBtn.disabled = stage !== "player" || busy;
      doubleBtn.disabled = stage !== "player" || player.length !== 2 || chips < bet * 2 || busy;
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

    /* ------------------------------------------------------------- beats */

    /* The applause runs after the reveal; a quick player who has already dealt
     * the next hand simply skips it, which is the polite outcome. */
    function settleBeat(won, line, bust, natural, houseNatural) {
      var tone = null;
      var stars = 0;
      if (bust || houseNatural) {
        tone = "lose";
      } else if (natural) {
        tone = "win";
        stars = 3;
      } else if (won === 0) {
        tone = "clear";
      }
      var wait = bjMotionOff() ? 0 : BJ_SETTLE_BEAT_MS;
      if (tone) {
        later(function () {
          fx.ceremony(panelEl, { tone: tone, title: line, stars: stars });
        }, wait);
        return;
      }
      later(function () {
        if (potRowEl) {
          fx.floatText(potRowEl, (won > 0 ? "+" : "") + won, { kind: won > 0 ? "good" : "bad" });
        }
        playSfx(won > 0 ? "coin" : "miss");
      }, wait);
    }

    function settle(naturalDeal) {
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
      revealDelay = naturalDeal ? BJ_DEAL_REVEAL_MS : BJ_REVEAL_MS;
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
        resultEl.className = "game-result is-lose";
        resultEl.textContent =
          line + " " + t("bjBroke", { name: t(table.labelKey), n: table.start });
        logAction(t("logBlackjack", { n: "\u2014" }));
        petNotifyGame(false);
        setButtons();
        later(function () {
          fx.ceremony(panelEl, {
            tone: "lose",
            title: t(table.labelKey),
            lines: [line],
            stars: 0,
          });
        }, bjMotionOff() ? 0 : 900);
        return;
      }
      resultEl.className = "game-result" + (won > 0 ? " is-win" : won < 0 ? " is-lose" : " is-push");
      resultEl.textContent = line;
      logAction(t("logBlackjack", { n: chips }));
      setButtons();
      settleBeat(won, line, you > 21, youNatural && !houseNatural, houseNatural && !youNatural);
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
      resultEl.className = "game-result is-win";
      resultEl.textContent = message;
      logAction(t("logBlackjack", { n: chips }));
      petNotifyGame(outcome.isBest || outcome.firstClear);
      stage = "idle";
      /* the felt stays dressed until the applause ends, so the winning hand is
       * what the player sees behind the ceremony */
      busy = true;
      setButtons();
      refreshTable();
      /* the banked stack has to leave the table, or the next hand clears it
       * again on the spot */
      var advance = bjTables[campaign.indexOf(campaign.nextLevelId())];
      var applause = function () {
        var rect = dealBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        fx.ceremony(panelEl, {
          tone: "win",
          title: t(table.labelKey),
          lines: [message],
          stars: starsWon,
        });
        loadTable(advance || table);
        resultEl.textContent = message;
      };
      if (bjMotionOff()) {
        applause();
        return;
      }
      laterCritical(applause, BJ_SETTLE_BEAT_MS);
    }

    /* The house answer keeps its synchronous math; only its entrance is staged,
     * so nothing can outlive the panel even here (pendingFn covers the gap). */
    function housePlay() {
      while (bjCount(dealer).total < 17) {
        dealer.push(draw());
      }
      settle(false);
    }

    function deal() {
      if (busy) {
        return;
      }
      var chosen = parseInt(betEl2.value, 10);
      if (!(chosen > 0) || chosen > chips) {
        resultEl.textContent = t("bjBadBet");
        return;
      }
      clearFxTimers();
      bet = chosen;
      player = [draw(), draw()];
      dealer = [draw(), draw()];
      hands += 1;
      stage = "player";
      seen = [];
      downSeen = [];
      lastPotBet = 0;
      lastYouTotal = -1;
      lastHouseTotal = -1;
      playSfx("flip");
      if (bjNatural(player) || bjNatural(dealer)) {
        /* one render: the cards deal in, the hole card waits face down and
         * turns after them */
        downSeen.push(dealer[1]);
        settle(true);
        return;
      }
      renderBoard();
      resultEl.className = "game-result";
      resultEl.textContent = t("bjYourMove", { total: bjCount(player).total });
      setButtons();
    }

    function hit() {
      if (busy || stage !== "player") {
        return;
      }
      player.push(draw());
      if (bjCount(player).total > 21) {
        /* one render so the bust card lands before the hole card turns */
        playSfx("flip");
        settle(false);
        return;
      }
      renderBoard();
      playSfx("flip");
      resultEl.textContent = t("bjYourMove", { total: bjCount(player).total });
      setButtons();
    }

    /* Turn the hole card where it lies - the house reveal, before any draw. */
    function revealHole() {
      var card = dealer[1];
      if (!card) {
        return;
      }
      var at = downSeen.indexOf(card);
      if (at >= 0) {
        downSeen.splice(at, 1);
        seen.push(card);
      }
      if (holeFlipEl && canDraw && !bjMotionOff()) {
        fx.flipCard(holeFlipEl);
        playSfx("flip");
      }
      holeFlipEl = null;
    }

    function stand() {
      if (busy || stage !== "player") {
        return;
      }
      if (bjMotionOff() || !canDraw) {
        housePlay();
        return;
      }
      busy = true;
      setButtons();
      revealHole();
      laterCritical(housePlay, BJ_HOUSE_MS);
    }

    function doubleDown() {
      if (busy || stage !== "player" || player.length !== 2 || chips < bet * 2) {
        return;
      }
      bet *= 2;
      player.push(draw());
      playSfx("coin");
      if (bjCount(player).total > 21) {
        playSfx("flip");
        settle(false);
        return;
      }
      busy = true;
      setButtons();
      renderBoard();
      if (potRowEl) {
        fx.pop(potRowEl, { scale: 1.12, ms: 240 });
      }
      if (bjMotionOff() || !canDraw) {
        housePlay();
        return;
      }
      laterCritical(housePlay, BJ_HOUSE_MS);
    }

    function loadTable(tableDef) {
      clearFxTimers();
      busy = false;
      table = tableDef || table;
      shoe = bjShoe(table.decks);
      player = [];
      dealer = [];
      chips = table.start;
      hands = 0;
      bet = table.bets[1];
      stage = "idle";
      seen = [];
      downSeen = [];
      holeFlipEl = null;
      lastPotBet = 0;
      lastYouTotal = -1;
      lastHouseTotal = -1;
      betEl2.textContent = "";
      table.bets.forEach(function (amount) {
        var option = document.createElement("option");
        option.value = String(amount);
        option.textContent = String(amount);
        betEl2.appendChild(option);
      });
      betEl2.value = String(bet);
      renderBoard({ staggerSlots: true });
      refreshTable();
      setButtons();
      fx.sweep(dealBtn);
      resultEl.className = "game-result";
      resultEl.textContent = t("bjPrompt", {
        name: t(table.labelKey),
        target: table.target,
        decks: table.decks,
        start: table.start,
      });
    }

    /* The felt borrows the panel hue token so the table matches the room it is
     * sitting in; the constant is only the fallback. */
    function readHue() {
      var raw = "";
      try {
        raw = window.getComputedStyle(panelEl).getPropertyValue("--gp-hue");
      } catch (error) {
        raw = "";
      }
      var parsed = parseInt(raw, 10);
      hue = isNaN(parsed) ? BJ_FELT_HUE : parsed;
    }

    /* The cloth and the shoe mount once; renderBoard only refreshes what sits
     * on top of them, so a repaint never rebuilds the room. */
    function mountTable() {
      feltLayer = document.createElement("div");
      feltLayer.className = "bj-felt";
      feltLayer.setAttribute("aria-hidden", "true");
      if (canArt) {
        feltLayer.appendChild(art.pattern("felt", { hue: hue, sat: 44, tile: 14 }));
      }
      shoeEl = document.createElement("div");
      shoeEl.className = "bj-shoe";
      shoeEl.setAttribute("aria-hidden", "true");
      if (canArt) {
        for (var i = 0; i < 3; i += 1) {
          var deck = document.createElement("span");
          deck.className = "bj-shoe-deck";
          deck.style.transform = "translate(" + (i * -2) + "px," + (i * -3) + "px)";
          deck.appendChild(art.icon("card-back", { hue: hue, sat: 56, tone: "deep" }));
          shoeEl.appendChild(deck);
        }
      }
    }

    dealBtn.addEventListener("click", deal);
    hitBtn.addEventListener("click", hit);
    standBtn.addEventListener("click", stand);
    doubleBtn.addEventListener("click", doubleDown);
    tableEl.addEventListener("change", function () {
      var index = campaign.indexOf(tableEl.value);
      if (index >= 0 && campaign.isUnlocked(tableEl.value)) {
        loadTable(bjTables[index]);
        playSfx("select");
      }
    });
    betEl2.addEventListener("change", function () {
      if (busy) {
        return;
      }
      renderBoard();
      playSfx("tap");
    });

    readHue();
    mountTable();
    loadTable(table);

    /* The drawer's pause hook: flush the timers and play out anything the
     * panel owes (a house answer, a table advance) so no hand is stranded.
     * Bankroll, shoe position and campaign state are never touched here. */
    App.quietResetBlackjack = function () {
      var critical = pendingFn;
      clearFxTimers();
      busy = false;
      if (critical) {
        critical();
      }
    };
  }


  /* Exported for the other modules. */
  App.blackjackCount = bjCount;
  App.blackjackNatural = bjNatural;
  App.initBlackjackGame = initBlackjackGame;
})(window.CapitalConvert = window.CapitalConvert || {});
