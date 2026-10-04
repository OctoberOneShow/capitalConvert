/* Auction Dungeon - the economy/tactical run of the shared game drawer.
 * Three named rivals bid against you for eight items, the sale panel prints
 * what everybody bid afterwards, and the purse you did NOT spend is the only
 * thing that can heal between the run's three encounters. Over-bidding is the
 * trap: a bidder who takes every lot meets the last door bleeding. Runs come
 * from a seed and the star bands are MEASURED by an exported planner
 * (auctionCeiling) playing the very same pure resolvers a human drives, the
 * way Moon Market measures its greedy ceiling. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  /* What a bare-handed party brings to a fight, before any lot is won. */
  var AUD_BASE = { atk: 3, ap: 1 };
  var AUD_BRACE = 6;
  var AUD_PATCH = 5;
  var AUD_PATCHES = 2;
  var AUD_ROUND_CAP = 16;
  var AUD_SALE_CAP = 48;
  var AUD_RIVAL_SLOTS = 3;

  /* Eight catalogue items. band is the price the counter quotes as fair, edge
   * is the hidden true worth: rivals price with the edge, so a bidder who
   * never crosses 9 coins on the Bell Goad is telling you it is a dud. */
  var audItems = [
    { id: "dirk", gl: ">", key: "audItDirk", fx: "audFxAtk", fxv: 3, band: [6, 10], edge: 1.1, atk: 3 },
    { id: "axe", gl: "X", key: "audItAxe", fx: "audFxAtk", fxv: 8, band: [15, 21], edge: 0.95, atk: 8 },
    { id: "buckler", gl: "O", key: "audItBuckler", fx: "audFxSoak", fxv: 5, band: [8, 13], edge: 1.05, soak: 5 },
    { id: "cloak", gl: "/", key: "audItCloak", fx: "audFxDodge", fxv: 1, band: [10, 15], edge: 1.15, dodge: 1 },
    { id: "vial", gl: "!", key: "audItVial", fx: "audFxMend", fxv: 3, band: [12, 17], edge: 1, mend: 3 },
    { id: "goad", gl: "*", key: "audItGoad", fx: "audFxAp", fxv: 1, band: [16, 22], edge: 0.9, ap: 1 },
    { id: "lantern", gl: "L", key: "audItLantern", fx: "audFxPierce", fxv: 1, band: [9, 14], edge: 1.05, pierce: 1 },
    { id: "canteen", gl: "U", key: "audItCanteen", fx: "audFxRest", fxv: 4, band: [5, 9], edge: 1.2, rest: 4 }
  ];
  var audItemById = {};
  audItems.forEach(function (item) {
    audItemById[item.id] = item;
  });

  /* The three named bidders, in seat order after the player's own seat. */
  var audRivals = [
    { key: "greed", nameKey: "audRvGreed", planKey: "audRvGreedPlan" },
    { key: "jockey", nameKey: "audRvJockey", planKey: "audRvJockeyPlan" },
    { key: "miser", nameKey: "audRvMiser", planKey: "audRvMiserPlan" }
  ];

  /* Telegraphed intents: the printed intent is the one that will resolve. */
  var audFoes = {
    rat: { key: "audFoeRat", gl: "~", hp: 8, soak: 0, pattern: [{ k: "hit", n: 2 }, { k: "bite", n: 2 }] },
    adder: { key: "audFoeAdder", gl: "=", hp: 11, soak: 1, pattern: [{ k: "bite", n: 3 }, { k: "hit", n: 3 }] },
    hook: { key: "audFoeHook", gl: "Y", hp: 13, soak: 2, pattern: [{ k: "hit", n: 4 }, { k: "guard", n: 4 }, { k: "hit", n: 3 }] },
    brute: { key: "audFoeBrute", gl: "8", hp: 17, soak: 2, pattern: [{ k: "hit", n: 5 }, { k: "hit", n: 6 }, { k: "guard", n: 3 }] },
    warden: { key: "audFoeWarden", gl: "#", hp: 22, soak: 3, pattern: [{ k: "hit", n: 6 }, { k: "rend", n: 5 }, { k: "guard", n: 5 }] }
  };

  /* Ten runs: each level owns its lot pool, its rivals' nerve, its purse and
   * its doors, so the three pressures (greedy rivals, jockeys, rests) stack.
   * `buff` is the one extra knob the back half of the ladder uses: it bolts hit
   * points onto every foe behind a door, so a late run demands a harder kit for
   * the same party. Difficulty here is what the planner measures, not what the
   * numbers look like: each rung's star band comes from the richest surviving
   * line (audBand -> audMeasure), and down the ladder that line burns a bigger
   * share of the purse - 43 per cent at Stall Fares, 92 per cent at The Last
   * Hammer - while the coins it can still keep fall 25, 25, 26, 22, 21, 17, 16,
   * 12, 9, 7. */
  var audLevels = [
    { id: "a1", labelKey: "audR1", twistKey: "audTwist1", seed: 20260711, purse: 44, hp: 26, slots: 4, step: 2, reserve: 1,
      pool: ["dirk", "buckler", "canteen"], packs: [["rat"], ["adder"], ["hook"]],
      restPrice: 6, restHeal: 7, rests: 2, rivalPurse: 40, greed: 1.05, jockey: 1, miser: 0.5, miserRaises: 2 },
    { id: "a2", labelKey: "audR2", twistKey: "audTwist2", seed: 20260214, purse: 48, hp: 28, slots: 4, step: 2, reserve: 1,
      pool: ["dirk", "axe", "buckler", "cloak", "canteen"], packs: [["rat", "rat"], ["hook"], ["adder", "hook"]],
      restPrice: 7, restHeal: 7, rests: 2, rivalPurse: 46, greed: 1.05, jockey: 1.3, miser: 0.5, miserRaises: 2 },
    { id: "a3", labelKey: "audR3", twistKey: "audTwist3", seed: 20260322, purse: 54, hp: 26, slots: 5, step: 2, reserve: 1,
      pool: ["dirk", "buckler", "vial", "lantern", "canteen"], packs: [["adder"], ["hook", "adder"], ["brute", "hook"]],
      restPrice: 6, restHeal: 8, rests: 3, rivalPurse: 48, greed: 1.05, jockey: 1.15, miser: 0.55, miserRaises: 2 },
    { id: "a4", labelKey: "audR4", twistKey: "audTwist4", seed: 20260410, purse: 46, hp: 30, slots: 4, step: 3, reserve: 1.35,
      pool: ["dirk", "axe", "cloak", "vial", "goad"], packs: [["hook"], ["brute"], ["adder", "brute"]],
      restPrice: 7, restHeal: 9, rests: 2, rivalPurse: 40, greed: 1.1, jockey: 1.2, miser: 0.5, miserRaises: 1 },
    { id: "a5", labelKey: "audR5", twistKey: "audTwist5", seed: 20260506, purse: 68, hp: 32, slots: 6, step: 2, reserve: 1.15,
      pool: ["dirk", "axe", "buckler", "cloak", "vial", "goad", "lantern", "canteen"], packs: [["adder"], ["hook"], ["warden", "brute"]],
      restPrice: 7, restHeal: 8, rests: 3, rivalPurse: 56, greed: 1.15, jockey: 1.35, miser: 0.6, miserRaises: 2 },
    { id: "a6", labelKey: "audR6", twistKey: "audTwist6", seed: 20260917, purse: 66, hp: 28, slots: 5, step: 2, reserve: 1.1,
      pool: ["dirk", "axe", "buckler", "cloak", "vial", "canteen"], packs: [["adder", "adder"], ["hook", "hook"], ["warden", "hook"]],
      restPrice: 7, restHeal: 8, rests: 2, rivalPurse: 62, greed: 1.15, jockey: 1.35, miser: 0.6, miserRaises: 2 },
    { id: "a7", labelKey: "audR7", twistKey: "audTwist7", seed: 20260611, purse: 73, hp: 28, slots: 5, step: 2, reserve: 1.2, buff: 2,
      pool: ["dirk", "axe", "buckler", "cloak", "vial", "lantern", "goad"], packs: [["brute"], ["hook", "adder"], ["warden", "brute"]],
      restPrice: 8, restHeal: 8, rests: 2, rivalPurse: 70, greed: 1.2, jockey: 1.4, miser: 0.65, miserRaises: 2 },
    { id: "a8", labelKey: "audR8", twistKey: "audTwist8", seed: 20260713, purse: 72, hp: 30, slots: 6, step: 2, reserve: 1.25, buff: 2,
      pool: ["dirk", "axe", "buckler", "cloak", "vial", "goad", "lantern"], packs: [["hook", "hook"], ["brute", "adder"], ["warden", "brute", "hook"]],
      restPrice: 8, restHeal: 8, rests: 2, rivalPurse: 74, greed: 1.25, jockey: 1.45, miser: 0.7, miserRaises: 3 },
    { id: "a9", labelKey: "audR9", twistKey: "audTwist9", seed: 20261019, purse: 77, hp: 30, slots: 6, step: 2, reserve: 1.3, buff: 3,
      pool: ["dirk", "axe", "buckler", "cloak", "vial", "goad", "lantern", "canteen"], packs: [["adder", "adder", "hook"], ["warden", "hook"], ["brute", "brute", "warden"]],
      restPrice: 9, restHeal: 8, rests: 2, rivalPurse: 78, greed: 1.3, jockey: 1.5, miser: 0.75, miserRaises: 3 },
    { id: "a10", labelKey: "audR10", twistKey: "audTwist10", seed: 20260801, purse: 85, hp: 32, slots: 6, step: 2, reserve: 1.3, buff: 4,
      pool: ["dirk", "axe", "buckler", "cloak", "vial", "goad", "lantern", "canteen"], packs: [["hook", "hook", "adder"], ["brute", "warden"], ["warden", "brute", "hook"]],
      restPrice: 9, restHeal: 8, rests: 2, rivalPurse: 82, greed: 1.32, jockey: 1.55, miser: 0.78, miserRaises: 3 }
  ];

  function audInt(value) {
    var num = Number(value);
    return isFinite(num) ? Math.round(num) : 0;
  }

  function audClamp(value, low, high) {
    return Math.max(low, Math.min(high, audInt(value)));
  }

  /* mulberry32: integer-only seeded walk, identical on every engine, and the
   * only randomness a run ever sees. */
  function audRandom(seed) {
    var value = audInt(seed) >>> 0;
    if (!value) {
      value = 0x9e3779b9;
    }
    return function next() {
      value = (value + 0x6d2b79f5) >>> 0;
      var mixed = Math.imul(value ^ (value >>> 15), 1 | value);
      mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  }

  function audItem(id) {
    return audItemById[id] ? audItemById[id] : audItems[0];
  }

  function audFoe(kind) {
    return audFoes[kind] ? audFoes[kind] : audFoes.rat;
  }

  /* Seat 0 is the party; seats 1-3 are the named rivals in order. */
  function audSeat(seat) {
    return audRivals[audClamp(audInt(seat) - 1, 0, 2)];
  }

  function audSeatKey(seat) {
    return seat === 0 ? "you" : audSeat(seat).key;
  }

  var AUD_STATS = ["atk", "soak", "dodge", "mend", "pierce", "ap", "rest"];

  /* Summed party stats: the kit you actually bought is what you actually have. */
  function audKit(kitIds) {
    var stats = { atk: AUD_BASE.atk, soak: 0, dodge: 0, mend: 0, pierce: 0, ap: AUD_BASE.ap, rest: 0 };
    var list = kitIds || [];
    for (var i = 0; i < list.length; i += 1) {
      var item = audItem(list[i]);
      for (var s = 0; s < AUD_STATS.length; s += 1) {
        stats[AUD_STATS[s]] += audInt(item[AUD_STATS[s]]);
      }
    }
    stats.ap = audClamp(stats.ap, 1, 3);
    return stats;
  }

  /* Accepts a level, a live run or a bare levelId, so the planner can be asked
   * about a run from either side of the panel. */
  function audLevelOf(input) {
    if (!input) {
      return audLevels[0];
    }
    if (input.level && input.level.id) {
      return input.level;
    }
    if (input.id) {
      return input;
    }
    for (var i = 0; i < audLevels.length; i += 1) {
      if (audLevels[i].id === input.levelId) {
        return audLevels[i];
      }
    }
    return audLevels[0];
  }

  /* The run's step list: lots, a door, a camp, lots, a door, a camp, lots,
   * door. Lot order, reserves and the seat that opens each lot all come off the
   * seed, so seed 20260711 is always the same auction and the same measured
   * band applies to it. */
  function audBuildRun(level, seed) {
    var def = audLevelOf(level);
    var useSeed = audInt(seed === undefined ? def.seed : seed) || def.seed || 1;
    var rng = audRandom(useSeed);
    var pool = (def.pool || []).slice();
    var i;
    for (i = pool.length - 1; i > 0; i -= 1) {
      var j = Math.floor(rng() * (i + 1));
      var hold = pool[i];
      pool[i] = pool[j];
      pool[j] = hold;
    }
    var seq = [];
    var at = 0;
    var share = pool.length ? Math.ceil(pool.length / 3) : 0;
    for (i = 0; i < 3; i += 1) {
      for (var n = 0; n < share && at < pool.length; n += 1, at += 1) {
        var item = audItem(pool[at]);
        var jitter = Math.floor(rng() * 3) - 1;
        var reserve = Math.round(audInt(item.band[0]) * (def.reserve > 0 ? def.reserve : 1)) + jitter;
        seq.push({ t: "lot", item: item.id, reserve: Math.max(1, reserve), first: Math.floor(rng() * 4) % 4 });
      }
      seq.push({ t: "fight", enc: i });
      if (i < 2) {
        seq.push({ t: "camp" });
      }
    }
    var rivals = audRivals.map(function (rival) {
      return { key: rival.key, purse: Math.max(0, audInt(def.rivalPurse)), kit: [] };
    });
    return audEnter({
      levelId: def.id, level: def, seed: useSeed, seq: seq, pos: 0, phase: "bid", cause: "",
      purse: Math.max(0, audInt(def.purse)), hp: Math.max(1, audInt(def.hp)), maxHp: Math.max(1, audInt(def.hp)),
      kit: [], rivals: rivals, lot: null, sale: null, foes: [], round: 0, patchLeft: AUD_PATCHES,
      encIdx: 0, restsLeft: 0, restsTaken: 0, spent: 0, cleared: 0, wiped: false, fallen: false, stalled: false, quiet: false
    });
  }

  function audCloneFoe(foe) {
    return {
      kind: foe.kind, hp: audInt(foe.hp), maxHp: audInt(foe.maxHp) || audInt(foe.hp),
      soak: Math.max(0, audInt(foe.soak)), guard: Math.max(0, audInt(foe.guard)), step: Math.max(0, audInt(foe.step))
    };
  }

  /* Every state change goes through a copy, so the pure resolvers a player
   * drives and the ones the planner probes never share a live object. */
  function audCopy(run) {
    if (!run) {
      return run;
    }
    var out = {};
    var key;
    for (key in run) {
      if (Object.prototype.hasOwnProperty.call(run, key)) {
        out[key] = run[key];
      }
    }
    out.kit = (run.kit || []).slice();
    out.foes = (run.foes || []).map(audCloneFoe);
    out.rivals = (run.rivals || []).map(function (rival) {
      return { key: rival.key, purse: audInt(rival.purse), kit: (rival.kit || []).slice() };
    });
    if (run.lot) {
      out.lot = {
        item: run.lot.item, reserve: audInt(run.lot.reserve), price: audInt(run.lot.price),
        step: audInt(run.lot.step), turn: audInt(run.lot.turn), live: (run.lot.live || []).slice(),
        high: (run.lot.high || []).slice(), counts: (run.lot.counts || []).slice(), raised: (run.lot.raised || []).slice(),
        done: !!run.lot.done, winner: audInt(run.lot.winner), fold: audInt(run.lot.fold), why: run.lot.why || ""
      };
    }
    return out;
  }

  function audOpenLot(run) {
    var step = (run.seq || [])[run.pos];
    if (!step || step.t !== "lot") {
      run.lot = null;
      return;
    }
    var item = audItem(step.item);
    run.lot = {
      item: item.id, reserve: Math.max(1, audInt(step.reserve)), price: Math.max(1, audInt(step.reserve)),
      step: Math.max(1, audInt(run.level.step)), turn: audInt(step.first) % 4,
      live: [true, true, true, true], high: [0, 0, 0, 0], counts: [0, 0, 0, 0], raised: [false, false, false, false],
      done: false, winner: -1, fold: -1, why: ""
    };
    run.phase = "bid";
    run.sale = null;
  }

  /* A seat's raise: the standing price climbs and that seat stays in. */
  function audRaise(lot, seat, amount) {
    lot.price = audInt(lot.price) + Math.max(1, audInt(amount));
    lot.high[seat] = Math.max(audInt(lot.high[seat]), lot.price);
    lot.raised[seat] = true;
    lot.counts[seat] = audInt(lot.counts[seat]) + 1;
  }

  function audLiveCount(lot) {
    var n = 0;
    for (var i = 0; i < 4; i += 1) {
      if (lot.live[i]) {
        n += 1;
      }
    }
    return n;
  }

  /* The hammer: at most one bidder left, so the lot is sold (or withdrawn when
   * nobody ever met the reserve) and every purse and kit line moves. */
  function audFinishLot(run, lot) {
    var live = [];
    for (var seat = 0; seat < 4; seat += 1) {
      if (lot.live[seat]) {
        live.push(seat);
      }
    }
    lot.done = true;
    lot.winner = live.length === 1 ? live[0] : -1;
    var winner = lot.winner;
    var item = audItem(lot.item);
    var price = winner >= 0 ? audInt(lot.price) : 0;
    if (winner === 0) {
      run.purse = Math.max(0, run.purse - price);
      run.spent = run.spent + price;
      if (run.kit.length < audInt(run.level.slots)) {
        run.kit.push(item.id);
      }
    } else if (winner > 0) {
      var rival = run.rivals[winner - 1];
      rival.purse = Math.max(0, audInt(rival.purse) - price);
      if (rival.kit.length < AUD_RIVAL_SLOTS) {
        rival.kit.push(item.id);
      }
    }
    run.sale = {
      item: item.id, winner: winner, winnerKey: winner >= 0 ? audSeatKey(winner) : "",
      price: price, over: winner >= 0 ? price - audInt(item.band[1]) : 0,
      under: winner >= 0 ? audInt(item.band[0]) - price : 0,
      high: lot.high.slice(), fold: lot.fold, why: lot.why,
      purse: audInt(run.purse), hp: audInt(run.hp), kit: run.kit.slice()
    };
  }

  /* A seat drops out. The lot only closes when one bidder or none is left, so
   * the rivals keep bidding against each other after the player walks away. */
  function audFoldSeat(run, lot, seat, why) {
    lot.live[seat] = false;
    if (seat === 0) {
      lot.fold = seat;
      lot.why = why;
    }
    if (audLiveCount(lot) <= 1) {
      audFinishLot(run, lot);
      return true;
    }
    return false;
  }

  /* Rival ceilings come from the true worth (band top x hidden edge), so the
   * prices they refuse to cross are the lesson the player can read off them. */
  function audRivalBid(run, lot, seat) {
    var rival = run.rivals[seat - 1];
    var item = audItem(lot.item);
    var policy = audSeat(seat);
    var worth = Math.max(1, Math.round(audInt(item.band[1]) * (item.edge > 0 ? item.edge : 1)));
    var mult = policy.key === "greed" ? run.level.greed : policy.key === "jockey" ? run.level.jockey : run.level.miser;
    var ceiling = Math.max(1, Math.round(worth * (mult > 0 ? mult : 1)));
    var next = audInt(lot.price) + audInt(lot.step);
    if (next > rival.purse || rival.kit.length >= AUD_RIVAL_SLOTS) {
      return false;
    }
    /* She never opens, and she quits the second you do. */
    if (policy.key === "jockey") {
      return !!lot.raised[0] && !!lot.live[0] && next <= ceiling;
    }
    if (policy.key === "miser") {
      return next <= ceiling && lot.counts[seat] < Math.max(0, audInt(run.level.miserRaises));
    }
    return next <= ceiling;
  }

  /* One sale, played from the standing lot state. bids is the player's own line
   * for this lot: every entry is the raise they place on their next turn and a
   * zero entry means they pass. The rival seats answer with their policies, so
   * this single function drives the panel, the greedy probe and the planner. */
  function auctionRound(state, bids) {
    var run = audCopy(state);
    if (!run || run.phase !== "bid" || !run.lot || run.lot.done) {
      return { state: run, sale: run ? run.sale : null, waiting: false };
    }
    var lot = run.lot;
    var line = (bids || []).slice();
    var slots = audInt(run.level.slots);
    var guard = 0;
    while (!lot.done && guard < AUD_SALE_CAP) {
      guard += 1;
      if (!lot.live[lot.turn]) {
        lot.turn = (lot.turn + 1) % 4;
        continue;
      }
      if (lot.turn === 0) {
        if (!line.length) {
          /* The player's line is spent with the hammer still up: the panel
           * waits for the next paddle and nothing is settled yet. */
          break;
        }
        var bid = audInt(line.shift());
        var reason = bid <= 0 ? "you" : run.kit.length >= slots ? "full" : lot.price + bid > run.purse ? "poor" : "";
        lot.turn = 1;
        if (reason) {
          if (audFoldSeat(run, lot, 0, reason)) {
            break;
          }
          continue;
        }
        audRaise(lot, 0, bid);
        continue;
      }
      if (audRivalBid(run, lot, lot.turn)) {
        audRaise(lot, lot.turn, lot.step);
      } else {
        audFoldSeat(run, lot, lot.turn, "plan");
      }
      if (!lot.done) {
        lot.turn = (lot.turn + 1) % 4;
      }
    }
    if (!lot.done && guard >= AUD_SALE_CAP) {
      lot.why = "spent";
      audFinishLot(run, lot);
    }
    return { state: run, sale: run.sale, waiting: !lot.done };
  }

  /* ---------------- combat ---------------- */

  function audIntent(foe) {
    var pattern = audFoe(foe.kind).pattern;
    return pattern[audInt(foe.step) % pattern.length] || pattern[0];
  }

  function audStartFoes(run, enc) {
    var packs = run.level.packs && run.level.packs.length ? run.level.packs : [["rat"], ["adder"], ["hook"]];
    var kinds = packs[audClamp(enc, 0, packs.length - 1)] || [];
    var out = [];
    for (var i = 0; i < kinds.length; i += 1) {
      var spec = audFoe(kinds[i]);
      var hp = Math.max(1, audInt(spec.hp) + audInt(run.level.buff));
      out.push({ kind: audFoes[kinds[i]] ? kinds[i] : "rat", hp: hp, maxHp: hp, soak: audInt(spec.soak), guard: 0, step: 0 });
    }
    if (!out.length) {
      out.push({ kind: "rat", hp: 1, maxHp: 1, soak: 0, guard: 0, step: 0 });
    }
    return out;
  }

  function audFront(foes) {
    for (var i = 0; i < foes.length; i += 1) {
      if (foes[i].hp > 0) {
        return foes[i];
      }
    }
    return null;
  }

  function audStrikeDamage(stats, foe) {
    var soak = Math.max(0, audInt(foe.soak));
    if (audInt(stats.pierce) <= 0) {
      soak += Math.max(0, audInt(foe.guard));
    }
    return Math.max(0, audInt(stats.atk) - soak);
  }

  function audIncoming(foes) {
    var total = 0;
    for (var i = 0; i < foes.length; i += 1) {
      if (foes[i].hp <= 0) {
        continue;
      }
      var intent = audIntent(foes[i]);
      total += intent.k === "bite" ? audInt(intent.n) * 2 : intent.k === "guard" ? 0 : audInt(intent.n);
    }
    return total;
  }

  /* One round: your queued commands land, then every living foe resolves the
   * intent printed above it. No randomness, so kit + party + plan always give
   * the same next state - which is what lets the planner measure a band. */
  function audFightRound(run, commands, stats, events) {
    var next = audCopy(run);
    var foes = next.foes;
    var guardLeft = Math.max(0, audInt(stats.soak));
    var dodges = Math.max(0, audInt(stats.dodge));
    var quiet = !!next.quiet;
    function say(key, vars) {
      if (!quiet) {
        events.push(t(key, vars));
      }
    }
    var i;
    if (audInt(stats.mend) > 0 && next.hp > 0) {
      next.hp = Math.min(audInt(next.maxHp), next.hp + audInt(stats.mend));
      say("audEvMend", { n: audInt(stats.mend), h: next.hp });
    }
    var asked = commands || [];
    var ap = audClamp(stats.ap, 1, 3);
    for (i = 0; i < asked.length && i < ap; i += 1) {
      var order = asked[i];
      var glyph = "";
      var foe = null;
      if (order === "brace") {
        guardLeft += AUD_BRACE;
        say("audEvBrace", { n: guardLeft });
      } else if (order === "patch") {
        if (next.patchLeft <= 0) {
          say("audNoPatch", {});
          continue;
        }
        next.patchLeft -= 1;
        var healed = Math.max(0, Math.min(audInt(next.maxHp) - audInt(next.hp), AUD_PATCH));
        next.hp = audInt(next.hp) + healed;
        say("audEvPatch", { n: healed, h: next.hp });
      } else if (order === "strike") {
        foe = audFront(foes);
        if (!foe) {
          break;
        }
        var dealt = audStrikeDamage(stats, foe);
        foe.guard = Math.max(0, audInt(foe.guard) - dealt);
        foe.hp = Math.max(0, audInt(foe.hp) - dealt);
        glyph = audFoe(foe.kind).gl;
        say(dealt > 0 ? "audEvHit" : "audEvMiss", { g: glyph, n: dealt, h: foe.hp });
        if (foe.hp <= 0) {
          say("audEvKill", { g: glyph });
        }
      }
    }
    for (i = 0; i < foes.length; i += 1) {
      var live = foes[i];
      if (live.hp <= 0) {
        continue;
      }
      var intent = audIntent(live);
      var mark = audFoe(live.kind).gl;
      if (intent.k === "guard") {
        live.guard = Math.min(9, audInt(live.guard) + audInt(intent.n));
        say("audEvFoeGuard", { g: mark, n: live.guard });
      } else {
        for (var hit = 0; hit < (intent.k === "bite" ? 2 : 1); hit += 1) {
          var raw = Math.max(0, audInt(intent.n));
          if (dodges > 0) {
            dodges -= 1;
            say("audEvDodge", { g: mark });
            continue;
          }
          var eaten = intent.k === "rend" ? 0 : Math.min(guardLeft, raw);
          guardLeft -= eaten;
          var took = raw - eaten;
          next.hp = Math.max(0, audInt(next.hp) - took);
          say(took > 0 ? "audEvHurt" : "audEvSoak", { g: mark, n: took, h: next.hp });
        }
        /* A brace only covers the round it was telegraphed for. */
        live.guard = 0;
      }
      live.step = audInt(live.step) + 1;
    }
    next.round = audInt(next.round) + 1;
    next.hp = audInt(next.hp);
    next.wiped = !audFront(foes);
    next.fallen = next.hp <= 0;
    next.stalled = !next.wiped && !next.fallen && next.round >= AUD_ROUND_CAP;
    if (next.fallen || next.stalled) {
      next.phase = "lost";
      next.cause = next.fallen ? "hp" : "stalled";
    }
    return next;
  }

  /* Round-by-round resolution of the bought kit against telegraphed intents.
   * plan is either one round's command list or a list of such lists. */
  function auctionEncounter(state, plan) {
    var run = audCopy(state);
    var stats = audKit(run.kit);
    var events = [];
    var input = plan || [];
    var rounds = input.length && Object.prototype.toString.call(input[0]) === "[object Array]" ? input.slice() : [input];
    for (var r = 0; r < rounds.length; r += 1) {
      if (run.wiped || run.fallen || run.stalled) {
        break;
      }
      run = audFightRound(run, rounds[r], stats, events);
    }
    return {
      state: run, events: run.quiet ? [] : events.slice(0, 8), wiped: !!run.wiped,
      fallen: !!run.fallen, stalled: !!run.stalled, round: audInt(run.round), hp: audInt(run.hp)
    };
  }

  /* ---------------- state machine ---------------- */

  function audEnter(run) {
    var steps = run.seq || [];
    if (run.pos >= steps.length) {
      run.phase = "won";
      run.lot = null;
      run.foes = [];
      return run;
    }
    var step = steps[run.pos];
    if (step.t === "lot") {
      if (!run.lot || run.lot.done || run.lot.item !== step.item) {
        run.sale = null;
        audOpenLot(run);
      }
      return run;
    }
    if (step.t === "camp") {
      run.phase = "camp";
      run.lot = null;
      run.foes = [];
      run.restsLeft = Math.max(0, audInt(run.level.rests));
      return run;
    }
    run.phase = "fight";
    run.lot = null;
    run.foes = audStartFoes(run, step.enc);
    run.round = 0;
    run.patchLeft = AUD_PATCHES;
    run.wiped = false;
    run.fallen = false;
    run.stalled = false;
    return run;
  }

  /* Step past what just finished. The panel and the planner both call this, so
   * a measured line is by construction a legal one. */
  function audAdvance(state) {
    var run = audCopy(state);
    if (run.phase === "won" || run.phase === "lost") {
      return run;
    }
    if (run.phase === "bid") {
      if (run.lot && !run.lot.done) {
        return run;
      }
      if (!run.lot) {
        return audEnter(run);
      }
    }
    if (run.phase === "fight" && !run.wiped) {
      return run;
    }
    run.pos += 1;
    var done = (run.seq || [])[run.pos - 1];
    if (done && done.t === "fight") {
      run.encIdx = audInt(run.encIdx) + 1;
      run.cleared = audInt(run.cleared) + 1;
    }
    return audEnter(run);
  }

  /* The pressure valve: purse only becomes healing, and only between doors. */
  function audRest(state) {
    var run = audCopy(state);
    if (run.phase !== "camp" || run.restsLeft <= 0) {
      return { state: run, note: "none" };
    }
    var price = Math.max(1, audInt(run.level.restPrice));
    if (run.purse < price) {
      return { state: run, note: "poor" };
    }
    if (run.hp >= run.maxHp) {
      return { state: run, note: "full" };
    }
    var mend = Math.max(1, audInt(run.level.restHeal) + audInt(audKit(run.kit).rest));
    var got = Math.min(audInt(run.maxHp) - audInt(run.hp), mend);
    run.purse = audInt(run.purse) - price;
    run.hp = audInt(run.hp) + got;
    run.restsLeft = audInt(run.restsLeft) - 1;
    run.restsTaken = audInt(run.restsTaken) + 1;
    return { state: run, note: "mend", mend: got, cost: price, heal: mend };
  }

  /* ---------------- planner ---------------- */

  /* The heuristic a careful player uses: kill what you can, brace before the
   * blow that would end you, patch only when the door will not fall this round. */
  function audTactic(run, stats) {
    var plan = [];
    var braced = false;
    var guard = 0;
    while (plan.length < audClamp(stats.ap, 1, 3) && guard < 6) {
      guard += 1;
      var foe = audFront(run.foes);
      if (!foe) {
        break;
      }
      var lethal = audIncoming(run.foes);
      var dmg = audStrikeDamage(stats, foe);
      if (dmg >= foe.hp) {
        plan.push("strike");
      } else if (lethal >= run.hp && !braced) {
        braced = true;
        plan.push("brace");
      } else if (lethal <= 0 && run.patchLeft > 0 && run.hp < run.maxHp && foe.hp > dmg * 2) {
        plan.push("patch");
      } else {
        plan.push("strike");
      }
    }
    return plan.length ? plan : ["strike"];
  }

  /* A fight only depends on the door, the party's hit points and the kit, so
   * the same outcome is reused across the search instead of replayed. */
  var audFightMemo = {};

  function audPlayOut(state) {
    var step = (state.seq || [])[state.pos];
    var sig = "f" + (step ? step.enc : 0) + "|" + state.levelId + "|" + audInt(state.hp) + "/" + audInt(state.maxHp) + "|" + state.kit.slice().sort().join(",");
    var memo = audFightMemo[sig];
    if (memo) {
      var jump = audCopy(state);
      jump.hp = memo.hp;
      jump.phase = memo.phase;
      jump.cause = memo.cause;
      jump.wiped = memo.wiped;
      jump.fallen = memo.fallen;
      jump.stalled = memo.stalled;
      return { state: audAdvance(jump), alive: memo.wiped };
    }
    var run = audCopy(state);
    var stats = audKit(run.kit);
    var guard = 0;
    while (!run.wiped && !run.fallen && !run.stalled && guard < AUD_ROUND_CAP + 2) {
      guard += 1;
      run = audFightRound(run, audTactic(run, stats), stats, []);
    }
    audFightMemo[sig] = {
      hp: audInt(run.hp), phase: run.phase, cause: run.cause,
      wiped: !!run.wiped, fallen: !!run.fallen, stalled: !!run.stalled
    };
    return { state: audAdvance(run), alive: !!run.wiped };
  }

  var audCache = {};
  var audBudget = 0;

  /* Depth-first search over the player's legal lines: at every lot either pass
   * or bid until the hammer falls, at every camp take any number of rests, and
   * let the shared resolvers settle the doors. Reports the richest surviving
   * line, the thinnest surviving line, and whether anything survives at all. */
  function audMeasure(input) {
    var level = audLevelOf(input);
    var seed = audInt(input && input.seed) || audInt(level.seed);
    var cacheKey = level.id + ":" + seed;
    if (audCache[cacheKey]) {
      return audCache[cacheKey];
    }
    var root = audBuildRun(level, seed);
    root.quiet = true;
    var best = null;
    var floor = null;
    audBudget = 6000;

    function snapshot(state, spent) {
      var purse = audInt(state.purse);
      return { purse: purse, hp: audInt(state.hp), kit: state.kit.slice(), rests: audInt(state.restsTaken), spent: spent, seed: seed, levelId: level.id };
    }

    function walk(state, spent) {
      if (audBudget <= 0) {
        return;
      }
      audBudget -= 1;
      if (state.phase === "lost") {
        return;
      }
      if (state.phase === "won") {
        if (!best || state.purse > best.purse) {
          best = snapshot(state, spent);
        }
        if (!floor || state.purse < floor.purse) {
          floor = snapshot(state, spent);
        }
        return;
      }
      if (state.phase === "bid") {
        walk(audAdvance(auctionRound(state, [0]).state), spent);
        var climb = state;
        var tries = 0;
        while (climb.lot && !climb.lot.done && tries < 24) {
          tries += 1;
          climb = auctionRound(climb, [Math.max(1, audInt(climb.level.step))]).state;
        }
        if (climb.lot && climb.lot.done) {
          walk(audAdvance(climb), spent + (climb.lot.winner === 0 ? audInt(climb.lot.price) : 0));
        }
        return;
      }
      if (state.phase === "camp") {
        var resting = state;
        var left = Math.max(0, audInt(state.restsLeft));
        for (var r = 0; ; r += 1) {
          walk(audAdvance(resting), spent);
          if (r >= left) {
            break;
          }
          var took = audRest(resting);
          if (took.note !== "mend") {
            break;
          }
          resting = took.state;
        }
        return;
      }
      if (state.phase === "fight") {
        walk(audPlayOut(state).state, spent);
        return;
      }
      walk(audAdvance(state), spent);
    }

    walk(root, 0);
    var measured = { levelId: level.id, seed: seed, best: best, floor: floor, clears: !!best, takeAll: audTakeAll({ level: level, seed: seed }) };
    audCache[cacheKey] = measured;
    return measured;
  }

  /* The trap made measurable: bid to win every lot, then rest with whatever
   * survives. The planner reports it next to its own restrained line. */
  function audTakeAll(input) {
    var run = audBuildRun(audLevelOf(input), input && input.seed);
    run.quiet = true;
    var guard = 0;
    while (run.phase !== "won" && run.phase !== "lost" && guard < 120) {
      guard += 1;
      if (run.phase === "bid") {
        var tries = 0;
        while (run.lot && !run.lot.done && tries < 24) {
          tries += 1;
          run = auctionRound(run, [Math.max(1, audInt(run.level.step))]).state;
        }
      } else if (run.phase === "camp") {
        for (var r = 0; r < 6; r += 1) {
          var took = audRest(run);
          if (took.note !== "mend") {
            break;
          }
          run = took.state;
        }
      } else if (run.phase === "fight") {
        run = audPlayOut(run).state;
      } else {
        break;
      }
      run = audAdvance(run);
    }
    return { purse: audInt(run.purse), hp: audInt(run.hp), phase: run.phase, cause: run.cause, kit: run.kit.slice() };
  }

  /* Bands are measured, never guessed: three stars is what the planner's best
   * legal line actually kept, one star is the thinnest line that still cleared,
   * two stars the midpoint between them. */
  function audBand(level) {
    var measured = audMeasure(level);
    var top = measured.best ? audInt(measured.best.purse) : Math.max(1, Math.round(audInt(level.purse) * 0.4));
    var low = measured.floor ? audInt(measured.floor.purse) : 0;
    if (top <= low) {
      top = low + Math.max(4, Math.round(audInt(level.purse) * 0.15));
    }
    return [top, Math.max(low + 1, Math.round(low + (top - low) / 2)), low];
  }

  function initAuctionDungeonGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "auction-dungeon-campaign", levels: audLevels });
    var level = audLevels[Math.max(0, campaign.indexOf(campaign.nextLevelId()))] || audLevels[0];
    var run = null;
    var stepPick = 0;
    var plan = [];
    var roundLog = [];

    /* --- markup: createElement all the way down, no innerHTML --- */
    function node(tag, cls, parent, text) {
      var made = document.createElement(tag);
      if (cls) {
        made.className = cls;
      }
      if (text !== undefined) {
        made.textContent = text;
      }
      if (parent) {
        parent.appendChild(made);
      }
      return made;
    }

    function labelled(el, key) {
      el.setAttribute("data-i18n", key);
      el.textContent = t(key);
      return el;
    }

    function group(el, labelKey) {
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "group");
      el.setAttribute("aria-label", t(labelKey));
      return el;
    }

    function button(cls, key, handler, parent) {
      var made = node("button", cls, parent);
      made.type = "button";
      labelled(node("span", null, node("span", "button-content", made)), key);
      made.addEventListener("click", function () {
        handler();
      });
      return made;
    }

    var hud = node("div", "game-hud");
    var purseEl = makeStat(hud, "audPurseLabel");
    var hpEl = makeStat(hud, "audHpLabel");
    var kitEl = makeStat(hud, "audKitLabel");
    var stageEl = makeStat(hud, "audStageLabel");

    var lotBox = group(node("div", "aud-lot"), "audLotLabel");
    var lotHead = node("p", "aud-lothead", lotBox);
    var lotFx = node("p", "aud-loteffect", lotBox);
    var lotBand = node("p", "aud-lotband", lotBox);
    var lotPrice = node("p", "aud-price", lotBox);
    var saleBox = node("div", "aud-sale", lotBox);
    saleBox.setAttribute("role", "group");
    saleBox.setAttribute("aria-label", t("audSaleLabel"));
    var bidRow = node("div", "aud-bidrow", lotBox);
    var stepBtns = [];
    [1, 2, 4].forEach(function (mult, index) {
      var stepBtn = node("button", "aud-btn aud-stepbtn", bidRow);
      stepBtn.type = "button";
      stepBtn.setAttribute("aria-keyshortcuts", String(index + 1));
      stepBtn.addEventListener("click", function () {
        stepPick = index;
        render();
      });
      stepBtns.push(stepBtn);
    });
    var bidBtn = button("aud-btn aud-bid", "audBtnBid", placeBid, bidRow);
    bidBtn.setAttribute("aria-keyshortcuts", "B");
    var passBtn = button("aud-btn", "audBtnPass", passLot, bidRow);
    passBtn.setAttribute("aria-keyshortcuts", "P");
    var nextLotBtn = button("aud-btn aud-next", "audBtnNext", advance, bidRow);
    nextLotBtn.setAttribute("aria-keyshortcuts", "N");
    var lotKitLine = node("p", "aud-kits", lotBox);

    var bidderBox = group(node("div", "aud-bidders"), "audBiddersLabel");
    var bidderRows = [];
    for (var seat = 0; seat < 4; seat += 1) {
      var brow = node("div", "aud-bidder", bidderBox);
      bidderRows.push({
        row: brow, name: node("strong", "aud-bidname", brow), plan: node("span", "aud-bidplan", brow),
        state: node("span", "aud-bidstate", brow), purse: node("span", "aud-bidpurse", brow), kit: node("span", "aud-bidkit", brow)
      });
    }

    var stageBox = group(node("div", "aud-stage"), "audStageLabelAria");
    var stageHead = node("p", "aud-stagehead", stageBox);
    var foeBox = node("div", "aud-foes", stageBox);
    var foeRows = [];
    for (var slot = 0; slot < 3; slot += 1) {
      var frow = node("div", "aud-foe", foeBox);
      frow.hidden = true;
      foeRows.push({ row: frow, name: node("strong", "aud-foename", frow), state: node("span", "aud-foestate", frow), intent: node("span", "aud-intent", frow) });
    }
    var campBox = node("div", "aud-camp", stageBox);
    var campHead = node("p", "aud-camphead", campBox);
    var restBtn = button("aud-btn", "audBtnRest", takeRest, campBox);
    restBtn.setAttribute("aria-keyshortcuts", "R");
    var marchBtn = button("aud-btn", "audBtnMarch", advance, campBox);
    marchBtn.setAttribute("aria-keyshortcuts", "M");
    var cmdRow = node("div", "aud-commands", stageBox);
    ["strike", "brace", "patch"].forEach(function (name, index) {
      var cmdBtn = button("aud-btn aud-cmdbtn", "audCmd" + name.charAt(0).toUpperCase() + name.slice(1), function () {
        queue(name);
      }, cmdRow);
      cmdBtn.setAttribute("aria-keyshortcuts", String(index + 1));
    });
    var resolveBtn = button("aud-btn aud-cmdbtn aud-go", "audCmdResolve", resolveRound, cmdRow);
    var queueLine = node("p", "aud-queue", stageBox);
    var logLine = node("p", "aud-log", stageBox);

    var result = node("p", "game-result");
    result.setAttribute("role", "status");
    var pickerRow = node("div", "elements-row");
    var pickerLabel = node("label", "elements-label", pickerRow);
    pickerLabel.setAttribute("for", "audRunSel");
    labelled(pickerLabel, "audRunSelectLabel");
    var picker = node("select", "elements-select", pickerRow);
    picker.id = "audRunSel";
    var actions = node("div", "game-actions");
    var newBtn = button("primary", "btnNewRound", startRun, actions);
    var bestEl = node("p", "game-best", actions);
    var hint = labelled(node("p", "game-hint"), "audHint");

    [hud, lotBox, bidderBox, stageBox, result, pickerRow, actions, hint].forEach(function (made) {
      panelEl.appendChild(made);
    });

    function makeStat(parent, key) {
      var stat = node("div", "game-stat", parent);
      labelled(node("span", null, stat), key);
      return node("strong", null, stat);
    }

    function coins(n) {
      return t("audCoins", { n: audInt(n) });
    }

    function hitWords(state) {
      return t("audHpValue", { n: audInt(state.hp), max: audInt(state.maxHp) });
    }

    function cmdWord(name) {
      return t(name === "brace" ? "audCmdBrace" : name === "patch" ? "audCmdPatch" : "audCmdStrike");
    }

    function kitWords(kit) {
      if (!kit || !kit.length) {
        return t("audNoKit");
      }
      return kit.map(function (id) {
        return t(audItem(id).key);
      }).join(" / ");
    }

    function seatName(who) {
      return who === 0 ? t("audYouName") : t(audSeat(who).nameKey);
    }

    /* ---------------- play ---------------- */

    function startRun() {
      run = audBuildRun(level);
      stepPick = 0;
      plan = [];
      roundLog = [];
      audEnter(run);
      result.textContent = t("audPrompt", { name: t(level.labelKey), twist: t(level.twistKey), purse: coins(level.purse), hp: hitWords(run), seed: audInt(run.seed) });
      render();
    }

    function bidLine(line) {
      if (!run || run.phase !== "bid" || !run.lot || run.lot.done) {
        return;
      }
      run = auctionRound(run, line).state;
      render();
    }

    function placeBid() {
      bidLine([bidAmount()]);
    }

    function passLot() {
      bidLine([0]);
    }

    function advance() {
      if (!run) {
        return;
      }
      if (run.phase === "won" || run.phase === "lost") {
        startRun();
        return;
      }
      var before = run.pos;
      run = audAdvance(run);
      if (run.pos === before) {
        return;
      }
      if (run.phase === "won") {
        finishWin();
      }
      render();
    }

    function takeRest() {
      if (!run || run.phase !== "camp") {
        return;
      }
      var took = audRest(run);
      run = took.state;
      result.textContent = took.note === "poor" ? t("audRestPoor", { c: coins(level.restPrice), p: coins(run.purse) })
        : took.note === "full" ? t("audRestFull", { hp: hitWords(run) })
        : took.note === "none" ? t("audRestNone")
        : t("audRested", { h: t("audHpGain", { n: took.mend }), c: coins(took.cost), hp: hitWords(run) });
      render();
    }

    function queue(name) {
      if (!run || run.phase !== "fight" || run.wiped || run.fallen) {
        return;
      }
      var ap = audClamp(audKit(run.kit).ap, 1, 3);
      if (plan.length >= ap || plan.indexOf(name) !== -1) {
        return;
      }
      plan.push(name);
      if (plan.length >= ap) {
        resolveRound();
        return;
      }
      render();
    }

    function resolveRound() {
      if (!run || run.phase !== "fight" || run.wiped || run.fallen) {
        return;
      }
      var out = auctionEncounter(run, plan.length ? plan.slice() : ["strike"]);
      run = out.state;
      plan = [];
      roundLog = out.events.length ? out.events : [t("audSilence")];
      if (run.fallen || run.stalled) {
        result.textContent = run.fallen
          ? t("audLostHp", { n: audInt(run.encIdx) + 1, seed: audInt(run.seed) })
          : t("audLostStall", { n: audInt(run.encIdx) + 1, cap: AUD_ROUND_CAP, seed: audInt(run.seed) });
        refreshPicker();
        render();
        return;
      }
      if (run.wiped) {
        result.textContent = t("audClearedEnc", { n: audInt(run.encIdx) + 1, hp: hitWords(run), purse: coins(run.purse) });
        var wasWon = run.pos;
        run = audAdvance(run);
        if (run.phase === "won" && run.pos !== wasWon) {
          finishWin();
        }
      }
      render();
    }

    function finishWin() {
      var bands = level.starPurse || audBand(level);
      var kept = audInt(run.purse);
      var starsWon = starsFor(kept, bands, "high");
      var outcome = campaign.record(level.id, { stars: starsWon, best: kept, better: "high" });
      var message = t("audWon", { n: (level.packs || []).length, c: coins(kept), s: starsWon, hp: hitWords(run) });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("audNextRun");
      } else if (campaign.clearedCount() === audLevels.length) {
        message += " " + t("audAllRuns");
      }
      message += " " + bandsWords(bands);
      result.textContent = message;
      logAction(t("logAuctionDungeon", { n: kept }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function bandsWords(bands) {
      return t("audBands", { three: coins(bands[0]), one: coins(bands[2]) });
    }

    /* ---------------- render ---------------- */

    function renderHud() {
      purseEl.textContent = coins(run.purse);
      hpEl.textContent = hitWords(run);
      kitEl.textContent = t("audKitValue", { n: run.kit.length, max: audInt(level.slots) });
      var step = run.seq[run.pos];
      var word = !step ? t("audStageDone") : step.t === "lot" ? t("audStageLot") : step.t === "camp" ? t("audStageCamp") : t("audStageFight");
      stageEl.textContent = word + " " + t("audStageValue", { n: audInt(run.pos) + 1, total: run.seq.length });
    }

    function bidAmount() {
      return Math.max(1, audInt(level.step)) * ([1, 2, 4][audClamp(stepPick, 0, 2)] || 1);
    }

    function topBidder() {
      var best = -1;
      var value = -1;
      for (var s = 0; s < 4; s += 1) {
        if (run.lot.live[s] && audInt(run.lot.high[s]) > value) {
          value = audInt(run.lot.high[s]);
          best = s;
        }
      }
      return best < 0 ? t("audNobody") : seatName(best);
    }

    function saleRow(text, isWinner, isOver) {
      node("p", "aud-salerow" + (isWinner ? " aud-is-win" : "") + (isOver ? " aud-is-over" : ""), saleBox, text);
    }

    function renderLot() {
      var live = run.phase === "bid" && !!run.lot;
      lotBox.hidden = !live;
      if (!live) {
        return;
      }
      var item = audItem(run.lot.item);
      var lots = 0;
      var seen = 0;
      for (var i = 0; i < run.seq.length; i += 1) {
        if (run.seq[i].t === "lot") {
          lots += 1;
          if (i <= run.pos) {
            seen += 1;
          }
        }
      }
      lotHead.textContent = t("audLotHead", { n: seen, total: lots, name: t(item.key) });
      lotFx.textContent = t("audLotFx", { text: t(item.fx, { n: audInt(item.fxv) }) });
      lotBand.textContent = t("audLotBand", { low: coins(item.band[0]), high: coins(item.band[1]), reserve: coins(run.lot.reserve) });
      lotPrice.textContent = run.lot.done
        ? t("audSaleDone", { who: run.sale && run.sale.winner >= 0 ? seatName(run.sale.winner) : t("audNobody"), n: coins(run.sale ? run.sale.price : 0) })
        : t("audPriceNow", { n: coins(run.lot.price), step: t("audBidStep", { n: coins(bidAmount()) }), top: topBidder() });
      lotKitLine.textContent = t("audYourKit", { count: t("audKitValue", { n: run.kit.length, max: audInt(level.slots) }), items: kitWords(run.kit) });
      saleBox.textContent = "";
      saleBox.hidden = !run.lot.done;
      if (run.lot.done && run.sale) {
        renderSale();
      }
      [1, 2, 4].forEach(function (mult, index) {
        var amount = Math.max(1, audInt(level.step)) * mult;
        stepBtns[index].textContent = "+" + coins(amount);
        stepBtns[index].className = "aud-btn aud-stepbtn" + (index === stepPick ? " aud-is-sel" : "");
        stepBtns[index].setAttribute("aria-label", t("audStepAria", { n: amount }));
        stepBtns[index].disabled = run.lot.done;
      });
      bidBtn.hidden = passBtn.hidden = run.lot.done;
      nextLotBtn.hidden = !run.lot.done;
      bidBtn.disabled = !run.lot.live[0] || run.purse < run.lot.price + bidAmount();
      passBtn.disabled = !run.lot.live[0];
    }

    /* The reveal the doc asks for: what every seat bid, and what each one walks
     * away with, so the rivals' strategy can be read after the hammer falls. */
    function renderSale() {
      var sale = run.sale;
      saleRow(t("audSaleItem", { name: t(audItem(sale.item).key), price: coins(sale.price), who: sale.winner >= 0 ? seatName(sale.winner) : t("audNobody") }), sale.winner === 0);
      for (var s = 0; s < 4; s += 1) {
        var mine = s === 0;
        var high = audInt(sale.high[s]);
        saleRow(t("audBidRow", { who: seatName(s), high: high > 0 ? coins(high) : t("audNeverBid"), purse: coins(mine ? run.purse : run.rivals[s - 1].purse), kit: kitWords(mine ? run.kit : run.rivals[s - 1].kit) }), sale.winner === s);
      }
      if (sale.winner >= 0 && audInt(sale.over) > 0) {
        saleRow(t("audOverpaid", { who: seatName(sale.winner), n: coins(sale.over) }), false, true);
      } else if (sale.winner >= 0 && audInt(sale.under) > 0) {
        saleRow(t("audBargain", { who: seatName(sale.winner), n: coins(Math.abs(sale.under)) }), false);
      }
      if (sale.why === "full") {
        saleRow(t("audKitFullMsg", { n: audInt(level.slots) }), false);
      } else if (sale.why === "poor") {
        saleRow(t("audPoorMsg", { n: coins(audInt(run.lot.price) + bidAmount()) }), false);
      } else if (sale.winner < 0) {
        saleRow(t("audUnsold"), false);
      }
    }

    function renderBidders() {
      var bidding = run.phase === "bid" && !!run.lot;
      for (var s = 0; s < 4; s += 1) {
        var row = bidderRows[s];
        var mine = s === 0;
        var policy = audSeat(s);
        var inLot = bidding && !!run.lot.live[s];
        var high = bidding ? audInt(run.lot.high[s]) : 0;
        row.name.textContent = mine ? t("audYouName") : t(policy.nameKey);
        row.plan.textContent = mine ? t("audYouPlan") : t(policy.planKey);
        row.purse.textContent = t("audHasCoins", { n: coins(mine ? run.purse : run.rivals[s - 1].purse) });
        row.kit.textContent = t("audHasKit", { k: kitWords(mine ? run.kit : run.rivals[s - 1].kit) });
        row.state.textContent = !bidding ? t("audSeatIdle")
          : inLot ? t("audSeatIn", { n: high > 0 ? coins(high) : t("audReserveWord") })
          : t("audSeatOut", { n: high > 0 ? coins(high) : t("audNeverBid") });
        row.row.className = "aud-bidder" + (inLot ? " aud-is-in" : " aud-is-out") + (mine ? " aud-is-you" : "");
      }
    }

    function intentText(intent) {
      var value = t("audDamage", { n: audInt(intent.n) });
      if (intent.k === "bite") {
        return t("audIntentBite", { n: value });
      }
      if (intent.k === "rend") {
        return t("audIntentRend", { n: value });
      }
      return intent.k === "guard" ? t("audIntentGuard", { n: audInt(intent.n) }) : t("audIntentHit", { n: value });
    }

    function renderStage() {
      var stats = audKit(run.kit);
      var fighting = run.phase === "fight";
      var camping = run.phase === "camp";
      stageBox.hidden = !(fighting || camping);
      if (!fighting && !camping) {
        return;
      }
      foeBox.hidden = cmdRow.hidden = queueLine.hidden = !fighting;
      campBox.hidden = !camping;
      if (camping) {
        stageHead.textContent = t("audStageCamp") + " " + t("audStageValue", { n: audInt(run.pos) + 1, total: run.seq.length });
        campHead.textContent = t("audCampHead", {
          left: audInt(run.restsLeft), rests: audInt(level.rests), price: coins(level.restPrice),
          heal: t("audHpGain", { n: audInt(level.restHeal) + audInt(stats.rest) }), purse: coins(run.purse), hp: hitWords(run)
        });
        restBtn.disabled = run.restsLeft <= 0 || run.purse < audInt(level.restPrice) || run.hp >= run.maxHp;
        logLine.textContent = roundLog.length ? roundLog.join(" / ") : t("audCampQuiet");
        return;
      }
      var doors = Math.max(1, (level.packs || []).length);
      stageHead.textContent = t("audEncHead", {
        n: Math.min(doors, audInt(run.encIdx) + 1), total: doors, ap: t("audApValue", { n: audClamp(stats.ap, 1, 3) }),
        atk: t("audStrikeValue", { n: audInt(stats.atk) }), soak: t("audGuardValue", { n: audInt(stats.soak) })
      });
      for (var f = 0; f < foeRows.length; f += 1) {
        var foe = run.foes[f];
        var spec = audFoe(foe ? foe.kind : "rat");
        foeRows[f].row.hidden = !foe;
        if (!foe) {
          continue;
        }
        foeRows[f].name.textContent = spec.gl + " " + t(spec.key);
        foeRows[f].state.textContent = foe.hp > 0 ? t("audFoeState", { hp: t("audHpValue", { n: audInt(foe.hp), max: audInt(foe.maxHp) }), s: audInt(foe.soak) + audInt(foe.guard) }) : t("audFoeDown");
        foeRows[f].intent.textContent = foe.hp > 0 ? intentText(audIntent(foe)) : t("audFoeSilent");
      }
      queueLine.textContent = t("audQueue", { n: plan.length ? plan.map(cmdWord).join(" > ") : t("audNone"), left: Math.max(0, audClamp(stats.ap, 1, 3) - plan.length) });
      resolveBtn.disabled = run.wiped || run.fallen;
      logLine.textContent = (roundLog.length ? roundLog.join(" / ") + " " : "") + (run.round > 0 ? t("audRoundValue", { n: audInt(run.round), cap: AUD_ROUND_CAP }) : t("audRoundOpen", { n: AUD_ROUND_CAP }));
    }

    function refreshPicker() {
      fillCampaignPicker(picker, campaign, function (def) {
        return t(def.labelKey);
      }, t("elementsLocked"));
      picker.value = level.id;
      var best = campaign.best(level.id);
      var bands = level.starPurse || audBand(level);
      bestEl.textContent = t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() }) + " " +
        (best ? t("audBest", { n: coins(best) }) : t("noBest")) + " " + bandsWords(bands);
    }

    picker.addEventListener("change", function () {
      var position = campaign.indexOf(picker.value);
      if (position < 0 || !campaign.isUnlocked(picker.value)) {
        refreshPicker();
        return;
      }
      level = audLevels[position];
      startRun();
      refreshPicker();
    });

    /* Keyboard covers the whole run: B bids, P passes, 1-3 pick the step or the
     * command, N and Enter carry the sale or the camp onwards. */
    lotBox.addEventListener("keydown", function (event) {
      var key = String(event.key || "");
      if (key === "1" || key === "2" || key === "3") {
        event.preventDefault();
        stepPick = Number(key) - 1;
        render();
      } else if (key === "b" || key === "B") {
        event.preventDefault();
        placeBid();
      } else if (key === "p" || key === "P") {
        event.preventDefault();
        passLot();
      } else if (key === "n" || key === "N" || ((key === "Enter" || key === " ") && run && run.lot && run.lot.done)) {
        event.preventDefault();
        advance();
      }
    });

    stageBox.addEventListener("keydown", function (event) {
      var key = String(event.key || "");
      if (key === "1" || key === "2" || key === "3") {
        event.preventDefault();
        queue(["strike", "brace", "patch"][Number(key) - 1]);
      } else if (key === "r" || key === "R") {
        event.preventDefault();
        takeRest();
      } else if (key === "m" || key === "M" || key === "Enter" || key === " ") {
        event.preventDefault();
        if (run && run.phase === "camp") {
          advance();
        } else {
          resolveRound();
        }
      }
    });

    function render() {
      if (!run) {
        return;
      }
      renderHud();
      renderLot();
      renderBidders();
      renderStage();
      refreshPicker();
    }

    startRun();
  }

  /* Bilingual copy travels with the game (see core.js addStrings). */
  App.addStrings({
    en: {
      "tabAuctionDungeon": "Auction Dungeon",
      "audR1": "Stall Fares",
      "audR2": "The Jockey's Floor",
      "audR3": "Mender's Block",
      "audR4": "High Reserve Hall",
      "audR5": "The Vault Run",
      "audR6": "Twin File Hall",
      "audR7": "The Brute's Errand",
      "audR8": "Three at the Last Door",
      "audR9": "Warden's Early Round",
      "audR10": "The Last Hammer",
      "audTwist1": "three honest lots, one soft door",
      "audTwist2": "Margra sets every price against you",
      "audTwist3": "the healer's vial is in the pool and a rest decides the run",
      "audTwist4": "thin purse, steep reserves",
      "audTwist5": "every pressure at once",
      "audTwist6": "two foes behind every door, and a rest costs less than a buckler",
      "audTwist7": "the doors have grown thicker and Ost bids at a better price",
      "audTwist8": "Ost lifts his paddle three times over, Margra follows higher than ever, and three foes stand at the last door",
      "audTwist9": "three foes wait behind the very first door and the warden walks one door early",
      "audTwist10": "eight lots, two doors of three, and only what you saved can heal you",
      "audItDirk": "Iron Dirk",
      "audItAxe": "Splitter Axe",
      "audItBuckler": "Tin Buckler",
      "audItCloak": "Moth Cloak",
      "audItVial": "Healer's Vial",
      "audItGoad": "Bell Goad",
      "audItLantern": "Ridge Lantern",
      "audItCanteen": "Copper Canteen",
      "audFxAtk": "adds {n} damage to every strike",
      "audFxSoak": "your guard soaks {n} damage a round",
      "audFxDodge": "{n} enemy blow each round misses you outright",
      "audFxMend": "you mend {n} hit points at the start of each round",
      "audFxAp": "you take {n} extra action each round",
      "audFxPierce": "your strikes ignore {n} layer of enemy guard",
      "audFxRest": "every rest mends {n} extra hit points",
      "audRvGreed": "Greed the Cox",
      "audRvGreedPlan": "greedy: never leaves a lot he can still pay for",
      "audRvJockey": "Margra the Setter",
      "audRvJockeyPlan": "jockey: bids only while you are still in, quits the moment you do",
      "audRvMiser": "Ost the Miser",
      "audRvMiserPlan": "miser: lifts a paddle twice at half the worth, then hoards",
      "audFoeRat": "Crate Rat",
      "audFoeAdder": "Cellar Adder",
      "audFoeHook": "Gaff Hook",
      "audFoeBrute": "Door Brute",
      "audFoeWarden": "Vault Warden",
      "audPurseLabel": "Purse",
      "audHpLabel": "Party",
      "audKitLabel": "Kit",
      "audStageLabel": "Run",
      "audCoins": "{n} coins",
      "audHpValue": "{n} of {max} hit points",
      "audHpGain": "{n} hit points",
      "audDamage": "{n} damage",
      "audKitValue": "{n} of {max} slots used",
      "audStageValue": "step {n} of {total}",
      "audStageLot": "Lot.",
      "audStageCamp": "Camp.",
      "audStageFight": "Door.",
      "audStageDone": "Cleared.",
      "audStrikeValue": "strikes for {n}",
      "audGuardValue": "guard {n}",
      "audApValue": "{n} actions a round",
      "audLotLabel": "Lot on the block: read the band, then bid with B or pass with P",
      "audSaleLabel": "Sale reveal: what every bidder bid and what they walked away with",
      "audBiddersLabel": "Bidders: four named seats with purse, kit and status",
      "audStageLabelAria": "Encounter and camp panel: number keys pick a command, Enter resolves the round, R rests, M marches on",
      "audRunSelectLabel": "Choose a run",
      "audLotHead": "Lot {n} of {total}: {name}",
      "audLotFx": "Effect: {text}.",
      "audLotBand": "Stated value {low} to {high}. Reserve {reserve}.",
      "audPriceNow": "Price now {n}. Your raise {step}. Top bid: {top}.",
      "audSaleDone": "Sold to {who} for {n}.",
      "audYourKit": "Kit ({count}): {items}.",
      "audBidStep": "raise {n}",
      "audStepAria": "Bid step: raise by {n} coins",
      "audBtnBid": "Bid (B)",
      "audBtnPass": "Pass (P)",
      "audBtnNext": "Next lot (N)",
      "audSaleItem": "{name} goes to {who} for {price}.",
      "audBidRow": "{who}: bid up to {high} - walks away with {purse} and {kit}.",
      "audNeverBid": "never raised",
      "audNobody": "nobody",
      "audUnsold": "Nobody met the reserve: the lot goes back in the crate.",
      "audReserveWord": "the reserve",
      "audOverpaid": "{who} overpaid by {n} over the top of the band.",
      "audBargain": "{who} took it {n} under the bottom of the band.",
      "audKitFullMsg": "Your kit is full at {n} slots, so another lot was useless to you.",
      "audPoorMsg": "You could not cover the next bid of {n}, so you passed.",
      "audSeatIn": "in, up to {n}",
      "audSeatOut": "out since {n}",
      "audSeatIdle": "waiting",
      "audHasCoins": "purse {n}",
      "audHasKit": "kit {k}",
      "audNoKit": "no kit",
      "audYouName": "You (the party)",
      "audYouPlan": "you: the rivals only see your paddle go up",
      "audEncHead": "Encounter {n} of {total} - {ap}, {atk}, {soak}.",
      "audFoeState": "{hp}, soaks {s}",
      "audFoeDown": "down",
      "audFoeSilent": "no intent",
      "audIntentHit": "Intent: hits you for {n}.",
      "audIntentBite": "Intent: bites twice for {n} each.",
      "audIntentRend": "Intent: rends for {n} straight through your guard.",
      "audIntentGuard": "Intent: guards, adding {n} soak.",
      "audCmdStrike": "Strike",
      "audCmdBrace": "Brace",
      "audCmdPatch": "Patch",
      "audCmdResolve": "Resolve Round",
      "audQueue": "Queued {n} - actions left this round: {left}.",
      "audNone": "nothing",
      "audRoundValue": "Round {n} of {cap}.",
      "audRoundOpen": "Round 1 of {cap} - the door holds until it breaks.",
      "audSilence": "The torches gutter.",
      "audEvHit": "You hit {g} for {n} ({h} left)",
      "audEvMiss": "Your strike finds no gap",
      "audEvKill": "{g} goes down",
      "audEvHurt": "{g} lands {n} on you ({h} left)",
      "audEvSoak": "{g} breaks on your guard",
      "audEvDodge": "You slip {g}'s blow",
      "audEvFoeGuard": "{g} braces, now soaking {n}",
      "audEvBrace": "You brace: your guard now soaks {n}",
      "audEvPatch": "You patch wounds: {n} hit points back ({h} left)",
      "audEvMend": "Your kit mends {n} hit points ({h} left)",
      "audNoPatch": "No field dressing left this fight.",
      "audCampHead": "Camp: {left} of {rests} rests left. A rest costs {price} and mends {heal}. Purse {purse}, party {hp}.",
      "audBtnRest": "Rest",
      "audBtnMarch": "March on (M)",
      "audRested": "You rest: {h} mended for {c}, party at {hp}.",
      "audRestPoor": "A rest costs {c} and you hold {p}.",
      "audRestFull": "The party is already whole at {hp}.",
      "audRestNone": "No rests left at this camp.",
      "audCampQuiet": "Coins count quietly by the fire.",
      "audClearedEnc": "Encounter {n} cleared - {hp}, purse {purse}.",
      "audPrompt": "{name}: {twist}. Purse {purse}, party {hp}. Bid for gear, then fight with exactly what you afforded. Run {seed} replays identically.",
      "audWon": "All {n} encounters cleared with {c} left in the purse - {s} stars. Party at {hp}.",
      "audLostHp": "The party fell at encounter {n}. Run {seed} replays this auction - pass more and spend it on rests.",
      "audLostStall": "Encounter {n} would not break: {cap} rounds and the door still stood. Run {seed} - your kit was too blunt to clear it.",
      "audNextRun": "Next run unlocked.",
      "audAllRuns": "All ten runs cleared.",
      "audBands": "Three stars keeps {three}; one star keeps {one}.",
      "audBest": "Best keep: {n}.",
      "audHint": "Passing is a bid too: every coin left between encounters buys the only healing the run has.",
      "logAuctionDungeon": "Cleared the auction dungeon with {n} coins left"
    },
    zh: {
      "tabAuctionDungeon": "拍卖地城",
      "audR1": "摊位小市",
      "audR2": "压价者之地",
      "audR3": "治愈者街区",
      "audR4": "高价门厅",
      "audR5": "金库专场",
      "audR6": "双列厅",
      "audR7": "壮汉的差事",
      "audR8": "三敌守门",
      "audR9": "狱卒的早巡",
      "audR10": "最后落槌",
      "audTwist1": "三件实在货，一扇软门",
      "audTwist2": "玛格丽特专门针对你抬价",
      "audTwist3": "治疗师小瓶在货架上，一次扎营决定成败",
      "audTwist4": "钱袋紧，底价高",
      "audTwist5": "三重压力同时上身",
      "audTwist6": "每扇门后都站着两个敌人，一次扎营比锡圆盾还便宜",
      "audTwist7": "门后的敌人更扛打了，奥斯特也肯出更高的价",
      "audTwist8": "奥斯特一连举三次牌，玛格丽特跟得比以往都高，最后一道门后站着三个敌人",
      "audTwist9": "第一道门后就站着三个敌人，狱卒还提前一道门出场",
      "audTwist10": "八件货，两扇三门，能救你的只有省下的钱",
      "audItDirk": "铁匕首",
      "audItAxe": "劈裂斧",
      "audItBuckler": "锡圆盾",
      "audItCloak": "蛾翼斗篷",
      "audItVial": "治疗师小瓶",
      "audItGoad": "铃铛刺棒",
      "audItLantern": "脊线提灯",
      "audItCanteen": "铜水囊",
      "audFxAtk": "每次劈砍增加 {n} 点伤害",
      "audFxSoak": "每轮替你挡下 {n} 点伤害",
      "audFxDodge": "每轮有 {n} 次敌方攻击完全落空",
      "audFxMend": "每轮开始回复 {n} 点生命",
      "audFxAp": "每轮多 {n} 次行动",
      "audFxPierce": "你的劈砍无视 {n} 层敌方架防",
      "audFxRest": "每次扎营多回 {n} 点生命",
      "audRvGreed": "贪心的科克斯",
      "audRvGreedPlan": "贪买：只要还付得起就绝不放下一件",
      "audRvJockey": "设局的玛格丽特",
      "audRvJockeyPlan": "压价：你还在场时她才抬价，你一撤她立刻收手",
      "audRvMiser": "吝啬的奥斯特",
      "audRvMiserPlan": "吝啬：半价举两次牌，然后就抱着钱不动",
      "audFoeRat": "板条箱鼠",
      "audFoeAdder": "地窖蝰",
      "audFoeHook": "铁钩手",
      "audFoeBrute": "门闩壮汉",
      "audFoeWarden": "金库狱卒",
      "audPurseLabel": "钱袋",
      "audHpLabel": "队伍",
      "audKitLabel": "装备",
      "audStageLabel": "进程",
      "audCoins": "{n} 枚钱币",
      "audHpValue": "{n}/{max} 点生命",
      "audHpGain": "{n} 点生命",
      "audDamage": "{n} 点伤害",
      "audKitValue": "占用 {n}/{max} 个格子",
      "audStageValue": "第 {n} 步，共 {total} 步",
      "audStageLot": "拍卖。",
      "audStageCamp": "扎营。",
      "audStageFight": "关卡。",
      "audStageDone": "已打通。",
      "audStrikeValue": "劈砍造成 {n} 点伤害",
      "audGuardValue": "格挡 {n}",
      "audApValue": "每轮 {n} 次行动",
      "audLotLabel": "上拍的货物：先读价位带，再用 B 举牌、P 放弃",
      "audSaleLabel": "成交揭示：每位竞价者叫到哪里、离场时带走什么",
      "audBiddersLabel": "竞价席：四个有名字的席位，含钱袋、装备与状态",
      "audStageLabelAria": "关卡与扎营面板：数字键选动作，回车结算本轮，R 扎营，M 继续行军",
      "audRunSelectLabel": "选择一趟拍卖",
      "audLotHead": "第 {n} 件，共 {total} 件：{name}",
      "audLotFx": "效果：{text}。",
      "audLotBand": "标称价值 {low} 至 {high}。底价 {reserve}。",
      "audPriceNow": "当前价 {n}。你的加价 {step}。最高叫价：{top}。",
      "audSaleDone": "{who}以 {n} 拍得。",
      "audYourKit": "装备（{count}）：{items}。",
      "audBidStep": "加 {n}",
      "audStepAria": "加价档位：一次加 {n} 枚钱币",
      "audBtnBid": "举牌（B）",
      "audBtnPass": "放弃（P）",
      "audBtnNext": "下一件（N）",
      "audSaleItem": "{name}归{who}，成交价 {price}。",
      "audBidRow": "{who}：叫到 {high}——离开时带着 {purse} 和 {kit}。",
      "audNeverBid": "从未举牌",
      "audNobody": "无人",
      "audUnsold": "没人接底价：这件货收回箱子里。",
      "audReserveWord": "底价",
      "audOverpaid": "{who}买贵了，比标称高价多出 {n}。",
      "audBargain": "{who}捡了便宜，比标称低价少付 {n}。",
      "audKitFullMsg": "你的装备格已在 {n} 格装满，再多买一件也带不走。",
      "audPoorMsg": "下一次加价要 {n}，你付不起，只能放弃。",
      "audSeatIn": "在场，已叫到 {n}",
      "audSeatOut": "已退出，最高 {n}",
      "audSeatIdle": "等待中",
      "audHasCoins": "钱袋 {n}",
      "audHasKit": "装备 {k}",
      "audNoKit": "两手空空",
      "audYouName": "你（队伍）",
      "audYouPlan": "你：对手只在你的牌子抬起时看得见你",
      "audEncHead": "第 {n} 关，共 {total} 关——{ap}，{atk}，{soak}。",
      "audFoeState": "{hp}，可挡 {s} 点",
      "audFoeDown": "已倒下",
      "audFoeSilent": "没有意图",
      "audIntentHit": "意图：重打你 {n}。",
      "audIntentBite": "意图：撕咬两口，各 {n}。",
      "audIntentRend": "意图：撕裂 {n}，无视你的格挡。",
      "audIntentGuard": "意图：架防，多挡 {n} 点。",
      "audCmdStrike": "劈砍",
      "audCmdBrace": "格挡",
      "audCmdPatch": "包扎",
      "audCmdResolve": "结算本轮",
      "audQueue": "已排 {n}——本轮还能行动 {left} 次。",
      "audNone": "空",
      "audRoundValue": "第 {n} 轮，上限 {cap} 轮。",
      "audRoundOpen": "第 1 轮，上限 {cap} 轮——打不穿这扇门就算失败。",
      "audSilence": "火把噼啪作响。",
      "audEvHit": "你击中 {g} {n} 点（剩 {h}）",
      "audEvMiss": "你的劈砍没能找到缝隙",
      "audEvKill": "{g} 倒下了",
      "audEvHurt": "{g} 打中你 {n} 点（剩 {h}）",
      "audEvSoak": "{g} 被你的格挡吃下",
      "audEvDodge": "你闪过 {g} 的攻击",
      "audEvFoeGuard": "{g} 架起防，现在能挡 {n} 点",
      "audEvBrace": "你架起防：现在能挡 {n} 点",
      "audEvPatch": "你包扎伤口：回 {n} 点生命（剩 {h}）",
      "audEvMend": "装备替你缝了 {n} 点生命（剩 {h}）",
      "audNoPatch": "这一仗的敷料已经用尽。",
      "audCampHead": "扎营：{rests} 次机会还剩 {left} 次。一次扎营花 {price}，回 {heal}。钱袋 {purse}，队伍 {hp}。",
      "audBtnRest": "扎营",
      "audBtnMarch": "继续行军（M）",
      "audRested": "你歇了一晚：花 {c} 回了 {h}，队伍现为 {hp}。",
      "audRestPoor": "一次扎营要 {c}，而你只有 {p}。",
      "audRestFull": "队伍已经满状态：{hp}。",
      "audRestNone": "这个营地没有更多扎营次数了。",
      "audCampQuiet": "火堆边，钱币安静地数着。",
      "audClearedEnc": "第 {n} 关打通——{hp}，钱袋 {purse}。",
      "audPrompt": "{name}：{twist}。钱袋 {purse}，队伍 {hp}。竞拍装备，然后只凭买到的东西开打。种子 {seed} 可完整重放。",
      "audWon": "{n} 关全部打通，钱袋还剩 {c}——获得 {s} 星。队伍 {hp}。",
      "audLostHp": "队伍倒在第 {n} 关。种子 {seed} 可完整重放这趟拍卖——多放弃几次，把钱留给扎营。",
      "audLostStall": "第 {n} 关打不穿：{cap} 轮过去门还立着。种子 {seed}——你的装备太钝，啃不下它。",
      "audNextRun": "解锁下一趟拍卖。",
      "audAllRuns": "十趟拍卖全部打通。",
      "audBands": "三星需要剩下 {three}；一星只需剩下 {one}。",
      "audBest": "最佳结余：{n}。",
      "audHint": "放弃也是一种出价：关卡之间剩下的每一枚钱币，都是这趟旅程唯一的医术。",
      "logAuctionDungeon": "打通拍卖地城，钱袋还剩 {n} 枚"
    }
  });

  /* Measure every run's band from its own planner line at load time. */
  audLevels.forEach(function (level) {
    level.starPurse = audBand(level);
  });

  App.registerGame({
    name: "auctionDungeon",
    tabKey: "tabAuctionDungeon",
    init: initAuctionDungeonGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M14 62h92" stroke="rgba(148,163,184,.5)"/>' +
        '<rect x="18" y="14" width="16" height="20" rx="3" fill="none" stroke="#fbbf24"/>' +
        '<text x="26" y="28" font-size="9" fill="#fbbf24" text-anchor="middle">18</text>' +
        '<rect x="42" y="20" width="14" height="14" rx="3" fill="none" stroke="#00f2ff"/>' +
        '<text x="49" y="31" font-size="8" fill="#00f2ff" text-anchor="middle">12</text>' +
        '<rect x="62" y="26" width="12" height="8" rx="3" fill="none" stroke="#94a3b8"/>' +
        '<text x="88" y="20" font-size="8" fill="#fb7185">bite 4</text>' +
        '<text x="88" y="32" font-size="8" fill="#94a3b8">guard 5</text>' +
        '<text x="20" y="52" font-size="8" fill="#a3e635">you 18</text>' +
        '<text x="58" y="52" font-size="8" fill="#94a3b8">purse 21</text>' +
        '<text x="88" y="52" font-size="8" fill="#fbbf24">hp 11</text></svg>',
      en: [
        "Aim: clear the run's three encounters with the party alive and keep as many coins as you can - the purse you finish with is the score, its stars are measured from the exported planner line, and the same seed replays the same auction.",
        "Bid: a lot comes up with its stated band and reserve; press B to raise, P to pass, and keys 1, 2 and 3 choose whether one, two or four steps go on the paddle.",
        "Reveal: after every sale the panel prints what each named bidder bid and what they walked away with, so the prices rivals refuse to cross teach you the hidden worth.",
        "Rivals: Greed the Cox bids until he cannot pay, Margra the Setter only raises while you are still in and quits the moment you do, Ost the Miser lifts his paddle twice at half worth.",
        "Fight: foes telegraph their intent - hits, bites, guards and rends. Strike, Brace and Patch cost the round's actions, and 16 rounds without a break drives you off.",
        "Rest: coins only turn into healing between encounters, at the run's price per rest - take every lot and you will meet the last door bleeding.",
        "Ladder: ten runs, from Stall Fares to The Last Hammer, and every rung's stars are the planner's own measured line - a clear that keeps coins burns four in ten of the purse at the front of the ladder and nine in ten at the back.",
      ],
      zh: [
        "目标：让队伍活着打通这趟拍卖的三个关卡，并且尽量把钱留在袋里——终局钱袋就是分数；星级由导出的规划器实测得出，同一个种子完全重放同一趟拍卖。",
        "竞拍：每件货物都标出价值带与底价；按 B 举牌加价，按 P 放弃，数字键 1、2、3 决定牌子上加一档、两档还是四档。",
        "揭示：每次成交后面板会印出每位有名字的对手叫到哪里、离场时带走什么，所以对手不愿越过的那些价，就是在教你货品的真实成色。",
        "对手：贪心的科克斯一直叫到付不起；设局的玛格丽特只在你还在场时抬价，你一撤她立刻收手；吝啬的奥斯特半价举两次牌就抱着钱不动。",
        "战斗：敌人会预告意图——重打、撕咬、架防、撕裂。劈砍、格挡、包扎消耗本轮行动数，16 轮打不穿就被赶下门。",
        "扎营：钱币只在关卡之间变成治疗，每处营地按本趟价格收费——每件货物都抢，最后一道门你就会流着血进去。",
        "阶梯：从摊位小市到最后落槌一共十趟，每一趟的星级都由规划器实测得出——一次合法的通关，在阶梯前半段要烧掉钱袋的十之三四，走到最后一趟几乎要烧掉十之八九。",
      ]
    }
  });

  /* Exported for the other modules and the headless checks. */
  App.initAuctionDungeonGame = initAuctionDungeonGame;
  App.auctionRound = auctionRound;
  App.auctionEncounter = auctionEncounter;
  App.auctionCeiling = function (state) {
    return audMeasure(state).best;
  };
  App.auctionSurvivable = function (state) {
    return !!audMeasure(state).best;
  };
  App.auctionTakeAll = audTakeAll;
  App.auctionBand = audBand;
  App.auctionKit = audKit;
  App.auctionIntent = audIntent;
  App.auctionEnter = audEnter;
  App.auctionTactic = audTactic;
  App.auctionFoes = audFoes;
  App.auctionRun = audBuildRun;
  App.auctionLevels = audLevels;
  App.auctionItems = audItems;
  App.auctionRivals = audRivals;
})(window.CapitalConvert = window.CapitalConvert || {});
