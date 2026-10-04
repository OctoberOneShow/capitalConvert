/* Borrowed Bodies - the asymmetric-ability puzzle in the shared game drawer.
 * One mind, three bodies, and each body opens some edges of the room while it
 * closes others: the moth crosses the chasm but cannot push, the crab pushes and
 * swims but cannot cross dry ground, the eel fits the pipe and the latch but
 * cannot climb. Bodies stay where you leave them, so the exit is only reachable
 * by sequencing possessions - never by any single creature. */
(function (App) {
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var brbCols = 10;
  var brbRows = 6;

  /* The three bodies. `can` is the whole ruleset, and the panel prints it as
   * words so a failed plan is a mistake the player can see coming. */
  var brbBodies = [
    {
      id: "M",
      nameKey: "brbMoth",
      glyph: "\u2708",
      terrain: "._^",
      push: false,
      latch: false,
      pipe: false,
      key: "1",
    },
    {
      id: "C",
      nameKey: "brbCrab",
      glyph: "\u2693",
      terrain: ".~^",
      push: true,
      latch: false,
      pipe: false,
      key: "2",
    },
    {
      id: "E",
      nameKey: "brbEel",
      glyph: "\u224C",
      terrain: ".~P_",
      push: false,
      latch: true,
      pipe: true,
      key: "3",
    },
  ];

  /* Authored rooms. Every one is proved by breadth-first search at load, so a
   * level can never ship without a route; the par the HUD quotes is the measured
   * shortest, not a guess. */
  var brbRooms = [
    {
      id: "b1",
      labelKey: "brbR1",
      map: [
        "##########",
        "#M.._...X#",
        "#.C.....#",
        "#..E....#",
        "#########",
      ],
      mind: "M",
    },
    {
      id: "b2",
      labelKey: "brbR2",
      map: [
        "##########",
        "#M.~~~..X#",
        "#C.~~~...#",
        "#.E......#",
        "#########",
      ],
      mind: "M",
    },
    {
      id: "b3",
      labelKey: "brbR3",
      map: [
        "##########",
        "#E..L....#",
        "#..~~~..X#",
        "#.M...C..#",
        "#########",
      ],
      mind: "E",
    },
    {
      id: "b4",
      labelKey: "brbR4",
      map: [
        "##########",
        "#C..B...X#",
        "#._.._...#",
        "#M...E...#",
        "#########",
      ],
      mind: "C",
    },
    {
      id: "b5",
      labelKey: "brbR5",
      map: [
        "##########",
        "#M.._..L.X#",
        "#.B.~~~..#",
        "#C.E....P#",
        "#########",
      ],
      mind: "M",
    },
    {
      id: "b6",
      labelKey: "brbR6",
      map: [
        "##########",
        "#.....E^C#",
        "#M########",
        "#.....X__#",
        "##########",
      ],
      mind: "C",
    },
    {
      id: "b7",
      labelKey: "brbR7",
      map: [
        "##########",
        "#.#__~..C#",
        "#####.##M#",
        "#BX^^E...#",
        "##########",
      ],
      mind: "M",
    },
    {
      id: "b8",
      labelKey: "brbR8",
      map: [
        "##########",
        "###ME#X^##",
        "###~C#.###",
        "#.^.^_..##",
        "##########",
      ],
      mind: "C",
    },
    {
      id: "b9",
      labelKey: "brbR9",
      map: [
        "##########",
        "#_...^...#",
        "#C##E#####",
        "#..M.~~.X#",
        "##########",
      ],
      mind: "M",
    },
    {
      id: "b10",
      labelKey: "brbR10",
      map: [
        "##########",
        "#_#_.E...#",
        "#.###M##.#",
        "#X.__~~C.#",
        "##########",
      ],
      mind: "E",
    },
  ];

  function brbBody(id) {
    for (var i = 0; i < brbBodies.length; i += 1) {
      if (brbBodies[i].id === id) {
        return brbBodies[i];
      }
    }
    return null;
  }

  function brbFind(map, ch) {
    for (var y = 0; y < map.length; y += 1) {
      var x = map[y].indexOf(ch);
      if (x !== -1) {
        return { x: x, y: y };
      }
    }
    return null;
  }

  /* Terrain under the bodies, with the creatures lifted out of it. */
  function brbGround(room) {
    var grid = [];
    for (var y = 0; y < brbRows; y += 1) {
      var row = [];
      for (var x = 0; x < brbCols; x += 1) {
        var line = room.map[y] || "";
        var ch = line.charAt(x) || "#";
        if ("MCEB".indexOf(ch) !== -1) {
          ch = ".";
        }
        if (ch === "X") {
          ch = ".";
        }
        row.push(ch);
      }
      grid.push(row);
    }
    return grid;
  }

  function brbStart(room) {
    var ground = brbGround(room);
    var crates = [];
    for (var y = 0; y < brbRows; y += 1) {
      var line = room.map[y] || "";
      for (var x = 0; x < line.length; x += 1) {
        if (line.charAt(x) === "B") {
          crates.push({ x: x, y: y });
        }
      }
    }
    var bodies = {};
    for (var i = 0; i < brbBodies.length; i += 1) {
      var id = brbBodies[i].id;
      var at = brbFind(room.map, id);
      bodies[id] = at ? { x: at.x, y: at.y } : { x: 1, y: 1 };
    }
    var exit = brbFind(room.map, "X") || { x: brbCols - 2, y: 1 };
    var latch = brbFind(room.map, "L");
    var pipe = brbFind(room.map, "P");
    return {
      room: room,
      ground: ground,
      bodies: bodies,
      mind: room.mind,
      crates: crates,
      exit: exit,
      latch: latch,
      latchOpen: false,
      pipe: pipe,
      moves: 0,
      over: false,
      won: false,
    };
  }

  function brbClone(state) {
    var bodies = {};
    Object.keys(state.bodies).forEach(function (id) {
      bodies[id] = { x: state.bodies[id].x, y: state.bodies[id].y };
    });
    return {
      room: state.room,
      ground: state.ground,
      bodies: bodies,
      mind: state.mind,
      crates: state.crates.map(function (c) {
        return { x: c.x, y: c.y };
      }),
      exit: state.exit,
      latch: state.latch,
      latchOpen: state.latchOpen,
      pipe: state.pipe,
      moves: state.moves,
      over: state.over,
      won: state.won,
    };
  }

  function brbAtCrates(state, x, y) {
    return state.crates.some(function (c) {
      return c.x === x && c.y === y;
    });
  }

  function brbAtBody(state, x, y, skip) {
    var found = null;
    Object.keys(state.bodies).forEach(function (id) {
      if (id !== skip && state.bodies[id].x === x && state.bodies[id].y === y) {
        found = id;
      }
    });
    return found;
  }

  /* The terrain test is the whole design: a body may only stand where its own
   * rules allow, and the chasm, the water, the pipe and the latch each answer to
   * a different body. */
  function brbLandable(state, body, x, y) {
    if (x < 0 || y < 0 || x >= brbCols || y >= brbRows) {
      return false;
    }
    if (state.ground[y][x] === "#") {
      return false;
    }
    if (state.ground[y][x] === "L" && !state.latchOpen) {
      return false;
    }
    if (body.terrain.indexOf(state.ground[y][x]) === -1) {
      return false;
    }
    return true;
  }

  function brbReason(state, body, x, y) {
    if (x < 0 || y < 0 || x >= brbCols || y >= brbRows) {
      return t("brbOutOfRoom");
    }
    var ch = state.ground[y][x];
    if (ch === "#") {
      return t("brbWall");
    }
    if (ch === "L" && !state.latchOpen) {
      return t("brbLatchShut");
    }
    if (ch === "_") {
      return t("brbNeedsMoth");
    }
    if (ch === "~") {
      return t("brbNeedsWater");
    }
    if (ch === "P") {
      return t("brbNeedsEel");
    }
    if (ch === "^") {
      return t("brbNeedsClimb");
    }
    return t("brbBlocked");
  }

  /* One action, fully deterministic, so the breadth-first prover and the panel
   * are the same machine and a proved route is a route the player can take. */
  function brbApply(state, action) {
    if (!state || state.over || !action || !action.type) {
      return null;
    }
    var body = brbBody(state.mind);
    if (!body) {
      return null;
    }
    var next = brbClone(state);

    if (action.type === "move") {
      var here = next.bodies[body.id];
      var tx = here.x + (action.dx || 0);
      var ty = here.y + (action.dy || 0);
      var occupant = brbAtBody(next, tx, ty, body.id);
      if (occupant) {
        return { error: t("brbBodyInWay") };
      }
      var crateHere = brbAtCrates(next, tx, ty);
      if (crateHere) {
        if (!body.push) {
          return { error: t("brbNeedsPush") };
        }
        var bx = tx + (action.dx || 0);
        var by = ty + (action.dy || 0);
        if (!brbLandable(next, body, bx, by) || brbAtCrates(next, bx, by) || brbAtBody(next, bx, by, body.id)) {
          return { error: t("brbCrateStuck") };
        }
        next.crates.forEach(function (c) {
          if (c.x === tx && c.y === ty) {
            c.x = bx;
            c.y = by;
          }
        });
      } else if (!brbLandable(next, body, tx, ty)) {
        return { error: brbReason(next, body, tx, ty) };
      }
      next.bodies[body.id] = { x: tx, y: ty };
      /* The pipe carries only the eel, and drops it at the far end. */
      if (next.ground[ty][tx] === "P" && next.pipe && (tx !== next.pipe.x || ty !== next.pipe.y)) {
        next.bodies[body.id] = { x: next.pipe.x, y: next.pipe.y };
      }
      next.moves += 1;
      brbCheck(next);
      return { state: next };
    }

    if (action.type === "possess") {
      var target = brbBody(action.id);
      if (!target || action.id === body.id) {
        return null;
      }
      var a = next.bodies[body.id];
      var b = next.bodies[target.id];
      if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) {
        return { error: t("brbNotAdjacent", { name: t(target.nameKey) }) };
      }
      next.mind = target.id;
      next.moves += 1;
      brbCheck(next);
      return { state: next };
    }

    if (action.type === "latch") {
      if (!next.latch) {
        return { error: t("brbNoLatchHere") };
      }
      if (next.latchOpen) {
        return { error: t("brbLatchAlready") };
      }
      if (!body.latch) {
        return { error: t("brbNeedsLatcher") };
      }
      var at = next.bodies[body.id];
      if (Math.abs(at.x - next.latch.x) + Math.abs(at.y - next.latch.y) > 1) {
        return { error: t("brbTooFarLatch") };
      }
      next.latchOpen = true;
      next.moves += 1;
      brbCheck(next);
      return { state: next };
    }

    return null;
  }

  function brbCheck(state) {
    var at = state.bodies[state.mind];
    if (at && at.x === state.exit.x && at.y === state.exit.y) {
      state.over = true;
      state.won = true;
    }
  }

  function brbKey(state) {
    var parts = [state.mind];
    brbBodies.forEach(function (b) {
      parts.push(b.id + state.bodies[b.id].x + state.bodies[b.id].y);
    });
    state.crates.forEach(function (c) {
      parts.push("B" + c.x + c.y);
    });
    parts.push(state.latchOpen ? "1" : "0");
    return parts.join("|");
  }

  function brbActions(state) {
    var out = [];
    var dirs = [
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
    ];
    dirs.forEach(function (d) {
      out.push({ type: "move", dx: d.dx, dy: d.dy });
    });
    brbBodies.forEach(function (b) {
      if (b.id !== state.mind) {
        out.push({ type: "possess", id: b.id });
      }
    });
    out.push({ type: "latch" });
    return out;
  }

  /* Breadth-first over the real resolver: proves the room can be finished and
   * returns the shortest route, which is the par the HUD quotes and the anchor
   * for every star band. Capped so a large room cannot stall a load. */
  function brbSolve(room, cap) {
    var start = brbStart(room);
    var limit = cap || 120000;
    var seen = {};
    var queue = [{ state: start, plan: [] }];
    seen[brbKey(start)] = true;
    var head = 0;
    while (head < queue.length && head < limit) {
      var node = queue[head];
      head += 1;
      if (node.state.over) {
        return { solved: true, par: node.plan.length, plan: node.plan };
      }
      var actions = brbActions(node.state);
      for (var i = 0; i < actions.length; i += 1) {
        var result = brbApply(node.state, actions[i]);
        if (!result || !result.state) {
          continue;
        }
        var key = brbKey(result.state);
        if (seen[key]) {
          continue;
        }
        seen[key] = true;
        queue.push({ state: result.state, plan: node.plan.concat([actions[i]]) });
      }
    }
    return { solved: false, par: -1, plan: [] };
  }

  /* A body's rules as one plain sentence, used for the possession preview the
   * design doc asks for: what the target can and cannot do, before you commit. */
  function brbRulesText(body) {
    return t("brbRulesLine", {
      name: t(body.nameKey),
      land: body.terrain
        .split("")
        .map(function (ch) {
          return t("brbTerrain" + ch);
        })
        .join(" / "),
      push: t(body.push ? "brbCanPush" : "brbNoPush"),
      latch: t(body.latch ? "brbCanLatch" : "brbNoLatch"),
    });
  }

  /* Prove every room once at load and keep the measured par with it, so the
   * panel can quote a real number and the bands cannot drift from the room. */
  function brbPrepare() {
    brbRooms.forEach(function (room) {
      var proof = brbSolve(room, 120000);
      room.solved = proof.solved;
      room.par = proof.solved ? proof.par : 99;
      room.starMoves = proof.solved
        ? [proof.par, proof.par + 3, proof.par + 8]
        : [99, 99, 99];
    });
    return brbRooms;
  }

  function initBorrowedBodiesGame(panelEl) {
    if (!panelEl) {
      return;
    }
    brbPrepare();
    /* A room that will not solve is a authoring bug, never something to ship. */
    var rooms = brbRooms.filter(function (room) {
      return room.solved;
    });
    if (!rooms.length) {
      return;
    }

    var campaign = createCampaign({ key: "borrowed-bodies-campaign", levels: rooms });
    var room = rooms[campaign.indexOf(campaign.nextLevelId())] || rooms[0];
    var state = brbStart(room);
    var undoStack = [];
    var hint = "";

    /* --- markup --- */
    var hud = document.createElement("div");
    hud.className = "game-hud";
    var mindEl = document.createElement("strong");
    var moveEl = document.createElement("strong");
    var parEl = document.createElement("strong");
    hud.appendChild(brbStat("brbMindLabel", mindEl));
    hud.appendChild(brbStat("brbMoveLabel", moveEl));
    hud.appendChild(brbStat("brbParLabel", parEl));

    var grid = document.createElement("div");
    grid.className = "brb-grid";
    grid.setAttribute("role", "grid");
    grid.setAttribute("aria-label", t("brbGridAria"));

    var rulesBox = document.createElement("div");
    rulesBox.className = "brb-rules";
    var ruleLines = brbBodies.map(function (body) {
      var p = document.createElement("p");
      p.className = "brb-rule";
      rulesBox.appendChild(p);
      return { body: body, node: p };
    });

    var preview = document.createElement("p");
    preview.className = "brb-preview";
    preview.setAttribute("aria-live", "polite");

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var row = document.createElement("div");
    row.className = "elements-row";
    var label = document.createElement("label");
    label.className = "elements-label";
    label.setAttribute("for", "brbRoomSel");
    label.setAttribute("data-i18n", "brbRoomSelectLabel");
    label.textContent = t("brbRoomSelectLabel");
    var sel = document.createElement("select");
    sel.className = "elements-select";
    sel.id = "brbRoomSel";
    row.appendChild(label);
    row.appendChild(sel);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var bodyBtns = brbBodies.map(function (body) {
      return brbButton("brb-body", body.keyName || body.nameKey, function () {
        possess(body.id);
      });
    });
    var latchBtn = brbButton("brb-latch", "brbBtnLatch", function () {
      act({ type: "latch" });
    });
    var undoBtn = brbButton("brb-undo", "brbBtnUndo", function () {
      undo();
    });
    var resetBtn = brbButton("primary", "btnNewRound", function () {
      loadRoom(room);
    });
    var best = document.createElement("p");
    best.className = "game-best";
    actions.appendChild(latchBtn);
    actions.appendChild(undoBtn);
    actions.appendChild(resetBtn);
    actions.appendChild(best);

    var hintEl = document.createElement("p");
    hintEl.className = "game-hint";
    hintEl.setAttribute("data-i18n", "brbHint");
    hintEl.textContent = t("brbHint");

    [hud, grid, rulesBox, preview, result, row, actions, hintEl].forEach(function (node) {
      panelEl.appendChild(node);
    });

    function brbStat(key, valueEl) {
      var stat = document.createElement("div");
      stat.className = "game-stat";
      var cap = document.createElement("span");
      cap.setAttribute("data-i18n", key);
      cap.textContent = t(key);
      stat.appendChild(cap);
      stat.appendChild(valueEl);
      return stat;
    }

    function brbButton(cls, key, onClick) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "brb-btn " + cls;
      b.setAttribute("data-i18n", key);
      b.textContent = t(key);
      b.addEventListener("click", onClick);
      return b;
    }

    /* --- grid --- */
    var cells = [];
    function buildGrid() {
      grid.textContent = "";
      cells = [];
      for (var y = 0; y < brbRows; y += 1) {
        var line = [];
        for (var x = 0; x < brbCols; x += 1) {
          var cell = document.createElement("button");
          cell.type = "button";
          cell.className = "brb-cell";
          cell.setAttribute("role", "gridcell");
          (function (cx, cy) {
            cell.addEventListener("click", function () {
              step(cx, cy);
            });
          })(x, y);
          grid.appendChild(cell);
          line.push(cell);
        }
        cells.push(line);
      }
    }

    function terrainWord(ch) {
      return t("brbTerrain" + ch);
    }

    function render() {
      var body = brbBody(state.mind);
      mindEl.textContent = t(body.nameKey);
      moveEl.textContent = t("brbMoveStat", { n: state.moves });
      parEl.textContent = t("brbParStat", { n: room.par });

      for (var y = 0; y < brbRows; y += 1) {
        for (var x = 0; x < brbCols; x += 1) {
          var node = cells[y][x];
          var ch = state.ground[y][x];
          var who = brbAtBody(state, x, y, null);
          var crate = brbAtCrates(state, x, y);
          var text = ch === "#" ? "\u2588" : ch === "." ? "\u00B7" : ch === "L" ? (state.latchOpen ? "\u25A1" : "\u25A3") : ch;
          if (who) {
            text = brbBody(who).glyph;
          } else if (crate) {
            text = "\u25A0";
          }
          if (state.exit.x === x && state.exit.y === y && !who && !crate) {
            text = "\u2691";
          }
          node.textContent = text;
          node.className =
            "brb-cell is-" +
            (ch === "#" ? "wall" : ch === "_" ? "gap" : ch === "~" ? "water" : ch === "P" ? "pipe" : ch === "^" ? "perch" : ch === "L" ? (state.latchOpen ? "open" : "latch") : "flat") +
            (who === state.mind ? " brb-here" : "") +
            (who ? " brb-body-" + who.toLowerCase() : "") +
            (crate ? " brb-crate" : "") +
            (state.exit.x === x && state.exit.y === y ? " brb-exit" : "");
          node.setAttribute(
            "aria-label",
            t("brbCellAria", {
              x: x + 1,
              y: y + 1,
              terrain: terrainWord(ch),
              who: who ? t(brbBody(who).nameKey) : t("brbNobody"),
            }),
          );
        }
      }

      ruleLines.forEach(function (entry) {
        entry.node.textContent = brbRulesText(entry.body);
        entry.node.className = "brb-rule" + (entry.body.id === state.mind ? " brb-active" : "");
      });

      preview.textContent = hint || t("brbIdleHint");
      best.textContent = t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() });
    }

  /* One step toward a cell: the panel routes a click through the same resolver
   * as the keyboard, so a proved plan is always the plan the player can do. */
    function step(x, y) {
      if (state.over) {
        return;
      }
      var at = state.bodies[state.mind];
      var dx = x - at.x;
      var dy = y - at.y;
      if (Math.abs(dx) + Math.abs(dy) !== 1) {
        hint = t("brbPickNeighbour");
        render();
        return;
      }
      act({ type: "move", dx: dx, dy: dy });
    }

    function possess(id) {
      if (state.over) {
        return;
      }
      var target = brbBody(id);
      hint = brbRulesText(target);
      if (id === state.mind) {
        render();
        return;
      }
      act({ type: "possess", id: id });
    }

    function act(action) {
      if (state.over) {
        return;
      }
      var result = brbApply(state, action);
      if (!result) {
        return;
      }
      if (result.error) {
        hint = result.error;
        render();
        return;
      }
      undoStack.push(brbClone(state));
      state = result.state;
      hint = "";
      render();
      if (state.over) {
        finish();
      }
    }

    function undo() {
      if (!undoStack.length) {
        hint = t("brbNothingToUndo");
        render();
        return;
      }
      state = undoStack.pop();
      hint = t("brbUndid");
      render();
    }

    function finish() {
      var moves = state.moves;
      var starsWon = starsFor(moves, room.starMoves, "low");
      var outcome = campaign.record(room.id, { stars: starsWon, best: moves, better: "low" });
      var message = t("brbWon", { n: moves, par: room.par, s: starsWon });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("brbNextRoom");
      } else if (campaign.clearedCount() === rooms.length) {
        message += " " + t("brbAllRooms");
      }
      result.textContent = message;
      logAction(t("logBorrowedBodies", { n: moves }));
      var rect = resetBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function refreshPicker() {
      fillCampaignPicker(sel, campaign, function (def) {
        return t(def.labelKey);
      }, t("elementsLocked"));
      sel.value = room.id;
    }

    function loadRoom(next) {
      room = next;
      state = brbStart(room);
      undoStack = [];
      hint = "";
      result.textContent = t("brbPrompt", {
        name: t(room.labelKey),
        par: room.par,
        body: t(brbBody(room.mind).nameKey),
      });
      refreshPicker();
      render();
    }

    function moveBy(dx, dy) {
      act({ type: "move", dx: dx, dy: dy });
    }

    panelEl.addEventListener("keydown", function (event) {
      var keys = {
        ArrowLeft: { dx: -1, dy: 0 },
        ArrowRight: { dx: 1, dy: 0 },
        ArrowUp: { dx: 0, dy: -1 },
        ArrowDown: { dx: 0, dy: 1 },
      };
      if (keys[event.key]) {
        event.preventDefault();
        moveBy(keys[event.key].dx, keys[event.key].dy);
        return;
      }
      if (event.key === "1" || event.key === "2" || event.key === "3") {
        event.preventDefault();
        possess(brbBodies[parseInt(event.key, 10) - 1].id);
        return;
      }
      if (event.key === "e" || event.key === "E") {
        event.preventDefault();
        act({ type: "latch" });
        return;
      }
      if (event.key === "u" || event.key === "U" || event.key === "Backspace") {
        event.preventDefault();
        undo();
      }
    });
    panelEl.tabIndex = 0;

    bodyBtns.forEach(function (b) {
      actions.insertBefore(b, latchBtn);
    });

    sel.addEventListener("change", function () {
      var index = campaign.indexOf(sel.value);
      if (index >= 0 && campaign.isUnlocked(sel.value)) {
        loadRoom(rooms[index]);
      }
    });

    buildGrid();
    loadRoom(rooms[campaign.indexOf(campaign.nextLevelId())] || rooms[0]);
  }

  App.addStrings({
    en: {
      "tabBorrowedBodies": "Borrowed Bodies",
      "brbMoth": "Moth",
      "brbCrab": "Crab",
      "brbEel": "Eel",
      "brbR1": "First Perch",
      "brbR2": "The Wet Road",
      "brbR3": "Latch and Pipe",
      "brbR4": "Two Dead Ends",
      "brbR5": "The Long Handover",
      "brbR6": "The Parked Moth",
      "brbR7": "Crate and Perch",
      "brbR8": "The Tight Weave",
      "brbR9": "The Long Way Round",
      "brbR10": "The Last Handover",
      "brbTerrain.": "floor",
      "brbTerrain#": "wall",
      "brbTerrain_": "chasm",
      "brbTerrain~": "water",
      "brbTerrainP": "pipe",
      "brbTerrain^": "perch",
      "brbTerrainL": "latched door",
      "brbMindLabel": "Borrowed",
      "brbMoveLabel": "Moves",
      "brbParLabel": "Par",
      "brbMoveStat": "{n}",
      "brbParStat": "{n} moves",
      "brbGridAria": "Room grid, move by clicking a cell next to your body",
      "brbCellAria": "Column {x} row {y}, {terrain}, {who}",
      "brbNobody": "empty",
      "brbRoomSelectLabel": "Room",
      "brbBtnLatch": "Try the latch",
      "brbBtnUndo": "Undo",
      "brbRulesLine": "{name}: stands on {land} - {push}, {latch}.",
      "brbCanPush": "can push crates",
      "brbNoPush": "cannot push crates",
      "brbCanLatch": "can work the latch",
      "brbNoLatch": "cannot work the latch",
      "brbIdleHint": "Press 1, 2 or 3 to see what a body can do before you take it.",
      "brbPrompt": "{name}: the mind starts in the {body}. Par is {par} moves - no body can do this alone.",
      "brbPickNeighbour": "Step to a cell touching your body; you cannot teleport.",
      "brbOutOfRoom": "That is the outside of the building.",
      "brbWall": "Solid wall.",
      "brbLatchShut": "The latched door is still shut.",
      "brbNeedsMoth": "Only the moth comes down into the chasm.",
      "brbNeedsWater": "Only a water body can stand in the water.",
      "brbNeedsEel": "Only the eel fits the pipe.",
      "brbNeedsClimb": "That perch is too high for this body.",
      "brbBlocked": "Something already stands there.",
      "brbBodyInWay": "Another body is on that cell - borrow it instead, or walk around.",
      "brbNeedsPush": "This body cannot move a crate.",
      "brbCrateStuck": "The crate has nowhere to go - it would end up stuck.",
      "brbNotAdjacent": "The {name} is not touching you, so the mind cannot jump.",
      "brbNoLatchHere": "There is no latch in this room.",
      "brbLatchAlready": "The latch is already thrown.",
      "brbNeedsLatcher": "Only the eel can work the latch.",
      "brbTooFarLatch": "Stand next to the latch to reach it.",
      "brbNothingToUndo": "Nothing to undo yet.",
      "brbUndid": "One move back.",
      "brbWon": "Out in {n} moves (par {par}) - {s} stars.",
      "brbNextRoom": "Next room unlocked.",
      "brbAllRooms": "Every room walked out.",
      "brbHint": "Bodies stay where you leave them, so park one where you will need it later.",
      "logBorrowedBodies": "Walked out of a room in {n} moves",
    },
    zh: {
      "tabBorrowedBodies": "借体而出",
      "brbMoth": "蛾",
      "brbCrab": "蟹",
      "brbEel": "鳗",
      "brbR1": "第一处高台",
      "brbR2": "潮湿的路",
      "brbR3": "门闩与管道",
      "brbR4": "两条死路",
      "brbR5": "漫长的交接",
      "brbR6": "留在原地的蛾",
      "brbR7": "木箱与高台",
      "brbR8": "紧密的穿梭",
      "brbR9": "绕远的路",
      "brbR10": "最后的交接",
      "brbTerrain.": "地面",
      "brbTerrain#": "墙",
      "brbTerrain_": "裂口",
      "brbTerrain~": "水面",
      "brbTerrainP": "管道",
      "brbTerrain^": "高台",
      "brbTerrainL": "闩住的门",
      "brbMindLabel": "当前身体",
      "brbMoveLabel": "步数",
      "brbParLabel": "标准步数",
      "brbMoveStat": "{n}",
      "brbParStat": "{n} 步",
      "brbGridAria": "房间网格：点击与你相邻的格子移动",
      "brbCellAria": "第 {x} 列第 {y} 行，{terrain}，{who}",
      "brbNobody": "空着",
      "brbRoomSelectLabel": "房间",
      "brbBtnLatch": "试着拔闩",
      "brbBtnUndo": "退回一步",
      "brbRulesLine": "{name}：可站在 {land}；{push}；{latch}。",
      "brbCanPush": "能推木箱",
      "brbNoPush": "不能推木箱",
      "brbCanLatch": "能拔门闩",
      "brbNoLatch": "不能拔门闩",
      "brbIdleHint": "按 1、2、3 先看清一具身体能做什么，再决定借它。",
      "brbPrompt": "「{name}」：意识起初在{body}里。标准 {par} 步——没有任何一具身体能单独完成。",
      "brbPickNeighbour": "只能走到紧挨着的格子，意识不会瞬移。",
      "brbOutOfRoom": "那是房子外面。",
      "brbWall": "实心墙。",
      "brbLatchShut": "门还闩着。",
      "brbNeedsMoth": "只有蛾子能下到裂口。",
      "brbNeedsWater": "只有能水的身体可以站在水上。",
      "brbNeedsEel": "只有鳗能钻进管道。",
      "brbNeedsClimb": "这具身体爬不上高台。",
      "brbBlocked": "那里已经占着。",
      "brbBodyInWay": "那格站着另一具身体——不如借它，或绕开。",
      "brbNeedsPush": "这具身体推不动木箱。",
      "brbCrateStuck": "木箱没有可去之处——推过去就卡死了。",
      "brbNotAdjacent": "{name}没有紧挨着你，意识跳不过去。",
      "brbNoLatchHere": "这屋里没有门闩。",
      "brbLatchAlready": "门闩已经拔开了。",
      "brbNeedsLatcher": "只有鳗能拔门闩。",
      "brbTooFarLatch": "站到门闩旁边才够得着。",
      "brbNothingToUndo": "还没有可退回的步。",
      "brbUndid": "退回一步。",
      "brbWon": "{n} 步走出去（标准 {par}）——获得 {s} 星。",
      "brbNextRoom": "解锁下一间。",
      "brbAllRooms": "每一间都走完了。",
      "brbHint": "身体会留在你放下它的地方，所以要提前把它停在以后用得上的位置。",
      "logBorrowedBodies": "用 {n} 步走出了房间",
    },
  });

  App.registerGame({
    name: "borrowedBodies",
    tabKey: "tabBorrowedBodies",
    init: initBorrowedBodiesGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M42 14v52M44 14v52" stroke="rgba(0,242,255,.5)" stroke-width="2"/>' +
        '<rect x="14" y="46" width="24" height="16" fill="rgba(34,211,238,.18)" stroke="rgba(34,211,238,.5)"/>' +
        '<circle cx="26" cy="30" r="7" fill="none" stroke="#22d3ee" stroke-width="2"/>' +
        '<text x="26" y="34" font-size="9" fill="#22d3ee" text-anchor="middle">1</text>' +
        '<circle cx="70" cy="52" r="7" fill="none" stroke="#ff6b35" stroke-width="2" stroke-dasharray="3 2"/>' +
        '<text x="70" y="56" font-size="9" fill="#ff6b35" text-anchor="middle">2</text>' +
        '<path d="M78 30h22" stroke="#a3e635" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="M96 25l7 5-7 5" fill="none" stroke="#a3e635" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<text x="88" y="20" font-size="8" fill="#a3e635" text-anchor="middle">out</text></svg>',
      en: [
        "Aim: get the mind onto the flag. No single body can do it - you must hand the mind from one to the next.",
        "Move: arrows or WASD step the body you inhabit; on touch, click a cell touching it. Press 1, 2 or 3 to borrow the Moth, the Crab or the Eel - but only when that body is right next to yours.",
        "Rules: the Moth crosses the chasm but cannot push a crate; the Crab pushes and stands in water but cannot cross dry ground; the Eel fits the pipe and pulls the latch but cannot climb to a perch.",
        "Watch out: bodies do not follow you. They stay exactly where you leave them, so park one where a later step will need it - and never shove a crate where it can only sit.",
        "Scoring: the HUD quotes the par that a search proved for this room; moves used against it sets your stars. Undo is free.",
      ],
      zh: [
        "目标：把意识带到旗子那格。没有任何一具身体能独自做到——你必须一具一具地交接。",
        "操作：方向键移动当前身体；触屏就点紧邻的格子。按 1、2、3 分别借蛾、蟹、鳗——但必须它正紧挨着你。",
        "规则：蛾能越裂口却推不动箱子；蟹能推箱子、能站在水里却过不了干地；鳗能钻管道、能拔门闩却上不了高台。",
        "小心：身体不会跟着你走，它们就停在你放下的地方，所以要提前把它停在后面要用的位置；也别把箱子推到只能卡死的地方。",
        "计分：面板上的标准步数是搜索器为这房间实测出来的；用它对比你用的步数定星。退回不罚。",
      ],
    },
  });

  /* Exported for the other modules and the harness. */
  App.bodyBodies = brbBodies;
  App.bodyRooms = brbRooms;
  App.bodyStart = brbStart;
  App.bodyLegal = brbLandable;
  App.bodyApply = brbApply;
  App.bodyActions = brbActions;
  App.bodySolve = brbSolve;
  App.bodySolvable = function (room) {
    return brbSolve(room, 120000).solved;
  };
  App.bodyPar = function (room) {
    return brbSolve(room, 120000).par;
  };
  App.bodyPrepare = brbPrepare;
  App.initBorrowedBodiesGame = initBorrowedBodiesGame;
})(window.CapitalConvert = window.CapitalConvert || {});
