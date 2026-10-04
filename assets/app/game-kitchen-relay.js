/* Kitchen Relay - the time-management game in the shared game drawer.
 * Three stations, one pair of hands, a queue of tickets with deadlines.
 * Whatever is on the heat keeps cooking while you serve someone else, so the
 * minute spent rescuing a sauce is a minute the plated dish spends going cold.
 * Registered through the game registry, so it needs no markup in the HTML pages,
 * and the whole service is one deterministic tick (kitchenStep) that the star
 * bands are measured from by replaying a scripted best-play line. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var kchTick = 0.05;      /* the scripted line is written at 20 Hz */
  var kchMaxDt = 0.05;     /* a stalled frame may never fast-forward a service */
  var kchCalmScale = 0.55; /* calm mode slows the whole service, clocks included */
  var kchFlip = 0.03;      /* a single tap on the pan is one turn of the food */
  var kchHearts = 3;
  var kchBurnCost = 5;
  var kchLateCost = 4;

  var kchStations = [
    { id: "board", hot: "1", nameKey: "kchBoardName" },
    { id: "pan", hot: "2", nameKey: "kchPanName" },
    { id: "pass", hot: "3", nameKey: "kchPassName" },
  ];
  var kchStationName = { board: "kchBoardName", pan: "kchPanName", pass: "kchPassName" };

  /* Step kinds. A chop is a press station with no residual heat, a sear or a
   * simmer is a held timing window that keeps creeping on its own, and the
   * plate belongs to the pass - the only thing that stops the clock on a dish. */
  var kchKinds = {
    chop: { station: "board", word: "kchChopWord", held: 0, idle: 0, ok: [0.7, 1], perfect: [0.85, 1] },
    sear: { station: "pan", word: "kchSearWord", held: 0.4, idle: 0.13, ok: [0.72, 1], perfect: [0.86, 1] },
    simmer: { station: "pan", word: "kchSimmerWord", held: 0.2, idle: 0.085, ok: [0.7, 1], perfect: [0.84, 1] },
    plate: { station: "pass", word: "kchPlateWord", held: 0, idle: 0, ok: [1, 1], perfect: [1, 1] },
  };

  /* Four recipes, each a small ordered set of steps. */
  var kchRecipes = {
    garden: { id: "garden", nameKey: "kchRGarden", price: 9, steps: [{ kind: "chop", count: 5 }] },
    fillet: { id: "fillet", nameKey: "kchRFillet", price: 12, steps: [{ kind: "sear" }] },
    duck: { id: "duck", nameKey: "kchRDuck", price: 17, steps: [{ kind: "chop", count: 4 }, { kind: "sear" }, { kind: "simmer" }] },
    sauce: { id: "sauce", nameKey: "kchRSauce", price: 15, steps: [{ kind: "sear" }, { kind: "simmer", idle: 0.1 }] },
  };

  /* Ten services: window, seeded queue, walking cost, rack size and the jam
   * script. The starCovers band is filled in by kchBands from the scripted line,
   * and the chain runs in the order that line measures - 8, 10, 11, 11, 13, 14,
   * 15, 16, 17, 18 covers - so svc3 sits ahead of svc2 because it covers less,
   * not because of the number in its id. Every service keeps the same 120 second
   * window and the same two-place rack, so the ticket count is also the
   * tickets-per-second pressure, and the dials that tighten with it are the
   * arrival gap, the deadline lead, the hold window and the jam script. */
  var kchLevels = [
    { id: "svc1", labelKey: "kchS1", window: 120, seed: 101, count: 8, every: 12, jitter: 2, lead: 32, recipes: ["garden", "fillet"], rack: 2, moveTime: 0.35, holdWin: 18, jams: [] },
    { id: "svc3", labelKey: "kchS3", window: 120, seed: 303, count: 10, every: 11, jitter: 1.5, lead: 34, recipes: ["sauce", "duck", "sauce"], rack: 2, moveTime: 0.35, holdWin: 15, jams: [] },
    { id: "svc2", labelKey: "kchS2", window: 120, seed: 202, count: 11, every: 9, jitter: 1.5, lead: 30, recipes: ["fillet", "duck", "duck"], rack: 2, moveTime: 0.35, holdWin: 16, jams: [] },
    { id: "svc4", labelKey: "kchS4", window: 120, seed: 404, count: 11, every: 10, jitter: 1.5, lead: 32, recipes: ["garden", "fillet", "duck"], rack: 2, moveTime: 0.35, holdWin: 15, jams: [{ at: 30, station: "pan", need: 1.4 }, { at: 78, station: "board", need: 1.2 }] },
    { id: "svc5", labelKey: "kchS5", window: 120, seed: 505, count: 13, every: 8.5, jitter: 1.2, lead: 28, recipes: ["garden", "fillet", "duck", "sauce"], rack: 2, moveTime: 0.3, holdWin: 14, jams: [{ at: 48, station: "pass", need: 1.6 }] },
    { id: "svc6", labelKey: "kchS6", window: 120, seed: 606, count: 14, every: 7.6, jitter: 1.2, lead: 28, recipes: ["garden", "fillet", "duck", "sauce"], rack: 2, moveTime: 0.3, holdWin: 14, jams: [{ at: 44, station: "pass", need: 1.5 }] },
    { id: "svc7", labelKey: "kchS7", window: 120, seed: 707, count: 15, every: 6.4, jitter: 1.2, lead: 28, recipes: ["duck", "fillet", "sauce", "duck"], rack: 2, moveTime: 0.3, holdWin: 13, jams: [{ at: 28, station: "pan", need: 1.4 }, { at: 66, station: "board", need: 1.3 }] },
    { id: "svc8", labelKey: "kchS8", window: 120, seed: 808, count: 16, every: 6.4, jitter: 1.1, lead: 26, recipes: ["sauce", "duck", "sauce", "fillet"], rack: 2, moveTime: 0.3, holdWin: 13, jams: [{ at: 24, station: "pan", need: 1.4 }, { at: 56, station: "pass", need: 1.5 }] },
    { id: "svc9", labelKey: "kchS9", window: 120, seed: 909, count: 17, every: 6.4, jitter: 1, lead: 26, recipes: ["duck", "sauce", "fillet", "garden"], rack: 2, moveTime: 0.3, holdWin: 12, jams: [{ at: 24, station: "pan", need: 1.5 }, { at: 52, station: "board", need: 1.4 }, { at: 84, station: "pass", need: 1.6 }] },
    { id: "svc10", labelKey: "kchS10", window: 120, seed: 1010, count: 18, every: 6, jitter: 1, lead: 24, recipes: ["garden", "fillet", "duck", "sauce"], rack: 2, moveTime: 0.3, holdWin: 11, jams: [{ at: 26, station: "pan", need: 1.5 }, { at: 56, station: "board", need: 1.4 }, { at: 88, station: "pass", need: 1.6 }] },
  ];

  var kchQuiet = null;

  /* ------------------------------------------------------------------ *
   * Pure core: no DOM, no clock, no Math.random - a service replays.    *
   * ------------------------------------------------------------------ */

  /* Lehmer / MINSTD: exact inside the float integer range. */
  function kchRng(seed) {
    var value = Math.abs(Math.round(Number(seed) || 7)) % 2147483646 || 7;
    return function () {
      value = (value * 16807) % 2147483647;
      return value / 2147483647;
    };
  }

  function kchClamp(value, low, high) {
    var n = Number(value);
    if (!(n > low)) { return low; }
    return n > high ? high : n;
  }

  function kchPct(value) { return Math.round(kchClamp(value, 0, 1.2) * 100); }

  function kchFindTicket(state, id) {
    if (!state || !id) { return null; }
    for (var i = 0; i < state.tickets.length; i += 1) { if (state.tickets[i].id === id) { return state.tickets[i]; } }
    return null;
  }

  function kchStepOfType(tk, kind) {
    if (!tk) { return null; }
    for (var i = 0; i < tk.steps.length; i += 1) { if (tk.steps[i].kind === kind) { return tk.steps[i]; } }
    return null;
  }

  /* The pan step worth a glance: a ruined one first, then the loose one that is
   * in its band and still on the heat, then whatever the next hand needs. */
  function kchPanStepOf(tk) {
    if (!tk) { return null; }
    var first = null;
    for (var i = 0; i < tk.steps.length; i += 1) {
      var st = tk.steps[i];
      if (st.station !== "pan") { continue; }
      if (!first) { first = st; }
      if (st.ruined || (st.started && !st.offHeat && kchInBand(st)) || !kchAccepted(st)) { return st; }
    }
    return first;
  }

  function kchInBand(st) { return !!st && !st.ruined && st.value >= st.ok[0] - 0.000001 && st.value <= st.ok[1] + 0.000001; }
  function kchPerfect(st) { return !!st && !st.ruined && st.value >= st.perfect[0] - 0.000001 && st.value <= st.ok[1] + 0.000001; }
  function kchOver(st) { return !!st && st.value > st.ok[1] + 0.000001; }

  function kchAccepted(st) {
    if (!st || st.ruined || st.kind === "plate") { return false; }
    return (st.kind === "chop" ? st.presses > 0 : st.started) && kchInBand(st);
  }

  /* A step may only be worked once everything before it is in its band. */
  function kchOrderReady(tk, index) {
    if (!tk) { return false; }
    for (var i = 0; i < index; i += 1) { if (!kchAccepted(tk.steps[i])) { return false; } }
    return true;
  }

  function kchNextStep(tk) {
    if (!tk) { return null; }
    for (var i = 0; i < tk.steps.length; i += 1) {
      var st = tk.steps[i];
      if (st.kind !== "plate" && !kchAccepted(st)) { return kchOrderReady(tk, i) ? st : null; }
    }
    return null;
  }

  /* The work steps of a dish and how many of them are already in their band. */
  function kchWorkLeft(tk) {
    var all = 0;
    var done = 0;
    for (var i = 0; tk && i < tk.steps.length; i += 1) {
      if (tk.steps[i].kind === "plate") { continue; }
      all += 1;
      if (kchAccepted(tk.steps[i])) { done += 1; }
    }
    return { all: all, done: done };
  }

  function kchAllAccepted(tk) {
    if (!tk || tk.status !== "open" || tk.plated) { return false; }
    var tally = kchWorkLeft(tk);
    return tally.all > 0 && tally.done === tally.all;
  }

  /* A pan step that reached its band but is still on the heat: the dish that
   * has to be carried off, to the rack or straight to the plate. */
  function kchLooseInBand(tk) {
    if (!tk || tk.plated) { return null; }
    for (var i = 0; i < tk.steps.length; i += 1) {
      var st = tk.steps[i];
      if (st.station === "pan" && st.started && !st.offHeat && kchInBand(st)) { return st; }
    }
    return null;
  }

  /* The pan step the hand owns: the first order-ready one that is still on the
   * heat. There is no ceiling here - holding past the band is what burns. */
  function kchWorkPanStep(tk) {
    if (!tk || tk.plated || tk.status !== "open") { return null; }
    for (var i = 0; i < tk.steps.length; i += 1) {
      var st = tk.steps[i];
      if (st.station !== "pan" || st.ruined || st.offHeat) { continue; }
      return kchOrderReady(tk, i) ? st : null;
    }
    return null;
  }

  /* The chop step the board owns: the first order-ready one that is not ruined,
   * band or no band - one cut too many is what makes it mush. */
  function kchWorkChopStep(tk) {
    if (!tk || tk.plated || tk.status !== "open") { return null; }
    for (var i = 0; i < tk.steps.length; i += 1) {
      var st = tk.steps[i];
      if (st.kind !== "chop" || st.ruined) { continue; }
      return kchOrderReady(tk, i) ? st : null;
    }
    return null;
  }

  /* How far the scripted line pushes that step: the bottom of the perfect band,
   * which is the release it has to hit to be paid a tip. */
  function kchHeatWanted(tk) {
    var st = kchWorkPanStep(tk);
    return st && st.value < st.perfect[0] ? st : null;
  }

  /* A chop the line can still take one more cut on without crossing the top of
   * the band: the aim is the perfect end of it, not the safe start. */
  function kchChopWanted(tk) {
    if (!tk || tk.plated || tk.status !== "open") { return null; }
    for (var i = 0; i < tk.steps.length; i += 1) {
      var st = tk.steps[i];
      if (st.kind !== "chop" || st.ruined || st.presses >= st.count) { continue; }
      return kchOrderReady(tk, i) ? st : null;
    }
    return null;
  }

  /* What the line will plate: every step accepted, the chop taken all the way
   * to the top of its band, and no pan step left wanting heat. */
  function kchDishReady(tk) {
    return kchAllAccepted(tk) && !kchChopWanted(tk) && !kchHeatWanted(tk);
  }

  function kchBuildSteps(recipe) {
    var list = [];
    for (var i = 0; i < recipe.steps.length; i += 1) {
      var src = recipe.steps[i];
      var kind = kchKinds[src.kind] || kchKinds.chop;
      list.push({
        index: i, kind: src.kind, station: kind.station, word: kind.word,
        count: Math.max(1, Math.round(Number(src.count) || 4)), presses: 0, value: 0,
        held: Math.max(0.01, Number(src.held) || kind.held || 0.2),
        idle: Math.max(0.01, Number(src.idle) || kind.idle || 0.08),
        ok: kind.ok, perfect: kind.perfect, started: false, offHeat: false, ruined: "",
      });
    }
    list.push({
      index: list.length, kind: "plate", station: "pass", word: "kchPlateWord", count: 1, presses: 0,
      value: 0, held: 0, idle: 0, ok: [1, 1], perfect: [1, 1], started: false, offHeat: false, ruined: "",
    });
    return list;
  }

  /* Seeded ticket queue: arrival, deadline and recipe all come from the level
   * seed, so the same service always opens the same way. */
  function kchBuildTickets(level) {
    var rng = kchRng(level.seed);
    var ids = level.recipes && level.recipes.length ? level.recipes : ["garden"];
    var list = [];
    var clock = 1.2;
    var count = Math.max(1, Math.round(Number(level.count) || 1));
    for (var i = 0; i < count; i += 1) {
      var recipe = kchRecipes[ids[Math.min(ids.length - 1, Math.floor(rng() * ids.length))]] || kchRecipes.garden;
      var gap = Math.max(2, (Number(level.every) || 10) + (rng() * 2 - 1) * (Number(level.jitter) || 1));
      var work = Math.max(0, recipe.steps.length - 1) * 5;
      list.push({
        id: "T" + (i + 1), number: i + 1, recipeId: recipe.id, nameKey: recipe.nameKey,
        price: Number(recipe.price) || 10, steps: kchBuildSteps(recipe), arrive: clock,
        due: clock + (Number(level.lead) || 30) + work, arrived: false, status: "open",
        plated: false, platedAt: 0, restedAt: 0, cold: false, tipValue: 0, gone: "",
      });
      clock += gap;
    }
    return list;
  }

  function kitchenMakeService(level) {
    var def = level && level.window ? level : kchLevels[0];
    var tickets = kchBuildTickets(def);
    return {
      level: def, window: Math.max(1, Number(def.window) || 120), time: 0, tickets: tickets,
      focus: tickets.length ? tickets[0].id : "", station: "board", hold: null, move: 0, queue: [],
      rack: [], rackSize: Math.max(1, Math.round(Number(def.rack) || 2)), log: [], note: null,
      covers: 0, points: 0, tips: 0, burnt: 0, lost: 0, hearts: kchHearts,
      jam: null, jamClear: 0, jamIndex: 0, jamFixed: 0, calm: false, done: false, reason: "",
    };
  }

  function kchNote(state, entry) {
    entry.at = state.time;
    state.note = entry;
    state.log.push(entry);
    while (state.log.length > 10) { state.log.shift(); }
  }

  function kchDropRack(state, id) {
    var kept = [];
    for (var i = 0; i < state.rack.length; i += 1) {
      if (state.rack[i] !== id) { kept.push(state.rack[i]); }
    }
    state.rack = kept;
  }

  function kchLoseTicket(state, tk, why, key) {
    if (!tk || tk.status !== "open") { return; }
    tk.status = "gone";
    tk.gone = why;
    state.lost += 1;
    state.hearts -= 1;
    state.points = Math.max(0, state.points - kchLateCost);
    kchDropRack(state, tk.id);
    kchNote(state, { key: key, id: tk.id, n: tk.number });
  }

  function kchRuinTicket(state, tk, why, key, word) {
    if (!tk || tk.status !== "open") { return; }
    state.burnt += 1;
    state.points = Math.max(0, state.points - kchBurnCost);
    tk.ruinWord = word;
    kchLoseTicket(state, tk, why, key);
  }

  /* Tips: every step that leaves the station inside its perfect band pays, and
   * a dish that was perfect all the way through pays a bonus on top. */
  function kchTipValue(tk) {
    var steps = kchWorkLeft(tk);
    var good = 0;
    for (var i = 0; i < tk.steps.length; i += 1) {
      if (tk.steps[i].kind !== "plate" && kchPerfect(tk.steps[i])) { good += 1; }
    }
    if (!steps.all) { return 0; }
    return good * 3 + (good === steps.all ? 4 : 0);
  }

  function kchFreshLeft(state, tk, holdWin) {
    var since = tk.platedAt > 0 ? tk.platedAt : tk.restedAt;
    if (!(since > 0)) { return holdWin; }
    return Math.max(0, holdWin - (state.time - since));
  }

  /* ---- one deterministic tick: hands, heat, clocks, deadlines ---- */
  function kitchenStep(state, action, dt) {
    if (!state || state.done) { return state; }
    var level = state.level;
    var delta = kchClamp(Number(dt) || 0, 0, kchMaxDt) * (state.calm ? kchCalmScale : 1);

    /* the hands: one intent per tick, and walking to a station costs the tick */
    if (action && action.station && action.station !== state.station) {
      state.station = action.station;
      state.move = kchClamp(Number(level.moveTime) || 0.3, 0, 2);
    }
    if (action && action.ticket && action.ticket !== state.focus && kchFindTicket(state, action.ticket)) {
      state.focus = action.ticket;
    }
    var type = action ? action.type : "idle";
    if (type === "hold") {
      state.hold = action.station || state.station;
    } else {
      state.hold = null;
      if (type === "press" && state.move <= 0 && state.queue.length < 2) {
        state.queue.push(action.station || state.station);
      }
    }

    state.time += delta;
    if (state.move > 0) { state.move = Math.max(0, state.move - delta); }

    /* the scripted jams: that station does no work until it is worked loose */
    var script = level.jams || [];
    var i;
    var tk;
    var st;
    while (state.jamIndex < script.length && state.time >= Number(script[state.jamIndex].at)) {
      state.jam = {
        station: script[state.jamIndex].station,
        need: kchClamp(Number(script[state.jamIndex].need) || 1.2, 0.2, 8),
      };
      state.jamClear = 0;
      state.jamIndex += 1;
      kchNote(state, { key: "kchJamMsg", station: state.jam.station });
    }
    if (state.jam && state.station === state.jam.station && state.move <= 0) {
      var clears = delta;
      if (state.queue.length && state.queue[0] === state.jam.station) {
        state.queue.shift();
        clears += 0.08;
      }
      state.jamClear += clears;
      if (state.jamClear >= state.jam.need) {
        kchNote(state, { key: "kchJamClearMsg", station: state.jam.station });
        state.jamFixed += 1;
        state.jam = null;
        state.jamClear = 0;
      }
    }

    /* arrivals and residual heat: everything still on the pan keeps cooking
     * unattended, and the heat that was going to save one dish is what burns it */
    var panCold = !!(state.jam && state.jam.station === "pan");
    var focus = kchFindTicket(state, state.focus);
    var heated = null;
    if (state.hold === "pan" && !state.jam && state.move <= 0) {
      heated = focus && focus.arrived ? kchWorkPanStep(focus) : null;
      if (heated) {
        heated.started = true;
        heated.value += heated.held * delta;
      }
    }
    /* one queued press per tick, so mashing the board costs you the dish */
    if (state.queue.length) { kchPress(state, state.queue.shift()); }
    for (i = 0; i < state.tickets.length; i += 1) {
      tk = state.tickets[i];
      if (!tk.arrived && state.time >= tk.arrive) {
        tk.arrived = true;
        kchNote(state, { key: "kchTicketIn", id: tk.id, n: tk.number });
      }
      if (tk.status !== "open") { continue; }
      for (var s = 0; s < tk.steps.length; s += 1) {
        st = tk.steps[s];
        if (st.station !== "pan" || st.ruined || !st.started || st.offHeat) { continue; }
        if (st !== heated && !panCold) { st.value += st.idle * delta; }
        if (kchOver(st)) {
          st.ruined = "burnt";
          kchRuinTicket(state, tk, "burnt", "kchBurntMsg", "burnt");
          break;
        }
      }
    }

    /* the rack goes cold, deadlines walk, and the board counts what is left */
    var holdWin = kchClamp(Number(level.holdWin) || 15, 2, 60);
    var live = 0;
    for (i = 0; i < state.tickets.length; i += 1) {
      tk = state.tickets[i];
      if (tk.status === "open" && !tk.cold && (tk.plated || tk.restedAt > 0)) {
        tk.cold = kchFreshLeft(state, tk, holdWin) <= 0;
      }
      if (tk.arrived && tk.status === "open" && state.time > tk.due) {
        kchLoseTicket(state, tk, "late", "kchLateMsg");
      }
      if ((!tk.arrived || tk.status === "open") && tk.due > state.time) { live += 1; }
    }

    /* the service closes on the clock, on three lost tickets, or when the
     * board has nothing left to wait for */
    var reason = "";
    if (state.time >= state.window) { reason = "closed"; }
    else if (state.hearts <= 0) { reason = "hearts"; }
    else if (live === 0 && state.jamIndex >= script.length) { reason = "cleared"; }
    state.reason = reason;
    state.done = !!reason;
    return state;
  }

  /* The single action of a station: the board chops, the pan turns, the pass
   * runs its ladder - serve, plate, take off the heat, or refuse with a reason. */
  function kchPress(state, station) {
    var tk = kchFindTicket(state, state.focus);
    if (!tk || !tk.arrived || tk.status !== "open") {
      kchRefuse(state, tk, "kchWhyNone");
      return;
    }
    if (station === "pass") { kchPassPress(state, tk); return; }
    var step = station === "board" ? kchWorkChopStep(tk) : kchWorkPanStep(tk);
    if (!step) {
      kchRefuse(state, tk, "kchWhyRaw");
      return;
    }
    step.started = true;
    if (station === "board") {
      step.presses += 1;
      step.value = step.presses / Math.max(1, step.count);
    } else {
      step.value += kchFlip;
    }
    if (!kchOver(step)) { return; }
    step.ruined = station === "board" ? "mush" : "burnt";
    kchRuinTicket(state, tk, step.ruined, station === "board" ? "kchMushMsg" : "kchBurntMsg", step.ruined);
  }

  function kchPassPress(state, tk) {
    var i;
    var st;
    if (tk.status === "served") { kchRefuse(state, tk, "kchWhyDone"); return; }
    if (tk.plated) { kitchenServe(state, tk.id); return; }
    if (kchAllAccepted(tk)) {
      tk.plated = true;
      tk.platedAt = state.time;
      tk.tipValue = kchTipValue(tk);
      for (i = 0; i < tk.steps.length; i += 1) {
        st = tk.steps[i];
        st.offHeat = true;
        if (st.kind === "plate") { st.started = true; st.value = 1; }
      }
      kchDropRack(state, tk.id);
      kchNote(state, { key: "kchPlatedMsg", id: tk.id, p: tk.price + tk.tipValue });
      return;
    }
    if (!kchLooseInBand(tk)) { kchRefuse(state, tk, "kchWhyRaw"); return; }
    if (state.rack.length >= state.rackSize) { kchRefuse(state, tk, "kchWhyRack"); return; }
    for (i = 0; i < tk.steps.length; i += 1) {
      st = tk.steps[i];
      if (st.station === "pan" && st.started && !st.offHeat) { st.offHeat = true; }
    }
    tk.restedAt = tk.restedAt > 0 ? tk.restedAt : state.time;
    state.rack.push(tk.id);
    kchNote(state, { key: "kchRestedMsg", id: tk.id, n: tk.number });
  }

  /* Accept or refuse a ticket for the pass, always with the reason. */
  function kchRefuse(state, tk, why) {
    kchNote(state, { key: "kchRejectMsg", why: why, id: tk ? tk.id : "" });
    return { ok: false, reason: why, points: 0, tip: 0, covers: state.covers };
  }

  function kitchenServe(state, ticketId) {
    if (!state) { return { ok: false, reason: "kchWhyNone", points: 0, tip: 0, covers: 0 }; }
    var tk = kchFindTicket(state, ticketId);
    if (!tk) { return kchRefuse(state, null, "kchWhyNone"); }
    if (tk.status === "served") { return kchRefuse(state, tk, "kchWhyDone"); }
    if (tk.status !== "open") { return kchRefuse(state, tk, "kchWhyGone"); }
    if (state.time > tk.due) {
      kchLoseTicket(state, tk, "late", "kchLateMsg");
      return kchRefuse(state, tk, "kchWhyLate");
    }
    if (!tk.plated) { return kchRefuse(state, tk, "kchWhyRaw"); }
    var tip = tk.cold ? 0 : tk.tipValue;
    var pay = tk.cold ? Math.max(1, Math.round(tk.price * 0.5)) : tk.price + tip;
    tk.status = "served";
    tk.servedAt = state.time;
    state.covers += 1;
    state.points += pay;
    state.tips += tip;
    kchDropRack(state, tk.id);
    kchNote(state, { key: tk.cold ? "kchColdMsg" : "kchServedMsg", id: tk.id, p: pay, t: tip, c: state.covers });
    return { ok: true, reason: tk.cold ? "kchColdMsg" : "kchServedMsg", points: pay, tip: tip, covers: state.covers };
  }

  /* ------------------------------------------------------------------ *
   * The scripted best-play line. A deterministic chef drives the same   *
   * tick a player drives, and its recorded action line is what the      *
   * star bands are measured from.                                      *
   * ------------------------------------------------------------------ */
  function kchGapPress(chef, state, station, ticketId) {
    var gap = station === "board" ? 0.16 : 0.12;
    if (state.time - chef.last[station] < gap) {
      return { type: "idle", station: state.station, ticket: ticketId };
    }
    chef.last[station] = state.time;
    return { type: "press", station: station, ticket: ticketId };
  }

  function kchChefAct(state, chef) {
    var open = [];
    var i;
    var pick = null;
    var tk;
    for (i = 0; i < state.tickets.length; i += 1) {
      if (state.tickets[i].arrived && state.tickets[i].status === "open") { open.push(state.tickets[i]); }
    }
    /* a jammed station is worked before anything can be saved */
    if (state.jam) { return { type: "hold", station: state.jam.station, ticket: state.focus }; }
    /* 1 - whatever is already plated leaves first, soonest deadline on top */
    for (i = 0; i < open.length; i += 1) {
      if (open[i].plated && (!pick || open[i].due < pick.due)) { pick = open[i]; }
    }
    if (pick) { return kchGapPress(chef, state, "pass", pick.id); }
    /* 2 - a dish that is as good as it is going to get goes to the plate */
    for (i = 0; i < open.length; i += 1) {
      if (kchDishReady(open[i]) && (!pick || open[i].due < pick.due)) { pick = open[i]; }
    }
    if (pick) { return kchGapPress(chef, state, "pass", pick.id); }
    /* 3 - a loose sear that is done but whose board still owes a cut: finish the
     * cut first and trust the residual heat, or the plate goes out one short */
    for (i = 0; i < open.length; i += 1) {
      tk = open[i];
      if (kchLooseInBand(tk) && !kchHeatWanted(tk) && kchChopWanted(tk) && (!pick || tk.due < pick.due)) { pick = tk; }
    }
    if (pick) { return kchGapPress(chef, state, "board", pick.id); }
    /* 4 - a sear that is as good as it gets comes off the heat while the rest
     * of the dish is finished; one still wanting heat stays under the hand */
    if (state.rack.length < state.rackSize) {
      for (i = 0; i < open.length; i += 1) {
        tk = open[i];
        if (kchLooseInBand(tk) && !kchHeatWanted(tk) && !kchDishReady(tk) && (!pick || tk.due < pick.due)) { pick = tk; }
      }
      if (pick) { return kchGapPress(chef, state, "pass", pick.id); }
    }
    /* 5 - one dish on the pan at a time: heat the most urgent one that wants it */
    var hot = null;
    for (i = 0; i < open.length; i += 1) {
      tk = open[i];
      if (kchHeatWanted(tk) && (!hot || tk.due < hot.due)) { hot = tk; }
    }
    if (hot) { return { type: "hold", station: "pan", ticket: hot.id }; }
    /* 6 - with no heat wanted, the hands are worth more on the board */
    var prep = null;
    for (i = 0; i < open.length; i += 1) {
      tk = open[i];
      if (kchChopWanted(tk) && (!prep || tk.due < prep.due)) { prep = tk; }
    }
    if (prep) { return kchGapPress(chef, state, "board", prep.id); }
    return { type: "idle", station: state.station, ticket: state.focus };
  }

  function kitchenPlan(level) {
    var state = kitchenMakeService(level);
    var chef = { last: { board: -9, pan: -9, pass: -9 } };
    var program = [];
    while (!state.done && program.length < 4000) {
      var act = kchChefAct(state, chef);
      program.push([act.type, act.station || "", act.ticket || ""]);
      kitchenStep(state, act, kchTick);
    }
    return program;
  }

  /* Replay a scripted action line through the sim and report what it scored. */
  function kitchenCovers(service, program) {
    var state = service && service.tickets ? service : kitchenMakeService(service);
    var line = program && program.length ? program : kitchenPlan(state.level);
    var i = 0;
    while (!state.done && i < line.length && i < 5000) {
      kitchenStep(state, { type: line[i][0], station: line[i][1], ticket: line[i][2] }, kchTick);
      i += 1;
    }
    return {
      covers: state.covers, points: state.points, tips: state.tips,
      burnt: state.burnt, lost: state.lost, ticks: i, end: state.time,
    };
  }

  /* Bands measured off that line, never invented: three stars is what a good
   * scripted run covered, one star is under half of it. */
  function kchBands(level) {
    if (level.starCovers && level.starCovers.length === 3) { return level.starCovers; }
    var best = kitchenCovers(kitchenMakeService(level), kitchenPlan(level)).covers;
    var three = Math.round(kchClamp(best, 1, Math.max(1, Number(level.count) || best)));
    var two = Math.max(1, Math.ceil(three * 0.72));
    var one = Math.max(1, Math.ceil(three * 0.42));
    level.starCovers = [three, Math.min(two, three), Math.min(one, two)];
    return level.starCovers;
  }

  /* Proof that a service's 1-star band is reachable inside its own window. */
  function kitchenBeatable(level) {
    if (!level || !level.window) { return false; }
    var bands = kchBands(level);
    var run = kitchenCovers(kitchenMakeService(level), kitchenPlan(level));
    return run.covers >= bands[2] && run.end <= level.window + kchTick;
  }

  /* ------------------------------------------------------------------ *
   * Panel                                                              *
   * ------------------------------------------------------------------ */
  function initKitchenRelayGame(panelEl) {
    if (!panelEl) { return; }

    var campaign = createCampaign({ key: "kitchen-relay-campaign", levels: kchLevels });
    var level = kchLevels[Math.max(0, campaign.indexOf(campaign.nextLevelId()))];
    var state = kitchenMakeService(level);
    var running = false;
    var paused = false;
    var settled = false;
    var loopId = null;
    var lastNow = 0;
    var holdStation = null;
    var presses = [];
    var intent = null;
    var bestEl = null;
    var ticketViews = [];

    /* --- markup: built with createElement so the headless harness sees it --- */
    function el(tag, cls, key) {
      var node = document.createElement(tag);
      if (cls) { node.className = cls; }
      if (key) { node.setAttribute("data-i18n", key); node.textContent = t(key); }
      return node;
    }

    function add(parent, kids) {
      for (var i = 0; i < kids.length; i += 1) { parent.appendChild(kids[i]); }
      return parent;
    }

    function button(cls, label) {
      var node = el("button", cls);
      node.type = "button";
      var span = el("span", "button-content");
      span.textContent = label;
      return add(node, [span]);
    }

    function stat(key, valueEl) {
      return add(el("div", "game-stat"), [el("span", "", key), valueEl]);
    }

    function makeStation(def, parent) {
      var fill = el("div", "kch-fill");
      var word = el("p", "kch-word");
      var detail = el("p", "kch-detail");
      var hot = el("span", "kch-st-key");
      hot.setAttribute("aria-hidden", "true");
      hot.textContent = def.hot;
      var card = el("button", "kch-station");
      card.type = "button";
      add(card, [
        add(el("div", "kch-st-top"), [el("span", "kch-st-name", def.nameKey), hot]),
        add(el("div", "kch-bar"), [fill]), word, detail,
      ]);
      parent.appendChild(card);
      return { def: def, card: card, fill: fill, word: word, detail: detail };
    }

    var clockEl = el("strong");
    var coversEl = el("strong");
    var pointsEl = el("strong");
    var heartsEl = el("strong");
    var hud = add(el("div", "game-hud"), [
      stat("kchClockLabel", clockEl), stat("kchCoversLabel", coversEl),
      stat("kchPointsLabel", pointsEl), stat("kchHeartsLabel", heartsEl),
    ]);

    var rail = el("div", "kch-rail");
    rail.setAttribute("role", "group");
    rail.setAttribute("aria-label", t("kchRailAria"));
    var bandsEl = el("p", "kch-bands");
    var rackEl = el("p", "kch-rack");
    var calmBtn = button("kch-calm", t("kchBtnCalm", { state: t("kchCalmOff") }));
    calmBtn.setAttribute("aria-pressed", "false");
    var stations = el("div", "kch-stations");
    var views = [];
    for (var v = 0; v < kchStations.length; v += 1) {
      views.push(makeStation(kchStations[v], stations));
    }
    var stage = add(el("div", "kch-stage"), [
      el("p", "kch-railtitle", "kchRailTitle"), rail, bandsEl,
      add(el("div", "kch-tools"), [calmBtn, rackEl]), stations,
    ]);

    var result = el("p", "game-result");
    result.setAttribute("role", "status");

    var rowLabel = el("label", "elements-label", "kchServiceSelectLabel");
    rowLabel.setAttribute("for", "kchServiceSel");
    var selectEl = el("select", "elements-select");
    selectEl.id = "kchServiceSel";
    var startBtn = button("primary kch-run", t("kchBtnStart"));
    bestEl = el("p", "game-best");
    var row = add(el("div", "elements-row"), [rowLabel, selectEl]);
    add(panelEl, [
      hud, stage, result, row, add(el("div", "game-actions"), [startBtn, bestEl]),
      el("p", "game-hint", "kchHint"),
    ]);

    /* --- text helpers --- */
    function setText(node, text) {
      if (node._kch !== text) {
        node._kch = text;
        node.textContent = text;
      }
    }

    function ticketName(tk) { return tk ? t(tk.nameKey) : t("kchThisTicket"); }

    function noteText(note) {
      if (!note || !note.key) { return ""; }
      var tk = kchFindTicket(state, note.id);
      var name = ticketName(tk);
      var left = tk ? Math.max(0, Math.ceil(tk.due - state.time)) : 0;
      if (note.key === "kchRejectMsg") {
        return t("kchRejectMsg", { msg: t(note.why || "kchWhyNone", { name: name }) });
      }
      if (note.key === "kchJamMsg" || note.key === "kchJamClearMsg") {
        return t(note.key, { station: t(kchStationName[note.station] || "kchThisTicket") });
      }
      if (note.key === "kchTicketIn") {
        return t(note.key, { name: name, n: Math.max(1, note.n || 1), s: left });
      }
      return t(note.key, {
        name: name, n: Math.max(1, note.n || 1),
        p: Math.round(Number(note.p) || 0), t: Math.round(Number(note.t) || 0),
        c: Math.round(Number(note.c) || state.covers),
      });
    }

    /* --- what a station shows: a word plus a number, never colour alone --- */
    function stationView(id) {
      var tk = kchFindTicket(state, state.focus);
      var holdWin = kchClamp(Number(level.holdWin) || 15, 2, 60);
      var word = t("kchIdleWord");
      var num = 0;
      var note = t("kchNoTicket");
      if (tk && tk.status === "open") {
        var tally = kchWorkLeft(tk);
        note = t("kchStationDetail", {
          name: ticketName(tk), a: tally.done, b: Math.max(1, tally.all),
        });
        if (id === "board") {
          var chop = kchStepOfType(tk, "chop");
          if (chop) {
            num = kchPct(chop.value);
            word = chop.ruined ? t("kchMushWord") : kchAccepted(chop) ? t("kchReadyWord") : t("kchChopWord");
            note = t("kchCutsLine", { name: ticketName(tk), a: Math.max(0, chop.presses), b: Math.max(1, chop.count) });
          }
        } else if (id === "pan") {
          var pan = kchPanStepOf(tk);
          if (pan) {
            num = kchPct(pan.value);
            word = !pan.started ? t("kchWaitWord") : pan.ruined ? t("kchBurntWord") : kchInBand(pan) ? t("kchReadyWord") : t(pan.word);
            if (pan.started && !pan.offHeat && kchInBand(pan)) {
              note = t("kchBurnClock", { name: ticketName(tk), n: Math.round(Math.max(0, (pan.ok[1] - pan.value) / Math.max(0.01, pan.idle))) });
            }
          }
        } else if (tk.plated) {
          word = t("kchPlatedWord");
          num = 100;
          note = t("kchHoldLine", { name: ticketName(tk), n: Math.round(kchFreshLeft(state, tk, holdWin)) });
        } else if (kchAllAccepted(tk)) {
          word = t("kchPlateWord");
          num = 100;
        } else if (kchLooseInBand(tk)) {
          var loose = kchLooseInBand(tk);
          word = t("kchReadyWord");
          num = kchPct(loose.value);
          note = t("kchPullOff", { name: ticketName(tk) });
        }
      }
      if (state.jam && state.jam.station === id) {
        word = t("kchJamWord");
        num = Math.round((state.jamClear / Math.max(0.2, state.jam.need)) * 100);
        note = t("kchJamWork");
      }
      return { word: word, num: num, note: note };
    }

    /* --- render --- */
    function renderHud() {
      setText(clockEl, t("kchClockValue", { n: Math.max(0, Math.ceil(state.window - state.time)) }));
      setText(coversEl, t("kchCoversValue", { n: state.covers, m: state.tickets.length }));
      setText(pointsEl, t("kchPointsValue", { n: Math.round(state.points) }));
      setText(heartsEl, t("kchHeartsValue", { n: Math.max(0, state.hearts) }));
      setText(rackEl, t("kchRackLine", { a: state.rack.length, b: state.rackSize }));
    }

    function renderRail() {
      for (var i = 0; i < ticketViews.length; i += 1) {
        var view = ticketViews[i];
        var tk = view.tk;
        if (!tk.arrived) {
          setText(view.btn, t("kchTicketSoon", { n: Math.max(0, Math.ceil(tk.arrive - state.time)) }));
          view.btn.className = "kch-ticket";
          continue;
        }
        var left = Math.max(0, Math.ceil(tk.due - state.time));
        var word = tk.status === "served" ? t("kchPaidWord")
          : tk.status === "gone" ? (tk.ruinWord === "burnt" ? t("kchBurntWord") : tk.ruinWord === "mush" ? t("kchMushWord") : t("kchLostWord"))
            : tk.plated ? t("kchPlatedWord") : tk.cold ? t("kchColdWord") : tk.restedAt > 0 ? t("kchRestWord") : t("kchOpenWord");
        setText(view.btn, t("kchTicketLine", { n: tk.number, name: ticketName(tk), s: left, w: word }));
        view.btn.className = "kch-ticket" + (tk.id === state.focus ? " is-focus" : "")
          + (tk.status === "served" ? " is-paid" : "") + (tk.status === "gone" ? " is-gone" : "")
          + (left <= 8 && tk.status === "open" ? " is-urgent" : "");
      }
    }

    function renderStations() {
      for (var i = 0; i < views.length; i += 1) {
        var view = views[i];
        var shown = stationView(view.def.id);
        view.fill.style.width = kchClamp(shown.num, 0, 100) + "%";
        setText(view.word, t("kchStationStatus", { word: shown.word, n: Math.round(shown.num) }));
        setText(view.detail, shown.note);
        view.card.className = "kch-station" + (state.station === view.def.id ? " is-picked" : "")
          + (state.hold === view.def.id ? " is-holding" : "")
          + (state.jam && state.jam.station === view.def.id ? " is-jam" : "");
        view.card.setAttribute("aria-label", t("kchStationAria", {
          station: t(view.def.nameKey), state: shown.word, n: Math.round(shown.num),
        }));
      }
    }

    function renderNote() {
      if (state.done || (!running && !paused)) { return; }
      setText(result, noteText(state.note) || t("kchReady"));
    }

    function renderBoard() {
      renderHud();
      renderRail();
      renderStations();
    }

    function renderAll() {
      renderBoard();
      renderNote();
    }

    function buildRail() {
      while (rail.firstChild) { rail.removeChild(rail.firstChild); }
      ticketViews = [];
      for (var i = 0; i < state.tickets.length; i += 1) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "kch-ticket";
        (function (tk, node) {
          node.addEventListener("click", function () { focusTicket(tk.id); });
        })(state.tickets[i], btn);
        rail.appendChild(btn);
        ticketViews.push({ tk: state.tickets[i], btn: btn });
      }
    }

    function refreshPicker() {
      var bands = kchBands(level);
      fillCampaignPicker(selectEl, campaign, function (def) { return t(def.labelKey); }, t("elementsLocked"));
      selectEl.value = level.id;
      setText(bestEl, t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() }));
      setText(bandsEl, t("kchBandLine", {
        a: bands[0], b: bands[1], c: bands[2], best: campaign.best(level.id),
      }));
    }

    /* --- the loop: clamped dt, skipped while hidden, cancellable by a flag --- */
    function frame(now) {
      if (loopId === null) { return; }
      loopId = null;
      var dt = Math.min(kchMaxDt, Math.max(0, ((now || 0) - lastNow) / 1000));
      lastNow = now || 0;
      /* a hidden panel freezes the service instead of cooking it blind */
      if (panelEl.hidden || document.hidden || !running || paused) {
        if (running && !paused && !state.done) { loopId = window.requestAnimationFrame(frame); }
        return;
      }
      var act;
      if (presses.length) {
        act = { type: "press", station: presses.shift(), ticket: state.focus };
      } else if (intent) {
        act = intent;
        intent = null;
      } else if (holdStation) {
        act = { type: "hold", station: holdStation, ticket: state.focus };
      } else {
        act = { type: "idle", station: state.station, ticket: state.focus };
      }
      kitchenStep(state, act, dt);
      renderAll();
      if (state.done) { finishService(); } else { loopId = window.requestAnimationFrame(frame); }
    }

    function startLoop() {
      if (loopId !== null) { return; }
      lastNow = performance.now ? performance.now() : 0;
      loopId = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (loopId !== null) {
        window.cancelAnimationFrame(loopId);
        loopId = null;
      }
    }

    function labelStart() {
      var label = t("kchBtnStart");
      if (state.done) { label = t("btnNewRound"); }
      else if (running && !paused) { label = t("kchBtnPause"); }
      else if (paused) { label = t("kchBtnResume"); }
      setText(startBtn.firstChild, label);
    }

    function runService() {
      if (state.done) { loadLevel(level); return; }
      if (running && !paused) { pauseService(); return; }
      paused = false;
      running = true;
      labelStart();
      startLoop();
    }

    /* Every stop puts the hands down without touching what is cooking. */
    function handsDown() {
      holdStation = null;
      presses.length = 0;
      state.hold = null;
      stopLoop();
      labelStart();
    }

    function pauseService() {
      if (!running) { return; }
      paused = true;
      handsDown();
      renderBoard();
      setText(result, t("kchPaused"));
    }

    function finishService() {
      if (settled) { return; }
      settled = true;
      running = false;
      handsDown();
      var bands = kchBands(level);
      var stars = starsFor(state.covers, bands, "high");
      var outcome = { isBest: false, firstClear: false, unlockedNext: null };
      /* a service that paid for nothing has not cleared anything */
      if (state.covers > 0) {
        outcome = campaign.record(level.id, { stars: stars, best: state.covers, better: "high" });
      }
      var message = t("kchOverMsg", {
        c: state.covers, p: Math.round(state.points), l: state.lost, s: stars,
      });
      if (state.reason === "hearts") { message = t("kchHeartsMsg") + " " + message; }
      if (outcome.isBest && state.covers > 0) { message = message + " " + t("newBest"); }
      if (outcome.unlockedNext) { message = message + " " + t("kchNextMsg"); }
      else if (campaign.clearedCount() === kchLevels.length) { message = message + " " + t("kchAllMsg"); }
      renderBoard();
      refreshPicker();
      labelStart();
      setText(result, message);
      if (stars < 1) { return; }
      logAction(t("logKitchenRelay", { name: t(level.labelKey), c: state.covers }));
      var rect = startBtn.getBoundingClientRect();
      createConfetti(rect.width ? rect.left + rect.width / 2 : 160, rect.height ? rect.top + rect.height / 2 : 80);
      petNotifyGame(outcome.isBest || outcome.firstClear);
    }

    /* The shell calls this on every tab switch and when the drawer closes, so
     * it freezes the service rather than wiping it: no loop, no clock, and no
     * dish burnt by a panel nobody can see. */
    kchQuiet = function () {
      if (running && !state.done) { paused = true; }
      intent = null;
      state.move = 0;
      handsDown();
      if (state.done) { return; }
      renderBoard();
      setText(result, t("kchPaused"));
    };

    function loadLevel(def) {
      stopLoop();
      level = def;
      state = kitchenMakeService(level);
      running = false;
      paused = false;
      settled = false;
      holdStation = null;
      presses.length = 0;
      intent = null;
      calmBtn.setAttribute("aria-pressed", "false");
      calmBtn.firstChild.textContent = t("kchBtnCalm", { state: t("kchCalmOff") });
      buildRail();
      refreshPicker();
      labelStart();
      renderBoard();
      setText(result, t("kchPrompt", {
        name: t(level.labelKey), n: state.tickets.length, w: Math.round(state.window),
      }));
    }

    /* --- input: every action is reachable by pointer and by keyboard --- */
    function pickStation(id) {
      if (state.station !== id && !state.done) {
        if (running && !paused) { intent = { type: "idle", station: id, ticket: state.focus }; }
        else { kitchenStep(state, { type: "idle", station: id, ticket: state.focus }, 0); }
      }
      renderBoard();
    }

    function pressStation(id) {
      /* The clock only runs while the service does, so a press before the start
       * reminds the player instead of queueing up work for the first tick. */
      if (!running && !state.done) {
        setText(result, t("kchReady"));
        return;
      }
      if (presses.length < 2) { presses.push(id); }
      if (paused) { runService(); }
    }

    function focusTicket(id) {
      if (!kchFindTicket(state, id)) { return; }
      if (running && !paused) { intent = { type: "idle", station: state.station, ticket: id }; }
      else { state.focus = id; }
      renderBoard();
    }

    function shiftTicket(step) {
      var index = 0;
      for (var i = 1; i < state.tickets.length; i += 1) {
        if (state.tickets[i].id === state.focus) { index = i; }
      }
      var next = (index + step + state.tickets.length) % Math.max(1, state.tickets.length);
      focusTicket(state.tickets[next].id);
    }

    function cycleStation() {
      var index = 0;
      for (var i = 1; i < kchStations.length; i += 1) {
        if (kchStations[i].id === state.station) { index = i; }
      }
      pickStation(kchStations[(index + 1) % kchStations.length].id);
    }

    function bindStation(view) {
      var id = view.def.id;
      /* A click is that station's own action: a cut, a turn, a pass. */
      view.card.addEventListener("click", function () {
        pickStation(id);
        pressStation(id);
      });
      if (id !== "pan") { return; }
      /* The pan is the held timing window: down starts the cook, up is the
       * release inside the band. */
      view.card.addEventListener("pointerdown", function (event) {
        if (event.preventDefault) { event.preventDefault(); }
        pickStation(id);
        holdStation = state.done ? null : id;
        if (paused) { runService(); }
      });
      view.card.addEventListener("pointerup", function () {
        if (holdStation === id) { holdStation = null; }
      });
      view.card.addEventListener("pointercancel", function () {
        if (holdStation === id) { holdStation = null; }
      });
    }

    for (var b = 0; b < views.length; b += 1) { bindStation(views[b]); }

    /* A release outside the pan still has to reach us, or the hand stays down:
     * the panel sees the bubbled pointerup and lets go. */
    panelEl.addEventListener("pointerup", function () {
      if (holdStation) {
        holdStation = null;
        renderStations();
      }
    });
    panelEl.addEventListener("pointercancel", function () {
      holdStation = null;
    });

    panelEl.addEventListener("keydown", function (event) {
      if (!event || !event.key) { return; }
      var key = event.key;
      if (key === "1" || key === "2" || key === "3") { pickStation(kchStations[Number(key) - 1].id); return; }
      if (key === "Tab") { cycleStation(); return; }
      if (key === "ArrowLeft") { shiftTicket(-1); return; }
      if (key === "ArrowRight") { shiftTicket(1); return; }
      if (key === "ArrowUp") { pickStation(kchStations[0].id); return; }
      if (key === "ArrowDown") { pickStation(kchStations[2].id); return; }
      if (key === "Escape") {
        if (running && !paused) { pauseService(); }
        return;
      }
      if (key === " " || key === "Enter") {
        if (event.preventDefault) { event.preventDefault(); }
        if (state.station === "pan" && key === " ") {
          holdStation = "pan";
          if (paused) { runService(); }
          renderStations();
          return;
        }
        pressStation(state.station);
      }
    });

    panelEl.addEventListener("keyup", function (event) {
      if (event && (event.key === " " || event.key === "Enter") && holdStation) {
        holdStation = null;
        renderStations();
      }
    });

    calmBtn.addEventListener("click", function () {
      state.calm = !state.calm;
      calmBtn.firstChild.textContent = t("kchBtnCalm", { state: state.calm ? t("kchCalmOn") : t("kchCalmOff") });
      calmBtn.setAttribute("aria-pressed", state.calm ? "true" : "false");
      calmBtn.className = "kch-calm" + (state.calm ? " is-on" : "");
      renderBoard();
    });

    startBtn.addEventListener("click", function () { runService(); });

    selectEl.addEventListener("change", function () {
      var index = campaign.indexOf(selectEl.value);
      if (index >= 0 && campaign.isUnlocked(selectEl.value)) { loadLevel(kchLevels[index]); return; }
      selectEl.value = level.id;
    });

    loadLevel(level);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabKitchenRelay": "Kitchen Relay",
      "kchS1": "Quiet Lunch",
      "kchS2": "Two-Sear Rush",
      "kchS3": "Long Cooks",
      "kchS4": "Jammed Station",
      "kchS5": "The Dinner Push",
      "kchS6": "House Full",
      "kchS7": "Duck Night",
      "kchS8": "Sauce Chain",
      "kchS9": "Jammed Line",
      "kchS10": "Closing Rush",
      "kchRGarden": "garden salad",
      "kchRFillet": "seared fillet",
      "kchRDuck": "duck with orange",
      "kchRSauce": "sauce pot",
      "kchClockLabel": "Clock",
      "kchCoversLabel": "Covers",
      "kchPointsLabel": "Paid",
      "kchHeartsLabel": "Hearts",
      "kchClockValue": "{n}s",
      "kchCoversValue": "{n} of {m}",
      "kchPointsValue": "{n} pts",
      "kchHeartsValue": "{n} left",
      "kchBoardName": "Board",
      "kchPanName": "Pan",
      "kchPassName": "Pass",
      "kchRailTitle": "Ticket rail",
      "kchRailAria": "Ticket rail: choose which order to serve next",
      "kchTicketLine": "{n} {name}, {s}s left - {w}",
      "kchTicketSoon": "ticket in {n}s",
      "kchOpenWord": "on the fly",
      "kchPaidWord": "paid",
      "kchLostWord": "walked",
      "kchRestWord": "resting",
      "kchColdWord": "cold",
      "kchIdleWord": "idle",
      "kchWaitWord": "waiting",
      "kchChopWord": "chopping",
      "kchSearWord": "searing",
      "kchSimmerWord": "simmering",
      "kchReadyWord": "in the band",
      "kchBurntWord": "burnt",
      "kchMushWord": "mushed",
      "kchPlateWord": "ready to plate",
      "kchPlatedWord": "plated",
      "kchJamWord": "jammed",
      "kchThisTicket": "this ticket",
      "kchNoTicket": "No ticket in hand yet.",
      "kchStationStatus": "{word} {n}%",
      "kchStationAria": "{station} station, {state}, {n} percent",
      "kchStationDetail": "{name}: {a} of {b} steps in the band",
      "kchCutsLine": "{name}: {a} of {b} cuts - stop before {b}",
      "kchBurnClock": "{name} burns in {n}s - pass it now",
      "kchHoldLine": "{name} holds for {n}s before it goes cold",
      "kchPullOff": "Take {name} off the heat",
      "kchRackLine": "Rack {a} of {b}",
      "kchJamWork": "Work this station to clear the jam",
      "kchServiceSelectLabel": "Choose a service",
      "kchBandLine": "Covers for 3/2/1 stars: {a}/{b}/{c} - best {best}",
      "kchBtnStart": "Start Service",
      "kchBtnPause": "Pause Service",
      "kchBtnResume": "Resume Service",
      "kchBtnCalm": "Calm service: {state}",
      "kchCalmOn": "on",
      "kchCalmOff": "off",
      "kchPrompt": "{name}: {n} tickets over a {w} second service. Everything on the heat keeps cooking while you walk.",
      "kchReady": "The board is yours. Start the service when you are ready.",
      "kchPaused": "Service paused - nothing is cooking. Resume to carry on.",
      "kchTicketIn": "Ticket {n}: {name}, {s}s on the clock.",
      "kchPlatedMsg": "{name} plated - {p} pts on the way.",
      "kchRestedMsg": "{name} is off the heat and on the rack.",
      "kchServedMsg": "{name} paid {p} pts, {t} in tips - {c} covers.",
      "kchColdMsg": "{name} went out cold - only {p} pts.",
      "kchBurntMsg": "{name} burnt on the pan!",
      "kchMushMsg": "{name} was over-chopped to mush.",
      "kchLateMsg": "{name} walked past its deadline.",
      "kchRejectMsg": "No pass: {msg}",
      "kchWhyNone": "There is no ticket in hand.",
      "kchWhyRaw": "{name} is still short of its band.",
      "kchWhyRack": "The rack is full - plate something first.",
      "kchWhyDone": "{name} is already on its way out.",
      "kchWhyLate": "{name} missed its window.",
      "kchJamMsg": "The {station} station jammed - work it to clear it.",
      "kchJamClearMsg": "The {station} station is free again.",
      "kchOverMsg": "Service closed: {c} covers, {p} pts, {l} lost - {s} stars.",
      "kchHeartsMsg": "Three tickets lost and the line gave up.",
      "kchNextMsg": "Next service unlocked.",
      "kchAllMsg": "Every service is on the board.",
      "kchHint": "1/2/3 or Tab picks a station, Space or Enter works it - hold it on the pan - and the arrows change the ticket. A step stopped inside its band pays a tip.",
      "logKitchenRelay": "Ran {name} and covered {c} tickets",
    },
    zh: {
      "tabKitchenRelay": "厨房接力",
      "kchS1": "悠闲午市",
      "kchS2": "双煎高峰",
      "kchS3": "慢火长煎",
      "kchS4": "灶台卡住",
      "kchS5": "晚市冲刺",
      "kchS6": "满座晚市",
      "kchS7": "鸭胸之夜",
      "kchS8": "酱汁连环",
      "kchS9": "全线卡灶",
      "kchS10": "打烊冲刺",
      "kchRGarden": "田园沙拉",
      "kchRFillet": "香煎鱼排",
      "kchRDuck": "橙香鸭胸",
      "kchRSauce": "酱汁锅",
      "kchClockLabel": "时间",
      "kchCoversLabel": "出单",
      "kchPointsLabel": "收入",
      "kchHeartsLabel": "机会",
      "kchClockValue": "剩 {n} 秒",
      "kchCoversValue": "{n} / {m}",
      "kchPointsValue": "{n} 分",
      "kchHeartsValue": "剩 {n} 次",
      "kchBoardName": "砧板",
      "kchPanName": "煎锅",
      "kchPassName": "出菜口",
      "kchRailTitle": "点单队列",
      "kchRailAria": "点单队列：选择下一道要做的菜",
      "kchTicketLine": "{n} {name}，还剩 {s} 秒 - {w}",
      "kchTicketSoon": "{n} 秒后来单",
      "kchOpenWord": "制作中",
      "kchPaidWord": "已结账",
      "kchLostWord": "已超时",
      "kchRestWord": "保温中",
      "kchColdWord": "已凉",
      "kchIdleWord": "空闲",
      "kchWaitWord": "等待",
      "kchChopWord": "切配",
      "kchSearWord": "煎制",
      "kchSimmerWord": "收汁",
      "kchReadyWord": "刚好到位",
      "kchBurntWord": "煎糊了",
      "kchMushWord": "切过头了",
      "kchPlateWord": "可以装盘",
      "kchPlatedWord": "已装盘",
      "kchJamWord": "卡住了",
      "kchThisTicket": "这张单",
      "kchNoTicket": "手上还没有正在做的单。",
      "kchStationStatus": "{word} {n}%",
      "kchStationAria": "{station}台，{state}，进度 {n}%",
      "kchStationDetail": "{name}：{b} 步里已有 {a} 步到位",
      "kchCutsLine": "{name}：已切 {a} 刀 / 共 {b} 刀，别再切过头",
      "kchBurnClock": "{name}再过 {n} 秒就糊 - 赶紧出菜",
      "kchHoldLine": "{name}还能撑 {n} 秒，之后就凉",
      "kchPullOff": "先把{name}离火",
      "kchRackLine": "保温架 {a} / {b}",
      "kchJamWork": "连续操作这个灶台把它修好",
      "kchServiceSelectLabel": "选择一场服务",
      "kchBandLine": "三星/二星/一星出单数：{a}/{b}/{c} - 最好 {best}",
      "kchBtnStart": "开始服务",
      "kchBtnPause": "暂停服务",
      "kchBtnResume": "继续服务",
      "kchBtnCalm": "舒缓模式：{state}",
      "kchCalmOn": "开启",
      "kchCalmOff": "关闭",
      "kchPrompt": "{name}：{w} 秒里会来 {n} 张单。你走开的每一秒，锅上的东西都还在熟。",
      "kchReady": "灶台归你了。准备好就开始。",
      "kchPaused": "服务已暂停 - 火上的时间停住了，点继续接着做。",
      "kchTicketIn": "第 {n} 张单：{name}，还有 {s} 秒。",
      "kchPlatedMsg": "{name}已装盘 - 应付 {p} 分。",
      "kchRestedMsg": "{name}已离火，放上保温架。",
      "kchServedMsg": "{name}结账 {p} 分，小费 {t} 分 - 共出单 {c}。",
      "kchColdMsg": "{name}凉着上桌 - 只收到 {p} 分。",
      "kchBurntMsg": "{name}在锅里煎糊了！",
      "kchMushMsg": "{name}被切成了泥。",
      "kchLateMsg": "{name}过了截止时间，这单丢了。",
      "kchRejectMsg": "出不了菜：{msg}",
      "kchWhyNone": "手上还没有正在做的单。",
      "kchWhyRaw": "{name}还没到合格区间。",
      "kchWhyRack": "保温架满了，先出一盘。",
      "kchWhyDone": "{name}已经送出去了。",
      "kchWhyLate": "{name}错过了时间。",
      "kchJamMsg": "{station}台卡住了 - 动手把它修开。",
      "kchJamClearMsg": "{station}台又能用了。",
      "kchOverMsg": "服务结束：出单 {c}，收入 {p} 分，丢了 {l} 单 - {s} 星。",
      "kchHeartsMsg": "连丢三张单，厨房提前收工。",
      "kchNextMsg": "解锁下一场服务。",
      "kchAllMsg": "所有服务都打完了。",
      "kchHint": "1/2/3 或 Tab 选灶台，空格或回车操作它（煎锅要按住），方向键换单。步骤停在合格区间里才有小费。",
      "logKitchenRelay": "跑完{name}，出了 {c} 单",
    },
  });

  App.registerGame({
    name: "kitchenRelay",
    tabKey: "tabKitchenRelay",
    init: initKitchenRelayGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="10" width="32" height="26" rx="4" fill="none" stroke="#8bd3ff" stroke-width="1.6"/>' +
        '<path d="M12 15v16M19 15v16M26 15v16" stroke="#8bd3ff" stroke-width="1.3"/>' +
        '<circle cx="60" cy="23" r="14" fill="none" stroke="#ff8a5c" stroke-width="1.6"/>' +
        '<path d="M74 23h12" stroke="#ff8a5c" stroke-width="2"/>' +
        '<path d="M53 23q7-8 14 0" fill="none" stroke="#a3e635" stroke-width="1.6"/>' +
        '<rect x="92" y="13" width="24" height="21" rx="4" fill="none" stroke="#f5c66b" stroke-width="1.6"/>' +
        '<circle cx="104" cy="23" r="6" fill="none" stroke="#f5c66b" stroke-width="1.3"/>' +
        '<path d="M6 50h108" stroke="#94a3b8" stroke-width="1"/>' +
        '<text x="20" y="65" font-size="9" fill="#94a3b8" text-anchor="middle">1 board</text>' +
        '<text x="60" y="65" font-size="9" fill="#94a3b8" text-anchor="middle">2 pan</text>' +
        '<text x="102" y="65" font-size="9" fill="#94a3b8" text-anchor="middle">3 pass</text>' +
        "</svg>",
      en: [
        "Goal: cover as many tickets as you can before the two minute service closes, without losing three tickets.",
        "Action: 1/2/3 or Tab picks a station and Space or Enter works it - the board takes one press per cut, the pan is a hold you release inside the band, the pass plates and then serves.",
        "Twist: everything on the heat keeps cooking while your hands are somewhere else, so the sauce you left to save another dish is the one that crosses into burnt.",
        "Rescue: a sear that is in its band but not yet dinner comes off the heat onto the rack - the rack holds two dishes and resting food still goes cold.",
        "Scoring: paid tickets are covers, a step stopped inside its perfect band pays tips, and a burnt or walked ticket costs points plus one of your three chances.",
      ],
      zh: [
        "目标：在两分钟的服务结束前尽可能多出单，同时别连丢三张单。",
        "操作：1/2/3 或 Tab 选灶台，空格或回车操作它 - 砧板按一下切一刀，煎锅要按住并在合格区间松手，出菜口先装盘再上菜。",
        "关键：你走开的时候锅上照样在熟，为了救另一道菜而离开的那几秒，正好会把酱汁煎糊。",
        "抢救：已经到位但整道菜还没做完的，要离火放上保温架 - 架子只放两份，放着不管一样会凉。",
        "计分：结账的单据数就是出单数，步骤停在完美区间里给小费，煎糊或超时要扣分并吃掉三次机会里的一次。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initKitchenRelayGame = initKitchenRelayGame;
  App.kitchenStep = kitchenStep;
  App.kitchenServe = kitchenServe;
  App.kitchenCovers = kitchenCovers;
  App.kitchenBands = kchBands;
  App.kitchenBeatable = kitchenBeatable;
  App.kitchenPlan = kitchenPlan;
  App.kitchenMakeService = kitchenMakeService;
  App.kitchenLevels = kchLevels;
  App.kitchenRecipes = kchRecipes;
  App.quietResetKitchenRelay = function () {
    if (kchQuiet) { kchQuiet(); }
  };
})(window.CapitalConvert = window.CapitalConvert || {});
