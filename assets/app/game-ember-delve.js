/* Ember Delve - the turn-based delve in the shared game drawer.
 * A 4x4 room grid is one floor: step between revealed rooms, rest to heal, and
 * fight monsters whose next move is always telegraphed. Every draw comes from a
 * seeded xorshift, so the seed printed in the log replays a run exactly, and
 * combat is a pure function the harness can resolve without any DOM. */
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

  var SIDE = 4;
  var ROOMS = SIDE * SIDE;
  var DEPTH_GOAL = 8;
  /* A turn is one decision on the map (step, rest or descend). The cap is the
   * anti-stall rule: delveRouteBound() proves a shortest legal route needs far
   * fewer turns than this, so the cap can only be reached by wandering. */
  var TURN_CAP = 60;
  var SLOTS = 3;
  var FIGHT_CAP = 14;
  var STRIKE_DAMAGE = 5;
  var HEAVY_DAMAGE = 14;
  var GUARD_VALUE = 5;
  var BITE_VALUE = 3;
  var REST_HEAL = 5;
  var FLEE_COST = 3;
  var HERO_VITALS = 30;

  /* Intents cycle through a fixed pattern per species, which is what makes the
   * telegraph readable: the shown intent is the one that will resolve. */
  var edlBeasts = {
    imp: { glyph: "\u25b2", hp: 10, armor: 0, pattern: [{ k: "strike", v: 4 }, { k: "strike", v: 3 }, { k: "bite" }] },
    adder: { glyph: "\u2248", hp: 13, armor: 0, pattern: [{ k: "bite" }, { k: "strike", v: 2 }, { k: "strike", v: 4 }] },
    husk: { glyph: "\u25c8", hp: 17, armor: 2, pattern: [{ k: "guard" }, { k: "strike", v: 5 }, { k: "strike", v: 3 }] },
    warden: { glyph: "\u271a", hp: 22, armor: 1, pattern: [{ k: "strike", v: 4 }, { k: "summon" }, { k: "guard" }] },
  };

  /* Five seeds, each one monster mix plus one rule twist. */
  var edlLevels = [
    { id: "d1", labelKey: "edlZ1", twistKey: "edlTwist1", seed: 20260107, kinds: ["imp", "adder"], count: 2, armor: 0, regen: 0, starTurns: [27, 34, 46] },
    { id: "d2", labelKey: "edlZ2", twistKey: "edlTwist2", seed: 20260213, kinds: ["imp", "husk"], count: 3, armor: 2, regen: 0, starTurns: [28, 36, 48] },
    { id: "d3", labelKey: "edlZ3", twistKey: "edlTwist3", seed: 20260321, kinds: ["adder", "imp"], count: 3, armor: 0, regen: 2, starTurns: [27, 34, 46] },
    { id: "d4", labelKey: "edlZ4", twistKey: "edlTwist4", seed: 20260409, kinds: ["warden", "imp"], count: 3, armor: 0, regen: 0, starTurns: [30, 38, 50] },
    { id: "d5", labelKey: "edlZ5", twistKey: "edlTwist5", seed: 20260505, kinds: ["husk", "adder", "warden", "imp"], count: 3, armor: 1, regen: 1, starTurns: [28, 36, 48] },
  ];

  function edlInt(value) {
    var num = Number(value);
    return isFinite(num) ? Math.round(num) : 0;
  }

  function edlClamp(value, low, high) {
    return Math.max(low, Math.min(high, edlInt(value)));
  }

  /* xorshift32: small, integer-only, and identical on every engine. */
  function edlRandom(seed) {
    var state = edlInt(seed) >>> 0;
    if (!state) {
      state = 0x9e3779b9;
    }
    return function next() {
      state = (state ^ (state << 13)) >>> 0;
      state = (state ^ (state >>> 17)) >>> 0;
      state = (state ^ (state << 5)) >>> 0;
      return state / 4294967296;
    };
  }

  function edlBeast(kind) {
    return edlBeasts[kind] ? edlBeasts[kind] : edlBeasts.imp;
  }

  function edlSpawn(levelDef, kind, depth, buffed) {
    var spec = edlBeast(kind);
    var hp = spec.hp + Math.floor(Math.max(0, edlInt(depth)) / 2) + (buffed ? 4 : 0);
    return {
      kind: edlBeasts[kind] ? kind : "imp",
      glyph: spec.glyph,
      hp: hp,
      maxHp: hp,
      armor: Math.max(Math.max(0, edlInt(spec.armor)), Math.max(0, edlInt(levelDef && levelDef.armor))),
      guard: 0,
      regen: Math.max(0, edlInt(levelDef && levelDef.regen)),
      step: 0,
    };
  }

  function edlCloneBeast(beast) {
    return {
      kind: beast.kind,
      glyph: beast.glyph || "?",
      hp: edlInt(beast.hp),
      maxHp: edlInt(beast.maxHp) || edlInt(beast.hp),
      armor: Math.max(0, edlInt(beast.armor)),
      guard: Math.max(0, edlInt(beast.guard)),
      regen: Math.max(0, edlInt(beast.regen)),
      step: Math.max(0, edlInt(beast.step)),
    };
  }

  function edlIntent(beast) {
    var pattern = edlBeast(beast.kind).pattern;
    return pattern[beast.step % pattern.length] || pattern[0];
  }

  function edlFirst(list) {
    for (var index = 0; index < list.length; index += 1) {
      if (list[index].hp > 0) {
        return list[index];
      }
    }
    return null;
  }

  function edlStrongest(list) {
    var best = null;
    for (var index = 0; index < list.length; index += 1) {
      if (list[index].hp > 0 && (!best || list[index].hp > best.hp)) {
        best = list[index];
      }
    }
    return best;
  }

  function edlStrikeBeast(beast, raw, events) {
    var soak = beast.armor + beast.guard;
    var dealt = Math.max(0, raw - soak);
    beast.guard = Math.max(0, beast.guard - raw);
    beast.hp = Math.max(0, beast.hp - dealt);
    events.push(t("edlHit", { g: beast.glyph, n: dealt, h: beast.hp }));
    return dealt;
  }

  function edlTakeHit(hero, beast, raw, events) {
    if (hero.dodge > 0) {
      hero.dodge -= 1;
      events.push(t("edlEvade", { g: beast.glyph }));
      return;
    }
    var soaked = Math.min(hero.guard, raw);
    hero.guard -= soaked;
    var dealt = Math.max(0, raw - soaked);
    hero.hp = Math.max(0, hero.hp - dealt);
    if (dealt > 0) {
      events.push(t("edlHurt", { g: beast.glyph, n: dealt, h: hero.hp }));
    } else {
      events.push(t("edlBlocked", { g: beast.glyph }));
    }
  }

  /* The whole round, as a pure resolver: hero actions in the order given, then
   * enemies in list order, damage clamped at zero. No randomness anywhere, so
   * (hero, enemies, actions) always yields the same next state. */
  function delveCombat(hero, enemies, actions) {
    var h = {
      hp: edlInt(hero && hero.hp),
      maxHp: edlInt(hero && hero.maxHp) || HERO_VITALS,
      focus: edlClamp(hero && hero.focus, 0, 2),
      guard: 0,
      dodge: edlClamp(hero && hero.dodge, 0, 3),
    };
    var list = [];
    var source = enemies || [];
    var index;
    for (index = 0; index < source.length; index += 1) {
      list.push(edlCloneBeast(source[index]));
    }
    var events = [];
    var queue = [];
    var requested = actions || [];
    for (index = 0; index < requested.length && queue.length < SLOTS; index += 1) {
      if (requested[index] === "strike" || requested[index] === "guard" || requested[index] === "focus" || requested[index] === "dodge") {
        queue.push(requested[index]);
      }
    }
    for (index = 0; index < queue.length; index += 1) {
      var target = edlFirst(list);
      if (!target) {
        break;
      }
      if (queue[index] === "strike") {
        edlStrikeBeast(target, STRIKE_DAMAGE, events);
      } else if (queue[index] === "guard") {
        h.guard += GUARD_VALUE;
        events.push(t("edlGuarded", { n: h.guard }));
      } else if (queue[index] === "dodge") {
        h.dodge = Math.min(3, h.dodge + 1);
        events.push(t("edlReadied", { n: h.dodge }));
      } else {
        h.focus += 1;
        if (h.focus >= 2) {
          h.focus = 0;
          var heavy = edlStrongest(list) || target;
          events.push(t("edlFocus"));
          edlStrikeBeast(heavy, HEAVY_DAMAGE, events);
        } else {
          events.push(t("edlCharging", { n: h.focus }));
        }
      }
    }
    var live = list.length;
    for (index = 0; index < live; index += 1) {
      var beast = list[index];
      if (beast.hp <= 0) {
        continue;
      }
      var intent = edlIntent(beast);
      if (intent.k === "strike") {
        edlTakeHit(h, beast, intent.v, events);
      } else if (intent.k === "bite") {
        edlTakeHit(h, beast, BITE_VALUE, events);
        edlTakeHit(h, beast, BITE_VALUE, events);
      } else if (intent.k === "guard") {
        beast.guard = Math.min(6, beast.guard + 4);
        events.push(t("edlBeastGuard", { g: beast.glyph }));
      } else if (list.length < 4) {
        list.push(edlCloneBeast(edlSpawn(null, "imp", 0, false)));
        events.push(t("edlSummoned", { g: "\u25b2" }));
      } else {
        beast.hp = Math.min(beast.maxHp, beast.hp + 4);
        events.push(t("edlMended", { g: beast.glyph }));
      }
      if (intent.k !== "guard") {
        /* A brace only covers the round it was telegraphed for. */
        beast.guard = 0;
      }
      beast.step += 1;
      if (beast.regen > 0 && beast.hp > 0) {
        beast.hp = Math.min(beast.maxHp, beast.hp + beast.regen);
      }
    }
    return {
      hero: h,
      enemies: list,
      events: events.slice(0, 6),
      wiped: !edlFirst(list),
      fallen: h.hp <= 0,
    };
  }

  /* One floor. The stair is always 2-4 steps from the entrance, so the route
   * bound below holds for every seed. */
  function edlNeighbours(index) {
    var out = [];
    var x = index % SIDE;
    var y = Math.floor(index / SIDE);
    if (x > 0) {
      out.push(index - 1);
    }
    if (x < SIDE - 1) {
      out.push(index + 1);
    }
    if (y > 0) {
      out.push(index - SIDE);
    }
    if (y < SIDE - 1) {
      out.push(index + SIDE);
    }
    return out;
  }

  function edlDistances(rooms, from) {
    var dist = [];
    var queue = [from];
    var head = 0;
    for (var index = 0; index < ROOMS; index += 1) {
      dist.push(-1);
    }
    dist[from] = 0;
    while (head < queue.length) {
      var cell = queue[head];
      head += 1;
      var near = edlNeighbours(cell);
      for (var n = 0; n < near.length; n += 1) {
        if (rooms[near[n]].open && dist[near[n]] < 0) {
          dist[near[n]] = dist[cell] + 1;
          queue.push(near[n]);
        }
      }
    }
    return dist;
  }

  /* One encounter: a single monster early, a pair from depth 3 on. */
  function edlPack(levelDef, depth, rand) {
    var kinds = levelDef.kinds && levelDef.kinds.length ? levelDef.kinds : ["imp"];
    var pack = [edlSpawn(levelDef, kinds[Math.floor(rand() * kinds.length) % kinds.length], depth, false)];
    if (edlInt(depth) >= 3 && rand() < 0.45) {
      pack.push(edlSpawn(levelDef, kinds[Math.floor(rand() * kinds.length) % kinds.length], depth, false));
    }
    return pack;
  }

  function edlFloor(levelDef, depth, rand) {
    var attempt;
    var index;
    for (attempt = 0; attempt < 30; attempt += 1) {
      var rooms = [];
      for (index = 0; index < ROOMS; index += 1) {
        rooms.push({ open: true, visited: false, seen: false, beasts: [], stair: false });
      }
      var rubble = 1 + Math.floor(rand() * 3);
      for (index = 0; index < rubble; index += 1) {
        rooms[Math.floor(rand() * ROOMS) % ROOMS].open = false;
      }
      var open = [];
      for (index = 0; index < ROOMS; index += 1) {
        if (rooms[index].open) {
          open.push(index);
        }
      }
      if (open.length < 9) {
        continue;
      }
      var start = open[Math.floor(rand() * open.length) % open.length];
      var dist = edlDistances(rooms, start);
      var far = [];
      for (index = 0; index < ROOMS; index += 1) {
        if (dist[index] >= 2 && dist[index] <= 4) {
          far.push(index);
        }
      }
      if (!far.length) {
        continue;
      }
      var stair = far[Math.floor(rand() * far.length) % far.length];
      var monsters = Math.min(4, edlInt(levelDef.count) + (depth % 2));
      var placed = 0;
      var guard = 0;
      while (placed < monsters && guard < 40) {
        guard += 1;
        var spot = open[Math.floor(rand() * open.length) % open.length];
        if (spot === start || spot === stair || rooms[spot].beasts.length) {
          continue;
        }
        rooms[spot].beasts = edlPack(levelDef, depth, rand);
        placed += 1;
      }
      rooms[start].visited = true;
      rooms[stair].beasts = edlPack(levelDef, depth, rand);
      rooms[stair].beasts[0].hp += 4;
      rooms[stair].beasts[0].maxHp = rooms[stair].beasts[0].hp;
      rooms[stair].stair = true;
      return { rooms: rooms, dist: dist, start: start, stair: stair };
    }
    /* Guaranteed fallback: an open floor with the stair opposite the door. */
    var flat = [];
    for (index = 0; index < ROOMS; index += 1) {
      flat.push({ open: true, visited: false, seen: false, beasts: [], stair: false });
    }
    var door = 0;
    var exit = ROOMS - 1;
    flat[door].visited = true;
    flat[door].seen = true;
    flat[exit].stair = true;
    flat[exit].beasts = edlPack(levelDef, depth, edlRandom((levelDef.seed || 7) + depth));
    return { rooms: flat, dist: edlDistances(flat, door), start: door, stair: exit };
  }

  /* The worst-case turn count of a legal shortest route, used by the tests and
   * quoted in the guide: steps + one rest + one descend on every depth. */
  function delveRouteBound() {
    return DEPTH_GOAL * (4 + 1 + 1);
  }

  function edlMaxStairDistance(levelDef, tries) {
    var worst = 0;
    var rand = edlRandom(levelDef.seed || 1);
    var samples = Math.max(1, edlInt(tries) || 12);
    for (var run = 0; run < samples; run += 1) {
      for (var depth = 1; depth <= DEPTH_GOAL; depth += 1) {
        var floor = edlFloor(levelDef, depth, rand);
        var steps = edlInt(floor.dist[floor.stair]);
        if (steps > worst) {
          worst = steps;
        }
      }
    }
    return worst;
  }

  function initEmberDelveGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "ember-delve-campaign", levels: edlLevels });
    var levelDef = edlLevels[Math.max(0, campaign.indexOf(campaign.nextLevelId()))];
    var attempt = 0;
    var run = null;

    /* --- markup: createElement all the way down, no innerHTML --- */
    var hud = edlStatRow();
    var depthEl = hud.values[0];
    var hpEl = hud.values[1];
    var turnEl = hud.values[2];

    var stage = document.createElement("div");
    stage.className = "edl-stage";
    stage.setAttribute("tabindex", "0");
    stage.setAttribute("role", "application");
    stage.setAttribute("aria-label", t("edlFieldLabel"));

    var grid = document.createElement("div");
    grid.className = "edl-grid";
    grid.setAttribute("role", "grid");
    var cells = [];
    for (var index = 0; index < ROOMS; index += 1) {
      var cell = document.createElement("button");
      cell.type = "button";
      cell.className = "edl-room";
      cell.setAttribute("role", "gridcell");
      cell.tabIndex = -1;
      (function (slot) {
        cell.addEventListener("click", function () {
          step(slot);
        });
      })(index);
      cells.push(cell);
      grid.appendChild(cell);
    }

    var legend = document.createElement("p");
    legend.className = "edl-legend";
    legend.setAttribute("aria-hidden", "true");

    var foes = document.createElement("div");
    foes.className = "edl-foes";
    var foeRows = [];
    for (var row = 0; row < 4; row += 1) {
      var line = document.createElement("div");
      line.className = "edl-foe";
      var name = document.createElement("strong");
      var intent = document.createElement("span");
      line.appendChild(name);
      line.appendChild(intent);
      line.hidden = true;
      foes.appendChild(line);
      foeRows.push({ line: line, name: name, intent: intent });
    }

    var controls = document.createElement("div");
    controls.className = "edl-controls";
    var slots = document.createElement("p");
    slots.className = "edl-slots";
    ["strike", "guard", "focus", "dodge"].forEach(function (name2, position) {
      var key = "edlBtn" + name2.charAt(0).toUpperCase() + name2.slice(1);
      var button = edlButton("edl-btn", key, function () {
        queue(name2);
      });
      button.setAttribute("aria-keyshortcuts", String(position + 1));
      controls.appendChild(button);
    });
    var resolveBtn = edlButton("edl-btn edl-go", "edlBtnResolve", function () {
      resolve();
    });
    controls.appendChild(resolveBtn);
    var fleeBtn = edlButton("edl-btn", "edlBtnFlee", function () {
      flee();
    });
    controls.appendChild(fleeBtn);
    controls.appendChild(slots);

    var roamBtns = document.createElement("div");
    roamBtns.className = "edl-controls";
    var restBtn = edlButton("edl-btn", "edlBtnRest", function () {
      rest();
    });
    var descendBtn = edlButton("edl-btn", "edlBtnDescend", function () {
      descend();
    });
    roamBtns.appendChild(restBtn);
    roamBtns.appendChild(descendBtn);

    var log = document.createElement("p");
    log.className = "edl-log";

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var pickerRow = document.createElement("div");
    pickerRow.className = "elements-row";
    var pickerLabel = document.createElement("label");
    pickerLabel.className = "elements-label";
    pickerLabel.setAttribute("for", "edlSeedSel");
    pickerLabel.setAttribute("data-i18n", "edlSeedSelectLabel");
    pickerLabel.textContent = t("edlSeedSelectLabel");
    var picker = document.createElement("select");
    picker.className = "elements-select";
    picker.id = "edlSeedSel";
    pickerRow.appendChild(pickerLabel);
    pickerRow.appendChild(picker);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var newBtn = edlButton("primary", "btnNewRound", function () {
      startRun();
    });
    newBtn.setAttribute("data-i18n", "btnNewRound");
    var bestEl = document.createElement("p");
    bestEl.className = "game-best";
    actions.appendChild(newBtn);
    actions.appendChild(bestEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "edlHint");
    hint.textContent = t("edlHint");

    [hud.row, stage, foes, controls, roamBtns, log, result, pickerRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });
    stage.appendChild(grid);
    stage.appendChild(legend);

    function edlButton(extra, key, handler) {
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

    function edlStatRow() {
      var row = document.createElement("div");
      row.className = "game-hud";
      var values = [];
      ["edlDepthLabel", "edlVitalLabel", "edlTurnLabel"].forEach(function (key) {
        var stat = document.createElement("div");
        stat.className = "game-stat";
        var label = document.createElement("span");
        label.setAttribute("data-i18n", key);
        label.textContent = t(key);
        var value = document.createElement("strong");
        stat.appendChild(label);
        stat.appendChild(value);
        row.appendChild(stat);
        values.push(value);
      });
      return { row: row, values: values };
    }

    function pop(element, name) {
      if (isMotionOff()) {
        return;
      }
      element.classList.remove(name);
      element.classList.add(name);
    }

    /* ---------------- run state ---------------- */
    function startRun() {
      attempt += 1;
      var seed = (levelDef.seed + attempt * 977) >>> 0;
      run = {
        level: levelDef,
        seed: seed,
        rand: edlRandom(seed),
        depth: 1,
        turns: 0,
        hero: { hp: HERO_VITALS, maxHp: HERO_VITALS, focus: 0, guard: 0, dodge: 0 },
        floor: null,
        at: 0,
        from: 0,
        cursor: 0,
        mode: "roam",
        queue: [],
        round: 0,
        fightBeasts: [],
        over: false,
        won: false,
        log: [],
      };
      run.floor = edlFloor(levelDef, 1, run.rand);
      run.at = run.floor.start;
      run.cursor = run.floor.start;
      reveal(run.at);
      result.textContent = t("edlPrompt", {
        name: t(levelDef.labelKey),
        twist: t(levelDef.twistKey),
        cap: TURN_CAP,
      });
      render();
    }

    function reveal(index) {
      var near = edlNeighbours(index);
      run.floor.rooms[index].visited = true;
      for (var n = 0; n < near.length; n += 1) {
        run.floor.rooms[near[n]].seen = true;
      }
      run.floor.rooms[index].seen = true;
    }

    function spendTurn(cost) {
      run.turns += Math.max(1, edlInt(cost));
      if (run.turns >= TURN_CAP && !run.over) {
        run.over = true;
        run.won = false;
        result.textContent = t("edlStall", { n: run.turns, s: run.seed });
      }
    }

    function living(index) {
      var room = run.floor.rooms[index];
      var out = [];
      if (!room) {
        return out;
      }
      for (var i = 0; i < room.beasts.length; i += 1) {
        if (room.beasts[i].hp > 0) {
          out.push(room.beasts[i]);
        }
      }
      return out;
    }

    function step(index) {
      if (!run || run.over || run.mode === "fight") {
        return;
      }
      var rooms = run.floor.rooms;
      if (!rooms[index] || !rooms[index].open) {
        return;
      }
      if (edlNeighbours(run.at).indexOf(index) === -1) {
        result.textContent = t("edlTooFar");
        render();
        return;
      }
      run.from = run.at;
      run.at = index;
      run.cursor = index;
      reveal(index);
      spendTurn(1);
      run.fightBeasts = [];
      if (living(index).length) {
        run.mode = "fight";
        run.queue = [];
        run.round = 0;
        run.log = [t("edlAmbush", { g: rooms[index].beasts[0].glyph, n: living(index).length })];
      } else {
        run.log = [t("edlQuiet")];
      }
      render();
    }

    function rest() {
      if (!run || run.over || run.mode === "fight") {
        return;
      }
      run.hero.hp = Math.min(run.hero.maxHp, run.hero.hp + REST_HEAL);
      var rooms = run.floor.rooms;
      var warden = run.level.twistKey === "edlTwist4" || run.level.twistKey === "edlTwist5";
      var near = edlNeighbours(run.at);
      var pool = [];
      for (var index = 0; index < ROOMS; index += 1) {
        var beside = near.indexOf(index) !== -1;
        if (rooms[index].open && !living(index).length && index !== run.at && (!warden || beside)) {
          pool.push(index);
        }
      }
      if (warden && !pool.length) {
        for (index = 0; index < ROOMS; index += 1) {
          if (rooms[index].open && !living(index).length && index !== run.at) {
            pool.push(index);
          }
        }
      }
      spendTurn(1);
      if (pool.length) {
        var spot = pool[Math.floor(run.rand() * pool.length) % pool.length];
        rooms[spot].beasts = edlPack(run.level, run.depth, run.rand);
        if (warden) {
          rooms[spot].beasts[0].hp += 4;
          rooms[spot].beasts[0].maxHp = rooms[spot].beasts[0].hp;
          rooms[spot].seen = true;
        }
        run.log = [t(warden ? "edlRestWarden" : "edlRestStir", { g: rooms[spot].beasts[0].glyph, n: REST_HEAL })];
      } else {
        run.log = [t("edlRestAlone", { n: REST_HEAL })];
      }
      render();
    }

    function descend() {
      if (!run || run.over || run.mode === "fight") {
        return;
      }
      var room = run.floor.rooms[run.at];
      if (!room.stair || living(run.at).length) {
        result.textContent = t("edlNoStair");
        render();
        return;
      }
      if (run.depth >= DEPTH_GOAL) {
        win();
        return;
      }
      run.depth += 1;
      spendTurn(1);
      run.floor = edlFloor(run.level, run.depth, run.rand);
      run.at = run.floor.start;
      run.cursor = run.floor.start;
      run.fightBeasts = [];
      reveal(run.at);
      run.hero.dodge = 0;
      run.log = [t("edlDescended", { d: run.depth })];
      render();
    }

    function queue(name) {
      if (!run || run.over || run.mode !== "fight") {
        return;
      }
      if (run.queue.length >= SLOTS) {
        return;
      }
      run.queue.push(name);
      render();
    }

    function flee() {
      if (!run || run.over || run.mode !== "fight") {
        return;
      }
      /* Fleeing keeps the wounds you dealt, so no fight can be a dead end. */
      var room = run.floor.rooms[run.at];
      room.beasts = run.fightBeasts.length ? run.fightBeasts : living(run.at);
      run.hero.hp = Math.max(1, run.hero.hp - FLEE_COST);
      run.mode = "roam";
      run.queue = [];
      run.fightBeasts = [];
      run.at = run.from === run.at ? run.floor.start : run.from;
      run.cursor = run.at;
      reveal(run.at);
      spendTurn(2);
      run.log = [t("edlFled", { n: FLEE_COST })];
      render();
    }

    function resolve() {
      if (!run || run.over || run.mode !== "fight") {
        return;
      }
      var room = run.floor.rooms[run.at];
      var beasts = run.fightBeasts.length ? run.fightBeasts : room.beasts;
      var outcome = delveCombat(run.hero, beasts, run.queue);
      run.round += 1;
      run.queue = [];
      run.log = outcome.events;
      run.hero = outcome.hero;
      pop(foes, "edl-shake");
      var live = [];
      for (var index = 0; index < outcome.enemies.length; index += 1) {
        if (outcome.enemies[index].hp > 0) {
          live.push(outcome.enemies[index]);
        }
      }
      if (outcome.fallen) {
        room.beasts = live;
        run.hero.hp = 0;
        run.over = true;
        run.won = false;
        run.mode = "roam";
        run.fightBeasts = [];
        result.textContent = t("edlDeath", { d: run.depth, g: live.length ? live[0].glyph : "?", s: run.seed });
        render();
        return;
      }
      if (!live.length) {
        room.beasts = [];
        run.mode = "roam";
        run.fightBeasts = [];
        run.hero.hp = Math.min(run.hero.maxHp, run.hero.hp + 3);
        run.hero.focus = Math.min(2, run.hero.focus + 1);
        run.log = [t("edlCleared")];
        if (room.stair && run.depth >= DEPTH_GOAL) {
          win();
        }
      } else if (run.round >= FIGHT_CAP) {
        room.beasts = live;
        run.mode = "roam";
        run.fightBeasts = [];
        run.log = [t("edlBroke", { n: FIGHT_CAP })];
      } else {
        room.beasts = live;
        run.fightBeasts = live;
        pop(foes, "edl-shake");
      }
      render();
    }

    function win() {
      if (!run || run.over) {
        return;
      }
      run.over = true;
      run.won = true;
      run.mode = "roam";
      var stars = starsFor(run.turns, levelDef.starTurns, "low");
      var outcome = campaign.record(levelDef.id, { stars: stars, best: run.turns, better: "low" });
      var message = t("edlWin", { n: run.turns, s: stars });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("edlNext");
      } else if (campaign.clearedCount() === edlLevels.length) {
        message += " " + t("edlDone");
      }
      result.textContent = message;
      logAction(t("logEmberDelve", { n: run.turns }));
      var rect = newBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    /* ---------------- rendering ---------------- */
    function roomLabel(room, index) {
      if (!room.open) {
        return t("edlRubble");
      }
      var pack = [];
      for (var i = 0; i < room.beasts.length; i += 1) {
        if (room.beasts[i].hp > 0) {
          pack.push(room.beasts[i]);
        }
      }
      if (index === run.at) {
        return pack.length ? t("edlRoomFight", { n: pack.length }) : t("edlYouAreHere");
      }
      if (!room.seen && !room.visited) {
        return t("edlUnseen");
      }
      if (pack.length) {
        var total = 0;
        for (i = 0; i < pack.length; i += 1) {
          total += pack[i].hp;
        }
        return t("edlRoomBeast", { g: pack[0].glyph, n: total, x: pack.length });
      }
      if (room.stair) {
        return t("edlRoomStair");
      }
      return t("edlRoomEmpty");
    }

    function render() {
      if (!run) {
        return;
      }
      depthEl.textContent = t("edlDepthValue", { n: run.depth, max: DEPTH_GOAL });
      hpEl.textContent = t("edlVitalValue", { n: run.hero.hp, max: run.hero.maxHp });
      turnEl.textContent = t("edlTurnValue", { n: Math.max(0, TURN_CAP - run.turns), s: run.seed });

      var rooms = run.floor.rooms;
      for (var index = 0; index < ROOMS; index += 1) {
        var room = rooms[index];
        var cell = cells[index];
        var live = living(index);
        var pooled = 0;
        for (var b = 0; b < live.length; b += 1) {
          pooled += live[b].hp;
        }
        var text = "\u00b7";
        var cls = "edl-room";
        if (!room.open) {
          text = "\u2592";
          cls += " edl-rubble";
        } else if (index === run.at) {
          text = "@";
          cls += " edl-here";
        } else if (!room.seen) {
          text = "?";
          cls += " edl-dark";
        } else if (live.length) {
          text = live[0].glyph + pooled + (live.length > 1 ? "x" + live.length : "");
          cls += " edl-beast";
        } else if (room.stair) {
          text = "\u25bd";
          cls += " edl-stair";
        }
        if (run.cursor === index) {
          cls += " edl-cursor";
        }
        if (run.mode === "fight" && index !== run.at) {
          cls += " edl-locked";
        }
        if (run.over) {
          cls += " edl-over";
        }
        cell.className = cls;
        cell.textContent = text;
        cell.setAttribute("aria-label", t("edlRoomAria", { x: (index % SIDE) + 1, y: Math.floor(index / SIDE) + 1, v: roomLabel(room, index) }));
      }
      legend.textContent = t("edlLegend");

      var beasts = run.mode === "fight" ? run.fightBeasts : [];
      for (var row = 0; row < foeRows.length; row += 1) {
        var beast = beasts[row];
        foeRows[row].line.hidden = !beast;
        if (!beast) {
          continue;
        }
        foeRows[row].name.textContent = t("edlFoeLine", { g: beast.glyph, h: beast.hp, m: beast.maxHp, a: beast.armor + beast.guard }) + (beast.regen > 0 ? " " + t("edlFoeRegen", { n: beast.regen }) : "");
        foeRows[row].intent.textContent = intentText(edlIntent(beast));
      }
      foes.hidden = run.mode !== "fight" || !beasts.length;
      controls.hidden = run.mode !== "fight";
      roamBtns.hidden = run.mode === "fight" || run.over;
      slots.textContent = run.mode === "fight" ? t("edlSlots", { n: Math.max(0, SLOTS - run.queue.length), q: run.queue.length ? run.queue.join(" > ") : t("edlNone") }) : "";
      log.textContent = (run.log && run.log.length ? run.log.join(" / ") : t("edlSilence")) + " " + t("edlHeroState", { f: run.hero.focus, d: run.hero.dodge, r: run.round });
      resolveBtn.disabled = run.mode !== "fight" || !run.queue.length;
      descendBtn.disabled = !(rooms[run.at].stair && !living(run.at).length) || run.mode === "fight" || run.over;
      restBtn.disabled = run.mode === "fight" || run.over;
    }

    function intentText(intent) {
      if (!intent) {
        return "";
      }
      if (intent.k === "strike") {
        return t("edlIntentStrike", { n: intent.v });
      }
      if (intent.k === "bite") {
        return t("edlIntentBite", { n: BITE_VALUE });
      }
      if (intent.k === "guard") {
        return t("edlIntentGuard", { n: 4 });
      }
      return t("edlIntentSummon");
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
      bestEl.textContent = t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() }) + " \u00b7 " + (best ? t("edlBest", { n: best }) : t("noBest"));
    }

    function pickLevel(id) {
      var position = campaign.indexOf(id);
      if (position < 0 || !campaign.isUnlocked(id)) {
        refreshPicker();
        return;
      }
      levelDef = edlLevels[position];
      attempt = 0;
      startRun();
      refreshPicker();
    }

    picker.addEventListener("change", function () {
      pickLevel(picker.value);
    });

    stage.addEventListener("keydown", function (event) {
      if (!run || cells.indexOf(event.target) !== -1) {
        return;
      }
      var moves = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -SIDE,
        ArrowDown: SIDE,
      };
      var key = event.key;
      if (moves[key] !== undefined) {
        event.preventDefault();
        var next = run.cursor + moves[key];
        if (next >= 0 && next < ROOMS) {
          run.cursor = next;
          cells[next].focus();
        }
        render();
        return;
      }
      if (key === "Enter" || key === " ") {
        event.preventDefault();
        if (run.mode === "fight") {
          resolve();
        } else {
          step(run.cursor);
        }
        return;
      }
      if (key === "1" || key === "2" || key === "3" || key === "4") {
        event.preventDefault();
        queue(["strike", "guard", "focus", "dodge"][Number(key) - 1]);
      }
    });

    startRun();
    refreshPicker();
  }

  /* Bilingual copy travels with the game (see core.js addStrings). */
  App.addStrings({
    en: {
      "tabEmberDelve": "Ember Delve",
      "edlZ1": "Cinder Steps",
      "edlZ2": "Iron Vault",
      "edlZ3": "Fang Warren",
      "edlZ4": "Warden's Gate",
      "edlZ5": "Deep Ember",
      "edlTwist1": "plain run",
      "edlTwist2": "armoured strikers",
      "edlTwist3": "biters that mend",
      "edlTwist4": "a warden punishes rest",
      "edlTwist5": "all of it, deeper",
      "edlDepthLabel": "Depth",
      "edlVitalLabel": "Vitals",
      "edlTurnLabel": "Turns left",
      "edlDepthValue": "{n}/{max}",
      "edlVitalValue": "{n}/{max}",
      "edlTurnValue": "{n} (seed {s})",
      "edlFieldLabel": "Four by four room grid. Arrow keys move the cursor, Enter steps into a room, 1 to 4 pick combat actions, Space resolves the round.",
      "edlSeedSelectLabel": "Delve seed",
      "edlLegend": "? unseen / . open / rubble is impassable / @ you / a glyph plus a number is a monster pack / down arrow is the stair",
      "edlRubble": "shuttered",
      "edlYouAreHere": "you are here",
      "edlUnseen": "unmapped",
      "edlRoomBeast": "{g} and {x} in the pack, {n} hit points between them",
      "edlRoomFight": "you are locked in a fight against {n}",
      "edlRoomStair": "the stair down",
      "edlRoomEmpty": "empty room",
      "edlRoomAria": "Column {x}, row {y}: {v}",
      "edlBtnStrike": "Strike",
      "edlBtnGuard": "Guard",
      "edlBtnFocus": "Focus",
      "edlBtnDodge": "Dodge",
      "edlBtnResolve": "Resolve Round",
      "edlBtnRest": "Rest",
      "edlBtnDescend": "Descend",
      "edlBtnFlee": "Flee",
      "edlSlots": "{n} actions left this round - queued {q}",
      "edlNone": "none",
      "edlFoeLine": "{g} {h}/{m} hp, soaks {a}",
      "edlFoeRegen": "mends {n} a round",
      "edlHeroState": "focus {f}/2 - dodge {d} - round {r}",
      "edlIntentStrike": "Intent: strike for {n}",
      "edlIntentBite": "Intent: bite twice for {n} each",
      "edlIntentGuard": "Intent: guard, +{n} soak",
      "edlIntentSummon": "Intent: summon a helper",
      "edlPrompt": "{name}: {twist}. Reach depth 8 before {cap} turns. Steps, rests and descents are turns; combat rounds are free.",
      "edlTooFar": "Only a revealed room next door can be stepped into.",
      "edlAmbush": "{g} leads a pack of {n} at the doorway.",
      "edlQuiet": "The room is still.",
      "edlRestStir": "You heal {n}. Somewhere below {g} wakes.",
      "edlRestWarden": "The warden's curse: resting wakes {g} right beside you.",
      "edlRestAlone": "You heal {n} and nothing stirs.",
      "edlDescended": "Depth {d}. The air gets thinner.",
      "edlNoStair": "The stair is sealed until this room's guardian falls.",
      "edlFled": "You break off, paying {n} vitals - the wounds you dealt stay on the foe.",
      "edlCleared": "Room cleared. You catch your breath and gather focus.",
      "edlBroke": "Both sides break apart after {n} rounds; the foe keeps its wounds.",
      "edlDeath": "You fell at depth {d} to {g}. Seed {s} replays this run.",
      "edlStall": "{n} turns spent - the dark closes in. Seed {s}.",
      "edlWin": "Depth 8 reached in {n} turns - {s} stars.",
      "edlNext": "Next delve unlocked.",
      "edlDone": "Every seed is mapped.",
      "edlBest": "Best delve: {n} turns",
      "edlHit": "you hit {g} for {n} ({h} left)",
      "edlHurt": "{g} hits you for {n} ({h} left)",
      "edlBlocked": "{g} breaks on your guard",
      "edlEvade": "{g} strikes empty air",
      "edlGuarded": "guard up to {n}",
      "edlReadied": "dodge charges {n}",
      "edlCharging": "focus {n}/2",
      "edlFocus": "focus spent - heavy blow",
      "edlBeastGuard": "{g} braces",
      "edlSummoned": "{g} answers the call",
      "edlMended": "{g} mends itself",
      "edlSilence": "The torch gutters.",
      "edlHint": "Guard before a strike you can see coming, and never rest twice in a row on the warden's floor.",
      "logEmberDelve": "Delved to depth 8 in {n} turns",
    },
    zh: {
      "tabEmberDelve": "余烬地窟",
      "edlZ1": "炭火石阶",
      "edlZ2": "铁库",
      "edlZ3": "獠牙巢",
      "edlZ4": "狱卒之门",
      "edlZ5": "深窟余烬",
      "edlTwist1": "规则如常",
      "edlTwist2": "来袭者披甲",
      "edlTwist3": "撕咬者能自愈",
      "edlTwist4": "狱卒惩罚歇息",
      "edlTwist5": "更深，且全部叠加",
      "edlDepthLabel": "层数",
      "edlVitalLabel": "体力",
      "edlTurnLabel": "剩余回合",
      "edlDepthValue": "{n}/{max}",
      "edlVitalValue": "{n}/{max}",
      "edlTurnValue": "{n}（种子 {s}）",
      "edlFieldLabel": "四乘四的房间网格：方向键移动光标，回车进入房间，数字 1 到 4 选择战斗动作，空格结算本轮。",
      "edlSeedSelectLabel": "地窟种子",
      "edlLegend": "? 未探明 / · 通路 / ▒ 塌方 / @ 你 / 符号加数字是怪物与体力 / ▼ 向下的阶梯",
      "edlRubble": "已经塌死",
      "edlYouAreHere": "你在这里",
      "edlUnseen": "尚未测绘",
      "edlRoomBeast": "{g} 带队共 {x} 只，合计 {n} 点生命",
      "edlRoomFight": "你正与 {n} 只缠斗",
      "edlRoomStair": "向下的阶梯",
      "edlRoomEmpty": "空房间",
      "edlRoomAria": "第 {x} 列、第 {y} 行：{v}",
      "edlBtnStrike": "劈砍",
      "edlBtnGuard": "格挡",
      "edlBtnFocus": "凝火",
      "edlBtnDodge": "闪避",
      "edlBtnResolve": "结算本轮",
      "edlBtnRest": "歇息",
      "edlBtnDescend": "下潜",
      "edlBtnFlee": "脱离",
      "edlSlots": "本轮还能出 {n} 招 - 已排 {q}",
      "edlNone": "无",
      "edlFoeLine": "{g} 生命 {h}/{m}，可挡 {a} 点",
      "edlFoeRegen": "每轮回 {n} 点",
      "edlHeroState": "凝火 {f}/2 - 闪避 {d} 层 - 第 {r} 轮",
      "edlIntentStrike": "意图：重击 {n} 点",
      "edlIntentBite": "意图：两口撕咬，各 {n} 点",
      "edlIntentGuard": "意图：架防，多挡 {n} 点",
      "edlIntentSummon": "意图：召唤帮手",
      "edlPrompt": "{name}：{twist}。请在 {cap} 回合内抵达第 8 层。移动、歇息、下潜算回合，战斗轮次不占回合。",
      "edlTooFar": "只能进入相邻且已探明的房间。",
      "edlAmbush": "{g} 领队，共 {n} 只堵在门口。",
      "edlQuiet": "房里一片安静。",
      "edlRestStir": "你回了 {n} 点体力，下方有 {g} 被吵醒。",
      "edlRestWarden": "狱卒的诅咒：这次歇息把 {g} 直接叫到你身边。",
      "edlRestAlone": "你歇了口气，回 {n} 点体力，没有东西醒来。",
      "edlDescended": "来到第 {d} 层，空气更稀薄了。",
      "edlNoStair": "守住这一间的怪物没倒，阶梯就打不开。",
      "edlFled": "你退出战斗，赔上 {n} 点体力——砍伤的额度照样记在敌人身上。",
      "edlCleared": "房间已清。你喘了口气，凝起火力。",
      "edlBroke": "打到第 {n} 轮双方都脱力，敌人身上的伤照样记着。",
      "edlDeath": "你在第 {d} 层倒在 {g} 手下。种子 {s} 可完整重放。",
      "edlStall": "{n} 回合耗尽——黑暗合拢。种子 {s}。",
      "edlWin": "{n} 回合抵达第 8 层 - 获得 {s} 星。",
      "edlNext": "解锁下一个地窟。",
      "edlDone": "全部种子都探明了。",
      "edlBest": "最佳纪录：{n} 回合",
      "edlHit": "你击中 {g} {n} 点（剩 {h}）",
      "edlHurt": "{g} 打中你 {n} 点（剩 {h}）",
      "edlBlocked": "{g} 被你的格挡吃下",
      "edlEvade": "{g} 扑了个空",
      "edlGuarded": "格挡累加到 {n}",
      "edlReadied": "闪避充能 {n}",
      "edlCharging": "凝火 {n}/2",
      "edlFocus": "凝火耗尽 - 重击出手",
      "edlBeastGuard": "{g} 架起了防",
      "edlSummoned": "{g} 应召而来",
      "edlMended": "{g} 自行缝合伤口",
      "edlSilence": "火把噼啪作响。",
      "edlHint": "看见的重击就用格挡接，在狱卒那一层别连着歇两次。",
      "logEmberDelve": "用 {n} 回合打到第 8 层",
    },
  });

  App.registerGame({
    name: "emberDelve",
    tabKey: "tabEmberDelve",
    init: initEmberDelveGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M33 12v52M60 12v52M87 12v52M12 29h96M12 46h96" stroke="rgba(148,163,184,.22)"/>' +
        '<text x="21" y="25" font-size="11" fill="#00f2ff" text-anchor="middle">@</text>' +
        '<text x="47" y="42" font-size="10" fill="#fb7185" text-anchor="middle">\u25b29</text>' +
        '<text x="74" y="59" font-size="10" fill="#fbbf24" text-anchor="middle">\u25bd</text>' +
        '<text x="100" y="25" font-size="9" fill="#94a3b8" text-anchor="middle">?</text>' +
        '<path d="M25 22l18 15" stroke="#a3e635" stroke-width="2" stroke-dasharray="3 3"/></svg>',
      en: [
        "Aim: reach depth 8 within 60 turns. Steps, rests and descents cost a turn; combat rounds are free.",
        "Move: click or Enter a revealed room next door. A monster in it starts a fight, and its next move is printed as an intent.",
        "Fight: three actions a round from Strike, Guard, Focus (two charges become a heavy blow) and Dodge. Armour soaks damage, so Focus punches through husks.",
        "Rest: heal 5, but a wandering monster wakes - on the Warden's floor it wakes right beside you.",
        "Floor: you may always flee, and the wounds you dealt stay on the monster, so no fight can dead-end; the stair always sits 2 to 4 steps from the door.",
        "Scoring: fewer turns earn more stars. A run ends at depth 8, at 0 vitals, or at the 60 turn cap.",
      ],
      zh: [
        "目标：60 回合内打到第 8 层。移动、歇息、下潜各占一个回合，战斗轮次不计回合。",
        "移动：点击或用回车进入相邻的已探明房间。房间里有怪物就打一仗，而它下一步会以“意图”印在脸上。",
        "战斗：每轮三招，从劈砍、格挡、凝火（攒满 2 层打出重击）、闪避里挑。护甲会吃掉伤害，所以凝火才是穿甲的答案。",
        "歇息：回 5 点体力，但会吵醒一只游荡的怪物——在狱卒那一层，它直接醒在你脚边。",
        "底线：打不过随时能脱离，而且你砍伤的额度会记在怪物身上，所以没有任何一场仗是死局；阶梯永远离门口只有 2 到 4 步。",
        "计分：回合越少星越高。抵达第 8 层、体力归零或打满 60 回合，本局都会结束。",
      ],
    },
  });

  /* Exported for the other modules and the headless tests. */
  App.initEmberDelveGame = initEmberDelveGame;
  App.delveCombat = delveCombat;
  App.delveFloor = edlFloor;
  App.delveRandom = edlRandom;
  App.delveLevels = edlLevels;
  App.delveRouteBound = delveRouteBound;
  App.delveStairSpan = edlMaxStairDistance;
  App.delveIntent = edlIntent;
})(window.CapitalConvert = window.CapitalConvert || {});
