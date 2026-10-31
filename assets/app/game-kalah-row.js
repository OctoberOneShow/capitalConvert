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

    /* Ranks 21-24: the tier past the sovereign keeps the search exactly where
     * the sovereign left it and spends the climb on the prices instead.
     * Twenty-one guards one stone more against the freeze - fifteen now -
     * and pays for the extra guard with the tell a touch wider; twenty-two
     * prices a star pit higher than any rank before it, planting singles
     * opposite your loaded pits and farming them; twenty-three takes both
     * endurance levers at once, sixteen stones against the freeze and a
     * spare turn priced at five, and wins by outlasting rather than
     * outcounting; and the last ring of the row combines the lot - the star
     * price, the deep guard, the five-stone tempo - then stops erring: the
     * blind sow all but gone and no tell at all. A seventh deny was benched
     * for the tier and rejected: priced above six the refusal distorts the
     * sow and the rank measures softer than the sovereign, so the
     * sovereign's six stands; a node budget past three thousand was benched
     * beside it and measured game for game with the sovereign's - past that
     * the ring has no more bottom to read. Every rank below was run against
     * the same seeded bench that judged the twenty above - beaten outright
     * in at least one game in twenty and by its own three-star margin in at
     * least three games in twenty - before it shipped. */
    { id: "m21", labelKey: "malR21", depth: 8, noise: 0, keep: 15, threat: 4, deny: 6, tempo: 4.5, count: 28, nodes: 3000, slip: 0.02, flub: 0.08, margin: [3, 2, 1] },
    { id: "m22", labelKey: "malR22", depth: 8, noise: 0, keep: 14, threat: 4.5, deny: 6, tempo: 4.5, count: 28, nodes: 3000, slip: 0.02, flub: 0.08, margin: [3, 2, 1] },
    { id: "m23", labelKey: "malR23", depth: 8, noise: 0, keep: 16, threat: 4, deny: 6, tempo: 5, count: 28, nodes: 3000, slip: 0.01, flub: 0.08, margin: [3, 2, 1] },
    { id: "m24", labelKey: "malR24", depth: 8, noise: 0, keep: 16, threat: 4.5, deny: 6, tempo: 5, count: 28, nodes: 3000, slip: 0, flub: 0.04, margin: [3, 2, 1] },

    /* Ranks 25-30: the ransom tier. The play stays exactly the seamless
     * ring's - depth eight, sixteen guarded stones, the four-and-a-half
     * threat, six denials, the five-stone tempo, the twenty-eight count,
     * the three-thousand node budget, flub 0.04 - and the climb is charged
     * on the score instead: each rung asks to be beaten by more stones than
     * the last, five, nine, thirteen, seventeen, nineteen and twenty-five,
     * with the two-star band set a shade over half the three-star line off
     * the margins the bench actually pays and the one-star line left at any
     * win. A rout that big has to come from somewhere: the seamless ring's
     * own losses never reach twenty-five, so from twenty-seven on the tell
     * reopens - the runner-up sow played at three and then twelve games in
     * a hundred - and the deep bands are paid out of that tell. Deeper cups
     * were benched for the tier and rejected: from five through sixteen
     * stones a cup the bench's outcome goes bimodal, it either routs the
     * rank outright or never wins a game, so no deep-cups rank can be
     * judged hard-but-fair by the bench at all. Every rank below was run
     * against the same seeded bench that judged the twenty-four above,
     * beaten outright in at least one game in twenty and by its own
     * three-star band in at least three games in twenty - before it
     * shipped: band 5 at 20% (wins 20%), 9 at 18% (20%), 13 at 23% (30%),
     * 17 at 20% (30%), 19 at 33% (48%) and 25 at 20% (48%). */
    { id: "m25", labelKey: "malR25", depth: 8, noise: 0, keep: 16, threat: 4.5, deny: 6, tempo: 5, count: 28, nodes: 3000, slip: 0, flub: 0.04, margin: [5, 3, 1] },
    { id: "m26", labelKey: "malR26", depth: 8, noise: 0, keep: 16, threat: 4.5, deny: 6, tempo: 5, count: 28, nodes: 3000, slip: 0, flub: 0.04, margin: [9, 5, 1] },
    { id: "m27", labelKey: "malR27", depth: 8, noise: 0, keep: 16, threat: 4.5, deny: 6, tempo: 5, count: 28, nodes: 3000, slip: 0.03, flub: 0.04, margin: [13, 8, 1] },
    { id: "m28", labelKey: "malR28", depth: 8, noise: 0, keep: 16, threat: 4.5, deny: 6, tempo: 5, count: 28, nodes: 3000, slip: 0.03, flub: 0.04, margin: [17, 10, 1] },
    { id: "m29", labelKey: "malR29", depth: 8, noise: 0, keep: 16, threat: 4.5, deny: 6, tempo: 5, count: 28, nodes: 3000, slip: 0.12, flub: 0.04, margin: [19, 12, 1] },
    { id: "m30", labelKey: "malR30", depth: 8, noise: 0, keep: 16, threat: 4.5, deny: 6, tempo: 5, count: 28, nodes: 3000, slip: 0.12, flub: 0.04, margin: [25, 15, 1] },

    /* Ranks 31-40: the audit tier. The row re-benches every lever it has
     * left and finds most of them dead. A wider count and a deeper budget
     * measure game for game with the seamless ring's - past twenty-four
     * stones a board and three thousand nodes there is no more ring to
     * read. A wider guard, a dearer star price and a dearer spare turn
     * never move a hand in clean play: zero of forty seeded games change
     * under each, so the ring's sixteen, four-and-a-half and five stand.
     * The prepared book still gets punished. What bites is the refusal,
     * the blind sow, the tell and the toll, and the climb rides exactly
     * those four. Thirty-one prices the refusal at seven stones - benched
     * twice before and shipped here knowingly, its flip provable on a
     * live board and its cost visible in the cut bench; thirty-two halves
     * the blind sow; thirty-three stops erring outright. From thirty-four
     * on the toll climbs past the gilded ring -
     * twenty-seven, twenty-nine, thirty-one, thirty-three, thirty-five,
     * thirty-seven, thirty-nine - each step paid for by a wider tell,
     * because the ring's own twelve-in-a-hundred tell is already out of
     * the band by twenty-nine stones (a game in eight) and pays the
     * thirty-ninth toll in not one game of forty. Two tells were benched
     * for the tier and measured
     * dead: fifteen in a hundred pays less than the steps either side of
     * it at every toll it could carry, and thirty reads a step behind
     * thirty-three from thirty-five stones up - so the tell jumps. The
     * toll, tell and two-star lines never fall within the tier, and the
     * capstone pairs the largest toll the row has ever asked with the
     * dearest two-star band any rank has carried. Where the measured
     * shares rise mid-tier the cause is pinned in the rung's own comment:
     * the refusal gives games away, and a tell eases the band the step it
     * lands on. Every rank below was run against the same seeded bench
     * that judged the thirty above - beaten outright in at least one game
     * in twenty and by its own three-star band in at least three games in
     * twenty - before it shipped: band 25 at 25% (wins 45%), 25 at 32.5%
     * (47.5%), 25 at 17.5% (30%), 27 at 32.5% (52.5%), 29 at 27.5%
     * (52.5%), 31 at 20% (52.5%), 33 at 17.5% (50%), 35 at 20% (52.5%),
     * 37 at 20% (52.5%) and 39 at 15% (52.5%). And every record below was
     * proved load-bearing by cutting it out of a copy of its own rank and
     * re-benching the cut: the refusal cut back to six gives the band
     * back (25% to 20%), the half sow and the zero sow each give back the
     * rank below's own bench, the ring's tell pays the summit tolls in
     * 15%, 10%, 5% and 2.5% of games and not at all at thirty-nine, and
     * the toll steps measure out to the rank below's bench wherever the
     * tell is held. */
    /* The Locked Purse: the first seven-stone refusal, one stone past the
     * seventeenth stool's six. The flip is provable on a live board - at
     * six the hand sows and leaves the rival a star pit, at seven it
     * refuses - and the cut bench shows the price is load-bearing in both
     * directions: the band lands a quarter of the time where the seamless
     * ring took a fifth, cut back to six and it gives the games back. */
    { id: "m31", labelKey: "malR31", depth: 8, noise: 0, keep: 16, threat: 4.5, deny: 7, tempo: 5, count: 28, nodes: 3000, slip: 0.12, flub: 0.04, margin: [25, 15, 1] },
    /* The blind sow halves: one game in fifty now, where every rank since
     * the fourth stool learned the habit it erred a game in twenty-five or
     * worse. The band eases the step the halving lands on - the surviving
     * flubs reshape the stream - and cutting it back to .04 gives back the
     * Locked Purse's own bench exactly. */
    { id: "m32", labelKey: "malR32", depth: 8, noise: 0, keep: 16, threat: 4.5, deny: 7, tempo: 5, count: 28, nodes: 3000, slip: 0.12, flub: 0.02, margin: [25, 15, 1] },
    /* The first erring rank of the forty to stop blundering outright -
     * the three teaching stools never erred because they never learned the
     * ring, and every rank since the fourth did until now. Cut the zero
     * back to the half sow and the band share nearly doubles - the blind
     * sow was the last softness the ring had, and it is gone. */
    { id: "m33", labelKey: "malR33", depth: 8, noise: 0, keep: 16, threat: 4.5, deny: 7, tempo: 5, count: 28, nodes: 3000, slip: 0.12, flub: 0, margin: [25, 15, 1] },
    /* The toll steps past the gilded ring - twenty-seven - and the tell
     * widens past the ransom tier's twelve to pay it: eighteen in a
     * hundred. The ring's own tell at this toll rides the fairness floor,
     * the new tell eases the band to a third of games, and cutting it
     * back drops the toll to that floor. */
    { id: "m34", labelKey: "malR34", depth: 8, noise: 0, keep: 16, threat: 4.5, deny: 7, tempo: 5, count: 28, nodes: 3000, slip: 0.18, flub: 0, margin: [27, 16, 1] },
    { id: "m35", labelKey: "malR35", depth: 8, noise: 0, keep: 16, threat: 4.5, deny: 7, tempo: 5, count: 28, nodes: 3000, slip: 0.18, flub: 0, margin: [29, 17, 1] },
    /* Twenty-nine and thirty-one on the same eighteen tell; cutting the
     * toll back a step measures out to the rung below's own bench. */
    { id: "m36", labelKey: "malR36", depth: 8, noise: 0, keep: 16, threat: 4.5, deny: 7, tempo: 5, count: 28, nodes: 3000, slip: 0.18, flub: 0, margin: [31, 19, 1] },
    /* The tell reaches twenty-four in a hundred to carry thirty-three -
     * the toll the ring's tell cannot pay at all; cut back to twelve the
     * band lands in a game in ten. */
    { id: "m37", labelKey: "malR37", depth: 8, noise: 0, keep: 16, threat: 4.5, deny: 7, tempo: 5, count: 28, nodes: 3000, slip: 0.24, flub: 0, margin: [33, 20, 1] },
    /* Thirty-five and thirty-seven on the widest tell the row has dealt:
     * a third of its hands play the runner-up sow. Thirty in a hundred
     * was benched between and measured a step behind thirty-three at
     * every toll from thirty-five up - the tell jumps the dead step -
     * and the ring's own tell pays these tolls in one game in twenty and
     * one in forty. */
    { id: "m38", labelKey: "malR38", depth: 8, noise: 0, keep: 16, threat: 4.5, deny: 7, tempo: 5, count: 28, nodes: 3000, slip: 0.33, flub: 0, margin: [35, 21, 1] },
    { id: "m39", labelKey: "malR39", depth: 8, noise: 0, keep: 16, threat: 4.5, deny: 7, tempo: 5, count: 28, nodes: 3000, slip: 0.33, flub: 0, margin: [37, 22, 1] },
    /* The Final Audit: the largest toll the row has ever asked - the ring's
     * own tell pays it in not one game of forty - and the dearest two-star
     * band any rank has carried: a win by twenty-five for the second star,
     * where the tolls below it stopped at twenty-two. */
    { id: "m40", labelKey: "malR40", depth: 8, noise: 0, keep: 16, threat: 4.5, deny: 7, tempo: 5, count: 28, nodes: 3000, slip: 0.33, flub: 0, margin: [39, 25, 1] },
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
      "malR21": "The Hoard Warden",
      "malR22": "The Star Farmer",
      "malR23": "The Long Siege",
      "malR24": "The Seamless Ring",
      "malR25": "The Toll",
      "malR26": "The Heavy Purse",
      "malR27": "The Tribute Collector",
      "malR28": "The Ledger Keeper",
      "malR29": "The King's Ransom",
      "malR30": "The Gilded Ring",
      "malR31": "The Locked Purse",
      "malR32": "The Steadier Hand",
      "malR33": "The Clear Eye",
      "malR34": "The Tollgate",
      "malR35": "The Counting House",
      "malR36": "The Salt Tax",
      "malR37": "The Land Rent",
      "malR38": "The War Levy",
      "malR39": "The Tithe",
      "malR40": "The Final Audit",
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
      "malR21": "守仓翁",
      "malR22": "养星手",
      "malR23": "长围手",
      "malR24": "无缝之环",
      "malR25": "买路钱",
      "malR26": "沉钱袋",
      "malR27": "收贡者",
      "malR28": "记账翁",
      "malR29": "王者赎金",
      "malR30": "鎏金之环",
      "malR31": "锁袋翁",
      "malR32": "稳手客",
      "malR33": "明眼手",
      "malR34": "大关卡",
      "malR35": "账房",
      "malR36": "盐税",
      "malR37": "田租",
      "malR38": "战捐",
      "malR39": "什一税",
      "malR40": "终局清账",
    },
  });


  /* Exported for the other modules. */
  App.kalahSow = malSow;
  App.kalahFresh = malFresh;
  App.kalahLegal = malLegal;
  App.kalahTally = malTally;
  App.initMancalaGame = initMancalaGame;
})(window.CapitalConvert = window.CapitalConvert || {});
