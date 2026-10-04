/* Deep Freeze Expedition - the survival/planning board of the game drawer.
 * Useful equipment has weight and the sheltered way eats food, so packing and
 * routing are one decision with no dominant answer. Forecasts come from a
 * seeded walk, so an expedition replays identically, and the star bands are
 * MEASURED: the planner below searches every pack against every route for the
 * shortest provable line, the way moon market measures its credit ceiling. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var dfzWidth = 430;
  var dfzHeight = 300;
  var dfzWarmthMax = 10;
  var dfzFatigueMax = 10;
  var dfzSpentAt = 8;       /* past this the camp is spent: one extra warmth a day */
  var dfzCollapseLimit = 3; /* days ending at the fatigue limit before it halts */
  var dfzLampReach = 2;     /* forecast cards the storm lamp buys */
  var dfzRationUnits = 3;   /* rations the ration pack is worth */
  var dfzRationIndex = 3;
  var dfzAnyLoad = 99;      /* a way with no pack limit at all */
  /* Forecast hazards sit on the cards, ground hazards on the ways. Each item
   * answers exactly one of them, which is what makes capacity bite. */
  var dfzWeather = ["clear", "cold", "thirst", "blizzard"];

  /* What each hazard costs when the pack has no answer for it, and which item
   * is the answer. A clear card asks for nothing; ice asks for nothing either,
   * because an ice way without crampons is simply not a way you may take. */
  var dfzHazards = {
    cold: { item: 0, warmth: 2, fatigue: 0, food: 0 },
    thirst: { item: 1, warmth: 0, fatigue: 0, food: 1 },
    blizzard: { item: 4, warmth: 2, fatigue: 2, food: 0 },
    ice: { item: 2, warmth: 0, fatigue: 0, food: 0 },
    strain: { item: 5, warmth: 0, fatigue: 2, food: 0 }
  };

  var dfzItems = [
    { key: "dfzCoat", noteKey: "dfzCoatNote", ab: "DC", weight: 4, blocks: "cold" },
    { key: "dfzStove", noteKey: "dfzStoveNote", ab: "SV", weight: 3, blocks: "thirst" },
    { key: "dfzCrampons", noteKey: "dfzCramponsNote", ab: "CR", weight: 1, blocks: "ice" },
    { key: "dfzRations", noteKey: "dfzRationsNote", ab: "RP", weight: 3, blocks: "food" },
    { key: "dfzLamp", noteKey: "dfzLampNote", ab: "LP", weight: 1, blocks: "blizzard" },
    { key: "dfzKit", noteKey: "dfzKitNote", ab: "MK", weight: 2, blocks: "strain" }
  ];

  var dfzNodes = [
    { key: "dfzN0", ab: "BC", x: 30, y: 150 },
    { key: "dfzN1", ab: "MS", x: 100, y: 88 },
    { key: "dfzN2", ab: "FC", x: 100, y: 216 },
    { key: "dfzN3", ab: "IL", x: 172, y: 48 },
    { key: "dfzN4", ab: "SB", x: 172, y: 150 },
    { key: "dfzN5", ab: "WG", x: 172, y: 252 },
    { key: "dfzN6", ab: "SF", x: 250, y: 84 },
    { key: "dfzN7", ab: "CS", x: 250, y: 182 },
    { key: "dfzN8", ab: "RS", x: 250, y: 268, shelter: true },
    { key: "dfzN9", ab: "D4", x: 328, y: 120, shelter: true },
    { key: "dfzN10", ab: "CR", x: 328, y: 228 },
    { key: "dfzN11", ab: "RH", x: 398, y: 172, shelter: true }
  ];

  /* km is distance, exp is weather the ground offers no cover from, tags are
   * the ground hazards, max is the heaviest pack the way will carry. A way over
   * its max - or an ice way with no crampons - simply stands closed. */
  var dfzEdges = [
    { a: 0, b: 1, km: 2, exp: 1, tags: [], max: dfzAnyLoad },
    { a: 0, b: 2, km: 2, exp: 0, tags: [], max: dfzAnyLoad },
    { a: 1, b: 3, km: 2, exp: 2, tags: ["ice"], max: 4 },
    { a: 1, b: 4, km: 2, exp: 1, tags: ["strain"], max: dfzAnyLoad },
    { a: 2, b: 4, km: 1, exp: 1, tags: ["ice"], max: dfzAnyLoad },
    { a: 2, b: 5, km: 3, exp: 0, tags: [], max: dfzAnyLoad },
    { a: 3, b: 4, km: 1, exp: 2, tags: ["ice"], max: dfzAnyLoad },
    { a: 3, b: 6, km: 2, exp: 3, tags: ["ice", "strain"], max: 6 },
    { a: 4, b: 6, km: 2, exp: 2, tags: ["ice"], max: 7 },
    { a: 4, b: 7, km: 3, exp: 2, tags: [], max: dfzAnyLoad },
    { a: 5, b: 7, km: 2, exp: 3, tags: ["strain"], max: dfzAnyLoad },
    { a: 5, b: 8, km: 2, exp: 1, tags: [], max: 4 },
    { a: 6, b: 9, km: 2, exp: 2, tags: ["ice"], max: dfzAnyLoad },
    { a: 6, b: 11, km: 2, exp: 3, tags: ["strain"], max: 7 },
    { a: 7, b: 9, km: 2, exp: 2, tags: [], max: dfzAnyLoad },
    { a: 7, b: 10, km: 2, exp: 2, tags: ["ice"], max: 4 },
    { a: 8, b: 10, km: 3, exp: 1, tags: [], max: dfzAnyLoad },
    { a: 9, b: 11, km: 2, exp: 1, tags: [], max: dfzAnyLoad },
    { a: 10, b: 11, km: 1, exp: 3, tags: ["strain"], max: dfzAnyLoad }
  ];

  /* hazardWeights is [clear, cold, thirst, blizzard], chill is the card floor
   * and spread the day spread the planner measured across other seeds; carry,
   * food and days are the three dials of an expedition. Ten expeditions,
   * ordered by the par the planner measures on each shipped seed; f2 was
   * re-seeded off 812, which measured a day harder than f3, so the ladder
   * rises 3, 4, 4, 4, 5, 5, 6, 7, 8, 8 and every original id stands. */
  var dfzLevels = [
    { id: "f1", labelKey: "dfzE1", seed: 201, start: 0, goal: 8, days: 5, spread: 0,
      cap: 7, food: 4, reach: 2, chill: 1, hazardWeights: [6, 0, 0, 0] },
    { id: "f2", labelKey: "dfzE2", seed: 3, start: 0, goal: 11, days: 7, spread: 1,
      cap: 5, food: 5, reach: 2, chill: 1, hazardWeights: [1, 0, 6, 0] },
    { id: "f3", labelKey: "dfzE3", seed: 5151, start: 0, goal: 11, days: 7, spread: 1,
      cap: 8, food: 6, reach: 2, chill: 2, hazardWeights: [2, 4, 0, 1] },
    { id: "f4", labelKey: "dfzE4", seed: 4207, start: 0, goal: 11, days: 8, spread: 1,
      cap: 7, food: 6, reach: 1, chill: 2, hazardWeights: [1, 1, 1, 5] },
    { id: "f5", labelKey: "dfzE5", seed: 9060, start: 0, goal: 11, days: 7, spread: 0,
      cap: 8, food: 5, reach: 2, chill: 2, hazardWeights: [1, 2, 2, 2] },
    { id: "f6", labelKey: "dfzE6", seed: 11, start: 0, goal: 11, days: 7, spread: 2,
      cap: 7, food: 5, reach: 2, chill: 2, hazardWeights: [1, 3, 3, 0] },
    { id: "f7", labelKey: "dfzE7", seed: 112, start: 0, goal: 11, days: 7, spread: 1,
      cap: 7, food: 5, reach: 2, chill: 2, hazardWeights: [1, 3, 2, 2] },
    { id: "f8", labelKey: "dfzE8", seed: 47, start: 0, goal: 11, days: 8, spread: 1,
      cap: 7, food: 5, reach: 2, chill: 3, hazardWeights: [1, 3, 2, 2] },
    { id: "f9", labelKey: "dfzE9", seed: 256, start: 0, goal: 11, days: 10, spread: 1,
      cap: 7, food: 6, reach: 2, chill: 3, hazardWeights: [1, 3, 3, 0] },
    { id: "f10", labelKey: "dfzE10", seed: 107, start: 0, goal: 11, days: 9, spread: 1,
      cap: 7, food: 6, reach: 2, chill: 3, hazardWeights: [1, 3, 3, 0] }
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

  function dfzClamp(value, low, high) {
    if (typeof value !== "number" || !isFinite(value)) {
      return low;
    }
    return Math.max(low, Math.min(high, value));
  }

  function dfzHasTag(edge, tag) {
    return !!edge && edge.tags.indexOf(tag) !== -1;
  }

  function dfzPackOf(mask) {
    var pack = [];
    for (var i = 0; i < dfzItems.length; i += 1) {
      pack.push((mask & (1 << i)) !== 0);
    }
    return pack;
  }

  function dfzWeight(pack) {
    var total = 0;
    for (var i = 0; i < dfzItems.length; i += 1) {
      if (pack && pack[i]) {
        total += dfzItems[i].weight;
      }
    }
    return total;
  }

  function dfzPackFood(pack) {
    return pack && pack[dfzRationIndex] ? dfzRationUnits : 0;
  }

  function dfzCarry(level) {
    return Math.max(1, level && typeof level.cap === "number" ? level.cap : 1);
  }

  function dfzDays(level) {
    return Math.max(1, level && typeof level.days === "number" ? level.days : 1);
  }

  function dfzFoodOf(level, pack) {
    var base = level && typeof level.food === "number" ? level.food : 0;
    return Math.max(0, base) + dfzPackFood(pack);
  }

  function dfzNodeName(index) {
    return t(dfzNodes[dfzClamp(index, 0, dfzNodes.length - 1)].key);
  }

  function dfzSeedOf(expedition, seed) {
    if (typeof seed === "number" && isFinite(seed)) {
      return Math.round(seed);
    }
    return expedition && typeof expedition.seed === "number" ? expedition.seed : 1;
  }

  function dfzDraw(rows, weights, rng) {
    var total = 0;
    var i;
    for (i = 0; i < weights.length; i += 1) {
      total += weights[i] > 0 ? weights[i] : 0;
    }
    if (total <= 0) {
      return rows[0];
    }
    var roll = rng() * total;
    for (i = 0; i < weights.length; i += 1) {
      roll -= weights[i] > 0 ? weights[i] : 0;
      if (roll <= 0) {
        return rows[i];
      }
    }
    return rows[rows.length - 1];
  }

  /* Ways out of each node and the hop count from every node to a goal, both
   * derived from the tables once and never from a seed. */
  var dfzAdj = [];
  var dfzHops = {};

  function dfzHopsFrom(goal) {
    var dist = [];
    var queue = [goal];
    var i;
    for (i = 0; i < dfzNodes.length; i += 1) {
      dist.push(-1);
    }
    dist[goal] = 0;
    while (queue.length) {
      var node = queue.shift();
      var legs = dfzAdj[node];
      for (i = 0; i < legs.length; i += 1) {
        var edge = dfzEdges[legs[i]];
        var other = edge.a === node ? edge.b : edge.a;
        if (dist[other] === -1) {
          dist[other] = dist[node] + 1;
          queue.push(other);
        }
      }
    }
    return dist;
  }

  (function buildMap() {
    var i, j;
    for (i = 0; i < dfzNodes.length; i += 1) {
      dfzAdj.push([]);
    }
    for (i = 0; i < dfzEdges.length; i += 1) {
      if (!dfzEdges[i]) {
        continue;
      }
      dfzAdj[dfzEdges[i].a].push(i);
      dfzAdj[dfzEdges[i].b].push(i);
    }
    for (j = 0; j < dfzNodes.length; j += 1) {
      dfzAdj[j].sort();
      dfzHops[j] = dfzHopsFrom(j);
    }
  })();

  var dfzFcCache = {};

  /* The whole forecast of an expedition, purely from its seed: card 0 is the
   * day the party sets out, so there is always something to read ahead of. */
  function freezeForecast(expedition, seed) {
    var useSeed = dfzSeedOf(expedition, seed);
    var key = String(expedition && expedition.id ? expedition.id : "map") + "|" + useSeed;
    if (dfzFcCache[key]) {
      return dfzFcCache[key];
    }
    var rng = mulberry32(useSeed);
    var rows = [];
    var total = dfzDays(expedition) + 2;
    for (var day = 0; day < total; day += 1) {
      var hazard = dfzDraw(dfzWeather, expedition.hazardWeights || [1], rng);
      var chill = (expedition.chill > 0 ? expedition.chill : 1) + Math.floor(rng() * 3);
      if (hazard === "cold" || hazard === "blizzard") {
        chill += 1;
      }
      rows.push({ hazard: hazard, chill: dfzClamp(chill, 1, 5) });
    }
    dfzFcCache[key] = rows;
    return rows;
  }

  function dfzForecastAt(expedition, seed, index) {
    var rows = freezeForecast(expedition, seed);
    return rows[dfzClamp(index, 0, rows.length - 1)];
  }

  /* Days ahead the party can read: the expedition's own reach plus what the
   * storm lamp buys for the pack it is carrying. */
  function dfzReach(level, pack) {
    var reach = (level && level.reach > 0 ? level.reach : 1) + (pack && pack[4] ? dfzLampReach : 0);
    return dfzClamp(reach, 1, dfzDays(level));
  }

  function dfzDeal(expedition, seed, pack) {
    var level = expedition || dfzLevels[0];
    return {
      level: level, seed: dfzSeedOf(level, seed), day: 0, node: level.start,
      warmth: dfzWarmthMax, food: dfzFoodOf(level, pack), fatigue: 0, halt: 0,
      pack: pack ? pack.slice() : [false, false, false, false, false, false],
      edge: -1, status: "open", cause: "", causeEdge: -1
    };
  }

  function dfzCopyState(state) {
    return {
      level: state.level, seed: state.seed, day: state.day, node: state.node,
      warmth: state.warmth, food: state.food, fatigue: state.fatigue, halt: state.halt,
      pack: state.pack.slice(), edge: state.edge, status: state.status,
      cause: state.cause, causeEdge: state.causeEdge
    };
  }

  /* What the party may attempt today: making camp, plus every way out of the
   * node it stands on, each flagged with the reason it cannot be taken. */
  function dfzOptions(state) {
    var out = [{ rest: true, edge: -1, to: state.node, blocked: null }];
    var legs = dfzAdj[state.node] || [];
    var weight = dfzWeight(state.pack);
    var bare = !(state.pack && state.pack[2]);
    for (var i = 0; i < legs.length; i += 1) {
      var edge = dfzEdges[legs[i]];
      if (!edge) {
        continue;
      }
      out.push({
        rest: false,
        edge: legs[i],
        to: edge.a === state.node ? edge.b : edge.a,
        blocked: weight > edge.max ? "heavy" : bare && dfzHasTag(edge, "ice") ? "ice" : null
      });
    }
    return out;
  }

  /* The day resolved: that forecast card, the way taken (or camp), the pack and
   * the party's own state decide warmth, food and fatigue. Hazards the pack
   * answers are noted as held, the ones it does not as hits. */
  function dfzResolve(state, choice) {
    var level = state.level;
    var fc = dfzForecastAt(level, state.seed, state.day);
    var pack = state.pack;
    var weight = dfzWeight(pack);
    var next = dfzCopyState(state);
    var hits = [];
    var held = [];
    var rest = !(choice && typeof choice.edge === "number" && choice.edge >= 0);
    var edge = rest ? null : dfzEdges[choice.edge];
    var drink = !!(choice && choice.drink && next.food > 0);
    if (rest) {
      next.edge = -1;
    } else if (!edge || (edge.a !== next.node && edge.b !== next.node)) {
      return { state: state, report: { blocked: "wrong" } };
    } else if (weight > edge.max) {
      return { state: state, report: { blocked: "heavy" } };
    } else if (dfzHasTag(edge, "ice") && !pack[2]) {
      return { state: state, report: { blocked: "ice" } };
    } else {
      next.node = edge.a === next.node ? edge.b : edge.a;
      next.edge = choice.edge;
    }
    var shelter = !!dfzNodes[dfzClamp(next.node, 0, dfzNodes.length - 1)].shelter;
    var loss = 0;
    var strain = 0;
    var cost = 1 + (!rest && edge.km >= 3 ? 1 : 0);
    if (rest) {
      next.warmth = dfzClamp(next.warmth + (shelter ? 3 : 1), 0, dfzWarmthMax);
      next.fatigue = dfzClamp(next.fatigue - ((shelter ? 3 : 2) + (pack[5] ? 1 : 0)), 0, dfzFatigueMax);
    } else {
      /* the card's chill and the ground's exposure drain warmth: the coat
       * shrugs off three of it, a spent camp bleeds one more, a hot drink puts
       * one back - and every kilogram of the pack is paid as fatigue a step. */
      loss = fc.chill + edge.exp - (pack[0] ? 3 : 0);
      if (next.fatigue >= dfzSpentAt) {
        loss += 1;
      }
      if (drink) {
        loss -= 1;
      }
      strain = 1 + Math.floor(edge.km / 2) + Math.floor(weight / 3) + (edge.exp >= 3 ? 1 : 0);
    }
    /* The hazards the day actually presents: the card's weather and, on a
     * march, the ground the way crosses. Each either meets its answer in the
     * pack, and is noted as held, or lands as a hit that costs what the table
     * says - camping out in a cold snap costs rations, not warmth. */
    var facing = rest ? [fc.hazard] : [fc.hazard].concat(edge.tags);
    for (var f = 0; f < facing.length; f += 1) {
      var answer = dfzHazards[facing[f]];
      if (!answer) {
        continue;
      }
      if (pack[answer.item]) {
        held.push(facing[f]);
      } else {
        hits.push(facing[f]);
        if (!rest) {
          loss += answer.warmth;
          strain += answer.fatigue;
        }
        cost += answer.food;
      }
    }
    /* a hot drink buys warmth back; with the melting stove it is free snow */
    if (drink && !pack[1]) {
      cost += 1;
    }
    if (!rest) {
      next.warmth = dfzClamp(next.warmth - Math.max(0, loss), 0, dfzWarmthMax);
      next.fatigue = dfzClamp(next.fatigue + strain, 0, dfzFatigueMax);
    }
    next.food = Math.max(0, next.food - cost);
    next.halt = next.fatigue >= dfzFatigueMax ? next.halt + 1 : 0;
    next.day = Math.min(dfzDays(level), next.day + 1);
    var verdict = freezeArrive(next);
    next.status = verdict.done ? verdict.status : "open";
    if (verdict.done && verdict.status === "lost") {
      next.cause = verdict.cause;
      next.causeEdge = rest ? -1 : next.edge;
    }
    return {
      state: next,
      report: {
        rest: rest, drink: drink, shelter: shelter, day: next.day, blocked: null,
        chill: fc.chill, hazard: fc.hazard, warmth: next.warmth, food: next.food,
        fatigue: next.fatigue, halt: next.halt, hits: hits, held: held
      }
    };
  }

  /* One deterministic day: march with choice.edge, make camp with -1, and the
   * optional hot drink trades a ration for warmth. It never consults a clock. */
  function freezeDay(state, choice) {
    if (!state || !state.level || state.status !== "open") {
      return { state: state, report: null };
    }
    return dfzResolve(state, choice);
  }

  /* Terminal check. Reaching the destination outranks every failing resource,
   * so a party that arrives cold, empty and spent still arrives. */
  function freezeArrive(state) {
    if (!state || !state.level) {
      return { done: false, status: "open", cause: "", days: 0 };
    }
    if (state.node === state.level.goal) {
      return { done: true, status: "won", cause: "arrived", days: state.day };
    }
    if (state.warmth <= 0) {
      return { done: true, status: "lost", cause: "warmth", days: state.day };
    }
    if (state.food <= 0) {
      return { done: true, status: "lost", cause: "food", days: state.day };
    }
    if (state.halt >= dfzCollapseLimit) {
      return { done: true, status: "lost", cause: "fatigue", days: state.day };
    }
    if (state.day >= dfzDays(state.level)) {
      return { done: true, status: "lost", cause: "days", days: state.day };
    }
    return { done: false, status: "open", cause: "", days: state.day };
  }

  /* The last day a plan may camp out: the cards on the table plus every mild
   * day after them, since waiting those out needs no look-ahead. A whiteout
   * past the cards is genuinely unknown - a plan may walk into it and pay for
   * it, but may not sit and wait for it, which is how the lamp earns its kilo. */
  function dfzCampEnd(level, pack, cards, days) {
    var seen = dfzReach(level, pack) - 1;
    var end = Math.min(seen, days - 1);
    var probe = seen + 1;
    while (probe < days && probe < cards.length && cards[probe].hazard !== "blizzard") {
      end = probe;
      probe += 1;
    }
    return dfzClamp(end, 0, days - 1);
  }

  /* One pack, searched day by day. States are filed under the node they stand
   * on and a colder, hungrier, more tired twin is dropped, so the frontier
   * stays small, the answer stays exact and it never runs long. */
  function dfzSearch(level, seed, pack, bestDays) {
    var fc = freezeForecast(level, seed);
    var hops = dfzHops[level.goal] || [];
    var days = dfzDays(level);
    var minLeft = hops[level.start];
    if (minLeft < 0 || minLeft > days || (bestDays > 0 && minLeft >= bestDays)) {
      return null;
    }
    var campEnd = dfzCampEnd(level, pack, fc, days);
    var frontier = [{
      node: level.start, warmth: dfzWarmthMax, food: dfzFoodOf(level, pack),
      fatigue: 0, halt: 0, path: []
    }];
    for (var day = 0; day < days; day += 1) {
      var buckets = [];
      var i, k;
      for (i = 0; i < dfzNodes.length; i += 1) {
        buckets.push([]);
      }
      for (i = 0; i < frontier.length; i += 1) {
        var cur = {
          level: level, seed: seed, day: day, node: frontier[i].node,
          warmth: frontier[i].warmth, food: frontier[i].food,
          fatigue: frontier[i].fatigue, halt: frontier[i].halt,
          pack: pack, edge: -1, status: "open", cause: "", causeEdge: -1
        };
        var choices = dfzOptions(cur);
        for (k = 0; k < choices.length; k += 1) {
          var opt = choices[k];
          if (opt.rest ? day > campEnd : opt.blocked) {
            continue;
          }
          var choice = { edge: opt.edge, drink: false };
          var res = dfzResolve(cur, choice);
          if (!res.report || res.report.blocked) {
            continue;
          }
          /* the hot drink is a legal last resort: take it when the march would
           * freeze the party outright, or when it ends the day badly chilled
           * with a ration to spare (melted snow makes it free with a stove) */
          if (!opt.rest && (res.state.warmth <= 0 ||
            (res.state.warmth <= 3 && cur.food >= (pack[1] ? 3 : 5)))) {
            choice.drink = true;
            res = dfzResolve(cur, choice);
            if (!res.report || res.report.blocked) {
              continue;
            }
          }
          var out = res.state;
          var via = frontier[i].path.concat([{ edge: opt.edge, drink: choice.drink }]);
          if (out.status === "won") {
            return { days: out.day, path: via };
          }
          if (out.status === "lost") {
            continue;
          }
          var left = hops[out.node];
          /* admissible bound: reaching that node still costs a ration a day */
          if (left < 0 || day + 1 + left > days || out.food < left) {
            continue;
          }
          var cand = {
            node: out.node, warmth: out.warmth, food: out.food,
            fatigue: out.fatigue, halt: out.halt, path: via
          };
          var list = buckets[cand.node];
          var dominated = false;
          for (var m = list.length - 1; m >= 0; m -= 1) {
            var old = list[m];
            if (old.warmth >= cand.warmth && old.food >= cand.food &&
              old.fatigue <= cand.fatigue && old.halt <= cand.halt) {
              dominated = true;
              break;
            }
            if (cand.warmth >= old.warmth && cand.food >= old.food &&
              cand.fatigue <= old.fatigue && cand.halt <= old.halt) {
              list.splice(m, 1);
            }
          }
          if (!dominated) {
            list.push(cand);
          }
        }
      }
      frontier = [];
      for (i = 0; i < buckets.length; i += 1) {
        for (k = 0; k < buckets[i].length; k += 1) {
          frontier.push(buckets[i][k]);
        }
      }
      if (!frontier.length) {
        return null;
      }
    }
    return null;
  }

  /* Packs that fit the carry limit, lightest first: the shortest line is nearly
   * always the lean one, so the search usually stops after a few of them. */
  function dfzMasks(level) {
    var masks = [];
    var limit = dfzCarry(level);
    for (var mask = 0; mask < (1 << dfzItems.length); mask += 1) {
      if (dfzWeight(dfzPackOf(mask)) <= limit) {
        masks.push(mask);
      }
    }
    masks.sort(function (x, y) {
      var wx = dfzWeight(dfzPackOf(x));
      var wy = dfzWeight(dfzPackOf(y));
      return wx === wy ? x - y : wx - wy;
    });
    return masks;
  }

  /* The planner the bands are measured with: every pack that fits, searched
   * against every route through the forecast, returning the shortest legal
   * line, its length and its moves. forceMask pins the search to one pack,
   * which is how the worth of a single item is read off the same code. */
  function freezePlan(expedition, seed, forceMask) {
    if (!expedition) {
      return null;
    }
    var floor = (dfzHops[expedition.goal] || [])[expedition.start];
    if (floor < 0) {
      return null;
    }
    var useSeed = dfzSeedOf(expedition, seed);
    var masks = typeof forceMask === "number"
      ? (dfzWeight(dfzPackOf(forceMask)) <= dfzCarry(expedition) ? [forceMask] : [])
      : dfzMasks(expedition);
    var best = null;
    for (var i = 0; i < masks.length; i += 1) {
      var pack = dfzPackOf(masks[i]);
      var found = dfzSearch(expedition, useSeed, pack, best ? best.days : 0);
      if (found && (!best || found.days < best.days)) {
        best = { days: found.days, seed: useSeed, mask: masks[i], pack: pack, path: found.path };
        if (best.days <= floor) {
          break;
        }
      }
    }
    return best;
  }

  /* No map ships without a provable line inside its own day cap. */
  function freezeBeatable(expedition, seed) {
    var plan = freezePlan(expedition, seed);
    return !!plan && plan.days <= dfzDays(expedition);
  }

  /* Bands come from the measured line, never from a guess: three stars is what
   * the planner proved on this very seed, one star is the deadline itself, and
   * the middle band is the spread the same map measured across other seeds. */
  function freezeBand(expedition) {
    var days = dfzDays(expedition);
    var plan = freezePlan(expedition);
    var top = plan ? plan.days : days;
    var mid = Math.max(top + 1, top + (expedition.spread > 0 ? expedition.spread : 0));
    return [dfzClamp(top, 1, days), dfzClamp(mid, top, days), days];
  }

  function dfzWarmWord(value) {
    return t(value >= 9 ? "dfzW4" : value >= 7 ? "dfzW3" : value >= 5 ? "dfzW2" : value >= 1 ? "dfzW1" : "dfzW0");
  }

  function dfzFatWord(value) {
    return t(value >= dfzFatigueMax ? "dfzF3" : value >= dfzSpentAt ? "dfzF2" : value >= 4 ? "dfzF1" : "dfzF0");
  }

  function dfzChillWord(value) {
    return t("dfzChill" + dfzClamp(value, 1, 5));
  }

  function dfzExpWord(value) {
    return t("dfzExp" + dfzClamp(value, 0, 3));
  }

  function dfzWeatherWord(hazard) {
    if (hazard === "cold") {
      return t("dfzCold");
    }
    if (hazard === "thirst") {
      return t("dfzThirst");
    }
    return hazard === "blizzard" ? t("dfzBlizzard") : t("dfzClear");
  }

  function dfzGroundWord(tag) {
    return tag === "ice" ? t("dfzIce") : t("dfzStrain");
  }

  function dfzHazardWords(list) {
    var words = [];
    list.forEach(function (hazard) {
      words.push(dfzWeather.indexOf(hazard) !== -1 ? dfzWeatherWord(hazard) : dfzGroundWord(hazard));
    });
    return words.join(", ");
  }

  function initDeepFreezeExpeditionGame(panelEl) {
    if (!panelEl) {
      return;
    }
    var campaign = createCampaign({ key: "deep-freeze-campaign", levels: dfzLevels });
    var state = dfzDeal(dfzLevels[campaign.indexOf(campaign.nextLevelId())] || dfzLevels[0]);
    var picked = 0;
    var drink = false;
    var lines = [];
    var optionList = [];
    var packRows = [];
    /* --- markup, every node below built with createElement --- */
    function el(tag, className, text) {
      var node = document.createElement(tag);
      if (className) {
        node.className = className;
      }
      if (text !== undefined) {
        node.textContent = text;
      }
      return node;
    }
    function keyed(node, key) {
      node.setAttribute("data-i18n", key);
      node.textContent = t(key);
      return node;
    }
    function stat(key, valueEl) {
      var box = el("div", "game-stat");
      box.appendChild(keyed(el("span"), key));
      box.appendChild(valueEl);
      return box;
    }
    function group(className, role, labelKey, tabbable) {
      var box = el("div", className);
      box.setAttribute("role", role);
      box.setAttribute("aria-label", t(labelKey));
      if (tabbable) {
        box.setAttribute("tabindex", "0");
      }
      return box;
    }
    var dayEl = el("strong");
    var warmEl = el("strong");
    var foodEl = el("strong");
    var fatEl = el("strong");
    var carryEl = el("strong");
    var hud = el("div", "game-hud");
    [["dfzDayLabel", dayEl], ["dfzWarmLabel", warmEl], ["dfzFoodLabel", foodEl],
      ["dfzFatLabel", fatEl], ["dfzCarryLabel", carryEl]].forEach(function (row) {
      hud.appendChild(stat(row[0], row[1]));
    });
    var canvas = el("canvas", "dfz-canvas");
    canvas.width = dfzWidth;
    canvas.height = dfzHeight;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", t("dfzMapAria"));
    var ctx = canvas.getContext("2d");
    var trail = keyed(el("p", "dfz-trail"), "dfzTrail");
    var packBox = group("dfz-pack", "group", "dfzPackAria");
    var forecastBox = group("dfz-forecast", "group", "dfzForecastAria");
    var routeBox = group("dfz-routes", "group", "dfzRouteAria", true);
    var logBox = el("div", "dfz-log");
    var result = el("p", "game-result");
    result.setAttribute("role", "status");
    var expLabel = keyed(el("label", "elements-label"), "dfzExpSelectLabel");
    expLabel.setAttribute("for", "dfzExpSel");
    var expSel = el("select", "elements-select");
    expSel.id = "dfzExpSel";
    var expRow = el("div", "elements-row");
    expRow.appendChild(expLabel);
    expRow.appendChild(expSel);
    var goBtn = el("button", "primary");
    goBtn.type = "button";
    goBtn.appendChild(keyed(el("span", "button-content"), "dfzBtnGo"));
    goBtn.addEventListener("click", setOut);
    var newBtn = el("button", null, t("btnNewRound"));
    newBtn.type = "button";
    newBtn.setAttribute("data-i18n", "btnNewRound");
    newBtn.addEventListener("click", function () {
      loadLevel(state.level);
    });
    var starsEl = el("p", "game-best");
    var actions = el("div", "game-actions");
    actions.appendChild(goBtn);
    actions.appendChild(newBtn);
    actions.appendChild(starsEl);
    var hint = keyed(el("p", "game-hint"), "dfzHint");
    [hud, canvas, trail, packBox, forecastBox, routeBox, logBox, result,
      expRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });
    /* --- pack bench: six real toggle buttons, sealed once the party moves --- */
    function buildPack() {
      packBox.textContent = "";
      packRows = [];
      dfzItems.forEach(function (item, index) {
        var flag = el("span", "dfz-flag");
        var button = el("button", "dfz-itembtn");
        button.type = "button";
        button.appendChild(keyed(el("strong"), item.key));
        button.appendChild(el("span", "dfz-kg", t("dfzKg", { n: item.weight })));
        button.appendChild(flag);
        button.addEventListener("click", function () {
          toggleItem(index);
        });
        var row = el("div", "dfz-item");
        row.appendChild(button);
        row.appendChild(keyed(el("span", "dfz-note"), item.noteKey));
        packBox.appendChild(row);
        packRows.push({ button: button, flag: flag, index: index });
      });
    }
    function toggleItem(index) {
      if (state.status !== "open") {
        return;
      }
      if (state.day > 0) {
        result.textContent = t("dfzSealed");
        return;
      }
      var next = state.pack.slice();
      next[index] = !next[index];
      var weight = dfzWeight(next);
      if (weight > dfzCarry(state.level)) {
        result.textContent = t("dfzNoRoom", { n: dfzCarry(state.level), kg: weight });
        render();
        return;
      }
      state.pack = next;
      state.food = dfzFoodOf(state.level, next);
      result.textContent = t("dfzCarryMsg", {
        n: weight,
        max: dfzCarry(state.level),
        f: state.food
      });
      render();
    }
    /* --- forecast cards, as far ahead as the pack can see --- */
    function renderForecast() {
      forecastBox.textContent = "";
      var reach = dfzReach(state.level, state.pack);
      var cards = freezeForecast(state.level, state.seed);
      for (var offset = 0; offset < cards.length; offset += 1) {
        var index = state.day + offset;
        if (index > dfzDays(state.level)) {
          break;
        }
        var fc = cards[index];
        forecastBox.appendChild(el("div",
          offset >= reach ? "dfz-card is-blind" : offset === 0 ? "dfz-card is-now" : "dfz-card",
          offset >= reach
            ? t("dfzCardBlind", { n: index + 1 })
            : t("dfzCard", { n: index + 1, chill: dfzChillWord(fc.chill), hazard: dfzWeatherWord(fc.hazard) })
        ));
      }
    }
    /* --- ways out of camp, each named for the place it leads to --- */
    function renderRoutes() {
      routeBox.textContent = "";
      optionList = dfzOptions(state);
      if (picked >= optionList.length) {
        picked = 0;
      }
      optionList.forEach(function (opt, index) {
        var edge = dfzEdges[opt.edge];
        var detail = opt.rest ? t("dfzCampDetail") : t("dfzRouteDetail", {
          km: edge.km,
          exp: dfzExpWord(edge.exp),
          tag: edge.tags.length ? edge.tags.map(dfzGroundWord).join("/") : t("dfzNoTag"),
          max: edge.max >= dfzAnyLoad ? t("dfzNoLimit") : String(edge.max)
        });
        if (opt.blocked) {
          detail += " " + (opt.blocked === "ice" ? t("dfzIceNeed") : t("dfzTooHeavy", { n: edge.max }));
        }
        var button = el("button", "dfz-route" + (index === picked ? " is-picked" : ""));
        button.type = "button";
        button.setAttribute("aria-pressed", index === picked ? "true" : "false");
        if (opt.blocked) {
          button.disabled = true;
        }
        button.appendChild(el("strong", null, opt.rest
          ? t("dfzCamp", { place: dfzNodeName(state.node) })
          : t("dfzTo", { place: dfzNodeName(opt.to) })));
        button.appendChild(el("span", "dfz-routedetail", detail));
        button.addEventListener("click", function () {
          picked = index;
          render();
        });
        routeBox.appendChild(button);
      });
      var drinkBtn = el("button", "dfz-drink" + (drink ? " is-on" : ""));
      drinkBtn.type = "button";
      drinkBtn.setAttribute("aria-pressed", drink ? "true" : "false");
      drinkBtn.textContent = t(drink ? "dfzDrinkOn" : "dfzDrinkOff");
      drinkBtn.addEventListener("click", function () {
        drink = !drink;
        render();
      });
      routeBox.appendChild(drinkBtn);
    }
    function chosen() {
      return optionList[picked] || optionList[0] || { rest: true, edge: -1, blocked: null };
    }
    function setOut() {
      if (state.status !== "open") {
        return;
      }
      var opt = chosen();
      var res = freezeDay(state, { edge: opt.edge, drink: drink && state.food > 1 });
      if (!res.report) {
        return;
      }
      if (res.report.blocked) {
        var edge = dfzEdges[opt.edge];
        if (edge) {
          result.textContent = res.report.blocked === "ice"
            ? t("dfzIceNeed")
            : t("dfzTooHeavy", { n: edge.max });
        }
        return;
      }
      state = res.state;
      drink = false;
      picked = 0;
      lines.push(logLine(res.report));
      if (state.status === "won") {
        finish();
      } else if (state.status === "lost") {
        fail(state);
      }
      render();
    }
    function logLine(report) {
      var tail = "";
      if (report.hits.length) {
        tail += " " + t("dfzGotAt", { list: dfzHazardWords(report.hits) });
      }
      if (report.held.length) {
        tail += " " + t("dfzHeldAt", { list: dfzHazardWords(report.held) });
      }
      return t(report.rest ? "dfzLogRest" : "dfzLogGo", {
        d: report.day,
        place: dfzNodeName(state.node),
        w: report.warmth,
        f: report.food,
        t: report.fatigue
      }) + tail;
    }
    /* --- the map, drawn from the same numbers the buttons spell out --- */
    function renderMap() {
      var weight = dfzWeight(state.pack);
      var bare = !state.pack[2];
      var i;
      ctx.clearRect(0, 0, dfzWidth, dfzHeight);
      ctx.fillStyle = "#111a2e";
      ctx.fillRect(0, 0, dfzWidth, dfzHeight);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (i = 0; i < dfzEdges.length; i += 1) {
        var edge = dfzEdges[i];
        var from = dfzNodes[edge.a];
        var to = dfzNodes[edge.b];
        var live = edge.a === state.node || edge.b === state.node;
        var barred = weight > edge.max || (bare && dfzHasTag(edge, "ice"));
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.lineWidth = live ? 3 : 1.5;
        ctx.strokeStyle = live && barred ? "#fb7185" : live ? "#67e8f9" : "#334155";
        ctx.setLineDash(barred ? [5, 4] : []);
        ctx.stroke();
        ctx.setLineDash([]);
        var mx = Math.round((from.x + to.x) / 2);
        var my = Math.round((from.y + to.y) / 2);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillText(String(edge.km), mx - 8, my - 7);
        if (edge.tags.length) {
          ctx.fillStyle = "#fbbf24";
          ctx.fillText(edge.tags.length > 1 ? "I+S" : edge.tags[0] === "ice" ? "I" : "S", mx + 8, my - 7);
        }
      }
      for (i = 0; i < dfzNodes.length; i += 1) {
        var node = dfzNodes[i];
        var here = i === state.node;
        var goal = i === state.level.goal;
        ctx.beginPath();
        ctx.arc(node.x, node.y, here ? 13 : 10, 0, Math.PI * 2);
        ctx.fillStyle = node.shelter ? "#1e293b" : "#0f172a";
        ctx.fill();
        ctx.lineWidth = here ? 3 : 1.6;
        ctx.strokeStyle = here ? "#a3e635" : goal ? "#22d3ee" : "#64748b";
        ctx.stroke();
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.fillText(node.ab, node.x, node.y);
        if (here || goal) {
          ctx.font = "8px 'JetBrains Mono', monospace";
          ctx.fillStyle = goal ? "#22d3ee" : "#94a3b8";
          ctx.fillText(t(node.key), node.x, node.y + 19);
        }
      }
      ctx.fillStyle = "#a3e635";
      ctx.beginPath();
      ctx.arc(dfzNodes[state.node].x, dfzNodes[state.node].y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    function renderHud() {
      var days = dfzDays(state.level);
      dayEl.textContent = t("dfzDayStat", { n: Math.min(state.day + 1, days), total: days });
      warmEl.textContent = t("dfzWarmStat", {
        n: state.warmth,
        max: dfzWarmthMax,
        word: dfzWarmWord(state.warmth)
      });
      foodEl.textContent = t("dfzFoodStat", { n: state.food });
      fatEl.textContent = t("dfzFatStat", {
        n: state.fatigue,
        max: dfzFatigueMax,
        word: dfzFatWord(state.fatigue)
      });
      carryEl.textContent = t("dfzCarryStat", { n: dfzWeight(state.pack), max: dfzCarry(state.level) });
      trail.textContent = t("dfzTrail", {
        here: dfzNodeName(state.node),
        goal: dfzNodeName(state.level.goal),
        n: Math.max(0, days - state.day)
      });
      canvas.setAttribute("aria-label", t("dfzMapAriaLive", {
        here: dfzNodeName(state.node),
        goal: dfzNodeName(state.level.goal)
      }));
    }
    function renderPack() {
      packRows.forEach(function (row) {
        var on = !!state.pack[row.index];
        row.button.setAttribute("aria-pressed", on ? "true" : "false");
        row.flag.textContent = t(on ? "dfzPacked" : "dfzLeft");
        row.button.className = "dfz-itembtn" + (on ? " is-on" : "");
        row.button.disabled = state.status !== "open" || state.day > 0;
      });
    }
    function renderLog() {
      logBox.textContent = "";
      lines.slice(-6).forEach(function (line) {
        logBox.appendChild(el("p", "dfz-logline", line));
      });
    }
    function refreshPicker() {
      fillCampaignPicker(expSel, campaign, function (def) {
        return t(def.labelKey);
      }, t("elementsLocked"));
      expSel.value = state.level.id;
      starsEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars()
      });
    }
    /* Every loss names the resource that failed and where it failed. */
    function fail(st) {
      var place = dfzNodeName(st.node);
      var where = st.cause === "days"
        ? t("dfzAtPlace", { place: place })
        : st.causeEdge >= 0
          ? t("dfzOnEdge", { place: place })
          : t("dfzAtCamp", { place: place });
      var key = st.cause === "warmth"
        ? "dfzLostWarmth"
        : st.cause === "food" ? "dfzLostFood" : st.cause === "fatigue" ? "dfzLostFatigue" : "dfzLostDays";
      result.textContent = t(key, { d: st.day, place: where, n: dfzDays(st.level) });
      result.className = "game-result dfz-lost";
    }
    function finish() {
      var band = state.level.starDays || freezeBand(state.level);
      var starsWon = starsFor(state.day, band, "low");
      var outcome = campaign.record(state.level.id, {
        stars: starsWon,
        best: state.day,
        better: "low"
      });
      var message = t("dfzWon", { place: dfzNodeName(state.level.goal), n: state.day, s: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("dfzNextExp");
      } else if (campaign.clearedCount() === dfzLevels.length) {
        message += " " + t("dfzAllExps");
      }
      result.textContent = message;
      result.className = "game-result";
      logAction(t("logDeepFreeze", { n: state.day, place: dfzNodeName(state.level.goal) }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }
    function loadLevel(levelDef) {
      state = dfzDeal(levelDef);
      picked = 0;
      drink = false;
      lines = [];
      result.className = "game-result";
      render();
      refreshPicker();
      result.textContent = t("dfzPrompt", {
        name: t(levelDef.labelKey),
        place: dfzNodeName(levelDef.goal),
        d: dfzDays(levelDef),
        cap: dfzCarry(levelDef),
        f: dfzFoodOf(levelDef, state.pack)
      });
    }
    function render() {
      renderHud();
      renderForecast();
      renderRoutes();
      renderPack();
      renderLog();
      renderMap();
    }
    function movePick(step) {
      var n = optionList.length;
      if (!n) {
        return;
      }
      picked = (picked + step + n) % n;
      render();
    }
    function onKeys(event) {
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        movePick(1);
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        movePick(-1);
      } else if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        setOut();
      }
    }
    /* Pointer and keyboard both pick the same way out of camp, so a whole
     * expedition is completable from the keyboard alone. */
    function nodeAt(event) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return -1;
      }
      var px = (event.clientX - rect.left) * (dfzWidth / rect.width);
      var py = (event.clientY - rect.top) * (dfzHeight / rect.height);
      var best = -1;
      var bestD = 20 * 20;
      for (var i = 0; i < dfzNodes.length; i += 1) {
        var dx = dfzNodes[i].x - px;
        var dy = dfzNodes[i].y - py;
        if (dx * dx + dy * dy <= bestD) {
          bestD = dx * dx + dy * dy;
          best = i;
        }
      }
      return best;
    }
    routeBox.addEventListener("keydown", onKeys);
    canvas.addEventListener("keydown", onKeys);
    canvas.addEventListener("pointerdown", function (event) {
      if (state.status !== "open") {
        return;
      }
      var hit = nodeAt(event);
      for (var i = 0; i < optionList.length; i += 1) {
        if (!optionList[i].rest && optionList[i].to === hit) {
          picked = i;
          render();
          return;
        }
      }
    });
    expSel.addEventListener("change", function () {
      var index = campaign.indexOf(expSel.value);
      if (index >= 0 && campaign.isUnlocked(expSel.value)) {
        loadLevel(dfzLevels[index]);
      } else {
        expSel.value = state.level.id;
      }
    });
    buildPack();
    loadLevel(dfzLevels[campaign.indexOf(campaign.nextLevelId())] || dfzLevels[0]);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabDeepFreezeExpedition": "Deep Freeze",
      "dfzE1": "Supply Run",
      "dfzE2": "The Ice Field",
      "dfzE3": "Cold Snap",
      "dfzE4": "Whiteout Watch",
      "dfzE5": "The Long Crossing",
      "dfzE6": "The Dry Cold",
      "dfzE7": "Squall Corridor",
      "dfzE8": "Gale Shelf",
      "dfzE9": "Deep Winter",
      "dfzE10": "The Last Window",
      "dfzN0": "Base Camp",
      "dfzN1": "Moraine Shelf",
      "dfzN2": "Frozen Creek",
      "dfzN3": "Icefall Ledge",
      "dfzN4": "Snow Bridge",
      "dfzN5": "Wind Gap",
      "dfzN6": "Serac Field",
      "dfzN7": "Cold Sink",
      "dfzN8": "Rock Shelter",
      "dfzN9": "Depot Four",
      "dfzN10": "Crevasse Rim",
      "dfzN11": "Rescue Hut",
      "dfzCoat": "Down coat",
      "dfzStove": "Melting stove",
      "dfzCrampons": "Crampons",
      "dfzRations": "Ration pack",
      "dfzLamp": "Storm lamp",
      "dfzKit": "Medical kit",
      "dfzCoatNote": "Holds back a cold snap and shrugs off exposure. Heavy.",
      "dfzStoveNote": "Melts snow: a dry-air day costs no extra ration and a hot drink costs none at all.",
      "dfzCramponsNote": "The only way over an ice way - without them it stands closed. Light.",
      "dfzRationsNote": "Three rations. One kilogram each, and no protection.",
      "dfzLampNote": "Reads two forecast cards further ahead; no stumble in a whiteout.",
      "dfzKitNote": "Absorbs a strain ledge and adds one point to a camp rest.",
      "dfzDayLabel": "Day",
      "dfzWarmLabel": "Warmth",
      "dfzFoodLabel": "Food",
      "dfzFatLabel": "Fatigue",
      "dfzCarryLabel": "Carry",
      "dfzDayStat": "{n}/{total} days",
      "dfzWarmStat": "{n}/{max}, {word}",
      "dfzFoodStat": "{n} rations",
      "dfzFatStat": "{n}/{max}, {word}",
      "dfzCarryStat": "{n}/{max} kg",
      "dfzW0": "Frozen out",
      "dfzW1": "Icy",
      "dfzW2": "Chilly",
      "dfzW3": "Warm",
      "dfzW4": "Toasty",
      "dfzF0": "Fresh",
      "dfzF1": "Tired",
      "dfzF2": "Spent",
      "dfzF3": "Waxed",
      "dfzChill1": "Brisk",
      "dfzChill2": "Cold",
      "dfzChill3": "Bitter",
      "dfzChill4": "Cutting",
      "dfzChill5": "Merciless",
      "dfzExp0": "Sheltered",
      "dfzExp1": "Open",
      "dfzExp2": "Exposed",
      "dfzExp3": "Brutal",
      "dfzCold": "Cold snap",
      "dfzThirst": "Dry air",
      "dfzBlizzard": "Whiteout",
      "dfzClear": "Clear",
      "dfzIce": "Ice",
      "dfzStrain": "Strain",
      "dfzNoTag": "Fair ground",
      "dfzNoLimit": "Any load",
      "dfzMapAria": "Expedition map: twelve named places joined by ways of measured distance",
      "dfzMapAriaLive": "Expedition map, party at {here}, destination {goal}",
      "dfzPackAria": "Pack bench: take or leave each item, weight counts against the carry limit",
      "dfzForecastAria": "Forecast cards for the coming days",
      "dfzRouteAria": "Ways out of camp: arrows pick a way, Enter sets out",
      "dfzExpSelectLabel": "Choose an expedition",
      "dfzBtnGo": "Set Out",
      "dfzHint": "Pack at the bench before setting out: weight becomes fatigue, and an item that never meets its hazard is pure weight. Arrows pick a way, Enter sets out, making camp buys warmth back with a day.",
      "dfzTrail": "At {here}. Destination {goal}. Days left: {n}.",
      "dfzCard": "Day {n}: {chill}, {hazard}",
      "dfzCardBlind": "Day {n}: no forecast",
      "dfzTo": "To {place}",
      "dfzCamp": "Make camp at {place}",
      "dfzCampDetail": "Stay put, thaw out and shake off fatigue",
      "dfzRouteDetail": "{km} km, {exp}, {tag}, limit {max}",
      "dfzDrinkOn": "Hot drink: on",
      "dfzDrinkOff": "Hot drink: off",
      "dfzKg": "{n} kg",
      "dfzPacked": "Packed",
      "dfzLeft": "Left",
      "dfzTooHeavy": "That way takes {n} kg at most.",
      "dfzIceNeed": "Ice underfoot: no crampons, no crossing.",
      "dfzNoRoom": "That pack weighs {kg} kg and the limit is {n} kg.",
      "dfzCarryMsg": "Carrying {n} of {max} kg with {f} rations.",
      "dfzSealed": "The pack is sealed once the party has set out.",
      "dfzLogGo": "Day {d}: to {place} - warmth {w}, food {f}, fatigue {t}.",
      "dfzLogRest": "Day {d}: camped at {place} - warmth {w}, food {f}, fatigue {t}.",
      "dfzGotAt": "It got through: {list}.",
      "dfzHeldAt": "Held: {list}.",
      "dfzAtPlace": "still at {place}",
      "dfzOnEdge": "on the way to {place}",
      "dfzAtCamp": "at the camp in {place}",
      "dfzWon": "Reached {place} on day {n} - {s} stars!",
      "dfzLostWarmth": "Warmth hit zero on day {d}, {place}. The cold won.",
      "dfzLostFood": "The last ration went on day {d}, {place}. There was nothing left to eat.",
      "dfzLostFatigue": "Fatigue stayed maxed three days running, so the party had to halt on day {d}, {place}.",
      "dfzLostDays": "The {n}-day cap ran out on day {d}, {place}. The hut stayed hidden.",
      "dfzNextExp": "Next expedition unlocked.",
      "dfzAllExps": "All ten expeditions crossed.",
      "dfzPrompt": "{name}: reach {place} within {d} days. Carry limit {cap} kg, {f} rations, warmth 10.",
      "logDeepFreeze": "Reached {place} in {n} days on the ice",
    },
    zh: {
      "tabDeepFreezeExpedition": "极冻远征",
      "dfzE1": "补给短途",
      "dfzE2": "冰壁之路",
      "dfzE3": "寒潮来袭",
      "dfzE4": "白毛风预警",
      "dfzE5": "长途穿越",
      "dfzE6": "干寒之地",
      "dfzE7": "风雪走廊",
      "dfzE8": "狂风台地",
      "dfzE9": "深冬冰原",
      "dfzE10": "最后窗口",
      "dfzN0": "大本营",
      "dfzN1": "冰碛台地",
      "dfzN2": "冻溪口",
      "dfzN3": "冰瀑岩脊",
      "dfzN4": "雪桥",
      "dfzN5": "风口",
      "dfzN6": "冰塔区",
      "dfzN7": "冷穴",
      "dfzN8": "岩屋",
      "dfzN9": "四号补给站",
      "dfzN10": "冰隙缘",
      "dfzN11": "救援小屋",
      "dfzCoat": "羽绒大衣",
      "dfzStove": "融雪炉",
      "dfzCrampons": "冰爪",
      "dfzRations": "口粮包",
      "dfzLamp": "风雪灯",
      "dfzKit": "急救包",
      "dfzCoatNote": "挡住寒潮，也能顶住暴露地形。很重。",
      "dfzStoveNote": "融雪取水：干寒天不多耗口粮，热饮更是免费。",
      "dfzCramponsNote": "过冰面的唯一办法，没有它就是不通。很轻。",
      "dfzRationsNote": "三份口粮，一公斤一份，但不提供任何防护。",
      "dfzLampNote": "多看清两张预报卡，白毛风里不再摔跤。",
      "dfzKitNote": "化解吃力地形，并让扎营多恢复一点体力。",
      "dfzDayLabel": "天数",
      "dfzWarmLabel": "体温",
      "dfzFoodLabel": "食物",
      "dfzFatLabel": "疲劳",
      "dfzCarryLabel": "负重",
      "dfzDayStat": "第 {n}/{total} 天",
      "dfzWarmStat": "{n}/{max}，{word}",
      "dfzFoodStat": "{n} 份口粮",
      "dfzFatStat": "{n}/{max}，{word}",
      "dfzCarryStat": "{n}/{max} 公斤",
      "dfzW0": "冻僵",
      "dfzW1": "刺骨",
      "dfzW2": "发凉",
      "dfzW3": "暖和",
      "dfzW4": "暖烘烘",
      "dfzF0": "充沛",
      "dfzF1": "疲惫",
      "dfzF2": "透支",
      "dfzF3": "极限",
      "dfzChill1": "微寒",
      "dfzChill2": "寒冷",
      "dfzChill3": "严寒",
      "dfzChill4": "透骨寒",
      "dfzChill5": "无情寒",
      "dfzExp0": "避风",
      "dfzExp1": "开阔",
      "dfzExp2": "暴露",
      "dfzExp3": "猛烈暴露",
      "dfzCold": "寒潮",
      "dfzThirst": "干寒",
      "dfzBlizzard": "白毛风",
      "dfzClear": "晴好",
      "dfzIce": "冰面",
      "dfzStrain": "吃力",
      "dfzNoTag": "好走",
      "dfzNoLimit": "不设限",
      "dfzMapAria": "远征地图：十二个有名字的地形点，按距离相连",
      "dfzMapAriaLive": "远征地图，队伍在{here}，目标是{goal}",
      "dfzPackAria": "装备台：逐件取舍，负重会挤掉容量上限",
      "dfzForecastAria": "接下来几天的预报卡",
      "dfzRouteAria": "出营路线：方向键选择，回车出发",
      "dfzExpSelectLabel": "选择远征",
      "dfzBtnGo": "出发",
      "dfzHint": "出发前先在装备台取舍：重量会变成疲劳，碰不上对应灾害的装备就是纯粹的死重量。方向键选路，回车出发，扎营用一天换回体温。",
      "dfzTrail": "队伍在{here}，目标{goal}，剩余天数 {n}。",
      "dfzCard": "第 {n} 天：{chill}，{hazard}",
      "dfzCardBlind": "第 {n} 天：无预报",
      "dfzTo": "前往{place}",
      "dfzCamp": "在{place}扎营",
      "dfzCampDetail": "原地休整，回暖并卸掉疲劳",
      "dfzRouteDetail": "{km} 公里，{exp}，{tag}，限重 {max}",
      "dfzDrinkOn": "热饮：已开",
      "dfzDrinkOff": "热饮：已关",
      "dfzKg": "{n} 公斤",
      "dfzPacked": "已装包",
      "dfzLeft": "未装",
      "dfzTooHeavy": "这条路最多只能背 {n} 公斤。",
      "dfzIceNeed": "脚下是冰——没有冰爪就过不去。",
      "dfzNoRoom": "这个包装完是 {kg} 公斤，上限只有 {n} 公斤。",
      "dfzCarryMsg": "当前负重 {n}/{max} 公斤，共 {f} 份口粮。",
      "dfzSealed": "队伍已经出发，背包不能再改了。",
      "dfzLogGo": "第 {d} 天：前往{place} - 体温 {w}，食物 {f}，疲劳 {t}。",
      "dfzLogRest": "第 {d} 天：在{place}扎营 - 体温 {w}，食物 {f}，疲劳 {t}。",
      "dfzGotAt": "但防不住：{list}。",
      "dfzHeldAt": "扛住了：{list}。",
      "dfzAtPlace": "仍停在{place}",
      "dfzOnEdge": "在前往{place}的路上",
      "dfzAtCamp": "在{place}营地",
      "dfzWon": "第 {n} 天抵达{place} - 获得 {s} 星！",
      "dfzLostWarmth": "第 {d} 天，{place}，体温归零——是寒冷赢了。",
      "dfzLostFood": "第 {d} 天，{place}，吃掉了最后一份口粮，再也没有可吃的了。",
      "dfzLostFatigue": "疲劳连续三天顶在极限，第 {d} 天，{place}，被迫停下。",
      "dfzLostDays": "{n} 天期限已到，第 {d} 天，{place}，小屋始终没露面。",
      "dfzNextExp": "解锁下一段远征。",
      "dfzAllExps": "十段远征全部走完。",
      "dfzPrompt": "「{name}」：{d} 天内抵达{place}。限重 {cap} 公斤，起始口粮 {f} 份，体温 10。",
      "logDeepFreeze": "在冰原上走了 {n} 天抵达{place}",
    }
  });

  /* Measure every expedition's band from its own planner run at load time -
   * three stars is a line the solver proved on the shipped seed - and never
   * ship a map it cannot cross: if a deadline admits no line, widen it until
   * one does, then measure again. */
  dfzLevels.forEach(function (level) {
    level.starDays = freezeBand(level);
    if (freezeBeatable(level)) {
      return;
    }
    var probe = 1;
    var plan = null;
    while (!plan && probe <= 8) {
      var roomier = {
        id: level.id, labelKey: level.labelKey, seed: level.seed, spread: level.spread,
        start: level.start, goal: level.goal, days: dfzDays(level) + probe,
        cap: dfzCarry(level), food: level.food, reach: level.reach,
        chill: level.chill, hazardWeights: level.hazardWeights
      };
      plan = freezePlan(roomier);
      probe += 1;
    }
    if (plan) {
      level.days = plan.days + 1;
      level.starDays = freezeBand(level);
    }
  });

  App.registerGame({
    name: "deepFreezeExpedition",
    tabKey: "tabDeepFreezeExpedition",
    init: initDeepFreezeExpeditionGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="5" y="5" width="110" height="66" rx="6" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M16 60 34 40 58 52 78 26 104 34" fill="none" stroke="#22d3ee" stroke-width="2"/>' +
        '<path d="M16 60 30 20 58 52" fill="none" stroke="#fbbf24" stroke-width="1.6" stroke-dasharray="4 3"/>' +
        '<circle cx="16" cy="60" r="4" fill="none" stroke="#a3e635" stroke-width="2"/>' +
        '<circle cx="104" cy="34" r="5" fill="none" stroke="#22d3ee" stroke-width="2"/>' +
        '<text x="94" y="18" font-size="8" fill="#e2e8f0">4kg</text>' +
        '<rect x="48" y="6" width="28" height="12" rx="2" fill="none" stroke="#94a3b8"/>' +
        '<text x="62" y="15" font-size="7" fill="#94a3b8" text-anchor="middle">cold</text>' +
        '<path d="M14 68h92" stroke="rgba(148,163,184,.5)"/></svg>',
      en: [
        "Aim: reach the rescue hut inside the expedition's day cap with warmth, food and fatigue all still above ruin.",
        "Action: pack at the bench, read the forecast cards, pick a way out of camp and set out; or make camp a day to buy warmth and rest back.",
        "Rule: every item weighs something, weight is paid as fatigue on every step, and each item answers only the one hazard its note names.",
        "Rule: an ice way stands closed without crampons and a narrow way closes to a heavy pack, so the pack you choose chooses the route you get.",
        "Watch out: exposure and a cold card drain warmth while distance and dry air burn rations, so the sheltered way can cost more days than you have food for.",
        "Scoring: stars count days used - three stars is the shortest line our own planner proved on that map, and every expedition replays identically from its seed.",
      ],
      zh: [
        "目标：在远征天数上限内抵达救援小屋，并且体温、食物、疲劳都没走到尽头。",
        "操作：先在装备台打包，再读预报卡，选一条出营的路出发；也可以扎营一天，用一天换回体温与体力。",
        "规则：每件装备都有重量，重量会在每一步变成疲劳，而每件装备只应对它说明里那一种灾害。",
        "规则：冰面路没有冰爪就走不了，窄路背重了就关门，所以你选的背包决定了你能走的路。",
        "小心：暴露地形加寒潮会掉体温，距离与干寒会烧口粮，所以最安全的路常常比你的口粮多耗好几天。",
        "计分：按所用天数评星——三星线是我们自己的规划器在该地图上实测出的最短路，同一种子每一次都完全重放。",
      ],
    },
  });

  /* Exported for the other modules and the headless checks. */
  App.initDeepFreezeExpeditionGame = initDeepFreezeExpeditionGame;
  App.freezeDay = freezeDay;
  App.freezeArrive = freezeArrive;
  App.freezePlan = freezePlan;
  App.freezeBeatable = freezeBeatable;
  App.freezeBand = freezeBand;
  App.freezeForecast = freezeForecast;
  App.freezeDeal = dfzDeal;
  App.freezeOptions = dfzOptions;
  App.freezeWeight = dfzWeight;
  App.freezePackOf = dfzPackOf;
  App.freezePackFood = dfzPackFood;
  App.freezeCarry = dfzCarry;
  App.freezeReach = dfzReach;
  App.freezeLevels = dfzLevels;
  App.freezeItems = dfzItems;
  App.freezeNodes = dfzNodes;
  App.freezeEdges = dfzEdges;
})(window.CapitalConvert = window.CapitalConvert || {});
