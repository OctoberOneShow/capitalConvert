/* Borrowed Bodies - the asymmetric-ability puzzle in the shared game drawer.
 * One mind, three bodies, and each body opens some edges of the room while it
 * closes others: the moth crosses the chasm but cannot push, the crab pushes and
 * swims but cannot cross dry ground, the eel fits the pipe and the latch but
 * cannot climb. Bodies stay where you leave them, so the exit is only reachable
 * by sequencing possessions - never by any single creature.
 *
 * Presentation layer: the room is drawn - bevelled terrain plates under meeple
 * figures, one hue per body carried across cell, portrait, button and HUD. The
 * signature beat is possession: a spirit visibly arcs from the abandoned body
 * to the borrowed one. The resolver, rooms and par are untouched. */
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
  var SVG_NS = "http://www.w3.org/2000/svg";

  /* Presentation tokens. Each body keeps one hue across cell, portrait, button
   * and HUD so "whose eyes am I looking through" is answerable at a glance;
   * terrain hues are fixed so a room reads the same in any panel hue. */
  var brbBodyHues = { M: 46, C: 8, E: 158 };
  var brbPanelHue = 268; /* fallback; the real value is read off the panel token */

  function brbMotionOff() {
    return App.isMotionOff
      ? App.isMotionOff()
      : document.documentElement.getAttribute("data-motion") === "off";
  }

  function brbMotionCalm() {
    return App.isMotionCalm
      ? App.isMotionCalm()
      : document.documentElement.getAttribute("data-motion") === "calm";
  }

  /* A five-colour palette from one hue, matching the values App.art paints with. */
  function brbPaint(hue, sat) {
    var s = sat === undefined ? 70 : sat;
    return {
      main: "hsl(" + hue + "," + s + "%,52%)",
      deep: "hsl(" + hue + "," + s + "%,30%)",
      lit: "hsl(" + hue + "," + Math.min(98, s + 12) + "%,74%)",
      soft: "hsl(" + hue + "," + Math.round(s * 0.6) + "%,86%)",
      line: "hsl(" + hue + "," + s + "%,18%)",
    };
  }

  function brbSvg(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (var key in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, key)) {
          node.setAttribute(key, String(attrs[key]));
        }
      }
    }
    return node;
  }

  /* The three bodies as meeple figures: the shared silhouette the drawer reads
   * as "a character", plus the silhouette feature that *is* the body's rule -
   * the moth's wings, the crab's claws, the eel's fin and tail. */
  var brbMeeplePath =
    "M12 3.4c1.7 0 2.9 1.3 2.9 2.9 0 .8-.3 1.4-.7 1.9 2 .5 3.4 1.7 4.2 3.4l-2.3.9.6 6.2H8l.6-6.2-2.3-.9c.8-1.7 2.2-2.9 4.2-3.4-.4-.5-.7-1.1-.7-1.9 0-1.6 1.2-2.9 2.2-2.9z";

  function brbFigure(id) {
    var p = brbPaint(brbBodyHues[id] || brbPanelHue, 72);
    var svg = brbSvg("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", "class": "brb-fig" });
    var torso = brbSvg("path", { d: brbMeeplePath, fill: p.main, stroke: p.line, "stroke-width": 1.2 });
    if (id === "M") {
      svg.appendChild(brbSvg("path", { d: "M10.6 10.4C8.8 6.9 5.4 5.6 3.5 7.2c-1.9 1.6-1.1 4.7 1.3 6.1 1.7 1 3.8.9 5-.1", fill: p.soft, stroke: p.line, "stroke-width": 1.1 }));
      svg.appendChild(brbSvg("path", { d: "M13.4 10.4c1.8-3.5 5.2-4.8 7.1-3.2 1.9 1.6 1.1 4.7-1.3 6.1-1.7 1-3.8.9-5-.1", fill: p.soft, stroke: p.line, "stroke-width": 1.1 }));
      svg.appendChild(brbSvg("path", { d: "M10.7 3.8 9 1.5M13.3 3.8l1.7-2.3", stroke: p.line, "stroke-width": 1.2, "stroke-linecap": "round", fill: "none" }));
      svg.appendChild(torso);
    } else if (id === "C") {
      svg.appendChild(brbSvg("path", { d: "M8.6 17 6 19M9.2 18.4 7.2 20.6M15.4 17l2.6 2M14.8 18.4l2 2.2", stroke: p.line, "stroke-width": 1.3, "stroke-linecap": "round", fill: "none" }));
      svg.appendChild(brbSvg("path", { d: "M8.8 9.6C6.9 8.7 5.4 8.6 4.3 9.2", stroke: p.line, "stroke-width": 1.5, fill: "none", "stroke-linecap": "round" }));
      svg.appendChild(brbSvg("path", { d: "M15.2 9.6c1.9-.9 3.4-1 4.5-.4", stroke: p.line, "stroke-width": 1.5, fill: "none", "stroke-linecap": "round" }));
      svg.appendChild(brbSvg("path", { d: "M4.4 6c-1.6.4-2.5 1.9-2.1 3.4.4 1.5 1.9 2.3 3.4 2-1-.7-1.4-1.7-1.1-2.7.3-.9 1-1.5 2-1.7z", fill: p.main, stroke: p.line, "stroke-width": 1 }));
      svg.appendChild(brbSvg("path", { d: "M19.6 6c1.6.4 2.5 1.9 2.1 3.4-.4 1.5-1.9 2.3-3.4 2 1-.7 1.4-1.7 1.1-2.7-.3-.9-1-1.5-2-1.7z", fill: p.main, stroke: p.line, "stroke-width": 1 }));
      torso.setAttribute("transform", "translate(12 13.2) scale(1.18 .86) translate(-12 -13.2)");
      svg.appendChild(torso);
    } else {
      svg.appendChild(brbSvg("path", { d: "M9.6 16.2c-2.5.9-4 2.5-4.4 4.9 2.2-.2 4-.9 5.4-2.2", fill: p.soft, stroke: p.line, "stroke-width": 1.1 }));
      svg.appendChild(brbSvg("path", { d: "M11.2 3.3c.2-1.4 1.2-2.4 2.8-2.8-.3 1.3-.4 2.3-.1 3.3", fill: p.deep, stroke: p.line, "stroke-width": 1 }));
      torso.setAttribute("transform", "translate(12 12.6) scale(.94 .96) translate(-12 -12.6)");
      svg.appendChild(torso);
    }
    return svg;
  }

  /* The mind itself: a small ghost that carries the possession arc. */
  function brbSpiritSvg() {
    var p = brbPaint(brbPanelHue, 80);
    var svg = brbSvg("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", "class": "brb-fig" });
    svg.appendChild(brbSvg("path", {
      d: "M12 2.6c3.1 3.3 5.3 6.3 5.3 9.5a5.3 5.3 0 0 1-10.6 0c0-3.2 2.2-6.2 5.3-9.5z",
      fill: "rgba(255,255,255,.92)",
      stroke: p.main,
      "stroke-width": 1.2,
    }));
    svg.appendChild(brbSvg("circle", { cx: 10.2, cy: 12.4, r: 1.1, fill: p.deep }));
    svg.appendChild(brbSvg("circle", { cx: 13.8, cy: 12.4, r: 1.1, fill: p.deep }));
    return svg;
  }

  function brbCenterOf(el) {
    var rect = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if (rect && rect.width) {
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, w: rect.width, h: rect.height };
    }
    return { x: 0, y: 0, w: 0, h: 0 };
  }

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

    /* --- feel layer (presentation only; the resolver above stays the game) --- */
    var art = App.art;
    var fx = App.fx || {
      pop: noop,
      shake: noop,
      ring: noop,
      burst: noop,
      floatText: noop,
      stagger: noop,
      countUp: noop,
      sweep: noop,
      jolt: noop,
      flash: noop,
      ceremony: noop,
    };
    var playSfx = App.playSfx || noop;
    /* Without the illustration layer the room falls back to the original glyph
     * text over CSS plates, so the panel is never empty - only less drawn. */
    var canDraw = !!(art && art.tile && art.icon);
    var fxTimers = [];
    var roundId = 0;

    function noop() {}

    /* One-shot beats are guarded by the round id: a stale ceremony must not
     * land on the room that replaced it. */
    function later(fn, ms) {
      var round = roundId;
      var id = window.setTimeout(function () {
        var at = fxTimers.indexOf(id);
        if (at >= 0) {
          fxTimers.splice(at, 1);
        }
        if (round === roundId) {
          fn();
        }
      }, ms);
      fxTimers.push(id);
      return id;
    }

    function clearFxTimers() {
      fxTimers.forEach(function (id) {
        window.clearTimeout(id);
      });
      fxTimers = [];
    }

    /* The panel hue drives the floor plates, the backdrop and the spirit, so the
     * art follows the token instead of a second copy of the palette kept here. */
    function readHue() {
      var raw = "";
      try {
        raw = window.getComputedStyle(panelEl).getPropertyValue("--gp-hue");
      } catch (error) {
        raw = "";
      }
      var parsed = parseInt(raw, 10);
      brbPanelHue = isNaN(parsed) ? 268 : parsed;
    }

    function mountBackdrop() {
      if (!canDraw || !art.pattern) {
        return;
      }
      var layer = document.createElement("div");
      layer.className = "brb-backdrop";
      layer.setAttribute("aria-hidden", "true");
      layer.appendChild(art.pattern("stars", { hue: brbPanelHue, sat: 40, tile: 22 }));
      panelEl.insertBefore(layer, panelEl.firstChild);
    }

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
      var portrait = document.createElement("span");
      portrait.className = "brb-portrait";
      if (canDraw) {
        portrait.appendChild(brbFigure(body.id));
      } else {
        portrait.textContent = body.glyph;
      }
      var text = document.createElement("span");
      text.className = "brb-rule-text";
      p.appendChild(portrait);
      p.appendChild(text);
      rulesBox.appendChild(p);
      return { body: body, node: p, text: text };
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
      }, brbBodyDeco(body.id));
    });
    var latchBtn = brbButton("brb-latch", "brbBtnLatch", function () {
      act({ type: "latch" });
    });
    var undoBtn = brbButton("brb-undo", "brbBtnUndo", function () {
      undo();
    });
    var resetBtn = brbButton("primary", "btnNewRound", function () {
      playSfx("flip");
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

    function brbButton(cls, key, onClick, decorate) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "brb-btn " + cls;
      b.setAttribute("data-i18n", key);
      b.textContent = t(key);
      if (decorate) {
        decorate(b);
      }
      b.addEventListener("click", onClick);
      return b;
    }

    /* A body button wears its meeple, so the borrow verbs read at a glance. */
    function brbBodyDeco(id) {
      return function (b) {
        var fig = document.createElement("span");
        fig.className = "brb-btn-fig";
        if (canDraw) {
          fig.appendChild(brbFigure(id));
        } else {
          fig.textContent = brbBody(id).glyph;
        }
        b.insertBefore(fig, b.firstChild);
      };
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

    /* The ground under the figures: a bevelled plate per terrain, hue-coded and
     * glyph-marked so no cell is a plain rectangle or a colour-only state. */
    function brbPlateFor(ch, x, y, latchOpen) {
      var drift = ((x * 5 + y * 3) % 7) - 3;
      if (ch === "#") {
        return art.tile({ hue: brbPanelHue, sat: 22, tone: "deep", state: "up", radius: 5 });
      }
      if (ch === "_") {
        return art.tile({ hue: brbPanelHue, sat: 26, state: "empty", radius: 7 });
      }
      if (ch === "~") {
        return art.tile({ hue: 196, sat: 62, state: "up", radius: 7, icon: "wave", iconHue: 196, iconSat: 74 });
      }
      if (ch === "P") {
        return art.tile({ hue: 205, sat: 26, tone: "deep", state: "up", radius: 7, icon: "pipe", iconHue: 205, iconSat: 58 });
      }
      if (ch === "^") {
        return art.tile({ hue: 32, sat: 42, state: "up", radius: 7, glyph: "\u25B2", glyphSize: 15, glyphFill: "rgba(255,255,255,.82)" });
      }
      if (ch === "L") {
        return art.tile({ hue: 46, sat: 58, state: "up", radius: 7, icon: latchOpen ? "key" : "lock", iconHue: 46, iconSat: 70 });
      }
      return art.tile({ hue: brbPanelHue + drift, sat: 32, state: "up", radius: 7 });
    }

    function render() {
      var body = brbBody(state.mind);
      mindEl.textContent = "";
      if (canDraw) {
        /* The chip's strong is an inline box; the figure rides in a fixed-size
         * span so it can never inflate the stat it illustrates. */
        var mindFig = document.createElement("span");
        mindFig.className = "brb-mind-fig";
        mindFig.appendChild(brbFigure(body.id));
        mindEl.appendChild(mindFig);
      }
      mindEl.appendChild(document.createTextNode(t(body.nameKey)));
      moveEl.textContent = t("brbMoveStat", { n: state.moves });
      parEl.textContent = t("brbParStat", { n: room.par });

      for (var y = 0; y < brbRows; y += 1) {
        for (var x = 0; x < brbCols; x += 1) {
          var node = cells[y][x];
          var ch = state.ground[y][x];
          var who = brbAtBody(state, x, y, null);
          var crate = brbAtCrates(state, x, y);
          var isExit = state.exit.x === x && state.exit.y === y;
          node.className =
            "brb-cell is-" +
            (ch === "#" ? "wall" : ch === "_" ? "gap" : ch === "~" ? "water" : ch === "P" ? "pipe" : ch === "^" ? "perch" : ch === "L" ? (state.latchOpen ? "open" : "latch") : "flat") +
            (who === state.mind ? " brb-here" : "") +
            (who ? " brb-body-" + who.toLowerCase() : "") +
            (crate ? " brb-crate" : "") +
            (isExit ? " brb-exit" : "");

          if (canDraw) {
            node.textContent = "";
            var plate = document.createElement("span");
            plate.className = "brb-plate";
            plate.appendChild(
              isExit
                ? art.tile({ hue: 46, sat: 84, state: "glow", radius: 7 })
                : brbPlateFor(ch, x, y, state.latchOpen),
            );
            node.appendChild(plate);
            var mark = null;
            if (who) {
              mark = document.createElement("span");
              mark.className = "brb-mark brb-mark-body" + (who === state.mind ? " brb-mark-mind" : "");
              mark.appendChild(brbFigure(who));
            } else if (crate) {
              mark = document.createElement("span");
              mark.className = "brb-mark brb-mark-crate";
              mark.appendChild(art.icon("crate", { hue: 32, sat: 55 }));
            } else if (isExit) {
              mark = document.createElement("span");
              mark.className = "brb-mark brb-mark-exit";
              mark.appendChild(art.icon("flag", { hue: 46, sat: 88 }));
            }
            if (mark) {
              node.appendChild(mark);
            }
          } else {
            var text =
              ch === "#" ? "\u2588" : ch === "." ? "\u00B7" : ch === "L" ? (state.latchOpen ? "\u25A1" : "\u25A3") : ch;
            if (who) {
              text = brbBody(who).glyph;
            } else if (crate) {
              text = "\u25A0";
            }
            if (isExit && !who && !crate) {
              text = "\u2691";
            }
            node.textContent = text;
          }

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
        entry.text.textContent = brbRulesText(entry.body);
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
        ruleLines.forEach(function (entry) {
          if (entry.body.id === id) {
            fx.pop(entry.node, { scale: 1.05 });
          }
        });
        playSfx("select");
        render();
        return;
      }
      act({ type: "possess", id: id });
    }

    /* What the resolver just did, told as a beat: diff the two states instead of
     * trusting the action, so keyboard, click and picker all animate the same. */
    function brbReadBeat(before, after) {
      if (after.latchOpen && !before.latchOpen) {
        return { kind: "latch", body: after.mind };
      }
      if (after.mind !== before.mind) {
        return {
          kind: "possess",
          body: after.mind,
          from: { x: before.bodies[before.mind].x, y: before.bodies[before.mind].y },
          to: { x: before.bodies[after.mind].x, y: before.bodies[after.mind].y },
        };
      }
      var from = before.bodies[after.mind];
      var to = after.bodies[after.mind];
      var beat = {
        kind: "move",
        body: after.mind,
        from: { x: from.x, y: from.y },
        to: { x: to.x, y: to.y },
      };
      for (var i = 0; i < before.crates.length && i < after.crates.length; i += 1) {
        if (before.crates[i].x !== after.crates[i].x || before.crates[i].y !== after.crates[i].y) {
          beat.crate = {
            from: { x: before.crates[i].x, y: before.crates[i].y },
            to: { x: after.crates[i].x, y: after.crates[i].y },
          };
        }
      }
      return beat;
    }

    /* A floating rider that arcs from one cell to another - the spirit on a
     * possession, the body on a step, the crate on a push. Coordinates are
     * viewport-fixed because the node hangs off the body, off any offset parent. */
    function brbFly(fromCell, toCell, flavor, lift, bodyId) {
      if (brbMotionOff() || !fromCell || !toCell) {
        return;
      }
      var a = brbCenterOf(fromCell);
      var b = brbCenterOf(toCell);
      if (!a.w || !b.w) {
        return; /* headless: nothing visible to fly */
      }
      var size = Math.max(20, Math.round(Math.min(a.w, a.h) * 0.8));
      var node = document.createElement("div");
      node.className = "brb-fly brb-fly-" + flavor;
      node.style.left = (a.x - size / 2) + "px";
      node.style.top = (a.y - size / 2) + "px";
      node.style.width = size + "px";
      node.style.height = size + "px";
      if (flavor === "wisp") {
        node.appendChild(brbSpiritSvg());
      } else if (flavor === "crate") {
        node.appendChild(canDraw ? art.icon("crate", { hue: 32, sat: 55 }) : document.createTextNode("\u25A0"));
      } else {
        node.appendChild(brbFigure(bodyId || state.mind));
      }
      document.body.appendChild(node);
      var arc = lift === undefined ? 26 : lift;
      var mx = (a.x + b.x) / 2;
      var my = Math.min(a.y, b.y) - arc;
      var frames = [];
      for (var i = 0; i <= 4; i += 1) {
        var t = i / 4;
        var u = 1 - t;
        var x = u * u * a.x + 2 * u * t * mx + t * t * b.x;
        var y = u * u * a.y + 2 * u * t * my + t * t * b.y;
        frames.push({
          transform: "translate(" + (x - a.x).toFixed(1) + "px," + (y - a.y).toFixed(1) + "px) scale(" + (i === 0 || i === 4 ? 1 : 1.12) + ")",
          opacity: i === 4 && flavor === "wisp" ? 0 : 1,
        });
      }
      var ms = brbMotionCalm() ? 180 : flavor === "wisp" ? 440 : 230;
      var done = false;
      var wipe = function () {
        if (done) {
          return;
        }
        done = true;
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      };
      var tid = window.setTimeout(wipe, ms + 340);
      fxTimers.push(tid);
      var anim = typeof node.animate === "function" ? node.animate(frames, { duration: ms, easing: "linear" }) : null;
      if (anim && anim.finished && anim.finished.then) {
        anim.finished.then(wipe).catch(wipe);
      }
    }

    function brbCellAt(pos) {
      return cells[pos.y] && cells[pos.y][pos.x];
    }

    function brbPlayBeat(beat) {
      if (!beat) {
        return;
      }
      if (beat.kind === "latch") {
        var latchCell = state.latch ? brbCellAt(state.latch) : null;
        if (latchCell) {
          fx.ring(latchCell, { hue: 46 });
          fx.burst(latchCell, { kind: "spark", count: 9, hue: 46 });
        }
        fx.pop(brbCellAt(state.bodies[state.mind]), { scale: 1.12 });
        playSfx("pop");
        return;
      }
      if (beat.kind === "possess") {
        /* The signature move: the mind leaves one body and visibly flies to the
         * other, rings both ends, and the borrowed body's rule line wakes up. */
        var fromCell = brbCellAt(beat.from);
        var toCell = brbCellAt(beat.to);
        if (fromCell) {
          fx.ring(fromCell, { hue: brbBodyHues[beat.body] });
        }
        if (fromCell && toCell) {
          brbFly(fromCell, toCell, "wisp", 34, beat.body);
          fx.ring(toCell, { hue: brbBodyHues[beat.body] });
        }
        ruleLines.forEach(function (entry) {
          if (entry.body.id === beat.body) {
            fx.pop(entry.node, { scale: 1.05 });
          }
        });
        playSfx("heal");
        return;
      }
      var movedCell = brbCellAt(beat.to);
      var longHaul = Math.abs(beat.to.x - beat.from.x) + Math.abs(beat.to.y - beat.from.y) > 1;
      if (movedCell) {
        fx.pop(movedCell, { scale: 1.1, ms: 200 });
        fx.burst(movedCell, { kind: "spark", count: longHaul ? 10 : 4, hue: brbBodyHues[beat.body] });
      }
      var startCell = brbCellAt(beat.from);
      if (startCell && movedCell) {
        brbFly(startCell, movedCell, longHaul ? "wisp" : "hop", longHaul ? 36 : 9, beat.body);
      }
      if (beat.crate) {
        var crateFrom = brbCellAt(beat.crate.from);
        var crateTo = brbCellAt(beat.crate.to);
        if (crateFrom && crateTo) {
          brbFly(crateFrom, crateTo, "crate", 4, beat.body);
        }
        playSfx("place");
      } else {
        playSfx(longHaul ? "splash" : "step");
      }
    }

    function act(action) {
      if (state.over) {
        return;
      }
      var before = state;
      var result = brbApply(state, action);
      if (!result) {
        return;
      }
      if (result.error) {
        hint = result.error;
        fx.shake(brbCellAt(before.bodies[before.mind]), { dist: 5 });
        playSfx("wrong");
        render();
        return;
      }
      undoStack.push(brbClone(state));
      state = result.state;
      hint = "";
      var beat = brbReadBeat(before, state);
      render();
      brbPlayBeat(beat);
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
      playSfx("tick");
      render();
    }

    function finish() {
      var moves = state.moves;
      var starsWon = starsFor(moves, room.starMoves, "low");
      var outcome = campaign.record(room.id, { stars: starsWon, best: moves, better: "low" });
      var message = t("brbWon", { n: moves, par: room.par, s: starsWon });
      var lines = [];
      if (outcome.isBest) {
        lines.push(t("newBest"));
      }
      if (outcome.unlockedNext) {
        lines.push(t("brbNextRoom"));
      } else if (campaign.clearedCount() === rooms.length) {
        lines.push(t("brbAllRooms"));
      }
      result.className = "game-result is-win";
      result.textContent = lines.length ? message + " " + lines.join(" ") : message;
      logAction(t("logBorrowedBodies", { n: moves }));
      var exitCell = brbCellAt(state.exit);
      if (exitCell) {
        fx.ring(exitCell, { hue: 46 });
        fx.burst(exitCell, { kind: "star", count: 14, hue: 46 });
      }
      later(function () {
        fx.ceremony(panelEl, { tone: "win", title: message, lines: lines, stars: starsWon });
      }, 460);
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
      roundId += 1;
      clearFxTimers();
      state = brbStart(room);
      undoStack = [];
      hint = "";
      result.className = "game-result";
      result.textContent = t("brbPrompt", {
        name: t(room.labelKey),
        par: room.par,
        body: t(brbBody(room.mind).nameKey),
      });
      refreshPicker();
      render();
      var dealt = [];
      for (var y = 0; y < brbRows; y += 1) {
        for (var x = 0; x < brbCols; x += 1) {
          dealt.push(cells[y][x]);
        }
      }
      fx.stagger(dealt, { step: 5, ms: 300 });
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
        playSfx("select");
        loadRoom(rooms[index]);
      }
    });

    buildGrid();
    readHue();
    mountBackdrop();
    loadRoom(rooms[campaign.indexOf(campaign.nextLevelId())] || rooms[0]);

    /* Drawer pause: stop pending beats. State is kept, as the hook contract
     * requires - the room is exactly where the player left it. */
    App.quietResetBorrowedBodies = function () {
      clearFxTimers();
    };
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
