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
   * number of hands whatever the stakes: the race is always two top bets of net
   * luck. Deeper shoes take the counting edge away, so tables 11-15 let the
   * bankroll double while the star bands hold and then tighten. Tables 16-20
   * turn the wheel back around: two more steps down the deep-deck road, then
   * the pit swaps in a six-deck shoe and a single deck at double stakes, where
   * the countable edge returns and the three-star line moves in to meet it;
   * the final felt deals two decks and carries the tightest lines of the room.
   * Above it the salon halves the shoe table by table - eight decks, four,
   * two, and the single deck the game began on - walking the lines down to
   * the shortest the parlor has ever printed. */
  var bjTables = [
    { id: "b1", labelKey: "bjT1", decks: 1, start: 100, bets: [5, 10, 25], target: 150, starHands: [8, 16, 32] },
    { id: "b2", labelKey: "bjT2", decks: 2, start: 200, bets: [10, 20, 50], target: 300, starHands: [9, 18, 36] },
    { id: "b3", labelKey: "bjT3", decks: 4, start: 400, bets: [25, 50, 100], target: 600, starHands: [10, 20, 40] },
    { id: "b4", labelKey: "bjT4", decks: 6, start: 800, bets: [50, 100, 200], target: 1200, starHands: [11, 22, 44] },
    { id: "b5", labelKey: "bjT5", decks: 8, start: 1600, bets: [100, 200, 400], target: 2400, starHands: [12, 24, 48] },
    { id: "b6", labelKey: "bjT6", decks: 10, start: 3200, bets: [160, 320, 800], target: 4800, starHands: [12, 25, 50] },
    { id: "b7", labelKey: "bjT7", decks: 12, start: 6400, bets: [320, 640, 1600], target: 9600, starHands: [12, 24, 48] },
    { id: "b8", labelKey: "bjT8", decks: 14, start: 12800, bets: [640, 1280, 3200], target: 19200, starHands: [11, 23, 46] },
    { id: "b9", labelKey: "bjT9", decks: 16, start: 25600, bets: [1280, 2560, 6400], target: 38400, starHands: [11, 22, 44] },
    { id: "b10", labelKey: "bjT10", decks: 18, start: 51200, bets: [2560, 5120, 12800], target: 76800, starHands: [10, 21, 42] },

    /* Tables 11-15: the shoe keeps growing - twenty to twenty-eight decks,
     * where a count is a whisper - and the stack keeps doubling, while the
     * band tightens: seven hands to clear for three stars, against the ten
     * the last shipped table allows. Each was swept 160 times on the seeded
     * bench at the top stake before it shipped, so these bands are what that
     * sweep measured rather than a guess. */
    { id: "b11", labelKey: "bjT11", decks: 20, start: 102400, bets: [5120, 10240, 25600], target: 153600, starHands: [7, 13, 26] },
    { id: "b12", labelKey: "bjT12", decks: 22, start: 204800, bets: [10240, 20480, 51200], target: 307200, starHands: [7, 13, 26] },
    { id: "b13", labelKey: "bjT13", decks: 24, start: 409600, bets: [20480, 40960, 102400], target: 614400, starHands: [7, 13, 26] },
    { id: "b14", labelKey: "bjT14", decks: 26, start: 819200, bets: [40960, 81920, 204800], target: 1228800, starHands: [7, 13, 26] },
    { id: "b15", labelKey: "bjT15", decks: 28, start: 1638400, bets: [81920, 163840, 409600], target: 2457600, starHands: [7, 13, 26] },

    /* Tables 16-20: the shoe turns back around. Sixteen and seventeen ride the
     * deep-deck road one last time with the bands held; eighteen swaps in a
     * six-deck shoe - the count is back, and the three-star line moves in to
     * five hands to meet it; nineteen deals a single deck again, the first
     * table's game at a whale's stakes, with the bands of the tier above; and
     * the final felt deals two decks with the tightest lines of the room. The
     * stack keeps doubling throughout, so the sweep that judged the tier above
     * judged these the same way - 160 seeded runs at the top stake, in table
     * order, before any of them shipped. */
    { id: "b16", labelKey: "bjT16", decks: 30, start: 3276800, bets: [163840, 327680, 819200], target: 4915200, starHands: [7, 13, 26] },
    { id: "b17", labelKey: "bjT17", decks: 32, start: 6553600, bets: [327680, 655360, 1638400], target: 9830400, starHands: [7, 13, 26] },
    { id: "b18", labelKey: "bjT18", decks: 6, start: 13107200, bets: [819200, 1638400, 3276800], target: 19660800, starHands: [5, 11, 26] },
    { id: "b19", labelKey: "bjT19", decks: 1, start: 26214400, bets: [1638400, 3276800, 6553600], target: 39321600, starHands: [7, 13, 26] },
    { id: "b20", labelKey: "bjT20", decks: 2, start: 52428800, bets: [3276800, 6553600, 13107200], target: 78643200, starHands: [5, 10, 24] },

    /* Tables 21-24: the salon above the pit. The stack doubles four more
     * times - the last felt stakes every bankroll the shipped ladder owns on
     * one hand - and the shoe halves table by table: eight decks, the house's
     * own standard felt, where the count is dead twice over and the three-
     * star luck pays for the size; four, where the count stirs and the line
     * steps in a hand; two, the last count's game at double the stakes; and
     * the single deck the game began on, asking a clear in three hands - the
     * shortest line the parlor has ever printed. The bands never loosen from
     * the last shipped felt, and each table was swept 160 times on the seeded
     * bench at the top stake, appended to the shipped ladder in table order,
     * before any of it shipped. */
    { id: "b21", labelKey: "bjT21", decks: 8, start: 104857600, bets: [6553600, 13107200, 26214400], target: 157286400, starHands: [5, 10, 24] },
    { id: "b22", labelKey: "bjT22", decks: 4, start: 209715200, bets: [13107200, 26214400, 52428800], target: 314572800, starHands: [4, 9, 24] },
    { id: "b23", labelKey: "bjT23", decks: 2, start: 419430400, bets: [26214400, 52428800, 104857600], target: 629145600, starHands: [4, 9, 23] },
    { id: "b24", labelKey: "bjT24", decks: 1, start: 838860800, bets: [52428800, 104857600, 209715200], target: 1258291200, starHands: [3, 9, 23] },

    /* Tables 25-30: the rope above the salon. The Last Shoe kept the count's
     * game; the rope takes it back rule by rule, because at these stakes the
     * pit no longer needs tricks - it changes the rules. soft17 pushes the
     * dealer's soft hands (the first felts that ever drew to a soft 17);
     * pushLose turns every tie into a house win; the naturals shorten to
     * seven for five - the deepest short pay that still costs the player
     * hands, because the paired bench measures the buy-back economy giving
     * the cut back below it (a shorter natural digs the hole deeper, and
     * every hole the felt buys you out of at the full stack is a gift).
     * Then the buy-back itself shrinks: restake, the chips a busted
     * bankroll returns with, walks one and a half top bets, three quarters,
     * one half - the pit stops buying you back in full, and every bust is
     * progress the felt keeps. The paired bench (one deep shuffle dealt to
     * every ruleset, twenty-four thousand trials, no reshuffle to break the
     * pairing) climbs rung over rung: 18.2 hands to clear on the Last
     * Shoe's own rules, 18.6, 21.0, 22.1, then 54.4, 57.1, 62.6 across the
     * buy-back walk, the clear share never below 96.4%. Every step was
     * cut-tested - remove the rung's own lever and the same deals clear
     * strictly faster. The three-star line never moves again: three hands,
     * where the Last Shoe printed it. The deeper bands buy back the clock
     * the rules take - the two-star and one-star lines calibrate to the
     * sweep's own 42% and 72% points, so each rung stays winnable at all -
     * and each felt was swept 160 times on the seeded bench at the
     * top stake, appended to the shipped ladder in table order, before any
     * of it shipped. */
    { id: "b25", labelKey: "bjT25", decks: 1, start: 1677721600, bets: [104857600, 209715200, 419430400], target: 2516582400, starHands: [3, 10, 25], soft17: true },
    { id: "b26", labelKey: "bjT26", decks: 1, start: 3355443200, bets: [209715200, 419430400, 838860800], target: 5033164800, starHands: [3, 10, 26], soft17: true, pushLose: true },
    { id: "b27", labelKey: "bjT27", decks: 1, start: 6710886400, bets: [419430400, 838860800, 1677721600], target: 10066329600, starHands: [3, 12, 33], soft17: true, pushLose: true, pays: 1.4 },
    { id: "b28", labelKey: "bjT28", decks: 1, start: 13421772800, bets: [838860800, 1677721600, 3355443200], target: 20132659200, starHands: [3, 20, 72], soft17: true, pushLose: true, pays: 1.4, restake: 5033164800 },
    { id: "b29", labelKey: "bjT29", decks: 1, start: 26843545600, bets: [1677721600, 3355443200, 6710886400], target: 40265318400, starHands: [3, 16, 69], soft17: true, pushLose: true, pays: 1.4, restake: 5033164800 },
    { id: "b30", labelKey: "bjT30", decks: 1, start: 53687091200, bets: [3355443200, 6710886400, 13421772800], target: 80530636800, starHands: [3, 16, 84], soft17: true, pushLose: true, pays: 1.4, restake: 6710886400 },
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
        won = Math.round(bet * (table.pays || 1.5));
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
      } else if (table.pushLose) {
        /* the rope felts: a tie is not a push here - the house takes the bet */
        won = -bet;
        line = t("bjPushLose", { you: you, n: bet });
      } else {
        line = t("bjPush", { you: you });
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
         * still allowed to cover. The rope felts restake short of the full
         * stack - the buy-back is the summit's own dial. */
        chips = table.restake !== undefined ? table.restake : table.start;
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
     * so nothing can outlive the panel even here (pendingFn covers the gap).
     * The rope felts draw to a soft 17: the loop below stands on every hard
     * hand first, then the second loop pushes the soft 17s the rope asks for. */
    function housePlay() {
      while (bjCount(dealer).total < 17) {
        dealer.push(draw());
      }
      while (table.soft17 && bjCount(dealer).total === 17 && bjCount(dealer).soft) {
        dealer.push(draw());
        while (bjCount(dealer).total < 17) {
          dealer.push(draw());
        }
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
  App.blackjackTables = bjTables;
  App.blackjackShoe = bjShoe;
  App.initBlackjackGame = initBlackjackGame;

  /* The salon's names travel with the game: addStrings only fills keys the
   * shared dictionary does not already hold (see core.js), so the picker
   * never prints a raw key for the felts above the pit. The rope felts add
   * their own names plus the tie-that-costs line the shared dictionary has
   * never needed. */
  App.addStrings({
    en: {
      "bjT21": "The House Shoe",
      "bjT22": "The Half Shoe",
      "bjT23": "Two Decks",
      "bjT24": "The Last Shoe",
      "bjT25": "Soft Seventeen",
      "bjT26": "The Push Tax",
      "bjT27": "Seven to Five",
      "bjT28": "The Thin Reload",
      "bjT29": "The Bare Reload",
      "bjT30": "The Last Chip",
      "bjPushLose": "Tied at {you} - the rope takes the bet: {n} lost.",
    },
    zh: {
      "bjT21": "庄家靴桌",
      "bjT22": "半靴桌",
      "bjT23": "双副桌",
      "bjT24": "终靴桌",
      "bjT25": "软十七桌",
      "bjT26": "平局税桌",
      "bjT27": "七赔五桌",
      "bjT28": "薄筹桌",
      "bjT29": "空筹桌",
      "bjT30": "末筹桌",
      "bjPushLose": "和局 {you} 点——绳室规矩：赌注归庄，损失 {n} 枚。",
    },
  });
})(window.CapitalConvert = window.CapitalConvert || {});
