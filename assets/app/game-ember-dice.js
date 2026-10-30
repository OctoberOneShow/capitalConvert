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

    /* Tables 11-16, the second tier. Two dice with a SECOND burn face: with
     * two dice on the table a burn lands on five rolls in nine, so the stake
     * is far more likely to die before it can be banked. The bounty is what
     * makes that survivable, and it is set by measurement, not feel - each
     * table was solved by value iteration over (turns, bank, stake) in
     * tools/dice-forge.js, and the bounty chosen is the one that puts the
     * three-star line (clear with three turns spare) in the 20-41% band the
     * later shipped tables already occupy, while a best-policy run still
     * clears the table outright. The bounties below were re-measured on the
     * forge after its solver learned what the table already knew: a bank
     * needs a stake to collect from, so an empty stake banks nothing and the
     * first cut of these bounties paid out on air. */
    { id: "t11", labelKey: "diceTable11", ruleKey: "diceRule11", target: 150, burn: [1, 6], tax: -32, pairs: true },
    { id: "t12", labelKey: "diceTable12", ruleKey: "diceRule12", target: 165, burn: [1, 2], tax: -35, pairs: true },
    { id: "t13", labelKey: "diceTable13", ruleKey: "diceRule13", target: 180, burn: [1, 6], tax: -40, pairs: true },
    { id: "t14", labelKey: "diceTable14", ruleKey: "diceRule14", target: 195, burn: [1, 2], tax: -43, pairs: true },
    { id: "t15", labelKey: "diceTable15", ruleKey: "diceRule15", target: 210, burn: [1, 6], tax: -48, pairs: true },
    { id: "t16", labelKey: "diceTable16", ruleKey: "diceRule16", target: 225, burn: [1, 2], tax: -51, pairs: true },

    /* Tables 17-20, the summit as the ladder first shipped it. Seventeen
     * takes the twin-ember pairs one step higher; eighteen brings the twin
     * embers back down to the small felt at their highest stakes, a breath
     * after the pairs grind; nineteen lights a THIRD burn face on that small
     * felt - half the faces burn now, and only the bounty keeps the table
     * playable - and the last gate combines the cold family's rule with the
     * deepest stakes the room had then asked. Every bounty below sits one
     * step under the cliff where the next bank would come free, which is
     * where the solver puts the three-star line around a quarter of
     * best-policy runs. */
    { id: "t17", labelKey: "diceTable17", ruleKey: "diceRule17", target: 240, burn: [1, 6], tax: -54, pairs: true },
    { id: "t18", labelKey: "diceTable18", ruleKey: "diceRule18", target: 90, burn: [1, 6], tax: -14, pairs: false },
    { id: "t19", labelKey: "diceTable19", ruleKey: "diceRule19", target: 105, burn: [1, 2, 6], tax: -22, pairs: false },
    { id: "t20", labelKey: "diceTable20", ruleKey: "diceRule20", target: 255, burn: [1, 2], tax: -59, pairs: true },

    /* Tables 21-24, the summit tier - the four tables the first summit's own
     * language was pointing at. Twenty-one walks the twin-ember pairs past
     * Ashen Stair to 280, a target no pairs table had carried; twenty-two
     * hands the cold family the deepest ask in the room, 300; twenty-three
     * takes the three-ember small felt past Trinity Ember to 150, the
     * highest that felt has carried; and the last gate asks Ashen Stair's
     * own 240 of a pairs felt with all THREE embers lit, where three of
     * every four rolls burn - no shipped table pairs three burn faces, and
     * that felt is why the last bounty reaches 111. Each bounty below is
     * the smallest one the forge still measures inside the shipped bands -
     * clear for 45% of best-policy runs, the three-star line between 15%
     * and 50% - so the tier is as hard as those bands allow, and the gate
     * can prove the edge by re-measuring one bounty stingier: 21's
     * three-star line falls to 13.8%, 22's to 14.3%, 23's to 13.2%, and 24
     * drops under 45% clear outright. */
    { id: "t21", labelKey: "diceTable21", ruleKey: "diceRule21", target: 280, burn: [1, 6], tax: -63, pairs: true },
    { id: "t22", labelKey: "diceTable22", ruleKey: "diceRule22", target: 300, burn: [1, 2], tax: -66, pairs: true },
    { id: "t23", labelKey: "diceTable23", ruleKey: "diceRule23", target: 150, burn: [1, 2, 6], tax: -32, pairs: false },
    { id: "t24", labelKey: "diceTable24", ruleKey: "diceRule24", target: 240, burn: [1, 2, 6], tax: -111, pairs: true },

    /* Tables 25-30, the summit past the Last Ember - and the dial moves from
     * the target to the felt itself. The forge measures the pairs felts as
     * target-invariant at the starvation edge: whatever target a two-ember
     * pairs table carries, its smallest in-band bounty lands the solver's
     * three-star line at 19.6-19.7%, and the classic three-ember pairs pins
     * at 25.1%, so no deeper number can make those tables one notch harder.
     * The only lever the solver answers to is which faces burn - the yield
     * of the rolls that survive. So every rung below lights a burn set the
     * room never combined (the Quiet felt stops burning the 1 outright;
     * the Hearth family burns 2 and 6 while 1 and 3,4,5 pay; the Vault
     * takes that to three faces on one die) and each is its own family's
     * deepest ask: 320 on the twin-ember pairs past Pyre Stair's 280 - the
     * deepest target in the room, past The Cold Deep's 300 - 280 on the
     * first pairs felt without a 1, 150 on the small hearth, 105 and 120
     * on the new one-die felts. All numbers were measured through the
     * game's own solver in tools/dice-forge.js - exact value iteration over
     * (turns, bank, stake) under the best stopping policy, no dice rolled:
     * every table stays in the shipped bands (a best policy clears inside
     * ten turns at least 45% of the time, the three-star line lands between
     * 15% and 50%) and the tier is monotone in the solver's own currency -
     * the three-star line falls rung over rung, 22.8, 19.7, 19.6, 16.7,
     * 16.2, 15.0%, each under the Last Ember's 25.1. Every bounty below is
     * again the smallest one the solver still measures inside the bands, so
     * the edge is provable one bounty stingier: 25's clear falls to 40.8%,
     * 26's line to 12.4%, 27's to 10.5% (clear 40.6%), 28's to 9.6%, 29's
     * to 11.0%, 30's to 11.8%. And the felt, not the bounty, is what the
     * tier prices - the twins prove it: at the Quiet felt's own target and
     * bounty the classic three-ember pairs measures easier on both lines
     * (47.3% clear, 25.1% line against 25's 45.3 and 22.8), the twin-ember
     * pairs at 28's and 29's economies measures 54.4/19.6 and 69.6/17.7
     * against 49.9/16.7 and 68.8/16.2, and the trinity felt at 30's economy
     * measures 55.4/18.1 against 53.0/15.0. */
    { id: "t25", labelKey: "diceTable25", ruleKey: "diceRule25", target: 240, burn: [2, 3, 6], tax: -111, pairs: true },
    { id: "t26", labelKey: "diceTable26", ruleKey: "diceRule26", target: 105, burn: [2, 3, 6], tax: -22, pairs: false },
    { id: "t27", labelKey: "diceTable27", ruleKey: "diceRule27", target: 320, burn: [1, 6], tax: -73, pairs: true },
    { id: "t28", labelKey: "diceTable28", ruleKey: "diceRule28", target: 280, burn: [2, 6], tax: -63, pairs: true },
    { id: "t29", labelKey: "diceTable29", ruleKey: "diceRule29", target: 150, burn: [2, 6], tax: -25, pairs: false },
    { id: "t30", labelKey: "diceTable30", ruleKey: "diceRule30", target: 120, burn: [2, 3, 6], tax: -25, pairs: false },
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
      faceEl.textContent = faces.map(function (face) { return diceFaces[face]; }).join(" ");
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
      faceEl.textContent = table.pairs ? diceFaces[1] + " " + diceFaces[1] : diceFaces[1];
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
      "diceTable11": "Cinder Gate",
      "diceTable12": "Cold Gate",
      "diceTable13": "Twin Ashfall",
      "diceTable14": "Twin Cold",
      "diceTable15": "Ember Gate",
      "diceTable16": "The Long Gate",
      "diceTable17": "Ashen Stair",
      "diceTable18": "Twinlings",
      "diceTable19": "Trinity Ember",
      "diceTable20": "The Last Gate",
      "diceTable21": "Pyre Stair",
      "diceTable22": "The Cold Deep",
      "diceTable23": "Ember Crown",
      "diceTable24": "The Last Ember",
      "diceRule8": "The Bounty Board: a bank pays 12 bounty embers, but only a bank collects. Target {t}.",
      "diceRule9": "Cold Deuce: 2 burns right alongside 1, and the bounty climbs to 20. Target {t}.",
      "diceRule10": "Ashfall Twins: two dice, any 1 burns them both, and each bank pays a 24 bounty. Target {t}.",
      "diceRule11": "Cinder Gate: two dice, 1 and 6 both burn, and each bank pays a 32 bounty. Target {t}.",
      "diceRule12": "Cold Gate: two dice, 1 and 2 both burn, and the bounty climbs to 35. Target {t}.",
      "diceRule13": "Twin Ashfall: two dice, 1 and 6 both burn, and each bank pays a 40 bounty. Target {t}.",
      "diceRule14": "Twin Cold: two dice, 1 and 2 both burn, and the bounty climbs to 43. Target {t}.",
      "diceRule15": "Ember Gate: two dice, 1 and 6 both burn, and each bank pays a 48 bounty. Target {t}.",
      "diceRule16": "The Long Gate: two dice, 1 and 2 both burn, and the bounty reaches 51. Target {t}.",
      "diceRule17": "Ashen Stair: two dice add together, a 1 or a 6 on either die burns the stake, and every bank pays you an extra 54. Target {t}.",
      "diceRule18": "Twinlings: one die, a 1 or a 6 burns the stake, and every bank pays you an extra 14. Target {t}.",
      "diceRule19": "Trinity Ember: one die, a 1, a 2 or a 6 burns the stake, and every bank pays you an extra 22. Target {t}.",
      "diceRule20": "The Last Gate: two dice add together, a 1 or a 2 on either die burns the stake, and every bank pays you an extra 59. Target {t}.",
      "diceRule21": "Pyre Stair: two dice add together, a 1 or a 6 on either die burns the stake, and every bank pays you an extra 63. Target {t}.",
      "diceRule22": "The Cold Deep: two dice add together, a 1 or a 2 on either die burns the stake, and every bank pays you an extra 66. Target {t}.",
      "diceRule23": "Ember Crown: one die, a 1, a 2 or a 6 burns the stake, and every bank pays you an extra 32. Target {t}.",
      "diceRule24": "The Last Ember: two dice add together, a 1, a 2 or a 6 on either die burns the stake, and every bank pays you an extra 111. Target {t}.",
      "diceTable25": "The Quiet One",
      "diceTable26": "Quiet Court",
      "diceTable27": "Pyre Summit",
      "diceTable28": "Furnace Twins",
      "diceTable29": "The Hearth",
      "diceTable30": "The Ash Vault",
      "diceRule25": "The Quiet One: two dice add together, a 2, a 3 or a 6 on either die burns the stake, and every bank pays you an extra 111. Target {t}.",
      "diceRule26": "Quiet Court: one die, a 2, a 3 or a 6 burns the stake, and every bank pays you an extra 22. Target {t}.",
      "diceRule27": "Pyre Summit: two dice add together, a 1 or a 6 on either die burns the stake, and every bank pays you an extra 73. Target {t}.",
      "diceRule28": "Furnace Twins: two dice add together, a 2 or a 6 on either die burns the stake, and every bank pays you an extra 63. Target {t}.",
      "diceRule29": "The Hearth: one die, a 2 or a 6 burns the stake, and every bank pays you an extra 25. Target {t}.",
      "diceRule30": "The Ash Vault: one die, a 2, a 3 or a 6 burns the stake, and every bank pays you an extra 25. Target {t}.",
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
      "diceTable11": "炭门桌",
      "diceTable12": "冷门桌",
      "diceTable13": "双灰烬桌",
      "diceTable14": "双冷桌",
      "diceTable15": "火门桌",
      "diceTable16": "长门桌",
      "diceTable17": "灰阶桌",
      "diceTable18": "孪火桌",
      "diceTable19": "三烬桌",
      "diceTable20": "末门桌",
      "diceTable21": "焚阶桌",
      "diceTable22": "深寒桌",
      "diceTable23": "烬冠桌",
      "diceTable24": "末烬桌",
      "diceRule8": "赏金桌：「收下」额外给 12 簇赏金，只有收下才拿得到。目标 {t}。",
      "diceRule9": "冷二桌：2 点和 1 点一样烧注，赏金涨到 20。目标 {t}。",
      "diceRule10": "灰烬双骰：两颗骰子，任何 1 点全烧，每次收下赏 24。目标 {t}。",
      "diceRule11": "炭门桌：两颗骰子，1 点与 6 点皆烧注，每次收下赏 32。目标 {t}。",
      "diceRule12": "冷门桌：两颗骰子，1 点与 2 点皆烧注，赏金涨到 35。目标 {t}。",
      "diceRule13": "双灰烬桌：两颗骰子，1 点与 6 点皆烧注，每次收下赏 40。目标 {t}。",
      "diceRule14": "双冷桌：两颗骰子，1 点与 2 点皆烧注，赏金涨到 43。目标 {t}。",
      "diceRule15": "火门桌：两颗骰子，1 点与 6 点皆烧注，每次收下赏 48。目标 {t}。",
      "diceRule16": "长门桌：两颗骰子，1 点与 2 点皆烧注，赏金升到 51。目标 {t}。",
      "diceRule17": "灰阶桌：两颗骰子相加，任何一颗掷出 1 或 6 就烧光赌注，每次「收下」额外给 54。目标 {t}。",
      "diceRule18": "孪火桌：一颗骰子，掷出 1 或 6 就烧光赌注，每次「收下」额外给 14。目标 {t}。",
      "diceRule19": "三烬桌：一颗骰子，1、2、6 任何一点都会烧光赌注，每次「收下」额外给 22。目标 {t}。",
      "diceRule20": "末门桌：两颗骰子相加，任何一颗掷出 1 或 2 就烧光赌注，每次「收下」额外给 59。目标 {t}。",
      "diceRule21": "焚阶桌：两颗骰子相加，任何一颗掷出 1 或 6 就烧光赌注，每次「收下」额外给 63。目标 {t}。",
      "diceRule22": "深寒桌：两颗骰子相加，任何一颗掷出 1 或 2 就烧光赌注，每次「收下」额外给 66。目标 {t}。",
      "diceRule23": "烬冠桌：一颗骰子，1、2、6 任何一点都会烧光赌注，每次「收下」额外给 32。目标 {t}。",
      "diceRule24": "末烬桌：两颗骰子相加，1、2、6 任何一点都会烧光赌注，每次「收下」额外给 111。目标 {t}。",
      "diceTable25": "静一桌",
      "diceTable26": "静庭桌",
      "diceTable27": "焚顶桌",
      "diceTable28": "炉火双骰",
      "diceTable29": "灶火桌",
      "diceTable30": "灰窖桌",
      "diceRule25": "静一桌：两颗骰子相加，任何一颗掷出 2、3 或 6 就烧光赌注，每次「收下」额外给 111。目标 {t}。",
      "diceRule26": "静庭桌：一颗骰子，掷出 2、3 或 6 就烧光赌注，每次「收下」额外给 22。目标 {t}。",
      "diceRule27": "焚顶桌：两颗骰子相加，任何一颗掷出 1 或 6 就烧光赌注，每次「收下」额外给 73。目标 {t}。",
      "diceRule28": "炉火双骰：两颗骰子相加，任何一颗掷出 2 或 6 就烧光赌注，每次「收下」额外给 63。目标 {t}。",
      "diceRule29": "灶火桌：一颗骰子，掷出 2 或 6 就烧光赌注，每次「收下」额外给 25。目标 {t}。",
      "diceRule30": "灰窖桌：一颗骰子，掷出 2、3 或 6 就烧光赌注，每次「收下」额外给 25。目标 {t}。",
      "diceBurns": "掷出 {f}！赌注化为灰烬。",
      "diceAllTables": " {n} 张牌桌都是你的了！",
    },
  });

  /* Exported for the other modules. */
  App.initEmberDiceGame = initEmberDiceGame;
})(window.CapitalConvert = window.CapitalConvert || {});
