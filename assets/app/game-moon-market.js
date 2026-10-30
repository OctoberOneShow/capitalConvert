/* Moon Market - the seven-day trading floor of the game drawer.
 * Prices come from a seeded walk, so every week replays identically from its
 * seed; the star bands are MEASURED by playing lines over that schedule - the
 * greedy run sets the derived ladder for the seats that ship no measured one of
 * their own - the way the roof garden measures its seconds-to-goal floor. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var mktDays = 7;
  var mktGoodCount = 4;
  var mktGoods = [
    { key: "mktIce", glyph: "I", base: 36 },
    { key: "mktGrain", glyph: "G", base: 24 },
    { key: "mktAlloy", glyph: "A", base: 58 },
    { key: "mktSpore", glyph: "S", base: 15 },
  ];
  /* Event kinds in draw order: dust storm (route shut), embargo (halves a
   * price), bloom (floods supply), heat wave (spikes ice). eventWeights and
   * amp reshape the same generator per seat instead of writing a ruleset for
   * every seat the ladder grew. */
  var mktKinds = ["storm", "embargo", "bloom", "heat"];

  var mktLevels = [
    { id: "m1", labelKey: "mktS1", seed: 1042, start: 140, cap: 8, fee: 1,
      amp: [1, 1, 1, 1], eventWeights: [1, 1, 1, 1], target: 200 },
    { id: "m2", labelKey: "mktS2", seed: 60, start: 150, cap: 10, fee: 1,
      amp: [1, 1, 1, 1], eventWeights: [4, 1, 1, 1], target: 240 },
    { id: "m3", labelKey: "mktS3", seed: 74, start: 130, cap: 12, fee: 2,
      amp: [1.8, 0.3, 0.3, 1.8], eventWeights: [1, 2, 2, 1], target: 240 },
    { id: "m4", labelKey: "mktS4", seed: 64, start: 120, cap: 6, fee: 3,
      amp: [1.2, 1.2, 0.8, 1.4], eventWeights: [2, 1, 1, 1], target: 210 },
    { id: "m5", labelKey: "mktS5", seed: 104, start: 170, cap: 16, fee: 2,
      amp: [1.5, 1.5, 1.5, 1.5], eventWeights: [1, 1, 2, 1], target: 320 },
    /* The appended seats each bend one lever of the same generator instead of
     * adding a rule, and each pins the band its own seat was measured with. */
    { id: "m6", labelKey: "mktS6", seed: 1040, start: 150, cap: 6, fee: 2,
      amp: [4, 0.3, 0.3, 0.3], eventWeights: [1, 1, 1, 6], target: 320,
      starCredits: [630, 475, 320] },
    { id: "m7", labelKey: "mktS7", seed: 1412, start: 200, cap: 14, fee: 8,
      amp: [0.8, 0.8, 0.8, 0.8], eventWeights: [1, 1, 1, 1], target: 460,
      starCredits: [980, 720, 460] },
    { id: "m8", labelKey: "mktS8", seed: 722, start: 100, cap: 1, fee: 1,
      amp: [3, 3, 3, 3], eventWeights: [1, 1, 1, 2], target: 240,
      starCredits: [500, 370, 240] },
    { id: "m9", labelKey: "mktS9", seed: 510, start: 180, cap: 14, fee: 1,
      amp: [0.7, 0.7, 0.7, 0.7], eventWeights: [1, 1, 2, 1], target: 620,
      starCredits: [1055, 840, 620] },
    { id: "m10", labelKey: "mktS10", seed: 854, start: 220, cap: 40, fee: 3,
      amp: [2.4, 2.4, 2.4, 2.4], eventWeights: [1, 1, 1, 2], target: 760,
      starCredits: [1660, 1210, 760] },
    /* Seats 11..20 each bend one lever the generator already reads into a new
     * mechanic and ship the band measured off a line replayed through mktStep:
     * the top rung always sits above what that seat's own greedy run banks. */
    { id: "m11", labelKey: "mktS11", seed: 142, start: 90, cap: 3, fee: 1,
      amp: [1.6, 1.6, 1.6, 1.6], eventWeights: [1, 1, 1, 3], target: 170,
      starCredits: [320, 255, 170] },
    { id: "m12", labelKey: "mktS12", seed: 634, start: 400, cap: 20, fee: 9,
      amp: [0.5, 0.5, 0.5, 0.5], eventWeights: [1, 1, 1, 1], target: 460,
      starCredits: [740, 550, 460] },
    { id: "m13", labelKey: "mktS13", seed: 839, start: 200, cap: 12, fee: 2,
      amp: [1.3, 1.3, 1.3, 0], eventWeights: [1, 1, 5, 1], target: 390,
      starCredits: [495, 450, 390] },
    { id: "m14", labelKey: "mktS14", seed: 1003, start: 240, cap: 14, fee: 1,
      amp: [1.6, 1.6, 1.6, 1.6], eventWeights: [7, 1, 1, 1], target: 510,
      starCredits: [660, 595, 510] },
    { id: "m15", labelKey: "mktS15", seed: 593, start: 420, cap: 10, fee: 6,
      amp: [0.3, 0.3, 2.6, 0.3], eventWeights: [1, 1, 2, 1], target: 990,
      starCredits: [1150, 1060, 990] },
    { id: "m16", labelKey: "mktS16", seed: 757, start: 300, cap: 18, fee: 10,
      amp: [1.8, 1.8, 1.8, 1.8], eventWeights: [1, 1, 2, 1], target: 345,
      starCredits: [450, 420, 345] },
    { id: "m17", labelKey: "mktS17", seed: 265, start: 240, cap: 28, fee: 4,
      amp: [0.25, 3, 0.25, 0.25], eventWeights: [1, 2, 3, 1], target: 335,
      starCredits: [865, 625, 335] },
    { id: "m18", labelKey: "mktS18", seed: 265, start: 320, cap: 12, fee: 4,
      amp: [0, 0.4, 0, 2.2], eventWeights: [3, 3, 3, 1], target: 740,
      starCredits: [1120, 950, 740] },
    { id: "m19", labelKey: "mktS19", seed: 347, start: 220, cap: 16, fee: 4,
      amp: [0, 0, 0.4, 0.4], eventWeights: [0, 0, 0, 7], target: 525,
      starCredits: [785, 670, 525] },
    { id: "m20", labelKey: "mktS20", seed: 1741, start: 240, cap: 18, fee: 2,
      amp: [1.5, 1.5, 1.5, 1.5], eventWeights: [1, 7, 1, 1], target: 390,
      starCredits: [541, 465, 390] },
    /* Seats 21..24 add the tier's own lever, `feeRamp`: the per-unit storage
     * fee grows by that many credits every night (day d charges fee +
     * feeRamp*d), so a hold bought early sleeps cheap and the same cargo
     * carried to the weekend is taxed out of the sky. Every band below was
     * measured by replaying lines through mktStep on the row's own seed: the
     * top rung is a line the seat's ramp-blind greedy run cannot reach, the
     * middle rung sits above that greedy line, and the target sits above what
     * a buy-and-hold carrier banks once the ramp has bitten it. */
    { id: "m21", labelKey: "mktS21", seed: 6908, start: 260, cap: 12, fee: 2,
      amp: [1.2, 1.2, 1.2, 1.2], eventWeights: [1, 1, 2, 1], target: 350, feeRamp: 2,
      starCredits: [753, 598, 350] },
    { id: "m22", labelKey: "mktS22", seed: 1418, start: 300, cap: 14, fee: 2,
      amp: [1.5, 1.5, 1.5, 1.5], eventWeights: [1, 2, 1, 1], target: 430, feeRamp: 4,
      starCredits: [692, 625, 430] },
    { id: "m23", labelKey: "mktS23", seed: 5840, start: 340, cap: 12, fee: 4,
      amp: [1.3, 1.3, 1.3, 1.3], eventWeights: [2, 1, 1, 1], target: 390, feeRamp: 5,
      starCredits: [645, 544, 390] },
    { id: "m24", labelKey: "mktS24", seed: 506, start: 380, cap: 14, fee: 3,
      amp: [1.8, 1.8, 1.8, 1.8], eventWeights: [1, 1, 1, 2], target: 440, feeRamp: 7,
      starCredits: [1133, 819, 440] },
    /* Seats 25..30 are the summit tier and bend the last lever the house
     * owns: `toll`, the credits a unit pays the house on every exit - each
     * sale hands it over and the day-7 bell liquidation hands it over too,
     * so a round trip has to clear the toll on top of the storage fees and
     * a churned week pays it again on every re-entry. The ratchet climbs
     * 4-5-6-7-8-9, mixed with the levers the ladder already taught: every
     * band below was measured by replaying lines through mktStep on the
     * row's own seed, where the toll-aware line - the deep tier's own shape
     * with the toll netted into the round trip and a hold kept through a
     * dip a later exit still wins - banks exactly its top band, while the
     * toll-blind bench that three-stars m24 (the shipped greedy, the
     * ramp-aware prover, the daily flipper, the buy-and-hold carrier)
     * cannot bank a single star on any of them. */
    /* The house cut arrives on a quiet week: the old line's round trips
     * still clear the fee, so it keeps trading - and pays the house for the
     * privilege, twice on the cargo it churns. */
    { id: "m25", labelKey: "mktS25", seed: 1933, start: 340, cap: 14, fee: 1,
      amp: [1.2, 1.2, 1.2, 1.2], eventWeights: [1, 1, 1, 1], target: 500, toll: 4,
      starCredits: [1050, 775, 500] },
    /* No storms force anything and the board swings every day, so every dip
     * is a bait: selling a swing and re-entering it pays the toll twice -
     * the lesson is to hold through a dip a later exit still wins. */
    { id: "m26", labelKey: "mktS26", seed: 3544, start: 360, cap: 16, fee: 1,
      amp: [1.9, 1.9, 1.9, 1.9], eventWeights: [0, 2, 2, 2], target: 700, toll: 5,
      starCredits: [1765, 1233, 700] },
    /* The deep tier's ramp is back under the toll: waiting taxes the hold
     * while leaving taxes the exit, and only a rise that clears both is
     * worth carrying at all. */
    { id: "m27", labelKey: "mktS27", seed: 5053, start: 400, cap: 12, fee: 2,
      amp: [1.4, 1.4, 1.4, 1.4], eventWeights: [1, 1, 1, 1], target: 800, feeRamp: 4,
      toll: 6, starCredits: [1106, 953, 800] },
    /* Four slots: the cap sends the hold back through the dock again and
     * again and every pass pays - only the wide trips are worth the pass. */
    { id: "m28", labelKey: "mktS28", seed: 3712, start: 320, cap: 4, fee: 2,
      amp: [1.6, 1.2, 1.2, 1.2], eventWeights: [1, 1, 1, 3], target: 850, toll: 7,
      starCredits: [1661, 1256, 850] },
    /* Storms shut the routes on the days the exits were planned for, so the
     * week picks the exit day - and the bell settlement, toll included, has
     * to be priced before it rings. */
    { id: "m29", labelKey: "mktS29", seed: 4258, start: 320, cap: 14, fee: 2,
      amp: [1.6, 1.6, 1.6, 1.6], eventWeights: [7, 1, 1, 1], target: 900, toll: 8,
      starCredits: [1532, 1216, 900] },
    /* The summit: ramp and toll together, on a board that collapses every
     * good but ice - the whole week has to be priced exit-first, and the
     * bell pays nine less a unit on whatever is still aboard. */
    { id: "m30", labelKey: "mktS30", seed: 3769, start: 420, cap: 12, fee: 3,
      amp: [1.6, 1.6, 1.6, 1.6], eventWeights: [2, 2, 1, 2], target: 950, feeRamp: 5,
      toll: 9, starCredits: [1303, 1127, 950] },
  ];

  function mulberry32(seed) {
    var value = seed >>> 0;
    return function () {
      value = (value + 0x6d2b79f5) >>> 0;
      var mixed = Math.imul(value ^ (value >>> 15), 1 | value);
      mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  }

  function mktTotal(holds) {
    var total = 0;
    for (var i = 0; i < holds.length; i += 1) {
      total += holds[i] > 0 ? holds[i] : 0;
    }
    return total;
  }

  function mktDrawEvent(rng, level) {
    var weights = level.eventWeights;
    var sum = 0;
    var i;
    for (i = 0; i < weights.length; i += 1) {
      sum += weights[i] > 0 ? weights[i] : 0;
    }
    if (sum <= 0) {
      sum = 1;
    }
    var roll = rng() * sum;
    var kind = mktKinds[0];
    for (i = 0; i < weights.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) {
        kind = mktKinds[i];
        break;
      }
    }
    var goods = kind === "heat" ? 0 : Math.floor(rng() * mktGoodCount);
    if (goods < 0 || goods >= mktGoodCount) {
      goods = 0;
    }
    return { kind: kind, goods: goods };
  }

  /* The named event resolves before the market moves, so the multiplier shows
   * up in that day's opening price and the trader sees it before acting. */
  function mktApplyEvent(row, ev) {
    var out = row.slice();
    if (!ev) {
      return out;
    }
    if (ev.kind === "embargo") {
      out[ev.goods] = Math.max(2, Math.round(out[ev.goods] * 0.5));
    } else if (ev.kind === "bloom") {
      out[ev.goods] = Math.max(2, Math.round(out[ev.goods] * 0.55));
    } else if (ev.kind === "heat") {
      out[0] = Math.min(400, Math.round(out[0] * 1.8));
    }
    return out;
  }

  /* prices[0..7] and events[0..7] come purely from the seed: day 7 exists so
   * the closing week liquidates held cargo at the next morning's price. */
  function mktSchedule(level, seed) {
    var rng = mulberry32(seed === undefined ? level.seed : seed);
    var prices = [];
    var events = [];
    var base = [];
    var day, i;
    for (i = 0; i < mktGoodCount; i += 1) {
      base.push(mktGoods[i].base);
    }
    events.push(mktDrawEvent(rng, level));
    prices.push(mktApplyEvent(base, events[0]));
    for (day = 1; day <= mktDays; day += 1) {
      var walk = [];
      for (i = 0; i < mktGoodCount; i += 1) {
        var amp = level.amp[i] > 0 ? level.amp[i] : 0;
        var r = (rng() - 0.5) * 0.5 * amp;
        walk.push(Math.max(2, Math.min(400, Math.round(prices[day - 1][i] * (1 + r)))));
      }
      events.push(mktDrawEvent(rng, level));
      prices.push(mktApplyEvent(walk, events[day]));
    }
    return { prices: prices, events: events };
  }

  function mktCopy(state) {
    return {
      level: state.level,
      seed: state.seed,
      day: state.day,
      cash: state.cash,
      holds: state.holds.slice(),
      bought: state.bought.slice(),
      sold: state.sold.slice(),
      status: state.status,
      cause: state.cause,
      credits: state.credits,
    };
  }

  function mktDeal(level, seed) {
    return {
      level: level,
      seed: seed === undefined ? level.seed : seed,
      day: 0,
      cash: level.start,
      holds: [0, 0, 0, 0],
      bought: [false, false, false, false],
      sold: [false, false, false, false],
      status: "open",
      cause: "",
      credits: level.start,
    };
  }

  function mktTrade(state, seed, actions) {
    if (!state || state.status !== "open") {
      return { state: state, notes: ["closed"] };
    }
    var sched = mktSchedule(state.level, seed);
    var day = state.day < sched.prices.length ? state.day : sched.prices.length - 1;
    var prices = sched.prices[day];
    var ev = sched.events[day];
    var next = mktCopy(state);
    var notes = [];
    var blocked = ev && ev.kind === "storm" ? ev.goods : -1;
    var i, qty;
    for (i = 0; i < mktGoodCount; i += 1) {
      qty = actions && typeof actions[i] === "number" ? Math.round(actions[i]) : 0;
      if (!qty) {
        continue;
      }
      if (i === blocked) {
        notes.push("blocked" + i);
        continue;
      }
      var price = prices[i];
      if (qty > 0) {
        if (next.bought[i]) {
          notes.push("done" + i);
          continue;
        }
        var cost = qty * price;
        if (cost > next.cash) {
          notes.push("poor");
          continue;
        }
        if (mktTotal(next.holds) + qty > next.level.cap) {
          notes.push("full");
          continue;
        }
        next.cash -= cost;
        next.holds[i] += qty;
        next.bought[i] = true;
        notes.push("bought" + i);
      } else {
        if (next.sold[i]) {
          notes.push("done" + i);
          continue;
        }
        var take = -qty;
        if (take > next.holds[i]) {
          notes.push("empty" + i);
          continue;
        }
        /* The summit tier's exit toll: `toll` credits per unit go to the house
         * on every sale, so a round trip pays it once and a churned week pays
         * it again and again. The field is absent on m1..m24, where this line
         * pays nothing and every shallow week replays byte-identically. */
        next.cash += take * (price - (next.level.toll || 0));
        next.holds[i] -= take;
        next.sold[i] = true;
        notes.push("sold" + i);
      }
    }
    return { state: next, notes: notes };
  }

  function mktCloseDay(state, seed) {
    if (!state || state.status !== "open") {
      return { state: state, report: null };
    }
    var sched = mktSchedule(state.level, seed);
    var next = mktCopy(state);
    /* The deep tier's carry ramp: `feeRamp` credits per held unit are added to
     * every night's storage fee after the first, so the price of waiting grows
     * with the week (day d charges fee + feeRamp*d). The field is absent on
     * m1..m20, where this line then computes exactly the shipped flat fee and
     * every shallow week replays byte-identically. */
    var perUnit = next.level.fee +
      (next.level.feeRamp ? next.level.feeRamp * next.day : 0);
    var fee = perUnit * mktTotal(next.holds);
    if (next.cash < fee) {
      next.status = "lost";
      next.cause = "bankrupt";
      next.credits = next.cash;
      return { state: next, report: { fee: fee } };
    }
    next.cash -= fee;
    if (next.day >= mktDays - 1) {
      var settle = sched.prices[mktDays];
      var credits = next.cash;
      for (var i = 0; i < mktGoodCount; i += 1) {
        /* The bell liquidates through the same exit toll: a forced sale is
         * still a sale, and the house takes its cut on every exit. */
        credits += next.holds[i] *
          Math.max(0, settle[i] - (next.level.toll || 0));
        next.holds[i] = 0;
      }
      next.credits = credits;
      next.cash = credits;
      next.day = mktDays - 1;
      next.status = credits >= next.level.target ? "won" : "lost";
      next.cause = credits >= next.level.target ? "settled" : "short";
      return { state: next, report: { fee: fee, credits: credits } };
    }
    next.day += 1;
    next.bought = [false, false, false, false];
    next.sold = [false, false, false, false];
    return { state: next, report: { fee: fee, event: sched.events[next.day] } };
  }

  /* One full day: trades, storage fee, the named event and the price walk. */
  function mktStep(state, seed, actions) {
    var traded = mktTrade(state, seed, actions || []);
    return mktCloseDay(traded.state, seed);
  }

  /* Shared greedy policy: sell what will not rise, keep enough float for two
   * nights of storage fees (emergency-dumping a hold if the purse runs low),
   * and buy only the best riser whose rise beats the fee. The ceiling below
   * plays with it through the very same mktStep a run uses, so the measured
   * top band is a legal line, not an oracle fantasy. */
  function mktGreedyActions(level, sched, state) {
    var ev = sched.events[state.day];
    var blocked = ev && ev.kind === "storm" ? ev.goods : -1;
    var p = sched.prices[state.day];
    var n = sched.prices[state.day + 1] || sched.prices[mktDays];
    var actions = [0, 0, 0, 0];
    var held = mktTotal(state.holds);
    var i, qty;
    for (i = 0; i < mktGoodCount; i += 1) {
      if (state.holds[i] > 0 && i !== blocked && (n[i] <= p[i] || state.day === mktDays - 1)) {
        actions[i] = -state.holds[i];
        held -= state.holds[i];
      }
    }
    var guard = 0;
    while (state.cash < level.fee * (held + 1) * 2 + 1 && guard < mktGoodCount) {
      guard += 1;
      var dump = -1;
      var big = 0;
      for (i = 0; i < mktGoodCount; i += 1) {
        if (state.holds[i] > 0 && i !== blocked && actions[i] === 0 && state.holds[i] > big) {
          big = state.holds[i];
          dump = i;
        }
      }
      if (dump < 0) {
        break;
      }
      actions[dump] = -state.holds[dump];
      held -= state.holds[dump];
    }
    var bestGain = 0;
    var bestI = -1;
    for (i = 0; i < mktGoodCount; i += 1) {
      if (i === blocked || actions[i] < 0) {
        continue;
      }
      var gain = n[i] - p[i] - level.fee;
      if (gain > bestGain) {
        bestGain = gain;
        bestI = i;
      }
    }
    if (bestI >= 0 && state.day < mktDays - 1 && p[bestI] > 0) {
      var room = level.cap - held;
      for (qty = room; qty >= 1; qty -= 1) {
        if (qty * p[bestI] <= state.cash - level.fee * (held + qty) * 2) {
          actions[bestI] = qty;
          break;
        }
      }
    }
    return actions;
  }

  function mktCeiling(level) {
    var sched = mktSchedule(level, level.seed);
    var state = mktDeal(level, level.seed);
    var guard = 0;
    while (state.status === "open" && guard < mktDays + 2) {
      state = mktStep(state, level.seed, mktGreedyActions(level, sched, state)).state;
      guard += 1;
    }
    return Math.max(state.credits, level.target + 1);
  }

  /* Bands are derived from the measured ceiling, never guessed: top is what
   * the greedy line actually banked, middle is its midpoint with the target.
   * A seat whose own greedy run falls short of its target leaves this formula
   * with almost nothing to split, so the three steps are pushed apart here
   * rather than handed back flat - starsFor reads a strictly descending ladder.
   * m6..m20 do not use this fallback: they ship the band the harness measured. */
  function mktBand(level) {
    var ceiling = mktCeiling(level);
    var top = ceiling > level.target ? ceiling : level.target + Math.max(10, Math.round(level.target * 0.1));
    var mid = Math.round(level.target + (top - level.target) / 2);
    if (mid <= level.target) {
      mid = level.target + 1;
    }
    if (top <= mid) {
      top = mid + 1;
    }
    return [top, mid, level.target];
  }

  function initMoonMarketGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "moon-market-campaign", levels: mktLevels });
    var level = mktLevels[campaign.indexOf(campaign.nextLevelId())] || mktLevels[0];
    var state = mktDeal(level);
    var lot = 1;
    var picked = 0;
    var lines = [];

    var hud = document.createElement("div");
    hud.className = "game-hud";
    var dayEl = document.createElement("strong");
    var cashEl = document.createElement("strong");
    var cargoEl = document.createElement("strong");
    var goalEl = document.createElement("strong");
    hud.appendChild(makeStat("mktDayStatLabel", dayEl));
    hud.appendChild(makeStat("mktCashStatLabel", cashEl));
    hud.appendChild(makeStat("mktCargoStatLabel", cargoEl));
    hud.appendChild(makeStat("mktTargetStatLabel", goalEl));

    var eventRow = document.createElement("p");
    eventRow.className = "mkt-event";

    var ledger = document.createElement("div");
    ledger.className = "mkt-ledger";
    ledger.setAttribute("tabindex", "0");
    ledger.setAttribute("role", "group");
    ledger.setAttribute("aria-label", t("mktLedgerLabel"));

    var lotRow = document.createElement("div");
    lotRow.className = "mkt-lotrow";
    var lotMinus = document.createElement("button");
    lotMinus.type = "button";
    lotMinus.className = "mkt-lotbtn";
    lotMinus.setAttribute("aria-label", t("mktLotMinus"));
    lotMinus.textContent = "-";
    var lotText = document.createElement("strong");
    lotText.className = "mkt-lottext";
    var lotPlus = document.createElement("button");
    lotPlus.type = "button";
    lotPlus.className = "mkt-lotbtn";
    lotPlus.setAttribute("aria-label", t("mktLotPlus"));
    lotPlus.textContent = "+";
    lotRow.appendChild(lotMinus);
    lotRow.appendChild(lotText);
    lotRow.appendChild(lotPlus);

    var history = document.createElement("div");
    history.className = "mkt-history";

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var seatRow = document.createElement("div");
    seatRow.className = "elements-row";
    var seatLabel = document.createElement("label");
    seatLabel.className = "elements-label";
    seatLabel.setAttribute("for", "mktSeatSel");
    seatLabel.setAttribute("data-i18n", "mktSeatSelectLabel");
    seatLabel.textContent = t("mktSeatSelectLabel");
    var seatSel = document.createElement("select");
    seatSel.className = "elements-select";
    seatSel.id = "mktSeatSel";
    seatRow.appendChild(seatLabel);
    seatRow.appendChild(seatSel);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var endBtn = document.createElement("button");
    endBtn.type = "button";
    endBtn.className = "primary";
    var endLabel = document.createElement("span");
    endLabel.setAttribute("data-i18n", "mktBtnEnd");
    endLabel.textContent = t("mktBtnEnd");
    var endContent = document.createElement("span");
    endContent.className = "button-content";
    endContent.appendChild(endLabel);
    endBtn.appendChild(endContent);
    var newBtn = document.createElement("button");
    newBtn.type = "button";
    newBtn.setAttribute("data-i18n", "btnNewRound");
    newBtn.textContent = t("btnNewRound");
    var starsEl = document.createElement("p");
    starsEl.className = "game-best";
    actions.appendChild(endBtn);
    actions.appendChild(newBtn);
    actions.appendChild(starsEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "mktHint");
    hint.textContent = t("mktHint");

    [hud, eventRow, ledger, lotRow, history, result, seatRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    function makeStat(key, valueEl) {
      var stat = document.createElement("div");
      stat.className = "game-stat";
      var label = document.createElement("span");
      label.setAttribute("data-i18n", key);
      label.textContent = t(key);
      stat.appendChild(label);
      stat.appendChild(valueEl);
      return stat;
    }

    var rows = [];
    function buildLedger() {
      ledger.textContent = "";
      rows = [];
      mktGoods.forEach(function (good, i) {
        var row = document.createElement("div");
        row.className = "mkt-row";
        var name = document.createElement("span");
        name.className = "mkt-good";
        var price = document.createElement("strong");
        price.className = "mkt-price";
        var delta = document.createElement("span");
        delta.className = "mkt-delta";
        var hold = document.createElement("span");
        hold.className = "mkt-hold";
        var buyBtn = document.createElement("button");
        buyBtn.type = "button";
        buyBtn.className = "mkt-dealbtn";
        buyBtn.textContent = t("mktBuy");
        var sellBtn = document.createElement("button");
        sellBtn.type = "button";
        sellBtn.className = "mkt-dealbtn";
        sellBtn.textContent = t("mktSell");
        buyBtn.addEventListener("click", function () {
          trade(i, 1);
        });
        sellBtn.addEventListener("click", function () {
          trade(i, -1);
        });
        row.addEventListener("pointerdown", function () {
          pick(i);
        });
        [name, price, delta, hold, buyBtn, sellBtn].forEach(function (cell) {
          row.appendChild(cell);
        });
        ledger.appendChild(row);
        rows.push({ row: row, name: name, price: price, delta: delta, hold: hold, buy: buyBtn, sell: sellBtn });
      });
    }

    function pick(i) {
      picked = i;
      render();
    }

    function eventText(ev) {
      if (!ev) {
        return t("mktEvQuiet");
      }
      var name = t(mktGoods[ev.goods].key);
      if (ev.kind === "storm") {
        return t("mktEvStorm", { name: name });
      }
      if (ev.kind === "embargo") {
        return t("mktEvEmbargo", { name: name });
      }
      if (ev.kind === "bloom") {
        return t("mktEvBloom", { name: name });
      }
      return t("mktEvHeat", { name: name });
    }

    function renderHud() {
      var dayNo = Math.min(state.day + 1, mktDays);
      dayEl.textContent = t("mktDayStat", { n: dayNo, total: mktDays });
      cashEl.textContent = String(state.cash);
      cargoEl.textContent = t("mktCargoStat", { n: mktTotal(state.holds), max: state.level.cap });
      goalEl.textContent = String(state.level.target);
      lotText.textContent = t("mktLotLabel", { n: lot });
    }

    function render() {
      var sched = mktSchedule(state.level, state.seed);
      var day = Math.min(state.day, sched.prices.length - 1);
      var prices = sched.prices[day];
      var prev = day > 0 ? sched.prices[day - 1] : prices;
      renderHud();
      eventRow.textContent = t("mktDayOpen", { n: day + 1, event: eventText(sched.events[day]) });
      mktGoods.forEach(function (good, i) {
        var d = prices[i] - prev[i];
        rows[i].name.textContent = good.glyph + " " + t(good.key);
        rows[i].price.textContent = String(prices[i]);
        rows[i].delta.textContent = d === 0 ? "0" : (d > 0 ? "+" + d : String(d));
        rows[i].hold.textContent = t("mktHoldCell", { n: state.holds[i] });
        rows[i].buy.setAttribute("aria-label", t("mktBuyAria", { name: t(good.key), n: lot }));
        rows[i].sell.setAttribute("aria-label", t("mktSellAria", { name: t(good.key), n: lot }));
        rows[i].row.className = "mkt-row" + (i === picked ? " is-picked" : "");
      });
      history.textContent = "";
      lines.slice(-5).forEach(function (line) {
        var p = document.createElement("p");
        p.className = "mkt-ledgerline";
        p.textContent = line;
        history.appendChild(p);
      });
    }

    function refreshPicker() {
      fillCampaignPicker(
        seatSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      seatSel.value = state.level.id;
      starsEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function trade(i, sign) {
      if (state.status !== "open") {
        return;
      }
      var actions = [0, 0, 0, 0];
      actions[i] = sign * lot;
      var res = mktTrade(state, state.seed, actions);
      state = res.state;
      var note = res.notes.length ? res.notes[res.notes.length - 1] : "";
      var name = t(mktGoods[i].key);
      if (note === "blocked" + i) {
        result.textContent = t("mktBlockedMsg", { name: name });
      } else if (note === "done" + i) {
        result.textContent = t("mktDealt", { name: name });
      } else if (note === "poor") {
        result.textContent = t("mktNoCash");
      } else if (note === "full") {
        result.textContent = t("mktNoRoom", { max: state.level.cap });
      } else if (note === "empty" + i) {
        result.textContent = t("mktNoHold", { name: name });
      } else if (note === "bought" + i) {
        result.textContent = t("mktBought", { n: lot, name: name });
      } else if (note === "sold" + i) {
        result.textContent = t("mktSold", { n: lot, name: name });
      }
      render();
    }

    function finish(credits) {
      var band = state.level.starCredits || mktBand(state.level);
      var starsWon = starsFor(credits, band, "high");
      var outcome = campaign.record(state.level.id, {
        stars: starsWon,
        best: credits,
        better: "high",
      });
      var message = t("mktWon", { n: credits, t: state.level.target, s: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("mktNextSeat");
      } else if (campaign.clearedCount() === mktLevels.length) {
        message += " " + t("mktAllSeats");
      }
      result.textContent = message;
      logAction(t("logMoonMarket", { n: credits }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function endDay() {
      if (state.status !== "open") {
        return;
      }
      var closedDay = state.day + 1;
      var res = mktCloseDay(state, state.seed);
      state = res.state;
      if (res.report) {
        lines.push(t("mktLedDay", { d: closedDay, fee: res.report.fee, cash: state.cash }));
      }
      if (state.status === "won") {
        finish(state.credits);
      } else if (state.status === "lost") {
        if (state.cause === "bankrupt") {
          result.textContent = t("mktBankrupt", { n: state.day + 1 });
        } else {
          result.textContent = t("mktShort", { n: state.credits, t: state.level.target });
        }
      }
      render();
    }

    function loadLevel(levelDef) {
      level = levelDef;
      state = mktDeal(level);
      lot = 1;
      picked = 0;
      lines = [];
      render();
      refreshPicker();
      result.textContent = t(level.toll ? "mktPromptToll" : "mktPrompt", {
        name: t(level.labelKey),
        t: level.target,
        d: mktDays,
        c: level.start,
        cap: level.cap,
        fee: level.fee,
        toll: level.toll || 0,
      });
    }

    endBtn.addEventListener("click", endDay);
    newBtn.addEventListener("click", function () {
      loadLevel(state.level);
    });
    lotMinus.addEventListener("click", function () {
      lot = Math.max(1, lot - 1);
      renderHud();
    });
    lotPlus.addEventListener("click", function () {
      lot = Math.min(Math.max(1, state.level.cap), lot + 1);
      renderHud();
    });

    ledger.addEventListener("keydown", function (event) {
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        picked = (picked + (event.key === "ArrowDown" ? 1 : mktGoodCount - 1)) % mktGoodCount;
        render();
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        lot = Math.min(Math.max(1, state.level.cap), lot + 1);
        renderHud();
        return;
      }
      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        lot = Math.max(1, lot - 1);
        renderHud();
        return;
      }
      if (event.key === "Enter") {
        if (event.target && event.target.tagName === "BUTTON") {
          return;
        }
        event.preventDefault();
        trade(picked, event.shiftKey ? -1 : 1);
        return;
      }
      if (event.key === "d" || event.key === "D") {
        event.preventDefault();
        endDay();
      }
    });

    seatSel.addEventListener("change", function () {
      var index = campaign.indexOf(seatSel.value);
      if (index >= 0 && campaign.isUnlocked(seatSel.value)) {
        loadLevel(mktLevels[index]);
      } else {
        seatSel.value = state.level.id;
      }
    });

    buildLedger();
    loadLevel(mktLevels[campaign.indexOf(campaign.nextLevelId())] || mktLevels[0]);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabMoonMarket": "Moon Market",
      "mktS1": "Small Stake",
      "mktS2": "Storm-Heavy Week",
      "mktS3": "Twin Commodity Boom",
      "mktS4": "Tight Cargo, High Fees",
      "mktS5": "The Futures Desk",
      "mktS6": "The Ice Spike",
      "mktS7": "The Fee Grind",
      "mktS8": "The Single Slot",
      "mktS9": "The Slow Burn",
      "mktS10": "The Big Board",
      "mktS11": "The Pawn Seat",
      "mktS12": "The Rent Trap",
      "mktS13": "The Rot Bin",
      "mktS14": "Storm Lock",
      "mktS15": "The Alloy Vault",
      "mktS16": "Seizure Row",
      "mktS17": "The Flooded Hold",
      "mktS18": "The Long Famine",
      "mktS19": "The Ice Staircase",
      "mktS20": "The Price War",
      "mktS21": "The Creeping Toll",
      "mktS22": "The Hoarder's Week",
      "mktS23": "The Toll Gate",
      "mktS24": "The Carry Crunch",
      "mktS25": "The House Cut",
      "mktS26": "The Churn Trap",
      "mktS27": "The Double Squeeze",
      "mktS28": "The Turnstile",
      "mktS29": "The Forced Exit",
      "mktS30": "The Bell Tolls",
      "mktIce": "Moon Ice",
      "mktGrain": "Hydro Grain",
      "mktAlloy": "Regolith Alloy",
      "mktSpore": "Dream Spore",
      "mktDayStatLabel": "Day",
      "mktCashStatLabel": "Credits",
      "mktCargoStatLabel": "Cargo",
      "mktTargetStatLabel": "Target",
      "mktSeatSelectLabel": "Choose a seat",
      "mktLedgerLabel": "Commodity ledger: arrows pick, plus and minus set the lot, Enter buys, Shift+Enter sells, D ends the day",
      "mktDayStat": "{n}/{total}",
      "mktCargoStat": "{n}/{max}",
      "mktLotLabel": "Lot {n}",
      "mktLotPlus": "Bigger lot",
      "mktLotMinus": "Smaller lot",
      "mktBuy": "Buy",
      "mktSell": "Sell",
      "mktBuyAria": "Buy {n} units of {name}",
      "mktSellAria": "Sell {n} units of {name}",
      "mktHoldCell": "x{n}",
      "mktBtnEnd": "End Day (D)",
      "mktPrompt": "Seat {name}: make {t} credits in {d} days from {c}, cap {cap}, fee {fee} per held unit a day.",
      "mktPromptToll": "Seat {name}: make {t} credits in {d} days from {c}, cap {cap}, fee {fee} per held unit a day - and the house takes {toll} a unit on every sale, the day-7 bell included.",
      "mktDayOpen": "Day {n} opens - {event}",
      "mktEvStorm": "Dust storm shuts the {name} route.",
      "mktEvEmbargo": "Embargo halves the {name} price.",
      "mktEvBloom": "Bloom doubles supply: {name} floods cheap.",
      "mktEvHeat": "Heat wave spikes demand for {name}.",
      "mktEvQuiet": "Calm skies over the colony.",
      "mktBlockedMsg": "The {name} route is shut today.",
      "mktDealt": "{name} was already dealt today.",
      "mktNoCash": "Not enough credits for that lot.",
      "mktNoRoom": "Cargo cap is {max} units.",
      "mktNoHold": "No {name} to sell.",
      "mktBought": "Bought {n} {name}.",
      "mktSold": "Sold {n} {name}.",
      "mktLedDay": "Day {d} closed: fee {fee}, credits {cash}.",
      "mktWon": "Week banked {n} credits against a {t} target - {s} stars!",
      "mktShort": "Missed the target: {n} of {t} credits.",
      "mktBankrupt": "The storage fee due on day {n} outran your credits - the colony seizes the cargo.",
      "mktNextSeat": "Next seat unlocked.",
      "mktAllSeats": "All thirty seats traded.",
      "mktHint": "Arrows pick a commodity, +/- size the lot, Enter buys, Shift+Enter sells, D ends the day; positions are force-sold on day 7.",
      "logMoonMarket": "Banked {n} credits at the moon market",
    },
    zh: {
      "tabMoonMarket": "月球市场",
      "mktS1": "小本经营",
      "mktS2": "风暴频发的一周",
      "mktS3": "双商品热潮",
      "mktS4": "舱位紧张、费用高昂",
      "mktS5": "期货席位",
      "mktS6": "冰价狂飙",
      "mktS7": "仓储重税",
      "mktS8": "唯一货舱",
      "mktS9": "慢牛长持",
      "mktS10": "大盘满舱",
      "mktS11": "当铺席位",
      "mktS12": "仓租陷阱",
      "mktS13": "腐货舱",
      "mktS14": "风暴封锁",
      "mktS15": "合金金库",
      "mktS16": "没收街",
      "mktS17": "水漫货舱",
      "mktS18": "漫长饥荒",
      "mktS19": "冰价长阶",
      "mktS20": "价格战",
      "mktS21": "夜费爬坡",
      "mktS22": "囤货者的一周",
      "mktS23": "税关",
      "mktS24": "仓储绞索",
      "mktS25": "庄家抽成",
      "mktS26": "换手陷阱",
      "mktS27": "双重抽税",
      "mktS28": "十字转门",
      "mktS29": "强制离场",
      "mktS30": "收盘钟税",
      "mktIce": "月冰",
      "mktGrain": "水培谷物",
      "mktAlloy": "月壤合金",
      "mktSpore": "梦境孢子",
      "mktDayStatLabel": "天数",
      "mktCashStatLabel": "信用点",
      "mktCargoStatLabel": "货舱",
      "mktTargetStatLabel": "目标",
      "mktSeatSelectLabel": "选择交易席位",
      "mktLedgerLabel": "商品账本：方向键选商品，加减号调批量，回车买入，Shift+回车卖出，D 结束当天",
      "mktDayStat": "第 {n}/{total} 天",
      "mktCargoStat": "{n}/{max}",
      "mktLotLabel": "批量 {n}",
      "mktLotPlus": "加大批量",
      "mktLotMinus": "减小批量",
      "mktBuy": "买入",
      "mktSell": "卖出",
      "mktBuyAria": "以 {n} 批量买入{name}",
      "mktSellAria": "以 {n} 批量卖出{name}",
      "mktHoldCell": "持 {n}",
      "mktBtnEnd": "结束本天（D）",
      "mktPrompt": "席位「{name}」：从 {c} 信用点起步，{d} 天内赚到 {t}；货舱上限 {cap}，每单位每天仓储费 {fee}。",
      "mktPromptToll": "席位「{name}」：从 {c} 信用点起步，{d} 天内赚到 {t}；货舱上限 {cap}，每单位每天仓储费 {fee}——且每次卖出（含第 7 天强平）每单位要给庄家 {toll} 抽成。",
      "mktDayOpen": "第 {n} 天开盘——{event}",
      "mktEvStorm": "沙尘暴封锁了{name}航线。",
      "mktEvEmbargo": "禁运令使{name}价格腰斩。",
      "mktEvBloom": "孢子大爆发，供应翻倍，{name}暴跌。",
      "mktEvHeat": "热浪推高了对{name}的需求。",
      "mktEvQuiet": "殖民地天空平静无波。",
      "mktBlockedMsg": "{name}航线今天被封锁。",
      "mktDealt": "{name}今天已经交易过了。",
      "mktNoCash": "信用点不够付这一批。",
      "mktNoRoom": "货舱上限只有 {max} 个单位。",
      "mktNoHold": "手里没有可卖的{name}。",
      "mktBought": "买入 {n} 单位{name}。",
      "mktSold": "卖出 {n} 单位{name}。",
      "mktLedDay": "第 {d} 天收盘：仓储费 {fee}，信用点 {cash}。",
      "mktWon": "一周结束，入账 {n} 信用点，目标 {t}——获得 {s} 星！",
      "mktShort": "没达标：只有 {n}/{t} 信用点。",
      "mktBankrupt": "第 {n} 天的仓储费超出了你的信用点——殖民地没收了货物。",
      "mktNextSeat": "解锁下一个席位。",
      "mktAllSeats": "三十个席位全部交易完毕。",
      "mktHint": "方向键选商品，加减号调批量，回车买入，Shift+回车卖出，D 结束当天；第 7 天所有持仓会被强制卖出。",
      "logMoonMarket": "在月球市场赚到了 {n} 信用点",
    },
  });

  /* Measure every seat's band from its own greedy line at load time, unless the
   * row already ships the band it was measured with: on m6..m10 the greedy line
   * is the wrong tool by design, so letting it overwrite the row would put the
   * three-star line at a run the seat exists to punish. */
  mktLevels.forEach(function (level) {
    if (!level.starCredits) {
      level.starCredits = mktBand(level);
    }
  });

  App.registerGame({
    name: "moonMarket",
    tabKey: "tabMoonMarket",
    init: initMoonMarketGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M14 58 30 40 46 50 62 26 78 36 94 16" fill="none" stroke="#22d3ee" stroke-width="2"/>' +
        '<path d="M14 30 30 36 46 24 62 44 78 30 94 48" fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="4 3"/>' +
        '<text x="100" y="18" font-size="9" fill="#22d3ee">I</text>' +
        '<text x="100" y="52" font-size="9" fill="#fbbf24">G</text>' +
        '<path d="M14 66h92" stroke="rgba(148,163,184,.5)"/></svg>',
      en: [
        "Aim: bank the seat's credit target within seven market days.",
        "Controls: arrows pick a commodity, +/- size the lot, Enter buys, Shift+Enter sells, D ends the day; clicking a row and its Buy/Sell buttons works too.",
        "Rules: one buy and one sell per commodity each day, the cargo cap holds you back, and every held unit pays a nightly storage fee.",
        "Watch out: a named event opens every day before prices move - storms shut a route, embargoes and blooms dump it, heat waves spike ice.",
        "Closing: on day 7 everything you still hold is force-sold at the morning price; if the fee outruns your cash the colony seizes it all.",
        "Scoring: stars by final credits - three stars asks for more than the measured greedy run on the seats built to punish it, and every week replays identically from its seed.",
        "New tier: seats 21-24 add a carry ramp - every night the storage fee grows by feeRamp credits per held unit, so cargo sleeps cheap early in the week and bleeds toward the weekend; keep it moving instead of parking it.",
        "Summit: seats 25-30 let the house skim a toll on every exit - toll credits come off each unit sold, and off the day-7 bell settlement too, so a round trip has to clear the toll on top of the storage fees, a churned week pays it again on every re-entry, and a cheap good can be taxed to nothing.",
      ],
      zh: [
        "目标：在七个交易日内把信用点攒到席位目标。",
        "操作：方向键选商品，加减号调批量，回车买入，Shift+回车卖出，D 结束当天；也可以点行选中再按买/卖按钮。",
        "规则：每种商品每天只能各买一次、各卖一次，货舱有上限，持仓每晚上要交仓储费。",
        "小心：每天开盘前先公布事件——风暴封航线、禁运与丰收砸价、热浪抬高冰价。",
        "收盘：第 7 天所有持仓按早盘价强制卖出；仓储费超过现金就会被殖民地没收全部货物。",
        "计分：按最终信用点评星——在为惩罚频繁交易而设的席位上，三星线高于贪心策略实测的那条线，同一颗种子每周走势完全重放。",
        "新层级：第 21-24 席位加入仓储爬坡——每过一夜，每单位持仓的仓储费就再涨 feeRamp 点；周初的货睡得便宜，越临近周末越被费用放血，让货物流动起来，别把它压在舱底。",
        "巅峰段：第 25-30 席位让庄家从每次出场抽成——每卖出一单位都要上缴 toll 点，第 7 天强制清算也不例外；一轮买卖除了仓储费还得赚回抽成，反复换手等于每进一次场再交一次税，便宜货甚至会被抽到归零。",
      ],
    },
  });

  /* Exported for the other modules and the headless checks. */
  App.initMoonMarketGame = initMoonMarketGame;
  App.marketStep = mktStep;
  App.marketTrade = mktTrade;
  App.marketCloseDay = mktCloseDay;
  App.marketGreedy = mktGreedyActions;
  App.marketCeiling = mktCeiling;
  App.marketBand = mktBand;
  App.marketSchedule = mktSchedule;
  App.marketDeal = mktDeal;
  App.marketLevels = mktLevels;
})(window.CapitalConvert = window.CapitalConvert || {});
