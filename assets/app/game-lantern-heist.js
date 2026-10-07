/* Lantern Heist - a turn-based stealth puzzle inside an eight-by-eight room.
 * Rooms are hand-authored and each ships the walk that clears it, so the
 * drawer can never deal a plan the ledger cannot leave. Guards resolve after
 * every player turn, which keeps the whole game deterministic. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var lheCanvas = 360;
  var lhePad = 6;
  /* The cone runs three blocks ahead, one block wide at its outer edge. */
  var lheCone = 3;
  /* A two-block dash is loud: a guard this close (Manhattan) turns on you. */
  var lheHear = 2;
  var lheAlarmLimit = 3;

  /* plan legend: # block, L locker, G ledger, E exit, = locked gate, S start */
  var lheRooms = [
    {
      id: "h1",
      labelKey: "lheR1",
      plan: [
        "##......",
        "...#...G",
        "........",
        "..#.#.#.",
        "........",
        "#...#...",
        "........",
        "S.....E.",
      ],
      guards: [{ loop: [[1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [6, 4], [5, 4], [4, 4], [3, 4], [2, 4]] }],
      starTurns: [16, 19, 24],
      solution: "ruuuURRuRaDDlD",
    },
    {
      id: "h2",
      labelKey: "lheR2",
      plan: [
        "........",
        ".####...",
        "...#..G.",
        "........",
        ".#...#..",
        "..#..#..",
        "E.......",
        "S.......",
      ],
      guards: [
        { loop: [[1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [5, 3], [4, 3], [3, 3], [2, 3]] },
        { loop: [[5, 0], [5, 1], [5, 2], [5, 3], [5, 2], [5, 1]] },
      ],
      starTurns: [17, 20, 25],
      solution: "rrRrRUuUlaDDLLL",
    },
    {
      id: "h3",
      labelKey: "lheR3",
      plan: [
        "...#...G",
        ".....#..",
        ".#......",
        "...#....",
        "........",
        "..#....#",
        ".#..#...",
        "S.....E.",
      ],
      guards: [
        { loop: [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 4], [4, 3], [4, 2], [4, 1]] },
        { loop: [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [5, 4], [4, 4], [3, 4], [2, 4], [1, 4]] },
      ],
      starTurns: [24, 28, 34],
      solution: "rlrlrrrrrruUrUUaldddDD",
    },
    {
      id: "h4",
      labelKey: "lheR4",
      plan: [
        "......G.",
        ".####.#.",
        "...L....",
        ".#....#.",
        "..L.#...",
        ".#......",
        "....L...",
        "S.....E.",
      ],
      guards: [
        { loop: [[7, 0], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [7, 5], [7, 4], [7, 3], [7, 2], [7, 1]] },
        { loop: [[1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [5, 6], [4, 6], [3, 6], [2, 6]] },
        { loop: [[2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [5, 2], [4, 2], [3, 2]] },
      ],
      starTurns: [23, 27, 33],
      solution: "rlrlUuUUrRRralddDrddd",
    },
    {
      id: "h5",
      labelKey: "lheR5",
      plan: [
        ".....#G#",
        ".....#=#",
        "..##....",
        ".....#..",
        ".##..#..",
        "......#.",
        "..#.....",
        "S......E",
      ],
      guards: [
        { loop: [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 5], [4, 4], [4, 3], [4, 2], [4, 1]] },
        { loop: [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [4, 5], [3, 5], [2, 5], [1, 5]] },
        { loop: [[3, 7], [4, 7], [5, 7], [6, 7], [5, 7], [4, 7]] },
        { loop: [[0, 0], [1, 0], [1, 1], [0, 1]] },
      ],
      starTurns: [31, 36, 44],
      solution: "rlrluuUrrrllrrlrrurraUadDrDdd",
    },
  ];

  function lheKey(x, y) {
    return x + "," + y;
  }

  function lheSign(value) {
    return value > 0 ? 1 : value < 0 ? -1 : 0;
  }

  function lheParse(room) {
    var side = room.plan.length;
    var parsed = {
      side: side,
      blocked: {},
      lockers: {},
      gates: {},
      start: { x: 0, y: 0 },
      ledger: null,
      exit: null,
    };
    for (var y = 0; y < side; y += 1) {
      for (var x = 0; x < side; x += 1) {
        var ch = room.plan[y].charAt(x);
        var key = lheKey(x, y);
        if (ch === "#") {
          parsed.blocked[key] = true;
        } else if (ch === "L") {
          parsed.lockers[key] = true;
        } else if (ch === "=") {
          parsed.blocked[key] = true;
          parsed.gates[key] = true;
        } else if (ch === "S") {
          parsed.start = { x: x, y: y };
        } else if (ch === "G") {
          parsed.ledger = { x: x, y: y };
        } else if (ch === "E") {
          parsed.exit = { x: x, y: y };
        }
      }
    }
    return parsed;
  }

  /* A closed gate blocks sight as hard as it blocks the way. */
  function lheCells(room, state) {
    var parsed = lheParse(room);
    var cells = { side: parsed.side, blocked: {}, lockers: parsed.lockers, gates: parsed.gates };
    var key;
    for (key in parsed.blocked) {
      if (parsed.blocked[key]) {
        cells.blocked[key] = true;
      }
    }
    for (key in state.gates) {
      if (state.gates[key]) {
        delete cells.blocked[key];
      }
    }
    return cells;
  }

  function lheGuard(room, state, index) {
    var loop = room.guards[index].loop;
    var gs = (state.guards && state.guards[index]) || { i: 0, frozen: 0, spent: false };
    var i = ((gs.i % loop.length) + loop.length) % loop.length;
    var cell = loop[i];
    var next = loop[(i + 1) % loop.length];
    return {
      x: cell[0],
      y: cell[1],
      dx: lheSign(next[0] - cell[0]),
      dy: lheSign(next[1] - cell[1]),
      index: i,
      frozen: gs.frozen,
      spent: !!gs.spent,
    };
  }

  /* Pure: the blocks a single guard can light up right now. `cells` is
   * { side, blocked } so a caller can shadow the cone with walls. */
  function lheVision(guard, cells) {
    var side = cells.side;
    var out = [];
    var px = -guard.dy;
    var py = guard.dx;
    for (var fwd = 1; fwd <= lheCone; fwd += 1) {
      var width = fwd === 1 ? 0 : 1;
      for (var lat = -width; lat <= width; lat += 1) {
        var x = guard.x + guard.dx * fwd + px * lat;
        var y = guard.y + guard.dy * fwd + py * lat;
        if (x < 0 || y < 0 || x >= side || y >= side) {
          continue;
        }
        if (!lheClear(guard, { x: x, y: y }, cells)) {
          continue;
        }
        out.push({ x: x, y: y });
      }
    }
    return out;
  }

  /* Sampling the segment keeps the block shadows honest for diagonal edges
   * without a full Bresenham implementation. */
  function lheClear(from, to, cells) {
    var run = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
    var steps = Math.max(1, run) * 4;
    for (var i = 1; i < steps; i += 1) {
      var x = from.x + ((to.x - from.x) * i) / steps;
      var y = from.y + ((to.y - from.y) * i) / steps;
      if (cells.blocked[lheKey(Math.round(x), Math.round(y))]) {
        return false;
      }
    }
    return true;
  }

  function lheCones(room, state) {
    var cells = lheCells(room, state);
    var lit = {};
    for (var i = 0; i < room.guards.length; i += 1) {
      var guard = lheGuard(room, state, i);
      var cone = lheVision(guard, cells);
      for (var c = 0; c < cone.length; c += 1) {
        lit[lheKey(cone[c].x, cone[c].y)] = true;
      }
    }
    return { lit: lit, cells: cells };
  }

  function lheCopy(state) {
    var src = state || {};
    var guards = [];
    var list = src.guards || [];
    for (var i = 0; i < list.length; i += 1) {
      guards.push({
        i: list[i].i || 0,
        frozen: list[i].frozen || 0,
        spent: !!list[i].spent,
      });
    }
    var gates = {};
    var key;
    for (key in src.gates || {}) {
      if (src.gates[key]) {
        gates[key] = true;
      }
    }
    var lockers = {};
    for (key in src.lockers || {}) {
      if (src.lockers[key]) {
        lockers[key] = true;
      }
    }
    var pos = src.pos || { x: 0, y: 0 };
    return {
      room: typeof src.room === "number" ? src.room : 0,
      pos: { x: pos.x, y: pos.y },
      guards: guards,
      gates: gates,
      lockers: lockers,
      ledger: !!src.ledger,
      hidden: src.hidden || 0,
      turns: src.turns || 0,
      alarms: src.alarms || 0,
      status: src.status || "play",
      event: src.event || "enter",
      action: src.action || null,
    };
  }

  function lheSetup(index) {
    var pick = parseInt(index, 10);
    if (isNaN(pick)) {
      pick = 0;
    }
    pick = Math.max(0, Math.min(lheRooms.length - 1, pick));
    var room = lheRooms[pick];
    var parsed = lheParse(room);
    var guards = [];
    for (var i = 0; i < room.guards.length; i += 1) {
      guards.push({ i: 0, frozen: 0, spent: false });
    }
    return {
      room: pick,
      pos: { x: parsed.start.x, y: parsed.start.y },
      guards: guards,
      gates: {},
      lockers: {},
      ledger: false,
      hidden: 0,
      turns: 0,
      alarms: 0,
      status: "play",
      event: "enter",
      action: null,
    };
  }

  /* One l -> "move", "L" -> "dash", "a" -> act, "w" -> wait. */
  function lheDecode(code) {
    var up = String(code || "").charAt(0);
    var lower = up.toLowerCase();
    var step = { l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] };
    if (step[lower]) {
      return { type: up === lower ? "move" : "dash", dx: step[lower][0], dy: step[lower][1] };
    }
    if (lower === "a") {
      return { type: "act" };
    }
    return { type: "wait" };
  }

  function lheFree(cells, x, y) {
    if (x < 0 || y < 0 || x >= cells.side || y >= cells.side) {
      return false;
    }
    return !cells.blocked[lheKey(x, y)];
  }

  function lheExpose(room, state, view) {
    if (state.hidden > 0) {
      return false;
    }
    if (view.lit[lheKey(state.pos.x, state.pos.y)]) {
      return true;
    }
    for (var i = 0; i < room.guards.length; i += 1) {
      var guard = lheGuard(room, state, i);
      if (guard.x === state.pos.x && guard.y === state.pos.y) {
        return true;
      }
    }
    return false;
  }

  /* Caught costs the attempt, not the night: the board snaps back to the door
   * and the alarm count carries the failure pressure. */
  function lheCaught(state) {
    var fresh = lheSetup(state.room);
    fresh.alarms = state.alarms + 1;
    fresh.turns = 0;
    fresh.event = "caught";
    if (fresh.alarms >= lheAlarmLimit) {
      fresh.status = "failed";
      fresh.event = "failed";
      return fresh;
    }
    return fresh;
  }

  /* Pure stepper: reads state.action, returns the whole next state. Nothing
   * here touches the DOM, so a room can be replayed block by block. */
  function lheStep(state) {
    if (!state || !lheRooms[state.room] || state.status !== "play") {
      return lheCopy(state);
    }
    var room = lheRooms[state.room];
    var next = lheCopy(state);
    var action = state.action || { type: "wait" };
    var view = lheCones(room, next);
    var cells = view.cells;
    var parsed = lheParse(room);
    var moved = false;
    var loud = false;

    if (action.type === "move") {
      var tx = next.pos.x + (action.dx || 0);
      var ty = next.pos.y + (action.dy || 0);
      if (lheFree(cells, tx, ty)) {
        next.pos = { x: tx, y: ty };
        moved = true;
      }
    } else if (action.type === "dash") {
      var mx = next.pos.x + (action.dx || 0);
      var my = next.pos.y + (action.dy || 0);
      var dx2 = next.pos.x + (action.dx || 0) * 2;
      var dy2 = next.pos.y + (action.dy || 0) * 2;
      if (lheFree(cells, mx, my) && lheFree(cells, dx2, dy2)) {
        next.pos = { x: dx2, y: dy2 };
        moved = true;
        loud = true;
      }
    } else if (action.type === "act") {
      if (
        parsed.ledger &&
        !next.ledger &&
        parsed.ledger.x === next.pos.x &&
        parsed.ledger.y === next.pos.y
      ) {
        next.ledger = true;
        next.event = "grabbed";
      } else {
        var opened = lheForceGate(next, cells, parsed);
        if (!opened) {
          next.event = "idle";
        }
      }
    } else {
      next.event = "waited";
    }

    if (!moved && (action.type === "move" || action.type === "dash")) {
      next.event = "bump";
      next.action = null;
      return next;
    }

    /* A swing at thin air is feedback only - it never spends a turn. */
    if (action.type === "act" && (next.event === "idle" || next.event === "locked")) {
      next.action = null;
      return next;
    }

    if (lheKey(next.pos.x, next.pos.y) in parsed.lockers && !next.lockers[lheKey(next.pos.x, next.pos.y)]) {
      next.lockers[lheKey(next.pos.x, next.pos.y)] = true;
      next.hidden = 1;
      next.event = "hid";
    } else if (moved) {
      next.event = "moved";
    }

    if (loud) {
      var best = -1;
      var bestRun = Infinity;
      for (var g = 0; g < room.guards.length; g += 1) {
        var guard = lheGuard(room, next, g);
        var run = Math.abs(guard.x - next.pos.x) + Math.abs(guard.y - next.pos.y);
        if (run < bestRun) {
          bestRun = run;
          best = g;
        }
      }
      if (best >= 0 && bestRun <= lheHear) {
        return lheCaught(next);
      }
      /* Noise costs a guard one step, once each - dashing on every turn would
       * otherwise park the whole watch. */
      if (best >= 0 && !next.guards[best].spent) {
        next.guards[best].frozen = 1;
        next.guards[best].spent = true;
        next.event = "stalled";
      } else {
        next.event = "loud";
      }
    }

    next.turns += 1;

    if (next.ledger && parsed.exit && parsed.exit.x === next.pos.x && parsed.exit.y === next.pos.y) {
      next.status = "won";
      next.event = "won";
      next.action = null;
      return next;
    }

    if (lheExpose(room, next, lheCones(room, next))) {
      return lheCaught(next);
    }

    for (var a = 0; a < next.guards.length; a += 1) {
      if (next.guards[a].frozen > 0) {
        next.guards[a].frozen -= 1;
        continue;
      }
      var loop = room.guards[a].loop;
      next.guards[a].i = (next.guards[a].i + 1) % loop.length;
    }

    if (lheExpose(room, next, lheCones(room, next))) {
      return lheCaught(next);
    }

    if (next.hidden > 0) {
      next.hidden -= 1;
    }
    next.action = null;
    return next;
  }

  /* Gates take a turn to spring, which is why the lock is a real obstacle. */
  function lheForceGate(state, cells, parsed) {
    for (var key in parsed.gates) {
      if (!parsed.gates[key] || state.gates[key]) {
        continue;
      }
      var parts = key.split(",");
      var gx = parseInt(parts[0], 10);
      var gy = parseInt(parts[1], 10);
      if (Math.abs(gx - state.pos.x) + Math.abs(gy - state.pos.y) === 1) {
        state.gates[key] = true;
        state.event = "forced";
        return true;
      }
    }
    state.event = "locked";
    return false;
  }

  function lheNeighbours(state, cells) {
    var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    var out = [];
    for (var i = 0; i < dirs.length; i += 1) {
      if (lheFree(cells, state.pos.x + dirs[i][0], state.pos.y + dirs[i][1])) {
        out.push({ x: state.pos.x + dirs[i][0], y: state.pos.y + dirs[i][1] });
      }
    }
    return out;
  }
  App.heistVision = lheVision;
  App.heistStep = lheStep;
  App.heistSetup = lheSetup;
  App.heistRooms = lheRooms;
  App.heistDecode = lheDecode;
  App.heistAlarmLimit = lheAlarmLimit;

  function initLanternHeistGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "lantern-heist-campaign", levels: lheRooms });
    var level = lheRooms[campaign.indexOf(campaign.nextLevelId())];
    var index = campaign.indexOf(level.id);
    var state = lheSetup(index);
    var busy = false;

    var hud = document.createElement("div");
    hud.className = "game-hud";
    var turnsEl = document.createElement("strong");
    var seenEl = document.createElement("strong");
    hud.appendChild(makeStat("lheTurnsLabel", turnsEl));
    hud.appendChild(makeStat("lheSeenLabel", seenEl));

    var canvas = document.createElement("canvas");
    canvas.className = "lhe-canvas lhe-frame";
    canvas.width = lheCanvas;
    canvas.height = lheCanvas;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", t("lheFieldLabel"));

    var legend = document.createElement("p");
    legend.className = "lhe-legend";
    legend.textContent = t("lheLegend");

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var roomRow = document.createElement("div");
    roomRow.className = "elements-row";
    var roomLabel = document.createElement("label");
    roomLabel.className = "elements-label";
    roomLabel.setAttribute("for", "lheRoomSel");
    roomLabel.setAttribute("data-i18n", "lheRoomSelectLabel");
    roomLabel.textContent = t("lheRoomSelectLabel");
    var roomSel = document.createElement("select");
    roomSel.className = "elements-select";
    roomSel.id = "lheRoomSel";
    roomRow.appendChild(roomLabel);
    roomRow.appendChild(roomSel);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var runBtn = document.createElement("button");
    runBtn.type = "button";
    runBtn.className = "primary";
    var runLabel = document.createElement("span");
    runLabel.setAttribute("data-i18n", "lheBtnRun");
    runLabel.textContent = t("lheBtnRun");
    var runContent = document.createElement("span");
    runContent.className = "button-content";
    runContent.appendChild(runLabel);
    runBtn.appendChild(runContent);
    var bestEl = document.createElement("p");
    bestEl.className = "game-best";
    actions.appendChild(runBtn);
    actions.appendChild(bestEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "lheHint");
    hint.textContent = t("lheHint");

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

    [hud, canvas, legend, result, roomRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    var ctx = canvas.getContext("2d");

    function geometry() {
      var side = level.plan.length;
      var cell = Math.floor((lheCanvas - lhePad * 2) / side);
      return {
        side: side,
        cell: cell,
        x0: Math.floor((lheCanvas - cell * side) / 2),
        y0: Math.floor((lheCanvas - cell * side) / 2),
      };
    }

    function refreshPicker() {
      fillCampaignPicker(
        roomSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      roomSel.value = level.id;
      var best = campaign.best(level.id);
      bestEl.textContent =
        t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() }) +
        " \u00b7 " +
        (best > 0 ? t("lheBestTurns", { n: best }) : t("noBest"));
    }

    function renderHud() {
      turnsEl.textContent = t("lheTurnsNow", { n: state.turns, par: level.starTurns[0] });
      seenEl.textContent = t("lheSeenCount", { n: state.alarms, max: lheAlarmLimit });
    }

    function draw() {
      var geo = geometry();
      var view = lheCones(level, state);
      var parsed = lheParse(level);
      var cells = view.cells;
      ctx.clearRect(0, 0, lheCanvas, lheCanvas);
      if (App.world) { App.world.backdrop(ctx, lheCanvas, lheCanvas, "city"); }
      ctx.fillStyle = "rgba(12, 18, 30, 0.92)";
      ctx.fillRect(geo.x0, geo.y0, geo.cell * geo.side, geo.cell * geo.side);

      for (var y = 0; y < geo.side; y += 1) {
        for (var x = 0; x < geo.side; x += 1) {
          var px = geo.x0 + x * geo.cell;
          var py = geo.y0 + y * geo.cell;
          var key = lheKey(x, y);
          if (cells.blocked[key] && !parsed.gates[key]) {
            ctx.fillStyle = "rgba(51, 65, 85, 0.95)";
            ctx.fillRect(px + 1, py + 1, geo.cell - 2, geo.cell - 2);
          } else if (view.lit[key]) {
            ctx.fillStyle = "rgba(251, 191, 36, 0.2)";
            ctx.fillRect(px + 1, py + 1, geo.cell - 2, geo.cell - 2);
            ctx.fillStyle = "rgba(251, 191, 36, 0.75)";
            ctx.fillRect(px + geo.cell / 2 - 1, py + geo.cell / 2 - 1, 3, 3);
          }
          ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, geo.cell, geo.cell);
        }
      }

      markCell(parsed.lockers, "K", function (key) {
        return state.lockers[key] ? "rgba(148, 163, 184, 0.4)" : "#94a3b8";
      });
      markCell(parsed.gates, "=", function (key) {
        return state.gates[key] ? "#a3e635" : "#fb7185";
      });
      if (parsed.ledger) {
        glyph(parsed.ledger.x, parsed.ledger.y, "G", state.ledger ? "rgba(163,230,53,.35)" : "#a3e635");
      }
      if (parsed.exit) {
        glyph(parsed.exit.x, parsed.exit.y, "X", state.ledger ? "#4ade80" : "rgba(148,163,184,.7)");
      }

      /* Neighbours the pointer can take, so the click path is legible. */
      var steps = lheNeighbours(state, cells);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(0, 242, 255, 0.45)";
      for (var s = 0; s < steps.length; s += 1) {
        ctx.strokeRect(geo.x0 + steps[s].x * geo.cell + 3.5, geo.y0 + steps[s].y * geo.cell + 3.5, geo.cell - 6, geo.cell - 6);
      }
      ctx.setLineDash([]);

      for (var g = 0; g < level.guards.length; g += 1) {
        drawGuard(g, geo);
      }

      var bx = geo.x0 + state.pos.x * geo.cell;
      var by = geo.y0 + state.pos.y * geo.cell;
      ctx.fillStyle = state.hidden > 0 ? "rgba(34, 211, 238, 0.35)" : "#22d3ee";
      ctx.beginPath();
      ctx.moveTo(bx + geo.cell / 2, by + 4);
      ctx.lineTo(bx + geo.cell - 4, by + geo.cell / 2);
      ctx.lineTo(bx + geo.cell / 2, by + geo.cell - 4);
      ctx.lineTo(bx + 4, by + geo.cell / 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#08111c";
      ctx.font = "bold " + Math.floor(geo.cell * 0.5) + "px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (App.world) { App.world.piece(ctx, "agent", bx + geo.cell / 2, by + geo.cell / 2, geo.cell - 6, state.hidden > 0 ? "#56787f" : "#99dfd9"); }
      else { ctx.fillText("@", bx + geo.cell / 2, by + geo.cell / 2 + 1); }
    }

    function glyph(x, y, text, color) {
      var geo = geometry();
      var px = geo.x0 + x * geo.cell;
      var py = geo.y0 + y * geo.cell;
      ctx.fillStyle = color;
      ctx.font = "bold " + Math.floor(geo.cell * 0.52) + "px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var icon = text === "K" ? "key" : text === "G" ? "book" : "door";
      if (App.world) { App.world.piece(ctx, icon, px + geo.cell / 2, py + geo.cell / 2, geo.cell - 9, color); }
      else { ctx.fillText(text, px + geo.cell / 2, py + geo.cell / 2 + 1); }
    }

    function markCell(map, letter, colorFor) {
      for (var key in map) {
        if (!map[key]) {
          continue;
        }
        var parts = key.split(",");
        var x = parseInt(parts[0], 10);
        var y = parseInt(parts[1], 10);
        glyph(x, y, letter, colorFor(key));
      }
    }

    function drawGuard(g, geo) {
      var guard = lheGuard(level, state, g);
      var cx = geo.x0 + guard.x * geo.cell + geo.cell / 2;
      var cy = geo.y0 + guard.y * geo.cell + geo.cell / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, geo.cell * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = guard.frozen > 0 ? "rgba(34, 211, 238, 0.55)" : "#ff6b35";
      ctx.fill();
      ctx.fillStyle = "#08111c";
      ctx.font = "bold " + Math.floor(geo.cell * 0.36) + "px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(g + 1), cx, cy + 1);
      if (guard.frozen > 0) {
        ctx.fillStyle = "#22d3ee";
        ctx.font = "bold " + Math.floor(geo.cell * 0.3) + "px 'JetBrains Mono', monospace";
        ctx.fillText("z", cx - geo.cell * 0.3, cy - geo.cell * 0.28);
      }
      if (guard.spent) {
        ctx.fillStyle = "rgba(226, 232, 240, 0.6)";
        ctx.font = "bold " + Math.floor(geo.cell * 0.3) + "px 'JetBrains Mono', monospace";
        ctx.fillText("-", cx + geo.cell * 0.3, cy + geo.cell * 0.28);
      }
      /* The facing tick doubles as the cone direction, for no colour cost. */
      ctx.strokeStyle = "#ff6b35";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + guard.dx * geo.cell * 0.46, cy + guard.dy * geo.cell * 0.46);
      ctx.stroke();
    }

    function say(event) {
      var map = {
        grabbed: t("lheGrabbed"),
        forced: t("lheForced"),
        hid: t("lheHid"),
        stalled: t("lheStalled"),
        loud: t("lheLoud"),
        locked: t("lheLocked"),
        idle: t("lheIdle"),
        bump: t("lheBump"),
        waited: t("lheWaited"),
        moved: "",
        caught: t("lheCaught", { n: state.alarms, max: lheAlarmLimit }),
        failed: t("lheFailed"),
        won: "",
      };
      return map[event] === undefined ? "" : map[event];
    }

    function play(code) {
      if (busy) {
        return;
      }
      /* A second click on the same tile is a stutter, not a second turn. */
      if (state.status !== "play") {
        return;
      }
      busy = true;
      try {
        state = lheStep({
          room: state.room,
          pos: state.pos,
          guards: state.guards,
          gates: state.gates,
          lockers: state.lockers,
          ledger: state.ledger,
          hidden: state.hidden,
          turns: state.turns,
          alarms: state.alarms,
          status: state.status,
          event: state.event,
          action: lheDecode(code),
        });
        renderHud();
        draw();
        var line = say(state.event);
        if (state.status === "won") {
          finish();
        } else if (state.status === "failed") {
          result.textContent = line;
        } else if (line) {
          result.textContent = line;
        }
      } finally {
        /* The latch has to release whatever the shell did downstream, or one
         * bad callback would freeze the room for the rest of the session. */
        busy = false;
      }
    }

    function finish() {
      var starsWon = starsFor(state.turns, level.starTurns, "low");
      var outcome = campaign.record(level.id, {
        stars: starsWon,
        best: state.turns,
        better: "low",
      });
      var message = t("lheWon", { n: state.turns, s: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("lheNextRoom");
      } else if (campaign.clearedCount() === lheRooms.length) {
        message += " " + t("lheCampaignDone");
      }
      result.textContent = message;
      logAction(t("logLanternHeist", { n: state.turns }));
      var rect = runBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function loadRoom(def) {
      level = def;
      index = campaign.indexOf(def.id);
      state = lheSetup(index);
      renderHud();
      refreshPicker();
      draw();
      result.textContent = t("lhePrompt", {
        name: t(def.labelKey),
        n: def.starTurns[0],
      });
    }

    function cellFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return null;
      }
      var geo = geometry();
      var px = (event.clientX - rect.left) * (canvas.width / rect.width);
      var py = (event.clientY - rect.top) * (canvas.height / rect.height);
      var x = Math.floor((px - geo.x0) / geo.cell);
      var y = Math.floor((py - geo.y0) / geo.cell);
      if (x < 0 || y < 0 || x >= geo.side || y >= geo.side) {
        return null;
      }
      return { x: x, y: y };
    }

    /* One tile under the pointer does everything: your own tile is the act
     * button, a neighbour walks, the tile two away dashes. */
    function clickCell(cell) {
      var dx = cell.x - state.pos.x;
      var dy = cell.y - state.pos.y;
      if (dx === 0 && dy === 0) {
        play("a");
        return;
      }
      if (Math.abs(dx) + Math.abs(dy) === 1) {
        play(dx === -1 ? "l" : dx === 1 ? "r" : dy === -1 ? "u" : "d");
        return;
      }
      if ((Math.abs(dx) === 2 && dy === 0) || (Math.abs(dy) === 2 && dx === 0)) {
        play(dx === -2 ? "L" : dx === 2 ? "R" : dy === -2 ? "U" : "D");
      }
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var cell = cellFromEvent(event);
      if (cell) {
        clickCell(cell);
      }
    });

    canvas.addEventListener("keydown", function (event) {
      var moves = {
        ArrowLeft: "l",
        ArrowRight: "r",
        ArrowUp: "u",
        ArrowDown: "d",
      };
      if (moves[event.key]) {
        event.preventDefault();
        play(event.shiftKey ? moves[event.key].toUpperCase() : moves[event.key]);
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        play("a");
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        play("w");
      }
    });

    roomSel.addEventListener("change", function () {
      var pick = campaign.indexOf(roomSel.value);
      if (pick < 0) {
        return;
      }
      if (!campaign.isUnlocked(roomSel.value)) {
        roomSel.value = level.id;
        result.textContent = t("lheLockedRoom", { name: t(lheRooms[pick].labelKey) });
        return;
      }
      loadRoom(lheRooms[pick]);
    });

    runBtn.addEventListener("click", function () {
      loadRoom(level);
    });

    loadRoom(lheRooms[index]);
  }

  /* Bilingual copy travels with the game: addStrings only fills keys i18n.js
   * does not already own, so the shared dictionary stays authoritative. */
  App.addStrings({
    en: {
      "tabLanternHeist": "Lantern Heist",
      "lheR1": "Counting Room",
      "lheR2": "Two Shadows",
      "lheR3": "Crossing Lights",
      "lheR4": "Locker Bank",
      "lheR5": "The Bonded Door",
      "lheTurnsLabel": "Turns",
      "lheSeenLabel": "Alarms",
      "lheRoomSelectLabel": "Pick a room",
      "lheBtnRun": "New Run",
      "lheFieldLabel": "Eight by eight room plan. Arrow keys walk, Shift plus arrow dashes, Space grabs or forces, Enter waits.",
      "lheTurnsNow": "{n} / par {par}",
      "lheSeenCount": "{n} of {max}",
      "lheLegend": "@ you \u00b7 G ledger \u00b7 X exit \u00b7 K locker \u00b7 = gate \u00b7 1-4 guards \u00b7 z stalled \u00b7 amber cone",
      "lhePrompt": "{name}: take the ledger from G, then reach X. Par is {n} turns.",
      "lheGrabbed": "The ledger is in your coat.",
      "lheForced": "The gate springs open.",
      "lheLocked": "Nothing gives. Stand beside a gate and press Space again.",
      "lheIdle": "You pat an empty tile.",
      "lheBump": "Something is in the way.",
      "lheHid": "You fold into a locker - one turn of cover, once each.",
      "lheStalled": "The noise costs that guard its next step.",
      "lheLoud": "Your dash echoed - that guard has already lost a step to it.",
      "lheWaited": "You hold still and let the lamps swing.",
      "lheMoved": "",
      "lheCaught": "A cone finds you. Back to the door - alarm {n} of {max}.",
      "lheFailed": "Three alarms: the house wakes and the run is over.",
      "lheWon": "Out with the ledger in {n} turns - {s} stars.",
      "lheBestTurns": "best {n} turns",
      "lheNextRoom": "Next room unlocked.",
      "lheCampaignDone": "Every room cleaned out.",
      "lheLockedRoom": "{name} is still bolted shut - clear the room before it first.",
      "lheHint": "One block is silent. A two-block dash stalls the nearest guard, but a guard within two blocks hears it and turns on you.",
      "logLanternHeist": "Cleaned the {n}-turn room",
    },
    zh: {
      "tabLanternHeist": "灯笼窃案",
      "lheR1": "账房",
      "lheR2": "两道影子",
      "lheR3": "交错的灯",
      "lheR4": "储物柜间",
      "lheR5": "锁死的门",
      "lheTurnsLabel": "回合",
      "lheSeenLabel": "警报",
      "lheRoomSelectLabel": "选择房间",
      "lheBtnRun": "重新潜入",
      "lheFieldLabel": "八乘八房间平面图：方向键走一格，加 Shift 冲两格，空格拿取或撬门，回车原地等一回合。",
      "lheTurnsNow": "{n} / 标准 {par}",
      "lheSeenCount": "{n} / {max}",
      "lheLegend": "@ 你 \u00b7 G 账册 \u00b7 X 出口 \u00b7 K 储物柜 \u00b7 = 铁门 \u00b7 1-4 守卫 \u00b7 z 被定住 \u00b7 琥珀色是视野",
      "lhePrompt": "{name}：先从 G 拿到账册，再走到 X。标准是 {n} 回合。",
      "lheGrabbed": "账册已经塞进外套。",
      "lheForced": "铁门弹开了。",
      "lheLocked": "纹丝不动。站到门旁边再按空格。",
      "lheIdle": "你摸了摸空地板。",
      "lheBump": "前面挡着东西。",
      "lheHid": "你缩进储物柜——只挡一回合，每只柜子只能进一次。",
      "lheStalled": "这声动静让那名守卫少迈了一步。",
      "lheLoud": "冲刺的回声传开了——那名守卫已经吃过一次亏了。",
      "lheWaited": "你屏住呼吸，让灯影扫过去。",
      "lheMoved": "",
      "lheCaught": "被灯照见了。退回门口——警报 {n}/{max}。",
      "lheFailed": "三次警报，整座宅子醒了，这趟作废。",
      "lheWon": "{n} 回合带着账册脱身 - 获得 {s} 星。",
      "lheBestTurns": "最佳 {n} 回合",
      "lheNextRoom": "解锁下一个房间。",
      "lheCampaignDone": "所有房间都被洗劫一空。",
      "lheLockedRoom": "「{name}」还锁着——先通过它前面的房间。",
      "lheHint": "走一格没有声音。冲两格能定住最近的守卫，但两格内有守卫就会听见动静。",
      "logLanternHeist": "用 {n} 回合办完了这票",
    },
  });

  App.registerGame({
    name: "lanternHeist",
    tabKey: "tabLanternHeist",
    init: initLanternHeistGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M24 12v52M46 12v52M68 12v52M90 12v52M12 26h96M12 42h96M12 58h96" stroke="rgba(148,163,184,.22)"/>' +
        '<path d="M68 26l16 8-16 8z" fill="rgba(251,191,36,.35)"/>' +
        '<circle cx="62" cy="34" r="6" fill="#ff6b35"/>' +
        '<rect x="34" y="18" width="10" height="10" fill="rgba(51,65,85,.95)"/>' +
        '<text x="88" y="22" font-size="9" fill="#a3e635" text-anchor="middle">G</text>' +
        '<text x="20" y="66" font-size="9" fill="#22d3ee" text-anchor="middle">@</text>' +
        '<text x="98" y="66" font-size="9" fill="#4ade80" text-anchor="middle">X</text></svg>',
      en: [
        "Aim: pick up the ledger tile, then walk out through the exit tile.",
        "Move: arrows or a click on a neighbour step one block; Shift plus an arrow, or clicking two blocks away, dashes there.",
        "Vision: every guard lights a cone three blocks ahead. Stepping into light, or onto a guard, ends the attempt and puts you back at the door.",
        "Noise: a dash freezes the nearest guard for one turn, but a guard within two blocks of the landing hears it and you are caught.",
        "Tools: Space grabs the ledger or springs an adjacent gate; Enter waits a turn. A locker K hides you for exactly one turn, once.",
        "Scoring: turns decide the stars, and three alarms fail the run for good.",
      ],
      zh: [
        "目标：先踩到账册格，再从出口格走出去。",
        "移动：方向键或点击相邻格走一格；Shift 加方向键、或点击隔两格的直线位置就冲刺。",
        "视野：每名守卫照亮身前三个格格的灯锥。踩进灯里或撞上守卫，本轮作废并回到门口。",
        "声响：冲刺会把最近的守卫定住一回合，但落点两格内有守卫就会听见，当场被拿。",
        "工具：空格拿走账册或撬开旁边的铁门，回车原地等一回合。储物柜 K 只挡一回视线，且只能用一次。",
        "计分：回合数决定星级；三次警报这局彻底失败。",
      ],
    },
  });

  /* Exported for the other modules. */
  App.initLanternHeistGame = initLanternHeistGame;
})(window.CapitalConvert = window.CapitalConvert || {});
