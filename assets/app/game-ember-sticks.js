/* Ember Sticks - The take-away Nim mini-game in the shared game drawer. */
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
  /* Two rules per table: "last stick wins" and its meaner twin. The rows are
   * sized so the first move always has an answer to find. */
  var nimLevels = [
    { id: "s1", labelKey: "nimL1", rows: [1, 2], misere: false, starTurns: [2, 3, 5] },
    { id: "s2", labelKey: "nimL2", rows: [2, 3], misere: false, starTurns: [3, 4, 6] },
    { id: "s3", labelKey: "nimL3", rows: [1, 3, 4], misere: false, starTurns: [4, 6, 9] },
    { id: "s4", labelKey: "nimL4", rows: [2, 3, 5], misere: false, starTurns: [5, 7, 10] },
    { id: "s5", labelKey: "nimL5", rows: [1, 4, 6], misere: true, starTurns: [5, 7, 10] },
    { id: "s6", labelKey: "nimL6", rows: [2, 3, 4, 6], misere: true, starTurns: [6, 9, 12] },
    { id: "s7", labelKey: "nimL7", rows: [3, 4, 5], misere: false, starTurns: [4, 6, 11] },
    { id: "s8", labelKey: "nimL8", rows: [1, 2, 3, 4], misere: false, starTurns: [4, 7, 9] },
    { id: "s9", labelKey: "nimL9", rows: [2, 5, 6, 7], misere: false, starTurns: [6, 9, 18] },
    { id: "s10", labelKey: "nimL10", rows: [1, 2, 4, 6], misere: true, starTurns: [5, 8, 12] },
    { id: "s11", labelKey: "nimL11", rows: [3, 5, 7], misere: true, starTurns: [6, 9, 14] },
    { id: "s12", labelKey: "nimL12", rows: [2, 3, 5, 7], misere: true, starTurns: [6, 10, 16] },
    { id: "s13", labelKey: "lvlNum13", rows: [3, 6, 9], misere: false, starTurns: [5, 9, 17] },
    { id: "s14", labelKey: "lvlNum14", rows: [1, 4, 7, 8], misere: false, starTurns: [5, 10, 19] },
    { id: "s15", labelKey: "lvlNum15", rows: [1, 2, 5, 8], misere: true, starTurns: [5, 8, 15] },
    { id: "s16", labelKey: "lvlNum16", rows: [4, 6, 9], misere: false, starTurns: [5, 9, 18] },

    /* Tables 17-20: the board widens past four rows for the first time. The
     * pyramid brings misere to five rows and reads as a shape, not a list;
     * the powers-of-two row is the ladder's longest game, where the count
     * has to survive fifteen of your own turns; the even staircase re-runs
     * the arithmetic rows of s13 in fresh-but-fair shoes after it; and the
     * capstone lays out the widest felt of the room - six rows, a staircase,
     * under misere rules - where the three-star line belongs to the player
     * who sows the fastest win. Every band below was proved against the
     * game's own perfect play: the fastest winning line lands inside the
     * three-star turn, a dawdling win still lands inside the one-star turn,
     * and no winning line is faster than the three-star line asks. */
    { id: "s17", labelKey: "lvlNum17", rows: [1, 2, 3, 2, 1], misere: true, starTurns: [3, 5, 10] },
    { id: "s18", labelKey: "lvlNum18", rows: [1, 2, 4, 8, 16], misere: false, starTurns: [5, 9, 18] },
    { id: "s19", labelKey: "lvlNum19", rows: [2, 4, 6, 8], misere: false, starTurns: [4, 8, 16] },
    { id: "s20", labelKey: "lvlNum20", rows: [1, 2, 3, 4, 5, 6], misere: true, starTurns: [5, 6, 12] },

    /* Tables 21-24, the study. The felt stops growing and the shapes start
     * talking to each other: s21 runs the even spread two-through-seven,
     * where the xor reads deep but the fastest win is a five-turn bargain;
     * s22 is the triple-and-stray - three sevens and a three - a position
     * whose winning reply is one exact take, and everything else loses;
     * s23 deals the Fibonacci row under misere rules, the shortest sharp
     * game of the ladder, where every win lands inside five of your own
     * turns; and the capstone s24 lays out the new widest felt of the
     * room, seven rows from two to eight, where the three-star line
     * demands the six-turn kill and a dawdling win still finishes inside
     * seventeen. Every band below was proved against the game's own
     * perfect play: the fastest winning line lands inside the three-star
     * turn, a dawdling win still lands inside the one-star turn, and no
     * winning line is faster than the three-star line asks. */
    { id: "s21", labelKey: "lvlNum21", rows: [2, 3, 4, 5, 6, 7], misere: false, starTurns: [5, 8, 13] },
    { id: "s22", labelKey: "lvlNum22", rows: [7, 7, 7, 3], misere: false, starTurns: [4, 6, 11] },
    { id: "s23", labelKey: "lvlNum23", rows: [1, 2, 3, 5, 8], misere: true, starTurns: [4, 5, 5] },
    { id: "s24", labelKey: "lvlNum24", rows: [2, 3, 4, 5, 6, 7, 8], misere: false, starTurns: [6, 11, 17] },

    /* Tables 25-30, the endgame study - the felt stops widening and the
     * dawdle dies. Every rung below is a first-player win proven by the
     * game's own perfect play, and the three-star line stays pinned where
     * the whole ladder has kept it: at the engine's own line, so matching
     * the table's play is still what a three-star win costs. The dial is
     * the dawdle margin - the room between the engine's own line and the
     * longest winning line - and it narrows rung over rung, measured by the
     * game's own solver over every winning line: eleven of your turns on
     * s24 (line 6, dawdle to 17), then nine, eight, six, five, two and one.
     * By the last felt a dawdling win costs exactly one turn more than the
     * line, on the six stair re-dealt under misere rules. The shapes sit
     * one stone from losing, and the oracle proves those neighbours lose:
     * make s28's threes match (six of them) and the table is a loss, make
     * s29's twos eight even rows and it is a loss, stretch s30's stair to
     * seven steps and the xor reads zero - a loss. All numbers below
     * were measured through the game's own nimBestMove - the oracle, the
     * fastest and longest winning lines and the shipped line:
     *   s25 [2,3,4,6,7,8]    line 6, fastest 4, dawdle 15, margin 9
     *   s26 [2,3,4,5,6,7]    line 5, fastest 4, dawdle 13, margin 8
     *   s27 [1,2,3,4,6,8]    line 5, fastest 4, dawdle 11, margin 6
     *   s28 [3,3,3,3,3,4]    line 4, fastest 3, dawdle 9,  margin 5
     *   s29 [2,2,2,2,2,2,3]  line 5, fastest 4, dawdle 7,  margin 2
     *   s30 [2,3,4,5,6,7] m  line 5, fastest 5, dawdle 6,  margin 1
     * and the twins price the dial: the full staircase s24 grew the margin
     * s25 misses by one step (11 against 9, same line), seven even twos
     * dawdle to the same 7 as s29 but from a line one turn shorter (4
     * against 5), and the six stair's own margin falls from 8 to 1 the
     * moment the misere rule comes on. */
    { id: "s25", labelKey: "nimL25", rows: [2, 3, 4, 6, 7, 8], misere: false, starTurns: [6, 10, 15] },
    { id: "s26", labelKey: "nimL26", rows: [2, 3, 4, 5, 6, 7], misere: false, starTurns: [5, 9, 13] },
    { id: "s27", labelKey: "nimL27", rows: [1, 2, 3, 4, 6, 8], misere: false, starTurns: [5, 8, 11] },
    { id: "s28", labelKey: "nimL28", rows: [3, 3, 3, 3, 3, 4], misere: false, starTurns: [4, 6, 9] },
    { id: "s29", labelKey: "nimL29", rows: [2, 2, 2, 2, 2, 2, 3], misere: false, starTurns: [5, 6, 7] },
    { id: "s30", labelKey: "nimL30", rows: [2, 3, 4, 5, 6, 7], misere: true, starTurns: [5, 6, 6] },
  ];

  function nimTotal(rows) {
    var sum = 0;
    rows.forEach(function (count) {
      sum += count;
    });
    return sum;
  }

  function nimAnyMove(rows) {
    for (var index = 0; index < rows.length; index += 1) {
      if (rows[index] > 0) {
        return [index, 0];
      }
    }
    return null;
  }

  /* Move to a position whose xor is zero: the classic losing set for the
   * player who is about to move. Returns [row, sticksLeft] or null. */
  function nimXorMove(rows) {
    var xor = 0;
    rows.forEach(function (count) {
      xor ^= count;
    });
    if (xor === 0) {
      return null;
    }
    for (var index = 0; index < rows.length; index += 1) {
      var target = rows[index] ^ xor;
      if (target < rows[index]) {
        return [index, target];
      }
    }
    return null;
  }

  /* Misere Nim follows the normal xor rule until only single sticks are left
   * standing; the one exception is a move that would leave nothing but ones,
   * which has to hand over an odd count of them. */
  function nimBestMove(rows, misere) {
    if (nimTotal(rows) === 0) {
      return null;
    }
    if (misere && rows.every(function (count) {
      return count <= 1;
    })) {
      /* Only whole single sticks may be lifted here; leaving an odd count of
       * them to the rival is what wins the endgame. */
      return nimAnyMove(rows);
    }
    var xorMove = nimXorMove(rows);
    if (!misere) {
      return xorMove || nimAnyMove(rows);
    }
    if (!xorMove) {
      return nimAnyMove(rows);
    }
    var after = rows.slice();
    after[xorMove[0]] = xorMove[1];
    if (!after.every(function (count) {
      return count <= 1;
    })) {
      return xorMove;
    }
    var row = xorMove[0];
    var ones = 0;
    rows.forEach(function (count, index) {
      if (index !== row && count === 1) {
        ones += 1;
      }
    });
    /* Both endings are legal because the heap here holds at least two sticks,
     * and exactly one of them leaves an odd number of ones. */
    return (ones + 1) % 2 === 1 ? [row, 1] : [row, 0];
  }

  function initNimGame() {
    var rowsEl = getElement("nimRows");
    var turnEl = getElement("nimTurnStat");
    var modeEl = getElement("nimMode");
    var resultEl = getElement("nimResult");
    var newBtn = getElement("nimNewBtn");
    var bestEl = getElement("nimBest");
    var selectEl = getElement("nimLevelSel");
    if (
      !rowsEl ||
      !turnEl ||
      !modeEl ||
      !resultEl ||
      !newBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var campaign = createCampaign({ key: "nim-campaign", levels: nimLevels });
    var level = nimLevels[campaign.indexOf(campaign.nextLevelId())];
    var rows = [];
    var moves = 0;
    var turns = 0;
    var over = false;

    function renderBest() {
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function refreshPicker() {
      fillCampaignPicker(
        selectEl,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      selectEl.value = level.id;
    }

    function renderHud() {
      turnEl.textContent = String(turns);
      modeEl.textContent = t(level.misere ? "nimMisere" : "nimNormal");
    }

    /* Each row is drawn as its sticks, and clicking one takes it plus
     * everything to its right, which is the only move Nim allows. */
    function renderRows() {
      rowsEl.textContent = "";
      rows.forEach(function (count, rowIndex) {
        var line = document.createElement("div");
        line.className = "nim-row";
        var label = document.createElement("span");
        label.className = "nim-row-label";
        label.textContent = t("nimRow", { n: rowIndex + 1 });
        line.appendChild(label);
        for (var stick = 0; stick < count; stick += 1) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "nim-stick";
          button.setAttribute(
            "aria-label",
            t("nimStickAria", {
              row: rowIndex + 1,
              n: count - stick,
            }),
          );
          (function (row, take) {
            button.addEventListener("click", function () {
              playerTake(row, take);
            });
          })(rowIndex, count - stick);
          line.appendChild(button);
        }
        rowsEl.appendChild(line);
      });
    }

    function applyMove(move) {
      rows[move[0]] = move[1];
      moves += 1;
    }

    function settle() {
      over = true;
      /* Empty table: whoever lifted the last stick made the losing move under
       * misere rules, which is why the winner is the other side there. */
      var lastMover = moves % 2 === 1 ? "you" : "ai";
      var youWon = level.misere ? lastMover === "ai" : lastMover === "you";
      if (!youWon) {
        resultEl.textContent = t("nimYouLose", {
          rule: t(level.misere ? "nimMisereHint" : "nimNormalHint"),
        });
        logAction(t("logNim", { n: "\u2014" }));
        renderBest();
        petNotifyGame(false);
        return;
      }
      var starsWon = starsFor(turns, level.starTurns, "low");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: turns,
        better: "low",
      });
      var message =
        t("nimYouWin", { n: turns, s: starsWon }) +
        (outcome.isBest ? " " + t("newBest") : "");
      if (outcome.unlockedNext) {
        message += " " + t("nimNextTable");
      } else if (campaign.clearedCount() === nimLevels.length) {
        message += " " + t("nimCampaignDone", { n: nimLevels.length });
      }
      resultEl.textContent = message;
      logAction(t("logNim", { n: turns }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      renderBest();
    }

    function playerTake(rowIndex, take) {
      if (over || take <= 0 || take > rows[rowIndex]) {
        return;
      }
      turns += 1;
      applyMove([rowIndex, rows[rowIndex] - take]);
      renderHud();
      renderRows();
      if (nimTotal(rows) === 0) {
        settle();
        return;
      }
      var answer = nimBestMove(rows, level.misere);
      if (answer) {
        applyMove(answer);
      }
      renderRows();
      if (nimTotal(rows) === 0) {
        settle();
      }
    }

    function loadLevel(levelDef) {
      level = levelDef;
      rows = levelDef.rows.slice();
      moves = 0;
      turns = 0;
      over = false;
      renderHud();
      renderRows();
      refreshPicker();
      renderBest();
      resultEl.textContent = t("nimPrompt", {
        rule: t(levelDef.misere ? "nimMisereHint" : "nimNormalHint"),
      });
    }

    newBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(nimLevels[index]);
      }
    });

    loadLevel(nimLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. The
   * first twelve tables carry the fire names the shared dictionary holds;
   * the study tables rode the shared numbered shelf - and the endgame
   * returns to the fire's remains, down to the last stair. */
  App.addStrings({
    en: {
      "nimL25": "Char Steps",
      "nimL26": "Smoke Ladder",
      "nimL27": "The Split Stair",
      "nimL28": "Matched Coals",
      "nimL29": "Driftwood",
      "nimL30": "The Last Stair",
    },
    zh: {
      "nimL25": "炭阶",
      "nimL26": "烟梯",
      "nimL27": "断阶",
      "nimL28": "齐炭",
      "nimL29": "浮柴",
      "nimL30": "末阶",
    },
  });

  /* Exported for the other modules. */
  App.nimBestMove = nimBestMove;
  App.initNimGame = initNimGame;
})(window.CapitalConvert = window.CapitalConvert || {});
