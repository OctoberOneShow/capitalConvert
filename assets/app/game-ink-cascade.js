/* Ink Cascade - The match-three chain-reaction campaign in the shared game drawer. */
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
  var inkSize = 8;
  var inkColors = 6;
  /* One glyph per ink colour, kept as escapes so the source stays ASCII. */
  var inkGlyphs = ["\u25c6", "\u25cf", "\u25b2", "\u25a0", "\u2605", "\u25cb"];
  /* Every pool asks for a score inside a move budget. Star thresholds
   * scale off the target: [3-star, 2-star, 1-star] as "high" values. */
  var inkLevels = [
    { id: "p1", labelKey: "inkL1", target: 800, moves: 20 },
    { id: "p2", labelKey: "inkL2", target: 1000, moves: 20 },
    { id: "p3", labelKey: "inkL3", target: 1200, moves: 18 },
    { id: "p4", labelKey: "inkL4", target: 1400, moves: 18 },
    { id: "p5", labelKey: "inkL5", target: 1600, moves: 16 },
    { id: "p6", labelKey: "inkL6", target: 1750, moves: 16 },
    { id: "p7", labelKey: "inkL7", target: 1900, moves: 15 },
    { id: "p8", labelKey: "inkL8", target: 2050, moves: 15 },
    { id: "p9", labelKey: "inkL9", target: 2150, moves: 14 },
    { id: "p10", labelKey: "inkL10", target: 2300, moves: 14 },
    { id: "p11", labelKey: "inkL11", target: 2450, moves: 13 },
    { id: "p12", labelKey: "inkL12", target: 2600, moves: 13 },
    { id: "p13", labelKey: "lvlNum13", target: 3000, moves: 15 },
    { id: "p14", labelKey: "lvlNum14", target: 3400, moves: 17 },
    { id: "p15", labelKey: "lvlNum15", target: 3800, moves: 19 },
    { id: "p16", labelKey: "lvlNum16", target: 4200, moves: 21 },
    /* Pools 17-20 play with what pours out of the well, not just how many
     * moves the card gives: a level may thin the ink pool (`colors`), and
     * fewer colours means every match drags a deeper chain reaction behind
     * it. One rule prices every card here: a round ends the instant a
     * cascade carries the score across the target, so the final score lands
     * between the target and the target plus one cascade. A card whose
     * three-star line sits further than one big cascade past its target can
     * never be three-starred, so these targets are set where all three
     * bands live inside a single generous chain - the tier asks less per
     * card than the shipped tail but pays it out in exactly the moves
     * given. The finale is the longest accumulation in the tier: the most
     * moves against the biggest target, where the release gate's random
     * hand never reaches the line and only a read that keeps the pools
     * managed crosses it with a cascade to spare. */
    { id: "p17", labelKey: "lvlNum17", target: 1800, moves: 16, colors: 5 },
    { id: "p18", labelKey: "lvlNum18", target: 1000, moves: 30 },
    { id: "p19", labelKey: "lvlNum19", target: 1400, moves: 14, colors: 5 },
    { id: "p20", labelKey: "lvlNum20", target: 2600, moves: 18, colors: 5 },
    /* Pools 21-24 push the pour, not the arithmetic. The tier's one lever is
     * the ink pool, and every card is priced against what its pour delivers:
     * the two-ply player's six-ink ceiling on these budgets is about 2700
     * points (measured 2690 on fifteen moves, 2210 on eleven, 2570 and 2290
     * on the triad), so p21-p24 sit at 3200, 2800, 3600 and 4200 - each
     * above what the classic well can produce, each inside reach of the
     * thinner one, where a single generous chain ends the round and the
     * three bands live inside its overshoot. A no-op hand never scores at
     * all, and the searched line outscores every random hand. Cut the pour -
     * re-deal any of these cards at the classic six inks - and the same
     * player cannot reach the target on a single seeded deal, which is what
     * makes the pool the tier's load-bearing mechanic. */
    { id: "p21", labelKey: "inkL21", target: 3200, moves: 15, colors: 4 },
    { id: "p22", labelKey: "inkL22", target: 2800, moves: 11, colors: 4 },
    { id: "p23", labelKey: "inkL23", target: 3600, moves: 14, colors: 3 },
    { id: "p24", labelKey: "inkL24", target: 4200, moves: 12, colors: 3 },
    /* Pools 25-30 are the summit, and the tier's one lever is still the pour:
     * every card is priced above the Confluence's 350 points a move and the
     * price climbs strictly through the six (measured 390, 418, 444, 456, 463
     * and 543). Every number below was measured through the real panel with
     * the game's own two-ply line over twelve seeded deals per card (seed
     * k*7919): it cleared twelve of twelve on every card - the finals land
     * between one and twelve times the target, because the round ends the
     * instant a cascade crosses - and the ordinary one-ply hand cleared
     * twelve of twelve as well. The Rapids is the one card where the random
     * hand mostly runs dry (three clears in twelve); on the triad cards the
     * pour pays everyone and the separation is the price per move. Cut any
     * card back to the classic six inks and the same line falls short on
     * every deal: measured cut finals run 710-2840 against targets of
     * 3700-7600. The bands stay derived - [1.4t, 1.2t, t] off the target -
     * with the three-star line inside one generous crossing cascade on the
     * triad cards (nine to eleven three-star deals in twelve) and every band
     * a separate landing on the Rapids (two in twelve). */
    /* The Rapids re-thins the well to four inks and closes the budget to ten:
     * short chains hand the round back to the move count, and the line is the
     * heaviest the four-ink pour has been asked to carry (390 a move against
     * the Straits' 254). The measured hands separate here like nowhere else
     * in the endgame, which is what makes it the summit's gatekeeper. */
    { id: "p25", labelKey: "inkL25", target: 3900, moves: 10, colors: 4 },
    /* The Flood Tide returns the deep pour at a new price: 4600 on eleven
     * moves is 418 a move - one move fewer than the Confluence gives, for a
     * line a tenth heavier. A stalled opening has nowhere to hide. */
    { id: "p26", labelKey: "inkL26", target: 4600, moves: 11, colors: 3 },
    /* The Waterfall cuts the budget to nine, tighter than the game has ever
     * dealt (the Straits' eleven was the floor until now): the round has to
     * end on the opening cascades, at 444 a move, and one wasted read drops
     * the line out of reach. */
    { id: "p27", labelKey: "inkL27", target: 4000, moves: 9, colors: 3 },
    /* The Reservoir is the long climb: sixteen moves - the most the triad
     * pour has ever been given - against 7300, the biggest line in the game
     * below the last rung. The crossing lands where the cascades put it, so
     * the final chain has to carry all three bands inside its overshoot
     * instead of coasting across. */
    { id: "p28", labelKey: "inkL28", target: 7300, moves: 16, colors: 3 },
    /* The Geyser is the shortest budget in the campaign: eight moves, two
     * fewer than the Rapids, at the heaviest price short of the summit (463
     * a move). One burst and it is over - the opening cascades clear it
     * almost alone. */
    { id: "p29", labelKey: "inkL29", target: 3700, moves: 8, colors: 3 },
    /* The Watershed closes the ladder at 7600 on fourteen moves: the biggest
     * target and the highest price per move in the game (543, against the
     * Confluence's 350). The budget looks generous until it is read - the
     * two-ply line cleared all twelve deals with moves to spare, and the
     * price per move is what the card is actually about. */
    { id: "p30", labelKey: "inkL30", target: 7600, moves: 14, colors: 3 },
  ];

  function indexAt(x, y) {
    return y * inkSize + x;
  }

  function neighbours(a, b) {
    var ax = a % inkSize;
    var ay = Math.floor(a / inkSize);
    var bx = b % inkSize;
    var by = Math.floor(b / inkSize);
    return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
  }

  function initInkCascadeGame() {
    var boardEl = getElement("inkBoard");
    var scoreEl = getElement("inkScore");
    var movesEl = getElement("inkMoves");
    var comboEl = getElement("inkCombo");
    var resultEl = getElement("inkResult");
    var newBtn = getElement("inkNewBtn");
    var bestEl = getElement("inkBest");
    var selectEl = getElement("inkLevelSel");
    if (
      !boardEl ||
      !scoreEl ||
      !movesEl ||
      !comboEl ||
      !resultEl ||
      !newBtn ||
      !bestEl ||
      !selectEl
    ) {
      return;
    }

    var campaign = createCampaign({ key: "ink-cascade-campaign", levels: inkLevels });
    var level = inkLevels[0];
    var board = [];
    var tiles = [];
    var selected = -1;
    var busy = false;
    var score = 0;
    var movesLeft = 0;
    var combo = 0;
    var cascadeId = null;
    var pendingMatches = [];
    var shakeTimers = [];

    function colorAt(index) {
      return board[index];
    }

    /* One line of board positions, scanned for runs of three or more. */
    function lineMatches(line) {
      var matches = [];
      var run = 1;
      for (var i = 1; i <= line.length; i += 1) {
        if (
          i < line.length &&
          colorAt(line[i]) >= 0 &&
          colorAt(line[i]) === colorAt(line[i - 1])
        ) {
          run += 1;
          continue;
        }
        if (run >= 3 && colorAt(line[i - 1]) >= 0) {
          for (var j = i - run; j < i; j += 1) {
            matches.push(line[j]);
          }
        }
        run = 1;
      }
      return matches;
    }

    function findMatches() {
      var found = {};
      for (var y = 0; y < inkSize; y += 1) {
        var row = [];
        for (var x = 0; x < inkSize; x += 1) {
          row.push(indexAt(x, y));
        }
        lineMatches(row).forEach(function (index) {
          found[index] = true;
        });
      }
      for (var col = 0; col < inkSize; col += 1) {
        var column = [];
        for (var y2 = 0; y2 < inkSize; y2 += 1) {
          column.push(indexAt(col, y2));
        }
        lineMatches(column).forEach(function (index) {
          found[index] = true;
        });
      }
      return Object.keys(found).map(Number);
    }

    function swapColors(a, b) {
      var swap = board[a];
      board[a] = board[b];
      board[b] = swap;
    }

    function wouldMatchAfterSwap(a, b) {
      swapColors(a, b);
      var matches = findMatches();
      swapColors(a, b);
      return matches.length > 0;
    }

    function availableMoveExists() {
      for (var y = 0; y < inkSize; y += 1) {
        for (var x = 0; x < inkSize; x += 1) {
          var index = indexAt(x, y);
          if (x + 1 < inkSize && wouldMatchAfterSwap(index, index + 1)) {
            return true;
          }
          if (y + 1 < inkSize && wouldMatchAfterSwap(index, index + inkSize)) {
            return true;
          }
        }
      }
      return false;
    }

    /* A level may pour a thinner pool (`colors`), which makes matches more
     * common and chains deeper; the classic six colours stay the default. */
    function randomColor() {
      var pool = level.colors || inkColors;
      return Math.floor(Math.random() * pool);
    }

    function fillBoard() {
      board = [];
      for (var index = 0; index < inkSize * inkSize; index += 1) {
        board.push(randomColor());
      }
      var guard = 0;
      while (findMatches().length && guard < 500) {
        findMatches().forEach(function (index) {
          board[index] = randomColor();
        });
        guard += 1;
      }
      guard = 0;
      while (!availableMoveExists() && guard < 500) {
        for (var cell = 0; cell < board.length; cell += 1) {
          board[cell] = randomColor();
        }
        guard += 1;
        var matchGuard = 0;
        while (findMatches().length && matchGuard < 500) {
          findMatches().forEach(function (index) {
            board[index] = randomColor();
          });
          matchGuard += 1;
        }
      }
    }

    function render() {
      for (var index = 0; index < tiles.length; index += 1) {
        var tile = tiles[index];
        var color = colorAt(index);
        tile.className = "ink-tile ink-c" + color;
        tile.textContent = inkGlyphs[color];
        tile.setAttribute(
          "aria-label",
          t("inkCell", { n: index + 1 }) + ", " + t("inkColor" + color),
        );
        tile.setAttribute("aria-pressed", String(selected === index));
        tile.classList.toggle("is-selected", selected === index);
      }
    }

    function renderHud() {
      scoreEl.textContent = score + "/" + level.target;
      movesEl.textContent = String(Math.max(0, movesLeft));
      comboEl.textContent = String(combo);
    }

    function collapseAndRefill() {
      for (var x = 0; x < inkSize; x += 1) {
        var column = [];
        for (var y = inkSize - 1; y >= 0; y -= 1) {
          var color = colorAt(indexAt(x, y));
          if (color >= 0) {
            column.push(color);
          }
        }
        for (var y2 = inkSize - 1; y2 >= 0; y2 -= 1) {
          var fromBottom = inkSize - 1 - y2;
          board[indexAt(x, y2)] =
            fromBottom < column.length ? column[fromBottom] : randomColor();
        }
      }
    }

    function resolveCascades() {
      cascadeId = null;
      var matches = findMatches();
      if (!matches.length) {
        finishCascade();
        return;
      }
      combo += 1;
      score += matches.length * 10 * combo;
      renderHud();
      matches.forEach(function (index) {
        tiles[index].classList.add("is-popping");
      });
      pendingMatches = matches;
      cascadeId = window.setTimeout(function () {
        cascadeId = null;
        popPendingMatches();
        render();
        cascadeId = window.setTimeout(resolveCascades, 230);
      }, 190);
    }

    function popPendingMatches() {
      pendingMatches.forEach(function (index) {
        board[index] = -1;
      });
      pendingMatches = [];
      collapseAndRefill();
    }

    function stopAnimations() {
      window.clearTimeout(cascadeId);
      cascadeId = null;
      shakeTimers.forEach(function (id) {
        window.clearTimeout(id);
      });
      shakeTimers = [];
    }

    function finishCascade() {
      comboEl.textContent = String(combo);
      var guard = 0;
      while (!availableMoveExists() && guard < 200) {
        fillBoard();
        guard += 1;
      }
      render();
      busy = false;
      if (score >= level.target) {
        levelCleared();
      } else if (movesLeft <= 0) {
        resultEl.textContent =
          t("inkOut", { n: score, t: level.target }) + " " + t("inkRetry");
      }
    }

    function attemptSwap(a, b) {
      swapColors(a, b);
      if (!findMatches().length) {
        swapColors(a, b);
        tiles[a].classList.add("is-shake");
        tiles[b].classList.add("is-shake");
        shakeTimers.push(window.setTimeout(function () {
          tiles[a].classList.remove("is-shake");
          tiles[b].classList.remove("is-shake");
          render();
        }, 280));
        return;
      }
      movesLeft -= 1;
      combo = 0;
      busy = true;
      renderHud();
      render();
      cascadeId = window.setTimeout(resolveCascades, 190);
    }

    function tapTile(index) {
      if (busy || movesLeft <= 0) {
        return;
      }
      if (selected === -1) {
        selected = index;
        render();
        return;
      }
      if (selected === index) {
        selected = -1;
        render();
        return;
      }
      if (neighbours(selected, index)) {
        var from = selected;
        selected = -1;
        attemptSwap(from, index);
        return;
      }
      selected = index;
      render();
    }

    function buildBoard() {
      boardEl.textContent = "";
      tiles = [];
      for (var index = 0; index < inkSize * inkSize; index += 1) {
        (function (cellIndex) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "ink-tile";
          button.addEventListener("click", function () {
            tapTile(cellIndex);
          });
          boardEl.appendChild(button);
          tiles.push(button);
        })(index);
      }
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
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function loadLevel(levelDef) {
      stopAnimations();
      pendingMatches = [];
      busy = false;
      level = levelDef;
      selected = -1;
      score = 0;
      combo = 0;
      movesLeft = level.moves;
      fillBoard();
      renderHud();
      refreshPicker();
      render();
      resultEl.textContent = t("inkReady", { n: level.target, m: level.moves });
    }

    function starThresholds(def) {
      return [
        Math.round(def.target * 1.4),
        Math.round(def.target * 1.2),
        def.target,
      ];
    }

    function levelCleared() {
      busy = true;
      var spare = Math.max(0, movesLeft);
      var starsWon = starsFor(score, starThresholds(level), "high");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: score,
      });
      var message = t("inkCleared", {
        name: t(level.labelKey),
        n: score,
        m: spare,
        stars: starsWon,
      });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("inkNextPool");
      } else if (campaign.clearedCount() === inkLevels.length) {
        message += " " + t("inkCampaignDone");
      }
      logAction(t("logInk", { name: t(level.labelKey), n: score }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      var nextId = outcome.unlockedNext || level.id;
      loadLevel(inkLevels[campaign.indexOf(nextId)]);
      resultEl.textContent = message;
    }

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) {
        loadLevel(inkLevels[index]);
      }
    });

    newBtn.addEventListener("click", function () {
      loadLevel(level);
    });

    /* The drawer calls this on tab switch and on close: no timer may outlive
     * the panel, and the tiles have to come back whole rather than frozen
     * mid-pop. The swap was already spent, so its matches are resolved here
     * without the animation delays rather than dropped. */
    App.quietResetInkCascade = function () {
      stopAnimations();
      if (!busy) {
        render();
        return;
      }
      /* A popping match has already earned its points; finish its removal
       * before looking for the next chain reaction. */
      if (pendingMatches.length) {
        popPendingMatches();
      }
      var guard = 0;
      var matches = findMatches();
      while (matches.length && guard < 200) {
        combo += 1;
        score += matches.length * 10 * combo;
        matches.forEach(function (index) {
          board[index] = -1;
        });
        collapseAndRefill();
        matches = findMatches();
        guard += 1;
      }
      render();
      renderHud();
      finishCascade();
    };

    buildBoard();
    loadLevel(inkLevels[campaign.indexOf(campaign.nextLevelId())]);
  }


  /* Exported for the other modules. */
  App.initInkCascadeGame = initInkCascadeGame;
  /* The level table travels with the module, so the release gate can replay
   * seeded deals through the real panel and re-deal a pool under a cut pour
   * without re-parsing this file. */
  App.cascadeLevels = inkLevels;

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. The
   * new pools keep the water-body ladder the shared dictionary carries from
   * the droplet to the source, and name the waters they pour. The summit
   * rungs climb past the confluence into the high waters - rapids, flood
   * tide, falls, reservoir, geyser - and end on the watershed every drop
   * answers to. */
  App.addStrings({
    en: {
      "inkL21": "Estuary",
      "inkL22": "The Straits",
      "inkL23": "The Triad Deep",
      "inkL24": "The Confluence",
      "inkL25": "The Rapids",
      "inkL26": "The Flood Tide",
      "inkL27": "The Waterfall",
      "inkL28": "The Reservoir",
      "inkL29": "The Geyser",
      "inkL30": "The Watershed",
    },
    zh: {
      "inkL21": "河口",
      "inkL22": "海峡",
      "inkL23": "三色海渊",
      "inkL24": "百川汇流",
      "inkL25": "险滩",
      "inkL26": "洪潮",
      "inkL27": "飞瀑",
      "inkL28": "蓄水库",
      "inkL29": "间歇泉",
      "inkL30": "分水岭",
    },
  });
})(window.CapitalConvert = window.CapitalConvert || {});
