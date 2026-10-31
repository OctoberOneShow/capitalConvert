/* Microbe Lab - evolution by selection in the shared game drawer.
 * Six microbes, four traits, a capped trait budget, and an environment card
 * that changes every generation. Selection is a pure function of the population
 * and the card, so microbeBeatable can walk the whole ten generation trial with
 * a greedy allocator and prove the culture never has to drop under four. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var TRAITS = ["heat", "acid", "speed", "defence"];
  var POP = 6;
  var FLOOR = 4;
  /* Every pressure is answered by a PAIR: the named trait plus its partner.
   * The card prints the number the pair has to reach, so investing in one trait
   * only ever half answers a card - the trade-off the capped budget sells. */
  var mcbAlts = { heat: "speed", acid: "defence", speed: "defence", defence: "speed" };
  var mcbMarks = { heat: "\u2600", acid: "\u25cd", speed: "\u224b", defence: "\u25a4" };
  var POINTS = 3;
  /* Combined cards get their own dictionary id so no key carries a plus sign.
   * flare and venom join at dish 21 - the two dual pressures the first twenty
   * dishes never printed (see the dish 21-24 comment). */
  var mcbIds = {
    heat: "heat",
    acid: "acid",
    speed: "speed",
    defence: "defence",
    "heat+defence": "brand",
    "acid+speed": "empty",
    "defence+speed": "grey",
    "heat+acid": "vinegar",
    "heat+speed": "flare",
    "acid+defence": "venom",
  };

  /* base + step per generation, and `plan` names the pressures of each card. */
  var mcbLevels = [
    { id: "m1", labelKey: "mcbZ1", twistKey: "mcbTwist1", gens: 10, seed: 4211, cap: 18, traitMax: 7, start: 12, base: 3, step: 3, plan: [["heat"]], starBand: [5750, 5200, 4600] },
    { id: "m2", labelKey: "mcbZ2", twistKey: "mcbTwist2", gens: 10, seed: 5309, cap: 18, traitMax: 7, start: 12, base: 3, step: 3, plan: [["acid"]], starBand: [5750, 5200, 4600] },
    { id: "m3", labelKey: "mcbZ3", twistKey: "mcbTwist3", gens: 10, seed: 6127, cap: 18, traitMax: 7, start: 12, base: 3, step: 3, plan: [["defence"], ["defence"], ["defence"], ["defence"], ["defence"], ["speed"], ["speed"], ["speed"], ["speed"], ["speed"]], starBand: [5700, 5150, 4550] },
    { id: "m4", labelKey: "mcbZ4", twistKey: "mcbTwist4", gens: 10, seed: 7333, cap: 18, traitMax: 7, start: 12, base: 3, step: 3, plan: [["heat"], ["acid"], ["defence"], ["speed"]], starBand: [5500, 4900, 4300] },
    { id: "m5", labelKey: "mcbZ5", twistKey: "mcbTwist5", gens: 10, seed: 8419, cap: 20, traitMax: 7, start: 12, base: 3, step: 3, plan: [["heat", "defence"], ["acid", "speed"], ["defence", "speed"], ["heat", "acid"]], starBand: [5600, 5000, 4400] },
    { id: "m6", labelKey: "mcbZ6", twistKey: "mcbTwist6", gens: 10, seed: 9277, cap: 21, traitMax: 7, start: 12, base: 3, step: 2, plan: [["heat"], ["acid"]], starBand: [5890, 5690, 5390] },
    { id: "m7", labelKey: "mcbZ7", twistKey: "mcbTwist7", gens: 10, seed: 10433, cap: 21, traitMax: 7, start: 12, base: 3, step: 2, plan: [["heat"], ["acid"], ["defence"], ["heat"], ["acid"]], starBand: [5880, 5680, 5380] },
    { id: "m8", labelKey: "mcbZ8", twistKey: "mcbTwist8", gens: 10, seed: 11501, cap: 17, traitMax: 5, start: 12, base: 3, step: 3, plan: [["heat"], ["acid"]], starBand: [5890, 5650, 5250] },
    { id: "m9", labelKey: "mcbZ9", twistKey: "mcbTwist9", gens: 10, seed: 12989, cap: 19, traitMax: 7, start: 14, base: 3, step: 3, plan: [["speed"], ["speed"], ["heat"], ["acid"]], starBand: [5880, 5560, 4900] },
    { id: "m10", labelKey: "mcbZ10", twistKey: "mcbTwist10", gens: 10, seed: 13901, cap: 22, traitMax: 7, start: 16, base: 4, step: 2, plan: [["heat", "defence"], ["acid", "speed"], ["defence", "speed"], ["heat", "acid"]], starBand: [5900, 5600, 4950] },
    { id: "m11", labelKey: "mcbZ11", twistKey: "mcbTwist11", gens: 10, seed: 14222, cap: 22, traitMax: 7, start: 16, base: 3, step: 3, plan: [["heat", "acid"], ["heat", "defence"], ["acid", "speed"]], starBand: [5780, 5480, 4800] },
    { id: "m12", labelKey: "mcbZ12", twistKey: "mcbTwist12", gens: 10, seed: 15411, cap: 21, traitMax: 7, start: 15, base: 3, step: 2, plan: [["defence"], ["acid", "speed"], ["speed"], ["heat", "defence"], ["acid"]], starBand: [5780, 5480, 4800] },
    { id: "m13", labelKey: "mcbZ13", twistKey: "mcbTwist13", gens: 10, seed: 16824, cap: 23, traitMax: 8, start: 16, base: 4, step: 2, plan: [["heat", "acid"], ["defence", "speed"], ["heat", "defence"], ["acid", "speed"]], starBand: [5780, 5480, 4800] },
    /* Dishes 14-20. The first thirteen bought their difficulty out of the
     * environment; these seven buy it out of the budget instead. `cap` is the
     * trait ceiling one microbe may ever carry and it walks 22 -> 21 -> 20,
     * so from m17 the colony can no longer simply grow out of a card - it has
     * to decide which pair it is willing to lose. `start` drops 15 -> 14, so
     * there is less in the dish on generation one. The last dish is the lean
     * one: cap 20, the tightest in the game, paid for with a slower climb
     * (step 3) so a lean colony still has time to adapt.
     * Every dish here was walked with microbeBeatable before its band was
     * written (tools/microbe-forge.js): greedy scores 5987, 5986, 5985, 5886,
     * 5885, 5785 and 5782, and each band sits one hundred under that, so the
     * three-star line has to be played for rather than collected. */
    { id: "m14", labelKey: "mcbZ14", twistKey: "mcbTwist14", gens: 10, seed: 17000, cap: 22, traitMax: 7, start: 15, base: 4, step: 3, plan: [["heat", "acid"], ["defence", "speed"], ["heat", "defence"], ["acid", "speed"], ["heat"]], starBand: [5880, 5580, 4930] },
    { id: "m15", labelKey: "mcbZ15", twistKey: "mcbTwist15", gens: 10, seed: 17003, cap: 22, traitMax: 7, start: 15, base: 4, step: 3, plan: [["heat", "acid"], ["defence", "speed"], ["heat", "defence"], ["acid", "speed"], ["heat", "acid"], ["defence", "speed"]], starBand: [5880, 5580, 4930] },
    { id: "m16", labelKey: "mcbZ16", twistKey: "mcbTwist16", gens: 10, seed: 17002, cap: 22, traitMax: 7, start: 15, base: 4, step: 2, plan: [["heat", "acid"], ["defence", "speed"], ["heat", "defence"], ["acid", "speed"], ["heat"]], starBand: [5880, 5580, 4930] },
    { id: "m17", labelKey: "mcbZ17", twistKey: "mcbTwist17", gens: 10, seed: 17167, cap: 21, traitMax: 7, start: 14, base: 4, step: 2, plan: [["heat", "acid"], ["defence", "speed"], ["heat", "defence"], ["acid", "speed"], ["heat", "acid"], ["defence", "speed"]], starBand: [5780, 5480, 4830] },
    { id: "m18", labelKey: "mcbZ18", twistKey: "mcbTwist18", gens: 10, seed: 17002, cap: 21, traitMax: 7, start: 14, base: 4, step: 2, plan: [["heat", "acid"], ["defence", "speed"], ["heat", "defence"], ["acid", "speed"], ["heat", "acid"], ["defence", "speed"]], starBand: [5780, 5480, 4830] },
    { id: "m19", labelKey: "mcbZ19", twistKey: "mcbTwist19", gens: 10, seed: 17015, cap: 21, traitMax: 7, start: 14, base: 4, step: 2, plan: [["heat", "acid"], ["defence", "speed"], ["heat", "defence"], ["acid", "speed"], ["heat", "acid"], ["defence", "speed"]], starBand: [5680, 5380, 4730] },
    { id: "m20", labelKey: "mcbZ20", twistKey: "mcbTwist20", gens: 10, seed: 17071, cap: 20, traitMax: 7, start: 15, base: 4, step: 3, plan: [["heat", "acid"], ["defence", "speed"], ["heat", "defence"], ["acid", "speed"], ["heat", "acid"], ["defence", "speed"]], starBand: [5680, 5380, 4730] },
    /* Dishes 21-24. The fourteen before them bought their difficulty out of
     * the environment and then out of the budget; these four buy it out of the
     * deck, the pool, the founding colony and finally both ceilings at once.
     * The deck turns first: two pressures the lab has never printed - a heat
     * wave riding a famine (flare: speed is the partner in both pairs) and a
     * bloom growing teeth (venom: defence is the partner in both pairs) - so
     * the One Throat dish narrows every card onto a single trait while the
     * climb runs at step 1, the fastest pace the engine allows. The pool
     * shallows next: traitMax walks 7 -> 6, and traitMax is two levers in this
     * engine - it caps what a strain may stack AND clamps what a card may
     * demand - so from m22 no strain can grow out of a card any more. Then the
     * founding colony starves: start 13 is the weakest seeding the ladder has
     * ever shipped, and the greedy line spends the whole trial riding the
     * floor of four. The last dish carries everything at once: cap 19, the
     * tightest budget in the game, over the shallow pool, on the step 1 climb.
     * Every dish here was walked with microbeBeatable before its band was
     * written (tools/microbe-forge.js): greedy scores 5782, 5780, 5688 and
     * 5682, and each band sits one hundred under that, so the three-star line
     * has to be played for rather than collected. */
    { id: "m21", labelKey: "mcbZ21", twistKey: "mcbTwist21", gens: 10, seed: 24338, cap: 20, traitMax: 7, start: 14, base: 4, step: 1, plan: [["heat", "defence"], ["heat", "speed"], ["defence", "speed"], ["heat", "defence"], ["heat", "speed"], ["defence", "speed"]], starBand: [5680, 5380, 4730] },
    { id: "m22", labelKey: "mcbZ22", twistKey: "mcbTwist22", gens: 10, seed: 24222, cap: 20, traitMax: 6, start: 15, base: 4, step: 1, plan: [["heat", "speed"], ["acid", "defence"], ["heat", "acid"], ["acid", "speed"], ["defence", "speed"], ["heat"]], starBand: [5680, 5380, 4730] },
    { id: "m23", labelKey: "mcbZ23", twistKey: "mcbTwist23", gens: 10, seed: 24072, cap: 21, traitMax: 7, start: 13, base: 3, step: 2, plan: [["heat", "acid"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "defence"], ["acid", "speed"]], starBand: [5580, 5280, 4630] },
    { id: "m24", labelKey: "mcbZ24", twistKey: "mcbTwist24", gens: 10, seed: 24001, cap: 19, traitMax: 6, start: 14, base: 4, step: 1, plan: [["heat", "acid"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "defence"], ["acid", "speed"]], starBand: [5580, 5280, 4630] },
    /* Dishes 25-30, the long bench. The deep tier bought its difficulty out
     * of the deck, the pool, the flask and both ceilings at once; these six
     * hold every lever the summit set and never give one back, tightening
     * at least one a rung until the capstone tightens all three at once.
     * The seeding thins first: m25 opens one founder short of the summit
     * and the greedy line spends the whole trial riding the floor of four
     * - the sharpest single drop the ladder has made (3982 greedy where
     * m24 walked 5682). The pool shallows to five on m26, the ceiling
     * drops to eighteen on m27, the founding colony starves to twelve on
     * m28, and the last two rungs carry the leanest ceiling the deep game
     * has printed (seventeen) - m30 with every lever under the summit's
     * row: cap 17, traitMax 5, start 12. The two base-3 rungs trade a
     * slower card climb for those tight ceilings; the metric reads higher
     * there because the cards ask for less, not because the dish is
     * easier - the levers are the price. Every dish here was walked with
     * microbeBeatable before its band was written: greedy scores 3982,
     * 3982, 3980, 5884, 3979 and 5880, and each band sits one hundred and
     * five under that, inside the window the shipped deep tier anchored. */
    { id: "m25", labelKey: "mcbZ25", twistKey: "mcbTwist25", gens: 10, seed: 31007, cap: 19, traitMax: 6, start: 13, base: 4, step: 1, plan: [["heat", "defence"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "acid"], ["acid", "speed"]], starBand: [3880, 3580, 3230] },
    { id: "m26", labelKey: "mcbZ26", twistKey: "mcbTwist26", gens: 10, seed: 40002, cap: 19, traitMax: 5, start: 13, base: 4, step: 1, plan: [["heat", "defence"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "acid"], ["acid", "speed"]], starBand: [3880, 3580, 3230] },
    { id: "m27", labelKey: "mcbZ27", twistKey: "mcbTwist27", gens: 10, seed: 40012, cap: 18, traitMax: 5, start: 13, base: 4, step: 1, plan: [["heat", "defence"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "acid"], ["acid", "speed"]], starBand: [3880, 3580, 3230] },
    { id: "m28", labelKey: "mcbZ28", twistKey: "mcbTwist28", gens: 10, seed: 40000, cap: 18, traitMax: 5, start: 12, base: 3, step: 1, plan: [["heat", "defence"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "acid"], ["acid", "speed"]], starBand: [5780, 5480, 5130] },
    { id: "m29", labelKey: "mcbZ29", twistKey: "mcbTwist29", gens: 10, seed: 40329, cap: 17, traitMax: 5, start: 13, base: 4, step: 1, plan: [["heat", "defence"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "acid"], ["acid", "speed"]], starBand: [3870, 3570, 3220] },
    { id: "m30", labelKey: "mcbZ30", twistKey: "mcbTwist30", gens: 10, seed: 40016, cap: 17, traitMax: 5, start: 12, base: 3, step: 1, plan: [["heat", "defence"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "acid"], ["acid", "speed"]], starBand: [5780, 5480, 5130] },
    /* Dishes 31-40, the summit bench. The long bench priced its difficulty
     * into the deck, the pool, the flask and both ceilings; these ten bring
     * a fifth lever the first thirty dishes never shipped - the player's own
     * hand - and then walk every lever the bench set to its floor without
     * giving one back: the budget, the pool and the flask never rise, the
     * hand never grows, and the trial never shortens. The hands are bought,
     * not given: every dish here opens at base 2, the first cards in the lab
     * that demand five instead of six, and that softer opening is the price
     * the lean hands pay - measured, not assumed. m31 deals two mutation
     * points a generation where every earlier dish handed over three. m32
     * runs the trial an eleventh generation, m33 drops the budget to
     * sixteen, m34 shallows the pool to four traits wide - and the clamp
     * that shallows the pool also caps what a card may demand, so the
     * ceiling dips from eight to seven and the walk reads higher from here
     * on: the cards ask for less, not the dish for less - seven of a
     * maximum eight still means both members of a pair sit at or beside the
     * ceiling. m35 starves the flask to eleven founders, m36 narrows the
     * deck to the two newest pressures alone - flare and venom, nothing
     * older, a deck the lab has never printed - m37 turns the whole deck,
     * all ten cards in one rotation, m38 runs the longest trial the lab has
     * shipped, m39 cuts the budget to fifteen, and the capstone m40 deals
     * the leanest hand the lab has ever printed - one mutation a
     * generation - with every floor lever at once at its tier minimum: cap
     * 15, traitMax 4, start 11, twelve generations. That hand holds on 281
     * of a thousand seedings, the narrowest window the summit bench ships;
     * the shipped seed walks it at the floor. Every dish here was walked with
     * microbeBeatable before its band was written (tools/microbe-forge.js,
     * the summit table): greedy scores 4588, 4986, 4986, 6585, 4586, 4586,
     * 4586, 4984, 4982 and 5091, and each band sits one hundred (and a few)
     * under that, inside the window the shipped deep tier anchored. */
    { id: "m31", labelKey: "mcbZ31", twistKey: "mcbTwist31", gens: 10, seed: 50024, cap: 17, traitMax: 5, start: 12, base: 2, step: 1, points: 2, plan: [["heat", "defence"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "acid"], ["acid", "speed"]], starBand: [4480, 4180, 3830] },
    { id: "m32", labelKey: "mcbZ32", twistKey: "mcbTwist32", gens: 11, seed: 50024, cap: 17, traitMax: 5, start: 12, base: 2, step: 1, points: 2, plan: [["heat", "defence"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "acid"], ["acid", "speed"]], starBand: [4880, 4580, 4230] },
    { id: "m33", labelKey: "mcbZ33", twistKey: "mcbTwist33", gens: 11, seed: 50003, cap: 16, traitMax: 5, start: 12, base: 2, step: 1, points: 2, plan: [["heat", "defence"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "acid"], ["acid", "speed"]], starBand: [4880, 4580, 4230] },
    { id: "m34", labelKey: "mcbZ34", twistKey: "mcbTwist34", gens: 11, seed: 50004, cap: 16, traitMax: 4, start: 12, base: 2, step: 1, points: 2, plan: [["heat", "defence"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "acid"], ["acid", "speed"]], starBand: [6480, 6180, 5830] },
    { id: "m35", labelKey: "mcbZ35", twistKey: "mcbTwist35", gens: 11, seed: 50000, cap: 16, traitMax: 4, start: 11, base: 2, step: 1, points: 2, plan: [["heat", "defence"], ["heat", "speed"], ["defence", "speed"], ["acid", "defence"], ["heat", "acid"], ["acid", "speed"]], starBand: [4480, 4180, 3830] },
    { id: "m36", labelKey: "mcbZ36", twistKey: "mcbTwist36", gens: 11, seed: 50002, cap: 16, traitMax: 4, start: 11, base: 2, step: 1, points: 2, plan: [["heat", "speed"], ["acid", "defence"]], starBand: [4480, 4180, 3830] },
    { id: "m37", labelKey: "mcbZ37", twistKey: "mcbTwist37", gens: 11, seed: 50002, cap: 16, traitMax: 4, start: 11, base: 2, step: 1, points: 2, plan: [["heat"], ["acid"], ["defence"], ["speed"], ["heat", "defence"], ["acid", "speed"], ["defence", "speed"], ["heat", "acid"], ["heat", "speed"], ["acid", "defence"]], starBand: [4480, 4180, 3830] },
    { id: "m38", labelKey: "mcbZ38", twistKey: "mcbTwist38", gens: 12, seed: 50002, cap: 16, traitMax: 4, start: 11, base: 2, step: 1, points: 2, plan: [["heat"], ["acid"], ["defence"], ["speed"], ["heat", "defence"], ["acid", "speed"], ["defence", "speed"], ["heat", "acid"], ["heat", "speed"], ["acid", "defence"]], starBand: [4880, 4580, 4230] },
    { id: "m39", labelKey: "mcbZ39", twistKey: "mcbTwist39", gens: 12, seed: 50002, cap: 15, traitMax: 4, start: 11, base: 2, step: 1, points: 2, plan: [["heat"], ["acid"], ["defence"], ["speed"], ["heat", "defence"], ["acid", "speed"], ["defence", "speed"], ["heat", "acid"], ["heat", "speed"], ["acid", "defence"]], starBand: [4880, 4580, 4230] },
    { id: "m40", labelKey: "mcbZ40", twistKey: "mcbTwist40", gens: 12, seed: 50005, cap: 15, traitMax: 4, start: 11, base: 2, step: 1, points: 1, plan: [["heat"], ["acid"], ["defence"], ["speed"], ["heat", "defence"], ["acid", "speed"], ["defence", "speed"], ["heat", "acid"], ["heat", "speed"], ["acid", "defence"]], starBand: [4990, 4690, 4340] },
  ];

  function mcbInt(value) {
    var num = Number(value);
    return isFinite(num) ? Math.round(num) : 0;
  }

  function mcbClamp(value, low, high) {
    return Math.max(low, Math.min(high, mcbInt(value)));
  }

  function mcbRandom(seed) {
    var state = mcbInt(seed) >>> 0;
    if (!state) {
      state = 0x5bf03635;
    }
    return function next() {
      state = (state ^ (state << 13)) >>> 0;
      state = (state ^ (state >>> 17)) >>> 0;
      state = (state ^ (state << 5)) >>> 0;
      return state / 4294967296;
    };
  }

  /* Generation g's card: every pressure in its clause list, scaled together. */
  function mcbCard(level, gen) {
    var keys = level.plan[gen % level.plan.length] || ["heat"];
    var req = mcbClamp(level.base + Math.floor(gen / Math.max(1, mcbInt(level.step))), 1, level.traitMax);
    var clauses = [];
    for (var index = 0; index < keys.length; index += 1) {
      clauses.push({ trait: keys[index], alt: mcbAlts[keys[index]] || "speed", req: req, demand: req + 3 });
    }
    var joined = keys.join("+");
    return {
      gen: gen,
      id: mcbIds[joined] || "heat",
      req: req,
      clauses: clauses,
      marks: keys.join(" "),
    };
  }

  function mcbSequence(level) {
    var out = [];
    for (var gen = 0; gen < level.gens; gen += 1) {
      out.push(mcbCard(level, gen));
    }
    return out;
  }

  function mcbCover(microbe, clause) {
    var traits = microbe.traits || {};
    return mcbInt(traits[clause.trait]) + mcbInt(traits[clause.alt]);
  }

  function mcbFit(microbe, clause) {
    return mcbCover(microbe, clause) >= mcbInt(clause.demand);
  }

  function mcbSurvives(microbe, card) {
    var clauses = card.clauses || [];
    for (var index = 0; index < clauses.length; index += 1) {
      if (!mcbFit(microbe, clauses[index])) {
        return false;
      }
    }
    return true;
  }

  function mcbSum(microbe) {
    return TRAITS.reduce(function (total, name) {
      return total + mcbInt(microbe.traits[name]);
    }, 0);
  }

  function mcbClone(microbe) {
    var traits = {};
    TRAITS.forEach(function (name) {
      traits[name] = mcbInt(microbe.traits[name]);
    });
    return { id: microbe.id, name: microbe.name, traits: traits };
  }

  /* The one auto mutation each offspring rolls: the lowest trait that still has
   * room under both the per trait ceiling and the microbe's budget. */
  function mcbOrdered(traits) {
    return TRAITS.slice().sort(function (a, b) {
      if (mcbInt(traits[a]) !== mcbInt(traits[b])) {
        return mcbInt(traits[a]) - mcbInt(traits[b]);
      }
      return TRAITS.indexOf(a) - TRAITS.indexOf(b);
    });
  }

  /* Selection favours what the card rewarded: the offspring's single bounded
   * mutation lifts its strongest trait among the pair the card just scored, and
   * falls back to the strongest trait it has at all. It stalls when the budget
   * is full, which is the pressure the player's own points have to work around. */
  function mcbMutate(microbe, level, card) {
    var out = mcbClone(microbe);
    var wanted = [];
    var clauses = (card && card.clauses) || [];
    for (var c = 0; c < clauses.length; c += 1) {
      if (wanted.indexOf(clauses[c].trait) === -1) {
        wanted.push(clauses[c].trait);
      }
      if (wanted.indexOf(clauses[c].alt) === -1) {
        wanted.push(clauses[c].alt);
      }
    }
    var order = mcbOrdered(out.traits).reverse();
    var ranked = order.slice().sort(function (a, b) {
      var inA = wanted.indexOf(a) === -1 ? 0 : 1;
      var inB = wanted.indexOf(b) === -1 ? 0 : 1;
      if (inA !== inB) {
        return inB - inA;
      }
      return mcbInt(out.traits[b]) - mcbInt(out.traits[a]);
    });
    for (var index = 0; index < ranked.length; index += 1) {
      var name = ranked[index];
      if (mcbInt(out.traits[name]) < mcbInt(level.traitMax) && mcbSum(out) < mcbInt(level.cap)) {
        out.traits[name] = mcbInt(out.traits[name]) + 1;
        return { microbe: out, grew: true };
      }
    }
    return { microbe: out, grew: false };
  }

  /* Selection, exported: who lives, who they clone into, and the count. */
  function microbeSurvive(population, card, level) {
    var list = population || [];
    var stats = level || { cap: 15, traitMax: 7 };
    var survivors = [];
    for (var index = 0; index < list.length; index += 1) {
      if (mcbSurvives(list[index], card)) {
        survivors.push(list[index]);
      }
    }
    var offspring = [];
    var stalled = 0;
    for (var s = 0; s < survivors.length; s += 1) {
      var born = mcbMutate(survivors[s], stats, card);
      offspring.push(born.microbe);
      if (!born.grew) {
        stalled += 1;
      }
    }
    /* A healthy dish blooms: five survivors or more seed a sixth microbe. */
    if (survivors.length >= 5 && offspring.length < POP) {
      offspring.push(mcbMutate(survivors[0], stats, card).microbe);
    }
    return {
      survivors: survivors,
      offspring: offspring,
      count: offspring.length,
      survived: survivors.length,
      stalled: stalled,
      collapsed: survivors.length < FLOOR,
    };
  }

  function microbeName(index) {
    return t("mcbStrain", { i: index + 1, n: t("mcbNames" + index) });
  }

  /* Six strains, jittered from the seed so a culture replays identically while
   * still starting lopsided enough to matter. */
  /* Six strains that all start playable: every trait gets the floor share, the
   * remainder is dealt one at a time, and the seeded jitter only swaps a point
   * between two traits so no strain begins already doomed. */
  function mcbPopulation(level, seed) {
    var rand = mcbRandom(seed);
    var list = [];
    var total = Math.max(TRAITS.length, mcbInt(level.start));
    var floorShare = Math.floor(total / TRAITS.length);
    var extra = total - floorShare * TRAITS.length;
    for (var index = 0; index < POP; index += 1) {
      var traits = {};
      TRAITS.forEach(function (name) {
        traits[name] = mcbClamp(floorShare, 0, mcbInt(level.traitMax));
      });
      for (var e = 0; e < extra; e += 1) {
        var gift = TRAITS[(index + e) % TRAITS.length];
        traits[gift] = mcbInt(traits[gift]) + 1;
      }
      for (var swap = 0; swap < 2; swap += 1) {
        var order = mcbOrdered(traits);
        var from = order[order.length - 1];
        var to = order[0];
        if (from !== to && mcbInt(traits[from]) > 0 && mcbInt(traits[to]) < mcbInt(level.traitMax) && rand() < 0.75) {
          traits[from] = mcbInt(traits[from]) - 1;
          traits[to] = mcbInt(traits[to]) + 1;
        }
      }
      list.push({ id: index, name: microbeName(index), traits: traits });
    }
    return list;
  }

  /* How many points of headroom a microbe still has under the budget. */
  function mcbRoom(microbe, level) {
    return Math.max(0, mcbInt(level.cap) - mcbSum(microbe));
  }

  function mcbRaise(list, pick, trait, level) {
    if (!list[pick] || !mcbTraitKnown(trait)) {
      return null;
    }
    if (mcbInt(list[pick].traits[trait]) >= mcbInt(level.traitMax)) {
      return null;
    }
    if (mcbRoom(list[pick], level) <= 0) {
      return null;
    }
    list[pick].traits[trait] = mcbInt(list[pick].traits[trait]) + 1;
    return list[pick];
  }

  function mcbTraitKnown(name) {
    return TRAITS.indexOf(name) !== -1;
  }

  /* Greedy allocation for one generation: spend each point where it saves the
   * most lives on the card in front of you, then where it buys the longest
   * future. Exported because it is exactly what microbeBeatable runs. */
  function microbeAllocate(list, card, future, points, level) {
    var pool = [];
    var index;
    for (index = 0; index < list.length; index += 1) {
      pool.push(mcbClone(list[index]));
    }
    var spent = 0;
    var waste = 0;
    for (var step = 0; step < Math.max(0, mcbInt(points)); step += 1) {
      var best = null;
      for (var pick = 0; pick < pool.length; pick += 1) {
        for (var ti = 0; ti < TRAITS.length; ti += 1) {
          var trait = TRAITS[ti];
          var trial = [];
          for (index = 0; index < pool.length; index += 1) {
            trial.push(mcbClone(pool[index]));
          }
          if (!mcbRaise(trial, pick, trait, level)) {
            continue;
          }
          var score = microbeSurvive(trial, card, level).survived * 1000;
          score += mcbProspect(trial, future) * 40;
          score += mcbSlack(trial, card) * 4;
          if (!best || score > best.score) {
            best = { score: score, pick: pick, trait: trait, trial: trial };
          }
        }
      }
      if (!best) {
        waste += 1;
        continue;
      }
      pool = best.trial;
      spent += 1;
    }
    return { list: pool, spent: spent, waste: waste };
  }

  /* Total margin against the tightest clause, so equal survivor counts still
   * prefer the dish with the most buffer. */
  function mcbSlack(list, card) {
    var total = 0;
    for (var index = 0; index < list.length; index += 1) {
      var worst = 99;
      var clauses = card.clauses || [];
      for (var c = 0; c < clauses.length; c += 1) {
        var clause = clauses[c];
        var best = mcbCover(list[index], clause) - mcbInt(clause.demand);
        worst = Math.min(worst, best);
      }
      total += worst > 0 ? worst : 0;
    }
    return total;
  }

  /* How far ahead the current dish already reaches: for each upcoming card we
   * credit only the lives above the floor, so a point that buys insurance the
   * colony does not need scores nothing. */
  function mcbProspect(list, future) {
    var cards = future || [];
    var total = 0;
    for (var c = 0; c < cards.length; c += 1) {
      var live = 0;
      for (var index = 0; index < list.length; index += 1) {
        if (mcbSurvives(list[index], cards[c])) {
          live += 1;
        }
      }
      total += Math.max(0, live - (FLOOR - 1));
    }
    return total;
  }

  /* The dish's mutation budget: three a generation for the first thirty
   * dishes, and only a dish that names its own `points` dials it down (the
   * summit bench deals two, then one) - an untagged dish must never read
   * the missing field as a budget of one. */
  function mcbPoints(level) {
    var points = level ? level.points : undefined;
    return points === undefined ? POINTS : Math.max(1, mcbInt(points));
  }

  /* The floor proof: the greedy line, generation by generation. */
  function microbeBeatable(level) {
    var gens = Math.max(1, mcbInt(level.gens));
    var budget = mcbPoints(level);
    var list = mcbPopulation(level, level.seed);
    var total = 0;
    var waste = 0;
    var minSurvivors = POP;
    var cleared = 0;
    for (var gen = 0; gen < gens; gen += 1) {
      var card = mcbCard(level, gen);
      var plan = microbeAllocate(list, card, mcbSequence(level).slice(gen + 1, gen + 4), budget, level);
      list = plan.list;
      waste += plan.waste;
      var result = microbeSurvive(list, card, level);
      if (result.collapsed) {
        return { cleared: cleared, minSurvivors: minSurvivors, metric: total * 100 - waste, collapsed: true, gen: gen };
      }
      minSurvivors = Math.min(minSurvivors, result.survived);
      total += result.survived;
      cleared += 1;
      list = result.offspring;
    }
    return {
      cleared: cleared,
      minSurvivors: minSurvivors,
      metric: total * 100 - waste,
      collapsed: false,
      gen: gens,
      survivors: total,
    };
  }

  function microbeMetric(survivors, waste) {
    return Math.max(0, mcbInt(survivors)) * 100 - Math.max(0, mcbInt(waste));
  }

  function initMicrobeLabGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "microbe-lab-campaign", levels: mcbLevels });
    var levelDef = mcbLevels[Math.max(0, campaign.indexOf(campaign.nextLevelId()))];
    var run = null;
    var strainRows = [];
    var traitButtons = [];
    var clauseLines = [];

    var hud = document.createElement("div");
    hud.className = "game-hud";
    var genEl = document.createElement("strong");
    var pointEl = document.createElement("strong");
    var popEl = document.createElement("strong");
    hud.appendChild(mcbStat("mcbGenLabel", genEl));
    hud.appendChild(mcbStat("mcbPointLabel", pointEl));
    hud.appendChild(mcbStat("mcbPopLabel", popEl));

    var stage = document.createElement("div");
    stage.className = "mcb-stage";
    stage.setAttribute("tabindex", "0");
    stage.setAttribute("role", "application");
    stage.setAttribute("aria-label", t("mcbFieldLabel"));

    var cardBox = document.createElement("div");
    cardBox.className = "mcb-card";
    var cardTitle = document.createElement("strong");
    var cardText = document.createElement("span");
    cardBox.appendChild(cardTitle);
    cardBox.appendChild(cardText);
    for (var line = 0; line < 2; line += 1) {
      var clause = document.createElement("p");
      clause.className = "mcb-clause";
      cardBox.appendChild(clause);
      clauseLines.push(clause);
    }
    var peekLine = document.createElement("p");
    peekLine.className = "mcb-peek";
    cardBox.appendChild(peekLine);
    stage.appendChild(cardBox);

    var dish = document.createElement("div");
    dish.className = "mcb-dish";
    dish.setAttribute("role", "group");
    dish.setAttribute("aria-label", t("mcbDishLabel"));
    stage.appendChild(dish);

    var info = document.createElement("p");
    info.className = "mcb-info";

    var controls = document.createElement("div");
    controls.className = "mcb-controls";
    var modeBtn = mcbButton("mcb-btn", "mcbModeRaise", function () {
      toggleMode();
    });
    var peekBtn = mcbButton("mcb-btn", "mcbBtnPeek", function () {
      peek();
    });
    var newBtn = mcbButton("mcb-btn", "btnNewRound", function () {
      startRun();
    });
    newBtn.setAttribute("data-i18n", "btnNewRound");
    controls.appendChild(modeBtn);
    controls.appendChild(peekBtn);
    controls.appendChild(newBtn);

    var log = document.createElement("p");
    log.className = "mcb-log";

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var pickerRow = document.createElement("div");
    pickerRow.className = "elements-row";
    var pickerLabel = document.createElement("label");
    pickerLabel.className = "elements-label";
    pickerLabel.setAttribute("for", "mcbCultureSel");
    pickerLabel.setAttribute("data-i18n", "mcbCultureSelectLabel");
    pickerLabel.textContent = t("mcbCultureSelectLabel");
    var picker = document.createElement("select");
    picker.className = "elements-select";
    picker.id = "mcbCultureSel";
    pickerRow.appendChild(pickerLabel);
    pickerRow.appendChild(picker);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var nextBtn = mcbButton("primary", "mcbBtnNext", function () {
      advance();
    });
    var bestEl = document.createElement("p");
    bestEl.className = "game-best";
    actions.appendChild(nextBtn);
    actions.appendChild(bestEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "mcbHint");
    hint.textContent = t("mcbHint");

    [hud, stage, info, controls, log, result, pickerRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    stage.addEventListener("keydown", function (event) {
      if (!run) {
        return;
      }
      var key = event.key;
      if (key === "ArrowUp") {
        event.preventDefault();
        apply(1);
        render();
        return;
      }
      if (key === "ArrowDown") {
        event.preventDefault();
        apply(-1);
        render();
        return;
      }
      if (key === "ArrowLeft") {
        event.preventDefault();
        moveTrait(-1);
        return;
      }
      if (key === "ArrowRight") {
        event.preventDefault();
        moveTrait(1);
        return;
      }
      if (key === "Enter") {
        event.preventDefault();
        advance();
        return;
      }
      if (key === " ") {
        event.preventDefault();
        peek();
        return;
      }
      var digit = Number(key);
      if (isFinite(digit) && digit >= 1 && digit <= POP) {
        event.preventDefault();
        run.pick = mcbClamp(digit - 1, 0, run.list.length - 1);
        render();
      }
    });

    function mcbButton(extra, key, handler) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = extra;
      var label = document.createElement("span");
      label.setAttribute("data-i18n", key);
      label.textContent = t(key);
      var content = document.createElement("span");
      content.className = "button-content";
      content.appendChild(label);
      button.appendChild(content);
      button.addEventListener("click", function () {
        handler();
      });
      return button;
    }

    function mcbStat(key, valueEl) {
      var stat = document.createElement("div");
      stat.className = "game-stat";
      var label = document.createElement("span");
      label.setAttribute("data-i18n", key);
      label.textContent = t(key);
      stat.appendChild(label);
      stat.appendChild(valueEl);
      return stat;
    }

    function startRun() {
      run = {
        level: levelDef,
        gen: 0,
        gens: Math.max(1, mcbInt(levelDef.gens)),
        points: mcbPoints(levelDef),
        waste: 0,
        survivors: 0,
        list: mcbPopulation(levelDef, (levelDef.seed + runs() * 131) >>> 0),
        pick: 0,
        trait: 0,
        mode: 1,
        peeked: false,
        over: null,
        events: [],
      };
      result.textContent = t("mcbPrompt", {
        name: t(levelDef.labelKey),
        twist: t(levelDef.twistKey),
        floor: FLOOR,
        gens: run.gens,
      });
      render();
    }

    var counted = 0;
    function runs() {
      counted += 1;
      return counted;
    }

    /* The button says which way a click will push, so the mode is never
     * carried by colour or an icon alone. */
    function setModeLabel() {
      var key = run.mode > 0 ? "mcbModeRaise" : "mcbModeLower";
      var label = modeBtn.childNodes[0].childNodes[0];
      label.setAttribute("data-i18n", key);
      label.textContent = t(key);
    }

    function toggleMode() {
      if (!run || run.over) {
        return;
      }
      run.mode = run.mode > 0 ? -1 : 1;
      setModeLabel();
      render();
    }

    function peek() {
      if (!run || run.over) {
        return;
      }
      run.peeked = true;
      info.textContent = t("mcbPeeked", { g: run.gen + 2 });
      render();
    }

    function moveTrait(step) {
      run.trait = (run.trait + mcbInt(step) + TRAITS.length) % TRAITS.length;
      render();
    }

    function apply(step) {
      if (!run || run.over) {
        return;
      }
      var microbe = run.list[run.pick];
      if (!microbe) {
        return;
      }
      var trait = TRAITS[run.trait];
      if (step > 0) {
        if (run.points <= 0) {
          info.textContent = t("mcbNoPoints");
          return;
        }
        var trial = [];
        for (var index = 0; index < run.list.length; index += 1) {
          trial.push(mcbClone(run.list[index]));
        }
        if (!mcbRaise(trial, run.pick, trait, run.level)) {
          info.textContent = t("mcbCapped", { n: mcbInt(run.level.traitMax), c: mcbInt(run.level.cap) });
          return;
        }
        run.list = trial;
        run.points -= 1;
        info.textContent = t("mcbRaised", { s: microbe.name, k: t("mcbT" + trait), n: mcbInt(microbe.traits[trait]) + 1 });
        return;
      }
      if (mcbInt(microbe.traits[trait]) <= 0) {
        info.textContent = t("mcbZero");
        return;
      }
      microbe.traits[trait] = mcbInt(microbe.traits[trait]) - 1;
      run.points += 1;
      info.textContent = t("mcbLowered", { s: microbe.name, k: t("mcbT" + trait), n: mcbInt(microbe.traits[trait]) });
    }

    function advance() {
      if (!run || run.over) {
        return;
      }
      var card = mcbCard(run.level, run.gen);
      run.waste += Math.max(0, run.points);
      var outcome = microbeSurvive(run.list, card, run.level);
      run.events = [t("mcbResolved", {
        name: t("mcbE" + card.id),
        g: run.gen + 1,
        s: outcome.survived,
        n: run.list.length,
      })];
      run.survivors += outcome.survived;
      if (outcome.collapsed) {
        run.over = "lost";
        result.textContent = t("mcbCollapsed", {
          g: run.gen + 1,
          s: outcome.survived,
          n: FLOOR,
          m: microbeMetric(run.survivors, run.waste),
        });
        render();
        return;
      }
      run.list = outcome.offspring;
      run.pick = mcbClamp(run.pick, 0, run.list.length - 1);
      run.gen += 1;
      run.points = mcbPoints(run.level);
      run.peeked = false;
      if (run.gen >= run.gens) {
        winRun();
        return;
      }
      render();
    }

    function winRun() {
      run.over = "won";
      var metric = microbeMetric(run.survivors, run.waste);
      var stars = starsFor(metric, run.level.starBand, "high");
      var outcome = campaign.record(run.level.id, { stars: stars, best: metric, better: "high" });
      var message = t("mcbWon", { g: run.gens, s: run.survivors, w: run.waste, st: stars });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("mcbNext");
      } else if (campaign.clearedCount() === mcbLevels.length) {
        message += " " + t("mcbDone");
      }
      result.textContent = message;
      logAction(t("logMicrobeLab", { g: run.gens, s: run.survivors }));
      var rect = nextBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function render() {
      if (!run) {
        return;
      }
      var card = mcbCard(run.level, Math.min(run.gen, run.gens - 1));
      genEl.textContent = t("mcbGenValue", { n: Math.min(run.gen + 1, run.gens), max: run.gens });
      pointEl.textContent = t("mcbPointValue", { n: run.points, w: run.waste });
      popEl.textContent = t("mcbPopValue", { n: run.list.length, floor: FLOOR });

      cardTitle.textContent = t("mcbCardTitle", { g: run.gen + 1, name: t("mcbE" + card.id), m: card.marks });
      cardText.textContent = t("mcbE" + card.id + "Text");
      for (var c = 0; c < clauseLines.length; c += 1) {
        var clause = card.clauses[c];
        clauseLines[c].hidden = !clause;
        clauseLines[c].textContent = clause
          ? t("mcbClause", {
            k: t("mcbT" + clause.trait),
            n: clause.req,
            a: t("mcbT" + clause.alt),
            d: clause.demand,
          })
          : "";
      }
      var next = mcbCard(run.level, run.gen + 1 < run.gens ? run.gen + 1 : run.gen);
      peekLine.textContent = run.peeked
        ? t("mcbPeekOpen", { g: run.gen + 2, name: t("mcbE" + next.id), m: next.marks })
        : t("mcbPeekShut", { g: run.gen + 2 });

      if (dish.childNodes.length !== run.list.length) {
        dish.textContent = "";
        strainRows = [];
        traitButtons = [];
        for (var index = 0; index < run.list.length; index += 1) {
          buildRow(index);
        }
      }
      for (var r = 0; r < strainRows.length; r += 1) {
        var microbe = run.list[r];
        strainRows[r].select.textContent = t("mcbStrainCell", {
          i: r + 1,
          n: microbe.name,
          s: mcbSum(microbe),
          c: mcbInt(run.level.cap),
        });
        strainRows[r].select.className = "mcb-strain" + (run.pick === r ? " mcb-picked" : "") + (mcbSurvives(microbe, card) ? " mcb-fit" : " mcb-unfit");
        strainRows[r].select.setAttribute("aria-label", t("mcbStrainAria", {
          i: r + 1,
          n: microbe.name,
          s: mcbSum(microbe),
          c: mcbInt(run.level.cap),
          v: mcbSurvives(microbe, card) ? t("mcbWillLive") : t("mcbWillDie"),
          t: TRAITS.map(function (name) {
            return t("mcbT" + name) + " " + mcbInt(microbe.traits[name]);
          }).join(", "),
        }));
        for (var ti = 0; ti < TRAITS.length; ti += 1) {
          var trait = TRAITS[ti];
          var cell = traitButtons[r][ti];
          cell.textContent = t("mcbTraitCell", {
            g: mcbMarks[trait],
            v: mcbInt(microbe.traits[trait]),
            d: run.mode > 0 ? "+" : "-",
          });
          cell.className = "mcb-trait" + (run.pick === r && run.trait === ti ? " mcb-focus" : "") + (mcbInt(microbe.traits[trait]) >= mcbInt(run.level.traitMax) ? " mcb-maxed" : "");
          cell.setAttribute("aria-label", t("mcbTraitAria", {
            s: microbe.name,
            k: t("mcbT" + trait),
            v: mcbInt(microbe.traits[trait]),
            x: mcbInt(run.level.traitMax),
            r: mcbRoom(microbe, run.level),
            d: run.mode > 0 ? t("mcbRaiseWord") : t("mcbLowerWord"),
          }));
        }
      }
      modeBtn.disabled = !!run.over;
      setModeLabel();
      peekBtn.disabled = !!run.over || run.peeked;
      nextBtn.disabled = !!run.over;
      log.textContent = run.events && run.events.length ? run.events.join(" / ") : t("mcbSilence");
    }

    function buildRow(index) {
      var row = document.createElement("div");
      row.className = "mcb-row";
      var select = document.createElement("button");
      select.type = "button";
      select.className = "mcb-strain";
      select.addEventListener("click", function () {
        if (run.over) {
          return;
        }
        run.pick = index;
        render();
      });
      row.appendChild(select);
      var cells = [];
      TRAITS.forEach(function (trait) {
        var cell = document.createElement("button");
        cell.type = "button";
        cell.className = "mcb-trait";
        cell.addEventListener("click", function () {
          if (run.over) {
            return;
          }
          run.pick = index;
          run.trait = TRAITS.indexOf(trait);
          apply(run.mode);
          render();
        });
        row.appendChild(cell);
        cells.push(cell);
      });
      dish.appendChild(row);
      strainRows.push({ row: row, select: select });
      traitButtons.push(cells);
    }

    function refreshPicker() {
      fillCampaignPicker(
        picker,
        campaign,
        function (def) {
          return t(def.labelKey) + " \u00b7 " + t(def.twistKey);
        },
        t("elementsLocked"),
      );
      picker.value = levelDef.id;
      var best = campaign.best(levelDef.id);
      bestEl.textContent = t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() }) + " \u00b7 " + (best ? t("mcbBest", { n: best }) : t("noBest"));
    }

    picker.addEventListener("change", function () {
      var position = campaign.indexOf(picker.value);
      if (position < 0 || !campaign.isUnlocked(picker.value)) {
        refreshPicker();
        return;
      }
      levelDef = mcbLevels[position];
      startRun();
      refreshPicker();
    });

    startRun();
    refreshPicker();
  }

  /* Bilingual copy travels with the game (see core.js addStrings). */
  App.addStrings({
    en: {
      "tabMicrobeLab": "Microbe Lab",
      "mcbZ1": "Warm Bench",
      "mcbZ2": "Sour Bench",
      "mcbZ3": "Teeth then Thirst",
      "mcbZ4": "Shock Clock",
      "mcbZ5": "Sealed Trial",
      "mcbZ6": "Foresight Bench",
      "mcbZ7": "Triple Turn",
      "mcbZ8": "Close Budget",
      "mcbZ9": "Long Famine",
      "mcbZ10": "Whole Storm",
      "mcbZ11": "Thermal Vent",
      "mcbZ12": "Adaptive Crucible",
      "mcbZ13": "Apex Colony",
      "mcbZ14": "Twin Vent",
      "mcbZ15": "Six Card Gauntlet",
      "mcbZ16": "Rapid Crucible",
      "mcbZ17": "Lean Colony",
      "mcbZ18": "Pressure Ring",
      "mcbZ19": "Narrow Margin",
      "mcbZ20": "Rationed Apex",
      "mcbZ21": "One Throat",
      "mcbZ22": "Shallow Pool",
      "mcbZ23": "Starving Flask",
      "mcbZ24": "The Last Niche",
      "mcbZ25": "The Thin Seeding",
      "mcbZ26": "Five Wide",
      "mcbZ27": "Lower Roof",
      "mcbZ28": "Twelve Founders",
      "mcbZ29": "Seventeen Tall",
      "mcbZ30": "Everything Tight",
      "mcbZ31": "The Short Hand",
      "mcbZ32": "The Long Trial",
      "mcbZ33": "Sixteen Tall",
      "mcbZ34": "Four Wide",
      "mcbZ35": "Eleven Founders",
      "mcbZ36": "Two Throats",
      "mcbZ37": "The Whole Deck",
      "mcbZ38": "Twelve Deep",
      "mcbZ39": "Fifteen Tall",
      "mcbZ40": "The Last Point",
      "mcbTwist1": "heat wave only",
      "mcbTwist2": "acid bloom only",
      "mcbTwist3": "predators, then famine",
      "mcbTwist4": "one shock per generation",
      "mcbTwist5": "two pressures at once",
      "mcbTwist6": "spend one generation early",
      "mcbTwist7": "three shocks in five turns",
      "mcbTwist8": "no room to spare",
      "mcbTwist9": "famine, then famine again",
      "mcbTwist10": "every pressure, always rising",
      "mcbTwist11": "acid vinegar then brand",
      "mcbTwist12": "rapid alternating pressure",
      "mcbTwist13": "dual stresses across ten generations",
      "mcbTwist14": "five cards on a slow climb",
      "mcbTwist15": "six cards on a slow climb",
      "mcbTwist16": "five cards on a fast climb",
      "mcbTwist17": "a leaner budget, climbing fast",
      "mcbTwist18": "six cards on a leaner budget",
      "mcbTwist19": "six cards, one generation from the floor",
      "mcbTwist20": "the leanest budget, ten generations to adapt",
      "mcbTwist21": "every card asks through speed",
      "mcbTwist22": "no strain stacks past six",
      "mcbTwist23": "the founding colony starts starving",
      "mcbTwist24": "the tightest budget over the shallow pool",
      "mcbTwist25": "one founder short of the summit",
      "mcbTwist26": "no strain stacks past five",
      "mcbTwist27": "the ceiling drops to eighteen",
      "mcbTwist28": "twelve founders under the low roof",
      "mcbTwist29": "the leanest ceiling the lab has printed",
      "mcbTwist30": "every ceiling at once, nothing to spare",
      "mcbTwist31": "only two mutations a generation",
      "mcbTwist32": "the storm runs an eleventh generation",
      "mcbTwist33": "the budget drops to sixteen",
      "mcbTwist34": "no strain stacks past four",
      "mcbTwist35": "eleven founders in the flask",
      "mcbTwist36": "nothing prints but flare and venom",
      "mcbTwist37": "all ten cards, one rotation",
      "mcbTwist38": "the longest trial the lab has run",
      "mcbTwist39": "the budget falls to fifteen",
      "mcbTwist40": "one mutation a generation, every lever at its floor",
      "mcbGenLabel": "Generation",
      "mcbPointLabel": "Mutations",
      "mcbPopLabel": "Colony",
      "mcbGenValue": "{n}/{max}",
      "mcbPointValue": "{n} left - {w} wasted",
      "mcbPopValue": "{n} alive - floor {floor}",
      "mcbFieldLabel": "Petri dish: 1 to 6 pick a strain, Left and Right move the trait cursor, Up raises the trait, Down lowers it, Enter advances the generation, Space peeks the next environment card.",
      "mcbDishLabel": "The colony, one row per strain",
      "mcbCultureSelectLabel": "Culture",
      "mcbCardTitle": "Gen {g}: {name} {m}",
      "mcbClause": "{k} + {a} must reach {d} together",
      "mcbPeekOpen": "Scouted card {g}: {name} {m}",
      "mcbPeekShut": "Card {g} is still face down - press Space to scout it.",
      "mcbPeeked": "Card {g} is scouted: it stays face up for the rest of the run.",
      "mcbStrain": "Strain {i} {n}",
      "mcbNames0": "Ashlip",
      "mcbNames1": "Brine",
      "mcbNames2": "Cinder",
      "mcbNames3": "Dusk",
      "mcbNames4": "Ember",
      "mcbNames5": "Floe",
      "mcbStrainCell": "{i}. {n} [{s}/{c}]",
      "mcbStrainAria": "{i}. {n}, traits {t}, budget {s} of {c}. Against this card it {v}.",
      "mcbWillLive": "will live",
      "mcbWillDie": "will be culled",
      "mcbTraitCell": "{g}{v}{d}",
      "mcbTraitAria": "{s}: {k} {v} of {x}, {r} budget room left. Click to {d}.",
      "mcbRaiseWord": "raise it",
      "mcbLowerWord": "give the point back",
      "mcbTheat": "heat",
      "mcbTacid": "acid",
      "mcbTspeed": "speed",
      "mcbTdefence": "defence",
      "mcbBtnNext": "Next Generation",
      "mcbBtnPeek": "Scout card",
      "mcbModeRaise": "Mode: raise (+)",
      "mcbModeLower": "Mode: lower (-)",
      "mcbEheat": "Heat wave",
      "mcbEheatText": "The bench cooks: heat tolerance plus speed is what the card measures.",
      "mcbEacid": "Acid bloom",
      "mcbEacidText": "The medium sours: acid tolerance and the defence wall are scored as one pair.",
      "mcbEdefence": "Predator season",
      "mcbEdefenceText": "Grazers arrive: defence and speed together decide who is worth chasing.",
      "mcbEspeed": "Famine",
      "mcbEspeedText": "Food vanishes: how far you forage and how well you hoard are one pair.",
      "mcbEbrand": "Brand and teeth",
      "mcbEbrandText": "Two pressures at once, and speed is the partner in both pairs.",
      "mcbEempty": "Sour and starving",
      "mcbEemptyText": "Sour and starving: acid and defence are asked for by different pairs.",
      "mcbEgrey": "Teeth in a lean year",
      "mcbEgreyText": "Teeth in a lean year: defence and speed are asked to carry both clauses.",
      "mcbEvinegar": "Sauna of vinegar",
      "mcbEvinegarText": "Hot and sour together: heat and acid must both find a partner.",
      "mcbEflare": "Flare and famine",
      "mcbEflareText": "The bench cooks while food vanishes: speed is the partner in both pairs.",
      "mcbEvenom": "Fangs in the bloom",
      "mcbEvenomText": "The bloom bites back: defence is the partner in both pairs.",
      "mcbNoPoints": "No mutation points left - advance the generation to bank what you built.",
      "mcbCapped": "That strain is at its ceiling ({n} per trait, {c} total) - spend the point elsewhere.",
      "mcbZero": "That trait is already at zero.",
      "mcbRaised": "{s} gains 1 {k} (now {n})",
      "mcbLowered": "{s} gives back 1 {k} (now {n})",
      "mcbResolved": "Gen {g}, {name}: {s} of {n} strains divided",
      "mcbCollapsed": "Colony fell to {s} at generation {g} - the floor is {n}. Metric {m}.",
      "mcbWon": "{g} generations, {s} divisions, {w} wasted points - metric {m} for {st} stars.",
      "mcbNext": "Next culture unlocked.",
      "mcbDone": "Every dish has grown.",
      "mcbBest": "best metric {n}",
      "mcbSilence": "The incubator hums.",
      "mcbPrompt": "{name} - {twist}. Keep at least {floor} strains alive for {gens} generations.",
      "mcbHint": "Unspent points count as waste, so feed the pair the NEXT card wants before you advance.",
      "logMicrobeLab": "Ran {g} generations with {s} divisions",
    },
    zh: {
      "tabMicrobeLab": "微观培养",
      "mcbZ1": "温箱甲",
      "mcbZ2": "酸槽乙",
      "mcbZ3": "先有牙，后有饥",
      "mcbZ4": "冲击钟",
      "mcbZ5": "封存试炼",
      "mcbZ6": "先知箱",
      "mcbZ7": "三连环",
      "mcbZ8": "封顶箱",
      "mcbZ9": "连荒箱",
      "mcbZ10": "全风暴",
      "mcbZ11": "深海热泉",
      "mcbZ12": "适应熔炉",
      "mcbZ13": "巅峰群落",
      "mcbZ14": "双生热泉",
      "mcbZ15": "六卡试炼",
      "mcbZ16": "疾速熔炉",
      "mcbZ17": "精简群落",
      "mcbZ18": "压力环阵",
      "mcbZ19": "微差边缘",
      "mcbZ20": "配额巅峰",
      "mcbZ21": "一线天",
      "mcbZ22": "浅池基因",
      "mcbZ23": "荒年接种",
      "mcbZ24": "最后生态位",
      "mcbZ25": "薄种培养",
      "mcbZ26": "五宽浅池",
      "mcbZ27": "低压顶棚",
      "mcbZ28": "十二先锋",
      "mcbZ29": "十七极限",
      "mcbZ30": "处处紧绷",
      "mcbZ31": "短手窄牌",
      "mcbZ32": "漫长试炼",
      "mcbZ33": "十六极限",
      "mcbZ34": "四宽浅池",
      "mcbZ35": "十一先锋",
      "mcbZ36": "双线天",
      "mcbZ37": "十卡俱全",
      "mcbZ38": "十二代深",
      "mcbZ39": "十五极限",
      "mcbZ40": "最后一点",
      "mcbTwist1": "只有热浪",
      "mcbTwist2": "只有酸华",
      "mcbTwist3": "捕食季，随后饥荒",
      "mcbTwist4": "每代一种冲击",
      "mcbTwist5": "两种压力同时来",
      "mcbTwist6": "提前一代下点",
      "mcbTwist7": "五代三种冲击",
      "mcbTwist8": "预算没有余量",
      "mcbTwist9": "饥荒接着饥荒",
      "mcbTwist10": "四种压力齐涨",
      "mcbTwist11": "酸醋浪潮，继以烙印",
      "mcbTwist12": "交替交叠的快速冲击",
      "mcbTwist13": "十代双重压迫试炼",
      "mcbTwist14": "五张卡，缓慢爬升",
      "mcbTwist15": "六张卡，缓慢爬升",
      "mcbTwist16": "五张卡，快速爬升",
      "mcbTwist17": "预算收紧，压迫快速攀升",
      "mcbTwist18": "六张卡，预算更紧",
      "mcbTwist19": "六张卡，一度逼近底线",
      "mcbTwist20": "最紧预算，十代时间适应",
      "mcbTwist21": "每张卡都从速度过",
      "mcbTwist22": "单项性状不过六",
      "mcbTwist23": "起始菌群先天不足",
      "mcbTwist24": "最紧预算压着最浅池",
      "mcbTwist25": "比峰顶少一份接种",
      "mcbTwist26": "单项性状不过五",
      "mcbTwist27": "上限降到十八",
      "mcbTwist28": "十二先锋顶着低压顶棚",
      "mcbTwist29": "实验室最紧的上限",
      "mcbTwist30": "所有上限同时收紧",
      "mcbTwist31": "每代只有两个突变点",
      "mcbTwist32": "风暴多刮一代",
      "mcbTwist33": "预算降到十六",
      "mcbTwist34": "单项性状不过四",
      "mcbTwist35": "皿里只有十一份接种",
      "mcbTwist36": "只剩灼饥和獠牙",
      "mcbTwist37": "十张卡轮一遍",
      "mcbTwist38": "实验室至今最长的试炼",
      "mcbTwist39": "预算掉到十五",
      "mcbTwist40": "每代一个突变点，所有杠杆都到底",
      "mcbGenLabel": "世代",
      "mcbPointLabel": "突变点",
      "mcbPopLabel": "菌群",
      "mcbGenValue": "{n}/{max}",
      "mcbPointValue": "剩 {n} - 已浪费 {w}",
      "mcbPopValue": "存活 {n} - 下限 {floor}",
      "mcbFieldLabel": "培养皿：数字 1 到 6 选菌株，左右移动性状光标，上键加一点，下键减一点，回车推进世代，空格侦察下一张环境卡。",
      "mcbDishLabel": "菌群，每行一个菌株",
      "mcbCultureSelectLabel": "培养系",
      "mcbCardTitle": "第 {g} 代：{name} {m}",
      "mcbClause": "{k} + {a} 必须合计达到 {d}",
      "mcbPeekOpen": "已侦察第 {g} 张卡：{name} {m}",
      "mcbPeekShut": "第 {g} 张卡还扣着——按空格侦察。",
      "mcbPeeked": "第 {g} 张卡已侦察：本局一直保持翻明。",
      "mcbStrain": "{i} 号菌株 {n}",
      "mcbNames0": "灰唇",
      "mcbNames1": "盐水",
      "mcbNames2": "余烬",
      "mcbNames3": "暮色",
      "mcbNames4": "星火",
      "mcbNames5": "薄冰",
      "mcbStrainCell": "{i}. {n} [{s}/{c}]",
      "mcbStrainAria": "第 {i} 号 {n}，性状 {t}，预算已用 {s}/{c}。面对这张卡它{v}。",
      "mcbWillLive": "能活下来",
      "mcbWillDie": "会被淘汰",
      "mcbTraitCell": "{g}{v}{d}",
      "mcbTraitAria": "{s}：{k} {v}（上限 {x}），预算还剩 {r}。点击可{d}。",
      "mcbRaiseWord": "加一点",
      "mcbLowerWord": "退回这点",
      "mcbTheat": "耐热",
      "mcbTacid": "耐酸",
      "mcbTspeed": "速度",
      "mcbTdefence": "防护",
      "mcbBtnNext": "推进世代",
      "mcbBtnPeek": "侦察下张卡",
      "mcbModeRaise": "模式：加 (+)",
      "mcbModeLower": "模式：减 (-)",
      "mcbEheat": "热浪",
      "mcbEheatText": "温箱在烤：卡上量的是耐热加速度的合计。",
      "mcbEacid": "酸华",
      "mcbEacidText": "培养基变酸：耐酸与防护按一对来计算。",
      "mcbEdefence": "捕食季",
      "mcbEdefenceText": "啃食者来了：防护加速度决定它值得追吗。",
      "mcbEspeed": "饥荒",
      "mcbEspeedText": "食物消失：能走多远和能存多久是一对。",
      "mcbEbrand": "灼热与利牙",
      "mcbEbrandText": "两种压力一起来，而逃生性状能同时接住两边。",
      "mcbEempty": "又酸又饿",
      "mcbEemptyText": "酸华撞上饥荒：耐酸和防护分属不同的两对。",
      "mcbEgrey": "荒年的捕食者",
      "mcbEgreyText": "荒年里的牙齿：防护和速度要同时支撑两个条件。",
      "mcbEvinegar": "醋里蒸桑拿",
      "mcbEvinegarText": "又热又酸：耐热和耐酸都得找到自己的搭档。",
      "mcbEflare": "灼热伴饥荒",
      "mcbEflareText": "温箱在烤，食物又在消失：两个条件都指望速度。",
      "mcbEvenom": "酸华里的獠牙",
      "mcbEvenomText": "酸华反咬一口：两个条件都指望防护。",
      "mcbNoPoints": "突变点用完了——推进世代，把改好的菌群定下来。",
      "mcbCapped": "这个菌株已经到顶（单项上限 {n}，总预算 {c}）——这点会白白浪费。",
      "mcbZero": "这个性状已经是 0 了。",
      "mcbRaised": "{s} 的 {k} 加 1（现 {n}）",
      "mcbLowered": "{s} 退回 1 点 {k}（现 {n}）",
      "mcbResolved": "第 {g} 代 {name}：{n} 个菌株里 {s} 个完成分裂",
      "mcbCollapsed": "第 {g} 代菌群只剩 {s} 个——下限是 {n}。得分 {m}。",
      "mcbWon": "{g} 代、{s} 次分裂、浪费 {w} 点 - 得分 {m}，获得 {st} 星。",
      "mcbNext": "解锁下一套培养系。",
      "mcbDone": "每个培养皿都长起来了。",
      "mcbBest": "最佳得分 {n}",
      "mcbSilence": "恒温箱嗡嗡作响。",
      "mcbPrompt": "{name}——{twist}。请在 {gens} 代里始终保住至少 {floor} 个菌株。",
      "mcbHint": "没花掉的突变点会算成浪费，推进世代前先把它们填进下一张卡要的那一对性状。",
      "logMicrobeLab": "跑完 {g} 代，共 {s} 次分裂",
    },
  });

  App.registerGame({
    name: "microbeLab",
    tabKey: "tabMicrobeLab",
    init: initMicrobeLabGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<circle cx="60" cy="38" r="27" fill="none" stroke="rgba(148,163,184,.4)"/>' +
        '<text x="30" y="26" font-size="9" fill="#a3e635">\u26005</text>' +
        '<text x="48" y="20" font-size="9" fill="#a3e635">\u25cd2</text>' +
        '<text x="70" y="26" font-size="9" fill="#a3e635">\u224b6</text>' +
        '<text x="86" y="40" font-size="9" fill="#fb7185">\u25a41</text>' +
        '<text x="72" y="58" font-size="9" fill="#a3e635">\u26004</text>' +
        '<text x="44" y="58" font-size="9" fill="#a3e635">\u25cd3</text>' +
        '<text x="24" y="44" font-size="8" fill="#94a3b8">+3 pts</text></svg>',
      en: [
        "Aim: keep at least 4 of the 6 strains dividing for all 10 generations. Drop to 3 and the culture collapses.",
        "Card: every generation an environment hits - heat wave, acid bloom, predator season, famine, and later two at once. The card prints the numbers it needs.",
        "Rule: every card names a PAIR of traits and a total - the strain lives when those two traits add up to the printed demand, which is the card number plus three.",
        "Spend: a fixed hand of mutation points each generation, on any strain - three on the first thirty dishes, fewer up the summit bench. Arrow Up raises the focused trait, Arrow Down gives the point back, 1 to 6 switch strain, Left and Right move the trait cursor, Enter advances, Space scouts the next card.",
        "Squeeze: each strain has a trait budget and a per-trait ceiling, so a raise that would break either is refused, and any point you leave unbanked when the card resolves is counted as waste. That is the whole trade-off.",
        "Scoring: metric = divisions x 100 - wasted points, so more survivors first and less waste as the documented tie-break. Selection itself never rolls a die: survivors and their single auto mutation are a pure function of the dish and the card.",
      ],
      zh: [
        "目标：10 代里始终让 6 个菌株中的至少 4 个继续分裂。只剩 3 个，培养就崩溃。",
        "环境卡：每一代换一张——热浪、酸华、捕食季、饥荒，越到后面越是两张叠着来。卡片会把要求的数字写在脸上。",
        "规则：每张卡点名一对性状和一个合计值——这两项加起来达到印出来的需求（卡面数字再加 3），菌株才能活。",
        "花费：每代有定量的突变点，可投给任意菌株——前三十皿是三点，巅峰长凳更少。上方向键给当前性状加一点，下方向键把点退回，数字 1 到 6 换菌株，左右移动性状光标，回车推进世代，空格侦察下一张卡。",
        "张力：每个菌株都有性状预算，会顶破上限的加点会被拒绝并记为浪费——没花完的点同样算浪费。这正是本局的取舍所在。",
        "计分：得分 = 分裂数 x 100 - 浪费点数，所以先看存活数，再用浪费点数作明文规定的平手判定。筛选过程完全不靠骰子：存活者与它们那一次自动突变，只是培养盘与环境卡的函数。",
      ],
    },
  });

  /* Exported for the other modules and the headless tests. */
  App.initMicrobeLabGame = initMicrobeLabGame;
  App.microbeSurvive = microbeSurvive;
  App.microbeBeatable = microbeBeatable;
  App.microbeAllocate = microbeAllocate;
  App.microbeCard = mcbCard;
  App.microbeSequence = mcbSequence;
  App.microbePopulation = mcbPopulation;
  App.microbeMetric = microbeMetric;
  App.microbeSurvives = mcbSurvives;
  App.microbeLevels = mcbLevels;
  App.microbeRandom = mcbRandom;
})(window.CapitalConvert = window.CapitalConvert || {});
