/* Glyph Bastion - the small-footprint tower defence in the shared game drawer.
 * A 9x6 field with one authored path per level (a fork on level two), a build
 * phase between waves, and a tick simulation that is a pure function of
 * (level, towers, ticks) so every authored solution can be proven to hold. */
(function (App) {
  /* Shared names from the other modules (see window.CapitalConvert). */
  var t = App.t;
  var logAction = App.logAction;
  var createConfetti = App.createConfetti;
  var petNotifyGame = App.petNotifyGame;
  var createCampaign = App.createCampaign;
  var fillCampaignPicker = App.fillCampaignPicker;
  var starsFor = App.starsFor;

  var COLS = 9;
  var ROWS = 6;
  var TICK_CAP = 900;
  var WAVE_INCOME = 3;
  var SPLITS_CAP = 6;

  /* Piercer pays for itself on one target, Smoulder is the only thing that
   * touches a boss shield, and Snare is the only answer to a cloaked runner -
   * so every kind is a real decision instead of a strictly worse tower. */
  var gstKinds = {
    piercer: { glyph: "P", cost: 3, damage: 10, range: 2.6, rate: 2, splash: 0 },
    smoulder: { glyph: "S", cost: 4, damage: 6, range: 2.2, rate: 3, splash: 1.3 },
    snare: { glyph: "N", cost: 2, damage: 0, range: 2.0, rate: 0, splash: 0, slow: 0.5 },
  };
  var gstOrder = ["piercer", "smoulder", "snare"];

  var gstUnits = {
    grunt: { glyph: "\u25cf", hp: 16, speed: 0.5, armor: 0, splash: 0, splits: 0, regen: 0, cloak: false, shield: 0 },
    runner: { glyph: "\u00ab", hp: 11, speed: 0.9, armor: 0, splash: 0, splits: 0, regen: 0, cloak: false, shield: 0 },
    plate: { glyph: "\u25a3", hp: 22, speed: 0.4, armor: 3, splash: 0, splits: 0, regen: 0, cloak: false, shield: 0 },
    husk: { glyph: "\u25cd", hp: 24, speed: 0.45, armor: 1, splash: 4, splits: 0, regen: 0, cloak: false, shield: 0 },
    cutter: { glyph: "\u25c7", hp: 20, speed: 0.5, armor: 0, splash: 0, splits: 2, regen: 0, cloak: false, shield: 0 },
    sprig: { glyph: "\u00b7", hp: 6, speed: 0.9, armor: 0, splash: 0, splits: 0, regen: 0, cloak: false, shield: 0 },
    bloom: { glyph: "\u2741", hp: 26, speed: 0.35, armor: 0, splash: 0, splits: 0, regen: 1, cloak: false, shield: 0 },
    wisp: { glyph: "\u25cc", hp: 16, speed: 0.7, armor: 0, splash: 0, splits: 0, regen: 0, cloak: true, shield: 0 },
    choir: { glyph: "\u2620", hp: 130, speed: 0.28, armor: 2, splash: 0, splits: 0, regen: 1, cloak: false, shield: 18 },
  };

  /* Each level ships the tower set the design is balanced around, and
   * bastionSolvable replays it through the same resolver the buttons use. */
  var gstLevels = [
    {
      id: "g1", labelKey: "gstZ1", twistKey: "gstTwist1", budget: 12, maxTowers: 4, leaks: 3, starGlyphs: [9, 12, 16],
      paths: [[[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2]]],
      waves: [{ start: 0, gap: 6, count: 6, kind: "grunt" }, { start: 40, gap: 5, count: 7, kind: "grunt" }, { start: 85, gap: 6, count: 4, kind: "runner" }],
      solution: [{ x: 3, y: 1, kind: "piercer" }, { x: 5, y: 3, kind: "piercer" }, { x: 7, y: 1, kind: "piercer" }],
    },
    {
      id: "g2", labelKey: "gstZ2", twistKey: "gstTwist2", budget: 15, maxTowers: 5, leaks: 3, starGlyphs: [13, 16, 20],
      paths: [
        [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2]],
        [[0, 2], [1, 2], [2, 2], [3, 2], [4, 3], [5, 4], [6, 4], [7, 4], [8, 4]],
      ],
      waves: [{ start: 0, gap: 5, count: 6, kind: "grunt" }, { start: 45, gap: 5, count: 6, kind: "runner" }, { start: 95, gap: 6, count: 6, kind: "plate" }],
      solution: [
        { x: 3, y: 3, kind: "piercer" }, { x: 4, y: 1, kind: "piercer" },
        { x: 6, y: 3, kind: "smoulder" }, { x: 7, y: 5, kind: "piercer" },
      ],
    },
    {
      id: "g3", labelKey: "gstZ3", twistKey: "gstTwist3", budget: 16, maxTowers: 5, leaks: 3, starGlyphs: [11, 14, 18],
      paths: [[[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [3, 2], [4, 2], [5, 2], [5, 3], [5, 4], [6, 4], [7, 4], [8, 4]]],
      waves: [{ start: 0, gap: 6, count: 5, kind: "grunt" }, { start: 45, gap: 5, count: 6, kind: "wisp" }, { start: 100, gap: 6, count: 5, kind: "husk" }, { start: 150, gap: 5, count: 6, kind: "wisp" }],
      solution: [
        { x: 2, y: 3, kind: "snare" }, { x: 4, y: 1, kind: "piercer" },
        { x: 6, y: 3, kind: "snare" }, { x: 6, y: 5, kind: "smoulder" },
      ],
    },
    {
      id: "g4", labelKey: "gstZ4", twistKey: "gstTwist4", budget: 11, maxTowers: 4, leaks: 3, starGlyphs: [15, 18, 21],
      paths: [[[0, 5], [1, 5], [1, 4], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [4, 1], [5, 1], [5, 2], [5, 3], [6, 3], [7, 3], [7, 2], [7, 1], [8, 1]]],
      waves: [{ start: 0, gap: 7, count: 4, kind: "cutter" }, { start: 60, gap: 6, count: 5, kind: "cutter" }, { start: 130, gap: 7, count: 5, kind: "bloom" }],
      solution: [
        { x: 2, y: 2, kind: "smoulder" }, { x: 4, y: 2, kind: "smoulder" },
        { x: 6, y: 2, kind: "smoulder" }, { x: 6, y: 4, kind: "piercer" },
      ],
    },
    {
      id: "g5", labelKey: "gstZ5", twistKey: "gstTwist5", budget: 21, maxTowers: 6, leaks: 3, starGlyphs: [20, 24, 28],
      paths: [[[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [3, 2], [4, 2], [4, 3], [4, 4], [5, 4], [6, 4], [6, 3], [6, 2], [7, 2], [8, 2]]],
      waves: [
        { start: 0, gap: 6, count: 5, kind: "plate" },
        { start: 60, gap: 5, count: 5, kind: "wisp" },
        { start: 120, gap: 6, count: 4, kind: "cutter" },
        { start: 190, gap: 0, count: 1, kind: "choir" },
      ],
      solution: [
        { x: 1, y: 1, kind: "piercer" }, { x: 3, y: 1, kind: "smoulder" },
        { x: 3, y: 3, kind: "snare" }, { x: 5, y: 3, kind: "smoulder" },
        { x: 5, y: 5, kind: "smoulder" }, { x: 7, y: 1, kind: "piercer" },
      ],
    },
  ];

  function gstInt(value) {
    var num = Number(value);
    return isFinite(num) ? Math.round(num) : 0;
  }

  function gstUnit(kind) {
    return gstUnits[kind] || gstUnits.grunt;
  }

  function gstKind(kind) {
    return gstKinds[kind] || gstKinds.piercer;
  }

  function gstDistance(ax, ay, bx, by) {
    var dx = ax - bx;
    var dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* A level always answers the shape the old single path code expected. */
  function gstPaths(level) {
    return level.paths && level.paths.length ? level.paths : [level.path || []];
  }

  function gstCellKey(x, y) {
    return gstInt(x) + "," + gstInt(y);
  }

  function gstPathCells(level) {
    var map = {};
    gstPaths(level).forEach(function (path) {
      path.forEach(function (cell) {
        map[gstCellKey(cell[0], cell[1])] = true;
      });
    });
    return map;
  }

  /* The spawn table is flattened once per level: a fork alternates units
   * between its paths, which is what makes guarding both ends a decision. */
  function gstSchedule(level) {
    var list = [];
    var waves = level.waves || [];
    var paths = gstPaths(level);
    for (var wave = 0; wave < waves.length; wave += 1) {
      var group = waves[wave];
      for (var unit = 0; unit < Math.max(0, gstInt(group.count)); unit += 1) {
        list.push({
          kind: group.kind,
          at: gstInt(group.start) + unit * Math.max(0, gstInt(group.gap)),
          wave: wave,
          path: list.length % paths.length,
        });
      }
    }
    list.sort(function (a, b) {
      return a.at - b.at || a.wave - b.wave;
    });
    return list;
  }

  function gstUnitNew(kind, pathCells, at) {
    var spec = gstUnit(kind);
    return {
      kind: kind,
      glyph: spec.glyph,
      hp: spec.hp,
      maxHp: spec.hp,
      armor: spec.armor,
      speed: spec.speed,
      splashWard: spec.splash,
      splits: spec.splits,
      regen: spec.regen,
      cloak: spec.cloak,
      shield: spec.shield,
      maxShield: spec.shield,
      p: Math.max(0, at),
      path: pathCells,
      revealed: false,
      slowed: false,
    };
  }

  function gstSim(level, towers) {
    return {
      tick: 0,
      spawned: 0,
      leaks: 0,
      kills: 0,
      done: false,
      events: [],
      enemies: [],
      schedule: gstSchedule(level),
    };
  }

  /* How many units each wave owns, so the drawer knows when one is finished. */
  function gstWaveSizes(level) {
    var sizes = [];
    gstSchedule(level).forEach(function (entry) {
      sizes[entry.wave] = (sizes[entry.wave] || 0) + 1;
    });
    return sizes;
  }

  function gstWaveSpawned(sim, wave) {
    var count = 0;
    for (var index = 0; index < sim.spawned && index < sim.schedule.length; index += 1) {
      if (sim.schedule[index].wave === wave) {
        count += 1;
      }
    }
    return count;
  }

  function gstWaveCleared(sim, level, wave) {
    var sizes = gstWaveSizes(level);
    var total = sizes[wave] || 0;
    return total > 0 && gstWaveSpawned(sim, wave) >= total && !sim.enemies.length;
  }

  function gstLiving(enemy) {
    return enemy.hp > 0;
  }

  function gstPosition(enemy) {
    var cells = enemy.path;
    if (!cells || !cells.length) {
      return { x: 0, y: 0 };
    }
    var step = Math.max(0, Math.min(cells.length - 1, Math.floor(enemy.p)));
    return { x: cells[step][0], y: cells[step][1] };
  }

  function gstHit(enemy, damage, isSplash) {
    if (enemy.shield > 0) {
      if (!isSplash) {
        return "shield";
      }
      var bite = Math.max(1, damage - (enemy.splashWard || 0));
      enemy.shield = Math.max(0, enemy.shield - bite);
      return enemy.shield > 0 ? "shield" : "break";
    }
    var soak = isSplash ? (enemy.splashWard || 0) : enemy.armor;
    enemy.hp = Math.max(0, enemy.hp - Math.max(0, damage - soak));
    return enemy.hp <= 0 ? "kill" : "hit";
  }

  /* One tick, in a fixed order: spawn, mend, snares mark their ground, towers
   * fire, deaths split, then the survivors walk. Same inputs, same output. */
  function bastionStep(sim, level, towers) {
    var state = sim || gstSim(level, towers);
    state.events = [];
    if (state.done) {
      return state;
    }
    var paths = gstPaths(level);
    var list = towers || [];
    var index;

    while (state.spawned < state.schedule.length && state.schedule[state.spawned].at <= state.tick) {
      var entry = state.schedule[state.spawned];
      state.enemies.push(gstUnitNew(entry.kind, paths[entry.path % paths.length] || paths[0], 0));
      state.spawned += 1;
    }

    for (index = 0; index < state.enemies.length; index += 1) {
      var walker = state.enemies[index];
      if (walker.regen > 0 && walker.hp > 0 && walker.hp < walker.maxHp) {
        walker.hp = Math.min(walker.maxHp, walker.hp + walker.regen);
      }
      walker.revealed = false;
      walker.slowed = false;
    }

    /* Snares resolve first: a cloaked rank is only targetable once one of them
     * has lit it, and that has to happen before anyone shoots. */
    for (index = 0; index < list.length; index += 1) {
      var catcher = list[index];
      var cage = gstKind(catcher.kind);
      if (!cage.slow) {
        continue;
      }
      for (var c = 0; c < state.enemies.length; c += 1) {
        var near = state.enemies[c];
        if (!gstLiving(near)) {
          continue;
        }
        var spot = gstPosition(near);
        if (gstDistance(catcher.x, catcher.y, spot.x, spot.y) <= cage.range) {
          near.slowed = true;
          near.revealed = true;
        }
      }
    }

    for (index = 0; index < list.length; index += 1) {
      var tower = list[index];
      var spec = gstKind(tower.kind);
      if (spec.damage <= 0 || !spec.rate || state.tick % spec.rate !== 0) {
        continue;
      }
      var inRange = [];
      var targetable = [];
      for (var e = 0; e < state.enemies.length; e += 1) {
        var unit = state.enemies[e];
        if (!gstLiving(unit)) {
          continue;
        }
        var where = gstPosition(unit);
        if (gstDistance(tower.x, tower.y, where.x, where.y) <= spec.range) {
          inRange.push({ enemy: unit, spot: where });
          if (!unit.cloak || unit.revealed) {
            targetable.push({ enemy: unit, spot: where });
          }
        }
      }
      if (!targetable.length) {
        continue;
      }
      var chosen = targetable[0];
      for (var k = 1; k < targetable.length; k += 1) {
        if (targetable[k].enemy.p > chosen.enemy.p) {
          chosen = targetable[k];
        }
      }
      var burned = 0;
      if (spec.splash) {
        for (var v = 0; v < inRange.length; v += 1) {
          if (gstDistance(chosen.spot.x, chosen.spot.y, inRange[v].spot.x, inRange[v].spot.y) <= spec.splash) {
            if (gstHit(inRange[v].enemy, spec.damage, true) === "kill") {
              burned += 1;
            }
          }
        }
        state.events.push(t("gstSplash", { n: spec.damage }));
      } else {
        if (gstHit(chosen.enemy, spec.damage, false) === "kill") {
          burned += 1;
        }
        state.events.push(t("gstPierce", { n: spec.damage }));
      }
      state.kills += burned;
    }

    var born = [];
    var keep = [];
    for (index = 0; index < state.enemies.length; index += 1) {
      var check = state.enemies[index];
      if (gstLiving(check)) {
        keep.push(check);
        continue;
      }
      if (check.splits > 0 && born.length < SPLITS_CAP) {
        for (var sp = 0; sp < check.splits && born.length < SPLITS_CAP; sp += 1) {
          born.push(gstUnitNew("sprig", check.path, Math.max(0, check.p)));
        }
      }
    }
    state.enemies = keep.concat(born);

    var leakLimit = Math.max(1, gstInt(level.leaks) || 3);
    var still = [];
    for (index = 0; index < state.enemies.length; index += 1) {
      var mover = state.enemies[index];
      var cells = mover.path && mover.path.length ? mover.path : [[0, 0]];
      mover.p += mover.speed * (mover.slowed ? 0.5 : 1);
      if (mover.p >= cells.length - 1) {
        state.leaks += 1;
        state.events.push(t("gstLeak", { g: mover.glyph, n: state.leaks }));
        continue;
      }
      still.push(mover);
    }
    state.enemies = still;
    state.tick += 1;

    if (state.spawned >= state.schedule.length && !state.enemies.length) {
      state.done = true;
    }
    if (state.leaks >= leakLimit || state.tick >= TICK_CAP) {
      state.done = true;
    }
    return state;
  }

  /* The exported resolver: run an authored level from an empty field. */
  function bastionWave(level, towers, ticks) {
    var sim = gstSim(level, towers);
    var limit = Math.max(1, Math.min(TICK_CAP + 40, gstInt(ticks) || 300));
    for (var step = 0; step < limit && !sim.done; step += 1) {
      bastionStep(sim, level, towers);
    }
    return sim;
  }

  function bastionCost(towers) {
    var total = 0;
    (towers || []).forEach(function (tower) {
      total += gstKind(tower.kind).cost;
    });
    return total;
  }

  /* The proof runs the same purchasing flow the drawer does: buy what the purse
   * holds before a wave, spend the wave income, repeat. A plan that needs more
   * than budget + income is not a solution, so this is what says so. */
  function bastionSolvable(level) {
    var plan = level.solution || [];
    var waves = (level.waves || []).length;
    var limit = Math.max(1, gstInt(level.leaks) || 3);
    var maxTowers = Math.max(1, gstInt(level.maxTowers) || 4);
    var purse = Math.max(1, gstInt(level.budget));
    var towers = [];
    var cursor = 0;
    var spent = 0;
    var sim = gstSim(level, towers);
    for (var wave = 0; wave < waves; wave += 1) {
      while (cursor < plan.length && towers.length < maxTowers) {
        var cost = gstKind(plan[cursor].kind).cost;
        if (cost > purse) {
          break;
        }
        purse -= cost;
        spent += cost;
        towers.push(plan[cursor]);
        cursor += 1;
      }
      var step = 0;
      while (!sim.done && step < TICK_CAP) {
        bastionStep(sim, level, towers);
        step += 1;
        if (sim.leaks >= limit) {
          break;
        }
        if (gstWaveCleared(sim, level, wave)) {
          break;
        }
      }
      if (sim.leaks >= limit || !gstWaveCleared(sim, level, wave)) {
        return {
          cost: spent, budget: gstInt(level.budget), leaks: sim.leaks, ticks: sim.tick,
          bought: cursor, planned: plan.length, cleared: false, insideBudget: false, wave: wave,
        };
      }
      purse += WAVE_INCOME;
    }
    return {
      cost: spent,
      budget: gstInt(level.budget),
      leaks: sim.leaks,
      ticks: sim.tick,
      bought: cursor,
      planned: plan.length,
      cleared: sim.leaks === 0 && cursor >= plan.length,
      insideBudget: cursor >= plan.length,
    };
  }

  /* leaks first, glyphs second: a clean board beats a cheap one, and a cheap one
   * still beats a wall you spent the whole budget on. */
  function bastionScore(leaks, glyphs) {
    return Math.max(0, gstInt(leaks)) * 100 + Math.max(0, gstInt(glyphs));
  }

  function initGlyphBastionGame(panelEl) {
    if (!panelEl) {
      return;
    }

    var campaign = createCampaign({ key: "glyph-bastion-campaign", levels: gstLevels });
    var levelDef = gstLevels[Math.max(0, campaign.indexOf(campaign.nextLevelId()))];
    var run = null;
    var cells = [];
    var kindButtons = [];

    var hud = document.createElement("div");
    hud.className = "game-hud";
    var glyphsEl = document.createElement("strong");
    var leakEl = document.createElement("strong");
    var waveEl = document.createElement("strong");
    hud.appendChild(gstStat("gstGlyphLabel", glyphsEl));
    hud.appendChild(gstStat("gstLeakLabel", leakEl));
    hud.appendChild(gstStat("gstWaveLabel", waveEl));

    var board = document.createElement("div");
    board.className = "gst-board";
    board.setAttribute("tabindex", "0");
    board.setAttribute("role", "application");
    board.setAttribute("aria-label", t("gstFieldLabel"));

    var grid = document.createElement("div");
    grid.className = "gst-grid";
    grid.setAttribute("role", "grid");
    for (var row = 0; row < ROWS; row += 1) {
      for (var col = 0; col < COLS; col += 1) {
        var cell = document.createElement("button");
        cell.type = "button";
        cell.className = "gst-cell";
        cell.setAttribute("role", "gridcell");
        cell.tabIndex = -1;
        (function (x, y) {
          cell.addEventListener("click", function () {
            press(x, y);
          });
        })(col, row);
        cells.push(cell);
        grid.appendChild(cell);
      }
    }
    board.appendChild(grid);

    var legend = document.createElement("p");
    legend.className = "gst-legend";
    legend.setAttribute("aria-hidden", "true");
    board.appendChild(legend);

    var palette = document.createElement("div");
    palette.className = "gst-palette";
    palette.setAttribute("role", "group");
    palette.setAttribute("aria-label", t("gstPaletteLabel"));
    gstOrder.forEach(function (kind, position) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "gst-kind";
      button.setAttribute("aria-keyshortcuts", String(position + 1));
      button.addEventListener("click", function () {
        pickKind(kind);
      });
      palette.appendChild(button);
      kindButtons.push(button);
    });

    var info = document.createElement("p");
    info.className = "gst-info";

    var controls = document.createElement("div");
    controls.className = "gst-controls";
    controls.appendChild(gstButton("gst-btn", "btnNewRound", function () {
      startRun();
    }));
    var stepBtn = gstButton("gst-btn", "gstBtnStep", function () {
      stepTicks();
    });
    controls.appendChild(stepBtn);

    var log = document.createElement("p");
    log.className = "gst-log";

    var result = document.createElement("p");
    result.className = "game-result";
    result.setAttribute("role", "status");

    var pickerRow = document.createElement("div");
    pickerRow.className = "elements-row";
    var pickerLabel = document.createElement("label");
    pickerLabel.className = "elements-label";
    pickerLabel.setAttribute("for", "gstMapSel");
    pickerLabel.setAttribute("data-i18n", "gstMapSelectLabel");
    pickerLabel.textContent = t("gstMapSelectLabel");
    var picker = document.createElement("select");
    picker.className = "elements-select";
    picker.id = "gstMapSel";
    pickerRow.appendChild(pickerLabel);
    pickerRow.appendChild(picker);

    var actions = document.createElement("div");
    actions.className = "game-actions";
    var waveBtn = gstButton("primary", "gstBtnWave", function () {
      runWave();
    });
    var bestEl = document.createElement("p");
    bestEl.className = "game-best";
    actions.appendChild(waveBtn);
    actions.appendChild(bestEl);

    var hint = document.createElement("p");
    hint.className = "game-hint";
    hint.setAttribute("data-i18n", "gstHint");
    hint.textContent = t("gstHint");

    [hud, board, palette, info, controls, log, result, pickerRow, actions, hint].forEach(function (node) {
      panelEl.appendChild(node);
    });

    board.addEventListener("keydown", function (event) {
      if (!run || cells.indexOf(event.target) !== -1) {
        return;
      }
      var key = event.key;
      var shifts = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (shifts[key]) {
        event.preventDefault();
        moveCursor(shifts[key][0], shifts[key][1]);
        return;
      }
      if (key === "Enter") {
        event.preventDefault();
        press(run.cursor.y * COLS + run.cursor.x);
        return;
      }
      if (key === "Backspace") {
        event.preventDefault();
        sell(run.cursor.x, run.cursor.y);
        return;
      }
      if (key === " ") {
        event.preventDefault();
        runWave();
        return;
      }
      var digit = Number(key);
      if (isFinite(digit) && digit >= 1 && digit <= gstOrder.length) {
        event.preventDefault();
        pickKind(gstOrder[digit - 1]);
      }
    });

    function gstButton(extra, key, handler) {
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

    function gstStat(key, valueEl) {
      var stat = document.createElement("div");
      stat.className = "game-stat";
      var label = document.createElement("span");
      label.setAttribute("data-i18n", key);
      label.textContent = t(key);
      stat.appendChild(label);
      stat.appendChild(valueEl);
      return stat;
    }

    function cellIndex(x, y) {
      return y * COLS + x;
    }

    function towerAt(x, y) {
      for (var index = 0; index < run.towers.length; index += 1) {
        if (run.towers[index].x === x && run.towers[index].y === y) {
          return index;
        }
      }
      return -1;
    }

    function startRun() {
      run = {
        level: levelDef,
        towers: [],
        glyphs: Math.max(1, gstInt(levelDef.budget)),
        cursor: { x: 1, y: 1 },
        kind: "piercer",
        held: -1,
        wave: 0,
        sim: gstSim(levelDef, []),
        phase: "build",
        over: null,
        events: [],
      };
      result.textContent = t("gstPrompt", {
        name: t(levelDef.labelKey),
        twist: t(levelDef.twistKey),
        b: run.glyphs,
        w: (levelDef.waves || []).length,
      });
      render();
    }

    function pickKind(kind) {
      if (!run || run.over) {
        return;
      }
      run.kind = kind;
      render();
    }

    function moveCursor(dx, dy) {
      run.cursor.x = Math.max(0, Math.min(COLS - 1, run.cursor.x + gstInt(dx)));
      run.cursor.y = Math.max(0, Math.min(ROWS - 1, run.cursor.y + gstInt(dy)));
      cells[cellIndex(run.cursor.x, run.cursor.y)].focus();
      render();
    }

    function press(x, y) {
      if (!run || run.over) {
        return;
      }
      run.cursor.x = x;
      run.cursor.y = y;
      if (run.phase === "wave") {
        info.textContent = t("gstBusyWave");
        render();
        return;
      }
      var at = towerAt(x, y);
      if (run.held >= 0) {
        relocate(run.held, x, y);
        return;
      }
      if (at >= 0) {
        run.held = at;
        info.textContent = t("gstHolding", { k: gstKind(run.towers[at].kind).glyph });
        render();
        return;
      }
      place(x, y);
    }

    function place(x, y) {
      var spec = gstKind(run.kind);
      if (gstPathCells(run.level)[gstCellKey(x, y)]) {
        info.textContent = t("gstOnPath");
        render();
        return;
      }
      if (run.towers.length >= Math.max(1, gstInt(run.level.maxTowers))) {
        info.textContent = t("gstFull", { n: gstInt(run.level.maxTowers) });
        render();
        return;
      }
      if (spec.cost > run.glyphs) {
        info.textContent = t("gstBroke", { n: spec.cost, g: run.glyphs });
        render();
        return;
      }
      run.towers.push({ x: x, y: y, kind: run.kind });
      run.glyphs -= spec.cost;
      info.textContent = t("gstPlaced", { k: spec.glyph, c: spec.cost });
      render();
    }

    function sell(x, y) {
      if (!run || run.over || run.phase === "wave") {
        return;
      }
      var at = towerAt(x, y);
      if (at < 0) {
        info.textContent = t("gstNothingHere");
        render();
        return;
      }
      var spec = gstKind(run.towers[at].kind);
      run.glyphs += spec.cost;
      run.towers.splice(at, 1);
      if (run.held === at) {
        run.held = -1;
      } else if (run.held > at) {
        run.held -= 1;
      }
      info.textContent = t("gstSold", { k: spec.glyph, c: spec.cost });
      render();
    }

    function relocate(from, x, y) {
      if (from >= run.towers.length || !run.towers[from]) {
        run.held = -1;
        return;
      }
      if (gstPathCells(run.level)[gstCellKey(x, y)] || towerAt(x, y) >= 0) {
        info.textContent = t("gstBlockedCell");
        run.held = -1;
        render();
        return;
      }
      run.towers[from].x = x;
      run.towers[from].y = y;
      run.held = -1;
      info.textContent = t("gstMoved");
      render();
    }

    function leakLimit() {
      return Math.max(1, gstInt(run.level.leaks) || 3);
    }

    /* One clock for the whole run: the build phase simply stops advancing it, so
     * a wave's spawn ticks stay absolute. */
    function advance(ticks) {
      var sim = run.sim;
      var waves = (run.level.waves || []).length;
      for (var step = 0; step < Math.max(1, gstInt(ticks)) && !sim.done; step += 1) {
        bastionStep(sim, run.level, run.towers);
        if (sim.events.length) {
          run.events = sim.events.slice();
        }
        if (sim.leaks >= leakLimit()) {
          loseRun(sim);
          return;
        }
        if (run.phase === "wave" && gstWaveCleared(sim, run.level, run.wave)) {
          break;
        }
      }
      if (run.phase === "wave") {
        if (gstWaveCleared(sim, run.level, run.wave)) {
          run.wave += 1;
          run.glyphs += WAVE_INCOME;
          if (run.wave >= waves) {
            winRun(sim);
            return;
          }
          run.phase = "build";
          info.textContent = t("gstWaveCleared", { n: run.wave, w: WAVE_INCOME });
        } else if (sim.done) {
          loseRun(sim);
          return;
        }
      }
      render();
    }

    function stepTicks() {
      if (!run || run.over) {
        return;
      }
      if (run.phase !== "wave") {
        info.textContent = t("gstBuildFirst");
        return;
      }
      advance(12);
    }

    function runWave() {
      if (!run || run.over) {
        return;
      }
      if ((run.level.waves || []).length <= run.wave) {
        return;
      }
      if (run.phase !== "wave") {
        run.phase = "wave";
        run.events = [t("gstWaveOut", { n: run.wave + 1 })];
      }
      advance(140);
    }

    function loseRun(sim) {
      run.over = "lost";
      run.phase = "over";
      result.textContent = t("gstLost", { n: sim.leaks, d: run.wave, w: (run.level.waves || []).length });
      render();
    }

    function winRun(sim) {
      run.over = "won";
      run.phase = "over";
      var spent = bastionCost(run.towers);
      var value = bastionScore(sim.leaks, spent);
      var stars = starsFor(value, run.level.starGlyphs, "low");
      var outcome = campaign.record(run.level.id, { stars: stars, best: value, better: "low" });
      var message = t("gstWon", { n: sim.leaks, g: spent, s: stars });
      if (outcome.isBest) {
        message += " " + t("newBest");
      }
      if (outcome.unlockedNext) {
        message += " " + t("gstNext");
      } else if (campaign.clearedCount() === gstLevels.length) {
        message += " " + t("gstDone");
      }
      result.textContent = message;
      logAction(t("logGlyphBastion", { n: sim.leaks, g: spent }));
      var rect = waveBtn.getBoundingClientRect();
      createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      petNotifyGame(outcome.isBest || outcome.firstClear);
      refreshPicker();
    }

    function render() {
      if (!run) {
        return;
      }
      var pathCells = gstPathCells(run.level);
      var occupied = {};
      run.towers.forEach(function (tower) {
        occupied[gstCellKey(tower.x, tower.y)] = tower;
      });
      var crowd = {};
      run.sim.enemies.forEach(function (enemy) {
        var spot = gstPosition(enemy);
        var key = gstCellKey(spot.x, spot.y);
        if (!crowd[key]) {
          crowd[key] = { glyph: enemy.glyph, hp: 0, n: 0, cloak: enemy.cloak, shield: enemy.shield };
        }
        crowd[key].hp += enemy.hp + enemy.shield;
        crowd[key].n += 1;
      });
      for (var index = 0; index < cells.length; index += 1) {
        var x = index % COLS;
        var y = Math.floor(index / COLS);
        var key = gstCellKey(x, y);
        var button = cells[index];
        var tower = occupied[key];
        var mob = crowd[key];
        var text = "";
        var cls = "gst-cell";
        if (pathCells[key]) {
          cls += " gst-path";
        }
        if (tower) {
          var spec = gstKind(tower.kind);
          text = spec.glyph + spec.cost;
          cls += " gst-tower gst-t" + tower.kind;
        } else if (mob) {
          text = mob.glyph + mob.hp + (mob.n > 1 ? "x" + mob.n : "");
          cls += " gst-mob";
        } else if (!pathCells[key]) {
          text = "\u00b7";
        }
        if (run.cursor.x === x && run.cursor.y === y) {
          cls += " gst-cursor";
        }
        button.className = cls;
        button.textContent = text;
        if (App.art && (tower || mob)) {
          button.textContent = "";
          button.appendChild(App.art.icon(tower ? (tower.kind === "piercer" ? "sword" : tower.kind === "smoulder" ? "flame" : "chain") : "skull", { hue: tower ? 165 : 12, cls: "world-bastion-piece" }));
          var badge = document.createElement("span"); badge.className = "world-piece-count"; badge.textContent = String(tower ? gstKind(tower.kind).cost : mob.hp); button.appendChild(badge);
        }
        button.setAttribute("aria-label", t("gstCellAria", {
          x: x + 1,
          y: y + 1,
          v: tower
            ? t("gstCellTower", { k: gstKind(tower.kind).glyph, n: gstKind(tower.kind).cost })
            : mob
              ? t("gstCellMob", { g: mob.glyph, h: mob.hp, n: mob.n })
              : pathCells[key]
                ? t("gstCellPath")
                : t("gstCellOpen"),
        }));
      }
      glyphsEl.textContent = t("gstGlyphValue", { n: run.glyphs, s: bastionCost(run.towers) });
      leakEl.textContent = t("gstLeakValue", { n: run.sim.leaks, max: Math.max(1, gstInt(run.level.leaks) || 3) });
      waveEl.textContent = t("gstWaveValue", { n: Math.min(run.wave + 1, (run.level.waves || []).length), w: (run.level.waves || []).length, p: run.phase === "build" ? t("gstPhaseBuild") : t("gstPhaseWave") });
      legend.textContent = t("gstLegend");
      for (var k = 0; k < kindButtons.length; k += 1) {
        var kind = gstOrder[k];
        var spec2 = gstKind(kind);
        kindButtons[k].textContent = t("gstKindLabel", {
          i: k + 1,
          g: spec2.glyph,
          n: t("gstName" + kind),
          c: spec2.cost,
        });
        kindButtons[k].className = "gst-kind" + (run.kind === kind ? " gst-picked" : "");
        kindButtons[k].setAttribute("aria-label", t("gstKindAria", {
          g: spec2.glyph,
          n: t("gstName" + kind),
          c: spec2.cost,
          d: t("gstDesc" + kind),
        }));
      }
      waveBtn.disabled = !!run.over || (run.level.waves || []).length <= run.wave;
      stepBtn.disabled = !!run.over || run.phase !== "wave";
      log.textContent = run.events && run.events.length ? run.events.join(" / ") : t("gstSilence");
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
      bestEl.textContent = t("campaignStars", { n: campaign.totalStars(), max: campaign.maxStars() }) + " \u00b7 " + (best ? t("gstBest", { n: best }) : t("noBest"));
    }

    picker.addEventListener("change", function () {
      var position = campaign.indexOf(picker.value);
      if (position < 0 || !campaign.isUnlocked(picker.value)) {
        refreshPicker();
        return;
      }
      levelDef = gstLevels[position];
      startRun();
      refreshPicker();
    });

    startRun();
    refreshPicker();
  }

  /* Bilingual copy travels with the game (see core.js addStrings). */
  App.addStrings({
    en: {
      "tabGlyphBastion": "Glyph Bastion",
      "gstZ1": "Straight Causeway",
      "gstZ2": "The Fork",
      "gstZ3": "Veil Walk",
      "gstZ4": "Splitter Gully",
      "gstZ5": "Choir Gate",
      "gstTwist1": "one road, plain ranks",
      "gstTwist2": "the road forks - guard both",
      "gstTwist3": "cloaked ranks arrive",
      "gstTwist4": "splitters, thin budget",
      "gstTwist5": "a shielded choir",
      "gstGlyphLabel": "Glyphs",
      "gstLeakLabel": "Leaks",
      "gstWaveLabel": "Wave",
      "gstGlyphValue": "{n} left - {s} spent",
      "gstLeakValue": "{n}/{max}",
      "gstWaveValue": "{n}/{w} - {p}",
      "gstPhaseBuild": "build",
      "gstPhaseWave": "running",
      "gstFieldLabel": "Nine by six bastion field. Arrow keys move the build cursor, Enter places or picks up a tower, Backspace sells, 1 to 3 choose a tower kind, Space runs the wave.",
      "gstPaletteLabel": "Tower kinds",
      "gstMapSelectLabel": "Bastion map",
      "gstKindLabel": "{i}. {g} {n} - {c}",
      "gstKindAria": "{g} {n}, costs {c} glyphs. {d}",
      "gstNamepiercer": "Piercer",
      "gstNamesmoulder": "Smoulder",
      "gstNamesnare": "Snare",
      "gstDescpiercer": "10 damage on the furthest-along target every 2 ticks; armour eats 3 of it",
      "gstDescsmoulder": "6 damage in a splash; the only thing that strips a shield, and husks shrug it off",
      "gstDescsnare": "no damage: halves the speed of anything near it and reveals cloaked ranks",
      "gstLegend": "P piercer / S smoulder / N snare / dot on a grass cell is a build slot / the pale road is the path",
      "gstPrompt": "{name} - {twist}. {b} glyphs, {w} waves. Three leaks and the bastion falls.",
      "gstOnPath": "You cannot build on the road.",
      "gstFull": "This map only carries {n} towers - sell one first.",
      "gstBroke": "That costs {n} glyphs and you hold {g}.",
      "gstPlaced": "{k} raised for {c} glyphs.",
      "gstSold": "{k} sold back for {c} glyphs.",
      "gstMoved": "Tower moved - no extra glyphs charged.",
      "gstHolding": "Holding {k} - press Enter on a new cell to move it.",
      "gstBlockedCell": "That cell is taken or paved over.",
      "gstNothingHere": "No tower stands there.",
      "gstBusyWave": "The wave is walking - you build between waves.",
      "gstBuildFirst": "Run the wave when the field is laid out.",
      "gstWaveCleared": "Wave {n} held. The council sends {w} more glyphs.",
      "gstWaveOut": "Wave {n} is on the road.",
      "gstSplash": "smoulder burns the crowd",
      "gstPierce": "piercer spits",
      "gstLeak": "{g} slipped past - {n} leaks",
      "gstSilence": "The field is quiet.",
      "gstCellAria": "Column {x}, row {y}: {v}",
      "gstCellTower": "your {k} tower, {n} glyphs",
      "gstCellMob": "{g} with {h} hit points, {n} in the cell",
      "gstCellPath": "open road",
      "gstCellOpen": "empty build slot",
      "gstBtnWave": "Run Wave",
      "gstBtnStep": "Step 12",
      "gstWon": "Held with {n} leaks for {g} glyphs spent - {s} stars.",
      "gstLost": "{n} leaks - the bastion at wave {d} of {w} fell.",
      "gstNext": "Next map unlocked.",
      "gstDone": "Every gate still stands.",
      "gstBest": "best score {n}",
      "gstHint": "Clearing a wave pays 3 glyphs, so a leak is survivable and a bad layout is not.",
      "logGlyphBastion": "Held the bastion with {n} leaks for {g} glyphs",
    },
    zh: {
      "tabGlyphBastion": "符文壁垒",
      "gstZ1": "直堤",
      "gstZ2": "岔路",
      "gstZ3": "蒙纱小径",
      "gstZ4": "裂殖沟",
      "gstZ5": "圣殿门",
      "gstTwist1": "一条路，普通队列",
      "gstTwist2": "道路分岔——两边都得守",
      "gstTwist3": "隐身队列登场",
      "gstTwist4": "裂殖怪，预算紧张",
      "gstTwist5": "带护盾的合唱队",
      "gstGlyphLabel": "符文",
      "gstLeakLabel": "漏怪",
      "gstWaveLabel": "波次",
      "gstGlyphValue": "剩 {n} - 已用 {s}",
      "gstLeakValue": "{n}/{max}",
      "gstWaveValue": "{n}/{w} - {p}",
      "gstPhaseBuild": "布防中",
      "gstPhaseWave": "进行中",
      "gstFieldLabel": "九乘六的壁垒战场：方向键移动建造光标，回车放置或拾起符塔，退格拆除，数字 1 到 3 选塔，空格开波。",
      "gstPaletteLabel": "符塔种类",
      "gstMapSelectLabel": "壁垒地图",
      "gstKindLabel": "{i}. {g} {n} - {c}",
      "gstKindAria": "{g} {n}，造价 {c} 枚符文。{d}",
      "gstNamepiercer": "穿刺",
      "gstNamesmoulder": "熔散",
      "gstNamesnare": "缚影",
      "gstDescpiercer": "每 2 拍对走得最远的目标造成 10 点伤害；护甲会吃掉其中 3 点",
      "gstDescsmoulder": "范围溅射 6 点伤害；唯一能剥掉护盾的塔，但空壳对它近乎免疫",
      "gstDescsnare": "不造伤害：让身边的一切减速一半，并照出隐身单位",
      "gstLegend": "P 穿刺 / S 熔散 / N 缚影 / 草地上的点是建塔位 / 浅色路面是敌行经之路",
      "gstPrompt": "{name}——{twist}。{b} 枚符文，{w} 波。漏满三只，壁垒即陷落。",
      "gstOnPath": "路面上不能建塔。",
      "gstFull": "这张图只容得下 {n} 座塔——先拆一座。",
      "gstBroke": "它要 {n} 枚符文，你手里还有 {g} 枚。",
      "gstPlaced": "已架起 {k}，花费 {c} 枚符文。",
      "gstSold": "已拆除 {k}，退回 {c} 枚符文。",
      "gstMoved": "塔已挪位，不额外收费。",
      "gstHolding": "手里捧着 {k}——在新格按回车即可挪过去。",
      "gstBlockedCell": "那一格已被占用或是路面。",
      "gstNothingHere": "这一格上没有塔。",
      "gstBusyWave": "怪正在走——建塔只能在两波之间。",
      "gstBuildFirst": "先布好阵，再开这一波。",
      "gstWaveCleared": "第 {n} 波守住。议会再拨 {w} 枚符文。",
      "gstWaveOut": "第 {n} 波上路了。",
      "gstSplash": "熔散烧过人群",
      "gstPierce": "穿刺射出",
      "gstLeak": "{g} 溜过去了——累计 {n} 次漏怪",
      "gstSilence": "场上很安静。",
      "gstCellAria": "第 {x} 列、第 {y} 行：{v}",
      "gstCellTower": "你的 {k} 塔，造价 {n} 枚符文",
      "gstCellMob": "{g} 生命 {h}，这一格有 {n} 只",
      "gstCellPath": "畅通的路面",
      "gstCellOpen": "空的建塔位",
      "gstBtnWave": "开这一波",
      "gstBtnStep": "推进 12 拍",
      "gstWon": "漏怪 {n} 次、花掉 {g} 枚符文守住 - 获得 {s} 星。",
      "gstLost": "漏怪 {n} 次——第 {d}/{w} 波时壁垒陷落。",
      "gstNext": "解锁下一张地图。",
      "gstDone": "每道门都还立着。",
      "gstBest": "最佳得分 {n}",
      "gstHint": "每守下一波补 3 枚符文，所以漏怪还救得回来，布错阵才真要命。",
      "logGlyphBastion": "漏 {n} 怪、花 {g} 符文守住壁垒",
    },
  });

  App.registerGame({
    name: "glyphBastion",
    tabKey: "tabGlyphBastion",
    init: initGlyphBastionGame,
    guide: {
      svg:
        '<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="6" width="108" height="64" rx="5" fill="rgba(30,41,59,.75)" stroke="rgba(148,163,184,.45)"/>' +
        '<path d="M6 50h40v-24h30v24h38" fill="none" stroke="rgba(148,163,184,.45)" stroke-width="9"/>' +
        '<text x="16" y="36" font-size="9" fill="#22d3ee" text-anchor="middle">P3</text>' +
        '<text x="56" y="36" font-size="9" fill="#ff6b35" text-anchor="middle">S4</text>' +
        '<text x="92" y="36" font-size="9" fill="#a3e635" text-anchor="middle">N2</text>' +
        '<text x="24" y="54" font-size="8" fill="#fb7185">\u25cf16</text>' +
        '<text x="60" y="30" font-size="8" fill="#fbbf24">\u25cd24</text>' +
        '<text x="96" y="54" font-size="8" fill="#e2e8f0">\u25a3</text></svg>',
      en: [
        "Aim: hold every wave on the map. Three leaks and the bastion falls.",
        "Build: between waves pick a tower with 1, 2, 3 (or click it), move the cursor with the arrows, and press Enter on a grass cell. Enter on one of your towers picks it up so the next Enter moves it; Backspace sells it for full price.",
        "Rock paper: Piercer is the single-target damage, Smoulder is the only thing that strips a boss shield, Snare does no damage but slows and reveals cloaked ranks - a wisp walks untouched past everything else.",
        "Traits printed on the unit: armour eats the first 3 of every hit, husks shrug splash, cutters split into two sprigs, blooms mend each tick, and the choir hides behind 18 shield.",
        "Clock: the wave is simulated tick by tick in a fixed order - spawn, mend, towers fire, deaths split, then the survivors walk - so the same layout always gives the same result.",
        "Scoring: leaks first, glyphs spent second, both lower is better. Every wave you hold sends 3 more glyphs, so a lean layout is never a dead end.",
      ],
      zh: [
        "目标：守住地图上的每一波。漏满三只，壁垒陷落。",
        "建造：两波之间用 1、2、3（或直接点击）选塔，方向键移动光标，在草地格按回车放下。在自己塔上按回车会把它捧起来，下一次回车就挪过去；退格按原价拆回。",
        "相克：穿刺负责单体高伤，熔散是唯一能剥掉首领护盾的塔，缚影不打伤害但减速并照出隐身——否则蒙纱单位会从所有塔旁边安然走过。",
        "单位特性都写在脸上：护甲吃掉每次打击的前 3 点，空壳无视溅射，裂殖死时分成两只嫩芽，花期每拍回血，合唱队藏着 18 点护盾。",
        "时钟：每一波按固定顺序逐拍结算——生成、回复、塔开火、死亡分裂、然后幸存者前进——所以同样的布阵永远给出同样的结果。",
        "计分：先看漏怪数，再看花掉的符文，都是越少越好。每守住一波议会补 3 枚符文，所以穷布局也不会走进死路。",
      ],
    },
  });

  /* Exported for the other modules and the headless tests. */
  App.initGlyphBastionGame = initGlyphBastionGame;
  App.bastionWave = bastionWave;
  App.bastionStep = bastionStep;
  App.bastionSim = gstSim;
  App.bastionSchedule = gstSchedule;
  App.bastionSolvable = bastionSolvable;
  App.bastionScore = bastionScore;
  App.bastionCost = bastionCost;
  App.bastionLevels = gstLevels;
  App.bastionKinds = gstKinds;
  App.bastionUnits = gstUnits;
})(window.CapitalConvert = window.CapitalConvert || {});
