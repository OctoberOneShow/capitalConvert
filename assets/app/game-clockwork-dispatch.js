/* Clockwork Dispatch - the rail routing game in the shared game drawer.
 * Trains never stop and never reverse: a train only ever does what the point
 * under it says, so a timetable is a promise the player has to keep. Every
 * board is authored, then proved by the module's own stepper before it is
 * dealt, and the proof's flip count becomes the par. Registered through the
 * game registry, so it needs no markup in the four HTML pages. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;
  var isMotionOff = App.isMotionOff;

  var cwkWide = 396;
  var cwkTall = 300;
  var cwkCellSize = 36;
  var cwkCol = 36;
  var cwkRow = 36;
  var cwkCols = 9;
  var cwkRows = 7;
  /* Directions are indices: 0 right, 1 up, 2 left, 3 down. */
  var cwkDX = [1, 0, -1, 0];
  var cwkDY = [0, -1, 0, 1];
  var cwkCrashLimit = 3;
  /* A wreck must hurt more than an extra flip, or nobody plans ahead. */
  var cwkCrashCost = 4;

  var cwkLevels = [
    {
      id: "d1",
      labelKey: "cwkZ1",
      limit: 16,
      hold: 2,
      tickMs: 620,
      rows: ["####.####", "####.####", "####.####", ".........", "#########", "#########", "#########"],
      cells: [{ x: 4, y: 3, kind: "p", a: 0, b: 1, init: 0 }],
      stations: [{ edge: "r", pos: 3, colour: 0 }, { edge: "t", pos: 4, colour: 1 }],
      trains: [{ c: 0, row: 3, tick: 0 }, { c: 1, row: 3, tick: 4 }],
    },
    {
      id: "d2",
      labelKey: "cwkZ2",
      limit: 18,
      hold: 2,
      tickMs: 600,
      rows: ["###.#####", "###.#####", ".........", "#########", "#########", ".........", "######.##"],
      cells: [{ x: 3, y: 2, kind: "p", a: 0, b: 1, init: 0 }, { x: 6, y: 5, kind: "p", a: 0, b: 3, init: 0 }],
      stations: [{ edge: "r", pos: 2, colour: 0 }, { edge: "t", pos: 3, colour: 1 }, { edge: "r", pos: 5, colour: 2 }, { edge: "b", pos: 6, colour: 0 }],
      trains: [{ c: 0, row: 2, tick: 0 }, { c: 2, row: 5, tick: 1 }, { c: 1, row: 2, tick: 3 }, { c: 0, row: 5, tick: 5 }],
    },
    {
      id: "d3",
      labelKey: "cwkZ3",
      limit: 22,
      hold: 2,
      tickMs: 560,
      rows: ["####.####", ".........", "####.####", "####.####", "####.####", ".........", "#########"],
      cells: [{ x: 4, y: 5, kind: "p", a: 0, b: 1, init: 0 }, { x: 4, y: 1, kind: "p", a: 0, b: 1, init: 0 }, { x: 1, y: 1, kind: "s", init: 0 }],
      stations: [{ edge: "r", pos: 5, colour: 0 }, { edge: "r", pos: 1, colour: 1 }, { edge: "t", pos: 4, colour: 2 }],
      trains: [{ c: 0, row: 5, tick: 0 }, { c: 1, row: 1, tick: 2 }, { c: 2, row: 5, tick: 5 }, { c: 1, row: 1, tick: 9 }],
    },
    {
      id: "d4",
      labelKey: "cwkZ4",
      limit: 20,
      hold: 2,
      tickMs: 560,
      rows: ["#####.###", "#####.###", "#####.###", ".........", "#####.###", "#####.###", "........."],
      cells: [{ x: 5, y: 6, kind: "p", a: 0, b: 1, init: 0 }, { x: 2, y: 3, kind: "s", init: 0 }],
      stations: [{ edge: "r", pos: 3, colour: 0 }, { edge: "t", pos: 5, colour: 1 }],
      trains: [{ c: 1, row: 6, tick: 0 }, { c: 0, row: 3, tick: 3 }, { c: 0, row: 3, tick: 6 }],
    },
    {
      id: "d5",
      labelKey: "cwkZ5",
      limit: 28,
      hold: 3,
      tickMs: 480,
      rows: ["##.###.##", "##.###.##", "##.###.##", ".........", "##.###.##", "##.###.##", "........."],
      cells: [{ x: 2, y: 3, kind: "p", a: 0, b: 1, init: 0 }, { x: 6, y: 3, kind: "p", a: 0, b: 1, init: 0 }, { x: 2, y: 6, kind: "p", a: 0, b: 1, init: 0 }, { x: 6, y: 6, kind: "p", a: 0, b: 1, init: 0 }, { x: 1, y: 3, kind: "s", init: 0 }],
      stations: [{ edge: "r", pos: 3, colour: 0 }, { edge: "r", pos: 6, colour: 1 }, { edge: "t", pos: 2, colour: 2 }, { edge: "t", pos: 6, colour: 2 }],
      trains: [{ c: 0, row: 3, tick: 0 }, { c: 1, row: 6, tick: 1 }, { c: 2, row: 3, tick: 5 }, { c: 2, row: 6, tick: 8 }, { c: 0, row: 3, tick: 12 }, { c: 1, row: 6, tick: 13 }],
    },
  ];

  function cwkBoard(level) {
    if (level.board) {
      return level.board;
    }
    var track = {};
    var cell = {};
    var station = {};
    level.rows.forEach(function (row, y) {
      for (var x = 0; x < cwkCols; x += 1) {
        if (String(row).charAt(x) === ".") {
          track[x + "," + y] = 1;
        }
      }
    });
    level.cells.forEach(function (def, index) {
      cell[def.x + "," + def.y] = index;
      track[def.x + "," + def.y] = 1;
    });
    level.stations.forEach(function (def, index) {
      station[def.edge + ":" + def.pos] = index;
      def.count = 0;
    });
    level.board = { track: track, cell: cell, station: station };
    return level.board;
  }

  /* Spawn order follows the timetable, so `spawned` doubles as the cursor. */
  function cwkSpawn(level, st, tick) {
    var board = cwkBoard(level);
    while (st.spawned < level.trains.length && level.trains[st.spawned].tick <= tick) {
      var def = level.trains[st.spawned];
      var train = { id: st.nextId, c: def.c, x: 0, y: def.row, dir: 0, hold: 0, dead: false };
      st.nextId += 1;
      st.spawned += 1;
      if (!board.track["0," + def.row] || st.occupied["0," + def.row] !== undefined) {
        cwkWreck(st, train, "signal");
        continue;
      }
      st.trains.push(train);
      st.occupied[train.x + "," + train.y] = train.id;
    }
  }

  function cwkWreck(st, train, why) {
    if (train.dead) {
      return;
    }
    train.dead = true;
    st.crashes += 1;
    st.events.push({ tick: st.tick, type: "crash", train: train.id, colour: train.c, why: why });
  }

  function cwkExit(st, train, dir) {
    var level = st.level;
    var board = cwkBoard(level);
    var edge = dir === 0 ? "r" : dir === 1 ? "t" : dir === 2 ? "l" : "b";
    var pos = dir === 0 || dir === 2 ? train.y : train.x;
    var found = board.station[edge + ":" + pos];
    if (found === undefined) {
      cwkWreck(st, train, "derail");
      return;
    }
    var station = level.stations[found];
    if (station.colour !== train.c) {
      cwkWreck(st, train, "wrong");
      return;
    }
    train.dead = true;
    st.delivered += 1;
    station.count = (station.count || 0) + 1;
    st.events.push({ tick: st.tick, type: "deliver", train: train.id, colour: train.c, station: found });
  }

  function cwkNote(train) {
    return { id: train.id, c: train.c, x: train.x, y: train.y, dir: train.dir, hold: train.hold };
  }

  /* One clock beat. Flips land before the movement, which is exactly when a
   * player's click takes effect, so a solved plan and the live board agree. */
  function cwkStep(st, flips) {
    var level = st.level;
    var board = cwkBoard(level);
    if (st.over) {
      return st;
    }
    if (flips && flips.length) {
      flips.forEach(function (flip) {
        if (flip.cell >= 0 && flip.cell < level.cells.length) {
          st.settings[flip.cell] = flip.value ? 1 : 0;
        }
      });
    }
    st.tick += 1;

    var intents = [];
    var stays = {};
    st.trains.forEach(function (train) {
      var index = board.cell[train.x + "," + train.y];
      var dir = train.dir;
      var canWait = false;
      if (index !== undefined) {
        var def = level.cells[index];
        if (def.kind === "p") {
          dir = st.settings[index] === 0 ? def.a : def.b;
        } else {
          canWait = true;
          if (train.hold > 0) {
            train.hold -= 1;
            intents.push({ train: train, stay: true });
            return;
          }
        }
      }
      intents.push({ train: train, dir: dir, nx: train.x + cwkDX[dir], ny: train.y + cwkDY[dir], canWait: canWait });
    });
    intents.forEach(function (intent) {
      if (intent.stay) {
        stays[intent.train.x + "," + intent.train.y] = intent.train.id;
      }
    });

    var moving = {};
    var wanted = {};
    intents.forEach(function (intent) {
      if (intent.stay) {
        return;
      }
      if (intent.nx < 0 || intent.ny < 0 || intent.nx >= cwkCols || intent.ny >= cwkRows) {
        intent.left = true;
        return;
      }
      var target = intent.nx + "," + intent.ny;
      if (!board.track[target]) {
        intent.blocked = true;
        return;
      }
      if (stays[target] !== undefined) {
        /* A train already pulled into a siding may simply wait it out. */
        if (intent.canWait) {
          intent.stay = true;
          stays[intent.train.x + "," + intent.train.y] = intent.train.id;
          return;
        }
        intent.rear = true;
        return;
      }
      wanted[target] = (wanted[target] || 0) + 1;
      moving[intent.train.id] = intent;
    });
    intents.forEach(function (intent) {
      if (intent.stay || intent.left || intent.blocked || intent.rear) {
        return;
      }
      var target = intent.nx + "," + intent.ny;
      var other = st.occupied[target];
      if (other !== undefined && other !== intent.train.id && !moving[other]) {
        if (intent.canWait) {
          intent.stay = true;
          stays[intent.train.x + "," + intent.train.y] = intent.train.id;
          delete moving[intent.train.id];
          return;
        }
        intent.rear = true;
        delete moving[intent.train.id];
        return;
      }
      if (wanted[target] > 1) {
        intent.crowd = true;
        delete moving[intent.train.id];
      }
    });
    intents.forEach(function (intent) {
      if (intent.stay) {
        return;
      }
      if (intent.left) {
        cwkExit(st, intent.train, intent.dir);
      } else if (intent.blocked) {
        cwkWreck(st, intent.train, "block");
      } else if (intent.rear || intent.crowd) {
        cwkWreck(st, intent.train, intent.rear ? "rear" : "crowd");
      }
    });
    /* Two trains that trade places went straight through each other. */
    intents.forEach(function (a) {
      if (a.stay || a.left || a.blocked || a.rear || a.crowd) {
        return;
      }
      intents.forEach(function (b) {
        if (a === b || b.stay || b.left || b.blocked || b.rear || b.crowd) {
          return;
        }
        if (b.train.x === a.nx && b.train.y === a.ny && a.train.x === b.nx && a.train.y === b.ny) {
          a.crowd = true;
          b.crowd = true;
          delete moving[a.train.id];
          delete moving[b.train.id];
          cwkWreck(st, a.train, "crowd");
          cwkWreck(st, b.train, "crowd");
        }
      });
    });

    var occupied = {};
    st.trains.forEach(function (train) {
      if (train.dead) {
        return;
      }
      var intent = moving[train.id];
      if (intent) {
        train.x = intent.nx;
        train.y = intent.ny;
        train.dir = intent.dir;
        var index = board.cell[train.x + "," + train.y];
        if (index !== undefined && level.cells[index].kind === "s" && st.settings[index] === 1) {
          train.hold = level.hold || 2;
        }
      }
      occupied[train.x + "," + train.y] = train.id;
    });
    st.occupied = occupied;
    st.trains = st.trains.filter(function (train) {
      return !train.dead;
    });
    cwkSpawn(level, st, st.tick);
    cwkFinish(level, st);
    if (st.frames) {
      st.frames.push({
        tick: st.tick,
        trains: st.trains.map(cwkNote),
      });
    }
    return st;
  }

  function cwkFinish(level, st) {
    var total = level.trains.length;
    if (st.crashes >= cwkCrashLimit) {
      st.over = "fail";
      return;
    }
    if (st.spawned >= total && !st.trains.length) {
      st.over = st.delivered >= total ? "win" : "fail";
      return;
    }
    if (st.tick >= (level.limit || 24)) {
      st.over = st.delivered >= total && !st.trains.length ? "win" : "fail";
    }
  }

  function cwkFresh(level, keepFrames) {
    var board = cwkBoard(level);
    board &&
      level.stations.forEach(function (station) {
        station.count = 0;
      });
    var st = {
      level: level,
      tick: 0,
      spawned: 0,
      nextId: 0,
      crashes: 0,
      delivered: 0,
      over: "",
      occupied: {},
      settings: level.cells.map(function (def) {
        return def.init ? 1 : 0;
      }),
      trains: [],
      events: [],
      frames: keepFrames ? [] : null,
    };
    cwkSpawn(level, st, 0);
    if (st.frames) {
      st.frames.push({ tick: 0, trains: st.trains.map(cwkNote) });
    }
    cwkFinish(level, st);
    return st;
  }

  /* Public stepper: settings are copied in, so a caller can replay a board. */
  function dispatchSimulate(level, switches, ticks) {
    var st = cwkFresh(level, true);
    if (switches) {
      switches.forEach(function (value, index) {
        if (index < st.settings.length) {
          st.settings[index] = value ? 1 : 0;
        }
      });
    }
    var steps = ticks === undefined ? level.limit || 24 : ticks;
    for (var tick = 0; tick < steps && !st.over; tick += 1) {
      cwkStep(st, null);
    }
    return {
      over: st.over,
      tick: st.tick,
      crashes: st.crashes,
      delivered: st.delivered,
      total: level.trains.length,
      settings: st.settings.slice(),
      frames: st.frames,
      events: st.events,
    };
  }

  /* Runs a proven flip plan - [{cell, value, tick}] - through the same stepper
   * the live board uses, so a solver result can never drift from the game. */
  function dispatchRun(level, plan, ticks) {
    var st = cwkFresh(level, true);
    var schedule = (plan || []).slice();
    var steps = ticks === undefined ? level.limit || 24 : ticks;
    for (var tick = 0; tick < steps && !st.over; tick += 1) {
      var at = st.tick + 1;
      var flips = [];
      schedule = schedule.filter(function (flip) {
        if (flip.tick === at) {
          flips.push(flip);
          return false;
        }
        return true;
      });
      cwkStep(st, flips);
    }
    return {
      over: st.over,
      tick: st.tick,
      crashes: st.crashes,
      delivered: st.delivered,
      total: level.trains.length,
      settings: st.settings.slice(),
      frames: st.frames,
      events: st.events,
      unscheduled: schedule.length,
    };
  }

  function cwkClone(level, st) {
    var copy = {
      level: level,
      tick: st.tick,
      spawned: st.spawned,
      nextId: st.nextId,
      crashes: st.crashes,
      delivered: st.delivered,
      over: st.over,
      occupied: {},
      settings: st.settings.slice(),
      events: [],
      frames: null,
      trains: st.trains.map(function (train) {
        return { id: train.id, c: train.c, x: train.x, y: train.y, dir: train.dir, hold: train.hold, dead: false };
      }),
    };
    st.trains.forEach(function (train) {
      if (!train.dead) {
        copy.occupied[train.x + "," + train.y] = train.id;
      }
    });
    return copy;
  }

  function cwkKey(st) {
    var parts = [st.settings.join(""), "s" + st.spawned, "d" + st.delivered];
    st.trains.forEach(function (train) {
      parts.push(train.x + "." + train.y + "." + train.dir + "." + train.hold);
    });
    return parts.join("|");
  }

  /* Breadth-first over the flip schedule, keeping only collision-free lines:
   * what comes back is a proof, and its flip count is the par. */
  function cwkSolve(level, cap) {
    var budget = cap || 1400;
    var start = cwkFresh(level, false);
    var layer = [{ state: start, flips: [] }];
    var best = null;
    var rounds = 0;
    while (layer.length && rounds < 200) {
      rounds += 1;
      var next = {};
      var count = 0;
      layer.forEach(function (entry) {
        if (best && entry.flips.length > best.flips.length) {
          return;
        }
        var at = entry.state.tick + 1;
        var actions = [[]];
        level.cells.forEach(function (def, index) {
          actions.push([{ cell: index, value: entry.state.settings[index] ? 0 : 1, tick: at }]);
        });
        actions.forEach(function (action) {
          var st = cwkClone(level, entry.state);
          cwkStep(st, action);
          if (st.crashes > 0) {
            return;
          }
          var flips = action.length ? entry.flips.concat(action) : entry.flips;
          if (st.over === "win") {
            if (!best || flips.length < best.flips.length) {
              best = { flips: flips, tick: st.tick };
            }
            return;
          }
          if (st.over) {
            return;
          }
          if (best && flips.length > best.flips.length) {
            return;
          }
          var key = cwkKey(st) + "@" + st.tick;
          if (next[key] && next[key].flips.length <= flips.length) {
            return;
          }
          next[key] = { state: st, flips: flips };
          count += 1;
        });
      });
      var queue = Object.keys(next).map(function (key) {
        return next[key];
      });
      if (queue.length > budget) {
        queue.sort(function (a, b) {
          return a.flips.length - b.flips.length;
        });
        queue.length = budget;
      }
      layer = queue;
      if (!layer.length) {
        break;
      }
    }
    if (!best) {
      return { solvable: false, par: 0, plan: [], searched: rounds };
    }
    return { solvable: true, par: best.flips.length, plan: best.flips, searched: rounds };
  }

  /* A level is only dealt when the search proves a collision-free schedule AND
   * that plan replays as a win through the public runner. `needsWork` records
   * that the untouched timetable really does wreck something. */
  function dispatchSolvable(level, cap) {
    var proof = cwkSolve(level, cap);
    var plain = dispatchSimulate(level, null, level.limit);
    var replay = proof.solvable ? dispatchRun(level, proof.plan, level.limit) : null;
    return {
      solvable: !!replay && replay.over === "win" && replay.crashes === 0,
      needsWork: plain.over !== "win",
      par: proof.par,
      plan: proof.plan,
      idleCrashes: plain.crashes,
      searched: proof.searched,
    };
  }

  function cwkColourHex(index) {
    return ["#22d3ee", "#fbbf24", "#fb7185"][index % 3];
  }

  function cwkColourKey(index) {
    return ["cwkColA", "cwkColB", "cwkColC"][index % 3];
  }

  function cwkGlyph(colour) {
    return ["A", "B", "C"][colour % 3];
  }

  function initClockworkDispatchGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "clockwork-dispatch-campaign", levels: cwkLevels });
    var level = cwkLevels[campaign.indexOf(campaign.nextLevelId())] || cwkLevels[0];
    var par = 3;
    var proof = null;
    var st = cwkFresh(level, true);
    var cursor = 0;
    var live = false;
    var flips = 0;
    var finished = false;
    var rafId = null;
    var timerId = null;

    function el(tag, className, key) {
      var node = document.createElement(tag);
      if (className) {
        node.className = className;
      }
      if (key) {
        node.setAttribute("data-i18n", key);
        node.textContent = t(key);
      }
      return node;
    }

    function makeStat(key, valueEl) {
      var stat = el("div", "game-stat");
      stat.appendChild(el("span", "", key));
      stat.appendChild(valueEl);
      return stat;
    }

    /* --- markup: built with createElement so the headless harness sees it --- */
    var hud = el("div", "game-hud");
    var clockEl = el("strong");
    var crashEl = el("strong");
    var haulEl = el("strong");
    var flipEl = el("strong");
    hud.appendChild(makeStat("cwkClockLabel", clockEl));
    hud.appendChild(makeStat("cwkCrashLabel", crashEl));
    hud.appendChild(makeStat("cwkHaulLabel", haulEl));
    hud.appendChild(makeStat("cwkFlipLabel", flipEl));

    var canvas = el("canvas", "cwk-canvas");
    canvas.width = cwkWide;
    canvas.height = cwkTall;
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", t("cwkFieldLabel"));

    var legend = el("p", "cwk-legend");

    var result = el("p", "game-result");
    result.setAttribute("role", "status");

    var boardRow = el("div", "elements-row");
    var boardLabel = el("label", "elements-label", "cwkBoardSelectLabel");
    boardLabel.setAttribute("for", "cwkBoardSel");
    var boardSel = el("select", "elements-select");
    boardSel.id = "cwkBoardSel";
    boardRow.appendChild(boardLabel);
    boardRow.appendChild(boardSel);

    var actions = el("div", "game-actions");
    var runBtn = el("button", "primary");
    runBtn.type = "button";
    var runLabel = el("span", "", "cwkBtnRun");
    var runContent = el("span", "button-content");
    runContent.appendChild(runLabel);
    runBtn.appendChild(runContent);
    var bestEl = el("p", "game-best");
    actions.appendChild(runBtn);
    actions.appendChild(bestEl);

    var hint = el("p", "game-hint", "cwkHint");

    [hud, canvas, legend, result, boardRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    var ctx = canvas.getContext("2d");

    function cwkNeeds(colour) {
      return level.trains.filter(function (train) {
        return train.c === colour;
      }).length;
    }

    function setRunLabel(key) {
      runLabel.setAttribute("data-i18n", key);
      runLabel.textContent = t(key);
    }

    function renderHud() {
      clockEl.textContent = t("cwkTickValue", { n: st.tick, max: level.limit });
      crashEl.textContent = t("cwkCrashValue", { n: st.crashes, max: cwkCrashLimit });
      haulEl.textContent = t("cwkHaulValue", { n: st.delivered, max: level.trains.length });
      flipEl.textContent = t("cwkFlipValue", { n: flips, par: par });
    }

    function refreshPicker() {
      fillCampaignPicker(
        boardSel,
        campaign,
        function (def) {
          return t(def.labelKey);
        },
        t("elementsLocked"),
      );
      boardSel.value = level.id;
      bestEl.textContent = t("campaignStars", {
        n: campaign.totalStars(),
        max: campaign.maxStars(),
      });
    }

    function haulLine() {
      var parts = level.stations.map(function (station) {
        return (
          t(cwkColourKey(station.colour)) +
          " " +
          (station.count || 0) +
          "/" +
          cwkNeeds(station.colour) +
          " " +
          t("cwkEdge" + station.edge.toUpperCase()) +
          " " +
          (station.pos + 1)
        );
      });
      return parts.join(" \u00b7 ");
    }

    function flipCell(index) {
      if (finished || index < 0 || index >= level.cells.length) {
        return;
      }
      st.settings[index] = st.settings[index] ? 0 : 1;
      flips += 1;
      renderHud();
      render();
    }

    function cellFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return -1;
      }
      var px = (event.clientX - rect.left) * (canvas.width / rect.width);
      var py = (event.clientY - rect.top) * (canvas.height / rect.height);
      var gx = Math.floor((px - cwkCol) / cwkCellSize);
      var gy = Math.floor((py - cwkRow) / cwkCellSize);
      var found = -1;
      level.cells.forEach(function (def, index) {
        if (def.x === gx && def.y === gy) {
          found = index;
        }
      });
      return found;
    }

    function startRun() {
      if (finished || live || timerId !== null) {
        return;
      }
      live = true;
      timerId = window.setInterval(stepClock, level.tickMs || 560);
      setRunLabel("cwkBtnPause");
      startLoop();
    }

    function pauseRun() {
      live = false;
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
      stopLoop();
      if (!finished) {
        setRunLabel(st.tick ? "cwkBtnResume" : "cwkBtnRun");
      }
    }

    /* The timetable advances on this fixed beat only, never on frame luck. */
    function stepClock() {
      if (panelEl.hidden || document.hidden || finished || !live) {
        return;
      }
      cwkStep(st, null);
      renderHud();
      render();
      if (st.over) {
        settle();
      }
    }

    function settle() {
      finished = true;
      pauseRun();
      stopLoop();
      if (st.over === "win") {
        var value = st.crashes * cwkCrashCost + flips;
        var starsWon = starsFor(value, [par, par + 2, par + 5], "low");
        var outcome = campaign.record(level.id, { stars: starsWon, best: value, better: "low" });
        var message = t("cwkWin", { n: st.delivered, f: flips, s: starsWon });
        if (outcome.isBest) {
          message += " " + t("newBest");
        }
        if (outcome.unlockedNext) {
          message += " " + t("cwkNextBoard");
        } else if (campaign.clearedCount() === cwkLevels.length) {
          message += " " + t("cwkTimetableDone");
        }
        result.textContent = message;
        logAction(t("logClockworkDispatch", { n: flips }));
        var rect = runBtn.getBoundingClientRect();
        createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        petNotifyGame(outcome.isBest || outcome.firstClear);
        refreshPicker();
      } else {
        result.textContent =
          st.crashes >= cwkCrashLimit
            ? t("cwkCrashOut", { n: level.trains.length - st.delivered })
            : t("cwkMissed", { n: st.delivered, total: level.trains.length });
      }
      setRunLabel("cwkBtnAgain");
      renderHud();
      render();
    }

    function stopRun() {
      pauseRun();
      stopLoop();
      finished = false;
      flips = 0;
      cursor = 0;
      st = cwkFresh(level, true);
      result.textContent = t("cwkStopped", { name: t(level.labelKey), p: par });
      renderHud();
      setRunLabel("cwkBtnRun");
      startLoop();
      render();
    }

    function loadBoard(def) {
      pauseRun();
      stopLoop();
      level = def;
      proof = cwkSolve(def);
      par = proof.solvable ? proof.par : 3;
      st = cwkFresh(def, true);
      cursor = 0;
      flips = 0;
      finished = false;
      renderHud();
      refreshPicker();
      result.textContent = proof.solvable
        ? t("cwkPrompt", { name: t(def.labelKey), n: def.trains.length, p: par })
        : t("cwkUnproven", { name: t(def.labelKey) });
      setRunLabel("cwkBtnRun");
      startLoop();
      render();
    }

    function stationBox(station) {
      if (station.edge === "r") {
        return { x: cwkCol + cwkCols * cwkCellSize, y: cwkRow + station.pos * cwkCellSize, w: cwkCol, h: cwkCellSize };
      }
      if (station.edge === "l") {
        return { x: 0, y: cwkRow + station.pos * cwkCellSize, w: cwkCol, h: cwkCellSize };
      }
      if (station.edge === "t") {
        return { x: cwkCol + station.pos * cwkCellSize, y: 0, w: cwkCellSize, h: cwkRow };
      }
      return { x: cwkCol + station.pos * cwkCellSize, y: cwkRow + cwkRows * cwkCellSize, w: cwkCellSize, h: cwkTall - cwkRow - cwkRows * cwkCellSize };
    }

    function drawArrow(cx, cy, dir) {
      var dx = cwkDX[dir];
      var dy = cwkDY[dir];
      ctx.strokeStyle = "rgba(226, 232, 240, 0.95)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - dx * 9, cy - dy * 9);
      ctx.lineTo(cx + dx * 9, cy + dy * 9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + dx * 9, cy + dy * 9);
      ctx.lineTo(cx + dx * 3 - dy * 5, cy + dy * 3 + dx * 5);
      ctx.lineTo(cx + dx * 3 + dy * 5, cy + dy * 3 - dx * 5);
      ctx.closePath();
      ctx.fillStyle = "rgba(226, 232, 240, 0.95)";
      ctx.fill();
    }

    /* Canvas text wants font, colour and alignment together. */
    function stamp(value, x, y, px, colour, bold, align, base) {
      ctx.fillStyle = colour;
      ctx.font = (bold ? "bold " : "") + px + "px 'JetBrains Mono', monospace";
      ctx.textAlign = align || "center";
      ctx.textBaseline = base || "middle";
      ctx.fillText(value, x, y);
    }

    function render() {
      var board = cwkBoard(level);
      var now = Date.now();
      ctx.clearRect(0, 0, cwkWide, cwkTall);
      ctx.fillStyle = "rgba(8, 12, 20, 0.92)";
      ctx.fillRect(0, 0, cwkWide, cwkTall);

      for (var y = 0; y < cwkRows; y += 1) {
        for (var x = 0; x < cwkCols; x += 1) {
          var px = cwkCol + x * cwkCellSize;
          var py = cwkRow + y * cwkCellSize;
          if (board.track[x + "," + y]) {
            ctx.fillStyle = "rgba(30, 41, 59, 0.95)";
            ctx.fillRect(px, py, cwkCellSize, cwkCellSize);
            ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px + 3, py + cwkCellSize / 2 - 5);
            ctx.lineTo(px + cwkCellSize - 3, py + cwkCellSize / 2 - 5);
            ctx.moveTo(px + 3, py + cwkCellSize / 2 + 5);
            ctx.lineTo(px + cwkCellSize - 3, py + cwkCellSize / 2 + 5);
            ctx.stroke();
          } else {
            ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
            ctx.fillRect(px + 7, py + 7, cwkCellSize - 14, cwkCellSize - 14);
          }
        }
      }

      level.stations.forEach(function (station) {
        var box = stationBox(station);
        ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
        ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.strokeStyle = cwkColourHex(station.colour);
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x + 2, box.y + 2, Math.max(2, box.w - 4), Math.max(2, box.h - 4));
        stamp(cwkGlyph(station.colour), box.x + box.w / 2, box.y + box.h / 2 - 6, 13, cwkColourHex(station.colour), true);
        stamp((station.count || 0) + "/" + cwkNeeds(station.colour), box.x + box.w / 2, box.y + box.h / 2 + 8, 10, "rgba(226, 232, 240, 0.92)");
      });

      level.cells.forEach(function (def, index) {
        var px = cwkCol + def.x * cwkCellSize;
        var py = cwkRow + def.y * cwkCellSize;
        var on = st.settings[index] === 1;
        ctx.strokeStyle = on ? "#a3e635" : "#38bdf8";
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 3, py + 3, cwkCellSize - 6, cwkCellSize - 6);
        if (def.kind === "p") {
          drawArrow(px + cwkCellSize / 2, py + cwkCellSize / 2, on ? def.b : def.a);
        } else {
          stamp(on ? "H" : "O", px + cwkCellSize / 2, py + cwkCellSize / 2, 14, on ? "#a3e635" : "#38bdf8", true);
        }
        stamp(String(index + 1), px + 5, py + 4, 9, "rgba(148, 163, 184, 0.95)", false, "left", "top");
        if (index === cursor && !finished) {
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = "rgba(0, 242, 255, 0.95)";
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, cwkCellSize - 2, cwkCellSize - 2);
          ctx.setLineDash([]);
        }
      });

      var pulse = isMotionOff() || !live ? 1 : 1 + Math.sin(now / 190) * 0.06;
      st.trains.forEach(function (train) {
        var px = cwkCol + train.x * cwkCellSize;
        var py = cwkRow + train.y * cwkCellSize;
        var flat = train.dir === 0 || train.dir === 2;
        var w = (flat ? 28 : 17) * pulse;
        var h = (flat ? 17 : 28) * pulse;
        ctx.fillStyle = cwkColourHex(train.c);
        ctx.fillRect(px + cwkCellSize / 2 - w / 2, py + cwkCellSize / 2 - h / 2, w, h);
        stamp(cwkGlyph(train.c), px + cwkCellSize / 2, py + cwkCellSize / 2, 11, "#0f172a", true);
        if (train.hold > 0) {
          ctx.strokeStyle = "#a3e635";
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 4, py + 4, cwkCellSize - 8, cwkCellSize - 8);
          stamp(String(train.hold), px + cwkCellSize - 8, py + 9, 9, "#a3e635", true);
        }
      });

      level.trains.forEach(function (train) {
        stamp("+" + cwkGlyph(train.c) + ":" + train.tick, cwkCol / 2, cwkRow + train.row * cwkCellSize + cwkCellSize / 2, 10, "rgba(148, 163, 184, 0.95)");
      });

      legend.textContent = haulLine();
    }

    function frame() {
      if (rafId === null) {
        return;
      }
      if (panelEl.hidden || document.hidden || !live || isMotionOff()) {
        rafId = window.requestAnimationFrame(frame);
        return;
      }
      render();
      rafId = window.requestAnimationFrame(frame);
    }

    function startLoop() {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    canvas.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      var hit = cellFromEvent(event);
      if (hit >= 0) {
        cursor = hit;
        flipCell(hit);
      }
    });

    canvas.addEventListener("pointermove", function (event) {
      var hit = cellFromEvent(event);
      if (hit >= 0 && hit !== cursor && !live) {
        cursor = hit;
        render();
      }
    });

    function toggleRun() {
      if (finished) {
        stopRun();
        return;
      }
      if (live) {
        pauseRun();
        return;
      }
      startRun();
    }

    canvas.addEventListener("keydown", function (event) {
      var key = event.key;
      if (key === "ArrowLeft" || key === "ArrowUp") {
        event.preventDefault();
        cursor = (cursor + level.cells.length - 1) % level.cells.length;
        render();
        return;
      }
      if (key === "ArrowRight" || key === "ArrowDown") {
        event.preventDefault();
        cursor = (cursor + 1) % level.cells.length;
        render();
        return;
      }
      if (key === "Enter") {
        event.preventDefault();
        flipCell(cursor);
        return;
      }
      if (key === " ") {
        event.preventDefault();
        toggleRun();
        return;
      }
      if (key === "Escape") {
        event.preventDefault();
        if (live) {
          pauseRun();
        }
        return;
      }
      if (key === "x" || key === "X") {
        event.preventDefault();
        stopRun();
      }
    });

    runBtn.addEventListener("click", function () {
      toggleRun();
    });

    boardSel.addEventListener("change", function () {
      var index = campaign.indexOf(boardSel.value);
      if (index >= 0 && campaign.isUnlocked(boardSel.value)) {
        loadBoard(cwkLevels[index]);
        return;
      }
      boardSel.value = level.id;
      result.textContent = t("cwkLockedBoard");
    });

    /* Pausing must never wipe a timetable the player is halfway through. */
    App.quietResetClockworkDispatch = function () {
      pauseRun();
      stopLoop();
      render();
    };

    loadBoard(level);
  }

  App.addStrings({
    en: {
      "tabClockworkDispatch": "Clockwork Dispatch",
      "cwkZ1": "First Points",
      "cwkZ2": "Two Junctions",
      "cwkZ3": "Crossing Priority",
      "cwkZ4": "The Siding",
      "cwkZ5": "Evening Rush",
      "cwkClockLabel": "Clock",
      "cwkCrashLabel": "Wrecks",
      "cwkHaulLabel": "Haul",
      "cwkFlipLabel": "Flips",
      "cwkBoardSelectLabel": "Timetable",
      "cwkTickValue": "tick {n}/{max}",
      "cwkCrashValue": "{n}/{max}",
      "cwkHaulValue": "{n}/{max}",
      "cwkFlipValue": "{n}/{par}",
      "cwkFieldLabel": "Signal box: arrow keys move the point cursor, Enter flips the point under it, Space starts and holds the boards",
      "cwkBtnRun": "Start Boards",
      "cwkBtnPause": "Hold Boards",
      "cwkBtnResume": "Resume Boards",
      "cwkBtnAgain": "New Run",
      "cwkColA": "A",
      "cwkColB": "B",
      "cwkColC": "C",
      "cwkEdgeR": "right",
      "cwkEdgeT": "top",
      "cwkEdgeB": "below",
      "cwkEdgeL": "left",
      "cwkPrompt": "{name}: {n} trains due, and the solver proved {p} flips are enough. Set the points, then start the boards.",
      "cwkStopped": "Boards stopped - {name} is back at tick zero, par {p} flips.",
      "cwkWin": "All {n} trains in on {f} flips - {s} stars.",
      "cwkCrashOut": "Three wrecks and the line is closed. {n} trains never arrived.",
      "cwkMissed": "Clock expired: {n} of {total} trains made it in.",
      "cwkNextBoard": "Next timetable unlocked.",
      "cwkTimetableDone": "Every timetable runs on time.",
      "cwkLockedBoard": "That timetable is still sealed - clear the one before it.",
      "cwkUnproven": "The solver could not prove a clean schedule for {name}, so par is only a guess.",
      "cwkHint": "Flip a point so each colour reaches its own station: the blue frame sends trains straight on, green turns them, and the arrow shows which. A siding shows O or H and holds arrivals for a few ticks before letting them go.",
      "logClockworkDispatch": "Ran the boards with {n} flips",
    },
    zh: {
      "tabClockworkDispatch": "发条调度",
      "cwkZ1": "初掌道岔",
      "cwkZ2": "两处道岔",
      "cwkZ3": "交叉路权",
      "cwkZ4": "避让侧线",
      "cwkZ5": "晚高峰",
      "cwkClockLabel": "时钟",
      "cwkCrashLabel": "事故",
      "cwkHaulLabel": "运量",
      "cwkFlipLabel": "扳动",
      "cwkBoardSelectLabel": "时刻表",
      "cwkTickValue": "第 {n}/{max} 拍",
      "cwkCrashValue": "{n}/{max}",
      "cwkHaulValue": "{n}/{max}",
      "cwkFlipValue": "{n}/{par}",
      "cwkFieldLabel": "信号板：方向键移动道岔光标，回车扳动脚下道岔，空格开闸或暂停",
      "cwkBtnRun": "开始运行",
      "cwkBtnPause": "暂停运行",
      "cwkBtnResume": "继续运行",
      "cwkBtnAgain": "重新排班",
      "cwkColA": "甲",
      "cwkColB": "乙",
      "cwkColC": "丙",
      "cwkEdgeR": "右侧",
      "cwkEdgeT": "上方",
      "cwkEdgeB": "下方",
      "cwkEdgeL": "左侧",
      "cwkPrompt": "{name}：{n} 趟列车待发，求解器证明扳 {p} 次就够。先摆好道岔，再开闸运行。",
      "cwkStopped": "已停轮——{name} 回到第 0 拍，标准扳动 {p} 次。",
      "cwkWin": "{n} 趟全部到站，只扳了 {f} 次 - 获得 {s} 星。",
      "cwkCrashOut": "第三次事故，线路关闭：{n} 趟列车没能到达。",
      "cwkMissed": "时间到：{total} 趟里只有 {n} 趟进站。",
      "cwkNextBoard": "解锁下一份时刻表。",
      "cwkTimetableDone": "所有时刻表都正点运行。",
      "cwkLockedBoard": "这份时刻表还没开放——先完成前一份。",
      "cwkUnproven": "求解器证明不了「{name}」有无碰撞的排法，标准次数只能估。",
      "cwkHint": "扳道岔让每种颜色都进自己的车站：蓝框直行、绿框改道，箭头指出当前方向。侧线显示 O 或 H，扣住进站列车几拍后自行放行。",
      "logClockworkDispatch": "扳动 {n} 次完成调度",
    },
  });

  App.registerGame({
    name: "clockworkDispatch",
    tabKey: "tabClockworkDispatch",
    init: initClockworkDispatchGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.8)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M12 38h96M60 12v52" stroke="rgba(148,163,184,.35)" stroke-width="2"/>' +
        '<rect x="18" y="33" width="18" height="10" rx="3" fill="#22d3ee"/>' +
        '<text x="27" y="41" font-size="8" fill="#0f172a" text-anchor="middle">A</text>' +
        '<rect x="42" y="20" width="18" height="10" rx="3" fill="#fb7185"/>' +
        '<text x="51" y="28" font-size="8" fill="#0f172a" text-anchor="middle">C</text>' +
        '<circle cx="60" cy="38" r="9" fill="none" stroke="#a3e635" stroke-width="2"/>' +
        '<path d="M55 38h10M61 34l5 4-5 4" fill="none" stroke="#e2e8f0" stroke-width="2"/>' +
        '<rect x="103" y="32" width="12" height="12" rx="2" fill="none" stroke="#22d3ee" stroke-width="2"/>' +
        '<text x="109" y="41" font-size="7" fill="#22d3ee" text-anchor="middle">A</text></svg>',
      en: [
        "Aim: deliver every train in the timetable to its own station before three wrecks.",
        "Action: click a numbered cell, or move the dashed cursor with the arrow keys and press Enter, to flip that point or siding.",
        "Rule: trains move one cell per tick and never stop, and a point sends every train on it the same way - so the order of your flips is the whole puzzle.",
        "Watch out: two trains in one cell, a train on dead ground, or a train arriving at the wrong colour each count as a wreck.",
        "Clock: Space starts and holds the boards, Escape holds them, X stops and reruns the timetable. Flips apply from the next tick.",
        "Scoring: the solver proves how few flips are enough, and that number is par; a wreck costs dearer than an extra flip.",
      ],
      zh: [
        "目标：让时刻表上的每一趟列车都进自己的车站，全程不出第三次事故。",
        "操作：点击带编号的格子，或用方向键移动虚线光标后按回车，扳动那里的道岔或侧线。",
        "规则：列车每拍走一格且从不停车，同一个道岔对所有来车都指向同一方向——先扳后扳就是全部谜题。",
        "小心：两车同格、驶入无轨道处、进错颜色的站，每次都记一次事故。",
        "时钟：空格开闸与暂停，Esc 暂停，X 停轮重排。扳动从下一拍开始生效。",
        "计分：求解器算出最少需要扳几次，那就是标准次数；一次事故的代价比多扳几下更高。",
      ],
    },
  });

  /* Exported for the other modules and for the headless checks. */
  App.initClockworkDispatchGame = initClockworkDispatchGame;
  App.dispatchSimulate = dispatchSimulate;
  App.dispatchRun = dispatchRun;
  App.dispatchSolvable = dispatchSolvable;
  App.dispatchLevels = cwkLevels;
  App.dispatchSolve = cwkSolve;
})(window.CapitalConvert = window.CapitalConvert || {});
