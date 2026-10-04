/* One-Minute Mayor - the ten-turn town-planning game in the shared game drawer.
 * Five blueprint types go on a 6x6 grid and every one of them both helps and
 * hurts: a tap that waters a row of homes burns the lot a worksite wanted, a
 * worksite employs two homes and fouls the four it fronts, a stop is worth
 * nothing until a home is too far from work to walk. Nothing is random - the
 * same district is dealt identically - and the ledger prints every point in
 * words plus digits, so a player can always explain their own score. The bands
 * are measured: a greedy line plus seeded restarts runs the exported scorer. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var omvSide = 6;
  var omvHome = "H";
  var omvWork = "W";
  var omvTap = "T";
  var omvStop = "R";
  var omvGreen = "G";
  var omvRoster = [omvHome, omvWork, omvTap, omvStop, omvGreen];

  /* Reach is walked in streets, so it is Manhattan steps: water needs 2, a job
   * needs 3, and a stop lifts that to 5. Capacity - a tap waters 3 homes, a
   * worksite employs 2, a stop serves 2, a green pays for 2 frontages - is what
   * keeps any one tile from being the right answer everywhere. */
  var omvWaterReach = 2, omvJobReach = 3, omvStopReach = 5;
  var omvStaffReach = 2, omvStopHelp = 2, omvHeritageBan = 2;
  var omvTapServes = 3, omvWorkPlaces = 2, omvStopServes = 2, omvGreenPays = 2;

  /* Every number the ledger can print lives here, once. */
  var omvPay = {
    roof: 2, water: 3, job: 4, tap: 1, work: 3, stop: 2, green: 4,
    thirst: -1, jobless: -2, foulHome: -2, idle: -1, empty: -2,
  };

  /* Each type carries a rule that both pays and costs, and the ledger names the
   * exact relation it checked, so the legend and the score never disagree. */
  var omvSpecies = {};
  omvSpecies[omvHome] = { key: "omvHome", glyph: "H", ruleKey: "omvHomeRule", css: "is-home" };
  omvSpecies[omvWork] = { key: "omvWork", glyph: "W", ruleKey: "omvWorkRule", css: "is-work" };
  omvSpecies[omvTap] = { key: "omvTap", glyph: "T", ruleKey: "omvTapRule", css: "is-tap" };
  omvSpecies[omvStop] = { key: "omvStop", glyph: "R", ruleKey: "omvStopRule", css: "is-stop" };
  omvSpecies[omvGreen] = { key: "omvGreen", glyph: "G", ruleKey: "omvGreenRule", css: "is-green" };

  function omvXY(pairs) {
    return pairs.map(function (pair) {
      return pair[1] * omvSide + pair[0];
    });
  }

  /* Ten districts, always the same ten: open land, a river of water, a
   * brownfield of foul ground, a listed corner that bans worksites, the full
   * city with all three at once, and then five tighter layouts that squeeze the
   * same knobs with a smaller margin each time. stars/plan/proof are filled by
   * omvProveAll(), from the measured plan - no band here is invented. */
  function omvDistrict(id, labelKey, slack, blocked, fouled, heritage) {
    return {
      id: id, labelKey: labelKey, turns: 10, slack: slack,
      blocked: blocked || [], fouled: fouled || [], heritage: heritage || [],
      stars: [0, 0, 0], plan: 0, proof: null,
    };
  }

  var omvRiver = omvXY([[2, 0], [2, 1], [3, 1], [3, 2], [3, 3], [4, 3], [4, 4]]);
  var omvMill = omvXY([[0, 5]]);
  var omvBrown = omvXY([[1, 1], [2, 1], [1, 2], [2, 2], [3, 2], [2, 3]]);
  var omvCityWater = omvXY([[1, 0], [1, 1], [2, 1], [2, 2], [2, 3], [4, 5]]).concat(omvMill);
  var omvCityFoul = omvXY([[3, 0], [4, 0], [4, 1]]);
  /* The second five districts were measured the same way as the first: each
   * shape was run through omvPlan/omvBands, and the slack was tuned until the
   * clear line sits a little closer to the plan than the district before it. */
  var omvPond = omvXY([[2, 0], [2, 1], [3, 1], [3, 2], [1, 4], [1, 5], [0, 5]]);
  var omvPondFoul = omvXY([[4, 2], [4, 3]]);
  var omvFoundryWater = omvXY([[0, 4], [0, 5], [5, 0], [5, 1]]);
  var omvFoundryFoul = omvXY([[1, 1], [2, 1], [3, 1], [2, 2], [3, 2], [3, 3], [4, 2]]);
  var omvLakes = omvXY([[1, 0], [1, 1], [0, 1], [5, 5], [4, 5]]);
  var omvLakesFoul = omvXY([[2, 4], [2, 5], [3, 1]]);
  var omvDocks = omvXY([[0, 0], [0, 1], [1, 0], [1, 1], [2, 4], [2, 5], [3, 4], [3, 5]]);
  var omvDocksFoul = omvXY([[4, 1], [4, 2], [4, 3]]);
  var omvCapitalWater = omvXY([[2, 0], [2, 1], [3, 1], [3, 2], [5, 4], [5, 5], [0, 2]]);
  var omvCapitalFoul = omvXY([[1, 2], [2, 2], [3, 2], [4, 3]]);
  var omvCapitalLand = omvXY([[0, 5]]);
  var omvDistricts = [
    omvDistrict("o1", "omvZ1", 0.34),
    omvDistrict("o2", "omvZ2", 0.32, omvRiver),
    omvDistrict("o3", "omvZ3", 0.3, null, omvBrown),
    omvDistrict("o4", "omvZ4", 0.3, omvMill, null, omvMill),
    omvDistrict("o5", "omvZ5", 0.2, omvCityWater, omvCityFoul, omvMill),
    omvDistrict("o6", "omvZ6", 0.16, omvPond, omvPondFoul),
    omvDistrict("o7", "omvZ7", 0.15, omvFoundryWater, omvFoundryFoul),
    omvDistrict("o8", "omvZ8", 0.12, omvLakes, omvLakesFoul),
    omvDistrict("o9", "omvZ9", 0.1, omvDocks, omvDocksFoul),
    omvDistrict("o10", "omvZ10", 0.09, omvCapitalWater, omvCapitalFoul, omvCapitalLand),
  ];

  /* --- grid helpers -------------------------------------------------------- */
  function omvBlank(value) {
    var out = [];
    for (var i = 0; i < omvSide * omvSide; i += 1) { out.push(value); }
    return out;
  }

  function omvFlags(list) {
    var out = omvBlank(false);
    (list || []).forEach(function (n) {
      if (n >= 0 && n < out.length) { out[n] = true; }
    });
    return out;
  }

  function omvFresh(district) {
    var def = district || omvDistricts[0];
    return {
      side: omvSide, level: def.id, cells: omvBlank(null),
      blocked: omvFlags(def.blocked), fouled: omvFlags(def.fouled), heritage: omvFlags(def.heritage),
    };
  }

  /* Exports take either a grid from omvFresh or a bare list of 36 kinds, so the
   * harness can call the scoring function with the simplest thing that works. */
  function omvRead(grid) {
    if (grid && grid.cells && grid.cells.length === omvSide * omvSide) {
      return {
        side: grid.side || omvSide, cells: grid.cells,
        blocked: grid.blocked || omvBlank(false), fouled: grid.fouled || omvBlank(false),
        heritage: grid.heritage || omvBlank(false),
      };
    }
    if (grid && grid.length === omvSide * omvSide) {
      return { side: omvSide, cells: grid, blocked: omvBlank(false), fouled: omvBlank(false), heritage: omvBlank(false) };
    }
    return omvFresh(omvDistricts[0]);
  }

  function omvSteps(ax, ay, bx, by) {
    return Math.abs(ax - bx) + Math.abs(ay - by);
  }

  function omvName(index) {
    return "ABCDEF".charAt(index % omvSide) + String(Math.floor(index / omvSide) + 1);
  }

  function omvNames(list) {
    var out = [];
    list.forEach(function (n) { out.push(omvName(n)); });
    return out.join(", ");
  }

  function omvPick(list, flag) {
    return list.filter(function (item) { return !!item[flag]; });
  }

  function omvTotal(list, field) {
    var out = 0;
    list.forEach(function (item) { out += omvInt(item[field]); });
    return out;
  }

  function omvWhere(list) {
    return list.length ? omvNames(list.map(function (item) { return item.i; })) : "-";
  }

  function omvInt(value) {
    var n = Math.round(Number(value));
    return isFinite(n) ? n : 0;
  }

  function omvSigned(value) {
    var n = omvInt(value);
    return n > 0 ? "+" + n : String(n);
  }

  /* omvInt turns garbage into 0, which is a legal lot, so coordinates get their
   * own reader that answers -1 - never a plausible index - to anything off the
   * board. */
  function omvCoord(value) {
    var n = Math.round(Number(value));
    return isFinite(n) ? n : -1;
  }

  /* A worksite fouls the four lots it fronts, and foul ground stays foul, so
   * one pass over the board answers "is this cell dirty" for everything else. */
  function omvFoulMap(g) {
    var foul = g.fouled.slice();
    for (var i = 0; i < g.cells.length; i += 1) {
      if (g.cells[i] !== omvWork) {
        continue;
      }
      var x = i % g.side;
      var y = Math.floor(i / g.side);
      if (x > 0) { foul[i - 1] = true; }
      if (x < g.side - 1) { foul[i + 1] = true; }
      if (y > 0) { foul[i - g.side] = true; }
      if (y < g.side - 1) { foul[i + g.side] = true; }
    }
    return foul;
  }

  /* A listed landmark keeps its own lot and bans worksites within two streets
   * of it, so the heritage corner is read as a shape, not remembered. */
  function omvWorkBanned(g, index) {
    var x = index % g.side;
    var y = Math.floor(index / g.side);
    for (var i = 0; i < g.heritage.length; i += 1) {
      if (g.heritage[i] && omvSteps(x, y, i % g.side, Math.floor(i / g.side)) <= omvHeritageBan) {
        return true;
      }
    }
    return false;
  }

  function omvLegal(g, kind, x, y) {
    x = omvCoord(x);
    y = omvCoord(y);
    if (x < 0 || y < 0 || x >= g.side || y >= g.side) {
      return "off";
    }
    if (!kind || !omvSpecies[kind]) {
      return "bad";
    }
    var index = y * g.side + x;
    if (g.blocked[index]) {
      return g.heritage[index] ? "land" : "water";
    }
    if (g.cells[index]) {
      return "taken";
    }
    return kind === omvWork && omvWorkBanned(g, index) ? "banned" : "ok";
  }

  function omvPlace(grid, kind, x, y) {
    var g = omvRead(grid);
    var cx = omvCoord(x);
    var cy = omvCoord(y);
    if (omvLegal(g, kind, cx, cy) !== "ok") {
      return null;
    }
    var next = {
      side: g.side, level: grid && grid.level ? grid.level : "", cells: g.cells.slice(),
      blocked: g.blocked, fouled: g.fouled, heritage: g.heritage,
    };
    next.cells[cy * g.side + cx] = kind;
    return next;
  }

  /* --- the transparent score ---------------------------------------------- */
  /* Every match the ledger prints is "the nearest lot of that kind with a free
   * place, ties settled by reading order" - a rule a player can run by hand. */
  function omvNearest(from, pool, reach, freeField) {
    var best = null;
    var bestSteps = reach + 1;
    pool.forEach(function (item) {
      var steps = omvSteps(from.x, from.y, item.x, item.y);
      if (item[freeField] <= 0 || steps > reach) {
        return;
      }
      if (!best || steps < bestSteps || (steps === bestSteps && item.i < best.i)) {
        best = item;
        bestSteps = steps;
      }
    });
    return best;
  }

  function omvMatch(homes, works, reachOf) {
    works.forEach(function (work) { work.left = omvWorkPlaces; });
    var out = {};
    homes.forEach(function (home) {
      var work = omvNearest(home, works, reachOf(home), "left");
      if (work) {
        work.left -= 1;
        out[home.i] = work.i;
      }
    });
    return out;
  }

  function omvAnalyze(grid) {
    var g = omvRead(grid);
    var foul = omvFoulMap(g);
    var buckets = {};
    omvRoster.forEach(function (name) { buckets[name] = []; });
    for (var i = 0; i < g.cells.length; i += 1) {
      var kind = g.cells[i];
      if (buckets[kind]) {
        buckets[kind].push({ i: i, x: i % g.side, y: Math.floor(i / g.side), kind: kind });
      }
    }
    var homes = buckets[omvHome], works = buckets[omvWork], taps = buckets[omvTap];
    var stops = buckets[omvStop], greens = buckets[omvGreen];

    var staffers = homes.concat(stops);
    taps.forEach(function (tap) {
      tap.staffed = staffers.some(function (h) { return omvSteps(tap.x, tap.y, h.x, h.y) <= omvStaffReach; });
      tap.clean = !foul[tap.i];
      tap.left = tap.staffed && tap.clean ? omvTapServes : 0;
      tap.serves = [];
      /* A tap that nobody staffs, or that stands on foul ground, earns nothing
       * and waters nobody - the lot is spent either way. */
      tap.value = tap.staffed && tap.clean ? omvPay.tap : omvPay.idle;
    });

    homes.forEach(function (home) {
      var tap = omvNearest(home, taps, omvWaterReach, "left");
      if (!tap) {
        home.thirsty = true;
        return;
      }
      tap.left -= 1;
      tap.serves.push(home.i);
      home.tap = tap.i;
      home.watered = true;
    });

    var base = omvMatch(homes, works, function () { return omvJobReach; });
    stops.forEach(function (stop) {
      stop.left = omvStopServes;
      stop.serves = [];
      stop.credit = 0;
      stop.value = 0;
    });
    homes.forEach(function (home) {
      if (base[home.i] != null) {
        return;
      }
      var stop = omvNearest(home, stops, omvStopHelp, "left");
      if (stop) {
        stop.left -= 1;
        stop.serves.push(home.i);
        home.stop = stop.i;
      }
    });
    var jobs = omvMatch(homes, works, function (home) { return home.stop == null ? omvJobReach : omvStopReach; });

    var stopBy = {};
    stops.forEach(function (stop) { stopBy[stop.i] = stop; });
    homes.forEach(function (home) {
      home.work = jobs[home.i] == null ? null : jobs[home.i];
      home.employed = home.work != null;
      home.jobless = !home.employed;
      home.fouled = !!foul[home.i];
      /* A stop is only paid when the walk it opened is the reason this home
       * works: jobless at three streets, employed at five. */
      if (home.employed && base[home.i] == null && home.stop != null && stopBy[home.stop]) {
        stopBy[home.stop].credit += 1;
      }
      home.value = omvPay.roof + (home.watered ? omvPay.water : omvPay.thirst) +
        (home.employed ? omvPay.job : omvPay.jobless) + (home.fouled ? omvPay.foulHome : 0);
    });
    stops.forEach(function (stop) { stop.value = omvPay.stop * stop.credit; });
    works.forEach(function (work) {
      work.workers = homes.filter(function (home) { return home.work === work.i; });
      work.value = work.workers.length ? omvPay.work : omvPay.empty;
    });
    greens.forEach(function (green) {
      green.clean = !foul[green.i];
      green.near = homes.filter(function (home) { return omvSteps(home.x, home.y, green.x, green.y) === 1; });
      green.paid = green.clean ? Math.min(omvGreenPays, green.near.length) : 0;
      green.barren = green.paid === 0;
      green.value = omvPay.green * green.paid;
    });

    var all = homes.concat(works, taps, stops, greens);
    var wet = omvPick(homes, "watered");
    var dry = omvPick(homes, "thirsty");
    var held = omvPick(homes, "employed");
    var workless = omvPick(homes, "jobless");
    var fouledHomes = omvPick(homes, "fouled");
    var feeding = taps.filter(function (tap) { return tap.serves.length > 0; });
    var running = taps.filter(function (tap) { return tap.staffed && tap.clean; });
    var unstaffed = taps.filter(function (tap) { return !tap.staffed; });
    var fouledTaps = taps.filter(function (tap) { return tap.staffed && !tap.clean; });
    var manned = works.filter(function (work) { return work.workers.length > 0; });
    var emptyWorks = works.filter(function (work) { return work.workers.length === 0; });
    var earning = omvPick(stops, "credit");
    var owed = omvTotal(earning, "credit");
    var paidGreens = omvPick(greens, "paid");
    var frontages = omvTotal(paidGreens, "paid");
    var barrenGreens = omvPick(greens, "barren");

    /* One line per component, and every component prints its own count, its
     * own rate and its own sum, so the ledger and the arithmetic agree. */
    var terms = [];
    function term(key, count, each, extra, info) {
      if (!count) {
        return;
      }
      var params = extra || {};
      params.n = count;
      params.e = each;
      params.s = omvInt(each * count);
      terms.push({ key: key, count: count, each: each, sum: params.s, params: params, info: !!info });
    }

    term("omvLdRoofs", homes.length, omvPay.roof);
    term("omvLdWater", wet.length, omvPay.water, { h: homes.length, m: feeding.length, where: omvWhere(feeding), r: omvWaterReach });
    term("omvLdThirst", dry.length, omvPay.thirst, { where: omvWhere(dry), r: omvWaterReach });
    term("omvLdJobs", held.length, omvPay.job, { h: homes.length, r: omvJobReach });
    term("omvLdJobless", workless.length, omvPay.jobless, { where: omvWhere(workless), r: omvJobReach });
    term("omvLdFoul", fouledHomes.length, omvPay.foulHome, { where: omvWhere(fouledHomes) });
    term("omvLdTaps", running.length, omvPay.tap, { t: taps.length, c: omvTapServes });
    term("omvLdIdle", unstaffed.length, omvPay.idle, { where: omvWhere(unstaffed), r: omvStaffReach });
    term("omvLdDirty", fouledTaps.length, omvPay.idle, { where: omvWhere(fouledTaps) });
    term("omvLdWorks", manned.length, omvPay.work, { w: works.length, c: omvWorkPlaces });
    term("omvLdEmpty", emptyWorks.length, omvPay.empty, { where: omvWhere(emptyWorks) });
    term("omvLdStops", owed, omvPay.stop, { m: earning.length, where: omvWhere(earning), r: omvStopReach, p: omvJobReach });
    term("omvLdGreens", frontages, omvPay.green, { m: paidGreens.length, c: omvGreenPays });
    term("omvLdBarren", barrenGreens.length, 0, { where: omvWhere(barrenGreens) }, true);

    return {
      total: omvTotal(terms, "sum"), terms: terms, all: all, foul: foul, side: g.side, built: all.length,
      homes: homes, works: works, taps: taps, stops: stops, greens: greens,
      counts: {
        homes: homes.length, watered: wet.length, employed: held.length,
        jobless: workless.length, idle: unstaffed.length, barren: barrenGreens.length,
      },
    };
  }

  function omvScore(grid) {
    return omvAnalyze(grid).total;
  }

  /* A shortfall needs a name, not a number: the deepest hole in the ledger. */
  function omvWorstNeed(analysis) {
    var worst = null;
    analysis.terms.forEach(function (item) {
      if (!item.info && item.sum < 0 && (!worst || item.sum < worst.sum)) {
        worst = item;
      }
    });
    return worst ? t(worst.key, worst.params) : t("omvNoNeed");
  }

  function omvTermBy(analysis) {
    var out = {};
    analysis.terms.forEach(function (item) { out[item.key] = item; });
    return out;
  }

  /* --- preview: what a placement would change, in words before the click ---- */
  function omvPreview(grid, kind, x, y) {
    var g = omvRead(grid);
    var why = omvLegal(g, kind, x, y);
    var index = omvCoord(y) * g.side + omvCoord(x);
    var where = omvName(Math.max(0, Math.min(g.cells.length - 1, index)));
    if (why !== "ok") {
      return { ok: false, why: why, delta: 0, total: omvScore(g), lines: [omvWhyText(why, where)] };
    }
    var before = omvAnalyze(g);
    var after = omvAnalyze(omvPlace(g, kind, x, y));
    var was = omvTermBy(before);
    var now = omvTermBy(after);
    var keys = [];
    before.terms.concat(after.terms).forEach(function (item) {
      if (keys.indexOf(item.key) === -1) { keys.push(item.key); }
    });
    /* Every changed component is printed with its own new sentence, so the
     * deltas shown add up to the headline number by construction. */
    var lines = keys.map(function (key) {
      var a = was[key];
      var b = now[key];
      var shown = b || a;
      var from = a ? a.sum : 0;
      var to = b ? b.sum : 0;
      return from === to && !shown.info ? null : omvSigned(to - from) + " " + t(shown.key, shown.params);
    }).filter(function (line) {
      return !!line;
    });
    var placed = null;
    after.all.forEach(function (building) {
      if (building.i === index) { placed = building; }
    });
    lines.unshift(t("omvPreviewHead", {
      name: t(omvSpecies[kind].key), where: where, here: omvSigned(placed ? placed.value : 0),
      sign: omvSigned(after.total - before.total), total: omvInt(after.total),
    }));
    return {
      ok: true, why: "ok", lines: lines,
      delta: omvInt(after.total - before.total), total: omvInt(after.total),
      value: placed ? omvInt(placed.value) : 0,
    };
  }

  var omvWhyKeys = {
    off: "omvNoOff", taken: "omvNoTaken", water: "omvNoWater",
    land: "omvNoLand", banned: "omvNoBanned", bad: "omvNoBad",
  };

  function omvWhyText(why, where) {
    return t(omvWhyKeys[why] || "omvNoBad", { where: where || "-" });
  }

  /* --- the measured plan: greedy, then seeded restarts --------------------- */
  function omvRandom(seed) {
    var state = seed % 2147483647;
    if (state <= 0) {
      state += 2147483646;
    }
    return function () {
      state = (state * 16807) % 2147483647;
      return (state - 1) / 2147483646;
    };
  }

  /* The plan plays the exported scoring function against itself: every legal
   * blueprint on every lot is tried, the best is kept, and a restart widens the
   * tie pool so a first-place-only greedy cannot hide a better line. */
  function omvGreedy(district, seed, slack) {
    var rng = omvRandom(seed || 1);
    var room = omvInt(slack || 0);
    var grid = omvFresh(district);
    var moves = [];
    var turns = district.turns || 10;
    for (var turn = 0; turn < turns; turn += 1) {
      var tried = [];
      var top = null;
      for (var k = 0; k < omvRoster.length; k += 1) {
        var kind = omvRoster[k];
        for (var y = 0; y < omvSide; y += 1) {
          for (var x = 0; x < omvSide; x += 1) {
            if (omvLegal(grid, kind, x, y) !== "ok") {
              continue;
            }
            var gain = omvScore(omvPlace(grid, kind, x, y));
            tried.push({ kind: kind, x: x, y: y, gain: gain });
            if (top === null || gain > top.gain) {
              top = { kind: kind, x: x, y: y, gain: gain };
            }
          }
        }
      }
      if (!top) {
        break;
      }
      var choices = tried.filter(function (item) { return item.gain >= top.gain - room; });
      var pick = choices[Math.floor(rng() * choices.length) % choices.length];
      grid = omvPlace(grid, pick.kind, pick.x, pick.y);
      moves.push({ kind: pick.kind, x: pick.x, y: pick.y, gain: pick.gain });
    }
    return { score: omvScore(grid), moves: moves, grid: grid };
  }

  function omvPlan(district) {
    var def = district || omvDistricts[0];
    var passes = [[1, 0], [7, 2], [13, 4], [29, 1]];
    var best = null;
    var log = [];
    passes.forEach(function (pass) {
      var run = omvGreedy(def, pass[0], pass[1]);
      log.push(run.score);
      if (!best || run.score > best.score) {
        best = run;
      }
    });
    return {
      score: best ? best.score : 0, moves: best ? best.moves : [],
      grid: best ? best.grid : omvFresh(def), passes: passes.length, log: log,
    };
  }

  /* Three stars is the plan. The clear line sits `slack` below it and the middle
   * band halves the gap, so the bands travel with the measurement. */
  function omvBands(planScore, slack) {
    var three = omvInt(planScore);
    var one = Math.max(1, three - Math.max(3, Math.round(three * (slack || 0.3))));
    var two = Math.min(three - 1, Math.max(one + 1, one + Math.round((three - one) / 2)));
    return [three, two, one];
  }

  function omvBeatable(district) {
    var def = district || omvDistricts[0];
    var plan = omvPlan(def);
    var bands = omvBands(plan.score, def.slack);
    var played = plan.moves.length;
    return {
      ok: plan.score > 0 && played === (def.turns || 10) && bands[0] === plan.score &&
        bands[0] > bands[1] && bands[1] > bands[2] && bands[2] >= 1,
      plan: plan.score, target: bands[2], bands: bands, turns: played, moves: plan.moves,
    };
  }

  /* Proof runs at load, for all ten districts, through the exported scorer. */
  function omvProveAll() {
    var results = [];
    var allOk = true;
    omvDistricts.forEach(function (def) {
      var proof = omvBeatable(def);
      def.stars = proof.bands;
      def.plan = proof.plan;
      def.proof = proof;
      allOk = allOk && proof.ok;
      results.push({
        id: def.id, ok: proof.ok, plan: proof.plan, target: proof.target,
        bands: proof.bands, turns: proof.turns,
      });
    });
    return { ok: allOk, districts: results };
  }

  var omvProof = omvProveAll();

  /* --- panel ------------------------------------------------------------- */
  function initOneMinuteMayorGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "one-minute-mayor-campaign", levels: omvDistricts });
    var level = omvDistricts[Math.max(0, campaign.indexOf(campaign.nextLevelId()))] || omvDistricts[0];
    var grid = omvFresh(level);
    var analysis = omvAnalyze(grid);
    var moves = [];
    var turn = 0;
    var kind = omvHome;
    var cursor = { x: 2, y: 2 };
    var settled = false;
    var preview = null;

    function el(tag, className, key, text) {
      var node = document.createElement(tag);
      if (className) {
        node.className = className;
      }
      if (key) {
        node.setAttribute("data-i18n", key);
        node.textContent = text != null ? text : t(key);
      } else if (text != null) {
        node.textContent = text;
      }
      return node;
    }

    function into(parent) {
      for (var i = 1; i < arguments.length; i += 1) {
        parent.appendChild(arguments[i]);
      }
      return parent;
    }

    /* Literal text (lot names, glyphs, running totals) never goes through the
     * i18n hook, so it lives in its own builder. */
    function label(className, text) {
      return el("span", className, null, text);
    }

    function button(className) {
      var node = el("button", className);
      node.type = "button";
      return node;
    }

    function stat(key, valueEl) {
      return into(el("div", "game-stat"), el("span", null, key), valueEl);
    }

    var turnEl = el("strong");
    var scoreEl = el("strong");
    var goalEl = el("strong");
    var handEl = el("strong");
    var hud = into(
      el("div", "game-hud"),
      stat("omvTurnLabel", turnEl), stat("omvScoreLabel", scoreEl),
      stat("omvGoalLabel", goalEl), stat("omvHandLabel", handEl),
    );

    var board = el("div", "omv-board");
    board.setAttribute("role", "group");
    board.setAttribute("aria-label", t("omvFieldLabel"));

    var tools = into(el("div", "omv-tools"), el("span", "omv-tools-label", "omvToolsLabel"));
    var blueprintBtns = omvRoster.map(function (name) {
      var btn = into(
        button("omv-blue"),
        label("omv-blue-glyph", omvSpecies[name].glyph),
        el("span", "omv-blue-name", omvSpecies[name].key),
        el("span", "omv-blue-rule", omvSpecies[name].ruleKey),
      );
      btn.addEventListener("click", function () {
        chooseType(name);
      });
      tools.appendChild(btn);
      return btn;
    });
    var undoBtn = into(button("omv-undo"), el("span", null, "omvBtnUndo"));
    undoBtn.addEventListener("click", undo);
    tools.appendChild(undoBtn);

    var needsLine = el("p", "omv-line omv-needs");
    var previewLine = el("p", "omv-line omv-preview");
    var linesBox = el("div", "omv-lines");
    var totalLine = el("p", "omv-line omv-total");
    var ledger = into(el("div", "omv-ledger"), el("p", "omv-ledger-head", "omvLedgerLabel"), needsLine, previewLine, linesBox, totalLine);

    var result = el("p", "game-result");
    result.setAttribute("role", "status");

    var districtLabel = el("label", "elements-label", "omvDistrictSelectLabel");
    districtLabel.setAttribute("for", "omvDistrictSel");
    var districtSel = el("select", "elements-select");
    districtSel.id = "omvDistrictSel";
    var districtRow = into(el("div", "elements-row"), districtLabel, districtSel);

    var againBtn = into(button("primary"), into(el("span", "button-content"), el("span", null, "omvBtnAgain")));
    var bestEl = el("p", "game-best");
    var actions = into(el("div", "game-actions"), againBtn, bestEl);
    var hint = el("p", "game-hint", "omvHint");

    into(panelEl, hud, board, tools, ledger, result, districtRow, actions, hint);

    function terrainMark(index) {
      if (grid.heritage[index]) { return "\u25c6"; }
      if (grid.blocked[index]) { return "\u2248"; }
      return analysis.foul[index] && !grid.cells[index] ? "\u2020" : "\u00b7";
    }

    function cellLabel(index, building, value) {
      var where = omvName(index);
      if (building) {
        return t("omvCellBuilt", { where: where, name: t(omvSpecies[building].key), s: omvSigned(omvInt(value)) });
      }
      if (grid.heritage[index]) { return t("omvCellLand", { where: where }); }
      if (grid.blocked[index]) { return t("omvCellWater", { where: where }); }
      return analysis.foul[index] ? t("omvCellFoul", { where: where }) : t("omvCellLot", { where: where });
    }

    function valueAt(index) {
      var out = 0;
      analysis.all.forEach(function (building) {
        if (building.i === index) { out = omvInt(building.value); }
      });
      return out;
    }

    function renderBoard() {
      board.textContent = "";
      for (var index = 0; index < grid.cells.length; index += 1) {
        var building = grid.cells[index];
        var isCursor = index === cursor.y * omvSide + cursor.x;
        var open = !grid.blocked[index] && !grid.heritage[index];
        var cell = button(
          "omv-cell" +
          (building ? " " + omvSpecies[building].css : "") +
          (grid.blocked[index] ? " is-blocked" : "") +
          (grid.heritage[index] ? " is-land" : "") +
          (open && analysis.foul[index] ? " is-foul" : "") +
          (isCursor ? " is-cursor" : ""),
        );
        cell.tabIndex = isCursor ? 0 : -1;
        cell.omvIndex = index;
        cell.setAttribute("aria-label", cellLabel(index, building, valueAt(index)));
        cell.appendChild(label("omv-cell-tag", omvName(index)));
        cell.appendChild(label("omv-cell-mark", building ? omvSpecies[building].glyph : terrainMark(index)));
        cell.appendChild(label("omv-cell-num", building ? omvSigned(valueAt(index)) : ""));
        board.appendChild(cell);
      }
    }

    /* One delegated pair for the plate, so a rebuild never leaves a listener on
     * a detached cell: the lot answers from the index it carries. */
    function cellFromEvent(event) {
      var node = event.target && event.target.closest ? event.target.closest(".omv-cell") : null;
      return node && typeof node.omvIndex === "number" ? node.omvIndex : -1;
    }

    board.addEventListener("click", function (event) {
      var at = cellFromEvent(event);
      if (at < 0) {
        return;
      }
      cursor = { x: at % omvSide, y: Math.floor(at / omvSide) };
      place(cursor.x, cursor.y);
    });

    board.addEventListener("pointermove", function (event) {
      var at = cellFromEvent(event);
      if (at < 0 || at === cursor.y * omvSide + cursor.x) {
        return;
      }
      cursor = { x: at % omvSide, y: Math.floor(at / omvSide) };
      if (!settled) {
        preview = omvPreview(grid, kind, cursor.x, cursor.y);
      }
      render();
    });

    function renderTools() {
      blueprintBtns.forEach(function (btn, index) {
        var name = omvRoster[index];
        var on = name === kind;
        btn.className = "omv-blue" + (on ? " is-on" : "");
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.setAttribute("aria-label", t("omvBlueAria", { n: index + 1, name: t(omvSpecies[name].key) }));
        btn.disabled = settled;
      });
      undoBtn.disabled = settled || !moves.length;
      undoBtn.setAttribute("aria-label", t("omvUndoAria", { n: moves.length }));
    }

    function renderHud() {
      turnEl.textContent = t("omvTurnValue", { n: turn, max: level.turns });
      scoreEl.textContent = t("omvScoreValue", { n: omvInt(analysis.total) });
      goalEl.textContent = t("omvGoalValue", { n: level.stars[2], high: level.stars[0] });
      handEl.textContent = settled ? t("omvHandShut") : t(omvSpecies[kind].key);
    }

    function renderLedger() {
      var c = analysis.counts;
      needsLine.textContent = t("omvLdNeeds", {
        homes: c.homes, watered: c.watered, employed: c.employed,
        jobless: c.jobless, idle: c.idle, barren: c.barren,
      });
      linesBox.textContent = "";
      if (!analysis.built) {
        linesBox.appendChild(el("p", "omv-line is-quiet", "omvLdEmpty0"));
      } else {
        analysis.terms.forEach(function (item) {
          var line = el("p", "omv-line" + (item.info ? " is-quiet" : ""));
          line.appendChild(label("omv-line-text", t(item.key, item.params)));
          line.appendChild(label("omv-line-sum", omvSigned(item.sum)));
          linesBox.appendChild(line);
        });
      }
      totalLine.textContent = t("omvLdTotal", { n: omvInt(analysis.total) });
      previewLine.textContent = preview && preview.lines.length
        ? preview.lines.join(" \u00b7 ")
        : settled
          ? t("omvPreviewShut")
          : t("omvPreviewNone", { name: t(omvSpecies[kind].key), where: omvName(cursor.y * omvSide + cursor.x) });
    }

    function refreshPicker() {
      fillCampaignPicker(districtSel, campaign, function (def) { return t(def.labelKey); }, t("elementsLocked"));
      districtSel.value = level.id;
      bestEl.textContent = t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() });
    }

    function chooseType(name) {
      if (settled || !omvSpecies[name]) {
        return;
      }
      kind = name;
      preview = omvPreview(grid, kind, cursor.x, cursor.y);
      render();
    }

    /* The cursor hops to the next lot the blueprint can still use, so the
     * preview under the ledger never points at the lot just built. */
    function nextLot(from) {
      var total = grid.cells.length;
      for (var step = 1; step <= total; step += 1) {
        var n = (from + step) % total;
        if (omvLegal(grid, kind, n % omvSide, Math.floor(n / omvSide)) === "ok") {
          return n;
        }
      }
      return -1;
    }

    function place(x, y) {
      if (settled) {
        result.textContent = t("omvShut");
        return;
      }
      var why = omvLegal(grid, kind, x, y);
      if (why !== "ok") {
        result.textContent = omvWhyText(why, omvName(omvCoord(y) * omvSide + omvCoord(x)));
        preview = omvPreview(grid, kind, x, y);
        render();
        return;
      }
      var built = y * omvSide + x;
      grid = omvPlace(grid, kind, x, y);
      moves.push({ kind: kind, x: x, y: y, turn: turn });
      turn += 1;
      analysis = omvAnalyze(grid);
      preview = null;
      if (turn >= level.turns) {
        settle();
      } else {
        result.textContent = t("omvPlaced", {
          name: t(omvSpecies[kind].key), where: omvName(built),
          s: omvSigned(valueAt(built)), left: level.turns - turn,
        });
        var onward = nextLot(built);
        if (onward >= 0) {
          cursor = { x: onward % omvSide, y: Math.floor(onward / omvSide) };
          preview = omvPreview(grid, kind, cursor.x, cursor.y);
        }
      }
      render();
    }

    function undo() {
      if (settled) {
        result.textContent = t("omvShut");
        return;
      }
      var last = moves.pop();
      if (!last) {
        result.textContent = t("omvNothingToUndo");
        preview = omvPreview(grid, kind, cursor.x, cursor.y);
        render();
        return;
      }
      grid.cells[last.y * omvSide + last.x] = null;
      turn = Math.max(0, turn - 1);
      cursor = { x: last.x, y: last.y };
      analysis = omvAnalyze(grid);
      preview = omvPreview(grid, kind, cursor.x, cursor.y);
      result.textContent = t("omvUndone", {
        name: t(omvSpecies[last.kind].key), where: omvName(last.y * omvSide + last.x),
        left: level.turns - turn,
      });
      render();
    }

    function settle() {
      settled = true;
      preview = null;
      var score = omvInt(analysis.total);
      var won = starsFor(score, level.stars, "high");
      var outcome = campaign.record(level.id, { stars: won, best: score, better: "high" });
      if (won <= 0) {
        /* The shortfall names the need that went unmet, in the ledger's own words. */
        result.textContent = t("omvShort", {
          n: score, need: level.stars[2], gap: omvInt(level.stars[2] - score), why: omvWorstNeed(analysis),
        });
        return;
      }
      var message = t("omvWin", { n: score, s: won, plan: omvInt(level.plan) });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("omvNextDistrict");
      } else if (campaign.clearedCount() === omvDistricts.length) {
        message += " " + t("omvCampaignDone");
      }
      result.textContent = message;
      logAction(t("logOneMinuteMayor", { n: score }));
      var rect = againBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function loadDistrict(def) {
      level = def;
      grid = omvFresh(def);
      analysis = omvAnalyze(grid);
      moves = [];
      turn = 0;
      kind = omvHome;
      cursor = { x: 2, y: 2 };
      settled = false;
      preview = omvPreview(grid, kind, cursor.x, cursor.y);
      var proof = def.proof || omvBeatable(def);
      result.textContent = proof.ok
        ? t("omvPrompt", {
            name: t(def.labelKey), n: def.turns, plan: omvInt(proof.plan),
            need: def.stars[2], mid: def.stars[1], high: def.stars[0],
          })
        : t("omvUnproven", { name: t(def.labelKey) });
      render();
      refreshPicker();
    }

    function render() {
      renderHud();
      renderBoard();
      renderTools();
      renderLedger();
    }

    var omvKeys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

    function onKeys(event) {
      var key = event.key;
      var step = omvKeys[key];
      if (step) {
        event.preventDefault();
        cursor = {
          x: Math.max(0, Math.min(omvSide - 1, cursor.x + step[0])),
          y: Math.max(0, Math.min(omvSide - 1, cursor.y + step[1])),
        };
        if (!settled) {
          preview = omvPreview(grid, kind, cursor.x, cursor.y);
        }
        render();
        var focus = board.querySelector(".omv-cell.is-cursor");
        if (focus && typeof focus.focus === "function") {
          focus.focus();
        }
        return;
      }
      if (key >= "1" && key <= "5") {
        event.preventDefault();
        chooseType(omvRoster[Number(key) - 1]);
        return;
      }
      if (key === "u" || key === "U" || key === "z" || key === "Z" || key === "Backspace") {
        event.preventDefault();
        undo();
        return;
      }
      if (key === "Enter" || key === " ") {
        /* A focused cell button activates natively, so only the board itself
         * has to place the lot under the cursor. */
        if (String((event.target && event.target.className) || "").indexOf("omv-cell") !== -1) {
          return;
        }
        event.preventDefault();
        place(cursor.x, cursor.y);
      }
    }

    board.addEventListener("keydown", onKeys);
    tools.addEventListener("keydown", onKeys);
    againBtn.addEventListener("click", function () {
      loadDistrict(level);
    });

    districtSel.addEventListener("change", function () {
      var index = campaign.indexOf(districtSel.value);
      if (index >= 0 && campaign.isUnlocked(districtSel.value)) {
        loadDistrict(omvDistricts[index]);
        return;
      }
      districtSel.value = level.id;
      result.textContent = t("omvLockedDistrict");
    });

    /* The ledger is the plan on paper, so a pause only repaints it. */
    App.quietResetOneMinuteMayor = function () {
      render();
    };

    loadDistrict(level);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabOneMinuteMayor": "One-Minute Mayor",
      "omvZ1": "Open Land",
      "omvZ2": "River Bend",
      "omvZ3": "Brownfield",
      "omvZ4": "Heritage Corner",
      "omvZ5": "The Full City",
      "omvZ6": "Mill Pond",
      "omvZ7": "Foundry Flats",
      "omvZ8": "Twin Lakes",
      "omvZ9": "Dock Quarter",
      "omvZ10": "The Old Capital",
      "omvTurnLabel": "Placements",
      "omvScoreLabel": "District",
      "omvGoalLabel": "Bands",
      "omvHandLabel": "In hand",
      "omvDistrictSelectLabel": "District",
      "omvTurnValue": "{n}/{max}",
      "omvScoreValue": "{n} pts",
      "omvGoalValue": "{n}-{high}",
      "omvHandShut": "ledger closed",
      "omvHome": "Home",
      "omvWork": "Worksite",
      "omvTap": "Water tap",
      "omvStop": "Transit stop",
      "omvGreen": "Green space",
      "omvHomeRule": "2 for standing, 3 more with water within 2, 4 more with work within 3 (5 with a stop), -1 thirsty, -2 jobless, -2 if the lot is fouled",
      "omvWorkRule": "3 with workers else -2; employs 2 homes within reach; fouls the four lots it fronts",
      "omvTapRule": "1 if staffed by a home or stop within 2 else -1; waters 3 homes within 2; -1 and no water on a fouled lot",
      "omvStopRule": "2 per home it lifts from a 3-street walk to a 5-street one, up to 2; worth nothing alone",
      "omvGreenRule": "4 per home beside it up to 2; pays 0 if the lot is fouled or a worksite fronts it",
      "omvBtnAgain": "New District",
      "omvBtnUndo": "Undo last",
      "omvToolsLabel": "Blueprints",
      "omvFieldLabel": "Town grid, six by six: lot letters are printed in each cell, arrow keys move the cursor, 1 to 5 pick a blueprint, Enter or a click builds, u undoes",
      "omvCellBuilt": "{where}, {name} worth {s}",
      "omvCellLand": "{where}, listed landmark - nothing builds here and no worksite within 2 streets",
      "omvCellWater": "{where}, water, nothing builds here",
      "omvCellFoul": "{where}, fouled lot",
      "omvCellLot": "{where}, open lot",
      "omvBlueAria": "Blueprint {n}: {name}",
      "omvUndoAria": "Undo last placement, {n} placed so far",
      "omvLedgerLabel": "Ledger - every point in words and digits",
      "omvLdNeeds": "housed {homes} - {watered} watered - {employed} employed - {jobless} jobless - {idle} idle taps - {barren} quiet greens",
      "omvLdEmpty0": "Nothing built yet, so the ledger reads 0.",
      "omvLdRoofs": "{n} homes standing x {e} = {s}",
      "omvLdWater": "{n} of {h} homes watered x {e} = {s}: fed by the taps at {where}",
      "omvLdThirst": "{n} thirsty x {e} = {s}: no running tap within {r} streets of {where}",
      "omvLdJobs": "{n} of {h} homes employed x {e} = {s}",
      "omvLdJobless": "{n} jobless x {e} = {s}: no work within reach of {where}",
      "omvLdFoul": "{n} homes on fouled ground x {e} = {s}: {where}",
      "omvLdTaps": "{n} of {t} taps running x {e} = {s}: each can water {c} homes",
      "omvLdIdle": "{n} idle taps x {e} = {s}: nothing within {r} to staff {where}",
      "omvLdDirty": "{n} taps on fouled ground x {e} = {s}: {where} waters nobody",
      "omvLdWorks": "{n} of {w} worksites staffed x {e} = {s}: {c} places each",
      "omvLdEmpty": "{n} empty worksites x {e} = {s}: {where} hires nobody and still fouls its ring",
      "omvLdStops": "{n} homes found work through {m} stops x {e} = {s}: {where} stretched a {p}-street walk to {r}",
      "omvLdGreens": "{n} home frontages from {m} greens x {e} = {s}: up to {c} homes each",
      "omvLdBarren": "{n} greens pay nothing: {where} is fouled or has no home beside it",
      "omvLdTotal": "District reads {n} points",
      "omvPreviewNone": "Point the cursor at a lot to preview {name} there; {where} is under the cursor.",
      "omvPreviewShut": "The ledger is closed - every line above is final.",
      "omvPreviewHead": "If {name} goes at {where}: {sign} points, the new lot itself is {here}, the district would read {total}.",
      "omvNoOff": "That is outside the town.",
      "omvNoTaken": "Something is already built at {where}.",
      "omvNoWater": "{where} is water - only dry lots take a blueprint.",
      "omvNoLand": "{where} is the listed landmark - the town keeps it open.",
      "omvNoBanned": "No worksite at {where}: the listed landmark is too close.",
      "omvNoBad": "That blueprint does not exist.",
      "omvPlaced": "{name} built at {where}; the ledger re-read. {left} placements left.",
      "omvUndone": "Took the {name} back off {where}. {left} placements left.",
      "omvNothingToUndo": "Nothing built yet, so there is nothing to take back.",
      "omvShut": "The ledger has closed - press New District to plan again.",
      "omvPrompt": "{name}: {n} placements. The measured plan reached {plan} points, so {need} clears the district, {mid} is two stars and {high} is three.",
      "omvWin": "The district reads {n} points - {s} stars. The measured plan reached {plan}.",
      "omvShort": "The district reached {n} points and needed {need}, short by {gap}. The unmet need: {why}",
      "omvNoNeed": "no single need went unmet - the town is simply too small, so build more homes and the worksites and taps they need.",
      "omvNextDistrict": "Next district unlocked.",
      "omvCampaignDone": "All ten districts are planned.",
      "omvLockedDistrict": "That district is still sealed - clear the one before it.",
      "omvUnproven": "{name} could not be proven clearable by the measured plan, so it is on hold.",
      "omvHint": "Every blueprint solves one need and opens another: a tap waters three homes but burns the lot a worksite wanted, a worksite employs two homes and fouls the four it fronts, and a stop pays only for a home that had no job within three streets. Nothing is random - rerun a district and it is dealt the same.",
      "logOneMinuteMayor": "Ran the town to {n} points",
    },
    zh: {
      "tabOneMinuteMayor": "一分钟市长",
      "omvZ1": "空地",
      "omvZ2": "河湾",
      "omvZ3": "棕地",
      "omvZ4": "老城角",
      "omvZ5": "整座城",
      "omvZ6": "磨坊水塘",
      "omvZ7": "铸造厂区",
      "omvZ8": "双湖",
      "omvZ9": "码头区",
      "omvZ10": "故都",
      "omvTurnLabel": "放置",
      "omvScoreLabel": "城区",
      "omvGoalLabel": "分档",
      "omvHandLabel": "手上",
      "omvDistrictSelectLabel": "城区",
      "omvTurnValue": "{n}/{max}",
      "omvScoreValue": "{n} 分",
      "omvGoalValue": "{n}-{high}",
      "omvHandShut": "账本已结",
      "omvHome": "住宅",
      "omvWork": "工作地",
      "omvTap": "给水站",
      "omvStop": "公交站",
      "omvGreen": "绿地",
      "omvHomeRule": "建成 2 分；2 格内有有人值守的水站再加 3 分；3 格内有工位在再加 4 分（有公交站则按 5 格算）；没水扣 1，没工作扣 2，地块被污染扣 2",
      "omvWorkRule": "招到人得 3 分，否则扣 2；最多招 2 格内的 2 户人家，并污染它四面紧邻的地块",
      "omvTapRule": "2 格内有住宅或公交站才算有人值守，得 1 分，否则扣 1；能供给 2 格内 3 户；地块被污染则扣 1 且供不了水",
      "omvStopRule": "把某户从 3 格通勤扩到 5 格才计分，每户 2 分、最多 2 户；孤零零一个站不值钱",
      "omvGreenRule": "紧邻每户 4 分、最多算 2 户；地块被污染或旁边没住宅就一分不得",
      "omvBtnAgain": "换个城区",
      "omvBtnUndo": "悔一手",
      "omvToolsLabel": "图纸",
      "omvFieldLabel": "6×6 城区网格：每格都写着地块号，方向键移动光标，1 到 5 选图纸，回车或点击就盖，u 悔手",
      "omvCellBuilt": "{where}，{name}，值 {s}",
      "omvCellLand": "{where}，挂牌老建筑：这里不能盖，两格内也不许盖工作地",
      "omvCellWater": "{where}，水面：不能盖",
      "omvCellFoul": "{where}，被污染的地块",
      "omvCellLot": "{where}，空地",
      "omvBlueAria": "第 {n} 张图纸：{name}",
      "omvUndoAria": "悔掉上一手，已盖 {n} 个",
      "omvLedgerLabel": "账本——每一分都用文字和数字摊开",
      "omvLdNeeds": "住着 {homes} 户 - 通水 {watered} - 就业 {employed} - 失业 {jobless} - 空守水站 {idle} - 不涨分的绿地 {barren}",
      "omvLdEmpty0": "还没盖任何东西，账本读作 0 分。",
      "omvLdRoofs": "{n} 户住宅 × {e} = {s}",
      "omvLdWater": "{h} 户中 {n} 户通水 × {e} = {s}：由 {where} 的给水站供给",
      "omvLdThirst": "{n} 户没水 × {e} = {s}：{where} 的 {r} 格内没有能供水的给水站",
      "omvLdJobs": "{h} 户中 {n} 户就业 × {e} = {s}",
      "omvLdJobless": "{n} 户失业 × {e} = {s}：{where} 通勤范围内没工位",
      "omvLdFoul": "{n} 户住在被污染的地块 × {e} = {s}：{where}",
      "omvLdTaps": "{t} 个水站中 {n} 个在跑 × {e} = {s}：每站能供 {c} 户",
      "omvLdIdle": "{n} 个水站没人值守 × {e} = {s}：{where} 的 {r} 格内没有住宅或公交站",
      "omvLdDirty": "{n} 个水站建在被污染的地块 × {e} = {s}：{where} 供不出水",
      "omvLdWorks": "{w} 个工作地中 {n} 个招到人 × {e} = {s}：各有 {c} 个工位",
      "omvLdEmpty": "{n} 个工作地空着 × {e} = {s}：{where} 没招到人，却照样污染四面",
      "omvLdStops": "{m} 个公交站点亮了 {n} 户 × {e} = {s}：{where} 把 {p} 格的路扩成 {r} 格",
      "omvLdGreens": "{m} 块绿地服务 {n} 户 × {e} = {s}：每块最多算 {c} 户",
      "omvLdBarren": "{n} 块绿地一分不得：{where} 要么被污染，要么旁边没住宅",
      "omvLdTotal": "城区合计 {n} 分",
      "omvPreviewNone": "把光标对准地块就能预览{name}的效果；现在光标在 {where}。",
      "omvPreviewShut": "账本已经结账——上面每一行都是最终数字。",
      "omvPreviewHead": "若在 {where} 盖{name}：{sign} 分，这块本身值 {here}，城区会变成 {total} 分。",
      "omvNoOff": "那在城区之外。",
      "omvNoTaken": "{where} 已经盖过东西了。",
      "omvNoWater": "{where} 是水面——只有旱地能按图纸盖。",
      "omvNoLand": "{where} 是挂牌老建筑——全城替它留着。",
      "omvNoBanned": "{where} 不能盖工作地：离挂牌老建筑太近。",
      "omvNoBad": "没有这张图纸。",
      "omvPlaced": "在 {where} 盖好{name}，这块值 {s}，账本重算。还剩 {left} 手。",
      "omvUndone": "把 {where} 的{name}收回来了。还剩 {left} 手。",
      "omvNothingToUndo": "还没盖任何东西，没什么可悔的。",
      "omvShut": "账本已经结了——按“换个城区”再规划一轮。",
      "omvPrompt": "{name}：共 {n} 手。量出来的规划能到 {plan} 分，所以 {need} 分过关，{mid} 分两星，{high} 分三星。",
      "omvWin": "城区合计 {n} 分 - 获得 {s} 星。实测规划能到 {plan} 分。",
      "omvShort": "城区只有 {n} 分，要 {need} 分才过关，差 {gap} 分。没被满足的需求：{why}",
      "omvNoNeed": "没有哪一项单独拖了后腿——就是城太小，多盖住宅，再补上它们要的水站和工作地。",
      "omvNextDistrict": "解锁下一个城区。",
      "omvCampaignDone": "十个城区都规划完了。",
      "omvLockedDistrict": "这个城区还没开放——先过掉前一个。",
      "omvUnproven": "{name} 没能被实测规划证明可以过关，所以暂缓开放。",
      "omvHint": "每种图纸都解决一个需求、同时制造另一个：一个水站供三户，却占掉工作地要的那块；工作地招两户，却污染四面；公交站只有让 3 格外的人家找到活才值钱。这里没有随机——同一个城区每次都长一个样，重来就能更好。",
      "logOneMinuteMayor": "把城区规划到 {n} 分",
    },
  });

  App.registerGame({
    name: "oneMinuteMayor",
    tabKey: "tabOneMinuteMayor",
    init: initOneMinuteMayorGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M24 6v64M42 6v64M60 6v64M78 6v64M96 6v64M6 24h108M6 42h108M6 60h108" stroke="rgba(148,163,184,.22)"/>' +
        '<path d="M60 10v50" stroke="#38bdf8" stroke-width="5" opacity=".5"/>' +
        '<text x="30" y="38" font-size="11" fill="#a3e635" text-anchor="middle">H</text>' +
        '<text x="30" y="56" font-size="11" fill="#a3e635" text-anchor="middle">H</text>' +
        '<text x="48" y="48" font-size="11" fill="#22d3ee" text-anchor="middle">T</text>' +
        '<text x="72" y="30" font-size="11" fill="#fb7185" text-anchor="middle">W</text>' +
        '<text x="88" y="56" font-size="11" fill="#fbbf24" text-anchor="middle">R</text>' +
        '<text x="14" y="20" font-size="11" fill="#f472b6" text-anchor="middle">G</text>' +
        '<text x="60" y="73" font-size="7" fill="#94a3b8" text-anchor="middle">T+1 -2 W+3 R+2 G+8</text></svg>',
      en: [
        "Aim: build a district whose ledger reaches the target shown in the HUD - three stars is the measured plan.",
        "Action: pick a blueprint with keys 1 to 5 or its button, move the cursor with the arrows, then click or press Enter to build. Ten placements close the ledger.",
        "Rule: a home pays 2 for standing, +3 for water within 2 streets, +4 for a job within 3 (5 with a stop beside it); a tap must be staffed by a home or a stop within 2 or it reads idle.",
        "Watch out: nothing is free. The tap that waters your row sits on the lot a worksite wanted, a worksite employs only two homes and fouls the four lots it fronts, and a green beside a worksite pays nothing.",
        "Undo: keys u, z or Backspace lift the last building off, and the ledger re-reads after every one of your ten placements.",
        "Scoring: the ledger prints every point in words and digits - homes, watered, employed, jobless, idle taps, quiet greens - each with its own sum, and the number in a cell is exactly what that lot contributes.",
      ],
      zh: [
        "目标：把城区的账本刷到 HUD 显示的过关线——三星就是实测规划那条线。",
        "操作：用 1 到 5 或图纸按钮选建筑，方向键移动光标，点击或回车开盖。十手之后账本结账。",
        "规则：住宅建成 2 分，2 格内有水再加 3 分，3 格内有工位再加 4 分（旁边有公交站就按 5 格算）；给水站若 2 格内没有住宅或公交站就是空守，读作“没人值守”。",
        "小心：没有白给的东西。替你那一排住宅供水的水站，正踩在工作地想要的那块地上；工作地只招两户，还污染紧邻四面；贴着工作地的绿地一分不得。",
        "悔手：u、z 或退格键能把上一手取回来，十手里的每一手都会让账本当场重算。",
        "计分：账本把每一分都写成文字加数字——住着几户、通水几户、就业几户、失业几户、几个空守水站、几块不涨分的绿地——每格上的数字就是这块地自己的贡献。",
      ],
    },
  });

  /* Exported for the other modules and for the headless checks: score, preview,
   * place and plan are pure, and the proof is the measurement behind the bands. */
  App.initOneMinuteMayorGame = initOneMinuteMayorGame;
  App.mayorScore = omvScore;
  App.mayorAnalyze = omvAnalyze;
  App.mayorPreview = omvPreview;
  App.mayorPlace = omvPlace;
  App.mayorLegal = omvLegal;
  App.mayorPlan = omvPlan;
  App.mayorBeatable = omvBeatable;
  App.mayorBands = omvBands;
  App.mayorFresh = omvFresh;
  App.mayorProof = omvProof;
  App.mayorDistricts = omvDistricts;
  App.mayorTypes = omvRoster;
  App.mayorPay = omvPay;
  App.mayorSpecies = omvSpecies;
})(window.CapitalConvert = window.CapitalConvert || {});
