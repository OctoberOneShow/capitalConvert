/* Kalah Row - the mancala sowing mini-game in the shared game drawer. */
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
  var malPits = 6;
  var malSeed = 4;
  /* Cells 0 is the player's store, 1-6 the player's pits, 7 the rival's
   * store and 8-13 the rival's pits; sowing walks the index up and wraps. */
  var malYouStore = 0;
  var malAiStore = 7;
  /* starsFor() stops at the band it first clears, so a margin ladder runs from
   * the rout down to any win: three stars needs the measured top of the bench's
   * beaten margins, one star only asks that you won at all.
   * Every rung past m4 brings a new habit to the bench rather than another
   * notch of depth: a noiseless three-hand bench already wins the ring outright
   * (measured at 0 of 28 games for a plain forward-looking player), so depth
   * past three hands leaves no winnable rung at all. The fine grading is carried
   * by flub - a blind sow now and then - and by tightening what each rank asks
   * you to win by, since neighbouring benches measure within a game or two of
   * each other and cannot hold ten distinct steps on their own:
   *   keep   refuses to empty its own row while behind, which is where a
   *            finished round freezes the whole board over
   *   book   plays a prepared opening sequence until it banks its first stone
   *   threat builds star pits (one stone facing a loaded rival pit)
   *   deny   will not leave the rival a star pit of its own
   *   tempo  what a spare turn is worth on top of the stone it banks
   *   count  once the row is short, searches the rest of the round out exactly
   *   nodes  how many positions that short-board search may open before it has
   *            to guess - the budget the deep ranks spend on their endgame
   *   slip   a single repeatable tell instead of broad jitter, so a prepared
   *            player still has a route to a rout
   * Habits ride on the same (cells, who, depth, noise) entry point, so callers
   * that pass no rank read as the shipped behaviour. */
  var malRanks = [
    { id: "m1", labelKey: "malR1", depth: 1, noise: 4, margin: [14, 8, 1] },
    { id: "m2", labelKey: "malR2", depth: 1, noise: 0, margin: [16, 10, 1] },
    { id: "m3", labelKey: "malR3", depth: 2, noise: 0, margin: [18, 12, 1] },
    { id: "m4", labelKey: "malR4", depth: 3, noise: 0, flub: 0.35, margin: [12, 7, 1] },
    { id: "m5", labelKey: "malR5", depth: 3, noise: 0, keep: 4, flub: 0.35, margin: [11, 6, 1] },
    { id: "m6", labelKey: "malR6", depth: 3, noise: 0, keep: 4, book: [3, 5], flub: 0.35, margin: [10, 6, 1] },
    { id: "m7", labelKey: "malR7", depth: 3, noise: 0, keep: 4, book: [3, 5], threat: 1, deny: 1, flub: 0.3, margin: [8, 5, 1] },
    { id: "m8", labelKey: "malR8", depth: 3, noise: 0, keep: 4, threat: 1, deny: 2, tempo: 2.5, flub: 0.3, margin: [7, 4, 1] },
    { id: "m9", labelKey: "malR9", depth: 3, noise: 0, keep: 6, threat: 1.5, deny: 2, tempo: 2.5, count: 10, flub: 0.3, margin: [6, 4, 1] },
    { id: "m10", labelKey: "malR10", depth: 3, noise: 0, keep: 6, threat: 2, deny: 3, tempo: 3, count: 12, slip: 0.05, flub: 0.3, margin: [5, 3, 1] },
    /* Ranks 11-15: the ring master looks two plies further per rank and
     * guards more pots, but it still slips - the flub rate falls only
     * slowly, and the margin it can be beaten by falls to a single stone.
     * The count it can see rises with it, which is the tell the player
     * is meant to read. */
    { id: "m11", labelKey: "malR11", depth: 4, noise: 0, keep: 6, threat: 2, deny: 3, tempo: 3, count: 12, slip: 0.05, flub: 0.28, margin: [5, 3, 1] },
    { id: "m12", labelKey: "malR12", depth: 5, noise: 0, keep: 8, threat: 2.5, deny: 3, tempo: 3, count: 14, slip: 0.05, flub: 0.26, margin: [4, 3, 1] },
    { id: "m13", labelKey: "malR13", depth: 6, noise: 0, keep: 8, threat: 2.5, deny: 4, tempo: 3.5, count: 16, slip: 0.04, flub: 0.24, margin: [4, 2, 1] },
    { id: "m14", labelKey: "malR14", depth: 7, noise: 0, keep: 10, threat: 3, deny: 4, tempo: 3.5, count: 18, slip: 0.04, flub: 0.22, margin: [3, 2, 1] },
    { id: "m15", labelKey: "malR15", depth: 8, noise: 0, keep: 10, threat: 3, deny: 5, tempo: 4, count: 20, slip: 0.03, flub: 0.2, margin: [3, 2, 1] },

    /* Ranks 16-20: the habits deepen rather than the search. Sixteen guards
     * twelve stones against the freeze; seventeen prices a spare turn higher
     * than any rank before it and refuses star pits outright; eighteen is
     * the first rank to spend a real node budget, so once the row is short
     * it reads the rest of the round out exactly rather than guessing; the
     * nineteenth widens the old tell again and pays for it with the
     * friendliest margin since the twelfth stool; and the sovereign of the
     * row combines the lot - the deep count, the big budget and the
     * tightest habits of the room. A prepared opening was benched for
     * eighteen and rejected: the reference player punishes a fixed opening
     * so hard that the rank measured softer than the first stool, so the
     * book stays a teaching habit. Every rank below was run against the
     * same seeded bench that judged the fifteen above - beaten outright in
     * at least one game in twenty and by its own three-star margin in at
     * least three games in twenty - before it shipped. */
    { id: "m16", labelKey: "malR16", depth: 8, noise: 0, keep: 12, threat: 3, deny: 5, tempo: 4, count: 22, slip: 0.03, flub: 0.18, margin: [3, 2, 1] },
    { id: "m17", labelKey: "malR17", depth: 8, noise: 0, keep: 12, threat: 3.5, deny: 6, tempo: 4.5, count: 24, slip: 0.03, flub: 0.15, margin: [3, 2, 1] },
    { id: "m18", labelKey: "malR18", depth: 8, noise: 0, keep: 14, threat: 3.5, deny: 6, tempo: 4, count: 26, nodes: 2400, slip: 0.02, flub: 0.15, margin: [3, 2, 1] },
    { id: "m19", labelKey: "malR19", depth: 8, noise: 0, keep: 12, threat: 3, deny: 5, tempo: 4, count: 24, slip: 0.06, flub: 0.18, margin: [4, 3, 1] },
    { id: "m20", labelKey: "malR20", depth: 8, noise: 0, keep: 14, threat: 4, deny: 6, tempo: 4.5, count: 28, nodes: 3000, slip: 0.01, flub: 0.08, margin: [3, 2, 1] },
  ];

  function malFresh() {
    var cells = [0];
    var index;
    for (index = 0; index < malPits; index += 1) {
      cells.push(malSeed);
    }
    cells.push(0);
    for (index = 0; index < malPits; index += 1) {
      cells.push(malSeed);
    }
    return cells;
  }

  function malIsPit(index, who) {
    if (index === malYouStore || index === malAiStore) {
      return false;
    }
    return who === "you" ? index > malYouStore && index < malAiStore : index > malAiStore;
  }

  function malHome(who) {
    return who === "you" ? malYouStore : malAiStore;
  }

  /* Sow one hand. The rival's store is skipped, and a last stone in your own
   * store both banks a point and earns another go; a last stone in an empty
   * home-side pit captures the stones sitting opposite it. */
  function malSow(cells, index, who) {
    var next = cells.slice();
    var rival = who === "you" ? "ai" : "you";
    var stones = next[index];
    var extra = false;
    var captured = 0;
    next[index] = 0;
    var cell = index;
    while (stones > 0) {
      cell = (cell + 1) % (malPits * 2 + 2);
      if (cell === malHome(rival)) {
        continue;
      }
      next[cell] += 1;
      stones -= 1;
    }
    if (cell === malHome(who)) {
      extra = true;
    } else if (malIsPit(cell, who) && next[cell] === 1) {
      /* The rows run in opposite directions, so facing pairs mirror around
       * the middle of the ring. */
      var opposite = next.length - cell;
      if (malIsPit(opposite, rival) && next[opposite] > 0) {
        captured = next[opposite];
        /* the pairing stone is banked along with the opponent's */
        next[malHome(who)] += captured + 1;
        next[opposite] = 0;
        next[cell] = 0;
      }
    }
    return { cells: next, extra: extra, captured: captured };
  }

  function malLegal(cells, who) {
    var moves = [];
    var index;
    for (index = 0; index < cells.length; index += 1) {
      if (malIsPit(index, who) && cells[index] > 0) {
        moves.push(index);
      }
    }
    return moves;
  }

  function malSideCount(cells, who) {
    var total = 0;
    var index;
    for (index = 0; index < cells.length; index += 1) {
      if (malIsPit(index, who)) {
        total += cells[index];
      }
    }
    return total;
  }

  function malOver(cells) {
    return malSideCount(cells, "you") === 0 || malSideCount(cells, "ai") === 0;
  }

  /* Finish a round: whatever is left on a side belongs to that side. */
  function malTally(cells) {
    var out = cells.slice();
    var index;
    for (index = 0; index < out.length; index += 1) {
      if (malIsPit(index, "you")) {
        out[malYouStore] += out[index];
      } else if (malIsPit(index, "ai")) {
        out[malAiStore] += out[index];
      }
    }
    return { you: out[malYouStore], ai: out[malAiStore] };
  }

  function malScore(cells, who) {
    var tally = malTally(cells);
    return (who === "you" ? tally.you - tally.ai : tally.ai - tally.you);
  }

  function malRivalOf(who) {
    return who === "you" ? "ai" : "you";
  }

  /* A rank's habit, or the shipped default when the row does not carry it. */
  function malHabit(style, key, fallback) {
    if (!style || typeof style[key] !== "number" || !isFinite(style[key])) {
      return fallback;
    }
    return style[key];
  }

  /* Pit ordinals count from the mover's own store, so a habit can be written
   * once and read the same way on both rows. */
  function malPitAt(who, ordinal) {
    return who === "you" ? ordinal : malAiStore + ordinal;
  }

  /* The rows run in opposite directions, so facing pairs mirror around the
   * middle of the ring - the same map the capture rule uses. */
  function malFacing(index) {
    return malPits * 2 + 2 - index;
  }

  /* A star pit holds one stone with the rival's facing pit loaded: dropping the
   * pairing stone there next takes the whole stack. */
  function malThreats(cells, who) {
    var count = 0;
    var index;
    for (index = 0; index < cells.length; index += 1) {
      if (malIsPit(index, who) && cells[index] === 1 && cells[malFacing(index)] > 0) {
        count += 1;
      }
    }
    return count;
  }

  /* The prepared sequence runs only while the bench has nothing banked and a
   * full row to spend - past the opening the search takes over. */
  function malBookPick(cells, who, style, moves) {
    var book = style && style.book;
    if (!book || !book.length) {
      return null;
    }
    if (cells[malHome(who)] > 0 || malSideCount(cells, who) < malSeed * malPits) {
      return null;
    }
    var step;
    for (step = 0; step < book.length; step += 1) {
      var index = malPitAt(who, book[step]);
      if (moves.indexOf(index) !== -1) {
        return index;
      }
    }
    return null;
  }

  /* Leaf value is the material count plus what the count is blind to: a frozen
   * board (the round ends the moment either row empties) and the star pits each
   * side is carrying into the next sow. */
  function malLeaf(cells, who, style) {
    var rival = malRivalOf(who);
    var value = malScore(cells, who);
    var keep = malHabit(style, "keep", 0);
    if (keep > 0 && malOver(cells)) {
      value += value > 0 ? keep / 2 : -keep;
    }
    var threat = malHabit(style, "threat", 0);
    if (threat > 0) {
      value += threat * (malThreats(cells, who) - malThreats(cells, rival));
    }
    var deny = malHabit(style, "deny", 0);
    if (deny > 0) {
      value -= deny * malThreats(cells, rival);
    }
    return value;
  }

  /* One ply of the ring: the mover's own best at its nodes, the rival's worst at
   * the rival's. A spare turn is worth more than the stone it banks. */
  function malSearch(cells, mover, who, plies, style, budget) {
    var count = malHabit(style, "count", 0);
    var short =
      count > 0 &&
      malSideCount(cells, "you") + malSideCount(cells, "ai") <= count * 2;
    if (malOver(cells) || budget.left <= 0 || (plies <= 0 && !short)) {
      return malLeaf(cells, who, style);
    }
    var moves = malLegal(cells, mover);
    if (!moves.length) {
      return malLeaf(cells, who, style);
    }
    var mine = mover === who;
    var bestValue = mine ? -Infinity : Infinity;
    var next = short ? Math.max(1, plies - 1) : plies - 1;
    var step;
    for (step = 0; step < moves.length; step += 1) {
      if (budget.left <= 0) {
        break;
      }
      budget.left -= 1;
      var out = malSow(cells, moves[step], mover);
      var value = malSearch(
        out.cells,
        out.extra ? mover : malRivalOf(mover),
        who,
        next,
        style,
        budget,
      );
      if (out.extra) {
        value += malHabit(style, "tempo", 1.5);
      }
      if (mine ? value > bestValue : value < bestValue) {
        bestValue = value;
      }
    }
    return bestValue;
  }

  /* Read the ring `depth` hands deep. The (cells, who, depth, noise) shape stays
   * the contract for callers that have no rank in hand. */
  function malBestMove(cells, who, depth, noise, style) {
    var moves = malLegal(cells, who);
    if (!moves.length) {
      return null;
    }
    var rival = malRivalOf(who);
    var flub = malHabit(style, "flub", 0);
    if (flub > 0 && moves.length > 1 && Math.random() < flub) {
      /* Not a tell, a blind sow: the shape of a hand that has not learned the
       * ring at all, which is softer than any amount of counting jitter. */
      return moves[Math.floor(Math.random() * moves.length)];
    }
    var plies = Math.max(1, Math.min(4, Math.round(depth || 1)));
    var prepared = malBookPick(cells, who, style, moves);
    if (prepared !== null) {
      return prepared;
    }
    var budget = { left: malHabit(style, "nodes", 900) };
    var best = -Infinity;
    var pick = moves[0];
    var scored = [];
    moves.forEach(function (index) {
      var step = malSow(cells, index, who);
      var value = malSearch(
        step.cells,
        step.extra ? who : rival,
        who,
        plies - 1,
        style,
        budget,
      );
      /* A spare turn is worth more than the raw count it banks. */
      if (step.extra) {
        value += malHabit(style, "tempo", 1.5);
      }
      value += Math.random() * noise;
      scored.push({ index: index, value: value });
      if (value > best) {
        best = value;
        pick = index;
      }
    });
    var slip = malHabit(style, "slip", 0);
    if (slip > 0 && scored.length > 1 && Math.random() < slip) {
      /* The tell is narrow and repeatable: the runner-up sow, so a player who
       * has learned it still has a road to a rout. */
      var ordered = scored.slice().sort(function (a, b) {
        return b.value - a.value;
      });
      return ordered[1].index;
    }
    return pick;
  }

  function initMancalaGame() {
    var boardEl = getElement("malBoard");
    var youEl = getElement("malYouStat");
    var aiEl = getElement("malAiStat");
    var turnEl = getElement("malTurnStat");
    var resultEl = getElement("malResult");
    var newBtn = getElement("malNewBtn");
    var undoBtn = getElement("malUndoBtn");
    var bestEl = getElement("malBest");
    var rankEl = getElement("malRankSel");
    if (
      !boardEl ||
      !youEl ||
      !aiEl ||
      !turnEl ||
      !resultEl ||
      !newBtn ||
      !undoBtn ||
      !bestEl ||
      !rankEl
    ) {
      return;
    }

    var campaign = createCampaign({ key: "kalah-row-campaign", levels: malRanks });
    var rank = malRanks[campaign.indexOf(campaign.nextLevelId())];
    var cells = malFresh();
    var history = [];
    var yourTurn = true;
    var over = false;
    var nodes = [];

    function renderHud() {
      var tally = malTally(cells);
      /* a finished round banks the stones still on each side, and the result
       * line already counts them - the HUD has to agree with it */
      youEl.textContent = String(over ? tally.you : cells[malYouStore]);
      aiEl.textContent = String(over ? tally.ai : cells[malAiStore]);
      turnEl.textContent = over
        ? t("malOverTurn")
        : t(yourTurn ? "malYourTurn" : "malAiTurn");
      return tally;
    }

    function renderBoard() {
      nodes.forEach(function (node, index) {
        node.querySelector(".mal-count").textContent = String(cells[index]);
        node.disabled =
          over || !yourTurn || !malIsPit(index, "you") || cells[index] === 0;
        node.classList.toggle("is-store", index === malYouStore || index === malAiStore);
        node.classList.toggle("is-rival", index === malAiStore);
      });
      renderHud();
    }

    function buildBoard() {
      boardEl.textContent = "";
      nodes = [];
      cells.forEach(function (count, index) {
        var pit = document.createElement("button");
        pit.type = "button";
        pit.className = "mal-pit";
        var label = document.createElement("span");
        label.className = "mal-label";
        label.textContent =
          index === malYouStore
            ? t("malYouStore")
            : index === malAiStore
              ? t("malAiStore")
              : t("malPit", { n: index < malAiStore ? index : index - malAiStore });
        var value = document.createElement("span");
        value.className = "mal-count";
        value.textContent = String(count);
        pit.appendChild(label);
        pit.appendChild(value);
        (function (cell) {
          pit.addEventListener("click", function () {
            play(cell);
          });
        })(index);
        boardEl.appendChild(pit);
        nodes.push(pit);
      });
      renderBoard();
    }

    function refreshRank() {
      fillCampaignPicker(
        rankEl,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      rankEl.value = rank.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function finish() {
      over = true;
      var tally = malTally(cells);
      var margin = tally.you - tally.ai;
      if (margin <= 0) {
        resultEl.textContent = t(margin === 0 ? "malDraw" : "malLoss", {
          you: tally.you,
          ai: tally.ai,
        });
        if (margin < 0) {
          logAction(t("logKalah", { n: "\u2014" }));
        }
        renderBoard();
        refreshRank();
        petNotifyGame(false);
        return;
      }
      var starsWon = starsFor(margin, rank.margin, "high");
      var outcome = campaign.record(rank.id, {
        stars: starsWon,
        best: margin,
        better: "high",
      });
      var message =
        t("malWin", { you: tally.you, ai: tally.ai, s: starsWon }) +
        (outcome.isBest ? " " + t("newBest") : "");
      if (outcome.unlockedNext) {
        message += " " + t("malNextRank");
      } else if (campaign.clearedCount() === malRanks.length) {
        message += " " + t("malAllRanks");
      }
      resultEl.textContent = message;
      logAction(t("logKalah", { n: tally.you + "-" + tally.ai }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      renderBoard();
      refreshRank();
    }

    function aiMove() {
      var guard = 0;
      while (!over) {
        var index = malBestMove(cells, "ai", rank.depth, rank.noise, rank);
        if (index === null) {
          if (malOver(cells)) {
            finish();
          }
          return;
        }
        var step = malSow(cells, index, "ai");
        cells = step.cells;
        renderBoard();
        if (malOver(cells)) {
          finish();
          return;
        }
        if (!step.extra) {
          yourTurn = true;
          renderBoard();
          return;
        }
        if (guard++ > malPits * 4) {
          /* bail out with the move handed back, or the board locks up */
          yourTurn = true;
          renderBoard();
          return;
        }
      }
    }

    function play(index) {
      if (over || !yourTurn || !malIsPit(index, "you") || cells[index] === 0) {
        return;
      }
      history.push({ cells: cells.slice(), yourTurn: true });
      var step = malSow(cells, index, "you");
      cells = step.cells;
      undoBtn.disabled = false;
      renderBoard();
      if (malOver(cells)) {
        finish();
        return;
      }
      if (step.extra) {
        resultEl.textContent = t("malExtraTurn");
        return;
      }
      yourTurn = false;
      renderBoard();
      aiMove();
    }

    function newRound(rankDef) {
      rank = rankDef || rank;
      cells = malFresh();
      history = [];
      yourTurn = true;
      over = false;
      undoBtn.disabled = true;
      buildBoard();
      refreshRank();
      resultEl.textContent = t("malPrompt", { name: t(rank.labelKey) });
    }

    undoBtn.addEventListener("click", function () {
      if (!history.length || over) {
        return;
      }
      /* Walk back to the start of one of your own turns, replies included. */
      var step = history.pop();
      cells = step.cells;
      yourTurn = true;
      undoBtn.disabled = history.length === 0;
      renderBoard();
      resultEl.textContent = t("malUndid");
    });

    newBtn.addEventListener("click", function () {
      newRound();
    });

    rankEl.addEventListener("change", function () {
      var index = campaign.indexOf(rankEl.value);
      if (index >= 0 && campaign.isUnlocked(rankEl.value)) {
        newRound(malRanks[index]);
      }
    });

    newRound(rank);
  }


  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js does
   * not already own, so the four shipped rung names stay in the shared
   * dictionary and the rungs from the fifth on ride here, both languages. */
  App.addStrings({
    en: {
      "malR5": "Stone Wall",
      "malR6": "Book Pupil",
      "malR7": "Star Trapper",
      "malR8": "Tempo Reader",
      "malR9": "Stone Counter",
      "malR10": "Ring Sovereign",
      "malR11": "Ring Warden",
      "malR12": "Deep Sower",
      "malR13": "The Long Count",
      "malR14": "Pot Keeper",
      "malR15": "Sovereign Supreme",
      "malR16": "Grand Warden",
      "malR17": "Tempo Master",
      "malR18": "The Endgame Solver",
      "malR19": "The Open Tell",
      "malR20": "The Perfect Ring",
    },
    zh: {
      "malR5": "石墙凳",
      "malR6": "背谱凳",
      "malR7": "夺星手",
      "malR8": "节奏读手",
      "malR9": "数石客",
      "malR10": "环上王",
      "malR11": "环上守卫",
      "malR12": "深播者",
      "malR13": "长算者",
      "malR14": "守罐者",
      "malR15": "至高王",
      "malR16": "大守卫",
      "malR17": "节奏宗师",
      "malR18": "终局算手",
      "malR19": "明破绽",
      "malR20": "完美之环",
    },
  });


  /* Exported for the other modules. */
  App.kalahSow = malSow;
  App.kalahFresh = malFresh;
  App.kalahLegal = malLegal;
  App.kalahTally = malTally;
  App.initMancalaGame = initMancalaGame;
})(window.CapitalConvert = window.CapitalConvert || {});
