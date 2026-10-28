/* Glyph Dots - The dots-and-boxes mini-game in the shared game drawer. */
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
  var dotsYou = 1;
  var dotsAi = 2;
  /* `boxes` per side; the rank may blunder on purpose so the first board is
   * beatable and the last one is not. Margin bands are boxes won over the AI.
   * The last two ranks buy their strength with a habit, not a number: `setup`
   * and `count` both play out the plate before they lay a safe stick, the first
   * over the fourteen sticks it reads, the second over all of them. Two other
   * habits were built and measured and are not here: an opening chosen by the
   * endgame count (it always agrees with the shortest chain once the sticks are
   * counted) and leaving two boxes to buy the opening beat (it gives the rival
   * five to twelve boxes a game). Ranks 16-20 add two habits of their own,
   * both read where the ones above are: `hold` is the double cross played by
   * the rival - it eats every chain but keeps the last `hold` boxes and hands
   * them back, so the opening lands on the player - and `foeFirst` gives the
   * rival the opening stick, which flips the safe-stick parity. Both are
   * tuned by the headless bench in tools/verify-levels.js. Ranks 21-24 ship
   * no new habit at all - they measure the old ones on plates and in
   * pairings the ladder never tried: the rival's opening stick played on the
   * six-box plate, where the safe sticks run out one turn early and every
   * tail size measures differently than it did on seven, and the blunder
   * played on a flipped plate, where the shake decides whether three stars
   * exist at all. Two concession habits were built and measured for this
   * tier and are not here: opening on purpose while safe sticks remain
   * never once outscores the safe lines under the plate's own playouts, and
   * a tail of three on the flipped seven wins the plate for the rival
   * outright, so the deep rungs tune the tails per plate instead. The deep
   * bands are tuned by the seeded bench in
   * tools/gate-snippets/glyph-dots.js. */
  var dotRanks = [
    { id: "d1", labelKey: "dotsL1", boxes: 3, blunder: 0.4, margin: [3, 2, 1] },
    { id: "d2", labelKey: "dotsL2", boxes: 3, blunder: 0.15, margin: [4, 2, 1] },
    { id: "d3", labelKey: "dotsL3", boxes: 4, blunder: 0.05, margin: [5, 3, 1] },
    { id: "d4", labelKey: "dotsL4", boxes: 4, blunder: 0, margin: [6, 4, 2] },
    { id: "d5", labelKey: "dotsL5", boxes: 5, blunder: 0, margin: [8, 5, 2] },
    { id: "d6", labelKey: "dotsL6", boxes: 5, blunder: 0, margin: [9, 6, 3] },
    { id: "d7", labelKey: "dotsL7", boxes: 3, blunder: 0, margin: [5, 3, 1] },
    { id: "d8", labelKey: "dotsL8", boxes: 4, blunder: 0, margin: [8, 6, 3] },
    {
      id: "d9",
      labelKey: "dotsL9",
      boxes: 4,
      blunder: 0.1,
      setup: true,
      margin: [6, 3, 1],
    },
    {
      id: "d10",
      labelKey: "dotsL10",
      boxes: 5,
      blunder: 0.08,
      count: true,
      margin: [5, 3, 1],
    },
    /* Ranks 11-15: the board grows to six and seven boxes and the rival
     * stops blundering altogether, taking the opening moves and counting
     * the plate from rank 11. The margins it can be beaten by shrink to
     * two boxes, then one - the ladder's own way of raising the bar. */
    { id: "d11", labelKey: "dotsL11", boxes: 5, blunder: 0.06, count: true, margin: [4, 2, 1] },
    { id: "d12", labelKey: "dotsL12", boxes: 6, blunder: 0.05, count: true, margin: [4, 2, 1] },
    { id: "d13", labelKey: "dotsL13", boxes: 6, blunder: 0, setup: true, count: true, margin: [3, 2, 1] },
    { id: "d14", labelKey: "dotsL14", boxes: 6, blunder: 0, setup: true, count: true, edge: 1, margin: [3, 1, 1] },
    { id: "d15", labelKey: "dotsL15", boxes: 7, blunder: 0, setup: true, count: true, edge: 1, margin: [2, 1, 1] },
    /* Ranks 16-20: no bigger plates and no new numbers - three habits the
     * ladder has never shipped. `hold` is the double cross: the rival eats
     * every chain but the last boxes of it and hands those back, so a player
     * who grabs everything inherits every opening (d16 keeps one box, the
     * d20 capstone keeps two). `foeFirst` gives the rival the opening stick,
     * which flips the safe-stick parity the whole ladder above was built on.
     * d17 revisits the blunder on the full-plate reader, and its bands are
     * tuned to the seeded bench in tools/verify-levels.js, not to one line. */
    { id: "d16", labelKey: "dotsL16", boxes: 6, blunder: 0, hold: 1, setup: true, count: true, margin: [10, 6, 2] },
    { id: "d17", labelKey: "dotsL17", boxes: 7, blunder: 0.015, setup: true, count: true, margin: [15, 5, 1] },
    { id: "d18", labelKey: "dotsL18", boxes: 7, blunder: 0, foeFirst: true, setup: true, count: true, margin: [5, 3, 1] },
    { id: "d19", labelKey: "dotsL19", boxes: 7, blunder: 0, hold: 1, foeFirst: true, setup: true, count: true, margin: [7, 4, 1] },
    { id: "d20", labelKey: "dotsL20", boxes: 7, blunder: 0, hold: 2, foeFirst: true, setup: true, count: true, margin: [9, 4, 1] },
    /* Ranks 21-24: the deep tier - the flipped plate, played past the shipped
     * peak. One lesson the ladder has never shipped: the habits are not
     * plate-proof. No rank above pairs the six-box plate with the rival's
     * opening stick (the flipped ranks all play seven), and none pairs a
     * blunder with the first stick either; the deep tier ships both pairings
     * and re-tunes the double cross for the small plate, where the tail that
     * held two on seven must hold one or three to bite at all. d21 holds one
     * back and wins the plate by the narrowest margin on the ladder, d22
     * holds three - the widest tail the small plate bears - d23 shakes the
     * small plate, where three stars land twice in fifteen seeds, and d24
     * shakes the wide plate, whose unshaken line cannot reach the band at
     * all. Every band is tuned to the seeded bench in
     * tools/gate-snippets/glyph-dots.js, which replays the shipped players
     * against every deep deal and every twin. */
    { id: "d21", labelKey: "dotsL21", boxes: 6, blunder: 0, hold: 1, foeFirst: true, setup: true, count: true, margin: [2, 1, 1] },
    { id: "d22", labelKey: "dotsL22", boxes: 6, blunder: 0, hold: 3, foeFirst: true, setup: true, count: true, margin: [4, 2, 1] },
    { id: "d23", labelKey: "dotsL23", boxes: 6, blunder: 0.015, hold: 2, foeFirst: true, setup: true, count: true, margin: [12, 8, 1] },
    { id: "d24", labelKey: "dotsL24", boxes: 7, blunder: 0.015, hold: 2, foeFirst: true, setup: true, count: true, margin: [15, 5, 1] },
  ];

  function dotsIndex(y, x, width) {
    return y * width + x;
  }

  function dotsClone(state) {
    return {
      boxes: state.boxes,
      h: state.h.slice(),
      v: state.v.slice(),
      owner: state.owner.slice(),
    };
  }

  /* The boxes an edge borders, by index. */
  function dotsBoxsBeside(state, kind, index) {
    var boxes = state.boxes;
    if (kind === "h") {
      var hy = Math.floor(index / boxes);
      var hx = index % boxes;
      var side = [];
      if (hy > 0) {
        side.push(dotsIndex(hy - 1, hx, boxes));
      }
      if (hy < boxes) {
        side.push(dotsIndex(hy, hx, boxes));
      }
      return side;
    }
    var vy = Math.floor(index / (boxes + 1));
    var vx = index % (boxes + 1);
    var vs = [];
    if (vx > 0) {
      vs.push(dotsIndex(vy, vx - 1, boxes));
    }
    if (vx < boxes) {
      vs.push(dotsIndex(vy, vx, boxes));
    }
    return vs;
  }

  function dotsSides(state, box) {
    var boxes = state.boxes;
    var y = Math.floor(box / boxes);
    var x = box % boxes;
    var count = 0;
    if (state.h[dotsIndex(y, x, boxes)]) {
      count += 1;
    }
    if (state.h[dotsIndex(y + 1, x, boxes)]) {
      count += 1;
    }
    if (state.v[dotsIndex(y, x, boxes + 1)]) {
      count += 1;
    }
    if (state.v[dotsIndex(y, x + 1, boxes + 1)]) {
      count += 1;
    }
    return count;
  }

  function dotsLegal(state) {
    var moves = [];
    var i;
    for (i = 0; i < state.h.length; i += 1) {
      if (!state.h[i]) {
        moves.push({ kind: "h", index: i });
      }
    }
    for (i = 0; i < state.v.length; i += 1) {
      if (!state.v[i]) {
        moves.push({ kind: "v", index: i });
      }
    }
    return moves;
  }

  /* Claim an edge and report the boxes it closed. */
  function dotsApply(state, move, who) {
    var closed = [];
    state[move.kind][move.index] = who;
    dotsBoxsBeside(state, move.kind, move.index).forEach(function (box) {
      if (dotsSides(state, box) === 4 && !state.owner[box]) {
        state.owner[box] = who;
        closed.push(box);
      }
    });
    return closed;
  }

  function dotsCount(state, who) {
    var total = 0;
    state.owner.forEach(function (owner) {
      if (owner === who) {
        total += 1;
      }
    });
    return total;
  }

  /* An edge is safe while neither neighbour is already three-sided: handing
   * over the fourth stick of a box is the only real mistake in the game. */
  function dotsSafe(state, move) {
    var risky = dotsBoxsBeside(state, move.kind, move.index).some(function (box) {
      return dotsSides(state, box) >= 3;
    });
    return !risky;
  }

  /* How many boxes the opponent collects if we open here and they grab
   * everything that closes, walking the chain to its end. */
  function dotsChainCost(state, move, who) {
    var board = dotsClone(state);
    var foe = who === dotsYou ? dotsAi : dotsYou;
    dotsApply(board, move, who);
    var taken = 0;
    var guard = 0;
    var found = true;
    while (found && guard < 200) {
      found = false;
      var legal = dotsLegal(board);
      for (var i = 0; i < legal.length && !found; i += 1) {
        var probe = dotsClone(board);
        if (dotsApply(probe, legal[i], foe).length) {
          dotsApply(board, legal[i], foe);
          taken += 1;
          found = true;
        }
      }
      guard += 1;
    }
    return taken;
  }

  /* An unclaimed box with three sides is one stick from ours, and that stick is
   * the only place a gift can come from: read straight off the plate, with no
   * clone and no probe, which is what makes the endgame score affordable. */
  function dotsGifts(state) {
    var boxes = state.boxes;
    var gifts = [];
    for (var box = 0; box < state.owner.length; box += 1) {
      if (state.owner[box] || dotsSides(state, box) !== 3) {
        continue;
      }
      var y = Math.floor(box / boxes);
      var x = box % boxes;
      var edges = [
        { kind: "h", index: dotsIndex(y, x, boxes) },
        { kind: "h", index: dotsIndex(y + 1, x, boxes) },
        { kind: "v", index: dotsIndex(y, x, boxes + 1) },
        { kind: "v", index: dotsIndex(y, x + 1, boxes + 1) },
      ];
      for (var i = 0; i < edges.length; i += 1) {
        if (!state[edges[i].kind][edges[i].index]) {
          gifts.push(edges[i]);
          break;
        }
      }
    }
    return gifts;
  }

  /* Boxes the rival collects if we open here - the same answer dotsChainCost
   * gives, walked off the gift list instead of probed stick by stick, which is
   * what makes an endgame score cheap enough to ask for on every stick. */
  function dotsOpenCost(state, move, who) {
    var board = dotsClone(state);
    var foe = who === dotsYou ? dotsAi : dotsYou;
    var taken = 0;
    var guard = 0;
    dotsApply(board, move, who);
    while (guard < 200) {
      var gifts = dotsGifts(board);
      if (!gifts.length) {
        break;
      }
      taken += dotsApply(board, gifts[0], foe).length;
      guard += 1;
    }
    return taken;
  }

  /* Boxes the mover pockets by eating every gift on the plate, one stick at
   * a time - the run the double dealer measures before it holds two back. */
  function dotsGiftRun(state) {
    var board = dotsClone(state);
    var taken = 0;
    var guard = 0;
    while (guard < 200) {
      var gifts = dotsGifts(board);
      if (!gifts.length) {
        break;
      }
      taken += dotsApply(board, gifts[0], dotsAi).length;
      guard += 1;
    }
    return taken;
  }

  /* Boxes nobody owns yet: the double dealer only holds its two back while
   * there is a chain still waiting beyond the run it is declining. */
  function dotsUnclaimed(state) {
    var open = 0;
    state.owner.forEach(function (owner) {
      if (!owner) {
        open += 1;
      }
    });
    return open;
  }

  /* The rival this game has always been: take every gift, else lay a safe
   * stick, else hand over the shortest chain - and never a thought for the
   * parity. Played out to the last stick so a counting rank can score an
   * opening by the boxes it leaves behind, not by the boxes it gives away.
   * Fully deterministic: the plate answers the same way every time. */
  function dotsPlainMove(state, who) {
    var legal = dotsLegal(state);
    var gifts = dotsGifts(state);
    var i;
    if (gifts.length) {
      return gifts[0];
    }
    var safe = [];
    for (i = 0; i < legal.length; i += 1) {
      if (dotsSafe(state, legal[i])) {
        safe.push(legal[i]);
      }
    }
    if (safe.length) {
      return safe[0];
    }
    var cheapest = legal[0];
    var cheapestCost = Infinity;
    for (i = 0; i < legal.length; i += 1) {
      var cost = dotsOpenCost(state, legal[i], who);
      if (cost < cheapestCost) {
        cheapestCost = cost;
        cheapest = legal[i];
      }
    }
    return cheapest;
  }

  /* Final tally, from the first stick onwards: {you, ai} boxes when the plate
   * is empty and both rivals play the shipped habit. */
  function dotsPlayout(state, mover, first) {
    var board = dotsClone(state);
    var foe = mover === dotsYou ? dotsAi : dotsYou;
    var turn = mover;
    var closed = dotsApply(board, first, turn);
    if (!closed.length) {
      turn = foe;
    }
    var guard = 0;
    while (dotsLegal(board).length && guard < 400) {
      var move = dotsPlainMove(board, turn);
      if (!move) {
        break;
      }
      if (!dotsApply(board, move, turn).length) {
        turn = turn === dotsYou ? dotsAi : dotsYou;
      }
      guard += 1;
    }
    return { you: dotsCount(board, dotsYou), ai: dotsCount(board, dotsAi) };
  }

  /* Which of these sticks leaves the counting rival ahead once the whole plate
   * has been handed out? The answer comes from playing the plate out, so the
   * rank is choosing a final score instead of a chain length: it will leave a
   * box on the table, or open a three-box chain instead of a two-box one, when
   * the count says that is the line that wins. Deterministic, and the first
   * best stick wins a tie, which keeps the shipped ordering when nothing is. */
  function dotsCountedScore(state, who, move) {
    var out = dotsPlayout(state, who, move);
    return who === dotsYou ? out.you - out.ai : out.ai - out.you;
  }

  function dotsCountedChoice(state, who, candidates, cap) {
    var best = null;
    var bestScore = null;
    var limit = Math.min(candidates.length, cap);
    for (var i = 0; i < limit; i += 1) {
      var score = dotsCountedScore(state, who, candidates[i]);
      if (bestScore === null || score > bestScore) {
        bestScore = score;
        best = candidates[i];
      }
    }
    return best;
  }

  /* `habit` is the rank row exactly as aiTurn passes it, because blunder, setup
   * and count are one rival: a probe that handed over only the blunder rate
   * measured a weaker opponent than the ladder ships. A bare number still means
   * the old blunder rate, which is what the audits in tools/ call it with, and
   * it keeps the shipped rival for ranks 1-8. */
  function dotsAiMove(state, who, habit) {
    var rank = habit && typeof habit === "object" ? habit : { blunder: habit };
    var blunder = rank.blunder || 0;
    var legal = dotsLegal(state);
    if (!legal.length) {
      return null;
    }
    if (blunder > 0 && Math.random() < blunder) {
      return legal[Math.floor(Math.random() * legal.length)];
    }
    var i;
    var closing = [];
    var safe = [];
    for (i = 0; i < legal.length; i += 1) {
      var probe = dotsClone(state);
      if (dotsApply(probe, legal[i], who).length) {
        closing.push(legal[i]);
      } else if (dotsSafe(state, legal[i])) {
        safe.push(legal[i]);
      }
    }
    /* 1. take any box on the table. The double dealer measures the run
     * first: when the whole gift-run is exactly the two boxes it keeps
     * back and there is a chain still waiting beyond them, it declines
     * and hands the opening over instead - the classic double cross. */
    if (closing.length) {
      if (
        rank.hold &&
        dotsGiftRun(state) === rank.hold &&
        dotsUnclaimed(state) > rank.hold &&
        safe.length
      ) {
        /* decline the run: the safe-stick branch below lays it */
      } else {
        return closing[0];
      }
    }
    /* 2. otherwise play without handing a box over. */
    if (safe.length) {
      /* Ranks 1-8 pick one of these at random, which is how a chain gets built
       * for the rival: the set-up rank plays the stick whose endgame count
       * comes out ahead, so it decides what is left to open, not just what is
       * safe now. It reads fourteen sticks - the last rank reads the whole
       * plate, and on a 5x5 that is worth four boxes a game, because the good
       * stick is usually past the fifteenth. */
      if (rank.setup || rank.count) {
        var picked = dotsCountedChoice(
          state,
          who,
          safe,
          rank.count ? safe.length : 14,
        );
        if (picked) {
          return picked;
        }
      }
      return safe[Math.floor(Math.random() * safe.length)];
    }
    /* 3. forced to open something: give away the shortest chain. Ranks 9 and 10
     * never argue with it: counted against the whole plate, the shortest chain
     * is the answer every time, which is why no row carries an opening habit. */
    var cheapest = null;
    var cheapestCost = Infinity;
    for (i = 0; i < legal.length; i += 1) {
      var cost = dotsChainCost(state, legal[i], who);
      if (cost < cheapestCost) {
        cheapestCost = cost;
        cheapest = legal[i];
      }
    }
    return cheapest || legal[0];
  }

  function initDotsGame() {
    var boardEl = getElement("dotsBoard");
    var youEl = getElement("dotsYouStat");
    var aiEl = getElement("dotsAiStat");
    var turnEl = getElement("dotsTurnStat");
    var resultEl = getElement("dotsResult");
    var newBtn = getElement("dotsNewBtn");
    var bestEl = getElement("dotsBest");
    var rankEl = getElement("dotsRankSel");
    if (
      !boardEl ||
      !youEl ||
      !aiEl ||
      !turnEl ||
      !resultEl ||
      !newBtn ||
      !bestEl ||
      !rankEl
    ) {
      return;
    }

    var campaign = createCampaign({ key: "dots-campaign", levels: dotRanks });
    var rank = dotRanks[campaign.indexOf(campaign.nextLevelId())];
    var state = null;
    var cells = { h: [], v: [], box: [], dot: [] };
    var over = false;
    var yourTurn = true;

    /* The feel layer is optional: some harnesses boot this module without
     * game-fx / game-art, and a missing effect must never eat a turn. */
    var fx = App.fx || {};
    var art = App.art || {};
    var sfx = App.playSfx || function () {};
    var panelEl = panelOf(boardEl);
    var turnChip = turnEl ? turnEl.parentNode : null;
    var youHue = tokenHue("--dots-you-hue", 176);
    var aiHue = tokenHue("--dots-ai-hue", 26);

    /* ------------------------------------------------------------- utilities */

    function panelOf(node) {
      var walk = node;
      while (walk && walk.parentNode) {
        if (String(walk.className || "").indexOf("game-panel") >= 0) {
          return walk;
        }
        walk = walk.parentNode;
      }
      return null;
    }

    function tokenHue(name, fallback) {
      try {
        var value = parseInt(getComputedStyle(boardEl).getPropertyValue(name), 10);
        return isNaN(value) ? fallback : value;
      } catch (error) {
        return fallback;
      }
    }

    function fxCall(name) {
      var fn = fx[name];
      if (typeof fn !== "function") {
        return;
      }
      try {
        fn.apply(fx, Array.prototype.slice.call(arguments, 1));
      } catch (error) {
        /* decoration never breaks a turn */
      }
    }

    function calm() {
      try {
        return (App.isMotionOff && App.isMotionOff()) ||
          document.documentElement.getAttribute("data-motion") === "off";
      } catch (error) {
        return false;
      }
    }

    /* A beat is armed on the node that owns it, not through a class: paintEdges
     * rewrites every edge's class list after each move, and a class that is
     * already applied cannot restart its own animation. */
    function arm(node, spec, delay) {
      if (!node || !node.style || calm()) {
        return;
      }
      node.style.animation = "";
      void node.offsetWidth;
      node.style.animation = spec + " " + (delay || 0) + "ms both";
    }

    function ownerClass(who) {
      return who === dotsYou ? " is-you" : who === dotsAi ? " is-ai" : "";
    }

    function countTo(el, value) {
      if (!el) {
        return;
      }
      var from = parseInt(el.textContent, 10);
      if (isNaN(from)) {
        from = 0;
      }
      if (typeof fx.countUp === "function") {
        fxCall("countUp", el, from, value);
      } else {
        el.textContent = String(value);
      }
    }

    /* --------------------------------------------------------- board geometry */

    function dotAt(y, x) {
      return cells.dot[dotsIndex(y, x, state.boxes + 1)];
    }

    /* The two studs a stick runs between - the joints that react when it lands. */
    function endpoints(kind, index) {
      var boxes = state.boxes;
      if (kind === "h") {
        var hy = Math.floor(index / boxes);
        var hx = index % boxes;
        return [dotAt(hy, hx), dotAt(hy, hx + 1)];
      }
      var vy = Math.floor(index / (boxes + 1));
      var vx = index % (boxes + 1);
      return [dotAt(vy, vx), dotAt(vy + 1, vx)];
    }

    function dotDegree(y, x) {
      var boxes = state.boxes;
      var count = 0;
      if (x < boxes && state.h[dotsIndex(y, x, boxes)]) {
        count += 1;
      }
      if (x > 0 && state.h[dotsIndex(y, x - 1, boxes)]) {
        count += 1;
      }
      if (y < boxes && state.v[dotsIndex(y, x, boxes + 1)]) {
        count += 1;
      }
      if (y > 0 && state.v[dotsIndex(y - 1, x, boxes + 1)]) {
        count += 1;
      }
      return count;
    }

    /* An unclaimed stick beside a three-sided box is a gift; one that would
     * bring a box to three sides is an opening. Both are read from the state,
     * never from the player's guess. */
    function isGift(kind, index) {
      return !dotsSafe(state, { kind: kind, index: index });
    }

    function isOpening(kind, index) {
      var beside = dotsBoxsBeside(state, kind, index);
      for (var i = 0; i < beside.length; i += 1) {
        if (dotsSides(state, beside[i]) === 2) {
          return true;
        }
      }
      return false;
    }

    // -------------------------------------------------------------- painters

    function paintStick(kind, index) {
      var node = cells[kind][index];
      if (!node) {
        return;
      }
      var claimed = state[kind][index];
      var flags = "";
      if (!claimed && !over) {
        flags = isGift(kind, index) ? " is-gift" : isOpening(kind, index) ? " is-risk" : "";
      }
      node.className =
        "dots-edge is-" + (kind === "v" ? "v" : "h") + ownerClass(claimed) + flags;
      /* A taken stick stays clickable: the refusal is the only place the game
       * can show its "no" gesture, and aria-disabled still says it plainly. */
      node.disabled = over;
      node.setAttribute("aria-disabled", claimed ? "true" : "false");
    }

    function paintBox(box, stamp) {
      var node = cells.box[box];
      if (!node) {
        return;
      }
      var owner = state.owner[box];
      var open = !owner && dotsSides(state, box) === 3;
      node.className = "dots-box" + ownerClass(owner) + (open ? " is-open" : "");
      node.setAttribute(
        "role",
        owner ? "img" : "presentation",
      );
      node.setAttribute(
        "aria-label",
        owner ? t(owner === dotsYou ? "dotsYou" : "dotsFoe") : "",
      );
      var mark = node.lastChild;
      var want = owner ? (owner === dotsYou ? "gem" : "flame") : open ? "sparkle" : "";
      if (mark._glyph !== want) {
        mark.textContent = "";
        mark._glyph = want;
        if (want && art.icon) {
          mark.appendChild(
            art.icon(want, { hue: owner === dotsAi ? aiHue : owner ? youHue : 46 }),
          );
        } else if (want) {
          /* No art layer: keep the state legible through shapes, not colour. */
          mark.textContent = owner === dotsYou ? "\u25C6" : "\u2726";
        }
      }
      if (owner && stamp) {
        arm(node.firstChild, "dots-flood 340ms cubic-bezier(0.2,0.9,0.3,1)", stamp);
        arm(mark, "dots-stamp 300ms cubic-bezier(0.34,1.6,0.64,1)", stamp + 90);
      }
    }

    function paintStuds() {
      var boxes = state.boxes;
      for (var y = 0; y <= boxes; y += 1) {
        for (var x = 0; x <= boxes; x += 1) {
          var node = dotAt(y, x);
          if (node) {
            node.setAttribute("data-deg", String(dotDegree(y, x)));
          }
        }
      }
    }

    function paintEdges() {
      var index;
      for (index = 0; index < state.h.length; index += 1) {
        paintStick("h", index);
      }
      for (index = 0; index < state.v.length; index += 1) {
        paintStick("v", index);
      }
    }

    function chipState(node, name) {
      if (!node || !node.classList) {
        return;
      }
      node.classList.remove("is-good");
      node.classList.remove("is-warn");
      if (name) {
        node.classList.add(name);
      }
    }

    function renderHud() {
      countTo(youEl, dotsCount(state, dotsYou));
      countTo(aiEl, dotsCount(state, dotsAi));
      turnEl.textContent = t(yourTurn ? "dotsYourTurn" : "dotsAiTurn");
      chipState(turnChip, over ? "" : yourTurn ? "is-good" : "is-warn");
    }

    function renderAll() {
      var index;
      paintEdges();
      for (index = 0; index < state.owner.length; index += 1) {
        paintBox(index, 0);
      }
      paintStuds();
      renderHud();
    }

    // ---------------------------------------------------------------- build

    function buildBoard(boxes) {
      boardEl.textContent = "";
      cells = { h: [], v: [], box: [], dot: [] };
      boardEl.className = "dots-board";
      boardEl.style.setProperty("--dots-cell", dotsCellSize(boxes) + "px");
      boardEl.style.gridTemplateColumns = new Array(2 * boxes + 1)
        .fill("var(--dots-cell)")
        .join(" ");

      var plate = document.createElement("div");
      plate.className = "dots-plate";
      plate.setAttribute("aria-hidden", "true");
      boardEl.appendChild(plate);

      var side = 2 * boxes + 1;
      for (var r = 0; r < side; r += 1) {
        for (var c = 0; c < side; c += 1) {
          if (r % 2 === 0 && c % 2 === 0) {
            var dot = document.createElement("span");
            dot.className = "dots-dot";
            dot.setAttribute("aria-hidden", "true");
            var body = document.createElement("i");
            body.className = "dots-stud";
            dot.appendChild(body);
            var spark = document.createElement("i");
            spark.className = "dots-spark";
            dot.appendChild(spark);
            cells.dot[dotsIndex(r / 2, c / 2, boxes + 1)] = dot;
            boardEl.appendChild(dot);
          } else if (r % 2 === 0) {
            var hIndex = dotsIndex(r / 2, (c - 1) / 2, boxes);
            var hEdge = makeEdge("h", hIndex, t("dotsEdgeH", { x: (c - 1) / 2 + 1, y: r / 2 + 1 }));
            cells.h[hIndex] = hEdge;
            boardEl.appendChild(hEdge);
          } else if (c % 2 === 0) {
            var vIndex = dotsIndex((r - 1) / 2, c / 2, boxes + 1);
            var vEdge = makeEdge("v", vIndex, t("dotsEdgeV", { x: c / 2 + 1, y: (r - 1) / 2 + 1 }));
            cells.v[vIndex] = vEdge;
            boardEl.appendChild(vEdge);
          } else {
            var boxIndex = dotsIndex((r - 1) / 2, (c - 1) / 2, boxes);
            var boxCell = document.createElement("span");
            boxCell.className = "dots-box";
            var wash = document.createElement("i");
            wash.className = "dots-wash";
            boxCell.appendChild(wash);
            var mark = document.createElement("i");
            mark.className = "dots-mark";
            boxCell.appendChild(mark);
            cells.box[boxIndex] = boxCell;
            boardEl.appendChild(boxCell);
          }
        }
      }
    }

    function makeEdge(axis, index, label) {
      var edge = document.createElement("button");
      var stick = document.createElement("i");
      edge.type = "button";
      edge.className = "dots-edge is-" + axis;
      edge.setAttribute("data-axis", axis);
      edge.setAttribute("aria-label", label);
      stick.className = "dots-stick";
      edge.appendChild(stick);
      (function (cell, axis, index) {
        cell.addEventListener("click", function () {
          play(axis, index, cell);
        });
      })(edge, axis, index);
      return edge;
    }

    function dotsCellSize(boxes) {
      if (boxes <= 3) {
        return 40;
      }
      return boxes === 4 ? 36 : 30;
    }

    /* One move, made visible: the stick draws out of its first stud, the joints
     * it lands on flash, and any box it closes floods and stamps its glyph. The
     * rival's whole turn is painted in one pass, so each beat is armed with a
     * rising delay instead of a timer - the chain unrolls after the click. */
    function commit(kind, index, who, closed, step) {
      var mine = who === dotsYou;
      var audible = mine || step < 3;
      var delay = step * 100;
      var hue = mine ? youHue : aiHue;
      var node = cells[kind][index];
      var i;

      paintStick(kind, index);
      if (node) {
        arm(
          node.firstChild,
          "dots-draw-" + (kind === "v" ? "y" : "x") +
            " 240ms cubic-bezier(0.2,0.85,0.25,1)",
          delay,
        );
      }
      var ends = endpoints(kind, index);
      for (i = 0; i < ends.length; i += 1) {
        if (ends[i]) {
          arm(
            ends[i].lastChild,
            "dots-spark 380ms ease-out",
            delay + (i ? 70 : 0),
          );
        }
      }
      for (i = 0; i < closed.length; i += 1) {
        paintBox(closed[i], delay + 150);
      }
      paintEdges();
      paintStuds();
      renderHud();

      if (audible) {
        sfx(closed.length ? (mine ? "coin" : "score") : mine ? "place" : "tick");
      }
      if (mine) {
        fxCall("ring", node, { hue: hue });
      }
      for (i = 0; i < closed.length; i += 1) {
        var boxNode = cells.box[closed[i]];
        if (mine && boxNode) {
          fxCall("burst", boxNode, {
            kind: closed.length > 1 ? "confetti" : "star",
            count: closed.length > 1 ? 16 : 9,
            hue: hue,
          });
          fxCall("floatText", boxNode, "+1", { kind: "good", hue: hue });
        }
      }
      if (mine && closed.length) {
        /* Closing a box buys another stick, so the reward gets its own beat. */
        sfx("star");
        fxCall("pop", youEl, { scale: 1.22, ms: 220 });
      }
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
      var you = dotsCount(state, dotsYou);
      var ai = dotsCount(state, dotsAi);
      var margin = you - ai;
      if (margin <= 0) {
        resultEl.textContent = t(
          margin === 0 ? "dotsDraw" : "dotsLoss",
          { you: you, ai: ai },
        );
        if (margin < 0) {
          logAction(t("logDots", { n: "\u2014" }));
        }
        renderHud();
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
        t("dotsWin", { you: you, ai: ai, s: starsWon }) +
        (outcome.isBest ? " " + t("newBest") : "");
      if (outcome.unlockedNext) {
        message += " " + t("dotsNextRank");
      } else if (campaign.clearedCount() === dotRanks.length) {
        message += " " + t("dotsAllRanks");
      }
      resultEl.textContent = message;
      logAction(t("logDots", { n: you + "-" + ai }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      renderHud();
      refreshRank();
    }

    /* Both sides loop here: closing a box earns another stick, so a turn can
     * run on until someone is forced to open a chain. */
    function aiTurn() {
      var guard = 0;
      while (dotsLegal(state).length && guard < 200) {
        var move = dotsAiMove(state, dotsAi, rank);
        if (!move) {
          break;
        }
        var closed = dotsApply(state, move, dotsAi);
        renderAll();
        if (!closed.length) {
          break;
        }
        if (!dotsLegal(state).length) {
          finish();
          return;
        }
        guard += 1;
      }
      yourTurn = true;
      renderHud();
    }

    /* The click handler hands over the axis first, the way commit() takes it,
     * so a stick lands on the edge the player actually chose. */
    function play(kind, index) {
      if (over || !yourTurn || state[kind][index]) {
        return;
      }
      var closed = dotsApply(state, { kind: kind, index: index }, dotsYou);
      renderAll();
      if (!dotsLegal(state).length) {
        finish();
        return;
      }
      if (closed.length) {
        return;
      }
      yourTurn = false;
      renderHud();
      aiTurn();
    }

    function newRound(rankDef) {
      rank = rankDef || rank;
      var boxes = rank.boxes;
      state = {
        boxes: boxes,
        h: new Array(boxes * (boxes + 1)).fill(0),
        v: new Array(boxes * (boxes + 1)).fill(0),
        owner: new Array(boxes * boxes).fill(0),
      };
      yourTurn = true;
      over = false;
      buildBoard(boxes);
      renderAll();
      refreshRank();
      resultEl.textContent = t("dotsPrompt", {
        name: t(rank.labelKey),
        n: boxes * boxes,
      });
      /* A rival that takes the first stick flips the parity the whole ladder
       * above was read on: the safe-stick count runs out on the player's
       * turn, so the openings arrive the other way round. */
      if (rank.foeFirst) {
        yourTurn = false;
        renderHud();
        aiTurn();
      }
    }

    newBtn.addEventListener("click", function () {
      newRound();
    });

    rankEl.addEventListener("change", function () {
      var index = campaign.indexOf(rankEl.value);
      if (index >= 0 && campaign.isUnlocked(rankEl.value)) {
        newRound(dotRanks[index]);
      }
    });

    newRound(rank);
  }


  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the eight shipped rung names stay in the shared
   * dictionary and only the new ones ride here. The names say what each
   * rival does: one builds the chains it wants to hold, one reads the whole
   * plate, one keeps two boxes back, one takes the first stick - and the
   * deep tier retunes the keeping for the small flipped plate: one box back,
   * three back, the small plate shaken, the wide plate shaken. */
  App.addStrings({
    en: {
      "dotsL9": "Chainwright",
      "dotsL10": "Plate Reader",
      "dotsL11": "The Counter",
      "dotsL12": "Wide Plate",
      "dotsL13": "The Opener",
      "dotsL14": "Edge Reader",
      "dotsL15": "The Whole Plate",
      "dotsL16": "Two Keeper",
      "dotsL17": "Shaky Reader",
      "dotsL18": "First Stick",
      "dotsL19": "Cold Opening",
      "dotsL20": "Every Habit",
      "dotsL21": "One Keeper",
      "dotsL22": "Three Keeper",
      "dotsL23": "Small Plate",
      "dotsL24": "Shaky Keeper",
    },
    zh: {
      "dotsL9": "织链匠",
      "dotsL10": "读盘师",
      "dotsL11": "计数师",
      "dotsL12": "宽盘者",
      "dotsL13": "开局者",
      "dotsL14": "读边者",
      "dotsL15": "全盘者",
      "dotsL16": "留二者",
      "dotsL17": "颤读者",
      "dotsL18": "先手客",
      "dotsL19": "冷开局",
      "dotsL20": "全技者",
      "dotsL21": "留一者",
      "dotsL22": "留三者",
      "dotsL23": "小盘者",
      "dotsL24": "颤留者",
    },
  });


  /* Exported for the other modules (and for the headless gate, which replays
   * the ranks through this same engine). */
  App.dotsLevels = dotRanks;
  App.dotsAiMove = dotsAiMove;
  App.dotsLegal = dotsLegal;
  App.dotsApply = dotsApply;
  App.dotsCount = dotsCount;
  App.dotsGifts = dotsGifts;
  App.dotsGiftRun = dotsGiftRun;
  App.dotsUnclaimed = dotsUnclaimed;
  App.dotsSafe = dotsSafe;
  App.dotsChainCost = dotsChainCost;
  App.dotsNewState = function (boxes) {
    return {
      boxes: boxes,
      h: new Array(boxes * (boxes + 1)).fill(0),
      v: new Array(boxes * (boxes + 1)).fill(0),
      owner: new Array(boxes * boxes).fill(0),
    };
  };
  App.initDotsGame = initDotsGame;
})(window.CapitalConvert = window.CapitalConvert || {});
